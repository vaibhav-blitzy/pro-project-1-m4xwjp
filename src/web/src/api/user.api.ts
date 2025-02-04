/**
 * @fileoverview Enhanced API client for user-related operations with security, caching, and error handling
 * Implements user management requirements from technical specifications
 * @version 1.0.0
 */

import { apiService } from '../services/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { transformResponse } from '../utils/api.utils';
import { validateRequest } from '../utils/validation.utils';
import cacheManager from 'cache-manager'; // v4.0.0

/**
 * Interface for user profile data
 */
interface IUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for user preferences
 */
interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  language: string;
  timezone: string;
}

/**
 * Interface for user list filters
 */
interface IUserFilters {
  role?: string;
  status?: string;
  search?: string;
}

/**
 * Interface for pagination parameters
 */
interface IPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Enhanced API client for user-related operations
 * Implements comprehensive security and caching
 */
class UserApi {
  private readonly cache: cacheManager.Cache;
  private readonly CACHE_TTL = 5 * 60; // 5 minutes
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {
    // Initialize in-memory cache with TTL
    this.cache = cacheManager.caching({
      store: 'memory',
      max: 100,
      ttl: this.CACHE_TTL
    });
  }

  /**
   * Retrieves current user's profile with caching
   * @returns Promise resolving to user profile
   */
  public async getProfile(): Promise<IUserProfile> {
    const cacheKey = 'user_profile';
    
    // Try to get from cache first
    const cachedProfile = await this.cache.get<IUserProfile>(cacheKey);
    if (cachedProfile) {
      return cachedProfile;
    }

    try {
      const response = await apiService.get(
        API_ENDPOINTS.USERS.PROFILE,
        {},
        { timeout: this.REQUEST_TIMEOUT }
      );

      const profile = transformResponse<IUserProfile>(response);
      
      // Cache the profile
      await this.cache.set(cacheKey, profile.data);
      
      return profile.data;
    } catch (error) {
      throw transformResponse(error);
    }
  }

  /**
   * Updates user profile with validation
   * @param profileData Partial profile data to update
   * @returns Promise resolving to updated profile
   */
  public async updateProfile(profileData: Partial<IUserProfile>): Promise<IUserProfile> {
    // Validate profile data
    await validateRequest(profileData, {
      name: { required: true, minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' }
    });

    try {
      const response = await apiService.put(
        API_ENDPOINTS.USERS.PROFILE,
        profileData,
        {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            'X-Request-Timestamp': Date.now().toString()
          }
        }
      );

      const profile = transformResponse<IUserProfile>(response);
      
      // Invalidate profile cache
      await this.cache.del('user_profile');
      
      return profile.data;
    } catch (error) {
      throw transformResponse(error);
    }
  }

  /**
   * Retrieves user preferences with caching
   * @returns Promise resolving to user preferences
   */
  public async getPreferences(): Promise<IUserPreferences> {
    const cacheKey = 'user_preferences';
    
    // Try to get from cache first
    const cachedPreferences = await this.cache.get<IUserPreferences>(cacheKey);
    if (cachedPreferences) {
      return cachedPreferences;
    }

    try {
      const response = await apiService.get(
        API_ENDPOINTS.USERS.PREFERENCES,
        {},
        { timeout: this.REQUEST_TIMEOUT }
      );

      const preferences = transformResponse<IUserPreferences>(response);
      
      // Cache the preferences
      await this.cache.set(cacheKey, preferences.data);
      
      return preferences.data;
    } catch (error) {
      throw transformResponse(error);
    }
  }

  /**
   * Updates user preferences with validation
   * @param preferences Partial preferences to update
   * @returns Promise resolving to updated preferences
   */
  public async updatePreferences(preferences: Partial<IUserPreferences>): Promise<IUserPreferences> {
    // Validate preferences
    await validateRequest(preferences, {
      theme: { required: false, enum: ['light', 'dark', 'system'] },
      language: { required: false, pattern: /^[a-z]{2}-[A-Z]{2}$/ }
    });

    try {
      const response = await apiService.put(
        API_ENDPOINTS.USERS.PREFERENCES,
        preferences,
        { timeout: this.REQUEST_TIMEOUT }
      );

      const updatedPreferences = transformResponse<IUserPreferences>(response);
      
      // Invalidate preferences cache
      await this.cache.del('user_preferences');
      
      return updatedPreferences.data;
    } catch (error) {
      throw transformResponse(error);
    }
  }

  /**
   * Retrieves paginated user list with filtering
   * @param pagination Pagination parameters
   * @param filters Optional user filters
   * @returns Promise resolving to paginated user list
   */
  public async getAllUsers(
    pagination: IPaginationParams,
    filters?: IUserFilters
  ): Promise<{ users: IUserProfile[]; total: number }> {
    // Validate pagination parameters
    await validateRequest(pagination, {
      page: { required: true, min: 1 },
      limit: { required: true, min: 1, max: 100 }
    });

    try {
      const response = await apiService.get(
        API_ENDPOINTS.USERS.BASE,
        {
          ...pagination,
          ...filters
        },
        { timeout: this.REQUEST_TIMEOUT }
      );

      return transformResponse<{ users: IUserProfile[]; total: number }>(response).data;
    } catch (error) {
      throw transformResponse(error);
    }
  }
}

// Export singleton instance
export const userApi = new UserApi();