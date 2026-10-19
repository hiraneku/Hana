import * as THREE from 'three';
import { resolveCircle } from '../world/collision.js';

const EYE = 1.68;
const RADIUS = 0.36;
// Open ground near the middle of the yard, looking north into the fog.
const SPAWN = { x: 0, z: 9, yaw: 0 };
const WALK = 3.7;
const SPRINT = 6.4;
const ACCEL = 16; // exponential smoothing rate
const MOUSE_SENS = 0.0023; // radians per pixel
const TOUCH_TURN = 2.7; // radians per second at full stick
const PITCH_LIMIT = THREE.MathUtils.degToRad(85);
const MAX_HEALTH = 100;
const STAMINA_MAX = 4.5;

/**
 * First-person controller: look, run, bump into walls, bleed.
 * Works identically with mouse+keyboard and with the on-screen sticks.
 */
export class Player {
  constructor(engine, arena, input, hud) {
    this.engine = engine;
    this.arena = arena;
    this.input = input;
    this.hud = hud;

    this.camera = engine.camera;
    this.camera.rotation.order = 'YXZ';
    engine.scene.add(this.camera);

    this.pos = new THREE.Vector3(SPAWN.x, EYE, SPAWN.z);
    this.vel = new THREE.Vector3();
    this.yaw = SPAWN.yaw;
    this.pitch = 0;

    this.health = MAX_HEALTH;
    this.stamina = STAMINA_MAX;
    this.exhausted = false;
    this.alive = true;
    this.dying = 0;

    this.bob = 0;
    this.shake = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.torchTimer = 1;
    this.torchDip = 0;

    this.onDeath = null;

    this._buildFlashlight();
    this.hud.setHealth(this.health, MAX_HEALTH);
  }

  _buildFlashlight() {
    // A tight, warm cone with a soft edge and a fairly steep falloff so the
    // beam has a real shape: bright at your feet, swallowed by the dark a few
    // metres out. (An earlier version added a fake volumetric cone mesh — it
    // read as a glowing triangle pasted over the screen, so it is gone.)
    const light = new THREE.SpotLight(0xffe9c4, 190, 52, 0.52, 0.72, 1.5);
    light.position.set(0.14, -0.12, 0.05);
    const target = new THREE.Object3D();
    target.position.set(0, -0.05, -1);
    this.camera.add(light);
    this.camera.add(target);
    light.target = target;
    this.flashlight = light;
    this.flashBase = 190;
  }

  /** Dying-battery flicker for the torch. */
  _flickerTorch(dt) {
    this.torchTimer -= dt;
    if (this.torchTimer <= 0) {
      this.torchTimer = 0.35 + Math.random() * 2.6;
      this.torchDip = Math.random() < 0.3 ? 0.2 + Math.random() * 0.5 : 0;
    }
    if (this.torchDip > 0) this.torchDip -= dt;
    const dip = this.torchDip > 0 ? 0.45 : 1;
    const hum = 0.94 + 0.06 * Math.sin(this.bob * 0.7);
    this.flashlight.intensity = this.flashBase * dip * hum;
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  reset() {
    this.pos.set(SPAWN.x, EYE, SPAWN.z);
    this.vel.set(0, 0, 0);
    this.yaw = SPAWN.yaw;
    this.pitch = 0;
    this.health = MAX_HEALTH;
    this.stamina = STAMINA_MAX;
    this.exhausted = false;
    this.alive = true;
    this.dying = 0;
    this.shake = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.flashlight.intensity = 150;
    this.hud.setHealth(this.health, MAX_HEALTH);
  }

  damage(amount) {
    if (!this.alive) return;
    this.health -= amount;
    this.shake = Math.min(1.2, this.shake + amount / 28);
    this.hud.damageFlash(Math.min(0.9, amount / 45));
    this.onHurt?.(amount);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.hud.damageFlash(1);
      this.onDeath?.();
    }
    this.hud.setHealth(this.health, MAX_HEALTH);
  }

  heal(amount) {
    this.health = Math.min(MAX_HEALTH, this.health + amount);
    this.hud.setHealth(this.health, MAX_HEALTH);
  }

  /** Recoil kick handled by the weapon, applied on top of the look angles. */
  addRecoil(pitch, yaw = 0) {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
  }

  update(dt) {
    const input = this.input;

    // ---- look -------------------------------------------------------------
    this.yaw -= input.look.x * MOUSE_SENS;
    this.pitch -= input.look.y * MOUSE_SENS;
    this.yaw -= input.lookAxis.x * TOUCH_TURN * dt;
    this.pitch += input.lookAxis.y * TOUCH_TURN * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -PITCH_LIMIT, PITCH_LIMIT);

    // Recoil springs back to zero.
    this.recoilPitch *= Math.exp(-9 * dt);
    this.recoilYaw *= Math.exp(-9 * dt);

    // ---- move -------------------------------------------------------------
    let mx = input.move.x;
    let my = input.move.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    const moving = mag > 0.08 && this.alive;
    let sprinting = false;
    if (moving && input.sprint) {
      if (this.exhausted) {
        if (this.stamina > STAMINA_MAX * 0.35) this.exhausted = false;
      } else {
        sprinting = this.stamina > 0;
      }
    }

    if (sprinting) {
      this.stamina -= dt;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.exhausted = true;
        sprinting = false;
      }
    } else {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + dt * 0.55);
    }
    this.hud.setStamina(this.stamina / STAMINA_MAX, this.exhausted);

    // Heavy breathing when you are out of puff.
    const speed = (sprinting ? SPRINT : WALK) * (this.exhausted ? 0.78 : 1);
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;
    const targetX = (fx * my + rx * mx) * speed;
    const targetZ = (fz * my + rz * mx) * speed;

    const k = 1 - Math.exp(-ACCEL * dt);
    this.vel.x += (targetX - this.vel.x) * k;
    this.vel.z += (targetZ - this.vel.z) * k;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    const res = resolveCircle(this.arena.colliders, this.pos.x, this.pos.z, RADIUS);
    if (res.hit) {
      this.pos.x = res.x;
      this.pos.z = res.z;
    }

    // ---- head bob ---------------------------------------------------------
    const planar = Math.hypot(this.vel.x, this.vel.z);
    this.bob += dt * planar * 2.1;
    const bobScale = THREE.MathUtils.clamp(planar / WALK, 0, 1.4);
    const bobY = Math.sin(this.bob * 2) * 0.042 * bobScale;
    const bobX = Math.cos(this.bob) * 0.02 * bobScale;
    const roll = Math.sin(this.bob) * 0.013 * bobScale;

    // ---- death camera -----------------------------------------------------
    let eye = EYE + bobY;
    let deathRoll = roll;
    if (!this.alive) {
      this.dying = Math.min(1, this.dying + dt * 0.8);
      const t = this.dying;
      eye = EYE + bobY - t * 1.25;
      deathRoll = roll + t * 0.75;
    }

    // ---- trauma shake -----------------------------------------------------
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const s = this.shake * this.shake;
    const sx = (Math.random() - 0.5) * s * 0.25;
    const sy = (Math.random() - 0.5) * s * 0.25;

    this.camera.position.set(this.pos.x + bobX + sx, eye + sy, this.pos.z);
    this.camera.rotation.set(
      this.pitch + this.recoilPitch,
      this.yaw + this.recoilYaw,
      deathRoll
    );

    this._flickerTorch(dt);

    // The weapon raycast reads the camera's world transform during the very
    // same frame, before the renderer gets a chance to refresh it.
    this.camera.updateMatrixWorld(true);
  }
}

export { MAX_HEALTH };
