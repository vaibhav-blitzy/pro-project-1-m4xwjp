import React from 'react'; // v18.2.0
import { TextField } from '@mui/material'; // v5.14.0
import { UseFormRegister, FieldValues } from 'react-hook-form'; // v7.45.0
import { FormFieldType } from '../../types/form.types';
import { BaseProps } from '../../interfaces/common.interface';
import { validateEmail, validatePassword } from '../../utils/validation.utils';

/**
 * Props interface for the Input component with comprehensive accessibility support
 */
interface InputProps extends BaseProps {
  /** Input field name */
  name: string;
  /** Type of input field */
  type: FormFieldType;
  /** Input label text */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text for additional context */
  helperText?: string;
  /** React Hook Form register function */
  register?: UseFormRegister<FieldValues>;
  /** Change event handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Blur event handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA describedby for accessibility */
  'aria-describedby'?: string;
  /** Whether to enable browser autocomplete */
  autoComplete?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Maximum length of input */
  maxLength?: number;
  /** Input size variant */
  size?: 'small' | 'medium';
  /** Whether to show the clear button */
  clearable?: boolean;
  /** Whether to auto focus the input */
  autoFocus?: boolean;
}

/**
 * Maps FormFieldType to HTML input type with proper accessibility support
 */
const getInputType = (type: FormFieldType): string => {
  switch (type) {
    case FormFieldType.EMAIL:
      return 'email';
    case FormFieldType.PASSWORD:
      return 'password';
    case FormFieldType.TEXT:
    default:
      return 'text';
  }
};

/**
 * A reusable, accessible input component with Material Design 3 styling
 * and comprehensive form validation support
 */
const Input = React.memo(({
  name,
  type,
  label,
  placeholder,
  required = false,
  error,
  helperText,
  register,
  onChange,
  onBlur,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  autoComplete,
  className,
  style,
  disabled = false,
  maxLength,
  size = 'medium',
  clearable = false,
  autoFocus = false,
}: InputProps): JSX.Element => {
  // Generate unique IDs for accessibility
  const inputId = React.useMemo(() => `input-${name}-${Math.random().toString(36).substr(2, 9)}`, [name]);
  const helperId = React.useMemo(() => `helper-${inputId}`, [inputId]);
  const errorId = React.useMemo(() => `error-${inputId}`, [inputId]);

  // Handle real-time validation
  const handleValidation = React.useCallback(async (value: string) => {
    if (!value) return true;

    switch (type) {
      case FormFieldType.EMAIL:
        const emailResult = await validateEmail(value);
        return emailResult.isValid || emailResult.message;
      case FormFieldType.PASSWORD:
        const passwordResult = await validatePassword(value);
        return passwordResult.isValid || passwordResult.message;
      default:
        return true;
    }
  }, [type]);

  // Prepare registration with validation
  const registration = register ? {
    ...register(name, {
      required: required && 'This field is required',
      validate: handleValidation,
      maxLength: maxLength && {
        value: maxLength,
        message: `Maximum length is ${maxLength} characters`
      }
    })
  } : {};

  // Handle input clearing
  const handleClear = React.useCallback(() => {
    if (registration.onChange) {
      const event = {
        target: { value: '', name }
      } as React.ChangeEvent<HTMLInputElement>;
      registration.onChange(event);
    }
  }, [registration, name]);

  // Prepare ARIA attributes
  const ariaAttributes = {
    'aria-label': ariaLabel || label,
    'aria-required': required,
    'aria-invalid': !!error,
    'aria-describedby': [
      helperText && helperId,
      error && errorId,
      ariaDescribedby
    ].filter(Boolean).join(' ') || undefined
  };

  return (
    <TextField
      id={inputId}
      name={name}
      type={getInputType(type)}
      label={label}
      placeholder={placeholder}
      required={required}
      error={!!error}
      helperText={error || helperText}
      className={className}
      style={style}
      disabled={disabled}
      size={size}
      autoFocus={autoFocus}
      fullWidth
      variant="outlined"
      autoComplete={autoComplete}
      InputProps={{
        ...registration,
        endAdornment: clearable && registration.value ? (
          <React.Fragment>
            {/* Clear button with proper accessibility */}
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear input"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </React.Fragment>
        ) : null
      }}
      FormHelperTextProps={{
        id: helperId,
        error: !!error,
        'aria-live': 'polite'
      }}
      onChange={(e) => {
        registration.onChange?.(e);
        onChange?.(e as React.ChangeEvent<HTMLInputElement>);
      }}
      onBlur={(e) => {
        registration.onBlur?.(e);
        onBlur?.(e as React.FocusEvent<HTMLInputElement>);
      }}
      {...ariaAttributes}
    />
  );
});

Input.displayName = 'Input';

export default Input;