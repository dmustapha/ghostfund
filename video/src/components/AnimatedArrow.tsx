import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../constants';

interface AnimatedArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay?: number;
  color?: string;
  label?: string;
}

export const AnimatedArrow: React.FC<AnimatedArrowProps> = ({
  x1, y1, x2, y2,
  delay = 0,
  color = COLORS.accent,
  label,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - delay;

  const progress = interpolate(relFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(relFrame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dx = x2 - x1;
  const dy = y2 - y1;
  const currentX = x1 + dx * progress;
  const currentY = y1 + dy * progress;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={currentX}
        y2={currentY}
        stroke={color}
        strokeWidth={3}
        strokeDasharray="8,4"
      />
      {progress > 0.9 && (
        <circle cx={x2} cy={y2} r={6} fill={color} />
      )}
      {label && progress > 0.5 && (
        <text
          x={midX}
          y={midY - 12}
          fill={color}
          fontSize={14}
          fontFamily="monospace"
          textAnchor="middle"
          opacity={interpolate(progress, [0.5, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        >
          {label}
        </text>
      )}
    </g>
  );
};
