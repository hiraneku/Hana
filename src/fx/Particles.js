import * as THREE from 'three';

/**
 * One THREE.Points object drives every blood spray, dust puff and spark in
 * the game — a single draw call, no allocations during play.
 */
export class Particles {
  constructor(scene, count = 320) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.cursor = 0;

    for (let i = 0; i < count; i++) this.pos[i * 3 + 1] = -999;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
      fog: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(x, y, z, n, color, speed = 3, spread = 1, life = 0.5) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const i3 = i * 3;

      this.pos[i3] = x;
      this.pos[i3 + 1] = y;
      this.pos[i3 + 2] = z;

      const theta = Math.random() * Math.PI * 2;
      const up = 0.25 + Math.random() * 0.9;
      const s = speed * (0.35 + Math.random() * 0.9);
      this.vel[i3] = Math.cos(theta) * s * spread;
      this.vel[i3 + 1] = up * s;
      this.vel[i3 + 2] = Math.sin(theta) * s * spread;

      this.base[i3] = color.r;
      this.base[i3 + 1] = color.g;
      this.base[i3 + 2] = color.b;

      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.7);
    }
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      dirty = true;
      const i3 = i * 3;

      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i3 + 1] = -999;
        this.col[i3] = this.col[i3 + 1] = this.col[i3 + 2] = 0;
        continue;
      }

      this.vel[i3 + 1] -= 11 * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;

      if (this.pos[i3 + 1] < 0.03) {
        this.pos[i3 + 1] = 0.03;
        this.vel[i3] *= 0.45;
        this.vel[i3 + 2] *= 0.45;
        this.vel[i3 + 1] *= -0.22;
      }

      const t = this.life[i] / this.maxLife[i];
      this.col[i3] = this.base[i3] * t;
      this.col[i3 + 1] = this.base[i3 + 1] * t;
      this.col[i3 + 2] = this.base[i3 + 2] * t;
    }

    if (dirty) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
    }
  }

  clear() {
    for (let i = 0; i < this.count; i++) {
      this.life[i] = 0;
      this.pos[i * 3 + 1] = -999;
      this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

export const COLORS = {
  blood: new THREE.Color(0x8e1216),
  bloodDark: new THREE.Color(0x4a0a0d),
  dust: new THREE.Color(0x6a6f75),
  spark: new THREE.Color(0xffc061),
};
