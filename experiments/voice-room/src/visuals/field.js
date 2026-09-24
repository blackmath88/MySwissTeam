// The generative field — one canvas, one living object.
//
//   const field = createVisualField(canvas, { getFrame, reducedMotion });
//   field.setState('listening');   // any conversation state
//   field.start();
//
// `getFrame()` must return an audio frame { rms, bass, mids, highs, spectrum }.
// The field neither knows nor cares where the audio came from.

import { BACKGROUND, PROFILES } from './theme.js';

const TAU = Math.PI * 2;
const PARTICLES = 90;

export function createVisualField(canvas, { getFrame, reducedMotion = false }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  // Feedback buffer: last frame, redrawn zoomed/rotated beneath the next one.
  const fb = document.createElement('canvas');
  const fbCtx = fb.getContext('2d', { alpha: false });

  let reduced = reducedMotion;
  let state = 'idle';
  const p = { ...PROFILES.idle }; // live, interpolated parameters
  let target = PROFILES.idle;

  let w = 0;
  let h = 0;
  let scale = 1;
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let t = 0;
  let shock = 0;
  let frameNo = 0;

  const particles = Array.from({ length: PARTICLES }, () => spawn({}, Math.random() * 1.2));

  function spawn(pt, r) {
    pt.a = Math.random() * TAU;
    pt.r = r;
    pt.v = 0.5 + Math.random();
    pt.size = 0.6 + Math.random() * 1.2;
    return pt;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    scale = dpr;
    canvas.width = fb.width = Math.max(1, Math.round(w * dpr));
    canvas.height = fb.height = Math.max(1, Math.round(h * dpr));
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function setState(next) {
    if (!PROFILES[next]) return;
    if (next === 'interrupted' && state !== 'interrupted') shock = 1;
    state = next;
    target = PROFILES[next];
  }

  function interpolate(dt) {
    const k = 1 - Math.exp(-dt * target.rate);
    for (const key in target) {
      if (key === 'hue') {
        const d = ((target.hue - p.hue + 540) % 360) - 180; // shortest way round
        p.hue = (p.hue + d * k + 360) % 360;
      } else {
        p[key] += (target[key] - p[key]) * k;
      }
    }
  }

  function sampleSpectrum(spec, u) {
    // Mirror around the ring so the shape closes seamlessly: bass at the top,
    // highs at the bottom, both halves symmetric like an old scope skin.
    const f = 1 - Math.abs(2 * u - 1);
    const x = f * (spec.length - 1) * 0.85;
    const i = x | 0;
    const frac = x - i;
    return spec[i] * (1 - frac) + (spec[i + 1] ?? spec[i]) * frac;
  }

  function draw(dt, audio) {
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.45;
    const unit = Math.min(w * 0.62, h * 0.42) * scale;

    // 1. Background + feedback trails.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, W, H);

    if (!reduced && p.fbKeep > 0.01) {
      const fpsNorm = dt * 60; // keep trail behaviour stable across refresh rates
      const zoom = Math.pow(p.fbZoom + shock * -0.02, fpsNorm);
      ctx.globalAlpha = Math.pow(p.fbKeep, fpsNorm);
      ctx.translate(cx, cy);
      ctx.rotate(p.fbSpin * fpsNorm);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      ctx.drawImage(fb, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }

    // 2. Centre glow.
    const glow = p.glow * (0.6 + audio.rms * 1.2);
    if (glow > 0.005) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 1.4);
      g.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.light * 0.6}%, ${glow})`);
      g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalCompositeOperation = 'lighter';

    // 3. Rings.
    const motion = reduced ? 0.25 : 1;
    const audioGain = p.audioGain * (reduced ? 0.4 : 1);
    const turb = p.turbulence * (reduced ? 0.5 : 1);
    const points = reduced ? 96 : 160;
    const ringCount = Math.ceil(p.rings - 0.001);
    const spec = audio.spectrum;

    for (let k = 0; k < ringCount; k++) {
      const ringAlpha = Math.min(1, p.rings - k);
      if (ringAlpha <= 0.01) continue;
      const dir = k % 2 ? -1 : 1;
      const rot = t * p.spin * motion * dir * (1 + k * 0.2);
      const breath = 1 + p.breathe * Math.sin(t * 0.9 + k * 0.7);
      const R = p.radius * unit * (1 + k * p.ringGap) * breath * (1 + p.pulse * audio.rms) * (1 - shock * 0.25);
      const ns = t * p.noiseSpeed * motion;

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const u = i / points;
        const th = u * TAU;
        const s = Math.pow(sampleSpectrum(spec, u), p.spike) * (1 + p.spike * 0.25);
        const n =
          0.5 * Math.sin(th * 3 + ns * 1.3 + k) +
          0.3 * Math.sin(th * 5 - ns * 0.7 + k * 2.1) +
          0.2 * Math.sin(th * 9 + ns * 2.1 + k * 0.4);
        let r = R * (1 + turb * n * (1 + audio.bass * 2) + audioGain * s * (0.6 + k * 0.15));
        if (shock > 0.01 && !reduced) r += (hash(i, k, frameNo) - 0.5) * shock * R * 0.6;
        const a = th + rot - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const hue = (p.hue + k * p.hueSpread + audio.mids * 24 + 360) % 360;
      const light = Math.min(95, p.light + audio.highs * 10 + shock * 20);
      const alpha = p.alpha * ringAlpha * (0.55 + 0.45 * audio.rms) * (1 - k / (ringCount + 2));
      ctx.strokeStyle = `hsla(${hue}, ${p.sat}%, ${light}%, ${alpha})`;
      ctx.lineWidth = p.lineWidth * scale * (1 + audio.highs * 1.2) * (k === 0 ? 1.2 : 1);
      ctx.stroke();
    }

    // 4. Dust.
    if (p.particles > 0.01) {
      const drift = reduced ? 0 : p.particleDrift;
      ctx.fillStyle = `hsla(${(p.hue + 20) % 360}, ${p.sat * 0.6}%, ${Math.min(95, p.light + 15)}%, 1)`;
      for (const pt of particles) {
        pt.a += p.particleOrbit * motion * pt.v * dt * (1 + audio.mids);
        pt.r += drift * pt.v * dt * (0.15 + audio.rms);
        if (pt.r > 1.5) spawn(pt, p.radius * (0.8 + Math.random() * 0.4));
        else if (pt.r < 0.04) spawn(pt, 1.1 + Math.random() * 0.4);
        const x = cx + Math.cos(pt.a) * pt.r * unit;
        const y = cy + Math.sin(pt.a) * pt.r * unit;
        const edge = Math.max(0, 1 - Math.abs(pt.r - p.radius) / 1.2);
        ctx.globalAlpha = p.particles * edge * (0.35 + audio.highs * 0.8);
        const sz = pt.size * scale;
        ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    // 5. Keep this frame for the next frame's trails.
    if (!reduced) {
      fbCtx.globalCompositeOperation = 'copy';
      fbCtx.drawImage(canvas, 0, 0);
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    // Reduced motion also means fewer frames.
    if (reduced && now - lastDraw < 33) return;
    const stepDt = reduced ? (now - (lastDraw || now)) / 1000 : dt;
    lastDraw = now;

    interpolate(stepDt);
    t += stepDt;
    shock *= Math.exp(-stepDt * 4);
    frameNo++;
    draw(Math.min(0.1, stepDt), getFrame());
  }

  const onResize = () => resize();
  const onVisibility = () => (document.hidden ? stop() : start());

  function start() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setState,
    start,
    stop,
    setReducedMotion(on) {
      reduced = on;
    },
    get state() {
      return state;
    },
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

function hash(a, b, c) {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return x - Math.floor(x);
}
