import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeBox } from './collision.js';

/**
 * The level: one expensive apartment, at night, several floors above a city
 * that has seen better evenings.
 *
 * Open plan — a bed along the west wall, a sitting area facing the media
 * wall, a kitchenette and a wardrobe by the door, and a floor-to-ceiling
 * window looking out over the skyline.
 *
 * Everything static is merged per material, so the whole room is about a
 * dozen draw calls despite the amount of furniture.
 */

const W = 5.5; // half-width  (x: -5.5 .. 5.5)
const D = 4.5; // half-depth  (z: -4.5 .. 4.5)
const H = 3.2; // ceiling height

export class Room {
  constructor(scene, { shadows = true } = {}) {
    this.scene = scene;
    this.shadows = shadows;
    this.colliders = [];
    this.time = 0;
    this.group = new THREE.Group();
    scene.add(this.group);

    // Indoors you can see across the room, so the fog is only there to give
    // the city outside some depth.
    scene.fog = new THREE.FogExp2(0x0a1016, 0.017);
    scene.background = new THREE.Color(0x070b10);

    this.mat = {
      floor: new THREE.MeshLambertMaterial({ color: 0x7a5636 }),
      rug: new THREE.MeshLambertMaterial({ color: 0x4b3540 }),
      rugLight: new THREE.MeshLambertMaterial({ color: 0x6a6258 }),
      wall: new THREE.MeshLambertMaterial({ color: 0xe0d8ca }),
      trim: new THREE.MeshLambertMaterial({ color: 0xf2ece1 }),
      wood: new THREE.MeshLambertMaterial({ color: 0x5a3f28 }),
      woodDark: new THREE.MeshLambertMaterial({ color: 0x3a281a }),
      linen: new THREE.MeshLambertMaterial({ color: 0xd9d2c4 }),
      velvet: new THREE.MeshLambertMaterial({ color: 0x45465c }),
      sofa: new THREE.MeshLambertMaterial({ color: 0x4d5f70 }),
      marble: new THREE.MeshLambertMaterial({ color: 0xece7df }),
      brass: new THREE.MeshLambertMaterial({ color: 0xb08d4a }),
      dark: new THREE.MeshLambertMaterial({ color: 0x14171b }),
      screen: new THREE.MeshLambertMaterial({ color: 0x0d0f12 }),
      curtain: new THREE.MeshLambertMaterial({ color: 0x6b6a63 }),
      glass: new THREE.MeshLambertMaterial({
        color: 0x9fc0cc,
        transparent: true,
        opacity: 0.16,
      }),
      plant: new THREE.MeshLambertMaterial({ color: 0x3d6b3f }),
      pot: new THREE.MeshLambertMaterial({ color: 0x8a8378 }),
      art1: new THREE.MeshLambertMaterial({ color: 0x2f4a5c }),
      art2: new THREE.MeshLambertMaterial({ color: 0x7a4a3a }),
      shade: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
      bulb: new THREE.MeshBasicMaterial({ color: 0xffe0b0 }),
      exterior: new THREE.MeshLambertMaterial({ color: 0x0d1218 }),
    };

    this._geoms = {};
    this._build();
    this._flush();
    this._outside();
    this._lights();
  }

  // ---------------------------------------------------------------- builders

  _push(geo, matKey) {
    (this._geoms[matKey] ||= []).push(geo);
  }

  _flush() {
    for (const [key, geos] of Object.entries(this._geoms)) {
      if (!geos.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), this.mat[key]);
      const noShadow = key === 'glass' || key === 'shade' || key === 'bulb';
      mesh.castShadow = this.shadows && !noShadow && key !== 'floor' && key !== 'exterior';
      mesh.receiveShadow = this.shadows && !noShadow;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this._geoms = {};
  }

  /** Axis-aligned box, positioned by its centre. Solid by default. */
  _box(cx, cy, cz, w, h, d, matKey, solid = true) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, cy, cz);
    this._push(g, matKey);
    if (solid) this.colliders.push(makeBox(cx, cy - h / 2, cz, w, h, d));
    return g;
  }

  /** Box with no collision — pure decoration. */
  _deco(cx, cy, cz, w, h, d, matKey) {
    return this._box(cx, cy, cz, w, h, d, matKey, false);
  }

  _cyl(cx, cy, cz, r, h, matKey, solid = true, seg = 12) {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.translate(cx, cy, cz);
    this._push(g, matKey);
    if (solid) this.colliders.push(makeBox(cx, cy - h / 2, cz, r * 2, h, r * 2));
  }

  // ------------------------------------------------------------------ layout

  _build() {
    // ---- shell -----------------------------------------------------------
    this._deco(0, -0.06, 0, W * 2 + 0.6, 0.12, D * 2 + 0.6, 'wood'); // floor slab
    this._deco(0, H + 0.06, 0, W * 2 + 0.6, 0.12, D * 2 + 0.6, 'wall'); // ceiling slab

    const t = 0.14; // wall thickness
    // South wall (behind the door) and west wall are solid.
    this._box(0, H / 2, D + t / 2, W * 2, H, t, 'wall');
    this._box(-W - t / 2, H / 2, 0, t, H, D * 2, 'wall');
    this._box(W + t / 2, H / 2, 0, t, H, D * 2, 'wall');

    // North wall: built around the window opening.
    const winL = -3.4;
    const winR = 3.4;
    const winTop = 2.85;
    const winBot = 0.28;
    // left of the window
    this._box((-W + winL) / 2, H / 2, -D - t / 2, winL + W, H, t, 'wall');
    // right of the window
    this._box((winR + W) / 2, H / 2, -D - t / 2, W - winR, H, t, 'wall');
    // above and below the opening
    this._box((winL + winR) / 2, (H + winTop) / 2, -D - t / 2, winR - winL, H - winTop, t, 'wall');
    this._box((winL + winR) / 2, winBot / 2, -D - t / 2, winR - winL, winBot, t, 'wall');

    // ---- trim: skirting and crown ----------------------------------------
    const sk = 0.09;
    this._deco(0, sk / 2, -D + t, W * 2, sk, 0.06, 'trim');
    this._deco(0, sk / 2, D - t, W * 2, sk, 0.06, 'trim');
    this._deco(-W + t, sk / 2, 0, 0.06, sk, D * 2, 'trim');
    this._deco(W - t, sk / 2, 0, 0.06, sk, D * 2, 'trim');
    const crown = H - 0.1;
    this._deco(0, crown, -D + t, W * 2, 0.1, 0.09, 'trim');
    this._deco(0, crown, D - t, W * 2, 0.1, 0.09, 'trim');
    this._deco(-W + t, crown, 0, 0.09, 0.1, D * 2, 'trim');
    this._deco(W - t, crown, 0, 0.09, 0.1, D * 2, 'trim');

    // ---- window: frame, mullions, glass, sill, curtains -------------------
    const zw = -D - t / 2;
    this._deco((winL + winR) / 2, (winTop + winBot) / 2, zw, winR - winL, winTop - winBot, 0.04, 'glass');
    // frame
    this._deco((winL + winR) / 2, winTop, zw - 0.02, winR - winL + 0.12, 0.12, 0.14, 'dark');
    this._deco((winL + winR) / 2, winBot, zw - 0.02, winR - winL + 0.12, 0.12, 0.14, 'dark');
    this._deco(winL, (winTop + winBot) / 2, zw - 0.02, 0.12, winTop - winBot, 0.14, 'dark');
    this._deco(winR, (winTop + winBot) / 2, zw - 0.02, 0.12, winTop - winBot, 0.14, 'dark');
    // mullions
    for (const x of [-1.7, 0, 1.7]) {
      this._deco(x, (winTop + winBot) / 2, zw - 0.01, 0.07, winTop - winBot, 0.09, 'dark');
    }
    this._deco((winL + winR) / 2, 1.95, zw - 0.01, winR - winL, 0.06, 0.09, 'dark');
    // marble sill
    this._deco((winL + winR) / 2, winBot - 0.04, -D + 0.14, winR - winL + 0.3, 0.08, 0.3, 'marble');
    // Curtains, drawn back. They stop below the crown moulding — a drape
    // that runs through the ceiling is the kind of thing you notice once and
    // then cannot stop seeing.
    const drapeH = winTop + 0.15;
    for (const s of [-1, 1]) {
      this._deco(s * (3.35 + 0.22), drapeH / 2, -D + 0.25, 0.44, drapeH, 0.16, 'curtain');
      this._deco(s * 3.1, drapeH / 2, -D + 0.34, 0.34, drapeH, 0.12, 'curtain');
    }
    this._deco(0, drapeH + 0.05, -D + 0.25, winR - winL + 1.2, 0.08, 0.16, 'dark'); // rail

    // ---- bed (west wall) --------------------------------------------------
    const bx = -3.75; // bed centre
    this._deco(-5.35, 0.78, 0, 0.14, 1.56, 2.3, 'velvet'); // tall headboard
    this._deco(-5.3, 1.5, 0, 0.1, 0.1, 2.2, 'brass'); // brass trim on top
    this._box(bx, 0.28, 0, 2.5, 0.56, 2.2, 'woodDark'); // frame
    this._deco(bx, 0.58, 0, 2.45, 0.3, 2.1, 'linen'); // mattress
    this._deco(bx - 0.15, 0.75, 0, 2.05, 0.14, 2.12, 'linen'); // duvet
    this._deco(bx + 0.85, 0.72, 0, 0.42, 0.1, 2.14, 'velvet'); // folded throw
    // pillows
    for (const s of [-1, 1]) {
      this._deco(-4.62, 0.82, s * 0.52, 0.5, 0.2, 0.85, 'linen');
      this._deco(-4.3, 0.79, s * 0.42, 0.42, 0.16, 0.7, 'linen');
    }
    this._deco(-4.35, 0.83, 0, 0.35, 0.24, 0.5, 'velvet'); // cushion

    // rug under the bed
    this._deco(-3.4, 0.008, 0, 4.2, 0.016, 4.4, 'rug');

    // ---- nightstands + lamps ----------------------------------------------
    this.drawerPos = new THREE.Vector3(-4.82, 0.58, -1.72);
    for (const s of [-1, 1]) {
      const nz = s * 1.62;
      this._box(-5.05, 0.28, nz, 0.6, 0.56, 0.55, 'wood');
      this._deco(-5.05, 0.56, nz, 0.64, 0.04, 0.58, 'marble');
      this._deco(-5.05, 0.14, nz + s * 0.1, 0.5, 0.24, 0.4, 'woodDark'); // drawer front
      this._deco(-5.05, 0.14, nz + s * 0.1, 0.16, 0.05, 0.05, 'brass'); // handle
      // table lamp
      this._deco(-5.05, 0.62, nz, 0.12, 0.22, 0.12, 'brass');
      this._deco(-5.05, 0.86, nz, 0.34, 0.28, 0.34, 'shade');
    }

    // ---- sitting area (east) ----------------------------------------------
    this._deco(2.7, 0.008, 0.2, 4.6, 0.016, 4.2, 'rugLight'); // rug

    // Sofa facing the media wall (+x). The group is pulled west so there is
    // a walkable aisle between the coffee table and the console — otherwise
    // the television is something you can see but never touch.
    this._box(1.95, 0.34, 0, 0.95, 0.42, 2.5, 'sofa'); // seat
    this._box(2.35, 0.72, 0, 0.18, 0.55, 2.5, 'sofa'); // back
    this._box(1.95, 0.6, -1.32, 0.95, 0.3, 0.16, 'sofa'); // arm L
    this._box(1.95, 0.6, 1.32, 0.95, 0.3, 0.16, 'sofa'); // arm R
    this._deco(1.85, 0.6, -0.62, 0.7, 0.14, 0.62, 'linen'); // cushions
    this._deco(1.85, 0.6, 0.62, 0.7, 0.14, 0.62, 'velvet');
    this._deco(2.2, 0.78, -0.95, 0.22, 0.42, 0.42, 'velvet'); // throw pillows
    this._deco(2.2, 0.78, 0.95, 0.22, 0.42, 0.42, 'linen');
    for (const sx of [1.6, 2.3]) {
      for (const sz of [-1.1, 1.1]) this._deco(sx, 0.06, sz, 0.08, 0.12, 0.08, 'woodDark');
    }

    // coffee table: marble top on a brass frame
    this._box(3.15, 0.4, 0, 0.7, 0.06, 1.5, 'marble');
    for (const sx of [2.9, 3.4]) {
      for (const sz of [-0.6, 0.6]) this._deco(sx, 0.2, sz, 0.05, 0.4, 0.05, 'brass');
    }
    this._deco(3.15, 0.47, -0.35, 0.3, 0.04, 0.3, 'dark'); // a book
    this._deco(3.2, 0.47, 0.3, 0.1, 0.22, 0.1, 'brass'); // a candle
    this._deco(3.2, 0.61, 0.3, 0.05, 0.06, 0.05, 'bulb');

    // media wall
    this._box(5.05, 0.26, 0, 0.7, 0.52, 3.2, 'woodDark'); // console
    this._deco(5.05, 0.53, 0, 0.76, 0.06, 3.3, 'marble'); // marble top
    this._deco(5.05, 0.16, -1.0, 0.02, 0.24, 1.1, 'brass'); // drawer lines
    this._deco(5.05, 0.16, 1.0, 0.02, 0.24, 1.1, 'brass');
    this.tvPos = new THREE.Vector3(5.2, 1.7, 0);
    this._deco(5.3, 1.72, 0, 0.08, 1.5, 2.4, 'screen'); // tv panel
    this._deco(5.36, 1.72, 0, 0.03, 1.42, 2.3, 'dark'); // bezel
    this._deco(5.05, 0.62, -1.3, 0.3, 0.16, 0.3, 'dark'); // speaker box

    // ---- bookshelf (south-east) -------------------------------------------
    const shx = 1.95;
    this._box(shx, 1.05, D - 0.35, 2.2, 2.1, 0.5, 'wood');
    for (let i = 0; i < 4; i++) {
      const y = 0.25 + i * 0.45;
      this._deco(shx, y, D - 0.34, 2.1, 0.05, 0.48, 'woodDark');
      // books
      let x = shx - 0.95;
      let n = 0;
      while (x < shx + 0.9 && n < 26) {
        const bw = 0.05 + Math.random() * 0.09;
        const bh = 0.24 + Math.random() * 0.1;
        const key = ['art1', 'art2', 'linen', 'velvet', 'brass'][(Math.random() * 5) | 0];
        this._deco(x + bw / 2, y + 0.03 + bh / 2, D - 0.32, bw, bh, 0.32, key);
        x += bw + 0.012;
        n++;
      }
    }

    // ---- wardrobe + kitchenette (south wall) ------------------------------
    this._box(-3.6, 1.15, D - 0.42, 2.4, 2.3, 0.55, 'woodDark'); // wardrobe
    this._deco(-3.6, 1.15, D - 0.68, 2.3, 2.2, 0.04, 'wood');
    this._deco(-3.6, 1.15, D - 0.7, 0.04, 2.2, 0.03, 'brass'); // door gap
    this._deco(-3.2, 1.15, D - 0.7, 0.05, 0.4, 0.05, 'brass'); // handles
    this._deco(-4.0, 1.15, D - 0.7, 0.05, 0.4, 0.05, 'brass');

    // kitchenette: counter, cabinets, bottles
    this._box(-0.2, 0.45, D - 0.35, 1.9, 0.9, 0.6, 'wood');
    this._deco(-0.2, 0.92, D - 0.35, 1.98, 0.06, 0.66, 'marble');
    this._deco(-0.2, 0.2, D - 0.64, 1.8, 0.5, 0.04, 'woodDark');
    this._deco(-0.2, 1.6, D - 0.42, 1.9, 0.7, 0.36, 'wood'); // upper cabinets
    this._deco(-0.2, 0.06, D - 0.05, 1.9, 0.08, 0.06, 'brass'); // kick plate
    for (let i = 0; i < 5; i++) {
      this._cyl(-0.9 + i * 0.34, 1.14, D - 0.35, 0.045, 0.36, 'glass', false, 8);
    }

    // ---- door (south wall, east corner) -----------------------------------
    // Pushed into the corner so the wall beside it is free for the switch.
    this.doorX = 4.4;
    this._deco(this.doorX, 1.05, D - 0.06, 1.05, 2.1, 0.1, 'woodDark'); // leaf
    this._deco(this.doorX + 0.38, 1.02, D - 0.12, 0.14, 0.05, 0.05, 'brass'); // handle
    this._deco(this.doorX, 2.16, D - 0.06, 1.25, 0.12, 0.14, 'trim'); // lintel
    this._deco(this.doorX - 0.6, 1.05, D - 0.06, 0.1, 2.1, 0.12, 'trim');
    this._deco(this.doorX + 0.6, 1.05, D - 0.06, 0.1, 2.1, 0.12, 'trim');

    // ---- light switch ------------------------------------------------------
    // In the clear stretch of wall between the bookshelf and the door frame.
    this.switchPos = new THREE.Vector3(3.35, 1.25, D - 0.08);
    const sw = this.switchPos;
    this._deco(sw.x, sw.y, D - 0.05, 0.17, 0.26, 0.04, 'trim');
    this._deco(sw.x, sw.y, D - 0.08, 0.12, 0.2, 0.03, 'dark');
    this._deco(sw.x, sw.y + 0.04, D - 0.1, 0.08, 0.05, 0.02, 'brass');

    // ---- odds and ends -----------------------------------------------------
    // floor lamp
    this._cyl(4.7, 0.05, -2.6, 0.22, 0.1, 'woodDark', false);
    this._deco(4.7, 0.85, -2.6, 0.05, 1.7, 0.05, 'brass');
    this._deco(4.7, 1.85, -2.6, 0.42, 0.36, 0.42, 'shade');
    // plant
    this._cyl(-1.1, 0.28, -3.3, 0.3, 0.56, 'pot');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this._deco(
        -1.1 + Math.cos(a) * 0.22,
        0.75 + Math.random() * 0.5,
        -3.3 + Math.sin(a) * 0.22,
        0.12,
        0.7,
        0.12,
        'plant'
      );
    }
    // wall art
    // Two canvases: one on the south wall between the wardrobe and the
    // kitchen, one beside the window. Neither may sit inside the glazing.
    this._deco(-1.75, 1.8, D - 0.09, 1.1, 0.95, 0.05, 'trim');
    this._deco(-1.75, 1.8, D - 0.05, 0.98, 0.83, 0.03, 'art1');
    this._deco(-4.4, 1.8, -D + 0.09, 1.3, 1.0, 0.05, 'trim');
    this._deco(-4.4, 1.8, -D + 0.05, 1.18, 0.88, 0.03, 'art2');
    // ceiling cove + pendant
    this._deco(0, H - 0.16, 0, W * 2 - 0.8, 0.12, D * 2 - 0.8, 'trim');
    this._deco(0, H - 0.34, 0, 0.05, 0.4, 0.05, 'brass');
    this._deco(0, H - 0.62, 0, 0.7, 0.16, 0.7, 'shade');
    this._deco(0, H - 0.74, 0, 0.16, 0.1, 0.16, 'bulb');
  }

  // --------------------------------------------------------------- outside

  /** The city. Only ever seen through the window, so it can be crude. */
  _outside() {
    const geos = [];
    let seed = 7717;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < 46; i++) {
      const x = (rnd() - 0.5) * 130;
      const z = -13 - rnd() * 65;
      const w = 4 + rnd() * 12;
      const d = 4 + rnd() * 12;
      const h = 8 + rnd() * 46;
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(x, h / 2 - 24, z);
      geos.push(g);
    }
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), this.mat.exterior);
    mesh.matrixAutoUpdate = false;
    this.scene.add(mesh);
    geos.forEach((g) => g.dispose());

    // Street far below, so the window does not open onto nothing.
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshLambertMaterial({ color: 0x0a0e13 })
    );
    street.rotation.x = -Math.PI / 2;
    street.position.y = -24;
    this.scene.add(street);

    // A thousand lit windows.
    const count = 900;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = -22 + Math.random() * 46;
      pos[i * 3 + 2] = -13 - Math.random() * 62;
      const warm = Math.random();
      col[i * 3] = 0.9 + warm * 0.1;
      col[i * 3 + 1] = 0.62 + warm * 0.25;
      col[i * 3 + 2] = 0.28 + warm * 0.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.55,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        fog: true,
      })
    );
    points.frustumCulled = false;
    this.scene.add(points);
    this.cityLights = points;
  }

  // ---------------------------------------------------------------- lights

  _lights() {
    this.scene.add(new THREE.AmbientLight(0x2c3442, 0.55));
    this.scene.add(new THREE.HemisphereLight(0x3a4a63, 0x14100c, 0.4));

    // Cool light from the window — the city does most of the work.
    const city = new THREE.DirectionalLight(0x8fb4d8, 0.85);
    city.position.set(-4, 6, -18);
    if (this.shadows) {
      city.castShadow = true;
      city.shadow.mapSize.set(1024, 1024);
      const c = city.shadow.camera;
      c.left = -9;
      c.right = 9;
      c.top = 9;
      c.bottom = -9;
      c.near = 1;
      c.far = 40;
      city.shadow.bias = -0.0015;
      city.shadow.normalBias = 0.02;
    }
    this.scene.add(city);
    this.cityLight = city;

    // Practical lamps — the warm pools that make the room feel lived in.
    this.lamps = [];
    const make = (x, y, z, intensity, color = 0xffcf9a) => {
      const l = new THREE.PointLight(color, intensity, 9, 2);
      l.position.set(x, y, z);
      this.scene.add(l);
      this.lamps.push({ light: l, base: intensity, phase: Math.random() * 7 });
      return l;
    };

    this.ceilingLight = make(0, H - 0.7, 0, 34, 0xffe0b8);
    this.lampL = make(-5.05, 0.86, -1.62, 16);
    this.lampR = make(-5.05, 0.86, 1.62, 16);
    this.floorLamp = make(4.7, 1.85, -2.6, 20);
    // The television is its own circuit — it can come on by itself.
    this.tvLight = make(4.6, 1.7, 0, 0, 0x6fa8ff);

    this.practicals = [this.ceilingLight, this.lampL, this.lampR, this.floorLamp];
    this.lightsOn = true;
    this.tvOn = false;
    this._flicker = 1;
  }

  /** The switch by the door: every warm lamp in the room, on or off. */
  setCeilingLight(on) {
    this.lightsOn = !!on;
  }

  /** Television on or off — static, a cold blue wash, and a hum of light. */
  setTv(on) {
    this.tvOn = !!on;
    this.mat.screen.color.setHex(on ? 0x8fb6ff : 0x0d0f12);
  }

  /**
   * 0..1 dimmer for the practical lamps, used for the stutter. 1 is normal.
   */
  setFlicker(v) {
    this._flicker = THREE.MathUtils.clamp(v, 0, 1);
  }

  update(dt) {
    this.time += dt;

    // A very slight, very slow breath on each lamp. Not a flicker — this is a
    // nice apartment, and it is only nervous because you are.
    const lit = this.lightsOn ? this._flicker : 0;
    for (const l of this.lamps) {
      const breathe = 0.97 + 0.03 * Math.sin(this.time * 1.3 + l.phase);
      l.light.intensity = l.base * breathe * lit;
    }

    // Dead-channel static: a cold light that never quite settles.
    if (this.tvOn) {
      const n = 0.72 + Math.random() * 0.5;
      this.tvLight.intensity = 9 * n;
      this.mat.screen.color.setRGB(0.36 * n, 0.48 * n, 0.85 * n);
    } else {
      this.tvLight.intensity = 0;
    }
  }
}

export const ROOM_BOUNDS = { W, D, H };

/**
 * Where the player wakes up: in the open aisle down the middle of the room,
 * looking straight at the window and the city beyond it. (Anywhere else and
 * the first thing you see is the back of a sofa.)
 */
export const ROOM_SPAWN = { x: 0.2, z: 3.0, yaw: 0 };
