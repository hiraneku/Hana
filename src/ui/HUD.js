import * as THREE from 'three';

/**
 * Every pixel of the in-game interface: health, ammo, wave, score,
 * crosshair, hit-marker and the damage vignette.
 */
export class HUD {
  constructor() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-top">
        <div class="hud-chip" id="wave-chip"><span class="k">Wave</span><span class="v" id="wave-value">1</span></div>
        <div class="hud-chip" id="score-chip"><span class="k">Score</span><span class="v" id="score-value">0</span></div>
        <button class="hud-chip hud-toggle" id="controls-btn" type="button">
          <span class="k">Controls</span><span class="v" id="controls-value">Touch</span>
        </button>
      </div>
      <div class="hud-bottom">
        <div id="health-block">
          <div class="label"><span>Vitals</span><span id="health-text">100</span></div>
          <div class="bar"><i id="health-fill"></i></div>
          <div class="bar thin"><i id="stamina-fill"></i></div>
        </div>
        <div id="ammo-block">
          <div id="ammo-count">12</div>
          <div id="ammo-reserve">/ 96</div>
          <div id="reload-hint">Reloading</div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    this.waveValue = el.querySelector('#wave-value');
    this.scoreValue = el.querySelector('#score-value');
    this.healthFill = el.querySelector('#health-fill');
    this.healthText = el.querySelector('#health-text');
    this.staminaFill = el.querySelector('#stamina-fill');
    this.ammoCount = el.querySelector('#ammo-count');
    this.ammoReserve = el.querySelector('#ammo-reserve');
    this.reloadHint = el.querySelector('#reload-hint');
    this.controlsBtn = el.querySelector('#controls-btn');
    this.controlsValue = el.querySelector('#controls-value');

    this.banner = this._make('div', 'wave-banner');
    document.body.appendChild(this.banner);

    this.toastEl = this._make('div', 'toast');
    document.body.appendChild(this.toastEl);
    this._toastTimer = 0;

    this.crosshair = this._make('div', 'crosshair');
    this.crosshair.innerHTML = '<i></i><i></i><i></i><i></i>';
    document.body.appendChild(this.crosshair);

    this.hitmarker = this._make('div', 'hitmarker');
    document.body.appendChild(this.hitmarker);

    this.vignette = this._make('div', 'damage-vignette');
    document.body.appendChild(this.vignette);

    this.lowHealth = this._make('div', 'low-health');
    document.body.appendChild(this.lowHealth);

    this.fps = this._make('div', 'fps');
    document.body.appendChild(this.fps);

    this._damage = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
  }

  _make(tag, id) {
    const n = document.createElement(tag);
    n.id = id;
    return n;
  }

  setVisible(v) {
    this.el.classList.toggle('visible', v);
  }

  setHealth(hp, max) {
    const t = THREE.MathUtils.clamp(hp / max, 0, 1);
    this.healthFill.style.transform = `scaleX(${t})`;
    this.healthText.textContent = String(Math.max(0, Math.ceil(hp)));
    this.lowHealth.classList.toggle('on', t > 0 && t <= 0.3);
  }

  setStamina(t, exhausted) {
    this.staminaFill.style.transform = `scaleX(${Math.max(0, Math.min(1, t))})`;
    this.staminaFill.style.background = exhausted
      ? 'linear-gradient(90deg, #6b2020, #a33)'
      : 'linear-gradient(90deg, #4b5a2a, #9ad14b)';
  }

  setAmmo(mag, magSize, reserve, reloading) {
    this.ammoCount.textContent = String(mag);
    this.ammoCount.classList.toggle('empty', mag === 0);
    this.ammoReserve.textContent = `/ ${reserve}`;
    this.reloadHint.textContent = reloading ? 'Reloading' : mag === 0 ? 'Press reload' : '';
    this.reloadHint.classList.toggle('show', reloading || mag === 0);
  }

  setWave(n) {
    this.waveValue.textContent = String(n);
  }

  onControlsToggle(cb) {
    this.controlsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cb();
    });
  }

  setControlsLabel(mode) {
    this.controlsValue.textContent = mode === 'touch' ? 'Touch' : 'Mouse';
  }

  setScore(s) {
    this.scoreValue.textContent = String(s);
  }

  banner_(text) {
    this.banner.textContent = text;
    this.banner.classList.remove('show');
    // Force a reflow so the animation restarts on repeated waves.
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }

  /** Short-lived hint, e.g. "touch controls enabled". */
  toast(text, seconds = 3.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this._toastTimer = seconds;
  }

  hitmarker_(isKill) {
    this.hitmarker.classList.remove('pop', 'kill');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.toggle('kill', !!isKill);
    this.hitmarker.classList.add('pop');
  }

  damageFlash(strength = 1) {
    this._damage = Math.min(1, this._damage + strength);
  }

  update(dt) {
    if (this._toastTimer > 0) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0) this.toastEl.classList.remove('show');
    }

    if (this._damage > 0) {
      this._damage = Math.max(0, this._damage - dt * 1.6);
      this.vignette.style.opacity = String(this._damage * 0.85);
    }

    this._fpsFrames++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this.fps.textContent = `${Math.round(this._fpsFrames / this._fpsTime)} FPS`;
      this._fpsFrames = 0;
      this._fpsTime = 0;
    }
  }
}
