// «Монетка с небоскрёба» — стиль 42 «Миниатюра»
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground } from '../../lemo/kit42.js';

// ---------------- city with an art-deco tower (setbacks) ----------------
const S = world({ shadowR: 160 });
ground(S, '#6aa84a');
for (const x of [-60, 60]) road(S, x, -400, x, 400, 12, { walk: true });
for (const z of [-60, 60]) road(S, -400, z, 400, z, 12, { walk: true });
const cols = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4']; let kk = 0;
for (let bx = -3; bx <= 3; bx++) for (let bz = -3; bz <= 3; bz++) { if (bx === 0 && bz === 0) continue; if (Math.abs(bx) > 2 && Math.abs(bz) > 2) continue;
  for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) { kk++; building(S, 30, 30, 18 + ((kk * 37) % 9) * 9, bx * 120 + dx, bz * 120 + dz, { wall: cols[kk % 5], seed: kk }); } }
const deco = '#d8ccb4';
const T = grp(S, 0, 0, 0);
building(T, 70, 56, 30, 0, 0, { wall: deco, seed: 3, clutter: false });            // base
building(T, 50, 40, 230, 0, 0, { wall: deco, seed: 4, clutter: false }).position.y = 30;   // shaft (setback at 30 m → the lower roofs)
building(T, 36, 28, 60, 0, 0, { wall: deco, seed: 5, clutter: false }).position.y = 260;
const TOP = 320; rbox(T, 24, 8, 20, '#cfc3aa', 0, TOP, 0); mesh(new THREE.CylinderGeometry(1, 3, 50, 12), M('#c9bfa8'), T, 0, TOP + 33, 0);
// observation deck rail + the hero (bright yellow) leaning over it on the south side
for (let x = -11; x <= 11; x += 1.4) rbox(T, .25, 1.4, .25, '#f2efe8', x, TOP + 8, 10.4);
rbox(T, 23, .2, .3, '#f2efe8', 0, TOP + 9.4, 10.4);
const hero = person(T, 0, 8, '#ffcf2e', { y: TOP + 8, ry: 0 });
[[-6, 7, '#2f5fb3'], [6, 8, '#e07bb0'], [8, 6, '#3f8f5a']].forEach(([x, z, c]) => person(T, x, z, c, { y: TOP + 8 }));
for (let i = 0; i < 10; i++) person(S, -10 + i * 2.4, 32 + (i % 3) * 1.6, ['#e8463c', '#2f5fb3', '#f2c230', '#f4f4f0', '#3f8f5a', '#e07bb0'][i % 6], { ry: Math.PI });
for (let i = 0; i < 6; i++) car(S, ['#2f5fb3', '#f4f4f0', '#e8463c', '#3f8f5a', '#f2c230', '#2a2d33'][i], -63 + (i % 2) * 6, -150 + i * 46, i % 2 ? Math.PI : 0);
// the coin — shown 6× larger than real so it reads in a model world
const coin = mesh(new THREE.CylinderGeometry(.55, .55, .09, 32), M('#c8743a', { metalness: .7, roughness: .3 }), S, 0, 0, 0);
// updraft ribbons: wide, soft, slow (never small particles)
const ribM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
const ribs = [0, 1, 2].map(i => { const curve = new THREE.CatmullRomCurve3([V(-6 + i * 6, 60, 34), V(-4 + i * 6, 120, 30), V(-2 + i * 6, 180, 28), V(i * 6, 240, 30)]); const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .8, 8), ribM); S.add(m); return m; });

// ---------------- the workshop (separate tabletop diorama) ----------------
const W2 = world({ sky: '#2c2f3a', fog: false, sunI: 2.2, hemiI: .9, shadowR: 30 });
rbox(W2, 80, .5, 60, '#6b6f78', 0, -.5, 0); rbox(W2, 80, 30, .5, '#4a4e58', 0, 0, -20);
rbox(W2, 16, 3, 7, '#8a6a48', 0, 0, 0);                                   // the bench
rbox(W2, 2.6, 1.6, 2.6, '#bdb7ad', -2.5, 3, 0); rbox(W2, 2.6, .6, 2.6, '#3e4046', 1, 3, 0);  // concrete block, asphalt slab
const gel = grp(W2, 5, 3, 0); mesh(new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshStandardMaterial({ color: '#e8b24a', transparent: true, opacity: .6, roughness: .2 }), gel, 0, 1.3, 0); mesh(new THREE.SphereGeometry(.85, 16, 12), M('#f2eee2'), gel, 0, 1.35, 0);
const gun = grp(W2, -6.5, 3.5, 0); mesh(new THREE.CylinderGeometry(.2, .2, 2.4, 12), M('#2a2a2e', { metalness: .6 }), gun, 0, .4, 0).rotation.z = Math.PI / 2; rbox(gun, 1, .5, .8, '#5a4030', -.8, -.3, 0);
const tester = person(W2, -10, 1, '#f4f4f0', { ry: Math.PI / 2 }); const prof = person(W2, 12, 5, '#f4f4f0', { ry: -Math.PI / 2, hair: '#8a8a8a' });
const coin2 = mesh(new THREE.CylinderGeometry(.35, .35, .07, 24), M('#c8743a', { metalness: .7, roughness: .3 }), W2, 0, 0, 0);

const V3 = THREE.Vector3;
function render(s, lt, k, t) {
  const sc = s.scene; ribM.opacity = 0; coin.visible = true; posePerson(hero, {});
  if (sc === 'roof') { coin.position.set(.6, TOP + 10.2, 9.4); coin.rotation.set(0, 0, 0); posePerson(hero, { wave: lt * 2 });
    return shoot(S, new V3(22, TOP + 22, 44), new V3(0, TOP + 8, 8), { subject: new V3(0, TOP + 9, 9), fov: 26, aper: 6 }); }
  if (sc === 'drop') { const f = sm(.55, 1, k); coin.position.set(.6, TOP + 10 - f * f * 30, 11 + f * 6); coin.rotation.set(f * 9, 0, f * 4); posePerson(hero, { armsUp: .2 });
    return shoot(S, new V3(40, TOP + 40, 90), new V3(0, TOP - 4, 8), { subject: new V3(0, TOP + 6, 9), fov: 30, aper: 10 }); }
  if (sc === 'terminal') { const y = TOP - 30 - eio(k) * 160; coin.position.set(.6 + Math.sin(lt * 2) * 1.5, y, 24); coin.rotation.set(lt * 11, 0, lt * 5);
    return shoot(S, new V3(20, y + 8, 58), new V3(0, y - 2, 22), { subject: coin.position, fov: 26, aper: 8 }); }
  if (sc === 'wind') { ribM.opacity = .38 * sm(0, .2, k); const u = eio(k); coin.position.set(lerp(2, 18, u), lerp(110, 32, u) + Math.sin(u * 7) * 8, lerp(30, 26, u)); coin.rotation.set(lt * 9, 0, lt * 6);
    if (k > .85) { coin.position.set(18, 30.3, 26); coin.rotation.set(0, 0, 0); }
    return shoot(S, new V3(90, 120, 150), new V3(10, 70, 20), { subject: coin.position, fov: 30, aper: 14 }); }
  coin.visible = false;
  if (sc === 'shop' || sc === 'busted') {
    const shot = sc === 'shop' ? (lt % 3) / 3 : 0; coin2.visible = sc === 'shop' && shot > .2 && shot < .55; coin2.position.set(lerp(-5, -3.6, (shot - .2) / .35), 3.9, 0); coin2.rotation.set(0, 0, Math.PI / 2);
    posePerson(tester, { armsUp: .35 }); posePerson(prof, sc === 'busted' ? { wave: lt * 3 } : {});
    if (sc === 'busted') { const b = (lt % 2.4) / 2.4; coin2.visible = true; coin2.position.set(11.4 - Math.sin(b * Math.PI) * 1.6, 2.5 + Math.sin(b * Math.PI) * 1.4, 5); coin2.rotation.set(b * 8, 0, 0); }
    return shoot(W2, sc === 'shop' ? new V3(-2, 20, 46) : new V3(4, 7, 22), sc === 'shop' ? new V3(-1, 3, 0) : new V3(11, 2.4, 5), { subject: sc === 'shop' ? new V3(-1, 4, 0) : new V3(11, 2.4, 5), fov: sc === 'shop' ? 32 : 26, aper: 5, near: .5 }); }
  // skyline + end: the whole model city, the tower in the sharp band
  const u = eio(clamp(lt / s.dur)); return shoot(S, new V3(lerp(260, 300, u), lerp(320, 360, u), lerp(420, 470, u)), new V3(0, 150, 0), { subject: new V3(0, TOP * .8, 0), fov: 30, aper: 30 });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'speed') { const v = Math.min(EN ? 65 : 105, lerp(0, EN ? 65 : 105, eio(clamp(k * 1.6)))); return card(330, `<div class="t">${L('скорость монетки', 'penny speed')}</div><div class="v">${Math.round(v)} <small>${L('км/ч', 'mph')}</small></div><div class="n">${L('дальше не разгоняется', "it won't go faster")}</div>`, a); }
  return '';
}
start({ render, cards, mins: { drop: 4, end: 3.5 }, bubbles: ['#2f5fb3', '#ffcf2e', '#c8743a'] });
