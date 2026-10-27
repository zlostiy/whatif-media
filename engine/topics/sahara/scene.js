// "Что если ты потерялся в Сахаре" — Mauro Prosperi, 1994
import { starSphere, THREE, mergeGeometries, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, hash, fbm, rnd, col, T, B, add, G, Box, Sph, Cap, Cyl, dotTex, canvasTex, makeSky, points, makeHuman, face, pose, P, SIT, STAND, walkPose, runPose, bob, reach, camera, setCam, draw, setShake, card, paper, fmtN } from '../../core.js';
import { makeCow, makePlane747 } from '../_town.js';
const dmy = new THREE.Object3D(); const blink = t => (t % 3.3) < .1;

// =====================================================================
// DESERT
// =====================================================================
const ds = new THREE.Scene(); const sky = makeSky(0x8fc8f0, 0xfff0d0, 900); ds.add(sky); ds.fog = new THREE.Fog(0xf8e0b0, 60, 380);
const hemi = new THREE.HemisphereLight(0xfff6e8, 0xb08050, 1.7); ds.add(hemi); const sun = new THREE.DirectionalLight(0xfff0d0, 2.0); sun.position.set(-40, 60, 30); ds.add(sun);
const DH = (x, z) => Math.sin(x * .045 + Math.sin(z * .03) * 1.4) * 3.2 + Math.sin(z * .07 + x * .02) * 1.6 + (fbm(x * .02, z * .02) - .5) * 5;
{ const g = new THREE.PlaneGeometry(900, 900, 160, 160); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, DH(p.getX(i), p.getZ(i))); g.computeVertexNormals(); add(ds, g, T(0xf2c27a), [0, 0, 0], [0, 0, 0], null, 0); }
const at = (x, z, y = 0) => V(x, DH(x, z) + y, z);
const stars = starSphere(850, 1500); ds.add(stars);
const sunDisk = add(ds, new THREE.CircleGeometry(26, 40), B(0xfff2c0, { fog: false }), [0, 0, 0], [0, 0, 0], null, 0);
const moon = add(ds, new THREE.CircleGeometry(12, 32), B(0xf0f4ff, { fog: false }), [120, 260, -700], [0, 0, 0], null, 0);
// rocks / cliffs cluster
const ROCK = V(-60, 0, -80);
for (let i = 0; i < 14; i++) { const s = 3 + rnd(i, 1) * 7; const p = at(ROCK.x + (rnd(i, 2) - .5) * 40, ROCK.z + (rnd(i, 3) - .5) * 26); add(ds, new THREE.DodecahedronGeometry(s, 0), T(i % 2 ? 0xc0784a : 0xa8643a), [p.x, p.y + s * .4, p.z], [rnd(i, 4) * 3, rnd(i, 5) * 3, 0], [1.3, .9, 1], .05); }
// bush near start
const BUSH = at(8, 6); const bush = G(ds, BUSH.toArray()); for (let i = 0; i < 6; i++) add(bush, new THREE.IcosahedronGeometry(.6 + rnd(i, 9) * .3, 0), T(0x7a8a3a), [(rnd(i, 1) - .5) * 1.4, .4 + rnd(i, 2) * .5, (rnd(i, 3) - .5) * 1.2], [rnd(i, 4), rnd(i, 5), 0], null, .02);
// shrine
const SH = at(60, -40); const shrine = G(ds, [SH.x, SH.y - .3, SH.z]);
add(shrine, Box(5, 3.6, 5), T(0xf3ede0), [0, 1.8, 0], [0, 0, 0], null, .04); add(shrine, new THREE.SphereGeometry(2.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), T(0xf3ede0), [0, 3.6, 0], [0, 0, 0], null, .04);
add(shrine, Box(1.2, 2, .1), B(0x2a1a10), [0, 1, 2.52], [0, 0, 0], null, 0);
const flagG = G(shrine, [1.6, 3.6, 1.6]); add(flagG, Cyl(.04, .04, 2.4, 6), T(0x8a6a4a), [0, 1.2, 0], [0, 0, 0], null, .006);
const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8, 12, 4), new THREE.MeshToonMaterial({ gradientMap: undefined, side: THREE.DoubleSide, map: canvasTex(96, 64, (c, w, h) => { c.fillStyle = '#1aa04a'; c.fillRect(0, 0, w / 3, h); c.fillStyle = '#ffffff'; c.fillRect(w / 3, 0, w / 3, h); c.fillStyle = '#e02a2a'; c.fillRect(2 * w / 3, 0, w / 3, h); }) })); flag.position.set(.6, 2.0, 0); flagG.add(flag); flagG.visible = false;
const flagBase = flag.geometry.attributes.position.array.slice();
// SOS stones + fire
const SOSP = at(52, -30); const sos = G(ds, [SOSP.x, SOSP.y + .05, SOSP.z]); sos.visible = false;
{ const pts = []; const SP = [[.8,-1.6],[.3,-1.8],[-.3,-1.8],[-.8,-1.5],[-.8,-.9],[-.4,-.25],[.4,.25],[.8,.9],[.8,1.5],[.3,1.8],[-.3,1.8],[-.8,1.6]]; const S = ox => SP.forEach(([x, z]) => pts.push([ox + x, z])); S(-3.2); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; pts.push([Math.cos(a) * 1, Math.sin(a) * 1.7]); } S(3.2);
  pts.forEach(([x, z], i) => add(sos, new THREE.DodecahedronGeometry(.28, 0), T(0x5d4a3a), [x, .1, z], [i, i * 2, 0], [1, .6, 1], .012)); }
const fireG = G(ds, [SOSP.x + 6, SOSP.y, SOSP.z + 1]); fireG.visible = false; add(fireG, Cyl(.6, .7, .2, 10), T(0x5d4a3a), [0, .1, 0], [0, 0, 0], null, .01);
const flame = add(fireG, new THREE.ConeGeometry(.5, 1.3, 10), B(0xffa030, { transparent: true, opacity: .9 }), [0, .8, 0], [0, 0, 0], null, 0); const flame2 = add(fireG, new THREE.ConeGeometry(.28, .8, 10), B(0xfff0a0), [0, .6, 0], [0, 0, 0], null, 0);
const smoke = points(220, 0x8a8490, 1.8, { opacity: 0 }); ds.add(smoke);
// oasis
const OA = at(-120, 60); const oasis = G(ds, [OA.x, OA.y - .2, OA.z]);
add(oasis, new THREE.CircleGeometry(3, 28), T(0x3fa8e0, { emissive: 0x1a5a8a, emissiveIntensity: .3 }), [0, .25, 0], [-Math.PI / 2, 0, 0], [1.4, 1, 1], 0);
add(oasis, new THREE.CircleGeometry(4.6, 28), T(0x9ab04a), [0, .2, 0], [-Math.PI / 2, 0, 0], [1.3, 1, 1], 0);
for (let i = 0; i < 4; i++) { const pg = G(oasis, [Math.cos(i * 1.7) * 5.5, 0, Math.sin(i * 1.7) * 4.5]); const h = 5 + rnd(i, 1) * 2; for (let j = 0; j < 6; j++) add(pg, Cyl(.22 - j * .02, .24 - j * .02, h / 6, 8), T(0x9a6a3a), [Math.sin(j * .3) * .3 * j * .3, h / 12 + j * h / 6, 0], [0, 0, -.06 * j], null, .01);
  for (let j = 0; j < 7; j++) { const lf = add(pg, Box(2.6, .05, .5), T(0x4aa04a), [Math.cos(j * .9) * 1.2 + .6, h + .1, Math.sin(j * .9) * 1.2], [0, -j * .9, -.35], null, .01); } }
// goats + tuareg girl
const goats = []; for (let i = 0; i < 6; i++) { const g = makeCow(false, true); g.position.copy(at(-140 + (i % 3) * 3, 80 + Math.floor(i / 3) * 3)); g.rotation.y = rnd(i, 4) * 6; ds.add(g); goats.push(g); }
const girl = makeHuman({ top: 0x2a5bd6, pants: 0x2a5bd6, robe: true, hairStyle: 'wrap', wrap: 0x1a3aa0, skin: 0xb07a4a, scale: .78 }); ds.add(girl.root);
const tracks = new THREE.InstancedMesh(new THREE.CircleGeometry(.12, 8), B(0x9a6a3a), 80); tracks.frustumCulled = false; ds.add(tracks);
for (let i = 0; i < 80; i++) { const a = i / 80; const p = at(-125 - a * 14 + (i % 2) * .4, 64 + a * 15, .06); dmy.position.copy(p); dmy.rotation.set(-Math.PI / 2, 0, 0); dmy.scale.set(1, 1.5, 1); dmy.updateMatrix(); tracks.setMatrixAt(i, dmy.matrix); }
// heli + plane
const heli = new THREE.Group(); ds.add(heli); add(heli, Cap(.9, 1.6, 12), T(0xf3f5fa), [0, 0, 0], [0, 0, Math.PI / 2], null, .04); add(heli, Cyl(.15, .25, 3, 8), T(0xf3f5fa), [-2.4, .3, 0], [0, 0, Math.PI / 2], null, .03); add(heli, Box(.1, 1.0, .6), T(0xff4b5c), [-3.8, .7, 0], [0, 0, 0], null, .02);
const rotor = add(heli, Box(7, .06, .3), T(0x2b2f45), [0, 1.2, 0], [0, 0, 0], null, .015); add(heli, Sph(.6, 12, 10), T(0x6ab8ff, { emissive: 0x2a5a8a, emissiveIntensity: .3 }), [1.2, .1, 0], [0, 0, 0], [1, .8, .9], .02);
const jet = makePlane747(1.6); ds.add(jet);
const flare = points(120, 0xff6040, .7, { blending: THREE.AdditiveBlending, opacity: 0 }); ds.add(flare);
// critters: lizard + snake + beetle
const liz = G(ds); add(liz, Cap(.12, .5, 8), T(0x9ab04a), [0, .1, 0], [0, 0, Math.PI / 2], null, .01); add(liz, new THREE.ConeGeometry(.08, .6, 6), T(0x9ab04a), [-.55, .08, 0], [0, 0, Math.PI / 2], null, .008); add(liz, Sph(.1, 8, 6), T(0x9ab04a), [.38, .12, 0], [0, 0, 0], [1.3, .8, 1], .01);
const snakeCurve = []; for (let i = 0; i <= 20; i++) snakeCurve.push(V(i * .15, .08, Math.sin(i * .7) * .25)); const snake = add(ds, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(snakeCurve), 40, .07, 6), T(0xc89a4a), [0, 0, 0], [0, 0, 0], null, .01);
// storm sand
const sand = points(3000, 0xe8a860, 2.4, { opacity: 0 }); ds.add(sand);
// runner(s)
const RUN = o => makeHuman(Object.assign({ top: 0xff7a1f, pants: 0x2b2f45, legSkin: true, hair: 0x2a1a10, cap: 0xf3f5fa, neckFlap: true, backpack: 0x4f7cff, bib: true, stubble: true, skin: 0xe8b088 }, o));
const man = RUN({}); ds.add(man.root);
const others = [RUN({ top: 0x4fd8ff, cap: 0xffd23f }), RUN({ top: 0x5cff9a, cap: 0xff4b5c })]; others.forEach(o => ds.add(o.root));
const mound = add(ds, Sph(1, 18, 12), T(0xe8b46a), [0, 0, 0], [0, 0, 0], [1.4, .45, .7], .02);
// time of day presets
const TOD = { day: [0x8fc8f0, 0xfff0d0, 0xf8e0b0, 2.0, 1.7, V(-40, 60, 30)], hot: [0xa8d0f0, 0xfff8e0, 0xfff0c8, 2.4, 1.9, V(-10, 80, 20)], sunset: [0x6a5ab0, 0xff9a5a, 0xf0a070, 1.4, 1.2, V(-80, 12, -60)], night: [0x0a1030, 0x1a2a5a, 0x1a2040, .25, .45, V(60, 50, -40)], dawn: [0x8a9ad8, 0xffc0a0, 0xf8c8a8, 1.2, 1.3, V(80, 10, -60)], storm: [0xc08050, 0xe0a060, 0xd8984a, .9, 1.3, V(-40, 60, 30)] };
function setTOD(k, sd = true) { const p = TOD[k]; sky.set(p[0], p[1]); ds.fog.color.set(p[2]); sun.intensity = p[3]; hemi.intensity = p[4]; sun.position.copy(p[5]); sunDisk.visible = sd && k !== 'night'; sunDisk.position.copy(p[5].clone().normalize().multiplyScalar(820)); sunDisk.lookAt(0, 0, 0); stars.visible = k === 'night'; moon.visible = k === 'night'; ds.fog.near = 60; ds.fog.far = 380; }

// =====================================================================
// SHRINE interior & hospital
// =====================================================================
const inn = new THREE.Scene(); inn.background = new THREE.Color(0x1a1008);
inn.add(new THREE.HemisphereLight(0xffd8a0, 0x302010, .9)); const beamL = new THREE.SpotLight(0xffe0a0, 12, 20, .5, .6, 1); beamL.position.set(0, 2.2, 3.5); beamL.target.position.set(0, 0, -1); inn.add(beamL, beamL.target);
add(inn, Box(5, 3.6, 5), T(0xc8b090, { side: THREE.BackSide }), [0, 1.8, 0], [0, 0, 0], null, 0);
const beamMesh = null && add(inn, new THREE.ConeGeometry(1.4, 4.5, 20, 1, true), B(0xffe0a0, { transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [0, 1.1, 1.2], [1.1, 0, 0], null, 0);
let batGeo; { const b = new THREE.CapsuleGeometry(.07, .12, 4, 8); const w = new THREE.ConeGeometry(.16, .26, 3); w.rotateX(Math.PI); w.scale(1.4, 1, .2); const w1 = w.clone(); w1.translate(.1, 0, 0); const w2 = w.clone(); w2.translate(-.1, 0, 0); const e1 = new THREE.ConeGeometry(.025, .07, 4); e1.translate(.03, .14, 0); const e2 = e1.clone(); e2.translate(-.06, 0, 0); batGeo = mergeGeometries([b.toNonIndexed(), w1.toNonIndexed(), w2.toNonIndexed(), e1.toNonIndexed(), e2.toNonIndexed()]); batGeo.computeVertexNormals(); }
const bats = new THREE.InstancedMesh(batGeo, T(0x3a2a3a), 40); bats.frustumCulled = false; inn.add(bats);
for (let i = 0; i < 40; i++) { dmy.position.set((rnd(i, 1) - .5) * 4, 3.4, (rnd(i, 2) - .5) * 4); dmy.rotation.set(Math.PI, rnd(i, 3) * 6, 0); dmy.scale.setScalar(1 + rnd(i, 4) * .4); dmy.updateMatrix(); bats.setMatrixAt(i, dmy.matrix); }
const man2 = RUN({ backpack: undefined }); inn.add(man2.root);
const hosp = new THREE.Scene(); hosp.background = new THREE.Color(0xdfeef0); hosp.add(new THREE.HemisphereLight(0xffffff, 0xa0b0b0, 1.9)); { const d = new THREE.DirectionalLight(0xffffff, .7); d.position.set(3, 5, 4); hosp.add(d); }
add(hosp, Box(8, 4, 8), T(0xe8f4f4, { side: THREE.BackSide }), [0, 2, 0], [0, 0, 0], null, 0); add(hosp, Box(1.4, .5, 2.6), T(0xf3f5fa), [0, .55, 0], [0, 0, 0], null, .015); add(hosp, Box(1.2, .18, .5), T(0xffffff), [0, .9, -1.0], [0, 0, 0], null, .01);
add(hosp, Box(1.42, .12, 1.8), T(0x7fc8e0), [0, .88, .3], [0, 0, 0], null, .01); add(hosp, Cyl(.03, .03, 2, 6), T(0xc9cdd8), [.95, 1, -.6], [0, 0, 0], null, .006); add(hosp, Box(.25, .35, .08), T(0xbfe6ff, { transparent: true, opacity: .8 }), [.95, 1.9, -.6], [0, 0, 0], null, .006);
const man3 = RUN({ backpack: undefined, cap: undefined, neckFlap: false, top: 0x9ad0e0 }); hosp.add(man3.root);

// =====================================================================
function placeMan(J, p, ry) { J.root.position.copy(p); J.root.rotation.set(0, ry, 0); }
function desert(s, lt, k, t) {
  const sc = s.scene; let tod = 'day', cp, ct, storm = 0, pp, f = { mouth: 'line', blink: blink(t) }, ps;
  others.forEach(o => o.root.visible = false); mound.visible = false; bush.visible = sc !== 'run' && sc !== 'storm'; sos.visible = fireG.visible = false; smoke.material.opacity = 0; flare.material.opacity = 0; heli.visible = jet.visible = false; liz.visible = snake.visible = false; girl.root.visible = false; flagG.visible = ['flag', 'leave', 'sos', 'storm2'].includes(sc); man.root.visible = true; tracks.visible = sc === 'tracks';
  const runAt = (x0, z0, dir, sp = 3) => { const x = x0 + Math.cos(dir) * lt * sp, z = z0 - Math.sin(dir) * lt * sp; const p = at(x, z, .95 + bob(t)); placeMan(man, p, dir + Math.PI / 2); return p; };
  if (sc === 'run') { tod = 'hot'; const p = runAt(-6, 4, .15, 3.4); ps = runPose(t); f = { mouth: 'open', open: .45, brow: .2, blink: blink(t) };
    others.forEach((o, i) => { o.root.visible = true; const q = at(p.x - 4 - i * 3, p.z + 2 + i * 1.5, .95 + bob(t + i)); placeMan(o, q, .15 + Math.PI / 2); pose(o, runPose(t + i * .7)); face(o, { mouth: 'open', open: .4 }); });
    cp = p.clone().add(V(2.6, 1.3, 3.6)); ct = p.clone().add(V(-.6, .3, 0)); }
  else if (sc === 'storm' || sc === 'storm2') { tod = 'storm'; storm = sm(0, .4, k); const p = sc === 'storm' ? runAt(4, 2, .3, 2.2) : at(SH.x + 1, SH.z + 4, .95); if (sc === 'storm') ps = P(runPose(t, 10, .7), { lSh: [-2.2, 0, .4], lEl: [-1.8], head: [.3, 0, 0] }); else { placeMan(man, p, 0); ps = P(SIT, { spine: [.5], head: [.5, 0, 0], lSh: [-1.2, 0, .3], rSh: [-1.2, 0, -.3], lEl: [-1.5], rEl: [-1.5] }); man.root.position.y -= .45; }
    f = { mouth: 'line', eye: .25, brow: .5 }; cp = p.clone().add(V(1.8, 1.1, 2.8)); ct = p.clone().add(V(0, .3, 0)); setShake(.02); }
  else if (sc === 'lost') { tod = 'day'; const p = at(14, 0, .95); placeMan(man, p, Math.sin(t * .8) * 1.2); ps = P(STAND, { head: [0, Math.sin(t * 1.1) * .6, 0], lSh: [0, 0, .5], rSh: [0, 0, -.5] }); f = { mouth: 'frown', brow: .5, look: [Math.sin(t * 1.1), 0], blink: blink(t) };
    const a = .3 + k * .8; cp = p.clone().add(V(Math.cos(a) * 4.5, 2.2 + k * 2.5, Math.sin(a) * 4.5)); ct = p.clone(); }
  else if (sc === 'archive') { tod = 'day'; const p = at(14, 0, .95); placeMan(man, p, .6); ps = P(STAND); cp = p.clone().add(V(4, 2, 6)); ct = p; }
  else if (sc === 'bush') { tod = 'night'; const p = at(BUSH.x + 2.2, BUSH.z + 1.9, .25); placeMan(man, p, -.8); ps = P(SIT, { spine: [.35], head: [.3, 0, 0], lSh: [-1.0, 0, .4], rSh: [-1.0, 0, -.4], lEl: [-1.5], rEl: [-1.5], lHip: [-2.0, 0, .1], rHip: [-2.0, 0, -.1], lKn: [2.2], rKn: [2.2] }); f = { mouth: 'line', eye: .5, brow: .4 };
    cp = p.clone().add(V(3.2, 1.4, 4.2)); ct = p.clone().add(V(-.5, .4, 0)); }
  else if (sc === 'search') { tod = 'hot'; const p = runAt(20, 10, -.4, 2.6); ps = runPose(t, 11, .7); f = { mouth: 'open', open: .5, brow: .4, blink: blink(t) }; const a = 1.2 - k * .5; cp = p.clone().add(V(Math.cos(a) * 6, 3, Math.sin(a) * 6)); ct = p.clone(); }
  else if (sc === 'bottle') { tod = 'hot'; const p = at(30, 8, .95); placeMan(man, p, -.4); ps = P(STAND, { lSh: [-1.3, 0, .2], lEl: [-1.4], head: [.3, 0, 0] }); f = { mouth: 'frown', brow: .5, look: [.3, -.6], blink: blink(t) }; cp = p.clone().add(V(1.8, 1.1, 2.6)); ct = p.clone().add(V(0, .2, 0)); }
  else if (sc === 'heli') { tod = 'sunset'; const p = at(34, 0, .95); placeMan(man, p, -2.4); heli.visible = true; heli.position.set(p.x - 22 - k * 18, p.y + 13, p.z - 36 + k * 10); heli.rotation.y = .4; rotor.rotation.y = t * 30;
    const fa = lt - s.dur * .35; ps = P(STAND, { lSh: [-2.9, 0, .2], lEl: [-.2], head: [-.4, 0, 0] }); if (fa > 0) for (let i = 0; i < 120; i++) { const a = Math.max(0, fa - (i % 30) * .012); flare.pos[i * 3] = p.x - .3; flare.pos[i * 3 + 1] = p.y + 1.5 + a * 9 - a * a * 1.2; flare.pos[i * 3 + 2] = p.z - .4; } flare.upd(); flare.material.opacity = fa > 0 ? clamp(1.4 - fa * .3) : 0;
    f = { mouth: 'open', open: .9, eyeS: 1.15, look: [0, 1], brow: .3 }; cp = p.clone().add(V(4, 1, 6)); ct = p.clone().add(V(-6, 5, -8)); }
  else if (sc === 'shrine' || sc === 'flag' || sc === 'leave') {
    tod = sc === 'leave' ? 'dawn' : 'hot'; const d = SH.clone().add(V(0, .65, 3.6));
    if (sc === 'shrine') { const p = at(SH.x + 6 - k * 5, SH.z + 12 - k * 6, .95); placeMan(man, p, Math.PI * .85); ps = walkPose(t, 5, .35); f = { mouth: 'open', open: .4, eyeS: 1.1, brow: -.1, blink: blink(t) }; cp = p.clone().add(V(4, 2.2, 6)); ct = SH.clone().add(V(0, 2, 0)); }
    else if (sc === 'flag') { placeMan(man, d.clone().add(V(0, -.4, 0)), 0); ps = P(SIT, { rSh: [-1.6, 0, -.2], rEl: [-1.8] }); man.root.updateMatrixWorld(); f = { mouth: k % .2 < .1 ? 'open' : 'line', open: .3, blink: blink(t) }; cp = SH.clone().add(V(7, 3.5, 10)); ct = SH.clone().add(V(0, 3, 0)); }
    else { const p = at(SH.x + 2 + k * 5, SH.z + 6 + k * 6, .95); placeMan(man, p, -Math.PI * .2); ps = P(walkPose(t, 5, .4), { head: [0, -.9 * sm(.3, .5, k) * (1 - sm(.75, .9, k)), 0] }); f = { mouth: 'line', brow: -.3, blink: blink(t) }; cp = p.clone().add(V(-5, 2.4, 7)); ct = p.clone().add(V(2, .8, 2)); }
  }
  else if (sc === 'sos') { tod = 'hot'; sos.visible = true; fireG.visible = true; jet.visible = true; jet.position.set(SOSP.x - 120 + k * 200, 90, SOSP.z - 60); flame.scale.y = 1 + Math.sin(t * 9) * .08; flame2.scale.y = 1 + Math.cos(t * 11) * .1;
    for (let i = 0; i < 220; i++) { const a = (rnd(i, 1) + t * .12) % 1; smoke.pos[i * 3] = fireG.position.x + (rnd(i, 2) - .5) * a * 4 + a * 6; smoke.pos[i * 3 + 1] = fireG.position.y + 1 + a * 22; smoke.pos[i * 3 + 2] = fireG.position.z + (rnd(i, 3) - .5) * a * 4; } smoke.upd(); smoke.material.opacity = .3;
    const p = at(SOSP.x + 4.2, SOSP.z + 3, .95); placeMan(man, p, -2.6); ps = P(STAND, { lSh: [-2.9, 0, .4], rSh: [-2.9, 0, -.4], lEl: [-.2], rEl: [-.2], head: [-.5, 0, 0] }); ps.lSh[2] = .4 + Math.sin(t * 8) * .3; ps.rSh[2] = -.4 - Math.sin(t * 8) * .3; f = { mouth: 'open', open: 1, look: [0, 1], brow: .4 };
    cp = SOSP.clone().add(V(0, 15 - k * 3, 13)); ct = SOSP.clone().add(V(1, 0, 0)); }
  else if (sc === 'dew') { tod = 'dawn'; const r = at(SH.x - 5, SH.z + 3); add; const p = r.clone().add(V(.9, .45, .3)); placeMan(man, p, -1.4); ps = P(SIT, { spine: [.7], neck: [.3], head: [.3, 0, 0], lSh: [-1.4, 0, .1], rSh: [-1.4, 0, -.1], lEl: [-.8], rEl: [-.8], lHip: [-1.9, 0, .1], rHip: [-1.9, 0, -.1], lKn: [2.3], rKn: [2.3] }); f = { mouth: 'open', open: .3, eye: .4 }; cp = p.clone().add(V(-2.6, 1.3, 3.4)); ct = p.clone().add(V(-.6, .4, 0)); }
  else if (sc === 'walk') { tod = 'sunset'; const p = at(-30 - lt * 1.4, -50 - lt * 1.4, .95); placeMan(man, p, Math.PI * .25 + Math.PI); ps = walkPose(t, 4.5, .35); f = { mouth: 'line', eye: .7, brow: .3 }; cp = p.clone().add(V(-3.5, 1.2, 4.5)); ct = p.clone().add(V(-.5, 1.1, -1.5)); }
  else if (sc === 'night') { tod = 'night'; const p = at(-10, -20, .35); placeMan(man, p, 0); man.root.rotation.set(0, 0, Math.PI / 2 - .08); ps = P(STAND, { lHip: [-.9], rHip: [-.7], lKn: [1.2], rKn: [1.0], lSh: [-.9, 0, .2], rSh: [-.9, 0, -.2], lEl: [-1.2], rEl: [-1.2] }); mound.visible = false; mound.position.copy(p).add(V(0, -.05, .4)); mound.scale.set(.55, .3, .8 * sm(0, .5, k) + .01); mound.position.add(V(0, 0, .35)); f = { mouth: 'line', eye: lerp(1, .1, k) }; cp = p.clone().add(V(-.4, 1.6, 3.6)); ct = p.clone().add(V(-.4, .6, 0)); }
  else if (sc === 'food') { tod = 'hot'; const p = at(-32, -48, .45); placeMan(man, p, .4); ps = P(SIT, { spine: [.6], head: [.4, 0, 0], lHip: [-1.9, 0, .2], rHip: [-1.9, 0, -.2], lKn: [2.3], rKn: [2.3], rSh: [-1.2, 0, -.2], rEl: [-.6] }); liz.visible = snake.visible = true;
    liz.position.copy(at(p.x + 1.2 - k * .8, p.z + 1.4, .02)); liz.rotation.y = 2.6 + Math.sin(t * 6) * .2; snake.position.copy(at(p.x - 2.2, p.z + 1.2, 0)); snake.rotation.y = .3 + Math.sin(t) * .1; f = { mouth: 'line', brow: -.3, look: [.6, -.7] }; cp = p.clone().add(V(-.5, 1.6, 4.4)); ct = p.clone().add(V(.2, .0, 1)); }
  else if (sc === 'oasis' || sc === 'drink') { tod = sc === 'oasis' ? 'hot' : 'sunset';
    if (sc === 'oasis') { const p = at(OA.x + 9 - k * 4, OA.z + 6 - k * 2, .55); placeMan(man, p, -2.1); ps = P(STAND, { spine: [.8], head: [-.4, 0, 0], lHip: [-1.2], rHip: [-.8], lKn: [1.2], rKn: [.9], lSh: [-1.4, 0, .2], rSh: [-1.6, 0, -.2] }); f = { mouth: 'open', open: .4, eyeS: 1.15, look: [0, .3] }; cp = p.clone().add(V(4, 2, 4)); ct = OA.clone().add(V(0, .8, 0)); }
    else { const p = OA.clone().add(V(4.2, .3, 0)); placeMan(man, p, Math.PI / 2); man.root.rotation.set(0, 0, Math.PI / 2 - .08); ps = P(STAND, { rSh: [-1.6, 0, -.3], rEl: [-.3] }); f = { mouth: 'smile', eye: lerp(.6, .05, sm(.4, .8, k)) }; cp = p.clone().add(V(-.3, .9, 2.8)); ct = p.clone().add(V(-.4, 0, 0)); }
  }
  else if (sc === 'tracks') { tod = 'day'; const p = at(-118 + k * -5, 62 + k * 6, .95); placeMan(man, p, Math.PI * .75); ps = walkPose(t, 4, .3); girl.root.visible = true; girl.root.position.copy(at(-138, 78, .75)); girl.root.rotation.y = .9; pose(girl, P(STAND, { rSh: [0, 0, -.4], head: [0, -.3 * sm(.6, .8, k), 0] })); face(girl, { mouth: k > .7 ? 'open' : 'line', open: .5, eyeS: 1 + .2 * sm(.6, .8, k), blink: blink(t) });
    goats.forEach((g, i) => { g.userData.head.rotation.z = -.5 + Math.sin(t * 2 + i) * .15; }); f = { mouth: 'open', open: .5, eyeS: 1.1, brow: .2 }; cp = p.clone().add(V(1.5, 2.2, 3.5)); ct = V(-132, DH(-132, 74) + 1, 74); }
  else if (sc === 'return') { tod = 'day'; const p = runAt(10, 30, .2, 3.4); ps = runPose(t); f = { mouth: 'smile', blink: blink(t) }; others.forEach((o, i) => { o.root.visible = true; const q = at(p.x + 3 + i * 2.5, p.z + 1.8 - i * 3, .95 + bob(t + i)); placeMan(o, q, .2 + Math.PI / 2); pose(o, runPose(t + i * .7)); face(o, { mouth: 'open', open: .4 }); }); cp = p.clone().add(V(-3, 1.8, 6.5)); ct = p.clone().add(V(2, .4, 0)); }
  else { tod = 'sunset'; const p = at(0, -10, .95); placeMan(man, p, Math.PI * .8); ps = P(STAND, { head: [-.1, 0, 0] }); f = { mouth: 'smile', blink: blink(t) }; const a = 1.0 + k * .3; cp = p.clone().add(V(Math.cos(a) * 6, 1.8, Math.sin(a) * 6)); ct = p.clone().add(V(0, .9, 0)); }
  setTOD(tod, !['storm', 'storm2'].includes(sc));
  if (storm > 0) { ds.fog.near = lerp(60, 2, storm); ds.fog.far = lerp(380, 26, storm); }
  for (let i = 0; i < 3000 && storm > 0; i++) { const B2 = 30, c = cp; let x = rnd(i, 1) * B2 + t * 14, y = rnd(i, 2) * 8, z = rnd(i, 3) * B2; sand.pos[i * 3] = ((x - c.x) % B2 + B2) % B2 - B2 / 2 + c.x; sand.pos[i * 3 + 1] = c.y - 2 + y + Math.sin(t * 2 + i) * .3; sand.pos[i * 3 + 2] = ((z - c.z) % B2 + B2) % B2 - B2 / 2 + c.z; }
  sand.upd(); sand.material.opacity = .55 * storm;
  if (flagG.visible) { const a = flag.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = flagBase[i * 3]; a.setZ(i, Math.sin(x * 4 - t * 6) * .08 * (x + .6)); } a.needsUpdate = true; }
  pose(man, ps || P(STAND)); face(man, f); { const g = DH(cp.x, cp.z) + .9; if (cp.y < g) cp.y = g; } // never put the camera inside a dune
  setCam(cp, ct, t, { land: 1.1 }); draw(ds);
}
function inside(s, lt, k, t) {
  man2.root.position.set(.3, .45, .8); man2.root.rotation.y = -2.6; pose(man2, P(SIT, { spine: [.15], head: [-.6, 0, 0], rSh: [-1.6, 0, -.2], rEl: [-1.3] })); face(man2, { mouth: 'line', look: [0, 1], brow: .4, blink: blink(t) });
  for (let i = 0; i < 40; i++) { dmy.position.set((rnd(i, 1) - .5) * 4, 3.4, (rnd(i, 2) - .5) * 4); dmy.rotation.set(Math.PI, rnd(i, 3) * 6 + Math.sin(t * 1.5 + i) * .15, Math.sin(t * 2 + i) * .1); dmy.scale.setScalar(1 + rnd(i, 4) * .4); dmy.updateMatrix(); bats.setMatrixAt(i, dmy.matrix); } bats.instanceMatrix.needsUpdate = true;
  setCam(V(2.7, 1.3, 2.9).lerp(V(2.3, 1.6, 2.5), eio(k)), V(-.1, 2.1, -.2), t, { keep: true, fov: 58 }); draw(inn);
}
function hospital(s, lt, k, t) {
  man3.root.position.set(0, 1.05, -.2); man3.root.rotation.set(-Math.PI / 2 + .4, 0, 0); pose(man3, P(STAND, { lSh: [0, 0, .3], rSh: [0, 0, -.3] })); face(man3, { mouth: 'smile', eye: .7, blink: blink(t) });
  setCam(V(2.4, 2.2, 2.6).lerp(V(1.8, 1.9, 2.0), eio(k)), V(0, 1.0, -.3), t, { keep: true, fov: 52 }); draw(hosp);
}
function render(s, lt, k, t) { if (s.scene === 'bats') inside(s, lt, k, t); else if (s.scene === 'hospital') hospital(s, lt, k, t); else desert(s, lt, k, t); }

function cards(s, lt, k) {
  const a = sm(.12, .4, lt);
  switch (s.scene) {
    case 'run': return card(330, `<div class="t">${L('температура', 'temperature')}</div><div class="v" style="color:#ff4b5c">${EN ? '+115 <small>°F</small>' : '+46 <small>°C</small>'}</div><div class="n">${L('«Марафон песков»', 'Marathon des Sables')}</div>`, a);
    case 'storm': return card(330, `<div class="t">${L('песчаная буря', 'sandstorm')}</div><div class="v">${Math.max(1, Math.ceil(eio(k) * 8))} <small>${L('ч', 'h')}</small></div>`, a);
    case 'storm2': return card(330, `<div class="t">${L('вторая буря', 'second storm')}</div><div class="v">12 <small>${L('ч', 'h')}</small></div>`, a);
    case 'bottle': { const v = lerp(18, 4, eio(k)); return card(330, `<div class="t">${L('вода', 'water')}</div><div class="v" style="color:#ff4b5c">${Math.round(v)} <small>%</small></div><div class="bar"><div style="width:${v}%;background:#4fd8ff"></div></div><div class="n">${L('в жару — до 1,5 л пота в час', 'heat: up to 1.5 L of sweat an hour')}</div>`, a); }
    case 'map': return '';
    case 'hospital': return card(330, `<div class="t">${L('вес', 'weight')}</div><div class="v">${EN ? '−33 <small>lb</small>' : '−15 <small>кг</small>'}</div><div class="n">${L('за 9 дней', 'in 9 days')}</div>`, a);
    case 'return': return card(330, `<div class="t">${L('вернулся на марафон', 'came back to the race')}</div><div class="v">× 6</div><div class="n">${L('13-е место в 2001 году', '13th place in 2001')}</div>`, sm(.3, .55, k));
  }
  return '';
}
function full(s, lt, k) {
  const a = sm(0, .3, lt);
  if (s.scene === 'archive') {
    const svg = `<svg viewBox="0 0 400 220" width="${PORT ? 740 : 660}" height="${PORT ? 407 : 363}"><rect width="400" height="220" fill="#f2c27a"/><path d="M0 170 Q100 130 200 165 T400 150 V220 H0 Z" fill="#e0a860" stroke="#1a1033" stroke-width="4"/><circle cx="320" cy="55" r="28" fill="#fff2c0"/><g transform="translate(170,70)" stroke="#1a1033" stroke-width="5" stroke-linecap="round" fill="none"><circle cx="20" cy="10" r="16" fill="#e8b088"/><path d="M4 2 Q20 -14 36 2 Z" fill="#f3f5fa"/><path d="M20 26 L14 70"/><path d="M14 70 L-6 100 M14 70 L36 98"/><path d="M18 36 L-8 56 M18 36 L44 46"/><rect x="0" y="30" width="26" height="30" rx="6" fill="#ff7a1f"/><rect x="-14" y="30" width="16" height="26" rx="4" fill="#4f7cff"/></g></svg>`;
    return paper(a, k, `${svg}<div style="font-weight:900;font-size:66px;margin-top:12px;color:#1a1033">${L('МАУРО ПРОСПЕРИ', 'MAURO PROSPERI')}</div><div style="font-weight:700;font-size:34px">${L('Италия · 38 лет', 'Italy · age 38')}</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:6px">${L('полицейский, бывший пятиборец', 'police officer, former pentathlete')}</div>`);
  }
  if (s.scene === 'map') {
    const x0 = PORT ? 90 : 520, y0 = PORT ? 330 : 120, w = 900, h = PORT ? 900 : 760; const pr = eio(sm(.1, .75, k));
    const route = [[300, 300], [330, 360], [300, 420], [360, 470], [420, 520], [470, 600], [520, 650]]; let d = ''; route.forEach(([x, y], i) => d += (i ? 'L' : 'M') + (x * w / 900) + ' ' + (y * h / 900));
    const len = 900;
    const svg = `<svg width="${w}" height="${h}" style="position:absolute;left:${x0}px;top:${y0}px"><rect width="${w}" height="${h}" rx="34" fill="#f2c27a" stroke="#1a1033" stroke-width="8"/><path d="M${w * .52} 0 L${w * .5} ${h * .4} L${w * .62} ${h * .62} L${w * .58} ${h}" stroke="#1a1033" stroke-width="6" stroke-dasharray="18 12" fill="none"/>
      <text x="${w * .22}" y="${h * .14}" font-family="R,RL" font-weight="900" font-size="54" fill="#1a1033">${L('МАРОККО', 'MOROCCO')}</text><text x="${w * .62}" y="${h * .14}" font-family="R,RL" font-weight="900" font-size="54" fill="#1a1033">${L('АЛЖИР', 'ALGERIA')}</text>
      <path d="${d}" stroke="#ff4b5c" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - pr)}"/><circle cx="${300 * w / 900}" cy="${300 * h / 900}" r="18" fill="#1a1033"/>
      <circle cx="${520 * w / 900}" cy="${650 * h / 900}" r="${20 * sm(.7, .8, k)}" fill="#ff4b5c" stroke="#1a1033" stroke-width="6"/><text x="${540 * w / 900}" y="${720 * h / 900}" font-family="R,RL" font-weight="900" font-size="44" fill="#1a1033" opacity="${sm(.75, .85, k)}">${L('Тиндуф', 'Tindouf')}</text>
      <text x="${w / 2}" y="${h * .93}" text-anchor="middle" font-family="R,RL" font-weight="900" font-size="80" fill="#ff4b5c">${EN ? fmtN(lerp(0, 180, pr)) + ' mi' : fmtN(lerp(0, 291, pr)) + ' км'}</text></svg>`;
    return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${.8 * a})"></div><div style="position:absolute;inset:0;opacity:${a}">${svg}</div>`;
  }
  return '';
}
function fx(s, lt, k) { if (s.scene === 'night') return { bk: .15 }; if (s.scene === 'drink') return { bk: .35 * sm(.5, 1, k) }; return {}; }
start({ render, cards, full, fx, mins: { heli: 3.6, map: 4.0 }, bubbles: ['#c0703a', '#e0a050', '#f2c27a'] });
