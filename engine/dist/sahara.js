// core.js
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
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
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
var fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.1;
var rnd = (i, k = 0) => hash(i * 1.37 + k * 9.1, k * 3.3 + i * 0.71);
var gradTex = (() => {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
var T = (color, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradTex }, o));
var B = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, o));
var olMats = {};
function olMat(th) {
  if (olMats[th]) return olMats[th];
  return olMats[th] = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: `void main(){ vec3 p = position + normal * ${th.toFixed(4)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`, fragmentShader: `void main(){ gl_FragColor = vec4(.078,.047,.165,1.); }` });
}
var smoothCache = /* @__PURE__ */ new WeakMap();
function ol(mesh, th = 0.018) {
  let g = smoothCache.get(mesh.geometry);
  if (!g) {
    const p = new THREE.BufferGeometry();
    p.setAttribute("position", mesh.geometry.attributes.position.clone());
    if (mesh.geometry.index) p.setIndex(mesh.geometry.index.clone());
    g = mergeVertices(p, 1e-3);
    g.computeVertexNormals();
    smoothCache.set(mesh.geometry, g);
  }
  const o = new THREE.Mesh(g, olMat(th));
  o.userData.isOutline = true;
  mesh.add(o);
  return mesh;
}
function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], sc = null, th = 0.018) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (sc) m.scale.set(...sc);
  if (th) ol(m, th);
  parent.add(m);
  return m;
}
var G = (parent, pos = [0, 0, 0], rot = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  if (parent) parent.add(g);
  return g;
};
var Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
var Sph = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b);
var Cap = (r, l, s = 12) => new THREE.CapsuleGeometry(r, l, 5, s);
var Cyl = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
function capDown(r, len) {
  const g = Cap(r, len);
  g.translate(0, -len / 2, 0);
  return g;
}
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
function canvasTex(w, h, draw2) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.redraw = (...a) => {
    draw2(c.getContext("2d"), w, h, ...a);
    t.needsUpdate = true;
  };
  t.redraw();
  return t;
}
function makeSky(top, bot, r = 300) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bot) } },
    vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float h = clamp(p.y*.5+.5,0.,1.); gl_FragColor = vec4(mix(b,a,pow(h,1.6)),1.); }"
  }));
  m.renderOrder = -10;
  m.frustumCulled = false;
  m.set = (t, b) => {
    m.material.uniforms.a.value.set(t);
    m.material.uniforms.b.value.set(b);
  };
  return m;
}
function starSphere(r = 1500, n = 2600) {
  const tex = canvasTex(4096, 2048, (c, w, h) => {
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const x = rnd(i, 1) * w, y = Math.acos(1 - 2 * rnd(i, 2)) / Math.PI * h, s = 1.2 + rnd(i, 3) * 2.2;
      c.fillStyle = `rgba(255,255,255,${0.5 + rnd(i, 4) * 0.5})`;
      c.beginPath();
      c.arc(x, y, s, 0, 6.29);
      c.fill();
    }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }));
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}
function points(n, color, size, opts = {}) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const { keep, ...mo } = opts;
  const m = new THREE.PointsMaterial(Object.assign({ map: dotTex, color, size, transparent: true, opacity: 1, depthWrite: false }, mo));
  const o = new THREE.Points(g, m);
  o.frustumCulled = false;
  o.pos = p;
  o.upd = () => g.attributes.position.needsUpdate = true;
  if (!opts.keep) o.layers.set(31);
  return o;
}
function makeHuman(o = {}) {
  const top = T(o.top ?? 5209343), pants = T(o.pants ?? 2830149), skin = T(o.skin ?? 16762528), hairM = T(o.hair ?? 5911584), white = T(15790326), blk = B(1313834), shoe = T(o.shoe ?? 16777215), cheek = B(16748442, { transparent: true, opacity: 0.55 });
  const J = { mats: { hair: hairM, top, skin, pants } };
  const root = new THREE.Group();
  J.root = root;
  const spine = G(root);
  J.spine = spine;
  add(spine, Cap(0.2, 0.2, 16), top, [0, 0.25, 0], [0, 0, 0], [1.05, 1, 0.85], 0.016);
  if (o.dress) add(spine, new THREE.ConeGeometry(0.3, 0.4, 18), top, [0, 0.02, 0], [0, 0, 0], null, 0.016);
  if (o.robe) add(spine, new THREE.ConeGeometry(0.32, 0.62, 18), top, [0, -0.08, 0], [0, 0, 0], null, 0.016);
  if (o.backpack) {
    add(spine, Box(0.3, 0.32, 0.14), T(o.backpack), [0, 0.28, -0.2], [0, 0, 0], null, 0.014);
    add(spine, Cyl(0.05, 0.05, 0.2, 10), T(5232895), [0.12, 0.35, -0.27], [0, 0, 0], null, 0.01);
  }
  if (o.bib) add(spine, new THREE.PlaneGeometry(0.18, 0.13), B(16777215), [0, 0.26, 0.178], [0, 0, 0], null, 0);
  if (o.suit) {
    add(spine, Box(0.22, 0.14, 0.05), T(14278120), [0, 0.3, 0.17], [0, 0, 0], null, 0.01);
    add(spine, new THREE.CircleGeometry(0.025, 12), B(16730972), [-0.06, 0.31, 0.197], [0, 0, 0], null, 0);
    add(spine, new THREE.CircleGeometry(0.025, 12), B(5232895), [0.05, 0.31, 0.197], [0, 0, 0], null, 0);
    add(spine, new THREE.CircleGeometry(0.04, 16), B(o.patch ?? 2845951), [0.17, 0.4, 0.07], [0, 0.9, 0], null, 0);
  }
  const neck = G(spine, [0, 0.52, 0]);
  J.neck = neck;
  const head = G(neck, [0, 0.04, 0]);
  J.head = head;
  add(head, Sph(0.24, 28, 22), skin, [0, 0.22, 0], [0, 0, 0], [1, 0.95, 0.95], 0.016);
  if (o.hairStyle === "wrap") {
    add(head, new THREE.SphereGeometry(0.262, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), T(o.wrap ?? 2776022), [0, 0.23, -0.01], [-0.3, 0, 0], null, 0.014);
    add(head, Cap(0.14, 0.16, 12), T(o.wrap ?? 2776022), [0, 0.05, -0.16], [0.3, 0, 0], null, 0.012);
  } else if (o.hairStyle !== "bald") {
    add(head, new THREE.SphereGeometry(0.252, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, [0, 0.235, -0.015], [-0.35, 0, 0], null, 0.014);
    add(head, Sph(0.09, 12, 10), hairM, [0.06, 0.44, 0.1], [0.4, 0, -0.3], [1.4, 0.7, 1], 0.012);
  } else add(head, new THREE.SphereGeometry(0.25, 28, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.3), hairM, [0, 0.22, -0.02], [-0.2, 0, 0], null, 0.012);
  if (o.hairStyle === "long") {
    add(head, Cap(0.2, 0.25, 16), hairM, [0, 0.1, -0.1], [0, 0, 0], [1.15, 1, 0.7], 0.014);
    for (const x of [-0.2, 0.2]) add(head, Cap(0.06, 0.2, 10), hairM, [x, 0.1, 0.05], [0, 0, 0], null, 0.012);
  }
  if (o.cap) {
    add(head, new THREE.SphereGeometry(0.258, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), T(o.cap), [0, 0.24, -0.01], [-0.25, 0, 0], null, 0.012);
    add(head, Cyl(0.17, 0.17, 0.025, 20), T(o.cap), [0, 0.34, 0.2], [0.35, 0, 0], [1, 1, 0.7], 0.01);
    if (o.neckFlap) add(head, Box(0.36, 0.2, 0.02), T(15988218), [0, 0.16, -0.2], [0.25, 0, 0], null, 8e-3);
  }
  if (o.pilotCap) {
    add(head, Cyl(0.26, 0.24, 0.1, 22), T(1911386), [0, 0.42, 0], [-0.1, 0, 0], null, 0.012);
    add(head, Box(0.2, 0.03, 0.12), T(1118481), [0, 0.39, 0.22], [0.4, 0, 0], null, 8e-3);
    add(head, new THREE.CircleGeometry(0.04, 12), B(16765503), [0, 0.44, 0.25], [-0.1, 0, 0], null, 0);
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
    J.brows.push(add(head, Cap(0.014, 0.07, 8), o.hairStyle === "wrap" ? T(2759184) : hairM, [x, 0.325, 0.2], [0, 0, Math.PI / 2], null, 6e-3));
  }
  if (o.glasses) for (const x of [-0.085, 0.085]) add(head, new THREE.TorusGeometry(0.07, 0.012, 6, 20), blk, [x, 0.23, 0.23], [0, 0, 0], null, 0);
  if (o.beard) add(head, Sph(0.2, 20, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hairM, [0, 0.2, 0.03], [0, 0, 0], [1, 1, 1], 0.012);
  if (o.stubble) add(head, Sph(0.235, 20, 14, -Math.PI * 0.3, Math.PI * 0.6, Math.PI * 0.6, Math.PI * 0.25), T(6965818, { transparent: true, opacity: 0.35 }), [0, 0.22, 0.01], [0, 0, 0], null, 0);
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
  if (o.headset) {
    add(head, new THREE.TorusGeometry(0.27, 0.022, 6, 24, Math.PI), T(2830149), [0, 0.24, -0.01], [0, 0, 0], null, 8e-3);
    for (const x of [-0.265, 0.265]) add(head, Cyl(0.065, 0.065, 0.06, 16), T(2830149), [x, 0.2, 0], [0, 0, Math.PI / 2], null, 0.01);
    add(head, Cap(0.01, 0.14, 6), T(2830149), [-0.2, 0.08, 0.13], [0, -0.7, Math.PI / 2], null, 5e-3);
    add(head, Sph(0.022, 8, 6), B(16730972), [-0.15, 0.08, 0.2], [0, 0, 0], null, 5e-3);
  }
  if (o.helmet) {
    J.helmet = add(head, Sph(0.36, 28, 20), new THREE.MeshToonMaterial({ color: 12576511, gradientMap: gradTex, transparent: true, opacity: 0.28, depthWrite: false }), [0, 0.2, 0.02], [0, 0, 0], null, 0);
    add(head, new THREE.TorusGeometry(0.3, 0.05, 10, 28), T(14278120), [0, -0.08, 0], [Math.PI / 2, 0, 0], null, 0.01);
  }
  const L1 = 0.17, L2 = 0.16;
  J.L1 = L1;
  J.L2 = L2;
  for (const [s, side] of [["l", 1], ["r", -1]]) {
    const sh = G(spine, [side * 0.22, 0.38, 0]);
    add(sh, capDown(0.058, L1), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    const el = G(sh, [0, -L1, 0]);
    add(el, capDown(0.052, L2), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(el, Sph(0.06, 14, 10), o.gloves ? T(o.gloves) : skin, [0, -L2 - 0.03, 0], [0, 0, 0], null, 0.01);
    J[s + "Sh"] = sh;
    J[s + "El"] = el;
    const hip = G(root, [side * 0.1, 0.02, 0]);
    add(hip, capDown(0.075, 0.19), pants, [0, 0, 0], [0, 0, 0], null, 0.012);
    const kn = G(hip, [0, -0.19, 0]);
    add(kn, capDown(0.068, 0.17), o.legSkin ? skin : pants, [0, 0, 0], [0, 0, 0], null, 0.012);
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
  J.eyes.forEach((e) => {
    e.scale.set(1, bl, 1);
    e.scale.multiplyScalar(f.eyeS || 1);
  });
  const lk = f.look || [0, 0];
  J.pupils.forEach((p) => {
    p.position.set(lk[0] * 0.022, lk[1] * 0.022, 0);
    p.scale.setScalar(f.pupil || 1);
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
function runPose(t, sp = 13, amp = 0.9) {
  const s = Math.sin(t * sp);
  return { lHip: [s * amp - 0.2], rHip: [-s * amp - 0.2], lKn: [0.4 + Math.max(0, -s) * 1.1], rKn: [0.4 + Math.max(0, s) * 1.1], lSh: [-s * 0.9, 0, 0.15], rSh: [s * 0.9, 0, -0.15], lEl: [-1.4], rEl: [-1.4], spine: [0.22] };
}
var bob = (t, sp = 13) => Math.abs(Math.sin(t * sp)) * 0.06;
var _q = new THREE.Quaternion();
var _q2 = new THREE.Quaternion();
var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
var camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 3e3);
var BASEFOV = PORT ? 2 * Math.atan(Math.tan(23 * Math.PI / 180) / (W / H)) * 180 / Math.PI : 46;
camera.fov = BASEFOV;
camera.updateProjectionMatrix();
var composer = new EffectComposer(renderer);
var rp = new RenderPass(new THREE.Scene(), camera);
composer.addPass(rp);
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) { c = texture2D(tDiffuse, vUv + vec2(.002,0.)); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); } gl_FragColor = clamp(c, 0., 3.); }" }));
var bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.45, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());
var shake = 0;
var setShake = (v) => {
  shake = v;
};
function setCam(pos, tgt, t = 0, o = {}) {
  let p = pos.clone();
  if (!PORT && !o.keep) p = p.sub(tgt).multiplyScalar(o.land ?? 1).add(tgt);
  camera.position.copy(p);
  if (shake > 0) camera.position.add(V(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, Math.sin(t * 63) * shake * 0.5));
  camera.up.set(0, 1, 0);
  if (o.roll) camera.up.set(Math.sin(o.roll), Math.cos(o.roll), 0);
  camera.lookAt(tgt);
  const f = o.fov ? PORT ? 2 * Math.atan(Math.tan(o.fov / 2 * Math.PI / 180) / (W / H)) * 180 / Math.PI : o.fov : BASEFOV;
  if (camera.fov !== f) {
    camera.fov = f;
    camera.updateProjectionMatrix();
  }
}
function draw(scene) {
  rp.scene = scene;
  composer.render();
}
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
  for (let i = 0; i < 70; i++) {
    const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < 0.5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110);
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
var fmtN = (n) => EN ? Math.round(n).toLocaleString("en-US") : Math.round(n).toLocaleString("ru-RU").replace(/[  ,]/g, " ");
var L = (ru, en) => EN ? en : ru;
function card(top, inner, a, o = {}) {
  if (!PORT) top = o.ltop ?? 150;
  const left = PORT ? o.left ?? 50 : o.lleft ?? 79;
  return `<div class="card" style="top:${top}px;left:${left}%;transform:translateX(-50%) scale(${eob(a) * 0.9 + 0.1 * a});opacity:${clamp(a * 3)}">${inner}</div>`;
}
function paper(a, k, inner, o = {}) {
  const z = 1 + k * 0.05;
  return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${0.72 * a})"></div><div style="position:absolute;left:50%;top:${PORT ? o.top ?? 400 : o.ltop ?? 80}px;width:${PORT ? 840 : 760}px;transform:translateX(-50%) rotate(${lerp(-3.5, -1.5, k)}deg) scale(${z * (0.85 + 0.15 * eob(sm(0, 0.35, a)))});opacity:${a};background:#f4e6c8;border:8px solid #1a1033;border-radius:18px;box-shadow:0 16px 0 #1a1033;padding:30px;color:#3a2a1a;text-align:center">${inner}</div>`;
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
    const fx2 = topic.fx ? topic.fx(s, lt, k, i) || {} : {};
    let fl = fx2.fl || 0, bk = fx2.bk || 0;
    if (i === 0) bk = Math.max(bk, 1 - sm(0, 0.5, t));
    if (i === shots.length - 1) bk = Math.max(bk, sm(s.dur - 0.5, s.dur, lt));
    $("flash").style.opacity = fl;
    $("flash").style.background = fx2.flc || "#fff";
    $("black").style.opacity = bk;
    if (OV) window.__ovSig = [full.innerHTML, cards.innerHTML, capEl.innerHTML, badge.style.cssText, s.badge, s.loc, capEl.style.cssText, (bp2 > 0 && bp2 < 1 ? bp2 : 0).toFixed(3), fl.toFixed(3), fx2.flc || "", bk.toFixed(3)].join("|");
  };
  window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)))).then(() => {
    window.setTime(0);
    return true;
  });
}

// topics/_town.js
var dmy = new THREE.Object3D();
function makeCow(sheep = false, goat = false) {
  const g = new THREE.Group();
  const c1 = T(sheep ? 16184042 : goat ? 12094042 : 16777215), c2 = T(goat ? 6965802 : 2830149), pk = T(16756920);
  if (sheep) {
    add(g, new THREE.IcosahedronGeometry(0.55, 1), c1, [0, 0.75, 0], [0, 0, 0], [1.3, 0.9, 1], 0.02);
  } else {
    add(g, Cap(0.32, 0.7, 12), c1, [0, 0.8, 0], [0, 0, Math.PI / 2], [1, 1, goat ? 0.8 : 1], 0.02);
    if (!goat) for (let i = 0; i < 3; i++) add(g, Sph(0.16, 10, 8), c2, [-0.3 + i * 0.3, 0.95 + i % 2 * 0.1, 0.22 - i % 2 * 0.4], [0, 0, 0], [1, 0.6, 0.5], 0);
  }
  const head = G(g, [0.62, 1, 0]);
  add(head, Sph(0.24, 14, 10), sheep ? c2 : c1, [0, 0, 0], [0, 0, 0], [1.2, 0.9, 0.9], 0.016);
  if (!sheep) add(head, Sph(0.13, 10, 8), pk, [0.22, -0.08, 0], [0, 0, 0], [0.8, 0.7, 1.1], 0.01);
  for (const z of [-0.1, 0.1]) add(head, Sph(0.035, 8, 6), B(1313834), [0.15, 0.07, z], [0, 0, 0], null, 0);
  if (!sheep) for (const z of [-0.14, 0.14]) add(head, new THREE.ConeGeometry(0.04, 0.2, 6), T(15984328), [-0.05, 0.2, z], [0, 0, z * 2], null, 6e-3);
  if (goat) add(head, new THREE.ConeGeometry(0.05, 0.18, 6), c2, [0.12, -0.24, 0], [Math.PI, 0, 0], null, 6e-3);
  for (const x of [-0.32, 0.32]) for (const z of [-0.18, 0.18]) add(g, Cyl(0.07, 0.06, 0.5, 8), sheep ? c2 : c1, [x, 0.25, z], [0, 0, 0], null, 0.012);
  g.userData.head = head;
  g.scale.setScalar(goat ? 0.75 : 1);
  return g;
}
function makePlane747(scale = 1, livery = 15988218, stripe = 2838486) {
  const g = new THREE.Group();
  const wh = T(livery), st = T(stripe), dk = T(2830149);
  add(g, Cap(0.6, 7, 18), wh, [0, 0, 0], [0, 0, Math.PI / 2], null, 0.03);
  add(g, Cap(0.45, 1.6, 14), wh, [2.6, 0.45, 0], [0, 0, Math.PI / 2], null, 0.02);
  add(g, Box(7, 0.12, 0.04), st, [0, -0.05, 0.6], [0, 0, 0], null, 0);
  add(g, Box(7, 0.12, 0.04), st, [0, -0.05, -0.6], [0, 0, 0], null, 0);
  const wing = new THREE.Shape();
  wing.moveTo(0.8, 0);
  wing.lineTo(-1.6, 5);
  wing.lineTo(-2.4, 5);
  wing.lineTo(-1.2, 0);
  for (const s of [-1, 1]) {
    const wgm = new THREE.ExtrudeGeometry(wing, { depth: 0.12, bevelEnabled: false });
    wgm.rotateX(Math.PI / 2);
    if (s < 0) wgm.scale(1, 1, -1);
    add(g, wgm, wh, [0, -0.2, 0], [0, 0, 0], null, 0.015);
  }
  const engines = [];
  for (const s of [-1, 1]) for (const zz of [1.7, 3.3]) {
    const eg = G(g, [-0.2 - zz * 0.32 + 0.6, -0.55, s * zz]);
    add(eg, Cyl(0.26, 0.22, 1.1, 14), dk, [0, 0, 0], [0, 0, Math.PI / 2], null, 0.012);
    const glow = add(eg, new THREE.CircleGeometry(0.2, 14), B(5953791, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [-0.56, 0, 0], [0, -Math.PI / 2, 0], null, 0);
    const fire = add(eg, Sph(0.24, 10, 8), B(16747066, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [-0.6, 0, 0], [0, 0, 0], [1.6, 1, 1], 0);
    engines.push({ eg, glow, fire });
  }
  const tail = new THREE.Shape();
  tail.moveTo(0, 0);
  tail.lineTo(-1.2, 2.2);
  tail.lineTo(-1.8, 2.2);
  tail.lineTo(-1.4, 0);
  add(g, new THREE.ExtrudeGeometry(tail, { depth: 0.08, bevelEnabled: false }), st, [-2.6, 0.3, -0.04], [0, 0, 0], null, 0.012);
  const ht = new THREE.Shape();
  ht.moveTo(0, 0);
  ht.lineTo(-0.8, 1.8);
  ht.lineTo(-1.3, 1.8);
  ht.lineTo(-1, 0);
  for (const s of [-1, 1]) {
    const hg = new THREE.ExtrudeGeometry(ht, { depth: 0.06, bevelEnabled: false });
    hg.rotateX(Math.PI / 2);
    if (s < 0) hg.scale(1, 1, -1);
    add(g, hg, wh, [-3, 0.1, 0], [0, 0, 0], null, 0.01);
  }
  for (let i = 0; i < 14; i++) for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(0.06, 8), B(1708083), [2.4 - i * 0.38, 0.2, s * 0.6], [0, s > 0 ? 0 : Math.PI, 0], null, 0);
  add(g, Box(0.3, 0.14, 0.5), B(1708083), [3.9, 0.32, 0], [0, 0, -0.5], null, 0);
  g.scale.setScalar(scale);
  g.userData.engines = engines;
  return g;
}
var ZONES = { street: V(0, 0, 0), farm: V(260, 0, 0), beach: V(-260, 0, 0), river: V(0, 0, 260), plaza: V(0, 0, -260), volcano: V(520, 0, 0), airport: V(0, 0, -560) };

// topics/sahara/scene.js
var dmy2 = new THREE.Object3D();
var blink = (t) => t % 3.3 < 0.1;
var ds = new THREE.Scene();
var sky = makeSky(9423088, 16773328, 900);
ds.add(sky);
ds.fog = new THREE.Fog(16310448, 60, 380);
var hemi = new THREE.HemisphereLight(16774888, 11567184, 1.7);
ds.add(hemi);
var sun = new THREE.DirectionalLight(16773328, 2);
sun.position.set(-40, 60, 30);
ds.add(sun);
var DH = (x, z) => Math.sin(x * 0.045 + Math.sin(z * 0.03) * 1.4) * 3.2 + Math.sin(z * 0.07 + x * 0.02) * 1.6 + (fbm(x * 0.02, z * 0.02) - 0.5) * 5;
{
  const g = new THREE.PlaneGeometry(900, 900, 160, 160);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, DH(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  add(ds, g, T(15909498), [0, 0, 0], [0, 0, 0], null, 0);
}
var at = (x, z, y = 0) => V(x, DH(x, z) + y, z);
var stars = starSphere(850, 1500);
ds.add(stars);
var sunDisk = add(ds, new THREE.CircleGeometry(26, 40), B(16773824, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0);
var moon = add(ds, new THREE.CircleGeometry(12, 32), B(15791359, { fog: false }), [120, 260, -700], [0, 0, 0], null, 0);
var ROCK = V(-60, 0, -80);
for (let i = 0; i < 14; i++) {
  const s = 3 + rnd(i, 1) * 7;
  const p = at(ROCK.x + (rnd(i, 2) - 0.5) * 40, ROCK.z + (rnd(i, 3) - 0.5) * 26);
  add(ds, new THREE.DodecahedronGeometry(s, 0), T(i % 2 ? 12613706 : 11035706), [p.x, p.y + s * 0.4, p.z], [rnd(i, 4) * 3, rnd(i, 5) * 3, 0], [1.3, 0.9, 1], 0.05);
}
var BUSH = at(8, 6);
var bush = G(ds, BUSH.toArray());
for (let i = 0; i < 6; i++) add(bush, new THREE.IcosahedronGeometry(0.6 + rnd(i, 9) * 0.3, 0), T(8030778), [(rnd(i, 1) - 0.5) * 1.4, 0.4 + rnd(i, 2) * 0.5, (rnd(i, 3) - 0.5) * 1.2], [rnd(i, 4), rnd(i, 5), 0], null, 0.02);
var SH = at(60, -40);
var shrine = G(ds, [SH.x, SH.y - 0.3, SH.z]);
add(shrine, Box(5, 3.6, 5), T(15986144), [0, 1.8, 0], [0, 0, 0], null, 0.04);
add(shrine, new THREE.SphereGeometry(2.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), T(15986144), [0, 3.6, 0], [0, 0, 0], null, 0.04);
add(shrine, Box(1.2, 2, 0.1), B(2759184), [0, 1, 2.52], [0, 0, 0], null, 0);
var flagG = G(shrine, [1.6, 3.6, 1.6]);
add(flagG, Cyl(0.04, 0.04, 2.4, 6), T(9071178), [0, 1.2, 0], [0, 0, 0], null, 6e-3);
var flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8, 12, 4), new THREE.MeshToonMaterial({ gradientMap: void 0, side: THREE.DoubleSide, map: canvasTex(96, 64, (c, w, h) => {
  c.fillStyle = "#1aa04a";
  c.fillRect(0, 0, w / 3, h);
  c.fillStyle = "#ffffff";
  c.fillRect(w / 3, 0, w / 3, h);
  c.fillStyle = "#e02a2a";
  c.fillRect(2 * w / 3, 0, w / 3, h);
}) }));
flag.position.set(0.6, 2, 0);
flagG.add(flag);
flagG.visible = false;
var flagBase = flag.geometry.attributes.position.array.slice();
var SOSP = at(52, -30);
var sos = G(ds, [SOSP.x, SOSP.y + 0.05, SOSP.z]);
sos.visible = false;
{
  const pts = [];
  const SP = [[0.8, -1.6], [0.3, -1.8], [-0.3, -1.8], [-0.8, -1.5], [-0.8, -0.9], [-0.4, -0.25], [0.4, 0.25], [0.8, 0.9], [0.8, 1.5], [0.3, 1.8], [-0.3, 1.8], [-0.8, 1.6]];
  const S = (ox) => SP.forEach(([x, z]) => pts.push([ox + x, z]));
  S(-3.2);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.283;
    pts.push([Math.cos(a) * 1, Math.sin(a) * 1.7]);
  }
  S(3.2);
  pts.forEach(([x, z], i) => add(sos, new THREE.DodecahedronGeometry(0.28, 0), T(6113850), [x, 0.1, z], [i, i * 2, 0], [1, 0.6, 1], 0.012));
}
var fireG = G(ds, [SOSP.x + 6, SOSP.y, SOSP.z + 1]);
fireG.visible = false;
add(fireG, Cyl(0.6, 0.7, 0.2, 10), T(6113850), [0, 0.1, 0], [0, 0, 0], null, 0.01);
var flame = add(fireG, new THREE.ConeGeometry(0.5, 1.3, 10), B(16752688, { transparent: true, opacity: 0.9 }), [0, 0.8, 0], [0, 0, 0], null, 0);
var flame2 = add(fireG, new THREE.ConeGeometry(0.28, 0.8, 10), B(16773280), [0, 0.6, 0], [0, 0, 0], null, 0);
var smoke = points(220, 9077904, 1.8, { opacity: 0 });
ds.add(smoke);
var OA = at(-120, 60);
var oasis = G(ds, [OA.x, OA.y - 0.2, OA.z]);
add(oasis, new THREE.CircleGeometry(3, 28), T(4172e3, { emissive: 1727114, emissiveIntensity: 0.3 }), [0, 0.25, 0], [-Math.PI / 2, 0, 0], [1.4, 1, 1], 0);
add(oasis, new THREE.CircleGeometry(4.6, 28), T(10137674), [0, 0.2, 0], [-Math.PI / 2, 0, 0], [1.3, 1, 1], 0);
for (let i = 0; i < 4; i++) {
  const pg = G(oasis, [Math.cos(i * 1.7) * 5.5, 0, Math.sin(i * 1.7) * 4.5]);
  const h = 5 + rnd(i, 1) * 2;
  for (let j = 0; j < 6; j++) add(pg, Cyl(0.22 - j * 0.02, 0.24 - j * 0.02, h / 6, 8), T(10119738), [Math.sin(j * 0.3) * 0.3 * j * 0.3, h / 12 + j * h / 6, 0], [0, 0, -0.06 * j], null, 0.01);
  for (let j = 0; j < 7; j++) {
    const lf = add(pg, Box(2.6, 0.05, 0.5), T(4890698), [Math.cos(j * 0.9) * 1.2 + 0.6, h + 0.1, Math.sin(j * 0.9) * 1.2], [0, -j * 0.9, -0.35], null, 0.01);
  }
}
var goats = [];
for (let i = 0; i < 6; i++) {
  const g = makeCow(false, true);
  g.position.copy(at(-140 + i % 3 * 3, 80 + Math.floor(i / 3) * 3));
  g.rotation.y = rnd(i, 4) * 6;
  ds.add(g);
  goats.push(g);
}
var girl = makeHuman({ top: 2776022, pants: 2776022, robe: true, hairStyle: "wrap", wrap: 1718944, skin: 11565642, scale: 0.78 });
ds.add(girl.root);
var tracks = new THREE.InstancedMesh(new THREE.CircleGeometry(0.12, 8), B(10119738), 80);
tracks.frustumCulled = false;
ds.add(tracks);
for (let i = 0; i < 80; i++) {
  const a = i / 80;
  const p = at(-125 - a * 14 + i % 2 * 0.4, 64 + a * 15, 0.06);
  dmy2.position.copy(p);
  dmy2.rotation.set(-Math.PI / 2, 0, 0);
  dmy2.scale.set(1, 1.5, 1);
  dmy2.updateMatrix();
  tracks.setMatrixAt(i, dmy2.matrix);
}
var heli = new THREE.Group();
ds.add(heli);
add(heli, Cap(0.9, 1.6, 12), T(15988218), [0, 0, 0], [0, 0, Math.PI / 2], null, 0.04);
add(heli, Cyl(0.15, 0.25, 3, 8), T(15988218), [-2.4, 0.3, 0], [0, 0, Math.PI / 2], null, 0.03);
add(heli, Box(0.1, 1, 0.6), T(16730972), [-3.8, 0.7, 0], [0, 0, 0], null, 0.02);
var rotor = add(heli, Box(7, 0.06, 0.3), T(2830149), [0, 1.2, 0], [0, 0, 0], null, 0.015);
add(heli, Sph(0.6, 12, 10), T(6994175, { emissive: 2775690, emissiveIntensity: 0.3 }), [1.2, 0.1, 0], [0, 0, 0], [1, 0.8, 0.9], 0.02);
var jet = makePlane747(1.6);
ds.add(jet);
var flare = points(120, 16736320, 0.7, { blending: THREE.AdditiveBlending, opacity: 0 });
ds.add(flare);
var liz = G(ds);
add(liz, Cap(0.12, 0.5, 8), T(10137674), [0, 0.1, 0], [0, 0, Math.PI / 2], null, 0.01);
add(liz, new THREE.ConeGeometry(0.08, 0.6, 6), T(10137674), [-0.55, 0.08, 0], [0, 0, Math.PI / 2], null, 8e-3);
add(liz, Sph(0.1, 8, 6), T(10137674), [0.38, 0.12, 0], [0, 0, 0], [1.3, 0.8, 1], 0.01);
var snakeCurve = [];
for (let i = 0; i <= 20; i++) snakeCurve.push(V(i * 0.15, 0.08, Math.sin(i * 0.7) * 0.25));
var snake = add(ds, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(snakeCurve), 40, 0.07, 6), T(13146698), [0, 0, 0], [0, 0, 0], null, 0.01);
var sand = points(3e3, 15247456, 2.4, { opacity: 0 });
ds.add(sand);
var RUN = (o) => makeHuman(Object.assign({ top: 16742943, pants: 2830149, legSkin: true, hair: 2759184, cap: 15988218, neckFlap: true, backpack: 5209343, bib: true, stubble: true, skin: 15249544 }, o));
var man = RUN({});
ds.add(man.root);
var others = [RUN({ top: 5232895, cap: 16765503 }), RUN({ top: 6094746, cap: 16730972 })];
others.forEach((o) => ds.add(o.root));
var mound = add(ds, Sph(1, 18, 12), T(15250538), [0, 0, 0], [0, 0, 0], [1.4, 0.45, 0.7], 0.02);
var TOD = { day: [9423088, 16773328, 16310448, 2, 1.7, V(-40, 60, 30)], hot: [11063536, 16775392, 16773320, 2.4, 1.9, V(-10, 80, 20)], sunset: [6970032, 16751194, 15769712, 1.4, 1.2, V(-80, 12, -60)], night: [659504, 1714778, 1712192, 0.25, 0.45, V(60, 50, -40)], dawn: [9083608, 16760992, 16304296, 1.2, 1.3, V(80, 10, -60)], storm: [12615760, 14721120, 14194762, 0.9, 1.3, V(-40, 60, 30)] };
function setTOD(k, sd = true) {
  const p = TOD[k];
  sky.set(p[0], p[1]);
  ds.fog.color.set(p[2]);
  sun.intensity = p[3];
  hemi.intensity = p[4];
  sun.position.copy(p[5]);
  sunDisk.visible = sd && k !== "night";
  sunDisk.position.copy(p[5].clone().normalize().multiplyScalar(820));
  sunDisk.lookAt(0, 0, 0);
  stars.visible = k === "night";
  moon.visible = k === "night";
  ds.fog.near = 60;
  ds.fog.far = 380;
}
var inn = new THREE.Scene();
inn.background = new THREE.Color(1708040);
inn.add(new THREE.HemisphereLight(16767136, 3153936, 0.9));
var beamL = new THREE.SpotLight(16769184, 12, 20, 0.5, 0.6, 1);
beamL.position.set(0, 2.2, 3.5);
beamL.target.position.set(0, 0, -1);
inn.add(beamL, beamL.target);
add(inn, Box(5, 3.6, 5), T(13152400, { side: THREE.BackSide }), [0, 1.8, 0], [0, 0, 0], null, 0);
var batGeo;
{
  const b = new THREE.CapsuleGeometry(0.07, 0.12, 4, 8);
  const w = new THREE.ConeGeometry(0.16, 0.26, 3);
  w.rotateX(Math.PI);
  w.scale(1.4, 1, 0.2);
  const w1 = w.clone();
  w1.translate(0.1, 0, 0);
  const w2 = w.clone();
  w2.translate(-0.1, 0, 0);
  const e1 = new THREE.ConeGeometry(0.025, 0.07, 4);
  e1.translate(0.03, 0.14, 0);
  const e2 = e1.clone();
  e2.translate(-0.06, 0, 0);
  batGeo = mergeGeometries([b.toNonIndexed(), w1.toNonIndexed(), w2.toNonIndexed(), e1.toNonIndexed(), e2.toNonIndexed()]);
  batGeo.computeVertexNormals();
}
var bats = new THREE.InstancedMesh(batGeo, T(3811898), 40);
bats.frustumCulled = false;
inn.add(bats);
for (let i = 0; i < 40; i++) {
  dmy2.position.set((rnd(i, 1) - 0.5) * 4, 3.4, (rnd(i, 2) - 0.5) * 4);
  dmy2.rotation.set(Math.PI, rnd(i, 3) * 6, 0);
  dmy2.scale.setScalar(1 + rnd(i, 4) * 0.4);
  dmy2.updateMatrix();
  bats.setMatrixAt(i, dmy2.matrix);
}
var man2 = RUN({ backpack: void 0 });
inn.add(man2.root);
var hosp = new THREE.Scene();
hosp.background = new THREE.Color(14675696);
hosp.add(new THREE.HemisphereLight(16777215, 10530992, 1.9));
{
  const d = new THREE.DirectionalLight(16777215, 0.7);
  d.position.set(3, 5, 4);
  hosp.add(d);
}
add(hosp, Box(8, 4, 8), T(15267060, { side: THREE.BackSide }), [0, 2, 0], [0, 0, 0], null, 0);
add(hosp, Box(1.4, 0.5, 2.6), T(15988218), [0, 0.55, 0], [0, 0, 0], null, 0.015);
add(hosp, Box(1.2, 0.18, 0.5), T(16777215), [0, 0.9, -1], [0, 0, 0], null, 0.01);
add(hosp, Box(1.42, 0.12, 1.8), T(8374496), [0, 0.88, 0.3], [0, 0, 0], null, 0.01);
add(hosp, Cyl(0.03, 0.03, 2, 6), T(13225432), [0.95, 1, -0.6], [0, 0, 0], null, 6e-3);
add(hosp, Box(0.25, 0.35, 0.08), T(12576511, { transparent: true, opacity: 0.8 }), [0.95, 1.9, -0.6], [0, 0, 0], null, 6e-3);
var man3 = RUN({ backpack: void 0, cap: void 0, neckFlap: false, top: 10146016 });
hosp.add(man3.root);
function placeMan(J, p, ry) {
  J.root.position.copy(p);
  J.root.rotation.set(0, ry, 0);
}
function desert(s, lt, k, t) {
  const sc = s.scene;
  let tod = "day", cp, ct, storm = 0, pp, f = { mouth: "line", blink: blink(t) }, ps;
  others.forEach((o) => o.root.visible = false);
  mound.visible = false;
  sos.visible = fireG.visible = false;
  smoke.material.opacity = 0;
  flare.material.opacity = 0;
  heli.visible = jet.visible = false;
  liz.visible = snake.visible = false;
  girl.root.visible = false;
  flagG.visible = ["flag", "leave", "sos", "storm2"].includes(sc);
  man.root.visible = true;
  tracks.visible = sc === "tracks";
  const runAt = (x0, z0, dir, sp = 3) => {
    const x = x0 + Math.cos(dir) * lt * sp, z = z0 - Math.sin(dir) * lt * sp;
    const p = at(x, z, 0.95 + bob(t));
    placeMan(man, p, dir + Math.PI / 2);
    return p;
  };
  if (sc === "run") {
    tod = "hot";
    const p = runAt(-6, 4, 0.15, 3.4);
    ps = runPose(t);
    f = { mouth: "open", open: 0.45, brow: 0.2, blink: blink(t) };
    others.forEach((o, i) => {
      o.root.visible = true;
      const q = at(p.x - 4 - i * 3, p.z + 2 + i * 1.5, 0.95 + bob(t + i));
      placeMan(o, q, 0.15 + Math.PI / 2);
      pose(o, runPose(t + i * 0.7));
      face(o, { mouth: "open", open: 0.4 });
    });
    cp = p.clone().add(V(2.6, 1.3, 3.6));
    ct = p.clone().add(V(-0.6, 0.3, 0));
  } else if (sc === "storm" || sc === "storm2") {
    tod = "storm";
    storm = sm(0, 0.4, k);
    const p = sc === "storm" ? runAt(4, 2, 0.3, 2.2) : at(SH.x + 1, SH.z + 4, 0.95);
    if (sc === "storm") ps = P(runPose(t, 10, 0.7), { lSh: [-2.2, 0, 0.4], lEl: [-1.8], head: [0.3, 0, 0] });
    else {
      placeMan(man, p, 0);
      ps = P(SIT, { spine: [0.5], head: [0.5, 0, 0], lSh: [-1.2, 0, 0.3], rSh: [-1.2, 0, -0.3], lEl: [-1.5], rEl: [-1.5] });
      man.root.position.y -= 0.45;
    }
    f = { mouth: "line", eye: 0.25, brow: 0.5 };
    cp = p.clone().add(V(1.8, 1.1, 2.8));
    ct = p.clone().add(V(0, 0.3, 0));
    setShake(0.02);
  } else if (sc === "lost") {
    tod = "day";
    const p = at(14, 0, 0.95);
    placeMan(man, p, Math.sin(t * 0.8) * 1.2);
    ps = P(STAND, { head: [0, Math.sin(t * 1.1) * 0.6, 0], lSh: [0, 0, 0.5], rSh: [0, 0, -0.5] });
    f = { mouth: "frown", brow: 0.5, look: [Math.sin(t * 1.1), 0], blink: blink(t) };
    const a = 0.3 + k * 0.8;
    cp = p.clone().add(V(Math.cos(a) * 4.5, 2.2 + k * 2.5, Math.sin(a) * 4.5));
    ct = p.clone();
  } else if (sc === "archive") {
    tod = "day";
    const p = at(14, 0, 0.95);
    placeMan(man, p, 0.6);
    ps = P(STAND);
    cp = p.clone().add(V(4, 2, 6));
    ct = p;
  } else if (sc === "bush") {
    tod = "night";
    const p = at(BUSH.x + 2.2, BUSH.z + 1.9, 0.25);
    placeMan(man, p, -0.8);
    ps = P(SIT, { spine: [0.35], head: [0.3, 0, 0], lSh: [-1, 0, 0.4], rSh: [-1, 0, -0.4], lEl: [-1.5], rEl: [-1.5], lHip: [-2, 0, 0.1], rHip: [-2, 0, -0.1], lKn: [2.2], rKn: [2.2] });
    f = { mouth: "line", eye: 0.5, brow: 0.4 };
    cp = p.clone().add(V(3.2, 1.4, 4.2));
    ct = p.clone().add(V(-0.5, 0.4, 0));
  } else if (sc === "search") {
    tod = "hot";
    const p = runAt(20, 10, -0.4, 2.6);
    ps = runPose(t, 11, 0.7);
    f = { mouth: "open", open: 0.5, brow: 0.4, blink: blink(t) };
    const a = 1.2 - k * 0.5;
    cp = p.clone().add(V(Math.cos(a) * 6, 3, Math.sin(a) * 6));
    ct = p.clone();
  } else if (sc === "bottle") {
    tod = "hot";
    const p = at(30, 8, 0.95);
    placeMan(man, p, -0.4);
    ps = P(STAND, { lSh: [-1.3, 0, 0.2], lEl: [-1.4], head: [0.3, 0, 0] });
    f = { mouth: "frown", brow: 0.5, look: [0.3, -0.6], blink: blink(t) };
    cp = p.clone().add(V(1.8, 1.1, 2.6));
    ct = p.clone().add(V(0, 0.2, 0));
  } else if (sc === "heli") {
    tod = "sunset";
    const p = at(34, 0, 0.95);
    placeMan(man, p, -2.4);
    heli.visible = true;
    heli.position.set(p.x - 22 - k * 18, p.y + 13, p.z - 36 + k * 10);
    heli.rotation.y = 0.4;
    rotor.rotation.y = t * 30;
    const fa = lt - s.dur * 0.35;
    ps = P(STAND, { lSh: [-2.9, 0, 0.2], lEl: [-0.2], head: [-0.4, 0, 0] });
    if (fa > 0) for (let i = 0; i < 120; i++) {
      const a = Math.max(0, fa - i % 30 * 0.012);
      flare.pos[i * 3] = p.x - 0.3;
      flare.pos[i * 3 + 1] = p.y + 1.5 + a * 9 - a * a * 1.2;
      flare.pos[i * 3 + 2] = p.z - 0.4;
    }
    flare.upd();
    flare.material.opacity = fa > 0 ? clamp(1.4 - fa * 0.3) : 0;
    f = { mouth: "open", open: 0.9, eyeS: 1.15, look: [0, 1], brow: 0.3 };
    cp = p.clone().add(V(4, 1, 6));
    ct = p.clone().add(V(-6, 5, -8));
  } else if (sc === "shrine" || sc === "flag" || sc === "leave") {
    tod = sc === "leave" ? "dawn" : "hot";
    const d = SH.clone().add(V(0, 0.65, 3.6));
    if (sc === "shrine") {
      const p = at(SH.x + 6 - k * 5, SH.z + 12 - k * 6, 0.95);
      placeMan(man, p, Math.PI * 0.85);
      ps = walkPose(t, 5, 0.35);
      f = { mouth: "open", open: 0.4, eyeS: 1.1, brow: -0.1, blink: blink(t) };
      cp = p.clone().add(V(4, 2.2, 6));
      ct = SH.clone().add(V(0, 2, 0));
    } else if (sc === "flag") {
      placeMan(man, d.clone().add(V(0, -0.4, 0)), 0);
      ps = P(SIT, { rSh: [-1.6, 0, -0.2], rEl: [-1.8] });
      man.root.updateMatrixWorld();
      f = { mouth: k % 0.2 < 0.1 ? "open" : "line", open: 0.3, blink: blink(t) };
      cp = SH.clone().add(V(7, 3.5, 10));
      ct = SH.clone().add(V(0, 3, 0));
    } else {
      const p = at(SH.x + 2 + k * 5, SH.z + 6 + k * 6, 0.95);
      placeMan(man, p, -Math.PI * 0.2);
      ps = P(walkPose(t, 5, 0.4), { head: [0, -0.9 * sm(0.3, 0.5, k) * (1 - sm(0.75, 0.9, k)), 0] });
      f = { mouth: "line", brow: -0.3, blink: blink(t) };
      cp = p.clone().add(V(-5, 2.4, 7));
      ct = p.clone().add(V(2, 0.8, 2));
    }
  } else if (sc === "sos") {
    tod = "hot";
    sos.visible = true;
    fireG.visible = true;
    jet.visible = true;
    jet.position.set(SOSP.x - 120 + k * 200, 90, SOSP.z - 60);
    flame.scale.y = 1 + Math.sin(t * 9) * 0.08;
    flame2.scale.y = 1 + Math.cos(t * 11) * 0.1;
    for (let i = 0; i < 220; i++) {
      const a = (rnd(i, 1) + t * 0.12) % 1;
      smoke.pos[i * 3] = fireG.position.x + (rnd(i, 2) - 0.5) * a * 4 + a * 6;
      smoke.pos[i * 3 + 1] = fireG.position.y + 1 + a * 22;
      smoke.pos[i * 3 + 2] = fireG.position.z + (rnd(i, 3) - 0.5) * a * 4;
    }
    smoke.upd();
    smoke.material.opacity = 0.3;
    const p = at(SOSP.x + 4.2, SOSP.z + 3, 0.95);
    placeMan(man, p, -2.6);
    ps = P(STAND, { lSh: [-2.9, 0, 0.4], rSh: [-2.9, 0, -0.4], lEl: [-0.2], rEl: [-0.2], head: [-0.5, 0, 0] });
    ps.lSh[2] = 0.4 + Math.sin(t * 8) * 0.3;
    ps.rSh[2] = -0.4 - Math.sin(t * 8) * 0.3;
    f = { mouth: "open", open: 1, look: [0, 1], brow: 0.4 };
    cp = SOSP.clone().add(V(0, 15 - k * 3, 13));
    ct = SOSP.clone().add(V(1, 0, 0));
  } else if (sc === "dew") {
    tod = "dawn";
    const r = at(SH.x - 5, SH.z + 3);
    add;
    const p = r.clone().add(V(0.9, 0.45, 0.3));
    placeMan(man, p, -1.4);
    ps = P(SIT, { spine: [0.7], neck: [0.3], head: [0.3, 0, 0], lSh: [-1.4, 0, 0.1], rSh: [-1.4, 0, -0.1], lEl: [-0.8], rEl: [-0.8], lHip: [-1.9, 0, 0.1], rHip: [-1.9, 0, -0.1], lKn: [2.3], rKn: [2.3] });
    f = { mouth: "open", open: 0.3, eye: 0.4 };
    cp = p.clone().add(V(-2.6, 1.3, 3.4));
    ct = p.clone().add(V(-0.6, 0.4, 0));
  } else if (sc === "walk") {
    tod = "sunset";
    const p = at(-30 - lt * 1.4, -50 - lt * 1.4, 0.95);
    placeMan(man, p, Math.PI * 0.25 + Math.PI);
    ps = walkPose(t, 4.5, 0.35);
    f = { mouth: "line", eye: 0.7, brow: 0.3 };
    cp = p.clone().add(V(-3.5, 1.2, 4.5));
    ct = p.clone().add(V(-0.5, 1.1, -1.5));
  } else if (sc === "night") {
    tod = "night";
    const p = at(-10, -20, 0.35);
    placeMan(man, p, 0);
    man.root.rotation.set(0, 0, Math.PI / 2 - 0.08);
    ps = P(STAND, { lHip: [-0.9], rHip: [-0.7], lKn: [1.2], rKn: [1], lSh: [-0.9, 0, 0.2], rSh: [-0.9, 0, -0.2], lEl: [-1.2], rEl: [-1.2] });
    mound.visible = false;
    mound.position.copy(p).add(V(0, -0.05, 0.4));
    mound.scale.set(0.55, 0.3, 0.8 * sm(0, 0.5, k) + 0.01);
    mound.position.add(V(0, 0, 0.35));
    f = { mouth: "line", eye: lerp(1, 0.1, k) };
    cp = p.clone().add(V(-0.4, 1.6, 3.6));
    ct = p.clone().add(V(-0.4, 0.6, 0));
  } else if (sc === "food") {
    tod = "hot";
    const p = at(-32, -48, 0.45);
    placeMan(man, p, 0.4);
    ps = P(SIT, { spine: [0.6], head: [0.4, 0, 0], lHip: [-1.9, 0, 0.2], rHip: [-1.9, 0, -0.2], lKn: [2.3], rKn: [2.3], rSh: [-1.2, 0, -0.2], rEl: [-0.6] });
    liz.visible = snake.visible = true;
    liz.position.copy(at(p.x + 1.2 - k * 0.8, p.z + 1.4, 0.02));
    liz.rotation.y = 2.6 + Math.sin(t * 6) * 0.2;
    snake.position.copy(at(p.x - 2.2, p.z + 1.2, 0));
    snake.rotation.y = 0.3 + Math.sin(t) * 0.1;
    f = { mouth: "line", brow: -0.3, look: [0.6, -0.7] };
    cp = p.clone().add(V(-0.5, 1.6, 4.4));
    ct = p.clone().add(V(0.2, 0, 1));
  } else if (sc === "oasis" || sc === "drink") {
    tod = sc === "oasis" ? "hot" : "sunset";
    if (sc === "oasis") {
      const p = at(OA.x + 9 - k * 4, OA.z + 6 - k * 2, 0.55);
      placeMan(man, p, -2.1);
      ps = P(STAND, { spine: [0.8], head: [-0.4, 0, 0], lHip: [-1.2], rHip: [-0.8], lKn: [1.2], rKn: [0.9], lSh: [-1.4, 0, 0.2], rSh: [-1.6, 0, -0.2] });
      f = { mouth: "open", open: 0.4, eyeS: 1.15, look: [0, 0.3] };
      cp = p.clone().add(V(4, 2, 4));
      ct = OA.clone().add(V(0, 0.8, 0));
    } else {
      const p = OA.clone().add(V(4.2, 0.3, 0));
      placeMan(man, p, Math.PI / 2);
      man.root.rotation.set(0, 0, Math.PI / 2 - 0.08);
      ps = P(STAND, { rSh: [-1.6, 0, -0.3], rEl: [-0.3] });
      f = { mouth: "smile", eye: lerp(0.6, 0.05, sm(0.4, 0.8, k)) };
      cp = p.clone().add(V(-0.3, 0.9, 2.8));
      ct = p.clone().add(V(-0.4, 0, 0));
    }
  } else if (sc === "tracks") {
    tod = "day";
    const p = at(-118 + k * -5, 62 + k * 6, 0.95);
    placeMan(man, p, Math.PI * 0.75);
    ps = walkPose(t, 4, 0.3);
    girl.root.visible = true;
    girl.root.position.copy(at(-138, 78, 0.75));
    girl.root.rotation.y = 0.9;
    pose(girl, P(STAND, { rSh: [0, 0, -0.4], head: [0, -0.3 * sm(0.6, 0.8, k), 0] }));
    face(girl, { mouth: k > 0.7 ? "open" : "line", open: 0.5, eyeS: 1 + 0.2 * sm(0.6, 0.8, k), blink: blink(t) });
    goats.forEach((g, i) => {
      g.userData.head.rotation.z = -0.5 + Math.sin(t * 2 + i) * 0.15;
    });
    f = { mouth: "open", open: 0.5, eyeS: 1.1, brow: 0.2 };
    cp = p.clone().add(V(1.5, 2.2, 3.5));
    ct = V(-132, DH(-132, 74) + 1, 74);
  } else if (sc === "return") {
    tod = "day";
    const p = runAt(10, 30, 0.2, 3.4);
    ps = runPose(t);
    f = { mouth: "smile", blink: blink(t) };
    others.forEach((o, i) => {
      o.root.visible = true;
      const q = at(p.x + 3 + i * 2.5, p.z + 1.8 - i * 3, 0.95 + bob(t + i));
      placeMan(o, q, 0.2 + Math.PI / 2);
      pose(o, runPose(t + i * 0.7));
      face(o, { mouth: "open", open: 0.4 });
    });
    cp = p.clone().add(V(-3, 1.8, 6.5));
    ct = p.clone().add(V(2, 0.4, 0));
  } else {
    tod = "sunset";
    const p = at(0, -10, 0.95);
    placeMan(man, p, Math.PI * 0.8);
    ps = P(STAND, { head: [-0.1, 0, 0] });
    f = { mouth: "smile", blink: blink(t) };
    const a = 1 + k * 0.3;
    cp = p.clone().add(V(Math.cos(a) * 6, 1.8, Math.sin(a) * 6));
    ct = p.clone().add(V(0, 0.9, 0));
  }
  setTOD(tod, !["storm", "storm2"].includes(sc));
  if (storm > 0) {
    ds.fog.near = lerp(60, 2, storm);
    ds.fog.far = lerp(380, 26, storm);
  }
  for (let i = 0; i < 3e3 && storm > 0; i++) {
    const B2 = 30, c = cp;
    let x = rnd(i, 1) * B2 + t * 14, y = rnd(i, 2) * 8, z = rnd(i, 3) * B2;
    sand.pos[i * 3] = ((x - c.x) % B2 + B2) % B2 - B2 / 2 + c.x;
    sand.pos[i * 3 + 1] = c.y - 2 + y + Math.sin(t * 2 + i) * 0.3;
    sand.pos[i * 3 + 2] = ((z - c.z) % B2 + B2) % B2 - B2 / 2 + c.z;
  }
  sand.upd();
  sand.material.opacity = 0.55 * storm;
  if (flagG.visible) {
    const a = flag.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = flagBase[i * 3];
      a.setZ(i, Math.sin(x * 4 - t * 6) * 0.08 * (x + 0.6));
    }
    a.needsUpdate = true;
  }
  pose(man, ps || P(STAND));
  face(man, f);
  {
    const g = DH(cp.x, cp.z) + 0.9;
    if (cp.y < g) cp.y = g;
  }
  setCam(cp, ct, t, { land: 1.1 });
  draw(ds);
}
function inside(s, lt, k, t) {
  man2.root.position.set(0.3, 0.45, 0.8);
  man2.root.rotation.y = -2.6;
  pose(man2, P(SIT, { spine: [0.15], head: [-0.6, 0, 0], rSh: [-1.6, 0, -0.2], rEl: [-1.3] }));
  face(man2, { mouth: "line", look: [0, 1], brow: 0.4, blink: blink(t) });
  for (let i = 0; i < 40; i++) {
    dmy2.position.set((rnd(i, 1) - 0.5) * 4, 3.4, (rnd(i, 2) - 0.5) * 4);
    dmy2.rotation.set(Math.PI, rnd(i, 3) * 6 + Math.sin(t * 1.5 + i) * 0.15, Math.sin(t * 2 + i) * 0.1);
    dmy2.scale.setScalar(1 + rnd(i, 4) * 0.4);
    dmy2.updateMatrix();
    bats.setMatrixAt(i, dmy2.matrix);
  }
  bats.instanceMatrix.needsUpdate = true;
  setCam(V(2.7, 1.3, 2.9).lerp(V(2.3, 1.6, 2.5), eio(k)), V(-0.1, 2.1, -0.2), t, { keep: true, fov: 58 });
  draw(inn);
}
function hospital(s, lt, k, t) {
  man3.root.position.set(0, 1.05, -0.2);
  man3.root.rotation.set(-Math.PI / 2 + 0.4, 0, 0);
  pose(man3, P(STAND, { lSh: [0, 0, 0.3], rSh: [0, 0, -0.3] }));
  face(man3, { mouth: "smile", eye: 0.7, blink: blink(t) });
  setCam(V(2.4, 2.2, 2.6).lerp(V(1.8, 1.9, 2), eio(k)), V(0, 1, -0.3), t, { keep: true, fov: 52 });
  draw(hosp);
}
function render(s, lt, k, t) {
  if (s.scene === "bats") inside(s, lt, k, t);
  else if (s.scene === "hospital") hospital(s, lt, k, t);
  else desert(s, lt, k, t);
}
function cards2(s, lt, k) {
  const a = sm(0.12, 0.4, lt);
  switch (s.scene) {
    case "run":
      return card(330, `<div class="t">${L("\u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430", "temperature")}</div><div class="v" style="color:#ff4b5c">${EN ? "+115 <small>\xB0F</small>" : "+46 <small>\xB0C</small>"}</div><div class="n">${L("\xAB\u041C\u0430\u0440\u0430\u0444\u043E\u043D \u043F\u0435\u0441\u043A\u043E\u0432\xBB", "Marathon des Sables")}</div>`, a);
    case "storm":
      return card(330, `<div class="t">${L("\u043F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0431\u0443\u0440\u044F", "sandstorm")}</div><div class="v">${Math.max(1, Math.ceil(eio(k) * 8))} <small>${L("\u0447", "h")}</small></div>`, a);
    case "storm2":
      return card(330, `<div class="t">${L("\u0432\u0442\u043E\u0440\u0430\u044F \u0431\u0443\u0440\u044F", "second storm")}</div><div class="v">12 <small>${L("\u0447", "h")}</small></div>`, a);
    case "bottle": {
      const v = lerp(18, 4, eio(k));
      return card(330, `<div class="t">${L("\u0432\u043E\u0434\u0430", "water")}</div><div class="v" style="color:#ff4b5c">${Math.round(v)} <small>%</small></div><div class="bar"><div style="width:${v}%;background:#4fd8ff"></div></div><div class="n">${L("\u0432 \u0436\u0430\u0440\u0443 \u2014 \u0434\u043E 1,5 \u043B \u043F\u043E\u0442\u0430 \u0432 \u0447\u0430\u0441", "heat: up to 1.5 L of sweat an hour")}</div>`, a);
    }
    case "map":
      return "";
    case "hospital":
      return card(330, `<div class="t">${L("\u0432\u0435\u0441", "weight")}</div><div class="v">${EN ? "\u221233 <small>lb</small>" : "\u221215 <small>\u043A\u0433</small>"}</div><div class="n">${L("\u0437\u0430 9 \u0434\u043D\u0435\u0439", "in 9 days")}</div>`, a);
    case "return":
      return card(330, `<div class="t">${L("\u0432\u0435\u0440\u043D\u0443\u043B\u0441\u044F \u043D\u0430 \u043C\u0430\u0440\u0430\u0444\u043E\u043D", "came back to the race")}</div><div class="v">\xD7 6</div><div class="n">${L("13-\u0435 \u043C\u0435\u0441\u0442\u043E \u0432 2001 \u0433\u043E\u0434\u0443", "13th place in 2001")}</div>`, sm(0.3, 0.55, k));
  }
  return "";
}
function full2(s, lt, k) {
  const a = sm(0, 0.3, lt);
  if (s.scene === "archive") {
    const svg = `<svg viewBox="0 0 400 220" width="${PORT ? 740 : 660}" height="${PORT ? 407 : 363}"><rect width="400" height="220" fill="#f2c27a"/><path d="M0 170 Q100 130 200 165 T400 150 V220 H0 Z" fill="#e0a860" stroke="#1a1033" stroke-width="4"/><circle cx="320" cy="55" r="28" fill="#fff2c0"/><g transform="translate(170,70)" stroke="#1a1033" stroke-width="5" stroke-linecap="round" fill="none"><circle cx="20" cy="10" r="16" fill="#e8b088"/><path d="M4 2 Q20 -14 36 2 Z" fill="#f3f5fa"/><path d="M20 26 L14 70"/><path d="M14 70 L-6 100 M14 70 L36 98"/><path d="M18 36 L-8 56 M18 36 L44 46"/><rect x="0" y="30" width="26" height="30" rx="6" fill="#ff7a1f"/><rect x="-14" y="30" width="16" height="26" rx="4" fill="#4f7cff"/></g></svg>`;
    return paper(a, k, `${svg}<div style="font-weight:900;font-size:66px;margin-top:12px;color:#1a1033">${L("\u041C\u0410\u0423\u0420\u041E \u041F\u0420\u041E\u0421\u041F\u0415\u0420\u0418", "MAURO PROSPERI")}</div><div style="font-weight:700;font-size:34px">${L("\u0418\u0442\u0430\u043B\u0438\u044F \xB7 38 \u043B\u0435\u0442", "Italy \xB7 age 38")}</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:6px">${L("\u043F\u043E\u043B\u0438\u0446\u0435\u0439\u0441\u043A\u0438\u0439, \u0431\u044B\u0432\u0448\u0438\u0439 \u043F\u044F\u0442\u0438\u0431\u043E\u0440\u0435\u0446", "police officer, former pentathlete")}</div>`);
  }
  if (s.scene === "map") {
    const x0 = PORT ? 90 : 520, y0 = PORT ? 330 : 120, w = 900, h = PORT ? 900 : 760;
    const pr = eio(sm(0.1, 0.75, k));
    const route = [[300, 300], [330, 360], [300, 420], [360, 470], [420, 520], [470, 600], [520, 650]];
    let d = "";
    route.forEach(([x, y], i) => d += (i ? "L" : "M") + x * w / 900 + " " + y * h / 900);
    const len = 900;
    const svg = `<svg width="${w}" height="${h}" style="position:absolute;left:${x0}px;top:${y0}px"><rect width="${w}" height="${h}" rx="34" fill="#f2c27a" stroke="#1a1033" stroke-width="8"/><path d="M${w * 0.52} 0 L${w * 0.5} ${h * 0.4} L${w * 0.62} ${h * 0.62} L${w * 0.58} ${h}" stroke="#1a1033" stroke-width="6" stroke-dasharray="18 12" fill="none"/>
      <text x="${w * 0.22}" y="${h * 0.14}" font-family="R,RL" font-weight="900" font-size="54" fill="#1a1033">${L("\u041C\u0410\u0420\u041E\u041A\u041A\u041E", "MOROCCO")}</text><text x="${w * 0.62}" y="${h * 0.14}" font-family="R,RL" font-weight="900" font-size="54" fill="#1a1033">${L("\u0410\u041B\u0416\u0418\u0420", "ALGERIA")}</text>
      <path d="${d}" stroke="#ff4b5c" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - pr)}"/><circle cx="${300 * w / 900}" cy="${300 * h / 900}" r="18" fill="#1a1033"/>
      <circle cx="${520 * w / 900}" cy="${650 * h / 900}" r="${20 * sm(0.7, 0.8, k)}" fill="#ff4b5c" stroke="#1a1033" stroke-width="6"/><text x="${540 * w / 900}" y="${720 * h / 900}" font-family="R,RL" font-weight="900" font-size="44" fill="#1a1033" opacity="${sm(0.75, 0.85, k)}">${L("\u0422\u0438\u043D\u0434\u0443\u0444", "Tindouf")}</text>
      <text x="${w / 2}" y="${h * 0.93}" text-anchor="middle" font-family="R,RL" font-weight="900" font-size="80" fill="#ff4b5c">${EN ? fmtN(lerp(0, 180, pr)) + " mi" : fmtN(lerp(0, 291, pr)) + " \u043A\u043C"}</text></svg>`;
    return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${0.8 * a})"></div><div style="position:absolute;inset:0;opacity:${a}">${svg}</div>`;
  }
  return "";
}
function fx(s, lt, k) {
  if (s.scene === "night") return { bk: 0.15 };
  if (s.scene === "drink") return { bk: 0.35 * sm(0.5, 1, k) };
  return {};
}
start({ render, cards: cards2, full: full2, fx, mins: { heli: 3.6, map: 4 }, bubbles: ["#c0703a", "#e0a050", "#f2c27a"] });
