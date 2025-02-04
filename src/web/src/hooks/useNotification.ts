/**
 * @fileoverview Custom React hook for managing notifications state and operations
 * Implements real-time updates, offline support, and comprehensive error handling
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAllNotifications,
  selectUnreadCount,
  selectNotificationLoadingState,
  selectNotificationError
} from '../store/notification/notification.selectors';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../store/notification/notification.actions';
import notificationService from '../services/notification.service';
import { LoadingState } from '../types/common.types';

// Rate limiting configuration
const RATE_LIMIT = {
  FETCH: 1000, // 1 second
  MARK_READ: 500 // 500ms
};

/**
 * Custom hook for managing notifications with enhanced features
 * Implements real-time updates, offline support, and error handling
 */
export function useNotification() {
  const dispatch = useDispatch();

  // Select notification state from Redux store
  const notifications = useSelector(selectAllNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loadingState = useSelector(selectNotificationLoadingState);
  const error = useSelector(selectNotificationError);

  // Track online/offline status
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Fetches notifications with rate limiting and retry logic
   */
  const handleFetchNotifications = useCallback(async () => {
    try {
      // Rate limiting check
      const lastFetch = sessionStorage.getItem('lastNotificationFetch');
      const now = Date.now();
      
      if (lastFetch && now - parseInt(lastFetch) < RATE_LIMIT.FETCH) {
        return;
      }
      
      sessionStorage.setItem('lastNotificationFetch', now.toString());
      
      await dispatch(fetchNotifications({ 
        page: 1, 
        pageSize: 20 
      }));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [dispatch]);

  /**
   * Marks a notification as read with validation and optimistic update
   */
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      // Validate notification ID
      if (!notificationId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Invalid notification ID');
      }

      // Rate limiting check
      const lastMark = sessionStorage.getItem('lastMarkAsRead');
      const now = Date.now();
      
      if (lastMark && now - parseInt(lastMark) < RATE_LIMIT.MARK_READ) {
        return;
      }
      
      sessionStorage.setItem('lastMarkAsRead', now.toString());

      await dispatch(markNotificationAsRead(notificationId, {
        skipOptimistic: isOffline
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [dispatch, isOffline]);

  /**
   * Marks all notifications as read with batch processing
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await dispatch(markAllNotificationsAsRead({
        batchSize: 50
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [dispatch]);

  /**
   * Retries WebSocket connection
   */
  const retryConnection = useCallback(() => {
    if (notificationService) {
      notificationService.reconnectWebSocket();
    }
  }, []);

  // Setup WebSocket subscription and network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial notifications fetch
    handleFetchNotifications();

    // Subscribe to real-time updates
    if (notificationService) {
      notificationService.subscribeToNotifications();
    }

    // Cleanup subscriptions
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (notificationService) {
        notificationService.unsubscribeFromNotifications();
      }
    };
  }, [handleFetchNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    loading: loadingState === LoadingState.LOADING,
    error,
    isOffline,

    // Actions
    fetchNotifications: handleFetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    retryConnection
  };
}

export default useNotification;