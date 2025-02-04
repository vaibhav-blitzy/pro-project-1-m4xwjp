/**
 * @fileoverview Core application constants and configuration values
 * Implements Material Design 3 specifications and responsive design principles
 * @version 1.0.0
 */

import { LoadingState } from '../types/common.types';

/**
 * Core application configuration
 */
export const APP_CONFIG = {
  APP_NAME: 'Task Management System',
  APP_VERSION: '1.0.0',
  API_VERSION: 'v1',
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LOCALES: ['en', 'es', 'fr', 'de', 'ja'],
  DEFAULT_LOADING_STATE: LoadingState.IDLE,
} as const;

/**
 * Material Design 3 theme configuration
 * @see https://m3.material.io/
 */
export const THEME_CONSTANTS = {
  COLOR_TOKENS: {
    primary: 'rgb(103, 80, 164)',
    onPrimary: 'rgb(255, 255, 255)',
    primaryContainer: 'rgb(234, 221, 255)',
    secondary: 'rgb(98, 91, 113)',
    surface: 'rgb(255, 251, 254)',
    error: 'rgb(179, 38, 30)',
    onError: 'rgb(255, 255, 255)',
    background: 'rgb(255, 251, 254)',
    onBackground: 'rgb(28, 27, 31)',
    outline: 'rgb(121, 116, 126)',
    surfaceVariant: 'rgb(231, 224, 236)',
  },
  TYPOGRAPHY: {
    displayLarge: {
      fontSize: '57px',
      lineHeight: '64px',
      fontWeight: '400',
      letterSpacing: '-0.25px',
    },
    displayMedium: {
      fontSize: '45px',
      lineHeight: '52px',
      fontWeight: '400',
    },
    displaySmall: {
      fontSize: '36px',
      lineHeight: '44px',
      fontWeight: '400',
    },
    headlineLarge: {
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: '400',
    },
    bodyLarge: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: '400',
    },
    bodyMedium: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: '400',
    },
  },
  ELEVATION: {
    level1: '0px 1px 3px rgba(0,0,0,0.12)',
    level2: '0px 2px 6px rgba(0,0,0,0.14)',
    level3: '0px 4px 8px rgba(0,0,0,0.16)',
    level4: '0px 6px 10px rgba(0,0,0,0.20)',
    level5: '0px 8px 12px rgba(0,0,0,0.24)',
  },
} as const;

/**
 * Animation timing configurations
 */
export const ANIMATION_TIMINGS = {
  DURATION: {
    short: 200,
    medium: 300,
    long: 500,
    extraLong: 700,
  },
  EASING: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },
} as const;

/**
 * Responsive design breakpoints following Material Design guidelines
 * Uses mobile-first approach
 */
export const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440,
  xl: 1920,
} as const;

/**
 * Grid system configuration based on 8px grid
 */
export const GRID = {
  BASE_SPACING: 8,
  MULTIPLIER: {
    SMALL: 0.5,
    MEDIUM: 1,
    LARGE: 2,
    XLARGE: 4,
  },
  CONTAINER_PADDING: 16,
  COLUMN_GAP: 24,
  LAYOUT_SPACING: {
    section: 32,
    component: 16,
    element: 8,
  },
  CONTAINER_WIDTHS: {
    sm: '100%',
    md: '720px',
    lg: '960px',
    xl: '1280px',
  },
} as const;

/**
 * Z-index stacking order
 */
export const Z_INDEX = {
  modal: 1000,
  overlay: 900,
  drawer: 800,
  dropdown: 700,
  header: 600,
  tooltip: 500,
} as const;

/**
 * Common border radius values
 */
export const BORDER_RADIUS = {
  none: '0px',
  small: '4px',
  medium: '8px',
  large: '16px',
  round: '50%',
} as const;

/**
 * Media query breakpoint generators
 */
export const MEDIA_QUERIES = {
  up: (breakpoint: keyof typeof BREAKPOINTS) =>
    `@media (min-width: ${BREAKPOINTS[breakpoint]}px)`,
  down: (breakpoint: keyof typeof BREAKPOINTS) =>
    `@media (max-width: ${BREAKPOINTS[breakpoint] - 0.02}px)`,
  between: (start: keyof typeof BREAKPOINTS, end: keyof typeof BREAKPOINTS) =>
    `@media (min-width: ${BREAKPOINTS[start]}px) and (max-width: ${
      BREAKPOINTS[end] - 0.02
    }px)`,
} as const;