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
        case 'sleep': [784, 659, 523, 392].forEach((f, k) => this.tone(f, 0.3, 'sine', 0.08, k * 0.18)); break;
      }
    } catch (e) { /* áudio indisponível */ }
  },
};

export const sfx = (name) => Sound.play(name);
