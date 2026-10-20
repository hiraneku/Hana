/**
 * Headless simulation test — `npm run test:sim`.
 *
 * There is no WebGL context here, so nothing is rendered: this builds the
 * real Room and drives the real Player and Interactables for a few thousand
 * frames. It is the closest thing to a play-test we can run from a terminal.
 *
 * The two things that actually matter on a phone are checked hard:
 *   1. you cannot walk out of the room or into the furniture, and
 *   2. looking is 1:1 — the camera goes exactly as far as the finger went.
 */
import * as THREE from 'three';
import { Room, ROOM_BOUNDS, ROOM_SPAWN } from '../src/world/Room.js';
import { Interactables } from '../src/world/Interactables.js';
import { Hands } from '../src/player/Hands.js';
import { Player } from '../src/player/Player.js';
import { overlapsAny } from '../src/world/collision.js';

const log = (...a) => console.log(...a);
let failures = 0;
function check(name, cond, extra = '') {
  if (cond) log(`  ok   ${name} ${extra}`);
  else {
    failures++;
    log(`  FAIL ${name} ${extra}`);
  }
}

const DT = 1 / 60;
const { W, D } = ROOM_BOUNDS;

// ---------------------------------------------------------------- fakes -----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 140);
camera.rotation.order = 'YXZ';

const hud = {
  setHealth() {},
  setStamina() {},
  damageFlash() {},
  toast() {},
};

const input = {
  look: { x: 0, y: 0 },
  move: { x: 0, y: 0 },
  sprint: false,
  action: false,
  actionPressed: false,
  sample() {},
  endFrame() {
    this.look.x = 0;
    this.look.y = 0;
  },
};

const engine = { camera, scene, isTouch: false, renderer: { domElement: null } };

// ----------------------------------------------------------------- room -----
log('\n[room]');
const room = new Room(scene, { shadows: false });
check('room builds', !!room.group, `${room.group.children.length} meshes`);
check('has colliders', room.colliders.length > 15, `${room.colliders.length} boxes`);
check(
  'one draw call per material',
  room.group.children.length <= Object.keys(room.mat).length,
  `${room.group.children.length} meshes / ${Object.keys(room.mat).length} materials`
);

const spawnClear = !overlapsAny(room.colliders, 0.2, 3.0, 0.36);
check('spawn point is clear of furniture', spawnClear);

// The window must actually see out: nothing solid between the glass and the
// street. Sample a grid over the opening.
let blocked = 0;
for (let x = -3.2; x <= 3.2; x += 0.4) {
  for (let y = 0.4; y <= 2.7; y += 0.3) {
    if (overlapsAny(room.colliders, x, -4.2, 0.05)) blocked++;
  }
}
check('the window is not boarded up by furniture', blocked === 0, `${blocked} blocked samples`);

/**
 * Flood fill the floor on a 10 cm grid and report which cells a walking
 * player can actually stand on. If a hotspot cannot be reached, the game is
 * unwinnable and no amount of looking at the code will show it.
 */
function reachable(room, from, r = 0.36) {
  const step = 0.1;
  const nx = Math.floor((W * 2) / step);
  const nz = Math.floor((D * 2) / step);
  const idx = (i, j) => j * nx + i;
  const toX = (i) => -W + step * (i + 0.5);
  const toZ = (j) => -D + step * (j + 0.5);
  const seen = new Uint8Array(nx * nz);
  const q = [idx(Math.round((from.x + W) / step - 0.5), Math.round((from.z + D) / step - 0.5))];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop();
    const i = c % nx;
    const j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
      const k = idx(ni, nj);
      if (seen[k]) continue;
      if (overlapsAny(room.colliders, toX(ni), toZ(nj), r)) continue;
      seen[k] = 1;
      q.push(k);
    }
  }
  return {
    seen,
    canStand(x, z) {
      const i = Math.round((x + W) / step - 0.5);
      const j = Math.round((z + D) / step - 0.5);
      if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
      return seen[idx(i, j)] === 1;
    },
    /** Is any standing spot within `range` of (x, z) on the floor? */
    near(x, z, range = 1.4) {
      const rad = Math.ceil(range / step);
      const i0 = Math.round((x + W) / step - 0.5);
      const j0 = Math.round((z + D) / step - 0.5);
      for (let i = i0 - rad; i <= i0 + rad; i++) {
        for (let j = j0 - rad; j <= j0 + rad; j++) {
          if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
          if (!seen[idx(i, j)]) continue;
          if (Math.hypot(toX(i) - x, toZ(j) - z) <= range) return true;
        }
      }
      return false;
    },
    get count() {
      let n = 0;
      for (const v of seen) n += v;
      return n;
    },
  };
}

log('\n[reachability]');
const walk = reachable(room, { x: 0.2, z: 3.0 });
check('the spawn is on solid walkable floor', walk.canStand(0.2, 3.0));
const floorPct = Math.round((walk.count / (110 * 90)) * 100);
check('most of the floor is walkable', floorPct > 45, `${floorPct}% of the floor`);
for (const [name, pos] of [
  ['the nightstand drawer', room.drawerPos],
  ['the light switch', room.switchPos],
  ['the television', room.tvPos],
  ['the door', new THREE.Vector3(room.doorX, 1.15, 4.25)],
]) {
  check(`you can walk to ${name}`, walk.near(pos.x, pos.z), `(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`);
}
check('you can reach the window', walk.near(0, -4.0));
check('the bathroom-less far corner is not a trap', walk.near(-5.0, 3.9) || walk.near(5.0, 3.9));

// --------------------------------------------------------------- player -----
log('\n[player]');
const player = new Player(engine, room, input, hud);
player.reset();

// Walk hard into every wall for long enough to cross the room twice.
let escaped = null;
for (let i = 0; i < 2400; i++) {
  const a = (i / 40) * Math.PI * 2;
  input.move.x = Math.cos(a);
  input.move.y = Math.sin(a);
  player.update(DT);
  input.endFrame();
  if (Math.abs(player.pos.x) > W - 0.3 || Math.abs(player.pos.z) > D - 0.3) {
    escaped = { x: player.pos.x, z: player.pos.z };
    break;
  }
}
check(
  'never leaves the room',
  !escaped,
  escaped ? `at (${escaped.x.toFixed(1)}, ${escaped.z.toFixed(1)})` : `rest (${player.pos.x.toFixed(1)}, ${player.pos.z.toFixed(1)})`
);

// And never ends up embedded in the furniture.
player.reset();
let inside = 0;
for (let i = 0; i < 1800; i++) {
  const a = i * 0.037;
  input.move.x = Math.cos(a);
  input.move.y = Math.sin(a);
  player.update(DT);
  input.endFrame();
  if (overlapsAny(room.colliders, player.pos.x, player.pos.z, 0.3)) inside++;
}
check('never clips inside the furniture', inside === 0, `${inside} frames inside geometry`);

// Forward is where the camera is looking: press W and go there.
player.reset();
input.move.x = 0;
input.move.y = 1;
const before = player.pos.clone();
for (let i = 0; i < 60; i++) player.update(DT);
const moved = player.pos.clone().sub(before);
const wanted = player.forward.multiplyScalar(moved.length());
check('W walks towards where you are looking', moved.dot(wanted) > 0, `moved ${moved.length().toFixed(2)}m`);
check('walks at a sane speed', moved.length() > 2 && moved.length() < 5, `${(moved.length() / 1).toFixed(2)} m/s`);

// ----------------------------------------------------------- sensitivity ----
log('\n[looking]');
player.reset();
const yaw0 = player.yaw;
input.look.x = 100; // 100 px of finger
player.update(DT);
const turned = THREE.MathUtils.radToDeg(Math.abs(player.yaw - yaw0));
check('a 100 px drag turns a usable amount', turned > 12 && turned < 25, `${turned.toFixed(1)}°`);

player.reset();
const held = player.yaw;
input.look.x = 0;
player.update(DT);
check('the camera stops dead when the finger stops', player.yaw === held);

// Pitch is clamped, so you cannot look through your own feet.
player.reset();
for (let i = 0; i < 200; i++) {
  input.look.y = -60;
  player.update(DT);
}
check('pitch clamps looking down', player.pitch < Math.PI / 2 + 1e-6, `${THREE.MathUtils.radToDeg(player.pitch).toFixed(0)}°`);
for (let i = 0; i < 400; i++) {
  input.look.y = 60;
  player.update(DT);
}
check('pitch clamps looking up', player.pitch > -Math.PI / 2 - 1e-6, `${THREE.MathUtils.radToDeg(player.pitch).toFixed(0)}°`);

// Sensitivity scales the turn 1:1 — that is the whole point of the slider.
const turnAt = (s) => {
  player.reset();
  player.lookSensitivity = s;
  const from = player.yaw;
  input.look.x = 100;
  player.update(DT);
  input.endFrame();
  return Math.abs(player.yaw - from);
};
const slow = turnAt(0.5);
const fast = turnAt(2);
check('the sensitivity slider scales the turn', Math.abs(fast / slow - 4) < 0.01, `${slow.toFixed(3)} vs ${fast.toFixed(3)} rad`);
player.lookSensitivity = 1;

// -------------------------------------------------------- interactables -----
log('\n[interaction]');
const items = new Interactables();
let used = 0;
// A hotspot on the floor ahead of the spawn, so the numbers below do not
// have to be re-derived if the spawn ever moves.
const lampPos = new THREE.Vector3(ROOM_SPAWN.x + 0.5, 1.2, ROOM_SPAWN.z - 1.0);
const lamp = items.add({
  position: lampPos,
  radius: 2,
  label: () => 'Nyalakan lampu',
  onUse: () => used++,
});
items.add({ position: [-4, 1.2, -4], radius: 1, label: () => 'jauh', onUse: () => used++ });

// Stand at the spawn and look straight at the hotspot.
player.reset();
input.look.x = 0;
input.look.y = 0;
const lookAt = (x, y, z) => {
  const dx = x - player.pos.x;
  const dy = y - player.pos.y;
  const dz = z - player.pos.z;
  player.yaw = Math.atan2(-dx, -dz);
  player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  player.update(DT);
  input.endFrame();
};
lookAt(lampPos.x, lampPos.y, lampPos.z);

let focus = items.update(DT, player, camera);
check('a hotspot you are looking at lights up', focus === lamp, focus ? focus.label() : 'none');
check('it names the action', focus?.label() === 'Nyalakan lampu');

items.use();
check('USE fires the action once', used === 1, `used=${used}`);

// Turn around: the prompt must disappear.
player.yaw += Math.PI;
player.update(DT);
focus = items.update(DT, player, camera);
check('looking away clears the prompt', focus === null);

// The far hotspot cannot be used from across the room.
player.reset();
lookAt(-4, 1.2, -4);
focus = items.update(DT, player, camera);
check('distance is respected', focus === null, focus ? focus.label() : 'none');

// ----------------------------------------------------------------- hands ----
log('\n[hands]');
const hands = new Hands(camera);
check('hands are attached to the camera', camera.children.includes(hands.left) && camera.children.includes(hands.right));
hands.poke();
let bad = 0;
for (let i = 0; i < 240; i++) {
  hands.update(DT, { moving: 1, lookX: 40, lookY: -12 });
  for (const v of [hands.left.position, hands.right.position, hands.left.rotation, hands.right.rotation]) {
    for (const k of ['x', 'y', 'z']) if (!Number.isFinite(v[k])) bad++;
  }
}
check('hands never go NaN', bad === 0, `${bad} bad values`);
check('the reach springs back', hands.reach === 0);

// --------------------------------------------------------------- lights -----
log('\n[lights]');
room.setCeilingLight(true);
room.update(DT);
const on = room.ceilingLight.intensity;
room.setCeilingLight(false);
room.update(DT);
check('the switch kills the practicals', on > 10 && room.ceilingLight.intensity === 0, `${on.toFixed(1)} -> ${room.ceilingLight.intensity}`);

room.setCeilingLight(true);
room.setFlicker(0.2);
room.update(DT);
const dim = room.ceilingLight.intensity;
room.setFlicker(1);
room.update(DT);
check('the flicker dims them', dim < on * 0.4 && room.ceilingLight.intensity > dim, `${dim.toFixed(1)} vs ${on.toFixed(1)}`);

room.setTv(true);
room.update(DT);
check('the tv lights up', room.tvLight.intensity > 0 && room.mat.screen.color.b > 0.2);
room.setTv(false);
room.update(DT);
check('the tv goes dark', room.tvLight.intensity === 0);

// ------------------------------------------------------------------ done ----
log('');
if (failures) {
  log(`  ${failures} CHECK(S) FAILED`);
  process.exit(1);
}
log('  ALL SIMULATION CHECKS PASSED');
