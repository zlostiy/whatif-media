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
    let ci2 = s.chunks.findIndex((c) => t < cw[c[c.length - 1]].b + 0.05);
    if (ci2 < 0) ci2 = s.chunks.length - 1;
    const ch = s.chunks[ci2];
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
    let fl = fx.fl || 0, bk2 = fx.bk || 0;
    if (i === 0) bk2 = Math.max(bk2, 1 - sm(0, 0.5, t));
    if (i === shots.length - 1) bk2 = Math.max(bk2, sm(s.dur - 0.5, s.dur, lt));
    $("flash").style.opacity = fl;
    $("flash").style.background = fx.flc || "#fff";
    $("black").style.opacity = bk2;
    if (OV) window.__ovSig = [full.innerHTML, cards.innerHTML, capEl.innerHTML, badge.style.cssText, s.badge, s.loc, capEl.style.cssText, (bp2 > 0 && bp2 < 1 ? bp2 : 0).toFixed(4), fl.toFixed(3), fx.flc || "", bk2.toFixed(3)].join("|");
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
function water(parent, w, d, x = 0, y = 0, z = 0, c = "#2f8fb6") {
  const g = grp(parent, x, y, z);
  mesh(new THREE3.BoxGeometry(w, 1, d), M("#1f5e78"), g, 0, -1.6, 0).castShadow = false;
  const s = mesh(new THREE3.PlaneGeometry(w, d), new THREE3.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.84 }), g, 0, 0, 0);
  s.rotation.x = -Math.PI / 2;
  s.castShadow = false;
  return g;
}
function ripple(parent, x, z, r, y = 0.02, a = 0.55) {
  const m = new THREE3.Mesh(new THREE3.RingGeometry(r, r + 0.3, 64), new THREE3.MeshBasicMaterial({ color: "#e3f4fa", transparent: true, opacity: a, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
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

// topics/nocars/scene.js
var S = world({ shadowR: 140, fogNear: 300, fogFar: 1100 });
var hemi = S.children.find((o) => o.isHemisphereLight);
var sun = S.userData.sun;
var rnd2 = (i, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
ground(S, "#86a865", 1400);
var RX = [-40, 0, 40];
var RZ = [-40, 0, 40];
var RW = 10;
var roads = grp(S);
for (const x of RX) road(roads, x, -70, x, 70, RW, { walk: true });
for (const z of RZ) road(roads, -70, z, 70, z, RW, { walk: true });
var roadM = M("#3e4046", { roughness: 0.95 });
var cols = ["#e9dfcc", "#d9c2a4", "#c7d3dc", "#e6d2c8", "#d6d9c4", "#f0d9b5"];
var bk = 0;
for (const cx of [-20, 20]) for (const cz of [-20, 20]) for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
  bk++;
  if (cx === 20 && cz === 20 && dx > 0 && dz > 0) continue;
  building(S, 9, 9, 6 + bk * 37 % 5 * 2.5, cx + dx, cz + dz, { wall: cols[bk % 6], seed: bk });
}
for (let i = 0; i < 24; i++) {
  const a = rnd2(i, 3);
  const x = (rnd2(i, 1) - 0.5) * 260, z = 80 + rnd2(i, 2) * 120;
  if (Math.abs(x) < 90 && z < 110) continue;
  building(S, 10, 10, 6 + a * 10, x, z, { wall: cols[i % 6], seed: 40 + i });
}
var shop = grp(S, 26, 0, 26);
rbox(shop, 9, 5, 9, "#f2efe8", 0, 0, 0);
rbox(shop, 9.4, 1.2, 0.6, "#e8463c", 0, 4, -4.8);
rbox(shop, 6, 3, 0.2, "#bfe3f2", 0, 0.5, -4.6);
var RAILZ = -92;
rbox(S, 900, 0.4, 6, "#8d8476", 0, 0, RAILZ);
for (const dz of [-1.2, 1.2]) rbox(S, 900, 0.25, 0.25, "#b9bec6", 0, 0.4, RAILZ + dz);
var station = grp(S, 0, 0, -78);
rbox(station, 46, 7, 12, "#e6d2c8", 0, 0, 0);
rbox(station, 50, 1, 14, "#b4483c", 0, 7, 0);
rbox(station, 10, 4, 10, "#e6d2c8", 0, 8, 0);
rbox(station, 3, 3, 0.4, "#f4f4f0", 0, 9.2, 5.1);
rbox(station, 60, 0.8, 4, "#cfc9bd", 0, 0, -8);
road(roads, 0, -70, 0, -84, RW, { marks: false, walk: false });
function train(x0, n = 5, c = "#2f5fb3") {
  const g = grp(S, x0, 0, RAILZ);
  for (let i = 0; i < n; i++) {
    rbox(g, 13, 3.4, 3.6, i ? c : "#e8463c", -i * 14, 0.6, 0, 0, 0.5);
    const w = rbox(g, 11, 0.9, 3.7, M("#ffe7a8", { emissive: "#ffcf6a", emissiveIntensity: 0 }), -i * 14, 2.4, 0, 0, 0.2);
    g.userData.win = (g.userData.win || []).concat(w);
  }
  return g;
}
var trains = [train(-200), train(200, 4, "#3f8f5a")];
var PX = 100;
var PZ = 0;
var parking = grp(S, PX, 0, PZ);
mesh(new THREE.BoxGeometry(44, 0.2, 44), roadM, parking, 0, 0.1, 0).castShadow = false;
for (let i = -3; i <= 3; i++) for (const r of [-1, 1]) mesh(new THREE.BoxGeometry(0.25, 0.05, 5), M("#f2f0e8"), parking, i * 5.5, 0.22, r * 12).castShadow = false;
road(roads, 45, 0, 78, 0, RW, { walk: true });
var park = grp(S, PX, 0, PZ);
mesh(new THREE.BoxGeometry(44, 0.3, 44), M("#7cc05a"), park, 0, 0.15, 0).castShadow = false;
for (let i = 0; i < 14; i++) tree(park, (rnd2(i, 7) - 0.5) * 38, (rnd2(i, 8) - 0.5) * 38, 1 + rnd2(i, 9) * 0.5, i % 3 ? "#3f8a3a" : "#5aa04a");
mesh(new THREE.CylinderGeometry(5, 5, 0.4, 32), M("#2f8fb6", { roughness: 0.2 }), park, 4, 0.3, 4);
var OB = [{ x: PX + 4, z: PZ + 4, r: 6.2 }, ...park.children.filter((c) => c.isGroup).map((g) => ({ x: PX + g.position.x, z: PZ + g.position.z, r: 2.6 }))];
var HZ = 110;
var RIVX = 260;
var hw = grp(S);
road(hw, 40, HZ, RIVX - 22, HZ, 16);
road(hw, RIVX + 22, HZ, 700, HZ, 16);
road(roads, 40, 45, 40, HZ, RW, { walk: false });
water(S, 30, 1400, RIVX, 0.08, 0);
var bridge = grp(S, RIVX, 0, HZ);
rbox(bridge, 48, 1.4, 17, "#c9c4b8", 0, 3, 0);
for (const x of [-12, 12]) rbox(bridge, 3, 3.2, 10, "#b9b3a6", x, -0.2, 0);
for (const z of [-8, 8]) rbox(bridge, 48, 1, 0.6, "#d8d3c7", 0, 4.4, z);
for (const sx of [-1, 1]) {
  const r = rbox(bridge, 10.6, 0.4, 15, "#c9c4b8", sx * 29, 0, 0);
  r.rotation.z = -sx * Math.atan2(4.4, 10);
  r.position.y = 2.2;
}
var bdeck = mesh(new THREE.BoxGeometry(48, 0.15, 15), roadM, bridge, 0, 4.5, 0);
var cracks = grp(S);
var tufts = grp(S);
var hwTrees = grp(S);
var forest = grp(S);
for (let i = 0; i < 70; i++) {
  const x = 60 + rnd2(i, 1) * 600, z = HZ + (rnd2(i, 2) - 0.5) * 13;
  if (Math.abs(x - RIVX) < 26) continue;
  const c = mesh(new THREE.BoxGeometry(3 + rnd2(i, 3) * 5, 0.06, 0.25), M("#24262b"), cracks, x, 0.23, z);
  c.rotation.y = rnd2(i, 4) * 3;
  c.castShadow = false;
  const t = mesh(new THREE.IcosahedronGeometry(0.6 + rnd2(i, 5) * 0.5, 0), M("#6fb84a", { flatShading: true }), tufts, x + 1, 0.3, z + 0.4);
  t.scale.y = 0.6;
}
mesh(new THREE.BoxGeometry(RIVX - 62, 0.22, 18), M("#9cc76a"), hwTrees, (60 + RIVX - 22) / 2 + 1, 0.11, HZ).castShadow = false;
mesh(new THREE.BoxGeometry(400, 0.22, 18), M("#9cc76a"), hwTrees, RIVX + 222, 0.11, HZ).castShadow = false;
for (let i = 0; i < 70; i++) {
  const x = 60 + i * 9 + rnd2(i, 6) * 4;
  if (Math.abs(x - RIVX) < 29) continue;
  for (const zz of [-6.5, 6.5]) tree(hwTrees, x, HZ + zz + (rnd2(i, zz) - 0.5) * 2, 1.2 + rnd2(i, 8) * 0.9);
}
for (const x of RX) for (let z = -36; z <= 66; z += 7) tree(forest, x + (rnd2(z, x) - 0.5) * 4, z, 1.1 + rnd2(z, x + 1) * 0.6, "#3f8a3a");
for (const z of RZ) for (let x = -66; x <= 66; x += 7) if (!RX.some((r) => Math.abs(r - x) < 6)) tree(forest, x, z + (rnd2(x, z) - 0.5) * 4, 1.1 + rnd2(x, z + 1) * 0.6, "#4a9a44");
for (let x = 60; x < 700; x += 8) if (Math.abs(x - RIVX) > 28) tree(forest, x, HZ + (rnd2(x, 1) - 0.5) * 10, 1.4 + rnd2(x, 2) * 0.8, "#356f33");
var grassRoads = grp(S);
for (const x of RX) mesh(new THREE.BoxGeometry(RW + 4, 0.26, 140), M("#7cc05a"), grassRoads, x, 0.13, 0).castShadow = false;
for (const z of RZ) mesh(new THREE.BoxGeometry(140, 0.26, RW + 4), M("#7cc05a"), grassRoads, 0, 0.13, z).castShadow = false;
mesh(new THREE.BoxGeometry(700, 0.26, 18), M("#7cc05a"), grassRoads, 380, 0.13, HZ).castShadow = false;
var CARC = ["#d83a2e", "#2f5fb3", "#f4f4f0", "#f2c230", "#3f8f5a", "#2a2d33", "#e07bb0"];
var cars = [];
var ci = 0;
for (const x of RX) for (const lane2 of [-2.2, 2.2]) for (let z = -64; z <= 64; z += 7.5) {
  if (RZ.some((r) => Math.abs(r - z) < 6)) continue;
  const c = car(S, CARC[ci % 7], x + lane2, z, lane2 > 0 ? 0 : Math.PI);
  c.userData.lane = { ax: "z", dir: lane2 > 0 ? 1 : -1, x: x + lane2, z };
  cars.push(c);
  ci++;
}
for (const z of RZ) for (const lane2 of [-2.2, 2.2]) for (let x = -64; x <= 64; x += 8) {
  if (RX.some((r) => Math.abs(r - x) < 6)) continue;
  const c = car(S, CARC[ci % 7], x, z + lane2, lane2 > 0 ? -Math.PI / 2 : Math.PI / 2);
  c.userData.lane = { ax: "x", dir: lane2 > 0 ? -1 : 1, x, z: z + lane2 };
  cars.push(c);
  ci++;
}
for (let i = -3; i <= 3; i++) for (const r of [-1, 1]) {
  const c = car(S, CARC[(i + 9) % 7], PX + i * 5.5, PZ + r * 12, 0);
  c.userData.lane = null;
  cars.push(c);
}
for (let x = 60; x < 600; x += 12) for (const lane2 of [-3.5, 3.5]) {
  if (Math.abs(x - RIVX) < 26) continue;
  const c = car(S, CARC[(x / 12 | 0) % 7], x + (lane2 > 0 ? 4 : 0), HZ + lane2, lane2 > 0 ? -Math.PI / 2 : Math.PI / 2);
  c.userData.lane = null;
  cars.push(c);
}
var puffs = cars.map((c) => {
  const r = ripple(S, c.position.x, c.position.z, 1.4, 0.3, 0);
  r.material = r.material.clone();
  return r;
});
var TOPS = ["#e8463c", "#2f5fb3", "#f2c230", "#f4f4f0", "#3f8f5a", "#e07bb0", "#8a5ad8", "#ff8a3d"];
var HAIR = ["#2b1d18", "#5a3a22", "#c99a5b", "#1d1d22", "#8a8a8a"];
var N = 260;
var P = [];
for (let i = 0; i < N; i++) P.push(person(S, 0, -999, TOPS[i % 8], { hair: HAIR[i % 5], s: 1.1 }));
var hero = person(S, 0, 0, "#ffcf2e", { s: 1.2 });
function bike(c) {
  const g = grp(S, 0, 0, 0);
  for (const z of [-0.75, 0.75]) {
    const w = mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 20), M("#1d1d22"), g, 0, 0.5, z);
    w.rotation.y = Math.PI / 2;
  }
  rbox(g, 0.12, 0.12, 1.5, c, 0, 0.75, 0);
  rbox(g, 0.12, 0.7, 0.12, c, 0, 0.5, -0.3);
  const r = person(g, 0, -0.2, TOPS[c.length * 7 % 8], { s: 1, y: 0.45 });
  g.userData.rider = r;
  return g;
}
var bikes = Array.from({ length: 36 }, (_, i) => bike(["#e8463c", "#2f5fb3", "#3f8f5a", "#f2c230"][i % 4]));
function horse(c) {
  const g = grp(S);
  rbox(g, 0.9, 0.9, 2.2, c, 0, 1.1, 0, 0, 0.3);
  rbox(g, 0.5, 0.9, 0.6, c, 0, 1.8, 1.2, 0, 0.2);
  for (const [x, z] of [[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.8], [0.3, -0.8]]) rbox(g, 0.2, 1.1, 0.2, "#4a3220", x, 0, z);
  rbox(g, 1.8, 0.8, 2.6, "#8a6a48", 0, 0.6, -3);
  for (const x of [-0.95, 0.95]) {
    const w = mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 18), M("#4a3220"), g, x, 0.55, -3);
    w.rotation.y = Math.PI / 2;
  }
  return g;
}
var horses = Array.from({ length: 6 }, (_, i) => horse(["#8a5a3a", "#5a3a22", "#c9a37a"][i % 3]));
var market = grp(S);
for (let i = 0; i < 10; i++) {
  const x = -45 + i * 10, z = -60 + i % 2 * 2;
  rbox(market, 5, 1.1, 2.4, "#c9a37a", x, 0, z);
  rbox(market, 5.6, 0.3, 3, ["#e8463c", "#f2c230", "#3f8f5a", "#2f5fb3"][i % 4], x, 2.8, z);
  for (const sx of [-2.5, 2.5]) rbox(market, 0.15, 2.8, 0.15, "#6b4a2e", x + sx, 0, z + 1.2);
  for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(0.3, 10, 8), M(["#e8463c", "#f2c230", "#7cc05a"][j % 3]), market, x - 1.5 + j, 1.4, z);
}
function hide() {
  for (const p of P) p.position.set(0, -999, 0);
  for (const b of bikes) b.position.set(0, -999, 0);
  for (const h of horses) h.position.set(0, -999, 0);
}
function lane(i0, n, ax, fixed, from, to, t, speed, o = {}) {
  const span = to - from;
  let i = i0;
  for (let j = 0; j < n; j++, i++) {
    const p = P[i];
    if (!p) break;
    const u = (j / n + t * speed / span + rnd2(j, i0) * 0.01) % 1, s = from + u * span;
    if (ax === "z") p.position.set(fixed + (j % 2 ? 0.7 : -0.7), o.y || 0, s);
    else p.position.set(s, o.y || 0, fixed + (j % 2 ? 0.7 : -0.7));
    if (o.bridge) p.position.y = 4.6 * clamp((34 - Math.abs(p.position.x - RIVX)) / 10);
    p.rotation.y = ax === "z" ? speed > 0 ? 0 : Math.PI : speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    posePerson(p, o.idle ? { wave: o.wave && j % 5 === 0 ? t * 3 : 0 } : { walk: t * 7 + j });
  }
  return i;
}
function cluster(i0, n, cx, cz, r, t, o = {}) {
  let i = i0;
  const cols2 = Math.ceil(Math.sqrt(n));
  for (let j = 0; j < n; j++, i++) {
    const p = P[i];
    if (!p) break;
    const gx = j % cols2, gz = j / cols2 | 0;
    p.position.set(cx + (gx - cols2 / 2) * (r / cols2 * 2) + (rnd2(j, i0) - 0.5) * 0.4, 0, cz + (gz - cols2 / 2) * (r / cols2 * 2) + (rnd2(i0, j) - 0.5) * 0.4);
    if (o.avoid && o.avoid.some((b) => Math.hypot(p.position.x - b.x, p.position.z - b.z) < b.r)) {
      p.position.y = -999;
      continue;
    }
    p.position.y = o.y || 0;
    p.rotation.y = o.face ?? rnd2(j, 3) * 6.28;
    posePerson(p, { wave: o.wave && j % 4 === 0 ? t * 3 + j : 0, armsUp: o.cheer && j % 3 === 0 ? 0.6 + Math.sin(t * 4 + j) * 0.1 : 0 });
  }
  return i;
}
function rideBikes(n, ax, fixed, from, to, t, speed, i0 = 0, br = false) {
  for (let j = 0; j < n; j++) {
    const b = bikes[i0 + j];
    if (!b) break;
    const span = to - from, u = (j / n + t * speed / span) % 1, s = from + u * span;
    if (ax === "z") b.position.set(fixed + (j % 2 ? 1 : -1), 0, s);
    else b.position.set(s, 0, fixed + (j % 2 ? 1 : -1));
    b.rotation.y = ax === "z" ? speed > 0 ? 0 : Math.PI : speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (br) b.position.y = 4.6 * clamp((34 - Math.abs(b.position.x - RIVX)) / 10);
  }
}
function era(e, t) {
  roadM.color.set(e >= 10 ? "#4a4d48" : "#3e4046");
  cracks.visible = e >= 10 && e < 1e3;
  tufts.visible = e >= 10 && e < 1e3;
  tufts.children.forEach((m, i) => m.scale.setScalar(e >= 50 ? 1.8 : 1).y = e >= 50 ? 1.2 : 0.6);
  hwTrees.visible = e >= 100 && e < 1e3;
  hw.visible = e < 100;
  bdeck.material = e >= 100 ? M("#7cc05a") : roadM;
  parking.visible = e < 50;
  park.visible = e >= 50;
  market.visible = e >= 1;
  roads.visible = e < 1e3;
  grassRoads.visible = e >= 1e3;
  forest.visible = e >= 1e3;
  const dusk = e >= 1e3 ? 1 : 0;
  S.background.set(dusk ? "#f2a27a" : "#9cc3e6");
  S.fog.color.set(dusk ? "#f2a27a" : "#9cc3e6");
  sun.color.set(dusk ? "#ffb070" : "#fff1d6");
  sun.intensity = dusk ? 2.2 : 3;
  hemi.color.set(dusk ? "#ffc9a8" : "#bcd6ff");
  hemi.intensity = dusk ? 0.9 : 1.1;
  trains.forEach((tr, i) => {
    tr.position.x = (i ? 1 : -1) * ((t * 9 + i * 300) % 900 - 450);
    tr.rotation.y = i ? Math.PI : 0;
    tr.userData.win.forEach((w) => w.material.emissiveIntensity = dusk ? 1.6 : 0);
  });
}
function drive(t, show) {
  cars.forEach((c, i) => {
    const L2 = c.userData.lane;
    c.visible = show;
    if (!L2 || !show) return;
    const d = t * 6 % 7.5;
    if (L2.ax === "z") c.position.z = ((L2.z + 70 + L2.dir * d) % 140 + 140) % 140 - 70;
    else c.position.x = ((L2.x + 70 + L2.dir * d) % 140 + 140) % 140 - 70;
  });
}
var V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  hide();
  puffs.forEach((p) => p.material.opacity = 0);
  cars.forEach((c) => c.scale.setScalar(1));
  hero.position.set(0, -999, 0);
  posePerson(hero, {});
  if (sc === "hook" || sc === "vanish") {
    era(0, t);
    drive(sc === "hook" ? t : 0, true);
    const SW = { y: 0.35 };
    let i = lane(0, 34, "z", -46.1, -66, 66, t, 1.2, SW);
    i = lane(i, 34, "z", 46.1, 66, -66, t, -1.2, SW);
    i = lane(i, 26, "x", 6.1, -34, 34, t, 1.1, SW);
    i = lane(i, 26, "x", -46.1, 34, -34, t, -1.1, SW);
    i = lane(i, 26, "z", -6.1, 66, 8, t, -1, SW);
    hero.position.set(-5.5, 0, 8);
    hero.rotation.y = Math.PI / 2;
    if (sc === "vanish") {
      cars.forEach((c, j) => {
        const a = clamp((k - 0.15 - rnd2(j, 5) * 0.4) / 0.18);
        c.scale.setScalar(Math.max(1e-3, 1 - eio(a)));
        c.visible = a < 1;
        puffs[j].material.opacity = a > 0 && a < 1 ? (1 - a) * 0.7 : 0;
        puffs[j].scale.setScalar(1 + a * 2.5);
      });
      posePerson(hero, { armsUp: sm(0.6, 0.8, k) * 0.9 });
    }
    const cam = sc === "hook" ? new V3(lerp(60, 44, u), lerp(56, 44, u), lerp(84, 66, u)) : new V3(40, 46, 62);
    return shoot(S, cam, new V3(-4, 0, 4), { subject: new V3(-5, 1, 8), fov: 32, aper: 16 });
  }
  if (sc === "day1") {
    era(0, t);
    drive(0, false);
    let i = lane(0, 44, "z", -3.4, 60, -66, t, -1.6);
    i = lane(i, 44, "z", 3.4, 60, -66, t, -1.5);
    i = lane(i, 20, "x", 33.9, 20, 7, t, -1, { y: 0.35 });
    i = cluster(i, 12, 26, 17.5, 2.6, t, { face: 0 });
    rideBikes(14, "z", -38, 60, -66, t, -4);
    rideBikes(10, "z", 38, 60, -66, t, -4.5, 14);
    hero.position.set(1.5, 0, lerp(30, 10, u));
    hero.rotation.y = Math.PI;
    posePerson(hero, { walk: t * 7 });
    return shoot(S, new V3(lerp(14, 8, u), 36, lerp(78, 66, u)), new V3(0, 0, -20), { subject: new V3(1.5, 1, lerp(30, 10, u)), fov: 32, aper: 16 });
  }
  if (sc === "year1") {
    era(1, t);
    drive(0, false);
    let i = cluster(0, 36, -22, -49, 7, t, { wave: true });
    i = cluster(i, 36, 22, -49, 7, t, { wave: true });
    i = lane(i, 30, "z", -4.5, 34, -44, t, -1.3);
    i = lane(i, 30, "z", 4.5, -44, 34, t, 1.3);
    horses.forEach((h, j) => {
      h.position.set(j % 2 ? 1.6 : -1.6, 0, ((j * 25 + t * 4 * (j % 2 ? 1 : -1)) % 115 + 115) % 115 - 50);
      h.rotation.y = j % 2 ? 0 : Math.PI;
    });
    rideBikes(14, "x", 38.5, -66, 66, t, 4);
    hero.position.set(9, 0, -50);
    hero.rotation.y = Math.PI;
    posePerson(hero, { wave: t * 3 });
    return shoot(S, new V3(lerp(26, 18, u), 46, lerp(4, -4, u)), new V3(0, 0, -56), { subject: new V3(9, 1, -50), fov: 32, aper: 16 });
  }
  if (sc === "year10" || sc === "year100") {
    const e = sc === "year10" ? 10 : 100;
    era(e, t);
    drive(0, false);
    let i = lane(0, 60, "x", HZ - 2.2, 60, 520, t, 1.3, { bridge: true });
    i = lane(i, 60, "x", HZ + 2.2, 520, 60, t, -1.3, { bridge: true });
    rideBikes(14, "x", HZ - 5.5, 60, 520, t, 4.5, 0, true);
    const hx = e === 10 ? lerp(170, 190, u) : lerp(RIVX - 14, RIVX + 6, u);
    hero.position.set(hx, 4.6 * clamp((34 - Math.abs(hx - RIVX)) / 10), HZ);
    hero.rotation.y = Math.PI / 2;
    posePerson(hero, { walk: t * 7 });
    const cam = e === 10 ? new V3(hx + 26, 20, HZ + 34) : new V3(lerp(RIVX - 150, RIVX - 120, u), 100, HZ + 150);
    return shoot(S, cam, new V3(hx + (e === 100 ? 0 : 6), 0, HZ), { subject: hero.position.clone().add(new V3(0, 1, 0)), fov: 30, aper: 14 });
  }
  if (sc === "safe") {
    era(10, t);
    drive(0, false);
    let i = lane(0, 40, "x", 1.8, -66, 66, t, 1.1);
    i = lane(i, 40, "x", -1.8, 66, -66, t, -1.1);
    i = lane(i, 26, "z", 38, 8, 66, t, 1);
    i = lane(i, 26, "z", 42, 66, 8, t, -1);
    i = cluster(i, 16, 0, 22, 4, t, { cheer: true });
    rideBikes(10, "z", -40, -66, -8, t, 4);
    hero.position.set(-6, 0, -4);
    hero.rotation.y = 0.8;
    posePerson(hero, { armsUp: 0.5 });
    return shoot(S, new V3(lerp(30, 22, u), 34, lerp(8, 6, u)), new V3(-14, 0, 2), { subject: new V3(-6, 1, -4), fov: 32, aper: 16 });
  }
  if (sc === "year50") {
    era(50, t);
    drive(0, false);
    let i = cluster(0, 40, PX - 6, PZ - 8, 12, t, { wave: true, avoid: OB, y: 0.3 });
    i = cluster(i, 20, PX + 10, PZ + 12, 6, t, { avoid: OB, y: 0.3 });
    i = lane(i, 30, "x", 2, 45, 120, t, 1);
    i = lane(i, 40, "x", -70.5, -100, 100, t, 1.2);
    rideBikes(14, "x", -2.5, -66, 120, t, 4.5);
    hero.position.set(PX - 2, 0.3, PZ - 3);
    hero.rotation.y = -0.6;
    posePerson(hero, { wave: t * 3 });
    return shoot(S, new V3(lerp(PX + 70, PX + 50, u), 64, lerp(PZ + 80, PZ + 60, u)), new V3(PX - 30, 0, -30), { subject: new V3(PX - 2, 1, PZ - 3), fov: 32, aper: 14 });
  }
  if (sc === "year1000" || sc === "end") {
    era(1e3, t);
    drive(0, false);
    let i = cluster(0, 30, -22, -50, 5, t, { wave: true });
    i = cluster(i, 30, 22, -50, 5, t, { wave: true });
    i = lane(i, 20, "x", -86, -28, 28, t, 1.1, { y: 0.4 });
    rideBikes(20, "x", -66, -300, 300, t, 5);
    hero.position.set(2, 0.26, -52);
    hero.rotation.y = 0.3;
    posePerson(hero, { wave: sc === "end" ? t * 3 : 0 });
    if (sc === "end") return shoot(S, new V3(12, 9, -34), new V3(2, 1.8, -52), { subject: new V3(2, 1.6, -52), fov: 28, aper: 10 });
    const tg = new V3(lerp(2, 60, u), 0, lerp(-52, -10, u)), r = lerp(36, 300, u), h = lerp(20, 240, u), a = lerp(0.7, 1, u);
    return shoot(S, new V3(tg.x + Math.cos(a) * r, h, tg.z + Math.sin(a) * r), tg, { subject: tg.clone().setY(1), fov: 32, aper: lerp(12, 30, u), bandW: lerp(0.075, 0.12, u) });
  }
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  if (s.card === "cars") return card(330, `<div class="t">${L("\u043C\u0430\u0448\u0438\u043D \u0432 \u043C\u0438\u0440\u0435", "cars in the world")}</div><div class="v">\u22481,5 <small>${L("\u043C\u043B\u0440\u0434", "billion")}</small></div><div class="n">${L("\u043B\u0435\u0433\u043A\u043E\u0432\u044B\u0435, \u0433\u0440\u0443\u0437\u043E\u0432\u0438\u043A\u0438, \u0430\u0432\u0442\u043E\u0431\u0443\u0441\u044B", "cars, trucks, buses")}</div>`, a);
  if (s.card === "deaths") return card(330, `<div class="t">${L("\u0433\u0438\u0431\u043D\u0443\u0442 \u043D\u0430 \u0434\u043E\u0440\u043E\u0433\u0430\u0445", "road deaths")}</div><div class="v" style="color:#ff4b5c">1,19 <small>${L("\u043C\u043B\u043D/\u0433\u043E\u0434", "million/yr")}</small></div><div class="n">${L("\u0412\u041E\u0417, 2023", "WHO, 2023")}</div>`, a);
  return "";
}
start({ render, cards: cards2, mins: { year1000: 8, end: 3.5, hook: 3 }, bubbles: ["#2f5fb3", "#ffcf2e", "#3f8f5a"] });
