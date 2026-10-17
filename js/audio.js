/* FarmLife — efeitos sonoros sintetizados com WebAudio */

export const Sound = {
  on: true,
  ctx: null,
  lastPlay: {},
  tone(freq, dur, type, vol, when = 0, slide = 0) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  play(name) {
    if (!this.on) return;
    const now = performance.now();
    if (now - (this.lastPlay[name] || 0) < 45) return; // evita barulho excessivo em ações repetidas
    this.lastPlay[name] = now;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      switch (name) {
        case 'till': this.tone(150, 0.07, 'square', 0.05); this.tone(95, 0.08, 'square', 0.04, 0.05); break;
        case 'water': this.tone(950, 0.16, 'sine', 0.07, 0, -550); break;
        case 'plant': this.tone(480, 0.07, 'triangle', 0.12); this.tone(720, 0.05, 'triangle', 0.08, 0.05); break;
        case 'harvest': this.tone(660, 0.08, 'triangle', 0.12); this.tone(990, 0.1, 'triangle', 0.1, 0.07); break;
        case 'coin': this.tone(1200, 0.06, 'square', 0.04); this.tone(1700, 0.14, 'square', 0.04, 0.06); break;
        case 'error': this.tone(170, 0.16, 'sawtooth', 0.05); break;
        case 'open': this.tone(520, 0.06, 'triangle', 0.08); this.tone(780, 0.08, 'triangle', 0.07, 0.05); break;
        case 'level': [523, 659, 784, 1047].forEach((f, k) => this.tone(f, 0.18, 'triangle', 0.12, k * 0.1)); break;
        case 'cast': this.tone(700, 0.25, 'sine', 0.06, 0, -500); break;
        case 'splash': this.tone(320, 0.12, 'triangle', 0.08, 0, -180); this.tone(520, 0.08, 'sine', 0.04, 0.04, -200); break;
        case 'bite': [1180, 1180].forEach((f, k) => this.tone(f, 0.07, 'square', 0.05, k * 0.11)); break;
        case 'catch': [660, 880, 1320].forEach((f, k) => this.tone(f, 0.12, 'triangle', 0.1, k * 0.08)); break;
        case 'bark': this.tone(420, 0.09, 'sawtooth', 0.05, 0, -160); this.tone(380, 0.1, 'sawtooth', 0.05, 0.16, -150); break;
        case 'croak': this.tone(150, 0.09, 'square', 0.035, 0, 30); this.tone(130, 0.12, 'square', 0.035, 0.12, 20); break;
        case 'chirp': [2600, 3100, 2800].forEach((f, k) => this.tone(f, 0.05, 'sine', 0.025, k * 0.07, 400)); break;
        case 'thunder': [70, 55, 82, 48].forEach((f, k) => this.tone(f, 0.9, 'sawtooth', 0.05, k * 0.07, -25)); this.tone(140, 0.25, 'square', 0.04, 0, -90); break;
        case 'event': [523, 784, 1047, 1319].forEach((f, k) => this.tone(f, 0.22, 'sine', 0.06, k * 0.09)); break;
        case 'chop': this.tone(260, 0.06, 'square', 0.06, 0, -120); this.tone(180, 0.08, 'triangle', 0.06, 0.03, -60); break;
        case 'timber': this.tone(320, 0.5, 'sawtooth', 0.04, 0, -250); [90, 70].forEach((f, k) => this.tone(f, 0.35, 'square', 0.05, 0.75 + k * 0.05, -30)); break;
        case 'saw': this.tone(520, 0.13, 'sawtooth', 0.03, 0, 160); this.tone(470, 0.13, 'sawtooth', 0.03, 0.17, -160); break;
        case 'hammer': this.tone(900, 0.04, 'square', 0.05, 0, -500); this.tone(240, 0.08, 'triangle', 0.06, 0.01, -80); break;
        case 'sleep': [784, 659, 523, 392].forEach((f, k) => this.tone(f, 0.3, 'sine', 0.08, k * 0.18)); break;
      }
    } catch (e) { /* áudio indisponível */ }
  },
};

export const sfx = (name) => Sound.play(name);
