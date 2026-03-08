import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { FONT_FAMILY } from '../fonts';

interface GlowTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  glowColor?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const GlowText: React.FC<GlowTextProps> = ({
  text,
  fontSize = 64,
  color = COLORS.text,
  glowColor = COLORS.glow,
  delay = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = frame - delay;

  const opacity = interpolate(relFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const y = spring({
    frame: Math.max(0, relFrame),
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  const glowIntensity = interpolate(relFrame, [10, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        fontSize,
        fontWeight: 800,
        color,
        opacity,
        transform: `translateY(${(1 - y) * 30}px)`,
        textShadow: `0 0 ${20 * glowIntensity}px ${glowColor}, 0 0 ${40 * glowIntensity}px ${glowColor}`,
        fontFamily: FONT_FAMILY.heading,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
