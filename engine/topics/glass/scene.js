// "Что если с неба пойдёт стекло"
import { THREE, start, PORT, EN, L, clamp, lerp, sm, eio, eob, V, hash, rnd, col, T, B, add, G, Box, Sph, Cap, Cyl, dotTex, canvasTex, makeSky, points, makeHuman, face, pose, P, SIT, STAND, walkPose, runPose, bob, reach, camera, setCam, draw, setShake, card, paper, fmtN } from '../../core.js';
import { makeTown, ZONES, makePlane747, makeCar } from '../_town.js';

const W = makeTown({ top: 0x7a7fb0, bot: 0xd0d4e8, fog: 0xc4c8dc });
const Z = ZONES;
W.rainMat.color.set(0xdff6ff); W.rainMat.opacity = .85; W.rainMat.blending = THREE.AdditiveBlending;
const blink = t => (t % 3.3) < .1;
// store interior (placed under the world, separate small room)
const shop = new THREE.Scene(); shop.background = new THREE.Color(0xe8e4dc);
shop.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 1.8)); { const d = new THREE.DirectionalLight(0xffffff, .8); d.position.set(2, 5, 4); shop.add(d); }
add(shop, Box(14, 5, 12), T(0xf2efe8, { side: THREE.BackSide }), [0, 2.5, 0], [0, 0, 0], null, 0);
add(shop, Box(14, .02, 12), T(0xd8d2c4), [0, .01, 0], [0, 0, 0], null, 0);
const shelfItems = [];
for (let r = 0; r < 3; r++) { const sg = G(shop, [-4 + r * 4, 0, -2]); for (const y of [.3, 1.0, 1.7, 2.4]) add(sg, Box(3, .08, .9), T(0xc9cdd8), [0, y, 0], [0, 0, 0], null, .01); add(sg, Box(3, 2.6, .06), T(0xd9dde8), [0, 1.3, -.45], [0, 0, 0], null, .01); for (let i = 0; i < 6; i++) if (rnd(i, r) > .7) shelfItems.push(add(sg, Box(.3, .4, .3), T([0xff4b5c, 0xffd23f, 0x4fd8ff][i % 3]), [-1.2 + i * .45, .55 + (i % 3) * .7, 0], [0, 0, 0], null, .01)); }
const sign = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#ff4b5c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 70px R, RL'; c.textAlign = 'center'; c.fillText(L('ВСЁ РАСКУПИЛИ', 'SOLD OUT'), 256, 90); });
add(shop, new THREE.PlaneGeometry(3.2, .8), B(0xffffff, { map: sign }), [0, 3.4, -2.4], [0, 0, 0], null, 0);
const shopper = makeHuman({ top: 0x4fd8ff, pants: 0x2b2f45, hair: 0x2a1a10 }); shop.add(shopper.root);
const basket = add(shop, Box(.35, .22, .25), T(0xff7a1f), [0, 0, 0], [0, 0, 0], null, .01);
// night sky + 747 in ash
const sky = new THREE.Scene(); sky.add(makeSky(0x1a2050, 0x06081a, 900)); sky.fog = new THREE.Fog(0x2a2a3a, 20, 120);
sky.add(new THREE.HemisphereLight(0x8a9ad0, 0x1a1a2a, 1.4)); { const d = new THREE.DirectionalLight(0xc8d8ff, 1.2); d.position.set(5, 10, 8); sky.add(d); }
const jet = makePlane747(1); sky.add(jet);
const ash = points(2500, 0x8a8494, 2.5, { opacity: .55 }); sky.add(ash);
const elmo = points(300, 0x7ff0ff, .25, { blending: THREE.AdditiveBlending, opacity: 0 }); sky.add(elmo);
add(sky, new THREE.CircleGeometry(8, 30), B(0xfff6d8, { fog: false }), [-80, 70, -300], [0, .2, 0], null, 0);
// cockpit
const ck = new THREE.Scene(); ck.background = new THREE.Color(0x0a0c1c);
ck.add(new THREE.HemisphereLight(0x9ab0ff, 0x302830, 1.1)); const ckL = new THREE.PointLight(0xbfe0ff, 1.1, 6, 1.2); { const w = new THREE.PointLight(0xffd8b0, 1.4, 5, 1.2); w.position.set(.5, 1.8, -1.2); ck.add(w); } ckL.position.set(0, 1.6, 1.2); ck.add(ckL);
add(ck, Box(3.4, 2.6, 3.4), T(0x3a3f55, { side: THREE.BackSide }), [0, 1.2, 0], [0, 0, 0], null, 0);
const wsT = canvasTex(512, 256, (c, w, h, t = 0) => { c.fillStyle = '#0a1230'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { const x = (hash(i, 1) * w + t * 40 * (1 + hash(i, 3))) % w, y = hash(i, 2) * h; c.strokeStyle = 'rgba(127,240,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 4; s++) c.lineTo(x + (hash(i, s + 5) - .5) * 40, y + (hash(i, s + 9) - .5) * 40); c.stroke(); } });
for (const s of [-1, 1]) add(ck, new THREE.PlaneGeometry(1.3, .7), B(0xffffff, { map: wsT }), [s * .7, 1.7, 1.68], [0, Math.PI + s * .25, 0], null, 0);
add(ck, Box(3.2, .7, .7), T(0x2b2f45), [0, .85, 1.2], [-.3, 0, 0], null, .015);
const gauges = []; for (let i = 0; i < 8; i++) gauges.push(add(ck, new THREE.CircleGeometry(.1, 16), B(i < 4 ? 0xff4b5c : 0x5cff9a), [-1.05 + i * .3, 1.05, .82], [-.3, Math.PI, 0], null, 0));
const capt = makeHuman({ top: 0xf3f5fa, pants: 0x1d2a5a, hair: 0x6a6a6a, pilotCap: true, headset: true, stubble: true }); ck.add(capt.root);
add(ck, Box(.8, .2, .8), T(0x5d4030), [-.6, .3, .3], [0, 0, 0], null, .012); add(ck, Box(.8, .9, .15), T(0x5d4030), [-.6, .7, -.08], [0, 0, 0], null, .012);

// =====================================================================
function people(t, center, mode, k) {
  W.people.forEach((J, i) => {
    J.root.visible = true; let x, z, ry, p, f;
    if (mode === 'run') { const ph = (t * 2.2 + i * 3.1) % 22; x = center.x - 11 + ph + (i % 2) * .5; z = center.z + 4.4 + (i % 3) * .6 - .6; ry = Math.PI / 2; p = P(runPose(t + i, 12, .8), { lSh: [-2.4, .3, .4], rSh: [-2.4, -.3, -.4], lEl: [-1.9], rEl: [-1.9], head: [.3, 0, 0] }); f = { mouth: 'open', open: .6, eye: .4, brow: .5 }; J.root.position.set(x, .7 + bob(t + i, 12) + .25, z); }
    else { const a = i / W.people.length * 6.283; x = center.x + Math.cos(a) * 3 + (i % 2); z = center.z + 4.6 + Math.sin(a) * .8; ry = Math.PI + rnd(i, 3) * 1.2 - .6; p = P(STAND, { head: [-.5 * sm(0, .5, k), 0, 0], lSh: [0, 0, .25], rSh: [0, 0, -.25] }); f = { mouth: k > .4 ? 'open' : 'line', open: .7, look: [0, 1], eyeS: 1.15, blink: blink(t + i) }; J.root.position.set(x, .95, z); }
    J.root.rotation.y = ry; pose(J, p); face(J, f);
  });
}
function town(s, lt, k, t) {
  const sc = s.scene; W.hidePeople(); W.rain.count = 0; W.glints.material.opacity = 0; W.plume.material.opacity = 0; W.lava.material.opacity = 0;
  let cp, ct, rain = { n: 900, len: 2.2, spd: 3.2, wob: .6, th: .7, box: 30 }, gl = .6, gc = null, sk = [0x7a7fb0, 0xd0d4e8], fogC = 0xc4c8dc;
  W.cars.forEach(c => c.userData.glass.color.set(0x8fd8ff)); W.pipeLow.rotation.set(0, 0, 0); W.pipeLow.position.set(3.6, 1.3, 7.0); W.setWheat(0); W.groundM.color.set(0x8fcf6a);
  W.rainMat.color.set(0xdff6ff); W.rainMat.blending = THREE.AdditiveBlending; W.rainMat.opacity = .85;
  if (sc === 'hook') { rain.n = Math.floor(lerp(40, 900, sm(.1, .9, k))); people(t, Z.street, 'look', k); cp = V(-12, lerp(9, 2.6, eio(k)), -1.5); ct = V(0, 2.2, 4.6); gl = sm(.5, 1, k) * .5; }
  else if (sc === 'hair') { rain = { n: 260, len: 3, spd: 1.4, wob: .5, th: 1.3, box: 14, keep: true }; W.rainMat.opacity = .42; cp = V(1.5, 2.0, -1.2); ct = V(0, 2.4, 4.5); gl = .5; }
  else if (sc === 'size') { rain = { n: 120, len: 4.5, spd: .7, wob: .3, th: 1.5, box: 8, keep: true }; W.rainMat.opacity = .5; cp = V(.4, 1.7, .8); ct = V(0, 1.9, 4); gl = .4; }
  else if (sc === 'run') { rain.n = 1300; people(t, Z.street, 'run', k); const cx = -2 + k * 3; cp = V(cx + 6, 2.0, -.8); ct = V(cx, 1.3, 4.6); gl = .8; }
  else if (sc === 'planes' || sc === 'grounded') { const o = Z.airport; rain.n = 1500; rain.box = 60; cp = o.clone().add(sc === 'planes' ? V(-30 + k * 10, 6, 22) : V(30 - k * 12, 9, 26)); ct = o.clone().add(V(0, 3, -18)); gl = 0; }
  else if (sc === 'cars') { const c = W.cars[4]; const cw = c.getWorldPosition(V(0, 0, 0)); const cl = sm(.15, .85, k); W.cars.forEach(cc => cc.userData.glass.color.copy(col(0x8fd8ff, 0xe8ecf0, cl))); rain.n = 900; cp = cw.clone().add(V(lerp(4.2, 3.0, eio(k)), 1.9, 2.2)); ct = cw.clone().add(V(.3, .9, 0)); gl = 1; gc = cw; }
  else if (sc === 'gutter') {
    const J = W.people[2]; J.root.visible = true; J.root.position.set(4.4, .95, 7.6); J.root.rotation.y = -Math.PI / 2 - .4; const off = eio(sm(.25, .65, k)); W.pipeLow.rotation.z = off * 1.2; W.pipeLow.position.x = 3.6 + off * .3;
    pose(J, P(STAND, { spine: [.15], head: [.2, 0, 0] })); J.root.updateMatrixWorld(true); reach(J, 'l', W.pipeLow.localToWorld(V(0, .3, 0)), V(0, -1, -.3)); reach(J, 'r', W.pipeLow.localToWorld(V(0, .15, 0)), V(0, -1, -.3)); face(J, { mouth: 'line', brow: .3, look: [-.5, -.4], blink: blink(t) });
    rain.n = 900; cp = V(6.4, 2.2, 1.2); ct = V(3.8, 1.4, 7.0); gl = 1;
  }
  else if (sc === 'cows') { const o = Z.farm; W.cows.forEach((c, i) => { c.userData.head.rotation.z = -.6 + Math.sin(t * 2 + i) * .15; }); rain.n = 900; rain.box = 36; cp = o.clone().add(V(-2 + k * 4, 3.2, 14)); ct = o.clone().add(V(0, .8, 2)); gl = 1; gc = o.clone().add(V(0, 0, 3)); }
  else if (sc === 'tambora' || sc === 'nosummer') {
    if (sc === 'tambora') { const o = Z.volcano; sk = [0x5a4a50, 0xb08a80]; fogC = 0x9a8a8a; W.plume.material.opacity = .85; W.lava.material.opacity = 1;
      for (let i = 0; i < 1600; i++) { const a = (rnd(i, 1) + t * .05) % 1, r = 4 + a * 60 * (.4 + rnd(i, 2)); const an = rnd(i, 3) * 6.283; W.plume.pos[i * 3] = Math.cos(an) * r * .7 + a * 40; W.plume.pos[i * 3 + 1] = 44 + a * 90 + Math.sin(an * 3) * 6; W.plume.pos[i * 3 + 2] = -60 + Math.sin(an) * r * .7; } W.plume.upd();
      for (let i = 0; i < 300; i++) { const a = (rnd(i, 7) + t * .6) % 1, an = rnd(i, 8) * 6.283, v = 10 + rnd(i, 9) * 14; W.lava.pos[i * 3] = Math.cos(an) * v * a * .6; W.lava.pos[i * 3 + 1] = 42 + v * a * 2.2 - 30 * a * a; W.lava.pos[i * 3 + 2] = -60 + Math.sin(an) * v * a * .6; } W.lava.upd();
      rain.n = 0; cp = o.clone().add(V(-36 + k * 8, 12, 40)); ct = o.clone().add(V(0, 46, -60)); gl = 0; setShake(.05); W.sc.fog.far = 420; }
    else { const o = Z.farm; sk = [0x9aa0b8, 0xe0e4ee]; fogC = 0xd8dce6; W.setWheat(sm(0, .7, k)); W.rainMat.color.set(0xffffff); W.rainMat.blending = THREE.NormalBlending; rain = { n: 1400, len: .18, spd: 2.2, wob: .4, th: 4, box: 30 };
      const J = W.people[3]; J.root.visible = true; J.root.position.set(o.x - 2, .95, o.z + 9.4); J.root.rotation.y = Math.PI * .9; pose(J, P(STAND, { head: [.35, 0, 0], spine: [.1] })); face(J, { mouth: 'frown', brow: .5, look: [0, -.6], blink: blink(t) });
      cp = o.clone().add(V(3.5, 2.4, 3.5 - k)); ct = o.clone().add(V(-2, 1.2, 12)); gl = 0; }
  }
  else if (sc === 'forever' || sc === 'beach') { const o = Z.beach; sk = [0x8a90c0, 0xf0e0d0]; rain.n = sc === 'forever' ? 200 : 0; cp = o.clone().add(sc === 'forever' ? V(lerp(-6, 6, k), 1.4, 9) : V(-14 + k * 8, 4.5, 16)); ct = o.clone().add(V(0, .4, sc === 'forever' ? 3 : 0)); gl = 1; gc = o.clone().add(V(0, 0, 5)); }
  else { // end: ordinary water rain, smiling person
    sk = [0x6a8ad8, 0xc9d6f0]; W.rainMat.color.set(0x9ad0ff); W.rainMat.blending = THREE.NormalBlending; W.rainMat.opacity = .6; rain = { n: 1500, len: .7, spd: 16, wob: 0, th: 1, box: 24 };
    const J = W.people[4]; J.root.visible = true; J.root.position.set(0, .95, 4.6); J.root.rotation.y = Math.PI - .2; pose(J, P(STAND, { lSh: [0, 0, 2.3], rSh: [0, 0, -2.3], lEl: [0, 0, .4], rEl: [0, 0, -.4], head: [-.35, 0, 0] })); face(J, { mouth: 'smile', eye: .2, brow: -.1 });
    cp = V(1.5, 1.9, .3); ct = V(0, 1.8, 4.6); gl = 0;
  }
  W.sky.set(sk[0], sk[1]); W.sc.fog.color.set(fogC); if (sc !== 'tambora') W.sc.fog.far = 170;
  setCam(cp, ct, t, { land: 1.05 });
  if (rain.n) W.updRain(t, camera.position, rain); else W.rain.count = 0;
  if (false) W.updGlints(t, gc || V(camera.position.x, 0, camera.position.z + 6), gl * (['forever', 'beach'].includes(sc) ? .55 : 1), 16);
  draw(W.sc);
}
function skyShot(s, lt, k, t) {
  const sc = s.scene; jet.position.set(0, 0, 0); jet.rotation.set(0, 0, 0);
  let el = 0, glow = 0, dead = 0, fire = 0, pitch = 0;
  if (sc === 'planes') { el = 0; }
  if (sc === 'b747') { el = sm(.15, .5, k); glow = el; dead = sm(.6, .75, k); }
  if (sc === 'glide') { dead = 1 - sm(.62, .7, k); fire = sm(.62, .75, k); pitch = -.12 * (1 - sm(.6, .8, k)); }
  jet.rotation.z = pitch + Math.sin(t * .8) * .02;
  jet.userData.engines.forEach((e, i) => { e.glow.material.opacity = glow * (.5 + .3 * Math.sin(t * 9 + i)) * (1 - dead); e.fire.material.opacity = fire * .5 + (sc === 'b747' && k < .6 ? .25 : 0); });
  for (let i = 0; i < 2500; i++) { const x = ((rnd(i, 1) * 160 - t * 55) % 160 + 160) % 160 - 80; ash.pos[i * 3] = x; ash.pos[i * 3 + 1] = (rnd(i, 2) - .5) * 40 + (sc === 'glide' ? t * 3 % 40 : 0); ash.pos[i * 3 + 2] = (rnd(i, 3) - .5) * 60; } ash.upd();
  ash.material.opacity = sc === 'glide' ? .55 * (1 - sm(.55, .9, k)) : .55;
  for (let i = 0; i < 300; i++) { const e = jet.userData.engines[i % 4].eg.getWorldPosition(V(0, 0, 0)); elmo.pos[i * 3] = e.x - .5 + (rnd(i, 4) - .5) * .8; elmo.pos[i * 3 + 1] = e.y + (rnd(i, 5) - .5) * .6; elmo.pos[i * 3 + 2] = e.z + (rnd(i, 6) - .5) * .6; } elmo.upd(); elmo.material.opacity = el * .7 * (1 - dead);
  const a = sc === 'glide' ? 2.2 + k * .5 : .5 + k * .4; setCam(V(Math.cos(a) * 13, 3 + (sc === 'glide' ? 2 : 0), Math.sin(a) * 13), V(0, -.2, 0), t, { land: 1.1 });
  if (sc === 'b747') setShake(.04 * el);
  draw(sky);
}
function cockpit(s, lt, k, t) {
  capt.root.position.set(-.6, .72, .3); capt.root.rotation.y = Math.PI * .85; pose(capt, P(SIT, { lSh: [-1.1, 0, .2], lEl: [-.9], head: [0, 0, 0] }));
  capt.root.updateMatrixWorld(true); reach(capt, 'r', capt.head.localToWorld(V(-.15, .1, .25)), V(0, -1, .3));
  face(capt, { mouth: Math.sin(t * 9) > 0 && lt > .3 && k < .9 ? 'open' : 'smile', open: .45, brow: -.15, look: [.2, 0], blink: blink(t) });
  gauges.forEach((g, i) => g.material.color.set(i < 4 ? ((Math.floor(t * 2 + i) % 2) ? 0xff4b5c : 0x551010) : 0x5cff9a)); wsT.redraw(t);
  setCam(V(.3, 1.5, -1.0).lerp(V(.1, 1.45, -.6), eio(k)), V(-.6, 1.35, .3), t, { keep: true, fov: 50 }); draw(ck);
}
function shopShot(s, lt, k, t) {
  const x = lerp(-3, 1.5, k); shopper.root.position.set(x, .95, .4); shopper.root.rotation.y = Math.PI / 2; pose(shopper, P(walkPose(t, 6, .4), { lSh: [-.3, 0, .2], lEl: [-1.2] }));
  shopper.root.updateMatrixWorld(true); basket.position.copy(shopper.root.localToWorld(V(.3, .25, .25))); face(shopper, { mouth: 'frown', brow: .45, look: [-.6, .2], blink: blink(t) });
  setCam(V(x + 1.5, 2.0, 6.5), V(x, 1.4, -1), t, { land: 1.1 }); draw(shop);
}
const SKY = ['b747', 'glide'];
function render(s, lt, k, t) { const sc = s.scene; if (SKY.includes(sc)) skyShot(s, lt, k, t); else if (sc === 'captain') cockpit(s, lt, k, t); else if (sc === 'shops') shopShot(s, lt, k, t); else town(s, lt, k, t); }

function cards(s, lt, k) {
  const a = sm(.12, .4, lt);
  switch (s.scene) {
    case 'hair': return card(330, `<div class="t">${L('гавайи · вулкан килауэа', 'hawaii · kilauea volcano')}</div><div class="v" style="font-size:72px">${L('«ВОЛОСЫ ПЕЛЕ»', "PELE'S HAIR")}</div><div class="n">${L('нити вулканического стекла', 'threads of volcanic glass')}</div>`, sm(.35, .6, k));
    case 'size': return card(330, `<div class="t">${L('одна нить', 'one thread')}</div><div class="v">&gt; 1 <small>${L('м', 'm')}</small> · &lt; 1 <small>${L('мм', 'mm')}</small></div><div class="n">${L('длина · толщина', 'length · thickness')}</div>`, a);
    case 'planes': return card(330, `<div class="t">${L('вулканический пепел', 'volcanic ash')}</div><div class="v" style="font-size:76px">${L('КАМЕНЬ + СТЕКЛО', 'ROCK + GLASS')}</div><div class="n">${L('стекло плавится в двигателе', 'the glass melts in the engine')}</div>`, a);
    case 'b747': return card(330, `<div class="t">${L('24 июня 1982', 'june 24, 1982')}</div><div class="v">747</div><div class="n">${L('263 человека на борту', '263 people on board')}</div>`, a);
    case 'glide': { const h = lerp(11000, 4100, eio(sm(.05, .62, k))); return card(330, `<div class="t">${L('высота', 'altitude')}</div><div class="v">${EN ? fmtN(h * 3.281) + ' <small>ft</small>' : fmtN(h) + ' <small>м</small>'}</div><div class="n" style="color:${k > .8 ? '#1aa86a' : 'inherit'};font-weight:900">${k > .8 ? L('ВЫЖИЛИ ВСЕ 263', 'ALL 263 SURVIVED') : L('двигатели молчат', 'engines silent')}</div>`, a); }
    case 'grounded': return card(330, `<div class="t">${L('вылеты', 'departures')}</div><div class="v" style="color:#ff4b5c;font-size:80px">${L('ОТМЕНЕНЫ', 'CANCELLED')}</div>`, a);
    case 'tambora': return card(330, `<div class="t">${L('тамбора · 1815', 'tambora · 1815')}</div><div class="v" style="font-size:72px">${L('МИЛЛИАРДЫ ТОНН', 'BILLIONS OF TONS')}</div><div class="n">${L('пепла и газа в небе', 'of ash and gas in the sky')}</div>`, a);
    case 'nosummer': return card(330, `<div class="t">${L('июнь 1816', 'june 1816')}</div><div class="v" style="font-size:80px">❄ ${L('СНЕГ', 'SNOW')}</div><div class="n">${L('урожай погиб', 'crops died')}</div>`, a);
    case 'forever': return card(330, `<div class="t">${L('стекло разлагается', 'glass breaks down in')}</div><div class="v">1–2 <small>${L('млн лет', 'million yrs')}</small></div>`, a);
  }
  return '';
}
function fx(s, lt, k) { if (s.scene === 'b747' && k > .6) return { bk: .25 * sm(.6, .75, k) }; return {}; }
start({ render, cards, fx, mins: { hook: 3.2, captain: 4.0 }, bubbles: ['#2a5b8a', '#4f8ab8', '#8fd8ff'] });
