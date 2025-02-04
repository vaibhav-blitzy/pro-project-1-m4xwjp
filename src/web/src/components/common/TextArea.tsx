/**
 * @fileoverview A reusable TextArea component with form integration, validation, and accessibility features
 * Implements Material Design 3 and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { TextareaAutosize } from '@mui/material'; // v5.14.0
import { UseFormRegister, FieldValues } from 'react-hook-form'; // v7.45.0
import { BaseProps } from '../../interfaces/common.interface';
import { FormField } from '../../types/form.types';

/**
 * Props interface for TextArea component extending BaseProps
 */
interface TextAreaProps extends BaseProps {
  /** Field name for form registration */
  name: string;
  /** Accessible label for the textarea */
  label?: string;
  /** Placeholder text with i18n support */
  placeholder?: string;
  /** Initial value */
  defaultValue?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows */
  maxRows?: number;
  /** Form validation rules */
  validation?: FormField['validation'];
  /** Error message */
  error?: string;
  /** Form field registration function */
  register?: UseFormRegister<FieldValues>;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** ID of error message element */
  'aria-describedby'?: string;
  /** Callback for resize events */
  onResize?: (height: number) => void;
}

/**
 * TextArea component with auto-resize, form integration, and accessibility features
 */
export const TextArea: React.FC<TextAreaProps> = ({
  name,
  label,
  placeholder,
  defaultValue = '',
  disabled = false,
  required = false,
  minRows = 3,
  maxRows = 10,
  validation,
  error,
  register,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  onResize,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Handles textarea auto-resize with debounced updates
   */
  const handleResize = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      // Reset height to recalculate
      element.style.height = 'auto';
      
      // Calculate new height with constraints
      const newHeight = Math.min(
        Math.max(element.scrollHeight, minRows * 24), // 24px per row minimum
        maxRows * 24 // 24px per row maximum
      );

      // Update height if changed
      if (element.style.height !== `${newHeight}px`) {
        element.style.height = `${newHeight}px`;
        onResize?.(newHeight);
      }
    }, 150); // Debounce resize calculations
  }, [minRows, maxRows, onResize]);

  /**
   * Clean up resize timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Get form registration props if available
  const registrationProps = register ? register(name, validation) : {};

  return (
    <TextareaAutosize
      {...registrationProps}
      ref={(element) => {
        // Merge refs for form registration and resize handling
        textareaRef.current = element;
        if (registrationProps.ref) {
          registrationProps.ref(element);
        }
      }}
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      disabled={disabled}
      required={required}
      minRows={minRows}
      maxRows={maxRows}
      onChange={(event) => {
        registrationProps.onChange?.(event);
        handleResize(event);
      }}
      onInput={handleResize}
      className={`textarea-component ${error ? 'error' : ''} ${className}`}
      aria-label={ariaLabel || label}
      aria-invalid={!!error}
      aria-required={required}
      aria-describedby={error ? ariaDescribedBy : undefined}
      data-testid={`textarea-${name}`}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: `1px solid ${error ? '#d32f2f' : '#ccc'}`,
        fontFamily: 'inherit',
        fontSize: '1rem',
        lineHeight: '1.5',
        transition: 'border-color 0.2s ease-in-out',
        resize: 'none',
      }}
    />
  );
};

export default TextArea;