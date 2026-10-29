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
    const fx2 = topic.fx ? topic.fx(s, lt, k, i) || {} : {};
    let fl = fx2.fl || 0, bk = fx2.bk || 0;
    if (i === 0) bk = Math.max(bk, 1 - sm(0, 0.5, t));
    if (i === shots.length - 1) bk = Math.max(bk, sm(s.dur - 0.5, s.dur, lt));
    $("flash").style.opacity = fl;
    $("flash").style.background = fx2.flc || "#fff";
    $("black").style.opacity = bk;
    if (OV) window.__ovSig = [full.innerHTML, cards.innerHTML, capEl.innerHTML, badge.style.cssText, s.badge, s.loc, capEl.style.cssText, (bp2 > 0 && bp2 < 1 ? bp2 : 0).toFixed(4), fl.toFixed(3), fx2.flc || "", bk.toFixed(3)].join("|");
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
function makeStreet(sc, len = 120, o = {}) {
  const g = G(sc, [o.x ?? 0, 0, o.z ?? 0]);
  add(g, Box(10, 0.06, len), T(3817296), [0, 0.03, 0], [0, 0, 0], null, 0);
  for (const s of [-1, 1]) add(g, Box(4, 0.25, len), T(6975104), [s * 7, 0.12, 0], [0, 0, 0], null, 0.015);
  for (let z = -len / 2 + 6; z < len / 2; z += 14) for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(0.6, 12), B(15262928), [s * 0.1, 0.07, z], [-Math.PI / 2, 0, 0], [0.25, 3, 1], 0);
  const lamps = [];
  const lampM = B(16770728);
  for (let z = -len / 2 + 8; z < len / 2; z += 18) for (const s of [-1, 1]) {
    const lp = G(g, [s * 5.6, 0, z + (s > 0 ? 9 : 0)]);
    add(lp, Cyl(0.1, 0.14, 5, 8), T(2830149), [0, 2.5, 0], [0, 0, 0], null, 0.01);
    add(lp, Box(1.2, 0.12, 0.3), T(2830149), [-s * 0.5, 5, 0], [0, 0, 0], null, 0.01);
    lamps.push(add(lp, Sph(0.22, 10, 8), lampM, [-s * 0.95, 4.85, 0], [0, 0, 0], null, 0));
  }
  const cams = [];
  for (let z = -len / 2 + 20; z < len / 2; z += 30) {
    const cp = G(g, [-5.2, 0, z]);
    add(cp, Cyl(0.12, 0.12, 4.2, 8), T(2830149), [0, 2.1, 0], [0, 0, 0], null, 0.01);
    const head = G(cp, [0, 4.2, 0]);
    add(head, Box(0.35, 0.3, 0.7), T(15263984), [0, 0, 0.2], [0, 0, 0], null, 0.01);
    add(head, Cyl(0.1, 0.1, 0.1, 10), B(1708083), [0, 0, 0.58], [Math.PI / 2, 0, 0], null, 0);
    add(head, Sph(0.06, 8, 6), B(16724032), [0.12, 0.12, 0.5], [0, 0, 0], null, 0);
    cams.push(head);
  }
  g.userData = { lamps, cams, lampM };
  return g;
}
var HERO = { top: 3095122, pants: 2303546, hair: 3810840, skin: 15778464, stubble: true };
function makeHero(o = {}) {
  return makeHuman(Object.assign({}, HERO, o));
}
function addHood(J, color = 3095122) {
  const m = T(color);
  add(J.head, new THREE.SphereGeometry(0.3, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), m, [0, 0.21, -0.03], [-0.25, 0, 0], null, 0.014);
  add(J.head, Cap(0.13, 0.12, 10), T(6957610), [0, 0.03, 0.13], [Math.PI / 2, 0, 0], [1.5, 1, 0.55], 8e-3);
}
function makeVera() {
  const J = makeHuman({ top: 15988218, pants: 3820138, hair: 6961698, hairStyle: "long", skin: 16175026, robe: true });
  return J;
}
function makeWoman(i) {
  return makeHuman({ top: [9063018, 4876938, 6982218, 10510400][i % 4], pants: 2830149, hair: [2759184, 14200944, 6961698, 1118481][i % 4], hairStyle: "long", skin: [16762528, 14721136, 13011546, 16765616][i % 4], dress: i % 2 === 0 });
}
function makeRoom(w, h, d, wall = 3817560, floor = 4864560) {
  const g = new THREE.Group();
  add(g, Box(w, h, d), T(wall, { side: THREE.BackSide }), [0, h / 2, 0], [0, 0, 0], null, 0);
  add(g, new THREE.PlaneGeometry(w - 0.02, d - 0.02), T(floor), [0, 0.01, 0], [-Math.PI / 2, 0, 0], null, 0);
  return g;
}
function clockTex() {
  return canvasTex(256, 256, (c, w, h, hh = 3, mm = 33) => {
    c.fillStyle = "#f4efe2";
    c.beginPath();
    c.arc(128, 128, 120, 0, 6.29);
    c.fill();
    c.lineWidth = 12;
    c.strokeStyle = "#1a1033";
    c.stroke();
    c.fillStyle = "#1a1033";
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283;
      c.fillRect(128 + Math.sin(a) * 95 - 4, 128 - Math.cos(a) * 95 - 10, 8, 20);
    }
    const ha = (hh % 12 + mm / 60) / 12 * 6.283, ma = mm / 60 * 6.283;
    c.lineCap = "round";
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(128, 128);
    c.lineTo(128 + Math.sin(ha) * 55, 128 - Math.cos(ha) * 55);
    c.stroke();
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(128, 128);
    c.lineTo(128 + Math.sin(ma) * 88, 128 - Math.cos(ma) * 88);
    c.stroke();
    c.fillStyle = "#c0283a";
    c.beginPath();
    c.arc(128, 128, 10, 0, 6.29);
    c.fill();
  });
}

// topics/_lastman.js
var blink = (t) => t % 3.4 < 0.1;
var city = new THREE.Scene();
var csky = makeSky(659504, 2306138, 1400);
city.add(csky);
city.fog = new THREE.Fog(1712704, 60, 420);
var chemi = new THREE.HemisphereLight(8425664, 2105392, 0.9);
city.add(chemi);
var cmoon = new THREE.DirectionalLight(11583743, 0.9);
cmoon.position.set(-40, 70, 30);
city.add(cmoon);
var cstars = starSphere(1300, 1400);
city.add(cstars);
add(city, new THREE.PlaneGeometry(3e3, 3e3), T(2764350), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
var street = makeStreet(city, 160);
var C = makeCity(city, { n: 90, r: 230, keep: 16, hmax: 55, skip: (x, z) => Math.abs(x) < 13 && Math.abs(z) < 90 });
for (let i = 0; i < 16; i++) for (const s of [-1, 1]) {
  const tw = makeTowerRow(i, s);
  city.add(tw);
}
function makeTowerRow(i, s) {
  const g = new THREE.Group();
  const h = 12 + rnd(i * 3 + (s > 0 ? 1 : 0), 7) * 22;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(9, h, 9), T([4870256, 5922944, 6974090][i % 3])));
  g.children[0].position.y = h / 2;
  g.position.set(s * 14.5, 0, -75 + i * 10);
  return g;
}
var women = [0, 1, 2, 3].map((i) => {
  const J = makeWoman(i);
  city.add(J.root);
  return J;
});
var hoodHero = makeHero({ top: 3815994 });
addHood(hoodHero, 3815994);
city.add(hoodHero.root);
var aurora = [];
for (let i = 0; i < 5; i++) {
  const g = new THREE.PlaneGeometry(500, 60, 40, 1);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: i % 2 ? 6094752 : 2807952, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.position.set(-60 + i * 30, 160 + i * 18, -260 - i * 40);
  m.rotation.x = 0.35;
  m.userData.base = g.attributes.position.array.slice();
  m.renderOrder = -5;
  city.add(m);
  aurora.push(m);
}
function auroraAnim(a, t, sc) {
  aurora.forEach((m, i) => {
    m.material.opacity = a * (0.32 - i * 0.03);
    const p = m.geometry.attributes.position, b = m.userData.base;
    for (let k = 0; k < p.count; k++) {
      const x = b[k * 3];
      p.setZ(k, Math.sin(x * 0.02 + t * 0.4 + i) * 20);
      p.setY(k, b[k * 3 + 1] + Math.sin(x * 0.013 + t * 0.3 + i * 2) * 10);
    }
    p.needsUpdate = true;
    if (sc && m.parent !== sc) sc.add(m);
  });
}
var ghost = new THREE.Group();
city.add(ghost);
ghost.visible = false;
for (let i = 0; i < 40; i++) {
  const t = C.towers[i];
  if (!t) break;
  const m = new THREE.Mesh(new THREE.BoxGeometry(8, 10 + rnd(i, 4) * 40, 8), new THREE.MeshBasicMaterial({ color: 8050943, transparent: true, opacity: 0.3, depthWrite: false }));
  m.position.copy(t.position);
  m.position.y = m.geometry.parameters.height / 2;
  ghost.add(m);
}
var ghostPeople = [];
for (let i = 0; i < 10; i++) {
  const J = makeHero({ top: [4876938, 6965818, 3824186][i % 3] });
  J.root.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.5;
    }
  });
  ghost.add(J.root);
  ghostPeople.push(J);
}
var seam = add(city, new THREE.PlaneGeometry(600, 1.2), B(12580607, { transparent: true, opacity: 0, fog: false }), [0, 60, -40], [0, 0, 0], null, 0);
var CT = { night: [659504, 2306138, 1712704, 0.9, 0.9], green: [797226, 1727048, 1456692, 1, 0.9], dawn: [6982360, 16763040, 14203048, 1.6, 1.8], grey: [5923960, 11055296, 9081508, 1.4, 1.3] };
function cityTOD(k) {
  const p = CT[k];
  csky.set(p[0], p[1]);
  city.fog.color.set(p[2]);
  chemi.intensity = p[3];
  cmoon.intensity = p[4];
  cstars.visible = false;
  cmoon.color.set(k === "dawn" ? 16769216 : 11583743);
  cmoon.position.set(k === "dawn" ? -80 : -40, k === "dawn" ? 30 : 70, k === "dawn" ? -120 : 30);
}
var apt = new THREE.Scene();
apt.background = new THREE.Color(658972);
var ahemi = new THREE.HemisphereLight(10135760, 2761776, 0.9);
apt.add(ahemi);
var awin = new THREE.DirectionalLight(12374271, 1.2);
awin.position.set(0, 4, -8);
apt.add(awin);
var alamp = new THREE.PointLight(16767136, 0, 7, 1.5);
alamp.position.set(-2, 2.4, 1);
apt.add(alamp);
var RW = 7;
var RH = 3;
var RD = 5.5;
var wallM = T(4608106);
var wallM2 = T(4081504);
add(apt, new THREE.PlaneGeometry(RW, RD), T(5916214), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
add(apt, new THREE.PlaneGeometry(RW, RD), T(3817556), [0, RH, 0], [Math.PI / 2, 0, 0], null, 0);
add(apt, new THREE.PlaneGeometry(RD, RH), wallM2, [-RW / 2, RH / 2, 0], [0, Math.PI / 2, 0], null, 0);
add(apt, new THREE.PlaneGeometry(RD, RH), wallM2, [RW / 2, RH / 2, 0], [0, -Math.PI / 2, 0], null, 0);
add(apt, new THREE.PlaneGeometry(RW, RH), wallM, [0, RH / 2, RD / 2], [0, Math.PI, 0], null, 0);
var BZ = -RD / 2;
for (const [w, h, x, y] of [[RW, 0.9, 0, 0.45], [RW, 0.4, 0, 2.8], [1.9, 1.7, -2.55, 1.75], [1.9, 1.7, 2.55, 1.75]]) add(apt, Box(w, h, 0.15), wallM, [x, y, BZ], [0, 0, 0], null, 0);
for (const [w, h, x, y] of [[3.3, 0.1, 0, 0.9], [3.3, 0.1, 0, 2.6], [0.1, 1.8, -1.6, 1.75], [0.1, 1.8, 1.6, 1.75], [0.06, 1.7, 0, 1.75]]) add(apt, Box(w, h, 0.2), T(15263984), [x, y, BZ], [0, 0, 0], null, 8e-3);
var outside = G(apt, [0, -14, -40]);
add(outside, new THREE.PlaneGeometry(400, 400), T(2764350), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
add(outside, Box(10, 0.06, 300), T(3817296), [0, 0.03, 30], [0, 0, 0], null, 0);
var owm = [0, 1, 2].map(() => T(2765648, { emissive: 16767114, emissiveIntensity: 0 }));
for (let i = 0; i < 26; i++) {
  const h = 14 + rnd(i, 3) * 40, x = (i % 2 ? 1 : -1) * (12 + rnd(i, 4) * 50), z = -20 - rnd(i, 5) * 120;
  add(outside, Box(8 + rnd(i, 6) * 6, h, 8), T([4870256, 5922944, 6974090][i % 3]), [x, h / 2, z], [0, 0, 0], null, 0.04);
  for (let f = 0; f < h / 3 - 1; f++) add(outside, Box(6, 0.9, 0.1), owm[(i + f) % 3], [x, 2 + f * 3, z + 4.1], [0, 0, 0], null, 0);
}
var asky = makeSky(659504, 2306138, 600);
apt.add(asky);
var aptWomen = [0, 1].map((i) => {
  const J = makeWoman(i + 2);
  J.root.scale.setScalar(1);
  outside.add(J.root);
  return J;
});
var drone = G(apt, [0, 1.9, BZ - 2.2]);
add(drone, Box(0.7, 0.16, 0.7), T(2830149), [0, 0, 0], [0, 0, 0], null, 0.01);
var droneEye = add(drone, Sph(0.1, 12, 10), B(16719920), [0, -0.05, 0.36], [0, 0, 0], null, 0);
var props = [];
for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
  add(drone, Cyl(0.03, 0.03, 0.12, 6), T(2830149), [x, 0.1, z], [0, 0, 0], null, 0);
  props.push(add(drone, Box(0.5, 0.015, 0.06), T(10133680), [x, 0.17, z], [0, 0, 0], null, 0));
}
var bed = G(apt, [-2.1, 0, -1.2]);
add(bed, Box(1.8, 0.45, 2.3), T(5917242), [0, 0.22, 0], [0, 0, 0], null, 0.015);
add(bed, Box(1.7, 0.2, 2.2), T(14673136), [0, 0.55, 0], [0, 0, 0], null, 0.012);
add(bed, Box(1.7, 0.12, 1.4), T(5925530), [0, 0.7, 0.35], [0, 0, 0], null, 0.01);
add(bed, Box(1.2, 0.18, 0.5), T(15988218), [0, 0.72, -0.8], [0, 0, 0], null, 0.01);
add(bed, Box(1.8, 1, 0.12), T(5917242), [0, 0.6, -1.15], [0, 0, 0], null, 0.015);
add(apt, Box(0.5, 0.5, 0.5), T(5917242), [-0.9, 0.25, -2], [0, 0, 0], null, 0.012);
var counter = G(apt, [2.6, 0, 0.6]);
add(counter, Box(1.2, 0.9, 2.6), T(9083568), [0, 0.45, 0], [0, 0, 0], null, 0.015);
add(counter, Box(1.3, 0.06, 2.7), T(15263984), [0, 0.93, 0], [0, 0, 0], null, 0.01);
add(counter, Box(0.7, 0.02, 0.8), T(10135744), [-0.05, 0.96, -0.3], [0, 0, 0], null, 0);
var sinkWater = add(counter, Box(0.66, 0.01, 0.76), T(6992096, { transparent: true, opacity: 0.75, emissive: 1723002, emissiveIntensity: 0.3 }), [-0.05, 0.975, -0.3], [0, 0, 0], null, 0);
add(counter, Cyl(0.03, 0.03, 0.4, 8), T(13225432), [0.35, 1.15, -0.3], [0, 0, 0], null, 5e-3);
add(counter, Cyl(0.025, 0.025, 0.3, 8), T(13225432), [0.22, 1.33, -0.3], [0, 0, Math.PI / 2], null, 5e-3);
var ctex = clockTex();
var clock = G(apt, [RW / 2 - 0.02, 2.05, -0.4]);
clock.rotation.y = -Math.PI / 2;
add(clock, Cyl(0.36, 0.36, 0.06, 28), T(2830149), [0, 0, 0], [Math.PI / 2, 0, 0], null, 0.01);
add(clock, new THREE.CircleGeometry(0.32, 28), new THREE.MeshBasicMaterial({ map: ctex }), [0, 0, 0.035], [0, 0, 0], null, 0);
var ptex = canvasTex(256, 480, (c, w, h, txt = 1) => {
  c.fillStyle = "#0e1426";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#c0283a";
  c.fillRect(0, 40, w, 50);
  c.fillStyle = "#fff";
  c.font = "900 30px R, RL, sans-serif";
  c.textAlign = "center";
  c.fillText(EN ? "BREAKING" : "\u0421\u0420\u041E\u0427\u041D\u041E", w / 2, 76);
  c.font = "900 30px R, RL, sans-serif";
  const lines = EN ? ["LAST NIGHT", "EVERY MAN", "ON EARTH", "DIED.", "EXCEPT ONE"] : ["\u041D\u041E\u0427\u042C\u042E", "\u0423\u041C\u0415\u0420\u041B\u0418", "\u0412\u0421\u0415 \u041C\u0423\u0416\u0427\u0418\u041D\u042B", "\u041D\u0410 \u0417\u0415\u041C\u041B\u0415.", "\u041A\u0420\u041E\u041C\u0415 \u041E\u0414\u041D\u041E\u0413\u041E"];
  lines.forEach((l, i) => {
    c.fillStyle = i === 4 ? "#ffd23f" : "#fff";
    c.fillText(l, w / 2, 160 + i * 52);
  });
});
var phone = G(apt);
add(phone, Box(0.09, 0.17, 0.012), T(1710618), [0, 0, 0], [0, 0, 0], null, 4e-3);
add(phone, new THREE.PlaneGeometry(0.08, 0.155), new THREE.MeshBasicMaterial({ map: ptex }), [0, 0, 65e-4], [0, 0, 0], null, 0);
var aptHero = makeHero();
apt.add(aptHero.root);
var aptDouble = makeHero();
apt.add(aptDouble.root);
var AT = { morning: [8030904, 13160672, 1.25, 1.2, 0], night: [659504, 2306138, 0.7, 0.5, 2.2], green: [797226, 2783834, 0.6, 0.7, 0.3], day: [9085128, 14212328, 1.2, 1.4, 0] };
function aptTOD(k) {
  const p = AT[k];
  asky.set(p[0], p[1]);
  ahemi.intensity = p[2];
  awin.intensity = p[3];
  alamp.intensity = p[4];
  awin.color.set(k === "green" ? 8060864 : 12374271);
  owm.forEach((m, i) => m.emissiveIntensity = k === "night" ? i === 1 ? 1.2 : 0.4 : 0);
}
var hosp = new THREE.Scene();
hosp.background = new THREE.Color(658972);
var hhemi = new THREE.HemisphereLight(14741759, 5267568, 1.3);
hosp.add(hhemi);
{
  const d = new THREE.DirectionalLight(16777215, 0.7);
  d.position.set(3, 5, 4);
  hosp.add(d);
}
hosp.add(makeRoom(7, 3.2, 6, 13163744, 9083560));
var hbed = G(hosp, [-1.4, 0, -1]);
add(hbed, Box(1.1, 0.55, 2.2), T(15265524), [0, 0.5, 0], [0, 0, 0], null, 0.012);
add(hbed, Box(1, 0.12, 1.6), T(8374496), [0, 0.82, 0.25], [0, 0, 0], null, 0.01);
for (const x of [-0.5, 0.5]) for (const z of [-1, 1]) add(hbed, Cyl(0.04, 0.04, 0.5, 8), T(13225432), [x, 0.22, z], [0, 0, 0], null, 5e-3);
var blinds = [];
for (let i = 0; i < 9; i++) blinds.push(add(hosp, Box(2.2, 0.14, 0.02), T(15263984), [1.5, 1.2 + i * 0.15, -2.95], [0, 0, 0], null, 4e-3));
add(hosp, Box(2.4, 1.6, 0.05), T(1714762, { emissive: 1714762, emissiveIntensity: 0.5 }), [1.5, 1.8, -2.99], [0, 0, 0], null, 0);
var table = G(hosp, [1.6, 0, 0.4]);
add(table, Box(1.2, 0.06, 0.7), T(9071178), [0, 0.78, 0], [0, 0, 0], null, 0.01);
for (const x of [-0.5, 0.5]) for (const z of [-0.28, 0.28]) add(table, Cyl(0.03, 0.03, 0.78, 6), T(6965802), [x, 0.39, z], [0, 0, 0], null, 4e-3);
var radio = G(table, [0, 0.81, 0]);
add(radio, Box(0.6, 0.34, 0.26), T(9067066), [0, 0.17, 0], [0, 0, 0], null, 0.01);
var rdial = add(radio, Box(0.3, 0.1, 0.02), T(16767114, { emissive: 16756800, emissiveIntensity: 0 }), [0.1, 0.22, 0.135], [0, 0, 0], null, 4e-3);
add(radio, Cyl(0.08, 0.08, 0.02, 16), T(3811866), [-0.17, 0.17, 0.135], [Math.PI / 2, 0, 0], null, 4e-3);
var vera = makeVera();
hosp.add(vera.root);
var hHero = makeHero();
hosp.add(hHero.root);
var lab = new THREE.Scene();
lab.background = new THREE.Color(329228);
var lhemi = new THREE.HemisphereLight(15398143, 8425632, 1.4);
lab.add(lhemi);
var ldir = new THREE.DirectionalLight(16777215, 0.6);
ldir.position.set(2, 5, 3);
lab.add(ldir);
var labRoom = makeRoom(8, 3.4, 7, 15265524, 13160668);
lab.add(labRoom);
var glassM = new THREE.MeshToonMaterial({ color: 12576511, transparent: true, opacity: 0.22, depthWrite: false, emissive: 16756832, emissiveIntensity: 0 });
var glassW = add(lab, new THREE.PlaneGeometry(7.9, 3.3), glassM, [0, 1.65, 0], [0, Math.PI / 2, 0], null, 0);
glassW.userData.noShadow = true;
for (const z of [-3.45, 3.45]) add(lab, Box(0.12, 3.4, 0.12), T(10133680), [0, 1.7, z], [0, 0, 0], null, 6e-3);
add(lab, Box(0.12, 0.12, 7), T(10133680), [0, 3.3, 0], [0, 0, 0], null, 6e-3);
var lHero = makeHero();
lab.add(lHero.root);
var lDouble = makeHero();
lab.add(lDouble.root);
var lVera = makeVera();
lab.add(lVera.root);
var lUnder1 = new THREE.PointLight(9091327, 0, 3, 1.5);
var lUnder2 = new THREE.PointLight(9091327, 0, 3, 1.5);
lab.add(lUnder1, lUnder2);
var glow = new THREE.PointLight(16760944, 0, 4, 1.4);
lab.add(glow);
var monitor = G(lab, [-2.4, 0, -3.3]);
add(monitor, Box(1.8, 1.1, 0.08), T(1710618), [0, 1.9, 0], [0, 0, 0], null, 0.01);
var mscreen = add(monitor, new THREE.PlaneGeometry(1.66, 0.96), B(10137792), [0, 1.9, 0.045], [0, 0, 0], null, 0);
add(monitor, Cyl(0.04, 0.04, 1.3, 8), T(6974074), [0, 0.7, 0], [0, 0, 0], null, 4e-3);
function placeJ(J, x, y, z, ry) {
  J.root.position.set(x, y, z);
  J.root.rotation.set(0, ry, 0);
}
function aptRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct, f = { mouth: "line", blink: blink(t) }, ps = P(STAND), tod = "morning", fopt = { keep: true, fov: 52 };
  aptDouble.root.visible = false;
  drone.visible = false;
  phone.visible = false;
  phone.scale.setScalar(1);
  aptWomen.forEach((w) => w.root.visible = false);
  aptHero.root.visible = true;
  aptHero.root.rotation.set(0, 0, 0);
  ctex.redraw(3, 33);
  if (sc2 === "wake") {
    tod = "morning";
    placeJ(aptHero, -1.3, 0.52, -1, Math.PI / 2 * 0.9);
    ps = P(SIT, { lHip: [-1.5, 0, 0.1], rHip: [-1.5, 0, -0.1], lKn: [1.5], rKn: [1.5], lSh: [-1.1, 0, 0.2], lEl: [-1.4], head: [0.35, 0, 0], spine: [0.15] });
    pose(aptHero, ps);
    phone.visible = true;
    phone.scale.setScalar(1.9);
    aptHero.root.updateMatrixWorld(true);
    const hp = V(0, 0, 0);
    aptHero.lEl.localToWorld(hp.set(0, -aptHero.L2 - 0.02, 0.06));
    phone.position.copy(hp).add(V(0, 0.1, 0));
    phone.lookAt(aptHero.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.25, 0)));
    ptex.redraw();
    f = { mouth: k > 0.6 ? "open" : "line", open: 0.5, eyeS: 1 + 0.25 * sm(0.5, 0.7, k), look: [0, -0.6], brow: 0.3 };
    const a = eio(k);
    cp = V(lerp(0.4, -0.2, a), lerp(1.4, 1.25, a), lerp(0.6, 0.1, a));
    ct = V(-1.3, 1.05, -1);
    if (k > 0.55) {
      const hp2 = phone.position.clone(), hd = aptHero.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.22, 0));
      const toHead = hd.clone().sub(hp2);
      const side = toHead.clone().cross(V(0, 1, 0)).normalize();
      cp = hp2.clone().addScaledVector(toHead, 0.7).addScaledVector(side, 0.36).add(V(0, 0.06, 0));
      ct = hp2.clone();
      fopt.fov = 44;
    }
  } else if (sc2 === "clock" || sc2 === "news") {
    tod = sc2 === "news" ? "day" : "morning";
    aptHero.root.visible = false;
    if (sc2 === "news") ctex.redraw(7, 13);
    const cpos = clock.getWorldPosition(V(0, 0, 0));
    if (sc2 === "clock" || k < 0.45) {
      cp = cpos.clone().add(V(-lerp(1.4, 0.8, eio(k)), -0.1, 0.15));
      ct = cpos.clone();
    } else {
      cp = V(1.8, 1.7, 2.2);
      ct = V(-2, 0.6, -1.4);
    }
  } else if (sc2 === "phone") {
    tod = "morning";
    placeJ(aptHero, 1.6, 0, 0.3, Math.PI / 2);
    ps = P(STAND, { rSh: [-1.2, 0, -0.2], rEl: [-0.6], head: [0.4, 0, 0], spine: [0.15] });
    pose(aptHero, ps);
    phone.visible = true;
    const drop = sm(0.45, 0.65, k);
    const p0 = V(2.45, 1.35, 0.3);
    phone.position.set(p0.x, lerp(p0.y, 0.99, drop * drop), p0.z);
    phone.rotation.set(-Math.PI / 2 * drop, 0.3, drop * 0.4);
    sinkWater.material.emissiveIntensity = 0.3 + 0.4 * sm(0.65, 0.7, k) * (1 - sm(0.7, 0.95, k));
    f = { mouth: "line", brow: -0.3, look: [0.3, -0.8] };
    cp = V(0.8, 1.8, 1.5);
    ct = V(2.3, 1.1, 0.1);
  } else if (sc2 === "street") {
    tod = "day";
    placeJ(aptHero, 0.2, 0, -1.7, Math.PI);
    ps = P(STAND, { head: [0.25, Math.sin(t * 0.5) * 0.3, 0], lSh: [0, 0, 0.2], rSh: [0, 0, -0.2] });
    pose(aptHero, ps);
    aptWomen.forEach((w, i) => {
      w.root.visible = true;
      placeJ(w, -3 + i * 6, 0, 10 + lt * (i ? -1 : 1) * 1.3, i ? Math.PI : 0);
      pose(w, walkPose(t + i, 5, 0.35));
      face(w, { mouth: "line" });
    });
    cp = V(-0.6, 1.75, 0.6);
    ct = V(0.6, 0.2, -12);
    fopt.fov = 55;
  } else if (sc2 === "drone" || sc2 === "sky" || sc2 === "tape") {
    tod = sc2 === "sky" ? "green" : "night";
    if (sc2 === "drone") {
      drone.visible = true;
      const arrive = eio(sm(0, 0.35, k));
      drone.position.set(lerp(3, 0.1, arrive), 1.9 + Math.sin(t * 2) * 0.05, BZ - lerp(6, 1.6, arrive));
      props.forEach((p, i) => p.rotation.y = t * 30 + i);
      droneEye.scale.setScalar(1 + 0.15 * Math.sin(t * 3));
      const run = sm(0.78, 0.95, k);
      placeJ(aptHero, lerp(0.1, 1.5, run), 0, lerp(-1.3, 1.6, run), lerp(Math.PI, Math.PI * 0.1, run));
      ps = run > 0 ? walkPose(t, 10, 0.7) : P(STAND, { head: [-0.1, 0, 0], lSh: [-0.2, 0, 0.5], rSh: [-0.2, 0, -0.5] });
      pose(aptHero, ps);
      f = { mouth: "open", open: 0.6 + 0.3 * sm(0.4, 0.6, k), eyeS: 1.3, brow: 0.4, pupil: 0.7 };
      cp = V(1.3, 1.6, 0.9);
      ct = V(0, 1.7, BZ - 1);
    }
    if (sc2 === "sky") {
      placeJ(aptHero, 0.2, 0, -1.7, Math.PI);
      pose(aptHero, P(STAND, { head: [-0.35, 0, 0] }));
      f = { mouth: "open", open: 0.5, eyeS: 1.2, look: [0, 1] };
      asky.set(797226, lerp(2306138, 2792042, 1));
      asky.set(666152, 3844216);
      const a = eio(k);
      cp = V(lerp(-1.4, -0.8, a), lerp(1.2, 1, a), lerp(1.2, 0.3, a));
      ct = V(0.3, 3, -12);
      fopt.fov = 58;
    }
    if (sc2 === "tape") {
      placeJ(aptHero, -2.1, 0.78, -1.25, 0);
      aptHero.root.rotation.set(-Math.PI / 2 + 0.1, 0, 0);
      aptHero.root.position.set(-2.1, 0.86, -0.5);
      pose(aptHero, P(STAND, { lSh: [0, 0, 0.2], rSh: [0, 0, -0.2] }));
      f = { mouth: "line", eye: 0.05 };
      aptDouble.root.visible = true;
      placeJ(aptDouble, 0.2, 0, -1.8, Math.PI);
      pose(aptDouble, P(STAND, { head: [-0.2, 0, 0] }));
      face(aptDouble, { mouth: "line" });
      cp = V(3.1, 2.75, 2.3);
      ct = V(-0.6, 0.8, -1.2);
      fopt.fov = 64;
    }
  }
  aptTOD(tod);
  face(aptHero, f);
  setCam(cp, ct, t, fopt);
  draw(apt);
}
function cityRender(s, lt, k, t, part) {
  const sc2 = s.scene;
  let cp, ct, tod = "night", fopt = {};
  hoodHero.root.visible = false;
  women.forEach((w) => w.root.visible = false);
  ghost.visible = false;
  seam.material.opacity = 0;
  auroraAnim(0, t);
  lightWindows(C.wm, 0.55);
  street.userData.lampM.color.set(16770728);
  if (sc2 === "disguise") {
    tod = "grey";
    lightWindows(C.wm, 0);
    const z = -20 + lt * 1.3;
    hoodHero.root.visible = true;
    placeJ(hoodHero, 3.2, 0.25, z, 0);
    pose(hoodHero, P(walkPose(t, 5, 0.35), { head: [0.25, 0, 0] }));
    face(hoodHero, { mouth: "line", look: [0, -0.4], blink: blink(t) });
    street.userData.cams.forEach((c) => {
      const wp = c.getWorldPosition(V(0, 0, 0));
      c.rotation.y = Math.atan2(3.2 - wp.x, z - wp.z) * sm(0, 0.4, k);
    });
    women.forEach((w, i) => {
      w.root.visible = true;
      placeJ(w, i % 2 ? -3 : 7.5, 0.25, z + 14 + i * 7 - lt * (i % 2 ? 0.8 : -0.6), i % 2 ? Math.PI : 0);
      pose(w, walkPose(t + i, 5, 0.3));
      face(w, { mouth: "line" });
    });
    cp = V(5.6, 2, z - 4.2);
    ct = V(2.8, 1.3, z + 2.5);
  } else if (sc2 === "radio" || sc2 === "end" && part === 1) {
    tod = "green";
    lightWindows(C.wm, 0.7);
    auroraAnim(1, t, city);
    const u = eio(clamp(lt / s.dur));
    cp = V(lerp(30, 70, u), lerp(60, 140, u), lerp(90, 160, u));
    ct = V(0, lerp(20, 60, u), -80);
    fopt.fov = 48;
  } else if (sc2 === "split") {
    tod = "night";
    ghost.visible = true;
    const a = eio(k);
    ghost.position.y = lerp(0, 24, a);
    ghostPeople.forEach((J, i) => {
      placeJ(J, (i % 2 ? -3 : 3) + i % 3, 0, -40 + i * 8 - lt, i % 2 ? Math.PI : 0);
      pose(J, walkPose(t + i, 5, 0.3));
    });
    seam.material.opacity = 0.7 * a;
    seam.position.y = 12 + 12 * a;
    cp = V(0, 42, 95);
    ct = V(0, 16, -40);
  } else if (sc2 === "dawn" || sc2 === "end" && part === 2) {
    tod = "dawn";
    const u = eio(clamp(lt / s.dur));
    lightWindows(C.wm, sc2 === "dawn" ? clamp(k * 1.6) : 1, true);
    street.userData.lampM.color.set(10130560);
    if (sc2 === "dawn") {
      cp = V(lerp(0, 60, u), lerp(9, 110, u), lerp(40, 150, u));
      ct = V(0, lerp(10, 40, u), -90);
    } else {
      cp = V(80, 120, 170);
      ct = V(0, 30, -90);
    }
    fopt.fov = 50;
  }
  cityTOD(tod);
  setCam(cp, ct, t, fopt);
  draw(city);
}
function hospRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct;
  rdial.material.emissiveIntensity = 0;
  placeJ(hHero, -1.4, 0.82, -1.2, Math.PI / 2 * 1);
  pose(hHero, P(SIT, { lHip: [-1.5, 0, 0.1], rHip: [-1.5, 0, -0.1], lKn: [1.5], rKn: [1.5], spine: [0.1], lSh: [-0.4, 0, 0.3], rSh: [-0.4, 0, -0.3], lEl: [-0.8], rEl: [-0.8] }));
  face(hHero, { mouth: "line", blink: blink(t), look: [0.6, 0] });
  hHero.root.position.set(-0.85, 0.82, -1.2);
  if (sc2 === "hospital") {
    placeJ(vera, lerp(1, 0.4, eio(k)), 0, lerp(-2.4, -0.8, eio(sm(0.4, 0.9, k))), lerp(Math.PI, -Math.PI / 2, sm(0.4, 0.7, k)));
    pose(vera, k < 0.4 ? P(STAND, { lSh: [-2.6, 0, 0.3], lEl: [-0.4] }) : P(STAND, { rSh: [-0.4, 0, -0.2] }));
    blinds.forEach((b, i) => b.rotation.x = lerp(0.1, 1.45, sm(0.05, 0.35, k)));
    face(vera, { mouth: k > 0.7 ? "open" : "line", open: 0.35, blink: blink(t + 1), look: [-0.5, 0] });
    hhemi.intensity = lerp(1.3, 0.9, sm(0.05, 0.35, k));
    cp = V(2.6, 1.9, 2.4);
    ct = V(-0.2, 1.1, -1.2);
  } else if (sc2 === "science") {
    placeJ(vera, 0.3, 0, -0.4, -Math.PI / 2);
    pose(vera, P(STAND));
    face(vera, { mouth: "line" });
    cp = V(1.2, 1.6, 1.6);
    ct = V(-0.8, 1.3, -1.2);
  } else {
    placeJ(vera, 1, 0, 1.1, Math.PI * 0.85);
    pose(vera, P(STAND, { lSh: [-0.6, 0, 0.3], lEl: [-1.2] }));
    face(vera, { mouth: "open", open: 0.3, eyeS: 1.2, look: [0, -0.3] });
    rdial.material.emissiveIntensity = 1.2;
    hhemi.intensity = 0.55;
    face(hHero, { mouth: "open", open: 0.5, eyeS: 1.25, look: [1, -0.2] });
    const a = eio(k);
    cp = V(lerp(3, 2.4, a), lerp(1.5, 1.3, a), lerp(1.8, 1.4, a));
    ct = V(1.5, 1, 0.4);
  }
  setCam(cp, ct, t, { keep: true, fov: 54 });
  draw(hosp);
  hhemi.intensity = 1.3;
}
function labRender(s, lt, k, t) {
  const sc2 = s.scene;
  let cp, ct, dark = 0;
  glassM.emissiveIntensity = 0;
  glow.intensity = 0;
  placeJ(lHero, -0.6, 0, 0.3, Math.PI / 2);
  placeJ(lDouble, 0.6, 0, 0.3, -Math.PI / 2);
  placeJ(lVera, -1.6, 0, -0.9, Math.PI * 0.35);
  let hp = P(STAND), dp = P(STAND), hf = { mouth: "line", blink: blink(t) }, df = { mouth: "line", blink: blink(t + 0.7) };
  if (sc2 === "glass") {
    dp = P(STAND, { head: [lerp(0.5, 0, sm(0.3, 0.7, k)), 0, 0] });
    df = { mouth: "line", look: [0, lerp(-0.8, 0, sm(0.3, 0.7, k))] };
    hf = { mouth: "open", open: 0.4, eyeS: 1.25, brow: 0.3 };
    const a = eio(k);
    cp = V(lerp(-2, -1.5, a), 1.6, lerp(1.6, 1.1, a));
    ct = V(0.6, 1.45, 0.3);
  } else if (sc2 === "scar") {
    hp = P(STAND, { rSh: [-1.5, 0, -0.1], rEl: [-0.2] });
    dp = P(STAND, { lSh: [-1.5, 0, 0.1], lEl: [-0.2] });
    df = { mouth: k % 0.25 < 0.12 ? "open" : "line", open: 0.3 };
    cp = V(0, 1.75, 3.2);
    ct = V(0, 1.3, 0.3);
  } else if (sc2 === "dark") {
    dark = sm(0, 0.2, k);
    hf = { mouth: "open", open: 0.3, eyeS: 1.2, brow: 0.4 };
    df = { mouth: t * 3 % 1 < 0.5 ? "open" : "line", open: 0.35 };
    cp = V(-0.1, 1.6, 2.6);
    ct = V(0, 1.45, 0.3);
  } else if (sc2 === "split") {
  } else if (sc2 === "choice") {
    df = { mouth: "smile", eye: 0.8 };
    hf = { mouth: "frown", brow: 0.3, blink: blink(t) };
    cp = V(-1.7, 1.6, 1);
    ct = V(0.6, 1.5, 0.3);
    dark = 0.4;
  } else if (sc2 === "palms") {
    const a = sm(0.1, 0.5, k);
    hp = P(STAND, { rSh: [-1.45 * a, 0, -0.1], rEl: [-0.15] });
    dp = P(STAND, { lSh: [-1.45 * a, 0, 0.1], lEl: [-0.15] });
    glassM.emissiveIntensity = 1.4 * sm(0.5, 1, k);
    glow.position.set(0, 1.45, 0.6);
    glow.intensity = 6 * sm(0.5, 1, k);
    dark = 0.5;
    hf = { mouth: "line", eye: 0.9 };
    df = { mouth: "smile", eye: 0.8 };
    const u = eio(k);
    cp = V(lerp(0.2, 0, u), lerp(1.7, 1.55, u), lerp(3.2, 2, u));
    ct = V(0, 1.4, 0.3);
  }
  pose(lHero, hp);
  pose(lDouble, dp);
  face(lHero, hf);
  face(lDouble, df);
  pose(lVera, P(STAND, { lSh: [-0.3, 0, 0.3] }));
  face(lVera, { mouth: sc2 === "split" ? "open" : "line", open: 0.3, blink: blink(t + 2), look: [0.6, 0] });
  lVera.root.visible = sc2 !== "dark";
  lhemi.intensity = lerp(1.4, 0.08, dark);
  ldir.intensity = lerp(0.6, 0, dark);
  lUnder1.position.set(-0.9, 0.9, 0.9);
  lUnder2.position.set(0.9, 0.9, 0.9);
  lUnder1.intensity = lUnder2.intensity = 3 * dark;
  setCam(cp, ct, t, { keep: true, fov: 50 });
  draw(lab);
}
var texOK = false;
function makeRender(part) {
  return function render(s, lt, k, t) {
    if (!texOK) {
      ptex.redraw();
      texOK = true;
    }
    const sc2 = s.scene;
    if (["wake", "clock", "phone", "street", "drone", "sky", "tape", "news"].includes(sc2)) aptRender(s, lt, k, t);
    else if (["hospital", "science", "radio"].includes(sc2) && !(sc2 === "radio" && k > 0.55)) hospRender(s, lt, k, t);
    else if (["glass", "scar", "dark", "choice", "palms"].includes(sc2)) labRender(s, lt, k, t);
    else cityRender(s, lt, k, t, part);
  };
}
function full2(s, lt, k) {
  const a = sm(0, 0.3, lt);
  if (s.scene === "science") {
    const pts = [[0.22, 0.32], [0.28, 0.38], [0.48, 0.28], [0.52, 0.33], [0.56, 0.3], [0.72, 0.36], [0.8, 0.42], [0.85, 0.62], [0.3, 0.66], [0.55, 0.55]];
    const w = 920, h = 520;
    const svg = `<svg width="${w}" height="${h}" viewBox="0 0 100 56"><rect width="100" height="56" rx="3" fill="#0e1a30" stroke="#5cffa0" stroke-width=".5"/>
      <path d="M8 14 Q14 8 24 10 T34 18 Q30 26 24 30 T16 26 Z M26 34 Q32 32 34 40 T30 52 Q26 48 26 40 Z M44 10 Q52 6 60 10 T76 12 Q86 14 90 22 T80 30 Q70 28 64 32 T50 30 Q44 22 44 16 Z M48 32 Q54 30 58 36 T56 48 Q50 46 48 38 Z M78 40 Q84 38 88 44 T82 50 Q78 46 78 42 Z" fill="#1f3a5a"/>
      ${pts.map(([x, y], i) => `<circle cx="${x * 100}" cy="${y * 56}" r="${1.2 + 0.8 * Math.sin(lt * 3 + i)}" fill="#5cffa0" opacity="${clamp((lt - i * 0.25) * 2)}"/>`).join("")}</svg>`;
    return `<div style="position:absolute;left:50%;top:${PORT ? 300 : 140}px;transform:translateX(-50%);opacity:${a}">${svg}<div style="text-align:center;font-weight:900;font-size:40px;color:#5cffa0;margin-top:14px">${L("\u041B\u0410\u0411\u041E\u0420\u0410\u0422\u041E\u0420\u0418\u0418 \u041C\u0418\u0420\u0410", "LABS WORLDWIDE")}: ${Math.min(10, Math.floor(lt * 4))}</div></div>`;
  }
  if (s.scene === "tape") return `<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 14px rgba(255,255,255,.18);background:linear-gradient(rgba(140,180,160,.10),rgba(140,180,160,.10))"></div><div style="position:absolute;right:60px;top:${PORT ? 330 : 150}px;font-weight:900;font-size:46px;color:#ff4b5c">\u25CF REC 03:33</div>`;
  return "";
}
function fx(s, lt, k) {
  if (s.scene === "tape") return { bk: 0.12 };
  if (s.scene === "dark") return { bk: 0.2 * sm(0, 0.2, k) };
  if (s.scene === "news") return {};
  return {};
}
var BUB = ["#0a1030", "#1a2a5a", "#2ad890"];

// topics/lm2/scene.js
start({ render: makeRender(2), full: full2, fx, mins: { radio: 7.5, dawn: 6.5, end: 3.5 }, bubbles: BUB });
