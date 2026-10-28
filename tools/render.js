// Render an episode with headless Chromium.
//   node tools/render.js <episodeDir> test 0,2.5,7      -> <episodeDir>/check/tXX.png + sheet
//   node tools/render.js <episodeDir> video out/video.mp4 [fps]
// Also writes <episodeDir>/sfx.json (sound cue list used by tools/music.py).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  const [epDir, mode, arg, fpsArg] = process.argv.slice(2);
  const ep = path.relative(ROOT, path.resolve(epDir));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log('[pageerror]', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/engine/index.html?ep=${ep}`);
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); }
  catch (e) { console.log('ENGINE FAILED TO START', errors.join('\n')); process.exit(2); }
  const sfx = await page.evaluate(() => window.SFX);
  fs.writeFileSync(path.join(epDir, 'sfx.json'), JSON.stringify(sfx));
  const stage = await page.$('#stage');
  if (mode === 'test') {
    const dir = path.join(epDir, 'check'); fs.mkdirSync(dir, { recursive: true });
    const times = arg ? arg.split(',').map(Number) : null;
    const dur = await page.evaluate(() => window.DUR);
    const list = times || Array.from({ length: 12 }, (_, i) => +(0.4 + i * (dur - 0.8) / 11).toFixed(2));
    const files = [];
    for (const [i, t] of list.entries()) {
      await page.evaluate(t => window.renderAt(t), t);
      const f = path.join(dir, `f${String(i).padStart(2, '0')}_${t}.png`); await stage.screenshot({ path: f }); files.push(f);
    }
    await new Promise(r => spawn('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 'f*.png'), '-vf', `scale=270:-1,tile=${Math.min(6, files.length)}x${Math.ceil(files.length / 6)}`, path.join(dir, 'sheet.png')], { stdio: 'inherit' }).on('close', r));
    console.log('test frames:', list.join(', '), '->', path.join(dir, 'sheet.png'));
  } else {
    const fps = Number(fpsArg || 30), dur = await page.evaluate(() => window.DUR), N = Math.round(dur * fps);
    fs.mkdirSync(path.dirname(path.resolve(arg)), { recursive: true });
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', arg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await page.evaluate(t => window.renderAt(t), i / fps);
      const buf = await stage.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(`done ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.length);
  await browser.close(); server.close();
})();
