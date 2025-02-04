/**
 * @fileoverview Authentication service entry point that configures and starts the Express server
 * with comprehensive security, monitoring, and error handling capabilities.
 * @module AuthService/Server
 * @version 1.0.0
 */

import express, { Express } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import rateLimit from 'express-rate-limit'; // v6.9.0
import { expressjwt } from 'express-jwt'; // v8.4.1
import { body, validationResult } from 'express-validator'; // v7.0.0
import promClient from 'prom-client'; // v14.2.0

import { AuthController } from './controllers/auth.controller';
import { databaseConfig } from '../common/config/database.config';
import { errorHandler } from '../common/middleware/error-handler.middleware';
import { Logger } from '../common/utils/logger.util';

// Initialize logger
const logger = Logger.getInstance();

// Environment variables with defaults
const {
  PORT = 3001,
  HOST = '0.0.0.0',
  RATE_LIMIT_WINDOW = 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX = 100,
  JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET must be provided'); })()
} = process.env;

/**
 * Configures comprehensive Express middleware stack with security,
 * monitoring, and utility middleware
 */
function setupMiddleware(app: Express): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Compression and parsing
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: Number(RATE_LIMIT_WINDOW),
    max: Number(RATE_LIMIT_MAX),
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  }));

  // JWT verification for protected routes
  app.use(
    '/api/v1/auth/protected',
    expressjwt({
      secret: JWT_SECRET,
      algorithms: ['HS512']
    })
  );

  // Prometheus metrics
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics({ prefix: 'auth_service_' });
}

/**
 * Configures authentication service routes with validation,
 * rate limiting, and error handling
 */
function setupRoutes(app: Express): void {
  const authController = new AuthController();

  // Login route with validation
  app.post(
    '/api/v1/auth/login',
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 8 }).trim()
    ],
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 attempts per window
    }),
    authController.login
  );

  // Token refresh route
  app.post(
    '/api/v1/auth/refresh',
    rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10 // 10 refresh attempts per hour
    }),
    authController.refreshToken
  );

  // Logout route
  app.post('/api/v1/auth/logout', authController.logout);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      await databaseConfig.validateConnection();
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    } catch (error) {
      res.status(500).end(error.message);
    }
  });

  // Global error handler
  app.use(errorHandler);
}

/**
 * Initializes and starts the Express server with comprehensive
 * error handling and monitoring
 */
export async function startServer(): Promise<void> {
  try {
    const app = express();

    // Initialize middleware
    setupMiddleware(app);

    // Initialize routes
    setupRoutes(app);

    // Validate database connection
    await databaseConfig.validateConnection();

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Auth service listening on ${HOST}:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start auth service', error);
    process.exit(1);
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(error => {
    logger.error('Unhandled server startup error', error);
    process.exit(1);
  });
}