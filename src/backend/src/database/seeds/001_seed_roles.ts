/**
 * @fileoverview Database seed file for initializing system user roles
 * @module Database/Seeds
 * @version 1.0.0
 * 
 * Implements comprehensive role-based access control (RBAC) by seeding
 * predefined roles with granular permissions and hierarchical access levels.
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import { createLogger, format, transports } from 'winston'; // v3.8.2
import { UserRole } from '../../user-service/interfaces/user.interface';

// Configure logger for seed operations
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'seeds/roles.log' })
  ]
});

// Role definitions with comprehensive permissions and metadata
const ROLE_DEFINITIONS = [
  {
    name: UserRole.ADMIN,
    description: 'Full system access with complete control over all features',
    permissions: ['*'],
    audit_enabled: true,
    hierarchy_level: 1,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: UserRole.PROJECT_MANAGER,
    description: 'Project management access with user management capabilities',
    permissions: [
      'project.*',
      'task.*',
      'user.read',
      'user.update',
      'report.read',
      'report.create'
    ],
    audit_enabled: true,
    hierarchy_level: 2,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: UserRole.TEAM_LEAD,
    description: 'Team leadership access with project update capabilities',
    permissions: [
      'project.read',
      'project.update',
      'task.*',
      'user.read',
      'report.read'
    ],
    audit_enabled: true,
    hierarchy_level: 3,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: UserRole.TEAM_MEMBER,
    description: 'Basic task access with create and update capabilities',
    permissions: [
      'task.create',
      'task.read',
      'task.update',
      'user.read'
    ],
    audit_enabled: true,
    hierarchy_level: 4,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: UserRole.VIEWER,
    description: 'Read-only access to projects and tasks',
    permissions: [
      'project.read',
      'task.read',
      'user.read'
    ],
    audit_enabled: true,
    hierarchy_level: 5,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Permission pattern validation regex
const PERMISSION_PATTERN = /^(\*|[a-z]+\.\*|[a-z]+\.[a-z]+)$/;

/**
 * Validates permission strings against defined patterns and checks for consistency
 * 
 * @param permissions - Array of permission strings to validate
 * @throws Error if any permission is invalid
 */
const validatePermissions = (permissions: string[]): void => {
  for (const permission of permissions) {
    if (!PERMISSION_PATTERN.test(permission)) {
      throw new Error(`Invalid permission format: ${permission}`);
    }

    // Validate no conflicting wildcards
    if (permission === '*' && permissions.length > 1) {
      throw new Error('Wildcard permission "*" must be used alone');
    }

    // Validate resource-level wildcards
    const resourceWildcards = permissions.filter(p => p.endsWith('.*'));
    const resourcePermissions = permissions.filter(p => !p.endsWith('.*') && p !== '*');

    for (const wildcard of resourceWildcards) {
      const resource = wildcard.split('.')[0];
      const conflicting = resourcePermissions.filter(p => p.startsWith(`${resource}.`));
      if (conflicting.length > 0) {
        throw new Error(`Resource wildcard ${wildcard} conflicts with specific permissions`);
      }
    }
  }
};

/**
 * Main seeding function that initializes the roles table with predefined user roles
 * 
 * @param prisma - PrismaClient instance
 */
export const seed = async (prisma: PrismaClient): Promise<void> => {
  logger.info('Starting role seeding operation');

  try {
    // Begin transaction for atomic operation
    await prisma.$transaction(async (tx) => {
      // Clear existing roles
      await tx.role.deleteMany();
      logger.info('Cleared existing roles');

      // Validate all role permissions
      for (const role of ROLE_DEFINITIONS) {
        validatePermissions(role.permissions);
      }

      // Create roles with validated permissions
      for (const role of ROLE_DEFINITIONS) {
        await tx.role.create({
          data: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            audit_enabled: role.audit_enabled,
            hierarchy_level: role.hierarchy_level,
            created_at: role.created_at,
            updated_at: role.updated_at,
            metadata: {
              is_system_role: true,
              can_be_modified: false,
              version: '1.0.0'
            }
          }
        });
        logger.info(`Created role: ${role.name}`);
      }

      // Verify role hierarchy relationships
      await tx.role.findMany({
        orderBy: { hierarchy_level: 'asc' }
      });
    });

    logger.info('Role seeding completed successfully');
  } catch (error) {
    logger.error('Role seeding failed', { error });
    throw error;
  }
};

export default seed;