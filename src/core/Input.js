/**
 * Single source of truth for "what does the player want right now".
 *
 * Keyboard + mouse (desktop) and the on-screen gamepad (mobile) both write
 * into this object, so the Player never has to care where input came from.
 *
 *   move.x    strafe   -1 (left) .. 1 (right)
 *   move.y    forward  -1 (back)  .. 1 (forward)
 *   look.x    yaw delta   (pixels)  — consumed & cleared every frame
 *   look.y    pitch delta (pixels)  — consumed & cleared every frame
 *   action    interact/use held down
 *   actionPressed  true only on the frame it went down
 *   sprint    run modifier
 */
export class Input {
  constructor(domElement) {
    this.domElement = domElement;
    // Focusable canvas: in an embedded preview the keyboard only reaches us
    // once something inside the frame actually has focus.
    if (domElement) domElement.tabIndex = 0;
    this.move = { x: 0, y: 0 };
    // `look` is a per-frame pixel delta — from the mouse on desktop and from
    // the finger on a phone. Deliberately NOT a held direction: a rate-based
    // stick keeps turning after you let go, which feels greasy on glass.
    this.look = { x: 0, y: 0 };

    // Raw sources. `action` / `sprint` are re-derived from these every frame,
    // which is what keeps a held button working frame after frame.
    this.mouseFiring = false;
    this.touchAction = false;
    // Set when the USE button comes up. The press is cleared on the next
    // sample rather than immediately, so a tap faster than one frame still
    // registers as exactly one action.
    this.touchActionRelease = false;
    this.touchSprint = false;
    // Right-button drag turns the camera when pointer lock is unavailable
    // (embedded previews, locked-down browsers).
    this.dragging = false;
    this.action = false;
    this.actionPressed = false;
    this._actionWas = false;
    this.sprint = false;
    this.enabled = false;

    this.keys = new Set();
    this.pointerLocked = false;

    this._bindKeyboard();
    this._bindMouse();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.action = false;
    this.actionPressed = false;
    this._actionWas = false;
    this.sprint = false;
    this.mouseFiring = false;
    this.touchAction = false;
    this.touchActionRelease = false;
    this.touchSprint = false;
    this.move.x = 0;
    this.move.y = 0;
    this.keys.clear();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      if (k === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseFiring = false;
      this.touchAction = false;
      this.touchSprint = false;
    });
  }

  _bindMouse() {
    const canvas = this.domElement;

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseFiring = true;
      if (e.button === 2) this.dragging = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseFiring = false;
      if (e.button === 2) this.dragging = false;
    });
    window.addEventListener('blur', () => {
      this.mouseFiring = false;
      this.dragging = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Look with the mouse whenever the pointer is locked, or while the right
    // button is held (the fallback for embedded previews where pointer lock
    // is refused).
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked && !this.dragging) return;
      this.look.x += e.movementX || 0;
      this.look.y += e.movementY || 0;
    });
  }

  get canLook() {
    return this.pointerLocked || this.dragging;
  }

  /**
   * Ask for pointer lock. Returns a promise that resolves true only if the
   * browser actually granted it — embedded previews almost always say no.
   */
  requestPointerLock() {
    const el = this.domElement;
    if (!el || !el.requestPointerLock) return Promise.resolve(false);

    try {
      const p = el.requestPointerLock();
      if (p && typeof p.then === 'function') {
        return p.then(() => true).catch(() => false);
      }
    } catch {
      return Promise.resolve(false);
    }

    // Older browsers never resolve anything: check back shortly.
    return new Promise((resolve) => {
      setTimeout(() => resolve(document.pointerLockElement === el), 350);
    });
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Fold keyboard state into `move`. Called first thing each frame. */
  sample(dt) {
    if (!this.enabled) {
      this.move.x = 0;
      this.move.y = 0;
      this.touchAction = false;
      this.touchActionRelease = false;
      this.action = false;
      this.actionPressed = false;
      this._actionWas = false;
      return;
    }

    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    // Keyboard always wins over an idle stick, but never fights a held one.
    if (x !== 0 || y !== 0) {
      this.move.x = x;
      this.move.y = y;
    }

    this.sprint = this.touchSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // Interact: held state plus a one-frame "just went down" edge, which is
    // what the game actually acts on so a single tap means one action.
    this.action =
      this.touchAction || this.mouseFiring || this.keys.has('KeyE') || this.keys.has('Space');
    this.actionPressed = this.action && !this._actionWas;
    this._actionWas = this.action;

    if (this.touchActionRelease) {
      this.touchAction = false;
      this.touchActionRelease = false;
    }
  }

  /** Call once per frame after the player consumed the look delta. */
  endFrame() {
    this.look.x = 0;
    this.look.y = 0;
  }
}
