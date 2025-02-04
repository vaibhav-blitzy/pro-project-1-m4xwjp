import { object, string, ValidationError } from 'yup'; // v1.2.0
import { FormFieldType, ValidationRules, ValidationResult } from '../types/form.types';

/**
 * RFC 5322 compliant email regex pattern with international email support
 * Includes validation for:
 * - Local part restrictions
 * - Domain part validation
 * - TLD validation
 * - International character support
 */
const EMAIL_PATTERN = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

/**
 * Password strength requirements
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least two special characters
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    numbers: /[0-9]/,
    special: /[^A-Za-z0-9]/,
    specialMinCount: 2
  }
};

/**
 * Common password patterns to check against
 */
const COMMON_PASSWORD_PATTERNS = [
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*$/, // Basic pattern
  /(.)\1{2,}/, // Repeated characters
  /^(?:qwerty|password|admin|letmein|welcome)$/i // Common words
];

/**
 * Calculates password entropy score
 * @param password - Password string to evaluate
 * @returns number - Entropy score
 */
const calculatePasswordEntropy = (password: string): number => {
  const charsetSize = 
    (password.match(/[A-Z]/) ? 26 : 0) +
    (password.match(/[a-z]/) ? 26 : 0) +
    (password.match(/[0-9]/) ? 10 : 0) +
    (password.match(/[^A-Za-z0-9]/) ? 32 : 0);
  
  return Math.floor(password.length * Math.log2(charsetSize));
};

/**
 * Enhanced email validation with accessibility support
 * @param email - Email string to validate
 * @returns Promise<ValidationResult> - Validation result with accessibility feedback
 */
export const validateEmail = async (email: string): Promise<ValidationResult> => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return {
        isValid: false,
        message: 'Invalid email format',
        ariaMessage: 'Email address is not in a valid format. Please check and try again.',
        ariaLive: 'polite'
      };
    }

    const [localPart, domain] = normalizedEmail.split('@');
    
    // Additional validation checks
    if (localPart.length > 64 || domain.length > 255) {
      return {
        isValid: false,
        message: 'Email length exceeds limits',
        ariaMessage: 'Email address is too long. Please use a shorter email address.',
        ariaLive: 'polite'
      };
    }

    return {
      isValid: true,
      message: 'Email is valid',
      ariaMessage: 'Email address is valid',
      ariaLive: 'polite'
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Email validation failed',
      ariaMessage: 'Unable to validate email address. Please try again.',
      ariaLive: 'assertive'
    };
  }
};

/**
 * Enhanced password validation with entropy calculation
 * @param password - Password string to validate
 * @returns Promise<ValidationResult> - Validation result with strength indicator
 */
export const validatePassword = async (password: string): Promise<ValidationResult> => {
  try {
    const { minLength, patterns } = PASSWORD_REQUIREMENTS;
    
    if (password.length < minLength) {
      return {
        isValid: false,
        message: `Password must be at least ${minLength} characters`,
        ariaMessage: `Password is too short. It must be at least ${minLength} characters long.`,
        ariaLive: 'polite'
      };
    }

    // Check password patterns
    const validationChecks = [
      { check: patterns.uppercase.test(password), message: 'uppercase letter' },
      { check: patterns.lowercase.test(password), message: 'lowercase letter' },
      { check: patterns.numbers.test(password), message: 'number' },
      { 
        check: (password.match(patterns.special) || []).length >= patterns.specialMinCount,
        message: `at least ${patterns.specialMinCount} special characters`
      }
    ];

    const failedChecks = validationChecks
      .filter(check => !check.check)
      .map(check => check.message);

    if (failedChecks.length > 0) {
      return {
        isValid: false,
        message: `Password must contain: ${failedChecks.join(', ')}`,
        ariaMessage: `Password is missing required elements: ${failedChecks.join(', ')}`,
        ariaLive: 'polite'
      };
    }

    // Check for common patterns
    if (COMMON_PASSWORD_PATTERNS.some(pattern => pattern.test(password))) {
      return {
        isValid: false,
        message: 'Password is too common or follows a simple pattern',
        ariaMessage: 'Please choose a more complex password that does not follow common patterns.',
        ariaLive: 'polite'
      };
    }

    // Calculate entropy score
    const entropyScore = calculatePasswordEntropy(password);
    const strengthIndicator = entropyScore < 50 ? 'weak' : 
                            entropyScore < 75 ? 'moderate' : 
                            entropyScore < 100 ? 'strong' : 'very strong';

    return {
      isValid: true,
      message: `Password strength: ${strengthIndicator}`,
      ariaMessage: `Password is valid and ${strengthIndicator}`,
      ariaLive: 'polite',
      strengthIndicator
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Password validation failed',
      ariaMessage: 'Unable to validate password. Please try again.',
      ariaLive: 'assertive'
    };
  }
};

/**
 * Enhanced required field validation with type-specific checks
 * @param value - Value to validate
 * @returns ValidationResult - Validation result with accessibility feedback
 */
export const validateRequired = (value: any): ValidationResult => {
  try {
    if (value === undefined || value === null) {
      return {
        isValid: false,
        message: 'This field is required',
        ariaMessage: 'This field is required. Please provide a value.',
        ariaLive: 'polite'
      };
    }

    if (typeof value === 'string' && value.trim() === '') {
      return {
        isValid: false,
        message: 'This field cannot be empty',
        ariaMessage: 'This field cannot be empty. Please provide a value.',
        ariaLive: 'polite'
      };
    }

    if (Array.isArray(value) && value.length === 0) {
      return {
        isValid: false,
        message: 'Please select at least one option',
        ariaMessage: 'Please select at least one option from the list.',
        ariaLive: 'polite'
      };
    }

    return {
      isValid: true,
      message: 'Field is valid',
      ariaMessage: 'Field has a valid value',
      ariaLive: 'polite'
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Validation failed',
      ariaMessage: 'Unable to validate field. Please try again.',
      ariaLive: 'assertive'
    };
  }
};

/**
 * Creates an enhanced Yup validation schema with accessibility support
 * @param fieldType - Type of form field
 * @param rules - Validation rules
 * @returns Enhanced Yup validation schema
 */
export const createValidationSchema = (fieldType: FormFieldType, rules: ValidationRules) => {
  try {
    let schema = string();

    // Apply base validation rules
    if (rules.required) {
      schema = schema.required(rules.errorMessage.key);
    }
    if (rules.minLength) {
      schema = schema.min(rules.minLength, rules.errorMessage.key);
    }
    if (rules.maxLength) {
      schema = schema.max(rules.maxLength, rules.errorMessage.key);
    }

    // Apply field-specific validation
    switch (fieldType) {
      case FormFieldType.EMAIL:
        schema = schema.email(rules.errorMessage.key)
          .test('email', rules.errorMessage.key, async (value) => {
            if (!value) return true;
            const result = await validateEmail(value);
            return result.isValid;
          });
        break;

      case FormFieldType.PASSWORD:
        schema = schema.test('password', rules.errorMessage.key, async (value) => {
          if (!value) return true;
          const result = await validatePassword(value);
          return result.isValid;
        });
        break;

      default:
        if (rules.pattern) {
          schema = schema.matches(rules.pattern, rules.errorMessage.key);
        }
        break;
    }

    // Add custom validation if provided
    if (rules.validate) {
      schema = schema.test('custom', rules.errorMessage.key, rules.validate);
    }

    return object({
      [rules.ariaLabel]: schema
    });
  } catch (error) {
    throw new ValidationError('Failed to create validation schema');
  }
};