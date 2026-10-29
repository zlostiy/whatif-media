// Shared engine core for "What if" videos: helpers, toon materials, characters, renderer, overlays, timeline.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { THREE, mergeGeometries };

const PQ = new URLSearchParams(location.search);
export const LANG = PQ.get('lang') || 'ru';
export const W = +(PQ.get('w') || 1080), H = +(PQ.get('h') || 1920), PORT = H > W, EN = LANG === 'en';
export const OV = PQ.get('ov') === '1' || window.RENDER_MODE === 'ov', GPU = window.RENDER_MODE === 'gpu';
document.getElementById('wrap').style.cssText = `width:${W}px;height:${H}px`;
if (PQ.get('ov') === '1') { document.documentElement.style.background = document.body.style.background = 'transparent'; document.getElementById('c').style.visibility = 'hidden'; } const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
if (PQ.get('nov') === '1') document.querySelector('.ov').style.display = 'none'; // 3D only (cloud: low-res 3D + full-res overlays)

// ---------- math ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, x) => a + (b - a) * x;
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eob = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
export const fbm = (x, y) => vnoise(x, y) * .6 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .1;
export const rnd = (i, k = 0) => hash(i * 1.37 + k * 9.1, k * 3.3 + i * .71);
export const col = (a, b, x) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(x));

// ---------- materials / meshes ----------
export const gradTex = (() => { const d = new Uint8Array([70, 125, 185, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const T = (color, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradTex }, o));
export const B = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, o));
const olMats = {};
function olMat(th) { if (olMats[th]) return olMats[th]; return olMats[th] = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: `void main(){ vec3 p = position + normal * ${th.toFixed(4)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`, fragmentShader: `void main(){ gl_FragColor = vec4(.078,.047,.165,1.); }` }); }
const smoothCache = new WeakMap();
export function ol(mesh, th = .018) {
  let g = smoothCache.get(mesh.geometry);
  if (!g) { const p = new THREE.BufferGeometry(); p.setAttribute('position', mesh.geometry.attributes.position.clone()); if (mesh.geometry.index) p.setIndex(mesh.geometry.index.clone()); g = mergeVertices(p, 1e-3); g.computeVertexNormals(); smoothCache.set(mesh.geometry, g); }
  const o = new THREE.Mesh(g, olMat(th)); o.userData.isOutline = true; mesh.add(o); return mesh;
}
export function add(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], sc = null, th = .018) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (sc) m.scale.set(...sc); if (th) ol(m, th); parent.add(m); return m;
}
export const G = (parent, pos = [0, 0, 0], rot = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); if (parent) parent.add(g); return g; };
// boxes get slightly rounded edges: catches light on the edges, looks like a real object, not a flat cut-out
export const Box = (x, y, z) => { const r = Math.min(.09, Math.min(x, y, z) * .14); return r < .004 ? new THREE.BoxGeometry(x, y, z) : new RoundedBoxGeometry(x, y, z, 2, r); }, Sph = (r, a = 20, b = 14) => new THREE.SphereGeometry(r, a, b), Cap = (r, l, s = 12) => new THREE.CapsuleGeometry(r, l, 5, s), Cyl = (a, b, h, s = 16) => new THREE.CylinderGeometry(a, b, h, s);
export function capDown(r, len) { const g = Cap(r, len); g.translate(0, -len / 2, 0); return g; }
export const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.redraw = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; }; t.redraw(); return t; }
export function makeSky(top, bot, r = 300) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float h = clamp(p.y*.5+.5,0.,1.); gl_FragColor = vec4(mix(b,a,pow(h,1.6)),1.); }' }));
  m.renderOrder = -10; m.frustumCulled = false; m.set = (t, b) => { m.material.uniforms.a.value.set(t); m.material.uniforms.b.value.set(b); }; return m;
}
// stable star sky (texture on a sphere: no per-pixel twinkling like tiny points)
export function starSphere(r = 1500, n = 2600) {
  const tex = canvasTex(4096, 2048, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const x = rnd(i, 1) * w, y = Math.acos(1 - 2 * rnd(i, 2)) / Math.PI * h, s = 1.2 + rnd(i, 3) * 2.2; c.fillStyle = `rgba(255,255,255,${.5 + rnd(i, 4) * .5})`; c.beginPath(); c.arc(x, y, s, 0, 6.29); c.fill(); } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }));
  m.renderOrder = -10; m.frustumCulled = false; return m;
}
// simple instanced particle field helper (points)
export function points(n, color, size, opts = {}) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const { keep, ...mo } = opts; const m = new THREE.PointsMaterial(Object.assign({ map: dotTex, color, size, transparent: true, opacity: 1, depthWrite: false }, mo)); const o = new THREE.Points(g, m); o.frustumCulled = false; o.pos = p; o.upd = () => g.attributes.position.needsUpdate = true;
  if (!opts.keep) o.layers.set(31); // small point particles shimmer (sub-pixel): never drawn unless explicitly kept
  return o;
}

// ---------- characters ----------
export function makeHuman(o = {}) {
  const top = T(o.top ?? 0x4f7cff), pants = T(o.pants ?? 0x2b2f45), skin = T(o.skin ?? 0xffc6a0), hairM = T(o.hair ?? 0x5a3420), white = T(0xf0f0f6), blk = B(0x140c2a), shoe = T(o.shoe ?? 0xffffff), cheek = B(0xff8f9a, { transparent: true, opacity: .55 });
  const J = { mats: { hair: hairM, top, skin, pants } }; const root = new THREE.Group(); J.root = root; const spine = G(root); J.spine = spine;
  add(spine, Cap(.2, .2, 16), top, [0, .25, 0], [0, 0, 0], [1.05, 1, .85], .016);
  if (o.dress) add(spine, new THREE.ConeGeometry(.3, .4, 18), top, [0, .02, 0], [0, 0, 0], null, .016);
  if (o.robe) add(spine, new THREE.ConeGeometry(.32, .62, 18), top, [0, -.08, 0], [0, 0, 0], null, .016);
  if (o.backpack) { add(spine, Box(.3, .32, .14), T(o.backpack), [0, .28, -.2], [0, 0, 0], null, .014); add(spine, Cyl(.05, .05, .2, 10), T(0x4fd8ff), [.12, .35, -.27], [0, 0, 0], null, .01); }
  if (o.bib) add(spine, new THREE.PlaneGeometry(.18, .13), B(0xffffff), [0, .26, .178], [0, 0, 0], null, 0);
  if (o.suit) { add(spine, Box(.22, .14, .05), T(0xd9dde8), [0, .3, .17], [0, 0, 0], null, .01); add(spine, new THREE.CircleGeometry(.025, 12), B(0xff4b5c), [-.06, .31, .197], [0, 0, 0], null, 0); add(spine, new THREE.CircleGeometry(.025, 12), B(0x4fd8ff), [.05, .31, .197], [0, 0, 0], null, 0); add(spine, new THREE.CircleGeometry(.04, 16), B(o.patch ?? 0x2b6cff), [.17, .4, .07], [0, .9, 0], null, 0); }
  const neck = G(spine, [0, .52, 0]); J.neck = neck; const head = G(neck, [0, .04, 0]); J.head = head;
  add(head, Sph(.24, 28, 22), skin, [0, .22, 0], [0, 0, 0], [1, .95, .95], .016);
  if (o.hairStyle === 'wrap') { add(head, new THREE.SphereGeometry(.262, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), T(o.wrap ?? 0x2a5bd6), [0, .23, -.01], [-.3, 0, 0], null, .014); add(head, Cap(.14, .16, 12), T(o.wrap ?? 0x2a5bd6), [0, .05, -.16], [.3, 0, 0], null, .012); }
  else if (o.hairStyle !== 'bald') {
    add(head, new THREE.SphereGeometry(.252, 28, 16, 0, Math.PI * 2, 0, Math.PI * .45), hairM, [0, .235, -.015], [-.35, 0, 0], null, .014);
    add(head, Sph(.09, 12, 10), hairM, [.06, .44, .1], [.4, 0, -.3], [1.4, .7, 1], .012);
  } else add(head, new THREE.SphereGeometry(.25, 28, 16, 0, Math.PI * 2, Math.PI * .3, Math.PI * .3), hairM, [0, .22, -.02], [-.2, 0, 0], null, .012);
  if (o.hairStyle === 'long') { add(head, Cap(.2, .25, 16), hairM, [0, .1, -.1], [0, 0, 0], [1.15, 1, .7], .014); for (const x of [-.2, .2]) add(head, Cap(.06, .2, 10), hairM, [x, .1, .05], [0, 0, 0], null, .012); }
  if (o.cap) { add(head, new THREE.SphereGeometry(.258, 24, 12, 0, Math.PI * 2, 0, Math.PI * .42), T(o.cap), [0, .24, -.01], [-.25, 0, 0], null, .012); add(head, Cyl(.17, .17, .025, 20), T(o.cap), [0, .34, .2], [.35, 0, 0], [1, 1, .7], .01); if (o.neckFlap) add(head, Box(.36, .2, .02), T(0xf3f5fa), [0, .16, -.2], [.25, 0, 0], null, .008); }
  if (o.pilotCap) { add(head, Cyl(.26, .24, .1, 22), T(0x1d2a5a), [0, .42, 0], [-.1, 0, 0], null, .012); add(head, Box(.2, .03, .12), T(0x111111), [0, .39, .22], [.4, 0, 0], null, .008); add(head, new THREE.CircleGeometry(.04, 12), B(0xffd23f), [0, .44, .25], [-.1, 0, 0], null, 0); }
  for (const x of [-.235, .235]) add(head, Sph(.05, 10, 8), skin, [x, .2, 0], [0, 0, 0], [.6, 1, 1], .01);
  J.eyes = []; J.pupils = []; J.brows = [];
  for (const x of [-.085, .085]) { const eg = G(head, [x, .23, .2]); add(eg, Sph(.056, 16, 12), white, [0, 0, 0], [0, 0, 0], [1, 1.15, .45], .008); const pu = G(eg); add(pu, Sph(.034, 14, 10), blk, [0, 0, .02], [0, 0, 0], [1, 1.1, .5], 0); add(pu, Sph(.011, 8, 6), B(0xffffff), [.012, .015, .04], [0, 0, 0], null, 0); J.eyes.push(eg); J.pupils.push(pu); J.brows.push(add(head, Cap(.014, .07, 8), o.hairStyle === 'wrap' ? T(0x2a1a10) : hairM, [x, .325, .2], [0, 0, Math.PI / 2], null, .006)); }
  if (o.glasses) for (const x of [-.085, .085]) add(head, new THREE.TorusGeometry(.07, .012, 6, 20), blk, [x, .23, .23], [0, 0, 0], null, 0);
  if (o.beard) add(head, Sph(.2, 20, 14, 0, Math.PI * 2, Math.PI * .55, Math.PI * .45), hairM, [0, .2, .03], [0, 0, 0], [1, 1, 1], .012);
  if (o.stubble) add(head, Sph(.235, 20, 14, -Math.PI * .3, Math.PI * .6, Math.PI * .6, Math.PI * .25), T(0x6a4a3a, { transparent: true, opacity: .35 }), [0, .22, .01], [0, 0, 0], null, 0);
  for (const x of [-.15, .15]) add(head, new THREE.CircleGeometry(.035, 14), cheek, [x, .15, .215], [0, x * 2.5, 0], null, 0);
  add(head, Sph(.025, 10, 8), skin, [0, .18, .235], [0, 0, 0], null, .006);
  const mg = G(head, [0, .105, .215]); J.mouths = {};
  J.mouths.smile = add(mg, new THREE.TorusGeometry(.045, .012, 6, 16, Math.PI), blk, [0, .02, 0], [0, 0, Math.PI], null, 0);
  J.mouths.frown = add(mg, new THREE.TorusGeometry(.035, .011, 6, 16, Math.PI), blk, [0, -.015, 0], [0, 0, 0], null, 0);
  J.mouths.line = add(mg, Cap(.009, .045, 6), blk, [0, 0, 0], [0, 0, Math.PI / 2], null, 0);
  const om = G(mg); J.mouths.open = om; add(om, Sph(.05, 14, 10), B(0x5a1020), [0, 0, 0], [0, 0, 0], [1, 1.1, .35], .008); add(om, Sph(.03, 10, 8), B(0xff7d8a), [0, -.025, .01], [0, 0, 0], [1.1, .6, .4], 0);
  if (o.headset) { add(head, new THREE.TorusGeometry(.27, .022, 6, 24, Math.PI), T(0x2b2f45), [0, .24, -.01], [0, 0, 0], null, .008); for (const x of [-.265, .265]) add(head, Cyl(.065, .065, .06, 16), T(0x2b2f45), [x, .2, 0], [0, 0, Math.PI / 2], null, .01); add(head, Cap(.01, .14, 6), T(0x2b2f45), [-.2, .08, .13], [0, -.7, Math.PI / 2], null, .005); add(head, Sph(.022, 8, 6), B(0xff4b5c), [-.15, .08, .2], [0, 0, 0], null, .005); }
  if (o.helmet) { J.helmet = add(head, Sph(.36, 28, 20), new THREE.MeshToonMaterial({ color: 0xbfe6ff, gradientMap: gradTex, transparent: true, opacity: .28, depthWrite: false }), [0, .2, .02], [0, 0, 0], null, 0); add(head, new THREE.TorusGeometry(.3, .05, 10, 28), T(0xd9dde8), [0, -.08, 0], [Math.PI / 2, 0, 0], null, .01); }
  const L1 = .17, L2 = .16; J.L1 = L1; J.L2 = L2;
  for (const [s, side] of [['l', 1], ['r', -1]]) {
    const sh = G(spine, [side * .22, .38, 0]); add(sh, capDown(.058, L1), top, [0, 0, 0], [0, 0, 0], null, .012);
    const el = G(sh, [0, -L1, 0]); add(el, capDown(.052, L2), top, [0, 0, 0], [0, 0, 0], null, .012); add(el, Sph(.06, 14, 10), o.gloves ? T(o.gloves) : skin, [0, -L2 - .03, 0], [0, 0, 0], null, .01);
    J[s + 'Sh'] = sh; J[s + 'El'] = el;
    const hip = G(root, [side * .1, .02, 0]); add(hip, capDown(.075, .19), pants, [0, 0, 0], [0, 0, 0], null, .012);
    const kn = G(hip, [0, -.19, 0]); add(kn, capDown(.068, .17), o.legSkin ? skin : pants, [0, 0, 0], [0, 0, 0], null, .012); add(kn, Cap(.07, .08, 10), shoe, [0, -.25, .05], [Math.PI / 2, 0, 0], null, .01);
    J[s + 'Hip'] = hip; J[s + 'Kn'] = kn;
  }
  root.scale.setScalar(o.scale || 1);
  return J;
}
export function face(J, f = {}) {
  const mo = f.mouth || 'smile'; for (const k in J.mouths) J.mouths[k].visible = k === mo;
  if (mo === 'open') J.mouths.open.scale.set(1, f.open || 1, 1);
  const bl = f.blink ? .08 : (f.eye || 1); J.eyes.forEach(e => { e.scale.set(1, bl, 1); e.scale.multiplyScalar(f.eyeS || 1); });
  const lk = f.look || [0, 0]; J.pupils.forEach(p => { p.position.set(lk[0] * .022, lk[1] * .022, 0); p.scale.setScalar(f.pupil || 1); });
  J.brows.forEach((b, i) => { b.rotation.z = Math.PI / 2 + (i ? -1 : 1) * (f.brow || 0); b.position.y = .325 + (f.browY || 0); });
}
const R3 = (o, a) => o.rotation.set(a[0] || 0, a[1] || 0, a[2] || 0);
export const STAND = { lHip: [0, 0, .04], rHip: [0, 0, -.04], lKn: [0], rKn: [0] };
export const SIT = { lHip: [-1.5, 0, .08], rHip: [-1.5, 0, -.08], lKn: [1.45], rKn: [1.45] };
export function pose(J, p) {
  R3(J.spine, p.spine || [0]); R3(J.neck, p.neck || [0]); R3(J.head, p.head || [0]);
  R3(J.lSh, p.lSh || [0, 0, .15]); R3(J.rSh, p.rSh || [0, 0, -.15]); R3(J.lEl, p.lEl || [-.3]); R3(J.rEl, p.rEl || [-.3]);
  R3(J.lHip, p.lHip || [0]); R3(J.rHip, p.rHip || [0]); R3(J.lKn, p.lKn || [0]); R3(J.rKn, p.rKn || [0]);
}
export const P = (...ps) => Object.assign({}, ...ps);
export function walkPose(t, sp = 8, amp = .5) { const s = Math.sin(t * sp); return { lHip: [s * amp], rHip: [-s * amp], lKn: [Math.max(0, -s) * .6], rKn: [Math.max(0, s) * .6], lSh: [-s * .5, 0, .12], rSh: [s * .5, 0, -.12], lEl: [-.4], rEl: [-.4], spine: [.04] }; }
export function runPose(t, sp = 13, amp = .9) { const s = Math.sin(t * sp); return { lHip: [s * amp - .2], rHip: [-s * amp - .2], lKn: [.4 + Math.max(0, -s) * 1.1], rKn: [.4 + Math.max(0, s) * 1.1], lSh: [-s * .9, 0, .15], rSh: [s * .9, 0, -.15], lEl: [-1.4], rEl: [-1.4], spine: [.22] }; }
export const bob = (t, sp = 13) => Math.abs(Math.sin(t * sp)) * .06;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
export function reach(J, side, target, bendAxis = V(0, -1, -.3)) {
  const sh = J[side + 'Sh'], el = J[side + 'El']; sh.parent.updateMatrixWorld(true);
  const s = J.root.scale.x; const tl = sh.parent.worldToLocal(target.clone()).sub(sh.position);
  const L1 = J.L1, L2 = J.L2 + .03, d = clamp(tl.length(), .05, (L1 + L2) * .995);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), b = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const dir = tl.clone().normalize(); _q.setFromUnitVectors(V(0, -1, 0), dir);
  let ax = bendAxis.clone().projectOnPlane(dir).normalize(); if (!isFinite(ax.x) || ax.lengthSq() < 1e-4) ax.set(1, 0, 0);
  _q2.setFromAxisAngle(ax, a); sh.quaternion.copy(_q2.multiply(_q)); el.rotation.set(0, 0, 0);
  const axL = ax.clone().applyQuaternion(sh.quaternion.clone().invert()); el.quaternion.setFromAxisAngle(axL, -(Math.PI - b));
}

// ---------- renderer ----------
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
export const camera = new THREE.PerspectiveCamera(60, W / H, .05, 3000);
const BASEFOV = PORT ? 2 * Math.atan(Math.tan(23 * Math.PI / 180) / (W / H)) * 180 / Math.PI : 46;
camera.fov = BASEFOV; camera.updateProjectionMatrix();
const composer = new EffectComposer(renderer); const rp = new RenderPass(new THREE.Scene(), camera); composer.addPass(rp);
// soft contact shading in corners / where objects meet the ground (objects stop looking 'pasted on')
const gtao = new GTAOPass(new THREE.Scene(), camera, W, H); gtao.blendIntensity = 1; gtao.updateGtaoMaterial({ radius: .9, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); if (PQ.get('lite') !== '1') composer.addPass(gtao); // lite=1: no contact shading (faster cloud renders)
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) { c = texture2D(tDiffuse, vUv + vec2(.002,0.)); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); } gl_FragColor = clamp(c, 0., 3.); }' }));
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .5, .45, .96); composer.addPass(bloom); composer.addPass(new OutputPass());
let shake = 0; export const setShake = v => { shake = v; }; const lastTgt = new THREE.Vector3();
// landscape: pull camera back a bit so wide framing keeps subject
export function setCam(pos, tgt, t = 0, o = {}) {
  let p = pos.clone(); if (!PORT && !o.keep) p = p.sub(tgt).multiplyScalar(o.land ?? 1.0).add(tgt);
  camera.position.copy(p); if (shake > 0) camera.position.add(V(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, Math.sin(t * 63) * shake * .5));
  lastTgt.copy(tgt); camera.up.set(0, 1, 0); if (o.roll) camera.up.set(Math.sin(o.roll), Math.cos(o.roll), 0); camera.lookAt(tgt);
  const f = o.fov ? (PORT ? 2 * Math.atan(Math.tan(o.fov / 2 * Math.PI / 180) / (W / H)) * 180 / Math.PI : o.fov) : BASEFOV; if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); }
}
// real shadows: every solid mesh casts/receives; the sun's shadow box follows what the camera looks at
const prepped = new WeakSet(), _d = new THREE.Vector3();
function prepShadows(scene) {
  scene.traverse(o => {
    if (o.isMesh && !o.userData.isOutline && !o.isPoints) { const m = o.material; const solid = m && !m.transparent && (m.isMeshToonMaterial || m.isMeshStandardMaterial || m.isMeshLambertMaterial); o.castShadow = !!solid && m.side !== THREE.BackSide && !o.userData.noShadow; o.receiveShadow = !!(m && (m.isMeshToonMaterial || m.isMeshStandardMaterial || m.isMeshLambertMaterial)); }
    if (o.isDirectionalLight && !o.userData.noShadow) { o.castShadow = true; o.shadow.mapSize.set(2048, 2048); o.shadow.bias = -.0006; o.shadow.normalBias = .03; o.shadow.radius = 3; if (!o.target.parent) scene.add(o.target); }
  });
  prepped.add(scene);
}
export function draw(scene) {
  if (!prepped.has(scene) || scene.userData.reprep) { prepShadows(scene); scene.userData.reprep = false; }
  const dist = camera.position.distanceTo(lastTgt), S = clamp(dist * 1.1, 5, 140);
  scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) {
    _d.copy(o.position).sub(o.target.position); if (_d.lengthSq() < 1e-6) _d.set(0, 1, 0); _d.normalize();
    o.target.position.copy(lastTgt); o.position.copy(lastTgt).addScaledVector(_d, S * 2.5); o.target.updateMatrixWorld();
    const c = o.shadow.camera; if (c.right !== S) { c.left = -S; c.right = S; c.top = S; c.bottom = -S; c.near = .1; c.far = S * 6; c.updateProjectionMatrix(); } } });
  rp.scene = scene; gtao.scene = scene; composer.render();
}
export const reprep = scene => { scene.userData.reprep = true; };

// ---------- overlays ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), badge = $('badge'), cards = $('cards'), full = $('full');
if (!PORT) badge.style.top = '60px';
const strokeShadow = (w, c) => { const a = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; a.push(`${(Math.cos(t) * w).toFixed(1)}px ${(Math.sin(t) * w).toFixed(1)}px 0 ${c}`); } return a.join(','); };
capEl.style.textShadow = strokeShadow(3, '#000') + ', 0 4px 14px rgba(0,0,0,.45)';
const bub = $('bub'), bctx = bub.getContext('2d'); bub.width = W / 2; bub.height = H / 2; const BW = W / 2, BH = H / 2;
let BUBC = ['#1a1033', '#2b1f66', '#3a2a8a'];
function drawBubbles(p) {
  bctx.clearRect(0, 0, BW, BH); if (p <= 0 || p >= 1) return;
  const cov = p < .5 ? eio(p * 2) : eio((1 - p) * 2);
  if (cov < .18) return; // near the ends the circles would be sub-pixel specks (and their outline strokes leave dots) — draw nothing
  for (let i = 0; i < 70; i++) { const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < .5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110); if (r < 36) continue; /* no small specks */ bctx.fillStyle = BUBC[i % 3]; bctx.beginPath(); bctx.arc(x, y, r, 0, 6.29); bctx.fill(); bctx.strokeStyle = 'rgba(255,255,255,.25)'; bctx.lineWidth = 4; bctx.beginPath(); bctx.arc(x - r * .3, y - r * .3, r * .5, 3.6, 4.6); bctx.stroke(); }
}
export const fmtN = n => EN ? Math.round(n).toLocaleString('en-US') : Math.round(n).toLocaleString('ru-RU').replace(/[  ,]/g, ' ');
export const fmtD = (n, d = 1) => EN ? n.toFixed(d) : n.toFixed(d).replace('.', ',');
export const L = (ru, en) => EN ? en : ru;
// stat card; in landscape it sits right-top
export function card(top, inner, a, o = {}) { if (!PORT) top = o.ltop ?? 150; const left = PORT ? (o.left ?? 50) : (o.lleft ?? 79); return `<div class="card" style="top:${top}px;left:${left}%;transform:translateX(-50%) scale(${eob(a) * .9 + .1 * a});opacity:${clamp(a * 3)}">${inner}</div>`; }
// full-screen paper card (archive style)
export function paper(a, k, inner, o = {}) {
  const z = 1 + k * .05; return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${.72 * a})"></div><div style="position:absolute;left:50%;top:${PORT ? (o.top ?? 400) : (o.ltop ?? 80)}px;width:${PORT ? 840 : 760}px;transform:translateX(-50%) rotate(${lerp(-3.5, -1.5, k)}deg) scale(${z * (.85 + .15 * eob(sm(0, .35, a)))});opacity:${a};background:#f4e6c8;border:8px solid #1a1033;border-radius:18px;box-shadow:0 16px 0 #1a1033;padding:30px;color:#3a2a1a;text-align:center">${inner}</div>`;
}

// ---------- main ----------
export function start(topic) {
  if (topic.bubbles) BUBC = topic.bubbles;
  const mins = topic.mins || {};
  const shots = DATA.shots.map((s, i) => Object.assign({}, s, { vd: DATA.meta[i].dur, phr: DATA.meta[i].phr, i }));
  let acc = 0;
  shots.forEach((s, i) => {
    const lead = i === 0 ? .5 : .1; let d = lead + s.vd + .32;
    if (mins[s.scene]) d = Math.max(d, mins[s.scene]);
    if (i === shots.length - 1) d += 1.6;
    s.start = acc; s.dur = d; s.vo0 = acc + lead; acc += d;
    s.words = []; s.vo.split('*').forEach((seg, si) => seg.split(/\s+/).filter(Boolean).forEach(w => s.words.push({ t: w, h: si % 2 === 1 })));
    s.words = s.words.reduce((arr, w) => { if (/^[.,:;!?…»"]+$/.test(w.t) && arr.length) arr[arr.length - 1].t += w.t; else arr.push(w); return arr; }, []);
    const assign = (list, a0, a1) => { const tot = list.reduce((q, w) => q + w.t.length + 2, 0); let c = 0; list.forEach(w => { w.a = a0 + (a1 - a0) * c / tot; c += w.t.length + 2; w.b = a0 + (a1 - a0) * c / tot; }); };
    let wi = 0; s.phr.forEach(([pa, pb, ptxt]) => { const n = ptxt.replace(/\*/g, '').split(/\s+/).filter(Boolean).filter(x => !/^[.,:;!?…»"—]+$/.test(x)).length; assign(s.words.slice(wi, wi + n), s.vo0 + pa, s.vo0 + pb); wi += n; });
    if (wi < s.words.length) assign(s.words.slice(wi), s.vo0 + s.vd * .9, s.vo0 + s.vd);
    s.words = s.words.filter(w => w.t !== '—');
    const ch = []; let cur = [];
    s.words.forEach((w, j) => { cur.push(j); if (cur.length >= 3 || /[.,:;!?…—»"]$/.test(w.t)) { ch.push(cur); cur = []; } });
    if (cur.length) ch.push(cur); s.chunks = ch;
  });
  const TOTAL = acc; window.TOTAL = TOTAL;
  window.TL = { total: TOTAL, shots: shots.map(s => ({ scene: s.scene, badge: s.badge, start: s.start, dur: s.dur, vo0: s.vo0 })) };
  if (topic.init) topic.init(shots);
  window.setTime = function (t) {
    let i = shots.findIndex(s => t >= s.start && t < s.start + s.dur); if (i < 0) i = shots.length - 1;
    const s = shots[i], lt = t - s.start, k = clamp(lt / s.dur); shake = 0;
    if (!OV) topic.render(s, lt, k, t, i);
    if (GPU) return;
    full.style.opacity = 1; full.innerHTML = topic.full ? topic.full(s, lt, k) || '' : '';
    cards.innerHTML = topic.cards ? topic.cards(s, lt, k) || '' : '';
    // badge (animates when it changes)
    const prev = shots[i - 1]; let bStart = s.start; for (let j = i; j >= 0 && shots[j].badge === s.badge; j--) bStart = shots[j].start;
    const bp = eob(clamp((t - bStart) / .45)), has = !!s.badge;
    badge.style.opacity = has ? 1 : 0; badge.style.transform = `scale(${has ? .3 + .7 * bp : 1}) rotate(${(1 - bp) * -8}deg)`;
    $('dayt').textContent = s.badge || ''; $('loct').textContent = s.loc || '';
    // karaoke captions
    let html = ''; const cw = s.words; let ci = s.chunks.findIndex(c => t < cw[c[c.length - 1]].b + .05); if (ci < 0) ci = s.chunks.length - 1;
    const ch = s.chunks[ci];
    if (ch && t >= cw[ch[0]].a - .05) ch.forEach(j => { const w = cw[j]; const a = clamp((t - w.a + .06) / .14); if (a <= 0) return; const sc2 = a < 1 ? .4 + .6 * eob(a) : 1; html += `<span class="${w.h ? 'h' : ''}" style="transform:scale(${sc2.toFixed(3)}) translateY(${((1 - a) * 20).toFixed(1)}px);opacity:${clamp(a * 2)}">${w.t.replace(/[.…]+$/, '').replace(/^…/, '')}</span>`; });
    capEl.innerHTML = html;
    const end = i === shots.length - 1 || s.scene.startsWith('end');
    const cp = (topic.cap && topic.cap(s)) || {};
    if (PORT) { capEl.style.bottom = (cp.bottom ?? (end ? 1180 : 560)) + 'px'; capEl.style.fontSize = (end ? 104 : 82) + 'px'; } else { capEl.style.bottom = (cp.lbottom ?? (end ? 520 : 70)) + 'px'; capEl.style.fontSize = (end ? 96 : 66) + 'px'; capEl.style.left = '240px'; capEl.style.right = '240px'; }
    // bubble wipe when the badge changes
    let bp2 = 0; const nx = shots[i + 1];
    if (prev && prev.badge !== s.badge) bp2 = .5 + .5 * clamp(lt / .35);
    if (nx && nx.badge !== s.badge) { const r = s.dur - lt; if (r < .35) bp2 = .5 * (1 - r / .35); }
    drawBubbles(bp2 > 0 && bp2 < 1 ? bp2 : 0);
    bub.style.visibility = bp2 > 0 && bp2 < 1 ? 'visible' : 'hidden'; // hidden between wipes: a stale canvas can never linger in a frame
    const fx = topic.fx ? topic.fx(s, lt, k, i) || {} : {}; let fl = fx.fl || 0, bk = fx.bk || 0;
    if (i === 0) bk = Math.max(bk, 1 - sm(0, .5, t));
    if (i === shots.length - 1) bk = Math.max(bk, sm(s.dur - .5, s.dur, lt));
    $('flash').style.opacity = fl; $('flash').style.background = fx.flc || '#fff'; $('black').style.opacity = bk;
    if (OV) window.__ovSig = [full.innerHTML, cards.innerHTML, capEl.innerHTML, badge.style.cssText, s.badge, s.loc, capEl.style.cssText, (bp2 > 0 && bp2 < 1 ? bp2 : 0).toFixed(4), fl.toFixed(3), fx.flc || '', bk.toFixed(3)].join('|');
  };
  window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map(f => f.load().catch(() => 0)))).then(() => { window.setTime(0); return true; });
}
