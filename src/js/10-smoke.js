// ───────────────────────── smoke (GPU stable fluids) ─────────────────────────
// Screen-space smoke: semi-Lagrangian advection, vorticity confinement, Jacobi pressure,
// density-driven buoyancy, wind, a ventilation sink and point lights (ember / flame).
// Falls back to a Canvas2D particle system when half-float render targets are missing.
const Smoke = (() => {
  const api = {
    ok: false, fallback: false,
    W: 1, H: 1,
    wind: [0, 0], windRelax: 0.3,
    buoy: 120, curl: 22, turb: 0,
    velDiss: 0.35, dyeDiss: 0.32,
    sink: null,
    amb: [1, 1, 1],
    ember: [0, 0, 0], emberR: 70,
    flame: [0, 0, 0], flameR: 120,
    opacity: 1,
    quality: 'mid',
  };
  const PRESETS = {
    high: { sim: 160, dye: 1024, iters: 20, scale: 1.25 },
    mid: { sim: 128, dye: 768, iters: 16, scale: 1 },
    low: { sim: 96, dye: 512, iters: 12, scale: 0.8 },
  };
  let Q = PRESETS.mid;
  let canvas, gl, ext, isGL2 = false;
  let P = {}, velocity, dye, divergence, curlFB, pressure;
  let time = 0;
  const queue = [];
  let dpr = 1;

  // ── shaders
  const VS = `precision highp float;
attribute vec2 aPosition;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 texelSize;
void main(){
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  const HEAD = `precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
`;
  const FS = {
    copy: HEAD + `uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv); }`,
    clear: HEAD + `uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }`,
    splat: HEAD + `#define MAXS 16
uniform sampler2D uTarget; uniform float aspectRatio; uniform int uCount;
uniform vec4 uPts[MAXS]; uniform vec4 uCol[MAXS];
void main(){
  vec4 base = texture2D(uTarget, vUv);
  vec4 add = vec4(0.0);
  for (int i = 0; i < MAXS; i++) {
    if (i >= uCount) break;
    vec2 p = vUv - uPts[i].xy; p.x *= aspectRatio;
    add += exp(-dot(p, p) / uPts[i].z) * uCol[i];
  }
  gl_FragColor = base + add;
}`,
    advect: HEAD + `uniform sampler2D uVelocity; uniform sampler2D uSource;
uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
uniform vec4 drain; uniform float aspect;
vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize){
  vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main(){
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
  result /= 1.0 + dissipation * dt;
  vec2 dp = vUv - drain.xy; dp.x *= aspect;
  result *= 1.0 - clamp(drain.z * exp(-dot(dp, dp) / drain.w) * dt, 0.0, 1.0);
  gl_FragColor = result;
}`,
    div: HEAD + `uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
    curl: HEAD + `uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
    vort: HEAD + `uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main(){
  float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C; force.y *= -1.0;
  vec2 v = texture2D(uVelocity, vUv).xy + force * dt;
  v = min(max(v, -1000.0), 1000.0);
  gl_FragColor = vec4(v, 0.0, 1.0);
}`,
    forces: HEAD + `uniform sampler2D uVelocity; uniform sampler2D uDye;
uniform float dt; uniform float buoy; uniform vec2 wind; uniform float windRelax;
uniform vec4 sink; uniform float aspect; uniform float time; uniform float turb;
void main(){
  vec2 v = texture2D(uVelocity, vUv).xy;
  float d = texture2D(uDye, vUv).a;
  float dd = min(d, 1.6);
  v.y += buoy * dd * dt;
  float gust = 1.0 + 0.45 * sin(vUv.y * 5.0 + time * 1.3 + vUv.x * 2.0) * sin(time * 0.37 + vUv.x * 3.0);
  v += (wind * gust - v) * windRelax * dt;
  vec2 q = vUv * vec2(aspect, 1.0) * 7.0;
  vec2 tn = vec2(sin(q.y * 1.7 + time * 1.3) + sin(q.y * 3.1 - time * 0.7 + q.x),
                 cos(q.x * 1.9 - time * 1.1) + cos(q.x * 2.7 + time * 0.9 + q.y));
  v += tn * turb * min(dd, 0.8) * dt;
  vec2 sp = sink.xy - vUv; sp.x *= aspect;
  float r2 = dot(sp, sp);
  v += sp / (sqrt(r2) + 0.002) * sink.z * exp(-r2 / sink.w) * dt;
  gl_FragColor = vec4(v, 0.0, 1.0);
}`,
    pressure: HEAD + `uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main(){
  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`,
    grad: HEAD + `uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
  vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
  gl_FragColor = vec4(v, 0.0, 1.0);
}`,
    display: HEAD + `uniform sampler2D uTexture;
uniform vec3 amb; uniform vec3 ember; uniform vec3 flame; uniform float aspect; uniform float opacity;
uniform float emberR; uniform float flameR;
void main(){
  vec4 c = texture2D(uTexture, vUv);
  float d = max(c.a, 0.0);
  float a = 1.0 - exp(-d * 2.3);
  if (a < 0.0015) { gl_FragColor = vec4(0.0); return; }
  vec3 col = min(max(c.rgb, 0.0) / max(d, 0.0001), vec3(1.15));
  vec2 o = (vR - vUv) * 2.5; vec2 oy = (vT - vUv) * 2.5;
  float dl = texture2D(uTexture, vUv - o).a; float dr = texture2D(uTexture, vUv + o).a;
  float du = texture2D(uTexture, vUv + oy).a; float dn = texture2D(uTexture, vUv - oy).a;
  vec3 n = normalize(vec3((dl - dr) * 0.9, (dn - du) * 0.9, 0.6));
  float lit = 0.86 + 0.18 * dot(n, normalize(vec3(-0.3, 0.8, 0.5)));
  float thick = smoothstep(0.0, 2.4, d);
  vec3 rgb = col * amb * lit * (1.0 - thick * 0.36);
  vec2 de = vUv - ember.xy; de.x *= aspect;
  rgb += vec3(1.0, 0.42, 0.13) * ember.z * exp(-dot(de, de) / emberR) * (0.6 + 0.4 * (1.0 - thick));
  vec2 df = vUv - flame.xy; df.x *= aspect;
  rgb += vec3(1.0, 0.63, 0.3) * flame.z * exp(-dot(df, df) / flameR);
  float nse = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  a = min(a, 0.93) * opacity;
  gl_FragColor = vec4(rgb * a + nse / 255.0, a);
}`,
  };

  // ── context + formats
  function getGL(c) {
    const p = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let g = c.getContext('webgl2', p);
    isGL2 = !!g;
    if (!g) g = c.getContext('webgl', p) || c.getContext('experimental-webgl', p);
    if (!g) return null;
    let half = null, linear = true;
    if (isGL2) {
      g.getExtension('EXT_color_buffer_float');
      g.getExtension('EXT_color_buffer_half_float');
    } else {
      half = g.getExtension('OES_texture_half_float');
      linear = !!g.getExtension('OES_texture_half_float_linear');
      g.getExtension('EXT_color_buffer_half_float');
    }
    const type = isGL2 ? g.HALF_FLOAT : half ? half.HALF_FLOAT_OES : null;
    if (!type) return null;
    gl = g;
    let rgba, rg, r;
    if (isGL2) { rgba = fmt(g.RGBA16F, g.RGBA, type); rg = fmt(g.RG16F, g.RG, type); r = fmt(g.R16F, g.RED, type); }
    else { rgba = fmt(g.RGBA, g.RGBA, type); rg = rgba; r = rgba; }
    if (!rgba || !rg || !r) return null;
    ext = { type, rgba, rg, r, linear };
    return g;
  }
  function fmt(internal, format, type) {
    if (!renderable(internal, format, type)) {
      if (isGL2) {
        if (internal === gl.R16F) return fmt(gl.RG16F, gl.RG, type);
        if (internal === gl.RG16F) return fmt(gl.RGBA16F, gl.RGBA, type);
      }
      return null;
    }
    return { internal, format };
  }
  function renderable(internal, format, type) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, type, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(f); gl.deleteTexture(t);
    return ok;
  }
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  let vsObj;
  function program(fsSrc, defines) {
    if (defines) fsSrc = defines.map((d) => '#define ' + d + '\n').join('') + fsSrc;
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram();
    gl.attachShader(p, vsObj); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u, use() { gl.useProgram(p); return this; } };
  }
  function buildPrograms() {
    vsObj = compile(gl.VERTEX_SHADER, VS);
    const manual = ext.linear ? null : ['MANUAL_FILTERING'];
    P.copy = program(FS.copy); P.clear = program(FS.clear); P.splat = program(FS.splat);
    P.advect = program(FS.advect, manual); P.div = program(FS.div); P.curl = program(FS.curl);
    P.vort = program(FS.vort); P.forces = program(FS.forces); P.pressure = program(FS.pressure);
    P.grad = program(FS.grad); P.display = program(FS.display);
  }
  function setupQuad() {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  }
  function blit(target) {
    if (!target) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  function fbo(w, h, f, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, ext.type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex, fbo: fb, w, h, tx: 1 / w, ty: 1 / h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; },
      dispose() { gl.deleteTexture(tex); gl.deleteFramebuffer(fb); },
    };
  }
  function dfbo(w, h, f, filter) {
    let a = fbo(w, h, f, filter), b = fbo(w, h, f, filter);
    return {
      w, h, tx: 1 / w, ty: 1 / h,
      get read() { return a; }, get write() { return b; },
      swap() { const t = a; a = b; b = t; },
      dispose() { a.dispose(); b.dispose(); },
    };
  }
  function resizeD(target, w, h, f, filter) {
    if (target.w === w && target.h === h) return target;
    const n = dfbo(w, h, f, filter);
    P.copy.use();
    gl.uniform1i(P.copy.u.uTexture, target.read.attach(0));
    blit(n.read);
    target.dispose();
    return n;
  }
  function res(r) {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    const mn = Math.round(r), mx = Math.round(r * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: mx, h: mn } : { w: mn, h: mx };
  }
  function initFBOs() {
    const s = res(Q.sim), d = res(Q.dye);
    const filter = ext.linear ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = dye ? resizeD(dye, d.w, d.h, ext.rgba, filter) : dfbo(d.w, d.h, ext.rgba, filter);
    velocity = velocity ? resizeD(velocity, s.w, s.h, ext.rg, filter) : dfbo(s.w, s.h, ext.rg, filter);
    if (divergence) divergence.dispose();
    if (curlFB) curlFB.dispose();
    if (pressure) pressure.dispose();
    divergence = fbo(s.w, s.h, ext.r, gl.NEAREST);
    curlFB = fbo(s.w, s.h, ext.r, gl.NEAREST);
    pressure = dfbo(s.w, s.h, ext.r, gl.NEAREST);
  }

  // ── Canvas2D fallback
  let c2d = null, puff = null;
  const parts = [];
  function makePuff() {
    const s = 64, c = makeCanvas(s, s), x = c.getContext('2d');
    const r = mulberry(7);
    for (let i = 0; i < 26; i++) {
      const px = s / 2 + (r() - 0.5) * s * 0.42, py = s / 2 + (r() - 0.5) * s * 0.42, rr = s * (0.12 + r() * 0.22);
      const g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(255,255,255,0.11)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }
    return c;
  }
  function fbSplat(q) {
    const amt = q[7];
    if (amt <= 0.002 || parts.length > 520) return;
    const n = q[8] > 20 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: q[0] + rand(-q[8], q[8]) * 0.3, y: q[1] + rand(-q[8], q[8]) * 0.3,
        vx: q[2] * 0.06 + rand(-6, 6), vy: q[3] * 0.06 + rand(-6, 6),
        r: Math.max(3, q[8] * 1.1), a: Math.min(0.9, amt * (q[8] < 8 ? 5 : 1.6)),
        life: 0, max: q[8] < 8 ? rand(2.6, 4) : rand(2.8, 4.6), rot: rand(TAU), vr: rand(-0.6, 0.6),
        c: [q[4], q[5], q[6]],
      });
    }
  }
  function fbStep(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      p.vx += (api.wind[0] - p.vx) * api.windRelax * dt;
      p.vy += (api.wind[1] - p.vy) * api.windRelax * dt - api.buoy * 0.12 * dt;
      if (api.sink) { const dx = api.sink.x - p.x, dy = api.sink.y - p.y, d = Math.hypot(dx, dy) + 1; const f = api.sink.strength * 0.4 * Math.exp(-(d * d) / (api.sink.radius * api.sink.radius * 4)); p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; }
      p.vx *= 1 - 0.6 * dt; p.vy *= 1 - 0.6 * dt;
      p.x += p.vx * dt + Math.sin(p.life * 1.7 + p.rot) * 6 * dt;
      p.y += p.vy * dt;
      p.r += dt * (8 + p.r * 0.35);
      p.rot += p.vr * dt;
    }
  }
  function fbRender() {
    const ctx = c2d, W = api.W, H = api.H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const t = p.life / p.max;
      const a = p.a * (1 - t) * Math.min(1, p.life * 6) * api.opacity;
      if (a < 0.004) continue;
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.drawImage(puff, -p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgb(${api.amb.map((v) => clamp(v * 235, 0, 255) | 0).join(',')})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── public
  api.init = function (cv, quality) {
    canvas = cv;
    api.quality = PRESETS[quality] ? quality : 'mid';
    Q = PRESETS[api.quality];
    try {
      if (!getGL(cv)) throw new Error('no float render targets');
      buildPrograms();
      setupQuad();
      api.ok = true;
    } catch (e) {
      console.warn('[smoke] fallback:', e && e.message);
      const n = document.createElement('canvas');
      n.id = cv.id; n.className = cv.className;
      cv.parentNode.replaceChild(n, cv);
      canvas = n; gl = null;
      c2d = n.getContext('2d');
      puff = makePuff();
      api.ok = true; api.fallback = true;
    }
    return canvas;
  };
  api.resize = function (W, H, devicePR) {
    api.W = W; api.H = H; dpr = devicePR;
    if (api.fallback) {
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      return;
    }
    const sc = Math.min(devicePR, Q.scale);
    const cw = Math.max(2, Math.round(W * sc)), ch = Math.max(2, Math.round(H * sc));
    if (canvas.width !== cw || canvas.height !== ch || !dye) { canvas.width = cw; canvas.height = ch; initFBOs(); }
  };
  api.setQuality = function (q) {
    if (!PRESETS[q] || q === api.quality) return;
    api.quality = q; Q = PRESETS[q];
    if (!api.fallback && gl) { const W = api.W, H = api.H; canvas.width = 0; api.resize(W, H, dpr); }
  };
  // x,y CSS px; vx,vy px/s screen (+y down); colour 0..1; amount = density; r = dye radius px; vr = velocity radius px
  api.splat = function (x, y, vx, vy, col, amount, r, vr) {
    if (api.fallback) { fbSplat([x, y, vx, vy, col[0], col[1], col[2], amount, r]); return; }
    queue.push([x, y, vx, vy, col[0], col[1], col[2], amount, r, vr || r]);
  };
  const MAXS = 16;
  const pv = new Float32Array(MAXS * 4), cv4 = new Float32Array(MAXS * 4), pd = new Float32Array(MAXS * 4), cd = new Float32Array(MAXS * 4);
  function flush() {
    if (!queue.length) return;
    const ppt = Math.min(api.W, api.H) / Q.sim;
    const ar = api.W / api.H;
    P.splat.use();
    gl.uniform1f(P.splat.u.aspectRatio, ar);
    for (let i = 0; i < queue.length; i += MAXS) {
      const n = Math.min(MAXS, queue.length - i);
      for (let j = 0; j < n; j++) {
        const q = queue[i + j], k = j * 4;
        const u = q[0] / api.W, v = 1 - q[1] / api.H;
        const rd = Math.max(q[8], 0.6) / api.H, rv = Math.max(q[9], 0.6) / api.H;
        pv[k] = u; pv[k + 1] = v; pv[k + 2] = rv * rv; pv[k + 3] = 0;
        cv4[k] = q[2] / ppt; cv4[k + 1] = -q[3] / ppt; cv4[k + 2] = 0; cv4[k + 3] = 0;
        pd[k] = u; pd[k + 1] = v; pd[k + 2] = rd * rd; pd[k + 3] = 0;
        cd[k] = q[4] * q[7]; cd[k + 1] = q[5] * q[7]; cd[k + 2] = q[6] * q[7]; cd[k + 3] = q[7];
      }
      gl.uniform1i(P.splat.u.uCount, n);
      gl.uniform1i(P.splat.u.uTarget, velocity.read.attach(0));
      gl.uniform4fv(P.splat.u.uPts, pv); gl.uniform4fv(P.splat.u.uCol, cv4);
      blit(velocity.write); velocity.swap();
      gl.uniform1i(P.splat.u.uTarget, dye.read.attach(0));
      gl.uniform4fv(P.splat.u.uPts, pd); gl.uniform4fv(P.splat.u.uCol, cd);
      blit(dye.write); dye.swap();
    }
    queue.length = 0;
  }
  api.step = function (dt) {
    if (!api.ok) return;
    time += dt;
    if (api.fallback) { fbStep(dt); return; }
    dt = Math.min(dt, 1 / 30);
    gl.disable(gl.BLEND);
    const ppt = Math.min(api.W, api.H) / Q.sim;
    const vx = velocity.tx, vy = velocity.ty;
    flush();
    let p = P.curl.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(0));
    blit(curlFB);

    p = P.vort.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.u.uCurl, curlFB.attach(1));
    gl.uniform1f(p.u.curl, api.curl); gl.uniform1f(p.u.dt, dt);
    blit(velocity.write); velocity.swap();

    p = P.forces.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.u.uDye, dye.read.attach(1));
    gl.uniform1f(p.u.dt, dt);
    gl.uniform1f(p.u.buoy, api.buoy / ppt);
    gl.uniform2f(p.u.wind, api.wind[0] / ppt, -api.wind[1] / ppt);
    gl.uniform1f(p.u.windRelax, api.windRelax);
    const s = api.sink;
    if (s) gl.uniform4f(p.u.sink, s.x / api.W, 1 - s.y / api.H, s.strength / ppt, Math.pow(s.radius / api.H, 2));
    else gl.uniform4f(p.u.sink, 0, 0, 0, 1);
    gl.uniform1f(p.u.aspect, api.W / api.H);
    gl.uniform1f(p.u.time, time);
    gl.uniform1f(p.u.turb, api.turb / ppt);
    blit(velocity.write); velocity.swap();

    p = P.div.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    p = P.clear.use();
    gl.uniform1i(p.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(p.u.value, 0.8);
    blit(pressure.write); pressure.swap();

    p = P.pressure.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < Q.iters; i++) {
      gl.uniform1i(p.u.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    p = P.grad.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    gl.uniform1i(p.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    p = P.advect.use();
    gl.uniform2f(p.u.texelSize, vx, vy);
    if (!ext.linear) gl.uniform2f(p.u.dyeTexelSize, vx, vy);
    let vid = velocity.read.attach(0);
    gl.uniform1i(p.u.uVelocity, vid); gl.uniform1i(p.u.uSource, vid);
    gl.uniform1f(p.u.dt, dt); gl.uniform1f(p.u.dissipation, api.velDiss);
    gl.uniform1f(p.u.aspect, api.W / api.H);
    gl.uniform4f(p.u.drain, 0, 0, 0, 1);
    blit(velocity.write); velocity.swap();

    if (!ext.linear) gl.uniform2f(p.u.dyeTexelSize, dye.tx, dye.ty);
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.u.uSource, dye.read.attach(1));
    gl.uniform1f(p.u.dissipation, api.dyeDiss);
    if (s && s.drain) gl.uniform4f(p.u.drain, s.x / api.W, 1 - s.y / api.H, s.drain, Math.pow(s.radius * 0.55 / api.H, 2));
    blit(dye.write); dye.swap();
  };
  api.render = function () {
    if (!api.ok) return;
    if (api.fallback) { fbRender(); return; }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const p = P.display.use();
    gl.uniform2f(p.u.texelSize, dye.tx, dye.ty);
    gl.uniform1i(p.u.uTexture, dye.read.attach(0));
    gl.uniform3f(p.u.amb, api.amb[0], api.amb[1], api.amb[2]);
    gl.uniform3f(p.u.ember, api.ember[0] / api.W, 1 - api.ember[1] / api.H, api.ember[2]);
    gl.uniform3f(p.u.flame, api.flame[0] / api.W, 1 - api.flame[1] / api.H, api.flame[2]);
    gl.uniform1f(p.u.emberR, Math.pow(api.emberR / api.H, 2));
    gl.uniform1f(p.u.flameR, Math.pow(api.flameR / api.H, 2));
    gl.uniform1f(p.u.aspect, api.W / api.H);
    gl.uniform1f(p.u.opacity, api.opacity);
    blit(null);
  };
  api.clear = function () {
    if (api.fallback) { parts.length = 0; return; }
    if (!gl || !dye) return;
    gl.disable(gl.BLEND);
    const p = P.clear.use();
    gl.uniform1f(p.u.value, 0);
    gl.uniform1i(p.u.uTexture, dye.read.attach(0)); blit(dye.write); dye.swap();
    gl.uniform1i(p.u.uTexture, velocity.read.attach(0)); blit(velocity.write); velocity.swap();
  };
  api.info = () => (api.fallback ? 'canvas2d' : (isGL2 ? 'webgl2' : 'webgl1') + (ext && ext.linear ? '' : '/manual'));
  return api;
})();
