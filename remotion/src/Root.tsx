import React from 'react';
import {Composition} from 'remotion';
import {episode, scene, timeline} from './current';
import {buildSfx, Episode, Timeline} from './engine/core';
import {makeReel, ReelProps} from './Reel';

const FPS = 30;
const Reel = makeReel(episode as unknown as Episode, timeline as unknown as Timeline, scene);

export const RemotionRoot: React.FC = () => (
	<Composition
		id="Reel"
		component={Reel}
		fps={FPS}
		width={1080}
		height={1920}
		durationInFrames={Math.round((timeline as unknown as Timeline).duration * FPS)}
		defaultProps={{quality: 'final'} as ReelProps}
		calculateMetadata={async ({props}) => ({
			// lista efektów dźwiękowych trafia do tools/music.py przez sfx.json
			props: {...props, sfx: buildSfx(scene, timeline as unknown as Timeline)} as ReelProps,
		})}
	/>
);
