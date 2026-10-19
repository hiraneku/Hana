import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);

function roundedBox(parent, size, pos, mat, radius = 0.012, seg = 3) {
  const geo = new RoundedBoxGeometry(size[0], size[1], size[2], seg, Math.min(radius, Math.min(...size) * 0.24));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function capsule(parent, start, end, radius, mat) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, len - radius * 2), 8, 14);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  if (len > 1e-4) m.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// --- minimal clean textures ---
function makeHandleTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d2220';
  ctx.fillRect(0, 0, 256, 256);
  // very subtle noise
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeSteelTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, '#7a8480');
  g.addColorStop(0.35, '#c8d0cc');
  g.addColorStop(0.5, '#e6ece8');
  g.addColorStop(0.65, '#c2cac6');
  g.addColorStop(1, '#6a7470');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  // fine brushed lines
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 800; i++) {
    const y = Math.random() * 256;
    const x = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#0a0f0e';
    ctx.fillRect(x, y, 30 + Math.random() * 80, 0.6);
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function createBlade(parent, mats) {
  // simple, elegant drop-point - no fantasy serrations
  const s = new THREE.Shape();
  // ricasso
  s.moveTo(-0.016, -0.008);
  s.lineTo(-0.017, -0.075);
  // spine straight then drops
  s.bezierCurveTo(-0.0175, -0.170, -0.014, -0.270, 0.001, -0.365);
  // tip
  s.bezierCurveTo(0.010, -0.335, 0.023, -0.265, 0.029, -0.175);
  s.bezierCurveTo(0.030, -0.095, 0.022, -0.030, 0.015, -0.008);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.009,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.0018,
    bevelThickness: 0.0018,
    curveSegments: 12,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.005, 0);
  const blade = new THREE.Mesh(geo, mats.blade);
  blade.castShadow = true;
  blade.receiveShadow = true;
  parent.add(blade);
}

function buildHand(parent, mats) {
  const hand = new THREE.Group();

  // palm - soft rounded volume on top of handle
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.092, 0.058, 0.108, 4, 0.018), mats.hand);
  palm.position.set(-0.006, 0.022, 0.012);
  palm.rotation.set(0.12, 0, -0.06);
  palm.castShadow = true;
  hand.add(palm);

  // back of hand - knuckle bulge
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mats.hand);
  back.scale.set(0.092, 0.028, 0.098);
  back.position.set(-0.010, 0.050, -0.008);
  hand.add(back);

  // 4 fingers - tight hammer grip, clearly wrapped under handle
  // handle cross section at pivot: width ~0.064 (X), height ~0.052 (Y)
  const fingers = [
    { z: -0.030, r: 0.0130 }, // index - near guard
    { z: -0.002, r: 0.0126 }, // middle
    { z: 0.024, r: 0.0118 }, // ring
    { z: 0.048, r: 0.0106 }, // pinky
  ];
  fingers.forEach((f) => {
    const z = f.z, r = f.r;
    // segment 1: knuckle to side
    capsule(hand, [-0.008, 0.036, z], [-0.038, 0.008, z], r, mats.hand);
    // segment 2: side to under
    capsule(hand, [-0.038, 0.008, z], [-0.038, -0.028, z + 0.004], r * 0.98, mats.hand);
    // segment 3: under to fingertip (wraps to opposite side)
    capsule(hand, [-0.038, -0.028, z + 0.004], [0.010, -0.032, z + 0.006], r * 0.92, mats.hand);
  });

  // thumb - opposes fingers, diagonal across handle
  // thenar muscle
  const thenar = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), mats.hand);
  thenar.scale.set(0.052, 0.036, 0.060);
  thenar.position.set(-0.032, 0.010, 0.055);
  hand.add(thenar);
  capsule(hand, [-0.044, 0.016, 0.070], [-0.054, 0.038, 0.040], 0.0142, mats.hand);
  capsule(hand, [-0.054, 0.038, 0.040], [-0.028, 0.034, 0.008], 0.0130, mats.hand);
  capsule(hand, [-0.028, 0.034, 0.008], [0.004, 0.010, -0.016], 0.0115, mats.hand);

  parent.add(hand);
  return hand;
}

export function createKnife(camera) {
  const handleTex = makeHandleTexture();
  const steelTex = makeSteelTexture();
  const mats = {
    blade: new THREE.MeshStandardMaterial({ color: 0xd6ddd9, map: steelTex, metalness: 0.75, roughness: 0.28 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x8a9590, metalness: 0.68, roughness: 0.32 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x1e2321, map: handleTex, roughness: 0.92, metalness: 0.02 }),
    handleSide: new THREE.MeshStandardMaterial({ color: 0x252a27, map: handleTex, roughness: 0.94 }),
    pin: new THREE.MeshStandardMaterial({ color: 0xa3aea8, metalness: 0.55, roughness: 0.30 }),
    hand: new THREE.MeshStandardMaterial({ color: 0x5b5e52, roughness: 0.92, metalness: 0.01 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2e3431, roughness: 0.97 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x444a42, roughness: 0.90 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0d1210, roughness: 0.85 }),
  };

  // lights attached to camera so blade stays readable
  const fill = new THREE.PointLight(0xdfe8e2, 1.6, 2.6, 2);
  fill.position.set(-0.16, 0.30, -0.55);
  camera.add(fill);

  const root = new THREE.Group();
  camera.add(root);
  // natural FPS position - centered, readable, blade points forward
  root.position.set(0.22, -0.10, -0.60);
  root.rotation.set(0.32, 0.38, -0.04);

  const knife = new THREE.Group();
  knife.scale.setScalar(0.88);
  root.add(knife);

  createBlade(knife, mats);

  // guard - small, clean, not blocky
  roundedBox(knife, [0.090, 0.016, 0.022], [0, 0.001, -0.008], mats.guard, 0.007, 3);
  // bolster
  roundedBox(knife, [0.068, 0.042, 0.028], [0, -0.022, 0.012], mats.guard, 0.008, 3);

  // handle - ergonomic, not oversized
  roundedBox(knife, [0.058, 0.046, 0.175], [0, -0.046, 0.112], mats.handle, 0.016, 4);
  for (const side of [-1, 1]) {
    roundedBox(knife, [0.005, 0.036, 0.158], [side * 0.029, -0.046, 0.112], mats.handleSide, 0.005, 3);
  }
  // 3 pins - clearly visible stainless
  for (const z of [0.055, 0.110, 0.165]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.062, 12), mats.pin);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, -0.046, z);
    knife.add(pin);
    // heads
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.0012, 12), mats.pin);
      head.rotation.z = Math.PI / 2;
      head.position.set(side * 0.031, -0.046, z);
      knife.add(head);
    }
  }
  // pommel + lanyard hole
  roundedBox(knife, [0.060, 0.044, 0.016], [0, -0.046, 0.205], mats.handleSide, 0.006, 3);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.062, 10), mats.dark);
  hole.rotation.z = Math.PI / 2;
  hole.position.set(0, -0.046, 0.210);
  knife.add(hole);

  // hand pivot - at handle center
  const handPivot = new THREE.Group();
  handPivot.position.set(0, -0.046, 0.110);
  knife.add(handPivot);
  buildHand(handPivot, mats);

  // forearm - slim, not huge, tucked naturally
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.050, 0.44, 12), mats.sleeve);
  arm.position.set(0.030, -0.240, 0.145);
  arm.rotation.z = -0.18;
  arm.rotation.x = 0.10;
  arm.castShadow = true;
  handPivot.add(arm);
  const cuff = roundedBox(handPivot, [0.086, 0.040, 0.062], [0.012, -0.090, 0.060], mats.cuff, 0.012, 3);
  cuff.rotation.z = -0.08;

  // --- animation ---
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.035, -0.020, 0.045),
    new THREE.Vector3(-0.110, 0.085, -0.095),
    new THREE.Vector3(-0.165, 0.040, -0.030),
    new THREE.Vector3(0.020, -0.012, 0.030),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);
  const rotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.10, -0.12, 0.20),
    new THREE.Vector3(0.09, 0.48, -0.58),
    new THREE.Vector3(0.06, 0.30, -0.34),
    new THREE.Vector3(-0.04, -0.06, 0.12),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);

  const readyPos = new THREE.Vector3(0.22, -0.10, -0.60);
  const inspectPos = new THREE.Vector3(0.08, -0.02, -0.55);
  const readyRot = new THREE.Euler(0.32, 0.38, -0.04);
  const inspectRot = new THREE.Euler(0.32, -0.22, -0.14);
  const tmpPos = new THREE.Vector3();
  const tmpRot = new THREE.Vector3();
  const dur = 0.72;
  let timer = 0, swingDone = false, hitDone = false, inspect = 0, count = 0;

  function attack() {
    if (timer > 0 || inspect > 0) return false;
    timer = dur; swingDone = false; hitDone = false; count++;
    return true;
  }
  function startInspect() {
    if (timer > 0 || inspect > 0) return false;
    inspect = 2.0; return true;
  }
  function update(dt, elapsed, opt = {}) {
    const { moving = false, lookX = 0, lookY = 0 } = opt;
    const inAttack = timer > 0;
    const inInspect = inspect > 0;
    let p = 0;
    if (inAttack) {
      timer = Math.max(0, timer - dt);
      p = 1 - timer / dur;
      if (!swingDone && p >= 0.18) { swingDone = true; opt.onSwing?.(); }
      if (!hitDone && p >= 0.36) { hitDone = true; opt.onAttackHit?.(); }
    }
    const pos = readyPos.clone();
    const rot = new THREE.Euler(readyRot.x, readyRot.y, readyRot.z);
    const sway = moving ? 9.2 : 1.5;
    pos.y += Math.sin(elapsed * sway) * (moving ? 0.013 : 0.0025);
    pos.x += Math.sin(elapsed * sway * 0.5) * (moving ? 0.008 : 0.0015);
    rot.x += Math.cos(elapsed * sway) * (moving ? 0.020 : 0.003);
    rot.z += Math.sin(elapsed * sway * 0.5) * (moving ? 0.028 : 0.006);
    rot.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.030;
    pos.x += THREE.MathUtils.clamp(lookX, -1, 1) * 0.007;
    pos.y -= THREE.MathUtils.clamp(lookY, -1, 1) * 0.005;

    if (inAttack) {
      posCurve.getPoint(p, tmpPos); rotCurve.getPoint(p, tmpRot);
      pos.add(tmpPos); rot.x += tmpRot.x; rot.y += tmpRot.y; rot.z += tmpRot.z;
    } else if (inInspect) {
      inspect = Math.max(0, inspect - dt);
      const e = 2.0 - inspect;
      const a = THREE.MathUtils.smoothstep(e, 0.08, 0.45) * (1 - THREE.MathUtils.smoothstep(e, 1.45, 1.95));
      pos.lerp(inspectPos, a);
      rot.x = THREE.MathUtils.lerp(rot.x, inspectRot.x, a);
      rot.y = THREE.MathUtils.lerp(rot.y, inspectRot.y, a);
      rot.z = THREE.MathUtils.lerp(rot.z, inspectRot.z, a);
    }
    const flex = inAttack ? Math.sin(Math.PI * p) : inInspect ? 0.14 : 0;
    handPivot.rotation.set(0.010 + flex * 0.08, count % 2 ? -0.018 : 0.018, flex * (count % 2 ? -0.09 : 0.09));

    root.position.lerp(pos, 1 - Math.exp(-dt * 16));
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, rot.x, 16, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, rot.y, 16, dt);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, rot.z, 16, dt);
  }

  return { root, attack, startInspect, update, get attacking() { return timer > 0; }, get inspecting() { return inspect > 0; } };
}
