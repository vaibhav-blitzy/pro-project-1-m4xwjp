import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { Logger } from '../utils/logger.util';
import { ErrorCodes } from '../constants/error-codes';

// Paths to exclude from logging
const EXCLUDED_PATHS = ['/health', '/metrics', '/favicon.ico'];

// Headers that contain sensitive information to mask
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

/**
 * Express middleware for comprehensive HTTP request/response logging
 * Implements performance tracking, security monitoring, and audit logging
 * Integrates with ELK Stack for centralized log management
 */
export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Skip logging for excluded paths
    if (EXCLUDED_PATHS.includes(req.path)) {
      return next();
    }

    // Generate and set correlation ID for request tracking
    const correlationId = uuidv4();
    Logger.setCorrelationId(correlationId);
    res.setHeader('X-Correlation-ID', correlationId);

    // Capture request start time for performance tracking
    const startTime = process.hrtime();
    const startMemory = process.memoryUsage();

    // Mask sensitive data in headers
    const maskedHeaders = { ...req.headers };
    SENSITIVE_HEADERS.forEach(header => {
      if (maskedHeaders[header]) {
        maskedHeaders[header] = '***masked***';
      }
    });

    // Log incoming request
    Logger.info('Incoming request', {
      type: 'request',
      method: req.method,
      path: req.path,
      query: req.query,
      headers: maskedHeaders,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Override response end method to capture response data
    const originalEnd = res.end;
    let responseBody: any;

    // @ts-ignore - Override res.end to capture response
    res.end = function(chunk: any, encoding: string) {
      // Capture response timing
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      // Calculate memory usage
      const endMemory = process.memoryUsage();
      const memoryDiff = {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        rss: endMemory.rss - startMemory.rss
      };

      // Capture response body if it exists
      if (chunk) {
        responseBody = chunk.toString();
      }

      // Log response details
      Logger.info('Outgoing response', {
        type: 'response',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        responseSize: Buffer.byteLength(responseBody || '', 'utf8'),
        memoryUsage: memoryDiff,
        timestamp: new Date().toISOString()
      });

      // Generate audit log for security monitoring
      if (res.statusCode >= 400) {
        Logger.error('Request error', new Error('Request failed'), {
          type: 'audit',
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          errorCode: res.statusCode >= 500 ? ErrorCodes.INTERNAL_SERVER_ERROR : undefined,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date().toISOString()
        });
      }

      // Call original end method
      return originalEnd.apply(res, arguments as any);
    };

    return next();
  } catch (error) {
    // Log middleware errors
    Logger.error('Logger middleware error', error as Error, {
      type: 'middleware_error',
      errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString()
    });
    return next(error);
  }
};