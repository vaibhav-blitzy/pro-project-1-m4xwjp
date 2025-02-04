/**
 * @packageDocumentation
 * @module UserService/Controllers
 * @version 1.0.0
 * 
 * Enhanced REST API controller implementing secure user management endpoints
 * with comprehensive validation, monitoring, and audit logging features.
 */

import { Request, Response } from 'express'; // v4.18.2
import { injectable } from 'inversify'; // v6.0.1
import { createClient } from 'redis'; // v4.6.7
import { RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { UUID } from 'crypto';

import { IBaseController } from '../../common/interfaces/base-controller.interface';
import { UserService } from '../services/user.service';
import { IUser, UserRole, UserStatus } from '../interfaces/user.interface';
import { validateInput, ValidationError } from '../../common/utils/validation.util';
import { encrypt } from '../../common/utils/encryption.util';
import Logger from '../../common/utils/logger.util';
import { ErrorCodes, ErrorMessages, HttpStatusCodes } from '../../common/constants/error-codes';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  points: 100,
  duration: 3600, // 1 hour
  blockDuration: 900, // 15 minutes
  prefix: 'user-api:'
};

/**
 * Enhanced User Controller implementing secure REST endpoints
 */
@injectable()
export class UserController implements IBaseController<IUser> {
  private readonly userService: UserService;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly logger: typeof Logger;

  /**
   * Initialize controller with required dependencies
   */
  constructor(userService: UserService) {
    this.userService = userService;
    this.logger = Logger;
    
    // Initialize rate limiter
    const redisClient = createClient({
      url: process.env.REDIS_URL
    });
    
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: RATE_LIMIT_CONFIG.points,
      duration: RATE_LIMIT_CONFIG.duration,
      blockDuration: RATE_LIMIT_CONFIG.blockDuration,
      keyPrefix: RATE_LIMIT_CONFIG.prefix
    });
  }

  /**
   * GET /users
   * Retrieves paginated list of users with filtering
   */
  public async getAll(
    req: Request<{}, {}, {}, { page?: number; limit?: number; role?: UserRole; status?: UserStatus }>,
    res: Response
  ): Promise<Response> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume(req.ip);

      // Validate query parameters
      const { page = 1, limit = 10, role, status } = req.query;
      const filters = { role, status };

      // Set correlation ID for request tracking
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      const result = await this.userService.findAll(filters, {
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters
      });

      if (!result.success) {
        return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        metadata: result.metadata
      });

    } catch (error) {
      this.logger.error('Failed to retrieve users', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /users/:id
   * Retrieves a single user by ID
   */
  public async getById(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      
      const { id } = req.params;
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      const result = await this.userService.findById(id as UUID);

      if (!result.success) {
        return res.status(HttpStatusCodes.NOT_FOUND).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'User retrieved successfully',
        data: result.data
      });

    } catch (error) {
      this.logger.error('Failed to retrieve user', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /users
   * Creates a new user with secure password handling
   */
  public async create(
    req: Request<{}, {}, Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      // Validate request body
      const validation = await validateInput(req.body, /* user schema */);
      if (!validation.isValid) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Encrypt sensitive data
      const userData = {
        ...validation.data,
        email: await encrypt(validation.data.email),
        name: await encrypt(validation.data.name)
      };

      const result = await this.userService.create(userData);

      if (!result.success) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.CREATED).json({
        success: true,
        message: 'User created successfully',
        data: result.data
      });

    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /users/:id
   * Updates an existing user
   */
  public async update(
    req: Request<{ id: string }, {}, Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>>>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      
      const { id } = req.params;
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      // Validate request body
      const validation = await validateInput(req.body, /* user update schema */);
      if (!validation.isValid) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const result = await this.userService.update(id as UUID, validation.data);

      if (!result.success) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'User updated successfully',
        data: result.data
      });

    } catch (error) {
      this.logger.error('Failed to update user', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /users/:id/password
   * Updates user password with validation
   */
  public async updatePassword(
    req: Request<{ id: string }, {}, { currentPassword: string; newPassword: string }>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      const result = await this.userService.updatePassword(
        id as UUID,
        currentPassword,
        newPassword
      );

      if (!result.success) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to update password', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /users/:id/status
   * Updates user status with audit logging
   */
  public async updateStatus(
    req: Request<{ id: string }, {}, { status: UserStatus; reason: string }>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      
      const { id } = req.params;
      const { status, reason } = req.body;
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      const result = await this.userService.updateStatus(
        id as UUID,
        status,
        reason
      );

      if (!result.success) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'User status updated successfully',
        data: result.data
      });

    } catch (error) {
      this.logger.error('Failed to update user status', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /users/:id
   * Deletes a user with audit logging
   */
  public async delete(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response> {
    try {
      await this.rateLimiter.consume(req.ip);
      
      const { id } = req.params;
      this.logger.setCorrelationId(req.headers['x-correlation-id'] as string);

      const result = await this.userService.delete(id as UUID);

      if (!result.success) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json({
          success: false,
          message: result.message,
          error: result.error,
          errorCode: result.errorCode
        });
      }

      return res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      this.logger.error('Failed to delete user', error as Error);
      return res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ErrorMessages[ErrorCodes.INTERNAL_SERVER_ERROR],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}