/**
 * End-to-end test — `npm run test:game`.
 *
 * Boots the *actual* Game class under jsdom with a stub renderer: no GPU, but
 * every line of real game code runs — engine, arena, player, horde, weapon,
 * HUD, touch controls, wave director. It then plays the game the way a phone
 * would: tap start, drag the sticks, hold the trigger, and check that the
 * world reacts.
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
global.matchMedia = () => ({ matches: true });

const W = 800;
const H = 400;
dom.window.innerWidth = W;
dom.window.innerHeight = H;

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

run(game, 30);
check('still no frame errors', !game.engine._errors, `errors=${game.engine._errors || 0}`);

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
log('\n[look: drag the right stick]');
const yaw0 = game.player.yaw;
fire('pointerdown', 700, 200, { id: 2 });
check('look stick active', game.touch.lookStick.classList.contains('active'));
fire('pointermove', 780, 200, { id: 2 }); // drag right
check('lookAxis turns right', game.input.lookAxis.x > 0.8, `x=${game.input.lookAxis.x.toFixed(2)}`);
run(game, 60);
check('camera yaw changed', Math.abs(game.player.yaw - yaw0) > 0.5, `${yaw0.toFixed(2)} -> ${game.player.yaw.toFixed(2)}`);
fire('pointerup', 780, 200, { id: 2 });
check('look released', game.input.lookAxis.x === 0);

// ---------------------------------------------------------------------------
log('\n[shoot: hold the trigger]');
game.weapon.mag = 14;
const mag0 = game.weapon.mag;
const fireBtn = document.getElementById('btn-fire');
fire('pointerdown', 0, 0, { id: 3, target: fireBtn });
check('trigger held', game.input.touchFiring === true);
run(game, 30);
check('rounds were spent', game.weapon.mag < mag0, `${mag0} -> ${game.weapon.mag}`);
fire('pointerup', 0, 0, { id: 3, target: fireBtn });
check('trigger released', game.input.touchFiring === false);

// ---------------------------------------------------------------------------
log('\n[waves spawn and the horde closes in]');
run(game, 60 * 20); // 20 seconds
check('zombies spawned', game.horde.aliveCount > 0, `alive=${game.horde.aliveCount}`);
check('wave counter advanced', game.wave >= 1, `wave=${game.wave}`);
check('no frame errors after 20s', !game.engine._errors, `errors=${game.engine._errors || 0}`);

const nearest = game._nearestThreat();
check('threat tracking works', !!nearest, nearest ? `dist=${nearest.dist.toFixed(1)}m` : 'none');

// ---------------------------------------------------------------------------
log('\n[death flow]');
game.player.damage(999);
check('death handler fired', game.state === 'dying');
check('touch hidden on death', !game.touch.visible);
run(game, 60 * 3);
check('game over screen shown', !game.screens.gameOver.classList.contains('hidden'));
check('state is dead', game.state === 'dead');

// ---------------------------------------------------------------------------
log('\n[restart]');
document.getElementById('retry-btn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
check('state back to playing', game.state === 'playing');
check('health restored', game.player.health === 100, `hp=${game.player.health}`);
check('horde cleared', game.horde.aliveCount === 0);
run(game, 60 * 5);
check('no errors after restart', !game.engine._errors, `errors=${game.engine._errors || 0}`);

log(`\n${failures === 0 ? '✓ ALL GAME CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
