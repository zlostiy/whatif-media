// Shared low-poly world for "rain of X" topics: street, farm, beach, river, cathedral, volcano, airport + props/animals.
import { THREE, mergeGeometries, clamp, lerp, sm, V, hash, fbm, rnd, col, T, B, add, G, Box, Sph, Cap, Cyl, dotTex, canvasTex, makeSky, points, makeHuman } from '../core.js';
const dmy = new THREE.Object3D();

// ---------------- props ----------------
export function makeCar(color = 0xff4b5c) {
  const g = new THREE.Group(); const body = T(color), dk = T(0x2b2f45);
  add(g, Box(2.2, .55, 1.05), body, [0, .55, 0], [0, 0, 0], null, .025);
  add(g, Box(1.2, .45, .95), body, [-.1, 1.02, 0], [0, 0, 0], null, .022);
  const glass = T(0x8fd8ff, { emissive: 0x2a6fb0, emissiveIntensity: .35 }); const ws = add(g, Box(.04, .38, .86), glass, [.52, 1.02, 0], [0, 0, -.35], null, 0);
  for (const z of [-.48, .48]) add(g, Box(.9, .3, .02), glass, [-.12, 1.04, z], [0, 0, 0], null, 0);
  for (const x of [-.7, .7]) for (const z of [-.52, .52]) add(g, Cyl(.24, .24, .16, 14), dk, [x, .28, z], [Math.PI / 2, 0, 0], null, .015);
  for (const z of [-.33, .33]) add(g, Sph(.08, 8, 6), B(0xfff6d8), [1.1, .62, z], [0, 0, 0], null, .008);
  g.userData = { glass, body }; return g;
}
export function makeHouse(w = 4, h = 3.2, d = 4, color = 0xffd9a8, roof = 0xff6b5c, seed = 0) {
  const g = new THREE.Group(); add(g, Box(w, h, d), T(color), [0, h / 2, 0], [0, 0, 0], null, .03);
  const rg = new THREE.CylinderGeometry(.01, w * .75, 1.6, 4, 1); rg.rotateY(Math.PI / 4); rg.scale(1, 1, d / w); add(g, rg, T(roof), [0, h + .8, 0], [0, 0, 0], null, .03);
  const wm = T(0x9fd8ff, { emissive: 0x3a7ab0, emissiveIntensity: .3 });
  for (let i = 0; i < 2; i++) for (let j = 0; j < (h > 4 ? 2 : 1); j++) { add(g, Box(.7, .8, .05), wm, [-w / 4 + i * w / 2, 1.5 + j * 1.8, d / 2 + .01], [0, 0, 0], null, .01); add(g, Box(.84, .1, .1), T(0xffffff), [-w / 4 + i * w / 2, 1.05 + j * 1.8, d / 2 + .04], [0, 0, 0], null, .006); }
  add(g, Box(.8, 1.5, .06), T(0x8a5a3a), [0, .75, d / 2 + .02], [0, 0, 0], null, .01);
  return g;
}
export function makeTree(s = 1) { const g = new THREE.Group(); add(g, Cyl(.12 * s, .16 * s, 1.4 * s, 8), T(0x8a5a3a), [0, .7 * s, 0], [0, 0, 0], null, .015); add(g, new THREE.IcosahedronGeometry(.85 * s, 0), T(0x5cc46a), [0, 1.9 * s, 0], [0, 0, 0], null, .025); add(g, new THREE.IcosahedronGeometry(.6 * s, 0), T(0x4aae5a), [.35 * s, 1.5 * s, .2 * s], [0, 0, 0], null, .02); return g; }
export function makeCow(sheep = false, goat = false) {
  const g = new THREE.Group(); const c1 = T(sheep ? 0xf6f2ea : goat ? 0xb88a5a : 0xffffff), c2 = T(goat ? 0x6a4a2a : 0x2b2f45), pk = T(0xffb0b8);
  if (sheep) { add(g, new THREE.IcosahedronGeometry(.55, 1), c1, [0, .75, 0], [0, 0, 0], [1.3, .9, 1], .02); }
  else { add(g, Cap(.32, .7, 12), c1, [0, .8, 0], [0, 0, Math.PI / 2], [1, 1, goat ? .8 : 1], .02); if (!goat) for (let i = 0; i < 3; i++) add(g, Sph(.16, 10, 8), c2, [-.3 + i * .3, .95 + (i % 2) * .1, .22 - (i % 2) * .4], [0, 0, 0], [1, .6, .5], 0); }
  const head = G(g, [.62, 1.0, 0]); add(head, Sph(.24, 14, 10), sheep ? c2 : c1, [0, 0, 0], [0, 0, 0], [1.2, .9, .9], .016); if (!sheep) add(head, Sph(.13, 10, 8), pk, [.22, -.08, 0], [0, 0, 0], [.8, .7, 1.1], .01);
  for (const z of [-.1, .1]) add(head, Sph(.035, 8, 6), B(0x140c2a), [.15, .07, z], [0, 0, 0], null, 0);
  if (!sheep) for (const z of [-.14, .14]) add(head, new THREE.ConeGeometry(.04, .2, 6), T(0xf3e6c8), [-.05, .2, z], [0, 0, z * 2], null, .006);
  if (goat) add(head, new THREE.ConeGeometry(.05, .18, 6), c2, [.12, -.24, 0], [Math.PI, 0, 0], null, .006);
  for (const x of [-.32, .32]) for (const z of [-.18, .18]) add(g, Cyl(.07, .06, .5, 8), sheep ? c2 : c1, [x, .25, z], [0, 0, 0], null, .012);
  g.userData.head = head; g.scale.setScalar(goat ? .75 : 1); return g;
}
export function makeStatue(mat) {  // marble person on a pedestal; returns {g, J}
  const g = new THREE.Group(); add(g, Box(1.4, 1.2, 1.4), mat, [0, .6, 0], [0, 0, 0], null, .02); add(g, Box(1.6, .2, 1.6), mat, [0, 1.25, 0], [0, 0, 0], null, .015);
  const J = makeHuman({ top: 0xeeeae2, pants: 0xeeeae2, skin: 0xeeeae2, hair: 0xe2ddd2, shoe: 0xeeeae2, robe: true, beard: true });
  J.root.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial && o.material.color && !(o.material.color.r < .2)) o.material = mat; });
  J.root.position.set(0, 2.2, 0); J.root.scale.setScalar(1.9); g.add(J.root); return { g, J };
}
export function makeGargoyle(mat) {
  const g = new THREE.Group(); add(g, Cap(.25, .4, 10), mat, [0, .3, 0], [.6, 0, 0], null, .015);
  const head = G(g, [0, .55, .32]); add(head, Sph(.22, 12, 10), mat, [0, 0, 0], [0, 0, 0], null, .015);
  for (const x of [-.12, .12]) add(head, new THREE.ConeGeometry(.05, .2, 6), mat, [x, .2, -.02], [-.3, 0, x], null, .008);
  const eyes = []; for (const x of [-.08, .08]) eyes.push(add(head, Sph(.04, 8, 6), T(0x3a3a44), [x, .04, .19], [0, 0, 0], null, 0));
  const snout = add(head, Sph(.11, 10, 8), mat, [0, -.06, .18], [0, 0, 0], [1, .8, 1], .01);
  for (const s of [-1, 1]) { const wg = new THREE.Shape(); wg.moveTo(0, 0); wg.lineTo(s * .7, .5); wg.lineTo(s * .55, .1); wg.lineTo(s * .7, -.15); wg.lineTo(0, -.1); add(g, new THREE.ExtrudeGeometry(wg, { depth: .04, bevelEnabled: false }), mat, [s * .15, .45, -.1], [0, s * .4, 0], null, .01); }
  g.userData = { head, eyes, snout }; return g;
}
export function makeFishGeo() { const b = new THREE.SphereGeometry(.2, 10, 8); b.scale(1.4, .8, .45); const tl = new THREE.ConeGeometry(.14, .22, 4); tl.rotateZ(Math.PI / 2); tl.translate(-.36, 0, 0); tl.scale(1, 1, .3); const g = mergeGeometries([b.toNonIndexed(), tl.toNonIndexed()]); g.computeVertexNormals(); return g; }
export function makeBugGeo() { const b = new THREE.CapsuleGeometry(.05, .12, 4, 8); b.rotateZ(Math.PI / 2); const w1 = new THREE.BoxGeometry(.1, .005, .16); w1.translate(0, .05, .08); const w2 = w1.clone(); w2.translate(0, 0, -.16); const g = mergeGeometries([b.toNonIndexed(), w1.toNonIndexed(), w2.toNonIndexed()]); g.computeVertexNormals(); return g; }
export function makePlane747(scale = 1, livery = 0xf3f5fa, stripe = 0x2b4fd6) {
  const g = new THREE.Group(); const wh = T(livery), st = T(stripe), dk = T(0x2b2f45);
  add(g, Cap(.6, 7, 18), wh, [0, 0, 0], [0, 0, Math.PI / 2], null, .03);
  add(g, Cap(.45, 1.6, 14), wh, [2.6, .45, 0], [0, 0, Math.PI / 2], null, .02);  // hump
  add(g, Box(7, .12, .04), st, [0, -.05, .6], [0, 0, 0], null, 0); add(g, Box(7, .12, .04), st, [0, -.05, -.6], [0, 0, 0], null, 0);
  const wing = new THREE.Shape(); wing.moveTo(.8, 0); wing.lineTo(-1.6, 5); wing.lineTo(-2.4, 5); wing.lineTo(-1.2, 0);
  for (const s of [-1, 1]) { const wgm = new THREE.ExtrudeGeometry(wing, { depth: .12, bevelEnabled: false }); wgm.rotateX(Math.PI / 2); if (s < 0) wgm.scale(1, 1, -1); add(g, wgm, wh, [0, -.2, 0], [0, 0, 0], null, .015); }
  const engines = []; for (const s of [-1, 1]) for (const zz of [1.7, 3.3]) { const eg = G(g, [-.2 - zz * .32 + .6, -.55, s * zz]); add(eg, Cyl(.26, .22, 1.1, 14), dk, [0, 0, 0], [0, 0, Math.PI / 2], null, .012); const glow = add(eg, new THREE.CircleGeometry(.2, 14), B(0x5ad8ff, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [-.56, 0, 0], [0, -Math.PI / 2, 0], null, 0); const fire = add(eg, Sph(.24, 10, 8), B(0xff8a3a, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [-.6, 0, 0], [0, 0, 0], [1.6, 1, 1], 0); engines.push({ eg, glow, fire }); }
  const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.lineTo(-1.2, 2.2); tail.lineTo(-1.8, 2.2); tail.lineTo(-1.4, 0); add(g, new THREE.ExtrudeGeometry(tail, { depth: .08, bevelEnabled: false }), st, [-2.6, .3, -.04], [0, 0, 0], null, .012);
  const ht = new THREE.Shape(); ht.moveTo(0, 0); ht.lineTo(-.8, 1.8); ht.lineTo(-1.3, 1.8); ht.lineTo(-1, 0);
  for (const s of [-1, 1]) { const hg = new THREE.ExtrudeGeometry(ht, { depth: .06, bevelEnabled: false }); hg.rotateX(Math.PI / 2); if (s < 0) hg.scale(1, 1, -1); add(g, hg, wh, [-3, .1, 0], [0, 0, 0], null, .01); }
  for (let i = 0; i < 14; i++) for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(.06, 8), B(0x1a1033), [2.4 - i * .38, .2, s * .6], [0, s > 0 ? 0 : Math.PI, 0], null, 0);
  add(g, Box(.3, .14, .5), B(0x1a1033), [3.9, .32, 0], [0, 0, -.5], null, 0);
  g.scale.setScalar(scale); g.userData.engines = engines; return g;
}

// ---------------- the world ----------------
export const ZONES = { street: V(0, 0, 0), farm: V(260, 0, 0), beach: V(-260, 0, 0), river: V(0, 0, 260), plaza: V(0, 0, -260), volcano: V(520, 0, 0), airport: V(0, 0, -560) };
export function makeTown(o = {}) {
  const sc = new THREE.Scene(); const sky = makeSky(o.top ?? 0x6a8ad8, o.bot ?? 0xc9d6f0, 1400); sc.add(sky);
  sc.fog = new THREE.Fog(o.fog ?? 0xc0c8e0, 40, 170);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x6a6a80, 1.9); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.6); sun.position.set(-30, 50, 25); sc.add(sun);
  const groundM = T(o.ground ?? 0x8fcf6a); const gg = new THREE.PlaneGeometry(1600, 1600, 1, 1); gg.rotateX(-Math.PI / 2); const ground = add(sc, gg, groundM, [0, 0, 0], [0, 0, 0], null, 0);
  const W = {};
  // --- street ---
  const st = G(sc, ZONES.street.toArray());
  const roadM = T(0x5d6378); add(st, Box(160, .05, 7), roadM, [0, .02, 0], [0, 0, 0], null, 0);
  for (let x = -78; x < 80; x += 4) add(st, Box(1.8, .06, .18), T(0xfff2c0), [x, .04, 0], [0, 0, 0], null, 0);
  for (const z of [-4.8, 4.8]) add(st, Box(160, .25, 2.6), T(0xd9d4cc), [0, .12, z], [0, 0, 0], null, .01);
  const hc = [0xffd9a8, 0xa8d8ff, 0xffb0c8, 0xc8f0a8, 0xfff0a0, 0xd8c0ff], rc = [0xff6b5c, 0x5d6378, 0x4f7cff, 0x8a5a3a];
  W.houses = [];
  for (let i = 0; i < 16; i++) for (const s of [-1, 1]) { const x = -60 + i * 8 + (s > 0 ? 3 : 0), h = 3 + (i * 7 + (s > 0 ? 3 : 0)) % 3 * 1.6; const hs = makeHouse(5.4, h, 4.4, hc[(i + (s > 0 ? 2 : 0)) % 6], rc[i % 4]); hs.position.set(x, 0, s * 9.5); hs.rotation.y = s > 0 ? Math.PI : 0; st.add(hs); W.houses.push(hs); }
  for (let i = 0; i < 18; i++) for (const s of [-1, 1]) { const tr = makeTree(.9 + rnd(i, s) * .4); tr.position.set(-66 + i * 7.5 + 3, .25, s * 5.6); st.add(tr); (W.trees = W.trees || []).push(tr); }
  W.cars = []; const cc = [0xff4b5c, 0x4fd8ff, 0xffd23f, 0x5cff9a, 0xf3f5fa, 0xff7a1f];
  for (let i = 0; i < 10; i++) { const c = makeCar(cc[i % 6]); c.position.set(-40 + i * 9 + (i % 2) * 2, 0, (i % 2 ? 2.2 : -2.2)); c.rotation.y = i % 2 ? Math.PI : 0; st.add(c); W.cars.push(c); }
  // rain barrel + downspout at a house near origin
  W.barrel = G(st, [3.6, 0, 6.9]); add(W.barrel, Cyl(.55, .5, 1.2, 16), T(0x4f7cff), [0, .6, 0], [0, 0, 0], null, .02); add(W.barrel, Cyl(.56, .56, .06, 16), T(0x2b2f45), [0, 1.22, 0], [0, 0, 0], null, .01);
  W.pipe = add(st, Cyl(.09, .09, 2.6, 10), T(0xc9cdd8), [3.6, 2.6, 7.0], [0, 0, 0], null, .01);
  W.pipeLow = G(st, [3.6, 1.3, 7.0]); add(W.pipeLow, Cyl(.09, .09, .5, 10), T(0xc9cdd8), [0, .25, 0], [0, 0, 0], null, .01);
  // --- farm ---
  const fm = G(sc, ZONES.farm.toArray()); W.farm = fm;
  add(fm, Box(80, .04, 60), T(0x7cc45a), [0, .03, 0], [0, 0, 0], null, 0);
  const barn = G(fm, [-14, 0, -14]); add(barn, Box(8, 5, 7), T(0xd94a3a), [0, 2.5, 0], [0, 0, 0], null, .04); const brg = new THREE.CylinderGeometry(.01, 5.6, 2.4, 4, 1); brg.rotateY(Math.PI / 4); brg.scale(1, 1, .9); add(barn, brg, T(0x5d6378), [0, 6.2, 0], [0, 0, 0], null, .04); add(barn, Box(2.6, 3.2, .1), T(0xffffff), [0, 1.6, 3.52], [0, 0, 0], null, .015);
  for (let i = 0; i < 26; i++) add(fm, Box(.12, 1, .12), T(0xc89a6a), [-20 + i * 1.6, .5, 8], [0, 0, 0], null, .008); for (const y of [.4, .8]) add(fm, Box(41.6, .08, .06), T(0xc89a6a), [0, y, 8], [0, 0, 0], null, .006);
  W.cows = []; for (let i = 0; i < 9; i++) { const c = makeCow(i % 3 === 2); c.position.set(-10 + (i % 5) * 4.5 + rnd(i, 1) * 2, 0, 1 + Math.floor(i / 5) * 3.5 + rnd(i, 2)); c.rotation.y = rnd(i, 3) * 6; fm.add(c); W.cows.push(c); }
  // wheat field (instanced) beyond the fence
  const WN = 1800; W.wheat = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, 1, 4).translate(0, .5, 0), T(0xffffff), WN); W.wheatHead = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.07, .18, 3, 6), T(0xffffff), WN);
  for (let i = 0; i < WN; i++) { const x = -18 + (i % 60) * .62 + (rnd(i, 1) - .5) * .3, z = 10 + Math.floor(i / 60) * .62 + (rnd(i, 2) - .5) * .3; dmy.position.set(x, 0, z); dmy.rotation.set((rnd(i, 3) - .5) * .2, 0, (rnd(i, 4) - .5) * .2); dmy.scale.set(1, .9 + rnd(i, 5) * .3, 1); dmy.updateMatrix(); W.wheat.setMatrixAt(i, dmy.matrix); dmy.position.y += 1.05 * dmy.scale.y; dmy.scale.set(1, 1, 1); dmy.updateMatrix(); W.wheatHead.setMatrixAt(i, dmy.matrix); }
  fm.add(W.wheat, W.wheatHead); W.setWheat = x => { W.wheat.material.color.copy(col(0x6ac44a, 0xb8a040, x)); W.wheatHead.material.color.copy(col(0x9ad86a, 0x8a6a30, x)); };
  W.setWheat(0);
  // --- beach ---
  const bc = G(sc, ZONES.beach.toArray()); W.beach = bc;
  add(bc, Box(120, .06, 60), T(0xf2dca0), [0, .04, 0], [0, 0, 0], null, 0);
  W.sea = add(bc, Box(400, .05, 300), T(0x3fa8e0), [0, .03, -180], [0, 0, 0], null, 0);
  for (let i = 0; i < 6; i++) { const u = G(bc, [-12 + i * 5, 0, 4 + (i % 2) * 3]); add(u, Cyl(.05, .05, 2.4, 6), T(0xffffff), [0, 1.2, 0], [0, 0, 0], null, .006); add(u, new THREE.ConeGeometry(1.3, .6, 10), T([0xff4b5c, 0xffd23f, 0x4fd8ff][i % 3]), [0, 2.5, 0], [0, 0, 0], null, .015); add(u, Box(1.6, .05, .8), T([0xffffff, 0xff9ab0][i % 2]), [.8, .07, .6], [0, 0, 0], null, 0); }
  // --- river ---
  const rv = G(sc, ZONES.river.toArray()); W.river = rv;
  add(rv, Box(30, .05, 400), T(0x8fcf6a), [-21, .02, 0], [0, 0, 0], null, 0);
  W.water = add(rv, Box(12, .05, 400), T(0x3f9ae0, { transparent: true, opacity: .92 }), [0, -.15, 0], [0, 0, 0], null, 0);
  add(rv, Box(12.4, .3, 400), T(0x8a7a5a), [0, -.5, 0], [0, 0, 0], null, 0);
  const bridge = G(rv, [0, 0, -10]); add(bridge, Box(14, .4, 3), T(0xc89a6a), [0, 1.2, 0], [0, 0, 0], null, .02); for (const x of [-4, 0, 4]) add(bridge, Cyl(.2, .2, 1.4, 8), T(0x8a5a3a), [x, .4, 0], [0, 0, 0], null, .01);
  for (let i = 0; i < 12; i++) { const tr = makeTree(1 + rnd(i, 7) * .5); tr.position.set((i % 2 ? -1 : 1) * (8 + rnd(i, 8) * 6), 0, -40 + i * 7); rv.add(tr); }
  const FN = 140; W.fish = new THREE.InstancedMesh(makeFishGeo(), T(0xc8d0e0), FN); W.fish.frustumCulled = false; rv.add(W.fish);
  // --- plaza with cathedral ---
  const pz = G(sc, ZONES.plaza.toArray()); W.plaza = pz;
  add(pz, Box(60, .06, 50), T(0xd8cfc0), [0, .04, 0], [0, 0, 0], null, 0);
  const stone = T(0xd9d2c4); W.stone = stone; const cat = G(pz, [0, 0, -14]); W.cathedral = cat;
  add(cat, Box(14, 12, 6), stone, [0, 6, 0], [0, 0, 0], null, .04);
  for (const x of [-6, 6]) { add(cat, Box(4, 20, 5), stone, [x, 10, .6], [0, 0, 0], null, .04); add(cat, new THREE.ConeGeometry(2.4, 5, 4), T(0x8a8fa0), [x, 22.5, .6], [0, Math.PI / 4, 0], null, .03); }
  add(cat, Cyl(2.2, 2.2, .3, 28), T(0x6a8ad8, { emissive: 0x2a3a7a, emissiveIntensity: .3 }), [0, 8.5, 3.1], [Math.PI / 2, 0, 0], null, .02);
  const arch = new THREE.Shape(); arch.moveTo(-1.6, 0); arch.lineTo(-1.6, 3); arch.quadraticCurveTo(0, 5.4, 1.6, 3); arch.lineTo(1.6, 0); add(cat, new THREE.ShapeGeometry(arch), B(0x3a2a2a), [0, 0, 3.02], [0, 0, 0], null, 0);
  W.gargoyles = []; for (const x of [-4, 4]) { const ga = makeGargoyle(stone); ga.position.set(x * 1.5, 13, 3.4); ga.rotation.x = .25; ga.scale.setScalar(1.5); cat.add(ga); W.gargoyles.push(ga); }
  W.statue = makeStatue(T(0xf2eee6)); W.statue.g.position.set(0, 0, 2); pz.add(W.statue.g);
  // --- volcano ---
  const vc = G(sc, ZONES.volcano.toArray()); W.volcano = vc;
  const vg = new THREE.CylinderGeometry(6, 60, 42, 28, 6, true); { const p = vg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const n = 1 + (fbm(x * .05 + 3, z * .05) - .5) * .35 * (y < 20 ? 1 : 0); p.setX(i, x * n); p.setZ(i, z * n); } vg.computeVertexNormals(); }
  add(vc, vg, T(0x7a6a6a), [0, 21, -60], [0, 0, 0], null, .05); add(vc, Cyl(6, 6, .5, 28), B(0xff6a2a), [0, 41.9, -60], [0, 0, 0], null, 0);
  W.plume = points(1600, 0x6a6470, 15, { opacity: .85, depthWrite: false, keep: true }); W.plume.material.sizeAttenuation = true; vc.add(W.plume);
  W.lava = points(300, 0xff7a2a, 2.2, { blending: THREE.AdditiveBlending }); vc.add(W.lava);
  // --- airport ---
  const ap = G(sc, ZONES.airport.toArray()); W.airport = ap;
  add(ap, Box(200, .05, 26), T(0x5d6378), [0, .03, 0], [0, 0, 0], null, 0); for (let x = -90; x < 95; x += 10) add(ap, Box(5, .06, .5), T(0xffffff), [x, .05, 0], [0, 0, 0], null, 0);
  add(ap, Box(60, 8, 14), T(0xc9d6f0), [0, 4, -40], [0, 0, 0], null, .04); add(ap, Box(60, 2.5, .2), T(0x6ab8ff, { emissive: 0x1a4a8a, emissiveIntensity: .3 }), [0, 5, -32.9], [0, 0, 0], null, 0);
  add(ap, Cyl(1.5, 2, 20, 12), T(0xd9dde8), [38, 10, -40], [0, 0, 0], null, .03); add(ap, Cyl(3.6, 3, 3, 12), T(0x6ab8ff), [38, 21.5, -40], [0, 0, 0], null, .03);
  W.parked = []; for (let i = 0; i < 5; i++) { const p = makePlane747(1.2, 0xf3f5fa, [0x2b4fd6, 0xff4b5c, 0x1aa86a, 0xffb31a, 0x7a4fd6][i]); p.position.set(-36 + i * 18, 1.6, -18); p.rotation.y = Math.PI / 2; ap.add(p); W.parked.push(p); }
  // --- people ---
  const pc = [[0xff4b5c, 0x2b2f45, 0x5a3420], [0x4fd8ff, 0x3a3a5a, 0x2a1a10], [0xffd23f, 0x2b4fd6, 0xa86a3a], [0x5cff9a, 0x2b2f45, 0x141414], [0xff9ab0, 0x5d6378, 0xe8c070], [0x7a4fd6, 0x2b2f45, 0x5a3420]];
  W.people = pc.map((c, i) => { const J = makeHuman({ top: c[0], pants: c[1], hair: c[2], hairStyle: i % 3 === 1 ? 'long' : undefined, skin: [0xffc6a0, 0xe0a070, 0xc68a5a, 0xffd2b0][i % 4] }); sc.add(J.root); return J; });
  W.kids = [0, 1, 2].map(i => { const J = makeHuman({ top: [0xffd23f, 0xff7a1f, 0x4fd8ff][i], pants: 0x2b4fd6, hair: [0x5a3420, 0xe8c070, 0x2a1a10][i], hairStyle: i === 1 ? 'long' : undefined, scale: .72 }); sc.add(J.root); return J; });
  W.hidePeople = () => { W.people.forEach(p => p.root.visible = false); W.kids.forEach(p => p.root.visible = false); };
  // --- falling stuff: generic instanced streaks around camera ---
  const RN = 2200; const rainGeo = new THREE.BoxGeometry(.02, 1, .02); W.rainMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, fog: true }); W.rain = new THREE.InstancedMesh(rainGeo, W.rainMat, RN); W.rain.frustumCulled = false; sc.add(W.rain);
  W.updRain = (t, c, o = {}) => { const n = Math.min(RN, o.n ?? RN), BX = o.box ?? 34, len = o.len ?? .9, spd = o.spd ?? 18, tilt = o.tilt ?? 0, wob = o.wob ?? 0, th = o.th ?? 1; W.rain.count = n;
    if (!o.keep) { W.rain.count = 0; return; } // falling droplets read as flicker: only kept for slow close-ups
    W.rainMat.blending = THREE.NormalBlending;
    for (let i = 0; i < n; i++) { let x = rnd(i, 21) * BX, y = rnd(i, 22) * BX - t * spd * (.8 + rnd(i, 23) * .4), z = rnd(i, 24) * BX; x += tilt * y + Math.sin(t * 1.3 + i) * wob; const X = ((x - c.x) % BX + BX) % BX - BX / 2 + c.x, Y = ((y - c.y) % BX + BX) % BX - BX / 2 + c.y, Z = ((z - c.z) % BX + BX) % BX - BX / 2 + c.z; dmy.position.set(X, Y, Z); dmy.rotation.set(wob ? Math.sin(i + t) * .5 : 0, i, -tilt + (wob ? Math.cos(i * 1.7 + t) * .6 : 0)); dmy.scale.set(th, len * (.7 + rnd(i, 25) * .6), th); dmy.updateMatrix(); W.rain.setMatrixAt(i, dmy.matrix); }
    W.rain.instanceMatrix.needsUpdate = true; };
  W.glints = points(1500, 0xe8fbff, .1, { blending: THREE.AdditiveBlending, opacity: 0 }); sc.add(W.glints);
  W.updGlints = (t, c, a, r = 18) => { for (let i = 0; i < 1500; i++) { const rr = Math.sqrt(rnd(i, 31)) * r, an = rnd(i, 32) * 6.283; W.glints.pos[i * 3] = c.x + Math.cos(an) * rr; W.glints.pos[i * 3 + 1] = .3 + rnd(i, 35) * .02; W.glints.pos[i * 3 + 2] = c.z + Math.sin(an) * rr; } W.glints.upd(); W.glints.material.opacity = a * .8; };
  Object.assign(W, { sc, sky, hemi, sun, ground, groundM, roadM });
  return W;
}
