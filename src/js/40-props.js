// ───────────────────────── props: cigarettes, e-cig devices, lighters, pack ─────────────────────────
const CIGS = {
  regular: { id: 'regular', name: '레드', len: 84, filter: 25, dia: 7.8, paper: [247, 245, 240], tip: 'cork', band: [168, 48, 44], ash: [150, 146, 141], burn: 1, smoke: 1, maxAsh: 15, vent: 1, pack: { body: [186, 32, 36], body2: [122, 16, 22], accent: [246, 243, 238], inner: [236, 232, 226], mark: 'slash' } },
  light: { id: 'light', name: '라이트', len: 84, filter: 25, dia: 7.8, paper: [249, 249, 247], tip: 'white', band: [120, 146, 182], ash: [160, 156, 150], burn: 1.05, smoke: 0.68, maxAsh: 14, vent: 3, pack: { body: [236, 237, 238], body2: [196, 199, 204], accent: [64, 98, 150], inner: [246, 246, 246], mark: 'bar' } },
  slim: { id: 'slim', name: '슈퍼슬림', len: 100, filter: 30, dia: 5.4, paper: [249, 249, 247], tip: 'white', band: [150, 154, 162], ash: [160, 156, 151], burn: 1.15, smoke: 0.7, maxAsh: 13, vent: 2, pack: { body: [244, 244, 242], body2: [206, 208, 211], accent: [40, 44, 52], inner: [248, 248, 248], mark: 'line', slim: true } },
  capsule: { id: 'capsule', name: '캡슐', len: 84, filter: 27, dia: 7.6, paper: [248, 248, 246], tip: 'white', band: [52, 178, 148], capsule: true, ash: [152, 148, 144], burn: 1, smoke: 0.9, maxAsh: 14, vent: 2, pack: { body: [24, 26, 28], body2: [8, 9, 10], accent: [96, 236, 192], inner: [40, 42, 44], mark: 'dot' } },
  black: { id: 'black', name: '블랙', len: 84, filter: 25, dia: 7.8, paper: [28, 28, 30], tip: 'black', band: [150, 152, 160], ash: [112, 108, 104], burn: 1, smoke: 1.05, maxAsh: 14, vent: 1, pack: { body: [16, 16, 17], body2: [4, 4, 5], accent: [92, 94, 100], inner: [32, 32, 34], mark: 'emboss' } },
  cigarillo: { id: 'cigarillo', name: '시가릴로', len: 104, filter: 16, dia: 9.4, paper: [96, 62, 39], tip: 'wood', cigar: true, ash: [198, 194, 186], burn: 0.72, smoke: 1.6, maxAsh: 24, pack: { body: [58, 40, 28], body2: [30, 20, 12], accent: [200, 170, 130], inner: [150, 116, 82], tin: true } },
  rolled: { id: 'rolled', name: '말아피기', len: 70, filter: 14, dia: 7.0, paper: [240, 233, 216], tip: 'crutch', rolled: true, ash: [132, 126, 120], burn: 1.25, smoke: 1.15, maxAsh: 11, pack: { body: [150, 152, 156], body2: [92, 94, 100], accent: [226, 228, 232], inner: [200, 202, 206], tin: true } },
};
const VAPES = {
  pod: { id: 'pod', name: '입호흡', kind: 'pod', w: 22, h: 92, cloud: 1.45, flavors: true, drawMax: 3.2 },
  mod: { id: 'mod', name: '폐호흡', kind: 'mod', w: 38, h: 136, cloud: 3.1, flavors: true, drawMax: 4.2 },
  dispo: { id: 'dispo', name: '일회용', kind: 'dispo', w: 21, h: 88, cloud: 1.35, flavors: true, drawMax: 3.2 },
  heat: { id: 'heat', name: '궐련형', kind: 'heat', w: 19, h: 86, cloud: 0.75, stick: true, preheat: 6, puffs: 14, drawMax: 3 },
  hybrid: { id: 'hybrid', name: '하이브리드', kind: 'hybrid', w: 24, h: 92, cloud: 1.15, stick: true, preheat: 4.5, puffs: 14, flavors: true, drawMax: 3.2 },
};
const FLAVORS = [
  { id: 'mint', c: [92, 224, 192] }, { id: 'ice', c: [140, 205, 255] }, { id: 'grape', c: [150, 96, 240] },
  { id: 'peach', c: [255, 150, 130] }, { id: 'mango', c: [255, 190, 70] }, { id: 'tobacco', c: [190, 130, 70] },
];
const LIGHTERS = {
  bic: { id: 'bic', name: '일반', flameLen: 24, flameW: 7.5, rate: 1 / 0.95 },
  torch: { id: 'torch', name: '터보', flameLen: 21, flameW: 4, rate: 1 / 0.45 },
  oil: { id: 'oil', name: '오일', flameLen: 30, flameW: 10, rate: 1 / 0.8 },
  match: { id: 'match', name: '성냥', flameLen: 19, flameW: 7, rate: 1 / 1.05 },
};

const Props = (() => {
  const cache = new Map();
  // multiply a sprite by the scene light, keeping its alpha (cached per light level)
  function tint(sp, amb) {
    const key = amb.map((v) => Math.round(clamp(v, 0, 1) * 48)).join(',');
    if (sp._tk === key && sp._tc) return sp._tc;
    const src = sp.canvas || sp.front;
    const c = sp._tc && sp._tc.width === src.width && sp._tc.height === src.height ? sp._tc : makeCanvas(src.width, src.height);
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = `rgb(${(clamp(amb[0], 0, 1) * 255) | 0},${(clamp(amb[1], 0, 1) * 255) | 0},${(clamp(amb[2], 0, 1) * 255) | 0})`;
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-over';
    sp._tk = key; sp._tc = c;
    return c;
  }
  const tc = (c, amb) => [c[0] * clamp(amb[0], 0, 1), c[1] * clamp(amb[1], 0, 1), c[2] * clamp(amb[2], 0, 1)];
  // ── cigarette sprite (static, high-res)
  function cigSprite(T, k) {
    const key = 'cig:' + T.id + ':' + k.toFixed(2);
    if (cache.has(key)) return cache.get(key);
    const R = T.dia / 2, pad = 2.5;
    const c = makeCanvas((T.len + pad * 2) * k, (T.dia + pad * 2) * k), x = c.getContext('2d');
    const r = mulberry(T.len * 31 + T.dia * 7);
    x.scale(k, k); x.translate(pad, pad + R);
    const body = () => { x.beginPath(); x.moveTo(0.5, -R); x.lineTo(T.len, -R); x.lineTo(T.len, R); x.lineTo(0.5, R); x.quadraticCurveTo(0, R, 0, R - 0.5); x.lineTo(0, -R + 0.5); x.quadraticCurveTo(0, -R, 0.5, -R); x.closePath(); };
    x.save(); body(); x.clip();
    // paper / wrapper
    x.fillStyle = cylGrad(x, 0, -R, 0, R, T.paper, { hi: T.tip === 'black' ? 0.3 : 0.5, lo: T.tip === 'black' ? 0.35 : 0.32, spec: T.tip === 'black' ? 1 : 0.7 });
    x.fillRect(T.filter - 0.5, -R, T.len - T.filter + 1, T.dia);
    if (T.cigar) {
      for (let i = 0; i < 90; i++) { x.fillStyle = rgba(shade(T.paper, (r() - 0.5) * 0.5), 0.25); x.beginPath(); x.ellipse(T.filter + r() * (T.len - T.filter), (r() - 0.5) * T.dia, 1 + r() * 4, 0.3 + r() * 0.8, (r() - 0.5) * 0.5, 0, TAU); x.fill(); }
      x.strokeStyle = rgba(shade(T.paper, -0.35), 0.5); x.lineWidth = 0.18;
      for (let s = T.filter + 2; s < T.len + 10; s += 9 + r() * 4) { x.beginPath(); x.moveTo(s, -R); x.bezierCurveTo(s - 3, -R * 0.3, s - 4, R * 0.3, s - 8, R); x.stroke(); }
      x.strokeStyle = rgba(shade(T.paper, 0.25), 0.25); x.lineWidth = 0.1;
      for (let i = 0; i < 40; i++) { const s = T.filter + r() * (T.len - T.filter); x.beginPath(); x.moveTo(s, -R); x.lineTo(s - 2 - r() * 4, R * (r() * 2 - 1)); x.stroke(); }
    } else {
      x.fillStyle = 'rgba(0,0,0,0.03)';
      for (let yy = -R; yy < R; yy += 0.17) if (r() < 0.55) x.fillRect(T.filter, yy, T.len - T.filter, 0.035 + r() * 0.04);
      if (T.tip === 'black') { x.fillStyle = 'rgba(255,255,255,0.025)'; for (let yy = -R; yy < R; yy += 0.2) if (r() < 0.4) x.fillRect(T.filter, yy, T.len - T.filter, 0.03); }
      x.fillStyle = rgba(shade(T.paper, -0.14), 0.55); x.fillRect(T.filter, R * 0.52, T.len - T.filter, 0.22);
      if (T.rolled) {
        for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(140,96,50,${0.05 + r() * 0.08})`; x.lineWidth = 0.15 + r() * 0.3; const s = T.filter + r() * (T.len - T.filter); x.beginPath(); x.moveTo(s, -R + r() * T.dia); x.lineTo(s + 2 + r() * 5, -R + r() * T.dia); x.stroke(); }
        x.strokeStyle = 'rgba(0,0,0,0.05)'; x.lineWidth = 0.15;
        for (let i = 0; i < 9; i++) { const s = T.filter + r() * (T.len - T.filter); x.beginPath(); x.moveTo(s, -R); x.lineTo(s + 4, R); x.stroke(); }
      }
    }
    // tip end tobacco / foot
    if (!T.rolled) {
      x.fillStyle = T.cigar ? 'rgba(60,36,20,0.6)' : 'rgba(120,84,48,0.35)'; x.fillRect(T.len - 0.35, -R, 0.35, T.dia);
    }
    // filter / tipping
    const tipBase = { cork: [204, 138, 74], white: [244, 243, 240], black: [30, 30, 32], crutch: [238, 230, 214], wood: [198, 150, 96] }[T.tip];
    x.fillStyle = cylGrad(x, 0, -R, 0, R, tipBase, { hi: T.tip === 'black' ? 0.25 : 0.45, lo: 0.36, spec: T.tip === 'black' ? 1.2 : 0.8 });
    x.fillRect(0, -R, T.filter, T.dia);
    if (T.tip === 'cork') {
      for (let i = 0; i < T.filter * T.dia * 9; i++) { const dk = r() < 0.6; x.fillStyle = dk ? `rgba(130,74,30,${0.18 + r() * 0.3})` : `rgba(240,196,140,${0.15 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * T.filter, (r() * 2 - 1) * R, 0.1 + r() * 0.35, 0.06 + r() * 0.16, r() * 3, 0, TAU); x.fill(); }
      x.fillStyle = cylGrad(x, 0, -R, 0, R, [128, 128, 128], { hi: 0.4, lo: 0.4 }); x.globalAlpha = 0.25; x.globalCompositeOperation = 'overlay'; x.fillRect(0, -R, T.filter, T.dia); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    } else if (T.tip === 'wood') {
      x.strokeStyle = 'rgba(120,80,40,0.35)'; x.lineWidth = 0.12;
      for (let yy = -R; yy < R; yy += 0.45) { x.beginPath(); x.moveTo(0, yy); for (let s = 0; s <= T.filter; s += 2) x.lineTo(s, yy + Math.sin(s * 0.5 + yy * 3) * 0.15); x.stroke(); }
    } else if (T.tip === 'white' || T.tip === 'crutch') {
      x.fillStyle = 'rgba(0,0,0,0.025)'; for (let i = 0; i < 300; i++) x.fillRect(r() * T.filter, (r() * 2 - 1) * R, 0.2 + r() * 0.6, 0.05);
    }
    // ventilation holes
    if (!T.rolled && !T.cigar) {
      x.fillStyle = T.tip === 'black' ? 'rgba(255,255,255,0.18)' : T.tip === 'white' ? 'rgba(120,120,120,0.3)' : 'rgba(80,50,30,0.35)';
      for (let v = 0; v < (T.vent || 1); v++) for (let yy = -R * 0.85; yy < R * 0.85; yy += 0.62) { const sc = Math.sqrt(1 - (yy / R) ** 2); x.beginPath(); x.ellipse(T.filter - 8.5 - v * 0.9, yy + (v % 2) * 0.31, 0.13, 0.13 * sc, 0, 0, TAU); x.fill(); }
    }
    // metallic band + seam
    if (!T.rolled) {
      x.fillStyle = cylGrad(x, 0, -R, 0, R, T.band, { hi: 0.6, lo: 0.4, spec: 1.2 });
      x.fillRect(T.filter - 1.6, -R, 0.45, T.dia); x.fillRect(T.filter - 0.9, -R, 0.2, T.dia);
    }
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(T.filter, -R, 0.12, T.dia);
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(T.filter + 0.12, -R, 0.08, T.dia);
    // capsule marker
    if (T.capsule) {
      x.fillStyle = rgba(T.band, 0.9); x.beginPath(); x.ellipse(T.filter * 0.48, -R * 0.12, 1.25, 1.1, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 0.22; x.beginPath(); x.ellipse(T.filter * 0.48, -R * 0.12, 1.75, 1.55, 0, 0, TAU); x.stroke();
    }
    // tiny emblem on the paper
    if (!T.rolled) {
      const ex = T.filter + (T.cigar ? 5 : 6.5);
      if (T.cigar) {
        x.fillStyle = cylGrad(x, 0, -R, 0, R, [190, 30, 30], { hi: 0.4, lo: 0.4 }); x.fillRect(T.filter + 2, -R, 7, T.dia);
        x.fillStyle = cylGrad(x, 0, -R, 0, R, [214, 176, 96], { hi: 0.7, lo: 0.4, spec: 1.3 }); x.fillRect(T.filter + 2, -R, 0.6, T.dia); x.fillRect(T.filter + 8.4, -R, 0.6, T.dia);
        x.fillStyle = 'rgba(240,210,140,0.9)'; x.beginPath(); x.arc(T.filter + 5.5, -R * 0.15, 1.2, 0, TAU); x.fill();
      } else {
        x.fillStyle = T.tip === 'black' ? 'rgba(150,152,160,0.6)' : rgba(shade(T.band, -0.1), 0.7);
        x.fillRect(ex, -R * 0.3, 0.5, 0.5);
        x.fillRect(ex + 1.1, -R * 0.3 + 0.15, 3.4, 0.2);
      }
    }
    // ends shading
    const eg = x.createLinearGradient(0, 0, 1.2, 0); eg.addColorStop(0, 'rgba(0,0,0,0.22)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = eg; x.fillRect(0, -R, 1.2, T.dia);
    x.restore();
    // rolled: twisted tip
    if (T.rolled) {
      x.fillStyle = cylGrad(x, 0, -R, 0, R, T.paper, { hi: 0.45, lo: 0.35 });
      x.beginPath(); x.moveTo(T.len - 0.2, -R); x.quadraticCurveTo(T.len + 1.6, -R * 0.4, T.len + 2.3, -0.2); x.lineTo(T.len + 2.3, 0.3); x.quadraticCurveTo(T.len + 1.4, R * 0.5, T.len - 0.2, R); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 0.12; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(T.len - 0.2, -R + i * 1.6); x.quadraticCurveTo(T.len + 1, -R * 0.2 + i * 0.4, T.len + 2.2, 0); x.stroke(); }
    } else if (!T.cigar) {
      x.fillStyle = 'rgba(96,64,36,0.7)';
      for (let i = 0; i < 26; i++) { const yy = (r() * 2 - 1) * R * 0.95; x.fillRect(T.len - 0.1, yy, 0.15 + r() * 0.4, 0.1 + r() * 0.12); }
    }
    const S = { canvas: c, k, pad, R };
    cache.set(key, S);
    return S;
  }

  // ── ash (procedural, deterministic per seed)
  function drawAsh(ctx, T, len, R, heat, seed, rings, burnPos) {
    if (len < 0.15) return;
    const ac = T.ash;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.99);
    for (let s = 0; s <= len; s += 0.55) ctx.lineTo(s, -R * (0.94 + 0.06 * noise2(s * 0.8 + seed, 1.3)) - Math.max(0, s - len + 1.2) * 0.25);
    ctx.quadraticCurveTo(len + R * 0.22, -R * 0.2 + noise1(seed) * 0.4, len + R * 0.05, R * 0.4);
    for (let s = len; s >= 0; s -= 0.55) ctx.lineTo(s, R * (0.94 + 0.06 * noise2(s * 0.8 + seed, 4.1)) + Math.max(0, s - len + 1.2) * 0.15);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, len + 0.5, 0);
    g.addColorStop(0, 'rgb(20,17,15)');
    g.addColorStop(Math.min(0.85, 0.9 / (len + 0.5)), 'rgb(44,40,37)');
    g.addColorStop(Math.min(0.9, 2.0 / (len + 0.5)), rgba(shade(ac, -0.3)));
    g.addColorStop(Math.min(0.95, 3.5 / (len + 0.5)), rgba(shade(ac, -0.08)));
    g.addColorStop(1, rgba(shade(ac, 0.16)));
    ctx.fillStyle = g; ctx.fill();
    const g2 = ctx.createLinearGradient(0, -R, 0, R);
    g2.addColorStop(0, 'rgba(255,255,255,0.2)'); g2.addColorStop(0.28, 'rgba(255,255,255,0.07)'); g2.addColorStop(0.62, 'rgba(0,0,0,0.12)'); g2.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g2; ctx.fill();
    ctx.save(); ctx.clip();
    const r = mulberry(seed * 1000 | 0);
    if (rings) for (const rp of rings) { const s = rp - burnPos; if (s > 0.3 && s < len) { ctx.fillStyle = 'rgba(26,24,22,0.45)'; ctx.fillRect(s - 0.15, -R, 0.3, R * 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(s + 0.15, -R, 0.22, R * 2); } }
    for (let s = 0.6; s < len; s += 0.7 + r() * 0.9) { ctx.fillStyle = `rgba(30,28,26,${0.08 + r() * 0.12})`; ctx.fillRect(s, -R, 0.12, R * 2); }
    const n = Math.min(320, len * 14);
    for (let i = 0; i < n; i++) {
      const s = r() * len, yy = (r() * 2 - 1) * R, sz = 0.06 + r() * 0.2;
      ctx.fillStyle = r() < 0.55 ? `rgba(236,234,228,${0.18 + r() * 0.3})` : `rgba(40,36,34,${0.15 + r() * 0.3})`;
      ctx.fillRect(s, yy, sz * 1.8, sz);
    }
    ctx.strokeStyle = 'rgba(30,28,26,0.25)'; ctx.lineWidth = 0.08;
    for (let i = 0; i < len * 0.8; i++) { const s = r() * len; ctx.beginPath(); ctx.moveTo(s, -R); ctx.lineTo(s + (r() - 0.5) * 1.2, -R + r() * R * 1.4); ctx.stroke(); }
    if (heat > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      const hot = Math.min(len, 1.8);
      for (let i = 0; i < 26; i++) { const s = Math.pow(r(), 1.8) * hot, yy = (r() * 2 - 1) * R * 0.95; const a = heat * (1 - s / (hot + 0.01)) * (0.4 + 0.6 * r()); ctx.fillStyle = `rgba(255,${(90 + 120 * a) | 0},30,${a})`; ctx.fillRect(s, yy, 0.25 + r() * 0.4, 0.15 + r() * 0.2); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // ── cigarette (dynamic)
  // st: { x,y,ang,sc,S,burn,ash,heat,lit,lightP,popped,seed,ashSeed,droop,rings,t,amb,dpr,fade }
  function drawCig(ctx, T, st) {
    const R = T.dia / 2, k = Math.max(4, st.S * st.dpr * 1.25 * Math.max(1, st.sc));
    const sp = cigSprite(T, Math.min(26, Math.round(k * 2) / 2));
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.scale(st.sc * st.S, st.sc * st.S);
    ctx.globalAlpha = st.fade ?? 1;
    const bx = st.lit || st.lightP > 0 ? st.burn : T.len;
    const jag = (yy) => noise2(yy * 1.1 + st.seed, st.t * 0.12) * 0.32 + (T.rolled ? yy * 0.16 : 0) + (yy / R) * (yy / R) * 0.18;
    const clip = () => {
      ctx.beginPath(); ctx.moveTo(-1, -R - 1); ctx.lineTo(bx + jag(-R), -R - 1);
      for (let i = 0; i <= 8; i++) { const yy = -R + (2 * R * i) / 8; ctx.lineTo(bx + jag(yy), yy); }
      ctx.lineTo(bx + jag(R), R + 1); ctx.lineTo(-1, R + 1); ctx.closePath();
    };
    // drop shadow for separation from the background
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16 * st.dpr * st.sc; ctx.shadowOffsetY = 5 * st.dpr * st.sc;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rrect(ctx, 0.3, -R * 0.9, bx - 0.6, R * 1.8, R * 0.8); ctx.fill();
    ctx.restore();
    ctx.save(); clip(); ctx.clip();
    ctx.drawImage(tint(sp, st.amb), -sp.pad, -sp.pad - R, sp.canvas.width / sp.k, sp.canvas.height / sp.k);
    // rim light from the top
    const rim = ctx.createLinearGradient(0, -R, 0, -R * 0.4);
    rim.addColorStop(0, `rgba(255,255,255,${0.16 * (st.rim ?? 1)})`); rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim; ctx.fillRect(0, -R, bx, R * 0.6);
    if (st.lit || st.lightP > 0) {
      const heat = st.heat;
      // warm light from the coal on the paper
      ctx.globalCompositeOperation = 'lighter';
      const wl = ctx.createRadialGradient(bx, 0, 0, bx, 0, 9);
      wl.addColorStop(0, `rgba(255,120,40,${0.08 + heat * 0.3})`); wl.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = wl; ctx.fillRect(bx - 9, -R, 9, T.dia);
      ctx.globalCompositeOperation = 'source-over';
      // scorched paper: yellowing → brown → black right at the burn edge
      const sg = ctx.createLinearGradient(bx - 4.2, 0, bx + 0.25, 0);
      sg.addColorStop(0, 'rgba(190,140,70,0)'); sg.addColorStop(0.35, 'rgba(185,135,70,0.18)'); sg.addColorStop(0.62, 'rgba(120,74,36,0.5)'); sg.addColorStop(0.82, 'rgba(52,30,16,0.88)'); sg.addColorStop(0.94, 'rgba(22,14,10,1)'); sg.addColorStop(1, 'rgba(12,8,6,1)');
      ctx.fillStyle = sg; ctx.fillRect(bx - 4.2, -R - 1, 4.6, T.dia + 2);
    }
    ctx.restore();
    if (st.capsule && st.popped) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(T.filter * 0.48, -R * 0.12, 1.6, 1.4, 0, 0, TAU); ctx.fill();
    }
    if (st.lit || st.lightP > 0) {
      const heat = st.heat;
      // ash
      ctx.save();
      ctx.translate(bx, 0); ctx.rotate(st.droop || 0);
      drawAsh(ctx, T, st.ash, R, heat, st.ashSeed, st.rings, st.burn);
      ctx.restore();
      // glowing coal: an area of heat at the paper edge that shines through the base of the ash
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.86 + 0.14 * noise1(st.t * 6.5 + st.seed);
      const h = clamp(heat * fl, 0, 1);
      const cl = 0.9 + h * 1.4 + Math.min(st.ash, 1.2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx + jag(-R) - 0.25, -R * 0.98);
      for (let i = 0; i <= 8; i++) { const yy = -R + (2 * R * i) / 8; ctx.lineTo(bx + jag(yy) - 0.25, yy * 0.98); }
      ctx.lineTo(bx + cl, R * 0.9); ctx.quadraticCurveTo(bx + cl + R * 0.25, 0, bx + cl, -R * 0.9); ctx.closePath();
      const cg = ctx.createLinearGradient(bx - 0.3, 0, bx + cl, 0);
      cg.addColorStop(0, `rgba(255,${(70 + 120 * h) | 0},${(14 + 60 * h) | 0},${0.55 + 0.45 * h})`);
      cg.addColorStop(0.35, `rgba(255,${(50 + 80 * h) | 0},12,${0.22 + 0.5 * h})`);
      cg.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = cg; ctx.fill();
      // embers inside the coal
      const rr = mulberry((st.seed * 977 + Math.floor(st.t * 9)) | 0);
      const n = 8 + h * 26;
      for (let i = 0; i < n; i++) {
        const xx = bx - 0.2 + Math.pow(rr(), 1.6) * cl * 0.9, yy = (rr() * 2 - 1) * R * 0.92;
        const a = (0.25 + 0.75 * rr()) * (0.35 + 0.65 * h) * (1 - (xx - bx) / (cl + 0.01));
        ctx.fillStyle = `rgba(255,${(150 + 100 * h * rr()) | 0},${(60 + 120 * h) | 0},${a})`;
        ctx.fillRect(xx, yy, 0.18 + rr() * 0.35, 0.12 + rr() * 0.2);
      }
      // rim of fire along the paper edge
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = -R + (2 * R * i) / 8; const xx = bx + jag(yy) - 0.1; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.strokeStyle = `rgba(255,${(90 + 110 * h) | 0},${(30 + 70 * h) | 0},${0.18 + 0.55 * h})`; ctx.lineWidth = 0.32 + h * 0.3; ctx.stroke();
      // bloom
      const gr = R * (2.4 + h * 3.6);
      const gg = ctx.createRadialGradient(bx + 0.8, 0, 0, bx + 0.8, 0, gr);
      gg.addColorStop(0, `rgba(255,${(100 + 90 * h) | 0},40,${0.12 + 0.45 * h})`); gg.addColorStop(0.35, `rgba(255,80,20,${0.04 + 0.16 * h})`); gg.addColorStop(1, 'rgba(255,70,20,0)');
      ctx.fillStyle = gg; ctx.fillRect(bx + 0.8 - gr, -gr, gr * 2, gr * 2);
      if (st.lightP > 0 && st.lightP < 1) { const lg = ctx.createRadialGradient(T.len, 0, 0, T.len, 0, R * 2.6); lg.addColorStop(0, `rgba(255,150,60,${st.lightP * 0.65})`); lg.addColorStop(1, 'rgba(255,100,30,0)'); ctx.fillStyle = lg; ctx.fillRect(T.len - R * 2.6, -R * 2.6, R * 5.2, R * 5.2); }
      ctx.restore();
    }
    ctx.restore();
  }
  // local point on the cigarette → screen
  function cigPoint(st, lx, ly) {
    const c = Math.cos(st.ang), s = Math.sin(st.ang), k = st.sc * st.S;
    return [st.x + (lx * c - ly * s) * k, st.y + (lx * s + ly * c) * k];
  }

  // ── flames
  function teardrop(ctx, len, wid, bend) {
    ctx.beginPath();
    ctx.moveTo(0, wid * 0.18);
    ctx.bezierCurveTo(wid * 0.95, wid * 0.1, wid * 0.55 + bend * 0.35, -len * 0.5, bend, -len);
    ctx.bezierCurveTo(-wid * 0.55 + bend * 0.35, -len * 0.5, -wid * 0.95, wid * 0.1, 0, wid * 0.18);
    ctx.closePath();
  }
  function drawFlame(ctx, x, y, len, wid, t, wind, kind, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    if (kind === 'jet') {
      const L = len * (0.96 + 0.04 * noise1(t * 40)), W = wid;
      const hg = ctx.createRadialGradient(0, -L * 0.4, 0, 0, -L * 0.4, L * 1.3);
      hg.addColorStop(0, `rgba(120,160,255,${0.22 * a})`); hg.addColorStop(1, 'rgba(120,160,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(-L * 1.3, -L * 1.7, L * 2.6, L * 2.6);
      for (const [l, w, c0, c1] of [[L, W, [100, 140, 255, 0.6], [80, 120, 255, 0]], [L * 0.62, W * 0.5, [200, 230, 255, 0.95], [160, 200, 255, 0]], [L * 0.3, W * 0.25, [255, 255, 255, 1], [220, 240, 255, 0]]]) {
        const g = ctx.createLinearGradient(0, 0, 0, -l);
        g.addColorStop(0, `rgba(${c0[0]},${c0[1]},${c0[2]},${c0[3] * a})`); g.addColorStop(1, `rgba(${c1[0]},${c1[1]},${c1[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(-w * 0.55, -l * 0.5, wind * l * 0.04, -l); ctx.quadraticCurveTo(w * 0.55, -l * 0.5, w / 2, 0); ctx.closePath(); ctx.fill();
      }
    } else {
      const fl = 1 + 0.08 * noise1(t * 9.3) + 0.04 * noise1(t * 23.7);
      const L = len * fl * (kind === 'oil' ? 1 + 0.06 * noise1(t * 3.1) : 1), W = wid * (1 + 0.05 * noise1(t * 11));
      const bend = wind * L * 0.42 + noise1(t * 4.7 + 3) * L * 0.09;
      const hg = ctx.createRadialGradient(bend * 0.3, -L * 0.42, 0, bend * 0.3, -L * 0.42, L * 1.9);
      hg.addColorStop(0, `rgba(255,150,60,${0.26 * a})`); hg.addColorStop(0.4, `rgba(255,110,40,${0.08 * a})`); hg.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = hg; ctx.fillRect(-L * 2, -L * 2.3, L * 4, L * 4);
      teardrop(ctx, L, W, bend);
      const g = ctx.createLinearGradient(0, W * 0.2, bend, -L);
      g.addColorStop(0, `rgba(60,110,255,${0.5 * a})`); g.addColorStop(0.16, `rgba(255,140,60,${0.7 * a})`); g.addColorStop(0.45, `rgba(255,176,80,${0.85 * a})`); g.addColorStop(0.82, `rgba(255,120,40,${0.4 * a})`); g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.translate(0, -L * 0.08); teardrop(ctx, L * 0.6, W * 0.52, bend * 0.6);
      const g2 = ctx.createLinearGradient(0, 0, bend * 0.6, -L * 0.6);
      g2.addColorStop(0, `rgba(130,170,255,${0.3 * a})`); g2.addColorStop(0.25, `rgba(255,244,214,${0.95 * a})`); g2.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g2; ctx.fill(); ctx.restore();
      ctx.fillStyle = `rgba(70,120,255,${0.55 * a})`; ctx.beginPath(); ctx.ellipse(0, -W * 0.05, W * 0.5, W * 0.3, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ── lighter sprites
  const BIC_COLS = [[30, 30, 33], [190, 36, 36], [30, 52, 92], [86, 98, 68], [226, 226, 222], [222, 104, 36]];
  function lighterSprite(kind, k, col) {
    const key = 'lt:' + kind + ':' + k.toFixed(2) + ':' + (col ? col.join(',') : '');
    if (cache.has(key)) return cache.get(key);
    const box = { bic: [-14, -4, 28, 90], torch: [-15, -8, 30, 92], oil: [-21, -14, 42, 80], match: [-4, -4, 8, 54] }[kind];
    const c = makeCanvas(box[2] * k, box[3] * k), x = c.getContext('2d');
    x.scale(k, k); x.translate(-box[0], -box[1]);
    if (kind === 'bic') {
      // body
      x.save(); rrect(x, -12, 12, 24, 72, 5); x.clip();
      x.fillStyle = cylGrad(x, -12, 0, 12, 0, col, { hi: 0.5, lo: 0.5, spec: 1 }); x.fillRect(-12, 12, 24, 72);
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(-12, 46, 24, 38);
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(-12, 46, 24, 0.5);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(-7.5, 14, 2.2, 68);
      x.restore();
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-12, 12, 24, 1.2);
      // metal hood
      x.fillStyle = cylGrad(x, -12, 0, 12, 0, [196, 200, 206], { hi: 0.7, lo: 0.6, spec: 1.3 }); rrect(x, -11, -1, 22, 14, 1.4); x.fill();
      x.fillStyle = 'rgba(40,40,44,0.75)';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { x.beginPath(); x.arc(-7.5 + i * 3.4, 4 + j * 4, 0.65, 0, TAU); x.fill(); }
      // fork button
      x.fillStyle = cylGrad(x, -12, 0, 12, 0, col, { hi: 0.3, lo: 0.6 }); rrect(x, -10, 9, 13, 5, 1); x.fill();
      // nozzle
      x.fillStyle = '#9aa0a6'; x.fillRect(-1.2, -2.5, 2.4, 3);
    } else if (kind === 'torch') {
      x.save(); rrect(x, -13, 8, 26, 76, 6); x.clip();
      x.fillStyle = cylGrad(x, -13, 0, 13, 0, [40, 42, 48], { hi: 0.55, lo: 0.5, spec: 1.2 }); x.fillRect(-13, 8, 26, 76);
      x.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = 10; yy < 84; yy += 0.8) x.fillRect(-13, yy, 26, 0.2);
      x.fillStyle = cylGrad(x, -13, 0, 13, 0, [180, 140, 70], { hi: 0.6, lo: 0.5, spec: 1.3 }); x.fillRect(-13, 30, 26, 1.4); x.fillRect(-13, 68, 26, 1.4);
      x.restore();
      x.fillStyle = cylGrad(x, -10, 0, 10, 0, [205, 210, 216], { hi: 0.7, lo: 0.6, spec: 1.4 }); rrect(x, -9, -6, 18, 15, 3); x.fill();
      x.fillStyle = '#222'; x.beginPath(); x.ellipse(0, -5.6, 3.2, 1, 0, 0, TAU); x.fill();
      x.fillStyle = cylGrad(x, 8, 0, 14, 0, [210, 60, 50], { hi: 0.5, lo: 0.5 }); rrect(x, 9, 12, 6, 13, 2); x.fill();
    } else if (kind === 'oil') {
      // bottom case
      const steel = [196, 200, 206];
      x.save(); rrect(x, -19, 20, 38, 44, 4); x.clip();
      x.fillStyle = cylGrad(x, -19, 0, 19, 0, steel, { hi: 0.6, lo: 0.55, spec: 1.2 }); x.fillRect(-19, 20, 38, 44);
      x.fillStyle = 'rgba(0,0,0,0.05)'; for (let yy = 20; yy < 64; yy += 0.35) x.fillRect(-19, yy, 38, 0.1);
      x.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = 20.15; yy < 64; yy += 0.5) x.fillRect(-19, yy, 38, 0.08);
      x.restore();
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-19, 20, 38, 0.6);
      // chimney with holes
      x.fillStyle = cylGrad(x, -9, 0, 9, 0, [210, 212, 216], { hi: 0.7, lo: 0.6, spec: 1.3 }); x.fillRect(-9, -3, 18, 23);
      x.fillStyle = 'rgba(20,20,22,0.85)';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { x.beginPath(); x.arc(-5.6 + i * 3.7, 2.5 + j * 4.2, 0.95, 0, TAU); x.fill(); }
      // wheel + cam
      x.fillStyle = '#4a4e54'; x.fillRect(9, -4, 3, 22);
      x.fillStyle = cylGrad(x, 8, 0, 15, 0, [110, 114, 120], { hi: 0.6, lo: 0.5 }); x.beginPath(); x.arc(11.5, -6, 3.6, 0, TAU); x.fill();
      x.fillStyle = '#2a2c30'; x.beginPath(); x.arc(-0.5, -1.2, 1.3, 0, TAU); x.fill();
    } else if (kind === 'match') {
      const wood = [222, 190, 140];
      x.fillStyle = cylGrad(x, -1.3, 0, 1.3, 0, wood, { hi: 0.4, lo: 0.4 }); x.fillRect(-1.3, 2, 2.6, 48);
      x.fillStyle = 'rgba(120,80,40,0.25)'; for (let yy = 4; yy < 50; yy += 3) x.fillRect(-1.3, yy, 2.6, 0.15);
    }
    const S = { canvas: c, k, box };
    cache.set(key, S);
    return S;
  }
  function oilLid(ctx, open, amb) {
    // lid hinges at (19,20); open: 0 closed → 1 fully open
    ctx.save();
    ctx.translate(19, 20); ctx.rotate(open * 2.55); ctx.translate(-19, -20);
    ctx.save(); rrect(ctx, -19, -12, 38, 32, 4); ctx.clip();
    ctx.fillStyle = cylGrad(ctx, -19, 0, 19, 0, tc([200, 204, 210], amb), { hi: 0.6, lo: 0.55, spec: 1.2 }); ctx.fillRect(-19, -12, 38, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let yy = -12; yy < 20; yy += 0.35) ctx.fillRect(-19, yy, 38, 0.1);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-19, 19.4, 38, 0.6);
    ctx.restore();
    ctx.fillStyle = '#8a8e94'; ctx.beginPath(); ctx.arc(19, 20, 1.6, 0, TAU); ctx.fill();
  }
  // st: { x,y,ang,sc,S,dpr,flame,open,strike,t,wind,col,burnP(match),amb }
  function drawLighter(ctx, kind, st) {
    const L = LIGHTERS[kind];
    const k = Math.max(3, Math.min(18, Math.round(st.S * st.dpr * 1.2 * 2) / 2));
    const sp = lighterSprite(kind, k, kind === 'bic' ? st.col : null);
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.scale(st.sc * st.S, st.sc * st.S);
    ctx.globalAlpha = st.alpha ?? 1;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18 * st.dpr * st.sc; ctx.shadowOffsetY = 6 * st.dpr * st.sc;
    const b = sp.box;
    ctx.drawImage(tint(sp, st.amb), b[0], b[1], b[2], b[3]);
    ctx.restore();
    if (kind === 'bic') {
      // flint wheel
      ctx.save(); ctx.translate(7.8, -1.2);
      ctx.fillStyle = cylGrad(ctx, -3.4, 0, 3.4, 0, tc([120, 124, 130], st.amb), { hi: 0.6, lo: 0.6 }); ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,30,34,0.7)'; ctx.lineWidth = 0.25;
      const off = (st.strike * 9) % 1;
      for (let i = -3; i <= 3; i++) { const yy = (i + off) * 1.0; if (Math.abs(yy) < 3.2) { ctx.beginPath(); ctx.moveTo(-3.2 * Math.sqrt(1 - (yy / 3.4) ** 2), yy); ctx.lineTo(3.2 * Math.sqrt(1 - (yy / 3.4) ** 2), yy); ctx.stroke(); } }
      ctx.restore();
    } else if (kind === 'oil') {
      oilLid(ctx, st.open, st.amb);
    } else if (kind === 'match') {
      const bp = st.burnP || 0;
      if (bp > 0) { const g = ctx.createLinearGradient(0, 2, 0, 2 + 46 * bp); g.addColorStop(0, '#1a120c'); g.addColorStop(0.8, '#2c1c10'); g.addColorStop(1, 'rgba(60,36,18,0)'); ctx.fillStyle = g; ctx.fillRect(-1.35, 2, 2.7, 46 * bp + 2); }
      ctx.fillStyle = st.flame > 0.05 || bp > 0 ? '#2a1a12' : '#8e2a1c';
      ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 3.4, 0, 0, TAU); ctx.fill();
      if (!(st.flame > 0.05 || bp > 0)) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-0.6, -1.2, 0.6, 1.1, 0, 0, TAU); ctx.fill(); }
    }
    // flame
    if (st.flame > 0.01) {
      const fy = kind === 'oil' ? -3 : kind === 'torch' ? -6 : kind === 'match' ? -1.5 : -2.5;
      drawFlame(ctx, 0, fy, L.flameLen * (0.35 + 0.65 * st.flame), L.flameW * (0.6 + 0.4 * st.flame), st.t, st.wind, kind === 'torch' ? 'jet' : kind, Math.min(1, st.flame * 1.4));
    }
    ctx.restore();
  }

  // ── e-cig devices
  function deviceSprite(V, k, flav) {
    const key = 'dev:' + V.id + ':' + k.toFixed(2) + ':' + (flav ? flav.id : '');
    if (cache.has(key)) return cache.get(key);
    const W = V.w, H = V.h, pad = 4;
    const c = makeCanvas((W + pad * 2) * k, (H + pad * 2) * k), x = c.getContext('2d');
    x.scale(k, k); x.translate(pad + W / 2, pad + H / 2);
    const r = mulberry(V.w * 13 + V.h);
    const fc = flav ? flav.c : [200, 200, 200];
    if (V.kind === 'pod') {
      // body
      x.save(); rrect(x, -W / 2, -H / 2 + 26, W, H - 26, 6); x.clip();
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, [62, 66, 74], { hi: 0.55, lo: 0.6, spec: 1.1 }); x.fillRect(-W / 2, -H / 2, W, H);
      x.fillStyle = 'rgba(255,255,255,0.035)'; for (let xx = -W / 2; xx < W / 2; xx += 0.3) if (r() < 0.6) x.fillRect(xx, -H / 2 + 26, 0.08, H);
      x.restore();
      // pod
      x.save(); rrect(x, -W / 2 + 1, -H / 2 + 6, W - 2, 22, 4); x.clip();
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, [36, 38, 44], { hi: 0.6, lo: 0.4, spec: 1 }); x.fillRect(-W / 2, -H / 2 + 6, W, 22);
      x.restore();
      // mouthpiece
      x.fillStyle = cylGrad(x, -7, 0, 7, 0, [30, 32, 36], { hi: 0.6, lo: 0.5, spec: 1.2 }); rrect(x, -7, -H / 2, 14, 9, 3.5); x.fill();
      x.fillStyle = '#0c0c0e'; x.fillRect(-3.5, -H / 2 + 0.8, 7, 1);
      // seam
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(-W / 2, -H / 2 + 26, W, 0.8);
      // emblem
      x.strokeStyle = 'rgba(220,224,230,0.4)'; x.lineWidth = 0.3; x.beginPath(); x.arc(0, 10, 2.4, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(-1.2, 10); x.lineTo(1.2, 10); x.stroke();
      x.fillStyle = '#1a1b1f'; rrect(x, -3, H / 2 - 3, 6, 1.6, 0.8); x.fill();
    } else if (V.kind === 'dispo') {
      x.save(); rrect(x, -W / 2, -H / 2 + 8, W, H - 8, 7); x.clip();
      const g = x.createLinearGradient(0, -H / 2, 0, H / 2);
      g.addColorStop(0, rgba(shade(fc, 0.35))); g.addColorStop(0.5, rgba(fc)); g.addColorStop(1, rgba(shade(fc, -0.35)));
      x.fillStyle = g; x.fillRect(-W / 2, -H / 2, W, H);
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, [128, 128, 128], { hi: 0.5, lo: 0.6 }); x.globalCompositeOperation = 'overlay'; x.fillRect(-W / 2, -H / 2, W, H); x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 800; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.04})`; x.fillRect((r() - 0.5) * W, (r() - 0.5) * H, 0.25, 0.25); }
      x.restore();
      x.fillStyle = cylGrad(x, -6.5, 0, 6.5, 0, shade(fc, -0.5), { hi: 0.5, lo: 0.5, spec: 1.2 }); rrect(x, -6.5, -H / 2, 13, 11, 4); x.fill();
      x.fillStyle = '#111'; x.fillRect(-3, -H / 2 + 0.8, 6, 0.9);
      x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 0.35; x.beginPath(); x.moveTo(-W / 2 + 3, -H / 2 + 22); x.lineTo(-W / 2 + 3, H / 2 - 12); x.stroke();
    } else if (V.kind === 'mod') {
      const bt = -H / 2 + 52; // body top
      // drip tip
      x.fillStyle = cylGrad(x, -6, 0, 6, 0, [24, 24, 28], { hi: 0.6, lo: 0.5, spec: 1.3 }); rrect(x, -6, -H / 2, 12, 11, 2); x.fill();
      // tank top cap
      x.fillStyle = cylGrad(x, -12, 0, 12, 0, [170, 174, 182], { hi: 0.7, lo: 0.6, spec: 1.4 }); x.fillRect(-12, -H / 2 + 10, 24, 6);
      for (let i = -11; i < 12; i += 1.2) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, -H / 2 + 10, 0.4, 6); }
      // glass (liquid dynamic), chimney
      x.fillStyle = 'rgba(200,215,230,0.12)'; x.fillRect(-11, -H / 2 + 16, 22, 28);
      x.fillStyle = cylGrad(x, -4, 0, 4, 0, [150, 154, 160], { hi: 0.6, lo: 0.6 }); x.fillRect(-4, -H / 2 + 16, 8, 26);
      // base
      x.fillStyle = cylGrad(x, -12, 0, 12, 0, [170, 174, 182], { hi: 0.7, lo: 0.6, spec: 1.4 }); x.fillRect(-12, -H / 2 + 44, 24, 6);
      x.fillStyle = '#1b1c20'; x.fillRect(-9, -H / 2 + 50, 18, 2);
      // body
      x.save(); rrect(x, -W / 2, bt, W, H / 2 - bt, 5); x.clip();
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, [44, 46, 52], { hi: 0.4, lo: 0.6, spec: 0.9 }); x.fillRect(-W / 2, bt, W, H);
      for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; x.lineWidth = 0.2; const yy = bt + r() * (H / 2 - bt); x.beginPath(); x.moveTo(-W / 2, yy); x.lineTo(W / 2, yy + (r() - 0.5) * 2); x.stroke(); }
      x.restore();
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(-W / 2 + 1, bt + 1, W - 2, 0.5);
      // screen bezel
      x.fillStyle = '#060607'; rrect(x, -12, bt + 8, 24, 16, 2); x.fill();
      // fire button
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, [70, 72, 80], { hi: 0.5, lo: 0.6, spec: 1.1 }); rrect(x, -10, bt + 30, 20, 20, 4); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 0.4; rrect(x, -10, bt + 30, 20, 20, 4); x.stroke();
      // +/- buttons
      for (const dx of [-5.5, 5.5]) { x.fillStyle = '#2a2c32'; rrect(x, dx - 4, bt + 56, 8, 4, 1.5); x.fill(); }
      x.fillStyle = '#0d0d10'; for (let i = 0; i < 5; i++) x.fillRect(-8 + i * 4, H / 2 - 5, 2, 2);
    } else if (V.kind === 'heat' || V.kind === 'hybrid') {
      const top = -H / 2 + (V.kind === 'hybrid' ? 0 : 0);
      const bodyCol = V.kind === 'heat' ? [232, 232, 228] : [40, 50, 72];
      x.save(); rrect(x, -W / 2, top, W, H, W / 2); x.clip();
      x.fillStyle = cylGrad(x, -W / 2, 0, W / 2, 0, bodyCol, { hi: 0.45, lo: 0.42, spec: 0.9 }); x.fillRect(-W / 2, top, W, H);
      for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${V.kind === 'heat' ? '0,0,0' : '255,255,255'},${r() * 0.035})`; x.fillRect((r() - 0.5) * W, top + r() * H, 0.25, 0.25); }
      if (V.kind === 'hybrid') { x.fillStyle = 'rgba(10,12,16,0.9)'; rrect(x, -W / 2 + 4, top + 34, W - 8, 26, 3); x.fill(); }
      x.restore();
      // slot ring
      x.fillStyle = cylGrad(x, -6, 0, 6, 0, [190, 194, 200], { hi: 0.7, lo: 0.6, spec: 1.2 }); x.beginPath(); x.ellipse(0, top + 3.2, 5.6, 2.2, 0, 0, TAU); x.fill();
      x.fillStyle = '#0b0b0c'; x.beginPath(); x.ellipse(0, top + 3.2, 3.9, 1.5, 0, 0, TAU); x.fill();
      // button
      x.fillStyle = cylGrad(x, -4, 0, 4, 0, shade(bodyCol, -0.08), { hi: 0.4, lo: 0.4 }); x.beginPath(); x.arc(0, top + H * 0.72, 3.4, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = 0.3; x.beginPath(); x.arc(0, top + H * 0.72, 3.4, 0, TAU); x.stroke();
    }
    const S = { canvas: c, k, pad, W, H };
    cache.set(key, S);
    return S;
  }
  // 7-segment digit
  const SEG = { 0: 'abcfed', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function seg7(ctx, x, y, w, h, d, col) {
    const s = SEG[d] || '', t = w * 0.18;
    ctx.fillStyle = col;
    const H = (yy) => ctx.fillRect(x + t, yy, w - 2 * t, t), V = (xx, yy) => ctx.fillRect(xx, yy + t * 0.5, t, h / 2 - t);
    if (s.includes('a')) H(y); if (s.includes('g')) H(y + h / 2 - t / 2); if (s.includes('d')) H(y + h - t);
    if (s.includes('f')) V(x, y); if (s.includes('b')) V(x + w - t, y); if (s.includes('e')) V(x, y + h / 2); if (s.includes('c')) V(x + w - t, y + h / 2);
  }
  // st: { x,y,ang,sc,S,dpr,flav,draw (0..1),liquid(0..1),bubbles[],led,power,boot,watt,stickIn(0..1),preheat(0..1),puffsLeft,ready,blink,t,amb,coil, stickBurn }
  function drawDevice(ctx, V, st) {
    const k = Math.max(3, Math.min(16, Math.round(st.S * st.dpr * 1.2 * 2) / 2));
    const flav = V.flavors ? st.flav : null;
    const sp = deviceSprite(V, k, V.kind === 'dispo' ? flav : null);
    const W = V.w, H = V.h;
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.scale(st.sc * st.S, st.sc * st.S);
    // heat stick (behind/inside the device top)
    if (V.stick && st.stickIn !== undefined && st.stickIn > -1) {
      const top = -H / 2, sl = 45, vis = 20;
      const yTop = top - vis - (1 - st.stickIn) * 30;
      ctx.save();
      ctx.beginPath(); ctx.rect(-10, yTop - 40, 20, top + 3.2 - (yTop - 40)); ctx.clip();
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8 * st.dpr * st.sc; ctx.shadowOffsetY = 3 * st.dpr * st.sc;
      ctx.fillStyle = cylGrad(ctx, -3.6, 0, 3.6, 0, [246, 244, 240], { hi: 0.5, lo: 0.32 }); ctx.fillRect(-3.6, yTop, 7.2, sl);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = cylGrad(ctx, -3.6, 0, 3.6, 0, V.kind === 'hybrid' ? [196, 140, 80] : [236, 232, 222], { hi: 0.45, lo: 0.35 }); ctx.fillRect(-3.6, yTop, 7.2, 13);
      ctx.fillStyle = cylGrad(ctx, -3.6, 0, 3.6, 0, [200, 168, 96], { hi: 0.6, lo: 0.4, spec: 1.2 }); ctx.fillRect(-3.6, yTop + 13, 7.2, 0.5);
      if (st.stickBurn > 0) { ctx.fillStyle = `rgba(150,100,50,${st.stickBurn * 0.35})`; ctx.fillRect(-3.6, yTop + 20, 7.2, sl - 20); }
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18 * st.dpr * st.sc; ctx.shadowOffsetY = 6 * st.dpr * st.sc;
    ctx.drawImage(tint(sp, st.amb), -W / 2 - sp.pad, -H / 2 - sp.pad, W + sp.pad * 2, H + sp.pad * 2);
    ctx.restore();
    const fc = tc(flav ? flav.c : [200, 200, 200], mixc(st.amb, [1, 1, 1], 0.35));
    const dr = st.draw || 0;
    ctx.save();
    if (V.kind === 'pod') {
      // liquid window
      const wx = -W / 2 + 4, wy = -H / 2 + 9, ww = W - 8, wh = 16;
      ctx.fillStyle = 'rgba(10,10,12,0.8)'; rrect(ctx, wx, wy, ww, wh, 2); ctx.fill();
      const lv = clamp(st.liquid, 0, 1), ly = wy + wh * (1 - lv);
      ctx.save(); rrect(ctx, wx, wy, ww, wh, 2); ctx.clip();
      const lg = ctx.createLinearGradient(wx, 0, wx + ww, 0);
      lg.addColorStop(0, rgba(shade(fc, -0.4), 0.85)); lg.addColorStop(0.35, rgba(shade(fc, 0.2), 0.9)); lg.addColorStop(1, rgba(shade(fc, -0.5), 0.85));
      ctx.fillStyle = lg; ctx.fillRect(wx, ly, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(wx, ly, ww, 0.35);
      for (const b of st.bubbles || []) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(wx + b.x * ww, ly + (1 - b.y) * (wy + wh - ly), b.r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(wx + 1, wy, 1.2, wh);
      ctx.restore();
      // LED slit
      const led = Math.max(dr, st.blink || 0);
      ctx.fillStyle = led > 0.02 ? rgba(mixc([40, 40, 44], fc, led), 1) : 'rgba(20,20,24,1)';
      rrect(ctx, -4, H / 2 - 14, 8, 1.4, 0.7); ctx.fill();
      if (led > 0.02) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, H / 2 - 13.3, 10, fc, 0.5 * led); }
    } else if (V.kind === 'dispo') {
      if (dr > 0.02) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, H / 2 - 2, 9, fc, 0.65 * dr); ctx.fillStyle = rgba(shade(fc, 0.5), dr); ctx.beginPath(); ctx.arc(0, H / 2 - 2.5, 1.2, 0, TAU); ctx.fill(); }
    } else if (V.kind === 'mod') {
      const tankY = -H / 2 + 16, th = 28;
      const lv = clamp(st.liquid, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(-11, tankY, 22, th); ctx.clip();
      const ly = tankY + th * (1 - lv * 0.92);
      const lg = ctx.createLinearGradient(-11, 0, 11, 0);
      lg.addColorStop(0, rgba(shade(fc, -0.35), 0.75)); lg.addColorStop(0.3, rgba(shade(fc, 0.25), 0.8)); lg.addColorStop(1, rgba(shade(fc, -0.45), 0.75));
      ctx.fillStyle = lg; ctx.fillRect(-11, ly, 22, th);
      ctx.fillStyle = cylGrad(ctx, -4, 0, 4, 0, [150, 154, 160], { hi: 0.6, lo: 0.6 }); ctx.fillRect(-4, tankY, 8, th - 2);
      // coil glow through the chimney slot
      const cg = st.coil || 0;
      ctx.fillStyle = rgba(mixc([40, 30, 26], [255, 140, 40], cg), 1); ctx.fillRect(-2.2, tankY + th - 9, 4.4, 6);
      if (cg > 0.05) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, tankY + th - 6, 9, [255, 120, 30], 0.7 * cg); ctx.globalCompositeOperation = 'source-over'; }
      for (const b of st.bubbles || []) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-9 + b.x * 18, ly + (1 - b.y) * (tankY + th - ly), b.r * 1.2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-9.5, tankY, 1.4, th); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(6, tankY, 2.5, th);
      ctx.restore();
      // OLED screen
      const bt = -H / 2 + 52, sx = -11, sy = bt + 9, sw = 22, sh = 14;
      if (st.power) {
        const bootK = clamp(st.boot ?? 1, 0, 1);
        ctx.globalAlpha = bootK;
        const dcol = dr > 0.05 ? 'rgba(255,190,90,0.95)' : 'rgba(140,220,255,0.92)';
        const watt = st.watt || 75;
        const ds = [Math.floor(watt / 10) % 10, Math.floor(watt) % 10];
        seg7(ctx, sx + 2.5, sy + 2.5, 4.4, 7.6, ds[0], dcol);
        seg7(ctx, sx + 8, sy + 2.5, 4.4, 7.6, ds[1], dcol);
        ctx.fillStyle = dcol; ctx.fillRect(sx + 13, sy + 9.2, 0.9, 0.9);
        seg7(ctx, sx + 14.6, sy + 2.5, 4.4, 7.6, 0, dcol);
        ctx.fillRect(sx + 2.5, sy + 11.6, 17 * clamp(st.battery ?? 0.8, 0, 1), 0.8);
        ctx.globalAlpha = 1;
        if (bootK < 1) { ctx.fillStyle = `rgba(160,220,255,${1 - bootK})`; ctx.fillRect(sx + 4, sy + 6.5, 14 * bootK + 0.5, 1); }
      } else if (st.wake > 0) {
        ctx.fillStyle = `rgba(140,220,255,${st.wake})`;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sx + 5 + i * 3, sy + sh / 2, 0.7, 0, TAU); ctx.globalAlpha = i < (st.clicks || 0) ? 1 : 0.25; ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // fire button glow
      const fb = st.press || 0;
      if (fb > 0.01 || !st.power) {
        const pul = st.power ? fb : 0.25 + 0.25 * Math.sin(st.t * 3);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(140,220,255,${0.35 * pul})`; ctx.lineWidth = 0.6; rrect(ctx, -10, bt + 30, 20, 20, 4); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      if (fb > 0.01) { ctx.fillStyle = `rgba(0,0,0,${0.18 * fb})`; rrect(ctx, -10, bt + 30, 20, 20, 4); ctx.fill(); }
    } else if (V.kind === 'heat' || V.kind === 'hybrid') {
      const top = -H / 2;
      // LEDs
      const n = 4;
      for (let i = 0; i < n; i++) {
        const yy = top + 22 + i * 4.2;
        let a = 0;
        if (st.preheat !== undefined && st.preheat >= 0 && !st.ready) { const p = st.preheat * n; a = i < Math.floor(p) ? 1 : i === Math.floor(p) ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.t * 9)) : 0; }
        else if (st.ready) { const left = st.puffsLeft / (V.puffs || 14); a = i < Math.ceil(left * n) ? 1 : 0; if (st.puffsLeft <= 2) a *= 0.5 + 0.5 * Math.sin(st.t * 10); }
        const col = V.kind === 'heat' ? [255, 255, 255] : [120, 200, 255];
        ctx.fillStyle = a > 0.02 ? rgba(mixc([90, 90, 90], col, a), 1) : (V.kind === 'heat' ? 'rgba(200,200,196,1)' : 'rgba(30,38,52,1)');
        ctx.beginPath(); ctx.arc(0, yy, 0.9, 0, TAU); ctx.fill();
        if (a > 0.02) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, yy, 4, col, 0.5 * a); ctx.globalCompositeOperation = 'source-over'; }
      }
      if (V.kind === 'hybrid') {
        const wx = -W / 2 + 5, wy = top + 36, ww = W - 10, wh = 22, lv = clamp(st.liquid, 0, 1);
        ctx.save(); rrect(ctx, wx, wy, ww, wh, 2.5); ctx.clip();
        ctx.fillStyle = rgba(shade(fc, -0.1), 0.85); ctx.fillRect(wx, wy + wh * (1 - lv), ww, wh);
        for (const b of st.bubbles || []) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(wx + b.x * ww, wy + wh * (1 - lv) + (1 - b.y) * wh * lv, b.r, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(wx + 1, wy, 1.4, wh);
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
  }
  function devPoint(st, lx, ly) { const c = Math.cos(st.ang), s = Math.sin(st.ang), k = st.sc * st.S; return [st.x + (lx * c - ly * s) * k, st.y + (lx * s + ly * c) * k]; }

  // ── pack (front view, flip-top)
  const LID = 23;
  const ORDER = [3, 2, 4, 1, 5, 0, 6, 10, 9, 11, 8, 12, 7, 16, 15, 17, 14, 18, 13, 19];
  const packDims = (T) => (T.pack.slim ? { W: 46, H: 100 } : T.pack.tin ? { W: 60, H: 86 } : { W: 56, H: 88 });
  function packSprite(T, k) {
    const key = 'pack:' + T.id + ':' + k.toFixed(2);
    if (cache.has(key)) return cache.get(key);
    const P = T.pack, { W, H } = packDims(T), pad = 3;
    const front = makeCanvas((W + pad * 2) * k, (H + pad * 2) * k), x = front.getContext('2d');
    x.scale(k, k); x.translate(pad, pad);
    const r = mulberry(T.len * 7 + W);
    x.save(); rrect(x, 0, 0, W, H, P.tin ? 6 : 1.6); x.clip();
    // body: soft vertical light + rounded edges
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(shade(P.body, 0.06))); g.addColorStop(1, rgba(shade(P.body, -0.1)));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const eg = x.createLinearGradient(0, 0, W, 0);
    eg.addColorStop(0, 'rgba(0,0,0,0.32)'); eg.addColorStop(0.07, 'rgba(0,0,0,0.04)'); eg.addColorStop(0.2, 'rgba(255,255,255,0.05)'); eg.addColorStop(0.85, 'rgba(0,0,0,0.04)'); eg.addColorStop(1, 'rgba(0,0,0,0.38)');
    x.fillStyle = eg; x.fillRect(0, 0, W, H);
    if (P.tin) {
      for (let yy = 0; yy < H; yy += 0.25) { x.fillStyle = `rgba(255,255,255,${r() * 0.06})`; x.fillRect(0, yy, W, 0.08); x.fillStyle = `rgba(0,0,0,${r() * 0.05})`; x.fillRect(0, yy + 0.12, W, 0.06); }
      // embossed panel
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 0.6; rrect(x, 5, LID + 6, W - 10, H - LID - 12, 3); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 0.4; rrect(x, 5.4, LID + 6.4, W - 10, H - LID - 12, 3); x.stroke();
      x.fillStyle = rgba(P.accent, 0.8); x.fillRect(W / 2 - 7, LID + (H - LID) * 0.48, 14, 0.7);
    } else {
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.035})`; x.fillRect(r() * W, r() * H, 0.25, 0.25); }
      const ac = P.accent, top = LID + 4;
      const panel = H * 0.68;
      if (P.mark === 'slash') {
        x.fillStyle = rgba(ac, 0.95); x.fillRect(6, top + 3, 5, 5);
        x.fillRect(W - 9.5, top + 3, 1.1, panel - top - 9);
        x.fillStyle = rgba(ac, 0.75); x.fillRect(6, top + 11, 16, 0.6); x.fillRect(6, top + 13.2, 10, 0.6);
      } else if (P.mark === 'bar') {
        x.fillStyle = rgba(ac, 0.92); x.fillRect(0, top + 12, W, 4.2);
        x.fillStyle = rgba(ac, 0.9); x.fillRect(6, top + 3, 3.6, 3.6);
        x.fillStyle = rgba(ac, 0.5); x.fillRect(6, top + 20, 18, 0.6);
      } else if (P.mark === 'line') {
        x.fillStyle = rgba(ac, 0.85); x.fillRect(W / 2 - 0.4, top + 2, 0.8, panel - top - 8);
        x.fillRect(W / 2 - 4, top + 2, 8, 0.8);
      } else if (P.mark === 'dot') {
        const cx = W - 13, cy = top + 9;
        const gl = x.createRadialGradient(cx, cy, 0, cx, cy, 9); gl.addColorStop(0, rgba(ac, 0.35)); gl.addColorStop(1, rgba(ac, 0)); x.fillStyle = gl; x.fillRect(cx - 9, cy - 9, 18, 18);
        x.fillStyle = rgba(ac, 1); x.beginPath(); x.arc(cx, cy, 2.6, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(cx - 0.8, cy - 0.8, 0.7, 0, TAU); x.fill();
        x.fillStyle = rgba(ac, 0.7); x.fillRect(6, top + 3, 14, 0.7); x.fillRect(6, top + 5.4, 9, 0.7);
      } else if (P.mark === 'emboss') {
        x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 0.7; rrect(x, 7, top + 3, W - 14, panel - top - 10, 2); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.09)'; x.lineWidth = 0.5; rrect(x, 7.4, top + 3.4, W - 14, panel - top - 10, 2); x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(W / 2 - 6, top + (panel - top) * 0.42, 12, 0.6);
      }
      // warning panel — satirical pictogram
      x.fillStyle = 'rgba(10,10,12,0.94)'; x.fillRect(0, panel, W, H - panel);
      x.strokeStyle = 'rgba(235,235,235,0.78)'; x.lineWidth = 0.6; x.lineCap = 'round'; x.lineJoin = 'round';
      const cx = W * 0.36, cy = panel + (H - panel) * 0.5;
      x.strokeRect(cx - 7, cy - 7, 14, 9);
      x.beginPath(); x.moveTo(cx, cy + 2); x.lineTo(cx, cy + 4.5); x.moveTo(cx - 4, cy + 4.5); x.lineTo(cx + 4, cy + 4.5); x.moveTo(cx - 12, cy + 7.5); x.lineTo(cx + 12, cy + 7.5); x.stroke();
      x.beginPath(); x.arc(W * 0.72, cy - 1, 5, 0, TAU); x.moveTo(W * 0.72, cy - 1); x.lineTo(W * 0.72, cy - 4.4); x.moveTo(W * 0.72, cy - 1); x.lineTo(W * 0.72 + 2.4, cy + 0.4); x.stroke();
      x.fillStyle = 'rgba(235,235,235,0.35)'; x.fillRect(W * 0.12, H - 3.2, W * 0.76, 0.5);
    }
    // cellophane: tear strip + sheen
    if (!P.tin) {
      x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(0, LID - 3.6, W, 1.3);
      x.fillStyle = 'rgba(255,255,255,0.32)'; x.fillRect(W - 6, LID - 4.2, 4, 2.4);
    }
    const sh = x.createLinearGradient(0, 0, W, H);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.36, 'rgba(255,255,255,0.13)'); sh.addColorStop(0.42, 'rgba(255,255,255,0.02)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)'); sh.addColorStop(0.74, 'rgba(255,255,255,0.06)'); sh.addColorStop(0.78, 'rgba(255,255,255,0)');
    x.fillStyle = sh; x.fillRect(0, 0, W, H);
    x.restore();
    // lid seam
    x.fillStyle = 'rgba(0,0,0,0.42)'; x.fillRect(0, LID, W, 0.45);
    x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(0, LID + 0.45, W, 0.3);
    const S = { front, k, pad, W, H };
    cache.set(key, S);
    return S;
  }
  // st: { x,y,ang,sc,S,dpr,open(0..1),left,rise(0..1 for the next cigarette),amb,alpha }
  function slotOf(T, left) {
    const { W } = packDims(T), d = (W - 6) / 7;
    const idx = ORDER[Math.max(0, Math.min(19, 20 - left))];
    const row = idx >= 7 ? 0 : 1, i = row === 0 ? idx - 7 : idx;
    const offs = row === 0 ? d / 2 : 0, y0 = row === 0 ? 2 : 5;
    return { cx: 3 + offs + i * d + d / 2, y0, d };
  }
  function drawPack(ctx, T, st) {
    const k = Math.max(3, Math.min(14, Math.round(st.S * st.dpr * 1.2 * 2) / 2));
    const sp = packSprite(T, k), P = T.pack, { W, H } = packDims(T);
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.scale(st.sc * st.S, st.sc * st.S);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = st.alpha ?? 1;
    const th = st.open * 2.1;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24 * st.dpr * st.sc; ctx.shadowOffsetY = 10 * st.dpr * st.sc;
    ctx.fillStyle = '#000'; rrect(ctx, 1, LID, W - 2, H - LID, 2); ctx.fill(); ctx.restore();
    if (st.open > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, -70, W, LID + 70); ctx.clip();
      const fg = ctx.createLinearGradient(0, 0, W, 0);
      [[0, '#8a8d92'], [0.3, '#e6e8ea'], [0.5, '#a9adb2'], [0.75, '#eef0f2'], [1, '#7d8086']].forEach(([p, h]) => fg.addColorStop(p, rgba(tc(hex(h), st.amb))));
      ctx.fillStyle = fg; ctx.fillRect(1.5, 3, W - 3, LID);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(1.5 + i * (W / 6), 3, 0.3, LID);
      const tipCol = tc({ cork: [204, 138, 74], white: [240, 239, 236], black: [34, 34, 36], crutch: [236, 228, 212], wood: [198, 150, 96] }[T.tip], st.amb);
      const d = (W - 6) / 7, dia = Math.min(d * 0.92, T.dia);
      for (let row = 0; row < 2; row++) {
        const n = row === 0 ? 6 : 7, offs = row === 0 ? d / 2 : 0, y0 = row === 0 ? 2 : 5;
        for (let i = 0; i < n; i++) {
          const idx = row === 0 ? 7 + i : i;
          const rank = ORDER.indexOf(idx);
          const present = rank >= 20 - st.left;
          const isNext = rank === 20 - st.left;
          const lift = isNext ? st.rise * 50 : 0;
          const cx = 3 + offs + i * d + d / 2;
          if (!present && !isNext) { ctx.fillStyle = 'rgba(30,26,22,0.55)'; ctx.beginPath(); ctx.ellipse(cx, y0 + 1, dia * 0.46, dia * 0.17, 0, 0, TAU); ctx.fill(); continue; }
          if (isNext && st.rise <= 0 && !present) continue;
          ctx.fillStyle = cylGrad(ctx, cx - dia / 2, 0, cx + dia / 2, 0, tipCol, { hi: 0.4, lo: 0.5 });
          ctx.fillRect(cx - dia / 2, y0 - lift, dia, LID + 10);
          ctx.fillStyle = rgba(shade(tipCol, -0.2)); ctx.beginPath(); ctx.ellipse(cx, y0 - lift, dia / 2, dia * 0.18, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(shade(tipCol, 0.15)); ctx.beginPath(); ctx.ellipse(cx, y0 - lift, dia * 0.38, dia * 0.12, 0, 0, TAU); ctx.fill();
          if (isNext && st.rise > 0) {
            ctx.fillStyle = cylGrad(ctx, cx - dia / 2, 0, cx + dia / 2, 0, tc(T.paper, st.amb), { hi: 0.4, lo: 0.4 }); ctx.fillRect(cx - dia / 2, y0 - lift + T.filter, dia, 52);
            ctx.fillStyle = rgba(tc(T.band, st.amb)); ctx.fillRect(cx - dia / 2, y0 - lift + T.filter - 1.4, dia, 0.45);
          }
        }
      }
      ctx.restore();
      ctx.fillStyle = rgba(tc(P.inner, st.amb)); ctx.beginPath(); ctx.moveTo(0, LID - 6); ctx.quadraticCurveTo(W / 2, LID - 1, W, LID - 6); ctx.lineTo(W, LID); ctx.lineTo(0, LID); ctx.closePath(); ctx.fill();
    }
    const tsp = tint(sp, st.amb);
    ctx.save(); ctx.beginPath(); ctx.rect(-2, LID, W + 4, H); ctx.clip();
    ctx.drawImage(tsp, -sp.pad, -sp.pad, W + sp.pad * 2, H + sp.pad * 2);
    ctx.restore();
    const c = Math.cos(th);
    if (c > 0) {
      ctx.save(); ctx.scale(1, Math.max(0.001, c));
      ctx.beginPath(); ctx.rect(-2, 0, W + 4, LID + 0.5); ctx.clip();
      ctx.drawImage(tsp, -sp.pad, -sp.pad, W + sp.pad * 2, H + sp.pad * 2);
      ctx.fillStyle = `rgba(0,0,0,${(1 - c) * 0.5})`; ctx.fillRect(0, 0, W, LID);
      ctx.restore();
    } else {
      const hh = -c * LID;
      ctx.fillStyle = rgba(tc(shade(P.inner, -0.1), st.amb)); ctx.fillRect(0.5, -hh, W - 1, hh);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0.5, -0.6, W - 1, 0.6);
    }
    ctx.restore();
  }
  // screen position of the next cigarette's filter top at full rise
  function packNext(T, st) {
    const { W, H } = packDims(T);
    const sl = slotOf(T, st.left);
    return devPoint(st, sl.cx - W / 2, sl.y0 - 50 - H / 2);
  }
  return { cigSprite, drawCig, cigPoint, drawFlame, drawLighter, drawDevice, devPoint, drawPack, packNext, packDims, BIC_COLS, LID, drawAsh };
})();
