import express from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import cors from 'cors'; // v2.8.5
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0
import CircuitBreaker from 'opossum'; // v7.1.0
import { Registry, collectDefaultMetrics } from 'prom-client'; // v14.2.0
import { createTerminus } from '@godaddy/terminus'; // v4.12.0

import { gatewayConfig } from './config/gateway-config';
import router from './routes';
import { Logger } from '../common/utils/logger.util';

// Initialize Express application
const app = express();
const logger = Logger.getInstance();

// Initialize Prometheus metrics
const metrics = new Registry();
collectDefaultMetrics({ register: metrics });

// Store circuit breakers for service calls
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Configures comprehensive middleware chain with security, monitoring, and performance optimizations
 * @param app - Express application instance
 */
function configureMiddleware(app: express.Application): void {
  // Security headers with strict CSP
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
    }
  }));

  // CORS configuration
  app.use(cors(gatewayConfig.corsOptions));

  // Request body parsing with size limits
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Response compression
  app.use(compression({
    level: 6,
    threshold: 1024
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));

  // Correlation ID middleware
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || 
                         `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.setCorrelationId(correlationId as string);
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', metrics.contentType);
      res.end(await metrics.metrics());
    } catch (error) {
      logger.error('Metrics collection failed', error as Error);
      res.status(500).send('Metrics collection failed');
    }
  });
}

/**
 * Sets up health check endpoints and monitoring
 * @param app - Express application instance
 */
function setupHealthChecks(app: express.Application): void {
  const healthCheck = async () => {
    const checks = {
      uptime: process.uptime(),
      responseTime: await pingDatabase(),
      circuitBreakers: getCircuitBreakersStatus()
    };

    return {
      status: 'healthy',
      checks,
      timestamp: new Date().toISOString()
    };
  };

  createTerminus(app, {
    healthChecks: {
      '/health': healthCheck,
      '/health/liveness': async () => {
        return { status: 'alive', timestamp: new Date().toISOString() };
      },
      '/health/readiness': async () => {
        const status = await checkDependencies();
        return { status, timestamp: new Date().toISOString() };
      }
    },
    timeout: 5000,
    signals: ['SIGTERM', 'SIGINT'],
    beforeShutdown: async () => {
      logger.info('Received shutdown signal, starting graceful shutdown');
      await gracefulShutdown(app);
    }
  });
}

/**
 * Handles graceful server shutdown with service cleanup
 * @param app - Express application instance
 */
async function gracefulShutdown(app: express.Application): Promise<void> {
  try {
    logger.info('Starting graceful shutdown');

    // Stop accepting new requests
    app.disable('trust proxy');

    // Close all circuit breakers
    for (const [name, breaker] of circuitBreakers.entries()) {
      logger.info(`Closing circuit breaker: ${name}`);
      breaker.shutdown();
    }

    // Wait for active requests to complete (30 seconds max)
    await new Promise(resolve => setTimeout(resolve, 30000));

    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
}

/**
 * Initializes and starts the API Gateway with graceful shutdown support
 */
async function startServer(): Promise<void> {
  try {
    // Configure middleware and routes
    configureMiddleware(app);
    setupHealthChecks(app);
    app.use('/api', router);

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', err);
      res.status(500).json({
        type: 'https://api.taskmanager.com/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: process.env.NODE_ENV === 'production' ? 
          'An internal error occurred' : err.message
      });
    });

    // Start server
    const server = app.listen(gatewayConfig.port, gatewayConfig.host, () => {
      logger.info(`API Gateway listening on ${gatewayConfig.host}:${gatewayConfig.port}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received');
      await gracefulShutdown(app);
      server.close();
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', reason as Error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start API Gateway', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export app instance for testing
export { app };