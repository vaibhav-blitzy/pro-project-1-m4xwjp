/**
 * @fileoverview Service class providing a high-level abstraction for browser storage operations
 * Implements comprehensive error handling, storage quota management, and security features
 * @version 1.0.0
 */

import { Nullable } from '../types/common.types';
import { APP_CONFIG } from '../constants/app.constants';
import { isStorageAvailable } from '../utils/storage.utils';

// Storage type definition
type StorageType = 'localStorage' | 'sessionStorage';

// Storage event type for monitoring
interface StorageEvent {
  key: string;
  operation: 'set' | 'get' | 'remove' | 'clear';
  timestamp: number;
  success: boolean;
  error?: string;
}

// Storage quota monitoring interface
interface QuotaInfo {
  used: number;
  available: number;
  percentage: number;
}

/**
 * Service class for managing browser storage operations with enhanced type safety,
 * comprehensive error handling, and security features
 */
export class StorageService {
  private readonly storagePrefix: string;
  private readonly defaultStorageType: StorageType;
  private readonly maxRetries: number;
  private readonly quotaThreshold: number;
  private readonly eventLog: StorageEvent[] = [];
  private readonly maxEventLogSize: number = 1000;

  constructor() {
    this.storagePrefix = `${APP_CONFIG.APP_NAME.toLowerCase().replace(/\s+/g, '_')}_`;
    this.defaultStorageType = 'localStorage';
    this.maxRetries = 3;
    this.quotaThreshold = 0.9; // 90% quota warning threshold

    if (!isStorageAvailable(this.defaultStorageType)) {
      throw new Error('Default storage type is not available');
    }

    // Initialize quota monitoring
    this.monitorQuota();
  }

  /**
   * Stores a value in browser storage with enhanced error handling and security
   * @param key - The storage key
   * @param value - The value to store
   * @param storageType - Optional storage type (defaults to localStorage)
   * @returns Promise resolving when storage operation completes
   */
  public async setItem<T>(
    key: string,
    value: T,
    storageType: StorageType = this.defaultStorageType
  ): Promise<void> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        // Validate storage availability
        if (!isStorageAvailable(storageType)) {
          throw new Error(`Storage type ${storageType} is not available`);
        }

        // Validate key
        if (!this.isValidKey(key)) {
          throw new Error('Invalid storage key provided');
        }

        // Check quota before storing
        const quotaInfo = await this.getQuotaInfo(storageType);
        if (quotaInfo.percentage >= this.quotaThreshold) {
          await this.handleQuotaExceeded(storageType);
        }

        // Prepare storage data with metadata
        const storageData = {
          value,
          timestamp: Date.now(),
          type: typeof value,
          version: APP_CONFIG.APP_VERSION
        };

        // Store with prefixed key
        const prefixedKey = this.getPrefixedKey(key);
        window[storageType].setItem(prefixedKey, JSON.stringify(storageData));

        // Log successful operation
        this.logStorageEvent({
          key: prefixedKey,
          operation: 'set',
          timestamp: Date.now(),
          success: true
        });

        return;
      } catch (error) {
        retryCount++;
        if (retryCount === this.maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
          this.logStorageEvent({
            key: this.getPrefixedKey(key),
            operation: 'set',
            timestamp: Date.now(),
            success: false,
            error: errorMessage
          });
          throw new Error(`Storage operation failed after ${this.maxRetries} attempts: ${errorMessage}`);
        }
        await this.delay(Math.pow(2, retryCount) * 100); // Exponential backoff
      }
    }
  }

  /**
   * Retrieves a value from browser storage with enhanced type safety and validation
   * @param key - The storage key
   * @param storageType - Optional storage type (defaults to localStorage)
   * @returns Promise resolving to retrieved value with type preservation or null
   */
  public async getItem<T>(
    key: string,
    storageType: StorageType = this.defaultStorageType
  ): Promise<Nullable<T>> {
    try {
      // Validate storage availability
      if (!isStorageAvailable(storageType)) {
        throw new Error(`Storage type ${storageType} is not available`);
      }

      // Validate key
      if (!this.isValidKey(key)) {
        throw new Error('Invalid storage key provided');
      }

      // Retrieve with prefixed key
      const prefixedKey = this.getPrefixedKey(key);
      const rawData = window[storageType].getItem(prefixedKey);

      if (!rawData) {
        return null;
      }

      // Parse and validate stored data
      const parsedData = JSON.parse(rawData);
      if (!this.isValidStorageData(parsedData)) {
        throw new Error('Invalid storage data format');
      }

      // Log successful retrieval
      this.logStorageEvent({
        key: prefixedKey,
        operation: 'get',
        timestamp: Date.now(),
        success: true
      });

      return parsedData.value as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown retrieval error';
      this.logStorageEvent({
        key: this.getPrefixedKey(key),
        operation: 'get',
        timestamp: Date.now(),
        success: false,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Removes an item from browser storage with security logging
   * @param key - The storage key
   * @param storageType - Optional storage type (defaults to localStorage)
   * @returns Promise resolving when removal completes
   */
  public async removeItem(
    key: string,
    storageType: StorageType = this.defaultStorageType
  ): Promise<void> {
    try {
      // Validate storage availability
      if (!isStorageAvailable(storageType)) {
        throw new Error(`Storage type ${storageType} is not available`);
      }

      // Validate key
      if (!this.isValidKey(key)) {
        throw new Error('Invalid storage key provided');
      }

      // Remove with prefixed key
      const prefixedKey = this.getPrefixedKey(key);
      window[storageType].removeItem(prefixedKey);

      // Verify removal
      if (window[storageType].getItem(prefixedKey) !== null) {
        throw new Error('Failed to remove item from storage');
      }

      // Log successful removal
      this.logStorageEvent({
        key: prefixedKey,
        operation: 'remove',
        timestamp: Date.now(),
        success: true
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown removal error';
      this.logStorageEvent({
        key: this.getPrefixedKey(key),
        operation: 'remove',
        timestamp: Date.now(),
        success: false,
        error: errorMessage
      });
      throw new Error(`Failed to remove item: ${errorMessage}`);
    }
  }

  /**
   * Clears storage with enhanced security and logging
   * @param storageType - Optional storage type (defaults to localStorage)
   * @returns Promise resolving when clear operation completes
   */
  public async clear(storageType: StorageType = this.defaultStorageType): Promise<void> {
    try {
      // Validate storage availability
      if (!isStorageAvailable(storageType)) {
        throw new Error(`Storage type ${storageType} is not available`);
      }

      // Get all prefixed keys
      const prefixedKeys = this.getPrefixedKeys(storageType);

      // Remove only items with our prefix
      for (const key of prefixedKeys) {
        window[storageType].removeItem(key);
      }

      // Log successful clear
      this.logStorageEvent({
        key: 'all',
        operation: 'clear',
        timestamp: Date.now(),
        success: true
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown clear error';
      this.logStorageEvent({
        key: 'all',
        operation: 'clear',
        timestamp: Date.now(),
        success: false,
        error: errorMessage
      });
      throw new Error(`Failed to clear storage: ${errorMessage}`);
    }
  }

  // Private helper methods
  private getPrefixedKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.length > 0 && /^[\w-]+$/.test(key);
  }

  private isValidStorageData(data: unknown): boolean {
    return (
      data !== null &&
      typeof data === 'object' &&
      'value' in data &&
      'timestamp' in data &&
      'type' in data &&
      'version' in data
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getQuotaInfo(storageType: StorageType): Promise<QuotaInfo> {
    try {
      const storage = window[storageType];
      let used = 0;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            used += value.length * 2; // UTF-16 characters = 2 bytes
          }
        }
      }
      // Estimate available space (typical browser storage limit is 5-10MB)
      const available = 5 * 1024 * 1024; // 5MB conservative estimate
      return {
        used,
        available,
        percentage: used / available
      };
    } catch (error) {
      console.error('Failed to get quota info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  private async handleQuotaExceeded(storageType: StorageType): Promise<void> {
    // Remove oldest items first
    const keys = this.getPrefixedKeys(storageType);
    const items = await Promise.all(
      keys.map(async key => {
        const value = window[storageType].getItem(key);
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          return { key, timestamp: parsed.timestamp };
        } catch {
          return null;
        }
      })
    );

    // Sort by timestamp and remove oldest items until under threshold
    const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
    validItems.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of validItems) {
      window[storageType].removeItem(item.key);
      const quotaInfo = await this.getQuotaInfo(storageType);
      if (quotaInfo.percentage < this.quotaThreshold) {
        break;
      }
    }
  }

  private getPrefixedKeys(storageType: StorageType): string[] {
    const storage = window[storageType];
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private logStorageEvent(event: StorageEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog.shift();
    }
  }

  private monitorQuota(): void {
    setInterval(async () => {
      const quotaInfo = await this.getQuotaInfo(this.defaultStorageType);
      if (quotaInfo.percentage >= this.quotaThreshold) {
        console.warn('Storage quota threshold exceeded:', quotaInfo);
      }
    }, 60000); // Check every minute
  }
}