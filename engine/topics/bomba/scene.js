// «Что если кричать „бомбоклат“ всё громче и громче?» — style 42 «Миниатюра»
import { THREE, start, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, ground, road, water } from '../../lemo/kit42.js';

const S = world({ shadowR: 140, fogNear: 400, fogFar: 1600 });
const V3 = THREE.Vector3;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
ground(S, '#86bf62', 3000);
const sea = water(S, 900, 700, 0, .05, -900, '#3f9fc6');   // the ocean far behind the town (for the wide shots)

// town: a square with a fountain-less plaza, roads, houses with windows (they shake at 140 dB)
mesh(new THREE.BoxGeometry(60, .3, 60), M('#d9d2c3'), S, 0, .15, 0).castShadow = false;
road(S, -200, 40, 200, 40, 10, { walk: true }); road(S, 40, -200, 40, 200, 10, { walk: true }); road(S, -40, -200, -40, 200, 10, { walk: true });
const cols = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4', '#f0d9b5'];
const houses = [];
[[-20, -40], [0, -42], [22, -40], [-62, -10], [-62, 18], [62, -12], [62, 18], [-20, 64], [22, 64], [-64, 64], [64, 64], [-64, -50], [64, -50]].forEach(([x, z], i) => houses.push(building(S, 14, 12, 8 + (i % 4) * 3, x, z, { wall: cols[i % 6], seed: i + 5 })));
for (let i = 0; i < 70; i++) { const a = rnd(i, 1) * Math.PI * 2, r = 110 + rnd(i, 2) * 260; const t = tree(S, Math.cos(a) * r, Math.sin(a) * r * .8 + 40, .9 + rnd(i, 3) * .5, ['#3f8a3a', '#4f9a3a', '#2f7a3a'][i % 3]); t.userData.base = t.rotation.clone(); }
const trees = S.children.filter(o => o.isGroup && o.children.length === 3 && o.children[0].geometry?.type === 'CylinderGeometry');
// a far volcano-like mountain range on the horizon for scale
for (let i = 0; i < 6; i++) mesh(new THREE.ConeGeometry(60 + i * 8, 90 + i * 12, 8), M('#7b8d6a', { flatShading: true }), S, -500 + i * 200, 40 + i * 5, -420 - (i % 2) * 60);
// big soft clouds (pushed away by the final wave)
const clouds = []; for (let i = 0; i < 9; i++) { const g = grp(S, -360 + i * 90, 120 + (i % 3) * 18, -180 + (i % 2) * 140); for (let j = 0; j < 3; j++) mesh(new THREE.SphereGeometry(14 + j * 4, 14, 10), M('#ffffff'), g, j * 16 - 16, j % 2 * 4, 0).castShadow = false; g.userData.p = g.position.clone(); clouds.push(g); }

// the hero (yellow) and his podium; a sleeping cat on a bench
const hero = person(S, 0, 0, '#ffcf2e', { s: 1.3 });
const bench = grp(S, 3, 0, 2); rbox(bench, 4, .5, 1.4, '#8a6a48', 0, .8, 0); for (const x of [-1.6, 1.6]) rbox(bench, .3, .8, 1.2, '#5a3a22', x, 0, 0);
const cat = grp(bench, .8, 1.3, 0); rbox(cat, 1.3, .55, .7, '#e08a3c', 0, 0, 0, 0, .25); rbox(cat, .55, .5, .55, '#e08a3c', .7, .2, 0, 0, .2); for (const z of [-.18, .18]) rbox(cat, .14, .2, .14, '#e08a3c', .8, .65, z, 0, .05); rbox(cat, .9, .16, .16, '#d07a2c', -.9, .1, .2, .3, .07);
const podium = grp(S, 0, 0, 0); rbox(podium, 4, 1.2, 4, '#e8463c', 0, 0, 0); rbox(podium, 4.4, .25, 4.4, '#f2c230', 0, 1.2, 0);

// people around the plaza (neighbours / pedestrians) — spaced on a grid, never overlapping
const TOPS = ['#e8463c', '#2f5fb3', '#3f8f5a', '#f4f4f0', '#e07bb0', '#8a5ad8', '#ff8a3d'];
const P = []; for (let i = 0; i < 90; i++) P.push(person(S, 0, 0, TOPS[i % 7], { hair: ['#2b1d18', '#5a3a22', '#c99a5b', '#1d1d22'][i % 4] }));
function crowd(t, o = {}) {
  let i = 0; for (let r = 0; r < 6; r++) for (let c = 0; c < 15; c++) { const p = P[i++]; if (!p) return;
    const ring = 14 + r * 3.2, a = (c / 15) * Math.PI * 2 + r * .2; const x = Math.cos(a) * ring, z = Math.sin(a) * ring;
    p.position.set(x, .3, z); const face = Math.atan2(-x, -z); p.rotation.y = o.turn != null ? lerp(face + Math.PI * (rnd(i, 4) > .5 ? .8 : -.8), face, o.turn) : face;
    posePerson(p, o.ears ? { armsUp: .55 + .1 * Math.sin(t * 9 + i) } : o.cheer ? { armsUp: .4 + .4 * Math.abs(Math.sin(t * 4 + i)) } : {}); }
}
// pigeons: a few big low-poly birds that take off (no tiny particles)
const birds = []; for (let i = 0; i < 10; i++) { const g = grp(S); rbox(g, 2.2, 1.2, 1.2, '#9aa0a6', 0, 0, 0, 0, .4); const wl = rbox(g, .5, .2, 3.6, '#7d8389', 0, .9, 0, 0, .08); g.userData = { wl, x: -20 + (i % 5) * 9, z: -40 + Math.floor(i / 5) * 2, y: 12 + (i % 3) }; birds.push(g); }
function pigeons(k, t) { birds.forEach((b, i) => { const f = clamp((k - .15 - i * .02) / .6); b.position.set(b.userData.x + f * (8 + i) , b.userData.y + eio(f) * 26, b.userData.z - f * 30); b.userData.wl.rotation.x = f > 0 ? Math.sin(t * 16 + i) * .6 : 0; b.visible = true; }); }

// sound waves: big smooth translucent rings + one dome for the finale
const ringM = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const rings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 96), ringM()); m.rotation.x = Math.PI / 2; S.add(m); return m; });
const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); S.add(dome);
function waves(lt, maxR, speed, thick = 1, y = 2) { rings.forEach((m, i) => { const ph = ((lt * speed / maxR) + i / rings.length) % 1; const r = .5 + ph * maxR; m.scale.set(r, r, thick * (1 + r * .02)); m.position.set(0, y, 0); m.material.opacity = (1 - ph) * .55; }); }

function shake(on, t) { houses.forEach((h, i) => { h.position.y = on ? Math.sin(t * 40 + i) * .06 : 0; h.rotation.z = on ? Math.sin(t * 33 + i * 2) * .006 : 0; }); }

function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  P.forEach(p => p.position.set(0, -999, 0)); birds.forEach(b => b.visible = false);
  rings.forEach(m => m.material.opacity = 0); dome.material.opacity = 0; shake(false, t); podium.visible = false; bench.visible = sc !== 'd122'; cat.rotation.z = 0; cat.position.y = 1.3;
  trees.forEach(tr => { tr.rotation.set(0, 0, 0); }); clouds.forEach(c => c.position.copy(c.userData.p));
  hero.position.set(0, 0, 0); hero.rotation.y = 0; posePerson(hero, {});
  const shout = Math.abs(Math.sin(lt * 3.2));
  const H = new V3(0, 2.4, 0);
  if (sc === 'hook') { crowd(t); posePerson(hero, { armsUp: .2 });
    return shoot(S, new V3(lerp(30, 14, u), lerp(26, 9, u), lerp(46, 20, u)), new V3(0, 2, 0), { subject: H, fov: 30, aper: 12 }); }
  if (sc === 'd30') { posePerson(hero, { armsUp: .1 }); waves(lt, 3, 2, .6);
    return shoot(S, new V3(lerp(5, 4, u), 6, lerp(22, 20, u)), new V3(2, 1.4, 1.2), { subject: new V3(2, 1.6, 1.5), fov: 32, aper: 8 }); }
  if (sc === 'd60') { crowd(t, { turn: sm(.1, .5, k) }); posePerson(hero, { armsUp: .3 * shout }); waves(lt, 10, 6);
    return shoot(S, new V3(lerp(22, 18, u), 16, lerp(30, 26, u)), new V3(0, 1, 0), { subject: H, fov: 32, aper: 12 }); }
  if (sc === 'd100') { crowd(t, { cheer: true }); posePerson(hero, { armsUp: .5 + .3 * shout }); waves(lt, 30, 18); pigeons(k, t);
    return shoot(S, new V3(lerp(-20, -14, u), 20, lerp(34, 28, u)), new V3(0, 8, -20), { subject: new V3(0, 10, -30), fov: 34, aper: 14 }); }
  if (sc === 'd122') { podium.visible = true; hero.position.y = 1.45; crowd(t, { cheer: true }); posePerson(hero, { armsUp: .8 + .15 * shout }); waves(lt, 40, 24, 1, 3.5);
    return shoot(S, new V3(lerp(16, 10, u), lerp(6, 5, u), lerp(16, 12, u)), new V3(0, 3.6, 0), { subject: new V3(0, 3.6, 0), fov: 30, aper: 10 }); }
  if (sc === 'd140') { crowd(t, { ears: true }); shake(true, t); posePerson(hero, { armsUp: .9 }); waves(lt, 80, 50, 1.4);
    return shoot(S, new V3(lerp(40, 46, u) + Math.sin(t * 30) * .15, 26, lerp(50, 56, u)), new V3(0, 4, -10), { subject: new V3(0, 6, -40), fov: 34, aper: 16 }); }
  if (sc === 'd172') { crowd(t, { ears: true }); shake(true, t); posePerson(hero, { armsUp: 1 }); waves(lt, 400, 220, 6, 4);
    trees.forEach((tr, i) => { const d = Math.hypot(tr.position.x, tr.position.z); const f = Math.max(0, Math.sin(clamp((lt * 220 - d) / 60) * Math.PI)); tr.rotation.z = f * .25; });
    return shoot(S, new V3(lerp(160, 220, u), lerp(120, 170, u), lerp(220, 280, u)), new V3(0, 0, -60), { subject: new V3(0, 3, 0), fov: 34, aper: 30, bandW: .14 }); }
  if (sc === 'wow') { posePerson(hero, { armsUp: 1 }); const R = lerp(5, 1200, eio(clamp(k * 1.05)));
    dome.scale.set(R, R * .55, R); dome.material.opacity = .22 * (1 - sm(.7, 1, k)); waves(lt, 900, 500, 10, 4);
    trees.forEach(tr => { const d = Math.hypot(tr.position.x, tr.position.z); const f = clamp((R - d) / 80) * clamp(1 - (R - d) / 400); const a = Math.atan2(tr.position.x, tr.position.z); tr.rotation.set(Math.cos(a) * f * .4, 0, -Math.sin(a) * f * .4); });
    clouds.forEach(c => { const d = Math.hypot(c.userData.p.x, c.userData.p.z); const f = clamp((R - d) / 200); c.position.copy(c.userData.p).add(new V3(c.userData.p.x, 0, c.userData.p.z).normalize().multiplyScalar(eio(f) * 260)); });
    return shoot(S, new V3(lerp(50, 380, u), lerp(30, 520, u), lerp(60, 620, u)), new V3(0, 0, lerp(0, -120, u)), { subject: new V3(0, 2, 0), fov: 36, aper: lerp(12, 34, u), bandW: lerp(.08, .16, u) }); }
  // end: calm again; the cat finally wakes up and looks at him
  posePerson(hero, { wave: t * 3 }); cat.rotation.z = sm(.2, .5, k) * .3; cat.position.y = 1.3 + sm(.2, .5, k) * .12;
  return shoot(S, new V3(4, 6, 20), new V3(2, 1.4, 1.2), { subject: new V3(2, 1.6, 1.5), fov: 32, aper: 9 });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'rec') return card(330, `<div class="t">${L('рекорд Гиннесса, 2026', 'Guinness record, 2026')}</div><div class="v">122,4 <small>${L('дБ', 'dB')}</small></div><div class="n">${L('самый громкий крик человека', 'loudest human shout')}</div>`, a);
  if (s.card === 'krak') return card(330, `<div class="t">${L('Кракатау, 1883', 'Krakatoa, 1883')}</div><div class="v">172 <small>${L('дБ', 'dB')}</small></div><div class="n">${L('в 160 км от вулкана', '160 km from the volcano')}</div>`, a);
  return '';
}
start({ render, cards, mins: { hook: 3, wow: 7, end: 3.5 }, bubbles: ['#ffcf2e', '#2f5fb3', '#e8463c'] });
