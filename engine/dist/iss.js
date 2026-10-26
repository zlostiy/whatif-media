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
  const m = new THREE.PointsMaterial(Object.assign({ map: dotTex, color, size, transparent: true, opacity: 1, depthWrite: false }, opts));
  const o = new THREE.Points(g, m);
  o.frustumCulled = false;
  o.pos = p;
  o.upd = () => g.attributes.position.needsUpdate = true;
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
  };
  window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)))).then(() => {
    window.setTime(0);
    return true;
  });
}

// topics/iss/scene.js
function earthTex() {
  return canvasTex(1024, 512, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * Math.PI * 2, lat = (y / h - 0.5) * Math.PI, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const n = (fbm(px * 1.6 + 10, py * 1.6 + pz * 0.7) + fbm(pz * 1.6 + 3, py * 1.6 - px * 0.7)) / 2;
      const ice = Math.abs(py) > 0.9;
      let r, g, b;
      if (ice) [r, g, b] = [240, 246, 255];
      else if (n > 0.53) {
        const d = n > 0.6 ? 1 : 0;
        [r, g, b] = Math.abs(py) < 0.35 && hash(Math.floor(x / 6), Math.floor(y / 6)) > 0.6 ? [214, 186, 120] : d ? [94, 168, 86] : [120, 190, 96];
      } else {
        const s = n > 0.5 ? 1 : 0;
        [r, g, b] = s ? [64, 168, 230] : [36, 110, 210];
      }
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
}
function cloudTex() {
  return canvasTex(1024, 512, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * Math.PI * 2, lat = (y / h - 0.5) * Math.PI, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const n = (fbm(px * 3 + 40, py * 3 + pz) + fbm(pz * 3 + 13, py * 3 - px)) / 2;
      const a = n > 0.63 ? 235 : n > 0.6 ? 130 : 0;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a;
    }
    c.putImageData(img, 0, 0);
  });
}
var ETEX = earthTex();
var CTEX = cloudTex();
function makeEarth(R) {
  const g = new THREE.Group();
  const e = add(g, new THREE.SphereGeometry(R, 96, 64), B(14214384, { map: ETEX }), [0, 0, 0], [0, 0, 0], null, 0);
  e.rotation.x = Math.PI / 2;
  const cl = add(g, new THREE.SphereGeometry(R * 1.008, 96, 64), B(16777215, { map: CTEX, transparent: true, opacity: 0.85, depthWrite: false }), [0, 0, 0], [Math.PI / 2, 0, 0], null, 0);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color(5945599) }, k: { value: 1 } },
    vertexShader: "varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 c; uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(clamp(1. - abs(dot(n,v)),0.,1.), 2.2); gl_FragColor = vec4(c*f*1.6*k, f*k); }"
  }));
  g.add(atm);
  g.userData = { e, cl, atm };
  return g;
}
function panelTex() {
  return canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = "#1b2f7a";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#4f7cff";
    c.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y <= h; y += 16) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.strokeStyle = "#ffb31a";
    c.lineWidth = 8;
    c.strokeRect(0, 0, w, h);
  });
}
var PTEX = panelTex();
function makeISS() {
  const g = new THREE.Group(), wh = T(15988218), gr = T(13225432), dk = T(6120312), gold = T(16762954), pm = T(16777215, { map: PTEX, side: THREE.DoubleSide });
  add(g, Box(13, 0.32, 0.32), gr, [0, 0, 0], [0, 0, 0], null, 0.025);
  for (let i = -6; i <= 6; i += 1) add(g, Box(0.04, 0.34, 0.34), dk, [i, 0, 0], [0, 0, 0], null, 0);
  for (const x of [-5.6, -4.4, 4.4, 5.6]) for (const s of [-1, 1]) {
    const p = add(g, Box(0.9, 0.02, 4.2), pm, [x, 0, s * 2.35], [0, 0, 0], null, 0.015);
  }
  for (const x of [-5, 5]) add(g, Cyl(0.08, 0.08, 4.8, 8), gold, [x, 0, 0], [Math.PI / 2, 0, 0], null, 0.01);
  for (const x of [-2.2, 2.2]) add(g, Box(1.6, 0.02, 0.8), wh, [x, -0.55, 0], [0, 0, 0], null, 0.012);
  const mods = new THREE.Group();
  mods.position.set(0, 0.55, 0);
  g.add(mods);
  add(mods, Cap(0.42, 3.2, 18), wh, [0, 0, 0.2], [Math.PI / 2, 0, 0], null, 0.025);
  add(mods, Cap(0.4, 1.4, 18), wh, [-1.15, 0, -0.4], [0, 0, Math.PI / 2], null, 0.022);
  add(mods, Cap(0.4, 1.4, 18), wh, [1.15, 0, -0.4], [0, 0, Math.PI / 2], null, 0.022);
  add(mods, Cap(0.38, 2.2, 18), T(15327951), [0, 0, -2.6], [Math.PI / 2, 0, 0], null, 0.022);
  for (const s of [-1, 1]) add(mods, Box(2.4, 0.02, 0.6), pm, [s * 1.6, 0, -3.1], [0, 0, 0], null, 0.01);
  add(mods, Sph(0.36, 16, 12), wh, [0, 0, 2.3], [0, 0, 0], null, 0.02);
  add(mods, Cyl(0.25, 0.3, 0.3, 12), T(9427199), [0, -0.45, 0.9], [0, 0, 0], null, 0.012);
  return g;
}
function makeSoyuz() {
  const g = new THREE.Group(), gr = T(9345642), wh = T(15988218), dk = T(4869982), pm = T(16777215, { map: PTEX, side: THREE.DoubleSide });
  add(g, Sph(0.42, 18, 14), gr, [0, 0, 0], [0, 0, 0], null, 0.02);
  add(g, Cyl(0.05, 0.07, 0.3, 8), dk, [0, 0, 0.5], [Math.PI / 2, 0, 0], null, 8e-3);
  const dm = makeDescent();
  dm.position.set(0, 0, -0.62);
  dm.rotation.x = -Math.PI / 2;
  g.add(dm);
  const svc = new THREE.Group();
  svc.position.set(0, 0, -1.4);
  g.add(svc);
  add(svc, Cyl(0.5, 0.55, 0.8, 18), gr, [0, 0, 0], [Math.PI / 2, 0, 0], null, 0.02);
  for (const s of [-1, 1]) add(svc, Box(1.8, 0.02, 0.45), pm, [s * 1.4, 0, 0], [0, 0, 0], null, 0.01);
  g.userData = { dm, svc };
  return g;
}
function makeDescent() {
  const g = new THREE.Group();
  const br = T(9345642), sh = T(5913130);
  add(g, Cyl(0.32, 0.55, 0.62, 22), br, [0, 0, 0], [0, 0, 0], null, 0.02);
  add(g, new THREE.SphereGeometry(0.55, 22, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), sh, [0, -0.15, 0], [0, 0, 0], null, 0.02);
  add(g, Sph(0.08, 10, 8), B(9427199), [0.38, 0.05, 0.2], [0, 0, 0], null, 0.01);
  add(g, Cyl(0.2, 0.32, 0.12, 18), T(7305808), [0, 0.36, 0], [0, 0, 0], null, 0.012);
  return g;
}
function chuteTex() {
  return canvasTex(512, 64, (c, w, h) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? "#ff7a1f" : "#fff6e8";
      c.fillRect(i * w / 16, 0, w / 16 + 1, h);
    }
  });
}
function makeChute() {
  const g = new THREE.Group();
  const can = add(g, new THREE.SphereGeometry(3.2, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.38), T(16777215, { map: chuteTex(), side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, 0.55, 1], 0.03);
  const rimY = 3.2 * Math.cos(Math.PI * 0.38) * 0.55, rimR = 3.2 * Math.sin(Math.PI * 0.38);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, p0 = V(Math.cos(a) * rimR, rimY - 0.1, Math.sin(a) * rimR), p1 = V(0, -6, 0);
    const d = p1.clone().sub(p0);
    const l = add(g, Cyl(0.012, 0.012, d.length(), 4), T(2830149), [0, 0, 0], [0, 0, 0], null, 0);
    l.position.copy(p0).add(p1).multiplyScalar(0.5);
    l.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  }
  return g;
}
var astro = (o) => makeHuman(Object.assign({ top: 15988218, pants: 15988218, shoe: 10134461, hair: 4860954, suit: true, patch: 2845951 }, o));
var space = new THREE.Scene();
space.background = new THREE.Color(131850);
var stars = starSphere(1500, 2600);
space.add(stars);
var sunL = new THREE.DirectionalLight(16774368, 2.6);
sunL.position.set(-60, 30, 40);
space.add(sunL);
var spHemi = new THREE.HemisphereLight(10143999, 1054768, 0.55);
space.add(spHemi);
var ER = 220;
var earth = makeEarth(ER);
earth.position.set(0, -ER - 26, 0);
space.add(earth);
var sunDisk = add(space, new THREE.CircleGeometry(18, 40), B(16774084, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0);
sunDisk.visible = false;
var sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 16758880, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
sunGlow.scale.setScalar(160);
space.add(sunGlow);
sunGlow.visible = false;
var iss = makeISS();
space.add(iss);
var soyuz = makeSoyuz();
soyuz.position.set(0, 0.55, 3.95);
iss.add(soyuz);
var DN = 260;
var debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.13, 0), T(13225176, { emissive: 3158586 }), DN);
debris.frustumCulled = false;
space.add(debris);
var dmy = new THREE.Object3D();
function updDebris(t, n, spd = 30, spread = 1) {
  debris.count = n;
  for (let i = 0; i < n; i++) {
    const x = (rnd(i, 3) * 120 + t * spd * (0.7 + rnd(i, 4) * 0.6)) % 120 - 60;
    dmy.position.set(x, (rnd(i, 5) - 0.5) * 9 * spread + 1, (rnd(i, 6) - 0.5) * 14 * spread);
    dmy.rotation.set(t * 3 + i, t * 2 + i * 0.3, 0);
    dmy.scale.setScalar(0.5 + rnd(i, 7) * 2.2);
    dmy.updateMatrix();
    debris.setMatrixAt(i, dmy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}
var sparks = points(160, 16765562, 0.35, { blending: THREE.AdditiveBlending });
space.add(sparks);
function updSparks(age, o) {
  for (let i = 0; i < 160; i++) {
    const a = Math.max(0, age), d = V(rnd(i, 11) - 0.5, rnd(i, 12) - 0.3, rnd(i, 13) - 0.5).normalize().multiplyScalar(a * (2 + rnd(i, 14) * 6));
    sparks.pos[i * 3] = o.x + d.x;
    sparks.pos[i * 3 + 1] = o.y + d.y;
    sparks.pos[i * 3 + 2] = o.z + d.z;
  }
  sparks.upd();
  sparks.material.opacity = age < 0 ? 0 : Math.exp(-age * 2.5);
}
var puffs = points(60, 16777215, 0.5);
space.add(puffs);
var capS = makeDescent();
capS.scale.setScalar(2.2);
space.add(capS);
capS.visible = false;
var plasma = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), new THREE.MeshBasicMaterial({ color: 16747066, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
capS.add(plasma);
plasma.scale.set(0.85, 1.1, 0.85);
plasma.position.y = -0.12;
var trail = points(500, 16752720, 0.9, { blending: THREE.AdditiveBlending });
space.add(trail);
var mod = new THREE.Scene();
mod.background = new THREE.Color(724770);
var mHemi = new THREE.HemisphereLight(16777215, 8949936, 1.4);
mod.add(mHemi);
var mKey = new THREE.DirectionalLight(16774890, 1);
mKey.position.set(1, 2, 3);
mod.add(mKey);
var alarmL = new THREE.PointLight(16719920, 0, 9, 1.2);
alarmL.position.set(0, 1, 0);
mod.add(alarmL);
var rackTex = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = "#e8ebf2";
  c.fillRect(0, 0, w, h);
  const cs = ["#d6dae4", "#c9cdd8", "#dfe3ec", "#ffd23f", "#d6dae4", "#4fd8ff"];
  for (let i = 0; i < 14; i++) {
    c.fillStyle = cs[i % 6];
    const x = hash(i, 1) * 440, y = hash(i, 2) * 440;
    c.fillRect(x, y, 30 + hash(i, 3) * 60, 16 + hash(i, 4) * 40);
  }
  c.strokeStyle = "#a8aec2";
  c.lineWidth = 6;
  for (let x = 0; x <= w; x += 128) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  for (let y = 0; y <= h; y += 128) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
  c.fillStyle = "#7d8398";
  for (let i = 0; i < 24; i++) {
    c.beginPath();
    c.arc(hash(i, 9) * w, hash(i, 8) * h, 6, 0, 6.3);
    c.fill();
  }
});
rackTex.wrapS = rackTex.wrapT = THREE.RepeatWrapping;
rackTex.repeat.set(4, 1);
var HW = 1.25;
var ML = 9;
var room = add(mod, Box(HW * 2, HW * 2, ML), T(16777215, { map: rackTex, side: THREE.BackSide }), [0, 0, 0], [0, 0, 0], null, 0);
for (let z = -4; z <= 4; z += 1.6) for (const [x, y] of [[-HW + 0.06, HW - 0.06], [HW - 0.06, HW - 0.06], [-HW + 0.06, -HW + 0.06], [HW - 0.06, -HW + 0.06]]) add(mod, Box(0.12, 0.12, 0.5), T(16765503), [x, y, z], [0, 0, 0], null, 0.01);
for (const y of [0.5, -0.5]) add(mod, Cyl(0.03, 0.03, ML, 6), T(16765503), [-HW + 0.12, y, 0], [Math.PI / 2, 0, 0], null, 6e-3);
for (let i = 0; i < 4; i++) add(mod, Box(0.42, 0.28, 0.03), T(2830149), [HW - 0.03, 0.2 + i % 2 * 0.5, -2 + i * 1.3], [0, -Math.PI / 2, 0], null, 0.01);
var scrT = canvasTex(512, 256, (c, w, h, mode = "ok", t = 0) => {
  c.fillStyle = "#062a2a";
  c.fillRect(0, 0, w, h);
  const big = (s, y, cl, sz = 70) => {
    c.fillStyle = cl;
    let f = sz;
    c.font = `900 ${f}px R, RL`;
    while (c.measureText(s).width > 460 && f > 20) {
      f -= 4;
      c.font = `900 ${f}px R, RL`;
    }
    c.textAlign = "center";
    c.fillText(s, 256, y);
  };
  if (mode === "debris") {
    const on = Math.floor(t * 3) % 2 === 0;
    c.fillStyle = on ? "#ff3040" : "#4a0a10";
    c.fillRect(0, 0, w, h);
    big(L("\u041E\u0411\u041B\u041E\u041C\u041A\u0418", "DEBRIS"), 125, "#fff");
    big(L("\u0441\u0442\u043E\u043B\u043A\u043D\u043E\u0432\u0435\u043D\u0438\u0435", "collision"), 195, "#fff", 40);
  } else if (mode === "nh3") {
    const on = Math.floor(t * 3) % 2 === 0;
    c.fillStyle = on ? "#e8c020" : "#4a3a00";
    c.fillRect(0, 0, w, h);
    big("NH\u2083", 130, "#1a1033", 100);
    big(L("\u0443\u0442\u0435\u0447\u043A\u0430", "leak"), 205, "#1a1033", 44);
  } else if (mode === "nosig") {
    c.fillStyle = "#300";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      c.fillStyle = hash(i, Math.floor(t * 20)) > 0.5 ? "#555" : "#222";
      c.fillRect(hash(i, 3 + Math.floor(t * 20)) * w, hash(i, 7 + Math.floor(t * 20)) * h, 8, 4);
    }
    big(L("\u041D\u0415\u0422 \u0421\u0412\u042F\u0417\u0418", "NO SIGNAL"), 150, "#ff4b5c", 64);
  } else if (mode === "radio") {
    c.strokeStyle = "#5cff9a";
    c.lineWidth = 6;
    c.beginPath();
    for (let x = 0; x < w; x += 4) {
      const a = Math.sin(x * 0.05 + t * 9) * Math.sin(x * 0.013 + t * 2) * 60;
      x ? c.lineTo(x, 150 + a) : c.moveTo(x, 150 + a);
    }
    c.stroke();
    big("145.800 MHz", 60, "#5cff9a", 44);
  } else if (mode === "answer") {
    c.fillStyle = "#0a4a2a";
    c.fillRect(0, 0, w, h);
    big(L("\u0417\u0415\u041C\u041B\u042F", "EARTH"), 120, "#5cff9a", 80);
    big(L("\u043D\u0430 \u0441\u0432\u044F\u0437\u0438", "online"), 200, "#fff", 46);
  } else if (mode === "water") {
    big("H\u2082O", 120, "#4fd8ff", 90);
    big("98 %", 210, "#fff", 60);
  } else {
    big("ISS", 120, "#5cff9a", 80);
  }
});
var screen = add(mod, new THREE.PlaneGeometry(0.9, 0.45), B(16777215, { map: scrT }), [HW - 0.04, 0.25, -0.6], [0, -Math.PI / 2, 0], null, 0);
add(mod, Box(0.04, 0.55, 1), T(2830149), [HW - 0.02, 0.25, -0.6], [0, 0, 0], null, 0.01);
var winG = G(mod, [-HW + 0.02, 0.2, 1.4], [0, Math.PI / 2, 0]);
add(winG, new THREE.TorusGeometry(0.42, 0.07, 10, 32), T(6120312), [0, 0, 0], [0, 0, 0], null, 0.012);
var winView = add(winG, new THREE.CircleGeometry(0.41, 32), B(16777215, { map: ETEX }), [0, 0, -0.01], [0, 0, 0], null, 0);
var hatchG = G(mod, [0, 0, -ML / 2 + 0.05]);
add(hatchG, new THREE.TorusGeometry(0.62, 0.09, 12, 36), T(10134461), [0, 0, 0.02], [0, 0, 0], null, 0.015);
var hinge = G(hatchG, [-0.62, 0, 0.12]);
var door = add(hinge, Cyl(0.6, 0.6, 0.1, 32), T(13225432), [0.62, 0, 0], [Math.PI / 2, 0, 0], null, 0.015);
add(door, Cyl(0.08, 0.08, 0.1, 12), T(16730972), [0, -0.08, 0], [0, 0, 0], null, 8e-3);
var tunnel = add(hatchG, new THREE.CircleGeometry(0.6, 32), B(658712), [0, 0, -0.01], [0, 0, 0], null, 0);
var radioG = G(mod, [HW - 0.05, -0.35, 0.9], [0, -Math.PI / 2, 0]);
add(radioG, Box(0.6, 0.3, 0.1), T(2830149), [0, 0, 0], [0, 0, 0], null, 0.012);
for (let i = 0; i < 5; i++) add(radioG, Cyl(0.03, 0.03, 0.04, 10), T(i % 2 ? 16765503 : 13685984), [-0.22 + i * 0.11, -0.06, 0.06], [Math.PI / 2, 0, 0], null, 5e-3);
var wball = add(mod, Sph(0.12, 24, 18), T(8378623, { transparent: true, opacity: 0.85, emissive: 1727114, emissiveIntensity: 0.4 }), [0, 0, 0], [0, 0, 0], null, 8e-3);
wball.visible = false;
var pouch = add(mod, Box(0.12, 0.18, 0.03), T(14278120), [0, 0, 0], [0, 0, 0], null, 8e-3);
pouch.visible = false;
var gas = points(120, 15261808, 0.7, { opacity: 0 });
mod.add(gas);
var man = astro({ headset: true });
mod.add(man.root);
var stp = new THREE.Scene();
var stSky = makeSky(5937896, 16767392, 600);
stp.add(stSky);
stp.fog = new THREE.Fog(15914662, 60, 420);
stp.add(new THREE.HemisphereLight(16773336, 9075280, 1.8));
var stSun = new THREE.DirectionalLight(16769200, 2.2);
stSun.position.set(-40, 50, 30);
stp.add(stSun);
{
  const gg = new THREE.PlaneGeometry(900, 900, 80, 80);
  gg.rotateX(-Math.PI / 2);
  const p = gg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    p.setY(i, (fbm(x * 0.01, z * 0.01) - 0.5) * 4 + (r > 150 ? (fbm(x * 6e-3 + 9, z * 6e-3) - 0.3) * 40 * sm(150, 400, r) : 0));
  }
  gg.computeVertexNormals();
  add(stp, gg, T(13482090), [0, 0, 0], [0, 0, 0], null, 0);
}
var tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.5, 5), T(10135632), 500);
for (let i = 0; i < 500; i++) {
  const r = 3 + rnd(i, 1) * 60, a = rnd(i, 2) * 6.283;
  dmy.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
  dmy.rotation.set(0, a, (rnd(i, 3) - 0.5) * 0.4);
  dmy.scale.setScalar(0.6 + rnd(i, 4));
  dmy.updateMatrix();
  tufts.setMatrixAt(i, dmy.matrix);
}
stp.add(tufts);
var capG = makeDescent();
capG.scale.setScalar(2.2);
stp.add(capG);
var chute = makeChute();
chute.scale.setScalar(2.4);
stp.add(chute);
var dust = points(400, 15258272, 1.6, { opacity: 0 });
stp.add(dust);
var burst = new THREE.PointLight(16756832, 0, 30, 1.5);
stp.add(burst);
var man2 = astro({});
stp.add(man2.root);
man2.root.scale.setScalar(2.2);
var stStarDisk = add(stp, new THREE.CircleGeometry(30, 40), B(16773824, { fog: false }), [-260, 70, -420], [0, 0.5, 0], null, 0);
function spaceShot(s, lt, k, t) {
  const sc = s.scene;
  earth.rotation.z = t * 4e-3;
  earth.userData.cl.rotation.y = t * 2e-3;
  iss.position.set(0, 0, 0);
  iss.rotation.set(0, 0, 0);
  soyuz.visible = true;
  soyuz.position.set(0, 0.55, 3.95);
  soyuz.rotation.set(0, 0, 0);
  debris.count = 0;
  sparks.material.opacity = 0;
  puffs.material.opacity = 0;
  capS.visible = false;
  iss.visible = true;
  trail.material.opacity = 0;
  sunDisk.visible = sunGlow.visible = false;
  sunL.intensity = 2.6;
  spHemi.intensity = 0.55;
  earth.userData.atm.material.uniforms.c.value.set(5945599);
  if (sc === "orbit") {
    const a = 0.6 + k * 0.5;
    setCam(V(Math.cos(a) * 16, 4.5 - k * 1.2, Math.sin(a) * 16), V(0, -1.5, 0), t, { land: 1.05 });
  } else if (sc === "sunrise") {
    const sy = lerp(-30, 22, eio(k));
    sunDisk.visible = sunGlow.visible = true;
    sunDisk.position.set(-40, sy, -330);
    sunGlow.position.copy(sunDisk.position);
    sunDisk.lookAt(camera.position);
    sunL.position.set(-40, sy + 20, -330);
    sunL.intensity = lerp(0.2, 2.6, sm(0.2, 0.6, k));
    spHemi.intensity = lerp(0.15, 0.55, k);
    earth.userData.atm.material.uniforms.c.value.copy(col(16747066, 5945599, sm(0.3, 0.9, k)));
    setCam(V(9, 2.2, 14), V(-3, -4, -40), t, { fov: 40 });
  } else if (sc === "debris" || sc === "decay" && false) {
    updDebris(t, DN, 14, 0.8);
    setCam(V(-3, 3 + Math.sin(t * 0.5) * 0.3, 13), V(1, 0, 0), t);
  } else if (sc === "hit") {
    updDebris(t, 160, 30, 1);
    const h = s.dur * 0.32, age = lt - h;
    const hp = V(-0.2, 0.55, 3.4);
    updSparks(age, hp);
    setShake(age > 0 ? 0.35 * Math.exp(-age * 3) : 0);
    setCam(V(4.5, 2.4, 9.5).lerp(V(3.2, 1.8, 7.5), eio(k)), V(0, 0.4, 2.6), t);
  } else if (sc === "decay") {
    const dy = -k * 1.2;
    iss.position.y = dy;
    setCam(V(10, 1.5, 12), V(0, dy * 0.5 - 0.5, 0), t);
  } else if (sc === "undock") {
    const d = eio(sm(0.15, 1, k));
    soyuz.position.z = 3.95 + d * 5;
    soyuz.rotation.y = d * 0.5;
    for (let i = 0; i < 60; i++) {
      const a = Math.max(0, lt - 0.3 - i % 6 * 0.05);
      puffs.pos[i * 3] = soyuz.position.x + (rnd(i, 1) - 0.5) * a * 2;
      puffs.pos[i * 3 + 1] = soyuz.position.y + 0.55 + (rnd(i, 2) - 0.5) * a * 2;
      puffs.pos[i * 3 + 2] = soyuz.position.z + 0.6 + a * 1.5;
    }
    puffs.upd();
    puffs.material.opacity = 0.6 * Math.exp(-Math.max(0, lt - 0.3) * 1.5) * (lt > 0.3 ? 1 : 0);
    const sp = soyuz.position.clone().add(V(0, 0.55, 0));
    setCam(sp.clone().add(V(4.5, 2.2, 5)), sp.clone().add(V(0, 0, -1.5)), t);
  } else if (sc === "reentry") {
    iss.visible = false;
    capS.visible = true;
    capS.position.set(0, 0, 0);
    capS.rotation.set(0.35 + Math.sin(t * 7) * 0.03, 0, -0.25);
    earth.position.y = -ER - 9;
    const heat = sm(0.05, 0.4, k);
    plasma.material.opacity = 0.75 * heat * (0.85 + 0.15 * Math.sin(t * 40));
    plasma.scale.set(0.85 + 0.1 * heat, 1.1 + 0.4 * heat, 0.85 + 0.1 * heat);
    earth.userData.atm.material.uniforms.c.value.copy(col(5945599, 16751184, heat));
    for (let i = 0; i < 500; i++) {
      const a = (rnd(i, 1) + t * 1.4) % 1;
      trail.pos[i * 3] = (rnd(i, 2) - 0.5) * 2 * (1 + a * 2) + a * 2;
      trail.pos[i * 3 + 1] = -1 + a * 26 + (rnd(i, 3) - 0.5);
      trail.pos[i * 3 + 2] = (rnd(i, 4) - 0.5) * 2 * (1 + a * 2) - a * 6;
    }
    trail.upd();
    trail.material.opacity = 0.8 * heat;
    setShake(0.06 * heat);
    setCam(V(5.5, 2.2, 7.5), V(0, 0.4, 0), t);
  }
  if (sc !== "reentry") earth.position.y = -ER - 26;
  draw(space);
}
var blink = (t) => t % 3.4 < 0.1;
function modShot(s, lt, k, t) {
  const sc = s.scene;
  let mode = "ok", al = 0, p, f = { mouth: "smile" }, cp, ct;
  const fl = Math.sin(t * 1.3) * 0.04;
  man.root.position.set(0, -0.45 + fl, 0.6);
  man.root.rotation.set(Math.sin(t * 0.7) * 0.05, -0.2, Math.sin(t * 0.9) * 0.04);
  const zg = { lHip: [-0.45, 0, 0.1], rHip: [-0.25, 0, -0.1], lKn: [0.7], rKn: [0.45], lSh: [-0.3, 0, 0.55 + Math.sin(t) * 0.05], rSh: [-0.3, 0, -0.55 - Math.sin(t) * 0.05], lEl: [-0.5], rEl: [-0.5], spine: [0.05] };
  p = P(zg);
  wball.visible = pouch.visible = false;
  gas.material.opacity = 0;
  hinge.rotation.y = -1.7;
  winView.rotation.z = t * 0.02;
  let lh = null, rh = null;
  if (sc === "alarm") {
    mode = "debris";
    al = Math.floor(t * 3) % 2 === 0 ? 1 : 0.25;
    const turn = sm(0.1, 0.4, k);
    man.root.rotation.y = lerp(-0.2, -1, turn);
    p = P(zg, { head: [0, -0.4 * turn, 0], lSh: [-1.6 * turn, 0, 0.6], rSh: [-0.3, 0, -0.9 * turn - 0.4] });
    f = { mouth: "open", open: 0.9, eyeS: 1.25, brow: 0.5, browY: 0.02, look: [0.8 * turn, 0], pupil: 0.7 };
    cp = V(-0.4, 0.35, 3.3).lerp(V(-0.2, 0.25, 2.6), eio(k));
    ct = V(0.3, 0.1, 0.2);
  } else if (sc === "archive") {
    mode = "debris";
    al = 0.3;
    f = { mouth: "frown", brow: 0.4, look: [0.5, 0] };
    cp = V(0, 0.2, 3.4);
    ct = V(0, 0, 0);
  } else if (sc === "ammonia") {
    mode = "nh3";
    al = 0.5 + 0.5 * Math.sin(t * 6);
    for (let i = 0; i < 120; i++) {
      const a = (rnd(i, 1) + t * 0.15) % 1;
      gas.pos[i * 3] = HW - 0.2 - a * 1.6 + Math.sin(t + i) * 0.1;
      gas.pos[i * 3 + 1] = -0.6 + (rnd(i, 2) - 0.3) * 1.6 * a;
      gas.pos[i * 3 + 2] = -1.6 + (rnd(i, 3) - 0.5) * 2.2 * a;
    }
    gas.upd();
    gas.material.opacity = 0.22 * sm(0.1, 0.4, k);
    man.root.rotation.y = -1.2;
    p = P(zg, { rSh: [-1.5, 0, -0.2], rEl: [-1.6], head: [0.1, -0.3, 0] });
    rh = man.head.localToWorld(V(-0.02, 0.12, 0.26));
    f = { mouth: "line", eye: 0.6, brow: 0.5, look: [0.6, -0.2] };
    cp = V(-0.7, 0.3, 3).lerp(V(-0.5, 0.2, 2.4), eio(k));
    ct = V(0.5, -0.1, -0.6);
  } else if (sc === "hatch") {
    mode = "nh3";
    al = 0.4;
    const cl = eio(sm(0.15, 0.65, k));
    hinge.rotation.y = lerp(-1.7, 0, cl);
    man.root.position.set(0.15, -0.45 + fl, -ML / 2 + 1.15);
    man.root.rotation.set(0, Math.PI, 0);
    p = P(zg, { lSh: [-1.4, 0, 0.3], rSh: [-1.4, 0, -0.3], lEl: [-0.3], rEl: [-0.3], spine: [0.25] });
    f = { mouth: "line", brow: -0.2, look: [0, 0] };
    cp = V(-0.7, 0.5, -ML / 2 + 3.6).lerp(V(-0.5, 0.35, -ML / 2 + 2.8), eio(k));
    ct = V(0, -0.1, -ML / 2 + 0.4);
  } else if (sc === "water") {
    mode = "water";
    wball.visible = true;
    pouch.visible = true;
    const hp = man.head.localToWorld(V(0, 0.1, 0.3));
    wball.position.copy(man.root.localToWorld(V(-0.55, 0.95, 0.35))).add(V(Math.sin(t * 1.2) * 0.05, Math.cos(t) * 0.04, 0));
    wball.scale.set(1 + Math.sin(t * 5) * 0.08, 1 - Math.sin(t * 5) * 0.08, 1);
    lh = man.root.localToWorld(V(0.35, 0.75, 0.35));
    pouch.position.copy(lh).add(V(0, 0.05, 0.03));
    p = P(zg, { head: [-0.1, 0.4, 0] });
    f = { mouth: "smile", eye: 1.05, look: [-0.8, 0.4] };
    cp = V(0.4, 0.55, 2.6).lerp(V(0.3, 0.45, 2), eio(k));
    ct = V(0, 0.3, 0.6);
  } else if (sc === "radio" || sc === "answer") {
    mode = sc === "radio" ? "radio" : "answer";
    man.root.position.set(0.35, -0.55 + fl, 1);
    man.root.rotation.set(0, -1.2, 0);
    p = P(zg, { spine: [0.2, 0, 0], head: [0.05, 0.2, 0] });
    lh = radioG.localToWorld(V(-0.1, -0.05, 0.1));
    if (sc === "radio") rh = radioG.localToWorld(V(0.12, -0.05, 0.1));
    if (sc === "answer" && k > 0.45) {
      p.rSh = [-2.7, 0, -0.4];
      p.rEl = [-0.4];
      rh = null;
    }
    f = sc === "radio" ? { mouth: "open", open: 0.4 + 0.3 * Math.abs(Math.sin(t * 9)), look: [-0.4, 0], brow: 0.3 } : k > 0.4 ? { mouth: "open", open: 1.1, eyeS: 1.2, brow: -0.2, look: [-0.3, 0.2] } : { mouth: "line", brow: 0.4, look: [-0.5, 0] };
    cp = V(-0.6, 0.35, 2.7).lerp(V(-0.4, 0.3, 2.2), eio(k));
    ct = V(0.6, -0.15, 0.7);
  } else {
    cp = V(0, 0.3, 3.2);
    ct = V(0, 0, 0);
  }
  if (!f.blink) f.blink = blink(t);
  pose(man, p);
  man.root.updateMatrixWorld(true);
  if (lh) reach(man, "l", lh, V(0, -1, 0.3));
  if (rh) reach(man, "r", rh, V(0, -1, 0.3));
  face(man, f);
  alarmL.intensity = al * 9;
  mHemi.intensity = 1.4 - al * 0.6;
  scrT.redraw(mode, t);
  setCam(cp, ct, t, { keep: true, fov: PORT ? 52 : 58 });
  draw(mod);
}
function steppeShot(s, lt, k, t) {
  const sc = s.scene;
  dust.material.opacity = 0;
  burst.intensity = 0;
  man2.root.visible = false;
  chute.visible = true;
  if (sc === "chute") {
    const y = lerp(60, 16, k);
    capG.position.set(0, y, 0);
    capG.rotation.set(Math.sin(t * 1.3) * 0.05, t * 0.2, Math.cos(t) * 0.04);
    chute.position.set(0, y + 6 * 2.4 + 1.3, 0);
    chute.rotation.copy(capG.rotation);
    const ang = 0.8 + k * 0.3;
    setCam(V(Math.cos(ang) * 30, y - 6, Math.sin(ang) * 30), V(0, y + 7, 0), t, { land: 1.1 });
  } else if (sc === "land") {
    const fire = 0.32, D = s.dur, y = lt < D * fire ? lerp(8, 1.6, lt / (D * fire)) : Math.max(1.32, 1.6 - (lt - D * fire) * 1.5);
    capG.position.set(0, y, 0);
    capG.rotation.set(0, 0.4, 0);
    chute.position.set(4 * sm(0.4, 1, k), y + 15.7 - 12 * sm(0.35, 1, k), -2 * sm(0.4, 1, k));
    chute.rotation.z = -1.2 * sm(0.35, 1, k);
    const age = lt - D * fire;
    burst.position.set(0, 0.5, 0);
    burst.intensity = age > 0 ? 40 * Math.exp(-age * 6) : 0;
    for (let i = 0; i < 400; i++) {
      const a = Math.max(0, age), r = (1 + rnd(i, 1) * 3) * (1 - Math.exp(-a * 2)) * 4, an = rnd(i, 2) * 6.283;
      dust.pos[i * 3] = Math.cos(an) * r;
      dust.pos[i * 3 + 1] = 0.3 + rnd(i, 3) * 2.5 * (1 - Math.exp(-a * 2));
      dust.pos[i * 3 + 2] = Math.sin(an) * r;
    }
    dust.upd();
    dust.material.opacity = age > 0 ? 0.3 * Math.exp(-age * 1.2) : 0;
    setShake(age > 0 ? 0.25 * Math.exp(-age * 5) : 0);
    setCam(V(10, 3.2, 13), V(0, 2.2, 0), t);
  } else {
    capG.position.set(0, 1.32, 0);
    capG.rotation.set(0, 0.4, 0);
    chute.visible = false;
    man2.root.visible = true;
    man2.root.position.set(2.1, 0.3, 1.7);
    man2.root.rotation.y = -0.4;
    pose(man2, P(SIT, { rSh: [-0.2, 0, -2.6 - Math.sin(t * 7) * 0.3], rEl: [-0.3], lSh: [0, 0, 0.3] }));
    face(man2, { mouth: "smile", blink: blink(t), look: [0, 0.1] });
    stSky.set(16751210, 16765088);
    const a = 0.4 + k * 0.25;
    setCam(V(2.2 + Math.cos(a) * 9, 3, 1.6 + Math.sin(a) * 9), V(1.6, 1.6, 0), t);
  }
  if (sc !== "end") stSky.set(5937896, 16767392);
  draw(stp);
}
var SPACE = ["orbit", "sunrise", "debris", "hit", "decay", "undock", "reentry"];
var STP = ["chute", "land", "end"];
function render(s, lt, k, t) {
  if (SPACE.includes(s.scene)) spaceShot(s, lt, k, t);
  else if (STP.includes(s.scene)) steppeShot(s, lt, k, t);
  else modShot(s, lt, k, t);
}
function cards2(s, lt, k) {
  const a = sm(0.12, 0.4, lt);
  switch (s.scene) {
    case "orbit":
      return card(330, `<div class="t">${L("\u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C", "speed")}</div><div class="v">${EN ? fmtN(lerp(0, 17500, eio(k * 1.4))) + " <small>mph</small>" : fmtN(lerp(0, 28e3, eio(k * 1.4))) + " <small>\u043A\u043C/\u0447</small>"}</div><div class="n">${L("\u2248 8 \u043A\u043C \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u2248 5 miles per second")}</div>`, a);
    case "sunrise":
      return card(330, `<div class="t">${L("\u0432\u043E\u0441\u0445\u043E\u0434\u043E\u0432 \u0437\u0430 \u0441\u0443\u0442\u043A\u0438", "sunrises a day")}</div><div class="v">${Math.max(1, Math.min(16, Math.ceil(eio(k / 0.8) * 16)))}</div><div class="n">${L("\u043E\u0434\u0438\u043D \u0432\u0438\u0442\u043E\u043A \u2248 90 \u043C\u0438\u043D\u0443\u0442", "one orbit \u2248 90 minutes")}</div>`, a);
    case "hit": {
      const on = lt > s.dur * 0.34;
      return on ? card(330, `<div class="t" style="color:#ff4b5c">${L("\u0441\u0432\u044F\u0437\u044C \u0441 \u0417\u0435\u043C\u043B\u0451\u0439", "link to Earth")}</div><div class="v" style="color:#ff4b5c"><span style="opacity:${Math.floor(lt * 3) % 2 ? 1 : 0.35}">${L("\u041D\u0415\u0422", "LOST")}</span></div>`, sm(s.dur * 0.34, s.dur * 0.34 + 0.3, lt)) : "";
    }
    case "hatch":
      return card(330, `<div class="t">${L("\u044F\u043D\u0432\u0430\u0440\u044C 2015", "january 2015")}</div><div class="v">NH\u2083</div><div class="n">${L("\u044D\u043A\u0438\u043F\u0430\u0436 \u0443\u0448\u0451\u043B \u0432 \u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u0438\u0439 \u0441\u0435\u0433\u043C\u0435\u043D\u0442", "crew moved to the Russian segment")}</div>`, sm(0.35, 0.6, k));
    case "decay":
      return card(330, `<div class="t">${L("\u0432\u044B\u0441\u043E\u0442\u0430", "altitude")}</div><div class="v">${EN ? "\u2212300 <small>ft/day</small>" : "\u2212100 <small>\u043C/\u0441\u0443\u0442\u043A\u0438</small>"}</div>`, a);
    case "water": {
      const v = Math.round(lerp(0, 98, eio(k / 0.7)));
      return card(330, `<div class="t">${L("\u0432\u043E\u0434\u0430 \u0438\u0437 \u043F\u043E\u0442\u0430 \u0438 \u043C\u043E\u0447\u0438", "water from sweat & urine")}</div><div class="v">${v} <small>%</small></div><div class="bar"><div style="width:${v}%;background:#4fd8ff"></div></div>`, a);
    }
    case "reentry": {
      const g = lerp(1, 4.5, eio(sm(0.1, 0.6, k)));
      return card(330, `<div class="t">${L("\u043F\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u043A\u0430", "g-force")}</div><div class="v" style="color:${g > 3 ? "#ff4b5c" : "#1a1033"}">${g.toFixed(1)} <small>g</small></div><div class="n">${L("\u0442\u044B \u0432\u0435\u0441\u0438\u0448\u044C \u0432 4\u20135 \u0440\u0430\u0437 \u0431\u043E\u043B\u044C\u0448\u0435", "you weigh 4\u20135\xD7 more")}</div>`, a);
    }
    case "land":
      return card(330, `<div class="t">${L("\u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043A\u0430\u0441\u0430\u043D\u0438\u044F", "touchdown speed")}</div><div class="v">${EN ? "\u2248 3 <small>mph</small>" : "\u2248 5 <small>\u043A\u043C/\u0447</small>"}</div><div class="n">${L("\u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u0438 \u0432\u043A\u043B\u044E\u0447\u0430\u044E\u0442\u0441\u044F \u0437\u0430 1 \u043C", "engines fire 1 m above ground")}</div>`, sm(0.4, 0.6, k));
  }
  return "";
}
function full2(s, lt, k) {
  if (s.scene !== "archive") return "";
  const a = sm(0, 0.3, lt);
  let svg = `<svg viewBox="0 0 400 210" width="${PORT ? 760 : 680}" height="${PORT ? 400 : 357}"><rect width="400" height="210" fill="#0d1838"/><path d="M-20 230 Q200 120 420 230 Z" fill="#2f7fd0" stroke="#1a1033" stroke-width="4"/>`;
  for (let i = 0; i < 70; i++) svg += `<circle cx="${(hash(i, 1) * 400 + k * 60) % 400}" cy="${30 + hash(i, 2) * 110}" r="${1.2 + hash(i, 3) * 2.2}" fill="#ffd27a" opacity=".85"/>`;
  svg += `<g transform="translate(200,95)" stroke="#1a1033" stroke-width="3"><rect x="-70" y="-4" width="140" height="8" fill="#c9cdd8"/><rect x="-66" y="-30" width="18" height="60" fill="#1b2f7a"/><rect x="48" y="-30" width="18" height="60" fill="#1b2f7a"/><rect x="-14" y="-14" width="28" height="22" rx="6" fill="#f3f5fa"/></g></svg>`;
  return paper(a, k, `${svg}<div style="font-weight:900;font-size:64px;margin-top:14px;color:#1a1033">${L("15 \u041D\u041E\u042F\u0411\u0420\u042F 2021", "NOVEMBER 15, 2021")}</div><div style="font-weight:700;font-size:34px">${L("\u2248 1 500 \u043E\u0431\u043B\u043E\u043C\u043A\u043E\u0432 \u043D\u0430 \u043E\u0440\u0431\u0438\u0442\u0435", "\u2248 1,500 pieces of debris")}</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:8px">${L("7 \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u0443\u043A\u0440\u044B\u043B\u0438\u0441\u044C \u0432 \u043A\u043E\u0440\u0430\u0431\u043B\u044F\u0445", "7 crew sheltered in their spacecraft")}</div>`);
}
function fx(s, lt, k) {
  if (s.scene === "hit") {
    const a = lt - s.dur * 0.32;
    return { fl: a > 0 ? 0.8 * Math.exp(-a * 7) : 0 };
  }
  if (s.scene === "land") {
    const a = lt - s.dur * 0.32;
    return { fl: a > 0 ? 0.5 * Math.exp(-a * 6) : 0, flc: "#ffd7a0" };
  }
  if (s.scene === "alarm") return { fl: Math.floor(lt * 3) % 2 === 0 ? 0.12 : 0, flc: "#ff2030" };
  return {};
}
start({ render, cards: cards2, full: full2, fx, mins: { hit: 3.2, land: 3, chute: 3, undock: 3.4, sunrise: 4.2 }, cap: (s) => SPACE.includes(s.scene) || STP.includes(s.scene) ? {} : { bottom: 520 } });
