// «Сфоткай меня красиво» — жизненный скетч, стиль 48 «Мультик 50-х»
import { start, clamp, lerp, sm, eio, EN } from '../../core.js';
import { g, begin, present, person, planes, label, phone, PAL, shape, ink, ellipse, spline, rrect, rect, starPts, handAt, GUY, GIRL, GRAN } from '../../lemo/k48/kit48.js';

const talking = (s, lt) => lt > s.vo0 - s.start - .05 && lt < s.vo0 - s.start + s.vd;
const POSE = { armF: { a1: 1.9, a2: .4 }, handF: 'flat', armB: { a1: -2.2, a2: -.6 }, handB: 'open' };   // hand on hip, hand behind head
function park(o = {}) {
  planes(PAL.blueL, PAL.avocadoL, 1500, { burst: o.burst });
  [[160, 560], [880, 430]].forEach(([x, y], i) => shape(g, spline([[x - 90, y], [x - 50, y - 50], [x + 10, y - 60], [x + 70, y - 40], [x + 100, y], [x, y + 18]], true, 6), { fill: PAL.white, line: 3.4, seed: 20 + i }));
  // a geometric tree: trunk + lollipop crown
  shape(g, rect(905, 900, 50, 620), { fill: PAL.brown, line: 4, seed: 30 }); shape(g, ellipse(930, 820, 190, 230, 40), { fill: PAL.avocado, line: 4.2, seed: 31, shade: [{ pts: ellipse(990, 870, 160, 200, 30), color: PAL.avocadoD, alpha: .5 }] });
}
function bush(x, y, s = 1, seed = 40) { g.save(); g.translate(x, y); g.scale(s, s);
  shape(g, spline([[-220, 0], [-230, -120], [-150, -220], [-40, -250], [60, -230], [170, -200], [230, -100], [220, 0]], true, 8), { fill: PAL.avocado, line: 4.2, seed, shade: [{ pts: rect(0, -260, 240, 270), color: PAL.avocadoD, alpha: .5 }] });
  for (const [a, b] of [[-120, -140], [40, -170], [140, -90], [-60, -60]]) ink(g, spline([[a, b], [a + 26, b - 20], [a + 52, b]], false, 5), 3.6, { seed: seed + a, color: PAL.avocadoD });
  g.restore(); }
function leaves(pts) { pts.forEach(([x, y, r], i) => shape(g, ellipse(x, y, 34, 16, 12, 0, Math.PI * 2, r), { fill: i % 2 ? PAL.avocado : PAL.avocadoD, line: 3, seed: 700 + i })); }
function dog(x, y, s, t, sad) { g.save(); g.translate(x, y); g.scale(s, s); const step = Math.floor(t * 6) % 2;
  for (const [lx, dl] of [[-60, step], [-30, 1 - step], [50, step], [80, 1 - step]]) shape(g, rrect(lx - 9, -70, 18, 70 - dl * 6, 6), { fill: PAL.kraft, line: 3.2, seed: 800 + lx });
  shape(g, ellipse(10, -100, 110, 50, 30), { fill: PAL.kraftL, line: 4, seed: 810, shade: [{ pts: rect(-100, -80, 220, 40), color: PAL.kraft, alpha: .6 }] });
  ink(g, spline([[-95, -110], [-140, -150], [-150, -190]], false, 5), 12, { seed: 811, taper: true });
  shape(g, ellipse(120, -170, 60, 55, 30), { fill: PAL.kraftL, line: 4, seed: 812 });
  shape(g, spline([[90, -210], [70, -150], [96, -130], [112, -190]], true, 5), { fill: PAL.brown, line: 3.4, seed: 813 });
  shape(g, ellipse(176, -160, 16, 12, 14), { fill: PAL.ink, line: 0, off: [0, 0] });
  shape(g, ellipse(138, -182, 7, 10, 12), { fill: PAL.ink, line: 0, off: [0, 0] });
  if (sad) ink(g, [[124, -206], [150, -198]], 4, { seed: 814 });   // brows up: sympathy
  g.restore(); }
function guyInBush(t, x, y, o = {}) {   // only his head and the phone stick out of the bush
  const arm = { a1: -1.25, a2: -1.75 };
  person({ c: GUY, x, y: y + 180, s: 1.15, dir: -1, view: 'q', face: o.face || 'focus', armF: arm, handF: 'grip' }, t, { clipY: y - 120 });
  const h = handAt({ x, y: y + 180, s: 1.15, dir: -1, armF: arm }, 'F'); phone(h[0] - 10, h[1] - 34, .8, .2);
  bush(x + 20, y + 40, 1, 41);
}
function render(s, lt, k, t) {
  const sc = s.scene, talk = talking(s, lt), g2 = s.who === 'g';
  if (sc === 'ask' || sc === 'shot1') {
    const close = sc === 'shot1' && g2;
    begin(t, close ? { zoom: 1.5, cx: 420, cy: 1150 } : { zoom: 1.15, cx: 540, cy: 1250 }); park();
    const her = Object.assign({ c: GIRL, x: 340, y: 1820, s: 1.3, dir: 1, view: 'front', face: close ? 'focus' : 'happy' }, close ? { armF: { a1: -.2, a2: 1.4 }, handF: 'point' } : POSE);
    person(her, t, { talk: g2 && talk });
    const hp = { c: GUY, x: close ? 880 : 800, y: 1820, s: 1.3, dir: -1, view: 'q', face: sc === 'ask' && !g2 ? 'happy' : 'neutral', armF: { a1: -.3, a2: -1.35 }, handF: 'grip' };
    person(hp, t, { ph: .8 }); const h = handAt(hp, 'F'); phone(h[0] - 12, h[1] - 36, .9, .15);
    if (sc === 'shot1' && !g2) { const f = Math.max(0, 1 - Math.abs(lt - .7) / .35); if (f > 0) { g.save(); g.globalAlpha = f * .85; shape(g, starPts(h[0] - 12, h[1] - 60, 260, 12, .5, .1), { fill: PAL.white, line: 0, off: [0, 0] }); g.restore(); } }
    if (close) { shape(g, starPts(560, 820, 100, 10, .55, .1), { fill: PAL.coral, line: 4, seed: 70 }); label('↓', 560, 824, 110, PAL.white); }
    return present();
  }
  if (sc === 'bush') {   // squat → lie in the grass → into the bush
    begin(t, { zoom: 1.15, cx: 540, cy: 1250 }); park();
    person(Object.assign({ c: GIRL, x: 300, y: 1820, s: 1.3, dir: 1, view: 'front', face: 'happy' }, POSE), t);
    const st = k < .34 ? 0 : k < .67 ? 1 : 2;
    if (st === 0) { const p = { c: GUY, x: 760, y: 1820, s: 1.3, dir: -1, view: 'q', face: 'focus', kneel: true, armF: { a1: -.25, a2: -.5 }, handF: 'grip' }; person(p, t); const h = handAt(p, 'F'); phone(h[0] - 12, h[1] - 36 + 150 * 1.3, .9, .15); }
    if (st === 1) { const lp = { c: GUY, x: 0, y: 0, s: 1.2, dir: 1, view: 'q', face: 'focus', armF: { a1: .2, a2: -.2 }, handF: 'grip', shadow: false };
      g.save(); g.translate(1060, 1790); g.rotate(-Math.PI / 2); person(lp, t); g.restore();
      const hl = handAt(lp, 'F'); phone(1060 + hl[1], 1790 - hl[0] - 40, .9, 0); }
    if (st === 2) guyInBush(t, 800, 1640);
    else bush(st === 1 ? 1140 : 860, 1700, .9, 42);
    return present();
  }
  if (sc === 'dog') {    // a grandma walks her dog past; the dog looks at him with sympathy
    begin(t, { zoom: 1.2, cx: 560, cy: 1250 }); park();
    guyInBush(t, 820, 1640, { face: 'wow' });
    const x = lerp(-120, 420, eio(clamp(lt / 3.2))), bob = Math.floor(t * 6) % 2 * 5;
    const gran = { c: GRAN, x, y: 1840 - bob, s: 1.2, dir: 1, view: 'q', face: 'neutral', armF: { a1: 1.2, a2: .7 }, handF: 'grip' };
    person(gran, t, { ph: 2 });
    const h = handAt(gran, 'F'), dx = x + 240;
    dog(dx, 1860, 1.1, t, true);
    ink(g, spline([[h[0], h[1]], [(h[0] + dx + 150) / 2, h[1] + 160], [dx + 150, 1860 - 140]], false, 6), 3.4, { seed: 830, taper: false });
    return present();
  }
  if (sc === 'count') {  // 147 shots, he is all in leaves
    begin(t, { zoom: 1.35, cx: 540, cy: 1200 }); park({ burst: [540, 760, 380] });
    const n = Math.round(lerp(1, 147, eio(clamp(lt / (s.dur * .8)))));
    shape(g, rrect(340, 500, 400, 170, 40), { fill: PAL.white, line: 5, seed: 900 }); label(String(n), 540, 590, 120, PAL.coralD);
    const p = { c: GUY, x: 540, y: 1880, s: 1.45, dir: 1, view: 'front', face: 'neutral', armF: { a1: 1.3, a2: 1.4 }, handF: 'grip' }; person(p, t);
    const h = handAt(p, 'F'); phone(h[0], h[1] - 20, 1, .1);
    leaves([[470, 1060, .4], [610, 1080, -.6], [520, 1320, .9], [600, 1450, -.3], [460, 1530, .2], [640, 1690, .7], [455, 1000, -.9]]);
    return present();
  }
  if (sc === 'scroll') { // she scrolls the photos; then picks the very first one
    begin(t, { zoom: 1.45, cx: 480, cy: 1180 }); park();
    const p2 = { c: GUY, x: 760, y: 1840, s: 1.3, dir: -1, view: 'q', face: g2 ? 'wow' : 'neutral' }; person(p2, t, { ph: .3 });
    leaves([[740, 1130, .5], [790, 1300, -.4], [720, 1500, .8]]);
    const her = { c: GIRL, x: 380, y: 1840, s: 1.3, dir: 1, view: 'q', face: g2 ? (k > .7 ? 'happy' : 'focus') : 'neutral', look: [4, 8], armF: { a1: 1.0, a2: -1.2 }, handF: 'grip' };
    person(her, t, { talk: g2 && talk }); const h = handAt(her, 'F');
    const scr = Math.floor(lt * 1.1) % 3; phone(h[0] + 14, h[1] - 34, 1, -.2, [PAL.blueL, PAL.avocadoL, PAL.coralL][scr]);
    return present();
  }
  begin(t, { zoom: 1.35, cx: 540, cy: 1200 }); park({ burst: [540, 1000, 520] });
  person({ c: GUY, x: 540, y: 1880, s: 1.45, dir: 1, view: 'front', face: 'happy', armF: { a1: -.4, a2: -.9 }, armB: { a1: 3.5, a2: 4.0 }, handF: 'open', handB: 'open' }, t);
  leaves([[470, 1060, .4], [610, 1080, -.6], [520, 1320, .9], [600, 1450, -.3]]);
  return present();
}
start({ render, mins: { end: 3 }, bubbles: ['#A7AE5B', '#E0607E', '#E8B43A'] });
