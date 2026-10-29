// «Лишних навыков не бывает: Боинг 747 — взлёт» — стиль 31 «пиксели + 3D»
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card, camera } from '../../core.js';
import { world, field, shoot, pxBox, pxCyl, pxMat, MAT, flat, lit, grp, makeHero, ramp, h2, fbm, glow } from '../../lemo/kit31.js';

// ---------- the plane (≈ 70 m) ----------
const skin = pxMat('fuselage', 48, 48, (x, y) => { const R = ramp(['#9aa3ae', '#c2c9d2', '#e2e6ec', '#f6f8fb']); if (y % 24 === 12 && x % 4 < 2) return [40, 60, 90]; if (y % 24 > 14 && y % 24 < 17) return ramp(['#1a3a8a', '#2a56b8', '#3a6ae0'])(.6, x, y); return R(.6 + (x % 16 === 0 ? -.2 : 0) + (h2(x, y, 3) - .5) * .06, x, y); }, { rough: .5 });
const skinW = flat('#eef1f5');
function makePlane(parent) {
  const O = grp(parent, 0, 0, 0), P = grp(O, 0, 0, 0); P.rotation.y = Math.PI; O.userData = P.userData;
  const fus = pxCyl(P, 3.2, 3.2, 56, skinW, 0, 5.5, 0, 32); for (const sx of [-1, 1]) { pxBox(P, .12, .5, 50, flat('#2a56b8'), sx * 3.14, 4.7, -2); pxBox(P, .12, .42, 46, flat('#26324a'), sx * 3.1, 6.1, -1); } fus.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skinW); nose.scale.set(1, 2.4, 1); nose.rotation.x = Math.PI / 2; nose.position.set(0, 5.5, 28); P.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 32), skinW); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 6.2, -34); P.add(tail);
  const hump = pxBox(P, 4.2, 2.6, 18, skinW, 0, 7.2, 16); hump.geometry = new THREE.CapsuleGeometry(2.1, 14, 6, 16).rotateX(Math.PI / 2).translate(0, 1.3, 0);
  const wingM = flat('#c9cfd8');
  for (const sx of [-1, 1]) { const w = grp(P, sx * 3, 4.2, 2); const wing = pxBox(w, 30, .6, 9, wingM, sx * 15, 0, 0); w.rotation.y = sx * .45;
    const flap = pxBox(w, 22, .25, 2.4, flat('#aab2bd'), sx * 13, -.1, -5.5); w.userData.flap = flap;
    for (const d of [9, 19]) { const e = pxCyl(w, 1.3, 1.3, 5, flat('#8a929e'), sx * d, -1.6, 2, 18); e.rotation.x = Math.PI / 2; pxCyl(w, .9, .9, .2, flat('#2a2d33'), sx * d, -1.6, 4.6, 18).rotation.x = Math.PI / 2; }
    P.userData['w' + sx] = w; }
  const fin = pxBox(P, .7, 13, 9, wingM, 0, 8, -34); fin.rotation.x = -.35;
  for (const sx of [-1, 1]) { const st = pxBox(P, 11, .4, 5, wingM, sx * 6, 7, -34); st.rotation.y = sx * .4; }
  const gear = grp(P, 0, 0, 0); for (const [x, z] of [[0, 22], [-3, 0], [3, 0], [-2, -4], [2, -4]]) { pxBox(gear, .4, 2.4, .4, flat('#5a5e66'), x, 0, z); pxCyl(gear, .7, .7, .8, flat('#1d1d22'), x, .7, z, 14).rotation.z = Math.PI / 2; }
  P.userData.gear = gear; return O;
}
// ---------- airport ----------
const A = world({ fog: '#c9c2b0', fogD: .0022, sunDir: [.5, .3, -1] });
field(A, 700);
const asphalt = pxMat('runway', 48, 48, (x, y) => ramp(['#2a2c30', '#3a3d42', '#4a4d54', '#5a5e66'])(.5 + (fbm(x * .2, y * .2, 4) - .5) * .3, x, y));
pxBox(A, 60, .3, 900, asphalt, 0, -.25, -200);
for (let z = -620; z < 220; z += 30) pxBox(A, 1.2, .05, 14, flat('#f2f0e8'), 0, .06, z);
pxBox(A, 120, 12, 30, MAT.concrete(), -120, 0, 60); pxBox(A, 8, 34, 8, MAT.concrete(), -80, 0, 30); pxBox(A, 14, 6, 14, lit('#9fd8ff', .3), -80, 34, 30);
const plane = makePlane(A); const pilotOut = makeHero(); pilotOut.root.position.set(-7, 0, -34); A.add(pilotOut.root);
// ---------- cockpit set (cut-away nose: roof removed) ----------
const K = world({ fog: '#cfd8e6', fogD: .002, top: '#3a6fb0', mid: '#7fa9d6', hor: '#f0d6a0', sunI: 1.8 });
pxBox(K, 8, .2, 7, flat('#8a929e'), 0, 0, 0); for (const sx of [-1, 1]) pxBox(K, .3, 2.2, 7, MAT.panel(), sx * 3.9, 0, 0);
const screens = pxMat('screens', 64, 16, (x, y) => { if (x % 16 < 2 || y < 2 || y > 13) return [30, 34, 40]; const k = (x >> 4) % 4; return [[40, 90, 160], [20, 30, 50], [40, 90, 160], [20, 30, 50]][k]; }, { em: (x, y) => { if (x % 16 < 2 || y < 2 || y > 13) return null; const k = (x >> 4) % 4, cx = x % 16 - 8, cy = y - 8; return (k % 2 === 0 && cx * cx + cy * cy < 30) ? (cy < 0 ? [70, 140, 230] : [150, 100, 50]) : (k % 2 === 1 && (y % 4 === 0) ? [90, 230, 140] : null); }, emI: 1.4 });
const panel = pxBox(K, 6.6, 1.2, .6, screens, 0, 1.2, 2.6); panel.rotation.x = -.3;
pxBox(K, 6.6, .25, 1.4, MAT.panel(), 0, 1.05, 2.1);
const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), new THREE.MeshBasicMaterial({ color: '#9cc8ec' })); win.position.set(0, 3.3, 3.2); win.rotation.y = Math.PI; 
const seats = [-1.6, 1.6].map(x => { const g = grp(K, x, 0, -1); pxBox(g, 1.2, .8, 1.2, flat('#3a3d45'), 0, .2, 0); pxBox(g, 1.2, 1.8, .3, flat('#3a3d45'), 0, .8, -.6); return g; });
const hl = lit('#ffd23f', 0);
const yokes = [-1.6, 1.6].map(x => { const g = grp(K, x, 0, .8); pxBox(g, .2, 1.3, .2, flat('#2a2d33'), 0, .2, 0); const w = new THREE.Mesh(new THREE.TorusGeometry(.42, .07, 8, 20, Math.PI * 1.3), flat('#2a2d33')); w.position.set(0, 1.6, 0); w.rotation.z = Math.PI * 1.15; g.add(w); g.userData.w = w; return g; });
const pedals = [-1.9, -1.3].map(x => pxBox(K, .3, .15, .5, flat('#4a4e56'), x, .15, 1.6));
const ped = grp(K, 0, 0, .2); pxBox(ped, 1, 1, 2.2, MAT.panel(), 0, 0, 0);
const throttles = [-.36, -.12, .12, .36].map(x => { const g = grp(ped, x, 1, .2); pxBox(g, .08, .6, .08, flat('#c8ced6'), 0, 0, 0); pxBox(g, .16, .14, .2, flat('#1d1d22'), 0, .6, 0); g.rotation.x = -.4; return g; });
const flapLever = grp(ped, .38, 1, -.6); pxBox(flapLever, .08, .5, .08, flat('#c8ced6'), 0, 0, 0); pxBox(flapLever, .2, .14, .16, flat('#c8ced6'), 0, .5, 0);
const gearLever = grp(K, 1.0, 1.3, 1.6); pxBox(gearLever, .07, .4, .07, flat('#c8ced6'), 0, 0, 0); const gk = pxCyl(gearLever, .16, .16, .1, flat('#e9e6df'), 0, .45, 0, 16); gk.rotation.z = Math.PI / 2;
const pilot = makeHero(); pilot.root.position.set(-1.6, .55, -.7); K.add(pilot.root);
const copilot = makeHero({ tint: '#d8e8ff' }); copilot.root.position.set(1.6, .55, -.7); K.add(copilot.root);
const marks = { yoke: [yokes[0].userData.w], pedals, throttle: throttles.map(g => g.children[1]), flaps: [flapLever.children[1]], gear: [gk] };
// ---------- above the clouds ----------
const C = world({ fog: '#f2c8a0', fogD: .0016, top: '#2a3a7a', mid: '#e0907a', hor: '#ffd0a0', sunDir: [0, .1, -1], sunCol: '#ffd8a0', moonI: 2, sunI: 2.2, sunLight: '#ffc890' });
const cloudM = new THREE.MeshStandardMaterial({ color: '#fff4ea', roughness: 1 });
for (let i = 0; i < 40; i++) { const x = (h2(i, 1) - .5) * 900, z = -h2(i, 2) * 900 + 200, s = 20 + h2(i, 3) * 40; for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(s * (1 - j * .15), 18, 12), cloudM); m.position.set(x + j * s * .7, -30 + h2(i, j) * 8, z + j * 6); m.position.y -= 40; C.add(m); } }
const plane2 = makePlane(C); plane2.userData.gear.visible = false; plane2.userData.w1.userData.flap.position.y = -.1;

const blink = t => (t % 3.1) < .12;
const V3 = THREE.Vector3;
function cockpit(sc, lt, k, t) {
  Object.values(marks).flat().forEach(m => { if (!m.userData.mat0) m.userData.mat0 = m.material; m.material = m.userData.mat0; });
  const on = marks[sc]; if (on) { hl.emissiveIntensity = 1 + Math.sin(lt * 3) * .5; on.forEach(m => m.material = hl); }
  yokes.forEach(y => y.rotation.x = sc === 'yoke' ? -sm(.3, .6, k) * .3 : 0); yokes.forEach(y => y.userData.w.rotation.y = sc === 'yoke' ? Math.sin(sm(.65, 1, k) * Math.PI) * .5 : 0);
  throttles.forEach(g => g.rotation.x = sc === 'throttle' ? lerp(-.4, .5, sm(.4, .8, k)) : -.4); flapLever.position.z = sc === 'flaps' ? -.6 - sm(.3, .7, k) * .4 : -.6; gearLever.position.y = sc === 'gear' ? 1.3 + sm(.3, .6, k) * .3 : 1.3;
  pilot.frame(blink(t) ? 'grip1' : (Math.floor(t * 2) % 2 ? 'grip' : 'sitTalk')); copilot.frame('grip');
  const C2 = { yoke: [new V3(-.6, 4.3, 5.6), new V3(-1.6, 1.3, .2)], pedals: [new V3(-3.2, 2.3, -.2), new V3(-1.6, .2, 1.5)], throttle: [new V3(1, 3.1, 2.4), new V3(0, 1.3, .1)], flaps: [new V3(2.3, 3.6, -1.8), new V3(.3, 1.3, -.4)], gear: [new V3(.4, 3.2, -.6), new V3(1, 1.5, 1.6)] }[sc] || [new V3(0, 4, 4.5), new V3(0, 1, 0)];
  camera.position.copy(C2[0]); pilot.face(camera); copilot.face(camera);
  return shoot(K, C2[0], C2[1], { subject: C2[1], tilt: 6, aper: 1.2, fov: 40, near: .1 });
}
function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  plane.position.set(0, 0, 0); plane.rotation.set(0, 0, 0); plane.userData.gear.visible = true; for (const sx of [-1, 1]) plane.userData['w' + sx].userData.flap.position.y = -.1;
  if (sc === 'intro' || sc === 'weight') { pilotOut.frame(Math.floor(t * 2) % 2 ? 'wave0' : 'wave1'); const cam = sc === 'intro' ? new V3(lerp(56, 42, u), 22, lerp(-96, -78, u)) : new V3(-70, 50, -110); camera.position.copy(cam); pilotOut.face(camera);
    return shoot(A, cam, new V3(-2, 5, -10), { subject: new V3(-7, 2, -34), fov: 32, tilt: 10 }); }
  if (['yoke', 'pedals', 'throttle', 'flaps', 'gear'].includes(sc)) {
    if (sc === 'flaps' && k > .55) { for (const sx of [-1, 1]) plane.userData['w' + sx].userData.flap.position.y = -.1 - sm(.55, .9, k) * .8; const cam = new V3(-40, 24, 46); camera.position.copy(cam); return shoot(A, cam, new V3(-14, 4, 4), { subject: new V3(-14, 4, 4), fov: 30, tilt: 8 }); }
    if (sc === 'gear' && k > .6) { const g = sm(.6, .9, k); plane.position.set(0, 30, -400); plane.rotation.x = .15; plane.userData.gear.position.y = g * 2.2; plane.userData.gear.visible = g < .98; const cam = new V3(55, 22, -330); camera.position.copy(cam); return shoot(A, cam, plane.position.clone().add(new V3(0, 5, 0)), { subject: plane.position.clone().add(new V3(0, 5, 0)), fov: 40, tilt: 8 }); }
    return cockpit(sc, lt, k, t); }
  if (sc === 'roll') { const z = -eio(k) * 420, lift = sm(.8, 1, k); plane.position.set(0, lift * 6, z); plane.rotation.x = lift * .2; const cam = new V3(58, 16, z - 74); camera.position.copy(cam);
    return shoot(A, cam, new V3(0, 5, z), { subject: new V3(0, 5, z), fov: 32, tilt: 10 }); }
  // above the clouds at sunset — the wow shot: the camera slides back to show the whole jet
  plane2.position.set(0, 20, -lt * 6); const cam = sc === 'sky' ? new V3(lerp(14, 60, u), lerp(24, 40, u), lerp(-lt * 6 + 30, -lt * 6 + 90, u)) : new V3(60, 40, -lt * 6 + 90);
  camera.position.copy(cam); return shoot(C, cam, plane2.position.clone().add(new V3(0, 5, 0)), { subject: plane2.position.clone().add(new V3(0, 5, 0)), fov: 32, tilt: 8, expo: 1.2 });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'weight') return card(330, `<div class="t">${L('взлётный вес', 'takeoff weight')}</div><div class="v">≈400 <small>${L('т', 't')}</small></div><div class="n">${L('Боинг 747-400', 'Boeing 747-400')}</div>`, a);
  if (s.card === 'speed') { const v = Math.round(lerp(0, 300, eio(clamp(k * 1.15)))); return card(330, `<div class="t">${L('скорость отрыва', 'rotation speed')}</div><div class="v">${v} <small>${L('км/ч', 'km/h')}</small></div><div class="n">${L('разбег ≈ 3 км', 'takeoff run ≈ 3 km')}</div>`, a); }
  return '';
}
start({ render, cards, mins: { sky: 6, end: 3.5 }, bubbles: ['#2a56b8', '#f2c230', '#e2e6ec'] });
