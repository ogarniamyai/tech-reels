// Scena 3D: kamera, światło studyjne (HDRI + lightformery), podłoga z odbiciem,
// cienie i postprodukcja (okluzja, głębia ostrości, bloom, aberracja, tonemapping, winieta, ziarno).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {ContactShadows, Environment, Lightformer, MeshReflectorMaterial} from '@react-three/drei';
import {Bloom, ChromaticAberration, DepthOfField, EffectComposer, N8AO, Noise, ToneMapping, Vignette} from '@react-three/postprocessing';
import {BlendFunction, ToneMappingMode} from 'postprocessing';
import {getStaticFiles, staticFile} from 'remotion';
import {Beats, SceneDef, Theme, Timeline, cameraAt, rand} from './core';
import {DEFAULT_FX, Fx, FxContext} from './kit';

export const HDRI_PATH = 'hdri/studio.hdr';
export const hasHdri = () => getStaticFiles().some((f) => f.name === HDRI_PATH);

const CameraRig: React.FC<{scene: SceneDef; tl: Timeline; t: number; B: Beats}> = ({scene, tl, t, B}) => {
	const {camera, size} = useThree();
	useLayoutEffect(() => {
		const {pos, target} = cameraAt(scene, tl, t, B);
		const cam = camera as THREE.PerspectiveCamera;
		cam.fov = scene.fov ?? 42;
		cam.position.set(...pos);
		cam.lookAt(...target);
		cam.setViewOffset(size.width, size.height, 0, scene.viewOffsetY ?? -150, size.width, size.height);
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
	}, [t, camera, scene, tl, B, size]);
	return null;
};

const Backdrop: React.FC<{theme: Theme}> = ({theme}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				depthWrite: false,
				fog: false,
				uniforms: {
					c1: {value: new THREE.Color(theme.bg).lerp(new THREE.Color('#1a2350'), 0.55)},
					c2: {value: new THREE.Color(theme.bg)},
					c3: {value: new THREE.Color(theme.accent2).multiplyScalar(0.25)},
				},
				vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: /* glsl */ `
					uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec2 vUv;
					void main(){
						vec2 p = vUv - vec2(0.5, 0.62);
						float d = length(p * vec2(1.0, 1.6));
						vec3 col = mix(c1, c2, smoothstep(0.0, 0.42, d));
						col += c3 * exp(-d * d * 26.0) * 0.35;
						col = mix(c2, col, smoothstep(0.36, 0.56, vUv.y));
						gl_FragColor = vec4(col, 1.0);
					}`,
			}),
		[theme.bg, theme.accent2],
	);
	return (
		<mesh position={[0, 8, -34]} material={mat}>
			<planeGeometry args={[140, 70]} />
		</mesh>
	);
};

const Dust: React.FC<{t: number}> = ({t}) => {
	const {geo, tex} = useMemo(() => {
		const n = 110;
		const arr = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			arr[i * 3] = (rand(i) - 0.5) * 16;
			arr[i * 3 + 1] = rand(i + 100) * 8;
			arr[i * 3 + 2] = -9 + rand(i + 200) * 12;
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		const ctx = c.getContext('2d')!;
		const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
		gr.addColorStop(0, 'rgba(255,255,255,1)');
		gr.addColorStop(0.35, 'rgba(255,255,255,0.5)');
		gr.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = gr;
		ctx.fillRect(0, 0, 64, 64);
		return {geo: g, tex: new THREE.CanvasTexture(c)};
	}, []);
	return (
		<points geometry={geo} position={[0, ((t * 0.12) % 1) - 0.5, 0]}>
			<pointsMaterial map={tex} size={0.08} sizeAttenuation transparent opacity={0.5} color={new THREE.Color('#8b9cff').multiplyScalar(1.4)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
		</points>
	);
};

export const DRAFT_FX: Fx = {ao: false, dof: false, msaa: 0, reflector: false, contact: true, glass: false, glassRes: 256, bloom: true};

export const Stage: React.FC<{scene: SceneDef; tl: Timeline; t: number; B: Beats; theme: Theme; quality: 'final' | 'draft'; fx?: Partial<Fx>}> = ({
	scene,
	tl,
	t,
	B,
	theme,
	quality,
	fx: fxIn,
}) => {
	const fx: Fx = {...(quality === 'final' ? DEFAULT_FX : DRAFT_FX), ...(fxIn || {})};
	const World = scene.World;
	const {target} = cameraAt(scene, tl, t, B);
	const focus = scene.focus ? scene.focus(t, B) : target;
	const dofK = typeof scene.dofStrength === 'function' ? scene.dofStrength(t, B) : scene.dofStrength ?? 1;
	const hdri = useMemo(hasHdri, []);
	return (
		<FxContext.Provider value={fx}>
			<CameraRig scene={scene} tl={tl} t={t} B={B} />
			<color attach="background" args={[theme.bg]} />
			<fog attach="fog" args={[theme.bg, 13, 34]} />
			<Backdrop theme={theme} />

			<Environment resolution={256} frames={1} files={hdri ? staticFile(HDRI_PATH) : undefined} environmentIntensity={0.9}>
				<Lightformer form="rect" intensity={1.4} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[8, 6, 1]} />
				<Lightformer form="rect" intensity={3} color={theme.accent} position={[-5, 2, -1]} rotation-y={Math.PI / 2} scale={[1.2, 8, 1]} />
				<Lightformer form="rect" intensity={3} color={theme.accent2} position={[5, 2, -1]} rotation-y={-Math.PI / 2} scale={[1.2, 8, 1]} />
				<Lightformer form="rect" intensity={2} position={[0, 0.6, 6]} scale={[9, 0.35, 1]} />
				<Lightformer form="ring" intensity={1.6} color={theme.accent2} position={[2, 4, -4]} scale={2} />
			</Environment>

			<ambientLight intensity={0.06} />
			<spotLight
				position={[-3.5, 9, 5]}
				angle={0.5}
				penumbra={1}
				intensity={170}
				color="#e8ecff"
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-bias={-0.0001}
				shadow-radius={6}
			/>
			<pointLight position={[5, 3, -3]} intensity={20} color={theme.accent} distance={14} />
			<pointLight position={[-5, 3.5, -3]} intensity={20} color={theme.accent2} distance={14} />

			{scene.floor !== false ? (
				<>
					<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
						<planeGeometry args={[90, 90]} />
						{fx.reflector ? (
						<MeshReflectorMaterial
							blur={[400, 120]}
							resolution={256}
							mixBlur={1}
							mixStrength={3}
							roughness={0.85}
							depthScale={1.1}
							minDepthThreshold={0.4}
							maxDepthThreshold={1.4}
							color={theme.floor}
							metalness={0.6}
							mirror={0.6}
						/>
						) : (
							<meshPhysicalMaterial color={theme.floor} metalness={0.5} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.25} envMapIntensity={1.2} />
						)}
					</mesh>
					{fx.contact ? <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={10} blur={2.4} far={3} resolution={256} color="#000000" /> : null}
				</>
			) : null}

			<World t={t} B={B} />
			<Dust t={t} />

			<EffectComposer multisampling={fx.msaa} disableNormalPass>
				{fx.ao ? <N8AO halfRes aoRadius={0.7} distanceFalloff={1} intensity={2.4} quality="performance" color="black" /> : <></>}
				{fx.dof ? <DepthOfField target={focus} worldFocusRange={3.2} bokehScale={2.6 * dofK} resolutionScale={0.5} /> : <></>}
				{fx.bloom ? <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1.0} luminanceSmoothing={0.25} radius={0.78} /> : <></>}
				<ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0005)} radialModulation={false} modulationOffset={0} />
				<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
				<Vignette offset={0.28} darkness={0.62} />
				<Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
			</EffectComposer>
		</FxContext.Provider>
	);
};
