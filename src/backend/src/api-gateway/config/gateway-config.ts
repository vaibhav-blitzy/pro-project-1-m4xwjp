import express from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import compression from 'compression'; // v1.7.4
import { RedisManager } from '../../common/config/redis.config';
import { RABBITMQ_CONFIG } from '../../common/config/rabbitmq.config';
import { Logger } from '../../common/utils/logger.util';

/**
 * API Gateway Configuration
 * Defines comprehensive settings for routing, security, and service orchestration
 */
export const GATEWAY_CONFIG = {
  port: process.env.GATEWAY_PORT || 3000,
  host: process.env.GATEWAY_HOST || '0.0.0.0',
  apiVersion: process.env.API_VERSION || 'v1',
  rateLimitWindow: 60 * 60 * 1000, // 1 hour in milliseconds
  rateLimitMax: 1000, // 1000 requests per hour
  bodyLimit: '5mb',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  circuitBreaker: {
    timeout: 5000,
    resetTimeout: 30000,
    errorThreshold: 50
  },
  monitoring: {
    metricsInterval: 60000,
    healthCheckPath: '/health',
    metricsPath: '/metrics'
  }
} as const;

/**
 * Service Routes Configuration
 * Defines routing paths for microservices
 */
export const SERVICE_ROUTES = {
  auth: '/api/v1/auth',
  users: '/api/v1/users',
  projects: '/api/v1/projects',
  tasks: '/api/v1/tasks',
  notifications: '/api/v1/notifications'
} as const;

/**
 * Validates gateway configuration settings
 */
function validateConfig(config: typeof GATEWAY_CONFIG): boolean {
  const logger = Logger.getInstance();

  try {
    if (!config.port || !config.host) {
      throw new Error('Port and host configuration required');
    }

    if (config.rateLimitMax <= 0 || config.rateLimitWindow <= 0) {
      throw new Error('Invalid rate limiting configuration');
    }

    if (!config.corsOrigins || config.corsOrigins.length === 0) {
      throw new Error('CORS origins must be configured');
    }

    if (!config.circuitBreaker.timeout || !config.circuitBreaker.resetTimeout) {
      throw new Error('Circuit breaker configuration required');
    }

    return true;
  } catch (error) {
    logger.error('Gateway configuration validation failed', error as Error);
    return false;
  }
}

/**
 * Creates and configures the API Gateway with security and performance settings
 */
export function createGatewayConfig(): express.Application {
  const logger = Logger.getInstance();
  const app = express();

  if (!validateConfig(GATEWAY_CONFIG)) {
    throw new Error('Invalid gateway configuration');
  }

  // Security Headers Configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
  }));

  // CORS Configuration
  app.use(cors({
    origin: GATEWAY_CONFIG.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400
  }));

  // Rate Limiting Configuration
  const redisManager = new RedisManager({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  redisManager.connect().then(() => {
    logger.info('Redis connected for rate limiting');
  }).catch((error) => {
    logger.error('Redis connection failed', error);
  });

  // Request Parsing and Compression
  app.use(express.json({ limit: GATEWAY_CONFIG.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: GATEWAY_CONFIG.bodyLimit }));
  app.use(compression());

  // Health Check Endpoint
  app.get(GATEWAY_CONFIG.monitoring.healthCheckPath, async (req, res) => {
    try {
      const redisHealth = await redisManager.healthCheck();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          redis: redisHealth ? 'healthy' : 'unhealthy',
          rabbitmq: RABBITMQ_CONFIG.url ? 'configured' : 'not configured'
        }
      });
    } catch (error) {
      logger.error('Health check failed', error as Error);
      res.status(503).json({ status: 'unhealthy' });
    }
  });

  // Error Handling Middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Gateway error', err);
    res.status(500).json({
      type: 'https://problems.example.com/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message
    });
  });

  return app;
}

// Export gateway configuration
export const gatewayConfig = {
  port: GATEWAY_CONFIG.port,
  host: GATEWAY_CONFIG.host,
  corsOptions: {
    origin: GATEWAY_CONFIG.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  rateLimitOptions: {
    windowMs: GATEWAY_CONFIG.rateLimitWindow,
    max: GATEWAY_CONFIG.rateLimitMax
  },
  serviceRoutes: SERVICE_ROUTES,
  circuitBreakerOptions: GATEWAY_CONFIG.circuitBreaker,
  monitoringConfig: GATEWAY_CONFIG.monitoring
};