import React, { forwardRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import type { ComponentSize } from '../../types/common.types';
import './Button.scss';

/**
 * Props interface for the Button component following Material Design 3 guidelines
 */
interface ButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Visual style variant following Material Design 3 */
  variant?: 'contained' | 'outlined' | 'text';
  /** Size variant using standardized component sizes */
  size?: ComponentSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state showing a spinner */
  loading?: boolean;
  /** Optional icon before button text */
  startIcon?: React.ReactNode;
  /** Optional icon after button text */
  endIcon?: React.ReactNode;
  /** Full width button option */
  fullWidth?: boolean;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler with type safety */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Generates theme-aware class names for button styling
 */
const getButtonClasses = (props: ButtonProps): string => {
  const {
    variant = 'contained',
    size = 'MEDIUM',
    disabled,
    loading,
    fullWidth,
    className
  } = props;

  return classNames(
    'md3-button',
    `md3-button--${variant}`,
    `md3-button--${size.toLowerCase()}`,
    {
      'md3-button--disabled': disabled,
      'md3-button--loading': loading,
      'md3-button--full-width': fullWidth,
    },
    className
  );
};

/**
 * A theme-aware, accessible button component following Material Design 3 guidelines.
 * Supports multiple variants, sizes, states and comprehensive ARIA attributes.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'contained',
      size = 'MEDIUM',
      disabled = false,
      loading = false,
      startIcon,
      endIcon,
      fullWidth = false,
      type = 'button',
      onClick,
      className,
      ariaLabel,
      ...rest
    },
    ref
  ) => {
    // Generate theme-aware class names
    const buttonClasses = getButtonClasses({
      variant,
      size,
      disabled,
      loading,
      fullWidth,
      className
    });

    // Handle loading state spinner
    const renderSpinner = () => (
      <span className="md3-button__spinner" role="progressbar" aria-hidden={!loading}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle
            className="md3-button__spinner-circle"
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2.5"
          />
        </svg>
      </span>
    );

    return (
      <button
        ref={ref}
        className={buttonClasses}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...rest}
      >
        {/* Loading spinner */}
        {loading && renderSpinner()}

        {/* Button content wrapper for proper alignment */}
        <span className="md3-button__content">
          {/* Start icon if provided */}
          {startIcon && (
            <span className="md3-button__icon md3-button__icon--start">
              {startIcon}
            </span>
          )}

          {/* Main button text/content */}
          <span className="md3-button__label">{children}</span>

          {/* End icon if provided */}
          {endIcon && (
            <span className="md3-button__icon md3-button__icon--end">
              {endIcon}
            </span>
          )}
        </span>
      </button>
    );
  }
);

// Display name for debugging
Button.displayName = 'Button';

export default Button;