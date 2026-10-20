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
global.localStorage = dom.window.localStorage;
global.Event = dom.window.Event;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.MouseEvent = dom.window.MouseEvent;

const { Input } = await import('../src/core/Input.js');
const { TouchControls } = await import('../src/ui/TouchControls.js');
const { Hud } = await import('../src/ui/Hud.js');
const { Screens } = await import('../src/ui/Screens.js');
const { bindSensitivity, SENS_MAX, SENS_MIN } = await import('../src/ui/Sensitivity.js');

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
const hud = new Hud();
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const input = new Input(canvas);
const touch = new TouchControls(input, true); // pretend we are on a phone
input.enable();

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
log('\n[look drag]');
fire('pointerdown', 700, 200, { id: 2 });
check('a pointer on the right half starts a look drag', touch.pointers.size === 1);
fire('pointermove', 740, 200, { id: 2 });
check('drag right turns right', input.look.x > 0, `x=${input.look.x.toFixed(2)}`);
check('the turn is 1:1 with the finger', Math.abs(input.look.x - 40) < 0.01, `${input.look.x} px for 40 px`);
fire('pointermove', 740, 250, { id: 2 });
check('drag down looks down', input.look.y > 0, `y=${input.look.y.toFixed(2)}`);
check('yaw and pitch deltas are independent', input.look.x === 40 && input.look.y === 50, `${input.look.x}, ${input.look.y}`);
fire('pointerup', 740, 250, { id: 2 });
check('lifting the finger stops the turn dead', input.look.x === 40, `look stays at ${input.look.x} until the frame consumes it`);
input.endFrame();
check('endFrame() consumes the look delta', input.look.x === 0 && input.look.y === 0);

// The sensitivity setting must scale the drag, not replace it.
touch.setLookScale(0.5);
fire('pointerdown', 700, 200, { id: 20 });
fire('pointermove', 740, 200, { id: 20 });
check('the sensitivity slider scales the drag', Math.abs(input.look.x - 20) < 0.01, `${input.look.x} px`);
fire('pointerup', 740, 200, { id: 20 });
touch.setLookScale(1);
input.endFrame();

// A second finger on the right half must not hijack a live look drag: the
// first thumb owns it, and the newcomer is ignored entirely.
fire('pointerdown', 700, 200, { id: 21 });
fire('pointerdown', 760, 150, { id: 22 });
check('the second thumb is refused', touch.pointers.size === 1, `${touch.pointers.size} tracked`);
fire('pointermove', 700, 260, { id: 22 });
check('the ignored finger moves nothing', input.look.y === 0, `${input.look.y} px`);
fire('pointermove', 700, 260, { id: 21 });
check('the original thumb keeps the drag', Math.abs(input.look.y - 60) < 0.01, `${input.look.y} px`);
fire('pointerup', 700, 260, { id: 22 });
check('releasing the ignored finger is harmless', touch.pointers.size === 1);
fire('pointerup', 700, 260, { id: 21 });
input.endFrame();

// ---------------------------------------------------------------------------
log('\n[both sticks at once]');
fire('pointerdown', 120, 300, { id: 3 });
fire('pointerdown', 700, 200, { id: 4 });
check('two thumbs are tracked', touch.pointers.size === 2);
fire('pointermove', 160, 300, { id: 3 });
fire('pointermove', 660, 200, { id: 4 });
check('move and look are independent', input.move.x > 0 && input.look.x < 0, `move=${input.move.x.toFixed(2)} look=${input.look.x.toFixed(2)}`);
input.endFrame();
fire('pointerup', 160, 300, { id: 3 });
fire('pointerup', 660, 200, { id: 4 });

// ---------------------------------------------------------------------------
log('\n[action buttons]');
const useBtn = document.getElementById('btn-action');
const sprintBtn = document.getElementById('btn-sprint');

fire('pointerdown', 0, 0, { id: 5, target: useBtn });
check('USE button presses', input.touchAction === true);
check('USE does not create a stick', touch.pointers.size === 0);
fire('pointerup', 0, 0, { id: 5, target: useBtn });
// A tap shorter than one frame used to vanish: the release is handed to the
// input loop so sample() sees the press before it clears.
check('a fast tap survives until sample() sees it', input.touchAction === true && input.touchActionRelease === true);
input.sample(1 / 60);
check('the tap registers as exactly one action', input.actionPressed === true);
input.sample(1 / 60);
check('it does not repeat on the next frame', input.actionPressed === false && input.touchAction === false);
input.endFrame();

// Holding USE is a held state, not a repeat.
fire('pointerdown', 0, 0, { id: 50, target: useBtn });
input.sample(1 / 60);
fire('pointerup', 0, 0, { id: 50, target: useBtn });
input.sample(1 / 60);
input.sample(1 / 60);
check('holding USE then releasing ends cleanly', input.action === false && input.actionPressed === false);
input.endFrame();

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
input.touchSprint = true;
input.enable();
input.sample(1 / 60);
check('sample() folds touch state into sprint', input.sprint === true);
input.touchSprint = false;
input.sample(1 / 60);
check('sprint clears when released', input.sprint === false);

// Interact edge: keyboard E / Space.
input.keys.add('KeyE');
input.sample(1 / 60);
check('E interacts', input.action === true && input.actionPressed === true);
input.sample(1 / 60);
check('E held does not refire', input.action === true && input.actionPressed === false);
input.keys.delete('KeyE');
input.sample(1 / 60);
check('releasing E clears the action', input.action === false);

input.keys.add('Space');
input.sample(1 / 60);
check('Space interacts too', input.actionPressed === true);
input.keys.delete('Space');
input.sample(1 / 60);

// A mouse click on the canvas is USE on desktop.
input.mouseFiring = true;
input.sample(1 / 60);
check('left click interacts on desktop', input.actionPressed === true);
input.mouseFiring = false;
input.sample(1 / 60);
check('releasing the mouse clears it', input.action === false);

// Disabled means dead — no input at all outside of play.
input.disable();
input.keys.add('KeyW');
input.touchSprint = true;
input.sample(1 / 60);
check('disabled input ignores everything', input.move.y === 0 && input.sprint === false && input.action === false);
input.keys.delete('KeyW');
input.touchSprint = false;
input.enable();

// ---------------------------------------------------------------------------
log('\n[sensitivity sliders]');
let started = 0;
const screens = new Screens({ onStart: () => started++ });
let applied = null;
bindSensitivity((v) => (applied = v));
check('the saved value is applied on load', applied === 1, `applied=${applied}`);
const sensInputs = document.querySelectorAll('[data-sens]');
check('both the menu and the HUD have a slider', sensInputs.length === 2, `${sensInputs.length} found`);
sensInputs[0].value = '1.8';
sensInputs[0].dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const hudInput = document.querySelector('#hud [data-sens]');
check('moving one slider moves the other', hudInput.value === '1.8', hudInput.value);
check('the label follows', document.querySelector('#hud [data-sens-val]').textContent === '1.8');
check('the game was told', applied === 1.8, `applied=${applied}`);
check('the setting is remembered', localStorage.getItem('hana:sens') === '1.8');

// Reload behaviour: a new page picks the saved value back up.
const setSens = bindSensitivity((v) => (applied = v));
check('a reload restores the saved sensitivity', applied === 1.8, `applied=${applied}`);
setSens(0.5);
check('the setter clamps to the minimum', applied === 0.5);
setSens(99);
check('the setter clamps to the maximum', applied === SENS_MAX, `applied=${applied}`);
localStorage.setItem('hana:sens', '1');

// ---------------------------------------------------------------------------
log('\n[screens]');
document.getElementById('start-btn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('start button fires onStart', started === 1);
screens.hideStart();
check('start screen hides', screens.start.classList.contains('hidden'));
screens.showGameOver({ escaped: true, seconds: 95, used: 4 });
check('end screen shows the time', document.getElementById('go-time').textContent === '1m 35s');
check('end screen shows what you touched', document.getElementById('go-used').textContent === '4');

log(`\n${failures === 0 ? '✓ ALL UI CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
