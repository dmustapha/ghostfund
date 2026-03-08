import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, FPS, PRIVACY_OUTPUT } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { Terminal } from '../components/Terminal';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const PrivacyDemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split screen activates halfway through
  const splitFrame = FPS * 8;
  const isSplit = frame > splitFrame;

  const splitProgress = spring({
    frame: Math.max(0, frame - splitFrame),
    fps,
    config: { damping: 100, stiffness: 80 },
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatedBackground variant="cool" intensity={0.4} />

      {/* Header */}
      <div style={{ padding: '40px 80px 20px', display: 'flex', alignItems: 'center', gap: 20, zIndex: 2 }}>
        <GlowText text="Private Transactions" fontSize={48} delay={0} glowColor="rgba(34, 211, 238, 0.3)" />
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
          marginBottom: 20,
          fontFamily: FONT_FAMILY.body,
          zIndex: 2,
          opacity: interpolate(frame, [FPS * 1, FPS * 1 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Chainlink PT hides sender identity. Recipients redeem via cryptographic tickets.
      </div>

      {/* Main content: terminal first, then split */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          padding: '0 60px 80px',
          gap: 30,
        }}
      >
        {/* Left side: Terminal */}
        <div
          style={{
            flex: isSplit ? `0 0 ${50 + (1 - splitProgress) * 50}%` : '1 1 100%',
            transition: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <Terminal
            lines={PRIVACY_OUTPUT}
            title="demo-privacy-flow.ts"
            charsPerFrame={0.7}
            startFrame={FPS * 2}
          />
        </div>

        {/* Right side: Split screen comparison */}
        {isSplit && (
          <div
            style={{
              flex: `0 0 ${splitProgress * 45}%`,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              opacity: splitProgress,
            }}
          >
            {/* What user sees */}
            <div
              style={{
                flex: 1,
                borderLeft: `3px solid ${COLORS.success}`,
                padding: '24px 0 24px 24px',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.success, marginBottom: 16, fontFamily: FONT_FAMILY.body }}>
                What the Sender Sees
              </div>
              <div style={{ fontFamily: FONT_FAMILY.mono, fontSize: 20, color: COLORS.text, lineHeight: 2 }}>
                <div>Transfer: 1,000 GHO</div>
                <div>Status: <span style={{ color: COLORS.success }}>Complete</span></div>
                <div>Privacy: <span style={{ color: COLORS.success }}>Sender Shielded</span></div>
                <div>Ticket: 0xab12...ef34</div>
              </div>
            </div>

            {/* What chain sees */}
            <div
              style={{
                flex: 1,
                borderLeft: `3px solid ${COLORS.primary}`,
                padding: '24px 0 24px 24px',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary, marginBottom: 16, fontFamily: FONT_FAMILY.body }}>
                What the Chain Sees
              </div>
              <div style={{ fontFamily: FONT_FAMILY.mono, fontSize: 20, color: COLORS.text, lineHeight: 2 }}>
                <div>Redemption: 1,000 GHO</div>
                <div>Recipient: 0x742d...35Cc</div>
                <div>Sender: <span style={{ color: COLORS.warning }}>???</span></div>
                <div>Origin: <span style={{ color: COLORS.warning }}>Unknown</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom annotations — subtle text */}
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
          zIndex: 10,
        }}
      >
        <span style={{ opacity: interpolate(frame - FPS * 30, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          EIP-712 Auth
        </span>
        <span style={{ opacity: interpolate(frame - FPS * 31, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Withdraw Tickets
        </span>
        <span style={{ opacity: interpolate(frame - FPS * 32, [0, 15], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Sender Hidden
        </span>
      </div>
    </div>
  );
};
