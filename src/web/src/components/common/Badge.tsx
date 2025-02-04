/**
 * @fileoverview A reusable Badge component following Material Design 3 principles
 * Implements WCAG 2.1 Level AA compliance with dynamic color contrast calculations
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import { BaseProps } from '../../interfaces/common.interface';
import { ComponentSize } from '../../types/common.types';

/**
 * Available badge variants following Material Design color system
 */
export type BadgeVariant = 
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success'
  | 'default';

/**
 * Badge size options following 8px grid system
 */
export type BadgeSize = Extract<ComponentSize, 'SMALL' | 'MEDIUM' | 'LARGE'>;

/**
 * Props interface for the Badge component
 */
export interface BadgeProps extends BaseProps {
  /** Visual variant of the badge */
  variant?: BadgeVariant;
  /** Size variant of the badge */
  size?: BadgeSize;
}

/**
 * Calculates WCAG AA compliant color combinations for badge
 */
const getBadgeColor = React.memo((variant: BadgeVariant, theme: any) => {
  const getContrastRatio = (background: string, text: string): number => {
    // Convert colors to relative luminance and calculate contrast ratio
    const getLuminance = (color: string): number => {
      const rgb = theme.palette[color]?.main || color;
      const [r, g, b] = rgb.match(/\w\w/g)?.map(
        (c: string) => parseInt(c, 16) / 255
      ) || [0, 0, 0];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(background);
    const l2 = getLuminance(text);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return ratio;
  };

  const getBaseColors = () => {
    switch (variant) {
      case 'primary':
        return {
          background: theme.palette.primary.main,
          text: theme.palette.primary.contrastText
        };
      case 'secondary':
        return {
          background: theme.palette.secondary.main,
          text: theme.palette.secondary.contrastText
        };
      case 'error':
        return {
          background: theme.palette.error.main,
          text: theme.palette.error.contrastText
        };
      case 'warning':
        return {
          background: theme.palette.warning.main,
          text: theme.palette.warning.contrastText
        };
      case 'info':
        return {
          background: theme.palette.info.main,
          text: theme.palette.info.contrastText
        };
      case 'success':
        return {
          background: theme.palette.success.main,
          text: theme.palette.success.contrastText
        };
      default:
        return {
          background: theme.palette.grey[200],
          text: theme.palette.text.primary
        };
    }
  };

  const colors = getBaseColors();
  const contrastRatio = getContrastRatio(colors.background, colors.text);

  // Adjust colors if they don't meet WCAG AA standard (4.5:1)
  if (contrastRatio < 4.5) {
    colors.text = theme.palette.getContrastText(colors.background);
  }

  return {
    background: colors.background,
    text: colors.text,
    border: variant === 'default' ? theme.palette.divider : 'transparent'
  };
});

/**
 * Calculates size-based dimensions following 8px grid
 */
const getSize = (size: BadgeSize) => {
  switch (size) {
    case 'SMALL':
      return {
        padding: '0 8px',
        fontSize: '0.75rem',
        height: '24px'
      };
    case 'LARGE':
      return {
        padding: '0 16px',
        fontSize: '1rem',
        height: '40px'
      };
    default: // MEDIUM
      return {
        padding: '0 12px',
        fontSize: '0.875rem',
        height: '32px'
      };
  }
};

/**
 * Styled component for the badge with theme integration
 */
const StyledBadge = styled('div')<{
  variant: BadgeVariant;
  size: BadgeSize;
}>(({ theme, variant, size }) => {
  const colors = getBadgeColor(variant, theme);
  const dimensions = getSize(size);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.borderRadius,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1,
    transition: theme.transitions.create(
      ['background-color', 'color', 'border-color'],
      {
        duration: theme.transitions.duration.short
      }
    ),
    backgroundColor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    ...dimensions,

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },

    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px'
    },

    // Accessibility enhancements
    '&[aria-disabled="true"]': {
      opacity: theme.palette.action.disabledOpacity,
      pointerEvents: 'none'
    },
  };
});

/**
 * Badge component for displaying status indicators or counts
 */
export const Badge: React.FC<BadgeProps> = React.memo(({
  variant = 'default',
  size = 'MEDIUM',
  className,
  children,
  ...props
}) => {
  const theme = useTheme();

  return (
    <StyledBadge
      variant={variant}
      size={size}
      className={className}
      role="status"
      aria-atomic="true"
      {...props}
    >
      {children}
    </StyledBadge>
  );
});

Badge.displayName = 'Badge';