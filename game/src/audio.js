// Ridge Runner: every sound is synthesised with WebAudio — no audio files.
// Engine drone follows the throttle, wind follows speed, and the chimes and
// alarms are short oscillator notes.
export function makeAudio() {
  const api = {
    ctx: null, engineOsc: null, engineOsc2: null, engineGain: null,
    windSrc: null, windGain: null, windFilter: null,
    enabled: true, started: false,
  };

  function ensure() {
    if (api.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      api.ctx = ctx;
      // Engine: two detuned saws through a low-pass.
      api.engineOsc = ctx.createOscillator();
      api.engineOsc.type = 'sawtooth';
      api.engineOsc.frequency.value = 52;
      api.engineOsc2 = ctx.createOscillator();
      api.engineOsc2.type = 'sawtooth';
      api.engineOsc2.frequency.value = 78;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      api.engineGain = ctx.createGain();
      api.engineGain.gain.value = 0;
      api.engineOsc.connect(filt);
      api.engineOsc2.connect(filt);
      filt.connect(api.engineGain);
      api.engineGain.connect(ctx.destination);
      api.engineOsc.start();
      api.engineOsc2.start();
      // Wind: looped noise buffer through a band-pass.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      api.windSrc = ctx.createBufferSource();
      api.windSrc.buffer = buf;
      api.windSrc.loop = true;
      api.windFilter = ctx.createBiquadFilter();
      api.windFilter.type = 'bandpass';
      api.windFilter.frequency.value = 700;
      api.windGain = ctx.createGain();
      api.windGain.gain.value = 0;
      api.windSrc.connect(api.windFilter);
      api.windFilter.connect(api.windGain);
      api.windGain.connect(ctx.destination);
      api.windSrc.start();
      api.started = true;
    } catch (e) {
      api.started = false;
    }
  }

  function beep(freq, dur, type, vol, when = 0) {
    if (!api.ctx || !api.enabled) return;
    const t0 = api.ctx.currentTime + when;
    const osc = api.ctx.createOscillator();
    const g = api.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(api.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    ensure,
    setEnabled(on) { api.enabled = on; },
    isEnabled() { return api.enabled; },
    update(throttle, speedKnots, onGround) {
      if (!api.ctx || !api.enabled) return;
      const t = api.ctx.currentTime;
      const eng = onGround ? 0.015 : 0.03 + throttle * 0.06;
      api.engineGain.gain.setTargetAtTime(eng, t, 0.1);
      api.engineOsc.frequency.setTargetAtTime(46 + throttle * 58, t, 0.1);
      api.engineOsc2.frequency.setTargetAtTime(69 + throttle * 87, t, 0.1);
      api.windGain.gain.setTargetAtTime(
        Math.min(0.05, Math.max(0, (speedKnots - 30) * 0.0006)), t, 0.2);
      api.windFilter.frequency.setTargetAtTime(500 + speedKnots * 6, t, 0.2);
    },
    ring() {
      beep(880, 0.18, 'sine', 0.14);
      beep(1318, 0.28, 'sine', 0.12, 0.09);
    },
    warn() { beep(620, 0.12, 'square', 0.05); },
    alarm() { beep(440, 0.16, 'square', 0.07); beep(440, 0.16, 'square', 0.07, 0.2); },
    touchdown() {
      beep(120, 0.25, 'sine', 0.2);
      beep(90, 0.3, 'sine', 0.16, 0.08);
    },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.32, 'triangle', 0.12, i * 0.11));
    },
    crash() {
      beep(160, 0.5, 'sawtooth', 0.14);
      beep(70, 0.7, 'sawtooth', 0.14, 0.12);
    },
  };
}
