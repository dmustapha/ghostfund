import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { FONT_FAMILY } from '../fonts';

interface BadgeProps {
  text: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const variantColors = {
  success: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#22c55e' },
  danger: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#f59e0b' },
  info: { bg: 'rgba(99, 102, 241, 0.2)', border: COLORS.primary, text: COLORS.primary },
};

const sizes = {
  sm: { fontSize: 14, px: 12, py: 4 },
  md: { fontSize: 18, px: 16, py: 6 },
  lg: { fontSize: 24, px: 20, py: 8 },
};

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'info',
  delay = 0,
  size = 'md',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - delay;

  const scale = spring({
    frame: Math.max(0, relFrame),
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.3 },
  });

  const opacity = interpolate(relFrame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colors = variantColors[variant];
  const sz = sizes[size];

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 8,
        padding: `${sz.py}px ${sz.px}px`,
        fontSize: sz.fontSize,
        fontWeight: 600,
        fontFamily: FONT_FAMILY.mono,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {text}
    </span>
  );
};
