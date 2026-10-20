/**
 * End-to-end test — `npm run test:game`.
 *
 * Boots the *actual* Game class under jsdom with a stub renderer: no GPU, but
 * every line of real game code runs — engine, room, player, hands, HUD, touch
 * controls, interactables. It then plays the game the way a phone would: tap
 * start, drag the left stick, drag anywhere to look, walk up to the nightstand
 * and press USE, flip the light switch, then open the door and leave.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
  pretendToBeVisual: true,
  url: 'https://example.test/Hana/',
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;
global.localStorage = dom.window.localStorage;
global.matchMedia = () => ({ matches: true });
// Node has no `location`, and Debug.js reads `location.search`. Without this
// the debug switch throws and silently reports itself off.
Object.defineProperty(global, 'location', {
  value: dom.window.location,
  configurable: true,
  writable: true,
});

const W = 800;
const H = 400;
dom.window.innerWidth = W;
dom.window.innerHeight = H;

// Turn the debug panel on for the whole run: it is the code path a phone
// uses to tell us what is wrong, so it had better not throw.
localStorage.setItem('hana:debug', '1');

const { Game } = await import('../src/Game.js');

const log = (...a) => console.log(...a);
let failures = 0;
function check(name, cond, extra = '') {
  if (cond) log(`  ok   ${name} ${extra}`);
  else {
    failures++;
    log(`  FAIL ${name} ${extra}`);
  }
}

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

/** Minimal stand-in for THREE.WebGLRenderer. */
function stubRenderer() {
  const canvas = document.createElement('canvas');
  document.getElementById('app').appendChild(canvas);
  return {
    domElement: canvas,
    shadowMap: { enabled: false, type: 0 },
    toneMapping: 0,
    toneMappingExposure: 1,
    frames: 0,
    loop: null,
    setPixelRatio() {},
    setSize() {},
    render() {
      this.frames++;
    },
    setAnimationLoop(cb) {
      this.loop = cb;
    },
  };
}

/** Run `n` frames of the real animation loop at a fixed 60 Hz. */
function run(game, n) {
  for (let i = 0; i < n; i++) {
    if (!game.engine.renderer.loop) break;
    game.engine.renderer.loop();
  }
}

/**
 * Stand the player at (x, z) and point the camera straight at a hotspot.
 * Forward is (-sin yaw, 0, -cos yaw), and pitch is measured up from level.
 */
function aimAt(game, x, z, target) {
  const p = game.player;
  p.pos.set(x, p.pos.y, z);
  p.vel.set(0, 0, 0);
  const dx = target.x - x;
  const dy = target.y - p.pos.y;
  const dz = target.z - z;
  p.yaw = Math.atan2(-dx, -dz);
  p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
}

/** One full press and release of the USE button. */
function tapUse(game, id) {
  const btn = document.getElementById('btn-action');
  fire('pointerdown', 0, 0, { id, target: btn });
  fire('pointerup', 0, 0, { id, target: btn });
  run(game, 2);
}

// ---------------------------------------------------------------------------
log('\n[boot]');
const renderer = stubRenderer();
const game = new Game({ renderer, isTouch: true });
game.engine.clock.getDelta = () => 1 / 60; // deterministic 60 Hz

check('game constructed', !!game);
check('start screen is up', !game.screens.start.classList.contains('hidden'));
check('state is menu', game.state === 'menu');
check('touch layer hidden before start', !game.touch.visible);
check('loop is running', typeof renderer.loop === 'function');
check('the room is loaded', !!game.room.group, `${game.room.colliders.length} colliders`);
check('the debug panel is up', !!game.debug && !!document.getElementById('debug-panel'));
check('it is the apartment, not the yard', !!game.room.switchPos && !!game.room.drawerPos);

run(game, 3);
check('renders frames', renderer.frames >= 3, `${renderer.frames} frames`);
check('no frame errors', !game.engine._errors, `errors=${game.engine._errors || 0}`);

// ---------------------------------------------------------------------------
log('\n[start]');
document.getElementById('start-btn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('state is playing', game.state === 'playing');
check('start screen hidden', game.screens.start.classList.contains('hidden'));
check('HUD visible', game.hud.el.classList.contains('visible'));
check('touch layer shown', game.touch.visible);
check('touch input enabled', game.touch.enabled === true);
check('input enabled', game.input.enabled === true);
check('the objective is set', game.hud.objectiveValue.textContent === 'Cari kartu kunci', game.hud.objectiveValue.textContent);

run(game, 30);
check('still no frame errors', !game.engine._errors, `errors=${game.engine._errors || 0}`);
check('the debug panel is being written to', /state\s+playing/.test(document.getElementById('debug-panel').textContent), document.getElementById('debug-panel').textContent.split('\n')[1]);

// ---------------------------------------------------------------------------
log('\n[move: drag the left stick]');
const before = game.player.pos.clone();
fire('pointerdown', 120, 300, { id: 1 });
check('move stick active', game.touch.moveStick.classList.contains('active'));
fire('pointermove', 120, 200, { id: 1 }); // drag up = walk forward
check('move.y is forward', game.input.move.y > 0.8, `y=${game.input.move.y.toFixed(2)}`);

run(game, 60);
const moved = before.distanceTo(game.player.pos);
check('player actually walked', moved > 2, `${moved.toFixed(2)}m in 1s`);

fire('pointerup', 120, 200, { id: 1 });
check('stick released', game.input.move.x === 0 && game.input.move.y === 0);
run(game, 30);
check('no frame errors after moving', !game.engine._errors, `errors=${game.engine._errors || 0}`);

// ---------------------------------------------------------------------------
log('\n[look: drag the right side of the screen]');
const yaw0 = game.player.yaw;
fire('pointerdown', 700, 200, { id: 2 });
check('a look drag started', game.touch.pointers.size === 1);
fire('pointermove', 780, 200, { id: 2 }); // 80 px right
check('the drag is 1:1 with the finger', Math.abs(game.input.look.x - 80) < 0.01, `${game.input.look.x} px`);
run(game, 1);
const yawAfterDrag = game.player.yaw;
check('camera yaw changed', Math.abs(yawAfterDrag - yaw0) > 0.1, `${yaw0.toFixed(2)} -> ${yawAfterDrag.toFixed(2)}`);
run(game, 30);
check('the turn stops dead when the finger stops', game.player.yaw === yawAfterDrag);
fire('pointerup', 780, 200, { id: 2 });

// Looking must work from anywhere on the right half — there is no widget.
fire('pointerdown', 620, 90, { id: 22 });
fire('pointermove', 560, 130, { id: 22 });
run(game, 1);
check('any part of the right half looks around', game.player.yaw !== yawAfterDrag, `yaw=${game.player.yaw.toFixed(2)}`);
fire('pointerup', 560, 130, { id: 22 });
run(game, 10);

// ---------------------------------------------------------------------------
log('\n[buttons]');
const useBtn = document.getElementById('btn-action');
check('the USE button exists', !!useBtn);
check('the RUN button exists', !!document.getElementById('btn-sprint'));
check('there is no fire button any more', document.getElementById('btn-fire') === null);
check('there is no reload button any more', document.getElementById('btn-reload') === null);

fire('pointerdown', 0, 0, { id: 30, target: document.getElementById('btn-sprint') });
check('RUN sets sprint', game.input.touchSprint === true);
run(game, 2);
check('sprint reaches the player', game.input.sprint === true);
fire('pointerup', 0, 0, { id: 30, target: document.getElementById('btn-sprint') });
run(game, 2);
check('RUN releases', game.input.sprint === false);

// ---------------------------------------------------------------------------
log('\n[interact: open the nightstand]');
const drawer = game.drawer;
aimAt(game, drawer.position.x + 0.75, drawer.position.z, drawer.position);
run(game, 2);
check('the drawer is in reach', game.interactables.focus === drawer, game.interactables.focus?.label() ?? 'none');
check('the prompt names it', game.hud.promptLabel.textContent === 'Buka laci');
check('the prompt is on screen', game.hud.prompt.classList.contains('show'));

tapUse(game, 3);
check('USE took the key card', game.hasKey === true);
check('the HUD shows the key', game.hud.keyValue.textContent === 'ada');
check('the drawer is used up', drawer.enabled === false);
check('the objective moved on', game.hud.objectiveValue.textContent === 'Buka pintu keluar');
check('the hands reached out', game.hands.reach > 0);
run(game, 20);
check('no frame errors after interacting', !game.engine._errors, `errors=${game.engine._errors || 0}`);

// Looking away must clear the prompt.
game.player.yaw += Math.PI;
run(game, 2);
check('looking away clears the prompt', game.interactables.focus === null);
check('and hides it', !game.hud.prompt.classList.contains('show'));

// ---------------------------------------------------------------------------
log('\n[light switch]');
const sw = game.lightSwitch;
aimAt(game, sw.position.x, sw.position.z - 1.1, sw.position);
run(game, 2);
check('the switch is in reach', game.interactables.focus === sw, game.interactables.focus?.label() ?? 'none');
const litBefore = game.room.lightsOn;
tapUse(game, 4);
check('the switch toggled the lights', game.room.lightsOn !== litBefore, `${litBefore} -> ${game.room.lightsOn}`);
run(game, 4);
check('the lamps went dark', game.room.ceilingLight.intensity === 0, `i=${game.room.ceilingLight.intensity}`);
check('the label follows the state', sw.label() === 'Nyalakan lampu', sw.label());
tapUse(game, 5);
run(game, 4);
check('and back on again', game.room.ceilingLight.intensity > 0, `i=${game.room.ceilingLight.intensity.toFixed(1)}`);

// ---------------------------------------------------------------------------
log('\n[television]');
const tv = game.tv;
aimAt(game, tv.position.x - 1.2, tv.position.z, tv.position);
run(game, 2);
check('the tv is in reach', game.interactables.focus === tv, game.interactables.focus?.label() ?? 'none');
tapUse(game, 6);
check('the tv came on', game.room.tvOn === true);
run(game, 4);
check('it casts light', game.room.tvLight.intensity > 0, `i=${game.room.tvLight.intensity.toFixed(1)}`);
tapUse(game, 7);
run(game, 4);
check('and off again', game.room.tvOn === false && game.room.tvLight.intensity === 0);

// ---------------------------------------------------------------------------
log('\n[a locked door]');
const door = game.door;
aimAt(game, door.position.x, door.position.z - 1.2, door.position);
run(game, 2);
check('the door is in reach', game.interactables.focus === door, game.interactables.focus?.label() ?? 'none');

game.hasKey = false;
run(game, 2);
check('without the key it says so', door.label() === 'Pintu terkunci', door.label());
tapUse(game, 8);
check('and does not let you out', game.state === 'playing');
game.hasKey = true;
run(game, 2);

// ---------------------------------------------------------------------------
log('\n[escape]');
check('with the key it offers the way out', door.label() === 'Buka pintu', door.label());
tapUse(game, 9);
check('you got out', game.state === 'escaped');
check('the end screen is up', !game.screens.gameOver.classList.contains('hidden'));
check('touch layer hidden at the end', !game.touch.visible);
check('the end screen shows a time', /\d/.test(document.getElementById('go-time').textContent), document.getElementById('go-time').textContent);
check('input is disabled at the end', game.input.enabled === false);

// ---------------------------------------------------------------------------
log('\n[restart]');
document.getElementById('retry-btn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('state back to playing', game.state === 'playing');
check('the key is gone again', game.hasKey === false);
check('the drawer is reset', game.drawer.enabled === true);
check('the lights are back on', game.room.lightsOn === true);
check('the tv is off again', game.room.tvOn === false);
check(
  'the player is back at the spawn',
  Math.abs(game.player.pos.x - 0.2) < 0.01 && Math.abs(game.player.pos.z - 3.0) < 0.01,
  `${game.player.pos.x.toFixed(2)}, ${game.player.pos.z.toFixed(2)}`
);
check('the end screen is gone', game.screens.gameOver.classList.contains('hidden'));
run(game, 60 * 5);
check('no errors after restart', !game.engine._errors, `errors=${game.engine._errors || 0}`);

// ---------------------------------------------------------------------------
log('\n[the room misbehaves on its own]');
let somethingHappened = false;
for (let i = 0; i < 200 && !somethingHappened; i++) {
  game.scareIn = 0.001;
  run(game, 2);
  if (game.room.tvOn || game.room._flicker < 1) somethingHappened = true;
}
check('something happens without being asked', somethingHappened, `tv=${game.room.tvOn} flicker=${game.room._flicker}`);

run(game, 60 * 30); // half a minute of nothing but atmosphere
check('no frame errors after 30s', !game.engine._errors, `errors=${game.engine._errors || 0}`);
check('dust is drifting', game.particles.life.some((l) => l > 0));

// ---------------------------------------------------------------------------
log('\n[sensitivity]');
const sens = document.querySelector('#hud [data-sens]');
sens.value = '2';
sens.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
check('the slider reaches the player', game.player.lookSensitivity === 2, `sens=${game.player.lookSensitivity}`);
check('and the touch controls', game.touch.lookScale === 2, `scale=${game.touch.lookScale}`);
check('it is remembered', localStorage.getItem('hana:sens') === '2');

log(`\n${failures === 0 ? '✓ ALL GAME CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
