/**
 * Every pixel of the in-game interface: what you are trying to do, what you
 * are holding, what you can touch right now, and how much breath you have.
 *
 * There is no ammo counter and no wave number — you have no gun and nothing
 * is coming in waves. What is left is an objective and a prompt.
 */
export class Hud {
  constructor() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="hud-top">
        <div class="hud-chip" id="objective-chip">
          <span class="k">Tujuan</span><span class="v" id="objective-value">—</span>
        </div>
        <div class="hud-chip" id="key-chip">
          <span class="k">Kunci</span><span class="v" id="key-value">belum ada</span>
        </div>
        <div class="hud-chip sens-chip">
          <span class="k">Sens</span>
          <input data-sens type="range" min="0.3" max="2.5" step="0.05" value="1" />
          <span class="v" data-sens-val>1</span>
        </div>
        <button class="hud-chip hud-toggle" id="controls-btn" type="button">
          <span class="k">Kontrol</span><span class="v" id="controls-value">Touch</span>
        </button>
      </div>
      <div class="hud-bottom">
        <div id="health-block">
          <div class="label"><span>Tenaga</span></div>
          <div class="bar thin"><i id="stamina-fill"></i></div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;

    this.objectiveValue = el.querySelector('#objective-value');
    this.keyChip = el.querySelector('#key-chip');
    this.keyValue = el.querySelector('#key-value');
    this.staminaFill = el.querySelector('#stamina-fill');
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

    this.prompt = this._make('div', 'interact-prompt');
    this.prompt.innerHTML = '<b id="prompt-key">USE</b><span id="prompt-label"></span>';
    document.body.appendChild(this.prompt);
    this.promptLabel = this.prompt.querySelector('#prompt-label');
    this.promptKey = this.prompt.querySelector('#prompt-key');

    this.vignette = this._make('div', 'damage-vignette');
    document.body.appendChild(this.vignette);

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
    // Nothing in this room can hurt you, so the health readout stays out of
    // the way; it is here so the player controller has something to call.
    this.lowHealth?.classList.toggle('on', hp > 0 && hp / max <= 0.3);
  }

  setStamina(t, exhausted) {
    this.staminaFill.style.transform = `scaleX(${Math.max(0, Math.min(1, t))})`;
    this.staminaFill.style.background = exhausted
      ? 'linear-gradient(90deg, #6b2020, #a33)'
      : 'linear-gradient(90deg, #4b5a2a, #9ad14b)';
  }

  setObjective(text) {
    this.objectiveValue.textContent = text;
  }

  setKey(has) {
    this.keyValue.textContent = has ? 'ada' : 'belum ada';
    this.keyChip.classList.toggle('ok', !!has);
  }

  /** The interact prompt. `text` null hides it. */
  setPrompt(text) {
    const show = !!text;
    this.prompt.classList.toggle('show', show);
    if (!show) return;
    if (this.promptLabel.textContent !== text) this.promptLabel.textContent = text;
  }

  /** Which key to show in the prompt — USE on touch, E on desktop. */
  setPromptKey(key) {
    this.promptKey.textContent = key;
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

  banner_(text) {
    this.banner.textContent = text;
    this.banner.classList.remove('show');
    // Force a reflow so the animation restarts on repeat banners.
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }

  /** Short-lived hint, e.g. "lampu padam". */
  toast(text, seconds = 3.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this._toastTimer = seconds;
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
