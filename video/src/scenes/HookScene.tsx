import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background mesh animation
  const meshRotation = frame * 0.15;

  // Logo entrance
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1.2 },
  });

  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Stat counter animation
  const statFrame = frame - 7 * FPS;
  const statValue = interpolate(statFrame, [0, 30], [0, 28], {
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
        overflow: 'hidden',
      }}
    >
      {/* Animated mesh background */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.primary}15, transparent 70%)`,
          transform: `rotate(${meshRotation}deg) scale(1.5)`,
          top: -200,
          right: -200,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accent}10, transparent 70%)`,
          transform: `rotate(${-meshRotation * 0.7}deg) scale(1.3)`,
          bottom: -150,
          left: -150,
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <Img
          src={staticFile('assets/ghostfund-logo.jpg')}
          style={{
            width: 180,
            height: 180,
            borderRadius: 24,
            boxShadow: `0 0 40px ${COLORS.primary}40`,
          }}
        />
      </div>

      {/* Title */}
      <GlowText
        text="GhostFund"
        fontSize={96}
        delay={3 * FPS}
        glowColor={COLORS.primary}
      />

      {/* Subtitle */}
      <GlowText
        text="Private DeFi Yield with Human-Gated Automation"
        fontSize={36}
        color={COLORS.textMuted}
        delay={6 * FPS}
        glowColor="transparent"
      />

      {/* Stat callout */}
      {statFrame > 0 && (
        <div
          style={{
            marginTop: 60,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            opacity: interpolate(statFrame, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: COLORS.accent,
              fontFamily: FONT_FAMILY.body,
              textShadow: `0 0 30px ${COLORS.accent}60`,
            }}
          >
            ${Math.floor(statValue)}B+
          </span>
          <span
            style={{
              fontSize: 28,
              color: COLORS.textMuted,
              fontFamily: FONT_FAMILY.body,
            }}
          >
            lost to MEV attacks annually
          </span>
        </div>
      )}

      {/* Three primitives — clean text, no boxes */}
      {frame > 9 * FPS && (
        <div
          style={{
            marginTop: 40,
            fontSize: 22,
            color: COLORS.textMuted,
            fontFamily: FONT_FAMILY.body,
            letterSpacing: 3,
            opacity: interpolate(frame - 9 * FPS, [0, 15], [0, 0.7], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <span style={{ color: COLORS.accent }}>CRE</span>
          {' · '}
          <span style={{ color: COLORS.accent }}>Private Transactions</span>
          {' · '}
          <span style={{ color: COLORS.accent }}>ACE</span>
        </div>
      )}
    </div>
  );
};
