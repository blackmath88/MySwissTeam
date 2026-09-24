// Subtitles — a quiet accessibility layer, never a chat log.
// Shows only the latest utterance tail; fades out after it is final.

const MAX_CHARS = 140;
const LINGER_MS = 3500;

export function createSubtitles(el, { enabled = true } = {}) {
  let hideTimer = 0;
  let on = enabled;
  let settled = false; // a fade-out is already scheduled

  function show({ role, text, final }) {
    clearTimeout(hideTimer);
    if (!on || !text) {
      if (!text) el.classList.remove('visible');
      return;
    }
    el.dataset.role = role;
    el.textContent = tail(text);
    el.classList.add('visible');
    settled = !!final;
    if (final) hideTimer = setTimeout(clear, LINGER_MS);
  }

  function clear() {
    clearTimeout(hideTimer);
    el.classList.remove('visible');
  }

  // Let whatever is showing linger briefly, then fade — for utterances that
  // were cut off and will never receive a final transcript.
  function settle() {
    if (settled || !el.classList.contains('visible')) return;
    settled = true;
    hideTimer = setTimeout(clear, LINGER_MS / 2);
  }

  return {
    show,
    clear,
    settle,
    get enabled() {
      return on;
    },
    set enabled(v) {
      on = v;
      if (!v) clear();
    },
  };
}

function tail(text) {
  if (text.length <= MAX_CHARS) return text;
  const cut = text.slice(-MAX_CHARS);
  return '…' + cut.slice(cut.indexOf(' ') + 1);
}
