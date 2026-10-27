// "Что если тебе дали порулить «Солнцепёком»" — шуточный, голос по рации (База → Новичок)
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, rnd, T, B, add, G, Box, Sph, Cap, Cyl, canvasTex, makeSky, makeHuman, face, pose, P, SIT, STAND, reach, setCam, draw, setShake, card, fmtN } from '../../core.js';
import { makeTree } from '../_town.js';
const blink = t => (t % 3.1) < .1;

// =====================================================================
// WORLD (one big flat world: yard z≈0, road z≈100..200, range z≈500, hill z≈760)
// =====================================================================
const sc = new THREE.Scene(); const sky = makeSky(0x7ab8ee, 0xfff2d8, 1400); sc.add(sky); sc.fog = new THREE.Fog(0xf0e4cc, 120, 900);
const hemi = new THREE.HemisphereLight(0xfff6e8, 0x6a7a4a, 1.6); sc.add(hemi); const sun = new THREE.DirectionalLight(0xfff0d0, 2.0); sun.position.set(-60, 80, -40); sc.add(sun);
add(sc, new THREE.PlaneGeometry(4000, 4000), T(0x8fbf5a), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
const sunDisk = add(sc, new THREE.CircleGeometry(40, 40), B(0xfff2c0, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0);
// yard: concrete pad + garage
add(sc, new THREE.PlaneGeometry(40, 30), T(0xb8b4a8), [0, .02, -2], [-Math.PI / 2, 0, 0], null, 0);
const garage = G(sc, [0, 0, -14]);
add(garage, Box(14, 7, 10), T(0xd8c8a8), [0, 3.5, 0], [0, 0, 0], null, .05); add(garage, Box(15, .6, 11), T(0x8a4a3a), [0, 7.3, 0], [0, 0, 0], null, .05);
add(garage, Box(6, 5.2, .1), B(0x2a2420), [0, 2.6, 5.02], [0, 0, 0], null, 0);
// fence across the yard exit (z = 12); planks in the crash zone are animated
const FZ = 12, fence = G(sc, [0, 0, FZ]); const planks = [];
const wood = T(0xb07a48), wood2 = T(0x9a6a3a);
for (let x = -18; x <= 18; x += 3) if (Math.abs(x) > 2.6) add(fence, Box(.25, 2.2, .25), wood2, [x, 1.1, -.2], [0, 0, 0], null, .02);
// crossbars stop at the posts either side of the crash zone (nothing solid for the vehicle to pass through)
for (const sx of [-1, 1]) for (const y of [.6, 1.6]) add(fence, Box(15.1, .18, .12), wood2, [sx * 10.55, y, -.12], [0, 0, 0], null, .01);
for (let i = 0; i < 120; i++) { const x = -17.85 + i * .3; const m = add(fence, Box(.26, 2, .06), i % 2 ? wood : wood2, [x, 1, 0], [0, 0, 0], null, .01); m.userData.x0 = x; planks.push(m); }
// crossbars in the crash zone are separate so they can fly off too
const signTex = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#f3f5fa'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1a1033'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14); c.fillStyle = '#c0283a'; c.font = '900 64px R, RL, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(EN ? "GENERAL'S" : 'ЗАБОР', w / 2, h * .33); c.fillText(EN ? 'FENCE' : 'ГЕНЕРАЛА', w / 2, h * .7); });
const sign = add(fence, Box(2.6, .82, .06), new THREE.MeshBasicMaterial({ map: signTex }), [-6.2, 1.25, .1], [0, 0, 0], null, .015);
// road: dirt strip from the yard to the range (gentle S-bend)
const RX = z => z < 90 ? 0 : z < 240 ? Math.sin((z - 90) / 150 * Math.PI) * 22 : 0;
{ const pts = []; for (let z = 0; z <= 520; z += 4) pts.push(V(RX(z), 0, z)); const shape = [];
  const g = new THREE.BufferGeometry(); const pos = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const d = b.clone().sub(a).normalize(); const n = V(d.z, 0, -d.x).multiplyScalar(4.5); const y = .03; pos.push(a.x - n.x, y, a.z - n.z, a.x + n.x, y, a.z + n.z, b.x + n.x, y, b.z + n.z, a.x - n.x, y, a.z - n.z, b.x + n.x, y, b.z + n.z, b.x - n.x, y, b.z - n.z); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); add(sc, g, T(0xc8a070, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], null, 0); }
// trees far from the road (never between the chase camera and the vehicle)
for (let i = 0; i < 70; i++) { const z = 30 + i * 6.5; const side = i % 2 ? 1 : -1; const x = RX(z) + side * (20 + rnd(i, 1) * 30); const tr = makeTree(2.2 + rnd(i, 2) * 1.4); tr.position.set(x, 0, z); tr.rotation.y = rnd(i, 3) * 6; sc.add(tr); }
for (let i = 0; i < 26; i++) { const a = rnd(i, 5) * 6.28, r = 60 + rnd(i, 6) * 60; const tr = makeTree(2.4 + rnd(i, 7)); tr.position.set(Math.cos(a) * r, 0, -30 + Math.sin(a) * r * .4 - 40); sc.add(tr); }
// range: sign + hill
const RZ = 500, HILL = V(0, 0, 760);
const rangeTex = canvasTex(512, 200, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1a1033'; c.lineWidth = 16; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#1a1033'; c.font = '900 96px R, RL, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(EN ? 'RANGE' : 'ПОЛИГОН', w / 2, h / 2 + 4); });
const rsign = G(sc, [-9, 0, RZ + 6]); add(rsign, Box(.25, 3.4, .25), wood2, [-1.6, 1.7, 0], [0, 0, 0], null, .02); add(rsign, Box(.25, 3.4, .25), wood2, [1.6, 1.7, 0], [0, 0, 0], null, .02); add(rsign, Box(4.2, 1.64, .12), new THREE.MeshBasicMaterial({ map: rangeTex }), [0, 2.8, .14], [0, .3, 0], null, .02); rsign.rotation.y = .5;
{ const g = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2); add(sc, g, T(0x9ab060), [HILL.x, 0, HILL.z], [0, 0, 0], [70, 26, 50], .004); }
// target: old wrecked boards on the hill top (empty — no people)
add(sc, Box(8, 4, 1), T(0x8a7a6a), [HILL.x, 26, HILL.z - 4], [0, .3, 0], null, .15);

// =====================================================================
// VEHICLE  (front = +z).  ~ real proportions, metres.
// =====================================================================
const KH = T(0x6b7a3e), KH2 = T(0x56632f), DK = T(0x2b2f2a), MET = T(0x3a3d38);
function makeTOS() {
  const g = new THREE.Group(); const o = { g };
  add(g, Box(3.3, .9, 6.6), KH, [0, 1.05, 0], [0, 0, 0], null, .04);
  add(g, Box(3.3, .9, 1.1), KH, [0, .92, 3.55], [-.6, 0, 0], null, .04);
  add(g, Box(3.4, .12, 6.9), KH2, [0, 1.52, 0], [0, 0, 0], null, .03);
  for (const s of [-1, 1]) {
    add(g, Box(.62, .8, 6.9), DK, [s * 1.58, .5, 0], [0, 0, 0], null, .03);
    add(g, Box(.78, .07, 7.2), KH2, [s * 1.62, .96, 0], [0, 0, 0], null, .02);
    for (let i = 0; i < 6; i++) add(g, Cyl(.34, .34, .2, 14), MET, [s * 1.92, .42, -2.6 + i * 1.04], [0, 0, Math.PI / 2], null, .015);
    add(g, Cyl(.3, .3, .2, 12), MET, [s * 1.92, .62, 3.3], [0, 0, Math.PI / 2], null, .015); add(g, Cyl(.3, .3, .2, 12), MET, [s * 1.92, .62, -3.3], [0, 0, Math.PI / 2], null, .015);
  }
  // driver hatch ring (front centre)
  o.hatch = V(0, 1.58, 2.55); add(g, new THREE.TorusGeometry(.42, .07, 8, 20), DK, [o.hatch.x, o.hatch.y, o.hatch.z], [Math.PI / 2, 0, 0], null, .01);
  add(g, Cyl(.44, .44, .06, 18), KH2, [o.hatch.x, 1.7, 2.0], [-1.25, 0, 0], null, .01); // open hatch lid
  // turntable + launcher (pivot at rear; block length kept short of the driver hatch)
  add(g, Cyl(1.2, 1.3, .3, 20), KH2, [0, 1.73, -1.4], [0, 0, 0], null, .03);
  const piv = G(g, [0, 2.55, -2.6]); o.piv = piv;
  add(piv, Box(.5, .9, .7), KH2, [-1.3, -.35, .2], [0, 0, 0], null, .02); add(piv, Box(.5, .9, .7), KH2, [1.3, -.35, .2], [0, 0, 0], null, .02);
  const blk = G(piv, [0, 0, 0]); o.blk = blk; const BL = 3.9; o.BL = BL;
  add(blk, Box(2.5, 1.45, BL), KH, [0, 0, BL / 2], [0, 0, 0], null, .035);
  o.mouths = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const x = -1.05 + c * .3, y = -.45 + r * .45; add(blk, new THREE.CircleGeometry(.12, 12), B(0x141414), [x, y, BL + .012], [0, 0, 0], null, 0); add(blk, new THREE.RingGeometry(.12, .15, 12), B(0x2b2f2a), [x, y, BL + .014], [0, 0, 0], null, 0); o.mouths.push(V(x, y, BL + .2)); }
  for (let i = 0; i < 4; i++) add(blk, Box(2.56, .06, .08), KH2, [0, .74, .6 + i * .9], [0, 0, 0], null, .01);
  return o;
}
const tos = makeTOS(); sc.add(tos.g);
// crew helmet hero (tank leather cap) — standing in the driver hatch
const hero = makeHuman({ top: 0x5f6e3a, pants: 0x5f6e3a, hair: 0x3a2a1a, hairStyle: 'bald', skin: 0xffc6a0, stubble: true });
{ const h = hero.head; const cap = T(0x3a2a20); add(h, new THREE.SphereGeometry(.266, 24, 14, 0, Math.PI * 2, 0, Math.PI * .36), cap, [0, .25, -.02], [-.25, 0, 0], null, .014);
  for (let k = 0; k < 3; k++) add(h, Cap(.035, .22, 8), cap, [-.08 + k * .08, .45, 0], [Math.PI / 2, 0, 0], null, .006);
  for (const s of [-1, 1]) add(h, Cyl(.08, .08, .07, 14), cap, [s * .26, .2, 0], [0, 0, Math.PI / 2], null, .01); }
sc.add(hero.root);
function heroInHatch(t, f = {}, ps = {}) {
  tos.g.updateMatrixWorld(true); const p = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld);
  hero.root.position.copy(p).add(V(0, .02, 0)); hero.root.rotation.set(0, tos.g.rotation.y, 0);
  pose(hero, P(STAND, { lSh: [-.5, 0, .9], rSh: [-.5, 0, -.9], lEl: [-1.2], rEl: [-1.2] }, ps)); face(hero, Object.assign({ mouth: 'smile', blink: blink(t) }, f));
}
// wreck smoke columns (big soft spheres, slow — no tiny particles)
const smokeMat = T(0x5a5560, { transparent: true, opacity: .0, depthWrite: false });
const smokes = []; for (let i = 0; i < 9; i++) { const m = add(sc, new THREE.IcosahedronGeometry(1, 1), smokeMat.clone(), [0, -50, 0], [rnd(i, 1), rnd(i, 2), 0], null, 0); smokes.push(m); }
function smokeCol(a, t) { smokes.forEach((m, i) => { const ph = (rnd(i, 3) + t * .03) % 1; m.position.set(HILL.x + (rnd(i, 4) - .5) * 30, 26 + ph * 70 + i * 2, HILL.z + (rnd(i, 5) - .5) * 20); m.scale.setScalar(10 + ph * 18); m.material.opacity = a * .55 * Math.sin(ph * Math.PI); m.visible = a > 0; }); }

// ---------- salvo: 24 rockets in pairs over 6 s ----------
const ROCK = []; const trailMat = T(0xe8e2dc, { transparent: true, opacity: .85, depthWrite: false });
const flameMat = B(0xffa030, { transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
for (let i = 0; i < 24; i++) {
  const body = add(sc, Cyl(.11, .11, 1.6, 10), MET, [0, -50, 0], [0, 0, 0], null, .01);
  const fl = add(body, new THREE.ConeGeometry(.22, 1.6, 10), flameMat, [0, -1.5, 0], [Math.PI, 0, 0], null, 0);
  ROCK.push({ body, fl, trail: null, curve: null, t0: 0, imp: V(0, 0, 0) });
}
const fireMat = () => B(0xffb040, { transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const balls = ROCK.map(() => add(sc, Sph(1, 24, 16), fireMat(), [0, -50, 0], [0, 0, 0], null, 0));
const bigSun = add(sc, Sph(1, 32, 20), B(0xffd060, { transparent: true, opacity: 0, depthWrite: false }), [HILL.x, 30, HILL.z], [0, 0, 0], null, 0);
const bigSun2 = add(sc, Sph(1, 32, 20), B(0xff7a20, { transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), [HILL.x, 30, HILL.z], [0, 0, 0], null, 0);
const FLY = 2.6, SALVO0 = 1.5;
function prepSalvo() { // built once the launcher pose for the salvo is known
  tos.g.updateMatrixWorld(true);
  ROCK.forEach((r, i) => {
    const pair = Math.floor(i / 2); r.t0 = SALVO0 + pair * .5;
    const m0 = tos.mouths[i].clone().applyMatrix4(tos.blk.matrixWorld);
    const dir = V(0, 0, 1).transformDirection(tos.blk.matrixWorld);
    const imp = V(HILL.x + (rnd(i, 11) - .5) * 60, 18 + rnd(i, 12) * 8, HILL.z - 30 + (rnd(i, 13) - .5) * 34);
    r.imp = imp; r.curve = new THREE.QuadraticBezierCurve3(m0, m0.clone().add(dir.multiplyScalar(170)), imp);
    if (r.trail) sc.remove(r.trail);
    r.trail = new THREE.Mesh(new THREE.TubeGeometry(r.curve, 80, .5, 6, false), trailMat.clone()); r.trail.frustumCulled = false; sc.add(r.trail);
  });
}
function salvo(lt) {
  let flash = 0, n = 0;
  ROCK.forEach((r, i) => {
    const a = (lt - r.t0) / FLY; const idx = r.trail.geometry.index.count / 80;
    if (a <= 0) { r.body.visible = false; r.trail.visible = false; balls[i].material.opacity = 0; return; }
    const u = clamp(a), head = Math.floor(u * 80), tail = Math.max(0, head - 22);
    r.trail.visible = true; r.trail.geometry.setDrawRange(tail * idx, Math.max(0, head - tail) * idx); r.trail.material.opacity = .85 * (1 - sm(1, 2.4, a));
    if (a < 1) { r.body.visible = true; const p = r.curve.getPoint(u), tg = r.curve.getTangent(u); r.body.position.copy(p); r.body.quaternion.setFromUnitVectors(V(0, 1, 0), tg); r.fl.scale.y = .8 + .2 * Math.sin(lt * 40 + i); }
    else r.body.visible = false;
    const b = balls[i]; if (a >= 1) { const e = a - 1; b.position.copy(r.imp); b.scale.setScalar(2 + 9 * eob(clamp(e * 2.2))); b.material.opacity = .9 * (1 - sm(.2, 1.4, e)); if (e < .25) flash = Math.max(flash, .18 * (1 - e / .25)); n++; } else b.material.opacity = 0;
  });
  // the "second sun": after the last impact
  const last = SALVO0 + 11 * .5 + FLY; const e = lt - last + .6;
  bigSun.scale.setScalar(2 + 38 * eio(clamp(e / 1.6))); bigSun.material.opacity = e > 0 ? .95 * (1 - sm(3.5, 7, e)) : 0;
  bigSun2.scale.setScalar(3 + 50 * eio(clamp(e / 1.8))); bigSun2.material.opacity = e > 0 ? .55 * (1 - sm(3, 6, e)) : 0;
  return { flash, n, e };
}
function hideSalvo() { ROCK.forEach((r, i) => { r.body.visible = false; if (r.trail) r.trail.visible = false; balls[i].material.opacity = 0; }); bigSun.material.opacity = bigSun2.material.opacity = 0; }

// =====================================================================
// CABIN interior (separate small scene): cramped box, seat, panel, big red button
// =====================================================================
const cab = new THREE.Scene(); cab.background = new THREE.Color(0x1a1a14);
cab.add(new THREE.HemisphereLight(0xfff0d8, 0x40402a, 1.5)); { const d = new THREE.PointLight(0xfff0c0, 1.6, 5, 1.2); d.position.set(-.4, 1.55, -.9); cab.add(d); const d2 = new THREE.DirectionalLight(0xfff4e0, .9); d2.position.set(1, 3, 2); d2.userData.noShadow = true; cab.add(d2); }
add(cab, Box(2.0, 1.62, 2.3), T(0x6b7a3e, { side: THREE.BackSide }), [0, .81, .1], [0, 0, 0], null, 0);
for (let i = 0; i < 5; i++) add(cab, Box(.06, 1.6, .06), T(0x4a5528), [-.97, .8, -.9 + i * .45], [0, 0, 0], null, .006);
add(cab, Box(.7, .12, .7), T(0x3a2a20), [0, .3, -.35], [0, 0, 0], null, .012); add(cab, Box(.7, .8, .12), T(0x3a2a20), [0, .7, -.72], [0, 0, 0], null, .012);
const panel = G(cab, [0, 0, .42]); add(panel, Box(1.5, .82, .3), T(0x4a5232), [0, .41, 0], [0, 0, 0], null, .015);
add(panel, Box(1.5, .06, .42), T(0x3a4028), [0, .84, -.02], [-.35, 0, 0], null, .012);
const gaugeTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#f0ead8'; c.beginPath(); c.arc(64, 64, 60, 0, 6.29); c.fill(); c.lineWidth = 8; c.strokeStyle = '#1a1033'; c.stroke(); c.lineWidth = 6; for (let i = 0; i < 9; i++) { const a = Math.PI * .8 + i / 8 * Math.PI * 1.4; c.beginPath(); c.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); c.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); c.stroke(); } });
const needles = []; for (const x of [-.5, -.25, .25, .5]) { const gg = G(panel, [x, .62, -.155]); add(gg, new THREE.CircleGeometry(.09, 20), new THREE.MeshBasicMaterial({ map: gaugeTex }), [0, 0, 0], [0, Math.PI, 0], null, 0); const nd = add(gg, Box(.012, .07, .004), B(0xc0283a), [0, .03, -.005], [0, 0, 0], null, 0); nd.geometry.translate(0, .03, 0); needles.push(nd); }
const BTN = V(.05, .86, .36); const btnG = G(cab, BTN.toArray()); add(btnG, Cyl(.11, .12, .05, 20), T(0x1a1a1a), [0, 0, 0], [-.35, 0, 0], null, .008); const btn = add(btnG, Cyl(.075, .085, .06, 20), T(0xff2a3a, { emissive: 0xaa0010, emissiveIntensity: .4 }), [0, .04, -.012], [-.35, 0, 0], null, .008);
add(btnG, Box(.34, .01, .08), B(0xffd23f), [0, .02, .14], [-.35, 0, 0], null, 0);
const levers = []; for (const x of [-.32, .32]) { const lg = G(cab, [x, .3, .05]); add(lg, Cyl(.03, .03, .55, 8), MET, [0, .27, 0], [0, 0, 0], null, .006); add(lg, Cap(.05, .08, 8), T(0x1a1a1a), [0, .58, 0], [0, 0, 0], null, .006); levers.push(lg); }
const radio = G(cab, [.78, 1.1, .2]); add(radio, Box(.3, .22, .2), T(0x3a3d38), [0, 0, 0], [0, 0, 0], null, .01); add(radio, Box(.02, .26, .02), MET, [.1, .24, 0], [0, 0, 0], null, .004);
const cabHero = makeHuman({ top: 0x5f6e3a, pants: 0x5f6e3a, hair: 0x3a2a1a, hairStyle: 'bald', skin: 0xffc6a0, stubble: true });
{ const h = cabHero.head; const cap = T(0x3a2a20); add(h, new THREE.SphereGeometry(.266, 24, 14, 0, Math.PI * 2, 0, Math.PI * .36), cap, [0, .25, -.02], [-.25, 0, 0], null, .014); for (const s of [-1, 1]) add(h, Cyl(.08, .08, .07, 14), cap, [s * .26, .2, 0], [0, 0, Math.PI / 2], null, .01); }
cab.add(cabHero.root);

// =====================================================================
function placeTOS(x, z, ry = 0, pitch = 0, roll = 0) { tos.g.position.set(x, 0, z); tos.g.rotation.set(pitch, ry, roll, 'YXZ'); }
let salvoReady = false;
function world(s, lt, k, t) {
  const sc2 = s.scene; let cp, ct, todK = 'day', fopt = { land: 1.15 };
  tos.piv.rotation.x = 0; hideSalvo(); smokeCol(0, t); planks.forEach(pl => { pl.position.set(pl.userData.x0, 1, 0); pl.rotation.set(0, 0, 0); pl.visible = true; });
  if (sc2 === 'inside') { placeTOS(0, -2); heroInHatch(t, { mouth: 'open', open: .5, eyeS: 1.1 }); const a = .9 - k * .7; ct = V(0, 1.8, -1); cp = ct.clone().add(V(Math.sin(a) * 13, 4.5 + k * 1.5, Math.cos(a) * 13)); }
  else if (sc2 === 'fence') {
    const d = clamp((lt - s.dur * .25) / (s.dur * .6)); const z = -2 + eio(d) * 16; placeTOS(0, z, 0, -Math.sin(d * 40) * .01 * (d > 0 && d < 1 ? 1 : 0));
    setShake(d > 0 && d < 1 ? .03 : 0); const front = z + 4;
    planks.forEach((pl, i) => { const x = pl.userData.x0; if (Math.abs(x) > 2.5) return; const hit = clamp((front - FZ) / 1.2); if (hit <= 0) return; const side = Math.sign(x || .1);
      const e = eio(hit); pl.rotation.set(-e * (Math.PI / 2 - .04), 0, side * e * .4); pl.position.set(x + side * e * (3.2 - Math.abs(x)), lerp(1, .07, e), e * 1.2); });
    heroInHatch(t, d > .55 ? { mouth: 'open', open: 1, eyeS: 1.25, brow: .4 } : { mouth: 'smile', blink: blink(t) }, d > .55 ? { lSh: [-2.6, 0, .6], rSh: [-2.6, 0, -.6], lEl: [-.4], rEl: [-.4] } : {});
    ct = V(0, 1.6, FZ - 1); cp = V(11, 3.8, FZ + 9); fopt.land = 1.25;
  }
  else if (sc2 === 'road') {
    const z = 60 + lt * 14; const x = RX(z), dx = (RX(z + 1) - RX(z - 1)) / 2; const ry = Math.atan2(dx, 1); const wob = Math.sin(lt * 3.2) * .22 * sm(.35, .55, k) * (1 - sm(.85, 1, k));
    placeTOS(x + wob * 3, z, ry + wob, 0, -wob * .12); heroInHatch(t, k > .5 ? { mouth: 'open', open: .9, eyeS: 1.2, brow: .5 } : { mouth: 'smile', blink: blink(t) }, k > .5 ? { lSh: [-1.2, 0, .3], rSh: [-1.2, 0, -.3], lEl: [-1.4], rEl: [-1.4] } : {});
    const fw = V(Math.sin(ry), 0, Math.cos(ry)); ct = tos.g.position.clone().add(V(0, 1.6, 0)).add(fw.clone().multiplyScalar(3)); cp = tos.g.position.clone().add(fw.clone().multiplyScalar(-12)).add(V(7, 5.5, 0));
  }
  else if (sc2 === 'range') { todK = 'late'; const z = RZ - 20 + eio(clamp(k * 1.4)) * 20; placeTOS(0, z); heroInHatch(t, { mouth: 'smile', look: [0, .2], blink: blink(t) }, { head: [-.1, 0, 0] });
    ct = V(-1, 2.2, z + 40); cp = V(2.5 - k * 1.5, 4.8, z - 13); }
  else if (sc2 === 'wait') { todK = 'gold'; placeTOS(0, RZ); tos.piv.rotation.x = -.42 * eio(clamp(k * 1.3));
    const sneeze = sm(.5, .8, k) * (1 - sm(.9, 1, k)); heroInHatch(t, { mouth: sneeze > .3 ? 'open' : 'line', open: .3 + sneeze * .5, eye: 1 - sneeze * .8, brow: -.4 * sneeze, look: [0, -.5] }, { head: [-.3 * sneeze, 0, 0], spine: [-.1 * sneeze] });
    tos.g.updateMatrixWorld(true); const hp = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld); ct = hp.clone().add(V(0, .95, 0)); cp = hp.clone().add(V(1.5 - k * .3, 1.4, 2.6 - k * .5)); fopt.land = 1.5; }
  else if (sc2 === 'salvo') { todK = 'sunset'; placeTOS(0, RZ); tos.piv.rotation.x = -.42; if (!salvoReady) { prepSalvo(); salvoReady = true; }
    heroInHatch(t, { mouth: 'open', open: .6, eyeS: 1.1, look: [0, .6] }, {}); hero.root.visible = false; // hatch closed during the salvo
    const r = salvo(lt); setShake(lt > SALVO0 && lt < SALVO0 + 6.2 ? .04 : 0);
    const u = eio(clamp(lt / s.dur)); cp = V(lerp(7, 60, u), lerp(3.5, 70, u), RZ + lerp(-9, -120, u)); ct = V(0, lerp(4, 25, u), lerp(RZ + 20, HILL.z - 60, u)); fopt.land = 1.0; fopt.fov = lerp(48, 40, u);
    s._fl = r.flash; }
  else if (sc2 === 'fired') { todK = 'dusk'; if (k < .5) { placeTOS(0, RZ); tos.piv.rotation.x = -.42; smokeCol(1, t); heroInHatch(t, { mouth: 'open', open: .8, eyeS: 1.3, pupil: .6, brow: .2 }, { lSh: [0, 0, .3], rSh: [0, 0, -.3], lEl: [-.2], rEl: [-.2] });
      tos.g.updateMatrixWorld(true); const hp = tos.hatch.clone().applyMatrix4(tos.g.matrixWorld); ct = hp.clone().add(V(0, .85, 0)); cp = hp.clone().add(V(-1.4, 1.3, 2.8)); fopt.land = 1.5; }
    else { todK = 'day'; placeTOS(30, -40); hero.root.visible = false; planks.forEach(pl => { const x = pl.userData.x0; if (Math.abs(x) > 2.5) return; const side = Math.sign(x || .1); pl.rotation.set(-(Math.PI / 2 - .04), 0, side * .4); pl.position.set(x + side * (3.2 - Math.abs(x)), .07, 1.2); });
      const u = eio(clamp((k - .5) * 2)); ct = V(-5, 1.15, FZ); cp = V(lerp(1, -3.2, u), lerp(2.2, 1.5, u), FZ + lerp(10, 5.2, u)); fopt.land = 1.3; } }
  else if (sc2 === 'end') { todK = 'dusk'; placeTOS(0, RZ); tos.piv.rotation.x = -.42; smokeCol(1, t); hero.root.visible = false; ct = V(1, 8, RZ + 100); cp = V(-3 - k * 2, 4.5 + k * 1.5, RZ - 14 - k * 4); }
  if (sc2 !== 'salvo' && sc2 !== 'end' && !(sc2 === 'fired' && k >= .5)) hero.root.visible = true;
  setTOD(todK); setCam(cp, ct, t, fopt); draw(sc);
}
const TOD = { day: [0x7ab8ee, 0xfff2d8, 0xf0e4cc, 2.0, 1.6, V(-60, 80, -40)], late: [0x7aa8e0, 0xffe6c0, 0xf0dcc0, 1.8, 1.4, V(-60, 40, 120)], gold: [0x8a8ad0, 0xffc890, 0xf0c8a0, 1.6, 1.3, V(-60, 22, 300)],
  sunset: [0x5a4aa0, 0xff9a5a, 0xe89a70, 1.3, 1.1, V(-40, 10, 400)], dusk: [0x3a3a80, 0xff7a50, 0xb07870, 1.0, .9, V(-40, 6, 400)] };
function setTOD(k) { const p = TOD[k]; sky.set(p[0], p[1]); sc.fog.color.set(p[2]); sun.intensity = p[3] * 1.3; hemi.intensity = p[4] * .62; sun.position.copy(p[5]); sunDisk.position.copy(p[5].clone().normalize().multiplyScalar(1300)); sunDisk.lookAt(0, 0, 0); sunDisk.visible = k !== 'day'; }

function cabin(s, lt, k, t) {
  cabHero.root.position.set(0, .5, -.22); cabHero.root.rotation.set(0, 0, 0);
  const sc2 = s.scene; let cp, ct, ps = P(SIT, { lHip: [-1.9, 0, .2], rHip: [-1.9, 0, -.2], lKn: [2.1], rKn: [2.1], spine: [.08] }), f = { mouth: 'smile', blink: blink(t) };
  needles.forEach((n, i) => n.rotation.z = Math.sin(t * (.7 + i * .3) + i) * .8);
  if (sc2 === 'hook') { // finger creeps toward the button and freezes just above it on "ничего не нажимай"
    const reachA = sm(.05, .55, k) * (1 - sm(.7, .95, k) * .6);
    const tgt = BTN.clone().add(V(.02, lerp(.42, .1, reachA), lerp(-.25, -.06, reachA)));
    pose(cabHero, ps); cabHero.root.updateMatrixWorld(true); reach(cabHero, 'r', tgt); face(cabHero, { mouth: k > .7 ? 'frown' : 'smile', eyeS: k > .7 ? 1.25 : 1, look: [0, -.6], blink: blink(t) });
    cp = BTN.clone().add(V(.42, .3, .5)); ct = BTN.clone().add(V(-.05, .07, -.05)); setCam(cp, ct, t, { keep: true, fov: 50 }); draw(cab); return;
  }
  // 'cabin': cramped — knees up, head brushing the roof, elbows bumping walls
  ps = P(ps, { lSh: [-.9, 0, .5 + Math.sin(t * 3) * .1], rSh: [-.9, 0, -.5 - Math.sin(t * 3) * .1], lEl: [-1.3], rEl: [-1.3], head: [.15, Math.sin(t * 1.4) * .3, 0] });
  f = { mouth: 'line', brow: .35, look: [Math.sin(t * 1.4), .4], blink: blink(t) };
  pose(cabHero, ps); face(cabHero, f); levers.forEach((l, i) => l.rotation.x = Math.sin(t * 2 + i) * .1);
  cp = V(.72, 1.28, .98).lerp(V(.55, 1.2, .9), eio(k)); ct = V(0, 1.05, -.3); setCam(cp, ct, t, { keep: true, fov: 62 }); draw(cab);
}
let texOK = false;
function render(s, lt, k, t) { if (!texOK) { signTex.redraw(); rangeTex.redraw(); texOK = true; } if (s.scene === 'hook' || s.scene === 'cabin') cabin(s, lt, k, t); else world(s, lt, k, t); }

function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  switch (s.scene) {
    case 'inside': return card(330, `<div class="t">${L('масса', 'weight')}</div><div class="v">${EN ? '49 <small>tons</small>' : '44,3 <small>т</small>'}</div><div class="n">${L('шасси танка Т-72А', 'T-72A tank chassis')}</div>`, a);
    case 'fence': return card(330, `<div class="t">${L('двигатель', 'engine')}</div><div class="v">840 <small>${L('л.с.', 'hp')}</small></div>`, a);
    case 'range': return card(330, `<div class="t">${L('дальность', 'range')}</div><div class="v">${EN ? '3.7 <small>mi</small>' : '6 <small>км</small>'}</div><div class="n">${L('максимум', 'maximum')}</div>`, a);
    case 'wait': { const v = Math.max(0, Math.round(90 * (1 - eio(clamp(k * 1.05))))); return card(330, `<div class="t">${L('готовность', 'ready in')}</div><div class="v" style="color:#ff4b5c">${v} <small>${L('с', 's')}</small></div><div class="bar"><div style="width:${100 - v / .9}%;background:#5cd06a"></div></div>`, a); }
    case 'salvo': return card(330, `<div class="t">${L('залп', 'salvo')}</div><div class="v">24 <small>${L('ракеты', 'rockets')}</small></div><div class="n">${L('за 6 с · 217 кг каждая', 'in 6 s · 478 lb each')}</div>`, sm(.15, .45, lt) * (1 - sm(.55, .62, k)));
  }
  return '';
}
function fx(s, lt, k) { if (s.scene === 'salvo') return { fl: s._fl || 0, flc: '#ffd8a0' }; return {}; }
start({ render, cards, fx, mins: { salvo: 12.5, fence: 6.5, hook: 4.2 }, bubbles: ['#56632f', '#6b7a3e', '#ffd23f'] });
