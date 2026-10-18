/* FarmLife — efeitos sonoros e música de fundo sintetizados com WebAudio */

// ================= Volumes (salvos no navegador) =================
const AUDIO_KEY = 'farmlife-audio';
const LEGACY_SOUND_KEY = 'farmlife-sound';
export const settings = { master: 0.8, music: 0.5, sfx: 0.8, muted: false };
try {
  const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || 'null');
  if (saved) Object.assign(settings, saved);
  else if (localStorage.getItem(LEGACY_SOUND_KEY) === '0') settings.muted = true;
} catch (e) { /* armazenamento indisponível */ }

function saveSettings() {
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(settings)); } catch (e) { /* ignora */ }
}

// Grafo: efeitos e música têm volumes próprios e passam pelo volume geral
let ctx = null, master = null, sfxBus = null, musicBus = null;
const curve = (v) => v * v; // o ouvido percebe volume de forma logarítmica

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    Music.init();
    applyVolumes(true);
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  return ctx;
}

function applyVolumes(now) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const set = (g, v) => (now ? g.gain.setValueAtTime(v, t) : g.gain.setTargetAtTime(v, t, 0.06));
  set(master, settings.muted ? 0 : curve(settings.master));
  set(sfxBus, curve(settings.sfx));
  set(musicBus, curve(settings.music) * 0.9);
}

export function setVolume(key, v) {
  settings[key] = Math.max(0, Math.min(1, v));
  saveSettings();
  applyVolumes();
}

export function setMuted(m) {
  settings.muted = !!m;
  saveSettings();
  applyVolumes();
}

/** Liga o áudio no primeiro toque/tecla (exigência dos navegadores) e começa a música. */
export function unlockAudio() {
  try {
    ensureCtx();
    Music.start();
    Amb.start();
  } catch (e) { /* áudio indisponível */ }
}

// Aba escondida: pausa tudo; voltou: continua
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});

// ================= Efeitos =================
export const Sound = {
  get on() { return !settings.muted; },
  lastPlay: {},
  tone(freq, dur, type, vol, when = 0, slide = 0) {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  play(name) {
    if (settings.muted || settings.sfx <= 0 || settings.master <= 0) return;
    const now = performance.now();
    if (now - (this.lastPlay[name] || 0) < 45) return; // evita barulho excessivo em ações repetidas
    this.lastPlay[name] = now;
    try {
      ensureCtx();
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
        case 'neigh': [980, 900, 840, 780, 700].forEach((f, k) => this.tone(f, 0.09, 'sawtooth', 0.025, k * 0.065, -90)); this.tone(320, 0.18, 'triangle', 0.03, 0.36, -120); break;
        case 'hoof': this.tone(190, 0.035, 'square', 0.035, 0, -70); this.tone(150, 0.035, 'square', 0.028, 0.06, -50); break;
        case 'squish': this.tone(120, 0.12, 'sawtooth', 0.035, 0, 60); this.tone(90, 0.1, 'triangle', 0.05, 0.05, -30); break;
        case 'sleep': [784, 659, 523, 392].forEach((f, k) => this.tone(f, 0.3, 'sine', 0.08, k * 0.18)); break;
      }
    } catch (e) { /* áudio indisponível */ }
  },
};

export const sfx = (name) => Sound.play(name);

// ================= Música de fundo =================
// Música gerada na hora: acordes suaves, baixo e uma melodia que muda a cada poucas frases.
// De dia é mais animada; à noite fica mais lenta, em tom menor e sem chocalho.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MOODS = {
  day: {
    bpm: 92,
    chords: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]], // C G Am F
    bass: [36, 43, 45, 41],
    notes: [67, 69, 72, 74, 76, 79, 81, 84],                          // pentatônica de dó
    density: [0.55, 0.22],
    shaker: true,
  },
  night: {
    bpm: 68,
    chords: [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]], // Am F C G
    bass: [45, 41, 36, 43],
    notes: [64, 67, 69, 72, 74, 76, 79, 81],
    density: [0.32, 0.06],
    shaker: false,
  },
};
// Cada estação muda o andamento, o tom e o timbre (sinos no inverno, chocalho animado no verão)
const SEASON_MUSIC = {
  primavera: { bpm: 4, tr: 0, bells: false },
  verao:     { bpm: 12, tr: 2, bells: false, shaker: true },
  outono:    { bpm: -8, tr: -3, bells: false, shaker: false },
  inverno:   { bpm: -16, tr: 5, bells: true, shaker: false },
};
const moodOf = (key) => {
  const [dn, season] = key.split('|');
  const base = MOODS[dn] || MOODS.day, mod = SEASON_MUSIC[season] || {};
  return { ...base, bpm: base.bpm + (mod.bpm || 0) * (dn === 'night' ? 0.5 : 1), tr: mod.tr || 0, bells: !!mod.bells, shaker: base.shaker && mod.shaker !== false };
};
const STEPS_PER_BAR = 8;              // colcheias por compasso
const PHRASE = STEPS_PER_BAR * 4;     // frase de 4 compassos
const SONG = [0, 0, 1, 0];            // estrutura A A B A

const Music = {
  started: false,
  mood: 'day|primavera',
  want: 'day|primavera',
  M: null,
  step: 0,
  nextT: 0,
  phrases: null,
  songPos: 0,
  noise: null,
  delay: null,
  init() {
    // Eco suave para a melodia
    const delay = ctx.createDelay(1);
    const fb = ctx.createGain();
    const wet = ctx.createGain();
    fb.gain.value = 0.3;
    wet.gain.value = 0.28;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(musicBus);
    this.delay = delay;
    // Ruído para o chocalho
    const len = Math.floor(ctx.sampleRate * 0.1);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = Math.random() * 2 - 1;
  },
  start() {
    if (this.started) return;
    this.started = true;
    this.nextT = ctx.currentTime + 0.15;
    this.newPhrases();
    setInterval(() => this.tick(), 60);
  },
  stepDur() { return 60 / this.cur().bpm / 2; },
  cur() { if (!this.M || this.M.key !== this.mood) this.M = { ...moodOf(this.mood), key: this.mood }; return this.M; },
  /** Gera as frases A e B da melodia (passeio aleatório pela escala, notas do acorde nos tempos fortes). */
  newPhrases() {
    const M = this.cur();
    const make = () => {
      const out = new Array(PHRASE).fill(null);
      let i = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < PHRASE; s++) {
        const strong = s % 2 === 0;
        if (Math.random() > M.density[strong ? 0 : 1]) continue;
        if (s % 4 === 0) {
          // Tempo forte: puxa para uma nota do acorde
          const chord = M.chords[Math.floor(s / STEPS_PER_BAR)].map((n) => n % 12);
          const near = M.notes.map((n, k) => ({ k, d: Math.abs(k - i) })).filter((x) => chord.includes(M.notes[x.k] % 12)).sort((a, b) => a.d - b.d);
          if (near.length) i = near[Math.random() < 0.7 ? 0 : Math.min(1, near.length - 1)].k;
        } else {
          i = Math.max(0, Math.min(M.notes.length - 1, i + Math.floor(Math.random() * 5) - 2));
        }
        out[s] = { n: M.notes[i], len: strong && Math.random() < 0.4 ? 2 : 1 };
      }
      // A frase termina descansando numa nota longa do último acorde
      const last = M.chords[3].map((n) => n % 12);
      const rest = M.notes.findIndex((n, k) => k >= 2 && last.includes(n % 12));
      out[PHRASE - 4] = { n: M.notes[rest >= 0 ? rest : 2], len: 3 };
      for (let s = PHRASE - 3; s < PHRASE; s++) out[s] = null;
      return out;
    };
    this.phrases = [make(), make()];
  },
  tick() {
    if (!ctx || ctx.state !== 'running') return;
    // Se ficou muito para trás (aba pausada), recomeça do agora
    if (this.nextT < ctx.currentTime - 0.5) this.nextT = ctx.currentTime + 0.05;
    while (this.nextT < ctx.currentTime + 0.25) {
      this.schedule(this.step, this.nextT);
      this.nextT += this.stepDur();
      this.step++;
    }
  },
  schedule(step, t) {
    const s = step % PHRASE;
    if (s === 0) {
      // Começo de frase: troca o clima (dia/noite) e, de tempos em tempos, a melodia
      if (this.want !== this.mood) { this.mood = this.want; this.songPos = 0; this.newPhrases(); }
      else if (step > 0 && ++this.songPos >= SONG.length) { this.songPos = 0; this.newPhrases(); }
    }
    if (settings.muted || settings.music <= 0 || settings.master <= 0) return;
    const M = this.cur();
    const bar = Math.floor(s / STEPS_PER_BAR);
    const dur = this.stepDur();
    if (s % STEPS_PER_BAR === 0) this.pad(M.chords[bar].map((n) => n + M.tr), t, dur * STEPS_PER_BAR);
    if (s % 4 === 0) this.bass(M.bass[bar] + M.tr, t, dur * 3);
    const note = this.phrases[SONG[this.songPos]][s];
    if (note) this.pluck(note.n + M.tr, t, dur * note.len, M.bells);
    if (M.shaker && s % 2 === 1) this.shaker(t, s % 4 === 3 ? 0.03 : 0.018);
  },
  pad(notes, t, len) {
    for (const n of notes) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = 'triangle';
        o.frequency.value = midi(n);
        o.detune.value = det;
        f.type = 'lowpass';
        f.frequency.value = 1100;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.018, t + 0.5);
        g.gain.setValueAtTime(0.018, t + len - 0.4);
        g.gain.linearRampToValueAtTime(0.0001, t + len + 0.3);
        o.connect(f).connect(g).connect(musicBus);
        o.start(t);
        o.stop(t + len + 0.35);
      }
    }
  },
  bass(n, t, len) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + len + 0.05);
  },
  pluck(n, t, len, bells = false) {
    const g = ctx.createGain();
    const tail = bells ? Math.max(0.9, len * 2.4) : Math.max(0.35, len * 1.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(bells ? 0.055 : 0.07, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
    // Sino: parciais fora da série harmônica dão o brilho de sininho
    const parts = bells ? [['sine', 1, 1], ['sine', 2.76, 0.4], ['sine', 5.4, 0.18]] : [['triangle', 1, 1], ['sine', 2, 0.35]];
    for (const [type, mult, v] of parts) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = type;
      o.frequency.value = midi(n) * mult;
      og.gain.value = v;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + tail + 0.1);
    }
    g.connect(musicBus);
    g.connect(this.delay);
  },
  shaker(t, vol) {
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = this.noise;
    f.type = 'highpass';
    f.frequency.value = 6500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(musicBus);
    src.start(t);
    src.stop(t + 0.06);
  },
};

/** Dia ou noite e a estação (a música muda no começo da próxima frase). */
export function setMusicMood(mood, season = 'primavera') { Music.want = (mood === 'night' ? 'night' : 'day') + '|' + season; }

// ================= Sons do ambiente =================
// Passarinhos de dia (menos no inverno), grilos nas noites quentes, coruja nas noites frias,
// vento (mais forte no outono e no inverno) e chuva. Dentro de casa tudo fica abafado.
const Amb = {
  started: false,
  want: { season: 'primavera', night: false, rain: false, indoors: false },
  bus: null, muff: null, windG: null, rainG: null,
  nextBird: 2, nextCricket: 1, nextOwl: 20, last: 0,
  start() {
    if (this.started || !ctx) return;
    this.started = true;
    this.bus = ctx.createGain();
    this.muff = ctx.createBiquadFilter();
    this.muff.type = 'lowpass';
    this.muff.frequency.value = 12000;
    this.bus.connect(this.muff).connect(sfxBus);
    this.bus.gain.value = 0.9;
    // Ruído em loop para vento e chuva
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    const loop = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.bus);
      src.start();
      return g;
    };
    this.windG = loop('bandpass', 420, 0.6);
    this.rainG = loop('lowpass', 2600, 0.3);
    this.last = ctx.currentTime;
    setInterval(() => this.tick(), 100);
  },
  tick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, dt = Math.min(0.5, now - this.last);
    this.last = now;
    const w = this.want;
    const t = now;
    // Vento e chuva (contínuos)
    const wind = (w.season === 'inverno' ? 0.05 : w.season === 'outono' ? 0.03 : 0.012) * (0.6 + 0.4 * Math.sin(now * 0.23) * Math.sin(now * 0.07));
    this.windG.gain.setTargetAtTime(wind * (w.indoors ? 0.4 : 1), t, 0.4);
    this.rainG.gain.setTargetAtTime(w.rain ? (w.indoors ? 0.05 : 0.07) : 0, t, 0.6);
    this.muff.frequency.setTargetAtTime(w.indoors ? 700 : 12000, t, 0.2);
    // Bichos
    const warm = w.season !== 'inverno';
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      this.nextBird = w.season === 'outono' ? 3 + Math.random() * 7 : 1.5 + Math.random() * 4;
      if (!w.night && !w.rain && warm) this.bird(t);
    }
    this.nextCricket -= dt;
    if (this.nextCricket <= 0) {
      this.nextCricket = 0.5 + Math.random() * 0.9;
      if (w.night && warm && !w.rain) this.cricket(t);
    }
    this.nextOwl -= dt;
    if (this.nextOwl <= 0) {
      this.nextOwl = 18 + Math.random() * 30;
      if (w.night && !w.rain && (w.season === 'inverno' || w.season === 'outono' || Math.random() < 0.3)) this.owl(t);
    }
  },
  blip(freq, to, t, dur, vol, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  bird(t) {
    const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) this.blip(base, base * (1.25 + Math.random() * 0.3), t + k * 0.11, 0.07, 0.018);
  },
  cricket(t) {
    for (let k = 0; k < 4; k++) this.blip(4300, 4200, t + k * 0.045, 0.025, 0.008);
  },
  owl(t) {
    this.blip(400, 360, t, 0.35, 0.03);
    this.blip(420, 350, t + 0.5, 0.6, 0.03);
  },
};

/** Clima do som ambiente: estação, noite, chuva e se está dentro de casa. */
export function setAmbience(o) { Object.assign(Amb.want, o); }

/** Estado da música (para testes). */
export const musicState = () => ({ started: Music.started, mood: Music.mood, step: Music.step, ctx: ctx ? ctx.state : null });
