/* FarmLife — mundo 3D: cena, câmera isométrica, personagem, animais e interações */
import * as THREE from 'three';
import { ANIMALS, PRODUCTS, CROPS, WORKERS, FIELDS, TOTAL_PLOTS, fieldOf } from '../data.js';
import * as core from '../core.js';
import * as ui from '../ui.js';
import * as M from './models.js';
import { NavGrid } from './nav.js';

// ================= Layout do mundo =================
const TILE = 1.08;
const BOUNDS = { minX: -15, maxX: 18.5, minZ: -10.3, maxZ: 14.5 };
const PLAYER_R = 0.28;
const WALK = 3.4;
const RUN = 5.6;
const REACH = 1.0;
const SPAWN = new THREE.Vector3(0, 0, 4.6);

const PEN = { x1: -14.2, x2: -7.8, z1: -4.5, z2: 3.5, gate: [-1.0, 0.6] };
const POND = { x: 8.3, z: 4.6, r: 1.8 };

// Centro de cada campo no mapa
const FIELD_POS = { principal: [0, 0], leste: [13.6, -1.0], sul: [0, 10.8], lago: [13.6, 10.2] };

const SPOTS = {
  celeiro: { label: '🛖 Celeiro', at: [-1.5, -8.3], labelY: 4.3, point: [-1.5, -6.0], r: 1.3, text: 'Abrir o Celeiro', info: '🛖 Celeiro: venda sua colheita e veja o mercado do dia.' },
  loja:    { label: '🏪 Loja', at: [6.5, -7.9], labelY: 2.9, point: [6.5, -6.4], r: 1.3, text: 'Abrir a Loja', info: '🏪 Loja: sementes, animais e melhorias.' },
  pedidos: { label: '📦 Pedidos', at: [2.6, -6.9], labelY: 2.4, point: [2.6, -6.0], r: 1.1, text: 'Ver os Pedidos', info: '📦 Quadro de pedidos da vila: entregas pagam mais que o mercado.' },
  casa:    { label: '🏠 Casa', at: [-9.5, -8.4], labelY: 3.9, point: [-8.9, -6.1], r: 1.2, text: 'Dormir até amanhã', info: '🏠 Sua casa. Depois das 18h, durma para pular para a manhã seguinte.' },
  cocho:   { label: null, at: [-13.5, -0.5], point: [-12.8, -0.5], r: 1.1, text: 'Alimentar todos no cocho', info: '🪵 Cocho: alimenta de uma vez todos os animais com fome (1 🌾 cada).' },
};
for (const f of FIELDS) {
  if (!f.cost) continue;
  const [cx, cz] = FIELD_POS[f.id];
  SPOTS['campo:' + f.id] = {
    label: null, at: [cx, cz], point: [cx, cz + 0.9], r: 1.4, field: f.id,
    text: `Ver o ${f.name}`,
    info: `${f.icon} ${f.name} à venda: ${f.count} lotes por 🪙${f.cost.toLocaleString('pt-BR')} (nível ${f.level}). Compre na loja.`,
  };
}
const spotActive = (s) => !s.field || !core.fieldOwned(s.field);

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

const plotVis = [];
const animalVis = new Map();
const pickables = [];
const particles = [];
const particlePool = [];
let hoverRing, targetRing, clickMarker, feeder;
const queueRings = [];

const keys = new Set();
let lastKeyTile = -1;
let actionHeld = false;

// Joystick virtual (toque): aparece onde o dedo encosta e some ao soltar
const JOY_RADIUS = 56;
const JOY_DEAD = 8;
const joy = { id: null, sx: 0, sy: 0, x: 0, y: 0, moved: false, el: null, knob: null };
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
  buildPen();
  buildNature();
  buildRain();
  buildHelpers();

  player.m = M.makeFarmer();
  scene.add(player.m.root);
  camTarget.copy(player.pos);

  bindInput();
  window.addEventListener('resize', resize);
  resize();
}

function buildGround() {
  const geo = new THREE.PlaneGeometry(140, 140, 70, 70).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
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

  // Caminhos de terra
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xcfae74, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const strip = (x1, z1, x2, z2) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x2 - x1), Math.abs(z2 - z1)), pathMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
    m.receiveShadow = true;
    scene.add(m);
  };
  strip(-10.5, -5.65, 8.5, -4.35);
  strip(-2.1, -6.7, -0.9, -5.6);
  strip(5.9, -7.3, 7.1, -5.6);
  strip(-9.5, -7.0, -8.3, -5.6);
  strip(-0.7, -4.4, 0.7, -3.3);
  strip(-7.8, -0.85, -4.3, 0.45);
  strip(4.3, -1.6, 10.4, -0.4);   // até o Campo do Leste
  strip(-0.6, 3.2, 0.6, 8.7);     // até o Campo do Sul
  strip(4.3, 10.2, 10.4, 11.4);   // do Sul até o Campo do Lago

  // Borda de terra em volta de cada campo
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const f of FIELDS) {
    const [cx, cz] = FIELD_POS[f.id];
    const border = new THREE.Mesh(new THREE.PlaneGeometry(f.cols * TILE + 0.5, f.rows * TILE + 0.5), borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.set(cx, 0.012, cz);
    border.receiveShadow = true;
    scene.add(border);
  }

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

const fieldVis = {};

function buildFarm() {
  for (const f of FIELDS) {
    if (!f.cost) continue;
    const [cx, cz] = FIELD_POS[f.id];
    const g = new THREE.Group();
    const sign = M.makeSaleSign();
    sign.position.set(cx, 0, cz);
    sign.rotation.y = Math.PI / 4; // de frente para a câmera
    g.add(sign);
    const { x1, x2, z1, z2 } = fieldRect(f, -0.1);
    for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) {
      const st = M.makeStake();
      st.position.set(x, 0, z);
      st.rotation.y = Math.PI / 4;
      g.add(st);
    }
    const label = M.textSprite(`🪧 ${f.name} · 🪙${f.cost.toLocaleString('pt-BR')}`, 0.42);
    label.position.set(cx, 1.7, cz);
    g.add(label);
    scene.add(g);
    const proxy = new THREE.Mesh(M.GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
    proxy.scale.set(1.3, 1.6, 0.6);
    proxy.position.set(cx, 0.8, cz);
    proxy.userData.pick = { kind: 'spot', key: 'campo:' + f.id };
    scene.add(proxy);
    fieldVis[f.id] = { group: g, proxy, owned: null };
  }

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
    plotVis.push({ group, base, deco, top: 0.08, baseKey: '', crop: null, cropKey: '', cropH: 0, pop: 1, ind: null, indKey: '' });
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
  }
}

function buildBuildings() {
  addSpot('celeiro', M.makeBarn(), { size: [4, 3.7, 3.4] });
  nav.blockRect(-3.5, -10, 0.5, -6.6, PLAYER_R);
  nav.blockRect(0.7, -7.95, 1.5, -6.85, PLAYER_R);

  addSpot('loja', M.makeShop(), { size: [2.8, 2.4, 1.4] });
  nav.blockRect(5.2, -8.6, 7.8, -7.2, PLAYER_R);
  nav.blockRect(7.7, -7.4, 8.6, -6.9, PLAYER_R);

  addSpot('pedidos', M.makeBoard(), { size: [1.8, 2.0, 0.5] });
  nav.blockLine(1.85, -6.9, 3.35, -6.9, 0.12 + PLAYER_R);

  addSpot('casa', M.makeHouse(), { size: [3.6, 3.4, 3.0] });
  nav.blockRect(-11.3, -9.9, -7.7, -6.9, PLAYER_R);
  nav.blockRect(-11.6, -9.4, -10.4, -8.6, PLAYER_R);

  const lampBarn = new THREE.PointLight(0xffb84d, 0, 7, 1.5);
  lampBarn.position.set(-0.45, 1.9, -6.3);
  const lampHouse = new THREE.PointLight(0xffc861, 0, 7, 1.5);
  lampHouse.position.set(-10.3, 1.3, -6.5);
  const lampShop = new THREE.PointLight(0xffd27a, 0, 6, 1.5);
  lampShop.position.set(6.5, 2.0, -7.0);
  scene.add(lampBarn, lampHouse, lampShop);
  lamps.push(lampBarn, lampHouse, lampShop);
}

function buildPen() {
  const { x1, x2, z1, z2, gate } = PEN;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(x2 - x1, z2 - z1),
    new THREE.MeshStandardMaterial({ color: 0xd8c27e, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x1 + x2) / 2, 0.011, (z1 + z2) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const lines = [[x1, z1, x2, z1], [x1, z2, x2, z2], [x1, z1, x1, z2], [x2, z1, x2, gate[0]], [x2, gate[1], x2, z2]];
  for (const [a, b, c, d] of lines) {
    scene.add(M.makeFence(a, b, c, d));
    nav.blockLine(a, b, c, d, 0.08 + PLAYER_R);
  }
  const label = M.textSprite('🐾 Curral', 0.42);
  label.position.set(x2, 1.4, (gate[0] + gate[1]) / 2);
  scene.add(label);

  const trough = M.makeTrough();
  trough.position.set(SPOTS.cocho.at[0], 0, SPOTS.cocho.at[1]);
  trough.userData.pick = { kind: 'spot', key: 'cocho' };
  scene.add(trough);
  pickables.push(trough);
  nav.blockRect(-13.8, -1.25, -13.2, 0.25, PLAYER_R);

  // Silo do alimentador automático (aparece quando a melhoria é comprada)
  feeder = M.makeFeeder();
  feeder.position.set(-13.55, 0, -2.0);
  feeder.visible = false;
  scene.add(feeder);
  nav.blockCircle(-13.55, -2.0, 0.4 + PLAYER_R);
}

function buildNature() {
  const put = (obj, x, z, ry = Math.random() * Math.PI * 2) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    scene.add(obj);
    return obj;
  };
  // Árvores altas só no fundo e à esquerda (não escondem o personagem)
  for (let x = -24; x <= 26; x += rand(1.6, 2.6)) put(M.makeTree(Math.random() < 0.55 ? 'pine' : 'round', rand(0.9, 1.35)), x, rand(-13.2, -11.4));
  for (let x = -22; x <= 26; x += rand(2.2, 3.4)) put(M.makeTree(Math.random() < 0.5 ? 'pine' : 'round', rand(1.0, 1.5)), x, rand(-16.5, -14.5));
  for (let z = -10; z <= 4; z += rand(1.6, 2.4)) put(M.makeTree(Math.random() < 0.6 ? 'pine' : 'round', rand(0.9, 1.3)), rand(-17.8, -16.2), z);
  put(M.makeTree('apple', 1.1), -13.3, -8.6);
  put(M.makeTree('apple', 1.0), 9.8, -9.2);
  nav.blockCircle(-13.3, -8.6, 0.35 + PLAYER_R);
  nav.blockCircle(9.8, -9.2, 0.35 + PLAYER_R);

  // Arbustos, pedras e flores nas bordas da frente e da direita
  for (let x = -16; x <= 20; x += rand(1.2, 2.2)) put(M.makeBush(rand(0.8, 1.2)), x, rand(15.3, 16.1));
  for (let z = -9; z <= 15; z += rand(1.2, 2.2)) put(M.makeBush(rand(0.8, 1.2)), rand(19.3, 20.1), z);
  for (let z = 5; z <= 15; z += rand(1.4, 2)) put(M.makeBush(rand(0.8, 1.1)), rand(-16.2, -15.6), z);
  const flowerColors = [0xff6f91, 0xffffff, 0xffd54f, 0xba68c8, 0xff8a65, 0x64b5f6];
  const inField = (x, z) => FIELDS.some((f) => { const q = fieldRect(f, 0.5); return x > q.x1 && x < q.x2 && z > q.z1 && z < q.z2; });
  const blocked = (x, z) =>
    inField(x, z) ||
    (x > 3.8 && x < 10.9 && z > -2.1 && z < 0.1) ||
    (x > -1.1 && x < 1.1 && z > 2.7 && z < 9.2) ||
    (x > 3.8 && x < 10.9 && z > 9.7 && z < 11.9) ||
    (x > PEN.x1 - 0.5 && x < PEN.x2 + 0.5 && z > PEN.z1 - 0.5 && z < PEN.z2 + 0.5) ||
    (z < -3.8 && z > -10.5 && x > -12 && x < 9) ||
    Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.6 ||
    (z > -1.2 && z < 0.8 && x > -8 && x < -4);
  for (let k = 0; k < 150; k++) {
    const x = rand(BOUNDS.minX, BOUNDS.maxX), z = rand(BOUNDS.minZ, BOUNDS.maxZ + 0.5);
    if (blocked(x, z)) continue;
    const r = Math.random();
    if (r < 0.6) put(M.makeFlower(flowerColors[k % flowerColors.length]), x, z);
    else if (r < 0.85) put(M.makeGrassTuft(), x, z);
    else put(M.makeRock(rand(0.5, 1)), x, z);
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

// ================= Câmera =================
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  const a = w / h;
  // Em tela vertical (celular), garante uma largura de visão confortável
  const vh = a >= 1 ? zoom : (zoom * 0.8) / a;
  camera.left = (-vh * a) / 2;
  camera.right = (vh * a) / 2;
  camera.top = vh / 2;
  camera.bottom = -vh / 2;
  camera.updateProjectionMatrix();
}

export function zoomBy(f) {
  zoom = THREE.MathUtils.clamp(zoom * f, 7, 24);
  resize();
}

function updateCamera(dt) {
  camTarget.lerp(player.pos, 1 - Math.exp(-6 * dt));
  camera.position.copy(camTarget).add(ISO);
  camera.lookAt(camTarget);
}

// ================= Céu, luz e chuva =================
const C_DAY = new THREE.Color(0xa7dcff);
const C_DUSK = new THREE.Color(0xffb27a);
const C_NIGHT = new THREE.Color(0x16203f);
const C_RAIN = new THREE.Color(0x8d9fb0);
const C_MOON = new THREE.Color(0x6070a0);
const tmpColor = new THREE.Color();

function updateSky(dt) {
  const S = core.S;
  const d = core.darkness();
  const h = core.dayHours();
  const raining = S.weather === 'chuva';

  tmpColor.copy(C_DAY).lerp(C_NIGHT, d);
  const dusk = d > 0 && d < 1 ? 1 - Math.abs(d - 0.5) * 2 : 0;
  tmpColor.lerp(C_DUSK, dusk * 0.55);
  if (raining) tmpColor.lerp(C_RAIN, 0.65 * (1 - d));
  scene.background.lerp(tmpColor, 1 - Math.exp(-3 * dt));

  // O sol atravessa o céu entre 6h e 19h, mudando a direção das sombras
  const a = THREE.MathUtils.clamp((h - 6) / 13, 0, 1) * Math.PI;
  sun.position.set(camTarget.x + Math.cos(a) * 12, camTarget.y + 3 + Math.sin(a) * 16, camTarget.z + 8);
  sun.target.position.copy(camTarget);
  sun.intensity = (1 - d) * (raining ? 1.0 : 2.4);
  sun.color.setHSL(0.1, 0.6, 0.85 - dusk * 0.15);
  moon.intensity = d * 0.8;
  hemi.intensity = 0.5 + (1 - d) * (raining ? 0.6 : 0.8);
  hemi.color.copy(C_DAY).lerp(C_MOON, d);

  for (const l of lamps) l.intensity = d * 14;
  for (const m of glowMats) m.emissiveIntensity = d * 1.3;

  // Chuva
  const target = raining ? 0.55 : 0;
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

const CROP_COLOR = { trigo: 0xf3d77a, cenoura: 0xf07c22, tomate: 0xe0372d, milho: 0xf5d23f, morango: 0xe8264a, berinjela: 0x5b2a86, abobora: 0xf08a24, girassol: 0xffcf1f };

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
    const v = fieldVis[f.id];
    if (!v) continue;
    const owned = core.fieldOwned(f.id);
    if (v.owned === owned) continue;
    const justBought = owned && v.owned === false;
    v.owned = owned;
    v.group.visible = !owned;
    const k = pickables.indexOf(v.proxy);
    if (owned && k >= 0) pickables.splice(k, 1);
    if (!owned && k < 0) pickables.push(v.proxy);
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
    const cropKey = stage >= 0 ? p.crop + stage : '';
    if (v.cropKey !== cropKey) {
      if (v.crop) v.group.remove(v.crop);
      v.crop = null;
      v.cropKey = cropKey;
      if (cropKey) {
        v.crop = M.makeCrop(p.crop, stage);
        v.crop.position.y = v.top;
        v.crop.rotation.y = ((i * 7) % 4) * (Math.PI / 2);
        v.cropH = M.cropHeight(p.crop) * (stage === 3 ? 1 : 0.4 + stage * 0.25);
        v.pop = 0;
        v.group.add(v.crop);
      }
    }

    const ready = core.isReady(p);
    const thirsty = p.s === 'planted' && !ready && !wet;
    const buyable = p.s === 'locked' && core.isBuyable(i);
    const indKey = ready ? '✨' : thirsty ? '💧' : buyable ? '🪙' : '';
    if (v.indKey !== indKey) {
      if (v.ind) v.group.remove(v.ind);
      v.ind = null;
      v.indKey = indKey;
      if (indKey) {
        v.ind = M.emojiSprite(indKey, indKey === '✨' ? 0.5 : indKey === '🪙' ? 0.3 : 0.42, indKey === '💧');
        v.group.add(v.ind);
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
        v.crop.scale.setScalar(Math.max(0.01, s));
      }
      v.crop.rotation.z = Math.sin(clock * 1.6 + i) * 0.03;
    }
    if (v.ind) {
      const base = v.indKey === '🪙' ? 0.4 : v.top + Math.max(0.5, v.cropH) + 0.25;
      v.ind.position.y = base + Math.sin(clock * 3 + i) * 0.06;
    }
  }
}

// ================= Animais =================
function randomPenPoint() {
  for (let k = 0; k < 20; k++) {
    const x = rand(PEN.x1 + 0.6, PEN.x2 - 0.6);
    const z = rand(PEN.z1 + 0.6, PEN.z2 - 0.6);
    if (x < -12.6 && z > -2.7 && z < 0.8) continue; // longe do cocho e do silo
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3((PEN.x1 + PEN.x2) / 2, 0, (PEN.z1 + PEN.z2) / 2);
}

const ANIMAL_H = { galinha: 0.7, ovelha: 1.05, vaca: 1.3, porco: 0.85 };
const ANIMAL_SPEED = { galinha: 1.0, ovelha: 0.6, vaca: 0.5, porco: 0.65 };

function syncAnimals() {
  const S = core.S;
  feeder.visible = S.up.alimentador > 0;
  const ids = new Set();
  for (const a of S.animals) {
    ids.add(a.id);
    if (animalVis.has(a.id)) continue;
    const m = M.makeAnimal(a.type);
    const pos = randomPenPoint();
    m.root.position.copy(pos);
    m.root.userData.pick = { kind: 'animal', id: a.id };
    scene.add(m.root);
    pickables.push(m.root);
    animalVis.set(a.id, { id: a.id, type: a.type, m, pos, target: randomPenPoint(), wait: rand(0, 2), heading: rand(0, 6.28), phase: 0, ind: null, indKey: '' });
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
    let moving = false;
    if (v.wait > 0) {
      v.wait -= dt;
    } else {
      const dx = v.target.x - v.pos.x, dz = v.target.z - v.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        v.wait = rand(1.5, 5);
        v.target = randomPenPoint();
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
    if (moving) v.phase += dt * (v.type === 'galinha' ? 16 : 9);
    const swing = moving ? Math.sin(v.phase) * 0.55 : 0;
    m.legs.forEach((leg, k) => {
      const opposite = m.legs.length === 2 ? k === 1 : k === 1 || k === 2;
      leg.rotation.x += ((opposite ? -swing : swing) - leg.rotation.x) * Math.min(1, dt * 12);
    });
    m.body.position.y = moving ? Math.abs(Math.sin(v.phase)) * 0.03 : 0;
    // Cabeça: bica o chão (galinha) ou pasta quando parado
    const graze = !moving && a.fed ? Math.max(0, Math.sin(clock * (v.type === 'galinha' ? 4 : 1.2) + v.id)) * (v.type === 'galinha' ? 0.7 : 0.35) : 0;
    m.head.rotation.x += (graze - m.head.rotation.x) * Math.min(1, dt * 8);

    const indKey = a.ready ? PRODUCTS[ANIMALS[a.type].product].icon : !a.fed ? '🌾' : '';
    if (v.indKey !== indKey) {
      if (v.ind) scene.remove(v.ind);
      v.ind = indKey ? M.emojiSprite(indKey, 0.45) : null;
      if (v.ind) scene.add(v.ind);
      v.indKey = indKey;
    }
    if (v.ind) v.ind.position.set(v.pos.x, ANIMAL_H[v.type] + 0.3 + Math.sin(clock * 3 + v.id) * 0.06, v.pos.z);
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
  else if (job.kind === 'spot') openSpot(job.key);
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
  if (key === 'casa') {
    if (core.sleep()) {
      ui.sleepFade();
      ui.markDirty('panel');
    }
    return;
  }
  if (key.startsWith('campo:')) {
    ui.openPanel('loja', 'campos');
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
  let best = null;
  let bd = 1.25;
  for (const v of animalVis.values()) {
    const d = dist2(player.pos, v.pos.x, v.pos.z);
    if (d < bd) { bd = d; best = { kind: 'animal', id: v.id }; }
  }
  if (best) return best;
  for (const [key, s] of Object.entries(SPOTS)) {
    if (spotActive(s) && dist2(player.pos, s.point[0], s.point[1]) < s.r) return { kind: 'spot', key };
  }
  const fx = player.pos.x + Math.sin(player.heading) * 0.7;
  const fz = player.pos.z + Math.cos(player.heading) * 0.7;
  let i = tileAt(fx, fz);
  if (i < 0) i = tileAt(player.pos.x, player.pos.z);
  if (i >= 0 && dist2(player.pos, tilePos(i).x, tilePos(i).z) < 1.3) return { kind: 'tile', i };
  return null;
}

function actionLabel(ctx) {
  if (!ctx) return null;
  if (ctx.kind === 'tile') return core.tileActionLabel(ctx.i);
  if (ctx.kind === 'animal') { const a = core.findAnimal(ctx.id); return a ? core.animalActionLabel(a) : null; }
  if (ctx.kind === 'spot') {
    if (ctx.key === 'casa') return core.dayHours() >= 18 ? SPOTS.casa.text : null;
    return SPOTS[ctx.key].text;
  }
  return null;
}

function infoText(ctx) {
  if (!ctx) return null;
  if (ctx.kind === 'tile') return core.plotInfo(ctx.i);
  if (ctx.kind === 'animal') { const a = core.findAnimal(ctx.id); return a ? core.animalInfo(a) : null; }
  if (ctx.kind === 'spot') return SPOTS[ctx.key].info;
  return null;
}

function keyAction(repeat) {
  if (player.busy > 0) return;
  const ctx = getContext();
  if (!ctx) return;
  cancelJobs();
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
  if (joy.id !== null && joy.moved) {
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy;
    const mag = Math.min(1, Math.hypot(dx, dy) / JOY_RADIUS);
    if (mag * JOY_RADIUS > JOY_DEAD) {
      ix = dx + dy;
      iz = dy - dx;
      speed = mag > 0.85 ? RUN : WALK * Math.max(0.35, mag / 0.85);
      player.running = mag > 0.85;
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
    if (ctx && ctx.kind === 'tile' && ctx.i !== lastKeyTile) keyAction(true);
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
  m.armL.rotation.x += (-swing * 0.8 - m.armL.rotation.x) * ease;
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
  m.armR.rotation.x += (armR - m.armR.rotation.x) * Math.min(1, dt * 25);
  m.body.rotation.x = lean;
}

// ================= Funcionários (NPCs) =================
const NPC_STYLE = {
  colhedor: { colors: { shirt: 0x43a047, denim: 0x6d4c41, hat: 0xd4a84f, band: 0x2e7d32, skin: 0xc68642 }, tool: 'mao', home: [1.7, -5.8] },
  plantador: { colors: { shirt: 0xf9a825, denim: 0x455a64, hat: 0xf3e5c0, band: 0x8e24aa, skin: 0xf1c27d, hair: 0x2b1d14 }, tool: 'seed', home: [3.7, -5.8] },
  tratador: { colors: { shirt: 0x1e88e5, denim: 0x795548, hat: 0x8d6e63, band: 0x4e342e, skin: 0x8d5524, hair: 0x1b1b1b }, tool: 'mao', home: [-6.9, -2.0] },
};
const NPC_SPEED = 2.6;
const npcs = new Map();
let seedWarned = false;

function syncWorkers() {
  const S = core.S;
  for (const id of Object.keys(WORKERS)) {
    const hired = S.workers[id];
    if (hired && !npcs.has(id)) {
      const m = M.makeFarmer(NPC_STYLE[id].colors);
      const pos = new THREE.Vector3(SPOTS.celeiro.point[0], 0, SPOTS.celeiro.point[1]); // sai do celeiro
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
  const [hx, hz] = NPC_STYLE[n.id].home;
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

// ================= Entrada (teclado, mouse e toque) =================
function pick() {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.pick) o = o.parent;
    if (o) return o.userData.pick;
  }
  const pt = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(pickPlane, pt)) return null;
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
  setNdc(e);
  const hit = pick();
  if (!hit) return null;
  cancelJobs();
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
    if (e.pointerType === 'touch') {
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
    if (!dragging) return;
    const hit = pick();
    if (hit && hit.kind === 'tile' && hit.i !== lastDragTile) {
      lastDragTile = hit.i;
      if (!queued(hit.i) && player.queue.length < 48) player.queue.push({ kind: 'tile', i: hit.i, quiet: true });
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId === joy.id) endJoystick(e, true);
    dragging = false;
  });
  canvas.addEventListener('pointercancel', (e) => {
    if (e.pointerId === joy.id) endJoystick(e, false);
    dragging = false;
  });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') mouseIn = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (ui.uiBlocking() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    if (k === ' ' || k === 'e') {
      if (!e.repeat) keyAction(false);
    } else if (k >= '1' && k <= '9') {
      ui.selectToolByIndex(+k - 1);
    } else if (k === '+' || k === '=') zoomBy(1 / 1.15);
    else if (k === '-') zoomBy(1.15);
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
  else if (target.player) { v.copy(player.pos); v.y = 1.7; }
  else return null;
  v.project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}

/** Recomeço do jogo: limpa animais, tarefas e volta o personagem ao início. */
export function onReset() {
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
  syncAnimals();
  syncWorkers();
  updatePlayer(dt);
  updateAnimals(dt);
  updateWorkers(dt);
  animatePlots();
  updateCamera(dt);
  updateSky(dt);
  updateParticles(dt);
  updateHelpers(dt);
  renderer.render(scene, camera);
}

// Usado pelos testes no console do navegador
export const debug = { player, animalVis, npcs, get zoom() { return zoom; }, tileAt, tilePos, get nav() { return nav; } };
