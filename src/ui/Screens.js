/**
 * Full-screen menus: the title card and the end report.
 * Both are plain DOM so they stay crisp and cheap on any device.
 */
export class Screens {
  constructor({ onStart }) {
    this.onStart = onStart;

    this.start = this._overlay(
      'start-screen',
      `
      <p class="tagline">Survival · satu kamar</p>
      <h1 class="title">HA<span>NA</span></h1>
      <p class="subtitle">
        Kamu terbangun di apartemen orang lain. Pintunya terkunci dari luar.
        Tidak ada siapa-siapa di sini — cuma kota di balik kaca, dan kamu.
      </p>
      <div class="control-legend">
        <b>Jalan</b><span>Stick kiri &nbsp;/&nbsp; W A S D</span>
        <b>Menoleh</b><span>Geser di mana saja di layar &nbsp;/&nbsp; gerakkan mouse</span>
        <b>Pakai</b><span>Tombol USE &nbsp;/&nbsp; E atau Spasi</span>
        <b>Lari</b><span>Tombol RUN &nbsp;/&nbsp; Shift</span>
        <b>Suara</b><span>M</span>
      </div>
      <label class="sens-row" for="sens">
        <span>Sensitivitas menoleh</span>
        <input id="sens" data-sens type="range" min="0.3" max="2.5" step="0.05" value="1" />
        <b id="sens-val" data-sens-val>1</b>
      </label>
      <button class="btn" id="start-btn" type="button">Masuk</button>
      <p class="hint">
        Miringkan ponsel ke landscape · nyalakan suara · tidak bisa menoleh?
        Tekan <b>KONTROL</b> di pojok atas untuk memunculkan stick
      </p>
      <p class="build-stamp" id="build-stamp"></p>
    `
    );

    this.gameOver = this._overlay(
      'gameover-screen',
      `
      <h1 class="title">KAMU KELUAR</h1>
      <p class="subtitle" id="death-line">Kamu berhasil membuka pintu itu.</p>
      <div class="stats">
        <div class="stat"><span class="k">Waktu</span><span class="v" id="go-time">0s</span></div>
        <div class="stat"><span class="k">Barang diperiksa</span><span class="v" id="go-used">0</span></div>
      </div>
      <button class="btn" id="retry-btn" type="button">Ulangi</button>
    `
    );
    this.gameOver.classList.add('hidden');

    this.start.querySelector('#start-btn').addEventListener('click', () => this.onStart());
    this.gameOver.querySelector('#retry-btn').addEventListener('click', () => this.onStart());

    const stamp = this.start.querySelector('#build-stamp');
    if (stamp) stamp.textContent = `build ${globalThis.__HANA_BUILD__ || 'dev'}`;

    this.deathLine = this.gameOver.querySelector('#death-line');
    this.goTime = this.gameOver.querySelector('#go-time');
    this.goUsed = this.gameOver.querySelector('#go-used');
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
    const secs = Math.max(0, Math.round(stats.seconds || 0));
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, '0');
    this.goTime.textContent = mm ? `${mm}m ${ss}s` : `${ss}s`;
    this.goUsed.textContent = String(stats.used || 0);
    if (!stats.escaped) this.deathLine.textContent = 'Kamu tidak pernah sampai ke pintu.';
    else this.deathLine.textContent = EXIT_LINES[Math.floor(Math.random() * EXIT_LINES.length)];
    this.gameOver.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOver.classList.add('hidden');
  }
}

const EXIT_LINES = [
  'Koridor di luar lebih gelap daripada kamar tadi.',
  'Pintu itu tidak pernah benar-benar dikunci. Kamu cuma tidak mencoba.',
  'Di belakangmu, televisinya masih menyala.',
  'Kamu tidak ingat bagaimana kamu bisa masuk.',
];
