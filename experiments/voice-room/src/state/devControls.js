// Dev controls — temporary scaffolding to drive states before realtime exists.
//
// Keyboard:  0 idle · L listening · U user speaking · T thinking
//            S agent speaking · I interrupted · R reflection · E error
//            A autopilot on/off · B barge-in on/off · D show/hide panel
// Touch:     triple-tap anywhere toggles the panel.
// URL:       ?dev opens the panel on load.

const BUTTONS = [
  ['idle', '0'],
  ['listening', 'L'],
  ['user_speaking', 'U'],
  ['thinking', 'T'],
  ['agent_speaking', 'S'],
  ['interrupted', 'I'],
  ['reflection', 'R'],
  ['error', 'E'],
];

export function createDevControls({ root, getSession, onForce, visible = false }) {
  const panel = document.createElement('div');
  panel.className = 'dev-panel';
  panel.setAttribute('aria-label', 'Developer controls');

  const stateButtons = new Map();
  for (const [name, key] of BUTTONS) {
    const b = button(`${key} ${name.replace('_', ' ')}`, () => onForce(name));
    stateButtons.set(name, b);
    panel.append(b);
  }
  const auto = button('', () => toggle('autopilot'));
  const barge = button('', () => toggle('bargeIn'));
  panel.append(auto, barge);
  root.append(panel);

  function button(label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  }

  function toggle(key) {
    const dev = getSession()?.dev;
    if (!dev) return;
    dev[key] = !dev[key];
    refresh();
  }

  function refresh(current) {
    const dev = getSession()?.dev;
    auto.textContent = `A auto ${dev?.autopilot ? 'on' : 'off'}`;
    barge.textContent = `B barge-in ${dev?.bargeIn ? 'on' : 'off'}`;
    if (current) for (const [name, b] of stateButtons) b.classList.toggle('active', name === current);
  }

  function setVisible(v) {
    document.body.classList.toggle('dev', v);
  }

  const keymap = Object.fromEntries(BUTTONS.map(([name, key]) => [key.toLowerCase(), name]));
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'd') setVisible(!document.body.classList.contains('dev'));
    else if (k === 'a') toggle('autopilot');
    else if (k === 'b') toggle('bargeIn');
    else if (keymap[k]) onForce(keymap[k]);
  });

  let taps = [];
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('button')) return;
    const now = performance.now();
    taps = taps.filter((t) => now - t < 600).concat(now);
    if (taps.length >= 3) {
      taps = [];
      setVisible(!document.body.classList.contains('dev'));
    }
  });

  setVisible(visible);
  refresh();

  return { refresh, setVisible };
}
