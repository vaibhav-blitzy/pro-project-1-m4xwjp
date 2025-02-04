/**
 * API Constants
 * Defines core API-related constants used throughout the application for making HTTP requests
 * @version 1.0.0
 */

/**
 * Current API version used as prefix for all API requests
 */
export const API_VERSION = 'v1';

/**
 * Default request timeout in milliseconds (30 seconds)
 * Aligned with performance requirements from technical specifications
 */
export const API_TIMEOUT = 30000;

/**
 * Standard HTTP headers for API requests
 * Implements HAL+JSON format as specified in Interface Specifications
 */
export const API_HEADERS = {
  'Accept': 'application/hal+json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
} as const;

/**
 * Comprehensive mapping of all API endpoint paths organized by service domain
 * Implements RESTful design patterns with max 2 levels of nesting as per specifications
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    MFA_SETUP: '/auth/mfa/setup',
    MFA_VERIFY: '/auth/mfa/verify'
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    SETTINGS: '/users/settings',
    PREFERENCES: '/users/preferences',
    AVATAR: '/users/avatar',
    ACTIVITY: '/users/activity'
  },
  PROJECTS: {
    BASE: '/projects',
    DETAILS: '/projects/:id',
    TASKS: '/projects/:id/tasks',
    MEMBERS: '/projects/:id/members',
    SETTINGS: '/projects/:id/settings',
    ANALYTICS: '/projects/:id/analytics',
    TIMELINE: '/projects/:id/timeline'
  },
  TASKS: {
    BASE: '/tasks',
    DETAILS: '/tasks/:id',
    COMMENTS: '/tasks/:id/comments',
    ATTACHMENTS: '/tasks/:id/attachments',
    HISTORY: '/tasks/:id/history',
    SUBTASKS: '/tasks/:id/subtasks',
    DEPENDENCIES: '/tasks/:id/dependencies',
    ASSIGNEES: '/tasks/:id/assignees'
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: '/notifications/mark-read',
    SETTINGS: '/notifications/settings',
    PREFERENCES: '/notifications/preferences',
    SUBSCRIBE: '/notifications/subscribe',
    UNSUBSCRIBE: '/notifications/unsubscribe'
  }
} as const;

/**
 * Standard HTTP status codes for consistent API response handling
 * Aligned with RFC 7807 problem details specification
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Type definitions for better TypeScript support
export type ApiVersion = typeof API_VERSION;
export type ApiHeaders = typeof API_HEADERS;
export type ApiEndpoints = typeof API_ENDPOINTS;
export type HttpStatus = typeof HTTP_STATUS;

// Ensure objects are readonly at compile time
Object.freeze(API_HEADERS);
Object.freeze(API_ENDPOINTS);
Object.freeze(HTTP_STATUS);