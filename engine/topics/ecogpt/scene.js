// «Как один человек обманул всех зелёных» — EcoGPT. Style 42 «Миниатюра» (tilt-shift model world)
import { THREE, start, L, clamp, lerp, sm, eio, card } from '../../core.js';
import { world, shoot, rbox, grp, mesh, M, building, tree, person, posePerson, ground, water } from '../../lemo/kit42.js';

const S = world({ shadowR: 120, fogNear: 300, fogFar: 1200 });
const hemi = S.children.find(o => o.isHemisphereLight), sun = S.userData.sun;
const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const V3 = THREE.Vector3;
ground(S, '#86bf62', 1600);

// ---------- town around the plaza ----------
const plaza = mesh(new THREE.BoxGeometry(70, .3, 50), M('#d9d2c3'), S, 0, .15, 10); plaza.castShadow = false;
const cols = ['#e9dfcc', '#d9c2a4', '#c7d3dc', '#e6d2c8', '#d6d9c4', '#f0d9b5'];
[[-50, -10], [-50, 20], [50, -10], [50, 22], [-30, 48], [30, 48], [-5, 52]].forEach(([x, z], i) => building(S, 14, 12, 8 + (i % 3) * 3, x, z, { wall: cols[i % 6], seed: i + 3 }));
[[-62, 40], [62, 38], [-40, -36], [40, -36]].forEach(([x, z], i) => tree(S, x, z, 1.1, '#3f8a3a'));

// ---------- EcoGPT HQ: an ordinary grey server hall under a green "eco" shell ----------
const HQ = grp(S, 0, 0, -12);
rbox(HQ, 22, 7, 14, '#8d9196', 0, 0, 0); for (let i = 0; i < 5; i++) rbox(HQ, 2.6, 1.4, .3, '#3c4248', -8 + i * 4, 4, 7);   // grey box + vents
const shell = grp(HQ); rbox(shell, 23, 7.6, 15, '#5cae62', 0, 0, 0); rbox(shell, 23.6, .6, 15.6, '#2f8a3e', 0, 7.6, 0);
const leaf = grp(shell, 0, 9.4, 0); for (const s of [-1, 1]) { const m = mesh(new THREE.SphereGeometry(2.2, 18, 12), M('#7ad06a'), leaf, s * 1.3, 1.2, 0); m.scale.set(.55, 1.15, .22); m.rotation.z = -s * .55; }
rbox(leaf, .25, 2.4, .25, '#2f6b2a', 0, -.6, 0);
const doorM = M('#ffe7a8', { emissive: '#ffcf6a', emissiveIntensity: 0 }); rbox(shell, 4, 4, .3, doorM, 0, 0, 7.6);
// solar field + turbines (big, slow)
const solar = grp(S, -26, 0, -20); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const p = rbox(solar, 4, .2, 2.6, M('#22406e', { roughness: .3, metalness: .3 }), c * 4.6 - 7, 1.2, r * 3.6 - 3.6); p.rotation.x = -.45; rbox(solar, .25, 1.2, .25, '#9aa0a6', c * 4.6 - 7, 0, r * 3.6 - 3.6); }
const turbines = [[26, -24], [36, -16]].map(([x, z]) => { const g = grp(S, x, 0, z); mesh(new THREE.CylinderGeometry(.35, .6, 16, 10), M('#f2f2ee'), g, 0, 8, 0); const hub = grp(g, 0, 16, .8); for (let b = 0; b < 3; b++) { const bl = rbox(hub, .7, 6.5, .2, '#f2f2ee', 0, 0, 0); bl.position.set(0, 0, 0); bl.geometry.translate(0, 3.25, 0); bl.position.y = 0; bl.rotation.z = b * Math.PI * 2 / 3; } return hub; });
// the suit man on the HQ steps + a podium
const boss = person(S, 0, -3.6, '#1d1d22', { s: 1.35, legs: '#1d1d22', hair: '#3a2a20' });
rbox(S, 3, 1, 2, '#2f8a3e', 0, 0, -2.4);
// coins (big, smooth gold discs) piling next to HQ
const coinM = M('#f2c230', { metalness: .5, roughness: .35 });
const coins = []; for (let i = 0; i < 60; i++) { const ring = Math.floor(i / 12), a = (i % 12) / 12 * Math.PI * 2 + ring; const c = mesh(new THREE.CylinderGeometry(.9, .9, .32, 24), coinM, S, 14 + Math.cos(a) * (1.4 + ring * .2) * (i % 3 ? 1 : .2), 0, 2 + Math.sin(a) * (1.4 + ring * .2) * (i % 3 ? 1 : .2)); c.userData.y = .16 + Math.floor(i / 3) * .32; c.userData.i = i; coins.push(c); }
// lake with a pipe to HQ (fresh water)
const LX = -70, LZ = -50, lake = water(S, 40, 30, LX, 1.2, LZ); for (const [w, d, x, z] of [[43, 1.5, 0, 15.75], [43, 1.5, 0, -15.75], [1.5, 30, 20.75, 0], [1.5, 30, -20.75, 0]]) rbox(S, w, 1.6, d, '#bdb7ad', LX + x, 0, LZ + z); const lakeBed = mesh(new THREE.BoxGeometry(40, .2, 30), M('#b49a6a'), S, LX, .3, LZ); lakeBed.castShadow = false;
const pipe = mesh(new THREE.CylinderGeometry(.8, .8, 50, 14), M('#9aa0a6'), S, -36, 2.6, -36); pipe.rotation.z = Math.PI / 2; pipe.rotation.y = -.45;
// a huge phone billboard on the plaza
const phone = grp(S, -18, 0, 16, .35); rbox(phone, 7, 13, .8, '#16181d', 0, 1, 0, 0, .6); const scr = rbox(phone, 6, 11, .2, M('#bff0c0', { emissive: '#7ad06a', emissiveIntensity: .25 }), 0, 2, .45);
const pleaf = grp(phone, 0, 7.5, .7); for (const s of [-1, 1]) { const m = mesh(new THREE.SphereGeometry(1.2, 16, 10), M('#2f8a3e'), pleaf, s * .7, 0, 0); m.scale.set(.55, 1.15, .2); m.rotation.z = -s * .55; }
rbox(phone, .6, 2, .6, '#16181d', 0, -1, 0);

// ---------- newsroom (cut-away office) ----------
const NZ = -130, news = grp(S, 0, 0, NZ);
rbox(news, 36, .4, 22, '#c9b89a', 0, 0, 0); rbox(news, 36, 9, .6, '#e6d2c8', 0, 0, -11); rbox(news, .6, 9, 22, '#e6d2c8', -18, 0, 0);
for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = -12 + c * 8, z = -4 + r * 7; rbox(news, 4, 1.4, 2.2, '#8a6a48', x, .4, z); rbox(news, 1.6, 1.1, .2, '#1d1d22', x, 1.8, z - .6); }
const paper = grp(S, 0, 0, NZ + 4); rbox(paper, 9, .12, 12, '#f7f3e8', 0, 0, 0); for (let i = 0; i < 6; i++) rbox(paper, 5, .05, .3, '#9aa0a6', 0, .12, -3 + i * 1.1);
const stamp = rbox(paper, 4.2, .1, 1.6, M('#e8463c'), 0, .18, 3);

// ---------- Finland: snow, an ordinary rented server hall ----------
const FX = 170, FZ = 0, fin = grp(S, FX, 0, FZ);
mesh(new THREE.BoxGeometry(110, .3, 90), M('#f4f6f8'), fin, 0, .15, 0).castShadow = false;
rbox(fin, 30, 8, 16, '#a9aeb4', 0, 0, 0); rbox(fin, 30.6, .6, 16.6, '#7d8389', 0, 8, 0);
const rackM = M('#2a2d33'), ledM = M('#7ad0ff', { emissive: '#4ab8ff', emissiveIntensity: .9 });
for (let i = 0; i < 6; i++) { rbox(fin, 3, 5, 1.6, rackM, -12.5 + i * 5, .3, 8.6); for (let j = 0; j < 4; j++) rbox(fin, 2.2, .18, .1, ledM, -12.5 + i * 5, 1 + j * 1.1, 9.45); }
[[-30, -20], [-36, 10], [30, -24], [38, 14], [-24, 30], [26, 32], [-44, -6], [44, -2]].forEach(([x, z], i) => { const g = grp(fin, x, 0, z); mesh(new THREE.CylinderGeometry(.3, .4, 2, 8), M('#5a3a22'), g, 0, 1, 0); mesh(new THREE.ConeGeometry(2.4, 5.5, 9), M('#2f5a3a', { flatShading: true }), g, 0, 4.5, 0); mesh(new THREE.ConeGeometry(1.7, 3.2, 9), M('#f4f6f8'), g, 0, 6.6, 0); });

// ---------- Africa: savanna, people planting saplings ----------
const AX = -170, AZ = 0, afr = grp(S, AX, 0, AZ);
mesh(new THREE.BoxGeometry(110, .3, 90), M('#d9a868'), afr, 0, .15, 0).castShadow = false;
function acacia(p, x, z, s = 1) { const g = grp(p, x, 0, z); mesh(new THREE.CylinderGeometry(.25 * s, .35 * s, 4 * s, 8), M('#5a3a22'), g, 0, 2 * s, 0); const c = mesh(new THREE.CylinderGeometry(3 * s, 2.6 * s, .9 * s, 12), M('#6c9a3a', { flatShading: true }), g, 0, 4.3 * s, 0); return g; }
[[-36, -26], [34, -30], [-40, 24], [40, 26]].forEach(([x, z]) => acacia(afr, x, z, 1.3));
const saplings = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) { const t = tree(afr, -24 + c * 6, -12 + r * 6, .55, '#4f9a3a'); t.userData.d = (c + r * 2) / 26; saplings.push(t); }

// ---------- dusk forest that grows around HQ for the finale ----------
const forest = []; for (let i = 0; i < 90; i++) { const a = rnd(i, 1) * Math.PI * 2, r = 30 + rnd(i, 2) * 60; const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r; if (Math.abs(x) < 38 && z > -6 && z < 58) continue; const t = tree(S, x, z, .8 + rnd(i, 3) * .5, ['#3f8a3a', '#4f9a3a', '#2f7a3a'][i % 3]); t.userData.d = r / 90; forest.push(t); }

// ---------- people ----------
const TOPS = ['#3f8f5a', '#5fbf5a', '#2f7a3a', '#7ad06a'];                  // eco-activists in green
const SIGN = M('#f4f4f0'), SIGNG = M('#7ad06a'), SIGNR = M('#e8463c');
const N = 220, P = [];
for (let i = 0; i < N; i++) { const p = person(S, 0, 0, TOPS[i % 4], { hair: ['#2b1d18', '#5a3a22', '#c99a5b', '#1d1d22'][i % 4] }); const st = grp(p, .6, 0, 0); rbox(st, .12, 2.6, .12, '#6b4a2e', 0, 1.2, 0); const bd = rbox(st, 1.6, 1.1, .1, SIGNG, 0, 3.4, 0); p.userData.sign = st; p.userData.board = bd; P.push(p); }
const JT = ['#2f5fb3', '#f4f4f0', '#c7d3dc', '#e8463c'];
const press = Array.from({ length: 10 }, (_, i) => person(S, 0, 0, JT[i % 4], { hair: ['#2b1d18', '#c99a5b'][i % 2] }));
const hide = () => { for (const p of P) p.position.set(0, -999, 0); for (const p of press) p.position.set(0, -999, 0); };
// standing crowd on a jittered grid, facing a point; signs optional, colour switch
function crowd(i0, n, cx, cz, w, d, fx, fz, t, o = {}) {
  const cols = Math.max(1, Math.round(Math.sqrt(n * w / d))), rows = Math.ceil(n / cols), sx = w / cols, sz = d / rows;
  for (let j = 0; j < n; j++) { const p = P[i0 + j]; if (!p) break; const c = j % cols, r = Math.floor(j / cols);
    const x = cx - w / 2 + (c + .5) * sx + (rnd(i0 + j, 1) - .5) * sx * .35, z = cz - d / 2 + (r + .5) * sz + (rnd(i0 + j, 2) - .5) * sz * .35;
    p.position.set(x, o.y ?? .3, z); p.rotation.y = Math.atan2(fx - x, fz - z);
    const sg = !!(o.signs && (j % 3 === 0)); p.userData.sign.visible = sg; if (sg) p.userData.board.material = o.red && rnd(j, 7) < o.red ? SIGNR : SIGNG;
    posePerson(p, o.cheer ? { armsUp: .4 + .4 * Math.abs(Math.sin(t * 4 + j)) } : o.wave && j % 4 === 0 ? { wave: t * 3 + j } : {}); }
  return i0 + n;
}
function walkers(i0, n, x0, x1, z, t, speed) { for (let j = 0; j < n; j++) { const p = P[i0 + j]; if (!p) break; const span = x1 - x0, u = ((j / n) + t * speed / Math.abs(span)) % 1; p.position.set(x0 + u * span, .3, z + (j % 2 ? 1.2 : -1.2)); p.rotation.y = span > 0 ? Math.PI / 2 : -Math.PI / 2; p.userData.sign.visible = false; posePerson(p, { walk: t * 7 + j }); } return i0 + n; }

function sky(dusk) {
  S.background.set(dusk ? '#f2a27a' : '#9cc3e6'); S.fog.color.set(dusk ? '#f2a27a' : '#9cc3e6');
  sun.color.set(dusk ? '#ffb070' : '#fff1d6'); sun.intensity = dusk ? 2.2 : 3; hemi.color.set(dusk ? '#ffe0cc' : '#bcd6ff'); hemi.intensity = dusk ? .9 : 1.1;
  doorM.emissiveIntensity = dusk ? 1.6 : 0;
}
function setCoins(n) { coins.forEach((c, i) => { const v = clamp(n - i); c.visible = v > 0; c.position.y = c.userData.y + (1 - eio(v)) * 6; }); }

function render(s, lt, k, t) {
  const sc = s.scene, u = eio(clamp(lt / s.dur));
  hide(); sky(0); shell.position.y = 0; setCoins(0); boss.position.set(0, .9, -3.6); boss.rotation.y = 0; posePerson(boss, {});
  turbines.forEach((h, i) => h.rotation.z = t * .6 + i);
  lake.position.y = 1.2; scr.material.emissiveIntensity = .25; paper.position.y = -50; stamp.visible = false;
  saplings.forEach(p => p.scale.setScalar(1)); forest.forEach(p => p.scale.setScalar(.001));
  const BP = new V3(0, 2.4, -3.6);

  if (sc === 'hook') {   // the suit man in front of a cheering green crowd
    let i = crowd(0, 120, 0, 20, 52, 26, 0, -4, t, { signs: true, cheer: true });
    posePerson(boss, { wave: t * 3 });
    return shoot(S, new V3(lerp(34, 22, u), lerp(26, 18, u), lerp(58, 42, u)), new V3(0, 3, 4), { subject: BP, fov: 32, aper: 12 });
  }
  if (sc === 'panic') {  // the lake drains towards the server hall, protesters with signs
    lake.position.y = lerp(1.2, .45, u);
    crowd(0, 70, LX + 30, LZ + 26, 34, 14, LX, LZ, t, { signs: true });
    const c = new V3(LX + 8, 2, LZ + 2);
    return shoot(S, new V3(LX + lerp(40, 34, u), lerp(52, 46, u), LZ + lerp(70, 62, u)), new V3(LX + 6, 0, LZ + 4), { subject: new V3(LX + 6, 0, LZ + 4), fov: 34, aper: 16, bandW: .12 });
  }
  if (sc === 'app') {    // the green phone billboard lights up; the crowd turns to it
    scr.material.emissiveIntensity = .25 + sm(.1, .5, k) * 1.2;
    crowd(0, 90, 6, 22, 40, 20, -18, 16, t, { wave: true });
    return shoot(S, new V3(lerp(8, 2, u), lerp(12, 10, u), lerp(46, 40, u)), new V3(-16, 7, 16), { subject: new V3(-14, 6, 18), fov: 30, aper: 12 });
  }
  if (sc === 'promise') { // HQ with solar panels and turbines; saplings pop up around the plaza edge
    crowd(0, 60, 0, 24, 44, 14, 0, -6, t, { cheer: true });
    forest.forEach((p, i) => { if (i % 3) return; const a = clamp((k - .3 - p.userData.d * .5) / .2); p.scale.setScalar(Math.max(.001, eio(a) * .8)); });
    return shoot(S, new V3(lerp(-56, -44, u), 40, lerp(52, 44, u)), new V3(-6, 2, -14), { subject: new V3(-14, 2, -18), fov: 32, aper: 16, bandW: .1 });
  }
  if (sc === 'money') {  // coins fall onto a growing pile next to the boss
    setCoins(lerp(0, 60, sm(.05, .85, k))); boss.rotation.y = .9; posePerson(boss, { armsUp: .3 });
    crowd(0, 50, 0, 26, 40, 12, 0, -6, t, {});
    return shoot(S, new V3(lerp(30, 24, u), 12, lerp(18, 14, u)), new V3(10, 2.5, -1), { subject: new V3(13, 2, 1), fov: 30, aper: 10 });
  }
  if (sc === 'nda') {    // the newsroom: a contract slides in and gets a red stamp
    press.forEach((p, i) => { const r = Math.floor(i / 4) % 2, c = i % 4; p.position.set(-12 + c * 8, .4, NZ - 2.2 + r * 7); p.rotation.y = Math.PI; posePerson(p, i % 3 === 0 ? { wave: t * 2 + i } : {}); });
    paper.position.set(lerp(30, 0, eio(clamp(lt / 1.2))), 1.2, NZ + 12); paper.rotation.set(0, 0, 0);
    stamp.visible = lt > s.vo0 - s.start + s.vd * .62;
    return shoot(S, new V3(lerp(4, 2, u), lerp(26, 22, u), NZ + lerp(32, 28, u)), new V3(0, 1, NZ + 6), { subject: new V3(0, 1.2, NZ + 12), fov: 32, aper: 10 });
  }
  if (sc === 'servers') { // snowy Finland: journalists walk up to a plain grey hall with blinking-free racks
    press.forEach((p, i) => { const z = lerp(36, 16, u) + (i % 2) * 1.6; p.position.set(FX - 7 + i * 1.6, .3, FZ + z + (i % 3) * .8); p.rotation.y = Math.PI; posePerson(p, { walk: t * 6 + i }); });
    return shoot(S, new V3(FX + lerp(34, 26, u), 22, FZ + lerp(66, 56, u)), new V3(FX, 3, FZ + 10), { subject: new V3(FX - 1, 1.5, FZ + 24), fov: 32, aper: 14 });
  }
  if (sc === 'scam') {   // the green shell lifts off — a plain grey box; the crowd's signs turn red
    shell.position.y = eio(sm(.05, .5, k)) * 14;
    crowd(0, 120, 0, 22, 52, 24, 0, -12, t, { signs: true, red: sm(.3, .8, k) });
    return shoot(S, new V3(lerp(20, 16, u), lerp(22, 26, u), lerp(42, 46, u)), new V3(0, 4, -8), { subject: new V3(0, 4, -12), fov: 32, aper: 14 });
  }
  if (sc === 'trees') {  // savanna: people plant saplings, they grow slowly
    saplings.forEach(p => { const a = clamp((k * 1.3 - p.userData.d)); p.scale.setScalar(lerp(.45, 1, eio(a))); });
    let i = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const p = P[i++]; p.position.set(AX - 21 + c * 6, .3, AZ - 9 + r * 6); p.rotation.y = -.6; p.userData.sign.visible = false; posePerson(p, { armsUp: .15 + .15 * Math.abs(Math.sin(t * 2 + i)) }); }
    return shoot(S, new V3(AX + lerp(30, 24, u), 26, AZ + lerp(46, 40, u)), new V3(AX, 1, AZ), { subject: new V3(AX + 2, 1.2, AZ + 2), fov: 32, aper: 14 });
  }
  // WOW (wow/end): dusk, the HQ glows, coins pile up, a forest rises around it, camera pulls far back
  sky(1); setCoins(60); posePerson(boss, { armsUp: .3 });
  forest.forEach(p => { const a = clamp(((sc === 'end' ? 1 : k * 1.4) - p.userData.d * .8) / .5); p.scale.setScalar(Math.max(.001, eio(a))); });
  crowd(0, 80, 0, 24, 48, 18, 0, -6, t, {});
  if (sc === 'end') return shoot(S, new V3(-20, 120, 150), new V3(0, 0, -10), { subject: new V3(0, 3, -10), fov: 30, aper: 24, bandW: .12 });
  const r = lerp(55, 140, u), h = lerp(24, 75, u), a = lerp(.9, 1.15, u);
  return shoot(S, new V3(Math.cos(a) * r, h, -12 + Math.sin(a) * r), new V3(0, 3, -10), { subject: new V3(0, 3, -10), fov: 32, aper: lerp(10, 24, u), bandW: lerp(.075, .1, u) });
}
function cards(s, lt, k) {
  const a = sm(.15, .45, lt);
  if (s.card === 'money') return card(330, `<div class="t">EcoGPT Pro</div><div class="v">$10 <small>${L('/мес', '/mo')}</small></div><div class="n">${L('ChatGPT Plus — $20 · 1 млн скачиваний', 'ChatGPT Plus — $20 · 1M downloads')}</div>`, a);
  if (s.scene === 'nda') return card(330, `<div class="t">${L('ответ компании', "the company's answer")}</div><div class="v" style="font-size:64px">${L('ПОДПИШИТЕ NDA', 'SIGN AN NDA')}</div><div class="n">VRT NWS, 2026</div>`, sm(.4, .7, k));
  if (s.scene === 'scam') return card(330, `<div class="t">${L('в отзывах', 'in the reviews')}</div><div class="v" style="color:#ff4b5c">${L('СКАМ?', 'SCAM?')}</div>`, sm(.62, .8, k));
  return '';
}
start({ render, cards, mins: { hook: 3.2, scam: 4, wow: 7, end: 4 }, bubbles: ['#4fb35a', '#f2c230', '#1d1d22'] });
