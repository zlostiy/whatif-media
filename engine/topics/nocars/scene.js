// «Что если все машины исчезнут?» — стиль 42 «Миниатюра»: один игрушечный город, который меняется по эпохам
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground, water, ripple } from '../../lemo/kit42.js';

const S = world({ shadowR: 140, fogNear: 300, fogFar: 1100 });
const hemi = S.children.find(o => o.isHemisphereLight), sun = S.userData.sun;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
ground(S, '#86a865', 1400);
// ---------- city grid: avenues x = −40/0/40, streets z = −40/0/40, blocks between ----------
const RX = [-40, 0, 40], RZ = [-40, 0, 40], RW = 10;
const roads = grp(S);
for (const x of RX) road(roads, x, -70, x, 70, RW, { walk: true });
for (const z of RZ) road(roads, -70, z, 70, z, RW, { walk: true });
const roadM = M('#3e4046', { roughness: .95 });
const cols = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4', '#f0d9b5'];
let bk = 0;
for (const cx of [-20, 20]) for (const cz of [-20, 20]) for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
  bk++; if (cx === 20 && cz === 20 && dx > 0 && dz > 0) continue;                 // a gap: the shop corner
  building(S, 9, 9, 6 + (bk * 37 % 5) * 2.5, cx + dx, cz + dz, { wall: cols[bk % 6], seed: bk });
}
for (let i = 0; i < 24; i++) { const a = rnd(i, 3); const x = (rnd(i, 1) - .5) * 260, z = 80 + rnd(i, 2) * 120; if (Math.abs(x) < 90 && z < 110) continue; building(S, 10, 10, 6 + a * 10, x, z, { wall: cols[i % 6], seed: 40 + i }); }
// the shop (empty shelves on day 1) at the gap
const shop = grp(S, 26, 0, 26); rbox(shop, 9, 5, 9, '#f2efe8', 0, 0, 0); rbox(shop, 9.4, 1.2, .6, '#e8463c', 0, 4, -4.8); rbox(shop, 6, 3, .2, '#bfe3f2', 0, .5, -4.6);
// ---------- railway + station to the north ----------
const RAILZ = -92;
rbox(S, 900, .4, 6, '#8d8476', 0, 0, RAILZ); for (const dz of [-1.2, 1.2]) rbox(S, 900, .25, .25, '#b9bec6', 0, .4, RAILZ + dz);
const station = grp(S, 0, 0, -78); rbox(station, 46, 7, 12, '#e6d2c8', 0, 0, 0); rbox(station, 50, 1, 14, '#b4483c', 0, 7, 0); rbox(station, 10, 4, 10, '#e6d2c8', 0, 8, 0); rbox(station, 3, 3, .4, '#f4f4f0', 0, 9.2, 5.1);
rbox(station, 60, .8, 4, '#cfc9bd', 0, 0, -8);   // platform
road(roads, 0, -70, 0, -84, RW, { marks: false, walk: false });
function train(x0, n = 5, c = '#2f5fb3') { const g = grp(S, x0, 0, RAILZ); for (let i = 0; i < n; i++) { rbox(g, 13, 3.4, 3.6, i ? c : '#e8463c', -i * 14, .6, 0, 0, .5); const w = rbox(g, 11, .9, 3.7, M('#ffe7a8', { emissive: '#ffcf6a', emissiveIntensity: 0 }), -i * 14, 2.4, 0, 0, .2); g.userData.win = (g.userData.win || []).concat(w); } return g; }
const trains = [train(-200), train(200, 4, '#3f8f5a')];
// ---------- parking lot (east) → park ----------
const PX = 100, PZ = 0;
const parking = grp(S, PX, 0, PZ); mesh(new THREE.BoxGeometry(44, .2, 44), roadM, parking, 0, .1, 0).castShadow = false;
for (let i = -3; i <= 3; i++) for (const r of [-1, 1]) mesh(new THREE.BoxGeometry(.25, .05, 5), M('#f2f0e8'), parking, i * 5.5, .22, r * 12).castShadow = false;
road(roads, 45, 0, 78, 0, RW, { walk: true });
const park = grp(S, PX, 0, PZ); mesh(new THREE.BoxGeometry(44, .3, 44), M('#7cc05a'), park, 0, .15, 0).castShadow = false;
for (let i = 0; i < 14; i++) tree(park, (rnd(i, 7) - .5) * 38, (rnd(i, 8) - .5) * 38, 1 + rnd(i, 9) * .5, i % 3 ? '#3f8a3a' : '#5aa04a');
mesh(new THREE.CylinderGeometry(5, 5, .4, 32), M('#2f8fb6', { roughness: .2 }), park, 4, .3, 4);
const OB = [{ x: PX + 4, z: PZ + 4, r: 6.2 }, ...park.children.filter(c => c.isGroup).map(g => ({ x: PX + g.position.x, z: PZ + g.position.z, r: 2.6 }))];
// ---------- highway (south-east) with a concrete bridge over a river ----------
const HZ = 110, RIVX = 260;
const hw = grp(S); road(hw, 40, HZ, RIVX - 22, HZ, 16); road(hw, RIVX + 22, HZ, 700, HZ, 16); road(roads, 40, 45, 40, HZ, RW, { walk: false });
water(S, 30, 1400, RIVX, .08, 0);
const bridge = grp(S, RIVX, 0, HZ); rbox(bridge, 48, 1.4, 17, '#c9c4b8', 0, 3, 0); for (const x of [-12, 12]) rbox(bridge, 3, 3.2, 10, '#b9b3a6', x, -.2, 0); for (const z of [-8, 8]) rbox(bridge, 48, 1, .6, '#d8d3c7', 0, 4.4, z);
for (const sx of [-1, 1]) { const r = rbox(bridge, 10.6, .4, 15, '#c9c4b8', sx * 29, 0, 0); r.rotation.z = -sx * Math.atan2(4.4, 10); r.position.y = 2.2; }
const bdeck = mesh(new THREE.BoxGeometry(48, .15, 15), roadM, bridge, 0, 4.5, 0);
const cracks = grp(S), tufts = grp(S), hwTrees = grp(S), forest = grp(S);
for (let i = 0; i < 70; i++) { const x = 60 + rnd(i, 1) * 600, z = HZ + (rnd(i, 2) - .5) * 13; if (Math.abs(x - RIVX) < 26) continue; const c = mesh(new THREE.BoxGeometry(3 + rnd(i, 3) * 5, .06, .25), M('#24262b'), cracks, x, .23, z); c.rotation.y = rnd(i, 4) * 3; c.castShadow = false;
  const t = mesh(new THREE.IcosahedronGeometry(.6 + rnd(i, 5) * .5, 0), M('#6fb84a', { flatShading: true }), tufts, x + 1, .3, z + .4); t.scale.y = .6; }
mesh(new THREE.BoxGeometry(RIVX - 62, .22, 18), M('#9cc76a'), hwTrees, (60 + RIVX - 22) / 2 + 1, .11, HZ).castShadow = false; mesh(new THREE.BoxGeometry(400, .22, 18), M('#9cc76a'), hwTrees, RIVX + 222, .11, HZ).castShadow = false;
for (let i = 0; i < 70; i++) { const x = 60 + i * 9 + rnd(i, 6) * 4; if (Math.abs(x - RIVX) < 29) continue; for (const zz of [-6.5, 6.5]) tree(hwTrees, x, HZ + zz + (rnd(i, zz) - .5) * 2, 1.2 + rnd(i, 8) * .9); }
// in 1000 years every road is a strip of forest
for (const x of RX) for (let z = -36; z <= 66; z += 7) tree(forest, x + (rnd(z, x) - .5) * 4, z, 1.1 + rnd(z, x + 1) * .6, '#3f8a3a');
for (const z of RZ) for (let x = -66; x <= 66; x += 7) if (!RX.some(r => Math.abs(r - x) < 6)) tree(forest, x, z + (rnd(x, z) - .5) * 4, 1.1 + rnd(x, z + 1) * .6, '#4a9a44');
for (let x = 60; x < 700; x += 8) if (Math.abs(x - RIVX) > 28) tree(forest, x, HZ + (rnd(x, 1) - .5) * 10, 1.4 + rnd(x, 2) * .8, '#356f33');
const grassRoads = grp(S); for (const x of RX) mesh(new THREE.BoxGeometry(RW + 4, .26, 140), M('#7cc05a'), grassRoads, x, .13, 0).castShadow = false; for (const z of RZ) mesh(new THREE.BoxGeometry(140, .26, RW + 4), M('#7cc05a'), grassRoads, 0, .13, z).castShadow = false;
mesh(new THREE.BoxGeometry(700, .26, 18), M('#7cc05a'), grassRoads, 380, .13, HZ).castShadow = false;
// ---------- cars (gone after the vanish) ----------
const CARC = ['#d83a2e', '#2f5fb3', '#f4f4f0', '#f2c230', '#3f8f5a', '#2a2d33', '#e07bb0'];
const cars = [];
let ci = 0;
for (const x of RX) for (const lane of [-2.2, 2.2]) for (let z = -64; z <= 64; z += 7.5) { if (RZ.some(r => Math.abs(r - z) < 6)) continue; const c = car(S, CARC[ci % 7], x + lane, z, lane > 0 ? 0 : Math.PI); c.userData.lane = { ax: 'z', dir: lane > 0 ? 1 : -1, x: x + lane, z }; cars.push(c); ci++; }
for (const z of RZ) for (const lane of [-2.2, 2.2]) for (let x = -64; x <= 64; x += 8) { if (RX.some(r => Math.abs(r - x) < 6)) continue; const c = car(S, CARC[ci % 7], x, z + lane, lane > 0 ? -Math.PI / 2 : Math.PI / 2); c.userData.lane = { ax: 'x', dir: lane > 0 ? -1 : 1, x, z: z + lane }; cars.push(c); ci++; }
for (let i = -3; i <= 3; i++) for (const r of [-1, 1]) { const c = car(S, CARC[(i + 9) % 7], PX + i * 5.5, PZ + r * 12, 0); c.userData.lane = null; cars.push(c); }
for (let x = 60; x < 600; x += 12) for (const lane of [-3.5, 3.5]) { if (Math.abs(x - RIVX) < 26) continue; const c = car(S, CARC[(x / 12 | 0) % 7], x + (lane > 0 ? 4 : 0), HZ + lane, lane > 0 ? -Math.PI / 2 : Math.PI / 2); c.userData.lane = null; cars.push(c); }
const puffs = cars.map(c => { const r = ripple(S, c.position.x, c.position.z, 1.4, .3, 0); r.material = r.material.clone(); return r; });
// ---------- people: one big pool, placed per era in lanes that never cross ----------
const TOPS = ['#e8463c', '#2f5fb3', '#f2c230', '#f4f4f0', '#3f8f5a', '#e07bb0', '#8a5ad8', '#ff8a3d'];
const HAIR = ['#2b1d18', '#5a3a22', '#c99a5b', '#1d1d22', '#8a8a8a'];
const N = 260, P = [];
for (let i = 0; i < N; i++) P.push(person(S, 0, -999, TOPS[i % 8], { hair: HAIR[i % 5], s: 1.1 }));
const hero = person(S, 0, 0, '#ffcf2e', { s: 1.2 });
function bike(c) { const g = grp(S, 0, 0, 0); for (const z of [-.75, .75]) { const w = mesh(new THREE.TorusGeometry(.45, .07, 8, 20), M('#1d1d22'), g, 0, .5, z); w.rotation.y = Math.PI / 2; } rbox(g, .12, .12, 1.5, c, 0, .75, 0); rbox(g, .12, .7, .12, c, 0, .5, -.3); const r = person(g, 0, -.2, TOPS[(c.length * 7) % 8], { s: 1, y: .45 }); g.userData.rider = r; return g; }
const bikes = Array.from({ length: 36 }, (_, i) => bike(['#e8463c', '#2f5fb3', '#3f8f5a', '#f2c230'][i % 4]));
function horse(c) { const g = grp(S); rbox(g, .9, .9, 2.2, c, 0, 1.1, 0, 0, .3); rbox(g, .5, .9, .6, c, 0, 1.8, 1.2, 0, .2); for (const [x, z] of [[-.3, .8], [.3, .8], [-.3, -.8], [.3, -.8]]) rbox(g, .2, 1.1, .2, '#4a3220', x, 0, z); rbox(g, 1.8, .8, 2.6, '#8a6a48', 0, .6, -3); for (const x of [-.95, .95]) { const w = mesh(new THREE.TorusGeometry(.55, .08, 8, 18), M('#4a3220'), g, x, .55, -3); w.rotation.y = Math.PI / 2; } return g; }
const horses = Array.from({ length: 6 }, (_, i) => horse(['#8a5a3a', '#5a3a22', '#c9a37a'][i % 3]));
// market stalls by the station
const market = grp(S); for (let i = 0; i < 10; i++) { const x = -45 + i * 10, z = -60 + (i % 2) * 2; rbox(market, 5, 1.1, 2.4, '#c9a37a', x, 0, z); rbox(market, 5.6, .3, 3, ['#e8463c', '#f2c230', '#3f8f5a', '#2f5fb3'][i % 4], x, 2.8, z); for (const sx of [-2.5, 2.5]) rbox(market, .15, 2.8, .15, '#6b4a2e', x + sx, 0, z + 1.2); for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(.3, 10, 8), M(['#e8463c', '#f2c230', '#7cc05a'][j % 3]), market, x - 1.5 + j, 1.4, z); }

function hide() { for (const p of P) p.position.set(0, -999, 0); for (const b of bikes) b.position.set(0, -999, 0); for (const h of horses) h.position.set(0, -999, 0); }
// lanes: walkers along x or z, same direction per lane, spaced so they never touch
function lane(i0, n, ax, fixed, from, to, t, speed, o = {}) {
  const span = to - from; let i = i0;
  for (let j = 0; j < n; j++, i++) { const p = P[i]; if (!p) break; const u = ((j / n) + t * speed / span + rnd(j, i0) * .01) % 1, s = from + u * span;
    if (ax === 'z') p.position.set(fixed + (j % 2 ? .7 : -.7), o.y || 0, s); else p.position.set(s, o.y || 0, fixed + (j % 2 ? .7 : -.7));
    if (o.bridge) p.position.y = 4.6 * clamp((34 - Math.abs(p.position.x - RIVX)) / 10);
    p.rotation.y = ax === 'z' ? (speed > 0 ? 0 : Math.PI) : (speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    posePerson(p, o.idle ? { wave: o.wave && j % 5 === 0 ? t * 3 : 0 } : { walk: t * 7 + j }); }
  return i;
}
function cluster(i0, n, cx, cz, r, t, o = {}) {   // a standing group on a jittered grid (≥1.6 m apart), skipping obstacles
  let i = i0; const cols = Math.ceil(Math.sqrt(n));
  for (let j = 0; j < n; j++, i++) { const p = P[i]; if (!p) break; const gx = j % cols, gz = (j / cols) | 0; p.position.set(cx + (gx - cols / 2) * (r / cols * 2) + (rnd(j, i0) - .5) * .4, 0, cz + (gz - cols / 2) * (r / cols * 2) + (rnd(i0, j) - .5) * .4);
    if (o.avoid && o.avoid.some(b => Math.hypot(p.position.x - b.x, p.position.z - b.z) < b.r)) { p.position.y = -999; continue; }
    p.position.y = o.y || 0; p.rotation.y = o.face ?? (rnd(j, 3) * 6.28); posePerson(p, { wave: o.wave && j % 4 === 0 ? t * 3 + j : 0, armsUp: o.cheer && j % 3 === 0 ? .6 + Math.sin(t * 4 + j) * .1 : 0 }); }
  return i;
}
function rideBikes(n, ax, fixed, from, to, t, speed, i0 = 0, br = false) { for (let j = 0; j < n; j++) { const b = bikes[i0 + j]; if (!b) break; const span = to - from, u = ((j / n) + t * speed / span) % 1, s = from + u * span; if (ax === 'z') b.position.set(fixed + (j % 2 ? 1 : -1), 0, s); else b.position.set(s, 0, fixed + (j % 2 ? 1 : -1)); b.rotation.y = ax === 'z' ? (speed > 0 ? 0 : Math.PI) : (speed > 0 ? Math.PI / 2 : -Math.PI / 2); if (br) b.position.y = 4.6 * clamp((34 - Math.abs(b.position.x - RIVX)) / 10); } }

function era(e, t) {   // e: 0 now · 1 one year · 10 · 50 · 100 · 1000
  roadM.color.set(e >= 10 ? '#4a4d48' : '#3e4046');
  cracks.visible = e >= 10 && e < 1000; tufts.visible = e >= 10 && e < 1000; tufts.children.forEach((m, i) => m.scale.setScalar(e >= 50 ? 1.8 : 1).y = (e >= 50 ? 1.2 : .6));
  hwTrees.visible = e >= 100 && e < 1000; hw.visible = e < 100; bdeck.material = e >= 100 ? M('#7cc05a') : roadM;
  parking.visible = e < 50; park.visible = e >= 50; market.visible = e >= 1;
  roads.visible = e < 1000; grassRoads.visible = e >= 1000; forest.visible = e >= 1000;
  const dusk = e >= 1000 ? 1 : 0;
  S.background.set(dusk ? '#f2a27a' : '#9cc3e6'); S.fog.color.set(dusk ? '#f2a27a' : '#9cc3e6');
  sun.color.set(dusk ? '#ffb070' : '#fff1d6'); sun.intensity = dusk ? 2.2 : 3; hemi.color.set(dusk ? '#ffc9a8' : '#bcd6ff'); hemi.intensity = dusk ? .9 : 1.1;
  trains.forEach((tr, i) => { tr.position.x = (i ? 1 : -1) * (((t * 9 + i * 300) % 900) - 450); tr.rotation.y = i ? Math.PI : 0; tr.userData.win.forEach(w => w.material.emissiveIntensity = dusk ? 1.6 : 0); });
}
function drive(t, show) { cars.forEach((c, i) => { const L = c.userData.lane; c.visible = show; if (!L || !show) return; const d = (t * 6) % 7.5; if (L.ax === 'z') c.position.z = ((L.z + 70 + L.dir * d) % 140 + 140) % 140 - 70; else c.position.x = ((L.x + 70 + L.dir * d) % 140 + 140) % 140 - 70; }); }

const V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  hide(); puffs.forEach(p => p.material.opacity = 0); cars.forEach(c => c.scale.setScalar(1));
  hero.position.set(0, -999, 0); posePerson(hero, {});
  if (sc === 'hook' || sc === 'vanish') {
    era(0, t); drive(sc === 'hook' ? t : 0, true);
    const SW = { y: .35 }; let i = lane(0, 34, 'z', -46.1, -66, 66, t, 1.2, SW); i = lane(i, 34, 'z', 46.1, 66, -66, t, -1.2, SW); i = lane(i, 26, 'x', 6.1, -34, 34, t, 1.1, SW); i = lane(i, 26, 'x', -46.1, 34, -34, t, -1.1, SW); i = lane(i, 26, 'z', -6.1, 66, 8, t, -1, SW);
    hero.position.set(-5.5, 0, 8); hero.rotation.y = Math.PI / 2;
    if (sc === 'vanish') { cars.forEach((c, j) => { const a = clamp((k - .15 - rnd(j, 5) * .4) / .18); c.scale.setScalar(Math.max(.001, 1 - eio(a))); c.visible = a < 1; puffs[j].material.opacity = a > 0 && a < 1 ? (1 - a) * .7 : 0; puffs[j].scale.setScalar(1 + a * 2.5); });
      posePerson(hero, { armsUp: sm(.6, .8, k) * .9 }); }
    const cam = sc === 'hook' ? new V3(lerp(60, 44, u), lerp(56, 44, u), lerp(84, 66, u)) : new V3(40, 46, 62);
    return shoot(S, cam, new V3(-4, 0, 4), { subject: new V3(-5, 1, 8), fov: 32, aper: 16 });
  }
  if (sc === 'day1') {   // silent streets, empty shop, everyone heads to the station on foot and on bikes
    era(0, t); drive(0, false);
    let i = lane(0, 44, 'z', -3.4, 60, -66, t, -1.6); i = lane(i, 44, 'z', 3.4, 60, -66, t, -1.5); i = lane(i, 20, 'x', 33.9, 20, 7, t, -1, { y: .35 }); i = cluster(i, 12, 26, 17.5, 2.6, t, { face: 0 });
    rideBikes(14, 'z', -38, 60, -66, t, -4); rideBikes(10, 'z', 38, 60, -66, t, -4.5, 14);
    hero.position.set(1.5, 0, lerp(30, 10, u)); hero.rotation.y = Math.PI; posePerson(hero, { walk: t * 7 });
    return shoot(S, new V3(lerp(14, 8, u), 36, lerp(78, 66, u)), new V3(0, 0, -20), { subject: new V3(1.5, 1, lerp(30, 10, u)), fov: 32, aper: 16 });
  }
  if (sc === 'year1') {  // a market at the station, horse carts on the avenue
    era(1, t); drive(0, false);
    let i = cluster(0, 36, -22, -49, 7, t, { wave: true }); i = cluster(i, 36, 22, -49, 7, t, { wave: true }); i = lane(i, 30, 'z', -4.5, 34, -44, t, -1.3); i = lane(i, 30, 'z', 4.5, -44, 34, t, 1.3);
    horses.forEach((h, j) => { h.position.set(j % 2 ? 1.6 : -1.6, 0, ((j * 25 + t * 4 * (j % 2 ? 1 : -1)) % 115 + 115) % 115 - 50); h.rotation.y = j % 2 ? 0 : Math.PI; });
    rideBikes(14, 'x', 38.5, -66, 66, t, 4);
    hero.position.set(9, 0, -50); hero.rotation.y = Math.PI; posePerson(hero, { wave: t * 3 });
    return shoot(S, new V3(lerp(26, 18, u), 46, lerp(4, -4, u)), new V3(0, 0, -56), { subject: new V3(9, 1, -50), fov: 32, aper: 16 });
  }
  if (sc === 'year10' || sc === 'year100') {   // the highway: cracks and grass → a forest corridor and the old bridge
    const e = sc === 'year10' ? 10 : 100; era(e, t); drive(0, false);
    let i = lane(0, 60, 'x', HZ - 2.2, 60, 520, t, 1.3, { bridge: true }); i = lane(i, 60, 'x', HZ + 2.2, 520, 60, t, -1.3, { bridge: true });
    rideBikes(14, 'x', HZ - 5.5, 60, 520, t, 4.5, 0, true);
    const hx = e === 10 ? lerp(170, 190, u) : lerp(RIVX - 14, RIVX + 6, u); hero.position.set(hx, 4.6 * clamp((34 - Math.abs(hx - RIVX)) / 10), HZ); hero.rotation.y = Math.PI / 2; posePerson(hero, { walk: t * 7 });
    const cam = e === 10 ? new V3(hx + 26, 20, HZ + 34) : new V3(lerp(RIVX - 150, RIVX - 120, u), 100, HZ + 150);
    return shoot(S, cam, new V3(hx + (e === 100 ? 0 : 6), 0, HZ), { subject: hero.position.clone().add(new V3(0, 1, 0)), fov: 30, aper: 14 });
  }
  if (sc === 'safe') {   // people walk the empty streets freely; kids play on the crossroads
    era(10, t); drive(0, false);
    let i = lane(0, 40, 'x', 1.8, -66, 66, t, 1.1); i = lane(i, 40, 'x', -1.8, 66, -66, t, -1.1); i = lane(i, 26, 'z', 38, 8, 66, t, 1); i = lane(i, 26, 'z', 42, 66, 8, t, -1);
    i = cluster(i, 16, 0, 22, 4, t, { cheer: true }); rideBikes(10, 'z', -40, -66, -8, t, 4);
    hero.position.set(-6, 0, -4); hero.rotation.y = .8; posePerson(hero, { armsUp: .5 });
    return shoot(S, new V3(lerp(30, 22, u), 34, lerp(8, 6, u)), new V3(-14, 0, 2), { subject: new V3(-6, 1, -4), fov: 32, aper: 16 });
  }
  if (sc === 'year50') { // the parking lot is a park, the city lives along the rails
    era(50, t); drive(0, false);
    let i = cluster(0, 40, PX - 6, PZ - 8, 12, t, { wave: true, avoid: OB, y: .3 }); i = cluster(i, 20, PX + 10, PZ + 12, 6, t, { avoid: OB, y: .3 }); i = lane(i, 30, 'x', 2, 45, 120, t, 1); i = lane(i, 40, 'x', -70.5, -100, 100, t, 1.2);
    rideBikes(14, 'x', -2.5, -66, 120, t, 4.5);
    hero.position.set(PX - 2, .3, PZ - 3); hero.rotation.y = -.6; posePerson(hero, { wave: t * 3 });
    return shoot(S, new V3(lerp(PX + 70, PX + 50, u), 64, lerp(PZ + 80, PZ + 60, u)), new V3(PX - 30, 0, -30), { subject: new V3(PX - 2, 1, PZ - 3), fov: 32, aper: 14 });
  }
  if (sc === 'year1000' || sc === 'end') {      // WOW: sunset, roads are forest strips, trains with lit windows, bikes on the paths
    era(1000, t); drive(0, false);
    let i = cluster(0, 30, -22, -50, 5, t, { wave: true }); i = cluster(i, 30, 22, -50, 5, t, { wave: true }); i = lane(i, 20, 'x', -86, -28, 28, t, 1.1, { y: .4 });
    rideBikes(20, 'x', -66, -300, 300, t, 5); hero.position.set(2, .26, -52); hero.rotation.y = .3; posePerson(hero, { wave: sc === 'end' ? t * 3 : 0 });
    if (sc === 'end') return shoot(S, new V3(12, 9, -34), new V3(2, 1.8, -52), { subject: new V3(2, 1.6, -52), fov: 28, aper: 10 });
    const tg = new V3(lerp(2, 60, u), 0, lerp(-52, -10, u)), r = lerp(36, 300, u), h = lerp(20, 240, u), a = lerp(.7, 1.0, u);
    return shoot(S, new V3(tg.x + Math.cos(a) * r, h, tg.z + Math.sin(a) * r), tg, { subject: tg.clone().setY(1), fov: 32, aper: lerp(12, 30, u), bandW: lerp(.075, .12, u) });
  }
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'cars') return card(330, `<div class="t">${L('машин в мире', 'cars in the world')}</div><div class="v">≈1,5 <small>${L('млрд', 'billion')}</small></div><div class="n">${L('легковые, грузовики, автобусы', 'cars, trucks, buses')}</div>`, a);
  if (s.card === 'deaths') return card(330, `<div class="t">${L('гибнут на дорогах', 'road deaths')}</div><div class="v" style="color:#ff4b5c">1,19 <small>${L('млн/год', 'million/yr')}</small></div><div class="n">${L('ВОЗ, 2023', 'WHO, 2023')}</div>`, a);
  return '';
}
start({ render, cards, mins: { year1000: 8, end: 3.5, hook: 3 }, bubbles: ['#2f5fb3', '#ffcf2e', '#3f8f5a'] });
