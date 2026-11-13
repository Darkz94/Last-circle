// ===== core: constants and small helpers
const GAME_VERSION = 13;
const TAU = Math.PI * 2, R = 300, SPAWN_R = R + 85, PR = 13, STEP = 1 / 60;
const ORDER = ['red', 'yellow', 'blue', 'green'];
const COL = { red: '#ff5a3c', yellow: '#ffd23f', blue: '#4fc3ff', green: '#5ee08a', steel: '#c9cbd6', gold: '#f2c14e', xp: '#9b8cff' };
const ELEM = { red: 'Fire', yellow: 'Lightning', blue: 'Frost', green: 'Earth' };
const ADJ = { red: 'Ember', yellow: 'Storm', blue: 'Frost', green: 'Stone' };
const EVO = { red: 'Sunforged', yellow: 'Skybreaker', blue: 'Winterheart', green: 'Worldroot' };
const ROMAN = ['I', 'II', 'III', 'IV'];
const TM = [1, 1.65, 2.6, 4.8];        // weapon damage by tier
const ETHRESH = [2, 4, 6];             // element set thresholds
const TTHRESH = [1, 3, 6];             // weapon-type set thresholds
const FIRE = '#ff7a2a', ICE = '#bfeaff', ROCK = '#c9a25a';

const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickW = list => { let t = list.reduce((s, x) => s + x[1], 0), r = Math.random() * t; for (const x of list) if ((r -= x[1]) <= 0) return x[0]; return list[0][0]; };
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const fmt = v => (Math.round(v * 100) / 100).toString();
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const $ = id => document.getElementById(id);

const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

// colour helpers (cached)
const _rgb = {};
function rgbOf(hex) { let c = _rgb[hex]; if (!c) { const h = hex.replace('#', ''); c = _rgb[hex] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; } return c; }
function rgba(hex, a) { const c = rgbOf(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`; }
const _shade = {};
function shade(hex, f) {   // f < 1 darkens, f > 1 lightens
  const k = hex + f; let s = _shade[k];
  if (!s) { const c = rgbOf(hex); const m = v => Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)); s = _shade[k] = `rgb(${m(c[0])},${m(c[1])},${m(c[2])})`; }
  return s;
}

// spatial grid: cheap "who is near here" lookups for enemies
const CELL = 56, GOFF = SPAWN_R + 200;
const grid = {
  cells: new Map(),
  build(list) {
    this.cells.clear();
    for (const e of list) {
      if (e.dead) continue;
      const k = ((e.x + GOFF) / CELL | 0) * 1000 + ((e.y + GOFF) / CELL | 0);
      const c = this.cells.get(k); if (c) c.push(e); else this.cells.set(k, [e]);
    }
  },
  near(x, y, r, fn) {
    const x0 = (x - r + GOFF) / CELL | 0, x1 = (x + r + GOFF) / CELL | 0, y0 = (y - r + GOFF) / CELL | 0, y1 = (y + r + GOFF) / CELL | 0;
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
      const c = this.cells.get(gx * 1000 + gy);
      if (c) for (let i = 0; i < c.length; i++) fn(c[i]);
    }
  },
};
