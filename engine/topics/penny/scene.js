// «Что если уронить монетку с небоскрёба?» (по мотивам «Разрушителей легенд», «Penny Drop», 2003)
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, rnd, T, B, add, G, Box, Sph, Cap, Cyl, canvasTex, makeSky, makeHuman, face, pose, P, STAND, walkPose, setCam, draw, setShake, card } from '../../core.js';
import { makeEmpire, makeCity, lightWindows, makeHero, winMats, makeWoman } from '../_city.js';
const blink = t => (t % 3.2) < .1;

// ---------------- New York (today) ----------------
const ny = new THREE.Scene(); const sky = makeSky(0x5a8ae0, 0xffe0b8, 1600); ny.add(sky); ny.fog = new THREE.Fog(0xd8d0c8, 120, 900);
const hemi = new THREE.HemisphereLight(0xfff4e8, 0x5a5a6a, 1.4); ny.add(hemi); const sun = new THREE.DirectionalLight(0xffe8c8, 1.6); sun.position.set(-100, 120, 80); ny.add(sun);
add(ny, new THREE.PlaneGeometry(4000, 4000), T(0x5a5e68), [0, 0, 0], [-Math.PI / 2, 0, 0], null, 0);
const ewm = winMats(3); const empire = makeEmpire(ewm); ny.add(empire); const TOP = empire.userData.roofs[3]; // observation level roof
const NC0 = 0; const NC = makeCity(ny, { n: 110, r: 320, keep: 26, hmax: 45 });
for (let i = 0; i < 10; i++) { const w = makeWoman(i); w.root.position.set(-14 + i * 3, 0, 14 + (i % 3) * 2); w.root.rotation.y = i % 2 ? 0 : Math.PI; ny.add(w.root); }
// observation deck railing + hero on it
const deck = G(ny, [0, TOP, 0]); for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; add(deck, Box(.1, 1.2, .1), T(0xe8e8f0), [Math.cos(a) * 4.2, .6, Math.sin(a) * 4.2], [0, 0, 0], null, .004); }
add(deck, new THREE.TorusGeometry(4.2, .06, 6, 48), T(0xe8e8f0), [0, 1.2, 0], [Math.PI / 2, 0, 0], null, .004);
const hero = makeHero({ top: 0x4a6aa0 }); hero.root.position.set(0, TOP, 3.4); ny.add(hero.root);
const coin = G(ny); add(coin, Cyl(.25, .25, .04, 24), T(0xd88a3a, { emissive: 0xa0501a, emissiveIntensity: .6 }), [0, 0, 0], [0, 0, 0], null, .006); coin.scale.setScalar(.9);
// updraft ribbons: big smooth translucent arrows along the facade (no particles)
const drafts = []; for (let i = 0; i < 5; i++) { const g = new THREE.PlaneGeometry(1.4, 26, 1, 20); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.position.set(-6 + i * 3, TOP - 18, 9.6); m.userData.base = g.attributes.position.array.slice(); ny.add(m); drafts.push(m); }
const setbackRoof = V(3, empire.userData.roofs[1] + .1, 7.5);

// ---------------- workshop ----------------
const shop = new THREE.Scene(); shop.background = new THREE.Color(0x1a1a22); const shemi = new THREE.HemisphereLight(0xfff0e0, 0x404050, 1.3); shop.add(shemi); { const d = new THREE.DirectionalLight(0xffffff, .9); d.position.set(3, 6, 4); shop.add(d); }
add(shop, Box(14, 5, 10), T(0x6a6a78, { side: THREE.BackSide }), [0, 2.5, 0], [0, 0, 0], null, 0);
add(shop, Box(3, .9, 1.2), T(0x8a6a4a), [1.5, .45, -1], [0, 0, 0], null, .015);
const slab = add(shop, Box(.8, .8, .2), T(0xa8a8a0), [.6, 1.3, -1], [0, 0, 0], null, .01); const slab2 = add(shop, Box(.8, .8, .2), T(0x3a3a40), [1.6, 1.3, -1], [0, 0, 0], null, .01);
const gel = G(shop, [2.6, .9, -1]); add(gel, Sph(.32, 20, 16), T(0xf0d070, { transparent: true, opacity: .75 }), [0, .4, 0], [0, 0, 0], [1, 1.2, 1], .01); add(gel, Sph(.2, 16, 12), T(0xf4f0e8), [0, .45, 0], [0, 0, 0], [1, 1.15, 1], 0); add(gel, Cyl(.12, .14, .3, 12), T(0xf0d070, { transparent: true, opacity: .75 }), [0, .05, 0], [0, 0, 0], null, .006);
const launcher = G(shop, [-2.8, 0, -1]); add(launcher, Cyl(.08, .08, 1.4, 12), T(0x3a3a44), [0, 1.3, 0], [0, 0, Math.PI / 2], null, .008); add(launcher, Box(.4, 1.1, .4), T(0x5a5a6a), [-.3, .55, 0], [0, 0, 0], null, .01);
const flyCoin = G(shop); add(flyCoin, Cyl(.1, .1, .02, 20), T(0xc87a3a), [0, 0, 0], [0, 0, Math.PI / 2], null, .004);
const phys = makeHuman({ top: 0xf3f5fa, pants: 0x3a3a4a, hair: 0x8a8a8a, glasses: true, skin: 0xf0c2a0, hairStyle: 'bald' }); shop.add(phys.root);

// =====================================================================
function nyRender(s, lt, k, t) {
  const sc2 = s.scene; let cp, ct, fopt = { fov: 46 }; coin.visible = true; drafts.forEach(d => d.material.opacity = 0); hero.root.visible = true; lightWindows(NC.wm, 0); lightWindows(ewm, 0);
  sky.set(0x5a8ae0, 0xffe0b8);
  if (sc2 === 'roof') { pose(hero, P(STAND, { rSh: [-1.6, 0, -.2], rEl: [-.4], head: [.35, 0, 0] })); face(hero, { mouth: 'smile', look: [0, -.6], blink: blink(t) }); hero.root.updateMatrixWorld(true); hero.rightHand = hero.rEl.localToWorld(V(0, -.2, .05));
    coin.position.copy(hero.rightHand).add(V(0, .03, 0)); coin.rotation.set(0, t, 0); const u = eio(k); cp = V(lerp(1.0, 1.4, u), TOP + lerp(1.7, 2.0, u), lerp(4.6, 5.6, u)); ct = V(0, TOP + 1.1, 3.2); fopt.fov = 50; }
  else if (sc2 === 'drop') { pose(hero, P(STAND, { rSh: [-1.6, 0, -.2], rEl: [-.4], head: [.6, 0, 0] })); face(hero, { mouth: 'open', open: .3, look: [0, -1] }); hero.root.updateMatrixWorld(true); const h0 = hero.rEl.localToWorld(V(0, -.2, .05)); const d = sm(.55, 1, k);
    coin.position.copy(h0).add(V(0, -d * d * 8, d * 1.2)); coin.rotation.set(t * 8, t * 5, 0); cp = V(.8, TOP + 3.2, 6.5); ct = V(0, TOP - 4, 4.5); fopt.fov = 60; }
  else if (sc2 === 'terminal') { const y = TOP - 10 - lt * 9; coin.position.set(0, y, 7.8); coin.rotation.set(t * 9, t * 6, t * 3); coin.scale.setScalar(1.4); cp = V(.9, y + .5, 9.0); ct = V(0, y - .1, 7.8); fopt.fov = 50; hero.root.visible = false; }
  else if (sc2 === 'wind') { drafts.forEach((d, i) => { d.material.opacity = .22; const p = d.geometry.attributes.position, b = d.userData.base; for (let q = 0; q < p.count; q++) p.setX(q, b[q * 3] + Math.sin(b[q * 3 + 1] * .3 - t * 4 + i) * .4); p.needsUpdate = true; });
    const land = sm(.45, .9, k); const y0 = TOP - 26; coin.position.set(lerp(0, setbackRoof.x, land), lerp(y0 + Math.sin(t * 2) * 2 + k * 4, setbackRoof.y + .05, land), lerp(9, setbackRoof.z, land)); coin.rotation.set(land > .99 ? Math.PI / 2 : t * 6, t * 3, 0);
    coin.scale.setScalar(2.2); cp = coin.position.clone().add(V(5, 3, 12)); ct = coin.position.clone().lerp(V(1, y0 - 2, 8), .3); hero.root.visible = false; }
  else { // skyline wow / end
    sky.set(0x4a5a9a, 0xffa070); lightWindows(NC.wm, .6); lightWindows(ewm, .7); coin.visible = false; const u = eio(clamp(lt / s.dur)); const top = empire.userData.top;
    cp = V(lerp(20, 150, u), lerp(TOP + 4, top + 50, u), lerp(30, 220, u)); ct = V(0, lerp(TOP, top * .7, u), 0); if (sc2 === 'end') { cp = V(150, top + 50, 220); ct = V(0, top * .7, 0); } fopt.fov = 50; }
  setCam(cp, ct, t, fopt); draw(ny);
}
function shopRender(s, lt, k, t) {
  const sc2 = s.scene; let cp, ct; phys.root.visible = sc2 === 'busted'; flyCoin.visible = true;
  if (sc2 === 'shop') { const shot = (lt * .9) % 1; const tgt = [slab, slab2, gel][Math.floor(lt * .9) % 3]; const tp = tgt.getWorldPosition(V(0, 0, 0)); const p0 = V(-2.1, 1.3, -1); const a = clamp(shot / .35);
    flyCoin.position.copy(p0.clone().lerp(tp.clone().add(V(0, .1, .12)), a)); if (a >= 1) flyCoin.position.add(V(0, -(shot - .35) * 1.5, .3 * (shot - .35))); setShake(shot < .05 ? .01 : 0); cp = V(.4, 2.2, 3.6); ct = V(.4, 1.1, -1); }
  else { phys.root.position.set(.6, 0, .6); phys.root.rotation.y = -.4; const hit = sm(.25, .35, k); const bounce = sm(.35, .7, k); flyCoin.position.set(lerp(-2.1, .6, hit) + bounce * .8, 1.75 + bounce * .3 - bounce * bounce * 1.2, lerp(-1, .85, hit) + bounce * .6);
    pose(phys, P(STAND, { head: [-.1 * hit * (1 - bounce), 0, 0] })); face(phys, { mouth: bounce > .1 ? 'smile' : 'line', eye: hit > 0 && bounce < .2 ? .2 : 1, blink: blink(t) }); cp = V(-.4, 1.8, 3.0); ct = V(.5, 1.5, .6); }
  setCam(cp, ct, t, { keep: true, fov: 52 }); draw(shop);
}
function render(s, lt, k, t) { if (s.scene === 'shop' || s.scene === 'busted') shopRender(s, lt, k, t); else nyRender(s, lt, k, t); }
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'speed') { const v = Math.min(EN ? 65 : 105, lerp(0, EN ? 65 : 105, eio(clamp(k * 1.6)))); return card(330, `<div class="t">${L('скорость монетки', 'penny speed')}</div><div class="v">${Math.round(v)} <small>${L('км/ч', 'mph')}</small></div><div class="n">${L('дальше не разгоняется', "it won't go faster")}</div>`, a); }
  return '';
}
start({ render, cards, mins: { drop: 4, end: 3.5 }, bubbles: ['#2a3a5a', '#c87a3a', '#ffd23f'] });
