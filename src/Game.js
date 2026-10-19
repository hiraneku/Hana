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
import { GameAudio } from './audio/Audio.js';
import { MAX_HEALTH } from './player/Player.js';
import { DebugPanel, debugEnabled, showErrorBanner, BUILD } from './ui/Debug.js';

const WAVE_BREAK = 6; // seconds of breathing room between waves

export class Game {
  /** @param {{renderer?: object, isTouch?: boolean}} [options] for headless tests */
  constructor(options = {}) {
    const app = document.getElementById('app');
    this.engine = new Engine(app, options);
    const isTouch = this.engine.isTouch;

    this.arena = new Arena(this.engine.scene, {
      shadows: !isTouch,
      maxLamps: isTouch ? 4 : 5,
    });

    this.input = new Input(this.engine.renderer.domElement);
    this.hud = new HUD();
    this.touch = new TouchControls(this.input, isTouch);
    this.particles = new Particles(this.engine.scene, isTouch ? 220 : 380);

    this.player = new Player(this.engine, this.arena, this.input, this.hud);
    this.horde = new Horde(this.engine.scene, this.arena, { max: isTouch ? 26 : 40 });

    this.audio = new GameAudio();

    this.weapon = new Weapon(this.engine, {
      arena: this.arena,
      horde: this.horde,
      player: this.player,
      particles: this.particles,
      hud: this.hud,
      audio: this.audio,
      onHit: (z, dmg, head, killed) => this._onHit(z, dmg, head, killed),
    });

    this.player.onHurt = () => this.audio.hurt();

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

    // If the render loop throws, say so on screen rather than dying quietly.
    this.engine.onError = (err) => showErrorBanner(err, false);
    this.engine.onFatal = (err) => showErrorBanner(err, true);

    // `?debug=1` puts a live readout of input + state on screen.
    this.debug = debugEnabled() ? new DebugPanel() : null;

    this.hud.setControlsLabel(isTouch ? 'touch' : 'mouse');
    this.hud.onControlsToggle(() => this.toggleVirtualControls());

    this.engine.add({ update: (dt) => this.update(dt) });
    this.engine.start();

    // Desktop: clicking the canvas re-captures the mouse (and un-mutes audio
    // after the tab lost focus).
    this.engine.renderer.domElement.addEventListener('click', () => {
      if (this.state !== 'playing') return;
      this.audio.start();
      if (!isTouch && !this.touch.visible) this.input.requestPointerLock();
    });

    // M is the panic button.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const on = this.audio.toggleMute();
        this.hud.toast(on ? 'Sound off' : 'Sound on', 1.6);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.input.firing = false;
        this.audio.suspend();
      }
    });
  }

  /** Show or hide the on-screen sticks — works on desktop too. */
  toggleVirtualControls() {
    const on = !this.touch.visible;
    this.touch.setForced(on);
    this.hud.setControlsLabel(on ? 'touch' : 'mouse');
    if (!on) {
      this.hud.toast('Mouse look: hold right button to turn', 3);
      if (!this.engine.isTouch) this.input.requestPointerLock();
    } else {
      this.hud.toast('On-screen controls on', 2.2);
    }
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
    this.audio.start();
    // Grab keyboard focus so WASD lands inside the game frame, not the page
    // hosting it.
    this.engine.renderer.domElement.focus?.();

    // Pointer lock is the good path on desktop, but embedded previews (and
    // some browsers) refuse it. If that happens, put the sticks on screen so
    // the game is still playable with a mouse.
    if (!this.engine.isTouch && this.input.requestPointerLock) {
      Promise.resolve(this.input.requestPointerLock()).then((locked) => {
        if (locked || this.state !== 'playing') return;
        this.touch.setForced(true);
        this.hud.setControlsLabel('touch');
        this.hud.toast('Pointer lock refused — on-screen controls enabled', 4);
      });
    }
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
    this.audio.death(this._panTo(zombie.pos.x, zombie.pos.z));
    if (Math.random() < 0.14) this.weapon.addAmmo(7);
  }

  /** Where is this sound, left or right? -1 = hard left, 1 = hard right. */
  _panTo(x, z) {
    const dx = x - this.player.pos.x;
    const dz = z - this.player.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const rx = Math.cos(this.player.yaw);
    const rz = -Math.sin(this.player.yaw);
    return Math.max(-1, Math.min(1, (dx / d) * rx + (dz / d) * rz));
  }

  /** Closest living zombie, for directional growls. */
  _nearestThreat() {
    let best = null;
    for (const z of this.horde.active) {
      if (z.isCorpse) continue;
      const d = z.pos.distanceTo(this.player.pos);
      if (!best || d < best.dist) best = { dist: d, pan: this._panTo(z.pos.x, z.pos.z) };
    }
    return best;
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

    this.audio.update(dt, {
      health: this.player.health,
      maxHealth: MAX_HEALTH,
      exhausted: this.player.exhausted,
      alive: this.player.alive && this.state === 'playing',
      nearest: this._nearestThreat(),
    });

    this.particles.update(dt);
    this.hud.update(dt);
    this.debug?.update(dt, this);
    this.input.endFrame();
  }
}

