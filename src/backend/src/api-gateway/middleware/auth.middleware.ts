import { Request, Response, NextFunction } from 'express'; // v4.18.2
import jwt from 'jsonwebtoken'; // v9.0.0
import Redis from 'ioredis'; // v5.3.2
import rateLimit from 'express-rate-limit'; // v6.9.0

import { ErrorCodes } from '../../common/constants/error-codes';
import { Logger } from '../../common/utils/logger.util';
import { IAuthService } from '../../auth-service/interfaces/auth.interface';

// Initialize Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

/**
 * Extended Express Request interface with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
  rateLimit?: {
    remaining: number;
    reset: number;
  };
}

/**
 * Interface for role-based access configuration
 */
interface RoleConfig {
  allowedRoles: string[];
  requireAuth: boolean;
  permissions?: string[];
}

/**
 * Interface for rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailedRequests: boolean;
}

// Default rate limit configuration
const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000, // 1000 requests per hour
  skipFailedRequests: true,
};

/**
 * Enhanced authentication middleware with rate limiting and comprehensive validation
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check rate limit
    const ip = req.ip;
    const rateLimitKey = `ratelimit:${ip}`;
    const requests = await redis.incr(rateLimitKey);
    
    if (requests === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour expiry
    }

    if (requests > defaultRateLimitConfig.maxRequests) {
      Logger.warn('Rate limit exceeded', { ip, requests });
      res.status(429).json({
        success: false,
        message: 'Too many requests',
        errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
      });
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    // Validate token format
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Get auth service instance
    const authService = req.app.get('authService') as IAuthService;

    // Validate token and check blacklist
    const validationResult = await authService.validateToken(token);
    if (!validationResult.success || !validationResult.data) {
      throw new Error('Invalid or expired token');
    }

    // Attach user information to request
    req.user = {
      id: validationResult.data.userId,
      email: validationResult.data.email,
      role: validationResult.data.role,
      permissions: validationResult.data.permissions || [],
    };

    // Update rate limit information
    req.rateLimit = {
      remaining: defaultRateLimitConfig.maxRequests - requests,
      reset: await redis.ttl(rateLimitKey),
    };

    // Log successful authentication
    Logger.info('Authentication successful', {
      userId: req.user.id,
      role: req.user.role,
      ip,
    });

    next();
  } catch (error) {
    Logger.error('Authentication failed', error as Error, {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      errorCode: ErrorCodes.UNAUTHORIZED,
      error: (error as Error).message,
    });
  }
};

/**
 * Enhanced authorization middleware factory with comprehensive role-based access control
 */
export const authorize = (config: RoleConfig) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if authentication is required
      if (config.requireAuth && !req.user) {
        throw new Error('Authentication required');
      }

      // Verify user role
      if (config.allowedRoles.length > 0 && !config.allowedRoles.includes(req.user?.role || '')) {
        Logger.warn('Unauthorized access attempt', {
          userId: req.user?.id,
          role: req.user?.role,
          requiredRoles: config.allowedRoles,
        });
        
        throw new Error('Insufficient role permissions');
      }

      // Check specific permissions if configured
      if (config.permissions?.length > 0) {
        const hasRequiredPermissions = config.permissions.every(
          permission => req.user?.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          Logger.warn('Missing required permissions', {
            userId: req.user?.id,
            userPermissions: req.user?.permissions,
            requiredPermissions: config.permissions,
          });
          
          throw new Error('Insufficient permissions');
        }
      }

      // Log successful authorization
      Logger.info('Authorization successful', {
        userId: req.user?.id,
        role: req.user?.role,
        path: req.path,
      });

      next();
    } catch (error) {
      Logger.error('Authorization failed', error as Error, {
        userId: req.user?.id,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        message: 'Authorization failed',
        errorCode: ErrorCodes.FORBIDDEN,
        error: (error as Error).message,
      });
    }
  };
};

// Export interfaces for external use
export { AuthenticatedRequest };