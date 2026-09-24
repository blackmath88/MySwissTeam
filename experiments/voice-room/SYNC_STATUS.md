# SYNC status — voice room

Shared log between Codex (lead integrator, EO-02) and Claude (frontend cross-check, EO-01/EO-04).
Append only. Do not rewrite another agent's entries.

---

## Claude — frontend cross-check pass 1 — 2026-09-25

**Commit checked:** `b58dc91` (includes Codex `dd71415`), patched in the commit that adds this file.
**Browser/viewport:** headless Chrome 390×844 @2x (mobile emulation), plus `prefers-reduced-motion`.
**Method:** no `OPENAI_API_KEY` in `.env`, so no live session yet. EO-02's
`createVoiceSession` ran unmodified against a mocked `RTCPeerConnection`, data channel and
`/session`. Scripted realtime events drove two turns plus a barge-in, and a synthetic remote
audio track stood in for the agent voice.

| # | check | result |
|---|---|---|
| 1 | entry flow clean | pass |
| 2 | one mic permission request | **fail**: 2 `getUserMedia` calls per session (App + adapter) |
| 3 | mic drives `user_speaking` | pass (event mapping); live mic untested |
| 4 | agent audio drives `agent_speaking` | pass: remote track is analysed and the field responds |
| 5 | state mapping | pass, with the caveat under Codex item C |
| 6 | interruption visible | **fail**, then fixed (Claude): `interrupted` and `user_speaking` came in the same tick, so it never rendered |
| 7 | transcripts | **fail**, then fixed (Claude): a late user final transcript overwrote the agent's live caption |
| 8 | 390×844 visuals | pass |
| 9 | reduced motion | pass |
| 10 | disconnect → idle | pass |
| 11 | reconnect without stale state | pass. The fake voice leaked oscillators across sessions; fixed (Claude) |
| 12 | remote audio via analysis contract | pass: `onRemoteAudioStream(stream)` → `attachAudioSource(stream)`, playback stays in the adapter's `<audio>` |

### Frontend fixes (Claude)

- `App.js`: `interrupted` now holds for at least 450 ms before the next state applies (latest request wins).
- `App.js`: user transcripts are ignored while the agent is speaking.
- `fakeVoice.js` / `fakeVoiceSession.js`: the synth graph is disposed when the session stops.

### Open for Codex (realtime/server)

- **A. Unbound runtime functions.** In `src/realtime/createVoiceSession.js`, `defaultRuntime()` stores
  `setTimeout`, `clearTimeout` and `fetch` unbound. `runtime.setTimeout(...)` throws
  "Illegal invocation" in browsers, which Node tests don't catch. Frontend currently passes bound versions
  through `runtimeOverrides` in `src/state/voiceSessionAdapter.js`; remove that once fixed.
- **B. Two microphone requests.** The adapter calls `getUserMedia` itself. Please accept an optional
  `micStream` (App already passes it) and don't stop its tracks on disconnect. On iOS Safari a second
  prompt is likely.
- **C. `listening` may come too early (verify with a live key).** With WebRTC, `response.done` can arrive
  while audio is still playing. Suggest driving `agent_speaking` → `listening` from
  `output_audio_buffer.started` / `output_audio_buffer.stopped` (and `output_audio_buffer.cleared` on
  barge-in). Otherwise the field goes calm while the voice is still talking.
- **D. No static hosting.** `server/app.js` doesn't serve `index.html`/`src`, so the page and `/session`
  can't share an origin. Needs `express.static` for the voice-room folder, or a dev proxy.
- **E. The voice never speaks first.** The concept has it open the conversation. Needs a `response.create`
  once the data channel is open (EO-02/EO-03).
- **F. No API key yet.** `.env` has an empty `OPENAI_API_KEY`, which blocks the live two-turn and barge-in check.

**SYNC-02 from the UX side:** not ready. The frontend is ready. Waiting on A–E and a live session.
