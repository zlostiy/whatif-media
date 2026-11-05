// «Что было бы, если бы ты сдался?» — история Джоан Роулинг. Стиль 42 «Миниатюра».
import { THREE, start, EN, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, road, ground } from '../../lemo/kit42.js';
const V3 = THREE.Vector3;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
function woman(parent, x, z, coat, o = {}) { const p = person(parent, x, z, coat, { s: 1.25, ...o }); mesh(new THREE.SphereGeometry(.3 * (o.s || 1.25), 12, 10), M(o.hair || '#6a3a22'), p, 0, 1.75 * (o.s || 1.25), -.12 * (o.s || 1.25)).scale.set(1, 1.4, .8); return p; }
const HERO = '#7a4fc0';
function envelope(parent, x, y, z, red) { const g = grp(parent, x, y, z); rbox(g, 2.2, .12, 1.4, '#f4efe2', 0, 0, 0); const f = rbox(g, 2.2, .06, .7, '#e6dfcc', 0, .12, -.2); if (red) { const s = mesh(new THREE.CylinderGeometry(.32, .32, .08, 16), M('#c4251c'), g, 0, .2, 0); } return g; }
function book(parent, x, y, z, c = '#7a2a3a', s = 1) { const g = grp(parent, x, y, z); rbox(g, 1.6 * s, .45 * s, 2.2 * s, c, 0, 0, 0); rbox(g, 1.5 * s, .35 * s, 2.1 * s, '#f4efe2', .06 * s, .05 * s, 0); return g; }

const S = world({ sky: '#a9bfd6', shadowR: 140, fogNear: 300, fogFar: 1100, sunI: 2.6, hemiTop: '#d8e4f2' });
const hemi = S.children.find(o => o.isHemisphereLight), sun = S.userData.sun;
ground(S, '#7fa35a', 2400);
// ---------- Edinburgh: castle hill + grey stone street ----------
const hill = mesh(new THREE.ConeGeometry(70, 40, 9), M('#6f8a4a', { flatShading: true }), S, 0, 20, -150); hill.scale.z = .6;
const castle = grp(S, 0, 36, -150); rbox(castle, 50, 10, 18, '#8d8476', 0, 0, 0); for (const x of [-22, -8, 8, 22]) { rbox(castle, 6, 16, 6, '#8d8476', x, 0, 0); mesh(new THREE.ConeGeometry(4.4, 6, 4), M('#5a5650'), castle, x, 19, 0).rotation.y = Math.PI / 4; }
road(S, -200, 0, 200, 0, 10, { walk: true });
const STONE = ['#9a948a', '#a8a196', '#8f897e', '#b0a898'];
for (let i = 0; i < 16; i++) { const x = -150 + i * 20; if (Math.abs(x - 10) < 12) continue; building(S, 16, 14, 14 + (i % 3) * 4, x, -16, { wall: STONE[i % 4], seed: 300 + i, roof: '#4f5560', trim: '#7d776d', bay: 5, clutter: false }); building(S, 16, 14, 12 + (i % 2) * 5, x, 18, { wall: STONE[(i + 1) % 4], seed: 330 + i, roof: '#4f5560', trim: '#7d776d', bay: 5, clutter: false }); }
// the café (glass front, red awning) at x = 10
const cafe = grp(S, 10, 0, -16); rbox(cafe, 16, 9, 14, '#6b2a2a', 0, 0, 0); rbox(cafe, 12, 5, .3, M('#bfe3f2', { roughness: .1, transparent: true, opacity: .12 }), 0, .6, 7.1); { const pl = new THREE.PointLight('#ffe2b0', 60, 16, 1.4); pl.position.set(0, 6, 4); cafe.add(pl); } rbox(cafe, 14, .5, 2.4, '#c4251c', 0, 6, 8.2);
mesh(new THREE.BoxGeometry(12, .2, 10), M('#c9a27a'), cafe, 0, .7, 1.5);
const ctable = grp(cafe, 0, 0, 4.2); rbox(ctable, 3.4, .2, 2, '#8a5a3a', 0, 2.2, 0); rbox(ctable, .3, 2.2, .3, '#4a4d55', 0, 0, 0);
const heroC = woman(cafe, 0, 2.6, HERO, { y: .8 }); const pages = rbox(ctable, 1.6, .06, 1.1, '#f4efe2', 0, 2.42, .1);
const stroller = grp(cafe, 3.6, .8, 4.6); rbox(stroller, 1.4, 1, 2.2, '#2f5fb3', 0, .8, 0); mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#2f5fb3'), stroller, 0, 1.8, -.6).rotation.x = -.4; for (const [x, z] of [[-.6, -.8], [.6, -.8], [-.6, .8], [.6, .8]]) { const w = mesh(new THREE.CylinderGeometry(.35, .35, .15, 14), M('#1d1d22'), stroller, x, .35, z); w.rotation.z = Math.PI / 2; }
const passers = []; for (let i = 0; i < 16; i++) passers.push(person(S, 0, 0, ['#2f5fb3', '#3f8f5a', '#8a6a48', '#e8463c', '#2a2d33'][i % 5], { s: 1.25 }));
function placePassers(t) { passers.forEach((p, i) => { const dir = i % 2 ? 1 : -1, x = ((rnd(i, 2) * 300 + dir * t * 1.4) % 300 + 300) % 300 - 150; p.position.set(x, .35, dir > 0 ? 6.6 : -6.6); if (Math.abs(x - 10) < 6 && dir < 0) p.position.x += 12; p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; posePerson(p, { walk: t * 7 + i, base: .35 }); }); }

// ---------- desk set (hook + mail): envelopes pile up ----------
const DESK = grp(S, 500, 0, 0); mesh(new THREE.BoxGeometry(30, .4, 20), M('#8a5a3a'), DESK, 0, .2, 0); rbox(DESK, 30, 14, .5, '#d9d0c0', 0, 0, -10); rbox(DESK, .5, 14, 20, '#e6dccb', -15, 0, 0);
const typewriter = grp(DESK, -6, .4, -3); rbox(typewriter, 5, 1.6, 3.4, '#2a2d33', 0, 0, 0); rbox(typewriter, 4.6, .3, 1, '#c9ccd2', 0, 1.8, -1.2); rbox(typewriter, 3, .1, 2, '#f4efe2', 0, 2.1, -1.6).rotation.x = -.5;
const envs = []; for (let i = 0; i < 12; i++) { const e = envelope(DESK, 3 + (rnd(i, 1) - .5) * 1.6, .45 + i * .2, (rnd(i, 2) - .5) * 1.4, true); e.rotation.y = (rnd(i, 3) - .5) * .8; envs.push(e); }
const ms = grp(DESK, -1, .4, 4); for (let i = 0; i < 6; i++) rbox(ms, 3, .12, 4, '#f4efe2', (rnd(i, 4) - .5) * .2, i * .13, 0);

// ---------- home: open fridge (empty) + bills ----------
const HOME = grp(S, 500, 0, 120); mesh(new THREE.BoxGeometry(30, .4, 20), M('#c9a27a'), HOME, 0, .2, 0); rbox(HOME, 30, 10, .5, '#d9d0c0', 0, 0, -10);
const fridge = grp(HOME, -6, .4, -7); rbox(fridge, 5, 9, 4, '#e8ecef', 0, 0, 0); rbox(fridge, 4.4, 8.4, .2, M('#fffbe8', { emissive: '#fff4c8', emissiveIntensity: .7 }), 0, .3, 1.9); for (let i = 0; i < 3; i++) rbox(fridge, 4.2, .15, 3.4, '#cfd8e0', 0, 2 + i * 2.4, 0);
const fdoor = grp(HOME, -8.5, .4, -5); rbox(fdoor, .4, 9, 4, '#e8ecef', 0, 0, 2);
const ktable = grp(HOME, 5, 0, -2); rbox(ktable, 7, .3, 4, '#8a5a3a', 0, 3.2, 0); for (const [x, z] of [[-3, -1.6], [3, -1.6], [-3, 1.6], [3, 1.6]]) rbox(ktable, .3, 3.2, .3, '#6b4a2e', x, 0, z);
const bills = []; for (let i = 0; i < 7; i++) { const b = rbox(ktable, 1.8, .06, 2.4, i % 2 ? '#f4efe2' : '#f2d7a8', (rnd(i, 5) - .5) * 4, 3.5 + i * .07, (rnd(i, 6) - .5) * 2); b.rotation.y = (rnd(i, 7) - .5) * 1.2; bills.push(b); mesh(new THREE.BoxGeometry(1.2, .02, .3), M('#c4251c'), b, 0, .05, -.6); }
const heroH = woman(HOME, 0, 3, HERO);

// ---------- night window ----------
const WIN = grp(S, 500, 0, 260); rbox(WIN, 30, 14, .5, '#3a3550', 0, 0, -2); const frame = grp(WIN, 0, 2, -1.6); rbox(frame, 10, 8, .4, M('#1a2a4a', { emissive: '#1a2a4a', emissiveIntensity: .4 }), 0, 0, 0); rbox(frame, 10.6, .4, .8, '#e8ecef', 0, 8, 0); rbox(frame, 10.6, .4, .8, '#e8ecef', 0, 0, 0); rbox(frame, .4, 8, .8, '#e8ecef', -5.1, 0, 0); rbox(frame, .4, 8, .8, '#e8ecef', 5.1, 0, 0); rbox(frame, .3, 8, .6, '#e8ecef', 0, 0, 0);
const moon = mesh(new THREE.SphereGeometry(1.2, 20, 14), M('#fff6d8', { emissive: '#fff6d8', emissiveIntensity: 1.2 }), WIN, 2.6, 7.6, -1.5);
const heroW = woman(WIN, 0, 1.2, HERO); mesh(new THREE.BoxGeometry(30, .4, 12), M('#4a3a5a'), WIN, 0, .2, 4);

// ---------- London living room: Alice reads ----------
const LON = grp(S, 500, 0, 400); mesh(new THREE.BoxGeometry(30, .4, 20), M('#b8865a'), LON, 0, .2, 0); rbox(LON, 30, 10, .5, '#e6d2c8', 0, 0, -10);
const sofa = grp(LON, 0, .4, -4); rbox(sofa, 9, 1.6, 3.4, '#2f5fb3', 0, 0, 0); rbox(sofa, 9, 2.6, .9, '#2f5fb3', 0, 0, -1.3); for (const x of [-4.2, 4.2]) rbox(sofa, .8, 2.2, 3.4, '#2f5fb3', x, 0, 0);
const alice = woman(LON, 0, -3.6, '#e8463c', { s: .95, y: 2, hair: '#d8a24a' }); const apage = rbox(alice, 1, .06, .8, '#f4efe2', 0, 1.25, .45);
const dad = person(LON, 5.2, -1, '#2a2d33', { s: 1.3, y: .4 }); const lamp = mesh(new THREE.SphereGeometry(1, 16, 12), M('#ffe7a8', { emissive: '#ffcf6a', emissiveIntensity: 1 }), LON, -7, 7, -6);
rbox(LON, .3, 7, .3, '#4a4d55', -7, 0, -6);

// ---------- print hall: 500 books → a mountain ----------
const PR = grp(S, 500, 0, 560); mesh(new THREE.BoxGeometry(60, .4, 40), M('#a9aaa6'), PR, 0, .2, 0);
const stacks = []; for (let i = 0; i < 64; i++) { const g = grp(PR, (i % 8 - 3.5) * 3.4, .4, (Math.floor(i / 8) - 3.5) * 4); for (let j = 0; j < 10; j++) book(g, 0, j * .5, 0, ['#7a2a3a', '#2f5fb3', '#3f8f5a', '#f08a2c'][(i + j) % 4]); stacks.push(g); }

// ---------- wow: the night city, every window lit, readers ----------
const NIGHT = '#1f2a4a';
function look(mode) {
  const sky = { day: '#a9bfd6', eve: '#d9a882', night: NIGHT }[mode]; S.background.set(sky); S.fog.color.set(sky);
  sun.color.set(mode === 'night' ? '#9fb0ff' : mode === 'eve' ? '#ffb27a' : '#fff1d6'); sun.intensity = mode === 'night' ? .5 : mode === 'eve' ? 2.1 : 2.6; hemi.intensity = mode === 'night' ? .8 : 1.1;
}
const litBlocks = grp(S); for (let i = 0; i < 40; i++) building(litBlocks, 16, 14, 12 + (i % 4) * 5, -160 + (i % 10) * 32, 60 + Math.floor(i / 10) * 30, { wall: STONE[i % 4], seed: 400 + i, roof: '#4f5560', trim: '#7d776d', bay: 5, clutter: false, lit: 1 });
litBlocks.visible = false;
const bigBook = grp(S, 0, 66, -150); bigBook.scale.setScalar(2.6); { const L1 = rbox(bigBook, 16, 1.4, 22, '#7a2a3a', -8.2, 0, 0), R1 = rbox(bigBook, 16, 1.4, 22, '#7a2a3a', 8.2, 0, 0); L1.rotation.z = .25; R1.rotation.z = -.25; rbox(bigBook, 15, .8, 21, M('#fff6d8', { emissive: '#ffe7a8', emissiveIntensity: .8 }), -7.8, 1, 0).rotation.z = .25; rbox(bigBook, 15, .8, 21, M('#fff6d8', { emissive: '#ffe7a8', emissiveIntensity: .8 }), 7.8, 1, 0).rotation.z = -.25; }
bigBook.visible = false;

function render(s, lt, k, t) {
  const sc = s.scene; placePassers(t); look(sc === 'window' || sc === 'wow' ? 'night' : sc === 'alice' ? 'eve' : 'day');
  litBlocks.visible = bigBook.visible = sc === 'wow'; moon.visible = sc === 'window';
  if (sc === 'hook' || sc === 'mail') { const n = sc === 'hook' ? Math.floor(clamp(k * 1.15) * 12) : Math.floor(clamp(k * 1.1) * 5); envs.forEach((e, i) => { e.visible = i < n; e.position.y = .45 + i * .2 + (i === n - 1 ? (1 - clamp((k * (sc === 'hook' ? 13.8 : 5.5)) % 1)) * 2 : 0); });
    return shoot(S, new V3(500 + lerp(10, 8, k), lerp(14, 11, k), 16), new V3(500 + 1, 1, 0), { subject: new V3(500 + 3, 1.5, 0), fov: 30, aper: 5 }); }
  if (sc === 'cafe') { posePerson(heroC, {}); heroC.position.y = .8; heroC.rotation.y = 0; heroC.userData.lL.rotation.x = heroC.userData.lR.rotation.x = -1.3; heroC.userData.aL.rotation.x = heroC.userData.aR.rotation.x = -1 + Math.sin(t * 8) * .1;
    stroller.rotation.y = Math.sin(t * .8) * .05; const u = eio(k);
    return shoot(S, new V3(10 + lerp(30, 6, u), lerp(12, 5, u), 1.5), new V3(10, lerp(5, 2.5, u), -16 + 4), { subject: new V3(10, 2.5, -16 + 4), fov: 32, aper: 8 }); }
  if (sc === 'home') { const n = Math.floor(clamp(k * 1.2) * 7); bills.forEach((b, i) => b.visible = i < n); fdoor.rotation.y = -sm(.05, .3, k) * 1.4; heroH.rotation.y = Math.PI * .85; posePerson(heroH, {});
    return shoot(S, new V3(500 + 14, 12, 120 + 18), new V3(500 - 1, 4, 120 - 4), { subject: new V3(500, 3, 120 - 3), fov: 32, aper: 7 }); }
  if (sc === 'window') { heroW.rotation.y = Math.PI; posePerson(heroW, {}); return shoot(S, new V3(500 + lerp(5, 3, k), 6, 260 + lerp(16, 12, k)), new V3(500, 4.5, 260 - 1), { subject: new V3(500, 3, 260 + 1.2), fov: 32, aper: 5 }); }
  if (sc === 'alice') { posePerson(alice, {}); alice.userData.lL.rotation.x = alice.userData.lR.rotation.x = -1.4; alice.rotation.y = 0; const up = sm(.7, .9, k); alice.userData.aR.rotation.z = up * 2.4; dad.rotation.y = -.6; posePerson(dad, {});
    return shoot(S, new V3(500 + 10, 9, 400 + 14), new V3(500 + 1, 3, 400 - 3), { subject: new V3(500, 3, 400 - 3.6), fov: 30, aper: 6 }); }
  if (sc === 'print') { const g = sm(.35, .95, k); stacks.forEach((st, i) => { st.visible = i === 0 || i < 1 + g * 63; st.scale.y = i === 0 ? 1 : 1 + g * 3 * rnd(i, 9); });
    return shoot(S, new V3(500 + lerp(12, 40, eio(k)), lerp(10, 34, eio(k)), 560 + lerp(16, 48, eio(k))), new V3(500, 3, 560), { subject: new V3(500, 3, 560), fov: 34, aper: 10 }); }
  // WOW: night, the whole town reads — every window glows, a giant open book shines over the castle
  const u = eio(clamp(lt / Math.max(4, s.dur)));
  return shoot(S, new V3(lerp(30, 90, u), lerp(24, 90, u), lerp(170, 280, u)), new V3(0, lerp(50, 55, u), -110), { subject: new V3(0, 60, -150), fov: 40, aper: 22 });
}
function cards(s, lt, k) {
  const a = sm(.2, .5, lt);
  if (s.card === 'no12') return card(330, `<div class="t">${L('ответ издательств', 'publishers said')}</div><div class="v" style="color:#c4251c">12 × ${L('«НЕТ»', '"NO"')}</div>`, a);
  if (s.card === 'print') { const v = lt < s.dur * .45 ? '500' : (EN ? '600,000,000+' : '600 000 000+'); return card(330, `<div class="t">${L('книг', 'books')}</div><div class="v" style="color:#3f8f5a">${v}</div><div class="n">${L('Bloomsbury, 1997 → сегодня', 'Bloomsbury, 1997 → today')}</div>`, a); }
  return '';
}
start({ render, cards, mins: { hook: 4, wow: 7 }, bubbles: ['#7a2a3a', '#ffd23f', '#2f5fb3'] });
