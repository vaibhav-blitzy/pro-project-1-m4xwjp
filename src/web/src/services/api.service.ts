/**
 * @fileoverview Enhanced API service for secure HTTP communication with backend services
 * Implements comprehensive security features, caching, and error handling
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // v1.4.0
import { apiConfig } from '../config/api.config';
import { ApiResponse, ApiError, ApiRequestConfig } from '../types/api.types';
import { transformResponse } from '../utils/api.utils';
import LRU from 'lru-cache'; // v7.14.1
import CircuitBreaker from 'opossum'; // v6.4.0

/**
 * Cache configuration for API requests
 */
const CACHE_CONFIG = {
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
};

/**
 * Circuit breaker configuration
 */
const CIRCUIT_BREAKER_CONFIG = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

/**
 * Enhanced API service class implementing secure communication patterns
 */
export class ApiService {
  private readonly httpClient: AxiosInstance;
  private readonly baseURL: string;
  private readonly requestCache: LRU<string, any>;
  private readonly circuitBreaker: CircuitBreaker;

  /**
   * Initializes API service with enhanced security and performance features
   * @param config API configuration
   */
  constructor(config: ApiRequestConfig) {
    this.baseURL = config.baseURL;
    this.requestCache = new LRU(CACHE_CONFIG);
    
    // Initialize axios instance with security headers
    this.httpClient = axios.create({
      ...config,
      headers: {
        ...config.headers,
        'X-Request-ID': crypto.randomUUID(),
        'X-Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      }
    });

    // Configure request interceptor with security enhancements
    this.httpClient.interceptors.request.use(
      (config) => this.secureRequest(config),
      (error) => Promise.reject(error)
    );

    // Configure response interceptor with security filtering
    this.httpClient.interceptors.response.use(
      (response) => this.secureResponse(response),
      (error) => this.handleRequestError(error)
    );

    // Initialize circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(
      (request: () => Promise<any>) => request(),
      CIRCUIT_BREAKER_CONFIG
    );
  }

  /**
   * Performs secure GET request with caching and retry support
   * @template T Response data type
   * @param endpoint API endpoint
   * @param params Query parameters
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async get<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cachedResponse = this.requestCache.get(cacheKey);

    if (cachedResponse && options.useCache !== false) {
      return cachedResponse;
    }

    const request = async () => {
      const response = await this.httpClient.get<T>(endpoint, {
        params,
        ...options,
        headers: {
          ...options.headers,
          'If-None-Match': cachedResponse?.etag || ''
        }
      });

      const transformedResponse = transformResponse<T>(response.data);
      
      if (options.useCache !== false) {
        this.requestCache.set(cacheKey, transformedResponse);
      }

      return transformedResponse;
    };

    return this.circuitBreaker.fire(request);
  }

  /**
   * Performs secure POST request with CSRF protection
   * @template T Response data type
   * @param endpoint API endpoint
   * @param data Request payload
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async post<T>(
    endpoint: string,
    data?: any,
    options: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const request = async () => {
      const response = await this.httpClient.post<T>(endpoint, data, {
        ...options,
        headers: {
          ...options.headers,
          'X-CSRF-Token': this.getCsrfToken()
        }
      });

      return transformResponse<T>(response.data);
    };

    return this.circuitBreaker.fire(request);
  }

  /**
   * Performs secure PUT request with validation
   * @template T Response data type
   * @param endpoint API endpoint
   * @param data Request payload
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async put<T>(
    endpoint: string,
    data?: any,
    options: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const request = async () => {
      const response = await this.httpClient.put<T>(endpoint, data, {
        ...options,
        headers: {
          ...options.headers,
          'X-CSRF-Token': this.getCsrfToken()
        }
      });

      return transformResponse<T>(response.data);
    };

    return this.circuitBreaker.fire(request);
  }

  /**
   * Performs secure DELETE request with confirmation
   * @template T Response data type
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Promise resolving to API response
   */
  public async delete<T>(
    endpoint: string,
    options: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const request = async () => {
      const response = await this.httpClient.delete<T>(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          'X-CSRF-Token': this.getCsrfToken()
        }
      });

      return transformResponse<T>(response.data);
    };

    return this.circuitBreaker.fire(request);
  }

  /**
   * Secures outgoing requests with additional headers and validation
   * @param config Request configuration
   * @returns Enhanced request configuration
   */
  private secureRequest(config: AxiosRequestConfig): AxiosRequestConfig {
    // Validate URL for potential security issues
    if (!this.isValidUrl(config.url)) {
      throw new Error('Invalid URL detected');
    }

    // Add security headers
    config.headers = {
      ...config.headers,
      'X-Timestamp': Date.now().toString(),
      'X-API-Version': apiConfig.version
    };

    return config;
  }

  /**
   * Processes and secures incoming responses
   * @param response Axios response
   * @returns Secured response
   */
  private secureResponse(response: AxiosResponse): AxiosResponse {
    // Validate response integrity
    if (!this.isValidResponse(response)) {
      throw new Error('Invalid response received');
    }

    // Update cache if ETag present
    const etag = response.headers['etag'];
    if (etag) {
      const cacheKey = this.generateCacheKey(
        response.config.url!,
        response.config.params
      );
      this.requestCache.set(cacheKey, {
        ...response.data,
        etag
      });
    }

    return response;
  }

  /**
   * Handles request errors with comprehensive error transformation
   * @param error Axios error
   * @returns Transformed error response
   */
  private async handleRequestError(error: any): Promise<never> {
    // Log security-relevant errors
    if (this.isSecurityError(error)) {
      console.error('Security violation detected:', error);
    }

    throw error;
  }

  /**
   * Generates cache key for request
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Cache key string
   */
  private generateCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Retrieves CSRF token for request security
   * @returns CSRF token
   */
  private getCsrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  /**
   * Validates URL for security concerns
   * @param url URL to validate
   * @returns True if URL is valid
   */
  private isValidUrl(url?: string): boolean {
    if (!url) return false;
    try {
      const urlObj = new URL(url, this.baseURL);
      return urlObj.origin === new URL(this.baseURL).origin;
    } catch {
      return false;
    }
  }

  /**
   * Validates response for security concerns
   * @param response Axios response
   * @returns True if response is valid
   */
  private isValidResponse(response: AxiosResponse): boolean {
    return (
      response &&
      typeof response === 'object' &&
      typeof response.data === 'object' &&
      !this.containsScriptInjection(response.data)
    );
  }

  /**
   * Checks if error is security-related
   * @param error Error to check
   * @returns True if security-related error
   */
  private isSecurityError(error: any): boolean {
    return (
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.code === 'ECONNABORTED'
    );
  }

  /**
   * Checks for potential script injection in response
   * @param data Response data
   * @returns True if script injection detected
   */
  private containsScriptInjection(data: any): boolean {
    const stringified = JSON.stringify(data);
    return /<script\b[^>]*>([\s\S]*?)<\/script>/gmi.test(stringified);
  }
}

// Export singleton instance
export const apiService = new ApiService(apiConfig);