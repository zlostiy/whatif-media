// «Машина в реке: как выбраться» — стиль 42 «Миниатюра»: макет реки в разрезе (видно под водой)
import { THREE, start, EN, L, clamp, lerp, sm, eio, V, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, tree, person, posePerson, car, road, ground } from '../../lemo/kit42.js';

const S = world({ sky: '#a8cbe8', shadowR: 120 });
// terrain: river along x (z −14…14). The diorama ends at x = CUT: the end face shows the river in cross-section,
// so the car under water is visible through the glass-like water block.
const CUT = 7, LEN = 300, cx = CUT - LEN / 2;
const bank = M('#5fa043'), soil = M('#8a6a48'), soil2 = M('#6e5236');
mesh(new THREE.BoxGeometry(LEN, 2, 160), bank, S, cx, -1, -94);           // far bank
mesh(new THREE.BoxGeometry(LEN, 2, 160), bank, S, cx, -1, 94);            // near bank
mesh(new THREE.BoxGeometry(LEN, 16, 160), soil, S, cx, -10, -94);         // far bank body (visible at the cut)
mesh(new THREE.BoxGeometry(LEN, 16, 160), soil, S, cx, -10, 94);          // near bank body
mesh(new THREE.BoxGeometry(LEN, 9, 28), soil2, S, cx, -13.5, 0);          // river bed
const table = mesh(new THREE.BoxGeometry(400, 1, 900), M('#d9cfbf'), S, CUT + 200, -18.5, 0); table.castShadow = false;
const WY = -1.4;
const wat = mesh(new THREE.BoxGeometry(LEN, 7.6, 28), new THREE.MeshStandardMaterial({ color: '#2a7fae', roughness: .15, metalness: .05, transparent: true, opacity: .58, depthWrite: false }), S, cx, WY - 3.8, 0); wat.castShadow = false;
const top = mesh(new THREE.PlaneGeometry(LEN, 28), new THREE.MeshStandardMaterial({ color: '#4aa3c9', roughness: .1, metalness: .1, transparent: true, opacity: .55, depthWrite: false }), S, cx, WY, 0); top.rotation.x = -Math.PI / 2; top.castShadow = false;
road(S, CUT - 150, 24, -300, 24, 8); road(S, CUT - 150, -24, -300, -24, 8);
road(S, CUT, 24, CUT - 150, 24, 8); road(S, CUT, -24, CUT - 150, -24, 8);
rbox(S, 9, 1.4, 70, '#c8c3b8', -24, 4.2, 0);
for (const z of [-11, 11]) for (const x of [-27, -21]) rbox(S, 1.6, 18, 1.6, '#b5b0a5', x, -12.5, z);
for (let z = -33; z <= 33; z += 2.2) { if (z > -4 && z < 4) continue; rbox(S, .25, 1.1, .25, '#e9e6df', -19.7, 5.6, z); rbox(S, .25, 1.1, .25, '#e9e6df', -28.3, 5.6, z); }
for (const [x, z] of [[-60, -46], [-48, -52], [-30, 48], [-44, 44], [-70, -48], [-80, 46], [-10, -50]]) tree(S, x, z, 1.3);
[[0, 17.4, '#2f5fb3'], [1.6, 17.8, '#e07bb0'], [3.2, 17.4, '#3f8f5a'], [-40, 17.6, '#f08a2c']].forEach(([x, z, c]) => person(S, x, z, c, { ry: Math.PI }));
car(S, '#f4f4f0', -60, 24, Math.PI / 2); car(S, '#2f5fb3', -90, -24, -Math.PI / 2);

// the hero's car: cut-away (no roof) so you can see inside
const HC = grp(S, 0, 0, 0);
rbox(HC, 2.2, .9, 4.6, '#d83a2e', 0, 0, 0, 0, .25);                    // tub
for (const sx of [-1, 1]) rbox(HC, .14, .9, 2.4, '#c23026', sx * 1.04, .9, -.2);   // door tops
rbox(HC, 2.2, .7, .14, '#c23026', 0, .9, 1.0); rbox(HC, 2.2, .7, .14, '#c23026', 0, .9, -1.4);
const glassM = new THREE.MeshStandardMaterial({ color: '#bfe2f0', transparent: true, opacity: .35, roughness: .05, depthWrite: false });
const win = mesh(new THREE.BoxGeometry(.06, .7, 2.2), glassM, HC, 1.08, 2.15, -.2); win.castShadow = false;   // the right window (facing camera side)
for (const [wx, wz] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) { const w = mesh(new THREE.CylinderGeometry(.4, .4, .3, 14), M('#1d1d22'), HC, wx, .35, wz); w.rotation.z = Math.PI / 2; }
rbox(HC, 1.9, .6, .7, '#3a3d45', 0, .5, -.9);                           // seat
const hero = person(HC, 0, -.6, '#ffcf2e', { s: .95, y: .5 }); hero.rotation.y = 0;
const flood = mesh(new THREE.BoxGeometry(2.0, 1, 4.3), new THREE.MeshStandardMaterial({ color: '#2f86b0', transparent: true, opacity: .45, depthWrite: false }), HC, 0, 0, 0); flood.castShadow = false;
const door = grp(HC, 1.08, .45, .9); rbox(door, .14, .9, 2.2, '#c23026', 0, 0, -1.1);   // hinged front door (right side)
const hammer = grp(HC, .6, 1.6, 0); rbox(hammer, .12, .5, .12, '#2a2a2e', 0, 0, 0); rbox(hammer, .2, .2, .4, '#e8463c', 0, .5, 0);
const crack = mesh(new THREE.RingGeometry(.05, .45, 6, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), HC, 1.12, 2.2, -.4); crack.rotation.y = Math.PI / 2;
// big, slow rings on the water (no small splashes)
const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.35, 64), new THREE.MeshBasicMaterial({ color: '#e3f4fa', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; S.add(m); return m; });

const V3 = THREE.Vector3;
function setCar(x, y, z, rx = 0, rz = 0, ry = 0) { HC.position.set(x, y, z); HC.rotation.set(rx, ry, rz); }
function water(level, a = .45) { flood.visible = level > .01; flood.scale.y = Math.max(.01, level * 2.4); flood.position.y = .25 + level * 1.2; flood.material.opacity = a; }
function ring(x, z, k, i = 0) { rings.forEach((m, j) => { const u = clamp(k * 1.2 - j * .25); m.position.set(x, WY + .02, z); m.scale.setScalar(1 + u * 5); m.material.opacity = (1 - u) * .55 * (u > 0 ? 1 : 0); }); }
function render(s, lt, k, t) {
  const sc = s.scene; rings.forEach(m => m.material.opacity = 0); water(0); hammer.visible = false; crack.material.opacity = 0; door.rotation.y = 0; win.visible = true;
  posePerson(hero, {}); hero.position.set(0, .5, -.6); hero.rotation.set(0, 0, 0);
  if (sc === 'bridge') { const u = eio(clamp(k * 1.15)); const x = lerp(-24, 2, u), y = lerp(5.6, WY - .2, u * u), rx = lerp(0, .7, sm(.2, 1, u)); setCar(x, y, lerp(-6, 4, u), -rx * .3, rx, Math.PI / 2 * .2);
    if (u >= .98) ring(2, 4, (k - .85) * 5);
    return shoot(S, new V3(60, 36, 70), new V3(-10, 0, 2), { subject: HC.position, fov: 30, aper: 14 }); }
  if (sc === 'float') { setCar(2, WY - .45 + Math.sin(lt * 2) * .05, 4, .03, .02); ring(2, 4, (lt % 3) / 3);
    return shoot(S, new V3(30, 14, 22), new V3(2, -.6, 4), { subject: new V3(2, .5, 4), fov: 26, aper: 7 }); }
  if (sc === 'waist') { setCar(2, WY - 1.0 - k * .3, 4, .06, .02); water(.35 + k * .25); posePerson(hero, { armsUp: .25 }); door.rotation.y = -Math.sin(lt * 3) * .06;
    return shoot(S, new V3(24, 8, 16), new V3(2, -1.2, 4), { subject: new V3(2, -.6, 4), fov: 26, aper: 6 }); }
  if (sc === 'sink') { const y = lerp(WY - 1.5, -6.5, eio(k)); setCar(2, y, 4, .12, .02); water(.6);
    return shoot(S, new V3(34, -2, 10), new V3(2, -5, 4), { subject: new V3(2, y + 1.4, 4), fov: 28, aper: 6 }); }
  if (sc === 'glass' || sc === 'hammer' || sc === 'flood') { setCar(2, -6.5, 4, .12, .02);
    if (sc === 'glass') { water(.65); posePerson(hero, { armsUp: .4 + Math.abs(Math.sin(lt * 5)) * .3 }); hero.rotation.y = -.6; }
    if (sc === 'hammer') { water(.7); hammer.visible = true; const hit = sm(.35, .45, k); hammer.position.set(lerp(.4, .95, hit), 2.0, -.3); hammer.rotation.z = -hit * .8; crack.material.opacity = sm(.42, .5, k) * .9; crack.scale.setScalar(.6 + sm(.45, .7, k) * .6); if (k > .72) win.visible = false; }
    if (sc === 'flood') { water(lerp(.7, 1.1, sm(0, .55, k))); door.rotation.y = -sm(.6, .85, k) * 1.1; if (k > .85) { hero.position.x = lerp(0, 1.6, sm(.85, 1, k)); } }
    return shoot(S, new V3(28, -3, 9), new V3(2, -5.4, 4), { subject: new V3(2, -5, 4), fov: 26, aper: 6 }); }
  if (sc === 'surface') { setCar(2, -6.5, 4, .12, .02); water(1.1); door.rotation.y = -1.1; HC.remove(hero); S.add(hero); const u = eio(clamp(k * 1.2)); hero.position.set(lerp(3.8, 5, u), lerp(-5.5, WY - 2.0, u), 6); posePerson(hero, { armsUp: 1 - u * .5 }); if (u > .95) ring(5, 6, (k - .8) * 5);
    const r = shoot(S, new V3(34, 2, 14), new V3(4, -3, 4), { subject: hero.position, fov: 28, aper: 7 }); S.remove(hero); HC.add(hero); return r; }
  // end: the whole diorama, bank crowd, slow pull-back
  setCar(2, -6.5, 4, .12, .02); water(1.1); const u = eio(clamp(lt / s.dur));
  return shoot(S, new V3(lerp(80, 120, u), lerp(40, 70, u), lerp(60, 100, u)), new V3(-6, -2, 4), { subject: new V3(2, -2, 4), fov: 30, aper: 14 });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'press') return card(330, `<div class="t">${L('вода давит на стекло', 'water pressing the window')}</div><div class="v" style="color:#ff4b5c">${EN ? '350 <small>lb</small>' : '~160 <small>кг</small>'}</div><div class="n">${L('уже на глубине ~60 см', 'at just ~2 ft deep')}</div>`, a);
  if (s.card === 'hammer') return card(330, `<div class="t">${L('что разбило стекло', 'what broke the glass')}</div><div class="v" style="font-size:60px">${L('молоток ✓', 'hammer ✓')}</div><div class="n">${L('ключи, телефон, ботинок — нет', 'keys, phone, boot — no')}</div>`, a);
  return '';
}
start({ render, cards, mins: { bridge: 5, surface: 6, end: 3.5 }, bubbles: ['#2f86b0', '#ffcf2e', '#e8463c'] });
