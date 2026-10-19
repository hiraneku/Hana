import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);

function capsule(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const geo = new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 6, 10);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  if (len > 1e-4) m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}
function box(parent, size, pos, mat) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Stickman prototype - super clean, no detail noise
function buildStickmanHand(parent, mats) {
  const g = new THREE.Group();

  // forearm - thin stick
  capsule(g, [0.02, -0.20, 0.12], [0.02, -0.02, 0.00], 0.014, mats.stick);
  // wrist joint
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mats.joint);
  wrist.position.set(0.02, -0.02, 0.00);
  g.add(wrist);

  // palm - small block bridging forearm to handle
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.028, 0.068), mats.stick);
  palm.position.set(0.00, 0.008, 0.015);
  palm.rotation.set(0.15, 0, -0.05);
  g.add(palm);

  // 4 fingers - thin sticks wrapped around handle (clearly gripping)
  // handle at 0,0,0 with size ~0.05 diameter - fingers curl under
  const fingerZ = [-0.028, -0.006, 0.016, 0.038];
  fingerZ.forEach((z, i) => {
    const r = i === 3 ? 0.0045 : 0.0052;
    // knuckle to side
    capsule(g, [0.008, 0.020, z], [-0.022, 0.002, z], r, mats.stick);
    // side to under
    capsule(g, [-0.022, 0.002, z], [-0.020, -0.024, z + 0.003], r, mats.stick);
    // under to fingertip (opposite side)
    capsule(g, [-0.020, -0.024, z + 0.003], [0.012, -0.020, z + 0.005], r * 0.9, mats.stick);
    // little joint spheres at knuckles
    const j = new THREE.Mesh(new THREE.SphereGeometry(r * 1.2, 6, 6), mats.joint);
    j.position.set(0.008, 0.020, z);
    g.add(j);
  });

  // thumb - single stick opposing
  capsule(g, [-0.018, 0.006, 0.050], [-0.030, 0.022, 0.028], 0.006, mats.stick);
  capsule(g, [-0.030, 0.022, 0.028], [-0.008, 0.018, 0.005], 0.0055, mats.stick);
  capsule(g, [-0.008, 0.018, 0.005], [0.008, 0.005, -0.012], 0.005, mats.stick);
  const thumbJoint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), mats.joint);
  thumbJoint.position.set(-0.030, 0.022, 0.028);
  g.add(thumbJoint);

  parent.add(g);
  return g;
}

function createBlade(parent, mats) {
  const s = new THREE.Shape();
  s.moveTo(-0.012, -0.005);
  s.lineTo(-0.013, -0.070);
  s.bezierCurveTo(-0.013, -0.180, -0.008, -0.280, 0.003, -0.360);
  s.bezierCurveTo(0.011, -0.330, 0.022, -0.250, 0.027, -0.150);
  s.bezierCurveTo(0.028, -0.070, 0.020, -0.015, 0.013, -0.005);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.008,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.0012,
    bevelThickness: 0.0012,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.004, 0);
  const blade = new THREE.Mesh(geo, mats.blade);
  blade.castShadow = true;
  parent.add(blade);
}

export function createKnife(camera) {
  const mats = {
    blade: new THREE.MeshStandardMaterial({ color: 0xe8ece9, metalness: 0.70, roughness: 0.25 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x9aa3a0, metalness: 0.65, roughness: 0.32 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x1a1e1c, roughness: 0.85 }),
    // stickman - high contrast white on dark handle
    stick: new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.90 }),
    joint: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.80 }),
  };

  const fill = new THREE.PointLight(0xffffff, 1.4, 2.5, 2);
  fill.position.set(-0.15, 0.28, -0.50);
  camera.add(fill);

  const root = new THREE.Group();
  camera.add(root);
  root.position.set(0.22, -0.07, -0.58);
  root.rotation.set(0.32, 0.30, -0.02);

  const knife = new THREE.Group();
  knife.scale.setScalar(0.95);
  root.add(knife);

  createBlade(knife, mats);

  // guard
  box(knife, [0.078, 0.012, 0.018], [0, 0.002, -0.006], mats.guard);
  box(knife, [0.060, 0.032, 0.022], [0, -0.016, 0.010], mats.guard);
  // handle - simple dark stick
  box(knife, [0.032, 0.032, 0.165], [0, -0.038, 0.105], mats.handle);

  // pins - small dots
  for (const z of [0.055, 0.105, 0.155]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.034, 8), mats.guard);
    pin.rotation.z = Math.PI / 2;
    pin.position.set(0, -0.038, z);
    knife.add(pin);
  }

  const handPivot = new THREE.Group();
  handPivot.position.set(0, -0.038, 0.105);
  knife.add(handPivot);
  buildStickmanHand(handPivot, mats);

  // simple forearm extension for stickman
  // (already in hand, but add slight sleeve hint)
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.08, 8), mats.stick);
  sleeve.position.set(0.02, -0.16, 0.10);
  sleeve.rotation.z = -0.12;
  handPivot.add(sleeve);

  // anim curves - keep simple
  const posCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.025, -0.015, 0.035),
    new THREE.Vector3(-0.090, 0.070, -0.075),
    new THREE.Vector3(-0.135, 0.030, -0.025),
    new THREE.Vector3(0.015, -0.008, 0.020),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);
  const rotCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.08, -0.08, 0.15),
    new THREE.Vector3(0.07, 0.38, -0.45),
    new THREE.Vector3(0.04, 0.22, -0.26),
    new THREE.Vector3(-0.02, -0.04, 0.08),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', 0.18);

  const readyPos = new THREE.Vector3(0.22, -0.07, -0.58);
  const inspectPos = new THREE.Vector3(0.06, -0.02, -0.52);
  const readyRot = new THREE.Euler(0.32, 0.30, -0.02);
  const inspectRot = new THREE.Euler(0.28, -0.30, -0.10);
  const tmpP = new THREE.Vector3(), tmpR = new THREE.Vector3();
  const dur = 0.66;
  let timer = 0, swingDone = false, hitDone = false, inspect = 0, cnt = 0;

  function attack() {
    if (timer > 0 || inspect > 0) return false;
    timer = dur; swingDone = false; hitDone = false; cnt++;
    return true;
  }
  function startInspect() {
    if (timer > 0 || inspect > 0) return false;
    inspect = 1.8; return true;
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
    pos.y += Math.sin(elapsed * sway) * (moving ? 0.011 : 0.002);
    pos.x += Math.sin(elapsed * sway * 0.5) * (moving ? 0.006 : 0.001);
    rot.x += Math.cos(elapsed * sway) * (moving ? 0.016 : 0.002);
    rot.z += Math.sin(elapsed * sway * 0.5) * (moving ? 0.022 : 0.004);
    rot.y += THREE.MathUtils.clamp(lookX, -1, 1) * 0.025;
    if (inA) {
      posCurve.getPoint(p, tmpP); rotCurve.getPoint(p, tmpR);
      pos.add(tmpP); rot.x += tmpR.x; rot.y += tmpR.y; rot.z += tmpR.z;
    } else if (inI) {
      inspect = Math.max(0, inspect - dt);
      const e = 1.8 - inspect;
      const a = THREE.MathUtils.smoothstep(e, 0.08, 0.40) * (1 - THREE.MathUtils.smoothstep(e, 1.35, 1.75));
      pos.lerp(inspectPos, a);
      rot.x = THREE.MathUtils.lerp(rot.x, inspectRot.x, a);
      rot.y = THREE.MathUtils.lerp(rot.y, inspectRot.y, a);
      rot.z = THREE.MathUtils.lerp(rot.z, inspectRot.z, a);
    }
    const flex = inA ? Math.sin(Math.PI * p) : inI ? 0.10 : 0;
    handPivot.rotation.set(flex * 0.06, cnt % 2 ? -0.012 : 0.012, flex * (cnt % 2 ? -0.06 : 0.06));
    root.position.lerp(pos, 1 - Math.exp(-dt * 16));
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, rot.x, 16, dt);
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, rot.y, 16, dt);
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, rot.z, 16, dt);
  }

  return { root, attack, startInspect, update, get attacking() { return timer > 0; }, get inspecting() { return inspect > 0; } };
}
