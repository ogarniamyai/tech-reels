// Warstwa 2D nad sceną: nagłówki beatów (bez numeracji), napisy karaoke, callouty, etykiety, CTA.
// Celowo BEZ paska postępu i bez numerów scen.
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill} from 'remotion';
import {Beats, Episode, SceneDef, Theme, Timeline, Word, cameraAt, clamp, ease, lerp, resolveAnchor, seg} from './core';

export const W = 1080;
export const H = 1920;
const GROT = '"Space Grotesk", sans-serif';
const SERIF = '"Instrument Serif", serif';
const MONO = '"JetBrains Mono", monospace';

/* ---------- rzutowanie punktów 3D na ekran (ta sama kamera co w scenie) ---------- */
const projCam = new THREE.PerspectiveCamera(42, W / H, 0.1, 80);
function makeProjector(scene: SceneDef, tl: Timeline, t: number, B: Beats) {
	const {pos, target} = cameraAt(scene, tl, t, B);
	projCam.fov = scene.fov ?? 42;
	projCam.aspect = W / H;
	projCam.position.set(...pos);
	projCam.lookAt(...target);
	projCam.setViewOffset(W, H, 0, scene.viewOffsetY ?? -150, W, H);
	projCam.updateProjectionMatrix();
	projCam.updateMatrixWorld();
	const v = new THREE.Vector3();
	return (p: [number, number, number]) => {
		v.set(...p).project(projCam);
		return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H] as [number, number];
	};
}

/* ---------- napisy: podział na kawałki jak w starym silniku ---------- */
type Chunk = {words: Word[]; beat: number; s: number; e: number};
function chunkWords(words: Word[]): Chunk[] {
	const chunks: Chunk[] = [];
	let cur: Chunk | null = null;
	words.forEach((w, i) => {
		const prev = words[i - 1];
		const len = cur ? cur.words.reduce((a, x) => a + x.w.length + 1, 0) : 0;
		const brk =
			!cur ||
			cur.words.length >= 3 ||
			len + w.w.length > 18 ||
			(prev && /[.,!?;:]$/.test(prev.w)) ||
			(prev && prev.beat !== w.beat) ||
			(prev && w.s - prev.e > 0.35);
		if (brk) {
			cur = {words: [], beat: w.beat, s: 0, e: 0};
			chunks.push(cur);
		}
		cur!.words.push(w);
	});
	chunks.forEach((c, i) => {
		c.s = c.words[0].s - 0.05;
		const next = chunks[i + 1];
		c.e = next ? Math.min(next.words[0].s - 0.05, c.words[c.words.length - 1].e + 0.6) : c.words[c.words.length - 1].e + 0.8;
	});
	return chunks;
}

const headlineHtml = (line: string, theme: Theme) =>
	line
		.replace(/<i class="r">/g, `<i style="font-family:${SERIF.replace(/"/g, "'")};font-style:italic;font-weight:400;font-size:1.22em;line-height:.9;letter-spacing:-.01em;color:${theme.warn}">`)
		.replace(/<i>/g, `<i style="font-family:${SERIF.replace(/"/g, "'")};font-style:italic;font-weight:400;font-size:1.22em;line-height:.9;letter-spacing:-.01em;color:${theme.accent}">`);

export const Overlay: React.FC<{scene: SceneDef; tl: Timeline; episode: Episode; t: number; B: Beats; theme: Theme}> = ({scene, tl, episode, t, B, theme}) => {
	const chunks = useMemo(() => chunkWords(tl.words), [tl]);
	const project = makeProjector(scene, tl, t, B);
	const beats = tl.beats;
	const L = beats.length - 1;

	/* nagłówek bieżącego beatu */
	const caps = episode.beats.map((b, i) => {
		const a = beats[i].start;
		const e = i === L ? 1e9 : beats[i].end;
		if (!(t >= a && t < e)) return null;
		const first = i === 0;
		const pout = ease.io(seg(t, e - 0.28, e));
		const tpn = first ? 1 : ease.out(seg(t, a + 0.05, a + 0.5));
		return (
			<div key={i} style={{position: 'absolute', left: 84, right: 84, top: 250}}>
				{b.tag ? (
					<div
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 14,
							font: `700 26px/1 ${MONO}`,
							letterSpacing: '.16em',
							textTransform: 'uppercase',
							color: theme.accent,
							background: 'rgba(8,12,24,.62)',
							border: `1.5px solid ${theme.accent}55`,
							padding: '13px 20px 13px 16px',
							borderRadius: 999,
							boxShadow: `0 0 24px ${theme.accent}33`,
							opacity: tpn * (1 - pout),
							transform: `translateY(${(1 - tpn) * 24 - pout * 20}px)`,
						}}
					>
						<span style={{width: 12, height: 12, borderRadius: 6, background: theme.accent, boxShadow: `0 0 12px ${theme.accent}`}} />
						{b.tag}
					</div>
				) : null}
				<div style={{marginTop: 26, font: `700 78px/1.04 ${GROT}`, letterSpacing: '-.025em', color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.65)'}}>
					{(b.headline || []).map((l, k) => {
						const q = first ? 1 : ease.out(seg(t, a + 0.12 + k * 0.1, a + 0.62 + k * 0.1));
						return (
							<span
								key={k}
								style={{display: 'block', opacity: q * (1 - pout), transform: `translateY(${(1 - q) * 60 - pout * 34}px)`}}
								dangerouslySetInnerHTML={{__html: headlineHtml(l, theme)}}
							/>
						);
					})}
				</div>
			</div>
		);
	});

	/* napisy karaoke */
	const chunk = chunks.find((c) => t >= c.s && t < c.e);
	let subs: React.ReactNode = null;
	if (chunk) {
		const pin = ease.out(seg(t, chunk.s, chunk.s + 0.12));
		subs = (
			<div style={{position: 'absolute', left: 60, right: 60, top: 1395, display: 'flex', justifyContent: 'center'}}>
				<div
					style={{
						display: 'inline-block',
						textAlign: 'center',
						font: `700 62px/1.12 ${GROT}`,
						letterSpacing: '-.015em',
						background: 'rgba(6,9,20,.72)',
						border: '1.5px solid rgba(255,255,255,.14)',
						borderRadius: 24,
						padding: '14px 30px 18px',
						boxShadow: `0 10px 40px rgba(0,0,0,.55), 0 0 0 1px ${theme.accent}22`,
						maxWidth: 960,
						opacity: pin,
						transform: `translateY(${(1 - pin) * 14}px) scale(${0.96 + 0.04 * pin})`,
					}}
				>
					{chunk.words.map((w, k) => {
						const on = t >= w.s;
						const now = on && t < w.e + 0.05;
						return (
							<span
								key={k}
								style={{
									display: 'inline-block',
									margin: '0 .13em',
									color: now ? theme.accent : on ? '#ffffff' : 'rgba(255,255,255,.34)',
									textShadow: now ? `0 0 22px ${theme.accent}aa` : 'none',
								}}
							>
								{w.w.replace(/[.,;:]+$/, '')}
							</span>
						);
					})}
				</div>
			</div>
		);
	}

	/* callouty z linią prowadzącą */
	const callouts = (scene.callouts || []).map((c, i) => {
		const t0 = beats[c.beat].start + (c.at ?? 0.3);
		const t1 = c.end !== undefined ? beats[c.beat].start + c.end : beats[c.beat].end;
		if (!(t >= t0 && t < t1)) return null;
		const p = seg(t, t0, t0 + 0.55);
		const out = seg(t, t1 - 0.3, t1);
		const op = clamp(p * 3) * (1 - out);
		const sc = 0.72 + 0.28 * ease.back(p);
		const col = c.red ? theme.warn : theme.accent;
		const [ax, ay] = project(resolveAnchor(c.anchor, t, B));
		const [cx, cy] = c.card;
		// przybliżony rozmiar karty (szerokość tekstu w foncie mono)
		const w = Math.max(c.t.length * 19, (c.s || '').length * 15) + 60;
		const h = c.s ? 96 : 60;
		let ex: number;
		let ey: number;
		if (ax < cx) {
			ex = cx;
			ey = cy + h / 2;
		} else if (ax > cx + w) {
			ex = cx + w;
			ey = cy + h / 2;
		} else {
			ex = ax;
			ey = ay < cy ? cy : cy + h;
		}
		const lp = ease.out(clamp(p * 1.5));
		return (
			<React.Fragment key={i}>
				<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<path
						d={`M${ax},${ay} L${lerp(ax, ex, lp)},${lerp(ay, ey, lp)}`}
						stroke={col}
						strokeWidth={3}
						strokeDasharray="9 7"
						fill="none"
						opacity={op}
						style={{filter: `drop-shadow(0 0 6px ${col})`}}
					/>
				</svg>
				<div
					style={{
						position: 'absolute',
						left: ax - 13,
						top: ay - 13,
						width: 26,
						height: 26,
						borderRadius: 13,
						border: `5px solid ${col}`,
						background: 'rgba(6,9,20,.9)',
						boxShadow: `0 0 18px ${col}`,
						opacity: op,
						transform: `scale(${ease.back(clamp(p * 1.3))})`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: cx,
						top: cy,
						padding: '14px 20px 15px',
						background: 'rgba(8,12,24,.82)',
						border: `1.5px solid ${col}77`,
						borderRadius: 16,
						boxShadow: `0 10px 34px rgba(0,0,0,.55), 0 0 26px ${col}33`,
						whiteSpace: 'nowrap',
						opacity: op,
						transform: `scale(${sc})`,
						transformOrigin: 'center',
					}}
				>
					<div style={{font: `700 29px/1 ${MONO}`, letterSpacing: '.06em', color: '#fff', display: 'flex', alignItems: 'center', gap: 10}}>
						<span style={{width: 12, height: 12, borderRadius: 6, background: col, boxShadow: `0 0 10px ${col}`, flex: 'none'}} />
						{c.t}
					</div>
					{c.s ? <div style={{marginTop: 9, font: `500 28px/1.1 ${GROT}`, color: 'rgba(214,226,255,.72)'}}>{c.s}</div> : null}
				</div>
			</React.Fragment>
		);
	});

	/* etykiety przyklejone do punktów 3D */
	const labels = (scene.labels || []).map((l, i) => {
		const t0 = beats[l.beat].start + (l.at ?? 0.2);
		const t1 = l.end !== undefined ? beats[l.beat].start + l.end : beats[l.beat].end;
		if (!(t >= t0 && t < t1)) return null;
		const p = ease.back(seg(t, t0, t0 + 0.5)) * (1 - seg(t, t1 - 0.3, t1));
		const [x, y] = project(resolveAnchor(l.anchor, t, B));
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: x,
					top: y + (l.dy ?? 18),
					font: `700 27px/1 ${MONO}`,
					letterSpacing: '.08em',
					color: '#ecfeff',
					background: 'rgba(8,12,24,.8)',
					border: `1.5px solid ${theme.accent}66`,
					borderRadius: 10,
					padding: '10px 14px',
					whiteSpace: 'nowrap',
					boxShadow: `0 0 18px ${theme.accent}33`,
					opacity: clamp(p),
					transform: `translate(-50%,0) scale(${0.6 + 0.4 * p})`,
				}}
			>
				{l.text}
			</div>
		);
	});

	/* CTA w ostatnim beacie */
	let cta: React.ReactNode = null;
	if (episode.cta) {
		const p = ease.out(seg(t, beats[L].start + 0.5, beats[L].start + 1.0));
		if (p > 0)
			cta = (
				<div
					style={{
						position: 'absolute',
						left: 84,
						right: 84,
						top: 640,
						height: 108,
						borderRadius: 54,
						background: 'rgba(8,12,24,.85)',
						border: `1.5px solid ${theme.accent}88`,
						color: '#fff',
						display: 'flex',
						alignItems: 'center',
						gap: 22,
						padding: '0 34px',
						font: `700 38px/1 ${GROT}`,
						boxShadow: `0 0 40px ${theme.accent}44`,
						opacity: p,
						transform: `translateY(${(1 - p) * 40}px)`,
					}}
				>
					<div
						style={{
							width: 60,
							height: 60,
							borderRadius: 30,
							background: theme.accent,
							display: 'grid',
							placeItems: 'center',
							font: `700 44px/1 ${GROT}`,
							color: '#04121a',
							flex: 'none',
							boxShadow: `0 0 20px ${theme.accent}`,
						}}
					>
						+
					</div>
					<div>{episode.cta}</div>
				</div>
			);
	}

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* przyciemnienie u góry pod nagłówki i delikatnie u dołu pod napisy */}
			<AbsoluteFill
				style={{
					background:
						'linear-gradient(180deg, rgba(3,4,10,.72) 0%, rgba(3,4,10,.45) 22%, rgba(3,4,10,0) 36%, rgba(3,4,10,0) 66%, rgba(3,4,10,.35) 82%, rgba(3,4,10,.55) 100%)',
				}}
			/>
			{labels}
			{callouts}
			{caps}
			{subs}
			{cta}
		</AbsoluteFill>
	);
};
