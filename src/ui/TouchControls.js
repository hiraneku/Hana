/**
 * On-screen dual-stick gamepad for phones.
 *
 *   left half of the screen  → floating move stick
 *   right half of the screen → floating look stick
 *   bottom-right             → FIRE / RELOAD / SPRINT buttons
 *
 * It writes straight into the shared `Input` object, so the Player code is
 * identical on desktop and mobile.
 */
export class TouchControls {
  constructor(input, isTouch = false) {
    this.input = input;
    this.pointers = new Map();
    this.enabled = false;

    const layer = document.createElement('div');
    layer.id = 'touch-layer';
    layer.className = 'hidden';
    layer.innerHTML = `
      <div class="stick" id="stick-move"><div class="knob"></div></div>
      <div class="stick" id="stick-look"><div class="knob"></div></div>
      <button class="touch-btn" id="btn-fire" type="button">Fire</button>
      <button class="touch-btn" id="btn-reload" type="button">Reload</button>
      <button class="touch-btn" id="btn-sprint" type="button">Run</button>
    `;
    document.body.appendChild(layer);

    this.layer = layer;
    this.moveStick = layer.querySelector('#stick-move');
    this.lookStick = layer.querySelector('#stick-look');
    this.moveKnob = this.moveStick.querySelector('.knob');
    this.lookKnob = this.lookStick.querySelector('.knob');

    if (isTouch) document.body.classList.add('touch-device');

    this._bindSticks();
    this._bindButton(layer.querySelector('#btn-fire'), 'touchFiring');
    this._bindButton(layer.querySelector('#btn-sprint'), 'touchSprint');
    this._bindButton(layer.querySelector('#btn-reload'), 'reloadQueued');

    // Some phones fire contextmenu on long press. Not welcome here.
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  show() {
    this.layer.classList.remove('hidden');
    this.enabled = true;
  }

  hide() {
    this.layer.classList.add('hidden');
    this.enabled = false;
    this.pointers.clear();
    this.moveStick.classList.remove('active');
    this.lookStick.classList.remove('active');
    this._resetKnob(this.moveKnob);
    this._resetKnob(this.lookKnob);
    this.input.touchFiring = false;
    this.input.touchSprint = false;
  }

  _bindSticks() {
    this.layer.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointers.size >= 2) return;
      const zone = e.clientX < window.innerWidth * 0.5 ? 'move' : 'look';
      // Never steal a pointer that is already driving the other stick.
      for (const p of this.pointers.values()) if (p.zone === zone) return;

      const el = zone === 'move' ? this.moveStick : this.lookStick;
      const size = el.offsetWidth || 120;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.classList.add('active');

      this.pointers.set(e.pointerId, {
        zone,
        ox: e.clientX,
        oy: e.clientY,
        el,
        max: size * 0.4,
      });
    });

    const onMove = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      let dx = e.clientX - p.ox;
      let dy = e.clientY - p.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > p.max) {
        dx = (dx / dist) * p.max;
        dy = (dy / dist) * p.max;
      }

      const nx = dx / p.max;
      const ny = dy / p.max;
      const knob = p.zone === 'move' ? this.moveKnob : this.lookKnob;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;

      if (p.zone === 'move') {
        this.input.move.x = nx;
        this.input.move.y = -ny; // screen Y grows downwards
      } else {
        // Look stick: held direction, not a per-event delta, so the turn
        // speed never depends on the device's touch sampling rate.
        this.input.lookAxis.x = nx;
        this.input.lookAxis.y = -ny;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    const release = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      p.el.classList.remove('active');
      this._resetKnob(p.zone === 'move' ? this.moveKnob : this.lookKnob);
      if (p.zone === 'move') {
        this.input.move.x = 0;
        this.input.move.y = 0;
      } else {
        this.input.lookAxis.x = 0;
        this.input.lookAxis.y = 0;
      }
      this.pointers.delete(e.pointerId);
    };

    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  _bindButton(btn, flag) {
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.enabled) return;
      btn.classList.add('pressed');
      this.input[flag] = true;
      btn.setPointerCapture?.(e.pointerId);
    };
    const release = (e) => {
      e.stopPropagation();
      btn.classList.remove('pressed');
      // `reloadQueued` is a one-shot flag: leave it set so a quick tap is
      // still seen by the next frame, and let the input loop clear it.
      if (flag !== 'reloadQueued') this.input[flag] = false;
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }

  _resetKnob(knob) {
    knob.style.transform = 'translate(0px, 0px)';
  }
}
