// main.js
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
var PQ = new URLSearchParams(location.search);
var LANG = PQ.get("lang") || "ru";
var W = +(PQ.get("w") || 1080);
var H = +(PQ.get("h") || 1920);
var PORT = H > W;
document.getElementById("wrap").style.cssText = `width:${W}px;height:${H}px`;
document.getElementById("c").width = W;
document.getElementById("c").height = H;
var DICT = [["\u043A\u043E\u0448\u043A\u0438 \u0436\u0438\u0432\u0443\u0442", "cats live"], ["\u0441\u043E\u0431\u0430\u043A\u0438 \u0436\u0438\u0432\u0443\u0442", "dogs live"], ["<small>\u043B\u0435\u0442</small>", "<small>years</small>"], ["\u0430 \u0442\u044B \u2014 \u043E\u043A\u043E\u043B\u043E 70\u201380", "you live about 70\u201380"], ["\u0440\u0435\u043A\u043E\u0440\u0434 \u0433\u0438\u043D\u043D\u0435\u0441\u0441\u0430", "guinness record"], ["\u043A\u043E\u0448\u043A\u0430 \u041A\u0440\u0435\u043C \u041F\u0430\u0444\u0444, \u0421\u0428\u0410", "Creme Puff, USA"], ["\u0441\u043E\u0431\u0430\u043A\u0430 \u0411\u043B\u0443\u0438, \u0410\u0432\u0441\u0442\u0440\u0430\u043B\u0438\u044F", "Bluey, Australia"], ["\u0427\u0422\u041E \u0415\u0421\u041B\u0418\u2026", "WHAT IF\u2026"]];
var TR = (s) => LANG === "en" ? DICT.reduce((a, [r, e]) => a.split(r).join(e), s) : s;
var VID = new URLSearchParams(location.search).get("v") || "A";
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
  const d = new Uint8Array([110, 185, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
var T = (color, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradTex }, o));
var B = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, o));
var olMats = {};
function olMat(th2) {
  const k = th2;
  if (olMats[k]) return olMats[k];
  return olMats[k] = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: `void main(){ vec3 p = position + normal * ${th2.toFixed(4)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`, fragmentShader: `void main(){ gl_FragColor = vec4(.08,.05,.16,1.); }` });
}
var smoothCache = /* @__PURE__ */ new WeakMap();
function ol(mesh, th2) {
  let g = smoothCache.get(mesh.geometry);
  if (!g) {
    const p = new THREE.BufferGeometry();
    p.setAttribute("position", mesh.geometry.attributes.position.clone());
    if (mesh.geometry.index) p.setIndex(mesh.geometry.index.clone());
    g = mergeVertices(p, 1e-3);
    g.computeVertexNormals();
    smoothCache.set(mesh.geometry, g);
  }
  const o = new THREE.Mesh(g, olMat(th2));
  mesh.add(o);
  return mesh;
}
function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], sc = null, th2 = 0.016) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (sc) m.scale.set(...sc);
  if (th2) ol(m, th2);
  parent.add(m);
  return m;
}
var G = (parent, pos = [0, 0, 0], rot = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
};
var dotTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.5, "rgba(255,255,255,.6)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
var Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
var Sph = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);
var Cap = (r, l, s = 12) => new THREE.CapsuleGeometry(r, l, 5, s);
var Cyl = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
function capDown(r, len) {
  const g = Cap(r, len);
  g.translate(0, -len / 2, 0);
  return g;
}
var SC = DATA.scripts[VID];
var META = DATA.meta[VID];
var shots = SC.shots.map((s, i) => Object.assign({}, s, META[i]));
var acc = 0;
shots.forEach((s, i) => {
  const lead = i === 0 ? 0.9 : 0.15;
  let d = lead + s.dur + 0.45;
  if (i === shots.length - 1) d += 1.6;
  s.start = acc;
  s.len = d;
  s.vo0 = acc + lead;
  acc += d;
  s.words = [];
  s.segs.forEach((g, gi) => {
    if (g.who !== "n") return;
    const ws = [];
    g.text.split("*").forEach((seg, si) => seg.split(/\s+/).filter(Boolean).forEach((w) => ws.push({ t: w, h: si % 2 === 1 })));
    const ws2 = ws.reduce((a, w) => {
      if (/^[.,:;!?…»—]+$/.test(w.t) && a.length) a[a.length - 1].t += w.t === "\u2014" ? " \u2014" : w.t;
      else a.push(w);
      return a;
    }, []);
    const g0 = s.vo0 + g.t0;
    const assign = (list, a0, a1) => {
      const tot = list.reduce((a, w) => a + w.t.length + 2, 0);
      let c = 0;
      list.forEach((w) => {
        w.a = a0 + (a1 - a0) * c / tot;
        c += w.t.length + 2;
        w.b = a0 + (a1 - a0) * c / tot;
        w.g = gi;
        s.words.push(w);
      });
    };
    if (g.phr) {
      let wi = 0;
      g.phr.forEach(([pa, pb, ptxt]) => {
        const n = ptxt.split(/\s+/).filter(Boolean).filter((x) => !/^[.,:;!?…»—]+$/.test(x)).length;
        const list = ws2.slice(wi, wi + n);
        wi += n;
        assign(list, s.vo0 + pa, s.vo0 + pb);
      });
      if (wi < ws2.length) assign(ws2.slice(wi), s.vo0 + g.t0 + g.dur * 0.9, s.vo0 + g.t0 + g.dur);
    } else assign(ws2, g0, g0 + g.dur * 0.95);
  });
  const ch = [];
  let cur = [];
  s.words.forEach((w, j) => {
    if (cur.length && s.words[cur[0]].g !== w.g) {
      ch.push(cur);
      cur = [];
    }
    cur.push(j);
    if (cur.length >= 3 || /[.,:;!?…—]$/.test(w.t)) {
      ch.push(cur);
      cur = [];
    }
  });
  if (cur.length) ch.push(cur);
  s.chunks = ch;
  s.thoughts = s.segs.filter((g) => g.who === "p").map((g) => ({ text: g.text, a: s.vo0 + g.t0, b: s.vo0 + g.t0 + g.dur }));
});
var TOTAL = acc;
window.TL = { total: TOTAL, shots: shots.map((s) => ({ scene: s.scene, start: s.start, dur: s.len, vo0: s.vo0, badge: s.badge })) };
var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
var camera = new THREE.PerspectiveCamera(60, W / H, 0.03, 400);
camera.fov = PORT ? 2 * Math.atan(Math.tan(24 * Math.PI / 180) / (W / H)) * 180 / Math.PI : 54;
camera.updateProjectionMatrix();
var composer = new EffectComposer(renderer);
var rp = new RenderPass(new THREE.Scene(), camera);
composer.addPass(rp);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) { c = texture2D(tDiffuse, vUv + vec2(.002,0.)); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); } gl_FragColor = clamp(c, 0., 3.); }" }));
var bloomPass = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.45, 0.5, 0.95);
if (!location.search.includes("nobloom")) composer.addPass(bloomPass);
composer.addPass(new OutputPass());
var shake = 0;
function setCam(pos, tgt, t = 0) {
  if (!PORT) pos = pos.clone().sub(tgt).multiplyScalar(1.12).add(tgt);
  camera.position.copy(pos);
  if (shake) camera.position.add(V(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, 0));
  camera.lookAt(tgt);
}
function makeHuman(o = {}) {
  const top = T(o.top ?? 5209343), pants = T(o.pants ?? 2830149), skin = T(o.skin ?? 16762528), hairM = T(o.hair ?? 5911584), white = T(15790326), blk = B(1313834), shoe = T(o.shoe ?? 16777215), cheek = B(16748442, { transparent: true, opacity: 0.55 });
  const J = { mats: { hair: hairM, top } };
  const root = new THREE.Group();
  J.root = root;
  const spine = G(root);
  J.spine = spine;
  add(spine, Cap(0.2, 0.2, 16), top, [0, 0.25, 0], [0, 0, 0], [1.05, 1, 0.85], 0.016);
  if (o.dress) add(spine, new THREE.ConeGeometry(0.3, 0.4, 18), top, [0, 0.02, 0], [0, 0, 0], null, 0.016);
  if (o.cardigan) {
    add(spine, Box(0.04, 0.3, 0.02), T(16777215), [-0.03, 0.25, 0.18], [0, 0, 0], null, 0);
  }
  const neck = G(spine, [0, 0.52, 0]);
  J.neck = neck;
  const head = G(neck, [0, 0.04, 0]);
  J.head = head;
  add(head, Sph(0.24, 28, 22), skin, [0, 0.22, 0], [0, 0, 0], [1, 0.95, 0.95], 0.016);
  if (o.hairStyle !== "bald") {
    add(head, new THREE.SphereGeometry(0.252, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, [0, 0.235, -0.015], [-0.35, 0, 0], null, 0.014);
    add(head, Sph(0.09, 12, 10), hairM, [0.06, 0.44, 0.1], [0.4, 0, -0.3], [1.4, 0.7, 1], 0.012);
  } else add(head, new THREE.SphereGeometry(0.25, 28, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.3), hairM, [0, 0.22, -0.02], [-0.2, 0, 0], null, 0.012);
  if (o.hairStyle === "long") {
    add(head, Cap(0.2, 0.25, 16), hairM, [0, 0.1, -0.1], [0, 0, 0], [1.15, 1, 0.7], 0.014);
    for (const x of [-0.2, 0.2]) add(head, Cap(0.06, 0.2, 10), hairM, [x, 0.1, 0.05], [0, 0, 0], null, 0.012);
    add(head, Sph(0.06, 10, 8), T(16735370), [0.15, 0.42, 0.05], [0, 0, 0], null, 0.01);
  }
  for (const x of [-0.235, 0.235]) add(head, Sph(0.05, 10, 8), skin, [x, 0.2, 0], [0, 0, 0], [0.6, 1, 1], 0.01);
  J.eyes = [];
  J.pupils = [];
  J.brows = [];
  for (const x of [-0.085, 0.085]) {
    const eg = G(head, [x, 0.23, 0.2]);
    add(eg, Sph(0.056, 16, 12), white, [0, 0, 0], [0, 0, 0], [1, 1.15, 0.45], 8e-3);
    const pu = G(eg);
    add(pu, Sph(0.034, 14, 10), blk, [0, 0, 0.02], [0, 0, 0], [1, 1.1, 0.5], 0);
    add(pu, Sph(0.011, 8, 6), B(16777215), [0.012, 0.015, 0.04], [0, 0, 0], null, 0);
    J.eyes.push(eg);
    J.pupils.push(pu);
    J.brows.push(add(head, Cap(0.014, 0.07, 8), hairM, [x, 0.325, 0.2], [0, 0, Math.PI / 2], null, 6e-3));
  }
  if (o.glasses) for (const x of [-0.085, 0.085]) add(head, new THREE.TorusGeometry(0.07, 0.012, 6, 20), blk, [x, 0.23, 0.23], [0, 0, 0], null, 0);
  if (o.beard) add(head, Sph(0.2, 20, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hairM, [0, 0.2, 0.03], [0, 0, 0], [1, 1, 1], 0.012);
  for (const x of [-0.15, 0.15]) add(head, new THREE.CircleGeometry(0.035, 14), cheek, [x, 0.15, 0.215], [0, x * 2.5, 0], null, 0);
  add(head, Sph(0.025, 10, 8), skin, [0, 0.18, 0.235], [0, 0, 0], null, 6e-3);
  const mg = G(head, [0, 0.105, 0.215]);
  J.mouths = {};
  J.mouths.smile = add(mg, new THREE.TorusGeometry(0.045, 0.012, 6, 16, Math.PI), blk, [0, 0.02, 0], [0, 0, Math.PI], null, 0);
  J.mouths.frown = add(mg, new THREE.TorusGeometry(0.035, 0.011, 6, 16, Math.PI), blk, [0, -0.015, 0], [0, 0, 0], null, 0);
  J.mouths.line = add(mg, Cap(9e-3, 0.045, 6), blk, [0, 0, 0], [0, 0, Math.PI / 2], null, 0);
  const om = G(mg);
  J.mouths.open = om;
  add(om, Sph(0.05, 14, 10), B(5902368), [0, 0, 0], [0, 0, 0], [1, 1.1, 0.35], 8e-3);
  add(om, Sph(0.03, 10, 8), B(16743818), [0, -0.025, 0.01], [0, 0, 0], [1.1, 0.6, 0.4], 0);
  const L1 = 0.17, L2 = 0.16;
  J.L1 = L1;
  J.L2 = L2;
  for (const [s, side] of [["l", 1], ["r", -1]]) {
    const sh = G(spine, [side * 0.22, 0.38, 0]);
    add(sh, capDown(0.058, L1), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    const el = G(sh, [0, -L1, 0]);
    add(el, capDown(0.052, L2), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(el, Sph(0.06, 14, 10), skin, [0, -L2 - 0.03, 0], [0, 0, 0], null, 0.01);
    J[s + "Sh"] = sh;
    J[s + "El"] = el;
    const hip = G(root, [side * 0.1, 0.02, 0]);
    add(hip, capDown(0.075, 0.19), pants, [0, 0, 0], [0, 0, 0], null, 0.012);
    const kn = G(hip, [0, -0.19, 0]);
    add(kn, capDown(0.068, 0.17), pants, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(kn, Cap(0.07, 0.08, 10), shoe, [0, -0.25, 0.05], [Math.PI / 2, 0, 0], null, 0.01);
    J[s + "Hip"] = hip;
    J[s + "Kn"] = kn;
  }
  root.scale.setScalar(o.scale || 1);
  return J;
}
function face(J, f = {}) {
  const mo = f.mouth || "smile";
  for (const k in J.mouths) J.mouths[k].visible = k === mo;
  if (mo === "open") J.mouths.open.scale.set(1, f.open || 1, 1);
  const bl = f.blink ? 0.08 : f.eye || 1;
  J.eyes.forEach((e) => e.scale.set(1, bl, 1));
  const lk = f.look || [0, 0];
  J.pupils.forEach((p) => {
    p.position.set(lk[0] * 0.022, lk[1] * 0.022, 0);
  });
  J.brows.forEach((b, i) => {
    b.rotation.z = Math.PI / 2 + (i ? -1 : 1) * (f.brow || 0);
    b.position.y = 0.325 + (f.browY || 0);
  });
}
var R3 = (o, a) => o.rotation.set(a[0] || 0, a[1] || 0, a[2] || 0);
var STAND = { lHip: [0, 0, 0.04], rHip: [0, 0, -0.04], lKn: [0], rKn: [0] };
var SIT = { lHip: [-1.5, 0, 0.08], rHip: [-1.5, 0, -0.08], lKn: [1.45], rKn: [1.45] };
function pose(J, p) {
  R3(J.spine, p.spine || [0]);
  R3(J.neck, p.neck || [0]);
  R3(J.head, p.head || [0]);
  R3(J.lSh, p.lSh || [0, 0, 0.15]);
  R3(J.rSh, p.rSh || [0, 0, -0.15]);
  R3(J.lEl, p.lEl || [-0.3]);
  R3(J.rEl, p.rEl || [-0.3]);
  R3(J.lHip, p.lHip || [0]);
  R3(J.rHip, p.rHip || [0]);
  R3(J.lKn, p.lKn || [0]);
  R3(J.rKn, p.rKn || [0]);
}
var P = (...ps) => Object.assign({}, ...ps);
function walkPose(t, sp = 8, amp = 0.5) {
  const s = Math.sin(t * sp);
  return { lHip: [s * amp], rHip: [-s * amp], lKn: [Math.max(0, -s) * 0.6], rKn: [Math.max(0, s) * 0.6], lSh: [-s * 0.5, 0, 0.12], rSh: [s * 0.5, 0, -0.12], lEl: [-0.4], rEl: [-0.4], spine: [0.04] };
}
function makeCat(o = {}) {
  const fur = T(o.fur ?? 16751164), fur2 = T(o.fur2 ?? 14248476), wh = T(16774894), pink = T(16752560), blk = B(1313834);
  const C = { kind: "cat", mats: { fur, fur2, wh } };
  const root = new THREE.Group();
  C.root = root;
  const body = G(root, [0, 0.26, 0]);
  C.body = body;
  add(body, Cap(0.15, 0.3, 16), fur, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], 0.014);
  add(body, Sph(0.12, 16, 12), wh, [0, -0.02, 0.17], [0, 0, 0], [1, 1.05, 0.8], 0.012);
  for (let i = 0; i < 3; i++) add(body, new THREE.TorusGeometry(0.152, 0.022, 6, 20, Math.PI * 0.9), fur2, [0, 0, -0.12 + i * 0.1], [0, Math.PI / 2, Math.PI * 0.05], [1, 1, 1], 0);
  const head = G(body, [0, 0.17, 0.25]);
  C.head = head;
  add(head, Sph(0.155, 22, 16), fur, [0, 0, 0], [0, 0, 0], [1.12, 0.95, 1], 0.014);
  add(head, Sph(0.07, 14, 10), wh, [0, -0.055, 0.11], [0, 0, 0], [1.4, 0.85, 0.8], 8e-3);
  for (const x of [-0.09, 0.09]) {
    const e = add(head, new THREE.ConeGeometry(0.065, 0.13, 12), fur, [x, 0.13, -0.01], [0, 0, x > 0 ? -0.35 : 0.35], null, 0.012);
    add(e, new THREE.ConeGeometry(0.035, 0.08, 10), pink, [0, -0.01, 0.03], [0, 0, 0], null, 0);
  }
  C.eyes = [];
  C.lids = [];
  for (const x of [-0.065, 0.065]) {
    const eg = G(head, [x, 0.02, 0.13]);
    add(eg, Sph(0.045, 14, 10), T(10216299), [0, 0, 0], [0, 0, 0], [1, 1.1, 0.45], 7e-3);
    add(eg, Sph(0.03, 10, 8), blk, [0, 0, 0.015], [0, 0, 0], [0.45, 1.1, 0.5], 0);
    add(eg, Sph(0.01, 6, 5), B(16777215), [0.012, 0.018, 0.03], [0, 0, 0], null, 0);
    const lid = add(eg, new THREE.SphereGeometry(0.049, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), fur, [0, 0, 3e-3], [0, 0, 0], [1, 1.15, 0.5], 0);
    C.eyes.push(eg);
    C.lids.push(lid);
  }
  add(head, Sph(0.02, 10, 8), pink, [0, -0.025, 0.16], [0, 0, 0], [1.2, 0.8, 0.8], 5e-3);
  C.mouth = G(head, [0, -0.065, 0.155]);
  for (const x of [-0.018, 0.018]) add(C.mouth, new THREE.TorusGeometry(0.018, 6e-3, 5, 12, Math.PI), blk, [x, 5e-3, 0], [0, 0, Math.PI], null, 0);
  C.mouthO = add(head, Sph(0.03, 10, 8), B(5902368), [0, -0.07, 0.15], [0, 0, 0], [1, 1.2, 0.4], 5e-3);
  C.mouthO.visible = false;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(head, Box(0.13, 4e-3, 4e-3), blk, [s * 0.13, -0.04 + i * 0.02, 0.1], [0, 0, s * (i - 1) * 0.15], null, 0);
  C.legs = {};
  for (const [k, x, z] of [["fl", 0.075, 0.16], ["fr", -0.075, 0.16], ["bl", 0.08, -0.16], ["br", -0.08, -0.16]]) {
    const g = G(body, [x, -0.04, z]);
    add(g, capDown(0.042, 0.17), fur, [0, 0, 0], [0, 0, 0], null, 0.01);
    C.legs[k] = g;
    C.legs[k].paw = add(g, Sph(0.05, 10, 8), wh, [0, -0.22, 0.015], [0, 0, 0], [1, 0.7, 1.2], 8e-3);
  }
  C.tail = [];
  let par = G(body, [0, 0.06, -0.29]);
  for (let i = 0; i < 7; i++) {
    add(par, capDown(0.034, 0.05), i > 4 ? fur2 : fur, [0, 0, 0], [0, 0, 0], null, 8e-3);
    C.tail.push(par);
    par = G(par, [0, -0.075, 0]);
  }
  root.scale.setScalar(o.scale || 1);
  return C;
}
function catPose(C, p, t) {
  const m = p.mode || "stand";
  const B0 = C.body;
  B0.rotation.set(0, 0, 0);
  const L = C.legs;
  Object.values(L).forEach((l) => {
    l.rotation.set(0, 0, 0);
    l.scale.set(1, 1, 1);
    l.visible = true;
  });
  C.head.position.set(0, 0.17, 0.25);
  C.head.rotation.set(...p.head || [0, 0, 0]);
  if (m === "stand") {
    B0.position.set(0, 0.26, 0);
  } else if (m === "walk") {
    B0.position.set(0, 0.26 + Math.abs(Math.sin(t * 10)) * 0.01, 0);
    const s = Math.sin(t * 10) * 0.45;
    L.fl.rotation.x = s;
    L.br.rotation.x = s;
    L.fr.rotation.x = -s;
    L.bl.rotation.x = -s;
  } else if (m === "sit") {
    B0.position.set(0, 0.29, -0.06);
    B0.rotation.x = -0.85;
    L.fl.rotation.x = 0.85;
    L.fr.rotation.x = 0.85;
    L.fl.scale.y = L.fr.scale.y = 1.35;
    L.bl.rotation.x = -0.6;
    L.br.rotation.x = -0.6;
    L.bl.scale.y = L.br.scale.y = 0.55;
    C.head.position.set(0, 0.2, 0.2);
    C.head.rotation.x += 0.85;
  } else if (m === "lie" || m === "curl") {
    B0.position.set(0, 0.16, 0);
    L.fl.rotation.x = -1.45;
    L.fr.rotation.x = -1.45;
    L.bl.rotation.x = -1.4;
    L.br.rotation.x = -1.4;
    L.bl.scale.y = L.br.scale.y = 0.6;
    if (m === "curl") {
      C.head.position.set(0.05, 0.06, 0.24);
      C.head.rotation.set(0.35, 0.5, 0.2);
    }
  }
  if (p.paw) {
    const l = L[p.pawLeg || "fr"];
    l.rotation.x = -p.paw * 1.4;
    l.scale.y = 1 + p.paw * 0.2;
  }
  if (p.knead) {
    L.fl.rotation.x += Math.max(0, Math.sin(t * 7)) * 0.5;
    L.fr.rotation.x += Math.max(0, -Math.sin(t * 7)) * 0.5;
  }
  const tw = p.tailWave ?? 1;
  C.tail.forEach((g, i) => {
    if (i === 0) {
      g.rotation.set(m === "sit" ? 0.2 : -0.9, 0, 0);
    } else g.rotation.set(-0.25 + Math.sin(t * 2.2 - i * 0.6) * 0.05 * tw, 0, Math.sin(t * 2 - i * 0.5) * 0.22 * tw);
    if (m === "curl" && i > 0) g.rotation.set(-0.1, 0, 0.45);
  });
  const bl = p.blink ?? (t % 3.1 < 0.12 ? 1 : 0);
  C.lids.forEach((l) => {
    l.visible = bl > 0.05;
    l.scale.y = 1.15 * bl;
    l.rotation.x = 0;
  });
  if (p.sleep) C.lids.forEach((l) => {
    l.visible = true;
    l.scale.y = 1.15;
  });
  C.mouthO.visible = !!p.meow;
  C.mouth.visible = !p.meow;
  if (p.purr) B0.scale.set(1 + Math.sin(t * 30) * 6e-3, 1 + Math.sin(t * 3) * 0.02, 1);
  else B0.scale.set(1, 1, 1);
}
function makeDog(o = {}) {
  const fur = T(o.fur ?? 15769680), wh = T(16774894), dark = T(5911584), blk = B(1313834), pink = T(16743818);
  const D = { kind: "dog", mats: { fur, wh } };
  const root = new THREE.Group();
  D.root = root;
  const body = G(root, [0, 0.25, 0]);
  D.body = body;
  add(body, Cap(0.17, 0.42, 16), fur, [0, 0, 0], [Math.PI / 2, 0, 0], null, 0.015);
  add(body, Sph(0.14, 16, 12), wh, [0, -0.03, 0.22], [0, 0, 0], [1, 1.05, 0.9], 0.012);
  const head = G(body, [0, 0.2, 0.32]);
  D.head = head;
  add(head, Sph(0.165, 22, 16), fur, [0, 0, 0], [0, 0, 0], [1.08, 1, 1], 0.015);
  add(head, Cap(0.075, 0.1, 12), wh, [0, -0.05, 0.14], [Math.PI / 2, 0, 0], [1.1, 1, 0.9], 0.01);
  add(head, Box(0.035, 0.14, 0.02), wh, [0, 0.07, 0.155], [-0.2, 0, 0], null, 0);
  add(head, Sph(0.035, 10, 8), blk, [0, -0.02, 0.24], [0, 0, 0], [1.2, 0.9, 0.9], 6e-3);
  D.ears = [];
  for (const x of [-0.1, 0.1]) {
    const e = G(head, [x, 0.12, -0.02], [0, 0, x > 0 ? -0.3 : 0.3]);
    add(e, new THREE.ConeGeometry(0.075, 0.19, 12), fur, [0, 0.07, 0], [0, 0, 0], [1, 1, 0.55], 0.012);
    add(e, new THREE.ConeGeometry(0.045, 0.13, 10), pink, [0, 0.05, 0.02], [0, 0, 0], [1, 1, 0.4], 0);
    D.ears.push(e);
  }
  D.eyes = [];
  D.lids = [];
  for (const x of [-0.07, 0.07]) {
    const eg = G(head, [x, 0.04, 0.13]);
    add(eg, Sph(0.042, 14, 10), T(15790326), [0, 0, 0], [0, 0, 0], [1, 1.1, 0.45], 7e-3);
    add(eg, Sph(0.032, 12, 8), blk, [0, 0, 0.014], [0, 0, 0], [1, 1.1, 0.5], 0);
    add(eg, Sph(0.011, 6, 5), B(16777215), [0.012, 0.016, 0.03], [0, 0, 0], null, 0);
    const lid = add(eg, new THREE.SphereGeometry(0.046, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), fur, [0, 0, 3e-3], [0, 0, 0], [1, 1.15, 0.5], 0);
    D.eyes.push(eg);
    D.lids.push(lid);
  }
  D.tongue = add(head, Cap(0.028, 0.05, 8), pink, [0, -0.12, 0.17], [0.3, 0, 0], [1, 1, 0.4], 6e-3);
  D.mouth = add(head, new THREE.TorusGeometry(0.03, 7e-3, 5, 12, Math.PI), blk, [0, -0.085, 0.205], [0, 0, Math.PI], null, 0);
  D.legs = {};
  for (const [k, x, z] of [["fl", 0.09, 0.22], ["fr", -0.09, 0.22], ["bl", 0.09, -0.2], ["br", -0.09, -0.2]]) {
    const g = G(body, [x, -0.08, z]);
    add(g, capDown(0.05, 0.08), fur, [0, 0, 0], [0, 0, 0], null, 0.01);
    add(g, Sph(0.055, 10, 8), wh, [0, -0.14, 0.015], [0, 0, 0], [1, 0.7, 1.2], 8e-3);
    D.legs[k] = g;
  }
  D.tail = G(body, [0, 0.06, -0.36]);
  add(D.tail, Sph(0.07, 12, 10), fur, [0, 0.03, -0.02], [0, 0, 0], [1, 1.3, 1], 0.01);
  if (o.collar !== false) add(body, new THREE.TorusGeometry(0.13, 0.025, 8, 20), T(16730972), [0, 0.1, 0.3], [0.4, 0, 0], null, 6e-3);
  root.scale.setScalar(o.scale || 1);
  return D;
}
function dogPose(D, p, t) {
  const m = p.mode || "stand", B0 = D.body;
  B0.rotation.set(0, 0, 0);
  const L = D.legs;
  Object.values(L).forEach((l) => {
    l.rotation.set(0, 0, 0);
    l.scale.set(1, 1, 1);
  });
  D.head.position.set(0, 0.2, 0.32);
  D.head.rotation.set(...p.head || [0, 0, 0]);
  if (m === "stand") B0.position.set(0, 0.25, 0);
  else if (m === "run" || m === "walk") {
    const f = m === "run" ? 16 : 9, a = m === "run" ? 0.8 : 0.5, s = Math.sin(t * f);
    B0.position.set(0, 0.25 + Math.abs(s) * (m === "run" ? 0.04 : 0.01), 0);
    B0.rotation.x = s * (m === "run" ? 0.08 : 0);
    L.fl.rotation.x = s * a;
    L.fr.rotation.x = s * a * 0.8;
    L.bl.rotation.x = -s * a;
    L.br.rotation.x = -s * a * 0.8;
  } else if (m === "sit") {
    B0.position.set(0, 0.27, -0.06);
    B0.rotation.x = -0.7;
    L.fl.rotation.x = 0.7;
    L.fr.rotation.x = 0.7;
    L.fl.scale.y = L.fr.scale.y = 1.6;
    L.bl.rotation.x = -0.9;
    L.br.rotation.x = -0.9;
    D.head.position.set(0, 0.22, 0.28);
    D.head.rotation.x += 0.7;
  } else if (m === "lie") {
    B0.position.set(0, 0.15, 0);
    L.fl.rotation.x = -1.5;
    L.fr.rotation.x = -1.5;
    L.bl.rotation.x = 1.5;
    L.br.rotation.x = 1.5;
  } else if (m === "side") {
    B0.position.set(0, 0.17, 0);
    B0.rotation.z = 1.4;
    const s = Math.sin(t * (p.paddle ? 14 : 0)) * (p.paddle ? 0.5 : 0);
    L.fl.rotation.x = 0.5 + s;
    L.fr.rotation.x = 0.5 - s;
    L.bl.rotation.x = -0.5 - s;
    L.br.rotation.x = -0.5 + s;
  }
  const wag = p.wag ?? 1;
  D.tail.rotation.set(-0.3, Math.sin(t * (wag > 1 ? 26 : 14)) * 0.6 * Math.min(1, wag), 0);
  D.ears.forEach((e, i) => e.rotation.x = p.earsBack ? -0.7 : Math.sin(t * 3 + i) * 0.05);
  const bl = p.blink ?? (t % 3.4 < 0.12 ? 1 : 0);
  D.lids.forEach((l) => {
    l.visible = bl > 0.05 || p.sleep;
    l.scale.y = 1.15 * (p.sleep ? 1 : bl);
  });
  D.tongue.visible = p.tongue ?? true;
  D.tongue.scale.y = 1 + Math.sin(t * 10) * 0.1;
}
function tintPet(P0, old) {
  if (P0.kind === "cat") {
    P0.mats.fur.color.set(old ? 15181940 : 16751164);
    P0.mats.fur2.color.set(old ? 13208156 : 14248476);
  } else P0.mats.fur.color.set(old ? 14463882 : 15769680);
}
function petHead(P0) {
  return P0.head.localToWorld(V(0, 0.22, 0));
}
var room = new THREE.Scene();
var rHemi = new THREE.HemisphereLight(16774374, 9071242, 1.6);
room.add(rHemi);
var rSun = new THREE.DirectionalLight(16773336, 1.6);
rSun.position.set(2, 5, 4);
room.add(rSun);
var rLamp = new THREE.PointLight(16763008, 0, 7, 1.3);
rLamp.position.set(-2.2, 1.9, -1.8);
room.add(rLamp);
var rFill = new THREE.PointLight(11061503, 0, 6, 1.5);
room.add(rFill);
room.background = new THREE.Color(1708083);
add(room, Box(9, 0.2, 8), T(14722154), [0, -0.1, 0], [0, 0, 0], null, 0.02);
for (let i = 0; i < 9; i++) add(room, Box(0.02, 5e-3, 8), B(12879951), [-4.5 + i, 2e-3, 0], [0, 0, 0], null, 0);
var wallM = T(16178376);
var wall2 = T(13166300);
add(room, Box(9, 7, 0.2), wallM, [0, 3.5, -3.1], [0, 0, 0], null, 0.02);
add(room, Box(0.2, 7, 8), wall2, [-4.1, 3.5, 0], [0, 0, 0], null, 0.02);
add(room, Box(0.2, 7, 8), wall2, [4.6, 3.5, 0], [0, 0, 0], null, 0.02);
add(room, Box(1.4, 0.2, 8), T(14722154), [5.2, -0.1, 0], [0, 0, 0], null, 0);
add(room, Box(9, 0.15, 0.1), T(16777215), [0, 0.07, -3], [0, 0, 0], null, 0.01);
for (let i = 0; i < 18; i++) add(room, new THREE.CircleGeometry(0.05, 10), B(15780016), [-4 + i % 6 * 1.4 + Math.floor(i / 6) % 2 * 0.7, 1.2 + Math.floor(i / 6) * 0.9, -2.99], [0, 0, 0], null, 0);
var win = G(room, [1.3, 1.9, -2.98]);
var skyMat = new THREE.ShaderMaterial({ uniforms: { a: { value: new THREE.Color(9425151) }, b: { value: new THREE.Color(14217471) } }, vertexShader: "varying vec2 u; void main(){ u = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec2 u; void main(){ gl_FragColor = vec4(mix(b,a,u.y),1.); }" });
add(win, new THREE.PlaneGeometry(1.6, 1.5), skyMat, [0, 0, 0.01], [0, 0, 0], null, 0);
var winSun = add(win, new THREE.CircleGeometry(0.16, 20), B(16773808), [0.4, 0.35, 0.02], [0, 0, 0], null, 0);
for (const [x, y, w, h] of [[0, 0.78, 1.75, 0.1], [0, -0.78, 1.85, 0.14], [-0.82, 0, 0.1, 1.6], [0.82, 0, 0.1, 1.6], [0, 0, 0.06, 1.5], [0, 0, 1.6, 0.06]]) add(win, Box(w, h, 0.1), T(16777215), [x, y, 0.05], [0, 0, 0], null, 0.01);
for (const x of [-1.05, 1.05]) add(win, Box(0.35, 1.9, 0.06), T(16748456), [x, -0.05, 0.12], [0, 0, 0], null, 0.012);
var sofa = G(room, [-1.3, 0, -2.1]);
var sofM = T(5219256);
add(sofa, Box(2.2, 0.42, 0.9), sofM, [0, 0.32, 0], [0, 0, 0], null, 0.02);
add(sofa, Box(2.2, 0.75, 0.25), sofM, [0, 0.7, -0.38], [0, 0, 0], null, 0.02);
for (const x of [-1.15, 1.15]) add(sofa, Box(0.25, 0.62, 0.95), sofM, [x, 0.42, 0], [0, 0, 0], null, 0.02);
for (const x of [-0.52, 0.52]) add(sofa, Box(1, 0.14, 0.8), T(7127252), [x, 0.6, 0.04], [0, 0, 0], null, 0.015);
add(sofa, Box(0.35, 0.35, 0.12), T(16765503), [-0.75, 0.82, -0.2], [-0.2, 0.2, 0], null, 0.012);
add(room, Cyl(1.5, 1.5, 0.03, 32), T(16232644), [0.2, 0.016, -0.2], [0, 0, 0], [1.3, 1, 1], 0.01);
var plant = G(room, [-3.4, 0, -2.5]);
add(plant, Cyl(0.25, 0.2, 0.45), T(16747100), [0, 0.22, 0], [0, 0, 0], null, 0.015);
for (let i = 0; i < 6; i++) add(plant, Sph(0.22, 10, 8), T(6080618), [Math.sin(i * 1.3) * 0.18, 0.7 + i % 3 * 0.2, Math.cos(i * 1.3) * 0.15], [0, 0, 0], [0.8, 1.3, 0.6], 0.012);
var flamp = G(room, [-2.6, 0, -2.4]);
add(flamp, Cyl(0.03, 0.03, 1.7, 8), T(2830149), [0, 0.85, 0], [0, 0, 0], null, 8e-3);
add(flamp, Cyl(0.2, 0.2, 0.04), T(2830149), [0, 0.02, 0], [0, 0, 0], null, 8e-3);
var lampShade = add(flamp, Cyl(0.18, 0.3, 0.32, 18, 1, true), T(16773580, { side: THREE.DoubleSide, emissive: 0 }), [0, 1.8, 0], [0, 0, 0], null, 0.01);
var shelf = G(room, [-1.3, 2.5, -2.98]);
add(shelf, Box(1.6, 0.06, 0.25), T(16777215), [0, 0, 0.12], [0, 0, 0], null, 0.01);
var frames = [];
for (let i = 0; i < 3; i++) {
  const f = G(shelf, [-0.5 + i * 0.5, 0.2, 0.12]);
  add(f, Box(0.3, 0.34, 0.04), T([16765503, 16748456, 9425151][i]), [0, 0, 0], [-0.05, 0, 0], null, 0.01);
  add(f, Box(0.22, 0.26, 0.01), T(16774894), [0, 0, 0.025], [-0.05, 0, 0], null, 0);
  frames.push(f);
}
var clockCan = document.createElement("canvas");
clockCan.width = clockCan.height = 256;
var clockTex = new THREE.CanvasTexture(clockCan);
clockTex.colorSpace = THREE.SRGBColorSpace;
var clock = G(room, [-4, 2.7, -0.8], [0, Math.PI / 2, 0]);
add(clock, Cyl(0.32, 0.32, 0.06, 28), T(16735370), [0, 0, 0], [Math.PI / 2, 0, 0], null, 0.012);
add(clock, new THREE.CircleGeometry(0.27, 28), B(16777215, { map: clockTex }), [0, 0, 0.035], [0, 0, 0], null, 0);
function drawClock(hh, mm) {
  const c = clockCan.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "#1a1033";
  c.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100);
    c.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114);
    c.stroke();
  }
  const ha = (hh % 12 + mm / 60) / 12 * Math.PI * 2, ma = mm / 60 * Math.PI * 2;
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(128, 128);
  c.lineTo(128 + Math.sin(ha) * 60, 128 - Math.cos(ha) * 60);
  c.stroke();
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(128, 128);
  c.lineTo(128 + Math.sin(ma) * 92, 128 - Math.cos(ma) * 92);
  c.stroke();
  c.fillStyle = "#ff5c8a";
  c.beginPath();
  c.arc(128, 128, 12, 0, 7);
  c.fill();
  clockTex.needsUpdate = true;
}
var doorG = G(room, [-4, 0, 0.9]);
add(doorG, Box(0.12, 2.4, 1.3), T(16777215), [0, 1.2, 0], [0, 0, 0], null, 0.015);
var doorPiv = G(doorG, [0.07, 0, -0.55]);
var doorLeaf = add(doorPiv, Box(0.08, 2.2, 1.08), T(12089418), [0, 1.1, 0.54], [0, 0, 0], null, 0.015);
add(doorPiv, Sph(0.05, 10, 8), T(16765503), [0.07, 1.05, 0.95], [0, 0, 0], null, 8e-3);
var doorLight = add(doorG, new THREE.PlaneGeometry(1.08, 2.2), B(16773840), [-0.07, 1.1, 0], [0, Math.PI / 2, 0], null, 0);
var props = {};
function prop(name, build) {
  const g = G(room);
  build(g);
  g.visible = false;
  props[name] = g;
  return g;
}
prop("box", (g) => {
  add(g, Box(0.6, 0.45, 0.5), T(10242603), [0, 0.22, 0], [0, 0, 0], null, 0.015);
  add(g, Box(0.62, 0.02, 0.52), T(13142618), [0, 0.45, 0], [0, 0, 0], null, 0);
  add(g, Box(0.6, 0.25, 0.02), T(13142618), [0, 0.55, -0.25], [-0.5, 0, 0], null, 0.01);
});
prop("table", (g) => {
  add(g, Box(1.1, 0.06, 0.7), T(16777215), [0, 0.72, 0], [0, 0, 0], null, 0.015);
  for (const [x, z] of [[-0.48, -0.28], [0.48, -0.28], [-0.48, 0.28], [0.48, 0.28]]) add(g, Box(0.06, 0.72, 0.06), T(16777215), [x, 0.36, z], [0, 0, 0], null, 0.01);
});
var cup = G(room);
add(cup, Cyl(0.07, 0.06, 0.16, 16), T(6080767), [0, 0.08, 0], [0, 0, 0], null, 0.01);
add(cup, new THREE.TorusGeometry(0.045, 0.015, 6, 12), T(6080767), [0.08, 0.09, 0], [0, 0, 0], null, 6e-3);
cup.visible = false;
prop("desk", (g) => {
  add(g, Box(1.4, 0.07, 0.7), T(16765503), [0, 0.78, 0], [0, 0, 0], null, 0.015);
  for (const x of [-0.65, 0.65]) add(g, Box(0.07, 0.78, 0.66), T(16765503), [x, 0.39, 0], [0, 0, 0], null, 0.012);
  add(g, Box(0.5, 0.02, 0.36), T(16777215), [0, 0.825, 0.05], [0, 0.15, 0], null, 8e-3);
  add(g, Box(0.48, 5e-3, 0.02), B(9416959), [0, 0.837, 0.02], [0, 0.15, 0], null, 0);
  add(g, Cyl(0.03, 0.03, 0.2, 6), T(16735370), [0.35, 0.9, 0.1], [0, 0, 1.4], null, 6e-3);
});
prop("chair", (g) => {
  add(g, Box(0.5, 0.06, 0.5), T(16747100), [0, 0.45, 0], [0, 0, 0], null, 0.012);
  add(g, Box(0.5, 0.55, 0.06), T(16747100), [0, 0.75, -0.23], [0, 0, 0], null, 0.012);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(g, Box(0.05, 0.45, 0.05), T(16747100), [x, 0.22, z], [0, 0, 0], null, 8e-3);
});
prop("crib", (g) => {
  add(g, Box(1.2, 0.08, 0.7), T(16777215), [0, 0.45, 0], [0, 0, 0], null, 0.012);
  add(g, Box(1.12, 0.1, 0.62), T(9425151), [0, 0.52, 0], [0, 0, 0], null, 0.01);
  for (let i = 0; i < 9; i++) for (const z of [-0.34, 0.34]) add(g, Cyl(0.015, 0.015, 0.5, 6), T(16777215), [-0.56 + i * 0.14, 0.7, z], [0, 0, 0], null, 5e-3);
  for (const z of [-0.34, 0.34]) add(g, Box(1.2, 0.05, 0.05), T(16777215), [0, 0.95, z], [0, 0, 0], null, 8e-3);
  for (const x of [-0.6, 0.6]) add(g, Box(0.06, 1, 0.72), T(16777215), [x, 0.5, 0], [0, 0, 0], null, 0.01);
});
prop("rocker", (g) => {
  add(g, Box(0.65, 0.08, 0.6), T(12089418), [0, 0.5, 0], [0, 0, 0], null, 0.012);
  add(g, Box(0.65, 0.8, 0.08), T(12089418), [0, 0.9, -0.28], [-0.15, 0, 0], null, 0.012);
  for (const x of [-0.3, 0.3]) {
    add(g, new THREE.TorusGeometry(0.6, 0.03, 6, 24, 1.4), T(9067066), [x, 0.62, 0], [0, Math.PI / 2, Math.PI * 1.27], null, 6e-3);
    add(g, Box(0.05, 0.45, 0.05), T(12089418), [x, 0.28, 0.2], [0, 0, 0], null, 6e-3);
    add(g, Box(0.05, 0.45, 0.05), T(12089418), [x, 0.28, -0.2], [0, 0, 0], null, 6e-3);
  }
  add(g, Box(0.7, 0.12, 0.5), T(16748456), [0, 0.58, 0.02], [0, 0, 0], null, 0.01);
});
prop("bed", (g) => {
  add(g, Box(1.6, 0.4, 2.2), T(16777215), [0, 0.2, 0], [0, 0, 0], null, 0.015);
  add(g, Box(1.62, 1, 0.12), T(12089418), [0, 0.5, -1.1], [0, 0, 0], null, 0.015);
  add(g, Box(1.5, 0.12, 1.5), T(9414911), [0, 0.46, 0.3], [0, 0, 0], null, 0.012);
  add(g, Box(0.6, 0.14, 0.35), T(16777215), [0, 0.48, -0.75], [0, 0, 0], null, 0.012);
});
prop("bowl", (g) => {
  add(g, Cyl(0.17, 0.12, 0.09, 18), T(16735370), [0, 0.045, 0], [0, 0, 0], null, 8e-3);
});
prop("dogbed", (g) => {
  add(g, new THREE.TorusGeometry(0.42, 0.14, 10, 24), T(9399e3), [0, 0.12, 0], [Math.PI / 2, 0, 0], null, 0.012);
  add(g, Cyl(0.4, 0.4, 0.08, 22), T(12098288), [0, 0.06, 0], [0, 0, 0], null, 8e-3);
});
var mouse = G(room);
add(mouse, Sph(0.06, 12, 10), T(11579592), [0, 0.05, 0], [0, 0, 0], [1, 0.8, 1.5], 8e-3);
for (const x of [-0.03, 0.03]) add(mouse, Sph(0.025, 8, 6), T(16752560), [x, 0.1, 0.05], [0, 0, 0], null, 5e-3);
add(mouse, Cyl(6e-3, 6e-3, 0.15, 5), T(16752560), [0, 0.04, -0.14], [1.3, 0, 0], null, 0);
mouse.visible = false;
var ball = G(room);
add(ball, Sph(0.09, 16, 12), T(14217290), [0, 0.09, 0], [0, 0, 0], null, 0.01);
add(ball, new THREE.TorusGeometry(0.09, 8e-3, 6, 20), B(16777215), [0, 0.09, 0], [0, 0.5, 0], null, 0);
ball.visible = false;
var pillow = G(room);
add(pillow, Box(0.32, 0.1, 0.32), T(16735370), [0, 0.05, 0], [0, 0, 0], null, 0.01);
add(pillow, new THREE.TorusGeometry(0.05, 0.014, 8, 16), B(16765503), [0, 0.12, 0], [Math.PI / 2, 0, 0], null, 4e-3);
pillow.visible = false;
var blanketM = T(9414911);
function roomLook(tod) {
  const P0 = { day: [9425151, 14217471, 1.6, 1.6, 0, 16773808], eve: [16747114, 16765066, 1.2, 1, 2.5, 16765066], night: [1710682, 3816074, 0.55, 0.25, 3.5, 15790335], dawn: [6974152, 16758952, 0.8, 0.5, 2, 16769248] }[tod];
  skyMat.uniforms.a.value.set(P0[0]);
  skyMat.uniforms.b.value.set(P0[1]);
  rHemi.intensity = P0[2];
  rSun.intensity = P0[3];
  rLamp.intensity = P0[4];
  winSun.material.color.set(P0[5]);
  winSun.position.set(tod === "night" ? -0.4 : 0.4, tod === "eve" ? -0.1 : 0.35, 0.02);
  lampShade.material.emissive.set(P0[4] > 0 ? 8413232 : 0);
  rSun.color.set(tod === "eve" ? 16756864 : tod === "night" ? 8425727 : 16773336);
}
function propsOn(list) {
  Object.entries(props).forEach(([k, g]) => g.visible = list.includes(k));
  cup.visible = list.includes("cup");
  mouse.visible = list.includes("mouse");
  ball.visible = list.includes("ball");
  pillow.visible = list.includes("pillow");
  doorPiv.rotation.y = 0;
  doorLight.visible = false;
}
var park = new THREE.Scene();
var pSky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(5945599) }, b: { value: new THREE.Color(14218495) } }, vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float h = clamp(p.y,0.,1.); gl_FragColor = vec4(mix(b,a,pow(h,.7)),1.); }" }));
park.add(pSky);
var pHemi = new THREE.HemisphereLight(16777215, 6986330, 1.8);
park.add(pHemi);
var pSun = new THREE.DirectionalLight(16773336, 1.8);
pSun.position.set(4, 8, 5);
park.add(pSun);
park.fog = new THREE.Fog(14218495, 25, 90);
add(park, Cyl(60, 60, 0.2, 48), T(8050282), [0, -0.1, 0], [0, 0, 0], null, 0);
add(park, Box(1.6, 0.02, 40), T(15784104), [0, 0.01, -5], [0, 0.2, 0], null, 0);
for (let i = 0; i < 14; i++) {
  const x = (rnd(i, 1) - 0.5) * 30, z = -4 - rnd(i, 2) * 18;
  if (Math.abs(x) < 2) continue;
  const tr = G(park, [x, 0, z]);
  add(tr, Cyl(0.15, 0.2, 1.4, 8), T(10250810), [0, 0.7, 0], [0, 0, 0], null, 0.02);
  for (let j = 0; j < 3; j++) add(tr, Sph(0.8 - j * 0.15, 14, 10), T([5228634, 5953642, 4175951][j]), [Math.sin(j * 2) * 0.3, 1.7 + j * 0.45, Math.cos(j * 2) * 0.3], [0, 0, 0], null, 0.025);
}
for (let i = 0; i < 40; i++) {
  const x = (rnd(i, 5) - 0.5) * 14, z = (rnd(i, 6) - 0.5) * 10;
  add(park, Sph(0.06, 8, 6), T([16735370, 16765503, 16777215][i % 3]), [x, 0.06, z], [0, 0, 0], null, 6e-3);
}
var bench = G(park, [-1.4, 0, -1.2]);
add(bench, Box(1.6, 0.08, 0.5), T(12089418), [0, 0.48, 0], [0, 0, 0], null, 0.012);
add(bench, Box(1.6, 0.45, 0.06), T(12089418), [0, 0.78, -0.24], [-0.1, 0, 0], null, 0.012);
for (const x of [-0.7, 0.7]) add(bench, Box(0.08, 0.48, 0.45), T(2830149), [x, 0.24, 0], [0, 0, 0], null, 0.01);
var arch = G(park, [0, 0, -1.6]);
add(arch, new THREE.TorusGeometry(1.3, 0.08, 8, 32, Math.PI), T(16777215), [0, 1, 0], [0, 0, 0], null, 0.012);
for (const x of [-1.3, 1.3]) add(arch, Cyl(0.08, 0.08, 1, 10), T(16777215), [x, 0.5, 0], [0, 0, 0], null, 0.01);
for (let i = 0; i < 18; i++) {
  const a = i / 17 * Math.PI;
  add(arch, Sph(0.12, 10, 8), T([16748456, 16777215, 16765503][i % 3]), [Math.cos(a) * 1.3, 1 + Math.sin(a) * 1.3, 0.05], [0, 0, 0], null, 8e-3);
}
arch.visible = false;
var RN = 600;
var rainGeo = new THREE.BufferGeometry();
var rainPos = new Float32Array(RN * 3);
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
var rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ map: dotTex, color: 12116223, size: 0.07, transparent: true, depthWrite: false }));
rain.frustumCulled = false;
park.add(rain);
rain.visible = false;
rain.layers.set(31);
var heartTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ff5c8a";
  g.strokeStyle = "#1a1033";
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(64, 108);
  g.bezierCurveTo(10, 70, 10, 20, 40, 20);
  g.bezierCurveTo(56, 20, 64, 34, 64, 40);
  g.bezierCurveTo(64, 34, 72, 20, 88, 20);
  g.bezierCurveTo(118, 20, 118, 70, 64, 108);
  g.fill();
  g.stroke();
  return new THREE.CanvasTexture(c);
})();
var zTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.font = "900 110px R, RL";
  g.textAlign = "center";
  g.lineWidth = 10;
  g.strokeStyle = "#1a1033";
  g.strokeText("z", 64, 100);
  g.fillStyle = "#ffffff";
  g.fillText("z", 64, 100);
  return new THREE.CanvasTexture(c);
})();
var noteTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.font = "900 100px R, RL";
  g.textAlign = "center";
  g.lineWidth = 9;
  g.strokeStyle = "#1a1033";
  g.strokeText("?", 64, 100);
  g.fillStyle = "#ffd23f";
  g.fillText("?", 64, 100);
  return new THREE.CanvasTexture(c);
})();
function spriteSet(tex, n, sz) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.setScalar(sz);
    s.visible = false;
    arr.push(s);
  }
  return arr;
}
var hearts = spriteSet(heartTex, 10, 0.18);
var zzz = spriteSet(zTex, 4, 0.16);
var qms = spriteSet(noteTex, 4, 0.16);
function emit(scene, arr, origin, t, rate, rise = 0.6, spread = 0.25, life = 1.6, on = true) {
  arr.forEach((s, i) => {
    scene.add(s);
    if (!on) {
      s.visible = false;
      return;
    }
    const ph = (t * rate + i / arr.length) % 1;
    s.visible = true;
    s.position.set(origin.x + Math.sin(i * 2.3 + ph * 3) * spread * ph, origin.y + ph * rise, origin.z + Math.cos(i * 1.7) * spread * 0.5);
    s.material.opacity = Math.sin(ph * Math.PI);
    s.scale.setScalar(s.userData.base || (s.userData.base = s.scale.x));
    s.scale.setScalar(s.userData.base * (0.6 + 0.6 * ph));
  });
}
var confN = 220;
var confGeo = new THREE.BufferGeometry();
var confPos = new Float32Array(confN * 3);
var confCol = new Float32Array(confN * 3);
confGeo.setAttribute("position", new THREE.BufferAttribute(confPos, 3));
confGeo.setAttribute("color", new THREE.BufferAttribute(confCol, 3));
{
  const cs = [16735370, 16765503, 6080767, 8050282, 16777215].map((c) => new THREE.Color(c));
  for (let i = 0; i < confN; i++) {
    const c = cs[i % 5];
    confCol.set([c.r, c.g, c.b], i * 3);
  }
}
var conf = new THREE.Points(confGeo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true }));
conf.frustumCulled = false;
conf.visible = false;
conf.layers.set(31);
function updConf(t, c, area = 3) {
  for (let i = 0; i < confN; i++) {
    confPos[i * 3] = c.x + (rnd(i, 1) - 0.5) * area + Math.sin(t * 2 + i) * 0.1;
    confPos[i * 3 + 1] = c.y + 3 - (t * (0.5 + rnd(i, 2) * 0.5) + rnd(i, 3) * 3) % 3;
    confPos[i * 3 + 2] = c.z + (rnd(i, 4) - 0.5) * area * 0.6;
  }
  confGeo.attributes.position.needsUpdate = true;
}
var heroKid = makeHuman({ scale: 0.72, top: 16735370, pants: 5209343 });
var heroTeen = makeHuman({ scale: 0.9, top: 8019199, pants: 2830149 });
var heroAdult = makeHuman({ top: 5209343, pants: 2830149 });
var hero50 = makeHuman({ top: 6076554, pants: 2830149, hair: 11049616, glasses: true });
var heroOld = makeHuman({ top: 12099808, pants: 5921402, hair: 15263984, glasses: true, beard: true, cardigan: true });
var partner = makeHuman({ top: 16748456, hair: 2759186, hairStyle: "long", dress: true, skin: 16171168 });
var kid1 = makeHuman({ scale: 0.55, top: 16765503, pants: 5209343 });
var kid2 = makeHuman({ scale: 0.5, top: 6080767, pants: 16735370, hairStyle: "long", hair: 9067056 });
var baby = (() => {
  const g = new THREE.Group();
  add(g, Sph(0.13, 18, 14), T(16765104), [0, 0.13, 0], [0, 0, 0], null, 0.01);
  for (const x of [-0.04, 0.04]) add(g, Sph(0.012, 6, 5), B(1313834), [x, 0.15, 0.12], [0, 0, 0], null, 0);
  add(g, Cap(0.13, 0.25, 12), T(16773808), [0, 0.05, -0.25], [Math.PI / 2, 0, 0], null, 0.01);
  return g;
})();
var cat = SC.pet === "cat" ? makeCat() : null;
var dog = SC.pet === "dog" ? makeDog() : null;
var pet = cat || dog;
var HUMANS = [heroKid, heroTeen, heroAdult, hero50, heroOld, partner, kid1, kid2];
var activeScene = room;
function use(scene, ...objs) {
  activeScene = scene;
  [...HUMANS.map((h) => h.root), pet.root, baby, cup, mouse, ball, pillow, conf].forEach((o) => {
    o.visible = false;
  });
  objs.forEach((o) => {
    const r = o.root || o;
    scene.add(r);
    r.visible = true;
  });
  arch.visible = false;
  rain.visible = false;
  [...hearts, ...zzz, ...qms].forEach((s) => s.visible = false);
}
var petPose = (p, t) => cat ? catPose(cat, p, t) : dogPose(dog, p, t);
var _q = new THREE.Quaternion();
var _q2 = new THREE.Quaternion();
function place(o, x, y, z, ry = 0) {
  const r = o.root || o;
  r.position.set(x, y, z);
  r.rotation.set(0, ry, 0);
}
var HUG = { lSh: [-1.1, 0.5, 0.3], rSh: [-1.1, -0.5, -0.3], lEl: [-1.3], rEl: [-1.3] };
var blinkT = (t) => t % 3.6 < 0.1;
var SCN = {
  // ---------- A: cat lifespan ----------
  a_hook(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("day");
    propsOn(["bowl"]);
    tintPet(pet, false);
    place(heroAdult, 0.3, 0.45, 0.2, -0.3);
    pose(heroAdult, P(STAND, { lSh: [0, 0, 0.2], rSh: [0, 0, -0.2] }));
    face(heroAdult, { mouth: "smile", look: [-0.3, -0.6], blink: blinkT(t) });
    place(pet, -0.5, 0, 0.5, 0.6);
    petPose({ mode: "sit", head: [-0.2, -0.3, 0] }, t);
    setCam(V(0.6, 1.1, 3.4 - k * 0.5), V(-0.1, 0.7, 0.2), t);
    return petHead(pet);
  },
  a_kid(k, lt, t) {
    use(room, heroKid, pet);
    roomLook("day");
    propsOn(["box"]);
    props.box.position.set(0.1, 0, 0.3);
    props.box.rotation.y = 0.3;
    tintPet(pet, false);
    pet.root.scale.setScalar(0.55);
    const pop = eob(sm(0.1, 0.45, k));
    place(pet, 0.1, lerp(0.15, 0.42, pop), 0.3, 0.2);
    petPose({ mode: "sit", head: [-0.1, Math.sin(t * 2) * 0.3, 0] }, t);
    place(heroKid, 0.75, 0.33, 0.55, -0.6);
    pose(heroKid, P(SIT, { lHip: [-1.5, 0, 0.3], rHip: [-1.5, 0, -0.3], lKn: [1.4], rKn: [1.4], lSh: [-0.6, 0, 0.6], rSh: [-0.6, 0, -0.6], lEl: [-1], rEl: [-1] }));
    heroKid.root.position.y = 0.26;
    face(heroKid, { mouth: k > 0.3 ? "open" : "smile", open: 0.6, look: [-0.6, -0.5], brow: -0.1, blink: blinkT(t) });
    emit(room, hearts, V(0.1, 0.9, 0.3), t, 0.6, 0.8, 0.4, 1.6, k > 0.4);
    setCam(V(1.1, 0.85, 2.1 - k * 0.3), V(0.35, 0.5, 0.35), t);
    return petHead(pet);
  },
  a_avg(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn(["bowl"]);
    tintPet(pet, false);
    const g = lerp(0.55, 1, eio(k));
    pet.root.scale.setScalar(g);
    place(pet, 0, 0, 0.2, 0.4 + k * 0.4);
    petPose({ mode: k < 0.5 ? "walk" : "sit", head: [0, -0.2, 0] }, t);
    setCam(V(0.5, 0.7, 2), V(0, 0.4, 0.2), t);
    return petHead(pet);
  },
  a_teen(k, lt, t) {
    use(room, heroTeen, pet);
    roomLook("eve");
    propsOn(["desk", "chair"]);
    props.desk.position.set(-0.4, 0, -1.3);
    props.desk.rotation.y = Math.PI;
    props.chair.position.set(-0.4, 0, -1.95);
    props.chair.rotation.y = 0;
    tintPet(pet, false);
    pet.root.scale.setScalar(0.75);
    const dp = props.desk.localToWorld(V(0, 0.83, 0.05));
    place(pet, dp.x - 0.05, dp.y, dp.z + 0.05, 1.5);
    petPose({ mode: "curl", sleep: true, purr: true, tailWave: 0.2 }, t);
    place(heroTeen, -0.4, 0.4, -1.9, 0);
    pose(heroTeen, P(SIT, { lSh: [-1.1, 0, 0.2], rSh: [-1.1, 0, -0.2], lEl: [-0.6], rEl: [-0.6], spine: [0.2] }));
    heroTeen.root.position.y = 0.43;
    face(heroTeen, { mouth: "smile", look: [0, -0.8], brow: 0.15, blink: blinkT(t) });
    emit(room, zzz, dp.clone().add(V(0.1, 0.25, 0)), t, 0.5, 0.5, 0.1);
    setCam(V(0.3, 1.5, 0.7 - k * 0.3), V(-0.4, 0.95, -1.5), t);
    return null;
  },
  a_move(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("day");
    propsOn(["box"]);
    props.box.position.set(0.2, 0, -0.2);
    props.box.rotation.y = -0.2;
    tintPet(pet, false);
    pet.root.scale.setScalar(1);
    const jump = sm(0.15, 0.45, k);
    place(pet, lerp(1.2, 0.2, jump), Math.sin(jump * Math.PI) * 0.7 + jump * 0.12, lerp(0.6, -0.2, jump), lerp(-1.2, 0.6, sm(0.45, 0.6, k)));
    petPose({ mode: jump < 1 ? "stand" : "sit", head: [-0.2, Math.sin(t * 2) * 0.2, 0] }, t);
    place(heroAdult, -0.8, 0.45, 0.5, 0.6);
    pose(heroAdult, P(STAND, { lSh: [0, 0, 0.4], rSh: [0, 0, -0.4], lEl: [-0.2], rEl: [-0.2] }));
    face(heroAdult, { mouth: k > 0.5 ? "open" : "smile", open: 0.5, look: [0.6, -0.4], brow: -0.1, blink: blinkT(t) });
    for (const [x, z] of [[-1.6, -1.4], [-1, -1.7]]) {
    }
    setCam(V(0.5, 1.2, 2.6), V(-0.1, 0.5, 0), t);
    return petHead(pet);
  },
  a_love(k, lt, t) {
    use(room, heroAdult, partner, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    const later = k > 0.5;
    place(heroAdult, -1.75, 0.62, -1.95, 0);
    pose(heroAdult, SIT);
    heroAdult.root.position.y = 0.62 + 0.43 - 0.45;
    place(partner, -0.85, 0.62, -1.95, 0);
    pose(partner, P(SIT, later ? { lSh: [-0.8, 0, 0.3], lEl: [-0.9], rSh: [-0.8, 0, -0.3], rEl: [-0.9] } : {}));
    partner.root.position.y = 0.6;
    face(heroAdult, { mouth: "smile", look: [0.6, 0], blink: blinkT(t) });
    face(partner, { mouth: "smile", look: later ? [0, -0.8] : [-0.5, 0], blink: blinkT(t + 1) });
    if (!later) {
      place(pet, -0.3, 0, -0.6, -2.6);
      petPose({ mode: "sit", head: [-0.2, 0.3, 0], earsBack: true }, t);
      pet.head.children.forEach(() => {
      });
      emit(room, qms, petHead(pet), t, 0.8, 0.3, 0.1, 1, true);
    } else {
      place(pet, -0.85, 0.72, -1.68, 1.57);
      petPose({ mode: "curl", sleep: true, purr: true, tailWave: 0.2 }, t);
      emit(room, hearts, V(-0.85, 1.2, -1.6), t, 0.5, 0.7, 0.3, 1.6, true);
    }
    setCam(V(-0.8, 1.15, 0.9), V(-1.3, 0.85, -1.7), t);
    return later ? null : petHead(pet);
  },
  a_baby(k, lt, t) {
    use(room, pet, baby);
    roomLook("night");
    propsOn(["crib"]);
    props.crib.position.set(0.4, 0, -1.6);
    props.crib.rotation.y = 0;
    tintPet(pet, false);
    baby.position.set(0.4, 0.58, -1.55);
    baby.rotation.set(0, 0, 0);
    place(pet, 1.25, 0, -1, -0.6);
    petPose({ mode: "sit", head: [-0.2, -0.4, 0], blink: k > 0.7 ? sm(0.7, 0.85, k) * (1 - sm(0.9, 1, k)) : 0, tailWave: 0.5 }, t);
    emit(room, zzz, V(0.4, 0.9, -1.5), t, 0.4, 0.5, 0.1);
    rFill.position.set(1.2, 1.5, 0.5);
    rFill.intensity = 1.5;
    setCam(V(2, 1.3, 1.4 - k * 0.3), V(0.7, 0.6, -1.3), t);
    return null;
  },
  a_50(k, lt, t) {
    use(room, hero50, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, true);
    const op = sm(0.05, 0.3, k);
    doorPiv.rotation.y = -op * 1.3;
    doorLight.visible = op > 0.02;
    place(hero50, -3.3, 0.45, 0.9, Math.PI / 2);
    const w = sm(0.3, 0.8, k);
    hero50.root.position.x = lerp(-3.6, -2.7, w);
    pose(hero50, w > 0 && w < 1 ? walkPose(t) : P(STAND, k > 0.8 ? { lSh: [-1, 0, 0.3], lEl: [-0.8], rSh: [-1, 0, -0.3], rEl: [-0.8], spine: [0.25] } : {}));
    face(hero50, { mouth: "smile", look: [0.3, -0.7], blink: blinkT(t) });
    place(pet, -1.9, 0, 0.95, -Math.PI / 2);
    petPose({ mode: k < 0.5 ? "sit" : "walk", head: [-0.2, 0, 0], tailWave: 1.5 }, t);
    if (k > 0.5) pet.root.position.x = lerp(-1.9, -2.2, sm(0.5, 0.75, k));
    setCam(V(-1, 1.2, 2.5), V(-2.4, 0.7, 0.9), t);
    return petHead(pet);
  },
  a_80(k, lt, t) {
    use(room, heroOld, pet);
    roomLook("eve");
    propsOn(["rocker"]);
    props.rocker.position.set(1, 0, -1.9);
    props.rocker.rotation.set(Math.sin(t * 1.5) * 0.04, 0.3, 0);
    tintPet(pet, true);
    place(heroOld, 1, 0.52, -1.92, 0.3);
    pose(heroOld, P(SIT, { lSh: [-0.8, 0.3, 0.3], rSh: [-0.8, -0.3, -0.3], lEl: [-1], rEl: [-1], spine: [Math.sin(t * 1.5) * 0.04] }));
    heroOld.root.position.y = 0.52 + 0.1;
    face(heroOld, { mouth: "smile", look: [0, -0.8], eye: 0.5, blink: blinkT(t) });
    const lp = heroOld.root.localToWorld(V(0, 0.1, 0.3));
    place(pet, lp.x, lp.y, lp.z, 0.3 + Math.PI / 2);
    petPose({ mode: "curl", sleep: true, purr: true, tailWave: 0.2 }, t);
    emit(room, hearts, lp.clone().add(V(0, 0.3, 0)), t, 0.4, 0.6, 0.3);
    setCam(V(0.5, 1.2, 0.9 - k * 0.2), V(1, 0.9, -1.8), t);
    return null;
  },
  a_fact(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn(["bowl"]);
    tintPet(pet, true);
    place(pet, 0, 0, 0.3, 0.5);
    petPose({ mode: "sit", head: [-0.15, 0.2, 0], blink: t % 2 < 0.3 ? 1 : 0 }, t);
    setCam(V(0.5, 0.7, 2), V(0, 0.5, 0.3), t);
    return null;
  },
  a_end(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("day");
    propsOn([]);
    tintPet(pet, false);
    place(heroAdult, 0.2, 0.45, 0.3, 0);
    const hp = heroAdult.root.localToWorld(V(0, 0.55, 0.32));
    pose(heroAdult, P(STAND, HUG, { spine: [0.1] }));
    face(heroAdult, { mouth: "smile", eye: 0.4, look: [0, -0.5] });
    place(pet, hp.x, hp.y - 0.5, hp.z + 0.12, 0);
    petPose({ mode: "sit", head: [-0.3, 0, 0], sleep: true, purr: true }, t);
    heroAdult.root.updateMatrixWorld(true);
    emit(room, hearts, hp.clone().add(V(0, 0.4, 0)), t, 0.5, 0.8, 0.4);
    setCam(V(0.4, 1.1, 2.1 - k * 0.3), V(0.2, 0.85, 0.3), t);
    return null;
  },
  // ---------- B: dog lifespan ----------
  b_hook(k, lt, t) {
    return SCN.a_hook(k, lt, t);
  },
  b_kid(k, lt, t) {
    use(room, heroKid, pet);
    roomLook("day");
    propsOn(["dogbed"]);
    props.dogbed.position.set(0.9, 0, -0.6);
    tintPet(pet, false);
    pet.root.scale.setScalar(0.55);
    place(pet, lerp(0.8, 0.2, sm(0, 0.5, k)), 0, lerp(-0.3, 0.5, sm(0, 0.5, k)), -0.6);
    dogPose(pet, { mode: k < 0.5 ? "run" : "sit", wag: 2, head: [-0.2, 0, 0] }, t);
    place(heroKid, -0.5, 0.33, 0.6, 0.6);
    pose(heroKid, P(STAND, { lSh: [-1.2, 0, 0.3], rSh: [-1.2, 0, -0.3], lEl: [-0.5], rEl: [-0.5] }));
    heroKid.root.position.y = 0.33;
    face(heroKid, { mouth: "open", open: 0.7, look: [0.6, -0.5], brow: -0.1, blink: blinkT(t) });
    emit(room, hearts, V(-0.1, 1, 0.5), t, 0.6, 0.8, 0.4, 1.6, k > 0.5);
    setCam(V(0.8, 1, 3 - k * 0.3), V(-0.1, 0.5, 0.4), t);
    return petHead(pet);
  },
  b_avg(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn(["bowl"]);
    tintPet(pet, false);
    pet.root.scale.setScalar(lerp(0.55, 1, eio(k)));
    place(pet, 0, 0, 0.2, 0.4 + k * 0.4);
    dogPose(pet, { mode: k < 0.5 ? "walk" : "sit", wag: 1.5 }, t);
    setCam(V(0.6, 0.8, 2.6), V(0, 0.4, 0.2), t);
    return petHead(pet);
  },
  b_10(k, lt, t) {
    use(park, heroKid, pet);
    pet.root.scale.setScalar(1);
    tintPet(pet, false);
    pSky.material.uniforms.a.value.set(6978202);
    pSky.material.uniforms.b.value.set(12109012);
    park.fog.color.set(12109012);
    pSun.intensity = 0.8;
    rain.visible = true;
    for (let i = 0; i < RN; i++) {
      rainPos[i * 3] = (rnd(i, 1) - 0.5) * 8;
      rainPos[i * 3 + 1] = 4 - (t * 6 + rnd(i, 2) * 4) % 4;
      rainPos[i * 3 + 2] = (rnd(i, 3) - 0.5) * 6;
    }
    rainGeo.attributes.position.needsUpdate = true;
    const x = lerp(1.5, -1.5, k);
    place(heroKid, x, 0.33, 0.4, -Math.PI / 2);
    pose(heroKid, P(walkPose(t, 10, 0.6), { lSh: [-2.6, 0, 0.4], lEl: [-0.3] }));
    heroKid.root.position.y = 0.33;
    face(heroKid, { mouth: "open", open: 0.5, look: [-0.5, 0.2], blink: blinkT(t) });
    place(pet, x - 0.8, 0, 0.5, -Math.PI / 2);
    dogPose(pet, { mode: "run", wag: 2 }, t);
    setCam(V(x * 0.4 + 0.3, 1.2, 3.6), V(x * 0.5 - 0.3, 0.5, 0.3), t);
    return null;
  },
  b_17(k, lt, t) {
    use(room, heroTeen, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    place(heroTeen, -1.3, 0.6, -1.95, 0);
    pose(heroTeen, P(SIT, { spine: [0.3], neck: [0.25], head: [0.2], lSh: [-0.4, 0, 0.3], rSh: [-0.4, 0, -0.3], lEl: [-1.2], rEl: [-1.2] }));
    heroTeen.root.position.y = 0.58;
    face(heroTeen, { mouth: "frown", look: [0, -0.8], brow: 0.5, eye: 0.7, blink: blinkT(t) });
    const lap = heroTeen.root.localToWorld(V(0, 0.02, 0.38));
    place(pet, lap.x, 0, lap.z + 0.55, Math.PI);
    const lean = sm(0.2, 0.5, k);
    dogPose(pet, { mode: "sit", head: [lerp(0, 0.5, lean), 0, 0.3 * lean], wag: 0.3, tongue: false }, t);
    pet.body.rotation.x -= 0.25 * lean;
    pet.root.position.z = lap.z + lerp(0.6, 0.45, lean);
    emit(room, hearts, lap.clone().add(V(0, 0.3, 0.2)), t, 0.4, 0.5, 0.2, 1.6, k > 0.6);
    setCam(V(0.2, 1, -0.3), V(-1.3, 0.7, -1.5), t);
    return null;
  },
  b_25(k, lt, t) {
    use(room, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    place(pet, 1.3, 0, -2.55, Math.PI);
    dogPose(pet, { mode: "sit", head: [-0.1, 0, 0], wag: 0.4, tongue: false }, t);
    pet.root.position.y = 0;
    const hh = 17 + 59 / 60 * sm(0, 0.8, k), mm = Math.floor(hh % 1 * 60);
    drawClock(Math.floor(hh), mm);
    setCam(V(1.6, 1.2, -0.2 - k * 0.2), V(1.3, 0.9, -2.6), t);
    return null;
  },
  b_wed(k, lt, t) {
    use(park, heroAdult, partner, pet, pillow, conf);
    pSky.material.uniforms.a.value.set(5945599);
    pSky.material.uniforms.b.value.set(16773336);
    park.fog.color.set(16773336);
    pSun.intensity = 1.8;
    arch.visible = true;
    tintPet(pet, false);
    place(heroAdult, -0.45, 0.45, -1.4, 0.3);
    place(partner, 0.45, 0.45, -1.4, -0.3);
    pose(heroAdult, P(STAND, { rSh: [-0.4, 0, -0.3], rEl: [-0.4] }));
    pose(partner, P(STAND, { lSh: [-0.4, 0, 0.3], lEl: [-0.4] }));
    face(heroAdult, { mouth: "smile", look: [0.3, -0.6], blink: blinkT(t) });
    face(partner, { mouth: "smile", look: [-0.3, -0.6], blink: blinkT(t + 1) });
    const w = sm(0, 0.7, k);
    place(pet, 0, 0, lerp(1.8, -0.7, w), Math.PI);
    dogPose(pet, { mode: w < 1 ? "walk" : "sit", wag: 1.5 }, t);
    const hp = pet.head.localToWorld(V(0, 0.1, 0.1));
    pillow.position.copy(pet.body.localToWorld(V(0, 0.19, 0.05)));
    pillow.rotation.y = Math.PI;
    updConf(t, V(0, 0, -1), 4);
    conf.visible = k > 0.7;
    park.add(conf);
    setCam(V(0.4, 1.2, 3.2 - k * 0.6), V(0, 0.7, -1), t);
    return null;
  },
  b_40(k, lt, t) {
    use(room, pet, kid1, kid2);
    roomLook("night");
    propsOn(["dogbed"]);
    props.dogbed.position.set(0.2, 0, -0.6);
    tintPet(pet, true);
    place(pet, 0.2, 0, -0.6, 0.3);
    dogPose(pet, { mode: "lie", sleep: true, wag: 0, tongue: false, head: [0.3, 0, 0] }, t);
    place(kid1, -0.4, 0.12, -0.55, 0.2);
    kid1.root.rotation.set(0, 0.3, 1.35);
    pose(kid1, P(STAND, { lSh: [0, 0, 1], rSh: [0, 0, -0.3] }));
    face(kid1, { mouth: "line", blink: true });
    place(kid2, 0.75, 0.12, -0.35, -0.2);
    kid2.root.rotation.set(0, -0.5, -1.4);
    pose(kid2, P(STAND, { lSh: [0, 0, 0.5], rSh: [0, 0, -1] }));
    face(kid2, { mouth: "line", blink: true });
    emit(room, zzz, V(0.2, 0.6, -0.6), t, 0.4, 0.5, 0.2);
    rFill.position.set(0.5, 1.5, 0.6);
    rFill.intensity = 1.6;
    setCam(V(0.8, 1.5, 1.5 - k * 0.3), V(0.2, 0.2, -0.5), t);
    return null;
  },
  b_70(k, lt, t) {
    use(park, heroOld, pet, ball);
    pSky.material.uniforms.a.value.set(16751210);
    pSky.material.uniforms.b.value.set(16769200);
    park.fog.color.set(16769200);
    pSun.intensity = 1.2;
    pSun.color.set(16760976);
    tintPet(pet, true);
    place(heroOld, -1.4, 0.9, -1.15, 0);
    pose(heroOld, P(SIT, { lSh: [-0.5, 0, 0.3], lEl: [-0.9], rSh: [-0.5, 0, -0.3], rEl: [-0.9] }));
    heroOld.root.position.y = 0.9;
    face(heroOld, { mouth: "smile", look: [0.5, -0.6], eye: 0.6, blink: blinkT(t) });
    const w = sm(0.1, 0.7, k);
    place(pet, lerp(1.4, -0.5, w), 0, lerp(0.4, -0.4, w), -Math.PI / 2 - 0.4);
    dogPose(pet, { mode: w < 1 ? "walk" : "sit", wag: 1, tongue: false }, t);
    ball.position.copy(pet.head.localToWorld(V(0, -0.07, 0.22)));
    park.add(ball);
    setCam(V(0.6, 1.2, 2.8), V(-0.6, 0.6, -0.6), t);
    return null;
  },
  b_fact(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn(["bowl"]);
    tintPet(pet, true);
    place(pet, 0, 0, 0.3, 0.5);
    dogPose(pet, { mode: "sit", wag: 1 }, t);
    setCam(V(0.5, 0.7, 2), V(0, 0.5, 0.3), t);
    return null;
  },
  b_end(k, lt, t) {
    use(park, heroAdult, pet);
    pSky.material.uniforms.a.value.set(5945599);
    pSky.material.uniforms.b.value.set(14218495);
    park.fog.color.set(14218495);
    pSun.intensity = 1.8;
    pSun.color.set(16773336);
    tintPet(pet, false);
    const x = lerp(0.8, -1.2, k);
    place(heroAdult, x, 0.45, 0, -Math.PI / 2 + 0.3);
    pose(heroAdult, walkPose(t, 7, 0.4));
    face(heroAdult, { mouth: "smile", look: [0, -0.6], blink: blinkT(t) });
    place(pet, x - 0.2, 0, 0.6, -Math.PI / 2 + 0.3);
    dogPose(pet, { mode: "walk", wag: 2 }, t);
    emit(park, hearts, V(x, 1.4, 0.3), t, 0.5, 0.6, 0.3);
    setCam(V(x + 1, 1, 3), V(x - 0.3, 0.6, 0.2), t);
    return null;
  },
  // ---------- C: cat thoughts ----------
  c_hook(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("dawn");
    propsOn(["bed", "bowl"]);
    props.bed.position.set(0.4, 0, -1.6);
    props.bowl.position.set(-1.2, 0, 0.4);
    tintPet(pet, false);
    place(heroAdult, 0.4, 0.66, -1.45, 0);
    heroAdult.root.rotation.set(-1.45, 0, 0);
    pose(heroAdult, P(STAND, { lSh: [0, 0, 0.3], rSh: [-2.8, 0, -0.2] }));
    face(heroAdult, { mouth: "line", blink: true });
    place(pet, 0.42, 0.62, -1.5, Math.PI);
    petPose({ mode: "sit", head: [-0.3, 0, 0], meow: t % 1.2 < 0.25 && k > 0.4 }, t);
    setCam(V(2.4, 1.3, -1.3), V(0.4, 0.8, -1.8), t);
    return petHead(pet);
  },
  c_cup(k, lt, t) {
    use(room, pet, cup);
    roomLook("day");
    propsOn(["table"]);
    props.table.position.set(0.2, 0, -0.6);
    tintPet(pet, false);
    place(pet, 0.05, 0.75, -0.6, Math.PI / 2);
    const push = sm(0.25, 0.45, k);
    petPose({ mode: "sit", head: [-0.1, -0.3, 0], paw: push * (1 - sm(0.5, 0.6, k)), pawLeg: "fr" }, t);
    const fall = sm(0.45, 0.75, k);
    cup.position.set(0.55 + fall * 0.3, 0.75 - (fall > 0 ? Math.min(0.75, Math.pow(fall, 2) * 2.2) : 0), -0.55);
    cup.rotation.z = -fall * 2.5;
    shake = k > 0.75 && k < 0.82 ? 0.02 : 0;
    setCam(V(1.6, 1, 1.4), V(0.3, 0.65, -0.6), t);
    return petHead(pet);
  },
  c_meow(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("day");
    propsOn(["bowl"]);
    props.bowl.position.set(0.5, 0, 0.2);
    tintPet(pet, false);
    place(heroAdult, -0.7, 0.45, -0.3, 0.6);
    pose(heroAdult, P(STAND, { rSh: [-0.3, 0, -0.2] }));
    face(heroAdult, { mouth: "smile", look: [0.5, -0.7], blink: blinkT(t) });
    place(pet, 0.2, 0, 0.5, -0.7);
    petPose({ mode: "sit", head: [-0.45, -0.3, 0], meow: Math.floor(lt * 2.2) % 2 === 0 && k < 0.5 }, t);
    setCam(V(0.7, 0.85, 2), V(-0.1, 0.55, 0.1), t);
    return petHead(pet);
  },
  c_blink(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn([]);
    tintPet(pet, false);
    place(pet, 0, 0, 0.3, 0);
    const b = k > 0.35 ? Math.sin((k - 0.35) * 9) > 0 ? sm(0, 1, Math.sin((k - 0.35) * 9)) : 0 : 0;
    petPose({ mode: "sit", head: [-0.15, 0, 0], blink: b }, t);
    setCam(V(0, 0.72, lerp(1.6, 1.1, eio(k))), V(0, 0.62, 0.3), t);
    return petHead(pet);
  },
  c_gift(k, lt, t) {
    use(room, heroAdult, pet, mouse);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    place(heroAdult, -0.6, 0.45, -0.6, 0.5);
    pose(heroAdult, P(STAND));
    face(heroAdult, { mouth: k > 0.6 ? "open" : "smile", open: 0.5, look: [0.5, -0.8], brow: k > 0.6 ? 0.3 : 0, blink: blinkT(t) });
    const w = sm(0, 0.45, k);
    place(pet, lerp(1.4, 0, w), 0, lerp(0.7, 0.35, w), -Math.PI / 2 - 0.3);
    petPose({ mode: w < 1 ? "walk" : "sit", head: [-0.2, 0, 0] }, t);
    if (w < 1) mouse.position.copy(pet.head.localToWorld(V(0, -0.09, 0.16)));
    else mouse.position.set(-0.3, 0, 0.25);
    mouse.rotation.y = -Math.PI / 2;
    setCam(V(0.6, 0.9, 2.4), V(-0.2, 0.5, 0), t);
    return petHead(pet);
  },
  c_knead(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    place(heroAdult, -1.3, 0.6, -1.95, 0);
    pose(heroAdult, P(SIT, { lSh: [-0.3, 0, 0.2], rSh: [-0.3, 0, -0.2] }));
    heroAdult.root.position.y = 0.6;
    face(heroAdult, { mouth: "smile", look: [0, -0.8], blink: blinkT(t) });
    const lap = heroAdult.root.localToWorld(V(0, 0.1, 0.3));
    place(pet, lap.x, lap.y - 0.02, lap.z, 0.3);
    petPose({ mode: "lie", knead: true, purr: true, head: [-0.1, 0, 0], blink: 0.6 }, t);
    emit(room, hearts, lap.clone().add(V(0, 0.5, 0)), t, 0.5, 0.6, 0.3);
    setCam(V(-0.5, 1.2, 1.2), V(-1.3, 0.8, -1.6), t);
    return petHead(pet);
  },
  c_sad(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("night");
    propsOn(["bed"]);
    props.bed.position.set(0.4, 0, -1.6);
    tintPet(pet, false);
    place(heroAdult, 0.4, 0.66, -1.45, 0);
    heroAdult.root.rotation.set(-1.45, 0, 0);
    pose(heroAdult, P(STAND, { lSh: [0, 0, 0.3], rSh: [0, 0, -0.3] }));
    face(heroAdult, { mouth: k > 0.6 ? "smile" : "frown", look: [0, -0.3], brow: k > 0.6 ? 0 : 0.5, eye: 0.6 });
    const ch = heroAdult.root.localToWorld(V(0, 0.28, 0.12));
    place(pet, ch.x, ch.y + 0.05, ch.z, Math.PI / 2);
    petPose({ mode: "curl", sleep: true, purr: true, tailWave: 0.2 }, t);
    rFill.position.set(0.9, 1.6, 0.2);
    rFill.intensity = 1.6;
    emit(room, hearts, ch.clone().add(V(0, 0.3, 0)), t, 0.4, 0.5, 0.2, 1.6, k > 0.5);
    setCam(V(1.7, 1.5, -0.7), V(0.4, 0.75, -1.9), t);
    return ch.clone().add(V(0, 0.2, 0));
  },
  c_end(k, lt, t) {
    return SCN.a_end(k, lt, t);
  },
  // ---------- D: dog thoughts ----------
  d_hook(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("day");
    propsOn([]);
    tintPet(pet, false);
    const op = sm(0.05, 0.3, k);
    doorPiv.rotation.y = -op * 1.3;
    doorLight.visible = op > 0.02;
    const w = sm(0.1, 0.55, k);
    place(heroAdult, lerp(-2.4, -3.8, w), 0.45, 0.9, -Math.PI / 2);
    pose(heroAdult, w > 0 && w < 1 ? walkPose(t) : STAND);
    heroAdult.root.visible = w < 0.98;
    face(heroAdult, { mouth: "smile", blink: blinkT(t) });
    place(pet, -1.7, 0, 1.3, -Math.PI / 2 + 0.5);
    dogPose(pet, { mode: "sit", head: [-0.1, 0, 0], wag: k > 0.5 ? 0 : 0.6, earsBack: k > 0.6, tongue: k < 0.6 }, t);
    setCam(V(0.3, 1.3, 3.4), V(-2.5, 0.8, 0.8), t);
    return petHead(pet);
  },
  d_wait(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn([]);
    tintPet(pet, false);
    place(pet, -3.2, 0, 1, -Math.PI / 2);
    dogPose(pet, { mode: Math.floor(lt * 1.2) % 3 === 2 ? "lie" : "sit", head: [0, Math.sin(t * 2) * 0.2, 0], wag: 0, tongue: false, earsBack: false }, t);
    const hh = 9 + k * 8;
    drawClock(Math.floor(hh), Math.floor(hh % 1 * 60));
    setCam(V(-1.9, 1.1, 2.7), V(-3.3, 0.7, 0.8), t);
    return petHead(pet);
  },
  d_return(k, lt, t) {
    use(room, heroAdult, pet, conf);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    doorPiv.rotation.y = -1.3;
    doorLight.visible = true;
    place(heroAdult, -3.3, 0.45, 0.9, Math.PI / 2);
    pose(heroAdult, P(STAND, { lSh: [-0.4, 0, 1.2], rSh: [-0.4, 0, -1.2] }));
    face(heroAdult, { mouth: "open", open: 0.6, look: [0.3, -0.6], brow: -0.1, blink: blinkT(t) });
    const jump = Math.abs(Math.sin(t * 7));
    place(pet, -2.6, jump * 0.35, 0.95, -Math.PI / 2 + Math.sin(t * 5) * 0.4);
    dogPose(pet, { mode: "run", wag: 3, head: [-0.3, 0, 0] }, t);
    updConf(t, V(-2.8, 0, 0.9), 2.5);
    conf.visible = true;
    room.add(conf);
    setCam(V(-0.6, 1.2, 3), V(-2.9, 0.8, 0.9), t);
    return petHead(pet);
  },
  d_smell(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("eve");
    propsOn([]);
    tintPet(pet, false);
    place(heroAdult, -0.4, 0.45, -0.2, 0.2);
    pose(heroAdult, STAND);
    face(heroAdult, { mouth: k > 0.7 ? "open" : "smile", open: 0.4, look: [0.4, -0.8], brow: k > 0.7 ? 0.3 : 0, blink: blinkT(t) });
    place(pet, 0.25 + Math.sin(t * 3) * 0.05, 0, 0.45, -0.9);
    dogPose(pet, { mode: "stand", head: [0.35 + Math.sin(t * 12) * 0.05, Math.sin(t * 3) * 0.3, 0], wag: k > 0.7 ? 0.2 : 1, tongue: false, earsBack: k > 0.7 }, t);
    setCam(V(0.9, 0.8, 1.8), V(-0.1, 0.45, 0.1), t);
    return petHead(pet);
  },
  d_words(k, lt, t) {
    use(room, pet);
    roomLook("day");
    propsOn([]);
    tintPet(pet, false);
    place(pet, 0, 0, 0.3, 0);
    const excited = k > 0.55;
    place(pet, 0, excited ? Math.abs(Math.sin(t * 8)) * 0.25 : 0, 0.3, excited ? Math.sin(t * 6) * 0.5 : 0);
    dogPose(pet, { mode: excited ? "run" : "sit", head: [-0.15, excited ? 0 : Math.sin(t * 1.5) * 0.35, excited ? 0 : 0.35 * Math.sin(t * 1.5)], wag: excited ? 3 : 0.5 }, t);
    setCam(V(0, 0.8, lerp(1.7, 1.4, k)), V(0, 0.5, 0.3), t);
    return petHead(pet);
  },
  d_dream(k, lt, t) {
    use(room, pet, ball);
    roomLook("night");
    propsOn(["dogbed"]);
    props.dogbed.position.set(0, 0, 0);
    tintPet(pet, false);
    place(pet, 0, 0.03, 0, 0.4);
    dogPose(pet, { mode: "side", paddle: true, sleep: true, wag: 0.4, tongue: false }, t);
    ball.position.set(0.5, 0, 0.3);
    park.add(ball);
    emit(room, zzz, V(0, 0.5, 0), t, 0.5, 0.5, 0.2);
    rFill.position.set(0.6, 1.2, 0.8);
    rFill.intensity = 1.5;
    setCam(V(0.9, 1, 1.4), V(0, 0.2, 0), t);
    return V(0, 0.55, 0.1);
  },
  d_sick(k, lt, t) {
    use(room, heroAdult, pet);
    roomLook("night");
    propsOn(["bed"]);
    props.bed.position.set(0.4, 0, -1.6);
    tintPet(pet, false);
    place(heroAdult, 0.4, 0.66, -1.45, 0);
    heroAdult.root.rotation.set(-1.45, 0, 0);
    pose(heroAdult, P(STAND, { lSh: [0, 0, 0.3], rSh: [-1.2, 0, -0.6], rEl: [-0.5] }));
    face(heroAdult, { mouth: "line", look: [0.4, -0.3], brow: 0.3, eye: 0.6 });
    place(pet, 1.15, 0.45, -1.3, -Math.PI / 2);
    dogPose(pet, { mode: "lie", head: [0.2, 0, 0], wag: 0.3, tongue: false, blink: t % 4 < 0.3 ? 1 : 0 }, t);
    pet.root.position.set(-0.15, 0.46, -1.6);
    pet.root.rotation.y = Math.PI / 2 + 0.3;
    rFill.position.set(1.2, 1.6, 0.2);
    rFill.intensity = 1.6;
    emit(room, hearts, V(0.75, 1, -1.6), t, 0.4, 0.5, 0.2, 1.6, k > 0.4);
    setCam(V(1.9, 1.4, -0.6), V(0.55, 0.7, -1.9), t);
    return petHead(pet);
  },
  d_end(k, lt, t) {
    return SCN.b_end(k, lt, t);
  }
};
var $ = (id) => document.getElementById(id);
var capEl = $("cap");
var badge = $("badge");
var cards = $("cards");
var th = $("thought");
var tht = $("tht");
var strokeShadow = (w, c) => {
  const a = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 16 * Math.PI * 2;
    a.push(`${(Math.cos(t) * w).toFixed(1)}px ${(Math.sin(t) * w).toFixed(1)}px 0 ${c}`);
  }
  return a.join(",") + `,0 ${w + 6}px 0 ${c}`;
};
capEl.style.textShadow = strokeShadow(3, "#000").replace(/,0 \d+px 0 #000$/, "") + ", 0 4px 14px rgba(0,0,0,.45)";
var ICON_AGE = '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2" fill="#ff5c8a" stroke="#1a1033" stroke-width="2.2"/><rect x="11" y="5" width="2" height="6" fill="#1a1033"/><path d="M12 1.5c1.5 1.8 1.5 3 0 3.6c-1.5-.6-1.5-1.8 0-3.6z" fill="#ff8a2a"/></svg>';
var ICON_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#fff" stroke="#1a1033" stroke-width="2.4"/><path d="M12 6v6l4 2" stroke="#1a1033" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
var bub = $("bub");
var bctx = bub.getContext("2d");
bub.width = W / 2;
bub.height = H / 2;
if (!PORT) {
  document.getElementById("badge").style.top = "60px";
  document.getElementById("title").style.top = "150px";
}
document.querySelector("#title .q").textContent = TR("\u0427\u0422\u041E \u0415\u0421\u041B\u0418\u2026");
function drawBubbles(p) {
  const BW = bub.width, BH = bub.height;
  bctx.clearRect(0, 0, BW, BH);
  if (p <= 0 || p >= 1) return;
  const cov = p < 0.5 ? eio(p * 2) : eio((1 - p) * 2);
  for (let i = 0; i < 70; i++) {
    const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < 0.5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110);
    bctx.fillStyle = ["#ff5c8a", "#ffd23f", "#5cc8ff", "#7ad66a"][i % 4];
    bctx.beginPath();
    bctx.arc(x, y, r, 0, 6.29);
    bctx.fill();
  }
}
var card = (top, inner, a) => `<div class="card" style="top:${PORT ? top : 150}px;${PORT ? "" : "left:79%;"}transform:translateX(-50%) scale(${(eob(a) * 0.9 + 0.1 * a).toFixed(3)});opacity:${clamp(a * 3)}">${inner}</div>`;
function cardFor(s, lt) {
  return TR(cardFor0(s, lt));
}
function cardFor0(s, lt) {
  const a = sm(0.2, 0.5, lt);
  switch (s.card) {
    case "avgCat":
      return card(360, '<div class="t">\u043A\u043E\u0448\u043A\u0438 \u0436\u0438\u0432\u0443\u0442</div><div class="v">\u2248 15 <small>\u043B\u0435\u0442</small></div><div class="n">\u0430 \u0442\u044B \u2014 \u043E\u043A\u043E\u043B\u043E 70\u201380</div>', a);
    case "avgDog":
      return card(360, '<div class="t">\u0441\u043E\u0431\u0430\u043A\u0438 \u0436\u0438\u0432\u0443\u0442</div><div class="v">10\u201313 <small>\u043B\u0435\u0442</small></div><div class="n">\u0430 \u0442\u044B \u2014 \u043E\u043A\u043E\u043B\u043E 70\u201380</div>', a);
    case "recCat":
      return card(360, '<div class="t">\u0440\u0435\u043A\u043E\u0440\u0434 \u0433\u0438\u043D\u043D\u0435\u0441\u0441\u0430</div><div class="v">38 <small>\u043B\u0435\u0442</small></div><div class="n">\u043A\u043E\u0448\u043A\u0430 \u041A\u0440\u0435\u043C \u041F\u0430\u0444\u0444, \u0421\u0428\u0410</div>', a);
    case "recDog":
      return card(360, '<div class="t">\u0440\u0435\u043A\u043E\u0440\u0434 \u0433\u0438\u043D\u043D\u0435\u0441\u0441\u0430</div><div class="v">29 <small>\u043B\u0435\u0442</small></div><div class="n">\u0441\u043E\u0431\u0430\u043A\u0430 \u0411\u043B\u0443\u0438, \u0410\u0432\u0441\u0442\u0440\u0430\u043B\u0438\u044F</div>', a);
  }
  return "";
}
window.setTime = function(t) {
  let i = shots.findIndex((s2) => t >= s2.start && t < s2.start + s2.len);
  if (i < 0) i = shots.length - 1;
  const s = shots[i], lt = t - s.start, k = clamp(lt / s.len);
  shake = 0;
  rFill.intensity = 0;
  [heroKid, heroTeen, heroAdult, hero50, heroOld, partner, kid1, kid2].forEach((h) => h.root.rotation.set(0, 0, 0));
  pet.root.scale.setScalar(1);
  props.desk.rotation.set(0, 0, 0);
  drawClock(s.badge && /\d\d:\d\d/.test(s.badge) ? +s.badge.slice(0, 2) : 10, s.badge && /\d\d:\d\d/.test(s.badge) ? +s.badge.slice(3, 5) : 10);
  pSun.color.set(16773336);
  const anchor = (SCN[s.scene] || SCN.a_hook)(k, lt, t);
  rp.scene = activeScene;
  if (window.__DBG_OFF) {
    const bad = [];
    activeScene.traverse((o) => {
      if (o.isMesh && o.visible) {
        o.updateMatrixWorld();
        const e = o.matrixWorld.elements;
        if (e.some((v) => !isFinite(v))) bad.push("M:" + (o.parent && o.parent.type) + ":" + o.geometry.type);
        const pa = o.geometry.attributes.position.array;
        for (let j = 0; j < pa.length; j++) if (!isFinite(pa[j])) {
          bad.push("G:" + o.geometry.type);
          break;
        }
        const na = o.geometry.attributes.normal;
        if (na) {
          for (let j = 0; j < na.array.length; j++) if (!isFinite(na.array[j])) {
            bad.push("N:" + o.geometry.type);
            break;
          }
        }
        if (na) for (let j = 0; j < na.count; j++) {
          const l = Math.hypot(na.getX(j), na.getY(j), na.getZ(j));
          if (l < 1e-6) {
            bad.push("Z:" + o.geometry.type + JSON.stringify(o.geometry.parameters || {}) + o.material.type);
            break;
          }
        }
      }
      if ((o.isPoints || o.isSprite) && o.visible) {
        o.updateMatrixWorld();
        if (o.matrixWorld.elements.some((v) => !isFinite(v))) bad.push("PS:" + o.type);
        if (o.isPoints) {
          const pa = o.geometry.attributes.position.array;
          for (let j = 0; j < pa.length; j++) if (!isFinite(pa[j])) {
            bad.push("PP");
            break;
          }
        }
        if (o.isSprite && !isFinite(o.material.opacity)) bad.push("SO");
      }
    });
    window.DBGOUT = bad.slice(0, 20);
  }
  composer.render();
  const prev = shots[i - 1], bStart = !prev || prev.badge !== s.badge;
  let b0 = s.start;
  for (let j = i; j >= 0 && shots[j].badge === s.badge; j--) b0 = shots[j].start;
  const bp = s.badge ? eob(clamp((t - b0) / 0.45)) : 0;
  badge.style.opacity = s.badge ? 1 : 0;
  badge.style.transform = `scale(${0.3 + 0.7 * bp}) rotate(${(1 - bp) * -8}deg)`;
  $("dayt").textContent = s.badge;
  $("bicon").innerHTML = /:/.test(s.badge) ? ICON_CLOCK : ICON_AGE;
  const tt = $("title");
  tt.style.opacity = i === 0 ? clamp(lt * 3) * (1 - sm(s.len - 0.3, s.len, lt)) * (s.thoughts.length ? 1 - sm(s.thoughts[0].a - 0.4, s.thoughts[0].a - 0.1, t) : 1) : 0;
  tt.style.transform = `scale(${i === 0 ? 0.6 + 0.4 * eob(clamp(lt * 2.5)) : 1})`;
  let html = "";
  const cw = s.words;
  if (cw.length) {
    let ci = s.chunks.findIndex((c) => t < cw[c[c.length - 1]].b + 0.05);
    if (ci < 0) ci = s.chunks.length - 1;
    const ch = s.chunks[ci];
    const lastB = cw[ch[ch.length - 1]].b;
    const inThought = s.thoughts.some((q2) => t >= q2.a - 0.1 && t <= q2.b + 0.2);
    if (t >= cw[ch[0]].a - 0.05 && !(inThought && t > lastB + 0.2)) ch.forEach((j) => {
      const w = cw[j];
      const a = clamp((t - w.a + 0.06) / 0.14);
      if (a <= 0) return;
      html += `<span class="${w.h ? "h" : ""}" style="transform:scale(${(a < 1 ? 0.4 + 0.6 * eob(a) : 1).toFixed(3)}) translateY(${((1 - a) * 20).toFixed(1)}px);opacity:${clamp(a * 2)}">${w.t.replace(/[.…]+$/, "").replace(/^…/, "")}</span>`;
    });
  }
  capEl.innerHTML = html;
  if (PORT) capEl.style.bottom = i === shots.length - 1 ? "760px" : "560px";
  else {
    capEl.style.bottom = i === shots.length - 1 ? "480px" : "70px";
    capEl.style.fontSize = "66px";
    capEl.style.left = "240px";
    capEl.style.right = "240px";
  }
  const q = s.thoughts.find((q2) => t >= q2.a - 0.15 && t <= q2.b + 0.5);
  if (q) {
    const a = clamp((t - q.a + 0.15) / 0.25) * (1 - clamp((t - q.b - 0.3) / 0.2));
    const n = Math.floor(clamp((t - q.a) / (q.b - q.a) * 1.05) * q.text.length);
    tht.textContent = q.text.slice(0, Math.max(1, n)).replace(/[.]+$/, "");
    let x = W / 2, y = H * 0.4;
    if (anchor) {
      const p = anchor.clone().project(camera);
      x = (p.x + 1) / 2 * W;
      y = (1 - p.y) / 2 * H;
    }
    x = clamp(x, 340, W - 340);
    const by = PORT ? clamp(y - 140, 560, 1150) : clamp(y - 110, 430, 760);
    th.style.opacity = a;
    th.style.left = x - 320 + "px";
    th.style.top = "0px";
    th.style.transform = `translateY(${by}px) translateY(-100%) scale(${(0.5 + 0.5 * eob(clamp((t - q.a + 0.15) / 0.3))).toFixed(3)})`;
    const d1 = th.querySelector(".d1"), d2 = th.querySelector(".d2");
    const dx = clamp((anchor ? (anchor.clone().project(camera).x + 1) / 2 * W : W / 2) - (x - 320), 80, 560);
    d1.style.cssText = `width:44px;height:44px;left:${dx - 22}px;bottom:-62px`;
    d2.style.cssText = `width:24px;height:24px;left:${dx - 12}px;bottom:-104px`;
  } else th.style.opacity = 0;
  cards.innerHTML = s.card ? cardFor(s, lt) : "";
  let bp2 = 0;
  const nx = shots[i + 1];
  if (i > 0 && bStart && s.badge !== prev.badge) bp2 = 0.5 + 0.5 * clamp(lt / 0.32);
  if (nx && nx.badge !== s.badge) {
    const r = s.len - lt;
    if (r < 0.32) bp2 = 0.5 * (1 - r / 0.32);
  }
  drawBubbles(bp2 > 0 && bp2 < 1 ? bp2 : 0);
  let bk = 0;
  if (i === 0) bk = 1 - sm(0, 0.5, t);
  if (i === shots.length - 1) bk = Math.max(bk, sm(s.len - 0.6, s.len, lt));
  $("black").style.opacity = bk;
};
window.TOTAL = TOTAL;
window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)))).then(() => {
  window.setTime(0);
  return true;
});
