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

// topics/wtc/scene.js
var V3 = THREE.Vector3;
var rnd2 = (i, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var COLS = ["#e8463c", "#2f5fb3", "#3f8f5a", "#e07bb0", "#f08a2c", "#7a4fc0", "#f2c230", "#f4f4f0"];
var S1 = world({ shadowR: 200, fogNear: 500, fogFar: 1600 });
var hemi = S1.children.find((o) => o.isHemisphereLight);
var sun = S1.userData.sun;
ground(S1, "#b9b4a8", 2400);
water(S1, 300, 2400, -330, 0.05, 0);
water(S1, 2400, 300, 0, 0.05, 420);
var roads = grp(S1);
for (const x of [-150, -90, -30, 30, 90, 150]) road(roads, x, -600, x, 270, 10, { walk: true });
for (const z of [-480, -360, -240, -120, 120, 240]) road(roads, -180, z, 300, z, 10, { walk: true });
var WALLS = ["#e9dfcc", "#d9c2a4", "#c7d3dc", "#e6d2c8", "#d6d9c4", "#c9c9c9", "#b8c4cf"];
var bk = 0;
for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 7; iz++) {
  const cx = -120 + ix * 60, cz = -540 + iz * 120 + 60;
  if (Math.abs(cx) < 70 && Math.abs(cz) < 70) continue;
  if (cz > 260) continue;
  if (Math.abs(cx) <= 60 && cz > 40) {
    mesh(new THREE.BoxGeometry(56, 0.3, 110), M("#7cc05a"), S1, cx, 0.15, cz).castShadow = false;
    for (let q = 0; q < 6; q++) tree(S1, cx + (q % 2 ? 14 : -14), cz - 40 + q * 16, 1.3);
    continue;
  }
  for (const [dx, dz] of [[-13, -30], [13, -30], [-13, 30], [13, 30]]) {
    bk++;
    const h = 22 + Math.floor(rnd2(bk, 1) * 8) * 10 + (cz < -300 ? 30 : 0);
    building(S1, 20, 40, h, cx + dx, cz + dz, { wall: WALLS[bk % 7], seed: bk, bay: 8 });
  }
}
var towerTex = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#dfe3e8";
  g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 4) {
    g.fillStyle = "#56606c";
    g.fillRect(x + 1.6, 0, 2, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 7);
  t.anisotropy = 8;
  return t;
})();
var towerM = new THREE.MeshStandardMaterial({ map: towerTex, roughness: 0.45, metalness: 0.35, emissive: new THREE.Color("#ffb04a"), emissiveMap: towerTex, emissiveIntensity: 0 });
var TW = 20;
var TH = 160;
var TOWERS = [[-18, -12], [16, 14]];
var towers = TOWERS.map(([x, z], i) => {
  const g = grp(S1, x, 0, z);
  const b = mesh(new THREE.BoxGeometry(TW, TH, TW), [towerM, towerM, M("#8f8a80"), M("#8f8a80"), towerM, towerM], g, 0, TH / 2, 0);
  rbox(g, TW + 0.6, 0.8, TW + 0.6, "#c9ccd2", 0, TH, 0);
  if (i === 0) mesh(new THREE.CylinderGeometry(0.5, 1.2, 36, 10), M("#d0d3d8", { metalness: 0.5 }), g, 0, TH + 18, 0);
  return g;
});
var plaza = grp(S1);
mesh(new THREE.BoxGeometry(110, 0.4, 110), M("#d8d2c4"), plaza, 0, 0.2, 0).castShadow = false;
mesh(new THREE.CylinderGeometry(6, 6, 0.8, 32), M("#2f8fb6", { roughness: 0.2 }), plaza, 2, 0.4, 30);
for (let i = 0; i < 12; i++) tree(plaza, -48 + i % 6 * 19, i < 6 ? -50 : 50, 1.2);
var crowd = [];
for (let i = 0; i < 70; i++) crowd.push(person(S1, 0, 0, COLS[i % 8], { s: 1.25 }));
function placeCrowd(t, on) {
  crowd.forEach((p, i) => {
    p.visible = on;
    if (!on) return;
    const lane = i % 10, tw = TOWERS[i % 2], u = (t * 0.045 + rnd2(i, 4)) % 1;
    const x0 = tw[0] + (lane - 4.5) * 1.9, z0 = tw[1] + TW / 2 + 2, z1 = 64;
    p.position.set(x0 + (i % 2 ? 1 : -1) * u * 6, 0, lerp(z0, z1, u));
    p.rotation.y = 0;
    posePerson(p, { walk: t * 7 + i });
  });
}
var cars = [];
for (let i = 0; i < 26; i++) {
  const c = car(S1, COLS[i % 8], 0, 0);
  cars.push(c);
}
function placeCars(t) {
  cars.forEach((c, i) => {
    const x = [-150, -90, -30, 30, 90, 150][i % 6] + (i % 2 ? 2.5 : -2.5), dir = i % 2 ? 1 : -1;
    let z = ((rnd2(i, 2) * 870 + dir * t * 9) % 870 + 870) % 870 - 600;
    if (Math.abs(x) < 70 && Math.abs(z) < 70) z += 150;
    c.position.set(x, 0, z);
    c.rotation.y = dir > 0 ? 0 : Math.PI;
  });
}
function airliner(parent) {
  const g = grp(parent);
  const s = 2.2, W2 = M("#f4f4f2"), B = M("#2f5fb3");
  const f = mesh(new THREE.CapsuleGeometry(1.9 * s, 26 * s, 6, 14), W2, g, 0, 0, 0);
  f.rotation.x = Math.PI / 2;
  rbox(g, 4 * s, 0.5 * s, 26 * s, B, 0, -0.6 * s, 0, 0, 0.3);
  const wing = mesh(new THREE.BoxGeometry(34 * s, 0.5 * s, 5 * s), W2, g, 0, -0.8 * s, 1 * s);
  rbox(g, 12 * s, 0.4 * s, 3 * s, W2, 0, 0.4 * s, -13 * s);
  rbox(g, 0.5 * s, 6 * s, 4 * s, B, 0, 0.8 * s, -13.5 * s);
  for (const x of [-7, 7]) {
    const e = mesh(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 4 * s, 14), M("#c9ccd2"), g, x * s, -2 * s, 2.5 * s);
    e.rotation.x = Math.PI / 2;
  }
  return g;
}
var plane1 = airliner(S1);
var AP = grp(S1, 700, 0, -200);
mesh(new THREE.BoxGeometry(400, 0.3, 300), M("#a9aaa6"), AP, 0, 0.15, 0).castShadow = false;
var term = grp(AP, 0, 0, -60);
rbox(term, 160, 14, 30, "#e6e2d8", 0, 0, 0);
rbox(term, 160, 10, 1, M("#8fc3dd", { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 }), 0, 2, 15.2);
rbox(term, 166, 1.2, 34, "#c9c4b8", 0, 14, 0);
var plane2 = airliner(AP);
plane2.position.set(10, 9, 10);
plane2.rotation.y = -Math.PI / 2;
var stairs = grp(AP, 6, 0, 4.5);
rbox(stairs, 4, 1.4, 10, "#f2f2ee", 0, 0, 0);
for (let i = 0; i < 8; i++) rbox(stairs, 3.2, 0.5, 1.2, "#c9ccd2", 0, 1.4 + i * 0.9, -4 + i * 1.1);
var rail = rbox(stairs, 0.2, 1.2, 11, "#9aa0b0", 1.6, 2.5, 0);
rail.rotation.x = -0.7;
rail.position.y = 5;
var fam = [person(AP, -2, 14, "#e07bb0", { s: 1.25, y: 0.3 }), person(AP, -4.2, 14.5, "#3f8f5a", { s: 1.25, y: 0.3 }), person(AP, -6.2, 15, "#f2c230", { s: 0.9, y: 0.3 })];
var hero = person(AP, 2, 20, "#ffcf2e", { s: 1.3, y: 0.3 });
var bottle = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 10), M("#7fd0ff", { roughness: 0.1, transparent: true, opacity: 0.85 }), hero, 0.55, 1.3, 0.25);
var S2 = world({ sky: "#a8cdee", shadowR: 160, sunI: 3.2, hemiTop: "#cfe3ff", hemiBot: "#a07a50" });
ground(S2, "#c9a878", 2400);
for (let i = 0; i < 26; i++) {
  const a = i / 26 * Math.PI * 2, r = 220 + rnd2(i, 1) * 160, h = 70 + rnd2(i, 2) * 110;
  const m = mesh(new THREE.ConeGeometry(60 + rnd2(i, 3) * 40, h, 6), M(rnd2(i, 4) > 0.5 ? "#b08a62" : "#9c7a58", { flatShading: true }), S2, Math.cos(a) * r, h / 2, Math.sin(a) * r - 80);
  m.rotation.y = rnd2(i, 5) * 3;
  const cap2 = mesh(new THREE.ConeGeometry((60 + rnd2(i, 3) * 40) * 0.32, h * 0.32, 6), M("#f4f2ee", { flatShading: true }), S2, m.position.x, h - h * 0.16 + 0.1, m.position.z);
  cap2.rotation.y = m.rotation.y;
}
var vil = grp(S2);
for (let i = 0; i < 26; i++) {
  const x = (i % 6 - 2.5) * 16 + rnd2(i, 1) * 3, z = Math.floor(i / 6) * 16 - 40;
  if (Math.abs(x) < 14 && Math.abs(z + 8) < 10) continue;
  rbox(vil, 10, 5 + rnd2(i, 2) * 3, 10, ["#d9b98c", "#cfa97a", "#e3c79e"][i % 3], x, 0, z);
}
for (let i = 0; i < 8; i++) tree(vil, -60 + i * 16, 40, 1.4, "#6a9a3a");
var stalls = [];
for (let i = 0; i < 6; i++) {
  const s = grp(vil, -15 + i % 3 * 15, 0, -8 + Math.floor(i / 3) * 12);
  rbox(s, 7, 2.2, 4, "#8a6a48", 0, 0, 0);
  rbox(s, 8, 0.4, 5, ["#e8463c", "#2f5fb3", "#3f8f5a"][i % 3], 0, 4, 0);
  for (const x of [-3.6, 3.6]) rbox(s, 0.3, 4, 0.3, "#6b4a2e", x, 0, 2.2);
  for (let j = 0; j < 3; j++) mesh(new THREE.SphereGeometry(0.7, 10, 8), M(["#f08a2c", "#e8463c", "#f2c230"][j]), s, -2 + j * 2, 2.6, 0);
  stalls.push(s);
}
var villagers = [];
for (let i = 0; i < 26; i++) {
  const p = person(S2, 0, 0, ["#e6e2d8", "#7a8a5a", "#8a6a48", "#2f5fb3", "#e8463c"][i % 5], { s: 1.25, hair: i % 2 ? "#2b1d18" : "#f4f2ee" });
  villagers.push(p);
}
var kite = grp(S2, 0, 30, 0);
{
  const k = mesh(new THREE.OctahedronGeometry(2.5, 0), M("#e8463c"), kite);
  k.scale.set(1, 1.4, 0.15);
}
var DC = grp(S1, -700, 0, -200);
mesh(new THREE.BoxGeometry(300, 0.3, 260), M("#8cc06a"), DC, 0, 0.15, 0).castShadow = false;
var cap = grp(DC, 0, 0, -40);
rbox(cap, 90, 14, 26, "#f2efe8", 0, 0, 0);
rbox(cap, 30, 10, 30, "#f2efe8", 0, 14, 0);
mesh(new THREE.CylinderGeometry(11, 12, 10, 24), M("#f2efe8"), cap, 0, 29, 0);
mesh(new THREE.SphereGeometry(11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("#f7f5f0"), cap, 0, 34, 0);
mesh(new THREE.CylinderGeometry(1.2, 1.6, 6, 12), M("#f2efe8"), cap, 0, 47, 0);
for (let i = -6; i <= 6; i++) rbox(cap, 1.4, 12, 1.4, "#ffffff", i * 4.5, 0, 14);
mesh(new THREE.BoxGeometry(14, 0.5, 110), M("#2f8fb6", { roughness: 0.2 }), DC, 0, 0.4, 50);
var money = grp(DC, 50, 0, 10);
money.scale.setScalar(2.2);
var bills = [];
for (let i = 0; i < 64; i++) {
  const b = rbox(money, 6, 2.6, 3.2, M("#5aa04a", { roughness: 0.6 }), (i % 4 - 1.5) * 6.4, Math.floor(i / 16) * 2.7, (Math.floor(i / 4) % 4 - 1.5) * 3.4);
  rbox(b, 6.1, 0.5, 1, "#e9e2c6", 0, 0.95, 0);
  bills.push(b);
}
var ST = grp(S1, 700, 0, 200);
mesh(new THREE.BoxGeometry(160, 0.3, 80), M("#cfc9bd"), ST, 0, 0.15, 0).castShadow = false;
road(ST, -80, 0, 80, 0, 10, { walk: true });
for (let i = 0; i < 6; i++) building(ST, 18, 14, 16 + i % 3 * 6, -60 + i * 22, -24, { wall: WALLS[i % 7], seed: 90 + i, bay: 8 });
var poles = [];
for (let i = 0; i < 5; i++) {
  const p = grp(ST, -48 + i * 24, 0, 9);
  rbox(p, 0.5, 8, 0.5, "#4a4d55", 0, 0, 0);
  const c = rbox(p, 2.2, 1.2, 1.2, "#2a2d33", 0.9, 7.6, 0.3);
  rbox(c, 0.6, 0.6, 0.4, "#11131a", 1, 0.3, 0.5);
  poles.push(p);
}
var bench = grp(ST, 0, 0, 14);
rbox(bench, 6, 0.5, 2, "#8a5a3a", 0, 1.2, 0);
rbox(bench, 6, 1.6, 0.4, "#8a5a3a", 0, 1.2, -0.9);
for (const x of [-2.6, 2.6]) rbox(bench, 0.4, 1.2, 1.8, "#4a4d55", x, 0, 0);
var hero2 = person(ST, 0, 14, "#ffcf2e", { s: 1.3, y: 0.5 });
var phone = rbox(hero2, 0.45, 0.8, 0.1, "#1a1d24", 0.3, 1.75, 0.45);
var walkers = [];
for (let i = 0; i < 10; i++) walkers.push(person(ST, 0, 0, COLS[i % 8], { s: 1.25 }));
function dayLook(mode) {
  const sky = { day: "#9cc3e6", eve: "#9fb0d8", sunset: "#7f93c9" }[mode];
  S1.background.set(sky);
  S1.fog.color.set(sky);
  sun.color.set(mode === "day" ? "#fff1d6" : "#ffb27a");
  sun.intensity = mode === "day" ? 3 : 2.4;
  hemi.color.set(mode === "day" ? "#bcd6ff" : "#9fb4e6");
  hemi.intensity = mode === "day" ? 1.1 : 0.95;
  towerM.emissiveIntensity = mode === "day" ? 0 : 0.3;
}
function render(s, lt, k, t) {
  const sc = s.scene;
  placeCars(t);
  placeCrowd(t, sc === "evening");
  plane1.visible = sc === "sky";
  if (sc === "sky") {
    dayLook("day");
    const a = clamp(k * 0.95);
    plane1.position.set(lerp(-420, 380, a), 210, lerp(-260, -120, a));
    plane1.rotation.set(0, Math.atan2(800, 140), 0);
    return shoot(S1, new V3(lerp(170, 150, k), 150, 330), new V3(0, 110, 0), { subject: new V3(0, 120, 0), fov: 38, aper: 18 });
  }
  if (sc === "evening") {
    dayLook("eve");
    return shoot(S1, new V3(lerp(12, 4, k), 62, 175), new V3(0, 30, 0), { subject: new V3(0, 2, 48), fov: 36, aper: 12 });
  }
  if (sc === "airport") {
    dayLook("day");
    const w = sm(0.05, 0.9, k);
    hero.position.set(lerp(-1, 6, w), 0.3 + sm(0.6, 1, k) * 0, lerp(22, 11, w));
    hero.rotation.y = Math.PI + Math.atan2(7, -11) * 0 + Math.PI * 0.85;
    posePerson(hero, { walk: t * 7 });
    fam.forEach((p, i) => {
      p.rotation.y = Math.PI * 0.8;
      posePerson(p, { wave: t * 6 + i });
    });
    return shoot(S1, new V3(700 - 62, 24, -200 + 72), new V3(700 + 4, 5, -200 + 10), { subject: new V3(700, 2, -200 + 15), fov: 34, aper: 9 });
  }
  if (sc === "afghan") {
    villagers.forEach((p, i) => {
      const a = i / 26 * Math.PI * 2 + t * 0.05 * (i % 2 ? 1 : -1);
      const r = 14 + i % 3 * 5;
      p.position.set(Math.cos(a) * r, 0, -2 + Math.sin(a) * r * 0.55);
      p.rotation.y = -a + (i % 2 ? Math.PI : 0);
      posePerson(p, { walk: t * 6 + i });
    });
    kite.position.set(20 + Math.sin(t * 0.6) * 3, 34 + Math.sin(t * 0.9) * 2, -30);
    kite.rotation.z = Math.sin(t * 0.8) * 0.3;
    return shoot(S2, new V3(lerp(70, 55, k), 32, 120), new V3(0, 22, -60), { subject: new V3(0, 3, -4), fov: 40, aper: 14 });
  }
  if (sc === "money") {
    dayLook("day");
    const n = Math.floor(sm(0.05, 0.85, k) * bills.length);
    bills.forEach((b, i) => {
      b.visible = i < n;
      b.scale.setScalar(i === n - 1 ? 0.6 + 0.4 * clamp(k * bills.length * 1.25 % 1) : 1);
    });
    return shoot(S1, new V3(-700 + 140, 60, -200 + 140), new V3(-700 + 25, 16, -200 - 10), { subject: new V3(-700 + 50, 6, -200 + 10), fov: 32, aper: 14 });
  }
  if (sc === "privacy") {
    dayLook("day");
    const d = sm(0.15, 0.7, k);
    poles.forEach((p, i) => {
      p.position.y = -9 * clamp(d * 1.4 - i * 0.1);
    });
    hero2.rotation.y = 0;
    posePerson(hero2, {});
    hero2.userData.lL.rotation.x = hero2.userData.lR.rotation.x = -1.4;
    hero2.position.y = 0.5;
    walkers.forEach((p, i) => {
      const dir = i % 2 ? 1 : -1, x = ((rnd2(i, 1) * 160 + dir * t * 2.4) % 160 + 160) % 160 - 80;
      p.position.set(x, 0.35, dir > 0 ? 7.2 : -7.2 + 14.4 * 0 + (i % 3 === 0 ? 14.4 : 0) - 0);
      if (Math.abs(x) < 5 && dir > 0) p.position.x += 10;
      p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      posePerson(p, { walk: t * 7 + i, base: 0.35 });
    });
    return shoot(S1, new V3(700 + lerp(22, 14, k), 16, 200 + 46), new V3(700, 4, 200 + 10), { subject: new V3(700, 2, 200 + 14), fov: 30, aper: 7 });
  }
  dayLook("sunset");
  const u = eio(clamp(lt / Math.max(4, s.dur)));
  return shoot(S1, new V3(lerp(-150, -330, u), lerp(40, 200, u), lerp(420, 640, u)), new V3(0, lerp(90, 100, u), 0), { subject: new V3(0, 120, 0), fov: 34, aper: 24 });
}
function cards2(s, lt, k) {
  const a = sm(0.2, 0.5, lt);
  if (s.card === "lives") return card(330, `<div class="t">${L("\u0436\u0438\u0432\u044B", "alive")}</div><div class="v" style="color:#3f8f5a">2 977</div><div class="n">${L("\u0447\u0435\u043B\u043E\u0432\u0435\u043A", "people")}</div>`, a);
  if (s.card === "war0") return card(330, `<div class="t">${L("\u0432\u043E\u0439\u043D\u0430 \u0432 \u0410\u0444\u0433\u0430\u043D\u0438\u0441\u0442\u0430\u043D\u0435", "war in Afghanistan")}</div><div class="v" style="color:#3f8f5a">0 <small>${L("\u043B\u0435\u0442", "years")}</small></div>`, a);
  if (s.card === "money") return card(330, `<div class="t">${L("\u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432 \u0421\u0428\u0410", "stay in the US")}</div><div class="v" style="color:#3f8f5a">$8 <small>${L("\u0442\u0440\u043B\u043D", "trillion")}</small></div>`, a);
  return "";
}
start({ render, cards: cards2, mins: { sky: 4.5, wow: 8 }, bubbles: ["#2f5fb3", "#ffcf2e", "#e8463c"] });
