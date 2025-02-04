/**
 * @fileoverview TypeScript type definitions for notification state management in Redux store
 * Implements real-time notification system with comprehensive type safety
 * @version 1.0.0
 */

import { LoadingState } from '../../types/common.types';
import { BaseEntity } from '../../interfaces/common.interface';

/**
 * Redux action type constants for notification operations
 */
export enum NotificationActionTypes {
  FETCH_NOTIFICATIONS_REQUEST = '@notification/FETCH_NOTIFICATIONS_REQUEST',
  FETCH_NOTIFICATIONS_SUCCESS = '@notification/FETCH_NOTIFICATIONS_SUCCESS',
  FETCH_NOTIFICATIONS_FAILURE = '@notification/FETCH_NOTIFICATIONS_FAILURE',
  MARK_AS_READ_REQUEST = '@notification/MARK_AS_READ_REQUEST',
  MARK_AS_READ_SUCCESS = '@notification/MARK_AS_READ_SUCCESS',
  MARK_AS_READ_FAILURE = '@notification/MARK_AS_READ_FAILURE',
  ADD_NOTIFICATION = '@notification/ADD_NOTIFICATION',
  CLEAR_NOTIFICATIONS = '@notification/CLEAR_NOTIFICATIONS'
}

/**
 * Enumeration of possible notification types aligned with system events
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
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
  TEAM_MEMBER_JOINED = 'TEAM_MEMBER_JOINED'
}

/**
 * Enumeration of notification delivery statuses
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

/**
 * Interface for filtering notifications in the Redux store
 */
export interface NotificationFilterCriteria {
  /** Array of notification types to filter by */
  type: NotificationType[];
  /** Array of notification statuses to filter by */
  status: NotificationStatus[];
  /** Start date for date range filtering */
  startDate: Date;
  /** End date for date range filtering */
  endDate: Date;
}

/**
 * Interface for notification entity in Redux store
 * Extends BaseEntity for consistent entity management
 */
export interface Notification extends BaseEntity {
  /** ID of the user this notification belongs to */
  userId: string;
  /** Type of notification from NotificationType enum */
  type: NotificationType;
  /** Notification title for display */
  title: string;
  /** Detailed notification message */
  message: string;
  /** Current status of the notification */
  status: NotificationStatus;
  /** Additional metadata for rich notifications */
  metadata: Record<string, any>;
}

/**
 * Interface for notification state in Redux store
 * Implements comprehensive state management for notifications
 */
export interface NotificationState {
  /** Array of notifications */
  notifications: Notification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Current loading state */
  loadingState: LoadingState;
  /** Error message if any */
  error: string | null;
  /** Timestamp of last notification fetch */
  lastFetchedAt: Date;
  /** Flag indicating if more notifications can be loaded */
  hasMoreNotifications: boolean;
  /** Current filter criteria */
  filterCriteria: NotificationFilterCriteria;
}