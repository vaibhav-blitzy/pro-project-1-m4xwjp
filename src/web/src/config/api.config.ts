/**
 * API Configuration
 * Configures API client settings and default configurations for making HTTP requests
 * Implements API Architecture and Interface Specifications from Technical Specifications
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError } from 'axios'; // v1.4.0
import {
  API_VERSION,
  API_TIMEOUT,
  API_HEADERS,
  HTTP_STATUS
} from '../constants/api.constants';
import { ApiRequestConfig, ApiError, ApiResponse } from '../types/api.types';

/**
 * Maximum request size in bytes (5MB)
 */
const MAX_REQUEST_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff in milliseconds
 */
const RETRY_DELAY = 1000;

/**
 * Creates enhanced API configuration with security and performance settings
 */
const createApiConfig = (): ApiRequestConfig => {
  const config: ApiRequestConfig = {
    baseURL: `${process.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/${API_VERSION}`,
    timeout: API_TIMEOUT,
    headers: {
      ...API_HEADERS,
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    },
    withCredentials: true,
    useCompression: true,
    useCache: true,
    etag: null,
    customHeaders: {},
    maxContentLength: MAX_REQUEST_SIZE
  };

  return config;
};

/**
 * Configures axios instance with comprehensive interceptors
 * @param config Enhanced API configuration
 */
const configureApiClient = (config: ApiRequestConfig): AxiosInstance => {
  const client = axios.create(config);

  // Request interceptor for authentication and request deduplication
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for deduplication
      config.headers['X-Request-ID'] = crypto.randomUUID();

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for HAL+JSON transformation and error handling
  client.interceptors.response.use(
    (response) => {
      // Cache ETag if present
      const etag = response.headers['etag'];
      if (etag) {
        config.etag = etag;
      }

      // Transform response to HAL+JSON format if not already
      if (!response.data._links) {
        response.data = {
          data: response.data,
          status: response.status,
          message: response.statusText,
          error: null,
          _links: {
            self: { href: response.config.url }
          },
          etag: response.headers['etag'] || null
        };
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      // Handle retry logic
      if (originalRequest && !originalRequest?.['_retry']) {
        if (shouldRetry(error) && getRetryCount(originalRequest) < MAX_RETRIES) {
          originalRequest['_retry'] = true;
          const delay = calculateBackoff(getRetryCount(originalRequest));
          await new Promise(resolve => setTimeout(resolve, delay));
          incrementRetryCount(originalRequest);
          return client(originalRequest);
        }
      }

      // Transform error to RFC 7807 format
      const apiError: ApiError = {
        status: error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: `ERR_${error.code || 'UNKNOWN'}`,
        message: error.message,
        details: error.response?.data || null,
        type: 'https://api.taskmanager.com/errors',
        title: 'Request Failed',
        instance: originalRequest?.url || null
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

/**
 * Determines if a request should be retried based on error type
 */
const shouldRetry = (error: AxiosError): boolean => {
  return (
    !error.response ||
    error.response.status >= 500 ||
    error.response.status === 429 ||
    error.code === 'ECONNABORTED'
  );
};

/**
 * Gets the current retry count for a request
 */
const getRetryCount = (config: any): number => {
  return config._retryCount || 0;
};

/**
 * Increments the retry count for a request
 */
const incrementRetryCount = (config: any): void => {
  config._retryCount = (config._retryCount || 0) + 1;
};

/**
 * Calculates exponential backoff delay
 */
const calculateBackoff = (retryCount: number): number => {
  return RETRY_DELAY * Math.pow(2, retryCount);
};

// Create and export the configured API client
export const apiConfig = createApiConfig();
export const apiClient = configureApiClient(apiConfig);

// Type-safe request methods
export const api = {
  get: <T>(url: string, config = {}) => 
    apiClient.get<ApiResponse<T>>(url, config),
  post: <T>(url: string, data?: any, config = {}) => 
    apiClient.post<ApiResponse<T>>(url, data, config),
  put: <T>(url: string, data?: any, config = {}) => 
    apiClient.put<ApiResponse<T>>(url, data, config),
  delete: <T>(url: string, config = {}) => 
    apiClient.delete<ApiResponse<T>>(url, config),
  patch: <T>(url: string, data?: any, config = {}) => 
    apiClient.patch<ApiResponse<T>>(url, data, config)
};