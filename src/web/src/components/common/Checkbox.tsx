/**
 * @fileoverview Accessible checkbox component with Material Design and React Hook Form integration
 * Implements WCAG 2.1 Level AA compliance with comprehensive validation support
 * @version 1.0.0
 */

import React, { useCallback, useId, useState } from 'react'; // v18.2.0
import { Checkbox, FormControlLabel, FormHelperText } from '@mui/material'; // v5.14.0
import type { UseFormRegister } from 'react-hook-form'; // v7.45.0
import { BaseProps } from '../../interfaces/common.interface';
import { FormFieldType } from '../../types/form.types';

/**
 * Props interface for the CustomCheckbox component
 */
export interface CheckboxProps extends BaseProps {
  /** Input name for form registration */
  name: string;
  /** Accessible label text */
  label: string;
  /** Controlled checkbox state */
  checked?: boolean;
  /** Initial state for uncontrolled mode */
  defaultChecked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Error state for validation feedback */
  error?: boolean;
  /** Helper text for context or errors */
  helperText?: string;
  /** Required field indicator */
  required?: boolean;
  /** Change event handler */
  onChange?: (checked: boolean) => void;
  /** React Hook Form register function */
  register?: UseFormRegister<any>;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Color variant */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

/**
 * Accessible checkbox component with Material Design implementation
 * and React Hook Form integration
 */
export const CustomCheckbox: React.FC<CheckboxProps> = ({
  name,
  label,
  checked,
  defaultChecked,
  disabled = false,
  error = false,
  helperText,
  required = false,
  onChange,
  register,
  size = 'medium',
  color = 'primary',
  className,
  style,
  testId = 'custom-checkbox',
}) => {
  // Generate unique ID for accessibility
  const uniqueId = useId();
  const helperId = `${uniqueId}-helper-text`;

  // Local state for uncontrolled mode
  const [localChecked, setLocalChecked] = useState(defaultChecked ?? false);

  // Determine if component is controlled
  const isControlled = checked !== undefined;
  const checkboxChecked = isControlled ? checked : localChecked;

  /**
   * Handles checkbox state changes with proper event handling
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      
      const newChecked = event.target.checked;
      
      // Update state based on controlled/uncontrolled mode
      if (!isControlled) {
        setLocalChecked(newChecked);
      }

      // Call onChange handler if provided
      onChange?.(newChecked);
    },
    [isControlled, onChange]
  );

  // Prepare registration props for React Hook Form
  const registrationProps = register
    ? register(name, {
        required: required ? 'This field is required' : false,
        type: FormFieldType.CHECKBOX,
      })
    : {};

  return (
    <div className={className} style={style}>
      <FormControlLabel
        control={
          <Checkbox
            {...registrationProps}
            checked={checkboxChecked}
            onChange={handleChange}
            disabled={disabled}
            size={size}
            color={color}
            required={required}
            inputProps={{
              'aria-describedby': helperText ? helperId : undefined,
              'aria-invalid': error,
              'data-testid': testId,
            }}
          />
        }
        label={
          <span>
            {label}
            {required && (
              <span aria-hidden="true" style={{ color: error ? '#d32f2f' : 'inherit' }}>
                *
              </span>
            )}
          </span>
        }
      />
      {helperText && (
        <FormHelperText
          id={helperId}
          error={error}
          sx={{ marginLeft: '32px' }}
        >
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
};

// Default export for convenient importing
export default CustomCheckbox;