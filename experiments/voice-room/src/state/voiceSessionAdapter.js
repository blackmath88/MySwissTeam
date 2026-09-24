// Adapts EO-02's realtime session (src/realtime) to the experience seam.
//
// Realtime shape:   connect() / disconnect(), transcript role 'assistant',
//                   non-final transcripts are deltas.
// Experience shape: start() / stop(), role 'agent', text is cumulative,
//                   stop() ends in 'idle'.
//
// Keeps the visual layer ignorant of the provider: only this file knows both.

// Browsers throw "Illegal invocation" when these are called detached from
// `window` (Node does not). Passed through EO-02's public runtimeOverrides
// until the default runtime binds them itself.
const BOUND_RUNTIME = {
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (...args) => globalThis.clearTimeout(...args),
  fetch: (...args) => globalThis.fetch(...args),
};

export function adaptRealtimeSession(createVoiceSession, opts) {
  const buffers = { user: '', agent: '' };

  const raw = createVoiceSession({
    ...opts,
    onStateChange(state) {
      // A new turn starts: drop half-finished text from the other side.
      if (state === 'user_speaking' || state === 'interrupted') buffers.agent = '';
      if (state === 'agent_speaking') buffers.user = '';
      opts.onStateChange(state);
    },
    onTranscript({ role, text, final }) {
      const who = role === 'assistant' ? 'agent' : role;
      if (final) {
        buffers[who] = '';
        opts.onTranscript({ role: who, text, final: true });
      } else {
        buffers[who] += text;
        opts.onTranscript({ role: who, text: buffers[who], final: false });
      }
    },
  }, BOUND_RUNTIME);

  return {
    async start() {
      await raw.connect();
    },
    stop() {
      raw.disconnect();
      opts.onStateChange('idle');
    },
    raw,
  };
}
