/**
 * @fileoverview Redux actions and thunks for notification state management
 * Implements real-time updates, offline support, and comprehensive error handling
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit'; // v1.9.0
import { Dispatch } from 'redux'; // v4.2.0
import axios from 'axios'; // v1.4.0
import { NotificationActionTypes } from './notification.types';
import { NotificationService } from '../../services/notification.service';
import { AppThunk } from '../../types/store.types';

// Create notification service instance
const notificationService = new NotificationService();

// Action creators with type safety
export const fetchNotificationsRequest = createAction(
  NotificationActionTypes.FETCH_NOTIFICATIONS_REQUEST,
  (params: { page: number; pageSize: number }) => ({
    payload: params
  })
);

export const fetchNotificationsSuccess = createAction(
  NotificationActionTypes.FETCH_NOTIFICATIONS_SUCCESS,
  (notifications: any[]) => ({
    payload: notifications
  })
);

export const fetchNotificationsFailure = createAction(
  NotificationActionTypes.FETCH_NOTIFICATIONS_FAILURE,
  (error: string) => ({
    payload: error
  })
);

export const markAsReadRequest = createAction(
  NotificationActionTypes.MARK_AS_READ_REQUEST,
  (notificationId: string) => ({
    payload: notificationId
  })
);

export const markAsReadSuccess = createAction(
  NotificationActionTypes.MARK_AS_READ_SUCCESS,
  (notificationId: string) => ({
    payload: notificationId
  })
);

export const markAsReadFailure = createAction(
  NotificationActionTypes.MARK_AS_READ_FAILURE,
  (error: string) => ({
    payload: error
  })
);

// Enhanced thunk for fetching notifications with retry logic and offline support
export const fetchNotifications = (params: { 
  page: number; 
  pageSize: number 
}): AppThunk => async (dispatch: Dispatch) => {
  const abortController = new AbortController();
  const retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  try {
    dispatch(fetchNotificationsRequest(params));

    // Generate cache key for request deduplication
    const cacheKey = `notifications_${params.page}_${params.pageSize}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      dispatch(fetchNotificationsSuccess(JSON.parse(cachedData)));
      return;
    }

    const notifications = await notificationService.getNotifications({
      page: params.page,
      pageSize: params.pageSize,
      signal: abortController.signal
    });

    // Cache successful response
    sessionStorage.setItem(cacheKey, JSON.stringify(notifications));
    dispatch(fetchNotificationsSuccess(notifications));

  } catch (error) {
    let retryCount = 0;
    const isNetworkError = error instanceof Error && 
      (error.name === 'NetworkError' || axios.isAxiosError(error));

    while (isNetworkError && retryCount < retryConfig.maxRetries) {
      try {
        retryCount++;
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(2, retryCount),
          retryConfig.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));

        const notifications = await notificationService.getNotifications({
          page: params.page,
          pageSize: params.pageSize,
          signal: abortController.signal
        });

        dispatch(fetchNotificationsSuccess(notifications));
        return;

      } catch (retryError) {
        if (retryCount === retryConfig.maxRetries) {
          const errorMessage = retryError instanceof Error ? 
            retryError.message : 'Failed to fetch notifications';
          dispatch(fetchNotificationsFailure(errorMessage));
        }
      }
    }

    const errorMessage = error instanceof Error ? 
      error.message : 'Failed to fetch notifications';
    dispatch(fetchNotificationsFailure(errorMessage));
  }

  return () => {
    abortController.abort();
  };
};

// Enhanced thunk for marking notification as read with optimistic updates
export const markNotificationAsRead = (
  notificationId: string,
  options: { skipOptimistic?: boolean } = {}
): AppThunk => async (dispatch: Dispatch) => {
  const { skipOptimistic = false } = options;

  try {
    dispatch(markAsReadRequest(notificationId));

    if (!skipOptimistic) {
      // Store previous state for rollback
      const previousState = sessionStorage.getItem('notifications_state');
      
      // Apply optimistic update
      dispatch(markAsReadSuccess(notificationId));
    }

    await notificationService.markAsRead(notificationId);

    if (!skipOptimistic) {
      // Clear stored previous state on success
      sessionStorage.removeItem('notifications_state');
    }

    dispatch(markAsReadSuccess(notificationId));

  } catch (error) {
    if (!skipOptimistic) {
      // Rollback to previous state
      const previousState = sessionStorage.getItem('notifications_state');
      if (previousState) {
        dispatch(fetchNotificationsSuccess(JSON.parse(previousState)));
      }
    }

    const errorMessage = error instanceof Error ? 
      error.message : 'Failed to mark notification as read';
    dispatch(markAsReadFailure(errorMessage));

    // Queue for retry if offline
    if (!navigator.onLine) {
      notificationService.queueOfflineOperation({
        type: 'markAsRead',
        id: notificationId
      });
    }
  }
};

// Enhanced thunk for marking all notifications as read with batch processing
export const markAllNotificationsAsRead = (
  options: { batchSize?: number } = {}
): AppThunk => async (dispatch: Dispatch) => {
  const { batchSize = 50 } = options;

  try {
    // Store current state for potential rollback
    const currentState = sessionStorage.getItem('notifications_state');

    // Process notifications in batches
    const result = await notificationService.markAllAsRead({
      batchSize,
      onBatchComplete: (completedIds: string[]) => {
        completedIds.forEach(id => {
          dispatch(markAsReadSuccess(id));
        });
      }
    });

    // Clear stored state on success
    sessionStorage.removeItem('notifications_state');

    return result;

  } catch (error) {
    // Rollback to previous state
    const previousState = sessionStorage.getItem('notifications_state');
    if (previousState) {
      dispatch(fetchNotificationsSuccess(JSON.parse(previousState)));
    }

    const errorMessage = error instanceof Error ? 
      error.message : 'Failed to mark all notifications as read';
    dispatch(markAsReadFailure(errorMessage));

    // Queue for retry if offline
    if (!navigator.onLine) {
      notificationService.queueOfflineOperation({
        type: 'markAllAsRead'
      });
    }
  }
};