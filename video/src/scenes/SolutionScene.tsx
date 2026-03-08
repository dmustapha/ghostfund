import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

const primitives = [
  {
    name: 'CRE',
    full: 'Compute Runtime Environment',
    desc: 'Monitors Aave V3 yields, recommends actions',
    color: COLORS.primary,
  },
  {
    name: 'Private Transactions',
    full: 'Chainlink PT',
    desc: 'Hides sender identity for fund distribution',
    color: COLORS.accent,
  },
  {
    name: 'ACE',
    full: 'Access Control Engine',
    desc: 'Enforces allowlists, caps, and pauses',
    color: COLORS.success,
  },
];

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        position: 'relative',
      }}
    >
      <AnimatedBackground variant="cool" intensity={0.5} />

      <GlowText
        text="The Solution"
        fontSize={56}
        color={COLORS.success}
        glowColor="rgba(34, 197, 94, 0.3)"
        delay={0}
      />

      <div
        style={{
          marginTop: 16,
          fontSize: 26,
          color: COLORS.textMuted,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame, [FPS * 2, FPS * 2 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Three Chainlink primitives, one vault
      </div>

      <div
        style={{
          display: 'flex',
          gap: 40,
          marginTop: 60,
        }}
      >
        {primitives.map((p, i) => {
          const cardDelay = FPS * 3 + i * FPS * 3;
          const cardScale = spring({
            frame: Math.max(0, frame - cardDelay),
            fps,
            config: { damping: 15, stiffness: 150, mass: 0.5 },
          });

          const cardOpacity = interpolate(frame - cardDelay, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={p.name}
              style={{
                width: 340,
                padding: '36px 0 36px 24px',
                borderLeft: `3px solid ${p.color}`,
                opacity: cardOpacity,
                transform: `scale(${cardScale}) translateY(${(1 - cardScale) * 20}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: p.color,
                  fontFamily: FONT_FAMILY.mono,
                  marginBottom: 8,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: COLORS.textMuted,
                  fontFamily: FONT_FAMILY.mono,
                  marginBottom: 16,
                }}
              >
                {p.full}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: COLORS.text,
                  fontFamily: FONT_FAMILY.body,
                  lineHeight: 1.5,
                }}
              >
                {p.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrow flow at bottom */}
      <div
        style={{
          marginTop: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          opacity: interpolate(frame - FPS * 9, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {['CRE Monitors', '>', 'Vault Earns', '>', 'PT Distributes', '>', 'ACE Enforces'].map(
          (item, i) => (
            <span
              key={i}
              style={{
                fontSize: item === '>' ? 30 : 22,
                color: item === '>' ? COLORS.accent : COLORS.text,
                fontWeight: item === '>' ? 400 : 600,
                fontFamily: item === '>' ? FONT_FAMILY.body : FONT_FAMILY.mono,
              }}
            >
              {item}
            </span>
          )
        )}
      </div>
    </div>
  );
};
