/**
 * @fileoverview A reusable Modal component implementing Material Design 3 principles
 * with support for responsive layouts, theme modes, accessibility features,
 * RTL support, and high contrast mode detection.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useRef, useState } from 'react'; // v18.2.0
import { Portal } from '@mui/material'; // v5.14.0
import { BaseProps } from '../../interfaces/common.interface';
import { useTheme } from '../../hooks/useTheme';

// Constants for z-index and animation timing
const MODAL_Z_INDEX = 1300;
const ANIMATION_DURATION = 300;
const FOCUS_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface ModalProps extends BaseProps {
  isOpen: boolean;
  onClose: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  ariaLabel: string;
  ariaDescribedBy?: string;
  initialFocusId?: string;
  transformOrigin?: {
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

/**
 * Prevents body scrolling when modal is open
 * @param shouldPrevent Whether to prevent scrolling
 */
const preventBodyScroll = (shouldPrevent: boolean): void => {
  const body = document.body;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  
  if (shouldPrevent) {
    const scrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.paddingRight = `${scrollbarWidth}px`;
  } else {
    const scrollY = parseInt(body.style.top || '0', 10);
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.paddingRight = '';
    window.scrollTo(0, -scrollY);
  }
};

/**
 * Manages focus trap within modal
 * @param modalRef Reference to modal element
 */
const manageFocus = (modalRef: HTMLElement): (() => void) => {
  const focusableElements = modalRef.querySelectorAll(FOCUS_SELECTOR);
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  const previousActiveElement = document.activeElement as HTMLElement;

  const handleTabKey = (e: KeyboardEvent): void => {
    if (!e.key || e.key.toLowerCase() !== 'tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  modalRef.addEventListener('keydown', handleTabKey);
  firstFocusable?.focus();

  return () => {
    modalRef.removeEventListener('keydown', handleTabKey);
    previousActiveElement?.focus();
  };
};

export const Modal: React.FC<ModalProps> = React.memo(({
  isOpen,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  ariaDescribedBy,
  initialFocusId,
  transformOrigin = { vertical: 'center', horizontal: 'center' },
  children,
  className,
  style
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme, direction } = useTheme();

  // Handle escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      preventBodyScroll(true);
      return () => preventBodyScroll(false);
    }
  }, [isOpen]);

  // Handle focus management
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    let cleanup: (() => void) | undefined;

    if (initialFocusId) {
      const initialElement = document.getElementById(initialFocusId);
      if (initialElement) {
        initialElement.focus();
      }
    }

    cleanup = manageFocus(modalRef.current);
    return cleanup;
  }, [isOpen, initialFocusId]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  if (!isOpen && !isAnimating) return null;

  return (
    <Portal>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onClick={handleOverlayClick}
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: transformOrigin.vertical === 'center' ? 'center' : transformOrigin.vertical,
          justifyContent: transformOrigin.horizontal === 'center' ? 'center' : transformOrigin.horizontal,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: MODAL_Z_INDEX,
          opacity: isAnimating ? 0 : 1,
          transition: `opacity ${ANIMATION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
          direction,
          ...style
        }}
      >
        <div
          style={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[24],
            padding: theme.spacing(3),
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
            transition: `transform ${ANIMATION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
            color: theme.palette.text.primary
          }}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
});

Modal.displayName = 'Modal';