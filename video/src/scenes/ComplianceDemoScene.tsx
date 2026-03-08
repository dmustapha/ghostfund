import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS, FPS, COMPLIANCE_OUTPUT } from '../constants';
import { FONT_FAMILY } from '../fonts';
import { Terminal } from '../components/Terminal';
import { GlowText } from '../components/GlowText';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const ComplianceDemoScene: React.FC = () => {
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <GlowText
          text="ACE Compliance"
          fontSize={48}
          delay={0}
          color={COLORS.success}
          glowColor="rgba(34, 197, 94, 0.3)"
        />
        <span
          style={{
            fontSize: 18,
            color: COLORS.success,
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
          opacity: interpolate(frame, [FPS * 2, FPS * 2 + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Three policies protect every deposit. On-chain enforcement via PolicyEngine.
      </div>

      {/* Terminal + policy cards side by side */}
      <div style={{ display: 'flex', gap: 30, width: '100%', flex: 1, minHeight: 0 }}>
        {/* Terminal */}
        <div style={{ flex: '1 1 55%' }}>
          <Terminal
            lines={COMPLIANCE_OUTPUT}
            title="demo-compliance-flow.ts"
            charsPerFrame={1.2}
            startFrame={FPS * 3}
          />
        </div>

        {/* Policy cards */}
        <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              name: 'AllowPolicy',
              desc: 'Address whitelist for depositors',
              icon: 'shield',
              color: COLORS.success,
              delay: FPS * 6,
            },
            {
              name: 'MaxPolicy',
              desc: 'Per-deposit amount caps',
              icon: 'limit',
              color: COLORS.warning,
              delay: FPS * 10,
            },
            {
              name: 'PausePolicy',
              desc: 'Emergency circuit breaker',
              icon: 'stop',
              color: COLORS.danger,
              delay: FPS * 14,
            },
          ].map((policy) => {
            const pOpacity = interpolate(frame - policy.delay, [0, 15], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const pY = interpolate(frame - policy.delay, [0, 15], [20, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <div
                key={policy.name}
                style={{
                  padding: '16px 0 16px 20px',
                  borderLeft: `3px solid ${policy.color}`,
                  opacity: pOpacity,
                  transform: `translateY(${pY}px)`,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: policy.color, fontFamily: FONT_FAMILY.mono, marginBottom: 4 }}>
                  {policy.name}
                </div>
                <div style={{ fontSize: 19, color: COLORS.textMuted, fontFamily: FONT_FAMILY.body }}>
                  {policy.desc}
                </div>
              </div>
            );
          })}

          {/* DepositExtractor callout */}
          <div
            style={{
              padding: '16px 0 16px 20px',
              borderLeft: `3px solid ${COLORS.primary}`,
              opacity: interpolate(frame - FPS * 18, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <div style={{ fontSize: 20, color: COLORS.primary, fontFamily: FONT_FAMILY.mono, fontWeight: 600 }}>
              DepositExtractor
            </div>
            <div style={{ fontSize: 18, color: COLORS.textMuted, fontFamily: FONT_FAMILY.body, marginTop: 4 }}>
              Custom calldata parser for ACE policy evaluation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
