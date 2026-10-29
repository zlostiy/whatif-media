// core.js
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
var SOFT = !!globalThis.STYLE_SOFT;
var PQ = new URLSearchParams(location.search);
var LANG = PQ.get("lang") || "ru";
var W = +(PQ.get("w") || 1080);
var H = +(PQ.get("h") || 1920);
var PORT = H > W;
var EN = LANG === "en";
var OV = PQ.get("ov") === "1" || window.RENDER_MODE === "ov";
var GPU = window.RENDER_MODE === "gpu";
document.getElementById("wrap").style.cssText = `width:${W}px;height:${H}px`;
if (PQ.get("ov") === "1") {
  document.documentElement.style.background = document.body.style.background = "transparent";
  document.getElementById("c").style.visibility = "hidden";
}
var canvas = document.getElementById("c");
canvas.width = W;
canvas.height = H;
if (PQ.get("nov") === "1") document.querySelector(".ov").style.display = "none";
var clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
var lerp = (a, b, x) => a + (b - a) * x;
var sm = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
var eio = (x) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
var eob = (x) => {
  x = clamp(x);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
var V = (x, y, z) => new THREE.Vector3(x, y, z);
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
var rnd = (i, k = 0) => hash(i * 1.37 + k * 9.1, k * 3.3 + i * 0.71);
var gradTex = (() => {
  const d = new Uint8Array([70, 125, 185, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
var dotTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.45, "rgba(255,255,255,.7)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
var _q = new THREE.Quaternion();
var _q2 = new THREE.Quaternion();
var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
if (SOFT) {
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}
var envTex = SOFT ? new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture : null;
var camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 3e3);
var BASEFOV = PORT ? 2 * Math.atan(Math.tan(23 * Math.PI / 180) / (W / H)) * 180 / Math.PI : 46;
camera.fov = BASEFOV;
camera.updateProjectionMatrix();
var composer = new EffectComposer(renderer);
var rp = new RenderPass(new THREE.Scene(), camera);
composer.addPass(rp);
var gtao = new GTAOPass(new THREE.Scene(), camera, W, H);
gtao.blendIntensity = 1;
gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 12 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
if (PQ.get("lite") !== "1") composer.addPass(gtao);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) { c = texture2D(tDiffuse, vUv + vec2(.002,0.)); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); } gl_FragColor = clamp(c, 0., 3.); }" }));
var bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.45, 0.96);
if (SOFT) bloom.strength = 0.12;
composer.addPass(bloom);
composer.addPass(new OutputPass());
var shake = 0;
var lastTgt = new THREE.Vector3();
var _d = new THREE.Vector3();
var $ = (id) => document.getElementById(id);
var capEl = $("cap");
var badge = $("badge");
var cards = $("cards");
var full = $("full");
if (!PORT) badge.style.top = "60px";
var strokeShadow = (w, c) => {
  const a = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 16 * Math.PI * 2;
    a.push(`${(Math.cos(t) * w).toFixed(1)}px ${(Math.sin(t) * w).toFixed(1)}px 0 ${c}`);
  }
  return a.join(",");
};
capEl.style.textShadow = strokeShadow(3, "#000") + ", 0 4px 14px rgba(0,0,0,.45)";
var bub = $("bub");
var bctx = bub.getContext("2d");
bub.width = W / 2;
bub.height = H / 2;
var BW = W / 2;
var BH = H / 2;
var BUBC = ["#1a1033", "#2b1f66", "#3a2a8a"];
function drawBubbles(p) {
  bctx.clearRect(0, 0, BW, BH);
  if (p <= 0 || p >= 1) return;
  const cov = p < 0.5 ? eio(p * 2) : eio((1 - p) * 2);
  if (cov < 0.18) return;
  for (let i = 0; i < 70; i++) {
    const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < 0.5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110);
    if (r < 36) continue;
    bctx.fillStyle = BUBC[i % 3];
    bctx.beginPath();
    bctx.arc(x, y, r, 0, 6.29);
    bctx.fill();
    bctx.strokeStyle = "rgba(255,255,255,.25)";
    bctx.lineWidth = 4;
    bctx.beginPath();
    bctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 3.6, 4.6);
    bctx.stroke();
  }
}
var L = (ru, en) => EN ? en : ru;
function card(top, inner, a, o = {}) {
  if (!PORT) top = o.ltop ?? 150;
  const left = PORT ? o.left ?? 50 : o.lleft ?? 79;
  return `<div class="card" style="top:${top}px;left:${left}%;transform:translateX(-50%) scale(${eob(a) * 0.9 + 0.1 * a});opacity:${clamp(a * 3)}">${inner}</div>`;
}
function start(topic) {
  if (topic.bubbles) BUBC = topic.bubbles;
  const mins = topic.mins || {};
  const shots = DATA.shots.map((s, i) => Object.assign({}, s, { vd: DATA.meta[i].dur, phr: DATA.meta[i].phr, i }));
  let acc = 0;
  shots.forEach((s, i) => {
    const lead = i === 0 ? 0.5 : 0.1;
    let d = lead + s.vd + 0.32;
    if (mins[s.scene]) d = Math.max(d, mins[s.scene]);
    if (i === shots.length - 1) d += 1.6;
    s.start = acc;
    s.dur = d;
    s.vo0 = acc + lead;
    acc += d;
    s.words = [];
    s.vo.split("*").forEach((seg, si) => seg.split(/\s+/).filter(Boolean).forEach((w) => s.words.push({ t: w, h: si % 2 === 1 })));
    s.words = s.words.reduce((arr, w) => {
      if (/^[.,:;!?…»"]+$/.test(w.t) && arr.length) arr[arr.length - 1].t += w.t;
      else arr.push(w);
      return arr;
    }, []);
    const assign = (list, a0, a1) => {
      const tot = list.reduce((q, w) => q + w.t.length + 2, 0);
      let c = 0;
      list.forEach((w) => {
        w.a = a0 + (a1 - a0) * c / tot;
        c += w.t.length + 2;
        w.b = a0 + (a1 - a0) * c / tot;
      });
    };
    let wi = 0;
    s.phr.forEach(([pa, pb, ptxt]) => {
      const n = ptxt.replace(/\*/g, "").split(/\s+/).filter(Boolean).filter((x) => !/^[.,:;!?…»"—]+$/.test(x)).length;
      assign(s.words.slice(wi, wi + n), s.vo0 + pa, s.vo0 + pb);
      wi += n;
    });
    if (wi < s.words.length) assign(s.words.slice(wi), s.vo0 + s.vd * 0.9, s.vo0 + s.vd);
    s.words = s.words.filter((w) => w.t !== "\u2014");
    const ch = [];
    let cur = [];
    s.words.forEach((w, j) => {
      cur.push(j);
      if (cur.length >= 3 || /[.,:;!?…—»"]$/.test(w.t)) {
        ch.push(cur);
        cur = [];
      }
    });
    if (cur.length) ch.push(cur);
    s.chunks = ch;
  });
  const TOTAL = acc;
  window.TOTAL = TOTAL;
  window.TL = { total: TOTAL, shots: shots.map((s) => ({ scene: s.scene, badge: s.badge, start: s.start, dur: s.dur, vo0: s.vo0 })) };
  if (topic.init) topic.init(shots);
  window.setTime = function(t) {
    let i = shots.findIndex((s2) => t >= s2.start && t < s2.start + s2.dur);
    if (i < 0) i = shots.length - 1;
    const s = shots[i], lt = t - s.start, k = clamp(lt / s.dur);
    shake = 0;
    if (!OV) topic.render(s, lt, k, t, i);
    if (GPU) return;
    full.style.opacity = 1;
    full.innerHTML = topic.full ? topic.full(s, lt, k) || "" : "";
    cards.innerHTML = topic.cards ? topic.cards(s, lt, k) || "" : "";
    const prev = shots[i - 1];
    let bStart = s.start;
    for (let j = i; j >= 0 && shots[j].badge === s.badge; j--) bStart = shots[j].start;
    const bp = eob(clamp((t - bStart) / 0.45)), has = !!s.badge;
    badge.style.opacity = has ? 1 : 0;
    badge.style.transform = `scale(${has ? 0.3 + 0.7 * bp : 1}) rotate(${(1 - bp) * -8}deg)`;
    $("dayt").textContent = s.badge || "";
    $("loct").textContent = s.loc || "";
    let html = "";
    const cw = s.words;
    let ci = s.chunks.findIndex((c) => t < cw[c[c.length - 1]].b + 0.05);
    if (ci < 0) ci = s.chunks.length - 1;
    const ch = s.chunks[ci];
    if (ch && t >= cw[ch[0]].a - 0.05) ch.forEach((j) => {
      const w = cw[j];
      const a = clamp((t - w.a + 0.06) / 0.14);
      if (a <= 0) return;
      const sc2 = a < 1 ? 0.4 + 0.6 * eob(a) : 1;
      html += `<span class="${w.h ? "h" : ""}" style="transform:scale(${sc2.toFixed(3)}) translateY(${((1 - a) * 20).toFixed(1)}px);opacity:${clamp(a * 2)}">${w.t.replace(/[.…]+$/, "").replace(/^…/, "")}</span>`;
    });
    capEl.innerHTML = html;
    const end = i === shots.length - 1 || s.scene.startsWith("end");
    const cp = topic.cap && topic.cap(s) || {};
    if (PORT) {
      capEl.style.bottom = (cp.bottom ?? (end ? 1180 : 560)) + "px";
      capEl.style.fontSize = (end ? 104 : 82) + "px";
    } else {
      capEl.style.bottom = (cp.lbottom ?? (end ? 520 : 70)) + "px";
      capEl.style.fontSize = (end ? 96 : 66) + "px";
      capEl.style.left = "240px";
      capEl.style.right = "240px";
    }
    let bp2 = 0;
    const nx = shots[i + 1];
    if (prev && prev.badge !== s.badge) bp2 = 0.5 + 0.5 * clamp(lt / 0.35);
    if (nx && nx.badge !== s.badge) {
      const r = s.dur - lt;
      if (r < 0.35) bp2 = 0.5 * (1 - r / 0.35);
    }
    drawBubbles(bp2 > 0 && bp2 < 1 ? bp2 : 0);
    bub.style.visibility = bp2 > 0 && bp2 < 1 ? "visible" : "hidden";
    const fx = topic.fx ? topic.fx(s, lt, k, i) || {} : {};
    let fl = fx.fl || 0, bk = fx.bk || 0;
    if (i === 0) bk = Math.max(bk, 1 - sm(0, 0.5, t));
    if (i === shots.length - 1) bk = Math.max(bk, sm(s.dur - 0.5, s.dur, lt));
    $("flash").style.opacity = fl;
    $("flash").style.background = fx.flc || "#fff";
    $("black").style.opacity = bk;
    if (OV) window.__ovSig = [full.innerHTML, cards.innerHTML, capEl.innerHTML, badge.style.cssText, s.badge, s.loc, capEl.style.cssText, (bp2 > 0 && bp2 < 1 ? bp2 : 0).toFixed(4), fl.toFixed(3), fx.flc || "", bk.toFixed(3)].join("|");
  };
  window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)))).then(() => {
    window.setTime(0);
    return true;
  });
}

// lemo/kit31.js
import * as THREE5 from "three";

// lemo/hd2d/post_ts.js
import * as THREE2 from "three";
import { EffectComposer as EffectComposer2 } from "three/addons/postprocessing/EffectComposer.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { UnrealBloomPass as UnrealBloomPass2 } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass as OutputPass2 } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass as ShaderPass2 } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass as GTAOPass2 } from "three/addons/postprocessing/GTAOPass.js";
var cocShader = {
  uniforms: { tColor: { value: null }, tDepth: { value: null }, tAO: { value: null }, aoAmt: { value: 0 }, aoDebug: { value: 0 }, focus: { value: 0.3 }, aper: { value: 4 }, maxCoc: { value: 18 }, near: { value: 0.01 }, far: { value: 50 }, tiltAmt: { value: 0 }, tiltC: { value: 0.5 }, tiltW: { value: 0.1 }, tiltF: { value: 0.3 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth, tAO; uniform float aoAmt, focus, aper, maxCoc, near, far, aoDebug, tiltAmt, tiltC, tiltW, tiltF;
    void main(){
      float d = texture2D(tDepth, vUv).x;
      float z = -perspectiveDepthToViewZ(d, near, far);
      float c = clamp(aper * (1.0/focus - 1.0/z), -maxCoc, maxCoc);   // negative = foreground, positive = background (pixels)
      // Tilt-shift: outside the sharp band, blur grows with distance from the band; above counts as background, below as foreground (reuses gather's front/back occlusion rules)
      float dy = vUv.y - tiltC, tc = min(maxCoc, tiltAmt * smoothstep(tiltW, tiltW + tiltF, abs(dy)));
      if (tc > abs(c)) c = dy > 0. ? tc : -tc;
      vec3 col = texture2D(tColor, vUv).rgb;
      if (aoAmt > 0.) col *= mix(1., pow(texture2D(tAO, vUv).r, 1.6), aoAmt);
      if (aoDebug > .5) col = vec3(pow(texture2D(tAO, vUv).r, 1.6));
      gl_FragColor = vec4(col, c);
    }`
};
var gatherShader = {
  uniforms: { tIn: { value: null }, res: { value: new THREE2.Vector2(1920, 1080) }, maxCoc: { value: 18 } },
  vertexShader: cocShader.vertexShader,
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tIn; uniform vec2 res; uniform float maxCoc;
    void main(){
      vec4 c0 = texture2D(tIn, vUv); float a0 = abs(c0.a);
      if (maxCoc < .5) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      vec3 acc = c0.rgb / (a0*a0 + 1.); float wsum = 1. / (a0*a0 + 1.);
      const int N = 96;
      for (int i = 0; i < N; i++) {
        float r = maxCoc * sqrt((float(i) + .5) / float(N));
        float th = float(i) * 2.39996;
        vec2 off = vec2(cos(th), sin(th)) * r / res;
        vec4 s = texture2D(tIn, vUv + off);
        float sa = abs(s.a);
        // samples farther than the centre spread no wider than the centre's own radius (stops the background from blurring over a sharp foreground)
        if (s.a > c0.a) sa = min(sa, max(a0, 0.));
        float w = smoothstep(r - 1.5, r + .5, sa) / (sa*sa + 1.);
        acc += s.rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.);
    }`
};
var DofScenePass = class extends Pass {
  constructor(scene, camera2, w, h, o = {}) {
    super();
    this.scene = scene;
    this.camera = camera2;
    this.needsSwap = true;
    this.s = o.ssaa || 1;
    this.rt = new THREE2.WebGLRenderTarget(w, h, { samples: 4, type: THREE2.HalfFloatType, depthTexture: new THREE2.DepthTexture(w, h, THREE2.FloatType) });
    this.rtC = new THREE2.WebGLRenderTarget(w, h, { type: THREE2.HalfFloatType });
    this.coc = new FullScreenQuad(new THREE2.ShaderMaterial(cocShader));
    this.gat = new FullScreenQuad(new THREE2.ShaderMaterial(gatherShader));
    this.gat.material.uniforms.res.value.set(w, h);
    this.focus = 0.3;
    this.aper = 4;
    this.maxCoc = 16;
    this.aoAmt = 0;
    if (o.ao) {
      this.ao = new GTAOPass2(scene, camera2, w, h);
      this.ao.output = GTAOPass2.OUTPUT.Off;
      this.ao.updateGtaoMaterial({ radius: o.aoRadius ?? 0.25, distanceExponent: 1.2, thickness: o.aoThickness ?? 1, scale: o.aoScale ?? 2.5, distanceFallOff: 0.6, samples: 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * this.s, rings: 2, samples: 16 });
      this.aoAmt = o.aoAmt ?? 0.85;
    }
  }
  render(renderer2, writeBuffer) {
    renderer2.setRenderTarget(this.rt);
    renderer2.clear();
    renderer2.render(this.scene, this.camera);
    if (this.ao && this.aoAmt > 0) this.ao.render(renderer2, null, null);
    const u = this.coc.material.uniforms;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    u.focus.value = this.focus;
    u.aper.value = this.aper * this.s;
    u.maxCoc.value = this.maxCoc * this.s;
    u.near.value = this.camera.near;
    u.far.value = this.camera.far;
    u.tiltAmt.value = (this.tiltAmt || 0) * this.s;
    u.tiltC.value = this.tiltC ?? 0.5;
    u.tiltW.value = this.tiltW ?? 0.1;
    u.tiltF.value = this.tiltF ?? 0.3;
    u.tAO.value = this.ao ? this.ao.gtaoMap : null;
    u.aoDebug.value = this.aoDebug ? 1 : 0;
    u.aoAmt.value = this.ao ? this.aoAmt : 0;
    renderer2.setRenderTarget(this.rtC);
    this.coc.render(renderer2);
    const g = this.gat.material.uniforms;
    g.tIn.value = this.rtC.texture;
    g.maxCoc.value = this.maxCoc * this.s;
    renderer2.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.gat.render(renderer2);
  }
};
var vignetteShader = {
  uniforms: { tDiffuse: { value: null }, amt: { value: 0.35 }, fade: { value: 1 }, warm: { value: 0 }, contrast: { value: 0 }, sat: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float amt, fade, warm, contrast, sat;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - .5; d.x *= 1.25; float v = 1. - amt * smoothstep(.25, .85, length(d));
      c.rgb *= v * fade; c.rgb *= mix(vec3(1.), vec3(1.06, 1., .9), warm);
      float l = dot(c.rgb, vec3(.2126, .7152, .0722)); c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = c.rgb * (1. + contrast) / (1. + contrast * c.rgb / (c.rgb + .6));   // gentle contrast in linear space
      gl_FragColor = c; }`
};
function makePost(renderer2, scene, camera2, w, h, o = {}) {
  const s = o.ssaa || 1, W2 = w * s, H2 = h * s;
  const composer2 = new EffectComposer2(renderer2, new THREE2.WebGLRenderTarget(W2, H2, { type: THREE2.HalfFloatType }));
  const dof = new DofScenePass(scene, camera2, W2, H2, o);
  const bloom2 = new UnrealBloomPass2(new THREE2.Vector2(W2, H2), 0.2, 0.5, 1.6);
  const vig = new ShaderPass2(vignetteShader);
  const out = new OutputPass2();
  composer2.addPass(dof);
  composer2.addPass(bloom2);
  composer2.addPass(vig);
  composer2.addPass(out);
  return { composer: composer2, dof, bloom: bloom2, vig };
}

// lemo/hd2d/px.js
import * as THREE3 from "three";
var PPM = 24;
var B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
var bayer = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
function h2(x, y, s = 0) {
  let h = x * 374761393 + y * 668265263 + s * 982451653 | 0;
  h = (h ^ h >>> 13) * 1274126177;
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function vn2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
var fbm = (x, y, s = 0, o = 4) => {
  let a = 0, f = 1, w = 0.5, t = 0;
  for (let i = 0; i < o; i++) {
    a += vn2(x * f, y * f, s + i * 17) * w;
    t += w;
    f *= 2;
    w *= 0.5;
  }
  return a / t;
};
var hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
var mixc = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
var PX = class {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.c = document.createElement("canvas");
    this.c.width = w;
    this.c.height = h;
    this.g = this.c.getContext("2d", { willReadFrequently: true });
    this.d = this.g.createImageData(w, h);
  }
  set(x, y, col, a = 255) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, c = typeof col === "string" ? hex(col) : col;
    this.d.data[i] = c[0];
    this.d.data[i + 1] = c[1];
    this.d.data[i + 2] = c[2];
    this.d.data[i + 3] = a;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4, D = this.d.data;
    return D[i + 3] ? [D[i], D[i + 1], D[i + 2], D[i + 3]] : null;
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
  }
  // Fill pixel by pixel from a function: f(x,y) → colour or null
  fill(f) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = f(x, y);
      if (c) this.set(x, y, c);
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, typeof col === "function" ? col(x, y, dx, dy) : col);
    }
  }
  poly(pts, col) {
    const ys = pts.map((p) => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [], yc = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if (ay <= yc && by > yc || by <= yc && ay > yc) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof col === "function" ? col(x, y) : col);
    }
  }
  line(x0, y0, x1, y1, col) {
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (; ; ) {
      this.set(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  // Outline: transparent pixels next to opaque ones → the neighbour's colour, darkened (selout)
  outline(k = 0.32, tint = [22, 14, 30]) {
    const src = new Uint8ClampedArray(this.d.data), W2 = this.w, H2 = this.h, add = [];
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      if (src[(y * W2 + x) * 4 + 3]) continue;
      let n = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W2 || Y >= H2) continue;
        const i = (Y * W2 + X) * 4;
        if (src[i + 3] > 128 && !src.__skip) {
          n = [src[i], src[i + 1], src[i + 2]];
          break;
        }
      }
      if (n) add.push([x, y, mixc(tint, n, k)]);
    }
    for (const [x, y, c] of add) this.set(x, y, c);
  }
  done() {
    this.g.putImageData(this.d, 0, 0);
    return this.c;
  }
};
function texOf(canvas2, o = {}) {
  const t = new THREE3.CanvasTexture(canvas2);
  t.magFilter = THREE3.NearestFilter;
  t.minFilter = o.mip ? THREE3.NearestMipmapLinearFilter : THREE3.LinearFilter;
  t.generateMipmaps = !!o.mip;
  t.colorSpace = o.linear ? THREE3.NoColorSpace : THREE3.SRGBColorSpace;
  if (o.repeat) {
    t.wrapS = t.wrapT = THREE3.RepeatWrapping;
    t.repeat.set(o.repeat[0], o.repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}
function ramp(cols, dz = 0.45) {
  const C = cols.map((c) => typeof c === "string" ? hex(c) : c);
  return (v, x, y) => {
    v = Math.max(0, Math.min(0.9999, v)) * (C.length - 1);
    const i = Math.floor(v);
    let f = v - i;
    f = dz >= 1 ? f : Math.max(0, Math.min(1, (f - 0.5) / dz + 0.5));
    return C[Math.min(C.length - 1, i + (bayer(x, y) < f ? 1 : 0))];
  };
}
function spriteMats(tex, emTex, o = {}) {
  const m = new THREE3.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE3.DoubleSide, emissiveMap: emTex || null, emissive: emTex ? new THREE3.Color(o.emCol ?? "#ffffff") : new THREE3.Color(0), emissiveIntensity: o.emI ?? 1 });
  if (o.color) m.color.set(o.color);
  const depth = new THREE3.MeshDepthMaterial({ depthPacking: THREE3.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE3.DoubleSide });
  const dist = new THREE3.MeshDistanceMaterial({ map: tex, alphaTest: 0.5, side: THREE3.DoubleSide });
  return { m, depth, dist };
}
function billboard(tex, wM, hM, o = {}) {
  const geo = new THREE3.PlaneGeometry(wM, hM);
  geo.translate((0.5 - (o.ax ?? 0.5)) * wM, hM / 2 - (o.ay ?? 0) * hM, 0);
  const M = spriteMats(tex, o.em, o);
  const mesh = new THREE3.Mesh(geo, M.m);
  mesh.castShadow = o.shadow ?? true;
  mesh.receiveShadow = o.receive ?? false;
  mesh.customDepthMaterial = M.depth;
  mesh.customDistanceMaterial = M.dist;
  return mesh;
}
var _radial = {};
function radialTex(key = "soft", stops = [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]) {
  if (_radial[key]) return _radial[key];
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [p, col] of stops) g.addColorStop(p, col);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE3.CanvasTexture(c);
  t.colorSpace = THREE3.SRGBColorSpace;
  return _radial[key] = t;
}
function blob(r, a = 0.5, col = "#0a0608") {
  const m = new THREE3.Mesh(new THREE3.PlaneGeometry(r * 2, r * 1.2), new THREE3.MeshBasicMaterial({ map: radialTex("blob", [[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,255,255,.5)"], [1, "rgba(255,255,255,0)"]]), color: col, transparent: true, opacity: a, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  m.material.polygonOffset = true;
  m.material.polygonOffsetFactor = -2;
  return m;
}
function glow(col, size, i = 1) {
  const s = new THREE3.Sprite(new THREE3.SpriteMaterial({ map: radialTex("glow", [[0, "rgba(255,255,255,1)"], [0.18, "rgba(255,255,255,.55)"], [0.45, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]]), color: new THREE3.Color(col).multiplyScalar(i), blending: THREE3.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}

// lemo/hd2d/fx.js
import * as THREE4 from "three";
function sky(o = {}) {
  const u = {
    top: { value: new THREE4.Color(o.top ?? "#070b1c") },
    mid: { value: new THREE4.Color(o.mid ?? "#16254a") },
    hor: { value: new THREE4.Color(o.hor ?? "#3a5270") },
    moonDir: { value: (o.moonDir ?? new THREE4.Vector3(-0.3, 0.35, -1)).clone().normalize() },
    moonCol: { value: new THREE4.Color(o.moonCol ?? "#dfe8ff") },
    moonI: { value: o.moonI ?? 1 },
    k: { value: 1 }
  };
  const m = new THREE4.ShaderMaterial({
    uniforms: u,
    side: THREE4.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix * vec4(position,0.)).xyz); vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix*vec4(position,1.)).xyz,1.); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vD; uniform vec3 top, mid, hor, moonCol; uniform vec3 moonDir; uniform float moonI, k;
      void main(){ float y = vD.y; vec3 c = y > .18 ? mix(mid, top, smoothstep(.18, .75, y)) : mix(hor, mid, smoothstep(-.02, .18, y));
        float d = max(dot(normalize(vD), moonDir), 0.); c += moonCol * (pow(d, 900.) * 6. + pow(d, 60.) * .25 + pow(d, 8.) * .06) * moonI;
        gl_FragColor = vec4(c * k, 1.); }`
  });
  const mesh = new THREE4.Mesh(new THREE4.SphereGeometry(900, 32, 16), m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, u };
}

// lemo/kit31.js
renderer.toneMapping = THREE5.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE5.PCFSoftShadowMap;
var post = makePost(renderer, new THREE5.Scene(), camera, W, H, { ssaa: 1, ao: true, aoRadius: 0.4, aoScale: 2.5, aoAmt: 0.7 });
post.bloom.strength = 0.5;
post.bloom.radius = 0.7;
post.bloom.threshold = 0.85;
var VG = post.vig.uniforms;
VG.amt.value = 0.55;
VG.warm.value = 0.12;
VG.contrast.value = 0.28;
VG.sat.value = 1.18;
function worldUV(geo, tile) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute("uv", new THREE5.BufferAttribute(uv, 2));
  return geo;
}
var matCache = /* @__PURE__ */ new Map();
function pxMat(key, w, h, fill, o = {}) {
  if (matCache.has(key)) return matCache.get(key);
  const P = new PX(w, h);
  P.fill(fill);
  const t = texOf(P.done(), { repeat: [1, 1] });
  t.wrapS = t.wrapT = THREE5.RepeatWrapping;
  const m = new THREE5.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 });
  if (o.em) {
    const E = new PX(w, h);
    E.fill(o.em);
    m.emissiveMap = texOf(E.done(), { repeat: [1, 1] });
    m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE5.RepeatWrapping;
    m.emissive = new THREE5.Color("#ffffff");
    m.emissiveIntensity = o.emI ?? 2;
  }
  m.userData.tile = w / PPM;
  matCache.set(key, m);
  return m;
}
var MAT = {
  steel: () => pxMat("steel", 48, 48, (x, y) => {
    const R = ramp(["#262b17", "#3b4322", "#56602f", "#6e7a3c", "#8a964e"]);
    const px = x % 24, py = y % 16;
    if (px === 0 || py === 0) return R(0.1, x, y);
    if (px === 1 || py === 1) return R(0.72, x, y);
    if ((px === 3 || px === 21) && (py === 3 || py === 13)) return R(0.95, x, y);
    return R(0.45 + (fbm(x * 0.15, y * 0.15, 31) - 0.5) * 0.35, x, y);
  }, { rough: 0.7 }),
  tread: () => pxMat("tread", 24, 24, (x, y) => {
    const R = ramp(["#141416", "#222226", "#34343a", "#4a4a52"]);
    return R((x % 6 < 2 ? 0.25 : 0.6) + (h2(x, y, 3) - 0.5) * 0.2, x, y);
  }),
  concrete: () => pxMat("concrete", 48, 48, (x, y) => {
    const R = ramp(["#5a5852", "#77746c", "#928e84", "#aca79b", "#c4beb1"]);
    return R(0.55 + (fbm(x * 0.2, y * 0.2, 7) - 0.5) * 0.4 - (x % 24 === 0 || y % 24 === 0 ? 0.2 : 0), x, y);
  }),
  dirt: () => pxMat("dirt", 48, 48, (x, y) => {
    const R = ramp(["#3a2a1c", "#584030", "#77583e", "#94714f"]);
    return R(0.5 + (fbm(x * 0.12, y * 0.12, 5) - 0.5) * 0.6, x, y);
  }),
  water: () => {
    const m = pxMat("water", 48, 48, (x, y) => {
      const R = ramp(["#14324f", "#1d4a70", "#2a6592", "#4a8ab4", "#8cc4e0"]);
      const w = Math.sin(x * 0.4 + Math.sin(y * 0.3) * 2);
      return R(0.45 + w * 0.12 + (h2(x >> 2, y >> 1, 9) > 0.93 ? 0.3 : 0), x, y);
    }, { rough: 0.25 });
    m.transparent = true;
    m.opacity = 0.85;
    return m;
  },
  panel: () => pxMat("panel", 48, 48, (x, y) => {
    const R = ramp(["#20262c", "#323a42", "#46505a", "#5c6773", "#7a8794"]);
    const px = x % 16, py = y % 16;
    if (px === 0 || py === 0) return R(0.1, x, y);
    return R(0.5 + (py < 2 ? 0.2 : 0) + (h2(x, y, 4) - 0.5) * 0.1, x, y);
  }, { rough: 0.5, metal: 0.2 })
};
function pxBox(parent, w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const g = worldUV(new THREE5.BoxGeometry(w, h, d), mat.userData?.tile ?? 2);
  g.translate(0, h / 2, 0);
  const m = new THREE5.Mesh(g, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function pxCyl(parent, r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 16) {
  const g = worldUV(new THREE5.CylinderGeometry(r0, r1, h, seg), mat.userData?.tile ?? 2);
  const m = new THREE5.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
var flat = (c) => new THREE5.MeshStandardMaterial({ color: c, roughness: 0.85 });
var lit = (c, i = 3) => new THREE5.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.5 });
var grp = (parent, x = 0, y = 0, z = 0, ry = 0) => {
  const g = new THREE5.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  if (parent) parent.add(g);
  return g;
};
var SPX = 1 / 26;
var FW = 30;
var FH = 46;
var HC = { skin: ramp(["#b87a62", "#dea282", "#f3c9a6", "#ffe2c8"], 0.22), hair: ramp(["#1c120e", "#2e1d16", "#46302a"], 0.22), jacket: ramp(["#7a5208", "#c08a12", "#f2c230", "#ffe27a"], 0.22), pants: ramp(["#141a2c", "#222b45", "#33406a"], 0.22), boot: ramp(["#141010", "#2a2220", "#3e3430"], 0.22), set: ramp(["#1a1a22", "#2e2e3a", "#4a4a5c"], 0.22) };
var INK = hex("#1a1016");
function drawHero(P, E, p) {
  const by = p.bob || 0, top = 17 + by;
  const st = p.step ?? -1;
  if (!p.sit) {
    const legs = st < 0 ? [[11, 0], [16, 0]] : [[[9, 0], [18, -1]], [[12, -1], [15, 0]], [[18, -1], [9, 0]], [[15, 0], [12, -1]]][st];
    legs.forEach(([lx, ly], i) => {
      for (let y = 36; y < 44 + ly; y++) for (let x = lx; x < lx + 4; x++) P.set(x, y, (y > 41 + ly ? HC.boot : HC.pants)((i ? 0.6 : 0.85) - (x === lx ? 0.3 : 0), x, y));
    });
  }
  const bot = p.sit ? 34 : 37;
  P.poly([[9, top], [20, top], [22, bot], [7, bot]], (x, y) => {
    const u = (y - top) / (bot - top), s = (x - 7) / 15;
    let v = 0.7 - s * 0.45 + (1 - u) * 0.1;
    if (x === 15 && y > top + 2) v -= 0.3;
    return HC.jacket(v, x, y);
  });
  P.rect(8, bot - 2, 14, 1, HC.jacket(0.2, 0, 0));
  const hx = 15 + (p.look || 0), hy = 10 + by;
  P.ellipse(hx, hy, 5.2, 5.6, (x, y, dx, dy) => HC.skin(0.62 - dx * 0.12 - dy * 0.3, x, y));
  for (let x = hx - 5; x <= hx + 5; x++) {
    const d = 2 + (x * 5 % 3 === 0 ? 1 : 0);
    for (let y = hy - 6; y < hy - 6 + d + 1; y++) P.set(x, y, HC.hair(0.6 + (x - hx) * 0.04, x, y));
  }
  for (let y = hy - 4; y < hy + 1; y++) P.set(hx - 5, y, HC.hair(0.4, 0, y));
  const ey = Math.round(hy);
  if (p.blink) {
    P.set(hx + 2, ey, HC.skin(0.2, 0, 0));
    P.set(hx - 1, ey, HC.skin(0.2, 0, 0));
  } else {
    P.set(hx + 2, ey, INK);
    P.set(hx + 2, ey - 1, INK);
    P.set(hx - 1, ey, INK);
    P.set(hx - 1, ey - 1, INK);
  }
  P.set(hx + 1, ey + 3, hex(p.mouth ? "#7a2a2a" : "#b86a5a"));
  if (p.mouth) P.set(hx + 2, ey + 3, hex("#7a2a2a"));
  if (p.headset) {
    for (let x = hx - 5; x <= hx + 5; x++) P.set(x, hy - 7 + Math.round(Math.abs(x - hx) * 0.3), HC.set(0.6, x, 0));
    P.rect(hx - 6, hy - 2, 2, 4, HC.set(0.4, 0, 0));
    P.line(hx - 5, hy + 2, hx + 1, hy + 4, HC.set(0.5, 0, 0));
    P.set(hx + 2, hy + 4, hex("#e8463c"));
  }
  const arm = p.arm || "low", sl = (pts) => pts.forEach(([x, y]) => {
    P.set(x, y, HC.jacket(0.6, x, y));
    P.set(x, y + 1, HC.jacket(0.35, x, y));
  });
  if (arm === "low") {
    sl([[20, top + 2], [21, top + 4], [21, top + 6], [21, top + 8], [21, top + 10]]);
    P.rect(20, top + 12, 2, 2, HC.skin(0.6, 0, 0));
  }
  if (arm === "point") {
    sl([[20, top + 2], [22, top + 2], [24, top + 1], [26, top]]);
    P.rect(27, top - 1, 2, 2, HC.skin(0.6, 0, 0));
  }
  if (arm === "wave") {
    sl([[20, top + 1], [21, top - 1], [22, top - 3], [22, top - 5]]);
    P.rect(21 + (p.w || 0), top - 8, 3, 3, HC.skin(0.6, 0, 0));
  }
  if (arm === "grip") {
    sl([[20, top + 3], [22, top + 4], [24, top + 5]]);
    P.rect(25, top + 5, 2, 2, HC.skin(0.6, 0, 0));
  }
  if (!p.sit && arm !== "wave") P.set(8, top + 9, HC.skin(0.35, 0, 0));
}
var FRAMES = {
  idle0: {},
  idle1: { bob: 1 },
  blink: { blink: 1 },
  talk: { mouth: 1 },
  wave0: { arm: "wave" },
  wave1: { arm: "wave", w: 1 },
  point: { arm: "point", mouth: 1 },
  grip: { arm: "grip", sit: 1, headset: 1 },
  grip1: { arm: "grip", sit: 1, headset: 1, bob: 1 },
  sitTalk: { arm: "grip", sit: 1, headset: 1, mouth: 1 },
  w0: { step: 0 },
  w1: { step: 1, bob: -1 },
  w2: { step: 2 },
  w3: { step: 3, bob: -1 },
  hs: { headset: 1 },
  hsWave: { headset: 1, arm: "wave" }
};
var ATL = null;
function heroAtlas() {
  if (ATL) return ATL;
  const names = Object.keys(FRAMES), n = names.length, P = new PX(FW * n, FH), E = new PX(FW * n, FH);
  names.forEach((k, i) => {
    const p1 = new PX(FW, FH);
    drawHero(p1, null, FRAMES[k]);
    p1.outline(0.3);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const c = p1.get(x, y);
      if (c) P.set(i * FW + x, y, c);
    }
  });
  ATL = { tex: texOf(P.done()), names, n };
  return ATL;
}
function makeHero(o = {}) {
  const A = heroAtlas(), tex = A.tex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(1 / A.n, 1);
  const mesh = billboard(tex, FW * SPX * (o.s || 1), FH * SPX * (o.s || 1), { color: o.tint });
  const root = new THREE5.Group();
  root.add(mesh);
  const sh = blob(0.35 * (o.s || 1), 0.5);
  sh.position.y = 0.012;
  root.add(sh);
  return { root, mesh, frame(name) {
    tex.offset.x = A.names.indexOf(name) / A.n;
  }, face(cam, flip = false) {
    root.rotation.y = Math.atan2(cam.position.x - root.position.x, cam.position.z - root.position.z);
    mesh.scale.x = flip ? -1 : 1;
  } };
}
function world(o = {}) {
  const s = new THREE5.Scene();
  const SK = sky({ top: o.top ?? "#3a6fb0", mid: o.mid ?? "#7fa9d6", hor: o.hor ?? "#f0d6a0", moonDir: new THREE5.Vector3(...o.sunDir || [0.6, 0.25, -1]), moonCol: o.sunCol ?? "#fff3d0", moonI: o.moonI ?? 1.2 });
  s.add(SK.mesh);
  s.userData.sky = SK;
  s.fog = new THREE5.FogExp2(o.fog ?? "#c9b48a", o.fogD ?? 8e-3);
  const sun = new THREE5.DirectionalLight(o.sunLight ?? "#ffe2b0", o.sunI ?? 2.6);
  sun.position.set(20, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
  sun.shadow.bias = -6e-4;
  sun.shadow.normalBias = 0.02;
  s.add(sun, sun.target);
  s.userData.sun = sun;
  s.add(new THREE5.HemisphereLight(o.hemiTop ?? "#a8c4ff", o.hemiBot ?? "#5a4a30", o.hemiI ?? 1.1));
  return s;
}
function field(s, size = 160) {
  const m = pxMat("fieldGrass", 192, 192, (x, y) => {
    const G = ramp(["#2f4a22", "#456b2f", "#5e8a3a", "#7aa648", "#97c25a"]), D = ramp(["#4a3826", "#6a5236", "#8a6c46", "#a8875a"]);
    const k = fbm(x * 0.05, y * 0.05, 7) + (h2(x, y, 3) - 0.5) * 0.2;
    return k > 0.42 ? G(0.3 + fbm(x * 0.25, y * 0.25, 9) * 0.6, x, y) : D(0.3 + fbm(x * 0.25, y * 0.25, 2) * 0.5, x, y);
  });
  return pxBox(s, size, 0.4, size, m, 0, -0.4, 0);
}
var _v = new THREE5.Vector3();
function shoot(scene, pos, look, o = {}) {
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  camera.fov = o.fov ?? 30;
  camera.near = o.near ?? 0.3;
  camera.far = o.far ?? 2e3;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const subj = o.subject || look;
  _v.copy(subj).project(camera);
  const d = post.dof;
  d.scene = scene;
  if (d.ao) d.ao.scene = scene;
  d.focus = pos.distanceTo(subj);
  d.aper = o.aper ?? 2;
  d.maxCoc = o.maxCoc ?? 18;
  d.tiltAmt = o.tilt ?? 16;
  d.tiltC = clamp((_v.y + 1) / 2, 0.2, 0.8);
  d.tiltW = o.tiltW ?? 0.1;
  d.tiltF = 0.25;
  const sun = scene.userData.sun;
  if (sun) {
    const dir = new THREE5.Vector3(...o.sunDir || [20, 30, 14]).normalize();
    sun.target.position.copy(subj);
    sun.position.copy(subj).addScaledVector(dir, 60);
    sun.target.updateMatrixWorld();
  }
  VG.fade.value = o.fade ?? 1;
  renderer.toneMappingExposure = o.expo ?? 1.15;
  post.composer.render();
}

// topics/maus/scene.js
var S = world({ fog: "#cdb894", fogD: 6e-3 });
field(S, 260);
var dirtM = MAT.dirt();
pxBox(S, 12, 0.42, 260, dirtM, 0, -0.4, 0);
var steel = MAT.steel();
var treadL = MAT.tread();
var treadR = treadL.clone();
treadR.map = treadL.map.clone();
treadR.map.needsUpdate = true;
function makeTank(parent) {
  const T = grp(parent, 0, 0, 0);
  for (const [sx, m] of [[-1, treadL], [1, treadR]]) {
    pxBox(T, 0.9, 1.5, 10.2, m, sx * 1.75, 0, 0);
    for (let i = 0; i < 6; i++) {
      const w = pxCyl(T, 0.55, 0.55, 0.25, steel, sx * 2.25, 0.6, -3.6 + i * 1.45, 14);
      w.rotation.z = Math.PI / 2;
    }
  }
  const hull = pxBox(T, 3.6, 1.2, 9.6, steel, 0, 1.3, 0);
  const wallsCut = grp(T, 0, 0, 0);
  for (const sx of [-1, 1]) pxBox(wallsCut, 0.2, 1.2, 9.6, steel, sx * 1.7, 1.3, 0);
  pxBox(wallsCut, 3.6, 1.2, 0.2, steel, 0, 1.3, 4.7);
  pxBox(wallsCut, 3.6, 1.2, 0.2, steel, 0, 1.3, -4.7);
  wallsCut.visible = false;
  const roofF = pxBox(T, 3.6, 0.25, 3.4, steel, 0, 2.5, 3.1), roofR = pxBox(T, 3.6, 0.25, 3, steel, 0, 2.5, -3.3);
  const tur = grp(T, 0, 2.5, -0.2);
  pxBox(tur, 3.3, 1.5, 3.8, steel, 0, 0, 0);
  const gun = pxCyl(tur, 0.17, 0.2, 4.8, steel, 0, 0.85, 4.2, 12);
  gun.rotation.x = Math.PI / 2;
  pxCyl(tur, 0.5, 0.5, 0.5, steel, -0.8, 1.5, -0.6, 12);
  const glacis = pxBox(T, 3.6, 0.9, 0.8, steel, 0, 1.3, 5);
  glacis.rotation.x = -0.6;
  const inside = grp(T, 0, 1.32, 0);
  inside.visible = false;
  pxBox(inside, 3.4, 0.1, 9.4, MAT.panel(), 0, 0, 0);
  pxBox(inside, 0.8, 0.6, 0.8, flat("#3a3d45"), -0.9, 0.1, 3.6);
  pxBox(inside, 3.4, 1.1, 0.12, flat("#596270"), 0, 0.1, 2.4);
  const eng = pxBox(inside, 1.8, 0.9, 2.2, flat("#7a6a5a"), 0, 0.1, 0.5);
  const gen = pxCyl(inside, 0.45, 0.45, 1.4, flat("#4a6aa0"), 0, 0.65, -1.2, 16);
  gen.rotation.x = Math.PI / 2;
  const motors = [-1, 1].map((sx) => {
    const m = pxCyl(inside, 0.35, 0.35, 0.8, flat("#4a6aa0"), sx * 1.1, 0.55, -3.8, 14);
    m.rotation.z = Math.PI / 2;
    return m;
  });
  const cableM = lit("#ffd23f", 0);
  const cables = [-1, 1].map((sx) => {
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.65, -1.9), V(sx * 0.6, 0.7, -2.8), V(sx * 1.1, 0.6, -3.5)]), 20, 0.07, 8), cableM);
    inside.add(c);
    return c;
  });
  const hero = makeHero();
  hero.root.position.set(-0.9, 0.8, 3.6);
  hero.frame("grip");
  inside.add(hero.root);
  const hatchHero = makeHero();
  hatchHero.root.position.set(0.7, 3.6, -0.9);
  T.add(hatchHero.root);
  T.userData = { roofF, roofR, tur, inside, cableM, hero, hatchHero, motors, hull, wallsCut, glacis };
  return T;
}
var tank = makeTank(S);
var carRows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 150);
carRows.castShadow = carRows.receiveShadow = true;
{
  const m = new THREE.Matrix4(), c = new THREE.Color(), cols = ["#e8463c", "#2f5fb3", "#f2c230", "#f4f4f0", "#3f8f5a", "#2a2d33", "#e07bb0"];
  for (let i = 0; i < 150; i++) {
    m.makeTranslation(9 + i % 15 * 2.4, 0.7, -18 + Math.floor(i / 15) * 5);
    carRows.setMatrixAt(i, m);
    carRows.setColorAt(i, c.set(cols[i * 5 % 7]));
  }
}
carRows.visible = false;
S.add(carRows);
var bike = grp(S, 0, 0, 0);
for (const z of [-0.55, 0.55]) {
  const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 16), flat("#1d1d22"));
  w.position.set(0, 0.35, z);
  w.rotation.y = Math.PI / 2;
  bike.add(w);
}
pxBox(bike, 0.08, 0.08, 1.1, flat("#e8463c"), 0, 0.55, 0);
var rider = makeHero({ s: 0.9, tint: "#bfe0ff" });
rider.root.position.set(0, 0.2, 0);
bike.add(rider.root);
bike.visible = false;
var RZ = 70;
var waterM = MAT.water();
waterM.opacity = 0.42;
waterM.depthWrite = false;
var river = pxBox(S, 260, 4.6, 14, waterM, 0, 0, RZ);
river.castShadow = false;
pxBox(S, 260, 0.1, 14, MAT.dirt(), 0, -0.05, RZ);
var bridge = grp(S, 0, 0, RZ);
pxBox(bridge, 8, 0.5, 18, MAT.concrete(), 0, 5, 0);
for (const x of [-3.5, 3.5]) for (const z of [-7.5, 7.5]) pxBox(bridge, 0.6, 5, 0.6, MAT.concrete(), x, 0, z);
for (const x of [-3.8, 3.8]) pxBox(bridge, 0.2, 0.8, 18, MAT.concrete(), x, 5.5, 0);
for (const z of [RZ - 9.5, RZ + 9.5]) pxBox(S, 8, 5, 4, MAT.dirt(), 0, 0, z);
var snorkel = pxCyl(tank, 0.3, 0.3, 9, steel, -0.6, 7.5, -1.2, 12);
snorkel.visible = false;
var junk = grp(S, 0, 0, 30);
var rust = pxMat("rust", 24, 24, (x, y) => ramp(["#3a1c10", "#6a3418", "#94522a", "#b8784a"])(0.45 + (fbm(x * 0.3, y * 0.3, 3) - 0.5) * 0.7, x, y));
pxBox(junk, 2, 1, 4.4, rust, 0, 0.25, 0);
pxBox(junk, 1.8, 0.8, 2.2, rust, 0, 1.25, -0.2);
for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
  const w = pxCyl(junk, 0.38, 0.38, 0.3, flat("#1d1d22"), x, 0.38, z, 12);
  w.rotation.z = Math.PI / 2;
}
var MU = world({ fog: "#2a2622", fogD: 6e-3, top: "#1a1a22", mid: "#2a2a33", hor: "#3a3530", sunI: 0.8, hemiI: 1.2 });
pxBox(MU, 60, 0.2, 40, MAT.concrete(), 0, -0.2, 0);
pxBox(MU, 60, 14, 0.5, MAT.panel(), 0, 0, -14);
for (const x of [-24, -8, 8, 24]) pxBox(MU, 0.6, 14, 30, flat("#3a3530"), x, 0, 0).visible = false;
for (let i = 0; i < 5; i++) {
  pxBox(MU, 60, 0.4, 0.4, flat("#4a443c"), 0, 12, -12 + i * 6);
  const lamp = new THREE.PointLight("#ffcf8a", 40, 18, 1.6);
  lamp.position.set(-10 + i * 5, 10, -2);
  MU.add(lamp);
  const gl = glow("#ffcf8a", 2.2, 1.2);
  gl.position.set(-10 + i * 5, 11, -2);
  MU.add(gl);
}
var tank2 = makeTank(MU);
tank2.userData.hatchHero.root.visible = false;
var visitors = [[-6, 5, "#ffb0b0"], [-4.6, 5.6, "#b0ffb8"], [6, 4.5, "#b0c8ff"]].map(([x, z, c]) => {
  const v = makeHero({ tint: c });
  v.root.position.set(x, 0, z);
  MU.add(v.root);
  return v;
});
pxBox(MU, 3, 1.1, 0.2, lit("#d8b45a", 0.4), 5.5, 0, 6.5);
var blink = (t) => t % 3.1 < 0.12;
function setFrames(t, cam) {
  const U = tank.userData;
  U.hatchHero.frame(blink(t) ? "blink" : Math.floor(t * 2) % 2 ? "hs" : "hsWave");
  U.hatchHero.face(cam);
  U.hero.frame(Math.floor(t * 3) % 2 ? "grip" : "grip1");
  U.hero.face(cam);
}
var V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, U = tank.userData;
  tank.position.set(0, 0, 0);
  tank.rotation.set(0, 0, 0);
  U.roofF.visible = U.roofR.visible = true;
  U.tur.visible = true;
  U.inside.visible = false;
  U.hull.visible = true;
  U.wallsCut.visible = false;
  U.glacis.visible = true;
  U.tur.position.y = 2.5;
  U.hatchHero.root.visible = true;
  U.cableM.emissiveIntensity = 0;
  carRows.visible = false;
  bike.visible = false;
  snorkel.visible = false;
  junk.scale.set(1, 1, 1);
  junk.position.set(0, 0, 30);
  treadL.map.offset.y = treadR.map.offset.y = 0;
  const sky2 = S.userData.sky.u;
  sky2.top.value.set("#3a6fb0");
  sky2.mid.value.set("#7fa9d6");
  sky2.hor.value.set("#f0d6a0");
  let cam, look, subj, o = {};
  if (sc === "intro" || sc === "end") {
    const u = eio(clamp(lt / s.dur));
    cam = new V3(lerp(26, 20, u), lerp(17, 14, u), lerp(30, 24, u));
    look = new V3(0, 2.2, 0);
    subj = new V3(0.7, 4.2, -0.9);
    if (sc === "end") {
      sky2.top.value.set("#2a2f5a");
      sky2.mid.value.set("#c86a5a");
      sky2.hor.value.set("#ffb070");
    }
  } else if (sc === "weight") {
    carRows.visible = true;
    cam = new V3(-14, 34, 52);
    look = new V3(12, 1, 2);
    subj = new V3(4, 1.5, 0);
    o.tilt = 10;
  } else if (sc === "seat" || sc === "engine") {
    U.roofF.visible = U.roofR.visible = false;
    U.hull.visible = false;
    U.wallsCut.visible = true;
    U.glacis.visible = false;
    U.tur.visible = sc !== "engine";
    U.inside.visible = true;
    U.hatchHero.root.visible = false;
    U.tur.position.y = sc === "seat" ? 2.5 + sm(0, 0.4, k) * 1.5 : 2.5;
    if (sc === "engine") {
      U.cableM.emissiveIntensity = sm(0.35, 0.6, k) * 3;
      U.motors.forEach((m) => m.rotation.x = lt * 6 * sm(0.5, 0.7, k));
    }
    cam = sc === "seat" ? new V3(7, 10, 14) : new V3(10, 13, 2);
    look = sc === "seat" ? new V3(-0.9, 1.6, 3.4) : new V3(0, 1.6, -1.5);
    subj = look;
    o.tilt = 8;
  } else if (sc === "turn") {
    tank.rotation.y = eio(k) * 0.9;
    treadL.map.offset.y = lt * 0.6;
    treadR.map.offset.y = lt * 1.3;
    cam = new V3(24, 20, 28);
    look = new V3(0, 1.8, 0);
    subj = new V3(0, 2, 0);
  } else if (sc === "speed") {
    tank.position.z = lt * 3.6 / 3.6 * 1.2;
    treadL.map.offset.y = treadR.map.offset.y = lt;
    bike.visible = true;
    bike.position.set(-3.6, 0, lerp(-8, 16, k));
    rider.frame(Math.floor(lt * 6) % 2 ? "w0" : "w2");
    rider.face(camera);
    cam = new V3(24, 15, tank.position.z + 22);
    look = new V3(-1, 1.6, tank.position.z + 2);
    subj = new V3(-2, 1.5, tank.position.z + 2);
  } else if (sc === "bridge") {
    const under = k > 0.5;
    tank.position.set(under ? -9.5 : 0, 0, under ? RZ + lerp(-4, 4, (k - 0.5) * 2) : RZ - 18 + Math.min(k * 2, 1) * 3);
    snorkel.visible = under;
    treadL.map.offset.y = treadR.map.offset.y = lt * 0.5;
    cam = new V3(-40, 30, RZ + 14);
    look = new V3(-4, 1, RZ - 4);
    subj = new V3(tank.position.x, 1, tank.position.z);
    o.tilt = 8;
    o.fov = 34;
  } else if (sc === "crush") {
    const z = lerp(16, 34, eio(k));
    tank.position.z = z;
    treadL.map.offset.y = treadR.map.offset.y = z * 0.5;
    const over = clamp((z + 5 - 27.8) / 4);
    junk.scale.y = lerp(1, 0.22, sm(0, 0.6, over));
    junk.scale.x = lerp(1, 1.15, over);
    sky2.top.value.set("#2a2f5a");
    sky2.mid.value.set("#c86a5a");
    sky2.hor.value.set("#ffb070");
    const a = lt * 0.2 + 0.6;
    cam = new V3(Math.sin(a) * 22 + 4, 10, 30 + Math.cos(a) * 22);
    look = new V3(0, 1.4, 30);
    subj = new V3(0, 1, 30);
    o.sunDir = [-20, 12, 10];
  } else if (sc === "museum") {
    const u = eio(clamp(lt / s.dur));
    visitors.forEach((v, i) => {
      v.frame(blink(t + i) ? "blink" : "idle0");
      v.face(camera);
    });
    camera.position.set(lerp(22, 18, u), 11, lerp(26, 22, u));
    return shoot(MU, new V3(lerp(22, 18, u), 11, lerp(26, 22, u)), new V3(0, 2, 0), { subject: new V3(0, 2.5, 0), expo: 1.7, tilt: 10 });
  }
  camera.position.copy(cam);
  setFrames(t, camera);
  return shoot(S, cam, look, Object.assign({ subject: subj }, o));
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  if (s.card === "weight") return card(330, `<div class="t">${L("\u0432\u0435\u0441 \xAB\u041C\u0430\u0443\u0441\u0430\xBB", "Maus weight")}</div><div class="v">188 <small>${L("\u0442", "t")}</small></div><div class="n">${L("\u2248 150 \u043B\u0435\u0433\u043A\u043E\u0432\u044B\u0445 \u043C\u0430\u0448\u0438\u043D", "\u2248 150 cars")}</div>`, a);
  if (s.card === "hp") return card(330, `<div class="t">${L("\u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044C", "engine")}</div><div class="v">1080 <small>${L("\u043B.\u0441.", "hp")}</small></div><div class="n">${L("\u043A\u0440\u0443\u0442\u0438\u0442 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440, \u0430 \u043D\u0435 \u0433\u0443\u0441\u0435\u043D\u0438\u0446\u044B", "spins a generator, not the tracks")}</div>`, a);
  if (s.card === "speed") return card(330, `<div class="t">${L("\u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043D\u0430 \u0438\u0441\u043F\u044B\u0442\u0430\u043D\u0438\u044F\u0445", "top speed in trials")}</div><div class="v">13 <small>${L("\u043A\u043C/\u0447", "km/h")}</small></div><div class="n">${L("\u0432\u0435\u043B\u043E\u0441\u0438\u043F\u0435\u0434\u0438\u0441\u0442 \u0431\u044B\u0441\u0442\u0440\u0435\u0435", "a cyclist is faster")}</div>`, a);
  return "";
}
start({ render, cards: cards2, mins: { crush: 7, end: 3.5 }, bubbles: ["#56602f", "#f2c230", "#2a2d33"] });
