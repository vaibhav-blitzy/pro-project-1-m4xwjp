/**
 * @fileoverview Custom React hook for type-safe localStorage management with cross-tab synchronization
 * @version 1.0.0
 */

import { useState, useEffect } from 'react'; // v18.2.0
import { setItem, getItem } from '../utils/storage.utils';
import type { Nullable } from '../types/common.types';

// Constants for performance optimization
const DEBOUNCE_DELAY = 100;
const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cache for validation results to optimize performance
 */
const validationCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Type guard to validate stored value against expected type
 * @param value - Value to validate
 * @param expectedType - Expected type of the value
 */
function validateStoredValue<T>(value: unknown, initialValue: T): value is T {
  const cacheKey = `${JSON.stringify(value)}_${typeof initialValue}`;
  const cached = validationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_DURATION) {
    return cached.result;
  }

  const isValid = typeof value === typeof initialValue;
  validationCache.set(cacheKey, { result: isValid, timestamp: Date.now() });
  return isValid;
}

/**
 * Custom hook for managing state in localStorage with cross-tab synchronization
 * @param key - Storage key
 * @param initialValue - Initial value for the state
 * @returns Tuple of current value and setter function
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void] {
  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getItem<T>(key, 'localStorage');
      if (item !== null && validateStoredValue(item, initialValue)) {
        return item;
      }
      // Initialize storage with initial value if no valid value found
      setItem(key, initialValue, 'localStorage');
      return initialValue;
    } catch (error) {
      console.warn(`Error reading from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return initialValue;
    }
  });

  // Debounced storage update function
  let debounceTimeout: NodeJS.Timeout;
  const debouncedSetItem = (value: T) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      try {
        setItem(key, value, 'localStorage');
      } catch (error) {
        console.error(`Error writing to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, DEBOUNCE_DELAY);
  };

  // Value setter function
  const setValue = (value: T | ((prevValue: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      setStoredValue(newValue);
      debouncedSetItem(newValue);
    } catch (error) {
      console.error(`Error setting value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle storage events for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue);
          if (validateStoredValue(newValue, initialValue)) {
            setStoredValue(newValue);
          }
        } catch (error) {
          console.warn(`Error processing storage event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(debounceTimeout);
      validationCache.clear();
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}