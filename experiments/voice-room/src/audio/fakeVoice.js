// Fake agent voice — a tiny formant murmur synth.
//
// Stand-in for the remote realtime voice until SYNC-02. It exposes its output
// as a MediaStream (`voice.stream`) so the visualizer consumes it through the
// exact same path as real remote audio: attachAudioSource(stream).
//
// It does not speak words; it produces a speech-shaped signal (pitch contour,
// syllable envelope, moving formants, fricative noise) that exercises bass,
// mids and highs like a real voice would.

const VOWELS = [
  [730, 1090, 2440], // a
  [530, 1840, 2480], // e
  [390, 1990, 2550], // i
  [570, 840, 2410], // o
  [440, 1020, 2240], // u
  [660, 1720, 2410], // ä
];

export function createFakeVoice(ctx, { volume = 0.22 } = {}) {
  const master = ctx.createGain();
  master.gain.value = volume;
  const streamOut = ctx.createMediaStreamDestination();
  master.connect(ctx.destination);
  master.connect(streamOut);

  const envelope = ctx.createGain();
  envelope.gain.value = 0;
  envelope.connect(master);

  // Glottal source: two slightly detuned saws.
  const osc = [ctx.createOscillator(), ctx.createOscillator()];
  osc[0].type = osc[1].type = 'sawtooth';
  osc[1].detune.value = 7;

  const formants = VOWELS[0].map((f, i) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = [9, 12, 14][i];
    const g = ctx.createGain();
    g.gain.value = [1, 0.55, 0.28][i];
    osc.forEach((o) => o.connect(bp));
    bp.connect(g).connect(envelope);
    return bp;
  });

  // Fricatives: filtered noise bursts for s/sch/t.
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;
  noise.loop = true;
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'highpass';
  hiss.frequency.value = 3200;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0;
  noise.connect(hiss).connect(hissGain).connect(master);

  osc.forEach((o) => o.start());
  noise.start();

  let current = null;

  function stop() {
    if (!current) return;
    const t = ctx.currentTime;
    for (const p of [envelope.gain, hissGain.gain]) {
      p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, 0.02);
    }
    current.timers.forEach(clearTimeout);
    const { resolve } = current;
    current = null;
    resolve({ interrupted: true });
  }

  // Speak `text` as murmur. onProgress(textSoFar) fires word by word, like
  // streaming transcript deltas. Resolves { interrupted } when done.
  function speak(text, { onProgress } = {}) {
    stop();
    const words = text.split(/\s+/).filter(Boolean);
    const t0 = ctx.currentTime + 0.05;
    let t = t0;
    const timers = [];
    const base = 118 + Math.random() * 20;
    const totalSyll = words.reduce((n, w) => n + syllables(w), 0);
    let syllIndex = 0;

    words.forEach((word, wi) => {
      const wordStart = t;
      const n = syllables(word);
      for (let s = 0; s < n; s++) {
        const dur = 0.13 + Math.random() * 0.09;
        const progress = syllIndex++ / Math.max(1, totalSyll);
        // Declination with a little lift at phrase starts.
        const f0 = base * (1.12 - 0.22 * progress) * (1 + (Math.random() - 0.5) * 0.08);
        osc.forEach((o) => o.frequency.setTargetAtTime(f0, t, 0.03));

        const v = VOWELS[(Math.random() * VOWELS.length) | 0];
        formants.forEach((bp, i) => bp.frequency.setTargetAtTime(v[i], t, 0.04));

        if (/[sztfcx]/i.test(word) && Math.random() < 0.5) {
          hissGain.gain.setTargetAtTime(0.35, t, 0.005);
          hissGain.gain.setTargetAtTime(0, t + 0.05, 0.02);
        }

        const peak = 0.75 + Math.random() * 0.25;
        envelope.gain.setTargetAtTime(peak, t, 0.018);
        envelope.gain.setTargetAtTime(0.08, t + dur * 0.7, 0.03);
        t += dur;
      }
      const soFar = words.slice(0, wi + 1).join(' ');
      timers.push(setTimeout(() => onProgress?.(soFar), (wordStart - ctx.currentTime) * 1000));

      // Pauses: short between words, longer at punctuation.
      if (/[.?!]$/.test(word)) t += 0.38;
      else if (/[,;:—]$/.test(word)) t += 0.2;
      else t += 0.04;
      envelope.gain.setTargetAtTime(0, t - 0.03, 0.02);
    });

    return new Promise((resolve) => {
      current = { resolve, timers };
      timers.push(
        setTimeout(() => {
          if (current?.resolve !== resolve) return;
          current = null;
          resolve({ interrupted: false });
        }, (t - ctx.currentTime) * 1000 + 120),
      );
    });
  }

  return {
    stream: streamOut.stream,
    speak,
    stop,
    get speaking() {
      return current !== null;
    },
  };
}

function syllables(word) {
  const groups = word.toLowerCase().match(/[aeiouyäöü]+/g);
  return Math.max(1, Math.min(5, groups ? groups.length : 1));
}
