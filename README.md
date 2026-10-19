# HANA

**First-person zombie apocalypse survival — playable straight in a mobile browser.**

HANA is a wave-survival FPS built with Three.js. It is developed browser-first so
it can be play-tested on a real phone at any time via GitHub Pages, with the
long-term goal of feeling like a native mobile game.

> 🎮 **Play the latest build:** https://hiraneku.github.io/Hana/
>
> Best in **landscape**, on a phone or a desktop with a mouse.

---

## Controls

| Action | Touch | Keyboard / mouse |
| --- | --- | --- |
| Move | Left half of the screen (floating stick) | `W` `A` `S` `D` |
| Look | Right half of the screen (floating stick) | Mouse (click to lock pointer) |
| Shoot | **FIRE** button | Left mouse button / `Space` |
| Reload | **RELOAD** button | `R` |
| Sprint | **RUN** button (drains stamina) | `Shift` |

Run out of stamina and you slow to a crawl for a moment — kiting the horde is
not free.

---

## What is in the game right now

- **First-person movement** with head bob, sprint + stamina, and collision
  against every crate, container and blast wall in the yard.
- **A fog-soaked industrial arena**: shipping containers, a shed with a working
  doorway, barrel fires, flickering sodium lamps and a dying red emergency light.
- **A service pistol** with recoil, muzzle flash, tracers, hitscan bullets,
  headshot detection, and a magazine that runs dry at the worst moment.
- **Three kinds of infected**: shambling *walkers*, fast *runners* (from wave 3)
  and tanky *brutes* (from wave 6). They separate from each other, steer around
  cover, and lunge when they reach you.
- **Endless waves** that get bigger, faster and tougher, with a breather,
  an ammo drop and a rare health pickup between them.
- **HUD** with vitals, stamina, ammo, wave, score, hit-marker and a damage
  vignette; death screen with kills and accuracy.

---

## Tech

| | |
| --- | --- |
| Rendering | [Three.js](https://threejs.org) (WebGL) |
| Build | [Vite](https://vite.dev) — static output, `base: /Hana/` |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Physics | ~90 lines of AABB collision in `src/world/collision.js` |
| Assets | None. Every model is generated from code. |

No textures, no model files, no CDN. The whole game is ~150 kB gzipped and
starts instantly.

### Performance notes (mobile matters)

- Static set dressing is **merged per material** — the entire level is about
  six draw calls.
- Zombies are **pooled**; waves never allocate mid-fight.
- The point-light budget is capped (3 on touch devices, 5 on desktop); extra
  lamps are emissive props with no light cost.
- Dense `FogExp2` hides the draw distance, and zombies stop animating past ~52 m.
- If a phone cannot hold ~26 FPS the engine drops its own render resolution and
  turns shadows off rather than stuttering.

---

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/Hana/  (also on your LAN)
npm run build      # static build in dist/
npm run preview    # serve the production build
npm run test:sim   # headless simulation test, no browser needed
```

### `npm run test:sim`

There is no WebGL in a terminal, so the test drives the *real* game modules —
arena, player, horde, weapon, particles — for thousands of frames and asserts
the simulation holds up: zombies actually reach you, nobody gets stuck inside a
crate, bullets do not pass through walls, the player cannot escape the yard, and
no NaN sneaks into a position.

### Layout

```
src/
  main.js              game loop, wave director, start / death flow
  core/
    Engine.js          renderer, scene, camera, frame loop, perf guard
    Input.js           keyboard + mouse + touch, unified into one state
  player/Player.js     FPS controller: look, run, collide, bleed
  world/
    Arena.js           the level: geometry, lights, spawn points
    collision.js       circle-vs-AABB push-out, ray-vs-AABB, AI whiskers
  entities/
    Zombie.js          low-poly infected: model, steering, animation, death
    Horde.js           pooling, spawning, hitscan queries
  weapons/Weapon.js    pistol: view-model, recoil, reload, hitscan
  fx/Particles.js      one draw call for all blood, dust and sparks
  ui/
    HUD.js             health, stamina, ammo, wave, crosshair, hit-marker
    TouchControls.js   dual-stick gamepad + action buttons
    Screens.js         title card and death report
tools/smoke.mjs        headless simulation test
```

---

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: install → simulation test
→ Vite build → publish `dist/` to GitHub Pages. Any branch can also be published
by hand from the Actions tab ("Run workflow").

---

## Roadmap

- [x] Playable wave-survival vertical slice
- [ ] Sound (procedural WebAudio: gunshots, growls, breathing)
- [ ] Second weapon (shotgun) + ammo pickups in the world
- [ ] Bigger map / objective mode
- [ ] Native mobile wrapper (Capacitor) once the browser build feels right
