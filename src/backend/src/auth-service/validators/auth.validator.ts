/**
 * @file Authentication request validator implementing comprehensive validation rules
 * Uses Joi for schema validation with enhanced security requirements
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.2
import { validateInput } from '../../common/utils/validation.util';
import { IAuthCredentials } from '../interfaces/auth.interface';
import { ValidationError } from '../../common/utils/validation.util';

/**
 * Enhanced password validation regex enforcing security requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Common password validation messages
 */
const PASSWORD_MESSAGES = {
  'string.min': 'Password must be at least 8 characters long',
  'string.max': 'Password must not exceed 100 characters',
  'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  'any.required': 'Password is required'
};

/**
 * Login credentials validation schema
 * Enforces email format and basic password requirements
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .max(255)
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must not exceed 255 characters'
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages(PASSWORD_MESSAGES),
  mfaToken: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .optional()
    .messages({
      'string.length': 'MFA token must be 6 digits',
      'string.pattern.base': 'MFA token must contain only numbers'
    })
});

/**
 * Registration data validation schema
 * Implements comprehensive password validation and user data requirements
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .max(255)
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must not exceed 255 characters'
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(PASSWORD_REGEX)
    .required()
    .messages(PASSWORD_MESSAGES),
  name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'string.empty': 'Name is required'
    })
});

/**
 * Validates login credentials with enhanced security checks
 * Implements RFC 7807 problem details for validation errors
 * 
 * @param credentials - Login credentials to validate
 * @returns Validation result with detailed error messages
 */
export async function validateLoginCredentials(
  credentials: IAuthCredentials
): Promise<{ isValid: boolean; errors?: ValidationError }> {
  return validateInput(credentials, loginSchema, {
    abortEarly: false,
    stripUnknown: true
  });
}

/**
 * Validates registration data with comprehensive validation rules
 * Implements password complexity validation and data sanitization
 * 
 * @param data - Registration data to validate
 * @returns Validation result with detailed error messages
 */
export async function validateRegistrationData(
  data: Omit<IAuthCredentials, 'mfaToken'> & { name: string }
): Promise<{ isValid: boolean; errors?: ValidationError }> {
  return validateInput(data, registerSchema, {
    abortEarly: false,
    stripUnknown: true,
    sanitize: true
  });
}

/**
 * Validates password reset token
 * Implements secure token validation rules
 * 
 * @param token - Reset token to validate
 * @returns Validation result
 */
export async function validatePasswordResetToken(
  token: string
): Promise<{ isValid: boolean; errors?: ValidationError }> {
  const resetTokenSchema = Joi.object({
    token: Joi.string()
      .required()
      .length(64)
      .pattern(/^[a-f0-9]+$/)
      .messages({
        'string.length': 'Invalid reset token',
        'string.pattern.base': 'Invalid reset token format'
      })
  });

  return validateInput({ token }, resetTokenSchema);
}

/**
 * Validates MFA token
 * Implements secure MFA token validation rules
 * 
 * @param token - MFA token to validate
 * @returns Validation result
 */
export async function validateMfaToken(
  token: string
): Promise<{ isValid: boolean; errors?: ValidationError }> {
  const mfaTokenSchema = Joi.object({
    token: Joi.string()
      .required()
      .length(6)
      .pattern(/^[0-9]+$/)
      .messages({
        'string.length': 'MFA token must be 6 digits',
        'string.pattern.base': 'MFA token must contain only numbers'
      })
  });

  return validateInput({ token }, mfaTokenSchema);
}