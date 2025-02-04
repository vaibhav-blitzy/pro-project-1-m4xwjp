/**
 * @packageDocumentation
 * @module ProjectService
 * @version 1.0.0
 * 
 * Entry point for the project microservice implementing comprehensive project management
 * with support for hierarchy, resource allocation, and milestone tracking.
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import morgan from 'morgan'; // v1.10.0
import winston from 'winston'; // v3.10.0
import { register, collectDefaultMetrics } from 'prom-client'; // v14.2.0
import { ProjectController } from './controllers/project.controller';
import { databaseConfig } from '../../common/config/database.config';
import { HttpStatus } from '../../common/types';

// Environment variables
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const METRICS_PREFIX = 'project_service_';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/project-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/project-service-combined.log' })
  ]
});

/**
 * Initializes and configures the Express server with enhanced middleware
 */
const initializeServer = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging middleware
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));

  return app;
};

/**
 * Configures API routes for project management endpoints
 */
const setupRoutes = (app: Express, controller: ProjectController): void => {
  const apiRouter = express.Router();

  // Health check endpoint
  apiRouter.get('/health', (req: Request, res: Response) => {
    res.status(HttpStatus.OK).json({ status: 'healthy' });
  });

  // Metrics endpoint
  apiRouter.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Project management endpoints
  apiRouter.get('/projects', controller.getAll.bind(controller));
  apiRouter.get('/projects/:id', controller.getById.bind(controller));
  apiRouter.get('/projects/:id/hierarchy', controller.getProjectHierarchy.bind(controller));
  apiRouter.get('/projects/:id/resources', controller.getResources.bind(controller));
  apiRouter.get('/projects/:id/milestones', controller.getMilestones.bind(controller));
  apiRouter.post('/projects', controller.create.bind(controller));
  apiRouter.put('/projects/:id', controller.update.bind(controller));
  apiRouter.delete('/projects/:id', controller.delete.bind(controller));

  // Error handling middleware
  apiRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', { error: err });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
      error: NODE_ENV === 'development' ? err.message : undefined
    });
  });

  app.use('/api/v1', apiRouter);
};

/**
 * Starts the Express server with enhanced monitoring
 */
const startServer = async (app: Express): Promise<void> => {
  try {
    // Initialize metrics collection
    collectDefaultMetrics({
      prefix: METRICS_PREFIX,
      labels: { service: 'project_service' }
    });

    // Validate database connection
    await databaseConfig.validateConnection();

    // Start database monitoring
    setInterval(() => {
      databaseConfig.monitorHealth();
    }, 30000);

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Project service started on port ${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      logger.info('Shutting down project service...');
      server.close(async () => {
        await databaseConfig.pool.end();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start project service:', { error });
    process.exit(1);
  }
};

// Initialize and start the server
const app = initializeServer();
const projectController = new ProjectController();
setupRoutes(app, projectController);
startServer(app);

export { app };