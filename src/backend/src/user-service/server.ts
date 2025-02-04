/**
 * @fileoverview Express server setup and configuration for the User Service microservice
 * @module UserService/Server
 * @version 1.0.0
 */

import express, { Express, Request, Response } from 'express'; // v4.18.2
import { Container } from 'inversify'; // v6.0.1
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { RateLimit } from 'express-rate-limit'; // v7.0.0
import { createClient } from 'redis'; // v4.6.7

import { UserController } from './controllers/user.controller';
import { databaseConfig } from '../../common/config/database.config';
import { errorHandler } from '../../common/middleware/error-handler.middleware';
import Logger from '../../common/utils/logger.util';

// Environment variables
const PORT = process.env.USER_SERVICE_PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

/**
 * Configures Express middleware stack with security and monitoring features
 * @param app - Express application instance
 */
const setupMiddleware = (app: Express): void => {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Rate limiting
  app.use(RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Correlation ID middleware
  app.use((req: Request, res: Response, next) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    Logger.setCorrelationId(correlationId as string);
    next();
  });

  // Request logging
  app.use((req: Request, res: Response, next) => {
    Logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId: req.headers['x-correlation-id']
    });
    next();
  });
};

/**
 * Configures API routes with proper middleware and validation
 * @param app - Express application instance
 * @param userController - User controller instance
 */
const setupRoutes = (app: Express, userController: UserController): void => {
  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    try {
      await databaseConfig.validateConnection();
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', error: error.message });
    }
  });

  // API routes
  const router = express.Router();

  router.get('/users', userController.getAll.bind(userController));
  router.get('/users/:id', userController.getById.bind(userController));
  router.post('/users', userController.create.bind(userController));
  router.put('/users/:id', userController.update.bind(userController));
  router.delete('/users/:id', userController.delete.bind(userController));

  app.use('/api/v1', router);

  // Error handling middleware
  app.use(errorHandler);
};

/**
 * Initializes and starts the user service
 */
export const startServer = async (): Promise<void> => {
  try {
    // Create Express application
    const app = express();

    // Set up dependency injection container
    const container = new Container();
    container.bind<UserController>(UserController).toSelf();

    // Initialize controllers
    const userController = container.get<UserController>(UserController);

    // Configure middleware
    setupMiddleware(app);

    // Set up routes
    setupRoutes(app, userController);

    // Validate database connection
    await databaseConfig.validateConnection();

    // Start server
    const server = app.listen(PORT, () => {
      Logger.info(`User Service started`, {
        port: PORT,
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      Logger.info('Shutting down User Service...');
      server.close(async () => {
        await databaseConfig.pool.end();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    Logger.error('Failed to start User Service', error);
    process.exit(1);
  }
};