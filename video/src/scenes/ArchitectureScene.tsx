import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = spring({
    frame: Math.max(0, frame - FPS * 2),
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.5 },
  });

  const imgOpacity = interpolate(frame, [FPS * 2, FPS * 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 80px',
        position: 'relative',
      }}
    >
      <AnimatedBackground variant="cool" intensity={0.4} />

      <GlowText text="Architecture" fontSize={48} delay={0} />

      <div
        style={{
          marginTop: 30,
          opacity: imgOpacity,
          transform: `scale(${0.95 + imgScale * 0.05})`,
        }}
      >
        <Img
          src={staticFile('assets/ghostfund-architecture.jpg')}
          style={{
            width: 1400,
            maxHeight: 700,
            objectFit: 'contain',
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
          }}
        />
      </div>

      {/* Overlay stats */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          marginTop: 30,
          opacity: interpolate(frame - FPS * 8, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {[
          { label: 'Smart Contracts', value: '7' },
          { label: 'Test Cases', value: '74' },
          { label: 'Chainlink Primitives', value: '3' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              textAlign: 'center',
              opacity: interpolate(frame - FPS * 8 - i * FPS * 1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.accent, fontFamily: FONT_FAMILY.mono }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 22, color: COLORS.textMuted, fontFamily: FONT_FAMILY.body }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
