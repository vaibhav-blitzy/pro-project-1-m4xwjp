/**
 * @packageDocumentation
 * @module Database/Seeds
 * @version 1.0.0
 * 
 * Database seed file for creating the initial admin user with full system access privileges.
 * Implements secure password handling, comprehensive error management, and audit logging.
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import * as argon2 from 'argon2'; // v0.31.0
import * as winston from 'winston'; // v3.10.0
import * as PasswordValidator from 'password-validator'; // v5.3.0
import { UserModel } from '../../user-service/models/user.model';
import { UserRole, UserStatus } from '../../user-service/interfaces/user.interface';

// Environment-based configuration with defaults
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@taskmanager.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Initialize password validator with security requirements
const passwordSchema = new PasswordValidator()
  .is().min(12)
  .has().uppercase()
  .has().lowercase()
  .has().digits()
  .has().symbols()
  .not().spaces();

// Configure audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin-seed' },
  transports: [
    new winston.transports.File({ filename: 'logs/admin-seed.log' })
  ]
});

/**
 * Validates the admin password meets security requirements
 * 
 * @param password - Password to validate
 * @returns Promise resolving to validation result
 */
async function validateAdminPassword(password: string): Promise<boolean> {
  try {
    return passwordSchema.validate(password) as boolean;
  } catch (error) {
    auditLogger.error('Password validation error', { error });
    return false;
  }
}

/**
 * Creates the admin user with proper error handling and validation
 * 
 * @param prisma - PrismaClient instance
 * @returns Promise resolving when admin user is created
 */
async function createAdminUser(prisma: PrismaClient): Promise<void> {
  const userModel = new UserModel();

  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Check if admin already exists
      const existingAdmin = await userModel.findByEmail(DEFAULT_ADMIN_EMAIL);
      if (existingAdmin.success && existingAdmin.data) {
        auditLogger.info('Admin user already exists', { email: DEFAULT_ADMIN_EMAIL });
        return;
      }

      // Validate password
      const isPasswordValid = await validateAdminPassword(DEFAULT_ADMIN_PASSWORD);
      if (!isPasswordValid) {
        throw new Error('Admin password does not meet security requirements');
      }

      // Hash password with secure settings
      const hashedPassword = await argon2.hash(DEFAULT_ADMIN_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });

      // Create admin user
      const result = await userModel.create({
        email: DEFAULT_ADMIN_EMAIL,
        name: DEFAULT_ADMIN_NAME,
        hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastLoginAt: null,
        lastPasswordChangeAt: new Date(),
        preferences: {
          emailNotifications: true,
          timezone: 'UTC',
          language: 'en',
          themeSettings: {
            mode: 'light',
            primaryColor: '#1976d2',
            fontSize: 14
          },
          dashboardLayout: {
            widgets: [],
            layout: {}
          }
        }
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      auditLogger.info('Admin user created successfully', {
        email: DEFAULT_ADMIN_EMAIL,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    auditLogger.error('Failed to create admin user', { error });
    throw error;
  }
}

/**
 * Seeds the initial admin user with retry mechanism and proper cleanup
 * 
 * @returns Promise resolving when seeding is complete
 */
export default async function seed(): Promise<void> {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });

  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      await createAdminUser(prisma);
      auditLogger.info('Admin user seeding completed successfully');
      break;
    } catch (error) {
      lastError = error as Error;
      retryCount++;
      auditLogger.warn(`Seed attempt ${retryCount} failed`, { error });
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  await prisma.$disconnect();

  if (retryCount === MAX_RETRY_ATTEMPTS && lastError) {
    auditLogger.error('Admin user seeding failed after maximum retry attempts', { 
      attempts: MAX_RETRY_ATTEMPTS,
      error: lastError 
    });
    throw lastError;
  }
}