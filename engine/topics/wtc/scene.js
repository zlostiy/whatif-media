// «Что если бы 11 сентября не было теракта?» — стиль 42 «Миниатюра»
import { THREE, start, EN, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground, water, facadeMat } from '../../lemo/kit42.js';
const V3 = THREE.Vector3;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const COLS = ['#e8463c', '#2f5fb3', '#3f8f5a', '#e07bb0', '#f08a2c', '#7a4fc0', '#f2c230', '#f4f4f0'];

// ================= S1: Lower Manhattan =================
const S1 = world({ shadowR: 200, fogNear: 500, fogFar: 1600 });
const hemi = S1.children.find(o => o.isHemisphereLight), sun = S1.userData.sun;
ground(S1, '#b9b4a8', 2400);
water(S1, 300, 2400, -330, .05, 0);           // Hudson to the west
water(S1, 2400, 300, 0, .05, 420);            // harbour to the south
const roads = grp(S1);
for (const x of [-150, -90, -30, 30, 90, 150]) road(roads, x, -600, x, 270, 10, { walk: true });
for (const z of [-480, -360, -240, -120, 120, 240]) road(roads, -180, z, 300, z, 10, { walk: true });
const WALLS = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4', '#c9c9c9', '#b8c4cf'];
let bk = 0;
for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 7; iz++) {
  const cx = -120 + ix * 60, cz = -540 + iz * 120 + 60;
  if (Math.abs(cx) < 70 && Math.abs(cz) < 70) continue;             // the WTC plaza
  if (cz > 260) continue;
  if (Math.abs(cx) <= 60 && cz > 40) { mesh(new THREE.BoxGeometry(56, .3, 110), M('#7cc05a'), S1, cx, .15, cz).castShadow = false; for (let q = 0; q < 6; q++) tree(S1, cx + (q % 2 ? 14 : -14), cz - 40 + q * 16, 1.3); continue; }
  for (const [dx, dz] of [[-13, -30], [13, -30], [-13, 30], [13, 30]]) {
    bk++; const h = 22 + Math.floor(rnd(bk, 1) * 8) * 10 + (cz < -300 ? 30 : 0);
    building(S1, 20, 40, h, cx + dx, cz + dz, { wall: WALLS[bk % 7], seed: bk, bay: 8 });
  }
}
// the twin towers: 20 × 20 model metres, 160 tall, dense vertical columns, antenna on the north tower
const towerTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 4) { g.fillStyle = '#56606c'; g.fillRect(x + 1.6, 0, 2, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 7); t.anisotropy = 8; return t; })();
const towerM = new THREE.MeshStandardMaterial({ map: towerTex, roughness: .45, metalness: .35, emissive: new THREE.Color('#ffb04a'), emissiveMap: towerTex, emissiveIntensity: 0 });
const TW = 20, TH = 160, TOWERS = [[-18, -12], [16, 14]];
const towers = TOWERS.map(([x, z], i) => { const g = grp(S1, x, 0, z); const b = mesh(new THREE.BoxGeometry(TW, TH, TW), [towerM, towerM, M('#8f8a80'), M('#8f8a80'), towerM, towerM], g, 0, TH / 2, 0); rbox(g, TW + .6, .8, TW + .6, '#c9ccd2', 0, TH, 0); if (i === 0) mesh(new THREE.CylinderGeometry(.5, 1.2, 36, 10), M('#d0d3d8', { metalness: .5 }), g, 0, TH + 18, 0); return g; });
const plaza = grp(S1); mesh(new THREE.BoxGeometry(110, .4, 110), M('#d8d2c4'), plaza, 0, .2, 0).castShadow = false;
mesh(new THREE.CylinderGeometry(6, 6, .8, 32), M('#2f8fb6', { roughness: .2 }), plaza, 2, .4, 30);
for (let i = 0; i < 12; i++) tree(plaza, -48 + (i % 6) * 19, i < 6 ? -50 : 50, 1.2);
// a crowd leaving the towers in the evening: lanes from the doors to the street, never crossing
const crowd = []; for (let i = 0; i < 70; i++) crowd.push(person(S1, 0, 0, COLS[i % 8], { s: 1.25 }));
function placeCrowd(t, on) {
  crowd.forEach((p, i) => { p.visible = on; if (!on) return;
    const lane = i % 10, tw = TOWERS[i % 2], u = ((t * .045 + rnd(i, 4)) % 1);
    const x0 = tw[0] + (lane - 4.5) * 1.9, z0 = tw[1] + TW / 2 + 2, z1 = 64;
    p.position.set(x0 + (i % 2 ? 1 : -1) * u * 6, 0, lerp(z0, z1, u)); p.rotation.y = 0; posePerson(p, { walk: t * 7 + i }); });
}
// cars on the avenues
const cars = []; for (let i = 0; i < 26; i++) { const c = car(S1, COLS[i % 8], 0, 0); cars.push(c); }
function placeCars(t) { cars.forEach((c, i) => { const x = [-150, -90, -30, 30, 90, 150][i % 6] + (i % 2 ? 2.5 : -2.5), dir = i % 2 ? 1 : -1; let z = ((rnd(i, 2) * 870 + dir * t * 9) % 870 + 870) % 870 - 600; if (Math.abs(x) < 70 && Math.abs(z) < 70) z += 150; c.position.set(x, 0, z); c.rotation.y = dir > 0 ? 0 : Math.PI; }); }
// the airliner (white, blue cheat line), model scale ×2.2 so it reads among skyscrapers
function airliner(parent) {
  const g = grp(parent); const s = 2.2, W = M('#f4f4f2'), B = M('#2f5fb3');
  const f = mesh(new THREE.CapsuleGeometry(1.9 * s, 26 * s, 6, 14), W, g, 0, 0, 0); f.rotation.x = Math.PI / 2;
  rbox(g, 4 * s, .5 * s, 26 * s, B, 0, -.6 * s, 0, 0, .3);
  const wing = mesh(new THREE.BoxGeometry(34 * s, .5 * s, 5 * s), W, g, 0, -.8 * s, 1 * s);
  rbox(g, 12 * s, .4 * s, 3 * s, W, 0, .4 * s, -13 * s); rbox(g, .5 * s, 6 * s, 4 * s, B, 0, .8 * s, -13.5 * s);
  for (const x of [-7, 7]) { const e = mesh(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 4 * s, 14), M('#c9ccd2'), g, x * s, -2 * s, 2.5 * s); e.rotation.x = Math.PI / 2; }
  return g;
}
const plane1 = airliner(S1);

// ================= airport (same world, east) =================
const AP = grp(S1, 700, 0, -200);
mesh(new THREE.BoxGeometry(400, .3, 300), M('#a9aaa6'), AP, 0, .15, 0).castShadow = false;
const term = grp(AP, 0, 0, -60); rbox(term, 160, 14, 30, '#e6e2d8', 0, 0, 0); rbox(term, 160, 10, 1, M('#8fc3dd', { roughness: .15, metalness: .3, transparent: true, opacity: .55 }), 0, 2, 15.2); rbox(term, 166, 1.2, 34, '#c9c4b8', 0, 14, 0);
const plane2 = airliner(AP); plane2.position.set(10, 9, 10); plane2.rotation.y = -Math.PI / 2;
const stairs = grp(AP, 6, 0, 4.5); rbox(stairs, 4, 1.4, 10, '#f2f2ee', 0, 0, 0); for (let i = 0; i < 8; i++) rbox(stairs, 3.2, .5, 1.2, '#c9ccd2', 0, 1.4 + i * .9, -4 + i * 1.1); const rail = rbox(stairs, .2, 1.2, 11, '#9aa0b0', 1.6, 2.5, 0); rail.rotation.x = -.7; rail.position.y = 5;
const fam = [person(AP, -2, 14, '#e07bb0', { s: 1.25, y: .3 }), person(AP, -4.2, 14.5, '#3f8f5a', { s: 1.25, y: .3 }), person(AP, -6.2, 15, '#f2c230', { s: .9, y: .3 })];
const hero = person(AP, 2, 20, '#ffcf2e', { s: 1.3, y: .3 }); const bottle = mesh(new THREE.CylinderGeometry(.18, .18, .6, 10), M('#7fd0ff', { roughness: .1, transparent: true, opacity: .85 }), hero, .55, 1.3, .25);

// ================= S2: Afghanistan, peaceful (mountains, a village, a market) =================
const S2 = world({ sky: '#a8cdee', shadowR: 160, sunI: 3.2, hemiTop: '#cfe3ff', hemiBot: '#a07a50' });
ground(S2, '#c9a878', 2400);
for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 220 + rnd(i, 1) * 160, h = 70 + rnd(i, 2) * 110; const m = mesh(new THREE.ConeGeometry(60 + rnd(i, 3) * 40, h, 6), M(rnd(i, 4) > .5 ? '#b08a62' : '#9c7a58', { flatShading: true }), S2, Math.cos(a) * r, h / 2, Math.sin(a) * r - 80); m.rotation.y = rnd(i, 5) * 3; const cap = mesh(new THREE.ConeGeometry((60 + rnd(i, 3) * 40) * .32, h * .32, 6), M('#f4f2ee', { flatShading: true }), S2, m.position.x, h - h * .16 + .1, m.position.z); cap.rotation.y = m.rotation.y; }
const vil = grp(S2); for (let i = 0; i < 26; i++) { const x = (i % 6 - 2.5) * 16 + rnd(i, 1) * 3, z = Math.floor(i / 6) * 16 - 40; if (Math.abs(x) < 14 && Math.abs(z + 8) < 10) continue; rbox(vil, 10, 5 + rnd(i, 2) * 3, 10, ['#d9b98c', '#cfa97a', '#e3c79e'][i % 3], x, 0, z); }
for (let i = 0; i < 8; i++) tree(vil, -60 + i * 16, 40, 1.4, '#6a9a3a');
const stalls = []; for (let i = 0; i < 6; i++) { const s = grp(vil, -15 + (i % 3) * 15, 0, -8 + Math.floor(i / 3) * 12); rbox(s, 7, 2.2, 4, '#8a6a48', 0, 0, 0); rbox(s, 8, .4, 5, ['#e8463c', '#2f5fb3', '#3f8f5a'][i % 3], 0, 4, 0); for (const x of [-3.6, 3.6]) rbox(s, .3, 4, .3, '#6b4a2e', x, 0, 2.2); for (let j = 0; j < 3; j++) mesh(new THREE.SphereGeometry(.7, 10, 8), M(['#f08a2c', '#e8463c', '#f2c230'][j]), s, -2 + j * 2, 2.6, 0); stalls.push(s); }
const villagers = []; for (let i = 0; i < 26; i++) { const p = person(S2, 0, 0, ['#e6e2d8', '#7a8a5a', '#8a6a48', '#2f5fb3', '#e8463c'][i % 5], { s: 1.25, hair: i % 2 ? '#2b1d18' : '#f4f2ee' }); villagers.push(p); }
const kite = grp(S2, 0, 30, 0); { const k = mesh(new THREE.OctahedronGeometry(2.5, 0), M('#e8463c'), kite); k.scale.set(1, 1.4, .15); }

// ================= Washington: a domed white building + growing money =================
const DC = grp(S1, -700, 0, -200);
mesh(new THREE.BoxGeometry(300, .3, 260), M('#8cc06a'), DC, 0, .15, 0).castShadow = false;
const cap = grp(DC, 0, 0, -40); rbox(cap, 90, 14, 26, '#f2efe8', 0, 0, 0); rbox(cap, 30, 10, 30, '#f2efe8', 0, 14, 0);
mesh(new THREE.CylinderGeometry(11, 12, 10, 24), M('#f2efe8'), cap, 0, 29, 0); mesh(new THREE.SphereGeometry(11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#f7f5f0'), cap, 0, 34, 0); mesh(new THREE.CylinderGeometry(1.2, 1.6, 6, 12), M('#f2efe8'), cap, 0, 47, 0);
for (let i = -6; i <= 6; i++) rbox(cap, 1.4, 12, 1.4, '#ffffff', i * 4.5, 0, 14);
mesh(new THREE.BoxGeometry(14, .5, 110), M('#2f8fb6', { roughness: .2 }), DC, 0, .4, 50);
const money = grp(DC, 50, 0, 10); money.scale.setScalar(2.2); const bills = [];
for (let i = 0; i < 64; i++) { const b = rbox(money, 6, 2.6, 3.2, M('#5aa04a', { roughness: .6 }), (i % 4 - 1.5) * 6.4, Math.floor(i / 16) * 2.7, (Math.floor(i / 4) % 4 - 1.5) * 3.4); rbox(b, 6.1, .5, 1, '#e9e2c6', 0, .95, 0); bills.push(b); }

// ================= street with cameras on poles (privacy) =================
const ST = grp(S1, 700, 0, 200);
mesh(new THREE.BoxGeometry(160, .3, 80), M('#cfc9bd'), ST, 0, .15, 0).castShadow = false; road(ST, -80, 0, 80, 0, 10, { walk: true });
for (let i = 0; i < 6; i++) building(ST, 18, 14, 16 + (i % 3) * 6, -60 + i * 22, -24, { wall: WALLS[i % 7], seed: 90 + i, bay: 8 });
const poles = []; for (let i = 0; i < 5; i++) { const p = grp(ST, -48 + i * 24, 0, 9); rbox(p, .5, 8, .5, '#4a4d55', 0, 0, 0); const c = rbox(p, 2.2, 1.2, 1.2, '#2a2d33', .9, 7.6, .3); rbox(c, .6, .6, .4, '#11131a', 1, .3, .5); poles.push(p); }
const bench = grp(ST, 0, 0, 14); rbox(bench, 6, .5, 2, '#8a5a3a', 0, 1.2, 0); rbox(bench, 6, 1.6, .4, '#8a5a3a', 0, 1.2, -.9); for (const x of [-2.6, 2.6]) rbox(bench, .4, 1.2, 1.8, '#4a4d55', x, 0, 0);
const hero2 = person(ST, 0, 14, '#ffcf2e', { s: 1.3, y: .5 }); const phone = rbox(hero2, .45, .8, .1, '#1a1d24', .3, 1.75, .45);
const walkers = []; for (let i = 0; i < 10; i++) walkers.push(person(ST, 0, 0, COLS[i % 8], { s: 1.25 }));

// ================= render =================
function dayLook(mode) {
  const sky = { day: '#9cc3e6', eve: '#9fb0d8', sunset: '#7f93c9' }[mode];
  S1.background.set(sky); S1.fog.color.set(sky);
  sun.color.set(mode === 'day' ? '#fff1d6' : '#ffb27a'); sun.intensity = mode === 'day' ? 3 : 2.4;
  hemi.color.set(mode === 'day' ? '#bcd6ff' : '#9fb4e6'); hemi.intensity = mode === 'day' ? 1.1 : .95;
  towerM.emissiveIntensity = mode === 'day' ? 0 : .3;
}
function render(s, lt, k, t) {
  const sc = s.scene;
  placeCars(t); placeCrowd(t, sc === 'evening'); plane1.visible = sc === 'sky';
  if (sc === 'sky') { dayLook('day');
    const a = clamp(k * .95); plane1.position.set(lerp(-420, 380, a), 210, lerp(-260, -120, a)); plane1.rotation.set(0, Math.atan2(800, 140), 0);
    return shoot(S1, new V3(lerp(170, 150, k), 150, 330), new V3(0, 110, 0), { subject: new V3(0, 120, 0), fov: 38, aper: 18 }); }
  if (sc === 'evening') { dayLook('eve');
    return shoot(S1, new V3(lerp(12, 4, k), 62, 175), new V3(0, 30, 0), { subject: new V3(0, 2, 48), fov: 36, aper: 12 }); }
  if (sc === 'airport') { dayLook('day');
    const w = sm(.05, .9, k); hero.position.set(lerp(-1, 6, w), .3 + sm(.6, 1, k) * 0, lerp(22, 11, w)); hero.rotation.y = Math.PI + Math.atan2(7, -11) * 0 + Math.PI * .85; posePerson(hero, { walk: t * 7 });
    fam.forEach((p, i) => { p.rotation.y = Math.PI * .8; posePerson(p, { wave: t * 6 + i }); });
    return shoot(S1, new V3(700 - 62, 24, -200 + 72), new V3(700 + 4, 5, -200 + 10), { subject: new V3(700, 2, -200 + 15), fov: 34, aper: 9 }); }
  if (sc === 'afghan') {
    villagers.forEach((p, i) => { const a = i / 26 * Math.PI * 2 + t * .05 * (i % 2 ? 1 : -1); const r = 14 + (i % 3) * 5; p.position.set(Math.cos(a) * r, 0, -2 + Math.sin(a) * r * .55); p.rotation.y = -a + (i % 2 ? Math.PI : 0); posePerson(p, { walk: t * 6 + i }); });
    kite.position.set(20 + Math.sin(t * .6) * 3, 34 + Math.sin(t * .9) * 2, -30); kite.rotation.z = Math.sin(t * .8) * .3;
    return shoot(S2, new V3(lerp(70, 55, k), 32, 120), new V3(0, 22, -60), { subject: new V3(0, 3, -4), fov: 40, aper: 14 }); }
  if (sc === 'money') { dayLook('day');
    const n = Math.floor(sm(.05, .85, k) * bills.length); bills.forEach((b, i) => { b.visible = i < n; b.scale.setScalar(i === n - 1 ? .6 + .4 * clamp((k * bills.length * 1.25) % 1) : 1); });
    return shoot(S1, new V3(-700 + 140, 60, -200 + 140), new V3(-700 + 25, 16, -200 - 10), { subject: new V3(-700 + 50, 6, -200 + 10), fov: 32, aper: 14 }); }
  if (sc === 'privacy') { dayLook('day');
    const d = sm(.15, .7, k); poles.forEach((p, i) => { p.position.y = -9 * clamp(d * 1.4 - i * .1); });
    hero2.rotation.y = 0; posePerson(hero2, {}); hero2.userData.lL.rotation.x = hero2.userData.lR.rotation.x = -1.4; hero2.position.y = .5;
    walkers.forEach((p, i) => { const dir = i % 2 ? 1 : -1, x = ((rnd(i, 1) * 160 + dir * t * 2.4) % 160 + 160) % 160 - 80; p.position.set(x, .35, dir > 0 ? 7.2 : -7.2 + 14.4 * 0 + (i % 3 === 0 ? 14.4 : 0) - 0); if (Math.abs(x) < 5 && dir > 0) p.position.x += 10; p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; posePerson(p, { walk: t * 7 + i, base: .35 }); });
    return shoot(S1, new V3(700 + lerp(22, 14, k), 16, 200 + 46), new V3(700, 4, 200 + 10), { subject: new V3(700, 2, 200 + 14), fov: 30, aper: 7 }); }
  // WOW: sunset over Manhattan, the towers glow; the camera rises
  dayLook('sunset'); const u = eio(clamp(lt / Math.max(4, s.dur)));
  return shoot(S1, new V3(lerp(-150, -330, u), lerp(40, 200, u), lerp(420, 640, u)), new V3(0, lerp(90, 100, u), 0), { subject: new V3(0, 120, 0), fov: 34, aper: 24 });
}
function cards(s, lt, k) {
  const a = sm(.2, .5, lt);
  if (s.card === 'lives') return card(330, `<div class="t">${L('живы', 'alive')}</div><div class="v" style="color:#3f8f5a">2 977</div><div class="n">${L('человек', 'people')}</div>`, a);
  if (s.card === 'war0') return card(330, `<div class="t">${L('война в Афганистане', 'war in Afghanistan')}</div><div class="v" style="color:#3f8f5a">0 <small>${L('лет', 'years')}</small></div>`, a);
  if (s.card === 'money') return card(330, `<div class="t">${L('остаются в США', 'stay in the US')}</div><div class="v" style="color:#3f8f5a">$8 <small>${L('трлн', 'trillion')}</small></div>`, a);
  return '';
}
start({ render, cards, mins: { sky: 4.5, wow: 8 }, bubbles: ['#2f5fb3', '#ffcf2e', '#e8463c'] });
