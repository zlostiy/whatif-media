// ISS: "Что если ты застрял на МКС, а связь с Землёй пропала"
import { starSphere, THREE, mergeGeometries, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, hash, fbm, rnd, col, T, B, add, G, Box, Sph, Cap, Cyl, dotTex, canvasTex, makeSky, points, makeHuman, face, pose, P, SIT, STAND, reach, camera, setCam, draw, setShake, card, paper, fmtN } from '../../core.js';

// =====================================================================
// shared models
// =====================================================================
function earthTex() {
  return canvasTex(1024, 512, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * Math.PI * 2, lat = (y / h - .5) * Math.PI, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const n = (fbm(px * 1.6 + 10, py * 1.6 + pz * .7) + fbm(pz * 1.6 + 3, py * 1.6 - px * .7)) / 2;
      const ice = Math.abs(py) > .9; let r, g, b;
      if (ice) [r, g, b] = [240, 246, 255];
      else if (n > .53) { const d = n > .6 ? 1 : 0; [r, g, b] = Math.abs(py) < .35 && hash(Math.floor(x / 6), Math.floor(y / 6)) > .6 ? [214, 186, 120] : d ? [94, 168, 86] : [120, 190, 96]; }
      else { const s = n > .5 ? 1 : 0; [r, g, b] = s ? [64, 168, 230] : [36, 110, 210]; }
      const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
}
function cloudTex() {
  return canvasTex(1024, 512, (c, w, h) => {
    const img = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lon = x / w * Math.PI * 2, lat = (y / h - .5) * Math.PI, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const n = (fbm(px * 3 + 40, py * 3 + pz) + fbm(pz * 3 + 13, py * 3 - px)) / 2; const a = n > .63 ? 235 : n > .6 ? 130 : 0;
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a;
    }
    c.putImageData(img, 0, 0);
  });
}
const ETEX = earthTex(), CTEX = cloudTex();
function makeEarth(R) {
  const g = new THREE.Group();
  const e = add(g, new THREE.SphereGeometry(R, 96, 64), B(0xd8e4f0, { map: ETEX }), [0, 0, 0], [0, 0, 0], null, 0);
  e.rotation.x = Math.PI / 2; const cl = add(g, new THREE.SphereGeometry(R * 1.008, 96, 64), B(0xffffff, { map: CTEX, transparent: true, opacity: .85, depthWrite: false }), [0, 0, 0], [Math.PI / 2, 0, 0], null, 0);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 64), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(0x5ab8ff) }, k: { value: 1 } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(clamp(1. - abs(dot(n,v)),0.,1.), 2.2); gl_FragColor = vec4(c*f*1.6*k, f*k); }' }));
  g.add(atm); g.userData = { e, cl, atm }; return g;
}
function panelTex() { return canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#1b2f7a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4f7cff'; c.lineWidth = 2; for (let x = 0; x <= w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeStyle = '#ffb31a'; c.lineWidth = 8; c.strokeRect(0, 0, w, h); }); }
const PTEX = panelTex();
function makeISS() {
  const g = new THREE.Group(), wh = T(0xf3f5fa), gr = T(0xc9cdd8), dk = T(0x5d6378), gold = T(0xffc84a), pm = T(0xffffff, { map: PTEX, side: THREE.DoubleSide });
  add(g, Box(13, .32, .32), gr, [0, 0, 0], [0, 0, 0], null, .025);                       // truss
  for (let i = -6; i <= 6; i += 1) add(g, Box(.04, .34, .34), dk, [i, 0, 0], [0, 0, 0], null, 0);
  for (const x of [-5.6, -4.4, 4.4, 5.6]) for (const s of [-1, 1]) { const p = add(g, Box(.9, .02, 4.2), pm, [x, 0, s * 2.35], [0, 0, 0], null, .015); }
  for (const x of [-5, 5]) add(g, Cyl(.08, .08, 4.8, 8), gold, [x, 0, 0], [Math.PI / 2, 0, 0], null, .01);
  for (const x of [-2.2, 2.2]) add(g, Box(1.6, .02, .8), wh, [x, -.55, 0], [0, 0, 0], null, .012);  // radiators
  const mods = new THREE.Group(); mods.position.set(0, .55, 0); g.add(mods);
  add(mods, Cap(.42, 3.2, 18), wh, [0, 0, .2], [Math.PI / 2, 0, 0], null, .025);
  add(mods, Cap(.4, 1.4, 18), wh, [-1.15, 0, -.4], [0, 0, Math.PI / 2], null, .022);
  add(mods, Cap(.4, 1.4, 18), wh, [1.15, 0, -.4], [0, 0, Math.PI / 2], null, .022);
  add(mods, Cap(.38, 2.2, 18), T(0xe9e2cf), [0, 0, -2.6], [Math.PI / 2, 0, 0], null, .022);       // russian segment
  for (const s of [-1, 1]) add(mods, Box(2.4, .02, .6), pm, [s * 1.6, 0, -3.1], [0, 0, 0], null, .01);
  add(mods, Sph(.36, 16, 12), wh, [0, 0, 2.3], [0, 0, 0], null, .02);
  add(mods, Cyl(.25, .3, .3, 12), T(0x8fd8ff), [0, -.45, .9], [0, 0, 0], null, .012);  // cupola
  return g;
}
function makeSoyuz() {
  const g = new THREE.Group(), gr = T(0x8e9a6a), wh = T(0xf3f5fa), dk = T(0x4a4f5e), pm = T(0xffffff, { map: PTEX, side: THREE.DoubleSide });
  add(g, Sph(.42, 18, 14), gr, [0, 0, 0], [0, 0, 0], null, .02);                                 // orbital module
  add(g, Cyl(.05, .07, .3, 8), dk, [0, 0, .5], [Math.PI / 2, 0, 0], null, .008);
  const dm = makeDescent(); dm.position.set(0, 0, -.62); dm.rotation.x = -Math.PI / 2; g.add(dm);
  const svc = new THREE.Group(); svc.position.set(0, 0, -1.4); g.add(svc);
  add(svc, Cyl(.5, .55, .8, 18), gr, [0, 0, 0], [Math.PI / 2, 0, 0], null, .02);
  for (const s of [-1, 1]) add(svc, Box(1.8, .02, .45), pm, [s * 1.4, 0, 0], [0, 0, 0], null, .01);
  g.userData = { dm, svc }; return g;
}
function makeDescent() {  // bell, heat shield points -y
  const g = new THREE.Group(); const br = T(0x8e9a6a), sh = T(0x5a3a2a);
  add(g, Cyl(.32, .55, .62, 22), br, [0, 0, 0], [0, 0, 0], null, .02);
  add(g, new THREE.SphereGeometry(.55, 22, 10, 0, Math.PI * 2, Math.PI * .6, Math.PI * .4), sh, [0, -.15, 0], [0, 0, 0], null, .02);
  add(g, Sph(.08, 10, 8), B(0x8fd8ff), [.38, .05, .2], [0, 0, 0], null, .01);
  add(g, Cyl(.2, .32, .12, 18), T(0x6f7a50), [0, .36, 0], [0, 0, 0], null, .012);
  return g;
}
function chuteTex() { return canvasTex(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ff7a1f' : '#fff6e8'; c.fillRect(i * w / 16, 0, w / 16 + 1, h); } }); }
function makeChute() {
  const g = new THREE.Group();
  const can = add(g, new THREE.SphereGeometry(3.2, 32, 12, 0, Math.PI * 2, 0, Math.PI * .38), T(0xffffff, { map: chuteTex(), side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, .55, 1], .03);
  const rimY = 3.2 * Math.cos(Math.PI * .38) * .55, rimR = 3.2 * Math.sin(Math.PI * .38);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, p0 = V(Math.cos(a) * rimR, rimY - .1, Math.sin(a) * rimR), p1 = V(0, -6, 0); const d = p1.clone().sub(p0); const l = add(g, Cyl(.012, .012, d.length(), 4), T(0x2b2f45), [0, 0, 0], [0, 0, 0], null, 0); l.position.copy(p0).add(p1).multiplyScalar(.5); l.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }
  return g;
}
const astro = o => makeHuman(Object.assign({ top: 0xf3f5fa, pants: 0xf3f5fa, shoe: 0x9aa3bd, hair: 0x4a2c1a, suit: true, patch: 0x2b6cff }, o));

// =====================================================================
// SPACE scene
// =====================================================================
const space = new THREE.Scene(); space.background = new THREE.Color(0x02030a);
const stars = starSphere(1500, 2600); space.add(stars);
const sunL = new THREE.DirectionalLight(0xfff4e0, 2.6); sunL.position.set(-60, 30, 40); space.add(sunL);
const spHemi = new THREE.HemisphereLight(0x9ac8ff, 0x101830, .55); space.add(spHemi);
const ER = 220, earth = makeEarth(ER); earth.position.set(0, -ER - 26, 0); space.add(earth);
const sunDisk = add(space, new THREE.CircleGeometry(18, 40), B(0xfff3c4, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0); sunDisk.visible = false;
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffb860, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sunGlow.scale.setScalar(160); space.add(sunGlow); sunGlow.visible = false;
const iss = makeISS(); space.add(iss);
const soyuz = makeSoyuz(); soyuz.position.set(0, .55, 3.95); iss.add(soyuz);
const DN = 260; const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.13, 0), T(0xc9ccd8, { emissive: 0x30323a }), DN); debris.frustumCulled = false; space.add(debris);
const dmy = new THREE.Object3D();
function updDebris(t, n, spd = 30, spread = 1) { debris.count = n; for (let i = 0; i < n; i++) { const x = ((rnd(i, 3) * 120 + t * spd * (.7 + rnd(i, 4) * .6)) % 120) - 60; dmy.position.set(x, (rnd(i, 5) - .5) * 9 * spread + 1, (rnd(i, 6) - .5) * 14 * spread); dmy.rotation.set(t * 3 + i, t * 2 + i * .3, 0); dmy.scale.setScalar(.5 + rnd(i, 7) * 2.2); dmy.updateMatrix(); debris.setMatrixAt(i, dmy.matrix); } debris.instanceMatrix.needsUpdate = true; }
const sparks = points(160, 0xffd27a, .35, { blending: THREE.AdditiveBlending }); space.add(sparks);
function updSparks(age, o) { for (let i = 0; i < 160; i++) { const a = Math.max(0, age), d = V(rnd(i, 11) - .5, rnd(i, 12) - .3, rnd(i, 13) - .5).normalize().multiplyScalar(a * (2 + rnd(i, 14) * 6)); sparks.pos[i * 3] = o.x + d.x; sparks.pos[i * 3 + 1] = o.y + d.y; sparks.pos[i * 3 + 2] = o.z + d.z; } sparks.upd(); sparks.material.opacity = age < 0 ? 0 : Math.exp(-age * 2.5); }
const puffs = points(60, 0xffffff, .5); space.add(puffs);
// re-entry capsule + plasma
const capS = makeDescent(); capS.scale.setScalar(2.2); space.add(capS); capS.visible = false;
const plasma = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 16, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); capS.add(plasma); plasma.scale.set(.85, 1.1, .85); plasma.position.y = -.12;
const trail = points(500, 0xffa050, .9, { blending: THREE.AdditiveBlending }); space.add(trail);

// =====================================================================
// MODULE interior
// =====================================================================
const mod = new THREE.Scene(); mod.background = new THREE.Color(0x0b0f22);
const mHemi = new THREE.HemisphereLight(0xffffff, 0x8890b0, 1.4); mod.add(mHemi);
const mKey = new THREE.DirectionalLight(0xfff6ea, 1.0); mKey.position.set(1, 2, 3); mod.add(mKey);
const alarmL = new THREE.PointLight(0xff2030, 0, 9, 1.2); alarmL.position.set(0, 1, 0); mod.add(alarmL);
const rackTex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#e8ebf2'; c.fillRect(0, 0, w, h); const cs = ['#d6dae4', '#c9cdd8', '#dfe3ec', '#ffd23f', '#d6dae4', '#4fd8ff']; for (let i = 0; i < 14; i++) { c.fillStyle = cs[i % 6]; const x = hash(i, 1) * 440, y = hash(i, 2) * 440; c.fillRect(x, y, 30 + hash(i, 3) * 60, 16 + hash(i, 4) * 40); } c.strokeStyle = '#a8aec2'; c.lineWidth = 6; for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.fillStyle = '#7d8398'; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(hash(i, 9) * w, hash(i, 8) * h, 6, 0, 6.3); c.fill(); } });
rackTex.wrapS = rackTex.wrapT = THREE.RepeatWrapping; rackTex.repeat.set(4, 1);
const HW = 1.25, ML = 9;
const room = add(mod, Box(HW * 2, HW * 2, ML), T(0xffffff, { map: rackTex, side: THREE.BackSide }), [0, 0, 0], [0, 0, 0], null, 0);
for (let z = -4; z <= 4; z += 1.6) for (const [x, y] of [[-HW + .06, HW - .06], [HW - .06, HW - .06], [-HW + .06, -HW + .06], [HW - .06, -HW + .06]]) add(mod, Box(.12, .12, .5), T(0xffd23f), [x, y, z], [0, 0, 0], null, .01);
for (const y of [.5, -.5]) add(mod, Cyl(.03, .03, ML, 6), T(0xffd23f), [-HW + .12, y, 0], [Math.PI / 2, 0, 0], null, .006);
for (let i = 0; i < 4; i++) add(mod, Box(.42, .28, .03), T(0x2b2f45), [HW - .03, .2 + (i % 2) * .5, -2 + i * 1.3], [0, -Math.PI / 2, 0], null, .01);
const scrT = canvasTex(512, 256, (c, w, h, mode = 'ok', t = 0) => {
  c.fillStyle = '#062a2a'; c.fillRect(0, 0, w, h); const big = (s, y, cl, sz = 70) => { c.fillStyle = cl; let f = sz; c.font = `900 ${f}px R, RL`; while (c.measureText(s).width > 460 && f > 20) { f -= 4; c.font = `900 ${f}px R, RL`; } c.textAlign = 'center'; c.fillText(s, 256, y); };
  if (mode === 'debris') { const on = Math.floor(t * 3) % 2 === 0; c.fillStyle = on ? '#ff3040' : '#4a0a10'; c.fillRect(0, 0, w, h); big(L('ОБЛОМКИ', 'DEBRIS'), 125, '#fff'); big(L('столкновение', 'collision'), 195, '#fff', 40); }
  else if (mode === 'nh3') { const on = Math.floor(t * 3) % 2 === 0; c.fillStyle = on ? '#e8c020' : '#4a3a00'; c.fillRect(0, 0, w, h); big('NH₃', 130, '#1a1033', 100); big(L('утечка', 'leak'), 205, '#1a1033', 44); }
  else if (mode === 'nosig') { c.fillStyle = '#300'; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = hash(i, Math.floor(t * 20)) > .5 ? '#555' : '#222'; c.fillRect(hash(i, 3 + Math.floor(t * 20)) * w, hash(i, 7 + Math.floor(t * 20)) * h, 8, 4); } big(L('НЕТ СВЯЗИ', 'NO SIGNAL'), 150, '#ff4b5c', 64); }
  else if (mode === 'radio') { c.strokeStyle = '#5cff9a'; c.lineWidth = 6; c.beginPath(); for (let x = 0; x < w; x += 4) { const a = Math.sin(x * .05 + t * 9) * Math.sin(x * .013 + t * 2) * 60; x ? c.lineTo(x, 150 + a) : c.moveTo(x, 150 + a); } c.stroke(); big('145.800 MHz', 60, '#5cff9a', 44); }
  else if (mode === 'answer') { c.fillStyle = '#0a4a2a'; c.fillRect(0, 0, w, h); big(L('ЗЕМЛЯ', 'EARTH'), 120, '#5cff9a', 80); big(L('на связи', 'online'), 200, '#fff', 46); }
  else if (mode === 'water') { big('H₂O', 120, '#4fd8ff', 90); big('98 %', 210, '#fff', 60); }
  else { big('ISS', 120, '#5cff9a', 80); }
});
const screen = add(mod, new THREE.PlaneGeometry(.9, .45), B(0xffffff, { map: scrT }), [HW - .04, .25, -.6], [0, -Math.PI / 2, 0], null, 0);
add(mod, Box(.04, .55, 1.0), T(0x2b2f45), [HW - .02, .25, -.6], [0, 0, 0], null, .01);
// window with earth view
const winG = G(mod, [-HW + .02, .2, 1.4], [0, Math.PI / 2, 0]);
add(winG, new THREE.TorusGeometry(.42, .07, 10, 32), T(0x5d6378), [0, 0, 0], [0, 0, 0], null, .012);
const winView = add(winG, new THREE.CircleGeometry(.41, 32), B(0xffffff, { map: ETEX }), [0, 0, -.01], [0, 0, 0], null, 0);
// hatch at -z end
const hatchG = G(mod, [0, 0, -ML / 2 + .05]);
add(hatchG, new THREE.TorusGeometry(.62, .09, 12, 36), T(0x9aa3bd), [0, 0, .02], [0, 0, 0], null, .015);
const hinge = G(hatchG, [-.62, 0, .12]); const door = add(hinge, Cyl(.6, .6, .1, 32), T(0xc9cdd8), [.62, 0, 0], [Math.PI / 2, 0, 0], null, .015); add(door, Cyl(.08, .08, .1, 12), T(0xff4b5c), [0, -.08, 0], [0, 0, 0], null, .008);
const tunnel = add(hatchG, new THREE.CircleGeometry(.6, 32), B(0x0a0d18), [0, 0, -.01], [0, 0, 0], null, 0);
// radio console
const radioG = G(mod, [HW - .05, -.35, .9], [0, -Math.PI / 2, 0]); add(radioG, Box(.6, .3, .1), T(0x2b2f45), [0, 0, 0], [0, 0, 0], null, .012); for (let i = 0; i < 5; i++) add(radioG, Cyl(.03, .03, .04, 10), T(i % 2 ? 0xffd23f : 0xd0d4e0), [-.22 + i * .11, -.06, .06], [Math.PI / 2, 0, 0], null, .005);
// floating water ball + gas
const wball = add(mod, Sph(.12, 24, 18), T(0x7fd8ff, { transparent: true, opacity: .85, emissive: 0x1a5a8a, emissiveIntensity: .4 }), [0, 0, 0], [0, 0, 0], null, .008); wball.visible = false;
const pouch = add(mod, Box(.12, .18, .03), T(0xd9dde8), [0, 0, 0], [0, 0, 0], null, .008); pouch.visible = false;
const gas = points(120, 0xe8e070, .7, { opacity: 0 }); mod.add(gas);
const man = astro({ headset: true }); mod.add(man.root);

// =====================================================================
// STEPPE scene
// =====================================================================
const stp = new THREE.Scene(); const stSky = makeSky(0x5a9ae8, 0xffd9a0, 600); stp.add(stSky); stp.fog = new THREE.Fog(0xf2d6a6, 60, 420);
stp.add(new THREE.HemisphereLight(0xfff0d8, 0x8a7a50, 1.8)); const stSun = new THREE.DirectionalLight(0xffe0b0, 2.2); stSun.position.set(-40, 50, 30); stp.add(stSun);
{ const gg = new THREE.PlaneGeometry(900, 900, 80, 80); gg.rotateX(-Math.PI / 2); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, (fbm(x * .01, z * .01) - .5) * 4 + (r > 150 ? (fbm(x * .006 + 9, z * .006) - .3) * 40 * sm(150, 400, r) : 0)); } gg.computeVertexNormals(); add(stp, gg, T(0xcdb86a), [0, 0, 0], [0, 0, 0], null, 0); }
const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(.18, .5, 5), T(0x9aa850), 500); for (let i = 0; i < 500; i++) { const r = 3 + rnd(i, 1) * 60, a = rnd(i, 2) * 6.283; dmy.position.set(Math.cos(a) * r, .2, Math.sin(a) * r); dmy.rotation.set(0, a, (rnd(i, 3) - .5) * .4); dmy.scale.setScalar(.6 + rnd(i, 4)); dmy.updateMatrix(); tufts.setMatrixAt(i, dmy.matrix); } stp.add(tufts);
const capG = makeDescent(); capG.scale.setScalar(2.2); stp.add(capG);
const chute = makeChute(); chute.scale.setScalar(2.4); stp.add(chute);
const dust = points(400, 0xe8d2a0, 1.6, { opacity: 0 }); stp.add(dust);
const burst = new THREE.PointLight(0xffb060, 0, 30, 1.5); stp.add(burst);
const man2 = astro({}); stp.add(man2.root); man2.root.scale.setScalar(2.2);
const stStarDisk = add(stp, new THREE.CircleGeometry(30, 40), B(0xfff2c0, { fog: false }), [-260, 70, -420], [0, .5, 0], null, 0);

// =====================================================================
// shot logic
// =====================================================================
function spaceShot(s, lt, k, t) {
  const sc = s.scene; earth.rotation.z = t * .004; earth.userData.cl.rotation.y = t * .002; iss.position.set(0, 0, 0); iss.rotation.set(0, 0, 0);
  soyuz.visible = true; soyuz.position.set(0, .55, 3.95); soyuz.rotation.set(0, 0, 0); debris.count = 0; sparks.material.opacity = 0; puffs.material.opacity = 0; capS.visible = false; iss.visible = true; trail.material.opacity = 0;
  sunDisk.visible = sunGlow.visible = false; sunL.intensity = 2.6; spHemi.intensity = .55; earth.userData.atm.material.uniforms.c.value.set(0x5ab8ff);
  if (sc === 'orbit') {
    const a = .6 + k * .5; setCam(V(Math.cos(a) * 16, 4.5 - k * 1.2, Math.sin(a) * 16), V(0, -1.5, 0), t, { land: 1.05 });
  } else if (sc === 'sunrise') {
    const sy = lerp(-30, 22, eio(k)); sunDisk.visible = sunGlow.visible = true; sunDisk.position.set(-40, sy, -330); sunGlow.position.copy(sunDisk.position); sunDisk.lookAt(camera.position);
    sunL.position.set(-40, sy + 20, -330); sunL.intensity = lerp(.2, 2.6, sm(.2, .6, k)); spHemi.intensity = lerp(.15, .55, k);
    earth.userData.atm.material.uniforms.c.value.copy(col(0xff8a3a, 0x5ab8ff, sm(.3, .9, k)));
    setCam(V(9, 2.2, 14), V(-3, -4, -40), t, { fov: 40 });
  } else if (sc === 'debris' || sc === 'decay' && false) {
    updDebris(t, DN, 14, .8); setCam(V(-3, 3 + Math.sin(t * .5) * .3, 13), V(1, 0, 0), t);
  } else if (sc === 'hit') {
    updDebris(t, 160, 30, 1); const h = s.dur * .32, age = lt - h; const hp = V(-.2, .55, 3.4);
    updSparks(age, hp); setShake(age > 0 ? .35 * Math.exp(-age * 3) : 0);
    setCam(V(4.5, 2.4, 9.5).lerp(V(3.2, 1.8, 7.5), eio(k)), V(0, .4, 2.6), t);
  } else if (sc === 'decay') {
    const dy = -k * 1.2; iss.position.y = dy; setCam(V(10, 1.5, 12), V(0, dy * .5 - .5, 0), t);
  } else if (sc === 'undock') {
    const d = eio(sm(.15, 1, k)); soyuz.position.z = 3.95 + d * 5; soyuz.rotation.y = d * .5;
    for (let i = 0; i < 60; i++) { const a = Math.max(0, lt - .3 - (i % 6) * .05); puffs.pos[i * 3] = soyuz.position.x + (rnd(i, 1) - .5) * a * 2; puffs.pos[i * 3 + 1] = soyuz.position.y + .55 + (rnd(i, 2) - .5) * a * 2; puffs.pos[i * 3 + 2] = soyuz.position.z + .6 + a * 1.5; } puffs.upd(); puffs.material.opacity = .6 * Math.exp(-Math.max(0, lt - .3) * 1.5) * (lt > .3 ? 1 : 0);
    const sp = soyuz.position.clone().add(V(0, .55, 0)); setCam(sp.clone().add(V(4.5, 2.2, 5)), sp.clone().add(V(0, 0, -1.5)), t);
  } else if (sc === 'reentry') {
    iss.visible = false; capS.visible = true; capS.position.set(0, 0, 0); capS.rotation.set(.35 + Math.sin(t * 7) * .03, 0, -.25);
    earth.position.y = -ER - 9; const heat = sm(.05, .4, k); plasma.material.opacity = .75 * heat * (.85 + .15 * Math.sin(t * 40)); plasma.scale.set(.85 + .1 * heat, 1.1 + .4 * heat, .85 + .1 * heat);
    earth.userData.atm.material.uniforms.c.value.copy(col(0x5ab8ff, 0xff9a50, heat));
    for (let i = 0; i < 500; i++) { const a = (rnd(i, 1) + t * 1.4) % 1; trail.pos[i * 3] = (rnd(i, 2) - .5) * 2 * (1 + a * 2) + a * 2; trail.pos[i * 3 + 1] = -1 + a * 26 + (rnd(i, 3) - .5); trail.pos[i * 3 + 2] = (rnd(i, 4) - .5) * 2 * (1 + a * 2) - a * 6; } trail.upd(); trail.material.opacity = .8 * heat;
    setShake(.06 * heat); setCam(V(5.5, 2.2, 7.5), V(0, .4, 0), t);
  }
  if (sc !== 'reentry') earth.position.y = -ER - 26;
  draw(space);
}
const blink = t => (t % 3.4) < .1;
function modShot(s, lt, k, t) {
  const sc = s.scene; let mode = 'ok', al = 0, p, f = { mouth: 'smile' }, cp, ct;
  const fl = Math.sin(t * 1.3) * .04; man.root.position.set(0, -.45 + fl, .6); man.root.rotation.set(Math.sin(t * .7) * .05, -.2, Math.sin(t * .9) * .04);
  const zg = { lHip: [-.45, 0, .1], rHip: [-.25, 0, -.1], lKn: [.7], rKn: [.45], lSh: [-.3, 0, .55 + Math.sin(t) * .05], rSh: [-.3, 0, -.55 - Math.sin(t) * .05], lEl: [-.5], rEl: [-.5], spine: [.05] };
  p = P(zg); wball.visible = pouch.visible = false; gas.material.opacity = 0; hinge.rotation.y = -1.7; winView.rotation.z = t * .02;
  let lh = null, rh = null;
  if (sc === 'alarm') {
    mode = 'debris'; al = (Math.floor(t * 3) % 2 === 0) ? 1 : .25; const turn = sm(.1, .4, k);
    man.root.rotation.y = lerp(-.2, -1.0, turn); p = P(zg, { head: [0, -.4 * turn, 0], lSh: [-1.6 * turn, 0, .6], rSh: [-.3, 0, -.9 * turn - .4] });
    f = { mouth: 'open', open: .9, eyeS: 1.25, brow: .5, browY: .02, look: [.8 * turn, 0], pupil: .7 };
    cp = V(-.4, .35, 3.3).lerp(V(-.2, .25, 2.6), eio(k)); ct = V(.3, .1, .2);
  } else if (sc === 'archive') { mode = 'debris'; al = .3; f = { mouth: 'frown', brow: .4, look: [.5, 0] }; cp = V(0, .2, 3.4); ct = V(0, 0, 0); }
  else if (sc === 'ammonia') {
    mode = 'nh3'; al = .5 + .5 * Math.sin(t * 6);
    for (let i = 0; i < 120; i++) { const a = (rnd(i, 1) + t * .15) % 1; gas.pos[i * 3] = HW - .2 - a * 1.6 + Math.sin(t + i) * .1; gas.pos[i * 3 + 1] = -.6 + (rnd(i, 2) - .3) * 1.6 * a; gas.pos[i * 3 + 2] = -1.6 + (rnd(i, 3) - .5) * 2.2 * a; } gas.upd(); gas.material.opacity = .22 * sm(.1, .4, k);
    man.root.rotation.y = -1.2; p = P(zg, { rSh: [-1.5, 0, -.2], rEl: [-1.6], head: [.1, -.3, 0] }); rh = man.head.localToWorld(V(-.02, .12, .26));
    f = { mouth: 'line', eye: .6, brow: .5, look: [.6, -.2] }; cp = V(-.7, .3, 3.0).lerp(V(-.5, .2, 2.4), eio(k)); ct = V(.5, -.1, -.6);
  } else if (sc === 'hatch') {
    mode = 'nh3'; al = .4; const cl = eio(sm(.15, .65, k)); hinge.rotation.y = lerp(-1.7, 0, cl);
    man.root.position.set(.15, -.45 + fl, -ML / 2 + 1.15); man.root.rotation.set(0, Math.PI, 0);
    p = P(zg, { lSh: [-1.4, 0, .3], rSh: [-1.4, 0, -.3], lEl: [-.3], rEl: [-.3], spine: [.25] });
    f = { mouth: 'line', brow: -.2, look: [0, 0] }; cp = V(-.7, .5, -ML / 2 + 3.6).lerp(V(-.5, .35, -ML / 2 + 2.8), eio(k)); ct = V(0, -.1, -ML / 2 + .4);
  } else if (sc === 'water') {
    mode = 'water'; wball.visible = true; pouch.visible = true;
    const hp = man.head.localToWorld(V(0, .1, .3)); wball.position.copy(man.root.localToWorld(V(-.55, .95, .35))).add(V(Math.sin(t * 1.2) * .05, Math.cos(t) * .04, 0)); wball.scale.set(1 + Math.sin(t * 5) * .08, 1 - Math.sin(t * 5) * .08, 1);
    lh = man.root.localToWorld(V(.35, .75, .35)); pouch.position.copy(lh).add(V(0, .05, .03)); p = P(zg, { head: [-.1, .4, 0] });
    f = { mouth: 'smile', eye: 1.05, look: [-.8, .4] }; cp = V(.4, .55, 2.6).lerp(V(.3, .45, 2.0), eio(k)); ct = V(0, .3, .6);
  } else if (sc === 'radio' || sc === 'answer') {
    mode = sc === 'radio' ? 'radio' : 'answer'; man.root.position.set(.35, -.55 + fl, 1.0); man.root.rotation.set(0, -1.2, 0);
    p = P(zg, { spine: [.2, 0, 0], head: [.05, .2, 0] }); lh = radioG.localToWorld(V(-.1, -.05, .1)); if (sc === 'radio') rh = radioG.localToWorld(V(.12, -.05, .1));
    if (sc === 'answer' && k > .45) { p.rSh = [-2.7, 0, -.4]; p.rEl = [-.4]; rh = null; }
    f = sc === 'radio' ? { mouth: 'open', open: .4 + .3 * Math.abs(Math.sin(t * 9)), look: [-.4, 0], brow: .3 } : (k > .4 ? { mouth: 'open', open: 1.1, eyeS: 1.2, brow: -.2, look: [-.3, .2] } : { mouth: 'line', brow: .4, look: [-.5, 0] });
    cp = V(-.6, .35, 2.7).lerp(V(-.4, .3, 2.2), eio(k)); ct = V(.6, -.15, .7);
  } else { cp = V(0, .3, 3.2); ct = V(0, 0, 0); }
  if (!f.blink) f.blink = blink(t);
  pose(man, p); man.root.updateMatrixWorld(true); if (lh) reach(man, 'l', lh, V(0, -1, .3)); if (rh) reach(man, 'r', rh, V(0, -1, .3)); face(man, f);
  alarmL.intensity = al * 9; mHemi.intensity = 1.4 - al * .6; scrT.redraw(mode, t);
  setCam(cp, ct, t, { keep: true, fov: PORT ? 52 : 58 }); draw(mod);
}
function steppeShot(s, lt, k, t) {
  const sc = s.scene; dust.material.opacity = 0; burst.intensity = 0; man2.root.visible = false; chute.visible = true;
  if (sc === 'chute') {
    const y = lerp(60, 16, k); capG.position.set(0, y, 0); capG.rotation.set(Math.sin(t * 1.3) * .05, t * .2, Math.cos(t) * .04);
    chute.position.set(0, y + 6 * 2.4 + 1.3, 0); chute.rotation.copy(capG.rotation);
    const ang = .8 + k * .3; setCam(V(Math.cos(ang) * 30, y - 6, Math.sin(ang) * 30), V(0, y + 7, 0), t, { land: 1.1 });
  } else if (sc === 'land') {
    const fire = .32, D = s.dur, y = lt < D * fire ? lerp(8, 1.6, lt / (D * fire)) : Math.max(1.32, 1.6 - (lt - D * fire) * 1.5);
    capG.position.set(0, y, 0); capG.rotation.set(0, .4, 0); chute.position.set(4 * sm(.4, 1, k), y + 15.7 - 12 * sm(.35, 1, k), -2 * sm(.4, 1, k)); chute.rotation.z = -1.2 * sm(.35, 1, k);
    const age = lt - D * fire; burst.position.set(0, .5, 0); burst.intensity = age > 0 ? 40 * Math.exp(-age * 6) : 0;
    for (let i = 0; i < 400; i++) { const a = Math.max(0, age), r = (1 + rnd(i, 1) * 3) * (1 - Math.exp(-a * 2)) * 4, an = rnd(i, 2) * 6.283; dust.pos[i * 3] = Math.cos(an) * r; dust.pos[i * 3 + 1] = .3 + rnd(i, 3) * 2.5 * (1 - Math.exp(-a * 2)); dust.pos[i * 3 + 2] = Math.sin(an) * r; } dust.upd(); dust.material.opacity = age > 0 ? .3 * Math.exp(-age * 1.2) : 0;
    setShake(age > 0 ? .25 * Math.exp(-age * 5) : 0); setCam(V(10, 3.2, 13), V(0, 2.2, 0), t);
  } else { // end
    capG.position.set(0, 1.32, 0); capG.rotation.set(0, .4, 0.0); chute.visible = false;
    man2.root.visible = true; man2.root.position.set(2.1, .3, 1.7); man2.root.rotation.y = -.4;
    pose(man2, P(SIT, { rSh: [-.2, 0, -2.6 - Math.sin(t * 7) * .3], rEl: [-.3], lSh: [0, 0, .3] })); face(man2, { mouth: 'smile', blink: blink(t), look: [0, .1] });
    stSky.set(0xff9a6a, 0xffd0a0); const a = .4 + k * .25; setCam(V(2.2 + Math.cos(a) * 9, 3, 1.6 + Math.sin(a) * 9), V(1.6, 1.6, 0), t);
  }
  if (sc !== 'end') stSky.set(0x5a9ae8, 0xffd9a0);
  draw(stp);
}
const SPACE = ['orbit', 'sunrise', 'debris', 'hit', 'decay', 'undock', 'reentry'], STP = ['chute', 'land', 'end'];
function render(s, lt, k, t) { if (SPACE.includes(s.scene)) spaceShot(s, lt, k, t); else if (STP.includes(s.scene)) steppeShot(s, lt, k, t); else modShot(s, lt, k, t); }

// =====================================================================
// overlays
// =====================================================================
function cards(s, lt, k) {
  const a = sm(.12, .4, lt);
  switch (s.scene) {
    case 'orbit': return card(330, `<div class="t">${L('скорость', 'speed')}</div><div class="v">${EN ? fmtN(lerp(0, 17500, eio(k * 1.4))) + ' <small>mph</small>' : fmtN(lerp(0, 28000, eio(k * 1.4))) + ' <small>км/ч</small>'}</div><div class="n">${L('≈ 8 км в секунду', '≈ 5 miles per second')}</div>`, a);
    case 'sunrise': return card(330, `<div class="t">${L('восходов за сутки', 'sunrises a day')}</div><div class="v">${Math.max(1, Math.min(16, Math.ceil(eio(k / .8) * 16)))}</div><div class="n">${L('один виток ≈ 90 минут', 'one orbit ≈ 90 minutes')}</div>`, a);
    case 'hit': { const on = lt > s.dur * .34; return on ? card(330, `<div class="t" style="color:#ff4b5c">${L('связь с Землёй', 'link to Earth')}</div><div class="v" style="color:#ff4b5c"><span style="opacity:${Math.floor(lt * 3) % 2 ? 1 : .35}">${L('НЕТ', 'LOST')}</span></div>`, sm(s.dur * .34, s.dur * .34 + .3, lt)) : ''; }
    case 'hatch': return card(330, `<div class="t">${L('январь 2015', 'january 2015')}</div><div class="v">NH₃</div><div class="n">${L('экипаж ушёл в российский сегмент', 'crew moved to the Russian segment')}</div>`, sm(.35, .6, k));
    case 'decay': return card(330, `<div class="t">${L('высота', 'altitude')}</div><div class="v">${EN ? '−300 <small>ft/day</small>' : '−100 <small>м/сутки</small>'}</div>`, a);
    case 'water': { const v = Math.round(lerp(0, 98, eio(k / .7))); return card(330, `<div class="t">${L('вода из пота и мочи', 'water from sweat & urine')}</div><div class="v">${v} <small>%</small></div><div class="bar"><div style="width:${v}%;background:#4fd8ff"></div></div>`, a); }
    case 'reentry': { const g = lerp(1, 4.5, eio(sm(.1, .6, k))); return card(330, `<div class="t">${L('перегрузка', 'g-force')}</div><div class="v" style="color:${g > 3 ? '#ff4b5c' : '#1a1033'}">${g.toFixed(1)} <small>g</small></div><div class="n">${L('ты весишь в 4–5 раз больше', 'you weigh 4–5× more')}</div>`, a); }
    case 'land': return card(330, `<div class="t">${L('скорость касания', 'touchdown speed')}</div><div class="v">${EN ? '≈ 3 <small>mph</small>' : '≈ 5 <small>км/ч</small>'}</div><div class="n">${L('двигатели включаются за 1 м', 'engines fire 1 m above ground')}</div>`, sm(.4, .6, k));
  }
  return '';
}
function full(s, lt, k) {
  if (s.scene !== 'archive') return '';
  const a = sm(0, .3, lt); let svg = `<svg viewBox="0 0 400 210" width="${PORT ? 760 : 680}" height="${PORT ? 400 : 357}"><rect width="400" height="210" fill="#0d1838"/><path d="M-20 230 Q200 120 420 230 Z" fill="#2f7fd0" stroke="#1a1033" stroke-width="4"/>`;
  for (let i = 0; i < 70; i++) svg += `<circle cx="${(hash(i, 1) * 400 + k * 60) % 400}" cy="${30 + hash(i, 2) * 110}" r="${1.2 + hash(i, 3) * 2.2}" fill="#ffd27a" opacity=".85"/>`;
  svg += `<g transform="translate(200,95)" stroke="#1a1033" stroke-width="3"><rect x="-70" y="-4" width="140" height="8" fill="#c9cdd8"/><rect x="-66" y="-30" width="18" height="60" fill="#1b2f7a"/><rect x="48" y="-30" width="18" height="60" fill="#1b2f7a"/><rect x="-14" y="-14" width="28" height="22" rx="6" fill="#f3f5fa"/></g></svg>`;
  return paper(a, k, `${svg}<div style="font-weight:900;font-size:64px;margin-top:14px;color:#1a1033">${L('15 НОЯБРЯ 2021', 'NOVEMBER 15, 2021')}</div><div style="font-weight:700;font-size:34px">${L('≈ 1 500 обломков на орбите', '≈ 1,500 pieces of debris')}</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:8px">${L('7 человек укрылись в кораблях', '7 crew sheltered in their spacecraft')}</div>`);
}
function fx(s, lt, k) {
  if (s.scene === 'hit') { const a = lt - s.dur * .32; return { fl: a > 0 ? .8 * Math.exp(-a * 7) : 0 }; }
  if (s.scene === 'land') { const a = lt - s.dur * .32; return { fl: a > 0 ? .5 * Math.exp(-a * 6) : 0, flc: '#ffd7a0' }; }
  if (s.scene === 'alarm') return { fl: (Math.floor(lt * 3) % 2 === 0 ? .12 : 0), flc: '#ff2030' };
  return {};
}
start({ render, cards, full, fx, mins: { hit: 3.2, land: 3.0, chute: 3.0, undock: 3.4, sunrise: 4.2 }, cap: s => SPACE.includes(s.scene) || STP.includes(s.scene) ? {} : { bottom: 520 } });
