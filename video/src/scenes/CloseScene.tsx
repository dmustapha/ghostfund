import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.8 },
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
      <AnimatedBackground variant="default" intensity={0.6} />

      {/* Glow background */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}20, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Logo */}
      <Img
        src={staticFile('assets/ghostfund-logo.jpg')}
        style={{
          width: 140,
          height: 140,
          borderRadius: 20,
          transform: `scale(${logoScale})`,
          boxShadow: `0 0 40px ${COLORS.primary}40`,
          marginBottom: 30,
        }}
      />

      <GlowText text="GhostFund" fontSize={80} delay={FPS * 0.5} />

      <div
        style={{
          marginTop: 16,
          fontSize: 28,
          color: COLORS.textMuted,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame, [FPS * 5, FPS * 5 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Seven contracts. Three primitives. One private vault.
      </div>

      {/* URL — clean, no box */}
      <div
        style={{
          marginTop: 50,
          opacity: interpolate(frame, [FPS * 8, FPS * 8 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: COLORS.accent,
            fontFamily: FONT_FAMILY.mono,
            fontWeight: 600,
            letterSpacing: 1,
            textShadow: `0 0 30px ${COLORS.accent}40`,
          }}
        >
          ghostfund.vercel.app
        </div>
      </div>

      {/* Subtle tech line — no boxes */}
      <div
        style={{
          marginTop: 40,
          fontSize: 20,
          color: COLORS.textMuted,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame - FPS * 3, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          letterSpacing: 2,
        }}
      >
        Solidity · TypeScript · Chainlink CRE · PT · ACE · Aave V3
      </div>
    </div>
  );
};
