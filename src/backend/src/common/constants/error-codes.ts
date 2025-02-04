/**
 * @file Error codes and utilities for standardized error handling
 * Implements RFC 7807 Problem Details specification for API error responses
 * @version 1.0.0
 */

/**
 * RFC 7807 Problem Details interface for standardized error responses
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errorCode: number;
}

/**
 * Interface defining valid error code ranges
 */
export interface ErrorCodeRange {
  min: number;
  max: number;
}

/**
 * Enumeration of all possible error codes in the application
 */
export enum ErrorCodes {
  // Server Errors (5xxxxx)
  INTERNAL_SERVER_ERROR = 500000,
  DATABASE_ERROR = 500001,
  NETWORK_ERROR = 500002,
  EXTERNAL_SERVICE_ERROR = 500003,

  // Client Errors (4xxxxx)
  BAD_REQUEST = 400000,
  VALIDATION_ERROR = 400001,
  
  UNAUTHORIZED = 401000,
  INVALID_CREDENTIALS = 401001,
  TOKEN_EXPIRED = 401002,
  
  FORBIDDEN = 403000,
  INSUFFICIENT_PERMISSIONS = 403001,
  
  NOT_FOUND = 404000,
  RESOURCE_NOT_FOUND = 404001,
  
  DUPLICATE_ENTRY = 409001,
  
  RATE_LIMIT_EXCEEDED = 429001,
}

/**
 * Standardized error messages corresponding to error codes
 */
export const ErrorMessages = {
  // Server Errors
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [ErrorCodes.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCodes.NETWORK_ERROR]: 'Network communication error',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service unavailable',

  // Client Errors
  [ErrorCodes.BAD_REQUEST]: 'Invalid request parameters',
  [ErrorCodes.VALIDATION_ERROR]: 'Validation failed',
  
  [ErrorCodes.UNAUTHORIZED]: 'Authentication required',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ErrorCodes.TOKEN_EXPIRED]: 'Authentication token has expired',
  
  [ErrorCodes.FORBIDDEN]: 'Access denied',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to perform this action',
  
  [ErrorCodes.NOT_FOUND]: 'Resource not found',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  
  [ErrorCodes.DUPLICATE_ENTRY]: 'Resource already exists',
  
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests',
} as const;

/**
 * HTTP status codes mapped to error categories
 */
export const HttpStatusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Defines valid ranges for different error code categories
 */
export const ErrorCodeRanges: Record<string, ErrorCodeRange> = {
  CLIENT_ERRORS: { min: 400000, max: 499999 },
  SERVER_ERRORS: { min: 500000, max: 599999 },
} as const;

/**
 * Type guard to validate if a number is a valid error code
 * @param code - The error code to validate
 * @returns boolean indicating if the code is valid
 */
export function isValidErrorCode(code: number): boolean {
  if (typeof code !== 'number') return false;
  
  return Object.values(ErrorCodeRanges).some(
    range => code >= range.min && code <= range.max
  );
}

/**
 * Maps an error code to its corresponding HTTP status code
 * @param errorCode - The error code to map
 * @returns corresponding HTTP status code
 */
export function getHttpStatus(errorCode: number): number {
  // Extract the first 3 digits of the error code
  const statusCode = Math.floor(errorCode / 1000);
  
  // Return the corresponding HTTP status code or 500 if not found
  return Object.values(HttpStatusCodes).includes(statusCode)
    ? statusCode
    : HttpStatusCodes.INTERNAL_SERVER_ERROR;
}