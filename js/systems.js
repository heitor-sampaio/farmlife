/* FarmLife — regras dos sistemas novos: fábricas, pomar, colmeias (e o que vier depois) */
import { FISH, FACTORIES, ORCHARD, FRUIT_TREES, HIVES, GOODS, SEASONS, SEASON_DAYS, SEASON_BONUS, CROPS, PRODUCTS, CUSTOMERS, QUEST, FRIEND, FAIR, BUILDINGS, PASTURE, DECOR, PET_FINDS } from './data.js';
import * as core from './core.js';

const H = core.H;
const S = () => core.S;
const fmt = (n) => core.fmt(n);
const icon = (id) => (core.ITEMS[id] ? core.ITEMS[id].icon : id === 'peixe' ? '🐟' : '?');
const nameOf = (id) => (id === 'peixe' ? 'peixes' : core.ITEMS[id] ? core.ITEMS[id].name.toLowerCase() : id);
const bw = (f, m, w) => (f.fem ? w : m);

// ================= Fábricas =================
export const factoryOf = (id) => FACTORIES[id];
export const recipeOf = (fid, rid) => FACTORIES[fid].recipes.find((r) => r.id === rid) || FACTORIES[fid].recipes[0];
export const ioText = (o) => Object.entries(o).map(([id, q]) => `${q} ${icon(id)}`).join(' + ');

/** Peixes (sem a bota velha) no celeiro, do mais barato para o mais caro. */
function fishStock() {
  const inv = S().inv;
  return Object.keys(inv)
    .filter((k) => (inv[k] || 0) > 0 && FISH[core.parseKey(k).base] && !FISH[core.parseKey(k).base].junk)
    .sort((a, b) => core.price(a) - core.price(b));
}
const have = (id) => (id === 'peixe' ? fishStock().reduce((s, k) => s + S().inv[k], 0) : S().inv[id] || 0);

/** Quantas vezes dá para fazer a receita com o que há no celeiro. */
export function canMake(fid, rid) {
  const r = recipeOf(fid, rid);
  return Math.min(...Object.entries(r.in).map(([id, q]) => Math.floor(have(id) / q)));
}

function take(id, q) {
  const inv = S().inv;
  if (id !== 'peixe') { inv[id] -= q; return; }
  for (const k of fishStock()) {
    const n = Math.min(q, inv[k]);
    inv[k] -= n;
    q -= n;
    if (!q) return;
  }
}

export function setRecipe(fid, rid) {
  if (!FACTORIES[fid].recipes.some((r) => r.id === rid)) return;
  S().fac[fid].sel = rid;
  H.dirty('panel');
}

/** Usar a fábrica: coleta o que está pronto e põe a receita escolhida para fazer (o máximo que couber). */
export function factoryUse(fid) {
  const f = FACTORIES[fid];
  const st = S().fac[fid];
  if (!core.built(fid)) return null;
  let collected = 0;
  const got = [];
  const readyN = Object.values(st.ready).reduce((s, n) => s + n, 0);
  const fits = core.canStore(readyN);
  if (readyN && !fits) core.fullWarn(false);
  for (const [id, n] of Object.entries(fits ? st.ready : {})) {
    if (!n) continue;
    H.addItem(id, n);
    H.gainXp(GOODS[id].xp * n);
    S().stats['made_' + id] = (S().stats['made_' + id] || 0) + n;
    collected += n;
    got.push(`${n} ${icon(id)}`);
  }
  if (fits) st.ready = {};
  if (collected) {
    S().stats.goods = (S().stats.goods || 0) + collected;
    H.emit('goods', fid);
  }
  // Se a receita escolhida não dá, usa a primeira que der
  let r = recipeOf(fid, st.sel);
  if (canMake(fid, r.id) < 1) {
    const alt = f.recipes.find((x) => canMake(fid, x.id) > 0);
    if (alt) { r = alt; st.sel = alt.id; }
  }
  const loaded = Math.min(canMake(fid, r.id), f.capacity - st.queue.length);
  for (let k = 0; k < loaded; k++) {
    for (const [id, q] of Object.entries(r.in)) take(id, q);
    st.queue.push(r.id);
  }
  if (collected || loaded > 0) {
    const parts = [];
    if (collected) parts.push(`coletou ${got.join(' + ')}`);
    if (loaded > 0) parts.push(`começou ${loaded} ${icon(r.out)}`);
    H.toast(`${f.icon} ${f.name}: ${parts.join(' e ')}.`, 'good');
    H.sfx(collected ? 'harvest' : 'open');
    H.dirty('panel');
  } else if (st.queue.length >= f.capacity) {
    H.toast(`${f.icon} ${bw(f, 'O', 'A')} ${f.name.toLowerCase()} está ${bw(f, 'cheio', 'cheia')} (${f.capacity} na fila).`);
  } else {
    H.toast(`${f.icon} Falta material: ${f.recipes.map((x) => `${ioText(x.in)} → ${icon(x.out)}`).join(' · ')}.`, 'bad');
    H.sfx('error');
  }
  return { collected, loaded: Math.max(0, loaded) };
}

export function factoryLabel(fid) {
  const f = FACTORIES[fid];
  const st = S().fac[fid];
  const ready = Object.values(st.ready).reduce((s, n) => s + n, 0);
  let r = recipeOf(fid, st.sel);
  if (canMake(fid, r.id) < 1) r = f.recipes.find((x) => canMake(fid, x.id) > 0) || r;
  const can = Math.min(canMake(fid, r.id), f.capacity - st.queue.length);
  const parts = [];
  if (ready) parts.push(`Coletar ${ready} ${Object.keys(st.ready).filter((k) => st.ready[k]).map(icon).join('')}`);
  if (can > 0) parts.push(`fazer ${can} ${icon(r.out)}`);
  if (!parts.length) return null;
  const txt = parts.join(' e ');
  return txt[0].toUpperCase() + txt.slice(1);
}

export function factoryInfo(fid) {
  const f = FACTORIES[fid];
  const st = S().fac[fid];
  const r = recipeOf(fid, st.sel);
  const cur = st.queue.length ? recipeOf(fid, st.queue[0]) : null;
  const next = cur ? ` · próximo ${icon(cur.out)} em ${core.fmtDuration(Math.ceil(cur.time - st.t))}` : '';
  const ready = Object.entries(st.ready).filter(([, n]) => n).map(([id, n]) => `${n} ${icon(id)}`).join(' ');
  return `${f.icon} ${f.name}: ${st.queue.length} na fila${ready ? ` · prontos: ${ready}` : ''}${next}. Receita: ${ioText(r.in)} → ${icon(r.out)}${f.recipes.length > 1 ? ' (troque na Oficina 🪚)' : ''}.`;
}

/** Algo trabalhando agora (para fumaça, pás girando...). */
export const factoryBusy = (fid) => core.built(fid) && S().fac[fid].queue.length > 0;

function updateFactories(dt) {
  for (const [fid, f] of Object.entries(FACTORIES)) {
    const st = S().fac[fid];
    if (!st.queue.length || !core.built(fid)) continue;
    st.t += dt;
    while (st.queue.length) {
      const r = recipeOf(fid, st.queue[0]);
      if (st.t < r.time) break;
      st.t -= r.time;
      st.queue.shift();
      st.ready[r.out] = (st.ready[r.out] || 0) + 1;
    }
    if (!st.queue.length) st.t = 0;
  }
}

// ================= Pomar =================
export const treeAt = (k) => S().orchard[k];

export function buyTree(type) {
  const t = FRUIT_TREES[type];
  if (!t || t.level > S().level) return;
  const k = S().orchard.findIndex((o) => !o.type);
  if (k < 0) { H.toast('🌳 O pomar está cheio: são 6 covas.', 'bad'); H.sfx('error'); return; }
  if (!H.spend(t.cost)) return;
  Object.assign(S().orchard[k], { type, g: 0, t: 0, fruit: 0 });
  H.toast(`🌱 Muda de ${t.name.toLowerCase()} plantada no pomar (ao norte do Campo de Trigo). Ela cresce em ~${Math.round(ORCHARD.grow / 180)} dias.`, 'good');
  H.sfx('plant');
  H.emit('tree', type);
  H.dirty('panel');
}

export const treeGrown = (o) => o.type && o.g >= ORCHARD.grow;

export function harvestTree(k) {
  const o = S().orchard[k];
  if (!o || !o.type || !o.fruit) return 0;
  if (!core.canStore(o.fruit)) { core.fullWarn(false); return 0; }
  const t = FRUIT_TREES[o.type];
  const n = o.fruit;
  H.addItem(t.fruit, n);
  H.gainXp(GOODS[t.fruit].xp * n);
  S().stats.fruits = (S().stats.fruits || 0) + n;
  o.fruit = 0;
  H.sfx('harvest');
  H.emit('fruit', t.fruit);
  H.dirty('panel');
  return n;
}

export function treeLabel(k) {
  const o = S().orchard[k];
  if (!o.type) return 'Plantar uma muda';
  if (o.fruit) return `Colher ${o.fruit} ${FRUIT_TREES[o.type].icon}`;
  return null;
}

const hiveBoost = () => (S().hives.n > 0 ? 1 + HIVES.boost : 1);

export function treeInfo(k) {
  const o = S().orchard[k];
  if (!o.type) return `🕳️ Cova vazia do pomar: compre uma muda na loja (seção Pomar).`;
  const t = FRUIT_TREES[o.type];
  if (!treeGrown(o)) return `🌱 Muda de ${t.name.toLowerCase()}: cresce em ${core.fmtDuration(ORCHARD.grow - o.g)}.`;
  const next = o.fruit >= ORCHARD.stock ? 'cheia' : `próxima fruta em ${core.fmtDuration((t.every - o.t) / hiveBoost())}`;
  return `🌳 ${t.name}: ${o.fruit}/${ORCHARD.stock} ${t.icon} · ${next}${S().hives.n ? ' · 🐝 abelhas ajudando' : ''}.`;
}

function updateOrchard(dt) {
  const boost = hiveBoost();
  const seasonMult = typeof seasonFruit === 'function' ? seasonFruit() : 1;
  for (const o of S().orchard) {
    if (!o.type) continue;
    if (o.g < ORCHARD.grow) { o.g = Math.min(ORCHARD.grow, o.g + dt); continue; }
    if (o.fruit >= ORCHARD.stock) continue;
    o.t += dt * boost * seasonMult;
    const every = FRUIT_TREES[o.type].every;
    while (o.t >= every && o.fruit < ORCHARD.stock) { o.t -= every; o.fruit++; }
  }
}

// ================= Colmeias =================
export function buyHive() {
  const hv = S().hives;
  if (HIVES.level > S().level) return;
  if (hv.n >= HIVES.max) { H.toast(`🐝 Já são ${HIVES.max} colmeias.`, 'bad'); return; }
  if (!H.spend(HIVES.cost)) return;
  hv.n++;
  H.toast(`🐝 Colmeia nova ao lado do pomar! As abelhas fazem 🍯 mel e deixam as frutas ${Math.round(HIVES.boost * 100)}% mais rápidas.`, 'good');
  H.sfx('level');
  H.emit('hive');
  H.dirty('panel');
}

export function collectHoney() {
  const hv = S().hives;
  if (!hv.honey) return 0;
  if (!core.canStore(hv.honey)) { core.fullWarn(false); return 0; }
  const n = hv.honey;
  H.addItem('mel', n);
  H.gainXp(GOODS.mel.xp * n);
  S().stats.honey = (S().stats.honey || 0) + n;
  hv.honey = 0;
  H.sfx('harvest');
  H.dirty('panel');
  return n;
}

export const hiveLabel = () => (S().hives.honey ? `Coletar ${S().hives.honey} 🍯` : null);
export function hiveInfo() {
  const hv = S().hives;
  if (!hv.n) return `🐝 Lugar das colmeias: compre na loja (seção Pomar) para ter 🍯 mel e frutas mais rápidas.`;
  const cap = hv.n * HIVES.stock;
  const next = hv.honey >= cap ? 'cheias' : `próximo mel em ${core.fmtDuration((HIVES.every - hv.t) / hv.n)}`;
  return `🐝 ${hv.n} colmeia${hv.n > 1 ? 's' : ''}: ${hv.honey}/${cap} 🍯 · ${next}.`;
}

function updateHives(dt) {
  const hv = S().hives;
  if (!hv.n) return;
  const cap = hv.n * HIVES.stock;
  if (hv.honey >= cap) return;
  hv.t += dt * hv.n;
  while (hv.t >= HIVES.every && hv.honey < cap) { hv.t -= HIVES.every; hv.honey++; }
}

// Multiplicador de frutas pela estação (definido no módulo de estações, se existir)
let seasonFruit = null;
export function setSeasonFruit(fn) { seasonFruit = fn; }

// ================= Estações do ano =================
const seasonIndex = (day) => Math.floor((day - 1) / SEASON_DAYS) % SEASONS.length;
export const season = () => SEASONS[seasonIndex(core.dayOf(S().time))];
export const seasonDay = () => ((core.dayOf(S().time) - 1) % SEASON_DAYS) + 1;
/** Cultura da estação? */
export const inSeason = (crop) => season().crops.includes(crop);
/** Multiplicador de crescimento de uma cultura agora. */
export const cropSeasonMult = (crop) => (inSeason(crop) ? SEASON_BONUS : season().growOff);
/** Estações em que a cultura cresce mais rápido (ícones). */
export const cropSeasons = (crop) => SEASONS.filter((x) => x.crops.includes(crop)).map((x) => x.icon).join('');

core.setGrowMod((crop) => cropSeasonMult(crop));
core.setWeatherMod((id) => season().weather[id] ?? 1);
setSeasonFruit(() => season().fruit);
core.onNewDay((day, quiet) => {
  if ((day - 1) % SEASON_DAYS !== 0) return;
  const s = SEASONS[seasonIndex(day)];
  const fast = s.crops.map((c) => CROPS[c].icon).join(' ');
  H.notify(`${s.icon} Começou ${s.id === 'verao' || s.id === 'outono' || s.id === 'inverno' ? 'o' : 'a'} ${s.name.toLowerCase()}! Crescem mais rápido: ${fast}. ${s.desc}`, 'level', quiet);
  H.emit('season', s.id);
});

// ================= Amizade com a vila =================
export const friendPts = (who) => S().friends[who] || 0;
export const hearts = (who) => Math.min(FRIEND.hearts, Math.floor(friendPts(who) / FRIEND.perHeart));
const GIFTS = [
  () => ({ fertilizante: 3 }), () => ({ mel: 2 }), () => ({ madeira: 10, viga: 2 }), () => ({ ovo: 6 }), () => ({ queijo: 1 }), () => ({ farinha: 6 }),
];
function addFriend(who, pts, quiet) {
  if (!who) return;
  const before = hearts(who);
  S().friends[who] = friendPts(who) + pts;
  const after = hearts(who);
  if (after > before) {
    // Presente a cada coração novo
    const gift = GIFTS[(after + who.length) % GIFTS.length]();
    for (const [id, q] of Object.entries(gift)) H.addItem(id, q);
    const coins = 150 * after;
    H.earn(coins);
    H.notify(`💌 A amizade com ${who} subiu para ${'❤️'.repeat(after)} e chegou um presente: ${Object.entries(gift).map(([id, q]) => `${q} ${icon(id)}`).join(' + ')} e 🪙${fmt(coins)}!`, 'level', quiet);
    H.sfx('level');
    H.emit('friend', who);
  }
  H.dirty('panel');
}
core.setOrderBonus((who) => 1 + hearts(who) * FRIEND.orderBonus);

// ================= Encomendas especiais =================
function newQuest() {
  const pool = core.orderPool().filter((id) => core.ITEMS[id]);
  const pick = [];
  while (pick.length < Math.min(3, pool.length)) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (!pick.includes(id)) pick.push(id);
  }
  const lv = S().level;
  const req = pick.map((id) => ({ id, qty: Math.max(2, Math.round((120 + lv * 45) / core.ITEMS[id].sell)), got: 0 }))
    .map((r) => ({ ...r, qty: Math.min(r.qty, 25) }));
  const value = req.reduce((s, r) => s + core.ITEMS[r.id].sell * r.qty, 0);
  const xp = req.reduce((s, r) => s + core.ITEMS[r.id].xp * r.qty, 0);
  const who = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const bonus = GIFTS[Math.floor(Math.random() * GIFTS.length)]();
  S().quest = { who, req, coins: Math.round(value * QUEST.mult), xp: Math.round(xp * 2.5) + 20, bonus, t: QUEST.due };
  H.emit('quest');
  H.dirty('panel');
}

export const quest = () => S().quest;
/** Entrega o que você tiver para a encomenda (dá para entregar aos poucos). */
export function questDeliver() {
  const q = S().quest;
  if (!q) return;
  let given = 0;
  for (const r of q.req) {
    const n = Math.min(r.qty - r.got, S().inv[r.id] || 0);
    if (n > 0) { S().inv[r.id] -= n; r.got += n; given += n; }
  }
  if (!given) { H.toast('📜 Você não tem nada do que a encomenda pede ainda.', 'bad'); H.sfx('error'); return; }
  if (q.req.every((r) => r.got >= r.qty)) {
    H.earn(q.coins);
    H.gainXp(q.xp);
    for (const [id, n] of Object.entries(q.bonus)) H.addItem(id, n);
    S().stats.quests = (S().stats.quests || 0) + 1;
    H.toast(`📜 Encomenda especial entregue para ${q.who}! +🪙${fmt(q.coins)} · +${q.xp} XP · bônus ${Object.entries(q.bonus).map(([id, n]) => `${n} ${icon(id)}`).join(' + ')}`, 'level');
    H.sfx('level');
    addFriend(q.who, 5, false);
    S().quest = null;
    S().questT = QUEST.cooldown;
    H.emit('questdone');
  } else {
    H.toast(`📜 Entregou ${given} itens para a encomenda de ${q.who}.`, 'good');
    H.sfx('coin');
  }
  H.dirty('panel');
}

function updateQuest(dt, quiet) {
  const q = S().quest;
  if (q) {
    q.t -= dt;
    if (q.t <= 0) {
      H.notify(`📜 A encomenda especial de ${q.who} venceu. Uma nova chega logo.`, 'bad', quiet);
      S().friends[q.who] = Math.max(0, friendPts(q.who) - 2);
      S().quest = null;
      S().questT = QUEST.cooldown;
      H.dirty('panel');
    }
  } else if (S().level >= 2) {
    S().questT -= dt;
    if (S().questT <= 0) newQuest();
  }
}

// ================= Feira do fim da estação =================
const FAIR_CAT = (key) => {
  const base = core.parseKey(key).base;
  if (CROPS[base]) return 'lavoura';
  if (PRODUCTS[base] || base === 'queijo') return 'animais';
  if (GOODS[base]) return 'cozinha';
  return null;
};
/** A feira acontece no último dia de cada estação. */
export const fairToday = () => seasonDay() === SEASON_DAYS;
const fairId = () => Math.floor((core.dayOf(S().time) - 1) / SEASON_DAYS) + 1;
export const daysToFair = () => SEASON_DAYS - seasonDay();

function ensureFair() {
  const f = S().fair;
  if (f.id === fairId()) return f;
  // Concorrentes de cada categoria: ficam mais fortes com o seu nível
  const lv = S().level;
  const rivals = {};
  for (const cat of Object.keys(FAIR.cats)) {
    const base = { lavoura: 30 + lv * 25, animais: 90 + lv * 40, cozinha: 120 + lv * 60 }[cat];
    rivals[cat] = [0, 1, 2].map(() => Math.round(base * (0.6 + Math.random() * 1.4)));
  }
  Object.assign(f, { id: fairId(), done: {}, rivals });
  return f;
}

/** O melhor item do celeiro para a categoria (o mais valioso). */
export function fairBest(cat) {
  const inv = S().inv;
  return Object.keys(inv).filter((k) => (inv[k] || 0) > 0 && FAIR_CAT(k) === cat).sort((a, b) => core.price(b) - core.price(a))[0] || null;
}
export const fairState = () => ensureFair();

export function fairEnter(cat) {
  if (!fairToday()) return;
  const f = ensureFair();
  if (f.done[cat]) return;
  const key = fairBest(cat);
  if (!key) { H.toast(`🎪 Você não tem nada de ${FAIR.cats[cat].name.toLowerCase()} para inscrever.`, 'bad'); H.sfx('error'); return; }
  S().inv[key]--;
  const score = Math.round(core.price(key) * (0.9 + Math.random() * 0.3));
  const place = 1 + f.rivals[cat].filter((x) => x > score).length;
  const prize = FAIR.prizes[place - 1];
  const coins = prize ? Math.round(prize * S().level * 300) : 50;
  H.earn(coins);
  H.gainXp(prize ? 20 * (4 - place) : 5);
  f.done[cat] = { place, key, score };
  if (place <= 3) S().stats.medals = (S().stats.medals || 0) + 1;
  if (place === 1) S().stats.golds = (S().stats.golds || 0) + 1;
  const medal = ['🥇', '🥈', '🥉'][place - 1] || '🎗️';
  H.toast(`🎪 Feira – ${FAIR.cats[cat].name}: seu ${core.itemInfo(key).icon} ${core.itemInfo(key).name} fez ${score} pontos. ${medal} ${place}º lugar! +🪙${fmt(coins)}`, place <= 3 ? 'level' : 'good');
  H.sfx(place <= 3 ? 'level' : 'coin');
  H.emit('fair', place);
  H.dirty('panel');
}

core.onEvent((name, data) => {
  if (name === 'order') addFriend(data, 1, false);
});
core.onNewDay((day, quiet) => {
  if (((day - 1) % SEASON_DAYS) + 1 === SEASON_DAYS) H.notify('🎪 Hoje é dia de feira! Inscreva seus melhores produtos no painel de Pedidos e dispute medalhas.', 'level', quiet);
});

// ================= Conquistas =================
const st = (k) => S().stats[k] || 0;
/** goal: meta; cur(): progresso atual; reward: moedas. */
export const ACHIEVEMENTS = [
  { id: 'colheita100',  icon: '🧺', name: 'Mão na terra',         desc: 'Colha 100 vezes',                         goal: 100,    cur: () => st('harvest'), reward: 300 },
  { id: 'colheita1000', icon: '🌾', name: 'Celeiro cheio',        desc: 'Colha 1.000 vezes',                       goal: 1000,   cur: () => st('harvest'), reward: 3000 },
  { id: 'pedidos50',    icon: '📦', name: 'Amigo da vila',        desc: 'Entregue 50 pedidos',                     goal: 50,     cur: () => st('orders'), reward: 2000 },
  { id: 'encomendas',   icon: '📜', name: 'Encomendas em dia',    desc: 'Entregue 5 encomendas especiais',         goal: 5,      cur: () => st('quests'), reward: 2500 },
  { id: 'moedas',       icon: '💰', name: 'Fazendeiro de sucesso', desc: 'Ganhe 100.000 moedas',                   goal: 100000, cur: () => st('earned'), reward: 5000 },
  { id: 'nivel8',       icon: '⭐', name: 'Mestre da fazenda',    desc: 'Chegue ao nível 8',                       goal: 8,      cur: () => S().level, reward: 3000 },
  { id: 'mutadas',      icon: '🌈', name: 'Clima a favor',        desc: 'Colha 25 plantas mutadas',                goal: 25,     cur: () => st('mutated'), reward: 1500 },
  { id: 'gigante',      icon: '💪', name: 'Planta gigante',       desc: 'Colha uma planta gigante',                goal: 1,      cur: () => st('giants'), reward: 500 },
  { id: 'peixes',       icon: '🎣', name: 'Pescador',             desc: 'Pesque 50 vezes',                         goal: 50,     cur: () => st('fish'), reward: 1000 },
  { id: 'carpa',        icon: '🎏', name: 'Peixe de ouro',        desc: 'Pesque uma carpa dourada',                goal: 1,      cur: () => st('rareFish'), reward: 800 },
  { id: 'lenhador',     icon: '🪓', name: 'Lenhador',             desc: 'Junte 200 troncos',                       goal: 200,    cur: () => st('logs'), reward: 1200 },
  { id: 'construtor',   icon: '🏗️', name: 'Construtor',           desc: 'Termine todas as obras',                  goal: Object.keys(BUILDINGS).length, cur: () => Object.keys(BUILDINGS).filter((id) => core.built(id)).length, reward: 5000 },
  { id: 'filhote',      icon: '🐣', name: 'A família cresceu',    desc: 'Tenha um filhote',                        goal: 1,      cur: () => st('births'), reward: 500 },
  { id: 'filhotes',     icon: '🐮', name: 'Criador',              desc: 'Tenha 10 filhotes',                       goal: 10,     cur: () => st('births'), reward: 3000 },
  { id: 'gado',         icon: '🌿', name: 'Rei do gado',          desc: `Encha o pasto (${PASTURE.slots} cabeças)`, goal: PASTURE.slots, cur: () => core.pastureCount(), reward: 4000 },
  { id: 'queijos',      icon: '🧀', name: 'Queijeiro',            desc: 'Faça 50 queijos',                         goal: 50,     cur: () => st('cheese'), reward: 2000 },
  { id: 'bolos',        icon: '🎂', name: 'Confeiteiro',          desc: 'Faça 10 bolos',                           goal: 10,     cur: () => st('made_bolo'), reward: 1500 },
  { id: 'roupas',       icon: '👕', name: 'Estilista',            desc: 'Costure 5 roupas',                        goal: 5,      cur: () => st('made_roupa'), reward: 1500 },
  { id: 'mel',          icon: '🍯', name: 'Apicultor',            desc: 'Colete 30 potes de mel',                  goal: 30,     cur: () => st('honey'), reward: 1200 },
  { id: 'frutas',       icon: '🍎', name: 'Pomar farto',          desc: 'Colha 100 frutas',                        goal: 100,    cur: () => st('fruits'), reward: 1500 },
  { id: 'ouro',         icon: '🥇', name: 'Campeão da feira',     desc: 'Ganhe uma medalha de ouro na feira',      goal: 1,      cur: () => st('golds'), reward: 2000 },
  { id: 'amigo',        icon: '❤️', name: 'Melhor amigo',         desc: 'Chegue a 5 corações com um morador',      goal: 5,      cur: () => Math.max(0, ...CUSTOMERS.map((w) => hearts(w))), reward: 3000 },
  { id: 'cavaleiro',    icon: '🏇', name: 'Cavaleiro',            desc: 'Tenha um cavalo com sela',                goal: 1,      cur: () => (S().horse.saddle ? 1 : 0), reward: 500 },
  { id: 'decoracao',    icon: '🌻', name: 'Fazenda bonita',       desc: 'Coloque 10 decorações',                   goal: 10,     cur: () => (S().decor || []).length, reward: 1500 },
];
export const achDone = (id) => !!S().ach[id];
let achT = 0;
function checkAchievements(dt, quiet) {
  achT -= dt;
  if (achT > 0) return;
  achT = 1;
  for (const a of ACHIEVEMENTS) {
    if (S().ach[a.id] || a.cur() < a.goal) continue;
    S().ach[a.id] = Date.now();
    H.earn(a.reward);
    H.notify(`🏆 Conquista desbloqueada: ${a.icon} ${a.name}! +🪙${fmt(a.reward)}`, 'level', quiet);
    if (!quiet) H.sfx('level');
    H.emit('achievement', a.id);
    H.dirty('panel');
  }
}

// ================= Decoração =================
export const decorList = () => S().decor;
export const decorInv = (id) => S().decorInv[id] || 0;

/** Compra uma decoração: ela vai para a sua mão para ser colocada. */
export function buyDecor(id) {
  const dd = DECOR[id];
  if (!dd || dd.level > S().level) return false;
  if (!H.spend(dd.cost)) return false;
  S().decorInv[id] = decorInv(id) + 1;
  H.sfx('coin');
  H.dirty('panel');
  return true;
}

export function placeDecor(id, x, z, r) {
  if (decorInv(id) < 1) return false;
  S().decorInv[id]--;
  S().decor.push({ id, x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(3) });
  S().stats.decor = (S().stats.decor || 0) + 1;
  H.sfx('plant');
  H.emit('decor', id);
  H.dirty('panel');
  return true;
}

/** Tira uma decoração do lugar (volta para o inventário, para colocar de novo). */
export function pickupDecor(k) {
  const it = S().decor[k];
  if (!it) return null;
  if (it.id === 'bau' && core.stored() > core.capacity() - 100) {
    H.toast('🧰 Esvazie um pouco o celeiro antes de mover este baú.', 'bad');
    H.sfx('error');
    return null;
  }
  S().decor.splice(k, 1);
  S().decorInv[it.id] = decorInv(it.id) + 1;
  H.dirty('panel');
  return it.id;
}

// ================= O faro do pet =================
function petFind(quiet) {
  if (!S().pet.owned) return;
  const total = PET_FINDS.reduce((s, f) => s + f.w, 0);
  let roll = Math.random() * total;
  const f = PET_FINDS.find((x) => (roll -= x.w) <= 0) || PET_FINDS[0];
  let what;
  if (f.coins) { H.earn(f.coins); what = `🪙${f.coins} enterradas`; }
  else if (f.seeds) { S().seeds[f.seeds] = (S().seeds[f.seeds] || 0) + f.q; what = `${f.q} sementes de ${CROPS[f.seeds].name.toLowerCase()}`; H.dirty('toolbar'); }
  else { H.addItem(f.id, f.q); what = `${f.q} ${icon(f.id)} ${nameOf(f.id)}`; }
  S().stats.petFinds = (S().stats.petFinds || 0) + 1;
  H.notify(`🐶 ${S().pet.name} cavou no quintal e achou ${what}!`, 'good', quiet);
  H.dirty('panel');
}
core.onNewDay((day, quiet) => petFind(quiet));

// ================= Ligação com o jogo =================
core.onUpdate((dt, quiet) => {
  checkAchievements(dt, quiet);
  updateQuest(dt, quiet);
  updateFactories(dt);
  updateOrchard(dt);
  updateHives(dt);
});
