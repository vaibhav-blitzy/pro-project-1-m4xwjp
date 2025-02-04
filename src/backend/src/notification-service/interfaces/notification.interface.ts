/**
 * @packageDocumentation
 * @module NotificationService/Interfaces
 * @version 1.0.0
 * 
 * Core interfaces and types for the notification service with enhanced support
 * for multiple delivery channels, error handling, and status tracking.
 */

import { Document } from 'mongoose'; // v7.4.1
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { ApiResponse } from '../../common/types';

/**
 * Enumeration of supported notification types with comprehensive coverage
 * of all system events that require user notification.
 */
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  MENTION = 'MENTION',
  DUE_DATE_REMINDER = 'DUE_DATE_REMINDER',
  TASK_OVERDUE = 'TASK_OVERDUE',
  PROJECT_MILESTONE = 'PROJECT_MILESTONE',
  TEAM_ANNOUNCEMENT = 'TEAM_ANNOUNCEMENT'
}

/**
 * Enumeration of notification delivery statuses with comprehensive
 * tracking of delivery attempts and failure states.
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
  CANCELLED = 'CANCELLED'
}

/**
 * Enumeration of notification priority levels for delivery optimization
 * and user attention management.
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Interface defining the structure of notification delivery attempts
 * for comprehensive tracking and error handling.
 */
export interface DeliveryAttempt {
  timestamp: Date;
  channel: string;
  status: NotificationStatus;
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Interface for notification filtering options in queries.
 */
export interface NotificationFilter {
  type?: NotificationType[];
  status?: NotificationStatus[];
  priority?: NotificationPriority[];
  startDate?: Date;
  endDate?: Date;
  isRead?: boolean;
  channels?: string[];
}

/**
 * Interface for notification creation options with delivery preferences.
 */
export interface NotificationOptions {
  priority?: NotificationPriority;
  channels?: string[];
  scheduledFor?: Date;
  metadata?: Record<string, any>;
  retryPolicy?: {
    maxAttempts: number;
    backoffInterval: number;
  };
}

/**
 * Interface for creating a new notification with required and optional fields.
 */
export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channels?: string[];
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

/**
 * Core notification interface extending MongoDB Document for persistence
 * with comprehensive tracking and metadata support.
 */
export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  channels: string[];
  metadata: Record<string, any>;
  deliveryAttempts: DeliveryAttempt[];
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  errorMessage?: string;
}

/**
 * Enhanced notification service interface with comprehensive error handling
 * and delivery tracking capabilities.
 */
export interface INotificationService extends IBaseService<INotification> {
  /**
   * Sends a notification through specified channels with delivery tracking.
   * 
   * @param notificationData - Notification content and recipient details
   * @param options - Delivery options and preferences
   * @returns Promise resolving to created notification with delivery status
   */
  sendNotification(
    notificationData: CreateNotificationDto,
    options?: NotificationOptions
  ): Promise<ServiceResponse<INotification>>;

  /**
   * Marks a notification as read with timestamp tracking.
   * 
   * @param notificationId - ID of the notification to mark as read
   * @param userId - ID of the user marking the notification as read
   * @returns Promise resolving to updated notification
   */
  markAsRead(
    notificationId: string,
    userId: string
  ): Promise<ServiceResponse<INotification>>;

  /**
   * Retrieves paginated notifications for a user with filtering options.
   * 
   * @param userId - ID of the user to get notifications for
   * @param filter - Filtering criteria for notifications
   * @param options - Pagination and sorting options
   * @returns Promise resolving to paginated list of notifications
   */
  getUserNotifications(
    userId: string,
    filter: NotificationFilter,
    options: PaginationParams
  ): Promise<ServiceResponse<{
    items: INotification[];
    total: number;
    page: number;
    totalPages: number;
  }>>;
}