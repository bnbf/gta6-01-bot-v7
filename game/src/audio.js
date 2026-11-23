// LUMEN BAY: Neon Heat — synthesized sound.
// No audio files: engine hum, siren, radio jingle and UI blips are all made
// with the Web Audio API. Everything is guarded — a missing context never
// breaks the game.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioTimer = null;
    this.radioOn = false;
    this.radioStep = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // engine: low sawtooth + gain by speed
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      this.engineOsc.connect(lp);
      lp.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // siren: two-tone square, toggled by setSiren
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (e) {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEngine(speed01, driving) {
    if (!this.ctx || this.muted) return;
    const target = driving ? 0.03 + speed01 * 0.09 : 0.015;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 140, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOn) {
      this.sirenOn = true;
      this.sirenGain.gain.setTargetAtTime(this.muted ? 0 : 0.025, this.ctx.currentTime, 0.2);
      this.sirenPhase = 0;
      if (!this.sirenTimer) {
        this.sirenTimer = setInterval(() => {
          if (!this.sirenOn || !this.ctx) return;
          this.sirenPhase = 1 - this.sirenPhase;
          this.sirenOsc.frequency.setTargetAtTime(this.sirenPhase ? 950 : 700, this.ctx.currentTime, 0.05);
        }, 420);
      }
    } else if (!on && this.sirenOn) {
      this.sirenOn = false;
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  blip(freq = 660) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  cash() {
    if (!this.ctx || this.muted) return;
    [880, 1174, 1568].forEach((f, i) => {
      setTimeout(() => this.blip(f), i * 90);
    });
  }

  missionStart() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.blip(f), i * 110);
    });
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const len = 0.18;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.25;
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
  }

  setRadio(on) {
    if (!this.ctx) return;
    this.radioOn = on;
    if (on && !this.radioTimer) {
      // a lazy synthwave arpeggio: Am — F — C — G
      const chords = [
        [220, 261.6, 329.6], [174.6, 220, 261.6],
        [196, 246.9, 293.7], [164.8, 196, 246.9],
      ];
      this.radioTimer = setInterval(() => {
        if (!this.radioOn || this.muted) return;
        const chord = chords[Math.floor(this.radioStep / 4) % 4];
        const note = chord[this.radioStep % 3];
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = note * 2;
        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + 0.42);
        this.radioStep++;
      }, 210);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.ctx) return this.muted;
    const g = this.muted ? 0 : 1;
    this.ctx.destination.gain
      ? this.ctx.destination.gain.setTargetAtTime(g, this.ctx.currentTime, 0.05)
      : null;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.03, this.ctx.currentTime, 0.05);
    return this.muted;
  }
}
