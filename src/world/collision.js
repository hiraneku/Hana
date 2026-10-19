/**
 * Tiny collision kit. The whole level is a flat yard full of axis-aligned
 * boxes, so we never need a real physics engine:
 *
 *   - movement  = circle vs. 2D AABB push-out
 *   - shooting  = ray vs. 3D AABB (slab method)
 */

export function makeBox(cx, cy, cz, w, h, d) {
  return {
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy,
    maxY: cy + h,
    minZ: cz - d / 2,
    maxZ: cz + d / 2,
  };
}

const _out = { x: 0, z: 0, hit: false };

/** Push a circle of radius `r` out of every box it overlaps. */
export function resolveCircle(boxes, x, z, r) {
  _out.x = x;
  _out.z = z;
  _out.hit = false;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const minX = b.minX - r;
    const maxX = b.maxX + r;
    const minZ = b.minZ - r;
    const maxZ = b.maxZ + r;
    if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;

    const dLeft = x - minX;
    const dRight = maxX - x;
    const dBack = z - minZ;
    const dFront = maxZ - z;
    const m = Math.min(dLeft, dRight, dBack, dFront);

    if (m === dLeft) _out.x = minX;
    else if (m === dRight) _out.x = maxX;
    else if (m === dBack) _out.z = minZ;
    else _out.z = maxZ;

    x = _out.x;
    z = _out.z;
    _out.hit = true;
  }

  return _out;
}

/** Is this point inside (or within `r` of) any box? Used for AI whiskers. */
export function overlapsAny(boxes, x, z, r) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  }
  return false;
}

/**
 * Nearest box hit along a ray.
 * @returns {{dist:number, nx:number, ny:number, nz:number}|null}
 */
export function rayBoxes(ox, oy, oz, dx, dy, dz, boxes, maxDist) {
  let best = maxDist;
  let hit = null;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    let tmin = 0;
    let tmax = best;
    let axis = -1;
    let sign = 1;

    // X slab
    let inv = dx !== 0 ? 1 / dx : Infinity;
    let t1 = (b.minX - ox) * inv;
    let t2 = (b.maxX - ox) * inv;
    let s = -1;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 0;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    // Y slab
    inv = dy !== 0 ? 1 / dy : Infinity;
    t1 = (b.minY - oy) * inv;
    t2 = (b.maxY - oy) * inv;
    s = -1;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 1;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    // Z slab
    inv = dz !== 0 ? 1 / dz : Infinity;
    t1 = (b.minZ - oz) * inv;
    t2 = (b.maxZ - oz) * inv;
    s = -1;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
      s = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      axis = 2;
      sign = s;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    if (tmin > 0 && tmin < best) {
      best = tmin;
      hit = {
        dist: tmin,
        nx: axis === 0 ? sign : 0,
        ny: axis === 1 ? sign : 0,
        nz: axis === 2 ? sign : 0,
      };
    }
  }

  return hit;
}

/** Ray vs. a vertical capsule-ish box around an entity (head/body split). */
export function rayBox(ox, oy, oz, dx, dy, dz, b, maxDist) {
  let tmin = 0;
  let tmax = maxDist;

  const axes = [
    [ox, dx, b.minX, b.maxX],
    [oy, dy, b.minY, b.maxY],
    [oz, dz, b.minZ, b.maxZ],
  ];

  for (let a = 0; a < 3; a++) {
    const [o, d, lo, hi] = axes[a];
    if (Math.abs(d) < 1e-8) {
      if (o < lo || o > hi) return null;
      continue;
    }
    const inv = 1 / d;
    let t1 = (lo - o) * inv;
    let t2 = (hi - o) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  return tmin > 0 ? tmin : null;
}
