import * as THREE from 'three';
import { rayBoxes } from '../world/collision.js';
import { COLORS } from '../fx/Particles.js';

const MAG_SIZE = 14;
const RESERVE_START = 112;
const FIRE_RATE = 0.16; // seconds between shots
const RELOAD_TIME = 1.55;
const DAMAGE = 34;
const HEADSHOT_MULT = 2.6;
const RANGE = 70;

const _v = new THREE.Vector3();
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();

/**
 * A service pistol: hitscan, recoil, a view-model welded to the camera and
 * a magazine that always seems to run dry at the worst moment.
 */
export class Weapon {
  constructor(engine, { arena, horde, player, particles, hud, audio, onHit }) {
    this.engine = engine;
    this.arena = arena;
    this.horde = horde;
    this.player = player;
    this.particles = particles;
    this.hud = hud;
    this.audio = audio || null;
    this.onHit = onHit;
    this.camera = engine.camera;

    this.mag = MAG_SIZE;
    this.reserve = RESERVE_START;
    this.cooldown = 0;
    this.reloading = 0;
    this.shots = 0;
    this.hits = 0;

    this.kick = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.bobT = 0;

    this._build();
    this.refreshHud();
  }

  _build() {
    const metal = new THREE.MeshLambertMaterial({ color: 0x2b2f34, emissive: 0x0a0c0e });
    const grip = new THREE.MeshLambertMaterial({ color: 0x1a1c1e, emissive: 0x070809 });
    const glove = new THREE.MeshLambertMaterial({ color: 0x3d3229, emissive: 0x0a0806 });

    const gun = new THREE.Group();
    gun.position.set(0.19, -0.175, -0.34);
    gun.rotation.set(0, 0.06, 0);

    const add = (w, h, d, x, y, z, mat, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      gun.add(m);
      return m;
    };

    add(0.055, 0.07, 0.3, 0, 0.01, -0.11, metal); // slide
    add(0.045, 0.045, 0.06, 0, 0.005, -0.28, grip); // muzzle
    add(0.05, 0.15, 0.085, 0.004, -0.1, 0.03, grip, -0.28); // grip
    add(0.052, 0.05, 0.07, 0, -0.03, -0.02, metal); // frame
    add(0.02, 0.022, 0.02, 0, 0.055, -0.24, metal); // front sight

    // Two fists. Not anatomically correct. Good enough at 30 fps in the dark.
    add(0.075, 0.085, 0.08, -0.012, -0.115, 0.005, glove, -0.28);
    add(0.08, 0.08, 0.085, 0.03, -0.15, 0.035, glove, -0.28);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.005, -0.32);
    gun.add(this.muzzle);

    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
    );
    this.flash.visible = false;
    this.muzzle.add(this.flash);

    this.flashLight = new THREE.PointLight(0xffcf8a, 90, 16, 2);
    this.flashLight.visible = false;
    this.muzzle.add(this.flashLight);

    this.camera.add(gun);
    this.gun = gun;
    this.basePos = gun.position.clone();

    // Tracers live in world space so they do not inherit camera motion.
    this.tracers = [];
    const tracerGeo = new THREE.BoxGeometry(0.014, 0.014, 1);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(tracerGeo, tracerMat);
      t.visible = false;
      t.frustumCulled = false;
      this.engine.scene.add(t);
      this.tracers.push({ mesh: t, life: 0 });
    }
    this.tracerCursor = 0;
  }

  refreshHud() {
    this.hud.setAmmo(this.mag, MAG_SIZE, this.reserve, this.reloading > 0);
  }

  reset() {
    this.mag = MAG_SIZE;
    this.reserve = RESERVE_START;
    this.cooldown = 0;
    this.reloading = 0;
    this.shots = 0;
    this.hits = 0;
    this.refreshHud();
  }

  addAmmo(n) {
    this.reserve += n;
    this.refreshHud();
  }

  startReload() {
    if (this.reloading > 0 || this.mag >= MAG_SIZE || this.reserve <= 0) return;
    this.reloading = RELOAD_TIME;
    this.audio?.reloadClick(1);
    this.refreshHud();
  }

  _finishReload() {
    const need = MAG_SIZE - this.mag;
    const take = Math.min(need, this.reserve);
    this.mag += take;
    this.reserve -= take;
    this.reloading = 0;
    this.audio?.reloadClick(1.45);
    this.refreshHud();
  }

  _spreadDir(out) {
    this.camera.getWorldDirection(out);
    const planar = Math.hypot(this.player.vel.x, this.player.vel.z);
    let spread = 0.004 + planar * 0.0035;
    if (this.player.exhausted) spread += 0.006;
    out.x += (Math.random() - 0.5) * spread * 2;
    out.y += (Math.random() - 0.5) * spread * 2;
    out.z += (Math.random() - 0.5) * spread * 2;
    return out.normalize();
  }

  _fire() {
    this.mag--;
    this.shots++;
    this.cooldown = FIRE_RATE;
    this.kick = Math.min(1.4, this.kick + 1);
    this.audio?.shot();

    this.player.addRecoil(0.02 + Math.random() * 0.012, (Math.random() - 0.5) * 0.012);

    this.camera.getWorldPosition(_o);
    this._spreadDir(_d);

    const zHit = this.horde.raycast(_o.x, _o.y, _o.z, _d.x, _d.y, _d.z, RANGE);
    const wallHit = rayBoxes(_o.x, _o.y, _o.z, _d.x, _d.y, _d.z, this.arena.colliders, RANGE);

    let end = RANGE;
    let hitZombie = null;
    let head = false;

    if (zHit && (!wallHit || zHit.dist < wallHit.dist)) {
      end = zHit.dist;
      hitZombie = zHit.zombie;
      head = zHit.head;
    } else if (wallHit) {
      end = wallHit.dist;
    }

    _v.copy(_d).multiplyScalar(end).add(_o);
    this._tracer(_o, _v);

    if (hitZombie) {
      this.hits++;
      const dmg = DAMAGE * (head ? HEADSHOT_MULT : 1);
      const killed = hitZombie.hurt(dmg);
      this.particles.burst(
        _v.x,
        _v.y,
        _v.z,
        head ? 16 : 9,
        head ? COLORS.blood : COLORS.bloodDark,
        head ? 4.2 : 2.8,
        1,
        0.55
      );
      this.hud.hitmarker_(killed);
      this.audio?.impactFlesh();
      this.onHit?.(hitZombie, dmg, head, killed);
    } else if (wallHit) {
      this.particles.burst(_v.x, _v.y, _v.z, 5, COLORS.dust, 1.6, 1, 0.35);
      this.particles.burst(_v.x, _v.y, _v.z, 3, COLORS.spark, 2.4, 1, 0.18);
      this.audio?.impactWall();
    }

    this.flash.visible = true;
    this.flashLight.visible = true;
    this._flashTimer = 0.045;
    this.refreshHud();

    if (this.mag === 0) this.startReload();
  }

  _tracer(from, to) {
    const t = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % this.tracers.length;
    const dist = from.distanceTo(to);
    t.mesh.position.copy(from).lerp(to, 0.5);
    t.mesh.lookAt(to);
    t.mesh.scale.set(1, 1, Math.max(0.01, dist));
    t.mesh.visible = true;
    t.life = 0.045;
  }

  update(dt, input) {
    this.cooldown -= dt;

    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this.flash.visible = false;
        this.flashLight.visible = false;
      }
    }

    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
    }

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) this._finishReload();
    } else if (input.firing && this.cooldown <= 0 && this.mag > 0) {
      this._fire();
    } else if (input.firing && this.cooldown <= 0 && this.mag === 0 && this.reserve === 0) {
      this.cooldown = 0.35;
      this.audio?.dryFire();
    }

    if (input.reloadQueued) this.startReload();

    // ---- view-model motion ------------------------------------------------
    this.kick *= Math.exp(-11 * dt);

    const lookMag = Math.hypot(input.look.x, input.look.y);
    this.swayX += (THREE.MathUtils.clamp(input.look.x * 0.0016, -0.05, 0.05) - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (THREE.MathUtils.clamp(input.look.y * 0.0016, -0.05, 0.05) - this.swayY) * Math.min(1, dt * 8);
    if (lookMag < 0.5) {
      this.swayX *= Math.exp(-4 * dt);
      this.swayY *= Math.exp(-4 * dt);
    }

    const planar = Math.hypot(this.player.vel.x, this.player.vel.z);
    this.bobT += dt * planar * 2.1;
    const bobScale = THREE.MathUtils.clamp(planar / 3.7, 0, 1.4);
    const bobX = Math.cos(this.bobT) * 0.014 * bobScale;
    const bobY = Math.sin(this.bobT * 2) * 0.011 * bobScale;

    // Reload animation: gun dips out of frame and comes back.
    let reloadDip = 0;
    let reloadRoll = 0;
    if (this.reloading > 0) {
      const t = 1 - this.reloading / RELOAD_TIME;
      const curve = Math.sin(t * Math.PI);
      reloadDip = -0.16 * curve;
      reloadRoll = 0.9 * curve;
    }

    const g = this.gun;
    g.position.set(
      this.basePos.x + bobX - this.swayX * 0.5,
      this.basePos.y + bobY + reloadDip - this.swayY * 0.35,
      this.basePos.z + this.kick * 0.035
    );
    g.rotation.set(
      -this.kick * 0.22 + reloadRoll + this.swayY * 0.8,
      0.06 - this.swayX * 0.9,
      0.03
    );
  }
}

export { MAG_SIZE, RESERVE_START };
