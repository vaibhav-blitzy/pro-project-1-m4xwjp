/**
 * @packageDocumentation
 * @module UserService/Services
 * @version 1.0.0
 * 
 * Enhanced user service implementing secure user management operations
 * with audit logging, rate limiting, caching, and data encryption.
 */

import { injectable } from 'inversify';
import * as argon2 from 'argon2'; // v0.31.0
import { createClient as createRedisClient } from 'redis'; // v4.6.8
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import winston from 'winston'; // v3.10.0
import { UUID } from 'crypto';

import { IUserService, IUser, UserRole, UserStatus } from '../interfaces/user.interface';
import { UserRepository } from '../repositories/user.repository';
import { encrypt, decrypt } from '../../common/utils/encryption.util';
import { validateInput, sanitizeInput } from '../../common/utils/validation.util';
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { ErrorCodes, ErrorMessages } from '../../common/constants/error-codes';

/**
 * Security configuration constants
 */
const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_BLOCK_DURATION: 900, // 15 minutes
  CACHE_TTL: 3600, // 1 hour
  RATE_LIMIT: {
    points: 100,
    duration: 3600 // 1 hour
  }
};

/**
 * Enhanced user service implementing secure user management operations
 */
@injectable()
export class UserService implements IUserService {
  private readonly userRepository: UserRepository;
  private readonly logger: winston.Logger;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly cacheClient: ReturnType<typeof createRedisClient>;

  /**
   * Initialize user service with required dependencies
   */
  constructor(
    userRepository: UserRepository,
    logger: winston.Logger,
    rateLimiter: RateLimiterRedis,
    cacheClient: ReturnType<typeof createRedisClient>
  ) {
    this.userRepository = userRepository;
    this.logger = logger;
    this.rateLimiter = rateLimiter;
    this.cacheClient = cacheClient;
  }

  /**
   * Find all users with pagination, filtering, and caching
   */
  public async findAll(
    filters: Partial<IUser>,
    pagination: PaginationParams
  ): Promise<ServiceResponse<{ items: IUser[]; total: number }>> {
    try {
      await this.rateLimiter.consume('findAll');

      const cacheKey = `users:list:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
      const cachedResult = await this.cacheClient.get(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          message: 'Users retrieved from cache',
          data: JSON.parse(cachedResult),
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      const result = await this.userRepository.findAll(filters, pagination);

      if (result.success && result.data) {
        await this.cacheClient.setEx(
          cacheKey,
          SECURITY_CONFIG.CACHE_TTL,
          JSON.stringify(result.data)
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve users', { error });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Find user by ID with caching
   */
  public async findById(id: UUID): Promise<ServiceResponse<IUser>> {
    try {
      await this.rateLimiter.consume(`findById:${id}`);

      const cacheKey = `users:${id}`;
      const cachedUser = await this.cacheClient.get(cacheKey);

      if (cachedUser) {
        return {
          success: true,
          message: 'User retrieved from cache',
          data: JSON.parse(cachedUser),
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      const result = await this.userRepository.findById(id);

      if (result.success && result.data) {
        await this.cacheClient.setEx(
          cacheKey,
          SECURITY_CONFIG.CACHE_TTL,
          JSON.stringify(result.data)
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to find user by ID', { error, userId: id });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Find user by email with rate limiting
   */
  public async findByEmail(email: string): Promise<ServiceResponse<IUser>> {
    try {
      await this.rateLimiter.consume(`findByEmail:${email}`);
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error('Failed to find user by email', { error, email });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Create new user with secure password handling
   */
  public async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<IUser>> {
    try {
      // Validate password strength
      if (!this.validatePasswordStrength(userData.hashedPassword)) {
        return {
          success: false,
          message: 'Password does not meet security requirements',
          data: null,
          error: new Error('Invalid password'),
          errorCode: ErrorCodes.VALIDATION_ERROR.toString(),
          metadata: null
        };
      }

      // Hash password
      const hashedPassword = await argon2.hash(userData.hashedPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });

      // Encrypt sensitive data
      const encryptedData = {
        ...userData,
        hashedPassword,
        email: await encrypt(userData.email),
        name: await encrypt(userData.name)
      };

      const result = await this.userRepository.create(encryptedData);

      // Invalidate relevant caches
      await this.invalidateUserCaches();

      return result;
    } catch (error) {
      this.logger.error('Failed to create user', { error });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Update user password with validation
   */
  public async updatePassword(
    userId: UUID,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user.success || !user.data) {
        return {
          success: false,
          message: 'User not found',
          data: false,
          error: new Error('User not found'),
          errorCode: ErrorCodes.NOT_FOUND.toString(),
          metadata: null
        };
      }

      // Verify current password
      const isValid = await argon2.verify(user.data.hashedPassword, currentPassword);

      if (!isValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
          data: false,
          error: new Error('Invalid password'),
          errorCode: ErrorCodes.VALIDATION_ERROR.toString(),
          metadata: null
        };
      }

      // Validate new password
      if (!this.validatePasswordStrength(newPassword)) {
        return {
          success: false,
          message: 'New password does not meet security requirements',
          data: false,
          error: new Error('Invalid password'),
          errorCode: ErrorCodes.VALIDATION_ERROR.toString(),
          metadata: null
        };
      }

      // Hash new password
      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });

      // Update password
      const result = await this.userRepository.update(userId, {
        hashedPassword,
        lastPasswordChangeAt: new Date()
      });

      return {
        success: result.success,
        message: result.success ? 'Password updated successfully' : 'Failed to update password',
        data: result.success,
        error: result.error,
        errorCode: result.errorCode,
        metadata: null
      };
    } catch (error) {
      this.logger.error('Failed to update password', { error, userId });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: false,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Update user status with audit logging
   */
  public async updateStatus(
    userId: UUID,
    status: UserStatus,
    reason: string
  ): Promise<ServiceResponse<IUser>> {
    try {
      const result = await this.userRepository.update(userId, {
        status,
        updatedAt: new Date()
      });

      if (result.success) {
        this.logger.info('User status updated', {
          userId,
          newStatus: status,
          reason,
          timestamp: new Date().toISOString()
        });

        await this.invalidateUserCaches();
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to update user status', { error, userId, status });
      return {
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR.toString(),
        metadata: null
      };
    }
  }

  /**
   * Validate password strength against security requirements
   */
  private validatePasswordStrength(password: string): boolean {
    return (
      password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH &&
      /[A-Z]/.test(password) && // Uppercase
      /[a-z]/.test(password) && // Lowercase
      /[0-9]/.test(password) && // Numbers
      /[^A-Za-z0-9]/.test(password) // Special characters
    );
  }

  /**
   * Invalidate user-related caches
   */
  private async invalidateUserCaches(): Promise<void> {
    const pattern = 'users:*';
    const keys = await this.cacheClient.keys(pattern);
    if (keys.length > 0) {
      await this.cacheClient.del(keys);
    }
  }
}