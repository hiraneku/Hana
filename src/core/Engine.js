import * as THREE from 'three';

/**
 * Owns the renderer, the scene, the camera and the frame loop.
 * Everything else in the game registers an `update(dt)` callback here.
 */
export class Engine {
  /**
   * @param {HTMLElement} container
   * @param {{renderer?: object, isTouch?: boolean}} [options]
   *   `renderer` lets the headless tests drive the real game without a GPU.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.updatables = [];
    this.elapsed = 0;

    this.isTouch =
      options.isTouch !== undefined
        ? options.isTouch
        : matchMedia('(pointer: coarse)').matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.renderer =
      options.renderer ||
      new THREE.WebGLRenderer({
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
    this.renderer.toneMappingExposure = 1.28;
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
    // keep the scene tiny and still feel like a big, dark place. The tint is
    // a sickly blue-green — the colour of a city that lost power.
    // Dense enough to hide the edge of the world, thin enough that you can
    // still see them coming.
    this.scene.fog = new THREE.FogExp2(0x0b1114, 0.042);
    this.scene.background = new THREE.Color(0x0a1013);

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

    // Three re-arms requestAnimationFrame only *after* the callback returns,
    // so a single thrown exception would freeze the game forever. Never let
    // one bad frame take the whole session down.
    try {
      for (let i = 0; i < this.updatables.length; i++) {
        const u = this.updatables[i];
        if (u.enabled === false) continue;
        u.update(dt, this.elapsed);
      }
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      this._errors = (this._errors || 0) + 1;
      // Surface the first failure on screen: a phone has no console, and a
      // silently dying loop looks exactly like "the game is broken".
      if (this._errors === 1) {
        console.error('[HANA] frame error:', err);
        this.onError?.(err);
      }
      if (this._errors > 180) {
        console.error('[HANA] too many frame errors, stopping loop');
        this.stop();
        this.onFatal?.(err);
        return;
      }
    }

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
