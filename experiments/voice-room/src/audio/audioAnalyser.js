// Audio analysis abstraction (EO-04).
//
// Provider-agnostic: it analyses whatever audio it is given — the local mic,
// a remote WebRTC stream, an <audio> element or any Web Audio node — and
// returns one normalised frame per render tick:
//
//   { rms, bass, mids, highs, spectrum }   scalars 0..1, spectrum: number[] of 0..1
//
// Usage:
//   const a = createAudioAnalyser(audioContext);
//   a.attachAudioSource(micStream);          // MediaStream | HTMLMediaElement | AudioNode
//   const frame = a.getAudioFrame();         // call once per animation frame
//   a.detachAudioSource();
//
// The returned frame object is reused between calls — copy it if you need to keep it.

const BANDS_HZ = {
  bass: [40, 250],
  mids: [250, 2000],
  highs: [2000, 8000],
};

// <audio>/<video> elements can only be wrapped once per AudioContext.
const elementSources = new WeakMap();

export function createSilentFrame(bands = 48) {
  return { rms: 0, bass: 0, mids: 0, highs: 0, spectrum: new Array(bands).fill(0) };
}

// Adaptive range tracker: follows a slowly rising noise floor and a slowly
// decaying peak so whispers and loud speech both land in a usable 0..1 range
// without silence being amplified into noise (minRange keeps the gate honest).
function createNormaliser({ minRange, floorRise = 0.02, peakFall = 0.04 }) {
  let floor = Infinity;
  let peak = 0;
  return (x, dt) => {
    floor = x < floor ? x : floor + (x - floor) * Math.min(1, floorRise * dt);
    peak = x > peak ? x : peak - (peak - x) * Math.min(1, peakFall * dt);
    const range = Math.max(peak - floor, minRange);
    return clamp01((x - floor) / range);
  };
}

export function createAudioAnalyser(ctx, { fftSize = 2048, bands = 48, minHz = 50, maxHz = 12000 } = {}) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -22;
  analyser.smoothingTimeConstant = 0.55;

  const freq = new Uint8Array(analyser.frequencyBinCount);
  const time = new Float32Array(analyser.fftSize);
  const binHz = ctx.sampleRate / analyser.fftSize;
  const toBin = (hz) => Math.max(1, Math.min(freq.length - 1, Math.round(hz / binHz)));

  const ranges = Object.fromEntries(
    Object.entries(BANDS_HZ).map(([k, [lo, hi]]) => [k, [toBin(lo), toBin(hi)]]),
  );

  // Log-spaced spectrum bands — mirrors how we hear, and gives speech room to breathe.
  const specBins = [];
  for (let i = 0; i <= bands; i++) {
    specBins.push(toBin(minHz * Math.pow(maxHz / minHz, i / bands)));
  }

  const norm = {
    rms: createNormaliser({ minRange: 0.04 }),
    bass: createNormaliser({ minRange: 0.3 }),
    mids: createNormaliser({ minRange: 0.3 }),
    highs: createNormaliser({ minRange: 0.25 }),
  };

  const frame = createSilentFrame(bands);
  let source = null;
  let detachFn = null;
  let last = performance.now();

  function attachAudioSource(input) {
    detachAudioSource();
    if (!input) return;

    if (typeof MediaStream !== 'undefined' && input instanceof MediaStream) {
      // Tap only — never route the mic to the speakers.
      // Note (Chrome): a *remote* WebRTC stream only yields samples once it is
      // also playing through a media element. The realtime adapter should keep
      // its own <audio> element for playback; we just listen in.
      const node = ctx.createMediaStreamSource(input);
      node.connect(analyser);
      source = input;
      detachFn = () => node.disconnect();
    } else if (typeof HTMLMediaElement !== 'undefined' && input instanceof HTMLMediaElement) {
      let node = elementSources.get(input);
      if (!node) {
        node = ctx.createMediaElementSource(input);
        node.connect(ctx.destination); // keep it audible once Web Audio owns it
        elementSources.set(input, node);
      }
      node.connect(analyser);
      source = input;
      detachFn = () => node.disconnect(analyser);
    } else if (input && typeof input.connect === 'function') {
      input.connect(analyser);
      source = input;
      detachFn = () => input.disconnect(analyser);
    } else {
      throw new TypeError('attachAudioSource expects a MediaStream, HTMLMediaElement or AudioNode');
    }
  }

  function detachAudioSource() {
    if (detachFn) {
      try {
        detachFn();
      } catch {
        /* already disconnected */
      }
    }
    source = null;
    detachFn = null;
  }

  function bandMean(lo, hi) {
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += freq[i];
    return sum / (Math.max(1, hi - lo) * 255);
  }

  function getAudioFrame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (!source) {
      // Glide to silence rather than snapping.
      const k = 1 - Math.exp(-dt * 6);
      frame.rms -= frame.rms * k;
      frame.bass -= frame.bass * k;
      frame.mids -= frame.mids * k;
      frame.highs -= frame.highs * k;
      for (let i = 0; i < bands; i++) frame.spectrum[i] -= frame.spectrum[i] * k;
      return frame;
    }

    analyser.getByteFrequencyData(freq);
    analyser.getFloatTimeDomainData(time);

    let sq = 0;
    for (let i = 0; i < time.length; i++) sq += time[i] * time[i];
    const rawRms = Math.sqrt(sq / time.length);

    const target = {
      rms: Math.sqrt(norm.rms(rawRms, dt)), // perceptual curve
      bass: norm.bass(bandMean(...ranges.bass), dt),
      mids: norm.mids(bandMean(...ranges.mids), dt),
      highs: norm.highs(bandMean(...ranges.highs), dt),
    };

    // Fast attack, slower release — speech onsets punch, tails breathe.
    for (const key of ['rms', 'bass', 'mids', 'highs']) {
      const rate = target[key] > frame[key] ? 30 : 7;
      frame[key] += (target[key] - frame[key]) * (1 - Math.exp(-dt * rate));
    }

    for (let i = 0; i < bands; i++) {
      const v = bandMean(specBins[i], Math.max(specBins[i] + 1, specBins[i + 1]));
      const gated = clamp01((v - 0.12) / 0.75);
      const rate = gated > frame.spectrum[i] ? 35 : 8;
      frame.spectrum[i] += (gated - frame.spectrum[i]) * (1 - Math.exp(-dt * rate));
    }

    return frame;
  }

  return {
    attachAudioSource,
    getAudioFrame,
    detachAudioSource,
    get attached() {
      return source !== null;
    },
  };
}

// Blend several frames into `out` with per-source weights (per-value max,
// so a quiet mic never dilutes a loud agent and vice versa).
export function mixFrames(out, entries) {
  out.rms = out.bass = out.mids = out.highs = 0;
  out.spectrum.fill(0);
  for (const [f, w] of entries) {
    if (!f || w <= 0) continue;
    out.rms = Math.max(out.rms, f.rms * w);
    out.bass = Math.max(out.bass, f.bass * w);
    out.mids = Math.max(out.mids, f.mids * w);
    out.highs = Math.max(out.highs, f.highs * w);
    const n = Math.min(out.spectrum.length, f.spectrum.length);
    for (let i = 0; i < n; i++) out.spectrum[i] = Math.max(out.spectrum[i], f.spectrum[i] * w);
  }
  return out;
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
