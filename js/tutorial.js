/* FarmLife — tutorial interativo, dicas na hora certa e o Guia da Fazenda */
import {
  CROPS, ANIMALS, PRODUCTS, UPGRADES, WORKERS, FIELDS, BIG_FIELD, BIG_CELLS, MACHINES, FISH, RODS, PET, WATER_TIME, PEN_SIZE,
  WEATHER_EVENTS, MUTATIONS, RARITY_COLOR, EVENT_ROUND, EVENT_CHANCE, AXES, LOG, WOOD, SAWMILL, PLANK,
  BEAM, RECIPES, BUILDINGS, CARPENTRY, CHOP_TREES,
} from './data.js';
import * as core from './core.js';
import { CHANGELOG, VERSION, compareVersions } from './changelog.js';
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
  const tools = core.toolList().filter((id) => !id.startsWith('seed:'));
  const k = toolId.startsWith('seed:') ? tools.length : tools.indexOf(toolId);
  return k >= 0 && k < 9 && !isTouch() ? ` (tecla <kbd>${k + 1}</kbd>)` : '';
}

// ================= Passos do tutorial =================
const STEPS = [
  {
    id: 'boas-vindas', icon: '🌻', title: 'Bem-vindo ao FarmLife!', intro: true,
    body: () => `Você herdou um pequeno terreno, uma casa e as ferramentas do seu avô. O resto, você vai construir com madeira! Neste tutorial você aprende:
      <div class="tut-flow"><span>🌱 Plantar</span><span>💧 Regar</span><span>🧺 Colher</span><span>🪓 Cortar</span><span>🪚 Serrar</span><span>🛖 Construir</span><span>💰 Vender</span></div>
      Leva uns 6 minutos, e cada passo concluído dá moedas.`,
  },
  {
    id: 'andar', icon: '🚶', title: 'Ande pela fazenda', goal: 6, unit: 'm', reward: 0,
    body: () => (isTouch()
      ? 'Arraste o dedo na <b>metade esquerda</b> da tela para andar: aparece um <b>joystick</b> embaixo do dedo. Arrastar na metade direita gira a câmera, e um toque rápido no chão leva o fazendeiro até lá.'
      : 'Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou as setas para andar (<kbd>Shift</kbd> corre). Você também pode clicar no chão para ir até lá, e girar a câmera arrastando com o <b>botão direito</b>.'),
  },
  {
    id: 'plantar', icon: '🌱', title: 'Plante trigo', event: 'plant', goal: 2, reward: 10, tool: 'seed:trigo',
    target: () => nearestTile((p) => p.s === 'tilled'),
    body: () => `1. Escolha as <b>🌾 sementes de Trigo</b> no botão de sementes da barra de baixo${keyOf('seed:trigo')}. Toque nele de novo (ou na ▲) para trocar de semente.<br>
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
    id: 'cortar', icon: '🪓', title: 'Corte uma árvore', event: 'chop', goal: 1, reward: 10, tool: 'machado',
    target: () => nearestTree(),
    body: () => `Para vender a colheita você precisa de um <b>🛖 Celeiro</b>, e ele é feito de madeira. Siga a seta até o <b>bosque</b>, escolha o <b>🪓 Machado</b>${keyOf('machado')}
      e use ${ACT()} perto de uma árvore (segure para continuar), ou ${TAP()} nela. Cada árvore derrubada dá ${WOOD.logs[0]}–${WOOD.logs[1]} 🪵 troncos.`,
  },
  {
    id: 'serrar', icon: '🪚', title: 'Serre tábuas', event: 'craft', match: 'tabuas', goal: 2, reward: 10,
    target: () => ({ spot: 'mesa' }),
    body: () => `Leve os troncos até a <b>${CARPENTRY.icon} ${CARPENTRY.name}</b> (a seta, entre a casa e o celeiro). Com <b>Tábuas</b> escolhido, use ${ACT()} na mesa
      (segure para continuar) ou ${TAP()} nela: a cada 3 golpes de serrote, 1 🪵 vira 2 🟫 tábuas.`,
  },
  {
    id: 'construir', icon: '🏗️', title: 'Construa o celeiro', event: 'build', match: 'celeiro', goal: 1, reward: 30, live: true,
    done: () => core.built('celeiro'),
    target: () => {
      const miss = core.buildMissing('celeiro');
      const has = miss.some((x) => (core.S.inv[x.id] || 0) > 0);
      if (has) return { spot: 'celeiro' };
      const needBeam = miss.some((x) => x.id === 'viga');
      const inv = core.S.inv;
      if ((inv.tronco || 0) > 0 || (needBeam && (inv.madeira || 0) >= 3)) return { spot: 'mesa' };
      return nearestTree();
    },
    body: () => {
      const miss = core.buildMissing('celeiro');
      const inv = core.S.inv;
      const cost = Object.entries(BUILDINGS.celeiro.cost).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + ');
      return `O celeiro custa <b>${cost}</b>. As <b>📏 vigas</b> também saem da mesa: abra a <b>🪚 Oficina</b> (botão no topo) e escolha <b>Viga</b> (3 🟫 → 1 📏).
        Leve a madeira até o <b>canteiro 🏗️</b> do celeiro e use ${ACT()} para entregar (dá para entregar aos poucos).
        <br>Falta: <b>${miss.map((x) => `${x.qty} ${core.ITEMS[x.id].icon}`).join(' + ') || 'nada!'}</b> · você tem 🪵${inv.tronco || 0} 🟫${inv.madeira || 0} 📏${inv.viga || 0}`;
    },
  },
  {
    id: 'vender', icon: '🛖', title: 'Venda no Celeiro', event: 'sell', goal: 1, reward: 20,
    target: () => ({ spot: 'celeiro' }),
    body: () => `Celeiro pronto! Use ${ACT()} nele para abrir (ou o botão 🛖 no topo) e venda o seu trigo.
      <br>Os preços mudam todo dia: <b class="up">▲</b> está caro, <b class="down">▼</b> está barato.`,
  },
  {
    id: 'loja', icon: '🏪', title: 'Compre sementes', event: 'buy-seed', goal: 1, reward: 20,
    target: () => ({ spot: 'loja' }),
    body: () => `Agora visite a <b>🏪 Loja</b> e compre mais sementes. Lá também ficam animais, o pet, ferramentas melhores, melhorias, campos e máquinas, liberados conforme o seu nível.`,
  },
  {
    id: 'pedidos', icon: '📦', title: 'Conheça os pedidos', event: 'panel', match: 'pedidos', goal: 1, reward: 20,
    target: () => ({ spot: 'pedidos' }),
    body: () => `Os moradores da vila fazem <b>📦 Pedidos</b> que pagam bem mais que o mercado. Eles ficam no <b>quadro de Pedidos</b> (a seta): use ${ACT()} nele para ver o que eles querem.
      Quando aparecer a <b>cartinha ✉️</b> em cima do quadro, tem pedido novo ou pronto para entregar.`,
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
    body: () => `Na 🏪 Loja agora você pode adotar uma 🐶 <b>border collie</b> e comprar 🐔 <b>galinhas</b> (botam 🥚)${core.built('curral') ? '' : `, mas antes construa o 🐾 <b>Curral</b> com madeira (${costTxt('curral')}): o canteiro fica no portão do curral, a oeste`}.`,
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
    body: () => `Você tem uma 🎣 <b>vara de pesca</b>! Escolha a <b>🎣 Pescar</b> na barra, vá até a beira do <b>lago</b> e use ${ACT()} (ou ${TAP()} na água) para lançar.
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
  axe: {
    title: 'Hora de cortar lenha', target: () => nearestTree(),
    body: () => `Você tem um 🪓 <b>machado</b>! O <b>bosque</b> fica a oeste (siga a seta). Com a 🪓 <b>Machado</b> selecionado, chegue perto de uma árvore e use ${ACT()}, ou ${TAP()} na árvore para o fazendeiro cortar até ela cair.
      Os 🪵 <b>troncos</b> viram tábuas e vigas na ${CARPENTRY.icon} mesa de carpintaria, para construir. A árvore volta a crescer depois de um tempo.`,
  },
  bench: {
    title: 'Mesa de carpintaria', target: { spot: 'mesa' },
    body: () => `Entre a casa e o celeiro fica a ${CARPENTRY.icon} <b>${CARPENTRY.name}</b>: ali você transforma 🪵 troncos em 🟫 tábuas e tábuas em 📏 vigas, na mão.
      Escolha a receita na <b>🪚 Oficina</b> (botão no topo) e use ${ACT()} na mesa. Na Oficina você também vê o que falta para cada obra.`,
  },
  'built-celeiro': {
    title: 'Celeiro construído!', target: { spot: 'celeiro' },
    body: () => `Agora dá para <b>vender</b> a colheita, os produtos e os peixes no 🛖 Celeiro (ou pelo botão 🛖 no topo).`,
  },
  'built-curral': {
    title: 'Curral construído!', target: { spot: 'loja' },
    body: () => `O 🐾 Curral está pronto. Compre animais na 🏪 Loja (as 🐔 galinhas liberam no nível 2) e alimente com 🌾 trigo no <b>cocho</b>.`,
  },
  'built-galpao': {
    title: 'Galpão construído!', target: { spot: 'loja' },
    body: () => `O 🚜 Galpão está pronto para guardar as máquinas do ${BIG_FIELD.icon} ${BIG_FIELD.name}. Compre o campo e as máquinas na 🏪 Loja.`,
  },
  sawmill: {
    title: 'Serraria pronta!', target: { spot: 'serraria' },
    body: () => `Leve 🪵 troncos até a <b>Serraria</b> (a seta) e use ${ACT()}: ela pega os troncos do celeiro e transforma cada um em ${SAWMILL.perLog} ${PLANK.icon} <b>tábuas</b>, um a cada ${SAWMILL.time}s.
      Volte depois para coletar as tábuas prontas. Ela continua serrando mesmo com o jogo fechado.`,
  },
  weather: {
    title: 'Evento climático!', target: null,
    body: () => {
      const ev = core.currentEvent();
      const m = ev ? MUTATIONS[ev.mutation] : null;
      return `De vez em quando o clima muda (veja o aviso no topo). Enquanto o evento dura, as plantas que estão <b>crescendo</b> podem ganhar uma <b>mutação</b>${m ? `: agora é ${m.icon} <b>${m.name}</b> (${m.rarity}, ×${m.mult})` : ''}.
        Mutações se acumulam, vão para o item colhido e <b>multiplicam o preço de venda</b>. Plantas mutadas brilham. Detalhes no ❓ Guia, em "Clima e mutações".`;
    },
  },
  night: {
    title: 'Anoiteceu 🌙', target: { spot: 'casa' },
    body: () => `O fazendeiro acende a <b>lanterna</b> 🔦 sozinho, e as máquinas ligam os <b>faróis</b>. As plantas continuam crescendo à noite; se quiser pular para a manhã, entre na sua 🏠 <b>Casa</b> e durma (depois das 18h).
      À noite aparecem mais 🐡 bagres no lago e vaga-lumes pela fazenda.`,
  },
  rain: {
    title: 'Chuva 🌧️', target: null,
    body: () => `Enquanto chover, a chuva <b>rega tudo sozinha</b>: pode deixar o regador de lado. As plantas crescendo também podem ficar 💧 <b>Molhadas</b> (valem mais). Na chuva também aparecem mais 🦞 lagostins no lago.`,
  },
  order: {
    title: 'Pedido pronto!', target: { spot: 'pedidos' },
    body: () => `Você já tem tudo o que um dos pedidos da vila pede. Vá até o 📦 <b>quadro de Pedidos</b> (ou use o botão 📦 no topo) e entregue: paga bem mais que o mercado.`,
  },
  level6: {
    title: 'Nível 6: lavoura mecanizada!', target: { spot: 'loja' },
    body: () => `Agora você pode comprar o ${BIG_FIELD.icon} <b>${BIG_FIELD.name}</b> (${BIG_CELLS} lotes) e as <b>máquinas</b>: trator com arado, trator com plantadeira e, no nível 7, a colheitadeira.${core.built('galpao') ? '' : ` As máquinas precisam do 🚜 <b>Galpão</b>, construído com madeira (${costTxt('galpao')}).`}`,
  },
};
const costTxt = (id) => Object.entries(BUILDINGS[id].cost).map(([m, q]) => `${q} ${core.ITEMS[m].icon}`).join(' + ');

/** Árvore em pé mais perto do fazendeiro (para a seta). */
function nearestTree() {
  const P = api.playerPos();
  let best = null, bd = Infinity;
  CHOP_TREES.forEach(([x, z], i) => {
    if (core.treeDown(i)) return;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < bd) { bd = d; best = i; }
  });
  return best === null ? null : { tree: best };
}

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
let liveT = 0;

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
  else if (name === 'weather') queueTip('weather');
  else if (name === 'axe') queueTip('axe');
  else if (name === 'sawmill') queueTip('sawmill');
  else if (name === 'build' && !(data === 'celeiro' && active())) queueTip('built-' + data);
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
    // Passo já cumprido por outro caminho (ex.: celeiro construído antes da hora)
    if (s.done && s.done()) { completeStep(); return; }
    if (s.live) {
      liveT -= dt;
      if (liveT <= 0) { liveT = 0.5; render(); }
    }
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
    if (!(S.stats.logs > 0)) queueTip('axe');
    else if (!(S.stats.crafted > 0)) queueTip('bench');
    if (S.level >= 2 && !(S.stats.fish > 0)) queueTip('rod');
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
  const b = document.querySelector(id.startsWith('seed:') ? '.tool.seedslot' : `.tool[data-tool="${id}"]`);
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
  AXES.forEach((a) => a && add(a.level, `${a.icon} ${a.name}`));
  add(SAWMILL.level, `${SAWMILL.icon} ${SAWMILL.name}`);
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

let guideSince = VERSION; // versões depois desta ganham o selo "Novo para você"
const dateBR = (d) => d.split('-').reverse().join('/');

const TOPICS = [
  {
    id: 'inicio', icon: '🌻', title: 'Primeiros passos',
    html: () => `<p>O FarmLife gira em torno de um ciclo simples:</p>
      <div class="tut-flow big"><span>⛏️ Arar</span><span>🌱 Plantar</span><span>💧 Regar</span><span>🧺 Colher</span><span>🛖 Vender</span><span>🏪 Comprar</span></div>
      <p>Você começa só com a casa e as ferramentas. O 🛖 <b>Celeiro</b>, o 🐾 <b>Curral</b> e o 🚜 <b>Galpão</b> são construídos com madeira: corte árvores 🪓, serre na mesa de carpintaria 🪚 e entregue no canteiro 🏗️ (veja <b>🏗️ Construções</b>).</p>
      <p>Com o dinheiro, você compra sementes melhores, animais, melhorias e terreno. Cada colheita, produto e pedido dá <b>XP</b>, e cada nível libera coisas novas (veja <b>🏆 Progressão</b>).</p>
      <p>O jogo salva sozinho, e a fazenda continua crescendo enquanto você está fora (até 8 horas).</p>
      <button class="btn" data-guide="restart">🔁 Refazer o tutorial</button>
      <details class="g-cheat"${core.S.god ? ' open' : ''}><summary>🧪 Códigos de teste</summary>
        <form data-guide="cheat"><input id="cheat-code" placeholder="Digite um código" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn alt">Ativar</button></form>
        ${core.S.god ? '<small>🧪 Godmode ligado.</small>' : ''}</details>`,
  },
  {
    id: 'novidades', icon: '📜', title: 'Novidades',
    html: () => `<p>Tudo o que mudou no FarmLife, da versão mais nova para a mais antiga. Você está na <b>v${VERSION}</b>.</p>` +
      CHANGELOG.map((v) => {
        const isNew = compareVersions(v.version, guideSince) > 0;
        return `<div class="cl-ver${isNew ? ' new' : ''}">
          <div class="cl-head"><b>v${v.version}</b> · ${v.title} <small>${dateBR(v.date)}</small>${isNew ? '<span class="cl-badge">Novo para você</span>' : ''}</div>
          <ul class="g-list">${v.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
      }).join(''),
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
          ['Escolher ferramenta', 'Teclas <kbd>1</kbd> a <kbd>5</kbd>', 'Barra de baixo'],
          ['Escolher semente', '<kbd>6</kbd> pega a semente; <kbd>6</kbd> de novo troca para a próxima · clique na ▲ para ver todas', 'Botão de sementes: toque de novo (ou na ▲) para ver todas'],
          ['Zoom', 'Roda do mouse · <kbd>+</kbd> <kbd>−</kbd>', 'Botões ＋ e －'],
          ['Girar a câmera', 'Botão direito + arrastar · <kbd>Q</kbd> <kbd>R</kbd> · <kbd>C</kbd> ou 🧭 volta ao normal', 'Arrastar na metade direita da tela (ou com um 2º dedo) · 🧭 volta ao normal'],
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
      <li>🛖 <b>Celeiro:</b> depois de construído (${costTxt('celeiro')}), venda colheitas, produtos e peixes. Os preços mudam todo dia (<b class="up">▲</b> caro, <b class="down">▼</b> barato), então às vezes vale esperar.</li>
      <li>📦 <b>Pedidos:</b> os moradores pagam <b>bem mais</b> que o mercado e dão XP extra. Veja no <b>quadro de Pedidos</b> (a cartinha ✉️ em cima dele avisa quando chega pedido novo ou dá para entregar algum) ou no botão 📦 do topo. Recuse (✖) os que não interessam para receber outro.</li>
      <li>🏪 <b>Loja:</b> sementes, campos, pet, pesca, máquinas, animais, funcionários e melhorias.</li>
      <li>🔒 <b>Terrenos:</b> no campo principal, os lotes bloqueados com 🪙 ao lado dos seus podem ser comprados um a um (próximo: 🪙${core.fmt(core.plotCost())}).</li>
      <li>"<b>Vender tudo</b>" guarda 1 🌾 trigo por animal, para alimentá-los.</li></ul>`,
  },
  {
    id: 'animais', icon: '🐔', title: 'Animais',
    html: () => `<p>Os animais vivem no <b>Curral</b>, a oeste, que precisa ser construído com madeira (${costTxt('curral')}). Cada um come <b>1 🌾 trigo</b> por ciclo: alimente chegando perto (${ACT()}) ou use o <b>cocho</b> para todos.
      Quando o produto aparece em cima dele, colete e venda. O <b>⚙️ alimentador automático</b> (melhoria) alimenta sozinho com o trigo do celeiro.</p>` + table(
      ['', 'Animal', 'Custa', 'Produz', 'A cada', 'Nível'],
      Object.values(ANIMALS).map((a) => [a.icon, a.name, `🪙${core.fmt(a.cost)}`, `${PRODUCTS[a.product].icon} ${PRODUCTS[a.product].name} (🪙${PRODUCTS[a.product].sell})`, dur(a.time), `${a.level}${lock(a.level)}`]),
    ) + `<p>💡 O curral começa com ${PEN_SIZE[0]} vagas; a melhoria <b>Curral maior</b> aumenta.</p>`,
  },
  {
    id: 'pesca', icon: '🎣', title: 'Pescaria',
    html: () => `<ol class="g-list">
      <li>Você já começa com uma <b>vara simples</b> (as melhores ficam na loja). Escolha a 🎣 <b>Pescar</b> na barra.</li>
      <li>Vá até a beira do <b>lago</b> e use ${ACT()} (ou ${TAP()} na água) para lançar.</li>
      <li>Quando aparecer o <b>❗</b>, puxe rápido!</li>
      <li>No minigame, <b>segure</b> ${ACT()} para subir a faixa verde e solte para descer. Mantenha o peixe dentro dela até a barra encher.</li></ol>` + table(
      ['', 'Pesca', 'Vende', 'Dificuldade', 'Quando'],
      Object.values(FISH).map((f) => [f.icon, f.name, `🪙${f.sell}`, '★'.repeat(Math.max(1, Math.round(f.dif * 5))), f.night ? 'Mais à noite' : f.rain ? 'Mais na chuva' : f.rare ? 'Rara (vara de fibra ajuda)' : f.junk ? 'Ops…' : 'Sempre']),
    ) + table(['Vara', 'Custa', 'Nível', 'Vantagem'], RODS.filter(Boolean).map((r) => [`${r.icon} ${r.name}`, `🪙${core.fmt(r.cost)}`, `${r.level}${lock(r.level)}`, r.desc])),
  },
  {
    id: 'lenha', icon: '🪓', title: 'Lenha',
    html: () => `<ol class="g-list">
      <li>Você já começa com um <b>machado</b> (o de aço, na loja, corta mais rápido). Escolha a 🪓 <b>Machado</b> na barra.</li>
      <li>Vá até o <b>bosque</b>, a oeste, entre o curral e o Campo do Sul.</li>
      <li>Chegue perto de uma árvore e use ${ACT()} (segure para continuar), ou ${TAP()} na árvore: o fazendeiro corta até ela cair.</li>
      <li>A árvore cai e deixa um <b>toco</b>; você ganha ${WOOD.logs[0]}–${WOOD.logs[1]} ${LOG.icon} <b>troncos</b> (🪙${LOG.sell} cada). Ela cresce de novo em ~${Math.round(WOOD.regrow / 60)} min.</li></ol>
      <p>Os troncos viram tábuas e vigas na ${CARPENTRY.icon} mesa de carpintaria (veja <b>🏗️ Construções</b>) e também aparecem nos <b>pedidos</b> da vila.</p>
      <p>${SAWMILL.icon} <b>Serraria</b> (🪙${core.fmt(SAWMILL.cost)}, nível ${SAWMILL.level}${lock(SAWMILL.level)}): fica na entrada do bosque. Use ${ACT()} nela para colocar os troncos do celeiro na fila e coletar as tábuas prontas.
        Cada tronco vira ${SAWMILL.perLog} ${PLANK.icon} tábuas (🪙${PLANK.sell} cada), uma a cada ${SAWMILL.time}s, até com o jogo fechado. Cabem ${SAWMILL.capacity} troncos na fila.</p>` +
      table(['Machado', 'Custa', 'Nível', 'Golpes', 'Vantagem'], AXES.filter(Boolean).map((a) => [`${a.icon} ${a.name}`, `🪙${core.fmt(a.cost)}`, `${a.level}${lock(a.level)}`, a.hits, a.bonus ? `+${a.bonus} tronco por árvore` : '—'])),
  },
  {
    id: 'obras', icon: '🏗️', title: 'Construções',
    html: () => `<p>Você começa só com a 🏠 casa. As outras construções são feitas de madeira:</p>
      <ol class="g-list">
        <li>🪓 Corte árvores no bosque para ganhar <b>🪵 troncos</b>.</li>
        <li>Na ${CARPENTRY.icon} <b>${CARPENTRY.name}</b> (entre a casa e o celeiro), escolha a receita na <b>🪚 Oficina</b> (botão no topo) e use ${ACT()} na mesa. Segure para continuar, ou ${TAP()} na mesa: o fazendeiro trabalha até acabar o material.</li>
        <li>Leve a madeira até o <b>canteiro 🏗️</b> da obra e use ${ACT()} para entregar. Dá para entregar aos poucos: a obra vai subindo.</li></ol>` +
      table(['Receita', 'Precisa', 'Faz', 'Golpes'], RECIPES.map((rc) => [`${rc.icon} ${rc.name}`, Object.entries(rc.input).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + '), Object.entries(rc.output).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + '), rc.work])) +
      table(['Construção', 'Custa', 'Libera', 'Onde'], Object.entries(BUILDINGS).map(([id, b]) => [`${b.icon} ${b.name}${core.built(id) ? ' ✔' : ''}`, costTxt(id), b.desc,
        id === 'celeiro' ? 'Ao lado da loja' : id === 'curral' ? 'Portão do curral, a oeste' : 'Perto do Campo de Trigo, a leste'])) +
      `<p>💡 Tábuas (🪙${PLANK.sell}) e vigas (🪙${BEAM.sell}) também podem ser vendidas ou entregues em pedidos. A ${SAWMILL.icon} Serraria (nível ${SAWMILL.level}) serra tábuas sozinha.</p>`,
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
    ) + `<p>O <b>${BIG_FIELD.name}</b> é trabalhado com <b>máquinas que você dirige</b>. Elas ficam no 🚜 Galpão (construído com madeira: ${costTxt('galpao')}) e ligam os faróis à noite. Para dirigir: chegue perto e use ${ACT()} para entrar,
      dirija com ${isTouch() ? 'o joystick' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'} e use ${ACT()} de novo para sair.</p>` + table(
      ['Máquina', 'O que faz', 'Custa', 'Nível'],
      Object.values(MACHINES).map((m) => [`${m.icon} ${m.name}`, m.desc, `🪙${core.fmt(m.cost)}`, `${m.level}${lock(m.level)}`]),
    ) + '<p>💡 A plantadeira usa as suas sementes de trigo: compre o <b>saco ×50</b> na loja.</p>',
  },
  {
    id: 'clima', icon: '🌩️', title: 'Clima e mutações',
    html: () => `<p>Os eventos climáticos são <b>raros</b>: a cada ${EVENT_ROUND} segundos (1/3 de dia) há <b>${Math.round(EVENT_CHANCE * 100)}% de chance</b> de começar um, e depois de cada evento o clima descansa um pouco. Quando acontece, o aviso aparece no topo da tela com a contagem regressiva.
      Enquanto ele dura, as plantas que ainda estão <b>crescendo</b> podem ganhar a <b>mutação</b> daquele evento.</p>
      <ul class="g-list">
        <li>Uma planta pode <b>acumular várias mutações</b> até amadurecer (plantas prontas não ganham mais).</li>
        <li>Ao colher, as mutações vão <b>para o item colhido</b> e a planta recomeça sem nenhuma (inclusive as que rebrotam).</li>
        <li>Itens mutados ficam separados no 🛖 Celeiro e valem mais: <b>cada mutação soma o seu bônus</b>.
          Ex.: 💧 Molhada (×1,5) + ⚡ Eletrizada (×5) = 1 + 0,5 + 4 = <b>×5,5</b> o preço normal.</li>
        <li>Plantas mutadas brilham com a cor da sua mutação mais rara; prontas, mostram o ícone dela.</li>
        <li>Vale também para o ${BIG_FIELD.icon} Campo de Trigo e para o que os funcionários colhem.</li>
      </ul>` + table(
      ['', 'Evento', 'O que acontece', 'Mutação', 'Raridade', 'Bônus'],
      Object.values(WEATHER_EVENTS).map((e) => {
        const m = MUTATIONS[e.mutation];
        return [e.icon, e.name, e.desc + (e.strikes ? ' Cada raio eletriza a planta atingida.' : '') + (e.after ? ' Costuma aparecer depois da chuva.' : ''),
          `${m.icon} ${m.name}`, `<b style="color:${RARITY_COLOR[m.rarity]}">${m.rarity}</b>`, `×${String(m.mult).replace('.', ',')}`];
      }),
    ) + '<p>💡 Culturas demoradas (como 🎃 abóbora e 🌻 girassol) passam por mais eventos enquanto crescem e acumulam mais mutações.</p>',
  },
  {
    id: 'tempo', icon: '🌦️', title: 'Tempo e clima',
    html: () => `<ul class="g-list">
      <li>☀️ Um dia dura <b>3 minutos</b>. Ao amanhecer os preços mudam e os salários são pagos.</li>
      <li>🌙 À noite as plantas continuam crescendo. Depois das 18h, durma na 🏠 <b>Casa</b> para pular para a manhã.</li>
      <li>🌧️ Na chuva e na tempestade, tudo fica regado sozinho. No 🔥 sol escaldante, a água evapora mais rápido.</li>
      <li>🌩️ Os eventos climáticos geram <b>mutações</b> nas plantas (veja "Clima e mutações").</li>
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

/** Abre o Guia. since: mostra como "novo" o que veio depois dessa versão (tópico Novidades). */
export function openGuide(topic, since) {
  if (topic) currentTopic = topic;
  guideSince = since || VERSION;
  const ver = document.getElementById('guide-version');
  if (ver) ver.textContent = `v${VERSION}`;
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
  el.content.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-guide="cheat"]');
    if (!f) return;
    e.preventDefault();
    const input = f.querySelector('input');
    if (core.cheat(input.value)) openGuide('inicio');
    else input.select();
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
