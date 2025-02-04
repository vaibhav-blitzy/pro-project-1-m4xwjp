/**
 * @packageDocumentation
 * @module Tests/Fixtures
 * @version 1.0.0
 * 
 * Test fixtures for user entities with enhanced security, data classification,
 * and PII handling across unit, integration and e2e tests.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { 
  IUser,
  UserRole,
  UserStatus
} from '../../src/user-service/interfaces/user.interface';

// Test constants
const TEST_USER_PASSWORD = 'Test123!@#';
const TEST_USER_PREFERENCES = {
  emailNotifications: true,
  timezone: 'UTC',
  language: 'en',
  themeSettings: {
    mode: 'light' as const,
    primaryColor: '#1976d2',
    fontSize: 14
  },
  dashboardLayout: {
    widgets: ['tasks', 'calendar', 'notifications'],
    layout: {
      tasks: { x: 0, y: 0, w: 2, h: 2 },
      calendar: { x: 2, y: 0, w: 2, h: 2 },
      notifications: { x: 0, y: 2, w: 4, h: 1 }
    }
  }
};

// Data classification levels for security testing
const DATA_CLASSIFICATION_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
} as const;

type DataClassification = typeof DATA_CLASSIFICATION_LEVELS[keyof typeof DATA_CLASSIFICATION_LEVELS];

/**
 * Creates a test user object with specified role, status, and data classification
 * 
 * @param role - User role for access control testing
 * @param status - Account status for lifecycle testing
 * @param classification - Data classification level for security testing
 * @returns Test user object with security metadata
 */
export const createTestUser = (
  role: UserRole,
  status: UserStatus,
  classification: DataClassification
): IUser => {
  const now = new Date();
  const userId = uuidv4();
  
  // Create base user with proper security attributes
  const user: IUser = {
    id: userId,
    email: `test.${role.toLowerCase()}@example.com`,
    name: `Test ${role.replace('_', ' ')}`,
    hashedPassword: TEST_USER_PASSWORD, // Note: In real app this would be hashed
    role: role,
    status: status,
    lastLoginAt: now,
    lastPasswordChangeAt: now,
    failedLoginAttempts: 0,
    preferences: TEST_USER_PREFERENCES,
    createdAt: now,
    updatedAt: now
  };

  // Apply data classification masking based on classification level
  if (classification === DATA_CLASSIFICATION_LEVELS.RESTRICTED) {
    user.email = '***RESTRICTED***';
    user.name = '***RESTRICTED***';
  }

  return user;
};

/**
 * Pre-defined test user fixtures with various roles, statuses and classifications
 */
export const testUsers = {
  // Administrative users
  admin: createTestUser(
    UserRole.ADMIN,
    UserStatus.ACTIVE,
    DATA_CLASSIFICATION_LEVELS.RESTRICTED
  ),
  
  // Management users
  projectManager: createTestUser(
    UserRole.PROJECT_MANAGER,
    UserStatus.ACTIVE,
    DATA_CLASSIFICATION_LEVELS.CONFIDENTIAL
  ),
  
  // Team users
  teamLead: createTestUser(
    UserRole.TEAM_LEAD,
    UserStatus.ACTIVE,
    DATA_CLASSIFICATION_LEVELS.INTERNAL
  ),
  teamMember: createTestUser(
    UserRole.TEAM_MEMBER,
    UserStatus.ACTIVE,
    DATA_CLASSIFICATION_LEVELS.INTERNAL
  ),
  viewer: createTestUser(
    UserRole.VIEWER,
    UserStatus.ACTIVE,
    DATA_CLASSIFICATION_LEVELS.PUBLIC
  ),

  // Special status users for testing
  inactiveUser: createTestUser(
    UserRole.TEAM_MEMBER,
    UserStatus.INACTIVE,
    DATA_CLASSIFICATION_LEVELS.INTERNAL
  ),
  pendingUser: createTestUser(
    UserRole.TEAM_MEMBER,
    UserStatus.PENDING,
    DATA_CLASSIFICATION_LEVELS.INTERNAL
  ),
  blockedUser: createTestUser(
    UserRole.TEAM_MEMBER,
    UserStatus.BLOCKED,
    DATA_CLASSIFICATION_LEVELS.RESTRICTED
  )
};

// Export both the factory function and pre-defined fixtures
export { createTestUser, testUsers };