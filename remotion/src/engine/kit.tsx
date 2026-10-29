// Klocki 3D do budowania scen. Wszystkie są czystymi funkcjami propsów (bez useFrame).
import React, {createContext, useContext, useMemo} from 'react';
import * as THREE from 'three';
import {MeshTransmissionMaterial, RoundedBox} from '@react-three/drei';
import {clamp, rand, Vec3} from './core';

export {RoundedBox};

/** Kolor HDR do neonów: wartości > 1 łapie bloom. */
export const hdr = (c: string | THREE.Color, k = 3) => new THREE.Color(c).multiplyScalar(k);
export const mixColor = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t));

/* ---------- materiały ---------- */

/** Świecący materiał (neon). k = jasność, 2..8. */
export const Neon: React.FC<{color: string | THREE.Color; k?: number; opacity?: number; additive?: boolean}> = ({
	color,
	k = 4,
	opacity = 1,
	additive = false,
}) => (
	<meshBasicMaterial
		color={hdr(color, k)}
		toneMapped={false}
		transparent={opacity < 1 || additive}
		opacity={opacity}
		blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
		depthWrite={!additive && opacity >= 1}
	/>
);

/** Polerowany metal z lakierem (aluminium, tytan, miedź...). */
export const Metal: React.FC<{color?: string; rough?: number; coat?: number; env?: number}> = ({
	color = '#9aa0ad',
	rough = 0.22,
	coat = 0.6,
	env = 1.4,
}) => (
	<meshPhysicalMaterial color={color} metalness={1} roughness={rough} clearcoat={coat} clearcoatRoughness={0.08} envMapIntensity={env} />
);

/** Ciemny, połyskliwy plastik / anodowany korpus. */
export const Gloss: React.FC<{color?: string; rough?: number; metal?: number; env?: number}> = ({
	color = '#1b1f2e',
	rough = 0.25,
	metal = 0.6,
	env = 1.8,
}) => (
	<meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={env} />
);

/** Matowy materiał (ceramika, guma, papier). */
export const Matte: React.FC<{color?: string; rough?: number}> = ({color = '#c9ccd6', rough = 0.7}) => (
	<meshStandardMaterial color={color} roughness={rough} metalness={0} />
);

/** Ustawienia jakości efektów, podawane przez Stage (fx w inputProps). */
export type Fx = {ao: boolean; dof: boolean; msaa: number; reflector: boolean; contact: boolean; glass: boolean; glassRes: number; bloom: boolean};
export const DEFAULT_FX: Fx = {ao: true, dof: true, msaa: 4, reflector: true, contact: true, glass: true, glassRes: 512, bloom: true};
export const FxContext = createContext<Fx>(DEFAULT_FX);

/**
 * Prawdziwe szkło z załamaniem światła (MeshTransmissionMaterial).
 * Kosztowne: używaj na 1 do 2 obiektach w scenie.
 */
export const Glass: React.FC<{tint?: string; thickness?: number; rough?: number; chroma?: number; blur?: number}> = ({
	tint = '#e6f4fb',
	thickness = 0.08,
	rough = 0,
	chroma = 0.03,
	blur = 0,
}) => {
	const fx = useContext(FxContext);
	if (!fx.glass)
		return (
			<meshPhysicalMaterial color={tint} roughness={rough} metalness={0} transmission={1} thickness={thickness} ior={1.5} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={1.4} transparent opacity={0.9} />
		);
	return (
	<MeshTransmissionMaterial
		color={tint}
		transmission={1}
		thickness={thickness}
		roughness={rough}
		ior={1.5}
		chromaticAberration={chroma}
		anisotropicBlur={blur}
		distortion={0}
		samples={fx.glassRes >= 512 ? 4 : 3}
		resolution={fx.glassRes}
		backside={false}
		clearcoat={1}
		clearcoatRoughness={0.02}
		envMapIntensity={1.4}
	/>
	);
};

/* ---------- geometrie ---------- */

/** Krążek z zaokrągloną krawędzią (podstawa, czytnik, przycisk). */
export const puckGeometry = (R = 1.3, H = 0.3, r = 0.1) => {
	const seg = 16;
	const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
	for (let i = 0; i <= seg; i++) {
		const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2);
		pts.push(new THREE.Vector2(R - r + Math.cos(a) * r, r + Math.sin(a) * r));
	}
	for (let i = 0; i <= seg; i++) {
		const a = (i / seg) * (Math.PI / 2);
		pts.push(new THREE.Vector2(R - r + Math.cos(a) * r, H - r + Math.sin(a) * r));
	}
	pts.push(new THREE.Vector2(0, H));
	return new THREE.LatheGeometry(pts, 160);
};

/** Płaski prostokąt z zaokrąglonymi rogami (ekrany, karty). UV 0..1. */
export const roundedRectShape = (w: number, h: number, r: number) => {
	const s = new THREE.Shape();
	const x = -w / 2;
	const y = -h / 2;
	s.moveTo(x + r, y);
	s.lineTo(x + w - r, y);
	s.quadraticCurveTo(x + w, y, x + w, y + r);
	s.lineTo(x + w, y + h - r);
	s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	s.lineTo(x + r, y + h);
	s.quadraticCurveTo(x, y + h, x, y + h - r);
	s.lineTo(x, y + r);
	s.quadraticCurveTo(x, y, x + r, y);
	return s;
};
export const roundedRectGeometry = (w: number, h: number, r: number) => {
	const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 32);
	const pos = g.attributes.position;
	const uv = g.attributes.uv;
	for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
	return g;
};
/** Bryła o zaokrąglonym obrysie w rzucie (obudowa telefonu, płytka). Leży płasko, oś Y w górę. */
export const slabGeometry = (w: number, l: number, t: number, r: number, bevel = 0.025) => {
	const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, l - bevel * 2, r), {
		depth: Math.max(0.001, t - bevel * 2),
		bevelEnabled: true,
		bevelThickness: bevel,
		bevelSize: bevel,
		bevelSegments: 8,
		curveSegments: 32,
	});
	g.center();
	g.rotateX(-Math.PI / 2);
	g.computeVertexNormals();
	return g;
};

/** Tekstura rysowana na canvasie 2D (ekrany, etykiety, wzory). Pamiętaj o fontach z silnika. */
export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[] = []) {
	return useMemo(() => {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		draw(c.getContext('2d')!, w, h);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 8;
		t.needsUpdate = true;
		return t;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
}

/* ---------- gotowe elementy ---------- */

/** Świecący ekran (płaski, leży w płaszczyźnie XY; obróć go w scenie). */
export const Screen: React.FC<{w: number; h: number; map: THREE.Texture; glow?: number; opacity?: number; position?: Vec3; rotation?: Vec3}> = ({
	w,
	h,
	map,
	glow = 1.2,
	opacity = 1,
	position,
	rotation,
}) => {
	const g = useMemo(() => roundedRectGeometry(w, h, Math.min(w, h) * 0.08), [w, h]);
	return (
		<mesh geometry={g} position={position} rotation={rotation}>
			<meshPhysicalMaterial
				color="#0a0a0a"
				map={map}
				emissive="#ffffff"
				emissiveMap={map}
				emissiveIntensity={glow}
				roughness={0.06}
				clearcoat={1}
				clearcoatRoughness={0.03}
				envMapIntensity={0.6}
				transparent={opacity < 1}
				opacity={opacity}
				depthWrite={opacity >= 1}
			/>
		</mesh>
	);
};

/** Podstawa / postument z neonowym pierścieniem. Górna powierzchnia na y = h. */
export const Pedestal: React.FC<{r?: number; h?: number; color?: string; glow?: number; position?: Vec3}> = ({
	r = 1.6,
	h = 0.3,
	color = '#22d3ee',
	glow = 1,
	position,
}) => {
	const g = useMemo(() => puckGeometry(r, h, 0.1), [r, h]);
	return (
		<group position={position}>
			<mesh geometry={g} castShadow receiveShadow>
				<Gloss />
			</mesh>
			<mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<torusGeometry args={[r - 0.16, 0.018, 16, 200]} />
				<Neon color={color} k={2 + glow * 3} />
			</mesh>
			<mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<torusGeometry args={[r - 0.035, 0.012, 12, 200]} />
				<Neon color={color} k={1 + glow} />
			</mesh>
		</group>
	);
};

/** Rozchodzące się pierścienie (pole, fala, sygnał). t w sekundach. */
export const RingWaves: React.FC<{
	t: number;
	strength?: number;
	color?: string;
	count?: number;
	period?: number;
	r0?: number;
	r1?: number;
	rise?: number;
	position?: Vec3;
	thickness?: number;
}> = ({t, strength = 1, color = '#22d3ee', count = 5, period = 1.8, r0 = 1, r1 = 1.9, rise = 1.9, position, thickness = 0.007}) => {
	const geo = useMemo(() => new THREE.TorusGeometry(1, thickness, 12, 180), [thickness]);
	if (strength <= 0.001) return null;
	return (
		<group position={position}>
			{new Array(count).fill(0).map((_, i) => {
				const x = (((t + (i * period) / count) % period) + period) % period / period;
				const r = r0 + x * (r1 - r0);
				const op = Math.pow(Math.sin(Math.PI * x), 1.6) * strength * 0.85;
				return (
					<mesh key={i} geometry={geo} position={[0, x * rise, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, 1]}>
						<Neon color={color} k={2.6} opacity={op} additive />
					</mesh>
				);
			})}
		</group>
	);
};

/**
 * Przepływ wzdłuż krzywej: słaba "rura" + jasne impulsy, które nią płyną.
 * points: punkty krzywej, speed: przebiegi na sekundę, k: jasność impulsów.
 */
export const Flow: React.FC<{
	t: number;
	points: Vec3[];
	color?: string;
	strength?: number;
	speed?: number;
	pulses?: number;
	radius?: number;
	pulseSize?: number;
	reverse?: boolean;
	tube?: boolean;
}> = ({t, points, color = '#22d3ee', strength = 1, speed = 0.6, pulses = 8, radius = 0.012, pulseSize = 0.05, reverse = false, tube = true}) => {
	const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [JSON.stringify(points)]);
	const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 128, radius, 8, false), [curve, radius]);
	const dot = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
	if (strength <= 0.001) return null;
	return (
		<group>
			{tube ? (
				<mesh geometry={tubeGeo}>
					<Neon color={color} k={1.2} opacity={0.35 * strength} additive />
				</mesh>
			) : null}
			{new Array(pulses).fill(0).map((_, i) => {
				let u = (((t * speed + i / pulses + rand(i) * 0.05) % 1) + 1) % 1;
				if (reverse) u = 1 - u;
				const p = curve.getPointAt(u);
				const s = pulseSize * Math.pow(Math.sin(Math.PI * u), 0.5) * strength;
				return (
					<mesh key={i} geometry={dot} position={p} scale={[s, s, s]}>
						<Neon color={color} k={6} />
					</mesh>
				);
			})}
		</group>
	);
};

/** Świecące cząstki krążące wokół osi (dane, jony, energia). */
export const Swarm: React.FC<{t: number; from: Vec3; to: Vec3; n?: number; color?: string; color2?: string; strength?: number; radius?: number}> = ({
	t,
	from,
	to,
	n = 30,
	color = '#22d3ee',
	color2 = '#e879f9',
	strength = 1,
	radius = 0.35,
}) => {
	const dot = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
	if (strength <= 0.001) return null;
	return (
		<group>
			{new Array(n).fill(0).map((_, j) => {
				const up = j % 2 === 0;
				const phase = (t * 1.5 + rand(j)) % 1;
				const p = up ? phase : 1 - phase;
				const ang = j * 2.399 + t * 2.1 * (up ? 1 : -1);
				const rr = (0.25 + 0.75 * rand(j + 50)) * radius * (0.6 + 0.4 * Math.sin(Math.PI * p));
				const s = 0.045 * Math.pow(Math.sin(Math.PI * p), 0.6) * strength;
				const x = from[0] + (to[0] - from[0]) * p + Math.cos(ang) * rr;
				const z = from[2] + (to[2] - from[2]) * p + Math.sin(ang) * rr;
				return (
					<group key={j}>
						{[0, 1, 2].map((k) => {
							const pk = up ? p - k * 0.03 : p + k * 0.03;
							const yk = from[1] + (to[1] - from[1]) * pk;
							return (
								<mesh key={k} geometry={dot} position={[x, yk, z]} scale={[s * (1 - k * 0.28), s * (1 - k * 0.28) * 1.6, s * (1 - k * 0.28)]}>
									<Neon color={up ? color : color2} k={7 - k * 2} opacity={1 - k * 0.3} additive={k > 0} />
								</mesh>
							);
						})}
					</group>
				);
			})}
		</group>
	);
};

/** Fala uderzeniowa (moment sukcesu, zderzenie). p = postęp 0..1. */
export const Shockwave: React.FC<{p: number; color?: string; r0?: number; r1?: number; position?: Vec3}> = ({p, color = '#34d399', r0 = 1.1, r1 = 2.5, position}) => {
	if (p <= 0 || p >= 1) return null;
	const r = r0 + Math.pow(p, 0.6) * (r1 - r0);
	return (
		<mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r, 1]}>
			<torusGeometry args={[1, 0.018, 12, 200]} />
			<Neon color={color} k={6} opacity={Math.pow(1 - p, 2)} additive />
		</mesh>
	);
};

/** Cewka (antena, uzwojenie, cewka indukcyjna) w płaszczyźnie XZ. */
export const Coil: React.FC<{turns?: number; r0?: number; r1?: number; wire?: number; color?: string; glow?: number; glowColor?: string; position?: Vec3}> = ({
	turns = 6,
	r0 = 0.3,
	r1 = 0.9,
	wire = 0.014,
	color = '#c98a4b',
	glow = 0,
	glowColor = '#22d3ee',
	position,
}) => {
	const geo = useMemo(() => {
		const pts: THREE.Vector3[] = [];
		const steps = turns * 64;
		for (let i = 0; i <= steps; i++) {
			const u = i / steps;
			const a = u * turns * Math.PI * 2;
			const r = r0 + (r1 - r0) * u;
			pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
		}
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, wire, 8, false);
	}, [turns, r0, r1, wire]);
	return (
		<group position={position}>
			<mesh geometry={geo} castShadow>
				<meshPhysicalMaterial color={color} metalness={1} roughness={0.28} clearcoat={0.5} emissive={glowColor} emissiveIntensity={glow * 1.2} />
			</mesh>
		</group>
	);
};
