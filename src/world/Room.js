import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeBox } from './collision.js';

/**
 * HANA — Kamar 14B (Luxury Revamp)
 * Apartemen mewah 1BR open-plan: bedroom barat, kitchen + island selatan,
 * living timur, dan workstation gaming di utara dekat jendela kota.
 * Semua furniture built dari code — no external assets.
 */

const W = 5.5;
const D = 4.5;
const H = 3.2;

export class Room {
  constructor(scene, { shadows = true } = {}) {
    this.scene = scene;
    this.shadows = shadows;
    this.colliders = [];
    this.time = 0;
    this.group = new THREE.Group();
    scene.add(this.group);

    scene.fog = new THREE.FogExp2(0x0a1016, 0.017);
    scene.background = new THREE.Color(0x070b10);

    this.mat = {
      floor: new THREE.MeshStandardMaterial({ color: 0x8b6a44, roughness: 0.78, metalness: 0.02 }),
      floorDark: new THREE.MeshStandardMaterial({ color: 0x7a5b37, roughness: 0.82 }),
      rug: new THREE.MeshStandardMaterial({ color: 0xe9e0d1, roughness: 0.96 }),
      rugBorder: new THREE.MeshStandardMaterial({ color: 0xc7b7a0, roughness: 0.9 }),
      rugLight: new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.97 }),
      wall: new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.92 }),
      wallAccent: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.8 }),
      trim: new THREE.MeshStandardMaterial({ color: 0xf2ece1, roughness: 0.55 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.66, metalness: 0.06 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x352011, roughness: 0.72 }),
      oak: new THREE.MeshStandardMaterial({ color: 0xa88b69, roughness: 0.68 }),
      oakLight: new THREE.MeshStandardMaterial({ color: 0xc7ad94, roughness: 0.65 }),
      linen: new THREE.MeshStandardMaterial({ color: 0xf4ece0, roughness: 0.92 }),
      linenWarm: new THREE.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 0.94 }),
      velvet: new THREE.MeshStandardMaterial({ color: 0x283544, roughness: 0.98 }),
      velvetEmerald: new THREE.MeshStandardMaterial({ color: 0x2f4d43, roughness: 0.96 }),
      sofa: new THREE.MeshStandardMaterial({ color: 0xddd8cf, roughness: 0.97 }),
      sofaCushion: new THREE.MeshStandardMaterial({ color: 0xc9b9a3, roughness: 0.94 }),
      leather: new THREE.MeshStandardMaterial({ color: 0xc49a6a, roughness: 0.58, metalness: 0.04 }),
      leatherDark: new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6 }),
      marble: new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.35, metalness: 0.08 }),
      marbleVein: new THREE.MeshStandardMaterial({ color: 0xebe6dd, roughness: 0.42 }),
      marbleDark: new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.4 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc8a86a, metalness: 0.84, roughness: 0.26 }),
      brassDark: new THREE.MeshStandardMaterial({ color: 0xa88c55, metalness: 0.86, roughness: 0.32 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8a8d93, metalness: 0.75, roughness: 0.35 }),
      steelBlack: new THREE.MeshStandardMaterial({ color: 0x191a1e, roughness: 0.45, metalness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.88 }),
      screen: new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.2, emissive: 0x000000 }),
      slat: new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.85 }),
      curtain: new THREE.MeshStandardMaterial({ color: 0x8b8680, roughness: 0.96 }),
      curtainSheer: new THREE.MeshStandardMaterial({ color: 0xf0eadc, transparent: true, opacity: 0.38, roughness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xaecbd6, transparent: true, opacity: 0.12, roughness: 0.06, metalness: 0.15 }),
      plant: new THREE.MeshStandardMaterial({ color: 0x3d6b3f, roughness: 0.85 }),
      pot: new THREE.MeshStandardMaterial({ color: 0x9a958d, roughness: 0.9 }),
      potBlack: new THREE.MeshStandardMaterial({ color: 0x222325, roughness: 0.9 }),
      art1: new THREE.MeshStandardMaterial({ color: 0x1e3a4a, roughness: 0.6 }),
      art2: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.6 }),
      artGold: new THREE.MeshStandardMaterial({ color: 0xc9a86a, metalness: 0.7, roughness: 0.35 }),
      shade: new THREE.MeshStandardMaterial({ color: 0xffe9c0, roughness: 0.85, emissive: 0xffe0a6, emissiveIntensity: 0.18 }),
      shadeBlack: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.95 }),
      bulb: new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffe0b0, emissiveIntensity: 1.2 }),
      monitorBezel: new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.55, metalness: 0.2 }),
      monitorScreen: new THREE.MeshStandardMaterial({ color: 0x0b121e, emissive: 0x1a3a6a, emissiveIntensity: 1.1, roughness: 0.25 }),
      monitorScreen2: new THREE.MeshStandardMaterial({ color: 0x0a1614, emissive: 0x0e3d2e, emissiveIntensity: 0.95, roughness: 0.3 }),
      monitorScreenOff: new THREE.MeshStandardMaterial({ color: 0x0a0a0d, roughness: 0.4 }),
      rgb: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0088ff, emissiveIntensity: 1.4 }),
      rgbWarm: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff6a00, emissiveIntensity: 1.0 }),
      keyboard: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.55, metalness: 0.15 }),
      keycap: new THREE.MeshStandardMaterial({ color: 0x24262d, roughness: 0.7 }),
      chairMesh: new THREE.MeshStandardMaterial({ color: 0x2c2d31, roughness: 0.9 }),
      chairFabric: new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.92 }),
      chairAlu: new THREE.MeshStandardMaterial({ color: 0x9ca0a6, metalness: 0.85, roughness: 0.2 }),
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
      const noShadow = key === 'glass' || key === 'shade' || key === 'bulb' || key === 'curtainSheer' || key.startsWith('monitorScreen') || key === 'rgb' || key === 'rgbWarm';
      mesh.castShadow = this.shadows && !noShadow && key !== 'floor' && key !== 'floorDark' && key !== 'exterior' && !key.includes('rug');
      mesh.receiveShadow = this.shadows && !noShadow;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    this._geoms = {};
  }
  _box(cx, cy, cz, w, h, d, matKey, solid = true) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, cy, cz);
    this._push(g, matKey);
    if (solid) this.colliders.push(makeBox(cx, cy - h / 2, cz, w, h, d));
    return g;
  }
  _deco(cx, cy, cz, w, h, d, matKey) {
    return this._box(cx, cy, cz, w, h, d, matKey, false);
  }
  _cyl(cx, cy, cz, r, h, matKey, solid = true, seg = 14) {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.translate(cx, cy, cz);
    this._push(g, matKey);
    if (solid) this.colliders.push(makeBox(cx, cy - h / 2, cz, r * 2, h, r * 2));
  }

  // ------------------------------------------------------------------ layout
  _build() {
    const t = 0.14;
    // ---- shell floor / ceiling ------------------------------------------
    this._deco(0, -0.06, 0, W * 2 + 0.6, 0.12, D * 2 + 0.6, 'woodDark');
    this._deco(0, H + 0.06, 0, W * 2 + 0.6, 0.12, D * 2 + 0.6, 'wall');
    // Herringbone wood floor base
    this._deco(0, 0.005, 0, W * 2, 0.01, D * 2, 'floor');
    // plank inlay lines every 0.6m to suggest herringbone
    for (let x = -W; x < W; x += 0.6) this._deco(x, 0.012, 0, 0.02, 0.004, D * 2, 'floorDark');
    for (let z = -D; z < D; z += 0.6) this._deco(0, 0.012, z, W * 2, 0.004, 0.02, 'floorDark');

    // South, west, east walls
    this._box(0, H / 2, D + t / 2, W * 2, H, t, 'wall');
    this._box(-W - t / 2, H / 2, 0, t, H, D * 2, 'wall');
    this._box(W + t / 2, H / 2, 0, t, H, D * 2, 'wall');

    // North wall with window opening
    const winL = -3.4;
    const winR = 3.4;
    const winTop = 2.85;
    const winBot = 0.28;
    this._box((-W + winL) / 2, H / 2, -D - t / 2, winL + W, H, t, 'wall');
    this._box((winR + W) / 2, H / 2, -D - t / 2, W - winR, H, t, 'wall');
    this._box((winL + winR) / 2, (H + winTop) / 2, -D - t / 2, winR - winL, H - winTop, t, 'wall');
    this._box((winL + winR) / 2, winBot / 2, -D - t / 2, winR - winL, winBot, t, 'wall');

    // ---- trim: skirting, crown, cove tray -------------------------------
    const sk = 0.1;
    this._deco(0, sk / 2, -D + t, W * 2, sk, 0.05, 'trim');
    this._deco(0, sk / 2, D - t, W * 2, sk, 0.05, 'trim');
    this._deco(-W + t, sk / 2, 0, 0.05, sk, D * 2, 'trim');
    this._deco(W - t, sk / 2, 0, 0.05, sk, D * 2, 'trim');
    const crown = H - 0.08;
    this._deco(0, crown, -D + t, W * 2, 0.08, 0.07, 'trim');
    this._deco(0, crown, D - t, W * 2, 0.08, 0.07, 'trim');
    this._deco(-W + t, crown, 0, 0.07, 0.08, D * 2, 'trim');
    this._deco(W - t, crown, 0, 0.07, 0.08, D * 2, 'trim');
    // brass inlay in skirting
    this._deco(0, sk / 2, -D + t + 0.02, W * 2 - 0.2, 0.008, 0.01, 'brass');
    this._deco(0, sk / 2, D - t - 0.02, W * 2 - 0.2, 0.008, 0.01, 'brass');

    // cove tray ceiling: recessed perimeter for indirect LED
    const coveInset = 0.75;
    const coveH = H - 0.22;
    const coveThick = 0.06;
    // inner tray drop
    this._deco(0, H - 0.12, 0, W * 2 - coveInset * 2, 0.04, D * 2 - coveInset * 2, 'trim');
    // cove walls
    this._deco(0, coveH, -D + coveInset, W * 2 - coveInset * 0.5, coveThick, 0.06, 'trim');
    this._deco(0, coveH, D - coveInset, W * 2 - coveInset * 0.5, coveThick, 0.06, 'trim');
    this._deco(-W + coveInset, coveH, 0, 0.06, coveThick, D * 2 - coveInset * 0.5, 'trim');
    this._deco(W - coveInset, coveH, 0, 0.06, coveThick, D * 2 - coveInset * 0.5, 'trim');
    // LED strip glow placeholder (thin brass trim)
    this._deco(0, coveH + 0.02, -D + coveInset + 0.06, W * 2 - coveInset, 0.01, 0.02, 'brass');
    this._deco(0, coveH + 0.02, D - coveInset - 0.06, W * 2 - coveInset, 0.01, 0.02, 'brass');

    // ---- window system ---------------------------------------------------
    const zw = -D - t / 2;
    this._deco((winL + winR) / 2, (winTop + winBot) / 2, zw, winR - winL, winTop - winBot, 0.04, 'glass');
    this._deco((winL + winR) / 2, winTop, zw - 0.02, winR - winL + 0.12, 0.12, 0.14, 'steelBlack');
    this._deco((winL + winR) / 2, winBot, zw - 0.02, winR - winL + 0.12, 0.12, 0.14, 'steelBlack');
    this._deco(winL, (winTop + winBot) / 2, zw - 0.02, 0.12, winTop - winBot, 0.14, 'steelBlack');
    this._deco(winR, (winTop + winBot) / 2, zw - 0.02, 0.12, winTop - winBot, 0.14, 'steelBlack');
    for (const x of [-1.7, 0, 1.7]) this._deco(x, (winTop + winBot) / 2, zw - 0.01, 0.07, winTop - winBot, 0.09, 'steelBlack');
    this._deco((winL + winR) / 2, 1.95, zw - 0.01, winR - winL, 0.06, 0.09, 'steelBlack');
    // marble sill extra wide luxury
    this._deco((winL + winR) / 2, winBot - 0.04, -D + 0.14, winR - winL + 0.5, 0.08, 0.32, 'marble');
    this._deco((winL + winR) / 2, winBot - 0.09, -D + 0.18, winR - winL + 0.35, 0.02, 0.24, 'brass');
    // curtain rail + sheer + blackout
    const drapeH = winTop + 0.18;
    this._deco(0, drapeH + 0.07, -D + 0.28, winR - winL + 1.4, 0.08, 0.18, 'steelBlack');
    for (const s of [-1, 1]) {
      // blackout velvet outer
      this._deco(s * (3.38 + 0.22), drapeH / 2, -D + 0.26, 0.48, drapeH, 0.16, 'curtain');
      this._deco(s * 3.12, drapeH / 2, -D + 0.34, 0.38, drapeH, 0.12, 'curtain');
      // sheer inner
      this._deco(s * 2.85, drapeH / 2 - 0.05, -D + 0.22, 0.22, drapeH - 0.1, 0.06, 'curtainSheer');
    }

    // =========================================================
    // BEDROOM WEST — luxury hotel suite
    // =========================================================
    const bx = -3.75;
    // feature wall behind bed: upholstered + brass frame
    this._deco(-5.38, H / 2 + 0.15, 0, 0.08, H - 0.3, 2.9, 'wallAccent');
    this._deco(-5.32, H / 2 + 0.15, 0, 0.02, H - 0.45, 2.75, 'brass');
    // tall channel-tufted headboard (channel vertical)
    this._deco(-5.18, 1.05, 0, 0.16, 1.75, 2.4, 'velvet');
    for (let i = -1; i <= 1; i++) this._deco(-5.11, 1.05, i * 0.7, 0.02, 1.68, 0.02, 'brass');
    this._deco(-5.03, 1.86, 0, 0.04, 0.04, 2.4, 'brass'); // top brass bar
    // floating bed frame with underglow brass
    this._box(bx, 0.32, 0, 2.55, 0.48, 2.25, 'woodDark');
    this._deco(bx, 0.08, 0, 2.6, 0.04, 2.3, 'brass'); // shadow line LED channel
    this._deco(bx, 0.04, 0, 2.5, 0.02, 2.2, 'oak'); // platform lip
    this._deco(bx, 0.62, 0, 2.45, 0.34, 2.15, 'linen'); // mattress
    // bedding layers
    this._deco(bx - 0.05, 0.78, 0, 2.0, 0.18, 2.1, 'linen'); // duvet
    this._deco(bx + 0.75, 0.74, 0, 0.5, 0.08, 2.15, 'sofaCushion'); // runner / throw
    this._deco(bx - 0.15, 0.85, 0, 1.9, 0.06, 1.95, 'linenWarm'); // sheet peek
    // pillows — luxury triple layer
    for (const s of [-1, 1]) {
      this._deco(-4.55, 0.9, s * 0.48, 0.62, 0.22, 0.78, 'linen'); // euro
      this._deco(-4.32, 0.86, s * 0.42, 0.52, 0.18, 0.68, 'linenWarm'); // standard
    }
    this._deco(-4.2, 0.88, 0, 0.28, 0.2, 0.42, 'velvetEmerald'); // accent cushion
    this._deco(-4.18, 0.86, 0.18, 0.22, 0.16, 0.32, 'artGold'); // small gold lumbar
    // rug under bed cream with border
    this._deco(-3.3, 0.015, 0, 4.1, 0.018, 4.2, 'rug');
    this._deco(-3.3, 0.018, 0, 3.6, 0.006, 3.7, 'rugBorder');
    this._deco(-3.3, 0.022, 0, 3.4, 0.004, 3.5, 'rug'); // inner

    // ---- premium floating nightstands ---------------------------------
    this.drawerPos = new THREE.Vector3(-4.82, 0.58, -1.72);
    for (const s of [-1, 1]) {
      const nz = s * 1.62;
      // floating drawer
      this._deco(-5.0, 0.46, nz, 0.62, 0.12, 0.52, 'wood'); // drawer box wall mounted illusion (but with legs for collider)
      this._box(-5.0, 0.38, nz, 0.62, 0.28, 0.52, 'woodDark'); // lower storage (collider)
      this._deco(-5.0, 0.62, nz, 0.66, 0.05, 0.56, 'marble'); // marble top
      // brass handle long horizontal
      this._deco(-4.88, 0.42, nz, 0.32, 0.02, 0.02, 'brass');
      // designer table lamp — opal globe on brass
      this._cyl(-5.0, 0.68, nz, 0.09, 0.06, 'brass', false);
      this._cyl(-5.0, 0.82, nz, 0.015, 0.28, 'brass', false);
      this._deco(-5.0, 1.04, nz, 0.26, 0.26, 0.26, 'shade'); // frosted globe
      // book + small tray
      this._deco(-5.05, 0.68, nz + s * 0.08, 0.18, 0.03, 0.22, 'dark');
    }

    // =========================================================
    // WARDROBE — glass sliding luxury
    // =========================================================
    this._box(-3.45, 1.18, D - 0.45, 2.1, 2.36, 0.6, 'woodDark');
    // frame brass
    this._deco(-3.45, 1.18, D - 0.15, 2.12, 2.38, 0.06, 'brass');
    // 3 glass doors
    for (let i = 0; i < 3; i++) {
      const x = -4.1 + i * 0.66;
      this._deco(x, 1.18, D - 0.16, 0.58, 2.15, 0.02, 'glass');
      this._deco(x, 1.18, D - 0.16, 0.58, 0.04, 0.02, 'steelBlack'); // top rail piece
      // interior shelves hint
      this._deco(x, 1.0, D - 0.28, 0.5, 0.02, 0.3, 'oak');
      this._deco(x, 1.6, D - 0.28, 0.5, 0.02, 0.3, 'oak');
      // clothes
      this._deco(x + 0.05, 1.35, D - 0.3, 0.4, 0.35, 0.02, 'velvet');
      // handle vertical brass
      this._deco(x + 0.24, 1.18, D - 0.12, 0.015, 0.45, 0.02, 'brass');
    }
    // wardrobe interior LED strip top
    this._deco(-3.45, 2.28, D - 0.22, 1.9, 0.015, 0.015, 'bulb');

    // =========================================================
    // LUXURY KITCHEN — south wall + island
    // =========================================================
    const kCenterX = -0.2;
    const kZ = D - 0.48; // 4.02
    // lower cabinets continuous walnut with brass toe kick
    this._box(kCenterX, 0.45, kZ, 3.9, 0.9, 0.68, 'wood');
    this._deco(kCenterX, 0.92, kZ, 3.98, 0.06, 0.76, 'marble'); // countertop
    // waterfall left end
    this._deco(kCenterX - 1.95, 0.45, kZ, 0.06, 0.9, 0.68, 'marble');
    // backsplash full marble slab
    this._deco(kCenterX, 1.32, D - 0.08, 3.98, 0.78, 0.04, 'marbleVein');
    this._deco(kCenterX, 1.72, D - 0.08, 3.98, 0.015, 0.04, 'brass'); // brass inlay line
    // upper cabinets — glass + walnut frame
    this._deco(kCenterX, 1.85, D - 0.38, 3.9, 0.04, 0.42, 'wood'); // top header
    this._deco(kCenterX, 1.6, D - 0.4, 3.85, 0.7, 0.36, 'woodDark'); // carcass
    // 4 glass upper doors with brass frame
    for (let i = 0; i < 4; i++) {
      const x = -1.25 + i * 0.9;
      this._deco(x, 1.6, D - 0.22, 0.82, 0.62, 0.03, 'glass');
      this._deco(x, 1.6, D - 0.20, 0.82, 0.015, 0.03, 'brass'); // top frame
      this._deco(x, 1.6, D - 0.20, 0.015, 0.62, 0.03, 'brass');
      // interior lighting hint
      this._deco(x, 1.45, D - 0.32, 0.7, 0.015, 0.28, 'bulb');
      // plates
      this._cyl(x - 0.1, 1.5, D - 0.3, 0.08, 0.015, 'linenWarm', false);
      this._cyl(x + 0.12, 1.5, D - 0.3, 0.06, 0.015, 'marble', false);
    }
    // toe kick brass + black
    this._deco(kCenterX, 0.06, kZ + 0.18, 3.9, 0.08, 0.02, 'brass');
    this._deco(kCenterX, 0.06, kZ + 0.19, 3.9, 0.02, 0.02, 'steelBlack');
    // drawer fronts line + handles
    this._deco(kCenterX, 0.55, kZ + 0.32, 3.8, 0.02, 0.015, 'brassDark');
    this._deco(kCenterX, 0.28, kZ + 0.32, 3.8, 0.02, 0.015, 'brassDark');
    for (let i = 0; i < 4; i++) {
      const x = -1.25 + i * 0.9;
      this._deco(x, 0.55, kZ + 0.34, 0.3, 0.015, 0.015, 'brass');
      this._deco(x, 0.28, kZ + 0.34, 0.3, 0.015, 0.015, 'brass');
    }

    // Appliances integrated
    // Fridge panel (leftmost) — tall seamless walnut panel
    this._deco(-1.55, 1.05, kZ + 0.02, 0.85, 2.05, 0.68, 'wood');
    this._deco(-1.55, 1.05, kZ + 0.35, 0.85, 2.06, 0.02, 'brass'); // handle vertical recess
    this._deco(-1.35, 1.05, kZ + 0.36, 0.015, 1.2, 0.02, 'steelBlack');
    // Oven tower next to fridge
    this._deco(-0.72, 0.82, kZ + 0.08, 0.62, 0.92, 0.5, 'steelBlack');
    this._deco(-0.72, 1.02, kZ + 0.12, 0.52, 0.52, 0.02, 'dark'); // glass door
    this._deco(-0.72, 0.82, kZ + 0.14, 0.42, 0.015, 0.02, 'brass'); // handle
    this._cyl(-0.72, 0.52, kZ + 0.16, 0.016, 0.015, 'brass', false); // knob
    this._deco(-0.72, 0.35, kZ + 0.1, 0.52, 0.04, 0.02, 'steelBlack'); // lower drawer

    // Cooktop — 4 burners on counter
    const cookX = 0.28;
    this._deco(cookX, 0.99, kZ, 0.72, 0.015, 0.52, 'steelBlack');
    for (const dx of [-0.22, -0.07, 0.08, 0.23]) {
      for (const dz of [-0.12, 0.12]) {
        this._cyl(cookX + dx, 1.0, kZ + dz, 0.055, 0.02, 'steelBlack', false);
        this._cyl(cookX + dx, 1.01, kZ + dz, 0.04, 0.01, 'brass', false);
      }
    }
    // extractor hood — brass + black linear
    this._deco(cookX, 1.95, D - 0.15, 0.95, 0.18, 0.45, 'steelBlack');
    this._deco(cookX, 1.86, D - 0.15, 0.95, 0.015, 0.45, 'brass');
    this._deco(cookX, 1.78, D - 0.15, 0.7, 0.04, 0.35, 'steelBlack'); // lower capture
    // hood lights
    this._deco(cookX - 0.28, 1.76, D - 0.15, 0.04, 0.015, 0.04, 'bulb');
    this._deco(cookX + 0.28, 1.76, D - 0.15, 0.04, 0.015, 0.04, 'bulb');

    // Sink — undermounted with faucet
    const sinkX = 1.05;
    this._deco(sinkX, 0.88, kZ, 0.55, 0.015, 0.38, 'steel'); // sink basin top view (recess)
    this._deco(sinkX, 0.78, kZ, 0.5, 0.18, 0.34, 'steel'); // basin depth
    // faucet gooseneck brass
    this._cyl(sinkX, 0.98, kZ - 0.18, 0.015, 0.18, 'brass', false);
    this._cyl(sinkX, 1.1, kZ - 0.18, 0.06, 0.015, 'brass', false);
    this._deco(sinkX, 1.07, kZ - 0.14, 0.03, 0.08, 0.03, 'brass');
    // soap + dish
    this._cyl(sinkX + 0.22, 0.98, kZ - 0.12, 0.025, 0.12, 'marble', false);
    this._deco(sinkX - 0.22, 0.99, kZ, 0.12, 0.02, 0.12, 'marble');

    // Kitchen decor: fruit bowl, oil bottles, cookbook
    this._deco(-0.15, 0.99, kZ + 0.12, 0.14, 0.08, 0.14, 'potBlack');
    this._cyl(-0.15, 1.04, kZ + 0.12, 0.055, 0.055, 'plant', false);
    for (let i = 0; i < 3; i++) this._cyl(0.68 + i * 0.08, 1.04, kZ + 0.15, 0.022, 0.18, 'glass', false);
    this._deco(1.55, 0.99, kZ, 0.1, 0.02, 0.14, 'oak');

    // ---------- Island — marble waterfall + brass ----------
    const islandX = -1.45;
    const islandZ = 2.15;
    // main block - slimmer to keep walkway to both sides
    this._box(islandX, 0.45, islandZ, 1.92, 0.9, 0.72, 'marble'); // collision
    // top marble slightly larger lip
    this._deco(islandX, 0.91, islandZ, 1.98, 0.06, 0.82, 'marble');
    // brass shadow line at base
    this._deco(islandX, 0.08, islandZ, 1.88, 0.04, 0.68, 'brass');
    this._deco(islandX, 0.03, islandZ, 1.9, 0.015, 0.7, 'steelBlack');
    // waterfall sides (down to floor)
    this._deco(islandX - 0.93, 0.45, islandZ, 0.06, 0.9, 0.72, 'marble');
    this._deco(islandX + 0.93, 0.45, islandZ, 0.06, 0.9, 0.72, 'marble');
    // sink in island? No, keep clean with cookbooks
    this._deco(islandX, 0.97, islandZ - 0.18, 0.42, 0.015, 0.32, 'woodDark'); // tray
    this._deco(islandX + 0.15, 1.0, islandZ - 0.18, 0.06, 0.08, 0.06, 'pot');
    this._cyl(islandX + 0.15, 1.06, islandZ - 0.18, 0.04, 0.08, 'plant', false);
    // pendant lights over island — 3x black drum with brass interior
    for (let i = -1; i <= 1; i++) {
      const px = islandX + i * 0.58;
      this._cyl(px, H - 0.5, islandZ, 0.015, 0.75, 'steelBlack', false);
      this._deco(px, H - 0.92, islandZ, 0.22, 0.18, 0.22, 'shadeBlack');
      this._deco(px, H - 1.02, islandZ, 0.18, 0.015, 0.18, 'brass');
      this._cyl(px, H - 1.05, islandZ, 0.04, 0.015, 'bulb', false);
    }
    // bar stools — 3x cognac leather + brass base (non-solid to keep aisle walkable)
    for (let i = -1; i <= 1; i++) {
      const sx = islandX + i * 0.62;
      const sz = islandZ + 0.78; // north side of island
      this._cyl(sx, 0.22, sz, 0.16, 0.015, 'brass', false);
      this._cyl(sx, 0.35, sz, 0.025, 0.5, 'brass', false);
      this._deco(sx, 0.6, sz, 0.32, 0.06, 0.32, 'leather');
      this._deco(sx, 0.66, sz - 0.08, 0.28, 0.18, 0.06, 'leather');
    }

    // =========================================================
    // LIVING EAST — sofa, coffee table, media wall
    // =========================================================
    this._deco(2.75, 0.015, 0.2, 4.8, 0.02, 4.2, 'rugLight');
    this._deco(2.75, 0.02, 0.2, 4.2, 0.008, 3.6, 'rugBorder');
    // Sofa — bouclé low profile — shifted east for walkway
    this._box(2.4, 0.36, 0, 1.0, 0.44, 2.6, 'sofa'); // seat
    this._box(2.83, 0.74, 0, 0.16, 0.58, 2.6, 'sofa'); // back
    this._box(2.4, 0.62, -1.36, 1.0, 0.32, 0.14, 'sofa'); // arm
    this._box(2.4, 0.62, 1.36, 1.0, 0.32, 0.14, 'sofa');
    // brass feet
    for (const sx of [2.0, 2.8]) for (const sz of [-1.22, 1.22]) this._deco(sx, 0.04, sz, 0.06, 0.08, 0.06, 'brass');
    // cushions premium
    this._deco(2.47, 0.64, -0.62, 0.74, 0.16, 0.65, 'sofaCushion');
    this._deco(2.47, 0.64, 0.62, 0.74, 0.16, 0.65, 'linen');
    this._deco(2.7, 0.82, -0.92, 0.26, 0.38, 0.38, 'velvet');
    this._deco(2.7, 0.82, 0.92, 0.26, 0.38, 0.38, 'sofaCushion');
    // throw blanket folded
    this._deco(2.5, 0.64, 0.05, 0.45, 0.08, 0.55, 'velvetEmerald');

    // Coffee table — oval marble + sculptural brass
    this._deco(3.75, 0.38, 0, 0.92, 0.06, 1.45, 'marble');
    // brass base curved
    this._cyl(3.45, 0.18, 0, 0.04, 0.32, 'brass', false);
    this._cyl(4.05, 0.18, 0, 0.04, 0.32, 'brass', false);
    this._deco(3.75, 0.1, 0, 0.08, 0.02, 0.9, 'brass');
    // decor
    this._deco(3.75, 0.45, -0.32, 0.28, 0.04, 0.32, 'dark'); // book stack
    this._deco(3.76, 0.49, -0.32, 0.22, 0.02, 0.26, 'art1');
    this._deco(3.6, 0.46, 0.28, 0.12, 0.12, 0.12, 'potBlack');
    this._cyl(3.6, 0.54, 0.28, 0.04, 0.12, 'plant', false);
    this._deco(3.9, 0.46, 0.32, 0.06, 0.14, 0.06, 'brass');
    this._cyl(3.9, 0.55, 0.32, 0.022, 0.06, 'bulb', false);
    // collider
    this._box(3.75, 0.38, 0, 0.92, 0.38, 1.45, 'marble', true);

    // Side table next to sofa (decor only for walkability)
    this._deco(2.4, 0.45, 2.0, 0.42, 0.06, 0.42, 'marble');
    this._cyl(2.4, 0.22, 2.0, 0.02, 0.42, 'brass', false);
    this._cyl(2.4, 0.22, 2.0, 0.16, 0.02, 'brass', false);

    // Lounge chair near window east — deco for walkability
    this._deco(4.15, 0.32, -2.35, 0.78, 0.42, 0.82, 'leather');
    this._deco(4.15, 0.68, -2.65, 0.78, 0.55, 0.16, 'leather');
    for (const s of [-1, 1]) this._deco(4.15, 0.55, -2.35 + s * 0.36, 0.06, 0.2, 0.12, 'leatherDark');
    this._deco(3.65, 0.45, -2.1, 0.22, 0.015, 0.22, 'dark');

    // Media wall east — full luxury
    // wood slat feature
    this._deco(5.22, H / 2, 0, 0.06, H - 0.2, 3.6, 'slat');
    for (let i = -1.6; i <= 1.6; i += 0.12) this._deco(5.28, H / 2, i, 0.015, H - 0.2, 0.02, 'woodDark');
    // marble side panels
    this._deco(5.35, H / 2, -1.9, 0.08, H - 0.4, 0.08, 'marble');
    this._deco(5.35, H / 2, 1.9, 0.08, H - 0.4, 0.08, 'marble');
    // floating console
    this._box(5.05, 0.38, 0, 0.45, 0.18, 2.9, 'woodDark'); // wall hung — collider low
    this._deco(5.05, 0.48, 0, 0.5, 0.04, 2.95, 'marble');
    // drawers brass lines
    this._deco(5.12, 0.36, -0.95, 0.02, 0.14, 0.9, 'brass');
    this._deco(5.12, 0.36, 0.95, 0.02, 0.14, 0.9, 'brass');
    // linear electric fireplace below TV
    this._deco(5.3, 0.85, 0, 0.04, 0.28, 1.6, 'dark');
    this._deco(5.31, 0.85, 0, 0.02, 0.18, 1.4, 'rgbWarm');
    this._deco(5.29, 0.72, 0, 0.06, 0.02, 1.5, 'brass');
    // TV 85" — ultra thin
    this.tvPos = new THREE.Vector3(5.22, 1.72, 0);
    this._deco(5.32, 1.72, 0, 0.05, 1.05, 1.85, 'screen'); // panel
    this._deco(5.34, 1.72, 0, 0.015, 1.02, 1.8, 'steelBlack'); // bezel
    // soundbar
    this._deco(5.15, 1.12, 0, 0.12, 0.08, 0.95, 'steelBlack');
    this._deco(5.15, 1.12, 0, 0.1, 0.015, 0.85, 'brass');
    // shelves above? small display
    this._deco(5.0, 0.58, -1.28, 0.28, 0.12, 0.28, 'dark');
    this._deco(5.0, 0.58, 1.28, 0.28, 0.12, 0.28, 'dark');

    // =========================================================
    // GAMING / WORKSTATION — north-east, under window view
    // =========================================================
    const deskX = 2.45;
    const deskZ = -3.55;
    const deskW = 1.95;
    const deskD = 0.82;
    const deskH = 0.74;
    // desk top oak with waterfall edge south
    this._box(deskX, deskH, deskZ, deskW, 0.05, deskD, 'oak');
    this._deco(deskX, deskH - 0.03, deskZ + deskD / 2 - 0.02, deskW, 0.02, 0.02, 'brass');
    // steel U legs
    this._deco(deskX - deskW / 2 + 0.12, deskH / 2, deskZ, 0.04, deskH, 0.48, 'steelBlack');
    this._deco(deskX + deskW / 2 - 0.12, deskH / 2, deskZ, 0.04, deskH, 0.48, 'steelBlack');
    this._deco(deskX - deskW / 2 + 0.12, 0.06, deskZ, 0.42, 0.04, 0.42, 'steelBlack');
    this._deco(deskX + deskW / 2 - 0.12, 0.06, deskZ, 0.42, 0.04, 0.42, 'steelBlack');
    // under-desk cable tray + LED strip
    this._deco(deskX, deskH - 0.06, deskZ, deskW - 0.2, 0.015, 0.32, 'steelBlack');
    this._deco(deskX, deskH - 0.12, deskZ + 0.08, deskW - 0.25, 0.015, 0.015, 'rgb');
    // desk mat large
    this._deco(deskX, deskH + 0.027, deskZ + 0.06, 1.75, 0.005, 0.55, 'dark');

    // PC tower — glass + RGB fans on desk right
    this._deco(deskX + 0.72, deskH + 0.23, deskZ - 0.08, 0.22, 0.42, 0.38, 'steelBlack'); // case
    this._deco(deskX + 0.83, deskH + 0.23, deskZ - 0.08, 0.015, 0.38, 0.34, 'glass'); // glass side
    // RGB fans 2 inside
    this._cyl(deskX + 0.78, deskH + 0.3, deskZ - 0.08, 0.065, 0.015, 'rgb', false);
    this._cyl(deskX + 0.78, deskH + 0.16, deskZ - 0.08, 0.065, 0.015, 'rgb', false);
    // top grill
    this._deco(deskX + 0.72, deskH + 0.44, deskZ - 0.08, 0.18, 0.015, 0.3, 'dark');

    // Monitors
    // primary ultrawide 49" curved — 0.95 wide
    this._deco(deskX - 0.02, deskH + 0.5, deskZ - 0.18, 0.94, 0.42, 0.04, 'monitorBezel');
    this._deco(deskX - 0.02, deskH + 0.5, deskZ - 0.16, 0.9, 0.38, 0.015, 'monitorScreen'); // screen surface slightly forward
    // monitor stand arm
    this._cyl(deskX - 0.02, deskH + 0.22, deskZ - 0.26, 0.02, 0.32, 'steelBlack', false);
    this._deco(deskX - 0.02, deskH + 0.06, deskZ - 0.26, 0.16, 0.015, 0.32, 'steelBlack');
    // secondary vertical monitor left
    this._deco(deskX - 0.62, deskH + 0.46, deskZ - 0.18, 0.38, 0.52, 0.03, 'monitorBezel');
    this._deco(deskX - 0.62, deskH + 0.46, deskZ - 0.16, 0.34, 0.48, 0.012, 'monitorScreen2');
    this._cyl(deskX - 0.62, deskH + 0.18, deskZ - 0.26, 0.015, 0.28, 'steelBlack', false);
    // light bar on top of primary
    this._deco(deskX - 0.02, deskH + 0.72, deskZ - 0.18, 0.82, 0.015, 0.015, 'steelBlack');

    // peripherals
    // mechanical keyboard
    this._deco(deskX - 0.05, deskH + 0.045, deskZ + 0.12, 0.44, 0.02, 0.16, 'keyboard');
    for (let x = -0.18; x <= 0.18; x += 0.045) for (let z = -0.05; z <= 0.05; z += 0.028) this._deco(deskX - 0.05 + x, deskH + 0.058, deskZ + 0.12 + z, 0.032, 0.015, 0.02, 'keycap');
    // mouse
    this._deco(deskX + 0.32, deskH + 0.042, deskZ + 0.12, 0.06, 0.02, 0.1, 'dark');
    // speakers small pair
    this._deco(deskX - 0.82, deskH + 0.12, deskZ - 0.22, 0.1, 0.18, 0.1, 'steelBlack');
    this._deco(deskX + 0.52, deskH + 0.12, deskZ - 0.22, 0.1, 0.18, 0.1, 'steelBlack');
    // mic arm
    this._cyl(deskX - 0.78, deskH + 0.32, deskZ - 0.05, 0.01, 0.4, 'steelBlack', false);
    this._cyl(deskX - 0.68, deskH + 0.52, deskZ - 0.05, 0.015, 0.12, 'steelBlack', false);

    // Ergonomic chair — facing desk (north)
    const chX = deskX;
    const chZ = deskZ + 0.78;
    // base 5-star
    this._cyl(chX, 0.06, chZ, 0.26, 0.04, 'chairAlu', false);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      this._deco(chX + Math.cos(ang) * 0.22, 0.05, chZ + Math.sin(ang) * 0.22, 0.06, 0.03, 0.06, 'steelBlack');
      this._cyl(chX + Math.cos(ang) * 0.22, 0.02, chZ + Math.sin(ang) * 0.22, 0.025, 0.04, 'steelBlack', false);
    }
    this._cyl(chX, 0.2, chZ, 0.025, 0.22, 'chairAlu', false); // stem
    this._deco(chX, 0.42, chZ, 0.52, 0.08, 0.52, 'chairFabric'); // seat
    this._deco(chX, 0.72, chZ - 0.18, 0.52, 0.52, 0.08, 'chairMesh'); // backrest
    this._deco(chX, 1.0, chZ - 0.18, 0.34, 0.12, 0.06, 'chairFabric'); // headrest
    for (const s of [-1, 1]) {
      this._deco(chX + s * 0.28, 0.58, chZ, 0.04, 0.04, 0.32, 'chairAlu'); // armrest
      this._deco(chX + s * 0.28, 0.62, chZ, 0.06, 0.015, 0.14, 'chairFabric');
    }
    // chair collider small (so player can slip around)
    this._box(chX, 0.45, chZ, 0.52, 0.6, 0.52, 'chairFabric', true);

    // floating shelves above desk — oak
    this._deco(deskX, 1.55, -D - t / 2 + 0.35, 1.9, 0.04, 0.26, 'oak');
    this._deco(deskX, 1.85, -D - t / 2 + 0.35, 1.9, 0.04, 0.26, 'oak');
    // shelf decor
    for (let i = 0; i < 6; i++) {
      const x = deskX - 0.7 + i * 0.24;
      const key = ['art1', 'linen', 'marble', 'brass'][i % 4];
      this._deco(x, 1.62, -D - t / 2 + 0.35, 0.07, 0.14, 0.18, key);
    }
    this._deco(deskX + 0.65, 1.62, -D - t / 2 + 0.35, 0.12, 0.14, 0.12, 'potBlack');
    this._cyl(deskX + 0.65, 1.72, -D - t / 2 + 0.35, 0.04, 0.12, 'plant', false);
    this._deco(deskX - 0.65, 1.92, -D - t / 2 + 0.35, 0.14, 0.14, 0.12, 'pot');
    this._cyl(deskX - 0.65, 2.02, -D - t / 2 + 0.35, 0.035, 0.18, 'plant', false);

    // define PC hotspot for interaction
    this.pcPos = new THREE.Vector3(deskX, deskH + 0.5, deskZ - 0.18);
    this.deskPos = new THREE.Vector3(deskX, deskH, deskZ);

    // =========================================================
    // DOOR & SWITCH — south wall east corner
    // =========================================================
    this.doorX = 4.4;
    this._deco(this.doorX, 1.05, D - 0.06, 1.05, 2.1, 0.08, 'woodDark');
    // door brass inlay vertical + horizontal
    this._deco(this.doorX, 1.05, D - 0.02, 0.7, 1.7, 0.015, 'wood');
    this._deco(this.doorX, 1.05, D - 0.01, 0.015, 1.7, 0.015, 'brass');
    // handle luxury lever brass
    this._deco(this.doorX + 0.32, 1.02, D - 0.12, 0.18, 0.015, 0.04, 'brass');
    this._cyl(this.doorX + 0.4, 1.02, D - 0.12, 0.015, 0.04, 'brass', false);
    // lintel
    this._deco(this.doorX, 2.16, D - 0.06, 1.25, 0.12, 0.14, 'trim');
    this._deco(this.doorX - 0.6, 1.05, D - 0.06, 0.1, 2.1, 0.12, 'trim');
    this._deco(this.doorX + 0.6, 1.05, D - 0.06, 0.1, 2.1, 0.12, 'trim');

    // switch
    this.switchPos = new THREE.Vector3(3.35, 1.25, D - 0.08);
    const sw = this.switchPos;
    this._deco(sw.x, sw.y, D - 0.05, 0.17, 0.26, 0.04, 'trim');
    this._deco(sw.x, sw.y, D - 0.08, 0.12, 0.2, 0.03, 'dark');
    this._deco(sw.x, sw.y + 0.04, D - 0.1, 0.08, 0.05, 0.02, 'brass');

    // =========================================================
    // LIGHTING FEATURES + DECOR
    // =========================================================
    // recessed spots in tray ceiling (8)
    const spots = [
      [-3.2, -2.0], [-0.4, -2.0], [2.2, -2.0],
      [-3.2, 0.2], [2.8, 0.2],
      [-1.5, 2.4], [1.8, 2.2], [3.8, 2.4],
    ];
    for (const [x, z] of spots) this._deco(x, H - 0.16, z, 0.08, 0.015, 0.08, 'steelBlack');

    // modern circular pendant over living coffee table
    this._cyl(3.35, H - 0.4, 0, 0.015, 0.55, 'steelBlack', false);
    this._deco(3.35, H - 0.78, 0, 0.55, 0.04, 0.55, 'steelBlack');
    this._deco(3.35, H - 0.8, 0, 0.5, 0.015, 0.5, 'brass');
    this._cyl(3.35, H - 0.88, 0, 0.08, 0.015, 'bulb', false);

    // floor lamp near lounge chair
    this._cyl(4.75, 0.05, -2.55, 0.2, 0.08, 'marble', false);
    this._deco(4.75, 0.85, -2.55, 0.04, 1.6, 0.04, 'brass');
    this._deco(4.75, 1.72, -2.55, 0.36, 0.32, 0.36, 'shadeBlack');

    // plants
    this._cyl(-1.2, 0.32, -3.15, 0.28, 0.52, 'potBlack', false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this._deco(-1.2 + Math.cos(a) * 0.18, 0.78 + Math.random() * 0.4, -3.15 + Math.sin(a) * 0.18, 0.1, 0.62, 0.1, 'plant');
    }
    this._cyl(1.45, 0.22, 3.8, 0.18, 0.32, 'pot', false);
    this._cyl(1.45, 0.5, 3.8, 0.06, 0.5, 'plant', false);
    // wall art
    this._deco(-1.75, 1.78, D - 0.09, 1.05, 0.78, 0.04, 'trim');
    this._deco(-1.75, 1.78, D - 0.06, 0.95, 0.68, 0.02, 'art1');
    this._deco(-1.75, 1.78, D - 0.05, 0.82, 0.015, 0.02, 'artGold');
    this._deco(-4.45, 1.82, -D + 0.09, 1.15, 0.82, 0.04, 'trim');
    this._deco(-4.45, 1.82, -D + 0.05, 1.02, 0.7, 0.02, 'art2');
    // hallway mirror near door
    this._deco(3.9, 1.15, D - 0.09, 0.45, 0.95, 0.03, 'brass');
    this._deco(3.9, 1.15, D - 0.06, 0.38, 0.85, 0.015, 'glass');

    // ceiling cove extra detail — central flat
    this._deco(0, H - 0.04, 0, W * 1.6, 0.02, D * 1.6, 'wall');
  }

  // --------------------------------------------------------------- outside
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
    const street = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x0a0e13 }));
    street.rotation.x = -Math.PI / 2;
    street.position.y = -24;
    this.scene.add(street);
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
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true, fog: true }));
    points.frustumCulled = false;
    this.scene.add(points);
    this.cityLights = points;
  }

  // ---------------------------------------------------------------- lights
  _lights() {
    this.scene.add(new THREE.AmbientLight(0x2c3442, 0.62));
    this.scene.add(new THREE.HemisphereLight(0x3a4a63, 0x14100c, 0.42));
    const city = new THREE.DirectionalLight(0x8fb4d8, 0.85);
    city.position.set(-4, 6, -18);
    if (this.shadows) {
      city.castShadow = true;
      city.shadow.mapSize.set(1024, 1024);
      const c = city.shadow.camera;
      c.left = -9; c.right = 9; c.top = 9; c.bottom = -9; c.near = 1; c.far = 40;
      city.shadow.bias = -0.0015;
      city.shadow.normalBias = 0.02;
    }
    this.scene.add(city);
    this.cityLight = city;
    this.lamps = [];
    const make = (x, y, z, intensity, color = 0xffcf9a) => {
      const l = new THREE.PointLight(color, intensity, 10, 2);
      l.position.set(x, y, z);
      this.scene.add(l);
      this.lamps.push({ light: l, base: intensity, phase: Math.random() * 7 });
      return l;
    };
    this.ceilingLight = make(0, H - 0.7, 0, 38, 0xffe0b8);
    this.coveLight = make(0, H - 0.4, 0, 18, 0xffe7c5);
    this.lampL = make(-5.0, 1.04, -1.62, 14);
    this.lampR = make(-5.0, 1.04, 1.62, 14);
    this.floorLamp = make(4.75, 1.72, -2.55, 16);
    this.islandLight = make(0.05, H - 1.05, 2.0, 22, 0xffd9ad);
    this.kitchenLight = make(-0.2, H - 0.7, 2.8, 14, 0xffe0b8);
    this.pcGlow = make(2.45, 1.05, -3.55, 12, 0x6fa8ff);
    this.pcRgb = make(2.45, 0.62, -3.55, 6, 0x0088ff);
    this.tvLight = make(4.9, 1.72, 0, 0, 0x6fa8ff);
    this.practicals = [this.ceilingLight, this.coveLight, this.lampL, this.lampR, this.floorLamp, this.islandLight, this.kitchenLight, this.pcGlow, this.pcRgb];
    this.lightsOn = true;
    this.tvOn = false;
    this.pcOn = true;
    this._flicker = 1;
  }
  setCeilingLight(on) { this.lightsOn = !!on; }
  setTv(on) {
    this.tvOn = !!on;
    this.mat.screen.color.setHex(on ? 0x8fb6ff : 0x0d0f12);
  }
  setPc(on) {
    this.pcOn = !!on;
    if (on) {
      this.mat.monitorScreen.emissive.setHex(0x1a3a6a);
      this.mat.monitorScreen2.emissive.setHex(0x0e3d2e);
      this.mat.monitorScreen.emissiveIntensity = 1.1;
      this.mat.monitorScreen2.emissiveIntensity = 0.95;
    } else {
      this.mat.monitorScreen.emissive.setHex(0x000000);
      this.mat.monitorScreen2.emissive.setHex(0x000000);
      this.mat.monitorScreen.emissiveIntensity = 0;
      this.mat.monitorScreen2.emissiveIntensity = 0;
    }
  }
  setFlicker(v) { this._flicker = THREE.MathUtils.clamp(v, 0, 1); }
  update(dt) {
    this.time += dt;
    const lit = this.lightsOn ? this._flicker : 0;
    for (const l of this.lamps) {
      // pc lights should obey pcOn, not main switch
      if (l.light === this.pcGlow || l.light === this.pcRgb) {
        const breathe = 0.97 + 0.03 * Math.sin(this.time * 1.3 + l.phase);
        l.light.intensity = this.pcOn ? l.base * breathe : 0;
        continue;
      }
      const breathe = 0.97 + 0.03 * Math.sin(this.time * 1.3 + l.phase);
      l.light.intensity = l.base * breathe * lit;
    }
    if (this.tvOn) {
      const n = 0.72 + Math.random() * 0.5;
      this.tvLight.intensity = 9 * n;
      this.mat.screen.color.setRGB(0.36 * n, 0.48 * n, 0.85 * n);
    } else this.tvLight.intensity = 0;

    // subtle RGB cycle for pc when on
    if (this.pcOn) {
      const hue = (this.time * 0.12) % 1;
      const c = new THREE.Color().setHSL(hue, 0.85, 0.55);
      this.mat.rgb.emissive.copy(c);
      this.pcRgb.color.copy(c);
      // monitor subtle flicker
      const n = 0.94 + Math.random() * 0.08;
      this.mat.monitorScreen.emissiveIntensity = 1.05 * n;
      this.mat.monitorScreen2.emissiveIntensity = 0.9 * n;
    }
  }
}
export const ROOM_BOUNDS = { W, D, H };
export const ROOM_SPAWN = { x: 0.2, z: 3.0, yaw: 0 };
