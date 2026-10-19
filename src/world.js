import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const yAxis = new THREE.Vector3(0, 1, 0);

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeConcreteTexture(seed = 19) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seeded(seed);
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#72766e');
  base.addColorStop(.48, '#505650');
  base.addColorStop(1, '#383e3b');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 145; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const radius = 10 + rand() * 80;
    const shade = rand() > .54 ? 'rgba(184,187,166,' : 'rgba(15,22,20,';
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
    gradient.addColorStop(0, `${shade}${(.025 + rand() * .08).toFixed(3)})`);
    gradient.addColorStop(1, `${shade}0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 21000; i++) {
    const value = rand() > .5 ? 190 : 13;
    const alpha = .025 + rand() * .12;
    ctx.fillStyle = `rgba(${value},${value + (value < 30 ? 5 : -2)},${value - (value < 30 ? 3 : 13)},${alpha})`;
    const w = .5 + rand() * 2.3;
    ctx.fillRect(rand() * size, rand() * size, w, .5 + rand() * 1.5);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = `rgba(14,19,18,${.1 + rand() * .22})`;
    ctx.lineWidth = .5 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - .5) * 28, y + 14 + rand() * 42);
    ctx.lineTo(x + (rand() - .5) * 35, y + 24 + rand() * 69);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeHeightTexture(seed = 91) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seeded(seed);
  ctx.fillStyle = '#7f7f7f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 16000; i++) {
    const v = Math.floor(80 + rand() * 105);
    ctx.fillStyle = `rgba(${v},${v},${v},${.1 + rand() * .22})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function standard(color, roughness = .78, metalness = .05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function box(parent, size, position, material, options = {}) {
  const geometry = options.rounded
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(options.radius ?? .04, Math.min(...size) * .23))
    : new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh);
  return mesh;
}

function cylinderBetween(parent, start, end, radiusTop, radiusBottom, material, sides = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, direction.length(), sides, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeNeonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101716';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = 'rgba(173,196,154,.34)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.shadowColor = '#b64c3c';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#c7624f';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('EAST BAY', 33, 91);
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#a8b88a';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('INDUSTRIAL DISTRICT  /  07', 38, 135);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#58655a';
  ctx.font = '14px monospace';
  ctx.fillText('AUTHORIZED PERSONNEL ONLY', 39, 160);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addWindow(parent, x, z, side, materials) {
  const outward = side < 0 ? -1 : 1;
  const frame = materials.rustedMetal;
  const glass = materials.windowGlass;
  box(parent, [.07, 1.15, 1.45], [x, 3.22, z], frame, { rounded: true, radius: .025 });
  box(parent, [.035, .99, 1.28], [x + outward * .046, 3.22, z], glass, { castShadow: false, receiveShadow: false });
  box(parent, [.025, 1.03, .045], [x + outward * .075, 3.22, z], materials.darkMetal, { castShadow: false });
  box(parent, [.025, .045, 1.34], [x + outward * .075, 3.22, z], materials.darkMetal, { castShadow: false });
  const mullion = box(parent, [.026, .96, .035], [x + outward * .079, 3.22, z], materials.darkMetal, { castShadow: false });
  mullion.position.z = z - .28;
  const glow = new THREE.PointLight(0x8d7250, .42, 3.6, 2);
  glow.position.set(x + outward * -.18, 3.25, z);
  parent.add(glow);
}

function addBarrel(parent, x, z, rustMaterial, rimMaterial) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.34, .35, .94, 12, 1), rustMaterial);
  body.position.y = .48;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  for (const y of [.16, .78]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.355, .355, .055, 12, 1), rimMaterial);
    band.position.y = y;
    band.castShadow = true;
    group.add(band);
  }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.335, .335, .028, 12, 1), rimMaterial);
  lid.position.y = .96;
  lid.castShadow = true;
  group.add(lid);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .015, 8), standard('#171c19', .62, .38));
  cap.rotation.x = Math.PI / 2;
  cap.position.set(.1, .98, .08);
  group.add(cap);
  parent.add(group);
  return group;
}

function addCrate(parent, x, y, z, scale = 1, woodMaterial, metalMaterial) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  box(group, [1.05, .82, .88], [0, .41, 0], woodMaterial, { rounded: true, radius: .055 });
  for (const s of [-1, 1]) {
    box(group, [.035, .79, .9], [s * .42, .41, 0], metalMaterial, { rounded: true, radius: .01 });
    for (let yBand = .16; yBand <= .7; yBand += .27) {
      box(group, [.045, .028, .94], [s * .445, yBand, 0], metalMaterial, { castShadow: true });
    }
  }
  box(group, [1.04, .045, .045], [0, .17, .453], metalMaterial);
  box(group, [1.04, .045, .045], [0, .68, .453], metalMaterial);
  parent.add(group);
  return group;
}

function addPuddle(parent, x, z, width, length, opacity = .45) {
  const shape = new THREE.Shape();
  shape.moveTo(-.45, -.48);
  shape.bezierCurveTo(-.15, -.54, .22, -.44, .45, -.3);
  shape.bezierCurveTo(.57, -.1, .48, .28, .28, .42);
  shape.bezierCurveTo(-.02, .53, -.38, .4, -.5, .17);
  shape.bezierCurveTo(-.59, -.03, -.54, -.32, -.45, -.48);
  const geometry = new THREE.ShapeGeometry(shape, 12);
  const material = new THREE.MeshPhysicalMaterial({ color: 0x66706c, roughness: .16, metalness: .32, clearcoat: .95, clearcoatRoughness: .1, transparent: true, opacity, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, .018, z);
  mesh.scale.set(width, length, 1);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWallLight(parent, side, z, index) {
  const x = side * 5.96;
  const color = index === 1 ? 0xb8463d : 0xb3b890;
  const casing = standard('#252b27', .42, .62);
  const lampMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.7, roughness: .25, metalness: .15 });
  box(parent, [.32, .19, .48], [x, 4.15, z], casing, { rounded: true, radius: .04 });
  box(parent, [.22, .035, .35], [x - side * .03, 4.04, z], lampMat, { castShadow: false, receiveShadow: false });
  const light = new THREE.PointLight(color, index === 1 ? 14 : 17, 12, 1.65);
  light.position.set(x - side * .25, 3.95, z);
  // Practical lights are shadowless on purpose; the single directional shadow keeps phones responsive.
  light.castShadow = false;
  parent.add(light);
  return light;
}

function addPipe(parent, side, zStart, zEnd, y, material) {
  const x = side * 5.78;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, Math.abs(zEnd - zStart), 9), material);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(x, y, (zStart + zEnd) / 2);
  pipe.castShadow = true;
  parent.add(pipe);
  for (const z of [zStart + .4, zEnd - .4]) {
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(.07, .012, 4, 8), standard('#373c37', .48, .7));
    clamp.rotation.y = Math.PI / 2;
    clamp.position.set(x, y, z);
    parent.add(clamp);
  }
}

function buildEnvironment(scene) {
  const concreteMap = makeConcreteTexture(22);
  const heightMap = makeHeightTexture(54);
  const concrete = new THREE.MeshStandardMaterial({ map: concreteMap, bumpMap: heightMap, bumpScale: .065, color: 0xb2b8aa, roughness: .94, metalness: .02 });
  concreteMap.repeat.set(2.6, 5.2);
  heightMap.repeat.set(2.6, 5.2);
  const floorMat = new THREE.MeshStandardMaterial({ map: concreteMap, bumpMap: heightMap, bumpScale: .09, color: 0x858c81, roughness: .31, metalness: .19 });
  concreteMap.colorSpace = THREE.SRGBColorSpace;
  const materials = {
    concrete,
    floor: floorMat,
    wallDark: standard('#353b37', .96, .02),
    trim: standard('#202724', .57, .56),
    rustedMetal: new THREE.MeshStandardMaterial({ map: concreteMap, color: 0x6d5241, roughness: .8, metalness: .62, bumpMap: heightMap, bumpScale: .035 }),
    darkMetal: standard('#252c2a', .45, .72),
    windowGlass: new THREE.MeshStandardMaterial({ color: 0x182724, emissive: 0x34453e, emissiveIntensity: .18, roughness: .2, metalness: .18, transparent: true, opacity: .9 }),
    wood: standard('#4d5145', .91, .03),
    sign: standard('#171f1b', .65, .25),
  };
  const world = new THREE.Group();
  scene.add(world);

  // The wet industrial lane.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -.035, -9);
  floor.receiveShadow = true;
  world.add(floor);
  // Concrete side walls and raised foundations.
  box(world, [.52, 5.4, 42], [-6.63, 2.7, -8], concrete, { castShadow: true });
  box(world, [.52, 5.4, 42], [6.63, 2.7, -8], concrete, { castShadow: true });
  box(world, [13.8, 5.4, .6], [0, 2.7, -29.1], concrete, { castShadow: true });
  box(world, [13.4, .42, 43], [0, .21, -8], materials.wallDark, { castShadow: false });
  for (const side of [-1, 1]) {
    box(world, [.6, .55, 42], [side * 6.55, .27, -8], materials.trim);
    // old masonry joints and corroded vertical pilasters
    for (let z = 9; z >= -26; z -= 4.8) {
      box(world, [.12, 4.9, .16], [side * 6.31, 2.55, z], materials.wallDark, { castShadow: false });
      box(world, [.13, .035, 3.9], [side * 6.31, 1.05, z - 1.2], materials.trim, { castShadow: false });
    }
  }

  // Shadowed loading bays, windows and a security gate at the end of the lane.
  addWindow(world, -6.27, -1.8, -1, materials);
  addWindow(world, -6.27, -12.8, -1, materials);
  addWindow(world, -6.27, -23.1, -1, materials);
  box(world, [.08, 2.7, 2.2], [6.26, 1.62, -21.2], materials.darkMetal, { rounded: true, radius: .02 });
  box(world, [.035, 2.35, 1.9], [6.205, 1.66, -21.2], standard('#17201c', .65, .28), { castShadow: false });
  for (let y = .58; y < 2.75; y += .22) {
    box(world, [.055, .025, 1.92], [6.17, y, -21.2], materials.trim, { castShadow: false });
  }
  box(world, [.05, .28, 1.95], [6.15, 3.04, -21.2], standard('#8c312c', .64, .22), { rounded: true, radius: .02 });
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(1.65, .17), new THREE.MeshBasicMaterial({ color: 0xd06450 }));
  exit.position.set(6.115, 3.04, -21.2);
  exit.rotation.y = -Math.PI / 2;
  world.add(exit);
  const exitLight = new THREE.PointLight(0xb43d31, 5.8, 5, 2);
  exitLight.position.set(5.7, 3.05, -21.2);
  world.add(exitLight);

  // Drainage, utility runs, warning paint, pipes and electrical boxes.
  addPipe(world, 1, 8, -20, 4.45, materials.darkMetal);
  addPipe(world, -1, 8, -27, 4.6, materials.rustedMetal);
  for (let z = 8; z >= -28; z -= 2.5) {
    box(world, [.16, .11, .17], [-6.22, 4.45, z], materials.darkMetal, { rounded: true, radius: .025 });
  }
  for (let z = 8; z >= -25; z -= 5) {
    box(world, [.35, .65, .42], [6.22, 2.05, z], materials.trim, { rounded: true, radius: .045 });
    box(world, [.03, .32, .16], [6.02, 2.16, z], standard('#a44335', .56, .2, { emissive: 0x170503 }), { castShadow: false });
  }
  // Hazard stripes painted on the near floor.
  for (let i = 0; i < 9; i++) {
    const stripe = box(world, [.07, .006, .72], [-4.25 + i * .25, .009, -4.1], standard(i % 2 ? '#272c29' : '#79634b', .9, .03), { castShadow: false, receiveShadow: false });
    stripe.rotation.y = -.35;
  }

  // Old industrial sign with a weak red glow.
  const signCanvas = makeNeonTexture();
  const signMat = new THREE.MeshBasicMaterial({ map: signCanvas, transparent: false, toneMapped: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.05, .78), signMat);
  sign.position.set(6.31, 3.34, -7.4);
  sign.rotation.y = -Math.PI / 2;
  world.add(sign);
  const signGlow = new THREE.PointLight(0xaa4939, 5.5, 5, 2);
  signGlow.position.set(5.62, 3.3, -7.4);
  world.add(signGlow);

  const lamps = [];
  lamps.push(addWallLight(world, -1, 4.8, 0));
  lamps.push(addWallLight(world, 1, -5.8, 1));
  lamps.push(addWallLight(world, -1, -15.2, 2));
  lamps.push(addWallLight(world, 1, -24, 3));

  // Clutter pushed to the walls, leaving a readable combat lane.
  addBarrel(world, -4.7, -7.5, materials.rustedMetal, materials.darkMetal);
  addBarrel(world, -4.0, -8.15, materials.rustedMetal, materials.darkMetal);
  addBarrel(world, 4.65, -14.1, materials.rustedMetal, materials.darkMetal);
  addCrate(world, -4.65, 0, -15.8, .94, materials.wood, materials.darkMetal);
  addCrate(world, -4.08, .78, -15.9, .72, materials.wood, materials.darkMetal);
  addCrate(world, 4.42, 0, -5.2, .84, materials.wood, materials.darkMetal);
  addCrate(world, 4.6, 0, -23.8, 1.05, materials.wood, materials.darkMetal);
  // Dumpster silhouette, lid and wheels.
  const dumpster = new THREE.Group();
  dumpster.position.set(4.62, 0, -9.5);
  box(dumpster, [1.24, .98, 1.55], [0, .64, 0], standard('#29332f', .76, .57), { rounded: true, radius: .08 });
  box(dumpster, [1.33, .11, 1.68], [0, 1.16, -.02], standard('#37413a', .62, .65), { rounded: true, radius: .05, rotation: [-.06, 0, -.04] });
  for (const x of [-.47, .47]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.095, .095, .08, 10), standard('#131817', .8, .22));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, .16, .49);
    dumpster.add(wheel);
  }
  box(dumpster, [.83, .21, .035], [0, .68, .79], standard('#3c4740', .72, .38), { castShadow: false });
  world.add(dumpster);

  // Wet patches catch the sparse practical lights.
  addPuddle(world, -1.3, 1.8, 1.1, 2.9, .26);
  addPuddle(world, 1.15, -4.5, 1.8, 2.5, .34);
  addPuddle(world, -.9, -10.2, 1.3, 3.2, .29);
  addPuddle(world, 1.8, -18.4, 2.0, 3.5, .31);
  addPuddle(world, -2.1, -24.4, 1.8, 2.1, .27);

  // Broken concrete and scraps, generated deterministically.
  const rand = seeded(777);
  const rubbleMat = [standard('#4f5550', .95, .02), standard('#363d3a', .94, .02), standard('#77796d', .92, .01)];
  for (let i = 0; i < 38; i++) {
    const side = rand() < .5 ? -1 : 1;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.08 + rand() * .15, 0), rubbleMat[i % rubbleMat.length]);
    rock.position.set(side * (2.8 + rand() * 2.9), .025 + rand() * .04, 9 - rand() * 36);
    rock.rotation.set(rand() * 2, rand() * 2, rand() * 2);
    rock.scale.set(1.3 + rand(), .45 + rand() * .6, .7 + rand());
    rock.castShadow = true;
    world.add(rock);
  }

  // Rain is one transparent point draw call, with a little parallax in the alley lights.
  const rainCount = 760;
  const rainPositions = new Float32Array(rainCount * 3);
  const rainSpeeds = new Float32Array(rainCount);
  const rainRand = seeded(414);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (rainRand() - .5) * 13;
    rainPositions[i * 3 + 1] = rainRand() * 8.5;
    rainPositions[i * 3 + 2] = 10 - rainRand() * 40;
    rainSpeeds[i] = 9 + rainRand() * 9;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({ color: 0xaab7ad, size: .024, transparent: true, opacity: .36, depthWrite: false, sizeAttenuation: true });
  const rain = new THREE.Points(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  world.add(rain);

  const rainDrift = new THREE.Vector3(-.9, 0, .1);
  return {
    update(dt, elapsed) {
      const positions = rainGeometry.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        const index = i * 3;
        positions[index] += rainDrift.x * dt;
        positions[index + 1] -= rainSpeeds[i] * dt;
        positions[index + 2] += rainDrift.z * dt;
        if (positions[index + 1] < .02) {
          positions[index] = (rainRand() - .5) * 13;
          positions[index + 1] = 7.8 + rainRand() * 1.6;
          positions[index + 2] = 10 - rainRand() * 40;
        }
      }
      rainGeometry.attributes.position.needsUpdate = true;
      lamps.forEach((light, index) => {
        const flicker = Math.sin(elapsed * (3.1 + index) + index * 5) * .07 + Math.sin(elapsed * 12.7 + index) * .025;
        light.intensity = (index === 1 ? 14 : 17) * (1 + flicker);
      });
      signGlow.intensity = 5.2 + Math.sin(elapsed * 5.2) * .3;
    },
  };
}

function makeLimb(parent, start, end, radiusA, radiusB, material, sides = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(radiusB, radiusA, direction.length(), sides, 2, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeZombieMaterial(color, roughness = .9, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .01, ...extra });
}

export function createZombie(scene, position, index = 0) {
  const root = new THREE.Group();
  root.position.set(position[0], 0, position[2]);
  root.scale.setScalar(index === 1 ? .96 : index === 2 ? 1.04 : 1);
  root.userData.health = 100;
  root.userData.maxHealth = 100;
  root.userData.dead = false;
  root.userData.index = index;
  root.userData.walkPhase = index * 1.7;
  root.userData.speed = .35 + index * .035;
  root.userData.attackCooldown = 0;
  root.userData.deathTime = 0;

  const skin = makeZombieMaterial(index === 1 ? '#827c6d' : '#707a69', .95);
  const skinLight = makeZombieMaterial('#9a8b78', .97);
  const shirt = makeZombieMaterial(index === 2 ? '#373c35' : '#343d37', .94);
  const shirtLight = makeZombieMaterial('#53554a', .95);
  const pants = makeZombieMaterial('#262c2b', .95);
  const shoe = makeZombieMaterial('#171c1a', .82, { metalness: .03 });
  const blood = makeZombieMaterial('#542b28', .76, { roughness: .88 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: index === 1 ? 0xe0804f : 0xb77a54 });
  const clothDark = makeZombieMaterial('#1a201d', .94);

  // Torso, vest and ragged shoulder layers.
  const torso = new THREE.Mesh(new RoundedBoxGeometry(.46, .63, .28, 3, .075), shirt);
  torso.position.set(0, 1.12, 0);
  torso.rotation.x = -.08;
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);
  const vest = new THREE.Mesh(new RoundedBoxGeometry(.35, .42, .055, 2, .025), shirtLight);
  vest.position.set(0, 1.12, .16);
  vest.rotation.x = -.08;
  vest.castShadow = true;
  root.add(vest);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(.055, .48, .03, 2, .012), clothDark);
    strap.position.set(side * .12, 1.15, .196);
    strap.rotation.z = side * -.13;
    root.add(strap);
  }
  const tornPatch = new THREE.Mesh(new THREE.CircleGeometry(.11, 7), blood);
  tornPatch.position.set(-.1, 1.05, .199);
  tornPatch.scale.set(1.25, .75, 1);
  root.add(tornPatch);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.082, .1, .19, 7), skin);
  neck.position.set(0, 1.49, .015);
  root.add(neck);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.172, 1), skin);
  head.position.set(0, 1.67, .045);
  head.scale.set(.88, 1.12, .92);
  head.rotation.z = index === 2 ? -.12 : .05;
  head.castShadow = true;
  head.userData.isHead = true;
  root.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.17, .06, .12), skinLight);
  jaw.position.set(0, 1.565, .14);
  jaw.rotation.x = -.15;
  root.add(jaw);
  const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(.143, 0), clothDark);
  hair.position.set(0, 1.79, .015);
  hair.scale.set(1.05, .44, 1.08);
  root.add(hair);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.018, 7, 5), eyeMat);
    eye.position.set(side * .066, 1.685, .185);
    root.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.037, 6, 5), skin);
    ear.position.set(side * .151, 1.66, .03);
    ear.scale.set(.6, .9, .66);
    root.add(ear);
  }

  const armPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .255, 1.34, .015);
    root.add(pivot);
    makeLimb(pivot, [0, 0, 0], [side * .04, -.31, .035], .085, .064, shirt);
    makeLimb(pivot, [side * .04, -.31, .035], [side * .01, -.63, .11], .064, .045, skin);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.064, .061, .09, 7), shirtLight);
    cuff.position.set(side * .04, -.33, .04);
    cuff.rotation.z = side * -.12;
    pivot.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.062, 7, 6), skin);
    hand.position.set(side * .01, -.67, .12);
    hand.scale.set(.78, 1.15, .66);
    pivot.add(hand);
    const nail = new THREE.Mesh(new THREE.BoxGeometry(.03, .018, .012), skinLight);
    nail.position.set(side * .01, -.69, .16);
    pivot.add(nail);
    armPivots.push({ pivot, side });
  }

  const legPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .12, .88, 0);
    root.add(pivot);
    makeLimb(pivot, [0, 0, 0], [side * .025, -.38, -.005], .105, .08, pants);
    makeLimb(pivot, [side * .025, -.38, -.005], [side * .012, -.77, .03], .08, .057, pants);
    const kneePatch = new THREE.Mesh(new RoundedBoxGeometry(.14, .12, .055, 2, .02), clothDark);
    kneePatch.position.set(side * .025, -.39, .075);
    pivot.add(kneePatch);
    const boot = new THREE.Mesh(new RoundedBoxGeometry(.13, .1, .24, 2, .025), shoe);
    boot.position.set(side * .012, -.81, .095);
    boot.castShadow = true;
    pivot.add(boot);
    legPivots.push({ pivot, side });
  }
  root.userData.armPivots = armPivots;
  root.userData.legPivots = legPivots;
  root.userData.head = head;
  root.traverse((object) => {
    if (object.isMesh) {
      object.userData.zombieRoot = root;
      object.castShadow = object.castShadow ?? true;
      object.receiveShadow = true;
    }
  });
  scene.add(root);
  return root;
}

export function updateZombiePose(zombie, dt, elapsed) {
  const data = zombie.userData;
  if (data.dead) {
    data.deathTime += dt;
    zombie.rotation.x = THREE.MathUtils.lerp(zombie.rotation.x, -1.24, Math.min(1, dt * 2.8));
    zombie.position.y = THREE.MathUtils.lerp(zombie.position.y, -.62, Math.min(1, dt * 2));
    zombie.scale.multiplyScalar(Math.max(.94, 1 - dt * .18));
    return;
  }
  data.walkPhase += dt * 5.1;
  const phase = data.walkPhase + elapsed * .3;
  data.legPivots.forEach(({ pivot, side }) => {
    pivot.rotation.x = Math.sin(phase + (side < 0 ? Math.PI : 0)) * .34;
  });
  data.armPivots.forEach(({ pivot, side }) => {
    pivot.rotation.x = -.55 + Math.sin(phase + (side < 0 ? 0 : Math.PI)) * .22;
    pivot.rotation.z = side * (.12 + Math.sin(phase) * .045);
  });
  data.head.rotation.z = Math.sin(phase * .5) * .04 + (data.index === 2 ? -.12 : .05);
  data.head.rotation.x = Math.sin(phase * .7) * .035;
}

export function createEnvironment(scene) {
  return buildEnvironment(scene);
}
