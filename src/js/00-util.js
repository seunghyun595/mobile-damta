// ───────────────────────── util ─────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invlerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smoothstep = (a, b, v) => { const t = invlerp(a, b, v); return t * t * (3 - 2 * t); };
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const Ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outBack: (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

function mulberry(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Perlin gradient noise, returns roughly [-1, 1]
const PERM = new Uint8Array(512);
(function () {
  const p = []; for (let i = 0; i < 256; i++) p.push(i);
  const r = mulberry(20261112);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();
function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _g2(h, x, y) {
  switch (h & 7) {
    case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
    case 4: return x; case 5: return -x; case 6: return y; default: return -y;
  }
}
function noise2(x, y) {
  const fx = Math.floor(x), fy = Math.floor(y);
  const X = fx & 255, Y = fy & 255;
  x -= fx; y -= fy;
  const u = _fade(x), v = _fade(y);
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  return lerp(lerp(_g2(PERM[a], x, y), _g2(PERM[b], x - 1, y), u),
              lerp(_g2(PERM[a + 1], x, y - 1), _g2(PERM[b + 1], x - 1, y - 1), u), v) * 0.9;
}
const noise1 = (x) => noise2(x, 0.371);
const fbm1 = (x) => noise1(x) * 0.6 + noise1(x * 2.13 + 7.3) * 0.28 + noise1(x * 4.37 + 1.9) * 0.12;

// colour helpers (arrays 0..255)
function hex(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const shade = (c, k) => (k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k));
const mulc = (c, m) => [c[0] * m[0], c[1] * m[1], c[2] * m[2]];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem('damta.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('damta.' + k, JSON.stringify(v)); } catch (e) {} },
};

function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

class Spring {
  constructor(k = 220, d = 14) { this.k = k; this.d = d; this.x = 0; this.v = 0; this.target = 0; }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)); const h = dt / n;
    for (let i = 0; i < n; i++) { const f = -this.k * (this.x - this.target) - this.d * this.v; this.v += f * h; this.x += this.v * h; }
    return this.x;
  }
  kick(v) { this.v += v; }
}

// soft radial glow
function glow(ctx, x, y, r, col, a) {
  if (r <= 0 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.35, rgba(col, a * 0.45));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// out-of-focus light disc with a brighter rim
function bokeh(ctx, x, y, r, col, a) {
  if (r <= 0 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a * 0.55));
  g.addColorStop(0.72, rgba(col, a * 0.7));
  g.addColorStop(0.9, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// linear gradient across a cylinder (perpendicular to its axis). stops: [pos, colourArray, alpha]
function cylGrad(ctx, x0, y0, x1, y1, base, opt = {}) {
  const hi = opt.hi ?? 0.55, lo = opt.lo ?? 0.45, spec = opt.spec ?? 0.8;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(shade(base, -lo * 0.9)));
  g.addColorStop(0.1, rgba(shade(base, -lo * 0.35)));
  g.addColorStop(0.24, rgba(shade(base, hi * 0.6)));
  g.addColorStop(0.31, rgba(shade(base, hi * spec)));
  g.addColorStop(0.4, rgba(shade(base, hi * 0.3)));
  g.addColorStop(0.68, rgba(shade(base, -lo * 0.25)));
  g.addColorStop(0.88, rgba(shade(base, -lo * 0.65)));
  g.addColorStop(1, rgba(shade(base, -lo)));
  return g;
}
