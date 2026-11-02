// draw.js
var W = 1080;
var H = 1920;
var inkC = document.createElement("canvas");
inkC.width = W;
inkC.height = H;
var fxC = document.createElement("canvas");
fxC.width = W;
fxC.height = H;
var ovC = document.createElement("canvas");
ovC.width = W;
ovC.height = H;
var g = inkC.getContext("2d");
var f = fxC.getContext("2d");
var ov = ovC.getContext("2d");
var TAU = Math.PI * 2;
var cam = { x: 1600, y: 1e3, z: 0.6, r: 0 };
var proj = { k: 0, a: Math.PI / 4 };
var LW = { out: 3.2, det: 2, thin: 1.25, hair: 0.9 };
var zp = 1;
function setCam(c) {
  Object.assign(cam, c);
  zp = Math.pow(cam.z, 0.65);
}
var lw = (w) => w * zp;
function clear() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.filter = "none";
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalCompositeOperation = "source-over";
  f.filter = "none";
  f.fillStyle = "#000";
  f.fillRect(0, 0, W, H);
  ov.setTransform(1, 0, 0, 1, 0, 0);
  ov.clearRect(0, 0, W, H);
}
function S(x, y, d = 0) {
  if (d) {
    x += d * proj.k * Math.cos(proj.a);
    y -= d * proj.k * Math.sin(proj.a);
  }
  const dx = x - cam.x, dy = y - cam.y, c = Math.cos(cam.r), s = Math.sin(cam.r);
  return [(c * dx - s * dy) * cam.z + W / 2, (s * dx + c * dy) * cam.z + H / 2];
}
function camMatrix(ctx, x = 0, y = 0, rot = 0, d = 0) {
  const [sx, sy] = S(x, y, d), c = Math.cos(cam.r + rot) * cam.z, s = Math.sin(cam.r + rot) * cam.z;
  ctx.setTransform(c, s, -s, c, sx, sy);
}
function plen(p) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}
function trunc(p, u) {
  if (u >= 1) return [p, null];
  if (u <= 0) return [[], null];
  const L = plen(p) * u;
  let acc = 0;
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (acc + l >= L) {
      const k = (L - acc) / (l || 1);
      const q = [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
      out.push(q);
      return [out, q];
    }
    acc += l;
    out.push(p[i]);
  }
  return [out, p[p.length - 1]];
}
var DASH = { center: [34, 7, 6, 7], hidden: [11, 7], phantom: [30, 6, 5, 6, 5, 6], dot: [2, 7] };
function pathScreen(ctx, pts, d, closed) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = S(pts[i][0], pts[i][1], d);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  if (closed) ctx.closePath();
}
var NIBS = [];
function line(pts, o = {}) {
  if (!pts || pts.length < 2) return;
  const u = o.u ?? 1;
  if (u <= 0) return;
  let P = pts, closed = o.closed;
  if (u < 1) {
    const [tp, nib] = trunc(closed ? [...pts, pts[0]] : pts, u);
    P = tp;
    closed = false;
    if (nib && o.nib !== false) NIBS.push([nib[0], nib[1], o.d || 0]);
  }
  if (P.length < 2) return;
  const v = o.v ?? 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
  g.lineWidth = lw(o.w ?? LW.det);
  g.lineCap = o.cap || "round";
  g.lineJoin = "round";
  if (o.dash) {
    g.setLineDash((DASH[o.dash] || o.dash).map((x) => x * cam.z));
    g.lineDashOffset = (o.dashOff || 0) * cam.z;
  } else g.setLineDash([]);
  pathScreen(g, P, o.d || 0, closed);
  g.stroke();
  g.setLineDash([]);
}
function knock(pts, d = 0) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#000";
  pathScreen(g, pts, d, true);
  g.fill();
}
function fillV(pts, v, d = 0) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
  pathScreen(g, pts, d, true);
  g.fill();
}
function hatch(pts, o = {}) {
  const sp = o.sp ?? 14, ang = o.ang ?? Math.PI / 4, d = o.d || 0, u = o.u ?? 1;
  if (u <= 0) return;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  pathScreen(g, pts, d, true);
  g.clip();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + sp;
  const c = Math.cos(ang), s = Math.sin(ang), n = Math.ceil(2 * R / sp);
  g.strokeStyle = `rgb(${(o.v ?? 0.85) * 255 | 0},${(o.v ?? 0.85) * 255 | 0},${(o.v ?? 0.85) * 255 | 0})`;
  g.lineWidth = lw(o.w ?? LW.hair);
  g.setLineDash([]);
  g.lineCap = "butt";
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = -R + i * sp;
    if (i / n > u) break;
    const ax = cx + -s * t - c * R, ay = cy + c * t - s * R, bx = cx + -s * t + c * R, by = cy + c * t + s * R;
    const A2 = S(ax, ay, d), B = S(bx, by, d);
    g.moveTo(A2[0], A2[1]);
    g.lineTo(B[0], B[1]);
  }
  g.stroke();
  g.restore();
  g.lineCap = "round";
}
var circ = (cx, cy, r, n = 64, a0 = 0, a1 = TAU) => {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return p;
};
var ell = (cx, cy, rx, ry, rot = 0, n = 64, a0 = 0, a1 = TAU) => {
  const p = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    p.push([cx + c * x - s * y, cy + s * x + c * y]);
  }
  return p;
};
var rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
var xf = (pts, tx, ty, rot = 0, sc = 1) => {
  const c = Math.cos(rot) * sc, s = Math.sin(rot) * sc;
  return pts.map(([x, y]) => [tx + c * x - s * y, ty + s * x + c * y]);
};
var FONT = { hand: "Architects", tech: "B612", mono: "B612Mono", sign: "Allura" };
function text(str, x, y, o = {}) {
  const size = o.size ?? 28, u = o.u ?? 1;
  if (u <= 0 || !str) return 0;
  const ctx = o.ctx || g;
  camMatrix(ctx, x, y, o.rot || 0, o.d || 0);
  ctx.font = `${o.weight || 400} ${size}px ${o.font || FONT.hand}`;
  ctx.textAlign = o.align || "left";
  ctx.textBaseline = o.base || "alphabetic";
  if (o.ls) ctx.letterSpacing = o.ls + "px";
  else ctx.letterSpacing = "0px";
  const wdt = ctx.measureText(str).width;
  const v = o.v ?? 1;
  ctx.fillStyle = o.color || `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;
  if (u < 1) {
    const x0 = o.align === "center" ? -wdt / 2 : o.align === "right" ? -wdt : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 4, -size * 1.4, wdt * u + 4, size * 2.2);
    ctx.clip();
    ctx.fillText(str, 0, 0);
    ctx.restore();
    const nx = x0 + wdt * u, ny = -size * 0.35, c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    if (o.nib !== false) NIBS.push([x + c * nx - s * ny, y + s * nx + c * ny, o.d || 0]);
  } else ctx.fillText(str, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.letterSpacing = "0px";
  return wdt;
}
function dim(p1, p2, off, label, o = {}) {
  const u = o.u ?? 1;
  if (u <= 0) return;
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1, tx = dx / L, ty = dy / L, nx = -ty, ny = tx;
  const d = o.d || 0, gap = 8, ext = 14;
  const a = [p1[0] + nx * off, p1[1] + ny * off], b = [p2[0] + nx * off, p2[1] + ny * off];
  const sg = Math.sign(off) || 1;
  line([[p1[0] + nx * gap * sg, p1[1] + ny * gap * sg], [a[0] + nx * ext * sg, a[1] + ny * ext * sg]], { w: LW.hair, u: Math.min(1, u * 2), d, nib: false });
  line([[p2[0] + nx * gap * sg, p2[1] + ny * gap * sg], [b[0] + nx * ext * sg, b[1] + ny * ext * sg]], { w: LW.hair, u: Math.min(1, u * 2), d, nib: false });
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], uu = Math.max(0, Math.min(1, u * 1.4 - 0.2));
  if (uu > 0) {
    const h = uu / 2;
    line([mid, [mid[0] - tx * L * h, mid[1] - ty * L * h]], { w: LW.hair, d, nib: false });
    line([mid, [mid[0] + tx * L * h, mid[1] + ty * L * h]], { w: LW.hair, d, nib: false });
    if (uu >= 1) {
      arrow(a, [tx, ty], d);
      arrow(b, [-tx, -ty], d);
    }
  }
  if (label && u > 0.6) {
    let ang = Math.atan2(ty, tx);
    if (ang > Math.PI / 2 + 0.01) ang -= Math.PI;
    if (ang < -Math.PI / 2 - 0.01) ang += Math.PI;
    const tsz = o.size ?? 24;
    const lx = mid[0] + nx * 6 * sg * 0, ly = mid[1];
    const up = [Math.sin(ang), -Math.cos(ang)];
    text(label, lx + up[0] * 8, ly + up[1] * 8, { size: tsz, align: "center", rot: ang, font: o.font || FONT.hand, d, u: Math.min(1, (u - 0.6) / 0.4), nib: false });
  }
}
function arrow(p, dir, d = 0, len = 16, wid = 4.5) {
  const [tx, ty] = dir, nx = -ty, ny = tx;
  fillV([p, [p[0] + tx * len + nx * wid, p[1] + ty * len + ny * wid], [p[0] + tx * len - nx * wid, p[1] + ty * len - ny * wid]], 1, d);
}
function nibs(a = 1) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (const [x, y, d] of NIBS) {
    const [sx, sy] = S(x, y, d);
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 16 * zp);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.25, `rgba(255,255,255,${0.45 * a})`);
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(sx - 20 * zp, sy - 20 * zp, 40 * zp, 40 * zp);
  }
  NIBS.length = 0;
}
function fxShadow(pts, a, blur, d = 0) {
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalCompositeOperation = "lighter";
  f.filter = blur ? `blur(${blur * cam.z}px)` : "none";
  f.fillStyle = `rgba(255,0,0,${a})`;
  pathScreen(f, pts, d, true);
  f.fill();
  f.filter = "none";
}

// paper.js
var VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
var FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D ink, fx, ov;
uniform vec2 res, sheet;
uniform vec4 cam;        // cx, cy, zoom, rot
uniform float wetBlur, seed, desk, sheetA, fade;
uniform vec4 roll;       // paper roll flung open: x = paper x unrolled so far (>= sheet.x means fully unrolled), y = roll radius
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031 + seed*.0173); q += dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for(int i=0;i<5;i++){ s += a*vn(p); p = p*2.03 + 17.1; a *= .5; } return s; }
vec2 toSheet(vec2 s){ vec2 d = (s - res*.5)/cam.z; float c = cos(-cam.w), si = sin(-cam.w); return vec2(c*d.x - si*d.y, si*d.x + c*d.y) + cam.xy; }
vec3 paper(vec2 p){
  // Prussian blue: low-frequency fading + coating brush marks (stretched horizontally)
  float n1 = fbm(p/760.), n2 = fbm(vec2(p.x/1500., p.y/70.) + 3.), n3 = fbm(p/190. + 9.);
  vec3 dark = vec3(.094,.200,.420), light = vec3(.165,.345,.650);   // \u2248 #18336B \u2192 #2A58A6
  float m = clamp(.10 + .95*(n1-.25) + .22*(n2-.5) + .14*(n3-.5) + .18*(p.x/sheet.x) , 0., 1.);
  vec3 c = mix(dark, light, m);
  // paper fibres: high-frequency light/dark + sparse fibre strands
  float fib = vn(p*.55)*.5 + vn(p*1.7)*.5;
  c *= .955 + .075*fib;
  float fl = smoothstep(.93, 1., vn(vec2(p.x*.02 + p.y*.07, p.y*.9 - p.x*.3)*.35));
  c = mix(c, c*1.12 + .02, fl*.35);
  // creases: a cross fold in the sheet (light/dark edges + colour worn white along the fold lines)
  float fx = p.x - sheet.x*.5 - 6.*(vn(vec2(p.y*.01, 2.))-.5), fy = p.y - sheet.y*.5 - 6.*(vn(vec2(p.x*.01, 5.))-.5);
  float cx = exp(-fx*fx/18.), cy = exp(-fy*fy/18.);
  float sx = smoothstep(-14., 0., fx) - smoothstep(0., 14., fx), sy = smoothstep(-14., 0., fy) - smoothstep(0., 14., fy);
  c *= 1. + .06*sign(fx)*(1.-abs(sx))*exp(-fx*fx/260.) + .05*sign(fy)*exp(-fy*fy/260.);
  float wear = (cx + cy)*smoothstep(.45, .8, fbm(p/9.));
  c = mix(c, vec3(.55,.66,.82), clamp(wear*.55, 0., .6));
  // edges faded to white: irregular
  float e = min(min(p.x, sheet.x - p.x), min(p.y, sheet.y - p.y));
  float bl = smoothstep(90., 0., e + 70.*(fbm(p/60.)-.5));
  c = mix(c, vec3(.50,.62,.80), bl*.8);
  float cor = smoothstep(260., 0., length(min(p, sheet - p)) + 90.*(fbm(p/40.)-.5));
  c = mix(c, vec3(.58,.68,.84), cor*.5);
  // small blemishes
  float sp = smoothstep(.985, 1., vn(p/14. + 40.));
  c *= 1. - .18*sp;
  return c;
}
void main(){
  vec2 s = vec2(uv.x, 1.-uv.y)*res;
  vec2 p = toSheet(s);
  vec2 tuv = vec2(uv.x, uv.y);
  vec4 F = texture(fx, tuv);
  vec4 Fb = textureLod(fx, tuv, 3.);
  float wet = clamp(max(F.g, Fb.g*.9), 0., 1.);
  float inside = step(0., p.x)*step(p.x, sheet.x)*step(0., p.y)*step(p.y, sheet.y);
  // paper roll flung open: everything right of roll.x is not unrolled yet
  float unrolled = step(p.x, roll.x);
  inside *= unrolled;
  // desk: dark drafting-table cover
  vec3 deskC = vec3(.052,.066,.086) * (.9 + .2*fbm(p/30.)) ;
  deskC *= desk;
  vec3 col = deskC;
  // shadow of the paper (falling on the desk)
  vec2 sp2 = p - vec2(10., 16.);
  float shadowIn = step(0., sp2.x)*step(sp2.x, min(sheet.x, roll.x))*step(0., sp2.y)*step(sp2.y, sheet.y);
  col *= 1. - .55*shadowIn*(1.-inside);
  if (inside > .5) {
    vec3 pc = paper(p);
    // wet: blue gets darker and more saturated; tide-mark edge
    float rim = clamp(wet*(1.-wet)*4., 0., 1.);
    float wn = fbm(p/35.);
    vec3 wetC = pc*vec3(.70,.78,.92) + vec3(0.,.01,.05);
    pc = mix(pc, wetC, smoothstep(.05, .5, wet)*.85);
    pc = mix(pc, pc*1.25 + vec3(.05,.07,.10), rim*rim*(.5 + .5*wn)*.55);
    // white lines: sharp + halo; softened where wet
    float L0 = texture(ink, tuv).r;
    float L1 = textureLod(ink, tuv, 1.6).r, L2 = textureLod(ink, tuv, 2.8).r, L3 = textureLod(ink, tuv, 4.).r;
    float w = clamp(wet*wetBlur, 0., 1.);
    float sharp = mix(L0, mix(L1, L2, .5), w*.85);
    float grainK = .80 + .20*smoothstep(.2, .8, vn(p*.9 + 3.));
    float L = clamp(sharp*grainK + L1*.18 + L2*.10 + w*L3*.35, 0., 1.);
    vec3 lineC = vec3(.905,.940,.975);
    pc = mix(pc, lineC, L*mix(.96, .72, w));
    col = pc;
  }
  // cast shadows (hand, cloud): darken the paper
  col *= 1. - .62*clamp(Fb.r*.5 + F.r*.5, 0., 1.);
  // red stamp: rubber-stamp grain and ink gaps
  float st = F.b;
  if (st > .001) {
    float holes = smoothstep(.12, .45, vn(p*.45 + 11.)*.6 + fbm(p/6.)*.6);
    vec3 red = vec3(.76,.22,.17);
    col = mix(col, red*(.85 + .2*fbm(p/20.)), clamp(st*holes*1.05, 0., .92));
  }
  // paper roll: the roll at the unrolling edge (rolled-up paper, lighter on the back)
  if (roll.x < sheet.x) {
    float d = p.x - roll.x;
    if (d > -roll.y && d < roll.y*1.2 && p.y > -4. && p.y < sheet.y + 4.) {
      float k = clamp((d + roll.y)/(2.2*roll.y), 0., 1.);
      vec3 back = vec3(.74,.76,.72)*(.55 + .6*sin(k*3.14159));
      vec3 front = mix(vec3(.12,.24,.48), vec3(.22,.40,.72), sin(k*3.14159));
      col = mix(front, back, step(.55, fract(k*3.1 + .1)));
      col *= .8 + .35*sin(k*3.14159);
    }
  }
  // vignette
  vec2 q = uv - .5; col *= 1. - .22*dot(q, q)*2.2;
  col = mix(deskC*.0, col, sheetA);
  vec4 O = texture(ov, tuv);
  col = col*(1.-O.a) + O.rgb;
  col *= 1. - fade;
  o = vec4(col, 1.);
}`;
function makePaper(canvas, W2, H2) {
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
  const sh = (t, s) => {
    const x = gl.createShader(t);
    gl.shaderSource(x, s);
    gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x));
    return x;
  };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = (unit) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const tInk = tex(0), tFx = tex(1), tOv = tex(2);
  const U = (n) => gl.getUniformLocation(pr, n);
  gl.uniform1i(U("ink"), 0);
  gl.uniform1i(U("fx"), 1);
  gl.uniform1i(U("ov"), 2);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  return (inkC2, fxC2, ovC2, o) => {
    gl.viewport(0, 0, W2, H2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tInk);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inkC2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tFx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fxC2);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tOv);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ovC2);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform2f(U("res"), W2, H2);
    gl.uniform2f(U("sheet"), o.sheet[0], o.sheet[1]);
    gl.uniform4f(U("cam"), o.cam.x, o.cam.y, o.cam.z, o.cam.r || 0);
    gl.uniform1f(U("wetBlur"), o.wetBlur ?? 1);
    gl.uniform1f(U("seed"), o.seed ?? 0);
    gl.uniform1f(U("desk"), o.desk ?? 1);
    gl.uniform1f(U("fade"), o.fade ?? 0);
    gl.uniform1f(U("sheetA"), o.sheetA ?? 1);
    gl.uniform4f(U("roll"), o.roll?.[0] ?? 1e6, o.roll?.[1] ?? 40, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

// main.js
var Q = new URLSearchParams(location.search);
var LANG = window.JET_LANG || Q.get("lang") || "en";
var RU = LANG === "ru";
var T = (ru, en) => RU ? ru : en;
var comp = makePaper(document.getElementById("c"), W, H);
var BASE = window.JET_BASE || "";
if (BASE) {
  const FF = [
    ["Cav", "700", "caveat700c", "U+0400-04FF"],
    ["Cav", "700", "caveat700l", "U+0000-00FF,U+2000-206F"],
    ["Plex", "600", "plexc", "U+0400-04FF"],
    ["Plex", "600", "plexl", "U+0000-00FF,U+2000-206F"],
    ["PTN", "700", "ptnc", "U+0400-04FF"],
    ["PTN", "700", "ptnl", "U+0000-00FF,U+2000-206F"],
    ["R", "900", "rubik", "U+0400-04FF"],
    ["R", "900", "rubikl", "U+0000-00FF,U+2000-206F"]
  ];
  for (const [fam, w, file, ur] of FF) {
    const buf = await fetch(BASE + "fonts/" + file + ".woff2").then((r) => r.arrayBuffer());
    const ff = new FontFace(fam, buf, { weight: w, unicodeRange: ur });
    await ff.load();
    document.fonts.add(ff);
  }
}
for (const s of ["700 40px Cav", "600 40px Plex", "700 40px PTN", "900 40px R"]) {
  await document.fonts.load(s);
  await document.fonts.load(s, "\u0410\u0411\u0412\u0430\u0431\u0432");
}
var D = await (await fetch(`${BASE}data_${LANG}.json`)).json();
var SH_ = D.shots;
var SW = 1500;
var SHH = 5150;
var HAND = "Cav";
var TECH = "Plex";
var NAR = "PTN";
var clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
var lerp = (a, b, t) => a + (b - a) * t;
var ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
var eo = (t) => 1 - Math.pow(1 - t, 3);
var at = (t, i, a, d) => clamp((t - SH_[i].t0 - a) / d);
var atv = (t, i, a, d) => clamp((t - SH_[i].v0 - a) / d);
var lab = (s, x, y, o = {}) => text(s, x, y, { size: 34, font: TECH, weight: 600, ls: 2, nib: false, ...o });
var hand = (s, x, y, o = {}) => text(s, x, y, { size: 46, font: HAND, weight: 700, nib: false, ...o });
function border() {
  line(rect(36, 36, SW - 36, SHH - 36), { w: LW.hair, closed: true });
  line(rect(64, 64, SW - 64, SHH - 64), { w: LW.out * 1.3, closed: true });
  for (let i = 1; i < 4; i++) {
    const x = 64 + (SW - 128) * i / 4;
    line([[x, 36], [x, 64]], { w: LW.hair, nib: false });
    line([[x, SHH - 64], [x, SHH - 36]], { w: LW.hair, nib: false });
  }
  for (let i = 1; i < 10; i++) {
    const y = 64 + (SHH - 128) * i / 10;
    line([[36, y], [64, y]], { w: LW.hair, nib: false });
    line([[SW - 64, y], [SW - 36, y]], { w: LW.hair, nib: false });
  }
}
function header(u) {
  text(T("\u0414\u0415\u041B\u041E: LEARJET 60", "CASE: LEARJET 60"), 120, 250, { size: 150, font: HAND, weight: 700, ls: 4, u: clamp(u * 1.6) });
  line([[120, 290], [1380, 290]], { w: LW.out, u: clamp(u * 2 - 0.6) });
  line([[120, 302], [1380, 302]], { w: LW.hair, u: clamp(u * 2 - 0.6) });
  lab(T("01.11.2026 \xB7 \u041E\u041A\u0420\u0423\u0413 \u041F\u0410\u041B\u041C-\u0411\u0418\u0427", "01 NOV 2026 \xB7 PALM BEACH COUNTY"), 124, 364, { size: 40, ls: 3, u: clamp(u * 2 - 1) });
  lab(T("\u0424\u041B\u041E\u0420\u0418\u0414\u0410, \u0421\u0428\u0410", "FLORIDA, USA"), 124, 414, { size: 40, ls: 3, u: clamp(u * 2.4 - 1.2) });
}
function figLabel(n, sub, x, y, u) {
  text(T("\u0420\u0418\u0421. ", "FIG. ") + n, x, y, { size: 70, font: HAND, weight: 700, ls: 4, u: clamp(u * 2) });
  line([[x, y + 14], [x + 250, y + 14]], { w: LW.det, u: clamp(u * 2 - 0.5) });
  if (sub) lab(sub, x, y + 58, { size: 32, ls: 3, u: clamp(u * 2 - 1), v: 0.9 });
}
var AX = 140;
var AY = 860;
var AK = 0.78;
var A = (p) => p.map(([x, y]) => [AX + x * AK, AY + y * AK]);
var FUS = A([
  [0, 8],
  [30, -18],
  [90, -45],
  [170, -62],
  [230, -75],
  [300, -78],
  [1e3, -78],
  [1150, -70],
  [1300, -55],
  [1420, -30],
  [1432, -10],
  [1350, 12],
  [1200, 40],
  [1e3, 62],
  [400, 70],
  [200, 62],
  [90, 45],
  [30, 25]
]);
var WSH = A([[172, -60], [232, -73], [252, -42], [186, -36]]);
var FIN = A([[1190, -76], [1335, -290], [1425, -290], [1412, -40]]);
var STAB = A([[1300, -290], [1500, -300], [1512, -284], [1330, -278]]);
var ENG = A([[1030, -84], [1060, -102], [1240, -102], [1262, -86], [1240, -64], [1060, -64]]);
var PYL = A([[1110, -64], [1180, -64], [1170, -55], [1120, -55]]);
var WING = A([[560, 50], [830, 60], [840, 72], [600, 70]]);
var WLET = A([[826, 60], [858, 18], [872, 20], [842, 66]]);
var WINS = [...Array(7)].map((_, i) => A(ell(420 + i * 78, -30, 17, 13, 0, 24)));
function aircraft(u, ud) {
  if (u <= 0) return;
  const st = (i, n) => clamp((u - i / n * 0.7) / 0.3);
  line([[AX - 50, AY], [AX + 1560 * AK, AY]], { w: LW.hair, dash: "center", u: st(0, 6), v: 0.7 });
  for (const P of [FIN, STAB]) {
    knock(P);
    line(P, { w: LW.out, closed: true, u: st(1, 6) });
  }
  knock(FUS);
  line(FUS, { w: LW.out, closed: true, u: st(0, 6) });
  knock(PYL);
  line(PYL, { w: LW.det, closed: true, u: st(2, 6) });
  knock(ENG);
  line(ENG, { w: LW.out, closed: true, u: st(2, 6) });
  line(A([[1062, -83], [1238, -83]]), { w: LW.hair, u: st(3, 6) });
  line(WSH, { w: LW.det, closed: true, u: st(3, 6) });
  WINS.forEach((p, i) => line(p, { w: LW.thin, closed: true, u: clamp(st(4, 6) * 7 - i), nib: false }));
  knock(WING);
  line(WING, { w: LW.det, closed: true, u: st(4, 6) });
  line(WLET, { w: LW.det, closed: true, u: st(4, 6) });
  if (ud > 0) {
    dim([AX, AY + 70 * AK], [AX + 1432 * AK, AY + 70 * AK], 100, T("17,9 \u043C", "58 ft 8 in"), { u: ud, size: 44, font: HAND });
    dim([AX + 1512 * AK, AY - 290 * AK], [AX + 1512 * AK, AY + 70 * AK], -70, T("4,5 \u043C", "14 ft 7 in"), { u: clamp(ud * 1.3 - 0.3), size: 40, font: HAND });
    lab(T("2 \u0414\u0412\u0418\u0413\u0410\u0422\u0415\u041B\u042F PW305A", "2 \xD7 PW305A ENGINES"), AX + 520, AY - 190, { size: 32, u: clamp(ud * 2 - 1) });
    line([[AX + 1150 * AK, AY - 160], [AX + 1150 * AK, AY - 106 * AK]], { w: LW.hair, u: clamp(ud * 2 - 1), nib: false });
  }
}
var MX0 = 100;
var MY0 = 1300;
var MK = 50;
var geo = (lon, lat) => [MX0 + (lon + 100) * MK, MY0 + (31 - lat) * MK];
var COAST = [
  [-97.4, 25.9],
  [-97.2, 27.8],
  [-96.5, 28.5],
  [-95, 29.3],
  [-94, 29.7],
  [-92, 29.6],
  [-90.4, 29.2],
  [-89.3, 29.4],
  [-89.2, 30.2],
  [-88, 30.4],
  [-86.5, 30.4],
  [-85, 29.7],
  [-84, 30.1],
  [-83, 29.2],
  [-82.7, 28],
  [-82.6, 27.3],
  [-81.8, 26.1],
  [-81.1, 25.2],
  [-80.4, 25.2],
  [-80.1, 25.9],
  [-80.03, 26.7],
  [-80.6, 28.3],
  [-81.3, 29.9],
  [-81.4, 30.7],
  [-81.2, 31]
].map((p) => geo(...p));
var LAND = [...COAST, geo(-100, 31), geo(-100, 25.9)];
var ISL = [[-78.6, 26.6, 0.7, 0.13, -0.1], [-77.2, 26.4, 0.25, 0.5, 0.3], [-77.9, 24.5, 0.45, 0.7, 0], [-76.4, 25.1, 0.1, 0.5, -0.5]];
var AUS = geo(-97.74, 30.27);
var GRN = geo(-80.12, 26.62);
var ELU = geo(-76.68, 25.47);
var ROUTE = [AUS, geo(-93, 28.6), geo(-88, 27.4), geo(-84, 26.9), GRN, ELU];
var TRACK = ROUTE.slice(0, 5);
var MAPR = rect(90, 1250, 1410, 1720);
function routeMap(u, o = {}) {
  if (u <= 0) return;
  line(MAPR, { w: LW.det, closed: true, u: clamp(u * 3) });
  line(COAST, { w: LW.det, u: clamp(u * 2 - 0.2) });
  if (u > 0.5) hatch(LAND, { sp: 18, v: 0.42, u: clamp(u * 2 - 1) });
  for (const [lo, la, rx, ry, r] of ISL) {
    const [x, y] = geo(lo, la);
    const e = ell(x, y, rx * MK, ry * MK, r, 24);
    knock(e);
    line(e, { w: LW.thin, closed: true, u: clamp(u * 2 - 0.8), nib: false });
  }
  const ul = clamp(u * 2 - 1);
  hand(T("\u041E\u0421\u0422\u0418\u041D", "AUSTIN"), AUS[0] + 20, AUS[1] + 50, { u: ul, size: 44 });
  lab(T("\u0424\u041B\u041E\u0420\u0418\u0414\u0410", "FLORIDA"), 830, 1300 + 40, { u: ul, v: 0.75, size: 28, ls: 4 });
  lab(T("\u041C\u0415\u041A\u0421\u0418\u041A\u0410\u041D\u0421\u041A\u0418\u0419 \u0417\u0410\u041B\u0418\u0412", "GULF OF MEXICO"), 300, 1640, { u: ul, v: 0.65, size: 28, ls: 4 });
  hand(T("\u0411\u0410\u0413\u0410\u041C\u042B", "BAHAMAS"), 1250, 1700, { u: ul, size: 40, align: "center" });
  lab(T("\u0421\u0425\u0415\u041C\u0410 \xB7 \u0411\u0415\u0417 \u041C\u0410\u0421\u0428\u0422\u0410\u0411\u0410", "SCHEMATIC \xB7 NOT TO SCALE"), 1395, 1272 + 24, { size: 22, u: ul, v: 0.7, align: "right" });
  for (const p of [AUS, ELU]) {
    knock(circ(p[0], p[1], 11, 20));
    line(circ(p[0], p[1], 11, 24), { w: LW.det, closed: true, u: ul, nib: false });
  }
  if (o.plan > 0) line(ROUTE, { w: LW.det, dash: "phantom", u: o.plan, v: 0.8 });
  if (o.track > 0) line(TRACK, { w: LW.out * 1.5, u: o.track });
  if (o.x > 0) {
    const s = 24 * eo(o.x);
    line([[GRN[0] - s, GRN[1] - s], [GRN[0] + s, GRN[1] + s]], { w: LW.out * 1.8, nib: false });
    line([[GRN[0] + s, GRN[1] - s], [GRN[0] - s, GRN[1] + s]], { w: LW.out * 1.8, nib: false });
    hand(T("\u0413\u0420\u0418\u041D\u042D\u0419\u041A\u0415\u0420\u0421", "GREENACRES"), GRN[0] - 36, GRN[1] + 64, { size: 42, u: clamp(o.x * 2 - 0.4), align: "right" });
  }
}
var PLANE_T = [[22, 0], [8, -3], [-2, -20], [-7, -20], [-4, -3], [-16, -3], [-20, -9], [-23, -9], [-21, 0], [-23, 9], [-20, 9], [-16, 3], [-4, 3], [-7, 20], [-2, 20], [8, 3]];
function planeAt(p, a, s = 1.5) {
  const P = xf(PLANE_T, p[0], p[1], a, s);
  knock(P);
  line(P, { w: LW.det, closed: true, nib: false });
}
function along(pts, u) {
  let L = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    L += l;
  }
  let d = u * L;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = clamp(d / seg[i]);
      const a = pts[i], b = pts[i + 1];
      return [[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    d -= seg[i];
  }
}
var GX0 = 230;
var GX1 = 1330;
var GY0 = 2560;
var KM = 44;
var gy = (km) => GY0 - km * KM;
var PROF = (() => {
  const p = [];
  for (let x = 270; x <= 700; x += 20) p.push([x, gy(10.7)]);
  p.push([740, gy(10.85)]);
  p.push([770, gy(10.8)]);
  for (let i = 1; i <= 40; i++) {
    const k = i / 40;
    p.push([770 + 400 * Math.pow(k, 0.78), gy(10.8 * (1 - Math.pow(k, 1.9)))]);
  }
  return p;
})();
var CRUISE_N = 24;
function altGraph(u, o = {}) {
  if (u <= 0) return;
  line([[GX0, gy(12.4)], [GX0, GY0], [GX1, GY0]], { w: LW.out, u: clamp(u * 2) });
  const ut = clamp(u * 2 - 0.6);
  for (let k = 0; k <= 12; k += 2) {
    line([[GX0 - 14, gy(k)], [GX0, gy(k)]], { w: LW.thin, u: ut, nib: false });
    lab(String(k), GX0 - 24, gy(k) + 12, { size: 32, align: "right", u: ut });
    if (k) line([[GX0, gy(k)], [GX1, gy(k)]], { w: LW.hair, dash: "dot", u: ut, v: 0.45, nib: false });
  }
  lab(T("\u0412\u042B\u0421\u041E\u0422\u0410, \u041A\u041C", "ALTITUDE, KM"), GX0 - 20, gy(12.4) - 24, { size: 30, u: ut });
  lab(T("\u0412\u0420\u0415\u041C\u042F \u2192", "TIME \u2192"), GX1, GY0 + 52, { size: 30, align: "right", u: ut });
  if (o.cruise > 0) line(PROF.slice(0, CRUISE_N), { w: LW.out * 1.4, u: o.cruise });
  if (o.lab > 0) hand(T("10,7 \u041A\u041C", "35,000 FT"), 290, gy(10.7) - 30, { size: 52, u: o.lab });
  if (o.wx > 0) lab(T("\u0411\u041E\u041B\u0422\u0410\u041D\u041A\u0410 \xB7 \u041B\u0401\u0414 \xB7 \u041B\u0418\u0412\u0415\u041D\u042C", "TURBULENCE \xB7 ICE \xB7 RAIN"), 290, gy(9.4), { size: 30, u: o.wx });
  if (o.climb > 0) {
    const x = 640;
    line([[x, gy(10.7) - 10], [x, gy(11.5)]], { w: LW.det, dash: "hidden", u: o.climb, nib: false });
    if (o.climb >= 1) arrow([x, gy(11.5) - 2], [0, 1]);
    lab(T("\u0417\u0410\u041F\u0420\u041E\u0421: +600 \u041C", "REQUEST: +2,000 FT"), x + 22, gy(11.6), { size: 30, u: clamp(o.climb * 2 - 1) });
  }
  if (o.fall > 0) {
    line(PROF.slice(CRUISE_N - 1), { w: LW.out * 1.4, u: o.fall });
    if (o.r1 > 0) hand(T("\u22123 \u041A\u041C/\u041C\u0418\u041D", "\u221210,000 FT/MIN"), 860, gy(8.9), { size: 50, u: o.r1 });
    if (o.r2 > 0) hand(T("\u22129 \u041A\u041C/\u041C\u0418\u041D", "\u221230,000 FT/MIN"), 1180, gy(5.3), { size: 58, u: o.r2, align: "right" });
    if (o.lim > 0) lab(T("\u0417\u0410 \u041F\u0420\u0415\u0414\u0415\u041B\u041E\u041C \u041A\u041E\u041D\u0421\u0422\u0420\u0423\u041A\u0426\u0418\u0418", "BEYOND DESIGN LIMITS"), 1180, gy(4.4), { size: 26, u: o.lim, align: "right" });
  }
  if (o.end > 0) {
    const p = PROF[PROF.length - 1];
    hand("12:50", p[0] - 24, GY0 - 18, { size: 46, u: o.end, align: "right" });
  }
}
var BX = 440;
var BY = 3060;
function bank(u, ang) {
  if (u <= 0) return;
  line(circ(BX, BY, 270, 72, Math.PI, TAU), { w: LW.hair, dash: "center", u, v: 0.6 });
  line([[BX - 300, BY], [BX + 300, BY]], { w: LW.thin, dash: "center", u, v: 0.7 });
  for (let d = 0; d <= 180; d += 15) {
    const a = Math.PI + d * Math.PI / 180, r1 = d % 30 ? 256 : 244;
    line([[BX + Math.cos(a) * r1, BY + Math.sin(a) * r1], [BX + Math.cos(a) * 270, BY + Math.sin(a) * 270]], { w: LW.hair, u, nib: false });
  }
  const P = (pts) => xf(pts, BX, BY, ang);
  const wing = P([[-250, 16], [-60, 22], [60, 22], [250, 16], [252, 4], [60, 6], [-60, 6], [-252, 4]]);
  const wlL = P([[-250, 16], [-262, -30], [-254, -32], [-242, 10]]), wlR = P([[250, 16], [262, -30], [254, -32], [242, 10]]);
  const fin = P([[-20, -46], [-14, -160], [14, -160], [20, -46]]);
  const stab = P([[-115, -170], [115, -170], [108, -152], [-108, -152]]);
  const fus = P(ell(0, 0, 56, 52, 0, 48));
  const nose = P(ell(0, 6, 18, 16, 0, 24));
  const wsh = P([[-38, -20], [-14, -34], [14, -34], [38, -20], [28, -10], [-28, -10]]);
  const eL = P(ell(-82, -28, 25, 23, 0, 28)), eR = P(ell(82, -28, 25, 23, 0, 28));
  const iL = P(ell(-82, -28, 12, 11, 0, 20)), iR = P(ell(82, -28, 12, 11, 0, 20));
  for (const p of [wing, wlL, wlR, fin, stab]) {
    knock(p);
    line(p, { w: LW.det, closed: true, u, nib: false });
  }
  for (const p of [eL, eR, fus]) {
    knock(p);
    line(p, { w: LW.out, closed: true, u, nib: false });
  }
  for (const p of [iL, iR, wsh]) line(p, { w: LW.thin, closed: true, u, nib: false });
  const deg = Math.round(Math.abs(ang) * 180 / Math.PI);
  if (deg > 2) {
    line(circ(BX, BY, 190, 40, Math.PI, Math.PI + Math.abs(ang)), { w: LW.det, nib: false });
    hand(deg + "\xB0", BX - 250, BY - 110, { size: 64 });
  }
  lab(T("\u041A\u0420\u0415\u041D", "BANK"), BX, BY + 70, { size: 34, ls: 6, align: "center", u });
}
var LOG = RU ? ["\u042D\u041A\u0418\u041F\u0410\u0416: \u0411\u041E\u041B\u0422\u0410\u041D\u041A\u0410, \u041B\u0401\u0414", "\u042D\u041A\u0418\u041F\u0410\u0416: \u041F\u0420\u041E\u0421\u0418\u041C \u041D\u0410\u0411\u041E\u0420", "\u042D\u041A\u0418\u041F\u0410\u0416: MAYDAY", "\u0414\u0418\u0421\u041F\u0415\u0422\u0427\u0415\u0420: \u041D\u0415 \u041C\u041E\u041B\u0427\u0418\u0422\u0415", "\xAB\u0423 \u041D\u0410\u0421 \u0417\u0410\u041A\u0410\u041D\u0427\u0418\u0412\u0410\u0415\u0422\u0421\u042F", " \u0412\u0420\u0415\u041C\u042F\xBB", "\u2014 \u0421\u0412\u042F\u0417\u042C \u041F\u0420\u0415\u0420\u0412\u0410\u041D\u0410 \u2014"] : ["CREW: TURBULENCE, ICE", "CREW: REQUEST CLIMB", "CREW: MAYDAY", "ATC: KEEP TALKING", "\u201CWE\u2019RE GOING", " TO CRASH\u201D", "\u2014 CONTACT LOST \u2014"];
function radioLog(t) {
  const x0 = 790, y0 = 2800;
  const u0 = at(t, 4, 0, 0.8);
  if (u0 <= 0) return;
  lab(T("\u0420\u0410\u0414\u0418\u041E\u041E\u0411\u041C\u0415\u041D", "RADIO LOG"), x0, y0, { size: 40, ls: 5, u: u0, nib: true });
  line([[x0, y0 + 16], [x0 + 420, y0 + 16]], { w: LW.thin, u: u0 });
  const when = RU ? [[4, -0.5], [4, -0.3], [4, 0], [4, 3.6], [5, 0], [5, 0.4], [5, 2.6]] : [[4, -0.5], [4, -0.3], [4, 0], [4, 2.8], [5, -0.6], [5, -0.2], [5, 1.6]];
  LOG.forEach((s, i) => {
    const [si, a] = when[i];
    const u = atv(t, si, a, 0.9);
    if (u <= 0) return;
    const big = s.includes("MAYDAY");
    text(s, x0, y0 + 90 + i * 66, { size: big ? 62 : 44, font: NAR, weight: 700, u, nib: u < 1 });
  });
}
var S0 = 3480;
var S1 = 3960;
var RX = 800;
var IMP = [742, 3720];
var HOUSES = (() => {
  const H2 = [];
  let s = 7;
  const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let y = S0 + 30; y < S1 - 40; y += 72) for (let x = 120; x < 720; x += 92) {
    if (Math.hypot(x + 28 - IMP[0], y + 22 - IMP[1]) < 110) continue;
    if (y > 3690 && y < 3770) continue;
    H2.push([x + rnd() * 8, y + rnd() * 6, 54 + rnd() * 12, 40 + rnd() * 6]);
  }
  return H2;
})();
var MOBILE = (() => {
  const M = [];
  for (let y = S0 + 40; y < S1 - 40; y += 40) for (let x = 900; x < 1360; x += 60) {
    if (y > 3690 && y < 3770) continue;
    M.push([x, y, 42, 22]);
  }
  return M;
})();
function sitePlan(u, o = {}) {
  if (u <= 0) return;
  line(rect(90, S0, 1410, S1), { w: LW.det, closed: true, u: clamp(u * 3) });
  const ur = clamp(u * 2 - 0.2);
  line([[RX - 40, S0], [RX - 40, S1]], { w: LW.det, u: ur });
  line([[RX + 40, S0], [RX + 40, S1]], { w: LW.det, u: ur });
  line([[RX, S0], [RX, S1]], { w: LW.hair, dash: "center", u: ur, v: 0.7 });
  line([[90, 3700], [RX - 40, 3700]], { w: LW.det, u: ur });
  line([[90, 3762], [RX - 40, 3762]], { w: LW.det, u: ur });
  line([[RX + 40, 3700], [1410, 3700]], { w: LW.det, u: ur });
  line([[RX + 40, 3762], [1410, 3762]], { w: LW.det, u: ur });
  const uh = clamp(u * 2 - 0.8);
  HOUSES.forEach((h, i) => {
    const k = clamp(uh * HOUSES.length / 6 - i / 6);
    if (k > 0) line(rect(h[0], h[1], h[0] + h[2], h[1] + h[3]), { w: LW.thin, closed: true, u: k, nib: false });
  });
  MOBILE.forEach((h, i) => {
    const k = clamp(uh * MOBILE.length / 8 - i / 8);
    if (k > 0) line(rect(h[0], h[1], h[0] + h[2], h[1] + h[3]), { w: LW.hair, closed: true, u: k, nib: false, v: 0.85 });
  });
  if (uh > 0.5) {
    lab("MILITARY TRAIL", RX + 12, S1 - 30, { size: 26, ls: 3, rot: -Math.PI / 2, u: clamp(uh * 2 - 1) });
    line([[1360, 3600], [1360, 3530]], { w: LW.det, nib: false });
    arrow([1360, 3526], [0, 1]);
    lab(T("\u0421", "N"), 1360, 3645, { size: 30, align: "center" });
  }
  if (o.x > 0) {
    const r = 66 * eo(o.x);
    knock(circ(IMP[0], IMP[1], r, 40));
    hatch(circ(IMP[0], IMP[1], r, 40), { sp: 9, v: 0.9 });
    line(circ(IMP[0], IMP[1], r, 48), { w: LW.det, closed: true, nib: false });
    const s = 28;
    line([[IMP[0] - s, IMP[1] - s], [IMP[0] + s, IMP[1] + s]], { w: LW.out * 1.8, nib: false });
    line([[IMP[0] + s, IMP[1] - s], [IMP[0] - s, IMP[1] + s]], { w: LW.out * 1.8, nib: false });
    fxShadow(circ(IMP[0], IMP[1], r * 1.6, 40), 0.35 * o.x, 30);
    const ul = clamp(o.x * 2 - 0.6);
    line([[IMP[0] - 50, IMP[1] + 50], [560, 3870]], { w: LW.hair, u: ul, nib: false });
    hand(T("\u041C\u0415\u0421\u0422\u041E \u041F\u0410\u0414\u0415\u041D\u0418\u042F", "IMPACT"), 550, 3880, { size: 48, align: "right", u: ul });
    lab(T("12:50 \xB7 \u0416\u0418\u041B\u041E\u0419 \u0420\u0410\u0419\u041E\u041D", "12:50 PM \xB7 HOMES"), 550, 3924, { size: 28, align: "right", u: ul });
  }
  if (o.evac > 0) {
    line(rect(870, S0 + 20, 1390, S1 - 20), { w: LW.det, closed: true, dash: "phantom", u: o.evac });
    hand(T("\u042D\u0412\u0410\u041A\u0423\u0410\u0426\u0418\u042F \u2248 600 \u0427\u0415\u041B.", "EVACUATED \u2248 600"), 1130, 3735 + 10, { size: 44, align: "center", u: clamp(o.evac * 2 - 1) });
  }
  if (o.plan > 0) lab(T("\u0421\u0425\u0415\u041C\u0410 \xB7 \u0413\u0420\u0418\u041D\u042D\u0419\u041A\u0415\u0420\u0421", "SITE \xB7 GREENACRES"), 1400, S0 - 16, { size: 26, align: "right", u: o.plan, v: 0.8 });
}
var TB = { x0: 90, y0: 4020, x1: 1410, y1: 4380 };
function titleBlock(u, cause) {
  if (u <= 0) return;
  const { x0, y0, x1, y1 } = TB, xm = 750, rh = (y1 - y0) / 4;
  line(rect(x0, y0, x1, y1), { w: LW.out * 1.2, closed: true, u: clamp(u * 2) });
  for (let r = 1; r < 4; r++) line([[x0, y0 + rh * r], [x1, y0 + rh * r]], { w: LW.det, u: clamp(u * 2 - 0.4), nib: false });
  line([[xm, y0], [xm, y1]], { w: LW.det, u: clamp(u * 2 - 0.5), nib: false });
  const ul = clamp(u * 2 - 1);
  const F = RU ? [["\u0411\u041E\u0420\u0422", "LEARJET 60"], ["\u041C\u0410\u0420\u0428\u0420\u0423\u0422", "\u041E\u0421\u0422\u0418\u041D \u2192 \u0411\u0410\u0413\u0410\u041C\u042B"], ["\u0414\u0410\u0422\u0410", "01.11.2026"], ["\u0412\u0420\u0415\u041C\u042F", "12:50 \u041C\u0415\u0421\u0422\u041D."], ["\u041D\u0410 \u0411\u041E\u0420\u0422\u0423", "9 \u0427\u0415\u041B\u041E\u0412\u0415\u041A"], ["\u0420\u0410\u0421\u0421\u041B\u0415\u0414\u041E\u0412\u0410\u041D\u0418\u0415", "NTSB \xB7 FAA"], ["\u041F\u0420\u0418\u0427\u0418\u041D\u0410", "\u041D\u0415 \u0423\u0421\u0422\u0410\u041D\u041E\u0412\u041B\u0415\u041D\u0410"], ["\u0412\u042B\u0416\u0418\u0412\u0428\u0418\u0415", ""]] : [["AIRCRAFT", "LEARJET 60"], ["ROUTE", "AUSTIN \u2192 BAHAMAS"], ["DATE", "01 NOV 2026"], ["TIME", "12:50 PM EST"], ["ON BOARD", "9 PEOPLE"], ["INVESTIGATION", "NTSB \xB7 FAA"], ["CAUSE", "NOT YET KNOWN"], ["SURVIVORS", ""]];
  F.forEach(([l, v], i) => {
    const x = i % 2 ? xm : x0, y = y0 + rh * (i >> 1);
    lab(l, x + 14, y + 28, { size: 20, v: 0.75, u: ul });
    if (v) hand(v, x + 18, y + 76, { size: 48, u: l === F[6][0] ? cause : ul });
  });
}
function stampRed(x, y, s, a, lines2) {
  if (a <= 0) return;
  f.globalCompositeOperation = "lighter";
  camMatrix(f, x, y, -0.1);
  f.scale(s, s);
  f.font = `700 120px ${NAR}`;
  f.letterSpacing = "8px";
  const w = Math.max(...lines2.map((l) => f.measureText(l).width)) + 90, h = lines2.length * 130 + 60;
  f.strokeStyle = `rgba(0,0,255,${a})`;
  f.lineWidth = 12;
  f.strokeRect(-w / 2, -h / 2, w, h);
  f.lineWidth = 4;
  f.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32);
  f.fillStyle = `rgba(0,0,255,${a})`;
  f.textAlign = "center";
  f.textBaseline = "middle";
  lines2.forEach((l, i) => f.fillText(l, 4, -h / 2 + 95 + i * 130));
  f.letterSpacing = "0px";
  f.setTransform(1, 0, 0, 1, 0, 0);
}
function captions(t) {
  const c = ov;
  c.setTransform(1, 0, 0, 1, 0, 0);
  let cur = null;
  for (const s of SH_) for (const p of s.phr) if (t >= p[0] - 0.05 && t < p[1] + 0.25) cur = p;
  if (!cur) return;
  const str = cur[2].replace(/[*\u0301]/g, "").trim().replace(/\s*[—–-]$/, "").replace(/[.…]+$/, "").replace(/,$/, "").toUpperCase();
  const k = clamp((t - cur[0] + 0.05) / 0.12);
  c.font = "900 66px R";
  c.textAlign = "center";
  c.textBaseline = "middle";
  const words = str.split(" "), L = [];
  let ln = "";
  for (const w of words) {
    const tt = ln ? ln + " " + w : w;
    if (c.measureText(tt).width > 920 && ln) {
      L.push(ln);
      ln = w;
    } else ln = tt;
  }
  if (ln) L.push(ln);
  const y0 = 1440 - (L.length - 1) * 40;
  c.globalAlpha = k;
  c.lineJoin = "round";
  L.forEach((l, i) => {
    const y = y0 + i * 80;
    c.lineWidth = 8;
    c.strokeStyle = "#000";
    c.strokeText(l, W / 2, y);
    c.fillStyle = "#fff";
    c.fillText(l, W / 2, y);
  });
  c.globalAlpha = 1;
}
var CAMS = [
  [{ x: 750, y: 1160, z: 0.8, r: -0.015 }, { x: 750, y: 1120, z: 0.84, r: 0 }],
  // 0 hook: header + aircraft
  [{ x: 750, y: 1300, z: 0.76 }, { x: 750, y: 1420, z: 0.8 }],
  // 1 aircraft + route
  [{ x: 750, y: 2200, z: 0.8 }, { x: 750, y: 2220, z: 0.84 }],
  // 2 altitude, cruise
  [{ x: 820, y: 2300, z: 0.96 }, { x: 860, y: 2360, z: 1.04 }],
  // 3 the fall
  [{ x: 750, y: 2900, z: 0.8 }, { x: 720, y: 2960, z: 0.88, r: 0.02 }],
  // 4 bank + mayday
  [{ x: 1e3, y: 3060, z: 1.06 }, { x: 1010, y: 3080, z: 1.1 }],
  // 5 radio log, silence
  [{ x: 750, y: 3700, z: 0.8 }, { x: 750, y: 3740, z: 0.86 }],
  // 6 site plan, impact
  [{ x: 750, y: 3940, z: 0.8 }, { x: 750, y: 3980, z: 0.82 }],
  // 7 evacuation + cause
  [{ x: 750, y: 4020, z: 0.85, free: 1 }, { x: 750, y: 2575, z: 0.36, free: 1 }]
  // 8 pull back to the whole sheet
];
function shotAt(t) {
  for (let i = SH_.length - 1; i >= 0; i--) if (t >= SH_[i].t0) return i;
  return 0;
}
function render(t) {
  const i = shotAt(t), s = SH_[i];
  let k = clamp((t - s.t0) / (s.t1 - s.t0));
  if (i === 8) k = clamp((t - (s.v1 + 0.3)) / 0.45);
  k = ease(k);
  const [c0, c1] = CAMS[i];
  let cx = lerp(c0.x, c1.x, k), cy = lerp(c0.y, c1.y, k), z = lerp(c0.z, c1.z, k);
  if (!c0.free) {
    const hw = W / 2 / z, hh = H / 2 / z;
    cx = clamp(cx, Math.min(hw, SW / 2), Math.max(SW - hw, SW / 2));
    cy = clamp(cy, hh, SHH - hh);
  }
  setCam({ x: cx, y: cy, z, r: lerp(c0.r || 0, c1.r || 0, k) });
  clear();
  border();
  header(at(t, 0, 0.2, 2.2));
  const hq = at(t, 0, 0.6, 1.4);
  if (hq > 0) text(T("\xAB\u041C\u042B \u0420\u0410\u0417\u041E\u0411\u042C\u0401\u041C\u0421\u042F\xBB", "\u201CWE\u2019RE GOING TO CRASH\u201D"), 1390, 540, { size: 86, font: HAND, weight: 700, align: "right", u: hq });
  figLabel(1, T("\u0412\u0418\u0414 \u0421\u0411\u041E\u041A\u0423", "SIDE ELEVATION"), 120, 1110, at(t, 0, 2.4, 1));
  aircraft(at(t, 0, 0.5, 4.2), at(t, 1, 0.2, 1.6));
  figLabel(2, T("\u041C\u0410\u0420\u0428\u0420\u0423\u0422", "ROUTE"), 1110, 1230 - 20, at(t, 1, 1, 1));
  const trk = clamp(at(t, 1, 4.2, 3.6) * 0.45 + at(t, 3, 0, 5) * 0.45 + at(t, 6, 0, 0.9) * 0.1);
  routeMap(at(t, 1, 0.6, 2.4), { plan: at(t, 1, 2.4, 3), track: trk, x: at(t, 6, 0.4, 0.6) });
  if (trk > 0 && trk < 1 && i < 6) {
    const [p, a] = along(TRACK, trk);
    planeAt(p, a);
  }
  figLabel(3, T("\u041F\u0420\u041E\u0424\u0418\u041B\u042C \u0412\u042B\u0421\u041E\u0422\u042B", "ALTITUDE PROFILE"), 120, 1850, at(t, 2, 0, 1));
  altGraph(at(t, 2, 0.2, 1.8), {
    cruise: at(t, 2, 0.9, 2.4),
    lab: atv(t, 2, 0.2, 0.8),
    wx: atv(t, 2, RU ? 1.4 : 1.6, 1.2),
    climb: atv(t, 2, RU ? 5 : 4.8, 1.2),
    fall: clamp(at(t, 3, 0.6, 2.2) * 0.35 + at(t, 3, 2.8, 3.4) * 0.45 + at(t, 4, 0, 4.5) * 0.12 + at(t, 5, 0, 2) * 0.08),
    r1: atv(t, 3, RU ? 1.6 : 1.4, 0.8),
    r2: atv(t, 3, RU ? 3.4 : 2.9, 0.8),
    lim: atv(t, 3, RU ? 4.8 : 4, 0.9),
    end: at(t, 6, 0.3, 0.6)
  });
  figLabel(4, T("\u041A\u0420\u0415\u041D \u0418 \u0420\u0410\u0414\u0418\u041E\u041E\u0411\u041C\u0415\u041D", "BANK & RADIO"), 120, 2700, at(t, 4, 0, 1));
  bank(at(t, 4, 0, 0.8), -60 * Math.PI / 180 * eo(at(t, 4, 0.6, 3.2)));
  radioLog(t);
  figLabel(5, T("\u0421\u0425\u0415\u041C\u0410 \u041C\u0415\u0421\u0422\u0410", "SITE PLAN"), 120, 3380, at(t, 6, 0, 0.8));
  sitePlan(at(t, 6, 0.1, 1.6), { x: at(t, 6, 0.5, 0.5), evac: atv(t, 7, 0, 1.6), plan: at(t, 6, 0.8, 0.8) });
  {
    const u = at(t, 7, 3, 1.2);
    lab(T("\u0418\u0421\u0422\u041E\u0427\u041D\u0418\u041A\u0418: FAA, NTSB, PBS NEWSHOUR, CBS NEWS", "SOURCES: FAA, NTSB, PBS NEWSHOUR, CBS NEWS"), 120, 5e3, { size: 24, v: 0.7, u });
    lab(T("\u0414\u0410\u041D\u041D\u042B\u0415 \u041D\u0410 02.11.2026", "AS OF 02 NOV 2026"), 120, 5040, { size: 24, v: 0.7, u });
  }
  titleBlock(at(t, 7, RU ? 1.6 : 1.4, 1.6), atv(t, 7, RU ? 2.6 : 2.2, 1));
  const ts = SH_[8].v1 + 0.85, sa = clamp((t - ts) / 0.08);
  if (sa > 0) stampRed(750, 2500, 2.3 * lerp(1.4, 1, eo(clamp((t - ts) / 0.12))), 0.95 * sa, RU ? ["9 \u041D\u0410 \u0411\u041E\u0420\u0422\u0423", "\u0412\u042B\u0416\u0418\u0412\u0428\u0418\u0425 \u041D\u0415\u0422"] : ["9 ON BOARD", "NO SURVIVORS"]);
  nibs();
  captions(t);
  if (t >= ts && t < ts + 0.05) cam.x += 6;
  return { sheet: [SW, SHH], cam: { ...cam }, seed: 5, fade: clamp((t - (D.dur - 1.6)) / 1.4) };
}
window.render = (t) => comp(inkC, fxC, ovC, render(t));
window.DUR = D.dur;
window.READY = true;
