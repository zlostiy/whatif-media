// «Какое платье?» — жизненный скетч, стиль 48 «Мультик 50-х»
import { start, clamp, lerp, sm, eio, EN } from '../../core.js';
import { g, begin, present, person, planes, pill, balloon, label, dress, PAL, shape, ink, ellipse, spline, rrect, rect, starPts, handAt, GUY, GIRL } from '../../lemo/k48/kit48.js';

const RED = ['#D8343F', '#A92530'], BLUE = ['#3459C9', '#243F95'];
const UP = { armF: { a1: -.35, a2: -1.25 }, armB: { a1: 3.5, a2: 4.4 }, handF: 'grip', handB: 'grip' };
const talking = (s, lt) => lt > s.vo0 - s.start - .05 && lt < s.vo0 - s.start + s.vd;

function shop(curtain = true) {
  planes(PAL.blueL, PAL.kraftL, 1500, { burst: [760, 700, 380] });
  // fitting-room: a mustard curtain panel with soft folds (left), a tall mirror (right)
  if (curtain) { shape(g, rect(40, 380, 260, 1120), { fill: PAL.mustard, line: 4.2, seed: 11, shade: [{ pts: rect(200, 380, 100, 1120), color: PAL.mustardD, alpha: .5 }] });
    for (const x of [100, 160, 230]) ink(g, [[x, 420], [x + 6, 1480]], 3, { seed: x, color: PAL.mustardD, taper: false });
    ink(g, [[10, 380], [330, 380]], 9, { seed: 12, taper: false }); }
  shape(g, rrect(860, 520, 170, 900, 80), { fill: PAL.kraft, line: 4, seed: 13 }); shape(g, rrect(882, 545, 126, 850, 64), { fill: PAL.chrome, line: 2.5, seed: 14, shade: [{ pts: [[882, 700], [1008, 560], [1008, 640], [882, 780]], color: PAL.white, alpha: .5 }] });
}
function girlWithDresses(x, y, s, t, o = {}) {
  const pose = Object.assign({ c: GIRL, x, y, s, dir: 1, view: 'front', face: o.face || 'happy' }, o.pose || UP);
  const a = handAt(pose, 'B'), b = handAt(pose, 'F');
  person(pose, t, { talk: o.talk });
  if (o.red !== false) dress(a[0], a[1] + 8 * s, RED[0], RED[1], 300, s * .95, .05);
  if (o.blue !== false) dress(b[0], b[1] + 8 * s, BLUE[0], BLUE[1], 320, s * .95, -.05);
}
function render(s, lt, k, t) {
  const sc = s.scene, talk = talking(s, lt);
  if (sc === 'enter') {
    const g2 = s.who === 'g'; begin(t, g2 ? { zoom: 1.35, cx: 470, cy: 1080 } : { zoom: 1.2, cx: 540, cy: 1230 });
    shop();
    const gx = g2 ? 400 : lerp(250, 400, eio(clamp(lt / 1.2)));
    person({ c: GUY, x: 790, y: 1800, s: 1.35, dir: -1, view: 'q', face: g2 ? 'wow' : 'neutral' }, t, { ph: 1.3 });
    girlWithDresses(gx, 1790, 1.35, t, { talk: g2 && talk });
    return present();
  }
  if (sc === 'exam') {   // close-up: the question becomes an exam
    begin(t, { zoom: 2.1, cx: 560, cy: 1150 });
    planes(PAL.coralL, PAL.coral, 1600, { burst: [560, 1080, 420] });
    // an exam sheet flies in behind his head
    const u = eio(clamp((lt - .9) / .6)); if (u > 0) { const y = lerp(1500, 930, u); shape(g, rrect(600, y, 190, 260, 10), { fill: PAL.white, line: 4, seed: 40 });
      for (let i = 0; i < 4; i++) ink(g, [[622, y + 60 + i * 50], [768, y + 60 + i * 50]], 4, { seed: 41 + i, taper: false, color: PAL.blueD });
      label('A+', 695, y + 30, 46, PAL.coralD); }
    person({ c: GUY, x: 520, y: 1900, s: 1.5, dir: 1, view: 'front', face: 'wow', look: [0, -3] }, t);
    return present();
  }
  if (sc === 'think') {  // he weighs red vs blue: two big dresses float, he looks from one to the other
    begin(t, { zoom: 1.25, cx: 540, cy: 1150 });
    planes(PAL.tealL, PAL.teal, 1650);
    const look = lt < 1.4 ? -14 : lt < 2.8 ? 14 : lt < 4 ? -14 : 0;
    const pick = sm(.72, .82, k);
    dress(260, 700, RED[0], RED[1], 300, 1.25 + pick * .15, -.08); dress(820, 700, BLUE[0], BLUE[1], 320, 1.25 - pick * .1, .08);
    person({ c: GUY, x: 540, y: 1880, s: 1.5, dir: 1, view: 'front', face: pick > .5 ? 'happy' : 'focus', look: [look, 0], armF: { a1: 2.1, a2: -1.75 }, handF: 'grip' }, t);
    if (pick > 0) { g.save(); g.globalAlpha = pick; shape(g, starPts(260, 640, 120, 8, .5, .2), { fill: PAL.mustard, line: 4, seed: 60, alpha: .9 });
      ink(g, [[200, 640], [245, 690], [330, 570]], 16, { seed: 61, taper: false, color: PAL.ink }); g.restore(); }
    return present();
  }
  if (sc === 'pause') {  // her three-second silence (a big clock) → "why not the blue one?"
    const g2 = s.who === 'g'; begin(t, { zoom: 1.7, cx: 470, cy: 1150 });
    planes(PAL.plum, '#4F3350', 1700);
    if (!g2) { const a = -Math.PI / 2 + Math.min(3, Math.floor(lt / .5)) * (TAUQ); shape(g, ellipse(650, 720, 100, 100, 48), { fill: PAL.white, line: 5, seed: 70 });
      for (let i = 0; i < 12; i++) { const q = i / 12 * Math.PI * 2; ink(g, [[650 + Math.cos(q) * 78, 720 + Math.sin(q) * 78], [650 + Math.cos(q) * 90, 720 + Math.sin(q) * 90]], 5, { seed: 71 + i, taper: false }); }
      ink(g, [[650, 720], [650 + Math.cos(a) * 70, 720 + Math.sin(a) * 70]], 8, { seed: 90, taper: false, color: PAL.coralD }); }
    girlWithDresses(420, 1790, 1.35, t, { face: 'focus', talk: g2 && talk, red: !g2, pose: g2 ? { armF: { a1: .2, a2: -.6 }, handF: 'grip', armB: { a1: 1.9, a2: 1.7 } } : UP });
    return present();
  }
  if (sc === 'trap') {
    const g2 = s.who === 'g';
    begin(t, g2 ? { zoom: 1.6, cx: 420, cy: 1150 } : { zoom: 1.15, cx: 560, cy: 1200 });
    shop(false);
    person({ c: GUY, x: g2 ? 900 : 780, y: 1800, s: 1.35, dir: -1, view: 'q', face: g2 ? 'wow' : 'happy', armF: g2 ? undefined : { a1: -1.0, a2: -1.6 }, handF: 'point' }, t, { talk: !g2 && talk, ph: .7 });
    girlWithDresses(330, 1790, 1.35, t, { face: g2 ? 'focus' : 'neutral', talk: g2 && talk, pose: { armF: { a1: .9, a2: 2.2 }, armB: { a1: 2.2, a2: .9 }, handF: 'grip', handB: 'grip' }, red: false, blue: false });
    if (g2) { shape(g, starPts(330, 760, 150, 10, .55, .1), { fill: PAL.coral, line: 4, seed: 99 }); label('?!', 330, 760, 110, PAL.white); }
    return present();
  }
  if (sc === 'exit') {   // out of the shop: she has both dresses, he has the bags and the receipt
    const u = eio(k); begin(t, { zoom: 1, cx: 540, cy: 960 });
    planes(PAL.mustardL, PAL.chrome, 1560, { burst: [300, 560, 300] });
    // shop front
    shape(g, rect(-200, 400, 640, 1160), { fill: PAL.blue, line: 4.2, seed: 120 }); shape(g, rect(-120, 900, 380, 660), { fill: PAL.blueL, line: 4, seed: 121 });
    shape(g, rrect(-160, 470, 560, 150, 20), { fill: PAL.coral, line: 4, seed: 122 }); label(EN ? 'DRESSES' : 'ПЛАТЬЯ', 120, 548, 74, PAL.white);
    const x = lerp(260, 640, u), bob = Math.floor(t * 6) % 2 * 6;
    // girl in front, carrying two dresses on her arm, happy
    person({ c: GIRL, x: x + 210, y: 1820 - bob, s: 1.3, dir: 1, view: 'q', face: 'happy', armF: { a1: 1.2, a2: .2 }, handF: 'grip' }, t);
    dress(x + 280, 1440 - bob, RED[0], RED[1], 300, .8, .3); dress(x + 300, 1450 - bob, BLUE[0], BLUE[1], 320, .8, .4);
    // him behind with two bags and a long receipt
    const pg = { c: GUY, x: x - 140, y: 1820 - (bob ? 0 : 6), s: 1.3, dir: 1, view: 'q', face: 'neutral', armF: { a1: 1.45, a2: 1.5 }, armB: { a1: 1.7, a2: 1.6 }, handF: 'grip', handB: 'grip' };
    person(pg, t, { ph: .4 });
    const hf = handAt(pg, 'F'), hb = handAt(pg, 'B');
    for (const [h, c, sd] of [[hb, RED, 140], [hf, BLUE, 150]]) { shape(g, rrect(h[0] - 60, h[1] + 20, 120, 150, 8), { fill: c[0], line: 4, seed: sd }); ink(g, spline([[h[0] - 30, h[1] + 22], [h[0], h[1] - 6], [h[0] + 30, h[1] + 22]], false, 5), 5, { seed: sd + 1, taper: false }); }
    const r = sm(.45, .75, k); if (r > 0) { const L = r * 520; shape(g, [[hf[0] + 40, hf[1] - 10], [hf[0] + 110, hf[1] - 10], [hf[0] + 110, hf[1] - 10 + L], [hf[0] + 40, hf[1] - 10 + L]], { fill: PAL.white, line: 3.4, seed: 160 });
      for (let i = 0; i * 40 < L - 30; i++) ink(g, [[hf[0] + 52, hf[1] + 20 + i * 40], [hf[0] + 98, hf[1] + 20 + i * 40]], 3, { seed: 161 + i, taper: false, color: PAL.inkSoft }); }
    return present();
  }
  // end: he turns to us and asks
  begin(t, { zoom: 1.35, cx: 540, cy: 1200 });
  planes(PAL.tealL, PAL.teal, 1700, { burst: [540, 1000, 520] });
  dress(250, 800, RED[0], RED[1], 300, 1, -.1); dress(830, 800, BLUE[0], BLUE[1], 320, 1, .1);
  person({ c: GUY, x: 540, y: 1880, s: 1.45, dir: 1, view: 'front', face: 'happy', armF: { a1: -.4, a2: -.9 }, armB: { a1: 3.5, a2: 4.0 }, handF: 'open', handB: 'open' }, t);
  return present();
}
const TAUQ = Math.PI * 2 / 12 * 3;   // the clock hand jumps one "second" (a quarter turn) at a time
start({ render, mins: { end: 3 }, bubbles: ['#E0607E', '#E8B43A', '#3FA7A0'] });
