/**
 * Mobile control scheme, the way phone shooters actually do it:
 *
 *   left half of the screen  → floating move stick (direction, like a pad)
 *   right half of the screen → drag anywhere to look, 1:1 with your finger
 *   bottom-right             → INTERACT / RUN buttons
 *
 * Looking is a *delta*, not a rate: there is no virtual joystick being held
 * at an angle, so nothing keeps spinning after you lift your thumb. That was
 * the "slippery" feel — a rate-based stick drifts on.
 *
 * It writes straight into the shared `Input` object, so the Player code is
 * identical on desktop and mobile.
 */
export class TouchControls {
  constructor(input, isTouch = false) {
    this.input = input;
    this.isTouch = isTouch;
    this.forced = false; // shown on a non-touch device on purpose
    this.pointers = new Map(); // id -> { zone, ox, oy, lastX, lastY, el }
    this.enabled = false;

    // Finger pixels → look pixels. Tuned so a thumb-width swipe is about a
    // 25° turn; the player can scale it in the settings.
    this.lookScale = 1.0;

    const layer = document.createElement('div');
    layer.id = 'touch-layer';
    layer.className = 'hidden';
    layer.innerHTML = `
      <div class="stick" id="stick-move"><div class="knob"></div></div>
      <button class="touch-btn" id="btn-action" type="button">Use</button>
      <button class="touch-btn" id="btn-sprint" type="button">Run</button>
    `;
    document.body.appendChild(layer);

    this.layer = layer;
    this.moveStick = layer.querySelector('#stick-move');
    this.moveKnob = this.moveStick.querySelector('.knob');

    if (isTouch) document.body.classList.add('touch-device');

    this._bindSticks();
    this._bindButton(layer.querySelector('#btn-action'), 'touchAction');
    this._bindButton(layer.querySelector('#btn-sprint'), 'touchSprint');

    // Some phones fire contextmenu on long press. Not welcome here.
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get visible() {
    return !this.layer.classList.contains('hidden');
  }

  show() {
    if (!this.isTouch && !this.forced) return;
    this.layer.classList.remove('hidden');
    this.enabled = true;
  }

  /**
   * Force the gamepad on (or off) regardless of device detection.
   * Used by the HUD toggle and by the pointer-lock fallback: if a desktop
   * browser — or an embedded preview — refuses pointer lock, the sticks are
   * the only way left to turn around.
   */
  setForced(on) {
    this.forced = on;
    if (on) {
      document.body.classList.add('touch-device');
      this.layer.classList.remove('hidden');
      this.enabled = true;
    } else {
      if (!this.isTouch) document.body.classList.remove('touch-device');
      this.hide();
    }
  }

  hide() {
    this.layer.classList.add('hidden');
    this.enabled = false;
    this.pointers.clear();
    this.moveStick.classList.remove('active');
    this._resetKnob(this.moveKnob);
    this.input.touchAction = false;
    this.input.touchSprint = false;
  }

  setLookScale(v) {
    this.lookScale = v;
  }

  _bindSticks() {
    // IMPORTANT: this listens on `window`, not on the layer. The layer is
    // `pointer-events: none` so that the HUD underneath stays clickable —
    // which also means it never receives events itself. Listening globally
    // catches the touches that pass straight through it.
    window.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.pointers.size >= 2) return;
      if (e.button === 2) return; // right button belongs to mouse-look

      // Let the action buttons, the HUD and the menus handle their own taps.
      const t = e.target;
      if (t && t.closest && t.closest('.touch-btn, #hud, .overlay, #fx-layer')) return;

      const zone = e.clientX < window.innerWidth * 0.5 ? 'move' : 'look';
      // One thumb per job: never let a second finger steal a live zone.
      for (const p of this.pointers.values()) if (p.zone === zone) return;

      if (zone === 'move') {
        const el = this.moveStick;
        const size = el.offsetWidth || 120;
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        el.classList.add('active');
        this.pointers.set(e.pointerId, { zone, ox: e.clientX, oy: e.clientY, el, max: size * 0.4 });
      } else {
        // Look: no widget, no centre point, no inertia. Just track the finger.
        this.pointers.set(e.pointerId, {
          zone,
          el: null,
          lastX: e.clientX,
          lastY: e.clientY,
        });
      }
    });

    const onMove = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;

      if (p.zone === 'move') {
        let dx = e.clientX - p.ox;
        let dy = e.clientY - p.oy;
        const dist = Math.hypot(dx, dy);
        if (dist > p.max) {
          dx = (dx / dist) * p.max;
          dy = (dy / dist) * p.max;
        }
        this.moveKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.input.move.x = dx / p.max;
        this.input.move.y = -dy / p.max; // screen Y grows downwards
        return;
      }

      // Look: 1:1 with the finger. Nothing is accumulated into a velocity,
      // so the camera stops the instant the finger stops.
      const dx = e.clientX - p.lastX;
      const dy = e.clientY - p.lastY;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      this.input.look.x += dx * this.lookScale;
      this.input.look.y += dy * this.lookScale;
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    const release = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      if (p.zone === 'move') {
        p.el.classList.remove('active');
        this._resetKnob(this.moveKnob);
        this.input.move.x = 0;
        this.input.move.y = 0;
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
      // USE is an edge-triggered action: hand the release to the input loop
      // instead of clearing it here, or a tap shorter than one frame (very
      // common on a phone) would never be seen by the game at all.
      if (flag === 'touchAction') this.input.touchActionRelease = true;
      else this.input[flag] = false;
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
