import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);

function capsule(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 8, 12);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  if (len > 1e-4) m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function roundedBox(parent, size, pos, mat, radius = 0.014, seg = 3) {
  const geo = new RoundedBoxGeometry(size[0], size[1], size[2], seg, Math.min(radius, Math.min(...size) * 0.24));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// TANGAN KOSONG - proporsi normal, tidak kurus stick
function buildEmptyHand(parent, mats) {
  const g = new THREE.Group();

  // telapak - lebar & tebal proporsional
  const palm = roundedBox(g, [0.078, 0.095, 0.032], [0, 0.015, 0], mats.skin, 0.015, 4);
  // punggung tangan sedikit cembung
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mats.skin);
  back.scale.set(0.076, 0.092, 0.028);
  back.position.set(0, 0.018, 0.012);
  g.add(back);

  // 4 jari - jari normal, agak menekuk natural (tidak lurus kaku & tidak terlalu kurus)
  // jari telunjuk sampai kelingking, posisi X menyebar, Z ke depan (-Z)
  const fingers = [
    { x: -0.028, z: 0.000, len: 0.072, r: 0.0115 }, // telunjuk
    { x: -0.009, z: -0.002, len: 0.078, r: 0.0120 }, // tengah (paling panjang)
    { x: 0.010, z: -0.001, len: 0.074, r: 0.0115 }, // manis
    { x: 0.027, z: 0.002, len: 0.060, r: 0.0100 }, // kelingking (pendek)
  ];
  fingers.forEach((f) => {
    const baseY = 0.062;
    const tipY = 0.058;
    // ruas 1: pangkal ke tengah (dari telapak ke depan)
    capsule(g, [f.x, baseY, 0.010], [f.x, 0.042, -0.028], f.r, mats.skin);
    // ruas 2: tengah ke ujung (sedikit melengkung)
    capsule(g, [f.x, 0.042, -0.028], [f.x, 0.028, -0.058], f.r * 0.96, mats.skin);
    // ruas 3: ujung jari (membulat)
    capsule(g, [f.x, 0.028, -0.058], [f.x, 0.015, -0.082], f.r * 0.90, mats.skin);
    // kuku - kecil di ujung
    const nail = new THREE.Mesh(new THREE.SphereGeometry(f.r * 0.55, 6, 5), mats.nail);
    nail.scale.set(1, 0.35, 0.7);
    nail.position.set(f.x, 0.018, -0.083);
    nail.rotation.x = 0.6;
    g.add(nail);
  });

  // ibu jari - tebal, di samping, agak menekuk
  const thenar = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), mats.skin);
  thenar.scale.set(0.034, 0.048, 0.038);
  thenar.position.set(-0.042, -0.005, 0.008);
  g.add(thenar);
  capsule(g, [-0.042, -0.005, 0.008], [-0.050, 0.022, 0.005], 0.0125, mats.skin);
  capsule(g, [-0.050, 0.022, 0.005], [-0.038, 0.045, -0.012], 0.0115, mats.skin);
  capsule(g, [-0.038, 0.045, -0.012], [-0.022, 0.038, -0.035], 0.0105, mats.skin);
  const thumbNail = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), mats.nail);
  thumbNail.scale.set(1, 0.30, 0.65);
  thumbNail.position.set(-0.024, 0.040, -0.036);
  thumbNail.rotation.set(0.8, 0, -0.5);
  g.add(thumbNail);

  // pergelangan
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.040, 10), mats.skin);
  wrist.position.set(0, -0.045, 0.002);
  g.add(wrist);

  parent.add(g);
  return g;
}

export function createKnife(camera) {
  // TANGAN KOSONG - tidak ada pisau sama sekali
  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc9b8a0, roughness: 0.78, metalness: 0.01 }), // kulit natural - tidak pucat stick
    nail: new THREE.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 0.65 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2f3531, roughness: 0.96 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x3d4440, roughness: 0.88 }),
  };

  const fill = new THREE.PointLight(0xfff0e0, 1.2, 2.2, 2);
  fill.position.set(-0.12, 0.25, -0.45);
  camera.add(fill);
  const rim = new THREE.PointLight(0xc8d6ce, 0.6, 2.0, 2);
  rim.position.set(0.18, 0.18, -0.55);
  camera.add(rim);

  const root = new THREE.Group();
  camera.add(root);
  root.position.set(0.18, -0.14, -0.52);
  root.rotation.set(0.18, 0.22, -0.06);

  const handPivot = new THREE.Group();
  root.add(handPivot);
  // pivot di pergelangan
  handPivot.position.set(0, -0.045, 0.02);
  buildEmptyHand(handPivot, mats);

  // lengan bawah - proporsi normal (tidak kurus, tidak gede blok)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 0.42, 12), mats.sleeve);
  arm.position.set(0.015, -0.26, 0.080);
  arm.rotation.z = -0.12;
  arm.rotation.x = 0.06;
  handPivot.add(arm);
  const cuff = roundedBox(handPivot, [0.082, 0.038, 0.056], [0.008, -0.090, 0.035], mats.cuff, 0.010, 3);
  cuff.rotation.z = -0.05;

  // animasi tangan kosong - ayunan ringan, bukan tebas pisau
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.020, -0.010, 0.030),
    new THREE.Vector3(-0.070, 0.050, -0.060),
    new THREE.Vector3(-0.090, 0.025, -0.020),
    new THREE.Vector3(0.012, -0.006, 0.015),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);
  const rotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.06, -0.06, 0.10),
    new THREE.Vector3(0.05, 0.28, -0.32),
    new THREE.Vector3(0.03, 0.16, -0.18),
    new THREE.Vector3(-0.02, -0.03, 0.06),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);

  const readyPos = new THREE.Vector3(0.18, -0.14, -0.52);
  const inspectPos = new THREE.Vector3(0.08, -0.06, -0.46);
  const readyRot = new THREE.Euler(0.18, 0.22, -0.06);
  const inspectRot = new THREE.Euler(0.22, -0.18, -0.08);
  const tmpP = new THREE.Vector3(), tmpR = new THREE.Vector3();
  const dur = 0.62;
  let timer = 0, swingDone = false, hitDone = false, inspect = 0, cnt = 0;

  function attack() {
    if (timer > 0 || inspect > 0) return false;
    timer = dur; swingDone = false; hitDone = false; cnt++;
    return true;
  }
  function startInspect() {
    if (timer > 0 || inspect > 0) return false;
    inspect = 1.6; return true;
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
    pos.y += Math.sin(elapsed * sway) * (moving ? 0.010 : 0.002);
    pos.x += Math.sin(elapsed * sway * 0.5) * (moving ? 0.006 : 0.001);
    rot.x += Math.cos(elapsed * sway) * (moving ? 0.014 : 0.002);
    rot.z += Math.sin(elapsed * sway * 0.5) * (moving ? 0.020 : 0.003);
    rot.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.024;
    if (inA) {
      posCurve.getPoint(p, tmpP); rotCurve.getPoint(p, tmpR);
      pos.add(tmpP); rot.x += tmpR.x; rot.y += tmpR.y; rot.z += tmpR.z;
    } else if (inI) {
      inspect = Math.max(0, inspect - dt);
      const e = 1.6 - inspect;
      const a = THREE.MathUtils.smoothstep(e, 0.08, 0.38) * (1 - THREE.MathUtils.smoothstep(e, 1.25, 1.55));
      pos.lerp(inspectPos, a);
      rot.x = THREE.MathUtils.lerp(rot.x, inspectRot.x, a);
      rot.y = THREE.MathUtils.lerp(rot.y, inspectRot.y, a);
      rot.z = THREE.MathUtils.lerp(rot.z, inspectRot.z, a);
    }
    const flex = inA ? Math.sin(Math.PI * p) : inI ? 0.10 : 0;
    handPivot.rotation.set(flex * 0.05, cnt % 2 ? -0.010 : 0.010, flex * (cnt % 2 ? -0.05 : 0.05));
    root.position.lerp(pos, 1 - Math.exp(-dt * 16));
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, rot.x, 16, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, rot.y, 16, dt);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, rot.z, 16, dt);
  }

  return { root, attack, startInspect, update, get attacking() { return timer > 0; }, get inspecting() { return inspect > 0; } };
}
