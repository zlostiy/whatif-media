// main.js
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
var PQ = new URLSearchParams(location.search);
var LANG = PQ.get("lang") || "ru";
var W = +(PQ.get("w") || 1080);
var H = +(PQ.get("h") || 1920);
var PORT = H > W;
document.getElementById("wrap").style.cssText = `width:${W}px;height:${H}px`;
document.getElementById("c").width = W;
document.getElementById("c").height = H;
var DICT = [["10 935", "10,935"], ["\u0441\u043E\u043B\u043D\u0435\u0447\u043D\u044B\u0439 \u0441\u0432\u0435\u0442 \u2014 \u0432\u0441\u0451", "sunlight is gone"], ["\u0433\u043B\u0443\u0431\u0438\u043D\u0430", "depth"], [" <small>\u043C</small>", " <small>m</small>"], ["\u043D\u0430\u0434 \u0442\u043E\u0431\u043E\u0439", "above you"], ['<div class="n">\u0432\u043E\u0434\u044B</div>', '<div class="n">of water</div>'], ["\u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435", "pressure"], ["\u0441\u0430\u043C\u043E\u043B\u0451\u0442\u043E\u0432", "jumbo jets"], ["\u2248 1 100 \u0430\u0442\u043C\u043E\u0441\u0444\u0435\u0440", "\u2248 1,100 atmospheres"], ["\u043A\u043E\u0440\u043F\u0443\u0441", "hull"], ["\u0441\u043C \u0442\u0438\u0442\u0430\u043D\u0430", "cm of titanium"], ["\u0430 \u0441\u043D\u0430\u0440\u0443\u0436\u0438 \u2014 1 100 \u0430\u0442\u043C", "outside: 1,100 atm"], ["\u0437\u0430\u043F\u0430\u0441 \u0432\u043E\u0437\u0434\u0443\u0445\u0430", "air supply"], ["<small>\u0447</small>", "<small>h</small>"], ["\u2248 4,5 \u0434\u043D\u044F", "\u2248 4.5 days"], ["CO\u2082 \u0432 \u043A\u0430\u0431\u0438\u043D\u0435", "CO\u2082 in cabin"], ["\u0432 \u043A\u0430\u0431\u0438\u043D\u0435", "inside"], ["\u0437\u0430 \u0431\u043E\u0440\u0442\u043E\u043C +2 \xB0C", "outside +2 \xB0C"], ["\u0441\u0438\u0433\u043D\u0430\u043B \u0434\u043E \u043F\u043E\u0432\u0435\u0440\u0445\u043D\u043E\u0441\u0442\u0438", "signal to surface"], ["<small>\u0441\u0435\u043A</small>", "<small>sec</small>"], ["\u0437\u0432\u0443\u043A \u0432 \u0432\u043E\u0434\u0435 \u2248 1 500 \u043C/\u0441", "sound in water \u2248 1,500 m/s"], ["\u043F\u043E\u0433\u043B\u043E\u0442\u0438\u0442\u0435\u043B\u044C: \u043F\u043E\u0447\u0442\u0438 \u0432\u0441\u0451", "scrubber: almost empty"], ["\u043F\u043E\u0434\u044A\u0451\u043C \u2248 3 \u0447\u0430\u0441\u0430", "ascent \u2248 3 hours"], ["\xAB\u0422\u0420\u0418\u0415\u0421\u0422\xBB", "TRIESTE"], ["23 \u044F\u043D\u0432\u0430\u0440\u044F 1960 \xB7 \u2248 10 900 \u043C", "January 23, 1960 \xB7 \u2248 10,900 m"], ["\u043D\u0430 9 \u043A\u043C \u0442\u0440\u0435\u0441\u043D\u0443\u043B\u043E \u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u0441\u0442\u0435\u043A\u043B\u043E", "an outer window cracked at 9 km"], ["\u043F\u0440\u0435\u0434\u0435\u043B \u0440\u044B\u0431 \u2248 8,3 \u043A\u043C", "fish limit \u2248 8.3 km"], [">\u0442\u044B<", ">you<"], ["\xAB\u041A\u0430\u0439\u043A\u043E\xBB", "Kaiko"], ["\xAB\u041D\u0435\u0440\u0435\u0439\xBB", "Nereus"], ["\u043E\u0431\u043E\u0440\u0432\u0430\u043B\u0441\u044F \u0442\u0440\u043E\u0441 \u2014 \u043F\u043E\u0442\u0435\u0440\u044F\u043D", "cable snapped \u2014 lost"], ["\u0440\u0430\u0437\u0434\u0430\u0432\u0438\u043B\u043E \u043D\u0430 \u0433\u043B\u0443\u0431\u0438\u043D\u0435 9,9 \u043A\u043C", "crushed at 9.9 km"], [" \u043A\u043C<", " km<"], ["\u041E\u0428\u0418\u0411\u041A\u0410", "ERROR"], ["\u0441\u0431\u0440\u043E\u0441 \u0431\u0430\u043B\u043B\u0430\u0441\u0442\u0430", "ballast drop"], ["\u041D\u0415\u0422 \u0421\u0418\u0413\u041D\u0410\u041B\u0410", "NO SIGNAL"], ["\u0412\u041E\u0417\u0414\u0423\u0425", "AIR"], [" \u0447", " h"]];
var TR = (s) => LANG === "en" ? DICT.reduce((a, [r, e]) => a.split(r).join(e), s) : s;
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
function olMat(th, col = 1313834) {
  const k = th + "_" + col;
  if (olMats[k]) return olMats[k];
  return olMats[k] = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { c: { value: new THREE.Color(col) }, op: { value: 1 } },
    transparent: false,
    vertexShader: `uniform float th; void main(){ vec3 p = position + normal * ${th.toFixed(4)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`,
    fragmentShader: `uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.); }`
  });
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
var shots = DATA.shots.map((s, i) => Object.assign({}, s, { vd: DATA.meta[i].dur, phr: DATA.meta[i].phr }));
var acc = 0;
shots.forEach((s, i) => {
  const lead = i === 0 ? 0.45 : 0.08;
  let d = lead + s.vd + 0.28;
  const mins = { cabOff: 1.5, crack: 2.4, scream: 3, abyss: 3.4, surface: 2, release: 2 };
  if (mins[s.scene]) d = Math.max(d, mins[s.scene]);
  if (s.scene === "end") d += 1.6;
  s.start = acc;
  s.dur = d;
  s.vo0 = acc + lead;
  acc += d;
  s.words = [];
  s.vo.split("*").forEach((seg, si) => seg.split(/\s+/).filter(Boolean).forEach((w) => s.words.push({ t: w, h: si % 2 === 1 })));
  s.words = s.words.reduce((arr, w) => {
    if (/^[.,:;!?…»]+$/.test(w.t) && arr.length) arr[arr.length - 1].t += w.t;
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
    const n = ptxt.replace(/\*/g, "").split(/\s+/).filter(Boolean).filter((x) => !/^[.,:;!?…»—]+$/.test(x)).length;
    assign(s.words.slice(wi, wi + n), s.vo0 + pa, s.vo0 + pb);
    wi += n;
  });
  if (wi < s.words.length) assign(s.words.slice(wi), s.vo0 + s.vd * 0.9, s.vo0 + s.vd);
  const ch = [];
  let cur = [];
  s.words.forEach((w, j) => {
    cur.push(j);
    if (cur.length >= 3 || /[.,:;!?…—]$/.test(w.t) || w.t === "\u2014") {
      ch.push(cur);
      cur = [];
    }
  });
  if (cur.length) ch.push(cur);
  s.chunks = ch;
});
var TOTAL = acc;
window.TL = { total: TOTAL, shots: shots.map((s) => ({ scene: s.scene, day: s.day, start: s.start, dur: s.dur, vo0: s.vo0 })) };
var canvas = document.getElementById("c");
var renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
var camera = new THREE.PerspectiveCamera(60, W / H, 0.03, 800);
camera.fov = PORT ? 2 * Math.atan(Math.tan(23 * Math.PI / 180) / (W / H)) * 180 / Math.PI : 46;
camera.updateProjectionMatrix();
var composer = new EffectComposer(renderer);
var rp = new RenderPass(new THREE.Scene(), camera);
composer.addPass(rp);
var bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.45, 0.96);
composer.addPass(bloom);
composer.addPass(new OutputPass());
var shake = 0;
function setCam(pos, tgt, t) {
  camera.position.copy(pos);
  if (shake > 0) camera.position.add(V(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake, Math.sin(t * 63) * shake * 0.5));
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt);
}
function draw(scene) {
  rp.scene = scene;
  composer.render();
}
function makeSky(top2, bot) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { a: { value: new THREE.Color(top2) }, b: { value: new THREE.Color(bot) } },
    vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float h = clamp(p.y*.5+.5,0.,1.); gl_FragColor = vec4(mix(b,a,pow(h,1.6)),1.); }"
  }));
  m.renderOrder = -10;
  return m;
}
function makeSub() {
  const g = new THREE.Group();
  const yel = T(16757530), dark = T(2830149), white = T(15988218), red = T(16730972), teal = T(3720921);
  add(g, new THREE.CapsuleGeometry(1.3, 4.4, 8, 20), yel, [0, 0, 0], [0, 0, Math.PI / 2], null, 0.05);
  add(g, new THREE.BoxGeometry(5.8, 0.22, 2.66), red, [0, -0.25, 0], [0, 0, 0], null, 0.03);
  const sail = add(g, new THREE.CapsuleGeometry(0.5, 0.8, 6, 12), yel, [0.6, 1.35, 0], [0, 0, Math.PI / 2], [1, 1, 0.9], 0.04);
  add(g, new THREE.CylinderGeometry(0.32, 0.32, 0.16, 16), dark, [0.6, 1.9, 0], [0, 0, 0], null, 0.025);
  const beacon = add(g, new THREE.SphereGeometry(0.14, 12, 10), B(16724032), [0, 1.95, 0], [0, 0, 0], null, 0.02);
  add(g, new THREE.CylinderGeometry(0.42, 0.42, 1, 14), dark, [1.4, -1, 0], [0, 0, 0], null, 0.03);
  const sph = add(g, new THREE.SphereGeometry(1.08, 28, 20), white, [1.4, -1.75, 0], [0, 0, 0], null, 0.045);
  const ph = new THREE.Group();
  ph.position.copy(sph.position);
  const dir = V(1, -0.3, 0).normalize();
  ph.lookAt(ph.position.clone().add(dir));
  g.add(ph);
  add(ph, new THREE.TorusGeometry(0.3, 0.08, 10, 28), dark, [0, 0, 1.06], [0, 0, 0], null, 0.02);
  const glassMat = new THREE.MeshToonMaterial({ color: 1789578, gradientMap: gradTex, emissive: 2781104, emissiveIntensity: 0.6 });
  const glass = add(ph, new THREE.CircleGeometry(0.28, 28), glassMat, [0, 0, 1.08], [0, 0, 0], null, 0);
  const crCan = document.createElement("canvas");
  crCan.width = crCan.height = 256;
  const crTex = new THREE.CanvasTexture(crCan);
  const crack = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28), new THREE.MeshBasicMaterial({ map: crTex, transparent: true, depthWrite: false }));
  crack.position.z = 1.09;
  ph.add(crack);
  {
    const c = crCan.getContext("2d");
    c.strokeStyle = "rgba(255,255,255,.95)";
    c.lineWidth = 4;
    c.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      let x = 128 + (rnd(i, 3) - 0.5) * 30, y = 128 + (rnd(i, 4) - 0.5) * 30, a = i / 9 * 6.28 + rnd(i, 5);
      c.beginPath();
      c.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        a += (rnd(i, s + 9) - 0.5) * 0.9;
        x += Math.cos(a) * 22;
        y += Math.sin(a) * 22;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    c.beginPath();
    c.arc(128, 128, 30, 0, 6.28);
    c.stroke();
    crTex.needsUpdate = true;
  }
  const hoppers = [];
  for (const x of [-1.5, -0.2]) {
    const hg = new THREE.Group();
    hg.position.set(x, -1.35, 0);
    g.add(hg);
    add(hg, new THREE.CylinderGeometry(0.42, 0.42, 1, 16), dark, [0, 0, 0], [0, 0, 0], null, 0.03);
    add(hg, new THREE.ConeGeometry(0.42, 0.55, 16), dark, [0, -0.78, 0], [Math.PI, 0, 0], null, 0.03);
    const coil = add(hg, new THREE.TorusGeometry(0.16, 0.05, 8, 20), B(5232895), [0, -1.05, 0], [Math.PI / 2, 0, 0], null, 0.015);
    hoppers.push({ g: hg, coil });
  }
  for (const z of [-1, 1]) {
    add(g, new THREE.BoxGeometry(5, 0.14, 0.14), dark, [-0.3, -2.62, z], [0, 0, 0], null, 0.02);
    for (const x of [-2.1, 1.2]) add(g, new THREE.BoxGeometry(0.12, 1.2, 0.12), dark, [x, -2, z * 0.92], [0, 0, 0], null, 0.015);
  }
  for (const z of [-1.55, 1.55]) {
    add(g, new THREE.TorusGeometry(0.4, 0.12, 10, 22), teal, [-3, 0.1, z], [0, Math.PI / 2, 0], null, 0.02);
    add(g, new THREE.BoxGeometry(0.22, 0.16, 0.5), dark, [-3, 0.1, z * 0.78], [0, 0, 0], null, 0.015);
  }
  const lamps = [];
  for (const z of [-0.75, 0.75]) {
    add(g, new THREE.CylinderGeometry(0.17, 0.21, 0.32, 14), dark, [3.5, -0.5, z], [0, 0, Math.PI / 2], null, 0.02);
    lamps.push(add(g, new THREE.CircleGeometry(0.16, 16), B(16774872), [3.67, -0.5, z], [0, Math.PI / 2, 0], null, 0));
  }
  add(g, new THREE.CapsuleGeometry(0.08, 0.8, 4, 8), dark, [2.6, -2.1, -0.6], [0, 0, 1.2], null, 0.015);
  g.userData = { beacon, lamps, sph, ph, glass, glassMat, crack, dir, hoppers };
  return g;
}
function cyl(r1, r2, len, seg = 12) {
  const geo = new THREE.CapsuleGeometry((r1 + r2) / 2, len, 4, seg);
  geo.translate(0, -len / 2, 0);
  return geo;
}
function makeChibi() {
  const suit = T(16742943), suit2 = T(2830149), skin = T(16762528), hairM = T(5911584), white = T(15329778), blk = B(1313834), boot = T(2830149), cheek = B(16748442, { transparent: true, opacity: 0.55 });
  const J = {};
  const root = new THREE.Group();
  J.root = root;
  const spine = new THREE.Group();
  root.add(spine);
  J.spine = spine;
  add(spine, new THREE.CapsuleGeometry(0.2, 0.2, 6, 16), suit, [0, 0.25, 0], [0, 0, 0], [1.05, 1, 0.85], 0.016);
  add(spine, new THREE.BoxGeometry(0.2, 0.12, 0.04), suit2, [0, 0.3, 0.175], [0, 0, 0], null, 0.01);
  add(spine, new THREE.CircleGeometry(0.03, 12), B(5232895), [-0.05, 0.3, 0.196], [0, 0, 0], null, 0);
  add(spine, new THREE.CircleGeometry(0.02, 12), B(16765503), [0.04, 0.31, 0.196], [0, 0, 0], null, 0);
  add(spine, new THREE.TorusGeometry(0.13, 0.035, 8, 20), suit2, [0, 0.5, 0], [Math.PI / 2, 0, 0], null, 0.01);
  const neck = new THREE.Group();
  neck.position.y = 0.52;
  spine.add(neck);
  J.neck = neck;
  const head = new THREE.Group();
  head.position.y = 0.04;
  neck.add(head);
  J.head = head;
  add(head, new THREE.SphereGeometry(0.24, 28, 22), skin, [0, 0.22, 0], [0, 0, 0], [1, 0.95, 0.95], 0.016);
  add(head, new THREE.SphereGeometry(0.252, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, [0, 0.235, -0.015], [-0.35, 0, 0], null, 0.014);
  add(head, new THREE.SphereGeometry(0.09, 12, 10), hairM, [0.06, 0.44, 0.1], [0.4, 0, -0.3], [1.4, 0.7, 1], 0.012);
  add(head, new THREE.SphereGeometry(0.07, 12, 10), hairM, [-0.08, 0.43, 0.12], [0.6, 0, 0.4], [1.4, 0.7, 1], 0.012);
  for (const x of [-0.235, 0.235]) add(head, new THREE.SphereGeometry(0.05, 10, 8), skin, [x, 0.2, 0], [0, 0, 0], [0.6, 1, 1], 0.01);
  J.eyes = [];
  J.pupils = [];
  J.brows = [];
  J.lids = [];
  for (const x of [-0.085, 0.085]) {
    const eg = new THREE.Group();
    eg.position.set(x, 0.23, 0.2);
    head.add(eg);
    add(eg, new THREE.SphereGeometry(0.058, 16, 12), white, [0, 0, 0], [0, 0, 0], [1, 1.15, 0.45], 8e-3);
    const pu = new THREE.Group();
    eg.add(pu);
    add(pu, new THREE.SphereGeometry(0.034, 14, 10), blk, [0, 0, 0.02], [0, 0, 0], [1, 1.1, 0.5], 0);
    add(pu, new THREE.SphereGeometry(0.011, 8, 6), white, [0.012, 0.015, 0.04], [0, 0, 0], null, 0);
    const lid = add(eg, new THREE.SphereGeometry(0.062, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, [0, 0, 2e-3], [0, 0, 0], [1.02, 1.2, 0.5], 0);
    J.eyes.push(eg);
    J.pupils.push(pu);
    J.lids.push(lid);
    const br = add(head, new THREE.CapsuleGeometry(0.014, 0.07, 4, 8), hairM, [x, 0.325, 0.2], [0, 0, Math.PI / 2], null, 6e-3);
    J.brows.push(br);
  }
  for (const x of [-0.15, 0.15]) add(head, new THREE.CircleGeometry(0.035, 14), cheek, [x, 0.15, 0.215], [0, x * 2.5, 0], null, 0);
  add(head, new THREE.SphereGeometry(0.025, 10, 8), skin, [0, 0.18, 0.235], [0, 0, 0], null, 6e-3);
  const mouthG = new THREE.Group();
  mouthG.position.set(0, 0.105, 0.215);
  head.add(mouthG);
  J.mouths = {};
  J.mouths.smile = add(mouthG, new THREE.TorusGeometry(0.04, 0.011, 6, 16, Math.PI), blk, [0, 0.02, 0], [0, 0, Math.PI], null, 0);
  J.mouths.frown = add(mouthG, new THREE.TorusGeometry(0.035, 0.011, 6, 16, Math.PI), blk, [0, -0.015, 0], [0, 0, 0], null, 0);
  J.mouths.line = add(mouthG, new THREE.CapsuleGeometry(9e-3, 0.045, 4, 6), blk, [0, 0, 0], [0, 0, Math.PI / 2], null, 0);
  const om = new THREE.Group();
  mouthG.add(om);
  J.mouths.open = om;
  add(om, new THREE.SphereGeometry(0.05, 14, 10), B(5902368), [0, 0, 0], [0, 0, 0], [1, 1.25, 0.35], 8e-3);
  add(om, new THREE.SphereGeometry(0.03, 10, 8), B(16743818), [0, -0.03, 0.01], [0, 0, 0], [1.1, 0.6, 0.4], 0);
  add(head, new THREE.TorusGeometry(0.27, 0.022, 6, 24, Math.PI), suit2, [0, 0.24, -0.01], [0, 0, 0], null, 8e-3);
  for (const x of [-0.265, 0.265]) add(head, new THREE.CylinderGeometry(0.065, 0.065, 0.06, 16), suit2, [x, 0.2, 0], [0, 0, Math.PI / 2], null, 0.01);
  add(head, new THREE.CapsuleGeometry(0.01, 0.14, 4, 6), suit2, [-0.2, 0.08, 0.13], [0, -0.7, Math.PI / 2], null, 5e-3);
  add(head, new THREE.SphereGeometry(0.022, 8, 6), B(16730972), [-0.15, 0.08, 0.2], [0, 0, 0], null, 5e-3);
  const L1 = 0.17, L2 = 0.16;
  J.L1 = L1;
  J.L2 = L2;
  for (const [s, side] of [["l", 1], ["r", -1]]) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.22, 0.38, 0);
    spine.add(sh);
    add(sh, cyl(0.06, 0.055, L1), suit, [0, 0, 0], [0, 0, 0], null, 0.012);
    const el = new THREE.Group();
    el.position.y = -L1;
    sh.add(el);
    add(el, cyl(0.055, 0.05, L2), suit, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(el, new THREE.SphereGeometry(0.065, 14, 10), T(15988218), [0, -L2 - 0.03, 0], [0, 0, 0], null, 0.01);
    J[s + "Sh"] = sh;
    J[s + "El"] = el;
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.02, 0);
    root.add(hip);
    add(hip, cyl(0.075, 0.07, 0.19), suit, [0, 0, 0], [0, 0, 0], null, 0.012);
    const kn = new THREE.Group();
    kn.position.y = -0.19;
    hip.add(kn);
    add(kn, cyl(0.07, 0.065, 0.17), suit, [0, 0, 0], [0, 0, 0], null, 0.012);
    add(kn, new THREE.CapsuleGeometry(0.07, 0.08, 4, 10), boot, [0, -0.25, 0.05], [Math.PI / 2, 0, 0], null, 0.01);
    J[s + "Hip"] = hip;
    J[s + "Kn"] = kn;
  }
  return J;
}
function face(J, f) {
  const mo = f.mouth || "line";
  for (const k in J.mouths) J.mouths[k].visible = k === mo;
  if (mo === "open") J.mouths.open.scale.set(1, f.open || 1, 1);
  const bl = f.blink ? 0.08 : f.eye || 1;
  J.eyes.forEach((e, i) => {
    e.scale.set(1, bl, 1);
    e.scale.multiplyScalar(f.eyeS || 1);
  });
  J.lids.forEach((l) => {
    l.visible = (f.lid || 0) > 0;
    l.scale.y = 1.2 * (f.lid || 0);
  });
  const px = (f.look || [0, 0])[0], py = (f.look || [0, 0])[1];
  J.pupils.forEach((p) => {
    p.position.set(px * 0.022, py * 0.022, 0);
    p.scale.setScalar(f.pupil || 1);
  });
  const ba = f.brow || 0, by = f.browY || 0;
  J.brows.forEach((b, i) => {
    const s = i === 0 ? 1 : -1;
    b.rotation.z = Math.PI / 2 + s * ba;
    b.position.y = 0.325 + by;
  });
}
var R = (o, a) => {
  if (a) o.rotation.set(a[0] || 0, a[1] || 0, a[2] || 0);
};
function pose(J, p) {
  R(J.spine, p.spine || [0]);
  R(J.neck, p.neck || [0]);
  R(J.head, p.head || [0]);
  R(J.lSh, p.lSh || [0, 0, 0.15]);
  R(J.rSh, p.rSh || [0, 0, -0.15]);
  R(J.lEl, p.lEl || [-0.3]);
  R(J.rEl, p.rEl || [-0.3]);
  R(J.lHip, p.lHip || [-1.5, 0, 0.08]);
  R(J.rHip, p.rHip || [-1.5, 0, -0.08]);
  R(J.lKn, p.lKn || [1.45]);
  R(J.rKn, p.rKn || [1.45]);
}
var _q = new THREE.Quaternion();
var _q2 = new THREE.Quaternion();
function reach(J, side, target, bendAxis = V(1, 0, 0)) {
  const sh = J[side + "Sh"], el = J[side + "El"];
  sh.parent.updateMatrixWorld(true);
  const tl = sh.parent.worldToLocal(target.clone()).sub(sh.position);
  const L1 = J.L1, L2 = J.L2 + 0.03, d = clamp(tl.length(), 0.05, (L1 + L2) * 0.995);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const b = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const dir = tl.clone().normalize();
  _q.setFromUnitVectors(V(0, -1, 0), dir);
  let ax = new THREE.Vector3().crossVectors(dir, V(0, -1, 0));
  if (ax.lengthSq() < 1e-4) ax.set(1, 0, 0);
  ax.normalize();
  ax = bendAxis.clone().projectOnPlane(dir).normalize();
  if (!isFinite(ax.x) || ax.lengthSq() < 1e-4) ax.set(1, 0, 0);
  _q2.setFromAxisAngle(ax, a);
  sh.quaternion.copy(_q2.multiply(_q));
  el.rotation.set(0, 0, 0);
  const axL = ax.clone().applyQuaternion(sh.quaternion.clone().invert());
  el.quaternion.setFromAxisAngle(axL, -(Math.PI - b));
}
var ext = new THREE.Scene();
var extSky = makeSky(1727902, 133140);
ext.add(extSky);
var hemi = new THREE.HemisphereLight(11064575, 2106954, 2.2);
ext.add(hemi);
var dirL = new THREE.DirectionalLight(12575487, 1.4);
dirL.position.set(-6, 14, 10);
ext.add(dirL);
ext.fog = new THREE.FogExp2(399923, 0.03);
var FL = 220;
var FS = 120;
var fgeo = new THREE.PlaneGeometry(FL, FL, FS, FS);
fgeo.rotateX(-Math.PI / 2);
var floorH = (x, z) => (fbm(x * 0.06, z * 0.06) - 0.5) * 2;
{
  const p = fgeo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, floorH(p.getX(i), p.getZ(i)));
  fgeo.computeVertexNormals();
}
var floor = new THREE.Mesh(fgeo, T(9207710));
ext.add(floor);
var deco = new THREE.Group();
ext.add(deco);
for (let i = 0; i < 60; i++) {
  const x = (rnd(i, 1) - 0.5) * 70, z = (rnd(i, 2) - 0.5) * 70;
  if (Math.hypot(x, z) < 5) continue;
  const s = 0.25 + rnd(i, 3) * 0.8;
  add(deco, new THREE.DodecahedronGeometry(s, 0), T(rnd(i, 4) > 0.5 ? 7300496 : 8221856), [x, floorH(x, z) + s * 0.3, z], [rnd(i, 5) * 3, rnd(i, 6) * 3, 0], [1, 0.7, 1], 0.03);
}
for (let i = 0; i < 30; i++) {
  const x = 3 + rnd(i, 7) * 14, z = (rnd(i, 8) - 0.5) * 12, s = 0.14 + rnd(i, 9) * 0.2;
  add(deco, new THREE.SphereGeometry(s, 10, 8), T(15914928), [x, floorH(x, z) + s * 0.4, z], [0, 0, 0], [1, 0.6, 1], 0.015);
}
var sub = makeSub();
ext.add(sub);
var spots = [];
for (const z of [-0.75, 0.75]) {
  const sp = new THREE.SpotLight(16773328, 140, 50, 0.45, 0.5, 1.1);
  sp.position.set(3.7, -0.5, z);
  sp.target.position.set(12, -4.6, z * 2);
  sub.add(sp, sp.target);
  spots.push(sp);
}
var beamMat = new THREE.MeshBasicMaterial({ color: 13625855, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
var beams = [];
for (const z of [-0.75, 0.75]) {
  const geo = new THREE.ConeGeometry(3.2, 14, 24, 1, true);
  geo.translate(0, -7, 0);
  const b = new THREE.Mesh(geo, beamMat);
  b.position.set(3.7, -0.5, z);
  b.quaternion.setFromUnitVectors(V(0, -1, 0), V(8.3, -4.1, z).normalize());
  sub.add(b);
  beams.push(b);
}
var blob = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28), B(0, { transparent: true, opacity: 0.35, depthWrite: false }));
blob.rotation.x = -Math.PI / 2;
blob.scale.set(1.4, 1, 0.8);
ext.add(blob);
var fill = new THREE.PointLight(13163775, 0, 12, 1.4);
ext.add(fill);
var redL = new THREE.PointLight(16724032, 0, 8, 1.4);
redL.position.set(0, 2.3, 0);
sub.add(redL);
var SN = 1800;
var snowGeo = new THREE.BufferGeometry();
var snowPos = new Float32Array(SN * 3);
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
var snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: dotTex, color: 15267071, size: 0.09, transparent: true, opacity: 0.45, depthWrite: false }));
snow.frustumCulled = false;
ext.add(snow);
snow.layers.set(31);
function updSnow(t, vy, cam) {
  const Bx = 24, c = cam;
  for (let i = 0; i < SN; i++) {
    let x = rnd(i, 11) * Bx + Math.sin(t * 0.3 + i) * 0.3, y = rnd(i, 12) * Bx + vy * t, z = rnd(i, 13) * Bx;
    snowPos[i * 3] = ((x - c.x) % Bx + Bx) % Bx - Bx / 2 + c.x;
    snowPos[i * 3 + 1] = ((y - c.y) % Bx + Bx) % Bx - Bx / 2 + c.y;
    snowPos[i * 3 + 2] = ((z - c.z) % Bx + Bx) % Bx - Bx / 2 + c.z;
  }
  snowGeo.attributes.position.needsUpdate = true;
}
var BBN = 300;
var bubGeo = new THREE.BufferGeometry();
var bubPos = new Float32Array(BBN * 3);
bubGeo.setAttribute("position", new THREE.BufferAttribute(bubPos, 3));
var bubMat = new THREE.PointsMaterial({ map: dotTex, color: 16777215, size: 0.25, transparent: true, opacity: 0, depthWrite: false });
var bubs = new THREE.Points(bubGeo, bubMat);
bubs.frustumCulled = false;
ext.add(bubs);
bubs.layers.set(31);
function updBubbles(age, origin, spread = 1, op = 0.8) {
  for (let i = 0; i < BBN; i++) {
    const a = Math.max(0, age - rnd(i, 81) * 0.8);
    bubPos[i * 3] = origin.x + (rnd(i, 82) - 0.5) * spread * (1 + a) + Math.sin(a * 6 + i) * 0.1;
    bubPos[i * 3 + 1] = origin.y + a * (2 + rnd(i, 83) * 3);
    bubPos[i * 3 + 2] = origin.z + (rnd(i, 84) - 0.5) * spread * (1 + a);
  }
  bubGeo.attributes.position.needsUpdate = true;
  bubMat.opacity = age < 0 ? 0 : op * (1 - sm(1.5, 3, age));
}
var SHN = 700;
var shotM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 5), T(3947600), SHN);
shotM.frustumCulled = false;
ext.add(shotM);
var dummy = new THREE.Object3D();
var SDN = 1200;
var sedGeo = new THREE.BufferGeometry();
var sedPos = new Float32Array(SDN * 3);
sedGeo.setAttribute("position", new THREE.BufferAttribute(sedPos, 3));
var sedMat = new THREE.PointsMaterial({ map: dotTex, color: 13351384, size: 0.8, transparent: true, opacity: 0, depthWrite: false });
var sed = new THREE.Points(sedGeo, sedMat);
sed.frustumCulled = false;
ext.add(sed);
function updSed(age, cx, cz, st = 1) {
  for (let i = 0; i < SDN; i++) {
    const a = rnd(i, 21) * Math.PI * 2, sp = (0.5 + rnd(i, 22)) * 3.2 * st, r = sp * (1 - Math.exp(-age * 1.2)) + 1.5;
    sedPos[i * 3] = cx + Math.cos(a) * r;
    sedPos[i * 3 + 2] = cz + Math.sin(a) * r * 0.8;
    sedPos[i * 3 + 1] = floorH(cx, cz) + 0.1 + rnd(i, 23) * 1.6 * (1 - Math.exp(-age * 1.5)) * st;
  }
  sedGeo.attributes.position.needsUpdate = true;
  sedMat.opacity = age < 0 ? 0 : 0.5 * sm(0, 0.3, age) * Math.exp(-age * 0.25);
}
var amphGeo;
{
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.SphereGeometry(0.05 - Math.abs(i - 2) * 5e-3, 8, 6);
    s.scale(1.2, 0.9, 1);
    s.translate(i * 0.075 - 0.2, Math.sin(i / 5 * Math.PI) * 0.04, 0);
    parts.push(s.toNonIndexed());
  }
  for (const z of [-0.02, 0.02]) {
    const a = new THREE.BoxGeometry(0.18, 8e-3, 8e-3);
    a.rotateZ(0.35);
    a.rotateY(z * 10);
    a.translate(0.3, 0.07, z);
    parts.push(a.toNonIndexed());
  }
  for (let i = 0; i < 5; i++) for (const z of [-1, 1]) {
    const l = new THREE.BoxGeometry(8e-3, 0.08, 8e-3);
    l.rotateX(z * 0.5);
    l.translate(i * 0.07 - 0.15, -0.04, z * 0.03);
    parts.push(l.toNonIndexed());
  }
  amphGeo = mergeGeometries(parts);
  amphGeo.computeVertexNormals();
}
var amphMat = T(16769750, { emissive: 6701120, emissiveIntensity: 0.5 });
var amph = new THREE.InstancedMesh(amphGeo, amphMat, 60);
amph.frustumCulled = false;
amph.count = 0;
ext.add(amph);
var rings = [];
for (let i = 0; i < 5; i++) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 56), B(8384767, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  r.rotation.x = Math.PI / 2;
  ext.add(r);
  rings.push(r);
}
var arrows = new THREE.Group();
ext.add(arrows);
{
  const am = T(16730972);
  for (let i = 0; i < 14; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / 14), th = Math.PI * (1 + Math.sqrt(5)) * i, d = V(Math.cos(th) * Math.sin(phi), Math.cos(phi), Math.sin(th) * Math.sin(phi));
    const g = new THREE.Group();
    add(g, new THREE.ConeGeometry(0.2, 0.42, 12), am, [0, -0.21, 0], [Math.PI, 0, 0], null, 0.02);
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), am, [0, 0.25, 0], [0, 0, 0], null, 0.02);
    g.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    g.userData.d = d;
    arrows.add(g);
  }
}
var stCan = document.createElement("canvas");
stCan.width = 512;
stCan.height = 256;
var stTex = new THREE.CanvasTexture(stCan);
{
  const c = stCan.getContext("2d");
  c.strokeStyle = "#ff3a50";
  c.lineWidth = 5;
  c.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    let x = rnd(i, 91) * 512, y = 40 + rnd(i, 92) * 176, a = rnd(i, 93) * 6.28;
    c.beginPath();
    c.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      a += (rnd(i, s + 94) - 0.5) * 1.4;
      x += Math.cos(a) * 18;
      y += Math.sin(a) * 18;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  stTex.needsUpdate = true;
}
var stress = new THREE.Mesh(new THREE.SphereGeometry(1.095, 28, 20), new THREE.MeshBasicMaterial({ map: stTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
sub.userData.sph.add(stress);
var rov = new THREE.Group();
ext.add(rov);
{
  const y = T(16765503), d = T(2830149);
  add(rov, new THREE.BoxGeometry(1.6, 0.9, 1.1), y, [0, 0, 0], [0, 0, 0], null, 0.035);
  add(rov, new THREE.BoxGeometry(1.7, 0.2, 1.2), d, [0, -0.55, 0], [0, 0, 0], null, 0.02);
  for (const x of [-0.5, 0.5]) rov.userData["l" + x] = add(rov, new THREE.SphereGeometry(0.12, 10, 8), B(16774872), [x, -0.3, 0.58], [0, 0, 0], null, 0.01);
  add(rov, new THREE.CylinderGeometry(0.025, 0.025, 60, 6), d, [0, 30.4, 0], [0, 0, 0], null, 0);
}
var rovLight = new THREE.PointLight(16773328, 0, 25, 1.2);
rov.add(rovLight);
rovLight.position.set(0, -0.6, 0.6);
rov.visible = false;
var surfGeo = new THREE.PlaneGeometry(220, 220, 60, 60);
surfGeo.rotateX(Math.PI / 2);
var surf = new THREE.Mesh(surfGeo, new THREE.MeshBasicMaterial({ color: 12580095, side: THREE.DoubleSide, fog: false }));
surf.frustumCulled = false;
surf.visible = false;
ext.add(surf);
var surfBase = surfGeo.attributes.position.array.slice();
function updSurf(t, y0) {
  const a = surfGeo.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = surfBase[i * 3], z = surfBase[i * 3 + 2];
    a.setY(i, y0 + Math.sin(x * 0.35 + t * 1.3) * 0.45 + Math.cos(z * 0.4 + t) * 0.4);
  }
  a.needsUpdate = true;
}
var rayMat = new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
var sunRays = new THREE.Group();
ext.add(sunRays);
sunRays.visible = false;
for (let i = 0; i < 16; i++) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1 + rnd(i, 31) * 2.5, 70), rayMat);
  p.position.set((rnd(i, 32) - 0.5) * 40, -35, (rnd(i, 33) - 0.5) * 30);
  p.rotation.set(0, rnd(i, 34) * 3, (rnd(i, 35) - 0.5) * 0.35);
  sunRays.add(p);
}
var cab = new THREE.Scene();
cab.background = new THREE.Color(661048);
var cabHemi = new THREE.HemisphereLight(16773340, 2764896, 0.9);
cab.add(cabHemi);
var lamp = new THREE.PointLight(16767400, 1.5, 5, 1.5);
lamp.position.set(0, 0.95, 0.4);
cab.add(lamp);
var keyL = new THREE.DirectionalLight(16773344, 1);
keyL.position.set(1.5, 2, 5);
cab.add(keyL);
var alarm = new THREE.PointLight(16719920, 0, 6, 1.2);
alarm.position.set(0.6, 0.95, -0.3);
cab.add(alarm);
var scrGlow = new THREE.PointLight(6094784, 0.6, 1.6, 2);
cab.add(scrGlow);
var coldL = new THREE.PointLight(7321855, 0, 6, 1.2);
coldL.position.set(-0.8, 0.3, 0.6);
cab.add(coldL);
var RC = 1.25;
var CUT = 0.28;
var clip = [new THREE.Plane(V(0, 0, -1), CUT)];
var hullIn = T(8370121, { side: THREE.DoubleSide, clippingPlanes: clip });
var hullS = new THREE.Mesh(new THREE.SphereGeometry(RC, 32, 22), hullIn);
cab.add(hullS);
var hullOut = new THREE.Mesh(new THREE.SphereGeometry(RC + 0.12, 32, 22), T(15988218, { clippingPlanes: clip }));
cab.add(hullOut);
add(cab, new THREE.TorusGeometry(Math.sqrt(RC * RC - CUT * CUT) + 0.06, 0.08, 10, 56), T(16757530), [0, 0, CUT], [0, 0, 0], null, 0.025);
for (let i = 0; i < 6; i++) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(RC - 0.02, 0.018, 6, 48), T(6132648, { clippingPlanes: clip }));
  r.rotation.y = i / 6 * Math.PI;
  cab.add(r);
}
add(cab, new THREE.CylinderGeometry(1, 1, 0.08, 28), T(4015206), [0, -0.82, 0], [0, 0, 0], null, 0.015);
var seat = add(cab, new THREE.BoxGeometry(0.5, 0.14, 0.46), T(2830149), [0, -0.6, -0.25], [0, 0, 0], null, 0.015);
add(cab, new THREE.BoxGeometry(0.5, 0.55, 0.1), T(2830149), [0, -0.3, -0.5], [-0.12, 0, 0], null, 0.015);
var con = new THREE.Group();
con.position.set(-0.55, -0.38, 0.22);
con.rotation.y = 0.75;
cab.add(con);
add(con, new THREE.BoxGeometry(0.56, 0.42, 0.3), T(4015206), [0, 0, 0], [0, 0, 0], null, 0.015);
var scrCan = document.createElement("canvas");
scrCan.width = 512;
scrCan.height = 256;
var scrTex = new THREE.CanvasTexture(scrCan);
scrTex.colorSpace = THREE.SRGBColorSpace;
var scr = add(con, new THREE.PlaneGeometry(0.44, 0.22), B(16777215, { map: scrTex }), [0, 0.08, 0.162], [0, 0, 0], null, 0);
add(con, new THREE.BoxGeometry(0.48, 0.26, 0.01), T(1711406), [0, 0.08, 0.156], [0, 0, 0], null, 0);
var bigBtn = add(con, new THREE.CylinderGeometry(0.045, 0.05, 0.035, 16), B(16724032), [-0.13, -0.12, 0.17], [Math.PI / 2 - 0.3, 0, 0], null, 8e-3);
var swBase = add(con, new THREE.BoxGeometry(0.09, 0.13, 0.03), T(16765503), [0.16, -0.12, 0.16], [0, 0, 0], null, 8e-3);
var lever = new THREE.Group();
lever.position.set(0.16, -0.12, 0.18);
con.add(lever);
add(lever, new THREE.CapsuleGeometry(0.014, 0.07, 4, 8), T(13685984), [0, 0.04, 0], [0, 0, 0], null, 5e-3);
add(lever, new THREE.SphereGeometry(0.025, 10, 8), B(16724032), [0, 0.09, 0], [0, 0, 0], null, 5e-3);
var leds = [];
for (let i = 0; i < 4; i++) leds.push(add(con, new THREE.SphereGeometry(0.016, 8, 6), B([6094746, 16765503, 5232895, 6094746][i]), [-0.02 + i * 0.045, -0.1, 0.16], [0, 0, 0], null, 0));
var pdir = V(-1, -0.05, 0.35).normalize();
var pg = new THREE.Group();
pg.position.copy(pdir.clone().multiplyScalar(RC - 0.03));
pg.lookAt(0, 0, 0);
cab.add(pg);
add(pg, new THREE.TorusGeometry(0.27, 0.065, 10, 28), T(2830149), [0, 0, 0], [0, 0, 0], null, 0.012);
var pglassMat = B(795472);
var pglass = add(pg, new THREE.CircleGeometry(0.26, 28), pglassMat, [0, 0, 0.01], [0, 0, 0], null, 0);
var camph = new THREE.InstancedMesh(amphGeo, amphMat, 70);
camph.frustumCulled = false;
camph.count = 0;
pg.add(camph);
for (const x of [0.52, 0.78]) add(cab, new THREE.CapsuleGeometry(0.11, 0.42, 6, 14), T(4181882), [x, -0.42, -0.75], [0, 0, 0.08], null, 0.015);
var scrub = add(cab, new THREE.BoxGeometry(0.3, 0.36, 0.26), T(9081784), [0.82, -0.1, -0.2], [0, 0, 0], null, 0.015);
add(cab, new THREE.CylinderGeometry(0.08, 0.08, 0.22, 14), T(15988218), [0.82, 0.17, -0.2], [0, 0, 0], null, 0.012);
var lampM = add(cab, new THREE.CapsuleGeometry(0.04, 0.22, 4, 10), B(16773580), [0, 1.12, -0.05], [0, 0, Math.PI / 2], null, 0.01);
var alarmM = add(cab, new THREE.SphereGeometry(0.07, 12, 10), B(5574672), [0.6, 1.03, -0.3], [0, 0, 0], null, 0.01);
var man = makeChibi();
man.root.position.set(0.02, -0.43, -0.2);
man.root.rotation.y = -0.25;
cab.add(man.root);
var molG = new THREE.Group();
cab.add(molG);
var mols = [];
for (let i = 0; i < 14; i++) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.035, 10, 8), T(3159114), [0, 0, 0], [0, 0, 0], null, 6e-3);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.028, 10, 8), T(16730972), [s * 0.055, 0, 0], [0, 0, 0], null, 6e-3);
  molG.add(g);
  mols.push(g);
}
var BN = 80;
var brGeo = new THREE.BufferGeometry();
var brPos = new Float32Array(BN * 3);
brGeo.setAttribute("position", new THREE.BufferAttribute(brPos, 3));
var brMat = new THREE.PointsMaterial({ map: dotTex, color: 16777215, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
var breath = new THREE.Points(brGeo, brMat);
breath.frustumCulled = false;
cab.add(breath);
breath.layers.set(31);
var sweat = add(cab, new THREE.SphereGeometry(0.03, 10, 8), B(9429247), [0, 0, 0], [0, 0, 0], [0.8, 1.3, 0.8], 6e-3);
sweat.visible = false;
function drawScreen(mode, t, val) {
  const c = scrCan.getContext("2d");
  const fit = (txt, size, x, y, maxW, align = "left") => {
    txt = TR(txt);
    let sz = size;
    c.font = `900 ${sz}px R, RL`;
    while (c.measureText(txt).width > maxW && sz > 10) {
      sz -= 2;
      c.font = `900 ${sz}px R, RL`;
    }
    c.textAlign = align;
    c.textBaseline = "alphabetic";
    c.fillText(txt, x, y);
  };
  if (mode === "off") {
    c.fillStyle = "#000";
    c.fillRect(0, 0, 512, 256);
    scrTex.needsUpdate = true;
    return;
  }
  c.fillStyle = "#062a2a";
  c.fillRect(0, 0, 512, 256);
  if (mode === "error") {
    const on = Math.floor(t * 3) % 2 === 0;
    c.fillStyle = on ? "#ff3040" : "#4a0a10";
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = "#fff";
    fit("\u041E\u0428\u0418\u0411\u041A\u0410", 64, 256, 120, 420, "center");
    fit("\u0441\u0431\u0440\u043E\u0441 \u0431\u0430\u043B\u043B\u0430\u0441\u0442\u0430", 34, 256, 180, 420, "center");
  } else if (mode === "nosig") {
    c.fillStyle = "#300";
    c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 400; i++) {
      c.fillStyle = hash(i, Math.floor(t * 20)) > 0.5 ? "#555" : "#222";
      c.fillRect(hash(i, 3 + Math.floor(t * 20)) * 512, hash(i, 7 + Math.floor(t * 20)) * 256, 8, 4);
    }
    c.fillStyle = "#ff4b5c";
    fit("\u041D\u0415\u0422 \u0421\u0418\u0413\u041D\u0410\u041B\u0410", 52, 256, 145, 420, "center");
  } else {
    const red = mode === "co2" || mode === "low";
    const col = red ? "#ff5a5a" : "#5cff9a";
    c.fillStyle = col;
    fit(mode === "co2" ? "CO\u2082" : "\u0412\u041E\u0417\u0414\u0423\u0425", 40, 40, 64, 300);
    fit(mode === "co2" ? val.toFixed(1) + "%" : String(Math.floor(val)).padStart(3, "0") + " \u0447", 92, 40, 172, 410);
    c.fillStyle = "rgba(255,255,255,.18)";
    c.fillRect(40, 196, 432, 26);
    c.fillStyle = col;
    c.fillRect(40, 196, 432 * clamp(mode === "co2" ? val / 5 : val / 112), 26);
  }
  scrTex.needsUpdate = true;
}
var pls = new THREE.Scene();
pls.add(makeSky(2781142, 662858));
pls.add(new THREE.HemisphereLight(16777215, 3359863, 2));
{
  const d = new THREE.DirectionalLight(16777215, 1.6);
  d.position.set(3, 6, 5);
  pls.add(d);
}
add(pls, new THREE.CylinderGeometry(1.6, 1.8, 0.4, 32), T(5983190), [0, -0.2, 0], [0, 0, 0], null, 0.03);
var pman = makeChibi();
pman.root.position.set(0, 0.4, 0);
pls.add(pman.root);
pose(pman, { lHip: [0, 0, 0.05], rHip: [0, 0, -0.05], lKn: [0], rKn: [0], lSh: [0, 0, 2.6], rSh: [0, 0, -2.6], lEl: [0, 0, 0.6], rEl: [0, 0, -0.6] });
var planeGeo;
{
  const p = [];
  const f = new THREE.CapsuleGeometry(0.12, 0.9, 4, 10);
  f.rotateZ(Math.PI / 2);
  p.push(f.toNonIndexed());
  const w = new THREE.BoxGeometry(0.28, 0.04, 1.2);
  p.push(w.toNonIndexed());
  const tw = new THREE.BoxGeometry(0.14, 0.03, 0.45);
  tw.translate(-0.5, 0.04, 0);
  p.push(tw.toNonIndexed());
  const tf = new THREE.BoxGeometry(0.16, 0.28, 0.03);
  tf.translate(-0.52, 0.16, 0);
  p.push(tf.toNonIndexed());
  planeGeo = mergeGeometries(p);
  planeGeo.computeVertexNormals();
}
var planes = [];
var planeMats = [T(15988218), T(16765503), T(5232895), T(16742943)];
for (let i = 0; i < 50; i++) {
  const m = add(pls, planeGeo, planeMats[i % 4], [0, 0, 0], [0, 0, 0], [1.5, 1.5, 1.5], 0.015);
  m.visible = false;
  planes.push(m);
}
var top = new THREE.Scene();
top.add(makeSky(6970328, 16752752));
var sunM = add(top, new THREE.CircleGeometry(16, 40), B(16773824, { fog: false }), [-50, 26, -240], [0, 0, 0], null, 0);
top.add(new THREE.HemisphereLight(16769224, 4478344, 1.8));
{
  const d = new THREE.DirectionalLight(16765088, 2.4);
  d.position.set(-30, 25, -40);
  top.add(d);
  const d2 = new THREE.DirectionalLight(10533119, 0.8);
  d2.position.set(20, 10, 30);
  top.add(d2);
}
top.fog = new THREE.Fog(16755082, 70, 260);
var seaGeo = new THREE.PlaneGeometry(400, 400, 90, 90);
seaGeo.rotateX(-Math.PI / 2);
var sea = new THREE.Mesh(seaGeo, T(3112912));
top.add(sea);
var seaBase = seaGeo.attributes.position.array.slice();
var sub2 = makeSub();
top.add(sub2);
var tman = makeChibi();
tman.root.scale.setScalar(2.2);
sub2.add(tman.root);
tman.root.position.set(0.6, 1.6, 0);
tman.root.rotation.y = Math.PI / 2 - 0.2;
function makeShip() {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(14, 2.4, 4), T(15988218), [0, 0.3, 0], [0, 0, 0], null, 0.06);
  add(g, new THREE.BoxGeometry(13.6, 1, 4.1), T(16730972), [0, -0.8, 0], [0, 0, 0], null, 0.05);
  add(g, new THREE.BoxGeometry(4, 2.2, 3.2), T(16777215), [2.5, 2.6, 0], [0, 0, 0], null, 0.05);
  add(g, new THREE.BoxGeometry(0.06, 0.6, 2.8), T(2830149), [4.52, 3, 0], [0, 0, 0], null, 0);
  add(g, new THREE.BoxGeometry(0.3, 5, 0.3), T(16757530), [-5, 3.5, 0], [0, 0, 0.5], null, 0.04);
  return g;
}
var ship2 = makeShip();
ship2.position.set(-16, 0, -22);
ship2.rotation.y = 0.5;
top.add(ship2);
var $ = (id) => document.getElementById(id);
if (!PORT) document.getElementById("badge").style.top = "60px";
var capEl = $("cap");
var badge = $("badge");
var cards = $("cards");
var full = $("full");
var strokeShadow = (w, c) => {
  const a = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 16 * Math.PI * 2;
    a.push(`${(Math.cos(t) * w).toFixed(1)}px ${(Math.sin(t) * w).toFixed(1)}px 0 ${c}`);
  }
  return a.join(",") + `,0 ${w + 6}px 0 ${c}`;
};
capEl.style.textShadow = strokeShadow(3, "#000").replace(/,0 \d+px 0 #000$/, "") + ", 0 4px 14px rgba(0,0,0,.45)";
var bub = $("bub");
var bctx = bub.getContext("2d");
bub.width = W / 2;
bub.height = H / 2;
var BW = W / 2;
var BH = H / 2;
function drawBubbles(p) {
  bctx.clearRect(0, 0, BW, BH);
  if (p <= 0 || p >= 1) return;
  const cov = p < 0.5 ? eio(p * 2) : eio((1 - p) * 2);
  for (let i = 0; i < 70; i++) {
    const x = rnd(i, 101) * BW, y = rnd(i, 102) * BH + (1 - cov) * 300 * (p < 0.5 ? 1 : -1), r = cov * (90 + rnd(i, 103) * 110);
    bctx.fillStyle = ["#1a1033", "#2b1f66", "#3a2a8a"][i % 3];
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
var gl2 = $("glitch");
var gctx = gl2.getContext("2d");
function drawGlitch(a, t) {
  gl2.style.opacity = a;
  if (a <= 0) return;
  const f = Math.floor(t * 24);
  for (let y = 0; y < 480; y += 4) {
    const v = hash(y, f);
    gctx.fillStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
    gctx.fillRect(0, y, 270, 4);
  }
  gctx.fillStyle = "rgba(255,0,60,.25)";
  gctx.fillRect(0, hash(f, 9) * 480, 270, 30);
}
var fmtN = (n) => LANG === "en" ? Math.round(n).toLocaleString("en-US") : Math.round(n).toLocaleString("ru-RU").replace(/[\u00a0\u202f,]/g, " ");
function card(top2, inner, a) {
  inner = TR(inner);
  if (!PORT) top2 = 150;
  return `<div class="card" style="top:${top2}px;${PORT ? "" : "left:79%;"}transform:translateX(-50%) scale(${eob(a) * 0.9 + 0.1 * a});opacity:${clamp(a * 3)}">${inner}</div>`;
}
function cardsFor(s, lt, k) {
  const a = sm(0.15, 0.45, lt), e = (x) => eio(clamp(x));
  switch (s.scene) {
    case "descent": {
      const d = 1e3 * e(k * 1.1) + 0;
      return card(350, `<div class="t">\u0433\u043B\u0443\u0431\u0438\u043D\u0430</div><div class="v">${fmtN(lerp(0, 1200, e(k)))} <small>\u043C</small></div><div class="n">\u0441\u043E\u043B\u043D\u0435\u0447\u043D\u044B\u0439 \u0441\u0432\u0435\u0442 \u2014 \u0432\u0441\u0451</div>`, a);
    }
    case "crack":
      return card(350, `<div class="t">\u0433\u043B\u0443\u0431\u0438\u043D\u0430</div><div class="v">${fmtN(lerp(8800, 9050, k))} <small>\u043C</small></div>`, a);
    case "abyss":
      return card(350, `<div class="t">\u043D\u0430\u0434 \u0442\u043E\u0431\u043E\u0439</div><div class="v">10 935 <small>\u043C</small></div><div class="n">\u0432\u043E\u0434\u044B</div>`, sm(0.5, 0.9, lt));
    case "planes": {
      const n = Math.min(50, Math.floor(e(k / 0.85) * 50));
      return card(350, `<div class="t">\u0434\u0430\u0432\u043B\u0435\u043D\u0438\u0435</div><div class="v">\xD7 ${n} <small>\u0441\u0430\u043C\u043E\u043B\u0451\u0442\u043E\u0432</small></div><div class="n">\u2248 1 100 \u0430\u0442\u043C\u043E\u0441\u0444\u0435\u0440</div>`, a);
    }
    case "hullStress":
      return card(350, `<div class="t">\u043A\u043E\u0440\u043F\u0443\u0441</div><div class="v">9 <small>\u0441\u043C \u0442\u0438\u0442\u0430\u043D\u0430</small></div><div class="n">\u0430 \u0441\u043D\u0430\u0440\u0443\u0436\u0438 \u2014 1 100 \u0430\u0442\u043C</div>`, a);
    case "cabAir": {
      const p1 = sm(0.1, 0.4, k), p2 = sm(0.45, 0.8, k);
      return card(350, `<div class="t">\u0437\u0430\u043F\u0430\u0441 \u0432\u043E\u0437\u0434\u0443\u0445\u0430</div><div class="v">${p2 > 0.5 ? "112" : p1 > 0.5 ? "16 + 96" : "16"} <small>\u0447</small></div><div class="bar"><div style="width:${14.3 * p1}%;background:#5cff9a"></div><div style="width:${85.7 * p2}%;background:#ffd23f"></div></div><div class="n">\u2248 4,5 \u0434\u043D\u044F</div>`, a);
    }
    case "cabCO2": {
      const v = lerp(0.8, 3.2, e(k));
      return card(350, `<div class="t">CO\u2082 \u0432 \u043A\u0430\u0431\u0438\u043D\u0435</div><div class="v" style="color:${v > 2 ? "#ff4b5c" : "#1a1033"}">${v.toFixed(1)} <small>%</small></div><div class="bar"><div style="width:${v / 5 * 100}%;background:linear-gradient(90deg,#ffd23f,#ff4b5c)"></div></div>`, a);
    }
    case "cabCold":
      return card(350, `<div class="t">\u0432 \u043A\u0430\u0431\u0438\u043D\u0435</div><div class="v" style="color:#2b8cff">+7 <small>\xB0C</small></div><div class="n">\u0437\u0430 \u0431\u043E\u0440\u0442\u043E\u043C +2 \xB0C</div>`, a);
    case "sonar": {
      const v = Math.min(7.3, k * 1.25 * 7.3);
      return card(350, `<div class="t">\u0441\u0438\u0433\u043D\u0430\u043B \u0434\u043E \u043F\u043E\u0432\u0435\u0440\u0445\u043D\u043E\u0441\u0442\u0438</div><div class="v">${v.toFixed(1)} <small>\u0441\u0435\u043A</small></div><div class="n">\u0437\u0432\u0443\u043A \u0432 \u0432\u043E\u0434\u0435 \u2248 1 500 \u043C/\u0441</div>`, a);
    }
    case "cabHead": {
      const v = lerp(3.4, 4.6, e(k));
      return card(350, `<div class="t">CO\u2082 \u0432 \u043A\u0430\u0431\u0438\u043D\u0435</div><div class="v" style="color:#ff4b5c">${v.toFixed(1)} <small>%</small></div><div class="n">\u043F\u043E\u0433\u043B\u043E\u0442\u0438\u0442\u0435\u043B\u044C: \u043F\u043E\u0447\u0442\u0438 \u0432\u0441\u0451</div>`, a);
    }
    case "ascent": {
      const d = 10935 * (1 - e(k * 1.02));
      return card(350, `<div class="t">\u0433\u043B\u0443\u0431\u0438\u043D\u0430</div><div class="v">${fmtN(d)} <small>\u043C</small></div><div class="n">\u043F\u043E\u0434\u044A\u0451\u043C \u2248 3 \u0447\u0430\u0441\u0430</div>`, a);
    }
  }
  return "";
}
function fullFor(s, lt, k) {
  return TR(fullFor0(s, lt, k));
}
function fullFor0(s, lt, k) {
  if (s.scene === "trieste") {
    const z = 1 + k * 0.06, a = sm(0, 0.25, lt);
    return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${0.75 * a})"></div><div style="position:absolute;left:50%;top:${PORT ? 420 : 90}px;width:${PORT ? 820 : 700}px;transform:translateX(-50%) rotate(${lerp(-4, -2, k)}deg) scale(${z * (0.85 + 0.15 * eob(sm(0, 0.35, lt)))});opacity:${a};background:#f4e6c8;border:8px solid #1a1033;border-radius:18px;box-shadow:0 16px 0 #1a1033;padding:34px;color:#3a2a1a;text-align:center">
    <svg viewBox="0 0 400 200" width="${PORT ? 740 : 620}" height="${PORT ? 370 : 310}"><rect width="400" height="200" fill="#e8d3a8"/><g stroke="#3a2a1a" stroke-width="4" fill="#cbb48a"><rect x="60" y="50" width="280" height="56" rx="28"/><rect x="170" y="28" width="60" height="26" rx="6"/><circle cx="215" cy="140" r="30" fill="#bfa77c"/><rect x="205" y="104" width="20" height="10"/><path d="M110 106 l20 36 h20 l20 -36 Z" fill="#a8916a"/><path d="M250 106 l20 36 h20 l20 -36 Z" fill="#a8916a"/></g><circle cx="230" cy="138" r="7" fill="#3a2a1a"/><g fill="#3a2a1a" opacity=".35">${Array.from({ length: 40 }, (_, i) => `<circle cx="${hash(i, 1) * 400}" cy="${hash(i, 2) * 200}" r="${1 + hash(i, 3) * 2}"/>`).join("")}</g></svg>
    <div style="font-weight:900;font-size:72px;margin-top:14px;color:#1a1033">\xAB\u0422\u0420\u0418\u0415\u0421\u0422\xBB</div><div style="font-weight:700;font-size:36px">23 \u044F\u043D\u0432\u0430\u0440\u044F 1960 \xB7 \u2248 10 900 \u043C</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:8px">\u043D\u0430 9 \u043A\u043C \u0442\u0440\u0435\u0441\u043D\u0443\u043B\u043E \u0432\u043D\u0435\u0448\u043D\u0435\u0435 \u0441\u0442\u0435\u043A\u043B\u043E</div></div>`;
  }
  if (s.scene === "fish") {
    const x0 = PORT ? 140 : 560, y0 = PORT ? 330 : 110, y1 = PORT ? 1260 : 820, yd = (km) => y0 + (y1 - y0) * km / 11, a = sm(0, 0.25, lt), fy = yd(lerp(0, 8.3, eio(sm(0.05, 0.55, k))));
    let svg = `<svg width="${W}" height="${H}"><defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fa8ff"/><stop offset=".4" stop-color="#1a3d9e"/><stop offset="1" stop-color="#0a0830"/></linearGradient></defs><rect x="${x0}" y="${y0}" width="800" height="${y1 - y0}" rx="30" fill="url(#og)" stroke="#1a1033" stroke-width="8"/>`;
    for (let km = 0; km <= 10; km += 2) svg += `<text x="${x0 + 30}" y="${yd(km) + 12}" fill="#fff" font-family="R,RL" font-weight="700" font-size="34" opacity=".7">${km} \u043A\u043C</text>`;
    svg += `<line x1="${x0}" x2="${x0 + 800}" y1="${yd(8.3)}" y2="${yd(8.3)}" stroke="#ffd23f" stroke-width="6" stroke-dasharray="18 12" opacity="${sm(0.5, 0.6, k)}"/><text x="${x0 + 400}" y="${yd(8.3) - 20}" fill="#ffd23f" font-family="R,RL" font-weight="900" font-size="46" text-anchor="middle" opacity="${sm(0.5, 0.6, k)}" dy="-40">\u043F\u0440\u0435\u0434\u0435\u043B \u0440\u044B\u0431 \u2248 8,3 \u043A\u043C</text>`;
    svg += `<g transform="translate(${x0 + 650},${fy})"><ellipse rx="70" ry="34" fill="#ff9ab0" stroke="#1a1033" stroke-width="7"/><path d="M-66 0 l-46 -34 v68 Z" fill="#ff9ab0" stroke="#1a1033" stroke-width="7"/><circle cx="34" cy="-8" r="10" fill="#1a1033"/></g>`;
    svg += `<g transform="translate(${x0 + 400},${yd(10.935) - 40})"><rect x="-80" y="-30" width="160" height="56" rx="28" fill="#ffb31a" stroke="#1a1033" stroke-width="7"/><circle cx="34" cy="34" r="24" fill="#f3f5fa" stroke="#1a1033" stroke-width="7"/></g><text x="${x0 + 600}" y="${yd(10.935) - 30}" fill="#fff" font-family="R,RL" font-weight="900" font-size="44">\u0442\u044B</text></svg>`;
    return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${0.85 * a})"></div><div style="position:absolute;inset:0;opacity:${a}">${svg}</div>`;
  }
  if (s.scene === "robots") {
    const c = (y, name, yr, txt, at) => {
      const aa = sm(at, at + 0.12, k);
      return `<div style="position:absolute;left:50%;top:${y}px;width:760px;transform:translateX(-50%) rotate(${y > 700 ? 2 : -2}deg) scale(${0.6 + 0.4 * eob(aa)});opacity:${clamp(aa * 3)};background:#fff;border:7px solid #1a1033;border-radius:28px;box-shadow:0 12px 0 #1a1033;padding:26px 30px;color:#1a1033;text-align:left;display:flex;gap:26px;align-items:center"><svg width="150" height="110" viewBox="0 0 150 110"><rect x="15" y="20" width="120" height="66" rx="12" fill="#ffd23f" stroke="#1a1033" stroke-width="7"/><circle cx="50" cy="70" r="9" fill="#fff6d8" stroke="#1a1033" stroke-width="5"/><circle cx="100" cy="70" r="9" fill="#fff6d8" stroke="#1a1033" stroke-width="5"/><line x1="75" y1="0" x2="75" y2="20" stroke="#1a1033" stroke-width="6"/><path d="M10 10 L140 100 M140 10 L10 100" stroke="#ff4b5c" stroke-width="14" stroke-linecap="round" opacity="${sm(at + 0.1, at + 0.18, k)}"/></svg><div><div style="font-weight:900;font-size:54px">${name} <span style="color:#ff4b5c">${yr}</span></div><div style="font-weight:700;font-size:32px;opacity:.85">${txt}</div></div></div>`;
    };
    return c(PORT ? 330 : 130, "\xAB\u041A\u0430\u0439\u043A\u043E\xBB", "2003", "\u043E\u0431\u043E\u0440\u0432\u0430\u043B\u0441\u044F \u0442\u0440\u043E\u0441 \u2014 \u043F\u043E\u0442\u0435\u0440\u044F\u043D", 0.35) + c(PORT ? 620 : 400, "\xAB\u041D\u0435\u0440\u0435\u0439\xBB", "2014", "\u0440\u0430\u0437\u0434\u0430\u0432\u0438\u043B\u043E \u043D\u0430 \u0433\u043B\u0443\u0431\u0438\u043D\u0435 9,9 \u043A\u043C", 0.6);
  }
  return "";
}
var LANDY = 2.82;
function waterEnv(top2, bot, fogC, dens) {
  extSky.material.uniforms.a.value.set(top2);
  extSky.material.uniforms.b.value.set(bot);
  ext.fog.color.set(fogC);
  ext.fog.density = dens;
}
function resetExt() {
  sub.position.set(0, LANDY, 0);
  sub.rotation.set(0, 0, 0);
  floor.visible = deco.visible = blob.visible = true;
  arrows.visible = false;
  rings.forEach((r) => r.material.opacity = 0);
  amph.count = 0;
  shotM.count = 0;
  sedMat.opacity = 0;
  bubMat.opacity = 0;
  surf.visible = false;
  sunRays.visible = false;
  rov.visible = false;
  rovLight.intensity = 0;
  spots.forEach((s) => s.intensity = 140);
  beams.forEach((b) => b.visible = true);
  hemi.intensity = 2.2;
  dirL.intensity = 1.4;
  fill.intensity = 0;
  redL.intensity = 0;
  stress.material.opacity = 0;
  sub.userData.crack.visible = false;
  sub.userData.hoppers.forEach((h) => {
    h.g.children[0].material = h.g.children[0].userData.m0 || h.g.children[0].material;
    h.coil.material.color.set(5232895);
  });
  sub.userData.beacon.material.color.set(16724032);
  waterEnv(1194618, 133140, 532554, 0.03);
}
function beaconBlink(t, f = 1.2) {
  const on = t * f % 1 < 0.18;
  sub.userData.beacon.material.color.set(on ? 16724032 : 4196880);
  redL.intensity = on ? 5 : 0;
}
var freeFloat = () => {
  floor.visible = deco.visible = blob.visible = false;
};
function shotExt(s, lt, k, t) {
  resetExt();
  let vy = 0.15;
  const sc = s.scene;
  const U = sub.userData;
  if (sc === "descent") {
    freeFloat();
    sub.position.set(0, 80, 0);
    sub.rotation.z = Math.sin(t * 0.7) * 0.03;
    const dk = sm(0, 1, k);
    waterEnv(new THREE.Color(4172031).lerp(new THREE.Color(731750), dk).getHex(), new THREE.Color(1727928).lerp(new THREE.Color(133140), dk).getHex(), new THREE.Color(2785232).lerp(new THREE.Color(399930), dk).getHex(), 0.02);
    hemi.intensity = lerp(3, 1.6, k);
    sunRays.visible = true;
    sunRays.position.set(0, 110, 0);
    rayMat.opacity = 0.13 * (1 - dk);
    spots.forEach((s2) => s2.intensity = 140 * sm(0.4, 0.7, k));
    beams.forEach((b) => b.visible = k > 0.45);
    const a = 0.5 + k * 0.7;
    setCam(V(Math.cos(a) * 12, 81.5 + 2 * (1 - k), Math.sin(a) * 12), V(0.5, 79.6, 0), t);
    vy = 6;
  } else if (sc === "crack") {
    freeFloat();
    sub.position.set(0, 80, 0);
    const hit = 0.28;
    const ht = lt - s.dur * hit;
    waterEnv(731750, 133140, 399930, 0.03);
    U.crack.visible = ht > 0;
    U.crack.scale.setScalar(ht > 0 ? eob(clamp(ht * 6)) : 0.01);
    shake = ht > 0 ? 0.25 * Math.exp(-ht * 4) : 0;
    const sp = U.sph.getWorldPosition(V(0, 0, 0)), pp = sp.clone().add(U.dir.clone().multiplyScalar(1.1));
    const cp = pp.clone().add(U.dir.clone().multiplyScalar(lerp(3.2, 1.6, eio(k)))).add(V(0, 0.35, 0.9 - k * 0.5));
    setCam(cp, pp, t);
    fill.position.copy(cp).add(V(0, 1, 1));
    fill.intensity = 4;
    updBubbles(ht, pp, 0.6, 0.9);
    vy = 5;
  } else if (sc === "abyss") {
    const land = eio(clamp(k / 0.3));
    sub.position.y = lerp(7, LANDY, land);
    updSed(lt - s.dur * 0.28, 1, 0, 1);
    shake = lt > s.dur * 0.28 ? 0.15 * Math.exp(-(lt - s.dur * 0.28) * 5) : 0;
    const up = eio(sm(0.4, 1, k));
    waterEnv(731750, 66572, 199710, lerp(0.03, 0.012, up));
    setCam(V(lerp(9, 6, up), lerp(2.2, 60, up), lerp(10, 8, up)), V(0, lerp(2.4, 0, up), 0), t);
    beaconBlink(t);
  } else if (sc === "hullStress") {
    arrows.visible = true;
    const sp = U.sph.getWorldPosition(V(0, 0, 0));
    arrows.position.copy(sp);
    arrows.children.forEach((a2, i) => a2.position.copy(a2.userData.d).multiplyScalar(1.6 + 0.2 * Math.sin(t * 6 + i) + 2.5 * (1 - eob(sm(0, 0.3, k)))));
    stress.material.opacity = sm(0.3, 0.6, k) * (0.6 + 0.4 * Math.sin(t * 10));
    shake = 0.02 * sm(0.3, 0.6, k);
    const a = -0.15 + k * 0.35;
    setCam(V(sp.x + Math.cos(a) * 6.2, sp.y + 0.5, sp.z + Math.sin(a) * 6.2 + 1.2), sp.clone().add(V(0, 0.4, 0)), t);
    fill.position.set(sp.x + 4, sp.y + 2, sp.z + 3);
    fill.intensity = 3;
  } else if (sc === "sonar") {
    beaconBlink(t);
    rings.forEach((r, i) => {
      const ph = (lt * 0.5 + i / rings.length) % 1;
      r.position.set(0, 3 + ph * 30, 0);
      r.scale.setScalar(1 + ph * 16);
      r.material.opacity = (1 - ph) * sm(0, 0.08, ph);
    });
    setCam(V(16, 1.5 + k * 2, 18), V(0, 9 + k * 4, 0), t);
  } else if (sc === "robotLights") {
    rov.visible = true;
    const d = eio(clamp(k / 0.6));
    rov.position.set(1.5, lerp(30, 9, d), 4);
    const cut = k > 0.66;
    rovLight.intensity = cut ? 0 : 14;
    rov.userData["l-0.5"].material.color.set(cut ? 2236962 : 16774872);
    setCam(V(5, 1.2, 9), V(1.5, 8, 3), t);
    shake = cut ? 0.05 * Math.exp(-(k - 0.66) * 10) : 0;
  } else if (sc === "magnets") {
    const h = U.hoppers[1];
    const hp = h.g.getWorldPosition(V(0, 0, 0));
    U.hoppers.forEach((hh) => {
      const m = hh.g.children[0];
      if (!m.userData.m0) m.userData.m0 = m.material;
      m.material = new THREE.MeshToonMaterial({ color: 9427199, gradientMap: gradTex, transparent: true, opacity: 0.22, depthWrite: false });
      hh.coil.material.color.set(Math.sin(t * 8) > 0 ? 8384767 : 3123455);
    });
    shotM.count = 160;
    for (let i = 0; i < 160; i++) {
      const hh = U.hoppers[i % 2].g.getWorldPosition(V(0, 0, 0));
      dummy.position.set(hh.x + (rnd(i, 1) - 0.5) * 0.6, hh.y - 0.3 + rnd(i, 2) * 0.7, (rnd(i, 3) - 0.5) * 0.6);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      shotM.setMatrixAt(i, dummy.matrix);
    }
    shotM.instanceMatrix.needsUpdate = true;
    setCam(hp.clone().add(V(lerp(1.5, 1, k), -0.6, lerp(3.4, 2.6, eio(k)))), hp.clone().add(V(0, -0.6, 0)), t);
    fill.position.copy(hp).add(V(1, 1, 3));
    fill.intensity = 5;
  } else if (sc === "release") {
    const r0 = s.dur * 0.05, age = lt - r0, lift = age > 0 ? Math.pow(Math.max(0, age - 0.5), 1.5) * 0.7 : 0;
    sub.position.y = LANDY + lift;
    shotM.count = SHN;
    for (let i = 0; i < SHN; i++) {
      const hx = i % 2 ? -1.5 : -0.2, st = r0 + rnd(i, 61) * s.dur * 0.75, a = lt - st;
      if (a < 0) dummy.position.set(0, -100, 0);
      else {
        const sx = hx + (rnd(i, 62) - 0.5) * 0.25, sz = (rnd(i, 63) - 0.5) * 0.25;
        let y = LANDY + lift - 2.5 - a * 3.5 - a * a * 2;
        const gh = floorH(sx, sz) + 0.05;
        if (y < gh) y = gh + rnd(i, 64) * 0.2;
        dummy.position.set(sx + (rnd(i, 65) - 0.5) * a * 0.6, y, sz + (rnd(i, 66) - 0.5) * a * 0.6);
      }
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      shotM.setMatrixAt(i, dummy.matrix);
    }
    shotM.instanceMatrix.needsUpdate = true;
    updSed(age, -0.8, 0, 0.9);
    spots.forEach((s2) => s2.intensity = 0);
    beams.forEach((b) => b.visible = false);
    hemi.intensity = 1.2;
    U.hoppers.forEach((h) => h.coil.material.color.set(2236979));
    setCam(V(10, 1.8 + lift * 0.5, 9), V(0, 2.4 + lift * 0.8, 0), t);
  } else if (sc === "ascent") {
    freeFloat();
    sub.position.set(0, 80, 0);
    sub.rotation.z = Math.sin(t * 0.7) * 0.02;
    const lk = sm(0.2, 1, k);
    waterEnv(new THREE.Color(331818).lerp(new THREE.Color(2789344), lk).getHex(), new THREE.Color(66572).lerp(new THREE.Color(735882), lk).getHex(), new THREE.Color(133140).lerp(new THREE.Color(1731264), lk).getHex(), 0.025);
    spots.forEach((s2) => s2.intensity = 0);
    beams.forEach((b) => b.visible = false);
    hemi.intensity = lerp(0.5, 2.6, lk);
    dirL.intensity = lerp(0.2, 1.4, lk);
    const a = 2.3 - k * 0.6;
    setCam(V(Math.cos(a) * 11, 77, Math.sin(a) * 11), V(0, 80.8, 0), t);
    vy = -5;
  } else if (sc === "surface") {
    freeFloat();
    surf.visible = true;
    sunRays.visible = true;
    rayMat.opacity = 0.16;
    const SY = 30;
    updSurf(t, SY);
    sunRays.position.y = SY;
    const d = eio(clamp(k / 0.9));
    sub.position.set(0, lerp(14, SY + 0.5, d), 0);
    sub.rotation.z = 0.1 * (1 - d);
    waterEnv(9429247, 1735376, 2792160, 0.012);
    hemi.intensity = 3;
    spots.forEach((s2) => s2.intensity = 0);
    beams.forEach((b) => b.visible = false);
    setCam(V(6, sub.position.y - 6, 8), V(0, sub.position.y + 4, -1), t);
    updBubbles(lt, sub.position.clone().add(V(0, 2, 0)), 1.5, 0.7);
    vy = -1;
  }
  snow.visible = ["descent", "crack", "ascent", "surface"].includes(sc);
  if (snow.visible) updSnow(t, vy, camera.position);
  draw(ext);
}
function shotCab(s, lt, k, t) {
  const sc = s.scene;
  let L = 1, mode = "air", val = 112, al = 0, cold = 0, f = { mouth: "line" };
  const br = Math.sin(t * 2.4);
  let p = { spine: [0.06 + br * 0.012] };
  const blink = t % 3.3 < 0.1;
  let lhand = null, rhand = null, camP, camT;
  man.root.rotation.y = -0.25;
  molG.visible = false;
  sweat.visible = false;
  camph.count = 0;
  pglassMat.color.set(795472);
  bigBtn.scale.y = 1;
  lever.rotation.x = 0;
  const btnW = bigBtn.getWorldPosition(V(0, 0, 0)), levW = lever.localToWorld(V(0, 0.09, 0));
  const headW = () => man.head.localToWorld(V(0.16, 0.3, 0.1));
  if (sc === "cabButton") {
    mode = k < 0.35 ? "air" : "error";
    al = k > 0.35 ? Math.floor(t * 3) % 2 === 0 ? 1 : 0.2 : 0;
    p = { spine: [0.22, -0.35, 0], neck: [0.05], head: [0.25, 0.5, 0], rSh: [-0.2, 0, -0.2], rEl: [-1.2] };
    const press = k > 0.15 && k < 0.55 ? Math.max(0, Math.sin((k - 0.15) * 40)) : 0;
    bigBtn.scale.y = 1 - press * 0.5;
    lhand = btnW.clone().add(V(0, 0.06 - press * 0.04, 0.02));
    f = k < 0.35 ? { mouth: "line", look: [-0.6, -0.6], brow: 0.1 } : { mouth: "frown", look: [-0.4, -0.6], brow: 0.45, browY: 0.01, eyeS: 1.1 };
    if (k > 0.6) {
      p.head = [-0.25, 0.3, 0];
      p.spine = [0.1, -0.2, 0];
      f = { mouth: "open", open: 0.5, look: [0, 0.9], brow: 0.5, eyeS: 1.15, pupil: 0.8 };
    }
    camP = V(0.9, 0.25, 2.9).lerp(V(0.6, 0.1, 2.2), eio(k));
    camT = V(-0.25, -0.15, 0);
  } else if (sc === "cabAir") {
    val = lerp(16, 112, sm(0.4, 0.8, k));
    L = 0.9;
    p = { spine: [0.18, -0.25], head: [0.2, 0.55], rSh: [-0.4, 0, -0.25], rEl: [-1.4] };
    lhand = man.root.localToWorld(V(0.15, 0.15, 0.3));
    f = { mouth: k > 0.6 ? "frown" : "line", look: [-0.7, -0.5], brow: 0.25 };
    camP = V(-0.5, 0.2, 2.5).lerp(V(-0.7, 0.1, 2), eio(k));
    camT = V(-0.3, -0.15, 0);
  } else if (sc === "cabCO2") {
    mode = "co2";
    val = lerp(1, 3.2, k);
    L = 0.75;
    molG.visible = true;
    mols.forEach((m, i) => {
      const a = t * 0.3 + i;
      m.position.set(Math.sin(a + i) * 0.7, -0.2 + rnd(i, 1) * 1.1 + Math.sin(t * 0.7 + i) * 0.05, Math.cos(a * 0.8 + i) * 0.5 - 0.1);
      m.rotation.set(t + i, t * 0.7, 0);
      m.scale.setScalar(sm(i / 14 * 0.6, i / 14 * 0.6 + 0.2, k));
    });
    p = { spine: [0.05], head: [-0.1, 0.2, 0.1], rSh: [-0.3, 0, -0.2], rEl: [-1.3], lSh: [-0.3, 0, 0.2], lEl: [-1.3] };
    f = { mouth: "frown", look: [0.3 * Math.sin(t * 1.5), 0.5], brow: 0.45, eyeS: 1.05 };
    camP = V(0.6, 0.3, 2.6).lerp(V(0.4, 0.25, 2.2), eio(k));
    camT = V(0, 0, -0.1);
  } else if (sc === "cabCold") {
    L = 0.45;
    cold = 1;
    val = 70;
    const sh = Math.sin(t * 40) * 0.02;
    p = { spine: [0.35, sh, 0], neck: [0.15], head: [0.1, 0, sh], lSh: [-1.1, -0.6, 0.2], lEl: [-1.1], rSh: [-1.1, 0.6, -0.2], rEl: [-1.1], lHip: [-1.95, 0, 0.08], rHip: [-1.95, 0, -0.08], lKn: [2.1], rKn: [2.1] };
    f = { mouth: "line", look: [0, -0.2], brow: 0.35, eye: 0.8 };
    camP = V(0.3, 0.4, 2.6).lerp(V(0.25, 0.3, 2.1), eio(k));
    camT = V(0, -0.2, -0.2);
  } else if (sc === "cabScrape") {
    L = 0.12;
    val = 60;
    cold = 0.6;
    const turn = sm(0.25, 0.55, k);
    man.root.rotation.y = lerp(-0.25, -0.9, turn);
    p = { spine: [0.1, -0.2 * turn], head: [0, 0.6 * turn, 0], lSh: [-0.3, 0, 0.2], lEl: [-1], rSh: [-0.3, 0, -0.2], rEl: [-1] };
    f = { mouth: k > 0.5 ? "open" : "line", open: 0.4, look: [-0.9 * turn, 0], brow: 0.4 * turn, eyeS: 1 + 0.2 * turn, pupil: lerp(1, 0.7, turn) };
    camph.count = 30;
    for (let i = 0; i < 30; i++) {
      const r = 0.22 * Math.sqrt(rnd(i, 1)), a = rnd(i, 2) * 6.28 + t * 0.2 * (rnd(i, 3) - 0.5);
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.03);
      dummy.rotation.set(0, 0, rnd(i, 4) * 6 + t * 0.4);
      dummy.scale.setScalar(0.35 * sm(0, 0.4, k));
      dummy.updateMatrix();
      camph.setMatrixAt(i, dummy.matrix);
    }
    camph.instanceMatrix.needsUpdate = true;
    pglassMat.color.set(330264);
    camP = V(0.9, 0.35, 2.4);
    camT = V(-0.5, 0, 0.1);
  } else if (sc === "scream") {
    const on = lt > 0.15;
    L = on ? 0.75 : 0.12;
    val = 58;
    cold = 0.3;
    const pov = k < 0.48;
    shake = on ? 0.02 + 0.03 * Math.exp(-(lt - 0.15) * 4) : 0;
    camph.count = 70;
    for (let i = 0; i < 70; i++) {
      const r = 0.24 * Math.sqrt(rnd(i, 1)), a = rnd(i, 2) * 6.28 + Math.sin(t * 2 + i) * 0.1;
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.03 + rnd(i, 5) * 0.02);
      dummy.rotation.set(0, 0, rnd(i, 4) * 6 + Math.sin(t * 3 + i) * 0.3);
      dummy.scale.setScalar(0.2 + rnd(i, 6) * 0.08);
      dummy.updateMatrix();
      camph.setMatrixAt(i, dummy.matrix);
    }
    camph.instanceMatrix.needsUpdate = true;
    pglassMat.color.set(on ? 3828400 : 330264);
    man.root.rotation.y = -0.9;
    p = { spine: [-0.15, -0.2, 0], head: [-0.2, 0.5, 0], lSh: [-2.4, 0, 0.5], lEl: [-0.8], rSh: [-2.4, 0, -0.5], rEl: [-0.8] };
    f = { mouth: "open", open: 1.5 + 0.2 * Math.sin(t * 30), look: [-1, 0.2], brow: 0.6, browY: 0.03, eyeS: 1.3, pupil: 0.55 };
    const pw = pg.getWorldPosition(V(0, 0, 0));
    if (pov) {
      camP = pw.clone().add(pdir.clone().multiplyScalar(lerp(-0.6, -0.45, k / 0.48))).add(V(0, 0.03, 0));
      camT = pw;
    } else {
      const hp = man.head.localToWorld(V(0, 0.2, 0));
      const fd = man.head.localToWorld(V(0.25, 0.25, 1)).sub(hp).normalize();
      camP = hp.clone().add(fd.clone().multiplyScalar(lerp(0.8, 0.6, eio((k - 0.48) / 0.52)))).add(V(0, 0.05, 0));
      camT = hp;
    }
  } else if (sc === "cabHead") {
    mode = "co2";
    val = lerp(3.6, 4.6, k);
    L = 0.4;
    cold = 0.5;
    p = { spine: [0.3, 0.1, 0], neck: [0.25], head: [0.25, 0.2, 0.2], lSh: [-0.4, 0, 0.2], lEl: [-1] };
    rhand = man.head.localToWorld(V(-0.17, 0.32, 0.12));
    f = { mouth: "frown", blink: k > 0.3 && k < 0.7, look: [0, -0.4], brow: 0.55, eye: 0.7 };
    camP = V(0.7, 0.25, 2.3).lerp(V(0.6, 0.2, 1.9), eio(k));
    camT = V(0, 0, -0.2);
  } else if (sc === "cabSwitch") {
    mode = "low";
    val = 4;
    L = 0.35;
    cold = 0.6;
    sweat.visible = true;
    const sw = man.head.localToWorld(V(0.17, 0.33, 0.15));
    sweat.position.copy(sw).add(V(0, -k * 0.12, 0));
    p = { spine: [0.24, -0.3, 0], head: [0.22, 0.5, 0], rSh: [-0.2, 0, -0.2], rEl: [-1.2] };
    lhand = levW.clone().add(V(0, 0.06 + 0.02 * Math.sin(t * 3), 0.03));
    f = { mouth: "line", look: [-0.7, -0.6], brow: -0.25, browY: -0.01, eye: 0.85 };
    camP = V(0.4, 0.2, 2).lerp(V(0.1, 0.1, 1.55), eio(k));
    camT = V(-0.3, -0.15, 0.05);
  } else if (sc === "cabOff") {
    const hit = 0.25;
    const after = k > hit;
    mode = after ? "off" : "low";
    val = 4;
    L = after ? 0.35 * (1 - sm(hit, hit + 0.1, k)) : 0.35;
    cold = 0.6;
    lever.rotation.x = after ? 1.1 : 0;
    shake = after ? 0.03 * Math.exp(-(k - hit) * 12) : 0;
    p = { spine: [0.24, -0.3, 0], head: [0.22, 0.5, 0], rSh: [-0.2, 0, -0.2], rEl: [-1.2] };
    lhand = after ? lever.localToWorld(V(0, 0.09, 0)).add(V(0, 0.01, 0.02)) : levW.clone().add(V(0, lerp(0.06, 0, k / hit), 0.03));
    f = { mouth: "line", look: [-0.7, -0.6], brow: -0.3, eye: 0.8 };
    camP = V(0.1, 0.1, 1.55);
    camT = V(-0.3, -0.15, 0.05);
  }
  if (!f.blink) f.blink = blink;
  pose(man, p);
  man.root.updateMatrixWorld(true);
  if (lhand) reach(man, "l", lhand, V(0, -1, -0.3));
  if (rhand) reach(man, "r", rhand, V(0, -1, -0.3));
  face(man, f);
  lamp.intensity = 1.5 * L;
  cabHemi.intensity = 0.15 + 0.75 * L;
  keyL.intensity = 0.1 + 0.9 * L;
  lampM.material.color.set(new THREE.Color(1118481).lerp(new THREE.Color(16773580), clamp(L)));
  alarm.intensity = al * 7;
  alarmM.material.color.set(al > 0.5 ? 16724032 : 5574672);
  scrGlow.position.copy(scr.getWorldPosition(V(0, 0, 0))).add(V(0.1, 0.05, 0.2));
  scrGlow.color.set(mode === "air" ? 6094746 : 16728128);
  scrGlow.intensity = mode === "off" ? 0 : 0.25;
  coldL.intensity = cold * 0.6 * (mode === "off" ? 0 : 1);
  hullIn.color.set(new THREE.Color(8370121).lerp(new THREE.Color(10146047), cold * 0.6));
  leds.forEach((l, i) => l.visible = mode !== "off" && Math.floor(t * 2 + i) % 3 !== 0);
  drawScreen(mode, t, val);
  if (cold > 0.4 && mode !== "off") {
    const hp = man.head.localToWorld(V(0, 0.1, 0.25));
    const fw = man.head.localToWorld(V(0, 0.1, 0.6)).sub(hp).normalize();
    for (let i = 0; i < BN; i++) {
      const ph = (t * 0.6 + rnd(i, 71)) % 1;
      brPos[i * 3] = hp.x + fw.x * (0.12 + ph * 0.35) + (rnd(i, 72) - 0.5) * ph * 0.15;
      brPos[i * 3 + 1] = hp.y + ph * 0.12;
      brPos[i * 3 + 2] = hp.z + fw.z * (0.12 + ph * 0.35) + (rnd(i, 73) - 0.5) * ph * 0.15;
    }
    brGeo.attributes.position.needsUpdate = true;
    brMat.opacity = 0.3 * cold * clamp(Math.sin(t * 2.4) * 1.5);
  } else brMat.opacity = 0;
  setCam(camP, camT, t);
  draw(cab);
}
function shotPlanes(s, lt, k, t) {
  const n = Math.min(50, Math.floor(eio(k / 0.85) * 50));
  planes.forEach((m, i) => {
    if (i >= n) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const tin = i / 50 * 0.85 * s.dur, age = lt - tin;
    const y0 = 1.55 + i * 0.26;
    const fall = clamp(age / 0.25);
    m.position.set(Math.sin(i * 2.3) * 0.25, lerp(y0 + 4, y0, eob(fall)), Math.cos(i * 1.7) * 0.25);
    m.rotation.set(Math.sin(i) * 0.15, i * 1.1, Math.cos(i * 1.3) * 0.12);
  });
  const squash = 1 - 0.12 * sm(0.2, 0.9, k);
  pman.root.scale.set(1 + (1 - squash) * 0.8, squash, 1 + (1 - squash) * 0.8);
  face(pman, { mouth: k > 0.4 ? "open" : "frown", open: 0.6, brow: 0.5, eyeS: 1.1 + 0.1 * k, look: [0, 0.8], blink: false });
  pman.head.rotation.x = -0.3;
  const camY = lerp(1.6, 6.5, eio(k)), ptg = V(0, lerp(1.3, 6.2, eio(k)), 0), ppos = V(3.2, camY, 7 + k * 5);
  if (!PORT) ppos.sub(ptg).multiplyScalar(lerp(1, 1.9, eio(k))).add(ptg);
  setCam(ppos, ptg, t);
  draw(pls);
}
function shotTop(s, lt, k, t) {
  const a = seaGeo.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
    a.setY(i, Math.sin(x * 0.2 + t * 1.2) * 0.35 + Math.cos(z * 0.25 + t * 0.9) * 0.3);
  }
  a.needsUpdate = true;
  seaGeo.computeVertexNormals();
  sub2.position.set(0, 0.7 + Math.sin(t * 1.2) * 0.15, 0);
  sub2.rotation.set(Math.sin(t) * 0.03, -0.5, Math.sin(t * 0.8) * 0.04);
  const pop = eob(sm(0.05, 0.3, k));
  tman.root.position.y = lerp(0.9, 1.75, pop);
  pose(tman, { lHip: [0, 0, 0.05], rHip: [0, 0, -0.05], lKn: [0], rKn: [0], lSh: [0, 0, 2.5 + Math.sin(t * 8) * 0.3], lEl: [0, 0, 0.4], rSh: [0, 0, -0.3], rEl: [-0.4] });
  face(tman, { mouth: "smile", look: [0.3, 0.2], brow: -0.1, blink: t % 2.5 < 0.1 });
  sub2.userData.beacon.material.color.set(t * 1.2 % 1 < 0.2 ? 16724032 : 4196880);
  const ang = 0.95 + k * 0.2;
  setCam(V(Math.cos(ang) * 13, 4.5 + k, Math.sin(ang) * 13), V(-1, 3.6, -2), t);
  draw(top);
}
window.setTime = function(t) {
  let i = shots.findIndex((s2) => t >= s2.start && t < s2.start + s2.dur);
  if (i < 0) i = shots.length - 1;
  const s = shots[i], lt = t - s.start, k = clamp(lt / s.dur);
  shake = 0;
  const sc = s.scene;
  if (sc.startsWith("cab") || sc === "scream") shotCab(s, lt, k, t);
  else if (sc === "planes") shotPlanes(s, lt, k, t);
  else if (sc === "end") shotTop(s, lt, k, t);
  else if (sc === "trieste") {
    shotExt(Object.assign({}, s, { scene: "descent" }), lt, 0.9, t);
  } else if (sc === "fish") {
    shotExt(Object.assign({}, s, { scene: "sonar" }), lt, k, t);
  } else if (sc === "robots") {
    shotExt(Object.assign({}, s, { scene: "robotLights" }), lt, k * 0.5, t);
  } else shotExt(s, lt, k, t);
  full.style.opacity = 1;
  full.innerHTML = fullFor(s, lt, k);
  cards.innerHTML = cardsFor(s, lt, k);
  const prev = shots[i - 1], dayStart = !prev || prev.day !== s.day;
  let dStart = s.start;
  for (let j = i; j >= 0 && shots[j].day === s.day; j--) dStart = shots[j].start;
  const bl = t - dStart;
  const bp = s.day ? eob(clamp(bl / 0.45)) : 0;
  badge.style.opacity = s.day ? 1 : 0;
  badge.style.transform = `scale(${s.day ? 0.3 + 0.7 * bp : 1}) rotate(${(1 - bp) * -8}deg)`;
  $("dayt").textContent = (LANG === "en" ? "DAY " : "\u0414\u0415\u041D\u042C ") + s.day;
  $("loct").textContent = s.loc;
  let html = "";
  const cw = s.words;
  let ci = s.chunks.findIndex((c) => t < cw[c[c.length - 1]].b + 0.05);
  if (ci < 0) ci = s.chunks.length - 1;
  const ch = s.chunks[ci];
  if (t >= cw[ch[0]].a - 0.05) ch.forEach((j) => {
    const w = cw[j];
    const a = clamp((t - w.a + 0.06) / 0.14);
    if (a <= 0) return;
    const sc2 = a < 1 ? 0.4 + 0.6 * eob(a) : 1;
    html += `<span class="${w.h ? "h" : ""}" style="transform:scale(${sc2.toFixed(3)}) translateY(${((1 - a) * 20).toFixed(1)}px);opacity:${clamp(a * 2)}">${w.t.replace(/[.…]+$/, "").replace(/^…/, "")}</span>`;
  });
  capEl.innerHTML = html;
  if (PORT) {
    capEl.style.bottom = sc === "end" ? "1180px" : sc === "fish" ? "420px" : "560px";
    capEl.style.fontSize = sc === "end" ? "104px" : "82px";
  } else {
    capEl.style.bottom = sc === "end" ? "520px" : "70px";
    capEl.style.fontSize = sc === "end" ? "96px" : "66px";
    capEl.style.left = "240px";
    capEl.style.right = "240px";
  }
  let bp2 = 0;
  const nx = shots[i + 1];
  if (dayStart && i > 0 && s.day !== prev.day) bp2 = 0.5 + 0.5 * clamp(lt / 0.35);
  if (nx && nx.day !== s.day) {
    const r = s.dur - lt;
    if (r < 0.35) bp2 = 0.5 * (1 - r / 0.35);
  }
  drawBubbles(bp2 > 0 && bp2 < 1 ? bp2 : 0);
  drawGlitch(sc === "robotLights" ? k > 0.66 ? 0.55 * (1 - sm(0.9, 1, k)) + 0.25 : 0 : 0, t);
  let fl = 0, bk = 0;
  if (sc === "crack") fl = Math.max(0, 0.5 - (lt - s.dur * 0.28) * 3) * (lt > s.dur * 0.28 ? 1 : 0);
  if (sc === "scream") fl = lt > 0.15 ? 0.7 * Math.exp(-(lt - 0.15) * 8) : 0;
  if (sc === "surface") fl = sm(0.85, 1, k);
  if (sc === "end") fl = 1 - sm(0, 0.45, lt);
  if (sc === "cabOff") bk = sm(0.45, 0.75, k);
  if (sc === "release") bk = 1 - sm(0, 0.3, lt);
  if (i === 0) bk = 1 - sm(0, 0.5, t);
  if (i === shots.length - 1) bk = Math.max(bk, sm(s.dur - 0.5, s.dur, lt));
  $("flash").style.opacity = fl;
  $("black").style.opacity = bk;
};
window.TOTAL = TOTAL;
window.ready = document.fonts.ready.then(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)))).then(() => {
  window.setTime(0);
  return true;
});
