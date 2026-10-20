import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { Player, MAX_HEALTH } from './player/Player.js';
import { Hands } from './player/Hands.js';
import { Room } from './world/Room.js';
import { Interactables } from './world/Interactables.js';
import { Particles } from './fx/Particles.js';
import { Hud } from './ui/Hud.js';
import { Screens } from './ui/Screens.js';
import { TouchControls } from './ui/TouchControls.js';
import { DebugPanel, debugEnabled, showErrorBanner } from './ui/Debug.js';
import { bindSensitivity } from './ui/Sensitivity.js';
import { GameAudio } from './audio/Audio.js';

/** How long the room behaves itself before the first thing goes wrong. */
const CALM = 16;

const DUST = new THREE.Color(0x6a6f75);

/**
 * Hana — a survival night in one apartment room.
 *
 * No waves, no guns, no monsters. You wake up somewhere expensive with the
 * door locked, and the room itself is the whole game: find the key card,
 * work out what is behind you, and leave.
 */
export class Game {
  /** @param {{renderer?: object, isTouch?: boolean}} [options] for headless tests */
  constructor(options = {}) {
    const app = document.getElementById('app');
    this.engine = new Engine(app, options);
    const isTouch = this.engine.isTouch;

    // Indoors you can see the whole room, so the fog is only there to give
    // the city outside some depth. The Room sets its own; this is the value
    // the menu camera sees.
    this.engine.scene.fog = new THREE.FogExp2(0x0a1016, 0.017);

    this.input = new Input(this.engine.renderer.domElement);
    this.hud = new Hud();
    this.screens = new Screens({ onStart: () => this.start() });
    this.touch = new TouchControls(this.input, isTouch);
    this.audio = new GameAudio();
    this.particles = new Particles(this.engine.scene, isTouch ? 160 : 260);

    this.room = new Room(this.engine.scene, { shadows: !isTouch });
    this.player = new Player(this.engine, this.room, this.input, this.hud);
    this.hands = new Hands(this.player.camera);
    this.interactables = new Interactables();

    this.state = 'menu'; // menu | playing | escaped
    this.hasKey = false;
    this.time = 0;
    this.scareIn = CALM;
    this.flicker = 0;
    this.usedCount = 0;

    this._buildInteractables();
    this._wireSensitivity();
    this._wireHud();

    this.hud.setControlsLabel(isTouch ? 'touch' : 'mouse');
    this.hud.onControlsToggle(() => this.toggleVirtualControls());
    this.hud.setPromptKey(isTouch ? 'USE' : 'E');

    // If the render loop throws, say so on screen rather than dying quietly.
    this.engine.onError = (err) => showErrorBanner(err, false);
    this.engine.onFatal = (err) => showErrorBanner(err, true);
    this.debug = debugEnabled() ? new DebugPanel() : null;

    this.engine.add({ update: (dt) => this.update(dt) });
    this.engine.start();

    // Desktop: clicking the canvas re-captures the mouse (and un-mutes the
    // audio after the tab lost focus).
    this.engine.renderer.domElement.addEventListener('click', () => {
      if (this.state !== 'playing') return;
      this.audio.start();
      if (!isTouch && !this.touch.visible) this.input.requestPointerLock();
    });

    // M is the panic button.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const on = this.audio.toggleMute();
        this.hud.toast(on ? 'Suara mati' : 'Suara hidup', 1.6);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.audio.suspend();
    });
  }

  /** Show or hide the on-screen controls — works on desktop too. */
  toggleVirtualControls() {
    const on = !this.touch.visible;
    this.touch.setForced(on);
    this.hud.setControlsLabel(on ? 'touch' : 'mouse');
    if (!on) {
      this.hud.toast('Mode mouse: tahan klik kanan untuk menoleh', 3);
      if (!this.engine.isTouch) this.input.requestPointerLock();
    } else {
      this.hud.toast('Kontrol layar menyala', 2.2);
    }
  }

  // ------------------------------------------------------------- interactables

  _buildInteractables() {
    const hud = this.hud;
    const audio = this.audio;

    this.lightSwitch = this.interactables.add({
      position: this.room.switchPos,
      radius: 1.7,
      label: () => (this.room.lightsOn ? 'Matikan lampu' : 'Nyalakan lampu'),
      onUse: () => {
        this.room.setCeilingLight(!this.room.lightsOn);
        audio.reloadClick(this.room.lightsOn ? 1.15 : 0.85);
        hud.toast(this.room.lightsOn ? 'Lampu menyala' : 'Lampu padam', 1.6);
      },
    });

    this.tv = this.interactables.add({
      position: this.room.tvPos,
      radius: 1.9,
      label: () => (this.room.tvOn ? 'Matikan TV' : 'Nyalakan TV'),
      onUse: () => {
        this.room.setTv(!this.room.tvOn);
        audio.reloadClick(0.7);
      },
    });

    // The key card lives in the nightstand nearest the window.
    this.drawer = this.interactables.add({
      position: this.room.drawerPos,
      radius: 1.8,
      label: () => 'Buka laci',
      onUse: () => {
        this.hasKey = true;
        this.drawer.enabled = false;
        audio.reloadClick(1.4);
        hud.toast('Kartu kunci ditemukan.', 3.2);
        hud.setKey(true);
        hud.setObjective('Buka pintu keluar');
        this.scareIn = Math.min(this.scareIn, 5);
      },
    });

    this.door = this.interactables.add({
      position: new THREE.Vector3(this.room.doorX, 1.15, 4.25),
      radius: 1.6,
      label: () => (this.hasKey ? 'Buka pintu' : 'Pintu terkunci'),
      onUse: () => {
        if (!this.hasKey) {
          audio.dryFire();
          hud.toast('Terkunci. Cari kartu kuncinya.', 2.6);
          return;
        }
        this._escape();
      },
    });
  }

  _wireHud() {
    this.hud.setObjective('Cari kartu kunci');
    this.hud.setKey(false);
  }

  /**
   * Look sensitivity. Every slider tagged `data-sens` (menu and HUD) drives
   * the same number, saved to localStorage so a phone remembers it.
   */
  _wireSensitivity() {
    bindSensitivity((v) => {
      this.player.lookSensitivity = v;
      this.touch.setLookScale(v);
    });
  }

  // ------------------------------------------------------------------ flow

  start() {
    this.screens.hideStart();
    this.screens.hideGameOver();

    this.particles.clear();
    this.player.reset();
    this.room.setCeilingLight(true);
    this.room.setTv(false);

    this.hasKey = false;
    this.time = 0;
    this.scareIn = CALM;
    this.flicker = 0;
    this.usedCount = 0;
    this.drawer.enabled = true;
    this.interactables.reset();
    this.room.setFlicker(1);

    this.state = 'playing';
    this.hud.setVisible(true);
    this._wireHud();
    this.hud.setControlsLabel(this.touch.visible ? 'touch' : 'mouse');
    this.touch.show();
    this.input.enable();
    this.audio.start();
    // Grab keyboard focus so WASD lands inside the game frame, not the page
    // hosting it.
    this.engine.renderer.domElement.focus?.();

    this.hud.banner_('Kamar 14B');

    // Pointer lock is the good path on desktop, but embedded previews (and
    // some browsers) refuse it. If that happens, put the controls on screen
    // so the game is still playable with a mouse.
    if (!this.engine.isTouch && this.input.requestPointerLock) {
      Promise.resolve(this.input.requestPointerLock()).then((locked) => {
        if (locked || this.state !== 'playing') return;
        this.touch.setForced(true);
        this.hud.setControlsLabel('touch');
        this.hud.toast('Pointer lock ditolak — kontrol layar menyala', 4);
      });
    }
  }

  _escape() {
    this.state = 'escaped';
    this.input.disable();
    this.touch.hide();
    this.input.exitPointerLock();
    this.audio.reloadClick(1.6);
    this.hud.setVisible(false);
    this.screens.showGameOver({
      escaped: true,
      seconds: this.time,
      used: this.usedCount,
    });
  }

  /** A slow drift of dust through the light. The room is not sterile. */
  _dust(dt) {
    this._dustIn = (this._dustIn ?? 0) - dt;
    if (this._dustIn > 0) return;
    this._dustIn = 0.45 + Math.random() * 0.5;
    const p = this.player.pos;
    this.particles.motes(
      p.x + (Math.random() - 0.5) * 3,
      0.5 + Math.random() * 2,
      p.z + (Math.random() - 0.5) * 3,
      1,
      DUST
    );
  }

  /**
   * Nothing is hunting you, but the room is not empty either: every so often
   * a lamp stutters or the television switches itself on.
   */
  _dread(dt) {
    if (this.flicker > 0) {
      this.flicker -= dt;
      this.room.setFlicker(this.flicker > 0 ? (Math.random() < 0.5 ? 0.15 : 1) : 1);
      return;
    }
    this.room.setFlicker(1);

    this.scareIn -= dt;
    if (this.scareIn > 0) return;

    this.scareIn = 26 + Math.random() * 34;
    const roll = Math.random();
    if (roll < 0.4) {
      this.flicker = 0.5 + Math.random() * 1.4;
    } else if (roll < 0.75) {
      this.room.setTv(true);
      this.audio.distantScream();
    } else {
      this.audio.distantScream();
    }
  }

  // ------------------------------------------------------------------ loop

  update(dt) {
    this.input.sample(dt);

    if (this.state === 'menu') {
      // Slow, lonely pan across the room behind the title card.
      this.player.yaw += dt * 0.045;
    }

    this.room.update(dt);

    if (this.state === 'playing') {
      this.time += dt;
      this._dread(dt);
    }

    this.player.update(dt);

    // Resolve what you are looking at first, so a tap that starts the very
    // same frame you line something up still counts.
    this.interactables.update(dt, this.player, this.player.camera);
    const focus = this.state === 'playing' ? this.interactables.focus : null;
    this.hud.setPrompt(focus ? focus.label() : null);

    if (focus && this.input.actionPressed) {
      this.interactables.use();
      this.hands.poke();
      this.usedCount++;
    }

    if (this.state === 'playing') this._dust(dt);

    this.hands.update(dt, {
      moving: Math.min(1, this.player.speed / 4),
      lookX: this.input.look.x,
      lookY: this.input.look.y,
    });

    this.audio.update(dt, {
      health: this.player.health,
      maxHealth: MAX_HEALTH,
      exhausted: this.player.exhausted,
      alive: this.player.alive && this.state === 'playing',
      nearest: null,
    });

    this.particles.update(dt);
    this.hud.update(dt);
    this.debug?.update(dt, this);
    this.input.endFrame();
  }
}
