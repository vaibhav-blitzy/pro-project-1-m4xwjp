/**
 * Error Constants
 * Defines comprehensive error handling constants following RFC 7807 problem details specification
 * Provides granular error categorization with actionable messages for consistent error handling
 * @version 1.0.0
 */

import { ErrorResponse } from '../interfaces/common.interface';
import { HTTP_STATUS } from './api.constants';

/**
 * Granular error codes for different error scenarios
 * Range-based categorization:
 * - 4xxxxx: Client errors
 * - 5xxxxx: Server errors
 */
export enum ErrorCodes {
  // Server Errors (5xxxxx)
  INTERNAL_SERVER_ERROR = 500000,
  NETWORK_ERROR = 500002,

  // Client Errors (4xxxxx)
  BAD_REQUEST = 400000,
  VALIDATION_ERROR = 400001,
  
  // Authentication Errors (401xxx)
  UNAUTHORIZED = 401000,
  INVALID_CREDENTIALS = 401001,
  TOKEN_EXPIRED = 401002,
  
  // Authorization Errors (403xxx)
  FORBIDDEN = 403000,
  
  // Resource Errors (404xxx)
  NOT_FOUND = 404000,
  
  // Rate Limiting Errors (429xxx)
  RATE_LIMIT_EXCEEDED = 429001
}

/**
 * User-friendly, actionable error messages for each error code
 * Following best practices for error message clarity and user guidance
 */
export const ErrorMessages = {
  // Server Error Messages
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later or contact support if the issue persists.',
  [ErrorCodes.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection and try again.',
  
  // Client Error Messages
  [ErrorCodes.BAD_REQUEST]: 'The request cannot be processed. Please verify your input and try again.',
  [ErrorCodes.VALIDATION_ERROR]: 'One or more fields contain invalid data. Please review and correct the highlighted fields.',
  
  // Authentication Error Messages
  [ErrorCodes.UNAUTHORIZED]: 'Authentication required. Please log in to continue.',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Incorrect username or password. Please try again or reset your password.',
  [ErrorCodes.TOKEN_EXPIRED]: 'Your session has expired for security reasons. Please log in again to continue.',
  
  // Authorization Error Messages
  [ErrorCodes.FORBIDDEN]: "Access denied. You don't have permission to perform this action.",
  
  // Resource Error Messages
  [ErrorCodes.NOT_FOUND]: 'The requested resource could not be found. Please check the URL and try again.',
  
  // Rate Limiting Error Messages
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.'
} as const;

/**
 * Error type categorization for appropriate handling and display
 * Maps to different UI treatments and recovery strategies
 */
export enum ErrorTypes {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SERVER = 'server'
}

/**
 * Maps HTTP status codes to error types for consistent categorization
 */
const ERROR_TYPE_MAP: Record<number, ErrorTypes> = {
  [HTTP_STATUS.BAD_REQUEST]: ErrorTypes.VALIDATION,
  [HTTP_STATUS.UNAUTHORIZED]: ErrorTypes.AUTHENTICATION,
  [HTTP_STATUS.FORBIDDEN]: ErrorTypes.AUTHORIZATION,
  [HTTP_STATUS.NOT_FOUND]: ErrorTypes.VALIDATION,
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: ErrorTypes.SERVER
} as const;

/**
 * Maps error codes to their corresponding HTTP status codes
 */
const ERROR_STATUS_MAP: Record<ErrorCodes, number> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ErrorCodes.NETWORK_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ErrorCodes.BAD_REQUEST]: HTTP_STATUS.BAD_REQUEST,
  [ErrorCodes.VALIDATION_ERROR]: HTTP_STATUS.BAD_REQUEST,
  [ErrorCodes.UNAUTHORIZED]: HTTP_STATUS.UNAUTHORIZED,
  [ErrorCodes.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
  [ErrorCodes.TOKEN_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
  [ErrorCodes.FORBIDDEN]: HTTP_STATUS.FORBIDDEN,
  [ErrorCodes.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: HTTP_STATUS.TOO_MANY_REQUESTS
} as const;

// Ensure objects are readonly at compile time
Object.freeze(ErrorMessages);
Object.freeze(ERROR_TYPE_MAP);
Object.freeze(ERROR_STATUS_MAP);