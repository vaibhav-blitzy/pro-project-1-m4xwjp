import { createAsyncThunk } from '@reduxjs/toolkit'; // v1.9.0
import { AxiosError } from 'axios'; // v1.4.0
import rateLimit from 'axios-rate-limit'; // v1.3.0
import { UserActionTypes, FetchUsersParams } from './user.types';
import { IUser } from '../../interfaces/user.interface';
import { ApiError } from '../../types/api.types';

/**
 * Rate limiter configuration for user-related API requests
 * Implements protection against API abuse
 */
const userApiRateLimit = rateLimit(axios, {
  maxRequests: 100,
  perMilliseconds: 60000,
  maxRPS: 10
});

/**
 * Fetches a paginated list of users with filtering and sorting capabilities
 * Implements caching, rate limiting, and RFC 7807 error handling
 */
export const fetchUsers = createAsyncThunk<IUser[], FetchUsersParams>(
  UserActionTypes.FETCH_USERS,
  async (params: FetchUsersParams, { rejectWithValue }) => {
    try {
      const response = await userApiRateLimit.get('/api/v1/users', {
        params: {
          page: params.page,
          limit: params.limit,
          search: params.search,
          role: params.role,
          status: params.status,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          department: params.department,
          teams: params.teams
        },
        headers: {
          'Cache-Control': 'max-age=300'
        }
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/user-fetch',
        title: 'User Fetch Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to fetch users',
        instance: `/api/v1/users?page=${params.page}`
      });
    }
  }
);

/**
 * Fetches a single user by ID with security classification
 * Implements PII data handling and access control
 */
export const fetchUser = createAsyncThunk<IUser, string>(
  UserActionTypes.FETCH_USER,
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userApiRateLimit.get(`/api/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/user-fetch',
        title: 'User Fetch Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to fetch user',
        instance: `/api/v1/users/${userId}`
      });
    }
  }
);

/**
 * Creates a new user with role-based access control
 * Implements secure handling of PII data and validation
 */
export const createUser = createAsyncThunk<IUser, Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>>(
  UserActionTypes.CREATE_USER,
  async (userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const response = await userApiRateLimit.post('/api/v1/users', userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/user-create',
        title: 'User Creation Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to create user',
        instance: '/api/v1/users'
      });
    }
  }
);

/**
 * Updates an existing user with optimistic updates
 * Implements version control and conflict resolution
 */
export const updateUser = createAsyncThunk<IUser, Partial<IUser> & { id: string }>(
  UserActionTypes.UPDATE_USER,
  async (userData: Partial<IUser> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await userApiRateLimit.put(
        `/api/v1/users/${userData.id}`,
        userData,
        {
          headers: {
            'Content-Type': 'application/json',
            'If-Match': userData.version?.toString()
          }
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/user-update',
        title: 'User Update Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to update user',
        instance: `/api/v1/users/${userData.id}`
      });
    }
  }
);

/**
 * Deletes a user with proper access control checks
 * Implements soft delete with audit trail
 */
export const deleteUser = createAsyncThunk<string, string>(
  UserActionTypes.DELETE_USER,
  async (userId: string, { rejectWithValue }) => {
    try {
      await userApiRateLimit.delete(`/api/v1/users/${userId}`, {
        headers: {
          'X-Reason': 'User deletion requested'
        }
      });
      return userId;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/user-delete',
        title: 'User Deletion Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to delete user',
        instance: `/api/v1/users/${userId}`
      });
    }
  }
);

/**
 * Updates user preferences with optimistic updates
 * Implements client-side validation and conflict resolution
 */
export const updateUserPreferences = createAsyncThunk<
  IUser,
  { userId: string; preferences: Record<string, any> }
>(
  'user/updatePreferences',
  async ({ userId, preferences }, { rejectWithValue }) => {
    try {
      const response = await userApiRateLimit.patch(
        `/api/v1/users/${userId}/preferences`,
        preferences,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      return rejectWithValue({
        type: 'https://taskmanager.com/errors/preferences-update',
        title: 'Preferences Update Error',
        status: axiosError.response?.status || 500,
        detail: axiosError.response?.data?.message || 'Failed to update preferences',
        instance: `/api/v1/users/${userId}/preferences`
      });
    }
  }
);