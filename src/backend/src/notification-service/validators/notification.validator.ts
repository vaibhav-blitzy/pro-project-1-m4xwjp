/**
 * @file Notification validation schemas and functions with RFC 7807 error handling
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.2
import { NotificationType } from '../interfaces/notification.interface';
import { validateInput } from '../../common/utils/validation.util';

/**
 * Validation schema for notification creation with enhanced security rules
 */
export const createNotificationSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .description('Unique identifier of the notification recipient'),

  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required()
    .description('Type of notification from predefined enum'),

  title: Joi.string()
    .required()
    .max(200)
    .trim()
    .escape()
    .description('Notification title with XSS prevention'),

  message: Joi.string()
    .required()
    .max(1000)
    .trim()
    .escape()
    .description('Notification message with XSS prevention'),

  priority: Joi.string()
    .valid('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    .required()
    .description('Priority level of the notification'),

  channels: Joi.array()
    .items(Joi.string().valid('EMAIL', 'IN_APP', 'PUSH'))
    .min(1)
    .required()
    .description('Delivery channels for the notification'),

  metadata: Joi.object()
    .optional()
    .description('Additional contextual data for the notification'),

  scheduledFor: Joi.date()
    .iso()
    .min('now')
    .optional()
    .description('Future delivery timestamp if scheduled'),

  deliveryAttempts: Joi.number()
    .integer()
    .min(0)
    .max(5)
    .default(0)
    .description('Number of delivery attempts made'),

  errorMessage: Joi.string()
    .max(500)
    .optional()
    .description('Error message if delivery failed')
});

/**
 * Validation schema for notification updates with enhanced security rules
 */
export const updateNotificationSchema = Joi.object({
  title: Joi.string()
    .max(200)
    .trim()
    .escape()
    .optional()
    .description('Updated notification title'),

  message: Joi.string()
    .max(1000)
    .trim()
    .escape()
    .optional()
    .description('Updated notification message'),

  priority: Joi.string()
    .valid('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    .optional()
    .description('Updated priority level'),

  channels: Joi.array()
    .items(Joi.string().valid('EMAIL', 'IN_APP', 'PUSH'))
    .min(1)
    .optional()
    .description('Updated delivery channels'),

  metadata: Joi.object()
    .optional()
    .description('Updated metadata'),

  scheduledFor: Joi.date()
    .iso()
    .min('now')
    .optional()
    .description('Updated scheduled delivery time'),

  deliveryAttempts: Joi.number()
    .integer()
    .min(0)
    .max(5)
    .optional()
    .description('Updated delivery attempt count'),

  errorMessage: Joi.string()
    .max(500)
    .optional()
    .description('Updated error message')
});

/**
 * Validates notification creation request with enhanced security checks
 * @param data - Input data to validate
 * @returns Validation result with sanitized data or RFC 7807 formatted errors
 */
export async function validateCreateNotification(data: any): Promise<{
  isValid: boolean;
  errors?: any;
  data?: any;
}> {
  return validateInput(data, createNotificationSchema, {
    abortEarly: false,
    stripUnknown: true,
    sanitize: true
  });
}

/**
 * Validates notification update request with enhanced security checks
 * @param data - Input data to validate
 * @returns Validation result with sanitized data or RFC 7807 formatted errors
 */
export async function validateUpdateNotification(data: any): Promise<{
  isValid: boolean;
  errors?: any;
  data?: any;
}> {
  return validateInput(data, updateNotificationSchema, {
    abortEarly: false,
    stripUnknown: true,
    sanitize: true
  });
}