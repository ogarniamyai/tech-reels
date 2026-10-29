// PRZYKŁAD REFERENCYJNY (nie jest odcinkiem): jak działa NFC.
// Pokazuje wszystkie typowe elementy: postument z prawdziwym szkłem, cewkę pod szkłem,
// pierścienie pola, obiekt wlatujący na scenę, ekran z teksturą canvas, przepływ cząstek,
// falę sukcesu, callouty, etykietę i klucze kamery. Wszystko jest czystą funkcją t.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {
	Beats,
	Coil,
	Glass,
	Gloss,
	Metal,
	Neon,
	RingWaves,
	Screen,
	Shockwave,
	Swarm,
	Vec3,
	clamp,
	defineScene,
	ease,
	lerp,
	mixColor,
	puckGeometry,
	seg,
	slabGeometry,
	useCanvasTexture,
} from '../../remotion/src/engine';

const CYAN = '#22d3ee';
const MAGENTA = '#e879f9';
const GREEN = '#34d399';
const PAD_R = 1.3;
const PAD_H = 0.3;
const HOVER_Y = 1.32;

/* stan sceny jako czysta funkcja czasu (używany przez World, kamerę ostrości i callouty) */
const state = (t: number, B: Beats) => {
	const field = ease.out(seg(t, -0.4, 0.8)); // pole widoczne już w pierwszej klatce (hook)
	const arrive = ease.out(B.p(2, 0.1, 1.6));
	const phoneIn = t >= B.s(2) ? arrive : 0;
	const coil = ease.out(B.p(3, 0.2, 0.6));
	const data = t >= B.s(4) ? ease.out(B.p(4, 0, 0.5)) * (1 - ease.out(B.p(5, 0.1, 0.4))) : 0;
	const success = t >= B.s(5) ? ease.out(B.p(5, 0.15, 0.35)) : 0;
	const bob = Math.sin(t * 2.2) * 0.018 * phoneIn;
	const lift = success * 0.12;
	const phoneY = lerp(6.5, HOVER_Y, phoneIn) + bob + lift;
	const phonePos: Vec3 = [lerp(2.4, 0, phoneIn), phoneY, lerp(1.6, 0.05, phoneIn)];
	const phoneRot: Vec3 = [lerp(-1.1, 0.3, phoneIn), lerp(1.2, -0.12, phoneIn), lerp(0.7, 0, phoneIn)];
	return {field, phoneIn, coil, data, success, phonePos, phoneRot, phoneY};
};

const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
	g.beginPath();
	g.moveTo(x + r, y);
	g.arcTo(x + w, y, x + w, y + h, r);
	g.arcTo(x + w, y + h, x, y + h, r);
	g.arcTo(x, y + h, x, y, r);
	g.arcTo(x, y, x + w, y, r);
	g.closePath();
};
const contactless = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, width: number) => {
	g.strokeStyle = color;
	g.lineWidth = width;
	g.lineCap = 'round';
	for (let i = 0; i < 4; i++) {
		g.beginPath();
		g.arc(cx - s * 0.9, cy, s * (0.35 + i * 0.42), -Math.PI * 0.27, Math.PI * 0.27);
		g.stroke();
	}
};
const screenBg = (g: CanvasRenderingContext2D, w: number, h: number) => {
	const gr = g.createLinearGradient(0, 0, 0, h);
	gr.addColorStop(0, '#0d1330');
	gr.addColorStop(0.55, '#070a18');
	gr.addColorStop(1, '#03040a');
	g.fillStyle = gr;
	g.fillRect(0, 0, w, h);
	g.fillStyle = '#000';
	roundRect(g, w / 2 - 88, 34, 176, 54, 27);
	g.fill();
};

const Phone: React.FC<{pos: Vec3; rot: Vec3; coil: number; success: number}> = ({pos, rot, coil, success}) => {
	const body = useMemo(() => slabGeometry(1.0, 2.06, 0.1, 0.15), []);
	const idle = useCanvasTexture(600, 1290, (g, w, h) => {
		screenBg(g, w, h);
		g.fillStyle = '#fff';
		g.font = '700 58px "Space Grotesk"';
		g.fillText('Portfel', 48, 200);
		const cg = g.createLinearGradient(40, 250, w - 40, 580);
		cg.addColorStop(0, '#7c3aed');
		cg.addColorStop(0.55, '#2563eb');
		cg.addColorStop(1, '#06b6d4');
		g.fillStyle = cg;
		roundRect(g, 40, 250, w - 80, 330, 34);
		g.fill();
		g.fillStyle = '#eab308';
		roundRect(g, 80, 360, 84, 62, 12);
		g.fill();
		g.fillStyle = '#fff';
		g.font = '700 36px "JetBrains Mono"';
		g.fillText('**** 4821', 80, 520);
		g.save();
		g.shadowColor = CYAN;
		g.shadowBlur = 40;
		contactless(g, w / 2 + 20, 870, 70, '#67e8f9', 12);
		g.restore();
		g.fillStyle = 'rgba(255,255,255,.86)';
		g.font = '500 40px "Space Grotesk"';
		g.textAlign = 'center';
		g.fillText('Przyłóż do czytnika', w / 2, 1080);
	});
	const ok = useCanvasTexture(600, 1290, (g, w, h) => {
		screenBg(g, w, h);
		const cx = w / 2;
		const cy = 560;
		const glow = g.createRadialGradient(cx, cy, 40, cx, cy, 380);
		glow.addColorStop(0, 'rgba(52,211,153,0.45)');
		glow.addColorStop(1, 'rgba(52,211,153,0)');
		g.fillStyle = glow;
		g.fillRect(0, 150, w, 820);
		g.fillStyle = '#10b981';
		g.beginPath();
		g.arc(cx, cy, 165, 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = '#fff';
		g.lineWidth = 26;
		g.lineCap = 'round';
		g.lineJoin = 'round';
		g.beginPath();
		g.moveTo(cx - 72, cy + 4);
		g.lineTo(cx - 20, cy + 58);
		g.lineTo(cx + 80, cy - 52);
		g.stroke();
		g.textAlign = 'center';
		g.fillStyle = '#fff';
		g.font = '700 70px "Space Grotesk"';
		g.fillText('Zapłacono', cx, 860);
		g.font = '700 50px "JetBrains Mono"';
		g.fillText('24,90 zł', cx, 940);
	});
	const coils = useMemo(() => [0.22, 0.29, 0.36].map((r) => new THREE.TorusGeometry(r, 0.008, 8, 96)), []);
	return (
		<group position={pos} rotation={rot}>
			<mesh geometry={body} castShadow receiveShadow>
				<Metal color="#b9bfcc" rough={0.2} />
			</mesh>
			<Screen w={0.93} h={1.99} map={idle} position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]} />
			<Screen w={0.93} h={1.99} map={ok} glow={1.3} opacity={success} position={[0, 0.0545, 0]} rotation={[-Math.PI / 2, 0, 0]} />
			<group position={[0, -0.056, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
				{coils.map((g, i) => (
					<mesh key={i} geometry={g} scale={[1, 1.35, 1]}>
						<Neon color={MAGENTA} k={5} opacity={coil} />
					</mesh>
				))}
			</group>
			<pointLight position={[0, -0.35, 0.1]} color={MAGENTA} intensity={coil * 1.2} distance={2.2} decay={2} />
		</group>
	);
};

const Reader: React.FC<{field: number; success: number; t: number}> = ({field, success, t}) => {
	const puck = useMemo(() => puckGeometry(PAD_R, PAD_H, 0.1), []);
	const neon = mixColor(CYAN, GREEN, success);
	const arcs = useMemo(() => [0.16, 0.3, 0.44, 0.58].map((r) => new THREE.TorusGeometry(r, 0.022, 16, 64, Math.PI * 0.52)), []);
	const pulse = 0.85 + 0.15 * Math.sin(t * 6);
	return (
		<group>
			<mesh geometry={puck} castShadow receiveShadow>
				<Gloss color="#1b1f2e" />
			</mesh>
			{/* cewka anteny pod szkłem: widać ją przez prawdziwe szkło z załamaniem */}
			<Coil turns={6} r0={0.32} r1={0.95} wire={0.016} position={[0, PAD_H + 0.012, 0]} glow={field * pulse * 0.35} glowColor={neon.getStyle()} />
			<mesh position={[0, PAD_H + 0.04, 0]}>
				<cylinderGeometry args={[1.08, 1.08, 0.06, 128]} />
				<Glass thickness={0.06} />
			</mesh>
			<mesh position={[0, PAD_H + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<torusGeometry args={[1.14, 0.02, 20, 200]} />
				<Neon color={neon} k={3.5 + field * 3} />
			</mesh>
			<mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<torusGeometry args={[PAD_R - 0.035, 0.012, 12, 200]} />
				<Neon color={neon} k={1.5 + field} />
			</mesh>
			<group position={[-0.28, PAD_H + 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				{arcs.map((g, i) => (
					<mesh key={i} geometry={g} rotation={[0, 0, -Math.PI * 0.26]}>
						<Neon color={mixColor('#a5f3fc', GREEN, success)} k={1.2 + field * 1.4} />
					</mesh>
				))}
			</group>
			<pointLight position={[0, 0.9, 0.4]} color={neon} intensity={field * 2.2} distance={4} decay={2} />
		</group>
	);
};

export default defineScene({
	theme: {accent: CYAN, accent2: MAGENTA},
	fov: 42,
	camera: [
		{beat: 0, at: 0, pos: [-3.2, 4.4, 10.5], target: [0, 0.8, 0]},
		{beat: 0, at: -0.2, pos: [-1.6, 3.6, 8.4], target: [0, 0.8, 0]},
		{beat: 1, at: 0.4, pos: [2.0, 3.3, 6.6], target: [0, 0.45, 0]},
		{beat: 1, at: -0.2, pos: [2.8, 3.0, 6.4], target: [0, 0.5, 0]},
		{beat: 2, at: 0.4, pos: [0.6, 3.8, 9.0], target: [0, 1.0, 0]},
		{beat: 2, at: -0.2, pos: [0.2, 3.3, 8.2], target: [0, 0.9, 0]},
		{beat: 3, at: 0.4, pos: [4.6, 1.25, 5.0], target: [0, 0.85, 0]},
		{beat: 3, at: -0.2, pos: [4.2, 1.45, 4.6], target: [0, 0.85, 0]},
		{beat: 4, at: 0.4, pos: [-2.4, 2.5, 6.4], target: [0, 0.85, 0]},
		{beat: 4, at: -0.2, pos: [-1.7, 2.9, 6.8], target: [0, 0.9, 0]},
		{beat: 5, at: 0.4, pos: [0, 4.4, 8.8], target: [0, 1.0, 0]},
		{beat: 5, at: -0.1, pos: [0.8, 5.0, 10.2], target: [0, 1.0, 0]},
	],
	// ostrość: na czytnik, a gdy telefon wleci, płynnie na telefon
	focus: (t, B) => {
		const s = state(t, B);
		return [s.phonePos[0] * s.phoneIn, lerp(PAD_H, s.phoneY, s.phoneIn), s.phonePos[2] * s.phoneIn];
	},
	callouts: [
		{beat: 1, at: 0.9, t: 'CEWKA', s: 'prąd 13,56 MHz', card: [600, 640], anchor: [0.62, PAD_H + 0.02, 0.62]},
		{beat: 3, at: 0.7, t: 'CEWKA W TELEFONIE', s: 'odbiera energię', red: false, card: [60, 640], anchor: (t, B) => {
			const s = state(t, B);
			return [s.phonePos[0], s.phoneY - 0.06, s.phonePos[2] + 0.12];
		}},
	],
	labels: [
		{beat: 2, at: 1.4, text: '≈ 4 cm', anchor: (t, B) => [1.0, lerp(PAD_H, state(t, B).phoneY, 0.5), 0], dy: -20},
	],
	sfx: [
		{beat: 2, at: 1.5, type: 'thud'},
		{beat: 5, at: 0.15, type: 'power'},
	],
	World: ({t, B}) => {
		const s = state(t, B);
		const fieldColor = mixColor(CYAN, GREEN, s.success).getStyle();
		const gap: [Vec3, Vec3] = [
			[0, PAD_H + 0.07, 0],
			[0, s.phoneY - 0.1, 0.05],
		];
		return (
			<>
				<Reader field={s.field} success={s.success} t={t} />
				<RingWaves t={t} strength={s.field * (1 - s.success * 0.4)} color={fieldColor} position={[0, PAD_H + 0.06, 0]} />
				<Swarm t={t} from={gap[0]} to={gap[1]} strength={s.data} color={CYAN} color2={MAGENTA} />
				<Shockwave p={clamp(seg(t, B.s(5) + 0.2, B.s(5) + 1.4))} color={GREEN} r1={2.6} position={[0, PAD_H + 0.03, 0]} />
				{s.phoneIn > 0 ? <Phone pos={s.phonePos} rot={s.phoneRot} coil={Math.max(s.coil, s.data)} success={s.success} /> : null}
			</>
		);
	},
});
