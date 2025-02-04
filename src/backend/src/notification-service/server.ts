import express, { Application } from 'express'; // v4.18.2
import { Container } from 'inversify'; // v6.0.1
import { InversifyExpressServer } from 'inversify-express-utils'; // v6.4.3
import * as amqp from 'amqplib'; // v0.10.3
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v6.9.0
import CircuitBreaker from 'opossum'; // v7.1.0
import { MetricsCollector } from 'prom-client'; // v14.2.0

import { NotificationController } from './controllers/notification.controller';
import { databaseConfig } from '../../common/config/database.config';
import { errorHandler } from '../../common/middleware/error-handler.middleware';
import { Logger } from '../../common/utils/logger.util';
import { RABBITMQ_CONFIG, createConnection, createChannel, setupQueues } from '../../common/config/rabbitmq.config';

// Environment variables with defaults
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3003;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const MAX_RETRIES = process.env.MAX_RETRIES || 3;
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000;
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || 100;

/**
 * Configures Express middleware and security settings
 * @param app - Express application instance
 */
function setupMiddleware(app: Application): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: Number(RATE_LIMIT_WINDOW),
    max: Number(RATE_LIMIT_MAX),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || Date.now().toString();
    Logger.getInstance().setCorrelationId(correlationId as string);
    Logger.getInstance().info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId
    });
    next();
  });

  // Error handling
  app.use(errorHandler);
}

/**
 * Establishes connection to RabbitMQ with enhanced reliability
 */
async function setupMessageQueue(): Promise<void> {
  const logger = Logger.getInstance();
  const breaker = new CircuitBreaker(createConnection, {
    timeout: 10000,
    resetTimeout: 30000,
    errorThresholdPercentage: 50
  });

  breaker.fallback(() => {
    logger.error('Message queue connection failed, using fallback mechanism');
    // Implement fallback mechanism (e.g., local queue)
  });

  try {
    const connection = await breaker.fire();
    const channel = await createChannel(connection);
    await setupQueues(channel);

    // Setup event handlers
    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error', error);
    });

    channel.on('error', (error) => {
      logger.error('RabbitMQ channel error', error);
    });

    logger.info('Message queue setup completed');
  } catch (error) {
    logger.error('Failed to setup message queue', error as Error);
    throw error;
  }
}

/**
 * Initializes and starts the notification service
 */
async function startServer(): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    // Initialize metrics collector
    const metrics = new MetricsCollector();
    metrics.collectDefaultMetrics();

    // Create and configure IoC container
    const container = new Container();
    container.bind<NotificationController>(NotificationController).toSelf();

    // Create Express server
    const server = new InversifyExpressServer(container);

    server.setConfig((app) => {
      setupMiddleware(app);
      
      // Health check endpoint
      app.get('/health', async (req, res) => {
        const dbHealth = await databaseConfig.healthCheck();
        res.json({
          status: 'UP',
          timestamp: new Date().toISOString(),
          database: dbHealth,
          version: process.env.npm_package_version
        });
      });

      // Metrics endpoint
      app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metrics.contentType);
        res.end(await metrics.metrics());
      });
    });

    const app = server.build();

    // Validate database connection
    await databaseConfig.validateConnection();
    logger.info('Database connection validated');

    // Setup message queue
    await setupMessageQueue();
    logger.info('Message queue initialized');

    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
      logger.info(`Notification service listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        await databaseConfig.pool.end();
        logger.info('Database connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Export for testing and programmatic use
export { startServer };

// Start server if running directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}