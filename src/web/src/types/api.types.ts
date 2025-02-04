/**
 * @fileoverview TypeScript type definitions for standardized API communication
 * Implements HAL+JSON format, RFC 7807 error handling, and caching support
 * @version 1.0.0
 */

/**
 * Generic interface for all API responses following HAL+JSON format
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** The main response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Human-readable message */
  message: string;
  /** Error message if present */
  error: string | null;
  /** HAL+JSON hypermedia links */
  _links: Record<string, any>;
  /** ETag for cache validation */
  etag: string | null;
}

/**
 * RFC 7807 compliant interface for API error responses
 * @see https://tools.ietf.org/html/rfc7807
 */
export interface ApiError {
  /** HTTP status code */
  status: number;
  /** Application-specific error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details: Record<string, any> | null;
  /** A URI reference that identifies the problem type */
  type: string;
  /** A short, human-readable summary of the problem type */
  title: string;
  /** A URI reference that identifies the specific occurrence of the problem */
  instance: string | null;
}

/**
 * Generic interface for paginated API responses with HAL+JSON links
 * @template T The type of items in the paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMetadata;
  /** HAL+JSON navigation links */
  _links: Record<string, string>;
}

/**
 * Comprehensive interface for pagination metadata and navigation
 */
export interface PaginationMetadata {
  /** Current page number (1-based) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Whether there is a previous page available */
  hasPreviousPage: boolean;
  /** Index of the first item on the current page */
  firstItemIndex: number;
  /** Index of the last item on the current page */
  lastItemIndex: number;
}

/**
 * Interface for API request configuration supporting compression and caching
 */
export interface ApiRequestConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Default headers to be sent with every request */
  headers: Record<string, string>;
  /** Whether to send credentials with cross-origin requests */
  withCredentials: boolean;
  /** Whether to enable Gzip compression */
  useCompression: boolean;
  /** Whether to enable ETag caching */
  useCache: boolean;
  /** ETag for cache validation */
  etag: string | null;
  /** Additional custom headers */
  customHeaders: Record<string, string>;
}

/**
 * Type guard to check if a response is paginated
 * @param response The API response to check
 * @returns True if the response is paginated
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<T> | PaginatedResponse<T>
): response is PaginatedResponse<T> {
  return 'pagination' in response;
}

/**
 * Type guard to check if a response is an error
 * @param response The response to check
 * @returns True if the response is an error
 */
export function isApiError(
  response: ApiResponse<any> | ApiError
): response is ApiError {
  return 'type' in response && 'title' in response;
}