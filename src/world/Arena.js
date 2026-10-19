import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeBox } from './collision.js';

/** Lamp post positions: [x, z, hasPost] */
const LAMP_SPOTS = [
  [-26, -26, true],
  [26, -24, true],
  [24, 28, true],
  [-28, 6, true],
  [8, -29, false],
  [-18, 18, false], // hangs inside the shed
];

/**
 * The level: a fog-soaked industrial yard on the edge of a dead city.
 *
 * Everything static is merged per material, so the whole set dressing costs
 * about six draw calls — the rest of the frame budget goes to the horde.
 */
export class Arena {
  constructor(scene, { shadows = true, maxLamps = 5 } = {}) {
    this.scene = scene;
    this.shadows = shadows;
    this.maxLamps = maxLamps;
    this.colliders = [];
    this.spawnPoints = [];
    this.lamps = [];
    this.time = 0;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.mat = {
      asphalt: new THREE.MeshLambertMaterial({ color: 0x1b1f24 }),
      concrete: new THREE.MeshLambertMaterial({ color: 0x3c4249 }),
      rust: new THREE.MeshLambertMaterial({ color: 0x6b4634 }),
      metal: new THREE.MeshLambertMaterial({ color: 0x545c66 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x5c4730 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x1d2126 }),
      blood: new THREE.MeshBasicMaterial({ color: 0x3d0a0c, transparent: true, opacity: 0.85 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xffc06a }),
      redGlow: new THREE.MeshBasicMaterial({ color: 0xff2b1f }),
    };

    this._geoms = {};
    this._build();
    this._flush();
    this._lights();
    this._sky();
    this._skyline();
    this._dust();
  }

  // ---------------------------------------------------------------- builders

  _push(geo, matKey) {
    (this._geoms[matKey] ||= []).push(geo);
  }

  _flush() {
    for (const [key, geos] of Object.entries(this._geoms)) {
      if (!geos.length) continue;
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, this.mat[key]);
      const isLight = key === 'glow' || key === 'redGlow' || key === 'blood';
      mesh.castShadow = this.shadows && !isLight;
      mesh.receiveShadow = this.shadows && !isLight;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this._geoms = {};
  }

  /** Axis-aligned crate / wall / container. Solid by default. */
  _box(x, z, w, d, h, matKey, y = 0, solid = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y + h / 2, z);
    this._push(geo, matKey);
    if (solid) this.colliders.push(makeBox(x, y, z, w, h, d));
  }

  _barrel(x, z) {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 1.15, 10, 1, false);
    geo.translate(x, 0.575, z);
    this._push(geo, 'rust');
    this.colliders.push(makeBox(x, 0, z, 0.84, 1.15, 0.84));
  }

  _blood(x, z, r) {
    const geo = new THREE.CircleGeometry(r, 10);
    geo.rotateX(-Math.PI / 2);
    geo.translate(x, 0.012, z);
    this._push(geo, 'blood');
  }

  // ------------------------------------------------------------------ layout

  _build() {
    // Ground. Oversized on purpose: the fog swallows the horizon so the
    // player never sees the edge of the world.
    const ground = new THREE.PlaneGeometry(320, 320);
    ground.rotateX(-Math.PI / 2);
    this._push(ground, 'asphalt');

    const R = 32;
    const T = 1.6;

    // Perimeter: tall concrete blast walls.
    this._box(0, -R - T / 2, R * 2 + T * 2, T, 9, 'concrete');
    this._box(0, R + T / 2, R * 2 + T * 2, T, 9, 'concrete');
    this._box(-R - T / 2, 0, T, R * 2, 9, 'concrete');
    this._box(R + T / 2, 0, T, R * 2, 9, 'concrete');

    // --- the shed: four walls, doorway on the south side --------------------
    const sx = -18;
    const sz = 18;
    this._box(sx, sz - 5, 12, 0.45, 4, 'concrete');
    this._box(sx - 3.6, sz + 5, 4.6, 0.45, 4, 'concrete');
    this._box(sx + 3.6, sz + 5, 4.6, 0.45, 4, 'concrete');
    this._box(sx - 6, sz, 0.45, 10, 4, 'concrete');
    this._box(sx + 6, sz, 0.45, 10, 4, 'concrete');
    this._box(sx + 3, sz - 2.5, 4, 1, 0.9, 'wood'); // workbench
    this._box(sx - 3, sz + 1, 1.2, 1.2, 1.2, 'wood');

    // --- shipping containers ----------------------------------------------
    this._box(-16, -12, 13, 3.2, 3.4, 'rust');
    this._box(-16, -6.5, 13, 3.2, 3.4, 'metal');
    this._box(12, -16, 3.2, 11, 3.4, 'rust');
    this._box(18, -4, 9, 3.2, 3.4, 'metal');
    this._box(2, 22, 11, 3.2, 3.4, 'rust');
    this._box(-6, -22, 3.2, 9, 3.4, 'metal');
    this._box(24, 12, 3.2, 10, 3.4, 'rust');
    this._box(-27, 2, 3.2, 12, 3.4, 'metal');

    // --- wrecked truck ------------------------------------------------------
    this._box(22, 23, 6.6, 2.8, 2.6, 'dark');
    this._box(18.4, 23, 1.8, 2.6, 2.1, 'rust');

    // --- concrete barriers: a half-hearted roadblock ------------------------
    const barriers = [
      [-2, -3],
      [0.6, -3],
      [3.2, -3],
      [-3.4, 1.5],
      [-3.4, 3.6],
      [8, 6],
      [10.4, 6],
      [-24, -20],
      [-21.6, -20],
      [26, -10],
      [26, -7.6],
      [-14, 28],
      [-11.6, 28],
    ];
    for (const [x, z] of barriers) this._box(x, z, 2.4, 1.1, 1.25, 'concrete');

    // --- crates -------------------------------------------------------------
    const crates = [
      [-9, -18, 1.3],
      [-8, -16.6, 1.1],
      [6, -9, 1.4],
      [6.9, -8.1, 1.1],
      [13, 4, 1.5],
      [-23, 12, 1.2],
      [20, 18, 1.3],
      [-2, 12, 1.4],
      [28, 22, 1.2],
      [-29, -12, 1.3],
      [16, -24, 1.4],
      [-12, 6, 1.2],
    ];
    for (const [x, z, s] of crates) this._box(x, z, s, s, s, 'wood');

    // --- barrels ------------------------------------------------------------
    const barrels = [
      [-11, -9],
      [-10.2, -9.7],
      [4, -12],
      [4.9, -11.4],
      [21, 2],
      [21.8, 3],
      [-21, -4],
      [-20.2, -4.8],
      [9, 15],
      [-4, -14],
      [29, -18],
      [-30, 20],
      [12, 27],
      [26, -22],
    ];
    for (const [x, z] of barrels) this._barrel(x, z);

    // --- fence runs ---------------------------------------------------------
    const fences = [
      [-31, 8, 0.3, 14],
      [-30, -29.5, 12, 0.3],
      [31, -30, 0.3, 8],
      [8, 31, 16, 0.3],
    ];
    for (const [x, z, w, d] of fences) this._box(x, z, w, d, 2.2, 'dark');

    // --- lamp posts ---------------------------------------------------------
    for (const [x, z, withPost] of LAMP_SPOTS) {
      if (!withPost) continue;
      this._box(x, z, 0.22, 0.22, 4.2, 'dark');
      this._box(x + 0.5, z, 1.1, 0.16, 0.16, 'dark', 4.05, false);
    }

    // --- blood on the asphalt ----------------------------------------------
    const splats = [
      [-5, -6, 2.2],
      [7, 3, 1.6],
      [-14, 14, 2.6],
      [17, -12, 1.9],
      [0, 20, 2.1],
      [-25, -26, 1.5],
      [24, 6, 1.8],
      [-8, 25, 1.4],
      [11, -20, 2.4],
    ];
    for (const [x, z, r] of splats) this._blood(x, z, r);

    // --- where the horde climbs in -----------------------------------------
    this.spawnPoints = [
      new THREE.Vector3(-28, 0, -27),
      new THREE.Vector3(0, 0, -30.5),
      new THREE.Vector3(30, 0, -30),
      new THREE.Vector3(-30.5, 0, 0),
      new THREE.Vector3(30.5, 0, 0),
      new THREE.Vector3(-30, 0, 30),
      new THREE.Vector3(4, 0, 28.5),
      new THREE.Vector3(30, 0, 30),
      new THREE.Vector3(-24, 0, -12),
      new THREE.Vector3(22, 0, -26),
      new THREE.Vector3(28, 0, 17),
      new THREE.Vector3(-28, 0, 24),
      new THREE.Vector3(-18, 0, 6),
      new THREE.Vector3(14, 0, 10),
    ];
  }

  // -------------------------------------------------------------------- sky

  /**
   * Stars and a moon, parked just inside the far plane with fog disabled so
   * they survive the murk. Small, cheap, and it stops the sky from being a
   * flat dead colour.
   */
  _sky() {
    const count = 320;
    const pos = new Float32Array(count * 3);
    const shade = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Upper hemisphere only.
      const theta = Math.random() * Math.PI * 2;
      const y = 0.12 + Math.random() * 0.88;
      const r = Math.sqrt(1 - y * y);
      // Keep the whole shell inside the camera's far plane.
      const R = 96;
      pos[i * 3] = Math.cos(theta) * r * R;
      pos[i * 3 + 1] = y * R * 0.75 + 4;
      pos[i * 3 + 2] = Math.sin(theta) * r * R;
      const b = 0.35 + Math.random() * 0.65;
      shade[i * 3] = b * 0.85;
      shade[i * 3 + 1] = b * 0.92;
      shade[i * 3 + 2] = b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthWrite: false,
    });
    const stars = new THREE.Points(geo, mat);
    stars.frustumCulled = false;
    this.scene.add(stars);

    // Moon: a flat disc plus a soft halo, fixed over the north-east wall.
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 24),
      new THREE.MeshBasicMaterial({
        color: 0xdfe8f2,
        fog: false,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      })
    );
    moon.position.set(70, 46, -88);
    moon.lookAt(0, 6, 0);
    this.scene.add(moon);

    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(17, 24),
      new THREE.MeshBasicMaterial({
        color: 0x8fb0cf,
        fog: false,
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    halo.position.copy(moon.position);
    halo.lookAt(0, 6, 0);
    this.scene.add(halo);
  }

  /** Dead city on the horizon — pure silhouette, no collision, no cost. */
  _skyline() {
    const geos = [];
    let seed = 20261019;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < 46; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 46 + rnd() * 52;
      const w = 5 + rnd() * 13;
      const d = 5 + rnd() * 13;
      const h = 7 + rnd() * 34;
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(Math.cos(angle) * dist, h / 2 - 1, Math.sin(angle) * dist);
      geos.push(g);
    }

    // A few radio masts for shape.
    for (let i = 0; i < 5; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 55 + rnd() * 40;
      const h = 30 + rnd() * 22;
      const g = new THREE.BoxGeometry(0.7, h, 0.7);
      g.translate(Math.cos(angle) * dist, h / 2 - 1, Math.sin(angle) * dist);
      geos.push(g);
    }

    const mesh = new THREE.Mesh(
      mergeGeometries(geos, false),
      new THREE.MeshBasicMaterial({ color: 0x0c1215 })
    );
    mesh.matrixAutoUpdate = false;
    this.scene.add(mesh);
    geos.forEach((g) => g.dispose());
  }

  /** Slow floating dust: the thing that makes a flashlight beam feel real. */
  _dust() {
    const count = 420;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 66;
      pos[i * 3 + 1] = Math.random() * 7 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 66;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x9fb0bb,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  // ------------------------------------------------------------------ lights

  _lights() {
    // Low, but not blacked out: you need a faint moonlit base or every dark
    // surface turns into the same shapeless mush on a phone screen.
    this.scene.add(new THREE.AmbientLight(0x2a3a4c, 0.5));
    this.scene.add(new THREE.HemisphereLight(0x33465f, 0x0a0d10, 0.45));

    const moon = new THREE.DirectionalLight(0x93a9cf, 0.9);
    moon.position.set(26, 40, -20);
    if (this.shadows) {
      moon.castShadow = true;
      moon.shadow.mapSize.set(1024, 1024);
      const c = moon.shadow.camera;
      c.left = -40;
      c.right = 40;
      c.top = 40;
      c.bottom = -40;
      c.near = 1;
      c.far = 120;
      moon.shadow.bias = -0.0012;
      moon.shadow.normalBias = 0.03;
    }
    this.scene.add(moon);
    this.moon = moon;

    const bulbGeo = new THREE.SphereGeometry(0.2, 8, 6);
    LAMP_SPOTS.forEach(([x, z], i) => {
      const y = 4.15;
      const base = 78;

      // Every lamp gets a glowing bulb, but only the first `maxLamps` get a
      // real light — each point light costs shader time on every pixel, and
      // phones have very little of that to spare.
      const lit = i < this.maxLamps;
      let light = null;
      if (lit) {
        light = new THREE.PointLight(0xffa54f, base, 30, 2);
        light.position.set(x, y, z);
        this.scene.add(light);
      }

      const bulb = new THREE.Mesh(bulbGeo, this.mat.glow);
      bulb.position.set(x, y, z);
      this.group.add(bulb);

      this.lamps.push({
        light,
        bulb,
        base,
        phase: Math.random() * Math.PI * 2,
        speed: 5 + Math.random() * 9,
        timer: Math.random() * 3,
        dropout: 0,
      });
    });

    // A dying emergency light over the shed door.
    const red = new THREE.PointLight(0xff2b1f, 26, 16, 2);
    red.position.set(-18, 3.4, 13.2);
    this.scene.add(red);
    this.redLight = red;
    const redBulb = new THREE.Mesh(bulbGeo, this.mat.redGlow);
    redBulb.position.copy(red.position);
    this.group.add(redBulb);
    this.redBulb = redBulb;
  }

  /** Pick a spawn point far enough from the player to feel fair. */
  pickSpawn(playerPos, minDist = 18) {
    let best = this.spawnPoints[0];
    let bestD = -1;
    for (let i = 0; i < 7; i++) {
      const p = this.spawnPoints[(Math.random() * this.spawnPoints.length) | 0];
      const d = p.distanceTo(playerPos);
      if (d >= minDist) return p;
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  update(dt) {
    this.time += dt;

    // Dust drifts. Rotating the whole cloud is far cheaper than moving 420
    // particles, and in the dark nobody can tell the difference.
    if (this.dust) {
      this.dust.rotation.y += dt * 0.006;
      this.dust.position.y = Math.sin(this.time * 0.25) * 0.35;
    }

    for (const l of this.lamps) {
      l.timer -= dt;
      if (l.timer <= 0) {
        l.dropout = Math.random() < 0.22 ? 0.12 + Math.random() * 0.3 : 0;
        l.timer = 0.7 + Math.random() * 2.6;
      }
      if (l.dropout > 0) l.dropout -= dt;

      const flicker = 0.85 + 0.15 * Math.sin(this.time * l.speed + l.phase);
      const alive = l.dropout > 0 ? 0.12 : 1;
      if (l.light) l.light.intensity = l.base * flicker * alive;
      l.bulb.visible = alive > 0.5;
    }

    // Slow red pulse over the shed.
    const p = 0.55 + 0.45 * Math.sin(this.time * 1.9);
    this.redLight.intensity = 8 + p * 26;
    this.redBulb.visible = p > 0.35;
  }
}
