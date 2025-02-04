import { useState } from 'react'; // v18.2.0
import { useForm as useReactHookForm } from 'react-hook-form'; // v7.45.0
import { yupResolver } from '@hookform/resolvers/yup'; // v3.2.0
import { object } from 'yup'; // v1.2.0

import { FormField, FormErrors } from '../types/form.types';
import { createValidationSchema } from '../utils/validation.utils';

/**
 * Interface for form accessibility context
 */
interface AccessibilityContext {
  announcements: string[];
  errorCount: number;
  firstError?: string;
  ariaLive: 'off' | 'polite' | 'assertive';
}

/**
 * Interface for form security state
 */
interface SecurityState {
  isValidating: boolean;
  hasSecurityViolations: boolean;
  violationCount: number;
  securityMessages: string[];
}

/**
 * Interface for enhanced form options
 */
interface EnhancedFormOptions {
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  defaultValues?: Record<string, any>;
  shouldUnregister?: boolean;
  criteriaMode?: 'firstError' | 'all';
}

/**
 * Enhanced useForm hook with accessibility and security features
 * @param fields - Array of form field configurations
 * @param onSubmit - Form submission handler
 * @param options - Enhanced form options
 */
export const useForm = (
  fields: FormField[],
  onSubmit: (data: any) => Promise<void>,
  options: EnhancedFormOptions = {}
) => {
  // Initialize accessibility context
  const [accessibilityContext, setAccessibilityContext] = useState<AccessibilityContext>({
    announcements: [],
    errorCount: 0,
    ariaLive: 'polite'
  });

  // Initialize security state
  const [securityState, setSecurityState] = useState<SecurityState>({
    isValidating: false,
    hasSecurityViolations: false,
    violationCount: 0,
    securityMessages: []
  });

  // Create validation schema
  const validationSchema = object(
    fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: createValidationSchema(field.type, field.validation)
    }), {})
  );

  // Initialize form with React Hook Form
  const {
    register,
    handleSubmit: handleReactHookFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
    clearErrors,
    watch
  } = useReactHookForm({
    resolver: yupResolver(validationSchema),
    mode: options.mode || 'onBlur',
    reValidateMode: options.reValidateMode || 'onChange',
    defaultValues: options.defaultValues,
    shouldUnregister: options.shouldUnregister,
    criteriaMode: options.criteriaMode || 'all'
  });

  /**
   * Updates accessibility context with form state
   * @param formErrors - Current form errors
   */
  const updateAccessibilityContext = (formErrors: FormErrors) => {
    const errorMessages = Object.entries(formErrors).map(([field, error]) => {
      const fieldConfig = fields.find(f => f.name === field);
      return `${fieldConfig?.validation.ariaLabel || field}: ${error.message}`;
    });

    setAccessibilityContext({
      announcements: errorMessages,
      errorCount: errorMessages.length,
      firstError: errorMessages[0],
      ariaLive: errorMessages.length > 0 ? 'assertive' : 'polite'
    });
  };

  /**
   * Validates field against security patterns
   * @param name - Field name
   * @param value - Field value
   */
  const validateSecurity = (name: string, value: any) => {
    const field = fields.find(f => f.name === name);
    if (!field?.validation.securityPatterns) return true;

    const violations = field.validation.securityPatterns
      .filter(pattern => pattern.test(String(value)))
      .map(pattern => `Security violation in ${field.validation.ariaLabel}`);

    setSecurityState(prev => ({
      ...prev,
      hasSecurityViolations: violations.length > 0,
      violationCount: prev.violationCount + violations.length,
      securityMessages: [...prev.securityMessages, ...violations]
    }));

    return violations.length === 0;
  };

  /**
   * Enhanced submit handler with security validation
   */
  const handleSubmit = handleReactHookFormSubmit(async (data) => {
    setSecurityState(prev => ({ ...prev, isValidating: true }));

    // Validate all fields against security patterns
    const securityViolations = Object.entries(data)
      .filter(([name, value]) => !validateSecurity(name, value));

    if (securityViolations.length > 0) {
      setSecurityState(prev => ({
        ...prev,
        isValidating: false,
        hasSecurityViolations: true
      }));
      return;
    }

    try {
      await onSubmit(data);
      reset();
      setSecurityState({
        isValidating: false,
        hasSecurityViolations: false,
        violationCount: 0,
        securityMessages: []
      });
    } catch (error) {
      setSecurityState(prev => ({
        ...prev,
        isValidating: false,
        securityMessages: [...prev.securityMessages, 'Form submission failed']
      }));
    }
  });

  /**
   * Enhanced field registration with accessibility and security
   * @param name - Field name
   */
  const registerField = (name: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) throw new Error(`Field ${name} not found in configuration`);

    return {
      ...register(name, {
        onChange: (e) => validateSecurity(name, e.target.value)
      }),
      'aria-required': field.validation.required,
      'aria-invalid': !!errors[name],
      'aria-describedby': `${name}-error`,
      'aria-label': field.validation.ariaLabel
    };
  };

  // Watch for errors and update accessibility context
  useState(() => {
    if (Object.keys(errors).length > 0) {
      updateAccessibilityContext(errors as FormErrors);
    }
  });

  return {
    register: registerField,
    handleSubmit,
    errors,
    isSubmitting,
    reset,
    accessibilityContext,
    securityState,
    setError,
    clearErrors,
    watch
  };
};