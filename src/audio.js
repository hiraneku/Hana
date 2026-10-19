export function createAudio() {
  let context = null;
  let master = null;
  let ambient = null;
  let ambientStarted = false;
  let noiseBuffer = null;

  function ensureContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = .48;
    master.connect(context.destination);
    return context;
  }

  function createNoiseBuffer() {
    const ctx = ensureContext();
    if (!ctx) return null;
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length * .14);
    return noiseBuffer;
  }

  function resume() {
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!ambientStarted) startAmbient();
  }

  function startAmbient() {
    const ctx = ensureContext();
    if (!ctx || ambientStarted) return;
    ambientStarted = true;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer();
    noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 410;
    lowpass.Q.value = .6;
    const rumble = ctx.createGain();
    rumble.gain.value = .055;
    noise.connect(lowpass).connect(rumble).connect(master);
    noise.start();

    const hum = ctx.createOscillator();
    hum.type = 'triangle';
    hum.frequency.value = 43;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 120;
    const humGain = ctx.createGain();
    humGain.gain.value = .018;
    hum.connect(humFilter).connect(humGain).connect(master);
    hum.start();
    ambient = { noise, lowpass, rumble, hum, humGain };
  }

  function transient({ duration = .16, gain = .2, filter = 1800, highpass = 50, decay = 7, buffer = null } = {}) {
    const ctx = ensureContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer || createNoiseBuffer();
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = highpass;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = filter;
    const envelope = ctx.createGain();
    const now = ctx.currentTime;
    envelope.gain.setValueAtTime(Math.max(.0001, gain), now);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    low.Q.value = .65;
    source.connect(high).connect(low).connect(envelope).connect(master);
    source.start(now);
    source.stop(now + duration + .02);
  }

  function tone(frequency, duration, gain, type = 'sine', endFrequency = frequency) {
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    envelope.gain.setValueAtTime(Math.max(.0001, gain), now);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(envelope).connect(master);
    osc.start(now);
    osc.stop(now + duration + .02);
  }

  function click(time = 0, pitch = 1) {
    const ctx = ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + time;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(980 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(240 * pitch, now + .035);
    filter.type = 'lowpass';
    filter.frequency.value = 3800;
    gain.gain.setValueAtTime(.07, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .052);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + .06);
  }

  return {
    resume,
    swing() {
      const ctx = ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = createNoiseBuffer();
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = .72;
      band.frequency.setValueAtTime(1450, now);
      band.frequency.exponentialRampToValueAtTime(320, now + .24);
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(.095, now + .035);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + .26);
      source.connect(band).connect(envelope).connect(master);
      source.start(now);
      source.stop(now + .28);
      tone(185, .14, .022, 'triangle', 88);
    },
    step() {
      transient({ duration: .09, gain: .065, filter: 420, highpass: 45 });
      tone(72, .09, .06, 'triangle', 46);
    },
    impact() {
      transient({ duration: .11, gain: .18, filter: 700, highpass: 70 });
      tone(62, .12, .12, 'triangle', 38);
    },
    damage() {
      transient({ duration: .3, gain: .22, filter: 380, highpass: 40 });
      tone(125, .26, .16, 'sawtooth', 48);
    },
    groan() {
      tone(94 + Math.random() * 26, .52, .045, 'sawtooth', 55 + Math.random() * 20);
      transient({ duration: .28, gain: .035, filter: 420, highpass: 55 });
    },
    click() {
      click(0, 1);
    },
  };
}
