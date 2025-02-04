/**
 * @fileoverview Standardized messages used throughout the application for consistent user communication and API responses
 * @version 1.0.0
 */

/**
 * Success messages for successful operations across the application
 * Used in API responses and user notifications
 */
export const SuccessMessages = {
  LOGIN_SUCCESS: 'Successfully logged in',
  REGISTER_SUCCESS: 'Account successfully created',
  LOGOUT_SUCCESS: 'Successfully logged out',
  PASSWORD_RESET_SUCCESS: 'Password successfully reset',
  PROFILE_UPDATE_SUCCESS: 'Profile successfully updated',
  PROJECT_CREATE_SUCCESS: 'Project successfully created',
  PROJECT_UPDATE_SUCCESS: 'Project successfully updated',
  PROJECT_DELETE_SUCCESS: 'Project successfully deleted',
  TASK_CREATE_SUCCESS: 'Task successfully created',
  TASK_UPDATE_SUCCESS: 'Task successfully updated',
  TASK_DELETE_SUCCESS: 'Task successfully deleted',
  TASK_ASSIGN_SUCCESS: 'Task successfully assigned',
  TASK_STATUS_UPDATE_SUCCESS: 'Task status successfully updated',
  NOTIFICATION_SENT_SUCCESS: 'Notification sent successfully',
  SETTINGS_UPDATE_SUCCESS: 'Settings updated successfully'
} as const;

/**
 * Informational messages for user guidance and system status updates
 * Used for non-error, non-success states that require user awareness
 */
export const InfoMessages = {
  PASSWORD_RESET_EMAIL_SENT: 'Password reset instructions sent to your email',
  VERIFICATION_EMAIL_SENT: 'Verification email sent, please check your inbox',
  SESSION_EXPIRED: 'Your session has expired, please login again',
  TASK_DEADLINE_APPROACHING: 'Task deadline is approaching',
  PROJECT_ARCHIVED: 'Project has been archived',
  MAINTENANCE_SCHEDULED: 'System maintenance scheduled',
  DATA_SYNC_IN_PROGRESS: 'Data synchronization in progress',
  EXPORT_IN_PROGRESS: 'Export is being processed',
  IMPORT_IN_PROGRESS: 'Import is being processed'
} as const;

/**
 * Validation messages for form validation and data input validation
 * Used consistently across all input validation scenarios
 */
export const ValidationMessages = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters with numbers and letters',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_TIME: 'Please enter a valid time',
  FUTURE_DATE_REQUIRED: 'Date must be in the future',
  MAX_LENGTH_EXCEEDED: 'Maximum length exceeded',
  MIN_LENGTH_REQUIRED: 'Minimum length not met',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_SIZE_EXCEEDED: 'File size exceeds limit'
} as const;

// Type definitions for better TypeScript support
export type SuccessMessageKeys = keyof typeof SuccessMessages;
export type InfoMessageKeys = keyof typeof InfoMessages;
export type ValidationMessageKeys = keyof typeof ValidationMessages;

// Ensure messages are readonly at compile time
export type SuccessMessageValues = typeof SuccessMessages[SuccessMessageKeys];
export type InfoMessageValues = typeof InfoMessages[InfoMessageKeys];
export type ValidationMessageValues = typeof ValidationMessages[ValidationMessageKeys];