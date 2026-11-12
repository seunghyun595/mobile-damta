// ───────────────────────── scenes (procedural, out-of-focus backgrounds) ─────────────────────────
const Scenes = (() => {
  const TIMES = {
    day: { sky: ['#41709e', '#6b95bd', '#9fbdd6', '#d3e0e9'], haze: '#cad6df', dark: 0.06, lamps: 0.04, amb: [0.97, 0.97, 1.0], cloudCol: '#c7d2dc', cloudLit: '#ffffff', bld: '#5d6e80' },
    dusk: { sky: ['#1c2141', '#563963', '#c0626b', '#f19a69', '#ffd398'], haze: '#d2856f', dark: 0.42, lamps: 0.7, amb: [1.0, 0.84, 0.72], cloudCol: '#6e4664', cloudLit: '#ffb48a', bld: '#271f33' },
    night: { sky: ['#020409', '#060b16', '#0d152a', '#1a2440'], haze: '#1b2236', dark: 0.9, lamps: 1, amb: [0.6, 0.63, 0.76], cloudCol: '#161d31', cloudLit: '#2b3452', bld: '#0a0e17' },
    dawn: { sky: ['#0a1325', '#20365a', '#56769d', '#b2bdca', '#e6c9b6'], haze: '#8593a9', dark: 0.55, lamps: 0.6, amb: [0.76, 0.82, 0.95], cloudCol: '#465674', cloudLit: '#e6b7a3', bld: '#1a2436' },
  };
  const WEATHERS = {
    clear: { cloud: 0.12, grey: 0, dim: 1, darken: 0, rain: 0, snow: 0, fog: 0.04, wind: 0.18 },
    cloudy: { cloud: 0.85, grey: 0.45, dim: 0.95, darken: 0.05, rain: 0, snow: 0, fog: 0.14, wind: 0.28 },
    rain: { cloud: 1, grey: 0.6, dim: 0.8, darken: 0.12, rain: 1, snow: 0, fog: 0.22, wind: 0.32 },
    snow: { cloud: 0.95, grey: 0.5, dim: 1.08, darken: 0.02, rain: 0, snow: 1, fog: 0.2, wind: 0.2 },
    fog: { cloud: 0.7, grey: 0.4, dim: 1.02, darken: 0, rain: 0, snow: 0, fog: 0.85, wind: 0.05 },
    wind: { cloud: 0.55, grey: 0.15, dim: 1, darken: 0, rain: 0, snow: 0, fog: 0.05, wind: 1 },
  };
  function env(timeId, weatherId) {
    const T = TIMES[timeId], W = WEATHERS[weatherId];
    const grey = (c) => { const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return [l * 0.98 * W.dim, l * 1.0 * W.dim, l * 1.04 * W.dim]; };
    const wx = (c) => mixc(c, grey(c), W.grey);
    return {
      time: timeId, weather: weatherId,
      sky: T.sky.map(hex).map(wx), haze: wx(hex(T.haze)),
      dark: clamp(T.dark + W.darken, 0, 1), lamps: T.lamps,
      amb: T.amb.map((v) => v * (1 - W.grey * 0.12)),
      cloud: W.cloud, cloudCol: wx(hex(T.cloudCol)), cloudLit: wx(hex(T.cloudLit)), bld: wx(hex(T.bld)),
      rain: W.rain, snow: W.snow, fog: W.fog, wind: W.wind,
      thunder: W.rain > 0 && T.dark > 0.5, stars: weatherId === 'clear' && timeId === 'night',
      cold: W.snow > 0 || timeId === 'dawn',
    };
  }
  function autoTime(d = new Date()) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5.5 && h < 7.5) return 'dawn';
    if (h >= 7.5 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'dusk';
    return 'night';
  }
  const hash = (k, s = 0) => { let x = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ── shared painters
  function paintSky(ctx, w, hz, e) {
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    e.sky.forEach((c, i) => g.addColorStop(i / (e.sky.length - 1), rgba(c)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 2);
  }
  function paintStars(ctx, w, hz, r) {
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = Math.pow(r(), 1.4) * hz * 0.85, a = r() * r() * 0.8, s = r() < 0.06 ? 1.6 : 0.8;
      ctx.fillStyle = `rgba(220,228,255,${a})`; ctx.fillRect(x, y, s, s);
    }
  }
  function paintCelestial(ctx, w, hz, e, m) {
    const k = 1 - e.cloud * 0.85;
    if (e.time === 'night') {
      const x = w * 0.8, y = hz * 0.22, rr = m * 0.022;
      glow(ctx, x, y, rr * 12, [170, 190, 230], 0.12 * k);
      ctx.fillStyle = rgba([232, 236, 246], 0.92 * k); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    } else if (e.time === 'dusk') {
      const x = w * 0.72, y = hz * 0.94, rr = m * 0.055;
      glow(ctx, x, y, rr * 13, [255, 150, 90], 0.38 * k);
      glow(ctx, x, y, rr * 3.4, [255, 214, 160], 0.55 * k);
      ctx.fillStyle = rgba([255, 230, 190], 0.9 * k); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    } else if (e.time === 'dawn') {
      glow(ctx, w * 0.18, hz, m * 1.1, [255, 196, 168], 0.26 * k);
    } else {
      glow(ctx, w * 0.84, hz * 0.05, m * 1.1, [255, 255, 246], 0.22 * k);
    }
  }
  function paintClouds(ctx, w, hz, e, r) {
    const n = Math.round(5 + e.cloud * 26);
    for (let i = 0; i < n; i++) {
      const y = hz * (0.05 + r() * 0.8), x = r() * w, cw = w * (0.2 + r() * 0.45), ch = cw * (0.1 + r() * 0.12);
      for (let k = 0; k < 7; k++) {
        const px = x + (r() - 0.5) * cw, py = y + (r() - 0.5) * ch, pr = ch * (0.6 + r() * 1.1);
        ctx.save(); ctx.translate(px, py); ctx.scale(2.2, 1);
        const g = ctx.createRadialGradient(0, -pr * 0.25, 0, 0, 0, pr);
        g.addColorStop(0, rgba(e.cloudLit, 0.2 + e.cloud * 0.12));
        g.addColorStop(0.55, rgba(e.cloudCol, 0.14 + e.cloud * 0.1));
        g.addColorStop(1, rgba(e.cloudCol, 0));
        ctx.fillStyle = g; ctx.fillRect(-pr, -pr, pr * 2, pr * 2);
        ctx.restore();
      }
    }
  }
  const WIN_WARM = [255, 206, 140], WIN_COOL = [200, 222, 255], WIN_WHITE = [236, 238, 240];
  function paintSkyline(ctx, w, base, e, r, o) {
    let x = -o.maxW * r();
    while (x < w) {
      const bw = lerp(o.minW, o.maxW, r()), bh = lerp(o.minH, o.maxH, Math.pow(r(), o.pow || 1.5));
      const top = base - bh;
      const tk = r(), day = 1 - e.dark;
      const bc = mixc(o.col, tk < 0.3 ? [214, 196, 170] : tk < 0.65 ? [150, 170, 192] : [222, 226, 230], (o.vary ?? 0.3) * day);
      const bg = ctx.createLinearGradient(0, top, 0, base);
      bg.addColorStop(0, rgba(shade(bc, 0.07 * day))); bg.addColorStop(1, rgba(shade(bc, -0.14)));
      ctx.fillStyle = bg;
      ctx.fillRect(x, top, bw - o.gap, bh + 4);
      ctx.fillStyle = `rgba(0,0,0,${0.1 + 0.08 * day})`; ctx.fillRect(x + (bw - o.gap) * 0.7, top, (bw - o.gap) * 0.3, bh + 4);
      ctx.fillStyle = rgba(bc);
      if (r() < 0.35) ctx.fillRect(x + bw * 0.42, top - bh * 0.07, Math.max(1, bw * 0.06), bh * 0.07);
      if (r() < 0.2) ctx.fillRect(x + bw * 0.15, top - bh * 0.03, bw * 0.4, bh * 0.03);
      if (o.winA > 0.01) {
        const cols = Math.max(2, Math.floor((bw - o.gap) / o.winW)), rows = Math.max(1, Math.floor(bh / o.winH));
        const style = r(); const lit = o.lit * (0.4 + r() * 0.9);
        for (let i = 1; i < rows; i++) for (let j = 0; j < cols; j++) {
          if (r() > lit) continue;
          const wc = style < 0.45 ? WIN_WARM : style < 0.85 ? WIN_COOL : WIN_WHITE;
          ctx.fillStyle = rgba(wc, o.winA * (0.35 + r() * 0.65));
          ctx.fillRect(x + j * o.winW + o.winW * 0.2, top + i * o.winH + o.winH * 0.25, o.winW * 0.55, o.winH * 0.45);
        }
      }
      if (o.dayWin && e.dark < 0.6) {
        const k = 1 - e.dark, style = r();
        const sky = e.sky[Math.min(1, e.sky.length - 1)];
        if (style < 0.5) {
          for (let i = 1; i < bh / o.winH; i += 1) { ctx.fillStyle = rgba(mixc(sky, [255, 255, 255], 0.3), 0.22 * k); ctx.fillRect(x + 1, top + i * o.winH, bw - o.gap - 2, o.winH * 0.45); }
        } else {
          for (let i = 1; i < bh / o.winH; i++) for (let j = 0; j < (bw - o.gap) / o.winW - 1; j++) { ctx.fillStyle = r() < 0.25 ? `rgba(20,28,38,${0.3 * k})` : rgba(mixc(sky, [255, 255, 255], 0.35), 0.2 * k); ctx.fillRect(x + j * o.winW + o.winW * 0.25, top + i * o.winH + o.winH * 0.2, o.winW * 0.5, o.winH * 0.5); }
        }
      }
      if (o.lights && bh > o.maxH * 0.62 && r() < 0.7) o.lights.push({ x: x + bw * 0.45, y: top - bh * 0.07, ph: r() * TAU, sp: 1.6 + r() * 1.2 });
      x += bw;
    }
  }
  function quad(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.lineTo(p[6], p[7]); ctx.closePath(); }

  // ══════════════ ROOFTOP ══════════════
  const roof = {
    id: 'roof', name: '옥상', indoor: false, walking: false,
    smoke: { wind: 1, buoy: 1, diss: 1 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(101);
      const hz = fh * 0.6;
      let c = L.far.getContext('2d');
      paintSky(c, fw, hz + fh * 0.1, e);
      if (e.stars) paintStars(c, fw, hz, r);
      paintCelestial(c, fw, hz, e, m);
      paintClouds(c, fw, hz, e, r);
      // generic broadcast tower on a hill
      const tx = fw * 0.2, hillY = hz + fh * 0.01;
      c.fillStyle = rgba(mixc(e.bld, e.haze, 0.55));
      c.beginPath(); c.ellipse(tx, hillY + fh * 0.03, fw * 0.2, fh * 0.06, 0, Math.PI, TAU); c.fill();
      const tTop = hz - fh * 0.2;
      c.fillRect(tx - m * 0.004, tTop, m * 0.008, hillY - tTop);
      c.beginPath(); c.ellipse(tx, tTop + fh * 0.045, m * 0.017, m * 0.008, 0, 0, TAU); c.fill();
      c.fillRect(tx - m * 0.0015, tTop - fh * 0.05, m * 0.003, fh * 0.05);
      L.data.tower = { x: tx, y: tTop - fh * 0.05, deck: tTop + fh * 0.045 };
      const blink = [];
      paintSkyline(c, fw, hz + fh * 0.02, e, r, { minH: fh * 0.03, maxH: fh * 0.12, minW: fw * 0.02, maxW: fw * 0.05, col: mixc(e.bld, e.haze, 0.6), gap: 1, winA: e.lamps * 0.5, winW: 3, winH: 3, lit: 0.4 });
      paintSkyline(c, fw, hz + fh * 0.075, e, r, { minH: fh * 0.07, maxH: fh * 0.3, minW: fw * 0.05, maxW: fw * 0.11, col: mixc(e.bld, e.haze, 0.25), gap: 2, winA: e.lamps * 0.85, winW: 5, winH: 5, lit: 0.5, lights: blink, dayWin: true, pow: 2.2, vary: 0.35 });
      L.data.blink = blink;
      const hg = c.createLinearGradient(0, hz - fh * 0.12, 0, hz + fh * 0.12);
      hg.addColorStop(0, rgba(e.haze, 0)); hg.addColorStop(0.6, rgba(e.haze, 0.35 + e.fog * 0.4)); hg.addColorStop(1, rgba(e.haze, 0.1));
      c.fillStyle = hg; c.fillRect(0, hz - fh * 0.12, fw, fh * 0.24);
      c.fillStyle = rgba(mixc(e.bld, [0, 0, 0], 0.2)); c.fillRect(0, hz + fh * 0.07, fw, fh);

      // near layer
      c = L.near.getContext('2d');
      const lit = 1 - e.dark * 0.82;
      const tank = mixc([70, 92, 112], e.bld, 0.5 + e.dark * 0.4).map((v) => v * (0.6 + lit * 0.5));
      // FRP water tank, left
      const tkx = -fw * 0.02, tky = fh * 0.55, tkw = fw * 0.25, tkh = fh * 0.15;
      c.fillStyle = rgba(tank); c.fillRect(tkx, tky, tkw, tkh);
      c.strokeStyle = rgba(shade(tank, -0.35), 0.8); c.lineWidth = 1.2;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(tkx + (tkw * i) / 5, tky); c.lineTo(tkx + (tkw * i) / 5, tky + tkh); c.stroke(); }
      for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(tkx, tky + (tkh * i) / 3); c.lineTo(tkx + tkw, tky + (tkh * i) / 3); c.stroke(); }
      c.fillStyle = rgba(shade(tank, 0.25), 0.5); c.fillRect(tkx, tky, tkw, 2);
      c.fillStyle = rgba(shade(tank, -0.5)); c.fillRect(tkx + tkw * 0.1, tky + tkh, fw * 0.012, fh * 0.06); c.fillRect(tkx + tkw * 0.85, tky + tkh, fw * 0.012, fh * 0.06);
      // AC outdoor units, right
      const acc = mixc([150, 152, 150], e.bld, 0.35 + e.dark * 0.5).map((v) => v * (0.5 + lit * 0.55));
      for (let i = 0; i < 2; i++) {
        const ax = fw * (0.75 + i * 0.12), ay = fh * (0.645 - i * 0.012), aw = fw * 0.11, ah = fh * 0.075;
        c.fillStyle = rgba(acc); c.fillRect(ax, ay, aw, ah);
        c.fillStyle = rgba(shade(acc, -0.45)); c.beginPath(); c.arc(ax + aw * 0.4, ay + ah * 0.5, ah * 0.36, 0, TAU); c.fill();
        c.strokeStyle = rgba(shade(acc, -0.2)); c.lineWidth = 1;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(ax + aw * 0.4, ay + ah * 0.5, ah * (0.1 + k * 0.08), 0, TAU); c.stroke(); }
        c.fillStyle = rgba(shade(acc, 0.2), 0.6); c.fillRect(ax, ay, aw, 1.5);
      }
      // parapet + railing
      const metal = mixc([52, 56, 64], [10, 12, 16], e.dark * 0.6);
      const railY = fh * 0.715;
      c.fillStyle = rgba(mixc([96, 98, 102], [22, 24, 30], e.dark * 0.8)); c.fillRect(0, fh * 0.85, fw, fh * 0.05);
      c.fillStyle = rgba(mixc([130, 132, 136], [40, 42, 50], e.dark * 0.8)); c.fillRect(0, fh * 0.85, fw, fh * 0.006);
      for (let x = fw * 0.03; x < fw; x += fw * 0.105) { c.fillStyle = rgba(metal); c.fillRect(x, railY, m * 0.012, fh * 0.14); }
      for (const [y, t] of [[railY, 0.016], [railY + fh * 0.065, 0.009]]) {
        c.fillStyle = rgba(metal); c.fillRect(0, y, fw, m * t);
        c.fillStyle = rgba(shade(metal, 0.5 + (1 - e.dark) * 0.3), 0.7); c.fillRect(0, y, fw, Math.max(1, m * t * 0.25));
        if (e.snow > 0) { c.fillStyle = 'rgba(240,244,250,0.85)'; c.fillRect(0, y - m * 0.006, fw, m * 0.007); }
      }
      // green urethane rooftop floor
      const fl = c.createLinearGradient(0, fh * 0.89, 0, fh);
      const green = mixc([72, 122, 98], [16, 30, 26], e.dark * 0.85);
      fl.addColorStop(0, rgba(shade(green, -0.15))); fl.addColorStop(1, rgba(shade(green, -0.45)));
      c.fillStyle = fl; c.fillRect(0, fh * 0.89, fw, fh * 0.11);
      c.fillStyle = rgba(shade(green, 0.3), 0.18 + e.rain * 0.25); c.fillRect(0, fh * 0.9, fw, fh * 0.01);
      if (e.rain > 0) for (let i = 0; i < 9; i++) { c.fillStyle = rgba(e.sky[e.sky.length - 1], 0.18); c.beginPath(); c.ellipse(r() * fw, fh * (0.92 + r() * 0.07), fw * (0.04 + r() * 0.08), fh * 0.006, 0, 0, TAU); c.fill(); }
      if (e.snow > 0) { c.fillStyle = 'rgba(232,238,246,0.55)'; c.fillRect(0, fh * 0.895, fw, fh * 0.105); }
      // paint-can ashtray
      const cx = fw * 0.86, cy = fh * 0.905, cw = m * 0.05, ch = m * 0.06;
      const can = mixc([170, 46, 40], [40, 12, 12], e.dark * 0.75);
      c.fillStyle = rgba(can); c.fillRect(cx - cw / 2, cy - ch, cw, ch);
      c.fillStyle = rgba(shade(can, 0.35)); c.fillRect(cx - cw / 2, cy - ch, cw * 0.18, ch);
      c.fillStyle = rgba(shade(can, -0.4)); c.beginPath(); c.ellipse(cx, cy - ch, cw / 2, cw * 0.14, 0, 0, TAU); c.fill();
      L.data.ground = [fh * 0.9, fh];
    },
    draw(ctx, L, e, t, dt, o) {
      ctx.drawImage(L.far, o.fx, o.fy);
      const m = Math.min(L.fw, L.fh);
      if (e.lamps > 0.2) {
        for (const b of L.data.blink) {
          const a = Math.pow(0.5 + 0.5 * Math.sin(t * b.sp + b.ph), 8) * e.lamps;
          if (a < 0.02) continue;
          glow(ctx, o.fx + b.x, o.fy + b.y, m * 0.03, [255, 40, 30], a * 0.5);
          bokeh(ctx, o.fx + b.x, o.fy + b.y, m * 0.006, [255, 80, 60], a);
        }
        const T = L.data.tower, ta = (0.5 + 0.5 * Math.sin(t * 1.4)) * e.lamps;
        glow(ctx, o.fx + T.x, o.fy + T.y, m * 0.025, [255, 50, 40], ta * 0.6);
        glow(ctx, o.fx + T.x, o.fy + T.deck, m * 0.04, [255, 230, 190], e.lamps * 0.35);
        // aircraft crossing
        const D = L.data;
        D.plane = D.plane || { x: -1, t: 6 };
        D.plane.t -= dt;
        if (D.plane.t < 0 && D.plane.x < 0) { D.plane.x = L.fw * 1.05; D.plane.y = L.fh * rand(0.08, 0.3); D.plane.t = rand(25, 50); }
        if (D.plane.x >= 0) {
          D.plane.x -= dt * L.fw * 0.018;
          const bl = Math.sin(t * 6) > 0.6 ? 1 : 0.15;
          glow(ctx, o.fx + D.plane.x, o.fy + D.plane.y, m * 0.012, [255, 255, 255], 0.6 * bl);
          glow(ctx, o.fx + D.plane.x + m * 0.01, o.fy + D.plane.y, m * 0.008, [255, 60, 60], 0.5 * (1 - bl));
          if (D.plane.x < -20) D.plane.x = -1;
        }
      }
      ctx.drawImage(L.near, o.nx, o.ny);
      o.weather(null);
    },
    amb(e) { return e.amb; },
  };

  // ══════════════ SMOKING BOOTH ══════════════
  const booth = {
    id: 'booth', name: '회사', indoor: false, walking: false,
    smoke: { wind: 0.3, buoy: 0.9, diss: 0.85 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(202);
      let c = L.far.getContext('2d');
      const hz = fh * 0.62;
      paintSky(c, fw, hz, e);
      if (e.stars) paintStars(c, fw, hz * 0.5, r);
      paintCelestial(c, fw, hz * 0.5, e, m);
      paintClouds(c, fw, hz * 0.45, e, r);
      // office tower curtain wall
      const bx = fw * 0.04, by = fh * 0.04, bw = fw * 0.6, bh = hz - by;
      const glassCol = e.dark > 0.5 ? mixc(e.bld, [20, 30, 50], 0.4) : mixc([88, 112, 136], e.sky[1], 0.5);
      c.fillStyle = rgba(glassCol); c.fillRect(bx, by, bw, bh);
      const cols = 14, rows = 22;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const x = bx + (j / cols) * bw, y = by + (i / rows) * bh;
        if (e.lamps > 0.3 && r() < 0.42 + e.lamps * 0.2) { c.fillStyle = rgba(r() < 0.8 ? [214, 230, 255] : WIN_WARM, (0.35 + r() * 0.5) * e.lamps); c.fillRect(x + 1, y + 1, bw / cols - 2, bh / rows - 2); }
        else if (e.dark < 0.5) { c.fillStyle = rgba(shade(glassCol, (r() - 0.5) * 0.2), 0.6); c.fillRect(x + 1, y + 1, bw / cols - 2, bh / rows - 2); }
      }
      c.fillStyle = rgba(shade(glassCol, -0.5), 0.8);
      for (let j = 0; j <= cols; j++) c.fillRect(bx + (j / cols) * bw - 0.5, by, 1.2, bh);
      // second building
      c.fillStyle = rgba(mixc(e.bld, e.haze, 0.3)); c.fillRect(fw * 0.68, fh * 0.2, fw * 0.36, hz - fh * 0.2);
      for (let i = 0; i < 40; i++) { if (e.lamps < 0.3) break; c.fillStyle = rgba(WIN_WARM, e.lamps * 0.5 * r()); c.fillRect(fw * (0.7 + r() * 0.32), fh * (0.22 + r() * 0.36), 3, 3); }
      // plaza
      const pg = c.createLinearGradient(0, hz, 0, fh);
      const pave = mixc([140, 140, 136], [24, 26, 32], e.dark * 0.85);
      pg.addColorStop(0, rgba(shade(pave, 0.1))); pg.addColorStop(1, rgba(shade(pave, -0.25)));
      c.fillStyle = pg; c.fillRect(0, hz, fw, fh - hz);
      // trees
      for (let i = 0; i < 5; i++) {
        const x = fw * (0.05 + i * 0.24 + r() * 0.05), y = hz + fh * 0.02, rr = m * (0.07 + r() * 0.04);
        c.fillStyle = rgba(mixc([46, 60, 46], [8, 12, 10], e.dark * 0.8), 0.95);
        c.beginPath(); c.arc(x, y - rr * 0.6, rr, 0, TAU); c.fill();
        c.fillRect(x - 1.5, y, 3, fh * 0.06);
      }
      L.data.lamps = [];
      for (let i = 0; i < 4; i++) L.data.lamps.push({ x: fw * (0.12 + i * 0.27), y: hz - fh * 0.05 });

      // near: booth interior
      c = L.near.getContext('2d');
      const alu = [126, 131, 138], aluD = shade(alu, -0.45);
      const mullX = [0, 0.34, 0.67, 1].map((v) => v * fw);
      const top = fh * 0.12, bot = fh * 0.86;
      L.data.glass = [];
      for (let i = 0; i < 3; i++) L.data.glass.push([mullX[i] + fw * 0.014, top, mullX[i + 1] - mullX[i] - fw * 0.028, bot - top]);
      // ceiling
      const cg = c.createLinearGradient(0, 0, 0, top);
      cg.addColorStop(0, '#d9dcd8'); cg.addColorStop(1, '#a9adab');
      c.fillStyle = cg; c.fillRect(0, 0, fw, top);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, top - 3, fw, 3);
      // fluorescent fixture
      c.fillStyle = '#f2f6f4'; rrect(c, fw * 0.24, fh * 0.03, fw * 0.52, fh * 0.03, 3); c.fill();
      // frosted band
      c.fillStyle = 'rgba(235,240,240,0.24)'; c.fillRect(0, fh * 0.505, fw, fh * 0.04);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      for (let x = 4; x < fw; x += 7) for (let y = fh * 0.51; y < fh * 0.54; y += 6) { c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill(); }
      // reflections on glass
      c.save(); c.globalAlpha = 0.06;
      for (let i = 0; i < 4; i++) { c.fillStyle = '#fff'; c.beginPath(); const x = fw * (0.1 + i * 0.27); c.moveTo(x, top); c.lineTo(x + fw * 0.08, top); c.lineTo(x - fw * 0.1, bot); c.lineTo(x - fw * 0.18, bot); c.closePath(); c.fill(); }
      c.restore();
      // mullions
      for (const x of mullX) {
        const g = c.createLinearGradient(x - fw * 0.016, 0, x + fw * 0.016, 0);
        g.addColorStop(0, rgba(aluD)); g.addColorStop(0.35, rgba(shade(alu, 0.3))); g.addColorStop(0.65, rgba(alu)); g.addColorStop(1, rgba(aluD));
        c.fillStyle = g; c.fillRect(x - fw * 0.016, top, fw * 0.032, bot - top);
      }
      // kick plate + floor
      const kp = c.createLinearGradient(0, bot, 0, fh * 0.93);
      kp.addColorStop(0, '#9aa0a4'); kp.addColorStop(0.08, '#cfd3d5'); kp.addColorStop(1, '#6d7276');
      c.fillStyle = kp; c.fillRect(0, bot, fw, fh * 0.07);
      c.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < fw; x += 3) c.fillRect(x, bot, 1, fh * 0.07);
      const fg = c.createLinearGradient(0, fh * 0.93, 0, fh);
      fg.addColorStop(0, '#4a4e52'); fg.addColorStop(1, '#2b2e31');
      c.fillStyle = fg; c.fillRect(0, fh * 0.93, fw, fh * 0.07);
      c.fillStyle = 'rgba(240,246,244,0.12)'; c.fillRect(fw * 0.25, fh * 0.94, fw * 0.5, fh * 0.012);
      // standing ashtray
      const ax = fw * 0.2, aw = m * 0.085, ay0 = fh * 0.64, ay1 = fh * 0.95;
      const sg = c.createLinearGradient(ax - aw / 2, 0, ax + aw / 2, 0);
      sg.addColorStop(0, '#5d6266'); sg.addColorStop(0.25, '#e6eaec'); sg.addColorStop(0.4, '#aab0b4'); sg.addColorStop(0.8, '#70767a'); sg.addColorStop(1, '#4a4e52');
      c.fillStyle = sg; c.fillRect(ax - aw / 2, ay0, aw, ay1 - ay0);
      c.fillStyle = '#3a3e42'; c.beginPath(); c.ellipse(ax, ay0, aw / 2, aw * 0.16, 0, 0, TAU); c.fill();
      c.fillStyle = '#c9ced1'; c.beginPath(); c.ellipse(ax, ay0, aw / 2, aw * 0.16, 0, Math.PI, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(ax, ay1, aw * 0.7, aw * 0.12, 0, 0, TAU); c.fill();
      // fan housing (blades are dynamic)
      L.data.fan = { x: fw * 0.83, y: fh * 0.22, r: m * 0.065 };
      const F = L.data.fan;
      c.fillStyle = '#d7dad8'; c.beginPath(); c.arc(F.x, F.y, F.r * 1.25, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(F.x, F.y + 2, F.r * 1.25, 0, TAU); c.fill();
      c.fillStyle = '#c9ccca'; c.beginPath(); c.arc(F.x, F.y, F.r * 1.2, 0, TAU); c.fill();
      c.fillStyle = '#25292c'; c.beginPath(); c.arc(F.x, F.y, F.r, 0, TAU); c.fill();
      // rain droplets on glass (static)
      if (e.rain > 0) {
        c.save();
        for (const g of L.data.glass) {
          c.beginPath(); c.rect(g[0], g[1], g[2], g[3]); c.clip();
          for (let i = 0; i < 160; i++) { const x = g[0] + r() * g[2], y = g[1] + r() * g[3], rr = 0.6 + r() * r() * 2.6; c.fillStyle = 'rgba(210,220,230,0.18)'; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(x - rr * 0.3, y - rr * 0.5, 1, 1); }
        }
        c.restore();
      }
      L.data.ground = null;
    },
    draw(ctx, L, e, t, dt, o) {
      ctx.drawImage(L.far, o.fx, o.fy);
      const m = Math.min(L.fw, L.fh);
      for (const l of L.data.lamps) { glow(ctx, o.fx + l.x, o.fy + l.y, m * 0.06, [255, 220, 170], e.lamps * 0.6); bokeh(ctx, o.fx + l.x, o.fy + l.y, m * 0.014, [255, 230, 190], e.lamps * 0.8); }
      o.weather(L.data.glass, o.nx, o.ny);
      ctx.drawImage(L.near, o.nx, o.ny);
      // fan blades
      const F = L.data.fan, D = L.data;
      D.fanA = (D.fanA || 0) + dt * 13;
      ctx.save(); ctx.translate(o.nx + F.x, o.ny + F.y);
      ctx.beginPath(); ctx.arc(0, 0, F.r * 0.98, 0, TAU); ctx.clip();
      ctx.fillStyle = 'rgba(140,146,150,0.35)';
      for (let k = 0; k < 3; k++) { for (let s = 0; s < 3; s++) { ctx.save(); ctx.rotate(D.fanA + (k * TAU) / 3 + s * 0.09); ctx.beginPath(); ctx.ellipse(F.r * 0.5, 0, F.r * 0.48, F.r * 0.2, 0.3, 0, TAU); ctx.fill(); ctx.restore(); } }
      ctx.fillStyle = '#5d6266'; ctx.beginPath(); ctx.arc(0, 0, F.r * 0.16, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(o.nx + F.x, o.ny + F.y); ctx.strokeStyle = 'rgba(210,214,212,0.85)'; ctx.lineWidth = 1.2;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(0, 0, (F.r * k) / 4.2, 0, TAU); ctx.stroke(); }
      for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos((k * TAU) / 8) * F.r, Math.sin((k * TAU) / 8) * F.r); ctx.stroke(); }
      ctx.restore();
      // fluorescent glow + flicker
      D.flk = D.flk ?? rand(12, 30);
      D.flk -= dt;
      let lightK = 1;
      if (D.flk < 0) { lightK = Math.random() < 0.5 ? 0.55 : 1; if (D.flk < -0.5) D.flk = rand(15, 40); }
      D.lightK = lightK;
      glow(ctx, o.nx + L.fw * 0.5, o.ny + L.fh * 0.045, m * 0.5, [235, 250, 244], 0.22 * lightK);
      if (lightK < 1) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, L.w, L.h); }
    },
    sink(L) { return L.photo ? null : L.data.fan; },
    amb(e, L) { const k = L.data.lightK ?? 1; return [0.93 * k, 1.0 * k, 0.96 * k]; },
  };

  // ══════════════ STREET WALK (pseudo-3D) ══════════════
  const SIGN_COLS = [[255, 70, 90], [255, 170, 40], [70, 200, 255], [120, 255, 160], [255, 255, 255], [190, 110, 255], [255, 90, 200], [255, 230, 120]];
  const street = {
    id: 'street', name: '길빵', indoor: false, walking: true,
    smoke: { wind: 1, buoy: 0.9, diss: 1.25 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(303);
      const c = L.far.getContext('2d');
      const hz = fh * 0.47;
      paintSky(c, fw, hz, e);
      if (e.stars) paintStars(c, fw, hz, r);
      paintCelestial(c, fw, hz, e, m);
      paintClouds(c, fw, hz, e, r);
      paintSkyline(c, fw, hz + 2, e, r, { minH: fh * 0.04, maxH: fh * 0.2, minW: fw * 0.03, maxW: fw * 0.08, col: mixc(e.bld, e.haze, 0.45), gap: 1, winA: e.lamps * 0.7, winW: 3, winH: 4, lit: 0.45, pow: 2.5 });
      c.fillStyle = rgba(mixc(e.bld, [0, 0, 0], 0.3)); c.fillRect(0, hz, fw, fh - hz);
      L.data.walk = L.data.walk || 0;
      L.data.cars = []; L.data.peds = [];
      L.data.hz = hz;
      L.near.getContext('2d').clearRect(0, 0, fw, fh);
    },
    draw(ctx, L, e, t, dt, o) {
      const { fw, fh } = L, D = L.data, m = Math.min(fw, fh);
      const speed = o.walkSpeed ?? 1;
      D.walk += dt * 1.38 * speed;
      const stepLen = 0.72;
      const ph = (D.walk / stepLen) * Math.PI;
      D.step = Math.floor(D.walk / stepLen);
      ctx.drawImage(L.far, o.fx, o.fy + Math.cos(ph * 2) * fh * 0.002 * speed);
      const eyeY = 1.62 + Math.cos(ph * 2) * 0.028 * speed;
      const sway = Math.sin(ph) * 0.03 * speed;
      const x0 = o.nx + L.m + fw * 0.5 - L.m, y0 = o.ny + D.hz, f = fh * 0.86;
      const z0 = D.walk;
      const P = (X, Y, z) => [x0 + ((X - sway) / z) * f, y0 + ((eyeY - Y) / z) * f];
      const night = e.lamps;
      const fogK = 50 + 220 * (1 - e.fog);
      const wet = e.rain > 0 || e.snow > 0;
      // ground
      const road = mixc([70, 72, 78], [12, 13, 17], e.dark * 0.9), walkc = mixc([128, 124, 118], [26, 26, 30], e.dark * 0.9);
      const gq = (X1, X2, col, zA = 0.6, zB = 400) => { const a = P(X1, 0, zA), b = P(X1, 0, zB), cc = P(X2, 0, zB), d = P(X2, 0, zA); ctx.fillStyle = col; quad(ctx, [a[0], a[1], b[0], b[1], cc[0], cc[1], d[0], d[1]]); ctx.fill(); };
      const ggr = ctx.createLinearGradient(0, y0, 0, o.ny + fh);
      ggr.addColorStop(0, rgba(mixc(road, e.haze, 0.5))); ggr.addColorStop(1, rgba(road));
      gq(-1.25, -10.6, ggr);
      const wg = ctx.createLinearGradient(0, y0, 0, o.ny + fh);
      wg.addColorStop(0, rgba(mixc(walkc, e.haze, 0.5))); wg.addColorStop(1, rgba(shade(walkc, wet ? -0.3 : 0)));
      gq(-1.25, 3.4, wg);
      gq(-10.6, -13.4, rgba(mixc(walkc, e.haze, 0.4)));
      gq(-1.25, -1.05, rgba(shade(walkc, 0.25)));
      // lane markings
      ctx.fillStyle = rgba([220, 190, 60], 0.55);
      gq(-5.85, -5.75, rgba([210, 175, 50], 0.6)); gq(-6.0, -5.9, rgba([210, 175, 50], 0.6));
      for (let k = Math.floor(z0 / 9); k < Math.floor((z0 + 90) / 9); k++) {
        const za = k * 9 - z0, zb = za + 3.2;
        if (zb < 0.6) continue;
        for (const X of [-3.45, -8.2]) { const a = P(X, 0, Math.max(0.6, za)), b = P(X, 0, zb), cc = P(X + 0.14, 0, zb), d = P(X + 0.14, 0, Math.max(0.6, za)); ctx.fillStyle = rgba([230, 232, 236], 0.45 * Math.exp(-za / 60)); quad(ctx, [a[0], a[1], b[0], b[1], cc[0], cc[1], d[0], d[1]]); ctx.fill(); }
      }
      // sidewalk seams
      ctx.strokeStyle = rgba(shade(walkc, -0.4), 0.45); ctx.lineWidth = 1;
      for (let k = Math.ceil(z0 / 1.1); k < (z0 + 26) / 1.1; k++) {
        const z = k * 1.1 - z0; if (z < 0.7) continue;
        const a = P(-1.05, 0, z), b = P(3.4, 0, z);
        ctx.globalAlpha = Math.exp(-z / 12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // facades
      const fac = mixc(e.bld, [0, 0, 0], 0.2);
      const fq = (X, col) => { const a = P(X, 0, 0.6), b = P(X, 0, 400), cc = P(X, 30, 400), d = P(X, 30, 0.6); ctx.fillStyle = col; quad(ctx, [a[0], a[1], b[0], b[1], cc[0], cc[1], d[0], d[1]]); ctx.fill(); };
      fq(3.4, rgba(fac)); fq(-13.4, rgba(shade(fac, 0.05)));
      const items = [];
      // shops on both sides
      for (const side of [1, -1]) {
        const X = side > 0 ? 3.4 : -13.4, sp = side > 0 ? 7.2 : 8.4;
        for (let k = Math.floor(z0 / sp) - 1; k < (z0 + 130) / sp; k++) {
          const za = k * sp - z0, zb = za + sp * 0.9;
          if (zb < 0.8) continue;
          const h1 = hash(k, side * 3), h2 = hash(k, side * 7), h3 = hash(k, side * 11);
          items.push({ z: Math.max(za, 0.8), kind: 'shop', X, za: Math.max(za, 0.8), zb, h1, h2, h3, side });
          if (h2 > 0.45) items.push({ z: za + 0.6, kind: 'blade', X: side > 0 ? 2.5 : -12.5, z1: za + 0.6, h1: h3, h2: h1, side });
        }
      }
      for (let k = Math.floor(z0 / 23); k < (z0 + 140) / 23; k++) { const z = k * 23 + 6 - z0; if (z > 0.8) items.push({ z, kind: 'lamp', X: -0.95 }); const z2 = k * 23 + 17 - z0; if (z2 > 1) items.push({ z: z2, kind: 'lamp', X: -10.9 }); }
      // cars
      D.carT = (D.carT ?? 0) - dt;
      if (D.carT < 0) {
        D.carT = rand(0.8, 2.6);
        if (Math.random() < 0.55) D.cars.push({ X: -8.2 + rand(-0.6, 0.6), Zw: z0 + 140, v: -rand(9, 14), on: true });
        else D.cars.push({ X: -3.6 + rand(-0.4, 0.4), Zw: z0 - 4, v: rand(8, 12.5), on: false });
      }
      for (let i = D.cars.length - 1; i >= 0; i--) {
        const cr = D.cars[i]; cr.Zw += cr.v * dt;
        const z = cr.Zw - z0;
        if (z < -6 || z > 160) { D.cars.splice(i, 1); continue; }
        if (z > 0.9) items.push({ z, kind: 'car', car: cr });
      }
      // pedestrians
      D.pedT = (D.pedT ?? 0) - dt;
      if (D.pedT < 0) { D.pedT = rand(2.5, 6); const on = Math.random() < 0.5; D.peds.push({ X: rand(0.4, 2.8), Zw: z0 + rand(28, 60), v: on ? -rand(1.0, 1.5) : rand(0.6, 1.1), ph: rand(TAU), umb: e.rain > 0 && Math.random() < 0.8 }); }
      for (let i = D.peds.length - 1; i >= 0; i--) { const p = D.peds[i]; p.Zw += p.v * dt; const z = p.Zw - z0; if (z < 2.6 || z > 80) { D.peds.splice(i, 1); continue; } items.push({ z, kind: 'ped', p }); }
      items.sort((a, b) => b.z - a.z);
      const fade = (z) => Math.exp(-z / fogK);
      for (const it of items) {
        const k = fade(it.z);
        if (it.kind === 'shop') {
          const col = SIGN_COLS[Math.floor(it.h1 * SIGN_COLS.length)];
          const winCol = it.h2 > 0.5 ? [255, 222, 170] : [215, 232, 255];
          const a1 = P(it.X, 0.3, it.za + 0.3), a2 = P(it.X, 0.3, it.zb - 0.3), a3 = P(it.X, 2.9, it.zb - 0.3), a4 = P(it.X, 2.9, it.za + 0.3);
          ctx.fillStyle = rgba(night > 0.3 ? winCol : mixc(winCol, e.sky[1], 0.5), (0.3 + night * 0.5) * k * (it.h3 > 0.15 ? 1 : 0.15));
          quad(ctx, [a1[0], a1[1], a2[0], a2[1], a3[0], a3[1], a4[0], a4[1]]); ctx.fill();
          const s1 = P(it.X, 3.15, it.za + 0.2), s2 = P(it.X, 3.15, it.zb - 0.2), s3 = P(it.X, 4.05, it.zb - 0.2), s4 = P(it.X, 4.05, it.za + 0.2);
          ctx.fillStyle = rgba(night > 0.3 ? col : shade(col, -0.15), (0.72 + night * 0.25) * k);
          quad(ctx, [s1[0], s1[1], s2[0], s2[1], s3[0], s3[1], s4[0], s4[1]]); ctx.fill();
          if (night > 0.3) { const cx = (s1[0] + s3[0]) / 2, cy = (s1[1] + s3[1]) / 2; glow(ctx, cx, cy, (f * 3.2) / it.za, col, 0.22 * night * k); }
          if (it.h3 > 0.4) { const u1 = P(it.X, 5.2, it.za + 1), u2 = P(it.X, 7.0, it.za + 2.4); ctx.fillStyle = rgba(WIN_WARM, night * 0.4 * k * it.h3); ctx.fillRect(Math.min(u1[0], u2[0]), Math.min(u1[1], u2[1]), Math.abs(u2[0] - u1[0]) + 1, Math.abs(u2[1] - u1[1]) + 1); }
          if (wet && night > 0.3) { const g0 = P(it.X - 0.3 * it.side, 0, it.za + 1.5); ctx.fillStyle = rgba(winCol, 0.08 * k * night); ctx.fillRect(g0[0] - (f * 0.6) / it.za, g0[1], (f * 1.2) / it.za, (f * 0.25) / it.za); }
        } else if (it.kind === 'blade') {
          const col = SIGN_COLS[Math.floor(it.h1 * SIGN_COLS.length)];
          const a = P(it.X - 0.35, 7.6, it.z1), b = P(it.X + 0.35, 4.2, it.z1);
          ctx.fillStyle = rgba(night > 0.3 ? col : shade(col, -0.1), (0.75 + night * 0.25) * k); ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
          ctx.fillStyle = rgba([255, 255, 255], 0.35 * night * k);
          const n = 4, hh = (b[1] - a[1]) / n;
          for (let i = 0; i < n; i++) ctx.fillRect(a[0] + (b[0] - a[0]) * 0.25, a[1] + hh * (i + 0.2), (b[0] - a[0]) * 0.5, hh * 0.55);
          if (night > 0.3) glow(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (f * 3) / it.z1, col, 0.3 * night * k);
          if (wet) { ctx.fillStyle = rgba(col, 0.12 * k); const g = P(it.X, 0, it.z1); ctx.fillRect(a[0], g[1], b[0] - a[0], (f * 1.5) / it.z1); }
        } else if (it.kind === 'lamp') {
          const base = P(it.X, 0, it.z), head = P(it.X + 0.6, 6.6, it.z);
          ctx.strokeStyle = rgba(mixc(e.bld, [0, 0, 0], 0.5), 0.9 * k); ctx.lineWidth = Math.max(1, (f * 0.12) / it.z);
          ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(base[0], head[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
          const lc = [255, 226, 180];
          glow(ctx, head[0], head[1], (f * 2.6) / it.z, lc, (0.15 + 0.6 * night) * k);
          bokeh(ctx, head[0], head[1], Math.max(1.5, (f * 0.35) / it.z), [255, 240, 215], (0.3 + 0.7 * night) * k);
          const pool = P(it.X + 1, 0, it.z);
          ctx.save(); ctx.translate(pool[0], pool[1]); ctx.scale(1, 0.18);
          glow(ctx, 0, 0, (f * 5) / it.z, lc, 0.12 * night * k * (wet ? 2 : 1)); ctx.restore();
          if (wet) { ctx.fillStyle = rgba(lc, 0.12 * k * night); ctx.fillRect(head[0] - (f * 0.15) / it.z, pool[1], (f * 0.3) / it.z, (f * 1.4) / it.z); }
        } else if (it.kind === 'car') {
          const cr = it.car, lc = cr.on ? [255, 250, 235] : [255, 40, 40];
          const l = P(cr.X - 0.75, 0.68, it.z), rr = P(cr.X + 0.75, 0.68, it.z), body = P(cr.X - 0.95, 1.45, it.z), body2 = P(cr.X + 0.95, 0.15, it.z);
          ctx.fillStyle = rgba(mixc(e.bld, [0, 0, 0], 0.4), 0.85 * k); ctx.fillRect(body[0], body[1], body2[0] - body[0], body2[1] - body[1]);
          const sz = Math.max(1, (f * 0.16) / it.z);
          for (const p of [l, rr]) { glow(ctx, p[0], p[1], sz * (cr.on ? 9 : 5), lc, (cr.on ? 0.5 : 0.4) * k); bokeh(ctx, p[0], p[1], sz, lc, 0.95 * k); }
          if (wet) { ctx.fillStyle = rgba(lc, 0.14 * k); ctx.fillRect(l[0] - sz, l[1] + sz, rr[0] - l[0] + sz * 2, (f * 1.1) / it.z); }
        } else if (it.kind === 'ped') {
          const p = it.p, wob = Math.sin(t * 6 + p.ph) * 0.03;
          const head = P(p.X, 1.62 + wob, it.z), feet = P(p.X, 0, it.z), wpx = (f * 0.48) / it.z;
          ctx.fillStyle = rgba(mixc(e.bld, [0, 0, 0], 0.6), 0.9 * k);
          rrect(ctx, head[0] - wpx / 2, head[1] + wpx * 0.3, wpx, feet[1] - head[1] - wpx * 0.3, wpx * 0.4); ctx.fill();
          ctx.beginPath(); ctx.arc(head[0], head[1], wpx * 0.3, 0, TAU); ctx.fill();
          if (p.umb) { const u = P(p.X, 2.1, it.z); ctx.beginPath(); ctx.ellipse(u[0], u[1], wpx * 1.6, wpx * 0.6, 0, Math.PI, TAU); ctx.fill(); }
        }
      }
      // depth haze toward the vanishing point
      const hg = ctx.createRadialGradient(x0, y0, 0, x0, y0, fw * 0.5);
      hg.addColorStop(0, rgba(e.haze, 0.25 + e.fog * 0.5)); hg.addColorStop(1, rgba(e.haze, 0));
      ctx.fillStyle = hg; ctx.fillRect(0, 0, L.w, L.h);
      o.weather(null);
    },
    amb(e) { return e.dark > 0.5 ? [0.7, 0.64, 0.78] : e.amb; },
  };

  // ══════════════ CONVENIENCE STORE ══════════════
  const store = {
    id: 'store', name: '편의점 앞', indoor: false, walking: false,
    smoke: { wind: 0.55, buoy: 1, diss: 1 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(404);
      let c = L.far.getContext('2d');
      paintSky(c, fw, fh * 0.2, e);
      paintCelestial(c, fw, fh * 0.2, e, m);
      paintClouds(c, fw, fh * 0.18, e, r);
      // building above the shop
      const wall = mixc([150, 140, 130], [22, 22, 28], e.dark * 0.9);
      c.fillStyle = rgba(wall); c.fillRect(0, fh * 0.06, fw, fh * 0.2);
      for (let i = 0; i < 6; i++) { const x = fw * (0.05 + i * 0.16); c.fillStyle = rgba(e.lamps > 0.3 && r() < 0.6 ? WIN_WARM : shade(wall, -0.3), e.lamps > 0.3 ? 0.55 : 0.8); c.fillRect(x, fh * 0.09, fw * 0.1, fh * 0.07); }
      // interior (visible through glass)
      const g0 = fh * 0.29, g1 = fh * 0.8;
      const inner = c.createLinearGradient(0, g0, 0, g1);
      const bright = 0.75 + e.dark * 0.25;
      inner.addColorStop(0, rgba([236 * bright, 244 * bright, 250 * bright])); inner.addColorStop(1, rgba([200 * bright, 212 * bright, 220 * bright]));
      c.fillStyle = inner; c.fillRect(0, g0, fw, g1 - g0);
      for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,255,255,0.95)'; c.fillRect(fw * 0.05, g0 + fh * (0.025 + i * 0.002), fw * 0.9, fh * 0.008); }
      // shelves with products
      const shelf = (x, w, y, h) => {
        c.fillStyle = 'rgba(120,130,140,0.35)'; c.fillRect(x, y, w, h);
        const rows = 5;
        for (let i = 0; i < rows; i++) {
          const ry = y + (i / rows) * h;
          let px = x + 2;
          const rh = h / rows - 3;
          while (px < x + w - 4) {
            const kind = r(), pw = kind < 0.35 ? 7 + r() * 8 : kind < 0.7 ? 4 + r() * 3 : 3;
            const ph = kind < 0.35 ? rh * (0.5 + r() * 0.35) : kind < 0.7 ? rh * (0.65 + r() * 0.3) : rh * 0.9;
            const pc = pick([[230, 60, 60], [250, 200, 60], [60, 140, 230], [70, 190, 120], [245, 245, 245], [240, 120, 40], [30, 30, 40], [250, 120, 160]]);
            const yb = ry + h / rows - 3;
            c.fillStyle = rgba(pc, 0.9);
            if (kind < 0.35) { rrect(c, px, yb - ph, pw - 1.2, ph, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(px + 1, yb - ph * 0.7, pw - 3, ph * 0.18); }
            else if (kind < 0.7) { c.fillRect(px, yb - ph, pw - 1, ph); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(px, yb - ph, pw - 1, 1.5); }
            else { c.fillRect(px + 0.5, yb - ph * 0.75, pw - 1, ph * 0.75); c.fillRect(px + 1, yb - ph, pw - 2, ph * 0.3); }
            px += pw;
          }
          c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x, ry + h / rows - 2, w, 2);
        }
      };
      shelf(fw * 0.08, fw * 0.22, g0 + fh * 0.12, fh * 0.32);
      shelf(fw * 0.34, fw * 0.22, g0 + fh * 0.12, fh * 0.32);
      // fridges
      for (let i = 0; i < 3; i++) {
        const x = fw * (0.62 + i * 0.11);
        c.fillStyle = 'rgba(220,240,255,0.95)'; c.fillRect(x, g0 + fh * 0.05, fw * 0.1, fh * 0.42);
        for (let j = 0; j < 6; j++) for (let k = 0; k < 5; k++) { c.fillStyle = rgba(pick([[60, 150, 90], [230, 80, 60], [250, 210, 80], [90, 120, 220], [200, 200, 200]]), 0.85); c.fillRect(x + 3 + k * fw * 0.018, g0 + fh * (0.07 + j * 0.065), fw * 0.012, fh * 0.045); }
        c.fillStyle = 'rgba(80,90,100,0.6)'; c.fillRect(x, g0 + fh * 0.05, 2, fh * 0.42);
      }
      // near: facade
      c = L.near.getContext('2d');
      // sign band
      const sb0 = fh * 0.2, sb1 = g0;
      const sg = c.createLinearGradient(0, sb0, 0, sb1);
      const sk = 0.55 + e.lamps * 0.45;
      sg.addColorStop(0, rgba([40 * sk + 10, 170 * sk, 190 * sk])); sg.addColorStop(0.45, rgba([250 * sk, 252 * sk, 252 * sk])); sg.addColorStop(0.55, rgba([250 * sk, 252 * sk, 252 * sk])); sg.addColorStop(1, rgba([50 * sk, 90 * sk, 200 * sk]));
      c.fillStyle = sg; c.fillRect(0, sb0, fw, sb1 - sb0);
      c.fillStyle = rgba([255, 255, 255], 0.9 * sk); c.beginPath(); c.arc(fw * 0.16, (sb0 + sb1) / 2, (sb1 - sb0) * 0.32, 0, TAU); c.fill();
      c.fillStyle = rgba([40, 170, 190], 0.9 * sk); c.beginPath(); c.arc(fw * 0.16, (sb0 + sb1) / 2, (sb1 - sb0) * 0.2, 0, TAU); c.fill();
      // mullions & door
      c.fillStyle = 'rgba(30,34,40,0.95)';
      for (const x of [0.02, 0.27, 0.52, 0.76, 0.98]) c.fillRect(fw * x - 2, g0, 5, g1 - g0);
      c.fillRect(0, g0, fw, 4);
      c.fillStyle = 'rgba(220,226,230,0.9)'; c.fillRect(fw * 0.79, g0 + (g1 - g0) * 0.45, 3, (g1 - g0) * 0.2);
      // promo posters (abstract)
      for (let i = 0; i < 3; i++) { c.fillStyle = rgba(pick([[255, 214, 0], [255, 70, 70], [255, 120, 30]]), 0.85); c.fillRect(fw * (0.05 + i * 0.25), g1 - fh * 0.1, fw * 0.12, fh * 0.07); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(fw * (0.06 + i * 0.25), g1 - fh * 0.085, fw * 0.06, fh * 0.012); }
      // glass reflection
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.moveTo(fw * 0.1, g0); c.lineTo(fw * 0.3, g0); c.lineTo(fw * 0.12, g1); c.lineTo(fw * -0.08, g1); c.closePath(); c.fill();
      // base wall + sidewalk with light spill
      c.fillStyle = rgba(mixc([110, 110, 112], [30, 30, 34], e.dark)); c.fillRect(0, g1, fw, fh * 0.04);
      const sw = c.createLinearGradient(0, g1 + fh * 0.04, 0, fh);
      const pave = mixc([150, 148, 142], [36, 36, 40], e.dark * 0.9);
      sw.addColorStop(0, rgba(shade(pave, 0.15 + e.dark * 0.3))); sw.addColorStop(1, rgba(shade(pave, -0.3)));
      c.fillStyle = sw; c.fillRect(0, g1 + fh * 0.04, fw, fh);
      if (e.rain > 0) { c.fillStyle = 'rgba(230,240,250,0.12)'; for (let i = 0; i < 8; i++) c.fillRect(fw * (0.05 + i * 0.12), g1 + fh * 0.05, fw * 0.06, fh * (0.06 + r() * 0.06)); }
      if (e.snow > 0) { c.fillStyle = 'rgba(236,240,246,0.5)'; c.fillRect(0, g1 + fh * 0.07, fw, fh); }
      // parasol + table + chairs
      const tx = fw * 0.6, ty = fh * 0.82;
      const plast = mixc([48, 128, 84], [12, 34, 22], e.dark * 0.55);
      c.fillStyle = rgba(shade(plast, -0.3)); c.fillRect(tx - 2, fh * 0.42, 4, ty - fh * 0.42);
      const pc0 = fh * 0.33, pc1 = fh * 0.43;
      for (let i = 0; i < 6; i++) { c.fillStyle = rgba(i % 2 ? [220, 60, 50] : [240, 236, 228], 0.95); c.beginPath(); c.moveTo(tx, pc0); c.lineTo(tx - fw * 0.32 + (i * fw * 0.64) / 6, pc1); c.lineTo(tx - fw * 0.32 + ((i + 1) * fw * 0.64) / 6, pc1); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(tx - fw * 0.32, pc1, fw * 0.64, 3);
      c.fillStyle = rgba(plast); c.beginPath(); c.ellipse(tx, ty, fw * 0.12, fh * 0.012, 0, 0, TAU); c.fill();
      c.fillRect(tx - 2, ty, 4, fh * 0.08);
      for (const s of [-1, 1]) { const cx = tx + s * fw * 0.2; c.fillStyle = rgba(shade(plast, -0.1)); c.fillRect(cx - fw * 0.05, ty - fh * 0.04, fw * 0.1, fh * 0.012); c.fillRect(cx + s * fw * 0.04, ty - fh * 0.1, fw * 0.012, fh * 0.07); c.fillRect(cx - fw * 0.05, ty - fh * 0.03, 3, fh * 0.1); c.fillRect(cx + fw * 0.045, ty - fh * 0.03, 3, fh * 0.1); }
      for (const [dx, col, hh] of [[-0.05, [60, 160, 90], 0.05], [-0.02, [60, 160, 90], 0.05], [0.03, [200, 200, 200], 0.03], [0.06, [240, 200, 40], 0.025]]) { c.fillStyle = rgba(col, 0.85); c.fillRect(tx + fw * dx, ty - fh * hh, fw * 0.018, fh * hh); }
      L.data.sign = { x: fw * 0.5, y: (sb0 + sb1) / 2 };
      L.data.ground = [g1 + fh * 0.05, fh];
      L.data.g = [g0, g1];
    },
    draw(ctx, L, e, t, dt, o) {
      const { fw, fh } = L, D = L.data, m = Math.min(fw, fh);
      ctx.drawImage(L.far, o.fx, o.fy);
      ctx.drawImage(L.near, o.nx, o.ny);
      glow(ctx, o.nx + fw * 0.5, o.ny + D.g[0] + (D.g[1] - D.g[0]) * 0.4, fw * 0.75, [225, 240, 255], 0.12 + e.dark * 0.12);
      glow(ctx, o.nx + D.sign.x, o.ny + D.sign.y, fw * 0.5, [200, 240, 255], 0.1 * e.lamps);
      const spill = ctx.createLinearGradient(0, o.ny + D.g[1], 0, o.ny + fh);
      spill.addColorStop(0, `rgba(225,238,255,${0.22 * e.dark})`); spill.addColorStop(1, 'rgba(225,238,255,0)');
      ctx.fillStyle = spill; ctx.fillRect(0, o.ny + D.g[1], L.w, fh);
      // passing delivery scooter headlight
      D.bike = D.bike ?? { x: -1, t: rand(6, 14) };
      D.bike.t -= dt;
      if (D.bike.t < 0 && D.bike.x < 0) { D.bike.x = 0.001; D.bike.dir = Math.random() < 0.5 ? 1 : -1; D.bike.t = rand(14, 30); }
      if (D.bike.x > 0) {
        D.bike.x += dt * 0.32;
        const px = D.bike.dir > 0 ? lerp(-0.3, 1.3, D.bike.x) : lerp(1.3, -0.3, D.bike.x);
        glow(ctx, o.nx + px * fw, o.ny + fh * 0.9, fw * 0.55, [255, 248, 228], 0.32 * (0.4 + e.dark));
        if (D.bike.x > 1) D.bike.x = -1;
      }
      o.weather(null);
    },
    amb(e) { return [0.9, 0.96, 1.0]; },
  };

  // ══════════════ EMERGENCY STAIRWELL ══════════════
  const stairs = {
    id: 'stairs', name: '비상계단', indoor: true, walking: false,
    smoke: { wind: 0, buoy: 1.35, diss: 0.75 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(505);
      let c = L.far.getContext('2d');
      paintSky(c, fw, fh, e);
      paintCelestial(c, fw, fh * 0.6, e, m);
      if (e.lamps > 0.3) for (let i = 0; i < 30; i++) { c.fillStyle = rgba(pick([WIN_WARM, WIN_COOL]), e.lamps * r()); c.fillRect(r() * fw, fh * (0.12 + r() * 0.15), 2, 2); }
      L.data.glass = [[fw * 0.6, fh * 0.07, fw * 0.2, fh * 0.15]];
      c = L.near.getContext('2d');
      const upper = [206, 203, 194], lower = [92, 122, 108];
      // walls
      const wg = c.createLinearGradient(0, 0, 0, fh * 0.55);
      wg.addColorStop(0, rgba(shade(upper, -0.08))); wg.addColorStop(1, rgba(upper));
      c.fillStyle = wg; c.fillRect(0, 0, fw, fh * 0.55);
      c.fillStyle = rgba(lower); c.fillRect(0, fh * 0.55, fw, fh * 0.45);
      c.fillStyle = rgba(shade(lower, -0.35)); c.fillRect(0, fh * 0.55, fw, 3);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.04})`; c.fillRect(r() * fw, r() * fh, 2, 2); }
      // window opening (hole) + frame
      const G = L.data.glass[0];
      c.clearRect(G[0], G[1], G[2], G[3]);
      c.strokeStyle = '#7d817f'; c.lineWidth = 4; c.strokeRect(G[0], G[1], G[2], G[3]);
      c.fillStyle = 'rgba(160,165,160,0.9)'; c.fillRect(G[0] + G[2] / 2 - 1.5, G[1], 3, G[3]);
      c.strokeStyle = 'rgba(200,210,210,0.35)'; c.lineWidth = 0.7;
      for (let x = G[0]; x < G[0] + G[2]; x += 6) { c.beginPath(); c.moveTo(x, G[1]); c.lineTo(x, G[1] + G[3]); c.stroke(); }
      for (let y = G[1]; y < G[1] + G[3]; y += 6) { c.beginPath(); c.moveTo(G[0], y); c.lineTo(G[0] + G[2], y); c.stroke(); }
      // fire door
      const dx = fw * 0.06, dy = fh * 0.3, dw = fw * 0.25, dh = fh * 0.52;
      c.fillStyle = '#4e5552'; c.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
      const dg = c.createLinearGradient(dx, 0, dx + dw, 0);
      dg.addColorStop(0, '#8a918e'); dg.addColorStop(0.5, '#a3aaa6'); dg.addColorStop(1, '#7f8683');
      c.fillStyle = dg; c.fillRect(dx, dy, dw, dh);
      c.fillStyle = '#5a605d'; c.fillRect(dx + dw * 0.08, dy + dh * 0.48, dw * 0.84, dh * 0.035);
      c.fillStyle = '#c7ccca'; c.fillRect(dx + dw * 0.08, dy + dh * 0.48, dw * 0.84, dh * 0.01);
      c.fillStyle = 'rgba(40,50,48,0.8)'; c.fillRect(dx + dw * 0.3, dy + dh * 0.12, dw * 0.4, dh * 0.18);
      // exit sign frame (glow is dynamic)
      L.data.exit = { x: dx + dw / 2, y: dy - fh * 0.06, w: dw * 0.55, h: fh * 0.045 };
      // floor number
      c.fillStyle = 'rgba(70,100,88,0.55)';
      c.font = `700 ${Math.round(fh * 0.09)}px "Noto Sans KR", sans-serif`;
      c.textBaseline = 'top'; c.fillText('7F', fw * 0.36, fh * 0.32);
      // extinguisher
      const ex = fw * 0.36, ey = fh * 0.72;
      c.fillStyle = '#b3241d'; rrect(c, ex, ey, fw * 0.045, fh * 0.1, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(ex + 2, ey + 4, 2, fh * 0.08);
      c.fillStyle = '#222'; c.fillRect(ex + fw * 0.01, ey - fh * 0.012, fw * 0.025, fh * 0.014);
      // stairs rising to the right
      const n = 9, sx0 = fw * 0.42, sy0 = fh * 0.86, stw = fw * 0.075, sth = fh * 0.058;
      const tread = [150, 150, 146], riser = [104, 106, 104];
      c.fillStyle = rgba(shade(lower, -0.25)); c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(sx0 + n * stw, sy0 - n * sth); c.lineTo(fw, sy0 - n * sth); c.lineTo(fw, fh); c.lineTo(sx0, fh); c.closePath(); c.fill();
      for (let i = 0; i < n; i++) {
        const x = sx0 + i * stw, y = sy0 - (i + 1) * sth;
        c.fillStyle = rgba(riser); c.fillRect(x, y, fw - x, sth);
        c.fillStyle = rgba(tread); c.fillRect(x, y - sth * 0.18, fw - x, sth * 0.18);
        c.fillStyle = 'rgba(230,190,40,0.9)'; c.fillRect(x, y - sth * 0.18, fw * 0.03, sth * 0.12);
        c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x, y + sth - 2, fw - x, 2);
      }
      // handrail
      c.strokeStyle = '#3c403f'; c.lineWidth = Math.max(2, m * 0.008); c.lineCap = 'round';
      c.beginPath(); c.moveTo(sx0 - fw * 0.02, sy0 - fh * 0.16); c.lineTo(sx0 + n * stw, sy0 - n * sth - fh * 0.16); c.stroke();
      c.strokeStyle = 'rgba(220,225,224,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx0 - fw * 0.02, sy0 - fh * 0.163); c.lineTo(sx0 + n * stw, sy0 - n * sth - fh * 0.163); c.stroke();
      c.strokeStyle = '#3c403f'; c.lineWidth = Math.max(1.5, m * 0.005);
      for (let i = 0; i <= n; i += 2) { const x = sx0 + i * stw + stw * 0.3, y = sy0 - i * sth; c.beginPath(); c.moveTo(x, y - sth * 0.2); c.lineTo(x, y - fh * 0.16 - (stw * 0.3 * sth) / stw); c.stroke(); }
      // landing floor
      const fg = c.createLinearGradient(0, sy0, 0, fh);
      fg.addColorStop(0, '#6f7a74'); fg.addColorStop(1, '#3f4642');
      c.fillStyle = fg; c.fillRect(0, sy0, sx0 + 2, fh - sy0);
      c.fillStyle = 'rgba(230,190,40,0.85)'; c.fillRect(0, sy0, sx0, fh * 0.006);
      // lamp fixture
      L.data.lamp = { x: fw * 0.5, y: fh * 0.035 };
      c.fillStyle = '#e8e8e0'; c.beginPath(); c.ellipse(fw * 0.5, fh * 0.035, m * 0.07, m * 0.03, 0, 0, TAU); c.fill();
      L.data.lightOn = L.data.lightOn ?? 1;
    },
    draw(ctx, L, e, t, dt, o) {
      const { fw, fh } = L, D = L.data, m = Math.min(fw, fh);
      ctx.drawImage(L.far, o.fx, o.fy);
      o.weather(D.glass, o.nx, o.ny);
      ctx.drawImage(L.near, o.nx, o.ny);
      // motion-sensor light
      const target = o.idle > 22 ? 0 : 1;
      if (target !== D.target) { D.target = target; D.flick = target ? 0.35 : 0; if (o.onSwitch) o.onSwitch(target); }
      if (D.target === 1) { D.flick = Math.max(0, (D.flick || 0) - dt); D.lightOn = D.flick > 0 ? (Math.sin(D.flick * 90) > 0 ? 1 : 0.2) : 1; }
      else D.lightOn = approach(D.lightOn, 0, 18, dt);
      const lo = D.lightOn;
      glow(ctx, o.nx + D.lamp.x, o.ny + D.lamp.y, fw * 0.9, [255, 248, 230], 0.16 * lo);
      ctx.fillStyle = `rgba(4,8,7,${0.86 * (1 - lo)})`; ctx.fillRect(0, 0, L.w, L.h);
      if (lo > 0.3) bokeh(ctx, o.nx + D.lamp.x, o.ny + D.lamp.y, m * 0.05, [255, 252, 240], 0.9 * lo);
      // exit sign (always on)
      const X = D.exit;
      ctx.fillStyle = 'rgba(30,210,120,0.95)'; ctx.fillRect(o.nx + X.x - X.w / 2, o.ny + X.y - X.h / 2, X.w, X.h);
      ctx.fillStyle = 'rgba(235,255,240,0.95)';
      const px = o.nx + X.x - X.w * 0.18, py = o.ny + X.y;
      ctx.beginPath(); ctx.arc(px + X.h * 0.18, py - X.h * 0.22, X.h * 0.1, 0, TAU); ctx.fill();
      ctx.fillRect(px, py - X.h * 0.1, X.h * 0.18, X.h * 0.3);
      ctx.fillRect(px + X.w * 0.25, py - X.h * 0.3, X.w * 0.18, X.h * 0.6);
      glow(ctx, o.nx + X.x, o.ny + X.y, X.w * 1.6, [40, 230, 130], 0.32);
    },
    amb(e, L) { const k = L.data.lightOn ?? 1; return mixc([0.22, 0.44, 0.32], [0.92, 0.92, 0.86], k); },
    lightLevel(L) { return L.data.lightOn ?? 1; },
  };

  // ══════════════ HAN RIVER ══════════════
  const river = {
    id: 'river', name: '광교호수공원', indoor: false, walking: false,
    smoke: { wind: 0.85, buoy: 1, diss: 1.05 },
    build(L, e) {
      const { fw, fh } = L, m = Math.min(fw, fh), r = mulberry(606);
      const c = L.far.getContext('2d');
      const hz = fh * 0.5;
      paintSky(c, fw, hz + 4, e);
      if (e.stars) paintStars(c, fw, hz, r);
      paintCelestial(c, fw, hz, e, m);
      paintClouds(c, fw, hz, e, r);
      const lights = [];
      const tmp = [];
      paintSkyline(c, fw, hz + fh * 0.01, e, r, { minH: fh * 0.02, maxH: fh * 0.07, minW: fw * 0.02, maxW: fw * 0.05, col: mixc(e.bld, e.haze, 0.5), gap: 1, winA: e.lamps * 0.6, winW: 3, winH: 3, lit: 0.45 });
      paintSkyline(c, fw, hz + fh * 0.04, e, r, { minH: fh * 0.04, maxH: fh * 0.17, minW: fw * 0.04, maxW: fw * 0.09, col: mixc(e.bld, e.haze, 0.2), gap: 2, winA: e.lamps * 0.8, winW: 4, winH: 4, lit: 0.5, lights: tmp, pow: 2.4 });
      L.data.blink = tmp;
      // bank lights for reflections
      for (let i = 0; i < 40; i++) lights.push({ x: r() * fw, y: hz + fh * 0.04, c: pick([WIN_WARM, WIN_WARM, WIN_COOL, [255, 120, 160]]), a: 0.4 + r() * 0.6, s: 0.6 + r() });
      // bridge
      const by = fh * 0.535;
      const steel = mixc(e.bld, [0, 0, 0], 0.3);
      c.fillStyle = rgba(steel); c.fillRect(-10, by, fw + 20, fh * 0.014);
      for (let i = 0; i < 7; i++) { const x = fw * (0.04 + i * 0.16); c.fillRect(x, by, fw * 0.012, fh * 0.03); }
      c.strokeStyle = rgba(steel); c.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { const x0 = fw * (0.04 + i * 0.16); c.beginPath(); c.moveTo(x0, by); c.quadraticCurveTo(x0 + fw * 0.08, by - fh * 0.03, x0 + fw * 0.16, by); c.stroke(); }
      const deck = [];
      for (let x = fw * 0.01; x < fw; x += fw * 0.035) deck.push({ x, y: by - 1, c: [255, 214, 150], a: 0.9, s: 0.8 });
      for (let x = fw * 0.03; x < fw; x += fw * 0.08) deck.push({ x, y: by + fh * 0.012, c: [90, 150, 255], a: 0.7, s: 1.2 });
      L.data.deck = deck; L.data.lights = lights.concat(deck); L.data.by = by;
      // water
      const w0 = fh * 0.555, w1 = fh * 0.87;
      const wg = c.createLinearGradient(0, w0, 0, w1);
      wg.addColorStop(0, rgba(mixc(e.haze, e.bld, 0.5))); wg.addColorStop(1, rgba(mixc(e.bld, [0, 0, 0], 0.4)));
      c.fillStyle = wg; c.fillRect(0, w0, fw, w1 - w0);
      c.strokeStyle = rgba(e.sky[e.sky.length - 1], 0.12); c.lineWidth = 1;
      for (let i = 0; i < 70; i++) { const y = w0 + Math.pow(r(), 1.6) * (w1 - w0), x = r() * fw, l = fw * (0.02 + r() * 0.12) * (y / w1); c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); }
      L.data.water = [w0, w1];
      // near bank
      const n = L.near.getContext('2d');
      const bank = mixc([60, 70, 58], [8, 10, 10], e.dark * 0.9);
      n.fillStyle = rgba(bank); n.beginPath(); n.moveTo(0, fh * 0.88); n.quadraticCurveTo(fw * 0.5, fh * 0.86, fw, fh * 0.885); n.lineTo(fw, fh); n.lineTo(0, fh); n.closePath(); n.fill();
      const step = mixc([150, 148, 140], [26, 28, 32], e.dark * 0.9);
      for (let i = 0; i < 3; i++) { n.fillStyle = rgba(shade(step, -i * 0.12)); n.fillRect(0, fh * (0.9 + i * 0.035), fw, fh * 0.02); n.fillStyle = rgba(shade(step, 0.2), 0.5); n.fillRect(0, fh * (0.9 + i * 0.035), fw, 1.5); }
      if (e.snow > 0) { n.fillStyle = 'rgba(236,240,246,0.55)'; n.fillRect(0, fh * 0.89, fw, fh); }
      n.fillStyle = rgba(mixc(bank, [0, 0, 0], 0.4)); n.fillRect(fw * 0.88, fh * 0.6, m * 0.012, fh * 0.3);
      L.data.lamp = { x: fw * 0.88 + m * 0.006, y: fh * 0.6 };
      L.data.ground = [fh * 0.9, fh];
    },
    draw(ctx, L, e, t, dt, o) {
      const { fw, fh } = L, D = L.data, m = Math.min(fw, fh);
      ctx.drawImage(L.far, o.fx, o.fy);
      const [w0, w1] = D.water;
      const night = 0.2 + e.lamps * 0.8;
      for (const l of D.lights) {
        const lx = o.fx + l.x, ly = o.fy + l.y;
        if (l.y < D.by + 4) bokeh(ctx, lx, ly, 1.2 * l.s, l.c, l.a * night);
        const len = (w1 - w0) * (0.35 + 0.5 * l.s) * (0.4 + night * 0.6);
        for (let y = w0 + 2; y < w0 + len; y += 3) {
          const k = 1 - (y - w0) / len;
          const jx = noise2(l.x * 0.05 + y * 0.08, t * 0.8 + l.x) * (3 + (y - w0) * 0.06);
          const wd = (1.2 + (y - w0) * 0.025) * l.s * (0.6 + 0.4 * noise2(y * 0.3, t * 2 + l.x));
          ctx.fillStyle = rgba(l.c, l.a * night * k * 0.42);
          ctx.fillRect(o.fx + l.x + jx - wd, o.fy + y, wd * 2, 1.4);
        }
      }
      // subway train crossing the bridge
      D.train = D.train ?? { x: -1, t: rand(5, 12) };
      D.train.t -= dt;
      if (D.train.t < 0 && D.train.x < 0) { D.train.x = 0.0001; D.train.t = rand(28, 50); D.train.dir = Math.random() < 0.5 ? 1 : -1; }
      if (D.train.x > 0) {
        D.train.x += dt * 0.07;
        const len = fw * 0.42, head = D.train.dir > 0 ? lerp(-len, fw + len, D.train.x) : lerp(fw + len, -len, D.train.x);
        const x0 = D.train.dir > 0 ? head - len : head, y = o.fy + D.by - fh * 0.012;
        ctx.fillStyle = rgba(mixc(e.bld, [0, 0, 0], 0.2), 0.95); ctx.fillRect(o.fx + x0, y, len, fh * 0.011);
        for (let x = x0; x < x0 + len; x += 5) { ctx.fillStyle = rgba([255, 244, 220], 0.85 * night); ctx.fillRect(o.fx + x, y + 1.5, 3, fh * 0.005); }
        for (let x = x0; x < x0 + len; x += 9) { ctx.fillStyle = rgba([255, 240, 210], 0.12 * night); ctx.fillRect(o.fx + x + noise2(x, t) * 3, o.fy + w0 + 6, 3, (w1 - w0) * 0.4); }
        if (D.train.x > 1) D.train.x = -1;
      }
      for (const b of D.blink) { const a = Math.pow(0.5 + 0.5 * Math.sin(t * b.sp + b.ph), 8) * e.lamps; if (a > 0.02) glow(ctx, o.fx + b.x, o.fy + b.y, m * 0.02, [255, 50, 40], a * 0.6); }
      ctx.drawImage(L.near, o.nx, o.ny);
      glow(ctx, o.nx + D.lamp.x, o.ny + D.lamp.y, m * 0.22, [255, 226, 180], 0.4 * e.lamps);
      bokeh(ctx, o.nx + D.lamp.x, o.ny + D.lamp.y, m * 0.03, [255, 236, 200], 0.9 * e.lamps);
      o.weather(null);
    },
    amb(e) { return e.amb; },
  };

  // ── real photographs (Unsplash License, loaded by the viewer's browser); procedural painters stay as fallback
  const PHOTOS = {
    roof: { night: 'photo-1705285603048-0d6d10fb3b8c', dusk: 'photo-1784974149798-6cafb6206094', day: 'photo-1787762001530-61a237ecec3f' },
    booth: { night: 'photo-1662802850954-7d8f283fb9de', dusk: 'photo-1784960881237-d2eadcc5f346', day: 'photo-1784960881237-d2eadcc5f346' },
    street: { night: 'photo-1538485399081-7191377e8241', day: 'photo-1733759942884-1cebba1e1420', snow: 'photo-1705978594179-eec60b0839a1', dawn: 'photo-1705978590338-fbd6858b25c3' },
    store: { night: 'photo-1700594610763-ef48ac1597f4' },
    stairs: { all: 'photo-1770119082739-54f754e5aa1d' },
    river: { night: 'photo-1760706139927-eaca5c6fb3ef', day: 'photo-1619341663312-0b8cde878b2f' },
  };
  function pickPhoto(id, e) {
    const P = PHOTOS[id];
    if (!P) return null;
    if (P.all) return { id: P.all, native: 'all' };
    if (e.weather === 'snow' && P.snow) return { id: P.snow, native: 'night' };
    if (P[e.time]) return { id: P[e.time], native: e.time };
    if (e.time === 'day') return P.day ? { id: P.day, native: 'day' } : { id: P.night, native: 'night' };
    if (e.time === 'dusk') return P.night ? { id: P.night, native: 'night' } : { id: P.day, native: 'day' };
    return P.night ? { id: P.night, native: 'night' } : { id: P.day, native: 'day' };
  }
  const photoCache = new Map();
  function photoURL(id, w, h) { return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=74&auto=format`; }
  function loadPhoto(id, w, h, cb) {
    w = Math.ceil(w / 40) * 40; h = Math.ceil(h / 40) * 40;
    const key = id + '|' + w + 'x' + h;
    let p = photoCache.get(key);
    if (p) { if (p.ok) cb(p); else if (!p.err) p.cbs.push(cb); return; }
    p = { ok: false, err: false, cbs: [cb], img: new Image(), avg: null };
    photoCache.set(key, p);
    p.img.crossOrigin = 'anonymous';
    p.img.decoding = 'async';
    p.img.onload = () => {
      p.ok = true;
      try { const c = makeCanvas(10, 10), x = c.getContext('2d'); x.drawImage(p.img, 0, 0, 10, 10); const d = x.getImageData(0, 0, 10, 10).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; p.avg = [r / n, g / n, b / n]; } catch (e) { p.avg = null; }
      const cbs = p.cbs; p.cbs = []; cbs.forEach((f) => f(p));
    };
    p.img.onerror = () => { p.err = true; p.cbs = []; };
    p.img.src = photoURL(id, w, h);
  }
  function gradePhoto(x, w, h, e, native) {
    const T = e.time;
    const fill = (op, style, a = 1) => { x.globalCompositeOperation = op; x.globalAlpha = a; x.fillStyle = style; x.fillRect(0, 0, w, h); };
    if (native === 'day' && T === 'night') fill('multiply', 'rgb(64,74,112)');
    if (native === 'day' && T === 'dusk') { fill('multiply', 'rgb(214,150,128)'); }
    if (native === 'day' && T === 'dawn') fill('multiply', 'rgb(132,146,184)');
    if (native === 'night' && T === 'dusk') {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(120,70,140,1)'); g.addColorStop(0.6, 'rgba(255,140,80,1)'); g.addColorStop(1, 'rgba(255,120,60,1)');
      fill('soft-light', g, 0.55); fill('screen', 'rgb(40,24,30)', 0.6);
    }
    if (native === 'night' && T === 'dawn') { fill('soft-light', 'rgb(70,110,170)', 0.6); fill('screen', 'rgb(16,24,40)', 0.7); }
    if (native === 'night' && T === 'day') { fill('screen', 'rgb(70,80,96)', 0.7); fill('saturation', 'rgb(128,128,128)', 0.25); }
    if (native === 'all') { if (T === 'night') fill('multiply', 'rgb(150,156,170)'); if (T === 'dusk') fill('soft-light', 'rgb(255,150,90)', 0.35); if (T === 'dawn') fill('soft-light', 'rgb(90,130,190)', 0.4); }
    if (e.weather === 'rain') { fill('multiply', 'rgb(176,182,194)'); fill('saturation', 'rgb(128,128,128)', 0.3); }
    if (e.weather === 'cloudy') { fill('saturation', 'rgb(128,128,128)', 0.4); fill('multiply', 'rgb(214,216,220)'); }
    if (e.weather === 'snow') { fill('saturation', 'rgb(128,128,128)', 0.3); fill('screen', 'rgb(40,44,52)', 0.8); }
    // filmic: lifted shadows, gentle contrast
    fill('soft-light', 'rgb(118,118,122)', 0.35);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
  function buildPhotoLayer(L, p, pk, e) {
    const c = makeCanvas(L.fw, L.fh), x = c.getContext('2d');
    const k = 0.62;
    const t = makeCanvas(Math.max(2, L.fw * k), Math.max(2, L.fh * k)), tx = t.getContext('2d');
    tx.imageSmoothingQuality = 'high'; tx.drawImage(p.img, 0, 0, t.width, t.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, L.fw, L.fh);
    gradePhoto(x, L.fw, L.fh, e, pk.native);
    return c;
  }
  function stairsLight(L, dt, o) {
    const D = L.data;
    const target = o.idle > 22 ? 0 : 1;
    if (target !== D.target) { D.target = target; D.flick = target ? 0.35 : 0; if (o.onSwitch) o.onSwitch(target); }
    if (D.target === 1) { D.flick = Math.max(0, (D.flick || 0) - dt); D.lightOn = D.flick > 0 ? (Math.sin(D.flick * 90) > 0 ? 1 : 0.2) : 1; }
    else D.lightOn = approach(D.lightOn ?? 1, 0, 18, dt);
    return D.lightOn;
  }

  const list = [roof, booth, street, store, stairs, river];
  const byId = Object.fromEntries(list.map((s) => [s.id, s]));

  // ── renderer: layers, parallax, weather, haze, lightning, grading
  function Renderer(canvas) {
    const ctx = canvas.getContext('2d');
    const R = { canvas, ctx, L: null, scene: null, env: null, key: '', rain: [], snow: [], splash: [], flash: 0, flashT: rand(8, 18), haze: 0, w: 1, h: 1, scale: 1, leaves: [] };
    R.resize = function (W, H, dpr) {
      R.scale = clamp(Math.min(dpr, 2) * 0.72, 0.75, 1.45);
      R.w = Math.max(2, Math.round(W * R.scale)); R.h = Math.max(2, Math.round(H * R.scale));
      canvas.width = R.w; canvas.height = R.h;
      R.key = '';
    };
    R.set = function (scene, e) {
      const key = scene.id + '|' + e.time + '|' + e.weather + '|' + R.w + 'x' + R.h;
      if (key === R.key) return;
      R.key = key; R.scene = scene; R.env = e;
      const mgn = Math.round(Math.max(R.w, R.h) * 0.04);
      const fw = R.w + mgn * 2, fh = R.h + mgn * 2;
      const keep = R.L && R.L.id === scene.id ? R.L.data : {};
      const L = { id: scene.id, w: R.w, h: R.h, m: mgn, fw, fh, far: makeCanvas(fw, fh), near: makeCanvas(fw, fh), data: { walk: keep.walk || 0 } };
      scene.build(L, e);
      R.L = L;
      R.rain.length = 0; R.snow.length = 0;
      const pk = pickPhoto(scene.id, e);
      if (pk) {
        const want = Math.min(1.6, Math.max(1, 1300 / Math.max(fw, fh)));
        loadPhoto(pk.id, fw * want, fh * want, (p) => {
          if (R.L !== L) return;
          L.photo = buildPhotoLayer(L, p, pk, e); L.photoA = R.photoShown === pk.id ? 1 : 0; L.photoAvg = p.avg; R.photoShown = pk.id;
          if (scene.id === 'booth') L.data.lightK = 1;
        });
      }
    };
    function weather(clips, ox, oy, dt, t) {
      const e = R.env, w = R.w, h = R.h;
      if (!e.rain && !e.snow && e.wind < 0.6) return;
      ctx.save();
      if (clips) { ctx.beginPath(); for (const g of clips) ctx.rect(ox + g[0], oy + g[1], g[2], g[3]); ctx.clip(); }
      const wind = (e.wind * 0.9 + 0.1) * (R.scene.indoor ? 0.6 : 1);
      if (e.rain) {
        const n = Math.round(240 * e.rain * (w * h) / (500 * 900) + 60);
        while (R.rain.length < n) R.rain.push({ x: rand(-0.2, 1.2) * w, y: rand(-1, 1) * h, z: Math.random() });
        ctx.lineCap = 'round';
        for (const p of R.rain) {
          const v = (0.9 + p.z * 1.6) * h, wx = wind * 0.32 * v;
          p.y += v * dt; p.x += wx * dt;
          if (p.y > h + 20) { p.y = rand(-0.25, 0) * h; p.x = rand(-0.2, 1.2) * w; }
          const len = (0.025 + p.z * 0.06) * h;
          ctx.strokeStyle = `rgba(205,215,232,${0.07 + p.z * 0.16})`;
          ctx.lineWidth = 0.6 + p.z * 1.3;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (wx / v) * len, p.y - len); ctx.stroke();
        }
        const G = R.L.data.ground;
        if (G && !clips) {
          if (R.splash.length < 40 && Math.random() < 0.9) R.splash.push({ x: rand(w), y: oy + rand(G[0], G[1]), t: 0 });
          for (let i = R.splash.length - 1; i >= 0; i--) {
            const s = R.splash[i]; s.t += dt * 4;
            if (s.t > 1) { R.splash.splice(i, 1); continue; }
            ctx.strokeStyle = `rgba(220,228,240,${0.35 * (1 - s.t)})`; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.ellipse(s.x, s.y, 1 + s.t * 5, 0.4 + s.t * 1.4, 0, 0, TAU); ctx.stroke();
          }
        }
      }
      if (e.snow) {
        const n = Math.round(150 * e.snow * (w * h) / (500 * 900) + 40);
        while (R.snow.length < n) R.snow.push({ x: rand(w), y: rand(h), z: Math.pow(Math.random(), 1.3), ph: rand(TAU) });
        for (const p of R.snow) {
          const v = (0.03 + p.z * 0.09) * h;
          p.y += v * dt; p.x += (wind * 0.05 * h + Math.sin(t * 0.9 + p.ph) * 0.02 * h) * dt * (0.4 + p.z);
          if (p.y > h + 10) { p.y = -10; p.x = rand(w); }
          if (p.x > w + 10) p.x = -10; if (p.x < -10) p.x = w + 10;
          const s = (0.6 + p.z * p.z * 4.2) * (h / 700);
          if (p.z > 0.82) bokeh(ctx, p.x, p.y, s * 1.6, [240, 244, 252], 0.28);
          else { ctx.fillStyle = `rgba(240,244,252,${0.35 + p.z * 0.5})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
        }
      }
      if (e.wind > 0.6 && !clips) {
        if (R.leaves.length < 4 && Math.random() < dt * 0.4) R.leaves.push({ x: -20, y: rand(0.2, 0.9) * h, vx: rand(0.25, 0.5) * w, vy: rand(-0.05, 0.05) * h, a: rand(TAU), va: rand(4, 9), s: rand(2, 4.5) * (h / 700) });
        for (let i = R.leaves.length - 1; i >= 0; i--) {
          const l = R.leaves[i]; l.x += l.vx * dt; l.y += (l.vy + Math.sin(t * 3 + l.a) * 0.06 * h) * dt; l.a += l.va * dt;
          if (l.x > w + 30) { R.leaves.splice(i, 1); continue; }
          ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a); ctx.scale(1, Math.abs(Math.sin(l.a * 0.7)) + 0.2);
          ctx.fillStyle = rgba(mixc([120, 80, 40], [20, 16, 12], e.dark * 0.8), 0.85); ctx.beginPath(); ctx.ellipse(0, 0, l.s * 2, l.s, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
      ctx.restore();
    }
    R.draw = function (t, dt, cam, fx) {
      const L = R.L, e = R.env;
      if (!L) return;
      const k = R.scale;
      const o = {
        fx: -L.m + cam.x * k * 0.35, fy: -L.m + cam.y * k * 0.35,
        nx: -L.m + cam.x * k, ny: -L.m + cam.y * k,
        idle: fx.idle, walkSpeed: fx.walkSpeed, onSwitch: fx.onSwitch,
        weather: (clips, ox = 0, oy = 0) => weather(clips, ox, oy, dt, t),
      };
      if (L.photo) {
        L.photoA = Math.min(1, (L.photoA || 0) + dt * 1.5);
        if (L.photoA < 1) R.scene.draw(ctx, L, e, t, dt, o);
        drawPhoto(L, e, t, dt, o, fx);
      } else R.scene.draw(ctx, L, e, t, dt, o);
      // fog
      if (e.fog > 0.1) {
        const g = ctx.createLinearGradient(0, 0, 0, R.h);
        g.addColorStop(0, rgba(e.haze, e.fog * 0.3)); g.addColorStop(0.55, rgba(e.haze, e.fog * 0.55)); g.addColorStop(1, rgba(e.haze, e.fog * 0.3));
        ctx.fillStyle = g; ctx.fillRect(0, 0, R.w, R.h);
      }
      // smoke haze filling the air
      R.haze = fx.haze;
      if (R.haze > 0.01) {
        const g = ctx.createLinearGradient(0, 0, 0, R.h);
        const hc = R.scene.indoor ? [196, 200, 196] : [190, 194, 204];
        g.addColorStop(0, rgba(hc, R.haze * (R.scene.indoor ? 0.34 : 0.18))); g.addColorStop(1, rgba(hc, R.haze * 0.1));
        ctx.fillStyle = g; ctx.fillRect(0, 0, R.w, R.h);
      }
      // eye adaptation to a flame at night / warm ember spill
      if (fx.flame > 0.01) { ctx.fillStyle = `rgba(0,0,0,${fx.flame * 0.16 * (0.3 + e.dark)})`; ctx.fillRect(0, 0, R.w, R.h); }
      // lightning
      if (e.thunder) {
        R.flashT -= dt;
        if (R.flashT < 0) { R.flashT = rand(9, 26); R.flashSeq = [0, 0.09, 0.2, 0.32].map((v) => v + rand(0, 0.03)); R.flashAge = 0; if (fx.onThunder) fx.onThunder(); }
        if (R.flashSeq) {
          R.flashAge += dt;
          let a = 0; for (const s of R.flashSeq) { const d = R.flashAge - s; if (d > 0 && d < 0.09) a = Math.max(a, 1 - d / 0.09); }
          if (R.flashAge > 0.6) R.flashSeq = null;
          R.flash = a;
          if (a > 0) { ctx.fillStyle = `rgba(210,220,255,${a * (R.scene.indoor ? 0.18 : 0.42)})`; ctx.fillRect(0, 0, R.w, R.h); }
        } else R.flash = 0;
      } else R.flash = 0;
    };
    function drawPhoto(L, e, t, dt, o, fx) {
      const D = L.data;
      let s = 1.02, bx = 0, by = 0;
      if (R.scene.walking) {
        const sp = fx.walkSpeed ?? 1;
        D.walk = (D.walk || 0) + dt * 1.38 * sp;
        const ph = (D.walk / 0.72) * Math.PI;
        D.step = Math.floor(D.walk / 0.72);
        s = 1.06 + 0.035 * Math.sin(t * 0.11);
        by = Math.cos(ph * 2) * L.h * 0.005 * sp; bx = Math.sin(ph) * L.w * 0.004 * sp;
      }
      ctx.save();
      ctx.globalAlpha = L.photoA;
      ctx.translate(L.w / 2 + bx + (o.nx + L.m) * 0.6, L.h / 2 + by + (o.ny + L.m) * 0.6);
      ctx.scale(s, s);
      ctx.drawImage(L.photo, -L.fw / 2, -L.fh / 2);
      ctx.restore();
      if (R.scene.id === 'stairs') {
        const lo = stairsLight(L, dt, o);
        if (lo < 1) { ctx.fillStyle = `rgba(3,7,6,${0.88 * (1 - lo)})`; ctx.fillRect(0, 0, L.w, L.h); glow(ctx, L.w * 0.2, L.h * 0.3, L.w * 0.5, [40, 230, 130], 0.12 * (1 - lo)); }
      } else o.weather(null);
    }
    R.ambient = function () {
      if (!R.scene || !R.L) return [1, 1, 1];
      const L = R.L;
      if (L.photo && L.photoAvg) {
        const a = L.photoAvg, lum = (0.3 * a[0] + 0.59 * a[1] + 0.11 * a[2]) / 255;
        const lvl = clamp(0.64 + lum * 0.95, 0.64, 1.0);
        const n = Math.max(a[0], a[1], a[2], 1);
        let c = mixc([1, 1, 1], [a[0] / n, a[1] / n, a[2] / n], 0.2).map((v) => v * lvl);
        if (R.scene.id === 'stairs') { const lo = L.data.lightOn ?? 1; c = mixc([0.22, 0.42, 0.3], c, lo); }
        return c;
      }
      return R.scene.amb(R.env, L);
    };
    R.hasPhoto = () => !!(R.L && R.L.photo);
    R.sinkScreen = function (cam) {
      if (!R.scene || !R.scene.sink) return null;
      const s = R.scene.sink(R.L);
      return { x: (s.x - R.L.m + cam.x * R.scale) / R.scale, y: (s.y - R.L.m + cam.y * R.scale) / R.scale, r: s.r / R.scale };
    };
    return R;
  }
  // scene thumbnail (static frame)
  function thumb(scene, e, cv) {
    const w = cv.width, h = cv.height, mgn = 2;
    const L = { id: scene.id, w, h, m: mgn, fw: w + mgn * 2, fh: h + mgn * 2, far: makeCanvas(w + mgn * 2, h + mgn * 2), near: makeCanvas(w + mgn * 2, h + mgn * 2), data: { walk: 30, target: 1, lightOn: 1 } };
    scene.build(L, e);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const o = { fx: -mgn, fy: -mgn, nx: -mgn, ny: -mgn, idle: 0, walkSpeed: 0, weather: () => {} };
    try { scene.draw(ctx, L, e, 1, 0.016, o); } catch (err) { console.warn(err); }
    if (e.fog > 0.1) { ctx.fillStyle = rgba(e.haze, e.fog * 0.4); ctx.fillRect(0, 0, w, h); }
    const pk = pickPhoto(scene.id, e);
    if (pk) loadPhoto(pk.id, w, h, (p) => {
      ctx.clearRect(0, 0, w, h); ctx.drawImage(p.img, 0, 0, w, h); gradePhoto(ctx, w, h, e, pk.native);
      if (e.fog > 0.1) { ctx.fillStyle = rgba(e.haze, e.fog * 0.4); ctx.fillRect(0, 0, w, h); }
    });
  }
  return { TIMES, WEATHERS, env, autoTime, list, byId, Renderer, thumb, PHOTOS };
})();
