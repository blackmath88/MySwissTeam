# Gschwätz — Parallel Build Execution Plan

## Goal for tonight

Build the smallest convincing version of the **Gschwätz voice experience**:

> **One issue. One voice. Five good minutes.**

The demo should feel like a phone placed in a dark room with a living voice inside it.

No video avatar.
No multi-agent system.
No political information architecture yet.
No dashboard.

The product proof is:

1. user enters once,
2. microphone stays open,
3. user speaks naturally,
4. the system detects the end of the turn,
5. the voice responds,
6. the screen reacts organically to both voices,
7. the conversation follows the dialogical-inquiry method,
8. interruption / yielding feels natural,
9. the session ends with reflection rather than persuasion.

---

# Reuse decisions

We deliberately do **not** build a voice stack from scratch.

## Primary transport reference — OpenAI Realtime Console

Reference:

- `openai/openai-realtime-console`

What we reuse conceptually / selectively:

- browser WebRTC session setup
- ephemeral/session authentication pattern
- microphone track handling
- realtime event handling
- streamed audio output
- transcript events
- server-side API key boundary

Why:

It is already a small React/WebRTC example for OpenAI Realtime and is the fastest path to a working browser voice loop.

Do not copy the console UI.

Our product UI stays completely separate.

## Optional VAD fallback — ricky0123/vad

Reference:

- `ricky0123/vad`

Use only if built-in Realtime turn detection is not good enough.

Useful API:

- `onSpeechStart`
- `onSpeechEnd(audio)`

It runs Silero VAD in the browser.

Do **not** integrate this in the first pass unless necessary.

## Alternative infrastructure — LiveKit

Reference:

- `livekit-examples/agent-starter-react`
- `livekit-examples/agent-starter-node`
- `livekit-examples/agent-starter-python`

LiveKit is Plan B if direct Realtime/WebRTC session management becomes a time sink.

Do not run OpenAI Realtime and LiveKit in parallel tonight.

## Audio visualizer

Do not introduce a heavy UI framework for the first visual.

Use the Web Audio API:

- `AudioContext`
- `AnalyserNode`
- FFT / frequency data
- Canvas

This gives us the old-Winamp energy with very little dependency surface.

We can inspect existing voice-visualizer projects for patterns later, but the first renderer should remain tiny and fully ours.

---

# Architecture boundary

```
                  LONG-LIVED API KEY
                         │
                         │ server only
                         ▼
                  /session endpoint
                         │
                         │ ephemeral session
                         ▼
PHONE MIC ───────► OpenAI Realtime/WebRTC
                         │
              ┌──────────┴───────────┐
              │                      │
          audio events          transcript/events
              │                      │
              ▼                      ▼
        Web Audio analyser     Conversation state
              │                      │
              └──────────┬───────────┘
                         ▼
                  Gschwätz screen
```

Later:

```
SRF / MCP evidence
        │
        ▼
conversation context
        │
        ▼
Realtime session
```

Dominik's MCP work must not be coupled to the audio renderer.

---

# Shared interface contracts

## Conversation state

Frontend must understand only these states:

```ts
type ConversationState =
  | "idle"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "thinking"
  | "agent_speaking"
  | "interrupted"
  | "reflection"
  | "error";
```

## Conversation move

The dialog layer may annotate a response with:

```ts
type DialogueMove =
  | "ELICIT"
  | "REFLECT"
  | "CLARIFY"
  | "ASSUMPTION_TEST"
  | "HORIZON_SHIFT"
  | "STEELMAN"
  | "VALUE_TRANSLATE"
  | "TENSION"
  | "APORIA"
  | "RETURN";
```

The visualizer does not care about the move.

## Evidence seam — later

```ts
type Evidence = {
  id: string;
  title: string;
  url?: string;
  claim?: string;
  sourceType?: string;
};
```

For the first voice demo:

```ts
sources: []
```

is completely valid.

---

# Parallel execution model

Each execution object owns a different set of files.

**Rule:** do not edit files owned by another active execution object between sync points.

This allows Achim, Claude and Codex to work simultaneously without merge chaos.

---

# EO-01 — EXPERIENCE SHELL

**Owner:** Achim / Claude

**Purpose:** Make the phone feel like a dark conversational object before AI is connected.

**Status:** START NOW

## Owns

```
experiments/voice-room/
  index.html OR src/App.*
  src/visuals/*
  src/styles/*
  src/state/conversationState.*
```

## Build

- mobile-first dark screen
- almost no app chrome
- one central generative audio field
- states:
  - idle
  - listening
  - user speaking
  - thinking
  - agent speaking
  - interrupted
- optional subtitles at bottom
- tap once to enter
- no push-to-talk
- visual state can be driven by fake timers initially
- responsive to real microphone amplitude as soon as mic access exists

## Visual direction

Old Winamp energy without retro UI:

- spectral
- fluid
- black / near-black
- restrained typography
- audio-reactive
- fullscreen-feeling on smartphone
- no cards
- no chat bubbles
- no avatar

## Acceptance

- opens on phone
- tap once
- microphone permission works
- microphone amplitude visibly affects animation
- fake agent audio can also drive animation
- switching conversation state changes the visual character
- reduced-motion fallback does not break the experience

## Must NOT touch

- realtime server code
- API authentication
- system prompt
- SRF/MCP code

---

# EO-02 — REALTIME TRANSPORT

**Owner:** Codex

**Purpose:** Get a real low-latency voice loop working independently of the final UI.

**Start:** after EO-01 has created the folder structure OR in a separate `realtime/` subtree.

## Owns

```
experiments/voice-room/server/*
experiments/voice-room/src/realtime/*
experiments/voice-room/.env.example
```

## Reference

Use `openai/openai-realtime-console` as the implementation reference.

Do not recreate WebRTC/session code from memory if the example already solves it.

## Build

- small server endpoint for session/token creation
- long-lived API key stays server-side
- browser requests ephemeral/session credentials
- establish WebRTC connection
- stream microphone audio
- receive agent audio
- expose events:
  - connected
  - listening
  - user speech started
  - user speech ended
  - response started
  - response audio
  - response ended
  - transcript if available
  - error
- support interruption / barge-in if available through the Realtime session

## Public adapter

Expose a tiny module, for example:

```ts
createVoiceSession({
  onStateChange,
  onTranscript,
  onRemoteAudioStream,
  onError
})
```

EO-01 should integrate only against this adapter.

## Acceptance

- one click connects
- user can speak without push-to-talk
- response returns as audio
- second turn works
- no API key visible in frontend bundle
- clean disconnect
- errors return to a recoverable UI state

## Must NOT touch

- visualizer implementation
- visual styling
- dialogue prompt content
- SRF/MCP code

---

# EO-03 — DIALOGICAL INQUIRY PROMPT

**Owner:** Achim / Claude

**Purpose:** Make five minutes of conversation feel investigative rather than persuasive.

## Owns

```
gschwaetz-app-proposal/PROMPTS.md
experiments/voice-room/src/dialogue/*
experiments/voice-room/topics/*
```

## First topic

```
Swiss women's suffrage, 1971
```

Use English for the first demo.

## Core doctrine

> The agent's task is not to make the opposing position persuasive.
> Its task is to make it intelligible.

## Conversation arc

1. ELICIT — what does the user currently assume?
2. REFLECT — accurately mirror that interpretation.
3. ASSUMPTION_TEST — find the hidden premise.
4. HORIZON_SHIFT — reconstruct the historical worldview.
5. STEELMAN — articulate the strongest coherent form.
6. TENSION — expose what that worldview fails to account for.
7. RETURN — ask what now feels different.

## Constraints

- ask more than lecture
- short spoken turns
- no recommendation
- no "both sides are equally valid"
- no historical invention
- distinguish explanation from endorsement
- preserve autonomy
- explicitly model uncertainty

## Acceptance

Run three manual conversations.

Pass if:

- voice asks genuine follow-ups
- it does not monologue
- it does not push the user toward agreement
- it corrects caricature without scolding
- it introduces tension after successful perspective reconstruction
- conversation naturally reaches reflection

## Must NOT touch

- WebRTC transport
- visualizer
- SRF/MCP implementation

---

# EO-04 — AUDIO VISUAL COUPLING

**Owner:** Claude or Achim

**Depends on:** EO-01 visualizer contract + EO-02 remote audio stream

## Owns

```
experiments/voice-room/src/audio/*
```

## Build

One analyser abstraction:

```ts
attachAudioSource(streamOrElement)
getAudioFrame()
detachAudioSource()
```

Visualizer receives normalized values:

```ts
{
  rms: 0..1,
  bass: 0..1,
  mids: 0..1,
  highs: 0..1,
  spectrum: number[]
}
```

It must work for:

- local microphone while user is speaking
- remote agent audio while agent is speaking

## Acceptance

The exact same visual field visibly behaves differently when:

- user whispers
- user speaks loudly
- agent speaks
- silence occurs

## Must NOT touch

- prompt
- SRF/MCP
- realtime authentication

---

# EO-05 — SRF / MCP EVIDENCE SEAM

**Owner:** Dominik

**Parallel from the start**

## Goal

Return evidence/context independently of the voice UX.

## Contract for later integration

```json
{
  "topic": "...",
  "context": "...",
  "evidence": [
    {
      "id": "...",
      "title": "...",
      "url": "...",
      "claim": "..."
    }
  ]
}
```

For tonight the voice demo does not block on this.

At **SYNC-03** we decide whether any of it is stable enough to feed into the prompt.

---

# EO-06 — VISUAL POLISH

**Owner:** Vivian

## Starts when

EO-01 has a working state machine and DOM/component boundaries.

## Owns

Preferably:

```
experiments/voice-room/src/styles/*
experiments/voice-room/src/visuals/theme.*
```

Coordinate before changing component structure.

## Goal

Translate the experience into the final visual language without changing realtime logic.

---

# Sync points

## SYNC-01 — EXPERIENCE CONTRACT

**When:** after EO-01 can show all states with fake data.

Check together:

- state names frozen?
- file ownership clear?
- audio visualizer API frozen?
- smartphone composition approved?

After this point, EO-02 and EO-04 integrate against the frozen interfaces.

---

## SYNC-02 — FIRST REAL VOICE

**When:** EO-02 completes one live voice round trip.

Check:

- latency acceptable?
- automatic turn-taking feels natural?
- interruption works?
- audio stream accessible to visualizer?
- built-in VAD good enough?

Decision:

Only add `ricky0123/vad` if the native Realtime turn behavior is clearly insufficient.

---

## SYNC-03 — FIVE-MINUTE SESSION

**When:** EO-03 prompt + EO-02 voice + EO-01 experience are integrated.

Do one complete session.

Observe:

- does it ask too many questions?
- does it lecture?
- does the silence feel awkward?
- does visual movement help?
- does it feel like a conversation rather than voice UI?
- do we need Dominik's evidence now, or can it wait for reveal?

---

## SYNC-04 — DEMO FREEZE

After this:

No architectural additions.

Only:

- latency fixes
- prompt tuning
- visual polish
- demo reliability
- fallback path

---

# API key decision

## Do we need the OpenAI API key right now?

**No for EO-01, EO-03, EO-04 scaffolding.**

Those can all proceed with:

- microphone audio
- fake conversation states
- prerecorded / browser-generated agent audio
- mock responses

## When is the key needed?

At the start of **EO-02 REALTIME TRANSPORT**.

The key should be configured as:

```
OPENAI_API_KEY=...
```

in a local server environment file.

Never commit it.
Never put it in browser JavaScript.
Never expose it through Vite public environment variables.

Commit only:

```
.env.example
```

with an empty placeholder.

---

# First bite — do this now

The first implementation target is intentionally small:

## Bite 1A — Living microphone

Build a black mobile screen where:

- tap once requests microphone permission
- screen becomes "listening"
- Web Audio analyser reads mic amplitude
- generative waveform / spectrum responds immediately
- silence has a quiet idle movement
- no AI involved

If this does not feel good, do not move on.

## Bite 1B — Fake conversation state

Add keyboard/dev controls temporarily:

- L = listening
- T = thinking
- S = agent speaking
- I = interrupted

Use a bundled audio file or browser speech synthesis to simulate the remote voice.

Validate the visual grammar.

## Bite 1C — Realtime adapter

Codex independently wires OpenAI Realtime behind the frozen adapter.

Then at SYNC-02:

Replace fake audio with real remote audio.

---

# Tonight's priority order

1. **Experience shell**
2. **Real voice round trip**
3. **Investigative conversation quality**
4. **Audio-reactive polish**
5. **SRF evidence integration**
6. Everything else

Do not reverse this order.

A beautiful evidence architecture with a mediocre voice experience loses the demo.

A compelling five-minute conversation with one grounded topic already proves the product.
