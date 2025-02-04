/**
 * @fileoverview Common TypeScript interfaces for the Task Management System frontend
 * Provides reusable interface patterns and data structures across the application
 * @version 1.0.0
 */

import { ReactNode } from 'react'; // v18.2.0
import { Theme } from '@mui/material'; // v5.14.0
import { LoadingState } from '../types/common.types';

/**
 * Base interface for React component props providing common properties
 */
export interface BaseProps {
  /** Optional CSS class name for styling */
  className?: string;
  /** React children elements */
  children?: ReactNode;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Data test ID for testing purposes */
  testId?: string;
}

/**
 * Generic base interface for component state management
 * @template T The type of data being managed
 */
export interface BaseComponentState<T> {
  /** Boolean flag indicating if a loading operation is in progress */
  loading: boolean;
  /** Current loading state from the LoadingState enum */
  loadingState: LoadingState;
  /** Error message if an error occurred, null otherwise */
  error: string | null;
  /** The actual data of type T, null if not loaded */
  data: T | null;
  /** Timestamp of the last state update */
  timestamp: number;
}

/**
 * Base interface for entity models with versioning support
 */
export interface BaseEntity {
  /** Unique identifier for the entity */
  id: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Entity version number for optimistic locking */
  version: number;
}

/**
 * Interface for theme configuration including RTL support
 */
export interface ThemeConfig {
  /** Theme mode selection */
  mode: 'light' | 'dark' | 'system';
  /** Material-UI theme object */
  theme: Theme;
  /** Text direction for internationalization */
  direction: 'ltr' | 'rtl';
}

/**
 * Interface for pagination parameters with sorting and filtering
 */
export interface PaginationParams {
  /** Current page number (0-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Field to sort by */
  sortBy: string;
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
  /** Optional filters as key-value pairs */
  filters: Record<string, unknown>;
}

/**
 * Enhanced interface for error response structure with validation support
 */
export interface ErrorResponse {
  /** Error message */
  message: string;
  /** Application-specific error code */
  code: number;
  /** HTTP status code */
  status: number;
  /** Error timestamp */
  timestamp: number;
  /** Unique request identifier for tracking */
  requestId: string;
  /** Additional error details */
  details: Record<string, unknown>;
  /** Array of field-level validation errors */
  validationErrors: Array<{
    /** Field that failed validation */
    field: string;
    /** Validation error message */
    message: string;
  }>;
}