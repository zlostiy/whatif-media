// Full GPU renderer: 3D (WebGL) + HTML overlays (captions, cards, badges) composited in the browser, encoded with WebCodecs.
// run({base, topic, lang, w, h, name}) -> window.__gpuBlob (silent mp4); save() offers it as a download.
const CSS = `html,body{margin:0;padding:0;overflow:hidden;background:#000}
#wrap{position:relative;overflow:hidden}
canvas{display:block}
.ov{position:absolute;inset:0;pointer-events:none;font-family:Intro,R,RL,sans-serif;color:#fff;text-transform:uppercase}
#vign{position:absolute;inset:0;background:radial-gradient(ellipse 80% 70% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,10,.6) 100%)}
#full{position:absolute;inset:0;opacity:0}
#badge{position:absolute;left:56px;top:150px;transform-origin:left center}
#badge .pill{display:inline-flex;align-items:center;gap:14px;background:#ffd23f;color:#1a1033;font-weight:900;font-size:54px;padding:12px 30px 12px 22px;border-radius:999px;border:6px solid #1a1033;box-shadow:0 8px 0 #1a1033}
#badge .pill i{display:inline-block;width:34px;height:34px;border-radius:50%;background:#ff4b5c;border:5px solid #1a1033}
#badge .loc{margin-top:18px;font-weight:700;font-size:30px;letter-spacing:1px;text-shadow:0 3px 0 #1a1033,0 0 12px rgba(0,0,0,.6);opacity:.95}
#cap{position:absolute;left:60px;right:60px;bottom:560px;text-align:center;font-weight:900;font-size:82px;line-height:1.08}
#cap span{display:inline-block;margin:0 14px;transform-origin:center bottom}
#cap span.h{color:#ffd23f}
.card{position:absolute;left:50%;transform-origin:center top;background:#fff;color:#1a1033;border:7px solid #1a1033;border-radius:34px;box-shadow:0 12px 0 #1a1033;padding:26px 36px;text-align:center}
.card .t{font-weight:900;font-size:34px;letter-spacing:2px;text-transform:uppercase;color:#ff4b5c;white-space:nowrap}
.card .v{font-weight:900;font-size:96px;line-height:1.05;font-variant-numeric:tabular-nums;white-space:nowrap}
.card .v small{font-size:44px}
.card .n{font-weight:700;font-size:30px;opacity:.8;margin-top:4px}
.bar{height:34px;border-radius:17px;background:#e6e3f0;border:5px solid #1a1033;margin-top:16px;overflow:hidden;position:relative;display:flex}
.bar div{height:100%}
#bub{position:absolute;left:0;top:0;width:100%;height:100%}
#flash{position:absolute;inset:0;background:#fff;opacity:0}
#black{position:absolute;inset:0;background:#000;opacity:0}`;
const FONT = f => `https://cdn.jsdelivr.net/npm/@fontsource/rubik@5.1.0/files/rubik-${f}-normal.woff2`;
async function dataUrl(u) { const b = await fetch(u).then(r => r.blob()); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
export async function run({ base, topic, lang = 'en', w = 1080, h = 1920, name, fps = 30, bitrate = 12e6 }) {
  window.__gpu = { state: 'loading', frame: 0, total: 0 };
  history.replaceState(null, '', `/?topic=${topic}&w=${w}&h=${h}&lang=${lang}`);
  const fonts = {}; for (const f of ['cyrillic-900', 'cyrillic-700', 'latin-900', 'latin-700']) fonts[f] = await dataUrl(FONT(f));
  const FF = `@font-face{font-family:R;font-weight:900;src:url(${fonts['cyrillic-900']})}@font-face{font-family:R;font-weight:700;src:url(${fonts['cyrillic-700']})}@font-face{font-family:RL;font-weight:900;src:url(${fonts['latin-900']})}@font-face{font-family:RL;font-weight:700;src:url(${fonts['latin-700']})}`;
  document.head.innerHTML = `<meta charset="utf-8"><style>${FF}${CSS}</style>`;
  const im = document.createElement('script'); im.type = 'importmap';
  im.textContent = JSON.stringify({ imports: { three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', 'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/' } });
  document.head.appendChild(im);
  document.body.innerHTML = '<div id="wrap"><canvas id="c"></canvas><div class="ov"><div id="vign"></div><div id="full"></div><div id="black"></div><div id="badge"><div class="pill"><i></i><span id="dayt"></span></div><div class="loc" id="loct"></div></div><div id="cards"></div><div id="cap"></div><canvas id="bub"></canvas><div id="flash"></div></div></div>';
  window.DATA = await fetch(base + `topics/${topic}/data_${lang}.json`).then(r => r.json());
  window.RENDER_MODE = 'full';
  const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/+esm');
  const src = await fetch(base + `dist/${topic}.js`).then(r => r.text());
  await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  await window.ready;
  const gl = document.getElementById('c'), ov = document.querySelector('.ov'), bub = document.getElementById('bub');
  const comp = document.createElement('canvas'); comp.width = w; comp.height = h; const cx = comp.getContext('2d');
  const STYLE = `<style>${FF}${CSS}</style>`;
  const N = Math.ceil(window.TOTAL * fps);
  window.__gpu = { state: 'rendering', frame: 0, total: N, t0: performance.now(), ovDraws: 0 };
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null; const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { err = e; } });
  enc.configure({ codec: 'avc1.640033', width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } });
  let lastHtml = null, lastImg = null;
  for (let f = 0; f < N; f++) {
    window.setTime(f / fps);
    cx.drawImage(gl, 0, 0, w, h);
    const html = new XMLSerializer().serializeToString(ov);
    if (html !== lastHtml) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${STYLE}${html.replace(/<canvas[^>]*?(\/>|><\/canvas>)/g, '')}</div></foreignObject></svg>`;
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode(); lastImg = img; lastHtml = html; window.__gpu.ovDraws++;
    }
    cx.drawImage(lastImg, 0, 0, w, h);
    cx.drawImage(bub, 0, 0, w, h);
    const vf = new VideoFrame(comp, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: f % 60 === 0 }); vf.close();
    if (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 1));
    if (err) { window.__gpu.state = 'error: ' + err.message; return; }
    window.__gpu.frame = f + 1;
  }
  await enc.flush(); muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  Object.assign(window.__gpu, { state: 'encoded', bytes: blob.size, ms: performance.now() - window.__gpu.t0 });
  window.__gpuBlob = blob; window.__gpuName = (name || `${topic}_${lang}_${w}x${h}`) + '.mp4';
  return window.__gpu;
}
export function preview(t) { window.setTime(t); }
export function save() { const a = document.createElement('a'); a.href = URL.createObjectURL(window.__gpuBlob); a.download = window.__gpuName; document.body.appendChild(a); a.click(); window.__gpu.state = 'saved'; return window.__gpuName; }
