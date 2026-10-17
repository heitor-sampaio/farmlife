/* FarmLife — interface em HTML sobre a cena 3D (HUD, hotbar, painel, avisos) */
import { CROPS, ANIMALS, PRODUCTS, UPGRADES, WORKERS, FIELDS, BIG_FIELD, BIG_CELLS, MACHINES, FISH, RODS, PET, MUTATIONS, RARITY_COLOR, WEATHER_EVENTS, AXES, LOG, WOOD, SAWMILL, PLANK, RECIPES, BUILDINGS, CARPENTRY, HORSE, SADDLE, PASTURE, CHEESERY, CHEESE, FACTORIES, ORCHARD, FRUIT_TREES, HIVES, GOODS, FAIR, FRIEND, CUSTOMERS, DECOR, STORAGE, COOP } from './data.js';
import * as sys from './systems.js';
import * as core from './core.js';
import { joySide, setJoySide } from './prefs.js';
import { sfx, settings as audioSettings, setVolume, setMuted, unlockAudio } from './audio.js';

const $ = (sel) => document.querySelector(sel);
const setText = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };

const el = {};
const dirty = new Set();
let currentTab = 'loja';
let hudTimer = 0;
let lastCoins = null;
let handlers = {};

export const markDirty = (...parts) => parts.forEach((p) => dirty.add(p));
export const isPanelOpen = () => el.panel.classList.contains('open');
export const isModalOpen = () => !el.modal.hidden;
/** Verdadeiro quando o teclado deve ir para a interface, e não para o personagem. */
export const uiBlocking = () => isModalOpen() || !document.getElementById('char').hidden || !document.getElementById('map').hidden;

// ================= Efeitos e avisos =================
export function fxAt(x, y, text, cls = '') {
  const d = document.createElement('div');
  d.className = 'fx ' + cls;
  d.textContent = text;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  el.fx.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

export function toast(msg, type = '') {
  while (el.toasts.children.length >= 4) el.toasts.firstChild.remove();
  const d = document.createElement('div');
  d.className = 'toast ' + type;
  d.textContent = msg;
  el.toasts.appendChild(d);
  setTimeout(() => {
    d.classList.add('out');
    setTimeout(() => d.remove(), 300);
  }, type === 'level' ? 4200 : 2800);
}

export function setStatus(text) { setText(el.status, text); }

// ================= Minigame de pesca =================
export function fishGameShow(icon) {
  const g = $('#fishgame');
  $('#fish-icon').textContent = icon;
  g.hidden = false;
}

export function fishGameHide() { $('#fishgame').hidden = true; }

/** fish, zone e size vão de 0 (embaixo) a 1 (em cima); progress de 0 a 1. */
export function fishGameUpdate(fish, zone, size, progress, inside) {
  $('#fish-icon').style.bottom = `calc(${fish * 100}% - 14px)`;
  const z = $('#fish-zone');
  z.style.bottom = zone * 100 + '%';
  z.style.height = size * 100 + '%';
  z.classList.toggle('on', inside);
  const p = $('#fish-progress');
  p.style.height = Math.max(0, Math.min(1, progress)) * 100 + '%';
  p.style.background = progress < 0.25 ? '#d9534f' : progress < 0.6 ? '#f5b82e' : '#5cb85c';
}

/** Escurece a tela por um instante (ao dormir). */
export function sleepFade() {
  el.fade.classList.remove('on');
  void el.fade.offsetWidth; // reinicia a animação
  el.fade.classList.add('on');
}

export function setPrompt(html) {
  if (el.prompt._html === html) return;
  el.prompt._html = html;
  el.prompt.innerHTML = html;
  el.prompt.hidden = !html;
}

// ================= Painel lateral =================
/** Abre o painel numa aba; anchor rola até uma seção (ex.: "campos"). */
export function openPanel(tab, anchor) {
  if (handlers.onPanel) handlers.onPanel(tab);
  currentTab = tab;
  if (anchor && SUBTABS[tab] && SUBTABS[tab].some((c) => c[0] === anchor)) subCur[tab] = anchor;
  else if (tab === 'loja' && ANCHOR_CAT[anchor]) subCur.loja = ANCHOR_CAT[anchor];
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('[data-open]').forEach((b) => b.classList.toggle('active', b.dataset.open === tab));
  el.panel.classList.add('open');
  renderPanel();
  el.tabContent.scrollTop = 0;
  const sec = anchor && document.getElementById('sec-' + anchor);
  if (sec) el.tabContent.scrollTop = sec.offsetTop - el.tabContent.offsetTop - 8;
}

export function closePanel() {
  el.panel.classList.remove('open');
  document.querySelectorAll('[data-open]').forEach((b) => b.classList.remove('active'));
}

function togglePanel(tab) {
  if (isPanelOpen() && currentTab === tab) closePanel();
  else { openPanel(tab); sfx('open'); }
}

// ================= Categorias dos painéis =================
const SUBTABS = {
  loja: [['sementes', '🌱', 'Sementes'], ['animais', '🐾', 'Animais'], ['terras', '🗺️', 'Terras'], ['producao', '🏭', 'Produção'], ['ferramentas', '🪓', 'Ferramentas'], ['melhorias', '🛠️', 'Melhorias'], ['decor', '🌻', 'Decoração']],
  celeiro: [['itens', '📦', 'Itens'], ['mercado', '📈', 'Mercado'], ['numeros', '📊', 'Números']],
  oficina: [['carpintaria', '🪚', 'Carpintaria'], ['obras', '🏗️', 'Obras'], ['fabricas', '🏭', 'Fábricas']],
  pedidos: [['pedidos', '📦', 'Pedidos'], ['feira', '🎪', 'Feira'], ['moradores', '❤️', 'Moradores']],
};
const subCur = { loja: 'sementes', celeiro: 'itens', oficina: 'carpintaria', pedidos: 'pedidos' };
// Seções antigas da Loja (atalhos do jogo) → categoria
const ANCHOR_CAT = { campos: 'terras', maquinas: 'terras', pesca: 'ferramentas', lenha: 'ferramentas', pet: 'animais', cavalo: 'animais', queijaria: 'producao', pomar: 'producao', decor: 'decor' };

/** Barra de categorias (bolinha = algo pedindo atenção). */
function subBar(tab, dots = {}) {
  return `<div class="subtabs">${SUBTABS[tab].map(([id, icon, name]) => `<button class="subtab${subCur[tab] === id ? ' active' : ''}" data-act="sub" data-id="${tab}:${id}">${icon} ${name}${dots[id] ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>`;
}

function renderPanel() {
  const S = core.S;
  const scroll = el.tabContent.scrollTop;
  const tab = currentTab;
  const parts = tab === 'loja' ? shopHtml() : tab === 'celeiro' ? barnHtml() : tab === 'oficina' ? workshopHtml() : ordersHtml();
  const dots = tab === 'pedidos' ? { pedidos: S.orders.some(core.canFulfill), feira: sys.fairToday() } : {};
  el.tabContent.innerHTML = subBar(tab, dots) + (parts[subCur[tab]] || '');
  el.tabContent.scrollTop = scroll;
  if (currentTab === 'pedidos' && isPanelOpen()) core.markOrdersSeen();

  const ok = S.orders.filter(core.canFulfill).length;
  el.badge.hidden = !ok;
  setText(el.badge, ok);
}

function shopHtml() {
  const S = core.S;
  const fmt = core.fmt;
  // Cada categoria junta pedaços de HTML; ord = posição dentro da categoria
  const parts = {};
  let h = '', cur = 'sementes', ord = 1;
  const sec = (cat, o) => { (parts[cur] = parts[cur] || []).push([ord, h]); h = ''; cur = cat; ord = o; };

  const byLevel = (a, b) => CROPS[a].level - CROPS[b].level || CROPS[a].seed - CROPS[b].seed;
  const open = Object.keys(CROPS).filter((id) => CROPS[id].level <= S.level).sort(byLevel);
  const soon = Object.keys(CROPS).filter((id) => CROPS[id].level > S.level).sort(byLevel);
  const sz = sys.season();
  h += `<h3>🌱 Sementes <small>${sz.icon} = da estação (+30%)</small></h3><div class="tiles">`;
  for (const id of open) {
    const c = CROPS[id];
    const hot = sys.inSeason(id);
    h += `<div class="tile${hot ? ' hot' : ''}" title="Melhor em: ${sys.cropSeasons(id) || '—'}">
      <div class="tile-top"><span class="tico">${c.icon}</span><b>${c.name}</b>${hot ? `<span class="tag">${sz.icon}</span>` : ''}</div>
      <small>⏱ ${core.fmtDuration(c.time)} · vende 🪙${c.sell}${c.regrow ? ' · 🔁' : ''}</small>
      <small>Você tem ${S.seeds[id] || 0}</small>
      <div class="btns"><button class="btn" data-act="seed" data-id="${id}" data-q="1" ${S.coins < c.seed ? 'disabled' : ''}>🪙${c.seed}</button>
        <button class="btn alt" data-act="seed" data-id="${id}" data-q="5" ${S.coins < c.seed * 5 ? 'disabled' : ''} title="Comprar 5 por 🪙${c.seed * 5}">×5</button>${id === 'trigo' ? `<button class="btn alt" data-act="seed" data-id="trigo" data-q="50" ${S.coins < c.seed * 50 ? 'disabled' : ''} title="Saco com 50 sementes por 🪙${c.seed * 50}">×50</button>` : ''}</div>
    </div>`;
  }
  h += '</div>';
  if (soon.length) h += `<div class="soon"><b>🔒 Em breve</b>${soon.map((id) => `<span class="chip">${CROPS[id].icon} ${CROPS[id].name} · nv ${CROPS[id].level}</span>`).join('')}</div>`;
  h += '<p class="hint">🔁 = rebrota depois de colhida (não precisa plantar de novo).</p>';

  sec('terras', 1);
  h += '<h3 id="sec-campos">🗺️ Campos</h3><div class="cards">';
  for (const f of FIELDS) {
    if (!f.cost) continue;
    const owned = core.fieldOwned(f.id);
    const locked = !owned && f.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${f.icon}</div>
      <div class="info"><b>${f.name}${owned ? ' <small>✔ seu</small>' : ''}</b>
        <small>${f.count} lotes novos (${f.cols}×${f.rows}), já limpos para arar. Você escolhe onde ele fica.</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprado</span>'
        : locked
          ? `<span class="req">🔒 Nível ${f.level}</span>`
          : `<button class="btn alt" data-act="placelot" data-id="${f.id}" title="Escolher o lugar e comprar" ${S.coins < f.cost ? 'disabled' : ''}>📍 🪙${fmt(f.cost)}</button>`}
      </div></div>`;
  }
  {
    const owned = S.pasture;
    const locked = !owned && PASTURE.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${PASTURE.icon}</div>
      <div class="info"><b>${PASTURE.name}${owned ? ` <small>✔ seu · ${core.pastureCount()}/${PASTURE.slots} cabeças</small>` : ''}</b>
        <small>Campo enorme só para o gado (você escolhe onde fica): ${PASTURE.slots} vagas para vacas, touros e bezerros, que comem capim e não precisam de 🌾 trigo. Libera o curral para os outros animais.</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprado</span>'
        : locked
          ? `<span class="req">🔒 Nível ${PASTURE.level}</span>`
          : !core.built('curral')
            ? '<span class="req">🏗️ Construa o curral</span>'
            : `<button class="btn alt" data-act="placelot" data-id="pasto" title="Escolher o lugar e comprar" ${S.coins < PASTURE.cost ? 'disabled' : ''}>📍 🪙${fmt(PASTURE.cost)}</button>`}
      </div></div>`;
  }
  h += '</div>';

  sec('ferramentas', 1);
  h += '<h3 id="sec-pesca">🎣 Pescaria</h3><div class="cards">';
  for (let lv = 1; lv < RODS.length; lv++) {
    const rd = RODS[lv];
    const owned = S.fishing.rod >= lv;
    const locked = !owned && rd.level > S.level;
    const needPrev = !owned && S.fishing.rod < lv - 1;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${rd.icon}</div>
      <div class="info"><b>${rd.name}${owned ? ' <small>✔ sua</small>' : ''}</b><small>${rd.desc}</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprada</span>'
        : locked
          ? `<span class="req">🔒 Nível ${rd.level}</span>`
          : needPrev
            ? '<span class="req">Compre a anterior</span>'
            : `<button class="btn alt" data-act="rod" data-id="${lv}" ${S.coins < rd.cost ? 'disabled' : ''}>🪙${fmt(rd.cost)}</button>`}
      </div></div>`;
  }
  h += `</div><p class="hint">Peixes do lago: ${Object.values(FISH).filter((f) => !f.junk).map((f) => `${f.icon} ${f.name}`).join(', ')}. À noite aparecem mais bagres; na chuva, lagostins.</p>`;

  h += '<h3 id="sec-lenha">🪓 Lenha</h3><div class="cards">';
  for (let lv = 1; lv < AXES.length; lv++) {
    const ax = AXES[lv];
    const owned = S.wood.axe >= lv;
    const locked = !owned && ax.level > S.level;
    const needPrev = !owned && S.wood.axe < lv - 1;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${ax.icon}</div>
      <div class="info"><b>${ax.name}${owned ? ' <small>✔ seu</small>' : ''}</b><small>${ax.desc}</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprado</span>'
        : locked
          ? `<span class="req">🔒 Nível ${ax.level}</span>`
          : needPrev
            ? '<span class="req">Compre o anterior</span>'
            : `<button class="btn alt" data-act="axe" data-id="${lv}" ${S.coins < ax.cost ? 'disabled' : ''}>🪙${fmt(ax.cost)}</button>`}
      </div></div>`;
  }
  {
    const owned = S.saw.owned;
    const locked = !owned && SAWMILL.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${SAWMILL.icon}</div>
      <div class="info"><b>${SAWMILL.name}${owned ? ' <small>✔ sua</small>' : ''}</b>
        <small>Transforma cada 🪵 tronco em ${SAWMILL.perLog} ${PLANK.icon} tábuas (🪙${PLANK.sell} cada), um a cada ${SAWMILL.time}s, até com o jogo fechado. Você escolhe onde ela fica.</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Construída</span>'
        : locked
          ? `<span class="req">🔒 Nível ${SAWMILL.level}</span>`
          : `<button class="btn alt" data-act="placelot" data-id="serraria" title="Escolher o lugar e comprar" ${S.coins < SAWMILL.cost ? 'disabled' : ''}>📍 🪙${fmt(SAWMILL.cost)}</button>`}
      </div></div>`;
  }
  h += `</div><p class="hint">🌲 O bosque fica no oeste da fazenda, no fim da rua principal. Cada árvore rende ${WOOD.logs[0]}–${WOOD.logs[1]} ${LOG.icon} troncos (🪙${LOG.sell} cada) e cresce de novo em ~${Math.round(WOOD.regrow / 60)} min.</p>`;

  sec('animais', 2);
  const pet = S.pet;
  const petLocked = !pet.owned && PET.level > S.level;
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  h += `<h3 id="sec-pet">🐶 Pet</h3><div class="cards">
    <div class="card${petLocked ? ' locked' : ''}${pet.owned ? ' hired' : ''}">
      <div class="ico">${PET.icon}</div>
      <div class="info"><b>${pet.owned ? esc(pet.name) + ' <small>✔ sua border collie</small>' : PET.breed}</b>
        <small>Uma cachorrinha esperta que segue você pela fazenda e adora correr atrás dos passarinhos. Faça carinho todo dia (+${PET.xp} XP).</small></div>
      <div class="btns">${pet.owned
        ? '<button class="btn ghost" data-act="petname">Renomear</button>'
        : petLocked
          ? `<span class="req">🔒 Nível ${PET.level}</span>`
          : `<button class="btn alt" data-act="pet" ${S.coins < PET.cost ? 'disabled' : ''}>🪙${fmt(PET.cost)}</button>`}
      </div></div></div>`;

  {
    const H = S.horse;
    const hLocked = !H.owned && HORSE.level > S.level;
    const sLocked = !H.saddle && SADDLE.level > S.level;
    h += `<h3 id="sec-cavalo">🐴 Cavalo</h3><div class="cards">
      <div class="card${hLocked ? ' locked' : ''}${H.owned ? ' hired' : ''}">
        <div class="ico">${HORSE.icon}</div>
        <div class="info"><b>${HORSE.name}${H.owned ? ' <small>✔ seu</small>' : ''}</b><small>${HORSE.desc}</small></div>
        <div class="btns">${H.owned
          ? '<span class="req">✔ Comprado</span>'
          : hLocked
            ? `<span class="req">🔒 Nível ${HORSE.level}</span>`
            : !core.built('curral')
              ? '<span class="req">🏗️ Construa o curral</span>'
              : `<button class="btn alt" data-act="horse" ${S.coins < HORSE.cost ? 'disabled' : ''}>🪙${fmt(HORSE.cost)}</button>`}
        </div></div>
      <div class="card${sLocked ? ' locked' : ''}${H.saddle ? ' hired' : ''}">
        <div class="ico">${SADDLE.icon}</div>
        <div class="info"><b>${SADDLE.name}${H.saddle ? ' <small>✔ no cavalo</small>' : ''}</b><small>${SADDLE.desc}</small></div>
        <div class="btns">${H.saddle
          ? '<span class="req">✔ Comprada</span>'
          : sLocked
            ? `<span class="req">🔒 Nível ${SADDLE.level}</span>`
            : !H.owned
              ? '<span class="req">Compre o cavalo</span>'
              : `<button class="btn alt" data-act="saddle" ${S.coins < SADDLE.cost ? 'disabled' : ''}>🪙${fmt(SADDLE.cost)}</button>`}
        </div></div></div>`;
  }

  sec('terras', 2);
  const big = S.big.owned;
  const bigLocked = !big && BIG_FIELD.level > S.level;
  h += `<h3 id="sec-maquinas">🚜 Lavoura mecanizada</h3><div class="cards">
    <div class="card${bigLocked ? ' locked' : ''}${big ? ' hired' : ''}">
      <div class="ico">${BIG_FIELD.icon}</div>
      <div class="info"><b>${BIG_FIELD.name}${big ? ' <small>✔ seu</small>' : ''}</b>
        <small>${BIG_FIELD.cols}×${BIG_FIELD.rows} = ${BIG_CELLS} lotes só de trigo (você escolhe onde fica). Cresce sem rega; trabalhe com as máquinas.</small></div>
      <div class="btns">${big
        ? '<span class="req">✔ Comprado</span>'
        : bigLocked
          ? `<span class="req">🔒 Nível ${BIG_FIELD.level}</span>`
          : `<button class="btn alt" data-act="placelot" data-id="trigo" title="Escolher o lugar e comprar" ${S.coins < BIG_FIELD.cost ? 'disabled' : ''}>📍 🪙${fmt(BIG_FIELD.cost)}</button>`}
      </div></div>`;
  for (const [id, m] of Object.entries(MACHINES)) {
    const owned = !!S.machines[id];
    const locked = !owned && m.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${m.icon}</div>
      <div class="info"><b>${m.name}${owned ? ' <small>✔ na fazenda</small>' : ''}</b>
        <small>${m.desc}</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprado</span>'
        : locked
          ? `<span class="req">🔒 Nível ${m.level}</span>`
          : !big
            ? '<span class="req">Compre o campo</span>'
            : !core.built('galpao')
              ? '<span class="req">🏗️ Construa o galpão</span>'
              : `<button class="btn alt" data-act="machine" data-id="${id}" ${S.coins < m.cost ? 'disabled' : ''}>🪙${fmt(m.cost)}</button>`}
      </div></div>`;
  }
  h += '</div>';

  sec('producao', 1);
  {
    const owned = core.built('queijaria');
    const locked = !owned && CHEESERY.level > S.level;
    const prog = Math.round(core.buildProgress('queijaria') * 100);
    h += `<h3 id="sec-queijaria">${CHEESERY.icon} Laticínios</h3><div class="cards">
      <div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
        <div class="ico">${CHEESERY.icon}</div>
        <div class="info"><b>${CHEESERY.name}${owned ? ' <small>✔ sua</small>' : ''}</b>
          <small>Transforma ${CHEESERY.milk} 🥛 leite em 1 ${CHEESE.icon} queijo (🪙${CHEESE.sell}) a cada ${core.fmtDuration(CHEESERY.time)}, até com o jogo fechado. Obra de madeira (${costText(BUILDINGS.queijaria.cost)}): você escolhe onde fica.</small>
          ${owned || locked ? '' : `<div class="progress"><i style="width:${prog}%"></i></div>`}</div>
        <div class="btns">${owned
          ? '<span class="req">✔ Construída</span>'
          : locked
            ? `<span class="req">🔒 Nível ${CHEESERY.level}</span>`
            : !core.lotPlaced('queijaria')
              ? '<button class="btn alt" data-act="placelot" data-id="queijaria">📍 Escolher lugar</button>'
              : `<button class="btn alt" data-act="tab" data-id="oficina:obras">🏗️ Obra ${prog}%</button>`}
        </div></div></div>`;
  }

  sec('producao', 2);
  h += '<h3 id="sec-pomar">🌳 Pomar e colmeias</h3><div class="cards">';
  const free = S.orchard.filter((o) => !o.type).length;
  for (const [id, t] of Object.entries(FRUIT_TREES)) {
    const locked = t.level > S.level;
    const fruit = GOODS[t.fruit];
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${t.icon}</div>
      <div class="info"><b>Muda de ${t.name.toLowerCase()}</b>
        <small>Cresce em ~${Math.round(ORCHARD.grow / 180)} dias e depois dá ${fruit.icon} ${fruit.name.toLowerCase()} (🪙${fruit.sell}) a cada ${core.fmtDuration(t.every)}, para sempre. Até ${ORCHARD.stock} no pé.</small>
        <small>Pomar: ${ORCHARD.slots - free}/${ORCHARD.slots} covas usadas</small></div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${t.level}</span>`
        : !free
          ? '<span class="req">Pomar cheio</span>'
          : `<button class="btn" data-act="tree" data-id="${id}" ${S.coins < t.cost ? 'disabled' : ''}>🪙${fmt(t.cost)}</button>`}
      </div></div>`;
  }
  {
    const hv = S.hives;
    const locked = HIVES.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${hv.n ? ' hired' : ''}">
      <div class="ico">${HIVES.icon}</div>
      <div class="info"><b>${HIVES.name}${hv.n ? ` <small>${hv.n}/${HIVES.max}</small>` : ''}</b>
        <small>As abelhas fazem 🍯 mel (🪙${GOODS.mel.sell}) e polinizam o pomar: frutas ${Math.round(HIVES.boost * 100)}% mais rápidas. Ficam ao lado do pomar.</small></div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${HIVES.level}</span>`
        : hv.n >= HIVES.max
          ? '<span class="req">✔ Máximo</span>'
          : `<button class="btn alt" data-act="hive" ${S.coins < HIVES.cost ? 'disabled' : ''}>🪙${fmt(HIVES.cost)}</button>`}
      </div></div></div>`;
  }
  h += '<p class="hint">🌳 O pomar fica atrás das construções da sede, no norte da fazenda.</p>';

  sec('decor', 1);
  h += '<h3 id="sec-decor">🌻 Decoração</h3><div class="cards">';
  for (const [id, dd] of Object.entries(DECOR)) {
    const locked = dd.level > S.level;
    const inHand = sys.decorInv(id);
    const placed = S.decor.filter((x) => x.id === id).length;
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${dd.icon}</div>
      <div class="info"><b>${dd.name}${placed ? ` <small>${placed} na fazenda</small>` : ''}</b><small>${dd.desc}</small></div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${dd.level}</span>`
        : `${inHand ? `<button class="btn" data-act="decorplace" data-id="${id}">Colocar (${inHand})</button>` : ''}
           <button class="btn alt" data-act="decor" data-id="${id}" ${S.coins < dd.cost ? 'disabled' : ''}>🪙${fmt(dd.cost)}</button>`}
      </div></div>`;
  }
  h += '</div><p class="hint">Depois de comprar, escolha o lugar no mapa. Para mudar algo de lugar, chegue perto e use a ação (Mover).</p>';

  sec('animais', 1);
  const size = core.penSize();
  const homes = [];
  if (core.built('curral')) homes.push(`${core.penCount()}/${size} no curral`);
  if (S.pasture) homes.push(`${core.pastureCount()}/${PASTURE.slots} no pasto`);
  if (core.built('galinheiro')) homes.push(`${core.coopCount()}/${COOP.slots} no galinheiro`);
  h += `<h3>🐾 Animais <small>(${homes.length ? homes.join(' · ') : 'construa o curral ou o galinheiro primeiro'})</small></h3><div class="cards">`;
  for (const [id, a] of Object.entries(ANIMALS)) {
    const locked = a.level > S.level;
    const prod = PRODUCTS[a.product];
    const mine = S.animals.filter((x) => x.type === id);
    const count = (f) => mine.filter(f).length;
    const herd = mine.length
      ? `<small>No ${core.homeOf(mine[0])}: ♀ ${count((x) => x.sex !== 'm' && !core.isBaby(x))} · ♂ ${count((x) => x.sex === 'm' && !core.isBaby(x))}${count(core.isBaby) ? ` · ${a.babyIcon} ${count(core.isBaby)}` : ''}</small>`
      : '';
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${a.icon}</div>
      <div class="info"><b>${a.f} / ${a.m}</b>
        <small>♀ dá ${prod.icon} ${prod.name} (🪙${prod.sell}) a cada ${core.fmtDuration(a.time)} · come 🌾</small>
        <small>♂ não produz, mas com ♀ nascem ${a.baby.toLowerCase()}s · cor sorteada</small>${herd}</div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${a.level}</span>`
        : !core.built(id === 'galinha' ? 'galinheiro' : 'curral')
          ? `<span class="req">🏗️ Construa o ${id === 'galinha' ? 'galinheiro' : 'curral'}</span>`
          : !core.hasRoom(id)
          ? `<span class="req">${id === 'galinha' ? 'Galinheiro cheio' : S.pasture && id === 'vaca' ? 'Pasto cheio' : 'Curral cheio'}</span>`
          : `<button class="btn" data-act="animal" data-id="${id}" data-sex="f" title="Comprar ${a.f.toLowerCase()} (fêmea)" ${S.coins < a.cost ? 'disabled' : ''}>♀ 🪙${fmt(a.cost)}</button>
             <button class="btn alt" data-act="animal" data-id="${id}" data-sex="m" title="Comprar ${a.m.toLowerCase()} (macho)" ${S.coins < a.cost ? 'disabled' : ''}>♂ 🪙${fmt(a.cost)}</button>`}
      </div></div>`;
  }
  h += '</div>';

  sec('melhorias', 2);
  const wages = core.dailyWages();
  h += `<h3>👷 Funcionários${wages ? ` <small>(salários: 🪙${fmt(wages)}/dia)</small>` : ''}</h3><div class="cards">`;
  for (const [id, w] of Object.entries(WORKERS)) {
    const locked = w.level > S.level;
    const hired = S.workers[id];
    h += `<div class="card${locked ? ' locked' : ''}${hired ? ' hired' : ''}">
      <div class="ico">${w.icon}</div>
      <div class="info"><b>${w.name}${hired ? ' <small>✔ trabalhando</small>' : ''}</b>
        <small>${w.desc}</small>
        <small>Contratação 🪙${fmt(w.hire)} · salário 🪙${w.wage}/dia</small></div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${w.level}</span>`
        : hired
          ? `<button class="btn ghost" data-act="fire" data-id="${id}">Dispensar</button>`
          : `<button class="btn" data-act="hire" data-id="${id}" ${S.coins < w.hire ? 'disabled' : ''}>Contratar</button>`}
      </div></div>`;
  }
  h += '</div>';

  sec('melhorias', 1);
  h += '<h3>🛠️ Melhorias</h3><div class="cards">';
  for (const [id, u] of Object.entries(UPGRADES)) {
    const l = S.up[id];
    const max = u.costs.length;
    const maxed = l >= max;
    const locked = !maxed && u.req[l] > S.level;
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${u.icon}</div>
      <div class="info"><b>${u.name} <small>Nv ${l}/${max}</small></b>
        <small>${maxed ? u.effect(l) : `${u.effect(l)} → <b>${u.effect(l + 1)}</b>`}</small></div>
      <div class="btns">${maxed
        ? '<span class="req">✔ Máximo</span>'
        : locked
          ? `<span class="req">🔒 Nível ${u.req[l]}</span>`
          : (id === 'curral' || id === 'alimentador') && !core.built('curral')
            ? '<span class="req">🏗️ Construa o curral</span>'
            : `<button class="btn alt" data-act="upgrade" data-id="${id}" ${S.coins < u.costs[l] ? 'disabled' : ''}>🪙${fmt(u.costs[l])}</button>`}
      </div></div>`;
  }
  h += '</div>';
  sec('terras', 0);
  h += `<p class="hint" style="margin:0 0 10px">🔒 Para aumentar o campo principal, vá até um lote bloqueado vizinho (🪙) e compre-o. Próximo lote: 🪙${fmt(core.plotCost())}.</p>`;
  sec(null, 0);
  const out = {};
  for (const [cat, list] of Object.entries(parts)) out[cat] = list.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
  return out;
}

function trend(id) {
  const m = core.S.prices[id] || 1;
  if (m >= 1.1) return '<span class="up">▲</span>';
  if (m <= 0.9) return '<span class="down">▼</span>';
  return '';
}

function barnHtml() {
  const S = core.S;
  const fmt = core.fmt;
  const ITEMS = core.ITEMS;
  // Itens comuns primeiro; mutados (mais valiosos) depois, do mais caro para o mais barato
  const ids = Object.keys(S.inv).filter((id) => (S.inv[id] || 0) > 0 && core.itemInfo(id));
  ids.sort((a, b) => (a.includes('|') - b.includes('|')) || (a.includes('|') ? core.price(b) - core.price(a) : 0));
  const reserve = S.animals.length;
  const total = ids.reduce((s, id) => s + core.price(id) * (id === 'trigo' ? Math.max(0, S.inv[id] - reserve) : S.inv[id]), 0);
  const canSell = core.built('celeiro');
  const used = core.stored(), cap = core.capacity();
  const storage = `<div class="storage">📦 Espaço: ${fmt(used)}/${fmt(cap)}${used >= cap ? ' <span class="down">cheio!</span>' : ''}<div class="progress"><i style="width:${Math.min(100, Math.round((used / cap) * 100))}%"></i></div><small class="hint">Cada 🧰 baú colocado na fazenda dá +${STORAGE.chest} de espaço.</small></div>`;
  let h = canSell
    ? `<div class="barn-head">
    <div>Valor de venda: <b>🪙${fmt(total)}</b>${reserve ? `<small>Guarda ${reserve} 🌾 para os animais</small>` : ''}</div>
    <button class="btn" data-act="sellall" ${total ? '' : 'disabled'}>Vender tudo</button></div>`
    : `<div class="notice">🏗️ <b>O armazém ainda está em obra.</b> Sua colheita fica guardada aqui, mas só dá para vender depois de construí-lo
      (${costText(BUILDINGS.celeiro.cost)}). Enquanto isso, entregue os 📦 pedidos da vila para ganhar moedas.
      <br><button class="btn alt" data-act="tab" data-id="oficina:obras">🪚 Ver as obras</button></div>`;

  h = storage + h;
  if (!ids.length) {
    h += '<p class="empty-msg">Seu armazém está vazio. Vá colher algo! 🧺</p>';
  } else {
    h += '<div class="cards">';
    for (const id of ids) {
      const it = core.itemInfo(id);
      const top = it.muts.length ? MUTATIONS[core.topMutation(it.muts)] : null;
      const tags = it.muts.map((m) => `<span class="mut-tag" style="--mc:${RARITY_COLOR[MUTATIONS[m].rarity]}" title="${MUTATIONS[m].name} (${MUTATIONS[m].rarity})">${MUTATIONS[m].icon}</span>`).join('');
      h += `<div class="card${top ? ' mutated' : ''}"${top ? ` style="--mc:${RARITY_COLOR[top.rarity]}"` : ''}>
        <div class="ico">${it.icon}</div>
        <div class="info"><b>${it.name} ${tags} ×${S.inv[id]}</b><small>🪙${core.fmt(core.price(id))} cada ${trend(it.base)}${top ? ` · <b class="mut-mult">×${it.mult.toLocaleString('pt-BR')}</b>` : ''}</small></div>
        <div class="btns">${canSell ? `
          <button class="btn ghost" data-act="sell" data-id="${id}" data-q="1">Vender 1</button>
          <button class="btn" data-act="sell" data-id="${id}" data-q="${S.inv[id]}">Tudo</button>` : ''}
        </div></div>`;
    }
    h += '</div>';
  }

  const out = { itens: h };
  h = '';
  const seedIds = Object.keys(S.seeds).filter((id) => S.seeds[id] > 0);
  h += '<h3>🌱 Sementes guardadas</h3>';
  h += seedIds.length
    ? `<div class="chips">${seedIds.map((id) => `<span class="chip">${CROPS[id].icon} ${CROPS[id].name} ×${S.seeds[id]}</span>`).join('')}</div>`
    : '<p class="hint">Nenhuma semente. Compre na loja!</p>';

  const market = Object.keys(ITEMS).filter((id) => (CROPS[id] ? CROPS[id].level <= S.level : S.animals.some((a) => ANIMALS[a.type].product === id)));
  h += `<h3>📈 Mercado do dia ${core.dayOf(S.time)}</h3>`;
  h += `<div class="chips">${market.map((id) => `<span class="chip">${ITEMS[id].icon} 🪙${core.price(id)} ${trend(id)}</span>`).join('')}</div>`;
  h += '<p class="hint">Os preços mudam todo dia. ▲ = acima do normal, ▼ = abaixo.</p>';
  out.mercado = h;

  h = `<h3>📊 Estatísticas</h3><div class="stats">
    <div><b>${fmt(S.stats.harvest)}</b>colheitas</div>
    <div><b>${fmt(S.stats.earned)}</b>moedas ganhas</div>
    <div><b>${fmt(S.stats.orders)}</b>pedidos</div>
    <div><b>${fmt(S.stats.fish || 0)}</b>peixes</div>
    <div><b>${fmt(S.stats.mutated || 0)}</b>mutadas</div>
    <div><b>${fmt(S.stats.logs || 0)}</b>troncos</div>
    <div><b>${fmt(S.stats.planks || 0)}</b>tábuas</div>
    <div><b>${fmt(S.stats.crafted || 0)}</b>peças feitas</div>
    <div><b>${fmt(S.stats.births || 0)}</b>filhotes</div>
    <div><b>${fmt(S.stats.cheese || 0)}</b>queijos</div></div>`;
  out.numeros = h;
  return out;
}

const PLURAL = { tronco: 'troncos', madeira: 'tábuas', viga: 'vigas' };
const costText = (cost) => Object.entries(cost).map(([id, q]) => `${q} ${PLURAL[id] || core.ITEMS[id].name.toLowerCase()} ${core.ITEMS[id].icon}`).join(' e ');

function workshopHtml() {
  const S = core.S;
  const io = (o) => Object.entries(o).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + ');
  let h = `<h3>${CARPENTRY.icon} ${CARPENTRY.name}</h3>
    <p class="hint" style="margin:0 0 8px">A mesa fica entre a casa e o armazém. Escolha o que fazer, vá até ela e use a ação (segure para continuar) ou toque na mesa.</p>
    <div class="chips"><span class="chip">🪵 Troncos ×${S.inv.tronco || 0}</span><span class="chip">🟫 Tábuas ×${S.inv.madeira || 0}</span><span class="chip">📏 Vigas ×${S.inv.viga || 0}</span></div>
    <div class="cards">`;
  for (const rc of RECIPES) {
    const sel = S.bench === rc.id;
    const max = core.craftMax(rc.id);
    h += `<div class="card${sel ? ' hired' : ''}">
      <div class="ico">${rc.icon}</div>
      <div class="info"><b>${rc.name}${sel ? ' <small>✔ na mesa</small>' : ''}</b>
        <small>${io(rc.input)} → ${io(rc.output)} · ${rc.work} golpes. ${rc.desc}</small>
        <small>Dá para fazer: ${max}</small></div>
      <div class="btns">${sel
        ? '<span class="req">Escolhida</span>'
        : `<button class="btn alt" data-act="bench" data-id="${rc.id}">Escolher</button>`}
      </div></div>`;
  }
  h += '</div>';
  const out = { carpintaria: h };
  const facs = Object.entries(FACTORIES);
  h = `<h3>🏭 Fábricas</h3><p class="hint" style="margin:0 0 8px">Escolha o que cada fábrica faz. Ela usa o que está no armazém quando você chega perto e usa a ação, e continua trabalhando até com o jogo fechado.</p><div class="cards">`;
  for (const [fid, f] of facs) {
    const done = core.built(fid);
    const st = S.fac[fid];
    h += `<div class="card${done ? '' : ' locked'}">
      <div class="ico">${f.icon}</div>
      <div class="info"><b>${f.name}${done ? ` <small>${st.queue.length}/${f.capacity} na fila</small>` : ''}</b>
        <small>${done ? f.desc : `Ainda não construíd${f.fem ? 'a' : 'o'}: veja em Obras (nível ${f.level}).`}</small>
        ${done ? `<div class="chips" style="margin-top:6px">${f.recipes.map((r) => `<button class="chip${st.sel === r.id ? ' sel' : ''}" data-act="facrecipe" data-id="${fid}:${r.id}" title="${sys.ioText(r.in)} → ${GOODS[r.out].name} (🪙${GOODS[r.out].sell}), ${core.fmtDuration(r.time)}">${sys.ioText(r.in)} → ${GOODS[r.out].icon}</button>`).join('')}</div>` : ''}</div>
      <div class="btns"></div></div>`;
  }
  out.fabricas = h + '</div>';
  h = '<h3>🏗️ Obras</h3><div class="cards">';
  for (const [id, b] of Object.entries(BUILDINGS)) {
    const done = core.built(id);
    const prog = core.buildProgress(id);
    const missing = core.buildMissing(id);
    h += `<div class="card${done ? ' hired compact' : ''}">
      <div class="ico">${b.icon}</div>
      <div class="info"><b>${b.name}${done ? ' <small>✔ construído</small>' : prog > 0 ? ` <small>${Math.round(prog * 100)}%</small>` : ''}</b>
        <small>${b.desc}</small>
        <small>${done ? 'Pronto!' : prog > 0 ? `Falta ${missing.map((x) => `${x.qty} ${core.ITEMS[x.id].icon}`).join(' + ')}` : `Custa ${io(b.cost)}`}</small>
        ${done || prog <= 0 ? '' : `<div class="progress"><i style="width:${Math.round(prog * 100)}%"></i></div>`}</div>
      <div class="btns">${done ? '<span class="req">✔</span>' : b.level > S.level ? `<span class="req">🔒 Nível ${b.level}</span>` : !core.lotPlaced(id) ? `<button class="btn alt" data-act="placelot" data-id="${id}">📍 Escolher lugar</button>` : '<span class="req">Entregue no canteiro</span>'}</div></div>`;
  }
  h += `</div><p class="hint">📍 Primeiro escolha onde cada obra fica; um caminho de terra liga ela à rua. 🪓 Corte árvores no bosque (oeste) para ter troncos. Leve a madeira até o canteiro 🏗️ e use a ação para entregar: dá para entregar aos poucos.${S.saw.owned ? '' : ` Mais tarde, a ${SAWMILL.icon} Serraria faz tábuas sozinha.`}</p>`;
  out.obras = h;
  return out;
}

function questHtml() {
  const q = sys.quest();
  if (!q) return `<h3>📜 Encomenda especial</h3><p class="hint" style="margin:0 0 6px">${core.S.level < 2 ? 'As encomendas especiais começam no nível 2.' : `Uma nova encomenda chega em ${core.fmtDuration(Math.max(0, core.S.questT))}.`}</p>`;
  const ok = q.req.every((r) => r.got + (core.S.inv[r.id] || 0) >= r.qty);
  const some = q.req.some((r) => r.got < r.qty && (core.S.inv[r.id] || 0) > 0);
  return `<h3>📜 Encomenda especial</h3>
    <div class="order quest${ok ? ' ok' : ''}">
      <div class="who">${q.who} <small>· vence em ${core.fmtDuration(Math.max(0, q.t))}</small></div>
      <div class="reqs">${q.req.map((r) => `<span class="req-item${r.got >= r.qty ? ' done' : ''}">${core.ITEMS[r.id].icon} ${Math.min(r.qty, r.got + (core.S.inv[r.id] || 0))}/${r.qty}${r.got ? ` <small>(${r.got} entregues)</small>` : ''}</span>`).join('')}</div>
      <div class="order-foot">
        <span class="reward">🪙${core.fmt(q.coins)} · ⭐${q.xp} XP · bônus ${Object.entries(q.bonus).map(([id, n]) => `${n} ${core.ITEMS[id].icon}`).join(' + ')}</span>
        <span class="btns"><button class="btn" data-act="quest" ${some ? '' : 'disabled'}>${ok ? 'Entregar' : 'Entregar parte'}</button></span>
      </div></div>`;
}

function fairHtml() {
  if (!sys.fairToday()) {
    const n = sys.daysToFair();
    return `<h3>🎪 Feira</h3><p class="hint" style="margin:0 0 6px">A feira acontece no último dia de cada estação: ${n === 1 ? 'amanhã' : `daqui a ${n} dias`}. Guarde seus melhores produtos (gigantes e mutados valem mais pontos).</p>`;
  }
  const f = sys.fairState();
  let h = '<h3>🎪 Feira de hoje</h3><p class="hint" style="margin:0 0 8px">Inscreva o seu melhor produto em cada categoria (o mais valioso do armazém vai automaticamente). Os três primeiros ganham medalha e prêmio.</p><div class="cards">';
  for (const [cat, c] of Object.entries(FAIR.cats)) {
    const done = f.done[cat];
    const best = sys.fairBest(cat);
    const it = best && core.itemInfo(best);
    h += `<div class="card${done && done.place <= 3 ? ' hired' : ''}">
      <div class="ico">${c.icon}</div>
      <div class="info"><b>${c.name}</b><small>${c.desc}</small>
        <small>${done ? `${['🥇', '🥈', '🥉'][done.place - 1] || '🎗️'} ${done.place}º lugar com ${done.score} pontos` : best ? `Vai inscrever: ${it.icon} ${it.name}${it.tag ? ' ' + it.tag : ''} (~${core.fmt(core.price(best))} pontos)` : 'Nada no armazém para esta categoria.'}</small>
        <small>Concorrentes: ${f.rivals[cat].slice().sort((a, b) => b - a).join(' · ')} pontos</small></div>
      <div class="btns">${done ? '<span class="req">✔</span>' : `<button class="btn" data-act="fair" data-id="${cat}" ${best ? '' : 'disabled'}>Inscrever</button>`}</div></div>`;
  }
  return h + '</div>';
}

function friendsHtml() {
  const rows = CUSTOMERS.map((who) => {
    const hs = sys.hearts(who);
    const pts = sys.friendPts(who);
    const next = hs >= FRIEND.hearts ? 'amizade máxima' : `${(hs + 1) * FRIEND.perHeart - pts} entregas para o próximo ❤️`;
    return `<div class="friend"><span>${who}</span><span class="hearts">${'❤️'.repeat(hs)}${'🤍'.repeat(FRIEND.hearts - hs)}</span><small>${hs ? `+${Math.round(hs * FRIEND.orderBonus * 100)}% nos pedidos · ` : ''}${next}</small></div>`;
  }).join('');
  return `<h3>❤️ Moradores</h3><p class="hint" style="margin:0 0 6px">Cada pedido entregue aumenta a amizade com quem pediu (encomendas especiais contam 5). A cada coração novo, o morador manda um presente e passa a pagar mais.</p><div class="friends">${rows}</div>`;
}

function ordersHtml() {
  const S = core.S;
  let h = questHtml();
  h += '<h3>📦 Pedidos da vila</h3><div class="cards">';
  S.orders.forEach((o, k) => {
    const ok = core.canFulfill(o);
    h += `<div class="order${ok ? ' ok' : ''}">
      <div class="who">${o.who}${core.isNewOrder(o) ? ' <span class="new-badge">Novo</span>' : ''}</div>
      <div class="reqs">${o.req.map((r) => {
        const have = Math.min(S.inv[r.id] || 0, r.qty);
        return `<span class="req-item${have >= r.qty ? ' done' : ''}">${core.ITEMS[r.id].icon} ${have}/${r.qty}</span>`;
      }).join('')}</div>
      <div class="order-foot">
        <span class="reward">🪙${core.fmt(Math.round(o.coins * (1 + sys.hearts(o.who) * FRIEND.orderBonus)))}${sys.hearts(o.who) ? ' ❤️' : ''} · ⭐${o.xp} XP</span>
        <span class="btns">
          <button class="btn ghost" data-act="skip" data-k="${k}" title="Recusar e receber outro pedido">✖</button>
          <button class="btn" data-act="order" data-k="${k}" ${ok ? '' : 'disabled'}>Entregar</button>
        </span>
      </div></div>`;
  });
  h += '</div><p class="hint">Pedidos pagam bem mais do que o mercado. Recuse (✖) os que não te interessam. ✉️ A cartinha em cima do quadro de Pedidos avisa quando chega pedido novo.</p>';
  return { pedidos: h, feira: fairHtml(), moradores: friendsHtml() };
}

// ================= Hotbar =================
// As ferramentas ficam na barra; todas as sementes cabem num único botão que abre um seletor.
let lastSeed = 'trigo';
let pickerOpen = false;

const unlockedSeeds = () => Object.keys(CROPS).filter((id) => CROPS[id].level <= core.S.level);
/** Espaços da barra: as ferramentas e, no fim, o botão de sementes ("seeds"). */
export const toolSlots = () => core.toolList().filter((id) => !id.startsWith('seed:')).concat('seeds');

/** Semente que o botão de sementes mostra (a escolhida por último). */
function currentSeed() {
  if (core.tool.startsWith('seed:')) lastSeed = core.tool.slice(5);
  if (!CROPS[lastSeed] || CROPS[lastSeed].level > core.S.level) lastSeed = 'trigo';
  return lastSeed;
}

function renderToolbar() {
  const S = core.S;
  let h = '';
  toolSlots().forEach((id, k) => {
    const key = k < 9 ? `<kbd>${k + 1}</kbd>` : '';
    if (id === 'seeds') {
      const cid = currentSeed(), c = CROPS[cid], n = S.seeds[cid] || 0;
      const active = core.tool.startsWith('seed:') ? ' active' : '';
      h += `<span class="tool-sep"></span><button class="tool seedslot${active}${n ? '' : ' empty'}${pickerOpen ? ' open' : ''}" data-slot="seeds" title="Sementes: ${c.name} (toque de novo para escolher outra)">
        ${key}<span class="ti">${c.icon}</span><span class="tn">${c.name}</span><span class="cnt">${n}</span><span class="more" data-picker>▲</span></button>`;
      return;
    }
    const t = core.TOOLS.find((x) => x.id === id);
    h += `<button class="tool${core.tool === id ? ' active' : ''}" data-tool="${id}" title="${t.name}">
      ${key}<span class="ti">${t.icon}</span><span class="tn">${t.name}</span></button>`;
  });
  el.toolbar.innerHTML = h;
  renderPicker();
}

function renderPicker() {
  el.picker.hidden = !pickerOpen;
  document.body.classList.toggle('picking', pickerOpen);
  if (!pickerOpen) return;
  const S = core.S;
  const cur = core.tool.startsWith('seed:') ? core.tool.slice(5) : null;
  el.picker.innerHTML = `<div class="sp-head"><b>🌱 Sementes</b><button class="btn ghost" data-shop>🏪 Comprar</button></div><div class="sp-grid">${
    unlockedSeeds().map((id) => {
      const c = CROPS[id], n = S.seeds[id] || 0;
      return `<button class="tool${cur === id ? ' active' : ''}${n ? '' : ' empty'}" data-seed="${id}" title="${c.name}: ${n} sementes">
        <span class="ti">${c.icon}</span><span class="tn">${c.name}</span><span class="cnt">${n}</span></button>`;
    }).join('')}</div>`;
}

function setPicker(open) {
  if (pickerOpen === open) return;
  pickerOpen = open;
  if (open) sfx('open');
  renderToolbar();
}

export function selectTool(id) {
  core.setTool(id);
  if (id.startsWith('seed:')) lastSeed = id.slice(5);
  if (id.startsWith('seed:') && !core.S.seeds[id.slice(5)]) {
    toast(`Sem sementes de ${CROPS[id.slice(5)].name}. Compre na loja! 🏪`);
    openPanel('loja', 'sementes');
  }
}

/** Botão de sementes: escolhe a última semente; se ela já está na mão, abre o seletor. */
function seedSlot(fromKey) {
  if (!core.tool.startsWith('seed:')) { selectTool('seed:' + currentSeed()); return; }
  if (fromKey) {
    // Pela tecla: passa para a próxima semente que você tem
    const ids = unlockedSeeds();
    const owned = ids.filter((id) => core.S.seeds[id] > 0);
    const pool = owned.length ? owned : ids;
    const next = pool[(pool.indexOf(currentSeed()) + 1) % pool.length];
    selectTool('seed:' + next);
    return;
  }
  setPicker(!pickerOpen);
}

export function selectToolByIndex(n) {
  const id = toolSlots()[n];
  if (id === 'seeds') seedSlot(true);
  else if (id) selectTool(id);
}

// ================= HUD =================
function renderHud() {
  const S = core.S;
  if (lastCoins !== null && S.coins > lastCoins) {
    el.coins.classList.remove('bump');
    void el.coins.offsetWidth; // reinicia a animação
    el.coins.classList.add('bump');
  }
  lastCoins = S.coins;
  setText(el.coins, S.god ? '∞' : core.fmt(S.coins));
  setText(el.brandName, S.char.chosen ? `Fazenda ${core.gw('do', 'da')} ${core.playerName()}` : 'FarmLife');
  setText(el.level, S.level);
  const need = core.xpNeed(S.level);
  el.xpfill.style.width = Math.min(100, (S.xp / need) * 100) + '%';
  setText(el.xptext, `${Math.floor(S.xp)}/${need} XP`);
  const ss = sys.season();
  setText(el.day, `${ss.icon} Dia ${core.dayOf(S.time)}`);
  el.day.title = `${ss.name}, dia ${sys.seasonDay()} de 7. Crescem mais rápido: ${ss.crops.map((c) => CROPS[c].name).join(', ')}.`;
  const hours = core.dayHours();
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours % 1) * 6) * 10;
  setText(el.clock, `${core.pad(h)}:${core.pad(m)}`);
  const ev = core.currentEvent();
  setText(el.weather, ev ? ev.icon : core.darkness() > 0.4 ? '🌙' : '☀️');
  el.eventPill.hidden = !ev;
  if (ev) {
    const m = MUTATIONS[ev.mutation];
    const left = Math.max(0, Math.ceil(S.event.t));
    setText(el.eventName, ev.name);
    setText(el.eventInfo, `${m.icon} ×${m.mult} · ${Math.floor(left / 60)}:${core.pad(left % 60)}`);
    el.eventPill.style.setProperty('--mc', RARITY_COLOR[m.rarity]);
    el.eventPill.title = `${ev.name}: plantas crescendo podem ficar ${m.name} (${m.rarity}, ×${m.mult} no valor).`;
  }
}

// ================= Mapa e modo foto =================
let mapPlacesCache = [];
export function openMap() {
  const m = $('#map');
  if (!m.hidden) { closeMap(); return; }
  if (document.body.classList.contains('photo')) togglePhoto();
  closePanel();
  m.hidden = false;
  drawMapNow();
  sfx('open');
}
export function closeMap() { $('#map').hidden = true; }
function drawMapNow() {
  const cv = $('#map-canvas');
  const b = handlers.mapBounds();
  const W = Math.max(640, Math.min(940, $('.map-wrap').clientWidth || 900));
  const H = Math.round(W * ((b.maxZ - b.minZ) / (b.maxX - b.minX)) * 1.1); // um pouco esticado na vertical para ler melhor
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  handlers.drawMap(ctx, W, H);
  mapPlacesCache = handlers.mapPlaces();
  $('#map-places').innerHTML = mapPlacesCache.map((p, k) => `<button class="chip" data-place="${k}">${p.icon} ${p.name}</button>`).join('');
}
function travelPlace(p) { if (handlers.travelTo(p.x, p.z)) closeMap(); }

export function togglePhoto() {
  const on = !document.body.classList.contains('photo');
  document.body.classList.toggle('photo', on);
  $('#photobar').hidden = !on;
  closePanel();
  closeMap();
  handlers.setPhotoMode(on, $('#photo-labels').checked);
}

// ================= Colocar decoração =================
let placeHandlers = null;
export function showPlaceBar(def, left, h, mode) {
  placeHandlers = h;
  const bar = $('#placebar');
  const touch = window.matchMedia('(pointer: coarse)').matches;
  $('#place-text').textContent = mode === 'lot'
    ? `${def.icon} ${def.name}: ${touch ? 'toque no chão ou ande' : 'mova o mouse e clique'} para escolher onde fica (verde = cabe)`
    : `${def.icon} ${def.name}${left > 1 ? ` (${left})` : ''}: ${touch ? 'toque no chão ou ande' : 'mova o mouse e clique'} para escolher o lugar`;
  $('#place-rot').hidden = !h.rotate;
  bar.hidden = false;
  closePanel();
}
export function hidePlaceBar() { $('#placebar').hidden = true; placeHandlers = null; }

// ================= Lado do joystick =================
export function renderJoyPick(root) {
  root.querySelectorAll('[data-joy]').forEach((b) => b.classList.toggle('active', b.dataset.joy === joySide()));
}
export function bindJoyPick(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-joy]');
    if (!b) return;
    setJoySide(b.dataset.joy);
    renderJoyPick(root);
    sfx('open');
  });
}

// ================= Menu de som =================
const soundIcon = () => (audioSettings.muted || audioSettings.master === 0 ? '🔇' : audioSettings.master < 0.4 ? '🔉' : '🔊');

function renderSoundMenu() {
  const box = el.settings;
  box.querySelectorAll('[data-vol]').forEach((inp) => {
    const v = Math.round(audioSettings[inp.dataset.vol] * 100);
    inp.value = v;
    inp.nextElementSibling.textContent = v + '%';
  });
  box.querySelector('#set-mute').checked = audioSettings.muted;
  renderJoyPick(box);
  box.classList.toggle('muted', audioSettings.muted);
  setText(el.btnSound, soundIcon());
}

function setSoundMenu(open) {
  const box = el.settings;
  if (open) {
    // Logo abaixo do botão de som (o HUD quebra em mais linhas em telas estreitas)
    box.style.top = Math.round(el.btnSound.getBoundingClientRect().bottom + 8) + 'px';
    renderSoundMenu();
  }
  box.hidden = !open;
  el.btnSound.classList.toggle('active', open);
}

function initSoundMenu() {
  const box = el.settings;
  setText(el.btnSound, soundIcon());
  el.btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    setSoundMenu(box.hidden);
    el.btnSound.blur();
  });
  $('#settings-close').addEventListener('click', () => setSoundMenu(false));
  bindJoyPick(box);
  let previewT = 0;
  box.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-vol]');
    if (inp) {
      setVolume(inp.dataset.vol, inp.value / 100);
      if (audioSettings.muted && inp.value > 0) setMuted(false);
      // Prévia do volume dos efeitos
      if (inp.dataset.vol !== 'music' && performance.now() - previewT > 180) { previewT = performance.now(); sfx('coin'); }
    } else if (e.target.id === 'set-mute') {
      setMuted(e.target.checked);
    }
    renderSoundMenu();
  });
  // Toque/clique fora fecha o menu
  document.addEventListener('pointerdown', (e) => {
    if (!box.hidden && !e.target.closest('#settings') && !e.target.closest('#btn-sound')) setSoundMenu(false);
  });
  // O navegador só libera o áudio depois de um toque ou tecla: aí a música começa
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

// ================= Modal =================
export function openHelp() { el.modal.hidden = false; }
function closeHelp() {
  el.modal.hidden = true;
  if (!core.S.seen) { core.S.seen = true; core.save(); }
}

// ================= Inicialização e quadro =================
export function initUI(h) {
  handlers = h;
  Object.assign(el, {
    coins: $('#coins'), level: $('#level'), xpfill: $('#xpfill'), xptext: $('#xptext'),
    day: $('#day'), clock: $('#clock'), weather: $('#weather'),
    eventPill: $('#event-pill'), eventName: $('#event-name'), eventInfo: $('#event-info'),
    brandName: $('#brand-name'), toolbar: $('#toolbar'), status: $('#status'), prompt: $('#prompt'), picker: $('#seed-picker'),
    panel: $('#panel'), tabContent: $('#tab-content'), badge: $('#badge'),
    fx: $('#fx'), toasts: $('#toasts'), modal: $('#modal'), btnSound: $('#btn-sound'), fade: $('#fade'), settings: $('#settings'),
  });

  el.toolbar.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-slot="seeds"]');
    if (slot) {
      // A setinha ▲ sempre abre o seletor; o resto do botão escolhe a semente
      if (e.target.closest('[data-picker]')) setPicker(!pickerOpen);
      else seedSlot(false);
      slot.blur();
      return;
    }
    const b = e.target.closest('[data-tool]');
    if (b) { selectTool(b.dataset.tool); setPicker(false); b.blur(); }
  });
  el.picker.addEventListener('click', (e) => {
    const s = e.target.closest('[data-seed]');
    if (s) { selectTool('seed:' + s.dataset.seed); setPicker(false); return; }
    if (e.target.closest('[data-shop]')) { setPicker(false); openPanel('loja', 'sementes'); }
  });
  // Toque/clique fora fecha o seletor
  document.addEventListener('pointerdown', (e) => {
    if (pickerOpen && !e.target.closest('#seed-picker') && !e.target.closest('[data-slot="seeds"]')) setPicker(false);
  });
  $('#btn-map').addEventListener('click', (e) => { e.currentTarget.blur(); openMap(); });
  $('#map-close').addEventListener('click', closeMap);
  $('#map').addEventListener('click', (e) => { if (e.target.id === 'map') closeMap(); });
  $('#map-places').addEventListener('click', (e) => {
    const b = e.target.closest('[data-place]');
    if (b) travelPlace(mapPlacesCache[+b.dataset.place]);
  });
  $('#map-canvas').addEventListener('click', (e) => {
    const cv = e.currentTarget, r = cv.getBoundingClientRect(), b = handlers.mapBounds();
    const x = b.minX + ((e.clientX - r.left) / r.width) * (b.maxX - b.minX);
    const z = b.minZ + ((e.clientY - r.top) / r.height) * (b.maxZ - b.minZ);
    // Lugar com nome mais perto do clique, senão o ponto clicado
    const near = mapPlacesCache.map((p) => ({ p, d: Math.hypot(p.x - x, p.z - z) })).sort((a, c) => a.d - c.d)[0];
    travelPlace(near && near.d < 4 ? near.p : { x, z });
  });
  $('#btn-photo').addEventListener('click', (e) => { e.currentTarget.blur(); togglePhoto(); });
  $('#photo-exit').addEventListener('click', togglePhoto);
  $('#photo-labels').addEventListener('change', (e) => handlers.setPhotoMode(true, e.target.checked));
  $('#photo-save').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = handlers.capture();
    a.download = `farmlife-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    sfx('coin');
  });
  $('#place-ok').addEventListener('click', () => placeHandlers && placeHandlers.ok());
  $('#place-rot').addEventListener('click', () => placeHandlers && placeHandlers.rotate && placeHandlers.rotate());
  $('#place-cancel').addEventListener('click', () => placeHandlers && placeHandlers.cancel());
  $('#zoom-in').addEventListener('click', () => handlers.onZoom(1 / 1.2));
  $('#zoom-out').addEventListener('click', () => handlers.onZoom(1.2));
  $('#cam-reset').addEventListener('click', (e) => { handlers.onCamReset(); e.currentTarget.blur(); });
  // Botão de ação: segurar repete a ação ao andar sobre novos lotes
  const btnAction = $('#btn-action');
  btnAction.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { btnAction.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    btnAction.classList.add('pressed');
    handlers.onActionHeld(true);
  });
  const release = () => { btnAction.classList.remove('pressed'); handlers.onActionHeld(false); };
  btnAction.addEventListener('pointerup', release);
  btnAction.addEventListener('pointercancel', release);
  btnAction.addEventListener('contextmenu', (e) => e.preventDefault());

  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) openPanel(b.dataset.tab);
  });
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => togglePanel(b.dataset.open)));
  $('#btn-close').addEventListener('click', closePanel);

  el.tabContent.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const { act, id } = b.dataset;
    if (act === 'seed') core.buySeed(id, +b.dataset.q);
    else if (act === 'animal') core.buyAnimal(id, b.dataset.sex);
    else if (act === 'upgrade') core.buyUpgrade(id);
    else if (act === 'hire') core.hireWorker(id);
    else if (act === 'fire') core.fireWorker(id);
    else if (act === 'field') core.buyField(id);
    else if (act === 'bigfield') core.buyBigField();
    else if (act === 'rod') core.buyRod(+id);
    else if (act === 'axe') core.buyAxe(+id);
    else if (act === 'sawmill') core.buySawmill();
    else if (act === 'bench') core.setBench(id);
    else if (act === 'tab') { const [t, sub] = id.split(':'); openPanel(t, sub); return; }
    else if (act === 'sub') { const [t, sub] = id.split(':'); subCur[t] = sub; renderPanel(); el.tabContent.scrollTop = 0; sfx('open'); return; }
    else if (act === 'pet') core.buyPet();
    else if (act === 'horse') core.buyHorse();
    else if (act === 'pasture') core.buyPasture();
    else if (act === 'quest') sys.questDeliver();
    else if (act === 'decor') { if (sys.buyDecor(id)) handlers.onPlaceDecor(id); return; }
    else if (act === 'decorplace') { handlers.onPlaceDecor(id); return; }
    else if (act === 'placelot') { handlers.onPlaceLot(id); return; }
    else if (act === 'fair') sys.fairEnter(id);
    else if (act === 'tree') sys.buyTree(id);
    else if (act === 'hive') sys.buyHive();
    else if (act === 'facrecipe') { const [fid, rid] = id.split(':'); sys.setRecipe(fid, rid); }
    else if (act === 'saddle') core.buySaddle();
    else if (act === 'petname') {
      const name = prompt('Qual o nome da sua border collie?', core.S.pet.name);
      if (name) core.renamePet(name);
    }
    else if (act === 'machine') core.buyMachine(id);
    else if (act === 'sell') core.sell(id, +b.dataset.q);
    else if (act === 'sellall') core.sellAll();
    else if (act === 'order') core.fulfillOrder(+b.dataset.k);
    else if (act === 'skip') core.skipOrder(+b.dataset.k);
  });

  initSoundMenu();
  $('#btn-help').addEventListener('click', () => handlers.onHelp());
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeHelp(); });
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Recomeçar a fazenda do zero? Todo o progresso será perdido.')) return;
    handlers.onReset();
    closePanel();
    toast('🌱 Uma nova fazenda começa!');
  });

  window.addEventListener('keydown', (e) => {
    if (isModalOpen()) {
      if (e.key === 'Escape' || e.key === 'Enter') closeHelp();
      return;
    }
    if (e.key === 'Escape' && isPanelOpen()) closePanel();
    if (e.key === 'Escape' && !$('#map').hidden) closeMap();
    else if (e.key === 'Escape' && document.body.classList.contains('photo')) togglePhoto();
  });

  markDirty('panel', 'toolbar');
}

export function uiFrame(dt) {
  if (dirty.has('toolbar')) { dirty.delete('toolbar'); renderToolbar(); }
  if (dirty.has('panel')) { dirty.delete('panel'); renderPanel(); }
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.1; renderHud(); }
}
