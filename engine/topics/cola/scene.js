// "Что если пойдёт дождь из колы"
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, hash, rnd, col, T, B, add, G, Box, Sph, Cap, Cyl, dotTex, canvasTex, points, makeHuman, face, pose, P, SIT, STAND, walkPose, runPose, bob, reach, camera, setCam, draw, setShake, card, paper, fmtN, fmtD } from '../../core.js';
import { makeTown, ZONES, makeBugGeo, makeCar } from '../_town.js';
const W = makeTown({ top: 0xb07850, bot: 0xf0c890, fog: 0xd8a878, ground: 0x8fcf6a });
const Z = ZONES; const dmy = new THREE.Object3D(); const blink = t => (t % 3.3) < .1;
W.rainMat.color.set(0x5a2a10); W.rainMat.opacity = .75;
// puddles
const PN = 120; const pud = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), T(0x4a2410, { emissive: 0x2a1006, emissiveIntensity: .4 }), PN); pud.frustumCulled = false; W.sc.add(pud);
function puddles(c, a) { pud.count = PN; for (let i = 0; i < PN; i++) { const x = c.x + (rnd(i, 1) - .5) * 40, z = c.z + (rnd(i, 2) - .5) * 30; dmy.position.set(x, .09 + (Math.abs(z) < 3.6 ? 0 : .16), z); dmy.rotation.set(-Math.PI / 2, 0, 0); const s = a * (.4 + rnd(i, 3) * 1.4); dmy.scale.set(s * 1.3, s, 1); dmy.updateMatrix(); pud.setMatrixAt(i, dmy.matrix); } pud.instanceMatrix.needsUpdate = true; }
// rain gauge + sugar square
const gauge = G(W.sc, [2, .25, 5]); add(gauge, Cyl(.28, .28, 1.4, 20, 1, true), T(0xdff6ff, { transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }), [0, .7, 0], [0, 0, 0], null, .01);
const gLiquid = add(gauge, Cyl(.26, .26, 1, 20), T(0x5a2a10, { emissive: 0x2a1006, emissiveIntensity: .3 }), [0, .5, 0], [0, 0, 0], null, 0); add(gauge, Cyl(.3, .3, .06, 20), T(0x2b2f45), [0, 0, 0], [0, 0, 0], null, .01);
for (let i = 1; i <= 6; i++) add(gauge, Box(.12, .015, .02), B(0x1a1033), [.24, i * .2, .18], [0, .7, 0], null, 0);
const sq = G(W.sc, [-1.5, .27, 5.2]); for (const [x, z, r] of [[0, -.5, 0], [0, .5, 0], [-.5, 0, 1], [.5, 0, 1]]) add(sq, Box(1.04, .04, .04), B(0xffd23f), [x, 0, z], [0, r * Math.PI / 2, 0], null, 0);
const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, .09, .09), T(0xe6dfd0), 600); cubes.frustumCulled = false; sq.add(cubes);
// wasps
const wasps = new THREE.InstancedMesh(makeBugGeo(), T(0xffc81a), 90); wasps.frustumCulled = false; W.sc.add(wasps);
function updWasps(t, c, n, r = 2.5) { wasps.count = n; for (let i = 0; i < n; i++) { const a = t * (1.5 + rnd(i, 1) * 2) + i, rr = r * (.4 + rnd(i, 2) * .8); dmy.position.set(c.x + Math.cos(a) * rr, c.y + Math.sin(t * 3 + i) * .6 + (rnd(i, 3) - .5) * 1.5, c.z + Math.sin(a * 1.3) * rr); dmy.rotation.set(0, -a, Math.sin(t * 40 + i) * .2); dmy.scale.setScalar(.75); dmy.updateMatrix(); wasps.setMatrixAt(i, dmy.matrix); } wasps.instanceMatrix.needsUpdate = true; }
// goo strand for sticky shoe
const goo = add(W.sc, Cyl(.03, .05, 1, 8), T(0x5a2a10), [0, 0, 0], [0, 0, 0], null, 0); goo.visible = false;
// kitchen
const kit = new THREE.Scene(); kit.background = new THREE.Color(0xf0e8dc); kit.add(new THREE.HemisphereLight(0xffffff, 0xa09080, 1.8)); { const d = new THREE.DirectionalLight(0xffffff, .8); d.position.set(2, 4, 3); kit.add(d); }
add(kit, Box(6, 4, 6), T(0xf6efe4, { side: THREE.BackSide }), [0, 2, 0], [0, 0, 0], null, 0); add(kit, Box(4, .9, 1.4), T(0x7a9ab0), [0, .45, -1.6], [0, 0, 0], null, .02); add(kit, Box(4.1, .08, 1.5), T(0xf3f5fa), [0, .94, -1.6], [0, 0, 0], null, .01);
add(kit, Box(1.2, .1, .8), T(0xc9cdd8), [0, .96, -1.5], [0, 0, 0], null, .01);
const tap = G(kit, [0, .98, -2.05]); add(tap, Cyl(.05, .05, .6, 10), T(0xc9cdd8), [0, .3, 0], [0, 0, 0], null, .01); add(tap, Cyl(.045, .045, .45, 10), T(0xc9cdd8), [0, .6, .2], [Math.PI / 2, 0, 0], null, .01);
const stream = add(kit, Cyl(.03, .04, .5, 10), T(0x7a4a20, { transparent: true, opacity: .85 }), [0, 1.33, -1.6], [0, 0, 0], null, 0);
const glassC = add(kit, Cyl(.14, .12, .34, 16, 1, true), T(0xdff6ff, { transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }), [0, 1.17, -1.6], [0, 0, 0], null, .008);
const glassL = add(kit, Cyl(.13, .115, 1, 16), T(0x7a4a20, { transparent: true, opacity: .9 }), [0, 1.0, -1.6], [0, 0, 0], null, 0);
const cook = makeHuman({ top: 0xff9ab0, pants: 0x2b2f45, hair: 0x5a3420, hairStyle: 'long' }); kit.add(cook.root);
// O2 bubbles in river + water bottle prop
const bottle = G(W.sc); add(bottle, Cyl(.16, .16, .55, 16), T(0xbfe8ff, { transparent: true, opacity: .75, emissive: 0x4a8ab0, emissiveIntensity: .35 }), [0, 0, 0], [0, 0, 0], null, .01); add(bottle, Cyl(.07, .1, .12, 12), T(0xbfe8ff, { transparent: true, opacity: .75 }), [0, .33, 0], [0, 0, 0], null, .008); add(bottle, Cyl(.07, .07, .05, 12), T(0x4f7cff), [0, .41, 0], [0, 0, 0], null, .006); bottle.visible = false;
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xbff0ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(1.6); bottle.add(halo);

function setWet(x) { W.groundM.color.copy(col(0x8fcf6a, 0x7a6a3a, x)); W.roadM.color.copy(col(0x5d6378, 0x4a3020, x)); }
function town(s, lt, k, t) {
  const sc = s.scene; W.hidePeople(); pud.count = 0; cubes.count = 0; wasps.count = 0; goo.visible = false; bottle.visible = false; W.glints.material.opacity = 0;
  let cp, ct, rain = { n: 1500, len: .8, spd: 14, wob: 0, th: 1.2, box: 26 }, wet = 1, pa = 1, pc = V(0, 0, 0), sk = [0xb07850, 0xf0c890];
  W.rainMat.color.set(0x5a2a10); W.rainMat.opacity = .75; W.setWheat(0); W.cars.forEach(c => c.userData.body.emissive && c.userData.body.emissive.set(0x000000));
  const ppl = (mode, k2) => W.kids.concat(W.people.slice(0, 3)).forEach((J, i) => { J.root.visible = true; let x = -3 + i * 1.4, z = 4.8 + (i % 2) * .6; let p = P(STAND), f = { mouth: 'smile', blink: blink(t + i) }, y = J === W.kids[0] || J === W.kids[1] || J === W.kids[2] ? .72 : .95;
    if (mode === 'kids') { p = P(STAND, { head: [-.6, 0, 0], lSh: [0, 0, 2.4 + Math.sin(t * 6 + i) * .2], rSh: [0, 0, -2.4 - Math.sin(t * 6 + i) * .2], lEl: [0, 0, .3], rEl: [0, 0, -.3] }); f = { mouth: 'open', open: 1.1, eye: .3 }; y += Math.abs(Math.sin(t * 5 + i)) * .25; }
    if (mode === 'eyes') { const ph = lt * 2.4; x = -3 + i * 1.5 - ph; z = 4.8 + (i % 3) * .55; p = P(runPose(t + i, 12, .7), { lSh: [-2.2, .2, .3], rSh: [-2.2, -.2, -.3], lEl: [-2.0], rEl: [-2.0], head: [.2, 0, 0] }); f = { mouth: 'open', open: .6, eye: .1, brow: .6 }; y += bob(t + i, 12); J.root.rotation.y = -Math.PI / 2; }
    else J.root.rotation.y = Math.PI + .1 * i - .2;
    J.root.position.set(x, y + .25 * (y < .9 ? .0 : 0), z); pose(J, p); face(J, f); });
  if (sc === 'hook') { rain.n = Math.floor(lerp(60, 1500, sm(.05, .8, k))); wet = sm(.3, 1, k) * .5; pa = sm(.4, 1, k) * .5; cp = V(-12, lerp(10, 2.6, eio(k)), -1.5); ct = V(0, 2, 4.6); }
  else if (sc === 'kids') { ppl('kids'); wet = .5; pa = .6; cp = V(.6, 1.4, .8); ct = V(-.6, 1.2, 4.8); }
  else if (sc === 'acid') { ppl('kids'); wet = .6; pa = .7; cp = V(-4, 2.3, -.5); ct = V(-1, 1.5, 4.6); }
  else if (sc === 'eyes') { ppl('eyes'); wet = .7; pa = .8; cp = V(-5 - lt * 1.4, 1.8, .3); ct = V(-3 - lt * 1.8, 1.2, 4.8); }
  else if (sc === 'math') { gLiquid.scale.y = lerp(.02, 1.0, eio(sm(.1, .85, k))); gLiquid.position.y = .03 + gLiquid.scale.y * .5 * 1.0 * .2 * 5 * .2; gLiquid.position.y = gLiquid.scale.y * .5 * 1; gLiquid.scale.y *= 1; gLiquid.scale.set(1, gLiquid.scale.y * 1.2, 1); gLiquid.position.y = gLiquid.scale.y * .5;
    wet = .8; pa = .9; cp = V(3.2, 1.5, 2.0).lerp(V(2.8, 1.3, 2.8), eio(k)); ct = V(2, .8, 5); }
  else if (sc === 'sugar') { const n = Math.floor(600 * eio(sm(.05, .85, k))); cubes.count = n; for (let i = 0; i < n; i++) { const lay = Math.floor(i / 120), j = i % 120; dmy.position.set(((j % 11) - 5) * .09 + (lay % 2) * .03, .05 + lay * .09, (Math.floor(j / 11) - 5) * .09 + (lay % 2) * .03); dmy.rotation.set(0, rnd(i, 1) * .2, 0); dmy.scale.setScalar(1); dmy.updateMatrix(); cubes.setMatrixAt(i, dmy.matrix); } cubes.instanceMatrix.needsUpdate = true;
    wet = .8; pa = .9; cp = V(-.6, 1.9, 2.4).lerp(V(-.9, 1.5, 3.2), eio(k)); ct = V(-1.5, .3, 5.2); }
  else if (sc === 'sticky') { const J = W.people[1]; J.root.visible = true; const lift = Math.max(0, Math.sin(lt * 3)); J.root.position.set(.5, .95, 5.0); J.root.rotation.y = -Math.PI / 2; pose(J, P(STAND, { lHip: [-.9 * lift], lKn: [.9 * lift], spine: [.15], head: [.5, 0, 0], lSh: [0, 0, .6], rSh: [0, 0, -.6] })); face(J, { mouth: 'frown', brow: .5, look: [0, -.8], blink: blink(t) });
    J.root.updateMatrixWorld(true); const sh = J.lKn.localToWorld(V(0, -.3, .05)); goo.visible = lift > .05; const g0 = V(sh.x, .27, sh.z); goo.position.copy(g0.clone().add(sh).multiplyScalar(.5)); goo.scale.set(1, Math.max(.01, sh.y - .27), 1);
    wet = 1; pa = 1; pc = V(0, 0, 5); cp = V(-1.4, .9, 2.4); ct = V(.5, .4, 5); }
  else if (sc === 'wasps') { const c = W.cars[5]; const cw = c.getWorldPosition(V(0, 0, 0)); updWasps(t, cw.clone().add(V(0, 1.3, 0)), 90, 2.2); wet = 1; pa = 1; rain.n = 600; cp = cw.clone().add(V(3.5, 2.0, 4.2)); ct = cw.clone().add(V(0, 1.1, 0)); }
  else if (sc === 'syrup') { W.cars.forEach(c => c.userData.body.emissive && c.userData.body.emissive.set(0x3a1a06)); updWasps(t, V(6, 2, 3), 40, 5); wet = 1; pa = 1.2; cp = V(-10 + k * 6, 4.5, -1); ct = V(-2 + k * 4, 2, 4); }
  else if (sc === 'river' || sc === 'fish') { const o = Z.river; W.water.material.color.copy(col(0x3f9ae0, 0x5a3a18, sc === 'river' ? sm(.1, .9, k) : 1)); rain.n = 900;
    if (sc === 'fish') { W.fish.count = 140; for (let i = 0; i < 140; i++) { dmy.position.set(o.x + (rnd(i, 1) - .5) * 10, -.08, o.z - 30 + rnd(i, 2) * 60 + Math.sin(t * .3 + i) * .2); dmy.rotation.set(Math.PI, rnd(i, 3) * 6, 0); dmy.scale.setScalar(1.6 + rnd(i, 4)); dmy.updateMatrix(); W.fish.setMatrixAt(i, dmy.matrix); } W.fish.instanceMatrix.needsUpdate = true; }
    else W.fish.count = 0; wet = 1; pa = 0; cp = o.clone().add(V(9 - k * 3, 6, 18)); ct = o.clone().add(V(0, 0, -2)); }
  else if (sc === 'honolulu') { const o = Z.river; cp = o.clone().add(V(9, 6, 18)); ct = o.clone(); wet = 1; pa = 0; }
  else if (sc === 'field' || sc === 'farmer') { const o = Z.farm; W.setWheat(sc === 'field' ? sm(.05, .95, k) : 1); rain.n = 900; rain.box = 30;
    if (sc === 'farmer') { const J = W.people[5]; J.root.visible = true; J.root.position.set(o.x + 2, .95, o.z + 11.5); J.root.rotation.y = .3; pose(J, P(STAND, { head: [.35, 0, 0], spine: [.08], lSh: [0, 0, .1], rSh: [0, 0, -.1] })); face(J, { mouth: 'frown', brow: .55, look: [0, -.6], eye: .8, blink: blink(t) }); cp = o.clone().add(V(4, 1.9, 15.5 - k * .8)); ct = o.clone().add(V(2, 1.5, 11.5)); }
    else { cp = o.clone().add(V(-6 + k * 6, 3.2, 22)); ct = o.clone().add(V(0, .6, 13)); } wet = 1; pa = 0; }
  else if (sc === 'water') { const J = W.people[0]; J.root.visible = true; J.root.position.set(0, .95, 4.8); J.root.rotation.y = Math.PI + .15; pose(J, P(STAND, { lSh: [-1.2, 0, .5], rSh: [-1.2, 0, -.5], lEl: [-1.3], rEl: [-1.3] })); J.root.updateMatrixWorld(true); bottle.visible = true; bottle.position.copy(J.root.localToWorld(V(0, .08, .38))); face(J, { mouth: 'smile', eye: .9, look: [0, -.7], blink: blink(t) });
    wet = 1; pa = 1; cp = V(.8, 1.5, 1.4).lerp(V(.5, 1.4, 2.2), eio(k)); ct = V(0, 1.2, 4.8); }
  else if (sc === 'statues' || sc === 'gargoyle') { const o = Z.plaza; const er = sm(.1, .9, k); W.stone.color.copy(col(0xd9d2c4, 0xb8a890, er));
    if (sc === 'statues') { const J = W.statue.J; J.eyes.forEach(e => e.scale.set(1, lerp(1, .05, er), 1)); for (const m in J.mouths) J.mouths[m].visible = m === 'line'; J.mouths.line.scale.setScalar(lerp(1, .1, er)); J.brows.forEach(b => b.scale.setScalar(lerp(1, .1, er))); J.head.scale.set(1, 1 - er * .12, 1 - er * .1);
      face(J, { mouth: 'line', eye: lerp(1, .05, er) }); cp = o.clone().add(V(2.8, 4.8, 9 - k * 2.5)); ct = o.clone().add(V(0, 4.0, 2)); }
    else { W.gargoyles.forEach(g => { g.userData.eyes.forEach(e => e.scale.setScalar(lerp(1, .1, er))); g.userData.snout.scale.set(lerp(1, .5, er), lerp(.8, .4, er), lerp(1, .4, er)); }); cp = o.clone().add(V(-4.2, 13.4, -6.2)); ct = o.clone().add(V(-6, 13.6, -10.6)); }
    rain.n = 1200; wet = .9; pa = 0; }
  else if (sc === 'kids50') { ppl('kids'); sk = [0x8a5030, 0xd09060]; wet = 1; pa = 1.2; cp = V(.6, 1.2, .8); ct = V(-.6, 1.4, 4.8); }
  else { // end / end2: plain water rain
    sk = [0x6a8ad8, 0xc9d6f0]; W.rainMat.color.set(0x9ad0ff); W.rainMat.opacity = .6; wet = 0; pa = 0;
    const J = W.people[4]; J.root.visible = true; J.root.position.set(0, .95, 4.8); J.root.rotation.y = Math.PI - .2; pose(J, P(STAND, { lSh: [0, 0, 2.3], rSh: [0, 0, -2.3], lEl: [0, 0, .4], rEl: [0, 0, -.4], head: [-.35, 0, 0] })); face(J, { mouth: 'smile', eye: .2, brow: -.1 });
    cp = sc === 'end' ? V(1.4, 1.9, .4) : V(-3, 3.2, -1.2); ct = V(0, 1.8, 4.8); }
  if (!['statues', 'gargoyle'].includes(sc)) W.stone.color.set(0xd9d2c4);
  setWet(wet); W.sky.set(sk[0], sk[1]);
  setCam(cp, ct, t, { land: 1.05 }); if (pa > 0) puddles(pc.lengthSq() ? pc : V(camera.position.x, 0, 4), pa);
  if (rain.n) W.updRain(t, camera.position, rain); else W.rain.count = 0;
  draw(W.sc);
}
function kitchen(s, lt, k, t) {
  cook.root.position.set(.7, .95, -.7); cook.root.rotation.y = -2.5; pose(cook, P(STAND, { head: [.3, .3, 0] })); cook.root.updateMatrixWorld(true); reach(cook, 'r', V(.15, 1.15, -1.45), V(0, -1, -.3)); face(cook, { mouth: 'frown', brow: .5, look: [.4, -.6], blink: blink(t) });
  const fl = sm(.05, .8, k); glassL.scale.y = .02 + fl * .3; glassL.position.y = 1.0 + glassL.scale.y * .5; stream.scale.y = 1 + Math.sin(t * 20) * .02;
  setCam(V(-1.1, 1.7, -.3).lerp(V(-.8, 1.5, -.7), eio(k)), V(.05, 1.15, -1.6), t, { keep: true, fov: 52 }); draw(kit);
}
function render(s, lt, k, t) { if (s.scene === 'tap') kitchen(s, lt, k, t); else town(s, lt, k, t); }

function cards(s, lt, k) {
  const a = sm(.12, .4, lt);
  switch (s.scene) {
    case 'math': return card(330, `<div class="t">${L('10 мм дождя', 'one normal rain')}</div><div class="v">${EN ? '≈ 2 <small>gal / yd²</small>' : '10 <small>л / м²</small>'}</div>`, a);
    case 'sugar': return card(330, `<div class="t">${L('сахар на каждый метр', 'sugar on every yard')}</div><div class="v">${EN ? fmtD(lerp(0, 2, eio(sm(.05, .85, k)))) + ' <small>lb</small>' : fmtD(lerp(0, 1, eio(sm(.05, .85, k)))) + ' <small>кг</small>'}</div><div class="n">${L('≈ 100 г сахара в литре колы', '≈ 100 g of sugar per liter')}</div>`, a);
    case 'river': { const v = Math.round(lerp(100, 0, eio(sm(.1, .9, k)))); return card(330, `<div class="t">${L('кислород в воде', 'oxygen in water')}</div><div class="v" style="color:${v < 40 ? '#ff4b5c' : '#1a1033'}">${v} <small>%</small></div><div class="bar"><div style="width:${v}%;background:#4fd8ff"></div></div>`, a); }
    case 'fish': return card(330, `<div class="t">${L('гонолулу · 2013', 'honolulu · 2013')}</div><div class="v">${fmtN(lerp(0, 26000, eio(k / .8)))}+</div><div class="n">${L('рыб задохнулись', 'fish suffocated')}</div>`, a);
    case 'field': return card(330, `<div class="t">${L('азот для растений', 'nitrogen for plants')}</div><div class="v" style="color:#ff4b5c">${Math.round(lerp(100, 10, eio(k)))} <small>%</small></div><div class="n">${L('его забирают микробы', 'microbes take it')}</div>`, a);
  }
  return '';
}
function full(s, lt, k) {
  const a = sm(0, .3, lt);
  if (s.scene === 'acid') {
    const x0 = PORT ? 90 : 460, y0 = PORT ? 330 : 150, w = 900; const P2 = v => 60 + v / 14 * (w - 120); const mk = (v, lab, c, up, at) => { const aa = sm(at, at + .1, k); return `<g opacity="${aa}"><line x1="${P2(v)}" x2="${P2(v)}" y1="${up ? 150 : 250}" y2="${up ? 205 : 195}" stroke="#1a1033" stroke-width="6"/><text x="${P2(v)}" y="${up ? 135 : 300}" text-anchor="middle" font-family="R,RL" font-weight="900" font-size="38" fill="${c}">${lab}</text><text x="${P2(v)}" y="${up ? 95 : 340}" text-anchor="middle" font-family="R,RL" font-weight="700" font-size="32" fill="#1a1033">${fmtD(v, 1)}</text></g>`; };
    let g = ''; for (let i = 0; i <= 14; i++) g += `<rect x="${P2(i) - (w - 120) / 28}" y="200" width="${(w - 120) / 14 + 1}" height="50" fill="hsl(${i / 14 * 260},85%,55%)"/>`;
    const svg = `<svg width="${w}" height="400" style="position:absolute;left:${x0}px;top:${y0}px"><rect width="${w}" height="400" rx="34" fill="#fff" stroke="#1a1033" stroke-width="8"/><text x="${w / 2}" y="52" text-anchor="middle" font-family="R,RL" font-weight="900" font-size="40" fill="#ff4b5c">${L('КИСЛОТНОСТЬ · pH', 'ACIDITY · pH')}</text>${g}<rect x="${P2(0) - (w - 120) / 28}" y="200" width="${w - 120 + (w - 120) / 14}" height="50" fill="none" stroke="#1a1033" stroke-width="6"/>
      ${mk(2.5, L('КОЛА', 'SODA'), '#7a3a10', true, .15)}${mk(4, L('кисл. дождь', 'acid rain'), '#1a1033', false, .3)}${mk(5.6, L('дождь', 'rain'), '#1a1033', true, .45)}${mk(7, L('вода', 'water'), '#1a1033', false, .55)}</svg>`;
    return `<div style="position:absolute;inset:0;background:rgba(8,6,24,${.45 * a})"></div><div style="position:absolute;inset:0;opacity:${a}">${svg}</div>`;
  }
  if (s.scene === 'honolulu') {
    let svg = `<svg viewBox="0 0 400 210" width="${PORT ? 760 : 680}" height="${PORT ? 400 : 357}"><rect width="400" height="210" fill="#3f9ae0"/><path d="M0 0 H400 V40 Q300 70 200 45 T0 55 Z" fill="#9ad86a" stroke="#1a1033" stroke-width="4"/><rect x="40" y="38" width="120" height="16" fill="#c9cdd8" stroke="#1a1033" stroke-width="3"/>`;
    svg += `<ellipse cx="${120 + k * 30}" cy="120" rx="${60 + k * 60}" ry="${26 + k * 20}" fill="#5a2a10" opacity=".9"/>`; for (let i = 0; i < 10; i++) svg += `<g transform="translate(${60 + hash(i, 1) * 280},${100 + hash(i, 2) * 90}) rotate(180)"><ellipse rx="12" ry="5" fill="#e8ecf0" stroke="#1a1033" stroke-width="2"/></g>`;
    svg += `</svg>`;
    return paper(a, k, `${svg}<div style="font-weight:900;font-size:62px;margin-top:12px;color:#1a1033">${L('ГОНОЛУЛУ · 2013', 'HONOLULU · 2013')}</div><div style="font-weight:700;font-size:36px">${L('1 400 тонн патоки в гавани', '1,400 tons of molasses in the harbor')}</div><div style="font-weight:700;font-size:30px;opacity:.8;margin-top:6px">${L('сахар «съел» кислород из воды', 'the sugar used up the oxygen')}</div>`);
  }
  return '';
}
start({ render, cards, full, mins: { acid: 5.2, sugar: 4.0 }, bubbles: ['#5a2a10', '#7a3a18', '#a85a28'] });
