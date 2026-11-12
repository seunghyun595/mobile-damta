// ───────────────────────── app ─────────────────────────
(function main() {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  // ── settings / persistence
  const DEF = { mode: 'cig', cig: 'regular', vape: 'pod', flavor: 'mint', lighter: 'bic', place: 'roof', time: 'auto', weather: 'clear', chain: false, sound: true };
  const S = Object.assign({}, DEF, store.get('settings', {}));
  if (!CIGS[S.cig]) S.cig = DEF.cig; if (!VAPES[S.vape]) S.vape = DEF.vape; if (!LIGHTERS[S.lighter]) S.lighter = DEF.lighter;
  if (!Scenes.byId[S.place]) S.place = DEF.place; if (!Scenes.WEATHERS[S.weather]) S.weather = DEF.weather;
  if (S.time !== 'auto' && !Scenes.TIMES[S.time]) S.time = 'auto';
  if (!FLAVORS.find((f) => f.id === S.flavor)) S.flavor = DEF.flavor;
  const saveS = () => store.set('settings', S);
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  let stats = store.get('stats', null);
  if (!stats || stats.d !== dayKey()) stats = { d: dayKey(), cig: 0, puff: 0 };
  const saveStats = () => { if (stats.d !== dayKey()) stats = { d: dayKey(), cig: 0, puff: 0 }; store.set('stats', stats); };
  const packs = store.get('packs', {});
  const packLeft = (id) => (packs[id] === undefined ? 20 : packs[id]);
  const dev = Object.assign({ liquid: 1, modLiquid: 1, power: false }, store.get('device', {}));
  const saveDev = () => store.set('device', dev);

  // ── canvases
  const bgC = $('#bg'), fgC = $('#fg');
  let smC = $('#smoke');
  const fg = fgC.getContext('2d');
  const QS = new URLSearchParams(location.search);
  const FIXED = QS.has('fixed');
  const quality = ['low', 'mid', 'high'].includes(QS.get('q')) ? QS.get('q') : coarse ? 'mid' : 'high';
  smC = Smoke.init(smC, quality);
  const scene = Scenes.Renderer(bgC);
  let W = 1, H = 1, DPR = 1, LY = null;
  let env = null;

  // ── state
  const G = {
    t: 0, phase: 'intro', started: false, idle: 0, haze: 0, shake: 0, cam: { x: 0, y: 0 },
    after: null, afterT: 0, session: 0, breathT: 3, walkStep: 0, flash: 0, focus: 0,
  };
  let C = null;          // hero cigarette
  let O = null;          // old cigarette while chain-lighting
  const butts = [];      // cigarettes being stubbed out
  const fallen = [];     // falling ash pieces
  const sparks = [];
  const P = { open: 0, rise: 0, alpha: 0, y: 0, shine: 0, tt: 0, slot: 0, fresh: false };
  const LT = { kind: S.lighter, vis: 0, target: 0, open: 0, flame: 0, strike: 0, on: false, fail: 0, matchBurn: 0, matchUsed: false, col: pick(Props.BIC_COLS), closeT: -1, hideT: -1, x: 0, y: 0, ang: 0 };
  const DV = { draw: 0, bubbles: [], boot: 1, wake: 0, clicks: 0, press: 0, coil: 0, stickIn: -1, preheat: -1, ready: false, puffsLeft: 0, stickBurn: 0, blink: 0, session: 0, tt: 0, seq: null, x: 0, y: 0, ang: 0, sc: 1, enter: 0 };
  const I = { down: false, pressT: 0, active: false, amount: 0, x: 0, y: 0, sx: 0, sy: 0, moved: 0, vy: 0, lastY: 0, lastT: 0, ex: null, kb: false };
  const pose = { k: 0 };  // 0 rest → 1 at the lips

  // ── layout
  function layout() {
    const portrait = H >= W * 1.05;
    const Sc = portrait ? Math.min(W * 0.0081, H * 0.0046) : Math.min(H * 0.0058, W * 0.004);
    const Sd = portrait ? Math.min(W * 0.0102, H * 0.0043) : Math.min(H * 0.0043, W * 0.0042);
    const Sl = portrait ? Math.min(W * 0.0078, H * 0.0042) : Math.min(H * 0.0046, W * 0.0036);
    return {
      portrait, Sc, Sd, Sl,
      cig: { x: W * (portrait ? 0.45 : 0.47), y: H * (portrait ? 0.62 : 0.6), ang: -0.32 },
      cigLip: { x: W * (portrait ? 0.41 : 0.44), y: H * (portrait ? 0.7 : 0.68), ang: -0.2, sc: 1.07 },
      dev: { x: W * (portrait ? 0.56 : 0.54), y: H * (portrait ? 0.58 : 0.55), ang: 0.14 },
      devLip: { x: W * 0.52, y: H * (portrait ? 0.68 : 0.66), ang: 0.42, sc: 1.07 },
      pack: { x: W * 0.5, y: H * (portrait ? 0.6 : 0.57) },
      mouth: { x: W * 0.5, y: H * 0.99 },
      sz: Math.min(W, H) / 400,
    };
  }
  function resize() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    fgC.width = Math.round(W * DPR); fgC.height = Math.round(H * DPR);
    scene.resize(W, H, window.devicePixelRatio || 1);
    Smoke.resize(W, H, window.devicePixelRatio || 1);
    LY = layout();
    refreshScene();
  }
  function curTime() { return S.time === 'auto' ? Scenes.autoTime() : S.time; }
  function refreshScene() {
    env = Scenes.env(curTime(), S.weather);
    scene.set(Scenes.byId[S.place], env);
    const sc = Scenes.byId[S.place];
    Sound.setScene(sc.id, { indoor: sc.indoor, rain: env.rain > 0, snow: env.snow > 0, wind: env.wind * (sc.indoor ? 0.2 : 1) });
    document.documentElement.style.setProperty('--tint', env.dark > 0.5 ? '0.0' : '0.06');
  }

  // ── cigarette helpers
  function newCig(id) {
    const T = CIGS[id];
    return { T, burn: T.len, ash: 0, heat: 0, lit: false, lightP: 0, popped: false, rings: [], seed: rand(100), ashSeed: rand(1, 9), droop: 0, sx: new Spring(300, 15), sy: new Spring(300, 15), sa: new Spring(260, 12), fade: 1, x: 0, y: 0, ang: 0, sc: 1, puffs: 0, menthol: 0 };
  }
  function cigOriginFor(c, cx, cy, ang, sc) {
    const k = LY.Sc * sc, half = (c.T.len / 2) * k;
    return { x: cx - Math.cos(ang) * half, y: cy - Math.sin(ang) * half };
  }
  function cigPoseRest(c, k) {
    const a = LY.cig, b = LY.cigLip;
    const ang = lerp(a.ang, b.ang, k), sc = lerp(1, b.sc, k);
    const cx = lerp(a.x, b.x, k), cy = lerp(a.y, b.y, k);
    return Object.assign(cigOriginFor(c, cx, cy, ang, sc), { ang, sc });
  }
  function cigSt(c) {
    return { x: c.x + c.sx.x, y: c.y + c.sy.x, ang: c.ang + c.sa.x, sc: c.sc, S: LY.Sc, burn: c.burn, ash: c.ash, heat: c.heat, lit: c.lit, lightP: c.lightP, popped: c.popped, seed: c.seed, ashSeed: c.ashSeed, droop: c.droop, rings: c.rings, t: G.t, amb: ambFg(), dpr: DPR, fade: c.fade, capsule: c.T.capsule, rim: 1 };
  }
  function emberPoint(c) { const st = cigSt(c); return Props.cigPoint(st, c.burn + 0.6, 0); }
  function tipPoint(c) { const st = cigSt(c); return Props.cigPoint(st, c.T.len, 0); }

  function ambFg() {
    const a = scene.ambient();
    const lift = env && env.dark > 0.5 ? 0.1 : 0.02;
    return [clamp(a[0] + lift, 0, 1), clamp(a[1] + lift, 0, 1), clamp(a[2] + lift, 0, 1)];
  }

  // ── flow
  function enterMode() {
    C = null; O = null; I.active = false; I.ex = null;
    LT.target = 0; LT.on = false; LT.flame = 0;
    if (S.mode === 'cig') showPack();
    else enterDevice();
    updateHUD(); updateDock();
  }
  function showPack() {
    G.phase = 'pack'; P.open = 0; P.rise = 0; P.alpha = 0; P.y = 60; P.tt = 0;
    if (packLeft(S.cig) <= 0) { packs[S.cig] = 20; store.set('packs', packs); P.fresh = true; P.shine = 1; Sound.sfx.wrap(); }
    LT.target = 0;
  }
  function takeCig() {
    if (G.phase !== 'pack' || P.alpha < 0.6) return;
    G.phase = 'taking'; P.tt = 0;
    Sound.sfx.pack();
    buzz(8);
  }
  function lighterPose() {
    if (!C) return;
    const L = LIGHTERS[LT.kind];
    const tip = tipPoint(C);
    const S2 = LY.Sl;
    const ang = LT.kind === 'torch' ? -0.55 : LT.kind === 'match' ? -0.3 : -0.12;
    const up = [Math.sin(ang), -Math.cos(ang)];
    const reach = L.flameLen * (LT.kind === 'torch' ? 0.82 : 0.6) * S2;
    const ent = Ease.outCubic(LT.vis);
    const off = (1 - ent);
    LT.x = tip[0] - up[0] * reach + off * W * 0.28 - 1.2 * S2;
    LT.y = tip[1] - up[1] * reach + off * H * 0.35;
    LT.ang = ang + off * 0.5;
  }
  function finishCig(c, counted) {
    if (!c) return;
    const T = c.T;
    const burned = (T.len - c.burn) / (T.len - T.filter);
    if (counted !== false && (burned > 0.25 || c.lit)) { stats.cig++; saveStats(); bumpCount(); }
    butts.push({ c, t: 0, x0: c.x, y0: c.y, a0: c.ang, sc0: c.sc, sparked: false });
  }
  function stubOut() {
    if (G.phase === 'lit' && C) {
      finishCig(C);
      C = null; G.phase = 'idle'; G.after = 'pack'; G.afterT = 1.1;
      LT.target = 0; LT.on = false;
    } else if (G.phase === 'heated' || G.phase === 'preheat') {
      ejectStick(DV.puffsLeft < (VAPES[S.vape].puffs || 14) - 3);
    }
    updateAction();
  }
  function startChain() {
    // old cigarette stays lit, new one comes to it
    O = C; O.lit = true;
    C = newCig(S.cig);
    packs[S.cig] = Math.max(0, packLeft(S.cig) - 1); store.set('packs', packs);
    const e = emberPoint(O);
    C.ang = -0.25; C.sc = 1;
    const k = LY.Sc;
    C.x = e[0] - Math.cos(C.ang) * C.T.len * k - W * 0.6; C.y = e[1] - Math.sin(C.ang) * C.T.len * k + H * 0.1;
    G.phase = 'chain'; G.chainT = 0;
    Sound.sfx.slide();
  }

  // ── devices
  function enterDevice() {
    const V = VAPES[S.vape];
    DV.draw = 0; DV.bubbles.length = 0; DV.coil = 0; DV.press = 0; DV.enter = 0; DV.seq = null;
    DV.preheat = -1; DV.ready = false; DV.puffsLeft = 0; DV.stickBurn = 0; DV.blink = 0;
    if (V.stick) { DV.stickIn = 0; G.phase = 'stickWait'; }
    else { DV.stickIn = -1; G.phase = 'device'; }
    if (V.kind === 'mod') { DV.boot = dev.power ? 1 : 0; DV.wake = 0; DV.clicks = 0; }
  }
  function insertStick() {
    if (G.phase !== 'stickWait') return;
    G.phase = 'inserting'; DV.tt = 0; Sound.sfx.insert(); buzz(6);
  }
  function ejectStick(counted) {
    if (counted !== false) { stats.cig++; saveStats(); bumpCount(); }
    G.phase = 'ejecting'; DV.tt = 0; DV.ready = false; DV.preheat = -1;
    Sound.sfx.eject(); Sound.setBuzz(0.6); setTimeout(() => Sound.setBuzz(0), 420); buzz([60, 40, 60]);
    updateAction();
  }

  // ── input
  const stage = $('#stage');
  function canInhale() {
    const p = G.phase;
    if (p === 'lit' || p === 'unlit' || p === 'chain') return true;
    if (p === 'device') return true;
    if (p === 'heated') return true;
    return false;
  }
  function pressStart(x, y) {
    G.idle = 0;
    if (sheetOpen) { closeSheet(); return false; }
    I.down = true; I.pressT = 0; I.active = false; I.amount = I.ex ? I.amount * 0 : 0;
    I.x = I.sx = x; I.y = I.sy = y; I.moved = 0; I.vy = 0; I.lastY = y; I.lastT = performance.now();
    I.struck = false;
    if (G.phase === 'unlit') strikeLighter();
    if (G.phase === 'device' && VAPES[S.vape].kind === 'mod' && !dev.power && !DV.seq) powerOnMod();
    return true;
  }
  function pressMove(x, y) {
    if (!I.down) return;
    const now = performance.now(), dtm = Math.max(1, now - I.lastT);
    I.vy = lerp(I.vy, ((y - I.lastY) / dtm) * 1000, 0.5);
    I.lastY = y; I.lastT = now;
    I.moved = Math.max(I.moved, Math.hypot(x - I.sx, y - I.sy));
    I.x = x; I.y = y;
  }
  function pressEnd(x, y) {
    if (!I.down) return;
    I.down = false;
    const tap = I.pressT < 0.2 && I.moved < 14;
    const wasActive = I.active;
    I.active = false;
    if (G.phase === 'unlit' || G.phase === 'lit' || G.phase === 'chain') releaseLighter();
    if (wasActive && I.amount > 0.06) exhale(x, y, I.vy < -900 && I.moved > 40);
    else if (tap) onTap(x, y);
    I.amount = 0;
  }
  function onTap(x, y) {
    const p = G.phase;
    if (p === 'pack') { takeCig(); return; }
    if (p === 'stickWait') { insertStick(); return; }
    if ((p === 'lit' || p === 'unlit') && C) {
      const st = cigSt(C), T = C.T;
      // project tap onto the cigarette axis
      const dx = x - st.x, dy = y - st.y, c = Math.cos(st.ang), s = Math.sin(st.ang), k = st.sc * st.S;
      const lx = (dx * c + dy * s) / k, ly = (-dx * s + dy * c) / k;
      const near = Math.abs(ly) < T.dia * 2.2 + 8 / k;
      if (near && lx > -4 && lx < T.filter + 2 && T.capsule && !C.popped) { popCapsule(); return; }
      if (near && lx > -4 && lx < C.burn + C.ash + 8) { flick(); return; }
    }
    if (p === 'lit' && C) { flick(); return; }
    if (p === 'device' && VAPES[S.vape].kind === 'mod') { modClick(); return; }
  }
  function popCapsule() {
    if (!C || C.popped) return;
    C.popped = true; C.menthol = 1;
    Sound.sfx.capsule(); buzz(14);
    C.sy.kick(-60); C.sa.kick(0.25);
    const st = cigSt(C), p = Props.cigPoint(st, C.T.filter * 0.48, 0);
    for (let i = 0; i < 14; i++) sparks.push({ x: p[0], y: p[1], vx: rand(-90, 90), vy: rand(-120, 30), life: 0, max: rand(0.4, 0.8), c: [150, 255, 220], s: rand(1, 2.2), g: 60 });
  }
  function flick() {
    if (!C) return;
    C.sa.kick(-1.6); C.sy.kick(140);
    Sound.sfx.flick(); buzz(6);
    if (C.lit && C.ash > 1.2) dropAsh(true);
  }
  function dropAsh(flicked) {
    const c = C; if (!c) return;
    const st = cigSt(c), T = c.T;
    const len = c.ash - 0.25;
    const p = Props.cigPoint(st, c.burn + 0.25, 0);
    fallen.push({ T, len, R: T.dia / 2, x: p[0], y: p[1], ang: st.ang + c.droop, vx: rand(-20, 20) + (flicked ? rand(-30, 60) : 0), vy: flicked ? rand(40, 120) : rand(0, 20), va: rand(-3, 3), seed: c.ashSeed, t: 0, k: st.sc * st.S, heat: c.heat * 0.4, rings: c.rings.slice(), burn: c.burn });
    for (let i = 0; i < 18; i++) sparks.push({ x: p[0] + rand(-4, 4), y: p[1] + rand(-3, 3), vx: rand(-40, 40), vy: rand(-10, 80), life: 0, max: rand(0.5, 1.2), c: Math.random() < 0.15 ? [255, 140, 40] : [150, 146, 140], s: rand(0.8, 1.8), g: 240 });
    c.ash = 0.25; c.ashSeed = rand(1, 9); c.droop = 0;
    Sound.sfx.ashDrop();
  }
  function strikeLighter() {
    if (!C || LT.vis < 0.86 || I.struck) return;
    I.struck = true;
    const kind = LT.kind;
    LT.on = true; LT.strike = 0; LT.fail = 0;
    const windy = env.wind * (Scenes.byId[S.place].smoke.wind) * (Scenes.byId[S.place].indoor ? 0 : 1);
    if (kind === 'bic') {
      if (windy > 0.5 && Math.random() < 0.45) { LT.fail = 0.32; Sound.sfx.bicFail(); }
      else Sound.sfx.bicStrike();
      spawnStrikeSparks();
    } else if (kind === 'torch') Sound.sfx.torchClick();
    else if (kind === 'oil') { if (LT.open < 0.9) { LT.opening = true; Sound.sfx.oilOpen(); setTimeout(() => { if (LT.on) { Sound.sfx.oilStrike(); spawnStrikeSparks(); } }, 220); } else { Sound.sfx.oilStrike(); spawnStrikeSparks(); } }
    else if (kind === 'match') { if (LT.matchUsed) { LT.matchBurn = 0; LT.matchUsed = false; } Sound.sfx.matchStrike(); spawnStrikeSparks(); LT.flare = 1; }
    buzz(8);
  }
  function spawnStrikeSparks() {
    const k = LY.Sl, c = Math.cos(LT.ang), s = Math.sin(LT.ang);
    const ox = LT.kind === 'oil' ? 11 : LT.kind === 'match' ? 0 : 7.8, oy = LT.kind === 'oil' ? -6 : LT.kind === 'match' ? 0 : -1.2;
    const px = LT.x + (ox * c - oy * s) * k, py = LT.y + (ox * s + oy * c) * k;
    for (let i = 0; i < 9; i++) sparks.push({ x: px, y: py, vx: rand(-120, 60), vy: rand(-220, -40), life: 0, max: rand(0.12, 0.35), c: [255, rand(170, 230), 120], s: rand(0.8, 1.6), g: 500, streak: true });
  }
  function releaseLighter() {
    if (!LT.on) return;
    LT.on = false;
    if (LT.kind === 'torch') Sound.sfx.torchOff();
    if (LT.kind === 'match' && LT.flame > 0.1) { Sound.sfx.matchOut(); LT.matchUsed = true; const fp = flamePoint(); if (fp) Smoke.splat(fp[0], fp[1], 0, -40 * LY.sz, [0.8, 0.8, 0.8], 0.25, 5 * LY.sz, 10 * LY.sz); }
    if (C && C.lit) { LT.hideT = LT.kind === 'oil' ? 0.55 : 0.22; if (LT.kind === 'oil') LT.closeT = 0.2; }
  }
  function flamePoint() {
    const k = LY.Sl, c = Math.cos(LT.ang), s = Math.sin(LT.ang);
    const L = LIGHTERS[LT.kind];
    const oy = -L.flameLen * 0.45 - (LT.kind === 'torch' ? 6 : 2.5);
    return [LT.x + (-oy * s) * k, LT.y + (oy * c) * k];
  }
  function exhale(x, y, rings) {
    const vape = S.mode === 'vape';
    let vol = clamp(I.amount, 0.12, 1);
    if (!vape && (!C || !C.lit)) { if (!(G.phase === 'lit')) vol *= 0.15; }
    if (vape) {
      const V = VAPES[S.vape];
      if (!(G.phase === 'device' || G.phase === 'heated')) return;
      if (V.kind === 'mod' && !dev.power) return;
    }
    const m = LY.mouth;
    let dx = x - m.x, dy = y - m.y;
    if (I.kb || dy > -H * 0.12) { dx = (x - m.x) * 0.3; dy = -H; }
    let a = Math.atan2(dx, -dy); a = clamp(a, -0.95, 0.95);
    const dir = [Math.sin(a), -Math.cos(a)];
    const dur = rings ? 1.1 : (vape ? 1.2 + 2.0 * vol : 0.85 + 1.7 * vol);
    I.ex = { t: -0.16, dur, vol, dir, drift: rand(-1, 1), rings, kind: vape ? 'vape' : 'smoke', cloud: vape ? VAPES[S.vape].cloud : (C ? C.T.smoke : 1), pulses: rings ? [0, 0.3, 0.6] : null, menthol: C && C.menthol };
    Sound.exhale(vol, dur, env.cold);
    G.haze = clamp(G.haze + vol * (Scenes.byId[S.place].indoor ? 0.07 : 0.025) * (vape ? 1.6 : 1), 0, 1);
    if (!vape && C && C.lit) { C.rings.push(C.burn); if (C.rings.length > 14) C.rings.shift(); C.puffs++; }
    if (vape) {
      const V = VAPES[S.vape];
      if (V.stick) { DV.puffsLeft = Math.max(0, DV.puffsLeft - 1); DV.stickBurn = clamp(1 - DV.puffsLeft / V.puffs, 0, 1); }
      else { stats.puff++; saveStats(); bumpCount(true); }
    }
    G.session = G.session || performance.now();
  }
  function cough() {
    I.active = false; I.down = false;
    Sound.sfx.cough(); buzz([30, 60, 30, 60, 30]);
    G.shake = 1;
    releaseLighter();
    I.ex = { t: 0, dur: 1.0, vol: 0.5, dir: [0, -1], rings: false, kind: S.mode === 'vape' ? 'vape' : 'smoke', cloud: 1, cough: true, pulses: [0, 0.3, 0.6] };
    I.amount = 0;
    if (C && C.lit) { C.rings.push(C.burn); }
  }
  // mod power-on: five quick clicks
  function powerOnMod() {
    DV.seq = { t: 0, n: 0 };
    DV.wake = 1; DV.clicks = 0;
  }
  function modClick() { if (!dev.power && !DV.seq) powerOnMod(); else { DV.press = 1; Sound.sfx.tick(); } }

  // ── particles
  function updateParticles(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.life += dt;
      if (p.life > p.max) { sparks.splice(i, 1); continue; }
      p.vy += (p.g ?? 200) * dt; p.vx *= 1 - 1.5 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = fallen.length - 1; i >= 0; i--) {
      const f = fallen[i]; f.t += dt;
      f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.ang += f.va * dt; f.heat *= 1 - 2 * dt;
      if (f.y > H + 80) fallen.splice(i, 1);
    }
  }
  function drawParticles() {
    fg.save();
    fg.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const k = 1 - p.life / p.max;
      if (p.streak) {
        fg.strokeStyle = `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${k})`; fg.lineWidth = p.s;
        fg.beginPath(); fg.moveTo(p.x, p.y); fg.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); fg.stroke();
      } else if (p.c[0] > 200) {
        fg.fillStyle = `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${k})`;
        fg.beginPath(); fg.arc(p.x, p.y, p.s, 0, TAU); fg.fill();
      }
    }
    fg.globalCompositeOperation = 'source-over';
    for (const p of sparks) {
      if (p.streak || p.c[0] > 200) continue;
      const k = 1 - p.life / p.max;
      fg.fillStyle = `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${k * 0.8})`;
      fg.fillRect(p.x, p.y, p.s, p.s);
    }
    for (const f of fallen) {
      fg.save(); fg.translate(f.x, f.y); fg.rotate(f.ang); fg.scale(f.k, f.k);
      Props.drawAsh(fg, f.T, f.len, f.R, f.heat, f.seed, f.rings, f.burn);
      fg.restore();
    }
    fg.restore();
  }

  // ── update
  const SIDE = [0.6, 0.66, 0.8], MAIN = [0.86, 0.85, 0.83], VAPOR = [0.97, 0.97, 0.98], BREATH = [0.92, 0.94, 0.97];
  function update(dt) {
    G.t += dt;
    G.idle += dt;
    const sz = LY.sz;
    const sc = Scenes.byId[S.place];
    // inhale bookkeeping
    if (I.down) {
      I.pressT += dt;
      if (!I.active && canInhale() && (I.pressT > 0.12 || G.phase === 'unlit' || G.phase === 'chain')) {
        I.active = true; I.amount = 0;
        if (I.ex) { I.ex = null; Sound.stopExhale(); }
      }
      if (I.active) {
        const V = VAPES[S.vape];
        const cap = S.mode === 'vape' ? V.drawMax : 2.5;
        const drawing = S.mode === 'vape' ? (G.phase === 'device' && (V.kind !== 'mod' || dev.power)) || G.phase === 'heated' : true;
        if (drawing) I.amount += dt / cap;
        if (I.amount > 1.18) cough();
      }
    }
    Sound.setInhale(I.active ? 0.6 + 0.4 * Math.min(1, I.amount) : 0);
    pose.k = approach(pose.k, I.active && (G.phase === 'lit' || G.phase === 'unlit' || G.phase === 'device' || G.phase === 'heated') ? 1 : 0, I.active ? 3.2 : 2.4, dt);
    G.focus = approach(G.focus, I.active ? 1 : I.ex ? 0.5 : 0, 2.5, dt);

    // ── phases
    const p = G.phase;
    if (p === 'pack' || p === 'taking') updatePack(dt);
    if (S.mode === 'cig') updateCig(dt);
    else updateDevice(dt);
    // lighter
    updateLighter(dt);
    // butts
    for (let i = butts.length - 1; i >= 0; i--) {
      const b = butts[i], c = b.c; b.t += dt;
      const k = Ease.inOutCubic(clamp(b.t / 0.5, 0, 1));
      const tx = W * 0.62, ty = H * 0.9;
      const half = (c.T.len - c.burn) * 0;
      c.x = lerp(b.x0, tx - Math.cos(1.0) * c.burn * LY.Sc * 0.9, k);
      c.y = lerp(b.y0, ty - Math.sin(1.0) * c.burn * LY.Sc * 0.9, k);
      c.ang = lerp(b.a0, 1.0, k);
      c.sx.step(dt); c.sy.step(dt); c.sa.step(dt);
      if (b.t > 0.5 && !b.sparked) {
        b.sparked = true;
        const e = emberPoint(c);
        Sound.sfx.stub(); buzz(22);
        G.shake = Math.max(G.shake, 0.35);
        for (let j = 0; j < 22; j++) sparks.push({ x: e[0], y: e[1], vx: rand(-160, 160), vy: rand(-220, 40), life: 0, max: rand(0.2, 0.6), c: [255, rand(120, 200), 60], s: rand(0.7, 1.6), g: 600, streak: Math.random() < 0.6 });
        Smoke.splat(e[0], e[1], rand(-20, 20), -60 * sz, SIDE, 0.55 * c.T.smoke, 9 * sz, 18 * sz);
        c.lit = false;
      }
      if (b.t > 0.5) { c.heat = approach(c.heat, 0, 6, dt); c.fade = clamp(1 - (b.t - 0.75) / 0.5, 0, 1); c.y += (b.t - 0.7 > 0 ? 260 * (b.t - 0.7) : 0) * dt; }
      if (b.t > 1.3) butts.splice(i, 1);
      else if (b.t < 0.5 && c.lit) emitSide(c, dt, 0.6);
    }
    updateParticles(dt);
    // deferred transitions
    if (G.after) { G.afterT -= dt; if (G.afterT <= 0) { const a = G.after; G.after = null; if (a === 'pack' && S.mode === 'cig') showPack(); if (a === 'chain' && S.mode === 'cig') startChain(); if (a === 'stick' && S.mode === 'vape') { DV.stickIn = 0; G.phase = 'stickWait'; if (S.chain) setTimeout(() => insertStick(), 500); } } }
    // exhale emission
    if (I.ex) emitExhale(dt);
    // cold breath
    if (env.cold && !I.active && !I.ex && G.started) {
      G.breathT -= dt;
      if (G.breathT < 0) { G.breathT = rand(3.6, 5.2); I.ex = { t: 0, dur: 0.9, vol: 0.22, dir: [rand(-0.15, 0.15), -1], rings: false, kind: 'breath', cloud: 1 }; }
    }
    // smoke environment
    const wb = sc.smoke.wind * (0.25 + env.wind * 1.7);
    let windX = wb * 34 * sz * (0.65 + 0.35 * fbm1(G.t * 0.17)) + env.wind * sc.smoke.wind * 50 * sz * Math.max(0, fbm1(G.t * 0.31 + 4));
    let windY = -4 * sz;
    if (sc.walking) { windX = -95 * sz - wb * 20 * sz; windY = 10 * sz; }
    Smoke.wind[0] = windX; Smoke.wind[1] = windY;
    Smoke.windRelax = sc.indoor ? 0.05 : sc.walking ? 0.6 : 0.32;
    Smoke.buoy = 105 * sz * sc.smoke.buoy;
    Smoke.curl = 16 + env.wind * 10 + (sc.walking ? 6 : 0);
    Smoke.dyeDiss = 0.3 * sc.smoke.diss * (1 + env.rain * 0.4 + env.wind * 0.5) * (S.mode === 'vape' ? 0.8 : 1);
    Smoke.velDiss = sc.indoor ? 0.45 : 0.3;
    const sink = scene.sinkScreen(G.cam);
    Smoke.sink = sink ? { x: sink.x, y: sink.y, strength: 260 * sz, radius: sink.r * 2.4, drain: 1.6 } : null;
    const amb = scene.ambient();
    const sk = sc.indoor ? 0.92 : 0.78 + 0.22 * env.dark;
    Smoke.amb = [clamp(amb[0] * sk + 0.03, 0, 1.2), clamp(amb[1] * sk + 0.03, 0, 1.2), clamp(amb[2] * sk + 0.05, 0, 1.2)];
    // lights for the smoke
    let ember = [0, 0, 0];
    const hc = C && (C.lit || C.lightP > 0) ? C : O;
    if (hc && (hc.lit || hc.lightP > 0)) { const e = emberPoint(hc); ember = [e[0], e[1], hc.heat * 0.55 * (0.4 + env.dark * 0.6)]; }
    if (S.mode === 'vape' && VAPES[S.vape].kind === 'mod' && DV.coil > 0.05) { const st = devSt(); const e = Props.devPoint(st, 0, -VAPES.mod.h / 2 + 38); ember = [e[0], e[1], DV.coil * 0.3]; }
    Smoke.ember = ember; Smoke.emberR = 60 * sz;
    let fl = [0, 0, 0];
    if (LT.flame > 0.02) { const f = flamePoint(); fl = [f[0], f[1], LT.flame * 0.75 * (0.45 + env.dark * 0.55)]; }
    Smoke.flame = fl; Smoke.flameR = 150 * sz;
    // haze
    const hdec = sc.indoor ? (sc.id === 'booth' ? 0.012 : 0.006) : 0.045;
    G.haze = Math.max(0, G.haze - hdec * dt);
    // camera
    const sway = reduceMotion ? 0 : 1;
    G.shake = Math.max(0, G.shake - dt * 1.6);
    const sh = G.shake * G.shake * 9;
    G.cam.x = (noise1(G.t * 0.21) * 7 + noise1(G.t * 0.9 + 9) * 1.2) * sway + rand(-sh, sh);
    G.cam.y = (noise1(G.t * 0.17 + 3) * 5 + noise1(G.t * 0.8 + 2) * 1) * sway + rand(-sh, sh);
    // footsteps
    if (sc.walking && G.started) { const st = scene.L && scene.L.data.step; if (st !== undefined && st !== G.walkStep) { G.walkStep = st; Sound.step(env.rain > 0, st % 2 ? 1 : -1); } }
    // audio ambience ticker
    G.audioT = (G.audioT || 0) - dt;
    if (G.audioT < 0) { G.audioT = 0.25; Sound.tick(G.t, sc.walking); }
  }
  function updatePack(dt) {
    P.tt += dt;
    const T = CIGS[S.cig];
    if (G.phase === 'pack') {
      P.alpha = approach(P.alpha, 1, 4, dt); P.y = approach(P.y, 0, 5, dt);
      P.open = approach(P.open, 0, 8, dt); P.rise = 0;
      P.shine = Math.max(0, P.shine - dt * 0.8);
    } else {
      const t = P.tt;
      P.open = t < 0.32 ? Ease.outBack(t / 0.32) : t < 0.95 ? 1 : 1 - Ease.inOutCubic(clamp((t - 0.95) / 0.3, 0, 1));
      P.rise = clamp((t - 0.3) / 0.38, 0, 1);
      if (t > 0.3 && !P.slid) { P.slid = true; Sound.sfx.slide(); }
      if (t >= 0.68 && !C) {
        C = newCig(S.cig);
        packs[S.cig] = Math.max(0, packLeft(S.cig) - 1); store.set('packs', packs);
        // start from the pack: vertical, filter up
        const st = packSt();
        st.left = packLeft(S.cig) + 1;
        const top = Props.packNext(CIGS[S.cig], st);
        C.x = top[0]; C.y = top[1]; C.ang = Math.PI / 2 + st.ang; C.sc = 1;
        C.from = { x: C.x, y: C.y, ang: C.ang };
        C.flyT = 0;
      }
      if (t > 0.68) { P.rise = 0; }
      if (t > 1.05 && !P.closed) { P.closed = true; Sound.sfx.pack(); }
      P.alpha = t > 0.8 ? clamp(1 - (t - 0.8) / 0.45, 0, 1) : 1;
      P.y = t > 0.8 ? Ease.inCubic(clamp((t - 0.8) / 0.45, 0, 1)) * H * 0.4 : 0;
      if (t > 1.45) { G.phase = 'unlit'; P.slid = false; P.closed = false; LT.target = 1; LT.kind = S.lighter; Sound.sfx.slide(); }
    }
  }
  function packSt() {
    const T = CIGS[S.cig];
    return { x: LY.pack.x, y: LY.pack.y + P.y + Math.sin(G.t * 1.3) * 2, ang: -0.035 + Math.sin(G.t * 0.7) * 0.01, sc: 1, S: LY.Sc, dpr: DPR, open: P.open, left: packLeft(S.cig), rise: P.rise, amb: ambFg(), alpha: P.alpha };
  }
  // laminar ribbon right above the coal (procedural), handing off to the fluid sim at its top
  function ribbonGeo(c, k = 1) {
    const T = c.T, R = T.dia / 2, sz = LY.sz;
    const st = cigSt(c);
    const off = Math.min(c.ash, 2.2) * 0.45 + 0.4;
    const base = Props.cigPoint(st, c.burn + off, -R * 0.75);
    const windK = Smoke.wind[0] / (60 * sz);
    const L = (52 + 22 * noise1(G.t * 0.27 + c.seed)) * sz / (1 + Math.abs(windK) * 0.5);
    return { base, L, lean: Smoke.wind[0] * 0.011, sz };
  }
  function ribbonX(g, c, s, strand) {
    const ph = c.seed + strand * 1.9;
    const amp = (0.35 + s * 0.055) * (1 + 0.6 * noise1(G.t * 0.45 + ph));
    return g.base[0] + Math.sin(s * 0.085 - G.t * 3.1 + ph) * amp + noise1(s * 0.025 + G.t * 0.55 + ph) * s * 0.16 + (g.lean * s * s) / g.L;
  }
  function drawRibbon(c, k = 1) {
    if (!c || !c.lit) return;
    const g = ribbonGeo(c);
    const inh = I.active && c === C ? 0.22 : 1;
    const a0 = 0.34 * inh * k * Math.min(1.3, c.T.smoke) * (c.fade ?? 1);
    if (a0 < 0.01) return;
    const am = Smoke.amb;
    const col = [clamp(255 * (0.25 + 0.75 * SIDE[0] * am[0] * 1.35), 0, 255) | 0, clamp(255 * (0.25 + 0.75 * SIDE[1] * am[1] * 1.35), 0, 255) | 0, clamp(255 * (0.25 + 0.75 * SIDE[2] * am[2] * 1.35), 0, 255) | 0];
    fg.save(); fg.lineCap = 'round';
    for (let si = 0; si < 3; si++) {
      let px = g.base[0], py = g.base[1];
      const N = 16;
      for (let i = 1; i <= N; i++) {
        const sP = (i / N) * g.L;
        const x = ribbonX(g, c, sP, si), y = g.base[1] - sP;
        const f = 1 - i / N;
        fg.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a0 * Math.pow(f, 0.8) * (si === 0 ? 1 : 0.45)})`;
        fg.lineWidth = (0.7 + (1 - f) * 2.4) * g.sz * (si === 0 ? 1 : 0.65);
        fg.beginPath(); fg.moveTo(px, py); fg.lineTo(x, y); fg.stroke();
        px = x; py = y;
      }
    }
    fg.restore();
  }
  function emitSide(c, dt, k = 1) {
    const T = c.T, sz = LY.sz;
    const g = ribbonGeo(c);
    const inh = I.active && c === C ? 0.3 : 1;
    const sTop = g.L * 0.86;
    const tx = ribbonX(g, c, sTop, 0), ty = g.base[1] - sTop;
    const amt = 7 * dt * inh * k * T.smoke * (0.85 + 0.3 * noise1(G.t * 3 + c.seed));
    Smoke.splat(tx, ty, (tx - ribbonX(g, c, sTop - 4, 0)) * 4 * dt * 40 + Smoke.wind[0] * 0.2 * dt * 40, -32 * sz * dt * 40, c.menthol ? [0.62, 0.72, 0.8] : SIDE, amt, 2.8 * sz * (T.cigar ? 1.4 : 1), 7 * sz);
  }
  function updateCig(dt) {
    const sz = LY.sz;
    // hero pose
    if (C) {
      const T = C.T;
      if (C.flyT !== undefined) {
        C.flyT += dt;
        const k = Ease.inOutCubic(clamp(C.flyT / 0.75, 0, 1));
        const rest = cigPoseRest(C, 0);
        const arc = Math.sin(k * Math.PI) * H * 0.06;
        C.x = lerp(C.from.x, rest.x, k); C.y = lerp(C.from.y, rest.y, k) - arc; C.ang = lerp(C.from.ang, rest.ang, k); C.sc = rest.sc;
        if (C.flyT > 0.75) delete C.flyT;
      } else if (G.phase === 'chain') {
        G.chainT += dt;
        const e = emberPoint(O);
        const k = LY.Sc * C.sc;
        const tx = e[0] - Math.cos(C.ang) * (C.T.len + 0.6) * k, ty = e[1] - Math.sin(C.ang) * (C.T.len + 0.6) * k;
        C.x = approach(C.x, tx, 7, dt); C.y = approach(C.y, ty, 7, dt);
      } else {
        const rest = cigPoseRest(C, pose.k);
        const sw = reduceMotion ? 0 : 1;
        const nx = (noise1(G.t * 0.33 + 5) * 3 + noise1(G.t * 1.1) * 0.6) * sw, ny = (noise1(G.t * 0.29 + 1) * 3.5 + noise1(G.t * 1.3 + 4) * 0.6) * sw;
        const rate = C.settle ? 10 : 6;
        C.x = approach(C.x || rest.x, rest.x + nx + G.cam.x * 0.5, rate, dt);
        C.y = approach(C.y || rest.y, rest.y + ny + G.cam.y * 0.5, rate, dt);
        C.ang = approach(C.ang, rest.ang + noise1(G.t * 0.4) * 0.012 * sw, rate, dt);
        C.sc = approach(C.sc, rest.sc, rate, dt);
      }
      C.sx.step(dt); C.sy.step(dt); C.sa.step(dt);
      // lighting
      if (G.phase === 'unlit' || G.phase === 'chain') {
        let src = 0;
        if (G.phase === 'unlit' && LT.flame > 0.55) src = LIGHTERS[LT.kind].rate;
        if (G.phase === 'chain' && I.active && G.chainT > 0.45) src = 1 / 0.65;
        if (src > 0 && I.active) C.lightP += src * dt;
        else C.lightP = Math.max(0, C.lightP - 0.25 * dt);
        if (G.phase === 'chain' && O) O.heat = approach(O.heat, I.active ? 1 : 0.3, 5, dt);
        C.heat = approach(C.heat, C.lightP, 6, dt);
        if (C.lightP > 0) { C.burn = T.len - C.lightP * 0.7; }
        if (C.lightP >= 1) {
          C.lit = true; C.lightP = 1; C.burn = T.len - 0.8; C.ash = 0.2;
          if (G.phase === 'chain') { finishCig(O); O = null; }
          G.phase = 'lit'; G.session = G.session || performance.now();
          if (!LT.on) LT.hideT = 0.3;
          updateAction();
        }
      }
      if (G.phase === 'lit' && C.lit) {
        const inh = I.active;
        C.heat = approach(C.heat, inh ? 1 : 0.2 + 0.08 * noise1(G.t * 0.9 + C.seed), inh ? 7 : 2.2, dt);
        const rate = (inh ? 2.05 : 0.1) * T.burn;
        const d = rate * dt;
        C.burn -= d; C.ash += d;
        C.droop = approach(C.droop, clamp((C.ash - 6) * 0.01, 0, 0.11), 3, dt);
        if (C.ash > T.maxAsh || (C.ash > T.maxAsh * 0.72 && Math.random() < dt * 0.04)) dropAsh(false);
        C.crackle = inh ? 0.6 + 0.4 * Math.min(1, I.amount * 2) : 0;
        emitSide(C, dt);
        // ember sparks on hard drags
        if (inh && Math.random() < dt * 1.2) { const e = emberPoint(C); sparks.push({ x: e[0], y: e[1], vx: rand(-30, 30), vy: rand(-90, -30), life: 0, max: rand(0.3, 0.7), c: [255, 170, 80], s: rand(0.6, 1.1), g: -40 }); }
        if (C.burn <= T.filter + 2.4) {
          if (S.chain) { G.phase = 'idle'; I.active = false; I.down = false; startChain(); }
          else { finishCig(C); C = null; G.phase = 'idle'; G.after = 'pack'; G.afterT = 1.3; }
          updateAction();
        }
      } else C.crackle = 0;
    }
    if (O) {
      O.sx.step(dt); O.sy.step(dt); O.sa.step(dt);
      const rest = cigPoseRest(O, 0);
      O.x = approach(O.x, rest.x + W * 0.08, 3, dt); O.y = approach(O.y, rest.y + H * 0.02, 3, dt); O.ang = approach(O.ang, -0.95, 3, dt);
      if (O.lit) emitSide(O, dt, 0.8);
    }
    const crk = Math.max(C ? C.crackle || 0 : 0, G.phase === 'chain' && I.active ? 0.5 : 0, G.phase === 'unlit' && C && C.lightP > 0 && I.active ? 0.7 : 0);
    Sound.setCrackle(crk);
  }
  function updateLighter(dt) {
    LT.kind = S.mode === 'cig' ? (LT.kind || S.lighter) : LT.kind;
    if (G.phase === 'unlit' && I.down && !LT.on && !I.struck && LT.vis > 0.86) strikeLighter();
    LT.vis = approach(LT.vis, LT.target, LT.target ? 5 : 6, dt);
    if (LT.target && LT.vis > 0.999) LT.vis = 1;
    if (LT.hideT > 0) { LT.hideT -= dt; if (LT.hideT <= 0) { LT.target = 0; LT.hideT = -1; } }
    if (LT.closeT > 0) { LT.closeT -= dt; if (LT.closeT <= 0) { LT.closeT = -1; LT.closing = true; Sound.sfx.oilClose(); } }
    if (LT.kind === 'oil') {
      if (LT.on) LT.open = approach(LT.open, 1, 14, dt);
      else if (LT.closing || LT.vis < 0.5) { LT.open = approach(LT.open, 0, 16, dt); if (LT.open < 0.01) LT.closing = false; }
    }
    if (LT.fail > 0) { LT.fail -= dt; }
    let fT = 0;
    if (LT.on) {
      if (LT.kind === 'bic') fT = LT.fail > 0 ? (LT.fail > 0.2 ? 0.8 : 0) : 1;
      else if (LT.kind === 'oil') fT = LT.open > 0.85 ? 1 : 0;
      else if (LT.kind === 'match') { LT.matchBurn += dt / 9; fT = LT.matchBurn < 1 ? 1 : 0; }
      else fT = 1;
      if (LT.kind === 'bic' && LT.fail > 0 && LT.fail < 0.05) { LT.on = false; }
    }
    if (LT.flare > 0) { LT.flare = Math.max(0, LT.flare - dt * 2.2); }
    const rate = fT > LT.flame ? (LT.kind === 'torch' ? 30 : 16) : (LT.kind === 'oil' ? 9 : 14);
    LT.flame = approach(LT.flame, fT + (LT.flare || 0) * 0.6, rate, dt);
    LT.strike = LT.on ? LT.strike + dt * 3 : LT.strike;
    Sound.setFlame(LT.kind, LT.flame);
    if (C && LT.vis > 0.01) lighterPose();
  }
  function devSt() {
    const V = VAPES[S.vape];
    const a = LY.dev, b = LY.devLip, k = pose.k;
    const sw = reduceMotion ? 0 : 1;
    const ent = Ease.outCubic(DV.enter);
    const buzzK = (G.phase === 'preheat' || G.phase === 'ejecting') && Math.sin(G.t * 90) > 0 ? 0.6 : 0;
    return {
      x: lerp(a.x, b.x, k) + (noise1(G.t * 0.33 + 5) * 3) * sw + G.cam.x * 0.5 + (1 - ent) * W * 0.3 + buzzK * (Math.random() - 0.5) * 2,
      y: lerp(a.y, b.y, k) + (noise1(G.t * 0.29 + 1) * 3.5) * sw + G.cam.y * 0.5 + (1 - ent) * H * 0.3,
      ang: lerp(a.ang, b.ang, k) + noise1(G.t * 0.4) * 0.012 * sw + (1 - ent) * 0.4,
      sc: lerp(1, b.sc, k), S: LY.Sd, dpr: DPR, flav: FLAVORS.find((f) => f.id === S.flavor), draw: DV.draw,
      liquid: V.kind === 'mod' ? dev.modLiquid : dev.liquid, bubbles: DV.bubbles, power: dev.power, boot: DV.boot, wake: DV.wake, clicks: DV.clicks, press: DV.press,
      watt: 75, battery: 0.82, coil: DV.coil, stickIn: DV.stickIn, preheat: DV.preheat, ready: DV.ready, puffsLeft: DV.puffsLeft, stickBurn: DV.stickBurn, blink: DV.blink, t: G.t, amb: ambFg(),
    };
  }
  function updateDevice(dt) {
    const V = VAPES[S.vape];
    DV.enter = approach(DV.enter, 1, 4, dt);
    const firing = I.active && ((G.phase === 'device' && (V.kind !== 'mod' || dev.power)) || G.phase === 'heated');
    DV.draw = approach(DV.draw, firing ? 1 : 0, firing ? 14 : 8, dt);
    DV.coil = approach(DV.coil, firing ? 1 : 0, firing ? 6 : 3, dt);
    DV.press = approach(DV.press, firing ? 1 : 0, 20, dt);
    DV.blink = Math.max(0, DV.blink - dt * 2);
    Sound.setCoil(DV.draw, V.kind === 'mod');
    if (firing) {
      if (V.kind === 'mod') dev.modLiquid = Math.max(0, dev.modLiquid - dt * 0.006);
      else if (!V.stick || V.kind === 'hybrid') dev.liquid = Math.max(0, dev.liquid - dt * 0.003);
      if ((V.kind === 'pod' || V.kind === 'mod' || V.kind === 'hybrid') && Math.random() < dt * 9) { DV.bubbles.push({ x: rand(0.15, 0.85), y: 0, r: rand(0.25, 0.7), v: rand(0.6, 1.4) }); if (Math.random() < 0.5) Sound.sfx.bubble(); }
    }
    for (let i = DV.bubbles.length - 1; i >= 0; i--) { const b = DV.bubbles[i]; b.y += b.v * dt; b.x += noise1(b.y * 4 + i) * dt * 0.1; if (b.y > 1) DV.bubbles.splice(i, 1); }
    if ((dev.liquid < 0.04 || dev.modLiquid < 0.04) && !firing) { if (dev.liquid < 0.04) dev.liquid = approach(dev.liquid, 1, 2, dt); if (dev.modLiquid < 0.04) dev.modLiquid = approach(dev.modLiquid, 1, 2, dt); if (!DV.refill) { DV.refill = true; Sound.sfx.podClick(); setTimeout(() => (DV.refill = false), 1500); } }
    // mod power-on sequence
    if (DV.seq) {
      DV.seq.t += dt;
      const n = Math.min(5, Math.floor(DV.seq.t / 0.085) + 1);
      if (n > DV.seq.n) { DV.seq.n = n; DV.clicks = n; DV.press = 1; Sound.sfx.tick(); }
      if (DV.seq.t > 0.5) { dev.power = true; saveDev(); DV.boot = 0; DV.seq = null; buzz(18); }
    }
    if (dev.power && DV.boot < 1) DV.boot = Math.min(1, DV.boot + dt * 2.2);
    DV.wake = dev.power ? 0 : Math.max(0, DV.wake - dt * 0.6);
    // heat-stick flow
    if (G.phase === 'inserting') {
      DV.tt += dt; DV.stickIn = Ease.inOutCubic(clamp(DV.tt / 0.55, 0, 1));
      if (DV.tt > 0.6) { G.phase = 'preheat'; DV.preheat = 0; DV.tt = 0; Sound.setBuzz(0.6); buzz(120); setTimeout(() => Sound.setBuzz(0), 260); updateAction(); }
    } else if (G.phase === 'preheat') {
      DV.preheat = clamp(DV.preheat + dt / V.preheat, 0, 1);
      if (DV.preheat >= 1) { G.phase = 'heated'; DV.ready = true; DV.puffsLeft = V.puffs; DV.session = 0; Sound.setBuzz(0.6); setTimeout(() => Sound.setBuzz(0), 140); setTimeout(() => { Sound.setBuzz(0.6); setTimeout(() => Sound.setBuzz(0), 140); }, 260); buzz([60, 80, 60]); G.session = G.session || performance.now(); }
    } else if (G.phase === 'heated') {
      DV.session += dt;
      if ((DV.puffsLeft <= 0 && !I.active && !I.ex) || DV.session > 300) ejectStick(true);
    } else if (G.phase === 'ejecting') {
      DV.tt += dt;
      DV.stickIn = 1 - Ease.outCubic(clamp(DV.tt / 0.35, 0, 1)) * 1.6;
      if (DV.tt > 0.5) { DV.stickIn = -1; G.phase = 'idleDev'; G.after = 'stick'; G.afterT = 0.6; DV.stickBurn = 0; }
    } else if (G.phase === 'stickWait') {
      DV.stickIn = 0 - Math.max(0, Math.sin(G.t * 2)) * 0.05;
    }
  }
  function emitExhale(dt) {
    const E = I.ex, sz = LY.sz;
    E.t += dt;
    if (E.t < 0) return;
    if (E.t > E.dur) { I.ex = null; return; }
    const pp = E.t / E.dur;
    const m = LY.mouth;
    const mx = m.x + noise1(G.t * 0.5) * W * 0.02, my = m.y;
    const col = E.kind === 'vape' ? VAPOR : E.kind === 'breath' ? BREATH : (E.menthol ? [0.84, 0.88, 0.88] : MAIN);
    if (E.pulses) {
      for (let i = 0; i < E.pulses.length; i++) {
        if (E.pulses[i] !== null && E.t >= E.pulses[i]) {
          E.pulses[i] = null;
          const sp = (E.cough ? 700 : 1500) * sz;
          const amt = (E.kind === 'vape' ? 0.9 : 0.55) * (E.cough ? 0.6 : 1) * E.cloud;
          Smoke.splat(mx, my - 8 * sz, E.dir[0] * sp, E.dir[1] * sp, col, amt, (E.cough ? 26 : 13) * sz, (E.cough ? 40 : 17) * sz);
        }
      }
      if (!E.cough) return;
    }
    const env1 = pp < 0.08 ? pp / 0.08 : Math.pow(1 - (pp - 0.08) / 0.92, 1.25);
    const vape = E.kind === 'vape', breath = E.kind === 'breath';
    const speed = (vape ? 260 + 380 * E.vol : breath ? 160 : 280 + 440 * E.vol) * env1 * sz;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const sp = rand(-0.42, 0.42) * (0.35 + pp) + (E.drift || 0) * pp * 0.35;
      const ca = Math.cos(sp), sa = Math.sin(sp);
      const dx = E.dir[0] * ca - E.dir[1] * sa, dy = E.dir[0] * sa + E.dir[1] * ca;
      const perSec = vape ? 26 * Math.sqrt(E.cloud) * (0.45 + 0.55 * E.vol) : breath ? 2.4 : 19 * E.cloud * (0.4 + 0.6 * E.vol);
      const amt = (perSec / n) * env1 * dt;
      const r = (vape ? (22 + 34 * pp) * Math.sqrt(E.cloud) : breath ? 12 + 14 * pp : 15 + 24 * pp) * sz;
      Smoke.splat(mx + rand(-1, 1) * W * 0.025 * (1 + pp * 1.5), my + rand(-1, 1) * 6, dx * speed * dt * 16, dy * speed * dt * 16, col, amt, r, r * 1.6);
    }
  }

  // ── render
  function render(dt) {
    const fx = { idle: G.idle, walkSpeed: G.started ? 1 : 0, haze: G.haze, flame: LT.flame * (LT.vis > 0.5 ? 1 : 0), onThunder: () => setTimeout(() => Sound.sfx.thunder(rand(0.5, 1)), rand(400, 1800)), onSwitch: (on) => { if (G.started) Sound.sfx.sw(); } };
    scene.draw(G.t, dt, G.cam, fx);
    fg.setTransform(DPR, 0, 0, DPR, 0, 0);
    fg.clearRect(0, 0, W, H);
    if (G.phase === 'pack' || G.phase === 'taking') Props.drawPack(fg, CIGS[S.cig], packSt());
    for (const b of butts) Props.drawCig(fg, b.c.T, cigSt(b.c));
    if (O) Props.drawCig(fg, O.T, cigSt(O));
    if (C) Props.drawCig(fg, C.T, cigSt(C));
    for (const b of butts) if (b.t < 0.5) drawRibbon(b.c, 0.6);
    if (O) drawRibbon(O, 0.8);
    if (C) drawRibbon(C);
    if (S.mode === 'vape' && G.started) Props.drawDevice(fg, VAPES[S.vape], devSt());
    if (LT.vis > 0.01 && C) Props.drawLighter(fg, LT.kind, { x: LT.x, y: LT.y, ang: LT.ang, sc: 1, S: LY.Sl, dpr: DPR, flame: LT.flame, open: LT.open, strike: LT.strike, t: G.t, wind: windForFlame(), col: LT.col, burnP: LT.matchBurn, amb: ambFg(), alpha: clamp(LT.vis * 1.5, 0, 1) });
    drawParticles();
    // light spill from the coal / flame
    const night = 0.25 + env.dark * 0.75;
    const hc = C && (C.lit || C.lightP > 0) ? C : null;
    fg.globalCompositeOperation = 'lighter';
    if (hc) { const e = emberPoint(hc); glow(fg, e[0], e[1], 180 * LY.sz * (0.6 + hc.heat * 0.6), [255, 110, 40], (0.03 + hc.heat * 0.12) * night); }
    if (LT.flame > 0.02) { const f = flamePoint(); glow(fg, f[0], f[1], 320 * LY.sz, [255, 160, 80], LT.flame * 0.16 * night); }
    if (S.mode === 'vape' && DV.draw > 0.05) { const st = devSt(), V = VAPES[S.vape]; const fl = FLAVORS.find((f) => f.id === S.flavor); const p = Props.devPoint(st, 0, V.h * 0.35); glow(fg, p[0], p[1], 120 * LY.sz, V.kind === 'heat' ? [255, 255, 255] : fl.c, 0.06 * DV.draw * night); }
    fg.globalCompositeOperation = 'source-over';
    Smoke.step(dt);
    Smoke.render();
    // css-driven focus/vignette
    rootStyle.setProperty('--focus', G.focus.toFixed(3));
    const warm = hc ? hc.heat * night : 0;
    rootStyle.setProperty('--warm', (warm * 0.5 + LT.flame * 0.35 * night).toFixed(3));
    rootStyle.setProperty('--flash', scene.flash.toFixed(3));
    updateRing();
  }
  function windForFlame() {
    const sc = Scenes.byId[S.place];
    if (sc.indoor) return noise1(G.t * 2) * 0.05;
    const w = env.wind * sc.smoke.wind;
    const base = sc.walking ? -0.5 : 0.15 + w * 0.6;
    return clamp(base * (0.6 + 0.6 * fbm1(G.t * 0.8)) + noise1(G.t * 6) * 0.06 * (1 + w * 3), -1, 1) * (LT.kind === 'oil' ? 0.4 : LT.kind === 'torch' ? 0.15 : 1);
  }
  const rootStyle = document.documentElement.style;

  // ── HUD
  const ring = $('#ring'), ringArc = ring.querySelector('.arc');
  const RING_LEN = 2 * Math.PI * 15;
  ringArc.style.strokeDasharray = RING_LEN;
  function updateRing() {
    const on = I.active && I.amount > 0.03;
    ring.classList.toggle('on', on);
    if (on) {
      const off = coarse ? 74 : 34;
      ring.style.transform = `translate(${I.x}px, ${I.y - off}px)`;
      ringArc.style.strokeDashoffset = RING_LEN * (1 - clamp(I.amount, 0, 1));
      ring.classList.toggle('full', I.amount > 0.9);
    }
  }
  const nCig = $('#nCig'), nPuff = $('#nPuff'), tPuff = $('#tallyPuff'), timerEl = $('#timer');
  function updateHUD() {
    nCig.textContent = stats.cig;
    nPuff.textContent = stats.puff;
    tPuff.hidden = !(stats.puff > 0 || S.mode === 'vape');
  }
  function bumpCount(puff) {
    updateHUD();
    const el = puff ? $('#tallyPuff') : $('#tallyCig');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  setInterval(() => {
    if (!G.session) { timerEl.textContent = ''; return; }
    const s = Math.floor((performance.now() - G.session) / 1000);
    timerEl.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }, 500);

  // ── dock + sheets
  const sheet = $('#sheet'), rail = $('#rail'), rail2 = $('#rail2');
  let sheetOpen = null;
  const ICON = {
    auto: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    day: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
    dusk: '<svg viewBox="0 0 24 24"><path d="M4 17h16M7 17a5 5 0 0 1 10 0"/><path d="M12 6v3M5.5 9.5l1.6 1.6M18.5 9.5l-1.6 1.6M3 20h18"/></svg>',
    night: '<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/></svg>',
    dawn: '<svg viewBox="0 0 24 24"><path d="M4 17h16M8 17a4 4 0 0 1 8 0"/><path d="M12 5v6M9.5 7.5 12 5l2.5 2.5M3 20h18"/></svg>',
    clear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5"/></svg>',
    cloudy: '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/></svg>',
    rain: '<svg viewBox="0 0 24 24"><path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/></svg>',
    snow: '<svg viewBox="0 0 24 24"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/></svg>',
    fog: '<svg viewBox="0 0 24 24"><path d="M4 9h16M6 13h12M4 17h16"/></svg>',
    wind: '<svg viewBox="0 0 24 24"><path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/></svg>',
  };
  function card(label, draw, active, onPick, w = 74, h = 92, cls = '') {
    const b = document.createElement('button');
    b.className = 'card ' + cls + (active ? ' on' : '');
    b.setAttribute('aria-label', label); b.type = 'button';
    const cv = document.createElement('canvas');
    const d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * d; cv.height = h * d; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    b.appendChild(cv);
    const sp = document.createElement('span'); sp.textContent = label; b.appendChild(sp);
    try { draw(cv.getContext('2d'), w, h, d, cv); } catch (e) { console.warn(e); }
    b.addEventListener('click', (ev) => { ev.stopPropagation(); Sound.sfx.pick(); onPick(); });
    return b;
  }
  function iconBtn(label, svg, active, onPick) {
    const b = document.createElement('button');
    b.className = 'chip' + (active ? ' on' : ''); b.type = 'button'; b.setAttribute('aria-label', label);
    b.innerHTML = svg + '<span>' + label + '</span>';
    b.addEventListener('click', (ev) => { ev.stopPropagation(); Sound.sfx.pick(); onPick(); });
    return b;
  }
  function openSheet(kind) {
    if (sheetOpen === kind) { closeSheet(); return; }
    sheetOpen = kind;
    rail.innerHTML = ''; rail2.innerHTML = ''; rail2.hidden = true;
    const amb1 = [1, 1, 1];
    if (kind === 'product' && S.mode === 'cig') {
      for (const T of Object.values(CIGS)) {
        rail.appendChild(card(T.name, (x, w, h, d) => {
          x.scale(d, d);
          const Sx = (w * 0.86) / (T.len * 0.95);
          const ang = -0.62, half = (T.len / 2) * Sx;
          Props.drawCig(x, T, { x: w / 2 - Math.cos(ang) * half, y: h * 0.46 - Math.sin(ang) * half, ang, sc: 1, S: Sx, burn: T.len, ash: 0, heat: 0, lit: false, lightP: 0, popped: false, seed: 1, ashSeed: 1, droop: 0, rings: [], t: 0, amb: amb1, dpr: d, fade: 1, capsule: T.capsule });
        }, S.cig === T.id, () => { pickCig(T.id); }));
      }
    } else if (kind === 'product') {
      for (const V of Object.values(VAPES)) {
        rail.appendChild(card(V.name, (x, w, h, d) => {
          x.scale(d, d);
          const Sx = (h * 0.74) / V.h;
          Props.drawDevice(x, V, { x: w / 2, y: h * 0.45, ang: 0.12, sc: 1, S: Sx, dpr: d, flav: FLAVORS.find((f) => f.id === S.flavor), draw: 0, liquid: 0.7, bubbles: [], power: true, boot: 1, wake: 0, clicks: 0, press: 0, watt: 75, coil: 0, stickIn: V.stick ? 1 : -1, preheat: -1, ready: false, puffsLeft: 0, stickBurn: 0, blink: 0, t: 0, amb: amb1 });
        }, S.vape === V.id, () => { pickVape(V.id); }));
      }
      if (VAPES[S.vape].flavors) {
        rail2.hidden = false;
        for (const f of FLAVORS) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'dot' + (S.flavor === f.id ? ' on' : '');
          b.style.setProperty('--c', rgba(f.c));
          b.setAttribute('aria-label', f.id);
          b.addEventListener('click', (ev) => { ev.stopPropagation(); Sound.sfx.pick(); S.flavor = f.id; saveS(); openSheet.refresh(); });
          rail2.appendChild(b);
        }
      }
    } else if (kind === 'lighter') {
      for (const L of Object.values(LIGHTERS)) {
        rail.appendChild(card(L.name, (x, w, h, d) => {
          x.scale(d, d);
          const Sx = (h * 0.62) / 80;
          Props.drawLighter(x, L.id, { x: w / 2, y: h * 0.34, ang: 0.0, sc: 1, S: Sx, dpr: d, flame: 0.8, open: 1, strike: 0, t: 1.3, wind: 0, col: LT.col, burnP: 0.1, amb: amb1, alpha: 1 });
        }, S.lighter === L.id, () => { pickLighter(L.id); }));
      }
    } else if (kind === 'place') {
      const e = Scenes.env(curTime(), S.weather);
      for (const sc of Scenes.list) {
        rail.appendChild(card(sc.name, (x, w, h, d, cv) => { Scenes.thumb(sc, e, cv); }, S.place === sc.id, () => { pickPlace(sc.id); }, 78, 104, 'scene'));
      }
    } else if (kind === 'atmos') {
      const times = [['auto', '지금'], ['day', '낮'], ['dusk', '노을'], ['night', '밤'], ['dawn', '새벽']];
      for (const [id, lb] of times) rail.appendChild(iconBtn(lb, ICON[id], S.time === id, () => { S.time = id; saveS(); refreshScene(); openSheet.refresh(); }));
      rail2.hidden = false;
      const ws = [['clear', '맑음'], ['cloudy', '흐림'], ['rain', '비'], ['snow', '눈'], ['fog', '안개'], ['wind', '바람']];
      for (const [id, lb] of ws) rail2.appendChild(iconBtn(lb, ICON[id], S.weather === id, () => { S.weather = id; saveS(); refreshScene(); openSheet.refresh(); }));
    }
    sheet.classList.add('open');
    sheet.dataset.kind = kind;
    document.querySelectorAll('#dock [data-sheet]').forEach((b) => b.classList.toggle('active', b.dataset.sheet === kind));
  }
  openSheet.refresh = () => { const k = sheetOpen; sheetOpen = null; openSheet(k); };
  function closeSheet() {
    sheetOpen = null; sheet.classList.remove('open');
    document.querySelectorAll('#dock [data-sheet]').forEach((b) => b.classList.remove('active'));
  }
  function pickCig(id) {
    if (S.cig === id) { closeSheet(); return; }
    S.cig = id; saveS(); closeSheet();
    if (S.mode === 'cig') { if (C) { finishCig(C, false); C = null; } O = null; LT.target = 0; G.phase = 'idle'; G.after = 'pack'; G.afterT = 0.5; }
    updateDock();
  }
  function pickVape(id) {
    S.vape = id; saveS();
    if (VAPES[id].flavors) openSheet.refresh(); else closeSheet();
    if (S.mode === 'vape') enterDevice();
    updateDock(); updateAction();
  }
  function pickLighter(id) {
    S.lighter = id; saveS(); closeSheet();
    LT.kind = id; LT.open = 0; LT.matchBurn = 0; LT.matchUsed = false; LT.col = pick(Props.BIC_COLS);
    if (G.phase === 'unlit') { LT.vis = 0; LT.target = 1; Sound.sfx.slide(); }
  }
  function pickPlace(id) {
    if (S.place === id) { closeSheet(); return; }
    S.place = id; saveS(); closeSheet();
    $('#curtain').classList.add('on');
    setTimeout(() => { refreshScene(); G.haze = 0; Smoke.clear(); G.idle = 0; $('#curtain').classList.remove('on'); }, 380);
  }
  function setMode(m) {
    if (S.mode === m) return;
    if (C) { finishCig(C, false); C = null; }
    O = null; butts.length = 0;
    S.mode = m; saveS();
    LT.target = 0; LT.vis = 0; LT.on = false; LT.flame = 0;
    Sound.setCrackle(0); Sound.setCoil(0); Sound.setFlame('bic', 0);
    enterMode();
  }
  function updateDock() {
    $('#dock').dataset.mode = S.mode;
    $('#bChain').classList.toggle('on', !!S.chain);
    $('#bChain').setAttribute('aria-pressed', String(!!S.chain));
    $('#bSound').classList.toggle('off', !S.sound);
  }
  function updateAction() {
    const a = $('#bAction');
    const show = (G.phase === 'lit' && S.mode === 'cig') || G.phase === 'heated' || G.phase === 'preheat';
    a.classList.toggle('show', show);
    a.dataset.kind = S.mode === 'cig' ? 'stub' : 'eject';
  }
  document.querySelectorAll('#mode button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Sound.sfx.ui(); setMode(b.dataset.mode); updateDock(); }));
  document.querySelectorAll('#dock [data-sheet]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Sound.sfx.ui(); openSheet(b.dataset.sheet); }));
  $('#bChain').addEventListener('click', (e) => { e.stopPropagation(); S.chain = !S.chain; saveS(); updateDock(); Sound.sfx.pick(); buzz(8); });
  $('#bAction').addEventListener('click', (e) => { e.stopPropagation(); stubOut(); });
  $('#bSound').addEventListener('click', (e) => { e.stopPropagation(); S.sound = !S.sound; saveS(); Sound.setEnabled(S.sound); updateDock(); });
  const bFull = $('#bFull');
  const fsEl = document.documentElement;
  if (!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen) || !document.fullscreenEnabled) bFull.hidden = true;
  bFull.addEventListener('click', (e) => {
    e.stopPropagation();
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl).catch?.(() => {});
    } catch (err) {}
  });
  ['pointerdown', 'pointerup', 'touchstart'].forEach((ev) => { $('#ui').addEventListener(ev, (e) => { if (e.target.closest('button,#sheet')) e.stopPropagation(); }, { passive: true }); });

  // stage pointer handling
  let activePointer = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!G.started) return;
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    I.kb = false;
    pressStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => { if (e.pointerId === activePointer) pressMove(e.clientX, e.clientY); });
  const endP = (e) => { if (e.pointerId !== activePointer) return; activePointer = null; pressEnd(e.clientX, e.clientY); };
  stage.addEventListener('pointerup', endP);
  stage.addEventListener('pointercancel', endP);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  // keyboard
  window.addEventListener('keydown', (e) => {
    if (!G.started) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); start(); } return; }
    if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
    if (e.code === 'Space') { e.preventDefault(); I.kb = true; pressStart(W * 0.5, H * 0.38); }
    else if (e.code === 'KeyF') flick();
    else if (e.code === 'KeyC') popCapsule();
    else if (e.code === 'KeyX') stubOut();
    else if (e.code === 'KeyM') { setMode(S.mode === 'cig' ? 'vape' : 'cig'); updateDock(); }
    else if (e.code === 'Escape') closeSheet();
    else if (/^Digit[1-6]$/.test(e.code)) pickPlace(Scenes.list[+e.code.slice(5) - 1].id);
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' && G.started) { e.preventDefault(); pressEnd(W * 0.5, H * 0.38); } });

  // ── intro
  function start() {
    if (G.started) return;
    G.started = true;
    Sound.unlock(); Sound.setEnabled(S.sound);
    refreshScene();
    requestWake();
    dissolveTitle();
    document.body.classList.add('live');
    setTimeout(() => { enterMode(); }, 650);
  }
  function dissolveTitle() {
    const h1 = $('#intro h1');
    const r = h1.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    const cv = makeCanvas(r.width, r.height), x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; x.textBaseline = 'middle'; x.textAlign = 'center';
    if (x.letterSpacing !== undefined) x.letterSpacing = cs.letterSpacing;
    x.fillText(h1.textContent.trim(), r.width / 2 + parseFloat(cs.letterSpacing || 0) / 2, r.height / 2);
    const data = x.getImageData(0, 0, cv.width, cv.height).data;
    const pts = [];
    for (let i = 0; i < 2400 && pts.length < 230; i++) {
      const px = Math.floor(Math.random() * cv.width), py = Math.floor(Math.random() * cv.height);
      if (data[(py * cv.width + px) * 4 + 3] > 120) pts.push([r.left + px, r.top + py]);
    }
    const sz = LY.sz;
    for (const [px, py] of pts) Smoke.splat(px, py, rand(-30, 30) * sz, rand(-70, -10) * sz, [0.9, 0.88, 0.85], 0.32, 2.6 * sz, 9 * sz);
    Sound.sfx.whoosh();
    $('#intro').classList.add('gone');
  }
  $('#start').addEventListener('click', (e) => { e.stopPropagation(); start(); });
  $('#intro').addEventListener('click', () => start());

  // wake lock
  let wake = null;
  async function requestWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => (wake = null)); } } catch (e) {} }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Sound.suspend(); if (I.down) pressEnd(I.x, I.y); }
    else { Sound.resume(); if (G.started) requestWake(); last = performance.now(); }
  });

  // ── loop
  let last = performance.now(), errOnce = false, perf = { acc: 0, n: 0, lowT: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) return;
    dt = FIXED ? 1 / 60 : Math.min(dt, 0.05);
    try { update(dt); render(dt); }
    catch (err) { if (!errOnce) { errOnce = true; console.error(err); } }
    // adaptive quality
    perf.acc += dt; perf.n++;
    if (perf.n >= 90) {
      const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
      if (avg > 0.026 && G.started && !FIXED && !QS.get('q')) { perf.lowT++; if (perf.lowT >= 2) { perf.lowT = 0; if (Smoke.quality === 'high') Smoke.setQuality('mid'); else if (Smoke.quality === 'mid') Smoke.setQuality('low'); } }
      else perf.lowT = 0;
    }
  }
  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  // grain texture
  (function grain() {
    const c = makeCanvas(140, 140), x = c.getContext('2d'), d = x.createImageData(140, 140);
    for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    try { $('#grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`; } catch (e) {}
  })();
  resize();
  updateHUD(); updateDock(); updateAction();
  window.__damta = { G, S, I, LT, get LY() { return LY; }, tip: () => C && tipPoint(C), get C() { return C; }, Smoke, scene, start, pressStart, pressEnd, pressMove, setMode, pickPlace, stubOut, flick, info: () => Smoke.info() };
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
})();
