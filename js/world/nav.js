/* FarmLife — grade de navegação: colisão e rotas (A*) para o personagem */

export class NavGrid {
  constructor(minX, minZ, maxX, maxZ, cell = 0.25) {
    this.minX = minX;
    this.minZ = minZ;
    this.cell = cell;
    this.w = Math.ceil((maxX - minX) / cell);
    this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }

  toCell(x, z) {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  center(cx, cz) {
    return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell };
  }

  inside(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }

  freeCell(cx, cz) { return this.inside(cx, cz) && !this.blocked[cz * this.w + cx]; }

  free(x, z) {
    const [cx, cz] = this.toCell(x, z);
    return this.freeCell(cx, cz);
  }

  /** Bloqueia um retângulo (já considerando o raio do personagem em pad). */
  blockRect(x1, z1, x2, z2, pad = 0) {
    const [a, b] = this.toCell(Math.min(x1, x2) - pad, Math.min(z1, z2) - pad);
    const [c, d] = this.toCell(Math.max(x1, x2) + pad, Math.max(z1, z2) + pad);
    for (let cz = Math.max(0, b); cz <= Math.min(this.h - 1, d); cz++) {
      for (let cx = Math.max(0, a); cx <= Math.min(this.w - 1, c); cx++) this.blocked[cz * this.w + cx] = 1;
    }
  }

  blockCircle(x, z, r) {
    const [a, b] = this.toCell(x - r, z - r);
    const [c, d] = this.toCell(x + r, z + r);
    for (let cz = Math.max(0, b); cz <= Math.min(this.h - 1, d); cz++) {
      for (let cx = Math.max(0, a); cx <= Math.min(this.w - 1, c); cx++) {
        const p = this.center(cx, cz);
        if ((p.x - x) ** 2 + (p.z - z) ** 2 <= r * r) this.blocked[cz * this.w + cx] = 1;
      }
    }
  }

  /** Bloqueia uma linha fina (ex.: cerca) entre dois pontos. */
  blockLine(x1, z1, x2, z2, r) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.ceil(len / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      this.blockCircle(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, r);
    }
  }

  lineFree(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(len / (this.cell * 0.4));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (!this.free(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  /** Célula livre mais próxima (busca em largura). */
  nearestFree(cx, cz, maxR = 40) {
    if (this.freeCell(cx, cz)) return [cx, cz];
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (this.freeCell(cx + dx, cz + dz)) {
            const d = dx * dx + dz * dz;
            if (d < bd) { bd = d; best = [cx + dx, cz + dz]; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** Caminho de (ax, az) até (bx, bz) como lista de pontos, ou null. */
  findPath(ax, az, bx, bz) {
    if (this.lineFree(ax, az, bx, bz) && this.free(bx, bz)) return [{ x: bx, z: bz }];
    let start = this.toCell(ax, az);
    let goal = this.toCell(bx, bz);
    start = this.nearestFree(start[0], start[1], 6);
    goal = this.nearestFree(goal[0], goal[1]);
    if (!start || !goal) return null;

    const W = this.w;
    const total = this.w * this.h;
    const g = new Float32Array(total).fill(Infinity);
    const came = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const s = start[1] * W + start[0];
    const t = goal[1] * W + goal[0];
    const hfun = (i) => {
      const dx = Math.abs((i % W) - goal[0]);
      const dz = Math.abs(Math.floor(i / W) - goal[1]);
      return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
    };
    const heap = new MinHeap();
    g[s] = 0;
    heap.push(s, hfun(s));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    let found = false;
    let guard = 0;
    while (heap.size && guard++ < 40000) {
      const cur = heap.pop();
      if (cur === t) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cz = Math.floor(cur / W);
      for (const [dx, dz, cost] of dirs) {
        const nx = cx + dx, nz = cz + dz;
        if (!this.freeCell(nx, nz)) continue;
        if (dx && dz && (!this.freeCell(cx + dx, cz) || !this.freeCell(cx, cz + dz))) continue;
        const ni = nz * W + nx;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          heap.push(ni, ng + hfun(ni));
        }
      }
    }
    if (!found) return null;

    const cells = [];
    for (let c = t; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => this.center(c % W, Math.floor(c / W)));
    if (this.free(bx, bz)) pts[pts.length - 1] = { x: bx, z: bz };

    // Suaviza: pula pontos intermediários quando há linha de visão
    const out = [];
    let from = { x: ax, z: az };
    let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = pts.length - 1; j > k; j--) {
        if (this.lineFree(from.x, from.z, pts[j].x, pts[j].z)) { far = j; break; }
      }
      out.push(pts[far]);
      from = pts[far];
      k = far + 1;
    }
    return out;
  }
}

class MinHeap {
  constructor() { this.items = []; this.prio = []; }
  get size() { return this.items.length; }
  push(item, p) {
    const a = this.items, q = this.prio;
    a.push(item); q.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (q[par] <= q[i]) break;
      [a[i], a[par]] = [a[par], a[i]];
      [q[i], q[par]] = [q[par], q[i]];
      i = par;
    }
  }
  pop() {
    const a = this.items, q = this.prio;
    const top = a[0];
    const lastI = a.pop(), lastP = q.pop();
    if (a.length) {
      a[0] = lastI; q[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && q[l] < q[m]) m = l;
        if (r < a.length && q[r] < q[m]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        [q[i], q[m]] = [q[m], q[i]];
        i = m;
      }
    }
    return top;
  }
}
