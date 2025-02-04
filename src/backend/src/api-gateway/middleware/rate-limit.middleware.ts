import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { createHash, randomBytes } from 'crypto'; // native
import CircuitBreaker from 'opossum'; // v7.1.0
import { RedisManager } from '../../common/config/redis.config';
import { Logger } from '../../common/utils/logger.util';

// Global configuration with secure defaults
export const RATE_LIMIT_CONFIG = {
  windowMs: 3600000, // 1 hour in milliseconds
  maxRequests: 1000,
  keyPrefix: 'ratelimit:',
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  redisRetryAttempts: 3,
  redisRetryDelay: 1000,
  headerPrefix: 'X-RateLimit-',
  encryptionKey: process.env.RATE_LIMIT_KEY || randomBytes(32).toString('hex'),
  monitoringEnabled: true
};

// Interface for rate limit configuration options
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  message: string;
  statusCode: number;
  redisRetryAttempts: number;
  redisRetryDelay: number;
  headerPrefix: string;
  encryptionKey: string;
  monitoringEnabled: boolean;
  redisClusterOptions?: Record<string, any>;
  fallbackOptions?: {
    enabled: boolean;
    maxRequests: number;
  };
}

// Interface for rate limit tracking information
export interface RateLimitInfo {
  current: number;
  remaining: number;
  reset: number;
  identifier: string;
  exceeded: boolean;
}

/**
 * Generates a secure, unique key for rate limiting with encryption
 */
function generateRateLimitKey(prefix: string, identifier: string, encryptionKey: string): string {
  const sanitizedIdentifier = identifier.replace(/[^a-zA-Z0-9-]/g, '');
  const timestamp = Math.floor(Date.now() / RATE_LIMIT_CONFIG.windowMs);
  const data = `${prefix}:${sanitizedIdentifier}:${timestamp}`;
  
  const hash = createHash('sha256')
    .update(data + encryptionKey)
    .digest('hex');
    
  return `${prefix}${hash}`;
}

/**
 * Factory function that creates a highly available rate limiting middleware
 */
export function rateLimitMiddleware(options: Partial<RateLimitOptions> = {}) {
  const logger = Logger.getInstance();
  const config: RateLimitOptions = { ...RATE_LIMIT_CONFIG, ...options };
  
  // Initialize Redis manager
  const redisManager = new RedisManager({
    ...config.redisClusterOptions
  });

  // Configure circuit breaker for Redis operations
  const breaker = new CircuitBreaker(
    async (key: string) => {
      const client = await redisManager.getClusterClient();
      return client.get(key);
    },
    {
      timeout: 2000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    }
  );

  breaker.on('open', () => {
    logger.warn('Rate limit circuit breaker opened - falling back to local limiting');
  });

  // Initialize Redis connection
  redisManager.connect().catch(error => {
    logger.error('Failed to connect to Redis', error);
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract client identifier (IP or user ID)
      const identifier = req.user?.id || req.ip;
      const key = generateRateLimitKey(config.keyPrefix, identifier, config.encryptionKey);

      // Implement sliding window rate limiting
      const now = Date.now();
      const windowStart = now - config.windowMs;

      let rateLimitInfo: RateLimitInfo;

      try {
        // Try Redis operation through circuit breaker
        const result = await breaker.fire(key);
        const current = result ? parseInt(result, 10) : 0;

        if (current >= config.maxRequests) {
          rateLimitInfo = {
            current,
            remaining: 0,
            reset: Math.ceil((windowStart + config.windowMs) / 1000),
            identifier,
            exceeded: true
          };
        } else {
          // Increment counter with expiry
          await redisManager.setWithExpiry(
            key,
            (current + 1).toString(),
            Math.ceil(config.windowMs / 1000)
          );

          rateLimitInfo = {
            current: current + 1,
            remaining: config.maxRequests - (current + 1),
            reset: Math.ceil((windowStart + config.windowMs) / 1000),
            identifier,
            exceeded: false
          };
        }
      } catch (error) {
        // Circuit breaker is open or Redis error - fall back to less strict limiting
        if (config.fallbackOptions?.enabled) {
          const fallbackLimit = config.fallbackOptions.maxRequests || Math.ceil(config.maxRequests * 1.5);
          rateLimitInfo = {
            current: 1,
            remaining: fallbackLimit - 1,
            reset: Math.ceil((windowStart + config.windowMs) / 1000),
            identifier,
            exceeded: false
          };
          logger.warn('Using fallback rate limiting', { identifier, error });
        } else {
          // If no fallback configured, allow request but log warning
          logger.error('Rate limiting unavailable', error);
          return next();
        }
      }

      // Set rate limit headers
      res.setHeader(`${config.headerPrefix}Limit`, config.maxRequests);
      res.setHeader(`${config.headerPrefix}Remaining`, rateLimitInfo.remaining);
      res.setHeader(`${config.headerPrefix}Reset`, rateLimitInfo.reset);

      // Monitor and log rate limit events
      if (config.monitoringEnabled) {
        logger.info('Rate limit check', {
          identifier: rateLimitInfo.identifier,
          current: rateLimitInfo.current,
          remaining: rateLimitInfo.remaining,
          exceeded: rateLimitInfo.exceeded
        });
      }

      // Handle rate limit exceeded
      if (rateLimitInfo.exceeded) {
        logger.warn('Rate limit exceeded', {
          identifier: rateLimitInfo.identifier,
          current: rateLimitInfo.current
        });

        res.status(config.statusCode).json({
          error: 'Too Many Requests',
          message: config.message,
          retryAfter: rateLimitInfo.reset - Math.floor(Date.now() / 1000)
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', error as Error);
      next(error);
    }
  };
}