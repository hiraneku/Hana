import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { HUD } from './ui/HUD.js';
import { Screens } from './ui/Screens.js';
import { TouchControls } from './ui/TouchControls.js';
import { Arena } from './world/Arena.js';
import { Player } from './player/Player.js';
import { Horde } from './entities/Horde.js';
import { Particles, COLORS } from './fx/Particles.js';
import { Weapon } from './weapons/Weapon.js';

const WAVE_BREAK = 6; // seconds of breathing room between waves

class Game {
  constructor() {
    const app = document.getElementById('app');
    this.engine = new Engine(app);
    const isTouch = this.engine.isTouch;

    this.arena = new Arena(this.engine.scene, {
      shadows: !isTouch,
      maxLamps: isTouch ? 3 : 5,
    });

    this.input = new Input(this.engine.renderer.domElement);
    this.hud = new HUD();
    this.touch = new TouchControls(this.input, isTouch);
    this.particles = new Particles(this.engine.scene, isTouch ? 220 : 380);

    this.player = new Player(this.engine, this.arena, this.input, this.hud);
    this.horde = new Horde(this.engine.scene, this.arena, { max: isTouch ? 26 : 40 });

    this.weapon = new Weapon(this.engine, {
      arena: this.arena,
      horde: this.horde,
      player: this.player,
      particles: this.particles,
      hud: this.hud,
      onHit: (z, dmg, head, killed) => this._onHit(z, dmg, head, killed),
    });

    this.screens = new Screens({ onStart: () => this.start() });

    this.state = 'menu'; // menu | playing | dying | dead
    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.waveBreak = 0;
    this.maxAlive = 10;
    this.deathTimer = 0;

    this.player.onDeath = () => this._onDeath();

    this.engine.add({ update: (dt) => this.update(dt) });
    this.engine.start();

    // Desktop: clicking the canvas re-captures the mouse.
    this.engine.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'playing' && !isTouch) this.input.requestPointerLock();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.input.firing = false;
    });
  }

  // ------------------------------------------------------------------ flow

  start() {
    this.screens.hideStart();
    this.screens.hideGameOver();

    this.horde.clear();
    this.particles.clear();
    this.player.reset();
    this.weapon.reset();

    this.wave = 0;
    this.score = 0;
    this.kills = 0;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.waveBreak = 1.4;

    this.state = 'playing';
    this.hud.setVisible(true);
    this.hud.setScore(0);
    this.hud.setWave(1);
    this.touch.show();
    this.input.enable();

    if (!this.engine.isTouch) this.input.requestPointerLock();
  }

  _onDeath() {
    this.state = 'dying';
    this.deathTimer = 2.4;
    this.input.disable();
    this.touch.hide();
    this.input.exitPointerLock();
  }

  _onHit(zombie, dmg, head, killed) {
    if (!killed) return;
    this.kills++;
    this.score += zombie.scoreValue + (head ? 50 : 0);
    this.hud.setScore(this.score);
    if (Math.random() < 0.14) this.weapon.addAmmo(7);
  }

  _beginWave() {
    this.wave++;
    this.toSpawn = 5 + Math.floor(this.wave * 2.2);
    this.spawnTimer = 0.5;
    this.maxAlive = Math.min(this.horde.max, 8 + this.wave * 2);
    this.hud.setWave(this.wave);
    this.hud.banner_(`Wave ${this.wave}`);
  }

  _waveLogic(dt) {
    if (this.waveBreak > 0) {
      this.waveBreak -= dt;
      if (this.waveBreak <= 0) this._beginWave();
      return;
    }

    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.horde.aliveCount < this.maxAlive) {
        const p = this.arena.pickSpawn(this.player.pos, 20);
        this.horde.spawnAt(p, this.wave);
        this.toSpawn--;
        this.spawnTimer = Math.max(0.22, 1.05 - this.wave * 0.05);
      }
      return;
    }

    if (this.horde.aliveCount === 0) {
      this.score += 250 * this.wave;
      this.weapon.addAmmo(30);
      if (this.wave % 3 === 0) this.player.heal(25);
      this.hud.setScore(this.score);
      this.hud.banner_(`Wave ${this.wave} cleared`);
      this.waveBreak = WAVE_BREAK;
    }
  }

  // ------------------------------------------------------------------ loop

  update(dt) {
    this.input.sample(dt);

    if (this.state === 'menu') {
      // Slow, lonely pan over the empty yard behind the title card.
      this.player.yaw += dt * 0.06;
    }

    this.arena.update(dt);

    if (this.state === 'playing') this._waveLogic(dt);

    if (this.state === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.state = 'dead';
        this.hud.setVisible(false);
        this.screens.showGameOver({
          wave: this.wave,
          kills: this.kills,
          score: this.score,
          shots: this.weapon.shots,
          hits: this.weapon.hits,
        });
      }
    }

    this.player.update(dt);

    this.horde.update(dt, {
      player: this.player,
      horde: this.horde,
      arena: this.arena,
      particles: this.particles,
      colors: COLORS,
    });

    if (this.state === 'playing') this.weapon.update(dt, this.input);

    this.particles.update(dt);
    this.hud.update(dt);
    this.input.endFrame();
  }
}

// Boot.
const boot = () => {
  window.HANA = new Game();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
