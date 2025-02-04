/**
 * @fileoverview Task Service Express Server Configuration
 * @module TaskService/Server
 * @version 1.0.0
 * 
 * Configures and initializes the Express server for the Task microservice
 * with security middleware, database connectivity, and error handling.
 */

import express from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { Container } from 'inversify'; // v6.0.1
import { InversifyExpressServer } from 'inversify-express-utils'; // v6.4.3
import { rateLimit } from 'express-rate-limit'; // v6.7.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import { TaskController } from './controllers/task.controller';
import { databaseConfig } from '../../common/config/database.config';
import { errorHandler } from '../../common/middleware/error-handler.middleware';
import { Logger } from '../../common/utils/logger.util';

// Environment variables with defaults
const PORT = process.env.TASK_SERVICE_PORT || 3002;
const HOST = process.env.TASK_SERVICE_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Rate limiter configuration for API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    type: 'about:blank',
    title: 'Too Many Requests',
    detail: 'Rate limit exceeded. Please try again later.',
    instance: '/api/v1/tasks'
  }
});

/**
 * CORS configuration with secure defaults
 */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Configures Express middleware stack with security, performance, and utility middleware
 * @param app - Express application instance
 */
const setupMiddleware = (app: express.Application): void => {
  // Security middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  
  // Performance middleware
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Rate limiting
  app.use('/api/', apiLimiter);
  
  // Request tracking
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    res.setHeader('X-Correlation-ID', correlationId);
    Logger.getInstance().setCorrelationId(correlationId);
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    Logger.getInstance().info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId: req.headers['x-correlation-id']
    });
    next();
  });
};

/**
 * Configures dependency injection container with service bindings
 * @returns Configured Container instance
 */
const setupContainer = (): Container => {
  const container = new Container();
  
  // Bind controllers
  container.bind<TaskController>(TaskController).toSelf();
  
  return container;
};

/**
 * Initializes and starts the Task service HTTP server
 */
const startServer = async (): Promise<void> => {
  try {
    // Validate database connection
    await databaseConfig.validateConnection();
    Logger.getInstance().info('Database connection validated successfully');

    // Create and configure Express application
    const container = setupContainer();
    const server = new InversifyExpressServer(container);
    
    server.setConfig((app) => {
      setupMiddleware(app);
    });

    server.setErrorConfig((app) => {
      app.use(errorHandler);
    });

    const app = server.build();

    // Start server
    app.listen(PORT, HOST, () => {
      Logger.getInstance().info(`Task service started successfully`, {
        port: PORT,
        host: HOST,
        environment: NODE_ENV
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      Logger.getInstance().info('SIGTERM received, shutting down gracefully');
      databaseConfig.pool.end();
      process.exit(0);
    });

    // Export app for testing
    export const testApp = app;

  } catch (error) {
    Logger.getInstance().error('Failed to start Task service', error as Error);
    process.exit(1);
  }
};

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}