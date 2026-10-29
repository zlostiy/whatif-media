// «Лишних навыков не бывает: танк „Маус“» — стиль 31 «пиксели + 3D»
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card, camera } from '../../core.js';
import { world, field, shoot, pxBox, pxCyl, pxMat, MAT, flat, lit, grp, makeHero, ramp, h2, fbm, glow } from '../../lemo/kit31.js';

const S = world({ fog: '#cdb894', fogD: .006 });
field(S, 260);
const dirtM = MAT.dirt(); pxBox(S, 12, .42, 260, dirtM, 0, -.4, 0);           // test-range track along z
// ---------- the Maus (≈10 m long): hull, tracks, turret, gun; roof pieces can be lifted for the cut-away ----------
const steel = MAT.steel(), treadL = MAT.tread(), treadR = treadL.clone(); treadR.map = treadL.map.clone(); treadR.map.needsUpdate = true;
function makeTank(parent) {
  const T = grp(parent, 0, 0, 0);
  for (const [sx, m] of [[-1, treadL], [1, treadR]]) { pxBox(T, .9, 1.5, 10.2, m, sx * 1.75, 0, 0); for (let i = 0; i < 6; i++) { const w = pxCyl(T, .55, .55, .25, steel, sx * 2.25, .6, -3.6 + i * 1.45, 14); w.rotation.z = Math.PI / 2; } }
  const hull = pxBox(T, 3.6, 1.2, 9.6, steel, 0, 1.3, 0);
  const wallsCut = grp(T, 0, 0, 0); for (const sx of [-1, 1]) pxBox(wallsCut, .2, 1.2, 9.6, steel, sx * 1.7, 1.3, 0); pxBox(wallsCut, 3.6, 1.2, .2, steel, 0, 1.3, 4.7); pxBox(wallsCut, 3.6, 1.2, .2, steel, 0, 1.3, -4.7); wallsCut.visible = false;
  const roofF = pxBox(T, 3.6, .25, 3.4, steel, 0, 2.5, 3.1), roofR = pxBox(T, 3.6, .25, 3.0, steel, 0, 2.5, -3.3);
  const tur = grp(T, 0, 2.5, -.2); pxBox(tur, 3.3, 1.5, 3.8, steel, 0, 0, 0); const gun = pxCyl(tur, .17, .2, 4.8, steel, 0, .85, 4.2, 12); gun.rotation.x = Math.PI / 2; pxCyl(tur, .5, .5, .5, steel, -.8, 1.5, -.6, 12);
  const glacis = pxBox(T, 3.6, .9, .8, steel, 0, 1.3, 5.0); glacis.rotation.x = -.6;
  // inside (seen when the roof is lifted): driver seat front-left, partition, engine → generator → two motors (glowing cables)
  const inside = grp(T, 0, 1.32, 0); inside.visible = false;
  pxBox(inside, 3.4, .1, 9.4, MAT.panel(), 0, 0, 0);
  pxBox(inside, .8, .6, .8, flat('#3a3d45'), -.9, .1, 3.6);
  pxBox(inside, 3.4, 1.1, .12, flat('#596270'), 0, .1, 2.4);                          // partition: you can't see the turret
  const eng = pxBox(inside, 1.8, .9, 2.2, flat('#7a6a5a'), 0, .1, .5); const gen = pxCyl(inside, .45, .45, 1.4, flat('#4a6aa0'), 0, .65, -1.2, 16); gen.rotation.x = Math.PI / 2;
  const motors = [-1, 1].map(sx => { const m = pxCyl(inside, .35, .35, .8, flat('#4a6aa0'), sx * 1.1, .55, -3.8, 14); m.rotation.z = Math.PI / 2; return m; });
  const cableM = lit('#ffd23f', 0); const cables = [-1, 1].map(sx => { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, .65, -1.9), V(sx * .6, .7, -2.8), V(sx * 1.1, .6, -3.5)]), 20, .07, 8), cableM); inside.add(c); return c; });
  const hero = makeHero(); hero.root.position.set(-.9, .8, 3.6); hero.frame('grip'); inside.add(hero.root);
  const hatchHero = makeHero(); hatchHero.root.position.set(.7, 3.6, -.9); T.add(hatchHero.root);
  T.userData = { roofF, roofR, tur, inside, cableM, hero, hatchHero, motors, hull, wallsCut, glacis };
  return T;
}
const tank = makeTank(S);
// parked cars for the "≈150 cars" comparison (instanced, many colours)
const carRows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.4, 4.2), new THREE.MeshStandardMaterial({ roughness: .6 }), 150); carRows.castShadow = carRows.receiveShadow = true;
{ const m = new THREE.Matrix4(), c = new THREE.Color(), cols = ['#e8463c', '#2f5fb3', '#f2c230', '#f4f4f0', '#3f8f5a', '#2a2d33', '#e07bb0']; for (let i = 0; i < 150; i++) { m.makeTranslation(9 + (i % 15) * 2.4, .7, -18 + Math.floor(i / 15) * 5); carRows.setMatrixAt(i, m); carRows.setColorAt(i, c.set(cols[(i * 5) % 7])); } }
carRows.visible = false; S.add(carRows);
// a cyclist (pixel rider on a simple bike)
const bike = grp(S, 0, 0, 0); for (const z of [-.55, .55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.33, .05, 6, 16), flat('#1d1d22')); w.position.set(0, .35, z); w.rotation.y = Math.PI / 2; bike.add(w); } pxBox(bike, .08, .08, 1.1, flat('#e8463c'), 0, .55, 0);
const rider = makeHero({ s: .9, tint: '#bfe0ff' }); rider.root.position.set(0, .2, 0); bike.add(rider.root); bike.visible = false;
// river + small bridge (for the "bridge" shot), placed further along the track
const RZ = 70; const waterM = MAT.water(); waterM.opacity = .42; waterM.depthWrite = false; const river = pxBox(S, 260, 4.6, 14, waterM, 0, 0, RZ); river.castShadow = false;
pxBox(S, 260, .1, 14, MAT.dirt(), 0, -.05, RZ);
const bridge = grp(S, 0, 0, RZ); pxBox(bridge, 8, .5, 18, MAT.concrete(), 0, 5, 0); for (const x of [-3.5, 3.5]) for (const z of [-7.5, 7.5]) pxBox(bridge, .6, 5, .6, MAT.concrete(), x, 0, z); for (const x of [-3.8, 3.8]) pxBox(bridge, .2, .8, 18, MAT.concrete(), x, 5.5, 0);
for (const z of [RZ - 9.5, RZ + 9.5]) pxBox(S, 8, 5, 4, MAT.dirt(), 0, 0, z);
const snorkel = pxCyl(tank, .3, .3, 9, steel, -.6, 7.5, -1.2, 12); snorkel.visible = false;
// the old empty car for the exam (flattens when the tank rolls over it)
const junk = grp(S, 0, 0, 30); const rust = pxMat('rust', 24, 24, (x, y) => ramp(['#3a1c10', '#6a3418', '#94522a', '#b8784a'])(.45 + (fbm(x * .3, y * .3, 3) - .5) * .7, x, y));
pxBox(junk, 2, 1, 4.4, rust, 0, .25, 0); pxBox(junk, 1.8, .8, 2.2, rust, 0, 1.25, -.2); for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) { const w = pxCyl(junk, .38, .38, .3, flat('#1d1d22'), x, .38, z, 12); w.rotation.z = Math.PI / 2; }
// museum hangar (Kubinka)
const MU = world({ fog: '#2a2622', fogD: .006, top: '#1a1a22', mid: '#2a2a33', hor: '#3a3530', sunI: .8, hemiI: 1.2 });
pxBox(MU, 60, .2, 40, MAT.concrete(), 0, -.2, 0); pxBox(MU, 60, 14, .5, MAT.panel(), 0, 0, -14); for (const x of [-24, -8, 8, 24]) pxBox(MU, .6, 14, 30, flat('#3a3530'), x, 0, 0).visible = false;
for (let i = 0; i < 5; i++) { pxBox(MU, 60, .4, .4, flat('#4a443c'), 0, 12, -12 + i * 6); const lamp = new THREE.PointLight('#ffcf8a', 40, 18, 1.6); lamp.position.set(-10 + i * 5, 10, -2); MU.add(lamp); const gl = glow('#ffcf8a', 2.2, 1.2); gl.position.set(-10 + i * 5, 11, -2); MU.add(gl); }
const tank2 = makeTank(MU); tank2.userData.hatchHero.root.visible = false;
const visitors = [[-6, 5, '#ffb0b0'], [-4.6, 5.6, '#b0ffb8'], [6, 4.5, '#b0c8ff']].map(([x, z, c]) => { const v = makeHero({ tint: c }); v.root.position.set(x, 0, z); MU.add(v.root); return v; });
pxBox(MU, 3, 1.1, .2, lit('#d8b45a', .4), 5.5, 0, 6.5);                         // the museum plate (no text)

const blink = t => (t % 3.1) < .12;
function setFrames(t, cam) { const U = tank.userData; U.hatchHero.frame(blink(t) ? 'blink' : (Math.floor(t * 2) % 2 ? 'hs' : 'hsWave')); U.hatchHero.face(cam); U.hero.frame(Math.floor(t * 3) % 2 ? 'grip' : 'grip1'); U.hero.face(cam); }
const V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, U = tank.userData; tank.position.set(0, 0, 0); tank.rotation.set(0, 0, 0); U.roofF.visible = U.roofR.visible = true; U.tur.visible = true; U.inside.visible = false; U.hull.visible = true; U.wallsCut.visible = false; U.glacis.visible = true; U.tur.position.y = 2.5; U.hatchHero.root.visible = true; U.cableM.emissiveIntensity = 0;
  carRows.visible = false; bike.visible = false; snorkel.visible = false; junk.scale.set(1, 1, 1); junk.position.set(0, 0, 30); treadL.map.offset.y = treadR.map.offset.y = 0;
  const sky = S.userData.sky.u; sky.top.value.set('#3a6fb0'); sky.mid.value.set('#7fa9d6'); sky.hor.value.set('#f0d6a0');
  let cam, look, subj, o = {};
  if (sc === 'intro' || sc === 'end') { const u = eio(clamp(lt / s.dur)); cam = new V3(lerp(26, 20, u), lerp(17, 14, u), lerp(30, 24, u)); look = new V3(0, 2.2, 0); subj = new V3(.7, 4.2, -.9);
    if (sc === 'end') { sky.top.value.set('#2a2f5a'); sky.mid.value.set('#c86a5a'); sky.hor.value.set('#ffb070'); } }
  else if (sc === 'weight') { carRows.visible = true; cam = new V3(-14, 34, 52); look = new V3(12, 1, 2); subj = new V3(4, 1.5, 0); o.tilt = 10; }
  else if (sc === 'seat' || sc === 'engine') { U.roofF.visible = U.roofR.visible = false; U.hull.visible = false; U.wallsCut.visible = true; U.glacis.visible = false; U.tur.visible = sc !== 'engine'; U.inside.visible = true; U.hatchHero.root.visible = false; U.tur.position.y = sc === 'seat' ? 2.5 + sm(0, .4, k) * 1.5 : 2.5;
    if (sc === 'engine') { U.cableM.emissiveIntensity = sm(.35, .6, k) * 3; U.motors.forEach(m => m.rotation.x = lt * 6 * sm(.5, .7, k)); }
    cam = sc === 'seat' ? new V3(7, 10, 14) : new V3(10, 13, 2); look = sc === 'seat' ? new V3(-.9, 1.6, 3.4) : new V3(0, 1.6, -1.5); subj = look; o.tilt = 8; }
  else if (sc === 'turn') { tank.rotation.y = eio(k) * .9; treadL.map.offset.y = lt * .6; treadR.map.offset.y = lt * 1.3; cam = new V3(24, 20, 28); look = new V3(0, 1.8, 0); subj = new V3(0, 2, 0); }
  else if (sc === 'speed') { tank.position.z = lt * 3.6 / 3.6 * 1.2; treadL.map.offset.y = treadR.map.offset.y = lt; bike.visible = true; bike.position.set(-3.6, 0, lerp(-8, 16, k)); rider.frame(Math.floor(lt * 6) % 2 ? 'w0' : 'w2'); rider.face(camera);
    cam = new V3(24, 15, tank.position.z + 22); look = new V3(-1, 1.6, tank.position.z + 2); subj = new V3(-2, 1.5, tank.position.z + 2); }
  else if (sc === 'bridge') { const under = k > .5; tank.position.set(under ? -9.5 : 0, 0, under ? RZ + lerp(-4, 4, (k - .5) * 2) : RZ - 18 + Math.min(k * 2, 1) * 3); snorkel.visible = under; treadL.map.offset.y = treadR.map.offset.y = lt * .5;
    cam = new V3(-40, 30, RZ + 14); look = new V3(-4, 1, RZ - 4); subj = new V3(tank.position.x, 1, tank.position.z); o.tilt = 8; o.fov = 34; }
  else if (sc === 'crush') { const z = lerp(16, 34, eio(k)); tank.position.z = z; treadL.map.offset.y = treadR.map.offset.y = z * .5; const over = clamp((z + 5 - 27.8) / 4); junk.scale.y = lerp(1, .22, sm(0, .6, over)); junk.scale.x = lerp(1, 1.15, over);
    sky.top.value.set('#2a2f5a'); sky.mid.value.set('#c86a5a'); sky.hor.value.set('#ffb070'); const a = lt * .2 + .6; cam = new V3(Math.sin(a) * 22 + 4, 10, 30 + Math.cos(a) * 22); look = new V3(0, 1.4, 30); subj = new V3(0, 1, 30); o.sunDir = [-20, 12, 10]; }
  else if (sc === 'museum') { const u = eio(clamp(lt / s.dur)); visitors.forEach((v, i) => { v.frame(blink(t + i) ? 'blink' : 'idle0'); v.face(camera); });
    camera.position.set(lerp(22, 18, u), 11, lerp(26, 22, u)); return shoot(MU, new V3(lerp(22, 18, u), 11, lerp(26, 22, u)), new V3(0, 2, 0), { subject: new V3(0, 2.5, 0), expo: 1.7, tilt: 10 }); }
  camera.position.copy(cam); setFrames(t, camera);
  return shoot(S, cam, look, Object.assign({ subject: subj }, o));
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'weight') return card(330, `<div class="t">${L('вес «Мауса»', 'Maus weight')}</div><div class="v">188 <small>${L('т', 't')}</small></div><div class="n">${L('≈ 150 легковых машин', '≈ 150 cars')}</div>`, a);
  if (s.card === 'hp') return card(330, `<div class="t">${L('двигатель', 'engine')}</div><div class="v">1080 <small>${L('л.с.', 'hp')}</small></div><div class="n">${L('крутит генератор, а не гусеницы', 'spins a generator, not the tracks')}</div>`, a);
  if (s.card === 'speed') return card(330, `<div class="t">${L('скорость на испытаниях', 'top speed in trials')}</div><div class="v">13 <small>${L('км/ч', 'km/h')}</small></div><div class="n">${L('велосипедист быстрее', 'a cyclist is faster')}</div>`, a);
  return '';
}
start({ render, cards, mins: { crush: 7, end: 3.5 }, bubbles: ['#56602f', '#f2c230', '#2a2d33'] });
