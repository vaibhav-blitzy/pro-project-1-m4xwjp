/**
 * @fileoverview Enhanced Material Design 3 date picker component with form integration,
 * accessibility support, and internationalization features.
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import { useController } from 'react-hook-form'; // v7.45.0
import { TextField } from '@mui/material'; // v5.14.0
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // v6.10.0
import { formatDate, isValidDate } from '../../utils/date.utils';
import type { FormField } from '../../types/form.types';

interface DatePickerProps extends Omit<FormField, 'type'> {
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  dateFormat?: string;
  locale?: string;
  touchOptimized?: boolean;
  onChange?: (date: Date | null) => void;
}

/**
 * Enhanced date picker component implementing Material Design 3 principles
 * with comprehensive accessibility and mobile support.
 */
const DatePickerComponent: React.FC<DatePickerProps> = ({
  name,
  label,
  validation,
  placeholder,
  minDate,
  maxDate,
  disabled = false,
  dateFormat = 'YYYY-MM-DD',
  locale = 'en',
  touchOptimized = true,
  onChange,
  ariaLabel,
  ariaDescription
}) => {
  // Form integration using react-hook-form controller
  const {
    field: { value, onChange: fieldOnChange, onBlur },
    fieldState: { error }
  } = useController({
    name,
    rules: {
      required: validation.required,
      validate: (value) => isValidDate(value) || validation.errorMessage.key
    }
  });

  /**
   * Handles date selection changes with validation and accessibility updates
   */
  const handleDateChange = useCallback((date: Date | null) => {
    try {
      if (date && !isValidDate(date)) {
        throw new Error('Invalid date selected');
      }

      // Format date if valid
      const formattedDate = date ? formatDate(date, dateFormat, locale) : null;
      
      // Update form field
      fieldOnChange(formattedDate);
      
      // Trigger external onChange if provided
      if (onChange) {
        onChange(date);
      }

      // Update ARIA live region
      const liveRegion = document.getElementById(`${name}-live-region`);
      if (liveRegion) {
        liveRegion.textContent = date 
          ? `Selected date: ${formatDate(date, dateFormat, locale)}`
          : 'No date selected';
      }
    } catch (err) {
      console.error('Date selection error:', err);
    }
  }, [name, dateFormat, locale, fieldOnChange, onChange]);

  /**
   * Formats validation error messages with i18n support
   */
  const formatErrorMessage = useCallback((errorType: string): string => {
    const messages = {
      required: 'This field is required',
      invalid: 'Please enter a valid date',
      range: 'Date must be between valid range',
      default: 'Invalid input'
    };

    return messages[errorType as keyof typeof messages] || messages.default;
  }, []);

  /**
   * Memoized accessibility attributes
   */
  const accessibilityProps = useMemo(() => ({
    'aria-label': ariaLabel,
    'aria-invalid': !!error,
    'aria-describedby': `${name}-description ${name}-error ${name}-live-region`,
    'aria-required': validation.required,
    role: 'combobox',
    'aria-expanded': false,
    'aria-haspopup': 'dialog'
  }), [ariaLabel, error, name, validation.required]);

  return (
    <div className="date-picker-container">
      <MuiDatePicker
        value={value ? new Date(value) : null}
        onChange={handleDateChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            name={name}
            label={label}
            placeholder={placeholder}
            error={!!error}
            helperText={error ? formatErrorMessage(error.type) : ariaDescription}
            onBlur={onBlur}
            {...accessibilityProps}
          />
        )}
        // Enhanced keyboard navigation support
        KeyboardButtonProps={{
          'aria-label': 'Open date picker',
          tabIndex: 0
        }}
        // Mobile optimization
        PopperProps={{
          placement: 'bottom-start',
          modifiers: [{
            name: 'preventOverflow',
            enabled: true,
            options: {
              boundary: 'viewport'
            }
          }]
        }}
        // Localization support
        locale={locale}
        // Touch optimization
        inputFormat={dateFormat}
        mask={touchOptimized ? '__/__/____' : undefined}
      />
      {/* Hidden live region for screen readers */}
      <div
        id={`${name}-live-region`}
        className="visually-hidden"
        aria-live="polite"
        role="status"
      />
      {/* Hidden description for screen readers */}
      <div
        id={`${name}-description`}
        className="visually-hidden"
      >
        {ariaDescription}
      </div>
    </div>
  );
};

export default DatePickerComponent;