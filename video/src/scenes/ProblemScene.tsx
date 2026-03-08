import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Data leak animation: compressed to fit 18s scene
  // Narration: 0s "Here's why" → 2s "public before settles" → 6s "Bots scan" → 10s "buy before you" → 14s "lose money"
  const leakProgress = interpolate(frame, [FPS * 3, FPS * 7], [0, 1], {
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
        position: 'relative',
      }}
    >
      <AnimatedBackground variant="warm" intensity={0.6} />

      <GlowText
        text="The Problem"
        fontSize={56}
        color={COLORS.danger}
        glowColor="rgba(239, 68, 68, 0.3)"
        delay={0}
      />

      <div style={{ marginTop: 50, position: 'relative', width: 1000, height: 400 }}>
        {/* Your Transaction box */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 120,
            width: 280,
            padding: '24px 28px',
            borderRadius: 16,
            backgroundColor: COLORS.bgCard,
            border: `2px solid ${COLORS.primary}`,
            opacity: interpolate(frame, [FPS * 1, FPS * 1 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: FONT_FAMILY.body }}>
            Your Transaction
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 20, fontFamily: FONT_FAMILY.mono }}>
            deposit(10,000 GHO)
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 18, fontFamily: FONT_FAMILY.mono, marginTop: 4 }}>
            from: 0x742d...35Cc
          </div>
        </div>

        {/* Animated leak lines */}
        <svg width={1000} height={400} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Main flow */}
          <line
            x1={310}
            y1={170}
            x2={310 + 380 * leakProgress}
            y2={170}
            stroke={COLORS.danger}
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.8}
          />

          {/* Leak branches */}
          {[
            { x: 400, toY: 30, label: 'MEV Bots' },
            { x: 600, toY: 340, label: 'Front-runners' },
            { x: 700, toY: 50, label: 'Block Builders' },
          ].map((leak, i) => {
            const branchProgress = interpolate(frame, [FPS * 5 + i * 8, FPS * 7 + i * 8], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <g key={i}>
                <line
                  x1={leak.x}
                  y1={170}
                  x2={leak.x}
                  y2={170 + (leak.toY - 170) * branchProgress}
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  opacity={0.6}
                />
                {branchProgress > 0.8 && (
                  <text
                    x={leak.x}
                    y={leak.toY < 170 ? leak.toY - 10 : leak.toY + 25}
                    fill={COLORS.danger}
                    fontSize={22}
                    fontFamily="monospace"
                    textAnchor="middle"
                    opacity={interpolate(branchProgress, [0.8, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
                  >
                    {leak.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* "Everyone sees" box */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 100,
            width: 280,
            padding: '24px 28px',
            borderRadius: 16,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${COLORS.danger}`,
            opacity: interpolate(frame - FPS * 8, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <div style={{ color: COLORS.danger, fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: FONT_FAMILY.body }}>
            Visible On-Chain
          </div>
          <div style={{ color: COLORS.textMuted, fontSize: 20, fontFamily: FONT_FAMILY.mono }}>
            sender, amount, timing, strategy
          </div>
          <div style={{ color: COLORS.danger, fontSize: 18, fontWeight: 600, marginTop: 8, fontFamily: FONT_FAMILY.body }}>
            Everyone sees everything
          </div>
        </div>
      </div>

      {/* Bottom stat */}
      <div
        style={{
          marginTop: 40,
          color: COLORS.textMuted,
          fontSize: 26,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame - FPS * 11, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Standard DeFi transactions expose your identity, amounts, and strategy to the entire network
      </div>
    </div>
  );
};
