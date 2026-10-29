// «Лишних навыков не бывает: ядерный реактор (тренажёр) + Чернобыль-1986» — стиль 31 «пиксели + 3D»
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card, camera } from '../../core.js';
import { world, field, shoot, pxBox, pxCyl, pxMat, MAT, flat, lit, grp, makeHero, ramp, h2, fbm, glow } from '../../lemo/kit31.js';

// ================= 1) control room (simulator) =================
const R = world({ fog: '#1a1d24', fogD: .01, top: '#0e1016', mid: '#161a22', hor: '#20242c', sunI: .6, hemiI: .9, hemiTop: '#c8d8ff', hemiBot: '#2a2a33' });
pxBox(R, 30, .2, 22, pxMat('floorTiles', 48, 48, (x, y) => ramp(['#2a2e36', '#3a404a', '#4c535e', '#5e6672'])(((x >> 3) + (y >> 3)) % 2 ? .55 : .4 + (h2(x, y, 2) - .5) * .1, x, y)), 0, -.2, 0);
pxBox(R, 30, 8, .4, MAT.panel(), 0, 0, -8); pxBox(R, .4, 8, 22, MAT.panel(), -12, 0, 0);
// wall of indicator panels with many lamps (static colours, no blinking)
const lampWall = pxMat('lampWall', 64, 32, (x, y) => { const R2 = ramp(['#1a1e24', '#2a3038', '#3a424c']); if (x % 8 === 3 && y % 8 === 3) { const h = h2(x, y, 5); return h > .7 ? [255, 190, 80] : h > .45 ? [90, 220, 140] : [60, 70, 80]; } return R2(.5 + (y % 8 === 0 ? -.3 : 0), x, y); }, { em: (x, y) => { if (x % 8 === 3 && y % 8 === 3) { const h = h2(x, y, 5); return h > .7 ? [255, 190, 80] : h > .45 ? [90, 220, 140] : null; } return null; }, emI: 1.6 });
pxBox(R, 22, 4.5, .3, lampWall, 0, 1.6, -7.7);
// the console: desk + sloped panel + rods slider row + pump switches + gauge + RED BUTTON
const C = grp(R, 0, 0, -2);
pxBox(C, 12, 1.1, 2.6, MAT.panel(), 0, 0, 0); const slope = pxBox(C, 12, .25, 1.6, MAT.panel(), 0, 1.25, -.4); slope.rotation.x = .5;
const rods = []; for (let i = 0; i < 8; i++) { pxBox(C, .14, .05, 1.0, flat('#14161a'), -4.6 + i * .5, 1.12, .5); const k = pxBox(C, .32, .25, .22, lit('#4fd8ff', .6), -4.6 + i * .5, 1.12, .5); rods.push(k); }
const pumps = [0, 1, 2].map(i => pxBox(C, .5, .35, .5, lit('#5cd06a', .2), .4 + i * .9, 1.12, .6));
const dial = grp(C, 3.9, 1.6, -.2); pxCyl(dial, .75, .75, .1, flat('#e9e6df'), 0, 0, 0, 24).rotation.x = Math.PI / 2 - .5; const needle = pxBox(dial, .06, .65, .05, flat('#e8463c'), 0, 0, .08); needle.rotation.x = -.5;
const btnBase = pxCyl(C, .55, .6, .25, flat('#2a2a2e'), 5.2, 1.1, .7, 20); const btn = pxCyl(C, .42, .42, .22, lit('#ff2a2a', .3), 5.2, 1.35, .7, 20);
const op = makeHero(); op.root.position.set(1.5, 0, 2.2); R.add(op.root);
const redLamp = new THREE.PointLight('#ff3020', 0, 30, 1.4); redLamp.position.set(0, 6, 2); R.add(redLamp);
const roomLights = [-6, 0, 6].map(x => { const l = new THREE.PointLight('#e8f0ff', 26, 16, 1.5); l.position.set(x, 6.5, 1); R.add(l); pxBox(R, 3, .15, .6, lit('#eaf2ff', 1.5), x, 7.6, 1); return l; });

// ================= 2) reactor model (cut-away diorama on a table) =================
const D = world({ fog: '#1e2230', fogD: .006, top: '#141826', mid: '#1e2638', hor: '#2c3446', sunI: 1.2, hemiI: 1.0 });
pxBox(D, 60, .3, 40, MAT.concrete(), 0, -.3, 0);
const vessel = pxCyl(D, 3.2, 3.2, 7, flat('#8a929e'), -8, 3.5, 0, 24); vessel.material = vessel.material.clone(); vessel.material.transparent = true; vessel.material.opacity = .35; vessel.material.depthWrite = false;
const core = pxCyl(D, 2.2, 2.2, 3.4, lit('#ff9a3a', 1.2), -8, 2.2, 0, 24); const coreGlow = glow('#ff9a3a', 9, 1); coreGlow.position.set(-8, 2.4, 0); D.add(coreGlow);
const dRods = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const r = pxBox(D, .32, 5, .32, flat('#2a2d33'), -8 + Math.cos(a) * 1.4, 1.2, Math.sin(a) * 1.4); dRods.push(r); }
// steam pipe → turbine (with a spinning wheel) → power line → small city
const pipeHot = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-8, 7, 0), V(-6, 9, 0), V(0, 9, 0), V(3, 6, 0)]), 40, .45, 10), pxMat('pipeFlow', 32, 8, (x, y) => ramp(['#8a929e', '#c8ced6', '#f2f6fa'])(((x + y) % 8) < 3 ? .9 : .4, x, y)));
D.add(pipeHot); pipeHot.material.map.repeat.set(8, 1);
const pipeCold = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(3, 2, 0), V(0, 1, 2.5), V(-5, 1, 2.5), V(-8, .8, 2.6)]), 40, .4, 10), pxMat('pipeWater', 32, 8, (x, y) => ramp(['#1d4a70', '#2a6592', '#4a8ab4', '#8cc4e0'])(((x + y) % 8) < 3 ? .9 : .4, x, y)));
D.add(pipeCold); pipeCold.material.map.repeat.set(8, 1);
const pumpD = pxCyl(D, .9, .9, 1.4, flat('#4a6aa0'), -3, 1, 2.5, 16);
pxBox(D, 5, 4, 4, MAT.panel(), 5, 0, 0); const wheel = grp(D, 5, 2.2, 2.05); for (let i = 0; i < 6; i++) { const b = pxBox(wheel, .3, 1.6, .1, flat('#d8d2c4'), 0, 0, 0); b.rotation.z = i / 6 * Math.PI; b.position.y = -.0; }
for (let i = 0; i < 4; i++) { pxBox(D, .3, 6, .3, flat('#6a6458'), 10 + i * 4, 0, -2); }
const wireM = lit('#ffd23f', 0); const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(7.5, 4, 0), V(10, 6, -2), V(14, 6, -2), V(18, 6, -2), V(22, 6, -2), V(24, 3, 0)]), 50, .08, 6), wireM); D.add(wireM && wire);
const city = grp(D, 26, 0, 2); const cityWin = lit('#ffd37a', 0); for (let i = 0; i < 9; i++) { const h = 2 + (i * 37 % 5); pxBox(city, 1.6, h, 1.6, flat('#4a5262'), (i % 3) * 2.2, 0, Math.floor(i / 3) * 2.2); pxBox(city, 1.62, .3, 1.62, cityWin, (i % 3) * 2.2, h * .6, Math.floor(i / 3) * 2.2); }
// cartoon "explosion" for the simulator: a few big smooth spheres (no particles, no people)
const boomM = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
const booms = [['#ffd23f', 0, 0], ['#ff8a2a', 1.5, .8], ['#e8463c', -1.2, 1.4], ['#9a9a9a', .6, 2.6]].map(([c, x, y]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), boomM(c)); m.position.set(-8 + x, 4 + y, 0); D.add(m); return m; });

// ================= 3) Chernobyl NPP, 1986 (night model) =================
const N = world({ fog: '#141826', fogD: .005, top: '#070a14', mid: '#101830', hor: '#1e2a44', sunI: .5, sunLight: '#9fb4e0', hemiI: .7 });
field(N, 220);
const plantM = pxMat('plantWall', 48, 48, (x, y) => ramp(['#5a5e66', '#727780', '#8c929c', '#a6acb6'])(.55 + (y % 12 === 0 ? -.25 : 0) + (x % 16 === 0 ? -.1 : 0) + (h2(x, y, 9) - .5) * .1, x, y));
pxBox(N, 80, 10, 14, plantM, 0, 0, 6);                         // turbine hall
const unit4 = grp(N, 26, 0, -8); pxBox(unit4, 18, 22, 16, plantM, 0, 0, 0); const roof4 = pxBox(unit4, 18.5, 2, 16.5, flat('#4a4e56'), 0, 22, 0);
for (const x of [-28, -10, 8]) pxBox(N, 16, 20, 14, plantM, x, 0, -8);
const stack = grp(N, 17, 22, -8); for (let i = 0; i < 8; i++) pxCyl(stack, 2.2 - i * .1, 2.3 - i * .1, 4, flat(i % 2 ? '#e8463c' : '#f2efe8'), 0, i * 4 + 2, 0, 16);
const steam = [0, 1, 2, 3, 4].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: '#d8dce4', roughness: 1, transparent: true, opacity: 0, depthWrite: false })); m.position.set(26 + (i % 2 ? 3 : -2), 26 + i * 6, -8 + (i % 3) - 1); N.add(m); return m; });
const plantLights = [-30, -10, 10, 30].map(x => { const l = new THREE.PointLight('#ffcf8a', 30, 30, 1.6); l.position.set(x, 12, 16); N.add(l); return l; });

const blink = t => (t % 3.1) < .12;
const V3 = THREE.Vector3;
function room(s, lt, k, t, st) {
  rods.forEach((r, i) => r.position.z = .5 - st.rods * .4); pumps.forEach(p => p.material.emissiveIntensity = st.pumps * 1.5);
  needle.rotation.z = lerp(1.1, -1.1, st.power); btn.position.y = 1.35 - st.press * .12; btn.material.emissiveIntensity = .3 + st.btnGlow * 2.5;
  redLamp.intensity = st.red * 80; roomLights.forEach(l => l.intensity = 26 * (1 - st.red * .7));
  op.frame(st.press > .5 ? 'point' : blink(t) ? 'blink' : (Math.floor(t * 2) % 2 ? 'idle0' : 'talk'));
  const cam = st.cam || new V3(3, 10, 21); camera.position.copy(cam); op.face(camera, true);
  return shoot(R, cam, st.look || new V3(1.5, 2.2, -2), { subject: st.subj || new V3(1.5, 1.6, 2), expo: 1.25, tilt: 10, aper: 1.6 });
}
function model(s, lt, k, t, st) {
  dRods.forEach(r => r.position.y = 1.2 + st.rods * 3.4); core.material.emissiveIntensity = .4 + st.power * 2.4; coreGlow.material.opacity = .4 + st.power * .6; coreGlow.scale.setScalar(6 + st.power * 6);
  pipeHot.material.map.offset.x = -lt * st.flow * .8; pipeCold.material.map.offset.x = lt * st.flow * .8; wheel.rotation.z = lt * st.flow * 4; wireM.emissiveIntensity = st.flow * 2; cityWin.emissiveIntensity = st.flow * 2.4;
  booms.forEach((m, i) => { const e = clamp(st.boom * 1.3 - i * .1); m.scale.setScalar(.01 + e * (5 + i * 1.6)); m.material.opacity = e > 0 ? Math.min(.95, e * 2) * (1 - clamp((st.boom - .85) * 4)) : 0; });
  const cam = st.cam || new V3(6, 18, 34); camera.position.copy(cam);
  return shoot(D, cam, st.look || new V3(4, 3, 0), { subject: st.subj || new V3(-6, 3, 0), expo: 1.2, tilt: 10, aper: 1.6, fov: 34 });
}
function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  const base = { rods: .5, pumps: 1, power: .5, press: 0, btnGlow: 0, red: 0 };
  if (sc === 'intro') return room(s, lt, k, t, Object.assign(base, { cam: new V3(lerp(6, 3, u), lerp(13, 10, u), lerp(27, 21, u)) }));
  if (sc === 'boiler') { const x = lerp(-8, 26, u); return model(s, lt, k, t, { rods: .5, power: .55, flow: 1, boom: 0, cam: new V3(x + 4, 22, 40), look: new V3(x, 3, 0), subj: new V3(x, 3, 0) }); }
  if (sc === 'rods') { const r = .5 + Math.sin(lt * 1.2) * .45; return model(s, lt, k, t, { rods: r, power: r, flow: .4 + r * .6, boom: 0, cam: new V3(-2, 12, 18), look: new V3(-7, 3, 0), subj: new V3(-8, 3, 0) }); }
  if (sc === 'pumps') { const f = k < .55 ? 1 : 1 - sm(.55, .75, k) * .85; return model(s, lt, k, t, { rods: .5, power: .5 + (1 - f) * .5, flow: f, boom: 0, cam: new V3(4, 10, 16), look: new V3(-4, 1.5, 1.5), subj: new V3(-3, 1.5, 2.5) }); }
  if (sc === 'button') return room(s, lt, k, t, Object.assign(base, { press: sm(.45, .55, k) - sm(.75, .85, k), btnGlow: .4 + Math.sin(lt * 3) * .2, rods: 1 - sm(.5, .7, k), power: .5 - sm(.5, .8, k) * .45, cam: new V3(9, 6, 7), look: new V3(5.2, 1.4, -1.3), subj: new V3(5.2, 1.4, -1.3) }));
  if (sc === 'hurry') return room(s, lt, k, t, Object.assign(base, { rods: 0, pumps: .25, power: lerp(.5, .8, eio(k)), press: sm(.85, .95, k), btnGlow: sm(.85, .95, k), cam: new V3(8, 7, 10), look: new V3(3.5, 1.5, -2), subj: new V3(4, 1.6, -2) }));
  if (sc === 'boom') { const b = sm(.15, 1, k); if (k < .2) return room(s, lt, k, t, Object.assign(base, { rods: 0, power: 1, red: sm(0, .2, k), btnGlow: 1, cam: new V3(8, 7, 10), look: new V3(3.5, 1.5, -2) }));
    return model(s, lt, k, t, { rods: 0, power: 1, flow: .2, boom: b, cam: new V3(-2, 18, 36), look: new V3(-7, 5, 0), subj: new V3(-8, 4, 0) }); }
  if (sc === 'real' || sc === 'steam') {
    const e = sc === 'steam' ? sm(0, .7, k) : 0; roof4.visible = sc !== 'steam'; steam.forEach((m, i) => { const g = clamp(e * 1.3 - i * .12); m.scale.setScalar(.01 + g * (6 + i * 2)); m.material.opacity = g > 0 ? .85 : 0; });
    const cam = sc === 'real' ? new V3(lerp(-10, 20, u), 90, 140) : new V3(70, 70, 110); camera.position.copy(cam);
    return shoot(N, cam, new V3(14, 12, -6), { subject: new V3(26, 18, -8), expo: 1.4, tilt: 10, fov: 34, aper: 2 }); }
  return room(s, lt, k, t, Object.assign(base, { cam: new V3(lerp(3, 6, u), lerp(10, 13, u), lerp(21, 27, u)) }));
}
start({ render, mins: { boom: 4, end: 3.5 }, bubbles: ['#1e2638', '#ff9a3a', '#4fd8ff'] });
