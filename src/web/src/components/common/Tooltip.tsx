/**
 * @fileoverview Enhanced Material-UI Tooltip component with accessibility and theme support
 * Implements WCAG 2.1 Level AA compliance and Material Design 3 guidelines
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef } from 'react'; // v18.2.0
import { Tooltip } from '@mui/material'; // v5.14.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import { BaseProps } from '../../interfaces/common.interface';

/**
 * Tooltip placement options following Material Design 3 guidelines
 */
export type TooltipPlacement = 
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

/**
 * Touch device specific configuration for enhanced mobile experience
 */
interface TooltipTouchConfig {
  longPressDelay?: number;
  disableHoverOnTouch?: boolean;
  touchHoldDuration?: number;
}

/**
 * Props interface extending BaseProps with tooltip-specific properties
 */
interface TooltipProps extends BaseProps {
  /** Content to display in the tooltip */
  title: string | React.ReactNode;
  /** Tooltip placement relative to the target element */
  placement?: TooltipPlacement;
  /** Whether to show an arrow pointer */
  arrow?: boolean;
  /** Delay before showing tooltip (ms) */
  enterDelay?: number;
  /** Delay before hiding tooltip (ms) */
  leaveDelay?: number;
  /** Whether tooltip is interactive */
  interactive?: boolean;
  /** Touch device specific configuration */
  touchConfig?: TooltipTouchConfig;
}

/**
 * Styled wrapper for Material-UI Tooltip with theme integration
 */
const StyledTooltip = styled(Tooltip)(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? theme.palette.grey[900] 
      : theme.palette.grey[700],
    color: theme.palette.common.white,
    fontSize: theme.typography.pxToRem(12),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    maxWidth: 300,
    wordWrap: 'break-word',
    ...theme.typography.body2,
    boxShadow: theme.shadows[1],
    
    // Ensure WCAG 2.1 contrast requirements
    '@media (prefers-contrast: more)': {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
      border: `1px solid ${theme.palette.grey[400]}`,
    },
  },

  '& .MuiTooltip-arrow': {
    color: theme.palette.mode === 'dark' 
      ? theme.palette.grey[900] 
      : theme.palette.grey[700],
    
    '@media (prefers-contrast: more)': {
      color: theme.palette.common.black,
    },
  },

  // Focus visible styles for keyboard navigation
  '& .MuiTooltip-tooltip:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },

  // RTL support
  '&[dir="rtl"]': {
    '& .MuiTooltip-arrow': {
      transform: 'rotate(180deg)',
    },
  },
}));

/**
 * Enhanced tooltip component with accessibility and touch support
 */
export const CustomTooltip: React.FC<TooltipProps> = ({
  title,
  placement = 'bottom',
  arrow = true,
  enterDelay = 200,
  leaveDelay = 0,
  interactive = false,
  touchConfig = {
    longPressDelay: 1500,
    disableHoverOnTouch: true,
    touchHoldDuration: 1000,
  },
  children,
  className,
  ...props
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const touchTimerRef = useRef<number>();
  const isTouchDevice = 'ontouchstart' in window;

  /**
   * Handles tooltip open event with device-specific logic
   */
  const handleTooltipOpen = useCallback((
    event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent
  ) => {
    event.preventDefault();

    if (isTouchDevice && touchConfig.disableHoverOnTouch) {
      touchTimerRef.current = window.setTimeout(() => {
        setOpen(true);
      }, touchConfig.longPressDelay);
    } else {
      setOpen(true);
    }
  }, [touchConfig.disableHoverOnTouch, touchConfig.longPressDelay]);

  /**
   * Handles tooltip close event with cleanup
   */
  const handleTooltipClose = useCallback((
    event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent
  ) => {
    event.preventDefault();

    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }

    setOpen(false);
  }, []);

  return (
    <StyledTooltip
      open={open}
      onOpen={handleTooltipOpen}
      onClose={handleTooltipClose}
      title={title}
      placement={placement}
      arrow={arrow}
      enterDelay={enterDelay}
      leaveDelay={leaveDelay}
      interactive={interactive}
      className={className}
      PopperProps={{
        modifiers: [{
          name: 'offset',
          options: {
            offset: [0, 8], // Follows Material Design 3 spacing
          },
        }],
      }}
      {...props}
      // ARIA attributes for accessibility
      aria-label={typeof title === 'string' ? title : undefined}
      role="tooltip"
      // Touch event handlers
      onTouchStart={handleTooltipOpen}
      onTouchEnd={handleTooltipClose}
      // Keyboard event handlers
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          handleTooltipClose(event);
        }
      }}
    >
      {/* Wrap children in span for consistent event handling */}
      <span
        style={{ display: 'inline-block' }}
        tabIndex={0}
        role="button"
      >
        {children}
      </span>
    </StyledTooltip>
  );
};

export default CustomTooltip;