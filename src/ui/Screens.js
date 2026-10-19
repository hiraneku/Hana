/**
 * Full-screen menus: the title card and the death report.
 * Both are plain DOM so they stay crisp and cheap on any device.
 */
export class Screens {
  constructor({ onStart }) {
    this.onStart = onStart;

    this.start = this._overlay(
      'start-screen',
      `
      <p class="tagline">Survival Protocol</p>
      <h1 class="title">HA<span>NA</span></h1>
      <p class="subtitle">They are already outside. Hold the perimeter as long as you can.</p>
      <div class="control-legend">
        <b>Move</b><span>Left stick &nbsp;/&nbsp; W A S D</span>
        <b>Look</b><span>Right stick &nbsp;/&nbsp; Mouse</span>
        <b>Shoot</b><span>Fire button &nbsp;/&nbsp; Left click</span>
        <b>Reload</b><span>Reload button &nbsp;/&nbsp; R</span>
        <b>Run</b><span>Run button &nbsp;/&nbsp; Shift</span>
      </div>
      <button class="btn" id="start-btn" type="button">Enter the outbreak</button>
      <p class="hint">Best played in landscape with sound on</p>
    `
    );

    this.gameOver = this._overlay(
      'gameover-screen',
      `
      <h1 class="title">YOU DIED</h1>
      <p class="subtitle" id="death-line">The horde got in.</p>
      <div class="stats">
        <div class="stat"><span class="k">Waves</span><span class="v" id="go-waves">0</span></div>
        <div class="stat"><span class="k">Kills</span><span class="v" id="go-kills">0</span></div>
        <div class="stat"><span class="k">Score</span><span class="v" id="go-score">0</span></div>
        <div class="stat"><span class="k">Accuracy</span><span class="v" id="go-acc">0%</span></div>
      </div>
      <button class="btn" id="retry-btn" type="button">Try again</button>
    `
    );
    this.gameOver.classList.add('hidden');

    this.start.querySelector('#start-btn').addEventListener('click', () => this.onStart());
    this.gameOver.querySelector('#retry-btn').addEventListener('click', () => this.onStart());
    this.deathLine = this.gameOver.querySelector('#death-line');
    this.goWaves = this.gameOver.querySelector('#go-waves');
    this.goKills = this.gameOver.querySelector('#go-kills');
    this.goScore = this.gameOver.querySelector('#go-score');
    this.goAcc = this.gameOver.querySelector('#go-acc');
  }

  _overlay(id, html) {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = id;
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  hideStart() {
    this.start.classList.add('hidden');
  }

  showGameOver(stats) {
    this.goWaves.textContent = String(stats.wave);
    this.goKills.textContent = String(stats.kills);
    this.goScore.textContent = String(stats.score);
    const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
    this.goAcc.textContent = `${acc}%`;
    this.deathLine.textContent = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
    this.gameOver.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOver.classList.add('hidden');
  }
}

const DEATH_LINES = [
  'The horde got in.',
  'You ran out of time.',
  'They were faster than you.',
  'Your flashlight died first.',
  'Nobody is coming.',
  'The perimeter is gone.',
];
