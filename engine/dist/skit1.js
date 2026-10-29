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
  const g2 = c.getContext("2d");
  const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.45, "rgba(255,255,255,.7)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g2.fillStyle = gr;
  g2.fillRect(0, 0, 64, 64);
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

// lemo/k48/toon.js
var PAL = {
  paper: "#F4EAD5",
  paperD: "#E6D8BC",
  paperDD: "#D4C29F",
  ink: "#2B2420",
  inkSoft: "#4A3F38",
  coral: "#E4613F",
  coralD: "#B8452B",
  coralL: "#F0917A",
  mustard: "#E8B43A",
  mustardD: "#C08A1E",
  mustardL: "#F3D37F",
  teal: "#3FA7A0",
  tealD: "#257A74",
  tealDD: "#1B5753",
  tealL: "#8ACFC6",
  blue: "#7F9CC0",
  blueD: "#5B789E",
  blueL: "#B5C8DE",
  pink: "#F0B4A8",
  pinkD: "#D98F82",
  avocado: "#A7AE5B",
  avocadoD: "#7E8538",
  avocadoL: "#CBD08E",
  plum: "#6E4A6B",
  brown: "#7B4B2E",
  brownL: "#A8704A",
  kraft: "#C9955D",
  kraftD: "#A2713F",
  kraftL: "#DDB47F",
  skin: "#F2C7A0",
  skinD: "#DDA37C",
  hair: "#3A2621",
  white: "#FBF6EA",
  chrome: "#C9CFCB",
  chromeD: "#8E9894"
};
function rng(seed) {
  let s = seed | 0 || 1;
  return () => {
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var hash2 = (x, y = 0, z = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
function noise(seed = 0) {
  const g2 = (ix, iy) => hash2(ix, iy, seed);
  const n = (x, y = 0) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (g2(ix, iy) * (1 - u) + g2(ix + 1, iy) * u) * (1 - v) + (g2(ix, iy + 1) * (1 - u) + g2(ix + 1, iy + 1) * u) * v;
  };
  n.fbm = (x, y, o = 4) => {
    let a = 0, w = 0.5, f = 1, s = 0;
    for (let i = 0; i < o; i++) {
      a += w * n(x * f, y * f);
      s += w;
      w *= 0.5;
      f *= 2;
    }
    return a / s;
  };
  return n;
}
var lerp2 = (a, b, t) => a + (b - a) * t;
var TAU = Math.PI * 2;
var twos = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
var REG = { dx: 6, dy: 4, jit: 1.6, on: true };
var CLOCK = 0;
function setClock(t) {
  CLOCK = t;
}
function reg(seed = 0, k = 1) {
  if (!REG.on) return [0, 0];
  const f = Math.floor(CLOCK * 12 + 1e-6);
  return [(REG.dx + (hash2(f, seed, 1) - 0.5) * 2 * REG.jit) * k, (REG.dy + (hash2(f, seed, 2) - 0.5) * 2 * REG.jit) * k];
}
function spline(pts, closed = true, n = 8) {
  const out = [], N = pts.length, get = (i) => closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))];
  const segs = closed ? N : N - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
}
var ellipse = (cx, cy, rx, ry, n = 48, a0 = 0, a1 = TAU, rot = 0) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
};
var rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function rrect(x, y, w, h, r, n = 5) {
  r = Math.min(r, w / 2, h / 2);
  const out = [];
  const c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) {
    const a = a0 + Math.PI / 2 * i / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
var move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
var xform = (pts, ox, oy, a = 0, s = 1, sy = s) => {
  const c = Math.cos(a), si = Math.sin(a);
  return pts.map(([x, y]) => [ox + c * x * s - si * y * sy, oy + si * x * s + c * y * sy]);
};
function path(ctx, pts, closed = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (closed) ctx.closePath();
}
function bbox(pts) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
}
function plen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
function subpath(pts, u) {
  if (u >= 1) return pts;
  if (u <= 0) return [pts[0]];
  const L = plen(pts) * u, out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= L) {
      const k = (L - acc) / (d || 1);
      out.push([lerp2(pts[i - 1][0], pts[i][0], k), lerp2(pts[i - 1][1], pts[i][1], k)]);
      break;
    }
    acc += d;
    out.push(pts[i]);
  }
  return out;
}
var TEX = null;
function mkc(S) {
  const c = new OffscreenCanvas(S, S);
  return [c, c.getContext("2d")];
}
function textures() {
  if (TEX) return TEX;
  const R = rng(4848), N = noise(48), S = 512;
  const [dk, g1] = mkc(S);
  for (let i = 0; i < 3600; i++) {
    const x = R() * S, y = R() * S, l = 2 + R() * 9, a = (R() - 0.5) * 0.35;
    g1.strokeStyle = `rgba(40,25,15,${0.05 + R() * 0.16})`;
    g1.lineWidth = 0.6 + R() * 1.6;
    g1.beginPath();
    g1.moveTo(x, y);
    g1.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g1.stroke();
  }
  const [lt, g2] = mkc(S);
  for (let i = 0; i < 2600; i++) {
    const x = R() * S, y = R() * S, r = 0.4 + R() * 1.3 * (N.fbm(x / 50, y / 50) + 0.2);
    g2.fillStyle = `rgba(255,250,236,${0.1 + R() * 0.32})`;
    g2.beginPath();
    g2.ellipse(x, y, r * 1.6, r, 0.1, 0, TAU);
    g2.fill();
  }
  const [pf, g3] = mkc(S);
  const img = g3.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = (N.fbm(x / 26, y / 26, 3) - 0.5) * 46 + (hash2(x, y, 7) - 0.5) * 26, i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 128 + v;
    img.data[i + 3] = 255;
  }
  g3.putImageData(img, 0, 0);
  for (let i = 0; i < 220; i++) {
    const x = R() * S, y = R() * S, a = R() * TAU, l = 6 + R() * 16;
    g3.strokeStyle = R() < 0.5 ? "rgba(90,80,60,0.3)" : "rgba(255,255,245,0.4)";
    g3.lineWidth = 0.7;
    g3.beginPath();
    g3.moveTo(x, y);
    g3.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g3.stroke();
  }
  TEX = { dk, lt, pf };
  return TEX;
}
var patCache = /* @__PURE__ */ new WeakMap();
function pat(ctx, name) {
  let m = patCache.get(ctx);
  if (!m) {
    m = {};
    patCache.set(ctx, m);
  }
  if (!m[name]) m[name] = ctx.createPattern(textures()[name], "repeat");
  return m[name];
}
function grainIn(ctx, pts, k = 0.35) {
  if (k <= 0) return;
  const [x0, y0, x1, y1] = bbox(pts);
  ctx.save();
  path(ctx, pts);
  ctx.clip();
  ctx.globalAlpha *= 0.6 * k;
  ctx.fillStyle = pat(ctx, "dk");
  ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  ctx.globalAlpha /= 0.6;
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = pat(ctx, "lt");
  ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  ctx.restore();
}
function ink(ctx, pts, w, o = {}) {
  const { color = PAL.ink, closed = false, wob = 0.4, seed = 1, breaks = 0, taper = true, alpha = 1, upto = 1 } = o;
  let P = closed ? [...pts, pts[0], pts[1] || pts[0]] : pts;
  if (upto < 1) P = subpath(P, upto);
  if (P.length < 2 || w <= 0) return;
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1];
  if (total <= 0.5) return;
  const step = Math.max(1.5, Math.min(w * 0.7, total / 600)), n = Math.max(2, Math.ceil(total / step));
  const S = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const d = total * i / n;
    while (j < L.length - 2 && L[j + 1] < d) j++;
    const u = (d - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
    S.push([P[j][0] + (P[j + 1][0] - P[j][0]) * u, P[j][1] + (P[j + 1][1] - P[j][1]) * u, d]);
  }
  const N = noise(seed * 13 + 5);
  const wid = (d) => {
    let k = 1 + wob * (N(d / (w * 16), 0.5) - 0.5) * 2;
    if (taper && !closed) {
      const e = Math.min(d, total - d) / (w * 4);
      k *= Math.min(1, 0.3 + e * 0.7);
    }
    return Math.max(0.08, k) * w * 0.5;
  };
  const runs = [];
  let cur = [];
  for (let i = 0; i < S.length; i++) {
    const gap = breaks > 0 && N(S[i][2] / (w * 11), 7.3) < breaks * 0.5;
    if (gap) {
      if (cur.length > 1) runs.push(cur);
      cur = [];
    } else cur.push(S[i]);
  }
  if (cur.length > 1) runs.push(cur);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  for (const run of runs) {
    const left = [], right = [];
    for (let i = 0; i < run.length; i++) {
      const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const r = wid(run[i][2]);
      left.push([run[i][0] + nx * r, run[i][1] + ny * r]);
      right.push([run[i][0] - nx * r, run[i][1] - ny * r]);
    }
    ctx.beginPath();
    left.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fill();
    const r0 = wid(run[0][2]), r1 = wid(run[run.length - 1][2]);
    ctx.beginPath();
    ctx.arc(run[0][0], run[0][1], r0, 0, TAU);
    ctx.arc(run[run.length - 1][0], run[run.length - 1][1], r1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function shape(ctx, pts, o = {}) {
  const { fill = null, line = 0, lineColor = PAL.ink, grain = 0.35, breaks = 0.18, seed = 1, wob = 0.4, regK = 1, alpha = 1 } = o;
  const off = o.off || reg(o.reg ?? seed, regK);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (fill) {
    const P = move(pts, off[0], off[1]);
    ctx.save();
    path(ctx, P);
    ctx.fillStyle = fill;
    ctx.fill();
    if (o.shade) {
      ctx.clip();
      for (const s of [].concat(o.shade)) {
        path(ctx, move(s.pts, off[0], off[1]));
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha * (s.alpha ?? 1);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
    }
    ctx.restore();
    grainIn(ctx, P, grain);
  }
  if (line > 0) ink(ctx, pts, line, { closed: true, color: lineColor, breaks, seed, wob });
  ctx.restore();
}
function starPts(cx, cy, r, n = 8, inner = 0.42, rot = 0, sq = 1) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r * inner : r;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]);
  }
  return out;
}
function paperFinish(ctx, W2, H2, k = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.26 * k;
  ctx.fillStyle = pat(ctx, "pf");
  ctx.fillRect(0, 0, W2, H2);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.14 * k;
  const g2 = ctx.createRadialGradient(W2 / 2, H2 * 0.48, H2 * 0.45, W2 / 2, H2 * 0.5, H2 * 1.05);
  g2.addColorStop(0, "rgba(255,255,255,0)");
  g2.addColorStop(1, "rgba(110,80,50,1)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W2, H2);
  ctx.restore();
}

// lemo/k48/chars.js
var NAVY = "#3B4766";
var NAVYD = "#2A3350";
var C = {};
var DEF = { top: PAL.coral, topD: PAL.coralD, pants: NAVY, pantsD: NAVYD, hair: PAL.hair, band: PAL.mustard, guy: false, skin: PAL.skin };
var UA = 100;
var FA = 92;
function armJoints(pose, which) {
  const view = pose.view || "q";
  const sh = view === "front" ? [which === "F" ? 46 : -46, -384] : which === "F" ? [40, -384] : [-36, -386];
  const rest = view === "front" ? which === "F" ? { a1: 1.36, a2: 1.5 } : { a1: 1.78, a2: 1.64 } : which === "F" ? { a1: 1.3, a2: 1.52 } : { a1: 1.86, a2: 1.7 };
  const arm = pose[which === "F" ? "armF" : "armB"] || rest;
  const el = [sh[0] + Math.cos(arm.a1) * UA, sh[1] + Math.sin(arm.a1) * UA];
  const ha = [el[0] + Math.cos(arm.a2) * FA, el[1] + Math.sin(arm.a2) * FA];
  return { sh, el, ha, a2: arm.a2 };
}
function toScreen(pose, p) {
  const s = pose.s ?? 1, d = pose.dir ?? 1;
  return [pose.x + p[0] * s * d, pose.y + p[1] * s];
}
function drawHand(ctx, x, y, a, kind = "open", side = 1, k = 1, skin = PAL.skin) {
  const parts = [], seps = [];
  const E = (cx, cy, rx, ry, rot = 0) => parts.push(ellipse(cx, cy, rx, ry, 18, 0, TAU, rot));
  E(12, 0, 15, 13.5);
  if (kind === "open") {
    [-0.62, 0, 0.62].forEach((r) => E(12 + Math.cos(r) * 25, Math.sin(r) * 25, 12, 5, r));
    E(4, -15 * side, 10, 5, -1.35 * side);
  } else if (kind === "flat") {
    [-10, 0, 10].forEach((dy, i) => E(34 + (i === 1 ? 3 : 0), dy, 13, 4.8));
    E(10, -15 * side, 9, 5, -0.9 * side);
    seps.push([[24, -5], [40, -5]], [[24, 5], [40, 5]]);
  } else if (kind === "point") {
    E(38, -5 * side, 19, 4.8);
    E(25, 5 * side, 7, 6);
    E(20, 11 * side, 6, 5.5);
    E(8, -14 * side, 8.5, 5, -1 * side);
  } else {
    E(26, -8, 6.5, 6.5);
    E(28, 1, 6.5, 6.5);
    E(25, 10, 6, 6);
    E(12, -14 * side, 9, 5.5, -0.4 * side);
    seps.push([[22, -3.5], [30, -3.5]], [[22, 5.5], [29, 5.5]]);
  }
  const P = parts.map((p) => xform(p, x, y, a, k));
  ctx.save();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 6 * k;
  ctx.lineJoin = "round";
  for (const p of P) {
    path(ctx, p);
    ctx.stroke();
  }
  const o = reg(77, 0.6);
  ctx.fillStyle = skin;
  for (const p of P) {
    path(ctx, move(p, o[0] * 0.5, o[1] * 0.5));
    ctx.fill();
  }
  ctx.lineWidth = 2.4 * k;
  ctx.lineCap = "round";
  for (const s2 of seps) {
    const q = xform(s2, x, y, a, k);
    ctx.beginPath();
    ctx.moveTo(...q[0]);
    ctx.lineTo(...q[1]);
    ctx.stroke();
  }
  ctx.restore();
}
function sleeve(ctx, J, seed, col) {
  col = col || C.top;
  const P = spline([J.sh, [(J.sh[0] + J.el[0]) / 2, (J.sh[1] + J.el[1]) / 2], J.el, [(J.el[0] + J.ha[0]) / 2, (J.el[1] + J.ha[1]) / 2], J.ha], false, 6);
  ink(ctx, P, 26, { seed, taper: false, wob: 0.08 });
  const o = reg(seed, 1);
  ink(ctx, move(P, o[0] * 0.6, o[1] * 0.6), 17, { seed: seed + 1, taper: false, wob: 0.05, color: col });
  const a = J.a2, cx = J.ha[0] - Math.cos(a) * 8, cy = J.ha[1] - Math.sin(a) * 8;
  ink(ctx, [[cx + Math.cos(a + 1.57) * 12, cy + Math.sin(a + 1.57) * 12], [cx - Math.cos(a + 1.57) * 12, cy - Math.sin(a + 1.57) * 12]], 3, { seed: seed + 2, taper: false, color: C.topD });
}
function drawArm(ctx, pose, which, seed) {
  const J = armJoints(pose, which);
  const prop = pose.prop && (pose.prop.hand || "F") === which ? pose.prop : null;
  if (prop && prop.behind) drawProp(ctx, prop, J, pose);
  sleeve(ctx, J, seed);
  const hk = pose[which === "F" ? "handF" : "handB"] || "open";
  drawHand(ctx, J.ha[0], J.ha[1], J.a2, hk, which === "F" ? -1 : 1, 1, C.skin);
  if (prop && !prop.behind) drawProp(ctx, prop, J, pose);
  return J;
}
function drawOwner(ctx, pose, t = 0) {
  C = Object.assign({}, DEF, pose.c || {});
  const view = pose.view || "q", face = pose.face || "neutral";
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale((pose.s ?? 1) * (pose.dir ?? 1), pose.s ?? 1);
  if (pose.shadow !== false) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.ellipse(6, 2, 86, 10, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const front = view === "front" || view === "back";
  if (pose.kneel) {
    drawKneelLegs(ctx);
    ctx.translate(0, 150);
  }
  if (view !== "back") drawArm(ctx, pose, "B", 70);
  const legs = pose.kneel ? [] : front ? [[[-44, -286], [-2, -286], [-8, -26], [-34, -26]], [[2, -286], [44, -286], [34, -26], [8, -26]]] : [[[-40, -286], [4, -286], [-4, -26], [-30, -26]], [[-2, -286], [44, -286], [34, -26], [10, -26]]];
  legs.forEach((L, i) => {
    const ax = (L[2][0] + L[3][0]) / 2;
    shape(ctx, rect(ax - 7, -30, 14, 18), { fill: C.guy ? C.pants : C.skin, line: 0, seed: 40 + i, grain: 0 });
    shape(ctx, L, { fill: C.pants, line: 3.8, seed: 42 + i, grain: 0.3, breaks: 0.15, shade: i === 1 && !front ? [{ pts: [[26, -290], [60, -290], [60, 0], [22, 0]], color: C.pantsD, alpha: 0.7 }] : null });
    const fx = ax, sh = front ? ellipse(fx, -7, 17, 8, 16) : spline([[fx - 16, -12], [fx + 6, -15], [fx + 28, -6], [fx + 24, 0], [fx - 16, 0]], true, 4);
    shape(ctx, sh, { fill: PAL.ink, line: 0, off: [0, 0], grain: 0 });
  });
  if (C.guy) {
    shape(ctx, [[-58, -404], [58, -404], [64, -284], [-64, -284]], {
      fill: C.top,
      line: 4.2,
      seed: 50,
      grain: 0.35,
      breaks: 0.2,
      shade: view === "back" || front ? null : [{ pts: [[24, -410], [80, -410], [80, -270], [30, -270]], color: C.topD, alpha: 0.55 }]
    });
    if (view !== "back") shape(ctx, [[-16, -404], [16, -404], [0, -372]], { fill: PAL.white, line: 2.6, seed: 51, grain: 0.1 });
    shape(ctx, rrect(-18, -424, 36, 26, 8), { fill: C.skin, line: 3, seed: 52, grain: 0.1, breaks: 0.2 });
  } else {
    const torso = spline([[-52, -380], [-40, -398], [40, -398], [52, -380], [44, -310], [46, -282], [-44, -282], [-46, -310]], true, 6);
    shape(ctx, torso, {
      fill: C.top,
      line: 4.2,
      seed: 50,
      grain: 0.35,
      breaks: 0.2,
      shade: view === "back" || front ? null : [{ pts: [[22, -400], [70, -400], [70, -270], [26, -270]], color: C.topD, alpha: 0.5 }]
    });
    shape(ctx, rrect(-45, -298, 91, 14, 5), { fill: C.band || PAL.mustard, line: 2.8, seed: 51, grain: 0.2, breaks: 0.3 });
    shape(ctx, rrect(-20, -424, 42, 30, 10), { fill: C.top, line: 3.4, seed: 52, grain: 0.3, breaks: 0.2 });
    for (let i = 0; i < 3; i++) ink(ctx, [[-16, -418 + i * 9], [18, -418 + i * 9]], 2, { seed: 53 + i, color: C.topD, taper: false });
  }
  drawHead(ctx, pose, view, face, t);
  if (view === "back") {
    drawArm(ctx, pose, "B", 70);
  }
  drawArm(ctx, pose, "F", 60);
  ctx.restore();
}
function drawKneelLegs(ctx) {
  const leg = (P, seed, col) => {
    ink(ctx, P, 44, { seed, taper: false, wob: 0.05 });
    const o = reg(seed, 1);
    ink(ctx, move(P, o[0] * 0.6, o[1] * 0.6), 35, { seed: seed + 1, taper: false, wob: 0.04, color: col });
  };
  leg([[-16, -128], [-20, -24], [-96, -20]], 44, NAVYD);
  shape(ctx, spline([[-150, -30], [-100, -38], [-92, -6], [-150, -4]], true, 4), { fill: PAL.ink, line: 0, off: [0, 0], grain: 0 });
  leg([[18, -128], [96, -134], [100, -30]], 46, NAVY);
  shape(ctx, spline([[84, -18], [110, -22], [140, -8], [136, 0], [84, 0]], true, 4), { fill: PAL.ink, line: 0, off: [0, 0], grain: 0 });
}
function hairQ() {
  if (C.guy) return spline([[-58, -500], [-60, -540], [-24, -572], [30, -572], [60, -540], [54, -520], [20, -530], [-20, -520], [-44, -496]], true, 6);
  return spline([[-8, -566], [-54, -546], [-74, -500], [-72, -452], [-90, -432], [-74, -424], [-50, -440], [-36, -490], [-8, -514], [28, -516], [54, -512], [60, -530], [34, -560]], true, 6);
}
function drawHead(ctx, pose, view, face, t) {
  const blink = pose.blink ?? 0, look = pose.look || [0, 0];
  if (view === "front" || view === "back") {
    const bob = C.guy ? spline([[-60, -500], [-56, -548], [0, -572], [56, -548], [60, -500], [40, -520], [0, -530], [-40, -520]], true, 6) : spline([[-64, -524], [0, -566], [64, -524], [70, -454], [92, -432], [70, -426], [0, -440], [-70, -426], [-92, -432], [-70, -454]], true, 6);
    shape(ctx, bob, { fill: C.hair, line: 0, seed: 60, grain: 0.3 });
    if (view === "back") {
      shape(ctx, spline([[-66, -520], [0, -568], [66, -520], [70, -440], [0, -418], [-70, -440]], true, 6), { fill: C.hair, line: 0, seed: 61, grain: 0.3 });
      ink(ctx, spline([[-60, -528], [-20, -560], [26, -560], [62, -528]], false, 6), 10, { color: C.band || C.hair, seed: 63, taper: false });
      return;
    }
    shape(ctx, ellipse(0, -478, 54, 64, 36), { fill: C.skin, line: 4, seed: 61, grain: 0.15, breaks: 0.25 });
    shape(ctx, spline([[-58, -500], [-44, -548], [16, -560], [60, -508], [30, -518], [-6, -510], [-32, -518]], true, 6), { fill: C.hair, line: 0, seed: 62, grain: 0.3 });
    ink(ctx, spline([[-58, -516], [-20, -552], [26, -552], [60, -516]], false, 6), 10, { color: C.band || C.hair, seed: 63, taper: false });
    [-21, 21].forEach((x, i) => eye(ctx, x + look[0], -484 + look[1], face, blink, i));
    ink(ctx, spline([[2, -482], [-7, -458], [5, -455]], false, 4), 3.4, { seed: 64 });
    mouth(ctx, 0, -436, face);
    cheeks(ctx, [[-34, -458], [34, -458]]);
    return;
  }
  shape(ctx, hairQ(), { fill: C.hair, line: 0, seed: 65, grain: 0.3 });
  const side = view === "side";
  const chain = side ? [[48, -490], [46, -512], [30, -540], [-8, -552], [-46, -536], [-60, -496], [-56, -454], [-36, -424], [-4, -410], [24, -412], [40, -424], [44, -442], [50, -458]] : [[52, -488], [50, -512], [34, -538], [-6, -552], [-44, -536], [-60, -496], [-56, -454], [-38, -424], [-8, -410], [22, -412], [38, -424], [44, -442], [52, -458]];
  const tip = side ? [94, -470] : [88, -470];
  const head = [...spline(chain, false, 6), tip];
  shape(ctx, head, { fill: C.skin, line: 4, seed: 66, grain: 0.15, breaks: 0.12 });
  shape(ctx, spline([[-44, -522], [-12, -562], [40, -552], [58, -522], [40, -514], [8, -512], [-20, -506]], true, 6), { fill: C.hair, line: 0, seed: 68, grain: 0.3 });
  ink(ctx, spline([[-54, -512], [-24, -552], [22, -560], [52, -536]], false, 6), 10, { color: C.band || C.hair, seed: 69, taper: false });
  const E = side ? [[30, -492]] : [[6, -490], [38, -493]];
  E.forEach(([x, y], i) => eye(ctx, x + look[0], y + look[1], face, blink, i, i === 1 ? 0.78 : 1));
  mouth(ctx, side ? 32 : 28, -432, face);
  cheeks(ctx, side ? [[2, -458]] : [[-14, -458]]);
}
function eye(ctx, x, y, face, blink, i, sx = 1) {
  if (face === "happy" || blink > 0.5 || face === "wink" && i === 0) {
    const up = face === "happy" || face === "wink";
    ink(ctx, up ? [[x - 8 * sx, y + 3], [x, y - 5], [x + 8 * sx, y + 3]] : [[x - 8 * sx, y], [x + 8 * sx, y]], 4, { seed: 80 + i, taper: false });
  } else {
    const r = face === "wow" ? 8.5 : 6.8;
    shape(ctx, ellipse(x, y, r * 0.8 * sx, r * 1.3, 14), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
    shape(ctx, ellipse(x + 1.5, y - 3.5, 2.2, 2.6, 8), { fill: PAL.white, line: 0, grain: 0, off: [0, 0] });
  }
  const by = face === "wow" ? y - 25 : face === "focus" ? y - 14 : y - 19, tilt = face === "focus" ? i ? -3 : 3 : 0;
  ink(ctx, [[x - 9 * sx, by + tilt], [x + 9 * sx, by - tilt - 2]], 3.4, { seed: 90 + i, taper: true });
}
function mouth(ctx, x, y, face) {
  if (face === "happy") shape(ctx, spline([[x - 16, y - 6], [x + 12, y - 8], [x + 4, y + 11], [x - 10, y + 9]], true, 6), { fill: PAL.coralD, line: 3.2, seed: 95, grain: 0, breaks: 0 });
  else if (face === "wow") shape(ctx, ellipse(x - 2, y + 2, 7, 10, 16), { fill: PAL.coralD, line: 3.2, seed: 96, grain: 0, breaks: 0 });
  else if (face === "focus") {
    ink(ctx, [[x - 12, y], [x + 8, y - 2]], 3.4, { seed: 97 });
    shape(ctx, ellipse(x + 8, y + 4, 5.5, 4.5, 10), { fill: PAL.coralL, line: 2.4, seed: 98, grain: 0, breaks: 0 });
  } else if (face === "wink") ink(ctx, spline([[x - 16, y - 4], [x - 3, y + 6], [x + 11, y - 6]], false, 5), 3.6, { seed: 99 });
  else ink(ctx, spline([[x - 12, y - 2], [x - 1, y + 4], [x + 9, y - 3]], false, 5), 3.4, { seed: 100 });
}
function cheeks(ctx, pts) {
  pts.forEach(([x, y], i) => shape(ctx, ellipse(x, y, 11, 7.5, 14), { fill: PAL.pink, line: 0, grain: 0, seed: 101 + i, alpha: 0.85 }));
}
function drawProp(ctx, prop, J, pose) {
  const [hx, hy] = J.ha;
  if (prop.kind === "phone") {
    ctx.save();
    ctx.translate(hx + (prop.dx ?? 16), hy + (prop.dy ?? -30));
    ctx.rotate(prop.rot ?? -0.2);
    shape(ctx, rrect(-26, -46, 52, 92, 10), { fill: PAL.ink, line: 0, seed: 130, grain: 0.1, off: [0, 0] });
    shape(ctx, rrect(-20, -38, 40, 70, 5), { fill: prop.screen || PAL.white, line: 0, seed: 131, grain: 0, off: [0, 0] });
    shape(ctx, ellipse(0, -8, 11, 11, 16), { fill: PAL.coral, line: 2, seed: 132, grain: 0 });
    ctx.restore();
  } else if (prop.kind === "dock") {
    drawDock(ctx, hx + (prop.dx ?? 0), hy + (prop.dy ?? 0), prop.s ?? 0.8, prop.rot ?? 0);
  } else if (prop.kind === "cable") {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      pts.push([hx + 14 + Math.sin(u * 13) * 16 * u, hy + 8 + u * (prop.len ?? 110)]);
    }
    ink(ctx, pts, 6, { seed: 133, taper: false });
    shape(ctx, rrect(pts[60][0] - 11, pts[60][1], 22, 28, 5), { fill: PAL.white, line: 3, seed: 134 });
  }
}
function drawDock(ctx, x, y, s = 1, rot = 0, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  shape(ctx, spline([[-70, 0], [-62, -104], [-40, -118], [40, -118], [62, -104], [70, 0]], true, 5), {
    fill: PAL.white,
    line: 4,
    seed: 140,
    grain: 0.25,
    shade: [{ pts: [[30, -120], [80, -120], [80, 0], [44, 0]], color: PAL.paperD }]
  });
  shape(ctx, rrect(-42, -94, 84, 44, 10), { fill: o.face || PAL.teal, line: 3.2, seed: 141, grain: 0.2 });
  for (let i = 0; i < 4; i++) ink(ctx, [[-30, -84 + i * 8], [30, -84 + i * 8]], 2.2, { seed: 142 + i, color: PAL.tealDD, taper: false });
  shape(ctx, rect(-30, -20, 16, 20), { fill: PAL.chrome, line: 2.5, seed: 146, grain: 0 });
  shape(ctx, rect(14, -20, 16, 20), { fill: PAL.chrome, line: 2.5, seed: 147, grain: 0 });
  if (o.light) shape(ctx, ellipse(0, -34, 6, 6, 10), { fill: PAL.coral, line: 2, seed: 148, grain: 0 });
  ctx.restore();
}

// lemo/k48/kit48.js
var handAt = (pose, w) => toScreen(pose, armJoints(pose, w).ha);
REG.jit = 0;
var cv = document.createElement("canvas");
cv.width = W;
cv.height = H;
var g = cv.getContext("2d");
var tex = new THREE.CanvasTexture(cv);
tex.colorSpace = THREE.SRGBColorSpace;
tex.minFilter = THREE.LinearFilter;
tex.generateMipmaps = false;
var sc = new THREE.Scene();
var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
textures();
var GUY = { top: PAL.mustard, topD: PAL.mustardD, pants: "#3B4766", pantsD: "#2A3350", hair: "#2E1E18", guy: true, band: null };
var GIRL = { top: "#E0607E", topD: "#B4445E", pants: "#6E4A6B", pantsD: "#4F3350", hair: "#7B4B2E", band: PAL.teal };
var GRAN = { top: PAL.plum, topD: "#4F3350", pants: "#5B5560", pantsD: "#423D46", hair: "#D8D4CC", band: "#B5C8DE", skin: "#EBC3A2" };
function begin(t, o = {}) {
  setClock(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  const s = W / 1080, z = o.zoom ?? 1, cx = o.cx ?? 540, cy = o.cy ?? 960;
  g.setTransform(s * z, 0, 0, s * z, (540 - cx * z) * s, (960 - cy * z) * s + (H - 1920 * s) / 2);
}
function present(k = 1) {
  paperFinish(g, W, H, k);
  tex.needsUpdate = true;
  renderer.setRenderTarget(null);
  renderer.render(sc, cam);
}
function person(pose, t, o = {}) {
  const tt = twos(t);
  const blink = o.sleep ? 1 : (tt + (o.ph ?? 0)) % 3.3 < 0.1 ? 1 : 0;
  let face = pose.face || "neutral";
  if (o.talk) face = Math.floor(tt * 8) % 2 ? "wow" : face === "wow" ? "neutral" : face;
  g.save();
  if (o.clipY != null) {
    g.beginPath();
    g.rect(-5e3, -5e3, 12e3, o.clipY + 5e3);
    g.clip();
  }
  if (o.rot) {
    const py = pose.y - 300 * (pose.s ?? 1);
    g.translate(pose.x, py);
    g.rotate(o.rot);
    g.translate(-pose.x, -py);
  }
  drawOwner(g, Object.assign({}, pose, { face, blink, shadow: pose.shadow ?? o.clipY == null }), tt);
  g.restore();
}
function planes(top, floor, y = 1240, o = {}) {
  shape(g, rect(-400, -400, 1880, y + 400), { fill: top, line: 0, off: [0, 0], grain: 0.25 });
  shape(g, rect(-400, y, 1880, 2700 - y), { fill: floor, line: 0, off: [0, 0], grain: 0.3 });
  ink(g, [[-400, y], [1480, y]], 5, { seed: 2, taper: false, breaks: 0.15 });
  if (o.burst) shape(g, starPts(o.burst[0], o.burst[1], o.burst[2] ?? 320, 16, 0.6, 0.2), { fill: PAL.white, line: 0, alpha: 0.45, off: [0, 0] });
}
function label(str, x, y, px = 70, col = PAL.ink) {
  g.save();
  g.font = `900 ${px}px Rubik, Intro, sans-serif`;
  g.fillStyle = col;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(str, x, y);
  g.restore();
}
function dress(x, y, col, colD, seed, s = 1, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  ink(g, spline([[-40, 8], [0, -14], [40, 8]], false, 5), 4, { seed });
  ink(g, spline([[0, -14], [-6, -30], [6, -40], [12, -30]], false, 5), 3.4, { seed: seed + 1 });
  shape(g, [[-24, 6], [24, 6], [30, 70], [20, 104], [74, 270], [-74, 270], [-20, 104], [-30, 70]], { fill: col, line: 4, seed: seed + 2, shade: [{ pts: [[10, 100], [80, 280], [20, 280]], color: colD, alpha: 0.6 }] });
  shape(g, rrect(-24, 96, 48, 12, 4), { fill: PAL.white, line: 2.6, seed: seed + 3 });
  g.restore();
}

// topics/skit1/scene.js
var RED = ["#D8343F", "#A92530"];
var BLUE = ["#3459C9", "#243F95"];
var UP = { armF: { a1: -0.35, a2: -1.25 }, armB: { a1: 3.5, a2: 4.4 }, handF: "grip", handB: "grip" };
var talking = (s, lt) => lt > s.vo0 - s.start - 0.05 && lt < s.vo0 - s.start + s.vd;
function shop(curtain = true) {
  planes(PAL.blueL, PAL.kraftL, 1500, { burst: [760, 700, 380] });
  if (curtain) {
    shape(g, rect(40, 380, 260, 1120), { fill: PAL.mustard, line: 4.2, seed: 11, shade: [{ pts: rect(200, 380, 100, 1120), color: PAL.mustardD, alpha: 0.5 }] });
    for (const x of [100, 160, 230]) ink(g, [[x, 420], [x + 6, 1480]], 3, { seed: x, color: PAL.mustardD, taper: false });
    ink(g, [[10, 380], [330, 380]], 9, { seed: 12, taper: false });
  }
  shape(g, rrect(860, 520, 170, 900, 80), { fill: PAL.kraft, line: 4, seed: 13 });
  shape(g, rrect(882, 545, 126, 850, 64), { fill: PAL.chrome, line: 2.5, seed: 14, shade: [{ pts: [[882, 700], [1008, 560], [1008, 640], [882, 780]], color: PAL.white, alpha: 0.5 }] });
}
function girlWithDresses(x, y, s, t, o = {}) {
  const pose = Object.assign({ c: GIRL, x, y, s, dir: 1, view: "front", face: o.face || "happy" }, o.pose || UP);
  const a = handAt(pose, "B"), b = handAt(pose, "F");
  person(pose, t, { talk: o.talk });
  if (o.red !== false) dress(a[0], a[1] + 8 * s, RED[0], RED[1], 300, s * 0.95, 0.05);
  if (o.blue !== false) dress(b[0], b[1] + 8 * s, BLUE[0], BLUE[1], 320, s * 0.95, -0.05);
}
function render(s, lt, k, t) {
  const sc2 = s.scene, talk = talking(s, lt);
  if (sc2 === "enter") {
    const g2 = s.who === "g";
    begin(t, g2 ? { zoom: 1.35, cx: 470, cy: 1080 } : { zoom: 1.2, cx: 540, cy: 1230 });
    shop();
    const gx = g2 ? 400 : lerp(250, 400, eio(clamp(lt / 1.2)));
    person({ c: GUY, x: 790, y: 1800, s: 1.35, dir: -1, view: "q", face: g2 ? "wow" : "neutral" }, t, { ph: 1.3 });
    girlWithDresses(gx, 1790, 1.35, t, { talk: g2 && talk });
    return present();
  }
  if (sc2 === "exam") {
    begin(t, { zoom: 2.1, cx: 560, cy: 1150 });
    planes(PAL.coralL, PAL.coral, 1600, { burst: [560, 1080, 420] });
    const u = eio(clamp((lt - 0.9) / 0.6));
    if (u > 0) {
      const y = lerp(1500, 930, u);
      shape(g, rrect(600, y, 190, 260, 10), { fill: PAL.white, line: 4, seed: 40 });
      for (let i = 0; i < 4; i++) ink(g, [[622, y + 60 + i * 50], [768, y + 60 + i * 50]], 4, { seed: 41 + i, taper: false, color: PAL.blueD });
      label("A+", 695, y + 30, 46, PAL.coralD);
    }
    person({ c: GUY, x: 520, y: 1900, s: 1.5, dir: 1, view: "front", face: "wow", look: [0, -3] }, t);
    return present();
  }
  if (sc2 === "think") {
    begin(t, { zoom: 1.25, cx: 540, cy: 1150 });
    planes(PAL.tealL, PAL.teal, 1650);
    const look = lt < 1.4 ? -14 : lt < 2.8 ? 14 : lt < 4 ? -14 : 0;
    const pick = sm(0.72, 0.82, k);
    dress(260, 700, RED[0], RED[1], 300, 1.25 + pick * 0.15, -0.08);
    dress(820, 700, BLUE[0], BLUE[1], 320, 1.25 - pick * 0.1, 0.08);
    person({ c: GUY, x: 540, y: 1880, s: 1.5, dir: 1, view: "front", face: pick > 0.5 ? "happy" : "focus", look: [look, 0], armF: { a1: 2.1, a2: -1.75 }, handF: "grip" }, t);
    if (pick > 0) {
      g.save();
      g.globalAlpha = pick;
      shape(g, starPts(260, 640, 120, 8, 0.5, 0.2), { fill: PAL.mustard, line: 4, seed: 60, alpha: 0.9 });
      ink(g, [[200, 640], [245, 690], [330, 570]], 16, { seed: 61, taper: false, color: PAL.ink });
      g.restore();
    }
    return present();
  }
  if (sc2 === "pause") {
    const g2 = s.who === "g";
    begin(t, { zoom: 1.7, cx: 470, cy: 1150 });
    planes(PAL.plum, "#4F3350", 1700);
    if (!g2) {
      const a = -Math.PI / 2 + Math.min(3, Math.floor(lt / 0.5)) * TAUQ;
      shape(g, ellipse(650, 720, 100, 100, 48), { fill: PAL.white, line: 5, seed: 70 });
      for (let i = 0; i < 12; i++) {
        const q = i / 12 * Math.PI * 2;
        ink(g, [[650 + Math.cos(q) * 78, 720 + Math.sin(q) * 78], [650 + Math.cos(q) * 90, 720 + Math.sin(q) * 90]], 5, { seed: 71 + i, taper: false });
      }
      ink(g, [[650, 720], [650 + Math.cos(a) * 70, 720 + Math.sin(a) * 70]], 8, { seed: 90, taper: false, color: PAL.coralD });
    }
    girlWithDresses(420, 1790, 1.35, t, { face: "focus", talk: g2 && talk, red: !g2, pose: g2 ? { armF: { a1: 0.2, a2: -0.6 }, handF: "grip", armB: { a1: 1.9, a2: 1.7 } } : UP });
    return present();
  }
  if (sc2 === "trap") {
    const g2 = s.who === "g";
    begin(t, g2 ? { zoom: 1.6, cx: 420, cy: 1150 } : { zoom: 1.15, cx: 560, cy: 1200 });
    shop(false);
    person({ c: GUY, x: g2 ? 900 : 780, y: 1800, s: 1.35, dir: -1, view: "q", face: g2 ? "wow" : "happy", armF: g2 ? void 0 : { a1: -1, a2: -1.6 }, handF: "point" }, t, { talk: !g2 && talk, ph: 0.7 });
    girlWithDresses(330, 1790, 1.35, t, { face: g2 ? "focus" : "neutral", talk: g2 && talk, pose: { armF: { a1: 0.9, a2: 2.2 }, armB: { a1: 2.2, a2: 0.9 }, handF: "grip", handB: "grip" }, red: false, blue: false });
    if (g2) {
      shape(g, starPts(330, 760, 150, 10, 0.55, 0.1), { fill: PAL.coral, line: 4, seed: 99 });
      label("?!", 330, 760, 110, PAL.white);
    }
    return present();
  }
  if (sc2 === "exit") {
    const u = eio(k);
    begin(t, { zoom: 1, cx: 540, cy: 960 });
    planes(PAL.mustardL, PAL.chrome, 1560, { burst: [300, 560, 300] });
    shape(g, rect(-200, 400, 640, 1160), { fill: PAL.blue, line: 4.2, seed: 120 });
    shape(g, rect(-120, 900, 380, 660), { fill: PAL.blueL, line: 4, seed: 121 });
    shape(g, rrect(-160, 470, 560, 150, 20), { fill: PAL.coral, line: 4, seed: 122 });
    label(EN ? "DRESSES" : "\u041F\u041B\u0410\u0422\u042C\u042F", 120, 548, 74, PAL.white);
    const x = lerp(260, 640, u), bob = Math.floor(t * 6) % 2 * 6;
    person({ c: GIRL, x: x + 210, y: 1820 - bob, s: 1.3, dir: 1, view: "q", face: "happy", armF: { a1: 1.2, a2: 0.2 }, handF: "grip" }, t);
    dress(x + 280, 1440 - bob, RED[0], RED[1], 300, 0.8, 0.3);
    dress(x + 300, 1450 - bob, BLUE[0], BLUE[1], 320, 0.8, 0.4);
    const pg = { c: GUY, x: x - 140, y: 1820 - (bob ? 0 : 6), s: 1.3, dir: 1, view: "q", face: "neutral", armF: { a1: 1.45, a2: 1.5 }, armB: { a1: 1.7, a2: 1.6 }, handF: "grip", handB: "grip" };
    person(pg, t, { ph: 0.4 });
    const hf = handAt(pg, "F"), hb = handAt(pg, "B");
    for (const [h, c, sd] of [[hb, RED, 140], [hf, BLUE, 150]]) {
      shape(g, rrect(h[0] - 60, h[1] + 20, 120, 150, 8), { fill: c[0], line: 4, seed: sd });
      ink(g, spline([[h[0] - 30, h[1] + 22], [h[0], h[1] - 6], [h[0] + 30, h[1] + 22]], false, 5), 5, { seed: sd + 1, taper: false });
    }
    const r = sm(0.45, 0.75, k);
    if (r > 0) {
      const L = r * 520;
      shape(g, [[hf[0] + 40, hf[1] - 10], [hf[0] + 110, hf[1] - 10], [hf[0] + 110, hf[1] - 10 + L], [hf[0] + 40, hf[1] - 10 + L]], { fill: PAL.white, line: 3.4, seed: 160 });
      for (let i = 0; i * 40 < L - 30; i++) ink(g, [[hf[0] + 52, hf[1] + 20 + i * 40], [hf[0] + 98, hf[1] + 20 + i * 40]], 3, { seed: 161 + i, taper: false, color: PAL.inkSoft });
    }
    return present();
  }
  begin(t, { zoom: 1.35, cx: 540, cy: 1200 });
  planes(PAL.tealL, PAL.teal, 1700, { burst: [540, 1e3, 520] });
  dress(250, 800, RED[0], RED[1], 300, 1, -0.1);
  dress(830, 800, BLUE[0], BLUE[1], 320, 1, 0.1);
  person({ c: GUY, x: 540, y: 1880, s: 1.45, dir: 1, view: "front", face: "happy", armF: { a1: -0.4, a2: -0.9 }, armB: { a1: 3.5, a2: 4 }, handF: "open", handB: "open" }, t);
  return present();
}
var TAUQ = Math.PI * 2 / 12 * 3;
start({ render, mins: { end: 3 }, bubbles: ["#E0607E", "#E8B43A", "#3FA7A0"] });
