/**
 * Debug overlay. Open the game with `?debug=1` to turn it on.
 *
 * It exists because a phone has no console: when "I cannot move" is the only
 * bug report, this panel turns it into "state=menu, touch hidden" — the whole
 * answer in one line.
 */

export const BUILD = globalThis.__HANA_BUILD__ || 'dev';

export function debugEnabled() {
  try {
    return /(\?|&)debug=1\b/.test(location.search) || localStorage.getItem('hana:debug') === '1';
  } catch {
    return false;
  }
}

export class DebugPanel {
  constructor() {
    const el = document.createElement('pre');
    el.id = 'debug-panel';
    document.body.appendChild(el);
    this.el = el;
    this.frames = 0;
    this.time = 0;
    this.fps = 0;
    this.lastError = null;
  }

  update(dt, game) {
    this.frames++;
    this.time += dt;
    if (this.time >= 0.5) {
      this.fps = Math.round(this.frames / this.time);
      this.frames = 0;
      this.time = 0;
    }

    const p = game.player;
    const t = game.touch;
    const i = game.input;
    const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : String(n));

    this.el.textContent = [
      `HANA build ${BUILD}   ${this.fps} fps`,
      `state      ${game.state}   wave ${game.wave}  kills ${game.kills}`,
      `touch      isTouch=${game.engine.isTouch} visible=${t.visible} enabled=${t.enabled} forced=${t.forced}`,
      `pointers   ${t.pointers.size}   sticks move=${t.moveStick.classList.contains('active') ? 'ON' : 'off'} look=${t.lookStick.classList.contains('active') ? 'ON' : 'off'}`,
      `move       x=${f(i.move.x)} y=${f(i.move.y)}   look x=${f(i.lookAxis.x)} y=${f(i.lookAxis.y)}`,
      `buttons    fire=${i.touchFiring} sprint=${i.touchSprint}`,
      `player     pos ${f(p.pos.x)}, ${f(p.pos.z)}  yaw ${f(p.yaw)}  hp ${Math.round(p.health)}`,
      `zombies    alive=${game.horde.aliveCount} pooled=${game.horde.pool.length}`,
      `frames     errors=${game.engine._errors || 0}`,
      this.lastError ? `LAST ERROR  ${this.lastError}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

/**
 * Show a thrown error on screen instead of hiding it in the console.
 * If the render loop dies the player is left staring at a black canvas with
 * no explanation — this is the explanation.
 */
export function showErrorBanner(err, fatal = false) {
  try {
    let el = document.getElementById('error-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'error-banner';
      document.body.appendChild(el);
    }
    const message = err && err.message ? err.message : String(err);
    el.textContent = fatal
      ? `GAME STOPPED — ${message}\nBuild ${BUILD} · reload to try again`
      : `Error (game still running): ${message}`;
    el.classList.toggle('fatal', fatal);
    el.classList.add('show');
    console.error('[HANA]', err);
  } catch {
    /* if even this fails there is nothing left to do */
  }
}
