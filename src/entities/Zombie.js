import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { resolveCircle, overlapsAny } from '../world/collision.js';

const SKIN = new THREE.Color(0x7c8a6b);
const CLOTH = new THREE.Color(0x33383a);
const CLOTH2 = new THREE.Color(0x4a3b33);
const DARK = new THREE.Color(0x1b1f21);

/** Attach a flat vertex colour to a geometry so every part can share one material. */
function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function part(pieces) {
  return mergeGeometries(
    pieces.map(([w, h, d, x, y, z, c]) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(x, y, z);
      return paint(g, c);
    }),
    false
  );
}

// Built once, shared by every zombie: 3 geometries × N instances.
const GEO = {
  // torso, head, neck, shoulders — baked at standing height
  body: part([
    [0.52, 0.62, 0.32, 0, 1.22, 0, CLOTH2],
    [0.56, 0.16, 0.34, 0, 1.47, 0, CLOTH],
    [0.15, 0.1, 0.15, 0, 1.58, 0, SKIN],
    [0.3, 0.33, 0.29, 0, 1.75, 0, SKIN],
  ]),
  // hangs down from the shoulder pivot
  arm: part([
    [0.16, 0.34, 0.16, 0, -0.18, 0, CLOTH],
    [0.14, 0.32, 0.14, 0, -0.51, 0, SKIN],
    [0.15, 0.15, 0.16, 0, -0.73, 0, SKIN],
  ]),
  // hangs down from the hip pivot
  leg: part([
    [0.19, 0.5, 0.21, 0, -0.26, 0, CLOTH],
    [0.17, 0.42, 0.19, 0, -0.72, 0, DARK],
    [0.2, 0.11, 0.3, 0, -0.93, -0.05, DARK],
  ]),
};

const BASE_MAT = new THREE.MeshLambertMaterial({
  vertexColors: true,
  emissive: new THREE.Color(0x120203),
});

const TYPES = {
  walker: { hp: 60, speed: [1.15, 1.7], damage: 11, scale: 1, score: 100 },
  runner: { hp: 38, speed: [2.7, 3.5], damage: 9, scale: 0.95, score: 140 },
  brute: { hp: 190, speed: [0.95, 1.25], damage: 26, scale: 1.3, score: 220 },
};

let NEXT_ID = 1;

export class Zombie {
  constructor(scene) {
    this.id = NEXT_ID++;
    this.scene = scene;

    this.material = BASE_MAT.clone();
    this.group = new THREE.Group();
    this.group.visible = false;

    this.body = new THREE.Mesh(GEO.body, this.material);
    this.armL = new THREE.Mesh(GEO.arm, this.material);
    this.armR = new THREE.Mesh(GEO.arm, this.material);
    this.legL = new THREE.Mesh(GEO.leg, this.material);
    this.legR = new THREE.Mesh(GEO.leg, this.material);

    this.armL.position.set(-0.33, 1.47, 0);
    this.armR.position.set(0.33, 1.47, 0);
    this.legL.position.set(-0.15, 0.9, 0);
    this.legR.position.set(0.15, 0.9, 0);

    for (const m of [this.body, this.armL, this.armR, this.legL, this.legR]) {
      m.castShadow = true;
      this.group.add(m);
    }
    scene.add(this.group);

    this.pos = new THREE.Vector3();
    this.active = false;
    this.state = 'walk';
    this.hp = 0;
    this.maxHp = 1;
    this.speed = 1.4;
    this.damage = 10;
    this.phase = Math.random() * 10;
    this.attackTimer = 0;
    this.attackAnim = 0;
    this.hitFlash = 0;
    this.deadTimer = 0;
    this.fallSign = 1;
    this.strafe = 1;
    this.blocked = 0;
    this.probe = 0;
    this.steerX = 0;
    this.steerZ = 0;
    this.stallTimer = 0;
    this.lastDist = Infinity;
    this.yaw = 0;
    this.type = 'walker';
    this.scoreValue = 100;
    this.growl = 0;
  }

  /** @param {number} wave used to scale the horde up over time */
  spawn(x, z, wave) {
    const roll = Math.random();
    let type = 'walker';
    if (wave >= 6 && roll > 0.92) type = 'brute';
    else if (wave >= 3 && roll > 0.82) type = 'runner';

    const t = TYPES[type];
    this.type = type;
    this.maxHp = Math.round(t.hp * (1 + (wave - 1) * 0.09));
    this.hp = this.maxHp;
    this.speed = THREE.MathUtils.lerp(t.speed[0], t.speed[1], Math.random()) * (1 + (wave - 1) * 0.012);
    this.damage = t.damage * (1 + (wave - 1) * 0.05);
    this.scale = t.scale * (0.94 + Math.random() * 0.12);
    this.scoreValue = t.score;

    this.pos.set(x, 0, z);
    this.group.position.set(x, 0, z);
    this.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
    this.group.scale.setScalar(this.scale);
    this.yaw = this.group.rotation.y;
    this.state = 'walk';
    this.attackTimer = 0.6;
    this.attackAnim = 0;
    this.hitFlash = 0;
    this.deadTimer = 0;
    this.blocked = 0;
    this.probe = 0;
    this.steerX = 0;
    this.steerZ = 0;
    this.stallTimer = 0;
    this.lastDist = Infinity;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.growl = 1 + Math.random() * 6;
    this.active = true;
    this.group.visible = true;

    this.armL.rotation.set(1.15, 0, 0.12);
    this.armR.rotation.set(1.15, 0, -0.12);
    this.legL.rotation.set(0, 0, 0);
    this.legR.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.material.emissive.setHex(0x120203);
  }

  retire() {
    this.active = false;
    this.group.visible = false;
  }

  /** @returns {boolean} true if this hit killed it */
  hurt(amount) {
    if (this.state === 'dead') return false;
    this.hp -= amount;
    this.hitFlash = 0.16;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deadTimer = 0;
      this.fallSign = Math.random() < 0.5 ? 1 : -1;
      return true;
    }
    return false;
  }

  get isCorpse() {
    return this.state === 'dead';
  }

  /** Axis-aligned hit volumes used by hitscan weapons. */
  bodyBox(out) {
    out.minX = this.pos.x - 0.34 * this.scale;
    out.maxX = this.pos.x + 0.34 * this.scale;
    out.minY = 0.1;
    out.maxY = 1.55 * this.scale;
    out.minZ = this.pos.z - 0.3 * this.scale;
    out.maxZ = this.pos.z + 0.3 * this.scale;
    return out;
  }

  headBox(out) {
    const s = this.scale;
    out.minX = this.pos.x - 0.19 * s;
    out.maxX = this.pos.x + 0.19 * s;
    out.minY = 1.56 * s;
    out.maxY = 1.94 * s;
    out.minZ = this.pos.z - 0.19 * s;
    out.maxZ = this.pos.z + 0.19 * s;
    return out;
  }

  update(dt, ctx) {
    const { player, horde, arena, particles } = ctx;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.material.emissive.setHex(this.hitFlash > 0 ? 0x5a0d10 : 0x120203);
    }

    // ---- corpses just lie there ------------------------------------------
    if (this.state === 'dead') {
      this.deadTimer += dt;
      const t = Math.min(1, this.deadTimer / 0.5);
      const ease = 1 - Math.pow(1 - t, 3);
      this.group.rotation.x = this.fallSign * (Math.PI / 2) * ease * 0.96;
      this.group.rotation.z = Math.sin(this.deadTimer * 2) * 0.04 * (1 - t);
      return;
    }

    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 0.0001;

    // ---- steering ---------------------------------------------------------
    let dirX = dx / dist;
    let dirZ = dz / dist;

    // Keep some personal space so the horde spreads into a wall of bodies.
    let sepX = 0;
    let sepZ = 0;
    for (const o of horde.active) {
      if (o === this || o.state === 'dead') continue;
      const ox = this.pos.x - o.pos.x;
      const oz = this.pos.z - o.pos.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > 1.05 * 1.05 || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const w = (1.05 - d) / 1.05;
      sepX += (ox / d) * w;
      sepZ += (oz / d) * w;
    }

    // If we have not made progress for a while, walk around the other way.
    this.stallTimer += dt;
    if (this.stallTimer > 1.5) {
      if (this.lastDist - dist < 1.2) this.strafe *= -1;
      this.lastDist = dist;
      this.stallTimer = 0;
    }

    // Poor man's pathfinding: feel a step ahead with a whisker and, if
    // something is in the way, slide along it. Re-probed a few times a
    // second — often enough to matter, rarely enough to be free.
    const radius = 0.42 * this.scale;
    this.probe -= dt;
    if (this.probe <= 0) {
      this.probe = 0.12;
      const look = 1.25;
      const ax = this.pos.x + (dirX + sepX * 1.35) * look;
      const az = this.pos.z + (dirZ + sepZ * 1.35) * look;

      if (overlapsAny(arena.colliders, ax, az, radius)) {
        let tx = -dirZ * this.strafe;
        let tz = dirX * this.strafe;
        if (overlapsAny(arena.colliders, this.pos.x + tx * look, this.pos.z + tz * look, radius)) {
          this.strafe *= -1;
          tx = -tx;
          tz = -tz;
        }
        this.steerX = tx * 1.2;
        this.steerZ = tz * 1.2;
      } else {
        this.steerX = 0;
        this.steerZ = 0;
      }
    }
    if (this.blocked > 0) this.blocked -= dt;

    let mx = dirX + sepX * 1.35 + this.steerX;
    let mz = dirZ + sepZ * 1.35 + this.steerZ;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;

    // ---- attack -----------------------------------------------------------
    this.attackTimer -= dt;
    const reach = 1.75 + this.scale * 0.25;
    if (dist < reach && this.attackTimer <= 0 && player.alive) {
      this.attackTimer = 1.05 + Math.random() * 0.35;
      this.attackAnim = 1;
      player.damage(this.damage);
      particles?.burst(
        player.pos.x + (Math.random() - 0.5) * 0.4,
        1.3,
        player.pos.z + (Math.random() - 0.5) * 0.4,
        6,
        ctx.colors.blood,
        2.2,
        1,
        0.4
      );
    }

    // ---- locomotion --------------------------------------------------------
    const slowed = this.attackAnim > 0.6 ? 0.25 : 1;
    const step = this.speed * slowed * dt;

    const beforeX = this.pos.x;
    this.pos.x += mx * step;
    let res = resolveCircle(arena.colliders, this.pos.x, this.pos.z, 0.42 * this.scale);
    if (res.hit) {
      this.pos.x = res.x;
      if (Math.abs(this.pos.x - beforeX) < step * 0.4) this.blocked = 0.45;
    }

    const beforeZ = this.pos.z;
    this.pos.z += mz * step;
    res = resolveCircle(arena.colliders, this.pos.x, this.pos.z, 0.42 * this.scale);
    if (res.hit) {
      this.pos.z = res.z;
      if (Math.abs(this.pos.z - beforeZ) < step * 0.4) this.blocked = 0.45;
    }

    // ---- facing ------------------------------------------------------------
    const want = Math.atan2(-mx, -mz);
    let diff = want - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * 7);

    // ---- animation ---------------------------------------------------------
    const moving = dist > reach * 0.85;
    this.phase += dt * (moving ? this.speed * 3.1 : 1.2);
    const swing = Math.sin(this.phase);

    if (this.attackAnim > 0) this.attackAnim = Math.max(0, this.attackAnim - dt * 2.4);
    const punch = Math.sin(this.attackAnim * Math.PI);

    this.legL.rotation.x = moving ? swing * 0.55 : swing * 0.06;
    this.legR.rotation.x = moving ? -swing * 0.55 : -swing * 0.06;

    const reachFwd = 1.15 + Math.sin(this.phase * 0.7) * 0.08;
    this.armL.rotation.x = reachFwd - punch * 0.85 + (moving ? swing * 0.12 : 0);
    this.armR.rotation.x = reachFwd - punch * 0.85 - (moving ? swing * 0.12 : 0);
    this.armL.rotation.z = 0.12 - punch * 0.25;
    this.armR.rotation.z = -0.12 + punch * 0.25;

    this.body.rotation.x = 0.1 + punch * 0.35;
    this.body.rotation.z = swing * 0.05;
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.045;

    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.set(0, this.yaw, 0);

    // Cheap LOD: skip animation work for anything the fog has already eaten.
    this.group.visible = dist < 52;
  }
}

export { TYPES };
