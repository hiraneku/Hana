import * as THREE from 'three';

/**
 * Owns the renderer, the scene, the camera and the frame loop.
 * Everything else in the game registers an `update(dt)` callback here.
 */
export class Engine {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.updatables = [];
    this.elapsed = 0;

    this.isTouch =
      matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isTouch,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.maxPixelRatio = this.isTouch ? 1.6 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isTouch;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.id = 'game-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.isTouch ? 74 : 70,
      window.innerWidth / window.innerHeight,
      0.05,
      140
    );

    // Cheap "infinite" world: dense fog hides the draw distance so we can
    // keep the scene tiny and still feel like a big, dark place.
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.055);
    this.scene.background = new THREE.Color(0x05070a);

    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', () => setTimeout(this._onResize, 300));

    // Perf guard for phones: if we cannot hold a decent frame rate, drop
    // the render resolution once instead of stuttering forever.
    this._frames = 0;
    this._perfTimer = 0;
    this._degraded = false;
  }

  add(updatable) {
    this.updatables.push(updatable);
    return updatable;
  }

  remove(updatable) {
    const i = this.updatables.indexOf(updatable);
    if (i >= 0) this.updatables.splice(i, 1);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.renderer.setSize(w, h);
  }

  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(this._loop);
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }

  _loop() {
    // Clamp dt so a background tab or a GC hitch cannot teleport the player
    // through a wall when the page comes back.
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    for (let i = 0; i < this.updatables.length; i++) {
      const u = this.updatables[i];
      if (u.enabled === false) continue;
      u.update(dt, this.elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this._watchPerf(dt);
  }

  _watchPerf(dt) {
    if (this._degraded || !this.isTouch) return;
    this._frames++;
    this._perfTimer += dt;
    if (this._perfTimer < 3) return;
    const fps = this._frames / this._perfTimer;
    this._frames = 0;
    this._perfTimer = 0;
    if (fps < 26) {
      this._degraded = true;
      this.maxPixelRatio = 1;
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse((o) => {
        if (o.isLight) o.castShadow = false;
      });
    }
  }
}
