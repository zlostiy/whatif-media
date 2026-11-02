// GPU runner for the blueprint news film: run({base, lang, fps}) renders every frame in this browser and encodes an mp4 with WebCodecs.
export async function run({ base, lang = 'ru', fps = 30, bitrate = 10e6, name }) {
  window.__gpu = { state: 'loading', frame: 0, total: 0 };
  document.head.innerHTML = '<meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style>';
  document.body.innerHTML = '<canvas id="c" width="1080" height="1920"></canvas>';
  window.JET_BASE = base; window.JET_LANG = lang; window.READY = false;
  const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/+esm');
  const src = await fetch(base + 'jet.js').then(r => r.text());
  await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  for (let i = 0; i < 200 && !window.READY; i++) await new Promise(r => setTimeout(r, 50));
  const cv = document.getElementById('c'), W = cv.width, H = cv.height, N = Math.ceil(window.DUR * fps);
  window.__gpu = { state: 'rendering', frame: 0, total: N, t0: performance.now() };
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err = null; const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { err = e; } });
  enc.configure({ codec: 'avc1.640033', width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } });
  for (let f = 0; f < N; f++) {
    window.render(f / fps);
    const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: f % 60 === 0 }); vf.close();
    if (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 1));
    if (err) { window.__gpu.state = 'error: ' + err.message; return; }
    window.__gpu.frame = f + 1;
  }
  await enc.flush(); muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  Object.assign(window.__gpu, { state: 'encoded', bytes: blob.size, ms: performance.now() - window.__gpu.t0 });
  window.__gpuBlob = blob; window.__gpuName = name || `jet_${lang}.mp4`;
  return window.__gpu;
}
