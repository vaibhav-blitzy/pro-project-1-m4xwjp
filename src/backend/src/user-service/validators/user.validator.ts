/**
 * @file User validation schemas and rules implementation
 * @version 1.0.0
 * 
 * Implements comprehensive validation schemas for user-related operations
 * with enhanced security measures and RFC 7807 error handling.
 */

import Joi from 'joi'; // v17.9.2
import { validateInput, ValidationError, SanitizationOptions } from '../../common/utils/validation.util';
import { UserRole } from '../interfaces/user.interface';

// Password complexity requirements following OWASP guidelines
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Enhanced sanitization options for user input
const USER_SANITIZATION_OPTIONS: SanitizationOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true
};

/**
 * Schema for user creation with comprehensive validation rules
 */
const createUserSchema = Joi.object({
  email: Joi.string()
    .required()
    .pattern(EMAIL_REGEX)
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.pattern.base': 'Email must be a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must not exceed 255 characters'
    }),

  name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s-']+$/)
    .messages({
      'string.pattern.base': 'Name must contain only letters, numbers, spaces, hyphens and apostrophes',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),

  password: Joi.string()
    .required()
    .pattern(PASSWORD_REGEX)
    .messages({
      'string.pattern.base': 'Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
      'string.empty': 'Password is required'
    }),

  role: Joi.string()
    .required()
    .valid(...Object.values(UserRole))
    .messages({
      'any.only': 'Invalid user role specified',
      'any.required': 'User role is required'
    }),

  preferences: Joi.object({
    emailNotifications: Joi.boolean().default(true),
    timezone: Joi.string().default('UTC'),
    language: Joi.string().default('en'),
    themeSettings: Joi.object({
      mode: Joi.string().valid('light', 'dark').default('light'),
      primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#1976d2'),
      fontSize: Joi.number().min(12).max(24).default(16)
    }).default(),
    dashboardLayout: Joi.object({
      widgets: Joi.array().items(Joi.string()).default([]),
      layout: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          x: Joi.number().required(),
          y: Joi.number().required(),
          w: Joi.number().required(),
          h: Joi.number().required()
        })
      ).default({})
    }).default()
  }).default()
});

/**
 * Schema for user updates with partial validation
 */
const updateUserSchema = Joi.object({
  email: Joi.string()
    .pattern(EMAIL_REGEX)
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.pattern.base': 'Email must be a valid email address',
      'string.max': 'Email must not exceed 255 characters'
    }),

  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s-']+$/)
    .messages({
      'string.pattern.base': 'Name must contain only letters, numbers, spaces, hyphens and apostrophes',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .messages({
      'any.only': 'Invalid user role specified'
    }),

  preferences: Joi.object({
    emailNotifications: Joi.boolean(),
    timezone: Joi.string(),
    language: Joi.string(),
    themeSettings: Joi.object({
      mode: Joi.string().valid('light', 'dark'),
      primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      fontSize: Joi.number().min(12).max(24)
    }),
    dashboardLayout: Joi.object({
      widgets: Joi.array().items(Joi.string()),
      layout: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          x: Joi.number().required(),
          y: Joi.number().required(),
          w: Joi.number().required(),
          h: Joi.number().required()
        })
      )
    })
  })
}).min(1);

/**
 * Schema for password change validation
 */
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),

  newPassword: Joi.string()
    .required()
    .pattern(PASSWORD_REGEX)
    .disallow(Joi.ref('currentPassword'))
    .messages({
      'string.pattern.base': 'New password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
      'string.empty': 'New password is required',
      'any.invalid': 'New password must be different from current password'
    })
});

/**
 * Validates user creation data with enhanced security checks
 * @param userData - User creation request data
 * @returns Validation result with sanitized data or RFC 7807 formatted errors
 */
export async function validateCreateUser(userData: any): Promise<{ isValid: boolean; errors?: ValidationError; data?: any }> {
  return validateInput(userData, createUserSchema, {
    sanitize: true,
    sanitizeOptions: USER_SANITIZATION_OPTIONS,
    abortEarly: false
  });
}

/**
 * Validates user update data with enhanced security measures
 * @param updateData - User update request data
 * @returns Validation result with sanitized data or RFC 7807 formatted errors
 */
export async function validateUpdateUser(updateData: any): Promise<{ isValid: boolean; errors?: ValidationError; data?: any }> {
  return validateInput(updateData, updateUserSchema, {
    sanitize: true,
    sanitizeOptions: USER_SANITIZATION_OPTIONS,
    abortEarly: false
  });
}

/**
 * Validates password change request with enhanced security checks
 * @param passwordData - Password change request data
 * @returns Validation result with RFC 7807 formatted errors
 */
export async function validatePasswordChange(passwordData: any): Promise<{ isValid: boolean; errors?: ValidationError; data?: any }> {
  return validateInput(passwordData, passwordChangeSchema, {
    sanitize: false,
    abortEarly: false
  });
}