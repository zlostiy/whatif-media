// GPU renderer: runs the 3D layer of a topic in a real browser (WebGL on the GPU) and encodes it with WebCodecs.
// Usage (from any blank https page):  const m = await import(BASE + 'gpu_run.js'); m.run({topic, lang, w, h, name})
// Progress: window.__gpu = {state, frame, total, ms}. Output: downloads <name>.mp4 (3D only, no captions/audio).
export async function run({ topic, lang = 'en', w = 1080, h = 1920, name, fps = 30, bitrate = 16e6, from = 0, to = 0 }) {
  const BASE = new URL('./', import.meta.url).href;
  window.__gpu = { state: 'loading', frame: 0, total: 0 };
  history.replaceState(null, '', `/?topic=${topic}&w=${w}&h=${h}&lang=${lang}`);
  document.head.innerHTML = '<meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}#wrap{position:relative;overflow:hidden}.ov{display:none}</style>';
  const im = document.createElement('script'); im.type = 'importmap';
  im.textContent = JSON.stringify({ imports: { three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', 'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/' } });
  document.head.appendChild(im);
  document.body.innerHTML = '<div id="wrap"><canvas id="c"></canvas><div class="ov"><div id="vign"></div><div id="full"></div><div id="black"></div><div id="badge"><div class="pill"><i></i><span id="dayt"></span></div><div class="loc" id="loct"></div></div><div id="cards"></div><div id="cap"></div><canvas id="bub"></canvas><div id="flash"></div></div></div>';
  window.DATA = await fetch(BASE + `topics/${topic}/data_${lang}.json`).then(r => r.json());
  window.RENDER_MODE = 'gpu';
  const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/+esm');
  await import(BASE + `topics/${topic}/scene.js`);
  await window.ready;
  const canvas = document.getElementById('c');
  const N = Math.ceil(window.TOTAL * fps), a = from, b = to ? Math.min(N, to) : N;
  window.__gpu = { state: 'rendering', frame: a, total: N, t0: performance.now() };
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { err = e; } });
  enc.configure({ codec: 'avc1.640033', width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } });
  for (let f = a; f < b; f++) {
    window.setTime(f / fps);
    const vf = new VideoFrame(canvas, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: (f - a) % 60 === 0 }); vf.close();
    if (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 1));
    if (err) { window.__gpu.state = 'error: ' + err.message; return; }
    window.__gpu.frame = f + 1;
    if (f % 30 === 0) await new Promise(r => setTimeout(r, 0));
  }
  await enc.flush(); muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  window.__gpu = Object.assign(window.__gpu, { state: 'encoded', bytes: blob.size, ms: performance.now() - window.__gpu.t0 });
  window.__gpuBlob = blob; window.__gpuName = (name || `${topic}_${lang}_${w}x${h}`) + '.mp4';
  return window.__gpu;
}
export function save() { const a = document.createElement('a'); a.href = URL.createObjectURL(window.__gpuBlob); a.download = window.__gpuName; document.body.appendChild(a); a.click(); window.__gpu.state = 'saved'; return window.__gpuName; }
