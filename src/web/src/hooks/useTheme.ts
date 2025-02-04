/**
 * @fileoverview Custom React hook for managing application theme mode with system preference detection,
 * persistence, and Material-UI theme integration. Implements WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // v18.2.0
import type { Theme } from '@mui/material'; // v5.14.0
import type { ThemeMode } from '../types/common.types';
import { getTheme } from '../config/theme.config';
import { setItem, getItem } from '../utils/storage.utils';

// Constants
const THEME_STORAGE_KEY = 'theme-mode';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const TOGGLE_DEBOUNCE_DELAY = 150;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/**
 * Custom hook for managing application theme mode with system preference detection
 * @returns Object containing theme, themeMode, and toggleTheme function
 */
export function useTheme(): {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
} {
  // Initialize theme mode from storage or system preference
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      // Attempt to get stored theme preference
      const storedTheme = getItem<ThemeMode>(THEME_STORAGE_KEY, 'localStorage');
      if (storedTheme) {
        return storedTheme;
      }

      // Fall back to system preference
      if (window.matchMedia && window.matchMedia(MEDIA_QUERY).matches) {
        return 'DARK';
      }

      return 'LIGHT';
    } catch (error) {
      console.warn('Failed to get theme preference:', error);
      return 'LIGHT'; // Safe fallback
    }
  });

  // Generate Material-UI theme based on mode
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return getTheme(themeMode);
    } catch (error) {
      console.error('Failed to generate theme:', error);
      return getTheme('LIGHT'); // Fallback to light theme
    }
  });

  // Handle system preference changes
  useEffect(() => {
    let retryCount = 0;
    let mediaQuery: MediaQueryList | null = null;

    const setupMediaQuery = () => {
      try {
        mediaQuery = window.matchMedia(MEDIA_QUERY);
        
        const handleChange = (event: MediaQueryListEvent) => {
          // Only update if no user preference is stored
          if (!getItem<ThemeMode>(THEME_STORAGE_KEY, 'localStorage')) {
            const newMode: ThemeMode = event.matches ? 'DARK' : 'LIGHT';
            setThemeMode(newMode);
          }
        };

        // Add listener with error handling and retry mechanism
        const addListener = () => {
          try {
            // Modern API
            mediaQuery?.addEventListener('change', handleChange);
          } catch {
            try {
              // Fallback for older browsers
              mediaQuery?.addListener(handleChange);
            } catch (error) {
              if (retryCount < MAX_RETRY_ATTEMPTS) {
                retryCount++;
                setTimeout(addListener, RETRY_DELAY);
              } else {
                console.error('Failed to set up media query listener:', error);
              }
            }
          }
        };

        addListener();

        // Cleanup function
        return () => {
          try {
            // Modern API
            mediaQuery?.removeEventListener('change', handleChange);
          } catch {
            try {
              // Fallback for older browsers
              mediaQuery?.removeListener(handleChange);
            } catch (error) {
              console.error('Failed to remove media query listener:', error);
            }
          }
        };
      } catch (error) {
        console.error('Failed to initialize media query:', error);
        return undefined;
      }
    };

    const cleanup = setupMediaQuery();
    return () => cleanup?.();
  }, []);

  // Update theme when mode changes
  useEffect(() => {
    const updateTheme = async () => {
      try {
        // Measure theme generation performance
        const startTime = performance.now();
        const newTheme = getTheme(themeMode);
        const endTime = performance.now();

        // Log performance metrics
        if (endTime - startTime > 100) {
          console.warn('Theme generation took longer than expected:', endTime - startTime);
        }

        setTheme(newTheme);

        // Persist theme preference
        await persistThemePreference(themeMode);
      } catch (error) {
        console.error('Failed to update theme:', error);
        // Fallback to light theme if update fails
        setTheme(getTheme('LIGHT'));
      }
    };

    updateTheme();
  }, [themeMode]);

  // Persist theme preference with retry mechanism
  const persistThemePreference = async (mode: ThemeMode): Promise<void> => {
    let attempts = 0;
    const persist = async (): Promise<void> => {
      try {
        setItem(THEME_STORAGE_KEY, mode, 'localStorage');
      } catch (error) {
        if (attempts < MAX_RETRY_ATTEMPTS) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return persist();
        }
        throw error;
      }
    };
    return persist();
  };

  // Debounced theme toggle function
  const toggleTheme = useCallback(() => {
    let timeoutId: number;
    
    return () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setThemeMode(prevMode => prevMode === 'LIGHT' ? 'DARK' : 'LIGHT');
      }, TOGGLE_DEBOUNCE_DELAY);
    };
  }, []);

  return {
    theme,
    themeMode,
    toggleTheme: toggleTheme(),
  };
}