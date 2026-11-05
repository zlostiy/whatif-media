// «Последний мужчина на Земле» — интерактивный сериал, серия 1 «Утро». Стиль 42 «Миниатюра», холодное зимнее утро.
import { THREE, start, EN, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, car, road, ground } from '../../lemo/kit42.js';
const V3 = THREE.Vector3;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
function canvasMat(w, h, draw, o = {}) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, roughness: .5, emissive: new THREE.Color(o.glow ? '#ffffff' : '#000'), emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow || 0 }); }
const HERO = '#ffcf2e';
// women: longer hair (a second sphere at the back), warm coats
function woman(parent, x, z, coat, o = {}) { const p = person(parent, x, z, coat, { s: 1.2, ...o }); mesh(new THREE.SphereGeometry(.3 * 1.2, 12, 10), M(o.hair || '#5a3a22'), p, 0, 1.75 * 1.2, -.12 * 1.2).scale.set(1, 1.3, .8); return p; }

// ================= exterior: a snowy courtyard of 5-storey blocks =================
const S = world({ sky: '#aac4dc', shadowR: 120, fogNear: 220, fogFar: 900, sunI: 2.4, sunDir: [-80, 50, 60], hemiTop: '#dfe9f6' });
ground(S, '#eef2f5', 2000);
const roads = grp(S); road(roads, -200, 40, 200, 40, 11, { walk: true }); road(roads, 60, -200, 60, 200, 11, { walk: true });
const WALL = ['#e6d2c8', '#d9c2a4', '#c7d3dc', '#e9dfcc', '#d6d9c4'];
// hero's block: 5 floors, entrance at front (z +7), balcony on floor 2
const FL = 3.2, HB = grp(S, 0, 0, 0);
building(HB, 40, 14, 5 * FL, 0, 0, { wall: '#e6d2c8', seed: 11, roof: '#f2f4f6', trim: '#e8ecef', bay: 4, clutter: false });
const door = rbox(HB, 2.4, 2.8, .3, '#5a3a22', 0, 0, 7.05); rbox(HB, 3.4, .3, 1.6, '#c9c4b8', 0, 3, 7.6);
const balc = grp(HB, 8, FL, 7); rbox(balc, 5, .3, 2, '#c9c4b8', 0, 0, 1); rbox(balc, 5, 1.1, .15, '#9aa0b0', 0, .3, 2); rbox(balc, 1.6, 2.4, .1, M('#bfe3f2', { roughness: .1 }), 0, .3, -.02);
const drift = mesh(new THREE.SphereGeometry(3.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#f7f9fb'), S, 8, 0, 11.5); drift.scale.y = .45;
for (let i = 0; i < 14; i++) { const a = rnd(i, 1); building(S, 36, 12, (4 + Math.floor(a * 4)) * FL, (i % 4 - 1.5) * 52 + (i > 7 ? 26 : 0), -40 - Math.floor(i / 4) * 34 + (i % 2) * 4, { wall: WALL[i % 5], seed: 30 + i, roof: '#f2f4f6', trim: '#e8ecef', bay: 4, clutter: false }); }
for (let i = 0; i < 8; i++) building(S, 26, 12, (4 + i % 3) * FL, -150 + i * 44, 75, { wall: WALL[(i + 2) % 5], seed: 60 + i, roof: '#f2f4f6', trim: '#e8ecef', bay: 4, clutter: false, ry: 0 });
for (let i = 0; i < 10; i++) tree(S, -36 + i * 8, -16, 1.1, '#3a6a4a');
// people in white suits at the door
const suits = [-2.2, 0, 2.2].map((x, i) => { const p = person(S, x, 9.5, '#f4f6f8', { s: 1.3, legs: '#e8ecef', hair: false, skin: '#f4f6f8' }); rbox(p, .7, .5, .1, M('#2a3a4a', { roughness: .1 }), 0, 2.3, .33); p.rotation.y = Math.PI; return p; });
// the hero (outside)
const hero = person(S, 8, 8, HERO, { s: 1.3 });
// women on the streets (no men anywhere), placed on the pavements, walking in their own lanes
const COATS = ['#e8463c', '#2f5fb3', '#7a4fc0', '#3f8f5a', '#e07bb0', '#f08a2c', '#8a6a48'];
const women = []; for (let i = 0; i < 26; i++) women.push(woman(S, 0, 0, COATS[i % 7], { hair: ['#5a3a22', '#2b1d18', '#d8a24a', '#8a4a2a'][i % 4] }));
function placeWomen(t, on) { women.forEach((p, i) => { p.visible = on; if (!on) return; const dir = i % 2 ? 1 : -1, s = ((rnd(i, 3) * 400 + dir * t * 1.4) % 400 + 400) % 400 - 200;
  if (i % 3) { p.position.set(s, .35, 40 + (i % 2 ? 6.7 : -6.7)); p.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { p.position.set(60 + (i % 2 ? 6.7 : -6.7), .35, s); p.rotation.y = dir > 0 ? 0 : Math.PI; }
  if (Math.abs(p.position.x - 60) < 9 && Math.abs(p.position.z - 40) < 9) p.position.x += 18; posePerson(p, { walk: t * 6 + i, base: .35 }); }); }
// the drone: body + 4 arms + 4 big rotor discs (solid, slowly turning, never flickering) + one steady red lamp
const drone = grp(S); rbox(drone, 2.2, .7, 2.2, '#2a2d33', 0, 0, 0);
for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { rbox(drone, 1.8, .2, .3, '#2a2d33', x / 2, .3, z / 2, Math.atan2(z, x)); const d = mesh(new THREE.CylinderGeometry(1.1, 1.1, .08, 24), M('#9aa0b0', { transparent: true, opacity: .55 }), drone, x, .55, z); d.castShadow = false; }
const lamp = mesh(new THREE.SphereGeometry(.38, 16, 12), M('#ff2d2d', { emissive: '#ff2d2d', emissiveIntensity: 2.2 }), drone, 0, -.25, 1.15);
const beam = mesh(new THREE.ConeGeometry(5, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide }), drone, 0, -7, 0); beam.castShadow = false;
// the car + the driver; police cars far behind with big, slow pulsing lamps
const carG = car(S, '#2a2d33', 0, 0); const driver = woman(carG, -.45, -.2, '#e8463c', { y: .35, s: 1 }); driver.scale.setScalar(.8);
const doorL = rbox(carG, .12, 1, 1.8, '#2a2d33', 1.05, .6, -.1);
const police = [0, 1].map(i => { const c = car(S, '#f4f4f0', 0, 0); rbox(c, 2, .25, 1, '#2f5fb3', 0, 1.6, -.2); const l1 = mesh(new THREE.SphereGeometry(.35, 12, 10), M('#ff2d2d', { emissive: '#ff2d2d', emissiveIntensity: 1 }), c, -.5, 2.05, -.2), l2 = mesh(new THREE.SphereGeometry(.35, 12, 10), M('#2f6dff', { emissive: '#2f6dff', emissiveIntensity: 1 }), c, .5, 2.05, -.2); c.userData.l = [l1, l2]; return c; });

// ================= interior set: bedroom + kitchen (cut-away, far away) =================
const IN = grp(S, 600, 0, 0);
mesh(new THREE.BoxGeometry(40, .4, 20), M('#c9a27a'), IN, 0, .2, 0); rbox(IN, 40, 10, .5, '#e9e2d6', 0, 0, -10); rbox(IN, .5, 10, 20, '#dfe7ee', -20, 0, 0); rbox(IN, .5, 10, 20, '#dfe7ee', 0, 0, 0);
rbox(IN, 6, 4, .2, M('#cfe6f7', { emissive: '#cfe6f7', emissiveIntensity: .5 }), -10, 3, -9.7);
const bed = grp(IN, -12, 0, -4); rbox(bed, 7, 1.4, 10, '#6b4a2e', 0, .4, 0); rbox(bed, 6.6, .8, 9.6, '#f4f4f0', 0, 1.8, 0); rbox(bed, 6.6, .5, 6, '#2f5fb3', 0, 2.5, 1.6); rbox(bed, 2.4, .7, 1.6, '#f4f4f0', -1.6, 2.5, -3.6);
const heroIn = person(IN, -12, -4, HERO, { s: 1.3 });
const phone = rbox(IN, 1.1, 1.9, .15, '#1a1d24', 0, 0, 0); const phScr = mesh(new THREE.PlaneGeometry(.95, 1.7), canvasMat(256, 460, (g, w, h) => { g.fillStyle = '#c4251c'; g.fillRect(0, 0, w, h * .22); g.fillStyle = '#fff'; g.font = '900 54px Rubik, Arial'; g.textAlign = 'center'; g.fillText(L('СРОЧНО', 'BREAKING'), w / 2, h * .15); g.fillStyle = '#11131a'; g.fillRect(0, h * .22, w, h); g.fillStyle = '#fff'; g.font = '800 40px Rubik, Arial'; L('МУЖЧИНЫ|ИСЧЕЗЛИ|ПО ВСЕЙ|ЗЕМЛЕ', 'ALL MEN|HAVE|VANISHED|WORLDWIDE').split('|').forEach((s, i) => g.fillText(s, w / 2, h * .36 + i * 64)); }, { glow: .8 }), phone, 0, 0, .09);
// kitchen: table, fridge, the stopped clock (big, 3:33)
const kit = grp(IN, 12, 0, 0); rbox(kit, 8, 2.8, 4, '#f4f4f0', 0, .4, -7.6); rbox(kit, 3, 7, 3, '#dfe3e8', 7, .4, -8); rbox(kit, 5, 2.6, 3, '#b8865a', 0, .4, 0);
const clock = grp(kit, -3, 7, -9.6); mesh(new THREE.CylinderGeometry(1.8, 1.8, .3, 40), M('#f4f4f0'), clock, 0, 0, 0).rotation.x = Math.PI / 2; mesh(new THREE.TorusGeometry(1.8, .16, 10, 40), M('#2a2d33'), clock, 0, 0, .1);
for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rbox(clock, .12, .35, .1, '#2a2d33', Math.sin(a) * 1.45, Math.cos(a) * 1.45 - .17, .18).rotation.z = -a; }
const handH = grp(clock, 0, 0, .25), handM = grp(clock, 0, 0, .3); rbox(handH, .18, 1, .08, '#2a2d33', 0, 0, 0); rbox(handM, .12, 1.4, .08, '#c4251c', 0, 0, 0);
handH.rotation.z = -(3 + 33 / 60) / 12 * Math.PI * 2; handM.rotation.z = -33 / 60 * Math.PI * 2;

function render(s, lt, k, t) {
  const sc = s.scene;
  placeWomen(t, !['wake', 'clock'].includes(sc)); drone.visible = ['drone', 'car', 'car2', 'car3', 'choice'].includes(sc); carG.visible = police[0].visible = police[1].visible = ['car', 'car2', 'car3', 'choice'].includes(sc);
  suits.forEach(p => p.visible = ['door', 'jump'].includes(sc)); hero.visible = !['wake', 'clock'].includes(sc);
  drone.rotation.y = t * .3; drone.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry').forEach((d, i) => d.rotation.y = t * 2 + i);
  police.forEach((c, i) => { const p = .5 + .5 * Math.sin(t * 4 + i); c.userData.l[0].material.emissiveIntensity = .4 + 1.6 * p; c.userData.l[1].material.emissiveIntensity = .4 + 1.6 * (1 - p); });
  if (sc === 'wake') { const u = sm(.15, .5, k); heroIn.position.set(-12, 2.2, -5); heroIn.rotation.set(-Math.PI / 2 * (1 - u), 0, 0); heroIn.position.y = lerp(2.4, 2.2, u); heroIn.position.z = lerp(-6.5, -4.6, u);
    phone.position.set(-12 + .7, lerp(2.6, 4.6, u), lerp(-4.6, -2.8, u)); phone.rotation.set(-.2, 0, 0);
    return shoot(S, new V3(600 - 12 + 8, 9, 12), new V3(600 - 12, 3.4, -3.5), { subject: new V3(600 - 12, 4, -3), fov: 30, aper: 5 }); }
  if (sc === 'clock') { const z = lerp(13, 10, eio(k)); return shoot(S, new V3(600 + 12 - 3, 7, -9.6 + z), new V3(600 + 12 - 3, 7, -9.6), { subject: new V3(600 + 12 - 3, 7, -9.6), fov: 30, aper: 4 }); }
  if (sc === 'door') { suits.forEach((p, i) => posePerson(p, i === 1 ? { wave: t * 9 } : {})); hero.position.set(8, FL + .35, 7.4); hero.rotation.y = 0; posePerson(hero, {});
    return shoot(S, new V3(lerp(14, 10, k), 12, 30), new V3(3, 3.5, 7), { subject: new V3(0, 2, 9), fov: 34, aper: 9 }); }
  if (sc === 'jump') { const j = clamp(k / .45), r = clamp((k - .5) / .5);
    if (k < .5) { hero.position.set(8, FL + .35 + Math.sin(j * Math.PI) * 2 - j * (FL - .3), lerp(7.4, 11.5, j)); posePerson(hero, { armsUp: Math.sin(j * Math.PI) }); hero.rotation.y = 0; }
    else { hero.position.set(8 + r * 14, .35, lerp(11.5, 34, r)); hero.rotation.y = Math.atan2(14, 22.5); posePerson(hero, { walk: t * 12, base: .35 }); }
    suits.forEach(p => { p.rotation.y = 0; posePerson(p, {}); });
    return shoot(S, new V3(26, 14, 34), new V3(8, 3, 12), { subject: new V3(8, 2, 12), fov: 34, aper: 9 }); }
  if (sc === 'drone') { const r = k; hero.position.set(lerp(30, 48, r), .35, 40 + 6.7); hero.rotation.y = Math.PI / 2; posePerson(hero, { walk: t * 12, base: .35 }); drone.position.set(hero.position.x - 2 + Math.sin(t) * .5, lerp(26, 14, eio(clamp(k * 1.4))), hero.position.z - 2);
    return shoot(S, new V3(hero.position.x - 20, 7, hero.position.z + 26), new V3(hero.position.x, 7, hero.position.z - 2), { subject: new V3(hero.position.x, 3, hero.position.z), fov: 38, aper: 8 }); }
  // car / car2 / car3 / choice: the corner at (60, 40)
  carG.position.set(60 - 3, 0, lerp(70, 50, eio(clamp(sc === 'car' ? k * 1.4 : 1)))); carG.rotation.y = Math.PI; doorL.position.x = sc === 'car' ? 1.05 : 1.6; doorL.rotation.y = sc === 'car' ? 0 : -1;
  hero.position.set(54, .35, 46.7); hero.rotation.y = Math.PI / 2 + .4; posePerson(hero, {});
  drone.position.set(52, 13 + Math.sin(t * 1.3) * .4, 44);
  const pz = sc === 'car3' ? lerp(-60, -20, eio(k)) : sc === 'choice' ? -20 : -80; police.forEach((c, i) => { c.position.set(60 + (i ? 3 : -3), 0, pz - i * 9); c.rotation.y = 0; });
  if (sc === 'car' || sc === 'car2') return shoot(S, new V3(38, 9, 72), new V3(57, 2.2, 49), { subject: new V3(57, 1.6, 50), fov: 34, aper: 7 });
  if (sc === 'car3') return shoot(S, new V3(70, 10, 66), new V3(58, 2, 20), { subject: new V3(58, 2, 30), fov: 40, aper: 10 });
  const u = eio(clamp(lt / Math.max(4, s.dur))); return shoot(S, new V3(lerp(90, 120, u), lerp(60, 140, u), lerp(110, 170, u)), new V3(40, 4, 30), { subject: new V3(57, 2, 46), fov: 38, aper: 18 });
}
function cards(s, lt, k) {
  const a = sm(.2, .5, lt);
  if (s.card === 'news') return card(330, `<div class="t">${L('последний мужчина', 'the last man')}</div><div class="v" style="font-size:72px">${L('СЕРИЯ 1', 'EPISODE 1')}</div>`, a);
  if (s.card === 'choice') { const c1 = sm(.6, 1, lt), c2 = sm(1.4, 1.8, lt);
    return card(330, `<div class="t">${L('что делаешь?', 'what do you do?')}</div><div style="text-align:left;font-weight:900;font-size:46px;line-height:1.25;margin-top:10px"><div style="opacity:${c1}"><span style="color:#ff4b5c">1</span> — ${L('сесть к незнакомке', 'get in the car')}</div><div style="opacity:${c2}"><span style="color:#2f5fb3">2</span> — ${L('бежать в метро', 'run to the subway')}</div></div><div class="n" style="margin-top:12px">${L('пиши 1 или 2 в комментариях', 'comment 1 or 2')}</div>`, a); }
  return '';
}
start({ render, cards, cap: s => s.scene === 'choice' ? { bottom: 480 } : null, mins: { wake: 6, jump: 4, choice: 8 }, bubbles: ['#1a2a44', '#c4251c', '#f4f4f0'] });
