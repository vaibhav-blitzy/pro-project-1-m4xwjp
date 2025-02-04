/**
 * @fileoverview Browser storage utility functions with type-safe wrappers, validation, and security
 * @version 1.0.0
 */

import type { Nullable } from '../types/common.types';

// Storage type definition
type StorageType = 'localStorage' | 'sessionStorage';

// Metadata interface for stored values
interface StorageMetadata<T> {
  type: string;
  timestamp: number;
  compressed: boolean;
  value: T;
}

// Error messages
const ERROR_MESSAGES = {
  INVALID_STORAGE: 'Invalid storage type specified',
  STORAGE_UNAVAILABLE: 'Storage is not available',
  INVALID_KEY: 'Invalid storage key provided',
  QUOTA_EXCEEDED: 'Storage quota exceeded',
  PARSE_ERROR: 'Failed to parse stored value',
  VALIDATION_ERROR: 'Stored value validation failed',
  REMOVAL_ERROR: 'Failed to remove item from storage',
  CLEAR_ERROR: 'Failed to clear storage'
} as const;

// Constants
const TEST_KEY = '__storage_test__';
const MAX_ITEM_SIZE = 5 * 1024 * 1024; // 5MB limit
const COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB compression threshold

/**
 * Checks if a specific storage type is available and working
 * @param storageType - The type of storage to check
 * @returns boolean indicating if storage is available
 */
export function isStorageAvailable(storageType: StorageType): boolean {
  try {
    if (!(storageType in window)) {
      return false;
    }

    const storage = window[storageType];
    const testValue = `test_${Date.now()}`;

    storage.setItem(TEST_KEY, testValue);
    const result = storage.getItem(TEST_KEY) === testValue;
    storage.removeItem(TEST_KEY);

    return result;
  } catch (error) {
    console.warn(`Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Compresses a string value if it exceeds the threshold
 * @param value - The string to potentially compress
 * @returns The compressed string if applicable
 */
function compressValue(value: string): string {
  if (value.length < COMPRESSION_THRESHOLD) {
    return value;
  }

  try {
    const uint8Array = new TextEncoder().encode(value);
    return btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  } catch (error) {
    console.warn('Compression failed, storing uncompressed value');
    return value;
  }
}

/**
 * Decompresses a previously compressed string
 * @param value - The compressed string
 * @returns The decompressed string
 */
function decompressValue(value: string): string {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value; // Return original if decompression fails
  }
}

/**
 * Securely stores a value in the specified storage
 * @param key - The storage key
 * @param value - The value to store
 * @param storageType - The type of storage to use
 * @throws Error if storage operation fails
 */
export function setItem<T>(key: string, value: T, storageType: StorageType): void {
  if (!isStorageAvailable(storageType)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  if (!key || typeof key !== 'string') {
    throw new Error(ERROR_MESSAGES.INVALID_KEY);
  }

  try {
    const metadata: StorageMetadata<T> = {
      type: typeof value,
      timestamp: Date.now(),
      compressed: false,
      value
    };

    let serialized = JSON.stringify(metadata);

    if (serialized.length > MAX_ITEM_SIZE) {
      throw new Error(ERROR_MESSAGES.QUOTA_EXCEEDED);
    }

    if (serialized.length > COMPRESSION_THRESHOLD) {
      serialized = compressValue(serialized);
      metadata.compressed = true;
    }

    window[storageType].setItem(key, serialized);
  } catch (error) {
    console.error('Storage setItem failed:', error);
    throw new Error(error instanceof Error ? error.message : ERROR_MESSAGES.QUOTA_EXCEEDED);
  }
}

/**
 * Safely retrieves and validates a value from the specified storage
 * @param key - The storage key
 * @param storageType - The type of storage to use
 * @returns The stored value or null if not found
 */
export function getItem<T>(key: string, storageType: StorageType): Nullable<T> {
  if (!isStorageAvailable(storageType)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  if (!key || typeof key !== 'string') {
    throw new Error(ERROR_MESSAGES.INVALID_KEY);
  }

  try {
    const raw = window[storageType].getItem(key);
    if (!raw) return null;

    let parsed: StorageMetadata<T>;
    
    try {
      const decompressed = decompressValue(raw);
      parsed = JSON.parse(decompressed);
    } catch {
      // If parsing fails, try parsing without decompression
      parsed = JSON.parse(raw);
    }

    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }

    return parsed.value;
  } catch (error) {
    console.error('Storage getItem failed:', error);
    return null;
  }
}

/**
 * Securely removes an item from the specified storage
 * @param key - The storage key
 * @param storageType - The type of storage to use
 * @throws Error if removal fails
 */
export function removeItem(key: string, storageType: StorageType): void {
  if (!isStorageAvailable(storageType)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  if (!key || typeof key !== 'string') {
    throw new Error(ERROR_MESSAGES.INVALID_KEY);
  }

  try {
    window[storageType].removeItem(key);
    
    // Verify removal
    if (window[storageType].getItem(key) !== null) {
      throw new Error(ERROR_MESSAGES.REMOVAL_ERROR);
    }
  } catch (error) {
    console.error('Storage removeItem failed:', error);
    throw new Error(error instanceof Error ? error.message : ERROR_MESSAGES.REMOVAL_ERROR);
  }
}

/**
 * Safely clears all items from the specified storage
 * @param storageType - The type of storage to clear
 * @throws Error if clear operation fails
 */
export function clear(storageType: StorageType): void {
  if (!isStorageAvailable(storageType)) {
    throw new Error(ERROR_MESSAGES.STORAGE_UNAVAILABLE);
  }

  try {
    window[storageType].clear();
    
    // Verify clear
    if (window[storageType].length !== 0) {
      throw new Error(ERROR_MESSAGES.CLEAR_ERROR);
    }
  } catch (error) {
    console.error('Storage clear failed:', error);
    throw new Error(error instanceof Error ? error.message : ERROR_MESSAGES.CLEAR_ERROR);
  }
}