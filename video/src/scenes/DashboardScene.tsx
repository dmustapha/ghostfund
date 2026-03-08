import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS, FPS } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

// Narration sync (scene is 35s):
// 0s: "This is the live dashboard running on Sepolia testnet right now."
// 5s: "Token balances and lending rates update in real time."
// 12s: "Here you can see CRE recommendations and approve them directly."
// 18s: "The policy panel shows which compliance rules are active."
// 24s: "Every contract address links to Etherscan so you can verify on-chain."
// 30s: "This is not a mockup. It's a working application."

const screenshots = [
  { file: 'dashboard-hero.png', label: 'Dashboard Overview', delay: 0 },
  { file: 'dashboard-strategy.png', label: 'Token Balances & Lending Rates', delay: FPS * 5 },
  { file: 'dashboard-recommendations.png', label: 'CRE Recommendations', delay: FPS * 12 },
  { file: 'dashboard-ace.png', label: 'ACE Compliance Policies', delay: FPS * 18 },
  { file: 'dashboard-contracts.png', label: 'On-Chain Contracts', delay: FPS * 24 },
];

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which screenshot to show
  const currentIndex = screenshots.findIndex((s, i) => {
    const nextDelay = screenshots[i + 1]?.delay ?? Infinity;
    return frame >= s.delay && frame < nextDelay;
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
        padding: '24px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground variant="default" intensity={0.3} />

      {/* Header */}
      <GlowText text="Live Dashboard" fontSize={44} delay={0} />
      <div
        style={{
          fontSize: 22,
          color: COLORS.textMuted,
          marginTop: 6,
          marginBottom: 12,
          fontFamily: FONT_FAMILY.body,
          opacity: interpolate(frame, [5, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        ghostfund.vercel.app — Connected to Sepolia
      </div>

      {/* Screenshot display — fills available space */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {screenshots.map((ss, i) => {
          const relFrame = frame - ss.delay;
          const nextDelay = screenshots[i + 1]?.delay ?? Infinity;
          const isActive = frame >= ss.delay && frame < nextDelay;
          const isLeaving = frame >= nextDelay && frame < nextDelay + 15;

          const opacity = isActive
            ? interpolate(relFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            : isLeaving
              ? interpolate(frame - nextDelay, [0, 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              : 0;

          if (opacity === 0) return null;

          const scale = spring({
            frame: Math.max(0, relFrame),
            fps,
            config: { damping: 200, stiffness: 100, mass: 0.5 },
          });

          // First screenshot (overview) shows smaller, rest fill the frame
          const isOverview = i === 0;

          return (
            <div
              key={ss.file}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
              }}
            >
              <Img
                src={staticFile(`screenshots/${ss.file}`)}
                style={{
                  width: isOverview ? '85%' : '100%',
                  height: isOverview ? 'auto' : '100%',
                  maxHeight: isOverview ? '80%' : '100%',
                  objectFit: isOverview ? 'contain' : 'contain',
                  borderRadius: isOverview ? 16 : 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${COLORS.primary}15`,
                  transform: `scale(${0.98 + scale * 0.02})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.accent,
                  fontFamily: FONT_FAMILY.mono,
                  textShadow: `0 2px 12px ${COLORS.bg}, 0 0 40px ${COLORS.bg}`,
                  letterSpacing: 1,
                }}
              >
                {ss.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {screenshots.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? COLORS.accent : COLORS.textMuted,
              opacity: i === currentIndex ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
};
