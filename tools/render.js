// Render odcinka przez Remotion (silnik w remotion/).
//   node tools/render.js <episodeDir> test [t1,t2,...] [--draft]   -> <episodeDir>/check/*.png + check/sheet.png
//   node tools/render.js <episodeDir> video out/video.mp4 [--draft]
// Tryb video renderuje w częściach po CHUNK klatek do out/chunks/<slug>/ i można go przerwać:
// ponowne uruchomienie tej samej komendy pomija gotowe części i kontynuuje. Na końcu skleja
// części w jeden plik i wypisuje linię zaczynającą się od "done".
// Zapisuje też <episodeDir>/sfx.json (lista efektów dla tools/music.py).
const path = require('path');
const fs = require('fs');
const {spawnSync} = require('child_process');
const {bundle} = require('@remotion/bundler');
const {ensureBrowser, openBrowser, renderMedia, renderStill, selectComposition} = require('@remotion/renderer');

const ROOT = path.resolve(__dirname, '..');
const RDIR = path.join(ROOT, 'remotion');
const CHUNK = Number(process.env.CHUNK || 150);
const CONCURRENCY = Number(process.env.CONCURRENCY || 1);
const chromiumOptions = {gl: 'swangle'};

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

function writeCurrent(epDir) {
	const rel = path.relative(path.join(RDIR, 'src'), epDir).split(path.sep).join('/');
	const src = `// WYGENEROWANE przez tools/render.js: wskazuje odcinek do renderu.\n` +
		`import episode from '${rel}/episode.json';\nimport timeline from '${rel}/timeline.json';\nimport scene from '${rel}/scene';\n` +
		`export {episode, timeline, scene};\n`;
	fs.writeFileSync(path.join(RDIR, 'src', 'current.ts'), src);
}

(async () => {
	const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
	const draft = process.argv.includes('--draft');
	const [epArg, mode, arg] = args;
	if (!epArg || !mode) {
		console.log('usage: node tools/render.js <episodeDir> test [times] | video <out.mp4> [--draft]');
		process.exit(1);
	}
	const epDir = path.resolve(epArg);
	for (const f of ['episode.json', 'timeline.json', 'scene.tsx']) {
		if (!fs.existsSync(path.join(epDir, f))) {
			console.log(`ERROR missing ${f} in ${epDir}`);
			process.exit(2);
		}
	}
	const episode = JSON.parse(fs.readFileSync(path.join(epDir, 'episode.json'), 'utf8'));
	const hdri = path.join(RDIR, 'public', 'hdri', 'studio.hdr');
	if (!fs.existsSync(hdri)) log('WARNING: brak remotion/public/hdri/studio.hdr (uruchom bash tools/assets.sh). Render użyje samych lightformerów.');

	writeCurrent(epDir);
	log('bundling...');
	const serveUrl = await bundle({entryPoint: path.join(RDIR, 'src', 'index.ts'), publicDir: path.join(RDIR, 'public')});
	await ensureBrowser();
	const browser = await openBrowser('chrome', {chromiumOptions});
	const lean = process.env.FX_LEAN === '1';
	const inputProps = {quality: draft ? 'draft' : 'final', ...(lean ? {fx: {msaa: 0, reflector: false, contact: false}} : {})};
	if (lean) log('FX_LEAN=1: bez MSAA, prostsza podłoga, bez cieni kontaktowych');
	const composition = await selectComposition({serveUrl, id: 'Reel', inputProps, puppeteerInstance: browser, chromiumOptions, timeoutInMilliseconds: 180000});
	fs.writeFileSync(path.join(epDir, 'sfx.json'), JSON.stringify(composition.props.sfx || []));
	const N = process.env.LIMIT ? Math.min(Number(process.env.LIMIT), composition.durationInFrames) : composition.durationInFrames; // LIMIT tylko do testów
	log(`composition ${N} frames (${(N / composition.fps).toFixed(1)} s), quality ${inputProps.quality}`);

	if (mode === 'test') {
		const dir = path.join(epDir, 'check');
		fs.rmSync(dir, {recursive: true, force: true});
		fs.mkdirSync(dir, {recursive: true});
		const dur = N / composition.fps;
		const times = arg ? arg.split(',').map(Number) : Array.from({length: 12}, (_, i) => +(0.4 + (i * (dur - 0.8)) / 11).toFixed(2));
		for (const [i, t] of times.entries()) {
			const frame = Math.min(N - 1, Math.max(0, Math.round(t * composition.fps)));
			const out = path.join(dir, `f${String(i).padStart(2, '0')}_${t}.png`);
			const t0 = Date.now();
			await renderStill({composition, serveUrl, frame, output: out, inputProps, puppeteerInstance: browser, chromiumOptions, timeoutInMilliseconds: 180000});
			log(`still t=${t}s (frame ${frame}) ${((Date.now() - t0) / 1000).toFixed(1)}s`);
		}
		const cols = Math.min(6, times.length);
		spawnSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 'f*.png'), '-vf', `scale=270:-1,tile=${cols}x${Math.ceil(times.length / cols)}`, path.join(dir, 'sheet.png')], {stdio: 'inherit'});
		log('test frames:', times.join(', '), '->', path.join(dir, 'sheet.png'));
	} else if (mode === 'video') {
		const out = path.resolve(arg || 'out/video.mp4');
		const cdir = path.join(ROOT, 'out', 'chunks', episode.slug + (draft ? '-draft' : '') + (lean ? '-lean' : ''));
		fs.mkdirSync(cdir, {recursive: true});
		const parts = [];
		for (let a = 0; a < N; a += CHUNK) parts.push([a, Math.min(N - 1, a + CHUNK - 1)]);
		const tStart = Date.now();
		let rendered = 0;
		for (const [i, [a, b]] of parts.entries()) {
			const f = path.join(cdir, `c${String(i).padStart(3, '0')}.mp4`);
			if (fs.existsSync(f)) {
				log(`chunk ${i + 1}/${parts.length} already done, skipping`);
				continue;
			}
			const tmp = f.replace('.mp4', '.part.mp4');
			const t0 = Date.now();
			await renderMedia({
				composition,
				serveUrl,
				codec: 'h264',
				crf: 16,
				pixelFormat: 'yuv420p',
				imageFormat: 'jpeg',
				jpegQuality: 94,
				frameRange: [a, b],
				outputLocation: tmp,
				inputProps,
				puppeteerInstance: browser,
				chromiumOptions,
				concurrency: CONCURRENCY,
				timeoutInMilliseconds: 180000,
			});
			fs.renameSync(tmp, f);
			rendered += b - a + 1;
			const s = (Date.now() - t0) / 1000;
			log(`chunk ${i + 1}/${parts.length} frames ${a}-${b} in ${s.toFixed(0)}s (${(s / (b - a + 1)).toFixed(1)} s/frame)`);
		}
		const list = path.join(cdir, 'list.txt');
		fs.writeFileSync(list, parts.map((_, i) => `file '${path.join(cdir, `c${String(i).padStart(3, '0')}.mp4`)}'`).join('\n'));
		fs.mkdirSync(path.dirname(out), {recursive: true});
		const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], {stdio: 'inherit'});
		if (r.status !== 0) {
			log('ERROR concat failed');
			process.exit(3);
		}
		console.log(`done ${N} frames (${rendered} rendered now) in ${((Date.now() - tStart) / 1000).toFixed(0)}s -> ${out}`);
	}
	await browser.close({silent: true});
})().catch((e) => {
	console.log('ERROR', e && e.stack ? e.stack : e);
	process.exit(1);
});
