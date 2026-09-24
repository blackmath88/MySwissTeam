// Fake voice session — stands in for EO-02's realtime adapter until SYNC-02.
//
// Same public shape as the planned adapter:
//
//   const session = createFakeVoiceSession({
//     audioContext, micStream,
//     onStateChange, onTranscript, onRemoteAudioStream, onError,
//   });
//   await session.start();  session.stop();
//
// Plus a `dev` handle so the dev controls can force states.
//
// Autopilot runs a scripted conversation: a crude local VAD on the mic
// detects the user's turn, then the fake voice answers with canned lines.

import { createAudioAnalyser } from '../audio/audioAnalyser.js';
import { createFakeVoice } from '../audio/fakeVoice.js';

const OPENER =
  "Today, opposing women's suffrage may sound almost unimaginable. Before I explain anything: why do you think someone might have voted no?";

const LINES = [
  'So for you, the position looks mainly like exclusion. Can I offer another historical frame?',
  'Try to imagine a society in which the household, rather than the individual adult, is treated as the primary political unit.',
  'The strongest version of that argument might be about continuity: change the unit of representation, and you change what was built on it.',
  'But then how would that model answer an adult woman asking why another person should politically represent her?',
  'So the logic is more understandable, but something still does not fit. Do you reject the position for the same reason as five minutes ago?',
];

const VAD = {
  startLevel: 0.38, // normalised mic rms to open a user turn
  startMs: 120,
  endLevel: 0.2,
  endMs: 900, // silence that closes a user turn
  bargeLevel: 0.55,
  bargeMs: 300,
};

export function createFakeVoiceSession({
  audioContext,
  micStream,
  onStateChange = () => {},
  onTranscript = () => {},
  onRemoteAudioStream = () => {},
  onError = () => {},
}) {
  const voice = createFakeVoice(audioContext);
  const mic = createAudioAnalyser(audioContext, { bands: 8 });
  let state = 'idle';
  let lineIndex = 0;
  let autopilot = true;
  let bargeIn = false; // off by default: without headphones the mic hears the fake voice
  let timer = null;
  let tick = null;
  let above = 0;
  let below = 0;

  function set(next) {
    if (next === state) return;
    state = next;
    above = below = 0;
    onStateChange(next);
  }

  function later(ms, fn) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  }

  async function say(text) {
    clearTimeout(timer);
    set('agent_speaking');
    onTranscript({ role: 'agent', text: '', final: false });
    const { interrupted } = await voice.speak(text, {
      onProgress: (soFar) => onTranscript({ role: 'agent', text: soFar, final: false }),
    });
    if (interrupted) return;
    onTranscript({ role: 'agent', text, final: true });
    set('listening');
  }

  function respond() {
    if (lineIndex >= LINES.length) {
      set('reflection');
      onTranscript({ role: 'agent', text: 'Did anything become harder to answer?', final: true });
      return;
    }
    say(LINES[lineIndex++]);
  }

  function interrupt() {
    voice.stop();
    set('interrupted');
    // The agent yields immediately; the room returns to listening.
    later(750, () => state === 'interrupted' && set('listening'));
  }

  function think() {
    set('thinking');
    later(1100 + Math.random() * 900, respond);
  }

  function step() {
    if (!autopilot) return;
    const level = mic.getAudioFrame().rms;
    const dt = 50;
    if (state === 'listening') {
      above = level > VAD.startLevel ? above + dt : 0;
      if (above >= VAD.startMs) set('user_speaking');
    } else if (state === 'user_speaking') {
      below = level < VAD.endLevel ? below + dt : 0;
      if (below >= VAD.endMs) think();
    } else if (state === 'agent_speaking' && bargeIn) {
      above = level > VAD.bargeLevel ? above + dt : 0;
      if (above >= VAD.bargeMs) interrupt();
    }
  }

  return {
    async start() {
      try {
        set('connecting');
        if (micStream) mic.attachAudioSource(micStream);
        onRemoteAudioStream(voice.stream);
        tick = setInterval(step, 50);
        later(900, () => say(OPENER));
      } catch (err) {
        set('error');
        onError(err);
      }
    },
    stop() {
      clearTimeout(timer);
      clearInterval(tick);
      voice.dispose();
      mic.detachAudioSource();
      set('idle');
    },
    dev: {
      // Force a state the way the realtime adapter eventually will.
      force(next) {
        clearTimeout(timer);
        if (next === 'agent_speaking') return say(LINES[lineIndex++ % LINES.length]);
        if (next === 'interrupted') return interrupt();
        if (next === 'thinking') {
          voice.stop();
          return autopilot ? think() : set('thinking');
        }
        voice.stop();
        set(next);
      },
      get autopilot() {
        return autopilot;
      },
      set autopilot(on) {
        autopilot = on;
        if (!on) clearTimeout(timer);
      },
      get bargeIn() {
        return bargeIn;
      },
      set bargeIn(on) {
        bargeIn = on;
      },
    },
  };
}
