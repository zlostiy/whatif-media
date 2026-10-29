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
var post = makePost(renderer, dummy, camera, W, H, { ssaa: GPU ? 2 : 1, ao: true, aoRadius: 2.5, aoThickness: 3, aoScale: 1.4, aoAmt: 0.75 });
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
function car(parent, c = "#d83a2e", x = 0, z = 0, ry = 0) {
  const g = grp(parent, x, 0, z, ry);
  rbox(g, 2, 1, 4.4, c, 0, 0.35, 0, 0, 0.3);
  rbox(g, 1.8, 0.75, 2.2, c, 0, 1.25, -0.2, 0, 0.25);
  rbox(g, 1.84, 0.5, 2, M("#1b2a36", { roughness: 0.15, metalness: 0.4 }), 0, 1.35, -0.2, 0, 0.2);
  for (const [wx, wz] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.4], [0.9, -1.4]]) {
    const wh = mesh(new THREE3.CylinderGeometry(0.38, 0.38, 0.3, 14), M("#1d1d22"), g, wx, 0.38, wz);
    wh.rotation.z = Math.PI / 2;
  }
  rbox(g, 0.4, 0.2, 0.1, "#fff3b0", -0.6, 0.75, 2.2);
  rbox(g, 0.4, 0.2, 0.1, "#fff3b0", 0.6, 0.75, 2.2);
  return g;
}
function road(parent, x0, z0, x1, z1, w = 7, o = {}) {
  const dx = x1 - x0, dz = z1 - z0, L2 = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
  const g = grp(parent, (x0 + x1) / 2, 0, (z0 + z1) / 2, a);
  mesh(new THREE3.BoxGeometry(w, 0.2, L2), M("#3e4046", { roughness: 0.95 }), g, 0, 0.1, 0).castShadow = false;
  if (o.marks !== false) for (let s = -L2 / 2 + 2; s < L2 / 2 - 2; s += 6) mesh(new THREE3.BoxGeometry(0.25, 0.05, 3), M("#f2f0e8"), g, 0, 0.22, s).castShadow = false;
  if (o.walk) for (const sx of [-1, 1]) mesh(new THREE3.BoxGeometry(2.2, 0.35, L2), M("#bdb7ad"), g, sx * (w / 2 + 1.1), 0.175, 0);
  return g;
}
function ground(parent, c = "#5fa043", size = 600, y = 0) {
  const m = mesh(new THREE3.BoxGeometry(size, 2, size), M(c), parent, 0, y - 1, 0);
  m.castShadow = false;
  return m;
}
function world(o = {}) {
  const s = new THREE3.Scene();
  s.background = new THREE3.Color(o.sky || "#9cc3e6");
  if (o.fog !== false) s.fog = new THREE3.Fog(o.sky || "#9cc3e6", o.fogNear || 260, o.fogFar || 900);
  const sun = new THREE3.DirectionalLight(o.sunCol || "#fff1d6", o.sunI ?? 3);
  sun.position.set(...o.sunDir || [-60, 90, 50]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const R = o.shadowR || 90;
  Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 600 });
  sun.shadow.bias = -4e-4;
  sun.shadow.normalBias = 0.03;
  s.add(sun, sun.target);
  s.add(new THREE3.HemisphereLight(o.hemiTop || "#bcd6ff", o.hemiBot || "#7a6040", o.hemiI ?? 1.1));
  s.userData.sun = sun;
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
  const sun = scene.userData.sun;
  if (sun && o.sunFollow !== false) {
    const dir = sun.position.clone().sub(sun.target.position).normalize();
    sun.target.position.copy(subj);
    sun.position.copy(subj).addScaledVector(dir, 250);
    sun.target.updateMatrixWorld();
  }
  G.expo.value = o.expo ?? 1;
  G.fade.value = o.fade ?? 1;
  post.composer.render();
}

// topics/lift/scene.js
var FL = 3.6;
var NF = 80;
var TH = NF * FL;
function city(scene, o = {}) {
  ground(scene, o.grass || "#6aa84a");
  for (const x of [-60, 60]) road(scene, x, -400, x, 400, 12, { walk: true });
  for (const z of [-60, 60]) road(scene, -400, z, 400, z, 12, { walk: true });
  const cols = ["#e9dfcc", "#d9c2a4", "#c7d3dc", "#e6d2c8", "#d6d9c4"];
  let k = 0;
  for (let bx = -3; bx <= 3; bx++) for (let bz = -3; bz <= 3; bz++) {
    if (bx === 0 && bz === 0) continue;
    const cx = bx * 120, cz = bz * 120;
    if (Math.abs(bx) > 2 && Math.abs(bz) > 2) continue;
    for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
      k++;
      const h = 18 + k * 37 % 9 * 9 * (o.old ? 0.7 : 1);
      building(scene, 30, 30, h, cx + dx, cz + dz, { wall: cols[k % 5], seed: k, lit: o.lit || 0 });
    }
  }
  if (!o.noTrees) for (let i = 0; i < 24; i++) tree(scene, -56 + i % 2 * 112 + (i * 7 % 5 - 2), -50 + Math.floor(i / 2) * 9, 1.3);
}
function tower(scene, o = {}) {
  const g = grp(scene, 0, 0, 0);
  const fm = facadeMat(o.wall || "#d9d3c7", "#2b3a48", 7, o.lit || 0);
  const wall = (w, h, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm);
    m.position.set(x, h / 2, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  wall(40, TH, 1, 0, -15);
  wall(1, TH, 17.5, -20, -6.25);
  wall(1, TH, 17.5, 20, -6.25);
  const slabM = M("#cfc9bd"), slabM2 = M("#b9b2a6");
  for (let f = 0; f <= NF; f++) {
    const y = f * FL, m = f % 10 === 0 ? slabM2 : slabM;
    for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(16.5, 0.5, 17.5), m, g, sx * 11.75, y, -6.25);
    mesh(new THREE.BoxGeometry(7, 0.5, 10.5), m, g, 0, y, -9.75);
  }
  const shM = M("#34363e");
  mesh(new THREE.BoxGeometry(7.4, TH, 0.3), shM, g, 0, TH / 2, -4.6);
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.3, TH, 7), shM, g, sx * 3.65, TH / 2, -1);
  for (const x of [-3.2, 3.2]) mesh(new THREE.BoxGeometry(0.3, TH, 0.5), M("#9aa0b0", { metalness: 0.5, roughness: 0.4 }), g, x, TH / 2, -1);
  rbox(g, 42, 3, 18, "#bdb5a7", 0, TH, -6);
  g.userData.fm = fm;
  return g;
}
function cab(scene) {
  const c = grp(scene, 0, 0, -1);
  rbox(c, 5.6, 0.4, 5.6, "#b8a890", 0, 0, 0);
  rbox(c, 5.6, 4.2, 0.3, "#c9b89a", 0, 0, -2.65);
  rbox(c, 0.3, 4.2, 5.6, "#c9b89a", -2.65, 0, 0);
  rbox(c, 0.3, 4.2, 5.6, "#c9b89a", 2.65, 0, 0);
  rbox(c, 5.6, 0.4, 5.6, "#b8a890", 0, 4.2, 0);
  const cable = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8), M("#2a2a2e", { metalness: 0.6 }), c, 0, 0, 0);
  cable.castShadow = false;
  const hero = person(c, 0, 0.4, "#ffcf2e", { s: 1.25, y: 0.4 });
  const lamp = new THREE.PointLight("#ffe2b0", 30, 12, 1.6);
  lamp.position.set(0, 3.8, 1);
  c.add(lamp);
  rbox(c, 1.6, 0.12, 0.6, M("#fff6d8", { emissive: "#fff0c0", emissiveIntensity: 1.5 }), 0, 4.05, 0);
  const catchers = [-3.2, 3.2].map((x) => {
    const k = grp(c, x, 0.2, 0);
    rbox(k, 0.9, 0.9, 1.2, "#e8463c", 0, 0, 0);
    return k;
  });
  c.userData = { cable, hero, catchers };
  return c;
}
var S1 = world({ shadowR: 140 });
city(S1);
var T1 = tower(S1);
var C1 = cab(S1);
[[-52, 30], [-52, 34], [-50, 40], [52, -20], [52, -26]].forEach(([x, z], i) => person(S1, x, z, ["#e8463c", "#2f5fb3", "#3f8f5a", "#e07bb0", "#f08a2c"][i]));
for (let i = 0; i < 6; i++) car(S1, ["#2f5fb3", "#f4f4f0", "#e8463c", "#3f8f5a", "#f2c230", "#2a2d33"][i], -63 + i % 2 * 6, -150 + i * 46, i % 2 ? Math.PI : 0);
var S2 = world({ sky: "#a9adb2", fogNear: 160, fogFar: 900, sunI: 1.6, hemiI: 1.3 });
city(S2, { old: true, grass: "#7c9a5c", noTrees: true });
var T2 = tower(S2, { wall: "#d6cbb5" });
var C2 = cab(S2);
var spire = grp(S2, 0, TH, 0);
rbox(spire, 30, 14, 22, "#d6cbb5", 0, 0, 0);
rbox(spire, 18, 14, 14, "#d6cbb5", 0, 14, 0);
rbox(spire, 9, 12, 9, "#cfc4ad", 0, 28, 0);
mesh(new THREE.CylinderGeometry(0.6, 1.6, 26, 10), M("#bfb7a6"), spire, 0, 53, 0);
var plane = grp(S2, 0, 0, 0);
plane.scale.setScalar(1.6);
rbox(plane, 3, 3, 26, "#5b6a4a", 0, -1.5, 0);
rbox(plane, 40, 0.6, 5, "#5b6a4a", 0, 0, 1);
rbox(plane, 14, 0.5, 3, "#5b6a4a", 0, 0.8, -11);
rbox(plane, 0.5, 5, 3, "#5b6a4a", -6.5, 1, -11);
rbox(plane, 0.5, 5, 3, "#5b6a4a", 6.5, 1, -11);
for (const x of [-9, 9]) {
  rbox(plane, 2.2, 2.2, 6, "#4a573c", x, -1.5, 3);
}
var puffs = [0, 1, 2, 3].map((i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: "#4a4744", roughness: 1, transparent: true, opacity: 0 }));
  S2.add(m);
  return m;
});
var coil = grp(S2, 0, 0, -1);
for (let i = 0; i < 9; i++) {
  const t = mesh(new THREE.TorusGeometry(1.6 + i % 3 * 0.5, 0.14, 8, 28), M("#2a2a2e", { metalness: 0.5 }), coil, (i % 3 - 1) * 0.8, 0.3 + i * 0.22, i % 2 * 0.6 - 0.3);
  t.rotation.x = Math.PI / 2;
}
coil.visible = false;
function placeCab(C, y, cableTop = true) {
  C.position.y = y;
  const L2 = TH - y - 4.4;
  C.userData.cable.visible = cableTop && L2 > 0;
  C.userData.cable.scale.y = Math.max(0.01, L2);
  C.userData.cable.position.y = 4.4 + L2 / 2;
}
var V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, C = ["bomber", "betty", "city", "end"].includes(sc) ? C2 : C1, hero = C.userData.hero;
  posePerson(hero, {});
  hero.position.y = 0.4;
  hero.rotation.set(0, 0, 0);
  C.userData.catchers.forEach((c, i) => c.position.x = (i ? 1 : -1) * 3.6);
  if (sc === "snap") {
    const y = 76 * FL;
    placeCab(C1, y - sm(0.55, 1, k) * 3, k < 0.6);
    return shoot(S1, new V3(60, y + 50, 150), new V3(0, y - 10, 0), { subject: new V3(0, y + 2, 0), fov: 30, aper: 16 });
  }
  if (sc === "idea") {
    const y = 70 * FL - k * 20;
    placeCab(C1, y, false);
    posePerson(hero, { armsUp: sm(0.4, 0.9, k) * 0.6 });
    return shoot(S1, new V3(10, y + 12, 34), new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: 26, aper: 6 });
  }
  if (sc === "fall" || sc === "jump" || sc === "blind") {
    const base = { fall: 62, jump: 30, blind: 18 }[sc] * FL, y = base - eio(k) * (sc === "fall" ? 120 : 40);
    placeCab(C1, y, false);
    if (sc === "jump") {
      const j = Math.sin(clamp((k - 0.3) / 0.4) * Math.PI);
      hero.position.y = 0.4 + j * 1.2;
      posePerson(hero, { armsUp: j });
    }
    if (sc === "blind") {
      const j = Math.sin(clamp((k - 0.2) / 0.3) * Math.PI);
      hero.position.y = 0.4 + j * 1.1;
      if (k > 0.5) {
        hero.rotation.z = sm(0.5, 0.7, k) * 1.4;
        hero.position.y = 0.7;
      }
    }
    const cam = sc === "fall" ? new V3(30, y + 26, 70) : new V3(8, y + 9, 30);
    return shoot(S1, cam, new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: sc === "fall" ? 30 : 26, aper: sc === "fall" ? 12 : 6 });
  }
  if (sc === "floor") {
    placeCab(C1, 6 * FL, true);
    hero.rotation.x = -Math.PI / 2;
    hero.position.set(0, 0.7, 1.2);
    return shoot(S1, new V3(5, 6 * FL + 14, 24), new V3(0, 6 * FL + 1, -1), { subject: new V3(0, 6 * FL + 1, 0), fov: 26, aper: 6 });
  }
  if (sc === "brakes") {
    const y = 40 * FL - eio(clamp(k * 1.6)) * 8;
    placeCab(C1, y, false);
    const c = sm(0.3, 0.55, k);
    C1.userData.catchers.forEach((m, i) => m.position.x = (i ? 1 : -1) * lerp(3.6, 3.75, c));
    C1.userData.catchers.forEach((m) => m.scale.set(1, 1 + c * 0.3, 1 + c * 0.2));
    return shoot(S1, new V3(9, y + 7, 22), new V3(0, y + 1.5, -1), { subject: new V3(0, y + 1, -1), fov: 26, aper: 6 });
  }
  puffs.forEach((m) => m.material.opacity = 0);
  plane.visible = false;
  coil.visible = false;
  if (sc === "bomber") {
    plane.visible = true;
    const a = clamp(k * 1.05);
    plane.position.set(lerp(-120, -24, a), 79 * FL, lerp(60, 4, a));
    plane.rotation.y = Math.atan2(96, -56);
    placeCab(C2, 79 * FL, true);
    if (k > 0.84) puffs.forEach((m, i) => {
      const e = (k - 0.84) * 6;
      m.position.set(-22 + i * 4, 79 * FL + 2 + i * 4 + e * 6, 2 + i);
      m.scale.setScalar(5 + e * 8 + i * 2);
      m.material.opacity = 0.8 * clamp(e * 1.5);
    });
    return shoot(S2, new V3(30, 79 * FL + 60, 240), new V3(-30, 79 * FL - 6, 10), { subject: plane.position, fov: 40, aper: 12 });
  }
  if (sc === "betty") {
    const y = 75 * FL - eio(k) * 70 * FL;
    placeCab(C2, Math.max(1, y), false);
    return shoot(S2, new V3(30, y + 30, 90), new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: 30, aper: 12 });
  }
  if (sc === "city") {
    placeCab(C2, 1.2, false);
    coil.visible = true;
    return shoot(S2, new V3(8, 13, 28), new V3(0, 3, -1), { subject: new V3(0, 2, 0), fov: 28, aper: 6 });
  }
  const u = eio(clamp(lt / s.dur));
  return shoot(S1, new V3(lerp(200, 260, u), lerp(260, 320, u), lerp(360, 420, u)), new V3(0, TH * 0.55, 0), { subject: new V3(0, TH * 0.8, 0), fov: 30, aper: 30 });
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  if (s.card === "speed") {
    const v = lerp(0, EN ? 170 : 280, eio(clamp(k * 1.1)));
    return card(330, `<div class="t">${L("\u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C", "speed")}</div><div class="v" style="color:#ff4b5c">${Math.round(v)} <small>${L("\u043A\u043C/\u0447", "mph")}</small></div><div class="n">${L("8 \u0441\u0435\u043A\u0443\u043D\u0434 \u0434\u043E \u043F\u043E\u0434\u0432\u0430\u043B\u0430", "8 seconds to the basement")}</div>`, a);
  }
  if (s.card === "jump") return card(330, `<div class="t">${L("\u043F\u0440\u044B\u0436\u043E\u043A \u043F\u0440\u043E\u0442\u0438\u0432 \u043F\u0430\u0434\u0435\u043D\u0438\u044F", "jump vs. fall")}</div><div class="v"><span style="color:#5cd06a">${EN ? 6 : 10}</span> <small>vs</small> <span style="color:#ff4b5c">${EN ? 170 : 280}</span></div><div class="n">${L("\u043A\u043C/\u0447", "mph")}</div>`, a);
  if (s.card === "betty") return card(330, `<div class="t">${L("\u043F\u0430\u0434\u0435\u043D\u0438\u0435", "the fall")}</div><div class="v">${EN ? "~1,000 <small>ft</small>" : "~300 <small>\u043C</small>"}</div><div class="n">${L("75 \u044D\u0442\u0430\u0436\u0435\u0439 \xB7 \u0440\u0435\u043A\u043E\u0440\u0434 \u0413\u0438\u043D\u043D\u0435\u0441\u0441\u0430", "75 floors \xB7 Guinness record")}</div>`, a);
  return "";
}
start({ render, cards: cards2, mins: { bomber: 6, end: 3.5 }, bubbles: ["#2f5fb3", "#ffcf2e", "#e8463c"] });
