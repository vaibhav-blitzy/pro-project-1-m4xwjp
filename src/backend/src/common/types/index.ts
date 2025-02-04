/**
 * @packageDocumentation
 * @module Common/Types
 * @version 1.0.0
 * 
 * Centralized TypeScript type definitions for the Task Management System.
 * Provides common types, interfaces, and type guards used across the microservices architecture.
 */

import { Request, Response } from 'express'; // v4.18.2
import { ServiceResponse, PaginationParams } from '../interfaces/base-service.interface';

/**
 * HTTP status codes used across the application.
 * Provides type-safe status code constants.
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Generic API response type for consistent response formatting.
 * Wraps all API responses to ensure standardized structure.
 * 
 * @typeParam T - Type of the response data payload
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
  error?: Error | null;
  timestamp?: string;
};

/**
 * Sort order type for query operations.
 * Used in conjunction with PaginationParams for list endpoints.
 */
export type SortOrder = 'ASC' | 'DESC';

/**
 * Paginated response type for list endpoints.
 * Provides standardized pagination metadata along with the data payload.
 * 
 * @typeParam T - Type of items being paginated
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Validation error type for request validation failures.
 * Used to provide detailed validation error information.
 */
export type ValidationError = {
  field: string;
  message: string;
  code?: string;
};

/**
 * Enhanced Express Request type with common extensions.
 * Adds type safety for common request properties.
 */
export type EnhancedRequest<T = unknown> = Request & {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  body: T;
};

/**
 * Enhanced Express Response type with utility methods.
 * Adds type safety for response methods.
 */
export type EnhancedResponse<T = unknown> = Response & {
  sendSuccess(data: T, message?: string): void;
  sendError(error: Error | string, status?: HttpStatus): void;
};

/**
 * Service layer error types for categorizing errors.
 * Used for consistent error handling across services.
 */
export type ServiceErrorType = 
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'DEPENDENCY_ERROR';

/**
 * Type guard to check if a value is a ValidationError
 * 
 * @param value - Value to check
 * @returns Type predicate for ValidationError
 */
export const isValidationError = (value: unknown): value is ValidationError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    'message' in value &&
    typeof (value as ValidationError).field === 'string' &&
    typeof (value as ValidationError).message === 'string'
  );
};

/**
 * Type guard to check if a value is a PaginatedResponse
 * 
 * @param value - Value to check
 * @returns Type predicate for PaginatedResponse
 */
export const isPaginatedResponse = <T>(value: unknown): value is PaginatedResponse<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'total' in value &&
    'page' in value &&
    'limit' in value &&
    Array.isArray((value as PaginatedResponse<T>).items)
  );
};

/**
 * Re-export common service layer types for convenience
 */
export type { ServiceResponse, PaginationParams };