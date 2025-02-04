/**
 * @fileoverview Notification API client implementation
 * Implements RESTful endpoints for notification management with enhanced features
 * @version 1.0.0
 */

import { AxiosResponse } from 'axios'; // v1.4.0
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { apiClient } from '../config/api.config';
import { transformResponse } from '../utils/api.utils';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Interface for notification data structure
 */
interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

/**
 * Request cache for deduplication
 */
const requestCache = new Map<string, Promise<any>>();

/**
 * Cache timeout duration in milliseconds (30 seconds)
 */
const CACHE_TIMEOUT = 30000;

/**
 * Generates cache key for request deduplication
 */
const generateCacheKey = (endpoint: string, params?: Record<string, any>): string => {
  return `${endpoint}:${JSON.stringify(params || {})}`;
};

/**
 * Cleans up cached request after timeout
 */
const cleanupCache = (key: string): void => {
  setTimeout(() => {
    requestCache.delete(key);
  }, CACHE_TIMEOUT);
};

/**
 * Retrieves paginated list of notifications
 * @param page Page number (1-based)
 * @param limit Items per page
 * @param signal AbortSignal for request cancellation
 * @returns Promise with paginated notifications
 */
export async function getNotifications(
  page: number = 1,
  limit: number = 20,
  signal?: AbortSignal
): Promise<PaginatedResponse<Notification>> {
  // Validate pagination parameters
  if (page < 1) throw new Error('Page must be greater than 0');
  if (limit > 100) throw new Error('Limit cannot exceed 100 items');

  const cacheKey = generateCacheKey(API_ENDPOINTS.NOTIFICATIONS.BASE, { page, limit });
  
  // Check cache for existing request
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as Promise<PaginatedResponse<Notification>>;
  }

  const request = apiClient
    .get<PaginatedResponse<Notification>>(API_ENDPOINTS.NOTIFICATIONS.BASE, {
      params: { page, limit },
      signal,
    })
    .then((response: AxiosResponse) => transformResponse<Notification[]>(response.data))
    .finally(() => cleanupCache(cacheKey));

  requestCache.set(cacheKey, request);
  return request;
}

/**
 * Retrieves a specific notification by ID
 * @param id Notification ID
 * @param signal AbortSignal for request cancellation
 * @returns Promise with notification data
 */
export async function getNotificationById(
  id: string,
  signal?: AbortSignal
): Promise<ApiResponse<Notification>> {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error('Invalid notification ID format');
  }

  const cacheKey = generateCacheKey(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}`);
  
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as Promise<ApiResponse<Notification>>;
  }

  const request = apiClient
    .get<ApiResponse<Notification>>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}`, { signal })
    .then((response: AxiosResponse) => transformResponse<Notification>(response.data))
    .finally(() => cleanupCache(cacheKey));

  requestCache.set(cacheKey, request);
  return request;
}

/**
 * Marks a notification as read with optimistic update
 * @param id Notification ID
 * @returns Promise indicating success
 */
export async function markAsRead(id: string): Promise<ApiResponse<void>> {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error('Invalid notification ID format');
  }

  // Invalidate relevant cache entries
  const cacheKey = generateCacheKey(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}`);
  requestCache.delete(cacheKey);

  return apiClient
    .patch<ApiResponse<void>>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}/read`)
    .then((response: AxiosResponse) => transformResponse<void>(response.data));
}

/**
 * Marks all notifications as read with batch processing
 * @returns Promise indicating success
 */
export async function markAllAsRead(): Promise<ApiResponse<void>> {
  // Clear entire notification cache
  for (const key of requestCache.keys()) {
    if (key.startsWith(API_ENDPOINTS.NOTIFICATIONS.BASE)) {
      requestCache.delete(key);
    }
  }

  return apiClient
    .patch<ApiResponse<void>>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ)
    .then((response: AxiosResponse) => transformResponse<void>(response.data));
}

/**
 * Deletes a specific notification
 * @param id Notification ID
 * @returns Promise indicating success
 */
export async function deleteNotification(id: string): Promise<ApiResponse<void>> {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new Error('Invalid notification ID format');
  }

  // Clean up cache entries
  const cacheKey = generateCacheKey(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}`);
  requestCache.delete(cacheKey);

  return apiClient
    .delete<ApiResponse<void>>(`${API_ENDPOINTS.NOTIFICATIONS.BASE}/${id}`)
    .then((response: AxiosResponse) => transformResponse<void>(response.data));
}