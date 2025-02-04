/**
 * @fileoverview API utility functions for standardized request/response handling
 * Implements HAL+JSON format and RFC 7807 problem details
 * @version 1.0.0
 */

import { AxiosError } from 'axios'; // v1.4.0
import { ApiResponse, ApiError } from '../types/api.types';
import { HTTP_STATUS } from '../constants/api.constants';

/**
 * Security-sensitive data patterns to filter from responses
 */
const SENSITIVE_DATA_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
] as const;

/**
 * Base URI for problem type references in RFC 7807 errors
 */
const PROBLEM_TYPE_BASE_URI = 'https://api.taskmanager.com/problems';

/**
 * Transforms raw API response into standardized HAL+JSON format
 * Implements security filtering and response validation
 * @template T Type of response data
 * @param response Raw API response
 * @returns Standardized HAL+JSON response
 */
export function transformResponse<T>(response: any): ApiResponse<T> {
  // Validate response structure
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response structure');
  }

  // Extract core response properties
  const {
    data,
    status = HTTP_STATUS.OK,
    message = 'Success',
    _links = {},
    etag = null
  } = response;

  // Filter sensitive information
  const sanitizedData = filterSensitiveData(data);

  // Construct HAL+JSON compliant response
  const apiResponse: ApiResponse<T> = {
    data: sanitizedData,
    status,
    message,
    error: null,
    _links: {
      self: { href: window.location.href },
      ...(_links || {})
    },
    etag
  };

  // Validate response before returning
  validateApiResponse(apiResponse);

  return apiResponse;
}

/**
 * Transforms API errors into RFC 7807 problem details format
 * Implements comprehensive error context and security filtering
 * @param error AxiosError instance
 * @returns RFC 7807 compliant error response
 */
export function transformError(error: AxiosError): ApiError {
  // Handle network connectivity issues
  if (!error.response) {
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: 'NETWORK_ERROR',
      message: 'Network connection error',
      details: null,
      type: `${PROBLEM_TYPE_BASE_URI}/network-error`,
      title: 'Network Error',
      instance: null
    };
  }

  const { response } = error;
  const status = response.status;
  
  // Extract error details with fallbacks
  const errorData = response.data || {};
  const code = errorData.code || `ERROR_${status}`;
  const message = errorData.message || error.message || 'An error occurred';
  
  // Filter sensitive information from error details
  const sanitizedDetails = filterSensitiveData(errorData.details || null);

  // Construct RFC 7807 compliant error
  return {
    status,
    code,
    message,
    details: sanitizedDetails,
    type: `${PROBLEM_TYPE_BASE_URI}/${code.toLowerCase()}`,
    title: getErrorTitle(status),
    instance: response.config?.url || null
  };
}

/**
 * Validates if HTTP status code indicates successful operation
 * @param status HTTP status code
 * @returns True if status is in success range (200-299)
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Validates if HTTP status code indicates client error
 * @param status HTTP status code
 * @returns True if status is in client error range (400-499)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Validates if HTTP status code indicates server error
 * @param status HTTP status code
 * @returns True if status is in server error range (500-599)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Recursively filters sensitive information from response data
 * @param data Data to filter
 * @returns Filtered data without sensitive information
 */
function filterSensitiveData(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item));
  }

  if (typeof data === 'object') {
    return Object.keys(data).reduce((filtered, key) => {
      // Skip sensitive keys
      if (SENSITIVE_DATA_PATTERNS.some(pattern => pattern.test(key))) {
        return filtered;
      }
      
      filtered[key] = filterSensitiveData(data[key]);
      return filtered;
    }, {} as Record<string, any>);
  }

  return data;
}

/**
 * Validates ApiResponse structure and content
 * @param response API response to validate
 * @throws Error if response is invalid
 */
function validateApiResponse<T>(response: ApiResponse<T>): void {
  if (!response.status || typeof response.status !== 'number') {
    throw new Error('Invalid response status');
  }

  if (!response._links || typeof response._links !== 'object') {
    throw new Error('Invalid HAL+JSON links');
  }

  if (response.error !== null && typeof response.error !== 'string') {
    throw new Error('Invalid error format');
  }
}

/**
 * Maps HTTP status codes to human-readable error titles
 * @param status HTTP status code
 * @returns Human-readable error title
 */
function getErrorTitle(status: number): string {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'Invalid Request';
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication Required';
    case HTTP_STATUS.FORBIDDEN:
      return 'Access Denied';
    case HTTP_STATUS.NOT_FOUND:
      return 'Resource Not Found';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'Server Error';
    default:
      return 'Unknown Error';
  }
}