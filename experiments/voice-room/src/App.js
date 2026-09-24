// Gschwätz — voice room experience shell (EO-01).
//
// Wiring only: conversation state → visual field, audio analysers → frames,
// voice session (fake now, realtime at SYNC-02) → state + transcripts + audio.

import { createConversationState } from './state/conversationState.js';
import { createFakeVoiceSession } from './state/fakeVoiceSession.js';
import { createDevControls } from './state/devControls.js';
import { createAudioAnalyser, createSilentFrame, mixFrames } from './audio/audioAnalyser.js';
import { createVisualField } from './visuals/field.js';
import { createSubtitles } from './visuals/subtitles.js';
import { PROFILES, STATE_LABELS } from './visuals/theme.js';

const params = new URLSearchParams(location.search);
const $ = (sel) => document.querySelector(sel);

const els = {
  canvas: $('#field'),
  enter: $('#enter'),
  entryError: $('#entry-error'),
  leave: $('#leave'),
  captions: $('#captions'),
  subtitles: $('#subtitles'),
  status: $('#status'),
};

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => params.get('motion') === 'reduced' || motionQuery.matches;

const conversation = createConversationState('idle');

// Audio: two analysers (mic + agent), blended per state into one frame.
let audioContext = null;
let micStream = null;
let micAnalyser = null;
let agentAnalyser = null;
let session = null;
let wakeLock = null;

const mixed = createSilentFrame();
const silent = createSilentFrame();
const weights = { mic: 0, agent: 0 };
let lastMix = performance.now();

function getFrame() {
  const now = performance.now();
  const k = 1 - Math.exp(-((now - lastMix) / 1000) * 6);
  lastMix = now;
  const profile = PROFILES[conversation.get()];
  weights.mic += (profile.micGain - weights.mic) * k;
  weights.agent += (profile.agentGain - weights.agent) * k;
  return mixFrames(mixed, [
    [micAnalyser?.getAudioFrame() ?? silent, weights.mic],
    [agentAnalyser?.getAudioFrame() ?? silent, weights.agent],
  ]);
}

const field = createVisualField(els.canvas, { getFrame, reducedMotion: reducedMotion() });
motionQuery.addEventListener?.('change', () => field.setReducedMotion(reducedMotion()));

const subtitles = createSubtitles(els.subtitles, { enabled: loadPref('captions', true) });
syncCaptionsButton();

const dev = createDevControls({
  root: document.body,
  getSession: () => session,
  visible: params.has('dev'),
  onForce: (name) => (session?.dev ? session.dev.force(name) : conversation.set(name)),
});

conversation.subscribe((next, prev) => {
  field.setState(next);
  if (prev === 'agent_speaking' || prev === 'user_speaking') subtitles.settle();
  document.body.dataset.state = next;
  els.status.textContent = STATE_LABELS[next] ?? '';
  dev.refresh(next);
});
document.body.dataset.state = conversation.get();
dev.refresh(conversation.get());
field.start();

// SYNC-02 seam: the realtime adapter plugs in here with the same callbacks.
// Opt in with ?voice=realtime once EO-02 ships src/realtime/index.js.
async function loadSessionFactory() {
  if (params.get('voice') === 'realtime') {
    try {
      const mod = await import('./realtime/index.js');
      if (typeof mod.createVoiceSession === 'function') return mod.createVoiceSession;
    } catch (err) {
      console.warn('[voice-room] realtime adapter unavailable, using fake session', err);
    }
  }
  return createFakeVoiceSession;
}

async function enter() {
  els.entryError.textContent = '';
  els.enter.disabled = true;
  try {
    // Create/resume audio inside the tap — iOS will not allow it later.
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const resumed = audioContext.resume();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('insecure'), { name: 'InsecureContext' });
    }
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    await resumed;

    micAnalyser = createAudioAnalyser(audioContext);
    micAnalyser.attachAudioSource(micStream);
    agentAnalyser = createAudioAnalyser(audioContext);

    document.body.classList.add('in-room');
    conversation.set('connecting');

    const createSession = await loadSessionFactory();
    session = createSession({
      audioContext,
      micStream,
      onStateChange: (s) => conversation.set(s),
      onTranscript: (t) => subtitles.show(t),
      onRemoteAudioStream: (source) => agentAnalyser.attachAudioSource(source),
      onError: (err) => {
        console.error('[voice-room]', err);
        conversation.set('error');
      },
    });
    dev.refresh(conversation.get());
    await session.start();
    requestWakeLock();
  } catch (err) {
    console.error('[voice-room] could not enter', err);
    leave();
    els.entryError.textContent = explain(err);
  } finally {
    els.enter.disabled = false;
  }
}

function leave() {
  session?.stop();
  session = null;
  micAnalyser?.detachAudioSource();
  agentAnalyser?.detachAudioSource();
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  micAnalyser = agentAnalyser = null;
  wakeLock?.release().catch(() => {});
  wakeLock = null;
  subtitles.clear();
  document.body.classList.remove('in-room');
  conversation.set('idle');
  dev.refresh(conversation.get());
}

function explain(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'The room needs your microphone. Allow access and try again.';
    case 'NotFoundError':
      return 'No microphone found.';
    case 'InsecureContext':
      return 'The microphone needs a secure connection (https or localhost).';
    default:
      return 'Something went wrong. Try again.';
  }
}

async function requestWakeLock() {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    wakeLock?.addEventListener('release', () => (wakeLock = null));
  } catch {
    /* optional */
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && session && !wakeLock) requestWakeLock();
});

function syncCaptionsButton() {
  els.captions.setAttribute('aria-pressed', String(subtitles.enabled));
  els.captions.classList.toggle('off', !subtitles.enabled);
}

function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(`gschwaetz.${key}`);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(`gschwaetz.${key}`, value ? '1' : '0');
  } catch {
    /* private mode etc. */
  }
}

els.enter.addEventListener('click', enter);
els.leave.addEventListener('click', leave);
els.captions.addEventListener('click', () => {
  subtitles.enabled = !subtitles.enabled;
  savePref('captions', subtitles.enabled);
  syncCaptionsButton();
});
