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
var Box = (x, y, z) => {
  const r = Math.min(0.09, Math.min(x, y, z) * 0.14);
  return r < 4e-3 ? new THREE.BoxGeometry(x, y, z) : new RoundedBoxGeometry(x, y, z, 2, r);
};
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
    const sh2 = G(spine, [side * 0.22, 0.38, 0]);
    add(sh2, capDown(0.058, L1), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    const el = G(sh2, [0, -L1, 0]);
    add(el, capDown(0.052, L2), top, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(el, Sph(0.06, 14, 10), o.gloves ? T(o.gloves) : skin, [0, -L2 - 0.03, 0], [0, 0, 0], null, 0.01);
    J[s + "Sh"] = sh2;
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
var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
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
composer.addPass(bloom);
composer.addPass(new OutputPass());
var shake = 0;
var setShake = (v) => {
  shake = v;
};
var lastTgt = new THREE.Vector3();
function setCam(pos, tgt, t = 0, o = {}) {
  let p = pos.clone();
  if (!PORT && !o.keep) p = p.sub(tgt).multiplyScalar(o.land ?? 1).add(tgt);
  camera.position.copy(p);
  if (shake > 0) camera.position.add(V(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, Math.sin(t * 63) * shake * 0.5));
  lastTgt.copy(tgt);
  camera.up.set(0, 1, 0);
  if (o.roll) camera.up.set(Math.sin(o.roll), Math.cos(o.roll), 0);
  camera.lookAt(tgt);
  const f = o.fov ? PORT ? 2 * Math.atan(Math.tan(o.fov / 2 * Math.PI / 180) / (W / H)) * 180 / Math.PI : o.fov : BASEFOV;
  if (camera.fov !== f) {
    camera.fov = f;
    camera.updateProjectionMatrix();
  }
}
var prepped = /* @__PURE__ */ new WeakSet();
var _d = new THREE.Vector3();
function prepShadows(scene) {
  scene.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline && !o.isPoints) {
      const m = o.material;
      const solid = m && !m.transparent && (m.isMeshToonMaterial || m.isMeshStandardMaterial || m.isMeshLambertMaterial);
      o.castShadow = !!solid && m.side !== THREE.BackSide && !o.userData.noShadow;
      o.receiveShadow = !!(m && (m.isMeshToonMaterial || m.isMeshStandardMaterial || m.isMeshLambertMaterial));
    }
    if (o.isDirectionalLight && !o.userData.noShadow) {
      o.castShadow = true;
      o.shadow.mapSize.set(2048, 2048);
      o.shadow.bias = -6e-4;
      o.shadow.normalBias = 0.03;
      o.shadow.radius = 3;
      if (!o.target.parent) scene.add(o.target);
    }
  });
  prepped.add(scene);
}
function draw(scene) {
  if (!prepped.has(scene) || scene.userData.reprep) {
    prepShadows(scene);
    scene.userData.reprep = false;
  }
  const dist = camera.position.distanceTo(lastTgt), S = clamp(dist * 1.1, 5, 140);
  scene.traverse((o) => {
    if (o.isDirectionalLight && o.castShadow) {
      _d.copy(o.position).sub(o.target.position);
      if (_d.lengthSq() < 1e-6) _d.set(0, 1, 0);
      _d.normalize();
      o.target.position.copy(lastTgt);
      o.position.copy(lastTgt).addScaledVector(_d, S * 2.5);
      o.target.updateMatrixWorld();
      const c = o.shadow.camera;
      if (c.right !== S) {
        c.left = -S;
        c.right = S;
        c.top = S;
        c.bottom = -S;
        c.near = 0.1;
        c.far = S * 6;
        c.updateProjectionMatrix();
      }
    }
  });
  rp.scene = scene;
  gtao.scene = scene;
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

// topics/_city.js
function winMats(n = 4) {
  return Array.from({ length: n }, (_, i) => T(2765648, { emissive: 16767114, emissiveIntensity: 0 }));
}
function makeTower(w, h, d, color, wm, seed = 0, o = {}) {
  const g = new THREE.Group();
  add(g, Box(w, h, d), T(color), [0, h / 2, 0], [0, 0, 0], null, o.th ?? 0.04);
  add(g, Box(w + 0.3, 0.4, d + 0.3), T(o.cap ?? 3817304), [0, h + 0.2, 0], [0, 0, 0], null, 0.03);
  const fl = Math.max(1, Math.floor((h - 1.5) / 3)), cols = Math.max(1, Math.floor(w / 2.2)), colsD = Math.max(1, Math.floor(d / 2.2));
  const parts = wm.map(() => []);
  const put = (mi, x, y, z, ry) => {
    const q = new THREE.BoxGeometry(1, 1.3, 0.08);
    q.rotateY(ry);
    q.translate(x, y, z);
    parts[mi].push(q);
  };
  for (let f = 0; f < fl; f++) {
    for (let c = 0; c < cols; c++) {
      const mi = Math.floor(rnd(seed + f * 7 + c, 3) * wm.length);
      const x = -w / 2 + (c + 0.5) * w / cols, y = 2 + f * 3;
      for (const s of [-1, 1]) put(mi, x, y, s * (d / 2 + 0.02), 0);
    }
    for (let c = 0; c < colsD; c++) {
      const mi = Math.floor(rnd(seed + f * 5 + c, 9) * wm.length);
      const z = -d / 2 + (c + 0.5) * d / colsD, y = 2 + f * 3;
      for (const s of [-1, 1]) put(mi, s * (w / 2 + 0.02), y, z, Math.PI / 2);
    }
  }
  parts.forEach((list, mi) => {
    if (list.length) {
      const m = new THREE.Mesh(mergeGeometries(list), wm[mi]);
      m.userData.noShadow = true;
      g.add(m);
    }
  });
  return g;
}
function makeEmpire(wm) {
  const g = new THREE.Group();
  const c = 14208180;
  const tiers = [[18, 20, 18], [14, 50, 14], [11, 14, 11], [8, 8, 8], [5, 4, 5]];
  let y = 0;
  g.userData.roofs = [];
  tiers.forEach(([w, h, d], i) => {
    const t = makeTower(w, h, d, i % 2 ? 13615784 : c, wm, 50 + i * 13, { cap: 12102544 });
    t.position.y = y;
    g.add(t);
    y += h + 0.4;
    g.userData.roofs.push(y);
  });
  add(g, Cyl(1.6, 2.2, 6, 12), T(13615784), [0, y + 3, 0], [0, 0, 0], null, 0.03);
  y += 6;
  add(g, Cyl(0.25, 0.5, 12, 8), T(10133680), [0, y + 6, 0], [0, 0, 0], null, 0.02);
  g.userData.top = y;
  return g;
}
function makeCity(sc, o = {}) {
  const wm = winMats(5);
  const towers = [];
  const N = o.n ?? 70, R = o.r ?? 150, keep = o.keep ?? 14;
  for (let i = 0; i < N; i++) {
    const a = rnd(i, 1) * Math.PI * 2, r = keep + Math.sqrt(rnd(i, 2)) * R;
    const x = Math.cos(a) * r + (o.cx ?? 0), z = Math.sin(a) * r + (o.cz ?? 0);
    if (o.skip && o.skip(x, z)) continue;
    const w = 6 + rnd(i, 3) * 8, h = 10 + rnd(i, 4) * (o.hmax ?? 40), d = 6 + rnd(i, 5) * 8;
    const t = makeTower(w, h, d, [5922944, 6974090, 4870256, 8024208][i % 4], wm, i);
    t.position.set(x, 0, z);
    t.rotation.y = Math.round(rnd(i, 6) * 4) * Math.PI / 2;
    sc.add(t);
    towers.push(t);
  }
  return { wm, towers };
}
function lightWindows(wm, a, wave = null) {
  wm.forEach((m, i) => {
    const k = wave === null ? a : clamp((a - i * 0.12) / 0.5);
    m.emissiveIntensity = k * 1.4;
  });
}
var HERO = { top: 3095122, pants: 2303546, hair: 3810840, skin: 15778464, stubble: true };
function makeHero(o = {}) {
  return makeHuman(Object.assign({}, HERO, o));
}

// topics/lift/scene.js
var blink = (t) => t % 3.2 < 0.1;
var cab = new THREE.Scene();
cab.background = new THREE.Color(1052696);
var chemi = new THREE.HemisphereLight(16774368, 4210768, 1.2);
cab.add(chemi);
var ctop = new THREE.PointLight(16773328, 3, 5, 1.4);
ctop.position.set(0, 2.3, 0);
cab.add(ctop);
add(cab, Box(2.2, 2.5, 2.2), T(12101776, { side: THREE.BackSide }), [0, 1.25, 0], [0, 0, 0], null, 0);
for (const x of [-1.09, 1.09]) for (let i = 0; i < 3; i++) add(cab, Box(0.02, 2, 0.6), T(11049086), [x, 1.2, -0.7 + i * 0.7], [0, 0, 0], null, 4e-3);
add(cab, Box(2.1, 0.05, 0.05), T(13225432), [0, 0.95, -1.06], [0, 0, 0], null, 4e-3);
add(cab, Box(1.2, 0.05, 0.2), B(16774880), [0, 2.48, 0], [0, 0, 0], null, 0);
var doors = G(cab, [0, 0, 1.08]);
for (const x of [-0.5, 0.5]) add(doors, Box(0.98, 2.2, 0.04), T(13225432), [x, 1.1, 0], [0, 0, 0], null, 6e-3);
var dispTex = canvasTex(256, 128, (c, w, h, n = 80) => {
  c.fillStyle = "#120808";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ff4030";
  c.font = "900 92px R, RL, monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(String(Math.max(0, Math.round(n))), w / 2, h / 2 + 4);
});
var disp = add(cab, new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: dispTex }), [0, 2.25, 1.05], [0, Math.PI, 0], null, 0);
var panel = G(cab, [0.85, 1.25, 1.05]);
add(panel, Box(0.3, 0.7, 0.03), T(13225432), [0, 0, 0], [0, 0, 0], null, 4e-3);
for (let i = 0; i < 10; i++) add(panel, Cyl(0.03, 0.03, 0.02, 12), T(16773312, { emissive: 16760896, emissiveIntensity: 0.2 }), [i % 2 * 0.12 - 0.06, 0.28 - Math.floor(i / 2) * 0.12, -0.02], [Math.PI / 2, 0, 0], null, 0);
var hero = makeHero();
cab.add(hero.root);
var sh = new THREE.Scene();
sh.background = new THREE.Color(789524);
var shemi = new THREE.HemisphereLight(13687039, 4210768, 1.6);
sh.add(shemi);
{
  const d = new THREE.DirectionalLight(16777215, 0.9);
  d.position.set(5, 10, 8);
  sh.add(d);
}
var FLOORS = 80;
var FH = 4;
var shaftH = FLOORS * FH;
add(sh, Box(0.3, shaftH, 4), T(5921386), [-2.2, shaftH / 2, 0], [0, 0, 0], null, 0);
add(sh, Box(4.4, shaftH, 0.3), T(4868698), [0, shaftH / 2, -2.1], [0, 0, 0], null, 0);
add(sh, Box(0.3, shaftH, 4), T(5921386), [2.2, shaftH / 2, 0], [0, 0, 0], null, 0);
for (const x of [-1.6, 1.6]) add(sh, Box(0.14, shaftH, 0.2), T(10133680), [x, shaftH / 2, -0.2], [0, 0, 0], null, 0);
var floorTex = (n) => canvasTex(128, 64, (c) => {
  c.fillStyle = "#2a2a3a";
  c.fillRect(0, 0, 128, 64);
  c.fillStyle = "#ffd23f";
  c.font = "900 48px R, RL, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(String(n), 64, 34);
});
for (let f = 0; f <= FLOORS; f += 5) {
  add(sh, Box(4.4, 0.25, 0.4), T(6974074), [0, f * FH, 1.8], [0, 0, 0], null, 0);
  add(sh, new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: floorTex(f) }), [-1.6, f * FH + 1.2, -1.94], [0, 0, 0], null, 0);
}
var car = G(sh);
add(car, Box(2.6, 2.6, 2.6), T(12101776), [0, 1.3, 0], [0, 0, 0], null, 0.03);
add(car, Box(2.8, 0.2, 2.8), T(4868698), [0, 2.7, 0], [0, 0, 0], null, 0.02);
add(car, Box(2.8, 0.2, 2.8), T(4868698), [0, -0.1, 0], [0, 0, 0], null, 0.02);
var wedges = [];
for (const s of [-1, 1]) {
  const w = add(car, Box(0.3, 0.5, 0.4), T(13647920), [s * 1.95, 0.2, -0.2], [0, 0, 0], null, 0.01);
  wedges.push(w);
}
var cable = add(sh, Cyl(0.05, 0.05, 1, 6), T(2829099), [0, 0, 0], [0, 0, 0], null, 0);
var coil = G(sh);
for (let i = 0; i < 12; i++) add(coil, new THREE.TorusGeometry(0.9 - i % 3 * 0.1, 0.07, 6, 20), T(3815994), [i % 2 * 0.2 - 0.1, 0.1 + i * 0.13, i % 3 * 0.1], [Math.PI / 2, 0, i], null, 6e-3);
coil.visible = false;
var betty = makeHuman({ top: 2767466, pants: 2767466, hair: 6961698, hairStyle: "long", skin: 16175026, dress: true, cap: 2767466 });
car.add(betty.root);
betty.root.position.set(0.5, 0.35, 1.25);
betty.root.visible = false;
var ny = new THREE.Scene();
var nsky = makeSky(5925514, 15255712, 1600);
ny.add(nsky);
ny.fog = new THREE.Fog(13156528, 80, 700);
var nhemi = new THREE.HemisphereLight(16773344, 4868698, 1.3);
ny.add(nhemi);
var nsun = new THREE.DirectionalLight(16769216, 1.6);
nsun.position.set(-120, 80, 60);
ny.add(nsun);
add(ny, new THREE.PlaneGeometry(4e3, 4e3), T(5922408), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
var ewm = winMats(3);
var empire = makeEmpire(ewm);
ny.add(empire);
var NC = makeCity(ny, { n: 110, r: 320, keep: 26, hmax: 45 });
var plane = G(ny);
add(plane, Cap(0.7, 6, 12), T(6978138), [0, 0, 0], [0, 0, Math.PI / 2], null, 0.03);
add(plane, Box(1.4, 0.12, 14), T(6978138), [0, 0, 0], [0, 0, 0], null, 0.02);
add(plane, Box(0.9, 1.6, 0.1), T(6978138), [-3.4, 0.8, 0], [0, 0, 0], null, 0.02);
add(plane, Box(0.9, 0.1, 4), T(6978138), [-3.4, 0.2, 0], [0, 0, 0], null, 0.02);
for (const z of [-2.6, 2.6]) add(plane, Cyl(0.45, 0.4, 1.6, 12), T(4872762), [0.6, -0.1, z], [0, 0, Math.PI / 2], null, 0.015);
plane.scale.setScalar(4);
var smoke = [];
for (let i = 0; i < 7; i++) smoke.push(add(ny, new THREE.IcosahedronGeometry(1, 1), T(6972512, { transparent: true, opacity: 0, depthWrite: false }), [0, -50, 0], [i, i * 2, 0], null, 0));
function cabRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp = V(0.6, 1.55, 0.85), ct = V(-0.1, 1.25, -0.3), f = { mouth: "line", blink: blink(t) }, ps = P(STAND), y = 0, fopt = { keep: true, fov: 60 };
  hero.root.rotation.set(0, 0.5, 0);
  ctop.intensity = 3;
  chemi.intensity = 1.2;
  if (sc2 === "snap") {
    dispTex.redraw(80 - k * 6);
    setShake(0.03 * sm(0.15, 0.3, k));
    f = { mouth: "open", open: 0.8 * sm(0.15, 0.3, k), eyeS: 1 + 0.3 * sm(0.15, 0.3, k), brow: 0.4 };
    ps = P(STAND, { lSh: [-0.4, 0, 0.9], rSh: [-0.4, 0, -0.9] });
    y = 0.06 * sm(0.15, 0.3, k);
  } else if (sc2 === "idea") {
    dispTex.redraw(74 - k * 14);
    setShake(0.02);
    ps = P(STAND, { lSh: [0, 0, 1.2], rSh: [0, 0, -1.2], lEl: [-0.2], rEl: [-0.2] });
    f = { mouth: "line", brow: 0.3, look: [0, 0.8] };
    cp = V(0.6, 1.55, 0.7);
    ct = V(0, 1.45, -0.6);
  } else if (sc2 === "jump") {
    dispTex.redraw(20 - k * 12);
    setShake(0.02);
    const j = Math.max(0, Math.sin(clamp((k - 0.3) / 0.4) * Math.PI));
    y = j * 0.45;
    ps = P(STAND, { lHip: [-0.5 * j], rHip: [-0.5 * j], lKn: [0.9 * j], rKn: [0.9 * j], lSh: [-2.6 * j, 0, 0.3], rSh: [-2.6 * j, 0, -0.3] });
    f = { mouth: "open", open: 0.6, eyeS: 1.2 };
  } else if (sc2 === "blind") {
    dispTex.redraw(12 - k * 9);
    setShake(0.025);
    ctop.intensity = 1.2;
    chemi.intensity = 0.5;
    f = { mouth: "open", open: 0.4, look: [Math.sin(t * 2), -0.3], brow: 0.4 };
    ps = P(STAND, { head: [0, Math.sin(t * 2) * 0.4, 0], lKn: [0.4], rKn: [0.4], lHip: [-0.3], rHip: [-0.3] });
    y = -0.05;
  } else if (sc2 === "floor") {
    dispTex.redraw(3);
    hero.root.rotation.set(-Math.PI / 2, 0, 0);
    hero.root.position.set(0, 0.2, -0.15);
    ps = P(STAND, { lSh: [0, 0, 1.4], rSh: [0, 0, -1.4], lEl: [0], rEl: [0], lHip: [0, 0, 0.25], rHip: [0, 0, -0.25] });
    f = { mouth: "line", eye: 0.6, brow: 0.2 };
    cp = V(0, 2.25, 0.9);
    ct = V(0, 0.2, -0.2);
    fopt.fov = 66;
    pose(hero, ps);
    face(hero, f);
    setCam(cp, ct, t, fopt);
    draw(cab);
    return;
  }
  if (sc2 === "idea") hero.root.position.set(0, y, -0.75);
  else hero.root.position.set(-0.1, y, -0.3);
  pose(hero, ps);
  face(hero, f);
  setCam(cp, ct, t, fopt);
  draw(cab);
}
function shaftRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cy, cp, ct;
  coil.visible = false;
  betty.root.visible = false;
  wedges.forEach((w, i) => w.position.x = (i ? 1 : -1) * 1.95);
  if (sc2 === "fall") {
    const fl = lerp(60, 8, k * k);
    cy = fl * FH;
    setShake(0.04);
  } else if (sc2 === "brakes") {
    const stop = sm(0.3, 0.6, k);
    cy = 30 * FH - (1 - stop) * 6 * (1 - k);
    wedges.forEach((w, i) => w.position.x = (i ? 1 : -1) * lerp(1.95, 1.55, stop));
    setShake(stop < 1 ? 0.02 : 0);
  } else if (sc2 === "betty") {
    betty.root.visible = true;
    coil.visible = true;
    cy = lerp(30, 0.9, eio(sm(0, 0.8, k))) * (k < 0.8 ? 1 : 1);
    if (k > 0.8) cy = 0.9 + Math.sin((k - 0.8) * 30) * 0.15 * (1 - k) * 5;
    pose(betty, P(STAND, { lSh: [-0.4, 0, 0.8], rSh: [-0.4, 0, -0.8] }));
    face(betty, { mouth: "open", open: 0.6, eyeS: 1.2 });
  }
  car.position.set(0, cy, 0);
  cable.scale.y = shaftH - cy - 3;
  cable.position.set(0, cy + 2.8 + (shaftH - cy - 3) / 2, 0);
  if (sc2 === "fall" || sc2 === "betty") {
    cable.scale.y = 18;
    cable.position.y = cy + 2.8 + 9;
  }
  if (sc2 === "brakes") {
    cp = V(1.6, cy + 1.2, 3.4);
    ct = V(1.7, cy + 0.3, -0.2);
  } else if (sc2 === "betty") {
    cp = V(1.2, cy + 2.4, 7.5);
    ct = V(0, cy + 1.1, 0);
  } else {
    cp = V(1.2, cy + 2.4, 8.5);
    ct = V(0, cy + 1.3, 0);
  }
  setCam(cp, ct, t, { keep: true, fov: 50 });
  draw(sh);
}
function nyRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct;
  plane.visible = false;
  smoke.forEach((m) => m.material.opacity = 0);
  lightWindows(NC.wm, 0);
  lightWindows(ewm, 0);
  const top = empire.userData.top;
  if (sc2 === "bomber") {
    nsky.set(9079440, 13157564);
    ny.fog.near = 30;
    ny.fog.far = 360;
    plane.visible = true;
    const a = clamp(k * 1.05);
    plane.position.set(lerp(-260, -40, a), 75, lerp(140, 30, a));
    plane.rotation.y = -0.5;
    cp = V(-40, 82, 170);
    ct = plane.position.clone().lerp(V(0, 70, 0), 0.35);
    if (k > 0.82) smoke.forEach((m, i) => {
      const e = (k - 0.82) * 6;
      m.position.set(-8 + i * 2, 72 + i * 3 + e * 4, 6 + i);
      m.scale.setScalar(4 + e * 6 + i);
      m.material.opacity = 0.7 * clamp(e);
    });
  } else {
    nsky.set(4872842, 16756858);
    ny.fog.near = 120;
    ny.fog.far = 900;
    lightWindows(NC.wm, 0.5);
    lightWindows(ewm, 0.6);
    const u = eio(clamp(lt / s.dur));
    cp = V(lerp(40, 160, u), lerp(10, top + 40, u), lerp(60, 220, u));
    ct = V(0, lerp(20, top * 0.8, u), 0);
    if (sc2 === "end") {
      cp = V(160, top + 40, 220);
      ct = V(0, top * 0.8, 0);
    }
  }
  setCam(cp, ct, t, { fov: 50 });
  draw(ny);
}
var texOK = false;
function render(s, lt, k, t) {
  if (!texOK) {
    dispTex.redraw(80);
    texOK = true;
  }
  const sc2 = s.scene;
  if (["snap", "idea", "jump", "blind", "floor"].includes(sc2)) cabRender(s, lt, k, t);
  else if (["fall", "brakes", "betty"].includes(sc2)) shaftRender(s, lt, k, t);
  else nyRender(s, lt, k, t);
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
start({ render, cards: cards2, mins: { bomber: 6, end: 3.5 }, bubbles: ["#2a2420", "#8a6a4a", "#ffd23f"] });
