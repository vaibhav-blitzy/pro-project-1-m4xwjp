/**
 * @packageDocumentation
 * @module UserService/Interfaces
 * @version 1.0.0
 * 
 * Core user interfaces and types for the User Service microservice.
 * Implements user model structure, roles, and operations with enhanced security features.
 */

import { UUID } from 'crypto'; // v20.0.0
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { HttpStatus } from '../../common/types';

/**
 * Enumeration of possible user roles in the system with strict access control.
 * Defines the hierarchy and permissions available to each user type.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  TEAM_MEMBER = 'TEAM_MEMBER',
  VIEWER = 'VIEWER'
}

/**
 * Enumeration of possible user account statuses for lifecycle management.
 * Controls user access and account state.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED'
}

/**
 * Interface for theme-specific settings
 */
interface ThemeSettings {
  mode: 'light' | 'dark';
  primaryColor: string;
  fontSize: number;
}

/**
 * Interface for dashboard layout preferences
 */
interface DashboardLayout {
  widgets: string[];
  layout: Record<string, { x: number; y: number; w: number; h: number }>;
}

/**
 * Interface for user-specific preferences and settings.
 * Manages user customization and notification preferences.
 */
export interface IUserPreferences {
  emailNotifications: boolean;
  timezone: string;
  language: string;
  themeSettings: ThemeSettings;
  dashboardLayout: DashboardLayout;
}

/**
 * Core user interface with enhanced security and PII handling.
 * Contains all user-related data with proper type safety.
 */
export interface IUser {
  id: UUID;
  email: string;
  name: string;
  hashedPassword: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date;
  lastPasswordChangeAt: Date;
  failedLoginAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  preferences: IUserPreferences;
}

/**
 * Extended service interface for user-specific operations with security features.
 * Implements additional user management operations beyond base CRUD.
 */
export interface IUserService extends IBaseService<IUser> {
  /**
   * Securely finds a user by their email address.
   * Implements rate limiting and logging for security.
   * 
   * @param email - User's email address
   * @returns Promise resolving to user data if found
   */
  findByEmail(email: string): Promise<ServiceResponse<IUser>>;

  /**
   * Securely updates a user's password with validation.
   * Enforces password policies and handles password history.
   * 
   * @param userId - User's unique identifier
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Promise resolving to password update status
   */
  updatePassword(
    userId: UUID,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse<boolean>>;

  /**
   * Updates a user's account status with audit logging.
   * Handles account state transitions and notifications.
   * 
   * @param userId - User's unique identifier
   * @param status - New account status
   * @param reason - Reason for status change
   * @returns Promise resolving to updated user data
   */
  updateStatus(
    userId: UUID,
    status: UserStatus,
    reason: string
  ): Promise<ServiceResponse<IUser>>;

  /**
   * Validates user session and updates last activity.
   * Implements session security and timeout handling.
   * 
   * @param sessionId - Session unique identifier
   * @returns Promise resolving to session validity status
   */
  validateSession(sessionId: UUID): Promise<ServiceResponse<boolean>>;
}