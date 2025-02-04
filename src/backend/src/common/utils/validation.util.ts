/**
 * @file Centralized validation utility for standardized input validation and sanitization
 * Implements RFC 7807 problem details for validation error responses
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.2
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { ErrorCodes, ErrorMessages } from '../constants/error-codes';
import Logger from './logger.util';

/**
 * RFC 7807 compliant interface for validation error details
 */
export interface ValidationError {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors: Record<string, string[]>;
  debug?: {
    context?: Record<string, any>;
    constraints?: Record<string, any>;
    value?: any;
  };
}

/**
 * Extended interface for validation configuration options
 */
export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  sanitize?: boolean;
  sanitizeOptions?: sanitizeHtml.IOptions;
}

/**
 * Default sanitization options following security best practices
 */
const DEFAULT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  parseStyleAttributes: false,
  allowedStyles: {},
  selfClosing: [],
  enforceHtmlBoundary: true
};

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
  sanitize: true,
  sanitizeOptions: DEFAULT_SANITIZE_OPTIONS
};

/**
 * Validates input data against a schema with optional sanitization
 * @param data - Input data to validate
 * @param schema - Joi validation schema
 * @param options - Validation and sanitization options
 * @returns Validation result with sanitized data or detailed errors
 */
export async function validateInput(
  data: any,
  schema: Joi.Schema,
  options: ValidationOptions = {}
): Promise<{ isValid: boolean; errors?: ValidationError; data?: any }> {
  try {
    const validationOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    
    // Validate input against schema
    const result = await schema.validateAsync(data, {
      abortEarly: validationOptions.abortEarly,
      stripUnknown: validationOptions.stripUnknown
    });

    // Sanitize validated data if enabled
    const sanitizedData = validationOptions.sanitize 
      ? sanitizeData(result, validationOptions.sanitizeOptions)
      : result;

    Logger.debug('Validation successful', { 
      originalData: data,
      sanitizedData
    });

    return {
      isValid: true,
      data: sanitizedData
    };
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      const validationError = formatValidationError(error, options);
      
      Logger.error('Validation failed', error, {
        error: validationError,
        input: data
      });

      return {
        isValid: false,
        errors: validationError
      };
    }
    throw error;
  }
}

/**
 * Recursively sanitizes data to prevent XSS attacks
 * @param data - Data to sanitize
 * @param options - Sanitization options
 * @returns Sanitized data structure
 */
export function sanitizeData(
  data: any,
  options: sanitizeHtml.IOptions = DEFAULT_SANITIZE_OPTIONS
): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeHtml(data, options);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, options));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value, options);
    }
    return sanitized;
  }

  // Return primitive values as is
  return data;
}

/**
 * Formats validation errors according to RFC 7807 with debug information
 * @param error - Joi validation error
 * @param options - Validation options
 * @returns Formatted validation error with debug information
 */
function formatValidationError(
  error: Joi.ValidationError,
  options: ValidationOptions
): ValidationError {
  const errors: Record<string, string[]> = {};

  // Group errors by field
  error.details.forEach(detail => {
    const field = detail.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(detail.message);
  });

  const validationError: ValidationError = {
    type: 'https://api.taskmanager.com/errors/validation',
    title: ErrorMessages[ErrorCodes.VALIDATION_ERROR],
    status: 400,
    detail: 'The provided input failed validation requirements',
    errors,
    debug: process.env.NODE_ENV !== 'production' ? {
      context: error.details.map(detail => detail.context),
      constraints: error.details.map(detail => ({
        type: detail.type,
        constraint: detail.context
      })),
      value: error._original
    } : undefined
  };

  return validationError;
}

/**
 * Creates a validation error response
 * @param message - Error message
 * @param errors - Validation errors by field
 * @returns Formatted validation error
 */
export function createValidationError(
  message: string,
  errors: Record<string, string[]>
): ValidationError {
  return {
    type: 'https://api.taskmanager.com/errors/validation',
    title: ErrorMessages[ErrorCodes.VALIDATION_ERROR],
    status: 400,
    detail: message,
    errors
  };
}