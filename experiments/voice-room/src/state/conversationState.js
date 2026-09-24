// Conversation state — the only vocabulary the experience understands.
// Frozen at SYNC-01. Realtime adapters must emit exactly these names.

export const STATES = Object.freeze([
  'idle',
  'connecting',
  'listening',
  'user_speaking',
  'thinking',
  'agent_speaking',
  'interrupted',
  'reflection',
  'error',
]);

const VALID = new Set(STATES);

export function isConversationState(name) {
  return VALID.has(name);
}

// Tiny observable store. No framework, no history, no reducers.
export function createConversationState(initial = 'idle') {
  let current = initial;
  let since = performance.now();
  const listeners = new Set();

  return {
    get() {
      return current;
    },
    // Milliseconds spent in the current state.
    age() {
      return performance.now() - since;
    },
    set(next) {
      if (!VALID.has(next)) {
        console.warn(`[conversationState] ignoring unknown state "${next}"`);
        return;
      }
      if (next === current) return;
      const prev = current;
      current = next;
      since = performance.now();
      for (const fn of listeners) fn(next, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
