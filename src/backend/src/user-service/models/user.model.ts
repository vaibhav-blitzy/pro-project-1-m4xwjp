/**
 * @packageDocumentation
 * @module UserService/Models
 * @version 1.0.0
 * 
 * Enhanced User model implementation with security features, caching, and audit logging.
 * Implements core user data access layer with role-based access control and account management.
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import * as argon2 from 'argon2'; // v0.31.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import * as validator from 'validator'; // v13.9.0
import { AuditLogger } from '@company/audit-logger'; // v1.0.0
import { UserCache } from '@company/cache'; // v1.0.0
import { IUser, UserRole, UserStatus } from '../interfaces/user.interface';
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { HttpStatus } from '../../common/types';

/**
 * Configuration constants for security features
 */
const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_BLOCK_DURATION: 15 * 60, // 15 minutes
  CACHE_TTL: 3600, // 1 hour
  PASSWORD_HASH_CONFIG: {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  }
};

/**
 * Enhanced User model implementing secure data access layer with caching and audit logging
 */
export class UserModel {
  private prisma: PrismaClient;
  private cache: UserCache;
  private auditLogger: AuditLogger;
  private loginRateLimiter: RateLimiter;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn']
    });
    this.cache = new UserCache();
    this.auditLogger = new AuditLogger();
    this.loginRateLimiter = new RateLimiter({
      points: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
      duration: SECURITY_CONFIG.LOGIN_BLOCK_DURATION
    });
  }

  /**
   * Retrieves all users with caching and filtering support
   * 
   * @param filters - Optional filters to apply
   * @param pagination - Pagination parameters
   * @returns Promise resolving to filtered user list
   */
  async findAll(
    filters: Partial<IUser>,
    pagination: PaginationParams
  ): Promise<ServiceResponse<{ items: IUser[]; total: number }>> {
    try {
      const cacheKey = `users:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
      const cachedResult = await this.cache.get(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          message: 'Users retrieved from cache',
          data: cachedResult,
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      const where = this.buildWhereClause(filters);
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { [pagination.sortBy]: pagination.sortOrder.toLowerCase() }
        }),
        this.prisma.user.count({ where })
      ]);

      const result = { items: users, total };
      await this.cache.set(cacheKey, result, SECURITY_CONFIG.CACHE_TTL);

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: result,
        error: null,
        errorCode: null,
        metadata: { source: 'database' }
      };
    } catch (error) {
      await this.auditLogger.error('user.findAll.failed', { error });
      return {
        success: false,
        message: 'Failed to retrieve users',
        data: null,
        error: error as Error,
        errorCode: 'USER_FIND_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Creates a new user with secure password hashing and validation
   * 
   * @param userData - User data to create
   * @returns Promise resolving to created user
   */
  async create(userData: Partial<IUser>): Promise<ServiceResponse<IUser>> {
    try {
      // Validate email format
      if (!validator.isEmail(userData.email)) {
        return {
          success: false,
          message: 'Invalid email format',
          data: null,
          error: new Error('Invalid email format'),
          errorCode: 'INVALID_EMAIL',
          metadata: null
        };
      }

      // Validate password strength
      if (!this.validatePasswordStrength(userData.hashedPassword)) {
        return {
          success: false,
          message: 'Password does not meet security requirements',
          data: null,
          error: new Error('Invalid password'),
          errorCode: 'INVALID_PASSWORD',
          metadata: null
        };
      }

      // Hash password
      const hashedPassword = await argon2.hash(
        userData.hashedPassword,
        SECURITY_CONFIG.PASSWORD_HASH_CONFIG
      );

      // Create user in transaction
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            ...userData,
            hashedPassword,
            status: UserStatus.PENDING,
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
          }
        });

        await this.auditLogger.log('user.created', {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role
        });

        return newUser;
      });

      // Invalidate relevant caches
      await this.cache.invalidatePattern('users:*');

      return {
        success: true,
        message: 'User created successfully',
        data: user,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      await this.auditLogger.error('user.create.failed', { error });
      return {
        success: false,
        message: 'Failed to create user',
        data: null,
        error: error as Error,
        errorCode: 'USER_CREATE_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Validates login credentials with rate limiting
   * 
   * @param email - User email
   * @param password - User password
   * @returns Promise resolving to validation result
   */
  async validateLogin(email: string, password: string): Promise<ServiceResponse<boolean>> {
    try {
      const key = `login:${email}`;
      const rateLimitResult = await this.loginRateLimiter.get(key);

      if (rateLimitResult?.consumedPoints > SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        await this.auditLogger.warn('user.login.blocked', { email });
        return {
          success: false,
          message: 'Account temporarily locked due to too many failed attempts',
          data: false,
          error: new Error('Rate limit exceeded'),
          errorCode: 'LOGIN_RATE_LIMIT',
          metadata: { blockedFor: rateLimitResult.msBeforeNext }
        };
      }

      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        await this.loginRateLimiter.consume(key);
        return {
          success: false,
          message: 'Invalid credentials',
          data: false,
          error: new Error('User not found'),
          errorCode: 'INVALID_CREDENTIALS',
          metadata: null
        };
      }

      const isValid = await argon2.verify(user.hashedPassword, password);

      if (!isValid) {
        await this.loginRateLimiter.consume(key);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: { increment: 1 } }
        });
        await this.auditLogger.warn('user.login.failed', { userId: user.id });
        return {
          success: false,
          message: 'Invalid credentials',
          data: false,
          error: new Error('Invalid password'),
          errorCode: 'INVALID_CREDENTIALS',
          metadata: null
        };
      }

      await this.loginRateLimiter.delete(key);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0
        }
      });
      await this.auditLogger.info('user.login.success', { userId: user.id });

      return {
        success: true,
        message: 'Login successful',
        data: true,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      await this.auditLogger.error('user.login.error', { error });
      return {
        success: false,
        message: 'Login validation failed',
        data: false,
        error: error as Error,
        errorCode: 'LOGIN_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Validates password strength against security requirements
   * 
   * @param password - Password to validate
   * @returns boolean indicating if password meets requirements
   */
  private validatePasswordStrength(password: string): boolean {
    return (
      password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH &&
      validator.isStrongPassword(password, {
        minLength: SECURITY_CONFIG.PASSWORD_MIN_LENGTH,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })
    );
  }

  /**
   * Builds Prisma where clause from filters
   * 
   * @param filters - Filter parameters
   * @returns Prisma where clause
   */
  private buildWhereClause(filters: Partial<IUser>): any {
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    return where;
  }
}