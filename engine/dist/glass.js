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
var col = (a, b, x) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(x));
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
function reach(J, side, target, bendAxis = V(0, -1, -0.3)) {
  const sh = J[side + "Sh"], el = J[side + "El"];
  sh.parent.updateMatrixWorld(true);
  const s = J.root.scale.x;
  const tl = sh.parent.worldToLocal(target.clone()).sub(sh.position);
  const L1 = J.L1, L2 = J.L2 + 0.03, d = clamp(tl.length(), 0.05, (L1 + L2) * 0.995);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), b = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const dir = tl.clone().normalize();
  _q.setFromUnitVectors(V(0, -1, 0), dir);
  let ax = bendAxis.clone().projectOnPlane(dir).normalize();
  if (!isFinite(ax.x) || ax.lengthSq() < 1e-4) ax.set(1, 0, 0);
  _q2.setFromAxisAngle(ax, a);
  sh.quaternion.copy(_q2.multiply(_q));
  el.rotation.set(0, 0, 0);
  const axL = ax.clone().applyQuaternion(sh.quaternion.clone().invert());
  el.quaternion.setFromAxisAngle(axL, -(Math.PI - b));
}
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
function makeCar(color = 16730972) {
  const g = new THREE.Group();
  const body = T(color), dk = T(2830149);
  add(g, Box(2.2, 0.55, 1.05), body, [0, 0.55, 0], [0, 0, 0], null, 0.025);
  add(g, Box(1.2, 0.45, 0.95), body, [-0.1, 1.02, 0], [0, 0, 0], null, 0.022);
  const glass = T(9427199, { emissive: 2781104, emissiveIntensity: 0.35 });
  const ws = add(g, Box(0.04, 0.38, 0.86), glass, [0.52, 1.02, 0], [0, 0, -0.35], null, 0);
  for (const z of [-0.48, 0.48]) add(g, Box(0.9, 0.3, 0.02), glass, [-0.12, 1.04, z], [0, 0, 0], null, 0);
  for (const x of [-0.7, 0.7]) for (const z of [-0.52, 0.52]) add(g, Cyl(0.24, 0.24, 0.16, 14), dk, [x, 0.28, z], [Math.PI / 2, 0, 0], null, 0.015);
  for (const z of [-0.33, 0.33]) add(g, Sph(0.08, 8, 6), B(16774872), [1.1, 0.62, z], [0, 0, 0], null, 8e-3);
  g.userData = { glass, body };
  return g;
}
function makeHouse(w = 4, h = 3.2, d = 4, color = 16767400, roof = 16739164, seed = 0) {
  const g = new THREE.Group();
  add(g, Box(w, h, d), T(color), [0, h / 2, 0], [0, 0, 0], null, 0.03);
  const rg = new THREE.CylinderGeometry(0.01, w * 0.75, 1.6, 4, 1);
  rg.rotateY(Math.PI / 4);
  rg.scale(1, 1, d / w);
  add(g, rg, T(roof), [0, h + 0.8, 0], [0, 0, 0], null, 0.03);
  const wm = T(10475775, { emissive: 3832496, emissiveIntensity: 0.3 });
  for (let i = 0; i < 2; i++) for (let j = 0; j < (h > 4 ? 2 : 1); j++) {
    add(g, Box(0.7, 0.8, 0.05), wm, [-w / 4 + i * w / 2, 1.5 + j * 1.8, d / 2 + 0.01], [0, 0, 0], null, 0.01);
    add(g, Box(0.84, 0.1, 0.1), T(16777215), [-w / 4 + i * w / 2, 1.05 + j * 1.8, d / 2 + 0.04], [0, 0, 0], null, 6e-3);
  }
  add(g, Box(0.8, 1.5, 0.06), T(9067066), [0, 0.75, d / 2 + 0.02], [0, 0, 0], null, 0.01);
  return g;
}
function makeTree(s = 1) {
  const g = new THREE.Group();
  add(g, Cyl(0.12 * s, 0.16 * s, 1.4 * s, 8), T(9067066), [0, 0.7 * s, 0], [0, 0, 0], null, 0.015);
  add(g, new THREE.IcosahedronGeometry(0.85 * s, 0), T(6079594), [0, 1.9 * s, 0], [0, 0, 0], null, 0.025);
  add(g, new THREE.IcosahedronGeometry(0.6 * s, 0), T(4894298), [0.35 * s, 1.5 * s, 0.2 * s], [0, 0, 0], null, 0.02);
  return g;
}
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
function makeStatue(mat) {
  const g = new THREE.Group();
  add(g, Box(1.4, 1.2, 1.4), mat, [0, 0.6, 0], [0, 0, 0], null, 0.02);
  add(g, Box(1.6, 0.2, 1.6), mat, [0, 1.25, 0], [0, 0, 0], null, 0.015);
  const J = makeHuman({ top: 15657698, pants: 15657698, skin: 15657698, hair: 14867922, shoe: 15657698, robe: true, beard: true });
  J.root.traverse((o) => {
    if (o.isMesh && !o.material.isShaderMaterial && o.material.color && !(o.material.color.r < 0.2)) o.material = mat;
  });
  J.root.position.set(0, 2.2, 0);
  J.root.scale.setScalar(1.9);
  g.add(J.root);
  return { g, J };
}
function makeGargoyle(mat) {
  const g = new THREE.Group();
  add(g, Cap(0.25, 0.4, 10), mat, [0, 0.3, 0], [0.6, 0, 0], null, 0.015);
  const head = G(g, [0, 0.55, 0.32]);
  add(head, Sph(0.22, 12, 10), mat, [0, 0, 0], [0, 0, 0], null, 0.015);
  for (const x of [-0.12, 0.12]) add(head, new THREE.ConeGeometry(0.05, 0.2, 6), mat, [x, 0.2, -0.02], [-0.3, 0, x], null, 8e-3);
  const eyes = [];
  for (const x of [-0.08, 0.08]) eyes.push(add(head, Sph(0.04, 8, 6), T(3816004), [x, 0.04, 0.19], [0, 0, 0], null, 0));
  const snout = add(head, Sph(0.11, 10, 8), mat, [0, -0.06, 0.18], [0, 0, 0], [1, 0.8, 1], 0.01);
  for (const s of [-1, 1]) {
    const wg = new THREE.Shape();
    wg.moveTo(0, 0);
    wg.lineTo(s * 0.7, 0.5);
    wg.lineTo(s * 0.55, 0.1);
    wg.lineTo(s * 0.7, -0.15);
    wg.lineTo(0, -0.1);
    add(g, new THREE.ExtrudeGeometry(wg, { depth: 0.04, bevelEnabled: false }), mat, [s * 0.15, 0.45, -0.1], [0, s * 0.4, 0], null, 0.01);
  }
  g.userData = { head, eyes, snout };
  return g;
}
function makeFishGeo() {
  const b = new THREE.SphereGeometry(0.2, 10, 8);
  b.scale(1.4, 0.8, 0.45);
  const tl = new THREE.ConeGeometry(0.14, 0.22, 4);
  tl.rotateZ(Math.PI / 2);
  tl.translate(-0.36, 0, 0);
  tl.scale(1, 1, 0.3);
  const g = mergeGeometries([b.toNonIndexed(), tl.toNonIndexed()]);
  g.computeVertexNormals();
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
function makeTown(o = {}) {
  const sc = new THREE.Scene();
  const sky2 = makeSky(o.top ?? 6982360, o.bot ?? 13227760, 1400);
  sc.add(sky2);
  sc.fog = new THREE.Fog(o.fog ?? 12634336, 40, 170);
  const hemi = new THREE.HemisphereLight(16777215, 6974080, 1.9);
  sc.add(hemi);
  const sun = new THREE.DirectionalLight(16773856, 1.6);
  sun.position.set(-30, 50, 25);
  sc.add(sun);
  const groundM = T(o.ground ?? 9424746);
  const gg = new THREE.PlaneGeometry(1600, 1600, 1, 1);
  gg.rotateX(-Math.PI / 2);
  const ground = add(sc, gg, groundM, [0, 0, 0], [0, 0, 0], null, 0);
  const W3 = {};
  const st = G(sc, ZONES.street.toArray());
  const roadM = T(6120312);
  add(st, Box(160, 0.05, 7), roadM, [0, 0.02, 0], [0, 0, 0], null, 0);
  for (let x = -78; x < 80; x += 4) add(st, Box(1.8, 0.06, 0.18), T(16773824), [x, 0.04, 0], [0, 0, 0], null, 0);
  for (const z of [-4.8, 4.8]) add(st, Box(160, 0.25, 2.6), T(14275788), [0, 0.12, z], [0, 0, 0], null, 0.01);
  const hc = [16767400, 11065599, 16756936, 13168808, 16773280, 14205183], rc = [16739164, 6120312, 5209343, 9067066];
  W3.houses = [];
  for (let i = 0; i < 16; i++) for (const s of [-1, 1]) {
    const x = -60 + i * 8 + (s > 0 ? 3 : 0), h = 3 + (i * 7 + (s > 0 ? 3 : 0)) % 3 * 1.6;
    const hs = makeHouse(5.4, h, 4.4, hc[(i + (s > 0 ? 2 : 0)) % 6], rc[i % 4]);
    hs.position.set(x, 0, s * 9.5);
    hs.rotation.y = s > 0 ? Math.PI : 0;
    st.add(hs);
    W3.houses.push(hs);
  }
  for (let i = 0; i < 18; i++) for (const s of [-1, 1]) {
    const tr = makeTree(0.9 + rnd(i, s) * 0.4);
    tr.position.set(-66 + i * 7.5 + 3, 0.25, s * 5.6);
    st.add(tr);
  }
  W3.cars = [];
  const cc = [16730972, 5232895, 16765503, 6094746, 15988218, 16742943];
  for (let i = 0; i < 10; i++) {
    const c = makeCar(cc[i % 6]);
    c.position.set(-40 + i * 9 + i % 2 * 2, 0, i % 2 ? 2.2 : -2.2);
    c.rotation.y = i % 2 ? Math.PI : 0;
    st.add(c);
    W3.cars.push(c);
  }
  W3.barrel = G(st, [3.6, 0, 6.9]);
  add(W3.barrel, Cyl(0.55, 0.5, 1.2, 16), T(5209343), [0, 0.6, 0], [0, 0, 0], null, 0.02);
  add(W3.barrel, Cyl(0.56, 0.56, 0.06, 16), T(2830149), [0, 1.22, 0], [0, 0, 0], null, 0.01);
  W3.pipe = add(st, Cyl(0.09, 0.09, 2.6, 10), T(13225432), [3.6, 2.6, 7], [0, 0, 0], null, 0.01);
  W3.pipeLow = G(st, [3.6, 1.3, 7]);
  add(W3.pipeLow, Cyl(0.09, 0.09, 0.5, 10), T(13225432), [0, 0.25, 0], [0, 0, 0], null, 0.01);
  const fm = G(sc, ZONES.farm.toArray());
  W3.farm = fm;
  add(fm, Box(80, 0.04, 60), T(8176730), [0, 0.03, 0], [0, 0, 0], null, 0);
  const barn = G(fm, [-14, 0, -14]);
  add(barn, Box(8, 5, 7), T(14240314), [0, 2.5, 0], [0, 0, 0], null, 0.04);
  const brg = new THREE.CylinderGeometry(0.01, 5.6, 2.4, 4, 1);
  brg.rotateY(Math.PI / 4);
  brg.scale(1, 1, 0.9);
  add(barn, brg, T(6120312), [0, 6.2, 0], [0, 0, 0], null, 0.04);
  add(barn, Box(2.6, 3.2, 0.1), T(16777215), [0, 1.6, 3.52], [0, 0, 0], null, 0.015);
  for (let i = 0; i < 26; i++) add(fm, Box(0.12, 1, 0.12), T(13146730), [-20 + i * 1.6, 0.5, 8], [0, 0, 0], null, 8e-3);
  for (const y of [0.4, 0.8]) add(fm, Box(41.6, 0.08, 0.06), T(13146730), [0, y, 8], [0, 0, 0], null, 6e-3);
  W3.cows = [];
  for (let i = 0; i < 9; i++) {
    const c = makeCow(i % 3 === 2);
    c.position.set(-10 + i % 5 * 4.5 + rnd(i, 1) * 2, 0, 1 + Math.floor(i / 5) * 3.5 + rnd(i, 2));
    c.rotation.y = rnd(i, 3) * 6;
    fm.add(c);
    W3.cows.push(c);
  }
  const WN = 1800;
  W3.wheat = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4).translate(0, 0.5, 0), T(16777215), WN);
  W3.wheatHead = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.07, 0.18, 3, 6), T(16777215), WN);
  for (let i = 0; i < WN; i++) {
    const x = -18 + i % 60 * 0.62 + (rnd(i, 1) - 0.5) * 0.3, z = 10 + Math.floor(i / 60) * 0.62 + (rnd(i, 2) - 0.5) * 0.3;
    dmy.position.set(x, 0, z);
    dmy.rotation.set((rnd(i, 3) - 0.5) * 0.2, 0, (rnd(i, 4) - 0.5) * 0.2);
    dmy.scale.set(1, 0.9 + rnd(i, 5) * 0.3, 1);
    dmy.updateMatrix();
    W3.wheat.setMatrixAt(i, dmy.matrix);
    dmy.position.y += 1.05 * dmy.scale.y;
    dmy.scale.set(1, 1, 1);
    dmy.updateMatrix();
    W3.wheatHead.setMatrixAt(i, dmy.matrix);
  }
  fm.add(W3.wheat, W3.wheatHead);
  W3.setWheat = (x) => {
    W3.wheat.material.color.copy(col(6997066, 12099648, x));
    W3.wheatHead.material.color.copy(col(10147946, 9071152, x));
  };
  W3.setWheat(0);
  const bc = G(sc, ZONES.beach.toArray());
  W3.beach = bc;
  add(bc, Box(120, 0.06, 60), T(15916192), [0, 0.04, 0], [0, 0, 0], null, 0);
  W3.sea = add(bc, Box(400, 0.05, 300), T(4172e3), [0, 0.03, -180], [0, 0, 0], null, 0);
  for (let i = 0; i < 6; i++) {
    const u = G(bc, [-12 + i * 5, 0, 4 + i % 2 * 3]);
    add(u, Cyl(0.05, 0.05, 2.4, 6), T(16777215), [0, 1.2, 0], [0, 0, 0], null, 6e-3);
    add(u, new THREE.ConeGeometry(1.3, 0.6, 10), T([16730972, 16765503, 5232895][i % 3]), [0, 2.5, 0], [0, 0, 0], null, 0.015);
    add(u, Box(1.6, 0.05, 0.8), T([16777215, 16751280][i % 2]), [0.8, 0.07, 0.6], [0, 0, 0], null, 0);
  }
  const rv = G(sc, ZONES.river.toArray());
  W3.river = rv;
  add(rv, Box(30, 0.05, 400), T(9424746), [-21, 0.02, 0], [0, 0, 0], null, 0);
  W3.water = add(rv, Box(12, 0.05, 400), T(4168416, { transparent: true, opacity: 0.92 }), [0, -0.15, 0], [0, 0, 0], null, 0);
  add(rv, Box(12.4, 0.3, 400), T(9075290), [0, -0.5, 0], [0, 0, 0], null, 0);
  const bridge = G(rv, [0, 0, -10]);
  add(bridge, Box(14, 0.4, 3), T(13146730), [0, 1.2, 0], [0, 0, 0], null, 0.02);
  for (const x of [-4, 0, 4]) add(bridge, Cyl(0.2, 0.2, 1.4, 8), T(9067066), [x, 0.4, 0], [0, 0, 0], null, 0.01);
  for (let i = 0; i < 12; i++) {
    const tr = makeTree(1 + rnd(i, 7) * 0.5);
    tr.position.set((i % 2 ? -1 : 1) * (8 + rnd(i, 8) * 6), 0, -40 + i * 7);
    rv.add(tr);
  }
  const FN = 140;
  W3.fish = new THREE.InstancedMesh(makeFishGeo(), T(13160672), FN);
  W3.fish.frustumCulled = false;
  rv.add(W3.fish);
  const pz = G(sc, ZONES.plaza.toArray());
  W3.plaza = pz;
  add(pz, Box(60, 0.06, 50), T(14208960), [0, 0.04, 0], [0, 0, 0], null, 0);
  const stone = T(14275268);
  W3.stone = stone;
  const cat = G(pz, [0, 0, -14]);
  W3.cathedral = cat;
  add(cat, Box(14, 12, 6), stone, [0, 6, 0], [0, 0, 0], null, 0.04);
  for (const x of [-6, 6]) {
    add(cat, Box(4, 20, 5), stone, [x, 10, 0.6], [0, 0, 0], null, 0.04);
    add(cat, new THREE.ConeGeometry(2.4, 5, 4), T(9080736), [x, 22.5, 0.6], [0, Math.PI / 4, 0], null, 0.03);
  }
  add(cat, Cyl(2.2, 2.2, 0.3, 28), T(6982360, { emissive: 2767482, emissiveIntensity: 0.3 }), [0, 8.5, 3.1], [Math.PI / 2, 0, 0], null, 0.02);
  const arch = new THREE.Shape();
  arch.moveTo(-1.6, 0);
  arch.lineTo(-1.6, 3);
  arch.quadraticCurveTo(0, 5.4, 1.6, 3);
  arch.lineTo(1.6, 0);
  add(cat, new THREE.ShapeGeometry(arch), B(3811882), [0, 0, 3.02], [0, 0, 0], null, 0);
  W3.gargoyles = [];
  for (const x of [-4, 4]) {
    const ga = makeGargoyle(stone);
    ga.position.set(x * 1.5, 13, 3.4);
    ga.rotation.x = 0.25;
    ga.scale.setScalar(1.5);
    cat.add(ga);
    W3.gargoyles.push(ga);
  }
  W3.statue = makeStatue(T(15920870));
  W3.statue.g.position.set(0, 0, 2);
  pz.add(W3.statue.g);
  const vc = G(sc, ZONES.volcano.toArray());
  W3.volcano = vc;
  const vg = new THREE.CylinderGeometry(6, 60, 42, 28, 6, true);
  {
    const p = vg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
      const n = 1 + (fbm(x * 0.05 + 3, z * 0.05) - 0.5) * 0.35 * (y < 20 ? 1 : 0);
      p.setX(i, x * n);
      p.setZ(i, z * n);
    }
    vg.computeVertexNormals();
  }
  add(vc, vg, T(8022634), [0, 21, -60], [0, 0, 0], null, 0.05);
  add(vc, Cyl(6, 6, 0.5, 28), B(16738858), [0, 41.9, -60], [0, 0, 0], null, 0);
  W3.plume = points(1600, 6972528, 15, { opacity: 0.85, depthWrite: false, keep: true });
  W3.plume.material.sizeAttenuation = true;
  vc.add(W3.plume);
  W3.lava = points(300, 16742954, 2.2, { blending: THREE.AdditiveBlending });
  vc.add(W3.lava);
  const ap = G(sc, ZONES.airport.toArray());
  W3.airport = ap;
  add(ap, Box(200, 0.05, 26), T(6120312), [0, 0.03, 0], [0, 0, 0], null, 0);
  for (let x = -90; x < 95; x += 10) add(ap, Box(5, 0.06, 0.5), T(16777215), [x, 0.05, 0], [0, 0, 0], null, 0);
  add(ap, Box(60, 8, 14), T(13227760), [0, 4, -40], [0, 0, 0], null, 0.04);
  add(ap, Box(60, 2.5, 0.2), T(6994175, { emissive: 1723018, emissiveIntensity: 0.3 }), [0, 5, -32.9], [0, 0, 0], null, 0);
  add(ap, Cyl(1.5, 2, 20, 12), T(14278120), [38, 10, -40], [0, 0, 0], null, 0.03);
  add(ap, Cyl(3.6, 3, 3, 12), T(6994175), [38, 21.5, -40], [0, 0, 0], null, 0.03);
  W3.parked = [];
  for (let i = 0; i < 5; i++) {
    const p = makePlane747(1.2, 15988218, [2838486, 16730972, 1747050, 16757530, 8015830][i]);
    p.position.set(-36 + i * 18, 1.6, -18);
    p.rotation.y = Math.PI / 2;
    ap.add(p);
    W3.parked.push(p);
  }
  const pc = [[16730972, 2830149, 5911584], [5232895, 3816026, 2759184], [16765503, 2838486, 11037242], [6094746, 2830149, 1315860], [16751280, 6120312, 15253616], [8015830, 2830149, 5911584]];
  W3.people = pc.map((c, i) => {
    const J = makeHuman({ top: c[0], pants: c[1], hair: c[2], hairStyle: i % 3 === 1 ? "long" : void 0, skin: [16762528, 14721136, 13011546, 16765616][i % 4] });
    sc.add(J.root);
    return J;
  });
  W3.kids = [0, 1, 2].map((i) => {
    const J = makeHuman({ top: [16765503, 16742943, 5232895][i], pants: 2838486, hair: [5911584, 15253616, 2759184][i], hairStyle: i === 1 ? "long" : void 0, scale: 0.72 });
    sc.add(J.root);
    return J;
  });
  W3.hidePeople = () => {
    W3.people.forEach((p) => p.root.visible = false);
    W3.kids.forEach((p) => p.root.visible = false);
  };
  const RN = 2200;
  const rainGeo = new THREE.BoxGeometry(0.02, 1, 0.02);
  W3.rainMat = new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0.7, depthWrite: false, fog: true });
  W3.rain = new THREE.InstancedMesh(rainGeo, W3.rainMat, RN);
  W3.rain.frustumCulled = false;
  sc.add(W3.rain);
  W3.updRain = (t, c, o2 = {}) => {
    const n = Math.min(RN, o2.n ?? RN), BX = o2.box ?? 34, len = o2.len ?? 0.9, spd = o2.spd ?? 18, tilt = o2.tilt ?? 0, wob = o2.wob ?? 0, th = o2.th ?? 1;
    W3.rain.count = n;
    if (!o2.keep) {
      W3.rain.count = 0;
      return;
    }
    W3.rainMat.blending = THREE.NormalBlending;
    for (let i = 0; i < n; i++) {
      let x = rnd(i, 21) * BX, y = rnd(i, 22) * BX - t * spd * (0.8 + rnd(i, 23) * 0.4), z = rnd(i, 24) * BX;
      x += tilt * y + Math.sin(t * 1.3 + i) * wob;
      const X = ((x - c.x) % BX + BX) % BX - BX / 2 + c.x, Y = ((y - c.y) % BX + BX) % BX - BX / 2 + c.y, Z2 = ((z - c.z) % BX + BX) % BX - BX / 2 + c.z;
      dmy.position.set(X, Y, Z2);
      dmy.rotation.set(wob ? Math.sin(i + t) * 0.5 : 0, i, -tilt + (wob ? Math.cos(i * 1.7 + t) * 0.6 : 0));
      dmy.scale.set(th, len * (0.7 + rnd(i, 25) * 0.6), th);
      dmy.updateMatrix();
      W3.rain.setMatrixAt(i, dmy.matrix);
    }
    W3.rain.instanceMatrix.needsUpdate = true;
  };
  W3.glints = points(1500, 15268863, 0.1, { blending: THREE.AdditiveBlending, opacity: 0 });
  sc.add(W3.glints);
  W3.updGlints = (t, c, a, r = 18) => {
    for (let i = 0; i < 1500; i++) {
      const rr = Math.sqrt(rnd(i, 31)) * r, an = rnd(i, 32) * 6.283;
      W3.glints.pos[i * 3] = c.x + Math.cos(an) * rr;
      W3.glints.pos[i * 3 + 1] = 0.3 + rnd(i, 35) * 0.02;
      W3.glints.pos[i * 3 + 2] = c.z + Math.sin(an) * rr;
    }
    W3.glints.upd();
    W3.glints.material.opacity = a * 0.8;
  };
  Object.assign(W3, { sc, sky: sky2, hemi, sun, ground, groundM, roadM });
  return W3;
}

// topics/glass/scene.js
var W2 = makeTown({ top: 8028080, bot: 13685992, fog: 12896476 });
var Z = ZONES;
W2.rainMat.color.set(14677759);
W2.rainMat.opacity = 0.85;
W2.rainMat.blending = THREE.AdditiveBlending;
var blink = (t) => t % 3.3 < 0.1;
var shop = new THREE.Scene();
shop.background = new THREE.Color(15262940);
shop.add(new THREE.HemisphereLight(16777215, 10129536, 1.8));
{
  const d = new THREE.DirectionalLight(16777215, 0.8);
  d.position.set(2, 5, 4);
  shop.add(d);
}
add(shop, Box(14, 5, 12), T(15921128, { side: THREE.BackSide }), [0, 2.5, 0], [0, 0, 0], null, 0);
add(shop, Box(14, 0.02, 12), T(14209732), [0, 0.01, 0], [0, 0, 0], null, 0);
var shelfItems = [];
for (let r = 0; r < 3; r++) {
  const sg = G(shop, [-4 + r * 4, 0, -2]);
  for (const y of [0.3, 1, 1.7, 2.4]) add(sg, Box(3, 0.08, 0.9), T(13225432), [0, y, 0], [0, 0, 0], null, 0.01);
  add(sg, Box(3, 2.6, 0.06), T(14278120), [0, 1.3, -0.45], [0, 0, 0], null, 0.01);
  for (let i = 0; i < 6; i++) if (rnd(i, r) > 0.7) shelfItems.push(add(sg, Box(0.3, 0.4, 0.3), T([16730972, 16765503, 5232895][i % 3]), [-1.2 + i * 0.45, 0.55 + i % 3 * 0.7, 0], [0, 0, 0], null, 0.01));
}
var sign = canvasTex(512, 128, (c, w, h) => {
  c.fillStyle = "#ff4b5c";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff";
  c.font = "900 70px R, RL";
  c.textAlign = "center";
  c.fillText(L("\u0412\u0421\u0401 \u0420\u0410\u0421\u041A\u0423\u041F\u0418\u041B\u0418", "SOLD OUT"), 256, 90);
});
add(shop, new THREE.PlaneGeometry(3.2, 0.8), B(16777215, { map: sign }), [0, 3.4, -2.4], [0, 0, 0], null, 0);
var shopper = makeHuman({ top: 5232895, pants: 2830149, hair: 2759184 });
shop.add(shopper.root);
var basket = add(shop, Box(0.35, 0.22, 0.25), T(16742943), [0, 0, 0], [0, 0, 0], null, 0.01);
var sky = new THREE.Scene();
sky.add(makeSky(1712208, 395290, 900));
sky.fog = new THREE.Fog(2763322, 20, 120);
sky.add(new THREE.HemisphereLight(9083600, 1710634, 1.4));
{
  const d = new THREE.DirectionalLight(13162751, 1.2);
  d.position.set(5, 10, 8);
  sky.add(d);
}
var jet = makePlane747(1);
sky.add(jet);
var ash = points(2500, 9077908, 2.5, { opacity: 0.55 });
sky.add(ash);
var elmo = points(300, 8384767, 0.25, { blending: THREE.AdditiveBlending, opacity: 0 });
sky.add(elmo);
add(sky, new THREE.CircleGeometry(8, 30), B(16774872, { fog: false }), [-80, 70, -300], [0, 0.2, 0], null, 0);
var ck = new THREE.Scene();
ck.background = new THREE.Color(658460);
ck.add(new THREE.HemisphereLight(10137855, 3156016, 1.1));
var ckL = new THREE.PointLight(12574975, 1.1, 6, 1.2);
{
  const w = new THREE.PointLight(16767152, 1.4, 5, 1.2);
  w.position.set(0.5, 1.8, -1.2);
  ck.add(w);
}
ckL.position.set(0, 1.6, 1.2);
ck.add(ckL);
add(ck, Box(3.4, 2.6, 3.4), T(3817301, { side: THREE.BackSide }), [0, 1.2, 0], [0, 0, 0], null, 0);
var wsT = canvasTex(512, 256, (c, w, h, t = 0) => {
  c.fillStyle = "#0a1230";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    const x = (hash(i, 1) * w + t * 40 * (1 + hash(i, 3))) % w, y = hash(i, 2) * h;
    c.strokeStyle = "rgba(127,240,255,.8)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    for (let s = 0; s < 4; s++) c.lineTo(x + (hash(i, s + 5) - 0.5) * 40, y + (hash(i, s + 9) - 0.5) * 40);
    c.stroke();
  }
});
for (const s of [-1, 1]) add(ck, new THREE.PlaneGeometry(1.3, 0.7), B(16777215, { map: wsT }), [s * 0.7, 1.7, 1.68], [0, Math.PI + s * 0.25, 0], null, 0);
add(ck, Box(3.2, 0.7, 0.7), T(2830149), [0, 0.85, 1.2], [-0.3, 0, 0], null, 0.015);
var gauges = [];
for (let i = 0; i < 8; i++) gauges.push(add(ck, new THREE.CircleGeometry(0.1, 16), B(i < 4 ? 16730972 : 6094746), [-1.05 + i * 0.3, 1.05, 0.82], [-0.3, Math.PI, 0], null, 0));
var capt = makeHuman({ top: 15988218, pants: 1911386, hair: 6974058, pilotCap: true, headset: true, stubble: true });
ck.add(capt.root);
add(ck, Box(0.8, 0.2, 0.8), T(6111280), [-0.6, 0.3, 0.3], [0, 0, 0], null, 0.012);
add(ck, Box(0.8, 0.9, 0.15), T(6111280), [-0.6, 0.7, -0.08], [0, 0, 0], null, 0.012);
function people(t, center, mode, k) {
  W2.people.forEach((J, i) => {
    J.root.visible = true;
    let x, z, ry, p, f;
    if (mode === "run") {
      const ph = (t * 2.2 + i * 3.1) % 22;
      x = center.x - 11 + ph + i % 2 * 0.5;
      z = center.z + 4.4 + i % 3 * 0.6 - 0.6;
      ry = Math.PI / 2;
      p = P(runPose(t + i, 12, 0.8), { lSh: [-2.4, 0.3, 0.4], rSh: [-2.4, -0.3, -0.4], lEl: [-1.9], rEl: [-1.9], head: [0.3, 0, 0] });
      f = { mouth: "open", open: 0.6, eye: 0.4, brow: 0.5 };
      J.root.position.set(x, 0.7 + bob(t + i, 12) + 0.25, z);
    } else {
      const a = i / W2.people.length * 6.283;
      x = center.x + Math.cos(a) * 3 + i % 2;
      z = center.z + 4.6 + Math.sin(a) * 0.8;
      ry = Math.PI + rnd(i, 3) * 1.2 - 0.6;
      p = P(STAND, { head: [-0.5 * sm(0, 0.5, k), 0, 0], lSh: [0, 0, 0.25], rSh: [0, 0, -0.25] });
      f = { mouth: k > 0.4 ? "open" : "line", open: 0.7, look: [0, 1], eyeS: 1.15, blink: blink(t + i) };
      J.root.position.set(x, 0.95, z);
    }
    J.root.rotation.y = ry;
    pose(J, p);
    face(J, f);
  });
}
function town(s, lt, k, t) {
  const sc = s.scene;
  W2.hidePeople();
  W2.rain.count = 0;
  W2.glints.material.opacity = 0;
  W2.plume.material.opacity = 0;
  W2.lava.material.opacity = 0;
  let cp, ct, rain = { n: 900, len: 2.2, spd: 3.2, wob: 0.6, th: 0.7, box: 30 }, gl = 0.6, gc = null, sk = [8028080, 13685992], fogC = 12896476;
  W2.cars.forEach((c) => c.userData.glass.color.set(9427199));
  W2.pipeLow.rotation.set(0, 0, 0);
  W2.pipeLow.position.set(3.6, 1.3, 7);
  W2.setWheat(0);
  W2.groundM.color.set(9424746);
  W2.rainMat.color.set(14677759);
  W2.rainMat.blending = THREE.AdditiveBlending;
  W2.rainMat.opacity = 0.85;
  if (sc === "hook") {
    rain.n = Math.floor(lerp(40, 900, sm(0.1, 0.9, k)));
    people(t, Z.street, "look", k);
    cp = V(-12, lerp(9, 2.6, eio(k)), -1.5);
    ct = V(0, 2.2, 4.6);
    gl = sm(0.5, 1, k) * 0.5;
  } else if (sc === "hair") {
    rain = { n: 260, len: 3, spd: 1.4, wob: 0.5, th: 1.3, box: 14, keep: true };
    W2.rainMat.opacity = 0.42;
    cp = V(1.5, 2, -1.2);
    ct = V(0, 2.4, 4.5);
    gl = 0.5;
  } else if (sc === "size") {
    rain = { n: 120, len: 4.5, spd: 0.7, wob: 0.3, th: 1.5, box: 8, keep: true };
    W2.rainMat.opacity = 0.5;
    cp = V(0.4, 1.7, 0.8);
    ct = V(0, 1.9, 4);
    gl = 0.4;
  } else if (sc === "run") {
    rain.n = 1300;
    people(t, Z.street, "run", k);
    const cx = -2 + k * 3;
    cp = V(cx + 6, 2, -0.8);
    ct = V(cx, 1.3, 4.6);
    gl = 0.8;
  } else if (sc === "planes" || sc === "grounded") {
    const o = Z.airport;
    rain.n = 1500;
    rain.box = 60;
    cp = o.clone().add(sc === "planes" ? V(-30 + k * 10, 6, 22) : V(30 - k * 12, 9, 26));
    ct = o.clone().add(V(0, 3, -18));
    gl = 0;
  } else if (sc === "cars") {
    const c = W2.cars[4];
    const cw = c.getWorldPosition(V(0, 0, 0));
    const cl = sm(0.15, 0.85, k);
    W2.cars.forEach((cc) => cc.userData.glass.color.copy(col(9427199, 15265008, cl)));
    rain.n = 900;
    cp = cw.clone().add(V(lerp(4.2, 3, eio(k)), 1.9, 2.2));
    ct = cw.clone().add(V(0.3, 0.9, 0));
    gl = 1;
    gc = cw;
  } else if (sc === "gutter") {
    const J = W2.people[2];
    J.root.visible = true;
    J.root.position.set(4.4, 0.95, 7.6);
    J.root.rotation.y = -Math.PI / 2 - 0.4;
    const off = eio(sm(0.25, 0.65, k));
    W2.pipeLow.rotation.z = off * 1.2;
    W2.pipeLow.position.x = 3.6 + off * 0.3;
    pose(J, P(STAND, { spine: [0.15], head: [0.2, 0, 0] }));
    J.root.updateMatrixWorld(true);
    reach(J, "l", W2.pipeLow.localToWorld(V(0, 0.3, 0)), V(0, -1, -0.3));
    reach(J, "r", W2.pipeLow.localToWorld(V(0, 0.15, 0)), V(0, -1, -0.3));
    face(J, { mouth: "line", brow: 0.3, look: [-0.5, -0.4], blink: blink(t) });
    rain.n = 900;
    cp = V(6.4, 2.2, 1.2);
    ct = V(3.8, 1.4, 7);
    gl = 1;
  } else if (sc === "cows") {
    const o = Z.farm;
    W2.cows.forEach((c, i) => {
      c.userData.head.rotation.z = -0.6 + Math.sin(t * 2 + i) * 0.15;
    });
    rain.n = 900;
    rain.box = 36;
    cp = o.clone().add(V(-2 + k * 4, 3.2, 14));
    ct = o.clone().add(V(0, 0.8, 2));
    gl = 1;
    gc = o.clone().add(V(0, 0, 3));
  } else if (sc === "tambora" || sc === "nosummer") {
    if (sc === "tambora") {
      const o = Z.volcano;
      sk = [5917264, 11569792];
      fogC = 10128010;
      W2.plume.material.opacity = 0.85;
      W2.lava.material.opacity = 1;
      for (let i = 0; i < 1600; i++) {
        const a = (rnd(i, 1) + t * 0.05) % 1, r = 4 + a * 60 * (0.4 + rnd(i, 2));
        const an = rnd(i, 3) * 6.283;
        W2.plume.pos[i * 3] = Math.cos(an) * r * 0.7 + a * 40;
        W2.plume.pos[i * 3 + 1] = 44 + a * 90 + Math.sin(an * 3) * 6;
        W2.plume.pos[i * 3 + 2] = -60 + Math.sin(an) * r * 0.7;
      }
      W2.plume.upd();
      for (let i = 0; i < 300; i++) {
        const a = (rnd(i, 7) + t * 0.6) % 1, an = rnd(i, 8) * 6.283, v = 10 + rnd(i, 9) * 14;
        W2.lava.pos[i * 3] = Math.cos(an) * v * a * 0.6;
        W2.lava.pos[i * 3 + 1] = 42 + v * a * 2.2 - 30 * a * a;
        W2.lava.pos[i * 3 + 2] = -60 + Math.sin(an) * v * a * 0.6;
      }
      W2.lava.upd();
      rain.n = 0;
      cp = o.clone().add(V(-36 + k * 8, 12, 40));
      ct = o.clone().add(V(0, 46, -60));
      gl = 0;
      setShake(0.05);
      W2.sc.fog.far = 420;
    } else {
      const o = Z.farm;
      sk = [10133688, 14738670];
      fogC = 14212326;
      W2.setWheat(sm(0, 0.7, k));
      W2.rainMat.color.set(16777215);
      W2.rainMat.blending = THREE.NormalBlending;
      rain = { n: 1400, len: 0.18, spd: 2.2, wob: 0.4, th: 4, box: 30 };
      const J = W2.people[3];
      J.root.visible = true;
      J.root.position.set(o.x - 2, 0.95, o.z + 9.4);
      J.root.rotation.y = Math.PI * 0.9;
      pose(J, P(STAND, { head: [0.35, 0, 0], spine: [0.1] }));
      face(J, { mouth: "frown", brow: 0.5, look: [0, -0.6], blink: blink(t) });
      cp = o.clone().add(V(3.5, 2.4, 3.5 - k));
      ct = o.clone().add(V(-2, 1.2, 12));
      gl = 0;
    }
  } else if (sc === "forever" || sc === "beach") {
    const o = Z.beach;
    sk = [9081024, 15786192];
    rain.n = sc === "forever" ? 200 : 0;
    cp = o.clone().add(sc === "forever" ? V(lerp(-6, 6, k), 1.4, 9) : V(-14 + k * 8, 4.5, 16));
    ct = o.clone().add(V(0, 0.4, sc === "forever" ? 3 : 0));
    gl = 1;
    gc = o.clone().add(V(0, 0, 5));
  } else {
    sk = [6982360, 13227760];
    W2.rainMat.color.set(10146047);
    W2.rainMat.blending = THREE.NormalBlending;
    W2.rainMat.opacity = 0.6;
    rain = { n: 1500, len: 0.7, spd: 16, wob: 0, th: 1, box: 24 };
    const J = W2.people[4];
    J.root.visible = true;
    J.root.position.set(0, 0.95, 4.6);
    J.root.rotation.y = Math.PI - 0.2;
    pose(J, P(STAND, { lSh: [0, 0, 2.3], rSh: [0, 0, -2.3], lEl: [0, 0, 0.4], rEl: [0, 0, -0.4], head: [-0.35, 0, 0] }));
    face(J, { mouth: "smile", eye: 0.2, brow: -0.1 });
    cp = V(1.5, 1.9, 0.3);
    ct = V(0, 1.8, 4.6);
    gl = 0;
  }
  W2.sky.set(sk[0], sk[1]);
  W2.sc.fog.color.set(fogC);
  if (sc !== "tambora") W2.sc.fog.far = 170;
  setCam(cp, ct, t, { land: 1.05 });
  if (rain.n) W2.updRain(t, camera.position, rain);
  else W2.rain.count = 0;
  if (false) W2.updGlints(t, gc || V(camera.position.x, 0, camera.position.z + 6), gl * (["forever", "beach"].includes(sc) ? 0.55 : 1), 16);
  draw(W2.sc);
}
function skyShot(s, lt, k, t) {
  const sc = s.scene;
  jet.position.set(0, 0, 0);
  jet.rotation.set(0, 0, 0);
  let el = 0, glow = 0, dead = 0, fire = 0, pitch = 0;
  if (sc === "planes") {
    el = 0;
  }
  if (sc === "b747") {
    el = sm(0.15, 0.5, k);
    glow = el;
    dead = sm(0.6, 0.75, k);
  }
  if (sc === "glide") {
    dead = 1 - sm(0.62, 0.7, k);
    fire = sm(0.62, 0.75, k);
    pitch = -0.12 * (1 - sm(0.6, 0.8, k));
  }
  jet.rotation.z = pitch + Math.sin(t * 0.8) * 0.02;
  jet.userData.engines.forEach((e, i) => {
    e.glow.material.opacity = glow * (0.5 + 0.3 * Math.sin(t * 9 + i)) * (1 - dead);
    e.fire.material.opacity = fire * 0.5 + (sc === "b747" && k < 0.6 ? 0.25 : 0);
  });
  for (let i = 0; i < 2500; i++) {
    const x = ((rnd(i, 1) * 160 - t * 55) % 160 + 160) % 160 - 80;
    ash.pos[i * 3] = x;
    ash.pos[i * 3 + 1] = (rnd(i, 2) - 0.5) * 40 + (sc === "glide" ? t * 3 % 40 : 0);
    ash.pos[i * 3 + 2] = (rnd(i, 3) - 0.5) * 60;
  }
  ash.upd();
  ash.material.opacity = sc === "glide" ? 0.55 * (1 - sm(0.55, 0.9, k)) : 0.55;
  for (let i = 0; i < 300; i++) {
    const e = jet.userData.engines[i % 4].eg.getWorldPosition(V(0, 0, 0));
    elmo.pos[i * 3] = e.x - 0.5 + (rnd(i, 4) - 0.5) * 0.8;
    elmo.pos[i * 3 + 1] = e.y + (rnd(i, 5) - 0.5) * 0.6;
    elmo.pos[i * 3 + 2] = e.z + (rnd(i, 6) - 0.5) * 0.6;
  }
  elmo.upd();
  elmo.material.opacity = el * 0.7 * (1 - dead);
  const a = sc === "glide" ? 2.2 + k * 0.5 : 0.5 + k * 0.4;
  setCam(V(Math.cos(a) * 13, 3 + (sc === "glide" ? 2 : 0), Math.sin(a) * 13), V(0, -0.2, 0), t, { land: 1.1 });
  if (sc === "b747") setShake(0.04 * el);
  draw(sky);
}
function cockpit(s, lt, k, t) {
  capt.root.position.set(-0.6, 0.72, 0.3);
  capt.root.rotation.y = Math.PI * 0.85;
  pose(capt, P(SIT, { lSh: [-1.1, 0, 0.2], lEl: [-0.9], head: [0, 0, 0] }));
  capt.root.updateMatrixWorld(true);
  reach(capt, "r", capt.head.localToWorld(V(-0.15, 0.1, 0.25)), V(0, -1, 0.3));
  face(capt, { mouth: Math.sin(t * 9) > 0 && lt > 0.3 && k < 0.9 ? "open" : "smile", open: 0.45, brow: -0.15, look: [0.2, 0], blink: blink(t) });
  gauges.forEach((g, i) => g.material.color.set(i < 4 ? Math.floor(t * 2 + i) % 2 ? 16730972 : 5574672 : 6094746));
  wsT.redraw(t);
  setCam(V(0.3, 1.5, -1).lerp(V(0.1, 1.45, -0.6), eio(k)), V(-0.6, 1.35, 0.3), t, { keep: true, fov: 50 });
  draw(ck);
}
function shopShot(s, lt, k, t) {
  const x = lerp(-3, 1.5, k);
  shopper.root.position.set(x, 0.95, 0.4);
  shopper.root.rotation.y = Math.PI / 2;
  pose(shopper, P(walkPose(t, 6, 0.4), { lSh: [-0.3, 0, 0.2], lEl: [-1.2] }));
  shopper.root.updateMatrixWorld(true);
  basket.position.copy(shopper.root.localToWorld(V(0.3, 0.25, 0.25)));
  face(shopper, { mouth: "frown", brow: 0.45, look: [-0.6, 0.2], blink: blink(t) });
  setCam(V(x + 1.5, 2, 6.5), V(x, 1.4, -1), t, { land: 1.1 });
  draw(shop);
}
var SKY = ["b747", "glide"];
function render(s, lt, k, t) {
  const sc = s.scene;
  if (SKY.includes(sc)) skyShot(s, lt, k, t);
  else if (sc === "captain") cockpit(s, lt, k, t);
  else if (sc === "shops") shopShot(s, lt, k, t);
  else town(s, lt, k, t);
}
function cards2(s, lt, k) {
  const a = sm(0.12, 0.4, lt);
  switch (s.scene) {
    case "hair":
      return card(330, `<div class="t">${L("\u0433\u0430\u0432\u0430\u0439\u0438 \xB7 \u0432\u0443\u043B\u043A\u0430\u043D \u043A\u0438\u043B\u0430\u0443\u044D\u0430", "hawaii \xB7 kilauea volcano")}</div><div class="v" style="font-size:72px">${L("\xAB\u0412\u041E\u041B\u041E\u0421\u042B \u041F\u0415\u041B\u0415\xBB", "PELE'S HAIR")}</div><div class="n">${L("\u043D\u0438\u0442\u0438 \u0432\u0443\u043B\u043A\u0430\u043D\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u0441\u0442\u0435\u043A\u043B\u0430", "threads of volcanic glass")}</div>`, sm(0.35, 0.6, k));
    case "size":
      return card(330, `<div class="t">${L("\u043E\u0434\u043D\u0430 \u043D\u0438\u0442\u044C", "one thread")}</div><div class="v">&gt; 1 <small>${L("\u043C", "m")}</small> \xB7 &lt; 1 <small>${L("\u043C\u043C", "mm")}</small></div><div class="n">${L("\u0434\u043B\u0438\u043D\u0430 \xB7 \u0442\u043E\u043B\u0449\u0438\u043D\u0430", "length \xB7 thickness")}</div>`, a);
    case "planes":
      return card(330, `<div class="t">${L("\u0432\u0443\u043B\u043A\u0430\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u0435\u043F\u0435\u043B", "volcanic ash")}</div><div class="v" style="font-size:76px">${L("\u041A\u0410\u041C\u0415\u041D\u042C + \u0421\u0422\u0415\u041A\u041B\u041E", "ROCK + GLASS")}</div><div class="n">${L("\u0441\u0442\u0435\u043A\u043B\u043E \u043F\u043B\u0430\u0432\u0438\u0442\u0441\u044F \u0432 \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u0435", "the glass melts in the engine")}</div>`, a);
    case "b747":
      return card(330, `<div class="t">${L("24 \u0438\u044E\u043D\u044F 1982", "june 24, 1982")}</div><div class="v">747</div><div class="n">${L("263 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u043D\u0430 \u0431\u043E\u0440\u0442\u0443", "263 people on board")}</div>`, a);
    case "glide": {
      const h = lerp(11e3, 4100, eio(sm(0.05, 0.62, k)));
      return card(330, `<div class="t">${L("\u0432\u044B\u0441\u043E\u0442\u0430", "altitude")}</div><div class="v">${EN ? fmtN(h * 3.281) + " <small>ft</small>" : fmtN(h) + " <small>\u043C</small>"}</div><div class="n" style="color:${k > 0.8 ? "#1aa86a" : "inherit"};font-weight:900">${k > 0.8 ? L("\u0412\u042B\u0416\u0418\u041B\u0418 \u0412\u0421\u0415 263", "ALL 263 SURVIVED") : L("\u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u0438 \u043C\u043E\u043B\u0447\u0430\u0442", "engines silent")}</div>`, a);
    }
    case "grounded":
      return card(330, `<div class="t">${L("\u0432\u044B\u043B\u0435\u0442\u044B", "departures")}</div><div class="v" style="color:#ff4b5c;font-size:80px">${L("\u041E\u0422\u041C\u0415\u041D\u0415\u041D\u042B", "CANCELLED")}</div>`, a);
    case "tambora":
      return card(330, `<div class="t">${L("\u0442\u0430\u043C\u0431\u043E\u0440\u0430 \xB7 1815", "tambora \xB7 1815")}</div><div class="v" style="font-size:72px">${L("\u041C\u0418\u041B\u041B\u0418\u0410\u0420\u0414\u042B \u0422\u041E\u041D\u041D", "BILLIONS OF TONS")}</div><div class="n">${L("\u043F\u0435\u043F\u043B\u0430 \u0438 \u0433\u0430\u0437\u0430 \u0432 \u043D\u0435\u0431\u0435", "of ash and gas in the sky")}</div>`, a);
    case "nosummer":
      return card(330, `<div class="t">${L("\u0438\u044E\u043D\u044C 1816", "june 1816")}</div><div class="v" style="font-size:80px">\u2744 ${L("\u0421\u041D\u0415\u0413", "SNOW")}</div><div class="n">${L("\u0443\u0440\u043E\u0436\u0430\u0439 \u043F\u043E\u0433\u0438\u0431", "crops died")}</div>`, a);
    case "forever":
      return card(330, `<div class="t">${L("\u0441\u0442\u0435\u043A\u043B\u043E \u0440\u0430\u0437\u043B\u0430\u0433\u0430\u0435\u0442\u0441\u044F", "glass breaks down in")}</div><div class="v">1\u20132 <small>${L("\u043C\u043B\u043D \u043B\u0435\u0442", "million yrs")}</small></div>`, a);
  }
  return "";
}
function fx(s, lt, k) {
  if (s.scene === "b747" && k > 0.6) return { bk: 0.25 * sm(0.6, 0.75, k) };
  return {};
}
start({ render, cards: cards2, fx, mins: { hook: 3.2, captain: 4 }, bubbles: ["#2a5b8a", "#4f8ab8", "#8fd8ff"] });
