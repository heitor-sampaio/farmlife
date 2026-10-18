/* FarmLife — pet (border collie) e fauna de cenário: sapos, passarinhos, joaninhas, borboletas, coelhos, patos e vaga-lumes */
import * as THREE from 'three';
import * as M from './models.js';

let C = null; // contexto entregue pelo world.js (cena, navegação, jogador, efeitos…)

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const frogs = [];
const ladybugs = [];
const birds = [];
const butterflies = [];
const rabbits = [];
const ducks = [];
const fireflies = [];
let flock = null;
let flockT = 15;
let chirpT = 0;
let croakT = 0;

// Usado pelos testes no console do navegador
export const fauna = { frogs, ladybugs, birds, butterflies, rabbits, ducks, fireflies };

export const pet = {
  model: null, pos: new THREE.Vector3(), heading: 0, phase: 0, moving: false, running: false,
  path: [], repath: 0, idleT: 0, happyT: 0, chase: null, chaseT: 0, barkT: 0,
};

const splash = (x, z, n = 8) => C.burst(x, 0.06, z, 0xd6efff, n, { up: 1.6, spread: 0.4, size: 0.04, life: 0.45 });

// ================= Criação =================
export function initCritters(ctx) {
  C = ctx;
  const { scene } = C;

  for (let k = 0; k < 3; k++) {
    const f = { m: M.makeFrog(), a: rand(0, Math.PI * 2), state: 'sit', t: rand(1, 6), k: 0, dur: 0.4, from: new THREE.Vector3(), to: new THREE.Vector3() };
    placeFrog(f);
    scene.add(f.m);
    frogs.push(f);
  }

  for (let k = 0; k < 8; k++) {
    const home = C.randomSpot();
    const m = M.makeLadybug();
    m.position.set(home.x, 0.01, home.z);
    scene.add(m);
    ladybugs.push({ m, home, heading: rand(0, Math.PI * 2), turn: 0 });
  }

  const colors = [0x8d6e63, 0x42a5f5, 0xe53935, 0xfdd835];
  for (let gI = 0; gI < 3; gI++) {
    const c = C.randomSpot();
    for (let k = 0; k < 3; k++) {
      const b = M.makeBird(colors[(gI * 3 + k) % colors.length]);
      const pos = new THREE.Vector3(c.x + rand(-0.8, 0.8), 0, c.z + rand(-0.8, 0.8));
      b.root.position.copy(pos);
      scene.add(b.root);
      birds.push({ b, pos, heading: rand(0, Math.PI * 2), state: 'ground', t: rand(0.5, 3), k: 0, dur: 1, h: 0, peck: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
    }
  }

  // Borboletas: uma cor por espécie (o álbum tem uma página para elas)
  const btypes = ['amarela', 'roxa', 'laranja', 'azul', 'rosa', 'limao'];
  const bcolors = [0xffb300, 0x7e57c2, 0xff7043, 0x29b6f6, 0xf06292, 0xffee58];
  for (let k = 0; k < 9; k++) {
    const bf = M.makeButterfly(bcolors[k % bcolors.length]);
    const home = C.randomSpot();
    bf.root.position.set(home.x, 0.6, home.z);
    scene.add(bf.root);
    butterflies.push({ bf, home, phase: rand(0, 10), speed: rand(0.6, 1.1), last: new THREE.Vector3(home.x, 0.6, home.z), type: btypes[k % btypes.length] });
  }

  for (let k = 0; k < 2; k++) {
    const r = M.makeRabbit();
    const p = C.randomSpot();
    const pos = new THREE.Vector3(p.x, 0, p.z);
    r.root.position.copy(pos);
    scene.add(r.root);
    rabbits.push({ r, pos, heading: rand(0, Math.PI * 2), state: 'idle', t: rand(1, 4), hops: 0, k: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), goal: null });
  }

  for (let k = 0; k < 2; k++) {
    const m = M.makeDuck();
    scene.add(m);
    ducks.push({ m, a: k * Math.PI, rad: rand(0.75, 1.1), speed: rand(0.15, 0.25) * (k ? -1 : 1) });
  }

  for (let k = 0; k < 18; k++) {
    const s = M.makeFirefly();
    const home = k < 7
      ? { x: C.POND.x + rand(-3, 3), z: C.POND.z + rand(-3, 3) }
      : C.randomSpot();
    s.visible = false;
    scene.add(s);
    fireflies.push({ s, home, phase: rand(0, 10) });
  }
}

// ================= Sapos =================
function ringPoint(a, rr) {
  return { x: C.POND.x + Math.cos(a) * rr, z: C.POND.z + Math.sin(a) * rr };
}

function placeFrog(f) {
  const p = ringPoint(f.a, C.POND.r + 0.2);
  f.m.position.set(p.x, 0.02, p.z);
  f.m.rotation.y = Math.atan2(p.x - C.POND.x, p.z - C.POND.z) + rand(-0.6, 0.6);
  f.m.visible = true;
}

function updateFrogs(dt, threats) {
  const clock = C.clock();
  for (const f of frogs) {
    f.t -= dt;
    if (f.state === 'sit') {
      f.m.scale.set(1, 1 + Math.sin(clock * 3 + f.a) * 0.05, 1);
      if (threats.some((p) => dist(p, f.m.position) < 1.4)) {
        // Pula na água
        f.state = 'dive';
        f.k = 0;
        f.dur = 0.45;
        f.from.copy(f.m.position);
        const p = ringPoint(f.a, C.POND.r * 0.55);
        f.to.set(p.x, 0, p.z);
      } else if (f.t <= 0) {
        f.t = rand(3, 9);
        if (Math.random() < 0.6) {
          f.state = 'hop';
          f.k = 0;
          f.dur = 0.4;
          f.from.copy(f.m.position);
          f.a += rand(-0.5, 0.5);
          const p = ringPoint(f.a, C.POND.r + 0.2);
          f.to.set(p.x, 0.02, p.z);
        } else if (croakT <= 0 && dist(C.player.pos, f.m.position) < 8) {
          C.sfx('croak');
          croakT = 6;
          f.m.scale.set(1.15, 0.9, 1.15);
        }
      }
    } else if (f.state === 'hop' || f.state === 'dive') {
      f.k = Math.min(1, f.k + dt / f.dur);
      f.m.position.lerpVectors(f.from, f.to, f.k);
      f.m.position.y = Math.sin(f.k * Math.PI) * 0.32 + 0.02;
      f.m.rotation.y = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
      if (f.k >= 1) {
        if (f.state === 'dive') {
          splash(f.to.x, f.to.z, 10);
          f.m.visible = false;
          f.state = 'under';
          f.t = rand(4, 9);
        } else {
          f.state = 'sit';
        }
      }
    } else if (f.state === 'under' && f.t <= 0) {
      f.a = rand(0, Math.PI * 2);
      placeFrog(f);
      splash(f.m.position.x, f.m.position.z, 5);
      f.state = 'sit';
      f.t = rand(2, 6);
    }
  }
}

// ================= Passarinhos =================
function takeOff(b) {
  let spot = C.randomSpot();
  for (let k = 0; k < 5 && dist(spot, b.pos) < 6; k++) spot = C.randomSpot();
  b.state = 'fly';
  b.k = 0;
  b.from.copy(b.pos);
  b.to.set(spot.x, 0, spot.z);
  b.dur = Math.max(1.2, dist(b.from, b.to) / 4.5);
  b.h = 2 + dist(b.from, b.to) * 0.12;
  b.heading = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
  if (chirpT <= 0 && dist(C.player.pos, b.pos) < 9) { C.sfx('chirp'); chirpT = 1.5; }
}

function updateBirds(dt, threats, night) {
  const clock = C.clock();
  for (const b of birds) {
    const m = b.b;
    if (b.state === 'ground') {
      if (threats.some((p) => dist(p, b.pos) < 2.2)) {
        // Avisa os vizinhos: o grupo voa junto
        for (const o of birds) if (o.state === 'ground' && dist(o.pos, b.pos) < 2) takeOff(o);
        continue;
      }
      b.t -= dt;
      if (b.t <= 0 && !night) {
        b.t = rand(0.6, 2.5);
        if (Math.random() < 0.55) {
          // pulinho
          const a = rand(0, Math.PI * 2);
          b.from.copy(b.pos);
          b.to.set(b.pos.x + Math.cos(a) * 0.3, 0, b.pos.z + Math.sin(a) * 0.3);
          if (C.nav.free(b.to.x, b.to.z)) { b.state = 'hop'; b.k = 0; b.heading = Math.atan2(b.to.x - b.pos.x, b.to.z - b.pos.z); }
        } else {
          b.peck = 0.5;
        }
      }
      b.peck = Math.max(0, b.peck - dt);
      m.head.rotation.x = b.peck > 0 ? Math.abs(Math.sin(b.peck * 18)) * 0.9 : 0;
      m.wingL.rotation.z = 0;
      m.wingR.rotation.z = 0;
      m.root.position.set(b.pos.x, 0, b.pos.z);
    } else if (b.state === 'hop') {
      b.k = Math.min(1, b.k + dt / 0.22);
      b.pos.lerpVectors(b.from, b.to, b.k);
      m.root.position.set(b.pos.x, Math.sin(b.k * Math.PI) * 0.08, b.pos.z);
      if (b.k >= 1) b.state = 'ground';
    } else if (b.state === 'fly') {
      b.k = Math.min(1, b.k + dt / b.dur);
      b.pos.lerpVectors(b.from, b.to, b.k);
      m.root.position.set(b.pos.x, Math.sin(b.k * Math.PI) * b.h + Math.min(b.k, 1 - b.k) * 0.5, b.pos.z);
      const flap = Math.sin(clock * 32 + b.from.x) * 0.9;
      m.wingL.rotation.z = flap;
      m.wingR.rotation.z = -flap;
      if (b.k >= 1) { b.state = 'ground'; b.t = rand(1, 3); }
    }
    m.root.rotation.y = lerpAngle(m.root.rotation.y, b.heading, Math.min(1, dt * 10));
  }

  // Bando passando no céu de vez em quando
  flockT -= dt;
  if (!flock && flockT <= 0 && !night) {
    flockT = rand(25, 50);
    const a = rand(0, Math.PI * 2);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const c = C.player.pos;
    const list = [];
    for (let k = 0; k < 5; k++) {
      const bb = M.makeBird(0x37474f);
      bb.root.scale.setScalar(1.3);
      C.scene.add(bb.root);
      const side = (k % 2 ? 1 : -1) * Math.ceil(k / 2);
      list.push({ b: bb, off: new THREE.Vector3(-dir.z * side * 0.6, rand(-0.2, 0.2), dir.x * side * 0.6).addScaledVector(dir, -Math.abs(side) * 0.6) });
    }
    flock = { list, from: c.clone().addScaledVector(dir, -26), to: c.clone().addScaledVector(dir, 26), k: 0, heading: Math.atan2(dir.x, dir.z) };
  }
  if (flock) {
    flock.k += dt / 11;
    const base = new THREE.Vector3().lerpVectors(flock.from, flock.to, flock.k);
    for (const f of flock.list) {
      f.b.root.position.set(base.x + f.off.x, 6.5 + f.off.y, base.z + f.off.z);
      f.b.root.rotation.y = flock.heading;
      const flap = Math.sin(clock * 14 + f.off.x * 3) * 0.8;
      f.b.wingL.rotation.z = flap;
      f.b.wingR.rotation.z = -flap;
    }
    if (flock.k >= 1) {
      for (const f of flock.list) C.scene.remove(f.b.root);
      flock = null;
    }
  }
}

// ================= Joaninhas, borboletas, coelhos, patos e vaga-lumes =================
function updateLadybugs(dt) {
  for (const l of ladybugs) {
    l.turn = THREE.MathUtils.clamp(l.turn + rand(-1, 1) * dt * 4, -1.5, 1.5);
    l.heading += l.turn * dt;
    const p = l.m.position;
    if (Math.hypot(p.x - l.home.x, p.z - l.home.z) > 1.0) {
      l.heading = lerpAngle(l.heading, Math.atan2(l.home.x - p.x, l.home.z - p.z), Math.min(1, dt * 2));
    }
    p.x += Math.sin(l.heading) * 0.13 * dt;
    p.z += Math.cos(l.heading) * 0.13 * dt;
    l.m.rotation.y = l.heading;
  }
}

function updateButterflies(dt, show) {
  const clock = C.clock();
  for (const b of butterflies) {
    b.bf.root.visible = show;
    if (!show) continue;
    b.phase += dt * b.speed;
    const r = b.bf.root;
    r.position.set(
      b.home.x + Math.sin(b.phase * 0.7) * 1.2 + Math.sin(b.phase * 1.9) * 0.3,
      0.75 + Math.sin(b.phase * 2.3) * 0.3,
      b.home.z + Math.cos(b.phase * 0.5) * 1.2,
    );
    const dx = r.position.x - b.last.x, dz = r.position.z - b.last.z;
    if (dx || dz) r.rotation.y = Math.atan2(dx, dz);
    b.last.copy(r.position);
    const flap = Math.sin(clock * 18 + b.phase) * 0.9;
    b.bf.wingL.rotation.z = -0.2 + flap;
    b.bf.wingR.rotation.z = 0.2 - flap;
  }
}

function updateRabbits(dt, threats) {
  const clock = C.clock();
  for (const r of rabbits) {
    const m = r.r;
    if (r.state === 'idle') {
      m.head.rotation.x = Math.sin(clock * 9) * 0.04;
      r.t -= dt;
      const t = threats.find((p) => dist(p, r.pos) < 3);
      if (t) {
        // Foge para longe da ameaça
        const a = Math.atan2(r.pos.x - t.x, r.pos.z - t.z) + rand(-0.5, 0.5);
        r.goal = { x: r.pos.x + Math.sin(a) * 3, z: r.pos.z + Math.cos(a) * 3 };
        r.hops = 4;
      } else if (r.t <= 0) {
        r.t = rand(2, 6);
        const a = rand(0, Math.PI * 2);
        r.goal = { x: r.pos.x + Math.sin(a) * 1.2, z: r.pos.z + Math.cos(a) * 1.2 };
        r.hops = 2;
      }
      if (r.hops > 0) startRabbitHop(r);
    } else if (r.state === 'hop') {
      r.k = Math.min(1, r.k + dt / 0.28);
      r.pos.lerpVectors(r.from, r.to, r.k);
      m.root.position.set(r.pos.x, Math.sin(r.k * Math.PI) * 0.22, r.pos.z);
      m.body.rotation.x = Math.sin(r.k * Math.PI * 2) * 0.25;
      if (r.k >= 1) {
        r.state = 'idle';
        m.body.rotation.x = 0;
        if (r.hops > 0) startRabbitHop(r);
      }
    }
    m.root.position.x = r.pos.x;
    m.root.position.z = r.pos.z;
    m.root.rotation.y = lerpAngle(m.root.rotation.y, r.heading, Math.min(1, dt * 12));
  }
}

function startRabbitHop(r) {
  r.hops--;
  const dx = r.goal.x - r.pos.x, dz = r.goal.z - r.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.1) { r.hops = 0; return; }
  const step = Math.min(0.75, d);
  const nx = r.pos.x + (dx / d) * step, nz = r.pos.z + (dz / d) * step;
  if (!C.nav.free(nx, nz) || C.inFieldOrPond(nx, nz)) { r.hops = 0; return; }
  r.from.copy(r.pos);
  r.to.set(nx, 0, nz);
  r.heading = Math.atan2(dx, dz);
  r.k = 0;
  r.state = 'hop';
}

function updateDucks(dt) {
  const clock = C.clock();
  for (const d of ducks) {
    d.a += d.speed * dt;
    const s = Math.sign(d.speed);
    d.m.position.set(C.POND.x + Math.cos(d.a) * d.rad, 0.02 + Math.sin(clock * 2 + d.a) * 0.01, C.POND.z + Math.sin(d.a) * d.rad);
    d.m.rotation.y = Math.atan2(-Math.sin(d.a) * s, Math.cos(d.a) * s);
  }
}

function updateFireflies(darkness) {
  const clock = C.clock();
  const night = THREE.MathUtils.clamp((darkness - 0.4) * 2, 0, 1);
  for (const f of fireflies) {
    const o = night * (0.45 + 0.55 * Math.sin(clock * 3 + f.phase * 5));
    f.s.visible = o > 0.03;
    if (!f.s.visible) continue;
    f.s.material.opacity = o;
    f.s.position.set(
      f.home.x + Math.sin(clock * 0.5 + f.phase) * 0.9,
      0.6 + Math.sin(clock * 0.8 + f.phase) * 0.4,
      f.home.z + Math.cos(clock * 0.4 + f.phase * 1.3) * 0.9,
    );
  }
}

// ================= Rede de insetos =================
const bugList = []; // { type, obj (o que aparece), ref (o bicho), pos() }

/** Os bichinhos que dá para pegar com a rede (borboletas, joaninhas e vaga-lumes). */
function buildBugList() {
  if (bugList.length) return;
  for (const b of butterflies) bugList.push({ type: b.type, obj: b.bf.root, ref: b, kind: 'borboleta' });
  for (const l of ladybugs) bugList.push({ type: 'joaninha', obj: l.m, ref: l, kind: 'joaninha' });
  for (const f of fireflies) bugList.push({ type: 'vagalume', obj: f.s, ref: f, kind: 'vagalume' });
  bugList.forEach((b, k) => {
    b.obj.userData.pick = { kind: 'bug', k };
    C.pickables.push(b.obj);
  });
}
export const bugs = () => bugList;

/** Bichinho visível mais perto (dentro de maxD), ou -1. */
export function nearestBug(pos, maxD) {
  let best = -1, bd = maxD;
  bugList.forEach((b, k) => {
    if (!b.obj.visible) return;
    const d = Math.hypot(b.obj.position.x - pos.x, b.obj.position.z - pos.z);
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}

/** Pegou: o bichinho some daqui e aparece em outro lugar da fazenda. */
export function relocateBug(k) {
  const b = bugList[k];
  if (!b) return;
  const p = C.randomSpot();
  if (b.kind === 'joaninha') { b.ref.home = p; b.obj.position.set(p.x, 0.01, p.z); }
  else b.ref.home = { x: p.x, z: p.z };
  if (b.kind === 'borboleta') b.ref.last.set(p.x, 0.6, p.z);
}

export function updateCritters(dt) {
  buildBugList();
  if (!C) return;
  chirpT -= dt;
  croakT -= dt;
  const darkness = C.darkness();
  const night = darkness > 0.6;
  const threats = [C.player.pos];
  if (pet.model) threats.push(pet.pos);
  updateFrogs(dt, threats);
  updateBirds(dt, threats, night);
  updateLadybugs(dt);
  updateButterflies(dt, !night && C.weather() !== 'chuva');
  updateRabbits(dt, threats);
  updateDucks(dt);
  updateFireflies(darkness);
}

// ================= Pet: border collie =================
export function syncPet() {
  if (!C) return;
  const owned = C.core.S.pet.owned;
  if (owned && !pet.model) {
    pet.model = M.makeDog();
    pet.pos.set(C.player.pos.x + 1, 0, C.player.pos.z + 1);
    if (!C.nav.free(pet.pos.x, pet.pos.z)) pet.pos.copy(C.player.pos);
    pet.model.root.userData.pick = { kind: 'pet' };
    C.scene.add(pet.model.root);
    C.pickables.push(pet.model.root);
  } else if (!owned && pet.model) {
    C.scene.remove(pet.model.root);
    C.pickables.splice(C.pickables.indexOf(pet.model.root), 1);
    pet.model = null;
  }
}

/** Carinho: o pet pula de alegria, solta corações e late. */
export function petInteract() {
  if (!pet.model) return;
  pet.happyT = 1.1;
  pet.chase = null;
  pet.heading = Math.atan2(C.player.pos.x - pet.pos.x, C.player.pos.z - pet.pos.z);
  C.burst(pet.pos.x, 0.8, pet.pos.z, 0xff6b9a, 12, { up: 2.4, spread: 0.5, size: 0.06, life: 0.8, gravity: 2 });
  C.sfx('bark');
  C.core.petDog();
  C.fxAt(pet.pos, '❤️');
}

export const petPettedToday = () => C.core.S.pet.day === C.core.dayOf(C.core.S.time);

export function updatePet(dt) {
  if (!pet.model) return;
  const m = pet.model;
  const P = C.player.pos;
  const d = dist(pet.pos, P);
  const clock = C.clock();
  pet.moving = false;
  pet.running = false;
  pet.barkT -= dt;

  if (d > 28) {
    // Ficou muito para trás: aparece ao lado do jogador
    pet.pos.set(P.x + 1, 0, P.z + 1);
    if (!C.nav.free(pet.pos.x, pet.pos.z)) pet.pos.set(P.x, 0, P.z);
    pet.path = [];
  }

  let sitting = false;
  if (pet.happyT > 0) {
    pet.happyT -= dt;
    pet.heading += dt * 9 * (pet.happyT > 0.5 ? 1 : 0);
  } else if (pet.chase) {
    pet.chaseT -= dt;
    const b = pet.chase;
    if (b.state !== 'ground' || pet.chaseT <= 0) {
      pet.chase = null;
    } else {
      chaseTo(b.pos, 5.2, dt);
    }
  } else if (d > 2.0) {
    // Segue o jogador (corre quando está longe)
    const k = 1.4 / d;
    const tx = P.x + (pet.pos.x - P.x) * k, tz = P.z + (pet.pos.z - P.z) * k;
    chaseTo({ x: tx, z: tz }, d > 5 ? 6.2 : 3.9, dt);
    pet.idleT = 0;
  } else {
    pet.idleT += dt;
    pet.path = [];
    pet.heading = lerpAngle(pet.heading, Math.atan2(P.x - pet.pos.x, P.z - pet.pos.z), Math.min(1, dt * 3));
    sitting = pet.idleT > 1.5;
    // Às vezes sai correndo atrás de um passarinho
    if (pet.idleT > 3 && Math.random() < dt * 0.12) {
      const near = birds.filter((b) => b.state === 'ground' && dist(b.pos, pet.pos) < 7);
      if (near.length) {
        pet.chase = near[Math.floor(Math.random() * near.length)];
        pet.chaseT = 3;
        pet.idleT = 0;
        if (pet.barkT <= 0) { C.sfx('bark'); pet.barkT = 4; }
      }
    }
  }

  // Animação
  if (pet.moving) pet.phase += dt * (pet.running ? 18 : 12);
  const swing = pet.moving ? Math.sin(pet.phase) * 0.7 : 0;
  m.legs.forEach((leg, k) => {
    let target = k === 1 || k === 2 ? -swing : swing;
    if (sitting && k >= 2) target = -1.3; // patas de trás dobradas
    leg.rotation.x += (target - leg.rotation.x) * Math.min(1, dt * 12);
  });
  const happy = pet.happyT > 0;
  m.body.rotation.x += ((sitting ? -0.35 : 0) - m.body.rotation.x) * Math.min(1, dt * 8);
  m.body.position.y = happy ? Math.abs(Math.sin(pet.happyT * 12)) * 0.18 : sitting ? -0.07 : pet.moving ? Math.abs(Math.sin(pet.phase)) * 0.04 : 0;
  m.head.rotation.x = sitting ? 0.25 : 0;
  m.tail.rotation.y = Math.sin(clock * (happy || d < 2.5 ? 16 : 5)) * (happy ? 0.8 : 0.45);
  m.tongue.visible = happy || pet.running;
  m.root.position.set(pet.pos.x, 0, pet.pos.z);
  m.root.rotation.y = lerpAngle(m.root.rotation.y, pet.heading, Math.min(1, dt * 10));
}

function chaseTo(target, speed, dt) {
  pet.repath -= dt;
  if (pet.repath <= 0 || !pet.path.length) {
    pet.path = C.nav.findPath(pet.pos.x, pet.pos.z, target.x, target.z) || [];
    pet.repath = 0.6;
  }
  C.followPath(pet, dt, speed);
  pet.running = speed > 5;
}
