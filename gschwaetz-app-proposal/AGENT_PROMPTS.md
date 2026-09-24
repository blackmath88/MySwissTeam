# Agent Prompts — Gschwätz Voice MVP

Use these prompts with separate coding agents working in parallel.

---

## Codex — EO-02 Realtime Transport

You are working in:

- repo: `blackmath88/MySwissTeam`
- branch: `main`

Read first:

- `gschwaetz-app-proposal/CONCEPT.md`
- `gschwaetz-app-proposal/PARALLEL_BUILD_PLAN.md`
- `experiments/voice-room/README.md`

Your execution object is **EO-02 — REALTIME TRANSPORT**.

### Goal

Build the smallest reliable hands-free realtime voice transport for the Gschwätz single-voice MVP.

Do not build the visual experience.
Do not redesign the UI.
Do not touch SRF/MCP integration.
Do not change the conversation concept.

### Reuse before invention

Use `openai/openai-realtime-console` as the primary reference implementation for:

- browser WebRTC session setup
- microphone streaming
- realtime audio response
- session/authentication flow
- realtime event handling

Do not recreate working transport patterns from memory if the reference already solves them.

### File ownership

You own:

```
experiments/voice-room/server/*
experiments/voice-room/src/realtime/*
experiments/voice-room/.env.example
experiments/voice-room/package*.json
```

Do not edit:

```
experiments/voice-room/src/visuals/*
experiments/voice-room/src/styles/*
experiments/voice-room/src/dialogue/*
gschwaetz-app-proposal/CONCEPT.md
```

### Environment

The developer will create:

```
experiments/voice-room/.env
```

with:

```
OPENAI_API_KEY=...
```

Never commit the real key.
Never expose it in browser JavaScript.
Never use a public frontend environment variable for it.

### Required adapter

Expose a small frontend-facing adapter similar to:

```ts
createVoiceSession({
  onStateChange,
  onTranscript,
  onRemoteAudioStream,
  onError
})
```

The implementation details may differ, but keep the public interface very small.

Expected states:

```
connecting
listening
user_speaking
thinking
agent_speaking
interrupted
error
```

### Acceptance criteria

1. One user gesture starts the session.
2. Microphone remains active without push-to-talk.
3. User can speak naturally.
4. End-of-turn is detected automatically.
5. Agent audio streams back.
6. A second conversational turn works.
7. Remote audio is exposed so the visualizer can analyse it.
8. Interruption/barge-in works if supported by the Realtime session.
9. API key never reaches the frontend bundle.
10. Disconnect/reconnect is recoverable.

### Working style

- Keep changes tightly scoped to your owned files.
- Prefer minimal dependencies.
- Add concise setup instructions if needed.
- Test locally.
- Commit your work.
- Do not merge unrelated changes.
- At the end, report:
  - files changed
  - architecture used
  - how to run
  - what works
  - what is still missing
  - exact integration seam for EO-01/EO-04

Stop at **SYNC-02 — FIRST REAL VOICE** in the build plan.

---

## Claude — EO-01 + EO-04 Experience Shell

You are working in:

- repo: `blackmath88/MySwissTeam`
- branch: `main`

Read first:

- `gschwaetz-app-proposal/CONCEPT.md`
- `gschwaetz-app-proposal/PARALLEL_BUILD_PLAN.md`
- `experiments/voice-room/README.md`

Your execution objects are:

- **EO-01 — EXPERIENCE SHELL**
- **EO-04 — AUDIO VISUAL COUPLING scaffold only**

### Goal

Build the experiential heart of Gschwätz before realtime AI is connected.

The app should feel like a smartphone placed in a dark room with a living voice inside it.

No chatbot UI.
No cards.
No avatar.
No party branding.
No dashboard.

### Visual direction

Think:

- old Winamp visual energy
- modern restraint
- near-black background
- liquid/spectral movement
- sound-reactive
- minimal typography
- immersive on a smartphone
- visual states should feel materially different, not just change a label

### First build

Implement:

1. Entry screen
2. One-tap microphone permission
3. Real microphone amplitude analysis via Web Audio API
4. Central generative visual field
5. Conversation states:
   - idle
   - listening
   - user_speaking
   - thinking
   - agent_speaking
   - interrupted
6. Fake/dev controls to drive states before realtime integration
7. Optional subtitles as a quiet accessibility layer
8. Responsive mobile-first layout
9. Reduced-motion fallback

### File ownership

You own:

```
experiments/voice-room/index.html
experiments/voice-room/src/App.*
experiments/voice-room/src/visuals/*
experiments/voice-room/src/styles/*
experiments/voice-room/src/state/*
experiments/voice-room/src/audio/*
```

Do not edit:

```
experiments/voice-room/server/*
experiments/voice-room/src/realtime/*
experiments/voice-room/src/dialogue/*
gschwaetz-app-proposal/CONCEPT.md
```

### Audio analysis contract

Create an abstraction that can later analyse either the local mic or remote agent audio:

```ts
attachAudioSource(source)
getAudioFrame()
detachAudioSource()
```

Normalize visual data roughly as:

```ts
{
  rms: 0..1,
  bass: 0..1,
  mids: 0..1,
  highs: 0..1,
  spectrum: number[]
}
```

Do not couple the visualizer directly to OpenAI or any model provider.

### Acceptance criteria

1. Opens well on a smartphone viewport.
2. User taps once and grants microphone access.
3. Microphone amplitude visibly changes the animation.
4. Silence still has subtle living motion.
5. Listening, thinking, speaking and interrupted states look meaningfully different.
6. Fake agent audio can drive the same visualizer.
7. No push-to-talk UI.
8. No chat bubbles.
9. Experience can later consume the realtime adapter without visual rewrites.
10. No files owned by Codex are modified.

### Working style

- Keep component boundaries small.
- Avoid dependency-heavy visual frameworks.
- Prefer Canvas + Web Audio API.
- Commit your work.
- At the end, report:
  - files changed
  - how to run
  - visual state contract
  - audio analysis contract
  - what is ready for SYNC-01
  - what Codex needs to provide at SYNC-02

Stop at **SYNC-01 — EXPERIENCE CONTRACT** unless the realtime adapter is already available.
