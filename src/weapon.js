import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);

function roundedBox(parent, size, position, material, radius = .012, segments = 3) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], segments, Math.min(radius, Math.min(...size) * .24));
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
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(.001, direction.length() - radius * 2), 4, 7);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinderAlongX(parent, radius, length, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeGripTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bec2b8';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = -256; y < 512; y += 9) {
    ctx.strokeStyle = `rgba(34,43,37,${.13 + ((y + 512) % 5) * .018})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y + 256);
    ctx.stroke();
  }
  let seed = 704;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1700; i++) {
    const shade = 70 + Math.floor(random() * 45);
    ctx.fillStyle = `rgba(${shade},${shade + 4},${shade - 2},${.22 + random() * .22})`;
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.1, 1.6);
  texture.anisotropy = 4;
  return texture;
}

function makeSteelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#aab1ac');
  gradient.addColorStop(.48, '#d1d5cf');
  gradient.addColorStop(1, '#89918c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 512);
  let seed = 319;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 950; i++) {
    const y = random() * 512;
    const x = random() * 256;
    const length = 7 + random() * 75;
    ctx.strokeStyle = random() > .5
      ? `rgba(250,252,245,${.025 + random() * .11})`
      : `rgba(23,31,28,${.018 + random() * .065})`;
    ctx.lineWidth = .35 + random() * .9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(255, x + (random() - .5) * 3), Math.min(511, y + length));
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createDropPointBlade(parent, materials) {
  // A restrained drop-point profile with a real bevel: the spine stays broad while the cutting edge curves to the tip.
  const profile = new THREE.Shape();
  profile.moveTo(-.033, -.028);
  profile.lineTo(-.034, -.125);
  profile.quadraticCurveTo(-.035, -.235, -.019, -.315);
  profile.lineTo(-.004, -.397);
  profile.quadraticCurveTo(.009, -.373, .022, -.337);
  profile.quadraticCurveTo(.047, -.267, .05, -.174);
  profile.quadraticCurveTo(.052, -.082, .039, -.028);
  profile.closePath();

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: .014,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: .0028,
    bevelThickness: .0028,
    curveSegments: 10,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, .007, 0);
  const blade = new THREE.Mesh(geometry, materials.blade);
  blade.castShadow = true;
  blade.receiveShadow = true;
  parent.add(blade);

  // Fine cutting-edge glints and a narrow shallow fuller catch the near-camera fill light.
  const edgePoints = [
    new THREE.Vector3(.038, .009, -.055),
    new THREE.Vector3(.048, .009, -.14),
    new THREE.Vector3(.047, .009, -.23),
    new THREE.Vector3(.035, .009, -.31),
    new THREE.Vector3(.018, .009, -.365),
    new THREE.Vector3(-.003, .009, -.397),
  ];
  for (const side of [1, -1]) {
    const edgeCurve = new THREE.CatmullRomCurve3(edgePoints.map((point) => new THREE.Vector3(point.x, point.y * side, point.z)));
    const edge = new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 28, .0015, 5, false), materials.edge);
    edge.castShadow = false;
    parent.add(edge);

    const fullerPoints = [
      new THREE.Vector3(-.026, .009, -.07),
      new THREE.Vector3(-.027, .009, -.16),
      new THREE.Vector3(-.022, .009, -.25),
      new THREE.Vector3(-.014, .009, -.323),
    ];
    const fullerCurve = new THREE.CatmullRomCurve3(fullerPoints.map((point) => new THREE.Vector3(point.x, point.y * side, point.z)));
    const fuller = new THREE.Mesh(new THREE.TubeGeometry(fullerCurve, 20, .0011, 5, false), materials.fuller);
    parent.add(fuller);
  }
}

function buildKnifeHand(parent, materials) {
  const hand = new THREE.Group();
  // The palm sits behind the handle; four separate curled fingers close around its cross-section.
  roundedBox(hand, [.124, .135, .105], [0, -.078, .083], materials.glove, .039, 4);
  roundedBox(hand, [.084, .018, .045], [0, -.126, .09], materials.gloveSeam, .008, 3);

  const fingerZ = [-.085, -.046, -.007, .032];
  fingerZ.forEach((z, index) => {
    const offset = index * .0015;
    addCapsule(hand, [-.018, .024, z], [-.041, -.002, z + .003], .0105, materials.glove);
    addCapsule(hand, [-.041, -.002, z + .003], [-.044, -.037, z + .007], .010, materials.glove);
    addCapsule(hand, [-.044, -.037, z + .007], [-.018, -.055, z + .011], .0095, materials.glove);
    addCapsule(hand, [-.018, -.055, z + .011], [.018, -.045, z + .013], .009, materials.glove);
    roundedBox(hand, [.017, .011, .018], [-.044, -.008, z + offset], materials.gloveSeam, .005, 2);
  });

  // Thumb presses across the top of the handle; a stitched pad makes the grip read clearly in profile.
  addCapsule(hand, [-.052, .018, .103], [-.057, .045, .068], .016, materials.glove);
  addCapsule(hand, [-.057, .045, .068], [-.031, .034, .025], .015, materials.glove);
  addCapsule(hand, [-.031, .034, .025], [.006, .004, -.004], .013, materials.glove);
  roundedBox(hand, [.008, .045, .062], [-.052, .029, .067], materials.gloveSeam, .007, 2);

  parent.add(hand);
  return hand;
}

export function createKnife(camera) {
  const gripTexture = makeGripTexture();
  const steelTexture = makeSteelTexture();
  const materials = {
    blade: new THREE.MeshPhysicalMaterial({
      color: 0xe1e5df,
      map: steelTexture,
      metalness: .56,
      roughness: .25,
      clearcoat: .28,
      clearcoatRoughness: .22,
      emissive: 0x111613,
      emissiveIntensity: .12,
      side: THREE.DoubleSide,
    }),
    edge: new THREE.MeshStandardMaterial({ color: 0xe4e8e1, metalness: .48, roughness: .2, emissive: 0x161a16, emissiveIntensity: .12 }),
    fuller: new THREE.MeshStandardMaterial({ color: 0x4b5550, metalness: .55, roughness: .32 }),
    guard: new THREE.MeshStandardMaterial({ color: 0x68716b, metalness: .58, roughness: .35 }),
    bolster: new THREE.MeshStandardMaterial({ color: 0x747d76, metalness: .62, roughness: .31 }),
    handle: new THREE.MeshStandardMaterial({ color: 0x3e4941, map: gripTexture, roughness: .83, metalness: .02 }),
    handlePanel: new THREE.MeshStandardMaterial({ color: 0x303a33, map: gripTexture, roughness: .88, metalness: .015 }),
    handleGroove: new THREE.MeshStandardMaterial({ color: 0x202923, roughness: .93, metalness: .01 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151b17, roughness: .72, metalness: .05 }),
    pin: new THREE.MeshStandardMaterial({ color: 0x9ca49b, metalness: .68, roughness: .28 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x45483d, roughness: .91, metalness: .01 }),
    gloveSeam: new THREE.MeshStandardMaterial({ color: 0x70715f, roughness: .89, metalness: .01 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x303a35, roughness: .9, metalness: .015 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x4a5043, roughness: .84, metalness: .01 }),
  };

  const knifeFill = new THREE.PointLight(0xcbd7ce, 2.15, 2.8, 2);
  knifeFill.position.set(-.14, .38, -.42);
  camera.add(knifeFill);

  const weaponRoot = new THREE.Group();
  camera.add(weaponRoot);
  weaponRoot.position.set(.27, -.18, -.68);
  weaponRoot.rotation.set(.075, .42, -.13);

  const knife = new THREE.Group();
  knife.scale.setScalar(.82);
  weaponRoot.add(knife);
  createDropPointBlade(knife, materials);

  // Simple steel guard and bolster; no oversized tactical hardware or fantasy serrations.
  const guard = roundedBox(knife, [.112, .023, .027], [0, -.008, -.012], materials.guard, .009, 3);
  guard.rotation.z = -.035;
  const guardEndLeft = roundedBox(knife, [.022, .018, .034], [-.052, -.014, -.012], materials.guard, .007, 3);
  guardEndLeft.rotation.z = -.16;
  const guardEndRight = roundedBox(knife, [.022, .018, .034], [.052, -.014, -.012], materials.guard, .007, 3);
  guardEndRight.rotation.z = .16;
  roundedBox(knife, [.078, .068, .04], [0, -.045, .016], materials.bolster, .012, 3);

  // Contoured rubberized handle with understated checkering, two steel pins, and a lanyard eyelet.
  roundedBox(knife, [.076, .067, .208], [0, -.064, .12], materials.handle, .021, 4);
  for (const side of [-1, 1]) {
    roundedBox(knife, [.009, .05, .174], [side * .04, -.064, .12], materials.handlePanel, .009, 3);
    for (let i = 0; i < 5; i++) {
      const groove = roundedBox(knife, [.0025, .036, .004], [side * .045, -.064, .055 + i * .029], materials.handleGroove, .0015, 2);
      groove.rotation.y = side * -.08;
    }
    for (const z of [.054, .174]) {
      cylinderAlongX(knife, .0052, .004, [side * .045, -.064, z], materials.pin);
    }
  }
  roundedBox(knife, [.08, .066, .025], [0, -.064, .226], materials.handlePanel, .01, 3);
  const lanyardRing = new THREE.Mesh(new THREE.TorusGeometry(.012, .0024, 6, 18), materials.pin);
  lanyardRing.position.set(0, -.064, .243);
  knife.add(lanyardRing);
  const lanyardHole = new THREE.Mesh(new THREE.CircleGeometry(.008, 12), materials.black);
  lanyardHole.position.set(0, -.064, .244);
  knife.add(lanyardHole);

  // The right hand is wrapped around the handle and driven by a small wrist pivot during the cut.
  const handPivot = new THREE.Group();
  handPivot.position.set(0, -.064, .12);
  knife.add(handPivot);
  buildKnifeHand(handPivot, materials);
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(.044, .061, .56, 12, 1), materials.sleeve);
  forearm.position.set(.075, -.31, .145);
  forearm.rotation.z = -.24;
  forearm.castShadow = true;
  forearm.receiveShadow = true;
  handPivot.add(forearm);
  const cuff = roundedBox(handPivot, [.105, .055, .075], [.025, -.125, .075], materials.cuff, .018, 3);
  cuff.rotation.z = -.12;

  // A six-pose Catmull-Rom arc gives the swing anticipation, acceleration, follow-through, and a soft recovery.
  const swingPositionCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(.055, -.035, .07),
    new THREE.Vector3(-.15, .105, -.13),
    new THREE.Vector3(-.22, .05, -.045),
    new THREE.Vector3(.035, -.018, .05),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', .18);
  const swingRotationCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-.14, -.16, .26),
    new THREE.Vector3(.12, .55, -.68),
    new THREE.Vector3(.08, .37, -.43),
    new THREE.Vector3(-.055, -.1, .18),
    new THREE.Vector3(0, 0, 0),
  ], false, 'catmullrom', .18);
  const readyPosition = new THREE.Vector3(.27, -.18, -.68);
  const inspectPosition = new THREE.Vector3(.12, -.045, -.64);
  const readyRotation = new THREE.Euler(.075, .42, -.13);
  const inspectRotation = new THREE.Euler(-.16, -.18, -.44);
  const swingPosition = new THREE.Vector3();
  const swingRotation = new THREE.Vector3();
  const attackDuration = .78;
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
      if (!attackSwingDone && attackProgress >= .18) {
        attackSwingDone = true;
        options.onSwing?.();
      }
      if (!attackHitDone && attackProgress >= .38) {
        attackHitDone = true;
        options.onAttackHit?.();
      }
    }

    const position = readyPosition.clone();
    const rotation = new THREE.Euler(readyRotation.x, readyRotation.y, readyRotation.z);
    const swayRate = moving ? 9.2 : 1.55;
    position.y += Math.sin(elapsed * swayRate) * (moving ? .014 : .0035);
    position.x += Math.sin(elapsed * swayRate * .5) * (moving ? .009 : .0025);
    rotation.x += Math.cos(elapsed * swayRate) * (moving ? .022 : .004);
    rotation.z += Math.sin(elapsed * swayRate * .5) * (moving ? .03 : .008);
    rotation.y += THREE.MathUtils.clamp(lookX, -1, 1) * .035;
    position.x += THREE.MathUtils.clamp(lookX, -1, 1) * .008;
    position.y -= THREE.MathUtils.clamp(lookY, -1, 1) * .006;

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
      const enter = THREE.MathUtils.smoothstep(inspectElapsed, .08, .46);
      const leave = THREE.MathUtils.smoothstep(inspectElapsed, 1.52, 2.06);
      const amount = enter * (1 - leave);
      position.lerp(inspectPosition, amount);
      rotation.x = THREE.MathUtils.lerp(rotation.x, inspectRotation.x, amount);
      rotation.y = THREE.MathUtils.lerp(rotation.y, inspectRotation.y, amount);
      rotation.z = THREE.MathUtils.lerp(rotation.z, inspectRotation.z, amount);
    }

    const wristFlex = inAttack ? Math.sin(Math.PI * attackProgress) : inInspect ? .16 : 0;
    handPivot.rotation.set(.015 + wristFlex * .1, swingCount % 2 ? -.025 : .025, wristFlex * (swingCount % 2 ? -.12 : .12));

    weaponRoot.position.lerp(position, 1 - Math.exp(-dt * 17));
    weaponRoot.rotation.x = THREE.MathUtils.damp(weaponRoot.rotation.x, rotation.x, 17, dt);
    weaponRoot.rotation.y = THREE.MathUtils.damp(weaponRoot.rotation.y, rotation.y, 17, dt);
    weaponRoot.rotation.z = THREE.MathUtils.damp(weaponRoot.rotation.z, rotation.z, 17, dt);
  }

  return {
    root: weaponRoot,
    attack,
    startInspect,
    update,
    get attacking() { return attackTimer > 0; },
    get inspecting() { return inspectTimer > 0; },
  };
}
