import * as THREE from 'three';
import { Zombie } from './Zombie.js';
import { rayBox } from '../world/collision.js';

const CORPSE_LIFETIME = 14; // seconds before a body is recycled
const BOUND = 30.5; // keep the jitter inside the blast walls

/**
 * Owns every zombie, keeps a pool so waves never allocate mid-fight, and
 * answers one very important question: "what did that bullet hit?"
 */
export class Horde {
  constructor(scene, arena, { max = 34 } = {}) {
    this.scene = scene;
    this.arena = arena;
    this.max = max;
    this.pool = [];
    this.active = [];
    this.onKill = null;

    this._a = {};
    this._b = {};
    this._hit = { zombie: null, dist: 0, head: false };
  }

  get aliveCount() {
    let n = 0;
    for (const z of this.active) if (!z.isCorpse) n++;
    return n;
  }

  _obtain() {
    for (const z of this.pool) if (!z.active) return z;

    if (this.pool.length < this.max) {
      const z = new Zombie(this.scene);
      this.pool.push(z);
      return z;
    }

    // Pool is full: recycle the oldest corpse, or whatever is furthest out.
    let victim = null;
    let best = -Infinity;
    for (const z of this.active) {
      const score = z.isCorpse ? 1000 + z.deadTimer : -z.pos.lengthSq();
      if (score > best) {
        best = score;
        victim = z;
      }
    }
    victim?.retire();
    const i = this.active.indexOf(victim);
    if (i >= 0) this.active.splice(i, 1);
    return victim;
  }

  spawnAt(point, wave) {
    const z = this._obtain();
    if (!z) return null;
    const x = THREE.MathUtils.clamp(point.x + (Math.random() - 0.5) * 3, -BOUND, BOUND);
    const zz = THREE.MathUtils.clamp(point.z + (Math.random() - 0.5) * 3, -BOUND, BOUND);
    z.spawn(x, zz, wave);
    this.active.push(z);
    return z;
  }

  /** Nearest living zombie along the ray, with head/body discrimination. */
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    let best = maxDist;
    let found = null;
    let head = false;

    for (const z of this.active) {
      if (z.isCorpse) continue;
      // Broad phase: skip anything the ray cannot possibly reach.
      const px = z.pos.x - ox;
      const pz = z.pos.z - oz;
      const along = px * dx + pz * dz;
      if (along < -1 || along > best) continue;
      const perpX = px - dx * along;
      const perpZ = pz - dz * along;
      const off = perpX * perpX + perpZ * perpZ;
      if (off > 1.6) continue;

      const th = rayBox(ox, oy, oz, dx, dy, dz, z.headBox(this._a), best);
      if (th !== null && th < best) {
        best = th;
        found = z;
        head = true;
        continue;
      }
      const tb = rayBox(ox, oy, oz, dx, dy, dz, z.bodyBox(this._b), best);
      if (tb !== null && tb < best) {
        best = tb;
        found = z;
        head = false;
      }
    }

    if (!found) return null;
    this._hit.zombie = found;
    this._hit.dist = best;
    this._hit.head = head;
    return this._hit;
  }

  update(dt, ctx) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const z = this.active[i];
      z.update(dt, ctx);
      if (z.isCorpse && z.deadTimer > CORPSE_LIFETIME) {
        z.retire();
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const z of this.active) z.retire();
    this.active.length = 0;
  }
}
