import * as THREE from 'three';

const FOCUS_DOT = Math.cos(THREE.MathUtils.degToRad(48));

/**
 * Things you can touch with your bare hands.
 *
 * No raycast against meshes: a hotspot is a point plus a radius, and it lights
 * up when you are close enough AND looking roughly at it. Forgiving on a phone,
 * where the finger-sized crosshair never sits exactly on a door handle.
 */
export class Interactables {
  constructor() {
    this.items = [];
    this.focus = null;
    this._dir = new THREE.Vector3();
    this._to = new THREE.Vector3();
    this._eye = new THREE.Vector3();
  }

  /**
   * @param {object} item
   * @param {THREE.Vector3|number[]} item.position hotspot centre
   * @param {number} [item.radius] how close you must stand (metres)
   * @param {() => string} item.label text shown in the HUD
   * @param {() => void} item.onUse what pressing USE does
   * @param {boolean} [item.enabled]
   */
  add(item) {
    const it = {
      radius: 2,
      enabled: true,
      ...item,
      position: Array.isArray(item.position)
        ? new THREE.Vector3(item.position[0], item.position[1], item.position[2])
        : item.position.clone(),
    };
    this.items.push(it);
    return it;
  }

  /** Nearest hotspot the player is actually aimed at, or null. */
  update(dt, player, camera) {
    camera.getWorldPosition(this._eye);
    camera.getWorldDirection(this._dir);

    let best = null;
    let bestScore = -Infinity;

    for (const it of this.items) {
      if (!it.enabled) continue;
      this._to.copy(it.position).sub(this._eye);
      const dist = this._to.length();
      if (dist > it.radius) continue;
      this._to.divideScalar(dist || 1);
      const dot = this._dir.dot(this._to);
      if (dot < FOCUS_DOT) continue;
      // Prefer what you are aiming at; distance only breaks ties.
      const score = dot * 2 - dist * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }

    this.focus = best;
    return best;
  }

  /** Fire USE at whatever is focused. */
  use() {
    if (!this.focus) return false;
    this.focus.onUse?.();
    return true;
  }

  reset() {
    this.focus = null;
  }
}
