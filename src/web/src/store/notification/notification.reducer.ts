/**
 * @fileoverview Redux reducer for notification state management
 * Implements real-time updates, optimistic updates, and comprehensive error handling
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // v1.9.0
import { 
  NotificationActionTypes,
  NotificationState,
  Notification,
  NotificationStatus
} from './notification.types';
import { LoadingState } from '../../types/common.types';

/**
 * Initial state for notification management
 */
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loadingState: LoadingState.IDLE,
  error: null,
  lastFetchedAt: new Date(),
  hasMoreNotifications: true,
  filterCriteria: {
    type: [],
    status: [],
    startDate: new Date(0),
    endDate: new Date()
  }
};

/**
 * Calculates the unread notification count
 * @param notifications Array of notifications to count unread from
 * @returns Number of unread notifications
 */
const calculateUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter(n => n.status !== NotificationStatus.READ).length;
};

/**
 * Redux reducer for notification state management
 */
const notificationReducer = createReducer(initialState, (builder) => {
  builder
    // Handle fetch notifications request
    .addCase(NotificationActionTypes.FETCH_NOTIFICATIONS_REQUEST, (state) => {
      state.loadingState = LoadingState.LOADING;
      state.error = null;
    })

    // Handle successful notifications fetch
    .addCase(NotificationActionTypes.FETCH_NOTIFICATIONS_SUCCESS, (state, action) => {
      state.notifications = action.payload.notifications;
      state.unreadCount = calculateUnreadCount(action.payload.notifications);
      state.loadingState = LoadingState.SUCCESS;
      state.lastFetchedAt = new Date();
      state.hasMoreNotifications = action.payload.hasMore;
      state.error = null;
    })

    // Handle notifications fetch failure
    .addCase(NotificationActionTypes.FETCH_NOTIFICATIONS_FAILURE, (state, action) => {
      state.loadingState = LoadingState.ERROR;
      state.error = action.payload.error;
    })

    // Handle mark as read request with optimistic update
    .addCase(NotificationActionTypes.MARK_AS_READ_REQUEST, (state, action) => {
      const notificationId = action.payload.id;
      state.notifications = state.notifications.map(notification => 
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.READ }
          : notification
      );
      state.unreadCount = calculateUnreadCount(state.notifications);
      state.loadingState = LoadingState.LOADING;
      state.error = null;
    })

    // Handle successful mark as read
    .addCase(NotificationActionTypes.MARK_AS_READ_SUCCESS, (state, action) => {
      state.loadingState = LoadingState.SUCCESS;
      // Confirm the optimistic update
      state.notifications = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, ...action.payload.notification }
          : notification
      );
      state.error = null;
    })

    // Handle mark as read failure and revert optimistic update
    .addCase(NotificationActionTypes.MARK_AS_READ_FAILURE, (state, action) => {
      state.loadingState = LoadingState.ERROR;
      state.error = action.payload.error;
      // Revert the optimistic update
      state.notifications = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, status: action.payload.originalStatus }
          : notification
      );
      state.unreadCount = calculateUnreadCount(state.notifications);
    })

    // Handle adding new notification
    .addCase(NotificationActionTypes.ADD_NOTIFICATION, (state, action) => {
      const newNotification = action.payload.notification;
      // Add new notification at the beginning of the array
      state.notifications = [newNotification, ...state.notifications];
      if (newNotification.status !== NotificationStatus.READ) {
        state.unreadCount += 1;
      }
    })

    // Handle clearing all notifications
    .addCase(NotificationActionTypes.CLEAR_NOTIFICATIONS, (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.loadingState = LoadingState.IDLE;
      state.error = null;
      state.lastFetchedAt = new Date();
      state.hasMoreNotifications = false;
    })

    // Handle unknown action types
    .addDefaultCase((state) => {
      // Return state unchanged for unknown actions
      return state;
    });
});

export default notificationReducer;