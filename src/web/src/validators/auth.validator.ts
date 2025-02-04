/**
 * @fileoverview Authentication form validation schemas and rules using Yup
 * Implements comprehensive validation for login, registration, SSO, and MFA
 * with internationalized error messages and security-focused rules
 * @version 1.0.0
 */

import { object, string } from 'yup'; // v1.2.0
import { AuthCredentials } from '../interfaces/auth.interface';
import { FormField } from '../types/form.types';
import { ErrorMessages } from '../constants/error.constants';

// Regular expressions for enhanced security validation
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MFA_CODE_PATTERN = /^\d{6}$/;

/**
 * Enhanced Yup validation schema for login form with SSO support
 * Implements strict validation rules with security focus
 */
export const loginSchema = object({
  email: string()
    .required('Email is required')
    .matches(EMAIL_PATTERN, 'Invalid email format')
    .email('Invalid email address')
    .trim()
    .lowercase(),
  
  password: string()
    .when('ssoProvider', {
      is: (val: string | null) => !val,
      then: string()
        .required('Password is required')
        .matches(
          PASSWORD_PATTERN,
          'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character'
        )
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
    }),
  
  ssoProvider: string()
    .nullable()
    .oneOf(['google', 'microsoft', null], 'Invalid SSO provider')
}).strict();

/**
 * MFA code validation schema with enhanced security rules
 * Prevents sequential and repeated digits for better security
 */
export const mfaCodeSchema = object({
  code: string()
    .required('MFA code is required')
    .matches(MFA_CODE_PATTERN, 'MFA code must be 6 digits')
    .test('no-sequential', 'MFA code cannot contain sequential numbers', 
      value => {
        if (!value) return true;
        for (let i = 0; i < value.length - 2; i++) {
          const current = parseInt(value[i]);
          const next = parseInt(value[i + 1]);
          const nextNext = parseInt(value[i + 2]);
          if (next === current + 1 && nextNext === next + 1) return false;
        }
        return true;
      })
    .test('no-repeating', 'MFA code cannot contain repeated numbers',
      value => {
        if (!value) return true;
        return !/(\d)\1{2,}/.test(value);
      })
}).strict();

/**
 * Validates login form data with enhanced security checks
 * @param credentials Login credentials to validate
 * @throws ValidationError with RFC 7807 compliant details if validation fails
 */
export async function validateLoginForm(credentials: AuthCredentials): Promise<void> {
  try {
    await loginSchema.validate(credentials, {
      abortEarly: false,
      stripUnknown: true
    });
  } catch (error) {
    throw {
      type: 'validation',
      title: 'Validation Error',
      status: 400,
      detail: error.message,
      errors: error.errors,
      instance: '/auth/login'
    };
  }
}

/**
 * Validates SSO provider selection and authentication flow
 * @param provider SSO provider identifier
 * @throws ValidationError if provider is invalid
 */
export async function validateSSOProvider(provider: string): Promise<void> {
  try {
    await string()
      .required('SSO provider is required')
      .oneOf(['google', 'microsoft'], 'Invalid SSO provider')
      .validate(provider);
  } catch (error) {
    throw {
      type: 'validation',
      title: 'Invalid SSO Provider',
      status: 400,
      detail: error.message,
      instance: '/auth/sso'
    };
  }
}

/**
 * Validates MFA verification code with security enhancements
 * @param code MFA verification code
 * @throws ValidationError if code is invalid
 */
export async function validateMFACode(code: string): Promise<void> {
  try {
    await mfaCodeSchema.validate({ code }, {
      abortEarly: false,
      stripUnknown: true
    });
  } catch (error) {
    throw {
      type: 'validation',
      title: 'Invalid MFA Code',
      status: 400,
      detail: error.message,
      instance: '/auth/mfa/verify'
    };
  }
}

/**
 * Form field configurations with accessibility support
 */
export const authFormFields: Record<string, FormField> = {
  email: {
    name: 'email',
    type: 'email',
    validation: {
      required: true,
      pattern: EMAIL_PATTERN,
      errorMessage: { key: 'VALIDATION_ERROR', params: {} }
    },
    ariaLabel: 'Email input field'
  },
  password: {
    name: 'password',
    type: 'password',
    validation: {
      required: true,
      pattern: PASSWORD_PATTERN,
      errorMessage: { key: 'INVALID_CREDENTIALS', params: {} }
    },
    ariaLabel: 'Password input field'
  },
  mfaCode: {
    name: 'mfaCode',
    type: 'text',
    validation: {
      required: true,
      pattern: MFA_CODE_PATTERN,
      errorMessage: { key: 'INVALID_MFA_CODE', params: {} }
    },
    ariaLabel: 'MFA code input field'
  }
};