/**
 * Procedural sound. No files, no downloads — everything is synthesised with
 * WebAudio, which keeps the build tiny and lets the mix react to what is
 * happening (heartbeat quickens, growls pan around you).
 *
 * The whole thing is defensive on purpose: if a browser refuses a node or the
 * context will not start, the game keeps playing in silence.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.master = null;

    this._growlIn = 2.5;
    this._screamIn = 18 + Math.random() * 20;
    this._heartIn = 0;
    this._breathIn = 0;
  }

  /** Must be called from a user gesture (the Start button). */
  start() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(this.ctx.destination);
        this.noiseBuf = this._makeNoise(2);
        this._startAmbience();
        this.ready = true;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    } catch {
      return false;
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  /** @returns {boolean} true when sound is now muted. */
  toggleMute() {
    if (!this.master) return false;
    const muted = this.master.gain.value > 0;
    this.master.gain.value = muted ? 0 : 0.85;
    return muted;
  }

  _makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --------------------------------------------------------------- helpers

  get t() {
    return this.ctx.currentTime;
  }

  _gain(peak, attack, decay, t0) {
    const g = this.ctx.createGain();
    const a = Math.max(0.001, attack);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + decay);
    return g;
  }

  _noise(t0, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.start(t0);
    src.stop(t0 + dur);
    return src;
  }

  _filter(type, freq, q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  _pan(value) {
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = clamp(value, -1, 1);
      return p;
    }
    const g = this.ctx.createGain();
    return g;
  }

  // ------------------------------------------------------------- ambience

  _startAmbience() {
    const t = this.t;

    // Wind: looping noise through a slowly sweeping low-pass.
    const wind = this._noise(t, 1e6);
    const windFilter = this._filter('lowpass', 420, 0.7);
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.075;
    wind.connect(windFilter).connect(windGain).connect(this.master);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start(t);

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2Gain = this.ctx.createGain();
    lfo2Gain.gain.value = 0.035;
    lfo2.connect(lfo2Gain).connect(windGain.gain);
    lfo2.start(t);

    // Sub drone: two detuned sines you feel more than hear.
    for (const [freq, level] of [
      [41, 0.05],
      [57.5, 0.032],
      [86, 0.014],
    ]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(this.master);
      o.start(t);
    }

    // Distant electrical hum.
    const hum = this.ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 100;
    const humFilter = this._filter('lowpass', 220, 3);
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.006;
    hum.connect(humFilter).connect(humGain).connect(this.master);
    hum.start(t);
  }

  // ---------------------------------------------------------------- events

  shot() {
    if (!this.ready) return;
    try {
      const t = this.t;

      // Crack: bright noise burst.
      const crack = this._noise(t, 0.2);
      const crackF = this._filter('highpass', 1600, 0.8);
      crack.connect(crackF).connect(this._gain(0.55, 0.001, 0.09, t)).connect(this.master);

      // Body: low thump with a quick pitch drop.
      const thump = this.ctx.createOscillator();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(160, t);
      thump.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      thump.connect(this._gain(0.42, 0.002, 0.16, t)).connect(this.master);
      thump.start(t);
      thump.stop(t + 0.25);

      // Room tail.
      const tail = this._noise(t + 0.02, 0.5);
      const tailF = this._filter('lowpass', 900, 0.6);
      tail.connect(tailF).connect(this._gain(0.13, 0.02, 0.42, t + 0.02)).connect(this.master);
    } catch {
      /* silence is acceptable */
    }
  }

  dryFire() {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.05);
      n.connect(this._filter('highpass', 3000, 1)).connect(this._gain(0.18, 0.001, 0.04, t)).connect(this.master);
    } catch {
      /* noop */
    }
  }

  reloadClick(pitch = 1) {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.07);
      const f = this._filter('bandpass', 2400 * pitch, 2.5);
      n.connect(f).connect(this._gain(0.22, 0.001, 0.06, t)).connect(this.master);
    } catch {
      /* noop */
    }
  }

  /** Bullet connecting with a body. */
  impactFlesh() {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.18);
      n.connect(this._filter('bandpass', 380, 1.4)).connect(this._gain(0.3, 0.002, 0.15, t)).connect(this.master);

      const thud = this.ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(140, t);
      thud.frequency.exponentialRampToValueAtTime(60, t + 0.1);
      thud.connect(this._gain(0.2, 0.002, 0.12, t)).connect(this.master);
      thud.start(t);
      thud.stop(t + 0.2);
    } catch {
      /* noop */
    }
  }

  /** Bullet hitting concrete. */
  impactWall() {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.12);
      n.connect(this._filter('highpass', 2200, 1)).connect(this._gain(0.18, 0.001, 0.1, t)).connect(this.master);
    } catch {
      /* noop */
    }
  }

  hurt() {
    if (!this.ready) return;
    try {
      const t = this.t;
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      o.connect(this._gain(0.4, 0.004, 0.32, t)).connect(this.master);
      o.start(t);
      o.stop(t + 0.4);

      const n = this._noise(t, 0.2);
      n.connect(this._filter('lowpass', 500, 1)).connect(this._gain(0.22, 0.002, 0.18, t)).connect(this.master);
    } catch {
      /* noop */
    }
  }

  /** A zombie dies. Wet, unpleasant, brief. */
  death(pan = 0) {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.5);
      const f = this._filter('bandpass', 260, 1.1);
      n.connect(f).connect(this._gain(0.26, 0.01, 0.45, t)).connect(this._pan(pan)).connect(this.master);

      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.4);
      o.connect(this._gain(0.12, 0.01, 0.4, t)).connect(this._pan(pan)).connect(this.master);
      o.start(t);
      o.stop(t + 0.5);
    } catch {
      /* noop */
    }
  }

  /** Throat-noise growl. `pan` is -1..1, `far` 0..1 for distance. */
  growl(pan = 0, far = 0) {
    if (!this.ready) return;
    try {
      const t = this.t;
      const dur = 0.7 + Math.random() * 0.7;
      const out = this._pan(pan);
      const level = 0.16 * (1 - far * 0.75);

      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const base = 52 + Math.random() * 34;
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 0.82, t + dur);

      // Rattling throat.
      const vib = this.ctx.createOscillator();
      vib.frequency.value = 6 + Math.random() * 9;
      const vibGain = this.ctx.createGain();
      vibGain.gain.value = 9;
      vib.connect(vibGain).connect(o.detune);
      vib.start(t);
      vib.stop(t + dur + 0.1);

      const f = this._filter('lowpass', 700 + Math.random() * 300, 4);
      o.connect(f).connect(this._gain(level, 0.09, dur, t)).connect(out).connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.2);

      // Breath layer.
      const n = this._noise(t, dur + 0.2);
      n.connect(this._filter('bandpass', 420 + Math.random() * 380, 1.6))
        .connect(this._gain(level * 0.55, 0.12, dur, t))
        .connect(out)
        .connect(this.master);
    } catch {
      /* noop */
    }
  }

  /** Someone else did not make it. Somewhere out there. */
  distantScream() {
    if (!this.ready) return;
    try {
      const t = this.t;
      const dur = 1.4;
      const pan = Math.random() * 1.6 - 0.8;
      const out = this._pan(pan);
      const g = this._gain(0.075, 0.18, dur, t);

      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(320 + Math.random() * 160, t);
      o.frequency.exponentialRampToValueAtTime(760, t + dur * 0.35);
      o.frequency.exponentialRampToValueAtTime(240, t + dur);

      const vib = this.ctx.createOscillator();
      vib.frequency.value = 11;
      const vibGain = this.ctx.createGain();
      vibGain.gain.value = 22;
      vib.connect(vibGain).connect(o.detune);
      vib.start(t);
      vib.stop(t + dur + 0.2);

      // Long, cheap "reverb": a couple of delayed copies.
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = 0.28;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.32;
      delay.connect(fb).connect(delay);

      const f = this._filter('bandpass', 900, 1.2);
      o.connect(f).connect(g);
      g.connect(out).connect(this.master);
      g.connect(delay).connect(out);

      o.start(t);
      o.stop(t + dur + 0.1);
    } catch {
      /* noop */
    }
  }

  heartbeat(intensity = 1) {
    if (!this.ready) return;
    try {
      const t = this.t;
      const thump = (at, level) => {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(62, at);
        o.frequency.exponentialRampToValueAtTime(34, at + 0.13);
        o.connect(this._gain(level, 0.006, 0.14, at)).connect(this.master);
        o.start(at);
        o.stop(at + 0.25);
      };
      thump(t, 0.34 * intensity);
      thump(t + 0.21, 0.22 * intensity);
    } catch {
      /* noop */
    }
  }

  breath(intensity = 1) {
    if (!this.ready) return;
    try {
      const t = this.t;
      const n = this._noise(t, 0.45);
      n.connect(this._filter('bandpass', 620, 0.9)).connect(this._gain(0.08 * intensity, 0.12, 0.3, t)).connect(this.master);
    } catch {
      /* noop */
    }
  }

  // ---------------------------------------------------------------- driving

  /**
   * Schedules the reactive layers. `state` carries:
   *   { health, maxHealth, exhausted, nearest: {dist, pan}, alive }
   */
  update(dt, state) {
    if (!this.ready || !state) return;

    // Growls come from wherever the horde is, more often when it is close.
    this._growlIn -= dt;
    if (this._growlIn <= 0 && state.alive) {
      const near = state.nearest;
      if (near) {
        const far = clamp(near.dist / 40, 0, 1);
        this.growl(near.pan, far);
        this._growlIn = 1.2 + far * 5 + Math.random() * 3;
      } else {
        this._growlIn = 4 + Math.random() * 6;
      }
    }

    // Something terrible, in the distance, every so often.
    this._screamIn -= dt;
    if (this._screamIn <= 0) {
      this._screamIn = 22 + Math.random() * 40;
      if (Math.random() < 0.75) this.distantScream();
    }

    // Heartbeat under 45% health, faster the closer you are to dying.
    const ratio = state.health / state.maxHealth;
    if (state.alive && ratio < 0.45) {
      const intensity = clamp((0.45 - ratio) / 0.45, 0, 1);
      this._heartIn -= dt;
      if (this._heartIn <= 0) {
        this.heartbeat(0.5 + intensity);
        this._heartIn = 1.15 - intensity * 0.55;
      }
    }

    // Ragged breathing while sprinting or winded.
    if (state.alive && state.exhausted) {
      this._breathIn -= dt;
      if (this._breathIn <= 0) {
        this.breath(1);
        this._breathIn = 0.85;
      }
    }
  }
}
