/* FarmLife — interface em HTML sobre a cena 3D (HUD, hotbar, painel, avisos) */
import { CROPS, ANIMALS, PRODUCTS, UPGRADES, WORKERS, FIELDS, BIG_FIELD, BIG_CELLS, MACHINES, FISH, RODS, PET, MUTATIONS, RARITY_COLOR, WEATHER_EVENTS, AXES, LOG, WOOD, SAWMILL, PLANK, RECIPES, BUILDINGS, CARPENTRY, SOUND_KEY } from './data.js';
import * as core from './core.js';
import { Sound, sfx } from './audio.js';

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
export const uiBlocking = () => isModalOpen();

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

function renderPanel() {
  const S = core.S;
  const scroll = el.tabContent.scrollTop;
  if (currentTab === 'loja') el.tabContent.innerHTML = shopHtml();
  else if (currentTab === 'celeiro') el.tabContent.innerHTML = barnHtml();
  else if (currentTab === 'oficina') el.tabContent.innerHTML = workshopHtml();
  else el.tabContent.innerHTML = ordersHtml();
  el.tabContent.scrollTop = scroll;
  if (currentTab === 'pedidos' && isPanelOpen()) core.markOrdersSeen();

  const ok = S.orders.filter(core.canFulfill).length;
  el.badge.hidden = !ok;
  setText(el.badge, ok);
}

function shopHtml() {
  const S = core.S;
  const fmt = core.fmt;
  let h = '<h3>🌱 Sementes</h3><div class="cards">';
  for (const [id, c] of Object.entries(CROPS)) {
    const locked = c.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${c.icon}</div>
      <div class="info"><b>${c.name}</b>
        <small>⏱ ${core.fmtDuration(c.time)} · vende 🪙${c.sell}${c.regrow ? ' · 🔁 rebrota' : ''}</small>
        ${locked ? '' : `<small>Você tem: ${S.seeds[id] || 0}</small>`}</div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${c.level}</span>`
        : `<button class="btn" data-act="seed" data-id="${id}" data-q="1" ${S.coins < c.seed ? 'disabled' : ''}>🪙${c.seed}</button>
           <button class="btn alt" data-act="seed" data-id="${id}" data-q="5" ${S.coins < c.seed * 5 ? 'disabled' : ''} title="Comprar 5 por 🪙${c.seed * 5}">×5</button>
           ${id === 'trigo' ? `<button class="btn alt" data-act="seed" data-id="trigo" data-q="50" ${S.coins < c.seed * 50 ? 'disabled' : ''} title="Saco com 50 sementes por 🪙${c.seed * 50}">×50</button>` : ''}`}
      </div></div>`;
  }
  h += '</div>';

  h += '<h3 id="sec-campos">🗺️ Campos</h3><div class="cards">';
  for (const f of FIELDS) {
    if (!f.cost) continue;
    const owned = core.fieldOwned(f.id);
    const locked = !owned && f.level > S.level;
    h += `<div class="card${locked ? ' locked' : ''}${owned ? ' hired' : ''}">
      <div class="ico">${f.icon}</div>
      <div class="info"><b>${f.name}${owned ? ' <small>✔ seu</small>' : ''}</b>
        <small>${f.count} lotes novos (${f.cols}×${f.rows}), já limpos para arar.</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Comprado</span>'
        : locked
          ? `<span class="req">🔒 Nível ${f.level}</span>`
          : `<button class="btn alt" data-act="field" data-id="${f.id}" ${S.coins < f.cost ? 'disabled' : ''}>🪙${fmt(f.cost)}</button>`}
      </div></div>`;
  }
  h += '</div>';

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
        <small>Transforma cada 🪵 tronco em ${SAWMILL.perLog} ${PLANK.icon} tábuas (🪙${PLANK.sell} cada), um a cada ${SAWMILL.time}s, até com o jogo fechado. Fica na entrada do bosque.</small></div>
      <div class="btns">${owned
        ? '<span class="req">✔ Construída</span>'
        : locked
          ? `<span class="req">🔒 Nível ${SAWMILL.level}</span>`
          : `<button class="btn alt" data-act="sawmill" ${S.coins < SAWMILL.cost ? 'disabled' : ''}>🪙${fmt(SAWMILL.cost)}</button>`}
      </div></div>`;
  }
  h += `</div><p class="hint">🌲 O bosque fica a oeste, entre o curral e o Campo do Sul. Cada árvore rende ${WOOD.logs[0]}–${WOOD.logs[1]} ${LOG.icon} troncos (🪙${LOG.sell} cada) e cresce de novo em ~${Math.round(WOOD.regrow / 60)} min.</p>`;

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

  const big = S.big.owned;
  const bigLocked = !big && BIG_FIELD.level > S.level;
  h += `<h3 id="sec-maquinas">🚜 Lavoura mecanizada</h3><div class="cards">
    <div class="card${bigLocked ? ' locked' : ''}${big ? ' hired' : ''}">
      <div class="ico">${BIG_FIELD.icon}</div>
      <div class="info"><b>${BIG_FIELD.name}${big ? ' <small>✔ seu</small>' : ''}</b>
        <small>${BIG_FIELD.cols}×${BIG_FIELD.rows} = ${BIG_CELLS} lotes só de trigo, a leste do mapa. Cresce sem rega; trabalhe com as máquinas.</small></div>
      <div class="btns">${big
        ? '<span class="req">✔ Comprado</span>'
        : bigLocked
          ? `<span class="req">🔒 Nível ${BIG_FIELD.level}</span>`
          : `<button class="btn alt" data-act="bigfield" ${S.coins < BIG_FIELD.cost ? 'disabled' : ''}>🪙${fmt(BIG_FIELD.cost)}</button>`}
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

  const size = core.penSize();
  const full = S.animals.length >= size;
  const penBuilt = core.built('curral');
  h += `<h3>🐾 Animais <small>(${penBuilt ? `${S.animals.length}/${size} no curral` : 'construa o curral primeiro'})</small></h3><div class="cards">`;
  for (const [id, a] of Object.entries(ANIMALS)) {
    const locked = a.level > S.level;
    const prod = PRODUCTS[a.product];
    h += `<div class="card${locked ? ' locked' : ''}">
      <div class="ico">${a.icon}</div>
      <div class="info"><b>${a.name}</b>
        <small>Produz ${prod.icon} ${prod.name} (🪙${prod.sell}) a cada ${core.fmtDuration(a.time)} · come 🌾</small></div>
      <div class="btns">${locked
        ? `<span class="req">🔒 Nível ${a.level}</span>`
        : !penBuilt
          ? '<span class="req">🏗️ Construa o curral</span>'
          : full
          ? '<span class="req">Curral cheio</span>'
          : `<button class="btn" data-act="animal" data-id="${id}" ${S.coins < a.cost ? 'disabled' : ''}>🪙${fmt(a.cost)}</button>`}
      </div></div>`;
  }
  h += '</div>';

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
  h += `<p class="hint">🔒 Para expandir a fazenda, vá até um terreno bloqueado vizinho (🪙) e compre-o. Próximo lote: 🪙${fmt(core.plotCost())}.</p>`;
  return h;
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
  let h = canSell
    ? `<div class="barn-head">
    <div>Valor de venda: <b>🪙${fmt(total)}</b>${reserve ? `<small>Guarda ${reserve} 🌾 para os animais</small>` : ''}</div>
    <button class="btn" data-act="sellall" ${total ? '' : 'disabled'}>Vender tudo</button></div>`
    : `<div class="notice">🏗️ <b>O celeiro ainda está em obra.</b> Sua colheita fica guardada aqui, mas só dá para vender depois de construí-lo
      (${costText(BUILDINGS.celeiro.cost)}). Enquanto isso, entregue os 📦 pedidos da vila para ganhar moedas.
      <br><button class="btn alt" data-act="tab" data-id="oficina">🪚 Ver a Oficina</button></div>`;

  if (!ids.length) {
    h += '<p class="empty-msg">Seu celeiro está vazio. Vá colher algo! 🧺</p>';
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

  const seedIds = Object.keys(S.seeds).filter((id) => S.seeds[id] > 0);
  h += '<h3>🌱 Sementes guardadas</h3>';
  h += seedIds.length
    ? `<div class="chips">${seedIds.map((id) => `<span class="chip">${CROPS[id].icon} ${CROPS[id].name} ×${S.seeds[id]}</span>`).join('')}</div>`
    : '<p class="hint">Nenhuma semente. Compre na loja!</p>';

  const market = Object.keys(ITEMS).filter((id) => (CROPS[id] ? CROPS[id].level <= S.level : S.animals.some((a) => ANIMALS[a.type].product === id)));
  h += `<h3>📈 Mercado do dia ${core.dayOf(S.time)}</h3>`;
  h += `<div class="chips">${market.map((id) => `<span class="chip">${ITEMS[id].icon} 🪙${core.price(id)} ${trend(id)}</span>`).join('')}</div>`;
  h += '<p class="hint">Os preços mudam todo dia. ▲ = acima do normal, ▼ = abaixo.</p>';

  h += `<h3>📊 Estatísticas</h3><div class="stats">
    <div><b>${fmt(S.stats.harvest)}</b>colheitas</div>
    <div><b>${fmt(S.stats.earned)}</b>moedas ganhas</div>
    <div><b>${fmt(S.stats.orders)}</b>pedidos</div>
    <div><b>${fmt(S.stats.fish || 0)}</b>peixes</div>
    <div><b>${fmt(S.stats.mutated || 0)}</b>mutadas</div>
    <div><b>${fmt(S.stats.logs || 0)}</b>troncos</div>
    <div><b>${fmt(S.stats.planks || 0)}</b>tábuas</div>
    <div><b>${fmt(S.stats.crafted || 0)}</b>peças feitas</div></div>`;
  return h;
}

const PLURAL = { tronco: 'troncos', madeira: 'tábuas', viga: 'vigas' };
const costText = (cost) => Object.entries(cost).map(([id, q]) => `${q} ${PLURAL[id] || core.ITEMS[id].name.toLowerCase()} ${core.ITEMS[id].icon}`).join(' e ');

function workshopHtml() {
  const S = core.S;
  const io = (o) => Object.entries(o).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + ');
  let h = `<h3>${CARPENTRY.icon} ${CARPENTRY.name}</h3>
    <p class="hint" style="margin:0 0 8px">A mesa fica entre a casa e o celeiro. Escolha o que fazer, vá até ela e use a ação (segure para continuar) ou toque na mesa.</p>
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
  h += '</div><h3>🏗️ Obras</h3><div class="cards">';
  for (const [id, b] of Object.entries(BUILDINGS)) {
    const done = core.built(id);
    const prog = core.buildProgress(id);
    const missing = core.buildMissing(id);
    h += `<div class="card${done ? ' hired' : ''}">
      <div class="ico">${b.icon}</div>
      <div class="info"><b>${b.name}${done ? ' <small>✔ construído</small>' : ` <small>${Math.round(prog * 100)}%</small>`}</b>
        <small>${b.desc}</small>
        <small>${done ? 'Pronto!' : `Custa ${io(b.cost)} · falta ${missing.map((x) => `${x.qty} ${core.ITEMS[x.id].icon}`).join(' + ')}`}</small>
        ${done ? '' : `<div class="progress"><i style="width:${Math.round(prog * 100)}%"></i></div>`}</div>
      <div class="btns">${done ? '<span class="req">✔</span>' : '<span class="req">Entregue no canteiro</span>'}</div></div>`;
  }
  h += `</div><p class="hint">🪓 Corte árvores no bosque (oeste) para ter troncos. Leve a madeira até o canteiro 🏗️ de cada obra e use a ação para entregar: dá para entregar aos poucos.${S.saw.owned ? '' : ` Mais tarde, a ${SAWMILL.icon} Serraria faz tábuas sozinha.`}</p>`;
  return h;
}

function ordersHtml() {
  const S = core.S;
  let h = '<h3>📦 Pedidos da vila</h3><div class="cards">';
  S.orders.forEach((o, k) => {
    const ok = core.canFulfill(o);
    h += `<div class="order${ok ? ' ok' : ''}">
      <div class="who">${o.who}${core.isNewOrder(o) ? ' <span class="new-badge">Novo</span>' : ''}</div>
      <div class="reqs">${o.req.map((r) => {
        const have = Math.min(S.inv[r.id] || 0, r.qty);
        return `<span class="req-item${have >= r.qty ? ' done' : ''}">${core.ITEMS[r.id].icon} ${have}/${r.qty}</span>`;
      }).join('')}</div>
      <div class="order-foot">
        <span class="reward">🪙${core.fmt(o.coins)} · ⭐${o.xp} XP</span>
        <span class="btns">
          <button class="btn ghost" data-act="skip" data-k="${k}" title="Recusar e receber outro pedido">✖</button>
          <button class="btn" data-act="order" data-k="${k}" ${ok ? '' : 'disabled'}>Entregar</button>
        </span>
      </div></div>`;
  });
  h += '</div><p class="hint">Pedidos pagam bem mais do que o mercado. Recuse (✖) os que não te interessam. ✉️ A cartinha em cima do quadro de Pedidos avisa quando chega pedido novo.</p>';
  return h;
}

// ================= Hotbar =================
function renderToolbar() {
  const S = core.S;
  let h = '';
  const list = core.toolList();
  list.forEach((id, k) => {
    const key = k < 9 ? `<kbd>${k + 1}</kbd>` : '';
    if (id.startsWith('seed:') && (k === 0 || !list[k - 1].startsWith('seed:'))) h += '<span class="tool-sep"></span>';
    const active = core.tool === id ? ' active' : '';
    if (id.startsWith('seed:')) {
      const cid = id.slice(5), c = CROPS[cid], n = S.seeds[cid] || 0;
      h += `<button class="tool${active}${n ? '' : ' empty'}" data-tool="${id}" title="Sementes de ${c.name}">
        ${key}<span class="ti">${c.icon}</span><span class="tn">${c.name}</span><span class="cnt">${n}</span></button>`;
    } else {
      const t = core.TOOLS.find((x) => x.id === id);
      h += `<button class="tool${active}" data-tool="${id}" title="${t.name}">
        ${key}<span class="ti">${t.icon}</span><span class="tn">${t.name}</span></button>`;
    }
  });
  el.toolbar.innerHTML = h;
}

export function selectTool(id) {
  core.setTool(id);
  if (id.startsWith('seed:') && !core.S.seeds[id.slice(5)]) {
    toast(`Sem sementes de ${CROPS[id.slice(5)].name}. Compre na loja! 🏪`);
    openPanel('loja');
  }
}

export function selectToolByIndex(n) {
  const list = core.toolList();
  if (list[n]) selectTool(list[n]);
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
  setText(el.level, S.level);
  const need = core.xpNeed(S.level);
  el.xpfill.style.width = Math.min(100, (S.xp / need) * 100) + '%';
  setText(el.xptext, `${Math.floor(S.xp)}/${need} XP`);
  setText(el.day, `Dia ${core.dayOf(S.time)}`);
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
    toolbar: $('#toolbar'), status: $('#status'), prompt: $('#prompt'),
    panel: $('#panel'), tabContent: $('#tab-content'), badge: $('#badge'),
    fx: $('#fx'), toasts: $('#toasts'), modal: $('#modal'), btnSound: $('#btn-sound'), fade: $('#fade'),
  });

  el.toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (b) { selectTool(b.dataset.tool); b.blur(); }
  });
  $('#zoom-in').addEventListener('click', () => handlers.onZoom(1 / 1.2));
  $('#zoom-out').addEventListener('click', () => handlers.onZoom(1.2));
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
    else if (act === 'animal') core.buyAnimal(id);
    else if (act === 'upgrade') core.buyUpgrade(id);
    else if (act === 'hire') core.hireWorker(id);
    else if (act === 'fire') core.fireWorker(id);
    else if (act === 'field') core.buyField(id);
    else if (act === 'bigfield') core.buyBigField();
    else if (act === 'rod') core.buyRod(+id);
    else if (act === 'axe') core.buyAxe(+id);
    else if (act === 'sawmill') core.buySawmill();
    else if (act === 'bench') core.setBench(id);
    else if (act === 'tab') { openPanel(id); return; }
    else if (act === 'pet') core.buyPet();
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

  try { Sound.on = localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { /* ignora */ }
  setText(el.btnSound, Sound.on ? '🔊' : '🔇');
  el.btnSound.addEventListener('click', () => {
    Sound.on = !Sound.on;
    setText(el.btnSound, Sound.on ? '🔊' : '🔇');
    try { localStorage.setItem(SOUND_KEY, Sound.on ? '1' : '0'); } catch (e) { /* ignora */ }
    if (Sound.on) sfx('coin');
  });
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
  });

  markDirty('panel', 'toolbar');
}

export function uiFrame(dt) {
  if (dirty.has('toolbar')) { dirty.delete('toolbar'); renderToolbar(); }
  if (dirty.has('panel')) { dirty.delete('panel'); renderPanel(); }
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.1; renderHud(); }
}
