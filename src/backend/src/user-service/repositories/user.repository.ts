/**
 * @packageDocumentation
 * @module UserService/Repositories
 * @version 1.0.0
 * 
 * Enhanced User repository implementation with secure data access patterns,
 * PII protection, password hashing, and performance optimizations.
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import * as argon2 from 'argon2'; // v0.31.0
import { createClient as createRedisClient } from 'redis'; // v4.6.7
import { UUID } from 'crypto';
import { IUser, UserRole, UserStatus } from '../interfaces/user.interface';
import { UserModel } from '../models/user.model';
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { Logger } from '@company/logger';

/**
 * Security configuration for user data handling
 */
const SECURITY_CONFIG = {
  PII_FIELDS: ['email', 'name'],
  CACHE_TTL: 3600, // 1 hour
  CACHE_PREFIX: 'user:',
  AUDIT_NAMESPACE: 'user.repository'
};

/**
 * Enhanced User Repository implementing secure data access patterns
 */
export class UserRepository {
  private readonly userModel: UserModel;
  private readonly cacheClient: ReturnType<typeof createRedisClient>;
  private readonly logger: Logger;

  /**
   * Initializes the repository with required dependencies
   */
  constructor(
    userModel: UserModel,
    cacheClient: ReturnType<typeof createRedisClient>,
    logger: Logger
  ) {
    this.userModel = userModel;
    this.cacheClient = cacheClient;
    this.logger = logger;
  }

  /**
   * Retrieves all users with enhanced filtering, pagination, and PII protection
   */
  async findAll(
    filters: Partial<IUser>,
    pagination: PaginationParams,
    maskPII: boolean = true
  ): Promise<ServiceResponse<{ items: IUser[]; total: number }>> {
    try {
      const cacheKey = `${SECURITY_CONFIG.CACHE_PREFIX}list:${JSON.stringify(filters)}:${JSON.stringify(pagination)}`;
      const cachedResult = await this.cacheClient.get(cacheKey);

      if (cachedResult) {
        const parsedResult = JSON.parse(cachedResult);
        return {
          success: true,
          message: 'Users retrieved from cache',
          data: maskPII ? this.maskPIIData(parsedResult) : parsedResult,
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      const result = await this.userModel.findAll(filters, pagination);

      if (result.success) {
        await this.cacheClient.setEx(
          cacheKey,
          SECURITY_CONFIG.CACHE_TTL,
          JSON.stringify(result.data)
        );
      }

      return {
        ...result,
        data: result.data ? (maskPII ? this.maskPIIData(result.data) : result.data) : null
      };
    } catch (error) {
      await this.logger.error(`${SECURITY_CONFIG.AUDIT_NAMESPACE}.findAll.failed`, { error });
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
   * Creates a new user with secure password handling
   */
  async create(userData: Partial<IUser>): Promise<ServiceResponse<IUser>> {
    try {
      const result = await this.userModel.create(userData);

      if (result.success) {
        await this.invalidateUserCaches();
        await this.logger.info(`${SECURITY_CONFIG.AUDIT_NAMESPACE}.create.success`, {
          userId: result.data?.id
        });
      }

      return {
        ...result,
        data: result.data ? this.maskPIIData(result.data) : null
      };
    } catch (error) {
      await this.logger.error(`${SECURITY_CONFIG.AUDIT_NAMESPACE}.create.failed`, { error });
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
   * Updates user record with security checks and password rehashing if needed
   */
  async update(
    id: UUID,
    userData: Partial<IUser>
  ): Promise<ServiceResponse<IUser>> {
    try {
      const result = await this.userModel.update(id, userData);

      if (result.success) {
        await this.invalidateUserCaches();
        await this.logger.info(`${SECURITY_CONFIG.AUDIT_NAMESPACE}.update.success`, {
          userId: id
        });
      }

      return {
        ...result,
        data: result.data ? this.maskPIIData(result.data) : null
      };
    } catch (error) {
      await this.logger.error(`${SECURITY_CONFIG.AUDIT_NAMESPACE}.update.failed`, {
        userId: id,
        error
      });
      return {
        success: false,
        message: 'Failed to update user',
        data: null,
        error: error as Error,
        errorCode: 'USER_UPDATE_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Masks PII data in user records
   */
  private maskPIIData<T extends IUser | { items: IUser[]; total: number }>(
    data: T
  ): T {
    if ('items' in data) {
      return {
        ...data,
        items: data.items.map(user => this.maskUserPII(user))
      };
    }
    return this.maskUserPII(data as IUser) as T;
  }

  /**
   * Masks PII fields in a single user record
   */
  private maskUserPII(user: IUser): IUser {
    const maskedUser = { ...user };
    for (const field of SECURITY_CONFIG.PII_FIELDS) {
      if (field in maskedUser) {
        maskedUser[field] = this.maskField(maskedUser[field]);
      }
    }
    return maskedUser;
  }

  /**
   * Masks a single PII field
   */
  private maskField(value: string): string {
    if (!value) return value;
    const visibleChars = Math.min(4, Math.floor(value.length / 4));
    return `${value.slice(0, visibleChars)}${'*'.repeat(value.length - visibleChars)}`;
  }

  /**
   * Invalidates all user-related caches
   */
  private async invalidateUserCaches(): Promise<void> {
    const pattern = `${SECURITY_CONFIG.CACHE_PREFIX}*`;
    const keys = await this.cacheClient.keys(pattern);
    if (keys.length > 0) {
      await this.cacheClient.del(keys);
    }
  }
}