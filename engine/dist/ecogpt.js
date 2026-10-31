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

// lemo/kit42.js
import * as THREE3 from "three";
import { RoundedBoxGeometry as RoundedBoxGeometry2 } from "three/addons/geometries/RoundedBoxGeometry.js";

// lemo/tilt_post.js
import * as THREE2 from "three";
import { EffectComposer as EffectComposer2 } from "three/addons/postprocessing/EffectComposer.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { UnrealBloomPass as UnrealBloomPass2 } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass as OutputPass2 } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass as ShaderPass2 } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass as GTAOPass2 } from "three/addons/postprocessing/GTAOPass.js";
var VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
var cocShader = {
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    tAO: { value: null },
    aoAmt: { value: 0 },
    focus: { value: 100 },
    aper: { value: 4 },
    maxCoc: { value: 24 },
    near: { value: 0.1 },
    far: { value: 5e3 },
    srcRes: { value: new THREE2.Vector2(3840, 2160) },
    bandY: { value: 0.5 },
    bandW: { value: 0.08 },
    bandAmp: { value: 30 },
    bandMix: { value: 0.5 },
    bandTilt: { value: 0 },
    bandPow: { value: 1.3 }
  },
  vertexShader: VS,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth, tAO; uniform vec2 srcRes;
    uniform float aoAmt, focus, aper, maxCoc, near, far, bandY, bandW, bandAmp, bandMix, bandTilt, bandPow;
    float cocAt(vec2 uv){
      float d = texture2D(tDepth, uv).x;
      float z = -perspectiveDepthToViewZ(d, near, far);
      return aper * (1.0/focus - 1.0/z);
    }
    void main(){
      vec2 h = .5 / srcRes;
      float cp = .25 * (cocAt(vUv + vec2(-h.x,-h.y)) + cocAt(vUv + vec2(h.x,-h.y)) + cocAt(vUv + vec2(-h.x,h.y)) + cocAt(vUv + vec2(h.x,h.y)));
      // Screen-space blur band: sharp band centred at bandY (can be tilted), grows with distance outside the band; above counts as background (positive), below as foreground (negative)
      float y = vUv.y + bandTilt * (vUv.x - .5);
      float dy = y - bandY;
      float cb = sign(dy) * bandAmp * pow(max(0., abs(dy) - bandW) / .5, bandPow);
      float c = clamp(mix(cp, cb, bandMix), -maxCoc, maxCoc);
      vec3 col = texture2D(tColor, vUv).rgb;   // linear filtering = 2\xD72 box downsample
      if (aoAmt > 0.) col *= mix(1., pow(texture2D(tAO, vUv).r, 1.5), aoAmt);
      gl_FragColor = vec4(col, c);
    }`
};
var gatherShader = {
  uniforms: { tIn: { value: null }, res: { value: new THREE2.Vector2(1920, 1080) }, maxCoc: { value: 24 } },
  vertexShader: VS,
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tIn; uniform vec2 res; uniform float maxCoc;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec4 c0 = texture2D(tIn, vUv); float a0 = abs(c0.a);
      if (maxCoc < .5) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      // Maximum blur around this pixel (the foreground must be able to blur over sharp objects)
      vec3 acc = c0.rgb / (a0*a0 + 1.); float wsum = 1. / (a0*a0 + 1.);
      float rot = h12(gl_FragCoord.xy) * 6.2832;
      const int N = 128;
      for (int i = 0; i < N; i++) {
        float r = maxCoc * sqrt((float(i) + .5) / float(N));
        float th = float(i) * 2.39996 + rot;
        vec2 off = vec2(cos(th), sin(th)) * r / res;
        vec4 s = texture2D(tIn, vUv + off);
        float sa = abs(s.a);
        if (s.a > c0.a) sa = min(sa, max(a0, 0.));   // farther samples must not blur over nearer sharp objects
        float w = smoothstep(r - 1.5, r + .5, sa) / (sa*sa + 1.);
        acc += s.rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.);
    }`
};
var TiltPass = class extends Pass {
  constructor(scene, camera2, w, h, o = {}) {
    super();
    this.scene = scene;
    this.camera = camera2;
    this.needsSwap = true;
    const s = this.s = o.ssaa || 2, W2 = w * s, H2 = h * s;
    this.rt = new THREE2.WebGLRenderTarget(W2, H2, { samples: o.msaa ?? 4, type: THREE2.HalfFloatType, depthTexture: new THREE2.DepthTexture(W2, H2, THREE2.FloatType) });
    this.rt.texture.minFilter = this.rt.texture.magFilter = THREE2.LinearFilter;
    this.rtC = new THREE2.WebGLRenderTarget(w, h, { type: THREE2.HalfFloatType });
    this.coc = new FullScreenQuad(new THREE2.ShaderMaterial(cocShader));
    this.coc.material.uniforms.srcRes.value.set(W2, H2);
    this.gat = new FullScreenQuad(new THREE2.ShaderMaterial(gatherShader));
    this.gat.material.uniforms.res.value.set(w, h);
    this.focus = 100;
    this.aper = 4;
    this.maxCoc = 24;
    this.aoAmt = 0;
    this.band = { y: 0.5, w: 0.08, amp: 30, mix: 0.5, tilt: 0, pow: 1.3 };
    if (o.ao) {
      this.ao = new GTAOPass2(scene, camera2, W2, H2);
      this.ao.output = GTAOPass2.OUTPUT.Off;
      this.ao.updateGtaoMaterial({ radius: o.aoRadius ?? 2, distanceExponent: 1.2, thickness: o.aoThickness ?? 2, scale: o.aoScale ?? 1.6, distanceFallOff: 0.6, samples: 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4 * s, rings: 2, samples: 16 });
      this.aoAmt = o.aoAmt ?? 0.8;
    }
  }
  render(renderer2, writeBuffer) {
    renderer2.setRenderTarget(this.rt);
    renderer2.clear();
    renderer2.render(this.scene, this.camera);
    if (this.ao && this.aoAmt > 0) this.ao.render(renderer2, null, null);
    const u = this.coc.material.uniforms, b = this.band;
    u.tColor.value = this.rt.texture;
    u.tDepth.value = this.rt.depthTexture;
    u.focus.value = this.focus;
    u.aper.value = this.aper;
    u.maxCoc.value = this.maxCoc;
    u.near.value = this.camera.near;
    u.far.value = this.camera.far;
    u.bandY.value = b.y;
    u.bandW.value = b.w;
    u.bandAmp.value = b.amp;
    u.bandMix.value = b.mix;
    u.bandTilt.value = b.tilt;
    u.bandPow.value = b.pow;
    u.tAO.value = this.ao ? this.ao.gtaoMap : null;
    u.aoAmt.value = this.ao ? this.aoAmt : 0;
    renderer2.setRenderTarget(this.rtC);
    this.coc.render(renderer2);
    const g = this.gat.material.uniforms;
    g.tIn.value = this.rtC.texture;
    g.maxCoc.value = this.maxCoc;
    renderer2.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.gat.render(renderer2);
  }
};
var gradeShader = {
  uniforms: { tDiffuse: { value: null }, amt: { value: 0.3 }, fade: { value: 1 }, warm: { value: 0 }, contrast: { value: 0.3 }, sat: { value: 1.35 }, lift: { value: 0 }, tint: { value: new THREE2.Vector3(1, 1, 1) }, expo: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float amt, fade, warm, contrast, sat, lift, expo; uniform vec3 tint;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = max(c.rgb, 0.) * expo;
      vec2 d = vUv - .5; d.x *= 1.3; float v = 1. - amt * smoothstep(.2, .9, length(d));
      c.rgb *= v * fade; c.rgb *= mix(vec3(1.), vec3(1.07, 1., .88), warm) * tint;
      float l = dot(c.rgb, vec3(.2126, .7152, .0722)); c.rgb = max(mix(vec3(l), c.rgb, sat), 0.);
      c.rgb = c.rgb * (1. + contrast) / (1. + contrast * c.rgb / (c.rgb + .5));
      c.rgb += lift * (1. - c.rgb) * .06;
      gl_FragColor = c; }`
};
function makePost(renderer2, scene, camera2, w, h, o = {}) {
  const composer2 = new EffectComposer2(renderer2, new THREE2.WebGLRenderTarget(w, h, { type: THREE2.HalfFloatType }));
  const dof = new TiltPass(scene, camera2, w, h, o);
  const bloom2 = new UnrealBloomPass2(new THREE2.Vector2(w, h), 0.25, 0.6, 1.2);
  const grade = new ShaderPass2(gradeShader);
  const out = new OutputPass2();
  composer2.addPass(dof);
  composer2.addPass(bloom2);
  composer2.addPass(grade);
  composer2.addPass(out);
  return { composer: composer2, dof, bloom: bloom2, grade };
}

// lemo/kit42.js
renderer.toneMapping = THREE3.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE3.PCFSoftShadowMap;
var dummy = new THREE3.Scene();
var post = makePost(renderer, dummy, camera, W, H, { ssaa: 1, msaa: 4, ao: true, aoRadius: 2.5, aoThickness: 3, aoScale: 1.4, aoAmt: 0.75 });
post.bloom.strength = 0.2;
post.bloom.threshold = 1.1;
post.bloom.radius = 0.5;
var G = post.grade.uniforms;
G.sat.value = 1.45;
G.contrast.value = 0.4;
G.warm.value = 0.32;
G.amt.value = 0.35;
var mc = /* @__PURE__ */ new Map();
var M = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  if (!mc.has(k)) mc.set(k, new THREE3.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.82 }, o)));
  return mc.get(k);
};
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE3.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function rbox(parent, w, h, d, c, x = 0, y = 0, z = 0, ry = 0, r = null) {
  const rr = r ?? Math.min(0.12, Math.min(w, h, d) * 0.12);
  return mesh(new RoundedBoxGeometry2(w, h, d, 2, rr), typeof c === "string" || typeof c === "number" ? M(c) : c, parent, x, y + h / 2, z, ry);
}
var grp = (parent, x = 0, y = 0, z = 0, ry = 0) => {
  const g = new THREE3.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  if (parent) parent.add(g);
  return g;
};
var facadeCache = /* @__PURE__ */ new Map();
function facadeMat(wall = "#e9dfcc", win = "#24323f", seed = 1, lit = 0) {
  const k = wall + win + seed + lit;
  if (facadeCache.has(k)) return facadeCache.get(k);
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = wall;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(0,0,0,.08)";
  g.fillRect(0, 120, 128, 8);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const h = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed) * 43758.5;
    const r = h - Math.floor(h);
    g.fillStyle = "rgba(0,0,0,.18)";
    g.fillRect(x * 32 + 6, y * 32 + 7, 20, 20);
    g.fillStyle = lit && r > 0.55 ? "#ffd37a" : r > 0.8 ? "#3c5163" : win;
    g.fillRect(x * 32 + 7, y * 32 + 8, 18, 18);
    g.fillStyle = "rgba(255,255,255,.18)";
    g.fillRect(x * 32 + 7, y * 32 + 8, 18, 3);
  }
  const t = new THREE3.CanvasTexture(c);
  t.colorSpace = THREE3.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE3.RepeatWrapping;
  t.anisotropy = 4;
  const m = new THREE3.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: lit ? new THREE3.Color("#ffb04a") : new THREE3.Color(0), emissiveMap: lit ? t : null, emissiveIntensity: lit ? 0.25 : 0 });
  facadeCache.set(k, m);
  return m;
}
function scaledBox(w, h, d, bay = 12) {
  const g = new THREE3.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i));
    const sx = ax > 0.5 ? d : az > 0.5 ? w : w;
    uv.setXY(i, uv.getX(i) * sx / bay, uv.getY(i) * (n.getY(i) !== 0 ? d / bay : h / bay));
  }
  return g;
}
function building(parent, w, d, h, x, z, o = {}) {
  const g = grp(parent, x, 0, z, o.ry || 0);
  const fm = facadeMat(o.wall || "#e9dfcc", o.win || "#24323f", o.seed || 1, o.lit || 0);
  const roofM = M(o.roof || "#8f8a80");
  const b = new THREE3.Mesh(scaledBox(w, h, d, o.bay || 12), [fm, fm, roofM, roofM, fm, fm]);
  b.position.y = h / 2;
  b.castShadow = b.receiveShadow = true;
  g.add(b);
  rbox(g, w + 0.6, 0.6, d + 0.6, o.trim || "#d8cdb8", 0, h, 0);
  if (o.clutter !== false) {
    rbox(g, 2.2, 1.4, 2.2, "#a9a49a", w * 0.2, h + 0.6, -d * 0.15);
    rbox(g, 1.4, 1, 3, "#cfcac0", -w * 0.25, h + 0.6, d * 0.2);
  }
  if (o.awning) rbox(g, w * 0.8, 0.3, 1.6, o.awning, 0, 3.4, d / 2 + 0.8);
  return g;
}
function tree(parent, x, z, s = 1, c = "#3f8a3a") {
  const g = grp(parent, x, 0, z);
  mesh(new THREE3.CylinderGeometry(0.25 * s, 0.35 * s, 2.2 * s, 8), M("#6b4a2e"), g, 0, 1.1 * s, 0);
  mesh(new THREE3.IcosahedronGeometry(1.7 * s, 1), M(c, { flatShading: true }), g, 0, 3 * s, 0);
  mesh(new THREE3.IcosahedronGeometry(1.1 * s, 1), M(c, { flatShading: true }), g, 0.7 * s, 3.9 * s, 0.3 * s);
  return g;
}
function person(parent, x, z, top = "#e8463c", o = {}) {
  const g = grp(parent, x, o.y || 0, z, o.ry || 0), s = o.s || 1.25;
  const legs = M(o.legs || "#2a2d33"), skin = M(o.skin || "#e9b48c");
  const lL = mesh(new THREE3.CapsuleGeometry(0.14 * s, 0.5 * s, 3, 8), legs, g, -0.14 * s, 0.4 * s, 0), lR = mesh(new THREE3.CapsuleGeometry(0.14 * s, 0.5 * s, 3, 8), legs, g, 0.14 * s, 0.4 * s, 0);
  const body = mesh(new THREE3.CapsuleGeometry(0.32 * s, 0.55 * s, 4, 10), M(top), g, 0, 1.2 * s, 0);
  const aL = mesh(new THREE3.CapsuleGeometry(0.1 * s, 0.45 * s, 3, 8), M(top), g, -0.42 * s, 1.2 * s, 0), aR = mesh(new THREE3.CapsuleGeometry(0.1 * s, 0.45 * s, 3, 8), M(top), g, 0.42 * s, 1.2 * s, 0);
  const head = mesh(new THREE3.SphereGeometry(0.27 * s, 14, 10), skin, g, 0, 1.92 * s, 0);
  if (o.hair !== false) mesh(new THREE3.SphereGeometry(0.28 * s, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M(o.hair || "#2b1d18"), g, 0, 1.95 * s, -0.02 * s);
  g.userData = { lL, lR, aL, aR, body, head, s };
  return g;
}
function posePerson(p, o = {}) {
  const U = p.userData, s = U.s, w = o.walk ? Math.sin(o.walk) : 0;
  U.lL.rotation.x = w * 0.5;
  U.lR.rotation.x = -w * 0.5;
  const up = o.armsUp || 0;
  U.aL.rotation.z = -up * 2.6 - 0.1;
  U.aR.rotation.z = up * 2.6 + 0.1;
  U.aL.position.y = U.aR.position.y = (1.2 + up * 0.5) * s;
  U.aL.position.x = -(0.42 + up * 0.05) * s;
  U.aR.position.x = (0.42 + up * 0.05) * s;
  if (o.wave) {
    U.aR.rotation.z = 2.4 + Math.sin(o.wave) * 0.4;
    U.aR.position.y = 1.65 * s;
  }
  if (o.bob) p.position.y = (o.base || 0) + Math.abs(Math.sin(o.bob)) * 0.15;
}
function ground(parent, c = "#5fa043", size = 600, y = 0) {
  const m = mesh(new THREE3.BoxGeometry(size, 2, size), M(c), parent, 0, y - 1, 0);
  m.castShadow = false;
  return m;
}
function water(parent, w, d, x = 0, y = 0, z = 0, c = "#2f8fb6") {
  const g = grp(parent, x, y, z);
  mesh(new THREE3.BoxGeometry(w, 1, d), M("#1f5e78"), g, 0, -1.6, 0).castShadow = false;
  const s = mesh(new THREE3.PlaneGeometry(w, d), new THREE3.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.84 }), g, 0, 0, 0);
  s.rotation.x = -Math.PI / 2;
  s.castShadow = false;
  return g;
}
function world(o = {}) {
  const s = new THREE3.Scene();
  s.background = new THREE3.Color(o.sky || "#9cc3e6");
  if (o.fog !== false) s.fog = new THREE3.Fog(o.sky || "#9cc3e6", o.fogNear || 260, o.fogFar || 900);
  const sun2 = new THREE3.DirectionalLight(o.sunCol || "#fff1d6", o.sunI ?? 3);
  sun2.position.set(...o.sunDir || [-60, 90, 50]);
  sun2.castShadow = true;
  sun2.shadow.mapSize.set(2048, 2048);
  const R = o.shadowR || 90;
  Object.assign(sun2.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 600 });
  sun2.shadow.bias = -4e-4;
  sun2.shadow.normalBias = 0.03;
  s.add(sun2, sun2.target);
  s.add(new THREE3.HemisphereLight(o.hemiTop || "#bcd6ff", o.hemiBot || "#7a6040", o.hemiI ?? 1.1));
  s.userData.sun = sun2;
  return s;
}
var _v = new THREE3.Vector3();
function shoot(scene, pos, look, o = {}) {
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(look);
  camera.fov = o.fov ?? 28;
  camera.near = o.near ?? 1;
  camera.far = o.far ?? 3e3;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const subj = o.subject || look;
  _v.copy(subj).project(camera);
  const d = post.dof;
  d.scene = scene;
  if (d.ao) d.ao.scene = scene;
  d.focus = pos.distanceTo(subj);
  d.aper = o.aper ?? 30;
  d.maxCoc = o.maxCoc ?? 26;
  Object.assign(d.band, { y: clamp((_v.y + 1) / 2, 0.2, 0.8), w: o.bandW ?? 0.075, amp: o.bandAmp ?? 26, mix: o.bandMix ?? 0.6, tilt: 0, pow: 1.3 });
  const sun2 = scene.userData.sun;
  if (sun2 && o.sunFollow !== false) {
    const dir = sun2.position.clone().sub(sun2.target.position).normalize();
    sun2.target.position.copy(subj);
    sun2.position.copy(subj).addScaledVector(dir, 250);
    sun2.target.updateMatrixWorld();
  }
  G.expo.value = o.expo ?? 1;
  G.fade.value = o.fade ?? 1;
  post.composer.render();
}

// topics/ecogpt/scene.js
var S = world({ shadowR: 120, fogNear: 300, fogFar: 1200 });
var hemi = S.children.find((o) => o.isHemisphereLight);
var sun = S.userData.sun;
var rnd2 = (i, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var V3 = THREE.Vector3;
ground(S, "#86bf62", 1600);
var plaza = mesh(new THREE.BoxGeometry(70, 0.3, 50), M("#d9d2c3"), S, 0, 0.15, 10);
plaza.castShadow = false;
var cols = ["#e9dfcc", "#d9c2a4", "#c7d3dc", "#e6d2c8", "#d6d9c4", "#f0d9b5"];
[[-50, -10], [-50, 20], [50, -10], [50, 22], [-30, 48], [30, 48], [-5, 52]].forEach(([x, z], i) => building(S, 14, 12, 8 + i % 3 * 3, x, z, { wall: cols[i % 6], seed: i + 3 }));
[[-62, 40], [62, 38], [-40, -36], [40, -36]].forEach(([x, z], i) => tree(S, x, z, 1.1, "#3f8a3a"));
var HQ = grp(S, 0, 0, -12);
rbox(HQ, 22, 7, 14, "#8d9196", 0, 0, 0);
for (let i = 0; i < 5; i++) rbox(HQ, 2.6, 1.4, 0.3, "#3c4248", -8 + i * 4, 4, 7);
var shell = grp(HQ);
rbox(shell, 23, 7.6, 15, "#5cae62", 0, 0, 0);
rbox(shell, 23.6, 0.6, 15.6, "#2f8a3e", 0, 7.6, 0);
var leaf = grp(shell, 0, 9.4, 0);
for (const s of [-1, 1]) {
  const m = mesh(new THREE.SphereGeometry(2.2, 18, 12), M("#7ad06a"), leaf, s * 1.3, 1.2, 0);
  m.scale.set(0.55, 1.15, 0.22);
  m.rotation.z = -s * 0.55;
}
rbox(leaf, 0.25, 2.4, 0.25, "#2f6b2a", 0, -0.6, 0);
var doorM = M("#ffe7a8", { emissive: "#ffcf6a", emissiveIntensity: 0 });
rbox(shell, 4, 4, 0.3, doorM, 0, 0, 7.6);
var solar = grp(S, -26, 0, -20);
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
  const p = rbox(solar, 4, 0.2, 2.6, M("#22406e", { roughness: 0.3, metalness: 0.3 }), c * 4.6 - 7, 1.2, r * 3.6 - 3.6);
  p.rotation.x = -0.45;
  rbox(solar, 0.25, 1.2, 0.25, "#9aa0a6", c * 4.6 - 7, 0, r * 3.6 - 3.6);
}
var turbines = [[26, -24], [36, -16]].map(([x, z]) => {
  const g = grp(S, x, 0, z);
  mesh(new THREE.CylinderGeometry(0.35, 0.6, 16, 10), M("#f2f2ee"), g, 0, 8, 0);
  const hub = grp(g, 0, 16, 0.8);
  for (let b = 0; b < 3; b++) {
    const bl = rbox(hub, 0.7, 6.5, 0.2, "#f2f2ee", 0, 0, 0);
    bl.position.set(0, 0, 0);
    bl.geometry.translate(0, 3.25, 0);
    bl.position.y = 0;
    bl.rotation.z = b * Math.PI * 2 / 3;
  }
  return hub;
});
var boss = person(S, 0, -3.6, "#1d1d22", { s: 1.35, legs: "#1d1d22", hair: "#3a2a20" });
rbox(S, 3, 1, 2, "#2f8a3e", 0, 0, -2.4);
var coinM = M("#f2c230", { metalness: 0.5, roughness: 0.35 });
var coins = [];
for (let i = 0; i < 60; i++) {
  const ring = Math.floor(i / 12), a = i % 12 / 12 * Math.PI * 2 + ring;
  const c = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.32, 24), coinM, S, 14 + Math.cos(a) * (1.4 + ring * 0.2) * (i % 3 ? 1 : 0.2), 0, 2 + Math.sin(a) * (1.4 + ring * 0.2) * (i % 3 ? 1 : 0.2));
  c.userData.y = 0.16 + Math.floor(i / 3) * 0.32;
  c.userData.i = i;
  coins.push(c);
}
var LX = -70;
var LZ = -50;
var lake = water(S, 40, 30, LX, 1.2, LZ);
for (const [w, d, x, z] of [[43, 1.5, 0, 15.75], [43, 1.5, 0, -15.75], [1.5, 30, 20.75, 0], [1.5, 30, -20.75, 0]]) rbox(S, w, 1.6, d, "#bdb7ad", LX + x, 0, LZ + z);
var lakeBed = mesh(new THREE.BoxGeometry(40, 0.2, 30), M("#b49a6a"), S, LX, 0.3, LZ);
lakeBed.castShadow = false;
var pipe = mesh(new THREE.CylinderGeometry(0.8, 0.8, 50, 14), M("#9aa0a6"), S, -36, 2.6, -36);
pipe.rotation.z = Math.PI / 2;
pipe.rotation.y = -0.45;
var phone = grp(S, -18, 0, 16, 0.35);
rbox(phone, 7, 13, 0.8, "#16181d", 0, 1, 0, 0, 0.6);
var scr = rbox(phone, 6, 11, 0.2, M("#bff0c0", { emissive: "#7ad06a", emissiveIntensity: 0.25 }), 0, 2, 0.45);
var pleaf = grp(phone, 0, 7.5, 0.7);
for (const s of [-1, 1]) {
  const m = mesh(new THREE.SphereGeometry(1.2, 16, 10), M("#2f8a3e"), pleaf, s * 0.7, 0, 0);
  m.scale.set(0.55, 1.15, 0.2);
  m.rotation.z = -s * 0.55;
}
rbox(phone, 0.6, 2, 0.6, "#16181d", 0, -1, 0);
var NZ = -130;
var news = grp(S, 0, 0, NZ);
rbox(news, 36, 0.4, 22, "#c9b89a", 0, 0, 0);
rbox(news, 36, 9, 0.6, "#e6d2c8", 0, 0, -11);
rbox(news, 0.6, 9, 22, "#e6d2c8", -18, 0, 0);
for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
  const x = -12 + c * 8, z = -4 + r * 7;
  rbox(news, 4, 1.4, 2.2, "#8a6a48", x, 0.4, z);
  rbox(news, 1.6, 1.1, 0.2, "#1d1d22", x, 1.8, z - 0.6);
}
var paper = grp(S, 0, 0, NZ + 4);
rbox(paper, 9, 0.12, 12, "#f7f3e8", 0, 0, 0);
for (let i = 0; i < 6; i++) rbox(paper, 5, 0.05, 0.3, "#9aa0a6", 0, 0.12, -3 + i * 1.1);
var stamp = rbox(paper, 4.2, 0.1, 1.6, M("#e8463c"), 0, 0.18, 3);
var FX = 170;
var FZ = 0;
var fin = grp(S, FX, 0, FZ);
mesh(new THREE.BoxGeometry(110, 0.3, 90), M("#f4f6f8"), fin, 0, 0.15, 0).castShadow = false;
rbox(fin, 30, 8, 16, "#a9aeb4", 0, 0, 0);
rbox(fin, 30.6, 0.6, 16.6, "#7d8389", 0, 8, 0);
var rackM = M("#2a2d33");
var ledM = M("#7ad0ff", { emissive: "#4ab8ff", emissiveIntensity: 0.9 });
for (let i = 0; i < 6; i++) {
  rbox(fin, 3, 5, 1.6, rackM, -12.5 + i * 5, 0.3, 8.6);
  for (let j = 0; j < 4; j++) rbox(fin, 2.2, 0.18, 0.1, ledM, -12.5 + i * 5, 1 + j * 1.1, 9.45);
}
[[-30, -20], [-36, 10], [30, -24], [38, 14], [-24, 30], [26, 32], [-44, -6], [44, -2]].forEach(([x, z], i) => {
  const g = grp(fin, x, 0, z);
  mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 8), M("#5a3a22"), g, 0, 1, 0);
  mesh(new THREE.ConeGeometry(2.4, 5.5, 9), M("#2f5a3a", { flatShading: true }), g, 0, 4.5, 0);
  mesh(new THREE.ConeGeometry(1.7, 3.2, 9), M("#f4f6f8"), g, 0, 6.6, 0);
});
var AX = -170;
var AZ = 0;
var afr = grp(S, AX, 0, AZ);
mesh(new THREE.BoxGeometry(110, 0.3, 90), M("#d9a868"), afr, 0, 0.15, 0).castShadow = false;
function acacia(p, x, z, s = 1) {
  const g = grp(p, x, 0, z);
  mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 4 * s, 8), M("#5a3a22"), g, 0, 2 * s, 0);
  const c = mesh(new THREE.CylinderGeometry(3 * s, 2.6 * s, 0.9 * s, 12), M("#6c9a3a", { flatShading: true }), g, 0, 4.3 * s, 0);
  return g;
}
[[-36, -26], [34, -30], [-40, 24], [40, 26]].forEach(([x, z]) => acacia(afr, x, z, 1.3));
var saplings = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
  const t = tree(afr, -24 + c * 6, -12 + r * 6, 0.55, "#4f9a3a");
  t.userData.d = (c + r * 2) / 26;
  saplings.push(t);
}
var forest = [];
for (let i = 0; i < 90; i++) {
  const a = rnd2(i, 1) * Math.PI * 2, r = 30 + rnd2(i, 2) * 60;
  const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r;
  if (Math.abs(x) < 38 && z > -6 && z < 58) continue;
  const t = tree(S, x, z, 0.8 + rnd2(i, 3) * 0.5, ["#3f8a3a", "#4f9a3a", "#2f7a3a"][i % 3]);
  t.userData.d = r / 90;
  forest.push(t);
}
var TOPS = ["#3f8f5a", "#5fbf5a", "#2f7a3a", "#7ad06a"];
var SIGN = M("#f4f4f0");
var SIGNG = M("#7ad06a");
var SIGNR = M("#e8463c");
var N = 220;
var P = [];
for (let i = 0; i < N; i++) {
  const p = person(S, 0, 0, TOPS[i % 4], { hair: ["#2b1d18", "#5a3a22", "#c99a5b", "#1d1d22"][i % 4] });
  const st = grp(p, 0.6, 0, 0);
  rbox(st, 0.12, 2.6, 0.12, "#6b4a2e", 0, 1.2, 0);
  const bd = rbox(st, 1.6, 1.1, 0.1, SIGNG, 0, 3.4, 0);
  p.userData.sign = st;
  p.userData.board = bd;
  P.push(p);
}
var JT = ["#2f5fb3", "#f4f4f0", "#c7d3dc", "#e8463c"];
var press = Array.from({ length: 10 }, (_, i) => person(S, 0, 0, JT[i % 4], { hair: ["#2b1d18", "#c99a5b"][i % 2] }));
var hide = () => {
  for (const p of P) p.position.set(0, -999, 0);
  for (const p of press) p.position.set(0, -999, 0);
};
function crowd(i0, n, cx, cz, w, d, fx, fz, t, o = {}) {
  const cols2 = Math.max(1, Math.round(Math.sqrt(n * w / d))), rows = Math.ceil(n / cols2), sx = w / cols2, sz = d / rows;
  for (let j = 0; j < n; j++) {
    const p = P[i0 + j];
    if (!p) break;
    const c = j % cols2, r = Math.floor(j / cols2);
    const x = cx - w / 2 + (c + 0.5) * sx + (rnd2(i0 + j, 1) - 0.5) * sx * 0.35, z = cz - d / 2 + (r + 0.5) * sz + (rnd2(i0 + j, 2) - 0.5) * sz * 0.35;
    p.position.set(x, o.y ?? 0.3, z);
    p.rotation.y = Math.atan2(fx - x, fz - z);
    const sg = !!(o.signs && j % 3 === 0);
    p.userData.sign.visible = sg;
    if (sg) p.userData.board.material = o.red && rnd2(j, 7) < o.red ? SIGNR : SIGNG;
    posePerson(p, o.cheer ? { armsUp: 0.4 + 0.4 * Math.abs(Math.sin(t * 4 + j)) } : o.wave && j % 4 === 0 ? { wave: t * 3 + j } : {});
  }
  return i0 + n;
}
function sky(dusk) {
  S.background.set(dusk ? "#f2a27a" : "#9cc3e6");
  S.fog.color.set(dusk ? "#f2a27a" : "#9cc3e6");
  sun.color.set(dusk ? "#ffb070" : "#fff1d6");
  sun.intensity = dusk ? 2.2 : 3;
  hemi.color.set(dusk ? "#ffe0cc" : "#bcd6ff");
  hemi.intensity = dusk ? 0.9 : 1.1;
  doorM.emissiveIntensity = dusk ? 1.6 : 0;
}
function setCoins(n) {
  coins.forEach((c, i) => {
    const v = clamp(n - i);
    c.visible = v > 0;
    c.position.y = c.userData.y + (1 - eio(v)) * 6;
  });
}
function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  hide();
  sky(0);
  shell.position.y = 0;
  setCoins(0);
  boss.position.set(0, 0.9, -3.6);
  boss.rotation.y = 0;
  posePerson(boss, {});
  turbines.forEach((h2, i) => h2.rotation.z = t * 0.6 + i);
  lake.position.y = 1.2;
  scr.material.emissiveIntensity = 0.25;
  paper.position.y = -50;
  stamp.visible = false;
  saplings.forEach((p) => p.scale.setScalar(1));
  forest.forEach((p) => p.scale.setScalar(1e-3));
  const BP = new V3(0, 2.4, -3.6);
  if (sc === "hook") {
    let i = crowd(0, 120, 0, 20, 52, 26, 0, -4, t, { signs: true, cheer: true });
    posePerson(boss, { wave: t * 3 });
    return shoot(S, new V3(lerp(34, 22, u), lerp(26, 18, u), lerp(58, 42, u)), new V3(0, 3, 4), { subject: BP, fov: 32, aper: 12 });
  }
  if (sc === "panic") {
    lake.position.y = lerp(1.2, 0.45, u);
    crowd(0, 70, LX + 30, LZ + 26, 34, 14, LX, LZ, t, { signs: true });
    const c = new V3(LX + 8, 2, LZ + 2);
    return shoot(S, new V3(LX + lerp(40, 34, u), lerp(52, 46, u), LZ + lerp(70, 62, u)), new V3(LX + 6, 0, LZ + 4), { subject: new V3(LX + 6, 0, LZ + 4), fov: 34, aper: 16, bandW: 0.12 });
  }
  if (sc === "app") {
    scr.material.emissiveIntensity = 0.25 + sm(0.1, 0.5, k) * 1.2;
    crowd(0, 90, 6, 22, 40, 20, -18, 16, t, { wave: true });
    return shoot(S, new V3(lerp(8, 2, u), lerp(12, 10, u), lerp(46, 40, u)), new V3(-16, 7, 16), { subject: new V3(-14, 6, 18), fov: 30, aper: 12 });
  }
  if (sc === "promise") {
    crowd(0, 60, 0, 24, 44, 14, 0, -6, t, { cheer: true });
    forest.forEach((p, i) => {
      if (i % 3) return;
      const a2 = clamp((k - 0.3 - p.userData.d * 0.5) / 0.2);
      p.scale.setScalar(Math.max(1e-3, eio(a2) * 0.8));
    });
    return shoot(S, new V3(lerp(-56, -44, u), 40, lerp(52, 44, u)), new V3(-6, 2, -14), { subject: new V3(-14, 2, -18), fov: 32, aper: 16, bandW: 0.1 });
  }
  if (sc === "money") {
    setCoins(lerp(0, 60, sm(0.05, 0.85, k)));
    boss.rotation.y = 0.9;
    posePerson(boss, { armsUp: 0.3 });
    crowd(0, 50, 0, 26, 40, 12, 0, -6, t, {});
    return shoot(S, new V3(lerp(30, 24, u), 12, lerp(18, 14, u)), new V3(10, 2.5, -1), { subject: new V3(13, 2, 1), fov: 30, aper: 10 });
  }
  if (sc === "nda") {
    press.forEach((p, i) => {
      const r2 = Math.floor(i / 4) % 2, c = i % 4;
      p.position.set(-12 + c * 8, 0.4, NZ - 2.2 + r2 * 7);
      p.rotation.y = Math.PI;
      posePerson(p, i % 3 === 0 ? { wave: t * 2 + i } : {});
    });
    paper.position.set(lerp(30, 0, eio(clamp(lt / 1.2))), 1.2, NZ + 12);
    paper.rotation.set(0, 0, 0);
    stamp.visible = lt > s.vo0 - s.start + s.vd * 0.62;
    return shoot(S, new V3(lerp(4, 2, u), lerp(26, 22, u), NZ + lerp(32, 28, u)), new V3(0, 1, NZ + 6), { subject: new V3(0, 1.2, NZ + 12), fov: 32, aper: 10 });
  }
  if (sc === "servers") {
    press.forEach((p, i) => {
      const z = lerp(36, 16, u) + i % 2 * 1.6;
      p.position.set(FX - 7 + i * 1.6, 0.3, FZ + z + i % 3 * 0.8);
      p.rotation.y = Math.PI;
      posePerson(p, { walk: t * 6 + i });
    });
    return shoot(S, new V3(FX + lerp(34, 26, u), 22, FZ + lerp(66, 56, u)), new V3(FX, 3, FZ + 10), { subject: new V3(FX - 1, 1.5, FZ + 24), fov: 32, aper: 14 });
  }
  if (sc === "scam") {
    shell.position.y = eio(sm(0.05, 0.5, k)) * 14;
    crowd(0, 120, 0, 22, 52, 24, 0, -12, t, { signs: true, red: sm(0.3, 0.8, k) });
    return shoot(S, new V3(lerp(20, 16, u), lerp(22, 26, u), lerp(42, 46, u)), new V3(0, 4, -8), { subject: new V3(0, 4, -12), fov: 32, aper: 14 });
  }
  if (sc === "trees") {
    saplings.forEach((p) => {
      const a2 = clamp(k * 1.3 - p.userData.d);
      p.scale.setScalar(lerp(0.45, 1, eio(a2)));
    });
    let i = 0;
    for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 8; c++) {
      const p = P[i++];
      p.position.set(AX - 21 + c * 6, 0.3, AZ - 9 + r2 * 6);
      p.rotation.y = -0.6;
      p.userData.sign.visible = false;
      posePerson(p, { armsUp: 0.15 + 0.15 * Math.abs(Math.sin(t * 2 + i)) });
    }
    return shoot(S, new V3(AX + lerp(30, 24, u), 26, AZ + lerp(46, 40, u)), new V3(AX, 1, AZ), { subject: new V3(AX + 2, 1.2, AZ + 2), fov: 32, aper: 14 });
  }
  sky(1);
  setCoins(60);
  posePerson(boss, { armsUp: 0.3 });
  forest.forEach((p) => {
    const a2 = clamp(((sc === "end" ? 1 : k * 1.4) - p.userData.d * 0.8) / 0.5);
    p.scale.setScalar(Math.max(1e-3, eio(a2)));
  });
  crowd(0, 80, 0, 24, 48, 18, 0, -6, t, {});
  if (sc === "end") return shoot(S, new V3(-20, 120, 150), new V3(0, 0, -10), { subject: new V3(0, 3, -10), fov: 30, aper: 24, bandW: 0.12 });
  const r = lerp(55, 140, u), h = lerp(24, 75, u), a = lerp(0.9, 1.15, u);
  return shoot(S, new V3(Math.cos(a) * r, h, -12 + Math.sin(a) * r), new V3(0, 3, -10), { subject: new V3(0, 3, -10), fov: 32, aper: lerp(10, 24, u), bandW: lerp(0.075, 0.1, u) });
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  if (s.card === "money") return card(330, `<div class="t">EcoGPT Pro</div><div class="v">$10 <small>${L("/\u043C\u0435\u0441", "/mo")}</small></div><div class="n">${L("ChatGPT Plus \u2014 $20 \xB7 1 \u043C\u043B\u043D \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0439", "ChatGPT Plus \u2014 $20 \xB7 1M downloads")}</div>`, a);
  if (s.scene === "nda") return card(330, `<div class="t">${L("\u043E\u0442\u0432\u0435\u0442 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438", "the company's answer")}</div><div class="v" style="font-size:64px">${L("\u041F\u041E\u0414\u041F\u0418\u0428\u0418\u0422\u0415 NDA", "SIGN AN NDA")}</div><div class="n">VRT NWS, 2026</div>`, sm(0.4, 0.7, k));
  if (s.scene === "scam") return card(330, `<div class="t">${L("\u0432 \u043E\u0442\u0437\u044B\u0432\u0430\u0445", "in the reviews")}</div><div class="v" style="color:#ff4b5c">${L("\u0421\u041A\u0410\u041C?", "SCAM?")}</div>`, sm(0.62, 0.8, k));
  return "";
}
start({ render, cards: cards2, mins: { hook: 3.2, scam: 4, wow: 5, end: 4 }, bubbles: ["#4fb35a", "#f2c230", "#1d1d22"] });
