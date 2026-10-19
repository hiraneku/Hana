import * as THREE from 'three';
import './style.css';
import { createEnvironment, createZombie, updateZombiePose } from './world.js';
import { createG17 } from './weapon.js';
import { createAudio } from './audio.js';

const canvas = document.querySelector('#world');
const surface = document.querySelector('#game-surface');
const hud = document.querySelector('#hud');
const introScreen = document.querySelector('#intro-screen');
const pauseScreen = document.querySelector('#pause-screen');
const endScreen = document.querySelector('#end-screen');
const startButton = document.querySelector('#start-button');
const resumeButton = document.querySelector('#resume-button');
const restartButton = document.querySelector('#restart-button');
const pauseButton = document.querySelector('#pause-button');
const flashButton = document.querySelector('#flash-button');
const body = document.body;

const ui = {
  health: document.querySelector('#health-value'),
  healthFill: document.querySelector('#health-fill'),
  healthWidget: document.querySelector('.health-widget'),
  ammo: document.querySelector('#ammo'),
  reserve: document.querySelector('#reserve'),
  ammoWidget: document.querySelector('.ammo-widget'),
  damageFlash: document.querySelector('#damage-flash'),
  endEyebrow: document.querySelector('#end-eyebrow'),
  endTitle: document.querySelector('#end-title'),
  endCopy: document.querySelector('#end-copy'),
};

const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
body.classList.toggle('is-touch', isTouch);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
} catch (error) {
  console.error('WebGL renderer could not be created.', error);
  const warning = document.createElement('div');
  warning.className = 'webgl-warning';
  warning.textContent = 'WebGL tidak tersedia di browser ini. Coba gunakan Chrome atau Safari versi terbaru.';
  surface.append(warning);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.55 : 1.8));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111615);
scene.fog = new THREE.FogExp2(0x141a18, .027);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, .055, 80);
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.64, 6.7);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0x9baaa0, 0x1b211e, 1.18);
scene.add(hemi);
const fill = new THREE.DirectionalLight(0xa1b3a2, .63);
fill.position.set(-3.5, 8, 3);
fill.castShadow = true;
fill.shadow.mapSize.set(1024, 1024);
fill.shadow.camera.left = -10;
fill.shadow.camera.right = 10;
fill.shadow.camera.top = 10;
fill.shadow.camera.bottom = -10;
fill.shadow.camera.near = .5;
fill.shadow.camera.far = 32;
fill.shadow.bias = -.0004;
scene.add(fill);
const moonGlow = new THREE.DirectionalLight(0x687876, .24);
moonGlow.position.set(6, 5, -18);
scene.add(moonGlow);

const environment = createEnvironment(scene);
const weapon = createG17(camera, scene);

const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, -.015, -12);
camera.add(flashlightTarget);
const flashlight = new THREE.SpotLight(0xd9e6c7, 0, 26, Math.PI / 7.3, .58, 1.7);
flashlight.position.set(0, 0, -.03);
flashlight.target = flashlightTarget;
flashlight.castShadow = false;
camera.add(flashlight);

const audio = createAudio();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
raycaster.far = 42;
const centerAim = new THREE.Vector2(0, 0);
const playerPosition = new THREE.Vector3(0, 0, 6.7);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveVector = new THREE.Vector3();
const zombies = [];
const bloodParticles = [];
const bloodMaterials = [
  new THREE.MeshBasicMaterial({ color: 0x71372f, transparent: true, opacity: .9, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: 0x9b4536, transparent: true, opacity: .92, depthWrite: false }),
];
const keys = new Set();
const maxAmmo = 17;

let ammo = maxAmmo;
let reserve = 68;
let health = 100;
let kills = 0;
let gameActive = false;
let paused = false;
let missionComplete = false;
let aiming = false;
let flashlightOn = false;
let moving = false;
let elapsed = 0;
let yaw = 0;
let pitch = 0;
let recoilPitch = 0;
let fireCooldown = 0;
let damageCooldown = 0;
let mouseLook = false;
let lookPointer = null;
let lastLookX = 0;
let lastLookY = 0;
let joystickPointer = null;
let joystickInput = { x: 0, y: 0 };
let activeClock = 0;
let lastFootstep = 0;
let currentFpsTime = 0;
let frameCount = 0;
let fps = 60;

function initializeZombies() {
  for (const zombie of zombies) scene.remove(zombie);
  zombies.length = 0;
  zombies.push(createZombie(scene, [-.12, 0, -5.7], 0));
  zombies.push(createZombie(scene, [2.55, 0, -12.8], 1));
  zombies.push(createZombie(scene, [-2.5, 0, -19.2], 2));
}
initializeZombies();

function updateHud() {
  ui.health.textContent = String(Math.max(0, Math.ceil(health)));
  ui.healthFill.style.width = `${Math.max(0, health)}%`;
  ui.healthWidget.classList.toggle('critical', health <= 30);
  ui.ammo.textContent = String(ammo).padStart(2, '0');
  ui.reserve.textContent = String(reserve).padStart(2, '0');
  ui.ammoWidget.classList.toggle('low-ammo', ammo <= 3);
}
updateHud();

function spawnBlood(point, headshot = false) {
  const material = bloodMaterials[headshot ? 1 : 0];
  const count = headshot ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const size = .012 + Math.random() * .02;
    const particle = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 4), material);
    particle.position.copy(point);
    particle.userData.velocity = new THREE.Vector3((Math.random() - .5) * 1.1, .2 + Math.random() * .9, (Math.random() - .5) * 1.1);
    particle.userData.life = .42 + Math.random() * .25;
    scene.add(particle);
    bloodParticles.push(particle);
  }
}

function updateParticles(dt) {
  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const particle = bloodParticles[i];
    particle.userData.life -= dt;
    particle.userData.velocity.y -= 2.9 * dt;
    particle.position.addScaledVector(particle.userData.velocity, dt);
    particle.scale.multiplyScalar(Math.max(.93, 1 - dt * 1.6));
    if (particle.userData.life <= 0) {
      scene.remove(particle);
      particle.geometry.dispose();
      bloodParticles.splice(i, 1);
    }
  }
}

function damagePlayer(amount) {
  if (damageCooldown > 0 || !gameActive || paused || health <= 0) return;
  damageCooldown = .62;
  health = Math.max(0, health - amount);
  ui.damageFlash.classList.add('show');
  window.setTimeout(() => ui.damageFlash.classList.remove('show'), 180);
  audio.damage();
  updateHud();
  if (health <= 0) {
    health = 0;
    updateHud();
    gameOver(false);
  }
}

function damageZombie(zombie, hit) {
  if (!zombie || zombie.userData.dead) return;
  const headshot = Boolean(hit.object.userData.isHead);
  const damage = headshot ? 120 : 42;
  zombie.userData.health -= damage;
  spawnBlood(hit.point, headshot);
  audio.impact();
  if (zombie.userData.health <= 0) {
    zombie.userData.health = 0;
    zombie.userData.dead = true;
    zombie.userData.deathTime = 0;
    kills += 1;
    audio.groan();
    updateHud();
    if (zombies.every((enemy) => enemy.userData.dead)) {
      missionComplete = true;
      window.setTimeout(() => gameOver(true), 1750);
    }
  } else {
    // Brief flinch before it resumes advancing.
    zombie.userData.hitFlash = .11;
  }
}

function fireWeapon() {
  if (!gameActive || paused || missionComplete || weapon.reloading || weapon.inspecting || fireCooldown > 0) return;
  if (ammo <= 0) {
    if (reserve > 0) startReload();
    else audio.click();
    return;
  }
  if (!weapon.fire()) return;
  ammo -= 1;
  fireCooldown = .19;
  recoilPitch = Math.min(.05, recoilPitch + .018);
  audio.fire();
  updateHud();

  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(centerAim, camera);
  const targets = zombies.filter((zombie) => !zombie.userData.dead);
  const intersections = raycaster.intersectObjects(targets, true);
  const firstHit = intersections.find((intersection) => intersection.object.visible && intersection.object.userData.zombieRoot);
  if (firstHit) damageZombie(firstHit.object.userData.zombieRoot, firstHit);
}

function startReload() {
  if (ammo >= maxAmmo || reserve <= 0 || !gameActive || paused || missionComplete) {
    return;
  }
  if (weapon.startReload(ammo === 0)) {
    audio.reload();
  }
}

function toggleFlashlight() {
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 38 : 0;
  flashButton.classList.toggle('active', flashlightOn);
  audio.click();
}

function beginGame() {
  if (gameActive && !paused) return;
  audio.resume();
  gameActive = true;
  paused = false;
  missionComplete = false;
  introScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (!isTouch && canvas.requestPointerLock) {
    const lockRequest = canvas.requestPointerLock();
    lockRequest?.catch?.(() => {});
  }
}

function pauseGame() {
  if (!gameActive || paused) return;
  paused = true;
  aiming = false;
  document.querySelector('#aim-button').classList.remove('active');
  pauseScreen.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}

function resumeGame() {
  if (!gameActive) return;
  paused = false;
  pauseScreen.classList.add('hidden');
  audio.resume();
  if (!isTouch && canvas.requestPointerLock) {
    const lockRequest = canvas.requestPointerLock();
    lockRequest?.catch?.(() => {});
  }
}

function gameOver(won) {
  if (paused && !won) return;
  gameActive = false;
  paused = false;
  aiming = false;
  document.querySelector('#aim-button').classList.remove('active');
  if (document.pointerLockElement) document.exitPointerLock();
  pauseScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
  ui.endEyebrow.textContent = won ? 'SEKTOR 07 · TERKENDALI' : 'SEKTOR 07 · SINYAL HILANG';
  ui.endTitle.textContent = won ? 'UNTUK SAAT INI.' : 'KAMU TERJATUH.';
  ui.endCopy.textContent = won ? `Ancaman dihentikan. ${kills} tereliminasi. Jangan lengah.` : 'Sektor kembali sunyi. Coba lagi, penyintas.';
}

function resetMission() {
  for (const zombie of zombies) scene.remove(zombie);
  zombies.length = 0;
  for (const particle of bloodParticles) {
    scene.remove(particle);
    particle.geometry.dispose();
  }
  bloodParticles.length = 0;
  initializeZombies();
  playerPosition.set(0, 0, 6.7);
  camera.position.set(0, 1.64, 6.7);
  camera.rotation.set(0, 0, 0);
  yaw = 0;
  pitch = 0;
  health = 100;
  ammo = maxAmmo;
  reserve = 68;
  kills = 0;
  missionComplete = false;
  flashlightOn = false;
  flashlight.intensity = 0;
  flashButton.classList.remove('active');
  aiming = false;
  document.querySelector('#aim-button').classList.remove('active');
  joystickInput = { x: 0, y: 0 };
  gameActive = false;
  paused = false;
  endScreen.classList.add('hidden');
  introScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  updateHud();
  beginGame();
}

function handleLook(deltaX, deltaY, sensitivity = .00215) {
  yaw -= deltaX * sensitivity;
  pitch -= deltaY * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch, -1.15, 1.12);
}

function updatePlayer(dt) {
  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const forwardInput = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
    - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
    - joystickInput.y;
  const rightInput = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
    + joystickInput.x;
  moveVector.set(0, 0, 0).addScaledVector(forward, forwardInput).addScaledVector(right, rightInput);
  if (moveVector.lengthSq() > 1) moveVector.normalize();
  moving = moveVector.lengthSq() > .018;
  const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = isTouch ? 2.55 : sprinting ? 3.65 : 2.75;
  playerPosition.addScaledVector(moveVector, speed * dt);
  playerPosition.x = THREE.MathUtils.clamp(playerPosition.x, -5.25, 5.25);
  playerPosition.z = THREE.MathUtils.clamp(playerPosition.z, -27.3, 10.4);
  const bob = moving ? Math.sin(activeClock * (sprinting ? 12 : 9)) * (sprinting ? .047 : .028) : Math.sin(activeClock * 1.45) * .004;
  camera.position.set(playerPosition.x, 1.64 + bob, playerPosition.z);
  recoilPitch = THREE.MathUtils.damp(recoilPitch, 0, 9, dt);
  camera.rotation.set(pitch + recoilPitch, yaw, 0, 'YXZ');
  if (moving && activeClock - lastFootstep > (sprinting ? .34 : .49)) {
    if (Math.random() < .45) audio.step();
    lastFootstep = activeClock;
  }
}

function updateZombies(dt) {
  if (!gameActive || paused) return;
  for (const zombie of zombies) {
    if (zombie.userData.dead) {
      updateZombiePose(zombie, dt, elapsed);
      continue;
    }
    const dx = playerPosition.x - zombie.position.x;
    const dz = playerPosition.z - zombie.position.z;
    const distance = Math.hypot(dx, dz);
    zombie.rotation.y = Math.atan2(dx, dz);
    zombie.userData.attackCooldown = Math.max(0, zombie.userData.attackCooldown - dt);
    zombie.userData.hitFlash = Math.max(0, (zombie.userData.hitFlash || 0) - dt);
    if (zombie.userData.hitFlash > 0) {
      zombie.position.x -= dx / Math.max(distance, .01) * dt * .42;
      zombie.position.z -= dz / Math.max(distance, .01) * dt * .42;
    } else if (distance > 1.45) {
      const speed = zombie.userData.speed * (distance < 5.5 ? 1.2 : 1);
      zombie.position.x += dx / Math.max(distance, .01) * speed * dt;
      zombie.position.z += dz / Math.max(distance, .01) * speed * dt;
    } else if (zombie.userData.attackCooldown <= 0) {
      zombie.userData.attackCooldown = 1.15 + Math.random() * .35;
      damagePlayer(9 + Math.floor(Math.random() * 5));
      audio.groan();
    }
    updateZombiePose(zombie, dt, elapsed);
  }
}

function updateFrame(dt) {
  elapsed += dt;
  environment.update(dt, elapsed);
  fireCooldown = Math.max(0, fireCooldown - dt);
  damageCooldown = Math.max(0, damageCooldown - dt);
  activeClock += gameActive && !paused ? dt : 0;
  if (gameActive && !paused) updatePlayer(dt);
  else {
    moving = false;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  updateZombies(dt);
  updateParticles(dt);
  weapon.update(gameActive && !paused ? dt : 0, elapsed, {
    aiming: aiming && gameActive && !paused,
    moving: moving && gameActive && !paused,
    lookX: mouseLook ? (lastLookX || 0) * .01 : 0,
    lookY: mouseLook ? (lastLookY || 0) * .01 : 0,
    onReloadComplete: () => {
      const loaded = Math.min(maxAmmo - ammo, reserve);
      ammo += loaded;
      reserve -= loaded;
      updateHud();
    },
  });
  const targetFov = weapon.aimBlend > 0 ? THREE.MathUtils.lerp(68, 56, weapon.aimBlend) : 68;
  if (Math.abs(camera.fov - targetFov) > .02) {
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 9, dt);
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
  frameCount++;
  currentFpsTime += dt;
  if (currentFpsTime > 1) {
    fps = Math.round(frameCount / currentFpsTime);
    frameCount = 0;
    currentFpsTime = 0;
    surface.dataset.fps = String(fps);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .045);
  updateFrame(dt);
}
animate();

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.55 : 1.8));
  renderer.setSize(width, height, false);
}
window.addEventListener('resize', onResize, { passive: true });
window.addEventListener('orientationchange', () => window.setTimeout(onResize, 120), { passive: true });

startButton.addEventListener('click', beginGame);
resumeButton.addEventListener('click', resumeGame);
restartButton.addEventListener('click', resetMission);
pauseButton.addEventListener('click', () => { if (gameActive && !paused) pauseGame(); });

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  if (!gameActive || paused || isTouch) return;
  if (event.button === 0) {
    mouseLook = !document.pointerLockElement;
    lastLookX = 0;
    lastLookY = 0;
    if (!document.pointerLockElement && canvas.requestPointerLock) {
      const lockRequest = canvas.requestPointerLock();
      lockRequest?.catch?.(() => {});
    }
    fireWeapon();
  } else if (event.button === 2) {
    aiming = true;
  }
});
canvas.addEventListener('pointerup', (event) => {
  if (event.button === 0) mouseLook = false;
  if (event.button === 2) aiming = false;
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch' || lookPointer !== event.pointerId) return;
  const deltaX = event.clientX - lastLookX;
  const deltaY = event.clientY - lastLookY;
  lastLookX = event.clientX;
  lastLookY = event.clientY;
  handleLook(deltaX, deltaY, .0043);
});
canvas.addEventListener('pointerdown', (event) => {
  if (!gameActive || paused || event.pointerType !== 'touch') return;
  // The center/right side of the screen is the look area. Action buttons live above it and do not bubble here.
  if (event.clientX > window.innerWidth * .31) {
    lookPointer = event.pointerId;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is not available in every browser */ }
  }
}, { passive: false });
canvas.addEventListener('pointerup', (event) => {
  if (lookPointer === event.pointerId) lookPointer = null;
});
canvas.addEventListener('pointercancel', (event) => {
  if (lookPointer === event.pointerId) lookPointer = null;
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    mouseLook = false;
  } else if (gameActive && !paused && !isTouch) {
    pauseGame();
  }
});
document.addEventListener('mousemove', (event) => {
  if ((!mouseLook && document.pointerLockElement !== canvas) || !gameActive || paused) return;
  lastLookX = event.movementX || 0;
  lastLookY = event.movementY || 0;
  handleLook(lastLookX, lastLookY, .00205);
});

document.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && gameActive) {
    if (paused) resumeGame(); else pauseGame();
    return;
  }
  if (!gameActive || paused) return;
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyR') startReload();
  if (event.code === 'KeyI') {
    if (weapon.startInspect()) {
      audio.click();
    }
  }
  if (event.code === 'KeyF') toggleFlashlight();
});
document.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});
window.addEventListener('blur', () => {
  keys.clear();
  if (gameActive && !paused && !isTouch) pauseGame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameActive && !paused) pauseGame();
});

// Touch joystick. A relative, clamped thumb avoids requiring pixel-perfect placement.
const joystick = document.querySelector('#joystick');
const joystickKnob = document.querySelector('#joystick-knob');
joystick.addEventListener('pointerdown', (event) => {
  if (!gameActive || paused) return;
  event.preventDefault();
  joystickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (joystickPointer !== event.pointerId) return;
  updateJoystick(event);
});
function updateJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const radius = rect.width * .31;
  const length = Math.min(radius, Math.hypot(dx, dy));
  const nx = Math.hypot(dx, dy) > 0 ? dx / Math.hypot(dx, dy) : 0;
  const ny = Math.hypot(dx, dy) > 0 ? dy / Math.hypot(dx, dy) : 0;
  joystickInput = { x: nx * length / radius, y: ny * length / radius };
  joystickKnob.style.transform = `translate(calc(-50% + ${nx * length}px), calc(-50% + ${ny * length}px))`;
}
function releaseJoystick(event) {
  if (joystickPointer !== event.pointerId) return;
  joystickPointer = null;
  joystickInput = { x: 0, y: 0 };
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}
joystick.addEventListener('pointerup', releaseJoystick);
joystick.addEventListener('pointercancel', releaseJoystick);

const fireButton = document.querySelector('#fire-button');
fireButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (gameActive && !paused) {
    audio.resume();
    fireWeapon();
  }
});
const aimButton = document.querySelector('#aim-button');
function setAim(value) {
  aiming = value;
  aimButton.classList.toggle('active', value);
}
aimButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (!gameActive || paused) return;
  setAim(true);
});
for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
  aimButton.addEventListener(eventName, () => setAim(false));
}
document.querySelector('#reload-button').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (gameActive && !paused) startReload();
});
document.querySelector('#inspect-button').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (gameActive && !paused && weapon.startInspect()) {
    audio.click();
  }
});
document.querySelector('#flash-button').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (gameActive && !paused) toggleFlashlight();
});

// Avoid browser zoom / double-tap gestures while the player uses the virtual controls.
document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });
document.addEventListener('touchmove', (event) => {
  if (gameActive && event.cancelable) event.preventDefault();
}, { passive: false });
