# HANA // DEAD SIGNAL

A mobile-first 3D survival-horror FPS prototype for the browser. Built with Three.js and Vite; designed to run as a static site on GitHub Pages.

## Run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints. On desktop, use WASD + mouse, left click to fire, right mouse to aim, `R` to reload, `I` to inspect, `F` for the flashlight, and `Esc` to pause. On touchscreens, use the virtual joystick and on-screen action buttons. Landscape orientation is recommended.

## Publish with GitHub Pages (no Actions workflow required)

```sh
npm run build
```

Vite writes the production site into `docs/`, with asset URLs set for the `/Hana/` project path. In repository settings, choose **Pages → Build and deployment → Deploy from a branch**, select `arena/308b5368-hana` and the `/docs` folder, then save. After merging the project into `main`, you can change the Pages source to `main` / `/docs`. Rebuild and include the updated `docs/` output with each future source change.

## Prototype scope

One atmospheric industrial alley, a procedural G17-style sidearm viewmodel with reload / inspect / recoil animations, three basic infected, touch controls, and an offline single-player loop. All 3D objects and audio are generated locally at runtime; no remote assets or backend are required.
