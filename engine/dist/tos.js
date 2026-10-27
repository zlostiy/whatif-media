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
function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], sc2 = null, th = 0.018) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (sc2) m.scale.set(...sc2);
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
composer.addPass(gtao);
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
function makeTree(s = 1) {
  const g = new THREE.Group();
  add(g, Cyl(0.12 * s, 0.16 * s, 1.4 * s, 8), T(9067066), [0, 0.7 * s, 0], [0, 0, 0], null, 0.015);
  add(g, new THREE.IcosahedronGeometry(0.85 * s, 0), T(6079594), [0, 1.9 * s, 0], [0, 0, 0], null, 0.025);
  add(g, new THREE.IcosahedronGeometry(0.6 * s, 0), T(4894298), [0.35 * s, 1.5 * s, 0.2 * s], [0, 0, 0], null, 0.02);
  return g;
}
var ZONES = { street: V(0, 0, 0), farm: V(260, 0, 0), beach: V(-260, 0, 0), river: V(0, 0, 260), plaza: V(0, 0, -260), volcano: V(520, 0, 0), airport: V(0, 0, -560) };

// topics/tos/scene.js
var blink = (t) => t % 3.1 < 0.1;
var sc = new THREE.Scene();
var sky = makeSky(8042734, 16773848, 1400);
sc.add(sky);
sc.fog = new THREE.Fog(15787212, 120, 900);
var hemi = new THREE.HemisphereLight(16774888, 6978122, 1.6);
sc.add(hemi);
var sun = new THREE.DirectionalLight(16773328, 2);
sun.position.set(-60, 80, -40);
sc.add(sun);
add(sc, new THREE.PlaneGeometry(4e3, 4e3), T(9420634), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
var sunDisk = add(sc, new THREE.CircleGeometry(40, 40), B(16773824, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0);
add(sc, new THREE.PlaneGeometry(40, 30), T(12104872), [0, 0.02, -2], [-Math.PI / 2, 0, 0], null, 0);
var garage = G(sc, [0, 0, -14]);
add(garage, Box(14, 7, 10), T(14207144), [0, 3.5, 0], [0, 0, 0], null, 0.05);
add(garage, Box(15, 0.6, 11), T(9062970), [0, 7.3, 0], [0, 0, 0], null, 0.05);
add(garage, Box(6, 5.2, 0.1), B(2761760), [0, 2.6, 5.02], [0, 0, 0], null, 0);
var FZ = 12;
var fence = G(sc, [0, 0, FZ]);
var planks = [];
var wood = T(11565640);
var wood2 = T(10119738);
for (let x = -18; x <= 18; x += 3) if (Math.abs(x) > 2.6) add(fence, Box(0.25, 2.2, 0.25), wood2, [x, 1.1, -0.2], [0, 0, 0], null, 0.02);
for (const sx of [-1, 1]) for (const y of [0.6, 1.6]) add(fence, Box(15.1, 0.18, 0.12), wood2, [sx * 10.55, y, -0.12], [0, 0, 0], null, 0.01);
for (let i = 0; i < 120; i++) {
  const x = -17.85 + i * 0.3;
  const m = add(fence, Box(0.26, 2, 0.06), i % 2 ? wood : wood2, [x, 1, 0], [0, 0, 0], null, 0.01);
  m.userData.x0 = x;
  planks.push(m);
}
var signTex = canvasTex(512, 160, (c, w, h) => {
  c.fillStyle = "#f3f5fa";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#1a1033";
  c.lineWidth = 14;
  c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = "#c0283a";
  c.font = "900 64px R, RL, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(EN ? "GENERAL'S" : "\u0417\u0410\u0411\u041E\u0420", w / 2, h * 0.33);
  c.fillText(EN ? "FENCE" : "\u0413\u0415\u041D\u0415\u0420\u0410\u041B\u0410", w / 2, h * 0.7);
});
var sign = add(fence, Box(2.6, 0.82, 0.06), new THREE.MeshBasicMaterial({ map: signTex }), [-6.2, 1.25, 0.1], [0, 0, 0], null, 0.015);
var RX = (z) => z < 90 ? 0 : z < 240 ? Math.sin((z - 90) / 150 * Math.PI) * 22 : 0;
{
  const pts = [];
  for (let z = 0; z <= 520; z += 4) pts.push(V(RX(z), 0, z));
  const shape = [];
  const g = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = b.clone().sub(a).normalize();
    const n = V(d.z, 0, -d.x).multiplyScalar(4.5);
    const y = 0.03;
    pos.push(a.x - n.x, y, a.z - n.z, a.x + n.x, y, a.z + n.z, b.x + n.x, y, b.z + n.z, a.x - n.x, y, a.z - n.z, b.x + n.x, y, b.z + n.z, b.x - n.x, y, b.z - n.z);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  add(sc, g, T(13148272, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], null, 0);
}
for (let i = 0; i < 70; i++) {
  const z = 30 + i * 6.5;
  const side = i % 2 ? 1 : -1;
  const x = RX(z) + side * (20 + rnd(i, 1) * 30);
  const tr = makeTree(2.2 + rnd(i, 2) * 1.4);
  tr.position.set(x, 0, z);
  tr.rotation.y = rnd(i, 3) * 6;
  sc.add(tr);
}
for (let i = 0; i < 26; i++) {
  const a = rnd(i, 5) * 6.28, r = 60 + rnd(i, 6) * 60;
  const tr = makeTree(2.4 + rnd(i, 7));
  tr.position.set(Math.cos(a) * r, 0, -30 + Math.sin(a) * r * 0.4 - 40);
  sc.add(tr);
}
var RZ = 500;
var HILL = V(0, 0, 760);
var rangeTex = canvasTex(512, 200, (c, w, h) => {
  c.fillStyle = "#ffd23f";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#1a1033";
  c.lineWidth = 16;
  c.strokeRect(8, 8, w - 16, h - 16);
  c.fillStyle = "#1a1033";
  c.font = "900 96px R, RL, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(EN ? "RANGE" : "\u041F\u041E\u041B\u0418\u0413\u041E\u041D", w / 2, h / 2 + 4);
});
var rsign = G(sc, [-9, 0, RZ + 6]);
add(rsign, Box(0.25, 3.4, 0.25), wood2, [-1.6, 1.7, 0], [0, 0, 0], null, 0.02);
add(rsign, Box(0.25, 3.4, 0.25), wood2, [1.6, 1.7, 0], [0, 0, 0], null, 0.02);
add(rsign, Box(4.2, 1.64, 0.12), new THREE.MeshBasicMaterial({ map: rangeTex }), [0, 2.8, 0.14], [0, 0.3, 0], null, 0.02);
rsign.rotation.y = 0.5;
{
  const g = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  add(sc, g, T(10137696), [HILL.x, 0, HILL.z], [0, 0, 0], [70, 26, 50], 4e-3);
}
add(sc, Box(8, 4, 1), T(9075306), [HILL.x, 26, HILL.z - 4], [0, 0.3, 0], null, 0.15);
var KH = T(7043646);
var KH2 = T(5661487);
var DK = T(2830122);
var MET = T(3816760);
function makeTOS() {
  const g = new THREE.Group();
  const o = { g };
  add(g, Box(3.3, 0.9, 6.6), KH, [0, 1.05, 0], [0, 0, 0], null, 0.04);
  add(g, Box(3.3, 0.9, 1.1), KH, [0, 0.92, 3.55], [-0.6, 0, 0], null, 0.04);
  add(g, Box(3.4, 0.12, 6.9), KH2, [0, 1.52, 0], [0, 0, 0], null, 0.03);
  for (const s of [-1, 1]) {
    add(g, Box(0.62, 0.8, 6.9), DK, [s * 1.58, 0.5, 0], [0, 0, 0], null, 0.03);
    add(g, Box(0.78, 0.07, 7.2), KH2, [s * 1.62, 0.96, 0], [0, 0, 0], null, 0.02);
    for (let i = 0; i < 6; i++) add(g, Cyl(0.34, 0.34, 0.2, 14), MET, [s * 1.92, 0.42, -2.6 + i * 1.04], [0, 0, Math.PI / 2], null, 0.015);
    add(g, Cyl(0.3, 0.3, 0.2, 12), MET, [s * 1.92, 0.62, 3.3], [0, 0, Math.PI / 2], null, 0.015);
    add(g, Cyl(0.3, 0.3, 0.2, 12), MET, [s * 1.92, 0.62, -3.3], [0, 0, Math.PI / 2], null, 0.015);
  }
  o.hatch = V(0, 1.58, 2.55);
  add(g, new THREE.TorusGeometry(0.42, 0.07, 8, 20), DK, [o.hatch.x, o.hatch.y, o.hatch.z], [Math.PI / 2, 0, 0], null, 0.01);
  add(g, Cyl(0.44, 0.44, 0.06, 18), KH2, [o.hatch.x, 1.7, 2], [-1.25, 0, 0], null, 0.01);
  add(g, Cyl(1.2, 1.3, 0.3, 20), KH2, [0, 1.73, -1.4], [0, 0, 0], null, 0.03);
  const piv = G(g, [0, 2.55, -2.6]);
  o.piv = piv;
  add(piv, Box(0.5, 0.9, 0.7), KH2, [-1.3, -0.35, 0.2], [0, 0, 0], null, 0.02);
  add(piv, Box(0.5, 0.9, 0.7), KH2, [1.3, -0.35, 0.2], [0, 0, 0], null, 0.02);
  const blk = G(piv, [0, 0, 0]);
  o.blk = blk;
  const BL = 3.9;
  o.BL = BL;
  add(blk, Box(2.5, 1.45, BL), KH, [0, 0, BL / 2], [0, 0, 0], null, 0.035);
  o.mouths = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
    const x = -1.05 + c * 0.3, y = -0.45 + r * 0.45;
    add(blk, new THREE.CircleGeometry(0.12, 12), B(1315860), [x, y, BL + 0.012], [0, 0, 0], null, 0);
    add(blk, new THREE.RingGeometry(0.12, 0.15, 12), B(2830122), [x, y, BL + 0.014], [0, 0, 0], null, 0);
    o.mouths.push(V(x, y, BL + 0.2));
  }
  for (let i = 0; i < 4; i++) add(blk, Box(2.56, 0.06, 0.08), KH2, [0, 0.74, 0.6 + i * 0.9], [0, 0, 0], null, 0.01);
  return o;
}
var tos = makeTOS();
sc.add(tos.g);
var hero = makeHuman({ top: 6254138, pants: 6254138, hair: 3811866, hairStyle: "bald", skin: 16762528, stubble: true });
{
  const h = hero.head;
  const cap = T(3811872);
  add(h, new THREE.SphereGeometry(0.266, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.36), cap, [0, 0.25, -0.02], [-0.25, 0, 0], null, 0.014);
  for (let k = 0; k < 3; k++) add(h, Cap(0.035, 0.22, 8), cap, [-0.08 + k * 0.08, 0.45, 0], [Math.PI / 2, 0, 0], null, 6e-3);
  for (const s of [-1, 1]) add(h, Cyl(0.08, 0.08, 0.07, 14), cap, [s * 0.26, 0.2, 0], [0, 0, Math.PI / 2], null, 0.01);
}
sc.add(hero.root);
function heroInHatch(t, f = {}, ps = {}) {
  tos.g.updateMatrixWorld(true);
  const p = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld);
  hero.root.position.copy(p).add(V(0, 0.02, 0));
  hero.root.rotation.set(0, tos.g.rotation.y, 0);
  pose(hero, P(STAND, { lSh: [-0.5, 0, 0.9], rSh: [-0.5, 0, -0.9], lEl: [-1.2], rEl: [-1.2] }, ps));
  face(hero, Object.assign({ mouth: "smile", blink: blink(t) }, f));
}
var smokeMat = T(5920096, { transparent: true, opacity: 0, depthWrite: false });
var smokes = [];
for (let i = 0; i < 9; i++) {
  const m = add(sc, new THREE.IcosahedronGeometry(1, 1), smokeMat.clone(), [0, -50, 0], [rnd(i, 1), rnd(i, 2), 0], null, 0);
  smokes.push(m);
}
function smokeCol(a, t) {
  smokes.forEach((m, i) => {
    const ph = (rnd(i, 3) + t * 0.03) % 1;
    m.position.set(HILL.x + (rnd(i, 4) - 0.5) * 30, 26 + ph * 70 + i * 2, HILL.z + (rnd(i, 5) - 0.5) * 20);
    m.scale.setScalar(10 + ph * 18);
    m.material.opacity = a * 0.55 * Math.sin(ph * Math.PI);
    m.visible = a > 0;
  });
}
var ROCK = [];
var trailMat = T(15262428, { transparent: true, opacity: 0.85, depthWrite: false });
var flameMat = B(16752688, { transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
for (let i = 0; i < 24; i++) {
  const body = add(sc, Cyl(0.11, 0.11, 1.6, 10), MET, [0, -50, 0], [0, 0, 0], null, 0.01);
  const fl = add(body, new THREE.ConeGeometry(0.22, 1.6, 10), flameMat, [0, -1.5, 0], [Math.PI, 0, 0], null, 0);
  ROCK.push({ body, fl, trail: null, curve: null, t0: 0, imp: V(0, 0, 0) });
}
var fireMat = () => B(16756800, { transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
var balls = ROCK.map(() => add(sc, Sph(1, 24, 16), fireMat(), [0, -50, 0], [0, 0, 0], null, 0));
var bigSun = add(sc, Sph(1, 32, 20), B(16765024, { transparent: true, opacity: 0, depthWrite: false }), [HILL.x, 30, HILL.z], [0, 0, 0], null, 0);
var bigSun2 = add(sc, Sph(1, 32, 20), B(16742944, { transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), [HILL.x, 30, HILL.z], [0, 0, 0], null, 0);
var FLY = 2.6;
var SALVO0 = 1.5;
function prepSalvo() {
  tos.g.updateMatrixWorld(true);
  ROCK.forEach((r, i) => {
    const pair = Math.floor(i / 2);
    r.t0 = SALVO0 + pair * 0.5;
    const m0 = tos.mouths[i].clone().applyMatrix4(tos.blk.matrixWorld);
    const dir = V(0, 0, 1).transformDirection(tos.blk.matrixWorld);
    const imp = V(HILL.x + (rnd(i, 11) - 0.5) * 60, 18 + rnd(i, 12) * 8, HILL.z - 30 + (rnd(i, 13) - 0.5) * 34);
    r.imp = imp;
    r.curve = new THREE.QuadraticBezierCurve3(m0, m0.clone().add(dir.multiplyScalar(170)), imp);
    if (r.trail) sc.remove(r.trail);
    r.trail = new THREE.Mesh(new THREE.TubeGeometry(r.curve, 80, 0.5, 6, false), trailMat.clone());
    r.trail.frustumCulled = false;
    sc.add(r.trail);
  });
}
function salvo(lt) {
  let flash = 0, n = 0;
  ROCK.forEach((r, i) => {
    const a = (lt - r.t0) / FLY;
    const idx = r.trail.geometry.index.count / 80;
    if (a <= 0) {
      r.body.visible = false;
      r.trail.visible = false;
      balls[i].material.opacity = 0;
      return;
    }
    const u = clamp(a), head = Math.floor(u * 80), tail = Math.max(0, head - 22);
    r.trail.visible = true;
    r.trail.geometry.setDrawRange(tail * idx, Math.max(0, head - tail) * idx);
    r.trail.material.opacity = 0.85 * (1 - sm(1, 2.4, a));
    if (a < 1) {
      r.body.visible = true;
      const p = r.curve.getPoint(u), tg = r.curve.getTangent(u);
      r.body.position.copy(p);
      r.body.quaternion.setFromUnitVectors(V(0, 1, 0), tg);
      r.fl.scale.y = 0.8 + 0.2 * Math.sin(lt * 40 + i);
    } else r.body.visible = false;
    const b = balls[i];
    if (a >= 1) {
      const e2 = a - 1;
      b.position.copy(r.imp);
      b.scale.setScalar(2 + 9 * eob(clamp(e2 * 2.2)));
      b.material.opacity = 0.9 * (1 - sm(0.2, 1.4, e2));
      if (e2 < 0.25) flash = Math.max(flash, 0.18 * (1 - e2 / 0.25));
      n++;
    } else b.material.opacity = 0;
  });
  const last = SALVO0 + 11 * 0.5 + FLY;
  const e = lt - last + 0.6;
  bigSun.scale.setScalar(2 + 38 * eio(clamp(e / 1.6)));
  bigSun.material.opacity = e > 0 ? 0.95 * (1 - sm(3.5, 7, e)) : 0;
  bigSun2.scale.setScalar(3 + 50 * eio(clamp(e / 1.8)));
  bigSun2.material.opacity = e > 0 ? 0.55 * (1 - sm(3, 6, e)) : 0;
  return { flash, n, e };
}
function hideSalvo() {
  ROCK.forEach((r, i) => {
    r.body.visible = false;
    if (r.trail) r.trail.visible = false;
    balls[i].material.opacity = 0;
  });
  bigSun.material.opacity = bigSun2.material.opacity = 0;
}
var cab = new THREE.Scene();
cab.background = new THREE.Color(1710612);
cab.add(new THREE.HemisphereLight(16773336, 4210730, 1.5));
{
  const d = new THREE.PointLight(16773312, 1.6, 5, 1.2);
  d.position.set(-0.4, 1.55, -0.9);
  cab.add(d);
  const d2 = new THREE.DirectionalLight(16774368, 0.9);
  d2.position.set(1, 3, 2);
  d2.userData.noShadow = true;
  cab.add(d2);
}
add(cab, Box(2, 1.62, 2.3), T(7043646, { side: THREE.BackSide }), [0, 0.81, 0.1], [0, 0, 0], null, 0);
for (let i = 0; i < 5; i++) add(cab, Box(0.06, 1.6, 0.06), T(4871464), [-0.97, 0.8, -0.9 + i * 0.45], [0, 0, 0], null, 6e-3);
add(cab, Box(0.7, 0.12, 0.7), T(3811872), [0, 0.3, -0.35], [0, 0, 0], null, 0.012);
add(cab, Box(0.7, 0.8, 0.12), T(3811872), [0, 0.7, -0.72], [0, 0, 0], null, 0.012);
var panel = G(cab, [0, 0, 0.42]);
add(panel, Box(1.5, 0.82, 0.3), T(4870706), [0, 0.41, 0], [0, 0, 0], null, 0.015);
add(panel, Box(1.5, 0.06, 0.42), T(3817512), [0, 0.84, -0.02], [-0.35, 0, 0], null, 0.012);
var gaugeTex = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = "#f0ead8";
  c.beginPath();
  c.arc(64, 64, 60, 0, 6.29);
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = "#1a1033";
  c.stroke();
  c.lineWidth = 6;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.8 + i / 8 * Math.PI * 1.4;
    c.beginPath();
    c.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
    c.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54);
    c.stroke();
  }
});
var needles = [];
for (const x of [-0.5, -0.25, 0.25, 0.5]) {
  const gg = G(panel, [x, 0.62, -0.155]);
  add(gg, new THREE.CircleGeometry(0.09, 20), new THREE.MeshBasicMaterial({ map: gaugeTex }), [0, 0, 0], [0, Math.PI, 0], null, 0);
  const nd = add(gg, Box(0.012, 0.07, 4e-3), B(12593210), [0, 0.03, -5e-3], [0, 0, 0], null, 0);
  nd.geometry.translate(0, 0.03, 0);
  needles.push(nd);
}
var BTN = V(0.05, 0.86, 0.36);
var btnG = G(cab, BTN.toArray());
add(btnG, Cyl(0.11, 0.12, 0.05, 20), T(1710618), [0, 0, 0], [-0.35, 0, 0], null, 8e-3);
var btn = add(btnG, Cyl(0.075, 0.085, 0.06, 20), T(16722490, { emissive: 11141136, emissiveIntensity: 0.4 }), [0, 0.04, -0.012], [-0.35, 0, 0], null, 8e-3);
add(btnG, Box(0.34, 0.01, 0.08), B(16765503), [0, 0.02, 0.14], [-0.35, 0, 0], null, 0);
var levers = [];
for (const x of [-0.32, 0.32]) {
  const lg = G(cab, [x, 0.3, 0.05]);
  add(lg, Cyl(0.03, 0.03, 0.55, 8), MET, [0, 0.27, 0], [0, 0, 0], null, 6e-3);
  add(lg, Cap(0.05, 0.08, 8), T(1710618), [0, 0.58, 0], [0, 0, 0], null, 6e-3);
  levers.push(lg);
}
var radio = G(cab, [0.78, 1.1, 0.2]);
add(radio, Box(0.3, 0.22, 0.2), T(3816760), [0, 0, 0], [0, 0, 0], null, 0.01);
add(radio, Box(0.02, 0.26, 0.02), MET, [0.1, 0.24, 0], [0, 0, 0], null, 4e-3);
var cabHero = makeHuman({ top: 6254138, pants: 6254138, hair: 3811866, hairStyle: "bald", skin: 16762528, stubble: true });
{
  const h = cabHero.head;
  const cap = T(3811872);
  add(h, new THREE.SphereGeometry(0.266, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.36), cap, [0, 0.25, -0.02], [-0.25, 0, 0], null, 0.014);
  for (const s of [-1, 1]) add(h, Cyl(0.08, 0.08, 0.07, 14), cap, [s * 0.26, 0.2, 0], [0, 0, Math.PI / 2], null, 0.01);
}
cab.add(cabHero.root);
function placeTOS(x, z, ry = 0, pitch = 0, roll = 0) {
  tos.g.position.set(x, 0, z);
  tos.g.rotation.set(pitch, ry, roll, "YXZ");
}
var salvoReady = false;
function world(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct, todK = "day", fopt = { land: 1.15 };
  tos.piv.rotation.x = 0;
  hideSalvo();
  smokeCol(0, t);
  planks.forEach((pl) => {
    pl.position.set(pl.userData.x0, 1, 0);
    pl.rotation.set(0, 0, 0);
    pl.visible = true;
  });
  if (sc2 === "inside") {
    placeTOS(0, -2);
    heroInHatch(t, { mouth: "open", open: 0.5, eyeS: 1.1 });
    const a = 0.9 - k * 0.7;
    ct = V(0, 1.8, -1);
    cp = ct.clone().add(V(Math.sin(a) * 13, 4.5 + k * 1.5, Math.cos(a) * 13));
  } else if (sc2 === "fence") {
    const d = clamp((lt - s.dur * 0.25) / (s.dur * 0.6));
    const z = -2 + eio(d) * 16;
    placeTOS(0, z, 0, -Math.sin(d * 40) * 0.01 * (d > 0 && d < 1 ? 1 : 0));
    setShake(d > 0 && d < 1 ? 0.03 : 0);
    const front = z + 4;
    planks.forEach((pl, i) => {
      const x = pl.userData.x0;
      if (Math.abs(x) > 2.5) return;
      const hit = clamp((front - FZ) / 1.2);
      if (hit <= 0) return;
      const side = Math.sign(x || 0.1);
      const e = eio(hit);
      pl.rotation.set(-e * (Math.PI / 2 - 0.04), 0, side * e * 0.4);
      pl.position.set(x + side * e * (3.2 - Math.abs(x)), lerp(1, 0.07, e), e * 1.2);
    });
    heroInHatch(t, d > 0.55 ? { mouth: "open", open: 1, eyeS: 1.25, brow: 0.4 } : { mouth: "smile", blink: blink(t) }, d > 0.55 ? { lSh: [-2.6, 0, 0.6], rSh: [-2.6, 0, -0.6], lEl: [-0.4], rEl: [-0.4] } : {});
    ct = V(0, 1.6, FZ - 1);
    cp = V(11, 3.8, FZ + 9);
    fopt.land = 1.25;
  } else if (sc2 === "road") {
    const z = 60 + lt * 14;
    const x = RX(z), dx = (RX(z + 1) - RX(z - 1)) / 2;
    const ry = Math.atan2(dx, 1);
    const wob = Math.sin(lt * 3.2) * 0.22 * sm(0.35, 0.55, k) * (1 - sm(0.85, 1, k));
    placeTOS(x + wob * 3, z, ry + wob, 0, -wob * 0.12);
    heroInHatch(t, k > 0.5 ? { mouth: "open", open: 0.9, eyeS: 1.2, brow: 0.5 } : { mouth: "smile", blink: blink(t) }, k > 0.5 ? { lSh: [-1.2, 0, 0.3], rSh: [-1.2, 0, -0.3], lEl: [-1.4], rEl: [-1.4] } : {});
    const fw = V(Math.sin(ry), 0, Math.cos(ry));
    ct = tos.g.position.clone().add(V(0, 1.6, 0)).add(fw.clone().multiplyScalar(3));
    cp = tos.g.position.clone().add(fw.clone().multiplyScalar(-12)).add(V(7, 5.5, 0));
  } else if (sc2 === "range") {
    todK = "late";
    const z = RZ - 20 + eio(clamp(k * 1.4)) * 20;
    placeTOS(0, z);
    heroInHatch(t, { mouth: "smile", look: [0, 0.2], blink: blink(t) }, { head: [-0.1, 0, 0] });
    ct = V(-1, 2.2, z + 40);
    cp = V(2.5 - k * 1.5, 4.8, z - 13);
  } else if (sc2 === "wait") {
    todK = "gold";
    placeTOS(0, RZ);
    tos.piv.rotation.x = -0.42 * eio(clamp(k * 1.3));
    const sneeze = sm(0.5, 0.8, k) * (1 - sm(0.9, 1, k));
    heroInHatch(t, { mouth: sneeze > 0.3 ? "open" : "line", open: 0.3 + sneeze * 0.5, eye: 1 - sneeze * 0.8, brow: -0.4 * sneeze, look: [0, -0.5] }, { head: [-0.3 * sneeze, 0, 0], spine: [-0.1 * sneeze] });
    tos.g.updateMatrixWorld(true);
    const hp = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld);
    ct = hp.clone().add(V(0, 0.95, 0));
    cp = hp.clone().add(V(1.5 - k * 0.3, 1.4, 2.6 - k * 0.5));
    fopt.land = 1.5;
  } else if (sc2 === "salvo") {
    todK = "sunset";
    placeTOS(0, RZ);
    tos.piv.rotation.x = -0.42;
    if (!salvoReady) {
      prepSalvo();
      salvoReady = true;
    }
    heroInHatch(t, { mouth: "open", open: 0.6, eyeS: 1.1, look: [0, 0.6] }, {});
    hero.root.visible = false;
    const r = salvo(lt);
    setShake(lt > SALVO0 && lt < SALVO0 + 6.2 ? 0.04 : 0);
    const u = eio(clamp(lt / s.dur));
    cp = V(lerp(7, 60, u), lerp(3.5, 70, u), RZ + lerp(-9, -120, u));
    ct = V(0, lerp(4, 25, u), lerp(RZ + 20, HILL.z - 60, u));
    fopt.land = 1;
    fopt.fov = lerp(48, 40, u);
    s._fl = r.flash;
  } else if (sc2 === "fired") {
    todK = "dusk";
    if (k < 0.5) {
      placeTOS(0, RZ);
      tos.piv.rotation.x = -0.42;
      smokeCol(1, t);
      heroInHatch(t, { mouth: "open", open: 0.8, eyeS: 1.3, pupil: 0.6, brow: 0.2 }, { lSh: [0, 0, 0.3], rSh: [0, 0, -0.3], lEl: [-0.2], rEl: [-0.2] });
      tos.g.updateMatrixWorld(true);
      const hp = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld);
      ct = hp.clone().add(V(0, 0.85, 0));
      cp = hp.clone().add(V(-1.4, 1.3, 2.8));
      fopt.land = 1.5;
    } else {
      todK = "day";
      placeTOS(30, -40);
      hero.root.visible = false;
      planks.forEach((pl) => {
        const x = pl.userData.x0;
        if (Math.abs(x) > 2.5) return;
        const side = Math.sign(x || 0.1);
        pl.rotation.set(-(Math.PI / 2 - 0.04), 0, side * 0.4);
        pl.position.set(x + side * (3.2 - Math.abs(x)), 0.07, 1.2);
      });
      const u = eio(clamp((k - 0.5) * 2));
      ct = V(-5, 1.15, FZ);
      cp = V(lerp(1, -3.2, u), lerp(2.2, 1.5, u), FZ + lerp(10, 5.2, u));
      fopt.land = 1.3;
    }
  } else if (sc2 === "end") {
    todK = "dusk";
    placeTOS(0, RZ);
    tos.piv.rotation.x = -0.42;
    smokeCol(1, t);
    hero.root.visible = false;
    ct = V(1, 8, RZ + 100);
    cp = V(-3 - k * 2, 4.5 + k * 1.5, RZ - 14 - k * 4);
  }
  if (sc2 !== "salvo" && sc2 !== "end" && !(sc2 === "fired" && k >= 0.5)) hero.root.visible = true;
  setTOD(todK);
  setCam(cp, ct, t, fopt);
  draw(sc);
}
var TOD = {
  day: [8042734, 16773848, 15787212, 2, 1.6, V(-60, 80, -40)],
  late: [8038624, 16770752, 15785152, 1.8, 1.4, V(-60, 40, 120)],
  gold: [9079504, 16763024, 1578e4, 1.6, 1.3, V(-60, 22, 300)],
  sunset: [5917344, 16751194, 15243888, 1.3, 1.1, V(-40, 10, 400)],
  dusk: [3816064, 16742992, 11565168, 1, 0.9, V(-40, 6, 400)]
};
function setTOD(k) {
  const p = TOD[k];
  sky.set(p[0], p[1]);
  sc.fog.color.set(p[2]);
  sun.intensity = p[3] * 1.3;
  hemi.intensity = p[4] * 0.62;
  sun.position.copy(p[5]);
  sunDisk.position.copy(p[5].clone().normalize().multiplyScalar(1300));
  sunDisk.lookAt(0, 0, 0);
  sunDisk.visible = k !== "day";
}
function cabin(s, lt, k, t) {
  cabHero.root.position.set(0, 0.5, -0.22);
  cabHero.root.rotation.set(0, 0, 0);
  const sc2 = s.scene;
  let cp, ct, ps = P(SIT, { lHip: [-1.9, 0, 0.2], rHip: [-1.9, 0, -0.2], lKn: [2.1], rKn: [2.1], spine: [0.08] }), f = { mouth: "smile", blink: blink(t) };
  needles.forEach((n, i) => n.rotation.z = Math.sin(t * (0.7 + i * 0.3) + i) * 0.8);
  if (sc2 === "hook") {
    const reachA = sm(0.05, 0.55, k) * (1 - sm(0.7, 0.95, k) * 0.6);
    const tgt = BTN.clone().add(V(0.02, lerp(0.42, 0.1, reachA), lerp(-0.25, -0.06, reachA)));
    pose(cabHero, ps);
    cabHero.root.updateMatrixWorld(true);
    reach(cabHero, "r", tgt);
    face(cabHero, { mouth: k > 0.7 ? "frown" : "smile", eyeS: k > 0.7 ? 1.25 : 1, look: [0, -0.6], blink: blink(t) });
    cp = BTN.clone().add(V(0.42, 0.3, 0.5));
    ct = BTN.clone().add(V(-0.05, 0.07, -0.05));
    setCam(cp, ct, t, { keep: true, fov: 50 });
    draw(cab);
    return;
  }
  ps = P(ps, { lSh: [-0.9, 0, 0.5 + Math.sin(t * 3) * 0.1], rSh: [-0.9, 0, -0.5 - Math.sin(t * 3) * 0.1], lEl: [-1.3], rEl: [-1.3], head: [0.15, Math.sin(t * 1.4) * 0.3, 0] });
  f = { mouth: "line", brow: 0.35, look: [Math.sin(t * 1.4), 0.4], blink: blink(t) };
  pose(cabHero, ps);
  face(cabHero, f);
  levers.forEach((l, i) => l.rotation.x = Math.sin(t * 2 + i) * 0.1);
  cp = V(0.72, 1.28, 0.98).lerp(V(0.55, 1.2, 0.9), eio(k));
  ct = V(0, 1.05, -0.3);
  setCam(cp, ct, t, { keep: true, fov: 62 });
  draw(cab);
}
var texOK = false;
function render(s, lt, k, t) {
  if (!texOK) {
    signTex.redraw();
    rangeTex.redraw();
    texOK = true;
  }
  if (s.scene === "hook" || s.scene === "cabin") cabin(s, lt, k, t);
  else world(s, lt, k, t);
}
function cards2(s, lt, k) {
  const a = sm(0.15, 0.45, lt);
  switch (s.scene) {
    case "inside":
      return card(330, `<div class="t">${L("\u043C\u0430\u0441\u0441\u0430", "weight")}</div><div class="v">${EN ? "49 <small>tons</small>" : "44,3 <small>\u0442</small>"}</div><div class="n">${L("\u0448\u0430\u0441\u0441\u0438 \u0442\u0430\u043D\u043A\u0430 \u0422-72\u0410", "T-72A tank chassis")}</div>`, a);
    case "fence":
      return card(330, `<div class="t">${L("\u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044C", "engine")}</div><div class="v">840 <small>${L("\u043B.\u0441.", "hp")}</small></div>`, a);
    case "range":
      return card(330, `<div class="t">${L("\u0434\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C", "range")}</div><div class="v">${EN ? "3.7 <small>mi</small>" : "6 <small>\u043A\u043C</small>"}</div><div class="n">${L("\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C", "maximum")}</div>`, a);
    case "wait": {
      const v = Math.max(0, Math.round(90 * (1 - eio(clamp(k * 1.05)))));
      return card(330, `<div class="t">${L("\u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u044C", "ready in")}</div><div class="v" style="color:#ff4b5c">${v} <small>${L("\u0441", "s")}</small></div><div class="bar"><div style="width:${100 - v / 0.9}%;background:#5cd06a"></div></div>`, a);
    }
    case "salvo":
      return card(330, `<div class="t">${L("\u0437\u0430\u043B\u043F", "salvo")}</div><div class="v">24 <small>${L("\u0440\u0430\u043A\u0435\u0442\u044B", "rockets")}</small></div><div class="n">${L("\u0437\u0430 6 \u0441 \xB7 217 \u043A\u0433 \u043A\u0430\u0436\u0434\u0430\u044F", "in 6 s \xB7 478 lb each")}</div>`, sm(0.15, 0.45, lt) * (1 - sm(0.55, 0.62, k)));
  }
  return "";
}
function fx(s, lt, k) {
  if (s.scene === "salvo") return { fl: s._fl || 0, flc: "#ffd8a0" };
  return {};
}
start({ render, cards: cards2, fx, mins: { salvo: 12.5, fence: 6.5, hook: 4.2 }, bubbles: ["#56632f", "#6b7a3e", "#ffd23f"] });
