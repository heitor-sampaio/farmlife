/* FarmLife — tutorial interativo, dicas na hora certa e o Guia da Fazenda */
import {
  CROPS, ANIMALS, PRODUCTS, UPGRADES, WORKERS, FIELDS, BIG_FIELD, BIG_CELLS, MACHINES, FISH, RODS, PET, WATER_TIME, PEN_SIZE,
} from './data.js';
import * as core from './core.js';
import { sfx } from './audio.js';

const $ = (sel) => document.querySelector(sel);
let api = null; // funções do mundo e da interface (entregues pelo main.js)
let ready = false;
const el = {};

// ================= Textos que se adaptam ao aparelho =================
const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
const ACT = () => (isTouch() ? 'o botão <b>✋</b>' : '<kbd>Espaço</kbd> (ou <kbd>E</kbd>)');
const TAP = () => (isTouch() ? 'toque' : 'clique');

/** Tecla de atalho de uma ferramenta na barra (1–9), ou vazio. */
function keyOf(toolId) {
  const k = core.toolList().indexOf(toolId);
  return k >= 0 && k < 9 && !isTouch() ? ` (tecla <kbd>${k + 1}</kbd>)` : '';
}

// ================= Passos do tutorial =================
const STEPS = [
  {
    id: 'boas-vindas', icon: '🌻', title: 'Bem-vindo ao FarmLife!', intro: true,
    body: () => `Você herdou um pequeno terreno. Neste tutorial rápido você aprende o ciclo da fazenda:
      <div class="tut-flow"><span>🌱 Plantar</span><span>💧 Regar</span><span>🧺 Colher</span><span>🛖 Vender</span></div>
      Leva uns 3 minutos, e cada passo concluído dá moedas.`,
  },
  {
    id: 'andar', icon: '🚶', title: 'Ande pela fazenda', goal: 6, unit: 'm', reward: 0,
    body: () => (isTouch()
      ? 'Arraste o dedo em qualquer lugar da tela para andar: aparece um <b>joystick</b> embaixo do dedo. Um toque rápido no chão também leva o fazendeiro até lá.'
      : 'Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou as setas para andar (<kbd>Shift</kbd> corre). Você também pode clicar no chão para ir até lá.'),
  },
  {
    id: 'plantar', icon: '🌱', title: 'Plante trigo', event: 'plant', goal: 2, reward: 10, tool: 'seed:trigo',
    target: () => nearestTile((p) => p.s === 'tilled'),
    body: () => `1. Escolha a semente <b>🌾 Trigo</b> na barra de baixo${keyOf('seed:trigo')}.<br>
      2. Vá até a <b>terra arada</b> (marrom) que a seta mostra e use ${ACT()} de frente para ela, ou ${TAP()} no lote.
      ${core.S.seeds.trigo ? '' : '<br><b>Sem sementes?</b> Compre mais na 🏪 Loja.'}`,
  },
  {
    id: 'regar', icon: '💧', title: 'Regue as plantas', event: 'water', goal: 2, reward: 10, tool: 'regador',
    target: () => nearestTile((p) => p.s === 'planted' && !core.isWet(p)) ?? nearestTile((p) => p.s === 'planted' || p.s === 'tilled'),
    body: () => `As plantas <b>só crescem com a terra molhada</b>. Escolha o <b>💧 Regador</b>${keyOf('regador')} e regue o trigo que você plantou.
      O 💧 piscando em cima de um lote avisa que ele está com sede.`,
  },
  {
    id: 'arar', icon: '⛏️', title: 'Are a terra', event: 'till', goal: 2, reward: 10, tool: 'enxada',
    target: () => nearestTile((p) => p.s === 'grass'),
    body: () => `Para plantar em mais lugares, a grama precisa ser arada. Escolha a <b>⛏️ Enxada</b>${keyOf('enxada')} e use em dois lotes de grama.
      <br>💡 Segure ${ACT()} enquanto anda para trabalhar vários lotes seguidos.`,
  },
  {
    id: 'colher', icon: '🧺', title: 'Colha o trigo', event: 'harvest', goal: 2, reward: 15,
    target: () => nearestTile((p) => core.isReady(p)) ?? nearestTile((p) => p.s === 'planted'),
    body: () => `Regado, o trigo leva uns <b>20 segundos</b> para crescer. Quando aparecer o <b>✨</b>, use ${ACT()} ou ${TAP()} na planta para colher (qualquer ferramenta serve).
      <br>Enquanto espera, que tal plantar e regar mais?`,
  },
  {
    id: 'vender', icon: '🛖', title: 'Venda no Celeiro', event: 'sell', goal: 1, reward: 20,
    target: () => ({ spot: 'celeiro' }),
    body: () => `Siga a seta até o <b>🛖 Celeiro</b> e use ${ACT()} para abrir (ou o botão 🛖 no topo). Venda o seu trigo.
      <br>Os preços mudam todo dia: <b class="up">▲</b> está caro, <b class="down">▼</b> está barato.`,
  },
  {
    id: 'loja', icon: '🏪', title: 'Compre sementes', event: 'buy-seed', goal: 1, reward: 20,
    target: () => ({ spot: 'loja' }),
    body: () => `Agora visite a <b>🏪 Loja</b> e compre mais sementes. Lá também ficam animais, o pet, a vara de pesca, melhorias, campos e máquinas, liberados conforme o seu nível.`,
  },
  {
    id: 'pedidos', icon: '📦', title: 'Conheça os pedidos', event: 'panel', match: 'pedidos', goal: 1, reward: 20,
    target: () => ({ spot: 'pedidos' }),
    body: () => `Os moradores da vila fazem <b>📦 Pedidos</b> que pagam bem mais que o mercado. Abra o quadro de pedidos para ver o que eles querem.`,
  },
  {
    id: 'fim', icon: '🏆', title: 'Tutorial completo!', final: true, reward: 100, xp: 20,
    body: () => `Você aprendeu o básico e ganhou <b>🪙100</b> e <b>20 XP</b>. Seus próximos objetivos:
      ${roadmapHtml(3)}
      O botão <b>❓</b> no topo abre o <b>Guia da Fazenda</b> a qualquer momento.`,
  },
];
const PLAY_STEPS = STEPS.filter((s) => !s.intro && !s.final).length;

// ================= Dicas na hora certa =================
const TIPS = {
  level2: {
    title: 'Nível 2: animais e pet!', target: { spot: 'loja' },
    body: () => `Na 🏪 Loja agora você pode comprar 🐔 <b>galinhas</b> (botam 🥚) e adotar uma 🐶 <b>border collie</b>. A 🎣 <b>vara de pesca</b> já está à venda desde o começo.`,
  },
  animal: {
    title: 'Cuidando dos animais', target: { spot: 'cocho' },
    body: () => `Os animais vivem no <b>Curral</b>, a oeste. Eles comem 🌾 <b>trigo</b>: chegue perto de um e use ${ACT()}, ou use o <b>cocho</b> (a seta) para alimentar todos.
      Quando aparecer o produto (🥚) em cima deles, colete e venda.`,
  },
  pet: {
    title: () => `${core.S.pet.name} chegou!`,
    body: () => `Sua border collie segue você pela fazenda, senta quando você para e adora correr atrás dos passarinhos.
      Chegue perto e use ${ACT()} para fazer <b>carinho</b> (+${PET.xp} XP por dia). Dá para trocar o nome na Loja.`,
  },
  rod: {
    title: 'Hora de pescar', target: { pond: true },
    body: () => `Escolha a <b>🎣 Pescar</b> na barra, vá até a beira do <b>lago</b> e use ${ACT()} (ou ${TAP()} na água) para lançar.
      Quando aparecer o <b>❗</b>, puxe rápido. Depois <b>segure</b> ${ACT()} para subir a faixa verde e manter o peixe dentro dela.`,
  },
  worker: {
    title: 'Funcionários', target: null,
    body: () => `Seus funcionários andam pela fazenda e trabalham sozinhos, até quando você está fora do jogo.
      Eles cobram <b>salário no começo de cada dia</b> (hoje: 🪙${core.fmt(core.dailyWages())}). Sem dinheiro, pedem demissão.`,
  },
  field: {
    title: 'Campo novo!', target: (id) => ({ field: id }),
    body: () => `Seu novo campo já está com a grama pronta para arar. Siga a seta até ele. 💡 Os funcionários também trabalham lá.`,
  },
  bigfield: {
    title: 'Campo de Trigo', target: { big: true },
    body: () => `O ${BIG_FIELD.icon} <b>${BIG_FIELD.name}</b> fica a leste, depois do Campo do Leste. Ele é grande demais para a enxada:
      compre as <b>máquinas</b> na Loja e trabalhe dirigindo. O trigo de lá cresce <b>sem rega</b>.`,
  },
  machine: {
    title: 'Dirigindo máquinas', target: (id) => ({ machine: id }),
    body: () => `Sua máquina está no <b>🚜 Galpão</b>. Chegue perto e use ${ACT()} para entrar. Dirija com
      ${isTouch() ? 'o <b>joystick</b>' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'}: ela vira aos poucos para onde você aponta e trabalha por onde passa.
      Ciclo: <b>arar → plantar → esperar → colher</b>. Use ${ACT()} de novo para sair.`,
  },
  night: {
    title: 'Anoiteceu 🌙', target: { spot: 'casa' },
    body: () => `As plantas continuam crescendo à noite. Se quiser pular para a manhã, entre na sua 🏠 <b>Casa</b> e durma (depois das 18h).
      À noite aparecem mais 🐡 bagres no lago e vaga-lumes pela fazenda.`,
  },
  rain: {
    title: 'Dia de chuva 🌧️', target: null,
    body: () => `Hoje a chuva <b>rega tudo sozinha</b>: pode deixar o regador de lado. Na chuva também aparecem mais 🦞 lagostins no lago.`,
  },
  order: {
    title: 'Pedido pronto!', target: { spot: 'pedidos' },
    body: () => `Você já tem tudo o que um dos pedidos da vila pede. Vá até o 📦 <b>quadro de Pedidos</b> e entregue: paga bem mais que o mercado.`,
  },
  level6: {
    title: 'Nível 6: lavoura mecanizada!', target: { spot: 'loja' },
    body: () => `Agora você pode comprar o ${BIG_FIELD.icon} <b>${BIG_FIELD.name}</b> (${BIG_CELLS} lotes) e as <b>máquinas</b>: trator com arado, trator com plantadeira e, no nível 7, a colheitadeira.`,
  },
};
const tipQueue = [];
let currentTip = null;
let tipTargetArg = null;

function queueTip(key, arg) {
  const T = core.S.tutorial;
  if (T.tips[key] || tipQueue.some((t) => t.key === key) || (currentTip && currentTip.key === key)) return;
  T.tips[key] = true;
  tipQueue.push({ key, arg });
}

// ================= Estado e cartão =================
let stepFlash = 0;         // tempo mostrando "✔ Muito bem!"
let walked = 0;
let lastPos = null;
let minimized = false;
let condTimer = 0;

const T = () => core.S.tutorial;
const active = () => !T().done;
const step = () => STEPS[Math.min(T().step, STEPS.length - 1)];

function nearestTile(pred) {
  const P = api.playerPos();
  let best = null, bd = Infinity;
  core.S.plots.forEach((p, i) => {
    if (!core.plotVisible(i) || !pred(p)) return;
    const t = api.tilePos(i);
    const d = Math.hypot(t.x - P.x, t.z - P.z);
    if (d < bd) { bd = d; best = i; }
  });
  return best === null ? null : { tile: best };
}

function render() {
  if (!ready) return;
  const card = el.card;
  // Fica logo abaixo do HUD (que quebra em mais linhas em telas estreitas)
  card.style.top = Math.round(document.querySelector('.hud').getBoundingClientRect().bottom + 6) + 'px';
  if (active()) {
    const s = step();
    const n = STEPS.indexOf(s);
    card.hidden = false;
    card.className = 'tut' + (minimized ? ' min' : '') + (stepFlash > 0 ? ' flash' : '');
    el.stepLabel.textContent = s.intro ? 'Tutorial' : s.final ? 'Tutorial concluído' : `Passo ${n} de ${PLAY_STEPS}`;
    el.icon.textContent = stepFlash > 0 ? '✔' : s.icon;
    el.title.textContent = stepFlash > 0 ? 'Muito bem!' : s.title;
    el.body.innerHTML = stepFlash > 0 ? `<p class="tut-ok">${flashText}</p>` : s.body();
    const goal = s.goal || 0;
    const prog = s.id === 'andar' ? Math.min(goal, Math.floor(walked)) : Math.min(goal, T().count);
    el.progress.hidden = !goal || stepFlash > 0;
    el.progress.querySelector('i').style.width = goal ? (prog / goal) * 100 + '%' : '0';
    el.progress.querySelector('span').textContent = goal ? `${prog}/${goal}${s.unit ? ' ' + s.unit : ''}` : '';
    el.skip.hidden = !!s.final;
    el.next.hidden = !(s.intro || s.final);
    el.next.textContent = s.intro ? 'Começar ▶' : 'Jogar!';
    el.extra.hidden = !s.final;
    return;
  }
  if (currentTip) {
    const tip = TIPS[currentTip.key];
    card.hidden = false;
    card.className = 'tut tip' + (minimized ? ' min' : '');
    el.stepLabel.textContent = '💡 Dica';
    el.icon.textContent = '💡';
    el.title.textContent = typeof tip.title === 'function' ? tip.title() : tip.title;
    el.body.innerHTML = tip.body();
    el.progress.hidden = true;
    el.skip.hidden = true;
    el.next.hidden = false;
    el.next.textContent = 'Entendi';
    el.extra.hidden = true;
    return;
  }
  card.hidden = true;
}

let flashText = '';
function completeStep() {
  const s = step();
  if (s.reward || s.xp) core.giveReward(s.reward || 0, s.xp || 0);
  api.setGuide(null);
  clearToolHint();
  flashText = s.reward ? `Passo concluído! <b>+🪙${s.reward}</b>` : 'Passo concluído!';
  sfx('coin');
  stepFlash = 1.4;
  render();
}

function advance() {
  const t = T();
  t.step = Math.min(t.step + 1, STEPS.length - 1);
  t.count = 0;
  walked = 0;
  minimized = false;
  const s = step();
  if (s.final) {
    core.giveReward(s.reward, s.xp);
    sfx('level');
  }
  render();
}

function finishTutorial() {
  T().done = true;
  api.setGuide(null);
  clearToolHint();
  render();
}

function skipTutorial() {
  finishTutorial();
  api.toast('Tutorial pulado. Você pode refazer quando quiser pelo ❓ Guia.');
}

/** Recomeça o tutorial do início (botão do Guia). */
export function restartTutorial() {
  const t = T();
  Object.assign(t, { step: 0, count: 0, done: false });
  walked = 0;
  minimized = false;
  currentTip = null;
  closeGuide();
  render();
}

function onNext() {
  if (active()) {
    const s = step();
    if (s.intro) advance();
    else if (s.final) finishTutorial();
    return;
  }
  if (currentTip) {
    currentTip = null;
    api.setGuide(null);
    render();
  }
}

// ================= Eventos do jogo =================
export function onEvent(name, data) {
  if (!ready || !core.S) return;
  // Dicas por evento (aparecem depois do tutorial)
  if (name === 'animal') queueTip('animal');
  else if (name === 'pet') queueTip('pet');
  else if (name === 'rod') queueTip('rod');
  else if (name === 'worker') queueTip('worker');
  else if (name === 'field') queueTip('field', data);
  else if (name === 'bigfield') queueTip('bigfield');
  else if (name === 'machine') queueTip('machine', data);
  else if (name === 'level') {
    if (data >= 2) queueTip('level2');
    if (data >= 6) queueTip('level6');
  }

  if (!active() || stepFlash > 0) return;
  const s = step();
  if (!s.event || s.event !== name) return;
  if (s.match && s.match !== data) return;
  T().count++;
  if (T().count >= s.goal) completeStep();
  else render();
}

// ================= Quadro =================
export function tutorialFrame(dt) {
  if (!ready || !core.S) return;

  if (stepFlash > 0) {
    stepFlash -= dt;
    if (stepFlash <= 0) advance();
    return;
  }

  if (active()) {
    const s = step();
    // Passo de andar: mede a distância percorrida
    const P = api.playerPos();
    if (lastPos) {
      const d = Math.hypot(P.x - lastPos.x, P.z - lastPos.z);
      if (s.id === 'andar' && d < 1) {
        walked += d;
        if (Math.floor(walked) !== Math.floor(walked - d)) render();
        if (walked >= s.goal) completeStep();
      }
    }
    lastPos = { x: P.x, z: P.z };
    api.setGuide(s.target ? s.target() : null);
    setToolHint(s.tool && core.tool !== s.tool ? s.tool : null);
    return;
  }

  // Dicas por condição (checadas de vez em quando)
  condTimer -= dt;
  if (condTimer <= 0) {
    condTimer = 1;
    const S = core.S;
    if (core.darkness() > 0.6) queueTip('night');
    if (S.weather === 'chuva') queueTip('rain');
    if (S.orders.some(core.canFulfill)) queueTip('order');
  }
  if (!currentTip && tipQueue.length && !document.querySelector('.panel.open') && el.modal.hidden) {
    currentTip = tipQueue.shift();
    minimized = false;
    render();
  }
  if (currentTip) {
    const tip = TIPS[currentTip.key];
    const target = typeof tip.target === 'function' ? tip.target(currentTip.arg) : tip.target;
    api.setGuide(target || null);
  }
}

// Ferramenta piscando na barra
let hinted = null;
function setToolHint(id) {
  if (hinted !== id) clearToolHint();
  hinted = id;
  if (!id) return;
  const b = document.querySelector(`.tool[data-tool="${id}"]`);
  if (b && !b.classList.contains('hint')) b.classList.add('hint');
}
function clearToolHint() {
  document.querySelectorAll('.tool.hint').forEach((b) => b.classList.remove('hint'));
  hinted = null;
}

// ================= Guia da Fazenda =================
function roadmap() {
  const L = {};
  const add = (lv, txt) => (L[lv] = L[lv] || []).push(txt);
  for (const c of Object.values(CROPS)) add(c.level, `${c.icon} ${c.name}`);
  for (const a of Object.values(ANIMALS)) add(a.level, `${a.icon} ${a.name}`);
  for (const u of Object.values(UPGRADES)) u.req.forEach((lv, k) => add(lv, `${u.icon} ${u.name}${u.costs.length > 1 ? ` (nv ${k + 1})` : ''}`));
  for (const w of Object.values(WORKERS)) add(w.level, `${w.icon} ${w.name}`);
  for (const f of FIELDS) if (f.cost) add(f.level, `${f.icon} ${f.name}`);
  add(BIG_FIELD.level, `${BIG_FIELD.icon} ${BIG_FIELD.name}`);
  for (const m of Object.values(MACHINES)) add(m.level, `🚜 ${m.name}`);
  RODS.forEach((r) => r && add(r.level, `${r.icon} ${r.name}`));
  add(PET.level, `${PET.icon} Pet (${PET.breed})`);
  return L;
}

function roadmapHtml(count) {
  const L = roadmap();
  const lv = core.S.level;
  const next = Object.keys(L).map(Number).filter((n) => n > lv).sort((a, b) => a - b).slice(0, count);
  if (!next.length) return '<p>Você já liberou tudo! 🎉</p>';
  return `<ul class="tut-goals">${next.map((n) => `<li><b>Nível ${n}:</b> ${L[n].join(', ')}</li>`).join('')}</ul>`;
}

const lock = (lv) => (lv > core.S.level ? ` <span class="g-lock">🔒 Nv ${lv}</span>` : '');
const table = (head, rows) => `<div class="g-table-wrap"><table class="g-table${head[0] === '' ? ' has-ico' : ''}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const dur = (s) => core.fmtDuration(s);

const TOPICS = [
  {
    id: 'inicio', icon: '🌻', title: 'Primeiros passos',
    html: () => `<p>O FarmLife gira em torno de um ciclo simples:</p>
      <div class="tut-flow big"><span>⛏️ Arar</span><span>🌱 Plantar</span><span>💧 Regar</span><span>🧺 Colher</span><span>🛖 Vender</span><span>🏪 Comprar</span></div>
      <p>Com o dinheiro, você compra sementes melhores, animais, melhorias e terreno. Cada colheita, produto e pedido dá <b>XP</b>, e cada nível libera coisas novas (veja <b>🏆 Progressão</b>).</p>
      <p>O jogo salva sozinho, e a fazenda continua crescendo enquanto você está fora (até 8 horas).</p>
      <button class="btn" data-guide="restart">🔁 Refazer o tutorial</button>`,
  },
  {
    id: 'controles', icon: '🎮', title: 'Controles',
    html: () => {
      const t = isTouch();
      return `<p>Você está jogando ${t ? 'pelo <b>celular/toque</b>' : 'com <b>teclado e mouse</b>'}, mas as duas formas funcionam.</p>` + table(
        ['Ação', `Teclado e mouse${t ? '' : ' ✔'}`, `Toque${t ? ' ✔' : ''}`],
        [
          ['Andar', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / setas · <kbd>Shift</kbd> corre', 'Arrastar o dedo (joystick)'],
          ['Ir até um lugar', 'Clique no chão', 'Toque rápido no chão'],
          ['Usar a ferramenta / interagir', '<kbd>Espaço</kbd> ou <kbd>E</kbd>', 'Botão ✋'],
          ['Repetir em vários lotes', 'Segurar <kbd>Espaço</kbd> e andar · arrastar o mouse sobre os lotes', 'Segurar ✋ e andar'],
          ['Ir até um lote e agir', 'Clique no lote', 'Toque no lote'],
          ['Escolher ferramenta/semente', '<kbd>1</kbd> a <kbd>9</kbd>', 'Barra de baixo'],
          ['Zoom', 'Roda do mouse · <kbd>+</kbd> <kbd>−</kbd>', 'Botões ＋ e －'],
          ['Fechar janelas', '<kbd>Esc</kbd>', '✕'],
        ],
      );
    },
  },
  {
    id: 'lavoura', icon: '🌱', title: 'Lavoura',
    html: () => `<p><b>Are</b> a grama com a ⛏️ enxada, <b>plante</b> a semente na terra arada e <b>regue</b> com o 💧 regador:
      sem água, nada cresce (a água dura ${WATER_TIME[core.S.up.regador]}s com o seu regador). Quando aparecer o ✨, <b>colha</b> com qualquer ferramenta.
      Culturas com 🔁 <b>rebrotam</b> depois da colheita.</p>` + table(
      ['', 'Cultura', 'Cresce em', 'Semente', 'Vende', 'Nível'],
      Object.values(CROPS).map((c) => [c.icon, `${c.name}${c.regrow ? ' 🔁' : ''}`, dur(c.time), `🪙${c.seed}`, `🪙${c.sell}`, `${c.level}${lock(c.level)}`]),
    ) + `<p>💡 Melhorias da loja: <b>regador reforçado</b> (água dura mais), <b>adubo</b> (cresce mais rápido) e <b>aspersores</b> (rega tudo sozinho).</p>`,
  },
  {
    id: 'dinheiro', icon: '💰', title: 'Vender e comprar',
    html: () => `<ul class="g-list">
      <li>🛖 <b>Celeiro:</b> venda colheitas, produtos e peixes. Os preços mudam todo dia (<b class="up">▲</b> caro, <b class="down">▼</b> barato), então às vezes vale esperar.</li>
      <li>📦 <b>Pedidos:</b> os moradores pagam <b>bem mais</b> que o mercado e dão XP extra. Recuse (✖) os que não interessam para receber outro.</li>
      <li>🏪 <b>Loja:</b> sementes, campos, pet, pesca, máquinas, animais, funcionários e melhorias.</li>
      <li>🔒 <b>Terrenos:</b> no campo principal, os lotes bloqueados com 🪙 ao lado dos seus podem ser comprados um a um (próximo: 🪙${core.fmt(core.plotCost())}).</li>
      <li>"<b>Vender tudo</b>" guarda 1 🌾 trigo por animal, para alimentá-los.</li></ul>`,
  },
  {
    id: 'animais', icon: '🐔', title: 'Animais',
    html: () => `<p>Os animais vivem no <b>Curral</b>, a oeste. Cada um come <b>1 🌾 trigo</b> por ciclo: alimente chegando perto (${ACT()}) ou use o <b>cocho</b> para todos.
      Quando o produto aparece em cima dele, colete e venda. O <b>⚙️ alimentador automático</b> (melhoria) alimenta sozinho com o trigo do celeiro.</p>` + table(
      ['', 'Animal', 'Custa', 'Produz', 'A cada', 'Nível'],
      Object.values(ANIMALS).map((a) => [a.icon, a.name, `🪙${core.fmt(a.cost)}`, `${PRODUCTS[a.product].icon} ${PRODUCTS[a.product].name} (🪙${PRODUCTS[a.product].sell})`, dur(a.time), `${a.level}${lock(a.level)}`]),
    ) + `<p>💡 O curral começa com ${PEN_SIZE[0]} vagas; a melhoria <b>Curral maior</b> aumenta.</p>`,
  },
  {
    id: 'pesca', icon: '🎣', title: 'Pescaria',
    html: () => `<ol class="g-list">
      <li>Compre uma <b>vara</b> na loja e escolha a 🎣 <b>Pescar</b> na barra.</li>
      <li>Vá até a beira do <b>lago</b> e use ${ACT()} (ou ${TAP()} na água) para lançar.</li>
      <li>Quando aparecer o <b>❗</b>, puxe rápido!</li>
      <li>No minigame, <b>segure</b> ${ACT()} para subir a faixa verde e solte para descer. Mantenha o peixe dentro dela até a barra encher.</li></ol>` + table(
      ['', 'Pesca', 'Vende', 'Dificuldade', 'Quando'],
      Object.values(FISH).map((f) => [f.icon, f.name, `🪙${f.sell}`, '★'.repeat(Math.max(1, Math.round(f.dif * 5))), f.night ? 'Mais à noite' : f.rain ? 'Mais na chuva' : f.rare ? 'Rara (vara de fibra ajuda)' : f.junk ? 'Ops…' : 'Sempre']),
    ) + table(['Vara', 'Custa', 'Nível', 'Vantagem'], RODS.filter(Boolean).map((r) => [`${r.icon} ${r.name}`, `🪙${core.fmt(r.cost)}`, `${r.level}${lock(r.level)}`, r.desc])),
  },
  {
    id: 'pet', icon: '🐶', title: 'Pet',
    html: () => `<p>No nível ${PET.level}, adote uma <b>border collie</b> na loja (🪙${PET.cost}). Ela segue você por toda a fazenda (até correndo atrás das máquinas),
      senta quando você para e adora espantar passarinhos.</p>
      <p>Chegue perto e use ${ACT()} para fazer <b>carinho</b>: ela pula de alegria e você ganha <b>+${PET.xp} XP</b> uma vez por dia. Troque o nome na loja.</p>
      <p>🐸 A fazenda também tem sapos, passarinhos, joaninhas, borboletas, coelhos, patos e vaga-lumes à noite. Eles só enfeitam: chegue perto para ver como reagem!</p>`,
  },
  {
    id: 'ajudantes', icon: '👷', title: 'Funcionários',
    html: () => `<p>Funcionários andam pela fazenda e trabalham sozinhos, inclusive com o jogo fechado. Eles cobram <b>salário no começo de cada dia</b>;
      se faltar dinheiro, pedem demissão.</p>` + table(
      ['', 'Funcionário', 'O que faz', 'Contratação', 'Salário', 'Nível'],
      Object.values(WORKERS).map((w) => [w.icon, w.name, w.desc, `🪙${core.fmt(w.hire)}`, `🪙${w.wage}/dia`, `${w.level}${lock(w.level)}`]),
    ),
  },
  {
    id: 'expansao', icon: '🗺️', title: 'Campos e máquinas',
    html: () => `<p>Além do campo principal, compre <b>campos inteiros</b> na loja. Eles aparecem no mapa com placas 🪧 de "à venda".</p>` + table(
      ['', 'Campo', 'Lotes', 'Custa', 'Nível'],
      FIELDS.filter((f) => f.cost).map((f) => [f.icon, f.name, f.count, `🪙${core.fmt(f.cost)}`, `${f.level}${lock(f.level)}`])
        .concat([[BIG_FIELD.icon, `${BIG_FIELD.name} (só trigo, sem rega)`, BIG_CELLS, `🪙${core.fmt(BIG_FIELD.cost)}`, `${BIG_FIELD.level}${lock(BIG_FIELD.level)}`]]),
    ) + `<p>O <b>${BIG_FIELD.name}</b> é trabalhado com <b>máquinas que você dirige</b>. Elas ficam no 🚜 Galpão: chegue perto e use ${ACT()} para entrar,
      dirija com ${isTouch() ? 'o joystick' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'} e use ${ACT()} de novo para sair.</p>` + table(
      ['Máquina', 'O que faz', 'Custa', 'Nível'],
      Object.values(MACHINES).map((m) => [`${m.icon} ${m.name}`, m.desc, `🪙${core.fmt(m.cost)}`, `${m.level}${lock(m.level)}`]),
    ) + '<p>💡 A plantadeira usa as suas sementes de trigo: compre o <b>saco ×50</b> na loja.</p>',
  },
  {
    id: 'tempo', icon: '🌦️', title: 'Tempo e clima',
    html: () => `<ul class="g-list">
      <li>☀️ Um dia dura <b>3 minutos</b>. Ao amanhecer os preços mudam e os salários são pagos.</li>
      <li>🌙 À noite as plantas continuam crescendo. Depois das 18h, durma na 🏠 <b>Casa</b> para pular para a manhã.</li>
      <li>🌧️ Na chuva, tudo fica regado sozinho.</li>
      <li>💾 O jogo salva sozinho. Fechou o jogo? A fazenda continua: plantas crescem, animais produzem e funcionários trabalham (até 8 horas).</li></ul>`,
  },
  {
    id: 'progresso', icon: '🏆', title: 'Progressão',
    html: () => {
      const L = roadmap();
      const lv = core.S.level;
      return `<p>Você está no <b>nível ${lv}</b>. Ganhe XP colhendo, coletando, pescando, entregando pedidos e fazendo carinho no pet.</p>
        <div class="g-road">${Object.keys(L).map(Number).sort((a, b) => a - b).map((n) => `
          <div class="g-lv${n <= lv ? ' done' : ''}${n === lv + 1 ? ' next' : ''}"><b>Nível ${n}${n <= lv ? ' ✔' : ''}</b><span>${L[n].join(' · ')}</span></div>`).join('')}</div>`;
    },
  },
];
let currentTopic = 'inicio';

export function openGuide(topic) {
  if (topic) currentTopic = topic;
  el.nav.innerHTML = TOPICS.map((t) => `<button class="g-nav${t.id === currentTopic ? ' active' : ''}" data-topic="${t.id}"><span>${t.icon}</span>${t.title}</button>`).join('');
  const t = TOPICS.find((x) => x.id === currentTopic) || TOPICS[0];
  el.content.innerHTML = `<h3>${t.icon} ${t.title}</h3>${t.html()}`;
  el.content.scrollTop = 0;
  el.modal.hidden = false;
}

function closeGuide() { el.modal.hidden = true; }

// ================= Inicialização =================
export function initTutorial(a) {
  api = a;
  Object.assign(el, {
    card: $('#tut'), stepLabel: $('#tut-step'), icon: $('#tut-icon'), title: $('#tut-title'), body: $('#tut-body'),
    progress: $('#tut-progress'), skip: $('#tut-skip'), next: $('#tut-next'), extra: $('#tut-guide'), min: $('#tut-min'),
    modal: $('#modal'), nav: $('#guide-nav'), content: $('#guide-content'),
  });
  el.next.addEventListener('click', onNext);
  el.skip.addEventListener('click', skipTutorial);
  el.extra.addEventListener('click', () => { finishTutorial(); openGuide('inicio'); });
  el.min.addEventListener('click', () => { minimized = !minimized; render(); });
  el.card.querySelector('.tut-title').addEventListener('click', () => { if (minimized) { minimized = false; render(); } });
  el.nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (b) openGuide(b.dataset.topic);
  });
  el.content.addEventListener('click', (e) => {
    if (e.target.closest('[data-guide="restart"]')) restartTutorial();
  });
  $('#guide-close').addEventListener('click', closeGuide);
  ready = true;
  render();
}

/** Depois de recomeçar o jogo do zero. */
export function onReset() {
  currentTip = null;
  tipQueue.length = 0;
  walked = 0;
  stepFlash = 0;
  minimized = false;
  render();
}
