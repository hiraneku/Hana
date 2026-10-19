/**
 * UI / input test — `npm run test:ui`.
 *
 * Drives the real DOM and the real TouchControls + Input classes under jsdom.
 * This exists because of a bug that shipped: the touch layer is
 * `pointer-events: none`, so a listener attached to the layer itself never
 * fired. Only the action buttons worked — you could shoot but never move.
 * The simulation test cannot catch that; this one can.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  `<!doctype html><html><body><div id="app"></div><div id="fx-layer"></div></body></html>`,
  { pretendToBeVisual: true, url: 'https://example.test/Hana/' }
);

global.window = dom.window;
global.document = dom.window.document;
// Node 22 defines `navigator` as a getter-only global, so it has to be
// redefined rather than assigned.
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.MouseEvent = dom.window.MouseEvent;

const { Input } = await import('../src/core/Input.js');
const { TouchControls } = await import('../src/ui/TouchControls.js');
const { HUD } = await import('../src/ui/HUD.js');
const { Screens } = await import('../src/ui/Screens.js');

const log = (...a) => console.log(...a);
let failures = 0;
function check(name, cond, extra = '') {
  if (cond) log(`  ok   ${name} ${extra}`);
  else {
    failures++;
    log(`  FAIL ${name} ${extra}`);
  }
}

const W = 800;
const H = 400;
dom.window.innerWidth = W;
dom.window.innerHeight = H;

/** jsdom has no PointerEvent, so forge one out of a MouseEvent. */
function fire(type, x, y, { id = 1, target = document.body, button = 0 } = {}) {
  const e = new dom.window.MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    button,
  });
  Object.defineProperty(e, 'pointerId', { value: id });
  target.dispatchEvent(e);
  return e;
}

// ---------------------------------------------------------------------------
const hud = new HUD();
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const input = new Input(canvas);
const touch = new TouchControls(input, true); // pretend we are on a phone

log('\n[setup]');
check('touch-device class applied', document.body.classList.contains('touch-device'));
check('layer starts hidden', !touch.visible);
touch.show();
check('layer shows on a touch device', touch.visible);

// ---------------------------------------------------------------------------
log('\n[move stick]');
touch.enabled = true;
fire('pointerdown', 120, 300, { id: 1 });
check('a pointer on the left half starts the move stick', touch.pointers.size === 1);
check('move stick became visible', touch.moveStick.classList.contains('active'));

fire('pointermove', 160, 300, { id: 1 });
check('drag right strafes right', input.move.x > 0.5, `x=${input.move.x.toFixed(2)}`);

fire('pointermove', 160, 240, { id: 1 }); // up
check('drag up walks forward', input.move.y > 0.5, `y=${input.move.y.toFixed(2)}`);

fire('pointerup', 160, 240, { id: 1 });
check('releasing centres the stick', input.move.x === 0 && input.move.y === 0);
check('stick hidden again', !touch.moveStick.classList.contains('active'));

// ---------------------------------------------------------------------------
log('\n[look stick]');
fire('pointerdown', 700, 200, { id: 2 });
check('a pointer on the right half starts the look stick', touch.pointers.size === 1);
fire('pointermove', 740, 200, { id: 2 });
check('drag right turns right', input.lookAxis.x > 0.5, `x=${input.lookAxis.x.toFixed(2)}`);
fire('pointermove', 740, 250, { id: 2 });
check('drag down looks down', input.lookAxis.y < -0.5, `y=${input.lookAxis.y.toFixed(2)}`);
fire('pointerup', 740, 250, { id: 2 });
check('look stick released', input.lookAxis.x === 0 && input.lookAxis.y === 0);

// ---------------------------------------------------------------------------
log('\n[both sticks at once]');
fire('pointerdown', 120, 300, { id: 3 });
fire('pointerdown', 700, 200, { id: 4 });
check('two thumbs are tracked', touch.pointers.size === 2);
fire('pointermove', 160, 300, { id: 3 });
fire('pointermove', 660, 200, { id: 4 });
check('move and look are independent', input.move.x > 0 && input.lookAxis.x < 0, `move=${input.move.x.toFixed(2)} look=${input.lookAxis.x.toFixed(2)}`);
fire('pointerup', 160, 300, { id: 3 });
fire('pointerup', 660, 200, { id: 4 });

// ---------------------------------------------------------------------------
log('\n[action buttons]');
const fireBtn = document.getElementById('btn-fire');
const reloadBtn = document.getElementById('btn-reload');
const sprintBtn = document.getElementById('btn-sprint');

fire('pointerdown', 0, 0, { id: 5, target: fireBtn });
check('FIRE button presses', input.touchFiring === true);
check('FIRE does not create a stick', touch.pointers.size === 0);
fire('pointerup', 0, 0, { id: 5, target: fireBtn });
check('FIRE button releases', input.touchFiring === false);

fire('pointerdown', 0, 0, { id: 6, target: reloadBtn });
check('RELOAD queues a reload', input.reloadQueued === true);
fire('pointerup', 0, 0, { id: 6, target: reloadBtn });

fire('pointerdown', 0, 0, { id: 7, target: sprintBtn });
check('RUN sets sprint', input.touchSprint === true);
fire('pointerup', 0, 0, { id: 7, target: sprintBtn });
check('RUN releases', input.touchSprint === false);

// ---------------------------------------------------------------------------
log('\n[HUD taps must not move the player]');
let toggled = 0;
hud.onControlsToggle(() => toggled++);
const controlsBtn = document.getElementById('controls-btn');
fire('pointerdown', 760, 40, { id: 8, target: controlsBtn });
check('CONTROLS tap created no stick', touch.pointers.size === 0);
check('CONTROLS tap did not move the player', input.move.x === 0 && input.move.y === 0);
// Browsers synthesise a click from the tap; jsdom does not, so fire it too.
controlsBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('CONTROLS button still receives taps', toggled === 1);

// A tap on the HUD background (pointer-events: none) should fall through to
// the game surface and start a stick, not get swallowed.
fire('pointerdown', 100, 60, { id: 9, target: document.getElementById('hud') });
check('taps on the HUD itself are ignored', touch.pointers.size === 0);
fire('pointerup', 100, 60, { id: 9, target: document.getElementById('hud') });

// ---------------------------------------------------------------------------
log('\n[sample / endFrame]');
input.enable();
input.touchFiring = true;
input.touchSprint = true;
input.sample(1 / 60);
check('sample() folds touch state into firing', input.firing === true);
check('sample() folds touch state into sprint', input.sprint === true);
input.touchFiring = false;
input.touchSprint = false;
input.sample(1 / 60);
check('sample() clears firing when released', input.firing === false);
check('sprint clears when released', input.sprint === false);

// Holding a key must not be sticky.
input.keys.add('Space');
input.sample(1 / 60);
check('keyboard firing works', input.firing === true);
input.keys.delete('Space');
input.sample(1 / 60);
check('keyboard firing stops on keyup', input.firing === false);

// ---------------------------------------------------------------------------
log('\n[screens]');
let started = 0;
const screens = new Screens({ onStart: () => started++ });
document.getElementById('start-btn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('start button fires onStart', started === 1);
screens.hideStart();
check('start screen hides', screens.start.classList.contains('hidden'));
screens.showGameOver({ wave: 3, kills: 12, score: 1500, shots: 40, hits: 30 });
check('game over shows stats', document.getElementById('go-score').textContent === '1500');
check('accuracy computed', document.getElementById('go-acc').textContent === '75%');

log(`\n${failures === 0 ? '✓ ALL UI CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
