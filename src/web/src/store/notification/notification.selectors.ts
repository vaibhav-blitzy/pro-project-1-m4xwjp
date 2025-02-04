/**
 * @fileoverview Redux selectors for notification state management
 * Implements memoized selectors for efficient notification data access and filtering
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.0
import type { RootState } from '../../types/store.types';
import type { NotificationState, Notification, NotificationFilterCriteria } from './notification.types';

/**
 * Base selector to get the notification slice from root state
 */
export const selectNotificationState = (state: RootState): NotificationState => state.notification;

/**
 * Memoized selector to get all notifications
 * Filters out deleted notifications and sorts by creation date
 */
export const selectAllNotifications = createSelector(
  [selectNotificationState],
  (notificationState): Notification[] => {
    return notificationState.notifications
      .filter(notification => notification.status !== 'FAILED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
);

/**
 * Memoized selector to get unread notification count
 */
export const selectUnreadCount = createSelector(
  [selectNotificationState],
  (notificationState): number => notificationState.unreadCount
);

/**
 * Memoized selector to get loading state
 */
export const selectNotificationLoadingState = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.loadingState
);

/**
 * Memoized selector to get error state
 */
export const selectNotificationError = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.error
);

/**
 * Memoized selector for filtered notifications based on criteria
 * Implements advanced filtering with type, status, and date range
 */
export const selectFilteredNotifications = createSelector(
  [selectAllNotifications, (_state: RootState, criteria: NotificationFilterCriteria) => criteria],
  (notifications, criteria): Notification[] => {
    return notifications.filter(notification => {
      // Type filter
      const typeMatch = criteria.type.length === 0 || 
        criteria.type.includes(notification.type);

      // Status filter
      const statusMatch = criteria.status.length === 0 || 
        criteria.status.includes(notification.status);

      // Date range filter
      const notificationDate = new Date(notification.createdAt);
      const dateMatch = (!criteria.startDate || notificationDate >= criteria.startDate) &&
        (!criteria.endDate || notificationDate <= criteria.endDate);

      return typeMatch && statusMatch && dateMatch;
    });
  },
  {
    memoizeOptions: {
      resultEqualityCheck: (a: Notification[], b: Notification[]) => 
        a.length === b.length && a.every((notification, index) => notification.id === b[index].id)
    }
  }
);

/**
 * Memoized selector for notifications grouped by type
 * Useful for displaying notifications in categorized sections
 */
export const selectNotificationsByType = createSelector(
  [selectAllNotifications],
  (notifications): Record<string, Notification[]> => {
    return notifications.reduce((grouped, notification) => {
      const type = notification.type;
      return {
        ...grouped,
        [type]: [...(grouped[type] || []), notification]
      };
    }, {} as Record<string, Notification[]>);
  }
);

/**
 * Memoized selector for getting a single notification by ID
 * Optimized for quick lookups of individual notifications
 */
export const selectNotificationById = createSelector(
  [selectAllNotifications, (_state: RootState, id: string) => id],
  (notifications, id): Notification | undefined => 
    notifications.find(notification => notification.id === id)
);

/**
 * Memoized selector for checking if there are more notifications to load
 */
export const selectHasMoreNotifications = createSelector(
  [selectNotificationState],
  (notificationState): boolean => notificationState.hasMoreNotifications
);

/**
 * Memoized selector for getting current filter criteria
 */
export const selectNotificationFilterCriteria = createSelector(
  [selectNotificationState],
  (notificationState): NotificationFilterCriteria => notificationState.filterCriteria
);

/**
 * Memoized selector for getting last fetched timestamp
 */
export const selectLastFetchedAt = createSelector(
  [selectNotificationState],
  (notificationState): Date => notificationState.lastFetchedAt
);