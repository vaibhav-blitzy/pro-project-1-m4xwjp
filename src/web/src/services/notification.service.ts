/**
 * @fileoverview Enhanced notification service implementing real-time updates,
 * offline support, and comprehensive error handling for the Task Management System
 * @version 1.0.0
 */

import { BehaviorSubject, Observable } from 'rxjs'; // v7.8.0
import { retry, catchError } from 'rxjs/operators'; // v7.8.0
import * as notificationApi from '../api/notification.api';
import { WebSocketService } from './websocket.service';
import { StorageService } from './storage.service';
import { ApiResponse } from '../types/api.types';
import { LoadingState } from '../types/common.types';

// Notification interfaces
interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  desktop: boolean;
  frequency: 'immediate' | 'digest' | 'off';
}

interface NotificationQueue {
  items: Notification[];
  lastSync: number;
}

/**
 * Enhanced notification service implementing real-time updates and offline support
 */
export class NotificationService {
  private readonly storageService: StorageService;
  private readonly STORAGE_KEYS = {
    NOTIFICATIONS: 'notifications_cache',
    PREFERENCES: 'notification_preferences',
    OFFLINE_QUEUE: 'notification_offline_queue'
  };
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Observable streams
  public readonly notifications$ = new BehaviorSubject<Notification[]>([]);
  public readonly unreadCount$ = new BehaviorSubject<number>(0);
  public readonly preferences$ = new BehaviorSubject<NotificationPreferences>({
    email: true,
    push: true,
    inApp: true,
    desktop: false,
    frequency: 'immediate'
  });
  public readonly loadingState$ = new BehaviorSubject<LoadingState>(LoadingState.IDLE);

  private offlineQueue: NotificationQueue = {
    items: [],
    lastSync: Date.now()
  };
  private isOnline: boolean = navigator.onLine;
  private wsSubscription: any;

  constructor(
    private readonly webSocketService: WebSocketService
  ) {
    this.storageService = new StorageService();
    this.initializeService();
  }

  /**
   * Initializes the notification service with enhanced error handling
   */
  public async initialize(): Promise<void> {
    try {
      this.loadingState$.next(LoadingState.LOADING);
      
      // Restore cached data
      await this.restoreCachedData();
      
      // Initialize WebSocket connection
      await this.initializeWebSocket();
      
      // Set up network status listeners
      this.setupNetworkListeners();
      
      // Load initial notifications
      await this.loadNotifications();
      
      this.loadingState$.next(LoadingState.SUCCESS);
    } catch (error) {
      console.error('Notification service initialization failed:', error);
      this.loadingState$.next(LoadingState.ERROR);
      throw error;
    }
  }

  /**
   * Retrieves paginated notifications with offline support
   */
  public async getNotifications(params: {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Notification[]> {
    try {
      if (!this.isOnline) {
        return this.getCachedNotifications();
      }

      const response = await notificationApi.getNotifications(params.page, params.pageSize);
      const notifications = response.data;

      // Update cache
      await this.updateNotificationCache(notifications);
      this.notifications$.next(notifications);
      
      return notifications;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return this.getCachedNotifications();
    }
  }

  /**
   * Marks a notification as read with optimistic update
   */
  public async markAsRead(id: string): Promise<void> {
    const currentNotifications = this.notifications$.value;
    const notificationIndex = currentNotifications.findIndex(n => n.id === id);

    if (notificationIndex === -1) return;

    // Optimistic update
    const updatedNotifications = [...currentNotifications];
    updatedNotifications[notificationIndex] = {
      ...updatedNotifications[notificationIndex],
      isRead: true
    };

    this.notifications$.next(updatedNotifications);
    this.updateUnreadCount();

    try {
      if (!this.isOnline) {
        this.queueOfflineOperation({ type: 'markAsRead', id });
        return;
      }

      await notificationApi.markAsRead(id);
    } catch (error) {
      // Revert optimistic update
      this.notifications$.next(currentNotifications);
      this.updateUnreadCount();
      throw error;
    }
  }

  /**
   * Updates notification preferences with persistence
   */
  public async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    const currentPreferences = this.preferences$.value;
    const updatedPreferences = { ...currentPreferences, ...preferences };

    try {
      if (!this.isOnline) {
        this.queueOfflineOperation({ 
          type: 'updatePreferences', 
          preferences: updatedPreferences 
        });
        return;
      }

      await notificationApi.updateNotificationPreferences(updatedPreferences);
      this.preferences$.next(updatedPreferences);
      await this.storageService.setItem(
        this.STORAGE_KEYS.PREFERENCES, 
        updatedPreferences
      );
    } catch (error) {
      this.preferences$.next(currentPreferences);
      throw error;
    }
  }

  /**
   * Cleans up service resources
   */
  public dispose(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.notifications$.complete();
    this.unreadCount$.complete();
    this.preferences$.complete();
    this.loadingState$.complete();
  }

  // Private helper methods

  private async initializeWebSocket(): Promise<void> {
    this.wsSubscription = this.webSocketService.subscribe(
      'notifications',
      this.handleWebSocketMessage.bind(this)
    );
  }

  private async restoreCachedData(): Promise<void> {
    const [cachedNotifications, cachedPreferences, cachedQueue] = await Promise.all([
      this.storageService.getItem<Notification[]>(this.STORAGE_KEYS.NOTIFICATIONS),
      this.storageService.getItem<NotificationPreferences>(this.STORAGE_KEYS.PREFERENCES),
      this.storageService.getItem<NotificationQueue>(this.STORAGE_KEYS.OFFLINE_QUEUE)
    ]);

    if (cachedNotifications) {
      this.notifications$.next(cachedNotifications);
      this.updateUnreadCount();
    }

    if (cachedPreferences) {
      this.preferences$.next(cachedPreferences);
    }

    if (cachedQueue) {
      this.offlineQueue = cachedQueue;
    }
  }

  private async updateNotificationCache(notifications: Notification[]): Promise<void> {
    await this.storageService.setItem(
      this.STORAGE_KEYS.NOTIFICATIONS,
      notifications
    );
  }

  private updateUnreadCount(): void {
    const unreadCount = this.notifications$.value.filter(n => !n.isRead).length;
    this.unreadCount$.next(unreadCount);
  }

  private async getCachedNotifications(): Promise<Notification[]> {
    const cached = await this.storageService.getItem<Notification[]>(
      this.STORAGE_KEYS.NOTIFICATIONS
    );
    return cached || [];
  }

  private handleWebSocketMessage(message: any): void {
    if (message.type === 'notification') {
      const notifications = [...this.notifications$.value];
      notifications.unshift(message.data);
      this.notifications$.next(notifications);
      this.updateUnreadCount();
      this.updateNotificationCache(notifications);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true;
    await this.processOfflineQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.items.length === 0) return;

    for (const operation of this.offlineQueue.items) {
      try {
        if (operation.type === 'markAsRead') {
          await notificationApi.markAsRead(operation.id);
        } else if (operation.type === 'updatePreferences') {
          await notificationApi.updateNotificationPreferences(operation.preferences);
        }
      } catch (error) {
        console.error('Failed to process offline operation:', error);
      }
    }

    this.offlineQueue.items = [];
    this.offlineQueue.lastSync = Date.now();
    await this.storageService.setItem(
      this.STORAGE_KEYS.OFFLINE_QUEUE,
      this.offlineQueue
    );
  }

  private queueOfflineOperation(operation: any): void {
    this.offlineQueue.items.push(operation);
    this.offlineQueue.lastSync = Date.now();
    this.storageService.setItem(
      this.STORAGE_KEYS.OFFLINE_QUEUE,
      this.offlineQueue
    ).catch(console.error);
  }

  private async loadNotifications(): Promise<void> {
    try {
      const response = await notificationApi.getNotifications(1, 20);
      this.notifications$.next(response.data);
      this.updateUnreadCount();
      await this.updateNotificationCache(response.data);
    } catch (error) {
      console.error('Failed to load initial notifications:', error);
      const cached = await this.getCachedNotifications();
      this.notifications$.next(cached);
      this.updateUnreadCount();
    }
  }
}