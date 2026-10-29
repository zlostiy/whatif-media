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
  if (cov < 0.03) return;
  for (let i = 0; i < 70; i++) {
    const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < 0.5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110);
    if (r < 3) continue;
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
function makeTree(s = 1) {
  const g = new THREE.Group();
  add(g, Cyl(0.12 * s, 0.16 * s, 1.4 * s, 8), T(9067066), [0, 0.7 * s, 0], [0, 0, 0], null, 0.015);
  add(g, new THREE.IcosahedronGeometry(0.85 * s, 0), T(6079594), [0, 1.9 * s, 0], [0, 0, 0], null, 0.025);
  add(g, new THREE.IcosahedronGeometry(0.6 * s, 0), T(4894298), [0.35 * s, 1.5 * s, 0.2 * s], [0, 0, 0], null, 0.02);
  return g;
}
var ZONES = { street: V(0, 0, 0), farm: V(260, 0, 0), beach: V(-260, 0, 0), river: V(0, 0, 260), plaza: V(0, 0, -260), volcano: V(520, 0, 0), airport: V(0, 0, -560) };

// topics/_city.js
var HERO = { top: 3095122, pants: 2303546, hair: 3810840, skin: 15778464, stubble: true };
function makeHero(o = {}) {
  return makeHuman(Object.assign({}, HERO, o));
}

// topics/car/scene.js
var blink = (t) => t % 3.2 < 0.1;
var out = new THREE.Scene();
var osky = makeSky(6982360, 16765088, 1400);
out.add(osky);
out.fog = new THREE.Fog(14207160, 80, 520);
var ohemi = new THREE.HemisphereLight(16774376, 5925466, 1.5);
out.add(ohemi);
var osun = new THREE.DirectionalLight(16769216, 1.7);
osun.position.set(-60, 50, -40);
out.add(osun);
var WL = 0;
for (const sx of [-1, 1]) add(out, new THREE.PlaneGeometry(1500, 3e3), T(6982218), [sx * 780, -6, 0], [-Math.PI / 2, 0, 0], null, 0);
var riverBed = add(out, new THREE.PlaneGeometry(60, 800), T(5921354), [0, -9, 0], [-Math.PI / 2, 0, 0], null, 0);
for (const s of [-1, 1]) add(out, Box(40, 7, 800), T(8034906), [s * 50, -2.5, 0], [0, 0, 0], null, 0);
var water = add(out, new THREE.PlaneGeometry(64, 800, 1, 1), T(3836592, { transparent: true, opacity: 0.78, emissive: 670298, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false }), [0, WL, 0], [-Math.PI / 2, 0, 0], null, 0);
water.userData.noShadow = true;
water.renderOrder = 2;
var bridge = G(out, [0, 0, -20]);
add(bridge, Box(90, 1.2, 9), T(10132136), [0, 9, 0], [0, 0, 0], null, 0.05);
for (const x of [-18, 18]) add(bridge, Box(3, 18, 4), T(9079448), [x, 0, 0], [0, 0, 0], null, 0.04);
for (const s of [-1, 1]) for (let x = -44; x <= 44; x += 2) if (!(s > 0 && Math.abs(x - 2) < 3)) add(bridge, Box(0.15, 1, 0.15), T(15263984), [x, 10.1, s * 4.3], [0, 0, 0], null, 5e-3);
for (const s of [-1, 1]) add(bridge, Box(90, 0.15, 0.15), T(15263984), [s > 0 ? 0 : 0, 10.6, s * 4.3], [0, 0, 0], null, 5e-3);
for (let i = 0; i < 30; i++) {
  const tr = makeTree(2.5 + rnd(i, 2));
  tr.position.set((i % 2 ? 1 : -1) * (40 + rnd(i, 3) * 30), 1, -120 + i * 9);
  out.add(tr);
}
var car = makeCar(14172224);
car.scale.setScalar(1.8);
out.add(car);
var outHero = makeHero();
out.add(outHero.root);
var rays = [];
for (let i = 0; i < 6; i++) {
  const m = add(out, new THREE.ConeGeometry(2.2, 14, 16, 1, true), B(12578815, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [-6 + i * 2.6, -6.5, 6 - i], [0, 0, 0.25], null, 0);
  m.userData.noShadow = true;
  rays.push(m);
}
var cab = new THREE.Scene();
cab.background = new THREE.Color(662052);
var chemi = new THREE.HemisphereLight(14217471, 2109504, 1.2);
cab.add(chemi);
var cdir = new THREE.DirectionalLight(12577023, 0.8);
cdir.position.set(0, 4, 2);
cab.add(cdir);
add(cab, Box(1.8, 1.3, 2.6), T(3816004, { side: THREE.BackSide }), [0, 0.65, 0], [0, 0, 0], null, 0);
add(cab, Box(1.8, 0.5, 0.5), T(2829107), [0, 0.55, -1.05], [0, 0, 0], null, 0.01);
add(cab, Cyl(0.18, 0.18, 0.04, 20), T(1710618), [-0.4, 0.85, -0.75], [1.1, 0, 0], null, 6e-3);
for (const x of [-0.42, 0.42]) {
  add(cab, Box(0.6, 0.15, 0.6), T(5913130), [x, 0.32, 0.1], [0, 0, 0], null, 0.01);
  add(cab, Box(0.6, 0.7, 0.15), T(5913130), [x, 0.7, 0.45], [-0.15, 0, 0], null, 0.01);
}
var outsideColor = new THREE.Color();
var winL = add(cab, new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ color: 10146024, transparent: true, opacity: 0.55 }), [-0.89, 0.98, 0], [0, Math.PI / 2, 0], null, 0);
var winF = add(cab, new THREE.PlaneGeometry(1.5, 0.45), new THREE.MeshBasicMaterial({ color: 10146024, transparent: true, opacity: 0.55 }), [0, 1, -1.25], [-0.35, 0, 0], null, 0);
var shards = [];
for (let i = 0; i < 9; i++) {
  const m = add(cab, new THREE.TetrahedronGeometry(0.12 + rnd(i, 1) * 0.06), new THREE.MeshBasicMaterial({ color: 12576511, transparent: true, opacity: 0.8 }), [-0.86, 0.98, 0], [i, i * 2, 0], null, 0);
  m.visible = false;
  shards.push(m);
}
var waterIn = add(cab, Box(1.76, 1, 2.56), new THREE.MeshToonMaterial({ color: 3840704, transparent: true, opacity: 0.45, depthWrite: false }), [0, 0.5, 0], [0, 0, 0], null, 0);
waterIn.userData.noShadow = true;
var hammer = G(cab);
add(hammer, Cyl(0.02, 0.02, 0.22, 8), T(13647920), [0, 0, 0], [0, 0, 0], null, 4e-3);
add(hammer, Box(0.12, 0.04, 0.04), T(2829099), [0, 0.12, 0], [0, 0, 0], null, 4e-3);
hammer.visible = false;
var phoneM = add(cab, Box(0.08, 0.15, 0.015), T(1710618), [0, 0, 0], [0, 0, 0], null, 4e-3);
phoneM.visible = false;
var hero = makeHero();
cab.add(hero.root);
var doorL = G(cab, [-0.9, 0, 0]);
add(doorL, Box(0.05, 0.65, 1.2), T(14172224), [0, 0.4, 0], [0, 0, 0], null, 6e-3);
function outRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct, under = false, fopt = {};
  outHero.root.visible = false;
  rays.forEach((r) => r.material.opacity = 0);
  const C0 = V(2, 10.2, -20);
  if (sc2 === "bridge") {
    const a = clamp((k - 0.2) / 0.55);
    car.visible = true;
    if (a <= 0) {
      car.position.set(lerp(-30, 2, k / 0.2), 10.25, -20);
      car.rotation.set(0, 0, 0);
    } else {
      const tt2 = a * 1.6;
      car.position.set(2 + a * 4, Math.max(WL - 0.4, 10.25 + 3 * a - 13.6 * a * a), -20 + a * 12);
      car.rotation.set(0, Math.PI / 2, -a * 0.9);
    }
    setShake(k > 0.74 && k < 0.82 ? 0.05 : 0);
    cp = V(26, 14, 18);
    ct = V(0, 4, -12);
  } else if (sc2 === "float" || sc2 === "surface" || sc2 === "end") {
    if (sc2 === "float") {
      car.position.set(6, WL - 0.3 + Math.sin(t * 1.5) * 0.08, -8);
      car.rotation.set(Math.sin(t) * 0.03, Math.PI / 2, 0.05);
      cp = V(14, 3.5, 4);
      ct = V(6, 0.5, -8);
    } else {
      car.position.set(6, -8, -8);
      car.rotation.set(0, Math.PI / 2, 0.3);
      const u = eio(clamp(lt / s.dur));
      outHero.root.visible = true;
      const hy = sc2 === "end" ? WL - 0.9 : lerp(-6.5, WL - 0.9, sm(0, 0.6, clamp(lt / s.dur)));
      outHero.root.position.set(4, hy, -2);
      outHero.root.rotation.set(sc2 === "end" ? 0 : -0.6, -0.4, 0);
      pose(outHero, sc2 === "end" ? P(STAND, { lSh: [-1.2, 0, 0.9], rSh: [-1.2, 0, -0.9] }) : P(STAND, { lSh: [-2.8, 0, 0.3], rSh: [-2.8, 0, -0.3], lHip: [Math.sin(t * 6) * 0.4], rHip: [-Math.sin(t * 6) * 0.4] }));
      face(outHero, { mouth: "open", open: 0.5, eye: 0.8 });
      if (sc2 === "surface" && lt / s.dur < 0.55) {
        under = true;
        rays.forEach((r, i) => {
          r.material.opacity = 0.14;
          r.rotation.z = 0.25 + Math.sin(t * 0.3 + i) * 0.05;
        });
        cp = V(lerp(9, 7, u), lerp(-7.5, -3, u), lerp(8, 6, u));
        ct = V(4, hy + 1.5, -2);
      } else {
        cp = V(lerp(7, 30, u), lerp(1.2, 14, u), lerp(3, 34, u));
        ct = V(lerp(4, 2, u), lerp(0, 3, u), lerp(-2, -16, u));
        if (sc2 === "end") {
          cp = V(30, 14, 34);
          ct = V(2, 3, -16);
        }
      }
    }
  } else {
    under = true;
    car.position.set(6, lerp(-1.2, -4.5, eio(k)), -8);
    car.rotation.set(0, Math.PI / 2, 0.1);
    rays.forEach((r, i) => r.material.opacity = 0.12);
    cp = V(13, -4, 2);
    ct = V(6, -3.5, -8);
  }
  if (under) {
    out.fog.color.set(1727082);
    out.fog.near = 2;
    out.fog.far = 32;
    osky.set(2783882, 1722970);
    ohemi.color.set(10150143);
  } else {
    out.fog.color.set(14207160);
    out.fog.near = 80;
    out.fog.far = 520;
    osky.set(6982360, 16765088);
    ohemi.color.set(16774376);
  }
  setCam(cp, ct, t, fopt);
  draw(out);
}
function cabRender(s, lt, k, t) {
  const sc2 = s.scene;
  let lvl = 0, f = { mouth: "open", open: 0.5, eyeS: 1.2, brow: 0.4, blink: blink(t) }, ps = P(SIT, { lHip: [-1.5, 0, 0.05], rHip: [-1.5, 0, -0.05], lKn: [1.4], rKn: [1.4] }), uw = false;
  hammer.visible = false;
  phoneM.visible = false;
  shards.forEach((m) => m.visible = false);
  winL.visible = true;
  doorL.rotation.y = 0;
  hero.root.position.set(-0.42, 0.38, 0.15);
  hero.root.rotation.set(0, Math.PI, 0);
  if (sc2 === "waist") {
    lvl = lerp(0.25, 0.75, eio(k));
    ps = P(ps, { rSh: [-0.2, 0, -1.4], rEl: [-0.3] });
    doorL.rotation.y = 0.06 * Math.max(0, Math.sin(t * 6)) * sm(0.4, 0.6, k);
  } else if (sc2 === "glass") {
    lvl = 0.85;
    uw = true;
    phoneM.visible = true;
    const hit = Math.max(0, Math.sin(t * 7));
    ps = P(ps, { rSh: [-0.3, 0, -1.3 - hit * 0.3], rEl: [-1.2 + hit * 0.8] });
    hero.root.updateMatrixWorld(true);
    phoneM.position.set(-0.8 + hit * 0.05, 0.95, 0.05);
    f = { mouth: "frown", brow: 0.5, eyeS: 1.1 };
  } else if (sc2 === "hammer") {
    lvl = 0.85;
    uw = true;
    hammer.visible = true;
    const sw = sm(0.3, 0.45, k);
    hammer.position.set(lerp(-0.55, -0.84, sw), 0.98, 0.05);
    hammer.rotation.z = lerp(0.8, -0.3, sw);
    ps = P(ps, { rSh: [-0.3, 0, -1.1 - sw * 0.5], rEl: [-1.3 + sw] });
    if (k > 0.45) {
      winL.visible = false;
      shards.forEach((m, i) => {
        const e = (k - 0.45) * 2;
        m.visible = true;
        m.position.set(-0.86 + e * (0.2 + rnd(i, 4) * 0.3), 0.98 + (rnd(i, 5) - 0.5) * 0.4 - e * 0.3, (rnd(i, 6) - 0.5) * 0.9);
        m.rotation.set(e * 3 + i, i, e * 2);
        m.material.opacity = 0.8 * (1 - clamp(e));
      });
    }
    f = { mouth: k > 0.45 ? "open" : "line", open: 0.6, eyeS: 1.2 };
  } else if (sc2 === "flood") {
    lvl = lerp(0.9, 1.4, sm(0, 0.5, k));
    uw = true;
    doorL.rotation.y = 1 * sm(0.6, 0.85, k);
    f = { mouth: "line", eye: 0.7, brow: 0.1 };
    ps = P(ps, { rSh: [-0.3, 0, -1.3], rEl: [-0.2] });
  }
  waterIn.scale.y = Math.max(0.01, lvl);
  waterIn.position.y = lvl / 2;
  const wc = uw ? 1727082 : 10146024;
  winL.material.color.set(wc);
  winF.material.color.set(wc);
  winL.material.opacity = uw ? 0.85 : 0.55;
  winF.material.opacity = winL.material.opacity;
  cab.background.set(uw ? 666164 : 662052);
  chemi.color.set(uw ? 9097471 : 14217471);
  pose(hero, ps);
  face(hero, f);
  setShake(sc2 === "hammer" && k > 0.44 && k < 0.5 ? 0.02 : 0);
  const cp = sc2 === "hammer" || sc2 === "glass" ? V(0.3, 1.05, -0.8) : V(0.45, 1.05, -0.9), ct = sc2 === "hammer" || sc2 === "glass" ? V(-0.75, 0.95, 0.05) : V(-0.42, 0.85, 0.15);
  setCam(cp, ct, t, { keep: true, fov: 64 });
  draw(cab);
}
function render(s, lt, k, t) {
  if (["waist", "glass", "hammer", "flood"].includes(s.scene)) cabRender(s, lt, k, t);
  else outRender(s, lt, k, t);
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  if (s.card === "press") return card(330, `<div class="t">${L("\u0432\u043E\u0434\u0430 \u0434\u0430\u0432\u0438\u0442 \u043D\u0430 \u0441\u0442\u0435\u043A\u043B\u043E", "water pressing the window")}</div><div class="v" style="color:#ff4b5c">${EN ? "350 <small>lb</small>" : "~160 <small>\u043A\u0433</small>"}</div><div class="n">${L("\u0443\u0436\u0435 \u043D\u0430 \u0433\u043B\u0443\u0431\u0438\u043D\u0435 ~60 \u0441\u043C", "at just ~2 ft deep")}</div>`, a);
  if (s.card === "hammer") return card(330, `<div class="t">${L("\u0447\u0442\u043E \u0440\u0430\u0437\u0431\u0438\u043B\u043E \u0441\u0442\u0435\u043A\u043B\u043E", "what broke the glass")}</div><div class="v" style="font-size:60px">${L("\u043C\u043E\u043B\u043E\u0442\u043E\u043A \u2713", "hammer \u2713")}</div><div class="n">${L("\u043A\u043B\u044E\u0447\u0438, \u0442\u0435\u043B\u0435\u0444\u043E\u043D, \u0431\u043E\u0442\u0438\u043D\u043E\u043A \u2014 \u043D\u0435\u0442", "keys, phone, boot \u2014 no")}</div>`, a);
  return "";
}
start({ render, cards: cards2, mins: { bridge: 5, surface: 6, end: 3.5 }, bubbles: ["#0a3a4a", "#3a8ab0", "#ffd23f"] });
