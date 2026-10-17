/* FarmLife — mundo 3D: cena, câmera isométrica, personagem, animais e interações */
import * as THREE from 'three';
import { ANIMALS, PRODUCTS, CROPS, WORKERS, FIELDS, TOTAL_PLOTS, fieldOf, BIG_FIELD, BIG_CELLS, MACHINES, FISH, MUTATIONS, CHOP_TREES, SAWMILL, BUILDINGS, RECIPES, CARPENTRY, HORSE, SADDLE, RIDE_MULT, MANURE, COMPOST, FERTILIZER, BREED, PASTURE, CHEESERY, FACTORIES, ORCHARD, FRUIT_TREES, HIVES, DECOR, CROWS } from '../data.js';
import * as sys from '../systems.js';
import { sfx } from '../audio.js';
import * as core from '../core.js';
import * as ui from '../ui.js';
import * as M from './models.js';
import { NavGrid } from './nav.js';
import { initPainted, setPainted, paintedFrame, renderScene } from './painted.js';
import { joySide } from '../prefs.js';
import { initCritters, updateCritters, syncPet, updatePet, pet, petInteract, petPettedToday, fauna } from './critters.js';

// ================= Layout do mundo =================
const TILE = 1.08;
const BOUNDS = { minX: -36, maxX: 62, minZ: -29, maxZ: 39 };
const PLAYER_R = 0.28;
const WALK = 3.4;
const RUN = 5.6;
const REACH = 1.0;
const SPAWN = new THREE.Vector3(2.5, 0, -4.2);

// Sede (fixa): casa, carpintaria, armazém, quadro de pedidos e loja, de frente para a rua principal
const CORE = { casa: [-15, -12.5], mesa: [-9, -10.5], celeiro: [-3, -12.5], pedidos: [3, -10.2], loja: [8.5, -12] };
const POND = { x: 21, z: 8, r: 2.4 };
// Ruas fixas (x1, z1, x2, z2): a principal, a dos campos, a estrada do sul e as calçadas da sede
const ROADS = [
  [-34, -7.2, 60, -5.8],
  [-0.7, -5.8, 0.7, -2.4],
  [-0.7, 5.4, 0.7, 19.8],
  [-14, 18.6, 58, 19.8],
  [-15, -10.6, -13.8, -7.2],
  [-8.9, -9.7, -7.7, -7.2],
  [-3.6, -10.6, -2.4, -7.2],
  [2.4, -9.7, 3.6, -7.2],
  [7.9, -10.9, 9.1, -7.2],
];
const paths = []; // caminhos até as obras, criados quando o jogador escolhe o lugar
// Áreas fixas onde não dá para construir: sede, campo principal, lago, bosque e pomar
const RESERVED = [
  [-17.4, -14.6, -12.6, -10.0], [-10.6, -11.8, -7.4, -9.2], [-5.3, -14.6, 0.2, -10.0], [1.8, -11.0, 4.2, -9.0], [6.9, -13.0, 10.9, -10.2],
  [-21.8, -13.8, -20.2, -12.2], [11.7, -16.8, 13.3, -15.2],
  [-4.9, -2.3, 4.9, 5.3],
  [POND.x - POND.r - 0.8, POND.z - POND.r - 0.8, POND.x + POND.r + 0.8, POND.z + POND.r + 0.8],
  [-36, -3, -25.5, 22],
  [14.5, -22.6, 35.2, -18.5],
];

// Lotes: obras, campos, a serraria, o Campo de Trigo e o pasto. O jogador escolhe onde ficam (core.S.layout).
// ext = retângulo ocupado em volta do ponto do lote (oeste, norte, leste, sul); door = de onde sai o caminho; def = lugar padrão (saves antigos)
const fieldExt = (f) => { const hw = (f.cols * TILE) / 2 + 0.55, hd = (f.rows * TILE) / 2 + 0.55; return [-hw, -hd, hw, hd]; };
const LOTS = {
  curral:     { kind: 'build', ext: [-3.6, -5.0, 5.6, 4.4], def: [-19.3, 0.5], door: [4.2, 0.3] },
  galinheiro: { kind: 'build', ext: [-3.15, -2.85, 3.75, 2.85], def: [-21.25, 10.45], door: [3.5, 0.15] },
  queijaria:  { kind: 'build', ext: [-2.2, -1.5, 2.2, 2.4], def: [15.5, -12.5], door: [0, 2.0] },
  galpao:     { kind: 'build', ext: [-4.2, -2.2, 9.4, 7.4], def: [46, -15], door: [0, 7.2] },
  serraria:   { kind: 'buy', ext: [-2.6, -2.6, 2.8, 2.8], def: [-20.5, 17], door: [1.3, 1.3] },
  trigo:      { kind: 'buy', ext: [-14.2, -9, 12.8, 8.8], def: [42, 6] },
  pasto:      { kind: 'buy', ext: [-15, -8.8, 12.8, 8.8], def: [42, 29] },
};
const FAC_DEF = { moinho: [21.5, -12.5], padaria: [27.5, -12.5], tear: [33.5, -12.5], defumadouro: [21, 14.5] };
for (const [id, f] of Object.entries(FACTORIES)) {
  LOTS[id] = { kind: 'build', ext: [-f.size[0] / 2 - 0.4, -f.size[1] / 2 - 0.4, f.size[0] / 2 + 0.4, f.size[1] / 2 + 1.3], def: FAC_DEF[id], door: [0, f.size[1] / 2 + 1.0] };
}
const FIELD_DEF = { leste: [11, 1.5], sul: [-8, 12], lago: [11, 13] };
for (const f of FIELDS) if (f.cost) LOTS[f.id] = { kind: 'field', ext: fieldExt(f), def: FIELD_DEF[f.id] };

// Centro de cada campo no mapa (os comprados vêm do lugar escolhido)
const FIELD_POS = { principal: [0, 1.5], ...FIELD_DEF };
// Geometria dos lotes, preenchida quando o lote ganha lugar (applyLot)
let PEN = null, COOP_YARD = null, SHED = null, PAST = null;
const BIG = { cx: LOTS.trigo.def[0], cz: LOTS.trigo.def[1] };
let BIG_X0 = BIG.cx - BIG_FIELD.cols / 2;
let BIG_Z0 = BIG.cz - BIG_FIELD.rows / 2;

const SPOTS = {
  celeiro: { label: '🏬 Armazém', at: CORE.celeiro, labelY: 4.3, point: [CORE.celeiro[0], CORE.celeiro[1] + 2.3], r: 1.3, text: 'Abrir o Armazém', info: '🏬 Armazém: venda sua colheita e veja o mercado do dia.' },
  loja:    { label: '🏪 Loja', at: CORE.loja, labelY: 2.9, point: [CORE.loja[0], CORE.loja[1] + 1.5], r: 1.3, text: 'Abrir a Loja', info: '🏪 Loja: sementes, animais e melhorias.' },
  pedidos: { label: '📦 Pedidos', at: CORE.pedidos, labelY: 2.4, point: [CORE.pedidos[0], CORE.pedidos[1] + 0.9], r: 1.1, text: 'Ver os Pedidos', info: '📦 Quadro de pedidos da vila: entregas pagam mais que o mercado.' },
  casa:    { label: '🏠 Casa', at: CORE.casa, labelY: 3.9, point: [CORE.casa[0] + 0.6, CORE.casa[1] + 2.3], r: 1.2, text: 'Dormir até amanhã', info: '🏠 Sua casa. Depois das 18h, durma para pular para a manhã seguinte.' },
  mesa:    { label: '🪚 Carpintaria', at: CORE.mesa, labelY: 2.0, point: [CORE.mesa[0] + 0.67, CORE.mesa[1] + 0.67], r: 1.15, text: '', info: '' },
  queijaria: { label: null, lot: 'queijaria', site: 'queijaria', at: [0, 0], labelY: 3.0, point: [0, 0], r: 1.3, text: '', info: '' },
  serraria: { label: null, lot: 'serraria', at: [0, 0], labelY: 3.1, point: [0, 0], r: 1.3, text: '', info: '' },
  'obra:curral': { label: null, lot: 'curral', at: [0, 0], labelY: 1.6, point: [0, 0], r: 1.3, build: 'curral', text: '', info: '' },
  galinheiro: { label: null, lot: 'galinheiro', site: 'galinheiro', at: [0, 0], labelY: 2.5, point: [0, 0], r: 1.4, text: '', info: '' },
  compost: { label: null, lot: 'curral', needs: 'curral', at: [0, 0], labelY: 1.5, point: [0, 0], r: 1.1, text: '', info: '' },
  cocho:   { label: null, lot: 'curral', needs: 'curral', at: [0, 0], point: [0, 0], r: 1.1, text: 'Alimentar todos no cocho', info: '🪵 Cocho: alimenta de uma vez todos os animais com fome (1 🌾 cada).' },
  'obra:galpao': { label: null, lot: 'galpao', at: [0, 0], labelY: 2.6, point: [0, 0], r: 1.6, build: 'galpao', text: '', info: '' },
};
// Fábricas (obras de madeira), covas do pomar e colmeias
for (const id of Object.keys(FACTORIES)) {
  SPOTS[id] = { label: null, lot: id, site: id, at: [0, 0], labelY: id === 'moinho' ? 4.9 : 3.2, point: [0, 0], r: 1.3, text: '', info: '' };
}
const ORCHARD_POS = Array.from({ length: ORCHARD.slots }, (_, k) => [16 + k * 2.6, -20.5]);
ORCHARD_POS.forEach(([x, z], k) => { SPOTS['pomar:' + k] = { label: null, at: [x, z], labelY: 3.0, point: [x, z + 1.15], r: 1.15, text: '', info: '' }; });
const HIVE_C = [33.5, -20.5];
const HIVE_POS = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([dx, dz]) => [HIVE_C[0] + dx, HIVE_C[1] + dz]);
SPOTS.colmeias = { label: null, at: HIVE_C, labelY: 1.9, point: [HIVE_C[0], HIVE_C[1] + 1.5], r: 1.2, text: '', info: '' };

/** Rótulo, informação e ação de pontos com regras próprias (fábricas, pomar, colmeias). */
const SPOT_HOOKS = {};
for (const id of Object.keys(FACTORIES)) {
  SPOT_HOOKS[id] = {
    label: () => sys.factoryLabel(id),
    info: () => sys.factoryInfo(id),
    open: () => {
      const res = sys.factoryUse(id);
      if (res && (res.collected || res.loaded)) {
        startAction('collect');
        const [x, z] = SPOTS[id].at;
        burst(x, 1, z + 1, res.collected ? 0xf4c27a : 0xffffff, 12, { up: 2.2, spread: 0.8, size: 0.06 });
      } else if (!res) ui.openPanel('oficina', 'fabricas');
    },
  };
}
ORCHARD_POS.forEach(([x, z], k) => {
  SPOT_HOOKS['pomar:' + k] = {
    label: () => sys.treeLabel(k),
    info: () => sys.treeInfo(k),
    open: () => {
      const o = sys.treeAt(k);
      if (!o.type) { ui.openPanel('loja', 'pomar'); return; }
      const n = sys.harvestTree(k);
      if (n) {
        startAction('collect');
        burst(x, 1.6, z, 0x7cb342, 10, { up: 2, spread: 0.9, size: 0.06 });
        const p = screenPosOf({ pos: { x, z } });
        if (p) ui.fxAt(p.x, p.y - 60, `+${n} ${FRUIT_TREES[o.type].icon}`, 'gold');
      } else ui.toast(sys.treeInfo(k));
    },
  };
});
SPOT_HOOKS.galinheiro = {
  label: () => core.coopLabel(),
  info: () => core.coopInfo(),
  open: () => {
    const res = core.coopUse();
    if (!res) return;
    startAction(res);
    const [x, z] = COOP_YARD.house;
    burst(x + 0.45, 0.4, z + 1.05, res === 'collect' ? 0xfff4e0 : 0xe8c25a, 12, { up: 2, spread: 0.6, size: 0.05 });
  },
};
SPOT_HOOKS.colmeias = {
  label: () => sys.hiveLabel(),
  info: () => sys.hiveInfo(),
  open: () => {
    if (!core.S.hives.n) { ui.openPanel('loja', 'pomar'); return; }
    const n = sys.collectHoney();
    if (n) {
      startAction('collect');
      burst(HIVE_C[0], 1, HIVE_C[1], 0xf2c14e, 12, { up: 2, spread: 0.8, size: 0.05 });
      const p = screenPosOf({ pos: { x: HIVE_C[0], z: HIVE_C[1] } });
      if (p) ui.fxAt(p.x, p.y - 30, `+${n} 🍯`, 'gold');
    } else ui.toast(sys.hiveInfo());
  },
};

const spotActive = (s) => (s.lot && !lotPlaced(s.lot) ? false
  : s.build ? !core.built(s.build)
  : s.needs ? core.built(s.needs) : true);
/** Construção de madeira associada a um ponto (só enquanto está em obra). */
const siteOf = (key) => (SPOTS[key].build || SPOTS[key].site || (key === 'celeiro' ? 'celeiro' : null));
const inWork = (key) => { const b = siteOf(key); return b && !core.built(b) ? b : null; };

// Máquinas: estacionam na frente do galpão (posição relativa a ele) e se comportam assim
const PARK_REL = { arado: [-2.4, 4.4, 0], plantadeira: [1.6, 4.4, 0], colheitadeira: [6.4, 3.6, 0] };
const parkOf = (id) => (SHED ? [SHED[0] + PARK_REL[id][0], SHED[1] + PARK_REL[id][1], PARK_REL[id][2]] : [SPAWN.x, SPAWN.z, 0]);
const MDEF = {
  arado:         { make: () => M.makePlowTractor(),   speed: 4.6, turn: 1.9, width: 3, workZ: -1.6,  front: 1.0, reach: 1.9, exhaust: [0.17, 1.55, 0.75], verb: 'Arando' },
  plantadeira:   { make: () => M.makeSeederTractor(), speed: 4.2, turn: 1.8, width: 4, workZ: -1.75, front: 1.0, reach: 1.9, exhaust: [0.17, 1.55, 0.75], verb: 'Plantando' },
  colheitadeira: { make: () => M.makeCombine(),       speed: 3.3, turn: 1.4, width: 5, workZ: 2.05,  front: 2.3, reach: 2.4, exhaust: [0.45, 2.95, -1.25], verb: 'Colhendo' },
};

function bigCellAt(x, z) {
  const c = Math.floor(x - BIG_X0), r = Math.floor(z - BIG_Z0);
  if (c < 0 || c >= BIG_FIELD.cols || r < 0 || r >= BIG_FIELD.rows) return -1;
  return r * BIG_FIELD.cols + c;
}
function bigCellCenter(k) {
  return { x: BIG_X0 + (k % BIG_FIELD.cols) + 0.5, z: BIG_Z0 + Math.floor(k / BIG_FIELD.cols) + 0.5 };
}

export function tilePos(i) {
  const { field: f, r, c } = fieldOf(i);
  const [cx, cz] = FIELD_POS[f.id];
  return new THREE.Vector3(cx + (c - (f.cols - 1) / 2) * TILE, 0, cz + (r - (f.rows - 1) / 2) * TILE);
}

/** Lote sob o ponto (x, z), só em campos já comprados; -1 se nenhum. */
function tileAt(x, z) {
  for (const f of FIELDS) {
    if (!core.fieldOwned(f.id)) continue;
    const [cx, cz] = FIELD_POS[f.id];
    const c = Math.round((x - cx) / TILE + (f.cols - 1) / 2);
    const r = Math.round((z - cz) / TILE + (f.rows - 1) / 2);
    if (c >= 0 && c < f.cols && r >= 0 && r < f.rows) return f.start + r * f.cols + c;
  }
  return -1;
}

/** Retângulo ocupado por um campo (com margem). */
function fieldRect(f, m = 0) {
  const [cx, cz] = FIELD_POS[f.id];
  const hw = (f.cols * TILE) / 2 + 0.25 + m, hd = (f.rows * TILE) / 2 + 0.25 + m;
  return { x1: cx - hw, x2: cx + hw, z1: cz - hd, z2: cz + hd };
}

const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ================= Estado da cena =================
let renderer, scene, camera, canvas;
let sun, moon, hemi;
const lamps = [];
const glowMats = [];
let rain;
let nav;
let clock = 0;
let zoom = 12;
const camTarget = new THREE.Vector3();
const ISO = new THREE.Vector3(1, 1.15, 1).normalize().multiplyScalar(40);
const camOffset = new THREE.Vector3();
let camYaw = 0;       // giro atual da câmera em volta do personagem (0 = vista padrão)
let camYawTarget = 0; // para onde o giro está indo (suaviza o arrasto)
const ROT_SPEED = 0.009; // radianos por pixel arrastado
/** Gira (x, z) pelo ângulo da câmera: transforma direções da tela em direções do mundo. */
function camDir(x, z) {
  const c = Math.cos(camYaw), s = Math.sin(camYaw);
  return [c * x + s * z, -s * x + c * z];
}
export function rotateCamera(d) { camYawTarget += d; }
let focus = false; // criação do personagem: câmera bem perto, de frente para ele
export function setFocus(on) { focus = on; if (on) cancelJobs(); }
const tmpFocus = new THREE.Vector3();

/** Troca o modelo do jogador (e o motorista das máquinas) para o personagem escolhido. */
export function setCharacter(gender) {
  M.setFarmerStyle(gender);
  const old = player.m;
  const m = M.makeFarmer();
  m.root.visible = old.root.visible;
  scene.remove(old.root);
  scene.add(m.root);
  player.m = m;
  // As máquinas são recriadas no próximo quadro com o motorista novo
  for (const [id, v] of [...machines]) {
    if (driving === id) continue;
    scene.remove(v.m.root);
    pickables.splice(pickables.indexOf(v.m.root), 1);
    machines.delete(id);
  }
}
/** Volta para a vista padrão pelo caminho mais curto. */
export function resetCamera() {
  const full = Math.PI * 2;
  camYawTarget = Math.round(camYawTarget / full) * full;
}

const plotVis = [];
const animalVis = new Map();
const pickables = [];
const particles = [];
const particlePool = [];
let hoverRing, targetRing, clickMarker, feeder;
const queueRings = [];

const keys = new Set();
let typed = ''; // últimas teclas (para os códigos de teste)
let lastKeyTile = -1;
let actionHeld = false;

// Joystick virtual (toque): aparece onde o dedo encosta e some ao soltar
const JOY_RADIUS = 56;
const JOY_DEAD = 8;
const joy = { id: null, sx: 0, sy: 0, x: 0, y: 0, moved: false, el: null, knob: null };
const rot = { id: null, x: 0, sx: 0, sy: 0, moved: false, mouse: false }; // arrasto que gira a câmera
const ndc = new THREE.Vector2();
let mouseIn = false;
let dragging = false;
let lastDragTile = -1;
let hover = null;
const raycaster = new THREE.Raycaster();
const pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);

const player = {
  m: null,
  pos: SPAWN.clone(),
  heading: Math.PI,
  phase: 0,
  moving: false,
  running: false,
  actionT: 0,
  actionKind: null,
  path: [],
  job: null,
  queue: [],
  busy: 0,
};

// ================= Materiais da lavoura =================
const matLocked = M.mat(0x5a8f40);
const matGrass = M.mat(0x86c95f);
const matSoil = new THREE.MeshStandardMaterial({ map: M.soilTexture, roughness: 1 });
const matSoilWet = new THREE.MeshStandardMaterial({ map: M.soilTexture, color: 0x8c7b6e, roughness: 0.7 });
const basicCache = new Map();
const basicMat = (c) => {
  if (!basicCache.has(c)) basicCache.set(c, new THREE.MeshBasicMaterial({ color: c }));
  return basicCache.get(c);
};

// ================= Construção da cena =================
export async function initWorld(cv) {
  canvas = cv;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7dcff);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  hemi = new THREE.HemisphereLight(0xdff1ff, 0x5d8a3c, 1.1);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  moon = new THREE.DirectionalLight(0x8ea2ff, 0);
  moon.position.set(-8, 14, 6);
  scene.add(moon);

  // Espera a fonte carregar para desenhar as placas
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  nav = new NavGrid(BOUNDS.minX, BOUNDS.minZ, BOUNDS.maxX, BOUNDS.maxZ, 0.25);
  buildGround();
  buildFarm();
  buildBuildings();
  migrateLayout();
  buildNature();
  buildGrove();
  buildOrchard();
  buildSites();
  buildBench();
  // Lotes que já têm lugar (obras, campos, serraria, Campo de Trigo e pasto)
  for (const id of Object.keys(LOTS)) {
    const p = core.S.layout[id];
    if (p) { applyLot(id, p.x, p.z); buildLot(id); }
  }
  buildLights();
  buildRain();
  buildWeatherFx();
  buildHelpers();
  initPainted({ scene, renderer, camera });
  buildFishing();
  buildGuide();

  M.setFarmerStyle(core.S.char.gender);
  nav.snapshot(); // obstáculos fixos; as decorações são bloqueadas por cima
  player.m = M.makeFarmer();
  scene.add(player.m.root);
  camTarget.copy(player.pos);

  initCritters({
    scene, nav, player, POND, pickables, burst, sfx, core, followPath, randomSpot, inFieldOrPond,
    clock: () => clock,
    darkness: () => core.darkness(),
    weather: () => core.S.weather,
    fxAt: (pos, text) => {
      const p = screenPosOf({ pos });
      if (p) ui.fxAt(p.x, p.y, text);
    },
  });

  bindInput();
  window.addEventListener('resize', resize);
  resize();
}

let pathMat = null, borderMat = null;
/** Faixa de terra batida no chão (ruas e caminhos). */
function addStrip(x1, z1, x2, z2) {
  if (!pathMat) pathMat = new THREE.MeshStandardMaterial({ color: 0xcfae74, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x2 - x1), Math.abs(z2 - z1)), pathMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
  m.receiveShadow = true;
  scene.add(m);
}
/** Borda de terra em volta de um campo. */
function fieldBorder(f) {
  if (!borderMat) borderMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const [cx, cz] = FIELD_POS[f.id];
  const border = new THREE.Mesh(new THREE.PlaneGeometry(f.cols * TILE + 0.5, f.rows * TILE + 0.5), borderMat);
  border.rotation.x = -Math.PI / 2;
  border.position.set(cx, 0.012, cz);
  border.receiveShadow = true;
  scene.add(border);
}

let groundFlat = null, groundPainted = null;

function buildGround() {
  const geo = new THREE.PlaneGeometry(200, 160, 100, 80).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  geo.translate((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
  const colors = [];
  const base = new THREE.Color(0x7cc35a);
  const tmp = new THREE.Color();
  for (let k = 0; k < geo.attributes.position.count; k += 3) {
    tmp.copy(base).offsetHSL(rand(-0.015, 0.015), rand(-0.05, 0.05), rand(-0.04, 0.03));
    for (let j = 0; j < 3; j++) colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  seasonMats.push(ground.material);
  groundFlat = ground;

  // Gramado do visual pintado: manchas suaves de cor (claras, amareladas e azuladas), como pinceladas
  const pg = new THREE.PlaneGeometry(200, 160, 200, 160);
  pg.rotateX(-Math.PI / 2);
  pg.translate((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
  const pos = pg.attributes.position;
  const pc = new Float32Array(pos.count * 3);
  const light = new THREE.Color(0xa6d672), warm = new THREE.Color(0xcdd27a), cool = new THREE.Color(0x3f8f55);
  const wave = (x, z, f, p) => Math.sin(x * f + p) * Math.cos(z * f * 0.83 - p * 1.7) + Math.sin((x + z) * f * 0.61 + p * 2.3) * 0.6;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    tmp.copy(base);
    const big = wave(x, z, 0.09, 1.3), mid = wave(x, z, 0.23, 4.1), fine = wave(x, z, 0.61, 7.7), brush = wave(x * 1.7, z * 0.6, 1.35, 2.9);
    tmp.lerp(light, THREE.MathUtils.clamp(0.2 + big * 0.45 + fine * 0.18 + brush * 0.12, 0, 0.9));
    tmp.lerp(warm, THREE.MathUtils.clamp(mid * 0.55 + brush * 0.1, 0, 0.6));
    tmp.lerp(cool, THREE.MathUtils.clamp(-big * 0.55 - 0.05 - brush * 0.08, 0, 0.65));
    pc[k * 3] = tmp.r; pc[k * 3 + 1] = tmp.g; pc[k * 3 + 2] = tmp.b;
  }
  pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
  groundPainted = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  groundPainted.receiveShadow = true;
  groundPainted.visible = false;
  scene.add(groundPainted);
  seasonMats.push(groundPainted.material);

  // Ruas de terra e a borda do campo principal (os outros campos ganham borda quando são colocados)
  for (const [x1, z1, x2, z2] of ROADS) addStrip(x1, z1, x2, z2);
  fieldBorder(FIELDS[0]);

  // Lago
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 18), new THREE.MeshStandardMaterial({ color: 0x5fb4e6, roughness: 0.25, metalness: 0.1, flatShading: true }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(POND.x, 0.03, POND.z);
  scene.add(pond);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const r = M.makeRock(rand(0.6, 1.1));
    r.position.set(POND.x + Math.cos(a) * (POND.r + 0.1), 0.05, POND.z + Math.sin(a) * (POND.r + 0.1));
    scene.add(r);
  }
  for (const [x, z] of [[0.6, 0.3], [-0.5, -0.6], [0.2, -0.9]]) {
    const pad = M.ball(0.22, 0.02, 0.22, 0x4f9a3d, POND.x + x, 0.05, POND.z + z);
    scene.add(pad);
  }
  nav.blockCircle(POND.x, POND.z, POND.r + 0.3 + PLAYER_R);
}

const fieldShown = {};

function buildFarm() {
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const group = new THREE.Group();
    group.position.copy(tilePos(i));
    const base = new THREE.Mesh(M.GEO.box, matGrass);
    base.receiveShadow = true;
    base.scale.set(1, 0.08, 1);
    group.add(base);
    const deco = new THREE.Group();
    const tuft = M.makeGrassTuft();
    tuft.position.set(((i * 13) % 7) / 10 - 0.3, 0, ((i * 29) % 7) / 10 - 0.3);
    deco.add(tuft);
    if ((i * 37) % 7 === 0) {
      const f = M.makeFlower([0xff6f91, 0xffffff, 0xffd54f][i % 3]);
      f.position.set(0.25, 0, 0.2);
      deco.add(f);
    }
    group.add(deco);
    scene.add(group);
    plotVis.push({ group, base, deco, top: 0.08, baseKey: '', crop: null, cropKey: '', cropH: 0, pop: 1, ind: null, indKey: '', aura: null, auraKey: '' });
  }
}

let mailLetter = null;

/** Bandeirinha levanta e uma cartinha flutua quando há pedido novo ou pronto para entregar. */
function updateMailbox() {
  if (!mailLetter) return;
  const mail = core.hasMail();
  mailLetter.visible = mail;
  if (mail) {
    const [x, z] = SPOTS.pedidos.at;
    mailLetter.position.set(x, SPOTS.pedidos.labelY + 0.55 + Math.abs(Math.sin(clock * 3)) * 0.12, z);
  }
}

function addSpot(key, model, footprint) {
  const s = SPOTS[key];
  const [x, z] = s.at;
  model.group.position.set(x, 0, z);
  scene.add(model.group);
  glowMats.push(...model.lights);
  // Volume invisível para cliques
  const [w, h, d] = footprint.size;
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(w, h, d);
  proxy.position.set(x + (footprint.off?.[0] || 0), h / 2, z + (footprint.off?.[1] || 0));
  proxy.userData.pick = { kind: 'spot', key };
  scene.add(proxy);
  pickables.push(proxy);
  if (s.label) {
    const label = M.textSprite(s.label, 0.5);
    label.position.set(x, s.labelY, z);
    scene.add(label);
    return { proxy, label };
  }
  return { proxy, label: null };
}

function buildBuildings() {
  const [bx, bz] = CORE.celeiro;
  const barn = M.makeBarn();
  const barnSpot = addSpot('celeiro', barn, { size: [4, 3.7, 3.4] });
  sites.celeiro = { model: barn.group, labels: [barnSpot.label] };
  nav.blockRect(bx - 2, bz - 1.7, bx + 2, bz + 1.7, PLAYER_R);
  nav.blockRect(bx + 2.2, bz + 0.35, bx + 3.0, bz + 1.45, PLAYER_R);

  const [lx, lz] = CORE.loja;
  addSpot('loja', M.makeShop(), { size: [2.8, 2.4, 1.4] });
  nav.blockRect(lx - 1.3, lz - 0.7, lx + 1.3, lz + 0.7, PLAYER_R);
  nav.blockRect(lx + 1.2, lz + 0.5, lx + 2.1, lz + 1.0, PLAYER_R);

  const [px, pz] = CORE.pedidos;
  addSpot('pedidos', M.makeBoard(), { size: [1.8, 2.0, 0.5] });
  nav.blockLine(px - 0.75, pz, px + 0.75, pz, 0.12 + PLAYER_R);

  // Cartinha que pula sobre o quadro quando há pedido novo ou pronto para entregar
  mailLetter = M.emojiSprite('✉️', 0.42);
  mailLetter.visible = false;
  scene.add(mailLetter);

  const [hx, hz] = CORE.casa;
  addSpot('casa', M.makeHouse(), { size: [3.6, 3.4, 3.0] });
  nav.blockRect(hx - 1.8, hz - 1.5, hx + 1.8, hz + 1.5, PLAYER_R);
  nav.blockRect(hx - 2.1, hz - 1.0, hx - 0.9, hz - 0.2, PLAYER_R);

  const lampBarn = new THREE.PointLight(0xffb84d, 0, 7, 1.5);
  lampBarn.position.set(bx + 1.05, 1.9, bz + 2.0);
  const lampHouse = new THREE.PointLight(0xffc861, 0, 7, 1.5);
  lampHouse.position.set(hx - 0.8, 1.3, hz + 1.9);
  const lampShop = new THREE.PointLight(0xffd27a, 0, 6, 1.5);
  lampShop.position.set(lx, 2.0, lz + 0.9);
  lampBarn.userData.needs = 'celeiro';
  scene.add(lampBarn, lampHouse, lampShop);
  lamps.push(lampBarn, lampHouse, lampShop);
}

// ================= Pasto do gado =================
let pasture = null;

function buildPasture() {
  const { x0, z0, x1, z1, gate } = PAST;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // Capim mais verdinho, com tufos e flores
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, z1 - z0),
    new THREE.MeshStandardMaterial({ color: 0x93d36b, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  seasonMats.push(grass.material);
  if (seasonShown) { const sz = sys.season(); grass.material.userData.baseColor = grass.material.color.clone(); grass.material.color.multiply(new THREE.Color(sz.tint[0], sz.tint[1], sz.tint[2])); }
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(cx, 0.011, cz);
  grass.receiveShadow = true;
  scene.add(grass);
  const flowerColors = [0xffffff, 0xffd54f, 0xff8fb1, 0xba68c8];
  for (let k = 0; k < 140; k++) {
    const x = rand(x0 + 0.4, x1 - 0.4), z = rand(z0 + 0.4, z1 - 0.4);
    const o = Math.random() < 0.7 ? M.makeGrassTuft() : M.makeFlower(flowerColors[k % flowerColors.length]);
    o.position.set(x, 0, z);
    o.rotation.y = Math.random() * Math.PI * 2;
    o.scale.setScalar(Math.random() < 0.7 ? 1.6 : 1);
    scene.add(o);
  }
  // Cerca com portão no lado oeste
  const m = 0.4;
  const lines = [[x0 - m, z0 - m, x1 + m, z0 - m], [x1 + m, z0 - m, x1 + m, z1 + m], [x0 - m, z1 + m, x1 + m, z1 + m],
    [x0 - m, z0 - m, x0 - m, gate[0]], [x0 - m, gate[1], x0 - m, z1 + m]];
  for (const [a, b, c, d] of lines) {
    scene.add(M.makeFence(a, b, c, d));
    nav.blockLine(a, b, c, d, 0.08 + PLAYER_R);
  }
  // Bebedouro, fardos de feno e árvores de sombra
  const water = new THREE.Group();
  water.add(M.box(0.6, 0.4, 2.2, 0x8a8f96, 0, 0.2, 0));
  water.add(M.box(0.46, 0.04, 2.06, 0x5fb4e6, 0, 0.39, 0));
  water.position.set(x0 + 2.2, 0, gate[1] + 2.4);
  scene.add(water);
  nav.blockRect(x0 + 1.9, gate[1] + 1.3, x0 + 2.5, gate[1] + 3.5, PLAYER_R);
  for (const [hx, hz, ry] of [[x0 + 3.2, z0 + 1.6, 0.3], [x0 + 4.4, z0 + 1.4, 1.2], [x0 + 3.8, z0 + 2.6, 2.0]]) {
    const hay = new THREE.Group();
    hay.add(M.rot(M.cyl(0.4, 0.6, 0xe9c35a, 0, 0.4, 0), 0, 0, Math.PI / 2));
    hay.add(M.rot(M.cyl(0.41, 0.06, 0xb5893a, 0.12, 0.4, 0), 0, 0, Math.PI / 2));
    hay.add(M.rot(M.cyl(0.41, 0.06, 0xb5893a, -0.12, 0.4, 0), 0, 0, Math.PI / 2));
    hay.position.set(hx, 0, hz);
    hay.rotation.y = ry;
    scene.add(hay);
    nav.blockCircle(hx, hz, 0.4 + PLAYER_R * 0.5);
  }
  for (const [tx, tz] of [[x0 + 9, z0 + 4], [x1 - 5, z1 - 4], [x1 - 9, z0 + 3]]) {
    const t = M.makeTree('round', 1.25);
    t.position.set(tx, 0, tz);
    scene.add(t);
    leafTrees.push({ x: tx, z: tz, h: 2.4 });
    nav.blockCircle(tx, tz, 0.4 + PLAYER_R);
  }
  const label = M.textSprite(`${PASTURE.icon} ${PASTURE.name}`, 0.5);
  label.position.set(x0 - m, 1.5, (gate[0] + gate[1]) / 2);
  scene.add(label);
  pasture = { label };
}

function randomPasturePoint() {
  for (let k = 0; k < 30; k++) {
    const x = rand(PAST.x0 + 0.8, PAST.x1 - 0.8), z = rand(PAST.z0 + 0.8, PAST.z1 - 0.8);
    if (nav.free(x, z)) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3((PAST.x0 + PAST.x1) / 2, 0, (PAST.z0 + PAST.z1) / 2);
}
/** Onde o animal vive: gado no pasto (se comprado), aves no galinheiro (se construído), o resto no curral. */
const pointFor = (a) => { const h = core.homeOf(a); return h === 'pasto' ? randomPasturePoint() : h === 'galinheiro' ? randomCoopPoint() : randomPenPoint(); };

// ================= Campo de Trigo e galpão =================
let bigTex = null, bigTexData, bigWheat;
const bigTexKeys = new Uint8Array(BIG_CELLS).fill(255);
const bigStage = new Int8Array(BIG_CELLS).fill(-2);
const bigMaskShown = new Int16Array(BIG_CELLS).fill(-1);
const tmpMutColor = new THREE.Color();
const bigRot = new Float32Array(BIG_CELLS).map(() => Math.random() * Math.PI * 2);
const bigShade = new Float32Array(BIG_CELLS).map(() => Math.random());

function buildBigField() {
  const { cols, rows } = BIG_FIELD;
  const x1 = BIG_X0 + cols, z1 = BIG_Z0 + rows;

  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(cols + 0.8, rows + 0.8),
    new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  border.rotation.x = -Math.PI / 2;
  border.position.set(BIG.cx, 0.012, BIG.cz);
  border.receiveShadow = true;
  scene.add(border);

  // Uma textura com 1 pixel por célula pinta o chão inteiro (palha, arado, plantado)
  bigTexData = new Uint8Array(BIG_CELLS * 4);
  bigTex = new THREE.DataTexture(bigTexData, cols, rows);
  bigTex.magFilter = THREE.NearestFilter;
  bigTex.minFilter = THREE.NearestFilter;
  bigTex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(cols, rows),
    new THREE.MeshStandardMaterial({ map: bigTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(BIG.cx, 0.02, BIG.cz);
  ground.receiveShadow = true;
  scene.add(ground);

  // Trigo: um tufo instanciado por célula
  bigWheat = new THREE.InstancedMesh(M.makeWheatTuftGeometry(), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), BIG_CELLS);
  bigWheat.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bigWheat.castShadow = true;
  bigWheat.receiveShadow = true;
  bigWheat.frustumCulled = false;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let k = 0; k < BIG_CELLS; k++) {
    bigWheat.setMatrixAt(k, zero);
    bigWheat.setColorAt(k, C_WHEAT_GREEN);
  }
  scene.add(bigWheat);
  bigTexKeys.fill(255);
  bigStage.fill(-2);
  bigMaskShown.fill(-1);

  // Cerca nos lados norte, leste e sul. O oeste e o começo do norte ficam abertos para as máquinas
  const fences = [[BIG_X0 + 7, BIG_Z0 - 0.4, x1 + 0.4, BIG_Z0 - 0.4], [x1 + 0.4, BIG_Z0 - 0.4, x1 + 0.4, z1 + 0.4], [BIG_X0 - 0.4, z1 + 0.4, x1 + 0.4, z1 + 0.4]];
  for (const [a, b, c, d] of fences) {
    scene.add(M.makeFence(a, b, c, d));
    nav.blockLine(a, b, c, d, 0.08 + PLAYER_R);
  }
  const label = M.textSprite(`${BIG_FIELD.icon} ${BIG_FIELD.name}`, 0.5);
  label.position.set(BIG_X0 - 1, 1.6, BIG.cz);
  scene.add(label);
}

// ================= Galpão das máquinas (obra) =================
function buildShed() {
  const [x, z] = SHED;
  const shed = M.makeShed();
  shed.position.set(x, 0, z);
  scene.add(shed);
  const shedLabel = M.textSprite('🚜 Galpão', 0.45);
  shedLabel.position.set(x, 3.9, z);
  scene.add(shedLabel);
  // Clique no canteiro enquanto é obra
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(7.2, 2.4, 3.2);
  proxy.position.set(x, 1.2, z);
  proxy.userData.pick = { kind: 'spot', key: 'obra:galpao' };
  scene.add(proxy);
  pickables.push(proxy);
  sites.galpao = { model: shed, labels: [shedLabel], proxy };
  makeSite('galpao', x, z, 7.2, 3.2, 3.0);
  nav.blockLine(x - 3.6, z - 1.6, x + 3.6, z - 1.6, 0.1 + PLAYER_R);
  nav.blockLine(x - 3.6, z - 1.6, x - 3.6, z + 1.6, 0.1 + PLAYER_R);
  nav.blockLine(x + 3.6, z - 1.6, x + 3.6, z + 1.6, 0.1 + PLAYER_R);
  for (const dx of [-1.2, 1.2]) nav.blockCircle(x + dx, z + 1.55, 0.1 + PLAYER_R);
}

const C_WHEAT_GREEN = new THREE.Color(0x6fbf3a);
const C_WHEAT_GOLD = new THREE.Color(0xe9c35a);
const C_WHEAT_RIPE = new THREE.Color(0xf6d36b);
const BIG_SOIL = [
  [0xc9b46e, 0xbca763], // palha
  [0x7a5232, 0x6c472a], // arado (sulcos alternados)
  [0x5e3d22, 0x553720], // plantado
];
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Atualiza só o que mudou no Campo de Trigo: cor do chão e altura/cor do trigo. */
function syncBig() {
  if (!bigTex) return;
  const b = core.S.big;
  let texDirty = false, instDirty = false;
  const T = BIG_FIELD.time;
  for (let k = 0; k < BIG_CELLS; k++) {
    const st = b.s[k];
    if (bigTexKeys[k] !== st) {
      bigTexKeys[k] = st;
      const row = Math.floor(k / BIG_FIELD.cols);
      const col = BIG_SOIL[st][st === 0 ? (bigShade[k] > 0.5 ? 1 : 0) : row % 2];
      const py = BIG_FIELD.rows - 1 - row; // a linha 0 da textura fica no sul (z maior)
      const o = (py * BIG_FIELD.cols + (k % BIG_FIELD.cols)) * 4;
      bigTexData[o] = (col >> 16) & 255;
      bigTexData[o + 1] = (col >> 8) & 255;
      bigTexData[o + 2] = col & 255;
      bigTexData[o + 3] = 255;
      texDirty = true;
    }
    const stage = st === 2 ? (b.g[k] >= T ? 11 : Math.floor((b.g[k] / T) * 10)) : -1;
    const mask = b.mm ? b.mm[k] | 0 : 0;
    if (bigStage[k] !== stage || bigMaskShown[k] !== mask) {
      bigStage[k] = stage;
      bigMaskShown[k] = mask;
      const c = bigCellCenter(k);
      if (stage < 0) {
        tmpS.set(0, 0, 0);
      } else {
        const h = stage === 11 ? 0.8 : 0.12 + 0.58 * (stage / 10);
        const w = stage === 11 ? 1 : 0.55 + 0.45 * (stage / 10);
        tmpS.set(w, h, w);
      }
      tmpQ.setFromAxisAngle(UP, bigRot[k]);
      tmpM.compose(tmpV.set(c.x, 0.02, c.z), tmpQ, tmpS);
      bigWheat.setMatrixAt(k, tmpM);
      if (stage >= 0) {
        tmpColor.copy(stage === 11 ? C_WHEAT_RIPE : C_WHEAT_GREEN);
        if (stage !== 11) tmpColor.lerp(C_WHEAT_GOLD, stage / 12);
        const top = mask ? core.topMutation(core.maskToList(mask)) : null;
        if (top) tmpColor.lerp(tmpMutColor.setHex(MUTATIONS[top].color), 0.6);
        bigWheat.setColorAt(k, tmpColor);
      }
      instDirty = true;
    }
  }
  if (texDirty) bigTex.needsUpdate = true;
  if (instDirty) {
    bigWheat.instanceMatrix.needsUpdate = true;
    bigWheat.instanceColor.needsUpdate = true;
  }
}

// ================= Máquinas (o jogador dirige) =================
const machines = new Map();
let driving = null;
let zoomMult = 1;
let seedlessWarned = false;

function syncMachines() {
  for (const id of Object.keys(MACHINES)) {
    const st = core.S.machines[id];
    if (st && !machines.has(id)) {
      const def = MDEF[id];
      const m = def.make();
      const parked = st.x == null;
      const park = parkOf(id);
      const pos = new THREE.Vector3(parked ? park[0] : st.x, 0, parked ? park[1] : st.z);
      const heading = parked ? park[2] : st.h;
      if (parked) Object.assign(st, { x: pos.x, z: pos.z, h: heading });
      m.root.position.copy(pos);
      m.root.rotation.y = heading;
      m.root.userData.pick = { kind: 'machine', id };
      // Faróis próprios para acender só na máquina dirigida
      const lampMats = [];
      const base = M.machineLampMat();
      m.root.traverse((o) => {
        if (o.isMesh && o.material === base) {
          if (!lampMats.length) lampMats.push(base.clone());
          o.material = lampMats[0];
        }
      });
      scene.add(m.root);
      pickables.push(m.root);
      // Retângulo claro mostrando a faixa que o implemento trabalha
      const area = new THREE.Mesh(
        new THREE.PlaneGeometry(def.width, 0.9),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      area.rotation.x = -Math.PI / 2;
      area.position.set(0, 0.07, def.workZ);
      area.visible = false;
      m.root.add(area);
      machines.set(id, { id, def, m, pos, heading, speed: 0, area, harvested: 0, fxT: 0, sfxT: 0, smokeT: 0, lampMats });
    } else if (!st && machines.has(id)) {
      const v = machines.get(id);
      if (driving === id) exitMachine();
      scene.remove(v.m.root);
      pickables.splice(pickables.indexOf(v.m.root), 1);
      machines.delete(id);
    }
  }
}

function enterMachine(id) {
  const v = machines.get(id);
  if (!v || driving) return;
  driving = id;
  cancelJobs();
  player.m.root.visible = false;
  v.m.driver.visible = true;
  v.area.visible = true;
  v.speed = 0;
  ui.toast(`${MACHINES[id].icon} Dirigindo: ${MACHINES[id].name}. Espaço (ou ✋) para sair.`);
  sfx('open');
}

function exitMachine() {
  const v = machines.get(driving);
  driving = null;
  player.m.root.visible = true;
  if (!v) return;
  v.m.driver.visible = false;
  v.area.visible = false;
  v.speed = 0;
  const s = Math.sin(v.heading), c = Math.cos(v.heading);
  // Desce ao lado da máquina, num lugar livre
  let spot = null;
  for (const [lx, lz] of [[1.5, 0], [-1.5, 0], [0, -2.8], [2.3, 0], [-2.3, 0], [0, 3]]) {
    const x = v.pos.x + c * lx + s * lz, z = v.pos.z - s * lx + c * lz;
    if (nav.free(x, z)) { spot = { x, z }; break; }
  }
  if (!spot) {
    const [cx, cz] = nav.toCell(v.pos.x, v.pos.z);
    const n = nav.nearestFree(cx, cz);
    spot = n ? nav.center(n[0], n[1]) : { x: v.pos.x, z: v.pos.z };
  }
  player.pos.set(spot.x, 0, spot.z);
  player.heading = v.heading;
  Object.assign(core.S.machines[v.id], { x: v.pos.x, z: v.pos.z, h: v.heading });
  sfx('open');
}

/** Direção estilo arcade: a máquina gira aos poucos para onde você aponta e anda para frente. */
function driveMachine(dt, ix, iz, mag) {
  const v = machines.get(driving);
  const d = v.def;
  let target = 0;
  if (ix || iz) {
    const desired = Math.atan2(ix, iz);
    let diff = ((desired - v.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = d.turn * dt;
    v.heading += THREE.MathUtils.clamp(diff, -maxTurn, maxTurn);
    const align = Math.cos(diff);
    target = d.speed * mag * (align > 0 ? 0.35 + 0.65 * align : 0.3);
  }
  v.speed += (target - v.speed) * Math.min(1, dt * (target > v.speed ? 1.8 : 3.5));
  const s = Math.sin(v.heading), c = Math.cos(v.heading);
  const step = v.speed * dt;
  const nx = v.pos.x + s * step, nz = v.pos.z + c * step;
  if (nav.free(nx, nz) && nav.free(nx + s * d.front, nz + c * d.front)) {
    v.pos.x = nx;
    v.pos.z = nz;
  } else {
    v.speed *= 0.3; // bateu em algo
  }
  player.pos.copy(v.pos);
  player.heading = v.heading;
  Object.assign(core.S.machines[v.id], { x: v.pos.x, z: v.pos.z, h: v.heading });
  machineWork(v);
}

const CHAFF = 0xe6d27a;
function machineWork(v) {
  if (v.speed < 0.25) return;
  const d = v.def;
  const s = Math.sin(v.heading), c = Math.cos(v.heading);
  const wx = v.pos.x + s * d.workZ, wz = v.pos.z + c * d.workZ;
  let changed = 0, noseed = false;
  for (let j = 0; j < d.width; j++) {
    const off = (j - (d.width - 1) / 2) * 0.95;
    for (const along of [-0.3, 0.3]) {
      const px = wx + c * off + s * along, pz = wz - s * off + c * along;
      const k = bigCellAt(px, pz);
      if (k < 0) continue;
      const res = core.bigWork(v.id, k);
      if (res === 'noseed') { noseed = true; continue; }
      if (!res) continue;
      changed++;
      const p = bigCellCenter(k);
      if (res === 'till') burst(p.x, 0.15, p.z, 0x6c472a, 3, { up: 2.2, spread: 0.7 });
      else if (res === 'plant') burst(p.x, 0.15, p.z, 0x9ccc65, 2, { up: 1.2, spread: 0.4, size: 0.04 });
      else if (res === 'harvest') { v.harvested++; burst(p.x, 0.6, p.z, CHAFF, 2, { up: 2.5, spread: 0.6, size: 0.05 }); }
    }
  }
  if (noseed && !seedlessWarned) ui.toast('🌾 A plantadeira está sem sementes de trigo! Compre um saco ×50 na loja.', 'bad');
  seedlessWarned = noseed || (seedlessWarned && !(core.S.seeds.trigo > 0));
  if (changed && clock - v.sfxT > 0.35) {
    sfx(v.id === 'arado' ? 'till' : v.id === 'plantadeira' ? 'plant' : 'harvest');
    v.sfxT = clock;
  }
  // Palha saindo de trás da colheitadeira
  if (v.id === 'colheitadeira' && changed) burst(v.pos.x - s * 1.7, 1.2, v.pos.z - c * 1.7, CHAFF, 3, { up: 1.2, spread: 0.9, life: 0.9, gravity: 3 });
}

/** Animação das máquinas: rodas, molinete, vibração do motor e fumaça. */
function updateMachines(dt) {
  for (const v of machines.values()) {
    const m = v.m;
    if (driving !== v.id) v.speed *= Math.max(0, 1 - dt * 4);
    m.root.position.copy(v.pos);
    m.root.rotation.y = v.heading;
    for (const w of m.wheels) w.spin.rotation.x += (v.speed * dt) / w.r;
    const on = driving === v.id;
    m.body.position.y = on ? Math.sin(clock * 38) * 0.008 : 0;
    if (m.reel) m.reel.rotation.x += dt * (on ? 2.5 + v.speed : 0);
    if (on && clock - v.smokeT > 0.18) {
      v.smokeT = clock;
      const [ex, ey, ez] = v.def.exhaust;
      const p = m.root.localToWorld(tmpV.set(ex, ey, ez));
      burst(p.x, p.y, p.z, 0x555555, 1, { up: 1.4, spread: 0.15, life: 0.8, gravity: -0.5, size: 0.08 });
    }
    // Contador de trigo colhido
    if (v.harvested && clock - v.fxT > 0.7) {
      const p = screenPosOf({ machine: v.id });
      if (p) ui.fxAt(p.x, p.y, `+${v.harvested} 🌾`, 'gold');
      v.harvested = 0;
      v.fxT = clock;
    }
  }
}

function machineInfo() {
  const v = machines.get(driving);
  const sum = core.bigSummary();
  if (v.id === 'arado') return `🚜 ${v.def.verb} 3 faixas · palha a arar: ${sum.palha} lotes`;
  if (v.id === 'plantadeira') return `🚜 ${v.def.verb} 4 faixas · sementes de trigo: ${core.S.seeds.trigo || 0} · lotes arados: ${sum.arado}`;
  return `🌾 ${v.def.verb} 5 faixas · trigo maduro: ${sum.maduro} · crescendo: ${sum.crescendo}`;
}

/** Cerca de um cercado com portão no lado leste; enquanto é obra, aparecem as estacas com a cordinha. */
function fencedArea({ x1, x2, z1, z2, gate }) {
  const lines = [[x1, z1, x2, z1], [x1, z2, x2, z2], [x1, z1, x1, z2], [x2, z1, x2, gate[0]], [x2, gate[1], x2, z2]];
  const parts = [];
  const rope = new THREE.Group();
  for (const [a, b, c, d] of lines) {
    const fence = M.makeFence(a, b, c, d);
    scene.add(fence);
    parts.push(...fence.children);
    nav.blockLine(a, b, c, d, 0.08 + PLAYER_R);
    const n = Math.max(1, Math.round(Math.hypot(c - a, d - b) / 2));
    for (let k = 0; k <= n; k++) {
      const st = M.makeStake();
      st.position.set(a + ((c - a) * k) / n, 0, b + ((d - b) * k) / n);
      rope.add(st);
    }
    const line = M.box(Math.abs(c - a) || 0.02, 0.02, Math.abs(d - b) || 0.02, 0xf2f2f2, (a + c) / 2, 0.4, (b + d) / 2);
    line.castShadow = false;
    rope.add(line);
  }
  scene.add(rope);
  return { parts, rope };
}

let coopModel = null;
function buildCoop() {
  const { x1, x2, z1, z2, house } = COOP_YARD;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(x2 - x1, z2 - z1),
    new THREE.MeshStandardMaterial({ color: 0xcfb57a, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x1 + x2) / 2, 0.011, (z1 + z2) / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  const { parts, rope } = fencedArea(COOP_YARD);
  const [hx, hz] = house;
  const m = M.makeCoop();
  m.group.position.set(hx, 0, hz);
  scene.add(m.group);
  nav.blockRect(hx - 1.15, hz - 0.8, hx + 1.65, hz + 0.75, PLAYER_R * 0.6);
  const label = M.textSprite('🐔 Galinheiro', 0.42);
  label.position.set(hx, SPOTS.galinheiro.labelY, hz);
  scene.add(label);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(2.8, 2.0, 1.8);
  proxy.position.set(hx + 0.2, 1.0, hz);
  proxy.userData.pick = { kind: 'spot', key: 'galinheiro' };
  scene.add(proxy);
  pickables.push(proxy);
  const feeder = M.makeChickenFeeder();
  feeder.position.set(x1 + 4.2, 0, z1 + 0.65);
  feeder.userData.pick = { kind: 'spot', key: 'galinheiro' };
  scene.add(feeder);
  pickables.push(feeder);
  nav.blockRect(x1 + 3.6, z1 + 0.4, x1 + 5.2, z1 + 0.9, PLAYER_R * 0.6);
  coopModel = m;
  sites.galinheiro = { parts, rope, sign: new THREE.Group(), labels: [label], model: m.group, extras: [feeder] };
  makeSite('galinheiro', hx, hz, 2.9, 1.8, 2.6);
}

/** Ovos prontos aparecem na cesta da porta do galinheiro. */
function updateCoop() {
  if (!coopModel) return;
  const n = core.built('galinheiro') ? core.S.animals.filter((a) => core.inCoop(a) && a.ready).length : 0;
  coopModel.eggs.forEach((e, k) => { e.visible = k < n; });
}

function buildPen() {
  const { x1, x2, z1, z2, gate } = PEN;
  const zc = (z1 + z2) / 2;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(x2 - x1, z2 - z1),
    new THREE.MeshStandardMaterial({ color: 0xd8c27e, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x1 + x2) / 2, 0.011, zc);
  ground.receiveShadow = true;
  scene.add(ground);

  const { parts, rope } = fencedArea(PEN);
  const label = M.textSprite('🐾 Curral', 0.42);
  label.position.set(x2, 1.4, (gate[0] + gate[1]) / 2);
  scene.add(label);

  const trough = M.makeTrough();
  trough.position.set(SPOTS.cocho.at[0], 0, SPOTS.cocho.at[1]);
  trough.userData.pick = { kind: 'spot', key: 'cocho' };
  scene.add(trough);
  pickables.push(trough);
  nav.blockRect(x1 + 0.4, zc - 0.75, x1 + 1.0, zc + 0.75, PLAYER_R);
  sites.curral = { parts, rope, labels: [label], extras: [trough] };

  // Silo do alimentador automático (aparece quando a melhoria é comprada)
  feeder = M.makeFeeder();
  feeder.position.set(x1 + 0.65, 0, zc - 1.5);
  feeder.visible = false;
  scene.add(feeder);
  nav.blockCircle(x1 + 0.65, zc - 1.5, 0.4 + PLAYER_R);

  // Placa da obra no portão (some quando o curral fica pronto)
  const st = sites.curral;
  const [sx, sz] = SPOTS['obra:curral'].at;
  st.sign = M.makeSaleSign();
  st.sign.position.set(sx, 0, sz);
  st.sign.rotation.y = Math.PI / 2;
  scene.add(st.sign);
  st.siteLabel = M.textSprite(`🏗️ ${BUILDINGS.curral.name}`, 0.42);
  st.siteLabel.position.set(sx, 1.7, sz);
  scene.add(st.siteLabel);
  const signProxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  signProxy.scale.set(0.6, 1.4, 1.3);
  signProxy.position.set(sx, 0.7, sz);
  signProxy.userData.pick = { kind: 'spot', key: 'obra:curral' };
  scene.add(signProxy);
  pickables.push(signProxy);
  st.proxy = signProxy;
  buildCompost();
}

const scatter = []; // flores, tufos e pedras soltos (saem do caminho quando algo é construído em cima)

function buildNature() {
  const put = (obj, x, z, ry = Math.random() * Math.PI * 2) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    scene.add(obj);
    return obj;
  };
  const B = BOUNDS;
  // Árvores altas só no fundo e à esquerda (não escondem o personagem)
  const tree = (kind, s, x, z) => {
    put(M.makeTree(kind, s), x, z);
    if (kind !== 'pine') leafTrees.push({ x, z, h: 1.9 * s });
  };
  for (let x = B.minX - 8; x <= B.maxX + 6; x += rand(1.6, 2.6)) tree(Math.random() < 0.55 ? 'pine' : 'round', rand(0.9, 1.35), x, rand(B.minZ - 2.9, B.minZ - 1.1));
  for (let x = B.minX - 6; x <= B.maxX + 6; x += rand(2.2, 3.4)) tree(Math.random() < 0.5 ? 'pine' : 'round', rand(1.0, 1.5), x, rand(B.minZ - 6.2, B.minZ - 4.2));
  for (let z = B.minZ; z <= B.maxZ - 6; z += rand(1.6, 2.4)) tree(Math.random() < 0.6 ? 'pine' : 'round', rand(0.9, 1.3), rand(B.minX - 2.8, B.minX - 1.2), z);
  for (const [x, z, s] of [[-21, -13, 1.1], [12.5, -16, 1.0]]) {
    tree('apple', s, x, z);
    nav.blockCircle(x, z, 0.35 + PLAYER_R);
  }

  // Arbustos nas bordas da frente e da direita
  for (let x = B.minX - 1; x <= B.maxX + 1; x += rand(1.2, 2.2)) put(M.makeBush(rand(0.8, 1.2)), x, rand(B.maxZ + 0.8, B.maxZ + 1.6));
  for (let z = B.minZ + 1; z <= B.maxZ + 1; z += rand(1.2, 2.2)) put(M.makeBush(rand(0.8, 1.2)), rand(B.maxX + 0.8, B.maxX + 1.6), z);
  for (let z = B.maxZ - 8; z <= B.maxZ + 1; z += rand(1.4, 2)) put(M.makeBush(rand(0.8, 1.1)), rand(B.minX - 1.2, B.minX - 0.6), z);
  // Flores, tufos e pedras pela grama livre
  const flowerColors = [0xff6f91, 0xffffff, 0xffd54f, 0xba68c8, 0xff8a65, 0x64b5f6];
  for (let k = 0; k < 340; k++) {
    const x = rand(B.minX, B.maxX), z = rand(B.minZ, B.maxZ + 0.5);
    if (occupied(x, z, 0.5, true) || CHOP_TREES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 0.6)) continue;
    const r = Math.random();
    const o = r < 0.6 ? M.makeFlower(flowerColors[k % flowerColors.length]) : r < 0.85 ? M.makeGrassTuft() : M.makeRock(rand(0.5, 1));
    put(o, x, z);
    scatter.push({ o, x, z });
  }
}

function buildRain() {
  const N = 700;
  const pos = new Float32Array(N * 6);
  const drops = [];
  for (let k = 0; k < N; k++) drops.push({ x: rand(-22, 22), y: rand(0, 16), z: rand(-22, 22) });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6e8ff, transparent: true, opacity: 0 }));
  rain.frustumCulled = false;
  rain.userData.drops = drops;
  rain.visible = false;
  scene.add(rain);
}

// ================= Efeitos dos eventos climáticos =================
let snow, snowCover, leaves, rainbow;
let rainbowAnchor = null; // onde o arco-íris ficou quando apareceu
const bolts = [];
const SNOW_N = 900;
const LEAF_N = 110;

function buildWeatherFx() {
  // Neve: flocos (pontos) que caem devagar com um leve balanço
  const pos = new Float32Array(SNOW_N * 3);
  const flakes = [];
  for (let k = 0; k < SNOW_N; k++) flakes.push({ x: rand(-22, 22), y: rand(0, 14), z: rand(-22, 22), p: rand(0, 6.28) });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(dot);
  snow = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6 * Math.min(window.devicePixelRatio, 2), map: tex, transparent: true, opacity: 0, depthWrite: false }));
  snow.userData.flakes = flakes;
  snow.frustumCulled = false;
  snow.visible = false;
  scene.add(snow);

  // Manto branco sobre o chão
  snowCover = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false }),
  );
  snowCover.rotation.x = -Math.PI / 2;
  snowCover.position.y = 0.025;
  snowCover.visible = false;
  scene.add(snowCover);

  // Ventania: folhas voando
  leaves = new THREE.Group();
  const leafGeo = new THREE.BoxGeometry(0.18, 0.02, 0.12);
  const leafColors = [0x7cb342, 0xc0ca33, 0xffb300, 0x8d6e63];
  for (let k = 0; k < LEAF_N; k++) {
    const m = new THREE.Mesh(leafGeo, basicMat(leafColors[k % leafColors.length]));
    m.userData = { x: rand(-18, 18), y: rand(0.3, 4), z: rand(-18, 18), s: rand(0.7, 1.3), p: rand(0, 6.28) };
    leaves.add(m);
  }
  leaves.visible = false;
  scene.add(leaves);

  // Arco-íris: sete arcos coloridos
  rainbow = new THREE.Group();
  const colors = [0xff3b30, 0xff9500, 0xffcc00, 0x34c759, 0x32ade6, 0x5856d6, 0xaf52de];
  colors.forEach((col, k) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(8.6 - k * 0.24, 0.12, 6, 64, Math.PI),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false }),
    );
    arc.renderOrder = 4;
    rainbow.add(arc);
  });
  rainbow.rotation.y = Math.PI / 4; // de frente para a câmera
  rainbow.visible = false;
  scene.add(rainbow);
}

function fadeTo(current, target, dt, speed = 1.5) {
  return current + (target - current) * Math.min(1, dt * speed);
}

// Neve acumulada no topo das árvores e nos telhados: junta enquanto neva e derrete devagar depois
let snowCap = 0;
function updateSnowCaps(dt, snowOn) {
  const winter = sys.season().id === 'inverno';
  const rate = snowOn ? 1 / 25 : winter ? 1 / 90 : 1 / 20;
  const target = snowOn ? 1 : 0;
  const next = snowCap + Math.max(-rate * dt, Math.min(rate * dt, target - snowCap));
  if (next === snowCap) return;
  snowCap = next;
  const m = M.SNOW_MAT;
  m.opacity = snowCap;
  m.visible = snowCap > 0.01;
  const transparent = snowCap < 0.99;
  if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
}

function updateWeatherFx(dt, evId) {
  // Neve
  const snowOn = evId === 'neve';
  snow.material.opacity = fadeTo(snow.material.opacity, snowOn ? 0.95 : 0, dt);
  snow.visible = snow.material.opacity > 0.01;
  if (snow.visible) {
    const arr = snow.geometry.attributes.position.array;
    for (let k = 0; k < SNOW_N; k++) {
      const f = snow.userData.flakes[k];
      f.y -= 1.3 * dt;
      f.x += Math.sin(clock * 1.3 + f.p) * 0.4 * dt;
      if (f.y < 0) { f.y += 14; f.x = rand(-22, 22); f.z = rand(-22, 22); }
      arr[k * 3] = camTarget.x + f.x;
      arr[k * 3 + 1] = f.y;
      arr[k * 3 + 2] = camTarget.z + f.z;
    }
    snow.geometry.attributes.position.needsUpdate = true;
  }
  updateSnowCaps(dt, snowOn);
  // O chão vai ficando branco durante a neve e derrete depois
  // No inverno fica uma camada fina de neve mesmo sem nevar
  const winter = sys.season().id === 'inverno' ? 0.28 : 0;
  snowCover.material.opacity = fadeTo(snowCover.material.opacity, snowOn ? 0.5 : winter, dt, snowOn ? 0.08 : 0.25);
  snowCover.visible = snowCover.material.opacity > 0.01;
  if (snowCover.visible) snowCover.position.set(camTarget.x, 0.025, camTarget.z);

  // Folhas na ventania
  const windOn = evId === 'ventania';
  leaves.visible = windOn || (leaves.visible && leaves.scale.x > 0.05);
  leaves.scale.setScalar(fadeTo(leaves.scale.x, windOn ? 1 : 0, dt, 2));
  if (leaves.visible) {
    for (const m of leaves.children) {
      const u = m.userData;
      u.x += 7 * u.s * dt;
      u.z += 2.5 * u.s * dt;
      if (u.x > 18) { u.x -= 36; u.z = rand(-18, 18); u.y = rand(0.3, 4); }
      if (u.z > 18) u.z -= 36;
      m.position.set(camTarget.x + u.x, u.y + Math.sin(clock * 3 + u.p) * 0.4, camTarget.z + u.z);
      m.rotation.set(clock * 6 * u.s + u.p, clock * 4 + u.p, clock * 5 * u.s);
    }
  }

  // Arco-íris
  const rbOn = evId === 'arcoiris';
  const rbTarget = rbOn ? 0.42 : 0;
  let rbOp = 0;
  for (const arc of rainbow.children) {
    arc.material.opacity = fadeTo(arc.material.opacity, rbTarget, dt, 0.8);
    rbOp = arc.material.opacity;
  }
  rainbow.visible = rbOp > 0.01;
  if (rbOn && !rainbowAnchor) {
    // Quando o arco-íris aparece, fica fixo naquele lugar (dimensionado para a tela daquele momento)
    const halfW = (camera.right - camera.left) / 2, halfH = (camera.top - camera.bottom) / 2;
    const d = (0.35 * halfH) / 0.63; // deslocamento no chão em direção à câmera
    rainbowAnchor = { x: camTarget.x + d * 0.707, z: camTarget.z + d * 0.707, scale: (halfW * 0.85) / 8.6 };
  }
  if (!rbOn && !rainbow.visible) rainbowAnchor = null;
  if (rainbow.visible && rainbowAnchor) {
    rainbow.scale.setScalar(rainbowAnchor.scale);
    rainbow.position.set(rainbowAnchor.x, -0.2, rainbowAnchor.z);
  }

  // Raios
  for (let k = bolts.length - 1; k >= 0; k--) {
    const b = bolts[k];
    b.t -= dt;
    const o = Math.max(0, b.t / b.max);
    for (const m of b.group.children) m.material.opacity = o;
    if (b.t <= 0) {
      scene.remove(b.group);
      bolts.splice(k, 1);
    }
  }
}

const boltGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
const UP_Y = new THREE.Vector3(0, 1, 0);

/** Um raio caindo (tempestade): clarão, trovão, faíscas e o risco do raio até o alvo. */
export function onStrike(data) {
  let x, z, y = 0.3;
  if (data.tile != null) {
    const t = tilePos(data.tile);
    x = t.x; z = t.z; y = plotVis[data.tile].top + 0.3;
  } else if (data.cell != null) {
    const c = bigCellCenter(data.cell);
    x = c.x; z = c.z;
  } else {
    x = camTarget.x + rand(-9, 9); z = camTarget.z + rand(-9, 9);
  }
  const group = new THREE.Group();
  const pts = [];
  for (let k = 0; k <= 9; k++) {
    const t = k / 9;
    const j = k === 0 || k === 9 ? 0 : 0.6 * (1 - t * 0.5);
    pts.push(new THREE.Vector3(x + rand(-j, j), 16 - t * (16 - y), z + rand(-j, j)));
  }
  const core1 = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, depthWrite: false });
  const glow = new THREE.MeshBasicMaterial({ color: 0xb39ddb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    for (const [mat, rad] of [[core1, 0.05], [glow, 0.16]]) {
      const m = new THREE.Mesh(boltGeo, mat);
      m.position.copy(a).addScaledVector(dir, 0.5);
      m.scale.set(rad, len, rad);
      m.quaternion.setFromUnitVectors(UP_Y, dir.normalize());
      group.add(m);
      dir.multiplyScalar(len);
    }
  }
  const flare = M.makeGlow(0xfff59d, 3.2);
  flare.position.set(x, y + 0.2, z);
  group.add(flare);
  scene.add(group);
  bolts.push({ group, t: 0.45, max: 0.45 });
  flashT = 0.4;
  burst(x, y, z, 0xfff176, 18, { up: 3.2, spread: 0.9, size: 0.06, life: 0.6 });
  sfx('thunder');
}

function squareRing(color, opacity) {
  const geo = new THREE.RingGeometry(0.6, 0.7, 4, 1, Math.PI / 4);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.renderOrder = 5;
  m.visible = false;
  scene.add(m);
  return m;
}

function buildHelpers() {
  hoverRing = squareRing(0xffffff, 0.75);
  targetRing = squareRing(0xffd54f, 0.95);
  const geo = new THREE.RingGeometry(0.14, 0.22, 20);
  geo.rotateX(-Math.PI / 2);
  clickMarker = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  clickMarker.position.y = 0.03;
  scene.add(clickMarker);
}

// ================= Seta-guia (tutorial e dicas) =================
let guideDesc = null;
let guideArrow, guideRing, guideEdge;
const tmpGuide = new THREE.Vector3();

/** Define o alvo da seta-guia: { tile } | { spot } | { pond } | { field } | { big } | { machine } | null. */
export function setGuide(desc) { guideDesc = desc; }

function buildGuide() {
  guideArrow = new THREE.Group();
  const fill = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const edge = new THREE.MeshBasicMaterial({ color: 0x6f4825, side: THREE.BackSide });
  const headGeo = new THREE.ConeGeometry(0.3, 0.48, 4);
  const shaftGeo = new THREE.BoxGeometry(0.17, 0.5, 0.17);
  const part = (geo, mat, y, s = 1, flip = false) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.scale.setScalar(s);
    if (flip) m.rotation.x = Math.PI;
    m.renderOrder = 20;
    guideArrow.add(m);
  };
  part(headGeo, fill, 0.24, 1, true);
  part(headGeo, edge, 0.24, 1.18, true);
  part(shaftGeo, fill, 0.72);
  part(shaftGeo, edge, 0.72, 1.3);
  guideArrow.visible = false;
  scene.add(guideArrow);

  const ringGeo = new THREE.RingGeometry(0.5, 0.64, 36);
  ringGeo.rotateX(-Math.PI / 2);
  guideRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.85, depthWrite: false }));
  guideRing.renderOrder = 6;
  guideRing.visible = false;
  scene.add(guideRing);
  guideEdge = document.getElementById('guide-edge');
}

function guidePos(d) {
  if (d.tile != null) {
    const t = tilePos(d.tile), v = plotVis[d.tile];
    return { x: t.x, z: t.z, h: v.top + Math.max(0.5, v.cropH) + 0.55, gx: t.x, gz: t.z, gy: v.top + 0.02 };
  }
  if (d.spot) {
    const sp = SPOTS[d.spot];
    if (!sp || (sp.lot && !lotPlaced(sp.lot))) return null;
    return { x: sp.at[0], z: sp.at[1], h: (sp.labelY || 1.4) + 0.55, gx: sp.point[0], gz: sp.point[1], gy: 0.04 };
  }
  if (d.pond) return { x: POND.x, z: POND.z, h: 1.3 };
  if (d.horse) return horse ? { x: horse.pos.x, z: horse.pos.z, h: 2.6, gx: horse.pos.x, gz: horse.pos.z, gy: 0.04 } : null;
  if (d.tree != null) { const v = grove[d.tree]; return v ? { x: v.x, z: v.z, h: 3.3 } : null; }
  if (d.field) { if (!lotPlaced(d.field)) return null; const [x, z] = FIELD_POS[d.field]; return { x, z, h: 1.6 }; }
  if (d.big) return lotPlaced('trigo') ? { x: BIG_X0 + 2, z: BIG.cz, h: 1.8 } : null;
  if (d.pasture) return PAST ? { x: PAST.x0 + 3, z: (PAST.gate[0] + PAST.gate[1]) / 2, h: 2 } : null;
  if (d.machine) {
    const v = machines.get(d.machine);
    return v ? { x: v.pos.x, z: v.pos.z, h: v.id === 'colheitadeira' ? 3.7 : 2.5, gx: v.pos.x, gz: v.pos.z, gy: 0.04 } : null;
  }
  return null;
}

function updateGuide(dt) {
  const p = guideDesc && guidePos(guideDesc);
  if (!p) {
    guideArrow.visible = false;
    guideRing.visible = false;
    guideEdge.hidden = true;
    return;
  }
  guideArrow.visible = true;
  guideArrow.position.set(p.x, p.h + Math.abs(Math.sin(clock * 4)) * 0.28, p.z);
  guideArrow.rotation.y += dt * 2;
  guideRing.visible = p.gx != null;
  if (guideRing.visible) {
    guideRing.position.set(p.gx, p.gy, p.gz);
    guideRing.scale.setScalar(1 + Math.sin(clock * 5) * 0.08);
  }

  // Alvo fora da tela: setinha na borda apontando para ele
  tmpGuide.set(p.x, p.h, p.z).project(camera);
  const rect = canvas.getBoundingClientRect();
  const sx = ((tmpGuide.x + 1) / 2) * rect.width, sy = ((1 - tmpGuide.y) / 2) * rect.height;
  const mx = 46, top = 110, bottom = 170;
  const off = sx < mx || sx > rect.width - mx || sy < top || sy > rect.height - bottom;
  guideEdge.hidden = !off;
  if (!off) return;
  const cx = rect.width / 2, cy = (top + rect.height - bottom) / 2;
  const dx = sx - cx, dy = sy - cy;
  const k = Math.min((rect.width / 2 - mx) / Math.max(1e-6, Math.abs(dx)), (rect.height - top - bottom) / 2 / Math.max(1e-6, Math.abs(dy)));
  guideEdge.style.left = rect.left + cx + dx * k + 'px';
  guideEdge.style.top = rect.top + cy + dy * k + 'px';
  guideEdge.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(dy, dx)}rad)`;
}

// ================= Fauna: lugares livres =================
/** Ponto ocupado por algo (campos, cercados, obras, lago; com roads = true também ruas e sede)? */
function occupied(x, z, m = 0.5, roads = false) {
  const inR = (q) => x > q[0] - m && x < q[2] + m && z > q[1] - m && z < q[3] + m;
  for (const [id, p] of Object.entries(core.S.layout || {})) {
    if (!LOTS[id]) continue;
    const e = LOTS[id].ext;
    if (inR([p.x + e[0], p.z + e[1], p.x + e[2], p.z + e[3]])) return true;
  }
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + m) return true;
  if (inR(RESERVED[7])) return true; // campo principal
  if (!roads) return false;
  return RESERVED.some(inR) || ROADS.some(inR) || paths.some(inR);
}
/** Ponto de grama livre (fora de campos, cercados e lago), para os bichos de cenário. */
const inFieldOrPond = (x, z) => occupied(x, z, 0.6);

function randomSpot() {
  for (let k = 0; k < 80; k++) {
    const x = rand(-24, 36), z = rand(-17, 26);
    if (nav.free(x, z) && !inFieldOrPond(x, z)) return { x, z };
  }
  return { x: 6, z: -3 };
}

// ================= Câmera =================
const tmpLook = new THREE.Vector3();
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  const a = w / h;
  // Em tela vertical (celular), garante uma largura de visão confortável
  const z = zoom * zoomMult;
  const vh = a >= 1 ? z : (z * 0.8) / a;
  camera.left = (-vh * a) / 2;
  camera.right = (vh * a) / 2;
  camera.top = vh / 2;
  camera.bottom = -vh / 2;
  camera.updateProjectionMatrix();
}

export function zoomBy(f) {
  zoom = THREE.MathUtils.clamp(zoom * f, photo ? 3 : 7, photo ? 40 : 24);
  resize();
}

function updateCamera(dt) {
  const want = focus ? 0.3 : lotPlacing ? (LOTS[lotPlacing.id].ext[2] - LOTS[lotPlacing.id].ext[0] > 15 ? 2.4 : 1.5) : driving ? 1.4 : riding ? 1.15 : 1;
  if (Math.abs(zoomMult - want) > 0.002) {
    zoomMult += (want - zoomMult) * Math.min(1, dt * 2);
    resize();
  }
  // Ao dirigir, a câmera olha um pouco à frente da máquina
  let look = driving ? tmpLook.set(Math.sin(player.heading) * 2.5, 0, Math.cos(player.heading) * 2.5).add(player.pos) : player.pos;
  if (focus) {
    // Personagem de frente para a câmera, um pouco acima do centro (o cartão fica embaixo)
    player.heading = Math.PI / 4 + camYaw;
    const [dx, dz] = camDir(0.3, 0.3);
    look = tmpFocus.set(player.pos.x + dx, (riding ? 1.2 : 0.55), player.pos.z + dz);
  }
  camTarget.lerp(look, 1 - Math.exp(-6 * dt));
  camYaw += (camYawTarget - camYaw) * (1 - Math.exp(-14 * dt));
  camOffset.copy(ISO).applyAxisAngle(UP_Y, camYaw);
  camera.position.copy(camTarget).add(camOffset);
  camera.lookAt(camTarget);
}

// ================= Céu, luz e chuva =================
const C_DAY = new THREE.Color(0xa7dcff);
const C_DUSK = new THREE.Color(0xffb27a);
const C_NIGHT = new THREE.Color(0x16203f);
const C_RAIN = new THREE.Color(0x8d9fb0);
const C_MOON = new THREE.Color(0x6070a0);
const tmpColor = new THREE.Color();
const C_FLASH = new THREE.Color(0xf4f1ff);
const C_HEAT = new THREE.Color(0xffb74d);
const C_SNOWY = new THREE.Color(0xe8f4ff);
const C_ECLIPSE = new THREE.Color(0x7e57c2);
// Cor do céu de cada evento e quanto ela pesa
const EVENT_TINT = {
  neve: [new THREE.Color(0xe3edf5), 0.6],
  calor: [new THREE.Color(0xffc46b), 0.5],
  tempestade: [new THREE.Color(0x3c4656), 0.75],
  ventania: [new THREE.Color(0xb7c7b0), 0.35],
  eclipse: [new THREE.Color(0x2a1f4a), 0.55],
  arcoiris: [new THREE.Color(0xcff3ff), 0.3],
};
// Luz da cena em cada evento: [intensidade, cor do sol]
const EVENT_LIGHT = {
  tempestade: [0.38, new THREE.Color(0x9fb3d1)],
  chuva: [0.8, new THREE.Color(0xd5dde6)],
  calor: [1.3, new THREE.Color(0xffa64d)],
  neve: [0.95, new THREE.Color(0xe3f0ff)],
  ventania: [0.85, new THREE.Color(0xeef3dc)],
  arcoiris: [1.05, new THREE.Color(0xfff1dc)],
  eclipse: [0.6, new THREE.Color(0xa592ff)],
};
let flashT = 0;

function updateSky(dt) {
  const S = core.S;
  const d = core.darkness();
  const h = core.dayHours();
  const raining = S.weather === 'chuva';

  tmpColor.copy(C_DAY).lerp(C_NIGHT, d);
  const dusk = d > 0 && d < 1 ? 1 - Math.abs(d - 0.5) * 2 : 0;
  tmpColor.lerp(C_DUSK, dusk * 0.55);
  if (raining) tmpColor.lerp(C_RAIN, 0.65 * (1 - d));
  const evId = S.event ? S.event.id : null;
  const tint = EVENT_TINT[evId];
  if (tint) tmpColor.lerp(tint[0], tint[1]);
  scene.background.lerp(tmpColor, 1 - Math.exp(-3 * dt));
  if (flashT > 0) {
    flashT = Math.max(0, flashT - dt);
    scene.background.lerp(C_FLASH, Math.min(1, flashT * 2.5));
  }

  // O sol atravessa o céu entre 6h e 19h, mudando a direção das sombras
  const a = THREE.MathUtils.clamp((h - 6) / 13, 0, 1) * Math.PI;
  sun.position.set(camTarget.x + Math.cos(a) * 12, camTarget.y + 3 + Math.sin(a) * 16, camTarget.z + 8);
  sun.target.position.copy(camTarget);
  sun.intensity = (1 - d) * (raining ? 1.0 : evId === 'calor' ? 3.3 : evId === 'neve' ? 1.6 : 2.4);
  sun.color.setHSL(0.1, 0.6, 0.85 - dusk * 0.15);
  moon.intensity = d * 0.8;
  hemi.intensity = 0.5 + (1 - d) * (raining ? 0.6 : 0.8);
  hemi.color.copy(C_DAY).lerp(C_MOON, d);
  if (evId === 'calor') hemi.color.lerp(C_HEAT, 0.5);
  if (evId === 'neve') hemi.color.lerp(C_SNOWY, 0.5);
  if (evId === 'eclipse') hemi.color.lerp(C_ECLIPSE, 0.6);
  const light = EVENT_LIGHT[evId];
  if (light) {
    sun.intensity *= light[0];
    hemi.intensity *= (light[0] + 1) / 2;
    sun.color.lerp(light[1], 0.7);
  }
  hemi.intensity += flashT * 4;
  updateWeatherFx(dt, evId);

  for (const l of lamps) l.intensity = l.userData.needs && !core.built(l.userData.needs) ? 0 : d * 14;
  for (const m of glowMats) m.emissiveIntensity = d * 1.3;

  // Chuva
  const target = raining ? (evId === 'tempestade' ? 0.8 : 0.55) : 0;
  rain.material.opacity += (target - rain.material.opacity) * Math.min(1, dt * 2);
  rain.visible = rain.material.opacity > 0.01;
  if (rain.visible) {
    const arr = rain.geometry.attributes.position.array;
    const drops = rain.userData.drops;
    for (let k = 0; k < drops.length; k++) {
      const p = drops[k];
      p.y -= 16 * dt;
      if (p.y < 0) { p.y += 16; p.x = rand(-22, 22); p.z = rand(-22, 22); }
      const x = camTarget.x + p.x, z = camTarget.z + p.z;
      const o = k * 6;
      arr[o] = x; arr[o + 1] = p.y; arr[o + 2] = z;
      arr[o + 3] = x + 0.06; arr[o + 4] = p.y + 0.55; arr[o + 5] = z + 0.06;
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }
}

// ================= Partículas =================
const PGEO = new THREE.BoxGeometry(1, 1, 1);
function burst(x, y, z, color, n, o = {}) {
  const spread = o.spread ?? 1;
  const up = o.up ?? 2.2;
  for (let k = 0; k < n; k++) {
    const m = particlePool.pop() || new THREE.Mesh(PGEO);
    m.material = basicMat(color);
    const s = (o.size || 0.06) * rand(0.7, 1.3);
    m.scale.setScalar(s);
    m.position.set(x + rand(-0.25, 0.25) * spread, y, z + rand(-0.25, 0.25) * spread);
    m.userData.v = new THREE.Vector3(rand(-1, 1) * spread, rand(0.6, 1) * up, rand(-1, 1) * spread);
    m.userData.life = m.userData.max = (o.life || 0.6) * rand(0.8, 1.2);
    m.userData.s = s;
    m.userData.g = o.gravity ?? 7;
    scene.add(m);
    particles.push(m);
  }
}

function updateParticles(dt) {
  for (let k = particles.length - 1; k >= 0; k--) {
    const m = particles[k];
    const u = m.userData;
    u.life -= dt;
    if (u.life <= 0) {
      scene.remove(m);
      particles.splice(k, 1);
      particlePool.push(m);
      continue;
    }
    u.v.y -= u.g * dt;
    m.position.addScaledVector(u.v, dt);
    if (m.position.y < 0.05) { m.position.y = 0.05; u.v.multiplyScalar(0.4); }
    m.rotation.x += dt * 5;
    m.rotation.y += dt * 4;
    m.scale.setScalar(u.s * Math.sqrt(u.life / u.max));
  }
}

const CROP_COLOR = { trigo: 0xf3d77a, cenoura: 0xf07c22, tomate: 0xe0372d, milho: 0xf5d23f, morango: 0xe8264a, berinjela: 0x5b2a86, abobora: 0xf08a24, girassol: 0xffcf1f,
  alface: 0x8bc34a, batata: 0xc8a165, cebola: 0xd6b8c8, pimentao: 0x43a047, feijao: 0x8d4b2b, algodao: 0xffffff, cana: 0xb5d06b, melancia: 0xe53950, uva: 0x7b3fa0, cafe: 0xc62828, abacaxi: 0xf2c14e };

function actionEffect(kind, pos, extra) {
  const { x, z } = pos;
  if (kind === 'till') { burst(x, 0.2, z, 0x8a5a33, 12, { up: 2.6 }); burst(x, 0.2, z, 0x6b4423, 6, { up: 2 }); }
  else if (kind === 'water') burst(x, 1.0, z, 0x64b5f6, 18, { up: -0.6, spread: 0.6, gravity: 9, life: 0.45, size: 0.05 });
  else if (kind === 'plant') burst(x, 0.25, z, 0x7cb342, 8, { up: 1.6, spread: 0.6 });
  else if (kind === 'harvest') { burst(x, 0.5, z, 0xffe57f, 10, { up: 3, size: 0.05 }); burst(x, 0.4, z, CROP_COLOR[extra] || 0xffd54f, 8, { up: 2.5 }); }
  else if (kind === 'buy') burst(x, 0.3, z, 0xffd54f, 22, { up: 3.6, size: 0.07 });
  else if (kind === 'feed') burst(x, 0.6, z, 0xe6c35c, 10, { up: 2, spread: 0.6 });
  else if (kind === 'collect') burst(x, 0.7, z, 0xffe57f, 14, { up: 3, size: 0.05 });
}

// ================= Lavoura (sincroniza com o estado) =================
function syncFields() {
  for (const f of FIELDS) {
    if (!f.cost) continue;
    const owned = core.fieldOwned(f.id) && lotPlaced(f.id);
    if (fieldShown[f.id] === owned) continue;
    const justBought = owned && fieldShown[f.id] === false;
    fieldShown[f.id] = owned;
    for (let i = f.start; i < f.start + f.count; i++) plotVis[i].group.visible = owned;
    if (justBought) actionEffect('buy', { x: FIELD_POS[f.id][0], z: FIELD_POS[f.id][1] });
  }
}

function syncPlots() {
  const S = core.S;
  for (let i = 0; i < plotVis.length; i++) {
    const p = S.plots[i];
    const v = plotVis[i];
    const wet = (p.s === 'tilled' || p.s === 'planted') && core.isWet(p);

    const baseKey = p.s + wet;
    if (v.baseKey !== baseKey) {
      v.baseKey = baseKey;
      const h = p.s === 'locked' ? 0.04 : p.s === 'grass' ? 0.08 : 0.16;
      v.base.material = p.s === 'locked' ? matLocked : p.s === 'grass' ? matGrass : wet ? matSoilWet : matSoil;
      v.base.scale.set(p.s === 'locked' ? 0.96 : 1, h, p.s === 'locked' ? 0.96 : 1);
      v.base.position.y = h / 2;
      v.top = h;
      v.deco.visible = p.s === 'grass';
      v.deco.position.y = h;
      if (v.crop) v.crop.position.y = h;
    }

    const stage = p.s === 'planted' ? core.cropStage(p).stage : -1;
    const giant = stage >= 0 && p.m && p.m.includes('gigante');
    const cropKey = stage >= 0 ? p.crop + stage + (giant ? 'G' : '') : '';
    if (v.cropKey !== cropKey) {
      if (v.crop) v.group.remove(v.crop);
      v.crop = null;
      v.cropKey = cropKey;
      if (cropKey) {
        v.crop = M.makeCrop(p.crop, stage);
        v.crop.position.y = v.top;
        v.crop.rotation.y = ((i * 7) % 4) * (Math.PI / 2);
        v.giant = giant ? 1.55 : 1; // fertilizante: planta gigante
        v.cropH = M.cropHeight(p.crop) * (stage === 3 ? 1 : 0.4 + stage * 0.25) * v.giant;
        v.pop = 0;
        v.group.add(v.crop);
      }
    }

    const ready = core.isReady(p);
    const thirsty = p.s === 'planted' && !ready && !wet;
    const buyable = p.s === 'locked' && core.isBuyable(i);
    // Plantas mutadas: aura da cor da mutação mais rara e, quando prontas, o ícone dela no lugar do ✨
    const top = p.s === 'planted' && p.m && p.m.length ? core.topMutation(p.m) : null;
    const indKey = ready ? (top ? MUTATIONS[top].icon : '✨') : thirsty ? '💧' : buyable ? '🪙' : '';
    if (v.indKey !== indKey) {
      if (v.ind) v.group.remove(v.ind);
      v.ind = null;
      v.indKey = indKey;
      if (indKey) {
        const bubble = indKey === '💧' || (ready && top);
        v.ind = M.emojiSprite(indKey, indKey === '✨' ? 0.5 : indKey === '🪙' ? 0.3 : 0.42, bubble);
        v.group.add(v.ind);
      }
    }
    const auraKey = top || '';
    if (v.auraKey !== auraKey) {
      if (v.aura) v.group.remove(v.aura);
      v.aura = null;
      v.auraKey = auraKey;
      if (top) {
        v.aura = M.makeGlow(MUTATIONS[top].color, 1.5);
        v.group.add(v.aura);
      }
    }
  }
}

function animatePlots() {
  for (let i = 0; i < plotVis.length; i++) {
    const v = plotVis[i];
    if (v.crop) {
      if (v.pop < 1) {
        v.pop = Math.min(1, v.pop + 0.05);
        const t = v.pop;
        const s = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); // ease-out-back
        v.crop.scale.setScalar(Math.max(0.01, s) * (v.giant || 1));
      }
      // Na ventania as plantas balançam bem mais
      const windy = core.S.event && core.S.event.id === 'ventania';
      v.crop.rotation.z = windy ? Math.sin(clock * 5 + i) * 0.16 + 0.08 : Math.sin(clock * 1.6 + i) * 0.03;
    }
    if (v.aura) {
      v.aura.position.y = v.top + 0.3;
      v.aura.material.opacity = 0.45 + Math.sin(clock * 3 + i) * 0.2;
      if (v.auraKey === 'arcoiris') v.aura.material.color.setHSL((clock * 0.25 + i * 0.1) % 1, 0.9, 0.6);
    }
    if (v.ind) {
      const base = v.indKey === '🪙' ? 0.4 : v.top + Math.max(0.5, v.cropH) + 0.25;
      v.ind.position.y = base + Math.sin(clock * 3 + i) * 0.06;
    }
  }
}

// ================= Animais =================
function randomPenPoint() {
  if (!PEN) return new THREE.Vector3(SPOTS.celeiro.point[0] + 2, 0, SPOTS.celeiro.point[1] + 1);
  const zc = (PEN.z1 + PEN.z2) / 2;
  for (let k = 0; k < 20; k++) {
    const x = rand(PEN.x1 + 0.6, PEN.x2 - 0.6);
    const z = rand(PEN.z1 + 0.6, PEN.z2 - 0.6);
    if (x < PEN.x1 + 1.6 && z > zc - 2.2 && z < zc + 1.3) continue; // longe do cocho e do silo
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3((PEN.x1 + PEN.x2) / 2, 0, (PEN.z1 + PEN.z2) / 2);
}

function randomCoopPoint() {
  const { x1, x2, z1, z2 } = COOP_YARD;
  for (let k = 0; k < 20; k++) {
    const x = rand(x1 + 0.5, x2 - 0.5), z = rand(z1 + 0.5, z2 - 0.5);
    if (x < x1 + 3.3 && z < z1 + 2.4) continue; // casinha e rampa
    if (x > x1 + 3.4 && z < z1 + 1.3) continue; // comedouro
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(x1 + 3.6, 0, z1 + 3.6);
}

const ANIMAL_H = { galinha: 0.7, ovelha: 1.05, vaca: 1.3, porco: 0.85 };
const ANIMAL_SPEED = { galinha: 1.0, ovelha: 0.6, vaca: 0.5, porco: 0.65 };

function syncAnimals() {
  const S = core.S;
  if (feeder) feeder.visible = S.up.alimentador > 0;
  const ids = new Set();
  for (const a of S.animals) {
    ids.add(a.id);
    if (animalVis.has(a.id)) continue;
    const m = M.makeAnimal(a.type, { color: a.color || 0, male: a.sex === 'm' });
    // Filhote recém-nascido aparece perto da mãe, com festa
    const mom = a.born != null && core.S.time - a.born < 5 ? [...animalVis.values()].find((o) => o.type === a.type) : null;
    const pos = mom ? mom.pos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))) : pointFor(a);
    if (mom) {
      burst(pos.x, 0.5, pos.z, 0xff8fb1, 14, { up: 2.2, spread: 0.6, size: 0.06, life: 0.9 });
      burst(pos.x, 0.6, pos.z, 0xfff3b0, 8, { up: 2.6, spread: 0.5, size: 0.05, life: 0.9 });
    }
    m.root.position.copy(pos);
    m.root.userData.pick = { kind: 'animal', id: a.id };
    scene.add(m.root);
    pickables.push(m.root);
    animalVis.set(a.id, { id: a.id, type: a.type, m, pos, loc: core.homeOf(a), target: pointFor(a), wait: rand(0, 2), heading: rand(0, 6.28), phase: 0, ind: null, indKey: '' });
  }
  for (const [id, v] of animalVis) {
    if (ids.has(id)) continue;
    scene.remove(v.m.root);
    if (v.ind) scene.remove(v.ind);
    pickables.splice(pickables.indexOf(v.m.root), 1);
    animalVis.delete(id);
  }
}

function updateAnimals(dt) {
  for (const v of animalVis.values()) {
    const a = core.findAnimal(v.id);
    if (!a) continue;
    // Comprou o pasto ou terminou o galinheiro: o animal muda para lá
    if (v.loc !== core.homeOf(a)) {
      v.loc = core.homeOf(a);
      v.pos.copy(pointFor(a));
      v.target = pointFor(a);
    }
    let moving = false;
    if (v.wait > 0) {
      v.wait -= dt;
    } else {
      const dx = v.target.x - v.pos.x, dz = v.target.z - v.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        v.wait = rand(1.5, 5);
        v.target = pointFor(a);
      } else {
        const step = Math.min(d, ANIMAL_SPEED[v.type] * dt);
        v.pos.x += (dx / d) * step;
        v.pos.z += (dz / d) * step;
        v.heading = Math.atan2(dx, dz);
        moving = true;
      }
    }
    const m = v.m;
    m.root.position.copy(v.pos);
    m.root.rotation.y = lerpAngle(m.root.rotation.y, v.heading, 1 - Math.exp(-6 * dt));
    // Filhotes começam pequenos (cabeça proporcionalmente maior) e crescem até virar adultos
    const grow = core.isBaby(a) ? 0.45 + 0.55 * (1 - a.age / BREED.grow) : 1;
    v.size = grow;
    m.root.scale.setScalar(grow);
    m.head.scale.setScalar(grow < 1 ? 1 + (1 - grow) * 0.6 : 1);
    if (moving) v.phase += dt * (v.type === 'galinha' ? 16 : 9) / Math.sqrt(v.size || 1);
    const swing = moving ? Math.sin(v.phase) * 0.55 : 0;
    m.legs.forEach((leg, k) => {
      const opposite = m.legs.length === 2 ? k === 1 : k === 1 || k === 2;
      leg.rotation.x += ((opposite ? -swing : swing) - leg.rotation.x) * Math.min(1, dt * 12);
    });
    m.body.position.y = moving ? Math.abs(Math.sin(v.phase)) * 0.03 : 0;
    // Cabeça: bica o chão (galinha) ou pasta quando parado
    const graze = !moving && (a.fed || !core.producer(a)) ? Math.max(0, Math.sin(clock * (v.type === 'galinha' ? 4 : 1.2) + v.id)) * (v.type === 'galinha' ? 0.7 : 0.35) : 0;
    m.head.rotation.x += (graze - m.head.rotation.x) * Math.min(1, dt * 8);

    const indKey = a.ready ? PRODUCTS[ANIMALS[a.type].product].icon : !a.fed && core.producer(a) ? '🌾' : '';
    if (v.indKey !== indKey) {
      if (v.ind) scene.remove(v.ind);
      v.ind = indKey ? M.emojiSprite(indKey, 0.45) : null;
      if (v.ind) scene.add(v.ind);
      v.indKey = indKey;
    }
    if (v.ind) v.ind.position.set(v.pos.x, ANIMAL_H[v.type] * (v.size || 1) + 0.3 + Math.sin(clock * 3 + v.id) * 0.06, v.pos.z);
  }
}

// ================= Personagem: movimento e tarefas =================
function cancelJobs() {
  player.job = null;
  player.queue.length = 0;
  player.path = [];
}

function moveBy(dx, dz) {
  const p = player.pos;
  if (nav.free(p.x + dx, p.z)) p.x += dx;
  if (nav.free(p.x, p.z + dz)) p.z += dz;
}

/** Segue a rota de uma entidade (personagem ou funcionário). */
function followPath(e, dt, speed) {
  const p = e.pos;
  let remaining = speed * dt;
  while (remaining > 0 && e.path.length) {
    const t = e.path[0];
    const dx = t.x - p.x, dz = t.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) { e.path.shift(); continue; }
    const step = Math.min(d, remaining);
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    remaining -= step;
    e.heading = Math.atan2(dx, dz);
    e.moving = true;
    if (step >= d - 1e-6) e.path.shift();
  }
}

function jobTarget(job) {
  if (job.kind === 'tile') { const t = tilePos(job.i); return { x: t.x, z: t.z, reach: REACH }; }
  if (job.kind === 'animal') { const v = animalVis.get(job.id); return v ? { x: v.pos.x, z: v.pos.z, reach: 0.95 } : null; }
  if (job.kind === 'spot') { const s = SPOTS[job.key]; return { x: s.point[0], z: s.point[1], reach: 0.6 }; }
  if (job.kind === 'move') return { x: job.x, z: job.z, reach: 0.1 };
  if (job.kind === 'machine') { const v = machines.get(job.id); return v ? { x: v.pos.x, z: v.pos.z, reach: v.def.reach } : null; }
  if (job.kind === 'tree') { const v = grove[job.i]; return v && v.state === 'up' ? { x: v.x, z: v.z, reach: 1.25 } : null; }
  if (job.kind === 'pet') return pet.model ? { x: pet.pos.x, z: pet.pos.z, reach: 1.1 } : null;
  if (job.kind === 'horse') return horse ? { x: horse.pos.x, z: horse.pos.z, reach: 1.3 } : null;
  if (job.kind === 'decor') { const v = decorVis[job.k]; return v ? { x: v.x, z: v.z, reach: 0.9 } : null; }
  if (job.kind === 'poop') { const p = poopPos[job.k]; return p && job.k < poopCount() ? { x: p.x, z: p.z, reach: 0.6 } : null; }
  if (job.kind === 'fish') {
    // Vai até a beira do lago, do lado em que o pescador está
    const dx = player.pos.x - POND.x, dz = player.pos.z - POND.z, d = Math.hypot(dx, dz) || 1;
    return { x: POND.x + (dx / d) * (POND.r + 0.75), z: POND.z + (dz / d) * (POND.r + 0.75), reach: 0.4 };
  }
  return null;
}

function processJobs(dt) {
  if (player.busy > 0) return;
  if (!player.job) {
    if (!player.queue.length) return;
    player.job = player.queue.shift();
    player.job.tries = 0;
    player.job.repath = 0;
    player.path = [];
  }
  const job = player.job;
  const tgt = jobTarget(job);
  if (!tgt) { player.job = null; return; }
  const d = dist2(player.pos, tgt.x, tgt.z);
  if (d <= tgt.reach) {
    player.path = [];
    if (job.kind !== 'move') player.heading = Math.atan2(tgt.x - player.pos.x, tgt.z - player.pos.z);
    performJob(job);
    player.job = null;
    return;
  }
  job.repath -= dt;
  if (!player.path.length || (job.kind === 'animal' && job.repath <= 0)) {
    if (!player.path.length && job.tries++ > 3) {
      if (!job.quiet && job.kind !== 'move') ui.toast('Não consigo chegar lá. 🤔');
      player.job = null;
      return;
    }
    // Para um pouco antes do alvo, do lado em que o personagem está
    const k = job.kind === 'move' ? 0 : Math.min(d, tgt.reach * 0.7);
    const ax = tgt.x - ((tgt.x - player.pos.x) / d) * k;
    const az = tgt.z - ((tgt.z - player.pos.z) / d) * k;
    const path = nav.findPath(player.pos.x, player.pos.z, ax, az);
    if (!path) {
      if (!job.quiet) ui.toast('Não consigo chegar lá. 🤔');
      player.job = null;
      return;
    }
    player.path = path;
    job.repath = 0.5;
  }
}

function performJob(job) {
  if (job.kind === 'tile') doTile(job.i, job.quiet);
  else if (job.kind === 'animal') doAnimal(job.id, job.quiet);
  else if (job.kind === 'spot' && job.key === 'mesa') {
    // Clicou na mesa: continua trabalhando enquanto houver material
    if (doBench(job.quiet)) player.queue.unshift({ kind: 'spot', key: 'mesa', quiet: true });
  } else if (job.kind === 'spot') openSpot(job.key);
  else if (job.kind === 'machine') enterMachine(job.id);
  else if (job.kind === 'fish') startCast(job.x, job.z);
  else if (job.kind === 'pet') petInteract();
  else if (job.kind === 'horse') mountHorse();
  else if (job.kind === 'poop') doPoop(job.k);
  else if (job.kind === 'decor') moveDecor(job.k);
  else if (job.kind === 'tree') {
    // Clicou na árvore: continua cortando até ela cair
    if (doChop(job.i, job.quiet) === 'hit') player.queue.unshift({ kind: 'tree', i: job.i, quiet: true });
  }
}

// ================= Construções de madeira (canteiros de obra) =================
const sites = {};
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/** Canteiro (andaimes e placa) de uma obra, no lugar dela. */
function makeSite(id, x, z, w, d, labelY) {
  const st = sites[id];
  const c = M.makeConstruction(w, d);
  c.group.position.set(x, 0, z);
  scene.add(c.group);
  st.site = c;
  st.siteLabel = M.textSprite(`🏗️ ${BUILDINGS[id].name}`, 0.45);
  st.siteLabel.position.set(x, labelY, z);
  scene.add(st.siteLabel);
}

/** O armazém é a obra fixa da sede; as outras ganham canteiro quando o jogador escolhe o lugar. */
function buildSites() {
  const [x, z] = SPOTS.celeiro.at;
  makeSite('celeiro', x, z, 4.2, 3.6, 3.0);
}

function updateSites(dt) {
  for (const [id, st] of Object.entries(sites)) {
    const done = core.built(id);
    const prog = core.buildProgress(id);
    if (st.done !== done || st.prog !== prog) {
      const finished = st.done === false && done;
      st.done = done;
      st.prog = prog;
      for (const l of st.labels) if (l) l.visible = done;
      if (st.siteLabel) st.siteLabel.visible = !done;
      if (st.proxy && id !== 'celeiro' && id !== 'queijaria') st.proxy.visible = !done;
      if (st.extras) for (const e of st.extras) e.visible = done;
      if (st.site) {
        st.site.group.visible = !done;
        const n = Math.ceil(prog * st.site.stages.length);
        st.site.stages.forEach((m, k) => { m.visible = k < n; });
      }
      if (st.model) st.model.visible = done;
      if (st.parts) {
        const n = done ? st.parts.length : Math.floor(prog * st.parts.length);
        st.parts.forEach((m, k) => { m.visible = k < n; });
        st.rope.visible = !done;
        st.sign.visible = !done;
      }
      if (finished) {
        st.riseT = 0;
        const [x, z] = (SPOTS[id] || SPOTS['obra:' + id]).at;
        burst(x, 0.5, z, 0xd7c4a0, 30, { up: 3, spread: 2.2, size: 0.09, life: 1.1 });
        burst(x, 1.5, z, 0xfff3b0, 16, { up: 4, spread: 1.4, size: 0.07, life: 1 });
      }
    }
    // O prédio "sobe" quando a obra termina
    if (st.riseT != null && st.model) {
      st.riseT = Math.min(1, st.riseT + dt * 1.6);
      st.model.scale.set(1, Math.max(0.01, easeOutBack(st.riseT)), 1);
      if (st.riseT >= 1) st.riseT = null;
    } else if (st.riseT != null) st.riseT = null;
  }
}

/** Entrega a madeira que o jogador tem na obra. */
function deliverBuild(id) {
  const res = core.buildDeliver(id);
  if (res && res.delivered) {
    startAction('collect');
    const key = SPOTS[id] ? id : 'obra:' + id;
    const [x, z] = SPOTS[key].at;
    burst(x, 0.6, z, 0xd7b98a, 14, { up: 2.4, spread: 1.2, size: 0.07 });
  }
}

// ================= Esterco e composteira =================
const poops = [];      // montinhos (até MANURE.max), mostrados conforme core.S.manure
const poopPos = [];    // posição de cada montinho visível
let compost = null;

function buildCompost() {
  const [x, z] = SPOTS.compost.at;
  const m = M.makeCompost();
  m.group.position.set(x, 0, z);
  m.group.rotation.y = Math.PI / 4;
  scene.add(m.group);
  const label = M.textSprite(`${COMPOST.icon} ${COMPOST.name}`, 0.42);
  label.position.set(x, SPOTS.compost.labelY, z);
  scene.add(label);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(1.4, 1, 1.1);
  proxy.position.set(x, 0.5, z);
  proxy.rotation.y = Math.PI / 4;
  proxy.userData.pick = { kind: 'spot', key: 'compost' };
  scene.add(proxy);
  pickables.push(proxy);
  nav.blockCircle(x, z, 0.62 + PLAYER_R * 0.5);
  compost = { m, label, proxy, shown: null };
  for (let k = 0; k < MANURE.max; k++) {
    const p = M.makePoop();
    p.visible = false;
    p.userData.pick = { kind: 'poop', k };
    scene.add(p);
    pickables.push(p);
    poops.push(p);
  }
}

/** Lugar livre dentro do curral, longe do cocho e do alimentador. */
function randomPoopPos() {
  if (core.S.pasture) {
    const p = randomPasturePoint();
    return { x: p.x, z: p.z };
  }
  for (let tries = 0; tries < 30; tries++) {
    const x = rand(PEN.x1 + 0.6, PEN.x2 - 0.6), z = rand(PEN.z1 + 0.6, PEN.z2 - 0.6);
    if (Math.hypot(x - SPOTS.cocho.at[0], z - SPOTS.cocho.at[1]) < 1.4) continue;
    if (Math.hypot(x - (PEN.x1 + 0.65), z - ((PEN.z1 + PEN.z2) / 2 - 1.5)) < 1.0) continue;
    if (poopPos.some((p) => p && Math.hypot(p.x - x, p.z - z) < 0.6)) continue;
    return { x, z };
  }
  return { x: (PEN.x1 + PEN.x2) / 2, z: (PEN.z1 + PEN.z2) / 2 };
}

const poopCount = () => (core.built('curral') ? Math.min(core.S.manure, MANURE.max) : 0);

function updateCompost() {
  if (!compost) return;
  const on = core.built('curral');
  if (compost.shown !== on) {
    compost.shown = on;
    compost.m.group.visible = compost.label.visible = compost.proxy.visible = on;
  }
  if (on) {
    const cp = core.S.compost;
    const fill = 0.08 + 0.5 * Math.min(1, cp.queue / COMPOST.capacity);
    compost.m.heap.scale.y = fill;
    compost.m.heap.position.y = fill / 2 + 0.03;
    compost.m.bags.forEach((b, k) => { b.visible = k < Math.min(4, cp.ready); });
  }
  const n = poopCount();
  for (let k = 0; k < poops.length; k++) {
    const vis = k < n;
    if (vis && !poopPos[k]) {
      poopPos[k] = randomPoopPos();
      poops[k].position.set(poopPos[k].x, 0, poopPos[k].z);
      poops[k].rotation.y = Math.random() * Math.PI * 2;
    }
    if (!vis) poopPos[k] = null;
    poops[k].visible = vis;
  }
}

function nearestPoop(maxD) {
  let best = -1, bd = maxD;
  const n = poopCount();
  for (let k = 0; k < n; k++) {
    const p = poopPos[k];
    if (!p) continue;
    const d = dist2(player.pos, p.x, p.z);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

/** Recolhe o montinho k (o último visível passa para o lugar dele). */
function doPoop(k) {
  const n = poopCount();
  if (k < 0 || k >= n || !poopPos[k]) return false;
  const { x, z } = poopPos[k];
  if (!core.collectManure()) return false;
  poopPos[k] = poopPos[n - 1];
  if (poopPos[k]) poops[k].position.set(poopPos[k].x, 0, poopPos[k].z);
  poopPos[n - 1] = null;
  player.heading = Math.atan2(x - player.pos.x, z - player.pos.z) || player.heading;
  startAction('collect');
  burst(x, 0.15, z, 0x6b4423, 8, { up: 1.6, spread: 0.4, size: 0.05, life: 0.5 });
  const p = screenPosOf({ pos: { x, z } });
  if (p) ui.fxAt(p.x, p.y - 20, `+1 ${MANURE.icon}`);
  return true;
}

// ================= Mesa de carpintaria =================
let bench = null;
const tmpBench = new THREE.Vector3();

function buildBench() {
  const [x, z] = SPOTS.mesa.at;
  const m = M.makeCarpentryTable();
  m.group.position.set(x, 0, z);
  m.group.rotation.y = Math.PI / 4; // de frente para a câmera
  scene.add(m.group);
  const label = M.textSprite(SPOTS.mesa.label, 0.45);
  label.position.set(x, SPOTS.mesa.labelY, z);
  scene.add(label);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(2.8, 1.2, 1.0);
  proxy.position.set(x, 0.6, z);
  proxy.rotation.y = Math.PI / 4;
  proxy.userData.pick = { kind: 'spot', key: 'mesa' };
  scene.add(proxy);
  pickables.push(proxy);
  for (const lx of [-1.1, 0, 1.1]) nav.blockCircle(x + lx * Math.cos(Math.PI / 4), z - lx * Math.sin(Math.PI / 4), 0.42 + PLAYER_R * 0.5);
  // Barra de progresso do trabalho
  const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x3b2a1a, depthTest: false, transparent: true, opacity: 0.75 }));
  barBg.scale.set(1.1, 0.13, 1);
  barBg.center.set(0, 0.5);
  barBg.position.set(x - 0.55, 1.55, z);
  barBg.renderOrder = 10;
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffc94d, depthTest: false }));
  bar.scale.set(0.01, 0.09, 1);
  bar.center.set(0, 0.5);
  bar.position.set(x - 0.53, 1.55, z);
  bar.renderOrder = 11;
  scene.add(barBg, bar);
  bench = { m, prog: 0, anim: 0, barBg, bar, show: 0 };
}

/** Um golpe de serrote/martelo na mesa. Retorna true se trabalhou. */
function doBench(quiet) {
  const rc = core.recipe();
  if (core.craftMax(rc.id) < 1) {
    if (!quiet) {
      const need = Object.entries(rc.input).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + ');
      ui.toast(`${CARPENTRY.icon} Para fazer ${rc.name} precisa de ${need}. Escolha a receita na Oficina.`, 'bad');
      sfx('error');
      ui.openPanel('oficina', 'carpintaria');
    }
    bench.prog = 0;
    return false;
  }
  const [x, z] = SPOTS.mesa.at;
  player.heading = Math.atan2(x - player.pos.x, z - player.pos.z);
  startAction('chop');
  player.busy = 0.4;
  bench.prog++;
  bench.anim = 0.4;
  bench.show = 2.5;
  sfx(rc.id === 'viga' ? 'hammer' : 'saw');
  bench.m.saw.getWorldPosition(tmpBench);
  burst(tmpBench.x, tmpBench.y, tmpBench.z, 0xe6d2a8, 5, { up: 1.4, spread: 0.5, size: 0.04, life: 0.6, gravity: 3 });
  if (bench.prog >= rc.work) {
    bench.prog = 0;
    core.craft(rc.id);
    sfx('harvest');
    const out = Object.entries(rc.output).map(([id, q]) => `+${q} ${core.ITEMS[id].icon}`).join(' ');
    const p = screenPosOf({ pos: { x, z } });
    if (p) ui.fxAt(p.x, p.y - 30, out, 'gold');
    burst(x, 1.0, z, 0xd7b98a, 12, { up: 2.4, spread: 0.8, size: 0.06 });
  }
  return true;
}

function updateBench(dt) {
  if (!bench) return;
  const m = bench.m;
  const inv = core.S.inv;
  m.planks.forEach((p, k) => { p.visible = k < Math.ceil((inv.madeira || 0) / 4); });
  m.beams.forEach((b, k) => { b.visible = k < (inv.viga || 0); });
  if (bench.anim > 0) {
    bench.anim -= dt;
    m.saw.position.x = 0.25 + Math.sin(bench.anim * 30) * 0.12;
  }
  bench.show = Math.max(0, bench.show - dt);
  const rc = core.recipe();
  const on = bench.show > 0 && bench.prog > 0;
  bench.bar.visible = bench.barBg.visible = on;
  if (on) bench.bar.scale.x = Math.max(0.01, (bench.prog / rc.work) * 1.06);
}

function benchLabel() {
  const rc = core.recipe();
  if (core.craftMax(rc.id) < 1) return 'Escolher o que fazer';
  return `${rc.verb} (${bench.prog + 1}/${rc.work})`;
}

function benchInfo() {
  const rc = core.recipe();
  const io = (o) => Object.entries(o).map(([id, q]) => `${q} ${core.ITEMS[id].icon}`).join(' + ');
  const inv = core.S.inv;
  return `${CARPENTRY.icon} ${CARPENTRY.name}: ${rc.name} (${io(rc.input)} → ${io(rc.output)}). Você tem 🪵 ${inv.tronco || 0} · 🟫 ${inv.madeira || 0} · 📏 ${inv.viga || 0}. Troque a receita na Oficina 🪚.`;
}

// ================= Luzes da noite: lanterna e faróis =================
let torchLight, headLight;

function buildLights() {
  // As luzes ficam sempre na cena (intensidade 0 de dia) para não recompilar os materiais
  torchLight = new THREE.SpotLight(0xfff1c4, 0, 11, 0.62, 0.55, 1.1);
  scene.add(torchLight, torchLight.target);
  headLight = new THREE.SpotLight(0xfff6d8, 0, 20, 0.55, 0.45, 1.0);
  scene.add(headLight, headLight.target);
}

function updateLights(dt) {
  const d = core.darkness();
  const night = THREE.MathUtils.smoothstep(d, 0.3, 0.7);
  // Lanterna do fazendeiro
  const torchOn = night > 0.01 && !driving;
  const fwdX = Math.sin(player.heading), fwdZ = Math.cos(player.heading);
  torchLight.intensity += ((torchOn ? night * 26 : 0) - torchLight.intensity) * Math.min(1, dt * 6);
  torchLight.position.set(player.pos.x + fwdX * 0.25, 1.0, player.pos.z + fwdZ * 0.25);
  torchLight.target.position.set(player.pos.x + fwdX * 4.5, 0, player.pos.z + fwdZ * 4.5);
  player.m.torch.visible = torchOn;
  // Faróis da máquina dirigida
  const v = driving ? machines.get(driving) : null;
  const headOn = !!v && night > 0.01;
  headLight.intensity += ((headOn ? night * 60 : 0) - headLight.intensity) * Math.min(1, dt * 8);
  for (const mv of machines.values()) {
    const lit = mv === v && headOn;
    for (const lm of mv.lampMats) lm.emissiveIntensity = lit ? 0.5 + night * 3 : 0.5;
  }
  if (v) {
    const s = Math.sin(v.heading), c = Math.cos(v.heading);
    const y = v.id === 'colheitadeira' ? 2.9 : 0.9;
    const front = v.id === 'colheitadeira' ? 1.1 : 1.0;
    headLight.position.set(v.pos.x + s * front, y, v.pos.z + c * front);
    headLight.target.position.set(v.pos.x + s * (front + 9), 0, v.pos.z + c * (front + 9));
  }
}

// ================= Cavalo =================
/** Onde o cavalo pasta: perto do portão do curral (ou da sede, sem curral). */
const horseHome = () => (PEN ? [PEN.x2 + 1.5, (PEN.z1 + PEN.z2) / 2 + 2.4] : [SPAWN.x + 3, SPAWN.z]);
const SADDLE_Y = 0.98;          // altura do fazendeiro montado
let horse = null;
let riding = false;

function syncHorse() {
  const H = core.S.horse;
  if (H.owned && !horse) {
    const m = M.makeHorse();
    const home = horseHome();
    const x = H.x ?? home[0], z = H.z ?? home[1];
    const pos = new THREE.Vector3(x, 0, z);
    m.root.position.copy(pos);
    m.root.userData.pick = { kind: 'horse' };
    scene.add(m.root);
    pickables.push(m.root);
    horse = { m, pos, heading: H.h || 0, home: { x, z }, phase: 0, moving: false, running: false, target: null, t: 2, graze: 0, steps: 0 };
  } else if (!H.owned && horse) {
    if (riding) dismountHorse();
    scene.remove(horse.m.root);
    pickables.splice(pickables.indexOf(horse.m.root), 1);
    horse = null;
  }
  if (horse) horse.m.saddle.visible = !!H.saddle;
}

function mountHorse() {
  if (!horse || riding || driving) return;
  if (!core.S.horse.saddle) {
    ui.toast(`${HORSE.icon} Para montar, compre a ${SADDLE.icon} sela na loja.`);
    ui.openPanel('loja', 'cavalo');
    return;
  }
  if (fishing.state !== 'idle') endFishing();
  cancelJobs();
  riding = true;
  player.pos.set(horse.pos.x, 0, horse.pos.z);
  player.heading = horse.heading;
  sfx('neigh');
  ui.toast(`${HORSE.icon} Montado! Ande normalmente${'ontouchstart' in window ? '' : ' (Shift galopa)'}. Use a ação de novo para descer.`);
}

function dismountHorse() {
  if (!riding) return;
  riding = false;
  const s = Math.sin(horse.heading), c = Math.cos(horse.heading);
  // Desce ao lado do cavalo, num lugar livre
  let spot = null;
  for (const [lx, lz] of [[0.9, 0], [-0.9, 0], [0, -1.4], [0, 1.4], [1.4, 0], [-1.4, 0]]) {
    const x = horse.pos.x + c * lx + s * lz, z = horse.pos.z - s * lx + c * lz;
    if (nav.free(x, z)) { spot = { x, z }; break; }
  }
  if (!spot) spot = { x: horse.pos.x, z: horse.pos.z };
  player.pos.set(spot.x, 0, spot.z);
  player.m.legL.rotation.z = 0;
  player.m.legR.rotation.z = 0;
  horse.home = { x: horse.pos.x, z: horse.pos.z };
  horse.t = 4;
  horse.target = null;
  Object.assign(core.S.horse, { x: horse.pos.x, z: horse.pos.z, h: horse.heading });
  sfx('hoof');
}

function updateHorse(dt) {
  if (!horse) return;
  const m = horse.m;
  if (riding) {
    horse.pos.set(player.pos.x, 0, player.pos.z);
    horse.heading = lerpAngle(horse.heading, player.heading, 1 - Math.exp(-10 * dt));
    horse.moving = player.moving;
    horse.running = player.running;
    horse.graze = 0;
    core.S.horse.x = horse.pos.x;
    core.S.horse.z = horse.pos.z;
    core.S.horse.h = horse.heading;
  } else {
    // Passeia devagar perto de onde ficou e pasta
    horse.moving = false;
    horse.running = false;
    if (horse.target) {
      const dx = horse.target.x - horse.pos.x, dz = horse.target.z - horse.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        horse.target = null;
        horse.t = 3 + Math.random() * 5;
      } else {
        const step = Math.min(d, 0.9 * dt);
        horse.pos.x += (dx / d) * step;
        horse.pos.z += (dz / d) * step;
        horse.heading = lerpAngle(horse.heading, Math.atan2(dx, dz), 1 - Math.exp(-5 * dt));
        horse.moving = true;
      }
    } else {
      horse.t -= dt;
      if (horse.t <= 0) {
        const a = Math.random() * Math.PI * 2, rr = 0.6 + Math.random() * 1.6;
        const x = horse.home.x + Math.cos(a) * rr, z = horse.home.z + Math.sin(a) * rr;
        if (nav.free(x, z) && nav.lineFree(horse.pos.x, horse.pos.z, x, z)) horse.target = { x, z };
        else horse.t = 1;
      }
    }
    // Pasta quando está parado
    const want = !horse.moving && horse.t > 1.5 ? 1 : 0;
    horse.graze += (want - horse.graze) * Math.min(1, dt * 2);
  }
  // Andadura: pernas em diagonal, mais rápido a galope
  const speed = horse.moving ? (riding ? (horse.running ? 16 : 11) : 6) : 0;
  const prev = horse.phase;
  horse.phase += dt * speed;
  if (riding && horse.moving && Math.floor(horse.phase / Math.PI) !== Math.floor(prev / Math.PI)) sfx('hoof');
  const amp = horse.moving ? (horse.running ? 0.75 : 0.5) : 0;
  const sw = Math.sin(horse.phase) * amp;
  const ease = Math.min(1, dt * 12);
  const L = m.legs;
  L.fl.rotation.x += (sw - L.fl.rotation.x) * ease;
  L.br.rotation.x += (sw - L.br.rotation.x) * ease;
  L.fr.rotation.x += (-sw - L.fr.rotation.x) * ease;
  L.bl.rotation.x += (-sw - L.bl.rotation.x) * ease;
  m.body.position.y = horse.moving ? Math.abs(Math.cos(horse.phase)) * (horse.running ? 0.09 : 0.05) : Math.sin(clock * 1.5) * 0.008;
  m.neck.rotation.x = 0.55 + horse.graze * 1.15 + (horse.moving ? Math.sin(horse.phase * 2) * 0.05 : 0);
  m.tail.rotation.z = Math.sin(clock * 2.3) * 0.25;
  m.root.position.copy(horse.pos);
  m.root.rotation.y = horse.heading;
  if (riding) poseRider();
}

/** Fazendeiro montado: sentado na sela, pernas abertas nos estribos. */
function poseRider() {
  const m = player.m;
  const y = SADDLE_Y + horse.m.body.position.y;
  m.root.position.set(horse.pos.x, y, horse.pos.z);
  m.root.rotation.y = horse.heading;
  m.legL.rotation.set(-0.35, 0, -0.42);
  m.legR.rotation.set(-0.35, 0, 0.42);
  m.body.rotation.x = horse.running ? 0.18 : 0.06;
  for (const t of Object.values(m.tools)) t.visible = false;
  // Mãos nas rédeas
  m.armR.rotation.x = -0.9;
  if (!m.torch.visible) m.armL.rotation.x = -0.9;
}

// ================= Queijaria =================
let cheesery = null;

function buildCheesery() {
  const [x, z] = SPOTS.queijaria.at;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  const model = M.makeCheesery();
  root.add(model.group);
  const label = M.textSprite(`${CHEESERY.icon} ${CHEESERY.name}`, 0.5);
  label.position.set(x, SPOTS.queijaria.labelY, z);
  scene.add(label);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(3.6, 2.4, 2.4);
  proxy.position.set(x, 1.2, z);
  proxy.userData.pick = { kind: 'spot', key: 'queijaria' };
  scene.add(proxy);
  pickables.push(proxy);
  nav.blockRect(x - 1.85, z - 1.05, x + 1.85, z + 1.05, PLAYER_R * 0.6);
  cheesery = { model };
  sites.queijaria = { model: model.group, labels: [label] };
  makeSite('queijaria', x, z, 3.4, 2.4, 3.0);
}

function updateCheesery() {
  if (!cheesery) return;
  const ch = core.S.cheese;
  if (!core.built('queijaria')) return;
  cheesery.model.cans.forEach((c, k) => { c.visible = k < Math.ceil(ch.queue / 2.5); });
  cheesery.model.wheels.forEach((w, k) => { w.visible = k < ch.ready; });
}

// ================= Fábricas =================
const factoryVis = {};
const FACTORY_MODEL = { moinho: () => M.makeWindmill(), padaria: () => M.makeBakery(), tear: () => M.makeLoomHouse(), defumadouro: () => M.makeSmokehouse() };

function buildFactory(id) {
  const f = FACTORIES[id];
  const [x, z] = SPOTS[id].at;
  const m = FACTORY_MODEL[id]();
  m.group.position.set(x, 0, z);
  scene.add(m.group);
  const label = M.textSprite(`${f.icon} ${f.name}`, 0.5);
  label.position.set(x, SPOTS[id].labelY, z);
  scene.add(label);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(f.size[0], 2.6, f.size[1]);
  proxy.position.set(x, 1.3, z);
  proxy.userData.pick = { kind: 'spot', key: id };
  scene.add(proxy);
  pickables.push(proxy);
  nav.blockRect(x - f.size[0] / 2, z - f.size[1] / 2, x + f.size[0] / 2, z + f.size[1] / 2, PLAYER_R * 0.6);
  factoryVis[id] = { m, smokeT: 0 };
  sites[id] = { model: m.group, labels: [label] };
  makeSite(id, x, z, f.size[0] + 0.3, f.size[1] + 0.3, 3.0);
}

function updateFactoryVis(dt) {
  for (const [id, v] of Object.entries(factoryVis)) {
    if (!core.built(id)) continue;
    const busy = sys.factoryBusy(id);
    if (v.m.spin) v.m.spin.rotation.z += dt * (busy ? 1.6 : 0.25);
    if (busy && v.m.smoke) {
      v.smokeT -= dt;
      if (v.smokeT <= 0) {
        v.smokeT = 0.35;
        const [x, z] = SPOTS[id].at;
        burst(x + v.m.smoke.x, v.m.smoke.y, z + v.m.smoke.z, 0xd0d0d0, 2, { up: 1.2, spread: 0.15, size: 0.12, life: 1.6, gravity: -0.6 });
      }
    }
  }
}

// ================= Estações do ano (cores do chão e das folhas) =================
const seasonMats = [];                 // chão e capim: recebem o tom da estação
const LEAF_COLORS = [0x5fae47, 0x468a35]; // arbustos e mato (as copas usam M.LEAF_SETS)
const AUTUMN_TONES = [0xe8761c, 0xf5c22a, 0xd23a26]; // cada conjunto de copa: laranja, amarelo ou vermelho
const PINE_COLORS = [0x3f8f46, 0x48a04f, 0x54ad5a];
const tmpSeason = new THREE.Color();
let seasonShown = null;
let seasonBlend = 1;
let seasonFrom = null;

function seasonTargets(sz) {
  const out = new Map();
  M.LEAF_SETS.forEach((set, k) => {
    const leaf = sz.id === 'outono' ? [AUTUMN_TONES[k], 0.86] : sz.leaf;
    for (const c of set) {
      const col = new THREE.Color(c);
      if (leaf) col.lerp(new THREE.Color(leaf[0]), leaf[1]);
      out.set(M.mat(c), col);
    }
  });
  for (const c of LEAF_COLORS) {
    const col = new THREE.Color(c);
    if (sz.leaf) col.lerp(new THREE.Color(sz.leaf[0]), sz.leaf[1]);
    out.set(M.mat(c), col);
  }
  for (const c of PINE_COLORS) {
    const col = new THREE.Color(c);
    if (sz.id === 'inverno') col.lerp(new THREE.Color(0xeef4f8), 0.35);
    out.set(M.mat(c), col);
  }
  // O tom da estação multiplica a cor própria de cada material (chão branco com cores por vértice, capim verde)
  for (const m of seasonMats) {
    if (!m.userData.baseColor) m.userData.baseColor = m.color.clone();
    out.set(m, m.userData.baseColor.clone().multiply(new THREE.Color(sz.tint[0], sz.tint[1], sz.tint[2])));
  }
  return out;
}

function updateSeason(dt) {
  const sz = sys.season();
  if (seasonShown !== sz.id) {
    // Guarda as cores atuais e faz a transição aos poucos
    seasonFrom = new Map();
    for (const [m] of seasonTargets(sz)) seasonFrom.set(m, m.color.clone());
    seasonShown = sz.id;
    for (const c of M.BLOSSOM_COLORS) M.mat(c).visible = sz.id === 'primavera';
    seasonBlend = seasonFrom.size && seasonShown !== null && clock > 1 ? 0 : 1;
    if (seasonBlend >= 1) for (const [m, col] of seasonTargets(sz)) m.color.copy(col);
    else updateSeason.targets = seasonTargets(sz);
  }
  if (seasonBlend < 1 && updateSeason.targets) {
    seasonBlend = Math.min(1, seasonBlend + dt / 4);
    for (const [m, col] of updateSeason.targets) m.color.copy(seasonFrom.get(m)).lerp(col, seasonBlend);
  }
}

// ================= Folhas caindo (outono) =================
const leafTrees = [];      // copas redondas: { x, z, h, grove?, pasture? }
const fallingLeaves = [];
let leafSpawnT = 0;

function updateLeaves(dt) {
  leafSpawnT -= dt;
  if (seasonShown === 'outono' && leafSpawnT <= 0 && fallingLeaves.length < 26) {
    leafSpawnT = rand(0.12, 0.35);
    const p = player.pos;
    const near = leafTrees.filter((t) => Math.abs(t.x - p.x) < 16 && Math.abs(t.z - p.z) < 12
      && (t.grove == null || grove[t.grove].state === 'up') && (!t.pasture || core.S.pasture));
    if (near.length) {
      const t = near[Math.floor(Math.random() * near.length)];
      const m = M.box(0.13, 0.012, 0.09, AUTUMN_TONES[Math.floor(Math.random() * AUTUMN_TONES.length)]);
      m.castShadow = false;
      const a = rand(0, Math.PI * 2), r = rand(0.2, 0.75) * (t.h / 1.9);
      m.position.set(t.x + Math.cos(a) * r, t.h * rand(0.7, 1.05), t.z + Math.sin(a) * r);
      m.rotation.set(rand(-1, 1), rand(0, 6.28), rand(-1, 1));
      scene.add(m);
      fallingLeaves.push({ m, s0: m.scale.clone(), t: 0, ph: rand(0, 6.28), fall: rand(0.45, 0.7), rest: 0 });
    }
  }
  const wind = sys.season().id === 'outono' && core.S.event && core.S.event.id === 'ventania' ? 1.6 : 0.35;
  for (let k = fallingLeaves.length - 1; k >= 0; k--) {
    const l = fallingLeaves[k];
    const m = l.m;
    l.t += dt;
    if (m.position.y > 0.03) {
      // Balança de um lado para o outro enquanto cai
      m.position.y = Math.max(0.03, m.position.y - l.fall * dt);
      m.position.x += (Math.sin(l.t * 2.4 + l.ph) * 0.7 + wind) * dt;
      m.position.z += Math.cos(l.t * 1.9 + l.ph) * 0.35 * dt;
      m.rotation.x = Math.sin(l.t * 3 + l.ph) * 0.8;
      m.rotation.z = Math.cos(l.t * 2.6 + l.ph) * 0.8;
    } else {
      // Pousou: fica um pouco no chão e some
      m.rotation.x = m.rotation.z = 0;
      l.rest += dt;
      if (l.rest > 2.5) m.scale.copy(l.s0).multiplyScalar(Math.max(0.01, 1 - (l.rest - 2.5) * 2)); // encolhe a partir do tamanho da folha
      if (l.rest > 3) {
        scene.remove(m);
        fallingLeaves.splice(k, 1);
      }
    }
  }
}

// ================= Mapa e viagem rápida =================
/** Lugares para onde dá para viajar pelo mapa. */
export function mapPlaces() {
  const sp = (k) => SPOTS[k].point;
  const list = [
    { id: 'casa', icon: '🏠', name: 'Casa', x: sp('casa')[0], z: sp('casa')[1] },
    { id: 'celeiro', icon: '🏬', name: 'Armazém', x: sp('celeiro')[0], z: sp('celeiro')[1] },
    { id: 'loja', icon: '🏪', name: 'Loja', x: sp('loja')[0], z: sp('loja')[1] },
    { id: 'lago', icon: '🎣', name: 'Lago', x: POND.x - POND.r - 1, z: POND.z },
    { id: 'bosque', icon: '🌲', name: 'Bosque', x: -24.5, z: 9 },
    { id: 'pomar', icon: '🌳', name: 'Pomar', x: ORCHARD_POS[2][0] + 1.3, z: ORCHARD_POS[0][1] + 2 },
  ];
  const add = (id, icon, name, key) => { if (lotPlaced(id)) list.push({ id, icon, name, x: sp(key)[0], z: sp(key)[1] }); };
  add('curral', '🐾', 'Curral', 'obra:curral');
  add('galinheiro', '🐔', 'Galinheiro', 'galinheiro');
  add('queijaria', '🧀', 'Queijaria', 'queijaria');
  for (const [id, f] of Object.entries(FACTORIES)) add(id, f.icon, f.name, id);
  add('galpao', '🚜', 'Galpão', 'obra:galpao');
  add('serraria', '🪚', 'Serraria', 'serraria');
  if (lotPlaced('trigo')) list.push({ id: 'trigo', icon: '🌾', name: 'Campo de Trigo', x: BIG_X0 - 0.6, z: BIG.cz });
  if (PAST) list.push({ id: 'pasto', icon: '🌿', name: 'Pasto', x: PAST.x0 - 1.5, z: (PAST.gate[0] + PAST.gate[1]) / 2 });
  return list;
}
export const mapBounds = () => ({ minX: BOUNDS.minX, maxX: BOUNDS.maxX, minZ: BOUNDS.minZ, maxZ: BOUNDS.maxZ });

/** Desenha o mapa da fazenda visto de cima (x para a direita, z para baixo). */
export function drawMap(ctx, W, H) {
  const b = mapBounds();
  const sx = W / (b.maxX - b.minX), sz = H / (b.maxZ - b.minZ);
  const X = (x) => (x - b.minX) * sx, Z = (z) => (z - b.minZ) * sz;
  const rect = (x1, z1, x2, z2, color, line) => {
    ctx.fillStyle = color;
    ctx.fillRect(X(x1), Z(z1), X(x2) - X(x1), Z(z2) - Z(z1));
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.strokeRect(X(x1), Z(z1), X(x2) - X(x1), Z(z2) - Z(z1)); }
  };
  const label = (t, x, z, size = 12) => {
    ctx.font = `600 ${size}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, X(x), Z(z));
  };
  ctx.fillStyle = '#86c95f';
  ctx.fillRect(0, 0, W, H);
  // Ruas e caminhos
  ctx.fillStyle = '#d8bb85';
  for (const [x1, z1, x2, z2] of [...ROADS, ...paths]) ctx.fillRect(X(x1), Z(z1), X(x2) - X(x1), Z(z2) - Z(z1));
  // Campos e cercados (só os que já têm lugar)
  for (const f of FIELDS) {
    if (f.cost && !lotPlaced(f.id)) continue;
    const q = fieldRect(f);
    rect(q.x1, q.z1, q.x2, q.z2, '#8a6a45');
  }
  if (lotPlaced('trigo')) rect(BIG_X0, BIG_Z0, BIG_X0 + BIG_FIELD.cols, BIG_Z0 + BIG_FIELD.rows, '#e3c770', '#b89a4a');
  if (PAST) rect(PAST.x0, PAST.z0, PAST.x1, PAST.z1, '#a8de7f', '#6f9a4a');
  if (PEN) rect(PEN.x1, PEN.z1, PEN.x2, PEN.z2, core.built('curral') ? '#d8c27e' : 'rgba(216,194,126,.45)', '#8d6334');
  if (COOP_YARD) rect(COOP_YARD.x1, COOP_YARD.z1, COOP_YARD.x2, COOP_YARD.z2, core.built('galinheiro') ? '#cfb57a' : 'rgba(207,181,122,.45)', '#8d6334');
  // Lago e bosque
  ctx.fillStyle = '#5fb4e6';
  ctx.beginPath();
  ctx.ellipse(X(POND.x), Z(POND.z), POND.r * sx, POND.r * sz, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f8f46';
  for (const [x, z] of CHOP_TREES) { ctx.beginPath(); ctx.arc(X(x), Z(z), 4, 0, Math.PI * 2); ctx.fill(); }
  for (const [x, z] of ORCHARD_POS) { ctx.beginPath(); ctx.arc(X(x), Z(z), 4, 0, Math.PI * 2); ctx.fill(); }
  // Construções
  ctx.fillStyle = '#4a3220';
  for (const [key, icon] of [['casa', '🏠'], ['celeiro', '🏬'], ['loja', '🏪'], ['pedidos', '📦'], ['mesa', '🪚'], ['queijaria', '🧀'], ['galinheiro', '🐔'], ['serraria', '🪚'], ['compost', '♻️'], ['moinho', '🌬️'], ['padaria', '🥖'], ['tear', '🧶'], ['defumadouro', '🔥'], ['colmeias', '🐝'], ['obra:galpao', '🚜']]) {
    const sp = SPOTS[key];
    if (sp && (!sp.lot || lotPlaced(sp.lot)) && (key !== 'compost' || core.built('curral'))) label(icon, sp.at[0], sp.at[1], 14);
  }
  // Lote sendo escolhido agora
  if (lotPlacing) { const q = lotRect(lotPlacing.id, lotPlacing.x, lotPlacing.z); rect(q.x1, q.z1, q.x2, q.z2, 'rgba(92,184,92,.35)', '#3c8d3c'); }
  // Pet, cavalo e você
  if (pet.model) label('🐶', pet.pos.x, pet.pos.z, 12);
  if (horse && !riding) label('🐴', horse.pos.x, horse.pos.z, 12);
  ctx.fillStyle = '#d9534f';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(player.pos.x), Z(player.pos.z), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Teleporta o personagem (e o cavalo, se estiver montado). */
export function travelTo(x, z) {
  if (driving) { ui.toast('Saia da máquina antes de viajar pelo mapa.'); return false; }
  const [cx, cz] = nav.toCell(x, z);
  const n = nav.freeCell(cx, cz) ? [cx, cz] : nav.nearestFree(cx, cz);
  if (!n) return false;
  const p = nav.center(n[0], n[1]);
  if (fishing.state !== 'idle') endFishing();
  cancelJobs();
  player.pos.set(p.x, 0, p.z);
  if (riding && horse) horse.pos.set(p.x, 0, p.z);
  camTarget.set(p.x, 0, p.z);
  if (pet.model) pet.pos.set(p.x + 1, 0, p.z + 1);
  ui.sleepFade();
  sfx('open');
  return true;
}

// ================= Modo foto =================
let photo = false;
const hiddenSprites = [];
export function setPhotoMode(on, hideLabels) {
  photo = on;
  for (const s of hiddenSprites) s.visible = true;
  hiddenSprites.length = 0;
  if (on && hideLabels) scene.traverse((o) => { if (o.isSprite && o.visible) { o.visible = false; hiddenSprites.push(o); } });
  if (on) cancelJobs();
}
export const isPhoto = () => photo;
/** Foto da cena (sem a interface), como imagem PNG. */
export function capture() {
  renderScene();
  return renderer.domElement.toDataURL('image/png');
}

// ================= Corvos =================
const crows = [];
let crowRoundT = 20;

/** Algum espantalho perto do lote? */
function scarecrowNear(x, z) {
  return sys.decorList().some((dd) => dd.id === 'espantalho' && Math.hypot(dd.x - x, dd.z - z) < CROWS.scarecrow);
}

function spawnCrow() {
  const S = core.S;
  if (S.level < CROWS.level) return;
  const growing = [];
  for (let i = 0; i < S.plots.length; i++) if (core.crowTarget(i) && core.plotVisible(i)) growing.push(i);
  if (!growing.length) return;
  const i = growing[Math.floor(Math.random() * growing.length)];
  const t = tilePos(i);
  const m = M.makeBird(0x1f1f24);
  m.root.scale.setScalar(2.4);
  const from = new THREE.Vector3(t.x + rand(-14, 14), 7, t.z - 12);
  m.root.position.copy(from);
  scene.add(m.root);
  const guarded = scarecrowNear(t.x, t.z);
  const ind = M.emojiSprite('❗', 0.4, true);
  ind.visible = false;
  scene.add(ind);
  // pos e state servem para o pet correr atrás (como os passarinhos)
  crows.push({ i, m, ind, pos: new THREE.Vector3(t.x, 0, t.z), from, state: 'in', t: 0, eat: CROWS.eat, guarded, flap: 0 });
}

function scareCrow(c, by) {
  if (c.state === 'out') return;
  c.state = 'out';
  c.t = 0;
  c.from.copy(c.m.root.position);
  c.ind.visible = false;
  sfx('chirp');
  if (by) {
    const p = screenPosOf({ pos: c.pos });
    if (p) ui.fxAt(p.x, p.y - 40, by);
  }
}

function updateCrows(dt) {
  crowRoundT -= dt;
  if (crowRoundT <= 0) {
    crowRoundT = CROWS.every;
    const winter = sys.season().id === 'inverno' ? 0.4 : 1;
    if (Math.random() < CROWS.chance * winter && crows.length < 2) spawnCrow();
  }
  for (let k = crows.length - 1; k >= 0; k--) {
    const c = crows[k];
    const r = c.m.root;
    c.flap += dt * 18;
    if (c.state === 'in') {
      c.t = Math.min(1, c.t + dt / 2.6);
      const e = c.t * (2 - c.t);
      r.position.lerpVectors(c.from, c.pos, e);
      r.position.y = c.pos.y + (1 - e) * 7 + 0.18;
      r.rotation.y = Math.atan2(c.pos.x - c.from.x, c.pos.z - c.from.z);
      c.m.wingL.rotation.z = Math.sin(c.flap) * 0.9;
      c.m.wingR.rotation.z = -Math.sin(c.flap) * 0.9;
      if (c.t >= 1) {
        // Espantalho por perto: dá meia-volta
        if (c.guarded) { scareCrow(c, '👒'); continue; }
        c.state = 'ground';
      }
    } else if (c.state === 'ground') {
      r.position.y = 0.18 + Math.abs(Math.sin(c.flap * 0.3)) * 0.03;
      c.m.head.rotation.x = Math.max(0, Math.sin(c.flap * 0.35)) * 0.8; // bicando
      c.m.wingL.rotation.z = c.m.wingR.rotation.z = 0;
      c.eat -= dt;
      c.ind.visible = true;
      c.ind.position.set(c.pos.x, 1.3 + Math.sin(clock * 6) * 0.06, c.pos.z);
      // Fazendeiro chegou perto: o corvo foge
      if (dist2(player.pos, c.pos.x, c.pos.z) < CROWS.scare) { scareCrow(c, '👋'); continue; }
      // O pet corre atrás
      if (pet.model) {
        if (!pet.chase && dist2(pet.pos, c.pos.x, c.pos.z) < 9) { pet.chase = c; pet.chaseT = 6; sfx('bark'); }
        if (dist2(pet.pos, c.pos.x, c.pos.z) < 1.1) { scareCrow(c, '🐶'); continue; }
      }
      if (!core.crowTarget(c.i)) { scareCrow(c, null); continue; }
      if (c.eat <= 0) {
        core.crowEat(c.i);
        burst(c.pos.x, 0.4, c.pos.z, 0x6fbf3a, 10, { up: 1.6, spread: 0.6, size: 0.05 });
        scareCrow(c, null);
      }
    } else {
      c.t += dt / 2.2;
      r.position.y += dt * 4;
      r.position.x += Math.sin(r.rotation.y + Math.PI) * dt * 6;
      r.position.z += Math.cos(r.rotation.y + Math.PI) * dt * 6;
      r.rotation.y += dt * 0.2;
      c.m.wingL.rotation.z = Math.sin(c.flap) * 0.9;
      c.m.wingR.rotation.z = -Math.sin(c.flap) * 0.9;
      if (c.t >= 1) {
        scene.remove(r, c.ind);
        crows.splice(k, 1);
      }
    }
  }
}

// ================= Decorações =================
const decorVis = [];
let decorKey = null;
let placing = null; // decoração sendo colocada: { id, group, ring, x, z, r, valid, follow }
const decorGlow = new Set();
const tmpPlace = new THREE.Vector3();

function syncDecor() {
  const list = sys.decorList();
  const key = JSON.stringify(list);
  if (key === decorKey) return;
  decorKey = key;
  for (const v of decorVis) {
    scene.remove(v.group);
    pickables.splice(pickables.indexOf(v.group), 1);
  }
  decorVis.length = 0;
  list.forEach((it, k) => {
    const m = M.makeDecor(it.id);
    m.group.position.set(it.x, 0, it.z);
    m.group.rotation.y = it.r;
    m.group.userData.pick = { kind: 'decor', k };
    scene.add(m.group);
    pickables.push(m.group);
    if (m.glow) decorGlow.add(m.glow);
    decorVis.push({ group: m.group, id: it.id, x: it.x, z: it.z, fx: 0 });
  });
  // Navegação: obstáculos fixos + decorações
  nav.restore();
  for (const it of list) {
    const r = DECOR[it.id].r;
    if (r > 0) nav.blockCircle(it.x, it.z, r + PLAYER_R * 0.6);
  }
}

function updateDecor(dt) {
  syncDecor();
  const d = core.darkness();
  for (const g of decorGlow) g.emissiveIntensity = d * 2.2;
  for (const v of decorVis) {
    if (v.id !== 'fonte') continue;
    v.fx -= dt;
    if (v.fx <= 0) { v.fx = 0.18; burst(v.x, 1.1, v.z, 0x9fd6f2, 2, { up: 1.6, spread: 0.25, size: 0.04, life: 0.6, gravity: 5 }); }
  }
  updatePlacing();
}

function nearestDecor(maxD) {
  let best = -1, bd = maxD;
  decorVis.forEach((v, k) => {
    const d = dist2(player.pos, v.x, v.z);
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}

function moveDecor(k) {
  const id = sys.pickupDecor(k);
  if (id) { sfx('open'); startPlacing(id); }
}

/** Começa a colocar uma decoração (ela segue o mouse, ou fica à frente do personagem). */
export function startPlacing(id) {
  if (placing) cancelPlacing(true);
  if (driving || riding) { ui.toast('Desça antes de colocar decorações.'); return; }
  if (sys.decorInv(id) < 1) return;
  const m = M.makeDecor(id);
  const r = Math.max(0.35, DECOR[id].r);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r + 0.1, r + 0.22, 28), new THREE.MeshBasicMaterial({ color: 0x5cb85c, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  scene.add(m.group, ring);
  placing = { id, group: m.group, ring, x: player.pos.x, z: player.pos.z, r: Math.round(player.heading / (Math.PI / 4)) * (Math.PI / 4) + Math.PI, valid: false, follow: 'player' };
  ui.showPlaceBar(DECOR[id], sys.decorInv(id), { ok: confirmPlacing, rotate: rotatePlacing, cancel: () => cancelPlacing() });
}

function placeValid(x, z, id) {
  const r = DECOR[id].r;
  if (inFieldOrPond(x, z) && !(PAST && x > PAST.x0 && x < PAST.x1 && z > PAST.z0 && z < PAST.z1)) return false;
  if (r === 0) return true;
  if (dist2(player.pos, x, z) < r + 0.45) return false;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    if (!nav.free(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
  }
  return nav.free(x, z);
}

function updatePlacing() {
  if (!placing) return;
  const p = placing;
  if (p.follow === 'player') {
    p.x = player.pos.x + Math.sin(player.heading) * 1.7;
    p.z = player.pos.z + Math.cos(player.heading) * 1.7;
  }
  p.valid = placeValid(p.x, p.z, p.id);
  p.group.position.set(p.x, 0, p.z);
  p.group.rotation.y = p.r;
  p.ring.position.set(p.x, 0.04, p.z);
  p.ring.material.color.setHex(p.valid ? 0x5cb85c : 0xd9534f);
}

function confirmPlacing() {
  const p = placing;
  if (!p) return;
  if (!p.valid) { ui.toast('🚫 Não dá para colocar aqui: escolha um lugar livre, fora dos campos e longe das construções.', 'bad'); sfx('error'); return; }
  const id = p.id;
  sys.placeDecor(id, p.x, p.z, p.r);
  burst(p.x, 0.4, p.z, 0xffffff, 10, { up: 2, spread: 0.6, size: 0.05 });
  cancelPlacing(true);
  // Pedras do caminho e cercas: continua colocando enquanto houver
  if (sys.decorInv(id) > 0) startPlacing(id);
}

function rotatePlacing() { if (placing) placing.r += Math.PI / 4; }

function cancelPlacing(silent) {
  if (!placing) return;
  scene.remove(placing.group, placing.ring);
  placing.ring.geometry.dispose();
  placing = null;
  ui.hidePlaceBar();
  if (!silent) ui.toast('Decoração guardada: coloque depois pela Loja (seção Decoração).');
}

// ================= Lotes: o jogador escolhe onde fica cada obra e cada campo =================
const lotPlaced = (id) => !!(core.S.layout && core.S.layout[id]);
/** Retângulo ocupado pelo lote com o ponto em (x, z) (ou no lugar dele). */
function lotRect(id, x, z) {
  if (x == null) { const p = core.S.layout[id]; x = p.x; z = p.z; }
  const e = LOTS[id].ext;
  return { x1: x + e[0], z1: z + e[1], x2: x + e[2], z2: z + e[3] };
}
const rectHit = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.z1 < b.z2 && a.z2 > b.z1;
const asRect = (r) => ({ x1: r[0], z1: r[1], x2: r[2], z2: r[3] });

/** O lote já existe no jogo (obra começada/pronta, campo/serraria/pasto comprado)? */
function lotExists(id) {
  const S = core.S;
  if (BUILDINGS[id]) return core.built(id) || core.buildProgress(id) > 0;
  if (id === 'serraria') return S.saw.owned;
  if (id === 'trigo') return S.big.owned;
  if (id === 'pasto') return S.pasture;
  return core.fieldOwned(id);
}

/** Saves do mapa antigo: o que já existe vai para o lugar padrão; decorações voltam ao inventário. */
function migrateLayout() {
  const S = core.S;
  if (!S.layout) S.layout = {};
  if ((S.layoutV || 1) >= 2) return;
  let moved = 0;
  for (const id of Object.keys(LOTS)) {
    if (!S.layout[id] && lotExists(id)) { S.layout[id] = { x: LOTS[id].def[0], z: LOTS[id].def[1] }; moved++; }
  }
  for (const st of Object.values(S.machines)) if (st && typeof st === 'object') { st.x = null; st.z = null; }
  S.horse.x = null;
  S.horse.z = null;
  let decor = 0;
  while (sys.decorList().length) { sys.pickupDecor(0); decor++; }
  S.layoutV = 2;
  if (moved || decor || S.time > 0) {
    ui.toast(`🗺️ A fazenda ficou maior e mais organizada! As construções da sede ficam ao longo da rua principal${moved ? ' e o que você já tinha foi para um lugar novo' : ''}.${decor ? ' Suas decorações voltaram para a Loja (seção Decoração) para você colocar de novo.' : ''}`, 'level');
  }
}

/** Calcula a geometria do lote no lugar (x, z): cercados, pontos de ação e posições de campo. */
function applyLot(id, x, z) {
  if (id === 'curral') {
    PEN = { x1: x - 3.2, x2: x + 3.2, z1: z - 4, z2: z + 4, gate: [z - 0.5, z + 1.1] };
    SPOTS['obra:curral'].at = [PEN.x2 + 0.55, z + 2.05];
    SPOTS['obra:curral'].point = [PEN.x2 + 1.2, z + 1.7];
    SPOTS.cocho.at = [PEN.x1 + 0.7, z];
    SPOTS.cocho.point = [PEN.x1 + 1.4, z];
    SPOTS.compost.at = [PEN.x2 + 1.6, PEN.z1 - 0.2];
    SPOTS.compost.point = [PEN.x2 + 2.2, PEN.z1 + 0.4];
  } else if (id === 'galinheiro') {
    const x1 = x - 2.75, z1 = z - 2.45;
    COOP_YARD = { x1, x2: x + 2.75, z1, z2: z + 2.45, gate: [z - 0.45, z + 0.75], house: [x1 + 1.35, z1 + 0.95] };
    SPOTS.galinheiro.at = COOP_YARD.house;
    SPOTS.galinheiro.point = [x1 + 1.6, z1 + 2.7];
  } else if (id === 'queijaria') {
    SPOTS.queijaria.at = [x, z];
    SPOTS.queijaria.point = [x, z + 1.6];
  } else if (FACTORIES[id]) {
    SPOTS[id].at = [x, z];
    SPOTS[id].point = [x, z + FACTORIES[id].size[1] / 2 + 0.75];
  } else if (id === 'galpao') {
    SHED = [x, z];
    SPOTS['obra:galpao'].at = SHED;
    SPOTS['obra:galpao'].point = [x, z + 2.4];
  } else if (id === 'serraria') {
    SPOTS.serraria.at = [x, z];
    SPOTS.serraria.point = [x + 1.06, z + 1.06];
  } else if (id === 'trigo') {
    BIG.cx = x;
    BIG.cz = z;
    BIG_X0 = x - BIG_FIELD.cols / 2;
    BIG_Z0 = z - BIG_FIELD.rows / 2;
  } else if (id === 'pasto') {
    PAST = { x0: x - PASTURE.cols / 2, z0: z - PASTURE.rows / 2, x1: x + PASTURE.cols / 2, z1: z + PASTURE.rows / 2, gate: [z - 6.9, z - 4.9] };
  } else {
    FIELD_POS[id] = [x, z];
  }
}

/** Monta o lote no mundo (no lugar já calculado por applyLot) e liga a porta à rua mais próxima. */
function buildLot(id) {
  if (id === 'curral') buildPen();
  else if (id === 'galinheiro') buildCoop();
  else if (id === 'queijaria') buildCheesery();
  else if (FACTORIES[id]) buildFactory(id);
  else if (id === 'galpao') buildShed();
  else if (id === 'serraria') buildSawmill();
  else if (id === 'trigo') buildBigField();
  else if (id === 'pasto') buildPasture();
  else {
    const f = FIELDS.find((ff) => ff.id === id);
    for (let i = f.start; i < f.start + f.count; i++) plotVis[i].group.position.copy(tilePos(i));
    fieldBorder(f);
  }
  connectLot(id);
}

/** Caminho de terra da porta do lote até a rua mais próxima (em L), se não atravessar outra coisa. */
function connectLot(id) {
  const L = LOTS[id];
  if (!L.door) return;
  const p = core.S.layout[id];
  const dx = p.x + L.door[0], dz = p.z + L.door[1];
  let best = null, bd = Infinity;
  for (const r of [...ROADS, ...paths]) {
    const cx = Math.max(r[0], Math.min(r[2], dx)), cz = Math.max(r[1], Math.min(r[3], dz));
    const d = Math.hypot(cx - dx, cz - dz);
    if (d < bd) { bd = d; best = [cx, cz]; }
  }
  if (!best || bd < 0.3 || bd > 40) return;
  const w = 0.6;
  const segs = [];
  if (Math.abs(best[1] - dz) > 0.05) segs.push([dx - w, Math.min(dz, best[1]), dx + w, Math.max(dz, best[1])]);
  if (Math.abs(best[0] - dx) > 0.05) segs.push([Math.min(dx, best[0]), best[1] - w, Math.max(dx, best[0]), best[1] + w]);
  const own = lotRect(id);
  const blocked = (sg) => {
    const r = asRect(sg);
    for (const oid of Object.keys(core.S.layout)) if (oid !== id && LOTS[oid] && rectHit(r, lotRect(oid))) return true;
    return RESERVED.some((q) => rectHit(r, asRect(q))) || (Math.hypot(Math.max(r.x1, Math.min(r.x2, POND.x)) - POND.x, Math.max(r.z1, Math.min(r.z2, POND.z)) - POND.z) < POND.r + 0.3);
  };
  if (segs.some(blocked)) return;
  for (const sg of segs) {
    // Dentro do próprio lote o caminho não precisa aparecer (a obra já tem o seu chão)
    addStrip(...sg);
    paths.push(sg);
  }
  void own;
}

/** O lote cabe aqui? (dentro do terreno, fora das ruas, da sede e de outros lotes) */
function lotValid(id, x, z) {
  const r = lotRect(id, x, z);
  const B = BOUNDS;
  if (r.x1 < B.minX + 0.5 || r.x2 > B.maxX - 0.5 || r.z1 < B.minZ + 0.5 || r.z2 > B.maxZ - 0.5) return false;
  for (const q of [...RESERVED, ...ROADS, ...paths]) if (rectHit(r, asRect(q))) return false;
  for (const oid of Object.keys(core.S.layout)) if (oid !== id && LOTS[oid] && rectHit(r, lotRect(oid))) return false;
  for (const [tx, tz] of CHOP_TREES) if (tx > r.x1 - 0.5 && tx < r.x2 + 0.5 && tz > r.z1 - 0.5 && tz < r.z2 + 0.5) return false;
  for (const [tx, tz] of ORCHARD_POS) if (tx > r.x1 - 0.8 && tx < r.x2 + 0.8 && tz > r.z1 - 0.8 && tz < r.z2 + 0.8) return false;
  return true;
}

/** Nome e ícone do lote (para a barra de colocar e os avisos). */
function lotDef(id) {
  if (BUILDINGS[id]) return { icon: BUILDINGS[id].icon, name: BUILDINGS[id].name };
  if (id === 'serraria') return { icon: SAWMILL.icon, name: SAWMILL.name };
  if (id === 'trigo') return { icon: BIG_FIELD.icon, name: BIG_FIELD.name };
  if (id === 'pasto') return { icon: PASTURE.icon, name: PASTURE.name };
  const f = FIELDS.find((ff) => ff.id === id);
  return { icon: f.icon, name: f.name };
}

/** Coloca o lote no lugar: salva, monta, atualiza a navegação e tira do caminho o que estiver em cima. */
function placeLotNow(id, x, z) {
  core.placeLot(id, x, z);
  applyLot(id, x, z);
  const r = lotRect(id, x, z);
  // Enfeites soltos e decorações que estavam ali saem do caminho
  for (let k = scatter.length - 1; k >= 0; k--) {
    const it = scatter[k];
    if (it.x > r.x1 - 0.3 && it.x < r.x2 + 0.3 && it.z > r.z1 - 0.3 && it.z < r.z2 + 0.3) { scene.remove(it.o); scatter.splice(k, 1); }
  }
  let back = 0;
  for (let k = sys.decorList().length - 1; k >= 0; k--) {
    const it = sys.decorList()[k];
    if (it.x > r.x1 - 0.3 && it.x < r.x2 + 0.3 && it.z > r.z1 - 0.3 && it.z < r.z2 + 0.3) { sys.pickupDecor(k); back++; }
  }
  nav.restore();
  buildLot(id);
  nav.snapshot();
  decorKey = null;
  // Ninguém fica preso dentro da construção nova
  for (const e of [player.pos, pet.model ? pet.pos : null, horse ? horse.pos : null]) {
    if (!e || nav.free(e.x, e.z)) continue;
    const [cx, cz] = nav.toCell(e.x, e.z);
    const n = nav.nearestFree(cx, cz);
    if (n) { const c = nav.center(n[0], n[1]); e.x = c.x; e.z = c.z; }
  }
  burst((r.x1 + r.x2) / 2, 0.4, (r.z1 + r.z2) / 2, 0xffd54f, 24, { up: 3.2, spread: 2.4, size: 0.08 });
  sfx('level');
  if (back) ui.toast(`🌻 ${back > 1 ? `${back} decorações estavam` : 'Uma decoração estava'} no lugar e ${back > 1 ? 'voltaram' : 'voltou'} para a Loja (seção Decoração).`);
}

// ----- Escolher o lugar (como as decorações: segue o mouse, ou fica à frente do personagem) -----
let lotPlacing = null; // { id, group, fill, edges, x, z, valid, follow }

/** Começa a escolher o lugar de uma obra, campo, serraria, Campo de Trigo ou pasto. */
export function startPlacingLot(id) {
  if (!LOTS[id] || lotPlaced(id)) return;
  if (placing) cancelPlacing(true);
  if (lotPlacing) cancelLot(true);
  if (driving || riding) { ui.toast('Desça antes de escolher o lugar.'); return; }
  const e = LOTS[id].ext;
  const w = e[2] - e[0], d = e[3] - e[1];
  const group = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x5cb85c, transparent: true, opacity: 0.28, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2;
  fill.position.set((e[0] + e[2]) / 2, 0.05, (e[1] + e[3]) / 2);
  fill.renderOrder = 5;
  group.add(fill);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x5cb85c });
  for (const [x1, z1, x2, z2] of [[e[0], e[1], e[2], e[1]], [e[0], e[3], e[2], e[3]], [e[0], e[1], e[0], e[3]], [e[2], e[1], e[2], e[3]]]) {
    const m = new THREE.Mesh(M.GEO.box, edgeMat);
    m.scale.set(Math.abs(x2 - x1) + 0.12, 0.08, Math.abs(z2 - z1) + 0.12);
    m.position.set((x1 + x2) / 2, 0.06, (z1 + z2) / 2);
    group.add(m);
  }
  const def = lotDef(id);
  const label = M.textSprite(`${def.icon} ${def.name}`, 0.5);
  label.position.set((e[0] + e[2]) / 2, 1.6, (e[1] + e[3]) / 2);
  group.add(label);
  scene.add(group);
  lotPlacing = { id, group, fill, edgeMat, x: player.pos.x, z: player.pos.z, valid: false, follow: 'player' };
  ui.showPlaceBar(def, 1, { ok: confirmLot, cancel: () => cancelLot() }, 'lot');
}

function updateLotPlacing() {
  const p = lotPlacing;
  if (!p) return;
  const e = LOTS[p.id].ext;
  if (p.follow === 'player') {
    // À frente do personagem, longe o bastante para ele não ficar dentro
    const reach = Math.max(-e[1], e[3], -e[0], e[2]) + 1.2;
    p.x = player.pos.x + Math.sin(player.heading) * reach;
    p.z = player.pos.z + Math.cos(player.heading) * reach;
  }
  p.x = Math.round(p.x * 2) / 2;
  p.z = Math.round(p.z * 2) / 2;
  p.valid = lotValid(p.id, p.x, p.z);
  p.group.position.set(p.x, 0, p.z);
  const c = p.valid ? 0x5cb85c : 0xd9534f;
  p.fill.material.color.setHex(c);
  p.edgeMat.color.setHex(c);
}

/** Ponto do lote para que o centro do retângulo fique sob (x, z). */
function lotAnchorAt(id, x, z) {
  const e = LOTS[id].ext;
  return [x - (e[0] + e[2]) / 2, z - (e[1] + e[3]) / 2];
}

function confirmLot() {
  const p = lotPlacing;
  if (!p) return;
  updateLotPlacing();
  if (!p.valid) { ui.toast('🚫 Não cabe aqui: escolha um lugar livre, fora das ruas, da sede, dos campos e do bosque.', 'bad'); sfx('error'); return; }
  const { id, x, z } = p;
  const kind = LOTS[id].kind;
  // Campos, serraria, Campo de Trigo e pasto: compra agora (se der) e coloca
  if (kind !== 'build') {
    const S = core.S;
    if (id === 'serraria') core.buySawmill();
    else if (id === 'trigo') core.buyBigField();
    else if (id === 'pasto') core.buyPasture();
    else core.buyField(id);
    const owned = id === 'serraria' ? S.saw.owned : id === 'trigo' ? S.big.owned : id === 'pasto' ? S.pasture : core.fieldOwned(id);
    if (!owned) { cancelLot(true); return; }
  }
  cancelLot(true);
  placeLotNow(id, x, z);
  if (kind === 'build') ui.toast(`🏗️ Canteiro ${BUILDINGS[id].fem ? 'da' : 'do'} ${BUILDINGS[id].name} marcado! Leve a madeira até lá e use a ação para entregar.`, 'good');
  ui.markDirty('panel');
}

function cancelLot(silent) {
  if (!lotPlacing) return;
  scene.remove(lotPlacing.group);
  lotPlacing.fill.geometry.dispose();
  lotPlacing = null;
  ui.hidePlaceBar();
  if (!silent) ui.toast('Tudo bem, escolha o lugar depois.');
}

// ================= Pomar e colmeias =================
const orchardVis = [];
let hiveVis = null;

function buildOrchard() {
  ORCHARD_POS.forEach(([x, z], k) => {
    const pit = M.makePit();
    pit.position.set(x, 0, z);
    scene.add(pit);
    const trees = {};
    for (const type of Object.keys(FRUIT_TREES)) {
      const t = M.makeFruitTree(type);
      t.group.position.set(x, 0, z);
      t.group.visible = false;
      scene.add(t.group);
      trees[type] = t;
    }
    const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
    proxy.scale.set(1.4, 2.4, 1.4);
    proxy.position.set(x, 1.2, z);
    proxy.userData.pick = { kind: 'spot', key: 'pomar:' + k };
    scene.add(proxy);
    pickables.push(proxy);
    nav.blockCircle(x, z, 0.3 + PLAYER_R);
    orchardVis.push({ pit, trees, key: '' });
  });
  const label = M.textSprite('🌳 Pomar', 0.5);
  label.position.set(ORCHARD_POS[2][0] + 1.3, 3.4, ORCHARD_POS[0][1]);
  scene.add(label);
  // Colmeias (aparecem conforme compra) e o lugar delas
  const hives = HIVE_POS.map(([x, z]) => {
    const h = M.makeHive();
    h.position.set(x, 0, z);
    h.visible = false;
    scene.add(h);
    return h;
  });
  const [cx, cz] = HIVE_C;
  const spotSign = M.makeStake();
  spotSign.position.set(cx, 0, cz);
  scene.add(spotSign);
  const hiveLabel = M.textSprite(`${HIVES.icon} Colmeias`, 0.42);
  hiveLabel.position.set(cx, SPOTS.colmeias.labelY, cz);
  scene.add(hiveLabel);
  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(2.2, 1.4, 2.2);
  proxy.position.set(cx, 0.7, cz);
  proxy.userData.pick = { kind: 'spot', key: 'colmeias' };
  scene.add(proxy);
  pickables.push(proxy);
  nav.blockRect(cx - 1, cz - 1, cx + 1, cz + 1, PLAYER_R * 0.6);
  hiveVis = { hives, spotSign, beeT: 0 };
}

function updateOrchard(dt) {
  orchardVis.forEach((v, k) => {
    const o = sys.treeAt(k);
    const grown = sys.treeGrown(o);
    const key = o.type ? o.type + (grown ? 'A' : 'S') : '';
    if (v.key !== key) {
      v.key = key;
      for (const [type, t] of Object.entries(v.trees)) {
        t.group.visible = o.type === type;
        t.sapling.visible = !grown;
        t.adult.visible = grown;
      }
      v.pit.visible = !o.type || !grown;
    }
    if (o.type) {
      const t = v.trees[o.type];
      // Muda cresce aos poucos
      if (!grown) t.sapling.scale.setScalar(0.6 + 0.8 * (o.g / ORCHARD.grow));
      t.fruits.forEach((f, i) => { f.visible = grown && i < o.fruit * 2; });
    }
  });
  if (hiveVis) {
    const n = core.S.hives.n;
    hiveVis.hives.forEach((h, k) => { h.visible = k < n; });
    hiveVis.spotSign.visible = n === 0;
    // Abelhas voando em volta
    if (n) {
      hiveVis.beeT -= dt;
      if (hiveVis.beeT <= 0) {
        hiveVis.beeT = 0.5;
        const [x, z] = HIVE_POS[Math.floor(Math.random() * n)];
        burst(x, 1.1, z, 0x3b2a00, 1, { up: 0.6, spread: 0.8, size: 0.035, life: 1.2, gravity: -0.2 });
      }
    }
  }
}

// ================= Serraria =================
let sawmill = null;
const tmpSaw = new THREE.Vector3();

function buildSawmill() {
  const [x, z] = SPOTS.serraria.at;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = Math.PI / 4; // de frente para a câmera
  scene.add(root);

  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.8),
    new THREE.MeshStandardMaterial({ color: 0xb59b6e, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  pad.receiveShadow = true;
  root.add(pad);

  const model = M.makeSawmill();
  root.add(model.group);
  const label = M.textSprite(`${SAWMILL.icon} ${SAWMILL.name}`, 0.5);
  label.position.set(x, SPOTS.serraria.labelY, z);
  scene.add(label);

  const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
  proxy.scale.set(3, 2.4, 3);
  proxy.position.set(x, 1.2, z);
  proxy.userData.pick = { kind: 'spot', key: 'serraria' };
  scene.add(proxy);
  pickables.push(proxy);

  // Bloqueia o galpão (três círculos ao longo do comprimento)
  for (const lx of [-1.5, 0, 1.5]) {
    nav.blockCircle(x + lx * Math.cos(Math.PI / 4), z - lx * Math.sin(Math.PI / 4), 0.95 + PLAYER_R * 0.5);
  }
  sawmill = { root, model, label, dustT: 0 };
}

function updateSawmill(dt) {
  if (!sawmill) return;
  const saw = core.S.saw;
  if (!saw.owned) return;
  const m = sawmill.model;
  m.logs.forEach((lg, k) => { lg.visible = k < saw.queue; });
  m.planks.forEach((p, k) => { p.visible = k < saw.ready; });
  if (saw.queue > 0) {
    m.blade.rotation.x += dt * 22;
    sawmill.dustT -= dt;
    if (sawmill.dustT <= 0) {
      sawmill.dustT = 0.15;
      m.blade.getWorldPosition(tmpSaw);
      burst(tmpSaw.x, tmpSaw.y, tmpSaw.z, 0xe6d2a8, 2, { up: 1.2, spread: 0.4, size: 0.035, life: 0.6, gravity: 3 });
    }
  }
}

// ================= Bosque: árvores que podem ser cortadas =================
const grove = [];
const UP_AXIS = new THREE.Vector3(0, 1, 0);

function buildGrove() {
  CHOP_TREES.forEach(([x, z], i) => {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    const pivot = new THREE.Group(); // a árvore gira em torno da base ao cair
    root.add(pivot);
    const s = 0.78 + ((i * 37) % 10) / 50;
    const tree = M.makeTree(i % 3 === 0 ? 'round' : 'pine', s);
    tree.rotation.y = i * 1.7;
    if (i % 3 === 0) leafTrees.push({ x, z, h: 1.9 * s, grove: i });
    pivot.add(tree);
    const stump = M.makeStump(s);
    stump.visible = false;
    root.add(stump);
    scene.add(root);
    const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
    proxy.scale.set(1.0, 2.6, 1.0);
    proxy.position.set(x, 1.3, z);
    proxy.userData.pick = { kind: 'tree', i };
    scene.add(proxy);
    pickables.push(proxy);
    nav.blockCircle(x, z, 0.3 + PLAYER_R);
    grove.push({ i, x, z, s, root, pivot, tree, stump, state: 'up', t: 0, axis: new THREE.Vector3(1, 0, 0), shakeT: 0 });
  });
}

function setTreeDown(v) {
  v.state = 'down';
  v.tree.visible = false;
  v.pivot.quaternion.identity();
  v.stump.visible = true;
}

function updateGrove(dt) {
  for (const v of grove) {
    const down = core.treeDown(v.i);
    if (v.state === 'up') {
      if (down) { setTreeDown(v); continue; } // cortada enquanto o jogo estava fechado
      if (v.shakeT > 0) {
        v.shakeT = Math.max(0, v.shakeT - dt);
        v.pivot.rotation.set(Math.sin(v.shakeT * 45) * 0.07 * (v.shakeT / 0.3), 0, Math.cos(v.shakeT * 38) * 0.05 * (v.shakeT / 0.3));
      }
    } else if (v.state === 'falling') {
      v.t += dt;
      const k = Math.min(1, v.t / 0.9);
      v.pivot.quaternion.setFromAxisAngle(v.axis, k * k * (Math.PI / 2 - 0.08));
      if (k >= 1 && !v.landed) {
        v.landed = true;
        // Poeira onde a copa bate no chão
        const d = new THREE.Vector3().crossVectors(v.axis, UP_AXIS).multiplyScalar(2 * v.s); // (UP×dir)×UP = dir
        burst(v.x + d.x, 0.2, v.z + d.z, 0xb59b6e, 16, { up: 1.6, spread: 1.4, life: 0.7, size: 0.08 });
        burst(v.x + d.x, 0.5, v.z + d.z, 0x5aa845, 10, { up: 2, spread: 1.2, life: 0.8 });
      }
      if (v.t > 1.7) setTreeDown(v);
    } else if (v.state === 'down') {
      if (!down) {
        // Cresceu de novo
        v.state = 'growing';
        v.t = 0;
        v.stump.visible = false;
        v.tree.visible = true;
        v.tree.scale.setScalar(0.01);
      }
    } else if (v.state === 'growing') {
      v.t += dt;
      const k = Math.min(1, v.t / 1.4);
      const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // ease-out-back
      v.tree.scale.setScalar(Math.max(0.01, e * v.s));
      if (k >= 1) { v.tree.scale.setScalar(v.s); v.state = 'up'; }
    }
  }
}

/** Golpe de machado na árvore i. */
function doChop(i, quiet) {
  const v = grove[i];
  if (!v || v.state !== 'up') return null;
  player.heading = Math.atan2(v.x - player.pos.x, v.z - player.pos.z);
  const logs0 = core.S.inv.tronco || 0;
  const res = core.chopTree(i, quiet);
  if (!res) return null;
  startAction('chop');
  player.busy = 0.42;
  v.shakeT = 0.3;
  burst(v.x, 0.6, v.z, 0xd7b98a, 8, { up: 2, spread: 0.6, size: 0.05, life: 0.5 });
  burst(v.x, 1.9 * v.s, v.z, 0x4f9a3d, 5, { up: 0.5, spread: 1, size: 0.06, life: 1, gravity: 2 });
  if (res === 'fell') {
    // Cai para longe do fazendeiro
    const d = new THREE.Vector3(v.x - player.pos.x, 0, v.z - player.pos.z);
    if (d.lengthSq() < 1e-4) d.set(1, 0, 0);
    d.normalize();
    v.axis.crossVectors(UP_AXIS, d).normalize();
    v.pivot.rotation.set(0, 0, 0);
    v.state = 'falling';
    v.t = 0;
    v.landed = false;
    const p = screenPosOf({ pos: { x: v.x, z: v.z } });
    if (p) ui.fxAt(p.x, p.y - 20, `+${(core.S.inv.tronco || 0) - logs0} 🪵`, 'gold');
  }
  return res;
}

function nearestTree(maxD) {
  let best = null, bd = maxD;
  for (const v of grove) {
    const d = dist2(player.pos, v.x, v.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function startAction(kind) {
  player.actionT = 0.3;
  player.actionKind = kind;
  player.busy = 0.28;
}

function doTile(i, quiet) {
  const p = core.S.plots[i];
  const crop = p.crop;
  const res = core.useTile(i, quiet);
  if (res) {
    startAction(res);
    actionEffect(res, tilePos(i), crop);
  }
  return res;
}

function doAnimal(id, quiet) {
  const res = core.interactAnimal(id, quiet);
  const v = animalVis.get(id);
  if (res && v) {
    startAction(res);
    actionEffect(res, v.pos);
    v.wait = Math.max(v.wait, 1.2); // o animal fica parado um instante
  }
  return res;
}

function openSpot(key) {
  const site = inWork(key);
  if (site) { deliverBuild(site); return; }
  if (key === 'mesa') { doBench(false); return; }
  if (SPOT_HOOKS[key]) { SPOT_HOOKS[key].open(); return; }
  if (key === 'casa') {
    if (core.sleep()) {
      ui.sleepFade();
      ui.markDirty('panel');
    }
    return;
  }
  if (key === 'compost') {
    const res = core.compostUse();
    if (res && (res.collected || res.loaded)) {
      startAction('collect');
      const [x, z] = SPOTS.compost.at;
      burst(x, 0.7, z, res.collected ? 0x7cb342 : 0x6b4423, 12, { up: 2.2, spread: 0.7, size: 0.06 });
    }
    return;
  }
  if (key === 'queijaria') {
    const res = core.cheeseUse();
    if (res && (res.collected || res.loaded)) {
      startAction('collect');
      const [x, z] = SPOTS.queijaria.at;
      burst(x, 0.9, z + 1, res.collected ? 0xf5c542 : 0xffffff, 12, { up: 2.2, spread: 0.7, size: 0.06 });
    }
    return;
  }
  if (key === 'serraria') {
    const res = core.sawmillUse();
    if (res && (res.collected || res.loaded)) {
      startAction('collect');
      const [x, z] = SPOTS.serraria.at;
      burst(x, 0.8, z, 0xd7b98a, 12, { up: 2.4, spread: 0.8, size: 0.06 });
    }
    return;
  }
  if (key === 'cocho') {
    const fed = core.feedAll();
    if (fed) { startAction('feed'); actionEffect('feed', { x: SPOTS.cocho.at[0], z: SPOTS.cocho.at[1] }); }
    return;
  }
  ui.openPanel(key);
}

/** O que está ao alcance do personagem (para a tecla de ação). */
function getContext() {
  if (driving) return { kind: 'exit', id: driving };
  if (riding) return { kind: 'dismount' };
  if (fishing.state !== 'idle') return { kind: 'fish' };
  const pk = nearestPoop(0.75);
  if (pk >= 0) return { kind: 'poop', k: pk };
  // Na porta do galinheiro, a ação é com todas as galinhas de uma vez (não com a ave que passa)
  const cs = SPOTS.galinheiro;
  if (core.built('galinheiro') && dist2(player.pos, cs.point[0], cs.point[1]) < cs.r && core.coopLabel()) return { kind: 'spot', key: 'galinheiro' };
  let best = null;
  let bd = 1.25;
  for (const v of animalVis.values()) {
    const d = dist2(player.pos, v.pos.x, v.pos.z);
    if (d < bd) { bd = d; best = { kind: 'animal', id: v.id }; }
  }
  if (best) return best;
  if (pet.model && dist2(player.pos, pet.pos.x, pet.pos.z) < 1.3) return { kind: 'pet' };
  if (horse && dist2(player.pos, horse.pos.x, horse.pos.z) < 1.5) return { kind: 'horse' };
  if (core.tool === 'machado') {
    const t = nearestTree(1.5);
    if (t) return { kind: 'tree', i: t.i };
  }
  for (const v of machines.values()) {
    if (dist2(player.pos, v.pos.x, v.pos.z) < v.def.reach) return { kind: 'machine', id: v.id };
  }
  if (core.tool === 'vara' && core.S.fishing.rod && nearPond()) return { kind: 'fish' };
  for (const [key, s] of Object.entries(SPOTS)) {
    if (spotActive(s) && dist2(player.pos, s.point[0], s.point[1]) < s.r) return { kind: 'spot', key };
  }
  const fx = player.pos.x + Math.sin(player.heading) * 0.7;
  const fz = player.pos.z + Math.cos(player.heading) * 0.7;
  let i = tileAt(fx, fz);
  if (i < 0) i = tileAt(player.pos.x, player.pos.z);
  if (i >= 0 && dist2(player.pos, tilePos(i).x, tilePos(i).z) < 1.3) return { kind: 'tile', i };
  const dk = nearestDecor(0.95);
  if (dk >= 0) return { kind: 'decor', k: dk };
  return null;
}

function actionLabel(ctx) {
  if (!ctx) return null;
  if (ctx.kind === 'tile') return core.tileActionLabel(ctx.i);
  if (ctx.kind === 'machine') return `Dirigir: ${MACHINES[ctx.id].name}`;
  if (ctx.kind === 'exit') return 'Sair da máquina';
  if (ctx.kind === 'dismount') return 'Descer do cavalo';
  if (ctx.kind === 'poop') return 'Recolher o esterco';
  if (ctx.kind === 'decor') return `Mover: ${DECOR[decorVis[ctx.k].id].name.toLowerCase()}`;
  if (ctx.kind === 'spot' && ctx.key === 'compost') return core.compostLabel();
  if (ctx.kind === 'horse') return core.S.horse.saddle ? 'Montar no cavalo' : 'Ver o cavalo';
  if (ctx.kind === 'fish') return FISH_LABEL[fishing.state] || null;
  if (ctx.kind === 'tree') {
    const a = core.axe();
    if (!a || core.treeDown(ctx.i) || grove[ctx.i].state !== 'up') return null;
    return `Cortar a árvore (${core.S.wood.trees[ctx.i].hits + 1}/${a.hits})`;
  }
  if (ctx.kind === 'pet') return `Fazer carinho em ${core.S.pet.name.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}`;
  if (ctx.kind === 'animal') { const a = core.findAnimal(ctx.id); return a ? core.animalActionLabel(a) : null; }
  if (ctx.kind === 'spot' && ctx.key === 'serraria') return core.sawLabel();
  if (ctx.kind === 'spot' && ctx.key === 'queijaria') return core.cheeseLabel();
  if (ctx.kind === 'spot' && inWork(ctx.key)) return core.buildLabel(inWork(ctx.key));
  if (ctx.kind === 'spot' && ctx.key === 'mesa') return benchLabel();
  if (ctx.kind === 'spot' && SPOT_HOOKS[ctx.key]) return SPOT_HOOKS[ctx.key].label();
  if (ctx.kind === 'spot') {
    if (ctx.key === 'casa') return core.dayHours() >= 18 ? SPOTS.casa.text : null;
    return SPOTS[ctx.key].text;
  }
  return null;
}

function infoText(ctx) {
  if (!ctx) return null;
  if (ctx.kind === 'tile') return core.plotInfo(ctx.i);
  if (ctx.kind === 'machine') return `${MACHINES[ctx.id].icon} ${MACHINES[ctx.id].name}: ${MACHINES[ctx.id].desc}`;
  if (ctx.kind === 'exit') return machineInfo();
  if (ctx.kind === 'decor') return `${DECOR[decorVis[ctx.k].id].icon} ${DECOR[decorVis[ctx.k].id].name}: ${DECOR[decorVis[ctx.k].id].desc}`;
  if (ctx.kind === 'poop') return `${MANURE.icon} Esterco de vaca: recolha e leve para a ${COMPOST.icon} composteira, ao lado do curral, para virar ${FERTILIZER.icon} fertilizante.`;
  if (ctx.kind === 'spot' && ctx.key === 'compost') return core.compostInfo();
  if (ctx.kind === 'dismount') return `${HORSE.icon} Cavalgando! ${'ontouchstart' in window ? 'Leve o joystick até a borda para galopar.' : 'Segure Shift para galopar.'} Clique no chão para ir até lá.`;
  if (ctx.kind === 'horse') return core.S.horse.saddle ? `${HORSE.icon} Seu cavalo, já selado. Monte para andar bem mais rápido.` : `${HORSE.icon} Seu cavalo. Compre a ${SADDLE.icon} sela na loja (🪙${SADDLE.cost}) para montar.`;
  if (ctx.kind === 'fish') return FISH_INFO[fishing.state];
  if (ctx.kind === 'tree') return core.treeInfo(ctx.i);
  if (ctx.kind === 'pet') return `🐶 ${core.S.pet.name}, sua border collie. ${petPettedToday() ? 'Já ganhou carinho hoje ❤️' : 'Faça carinho: +10 XP uma vez por dia.'}`;
  if (ctx.kind === 'animal') { const a = core.findAnimal(ctx.id); return a ? core.animalInfo(a) : null; }
  if (ctx.kind === 'spot' && ctx.key === 'serraria') return core.sawInfo();
  if (ctx.kind === 'spot' && ctx.key === 'queijaria') return core.cheeseInfo();
  if (ctx.kind === 'spot' && inWork(ctx.key)) return core.buildInfo(inWork(ctx.key));
  if (ctx.kind === 'spot' && ctx.key === 'mesa') return benchInfo();
  if (ctx.kind === 'spot' && SPOT_HOOKS[ctx.key]) return SPOT_HOOKS[ctx.key].info();
  if (ctx.kind === 'spot') return SPOTS[ctx.key].info;
  return null;
}

function keyAction(repeat) {
  if (player.busy > 0) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.kind === 'exit') { if (!repeat) exitMachine(); return; }
  if (ctx.kind === 'dismount') { if (!repeat) dismountHorse(); return; }
  if (ctx.kind === 'poop') { doPoop(ctx.k); return; }
  if (ctx.kind === 'decor') { if (!repeat) moveDecor(ctx.k); return; }
  if (ctx.kind === 'horse') { if (!repeat) mountHorse(); return; }
  if (ctx.kind === 'fish') { if (!repeat) fishAction(); return; }
  if (ctx.kind === 'pet') { if (!repeat) petInteract(); return; }
  if (ctx.kind === 'tree') { doChop(ctx.i, repeat); return; }
  if (ctx.kind === 'spot' && ctx.key === 'mesa') { cancelJobs(); doBench(repeat); return; }
  cancelJobs();
  if (ctx.kind === 'machine') { if (!repeat) enterMachine(ctx.id); return; }
  if (ctx.kind === 'tile') {
    player.heading = Math.atan2(tilePos(ctx.i).x - player.pos.x, tilePos(ctx.i).z - player.pos.z) || player.heading;
    doTile(ctx.i, repeat);
    lastKeyTile = ctx.i;
  } else if (repeat) {
    // Segurar a tecla só repete ações na lavoura
  } else if (ctx.kind === 'animal') {
    doAnimal(ctx.id, false);
  } else if (ctx.kind === 'spot') {
    openSpot(ctx.key);
  }
}

/** Botão de ação na tela (toque): pressionar age; segurar repete ao passar por novos lotes. */
export function setActionHeld(held) {
  actionHeld = held;
  if (held) keyAction(false);
  else lastKeyTile = -1;
}

function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (keys.has('w') || keys.has('arrowup')) { ix -= 1; iz -= 1; }
  if (keys.has('s') || keys.has('arrowdown')) { ix += 1; iz += 1; }
  if (keys.has('d') || keys.has('arrowright')) { ix += 1; iz -= 1; }
  if (keys.has('a') || keys.has('arrowleft')) { ix -= 1; iz += 1; }
  player.running = keys.has('shift');
  let speed = player.running ? RUN : WALK;
  player.moving = false;

  // Joystick: tela para direita = (1, -1) no mundo, tela para baixo = (1, 1)
  let mag = 1;
  if (joy.id !== null && joy.moved) {
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy;
    mag = Math.min(1, Math.hypot(dx, dy) / JOY_RADIUS);
    if (mag * JOY_RADIUS > JOY_DEAD) {
      ix = dx + dy;
      iz = dy - dx;
      // Curva suave: devagar perto do centro (precisão), no máximo 1,25× a caminhada na borda
      speed = WALK * (0.25 + mag * mag);
      player.running = mag > 0.9;
    }
  }

  if (ix || iz) [ix, iz] = camDir(ix, iz);

  if (driving) {
    driveMachine(dt, ix, iz, mag);
    return;
  }
  if (riding) speed *= RIDE_MULT;

  if (fishing.state !== 'idle') {
    if (fishing.state === 'waiting' || fishing.state === 'bite') {
      if (ix || iz || player.path.length) endFishing();
    } else {
      ix = 0;
      iz = 0;
    }
  }

  if (ix || iz) {
    if (player.job || player.queue.length || player.path.length) cancelJobs();
    const len = Math.hypot(ix, iz);
    moveBy((ix / len) * speed * dt, (iz / len) * speed * dt);
    player.heading = Math.atan2(ix, iz);
    player.moving = true;
  } else if (player.path.length && player.busy <= 0) {
    followPath(player, dt, speed);
  }

  if (player.busy > 0) player.busy -= dt;
  processJobs(dt);

  // Segurar Espaço/E repete a ação ao passar por novos lotes
  if ((keys.has(' ') || keys.has('e') || actionHeld) && player.busy <= 0) {
    const ctx = getContext();
    if (ctx && ((ctx.kind === 'tile' && ctx.i !== lastKeyTile) || ctx.kind === 'tree' || ctx.kind === 'poop' || (ctx.kind === 'spot' && ctx.key === 'mesa'))) keyAction(true);
  }

  animateFarmer(player, dt, core.tool.startsWith('seed:') ? 'seed' : core.tool);
}

/** Anima um fazendeiro (personagem ou funcionário): passos, ferramenta e golpe. */
function animateFarmer(e, dt, toolKey) {
  const m = e.m;
  m.root.position.copy(e.pos);
  m.root.rotation.y = lerpAngle(m.root.rotation.y, e.heading, 1 - Math.exp(-14 * dt));

  for (const [k, t] of Object.entries(m.tools)) t.visible = k === toolKey;

  if (e.moving) e.phase += dt * (e.running ? 15 : 10);
  const swing = e.moving ? Math.sin(e.phase) * 0.7 : 0;
  const ease = Math.min(1, dt * 14);
  m.legL.rotation.x += (swing - m.legL.rotation.x) * ease;
  m.legR.rotation.x += (-swing - m.legR.rotation.x) * ease;
  const armL = m.torch && m.torch.visible ? -0.75 - swing * 0.15 : -swing * 0.8;
  m.armL.rotation.x += (armL - m.armL.rotation.x) * ease;
  m.body.position.y = e.moving ? Math.abs(Math.sin(e.phase)) * 0.05 : Math.sin(clock * 2) * 0.008;

  let armR = swing * 0.8;
  let lean = 0;
  if (e.actionT > 0) {
    e.actionT -= dt;
    const k = 1 - Math.max(0, e.actionT) / 0.3;
    const arc = Math.sin(k * Math.PI);
    armR = e.actionKind === 'water' ? -1.1 * arc : -1.7 * arc;
    lean = 0.18 * arc;
  }
  if (e.fishArm != null && e.actionT <= 0) armR = e.fishArm;
  m.armR.rotation.x += (armR - m.armR.rotation.x) * Math.min(1, dt * 25);
  m.body.rotation.x = lean;
}

// ================= Funcionários (NPCs) =================
const NPC_STYLE = {
  colhedor: { colors: { shirt: 0x43a047, denim: 0x6d4c41, hat: 0xd4a84f, band: 0x2e7d32, skin: 0xc68642 }, tool: 'mao', home: [-3.4, 3.2] },
  plantador: { colors: { shirt: 0xf9a825, denim: 0x455a64, hat: 0xf3e5c0, band: 0x8e24aa, skin: 0xf1c27d, hair: 0x2b1d14 }, tool: 'seed', home: [-2.2, 3.4] },
  tratador: { colors: { shirt: 0x1e88e5, denim: 0x795548, hat: 0x8d6e63, band: 0x4e342e, skin: 0x8d5524, hair: 0x1b1b1b }, tool: 'mao', home: [1.2, 3.6] },
};
/** Posto de cada funcionário: ao lado do armazém (o tratador fica no portão do curral). */
function npcHome(id) {
  if (id === 'tratador' && PEN) return [PEN.x2 + 0.9, (PEN.z1 + PEN.z2) / 2 - 1.5];
  const [dx, dz] = NPC_STYLE[id].home;
  return [CORE.celeiro[0] + dx, CORE.celeiro[1] + dz];
}
const NPC_SPEED = 2.6;
const npcs = new Map();
let seedWarned = false;

function syncWorkers() {
  const S = core.S;
  for (const id of Object.keys(WORKERS)) {
    const hired = S.workers[id];
    if (hired && !npcs.has(id)) {
      const m = M.makeFarmer(NPC_STYLE[id].colors);
      const pos = new THREE.Vector3(SPOTS.celeiro.point[0], 0, SPOTS.celeiro.point[1]); // sai do armazém
      m.root.position.copy(pos);
      scene.add(m.root);
      const label = M.textSprite(`${WORKERS[id].icon} ${WORKERS[id].name}`, 0.3);
      scene.add(label);
      npcs.set(id, {
        id, m, label, pos, heading: 0, path: [], task: null, busy: 0, actionT: 0, actionKind: null,
        phase: 0, moving: false, running: false, repath: 0, skip: new Map(), bubble: null, bubbleKey: '',
      });
    } else if (!hired && npcs.has(id)) {
      const n = npcs.get(id);
      scene.remove(n.m.root, n.label);
      if (n.bubble) scene.remove(n.bubble);
      npcs.delete(id);
    }
  }
}

function npcTargetPos(id, t) {
  if (id === 'tratador') { const v = animalVis.get(t); return v ? { x: v.pos.x, z: v.pos.z } : null; }
  const p = tilePos(t);
  return { x: p.x, z: p.z };
}

/** Escolhe a tarefa mais próxima que o funcionário ainda não desistiu de fazer. */
function npcPickTask(n) {
  let best = null, bd = Infinity;
  for (const t of core.workerTargets(n.id)) {
    if (n.skip.has(t)) continue;
    const p = npcTargetPos(n.id, t);
    if (!p) continue;
    const d = dist2(n.pos, p.x, p.z);
    if (d < bd) { bd = d; best = t; }
  }
  if (best !== null) { n.task = { t: best, tries: 0 }; n.path = []; n.repath = 0; }
}

function npcWork(n, dt) {
  const tp = npcTargetPos(n.id, n.task.t);
  if (!tp) { n.task = null; return; }
  const reach = n.id === 'tratador' ? 0.95 : REACH;
  const d = dist2(n.pos, tp.x, tp.z);
  if (d <= reach) {
    n.path = [];
    n.heading = Math.atan2(tp.x - n.pos.x, tp.z - n.pos.z);
    const crop = n.id === 'colhedor' ? core.S.plots[n.task.t].crop : null;
    const res = core.workerAct(n.id, n.task.t);
    if (res) {
      n.actionT = 0.3;
      n.actionKind = res;
      n.busy = 0.7;
      actionEffect(res, tp, crop);
      const v = n.id === 'tratador' && animalVis.get(n.task.t);
      if (v) v.wait = Math.max(v.wait, 1.2);
    }
    n.task = null;
    return;
  }
  n.repath -= dt;
  if (!n.path.length || (n.id === 'tratador' && n.repath <= 0)) {
    if (!n.path.length && n.task.tries++ > 3) { n.skip.set(n.task.t, clock + 8); n.task = null; return; }
    const k = Math.min(d, reach * 0.7);
    const ax = tp.x - ((tp.x - n.pos.x) / d) * k;
    const az = tp.z - ((tp.z - n.pos.z) / d) * k;
    const path = nav.findPath(n.pos.x, n.pos.z, ax, az);
    if (!path) { n.skip.set(n.task.t, clock + 8); n.task = null; return; }
    n.path = path;
    n.repath = 0.6;
  }
  followPath(n, dt, NPC_SPEED);
}

/** Sem tarefas: volta para o seu posto e espera. */
function npcIdle(n, dt) {
  const [hx, hz] = npcHome(n.id);
  if (dist2(n.pos, hx, hz) > 0.5) {
    if (!n.path.length) n.path = nav.findPath(n.pos.x, n.pos.z, hx, hz) || [];
    followPath(n, dt, NPC_SPEED * 0.8);
  } else {
    n.path = [];
    n.heading = lerpAngle(n.heading, Math.PI / 4, Math.min(1, dt * 2));
  }
}

function updateWorkers(dt) {
  const semSementes = npcs.has('plantador') && core.plantadorSemSementes();
  for (const n of npcs.values()) {
    n.moving = false;
    for (const [t, until] of n.skip) if (until < clock) n.skip.delete(t);
    if (n.busy > 0) {
      n.busy -= dt;
    } else {
      // A tarefa pode ter sido feita por outra pessoa no caminho
      if (n.task && !core.workerTargets(n.id).includes(n.task.t)) { n.task = null; n.path = []; }
      if (!n.task) npcPickTask(n);
      if (n.task) npcWork(n, dt);
      else npcIdle(n, dt);
    }
    animateFarmer(n, dt, NPC_STYLE[n.id].tool);
    n.label.position.set(n.pos.x, 1.62, n.pos.z);

    const resting = !n.task && !n.moving && n.busy <= 0;
    const bubbleKey = !resting ? '' : n.id === 'plantador' && semSementes ? '❓' : '💤';
    if (n.bubbleKey !== bubbleKey) {
      if (n.bubble) scene.remove(n.bubble);
      n.bubble = bubbleKey ? M.emojiSprite(bubbleKey, 0.34) : null;
      if (n.bubble) scene.add(n.bubble);
      n.bubbleKey = bubbleKey;
    }
    if (n.bubble) n.bubble.position.set(n.pos.x + 0.25, 2.0 + Math.sin(clock * 2.5) * 0.05, n.pos.z);
  }
  if (semSementes && !seedWarned) ui.toast('🌱 O plantador está sem sementes! Compre mais na loja.', 'bad');
  seedWarned = semSementes;
}

// ================= Pescaria =================
const LINE_PTS = 14;
const SPLASH = 0xd6efff;
const fishing = {
  state: 'idle', // idle → casting → waiting → bite → reeling → caught
  t: 0, wait: 0, fish: null,
  from: new THREE.Vector3(), target: new THREE.Vector3(),
  bobber: null, line: null, excl: null, catchMesh: null, game: null, jumpT: 4,
};
let fishMouse = false;
const tmpTip = new THREE.Vector3();

function buildFishing() {
  fishing.bobber = M.makeBobber();
  fishing.bobber.visible = false;
  scene.add(fishing.bobber);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3));
  fishing.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  fishing.line.frustumCulled = false;
  fishing.line.visible = false;
  scene.add(fishing.line);
  fishing.excl = M.emojiSprite('❗', 0.6, false);
  fishing.excl.visible = false;
  scene.add(fishing.excl);
}

const nearPond = () => dist2(player.pos, POND.x, POND.z) < POND.r + 1.4;
const splash = (x, z, n = 10) => burst(x, 0.06, z, SPLASH, n, { up: 2, spread: 0.45, size: 0.05, life: 0.5 });

/** Lança a linha num ponto do lago (o clicado, ou à frente do pescador). */
function startCast(tx, tz) {
  if (!core.S.fishing.rod) { ui.toast('🎣 Compre uma vara de pesca na loja para pescar aqui.', 'bad'); return; }
  if (core.tool !== 'vara') core.setTool('vara');
  cancelJobs();
  let x = tx, z = tz;
  if (x == null) {
    const dx = player.pos.x - POND.x, dz = player.pos.z - POND.z, d = Math.hypot(dx, dz) || 1;
    x = POND.x + (dx / d) * POND.r * 0.35 + rand(-0.3, 0.3);
    z = POND.z + (dz / d) * POND.r * 0.35 + rand(-0.3, 0.3);
  }
  const cx = x - POND.x, cz = z - POND.z, cd = Math.hypot(cx, cz);
  if (cd > POND.r - 0.35) { x = POND.x + (cx / cd) * (POND.r - 0.35); z = POND.z + (cz / cd) * (POND.r - 0.35); }
  player.heading = Math.atan2(x - player.pos.x, z - player.pos.z);
  fishing.target.set(x, 0.03, z);
  fishing.state = 'casting';
  fishing.t = 0;
  player.m.rodTip.getWorldPosition(fishing.from);
  fishing.bobber.visible = true;
  fishing.line.visible = true;
  player.actionT = 0.3;
  player.actionKind = 'cast';
  sfx('cast');
}

function endFishing() {
  fishing.state = 'idle';
  fishing.bobber.visible = false;
  fishing.line.visible = false;
  fishing.excl.visible = false;
  if (fishing.catchMesh) { scene.remove(fishing.catchMesh); fishing.catchMesh = null; }
  player.fishArm = null;
  fishMouse = false;
  ui.fishGameHide();
}

/** Tecla de ação durante a pesca. */
function fishAction() {
  if (fishing.state === 'idle') startCast();
  else if (fishing.state === 'waiting') { ui.toast('Nada mordeu ainda… a linha foi recolhida.'); endFishing(); }
  else if (fishing.state === 'bite') startReel();
}

function startReel() {
  fishing.state = 'reeling';
  fishing.t = 0;
  fishing.excl.visible = false;
  fishing.game = { fish: 0.3, fv: 0, ftarget: 0.6, timer: 0, zone: 0.05, zv: 0, size: core.rod().zone, progress: 0.3, dif: FISH[fishing.fish].dif };
  ui.fishGameShow('🐟');
  splash(fishing.target.x, fishing.target.z, 14);
  sfx('splash');
}

function catchNow() {
  const f = FISH[fishing.fish];
  core.catchFish(fishing.fish);
  ui.fishGameHide();
  fishing.state = 'caught';
  fishing.t = 0;
  fishing.line.visible = false;
  fishing.bobber.visible = false;
  fishing.catchMesh = M.makeCatch(f.color, !!f.junk);
  fishing.catchMesh.position.copy(fishing.bobber.position);
  scene.add(fishing.catchMesh);
  splash(fishing.target.x, fishing.target.z, 18);
  const p = screenPosOf({ player: true });
  if (p) ui.fxAt(p.x, p.y, `+1 ${f.icon}`, 'gold');
}

/** Minigame: segurar sobe a faixa verde; o peixe foge para cima e para baixo. */
function reelGame(dt, holding) {
  const g = fishing.game;
  g.timer -= dt;
  if (g.timer <= 0) {
    g.ftarget = rand(0.04, 0.96);
    g.timer = rand(0.35, 1.5) * (1.25 - g.dif);
  }
  g.fv += (g.ftarget - g.fish) * (2.5 + g.dif * 12) * dt;
  g.fv *= Math.max(0, 1 - 3 * dt);
  g.fish = THREE.MathUtils.clamp(g.fish + g.fv * dt, 0, 1);
  g.zv = THREE.MathUtils.clamp(g.zv + (holding ? 2.8 : -2.4) * dt, -1.5, 1.5);
  g.zone += g.zv * dt;
  if (g.zone < 0) { g.zone = 0; g.zv = Math.abs(g.zv) * 0.3; }
  if (g.zone > 1 - g.size) { g.zone = 1 - g.size; g.zv = 0; }
  const inside = g.fish >= g.zone - 0.02 && g.fish <= g.zone + g.size + 0.02;
  g.progress += (inside ? 0.3 : -(0.2 + g.dif * 0.12)) * dt;
  ui.fishGameUpdate(g.fish, g.zone, g.size, g.progress, inside);
  return g.progress;
}

function updateFishing(dt) {
  if (fishing.state === 'idle') {
    // Peixes pulando no lago de vez em quando
    fishing.jumpT -= dt;
    if (fishing.jumpT <= 0) {
      fishing.jumpT = rand(5, 12);
      const a = rand(0, Math.PI * 2), d = rand(0, POND.r * 0.7);
      splash(POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d, 8);
    }
    return;
  }
  const holding = keys.has(' ') || keys.has('e') || actionHeld || fishMouse;
  const rd = core.rod();
  const b = fishing.bobber;
  fishing.t += dt;
  player.fishArm = -0.55;

  if (fishing.state === 'casting') {
    const k = Math.min(1, fishing.t / 0.55);
    b.position.lerpVectors(fishing.from, fishing.target, k);
    b.position.y = THREE.MathUtils.lerp(fishing.from.y, 0.03, k) + Math.sin(k * Math.PI) * 1.2;
    if (k >= 1) {
      fishing.state = 'waiting';
      fishing.t = 0;
      fishing.wait = rand(2, 6) * rd.wait * (core.S.weather === 'chuva' ? 0.8 : 1);
      splash(fishing.target.x, fishing.target.z, 6);
      sfx('splash');
    }
  } else if (fishing.state === 'waiting') {
    b.position.set(fishing.target.x, 0.03 + Math.sin(clock * 3) * 0.015, fishing.target.z);
    if (fishing.t >= fishing.wait) {
      fishing.state = 'bite';
      fishing.t = 0;
      fishing.fish = core.rollFish();
      fishing.excl.visible = true;
      splash(fishing.target.x, fishing.target.z, 8);
      sfx('bite');
    }
  } else if (fishing.state === 'bite') {
    b.position.set(fishing.target.x, -0.04 + Math.sin(clock * 25) * 0.03, fishing.target.z);
    fishing.excl.position.set(player.pos.x, 2.15 + Math.sin(clock * 10) * 0.05, player.pos.z);
    if (fishing.t > rd.bite) {
      ui.toast('O peixe escapou! 💨 Puxe mais rápido quando aparecer o ❗.', 'bad');
      endFishing();
      return;
    }
  } else if (fishing.state === 'reeling') {
    const g = fishing.game;
    b.position.set(fishing.target.x + Math.sin(clock * 9) * 0.08, 0.02 + (g.fish - 0.5) * 0.04, fishing.target.z + Math.cos(clock * 7) * 0.08);
    if (Math.random() < dt * 4) splash(b.position.x, b.position.z, 2);
    player.fishArm = holding ? -0.85 + Math.sin(clock * 20) * 0.08 : -0.6;
    const p = reelGame(dt, holding);
    if (p >= 1) catchNow();
    else if (p <= 0) {
      ui.toast('O peixe escapou! 💨 Mantenha ele dentro da faixa verde.', 'bad');
      sfx('error');
      endFishing();
      return;
    }
  } else if (fishing.state === 'caught') {
    const k = Math.min(1, fishing.t / 0.75);
    const m = fishing.catchMesh;
    m.position.lerpVectors(fishing.target, tmpTip.set(player.pos.x, 1.1, player.pos.z), k);
    m.position.y += Math.sin(k * Math.PI) * 1.4;
    m.rotation.x += dt * 12;
    if (k >= 1) { endFishing(); return; }
  }

  // Linha da ponta da vara até a boia, com uma leve curva
  if (fishing.line.visible) {
    player.m.rodTip.getWorldPosition(tmpTip);
    const arr = fishing.line.geometry.attributes.position.array;
    const sag = fishing.state === 'reeling' ? 0.05 : fishing.state === 'casting' ? 0 : 0.3;
    for (let i = 0; i < LINE_PTS; i++) {
      const t = i / (LINE_PTS - 1);
      arr[i * 3] = tmpTip.x + (b.position.x - tmpTip.x) * t;
      arr[i * 3 + 1] = tmpTip.y + (b.position.y + 0.08 - tmpTip.y) * t - Math.sin(t * Math.PI) * sag;
      arr[i * 3 + 2] = tmpTip.z + (b.position.z - tmpTip.z) * t;
    }
    fishing.line.geometry.attributes.position.needsUpdate = true;
  }
}

const FISH_LABEL = { idle: 'Lançar a linha', waiting: 'Recolher a linha', bite: 'PUXAR! ❗', reeling: 'Segure para puxar' };
const FISH_INFO = {
  idle: '🎣 Lago: lance a linha e espere o peixe morder. À noite aparecem mais bagres; na chuva, lagostins.',
  casting: '🎣 Lançando…',
  waiting: '🎣 Esperando… fique de olho na boia.',
  bite: '❗ Mordeu! Aperte Espaço / ✋ agora!',
  reeling: '🐟 Segure Espaço / ✋ para subir a faixa verde e manter o peixe dentro dela.',
  caught: '🎣 Pegou!',
};

// ================= Entrada (teclado, mouse e toque) =================
function shown(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function pick() {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  for (const h of hits) {
    if (!shown(h.object)) continue; // escondidos (obras, cocho sem curral) não contam
    let o = h.object;
    while (o && !o.userData.pick) o = o.parent;
    if (o) return o.userData.pick;
  }
  const pt = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(pickPlane, pt)) return null;
  if (Math.hypot(pt.x - POND.x, pt.z - POND.z) < POND.r) return { kind: 'water', x: pt.x, z: pt.z };
  const i = tileAt(pt.x, pt.z);
  if (i >= 0) return { kind: 'tile', i };
  return { kind: 'ground', x: pt.x, z: pt.z };
}

function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}

function queued(i) {
  return (player.job && player.job.kind === 'tile' && player.job.i === i) || player.queue.some((j) => j.kind === 'tile' && j.i === i);
}

/** Clique (mouse) ou toque rápido: vai até o alvo e age. Retorna o que foi atingido. */
function clickAt(e) {
  if (driving) return null; // dirigindo: os cliques não movem o fazendeiro
  setNdc(e);
  const hit = pick();
  if (!hit) return null;
  // Pescando: clicar ajuda a puxar; clicar em outro lugar (antes da mordida) recolhe a linha
  if (fishing.state === 'bite') { fishAction(); fishMouse = true; return hit; }
  if (fishing.state === 'reeling' || fishing.state === 'caught' || fishing.state === 'casting') { fishMouse = true; return hit; }
  if (fishing.state === 'waiting' && hit.kind !== 'water') endFishing();
  if (lotPlacing) {
    // Escolhendo o lugar de uma obra ou campo: o clique escolhe (no mouse, já confirma)
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(pickPlane, pt)) {
      [lotPlacing.x, lotPlacing.z] = lotAnchorAt(lotPlacing.id, pt.x, pt.z);
      lotPlacing.follow = 'fixed';
      updateLotPlacing();
      if (e.pointerType === 'mouse') confirmLot();
    }
    return hit;
  }
  if (placing) {
    // Colocando decoração: o clique escolhe o lugar (no mouse, já coloca)
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(pickPlane, pt)) {
      placing.x = pt.x; placing.z = pt.z; placing.follow = 'fixed';
      updatePlacing();
      if (e.pointerType === 'mouse') confirmPlacing();
    }
    return hit;
  }
  cancelJobs();
  if (riding) {
    // Montado: qualquer clique leva o cavalo até aquele ponto do chão
    const pt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(pickPlane, pt)) return hit;
    player.queue.push({ kind: 'move', x: pt.x, z: pt.z });
    clickMarker.position.set(pt.x, 0.03, pt.z);
    clickMarker.material.opacity = 0.9;
    clickMarker.scale.setScalar(1);
    return hit;
  }
  if (hit.kind === 'horse') { player.queue.push({ kind: 'horse' }); return hit; }
  if (hit.kind === 'poop') { player.queue.push({ kind: 'poop', k: hit.k }); return hit; }
  if (hit.kind === 'decor') { player.queue.push({ kind: 'decor', k: hit.k }); return hit; }
  if (hit.kind === 'water') {
    if (!core.S.fishing.rod) ui.toast('🎣 Compre uma vara de pesca na loja para pescar aqui.');
    else if (fishing.state === 'idle') player.queue.push({ kind: 'fish', x: hit.x, z: hit.z });
    return hit;
  }
  if (hit.kind === 'machine') { player.queue.push({ kind: 'machine', id: hit.id }); return hit; }
  if (hit.kind === 'pet') { player.queue.push({ kind: 'pet' }); return hit; }
  if (hit.kind === 'tree') {
    if (!core.S.wood.axe) ui.toast('🪓 Compre um machado na loja para cortar árvores.');
    else if (!core.treeDown(hit.i)) {
      if (core.tool !== 'machado') core.setTool('machado');
      player.queue.push({ kind: 'tree', i: hit.i });
    }
    return hit;
  }
  if (hit.kind === 'tile') {
    player.queue.push({ kind: 'tile', i: hit.i });
  } else if (hit.kind === 'animal') {
    player.queue.push({ kind: 'animal', id: hit.id });
  } else if (hit.kind === 'spot') {
    player.queue.push({ kind: 'spot', key: hit.key });
  } else {
    player.queue.push({ kind: 'move', x: hit.x, z: hit.z });
    clickMarker.position.set(hit.x, 0.03, hit.z);
    clickMarker.material.opacity = 0.9;
    clickMarker.scale.setScalar(1);
  }
  return hit;
}

function showJoystick() {
  if (!joy.el) {
    joy.el = document.createElement('div');
    joy.el.className = 'joystick';
    joy.knob = document.createElement('div');
    joy.knob.className = 'joystick-knob';
    joy.el.appendChild(joy.knob);
    document.body.appendChild(joy.el);
  }
  joy.el.style.left = joy.sx + 'px';
  joy.el.style.top = joy.sy + 'px';
  joy.el.classList.add('on');
}

function moveKnob() {
  let dx = joy.x - joy.sx, dy = joy.y - joy.sy;
  const d = Math.hypot(dx, dy);
  if (d > JOY_RADIUS) { dx = (dx / d) * JOY_RADIUS; dy = (dy / d) * JOY_RADIUS; }
  joy.knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function endJoystick(e, tap) {
  if (tap && !joy.moved) clickAt(e);
  if (joy.el) joy.el.classList.remove('on');
  joy.id = null;
  joy.moved = false;
}

function bindInput() {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    // Botão direito do mouse: gira a câmera
    if (e.pointerType !== 'touch' && e.button === 2) {
      Object.assign(rot, { id: e.pointerId, x: e.clientX, sx: e.clientX, sy: e.clientY, moved: false, mouse: true });
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético */ }
      return;
    }
    if (e.pointerType === 'touch') {
      // Segundo dedo, ou dedo que começa no lado oposto ao joystick: gira a câmera (toque rápido continua valendo como clique)
      const onRight = e.clientX > canvas.clientWidth * 0.5;
      const camSide = joySide() === 'right' ? !onRight : onRight;
      if (rot.id === null && (joy.id !== null || camSide)) {
        Object.assign(rot, { id: e.pointerId, x: e.clientX, sx: e.clientX, sy: e.clientY, moved: false, mouse: false });
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético */ }
        return;
      }
      if (joy.id !== null) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético ou já liberado */ }
      Object.assign(joy, { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false });
      return;
    }
    if (e.button !== 0) return;
    mouseIn = true;
    const hit = clickAt(e);
    if (!hit) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético ou já liberado */ }
    if (hit.kind === 'tile') {
      dragging = true;
      lastDragTile = hit.i;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === rot.id) {
      if (!rot.moved && Math.hypot(e.clientX - rot.sx, e.clientY - rot.sy) > (rot.mouse ? 3 : 12)) {
        rot.moved = true;
        rot.x = e.clientX;
        canvas.classList.add('rotating');
      }
      if (rot.moved) {
        camYawTarget -= (e.clientX - rot.x) * ROT_SPEED;
        rot.x = e.clientX;
      }
      return;
    }
    if (e.pointerId === joy.id) {
      joy.x = e.clientX;
      joy.y = e.clientY;
      if (!joy.moved && Math.hypot(joy.x - joy.sx, joy.y - joy.sy) > 12) {
        joy.moved = true;
        cancelJobs();
        showJoystick();
      }
      if (joy.moved) moveKnob();
      return;
    }
    if (e.pointerType === 'touch') return;
    setNdc(e);
    mouseIn = true;
    if (placing) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(pickPlane, tmpPlace)) { placing.x = tmpPlace.x; placing.z = tmpPlace.z; placing.follow = 'mouse'; }
    }
    if (lotPlacing) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(pickPlane, tmpPlace)) { [lotPlacing.x, lotPlacing.z] = lotAnchorAt(lotPlacing.id, tmpPlace.x, tmpPlace.z); lotPlacing.follow = 'mouse'; }
    }
    if (!dragging) return;
    const hit = pick();
    if (hit && hit.kind === 'tile' && hit.i !== lastDragTile) {
      lastDragTile = hit.i;
      if (!queued(hit.i) && player.queue.length < 48) player.queue.push({ kind: 'tile', i: hit.i, quiet: true });
    }
  });
  const endRot = (e, tap) => {
    if (tap && !rot.moved && !rot.mouse) clickAt(e); // toque rápido do lado da câmera: anda/age como antes
    rot.id = null;
    rot.moved = false;
    canvas.classList.remove('rotating');
  };
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId === rot.id) { endRot(e, true); return; }
    if (e.pointerId === joy.id) endJoystick(e, true);
    dragging = false;
    fishMouse = false;
  });
  canvas.addEventListener('pointercancel', (e) => {
    if (e.pointerId === rot.id) { endRot(e, false); return; }
    if (e.pointerId === joy.id) endJoystick(e, false);
    dragging = false;
  });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') mouseIn = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
      typed = (typed + k).slice(-12);
      if (typed.endsWith('godmode')) { typed = ''; core.godMode(); ui.closeMap(); return; }
    }
    if (ui.uiBlocking() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'm' && !placing && !lotPlacing) { ui.openMap(); return; }
    if (k === 'p' && !placing && !lotPlacing) { ui.togglePhoto(); return; }
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    if (k === ' ' || k === 'e') {
      if (!e.repeat) keyAction(false);
    } else if (k >= '1' && k <= '9') {
      ui.selectToolByIndex(+k - 1);
    } else if (k === '+' || k === '=') zoomBy(1 / 1.15);
    else if (k === '-') zoomBy(1.15);
    else if (k === 'q') rotateCamera(Math.PI / 4);
    else if (k === 'r') rotateCamera(-Math.PI / 4);
    else if (k === 'c') resetCamera();
    else if (k === 'escape' && lotPlacing) cancelLot();
    else if (k === 'enter' && lotPlacing) confirmLot();
    else if (k === 'escape' && placing) cancelPlacing();
    else if (k === 'enter' && placing) confirmPlacing();
    else if (k === 'g' && placing) rotatePlacing();
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if (k === ' ' || k === 'e') lastKeyTile = -1;
    if (k === 'shift') keys.delete('shift');
  });
  window.addEventListener('blur', () => keys.clear());
}

// ================= Indicadores na tela =================
function updateHelpers(dt) {
  hover = mouseIn && !dragging ? pick() : null;
  canvas.style.cursor = hover && hover.kind !== 'ground' ? 'pointer' : 'default';

  const ringAt = (ring, i) => {
    const t = tilePos(i);
    ring.position.set(t.x, plotVis[i].top + 0.012, t.z);
    ring.visible = true;
  };
  hoverRing.visible = false;
  targetRing.visible = false;
  if (hover && hover.kind === 'tile') ringAt(hoverRing, hover.i);

  const ctx = getContext();
  if (ctx && ctx.kind === 'tile' && !player.path.length) ringAt(targetRing, ctx.i);
  targetRing.material.opacity = 0.65 + Math.sin(clock * 6) * 0.3;

  // Lotes na fila de tarefas
  const jobs = [player.job, ...player.queue].filter((j) => j && j.kind === 'tile');
  while (queueRings.length < jobs.length) queueRings.push(squareRing(0x7fd3ff, 0.8));
  queueRings.forEach((r, k) => {
    if (k < jobs.length) {
      const t = tilePos(jobs[k].i);
      r.position.set(t.x, plotVis[jobs[k].i].top + 0.01, t.z);
      r.scale.setScalar(0.82);
      r.visible = true;
    } else r.visible = false;
  });

  if (clickMarker.material.opacity > 0) {
    clickMarker.material.opacity = Math.max(0, clickMarker.material.opacity - dt * 1.5);
    clickMarker.scale.addScalar(dt * 1.2);
  }

  // Textos da interface
  const label = ui.uiBlocking() ? null : actionLabel(ctx);
  ui.setPrompt(label ? `<kbd>Espaço</kbd> ${label}` : '');
  const hoverCtx = hover && hover.kind !== 'ground' ? hover : null;
  ui.setStatus(infoText(hoverCtx) || infoText(ctx) || core.toolHint());
}

/** Posição na tela de um alvo do jogo (para os textos flutuantes). */
export function screenPosOf(target) {
  if (!camera) return null;
  const v = new THREE.Vector3();
  if (target.tile != null) { v.copy(tilePos(target.tile)); v.y = 0.9; }
  else if (target.animal != null) { const a = animalVis.get(target.animal); if (!a) return null; v.copy(a.pos); v.y = 1.0; }
  else if (target.player) { v.copy(player.pos); v.y = driving ? 3 : riding ? 2.6 : 1.7; }
  else if (target.pet) { v.copy(pet.pos); v.y = 1.0; }
  else if (target.pos) { v.copy(target.pos); v.y = 1.0; }
  else if (target.machine) { const m = machines.get(target.machine); if (!m) return null; v.copy(m.pos); v.y = 2.6; }
  else return null;
  v.project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}

/** Recomeço do jogo: limpa animais, tarefas e volta o personagem ao início. */
export function onReset() {
  if (driving) exitMachine();
  if (riding) dismountHorse();
  if (horse) { scene.remove(horse.m.root); pickables.splice(pickables.indexOf(horse.m.root), 1); horse = null; }
  if (fishing.state !== 'idle') endFishing();
  for (const v of animalVis.values()) {
    scene.remove(v.m.root);
    if (v.ind) scene.remove(v.ind);
    pickables.splice(pickables.indexOf(v.m.root), 1);
  }
  animalVis.clear();
  for (const v of plotVis) { v.baseKey = ''; v.cropKey = 'x'; v.indKey = 'x'; }
  cancelJobs();
  player.pos.copy(SPAWN);
  player.heading = Math.PI;
}

// ================= Quadro =================
export function worldFrame(dt) {
  clock += dt;
  syncFields();
  syncPlots();
  syncBig();
  syncMachines();
  syncHorse();
  syncAnimals();
  syncWorkers();
  updatePlayer(dt);
  updateHorse(dt);
  updateFishing(dt);
  updateMailbox();
  updateGrove(dt);
  updateSawmill(dt);
  updateCheesery();
  updateCoop();
  updateFactoryVis(dt);
  updateOrchard(dt);
  updateDecor(dt);
  updateLotPlacing();
  updateCrows(dt);
  updateSeason(dt);
  updateLeaves(dt);
  updateSites(dt);
  updateCompost();
  updateBench(dt);
  updateLights(dt);
  syncPet();
  updatePet(dt);
  updateCritters(dt);
  updateAnimals(dt);
  updateWorkers(dt);
  updateMachines(dt);
  animatePlots();
  updateCamera(dt);
  updateSky(dt);
  updateParticles(dt);
  updateHelpers(dt);
  updateGuide(dt);
  paintedFrame(dt, { center: camTarget, daylight: 1 - core.darkness(), rain: core.S.weather === 'chuva', windy: !!(core.S.event && core.S.event.id === 'ventania'), sunDir: tmpSun.copy(sun.position).sub(sun.target.position).normalize() });
  renderScene();
}

const tmpSun = new THREE.Vector3();
/** Visual do jogo: 'simple' (low-poly) ou 'painted' (luz em faixas, nuvens e acabamento de pintura). */
export function setVisual(mode) {
  const p = mode === 'painted';
  setPainted(p);
  if (groundFlat) { groundFlat.visible = !p; groundPainted.visible = p; }
}

// Usado pelos testes no console do navegador
export const debug = { player, animalVis, npcs, machines, fishing, fishAction, startCast, pet, petInteract, randomSpot, fauna, get driving() { return driving; }, get riding() { return riding; }, get snowCap() { return snowCap; }, fallingLeaves, LOTS, lotValid, lotRect, placeLotNow, get lotPlacing() { return lotPlacing; }, paths, get PEN() { return PEN; }, get PAST() { return PAST; }, poopPos, crows, spawnCrow, get horse() { return horse; }, mountHorse, dismountHorse, enterMachine, exitMachine, bigCellAt, bigCellCenter, get zoom() { return zoom; }, get zoomMult() { return zoomMult; }, get camH() { return camera.top - camera.bottom; }, tileAt, tilePos, get nav() { return nav; } };
