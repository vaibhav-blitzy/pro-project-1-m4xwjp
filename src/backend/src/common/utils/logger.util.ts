import winston from 'winston'; // v3.10.0
import * as config from 'dotenv'; // v16.3.1

// Initialize environment configuration
config.config();

// Global constants
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'json';

/**
 * Singleton logger class providing standardized logging functionality
 * with correlation ID tracking and ELK Stack integration.
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private correlationId: string;
  private options: winston.LoggerOptions;

  /**
   * Private constructor to enforce singleton pattern
   * Initializes winston logger with configured transports and formats
   */
  private constructor() {
    this.correlationId = '';
    this.options = {
      level: LOG_LEVEL,
      exitOnError: false,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        LOG_FORMAT === 'json' ? winston.format.json() : winston.format.simple()
      )
    };

    // Configure transports based on environment
    const transports: winston.transport[] = [
      new winston.transports.Console({
        handleExceptions: true,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.padLevels()
        )
      })
    ];

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: winston.format.json()
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: winston.format.json()
        })
      );
    }

    this.logger = winston.createLogger({
      ...this.options,
      transports
    });

    // Handle transport errors
    this.logger.on('error', (error) => {
      console.error('Logger transport error:', error);
    });
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set correlation ID for request tracking
   * @param correlationId - Unique identifier for request tracking
   */
  public setCorrelationId(correlationId: string): void {
    if (!correlationId || typeof correlationId !== 'string') {
      throw new Error('Invalid correlation ID');
    }
    // Sanitize correlation ID
    this.correlationId = correlationId.replace(/[^a-zA-Z0-9-]/g, '');
    this.debug('Correlation ID set', { correlationId: this.correlationId });
  }

  /**
   * Format metadata with standard fields
   * @param meta - Additional metadata to include in log
   * @returns Formatted metadata object
   */
  private formatMetadata(meta: Record<string, any> = {}): Record<string, any> {
    return {
      correlationId: this.correlationId,
      environment: process.env.NODE_ENV,
      service: process.env.SERVICE_NAME,
      ...meta,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log information level message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  public info(message: string, meta: Record<string, any> = {}): void {
    if (!message) {
      throw new Error('Log message is required');
    }
    this.logger.info(message, this.formatMetadata(meta));
  }

  /**
   * Log error level message
   * @param message - Error message
   * @param error - Error object
   * @param meta - Additional metadata
   */
  public error(message: string, error?: Error, meta: Record<string, any> = {}): void {
    if (!message) {
      throw new Error('Log message is required');
    }
    const errorMeta = {
      ...meta,
      stack: error?.stack,
      errorMessage: error?.message,
      errorName: error?.name
    };
    this.logger.error(message, this.formatMetadata(errorMeta));
  }

  /**
   * Log warning level message
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  public warn(message: string, meta: Record<string, any> = {}): void {
    if (!message) {
      throw new Error('Log message is required');
    }
    this.logger.warn(message, this.formatMetadata(meta));
  }

  /**
   * Log debug level message
   * @param message - Debug message
   * @param meta - Additional metadata
   */
  public debug(message: string, meta: Record<string, any> = {}): void {
    if (!message) {
      throw new Error('Log message is required');
    }
    if (this.logger.level === 'debug') {
      const debugMeta = {
        ...meta,
        debugInfo: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
        }
      };
      this.logger.debug(message, this.formatMetadata(debugMeta));
    }
  }
}

// Export singleton instance
export default Logger.getInstance();