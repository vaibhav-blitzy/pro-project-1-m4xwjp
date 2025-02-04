/**
 * @fileoverview A reusable Toast notification component following Material Design 3 principles
 * Provides temporary messages with different severity levels, animations, and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react'; // v18.2.0
import { Alert, Snackbar, Slide } from '@mui/material'; // v5.14.0
import type { BaseProps } from '../../interfaces/common.interface';
import type { TransitionProps } from '@mui/material/transitions';

// Constants for toast configuration
const TOAST_DURATION = 3000; // Default duration in milliseconds
const TOAST_ANIMATION_DURATION = 300;
const GRID_SPACING = 8;

/**
 * Props interface for the Toast component
 */
export interface ToastProps {
  /** Controls toast visibility */
  open: boolean;
  /** Message to display in the toast */
  message: string;
  /** Toast severity level */
  severity: 'success' | 'error' | 'warning' | 'info';
  /** Duration in milliseconds before auto-closing */
  duration?: number;
  /** Callback function when toast closes */
  onClose?: () => void;
  /** Toast position configuration */
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right' | 'center';
  };
  /** Callback function after exit animation completes */
  onExited?: () => void;
}

/**
 * Slide transition component for toast animation
 */
const SlideTransition = React.forwardRef(function SlideTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide {...props} direction="up" ref={ref} />;
});

/**
 * Toast component for displaying temporary notifications with accessibility support
 */
const Toast: React.FC<ToastProps & BaseProps> = React.memo(({
  open,
  message,
  severity = 'info',
  duration = TOAST_DURATION,
  onClose,
  position = { vertical: 'bottom', horizontal: 'center' },
  onExited,
  className,
  style
}) => {
  // Ref for managing focus restoration
  const previousFocus = useRef<HTMLElement | null>(null);

  // Store the previously focused element when toast opens
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Handle toast closing
  const handleClose = useCallback((event: Event | null, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose?.();
  }, [onClose]);

  // Handle cleanup after exit animation
  const handleExited = useCallback(() => {
    // Restore focus to previous element
    if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
    onExited?.();
  }, [onExited]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={position}
      TransitionComponent={SlideTransition}
      TransitionProps={{ onExited: handleExited }}
      className={className}
      style={{
        ...style,
        margin: GRID_SPACING * 2
      }}
      // Accessibility attributes
      role="alert"
      aria-live="polite"
    >
      <Alert
        severity={severity}
        onClose={handleClose}
        variant="filled"
        elevation={6}
        sx={{
          width: '100%',
          minWidth: '288px', // MD3 specification
          maxWidth: '568px', // MD3 specification
          borderRadius: '4px',
          '& .MuiAlert-icon': {
            marginRight: GRID_SPACING * 2,
          },
          '& .MuiAlert-message': {
            padding: `${GRID_SPACING}px 0`,
          },
          '& .MuiAlert-action': {
            padding: `${GRID_SPACING}px 0`,
            marginRight: 0,
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
});

// Display name for debugging
Toast.displayName = 'Toast';

export default Toast;