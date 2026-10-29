import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {DEFAULT_THEME, Episode, SceneDef, Theme, Timeline, makeBeats} from './engine/core';
import {Stage} from './engine/Stage';
import type {Fx} from './engine/kit';
import {Overlay} from './engine/Overlay';

export type ReelProps = {quality: 'final' | 'draft'; sfx?: {t: number; type: string}[]; fx?: Partial<Fx>};

export const makeReel = (episode: Episode, timeline: Timeline, scene: SceneDef) => {
	const theme: Theme = {...DEFAULT_THEME, ...(scene.theme || {})};
	const Reel: React.FC<ReelProps> = ({quality, fx}) => {
		const frame = useCurrentFrame();
		const {fps, width, height} = useVideoConfig();
		const t = frame / fps;
		const B = makeBeats(timeline, t);
		const [handle] = useState(() => delayRender('Ładowanie fontów'));
		const [ready, setReady] = useState(false);
		useEffect(() => {
			const probe = 'Aa0ąęłśżźćńó';
			Promise.all(
				['700 78px "Space Grotesk"', '500 30px "Space Grotesk"', 'italic 400 90px "Instrument Serif"', '700 30px "JetBrains Mono"', '500 30px "JetBrains Mono"'].map((f) =>
					document.fonts.load(f, probe),
				),
			)
				.catch((e) => console.error(e))
				.finally(() => {
					setReady(true);
					continueRender(handle);
				});
		}, [handle]);
		return (
			<AbsoluteFill style={{backgroundColor: theme.bg}}>
				{ready ? (
					<ThreeCanvas
						width={width}
						height={height}
						dpr={1}
						shadows
						gl={{antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true}}
						camera={{fov: scene.fov ?? 42, near: 0.1, far: 80, position: [0, 4, 12]}}
					>
						<Stage scene={scene} tl={timeline} t={t} B={B} theme={theme} quality={quality} fx={fx} />
					</ThreeCanvas>
				) : null}
				{ready ? <Overlay scene={scene} tl={timeline} episode={episode} t={t} B={B} theme={theme} /> : null}
			</AbsoluteFill>
		);
	};
	return Reel;
};
