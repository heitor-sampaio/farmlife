/* FarmLife — modelos 3D low-poly feitos com formas geométricas */
import * as THREE from 'three';

// ================= Materiais e geometrias compartilhados =================
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...opts }));
  }
  return matCache.get(key);
}

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ball: new THREE.SphereGeometry(1, 8, 6),
  ballHi: new THREE.SphereGeometry(1, 12, 8),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  rock: new THREE.IcosahedronGeometry(1, 0),
};

function mesh(geo, color, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? mat(color) : color);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
/** Caixa: tamanho total w×h×d, centro em (x, y, z). */
export const box = (w, h, d, c, x = 0, y = 0, z = 0) => mesh(GEO.box, c, w, h, d, x, y, z);
/** Elipsoide: raios rx, ry, rz. */
export const ball = (rx, ry, rz, c, x = 0, y = 0, z = 0) => mesh(GEO.ball, c, rx, ry, rz, x, y, z);
/** Cilindro: raio r, altura h (centrado). */
export const cyl = (r, h, c, x = 0, y = 0, z = 0) => mesh(GEO.cyl, c, r, h, r, x, y, z);
/** Cone: raio r, altura h (centrado, ponta para cima). */
export const cone = (r, h, c, x = 0, y = 0, z = 0) => mesh(GEO.cone, c, r, h, r, x, y, z);

function rot(m, x = 0, y = 0, z = 0) { m.rotation.set(x, y, z); return m; }

/** Telhado de duas águas (prisma triangular) com cumeeira ao longo de z. */
function gableRoof(width, height, depth, capColor, roofColor) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, [mat(capColor), mat(roofColor)]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ================= Texturas de canvas =================
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const soilTexture = canvasTexture(128, 128, (g, w, h) => {
  g.fillStyle = '#a5714a';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = '#86562f';
    g.fillRect(0, y + 22, w, 10);
    g.fillStyle = '#b8845a';
    g.fillRect(0, y + 4, w, 6);
  }
  for (let k = 0; k < 160; k++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(60,35,15,.35)' : 'rgba(255,230,190,.18)';
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
});
soilTexture.magFilter = THREE.NearestFilter;

const stripeTexture = canvasTexture(128, 32, (g, w, h) => {
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? '#fff6e8' : '#d9473b';
    g.fillRect((k * w) / 8, 0, w / 8, h);
  }
});

function drawRoundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/** Placa de texto que sempre olha para a câmera. */
export function textSprite(text, height = 0.5) {
  const fs = 56;
  const font = `600 ${fs}px Fredoka, system-ui, ${EMOJI_FONT}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 48;
  const h = fs + 32;
  const tex = canvasTexture(w, h, (g) => {
    g.fillStyle = 'rgba(70, 45, 22, .85)';
    drawRoundRect(g, 2, 2, w - 4, h - 4, 22);
    g.fill();
    g.font = font;
    g.fillStyle = '#fff8e6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 3);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set((height * w) / h, height, 1);
  sp.renderOrder = 10;
  return sp;
}

const emojiCache = new Map();
/** Ícone (emoji) com balão branco, usado como indicador sobre plantas e animais. */
export function emojiSprite(emoji, size = 0.45, bubble = true) {
  const key = emoji + bubble;
  let tex = emojiCache.get(key);
  if (!tex) {
    tex = canvasTexture(128, 128, (g) => {
      if (bubble) {
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.beginPath(); g.arc(64, 68, 54, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fffdf6';
        g.beginPath(); g.arc(64, 62, 54, 0, Math.PI * 2); g.fill();
      }
      g.font = `${bubble ? 64 : 96}px ${EMOJI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(emoji, 64, bubble ? 66 : 70);
    });
    emojiCache.set(key, tex);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(size, size, 1);
  sp.renderOrder = 11;
  return sp;
}

// ================= Plantas =================
const C = {
  leaf: 0x5fb043, leafDark: 0x3f8a2c, stem: 0x6f9a2c, wheat: 0xe9c75f, wheatHead: 0xf3d77a, wheatGreen: 0xb1c95a,
  carrot: 0xf07c22, tomato: 0xe0372d, unripe: 0x9ccc65, corn: 0xf5d23f, husk: 0xa5d06b, berry: 0xe8264a,
  flower: 0xfffdf0, eggplant: 0x5b2a86, lilac: 0xb39ddb, pumpkin: 0xf08a24, pumpkinGreen: 0x8bc34a,
  petal: 0xffcf1f, disk: 0x5d4037, stake: 0x9b6a3a,
};

const GRID3 = [];
for (const x of [-0.28, 0, 0.28]) for (const z of [-0.28, 0, 0.28]) GRID3.push([x + (z * 0.15), z]);
const GRID2 = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
const CENTER = [[0, 0]];

function sprout(g, x, z, k = 1) {
  g.add(cyl(0.012 * k, 0.1 * k, C.stem, x, 0.05 * k, z));
  g.add(rot(ball(0.06 * k, 0.018 * k, 0.035 * k, C.leaf, x + 0.045 * k, 0.1 * k, z), 0, 0, 0.45));
  g.add(rot(ball(0.06 * k, 0.018 * k, 0.035 * k, C.leaf, x - 0.045 * k, 0.1 * k, z), 0, 0, -0.45));
}

function blades(g, x, z, h, color, n = 3) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    g.add(rot(cone(0.025, h, color, x + Math.cos(a) * 0.03, h / 2, z + Math.sin(a) * 0.03), Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35));
  }
}

const CROP_MODELS = {
  trigo: {
    spots: GRID3, height: 0.7, sprout: 0.8,
    build(g, s) {
      const h = [0, 0.22, 0.42, 0.52][s];
      for (const [x, z] of this.spots) {
        if (s === 1) { blades(g, x, z, h, C.leaf, 2); continue; }
        g.add(cyl(0.014, h, s === 3 ? C.wheat : C.wheatGreen, x, h / 2, z));
        g.add(ball(0.04, 0.1, 0.04, s === 3 ? C.wheatHead : C.wheatGreen, x, h + 0.07, z));
        g.add(rot(cone(0.02, 0.2, s === 3 ? C.wheat : C.leaf, x + 0.04, h * 0.45, z), 0, 0, -0.6));
      }
    },
  },
  cenoura: {
    spots: GRID2, height: 0.45,
    build(g, s) {
      const k = [0, 0.6, 0.9, 1][s];
      for (const [x, z] of this.spots) {
        blades(g, x, z, 0.24 * k, C.leaf, 4);
        if (s === 3) g.add(rot(cone(0.075, 0.22, C.carrot, x, 0.02, z), Math.PI, 0, 0));
        if (s === 2) g.add(rot(cone(0.045, 0.12, C.carrot, x, 0.0, z), Math.PI, 0, 0));
      }
    },
  },
  tomate: {
    spots: CENTER, height: 0.85,
    build(g, s) {
      const k = [0, 0.55, 0.85, 1][s];
      if (s >= 2) g.add(cyl(0.018, 0.8 * k, C.stake, 0.1, 0.4 * k, -0.08));
      g.add(ball(0.22 * k, 0.26 * k, 0.22 * k, C.leafDark, 0, 0.3 * k, 0));
      g.add(ball(0.16 * k, 0.18 * k, 0.16 * k, C.leaf, 0.06, 0.5 * k, 0.05));
      g.add(ball(0.14 * k, 0.15 * k, 0.14 * k, C.leaf, -0.1, 0.42 * k, -0.06));
      if (s >= 2) {
        const fruits = [[0.17, 0.3, 0.1], [-0.12, 0.25, 0.17], [0.05, 0.5, 0.16], [-0.18, 0.42, -0.04], [0.14, 0.45, -0.12]];
        for (const [x, y, z] of fruits.slice(0, s === 3 ? 5 : 3)) {
          g.add(ball(s === 3 ? 0.075 : 0.05, s === 3 ? 0.07 : 0.05, s === 3 ? 0.075 : 0.05, s === 3 ? C.tomato : C.unripe, x * k, y * k, z * k));
        }
      }
    },
  },
  milho: {
    spots: GRID2, height: 1.2,
    build(g, s) {
      const h = [0, 0.3, 0.75, 1.0][s];
      for (const [x, z] of this.spots) {
        g.add(cyl(0.025, h, C.stem, x, h / 2, z));
        g.add(rot(cone(0.035, h * 0.5, C.leaf, x + 0.07, h * 0.45, z), 0, 0, -0.9));
        g.add(rot(cone(0.035, h * 0.5, C.leafDark, x - 0.07, h * 0.6, z), 0, 0, 0.9));
        if (s >= 2) {
          const cob = s === 3 ? C.corn : C.unripe;
          g.add(rot(cyl(0.045, 0.2, cob, x + 0.06, h * 0.62, z + 0.02), 0, 0, -0.35));
          g.add(rot(cone(0.05, 0.12, C.husk, x + 0.03, h * 0.62 - 0.12, z + 0.02), Math.PI, 0, -0.35));
        }
        if (s === 3) g.add(cone(0.03, 0.14, C.wheat, x, h + 0.06, z));
      }
    },
  },
  morango: {
    spots: GRID2, height: 0.4,
    build(g, s) {
      const k = [0, 0.6, 0.85, 1][s];
      for (const [x, z] of this.spots) {
        g.add(ball(0.13 * k, 0.07 * k, 0.13 * k, C.leafDark, x, 0.07 * k, z));
        g.add(ball(0.09 * k, 0.06 * k, 0.09 * k, C.leaf, x + 0.04, 0.12 * k, z - 0.03));
        if (s === 2) g.add(ball(0.025, 0.02, 0.025, C.flower, x - 0.05, 0.15, z + 0.05));
        if (s === 3) {
          g.add(rot(cone(0.04, 0.08, C.berry, x + 0.1, 0.06, z + 0.06), Math.PI, 0, 0));
          g.add(rot(cone(0.035, 0.07, C.berry, x - 0.08, 0.05, z + 0.09), Math.PI, 0, 0));
        }
      }
    },
  },
  berinjela: {
    spots: CENTER, height: 0.8,
    build(g, s) {
      const k = [0, 0.55, 0.85, 1][s];
      g.add(ball(0.24 * k, 0.24 * k, 0.24 * k, C.leafDark, 0, 0.3 * k, 0));
      g.add(ball(0.17 * k, 0.17 * k, 0.17 * k, C.leaf, 0.08, 0.48 * k, 0.04));
      if (s === 2) for (const [x, z] of [[0.18, 0.12], [-0.15, 0.16], [0.02, -0.2]]) g.add(ball(0.03, 0.03, 0.03, C.lilac, x, 0.38, z));
      if (s === 3) {
        for (const [x, z, r] of [[0.2, 0.14, 0.3], [-0.16, 0.18, -0.3], [0.05, 0.24, 0.1]]) {
          g.add(rot(ball(0.065, 0.14, 0.065, C.eggplant, x, 0.2, z), 0, 0, r));
          g.add(cone(0.05, 0.06, C.leafDark, x - r * 0.12, 0.34, z));
        }
      }
    },
  },
  abobora: {
    spots: CENTER, height: 0.6,
    build(g, s) {
      const k = [0, 0.6, 0.85, 1][s];
      for (const [x, z] of [[0.25, 0.1], [-0.22, 0.15], [0.05, -0.27], [-0.15, -0.2]]) {
        g.add(ball(0.17 * k, 0.04, 0.15 * k, C.leaf, x * k, 0.06, z * k));
      }
      if (s === 2) g.add(mesh(GEO.ballHi, C.pumpkinGreen, 0.14, 0.1, 0.14, 0, 0.1, 0.05));
      if (s === 3) {
        g.add(mesh(GEO.ballHi, C.pumpkin, 0.32, 0.23, 0.32, 0, 0.22, 0.04));
        g.add(rot(cyl(0.03, 0.12, C.stem, 0.02, 0.48, 0.04), 0, 0, -0.3));
      }
    },
  },
  girassol: {
    spots: CENTER, height: 1.6, sprout: 1.2,
    build(g, s) {
      const h = [0, 0.35, 0.9, 1.25][s];
      g.add(cyl(0.035, h, C.stem, 0, h / 2, 0));
      g.add(rot(ball(0.16, 0.03, 0.08, C.leaf, 0.12, h * 0.4, 0), 0, 0, -0.4));
      g.add(rot(ball(0.16, 0.03, 0.08, C.leafDark, -0.12, h * 0.6, 0), 0, 0, 0.4));
      if (s === 2) g.add(ball(0.08, 0.08, 0.08, C.leafDark, 0, h + 0.05, 0));
      if (s === 3) {
        const head = new THREE.Group();
        head.add(rot(mesh(new THREE.CylinderGeometry(1, 1, 1, 12), C.petal, 0.3, 0.03, 0.3, 0, 0, 0), 0, 0, 0));
        head.add(cyl(0.15, 0.06, C.disk, 0, 0.02, 0));
        head.position.set(0, h + 0.05, 0);
        head.rotation.order = 'YXZ';
        head.rotation.set(Math.PI / 2 - 0.4, Math.PI / 4, 0);
        g.add(head);
      }
    },
  },
};

export const cropHeight = (id) => CROP_MODELS[id].height;

export function makeCrop(id, stage) {
  const def = CROP_MODELS[id];
  const g = new THREE.Group();
  if (stage === 0) for (const [x, z] of def.spots) sprout(g, x, z, def.sprout || 1);
  else def.build(g, stage);
  return g;
}

// ================= Fazendeiro =================
export function makeFarmer(colors = {}) {
  const {
    skin = 0xf1c27d, shirt = 0xd9534f, denim = 0x3d5a9e, boot = 0x5a3a22,
    hat = 0xe7c66a, band = 0xb23a2e, hair = 0x6b4423,
  } = colors;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const leg = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.4, 0);
    p.add(box(0.13, 0.32, 0.15, denim, 0, -0.16, 0));
    p.add(box(0.14, 0.09, 0.2, boot, 0, -0.355, 0.025));
    body.add(p);
    return p;
  };
  const legL = leg(-0.085);
  const legR = leg(0.085);

  body.add(box(0.37, 0.12, 0.23, denim, 0, 0.44, 0));
  body.add(box(0.36, 0.3, 0.22, shirt, 0, 0.64, 0));
  body.add(box(0.27, 0.2, 0.02, denim, 0, 0.56, 0.115));
  body.add(box(0.05, 0.16, 0.02, denim, -0.1, 0.71, 0.115));
  body.add(box(0.05, 0.16, 0.02, denim, 0.1, 0.71, 0.115));
  body.add(box(0.03, 0.03, 0.02, 0xf5d76e, -0.1, 0.65, 0.128));
  body.add(box(0.03, 0.03, 0.02, 0xf5d76e, 0.1, 0.65, 0.128));

  const arm = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.76, 0);
    p.add(box(0.1, 0.3, 0.12, shirt, 0, -0.14, 0));
    p.add(ball(0.055, 0.055, 0.055, skin, 0, -0.33, 0));
    body.add(p);
    return p;
  };
  const armL = arm(-0.235);
  const armR = arm(0.235);

  const head = new THREE.Group();
  head.position.set(0, 0.93, 0);
  head.add(box(0.28, 0.27, 0.26, skin, 0, 0, 0));
  head.add(box(0.04, 0.05, 0.02, 0x2b1d14, -0.065, 0.02, 0.131));
  head.add(box(0.04, 0.05, 0.02, 0x2b1d14, 0.065, 0.02, 0.131));
  head.add(box(0.05, 0.05, 0.04, 0xe2a76f, 0, -0.03, 0.14));
  head.add(box(0.29, 0.13, 0.05, hair, 0, 0.04, -0.12));
  head.add(cyl(0.28, 0.03, hat, 0, 0.15, 0));
  head.add(cyl(0.16, 0.14, hat, 0, 0.22, 0));
  head.add(cyl(0.165, 0.035, band, 0, 0.17, 0));
  body.add(head);

  // Ferramentas na mão direita
  const hand = new THREE.Group();
  hand.position.set(0, -0.33, 0);
  armR.add(hand);
  const tools = {};

  tools.enxada = new THREE.Group();
  tools.enxada.add(cyl(0.02, 0.62, 0x9b6a3a, 0, -0.2, 0));
  tools.enxada.add(box(0.14, 0.03, 0.16, 0x9aa3ad, 0, -0.5, 0.07));

  tools.regador = new THREE.Group();
  tools.regador.add(cyl(0.085, 0.15, 0x4caf50, 0, -0.1, 0.03));
  tools.regador.add(rot(cyl(0.016, 0.2, 0x4caf50, 0, -0.08, 0.17), 1.0, 0, 0));
  tools.regador.add(box(0.03, 0.08, 0.1, 0x388e3c, 0, 0.0, 0.0));

  tools.mao = new THREE.Group();
  tools.mao.add(cyl(0.1, 0.1, 0xb98a4b, 0, -0.1, 0.03));
  tools.mao.add(box(0.02, 0.12, 0.02, 0x8d6334, 0, 0, 0.03));

  tools.seed = new THREE.Group();
  tools.seed.add(ball(0.08, 0.1, 0.07, 0xe8d5a5, 0, -0.1, 0.03));
  tools.seed.add(box(0.06, 0.03, 0.06, 0xa0703c, 0, -0.01, 0.03));

  // Machado: cabo de madeira com a lâmina na ponta
  tools.machado = new THREE.Group();
  tools.machado.add(cyl(0.022, 0.62, 0x8d6334, 0, -0.22, 0.02));
  tools.machado.add(box(0.03, 0.16, 0.2, 0x9aa3ad, 0, -0.48, 0.1));
  tools.machado.add(box(0.032, 0.17, 0.04, 0xd5dbe0, 0, -0.48, 0.2));

  // Vara de pesca: sai da mão para frente e para cima; rodTip marca a ponta (de onde sai a linha)
  tools.vara = new THREE.Group();
  const rodPivot = new THREE.Group();
  rodPivot.rotation.x = 0.95;
  rodPivot.add(cyl(0.016, 1.4, 0x8d6334, 0, 0.6, 0));
  rodPivot.add(cyl(0.022, 0.25, 0x3e2723, 0, -0.05, 0));
  rodPivot.add(rot(cyl(0.05, 0.04, 0x9aa3ad, 0.06, 0.12, 0), 0, 0, Math.PI / 2));
  const rodTip = new THREE.Object3D();
  rodTip.position.set(0, 1.3, 0);
  rodPivot.add(rodTip);
  tools.vara.add(rodPivot);

  for (const t of Object.values(tools)) { t.visible = false; hand.add(t); }

  // Lanterna na mão esquerda (acende à noite)
  const torch = new THREE.Group();
  torch.position.set(0, -0.33, 0.02);
  torch.add(rot(cyl(0.035, 0.2, 0x37474f, 0, 0, 0.06), Math.PI / 2, 0, 0));
  torch.add(rot(cyl(0.05, 0.06, 0x263238, 0, 0, 0.17), Math.PI / 2, 0, 0));
  const lens = rot(cyl(0.042, 0.015, mat(0xfff6c8, { emissive: 0xfff2b0, emissiveIntensity: 2 }), 0, 0, 0.205), Math.PI / 2, 0, 0);
  lens.castShadow = false;
  torch.add(lens);
  torch.visible = false;
  armL.add(torch);

  return { root, body, legL, legR, armL, armR, head, tools, rodTip, torch };
}

// ================= Animais =================
function legPivot(parent, x, y, z, legMesh) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.add(legMesh);
  parent.add(p);
  return p;
}

export function makeAnimal(type) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs = [];
  const head = new THREE.Group();
  body.add(head);

  if (type === 'galinha') {
    const white = 0xfafafa;
    body.add(ball(0.15, 0.14, 0.19, white, 0, 0.24, 0));
    body.add(ball(0.04, 0.09, 0.13, 0xeeeeee, -0.15, 0.25, -0.01));
    body.add(ball(0.04, 0.09, 0.13, 0xeeeeee, 0.15, 0.25, -0.01));
    body.add(rot(cone(0.07, 0.15, white, 0, 0.33, -0.17), -0.7, 0, 0));
    head.position.set(0, 0.38, 0.13);
    head.add(ball(0.085, 0.085, 0.085, white, 0, 0, 0));
    head.add(box(0.025, 0.07, 0.09, 0xe53935, 0, 0.09, 0));
    head.add(rot(cone(0.028, 0.07, 0xffa726, 0, -0.01, 0.1), Math.PI / 2, 0, 0));
    head.add(ball(0.018, 0.03, 0.015, 0xe53935, 0, -0.06, 0.07));
    head.add(box(0.02, 0.02, 0.01, 0x222222, -0.05, 0.02, 0.07));
    head.add(box(0.02, 0.02, 0.01, 0x222222, 0.05, 0.02, 0.07));
    for (const x of [-0.05, 0.05]) {
      const lg = new THREE.Group();
      lg.add(cyl(0.012, 0.12, 0xffa726, 0, -0.06, 0));
      lg.add(box(0.05, 0.01, 0.07, 0xffa726, 0, -0.12, 0.02));
      legs.push(legPivot(body, x, 0.12, 0, lg));
    }
  } else if (type === 'ovelha') {
    const wool = 0xf5f3ea, dark = 0x3a3a3a;
    body.add(ball(0.3, 0.24, 0.38, wool, 0, 0.45, 0));
    for (const [x, y, z] of [[0.15, 0.6, 0.12], [-0.15, 0.6, -0.1], [0, 0.65, -0.05], [0.18, 0.48, -0.2], [-0.2, 0.5, 0.15]]) {
      body.add(ball(0.16, 0.14, 0.16, wool, x, y, z));
    }
    body.add(ball(0.08, 0.08, 0.08, wool, 0, 0.5, -0.38));
    head.position.set(0, 0.56, 0.36);
    head.add(box(0.18, 0.2, 0.22, dark, 0, 0, 0.02));
    head.add(ball(0.11, 0.07, 0.11, wool, 0, 0.12, 0));
    head.add(rot(box(0.12, 0.03, 0.06, dark, 0.13, 0.03, -0.02), 0, 0, -0.4));
    head.add(rot(box(0.12, 0.03, 0.06, dark, -0.13, 0.03, -0.02), 0, 0, 0.4));
    head.add(box(0.03, 0.03, 0.01, 0xffffff, -0.05, 0.03, 0.135));
    head.add(box(0.03, 0.03, 0.01, 0xffffff, 0.05, 0.03, 0.135));
    for (const [x, z] of [[-0.14, 0.18], [0.14, 0.18], [-0.14, -0.18], [0.14, -0.18]]) {
      legs.push(legPivot(body, x, 0.28, z, box(0.07, 0.28, 0.07, dark, 0, -0.14, 0)));
    }
  } else if (type === 'vaca') {
    const white = 0xf7f6f0, black = 0x262626, pink = 0xf2a7a7;
    body.add(box(0.46, 0.4, 0.85, white, 0, 0.62, 0));
    body.add(box(0.475, 0.18, 0.24, black, 0, 0.66, 0.12));
    body.add(box(0.24, 0.03, 0.3, black, 0.09, 0.835, -0.2));
    body.add(box(0.475, 0.14, 0.18, black, 0, 0.56, -0.28));
    body.add(ball(0.11, 0.07, 0.11, pink, 0, 0.4, -0.15));
    body.add(rot(cyl(0.015, 0.36, black, 0, 0.6, -0.45), 0.3, 0, 0));
    head.position.set(0, 0.8, 0.5);
    head.add(box(0.3, 0.3, 0.3, white, 0, 0, 0));
    head.add(box(0.31, 0.12, 0.12, black, 0, 0.1, 0.05));
    head.add(box(0.26, 0.14, 0.08, pink, 0, -0.08, 0.18));
    head.add(rot(cone(0.03, 0.12, 0xf3e5c0, 0.12, 0.2, -0.02), 0, 0, -0.4));
    head.add(rot(cone(0.03, 0.12, 0xf3e5c0, -0.12, 0.2, -0.02), 0, 0, 0.4));
    head.add(box(0.12, 0.05, 0.06, white, 0.2, 0.06, -0.04));
    head.add(box(0.12, 0.05, 0.06, white, -0.2, 0.06, -0.04));
    head.add(box(0.035, 0.035, 0.01, 0x111111, -0.08, 0.03, 0.152));
    head.add(box(0.035, 0.035, 0.01, 0x111111, 0.08, 0.03, 0.152));
    for (const [x, z] of [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]]) {
      const lg = new THREE.Group();
      lg.add(box(0.1, 0.36, 0.1, white, 0, -0.18, 0));
      lg.add(box(0.105, 0.06, 0.105, 0x3b2a1f, 0, -0.39, 0));
      legs.push(legPivot(body, x, 0.42, z, lg));
    }
  } else if (type === 'porco') {
    const pink = 0xf5a3b5, dark = 0xe0849b;
    body.add(ball(0.25, 0.22, 0.36, pink, 0, 0.36, 0));
    body.add(rot(mesh(new THREE.TorusGeometry(0.04, 0.012, 5, 8), pink, 1, 1, 1, 0, 0.42, -0.37), 0, Math.PI / 2, 0));
    head.position.set(0, 0.42, 0.32);
    head.add(ball(0.17, 0.16, 0.15, pink, 0, 0, 0));
    head.add(rot(cyl(0.07, 0.06, dark, 0, -0.02, 0.15), Math.PI / 2, 0, 0));
    head.add(box(0.02, 0.03, 0.01, 0x7a3a4a, -0.025, -0.02, 0.182));
    head.add(box(0.02, 0.03, 0.01, 0x7a3a4a, 0.025, -0.02, 0.182));
    head.add(rot(cone(0.06, 0.1, dark, 0.1, 0.15, -0.02), -0.3, 0, -0.5));
    head.add(rot(cone(0.06, 0.1, dark, -0.1, 0.15, -0.02), -0.3, 0, 0.5));
    head.add(box(0.03, 0.03, 0.01, 0x222222, -0.07, 0.05, 0.14));
    head.add(box(0.03, 0.03, 0.01, 0x222222, 0.07, 0.05, 0.14));
    for (const [x, z] of [[-0.12, 0.18], [0.12, 0.18], [-0.12, -0.18], [0.12, -0.18]]) {
      legs.push(legPivot(body, x, 0.18, z, cyl(0.05, 0.18, dark, 0, -0.09, 0)));
    }
  }
  return { root, body, head, legs };
}

// ================= Construções =================
export function makeBarn() {
  const g = new THREE.Group();
  const red = 0xb5382b, white = 0xf4efe6;
  g.add(box(4, 2.2, 3.4, red, 0, 1.1, 0));
  const roof = gableRoof(4.5, 1.5, 3.8, red, 0x6b2b20);
  roof.position.y = 2.2;
  g.add(roof);
  for (const [x, z] of [[-2, 1.7], [2, 1.7], [-2, -1.7], [2, -1.7]]) g.add(box(0.12, 2.2, 0.12, white, x, 1.1, z));
  g.add(box(1.6, 1.8, 0.06, white, 0, 0.9, 1.71));
  g.add(box(1.4, 1.65, 0.06, 0x8c2a20, 0, 0.83, 1.73));
  g.add(rot(box(0.08, 2.0, 0.03, white, 0, 0.83, 1.77), 0, 0, 0.7));
  g.add(rot(box(0.08, 2.0, 0.03, white, 0, 0.83, 1.77), 0, 0, -0.7));
  g.add(box(0.8, 0.7, 0.06, white, 0, 2.75, 1.91));
  g.add(box(0.65, 0.55, 0.06, 0x4a2f1c, 0, 2.75, 1.93));
  g.add(box(0.6, 0.12, 0.3, 0xe6c35c, 0, 2.55, 1.95));
  const lantern = box(0.14, 0.2, 0.14, mat(0xffd27a, { emissive: 0xffb84d, emissiveIntensity: 0 }), 1.05, 1.95, 1.78);
  g.add(lantern);
  // Fardos de feno ao lado
  g.add(box(0.8, 0.5, 0.5, 0xe0c062, 2.6, 0.25, 1.2));
  g.add(box(0.8, 0.5, 0.5, 0xd4b452, 2.6, 0.75, 1.2));
  g.add(box(0.8, 0.5, 0.5, 0xe0c062, 2.6, 0.25, 0.6));
  return { group: g, lights: [lantern.material] };
}

export function makeShop() {
  const g = new THREE.Group();
  const wood = 0xa0703c, dark = 0x7a5230;
  g.add(box(2.6, 1.7, 0.12, dark, 0, 0.85, -0.55));
  g.add(box(2.4, 0.9, 0.7, wood, 0, 0.45, 0.3));
  g.add(box(2.6, 0.08, 0.85, dark, 0, 0.94, 0.3));
  for (const [x, z] of [[-1.25, 0.65], [1.25, 0.65], [-1.25, -0.55], [1.25, -0.55]]) g.add(cyl(0.06, 2.3, dark, x, 1.15, z));
  const awning = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ map: stripeTexture, flatShading: true, roughness: 0.9 }));
  awning.scale.set(2.9, 0.08, 1.7);
  awning.position.set(0, 2.32, 0.1);
  awning.rotation.x = 0.22;
  awning.castShadow = true;
  g.add(awning);
  // Caixotes com produtos
  const crate = (x, color, n) => {
    g.add(box(0.5, 0.22, 0.4, 0xc49a63, x, 1.09, 0.3));
    for (let k = 0; k < n; k++) g.add(ball(0.08, 0.08, 0.08, color, x - 0.15 + (k % 3) * 0.15, 1.25, 0.22 + Math.floor(k / 3) * 0.15));
  };
  crate(-0.8, 0xe0372d, 6);
  crate(0, 0xf07c22, 6);
  crate(0.8, 0xf5d23f, 6);
  g.add(mesh(GEO.ballHi, 0xf08a24, 0.3, 0.22, 0.3, 1.5, 0.22, 0.9));
  g.add(mesh(GEO.ballHi, 0xf08a24, 0.24, 0.18, 0.24, 1.9, 0.18, 0.6));
  return { group: g, lights: [] };
}

export function makeBoard() {
  const g = new THREE.Group();
  const wood = 0x8b5a2b;
  g.add(cyl(0.06, 1.9, 0x6f4825, -0.75, 0.95, 0));
  g.add(cyl(0.06, 1.9, 0x6f4825, 0.75, 0.95, 0));
  g.add(box(1.7, 1.05, 0.08, wood, 0, 1.25, 0));
  g.add(rot(box(1.95, 0.06, 0.45, 0x6b2b20, 0, 1.9, 0.05), 0.25, 0, 0));
  for (const [x, y, r] of [[-0.5, 1.35, 0.08], [0, 1.2, -0.05], [0.48, 1.38, 0.1], [-0.15, 1.5, 0.03]]) {
    g.add(rot(box(0.34, 0.4, 0.01, 0xfffaf0, x, y, 0.05), 0, 0, r));
    g.add(ball(0.025, 0.025, 0.025, 0xe53935, x, y + 0.17, 0.065));
  }
  return { group: g, lights: [] };
}

export function makeHouse() {
  const g = new THREE.Group();
  const wall = 0xf2e3c6;
  g.add(box(3.6, 2.0, 3.0, wall, 0, 1.0, 0));
  const roof = gableRoof(4.1, 1.4, 3.5, wall, 0x56627a);
  roof.position.y = 2.0;
  g.add(roof);
  g.add(box(3.7, 0.15, 3.1, 0xb59d7a, 0, 0.07, 0));
  g.add(box(0.85, 1.35, 0.06, 0x7a4b2a, 0.6, 0.72, 1.52));
  g.add(ball(0.04, 0.04, 0.04, 0xf5d76e, 0.9, 0.72, 1.57));
  const windowMat = mat(0x9cc4e4, { emissive: 0xffc861, emissiveIntensity: 0 });
  for (const x of [-0.85]) {
    g.add(box(0.75, 0.7, 0.05, 0xffffff, x, 1.2, 1.51));
    g.add(box(0.6, 0.55, 0.06, windowMat, x, 1.2, 1.52));
  }
  g.add(box(0.75, 0.7, 0.05, 0xffffff, 1.81, 1.2, 0));
  const side = box(0.06, 0.55, 0.6, windowMat, 1.82, 1.2, 0);
  g.add(side);
  g.add(box(0.4, 1.1, 0.4, 0x9c4a3a, -1.0, 2.7, -0.6));
  g.add(box(1.4, 0.12, 0.6, 0x9b6a3a, 0.6, 0.06, 1.85));
  // Flores na frente
  for (let k = 0; k < 5; k++) g.add(ball(0.07, 0.07, 0.07, [0xff6f91, 0xffd54f, 0xffffff, 0xba68c8, 0xff8a65][k], -1.6 + k * 0.28, 0.12, 1.75));
  return { group: g, lights: [windowMat] };
}

export function makeTrough() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.35, 1.4, 0x8b5a2b, 0, 0.18, 0));
  g.add(box(0.38, 0.06, 1.25, 0xe0c062, 0, 0.34, 0));
  for (const z of [-0.6, 0.6]) g.add(box(0.56, 0.08, 0.08, 0x6f4825, 0, 0.36, z));
  return g;
}

/** Placa de "À venda" fincada no meio de um campo ainda não comprado. */
export function makeSaleSign() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 1.1, 0x6f4825, -0.4, 0.55, 0));
  g.add(cyl(0.05, 1.1, 0x6f4825, 0.4, 0.55, 0));
  g.add(box(1.1, 0.6, 0.07, 0xc49a63, 0, 0.85, 0));
  g.add(box(0.9, 0.12, 0.02, 0xd9473b, 0, 0.98, 0.045));
  g.add(box(0.5, 0.06, 0.02, 0x6f4825, 0, 0.78, 0.045));
  g.add(box(0.35, 0.06, 0.02, 0x6f4825, 0, 0.68, 0.045));
  return g;
}

/** Estaca de canto que marca os limites de um campo à venda. */
export function makeStake() {
  const g = new THREE.Group();
  g.add(cyl(0.04, 0.5, 0xa57a4a, 0, 0.25, 0));
  g.add(box(0.12, 0.08, 0.02, 0xd9473b, 0, 0.45, 0.04));
  return g;
}

/** Silo do alimentador automático, com calha descendo até o cocho. */
export function makeFeeder() {
  const g = new THREE.Group();
  const metal = 0xb8c4cc, dark = 0x7d8a93;
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) g.add(cyl(0.035, 0.7, dark, x, 0.35, z));
  g.add(cyl(0.34, 1.0, metal, 0, 1.2, 0));
  for (const y of [0.85, 1.2, 1.55]) g.add(cyl(0.345, 0.03, dark, 0, y, 0));
  g.add(cone(0.38, 0.4, 0xb5382b, 0, 1.9, 0));
  g.add(rot(cone(0.2, 0.25, metal, 0, 0.6, 0), Math.PI, 0, 0));
  g.add(rot(cyl(0.05, 0.75, dark, 0, 0.45, 0.42), 0.9, 0, 0));
  g.add(box(0.36, 0.22, 0.02, 0xfffaf0, 0, 1.25, 0.345));
  g.add(ball(0.06, 0.06, 0.02, 0x5cb85c, 0, 1.25, 0.36));
  return g;
}

/** Cerca entre dois pontos (postes + duas travessas). */
export function makeFence(x1, z1, x2, z2) {
  const g = new THREE.Group();
  const len = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(len));
  const wood = 0xc49a63;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    g.add(box(0.12, 0.7, 0.12, 0xa57a4a, x1 + (x2 - x1) * t, 0.35, z1 + (z2 - z1) * t));
  }
  const ang = Math.atan2(x2 - x1, z2 - z1);
  for (const y of [0.25, 0.52]) {
    const rail = box(0.05, 0.08, len, wood, (x1 + x2) / 2, y, (z1 + z2) / 2);
    rail.rotation.y = ang;
    g.add(rail);
  }
  return g;
}

// ================= Natureza =================
export function makeTree(kind, s = 1) {
  const g = new THREE.Group();
  if (kind === 'pine') {
    g.add(cyl(0.15, 0.8, 0x7a5230, 0, 0.4, 0));
    g.add(cone(0.95, 1.3, 0x3f8f46, 0, 1.3, 0));
    g.add(cone(0.72, 1.1, 0x48a04f, 0, 1.95, 0));
    g.add(cone(0.46, 0.9, 0x54ad5a, 0, 2.5, 0));
  } else {
    g.add(cyl(0.15, 1.1, 0x7a5230, 0, 0.55, 0));
    g.add(ball(0.85, 0.75, 0.85, 0x5aa845, 0, 1.65, 0));
    g.add(ball(0.55, 0.5, 0.55, 0x67b852, 0.45, 2.05, 0.2));
    g.add(ball(0.5, 0.45, 0.5, 0x4f9a3d, -0.4, 1.95, -0.25));
    if (kind === 'apple') {
      for (const [x, y, z] of [[0.6, 1.5, 0.5], [-0.5, 1.7, 0.6], [0.2, 1.3, 0.8], [0.8, 1.9, -0.1]]) g.add(ball(0.08, 0.08, 0.08, 0xe53935, x, y, z));
    }
  }
  g.scale.setScalar(s);
  return g;
}

export function makeBush(s = 1) {
  const g = new THREE.Group();
  g.add(ball(0.45, 0.35, 0.45, 0x4f9a3d, 0, 0.3, 0));
  g.add(ball(0.32, 0.28, 0.32, 0x5fae47, 0.3, 0.38, 0.15));
  g.add(ball(0.3, 0.25, 0.3, 0x468a35, -0.28, 0.32, 0.1));
  g.scale.setScalar(s);
  return g;
}

export function makeRock(s = 1) {
  const m = mesh(GEO.rock, 0x9e9e9e, 0.4 * s, 0.28 * s, 0.35 * s, 0, 0.12 * s, 0);
  m.rotation.y = Math.random() * Math.PI;
  return m;
}

export function makeFlower(color) {
  const g = new THREE.Group();
  g.add(cyl(0.012, 0.2, 0x5fae47, 0, 0.1, 0));
  g.add(ball(0.06, 0.04, 0.06, color, 0, 0.21, 0));
  g.add(ball(0.025, 0.025, 0.025, 0xffeb3b, 0, 0.24, 0));
  return g;
}

export function makeGrassTuft() {
  const g = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    g.add(rot(cone(0.025, 0.16, 0x4f9a3d, (k - 1) * 0.04, 0.08, 0), 0, 0, (k - 1) * 0.35));
  }
  return g;
}

// ================= Máquinas agrícolas (verde e amarelo) =================
const MG = 0x367c2b;     // verde
const MY = 0xffd100;     // amarelo
const TIRE = 0x1f1f1f;
const STEEL = 0x8f979e;
const DARK = 0x262626;
const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2 });
const lampMat = () => mat(0xfff2b0, { emissive: 0xfff2b0, emissiveIntensity: 0.5 });
/** Material dos faróis das máquinas (cada máquina ganha uma cópia para acender sozinha). */
export const machineLampMat = lampMat;

/** Roda com pneu de cravos e aro amarelo. Gira pelo grupo `spin` em torno do eixo x. */
function wheel(r, w, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const spin = new THREE.Group();
  g.add(spin);
  const part = (geo, color) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.rotation.z = Math.PI / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    spin.add(m);
  };
  part(new THREE.CylinderGeometry(r, r, w, 16), TIRE);
  part(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 12), MY);
  part(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.05, 8), MG);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const lug = box(w * 1.04, r * 0.12, r * 0.22, TIRE, 0, Math.cos(a) * r, Math.sin(a) * r);
    lug.rotation.x = a;
    spin.add(lug);
  }
  return { g, spin, r };
}

/** Fazendeiro sentado (motorista), escondido até alguém dirigir. */
function makeDriver(y, z) {
  const f = makeFarmer();
  f.legL.rotation.x = -1.45;
  f.legR.rotation.x = -1.45;
  f.armL.rotation.x = -1.0;
  f.armR.rotation.x = -1.0;
  for (const t of Object.values(f.tools)) t.visible = false;
  f.root.position.set(0, y, z);
  f.root.scale.setScalar(0.9);
  f.root.visible = false;
  return f.root;
}

function cabin(g, w, h, d, x, y, z, roofColor = MG) {
  for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    g.add(box(0.05, h, 0.05, DARK, x + px, y, z + pz));
  }
  const glass = new THREE.Mesh(GEO.box, glassMat);
  glass.scale.set(w - 0.04, h - 0.04, d - 0.04);
  glass.position.set(x, y, z);
  g.add(glass);
  g.add(box(w + 0.12, 0.1, d + 0.12, roofColor, x, y + h / 2 + 0.05, z));
  g.add(box(w + 0.14, 0.03, d + 0.14, MY, x, y + h / 2 - 0.01, z));
}

/** Trator base (frente para +z). */
function tractorBody() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(0.5, 0.22, 1.7, DARK, 0, 0.42, 0.05));
  body.add(box(0.56, 0.46, 0.95, MG, 0, 0.74, 0.5));
  for (const x of [-0.285, 0.285]) body.add(box(0.02, 0.06, 0.9, MY, x, 0.88, 0.5));
  body.add(box(0.5, 0.36, 0.03, 0x1b1b1b, 0, 0.72, 0.985));
  for (const x of [-0.17, 0.17]) body.add(box(0.12, 0.08, 0.03, lampMat(), x, 0.86, 0.99));
  body.add(cyl(0.035, 0.55, 0x1b1b1b, 0.17, 1.22, 0.75));
  body.add(box(1.0, 0.22, 0.9, MG, 0, 0.88, -0.38));
  cabin(body, 0.9, 0.78, 0.84, 0, 1.38, -0.38);
  for (const x of [-0.62, 0.62]) body.add(box(0.34, 0.06, 1.05, MG, x, 1.07, -0.45));
  body.add(box(0.12, 0.12, 0.6, DARK, 0, 0.45, -1.05));
  const wheels = [wheel(0.52, 0.3, -0.63, 0.52, -0.45), wheel(0.52, 0.3, 0.63, 0.52, -0.45), wheel(0.3, 0.2, -0.43, 0.3, 0.7), wheel(0.3, 0.2, 0.43, 0.3, 0.7)];
  for (const w of wheels) root.add(w.g);
  const driver = makeDriver(0.52, -0.42);
  body.add(driver);
  return { root, body, wheels, driver };
}

/** Trator com arado de 4 aivecas atrás (trabalha 3 faixas). */
export function makePlowTractor() {
  const t = tractorBody();
  const imp = new THREE.Group();
  imp.position.set(0, 0, -1.6);
  imp.add(box(3.0, 0.12, 0.22, MG, 0, 0.55, 0));
  imp.add(box(0.16, 0.12, 0.6, MG, 0, 0.55, 0.35));
  for (let k = 0; k < 4; k++) {
    const x = -1.1 + k * 0.73;
    imp.add(box(0.08, 0.45, 0.08, MG, x, 0.32, -0.04));
    imp.add(rot(box(0.1, 0.28, 0.48, STEEL, x + 0.06, 0.12, -0.14), 0, 0.5, 0));
  }
  imp.add(box(0.08, 0.5, 0.08, MY, -1.45, 0.75, 0));
  imp.add(box(0.08, 0.5, 0.08, MY, 1.45, 0.75, 0));
  t.root.add(imp);
  return { ...t, implement: imp };
}

/** Trator com plantadeira de 4 linhas (caixas de semente amarelas). */
export function makeSeederTractor() {
  const t = tractorBody();
  const imp = new THREE.Group();
  imp.position.set(0, 0, -1.75);
  imp.add(box(4.0, 0.12, 0.26, MG, 0, 0.5, 0));
  imp.add(box(0.16, 0.12, 0.7, MG, 0, 0.5, 0.42));
  for (let k = 0; k < 4; k++) {
    const x = -1.5 + k;
    imp.add(box(0.5, 0.45, 0.45, MY, x, 0.85, -0.05));
    imp.add(box(0.54, 0.05, 0.49, MG, x, 1.1, -0.05));
    imp.add(rot(cyl(0.16, 0.04, STEEL, x, 0.18, 0.12), 0, 0, Math.PI / 2));
    imp.add(rot(cyl(0.11, 0.1, TIRE, x, 0.11, -0.35), 0, 0, Math.PI / 2));
    imp.add(box(0.06, 0.4, 0.06, MG, x, 0.32, -0.15));
  }
  for (const x of [-2.05, 2.05]) imp.add(box(0.06, 0.9, 0.06, MY, x, 0.95, 0));
  t.root.add(imp);
  return { ...t, implement: imp };
}

/** Colheitadeira com plataforma larga e molinete giratório. */
export function makeCombine() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(1.5, 1.3, 2.5, MG, 0, 1.25, -0.35));
  body.add(box(1.52, 0.08, 2.4, MY, 0, 1.05, -0.35));
  body.add(box(1.35, 0.5, 1.3, MG, 0, 2.15, -0.75));
  body.add(box(1.4, 0.06, 1.35, 0x2e6b24, 0, 2.42, -0.75));
  for (const x of [-0.68, 0.68]) body.add(box(0.02, 0.08, 1.3, MY, x, 2.3, -0.75));
  body.add(box(1.1, 0.3, 0.9, MG, 0, 2.03, 0.55));
  cabin(body, 1.0, 0.78, 0.86, 0, 2.57, 0.6, 0xf2f2ee);
  body.add(box(1.2, 0.5, 0.03, 0x1b1b1b, 0, 1.5, -1.61));
  body.add(cyl(0.05, 0.7, 0x1b1b1b, 0.45, 2.55, -1.25));
  for (const x of [-0.3, 0.3]) body.add(box(0.14, 0.08, 0.03, lampMat(), x, 2.9, 1.06));
  // Tubo de descarga dobrado ao lado
  body.add(rot(cyl(0.08, 2.3, MG, -0.82, 2.2, -0.1), Math.PI / 2, 0, 0));
  body.add(rot(cone(0.1, 0.25, MG, -0.82, 2.1, 1.1), Math.PI, 0, 0));
  // Canal alimentador e plataforma de corte
  body.add(rot(box(1.0, 0.55, 0.95, MG, 0, 0.75, 1.3), 0.25, 0, 0));
  const header = new THREE.Group();
  header.position.set(0, 0, 2.0);
  header.add(box(5.2, 0.12, 0.85, MG, 0, 0.3, 0));
  header.add(box(5.2, 0.5, 0.08, MG, 0, 0.55, -0.42));
  header.add(box(5.1, 0.05, 0.08, STEEL, 0, 0.27, 0.44));
  for (const x of [-2.6, 2.6]) {
    header.add(box(0.08, 0.55, 0.9, MY, x, 0.5, 0));
    header.add(rot(cone(0.08, 0.4, MY, x, 0.32, 0.55), Math.PI / 2, 0, 0));
    header.add(box(0.06, 0.65, 0.06, MG, x * 0.93, 0.7, -0.1));
  }
  const reel = new THREE.Group();
  reel.position.set(0, 1.0, 0.15);
  reel.add(rot(cyl(0.05, 5.0, MY, 0, 0, 0), 0, 0, Math.PI / 2));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    reel.add(box(5.0, 0.04, 0.05, MY, 0, Math.cos(a) * 0.32, Math.sin(a) * 0.32));
    for (const x of [-2.3, 0, 2.3]) {
      const spoke = box(0.03, 0.32, 0.03, MY, x, Math.cos(a) * 0.16, Math.sin(a) * 0.16);
      spoke.rotation.x = -a;
      reel.add(spoke);
    }
  }
  header.add(reel);
  root.add(header);
  const wheels = [wheel(0.62, 0.38, -0.95, 0.62, 0.45), wheel(0.62, 0.38, 0.95, 0.62, 0.45), wheel(0.36, 0.22, -0.68, 0.36, -1.35), wheel(0.36, 0.22, 0.68, 0.36, -1.35)];
  for (const w of wheels) root.add(w.g);
  const driver = makeDriver(1.72, 0.62);
  body.add(driver);
  return { root, body, wheels, driver, reel, implement: header };
}

/** Galpão aberto onde as máquinas ficam guardadas. */
export function makeShed() {
  const g = new THREE.Group();
  const roof = 0x5d6d7e, wall = 0xb0a48a;
  g.add(box(7.2, 2.8, 0.15, wall, 0, 1.4, -1.6));
  for (const x of [-3.6, 3.6]) g.add(box(0.15, 2.8, 3.2, wall, x, 1.4, 0));
  for (const x of [-3.6, -1.2, 1.2, 3.6]) g.add(cyl(0.08, 3.1, 0x6f4825, x, 1.55, 1.55));
  g.add(rot(box(7.8, 0.14, 3.8, roof, 0, 3.15, 0), -0.12, 0, 0));
  g.add(box(7.4, 0.08, 0.08, MY, 0, 2.95, 1.6));
  for (const [x, z] of [[-3, -1.2], [-2.6, -1.25]]) g.add(box(0.5, 0.6, 0.4, 0xa0703c, x, 0.3, z));
  g.add(cyl(0.25, 0.8, 0xc0392b, 3.1, 0.4, -1.1));
  return g;
}

/** Tufo de trigo (vários colmos com espiga) numa célula 1×1, altura 1. Usado com InstancedMesh. */
export function makeWheatTuftGeometry() {
  const parts = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let k = 0; k < 7; k++) {
    const x = rnd(-0.38, 0.38), z = rnd(-0.38, 0.38), h = rnd(0.75, 1.0);
    const stalk = new THREE.CylinderGeometry(0.018, 0.026, h, 4);
    stalk.translate(x, h / 2, z);
    const head = new THREE.SphereGeometry(0.06, 4, 3);
    head.scale(1, 2.3, 1);
    head.translate(x, h + 0.06, z);
    const leaf = new THREE.ConeGeometry(0.025, h * 0.5, 3);
    leaf.rotateZ(rnd(-0.7, 0.7));
    leaf.translate(x + 0.03, h * 0.3, z);
    parts.push(stalk, head, leaf);
  }
  // Junta tudo numa geometria só (não indexada)
  const pos = [], nor = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return geo;
}

// ================= Pescaria =================
/** Boia vermelha e branca que flutua no lago. */
export function makeBobber() {
  const g = new THREE.Group();
  g.add(ball(0.07, 0.06, 0.07, 0xe53935, 0, 0.05, 0));
  g.add(ball(0.07, 0.05, 0.07, 0xfafafa, 0, -0.01, 0));
  g.add(cyl(0.008, 0.08, 0x222222, 0, 0.14, 0));
  return g;
}

/** Peixe pescado (ou a bota velha), mostrado saltando da água até o pescador. */
export function makeCatch(color, junk = false) {
  const g = new THREE.Group();
  if (junk) {
    g.add(box(0.12, 0.22, 0.12, color, 0, 0.11, 0));
    g.add(box(0.12, 0.08, 0.24, color, 0, 0.04, 0.06));
    return g;
  }
  g.add(ball(0.08, 0.1, 0.2, color, 0, 0, 0));
  g.add(rot(cone(0.08, 0.14, color, 0, 0, -0.24), -Math.PI / 2, 0, 0));
  g.add(rot(cone(0.03, 0.08, color, 0, 0.1, 0), 0, 0, 0));
  g.add(box(0.02, 0.02, 0.01, 0x111111, 0.06, 0.03, 0.13));
  g.add(box(0.02, 0.02, 0.01, 0x111111, -0.06, 0.03, 0.13));
  return g;
}

// ================= Pet e fauna =================
/** Border collie preto e branco. Frente para +z. */
export function makeDog() {
  const black = 0x1d1d1d, white = 0xf4f2ec;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(ball(0.13, 0.12, 0.26, black, 0, 0.42, 0));
  body.add(ball(0.1, 0.11, 0.1, white, 0, 0.4, 0.19));
  body.add(ball(0.11, 0.06, 0.18, white, 0, 0.33, 0.02));
  body.add(rot(cyl(0.075, 0.035, 0xd32f2f, 0, 0.52, 0.22), 0.7, 0, 0));
  body.add(ball(0.02, 0.02, 0.02, 0xffd54f, 0, 0.47, 0.27));

  const head = new THREE.Group();
  head.position.set(0, 0.6, 0.27);
  head.add(ball(0.105, 0.095, 0.105, black, 0, 0, 0));
  head.add(box(0.035, 0.1, 0.03, white, 0, 0.03, 0.095));
  head.add(ball(0.055, 0.045, 0.08, white, 0, -0.035, 0.1));
  head.add(ball(0.022, 0.018, 0.015, 0x111111, 0, -0.015, 0.18));
  head.add(ball(0.016, 0.016, 0.01, 0xc58b3a, -0.045, 0.02, 0.09));
  head.add(ball(0.016, 0.016, 0.01, 0xc58b3a, 0.045, 0.02, 0.09));
  head.add(rot(cone(0.04, 0.09, black, -0.07, 0.1, -0.01), 0, 0, 0.35));
  head.add(rot(cone(0.04, 0.09, black, 0.07, 0.1, -0.01), 0, 0, -0.35));
  const tongue = box(0.035, 0.006, 0.05, 0xff7b9c, 0, -0.07, 0.15);
  tongue.visible = false;
  head.add(tongue);
  body.add(head);

  const legs = [];
  for (const [x, z] of [[-0.075, 0.15], [0.075, 0.15], [-0.075, -0.15], [0.075, -0.15]]) {
    const p = new THREE.Group();
    p.position.set(x, 0.32, z);
    p.add(box(0.06, 0.24, 0.06, black, 0, -0.12, 0));
    p.add(box(0.065, 0.1, 0.07, white, 0, -0.27, 0.005));
    body.add(p);
    legs.push(p);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.46, -0.24);
  tail.rotation.x = -0.5;
  tail.add(ball(0.045, 0.045, 0.14, black, 0, 0, -0.11));
  tail.add(ball(0.04, 0.04, 0.05, white, 0, 0, -0.25));
  body.add(tail);
  return { root, body, head, legs, tail, tongue };
}

export function makeFrog() {
  const g = new THREE.Group();
  const green = 0x6aa84f;
  g.add(ball(0.08, 0.055, 0.09, green, 0, 0.06, 0));
  g.add(ball(0.06, 0.03, 0.07, 0xc5e1a5, 0, 0.035, 0.02));
  for (const x of [-0.045, 0.045]) {
    g.add(ball(0.025, 0.025, 0.025, green, x, 0.11, 0.05));
    g.add(ball(0.014, 0.014, 0.01, 0x111111, x, 0.115, 0.07));
    g.add(ball(0.04, 0.025, 0.06, 0x5b9a42, x * 1.9, 0.03, -0.04));
  }
  return g;
}

export function makeLadybug() {
  const g = new THREE.Group();
  g.add(ball(0.05, 0.035, 0.06, 0xd32f2f, 0, 0.03, 0));
  g.add(ball(0.025, 0.022, 0.022, 0x111111, 0, 0.025, 0.06));
  g.add(box(0.004, 0.012, 0.11, 0x111111, 0, 0.062, 0));
  for (const [x, z] of [[-0.022, 0.02], [0.022, 0.02], [-0.026, -0.02], [0.026, -0.02]]) g.add(ball(0.009, 0.006, 0.009, 0x111111, x, 0.058, z));
  g.scale.setScalar(1.4);
  return g;
}

/** Passarinho com asas articuladas (wingL/wingR batem em torno de z). */
export function makeBird(color) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(ball(0.06, 0.055, 0.085, color, 0, 0.1, 0));
  body.add(ball(0.045, 0.04, 0.06, 0xfff3e0, 0, 0.085, 0.02));
  const head = new THREE.Group();
  head.position.set(0, 0.15, 0.06);
  head.add(ball(0.04, 0.04, 0.04, color, 0, 0, 0));
  head.add(rot(cone(0.012, 0.035, 0xffa726, 0, -0.005, 0.045), Math.PI / 2, 0, 0));
  head.add(ball(0.007, 0.007, 0.007, 0x111111, 0.028, 0.01, 0.025));
  head.add(ball(0.007, 0.007, 0.007, 0x111111, -0.028, 0.01, 0.025));
  body.add(head);
  body.add(rot(box(0.05, 0.01, 0.08, color, 0, 0.12, -0.1), 0.35, 0, 0));
  const wing = (s) => {
    const p = new THREE.Group();
    p.position.set(0.045 * s, 0.12, 0);
    p.add(ball(0.06, 0.012, 0.045, color, 0.05 * s, 0, -0.01));
    body.add(p);
    return p;
  };
  const wingL = wing(-1), wingR = wing(1);
  for (const x of [-0.02, 0.02]) body.add(cyl(0.005, 0.05, 0xffa726, x, 0.03, 0));
  return { root, body, head, wingL, wingR };
}

/** Borboleta com dois pares de asas. */
export function makeButterfly(color) {
  const root = new THREE.Group();
  root.add(rot(cyl(0.008, 0.07, 0x3e2723, 0, 0, 0), Math.PI / 2, 0, 0));
  const wing = (s) => {
    const p = new THREE.Group();
    p.add(ball(0.05, 0.004, 0.04, color, 0.05 * s, 0, 0.015));
    p.add(ball(0.035, 0.004, 0.03, color, 0.035 * s, 0, -0.03));
    p.add(ball(0.012, 0.005, 0.012, 0x222222, 0.06 * s, 0.001, 0.02));
    root.add(p);
    return p;
  };
  return { root, wingL: wing(-1), wingR: wing(1) };
}

export function makeRabbit() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = 0xb0a08f;
  body.add(ball(0.11, 0.1, 0.14, fur, 0, 0.12, 0));
  body.add(ball(0.04, 0.04, 0.04, 0xffffff, 0, 0.15, -0.14));
  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.11);
  head.add(ball(0.07, 0.065, 0.075, fur, 0, 0, 0));
  head.add(ball(0.012, 0.01, 0.01, 0xf48fb1, 0, -0.005, 0.075));
  for (const x of [-0.03, 0.03]) {
    head.add(rot(box(0.03, 0.13, 0.015, fur, x, 0.1, -0.02), -0.2, 0, x * 3));
    head.add(ball(0.01, 0.01, 0.008, 0x111111, x * 1.4, 0.015, 0.06));
  }
  body.add(head);
  for (const x of [-0.06, 0.06]) body.add(ball(0.035, 0.03, 0.07, fur, x, 0.04, -0.03));
  return { root, body, head };
}

export function makeDuck() {
  const g = new THREE.Group();
  g.add(ball(0.12, 0.08, 0.17, 0xf5f5f0, 0, 0.05, 0));
  g.add(ball(0.08, 0.04, 0.12, 0x8d6e63, 0, 0.09, -0.02));
  g.add(rot(cone(0.05, 0.08, 0xf5f5f0, 0, 0.08, -0.17), -1.9, 0, 0));
  g.add(ball(0.055, 0.055, 0.055, 0x2e7d32, 0, 0.17, 0.12));
  g.add(cyl(0.035, 0.03, 0xffffff, 0, 0.12, 0.11));
  g.add(ball(0.03, 0.012, 0.04, 0xffa726, 0, 0.16, 0.18));
  g.add(ball(0.008, 0.008, 0.008, 0x111111, 0.04, 0.18, 0.15));
  g.add(ball(0.008, 0.008, 0.008, 0x111111, -0.04, 0.18, 0.15));
  return g;
}

let fireflyTex = null;
/** Vaga-lume: um brilho amarelo-esverdeado (só aparece à noite). */
export function makeFirefly() {
  if (!fireflyTex) {
    fireflyTex = canvasTexture(64, 64, (g) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,200,1)');
      grd.addColorStop(0.25, 'rgba(220,255,120,.8)');
      grd.addColorStop(1, 'rgba(180,255,80,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    });
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireflyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.set(0.35, 0.35, 1);
  return sp;
}

let glowTex = null;
/** Brilho suave (aditivo) tingido de uma cor: aura das plantas mutadas, clarão dos raios. */
export function makeGlow(color, size = 1) {
  if (!glowTex) {
    glowTex = canvasTexture(64, 64, (g) => {
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    });
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.set(size, size, 1);
  return sp;
}


/** Toco de árvore cortada (com anéis no topo). */
export function makeStump(s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.26, 0x7a5230, 0, 0.13, 0));
  g.add(cyl(0.17, 0.02, 0xd7b98a, 0, 0.27, 0));
  g.add(cyl(0.1, 0.022, 0xb8925f, 0, 0.272, 0));
  g.add(cyl(0.04, 0.024, 0x9b7448, 0, 0.274, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    g.add(rot(cone(0.06, 0.18, 0x6b4423, Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2), Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1));
  }
  g.scale.setScalar(s);
  return g;
}

/** Serraria: galpão aberto com serra circular, pilha de troncos (esquerda) e de tábuas (direita). Frente para +z. */
export function makeSawmill() {
  const g = new THREE.Group();
  const wood = 0xa0703c, dark = 0x6f4825, steel = 0x9aa3ad;
  g.add(box(2.7, 0.12, 2.0, 0x8d6334, 0, 0.06, 0));
  for (const [x, z] of [[-1.25, -0.9], [1.25, -0.9], [-1.25, 0.9], [1.25, 0.9]]) g.add(cyl(0.07, 2.1, dark, x, 1.05, z));
  g.add(rot(box(3.0, 0.1, 2.4, 0x7b5a46, 0, 2.15, -0.05), -0.14, 0, 0));
  g.add(box(3.02, 0.06, 0.06, 0xd9473b, 0, 2.0, 1.15));
  g.add(box(2.6, 1.2, 0.08, wood, 0, 0.7, -0.95));
  // Bancada com a serra circular
  g.add(box(1.5, 0.1, 0.6, wood, 0, 0.78, 0.25));
  for (const [x, z] of [[-0.68, 0.0], [0.68, 0.0], [-0.68, 0.5], [0.68, 0.5]]) g.add(box(0.07, 0.72, 0.07, dark, x, 0.42, z));
  g.add(box(0.32, 0.28, 0.3, 0xc0392b, 0.35, 0.62, 0.25));
  const blade = new THREE.Group();
  blade.position.set(-0.05, 0.92, 0.25);
  blade.add(rot(cyl(0.26, 0.025, steel, 0, 0, 0), 0, 0, Math.PI / 2));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const tooth = box(0.03, 0.06, 0.04, 0xd5dbe0, 0, Math.cos(a) * 0.27, Math.sin(a) * 0.27);
    tooth.rotation.x = a;
    blade.add(tooth);
  }
  blade.add(rot(cyl(0.05, 0.05, dark, 0, 0, 0), 0, 0, Math.PI / 2));
  g.add(blade);
  g.add(cone(0.22, 0.14, 0xe6d2a8, -0.05, 0.19, 0.75));
  // Pilha de troncos (até 6 aparecem)
  const logs = [];
  const logSpots = [[-1.65, 0.13, -0.3], [-1.65, 0.13, 0.0], [-1.65, 0.13, 0.3], [-1.65, 0.35, -0.15], [-1.65, 0.35, 0.15], [-1.65, 0.57, 0]];
  for (const [x, y, z] of logSpots) {
    const lg = new THREE.Group();
    lg.position.set(x, y, z);
    lg.add(rot(cyl(0.12, 0.9, 0x7a5230, 0, 0, 0), 0, 0, Math.PI / 2));
    lg.add(rot(cyl(0.1, 0.92, 0xd7b98a, 0, 0, 0), 0, 0, Math.PI / 2));
    lg.add(rot(cyl(0.125, 0.86, 0x7a5230, 0, 0, 0), 0, 0, Math.PI / 2));
    lg.visible = false;
    g.add(lg);
    logs.push(lg);
  }
  // Pilha de tábuas (até 10 aparecem)
  const planks = [];
  for (let k = 0; k < 10; k++) {
    const p = box(0.95, 0.05, 0.2, k % 2 ? 0xd7b98a : 0xc9a874, 1.75, 0.15 + Math.floor(k / 2) * 0.055, -0.15 + (k % 2) * 0.23);
    p.visible = false;
    g.add(p);
    planks.push(p);
  }
  return { group: g, blade, logs, planks, lights: [] };
}

/** Mesa de carpintaria: bancada com serrote, martelo, morsa e pilhas de material. */
export function makeCarpentryTable() {
  const g = new THREE.Group();
  const wood = 0xb07a45, dark = 0x6f4825, steel = 0x9aa3ad;
  // Tampo e pernas
  g.add(box(1.7, 0.12, 0.8, wood, 0, 0.82, 0));
  for (const [x, z] of [[-0.75, -0.32], [0.75, -0.32], [-0.75, 0.32], [0.75, 0.32]]) g.add(box(0.1, 0.78, 0.1, dark, x, 0.4, z));
  g.add(box(1.5, 0.06, 0.06, dark, 0, 0.25, -0.32));
  g.add(box(1.5, 0.06, 0.06, dark, 0, 0.25, 0.32));
  g.add(box(1.5, 0.05, 0.6, 0x8d6334, 0, 0.22, 0));
  // Morsa
  g.add(box(0.18, 0.16, 0.2, steel, 0.72, 0.95, 0.3));
  g.add(rot(cyl(0.02, 0.3, dark, 0.72, 0.95, 0.48), Math.PI / 2, 0, 0));
  // Tábua sendo serrada e o serrote
  const work = box(0.9, 0.05, 0.22, 0xd7b98a, -0.1, 0.91, 0.08);
  g.add(work);
  const saw = new THREE.Group();
  saw.position.set(0.25, 0.98, 0.08);
  saw.add(box(0.5, 0.12, 0.012, steel, 0, 0.02, 0));
  saw.add(box(0.14, 0.12, 0.05, 0xc0392b, 0.31, 0.04, 0));
  g.add(saw);
  // Martelo e pregos
  g.add(rot(cyl(0.022, 0.32, dark, -0.55, 0.9, -0.22), 0, 0, Math.PI / 2));
  g.add(box(0.06, 0.07, 0.14, 0x55606a, -0.7, 0.9, -0.22));
  g.add(box(0.14, 0.05, 0.1, 0x7f8c8d, 0.3, 0.9, -0.25));
  // Lascas no chão
  g.add(cone(0.24, 0.08, 0xe6d2a8, 0.1, 0.04, 0.55));
  // Pilha de tábuas (até 6) e de vigas (até 4) ao lado
  const planks = [];
  for (let k = 0; k < 6; k++) {
    const p = box(0.85, 0.05, 0.18, k % 2 ? 0xd7b98a : 0xc9a874, 1.25, 0.04 + Math.floor(k / 2) * 0.055, -0.12 + (k % 2) * 0.22);
    p.visible = false;
    g.add(p);
    planks.push(p);
  }
  const beams = [];
  for (let k = 0; k < 4; k++) {
    const b = box(0.14, 0.14, 1.1, 0xa8794a, -1.15 + (k % 2) * 0.17, 0.08 + Math.floor(k / 2) * 0.15, 0);
    b.visible = false;
    g.add(b);
    beams.push(b);
  }
  return { group: g, saw, work, planks, beams };
}

/**
 * Canteiro de obras de largura w e profundidade d (centro na origem).
 * As peças (alicerce, postes, vigas, tábuas) aparecem conforme o progresso.
 */
export function makeConstruction(w, d) {
  const g = new THREE.Group();
  const stages = [];
  const add = (m) => { m.visible = false; g.add(m); stages.push(m); };
  // Cordinha e estacas sempre visíveis
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const st = makeStake();
    st.position.set(x, 0, z);
    g.add(st);
  }
  for (const [x, z, sx, sz] of [[0, -d / 2, w, 0.02], [0, d / 2, w, 0.02], [-w / 2, 0, 0.02, d], [w / 2, 0, 0.02, d]]) {
    g.add(box(sx, 0.02, sz, 0xf2f2f2, x, 0.4, z));
  }
  // Alicerce
  const iw = w - 0.4, id = d - 0.4;
  add(box(iw, 0.14, id, 0xa59a8a, 0, 0.07, 0));
  // Postes (cantos e meio)
  const posts = [[-iw / 2, -id / 2], [iw / 2, -id / 2], [-iw / 2, id / 2], [iw / 2, id / 2], [0, -id / 2], [0, id / 2], [-iw / 2, 0], [iw / 2, 0]];
  for (const [x, z] of posts) add(box(0.16, 2.0, 0.16, 0xa8794a, x, 1.1, z));
  // Vigas de cima
  add(box(iw, 0.14, 0.16, 0x8d6334, 0, 2.1, -id / 2));
  add(box(iw, 0.14, 0.16, 0x8d6334, 0, 2.1, id / 2));
  add(box(0.16, 0.14, id, 0x8d6334, -iw / 2, 2.1, 0));
  add(box(0.16, 0.14, id, 0x8d6334, iw / 2, 2.1, 0));
  // Tábuas das paredes, de baixo para cima
  for (let k = 0; k < 4; k++) {
    const y = 0.35 + k * 0.42;
    add(box(iw, 0.34, 0.05, 0xc9a874, 0, y, -id / 2));
    add(box(0.05, 0.34, id, 0xc9a874, -iw / 2, y, 0));
  }
  // Placa da obra
  const sign = new THREE.Group();
  sign.add(cyl(0.05, 1.1, 0x6f4825, -0.4, 0.55, 0));
  sign.add(cyl(0.05, 1.1, 0x6f4825, 0.4, 0.55, 0));
  sign.add(box(1.1, 0.6, 0.07, 0xf1c40f, 0, 0.85, 0));
  for (let k = 0; k < 4; k++) sign.add(rot(box(0.12, 0.62, 0.02, 0x2c3e50, -0.4 + k * 0.27, 0.85, 0.045), 0, 0, 0.6));
  sign.position.set(w / 2 - 0.6, 0, d / 2 + 0.25);
  g.add(sign);
  // Pilha de material na frente
  g.add(box(0.8, 0.1, 0.25, 0xd7b98a, -w / 2 + 0.7, 0.05, d / 2 + 0.35));
  g.add(box(0.8, 0.1, 0.25, 0xc9a874, -w / 2 + 0.75, 0.15, d / 2 + 0.38));
  return { group: g, stages };
}
