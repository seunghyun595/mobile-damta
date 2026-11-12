// ───────────────────────── sound (Web Audio, fully synthesized) ─────────────────────────
const Sound = (() => {
  let ctx = null, master, comp, dry, conv, wet, ready = false, enabled = true;
  let white, pink, brown, crackle;
  const L = {};            // persistent loops
  let bed = null, rainBed = null, windBed = null;
  let sceneId = '', lastEvent = 0, evClock = 0;
  const now = () => ctx.currentTime;

  function noiseBuf(kind, sec) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    // crossfade the loop seam
    const f = Math.min(2048, len >> 3);
    for (let i = 0; i < f; i++) { const t = i / f; d[i] = d[i] * t + d[len - f + i] * (1 - t); }
    return b;
  }
  function makeCrackle(sec) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    let t = 0;
    while (t < len) {
      t += Math.floor(sr * (0.006 + Math.random() * Math.random() * 0.085));
      const amp = Math.pow(Math.random(), 2.4) * 0.95 + 0.04;
      const dur = Math.floor(sr * (0.0004 + Math.random() * 0.0035));
      const k = 0.2 + Math.random() * 0.7;
      let y = 0;
      for (let i = 0; i < dur && t + i < len; i++) {
        const env = Math.exp(-i / (dur * 0.22 + 1));
        const w = Math.random() * 2 - 1;
        y = y * k + w * (1 - k);
        d[t + i] += (w * 0.55 + y * 0.45) * amp * env;
      }
      if (Math.random() < 0.18) t += Math.floor(sr * 0.0015);
    }
    return b;
  }
  function impulse(sec, decay) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const b = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < sr * 0.004 ? i / (sr * 0.004) : 1);
    }
    return b;
  }
  function route(node, pan = 0, send = 0.15) {
    let n = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
    n.connect(dry);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(conv); }
    return n;
  }
  // loop filters: [type, freq, Q, gainDb]
  function loop(buf, filters, pan = 0, send = 0.12, rate = 1) {
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.playbackRate.value = rate;
    let n = src; const fl = [];
    for (const f of filters) {
      const b = ctx.createBiquadFilter(); b.type = f[0]; b.frequency.value = f[1];
      if (f[2] !== undefined) b.Q.value = f[2];
      if (f[3] !== undefined) b.gain.value = f[3];
      n.connect(b); n = b; fl.push(b);
    }
    const g = ctx.createGain(); g.gain.value = 0;
    n.connect(g);
    const out = route(g, pan, send);
    src.start(now() + 0.01, Math.random() * buf.duration * 0.9);
    return {
      src, g, f: fl, out, cur: 0,
      set(v, tc = 0.06) { if (Math.abs(v - this.cur) < 0.0004) return; this.cur = v; g.gain.setTargetAtTime(v, now(), tc); },
      stop(fade = 0.6) { try { g.gain.setTargetAtTime(0, now(), fade / 3); src.stop(now() + fade + 0.1); } catch (e) {} },
    };
  }
  // burst filters: [type, freq, Q, freqEnd]
  function burst(buf, o = {}) {
    if (!ready) return;
    const dur = o.dur ?? 0.1, t = now() + (o.at ?? 0);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = o.rate ?? 1;
    let n = src;
    for (const f of o.filters || []) {
      const b = ctx.createBiquadFilter(); b.type = f[0]; b.frequency.setValueAtTime(f[1], t);
      if (f[2] !== undefined) b.Q.value = f[2];
      if (f[3] !== undefined) b.frequency.exponentialRampToValueAtTime(f[3], t + dur);
      n.connect(b); n = b;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain ?? 0.2, t + (o.attack ?? 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g); route(g, o.pan ?? 0, o.send ?? 0.15);
    src.start(t, Math.random() * Math.max(0, buf.duration - dur - 0.1)); src.stop(t + dur + 0.05);
  }
  function tone(freq, o = {}) {
    if (!ready) return;
    const dur = o.dur ?? 0.2, t = now() + (o.at ?? 0);
    const osc = ctx.createOscillator(); osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain ?? 0.1, t + (o.attack ?? 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); n = f; }
    n.connect(g); route(g, o.pan ?? 0, o.send ?? 0.15);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3.2; comp.attack.value = 0.003; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0;
    comp.connect(master); master.connect(ctx.destination);
    dry = ctx.createGain(); dry.connect(comp);
    conv = ctx.createConvolver(); conv.buffer = impulse(1.4, 3);
    wet = ctx.createGain(); wet.gain.value = 0.5; conv.connect(wet); wet.connect(comp);
    white = noiseBuf('white', 3); pink = noiseBuf('pink', 4); brown = noiseBuf('brown', 5);
    crackle = makeCrackle(6);
    ready = true;
    L.inhale = loop(pink, [['bandpass', 1250, 0.8], ['lowpass', 3400]], 0, 0.04);
    L.crackle = loop(crackle, [['highpass', 800], ['peaking', 3300, 0.9, 5]], 0.18, 0.1);
    L.crackle2 = loop(crackle, [['highpass', 1800]], 0.22, 0.08, 1.37);
    L.sizzle = loop(white, [['bandpass', 5600, 1.1]], 0.18, 0.04);
    L.exhale = loop(pink, [['bandpass', 820, 0.55], ['lowpass', 2600]], 0, 0.1);
    L.breathIn = loop(pink, [['bandpass', 1900, 0.7], ['highpass', 500]], 0, 0.03);
    L.flame = loop(brown, [['lowpass', 380], ['highpass', 55]], 0.25, 0.08);
    L.jet = loop(white, [['highpass', 2300], ['peaking', 6400, 1.4, 7]], 0.25, 0.06);
    L.coil = loop(white, [['highpass', 3600], ['bandpass', 7200, 0.7]], 0.05, 0.04);
    L.coilCr = loop(crackle, [['highpass', 2600]], 0.05, 0.05, 1.9);
    L.buzz = loop(brown, [['bandpass', 160, 4]], 0.1, 0.0);
  }

  // ── ambience beds
  function makeBed(id) {
    const loops = [];
    const add = (buf, filters, gain, pan = 0, send = 0.12, rate = 1) => { const l = loop(buf, filters, pan, send, rate); l.base = gain; loops.push(l); return l; };
    const b = { id, loops, level: 1, tick: () => {}, walking: false };
    switch (id) {
      case 'roof': {
        const w = add(brown, [['lowpass', 520], ['highpass', 35]], 0.34);
        add(pink, [['bandpass', 190, 0.5]], 0.07, 0, 0.2);
        add(pink, [['bandpass', 2600, 0.4]], 0.006, 0.3, 0.3);
        b.tick = (t) => { w.set(w.base * b.level * (0.55 + 0.45 * (0.5 + 0.5 * fbm1(t * 0.21))), 0.4); if (Math.random() < 0.02) carPass(0.05); if (Math.random() < 0.004) horn(); };
        break;
      }
      case 'booth': {
        add(brown, [['bandpass', 240, 0.9]], 0.16, 0.3, 0.05);
        add(pink, [['bandpass', 900, 0.6]], 0.028, 0.3, 0.05);
        const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 59.7;
        const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 180;
        const hg = ctx.createGain(); hg.gain.value = 0;
        hum.connect(hf); hf.connect(hg); route(hg, 0.3, 0.02); hum.start();
        const buzzO = ctx.createOscillator(); buzzO.type = 'square'; buzzO.frequency.value = 120;
        const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 240; bf.Q.value = 8;
        const bg = ctx.createGain(); bg.gain.value = 0;
        buzzO.connect(bf); bf.connect(bg); route(bg, -0.2, 0.02); buzzO.start();
        loops.push({ base: 0.012, cur: 0, g: hg, set(v, tc = 0.3) { hg.gain.setTargetAtTime(v, now(), tc); }, stop(f = 0.6) { hg.gain.setTargetAtTime(0, now(), f / 3); hum.stop(now() + f + 0.1); } });
        loops.push({ base: 0.004, cur: 0, g: bg, set(v, tc = 0.3) { bg.gain.setTargetAtTime(v, now(), tc); }, stop(f = 0.6) { bg.gain.setTargetAtTime(0, now(), f / 3); buzzO.stop(now() + f + 0.1); } });
        b.tick = () => { if (Math.random() < 0.006) door(); };
        break;
      }
      case 'street': {
        add(pink, [['lowpass', 620]], 0.11, 0, 0.1);
        add(pink, [['bandpass', 1800, 0.5]], 0.008, -0.2, 0.2);
        b.walking = true;
        b.tick = (t) => { if (Math.random() < 0.06) carPass(rand(0.08, 0.18)); if (Math.random() < 0.01) scooter(); };
        break;
      }
      case 'store': {
        add(brown, [['lowpass', 260]], 0.08, -0.2, 0.05);
        const f = ctx.createOscillator(); f.frequency.value = 98; const fg = ctx.createGain(); fg.gain.value = 0; f.connect(fg); route(fg, -0.3, 0.02); f.start();
        loops.push({ base: 0.01, cur: 0, set(v, tc = 0.3) { fg.gain.setTargetAtTime(v, now(), tc); }, stop(fd = 0.6) { fg.gain.setTargetAtTime(0, now(), fd / 3); f.stop(now() + fd + 0.1); } });
        add(pink, [['lowpass', 500]], 0.05, 0.2, 0.1);
        b.tick = () => { if (Math.random() < 0.012) chime(); if (Math.random() < 0.014) scooter(); if (Math.random() < 0.02) carPass(0.07); };
        break;
      }
      case 'stairs': {
        add(brown, [['lowpass', 140]], 0.07, 0, 0.3);
        add(pink, [['bandpass', 420, 0.6]], 0.006, 0, 0.6);
        b.tick = () => { if (Math.random() < 0.006) door(true); };
        break;
      }
      case 'river': {
        const water = add(brown, [['bandpass', 420, 0.6]], 0.2, -0.1, 0.1);
        add(brown, [['lowpass', 380]], 0.12, 0, 0.1);
        add(pink, [['lowpass', 300]], 0.05, 0.3, 0.2);
        b.tick = (t) => { water.set(water.base * b.level * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.9) * fbm1(t * 0.6))), 0.25); if (Math.random() < 0.01) train(); };
        break;
      }
    }
    return b;
  }
  function setBedLevel(b, lv) { if (!b) return; b.level = lv; for (const l of b.loops) l.set(l.base * lv, 0.8); }

  // ── event sounds
  function carPass(g = 0.14) {
    if (!ready) return;
    const t = now(), dur = rand(2.4, 4.4), dir = Math.random() < 0.5 ? -1 : 1;
    const src = ctx.createBufferSource(); src.buffer = pink;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    const gn = ctx.createGain(); let p = null;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + dur * 0.5); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(1000, t + dur * 0.5); f.frequency.linearRampToValueAtTime(320, t + dur);
    src.connect(f); f.connect(gn);
    if (ctx.createStereoPanner) { p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.85 * dir, t); p.pan.linearRampToValueAtTime(0.85 * dir, t + dur); gn.connect(p); p.connect(dry); } else gn.connect(dry);
    src.start(t, rand(0, 2)); src.stop(t + dur + 0.1);
  }
  function scooter() {
    if (!ready) return;
    const t = now(), dur = rand(3, 4.5), dir = Math.random() < 0.5 ? -1 : 1;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(95, 120), t); o.frequency.linearRampToValueAtTime(rand(70, 85), t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.9 * dir, t); p.pan.linearRampToValueAtTime(0.9 * dir, t + dur); g.connect(p); p.connect(dry); } else g.connect(dry);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  function horn() { const a = rand(380, 460); tone(a, { dur: 0.35, gain: 0.012, type: 'sawtooth', lp: 900, send: 0.6, pan: rand(-0.6, 0.6) }); tone(a * 1.26, { dur: 0.35, gain: 0.01, type: 'sawtooth', lp: 900, send: 0.6 }); }
  function chime() { tone(1318.5, { dur: 1.3, gain: 0.03, send: 0.5, pan: -0.4 }); tone(1046.5, { dur: 1.6, gain: 0.03, at: 0.36, send: 0.5, pan: -0.4 }); }
  function door(echo) { burst(brown, { dur: 0.45, gain: echo ? 0.35 : 0.2, filters: [['lowpass', 220]], send: echo ? 1.2 : 0.4, pan: rand(-0.5, 0.5) }); tone(70, { dur: 0.3, gain: 0.05, send: 0.8 }); }
  function train() {
    if (!ready) return;
    const t = now(), dur = rand(6, 8);
    const src = ctx.createBufferSource(); src.buffer = brown;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const am = ctx.createGain(); const lfo = ctx.createOscillator(); lfo.frequency.value = 6.5; const lg = ctx.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(am.gain); am.gain.value = 0.65;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(am); am.connect(g); route(g, 0, 0.3);
    src.start(t); lfo.start(t); src.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }

  // ── public api
  const api = {
    get ready() { return ready; },
    get enabled() { return enabled; },
    unlock() { init(); if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (ctx && enabled && ctx.state !== 'running') ctx.resume().catch(() => {}); },
    setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, now(), 0.08); },
    setScene(id, opts = {}) {
      if (!ready) return;
      if (id !== sceneId) {
        if (bed) { const old = bed; old.loops.forEach((l) => l.stop(1.6)); }
        bed = makeBed(id); sceneId = id;
        setBedLevel(bed, 0); setTimeout(() => setBedLevel(bed, opts.level ?? 1), 30);
        const rv = { roof: [1.2, 3.5, 0.25], booth: [0.7, 2.5, 0.35], street: [1.4, 3, 0.25], store: [1.0, 3, 0.25], stairs: [3.2, 2.2, 0.9], river: [1.8, 3.4, 0.2] }[id] || [1.4, 3, 0.3];
        conv.buffer = impulse(rv[0], rv[1]); wet.gain.setTargetAtTime(rv[2], now(), 0.5);
      } else setBedLevel(bed, opts.level ?? 1);
      const indoor = !!opts.indoor;
      if (opts.rain) {
        if (!rainBed) {
          rainBed = { loops: [loop(white, [['highpass', 700], ['lowpass', 8000]], 0, 0.1), loop(pink, [['bandpass', 2600, 0.5]], 0.2, 0.15)], level: 0 };
          rainBed.loops[0].base = 0.09; rainBed.loops[1].base = 0.05;
        }
        rainBed.loops[0].f[1].frequency.setTargetAtTime(indoor ? 1800 : 8000, now(), 0.4);
        setBedLevel(rainBed, indoor ? 0.45 : 1);
      } else if (rainBed) setBedLevel(rainBed, 0);
      const wv = opts.wind || 0;
      if (wv > 0.05) {
        if (!windBed) { windBed = { loops: [loop(brown, [['bandpass', 420, 0.8]], -0.2, 0.1), loop(pink, [['bandpass', 900, 1.5]], 0.3, 0.1)], level: 0 }; windBed.loops[0].base = 0.22; windBed.loops[1].base = 0.02; }
        setBedLevel(windBed, indoor ? wv * 0.25 : wv);
      } else if (windBed) setBedLevel(windBed, 0);
      if (bed && opts.snow) setBedLevel(bed, (opts.level ?? 1) * 0.6);
    },
    // called ~4x/sec
    tick(t, walking) {
      if (!ready || !bed) return;
      bed.tick(t);
      if (windBed && windBed.level > 0.05) {
        const w = windBed.loops[0];
        w.set(w.base * windBed.level * (0.35 + 0.65 * (0.5 + 0.5 * fbm1(t * 0.33))), 0.35);
        windBed.loops[0].f[0].frequency.setTargetAtTime(300 + 400 * (0.5 + 0.5 * fbm1(t * 0.2 + 3)), now(), 0.5);
      }
      if (rainBed && rainBed.level > 0.1 && Math.random() < 0.5) tone(rand(2500, 5200), { dur: 0.012, gain: 0.012 * rainBed.level, pan: rand(-0.8, 0.8), send: 0.05 });
    },
    step(wet, pan) {
      burst(brown, { dur: 0.1, attack: 0.004, gain: 0.28, filters: [['lowpass', 240]], pan: pan * 0.15, send: 0.05 });
      burst(white, { dur: 0.04, gain: 0.03, filters: [['bandpass', 2400, 1]], pan: pan * 0.15, send: 0.02 });
      if (wet) burst(white, { dur: 0.14, gain: 0.05, filters: [['highpass', 2800]], at: 0.012, pan: pan * 0.15 });
    },
    // continuous smoking layers
    setInhale(v) { if (!ready) return; L.inhale.set(v * 0.09, 0.05); L.breathIn.set(v * 0.035, 0.08); },
    setCrackle(v) { if (!ready) return; L.crackle.set(v * 0.5, 0.04); L.crackle2.set(v * 0.22, 0.05); L.sizzle.set(v * 0.022, 0.06); },
    setFlame(kind, v) { if (!ready) return; L.flame.set(kind === 'torch' ? 0 : v * (kind === 'oil' ? 0.2 : 0.14), 0.05); L.jet.set(kind === 'torch' ? v * 0.07 : 0, 0.03); },
    setCoil(v, big) { if (!ready) return; L.coil.set(v * (big ? 0.075 : 0.045), 0.04); L.coilCr.set(v * (big ? 0.32 : 0.18), 0.04); },
    setBuzz(v) { if (!ready) return; L.buzz.set(v * 0.5, 0.02); },
    exhale(vol, dur, cold) {
      if (!ready) return;
      const g = L.exhale.g.gain, f = L.exhale.f[0].frequency, t = now();
      g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, 0.0001), t);
      g.linearRampToValueAtTime(0.03 + 0.17 * vol, t + 0.09);
      g.setTargetAtTime(0.0001, t + 0.12, dur * 0.32);
      L.exhale.cur = -1;
      f.cancelScheduledValues(t); f.setValueAtTime(cold ? 1100 : 950, t); f.exponentialRampToValueAtTime(430, t + dur);
    },
    stopExhale() { if (!ready) return; const g = L.exhale.g.gain; g.cancelScheduledValues(now()); g.setTargetAtTime(0.0001, now(), 0.05); },
    sfx: {
      bicStrike() { burst(white, { dur: 0.1, gain: 0.22, filters: [['bandpass', 3600, 1.3]], pan: 0.3 }); for (let i = 0; i < 4; i++) tone(rand(4200, 7600), { dur: 0.015, gain: 0.025, at: rand(0, 0.07), pan: 0.3, type: 'square', send: 0.05 }); burst(brown, { dur: 0.32, attack: 0.03, gain: 0.26, filters: [['lowpass', 950]], at: 0.05, pan: 0.3 }); },
      bicFail() { burst(white, { dur: 0.09, gain: 0.2, filters: [['bandpass', 3400, 1.3]], pan: 0.3 }); for (let i = 0; i < 3; i++) tone(rand(4200, 7600), { dur: 0.015, gain: 0.03, at: rand(0, 0.06), pan: 0.3, type: 'square' }); },
      torchClick() { burst(white, { dur: 0.01, gain: 0.32, filters: [['highpass', 3200]], pan: 0.3 }); tone(2700, { dur: 0.025, gain: 0.05, pan: 0.3 }); burst(pink, { dur: 0.12, attack: 0.004, gain: 0.22, filters: [['lowpass', 700]], at: 0.015, pan: 0.3 }); },
      torchOff() { burst(white, { dur: 0.012, gain: 0.18, filters: [['highpass', 3000]], pan: 0.3 }); },
      oilOpen() { burst(white, { dur: 0.014, gain: 0.18, filters: [['highpass', 2200]], pan: 0.3 }); [[2489, 0.14, 0.45], [3742, 0.09, 0.32], [5311, 0.06, 0.24], [7121, 0.035, 0.16], [1244, 0.045, 0.22]].forEach(([f, g, d]) => tone(f, { dur: d, gain: g, pan: 0.3, send: 0.35 })); },
      oilStrike() { burst(white, { dur: 0.13, gain: 0.2, filters: [['bandpass', 2600, 1.2]], pan: 0.3 }); for (let i = 0; i < 3; i++) tone(rand(3800, 6800), { dur: 0.015, gain: 0.02, at: rand(0, 0.07), pan: 0.3, type: 'square' }); burst(brown, { dur: 0.55, attack: 0.04, gain: 0.34, filters: [['lowpass', 520]], at: 0.07, pan: 0.3 }); },
      oilClose() { burst(brown, { dur: 0.08, gain: 0.5, filters: [['lowpass', 800]], pan: 0.3 }); tone(1150, { dur: 0.09, gain: 0.07, pan: 0.3 }); tone(2350, { dur: 0.05, gain: 0.045, pan: 0.3 }); tone(3480, { dur: 0.03, gain: 0.02, pan: 0.3 }); },
      matchStrike() { burst(white, { dur: 0.2, attack: 0.02, gain: 0.2, filters: [['bandpass', 2200, 0.9, 3800]], pan: 0.3 }); burst(white, { dur: 0.42, attack: 0.008, gain: 0.3, filters: [['highpass', 1300]], at: 0.15, pan: 0.3 }); burst(crackle, { dur: 0.5, gain: 0.45, at: 0.16, pan: 0.3 }); burst(brown, { dur: 0.4, attack: 0.03, gain: 0.2, filters: [['lowpass', 700]], at: 0.17, pan: 0.3 }); },
      matchOut() { burst(pink, { dur: 0.32, attack: 0.05, gain: 0.16, filters: [['bandpass', 380, 0.8, 1300]], pan: 0.3 }); },
      capsule() { burst(white, { dur: 0.007, gain: 0.55, filters: [['highpass', 2600]], pan: -0.25 }); tone(3000, { dur: 0.022, gain: 0.07, pan: -0.25 }); tone(880, { dur: 0.04, gain: 0.05, pan: -0.25 }); },
      flick() { tone(185, { dur: 0.05, gain: 0.11, send: 0.05 }); tone(165, { dur: 0.05, gain: 0.09, at: 0.085, send: 0.05 }); burst(white, { dur: 0.06, gain: 0.025, filters: [['bandpass', 4200, 1.5]], at: 0.1 }); },
      ashDrop() { burst(white, { dur: 0.05, gain: 0.02, filters: [['bandpass', 5200, 2]], at: 0.35 }); },
      stub() { burst(white, { dur: 0.5, attack: 0.03, gain: 0.24, filters: [['bandpass', 1250, 1.6]] }); burst(crackle, { dur: 0.6, gain: 0.6, filters: [['highpass', 1500]] }); burst(white, { dur: 0.9, attack: 0.1, gain: 0.05, filters: [['highpass', 4600]], at: 0.18 }); tone(88, { dur: 0.12, gain: 0.14 }); },
      cough() { for (let i = 0; i < 3; i++) { burst(pink, { dur: 0.17 - i * 0.02, attack: 0.006, gain: 0.3 - i * 0.07, filters: [['bandpass', 620, 1.4], ['lowpass', 2400]], at: i * 0.3, send: 0.2 }); burst(brown, { dur: 0.12, attack: 0.004, gain: 0.25 - i * 0.06, filters: [['lowpass', 300]], at: i * 0.3 }); } },
      tick() { burst(white, { dur: 0.006, gain: 0.25, filters: [['highpass', 3000]], send: 0.02 }); tone(2200, { dur: 0.018, gain: 0.03, send: 0.02 }); },
      podClick() { tone(1700, { dur: 0.02, gain: 0.03, send: 0.02 }); },
      bubble() { tone(rand(380, 720), { dur: rand(0.04, 0.08), gain: 0.025, f2: rand(160, 260), send: 0.05 }); },
      insert() { burst(white, { dur: 0.18, attack: 0.04, gain: 0.08, filters: [['bandpass', 2800, 1.2]] }); tone(260, { dur: 0.06, gain: 0.05, at: 0.17 }); },
      eject() { tone(320, { dur: 0.05, gain: 0.06 }); burst(white, { dur: 0.12, gain: 0.06, filters: [['bandpass', 3000, 1]] }); },
      sw() { burst(white, { dur: 0.012, gain: 0.25, filters: [['bandpass', 2200, 0.9]], send: 0.5 }); tone(1400, { dur: 0.02, gain: 0.05, send: 0.5 }); },
      thunder(dist) { const d = dist ?? 1; burst(brown, { dur: 4.8, attack: 0.15, gain: 0.55 * d, filters: [['lowpass', 150]], send: 0.5 }); burst(brown, { dur: 1.4, attack: 0.02, gain: 0.35 * d, filters: [['lowpass', 320]], at: 0.05, send: 0.3 }); },
      whoosh() { burst(pink, { dur: 0.6, attack: 0.2, gain: 0.08, filters: [['bandpass', 500, 0.6, 1600]], send: 0.3 }); },
      ui() { tone(2100, { dur: 0.03, gain: 0.018, send: 0 }); },
      pick() { tone(1500, { dur: 0.04, gain: 0.025, send: 0.05 }); tone(2250, { dur: 0.05, gain: 0.018, at: 0.03, send: 0.05 }); },
      pack() { burst(white, { dur: 0.08, gain: 0.07, filters: [['bandpass', 1600, 1.2]] }); burst(brown, { dur: 0.08, gain: 0.12, filters: [['lowpass', 500]], at: 0.02 }); },
      slide() { burst(white, { dur: 0.22, attack: 0.05, gain: 0.05, filters: [['bandpass', 3800, 1.5, 2400]] }); },
      wrap() { burst(white, { dur: 0.35, attack: 0.01, gain: 0.08, filters: [['highpass', 3000]] }); burst(crackle, { dur: 0.35, gain: 0.3, filters: [['highpass', 3000]], at: 0.05 }); },
    },
  };
  return api;
})();
