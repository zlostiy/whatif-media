// «Что если бы 24 февраля 2022 года ничего не началось?» — стиль 42 «Миниатюра», обычный день в городе
import { THREE, start, EN, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground, water } from '../../lemo/kit42.js';
const V3 = THREE.Vector3;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const COLS = ['#e8463c', '#2f5fb3', '#3f8f5a', '#e07bb0', '#f08a2c', '#7a4fc0', '#f2c230', '#f4f4f0'];
// sign with text (canvas texture), never tiny
function sign(parent, txt, w, h, bg, fg, x, y, z, ry = 0, o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = c.height * .62; g.font = `900 ${fs}px Rubik, Arial, sans-serif`; while (g.measureText(txt).width > c.width * .9) { fs *= .92; g.font = `900 ${fs}px Rubik, Arial, sans-serif`; }
  g.fillText(txt, c.width / 2, c.height / 2 + fs * .04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: .6, emissive: new THREE.Color(o.glow ? '#ffffff' : '#000000'), emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow || 0 });
  const p = mesh(new THREE.PlaneGeometry(w, h), m, parent, x, y, z, ry); p.castShadow = false; return p;
}
function airliner(parent, livery = '#e8463c') {
  const g = grp(parent); const s = 1.6, W = M('#f4f4f2'), B = M(livery);
  const f = mesh(new THREE.CapsuleGeometry(1.9 * s, 26 * s, 6, 14), W, g, 0, 0, 0); f.rotation.x = Math.PI / 2;
  rbox(g, 4 * s, .5 * s, 26 * s, B, 0, -.6 * s, 0, 0, .3);
  mesh(new THREE.BoxGeometry(34 * s, .5 * s, 5 * s), W, g, 0, -.8 * s, 1 * s);
  rbox(g, 12 * s, .4 * s, 3 * s, W, 0, .4 * s, -13 * s); rbox(g, .5 * s, 6 * s, 4 * s, B, 0, .8 * s, -13.5 * s);
  for (const x of [-7, 7]) { const e = mesh(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 4 * s, 14), M('#c9ccd2'), g, x * s, -2 * s, 2.5 * s); e.rotation.x = Math.PI / 2; }
  return g;
}

// ================= S1: a winter city =================
const S1 = world({ sky: '#b9d3ea', shadowR: 150, fogNear: 400, fogFar: 1400, hemiTop: '#dbe8ff' });
const hemi = S1.children.find(o => o.isHemisphereLight), sun = S1.userData.sun;
ground(S1, '#eef2f5', 2400);
const roads = grp(S1);
for (const x of [-60, 0, 60]) road(roads, x, -300, x, 300, 12, { walk: true });
for (const z of [-60, 0, 60]) road(roads, -300, z, 300, z, 12, { walk: true });
const WALLS = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4', '#f0d9b5', '#cfd8c8'];
let bk = 0;
const RES = new Set(['30,-30', '-30,30', '30,30', '-30,-30']);   // the four story blocks around the centre crossing
for (let ix = -4; ix <= 3; ix++) for (let iz = -4; iz <= 3; iz++) {
  const cx = ix * 60 + 30, cz = iz * 60 + 30; if (RES.has(cx + ',' + cz)) continue;
  for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { bk++; building(S1, 18, 18, 14 + Math.floor(rnd(bk, 1) * 6) * 5, cx + dx, cz + dz, { wall: WALLS[bk % 7], seed: bk, roof: '#f2f4f6', trim: '#e8ecef', bay: 8 }); }
}
for (let i = 0; i < 40; i++) tree(S1, -8 + (i % 2) * 16 + (rnd(i, 1) - .5), -290 + Math.floor(i / 2) * 30, 1.1, '#3a6a4a');
// --- NW: home block with a big billboard "24.02.2022"
const home = grp(S1, -30, 0, -30); building(home, 30, 30, 26, 0, 0, { wall: '#e6d2c8', seed: 3, roof: '#f2f4f6', trim: '#e8ecef', bay: 8 });
rbox(home, 22, 12, 1, '#2a2d33', 0, 27, 4); const board = sign(home, '24.02.2022', 21, 11, '#1b2a36', '#ffd23f', 0, 33, 4.6, 0, { glow: .6 });
// --- NE: burger restaurant (red/yellow, a giant burger on the roof)
const rest = grp(S1, 30, 0, -30); rbox(rest, 26, 9, 20, '#e8463c', 0, 0, 0); rbox(rest, 27, 1.4, 21, '#ffd23f', 0, 9, 0); rbox(rest, 18, 5, .4, M('#bfe3f2', { roughness: .15 }), 0, .6, 10.1);
sign(rest, L('БУРГЕРЫ', 'BURGERS'), 20, 3.4, '#ffd23f', '#c4251c', 0, 7.6, 10.25);
const bun = grp(rest, 0, 10.4, 0); mesh(new THREE.CylinderGeometry(6, 6, 1.2, 28), M('#e0a050'), bun, 0, .6, 0); mesh(new THREE.CylinderGeometry(6.3, 6.3, 1.1, 28), M('#5a3420'), bun, 0, 1.7, 0); mesh(new THREE.CylinderGeometry(6.6, 6.6, .4, 28), M('#5fa043'), bun, 0, 2.4, 0); mesh(new THREE.CylinderGeometry(6.4, 6.4, .5, 28), M('#f2c230'), bun, 0, 2.8, 0);
const top = mesh(new THREE.SphereGeometry(6.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M('#e7a85a'), bun, 0, 3, 0); top.scale.y = .62;
const queue = []; for (let i = 0; i < 7; i++) queue.push(person(rest, -4 + i * 1.9, 14.5, COLS[(i + 2) % 8], { s: 1.25, y: .35 }));
// --- counter scene inside the restaurant (cut-away box, used for "pay")
const inside = grp(S1, 400, 0, 0); mesh(new THREE.BoxGeometry(40, .4, 30), M('#e9e2d6'), inside, 0, .2, 0); rbox(inside, 40, 14, 1, '#e8463c', 0, 0, -15); rbox(inside, 1, 14, 30, '#f2c230', -20, 0, 0);
rbox(inside, 22, 4.4, 4, '#f4f4f0', 0, 0, -4); rbox(inside, 22.4, .5, 4.4, '#c4251c', 0, 4.4, -4);
const term = grp(inside, 3, 4.9, -3); rbox(term, 1.6, .5, 2.4, '#2a2d33', 0, 0, 0); const scr = rbox(term, 1.3, .9, .15, M('#1b2a36', { emissive: '#000000' }), 0, .55, -.6); scr.rotation.x = -.5;
const ok = rbox(term, 1.1, .8, .1, M('#5cd06a', { emissive: '#5cd06a', emissiveIntensity: 1.2 }), 0, .62, -.52); ok.rotation.x = -.5; ok.visible = false;
const tray = grp(inside, -3, 4.9, -3.5); rbox(tray, 4, .25, 2.6, '#c4251c', 0, 0, 0); mesh(new THREE.CylinderGeometry(.7, .7, .9, 16), M('#e0a050'), tray, -.8, .7, 0); rbox(tray, .9, 1.4, .7, '#e8463c', .6, .25, 0); rbox(tray, 1, 1.8, .9, '#f4f4f0', 1.6, .25, 0);
const heroP = person(inside, 3, .6, '#ffcf2e', { s: 1.4, y: .4 }); heroP.rotation.y = Math.PI; const phone = rbox(heroP, .5, .9, .12, '#1a1d24', .5, 1.9, -.5);
const cashier = person(inside, -1, -8, '#e8463c', { s: 1.3, y: .4 });
// --- SW: furniture store + clothes store
const mall = grp(S1, -30, 0, 30); rbox(mall, 16, 10, 12, '#f4f4f0', -6, 0, -4); rbox(mall, 16.4, 2, 12.4, '#f08a2c', -6, 8, -4);
sign(mall, L('МЕБЕЛЬ', 'FURNITURE'), 12, 2, '#f08a2c', '#ffffff', -6, 9, 2.25);
rbox(mall, 12, 8, 10, '#2a2d33', 10, 0, -4); sign(mall, L('ОДЕЖДА', 'CLOTHES'), 10, 1.8, '#2a2d33', '#ffffff', 10, 6.6, 1.05);
const sofaG = grp(S1, -30, 0, 30); const sofa = grp(sofaG); rbox(sofa, 6, 1.3, 2.4, '#2f5fb3', 0, .9, 0); rbox(sofa, 6, 2, .6, '#2f5fb3', 0, .9, -.9); for (const x of [-2.8, 2.8]) rbox(sofa, .6, 1.6, 2.4, '#2f5fb3', x, .9, 0);
const carriers = [person(sofaG, -3.6, 0, '#ffcf2e', { s: 1.25, y: .35 }), person(sofaG, 3.6, 0, '#3f8f5a', { s: 1.25, y: .35 })];
const shopper = person(S1, -30, 46, '#e07bb0', { s: 1.25, y: .35 }); const bag = rbox(shopper, .8, 1, .4, '#2a2d33', .6, .8, 0);
// --- SE: bank with a currency board + phone shop with a queue
const bank = grp(S1, 30, 0, 30); building(bank, 26, 14, 18, 0, -7, { wall: '#d6d9c4', seed: 77, roof: '#f2f4f6', trim: '#e8ecef', bay: 8 });
rbox(bank, 18, 8, 1, '#11131a', 0, 7, .2); sign(bank, 'USD   75.00', 16.5, 3, '#11131a', '#5cd06a', 0, 12.7, .8, 0, { glow: 1 }); sign(bank, 'EUR   84.00', 16.5, 3, '#11131a', '#5cd06a', 0, 9.2, .8, 0, { glow: 1 });
const pshop = grp(bank, 0, 0, 12); rbox(pshop, 20, 7, 8, '#f4f4f0', 0, 0, 0); rbox(pshop, 14, 4, .3, M('#bfe3f2', { roughness: .15 }), 0, .4, 4.05); sign(pshop, L('ТЕЛЕФОНЫ', 'PHONES'), 12, 1.8, '#f4f4f0', '#1a1d24', 0, 5.8, 4.2);
const pq = []; for (let i = 0; i < 8; i++) { const p = person(bank, -9 + i * 1.9, 18.5, COLS[i % 8], { s: 1.25, y: .35 }); if (i < 3) rbox(p, .7, .9, .3, '#f4f4f0', .55, 1, .3); pq.push(p); }
// cars + walkers on the avenues
const cars = []; for (let i = 0; i < 22; i++) cars.push(car(S1, COLS[i % 8], 0, 0));
function placeCars(t) { cars.forEach((c, i) => { const ax = i % 2, lane = [-60, 0, 60][i % 3] + (i % 4 < 2 ? 2.6 : -2.6), dir = i % 4 < 2 ? 1 : -1; const s = ((rnd(i, 2) * 600 + dir * t * 8) % 600 + 600) % 600 - 300; if (ax) { c.position.set(s, 0, lane); c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { c.position.set(lane, 0, s); c.rotation.y = dir > 0 ? 0 : Math.PI; } }); }
const walkers = []; for (let i = 0; i < 40; i++) walkers.push(person(S1, 0, 0, COLS[i % 8], { s: 1.25 }));
function placeWalkers(t) { walkers.forEach((p, i) => { const side = i % 4, dir = i % 2 ? 1 : -1, off = [-7.4, 7.4][(i >> 1) % 2], road = [-60, 0, 60][i % 3]; const s = ((rnd(i, 5) * 600 + dir * t * 1.5) % 600 + 600) % 600 - 300;
  if (side < 2) { p.position.set(road + off, .35, s); p.rotation.y = dir > 0 ? 0 : Math.PI; } else { p.position.set(s, .35, road + off); p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; } posePerson(p, { walk: t * 7 + i, base: .35 }); }); }
// airport to the east (wow): runway + terminal + departing planes
const AP = grp(S1, 0, 0, -520); mesh(new THREE.BoxGeometry(700, .3, 260), M('#d9dde0'), AP, 0, .15, 0).castShadow = false; rbox(AP, 600, .2, 22, '#3e4046', 0, .2, 40); for (let x = -280; x < 280; x += 20) rbox(AP, 8, .1, 1, '#f2f0e8', x, .4, 40);
rbox(AP, 160, 14, 30, '#e6e2d8', 0, 0, -60); rbox(AP, 160, 10, 1, M('#ffe7a8', { emissive: '#ffcf6a', emissiveIntensity: .5 }), 0, 2, -44.6);
const LIV = ['#e8463c', '#2f5fb3', '#3f8f5a', '#f08a2c', '#7a4fc0', '#f2c230'];
const planes = LIV.map(c => airliner(S1, c));

// ================= S2: Paris-like miniature (river, beige blocks, a lattice tower) =================
const S2 = world({ sky: '#a6cdf0', shadowR: 160 });
ground(S2, '#8fbf6a', 2400); water(S2, 2400, 26, 0, .06, 30);
for (let i = 0; i < 60; i++) { const x = (i % 10 - 4.5) * 34, z = -40 - Math.floor(i / 10) * 30; building(S2, 26, 20, 14 + (i % 3) * 3, x, z, { wall: '#efe1c6', seed: 200 + i, roof: '#7d8796', trim: '#e3d3b4', bay: 6 }); }
for (let i = 0; i < 20; i++) tree(S2, -300 + i * 30, 12, 1.4);
const eiff = grp(S2, 60, 0, 80); const IM = M('#8a6a4e');
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const A = new THREE.Vector3(sx * 16, 0, sz * 16), B = new THREE.Vector3(sx * 9, 31, sz * 9); const L2 = A.distanceTo(B); const leg = mesh(new THREE.CylinderGeometry(1.4, 2.2, L2, 6), IM, eiff, (A.x + B.x) / 2, L2 / 2 * 0 + (A.y + B.y) / 2, (A.z + B.z) / 2); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); }
rbox(eiff, 26, 2, 26, IM, 0, 30, 0); rbox(eiff, 10, 34, 10, IM, 0, 32, 0); rbox(eiff, 12, 1.6, 12, IM, 0, 64, 0); mesh(new THREE.ConeGeometry(5, 40, 4), IM, eiff, 0, 86, 0).rotation.y = Math.PI / 4; mesh(new THREE.CylinderGeometry(.4, .4, 8, 8), IM, eiff, 0, 110, 0);
const planeP = airliner(S2, '#2f5fb3');

function look(mode) {
  const sky = mode === 'eve' ? '#7f93c9' : '#b9d3ea'; S1.background.set(sky); S1.fog.color.set(sky);
  sun.color.set(mode === 'eve' ? '#ffb27a' : '#fff1d6'); sun.intensity = mode === 'eve' ? 2.2 : 3; hemi.color.set(mode === 'eve' ? '#9fb4e6' : '#dbe8ff');
}
function render(s, lt, k, t) {
  const sc = s.scene; placeCars(t); placeWalkers(t); look(sc === 'wow' ? 'eve' : 'day'); planes.forEach(p => p.visible = sc === 'wow'); ok.visible = false;
  queue.forEach((p, i) => { p.rotation.y = Math.PI; posePerson(p, {}); });
  if (sc === 'alarm') return shoot(S1, new V3(lerp(-10, -20, k), lerp(70, 55, k), 70), new V3(-30, 28, -26), { subject: new V3(-30, 33, -26), fov: 34, aper: 14 });
  if (sc === 'burger') { queue.forEach((p, i) => { if (i === 0) { const w = sm(.1, .9, k); p.position.set(lerp(-4, 0, w), .35, lerp(14.5, 10.5, w)); posePerson(p, { walk: t * 7 }); } });
    return shoot(S1, new V3(30 + lerp(28, 20, k), 26, -30 + 52), new V3(30, 8, -30 + 4), { subject: new V3(30, 6, -30 + 12), fov: 32, aper: 10 }); }
  if (sc === 'pay') { const tap = sm(.3, .5, k); phone.position.set(.5, lerp(1.9, 2.4, tap), lerp(-.5, -1.1, tap)); heroP.userData.aR.rotation.x = -tap * 1.2; ok.visible = k > .5; posePerson(cashier, { wave: t * 5 });
    return shoot(S1, new V3(400 + 16, 13, 20), new V3(400 + 1, 4, -2), { subject: new V3(400 + 3, 4, 0), fov: 30, aper: 6 }); }
  if (sc === 'mall') { const w = sm(.05, .95, k); sofaG.position.set(-36, 0, lerp(30 + 4, 30 + 16, w)); sofa.position.y = 1.2; carriers.forEach(p => { posePerson(p, { walk: t * 7, armsUp: .35, base: .35 }); p.rotation.y = 0; });
    shopper.position.set(lerp(-40, -20, w), .35, 46); shopper.rotation.y = Math.PI / 2; posePerson(shopper, { walk: t * 7, base: .35 });
    return shoot(S1, new V3(-12, 26, 72), new V3(-36, 4, 36), { subject: new V3(-36, 2, 42), fov: 36, aper: 10 }); }
  if (sc === 'rate') { pq.forEach((p, i) => { p.rotation.y = Math.PI; posePerson(p, { bob: i < 3 ? t * 3 + i : 0, base: .35 }); });
    return shoot(S1, new V3(lerp(4, 0, k), 30, 72), new V3(30, 7, 38), { subject: new V3(30, 6, 44), fov: 38, aper: 10 }); }
  if (sc === 'europe') { const a = clamp(k); planeP.position.set(lerp(-260, 200, a), 120, lerp(-40, 120, a)); planeP.rotation.set(0, Math.atan2(460, 160), 0);
    return shoot(S2, new V3(lerp(-30, 10, k), 130, 300), new V3(30, 50, 40), { subject: new V3(60, 40, 80), fov: 38, aper: 18 }); }
  // WOW: evening, six planes leave the airport in all directions; the camera rises over the city
  const u = eio(clamp(lt / Math.max(4, s.dur)));
  planes.forEach((p, i) => { const a = -Math.PI * .1 - i * Math.PI * .16, d = clamp(u * 1.3 - i * .05) * 420; p.position.set(Math.cos(a) * d * .9 + (i - 2.5) * 20, 6 + d * .25, -520 + 40 + Math.sin(a) * d); p.rotation.set(-.12, Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI, 0); });
  return shoot(S1, new V3(lerp(60, 90, u), lerp(90, 170, u), lerp(-200, -120, u)), new V3(0, lerp(30, 80, u), -520), { subject: new V3(0, 40, -500), fov: 48, aper: 22 });
}
function cards(s, lt, k) {
  const a = sm(.2, .5, lt);
  if (s.card === 'paid') return card(330, `<div class="t">${L('оплата', 'payment')}</div><div class="v" style="color:#3f8f5a">✓ ${L('ОДОБРЕНО', 'APPROVED')}</div><div class="n">Apple Pay · Visa</div>`, a);
  if (s.card === 'flight') return card(330, `<div class="t">${L('прямой рейс', 'direct flight')}</div><div class="v">${L('Москва → Париж', 'Moscow → Paris')}</div><div class="n">${L('4 часа', '4 hours')}</div>`, a);
  if (s.scene === 'wow') { const rows = [['ПАРИЖ', 'PARIS'], ['РИМ', 'ROME'], ['БАРСЕЛОНА', 'BARCELONA'], ['НЬЮ-ЙОРК', 'NEW YORK']].map((r, i) => `<div style="display:flex;justify-content:space-between;gap:40px;font-size:36px;opacity:${clamp((lt - .3 - i * .25) * 3)}"><span>${L(r[0], r[1])}</span><span style="color:#3f8f5a">${L('ПО РАСПИСАНИЮ', 'ON TIME')}</span></div>`).join('');
    return card(250, `<div class="t">${L('вылет', 'departures')}</div>${rows}`, a); }
  return '';
}
start({ render, cards, mins: { alarm: 4.5, wow: 8 }, bubbles: ['#e8463c', '#ffd23f', '#2f5fb3'] });
