/**
 * @fileoverview Material Design 3 Card Component
 * A flexible container component that implements MD3 specifications for elevation,
 * theming, and content layout with responsive design support.
 * @version 1.0.0
 */

import React, { useState } from 'react'; // v18.2.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import Paper from '@mui/material/Paper'; // v5.14.0
import type { ComponentSize } from '../../types/common.types';

/**
 * Props interface for the Card component
 */
interface CardProps {
  /** Size variant of the card */
  size?: ComponentSize;
  /** Visual variant of the card */
  variant?: 'flat' | 'elevated';
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Click handler for clickable cards */
  onClick?: () => void;
  /** ARIA role for accessibility */
  role?: string;
  /** Custom elevation level (0-24) */
  elevation?: number;
}

/**
 * Calculates the appropriate elevation based on variant and state
 */
const getElevation = (
  variant: 'flat' | 'elevated',
  isHovered: boolean,
  customElevation?: number
): number => {
  if (typeof customElevation === 'number') {
    return Math.min(Math.max(customElevation, 0), 24);
  }

  const baseElevation = variant === 'flat' ? 0 : 1;
  const hoverElevation = variant === 'flat' ? 1 : 2;
  
  return isHovered ? baseElevation + hoverElevation : baseElevation;
};

/**
 * Generates size-specific styles based on theme spacing
 */
const getSizeStyles = (size: ComponentSize, theme: any) => {
  const spacingMap = {
    SMALL: theme.spacing(1),
    MEDIUM: theme.spacing(2),
    LARGE: theme.spacing(3),
  };

  const minHeightMap = {
    SMALL: theme.spacing(5),
    MEDIUM: theme.spacing(8),
    LARGE: theme.spacing(12),
  };

  return {
    padding: spacingMap[size],
    minHeight: minHeightMap[size],
  };
};

/**
 * Styled Paper component with enhanced MD3 styling capabilities
 */
const StyledCard = styled(Paper, {
  shouldForwardProp: (prop) => !['size', 'clickable'].includes(String(prop)),
})<{
  size: ComponentSize;
  variant: 'flat' | 'elevated';
  clickable: boolean;
  elevation: number;
}>(({ theme, size, clickable, elevation }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: theme.transitions.create(
    ['box-shadow', 'transform'],
    { duration: theme.transitions.duration.shorter }
  ),
  ...getSizeStyles(size, theme),
  ...(clickable && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  }),
  // Apply elevation
  boxShadow: theme.shadows[elevation],
  // MD3 surface tint overlay
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    backgroundColor: theme.palette.primary.main,
    opacity: elevation * 0.01, // Subtle elevation-based tint
    borderRadius: 'inherit',
    pointerEvents: 'none',
  },
}));

/**
 * Card component implementing Material Design 3 specifications
 */
export const Card: React.FC<CardProps> = ({
  size = 'MEDIUM',
  variant = 'flat',
  clickable = false,
  children,
  className,
  onClick,
  role = 'article',
  elevation: customElevation,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const elevation = getElevation(variant, isHovered, customElevation);

  return (
    <StyledCard
      size={size}
      variant={variant}
      clickable={clickable}
      elevation={elevation}
      className={className}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={clickable ? handleMouseEnter : undefined}
      onMouseLeave={clickable ? handleMouseLeave : undefined}
      role={role}
      component={clickable ? 'button' : 'div'}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </StyledCard>
  );
};

// Type export for external usage
export type { CardProps };