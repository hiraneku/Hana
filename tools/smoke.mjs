/**
 * Headless simulation test — `npm run test:sim`.
 *
 * There is no WebGL context here, so nothing is rendered: this drives the
 * actual game modules (arena, player, horde, weapon, particles) for a few
 * thousand frames and asserts that the simulation behaves. It is the closest
 * thing to a play-test we can run from a terminal.
 */
import * as THREE from 'three';
import { Arena } from '../src/world/Arena.js';
import { Player } from '../src/player/Player.js';
import { Horde } from '../src/entities/Horde.js';
import { Particles, COLORS } from '../src/fx/Particles.js';
import { Weapon } from '../src/weapons/Weapon.js';

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

// ---------------------------------------------------------------- fakes -----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 140);
const engine = { scene, camera, isTouch: false };

const hudCalls = { hitmarker: 0, kills: 0 };
const hud = {
  setHealth() {},
  setStamina() {},
  setAmmo() {},
  setWave() {},
  setScore() {},
  banner_() {},
  hitmarker_(isKill) {
    hudCalls.hitmarker++;
    if (isKill) hudCalls.kills++;
  },
  damageFlash() {},
  update() {},
};

const input = {
  move: { x: 0, y: 0 },
  look: { x: 0, y: 0 },
  lookAxis: { x: 0, y: 0 },
  firing: false,
  sprint: false,
  reloadQueued: false,
};

// ---------------------------------------------------------------- setup -----
const arena = new Arena(scene, { shadows: false, maxLamps: 3 });
const player = new Player(engine, arena, input, hud);
const particles = new Particles(scene, 120);
const horde = new Horde(scene, arena, { max: 30 });

let killCount = 0;
let headshots = 0;
const weapon = new Weapon(engine, {
  arena,
  horde,
  player,
  particles,
  hud,
  onHit: (z, dmg, head, killed) => {
    if (head) headshots++;
    if (killed) killCount++;
  },
});

/** Distance from a point to the nearest collider (0 = inside one). */
function clearance(x, z) {
  let best = Infinity;
  for (const b of arena.colliders) {
    const dx = Math.max(b.minX - x, 0, x - b.maxX);
    const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

/** Point the camera at a world position. */
function aimAt(x, y, z) {
  const dir = new THREE.Vector3(x, y, z).sub(player.pos).normalize();
  player.yaw = Math.atan2(-dir.x, -dir.z);
  player.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  player.recoilPitch = 0;
  player.recoilYaw = 0;
  player.update(0.0001);
}

// ---------------------------------------------------------------- arena -----
log('\n[arena]');
check('colliders built', arena.colliders.length > 40, `(${arena.colliders.length})`);
check('spawn points', arena.spawnPoints.length >= 10, `(${arena.spawnPoints.length})`);
check('lamps limited to budget', arena.lamps.filter((l) => l.light).length === 3);

const blocked = arena.spawnPoints.filter((p) => clearance(p.x, p.z) < 0.6);
check('every spawn point is clear of geometry', blocked.length === 0, `blocked=${blocked.length}`);

const sp = arena.pickSpawn(new THREE.Vector3(0, 0, 9), 20);
check('pickSpawn keeps its distance', sp.distanceTo(new THREE.Vector3(0, 0, 9)) >= 20, `d=${sp.distanceTo(new THREE.Vector3(0, 0, 9)).toFixed(1)}m`);

// --------------------------------------------------------------- player -----
log('\n[player]');
check('spawn is on open ground', clearance(player.pos.x, player.pos.z) > 0.8, `clearance=${clearance(player.pos.x, player.pos.z).toFixed(2)}m`);

const startPos = player.pos.clone();
input.move.y = 1;
for (let i = 0; i < 120; i++) player.update(DT);
input.move.y = 0;
check('walks forward ~6m in 2s', startPos.distanceTo(player.pos) > 5.5, `${startPos.distanceTo(player.pos).toFixed(2)}m`);

// Sprint into a wall and make sure we come to a dead stop, not a crawl.
player.reset();
player.yaw = Math.PI; // face +Z, straight at the container line
input.move.y = 1;
input.sprint = true;
for (let i = 0; i < 900; i++) player.update(DT);
const settled = player.pos.clone();
for (let i = 0; i < 60; i++) player.update(DT);
input.move.y = 0;
input.sprint = false;
check('walls bring the player to a full stop', settled.distanceTo(player.pos) < 0.02, `drift=${settled.distanceTo(player.pos).toFixed(4)}m`);
check('stopped inside the yard', Math.abs(player.pos.z) < 31.5, `z=${player.pos.z.toFixed(2)}`);

// Sprint at the world from 8 directions: nothing may leak through a seam.
let escaped = null;
for (let dir = 0; dir < 8 && !escaped; dir++) {
  player.reset();
  player.yaw = (dir / 8) * Math.PI * 2;
  input.move.y = 1;
  input.sprint = true;
  for (let i = 0; i < 900; i++) {
    player.update(DT);
    if (Math.abs(player.pos.x) > 31.9 || Math.abs(player.pos.z) > 31.9) {
      escaped = player.pos.clone();
      break;
    }
  }
}
input.move.y = 0;
input.sprint = false;
check('never escapes the yard from any direction', !escaped, escaped ? `at (${escaped.x.toFixed(1)}, ${escaped.z.toFixed(1)})` : '');

player.reset();
player.damage(40);
check('damage applied', player.health === 60, `hp=${player.health}`);
player.heal(10);
check('heal applied', player.health === 70, `hp=${player.health}`);
player.damage(999);
check('death fires at 0 hp', player.alive === false && player.health === 0);

// ---------------------------------------------------------------- horde -----
log('\n[horde]');
player.reset();
horde.clear();
const ctx = { player, horde, arena, particles, colors: COLORS };

// Ring of walkers 9m out in eight directions.
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const z = horde._obtain();
  z.spawn(player.pos.x + Math.cos(a) * 9, player.pos.z + Math.sin(a) * 9, 1);
  horde.active.push(z);
}
check('8 spawned', horde.aliveCount === 8, `alive=${horde.aliveCount}`);

const d0 = horde.active.map((z) => z.pos.distanceTo(player.pos));
for (let i = 0; i < 900; i++) horde.update(DT, ctx); // 15s
const d1 = horde.active.map((z) => z.pos.distanceTo(player.pos));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
check('the horde closes in', avg(d1) < 2.6, `avg ${avg(d0).toFixed(1)}m -> ${avg(d1).toFixed(1)}m`);
check('every walker reached the player', d1.every((d) => d < 3.2), `worst=${Math.max(...d1).toFixed(1)}m`);
check('player took damage', player.health < 100, `hp=${player.health.toFixed(0)}`);

const stuck = horde.active.filter((z) => clearance(z.pos.x, z.pos.z) < 0.3);
check('nobody ended up inside geometry', stuck.length === 0, `stuck=${stuck.length}`);

// --------------------------------------------------------------- weapon -----
log('\n[weapon]');
player.reset();
horde.clear();

const near = horde._obtain();
near.spawn(player.pos.x, player.pos.z - 6, 1);
horde.active.push(near);
aimAt(near.pos.x, 1.2 * near.scale, near.pos.z);

const hpBefore = near.hp;
weapon.cooldown = 0;
weapon._fire();
check('body shot hits', near.hp < hpBefore, `${hpBefore} -> ${near.hp.toFixed(0)}`);
check('hitmarker shown', hudCalls.hitmarker > 0);

// One magazine should be enough to put a wave-1 walker down.
let shots = 0;
while (!near.isCorpse && shots < 12) {
  weapon.cooldown = 0;
  weapon.mag = 5;
  weapon._fire();
  shots++;
}
check('walker dies in a sane number of body shots', near.isCorpse && shots <= 3, `${shots} shots`);
check('kill was reported', killCount > 0, `kills=${killCount}`);

// Headshot: aim at the skull.
horde.clear();
const head = horde._obtain();
head.spawn(player.pos.x, player.pos.z - 6, 1);
horde.active.push(head);
for (let i = 0; i < 120; i++) horde.update(DT, ctx); // let it settle
aimAt(head.pos.x, 1.78 * head.scale, head.pos.z);
const hpHead = head.hp;
weapon.cooldown = 0;
weapon.mag = 5;
weapon._fire();
check('headshot lands', head.hp < hpHead && headshots > 0, `${hpHead} -> ${head.hp.toFixed(0)}, headshots=${headshots}`);

// Cover: a container between shooter and target must eat the bullet.
horde.clear();
player.pos.set(2, 1.68, 26);
const behind = horde._obtain();
behind.spawn(2, 18, 1);
horde.active.push(behind);
const markersBefore = hudCalls.hitmarker;
aimAt(behind.pos.x, 1.2, behind.pos.z);
weapon.cooldown = 0;
weapon.mag = 5;
weapon._fire();
check('bullets do not shoot through walls', hudCalls.hitmarker === markersBefore, `hp=${behind.hp}`);

// ---------------------------------------------------------- ammo/reload -----
log('\n[reload]');
player.reset();
weapon.reset();
const reserveBefore = weapon.reserve;
weapon.mag = 3;
weapon.startReload();
for (let i = 0; i < 120; i++) weapon.update(DT, input);
check('magazine refilled', weapon.mag === 14, `mag=${weapon.mag}`);
check('reserve consumed by exactly the gap', weapon.reserve === reserveBefore - 11, `reserve=${weapon.reserve}`);

weapon.reserve = 0;
weapon.mag = 0;
weapon.startReload();
weapon.update(DT, input);
check('cannot reload on an empty reserve', weapon.reloading === 0 && weapon.mag === 0);

// -------------------------------------------------------------- long run -----
log('\n[endurance — 3000 frames, waves 1..24]');
horde.clear();
weapon.reset();
player.reset();
killCount = 0;
const t0 = Date.now();
let spawned = 0;
for (let frame = 0; frame < 3000; frame++) {
  const wave = 1 + Math.floor(frame / 125);
  if (frame % 6 === 0 && horde.aliveCount < 26) {
    horde.spawnAt(arena.pickSpawn(player.pos, 18), wave);
    spawned++;
  }
  input.move.x = Math.sin(frame / 40);
  input.move.y = Math.cos(frame / 55);
  input.look.x = Math.sin(frame / 30) * 6;
  input.sprint = Math.sin(frame / 90) > 0;
  player.update(DT);
  horde.update(DT, ctx);
  weapon.update(DT, input);
  particles.update(DT);
  arena.update(DT);
  if (frame % 4 === 0) {
    weapon.cooldown = 0;
    if (weapon.mag > 0) weapon._fire();
    else weapon.startReload();
  }
}
const ms = Date.now() - t0;
check('survived 3000 frames', true, `${ms}ms (${(ms / 3000).toFixed(3)}ms/frame), ${spawned} spawned`);
check('kills happened over the run', killCount > 0, `kills=${killCount}`);
check('pool respected its cap', horde.pool.length <= 30, `pool=${horde.pool.length}`);
check('player stayed inside the yard', Math.abs(player.pos.x) < 32 && Math.abs(player.pos.z) < 32, `(${player.pos.x.toFixed(1)}, ${player.pos.z.toFixed(1)})`);
check('player position finite', Number.isFinite(player.pos.x) && Number.isFinite(player.pos.z));
check('no NaN zombies', horde.active.every((z) => Number.isFinite(z.pos.x) && Number.isFinite(z.pos.z)));
check('no NaN particles', Array.from(particles.pos).every(Number.isFinite));

log(`\n${failures === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
