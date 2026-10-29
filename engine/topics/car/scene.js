// «Что если твоя машина упала в воду?» (по мотивам «Разрушителей легенд», эп. «Underwater Car»)
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, rnd, T, B, add, G, Box, Sph, Cap, Cyl, canvasTex, makeSky, face, pose, P, SIT, STAND, setCam, draw, setShake, card } from '../../core.js';
import { makeCar, makeTree } from '../_town.js';
import { makeHero } from '../_city.js';
const blink = t => (t % 3.2) < .1;

// ---------------- river + bridge (outside) ----------------
const out = new THREE.Scene(); const osky = makeSky(0x6a8ad8, 0xffd0a0, 1400); out.add(osky); out.fog = new THREE.Fog(0xd8c8b8, 80, 520);
const ohemi = new THREE.HemisphereLight(0xfff4e8, 0x5a6a5a, 1.5); out.add(ohemi); const osun = new THREE.DirectionalLight(0xffe0c0, 1.7); osun.position.set(-60, 50, -40); out.add(osun);
const WL = 0; // water level
for (const sx of [-1, 1]) add(out, new THREE.PlaneGeometry(1500, 3000), T(0x6a8a4a), [sx * 780, -6, 0], [-Math.PI / 2, 0, 0], null, 0);
const riverBed = add(out, new THREE.PlaneGeometry(60, 800), T(0x5a5a4a), [0, -9, 0], [-Math.PI / 2, 0, 0], null, 0);
for (const s of [-1, 1]) add(out, Box(40, 7, 800), T(0x7a9a5a), [s * 50, -2.5, 0], [0, 0, 0], null, 0);
const water = add(out, new THREE.PlaneGeometry(64, 800, 1, 1), T(0x3a8ab0, { transparent: true, opacity: .78, emissive: 0x0a3a5a, emissiveIntensity: .25, side: THREE.DoubleSide, depthWrite: false }), [0, WL, 0], [-Math.PI / 2, 0, 0], null, 0); water.userData.noShadow = true; water.renderOrder = 2;
const bridge = G(out, [0, 0, -20]); add(bridge, Box(90, 1.2, 9), T(0x9a9aa8), [0, 9, 0], [0, 0, 0], null, .05); for (const x of [-18, 18]) add(bridge, Box(3, 18, 4), T(0x8a8a98), [x, 0, 0], [0, 0, 0], null, .04);
for (const s of [-1, 1]) for (let x = -44; x <= 44; x += 2) if (!(s > 0 && Math.abs(x - 2) < 3)) add(bridge, Box(.15, 1, .15), T(0xe8e8f0), [x, 10.1, s * 4.3], [0, 0, 0], null, .005);
for (const s of [-1, 1]) add(bridge, Box(90, .15, .15), T(0xe8e8f0), [s > 0 ? 0 : 0, 10.6, s * 4.3], [0, 0, 0], null, .005);
for (let i = 0; i < 30; i++) { const tr = makeTree(2.5 + rnd(i, 2)); tr.position.set((i % 2 ? 1 : -1) * (40 + rnd(i, 3) * 30), 1, -120 + i * 9); out.add(tr); }
const car = makeCar(0xd84040); car.scale.setScalar(1.8); out.add(car);
const outHero = makeHero(); out.add(outHero.root);
// light shafts under water (large, smooth, slow)
const rays = []; for (let i = 0; i < 6; i++) { const m = add(out, new THREE.ConeGeometry(2.2, 14, 16, 1, true), B(0xbfefff, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [-6 + i * 2.6, -6.5, 6 - i], [0, 0, .25], null, 0); m.userData.noShadow = true; rays.push(m); }

// ---------------- car interior ----------------
const cab = new THREE.Scene(); cab.background = new THREE.Color(0x0a1a24); const chemi = new THREE.HemisphereLight(0xd8f0ff, 0x203040, 1.2); cab.add(chemi); const cdir = new THREE.DirectionalLight(0xbfe8ff, .8); cdir.position.set(0, 4, 2); cab.add(cdir);
add(cab, Box(1.8, 1.3, 2.6), T(0x3a3a44, { side: THREE.BackSide }), [0, .65, 0], [0, 0, 0], null, 0);
add(cab, Box(1.8, .5, .5), T(0x2b2b33), [0, .55, -1.05], [0, 0, 0], null, .01); add(cab, Cyl(.18, .18, .04, 20), T(0x1a1a1a), [-.4, .85, -.75], [1.1, 0, 0], null, .006);
for (const x of [-.42, .42]) { add(cab, Box(.6, .15, .6), T(0x5a3a2a), [x, .32, .1], [0, 0, 0], null, .01); add(cab, Box(.6, .7, .15), T(0x5a3a2a), [x, .7, .45], [-.15, 0, 0], null, .01); }
const outsideColor = new THREE.Color();
const winL = add(cab, new THREE.PlaneGeometry(1.2, .45), new THREE.MeshBasicMaterial({ color: 0x9ad0e8, transparent: true, opacity: .55 }), [-.89, .98, 0], [0, Math.PI / 2, 0], null, 0);
const winF = add(cab, new THREE.PlaneGeometry(1.5, .45), new THREE.MeshBasicMaterial({ color: 0x9ad0e8, transparent: true, opacity: .55 }), [0, 1.0, -1.25], [-.35, 0, 0], null, 0);
const shards = []; for (let i = 0; i < 9; i++) { const m = add(cab, new THREE.TetrahedronGeometry(.12 + rnd(i, 1) * .06), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: .8 }), [-.86, .98, 0], [i, i * 2, 0], null, 0); m.visible = false; shards.push(m); }
const waterIn = add(cab, Box(1.76, 1, 2.56), new THREE.MeshToonMaterial({ color: 0x3a9ac0, transparent: true, opacity: .45, depthWrite: false }), [0, .5, 0], [0, 0, 0], null, 0); waterIn.userData.noShadow = true;
const hammer = G(cab); add(hammer, Cyl(.02, .02, .22, 8), T(0xd04030), [0, 0, 0], [0, 0, 0], null, .004); add(hammer, Box(.12, .04, .04), T(0x2b2b2b), [0, .12, 0], [0, 0, 0], null, .004); hammer.visible = false;
const phoneM = add(cab, Box(.08, .15, .015), T(0x1a1a1a), [0, 0, 0], [0, 0, 0], null, .004); phoneM.visible = false;
const hero = makeHero(); cab.add(hero.root);
const doorL = G(cab, [-.9, 0, 0]); add(doorL, Box(.05, .65, 1.2), T(0xd84040), [0, .4, 0], [0, 0, 0], null, .006);

// =====================================================================
function outRender(s, lt, k, t) {
  const sc2 = s.scene; let cp, ct, under = false, fopt = {}; outHero.root.visible = false; rays.forEach(r => r.material.opacity = 0);
  const C0 = V(2, 10.2, -20);
  if (sc2 === 'bridge') { const a = clamp((k - .2) / .55); car.visible = true;
    if (a <= 0) { car.position.set(lerp(-30, 2, k / .2), 10.25, -20); car.rotation.set(0, 0, 0); }
    else { const tt2 = a * 1.6; car.position.set(2 + a * 4, Math.max(WL - .4, 10.25 + 3 * a - 13.6 * a * a), -20 + a * 12); car.rotation.set(0, Math.PI / 2, -a * .9); }
    setShake(k > .74 && k < .82 ? .05 : 0); cp = V(26, 14, 18); ct = V(0, 4, -12); }
  else if (sc2 === 'float' || sc2 === 'surface' || sc2 === 'end') {
    if (sc2 === 'float') { car.position.set(6, WL - .3 + Math.sin(t * 1.5) * .08, -8); car.rotation.set(Math.sin(t) * .03, Math.PI / 2, .05); cp = V(14, 3.5, 4); ct = V(6, .5, -8); }
    else { car.position.set(6, -8, -8); car.rotation.set(0, Math.PI / 2, .3); const u = eio(clamp(lt / s.dur));
      outHero.root.visible = true; const hy = sc2 === 'end' ? WL - .9 : lerp(-6.5, WL - .9, sm(0, .6, clamp(lt / s.dur))); outHero.root.position.set(4, hy, -2); outHero.root.rotation.set(sc2 === 'end' ? 0 : -.6, -.4, 0);
      pose(outHero, sc2 === 'end' ? P(STAND, { lSh: [-1.2, 0, .9], rSh: [-1.2, 0, -.9] }) : P(STAND, { lSh: [-2.8, 0, .3], rSh: [-2.8, 0, -.3], lHip: [Math.sin(t * 6) * .4], rHip: [-Math.sin(t * 6) * .4] })); face(outHero, { mouth: 'open', open: .5, eye: .8 });
      if (sc2 === 'surface' && lt / s.dur < .55) { under = true; rays.forEach((r, i) => { r.material.opacity = .14; r.rotation.z = .25 + Math.sin(t * .3 + i) * .05; }); cp = V(lerp(9, 7, u), lerp(-7.5, -3, u), lerp(8, 6, u)); ct = V(4, hy + 1.5, -2); }
      else { cp = V(lerp(7, 30, u), lerp(1.2, 14, u), lerp(3, 34, u)); ct = V(lerp(4, 2, u), lerp(0, 3, u), lerp(-2, -16, u)); if (sc2 === 'end') { cp = V(30, 14, 34); ct = V(2, 3, -16); } }
    } }
  else { // sink: underwater view of the sinking car
    under = true; car.position.set(6, lerp(-1.2, -4.5, eio(k)), -8); car.rotation.set(0, Math.PI / 2, .1); rays.forEach((r, i) => r.material.opacity = .12); cp = V(13, -4, 2); ct = V(6, -3.5, -8); }
  if (under) { out.fog.color.set(0x1a5a6a); out.fog.near = 2; out.fog.far = 32; osky.set(0x2a7a8a, 0x1a4a5a); ohemi.color.set(0x9ae0ff); } else { out.fog.color.set(0xd8c8b8); out.fog.near = 80; out.fog.far = 520; osky.set(0x6a8ad8, 0xffd0a0); ohemi.color.set(0xfff4e8); }
  setCam(cp, ct, t, fopt); draw(out);
}
function cabRender(s, lt, k, t) {
  const sc2 = s.scene; let lvl = 0, f = { mouth: 'open', open: .5, eyeS: 1.2, brow: .4, blink: blink(t) }, ps = P(SIT, { lHip: [-1.5, 0, .05], rHip: [-1.5, 0, -.05], lKn: [1.4], rKn: [1.4] }), uw = false;
  hammer.visible = false; phoneM.visible = false; shards.forEach(m => m.visible = false); winL.visible = true; doorL.rotation.y = 0;
  hero.root.position.set(-.42, .38, .15); hero.root.rotation.set(0, Math.PI, 0);
  if (sc2 === 'waist') { lvl = lerp(.25, .75, eio(k)); ps = P(ps, { rSh: [-.2, 0, -1.4], rEl: [-.3] }); doorL.rotation.y = .06 * Math.max(0, Math.sin(t * 6)) * sm(.4, .6, k); }
  else if (sc2 === 'glass') { lvl = .85; uw = true; phoneM.visible = true; const hit = Math.max(0, Math.sin(t * 7)); ps = P(ps, { rSh: [-.3, 0, -1.3 - hit * .3], rEl: [-1.2 + hit * .8] }); hero.root.updateMatrixWorld(true); phoneM.position.set(-.8 + hit * .05, .95, .05); f = { mouth: 'frown', brow: .5, eyeS: 1.1 }; }
  else if (sc2 === 'hammer') { lvl = .85; uw = true; hammer.visible = true; const sw = sm(.3, .45, k); hammer.position.set(lerp(-.55, -.84, sw), .98, .05); hammer.rotation.z = lerp(.8, -.3, sw); ps = P(ps, { rSh: [-.3, 0, -1.1 - sw * .5], rEl: [-1.3 + sw] });
    if (k > .45) { winL.visible = false; shards.forEach((m, i) => { const e = (k - .45) * 2; m.visible = true; m.position.set(-.86 + e * (.2 + rnd(i, 4) * .3), .98 + (rnd(i, 5) - .5) * .4 - e * .3, (rnd(i, 6) - .5) * .9); m.rotation.set(e * 3 + i, i, e * 2); m.material.opacity = .8 * (1 - clamp(e)); }); }
    f = { mouth: k > .45 ? 'open' : 'line', open: .6, eyeS: 1.2 }; }
  else if (sc2 === 'flood') { lvl = lerp(.9, 1.4, sm(0, .5, k)); uw = true; doorL.rotation.y = 1.0 * sm(.6, .85, k); f = { mouth: 'line', eye: .7, brow: .1 }; ps = P(ps, { rSh: [-.3, 0, -1.3], rEl: [-.2] }); }
  waterIn.scale.y = Math.max(.01, lvl); waterIn.position.y = lvl / 2;
  const wc = uw ? 0x1a5a6a : 0x9ad0e8; winL.material.color.set(wc); winF.material.color.set(wc); winL.material.opacity = uw ? .85 : .55; winF.material.opacity = winL.material.opacity; cab.background.set(uw ? 0x0a2a34 : 0x0a1a24); chemi.color.set(uw ? 0x8ad0ff : 0xd8f0ff);
  pose(hero, ps); face(hero, f); setShake(sc2 === 'hammer' && k > .44 && k < .5 ? .02 : 0);
  const cp = sc2 === 'hammer' || sc2 === 'glass' ? V(.3, 1.05, -.8) : V(.45, 1.05, -.9), ct = sc2 === 'hammer' || sc2 === 'glass' ? V(-.75, .95, .05) : V(-.42, .85, .15);
  setCam(cp, ct, t, { keep: true, fov: 64 }); draw(cab);
}
function render(s, lt, k, t) { if (['waist', 'glass', 'hammer', 'flood'].includes(s.scene)) cabRender(s, lt, k, t); else outRender(s, lt, k, t); }
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'press') return card(330, `<div class="t">${L('вода давит на стекло', 'water pressing the window')}</div><div class="v" style="color:#ff4b5c">${EN ? '350 <small>lb</small>' : '~160 <small>кг</small>'}</div><div class="n">${L('уже на глубине ~60 см', 'at just ~2 ft deep')}</div>`, a);
  if (s.card === 'hammer') return card(330, `<div class="t">${L('что разбило стекло', 'what broke the glass')}</div><div class="v" style="font-size:60px">${L('молоток ✓', 'hammer ✓')}</div><div class="n">${L('ключи, телефон, ботинок — нет', 'keys, phone, boot — no')}</div>`, a);
  return '';
}
start({ render, cards, mins: { bridge: 5, surface: 6, end: 3.5 }, bubbles: ['#0a3a4a', '#3a8ab0', '#ffd23f'] });
