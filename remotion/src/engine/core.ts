// Czyste funkcje silnika: matematyka, beaty, kamera, typy kontraktu sceny.
// Wszystko jest funkcją czasu t (sekundy), więc każda klatka renderuje się tak samo,
// niezależnie od kolejności (Remotion renderuje klatki w dowolnym porządku).
import type React from 'react';

export type Vec3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const ease = {
	io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
	out: (x: number) => 1 - Math.pow(1 - x, 3),
	in: (x: number) => x * x * x,
	back: (x: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
	},
	bounce: (x: number) => {
		const n1 = 7.5625;
		const d1 = 2.75;
		if (x < 1 / d1) return n1 * x * x;
		if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
		if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
		return n1 * (x -= 2.625 / d1) * x + 0.984375;
	},
};
/** Deterministyczny generator liczb losowych. Nigdy nie używaj Math.random w scenie. */
export function rng(seed = 7) {
	let s = seed;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
/** Deterministyczny "hash" liczby w [0,1), wygodny w pętlach: rand(i). */
export const rand = (i: number) => {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

/* ---------- dane z tts.py ---------- */
export type Word = {w: string; s: number; e: number; beat: number};
export type Timeline = {duration: number; lead: number; engine: string; beats: {start: number; end: number}[]; words: Word[]};
export type EpisodeBeat = {tag?: string; headline?: string[]; vo: string; visual?: string};
export type Episode = {slug: string; title?: string; cta?: string; beats: EpisodeBeat[]; [k: string]: unknown};

/* ---------- pomocnik beatów ---------- */
export type Beats = {
	n: number;
	dur: number;
	t: number;
	s: (i: number) => number;
	e: (i: number) => number;
	d: (i: number) => number;
	/** postęp 0..1 w przedziale [start+from, start+from+len] beatu i (len domyślnie do końca beatu) */
	p: (i: number, from?: number, len?: number) => number;
	/** postęp 0..1 przez ostatnie `len` sekund beatu i (do wyjść) */
	out: (i: number, len?: number) => number;
	on: (i: number) => boolean;
	/** indeks bieżącego beatu */
	cur: number;
};

export function makeBeats(tl: Timeline, t: number): Beats {
	const b = tl.beats;
	const cur = Math.max(0, b.findIndex((x) => t >= x.start && t < x.end));
	return {
		n: b.length,
		dur: tl.duration,
		t,
		s: (i) => b[i].start,
		e: (i) => b[i].end,
		d: (i) => b[i].end - b[i].start,
		p: (i, from = 0, len) =>
			seg(t, b[i].start + from, b[i].start + from + (len ?? Math.max(0.01, b[i].end - b[i].start - from))),
		out: (i, len = 0.5) => seg(t, b[i].end - len, b[i].end),
		on: (i) => t >= b[i].start && t < b[i].end,
		cur: t >= b[b.length - 1].start ? b.length - 1 : cur,
	};
}

/* ---------- kontrakt sceny ---------- */
export type CameraKey = {beat: number; at: number; pos: Vec3; target: Vec3};
export type Anchor = Vec3 | ((t: number, B: Beats) => Vec3);
export type Callout = {beat: number; at?: number; end?: number; t: string; s?: string; red?: boolean; card: [number, number]; anchor: Anchor};
export type Label = {beat: number; at?: number; end?: number; text: string; anchor: Anchor; dy?: number};
export type Sfx = {beat: number; at: number; type: 'blip' | 'pop' | 'click' | 'thud' | 'rise' | 'power' | 'whoosh'};
export type Theme = {
	accent: string; // główny kolor neonu (np. turkus)
	accent2: string; // drugi kolor (np. magenta)
	warn: string; // kolor "red" w nagłówkach i calloutach
	bg: string; // kolor tła / mgły
	floor: string; // kolor podłogi
};

export type SceneDef = {
	/** Klucze kamery. at = sekundy od początku beatu (ujemne = od końca). */
	camera: CameraKey[];
	/** Własna kamera zamiast kluczy (opcjonalnie). */
	cameraAt?: (t: number, B: Beats) => {pos: Vec3; target: Vec3} | null;
	/** Punkt ostrości głębi (domyślnie cel kamery). */
	focus?: (t: number, B: Beats) => Vec3;
	/** Siła rozmycia głębi 0..2 (domyślnie 1). */
	dofStrength?: number | ((t: number, B: Beats) => number);
	/** Pole widzenia kamery w stopniach (pionowo, domyślnie 42). */
	fov?: number;
	/** Przesunięcie obrazu w pionie w px (ujemne = obiekty niżej, domyślnie -150). */
	viewOffsetY?: number;
	callouts?: Callout[];
	labels?: Label[];
	sfx?: Sfx[];
	theme?: Partial<Theme>;
	/** Podłoga z odbiciem (domyślnie true). */
	floor?: boolean;
	/** Zawartość 3D sceny. Musi być czystą funkcją t. */
	World: React.FC<{t: number; B: Beats}>;
};

export const defineScene = (s: SceneDef) => s;

export const DEFAULT_THEME: Theme = {
	accent: '#22d3ee',
	accent2: '#e879f9',
	warn: '#fb7185',
	bg: '#03040a',
	floor: '#07080f',
};

/* ---------- kamera ---------- */
export function cameraAt(scene: SceneDef, tl: Timeline, t: number, B: Beats): {pos: Vec3; target: Vec3} {
	const custom = scene.cameraAt?.(t, B);
	if (custom) return custom;
	const beats = tl.beats;
	const K = (scene.camera || [])
		.map((k) => ({t: k.at >= 0 ? beats[k.beat].start + k.at : beats[k.beat].end + k.at, pos: k.pos, target: k.target}))
		.sort((a, b) => a.t - b.t);
	if (!K.length) return {pos: [0, 4, 12], target: [0, 1, 0]};
	let i = 0;
	while (i < K.length - 2 && t > K[i + 1].t) i++;
	const a = K[i];
	const b = K[Math.min(i + 1, K.length - 1)];
	const k = b.t > a.t ? ease.io(seg(t, a.t, b.t)) : 1;
	const pos = lerp3(a.pos, b.pos, k);
	const target = lerp3(a.target, b.target, k);
	// delikatny ruch "z ręki"
	pos[0] += Math.sin(t * 0.7) * 0.1;
	pos[1] += Math.sin(t * 0.9 + 1) * 0.07;
	return {pos, target};
}

export const resolveAnchor = (a: Anchor, t: number, B: Beats): Vec3 => (typeof a === 'function' ? a(t, B) : a);

/** Lista efektów dźwiękowych dla tools/music.py (whoosh na zmianach beatów, blip przy calloutach). */
export function buildSfx(scene: SceneDef, tl: Timeline) {
	const out: {t: number; type: string}[] = [];
	for (let i = 1; i < tl.beats.length; i++) out.push({t: tl.beats[i].start, type: 'whoosh'});
	for (const c of scene.callouts || []) out.push({t: tl.beats[c.beat].start + (c.at ?? 0.3) + 0.05, type: 'blip'});
	for (const s of scene.sfx || []) {
		const b = tl.beats[s.beat];
		out.push({t: s.at >= 0 ? b.start + s.at : b.end + s.at, type: s.type});
	}
	return out.sort((a, b) => a.t - b.t);
}
