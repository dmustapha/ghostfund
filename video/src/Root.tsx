import React from 'react';
import { Composition } from 'remotion';
import { GhostFundDemo } from './GhostFundDemo';
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GhostFundDemo"
        component={GhostFundDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
