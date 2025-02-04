/**
 * @fileoverview A reusable loading spinner component with Material Design 3 principles,
 * theme support, and accessibility features.
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { CircularProgress, Box, Typography } from '@mui/material'; // v5.14.0
import { useTheme } from '../../hooks/useTheme';

interface LoadingProps {
  /** Size of the loading spinner */
  size?: number | 'small' | 'medium' | 'large';
  /** Optional text to display below the spinner */
  text?: string;
  /** Whether to display in fullscreen mode */
  fullScreen?: boolean;
  /** Custom color for the spinner */
  color?: string;
  /** Optional className for styling */
  className?: string;
  /** ARIA role override */
  role?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Maps size string values to pixel values
 */
const sizeMap = {
  small: 24,
  medium: 40,
  large: 56
};

/**
 * Loading spinner component with Material Design 3 principles
 */
const Loading = React.memo(({
  size = 'medium',
  text,
  fullScreen = false,
  color,
  className = '',
  role = 'status',
  'aria-label': ariaLabel = 'Loading',
  'data-testid': testId = 'loading-spinner'
}: LoadingProps) => {
  const { theme } = useTheme();

  // Convert string sizes to numbers
  const spinnerSize = typeof size === 'string' ? sizeMap[size] : size;

  // Determine spinner color based on theme and props
  const spinnerColor = color || theme.palette.primary.main;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Box
      className={`loading-container ${className}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.palette.background.default,
          zIndex: theme.zIndex.modal
        })
      }}
      data-testid={testId}
    >
      <CircularProgress
        size={spinnerSize}
        sx={{
          color: spinnerColor,
          animation: prefersReducedMotion ? 'none' : undefined,
          transition: theme.transitions.create(['color'], {
            duration: theme.transitions.duration.standard
          })
        }}
        role={role}
        aria-label={ariaLabel}
        aria-busy="true"
      />
      {text && (
        <Typography
          variant="body2"
          sx={{
            marginTop: theme.spacing(2),
            color: theme.palette.text.secondary,
            transition: theme.transitions.create(['color'], {
              duration: theme.transitions.duration.standard
            })
          }}
          aria-live="polite"
        >
          {text}
        </Typography>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.size === nextProps.size &&
    prevProps.text === nextProps.text &&
    prevProps.fullScreen === nextProps.fullScreen &&
    prevProps.color === nextProps.color &&
    prevProps.className === nextProps.className
  );
});

// Display name for debugging
Loading.displayName = 'Loading';

export default Loading;