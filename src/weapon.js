import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function rbox(parent, size, pos, mat, rad = 0.014) {
  const geo = new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(rad, Math.min(...size) * 0.24));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function capsule(parent, a, b, r, mat) {
  const UP = new THREE.Vector3(0, 1, 0);
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A); const len = d.length();
  const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 8, 12);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  if (len > 1e-4) m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true; parent.add(m); return m;
}

// FPS simpel - tanpa jari terpisah, lurus, seperti game FPS pada umumnya
function buildSimpleFPSHand(parent, mats) {
  const g = new THREE.Group();
  // telapak + punggung tangan sebagai 1 blok mitten (tidak ada jari satu-satu)
  rbox(g, [0.082, 0.072, 0.092], [0, 0.012, 0.008], mats.hand, 0.016);
  // tonjolan buku jari halus (biar tidak rata)
  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), mats.hand);
  knuckle.scale.set(0.080, 0.022, 0.085);
  knuckle.position.set(0, 0.042, -0.008);
  g.add(knuckle);
  // jempol simpel - cuma 2 ruas, tidak detail kuku
  capsule(g, [-0.042, 0.004, 0.042], [-0.052, 0.020, 0.018], 0.012, mats.hand);
  capsule(g, [-0.052, 0.020, 0.018], [-0.028, 0.022, -0.006], 0.011, mats.hand);
  parent.add(g);
  return g;
}

function createBlade(parent, mats) {
  const s = new THREE.Shape();
  s.moveTo(-0.014, -0.004);
  s.lineTo(-0.015, -0.075);
  s.bezierCurveTo(-0.015, -0.185, -0.010, -0.285, 0.002, -0.368);
  s.bezierCurveTo(0.011, -0.335, 0.024, -0.255, 0.028, -0.155);
  s.bezierCurveTo(0.029, -0.075, 0.020, -0.015, 0.012, -0.004);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.009, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.0014, bevelThickness: 0.0014 });
  geo.rotateX(Math.PI / 2); geo.translate(0, 0.005, 0);
  const m = new THREE.Mesh(geo, mats.blade);
  m.castShadow = true; parent.add(m);
}

export function createKnife(camera) {
  const mats = {
    blade: new THREE.MeshStandardMaterial({ color: 0xe6ece8, metalness: 0.78, roughness: 0.24 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x9aa5a0, metalness: 0.65, roughness: 0.30 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x1e2220, roughness: 0.85 }),
    hand: new THREE.MeshStandardMaterial({ color: 0x6e735e, roughness: 0.88 }), // olive mitten
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2f3531, roughness: 0.92 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x454a42, roughness: 0.85 }),
  };

  const fill = new THREE.PointLight(0xffffff, 1.5, 2.4, 2);
  fill.position.set(-0.14, 0.30, -0.50);
  camera.add(fill);

  const root = new THREE.Group();
  camera.add(root);
  // FPS lurus - tidak bengkok, tidak miring aneh
  root.position.set(0.22, -0.12, -0.56);
  root.rotation.set(0.22, 0.30, 0);

  const knife = new THREE.Group();
  knife.scale.setScalar(0.95);
  root.add(knife);

  createBlade(knife, mats);
  // guard & handle super simpel, lurus
  rbox(knife, [0.080, 0.012, 0.018], [0, 0.002, -0.006], mats.guard, 0.005);
  rbox(knife, [0.054, 0.040, 0.160], [0, -0.032, 0.100], mats.handle, 0.012);
  for (const z of [0.055, 0.105, 0.150]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.056, 10), mats.guard);
    pin.rotation.z = Math.PI / 2; pin.position.set(0, -0.032, z); knife.add(pin);
  }

  const handPivot = new THREE.Group();
  handPivot.position.set(0, -0.032, 0.100);
  knife.add(handPivot);
  buildSimpleFPSHand(handPivot, mats);

  // lengan lurus, tidak bengkok
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.40, 12), mats.sleeve);
  arm.position.set(0.018, -0.22, 0.10);
  arm.rotation.x = -0.12;
  arm.rotation.z = -0.08;
  arm.castShadow = true;
  handPivot.add(arm);
  const cuff = rbox(handPivot, [0.078, 0.036, 0.054], [0.008, -0.075, 0.055], mats.cuff, 0.010);
  cuff.rotation.z = -0.05;

  // animasi lurus, tidak bengkok
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.020, -0.012, 0.028),
    new THREE.Vector3(-0.075, 0.055, -0.060),
    new THREE.Vector3(-0.095, 0.028, -0.018),
    new THREE.Vector3(0.012, -0.006, 0.014),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);
  const rotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.05, -0.06, 0.08),
    new THREE.Vector3(0.06, 0.32, -0.30),
    new THREE.Vector3(0.03, 0.18, -0.16),
    new THREE.Vector3(-0.02, -0.03, 0.05),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);

  const readyPos = new THREE.Vector3(0.22, -0.12, -0.56);
  const inspectPos = new THREE.Vector3(0.07, -0.06, -0.50);
  const readyRot = new THREE.Euler(0.22, 0.30, 0);
  const inspectRot = new THREE.Euler(0.18, -0.22, -0.08);
  const tmpP = new THREE.Vector3(), tmpR = new THREE.Vector3();
  const dur = 0.60;
  let timer = 0, swingDone = false, hitDone = false, inspect = 0, cnt = 0;

  function attack() { if (timer > 0 || inspect > 0) return false; timer = dur; swingDone = false; hitDone = false; cnt++; return true; }
  function startInspect() { if (timer > 0 || inspect > 0) return false; inspect = 1.5; return true; }
  function update(dt, elapsed, opt = {}) {
    const { moving = false, lookX = 0, lookY = 0 } = opt;
    const inA = timer > 0, inI = inspect > 0; let p = 0;
    if (inA) { timer = Math.max(0, timer - dt); p = 1 - timer / dur; if (!swingDone && p >= 0.18) { swingDone = true; opt.onSwing?.(); } if (!hitDone && p >= 0.36) { hitDone = true; opt.onAttackHit?.(); } }
    const pos = readyPos.clone(); const rot = new THREE.Euler(readyRot.x, readyRot.y, readyRot.z);
    const sway = moving ? 9.2 : 1.4;
    pos.y += Math.sin(elapsed * sway) * (moving ? 0.009 : 0.0015);
    pos.x += Math.sin(elapsed * sway * 0.5) * (moving ? 0.005 : 0.001);
    rot.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.020;
    if (inA) { posCurve.getPoint(p, tmpP); rotCurve.getPoint(p, tmpR); pos.add(tmpP); rot.x += tmpR.x; rot.y += tmpR.y; rot.z += tmpR.z; }
    else if (inI) { inspect = Math.max(0, inspect - dt); const e = 1.5 - inspect; const a = THREE.MathUtils.smoothstep(e, 0.08, 0.36) * (1 - THREE.MathUtils.smoothstep(e, 1.2, 1.45)); pos.lerp(inspectPos, a); rot.x = THREE.MathUtils.lerp(rot.x, inspectRot.x, a); rot.y = THREE.MathUtils.lerp(rot.y, inspectRot.y, a); rot.z = THREE.MathUtils.lerp(rot.z, inspectRot.z, a); }
    // tidak bengkok - pergelangan tetap lurus
    handPivot.rotation.set(0, cnt % 2 ? -0.008 : 0.008, 0);
    root.position.lerp(pos, 1 - Math.exp(-dt * 15));
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, rot.x, 15, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, rot.y, 15, dt);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, rot.z, 15, dt);
  }
  return { root, attack, startInspect, update, get attacking() { return timer > 0; }, get inspecting() { return inspect > 0; } };
}
