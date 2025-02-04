import { object, string, number, date } from 'yup'; // v1.2.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import {
  FormField,
  ValidationRules,
  FormFieldType,
  ValidationContext,
  LocalizedError,
  ValidationResult
} from '../types/form.types';

// Cache for memoized validation schemas
const schemaCache = new Map<string, any>();

/**
 * Creates a memoized Yup validation schema based on form field configurations
 * with WCAG 2.1 Level AA compliance support
 * @param fields - Array of form field configurations
 * @returns Memoized Yup validation schema
 */
export const createFormValidation = (fields: FormField[]) => {
  // Generate cache key based on field configurations
  const cacheKey = JSON.stringify(fields.map(f => ({ name: f.name, type: f.type, validation: f.validation })));
  
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey);
  }

  const schemaFields: Record<string, any> = {};

  fields.forEach(field => {
    let fieldSchema;

    // Create base schema based on field type
    switch (field.type) {
      case FormFieldType.EMAIL:
        fieldSchema = string().email('validation.email.invalid');
        break;
      case FormFieldType.PASSWORD:
        fieldSchema = string().matches(
          /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
          'validation.password.requirements'
        );
        break;
      case FormFieldType.DATE:
        fieldSchema = date().typeError('validation.date.invalid');
        break;
      case FormFieldType.FILE:
        fieldSchema = object().test(
          'fileSize',
          'validation.file.size',
          value => !value || value.size <= 5000000
        );
        break;
      default:
        fieldSchema = string();
    }

    // Apply validation rules
    if (field.validation) {
      if (field.validation.required) {
        fieldSchema = fieldSchema.required(field.validation.errorMessage.key);
      }
      if (field.validation.minLength) {
        fieldSchema = fieldSchema.min(
          field.validation.minLength,
          { key: 'validation.minLength', values: { min: field.validation.minLength } }
        );
      }
      if (field.validation.maxLength) {
        fieldSchema = fieldSchema.max(
          field.validation.maxLength,
          { key: 'validation.maxLength', values: { max: field.validation.maxLength } }
        );
      }
      if (field.validation.pattern) {
        fieldSchema = fieldSchema.matches(
          field.validation.pattern,
          field.validation.errorMessage
        );
      }
      if (field.validation.validate) {
        fieldSchema = fieldSchema.test(
          'custom',
          field.validation.errorMessage.key,
          field.validation.validate
        );
      }
    }

    // Add accessibility validation
    fieldSchema = fieldSchema.test(
      'accessibility',
      'validation.accessibility',
      (value: any) => {
        if (field.validation.accessibilityRules.ariaRequired && !value) {
          return false;
        }
        return true;
      }
    );

    schemaFields[field.name] = fieldSchema;
  });

  const schema = object().shape(schemaFields);
  schemaCache.set(cacheKey, schema);
  return schema;
};

/**
 * Transforms form data before submission with enhanced type handling
 * and validation
 * @param formData - Raw form data
 * @param fields - Form field configurations
 * @param context - Validation context
 * @returns Transformed and validated form data
 */
export const transformFormData = (
  formData: Record<string, any>,
  fields: FormField[],
  context?: ValidationContext
): Record<string, any> => {
  const transformed = { ...formData };

  fields.forEach(field => {
    const value = transformed[field.name];
    if (value === undefined || value === null) return;

    switch (field.type) {
      case FormFieldType.DATE:
        transformed[field.name] = new Date(value);
        break;
      case FormFieldType.NUMBER:
        transformed[field.name] = Number(value);
        break;
      case FormFieldType.CHECKBOX:
        transformed[field.name] = Boolean(value);
        break;
      case FormFieldType.FILE:
        // Handle file transformations if needed
        break;
      default:
        transformed[field.name] = String(value).trim();
    }
  });

  return transformed;
};

/**
 * Extracts and formats field error message with accessibility
 * and localization support
 * @param fieldName - Name of the form field
 * @param errors - Form errors object
 * @returns Formatted error message with accessibility attributes
 */
export const getFieldError = (
  fieldName: string,
  errors: Record<string, LocalizedError>
): { message: string; ariaAttributes: Record<string, string> } | null => {
  const { t } = useTranslation();
  
  if (!errors || !errors[fieldName]) {
    return null;
  }

  const error = errors[fieldName];
  const message = t(error.key, error.params);

  return {
    message,
    ariaAttributes: {
      'aria-invalid': 'true',
      'aria-errormessage': `${fieldName}-error`,
      role: 'alert'
    }
  };
};

/**
 * Resets form fields to their initial values with accessibility
 * announcements
 * @param reset - Form reset function
 * @param defaultValues - Default form values
 * @param options - Reset options
 */
export const resetFormFields = (
  reset: (values?: Record<string, any>) => void,
  defaultValues?: Record<string, any>,
  options?: { 
    keepDirty?: boolean;
    keepErrors?: boolean;
    keepIsSubmitted?: boolean;
    keepTouched?: boolean;
    keepIsValid?: boolean;
    keepSubmitCount?: boolean;
  }
): void => {
  // Announce form reset to screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = 'Form has been reset';
  document.body.appendChild(announcement);

  // Reset form
  reset(defaultValues);

  // Remove announcement after it's been read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};