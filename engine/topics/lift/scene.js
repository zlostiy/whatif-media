// «Что если оборвался лифт — подпрыгнуть в последний момент?» (по мотивам «Разрушителей легенд» + Бетти Лу Оливер, 1945)
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, rnd, T, B, add, G, Box, Sph, Cap, Cyl, canvasTex, makeSky, makeHuman, face, pose, P, STAND, setCam, draw, setShake, card } from '../../core.js';
import { makeEmpire, makeCity, lightWindows, makeHero, winMats } from '../_city.js';
const blink = t => (t % 3.2) < .1;

// ---------------- elevator car interior ----------------
const cab = new THREE.Scene(); cab.background = new THREE.Color(0x101018);
const chemi = new THREE.HemisphereLight(0xfff4e0, 0x404050, 1.2); cab.add(chemi); const ctop = new THREE.PointLight(0xfff0d0, 3, 5, 1.4); ctop.position.set(0, 2.3, 0); cab.add(ctop);
add(cab, Box(2.2, 2.5, 2.2), T(0xb8a890, { side: THREE.BackSide }), [0, 1.25, 0], [0, 0, 0], null, 0);
for (const x of [-1.09, 1.09]) for (let i = 0; i < 3; i++) add(cab, Box(.02, 2.0, .6), T(0xa8987e), [x, 1.2, -.7 + i * .7], [0, 0, 0], null, .004);
add(cab, Box(2.1, .05, .05), T(0xc9cdd8), [0, .95, -1.06], [0, 0, 0], null, .004);
add(cab, Box(1.2, .05, .2), B(0xfff6e0), [0, 2.48, 0], [0, 0, 0], null, 0);
const doors = G(cab, [0, 0, 1.08]); for (const x of [-.5, .5]) add(doors, Box(.98, 2.2, .04), T(0xc9cdd8), [x, 1.1, 0], [0, 0, 0], null, .006);
const dispTex = canvasTex(256, 128, (c, w, h, n = 80) => { c.fillStyle = '#120808'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4030'; c.font = '900 92px R, RL, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.max(0, Math.round(n))), w / 2, h / 2 + 4); });
const disp = add(cab, new THREE.PlaneGeometry(.5, .25), new THREE.MeshBasicMaterial({ map: dispTex }), [0, 2.25, 1.05], [0, Math.PI, 0], null, 0);
const panel = G(cab, [.85, 1.25, 1.05]); add(panel, Box(.3, .7, .03), T(0xc9cdd8), [0, 0, 0], [0, 0, 0], null, .004); for (let i = 0; i < 10; i++) add(panel, Cyl(.03, .03, .02, 12), T(0xfff0c0, { emissive: 0xffc040, emissiveIntensity: .2 }), [(i % 2) * .12 - .06, .28 - Math.floor(i / 2) * .12, -.02], [Math.PI / 2, 0, 0], null, 0);
const hero = makeHero(); cab.add(hero.root);

// ---------------- shaft cut-away ----------------
const sh = new THREE.Scene(); sh.background = new THREE.Color(0x0c0c14); const shemi = new THREE.HemisphereLight(0xd0d8ff, 0x404050, 1.6); sh.add(shemi); { const d = new THREE.DirectionalLight(0xffffff, .9); d.position.set(5, 10, 8); sh.add(d); }
const FLOORS = 80, FH = 4; const shaftH = FLOORS * FH;
add(sh, Box(.3, shaftH, 4), T(0x5a5a6a), [-2.2, shaftH / 2, 0], [0, 0, 0], null, 0); add(sh, Box(4.4, shaftH, .3), T(0x4a4a5a), [0, shaftH / 2, -2.1], [0, 0, 0], null, 0); add(sh, Box(.3, shaftH, 4), T(0x5a5a6a), [2.2, shaftH / 2, 0], [0, 0, 0], null, 0);
for (const x of [-1.6, 1.6]) add(sh, Box(.14, shaftH, .2), T(0x9aa0b0), [x, shaftH / 2, -.2], [0, 0, 0], null, 0);
const floorTex = n => canvasTex(128, 64, c => { c.fillStyle = '#2a2a3a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ffd23f'; c.font = '900 48px R, RL, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 64, 34); });
for (let f = 0; f <= FLOORS; f += 5) { add(sh, Box(4.4, .25, .4), T(0x6a6a7a), [0, f * FH, 1.8], [0, 0, 0], null, 0); add(sh, new THREE.PlaneGeometry(.9, .45), new THREE.MeshBasicMaterial({ map: floorTex(f) }), [-1.6, f * FH + 1.2, -1.94], [0, 0, 0], null, 0); }
const car = G(sh); add(car, Box(2.6, 2.6, 2.6), T(0xb8a890), [0, 1.3, 0], [0, 0, 0], null, .03); add(car, Box(2.8, .2, 2.8), T(0x4a4a5a), [0, 2.7, 0], [0, 0, 0], null, .02); add(car, Box(2.8, .2, 2.8), T(0x4a4a5a), [0, -.1, 0], [0, 0, 0], null, .02);
const wedges = []; for (const s of [-1, 1]) { const w = add(car, Box(.3, .5, .4), T(0xd04030), [s * 1.95, .2, -.2], [0, 0, 0], null, .01); wedges.push(w); }
const cable = add(sh, Cyl(.05, .05, 1, 6), T(0x2b2b2b), [0, 0, 0], [0, 0, 0], null, 0);
const coil = G(sh); for (let i = 0; i < 12; i++) add(coil, new THREE.TorusGeometry(.9 - (i % 3) * .1, .07, 6, 20), T(0x3a3a3a), [(i % 2) * .2 - .1, .1 + i * .13, (i % 3) * .1], [Math.PI / 2, 0, i], null, .006); coil.visible = false;
const betty = makeHuman({ top: 0x2a3a6a, pants: 0x2a3a6a, hair: 0x6a3a22, hairStyle: 'long', skin: 0xf6cfb2, dress: true, cap: 0x2a3a6a }); car.add(betty.root); betty.root.position.set(.5, .35, 1.25); betty.root.visible = false;

// ---------------- New York, 1945 ----------------
const ny = new THREE.Scene(); const nsky = makeSky(0x5a6a8a, 0xe8c8a0, 1600); ny.add(nsky); ny.fog = new THREE.Fog(0xc8c0b0, 80, 700);
const nhemi = new THREE.HemisphereLight(0xfff0e0, 0x4a4a5a, 1.3); ny.add(nhemi); const nsun = new THREE.DirectionalLight(0xffe0c0, 1.6); nsun.position.set(-120, 80, 60); ny.add(nsun);
add(ny, new THREE.PlaneGeometry(4000, 4000), T(0x5a5e68), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
const ewm = winMats(3); const empire = makeEmpire(ewm); ny.add(empire);
const NC = makeCity(ny, { n: 110, r: 320, keep: 26, hmax: 45 });
const plane = G(ny); add(plane, Cap(.7, 6, 12), T(0x6a7a5a), [0, 0, 0], [0, 0, Math.PI / 2], null, .03); add(plane, Box(1.4, .12, 14), T(0x6a7a5a), [0, 0, 0], [0, 0, 0], null, .02); add(plane, Box(.9, 1.6, .1), T(0x6a7a5a), [-3.4, .8, 0], [0, 0, 0], null, .02); add(plane, Box(.9, .1, 4), T(0x6a7a5a), [-3.4, .2, 0], [0, 0, 0], null, .02);
for (const z of [-2.6, 2.6]) add(plane, Cyl(.45, .4, 1.6, 12), T(0x4a5a3a), [.6, -.1, z], [0, 0, Math.PI / 2], null, .015);
plane.scale.setScalar(4);
const smoke = []; for (let i = 0; i < 7; i++) smoke.push(add(ny, new THREE.IcosahedronGeometry(1, 1), T(0x6a6460, { transparent: true, opacity: 0, depthWrite: false }), [0, -50, 0], [i, i * 2, 0], null, 0));

// =====================================================================
function cabRender(s, lt, k, t) {
  const sc2 = s.scene; let cp = V(.6, 1.55, .85), ct = V(-.1, 1.25, -.3), f = { mouth: 'line', blink: blink(t) }, ps = P(STAND), y = 0, fopt = { keep: true, fov: 60 };
  hero.root.rotation.set(0, .5, 0); ctop.intensity = 3; chemi.intensity = 1.2;
  if (sc2 === 'snap') { dispTex.redraw(80 - k * 6); setShake(.03 * sm(.15, .3, k)); f = { mouth: 'open', open: .8 * sm(.15, .3, k), eyeS: 1 + .3 * sm(.15, .3, k), brow: .4 }; ps = P(STAND, { lSh: [-.4, 0, .9], rSh: [-.4, 0, -.9] }); y = .06 * sm(.15, .3, k); }
  else if (sc2 === 'idea') { dispTex.redraw(74 - k * 14); setShake(.02); ps = P(STAND, { lSh: [0, 0, 1.2], rSh: [0, 0, -1.2], lEl: [-.2], rEl: [-.2] }); f = { mouth: 'line', brow: .3, look: [0, .8] }; cp = V(.6, 1.55, .7); ct = V(0, 1.45, -.6); }
  else if (sc2 === 'jump') { dispTex.redraw(20 - k * 12); setShake(.02); const j = Math.max(0, Math.sin(clamp((k - .3) / .4) * Math.PI)); y = j * .45; ps = P(STAND, { lHip: [-.5 * j], rHip: [-.5 * j], lKn: [.9 * j], rKn: [.9 * j], lSh: [-2.6 * j, 0, .3], rSh: [-2.6 * j, 0, -.3] }); f = { mouth: 'open', open: .6, eyeS: 1.2 }; }
  else if (sc2 === 'blind') { dispTex.redraw(12 - k * 9); setShake(.025); ctop.intensity = 1.2; chemi.intensity = .5; f = { mouth: 'open', open: .4, look: [Math.sin(t * 2), -.3], brow: .4 }; ps = P(STAND, { head: [0, Math.sin(t * 2) * .4, 0], lKn: [.4], rKn: [.4], lHip: [-.3], rHip: [-.3] }); y = -.05; }
  else if (sc2 === 'floor') { dispTex.redraw(3); hero.root.rotation.set(-Math.PI / 2, 0, 0); hero.root.position.set(0, .2, -.15); ps = P(STAND, { lSh: [0, 0, 1.4], rSh: [0, 0, -1.4], lEl: [0], rEl: [0], lHip: [0, 0, .25], rHip: [0, 0, -.25] }); f = { mouth: 'line', eye: .6, brow: .2 }; cp = V(0, 2.25, .9); ct = V(0, .2, -.2); fopt.fov = 66; pose(hero, ps); face(hero, f); setCam(cp, ct, t, fopt); draw(cab); return; }
  if (sc2 === 'idea') hero.root.position.set(0, y, -.75); else hero.root.position.set(-.1, y, -.3);
  pose(hero, ps); face(hero, f); setCam(cp, ct, t, fopt); draw(cab);
}
function shaftRender(s, lt, k, t) {
  const sc2 = s.scene; let cy, cp, ct; coil.visible = false; betty.root.visible = false; wedges.forEach((w, i) => w.position.x = (i ? 1 : -1) * 1.95);
  if (sc2 === 'fall') { const fl = lerp(60, 8, k * k); cy = fl * FH; setShake(.04); }
  else if (sc2 === 'brakes') { const stop = sm(.3, .6, k); cy = 30 * FH - (1 - stop) * 6 * (1 - k); wedges.forEach((w, i) => w.position.x = (i ? 1 : -1) * lerp(1.95, 1.55, stop)); setShake(stop < 1 ? .02 : 0); }
  else if (sc2 === 'betty') { betty.root.visible = true; coil.visible = true; cy = lerp(30, .9, eio(sm(0, .8, k))) * (k < .8 ? 1 : 1); if (k > .8) cy = .9 + Math.sin((k - .8) * 30) * .15 * (1 - k) * 5; pose(betty, P(STAND, { lSh: [-.4, 0, .8], rSh: [-.4, 0, -.8] })); face(betty, { mouth: 'open', open: .6, eyeS: 1.2 }); }
  car.position.set(0, cy, 0); cable.scale.y = shaftH - cy - 3; cable.position.set(0, cy + 2.8 + (shaftH - cy - 3) / 2, 0); if (sc2 === 'fall' || sc2 === 'betty') { cable.scale.y = 18; cable.position.y = cy + 2.8 + 9; }
  if (sc2 === 'brakes') { cp = V(1.6, cy + 1.2, 3.4); ct = V(1.7, cy + .3, -.2); } else if (sc2 === 'betty') { cp = V(1.2, cy + 2.4, 7.5); ct = V(0, cy + 1.1, 0); } else { cp = V(1.2, cy + 2.4, 8.5); ct = V(0, cy + 1.3, 0); }
  setCam(cp, ct, t, { keep: true, fov: 50 }); draw(sh);
}
function nyRender(s, lt, k, t) {
  const sc2 = s.scene; let cp, ct; plane.visible = false; smoke.forEach(m => m.material.opacity = 0); lightWindows(NC.wm, .0); lightWindows(ewm, 0);
  const top = empire.userData.top;
  if (sc2 === 'bomber') { nsky.set(0x8a8a90, 0xc8c4bc); ny.fog.near = 30; ny.fog.far = 360; plane.visible = true; const a = clamp(k * 1.05); plane.position.set(lerp(-260, -40, a), 75, lerp(140, 30, a)); plane.rotation.y = -.5; cp = V(-40, 82, 170); ct = plane.position.clone().lerp(V(0, 70, 0), .35);
    if (k > .82) smoke.forEach((m, i) => { const e = (k - .82) * 6; m.position.set(-8 + i * 2, 72 + i * 3 + e * 4, 6 + i); m.scale.setScalar(4 + e * 6 + i); m.material.opacity = .7 * clamp(e); }); }
  else { nsky.set(0x4a5a8a, 0xffb07a); ny.fog.near = 120; ny.fog.far = 900; lightWindows(NC.wm, .5); lightWindows(ewm, .6); const u = eio(clamp(lt / s.dur)); cp = V(lerp(40, 160, u), lerp(10, top + 40, u), lerp(60, 220, u)); ct = V(0, lerp(20, top * .8, u), 0); if (sc2 === 'end') { cp = V(160, top + 40, 220); ct = V(0, top * .8, 0); } }
  setCam(cp, ct, t, { fov: 50 }); draw(ny);
}
let texOK = false;
function render(s, lt, k, t) { if (!texOK) { dispTex.redraw(80); texOK = true; } const sc2 = s.scene; if (['snap', 'idea', 'jump', 'blind', 'floor'].includes(sc2)) cabRender(s, lt, k, t); else if (['fall', 'brakes', 'betty'].includes(sc2)) shaftRender(s, lt, k, t); else nyRender(s, lt, k, t); }
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'speed') { const v = lerp(0, EN ? 170 : 280, eio(clamp(k * 1.1))); return card(330, `<div class="t">${L('скорость', 'speed')}</div><div class="v" style="color:#ff4b5c">${Math.round(v)} <small>${L('км/ч', 'mph')}</small></div><div class="n">${L('8 секунд до подвала', '8 seconds to the basement')}</div>`, a); }
  if (s.card === 'jump') return card(330, `<div class="t">${L('прыжок против падения', 'jump vs. fall')}</div><div class="v"><span style="color:#5cd06a">${EN ? 6 : 10}</span> <small>vs</small> <span style="color:#ff4b5c">${EN ? 170 : 280}</span></div><div class="n">${L('км/ч', 'mph')}</div>`, a);
  if (s.card === 'betty') return card(330, `<div class="t">${L('падение', 'the fall')}</div><div class="v">${EN ? '~1,000 <small>ft</small>' : '~300 <small>м</small>'}</div><div class="n">${L('75 этажей · рекорд Гиннесса', '75 floors · Guinness record')}</div>`, a);
  return '';
}
start({ render, cards, mins: { bomber: 6, end: 3.5 }, bubbles: ['#2a2420', '#8a6a4a', '#ffd23f'] });
