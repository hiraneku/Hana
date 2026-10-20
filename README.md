# HANA — Kamar 14B

**First-person survival in one luxury apartment — playable straight in a mobile
browser.**

You wake up in someone else's apartment, at night, several floors above a city
that has seen better evenings. The door is locked from the outside. There is
nobody here. No gun, no monsters — just a very expensive room, your own two
hands, and the sound of the building.

HANA is built with Three.js and developed browser-first so it can be play-tested
on a real phone at any time via GitHub Pages.

> 🎮 **Play the latest build:** https://hiraneku.github.io/Hana/
>
> Best in **landscape**, on a phone or a desktop with a mouse.

---

## Controls

| Action | Touch | Keyboard / mouse |
| --- | --- | --- |
| Move | Left half of the screen (floating stick) | `W` `A` `S` `D` |
| Look | **Drag anywhere on the right half** | Mouse, or **hold the right button** to turn |
| Use | **USE** button | `E` / `Space` / left click |
| Sprint | **RUN** button (drains stamina) | `Shift` |
| Mute | — | `M` |

**Looking is a drag, not a joystick.** There is no analogue stick for the
camera: your view moves exactly as far as your finger moves and stops the
instant your finger stops. A rate-based stick keeps turning after you let go,
which on glass feels like trying to steer on ice.

Too fast or too slow? Both the menu and the HUD have a **SENS** slider. It is
remembered on the device, so you only have to set it once.

**No pointer lock?** Some embedded previews refuse it. The game notices and
turns the on-screen controls on by itself; you can also flip them any time with
the **CONTROLS** chip in the top-right of the HUD.

---

## What is in the game right now

- **One room, built properly** — an open-plan apartment with a bed and a tall
  upholstered headboard, brass lamps on marble nightstands, a sofa and coffee
  table facing a media wall, a bookshelf, a wardrobe, a marble kitchenette, and
  a **floor-to-ceiling window** looking out over 46 procedurally generated city
  towers with 900 lit windows.
- **Your hands.** No weapon and nothing to hide behind: two low-poly fists that
  sway as you walk, lag behind a fast turn, and reach out when you touch
  something.
- **Four things you can touch** — the nightstand drawer (the key card is in
  it), the light switch by the door, the television, and the door itself. Look
  at one and the HUD tells you what USE will do.
- **Nothing is hunting you, and the room still will not settle.** Lamps stutter,
  the television switches itself on to dead-channel static, and something
  screams somewhere far below.
- **HUD** with your objective, whether you have the key, what you can use right
  now, and how much breath you have left.
- **Procedural sound** — no audio files at all. A sub-bass drone, distant
  screaming, ragged breathing when you are winded, and clicks and clunks for
  every switch and drawer.
- **Horror grade** — vignette, animated film grain (an inline SVG turbulence
  filter, so still zero assets), scanlines and a cold colour cast.

---

## Tech

| | |
| --- | --- |
| Rendering | [Three.js](https://threejs.org) (WebGL) |
| Build | [Vite](https://vite.dev) — static output, `base: /Hana/` |
| Hosting | GitHub Pages, serving `/docs` from this branch |
| Physics | ~90 lines of AABB collision in `src/world/collision.js` |
| Assets | None. Every model is generated from code. |

No textures, no model files, no CDN. The whole game is ~150 kB gzipped and
starts instantly.

### Performance notes (mobile matters)

- Static set dressing is **merged per material** — the whole apartment is about
  twenty draw calls despite the amount of furniture.
- Only one light casts shadows (the city through the window), at 1024².
- Dense `FogExp2` gives the skyline depth without rendering a real city.
- If a phone cannot hold ~26 FPS the engine drops its own render resolution and
  turns shadows off rather than stuttering.

---

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/Hana/  (also on your LAN)
npm run build      # static production build -> docs/
npm run preview    # serve the production build
npm test           # all three headless suites
```

### `npm test`

Three suites, all headless:

- **`npm run test:sim`** — no WebGL in a terminal, so this builds the *real*
  Room and drives the *real* Player and Interactables for thousands of frames:
  you cannot walk out of the room or into the furniture, W walks where you are
  looking, pitch clamps, a 100 px drag turns a usable amount, the camera stops
  dead when the finger stops, the sensitivity slider scales the turn, and every
  hotspot is reachable on foot (a flood fill of the floor proves the game is
  winnable).
- **`npm run test:ui`** — the real DOM under jsdom: the move stick produces
  movement, a drag on the right half produces a 1:1 look delta, two thumbs work
  at once, a tap on USE shorter than one frame still registers exactly once,
  the sliders stay in sync, and taps on the HUD do not move the player. This
  one exists because of a bug that shipped: the touch layer is
  `pointer-events: none`, so a listener attached to the layer itself never
  fired — you could shoot but never walk.
- **`npm run test:game`** — boots the actual `Game` class with a stub renderer
  and plays it: tap start, drag to move and look, take the key card, flip the
  light switch, turn the television on and off, fail to open a locked door,
  then open it and leave. Fails loudly on any exception inside the frame loop.

### Debugging on a phone

Add **`?debug=1`** to the URL for a live readout of state, touch, pointer
count, input, player position, room lights and frame errors. The start screen
also prints the build hash — always check it before reporting a bug, because
**GitHub Pages takes 30–190 seconds to publish a push** and phones cache
aggressively.

### Layout

```
src/
  main.js              boot only (so tests can import Game without a renderer)
  Game.js              the game: room, player, interactables, escape flow
  core/
    Engine.js          renderer, scene, camera, frame loop, perf guard
    Input.js           keyboard + mouse + touch, unified into one state
  player/
    Player.js          FPS controller: look, run, collide
    Hands.js           bare-hands view model: sway, bob, reach
  world/
    Room.js            the apartment: geometry, lights, city outside
    Interactables.js   hotspots you can touch with your hands
    collision.js       circle-vs-AABB push-out, ray-vs-AABB
  fx/Particles.js      one draw call for every mote of dust
  ui/
    Hud.js             objective, key, prompt, stamina
    TouchControls.js   move stick, drag-to-look, USE / RUN buttons
    Screens.js         title card and end report
    Sensitivity.js     the look-sensitivity setting (menu + HUD)
    Debug.js           ?debug=1 panel and the on-screen error banner
tools/smoke.mjs        headless simulation test
tools/ui-test.mjs      jsdom UI and input test
tools/game-test.mjs    end-to-end test that boots the real Game
```

---

## Deploying

GitHub Pages for this repository serves the **`/docs` folder of a branch**, so
`npm run build` writes the deployable site straight into `docs/`, and that
folder is committed.

```bash
npm run build
git add docs && git commit -m "Publish build"
git push
```

Live at **https://hiraneku.github.io/Hana/**.

---

## Roadmap

- [x] Playable first-person survival in one room
- [x] Rooms you can touch: drawers, switches, a television, a locked door
- [ ] More to find in the room (a note, a phone, something under the bed)
- [ ] A reason the door was locked
- [ ] Native mobile wrapper (Capacitor) once the browser build feels right
