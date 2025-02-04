import React, { useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form'; // v7.45.0
import { Select as MuiSelect, MenuItem, SelectChangeEvent, FormControl, FormHelperText, InputLabel } from '@mui/material'; // v5.14.0
import { FormField, SelectOption, ValidationRules } from '../../types/form.types';

interface SelectProps extends Omit<FormField, 'type'> {
  multiple?: boolean;
  disabled?: boolean;
  onChange?: (value: string | string[]) => void;
  onBlur?: () => void;
  className?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

/**
 * Enhanced Material Design 3 Select component with comprehensive accessibility support
 * and form validation integration.
 * 
 * @component
 * @example
 * <Select
 *   name="country"
 *   label="Country"
 *   options={countryOptions}
 *   validation={validationRules}
 *   ariaLabel="Select your country"
 *   ariaDescription="List of available countries"
 * />
 */
export const Select: React.FC<SelectProps> = React.memo(({
  name,
  label,
  options = [],
  validation,
  multiple = false,
  disabled = false,
  ariaLabel,
  ariaDescription,
  onChange,
  onBlur,
  className,
  size = 'medium',
  fullWidth = true,
  dependencies
}) => {
  // Initialize form controller with validation
  const {
    field: { value, onChange: fieldOnChange, onBlur: fieldOnBlur },
    fieldState: { error, invalid }
  } = useController({
    name,
    rules: {
      required: validation?.required,
      validate: validation?.validate
    }
  });

  // Memoize options transformation for performance
  const menuItems = useMemo(() => 
    options.map((option: SelectOption) => (
      <MenuItem
        key={option.value}
        value={option.value}
        aria-label={`${option.label} option`}
        role="option"
      >
        {option.label}
      </MenuItem>
    )),
    [options]
  );

  // Enhanced change handler with dependency support
  const handleChange = useCallback((event: SelectChangeEvent<unknown>) => {
    event.preventDefault();
    const selectedValue = event.target.value;

    // Update form state
    fieldOnChange(selectedValue);

    // Execute custom onChange if provided
    if (onChange) {
      onChange(selectedValue as string | string[]);
    }

    // Announce selection to screen readers
    const announcement = multiple
      ? `Selected ${(selectedValue as string[]).length} items`
      : `Selected ${options.find(opt => opt.value === selectedValue)?.label}`;
    
    const ariaLive = document.getElementById(`${name}-live-region`);
    if (ariaLive) {
      ariaLive.textContent = announcement;
    }
  }, [fieldOnChange, multiple, name, onChange, options]);

  // Enhanced blur handler with validation
  const handleBlur = useCallback(() => {
    fieldOnBlur();
    if (onBlur) {
      onBlur();
    }
  }, [fieldOnBlur, onBlur]);

  // Memoize error message for performance
  const errorMessage = useMemo(() => {
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    return '';
  }, [error]);

  return (
    <FormControl
      error={invalid}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      className={className}
    >
      <InputLabel
        id={`${name}-label`}
        required={validation?.required}
        error={invalid}
      >
        {label}
      </InputLabel>

      <MuiSelect
        labelId={`${name}-label`}
        id={name}
        value={value ?? (multiple ? [] : '')}
        multiple={multiple}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        aria-describedby={`${name}-helper-text ${name}-live-region`}
        aria-invalid={invalid}
        aria-required={validation?.required}
        label={label}
      >
        {menuItems}
      </MuiSelect>

      {/* Error message with screen reader support */}
      {errorMessage && (
        <FormHelperText
          id={`${name}-helper-text`}
          error
          role="alert"
        >
          {errorMessage}
        </FormHelperText>
      )}

      {/* Live region for screen reader announcements */}
      <div
        id={`${name}-live-region`}
        aria-live="polite"
        className="sr-only"
        role="status"
      />
    </FormControl>
  );
});

Select.displayName = 'Select';

export default Select;