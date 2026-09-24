# Experience contract — SYNC-01 proposal

Owner: EO-01 / EO-04. Proposed as frozen at SYNC-01; changes after that go through a sync.

## Run

No build step, no dependencies. Serve the folder statically:

```bash
cd experiments/voice-room
python3 -m http.server 5173
# open http://localhost:5173/?dev
```

On a phone the microphone needs a secure origin. Use an HTTPS tunnel, for example
`cloudflared tunnel --url http://localhost:5173` or `ngrok http 5173`.

URL flags:

| flag | effect |
|---|---|
| `?dev` | show the dev panel on load (also: key `D`, or triple-tap anywhere) |
| `?motion=reduced` | force the reduced-motion renderer |
| `?voice=realtime` | load `src/realtime/index.js` instead of the fake session (falls back to fake if missing) |

Dev keys: `0` idle · `L` listening · `U` user speaking · `T` thinking · `S` agent speaking ·
`I` interrupted · `R` reflection · `E` error · `A` autopilot · `B` barge-in.

## 1. Conversation states

```ts
type ConversationState =
  | 'idle' | 'connecting' | 'listening' | 'user_speaking'
  | 'thinking' | 'agent_speaking' | 'interrupted' | 'reflection' | 'error';
```

Defined in `src/state/conversationState.js`. Unknown names are ignored with a warning.

| state | visual character | audio driving the field |
|---|---|---|
| idle | dim grey-blue ember, slow breath | none |
| connecting | small cool pulse gathering inward | mic (faint) |
| listening | open teal ring, gentle, receptive | mic |
| user_speaking | brighter green-teal, sharp spectral spikes, trails bloom | mic (boosted) |
| thinking | small violet vortex, contracts, spirals inward, no audio response | — |
| agent_speaking | broad warm amber→magenta, 6 rings, outward bloom | agent (+ faint mic) |
| interrupted | colour drains to white, shatters and collapses (~0.75 s) | mic + agent |
| reflection | wide, warm-white, still | both, subtle |
| error | single dim red ring | — |

All tuning lives in `src/visuals/theme.js` (the EO-06 polish surface). The renderer
interpolates every parameter, so any state sequence the adapter emits looks continuous.

## 2. Audio analysis

`src/audio/audioAnalyser.js`, provider-agnostic.

```ts
const analyser = createAudioAnalyser(audioContext, { fftSize?: 2048, bands?: 48 });
analyser.attachAudioSource(source: MediaStream | HTMLMediaElement | AudioNode): void;
analyser.getAudioFrame(): AudioFrame;   // call once per animation frame
analyser.detachAudioSource(): void;

type AudioFrame = {
  rms: number;        // 0..1, loudness, adaptive range (whisper ≠ shout, silence ≈ 0)
  bass: number;       // 0..1, 40–250 Hz
  mids: number;       // 0..1, 250–2000 Hz
  highs: number;      // 0..1, 2–8 kHz
  spectrum: number[]; // 0..1 × bands, log-spaced 50 Hz–12 kHz
};
```

- The frame object is reused between calls, so copy it if you need to keep it.
- A `MediaStream` is tapped only and never routed to the speakers.
- An `HTMLMediaElement` stays audible once Web Audio takes it over.
- With no source attached, the frame glides back to zero.
- Chrome only yields samples from a remote WebRTC stream while that stream is also
  playing in a media element. The realtime adapter keeps its own `<audio>` element
  for playback and passes us the stream.

`mixFrames(out, [[frame, weight], ...])` blends the mic and agent frames by per-value max.
Weights come from the state profile (`micGain` and `agentGain`).

## 3. Voice session seam (for EO-02)

`App.js` only talks to a session factory with this shape. The fake one is
`src/state/fakeVoiceSession.js`.

```ts
createVoiceSession({
  audioContext: AudioContext,   // already resumed inside the user's tap
  micStream: MediaStream,       // already granted; reuse it instead of a second getUserMedia
  onStateChange(state: ConversationState): void,
  onTranscript(t: { role: 'user' | 'agent'; text: string; final: boolean }): void,
  onRemoteAudioStream(source: MediaStream | HTMLMediaElement): void,
  onError(err: Error): void,
}): { start(): Promise<void>; stop(): void; dev?: object }
```

- `text` is the cumulative text of the current utterance, not a delta.
- `stop()` must release everything the adapter owns and end with `onStateChange('idle')`.
- After an interruption, emit `interrupted`, then `listening`. The field handles the flash.

EO-02's `src/realtime/index.js` is already wired in with `?voice=realtime`.
`src/state/voiceSessionAdapter.js` translates the realtime shape into this one:

- `connect()`/`disconnect()` become `start()`/`stop()`
- `'assistant'` becomes `'agent'`
- delta transcripts become cumulative text

It also passes bound `setTimeout`/`clearTimeout`/`fetch` through `runtimeOverrides`,
because the adapter's default runtime calls them unbound, which browsers reject
with "Illegal invocation". No visual code depends on the provider.
