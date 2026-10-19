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
 *   firing    trigger held down
 *   sprint    run modifier
 */
export class Input {
  constructor(domElement) {
    this.domElement = domElement;
    this.move = { x: 0, y: 0 };
    // `look` is a per-frame pixel delta (mouse). `lookAxis` is a held
    // direction in -1..1 (thumbstick) that the player turns along over time.
    this.look = { x: 0, y: 0 };
    this.lookAxis = { x: 0, y: 0 };

    // Raw sources. `firing` / `sprint` are re-derived from these every frame,
    // which is what keeps a held button working frame after frame.
    this.mouseFiring = false;
    this.touchFiring = false;
    this.touchSprint = false;
    this.firing = false;
    this.sprint = false;
    this.reloadQueued = false;
    this.interactQueued = false;
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
    this.firing = false;
    this.sprint = false;
    this.mouseFiring = false;
    this.touchFiring = false;
    this.touchSprint = false;
    this.move.x = 0;
    this.move.y = 0;
    this.lookAxis.x = 0;
    this.lookAxis.y = 0;
    this.keys.clear();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      if (k === 'KeyR') this.reloadQueued = true;
      if (k === 'KeyE' || k === 'KeyF') this.interactQueued = true;
      if (k === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseFiring = false;
      this.touchFiring = false;
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
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseFiring = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.look.x += e.movementX || 0;
      this.look.y += e.movementY || 0;
    });
  }

  requestPointerLock() {
    if (this.domElement.requestPointerLock) {
      const p = this.domElement.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Fold keyboard state into `move`. Called first thing each frame. */
  sample(dt) {
    if (!this.enabled) {
      this.move.x = 0;
      this.move.y = 0;
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
    this.firing = this.mouseFiring || this.touchFiring || this.keys.has('Space');
  }

  /** Call once per frame after the player consumed the look delta. */
  endFrame() {
    this.look.x = 0;
    this.look.y = 0;
    this.reloadQueued = false;
    this.interactQueued = false;
  }
}
