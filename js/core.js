/* FarmLife — estado e regras do jogo (independente da renderização) */
import {
  COLS, ROWS, DAY_LEN, MAX_OFFLINE, SAVE_KEY, FIELDS, TOTAL_PLOTS, fieldOf,
  CROPS, PRODUCTS, ANIMALS, WATER_TIME, GROW_SPEED, PEN_SIZE, UPGRADES, CUSTOMERS,
  WORKERS, WORK_TIME,
} from './data.js';

// ================= Utilidades =================
export const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');
export const pad = (n) => String(n).padStart(2, '0');
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function fmtDuration(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}min`;
}

// Todos os itens vendáveis (colheitas + produtos animais)
export const ITEMS = {};
for (const [id, c] of Object.entries(CROPS)) ITEMS[id] = { name: c.name, icon: c.icon, sell: c.sell, xp: c.xp };
for (const [id, p] of Object.entries(PRODUCTS)) ITEMS[id] = { ...p };

// ================= Ganchos para a interface/cena =================
const hooks = { fx() {}, toast() {}, sfx() {}, dirty() {} };
export function setHooks(h) { Object.assign(hooks, h); }
const toast = (msg, type) => hooks.toast(msg, type);
const sfx = (name) => hooks.sfx(name);
const fx = (target, text, cls) => hooks.fx(target, text, cls);
const markDirty = (...parts) => hooks.dirty(...parts);

// Avisos gerados durante simulações silenciosas (offline, sono), mostrados depois
const notices = [];
const notify = (msg, type, quiet) => (quiet ? notices.push([msg, type]) : toast(msg, type));
export const takeNotices = () => notices.splice(0);

// ================= Estado =================
export let S = null;
export let tool = 'seed:trigo';

export const TOOLS = [
  { id: 'enxada', icon: '⛏️', name: 'Enxada' },
  { id: 'regador', icon: '💧', name: 'Regador' },
  { id: 'mao', icon: '🧺', name: 'Colher' },
];

export function setTool(id) {
  tool = id;
  markDirty('toolbar');
}

export function toolList() {
  const seeds = Object.keys(CROPS).filter((id) => CROPS[id].level <= S.level).map((id) => 'seed:' + id);
  return TOOLS.map((t) => t.id).concat(seeds);
}

function newState() {
  const plots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const open = c >= 2 && c < 6 && r >= 1 && r < 4;
      const tilled = open && c >= 3 && c < 5 && r >= 1 && r < 3;
      plots.push({ s: open ? (tilled ? 'tilled' : 'grass') : 'locked', crop: null, g: 0, w: 0 });
    }
  }
  // Lotes dos outros campos (bloqueados até o campo ser comprado)
  while (plots.length < TOTAL_PLOTS) plots.push({ s: 'locked', crop: null, g: 0, w: 0 });
  return {
    v: 2,
    coins: 60,
    xp: 0,
    level: 1,
    time: 0,
    plots,
    seeds: { trigo: 6, cenoura: 2 },
    inv: {},
    animals: [],
    nextId: 1,
    fields: Object.fromEntries(FIELDS.map((f) => [f.id, f.cost === 0])),
    workers: { colhedor: false, plantador: false, tratador: false },
    up: { regador: 0, adubo: 0, curral: 0, alimentador: 0, aspersor: 0 },
    weather: 'sol',
    prices: {},
    orders: [],
    bought: 0,
    stats: { harvest: 0, earned: 0, orders: 0 },
    savedAt: Date.now(),
    seen: false,
  };
}

export const dayOf = (t) => Math.floor(t / DAY_LEN) + 1;
export const xpNeed = (l) => Math.round(50 * Math.pow(l, 1.5));
export const autoWater = () => S.weather === 'chuva' || S.up.aspersor > 0;
export const price = (id) => Math.max(1, Math.round(ITEMS[id].sell * (S.prices[id] || 1)));
export const plotCost = () => Math.round(80 * Math.pow(1.2, S.bought));
export const penSize = () => PEN_SIZE[S.up.curral];
export const isReady = (p) => p.s === 'planted' && p.g >= CROPS[p.crop].time;
export const isWet = (p) => autoWater() || p.w > 0;
export const canFulfill = (o) => o.req.every((r) => (S.inv[r.id] || 0) >= r.qty);
export const findAnimal = (id) => S.animals.find((a) => a.id === id);

/** Hora do dia (o dia começa às 6h, então vai de 6 a 30). */
export const dayHours = () => 6 + ((S.time % DAY_LEN) / DAY_LEN) * 24;

/** Escuridão de 0 (dia) a 1 (noite fechada). */
export function darkness() {
  const h = dayHours();
  if (h >= 18 && h < 20) return (h - 18) / 2;
  if (h >= 20 && h < 28) return 1;
  if (h >= 28) return (30 - h) / 2;
  return 0;
}

export const fieldOwned = (id) => !!S.fields[id];
export const plotVisible = (i) => fieldOwned(fieldOf(i).field.id);

/** Lote bloqueado que pode ser comprado (vizinho de um lote já liberado, num campo seu). */
export function isBuyable(i) {
  if (S.plots[i].s !== 'locked') return false;
  const { field: f, r, c } = fieldOf(i);
  if (!fieldOwned(f.id)) return false;
  const near = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
  return near.some(([rr, cc]) => rr >= 0 && rr < f.rows && cc >= 0 && cc < f.cols && S.plots[f.start + rr * f.cols + cc].s !== 'locked');
}

/** Compra um campo inteiro: todos os lotes viram grama pronta para arar. */
export function buyField(id) {
  const f = FIELDS.find((x) => x.id === id);
  if (!f || fieldOwned(id) || f.level > S.level) return false;
  if (!spend(f.cost)) return false;
  S.fields[id] = true;
  for (let i = f.start; i < f.start + f.count; i++) S.plots[i] = { s: 'grass', crop: null, g: 0, w: 0 };
  toast(`${f.icon} ${f.name} é seu! ${f.count} novos lotes para plantar.`, 'good');
  sfx('level');
  markDirty('panel');
  return true;
}

/** Estágio visual da planta: 0 broto, 1 crescendo, 2 quase, 3 pronta. */
export function cropStage(p) {
  const f = p.g / CROPS[p.crop].time;
  if (f >= 1) return { f: 1, stage: 3 };
  return { f, stage: f < 0.33 ? 0 : f < 0.66 ? 1 : 2 };
}

function rollPrices() {
  for (const id of Object.keys(ITEMS)) S.prices[id] = Math.round(rand(0.8, 1.3) * 20) / 20;
}

// ================= Simulação =================
function newDay(day, quiet) {
  rollPrices();
  S.weather = Math.random() < 0.22 ? 'chuva' : 'sol';
  const paid = payWages(quiet);
  if (!quiet) {
    const wages = paid ? ` · Salários: -🪙${fmt(paid)}` : '';
    if (S.weather === 'chuva') toast(`🌧️ Dia ${day}: está chovendo! Tudo fica regado hoje.${wages}`);
    else toast(`☀️ Dia ${day} começou. Os preços do mercado mudaram!${wages}`);
  }
  markDirty('panel');
}

function payWages(quiet) {
  let paid = 0;
  for (const [id, w] of Object.entries(WORKERS)) {
    if (!S.workers[id]) continue;
    if (S.coins >= w.wage) {
      S.coins -= w.wage;
      paid += w.wage;
    } else {
      S.workers[id] = false;
      notify(`${w.icon} O ${w.name.toLowerCase()} pediu demissão: faltou dinheiro para o salário.`, 'bad', quiet);
    }
  }
  return paid;
}

let feederWarned = false;

export function update(dt, quiet) {
  const before = dayOf(S.time);
  S.time += dt;
  const after = dayOf(S.time);
  if (after !== before) newDay(after, quiet);

  const auto = autoWater();
  const speed = GROW_SPEED[S.up.adubo];
  for (const p of S.plots) {
    if (p.s === 'planted') {
      const c = CROPS[p.crop];
      if (p.g < c.time) {
        const wetTime = auto ? dt : Math.min(dt, p.w);
        p.g = Math.min(c.time, p.g + wetTime * speed);
      }
    }
    if (p.w > 0) p.w = Math.max(0, p.w - dt);
  }
  // Alimentador automático: animais com fome comem o trigo guardado no celeiro
  if (S.up.alimentador > 0) {
    let fed = 0;
    for (const a of S.animals) {
      if (!a.fed && !a.ready && (S.inv.trigo || 0) > 0) { S.inv.trigo--; a.fed = true; fed++; }
    }
    const hungry = S.animals.some((a) => !a.fed && !a.ready);
    if (fed) markDirty('panel');
    if (hungry && !quiet && !feederWarned) {
      toast('⚙️ O alimentador automático ficou sem 🌾 trigo!', 'bad');
      feederWarned = true;
    }
    if (!hungry) feederWarned = false;
  }

  if (quiet) workersOffline(dt);

  for (const a of S.animals) {
    if (a.fed && !a.ready) {
      a.p += dt;
      if (a.p >= ANIMALS[a.type].time) { a.ready = true; a.p = 0; }
    }
  }
}

export function simulate(sec, quiet = true) {
  while (sec > 0) {
    const step = Math.min(1, sec);
    update(step, quiet);
    sec -= step;
  }
}

/** Dormir: só à noite. Avança até as 6h do dia seguinte. */
export function sleep() {
  if (dayHours() < 18) {
    toast('🛏️ Ainda é cedo para dormir. Volte depois das 18h.');
    return false;
  }
  const rem = DAY_LEN - (S.time % DAY_LEN);
  simulate(rem - 0.01, true);
  update(0.02, false); // vira o dia e anuncia o clima
  sfx('sleep');
  markDirty('panel');
  return true;
}

// ================= Economia e progresso =================
function spend(n, quiet) {
  if (S.coins < n) {
    if (!quiet) { toast('🪙 Moedas insuficientes!', 'bad'); sfx('error'); }
    return false;
  }
  S.coins -= n;
  markDirty('panel');
  return true;
}

function earn(n) {
  S.coins += n;
  S.stats.earned += n;
  markDirty('panel');
}

function addItem(id, n) {
  S.inv[id] = (S.inv[id] || 0) + n;
  markDirty('panel');
}

function gainXp(n, silent = false) {
  S.xp += n;
  while (S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level);
    S.level++;
    onLevelUp(silent);
  }
}

function onLevelUp(silent) {
  const unlocks = [];
  for (const c of Object.values(CROPS)) if (c.level === S.level) unlocks.push(c.icon + ' ' + c.name);
  for (const a of Object.values(ANIMALS)) if (a.level === S.level) unlocks.push(a.icon + ' ' + a.name);
  for (const u of Object.values(UPGRADES)) if (u.req.includes(S.level)) unlocks.push(u.icon + ' ' + u.name);
  for (const w of Object.values(WORKERS)) if (w.level === S.level) unlocks.push(w.icon + ' ' + w.name);
  for (const f of FIELDS) if (f.cost && f.level === S.level) unlocks.push(f.icon + ' ' + f.name);
  notify(`⭐ Nível ${S.level}!${unlocks.length ? ' Desbloqueado: ' + unlocks.join(', ') : ''}`, 'level', silent);
  if (!silent) {
    sfx('level');
    fx({ player: true }, `⭐ Nível ${S.level}`, 'gold');
  }
  markDirty('panel', 'toolbar');
}

// ================= Pedidos =================
function availableItems() {
  const ids = Object.keys(CROPS).filter((id) => CROPS[id].level <= S.level);
  for (const t of new Set(S.animals.map((a) => a.type))) ids.push(ANIMALS[t].product);
  return ids;
}

function makeOrder() {
  const ids = shuffle(availableItems());
  const n = ids.length > 2 && Math.random() < 0.4 ? 2 : 1;
  const req = ids.slice(0, n).map((id) => ({
    id,
    qty: clamp(Math.round(rand(0.7, 1.4) * (1 + S.level * 0.08) * 120 / ITEMS[id].sell), 1, 15),
  }));
  const value = req.reduce((s, r) => s + ITEMS[r.id].sell * r.qty, 0);
  const xp = req.reduce((s, r) => s + ITEMS[r.id].xp * r.qty, 0);
  return { who: pick(CUSTOMERS), req, coins: Math.round(value * rand(1.3, 1.7)), xp: Math.round(xp * 1.5) + 5 };
}

function fillOrders() {
  while (S.orders.length < 3) S.orders.push(makeOrder());
}

// ================= Ações na lavoura =================
/** Descreve o que a ferramenta atual faria no lote (ou null se nada). */
export function tileActionLabel(i) {
  const p = S.plots[i];
  if (isReady(p)) return `Colher ${CROPS[p.crop].name}`;
  if (p.s === 'locked') return isBuyable(i) ? `Comprar terreno (🪙${fmt(plotCost())})` : null;
  if (tool === 'enxada') return p.s === 'grass' ? 'Arar a terra' : null;
  if (tool === 'regador') return (p.s === 'tilled' || p.s === 'planted') && !autoWater() ? 'Regar' : null;
  if (tool.startsWith('seed:')) {
    const id = tool.slice(5);
    if (p.s !== 'tilled') return null;
    return S.seeds[id] ? `Plantar ${CROPS[id].name}` : `Sem sementes de ${CROPS[id].name}`;
  }
  return null;
}

/**
 * Usa a ferramenta atual no lote i.
 * Retorna o tipo de ação ('till', 'water', 'plant', 'harvest', 'buy') ou null.
 * Com quiet = true, não mostra avisos de erro (usado em ações em sequência).
 */
export function useTile(i, quiet = false) {
  const p = S.plots[i];
  const target = { tile: i };

  // Plantas prontas são colhidas com qualquer ferramenta
  if (isReady(p)) return harvest(i);

  // Terreno só é comprado com uma ação direta (nunca ao arrastar ou segurar a tecla)
  if (p.s === 'locked') return quiet ? null : buyPlot(i);

  if (tool === 'enxada') {
    if (p.s === 'grass') {
      p.s = 'tilled';
      sfx('till');
      return 'till';
    }
    if (!quiet && p.s === 'tilled') toast('Essa terra já está arada. Escolha uma semente!');
    return null;
  }

  if (tool === 'regador') {
    if (p.s === 'tilled' || p.s === 'planted') {
      if (autoWater()) {
        if (!quiet) toast(S.weather === 'chuva' ? '🌧️ A chuva já está regando tudo hoje!' : '⛲ Os aspersores já regam tudo.');
        return null;
      }
      p.w = WATER_TIME[S.up.regador];
      sfx('water');
      return 'water';
    }
    if (!quiet) toast('Só dá para regar terra arada.');
    return null;
  }

  if (tool.startsWith('seed:')) {
    const id = tool.slice(5);
    if (p.s !== 'tilled') {
      if (!quiet) {
        toast(p.s === 'grass' ? '⛏️ Are a grama com a enxada primeiro (tecla 1).' : 'Esse lote já está ocupado.');
        sfx('error');
      }
      return null;
    }
    if (!S.seeds[id]) {
      if (!quiet) {
        toast(`Sem sementes de ${CROPS[id].name}. Compre mais na loja!`, 'bad');
        sfx('error');
      }
      return null;
    }
    S.seeds[id]--;
    p.s = 'planted';
    p.crop = id;
    p.g = 0;
    sfx('plant');
    fx(target, '🌱');
    markDirty('toolbar', 'panel');
    return 'plant';
  }

  if (!quiet && p.s === 'planted') toast(plotInfo(i));
  return null;
}

function harvest(i, silent = false) {
  const p = S.plots[i];
  const c = CROPS[p.crop];
  addItem(p.crop, 1);
  gainXp(c.xp, silent);
  S.stats.harvest++;
  if (!silent) {
    fx({ tile: i }, `+1 ${c.icon}`, 'gold');
    sfx('harvest');
  }
  if (c.regrow) {
    p.g = c.time * (1 - c.regrow);
  } else {
    p.s = 'tilled';
    p.crop = null;
    p.g = 0;
  }
  return 'harvest';
}

function buyPlot(i) {
  if (!isBuyable(i)) {
    toast('🔒 Compre primeiro um terreno vizinho.');
    sfx('error');
    return null;
  }
  const cost = plotCost();
  if (!spend(cost)) return null;
  S.plots[i].s = 'grass';
  S.bought++;
  fx({ tile: i }, `-🪙${fmt(cost)}`, 'neg');
  sfx('coin');
  return 'buy';
}

// ================= Animais =================
function feedAnimal(a) {
  if ((S.inv.trigo || 0) < 1) return false;
  S.inv.trigo--;
  a.fed = true;
  markDirty('panel');
  return true;
}

function collectAnimal(a, silent = false) {
  const def = ANIMALS[a.type];
  addItem(def.product, 1);
  gainXp(PRODUCTS[def.product].xp, silent);
  a.ready = false;
  a.fed = false;
  a.p = 0;
  return def.product;
}

export function animalActionLabel(a) {
  const def = ANIMALS[a.type];
  if (a.ready) return `Coletar ${PRODUCTS[def.product].icon} ${PRODUCTS[def.product].name}`;
  if (!a.fed) return `Alimentar ${def.name.toLowerCase()} (1 🌾)`;
  return null;
}

export function animalInfo(a) {
  const def = ANIMALS[a.type];
  const prod = PRODUCTS[def.product];
  if (a.ready) return `${def.icon} ${def.name}: ${prod.icon} ${prod.name} pronto para coletar!`;
  if (!a.fed) return S.up.alimentador ? `${def.icon} ${def.name} com fome: o alimentador automático está sem 🌾 trigo!` : `${def.icon} ${def.name} com fome. Alimente com 🌾 trigo (você tem ${S.inv.trigo || 0}).`;
  return `${def.icon} ${def.name} produzindo ${prod.icon}… faltam ${fmtDuration(Math.ceil(def.time - a.p))}.`;
}

/** Interage com um animal: coleta, alimenta ou informa. */
export function interactAnimal(id, quiet = false) {
  const a = findAnimal(id);
  if (!a) return null;
  const def = ANIMALS[a.type];
  if (a.ready) {
    const prod = collectAnimal(a);
    fx({ animal: id }, `+1 ${PRODUCTS[prod].icon}`, 'gold');
    sfx('harvest');
    return 'collect';
  }
  if (!a.fed) {
    if (feedAnimal(a)) {
      fx({ animal: id }, '🌾');
      sfx('plant');
      return 'feed';
    }
    if (!quiet) {
      toast(`A ${def.name.toLowerCase()} precisa de 1 🌾 trigo. Plante e colha trigo!`, 'bad');
      sfx('error');
    }
    return null;
  }
  if (!quiet) toast(animalInfo(a));
  return null;
}

/** Cocho: alimenta todos os animais com fome. */
export function feedAll() {
  const hungry = S.animals.filter((a) => !a.fed && !a.ready);
  if (!S.animals.length) { toast('🐾 Ainda não há animais. Compre na loja!'); return 0; }
  if (!hungry.length) { toast('Todos os animais já estão alimentados. 🐾'); return 0; }
  let fed = 0;
  for (const a of hungry) if (feedAnimal(a)) fed++;
  if (fed) { fx({ player: true }, `-${fed} 🌾`); sfx('plant'); }
  if (fed < hungry.length) { toast('🌾 Trigo insuficiente para alimentar todos!', 'bad'); sfx('error'); }
  return fed;
}

// ================= Funcionários =================
export const dailyWages = () => Object.entries(WORKERS).reduce((s, [id, w]) => s + (S.workers[id] ? w.wage : 0), 0);

/** Semente que o plantador usa: a selecionada na barra, ou a que houver em maior quantidade. */
export function pickSeed() {
  if (tool.startsWith('seed:') && S.seeds[tool.slice(5)] > 0) return tool.slice(5);
  let best = null;
  for (const [id, n] of Object.entries(S.seeds)) if (n > 0 && CROPS[id] && (!best || n > S.seeds[best])) best = id;
  return best;
}

/** O plantador tem lotes para plantar mas nenhuma semente. */
export const plantadorSemSementes = () => !pickSeed() && S.plots.some((p) => p.s === 'tilled');

/** Alvos disponíveis para um funcionário: índices de lotes ou ids de animais. */
export function workerTargets(id) {
  if (id === 'colhedor') return S.plots.map((p, i) => (isReady(p) ? i : -1)).filter((i) => i >= 0);
  if (id === 'plantador') return pickSeed() ? S.plots.map((p, i) => (p.s === 'tilled' ? i : -1)).filter((i) => i >= 0) : [];
  if (id === 'tratador') return S.animals.filter((a) => a.ready).map((a) => a.id);
  return [];
}

/** Funcionário executa a tarefa no alvo. Retorna o tipo de ação ou null se não havia o que fazer. */
export function workerAct(id, target, silent = false) {
  if (id === 'colhedor') {
    const p = S.plots[target];
    if (p && isReady(p)) return harvest(target, silent);
  } else if (id === 'plantador') {
    const p = S.plots[target];
    const seed = pickSeed();
    if (p && p.s === 'tilled' && seed) {
      S.seeds[seed]--;
      p.s = 'planted';
      p.crop = seed;
      p.g = 0;
      if (!silent) { sfx('plant'); fx({ tile: target }, CROPS[seed].icon); }
      markDirty('toolbar', 'panel');
      return 'plant';
    }
  } else if (id === 'tratador') {
    const a = findAnimal(target);
    if (a && a.ready) {
      const prod = collectAnimal(a, silent);
      if (!silent) { fx({ animal: target }, `+1 ${PRODUCTS[prod].icon}`, 'gold'); sfx('harvest'); }
      return 'collect';
    }
  }
  return null;
}

// Quando o jogo é simulado sem a cena (offline, aba em segundo plano, sono), o trabalho segue em ritmo fixo
const workTimers = {};
function workersOffline(dt) {
  for (const id of Object.keys(WORKERS)) {
    if (!S.workers[id]) continue;
    workTimers[id] = (workTimers[id] || 0) + dt;
    while (workTimers[id] >= WORK_TIME) {
      workTimers[id] -= WORK_TIME;
      const targets = workerTargets(id);
      if (!targets.length) { workTimers[id] = 0; break; }
      workerAct(id, targets[0], true);
    }
  }
}

export function hireWorker(id) {
  const w = WORKERS[id];
  if (S.workers[id] || w.level > S.level) return;
  if (!spend(w.hire)) return;
  S.workers[id] = true;
  toast(`${w.icon} ${w.name} contratado! Salário: 🪙${w.wage} por dia.`, 'good');
  sfx('coin');
}

export function fireWorker(id) {
  const w = WORKERS[id];
  if (!S.workers[id]) return;
  S.workers[id] = false;
  toast(`${w.icon} ${w.name} foi dispensado.`);
  markDirty('panel');
}

// ================= Loja / mercado =================
export function buySeed(id, qty) {
  const c = CROPS[id];
  if (c.level > S.level) return;
  if (!spend(c.seed * qty)) return;
  S.seeds[id] = (S.seeds[id] || 0) + qty;
  sfx('coin');
  if (!tool.startsWith('seed:') || !S.seeds[tool.slice(5)]) tool = 'seed:' + id;
  markDirty('toolbar');
}

export function buyAnimal(type) {
  const def = ANIMALS[type];
  if (def.level > S.level) return;
  if (S.animals.length >= penSize()) { toast('🏡 Curral cheio! Compre a melhoria "Curral maior".', 'bad'); sfx('error'); return; }
  if (!spend(def.cost)) return;
  S.animals.push({ id: S.nextId++, type, fed: false, p: 0, ready: false });
  toast(`${def.icon} Uma ${def.name.toLowerCase()} chegou ao curral! Alimente-a com 🌾 trigo.`, 'good');
  sfx('coin');
}

export function buyUpgrade(id) {
  const u = UPGRADES[id];
  const l = S.up[id];
  if (l >= u.costs.length || u.req[l] > S.level) return;
  if (!spend(u.costs[l])) return;
  S.up[id]++;
  toast(`${u.icon} ${u.name}: ${u.effect(S.up[id])}!`, 'good');
  sfx('level');
}

export function sell(id, qty) {
  qty = Math.min(qty, S.inv[id] || 0);
  if (qty <= 0) return;
  S.inv[id] -= qty;
  earn(price(id) * qty);
  sfx('coin');
}

export function sellAll() {
  const reserve = S.animals.length;
  let total = 0;
  for (const id of Object.keys(ITEMS)) {
    let qty = S.inv[id] || 0;
    if (id === 'trigo') qty = Math.max(0, qty - reserve);
    if (qty > 0) { total += price(id) * qty; S.inv[id] -= qty; }
  }
  if (!total) { toast('Nada para vender.'); return; }
  earn(total);
  toast(`💰 Você vendeu tudo por 🪙${fmt(total)}!`, 'good');
  sfx('coin');
}

export function fulfillOrder(k) {
  const o = S.orders[k];
  if (!o || !canFulfill(o)) return;
  for (const r of o.req) S.inv[r.id] -= r.qty;
  S.orders.splice(k, 1);
  earn(o.coins);
  gainXp(o.xp);
  S.stats.orders++;
  fillOrders();
  toast(`📦 Pedido entregue para ${o.who}! +🪙${fmt(o.coins)} · +${o.xp} XP`, 'good');
  sfx('coin');
}

export function skipOrder(k) {
  S.orders[k] = makeOrder();
  markDirty('panel');
}

// ================= Textos informativos =================
export function plotInfo(i) {
  const p = S.plots[i];
  if (p.s === 'locked') {
    return isBuyable(i)
      ? `🔒 Terreno à venda por 🪙${fmt(plotCost())}.`
      : '🔒 Terreno bloqueado. Compre os lotes vizinhos primeiro.';
  }
  if (p.s === 'grass') return '🌿 Grama. Use a ⛏️ enxada para arar.';
  const wet = isWet(p);
  if (p.s === 'tilled') return `🟫 Terra arada${wet ? ' e molhada' : ''}. Escolha uma semente e plante!`;
  const c = CROPS[p.crop];
  if (isReady(p)) return `${c.icon} ${c.name} pronto para colher!`;
  const left = Math.ceil((c.time - p.g) / GROW_SPEED[S.up.adubo]);
  const water = wet
    ? (autoWater() ? '💧 regado' : `💧 regado (${Math.ceil(p.w)}s)`)
    : '⚠️ precisa de água!';
  return `${c.icon} ${c.name} — ${Math.floor((p.g / c.time) * 100)}% · faltam ~${fmtDuration(left)} · ${water}`;
}

export function toolHint() {
  if (tool === 'enxada') return '⛏️ Enxada: are a grama para poder plantar.';
  if (tool === 'regador') return `💧 Regador: molhe a terra — a água dura ${WATER_TIME[S.up.regador]}s.`;
  if (tool === 'mao') return '🧺 Colher: chegue perto das plantas prontas ✨ e colha.';
  const id = tool.slice(5);
  return `${CROPS[id].icon} Plantando ${CROPS[id].name}: ${S.seeds[id] || 0} sementes.`;
}

// ================= Salvamento =================
export function save() {
  if (!S) return;
  try {
    S.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) { /* armazenamento indisponível */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.plots) || d.plots.length < COLS * ROWS || d.plots.length > TOTAL_PLOTS) return null;
    const base = newState();
    const st = {
      ...base, ...d,
      up: { ...base.up, ...d.up },
      stats: { ...base.stats, ...d.stats },
      workers: { ...base.workers, ...d.workers },
      fields: { ...base.fields, ...d.fields },
    };
    // Saves antigos têm só o campo principal: completa com os lotes dos campos novos
    st.plots = base.plots.map((p, i) => d.plots[i] || p);
    for (const p of st.plots) if (p.s === 'planted' && !CROPS[p.crop]) { p.s = 'tilled'; p.crop = null; p.g = 0; }
    st.animals = (st.animals || []).filter((a) => ANIMALS[a.type]);
    st.nextId = st.nextId || 1;
    for (const a of st.animals) if (!a.id) a.id = st.nextId++;
    st.orders = (st.orders || []).filter((o) => o.req && o.req.every((r) => ITEMS[r.id]));
    return st;
  } catch (e) {
    return null;
  }
}

/** Carrega o jogo salvo (ou cria um novo). Retorna os segundos passados fora. */
export function startGame() {
  const loaded = load();
  let away = 0;
  if (loaded) {
    S = loaded;
    away = (Date.now() - (S.savedAt || Date.now())) / 1000;
    if (away > 15) simulate(Math.min(away, MAX_OFFLINE), true);
    else away = 0;
  } else {
    S = newState();
    rollPrices();
  }
  fillOrders();
  return away;
}

export function resetGame() {
  S = newState();
  rollPrices();
  fillOrders();
  S.seen = true;
  tool = 'seed:trigo';
  save();
  markDirty('panel', 'toolbar');
}
