import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FPS, YIELD_OUTPUT } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { Terminal } from '../components/Terminal';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const CREDemoScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 80px',
        position: 'relative',
      }}
    >
      <AnimatedBackground variant="default" intensity={0.4} />

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
        <GlowText text="CRE Yield Strategy" fontSize={48} delay={0} />
        <span
          style={{
            fontSize: 18,
            color: COLORS.accent,
            fontFamily: FONT_FAMILY.mono,
            fontWeight: 600,
            letterSpacing: 3,
            opacity: interpolate(frame, [10, 25], [0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          DEMO
        </span>
      </div>

      <div
        style={{
          fontSize: 22,
          color: COLORS.textMuted,
          marginBottom: 30,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame, [FPS * 1, FPS * 1 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        CRE monitors Aave V3 APY every 5 minutes and recommends deposit or withdraw actions
      </div>

      {/* Terminal */}
      <Terminal
        lines={YIELD_OUTPUT}
        title="demo-yield-flow.ts"
        charsPerFrame={0.7}
        startFrame={FPS * 2}
      />

      {/* Flow — clean text, no boxes */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: interpolate(frame - FPS * 32, [0, 15], [0, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontFamily: FONT_FAMILY.body,
          fontSize: 20,
          letterSpacing: 1,
        }}
      >
        {[
          { label: 'CRE Reads Aave', color: COLORS.primary },
          { label: 'Writes Report', color: COLORS.accent },
          { label: 'Owner Approves', color: COLORS.warning },
          { label: 'Funds Move', color: COLORS.success },
        ].map((step, i) => (
          <React.Fragment key={step.label}>
            <span style={{ color: step.color, fontWeight: 600 }}>{step.label}</span>
            {i < 3 && <span style={{ color: COLORS.textMuted }}>→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Annotations — subtle text, not badges */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          display: 'flex',
          gap: 32,
          fontFamily: FONT_FAMILY.body,
          fontSize: 18,
          color: COLORS.textMuted,
          letterSpacing: 1,
        }}
      >
        <span style={{ opacity: interpolate(frame - FPS * 16, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Signed Recommendation
        </span>
        <span style={{ opacity: interpolate(frame - FPS * 22, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          1-Hour TTL
        </span>
        <span style={{ opacity: interpolate(frame - FPS * 26, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Human Approval Required
        </span>
      </div>
    </div>
  );
};
