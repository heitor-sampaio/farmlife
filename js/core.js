/* FarmLife — estado e regras do jogo (independente da renderização) */
import {
  COLS, ROWS, DAY_LEN, MAX_OFFLINE, SAVE_KEY, FIELDS, TOTAL_PLOTS, fieldOf,
  CROPS, PRODUCTS, ANIMALS, WATER_TIME, GROW_SPEED, PEN_SIZE, UPGRADES, CUSTOMERS,
  WORKERS, WORK_TIME, BIG_FIELD, BIG_CELLS, MACHINES, FISH, RODS, PET,
  MUTATIONS, WEATHER_EVENTS, EVENT_ROUND, EVENT_CHANCE, EVENT_COOLDOWN,
  AXES, LOG, WOOD, CHOP_TREES, SAWMILL, PLANK, BEAM, RECIPES, BUILDINGS, CARPENTRY,
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
for (const [id, f] of Object.entries(FISH)) ITEMS[id] = { name: f.name, icon: f.icon, sell: f.sell, xp: f.xp };
ITEMS.tronco = { ...LOG };
ITEMS.madeira = { ...PLANK };
ITEMS.viga = { ...BEAM };

// ================= Ganchos para a interface/cena =================
const hooks = { fx() {}, toast() {}, sfx() {}, dirty() {}, event() {} };
export function setHooks(h) { Object.assign(hooks, h); }
const toast = (msg, type) => hooks.toast(msg, type);
const sfx = (name) => hooks.sfx(name);
const fx = (target, text, cls) => hooks.fx(target, text, cls);
const markDirty = (...parts) => hooks.dirty(...parts);
const emit = (name, data) => hooks.event(name, data);

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
  { id: 'vara', icon: '🎣', name: 'Pescar' },
  { id: 'machado', icon: '🪓', name: 'Machado' },
];

export function setTool(id) {
  tool = id;
  markDirty('toolbar');
}

export function toolList() {
  const seeds = Object.keys(CROPS).filter((id) => CROPS[id].level <= S.level).map((id) => 'seed:' + id);
  const owned = (t) => (t.id === 'vara' ? S.fishing.rod > 0 : t.id === 'machado' ? S.wood.axe > 0 : true);
  return TOOLS.filter(owned).map((t) => t.id).concat(seeds);
}

// Campo de Trigo: s = 0 palha (precisa arar), 1 arado, 2 plantado; g = crescimento em segundos
function newBigField() {
  return { owned: false, s: new Array(BIG_CELLS).fill(0), g: new Array(BIG_CELLS).fill(0), mm: new Array(BIG_CELLS).fill(0) };
}

function newBuild(done) {
  return Object.fromEntries(Object.keys(BUILDINGS).map((id) => [id, { done, got: {} }]));
}

function newState() {
  const plots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const open = c >= 2 && c < 6 && r >= 1 && r < 4;
      const tilled = open && c >= 3 && c < 5 && r >= 1 && r < 3;
      plots.push({ s: open ? (tilled ? 'tilled' : 'grass') : 'locked', crop: null, g: 0, w: 0, m: [] });
    }
  }
  // Lotes dos outros campos (bloqueados até o campo ser comprado)
  while (plots.length < TOTAL_PLOTS) plots.push({ s: 'locked', crop: null, g: 0, w: 0, m: [] });
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
    big: newBigField(),
    machines: Object.fromEntries(Object.keys(MACHINES).map((id) => [id, false])),
    workers: { colhedor: false, plantador: false, tratador: false },
    up: { regador: 0, adubo: 0, curral: 0, alimentador: 0, aspersor: 0 },
    weather: 'sol',
    event: null,      // evento climático atual: { id, t, dur, strikeT }
    nextEvent: EVENT_ROUND * 2, // segundos até a próxima rodada de sorteio do clima
    prices: {},
    orders: [],
    bought: 0,
    stats: { harvest: 0, earned: 0, orders: 0, fish: 0, mutated: 0 },
    fishing: { rod: 1 },
    build: newBuild(false), // construções de madeira: { done, got: { material: entregue } }
    wood: { axe: 1, trees: CHOP_TREES.map(() => ({ hits: 0, t: 0 })) }, // t > 0: árvore cortada, crescendo de novo
    saw: { owned: false, queue: 0, t: 0, ready: 0 }, // serraria: troncos na fila, progresso do atual, tábuas prontas
    pet: { owned: false, name: PET.defaultName, day: 0 },
    bench: 'tabuas', // receita escolhida na mesa de carpintaria
    god: false,      // cheat de teste: moedas infinitas e nível máximo
    tutorial: { step: 0, count: 0, done: false, tips: {} },
    savedAt: Date.now(),
    seen: false,
  };
}

export const dayOf = (t) => Math.floor(t / DAY_LEN) + 1;
export const xpNeed = (l) => Math.round(50 * Math.pow(l, 1.5));
export const autoWater = () => S.weather === 'chuva' || S.up.aspersor > 0;
// Itens mutados ficam no inventário com a chave "base|mut1+mut2" (ex.: "tomate|congelada+eletrizada")
export const MUT_IDS = Object.keys(MUTATIONS);
export const MUT_BIT = Object.fromEntries(MUT_IDS.map((id, k) => [id, 1 << k]));
export const maskToList = (mask) => MUT_IDS.filter((id) => mask & MUT_BIT[id]);
/** Multiplicador de venda: cada mutação soma o seu bônus. */
export const mutMult = (list) => 1 + list.reduce((s, id) => s + MUTATIONS[id].mult - 1, 0);
export const itemKey = (base, list) => (list && list.length ? base + '|' + MUT_IDS.filter((id) => list.includes(id)).join('+') : base);
export function parseKey(key) {
  const [base, m] = key.split('|');
  return { base, muts: m ? m.split('+').filter((id) => MUTATIONS[id]) : [] };
}
/** Nome, ícone e valor de um item (com ou sem mutações). */
export function itemInfo(key) {
  const { base, muts } = parseKey(key);
  const it = ITEMS[base];
  if (!it) return null;
  return { ...it, base, muts, mult: mutMult(muts), tag: muts.map((m) => MUTATIONS[m].icon).join('') };
}
/** Mutação de maior valor da lista (para cores e ícones). */
export const topMutation = (list) => list.reduce((best, id) => (!best || MUTATIONS[id].mult > MUTATIONS[best].mult ? id : best), null);

export const price = (key) => {
  const { base, muts } = parseKey(key);
  return Math.max(1, Math.round(ITEMS[base].sell * (S.prices[base] || 1) * mutMult(muts)));
};
export const plotCost = () => Math.round(80 * Math.pow(1.2, S.bought));
export const penSize = () => PEN_SIZE[S.up.curral];
export const isReady = (p) => p.s === 'planted' && p.g >= CROPS[p.crop].time;
export const isWet = (p) => autoWater() || p.w > 0;
export const canFulfill = (o) => o.req.every((r) => (S.inv[r.id] || 0) >= r.qty);
/** Há pedido novo (ainda não lido) ou que já dá para entregar? (cartinha sobre o quadro) */
export const hasMail = () => S.orders.some((o) => !o.seen || canFulfill(o));
/** Marca todos os pedidos como lidos (ao abrir os pedidos). */
export function markOrdersSeen() {
  for (const o of S.orders) if (!o.seen) { o.seen = true; o.seenAt = S.time; }
}
/** Pedido recém-chegado: ainda não lido ou lido há poucos segundos. */
export const isNewOrder = (o) => !o.seen || (o.seenAt != null && S.time - o.seenAt < 10);
export const findAnimal = (id) => S.animals.find((a) => a.id === id);

/** Hora do dia (o dia começa às 6h, então vai de 6 a 30). */
export const dayHours = () => 6 + ((S.time % DAY_LEN) / DAY_LEN) * 24;

/** Escuridão de 0 (dia) a 1 (noite fechada). */
export function darkness() {
  // No eclipse o dia vira noite
  if (S.event && S.event.id === 'eclipse') return Math.max(0.85, nightness());
  return nightness();
}

function nightness() {
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
  emit('field', id);
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
  const paid = payWages(quiet);
  if (!quiet) {
    const wages = paid ? ` · Salários: -🪙${fmt(paid)}` : '';
    toast(`☀️ Dia ${day} começou. Os preços do mercado mudaram!${wages}`);
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

// ================= Eventos climáticos e mutações =================
export const currentEvent = () => (S.event ? WEATHER_EVENTS[S.event.id] : null);

function pickEvent() {
  const opts = Object.entries(WEATHER_EVENTS);
  let roll = Math.random() * opts.reduce((s, [, e]) => s + e.weight, 0);
  for (const [id, e] of opts) { if ((roll -= e.weight) <= 0) return id; }
  return 'chuva';
}

function startEvent(id, quiet) {
  const ev = WEATHER_EVENTS[id];
  const dur = Math.round(rand(ev.dur[0], ev.dur[1]));
  S.event = { id, t: dur, dur, strikeT: 2 };
  if (!quiet) {
    const m = MUTATIONS[ev.mutation];
    toast(`${ev.icon} ${ev.name}! ${ev.desc} Plantas crescendo podem ficar ${m.icon} ${m.name} (${m.rarity}, ×${m.mult}).`, 'event');
    sfx(id === 'tempestade' ? 'thunder' : 'event');
  }
  emit('weather', id);
}

function endEvent(quiet) {
  const prev = S.event.id;
  S.event = null;
  // Depois da chuva, às vezes vem um arco-íris
  if ((prev === 'chuva' || prev === 'tempestade') && Math.random() < WEATHER_EVENTS.arcoiris.after) {
    startEvent('arcoiris', quiet);
    return;
  }
  S.nextEvent = EVENT_ROUND * (1 + EVENT_COOLDOWN);
  if (!quiet) toast(`${WEATHER_EVENTS[prev].icon} ${WEATHER_EVENTS[prev].name} passou.`);
}

/** Dá uma mutação a um lote (se ainda não tiver). */
function mutatePlot(i, mut, quiet) {
  const p = S.plots[i];
  if (p.m.includes(mut)) return false;
  p.m.push(mut);
  if (!quiet) fx({ tile: i }, `${MUTATIONS[mut].icon} ${MUTATIONS[mut].name}!`, 'mut');
  return true;
}

const growingPlots = () => S.plots.map((p, i) => (p.s === 'planted' && !isReady(p) ? i : -1)).filter((i) => i >= 0);
const growingCells = () => {
  const out = [];
  if (S.big.owned) for (let k = 0; k < BIG_CELLS; k++) if (S.big.s[k] === 2 && !bigReady(k)) out.push(k);
  return out;
};

function applyEvent(dt, quiet) {
  const ev = currentEvent();
  const mut = ev.mutation;
  if (ev.rate) {
    const chance = ev.rate * dt;
    S.plots.forEach((p, i) => {
      if (p.s === 'planted' && !isReady(p) && !p.m.includes(mut) && Math.random() < chance) mutatePlot(i, mut, quiet);
    });
    if (S.big.owned) {
      const bit = MUT_BIT[mut];
      for (let k = 0; k < BIG_CELLS; k++) {
        if (S.big.s[k] === 2 && !(S.big.mm[k] & bit) && !bigReady(k) && Math.random() < chance) S.big.mm[k] |= bit;
      }
    }
  }
  // Tempestade: raios caem em plantas específicas
  if (ev.strikes) {
    S.event.strikeT -= dt;
    if (S.event.strikeT <= 0) {
      S.event.strikeT = rand(ev.strikes[0], ev.strikes[1]);
      const plots = growingPlots(), cells = growingCells();
      if (plots.length && (!cells.length || Math.random() < 0.7)) {
        const i = pick(plots);
        mutatePlot(i, mut, quiet);
        if (!quiet) emit('strike', { tile: i });
      } else if (cells.length) {
        // No Campo de Trigo, o raio eletriza a célula atingida e as vizinhas
        const k = pick(cells);
        const cols = BIG_FIELD.cols;
        for (const n of [k, k - 1, k + 1, k - cols, k + cols]) {
          if (n >= 0 && n < BIG_CELLS && S.big.s[n] === 2 && !bigReady(n)) S.big.mm[n] |= MUT_BIT[mut];
        }
        if (!quiet) emit('strike', { cell: k });
      } else if (!quiet) {
        emit('strike', { random: true });
      }
    }
  }
}

let feederWarned = false;

export function update(dt, quiet) {
  if (S.god) S.coins = GOD_COINS;
  const before = dayOf(S.time);
  S.time += dt;
  const after = dayOf(S.time);
  if (after !== before) newDay(after, quiet);

  if (S.event) {
    applyEvent(dt, quiet);
    S.event.t -= dt;
    if (S.event.t <= 0) endEvent(quiet);
  } else {
    // Rodada: só às vezes o clima muda
    S.nextEvent -= dt;
    if (S.nextEvent <= 0) {
      S.nextEvent = EVENT_ROUND;
      if (Math.random() < EVENT_CHANCE) startEvent(pickEvent(), quiet);
    }
  }
  const ev = currentEvent();
  S.weather = ev && ev.waters ? 'chuva' : 'sol';
  const evaporate = ev && ev.evaporate ? ev.evaporate : 1;

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
    if (p.w > 0) p.w = Math.max(0, p.w - dt * evaporate);
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

  if (S.big.owned) {
    const b = S.big;
    for (let k = 0; k < BIG_CELLS; k++) {
      if (b.s[k] === 2 && b.g[k] < BIG_FIELD.time) b.g[k] = Math.min(BIG_FIELD.time, b.g[k] + dt * speed);
    }
  }

  // Árvores cortadas voltam a crescer
  for (const tr of S.wood.trees) if (tr.t > 0) tr.t = Math.max(0, tr.t - dt);

  // Serraria: serra um tronco por vez (também com o jogo fechado)
  const saw = S.saw;
  if (saw.owned && saw.queue > 0) {
    saw.t += dt;
    while (saw.t >= SAWMILL.time && saw.queue > 0) {
      saw.t -= SAWMILL.time;
      saw.queue--;
      saw.ready += SAWMILL.perLog;
    }
    if (saw.queue === 0) saw.t = 0;
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

/** Recompensa (moedas e XP) dada pelo tutorial. */
export function giveReward(coins = 0, xp = 0) {
  if (coins) earn(coins);
  if (xp) gainXp(xp);
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
  emit('level', S.level);
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
  if (S.wood.axe > 0) ids.push('tronco');
  if (S.saw.owned || built('celeiro')) ids.push('madeira');
  if (built('celeiro')) ids.push('viga');
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
  return { who: pick(CUSTOMERS), req, coins: Math.round(value * rand(1.3, 1.7)), xp: Math.round(xp * 1.5) + 5, seen: false };
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
  const res = useTileInner(i, quiet);
  if (res) emit(res);
  return res;
}

function useTileInner(i, quiet) {
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
    p.m = [];
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
  const muts = p.m || [];
  addItem(itemKey(p.crop, muts), 1);
  gainXp(c.xp, silent);
  S.stats.harvest++;
  if (muts.length) S.stats.mutated = (S.stats.mutated || 0) + 1;
  if (!silent) {
    fx({ tile: i }, `+1 ${c.icon}${muts.map((m) => MUTATIONS[m].icon).join('')}`, muts.length ? 'mut' : 'gold');
    sfx(muts.length ? 'catch' : 'harvest');
  }
  p.m = []; // a planta recomeça sem mutações; elas ficam no item colhido
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

// ================= Lavoura mecanizada =================
export const bigReady = (k) => S.big.s[k] === 2 && S.big.g[k] >= BIG_FIELD.time;

/** Resumo do campo: quantas células em cada etapa. */
export function bigSummary() {
  const out = { palha: 0, arado: 0, crescendo: 0, maduro: 0 };
  for (let k = 0; k < BIG_CELLS; k++) {
    const s = S.big.s[k];
    if (s === 0) out.palha++;
    else if (s === 1) out.arado++;
    else if (bigReady(k)) out.maduro++;
    else out.crescendo++;
  }
  return out;
}

export function buyBigField() {
  if (S.big.owned || BIG_FIELD.level > S.level) return;
  if (!spend(BIG_FIELD.cost)) return;
  S.big.owned = true;
  emit('bigfield');
  toast(`${BIG_FIELD.icon} O ${BIG_FIELD.name} é seu! ${BIG_CELLS} lotes. Compre as máquinas para trabalhar nele.`, 'good');
  sfx('level');
}

export function buyMachine(id) {
  const m = MACHINES[id];
  if (S.machines[id] || m.level > S.level) return;
  if (!S.big.owned) { toast(`Compre o ${BIG_FIELD.name} antes das máquinas.`, 'bad'); sfx('error'); return; }
  if (!needBuilt('galpao', 'guardar as máquinas')) return;
  if (!spend(m.cost)) return;
  S.machines[id] = { x: null, z: null, h: 0 }; // a cena estaciona no galpão
  emit('machine', id);
  toast(`${m.icon} ${m.name} chegou ao galpão! Chegue perto e aperte Espaço para dirigir.`, 'good');
  sfx('level');
}

/**
 * Trabalho de uma máquina numa célula do Campo de Trigo.
 * Retorna 'till', 'plant', 'harvest', 'noseed' ou null (nada a fazer ali).
 */
export function bigWork(machine, k) {
  const b = S.big;
  if (!b.owned) return null;
  if (machine === 'arado' && b.s[k] === 0) {
    b.s[k] = 1;
    return 'till';
  }
  if (machine === 'plantadeira' && b.s[k] === 1) {
    if (!(S.seeds.trigo > 0)) return 'noseed';
    S.seeds.trigo--;
    b.s[k] = 2;
    b.g[k] = 0;
    b.mm[k] = 0;
    markDirty('toolbar', 'panel');
    return 'plant';
  }
  if (machine === 'colheitadeira' && bigReady(k)) {
    b.s[k] = 0;
    b.g[k] = 0;
    const muts = maskToList(b.mm[k]);
    b.mm[k] = 0;
    addItem(itemKey('trigo', muts), 1);
    if (muts.length) S.stats.mutated = (S.stats.mutated || 0) + 1;
    gainXp(1);
    S.stats.harvest++;
    return 'harvest';
  }
  return null;
}

// ================= Pet =================
export function buyPet() {
  if (S.pet.owned || PET.level > S.level) return;
  if (!spend(PET.cost)) return;
  S.pet.owned = true;
  emit('pet');
  toast(`${PET.icon} ${S.pet.name} chegou! Ela vai seguir você pela fazenda. Faça carinho todo dia.`, 'good');
  sfx('bark');
  markDirty('panel');
}

export function renamePet(name) {
  name = String(name || '').trim().slice(0, 18);
  if (!name) return;
  S.pet.name = name;
  markDirty('panel');
}

/** Carinho no pet: uma vez por dia dá XP. Retorna true se ganhou o bônus. */
export function petDog() {
  const day = dayOf(S.time);
  if (S.pet.day === day) return false;
  S.pet.day = day;
  gainXp(PET.xp);
  toast(`❤️ ${S.pet.name} adorou o carinho! +${PET.xp} XP`, 'good');
  return true;
}

// ================= Lenha =================
export const axe = () => AXES[S.wood.axe] || null;
export const treeDown = (i) => S.wood.trees[i].t > 0;

export function buyAxe(level) {
  const a = AXES[level];
  if (!a || S.wood.axe >= level || a.level > S.level) return;
  if (level > 1 && S.wood.axe < level - 1) { toast('Compre o machado anterior primeiro.', 'bad'); return; }
  if (!spend(a.cost)) return;
  S.wood.axe = level;
  tool = 'machado';
  toast(`${a.icon} ${a.name} comprado! Vá até o bosque, a oeste, e corte algumas árvores.`, 'good');
  sfx('coin');
  emit('axe', level);
  markDirty('toolbar', 'panel');
}

/** Um golpe de machado na árvore i. Retorna 'hit', 'fell' (derrubou) ou null. */
export function chopTree(i, quiet = false) {
  const tr = S.wood.trees[i];
  const a = axe();
  if (!tr || tr.t > 0) return null;
  if (!a) {
    if (!quiet) { toast('🪓 Compre um machado na loja para cortar árvores.', 'bad'); sfx('error'); }
    return null;
  }
  tr.hits++;
  if (tr.hits < a.hits) { sfx('chop'); return 'hit'; }
  const logs = WOOD.logs[0] + Math.floor(Math.random() * (WOOD.logs[1] - WOOD.logs[0] + 1)) + a.bonus;
  tr.hits = 0;
  tr.t = WOOD.regrow;
  addItem('tronco', logs);
  gainXp(WOOD.xp);
  S.stats.logs = (S.stats.logs || 0) + logs;
  sfx('timber');
  emit('chop', logs);
  return 'fell';
}

// ================= Construções de madeira =================
export const built = (id) => !!(S.build[id] && S.build[id].done);

function needBuilt(id, what) {
  if (built(id)) return true;
  const b = BUILDINGS[id];
  toast(`${b.icon} Construa o ${b.name} com madeira para ${what}.`, 'bad');
  sfx('error');
  return false;
}

/** Material que ainda falta entregar: [{ id, qty }]. */
export function buildMissing(id) {
  const st = S.build[id];
  return Object.entries(BUILDINGS[id].cost)
    .map(([m, qty]) => ({ id: m, qty: qty - (st.got[m] || 0) }))
    .filter((x) => x.qty > 0);
}

/** Progresso da obra (0 a 1). */
export function buildProgress(id) {
  const cost = BUILDINGS[id].cost;
  const st = S.build[id];
  if (st.done) return 1;
  let total = 0, got = 0;
  for (const [m, qty] of Object.entries(cost)) { total += qty; got += Math.min(qty, st.got[m] || 0); }
  return total ? got / total : 1;
}

/** Entrega no canteiro o material que o jogador tem. Retorna { delivered, done } ou null. */
export function buildDeliver(id) {
  const b = BUILDINGS[id];
  const st = S.build[id];
  if (!b || st.done) return null;
  let delivered = 0;
  for (const { id: m, qty } of buildMissing(id)) {
    const n = Math.min(qty, S.inv[m] || 0);
    if (n > 0) {
      S.inv[m] -= n;
      st.got[m] = (st.got[m] || 0) + n;
      delivered += n;
    }
  }
  if (!buildMissing(id).length) {
    st.done = true;
    gainXp(15);
    toast(`${b.icon} ${b.name} construído! ${b.desc}`, 'good');
    sfx('level');
    emit('build', id);
    markDirty('panel', 'toolbar');
    return { delivered, done: true };
  }
  if (delivered) {
    toast(`🏗️ ${b.name}: material entregue (${Math.round(buildProgress(id) * 100)}%). Falta ${missingText(id)}.`, 'good');
    sfx('chop');
    markDirty('panel');
  } else {
    toast(`🏗️ Para o ${b.name} falta ${missingText(id)}. Faça na ${CARPENTRY.name}.`, 'bad');
    sfx('error');
  }
  return { delivered, done: false };
}

const missingText = (id) => buildMissing(id).map((x) => `${x.qty} ${ITEMS[x.id].icon}`).join(' e ');

export function buildLabel(id) {
  const b = BUILDINGS[id];
  const can = buildMissing(id).some((x) => (S.inv[x.id] || 0) > 0);
  return can ? `Entregar madeira no ${b.name}` : `Ver a obra do ${b.name}`;
}

export function buildInfo(id) {
  const b = BUILDINGS[id];
  return `🏗️ Obra do ${b.name} (${Math.round(buildProgress(id) * 100)}%): falta ${missingText(id)}. ${b.desc}`;
}

export const recipe = () => RECIPES.find((x) => x.id === S.bench) || RECIPES[0];
export function setBench(id) {
  if (!RECIPES.some((x) => x.id === id)) return;
  S.bench = id;
  markDirty('panel');
}

/** Quantas vezes dá para fazer a receita com o que há no celeiro. */
export function craftMax(rid) {
  const rc = RECIPES.find((x) => x.id === rid);
  if (!rc) return 0;
  return Math.min(...Object.entries(rc.input).map(([m, q]) => Math.floor((S.inv[m] || 0) / q)));
}

/** Faz uma unidade da receita na mesa de carpintaria. Retorna true se deu certo. */
export function craft(rid) {
  const rc = RECIPES.find((x) => x.id === rid);
  if (!rc || craftMax(rid) < 1) return false;
  for (const [m, q] of Object.entries(rc.input)) S.inv[m] -= q;
  for (const [m, q] of Object.entries(rc.output)) addItem(m, q);
  gainXp(rc.xp);
  S.stats.crafted = (S.stats.crafted || 0) + 1;
  if (rid === 'tabuas') S.stats.planks = (S.stats.planks || 0) + rc.output.madeira;
  emit('craft', rid);
  markDirty('panel');
  return true;
}

// ================= Códigos de teste =================
const GOD_COINS = 999999999;
/** Nível em que tudo do jogo já está liberado. */
export const MAX_LEVEL = Math.max(
  ...Object.values(CROPS).map((c) => c.level),
  ...Object.values(ANIMALS).map((a) => a.level),
  ...Object.values(UPGRADES).flatMap((u) => u.req),
  ...Object.values(WORKERS).map((w) => w.level),
  ...FIELDS.map((f) => f.level || 1),
  ...Object.values(MACHINES).map((m) => m.level),
  ...RODS.filter(Boolean).map((r) => r.level),
  ...AXES.filter(Boolean).map((a) => a.level),
  BIG_FIELD.level, SAWMILL.level, PET.level,
);

/** Liga/desliga o godmode. Ao desligar, volta às moedas e ao nível de antes. */
export function godMode(on = !S.god) {
  if (on === !!S.god) return;
  if (on) {
    S.godBackup = { coins: S.coins, level: S.level, xp: S.xp };
    S.god = true;
    S.coins = GOD_COINS;
    if (S.level < MAX_LEVEL) { S.level = MAX_LEVEL; S.xp = 0; }
    toast(`🧪 Godmode ligado: moedas infinitas e nível ${S.level}. Digite o código de novo para desligar.`, 'level');
    sfx('level');
  } else {
    const b = S.godBackup || { coins: 0, level: S.level, xp: S.xp };
    S.god = false;
    Object.assign(S, { coins: b.coins, level: b.level, xp: b.xp });
    delete S.godBackup;
    toast('🧪 Godmode desligado: moedas e nível voltaram ao que eram.');
  }
  markDirty('panel', 'toolbar');
  save();
}

/** Aplica um código de teste. Retorna true se o código existe. */
export function cheat(code) {
  code = String(code || '').trim().toLowerCase();
  if (code === 'godmode') { godMode(); return true; }
  toast('🧪 Código desconhecido.', 'bad');
  sfx('error');
  return false;
}

// ================= Serraria =================
export function buySawmill() {
  if (S.saw.owned || SAWMILL.level > S.level) return;
  if (!spend(SAWMILL.cost)) return;
  S.saw.owned = true;
  toast(`${SAWMILL.icon} Serraria construída na entrada do bosque! Leve troncos 🪵 para virar tábuas ${PLANK.icon}.`, 'good');
  sfx('level');
  emit('sawmill');
  markDirty('panel');
}

/** Usar a serraria: coleta as tábuas prontas e coloca os troncos do celeiro na fila. */
export function sawmillUse() {
  const saw = S.saw;
  if (!saw.owned) return null;
  const collected = saw.ready;
  if (collected) {
    addItem('madeira', collected);
    gainXp(collected * PLANK.xp);
    S.stats.planks = (S.stats.planks || 0) + collected;
    saw.ready = 0;
  }
  const loaded = Math.min(S.inv.tronco || 0, SAWMILL.capacity - saw.queue);
  if (loaded > 0) {
    S.inv.tronco -= loaded;
    saw.queue += loaded;
  }
  if (collected || loaded) {
    const parts = [];
    if (collected) parts.push(`coletou ${collected} ${PLANK.icon}`);
    if (loaded) parts.push(`colocou ${loaded} 🪵 para serrar`);
    toast(`${SAWMILL.icon} Serraria: ${parts.join(' e ')}.`, 'good');
    sfx(collected ? 'harvest' : 'chop');
    markDirty('panel');
  } else if (saw.queue >= SAWMILL.capacity) {
    toast(`${SAWMILL.icon} A serraria está cheia (${SAWMILL.capacity} troncos na fila).`);
  } else {
    toast(`${SAWMILL.icon} Traga troncos 🪵 para serrar. Corte árvores no bosque com o machado.`);
  }
  return { collected, loaded };
}

/** Rótulo da ação na serraria (ou null se não há o que fazer). */
export function sawLabel() {
  const saw = S.saw;
  if (!saw.owned) return `Ver a Serraria (🪙${fmt(SAWMILL.cost)})`;
  const canLoad = Math.min(S.inv.tronco || 0, SAWMILL.capacity - saw.queue);
  const parts = [];
  if (saw.ready) parts.push(`Coletar ${saw.ready} ${PLANK.icon}`);
  if (canLoad) parts.push(`serrar ${canLoad} 🪵`);
  if (!parts.length) return null;
  const txt = parts.join(' e ');
  return txt[0].toUpperCase() + txt.slice(1);
}

export function sawInfo() {
  const saw = S.saw;
  if (!saw.owned) return `${SAWMILL.icon} Terreno da Serraria: compre na loja (🪙${fmt(SAWMILL.cost)}, nível ${SAWMILL.level}) para transformar troncos em tábuas.`;
  const next = saw.queue ? ` · próxima tábua em ${Math.ceil(SAWMILL.time - saw.t)}s` : '';
  return `${SAWMILL.icon} Serraria: ${saw.queue} 🪵 na fila · ${saw.ready} ${PLANK.icon} prontas${next}. Cada tronco vira ${SAWMILL.perLog} tábuas.`;
}

/** Texto do contexto da árvore. */
export function treeInfo(i) {
  const tr = S.wood.trees[i];
  if (tr.t > 0) return `🪵 Toco: a árvore volta a crescer em ~${fmtDuration(Math.ceil(tr.t))}.`;
  const a = axe();
  if (!a) return '🌳 Árvore do bosque. Compre um 🪓 machado na loja para cortar e ganhar troncos.';
  return `🌳 Árvore: ${tr.hits}/${a.hits} golpes. Rende ${WOOD.logs[0] + a.bonus}–${WOOD.logs[1] + a.bonus} 🪵 troncos.`;
}

// ================= Pescaria =================
export const rod = () => RODS[S.fishing.rod] || null;

export function buyRod(level) {
  const r = RODS[level];
  if (!r || S.fishing.rod >= level || r.level > S.level) return;
  if (level > 1 && S.fishing.rod < level - 1) { toast('Compre a vara anterior primeiro.', 'bad'); return; }
  if (!spend(r.cost)) return;
  S.fishing.rod = level;
  emit('rod', level);
  tool = 'vara';
  toast(`${r.icon} ${r.name} comprada! Vá até o lago e aperte Espaço para pescar.`, 'good');
  sfx('coin');
  markDirty('toolbar', 'panel');
}

/** Sorteia o que morde a isca, conforme a hora, o clima e a vara. */
export function rollFish() {
  const night = darkness() > 0.5;
  const rain = S.weather === 'chuva';
  const good = S.fishing.rod >= 2;
  const opts = Object.entries(FISH).map(([id, f]) => {
    let w = f.weight;
    if (f.night && night) w *= 3;
    if (f.rain && rain) w *= 3;
    if (f.rare && good) w *= 2;
    if (f.junk && good) w *= 0.5;
    return [id, w];
  });
  let roll = Math.random() * opts.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of opts) { if ((roll -= w) <= 0) return id; }
  return 'lambari';
}

export function catchFish(id) {
  const f = FISH[id];
  addItem(id, 1);
  gainXp(f.xp);
  S.stats.fish = (S.stats.fish || 0) + 1;
  emit('fish', id);
  const msg = f.junk ? `${f.icon} Ops… você pescou uma ${f.name.toLowerCase()}.` : `🎣 Você pescou: ${f.icon} ${f.name}! (vale 🪙${price(id)})`;
  toast(msg, f.rare ? 'level' : f.junk ? '' : 'good');
  sfx(f.rare ? 'level' : 'catch');
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
      p.m = [];
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
  emit('worker', id);
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
  emit('buy-seed', id);
  sfx('coin');
  if (!tool.startsWith('seed:') || !S.seeds[tool.slice(5)]) tool = 'seed:' + id;
  markDirty('toolbar');
}

export function buyAnimal(type) {
  const def = ANIMALS[type];
  if (def.level > S.level) return;
  if (!needBuilt('curral', 'comprar animais')) return;
  if (S.animals.length >= penSize()) { toast('🏡 Curral cheio! Compre a melhoria "Curral maior".', 'bad'); sfx('error'); return; }
  if (!spend(def.cost)) return;
  S.animals.push({ id: S.nextId++, type, fed: false, p: 0, ready: false });
  emit('animal', type);
  toast(`${def.icon} Uma ${def.name.toLowerCase()} chegou ao curral! Alimente-a com 🌾 trigo.`, 'good');
  sfx('coin');
}

export function buyUpgrade(id) {
  const u = UPGRADES[id];
  const l = S.up[id];
  if (l >= u.costs.length || u.req[l] > S.level) return;
  if ((id === 'curral' || id === 'alimentador') && !needBuilt('curral', 'comprar esta melhoria')) return;
  if (!spend(u.costs[l])) return;
  S.up[id]++;
  toast(`${u.icon} ${u.name}: ${u.effect(S.up[id])}!`, 'good');
  sfx('level');
}

export function sell(id, qty) {
  if (!needBuilt('celeiro', 'vender')) return;
  qty = Math.min(qty, S.inv[id] || 0);
  if (qty <= 0) return;
  S.inv[id] -= qty;
  earn(price(id) * qty);
  sfx('coin');
  emit('sell', id);
}

export function sellAll() {
  if (!needBuilt('celeiro', 'vender')) return;
  const reserve = S.animals.length;
  let total = 0;
  for (const id of Object.keys(S.inv)) {
    if (!itemInfo(id)) continue;
    let qty = S.inv[id] || 0;
    if (id === 'trigo') qty = Math.max(0, qty - reserve);
    if (qty > 0) { total += price(id) * qty; S.inv[id] -= qty; }
  }
  if (!total) { toast('Nada para vender.'); return; }
  earn(total);
  toast(`💰 Você vendeu tudo por 🪙${fmt(total)}!`, 'good');
  emit('sell');
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
  emit('order');
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
  const muts = p.m || [];
  const mutTxt = muts.length ? ` · ${muts.map((m) => `${MUTATIONS[m].icon} ${MUTATIONS[m].name}`).join(', ')} (×${mutMult(muts).toLocaleString('pt-BR')})` : '';
  if (isReady(p)) return `${c.icon} ${c.name} pronto para colher!${mutTxt}`;
  const left = Math.ceil((c.time - p.g) / GROW_SPEED[S.up.adubo]);
  const water = wet
    ? (autoWater() ? '💧 regado' : `💧 regado (${Math.ceil(p.w)}s)`)
    : '⚠️ precisa de água!';
  return `${c.icon} ${c.name} — ${Math.floor((p.g / c.time) * 100)}% · faltam ~${fmtDuration(left)} · ${water}${mutTxt}`;
}

export function toolHint() {
  if (tool === 'enxada') return '⛏️ Enxada: are a grama para poder plantar.';
  if (tool === 'regador') return `💧 Regador: molhe a terra — a água dura ${WATER_TIME[S.up.regador]}s.`;
  if (tool === 'mao') return '🧺 Colher: chegue perto das plantas prontas ✨ e colha.';
  if (tool === 'machado') return '🪓 Machado: chegue perto de uma árvore do bosque e corte para ganhar troncos 🪵.';
  if (tool === 'vara') return '🎣 Vara de pesca: vá até a beira do lago e aperte Espaço para lançar a linha.';
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
      machines: { ...base.machines, ...d.machines },
      fishing: { rod: Math.max(1, (d.fishing && d.fishing.rod) || 0) },
      build: d.build ? Object.fromEntries(Object.keys(BUILDINGS).map((id) => [id, { done: false, got: {}, ...d.build[id] }])) : newBuild(true),
      saw: { ...base.saw, ...d.saw },
      wood: {
        axe: Math.max(1, (d.wood && d.wood.axe) || 0),
        trees: CHOP_TREES.map((_, k) => (d.wood && d.wood.trees && d.wood.trees[k]) || { hits: 0, t: 0 }),
      },
      pet: { ...base.pet, ...d.pet },
      tutorial: d.tutorial ? { ...base.tutorial, ...d.tutorial, tips: { ...(d.tutorial.tips || {}) } } : { ...base.tutorial, done: true },
      big: d.big && Array.isArray(d.big.s) && d.big.s.length === BIG_CELLS ? d.big : base.big,
    };
    // Saves antigos têm só o campo principal: completa com os lotes dos campos novos
    st.plots = base.plots.map((p, i) => d.plots[i] || p);
    for (const p of st.plots) if (!Array.isArray(p.m)) p.m = [];
    if (!Array.isArray(st.big.mm) || st.big.mm.length !== BIG_CELLS) st.big.mm = new Array(BIG_CELLS).fill(0);
    if (st.event && !WEATHER_EVENTS[st.event.id]) st.event = null;
    if (typeof st.nextEvent !== 'number' || st.nextEvent > EVENT_ROUND * (1 + EVENT_COOLDOWN)) st.nextEvent = EVENT_ROUND;
    for (const p of st.plots) if (p.s === 'planted' && !CROPS[p.crop]) { p.s = 'tilled'; p.crop = null; p.g = 0; }
    st.animals = (st.animals || []).filter((a) => ANIMALS[a.type]);
    st.nextId = st.nextId || 1;
    for (const a of st.animals) if (!a.id) a.id = st.nextId++;
    st.orders = (st.orders || []).filter((o) => o.req && o.req.every((r) => ITEMS[r.id]));
    for (const o of st.orders) if (o.seen === undefined) o.seen = true;
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
