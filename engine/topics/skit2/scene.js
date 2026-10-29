// «Сериал вместе» — жизненный скетч, стиль 48 «Мультик 50-х»
import { start, clamp, lerp, sm, eio, EN } from '../../core.js';
import { g, begin, present, person, planes, balloon, label, phone, sofaBack, sofaFront, tv, zz, PAL, shape, ink, ellipse, rrect, rect, starPts, handAt, GUY, GIRL } from '../../lemo/k48/kit48.js';

const talking = (s, lt) => lt > s.vo0 - s.start - .05 && lt < s.vo0 - s.start + s.vd;
// the series on TV: two big flat figures, the picture changes slowly (never flickers)
const show = t => gg => { const sh = Math.floor(t / 2.2) % 3; const bg = [PAL.blueL, PAL.coralL, PAL.avocadoL][sh];
  gg.fillStyle = bg; gg.fillRect(-170, -300, 260, 230);
  gg.fillStyle = PAL.blueD; gg.beginPath(); gg.ellipse(-80, -150, 26, 30, 0, 0, 7); gg.fill(); gg.fillRect(-110, -120, 60, 60);
  gg.fillStyle = PAL.coralD; gg.beginPath(); gg.ellipse(10, -160, 24, 28, 0, 0, 7); gg.fill(); gg.fillRect(-18, -132, 56, 72); };
const paused = gg => { gg.fillStyle = PAL.blueL; gg.fillRect(-170, -300, 260, 230); gg.fillStyle = PAL.white; gg.fillRect(-80, -240, 30, 110); gg.fillRect(-20, -240, 30, 110); };
function room(t, o = {}) {
  planes(o.wall || PAL.mustardL, PAL.kraftL, 1500, { burst: o.burst });
  // a wall lamp plane and a picture frame (abstract)
  shape(g, rrect(600, 640, 220, 160, 12), { fill: PAL.tealL, line: 4, seed: 30 }); ink(g, [[630, 770], [690, 700], [740, 750], [790, 680]], 5, { seed: 31, taper: false, color: PAL.tealD });
  if (o.tv !== false) tv(230, 1640, .85, o.paused ? paused : show(t));
}
function couch(t, o = {}) {   // both on the sofa, turned to the TV on the left; she sits nearer the TV
  sofaBack(420, 1700, 560);
  const clipY = 1560;
  const her = { c: GIRL, x: 560, y: 1840, s: 1.15, dir: -1, view: 'q', face: o.gface || 'neutral', look: o.glook, armF: o.garm, handF: o.ghand };
  const him = { c: GUY, x: 800, y: 1840, s: 1.15, dir: -1, view: 'q', face: o.yface || 'neutral', armF: o.yarm, handF: o.yhand };
  person(him, t, { ph: .6, talk: o.ytalk, clipY });
  person(her, t, { talk: o.gtalk, sleep: o.sleep, rot: o.grot, clipY });
  if (o.phone) { const h = handAt(her, 'F'); phone(h[0] - 14, h[1] - 30, .9, .25); }
  sofaFront(420, 1700, 560);
}
function render(s, lt, k, t) {
  const sc = s.scene, talk = talking(s, lt), g2 = s.who === 'g';
  if (sc === 'invite') {
    begin(t, g2 ? { zoom: 1.6, cx: 560, cy: 1150 } : { zoom: 1.15, cx: 540, cy: 1250 });
    room(t, { tv: !g2 });
    sofaBack(420, 1720, 560); sofaFront(420, 1720, 560);
    const wave = Math.floor(t * 4) % 2;
    person({ c: GIRL, x: g2 ? 560 : 300, y: 1880, s: 1.3, dir: 1, view: 'front', face: 'happy', armF: g2 ? { a1: -1.2, a2: -1.6 } : { a1: -.5, a2: wave ? -1.5 : -1.0 }, handF: g2 ? 'point' : 'open' }, t, { talk: g2 && talk });
    if (!g2) person({ c: GUY, x: lerp(1150, 860, eio(clamp(lt / 1.4))), y: 1880, s: 1.3, dir: -1, view: 'q', face: 'happy' }, t, { ph: .9 });
    return present();
  }
  if (sc === 'ep1') {      // she tells about her friend's work, he tries to watch
    begin(t, { zoom: 1.1, cx: 560, cy: 1250 }); room(t);
    couch(t, { gtalk: true, glook: [10, 0], gface: 'happy', yface: 'focus' });
    balloon(380, 900, 330, 210, [500, 560, 1190]);
    // a tiny office in the balloon: building + two figures (pictograms, big and steady)
    shape(g, rect(430, 940, 110, 140), { fill: PAL.blue, line: 3.4, seed: 60 }); for (let i = 0; i < 3; i++) shape(g, rect(445 + (i % 2) * 50, 960 + Math.floor(i / 2) * 50, 30, 30), { fill: PAL.white, line: 0, off: [0, 0] });
    for (const [x, c] of [[590, PAL.coral], [660, PAL.teal]]) { shape(g, ellipse(x, 980, 22, 22, 18), { fill: PAL.skin, line: 3, seed: x }); shape(g, rrect(x - 26, 1008, 52, 70, 14), { fill: c, line: 3, seed: x + 1 }); }
    return present();
  }
  if (sc === 'ep2') {
    begin(t, g2 ? { zoom: 1.4, cx: 480, cy: 1300 } : { zoom: 1.1, cx: 540, cy: 1250 }); room(t);
    couch(t, g2 ? { gtalk: talk, gface: 'wow', garm: { a1: -.2, a2: -.45 }, ghand: 'point', yface: 'neutral' } : { phone: true, garm: { a1: 1.0, a2: -1.2 }, ghand: 'grip', glook: [6, 8], yface: 'focus' });
    if (g2) { shape(g, starPts(560, 820, 100, 10, .55, .1), { fill: PAL.coral, line: 4, seed: 70 }); label('?', 560, 822, 100, PAL.white); }
    return present();
  }
  if (sc === 'pause') {
    if (!g2) {   // close-up of the TV: his hand with the remote comes in, the picture freezes
      begin(t, { zoom: 2.1, cx: 260, cy: 1350 }); room(t, { paused: lt > .8 });
      const u = eio(clamp(lt / .7)); const hx = lerp(640, 400, u), hy = 1440;
      ink(g, [[700, 1560], [hx, hy]], 46, { seed: 90, taper: false }); ink(g, [[700, 1560], [hx, hy]], 32, { seed: 91, taper: false, color: PAL.mustard });
      shape(g, rrect(hx - 70, hy - 18, 70, 30, 8), { fill: PAL.ink, line: 0, off: [0, 0] }); shape(g, ellipse(hx - 56, hy - 4, 7, 7, 12), { fill: PAL.coral, line: 0, off: [0, 0] });
      shape(g, ellipse(hx, hy, 26, 22, 18), { fill: PAL.skin, line: 4, seed: 92 });
      return present(); }
    begin(t, { zoom: 1.4, cx: 640, cy: 1300 }); room(t, { paused: true, wall: PAL.coralL });
    couch(t, { gtalk: talk, gface: 'wow', garm: { a1: -1.0, a2: -1.5 }, ghand: 'open', yface: 'wow' });
    return present();
  }
  if (sc === 'ep3') {      // she falls asleep on his shoulder; he silently watches on
    begin(t, { zoom: 1.3, cx: 640, cy: 1300 }); room(t, { wall: PAL.blue });
    const lean = sm(.3, .6, k) * .24;
    couch(t, { grot: lean, sleep: k > .45, gface: 'happy', yface: 'happy' });
    if (k > .6) zz(600, 1000, lt * .3);
    return present();
  }
  if (sc === 'morning') {  // morning: sun in the window, her warning finger
    begin(t, { zoom: 1.35, cx: 540, cy: 1200 });
    planes(PAL.mustardL, PAL.kraftL, 1600, { burst: [760, 640, 300] });
    shape(g, rrect(620, 420, 320, 420, 20), { fill: PAL.blueL, line: 4.5, seed: 80 }); shape(g, ellipse(780, 700, 80, 80, 30), { fill: PAL.mustard, line: 3.4, seed: 81 });
    ink(g, [[780, 420], [780, 840]], 6, { seed: 82, taper: false }); ink(g, [[620, 630], [940, 630]], 6, { seed: 83, taper: false });
    person({ c: GUY, x: 760, y: 1880, s: 1.3, dir: -1, view: 'q', face: g2 ? 'wow' : 'neutral' }, t, { ph: .2 });
    person({ c: GIRL, x: 340, y: 1880, s: 1.3, dir: 1, view: 'q', face: 'focus', armF: { a1: -.6, a2: -1.5 }, handF: 'point' }, t, { talk: g2 && talk });
    return present();
  }
  begin(t, { zoom: 1.35, cx: 540, cy: 1200 });
  planes(PAL.tealL, PAL.teal, 1700, { burst: [540, 1000, 520] });
  person({ c: GUY, x: 540, y: 1880, s: 1.45, dir: 1, view: 'front', face: 'happy', armF: { a1: -.4, a2: -.9 }, armB: { a1: 3.5, a2: 4.0 }, handF: 'open', handB: 'open' }, t);
  return present();
}
start({ render, mins: { end: 3, morning: 1.6 }, bubbles: ['#3FA7A0', '#E8B43A', '#E0607E'] });
