/**
 * @fileoverview Core TypeScript type definitions and utilities for the Task Management System
 * Provides comprehensive type safety and standardization across the frontend application
 * @version 1.0.0
 */

import type { ReactNode } from 'react'; // v18.2.0
import type { Theme } from '@mui/material'; // v5.14.0
import type { ApiResponse } from './api.types';

/**
 * Enum representing possible loading states for components and operations
 */
export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Theme mode options for the application
 */
export type ThemeMode = 'LIGHT' | 'DARK';

/**
 * Status options for entities in the system
 */
export type Status = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED';

/**
 * Priority levels for tasks and activities
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Standard component size variants
 */
export type ComponentSize = 'SMALL' | 'MEDIUM' | 'LARGE';

/**
 * Utility type for nullable values
 */
export type Nullable<T> = T | null;

/**
 * Utility type for optional values
 */
export type Optional<T> = T | undefined;

/**
 * Generic key-value dictionary type
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Comprehensive async operation state tracking
 */
export interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  timestamp: number;
  retryCount: number;
}

/**
 * Base props interface for all components
 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  testId?: string;
}

/**
 * Theme-aware component props
 */
export interface ThemedComponentProps extends BaseComponentProps {
  theme?: Theme;
  mode?: ThemeMode;
}

/**
 * Enhanced error type with additional context
 */
export interface EnhancedError extends Error {
  code?: string;
  details?: Dictionary<unknown>;
  timestamp?: number;
}

/**
 * Generic success response wrapper
 */
export type SuccessResponse<T> = ApiResponse<T> & {
  success: true;
  timestamp: number;
};

/**
 * Type guard for successful API responses
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.status >= 200 && response.status < 300;
}

/**
 * Utility type for component event handlers
 */
export type EventHandler<T = unknown> = (event: React.SyntheticEvent, data?: T) => void;

/**
 * Type for validation rules
 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
}

/**
 * Type for form field validation
 */
export type ValidationRules = Dictionary<ValidationRule>;

/**
 * Type for component ref handlers
 */
export type RefCallback<T> = (instance: T | null) => void;

/**
 * Type for memoization dependencies
 */
export type DependencyList = ReadonlyArray<unknown>;

/**
 * Type for component render functions
 */
export type RenderFunction<T = unknown> = (props: T) => ReactNode;

/**
 * Type for async operation options
 */
export interface AsyncOptions {
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
}

/**
 * Type for component lifecycle hooks
 */
export interface LifecycleHooks {
  onMount?: () => void | (() => void);
  onUnmount?: () => void;
  onUpdate?: (prevProps: unknown) => void;
}

/**
 * Type for component display options
 */
export interface DisplayOptions {
  visible?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

/**
 * Type for component animation states
 */
export type AnimationState = 'enter' | 'leave' | 'active' | 'inactive';

/**
 * Type for component transition options
 */
export interface TransitionOptions {
  duration?: number;
  delay?: number;
  easing?: string;
  onComplete?: () => void;
}