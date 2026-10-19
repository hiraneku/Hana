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
function capsule(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 10, 16);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  if (len > 1e-4) m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function createBlade(parent, mats) {
  const s = new THREE.Shape();
  s.moveTo(-0.015, -0.006);
  s.lineTo(-0.016, -0.080);
  s.bezierCurveTo(-0.0165, -0.180, -0.012, -0.285, 0.002, -0.380);
  s.bezierCurveTo(0.012, -0.345, 0.025, -0.270, 0.031, -0.180);
  s.bezierCurveTo(0.032, -0.090, 0.023, -0.025, 0.016, -0.006);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.010,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.0016,
    bevelThickness: 0.0016,
    curveSegments: 12,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.0055, 0);
  const blade = new THREE.Mesh(geo, mats.blade);
  blade.castShadow = true;
  blade.receiveShadow = true;
  parent.add(blade);
}

// Hand yang benar: kepalan hammer grip, bukan 4 kapsul terpisah
function buildHand(parent, mats) {
  const g = new THREE.Group();

  // 1) Punggung tangan + telapak - satu volume besar yang menutup handle dari atas
  const palmTop = roundedBox(g, [0.090, 0.050, 0.110], [-0.004, 0.028, 0.010], mats.hand, 0.016, 4);
  palmTop.rotation.set(0.10, 0, -0.04);
  // tonjolan knuckle punggung tangan (biar keliatan buku jari)
  const knuckleBack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mats.hand);
  knuckleBack.scale.set(0.088, 0.022, 0.095);
  knuckleBack.position.set(-0.006, 0.052, -0.006);
  g.add(knuckleBack);

  // 2) MASSA JARI - 4 jari disatukan jadi satu kepalan padat (bukan 4 kapsul kotak)
  // Ini yang bikin keliatan beneran megang, bukan hancur potongan
  const fingerMass = roundedBox(g, [0.074, 0.042, 0.092], [-0.008, -0.022, 0.014], mats.hand, 0.014, 4);
  fingerMass.rotation.set(0, 0, 0);
  // buku jari depan (knuckles)
  const fingerKnuckles = roundedBox(g, [0.076, 0.018, 0.090], [-0.010, 0.002, 0.012], mats.handHighlight, 0.008, 3);
  // ujung jari yang nekan handle sisi seberang
  const fingertipBar = roundedBox(g, [0.030, 0.014, 0.088], [0.012, -0.032, 0.016], mats.hand, 0.006, 3);

  // 3) JEMPOL - diagonal ngelock di atas handle, berlawanan dengan kepalan
  const thenar = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), mats.hand);
  thenar.scale.set(0.050, 0.032, 0.055);
  thenar.position.set(-0.030, 0.012, 0.052);
  g.add(thenar);
  capsule(g, [-0.042, 0.018, 0.068], [-0.052, 0.036, 0.038], 0.0135, mats.hand);
  capsule(g, [-0.052, 0.036, 0.038], [-0.026, 0.032, 0.004], 0.0125, mats.hand);
  capsule(g, [-0.026, 0.032, 0.004], [0.006, 0.010, -0.018], 0.0110, mats.hand);

  parent.add(g);
  return g;
}

export function createKnife(camera) {
  const mats = {
    blade: new THREE.MeshStandardMaterial({ color: 0xe2e8e4, metalness: 0.82, roughness: 0.22 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x9aa5a0, metalness: 0.70, roughness: 0.30 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x181c1a, roughness: 0.88, metalness: 0.02 }),
    handleSide: new THREE.MeshStandardMaterial({ color: 0x222724, roughness: 0.90 }),
    pin: new THREE.MeshStandardMaterial({ color: 0xb8c2bc, metalness: 0.60, roughness: 0.28 }),
    hand: new THREE.MeshStandardMaterial({ color: 0x6b6f5e, roughness: 0.92, metalness: 0.01 }), // olive glove - kontras jelas dari handle hitam
    handHighlight: new THREE.MeshStandardMaterial({ color: 0x787c6a, roughness: 0.88 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2f3531, roughness: 0.96 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x4a5048, roughness: 0.88 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0a0f0e, roughness: 0.90 }),
  };

  const fill = new THREE.PointLight(0xeef4ef, 1.8, 2.8, 2);
  fill.position.set(-0.18, 0.32, -0.55);
  camera.add(fill);
  const rim = new THREE.PointLight(0xc8d6ce, 0.7, 2.2, 2);
  rim.position.set(0.20, 0.20, -0.60);
  camera.add(rim);

  const root = new THREE.Group();
  camera.add(root);
  root.position.set(0.20, -0.08, -0.58);
  root.rotation.set(0.30, 0.32, -0.03);

  const knife = new THREE.Group();
  knife.scale.setScalar(0.92);
  root.add(knife);

  createBlade(knife, mats);

  // guard & bolster - clean
  roundedBox(knife, [0.088, 0.014, 0.020], [0, 0.002, -0.007], mats.guard, 0.006, 3);
  roundedBox(knife, [0.066, 0.038, 0.026], [0, -0.020, 0.011], mats.guard, 0.007, 3);

  // handle
  roundedBox(knife, [0.056, 0.044, 0.170], [0, -0.044, 0.108], mats.handle, 0.015, 4);
  for (const side of [-1, 1]) {
    roundedBox(knife, [0.004, 0.032, 0.150], [side * 0.028, -0.044, 0.108], mats.handleSide, 0.004, 3);
  }
  for (const z of [0.052, 0.108, 0.162]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.060, 12), mats.pin);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, -0.044, z);
    knife.add(pin);
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.001, 12), mats.pin);
      h.rotation.z = Math.PI / 2;
      h.position.set(side * 0.030, -0.044, z);
      knife.add(h);
    }
  }
  roundedBox(knife, [0.058, 0.042, 0.014], [0, -0.044, 0.198], mats.handleSide, 0.005, 3);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.060, 10), mats.dark);
  hole.rotation.z = Math.PI / 2;
  hole.position.set(0, -0.044, 0.203);
  knife.add(hole);

  const handPivot = new THREE.Group();
  handPivot.position.set(0, -0.044, 0.108);
  knife.add(handPivot);
  buildHand(handPivot, mats);

  // forearm - lebih ramping & panjang natural, tidak blok
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.48, 12), mats.sleeve);
  arm.position.set(0.024, -0.235, 0.135);
  arm.rotation.z = -0.14;
  arm.rotation.x = 0.08;
  handPivot.add(arm);
  const cuff = roundedBox(handPivot, [0.080, 0.036, 0.058], [0.010, -0.088, 0.055], mats.cuff, 0.010, 3);
  cuff.rotation.z = -0.06;

  // animasi
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.030, -0.018, 0.040),
    new THREE.Vector3(-0.100, 0.075, -0.085),
    new THREE.Vector3(-0.150, 0.035, -0.028),
    new THREE.Vector3(0.018, -0.010, 0.025),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);
  const rotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.09, -0.10, 0.18),
    new THREE.Vector3(0.08, 0.42, -0.52),
    new THREE.Vector3(0.05, 0.26, -0.30),
    new THREE.Vector3(-0.03, -0.05, 0.10),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);

  const readyPos = new THREE.Vector3(0.20, -0.08, -0.58);
  const inspectPos = new THREE.Vector3(0.07, -0.02, -0.52);
  const readyRot = new THREE.Euler(0.30, 0.32, -0.03);
  const inspectRot = new THREE.Euler(0.28, -0.28, -0.12);
  const tmpP = new THREE.Vector3(), tmpR = new THREE.Vector3();
  const dur = 0.70;
  let timer = 0, swingDone = false, hitDone = false, inspect = 0, cnt = 0;

  function attack() {
    if (timer > 0 || inspect > 0) return false;
    timer = dur; swingDone = false; hitDone = false; cnt++;
    return true;
  }
  function startInspect() {
    if (timer > 0 || inspect > 0) return false;
    inspect = 1.9; return true;
  }
  function update(dt, elapsed, opt = {}) {
    const { moving = false, lookX = 0, lookY = 0 } = opt;
    const inA = timer > 0, inI = inspect > 0;
    let p = 0;
    if (inA) {
      timer = Math.max(0, timer - dt);
      p = 1 - timer / dur;
      if (!swingDone && p >= 0.18) { swingDone = true; opt.onSwing?.(); }
      if (!hitDone && p >= 0.36) { hitDone = true; opt.onAttackHit?.(); }
    }
    const pos = readyPos.clone();
    const rot = new THREE.Euler(readyRot.x, readyRot.y, readyRot.z);
    const sway = moving ? 9.2 : 1.5;
    pos.y += Math.sin(elapsed * sway) * (moving ? 0.012 : 0.0022);
    pos.x += Math.sin(elapsed * sway * 0.5) * (moving ? 0.007 : 0.0012);
    rot.x += Math.cos(elapsed * sway) * (moving ? 0.018 : 0.003);
    rot.z += Math.sin(elapsed * sway * 0.5) * (moving ? 0.026 : 0.005);
    rot.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.028;
    pos.x += THREE.MathUtils.clamp(lookX, -1, 1) * 0.006;
    pos.y -= THREE.MathUtils.clamp(lookY, -1, 1) * 0.004;
    if (inA) {
      posCurve.getPoint(p, tmpP); rotCurve.getPoint(p, tmpR);
      pos.add(tmpP); rot.x += tmpR.x; rot.y += tmpR.y; rot.z += tmpR.z;
    } else if (inI) {
      inspect = Math.max(0, inspect - dt);
      const e = 1.9 - inspect;
      const a = THREE.MathUtils.smoothstep(e, 0.08, 0.42) * (1 - THREE.MathUtils.smoothstep(e, 1.4, 1.85));
      pos.lerp(inspectPos, a);
      rot.x = THREE.MathUtils.lerp(rot.x, inspectRot.x, a);
      rot.y = THREE.MathUtils.lerp(rot.y, inspectRot.y, a);
      rot.z = THREE.MathUtils.lerp(rot.z, inspectRot.z, a);
    }
    const flex = inA ? Math.sin(Math.PI * p) : inI ? 0.12 : 0;
    handPivot.rotation.set(0.008 + flex * 0.07, cnt % 2 ? -0.016 : 0.016, flex * (cnt % 2 ? -0.08 : 0.08));
    root.position.lerp(pos, 1 - Math.exp(-dt * 16));
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, rot.x, 16, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, rot.y, 16, dt);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, rot.z, 16, dt);
  }

  return { root, attack, startInspect, update, get attacking() { return timer > 0; }, get inspecting() { return inspect > 0; } };
}
