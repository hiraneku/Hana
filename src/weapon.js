import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const tempWorld = new THREE.Vector3();
const tempLocal = new THREE.Vector3();

function roundedBox(parent, size, position, material, radius = .012, segments = 2) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], segments, Math.min(radius, Math.min(...size) * .24));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cube(parent, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function axisCylinder(parent, radius, length, position, material, axis = 'y', sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material);
  mesh.position.set(...position);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createStippleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c7c9bf';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 711;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 3; y < 256; y += 7) {
    for (let x = 3; x < 256; x += 7) {
      const shade = Math.floor(68 + rand() * 40);
      ctx.fillStyle = `rgba(${shade},${shade + 5},${shade + 2},${.48 + rand() * .38})`;
      ctx.beginPath();
      ctx.arc(x + rand() * 2, y + rand() * 2, .6 + rand() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.8);
  texture.anisotropy = 4;
  return texture;
}

function createSlideFinishTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, '#929b95');
  gradient.addColorStop(.48, '#747d78');
  gradient.addColorStop(1, '#555e59');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  let seed = 281;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1650; i++) {
    const y = rand() * 256;
    const x = rand() * 512;
    const length = 5 + rand() * 105;
    ctx.strokeStyle = rand() > .5 ? `rgba(235,240,230,${.025 + rand() * .10})` : `rgba(3,8,8,${.025 + rand() * .10})`;
    ctx.lineWidth = .35 + rand() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(511, x + length), y + (rand() - .5) * 2.4);
    ctx.stroke();
  }
  for (let i = 0; i < 8000; i++) {
    const shade = rand() > .55 ? 170 : 8;
    ctx.fillStyle = `rgba(${shade},${shade + (shade < 20 ? 6 : 0)},${shade + (shade < 20 ? 4 : -4)},${.02 + rand() * .07})`;
    ctx.fillRect(rand() * 512, rand() * 256, .5 + rand() * 1.5, .5 + rand() * 1.3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createSlideMark() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(204,211,201,.8)';
  ctx.font = '600 47px Arial, sans-serif';
  ctx.fillText('G17', 18, 54);
  ctx.fillStyle = 'rgba(176,184,174,.55)';
  ctx.font = '17px monospace';
  ctx.fillText('9×19  ·  HANA FIELD SERIES', 162, 48);
  ctx.fillStyle = 'rgba(178,187,176,.39)';
  ctx.fillRect(18, 69, 475, 1);
  ctx.font = '12px monospace';
  ctx.fillText('SERVICE SIDEARM  /  07-19', 19, 86);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPistolGrip(parent, materials) {
  const profile = new THREE.Shape();
  // Side profile of a compact, steep-angle service-pistol grip. Shape X maps to model -Z.
  profile.moveTo(.025, -.105);
  profile.lineTo(.075, -.14);
  profile.lineTo(.088, -.22);
  profile.lineTo(.09, -.286);
  profile.quadraticCurveTo(.085, -.337, .037, -.35);
  profile.lineTo(-.115, -.325);
  profile.quadraticCurveTo(-.147, -.315, -.14, -.274);
  profile.lineTo(-.105, -.145);
  profile.quadraticCurveTo(-.095, -.112, -.055, -.105);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: .104, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .012, bevelThickness: .012 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-.052, 0, 0);
  const grip = new THREE.Mesh(geometry, materials.grip);
  grip.castShadow = true;
  grip.receiveShadow = true;
  parent.add(grip);

  for (const side of [-1, 1]) {
    const panel = roundedBox(parent, [.009, .177, .112], [side * .057, -.233, .027], materials.gripPanel, .016, 3);
    panel.rotation.x = -.11;
    panel.rotation.z = side * -.015;
    // Molded stipple dots, kept in instancing batches so the close-up grip reads as textured without draw-call cost.
    const dotGeometry = new THREE.SphereGeometry(.0027, 5, 4);
    const dots = new THREE.InstancedMesh(dotGeometry, materials.gripDot, 84);
    const matrix = new THREE.Matrix4();
    let n = 0;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 7; col++) {
        const y = -.157 - row * .0132;
        const z = -.014 + col * .014 + (row % 2) * .006;
        const jitter = ((row * 17 + col * 11) % 5) * .0009;
        matrix.compose(new THREE.Vector3(side * .063, y + jitter, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        dots.setMatrixAt(n++, matrix);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    dots.castShadow = false;
    parent.add(dots);
  }

  const backstrap = roundedBox(parent, [.106, .22, .034], [0, -.224, .116], materials.gripBack, .014, 3);
  backstrap.rotation.x = -.13;
  // Molded finger shelves on the forward edge.
  for (let i = 0; i < 3; i++) {
    const finger = roundedBox(parent, [.112, .018, .035], [0, -.204 - i * .038, -.014], materials.gripBack, .007, 2);
    finger.rotation.x = -.08;
  }
  return grip;
}

function createMagazine(materials) {
  const group = new THREE.Group();
  roundedBox(group, [.078, .176, .064], [0, -.001, 0], materials.magazine, .009, 3);
  roundedBox(group, [.095, .026, .083], [0, -.094, .006], materials.magBase, .006, 2);
  for (const side of [-1, 1]) {
    const rail = roundedBox(group, [.007, .122, .01], [side * .041, -.004, -.012], materials.magRail, .003, 2);
    rail.rotation.z = side * -.035;
    for (let i = 0; i < 5; i++) {
      const witness = new THREE.Mesh(new THREE.CircleGeometry(.004, 6), materials.witness);
      witness.rotation.y = side * Math.PI / 2;
      witness.position.set(side * .040, .048 - i * .022, .008);
      group.add(witness);
    }
  }
  // Feed lips and a small, deliberately muted brass glimpse at the top.
  roundedBox(group, [.07, .018, .058], [0, .093, 0], materials.magRail, .004, 2);
  const brass = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .018, 8), materials.brass);
  brass.position.set(0, .107, -.006);
  group.add(brass);
  return group;
}

function makeSegmentGeometry(radiusTop, radiusBottom, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, 10, 1), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function setSegment(mesh, start, end) {
  const a = start;
  const b = end;
  const direction = b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  mesh.scale.y = direction.length();
}

function addHandSegment(parent, start, end, radius, material) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(.001, length - radius * 2), 4, 7);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildFiringHand(parent, material, seamMaterial) {
  const hand = new THREE.Group();
  // Palm sits behind the steep grip; fingers wrap around its front strap instead of forming a flat mitten.
  roundedBox(hand, [.128, .174, .136], [0, -.205, .115], material, .045, 4);
  roundedBox(hand, [.106, .042, .105], [0, -.119, .161], seamMaterial, .018, 3);

  // Trigger finger: straight along the frame, then bent naturally inside the trigger guard.
  addHandSegment(hand, [-.034, -.121, .158], [-.038, -.119, .065], .014, material);
  addHandSegment(hand, [-.038, -.119, .065], [-.039, -.128, .005], .013, material);
  addHandSegment(hand, [-.039, -.128, .005], [-.037, -.112, -.018], .011, material);
  roundedBox(hand, [.022, .011, .024], [-.039, -.119, .045], seamMaterial, .005, 2);

  // Three curled fingers follow the front contour of the grip. Their stagger makes the grasp read in close-up.
  const fingerRows = [-.166, -.207, -.248];
  fingerRows.forEach((y, index) => {
    const x = -.052 + index * .003;
    addHandSegment(hand, [x, y + .012, .171], [x - .002, y, .091], .015, material);
    addHandSegment(hand, [x - .002, y, .091], [x - .004, y - .008, .012], .014, material);
    addHandSegment(hand, [x - .004, y - .008, .012], [x - .003, y - .028, -.059], .013, material);
    addHandSegment(hand, [x - .003, y - .028, -.059], [x + .002, y - .04, -.028], .012, material);
    roundedBox(hand, [.018, .013, .024], [x - .007, y + .004, .091], seamMaterial, .006, 2);
  });

  // Thumb pad lays across the exposed side of the frame and anchors on the backstrap.
  addHandSegment(hand, [-.064, -.123, .151], [-.079, -.16, .119], .019, material);
  addHandSegment(hand, [-.079, -.16, .119], [-.078, -.207, .071], .018, material);
  addHandSegment(hand, [-.078, -.207, .071], [-.068, -.226, .022], .016, material);
  roundedBox(hand, [.008, .067, .043], [-.071, -.186, .12], seamMaterial, .008, 2);

  // Small raised knuckle pads and a fabric seam keep the glove from reading as a smooth toy hand.
  for (let i = 0; i < 3; i++) {
    const y = fingerRows[i] + .003;
    roundedBox(hand, [.018, .014, .026], [-.067, y, .103], seamMaterial, .006, 2);
  }
  parent.add(hand);
  return hand;
}

function buildSupportHand(parent, material, seamMaterial, scale = .86) {
  const hand = new THREE.Group();
  hand.scale.setScalar(scale);
  // Palm is horizontal under the dust cover; fingers curl up around the frame.
  roundedBox(hand, [.146, .073, .159], [0, 0, 0], material, .03, 3);
  for (let i = 0; i < 4; i++) {
    const x = -.052 + i * .034;
    addHandSegment(hand, [x, .008, -.043], [x, .054, -.014], .014, material);
    addHandSegment(hand, [x, .054, -.014], [x, .082, .031], .013, material);
    roundedBox(hand, [.021, .012, .026], [x, .046, -.012], seamMaterial, .005, 2);
  }
  addHandSegment(hand, [-.072, .005, .02], [-.05, .046, .079], .018, material);
  addHandSegment(hand, [-.05, .046, .079], [-.007, .068, .087], .016, material);
  roundedBox(hand, [.096, .022, .075], [0, -.04, .035], seamMaterial, .009, 2);
  parent.add(hand);
  return hand;
}

export function createG17(camera, scene) {
  const slideFinish = createSlideFinishTexture();
  const materials = {
    slide: new THREE.MeshStandardMaterial({ color: 0xd8ded8, map: slideFinish, roughness: .38, metalness: .68, emissive: 0x0a0e0b, emissiveIntensity: .14 }),
    slideTop: new THREE.MeshStandardMaterial({ color: 0x39413d, roughness: .43, metalness: .58 }),
    slideEdge: new THREE.MeshStandardMaterial({ color: 0x7b8580, roughness: .31, metalness: .72 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x39423c, roughness: .66, metalness: .2 }),
    frameEdge: new THREE.MeshStandardMaterial({ color: 0x59645c, roughness: .5, metalness: .38 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x4b554c, map: createStippleTexture(), roughness: .88, metalness: .02 }),
    gripPanel: new THREE.MeshStandardMaterial({ color: 0x414a42, map: createStippleTexture(), roughness: .92, metalness: .02 }),
    gripBack: new THREE.MeshStandardMaterial({ color: 0x29322b, roughness: .91, metalness: .02 }),
    gripDot: new THREE.MeshStandardMaterial({ color: 0x687268, roughness: .92, metalness: .01 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151b18, roughness: .42, metalness: .45 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x242b27, roughness: .48, metalness: .54 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe0e5d1, emissive: 0x7c8760, emissiveIntensity: .42, roughness: .34, metalness: .08 }),
    magRail: new THREE.MeshStandardMaterial({ color: 0x69736d, roughness: .4, metalness: .66 }),
    magazine: new THREE.MeshStandardMaterial({ color: 0x364039, roughness: .54, metalness: .38 }),
    magBase: new THREE.MeshStandardMaterial({ color: 0x29322c, roughness: .68, metalness: .2 }),
    witness: new THREE.MeshBasicMaterial({ color: 0x080d0d, side: THREE.DoubleSide }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8d6238, roughness: .34, metalness: .78 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x515346, roughness: .92, metalness: .01 }),
    gloveSeam: new THREE.MeshStandardMaterial({ color: 0x767766, roughness: .9, metalness: .01 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x39433c, roughness: .89, metalness: .02 }),
    sleeveTrim: new THREE.MeshStandardMaterial({ color: 0x626651, roughness: .82, metalness: .01 }),
  };

  const weaponFill = new THREE.PointLight(0xd7ded1, 2.8, 2.7, 2);
  weaponFill.position.set(-.16, .38, -.42);
  camera.add(weaponFill);
  const weaponRoot = new THREE.Group();
  camera.add(weaponRoot);
  weaponRoot.position.set(.25, -.21, -.78);
  weaponRoot.rotation.set(.015, .017, -.02);
  const gun = new THREE.Group();
  gun.scale.set(.73, .73, .68);
  gun.rotation.y = .018;
  gun.rotation.x = .018;
  weaponRoot.add(gun);

  // Polymer frame, front dust cover and upper rails.
  roundedBox(gun, [.116, .082, .305], [0, -.062, .035], materials.frame, .022, 3);
  roundedBox(gun, [.103, .057, .154], [0, -.064, -.149], materials.frame, .017, 3);
  roundedBox(gun, [.107, .043, .128], [0, -.031, -.13], materials.frameEdge, .012, 2);
  for (let i = 0; i < 6; i++) {
    roundedBox(gun, [.124, .012, .022], [0, .001 - i * .0007, -.198 + i * .022], materials.slideEdge, .003, 2);
  }
  // Dust-cover rail slots and small serial / control geometry.
  for (let i = 0; i < 5; i++) {
    cube(gun, [.125, .006, .012], [0, -.014, -.213 + i * .027], materials.black);
  }

  // Lower trigger guard, trigger and frame-pin hardware.
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.064, .0065, 6, 24), materials.frameEdge);
  guard.rotation.y = Math.PI / 2;
  guard.scale.set(.74, 1, 1);
  guard.position.set(0, -.109, .003);
  guard.castShadow = true;
  gun.add(guard);
  const triggerMesh = roundedBox(gun, [.016, .058, .018], [0, -.112, -.012], materials.black, .006, 2);
  triggerMesh.rotation.x = -.18;
  triggerMesh.userData.isTrigger = true;
  roundedBox(gun, [.012, .024, .015], [0, -.094, -.02], materials.slideEdge, .004, 2);
  createPistolGrip(gun, materials);

  // Magazine: separate animated component with witness marks, feed lips and floorplate.
  const mag = createMagazine(materials);
  const magBasePosition = new THREE.Vector3(0, -.259, .037);
  mag.position.copy(magBasePosition);
  gun.add(mag);
  const freshMag = createMagazine(materials);
  freshMag.position.copy(magBasePosition);
  freshMag.visible = false;
  gun.add(freshMag);
  const magSocket = new THREE.Object3D();
  magSocket.position.copy(magBasePosition);
  gun.add(magSocket);

  // Fixed barrel and front muzzle ring visible through the slide cut.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.027, .029, .31, 12, 1), materials.slideEdge);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, .025, -.105);
  barrel.castShadow = true;
  gun.add(barrel);
  const barrelRear = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .075, 10), materials.inner);
  barrelRear.rotation.x = Math.PI / 2;
  barrelRear.position.set(0, .027, .021);
  gun.add(barrelRear);
  const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(.024, .004, 5, 14), materials.slideEdge);
  muzzleRing.position.set(0, .025, -.263);
  gun.add(muzzleRing);
  const muzzleBore = new THREE.Mesh(new THREE.CircleGeometry(.020, 16), materials.black);
  muzzleBore.position.set(0, .025, -.266);
  gun.add(muzzleBore);
  const boreInner = new THREE.Mesh(new THREE.CircleGeometry(.009, 12), materials.inner);
  boreInner.position.set(0, .025, -.267);
  gun.add(boreInner);

  // Slide reciprocates independently of the frame, with believable serrations and cutouts.
  const slide = new THREE.Group();
  gun.add(slide);
  roundedBox(slide, [.131, .102, .417], [0, .035, -.067], materials.slide, .025, 4);
  roundedBox(slide, [.108, .02, .359], [0, .093, -.066], materials.slideTop, .008, 3);
  // Beveled front shoulder and rear plate.
  roundedBox(slide, [.124, .093, .035], [0, .032, -.276], materials.slideEdge, .01, 2);
  roundedBox(slide, [.126, .092, .04], [0, .03, .146], materials.slideTop, .009, 2);
  for (const side of [-1, 1]) {
    // Front and rear chamfer lines.
    roundedBox(slide, [.006, .052, .267], [side * .067, .032, -.104], materials.slideTop, .003, 2);
    // Deep rear cocking serrations and shorter front serrations make the slide easier to read in profile.
    for (let i = 0; i < 9; i++) {
      const groove = roundedBox(slide, [.004, .072, .009], [side * .0675, .03, .055 + i * .0105], materials.black, .002, 2);
      groove.rotation.y = side * -.16;
    }
    for (let i = 0; i < 5; i++) {
      roundedBox(slide, [.0045, .044, .007], [side * .0676, .029, -.233 + i * .012], materials.inner, .002, 2);
    }
    // Ejection port and exposed chamber hood.
    roundedBox(slide, [.004, .044, .091], [side * .0677, .044, -.055], materials.black, .007, 3);
    roundedBox(slide, [.003, .026, .057], [side * .0705, .051, -.055], materials.slideEdge, .006, 3);
    roundedBox(slide, [.003, .012, .055], [side * .0725, .043, -.055], materials.inner, .003, 2);
    // Takedown pin, slide stop, and shallow stamped controls.
    axisCylinder(slide, .012, .012, [side * .071, -.019, .07], materials.slideEdge, 'x', 10);
    roundedBox(slide, [.013, .016, .065], [side * .072, -.015, .006], materials.slideEdge, .005, 2).rotation.y = side * .24;
    roundedBox(slide, [.011, .011, .036], [side * .073, .003, .018], materials.inner, .003, 2);
    // Slide-side machining grooves.
    for (let i = 0; i < 3; i++) {
      roundedBox(slide, [.0025, .003, .17], [side * .067, -.01 - i * .005, -.154], materials.slideEdge, .001, 1);
    }
  }

  // Iron sights: rear notch and a small contrasting front post.
  roundedBox(slide, [.093, .026, .045], [0, .099, .133], materials.black, .007, 2);
  roundedBox(slide, [.014, .015, .032], [-.027, .113, .131], materials.slideEdge, .003, 2);
  roundedBox(slide, [.014, .015, .032], [.027, .113, .131], materials.slideEdge, .003, 2);
  const rearDotL = new THREE.Mesh(new THREE.CircleGeometry(.005, 8), materials.white);
  rearDotL.position.set(-.026, .112, .105);
  slide.add(rearDotL);
  const rearDotR = rearDotL.clone(); rearDotR.position.x = .026; slide.add(rearDotR);
  roundedBox(slide, [.035, .025, .034], [0, .104, -.246], materials.black, .005, 2);
  roundedBox(slide, [.007, .012, .025], [0, .119, -.244], materials.white, .003, 2);

  // Laser-etched slide mark and restrained serial details.
  const markTexture = createSlideMark();
  const markMaterial = new THREE.MeshBasicMaterial({ map: markTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const markLeft = new THREE.Mesh(new THREE.PlaneGeometry(.184, .034), markMaterial);
  markLeft.rotation.y = -Math.PI / 2;
  markLeft.position.set(-.068, .005, .008);
  slide.add(markLeft);
  const markRight = new THREE.Mesh(new THREE.PlaneGeometry(.184, .034), markMaterial);
  markRight.rotation.y = Math.PI / 2;
  markRight.position.set(.068, .005, .008);
  slide.add(markRight);

  // Frame controls, magazine release, pins and safety markings on both sides.
  for (const side of [-1, 1]) {
    axisCylinder(gun, .011, .014, [side * .063, -.075, .089], materials.slideEdge, 'x', 12);
    roundedBox(gun, [.014, .037, .019], [side * .064, -.062, -.025], materials.slideEdge, .006, 2);
    roundedBox(gun, [.014, .013, .04], [side * .064, -.052, -.035], materials.inner, .004, 2);
    roundedBox(gun, [.013, .03, .018], [side * .063, -.094, -.04], materials.frameEdge, .004, 2);
    const pin = new THREE.Mesh(new THREE.CircleGeometry(.009, 10), materials.slideEdge);
    pin.rotation.y = side * Math.PI / 2;
    pin.position.set(side * .062, -.079, .135);
    gun.add(pin);
    const safety = new THREE.Mesh(new THREE.CircleGeometry(.004, 8), materials.white);
    safety.rotation.y = side * Math.PI / 2;
    safety.position.set(side * .073, -.069, .016);
    gun.add(safety);
  }
  // Frame rails and compact textured undercut.
  for (let i = 0; i < 4; i++) {
    roundedBox(gun, [.125, .009, .014], [0, -.109, -.199 + i * .026], materials.slideEdge, .002, 2);
  }
  roundedBox(gun, [.105, .027, .058], [0, -.122, -.178], materials.black, .009, 2);
  // A small lanyard / heel plate and molded backstrap detail.
  roundedBox(gun, [.111, .028, .026], [0, -.35, .069], materials.frameEdge, .008, 2);

  // Right firing hand and sleeve are part of the viewmodel, not a floating gun.
  const rightArm = makeSegmentGeometry(.046, .064, materials.sleeve);
  rightArm.scale.y = .58;
  rightArm.position.set(.18, -.43, .28);
  rightArm.rotation.z = -.29;
  gun.add(rightArm);
  const cuff = roundedBox(gun, [.12, .06, .075], [.038, -.23, .19], materials.sleeveTrim, .02, 3);
  cuff.rotation.z = -.15;
  const firingHand = buildFiringHand(gun, materials.glove, materials.gloveSeam);
  firingHand.rotation.set(.015, -.015, -.012);

  // Viewmodel muzzle flash: warm lens flare, short directional flame and a single light.
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = flashCanvas.height = 128;
  const flashCtx = flashCanvas.getContext('2d');
  const flashGradient = flashCtx.createRadialGradient(64, 64, 2, 64, 64, 61);
  flashGradient.addColorStop(0, 'rgba(255,255,230,1)');
  flashGradient.addColorStop(.15, 'rgba(255,222,145,.95)');
  flashGradient.addColorStop(.4, 'rgba(255,111,48,.68)');
  flashGradient.addColorStop(1, 'rgba(235,54,20,0)');
  flashCtx.fillStyle = flashGradient;
  flashCtx.fillRect(0, 0, 128, 128);
  const flashTexture = new THREE.CanvasTexture(flashCanvas);
  const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture, color: 0xffd29a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flashSprite.scale.set(.22, .22, 1);
  flashSprite.position.set(0, .025, -.31);
  flashSprite.visible = false;
  gun.add(flashSprite);
  const flashLight = new THREE.PointLight(0xffad62, 0, 3, 2);
  flashLight.position.set(0, .04, -.28);
  gun.add(flashLight);

  const ejectionPoint = new THREE.Object3D();
  ejectionPoint.position.set(-.072, .045, -.05);
  gun.add(ejectionPoint);
  const shellGeometry = new THREE.CylinderGeometry(.006, .006, .024, 8);
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x9b6b38, metalness: .82, roughness: .28 });
  const casings = [];

  // Left supporting forearm / hand, repositioned for reload and inspect choreography.
  const supportArm = makeSegmentGeometry(.036, .05, materials.sleeve);
  camera.add(supportArm);
  const supportCuff = roundedBox(camera, [.098, .055, .065], [0, 0, 0], materials.sleeveTrim, .018, 3);
  const supportHand = buildSupportHand(camera, materials.glove, materials.gloveSeam, .78);
  const elbow = new THREE.Vector3(-.46, -.91, -.50);
  const supportIdleSocket = new THREE.Object3D();
  supportIdleSocket.position.set(-.14, -.14, -.21);
  gun.add(supportIdleSocket);
  const supportInspectSocket = new THREE.Object3D();
  supportInspectSocket.position.set(-.12, .025, .08);
  gun.add(supportInspectSocket);
  const cameraQuaternion = new THREE.Quaternion();
  const gunQuaternion = new THREE.Quaternion();
  const supportHandRotation = new THREE.Quaternion();
  const supportHandEuler = new THREE.Euler();

  const hipPosition = new THREE.Vector3(.25, -.21, -.78);
  const adsPosition = new THREE.Vector3(.005, -.084, -.75);
  const inspectPosition = new THREE.Vector3(.13, -.05, -.74);
  const hipRotation = new THREE.Euler(.015, .017, -.02);
  const adsRotation = new THREE.Euler(-.018, -.018, 0);
  const inspectRotation = new THREE.Euler(-.12, -.31, -.18);
  let reloadTimer = 0;
  let reloadDuration = 1.72;
  let reloadEmpty = false;
  let inspectTimer = 0;
  let flashTimer = 0;
  let kick = 0;
  let slideRecoil = 0;
  let triggerPulse = 0;
  let aimBlend = 0;
  const casingGravity = new THREE.Vector3(0, -5.7, 0);
  const scratch = new THREE.Vector3();

  function spawnCasing() {
    const casing = new THREE.Mesh(shellGeometry, shellMaterial);
    gun.updateMatrixWorld(true);
    ejectionPoint.getWorldPosition(casing.position);
    camera.getWorldQuaternion(casing.quaternion);
    casing.rotateX(Math.PI / 2 + Math.random() * .4);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    casing.userData.velocity = right.multiplyScalar(1.45 + Math.random() * .75).addScaledVector(up, .8 + Math.random() * .5).addScaledVector(forward, .2);
    casing.userData.life = 2.4;
    casing.castShadow = false;
    scene.add(casing);
    casings.push(casing);
    if (casings.length > 12) {
      const oldest = casings.shift();
      scene.remove(oldest);
    }
  }

  function updateReload(dt, deltaPosition, deltaRotation) {
    reloadTimer += dt;
    const u = Math.min(1, reloadTimer / reloadDuration);
    const ease = (from, to, value) => {
      const t = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
      return t * t * (3 - 2 * t);
    };

    // Bring the pistol up and inward into the camera's clear center, presenting the magwell rather than hiding it below frame.
    const raise = ease(0, .18, u);
    const recover = ease(.86, 1, u);
    const reloadPose = raise * (1 - recover);
    deltaPosition.x -= .10 * reloadPose;
    deltaPosition.y += .21 * reloadPose;
    deltaPosition.z -= .025 * reloadPose;
    deltaRotation.x += .045 * reloadPose;
    deltaRotation.y += .12 * reloadPose;
    deltaRotation.z += .10 * reloadPose;

    // Old magazine leaves the well first; the replacement is then seated in one deliberate upward motion.
    const eject = ease(.24, .40, u);
    mag.visible = u < .42;
    mag.position.copy(magBasePosition);
    mag.position.y -= .205 * eject;
    mag.position.z += .064 * eject;

    const insert = ease(.47, .78, u);
    freshMag.visible = u >= .42 && u < .88;
    freshMag.position.copy(magBasePosition);
    freshMag.position.y -= .205 * (1 - insert);
    freshMag.position.z += .09 * (1 - insert);
    freshMag.position.x = -.012 * (1 - insert);

    if (reloadEmpty) {
      const drawBack = ease(.81, .86, u);
      const release = ease(.91, .965, u);
      slide.position.z = .052 * drawBack * (1 - release);
    } else if (u > .77) {
      slide.position.z = 0;
    }

    if (u >= .88) {
      mag.visible = true;
      mag.position.copy(magBasePosition);
      freshMag.visible = false;
    }
    if (u >= 1) {
      reloadTimer = 0;
      mag.visible = true;
      mag.position.copy(magBasePosition);
      freshMag.visible = false;
      slide.position.z = 0;
      return true;
    }
    return false;
  }

  function startReload(isEmpty = false) {
    if (reloadTimer > 0 || inspectTimer > 0) return false;
    reloadTimer = .0001;
    reloadEmpty = isEmpty;
    reloadDuration = isEmpty ? 1.95 : 1.72;
    slideRecoil = 0;
    slide.position.z = 0;
    return true;
  }

  function startInspect() {
    if (reloadTimer > 0) return false;
    inspectTimer = 2.12;
    return true;
  }

  function fire() {
    if (reloadTimer > 0 || inspectTimer > .35) return false;
    flashTimer = .075;
    flashSprite.visible = true;
    flashLight.intensity = 20;
    kick = 1;
    slideRecoil = .058;
    triggerPulse = 1;
    spawnCasing();
    return true;
  }

  function update(dt, elapsed, options = {}) {
    const { aiming = false, moving = false, lookX = 0, lookY = 0 } = options;
    const inReload = reloadTimer > 0;
    const inInspect = inspectTimer > 0;
    aimBlend = THREE.MathUtils.damp(aimBlend, aiming && !inReload && !inInspect ? 1 : 0, 11, dt);
    const p = hipPosition.clone().lerp(adsPosition, aimBlend);
    const r = new THREE.Euler(
      THREE.MathUtils.lerp(hipRotation.x, adsRotation.x, aimBlend),
      THREE.MathUtils.lerp(hipRotation.y, adsRotation.y, aimBlend),
      THREE.MathUtils.lerp(hipRotation.z, adsRotation.z, aimBlend),
    );
    const walk = moving ? 1 : 0;
    const bobRate = moving ? 8.4 : 1.55;
    const bobAmp = moving ? .012 : .003;
    p.y += Math.sin(elapsed * bobRate) * bobAmp;
    p.x += Math.sin(elapsed * bobRate * .5) * bobAmp * .56;
    r.z += Math.sin(elapsed * bobRate * .5) * (moving ? .018 : .005);
    r.x += Math.cos(elapsed * bobRate) * (moving ? .012 : .003);
    r.y += THREE.MathUtils.clamp(lookX, -1, 1) * .017;
    p.x += THREE.MathUtils.clamp(lookX, -1, 1) * .006;
    p.y -= THREE.MathUtils.clamp(lookY, -1, 1) * .005;

    kick = THREE.MathUtils.damp(kick, 0, 12, dt);
    slideRecoil = THREE.MathUtils.damp(slideRecoil, 0, 24, dt);
    if (reloadTimer <= 0) slide.position.z = slideRecoil;
    triggerPulse = THREE.MathUtils.damp(triggerPulse, 0, 18, dt);
    p.z += kick * .075;
    r.x -= kick * .16;
    r.y -= kick * .055;
    r.z -= kick * .035;

    if (inReload) {
      const deltaPosition = new THREE.Vector3();
      const deltaRotation = new THREE.Euler();
      const completed = updateReload(dt, deltaPosition, deltaRotation);
      p.add(deltaPosition);
      r.x += deltaRotation.x;
      r.y += deltaRotation.y;
      r.z += deltaRotation.z;
      if (completed) options.onReloadComplete?.();
    } else if (inInspect) {
      inspectTimer = Math.max(0, inspectTimer - dt);
      const blend = THREE.MathUtils.smoothstep(2.12 - inspectTimer, .14, .48);
      const returnBlend = THREE.MathUtils.smoothstep(2.12 - inspectTimer, 1.58, 2.08);
      const inspectAmount = blend * (1 - returnBlend);
      p.lerp(inspectPosition, inspectAmount);
      r.x = THREE.MathUtils.lerp(r.x, inspectRotation.x, inspectAmount);
      r.y = THREE.MathUtils.lerp(r.y, inspectRotation.y, inspectAmount);
      r.z = THREE.MathUtils.lerp(r.z, inspectRotation.z, inspectAmount);
    }

    weaponRoot.position.lerp(p, 1 - Math.exp(-dt * 14));
    weaponRoot.rotation.x = THREE.MathUtils.damp(weaponRoot.rotation.x, r.x, 13, dt);
    weaponRoot.rotation.y = THREE.MathUtils.damp(weaponRoot.rotation.y, r.y, 13, dt);
    weaponRoot.rotation.z = THREE.MathUtils.damp(weaponRoot.rotation.z, r.z, 13, dt);

    // The trigger breaks on each shot, then resets with a compact spring return.
    triggerMesh.rotation.x = -.18 - triggerPulse * .16;
    if (flashTimer > 0) {
      flashTimer = Math.max(0, flashTimer - dt);
      flashSprite.visible = flashTimer > 0;
      flashLight.intensity = flashTimer > 0 ? 20 * Math.min(1, flashTimer / .025) : 0;
      flashSprite.scale.setScalar(.17 + Math.random() * .04);
    }

    // Left hand supports the frame between shots, then reaches to the magwell and returns naturally.
    let reloadReach = 0;
    let slideReleaseReach = 0;
    if (inReload) {
      const u = Math.min(1, reloadTimer / reloadDuration);
      reloadReach = THREE.MathUtils.smoothstep(u, .06, .24);
      const withdrawStart = reloadEmpty ? .79 : .75;
      reloadReach *= 1 - THREE.MathUtils.smoothstep(u, withdrawStart, .96);
      if (reloadEmpty) {
        slideReleaseReach = THREE.MathUtils.smoothstep(u, .79, .86)
          * (1 - THREE.MathUtils.smoothstep(u, .94, .99));
      }
    }
    const inspectReach = inInspect ? .3 : 0;
    gun.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    magSocket.getWorldPosition(tempWorld);
    camera.worldToLocal(tempLocal.copy(tempWorld));
    const magHandTarget = tempLocal.clone().add(new THREE.Vector3(0, -.12, .105));
    const releaseWorld = gun.localToWorld(new THREE.Vector3(-.075, .055, .105));
    const releaseHandTarget = camera.worldToLocal(releaseWorld).add(new THREE.Vector3(.025, -.015, .045));
    supportIdleSocket.getWorldPosition(tempWorld);
    const idleHandTarget = camera.worldToLocal(tempLocal.copy(tempWorld)).clone();
    supportInspectSocket.getWorldPosition(tempWorld);
    const inspectHandTarget = camera.worldToLocal(tempLocal.copy(tempWorld)).clone();
    const target = idleHandTarget.lerp(magHandTarget, reloadReach);
    target.lerp(releaseHandTarget, slideReleaseReach);
    target.lerp(inspectHandTarget, inspectReach);
    supportHand.position.copy(target);
    supportHandEuler.set(.12 + reloadReach * .18 + slideReleaseReach * -.12, -.04, .08 + reloadReach * -.16);
    camera.getWorldQuaternion(cameraQuaternion);
    gun.getWorldQuaternion(gunQuaternion);
    supportHandRotation.setFromEuler(supportHandEuler);
    supportHand.quaternion.copy(cameraQuaternion.invert().multiply(gunQuaternion).multiply(supportHandRotation));
    const wrist = target.clone().add(new THREE.Vector3(0, .015, .055));
    setSegment(supportArm, elbow, wrist);
    supportCuff.position.copy(wrist).add(new THREE.Vector3(0, .025, -.02));
    supportCuff.quaternion.copy(supportArm.quaternion);
    supportCuff.scale.set(1, 1, 1);

    // Tiny ejected brass casings tumble and fall in world space.
    for (let i = casings.length - 1; i >= 0; i--) {
      const casing = casings[i];
      casing.userData.life -= dt;
      casing.userData.velocity.addScaledVector(casingGravity, dt);
      casing.position.addScaledVector(casing.userData.velocity, dt);
      casing.rotation.x += dt * 12;
      casing.rotation.z += dt * 8;
      if (casing.position.y < .04) {
        casing.position.y = .04;
        casing.userData.velocity.y *= -.24;
        casing.userData.velocity.x *= .55;
        casing.userData.velocity.z *= .55;
      }
      if (casing.userData.life <= 0) {
        scene.remove(casing);
        casings.splice(i, 1);
      }
    }
  }

  // Mark the physical trigger so it can be animated independently.
  // Inspect and reload pose start with an already-built viewmodel; no network asset is required.
  return {
    root: weaponRoot,
    fire,
    startReload,
    startInspect,
    update,
    get reloading() { return reloadTimer > 0; },
    get reloadProgress() { return reloadTimer > 0 ? THREE.MathUtils.clamp(reloadTimer / reloadDuration, 0, 1) : 0; },
    get inspecting() { return inspectTimer > 0; },
    get aimBlend() { return aimBlend; },
    getMuzzleWorldPosition(target = new THREE.Vector3()) {
      gun.updateMatrixWorld(true);
      return gun.localToWorld(target.set(0, .025, -.31));
    },
  };
}
