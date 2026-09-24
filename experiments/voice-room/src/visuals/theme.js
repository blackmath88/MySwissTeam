// Visual grammar per conversation state.
//
// This is the tuning surface for EO-06 (visual polish): change numbers here,
// not the renderer. Every key is interpolated when the state changes, at the
// incoming state's `rate`, so transitions are liquid rather than cut.
//
//   hue/hueSpread     base hue (deg) and hue offset per ring
//   sat/light/alpha   stroke colour
//   radius            base ring radius, fraction of the field unit
//   rings/ringGap     number of rings (fractional = fading in) and spacing
//   lineWidth         stroke width in CSS px
//   turbulence        organic noise deformation (always on — silence breathes)
//   noiseSpeed/spin   speed of the noise and ring rotation (rad/s)
//   breathe           slow radius oscillation, independent of audio
//   audioGain/spike   how far the spectrum pushes the ring out, and how peaky
//   pulse             how much loudness (rms) inflates the radius
//   fbKeep/fbZoom/fbSpin  Winamp-style feedback trails: persistence per frame,
//                     zoom per frame (>1 blooms outward, <1 pulls inward), rotation
//   particles/particleDrift/particleOrbit  dust layer alpha, radial and angular speed
//   glow              soft centre light
//   micGain/agentGain which audio source drives the field in this state
//   rate              how fast the field morphs into this state (1/s)

export const BACKGROUND = '#050507';

const base = {
  hue: 215, hueSpread: 12, sat: 25, light: 60, alpha: 0.35,
  radius: 0.34, rings: 2, ringGap: 0.07, lineWidth: 1.2,
  turbulence: 0.03, noiseSpeed: 0.25, spin: 0.02, breathe: 0.04,
  audioGain: 0, spike: 1, pulse: 0,
  fbKeep: 0.82, fbZoom: 1.002, fbSpin: 0,
  particles: 0.15, particleDrift: 0, particleOrbit: 0.03,
  glow: 0.05,
  micGain: 0, agentGain: 0,
  rate: 1.5,
};

export const PROFILES = {
  // Before entering: a dim ember, barely there.
  idle: { ...base },

  // Handshake: a small pulse gathering inward.
  connecting: {
    ...base,
    hue: 200, sat: 40, alpha: 0.4, radius: 0.28,
    breathe: 0.12, noiseSpeed: 0.6, spin: 0.3,
    fbKeep: 0.85, fbZoom: 0.995,
    particles: 0.25, particleDrift: -0.3,
    micGain: 0.3, glow: 0.08, rate: 2.5,
  },

  // Open, cool, receptive. Responds gently to the room.
  listening: {
    ...base,
    hue: 182, hueSpread: 18, sat: 70, light: 58, alpha: 0.55,
    radius: 0.36, rings: 3, ringGap: 0.06, lineWidth: 1.4,
    turbulence: 0.035, noiseSpeed: 0.35, spin: 0.05, breathe: 0.025,
    audioGain: 0.3, spike: 1.3, pulse: 0.12,
    fbKeep: 0.86, fbZoom: 1.004, fbSpin: 0.0008,
    particles: 0.2, particleDrift: 0.05, particleOrbit: 0.05,
    micGain: 1, glow: 0.1, rate: 2.5,
  },

  // The user's voice sharpens and brightens the field.
  user_speaking: {
    ...base,
    hue: 160, hueSpread: 26, sat: 85, light: 62, alpha: 0.75,
    radius: 0.38, rings: 4, ringGap: 0.06, lineWidth: 1.6,
    turbulence: 0.05, noiseSpeed: 0.7, spin: 0.12, breathe: 0.01,
    audioGain: 0.6, spike: 2.2, pulse: 0.25,
    fbKeep: 0.9, fbZoom: 1.012, fbSpin: 0.002,
    particles: 0.35, particleDrift: 0.4, particleOrbit: 0.08,
    micGain: 1.15, glow: 0.18, rate: 5,
  },

  // Motion contracts and slows: a small violet vortex pulling inward.
  thinking: {
    ...base,
    hue: 262, hueSpread: 30, sat: 55, light: 55, alpha: 0.5,
    radius: 0.18, rings: 3, ringGap: 0.12, lineWidth: 1.1,
    turbulence: 0.08, noiseSpeed: 0.9, spin: 0.9, breathe: 0.05,
    audioGain: 0.05, spike: 1, pulse: 0,
    fbKeep: 0.93, fbZoom: 0.982, fbSpin: 0.012,
    particles: 0.6, particleDrift: -0.35, particleOrbit: 0.6,
    micGain: 0.15, glow: 0.06, rate: 2,
  },

  // The voice fills the room: broad, warm, many rings, blooming outward.
  agent_speaking: {
    ...base,
    hue: 28, hueSpread: -38, sat: 90, light: 60, alpha: 0.7,
    radius: 0.4, rings: 6, ringGap: 0.075, lineWidth: 1.8,
    turbulence: 0.06, noiseSpeed: 0.5, spin: 0.08, breathe: 0.02,
    audioGain: 0.75, spike: 1.6, pulse: 0.3,
    fbKeep: 0.92, fbZoom: 1.022, fbSpin: -0.002,
    particles: 0.45, particleDrift: 0.8, particleOrbit: 0.1,
    micGain: 0.3, agentGain: 1, glow: 0.28, rate: 3.5,
  },

  // A crack: colour drains, the field shatters and collapses. Brief by design.
  interrupted: {
    ...base,
    hue: 200, hueSpread: 0, sat: 10, light: 88, alpha: 0.9,
    radius: 0.24, rings: 2, ringGap: 0.05, lineWidth: 1,
    turbulence: 0.2, noiseSpeed: 3, spin: 0, breathe: 0,
    audioGain: 0.3, spike: 3, pulse: 0.1,
    fbKeep: 0.7, fbZoom: 0.96, fbSpin: 0,
    particles: 0.7, particleDrift: -1.2, particleOrbit: 0,
    micGain: 1, agentGain: 0.6, glow: 0.02, rate: 12,
  },

  // Stillness after the conversation: wide, warm-white, quiet.
  reflection: {
    ...base,
    hue: 40, hueSpread: 8, sat: 30, light: 80, alpha: 0.45,
    radius: 0.42, rings: 5, ringGap: 0.03, lineWidth: 1,
    turbulence: 0.015, noiseSpeed: 0.12, spin: 0.015, breathe: 0.03,
    audioGain: 0.12, spike: 1, pulse: 0.08,
    fbKeep: 0.9, fbZoom: 1.001, fbSpin: 0,
    particles: 0.2, particleDrift: 0.02, particleOrbit: 0.02,
    micGain: 0.6, agentGain: 0.6, glow: 0.12, rate: 0.8,
  },

  // Something broke: a single dim red ring, still alive.
  error: {
    ...base,
    hue: 355, hueSpread: 0, sat: 60, light: 45, alpha: 0.35,
    radius: 0.22, rings: 1, turbulence: 0.05, noiseSpeed: 0.4,
    fbKeep: 0.6, particles: 0.05, rate: 3,
  },
};

// Human words for screen readers (the field itself carries no label).
export const STATE_LABELS = {
  idle: '',
  connecting: 'Connecting',
  listening: 'Listening',
  user_speaking: 'Hearing you',
  thinking: 'Thinking',
  agent_speaking: 'Speaking',
  interrupted: 'Yielding',
  reflection: 'Reflection',
  error: 'Something went wrong',
};
