/**
 * @fileoverview A reusable Avatar component implementing Material Design 3 specifications
 * Supports different sizes, variants, and fallback states with accessibility features
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { Avatar as MuiAvatar } from '@mui/material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { BaseProps } from '../../interfaces/common.interface';

/**
 * Props interface for Avatar component
 */
export interface AvatarProps extends BaseProps {
  /** Image source URL */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Fallback initials when image is not available */
  initials?: string;
  /** Size variant of the avatar */
  size?: 'small' | 'medium' | 'large';
  /** Shape variant of the avatar */
  variant?: 'circular' | 'rounded' | 'square';
  /** Whether the avatar is clickable */
  clickable?: boolean;
  /** Loading state of the avatar */
  loading?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Error event handler for image load failures */
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Size constants following 8px grid system
 */
const AVATAR_SIZES = {
  small: '32px',
  medium: '40px',
  large: '48px',
} as const;

/**
 * Fallback colors for initials background
 */
const FALLBACK_COLORS = ['#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', '#1565c0'];

/**
 * Styled wrapper for MuiAvatar with enhanced features
 */
const StyledAvatar = styled(MuiAvatar, {
  shouldForwardProp: (prop) => !['size', 'clickable', 'loading'].includes(prop as string),
})<{
  size?: AvatarProps['size'];
  clickable?: boolean;
  loading?: boolean;
}>(({ theme, size = 'medium', clickable, loading }) => ({
  width: AVATAR_SIZES[size],
  height: AVATAR_SIZES[size],
  fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.25rem' : '1.5rem',
  transition: theme.transitions.create(['transform', 'box-shadow']),
  cursor: clickable ? 'pointer' : 'default',
  
  ...(clickable && {
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: theme.shadows[2],
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  }),

  ...(loading && {
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(90deg, transparent, ${theme.palette.action.hover}, transparent)`,
      animation: 'shimmer 1.5s infinite',
    },
    '@keyframes shimmer': {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
  }),

  [theme.breakpoints.down('sm')]: {
    width: size === 'large' ? AVATAR_SIZES.medium : AVATAR_SIZES[size],
    height: size === 'large' ? AVATAR_SIZES.medium : AVATAR_SIZES[size],
  },
}));

/**
 * Extracts initials from a name string
 * @param name - Full name to extract initials from
 * @returns Formatted initials (max 2 characters)
 */
const getInitials = (name: string): string => {
  if (!name?.trim()) return '?';

  const cleanName = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = cleanName.split(/\s+/);

  if (words.length === 0) return '?';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Avatar component with Material Design 3 specifications
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'medium',
  variant = 'circular',
  clickable = false,
  loading = false,
  ariaLabel,
  onClick,
  onError,
  className,
  style,
}) => {
  // Generate consistent background color based on initials or alt text
  const backgroundColor = useMemo(() => {
    const text = initials || alt || '?';
    const index = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }, [initials, alt]);

  // Handle image load error
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);
  };

  return (
    <StyledAvatar
      src={src}
      alt={alt || 'User avatar'}
      variant={variant}
      size={size}
      clickable={clickable}
      loading={loading}
      onClick={clickable ? onClick : undefined}
      onError={handleError}
      className={className}
      style={{
        backgroundColor: !src ? backgroundColor : undefined,
        ...style,
      }}
      aria-label={ariaLabel || alt || 'User avatar'}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {!src && (initials ? getInitials(initials) : alt ? getInitials(alt) : '?')}
    </StyledAvatar>
  );
};

export default Avatar;