/**
 * @fileoverview TypeScript interfaces and types for user-related data structures
 * Implements comprehensive user management, role-based access control, and data security
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';

/**
 * Enumeration of user roles with corresponding access levels
 * Based on the system's role-based access control requirements
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  TEAM_MEMBER = 'TEAM_MEMBER',
  VIEWER = 'VIEWER'
}

/**
 * Enumeration of possible user account statuses
 * Used for access control and account management
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED'
}

/**
 * Core user entity interface extending BaseEntity
 * Implements comprehensive user data fields with PII considerations
 */
export interface IUser extends BaseEntity {
  /** User's email address (PII) */
  email: string;
  /** User's full name (PII) */
  name: string;
  /** User's assigned role for access control */
  role: UserRole;
  /** Current account status */
  status: UserStatus;
  /** Timestamp of last successful login */
  lastLoginAt: Date | null;
  /** User preferences and settings */
  preferences: Record<string, any>;
  /** URL to user's avatar image */
  avatarUrl: string | null;
  /** Array of specific permissions */
  permissions: string[];
  /** MFA enablement status */
  mfaEnabled: boolean;
  /** User's timezone for localization */
  timezone: string;
}

/**
 * Interface for user customizable preferences and settings
 * Supports extensive customization options for user experience
 */
export interface IUserPreferences {
  /** UI theme preference */
  theme: string;
  /** Interface language selection */
  language: string;
  /** Email notification settings */
  emailNotifications: boolean;
  /** Push notification settings */
  pushNotifications: boolean;
  /** Dark mode preference */
  darkMode: boolean;
  /** Granular notification settings */
  notificationSettings: Record<string, boolean>;
  /** Default view preference */
  defaultView: string;
  /** Items to display per page */
  itemsPerPage: number;
}

/**
 * Interface for user profile data optimized for UI display
 * Contains essential user information with PII considerations
 */
export interface IUserProfile {
  /** User's unique identifier */
  id: string;
  /** User's display name (PII) */
  name: string;
  /** User's email address (PII) */
  email: string;
  /** User's role in the system */
  role: string;
  /** URL to user's avatar image */
  avatarUrl: string;
  /** User's customized preferences */
  preferences: IUserPreferences;
  /** User's team associations */
  teams: string[];
  /** User's department */
  department: string;
  /** User's job position */
  position: string;
  /** User's join date */
  joinDate: Date;
}

/**
 * Type guard to check if a user has admin privileges
 * @param user The user object to check
 * @returns True if the user is an admin
 */
export function isAdmin(user: IUser): boolean {
  return user.role === UserRole.ADMIN;
}

/**
 * Type guard to check if a user has project management privileges
 * @param user The user object to check
 * @returns True if the user is a project manager or admin
 */
export function isProjectManager(user: IUser): boolean {
  return user.role === UserRole.PROJECT_MANAGER || user.role === UserRole.ADMIN;
}

/**
 * Type guard to check if a user account is active
 * @param user The user object to check
 * @returns True if the user account is active
 */
export function isActiveUser(user: IUser): boolean {
  return user.status === UserStatus.ACTIVE;
}

/**
 * Type for user session data with security considerations
 */
export interface IUserSession {
  /** Session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** IP address of last access */
  lastIpAddress: string;
  /** User agent of last access */
  lastUserAgent: string;
  /** MFA verification status */
  mfaVerified: boolean;
}

/**
 * Interface for user notification preferences
 * Supports granular notification control
 */
export interface IUserNotificationPreferences {
  /** Task assignment notifications */
  taskAssignments: boolean;
  /** Task updates notifications */
  taskUpdates: boolean;
  /** Project updates notifications */
  projectUpdates: boolean;
  /** Team mentions notifications */
  mentions: boolean;
  /** System announcements */
  systemAnnouncements: boolean;
  /** Deadline reminders */
  deadlineReminders: boolean;
}