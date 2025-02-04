/**
 * @fileoverview TypeScript types and interfaces for user slice of Redux store
 * Implements comprehensive type safety for user management and state handling
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { IUser } from '../../interfaces/user.interface';
import { AsyncState } from '../../types/store.types';

/**
 * Enum for user-related Redux action types
 */
export enum UserActionTypes {
  FETCH_USERS = 'user/fetchUsers',
  FETCH_USER = 'user/fetchUser',
  CREATE_USER = 'user/createUser',
  UPDATE_USER = 'user/updateUser',
  DELETE_USER = 'user/deleteUser',
  SET_SELECTED_USER = 'user/setSelectedUser',
  UPDATE_FILTERS = 'user/updateFilters',
  UPDATE_PAGINATION = 'user/updatePagination',
  UPDATE_SEARCH = 'user/updateSearch',
  UPDATE_SORT = 'user/updateSort',
  CLEAR_ERROR = 'user/clearError'
}

/**
 * Interface for user slice filters
 */
export interface UserFilters {
  role?: string[];
  status?: string[];
  department?: string[];
  teams?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Interface for user slice pagination state
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Type for sort order options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Interface for the user slice of the Redux store
 * Implements comprehensive state management for users
 */
export interface UserState extends AsyncState {
  /** Array of all users */
  users: IUser[];
  /** Currently selected user */
  selectedUser: IUser | null;
  /** Active filters */
  filters: UserFilters;
  /** Pagination state */
  pagination: PaginationState;
  /** Search query string */
  searchQuery: string;
  /** Current sort configuration */
  sortOrder: SortOrder;
}

/**
 * Interface for user fetch parameters with filtering and sorting
 */
export interface FetchUsersParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Optional search query */
  search?: string;
  /** Optional role filter */
  role?: string[];
  /** Optional status filter */
  status?: string[];
  /** Optional sort field */
  sortBy?: string;
  /** Optional sort direction */
  sortOrder?: SortOrder;
  /** Optional department filter */
  department?: string[];
  /** Optional team filter */
  teams?: string[];
}

/**
 * Interface for creating a new user with required fields
 * Implements security considerations for PII data
 */
export interface CreateUserPayload {
  /** User email (PII) */
  email: string;
  /** User full name (PII) */
  name: string;
  /** Assigned role */
  role: string;
  /** Optional initial password */
  initialPassword?: string;
  /** Optional department */
  department?: string;
  /** Optional team assignments */
  teams?: string[];
  /** Optional preferences */
  preferences?: Record<string, any>;
}

/**
 * Interface for updating user details
 * Supports partial updates with proper type safety
 */
export interface UpdateUserPayload {
  /** User ID to update */
  id: string;
  /** Optional name update (PII) */
  name?: string;
  /** Optional role update */
  role?: string;
  /** Optional status update */
  status?: string;
  /** Optional department update */
  department?: string;
  /** Optional team assignments update */
  teams?: string[];
  /** Optional preferences update */
  preferences?: Record<string, any>;
}

/**
 * Type for user-related action payloads
 */
export type UserPayloadAction<T> = PayloadAction<T>;

/**
 * Type guard to check if a user has admin privileges
 */
export function isAdminUser(user: IUser): boolean {
  return user.role === 'ADMIN';
}

/**
 * Type guard to check if a user is active
 */
export function isActiveUser(user: IUser): boolean {
  return user.status === 'ACTIVE';
}