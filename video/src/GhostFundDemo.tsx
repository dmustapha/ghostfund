import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { SCENE_DURATIONS, TRANSITION_FRAMES } from './constants';

import { HookScene } from './scenes/HookScene';
import { ProblemScene } from './scenes/ProblemScene';
import { SolutionScene } from './scenes/SolutionScene';
import { CREDemoScene } from './scenes/CREDemoScene';
import { PrivacyDemoScene } from './scenes/PrivacyDemoScene';
import { ComplianceDemoScene } from './scenes/ComplianceDemoScene';
import { DashboardScene } from './scenes/DashboardScene';
import { ArchitectureScene } from './scenes/ArchitectureScene';
import { CloseScene } from './scenes/CloseScene';

export const GhostFundDemo: React.FC = () => {
  const t = TRANSITION_FRAMES;

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.hook}>
        <HookScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.problem}>
        <ProblemScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.solution}>
        <SolutionScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.creDemo}>
        <CREDemoScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.privacyDemo}>
        <PrivacyDemoScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.complianceDemo}>
        <ComplianceDemoScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.dashboard}>
        <DashboardScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.architecture}>
        <ArchitectureScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: t })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.close}>
        <CloseScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
