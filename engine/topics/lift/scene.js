// «Лифт: подпрыгнуть в последний момент?» — стиль 42 «Миниатюра» (макет города, наклонная резкость)
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground, facadeMat } from '../../lemo/kit42.js';

// ---------------- the city + a cut-away tower with an exposed lift shaft ----------------
const FL = 3.6, NF = 80, TH = NF * FL;           // floor height (model metres), floors, tower height
function city(scene, o = {}) {
  ground(scene, o.grass || '#6aa84a');
  for (const x of [-60, 60]) road(scene, x, -400, x, 400, 12, { walk: true });
  for (const z of [-60, 60]) road(scene, -400, z, 400, z, 12, { walk: true });
  const cols = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4'];
  let k = 0;
  for (let bx = -3; bx <= 3; bx++) for (let bz = -3; bz <= 3; bz++) {
    if (bx === 0 && bz === 0) continue;
    const cx = bx * 120, cz = bz * 120; if (Math.abs(bx) > 2 && Math.abs(bz) > 2) continue;
    for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) { k++; const h = 18 + ((k * 37) % 9) * 9 * (o.old ? .7 : 1); building(scene, 30, 30, h, cx + dx, cz + dz, { wall: cols[k % 5], seed: k, lit: o.lit || 0 }); }
  }
  if (!o.noTrees) for (let i = 0; i < 24; i++) tree(scene, -56 + (i % 2) * 112 + ((i * 7) % 5 - 2), -50 + Math.floor(i / 2) * 9, 1.3);
}
// cut-away tower: back + side walls with windows, open front showing floor slabs, shaft, rails and the cab
function tower(scene, o = {}) {
  const g = grp(scene, 0, 0, 0);
  const fm = facadeMat(o.wall || '#d9d3c7', '#2b3a48', 7, o.lit || 0);
  const wall = (w, h, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  wall(40, TH, 1, 0, -15); wall(1, TH, 17.5, -20, -6.25); wall(1, TH, 17.5, 20, -6.25);
  // floor slabs with a notch for the open shaft (x −3.5…3.5, z −4.5…2.5, front side open)
  const slabM = M('#cfc9bd'), slabM2 = M('#b9b2a6');
  for (let f = 0; f <= NF; f++) { const y = f * FL, m = f % 10 === 0 ? slabM2 : slabM;
    for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(16.5, .5, 17.5), m, g, sx * 11.75, y, -6.25);
    mesh(new THREE.BoxGeometry(7, .5, 10.5), m, g, 0, y, -9.75); }
  // the shaft: back + side walls (dark), two guide rails
  const shM = M('#34363e');
  mesh(new THREE.BoxGeometry(7.4, TH, .3), shM, g, 0, TH / 2, -4.6);
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(.3, TH, 7), shM, g, sx * 3.65, TH / 2, -1);
  for (const x of [-3.2, 3.2]) mesh(new THREE.BoxGeometry(.3, TH, .5), M('#9aa0b0', { metalness: .5, roughness: .4 }), g, x, TH / 2, -1);
  rbox(g, 42, 3, 18, '#bdb5a7', 0, TH, -6);
  g.userData.fm = fm; return g;
}
function cab(scene) {
  const c = grp(scene, 0, 0, -1);
  rbox(c, 5.6, .4, 5.6, '#b8a890', 0, 0, 0);                            // floor
  rbox(c, 5.6, 4.2, .3, '#c9b89a', 0, 0, -2.65);                         // back wall (front & sides open: cut-away)
  rbox(c, .3, 4.2, 5.6, '#c9b89a', -2.65, 0, 0); rbox(c, .3, 4.2, 5.6, '#c9b89a', 2.65, 0, 0);
  rbox(c, 5.6, .4, 5.6, '#b8a890', 0, 4.2, 0);                           // roof
  const cable = mesh(new THREE.CylinderGeometry(.12, .12, 1, 8), M('#2a2a2e', { metalness: .6 }), c, 0, 0, 0); cable.castShadow = false;
  const hero = person(c, 0, .4, '#ffcf2e', { s: 1.25, y: .4 });
  const lamp = new THREE.PointLight('#ffe2b0', 30, 12, 1.6); lamp.position.set(0, 3.8, 1); c.add(lamp); rbox(c, 1.6, .12, .6, M('#fff6d8', { emissive: '#fff0c0', emissiveIntensity: 1.5 }), 0, 4.05, 0);
  // safety catchers: two clamps beside the rails (open → closed)
  const catchers = [-3.2, 3.2].map(x => { const k = grp(c, x, .2, 0); rbox(k, .9, .9, 1.2, '#e8463c', 0, 0, 0); return k; });
  c.userData = { cable, hero, catchers }; return c;
}

const S1 = world({ shadowR: 140 }); city(S1); const T1 = tower(S1); const C1 = cab(S1);
// a few people on the pavement (they don't move into each other)
[[-52, 30], [-52, 34], [-50, 40], [52, -20], [52, -26]].forEach(([x, z], i) => person(S1, x, z, ['#e8463c', '#2f5fb3', '#3f8f5a', '#e07bb0', '#f08a2c'][i]));
for (let i = 0; i < 6; i++) car(S1, ['#2f5fb3', '#f4f4f0', '#e8463c', '#3f8f5a', '#f2c230', '#2a2d33'][i], -63 + (i % 2) * 6, -150 + i * 46, i % 2 ? Math.PI : 0);

// 1945: same world, foggy grey morning, an art-deco tower and a bomber
const S2 = world({ sky: '#a9adb2', fogNear: 160, fogFar: 900, sunI: 1.6, hemiI: 1.3 }); city(S2, { old: true, grass: '#7c9a5c', noTrees: true }); const T2 = tower(S2, { wall: '#d6cbb5' }); const C2 = cab(S2);
const spire = grp(S2, 0, TH, 0); rbox(spire, 30, 14, 22, '#d6cbb5', 0, 0, 0); rbox(spire, 18, 14, 14, '#d6cbb5', 0, 14, 0); rbox(spire, 9, 12, 9, '#cfc4ad', 0, 28, 0); mesh(new THREE.CylinderGeometry(.6, 1.6, 26, 10), M('#bfb7a6'), spire, 0, 53, 0);
const plane = grp(S2, 0, 0, 0); plane.scale.setScalar(1.6);
rbox(plane, 3, 3, 26, '#5b6a4a', 0, -1.5, 0); rbox(plane, 40, .6, 5, '#5b6a4a', 0, 0, 1); rbox(plane, 14, .5, 3, '#5b6a4a', 0, .8, -11); rbox(plane, .5, 5, 3, '#5b6a4a', -6.5, 1, -11); rbox(plane, .5, 5, 3, '#5b6a4a', 6.5, 1, -11);
for (const x of [-9, 9]) { rbox(plane, 2.2, 2.2, 6, '#4a573c', x, -1.5, 3); }
const puffs = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 1, transparent: true, opacity: 0 })); S2.add(m); return m; });
const coil = grp(S2, 0, 0, -1); for (let i = 0; i < 9; i++) { const t = mesh(new THREE.TorusGeometry(1.6 + (i % 3) * .5, .14, 8, 28), M('#2a2a2e', { metalness: .5 }), coil, (i % 3 - 1) * .8, .3 + i * .22, (i % 2) * .6 - .3); t.rotation.x = Math.PI / 2; }
coil.visible = false;

function placeCab(C, y, cableTop = true) { C.position.y = y; const L2 = TH - y - 4.4; C.userData.cable.visible = cableTop && L2 > 0; C.userData.cable.scale.y = Math.max(.01, L2); C.userData.cable.position.y = 4.4 + L2 / 2; }
const V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene, C = ['bomber', 'betty', 'city', 'end'].includes(sc) ? C2 : C1, hero = C.userData.hero;
  posePerson(hero, {}); hero.position.y = .4; hero.rotation.set(0, 0, 0); C.userData.catchers.forEach((c, i) => c.position.x = (i ? 1 : -1) * 3.6);
  if (sc === 'snap') { const y = 76 * FL; placeCab(C1, y - sm(.55, 1, k) * 3, k < .6); return shoot(S1, new V3(60, y + 50, 150), new V3(0, y - 10, 0), { subject: new V3(0, y + 2, 0), fov: 30, aper: 16 }); }
  if (sc === 'idea') { const y = 70 * FL - k * 20; placeCab(C1, y, false); posePerson(hero, { armsUp: sm(.4, .9, k) * .6 }); return shoot(S1, new V3(10, y + 12, 34), new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: 26, aper: 6 }); }
  if (sc === 'fall' || sc === 'jump' || sc === 'blind') {
    const base = { fall: 62, jump: 30, blind: 18 }[sc] * FL, y = base - eio(k) * (sc === 'fall' ? 120 : 40); placeCab(C1, y, false);
    if (sc === 'jump') { const j = Math.sin(clamp((k - .3) / .4) * Math.PI); hero.position.y = .4 + j * 1.2; posePerson(hero, { armsUp: j }); }
    if (sc === 'blind') { const j = Math.sin(clamp((k - .2) / .3) * Math.PI); hero.position.y = .4 + j * 1.1; if (k > .5) { hero.rotation.z = sm(.5, .7, k) * 1.4; hero.position.y = .7; } }
    const cam = sc === 'fall' ? new V3(30, y + 26, 70) : new V3(8, y + 9, 30);
    return shoot(S1, cam, new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: sc === 'fall' ? 30 : 26, aper: sc === 'fall' ? 12 : 6 });
  }
  if (sc === 'floor') { placeCab(C1, 6 * FL, true); hero.rotation.x = -Math.PI / 2; hero.position.set(0, .7, 1.2); return shoot(S1, new V3(5, 6 * FL + 14, 24), new V3(0, 6 * FL + 1, -1), { subject: new V3(0, 6 * FL + 1, 0), fov: 26, aper: 6 }); }
  if (sc === 'brakes') { const y = 40 * FL - eio(clamp(k * 1.6)) * 8; placeCab(C1, y, false); const c = sm(.3, .55, k); C1.userData.catchers.forEach((m, i) => m.position.x = (i ? 1 : -1) * lerp(3.6, 3.75, c)); C1.userData.catchers.forEach(m => m.scale.set(1, 1 + c * .3, 1 + c * .2)); return shoot(S1, new V3(9, y + 7, 22), new V3(0, y + 1.5, -1), { subject: new V3(0, y + 1, -1), fov: 26, aper: 6 }); }
  // ---- 1945 ----
  puffs.forEach(m => m.material.opacity = 0); plane.visible = false; coil.visible = false;
  if (sc === 'bomber') { plane.visible = true; const a = clamp(k * 1.05); plane.position.set(lerp(-120, -24, a), 79 * FL, lerp(60, 4, a)); plane.rotation.y = Math.atan2(96, -56); placeCab(C2, 79 * FL, true);
    if (k > .84) puffs.forEach((m, i) => { const e = (k - .84) * 6; m.position.set(-22 + i * 4, 79 * FL + 2 + i * 4 + e * 6, 2 + i); m.scale.setScalar(5 + e * 8 + i * 2); m.material.opacity = .8 * clamp(e * 1.5); });
    return shoot(S2, new V3(30, 79 * FL + 60, 240), new V3(-30, 79 * FL - 6, 10), { subject: plane.position, fov: 40, aper: 12 }); }
  if (sc === 'betty') { const y = 75 * FL - eio(k) * 70 * FL; placeCab(C2, Math.max(1, y), false); return shoot(S2, new V3(30, y + 30, 90), new V3(0, y + 2, -1), { subject: new V3(0, y + 2, 0), fov: 30, aper: 12 }); }
  if (sc === 'city') { placeCab(C2, 1.2, false); coil.visible = true; return shoot(S2, new V3(8, 13, 28), new V3(0, 3, -1), { subject: new V3(0, 2, 0), fov: 28, aper: 6 }); }
  // end: the wide skyline at a soft dawn, the tower in the band
  const u = eio(clamp(lt / s.dur)); return shoot(S1, new V3(lerp(200, 260, u), lerp(260, 320, u), lerp(360, 420, u)), new V3(0, TH * .55, 0), { subject: new V3(0, TH * .8, 0), fov: 30, aper: 30 });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'speed') { const v = lerp(0, EN ? 170 : 280, eio(clamp(k * 1.1))); return card(330, `<div class="t">${L('скорость', 'speed')}</div><div class="v" style="color:#ff4b5c">${Math.round(v)} <small>${L('км/ч', 'mph')}</small></div><div class="n">${L('8 секунд до подвала', '8 seconds to the basement')}</div>`, a); }
  if (s.card === 'jump') return card(330, `<div class="t">${L('прыжок против падения', 'jump vs. fall')}</div><div class="v"><span style="color:#5cd06a">${EN ? 6 : 10}</span> <small>vs</small> <span style="color:#ff4b5c">${EN ? 170 : 280}</span></div><div class="n">${L('км/ч', 'mph')}</div>`, a);
  if (s.card === 'betty') return card(330, `<div class="t">${L('падение', 'the fall')}</div><div class="v">${EN ? '~1,000 <small>ft</small>' : '~300 <small>м</small>'}</div><div class="n">${L('75 этажей · рекорд Гиннесса', '75 floors · Guinness record')}</div>`, a);
  return '';
}
start({ render, cards, mins: { bomber: 6, end: 3.5 }, bubbles: ['#2f5fb3', '#ffcf2e', '#e8463c'] });
