/**
 * @fileoverview Material Design 3 Progress Bar Component
 * Implements both determinate and indeterminate progress indicators
 * with full accessibility support and theme integration
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { styled } from '@mui/material/styles'; // v5.14.0
import type { ComponentSize } from '../../types/common.types';

/**
 * Props interface for the ProgressBar component
 */
interface ProgressBarProps {
  value?: number;
  max?: number;
  size?: ComponentSize;
  color?: string;
  indeterminate?: boolean;
  className?: string;
  ariaLabel?: string;
  ariaValueNow?: number;
  ariaValueMin?: number;
  ariaValueMax?: number;
  testId?: string;
}

/**
 * Calculates the progress bar width percentage
 * @param value Current progress value
 * @param max Maximum progress value
 * @returns Calculated width percentage clamped between 0-100
 */
const getProgressBarWidth = (value: number, max: number): number => {
  if (value < 0 || max <= 0) return 0;
  return Math.min(Math.max((value / max) * 100, 0), 100);
};

/**
 * Styled component for the progress bar container following Material Design 3
 */
const StyledProgressBar = styled('div')<{
  size: ComponentSize;
  color?: string;
  indeterminate?: boolean;
}>(({ theme, size, color, indeterminate }) => ({
  position: 'relative',
  width: '100%',
  height: size === 'SMALL' ? 4 : size === 'MEDIUM' ? 8 : 12,
  backgroundColor: theme.palette.action.hover,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  // Material Design 3 elevation
  boxShadow: theme.shadows[1],

  '& .progress-bar-indicator': {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: color || theme.palette.primary.main,
    transition: theme.transitions.create(['width', 'background-color'], {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut,
    }),
    // Material Design 3 surface tint
    backgroundImage: `linear-gradient(
      rgba(${theme.palette.primary.light}, 0.1),
      rgba(${theme.palette.primary.light}, 0.1)
    )`,

    ...(indeterminate && {
      width: '30%',
      animation: 'progress-bar-indeterminate 2s linear infinite',
      '@keyframes progress-bar-indeterminate': {
        '0%': {
          left: '-30%',
        },
        '100%': {
          left: '100%',
        },
      },
    }),
  },
}));

/**
 * ProgressBar component implementing Material Design 3 principles
 * Supports both determinate and indeterminate states with full accessibility
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  max = 100,
  size = 'MEDIUM',
  color,
  indeterminate = false,
  className,
  ariaLabel = 'Progress bar',
  ariaValueNow,
  ariaValueMin = 0,
  ariaValueMax = 100,
  testId = 'progress-bar',
}) => {
  const width = indeterminate ? undefined : getProgressBarWidth(value, max);

  return (
    <StyledProgressBar
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={indeterminate ? undefined : ariaValueNow ?? value}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      size={size}
      color={color}
      indeterminate={indeterminate}
      className={className}
      data-testid={testId}
    >
      <div
        className="progress-bar-indicator"
        style={{ width: indeterminate ? undefined : `${width}%` }}
        data-testid={`${testId}-indicator`}
      />
    </StyledProgressBar>
  );
};

export default ProgressBar;