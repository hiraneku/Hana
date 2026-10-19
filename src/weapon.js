import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);

function roundedBox(parent, size, position, material, radius = 0.012, segments = 3) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], segments, Math.min(radius, Math.min(...size) * 0.24));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCapsule(parent, start, end, radius, material) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 6, 12);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  if (length > 0.0001) {
    mesh.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinderAlongX(parent, radius, length, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// --- Textures ---------------------------------------------------------------

function makeMicartaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // deep matte micarta base
  ctx.fillStyle = '#202523';
  ctx.fillRect(0, 0, 256, 256);
  // subtle woven crosshatch
  ctx.strokeStyle = 'rgba(45,52,48,0.9)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 256; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y + (y % 12 === 0 ? 0 : 2));
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let x = 0; x < 256; x += 6) {
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 1, 256);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // micro speckle - very subtle
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 600; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const v = rnd() > 0.5 ? 28 : 48;
    ctx.fillStyle = `rgba(${v},${v + 2},${v},${0.07 + rnd() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // border highlight for bevel
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 4;
  return texture;
}

function makeBrushedSteelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // soft satin gradient across width (spine to edge)
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, '#6b746f');
  g.addColorStop(0.18, '#8a9490');
  g.addColorStop(0.42, '#c2c9c6');
  g.addColorStop(0.58, '#b8c0bc');
  g.addColorStop(0.82, '#8f9a96');
  g.addColorStop(1, '#5f6864');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  // longitudinal brush strokes - parallel to blade length (vertical in texture)
  let seed = 4242;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const len = 18 + rnd() * 110;
    const w = 0.3 + rnd() * 0.7;
    const bright = rnd() > 0.55;
    ctx.strokeStyle = bright ? `rgba(235,242,238,${0.035 + rnd() * 0.09})` : `rgba(18,24,22,${0.03 + rnd() * 0.07})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 1.5, y + len);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  // faint hollow grind highlight down the center
  const hg = ctx.createLinearGradient(0, 0, 512, 0);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.38, 'rgba(255,255,255,0)');
  hg.addColorStop(0.46, 'rgba(255,255,255,0.07)');
  hg.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  hg.addColorStop(0.54, 'rgba(255,255,255,0.07)');
  hg.addColorStop(0.62, 'rgba(0,0,0,0)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// --- Blade ------------------------------------------------------------------

function createCleanDropPointBlade(parent, materials) {
  // Clean tactical drop-point: spine stays straight, belly curves smoothly to a fine tip.
  // Shape X = width, Y = length (-Z forward)
  const shape = new THREE.Shape();
  // guard junction
  shape.moveTo(-0.018, -0.010);
  // ricasso to mid-blade - straight spine
  shape.lineTo(-0.020, -0.090);
  // spine drop to tip
  shape.bezierCurveTo(-0.0205, -0.185, -0.016, -0.285, 0.001, -0.395);
  // tip to belly return
  shape.bezierCurveTo(0.012, -0.360, 0.027, -0.285, 0.034, -0.195);
  // belly to ricasso
  shape.bezierCurveTo(0.036, -0.115, 0.030, -0.045, 0.019, -0.010);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.011,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 2,
    bevelSize: 0.0022,
    bevelThickness: 0.0022,
    curveSegments: 14,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0.006, 0);
  // chamfer the spine edge a bit for realism
  const blade = new THREE.Mesh(geometry, materials.blade);
  blade.castShadow = true;
  blade.receiveShadow = true;
  parent.add(blade);

  // Add a thin flat grind facet as a slightly darker plane on the blade flat
  // to suggest a hollow grind without wire tubes.
  const grindShape = new THREE.Shape();
  grindShape.moveTo(-0.014, -0.035);
  grindShape.lineTo(-0.015, -0.260);
  grindShape.bezierCurveTo(-0.011, -0.315, -0.001, -0.360, 0.007, -0.370);
  grindShape.bezierCurveTo(0.018, -0.300, 0.026, -0.210, 0.027, -0.120);
  grindShape.lineTo(0.017, -0.035);
  grindShape.closePath();
  const grindGeo = new THREE.ShapeGeometry(grindShape);
  grindGeo.rotateX(Math.PI / 2);
  // two sided grind planes, just slightly offset from blade surface
  for (const side of [1, -1]) {
    const grind = new THREE.Mesh(grindGeo, materials.bladeGrind);
    grind.position.y = side * 0.0062;
    grind.rotation.y = 0;
    // tiny offset to avoid z-fighting
    grind.position.y += side * 0.0003;
    parent.add(grind);
  }

  // Subtle jimping texture on spine (tiny notches) - 3 small boxes
  for (let i = 0; i < 7; i++) {
    const z = -0.042 - i * 0.011;
    const jimp = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0018, 0.006), materials.jimp);
    jimp.position.set(-0.019, 0.009, z);
    jimp.rotation.y = 0.06;
    parent.add(jimp);
  }

  // Maker's mark - tiny etched circle near ricasso
  const mark = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 10), materials.mark);
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(-0.006, 0.0071, -0.050);
  parent.add(mark);
}

// --- Hand ------------------------------------------------------------------

function buildRealisticHand(parent, materials) {
  const hand = new THREE.Group();

  // Palm block - gently curved, wraps over top of handle
  const palmGeo = new RoundedBoxGeometry(0.084, 0.076, 0.105, 4, 0.022);
  const palm = new THREE.Mesh(palmGeo, materials.glove);
  palm.position.set(-0.008, 0.018, 0.010);
  palm.rotation.set(0.18, 0, -0.08);
  palm.castShadow = true;
  palm.receiveShadow = true;
  hand.add(palm);

  // Dorsal hand bulge (knuckles)
  const knuckleGeo = new THREE.SphereGeometry(0.5, 16, 10);
  const knuckle = new THREE.Mesh(knuckleGeo, materials.glove);
  knuckle.scale.set(0.086, 0.032, 0.092);
  knuckle.position.set(-0.014, 0.052, -0.012);
  knuckle.rotation.z = -0.12;
  hand.add(knuckle);

  // Knuckle creases - subtle darker lines
  for (let i = 0; i < 3; i++) {
    const crease = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.055, 4, 6), materials.gloveSeam);
    crease.position.set(-0.014 + i * 0.009, 0.055, -0.012 + i * 0.004);
    crease.rotation.x = Math.PI / 2;
    crease.rotation.z = -0.12;
    hand.add(crease);
  }

  // Four fingers - tightly wrapped hammer grip, no gaps, fingers nearly touching
  // Z positions centered around handle, X/Y wrap around handle cross-section
  const fingerData = [
    { z: -0.036, radius: 0.0122, curl: 0 }, // index - closest to guard, slightly more extended
    { z: -0.010, radius: 0.0118, curl: 0.03 },
    { z: 0.017, radius: 0.0112, curl: 0.05 },
    { z: 0.042, radius: 0.0102, curl: 0.08 }, // pinky - tightest curl
  ];

  fingerData.forEach((f, idx) => {
    const r = f.radius;
    const z = f.z;
    const t = f.curl;
    // Proximal phalanx - from knuckle (top) down the side
    addCapsule(hand, [-0.010, 0.038, z], [-0.036, 0.010, z + 0.003], r, materials.glove);
    // Middle phalanx - wraps around side to under-handle
    addCapsule(hand, [-0.036, 0.010, z + 0.003], [-0.044, -0.022, z + 0.006], r * 0.98, materials.glove);
    // Distal + fingertip curling under to opposite side - tucked tightly against handle
    addCapsule(hand, [-0.044, -0.022, z + 0.006], [-0.026, -0.050, z + 0.009], r * 0.94, materials.glove);
    // Fingertip pad pressing into handle (flattened)
    addCapsule(hand, [-0.026, -0.050, z + 0.009], [0.012, -0.040, z + 0.011], r * 0.86, materials.gloveTip);

    // Fingernail hint on fingertip (small lighter cap)
    const nail = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 6, 4), materials.nail);
    nail.scale.set(1, 0.35, 0.7);
    nail.position.set(0.008, -0.041, z + 0.011);
    nail.rotation.z = -0.4;
    nail.rotation.y = 0.2;
    hand.add(nail);

    // Knuckle highlight for middle/ring
    if (idx === 1 || idx === 2) {
      const kn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 6, 4), materials.gloveHighlight);
      kn.position.set(-0.012, 0.038, z);
      kn.scale.set(1, 0.6, 0.9);
      hand.add(kn);
    }
  });

  // Thumb - opposing, locked over handle, realistic saddle joint
  // Base of thumb (thenar eminence)
  const thenar = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), materials.glove);
  thenar.scale.set(0.048, 0.038, 0.055);
  thenar.position.set(-0.036, 0.012, 0.052);
  thenar.rotation.set(0.2, 0, -0.35);
  hand.add(thenar);

  // Thumb segments - wrapping diagonally over handle spine
  addCapsule(hand, [-0.048, 0.018, 0.068], [-0.056, 0.040, 0.038], 0.0145, materials.glove);
  addCapsule(hand, [-0.056, 0.040, 0.038], [-0.032, 0.036, 0.006], 0.0135, materials.glove);
  addCapsule(hand, [-0.032, 0.036, 0.006], [0.002, 0.008, -0.018], 0.012, materials.gloveTip);

  // Thumb nail
  const thumbNail = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), materials.nail);
  thumbNail.scale.set(1, 0.28, 0.65);
  thumbNail.position.set(-0.004, 0.013, -0.014);
  thumbNail.rotation.set(0.9, 0, -0.6);
  hand.add(thumbNail);

  // Thumb crease
  const thumbCrease = new THREE.Mesh(new THREE.CapsuleGeometry(0.0018, 0.028, 4, 6), materials.gloveSeam);
  thumbCrease.position.set(-0.040, 0.032, 0.038);
  thumbCrease.rotation.set(0.9, 0.6, 0);
  hand.add(thumbCrease);

  parent.add(hand);
  return hand;
}

export function createKnife(camera) {
  const micartaTexture = makeMicartaTexture();
  const steelTexture = makeBrushedSteelTexture();

  const materials = {
    blade: new THREE.MeshStandardMaterial({
      color: 0xced6d2,
      map: steelTexture,
      metalness: 0.78,
      roughness: 0.24,
      envMapIntensity: 1.0,
    }),
    bladeGrind: new THREE.MeshStandardMaterial({
      color: 0xb9c2be,
      metalness: 0.82,
      roughness: 0.28,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    jimp: new THREE.MeshStandardMaterial({ color: 0x5a6460, roughness: 0.65, metalness: 0.35 }),
    mark: new THREE.MeshStandardMaterial({ color: 0x3a4440, roughness: 0.72, metalness: 0.15 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x7e8a85, metalness: 0.72, roughness: 0.32 }),
    guardDark: new THREE.MeshStandardMaterial({ color: 0x5f6a66, metalness: 0.60, roughness: 0.38 }),
    bolster: new THREE.MeshStandardMaterial({ color: 0x7c8682, metalness: 0.68, roughness: 0.30 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x1e2321, map: micartaTexture, roughness: 0.88, metalness: 0.02 }),
    handleScale: new THREE.MeshStandardMaterial({ color: 0x232825, map: micartaTexture, roughness: 0.90, metalness: 0.01 }),
    pin: new THREE.MeshStandardMaterial({ color: 0x9aa5a0, metalness: 0.55, roughness: 0.35 }),
    pinDark: new THREE.MeshStandardMaterial({ color: 0x6a7570, metalness: 0.45, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0f1412, roughness: 0.82, metalness: 0.02 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x2f3431, roughness: 0.92, metalness: 0.005 }),
    gloveTip: new THREE.MeshStandardMaterial({ color: 0x333833, roughness: 0.88, metalness: 0.008 }),
    gloveHighlight: new THREE.MeshStandardMaterial({ color: 0x3a3f3a, roughness: 0.86, metalness: 0.01 }),
    gloveSeam: new THREE.MeshStandardMaterial({ color: 0x454a45, roughness: 0.94, metalness: 0.005 }),
    nail: new THREE.MeshStandardMaterial({ color: 0x4a4d45, roughness: 0.75, metalness: 0.01 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2d3531, roughness: 0.96, metalness: 0.015 }),
    sleeveInner: new THREE.MeshStandardMaterial({ color: 0x252c28, roughness: 0.97, metalness: 0.01 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x3e443c, roughness: 0.89, metalness: 0.01 }),
    cuffStitch: new THREE.MeshStandardMaterial({ color: 0x5a5e52, roughness: 0.90 }),
  };

  // Soft fill light that follows the knife so the blade glints when inspected
  const knifeFill = new THREE.PointLight(0xd6e2d9, 1.9, 2.8, 2);
  knifeFill.position.set(-0.14, 0.28, -0.50);
  camera.add(knifeFill);
  const rimLight = new THREE.PointLight(0x8a9a94, 0.9, 2.2, 2);
  rimLight.position.set(0.22, 0.18, -0.65);
  camera.add(rimLight);

  const weaponRoot = new THREE.Group();
  camera.add(weaponRoot);
  // Slightly lower and more centered than before for a natural FPS read
  weaponRoot.position.set(0.20, -0.04, -0.72);
  weaponRoot.rotation.set(0.38, 0.42, -0.08);

  const knife = new THREE.Group();
  knife.scale.setScalar(0.84);
  weaponRoot.add(knife);

  createCleanDropPointBlade(knife, materials);

  // --- Guard / Bolster ---
  // Slim oval guard, double sided, not chunky tactical
  const guardMain = roundedBox(knife, [0.098, 0.018, 0.024], [0, -0.001, -0.009], materials.guard, 0.008, 3);
  guardMain.rotation.z = -0.02;
  // Guard shoulders
  const guardLeft = roundedBox(knife, [0.016, 0.014, 0.028], [-0.050, -0.004, -0.009], materials.guard, 0.006, 3);
  guardLeft.rotation.z = -0.18;
  const guardRight = roundedBox(knife, [0.016, 0.014, 0.028], [0.050, -0.004, -0.009], materials.guard, 0.006, 3);
  guardRight.rotation.z = 0.18;
  // Thin bolster / ferrule between guard and handle scales - polished steel transition
  roundedBox(knife, [0.070, 0.054, 0.032], [0, -0.028, 0.014], materials.bolster, 0.010, 3);
  // Ricasso choil shadow line
  const choil = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.002, 0.008), materials.guardDark);
  choil.position.set(0, -0.010, 0.001);
  knife.add(choil);

  // --- Handle ---
  // Main handle core - ergonomic, slight palm swell
  roundedBox(knife, [0.062, 0.050, 0.182], [0, -0.050, 0.116], materials.handle, 0.018, 4);
  // Palm swell bulge (subtle)
  const swell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), materials.handle);
  swell.scale.set(0.070, 0.032, 0.095);
  swell.position.set(0, -0.062, 0.135);
  knife.add(swell);
  // Micarta scales left/right
  for (const side of [-1, 1]) {
    const scale = roundedBox(knife, [0.006, 0.038, 0.168], [side * 0.031, -0.050, 0.116], materials.handleScale, 0.006, 3);
    scale.rotation.y = side * 0.025;
  }
  // Handle pins - three stainless corby bolts, properly through the handle
  const pinZ = [0.048, 0.108, 0.170];
  pinZ.forEach((z, i) => {
    const radius = i === 2 ? 0.0048 : 0.0052;
    // Pin shaft
    cylinderAlongX(knife, radius, 0.068, [0, -0.050, z], materials.pin);
    // Pin heads (slightly larger, flush)
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.0012, radius + 0.0012, 0.0015, 14), materials.pin);
      head.rotation.z = Math.PI / 2;
      head.position.set(side * 0.033, -0.050, z);
      knife.add(head);
    }
    // Decorative ring for lanyard pin (last pin)
    if (i === 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.003, 0.001, 6, 12), materials.pinDark);
      ring.position.set(0, -0.050, z);
      ring.rotation.y = Math.PI / 2;
      knife.add(ring);
    }
  });
  // Butt / pommel - flat, with lanyard hole
  roundedBox(knife, [0.064, 0.048, 0.018], [0, -0.050, 0.212], materials.handleScale, 0.007, 3);
  const lanyardTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.066, 12), materials.black);
  lanyardTube.rotation.z = Math.PI / 2;
  lanyardTube.position.set(0, -0.050, 0.218);
  knife.add(lanyardTube);
  const lanyardHoleInner = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.068, 10), new THREE.MeshBasicMaterial({ color: 0x050707 }));
  lanyardHoleInner.rotation.z = Math.PI / 2;
  lanyardHoleInner.position.set(0, -0.050, 0.218);
  knife.add(lanyardHoleInner);
  // Lanyard cord hint (small loop)
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 14), new THREE.MeshStandardMaterial({ color: 0x2b2f2b, roughness: 0.95 }));
  cord.position.set(0, -0.050, 0.232);
  cord.rotation.x = Math.PI / 2;
  knife.add(cord);

  // Finger choil and guard undercut - small notch for index finger
  const choilNotch = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.070, 8, 1, false, 0, Math.PI), materials.black);
  choilNotch.rotation.z = Math.PI / 2;
  choilNotch.rotation.x = Math.PI;
  choilNotch.position.set(0, -0.020, 0.005);
  knife.add(choilNotch);

  // --- Hand Rig ---
  const handPivot = new THREE.Group();
  handPivot.position.set(0, -0.050, 0.116);
  knife.add(handPivot);
  buildRealisticHand(handPivot, materials);

  // Forearm - tapered, covered by tactical sleeve
  const forearmGroup = new THREE.Group();
  handPivot.add(forearmGroup);
  // Inner arm (skin/glove continuity)
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.058, 0.48, 12, 1), materials.sleeve);
  forearm.position.set(0.068, -0.275, 0.095);
  forearm.rotation.z = -0.21;
  forearm.rotation.x = 0.08;
  forearm.castShadow = true;
  forearm.receiveShadow = true;
  forearmGroup.add(forearm);
  // Sleeve lower seam
  const forearmHighlight = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.043, 0.18, 10, 1), materials.sleeveInner);
  forearmHighlight.position.set(0.052, -0.165, 0.062);
  forearmHighlight.rotation.z = -0.21;
  forearmGroup.add(forearmHighlight);
  // Cuff / wrist closure (velcro strap)
  const cuff = roundedBox(forearmGroup, [0.098, 0.048, 0.068], [0.022, -0.105, 0.050], materials.cuff, 0.014, 3);
  cuff.rotation.z = -0.10;
  cuff.rotation.y = 0.05;
  // Cuff stitch line
  const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.099, 0.002, 0.0015), materials.cuffStitch);
  stitch.position.set(0.022, -0.105, 0.050);
  stitch.rotation.z = -0.10;
  forearmGroup.add(stitch);
  // Wrist watch / strap hint (common on field hands)
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.026, 0.048), new THREE.MeshStandardMaterial({ color: 0x1a1f1d, roughness: 0.82 }));
  strap.position.set(-0.012, -0.108, 0.032);
  // small buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.010), materials.pinDark);
  buckle.position.set(-0.012, -0.108, 0.032);
  forearmGroup.add(strap);
  forearmGroup.add(buckle);

  // --- Animations ---
  const swingPositionCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.045, -0.025, 0.055),
      new THREE.Vector3(-0.13, 0.095, -0.11),
      new THREE.Vector3(-0.19, 0.045, -0.035),
      new THREE.Vector3(0.028, -0.014, 0.040),
      new THREE.Vector3(0, 0, 0),
    ],
    false,
    'catmullrom',
    0.18
  );
  const swingRotationCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.12, -0.14, 0.22),
      new THREE.Vector3(0.10, 0.52, -0.62),
      new THREE.Vector3(0.07, 0.34, -0.38),
      new THREE.Vector3(-0.045, -0.08, 0.15),
      new THREE.Vector3(0, 0, 0),
    ],
    false,
    'catmullrom',
    0.18
  );
  const readyPosition = new THREE.Vector3(0.20, -0.04, -0.72);
  const inspectPosition = new THREE.Vector3(0.08, 0.06, -0.64);
  const readyRotation = new THREE.Euler(0.38, 0.42, -0.08);
  const inspectRotation = new THREE.Euler(0.30, -0.35, -0.18);
  const swingPosition = new THREE.Vector3();
  const swingRotation = new THREE.Vector3();
  const attackDuration = 0.78;
  let attackTimer = 0;
  let attackSwingDone = false;
  let attackHitDone = false;
  let inspectTimer = 0;
  let swingCount = 0;

  function attack() {
    if (attackTimer > 0 || inspectTimer > 0) return false;
    attackTimer = attackDuration;
    attackSwingDone = false;
    attackHitDone = false;
    swingCount += 1;
    return true;
  }

  function startInspect() {
    if (attackTimer > 0 || inspectTimer > 0) return false;
    inspectTimer = 2.1;
    return true;
  }

  function update(dt, elapsed, options = {}) {
    const { moving = false, lookX = 0, lookY = 0 } = options;
    const inAttack = attackTimer > 0;
    const inInspect = inspectTimer > 0;
    let attackProgress = 0;
    if (inAttack) {
      attackTimer = Math.max(0, attackTimer - dt);
      attackProgress = 1 - attackTimer / attackDuration;
      if (!attackSwingDone && attackProgress >= 0.18) {
        attackSwingDone = true;
        options.onSwing?.();
      }
      if (!attackHitDone && attackProgress >= 0.38) {
        attackHitDone = true;
        options.onAttackHit?.();
      }
    }

    const position = readyPosition.clone();
    const rotation = new THREE.Euler(readyRotation.x, readyRotation.y, readyRotation.z);
    const swayRate = moving ? 9.2 : 1.55;
    position.y += Math.sin(elapsed * swayRate) * (moving ? 0.014 : 0.0032);
    position.x += Math.sin(elapsed * swayRate * 0.5) * (moving ? 0.009 : 0.0025);
    rotation.x += Math.cos(elapsed * swayRate) * (moving ? 0.022 : 0.004);
    rotation.z += Math.sin(elapsed * swayRate * 0.5) * (moving ? 0.03 : 0.008);
    rotation.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.035;
    position.x += THREE.MathUtils.clamp(lookX, -1, 1) * 0.008;
    position.y -= THREE.MathUtils.clamp(lookY, -1, 1) * 0.006;

    if (inAttack) {
      swingPositionCurve.getPoint(attackProgress, swingPosition);
      swingRotationCurve.getPoint(attackProgress, swingRotation);
      position.add(swingPosition);
      rotation.x += swingRotation.x;
      rotation.y += swingRotation.y;
      rotation.z += swingRotation.z;
    } else if (inInspect) {
      inspectTimer = Math.max(0, inspectTimer - dt);
      const inspectElapsed = 2.1 - inspectTimer;
      const enter = THREE.MathUtils.smoothstep(inspectElapsed, 0.08, 0.46);
      const leave = THREE.MathUtils.smoothstep(inspectElapsed, 1.52, 2.06);
      const amount = enter * (1 - leave);
      position.lerp(inspectPosition, amount);
      rotation.x = THREE.MathUtils.lerp(rotation.x, inspectRotation.x, amount);
      rotation.y = THREE.MathUtils.lerp(rotation.y, inspectRotation.y, amount);
      rotation.z = THREE.MathUtils.lerp(rotation.z, inspectRotation.z, amount);
    }

    const wristFlex = inAttack ? Math.sin(Math.PI * attackProgress) : inInspect ? 0.16 : 0;
    handPivot.rotation.set(0.012 + wristFlex * 0.09, swingCount % 2 ? -0.022 : 0.022, wristFlex * (swingCount % 2 ? -0.10 : 0.10));

    weaponRoot.position.lerp(position, 1 - Math.exp(-dt * 17));
    weaponRoot.rotation.x = THREE.MathUtils.damp(weaponRoot.rotation.x, rotation.x, 17, dt);
    weaponRoot.rotation.y = THREE.MathUtils.damp(weaponRoot.rotation.y, rotation.y, 17, dt);
    weaponRoot.rotation.z = THREE.MathUtils.damp(weaponRoot.rotation.z, rotation.z, 17, dt);

    // subtle blade glint shift during inspect
    const glintPhase = inInspect ? Math.sin(elapsed * 2.2) * 0.02 : 0;
    knifeFill.intensity = 1.9 + glintPhase;
  }

  return {
    root: weaponRoot,
    attack,
    startInspect,
    update,
    get attacking() {
      return attackTimer > 0;
    },
    get inspecting() {
      return inspectTimer > 0;
    },
  };
}
