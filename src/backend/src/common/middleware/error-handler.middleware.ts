import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ErrorCodes } from '../constants/error-codes';
import { Logger } from '../utils/logger.util';

/**
 * Interface for RFC 7807 problem details error response with enhanced tracking
 */
export interface IErrorResponse {
  status: number;
  type: string;
  title: string;
  detail: string;
  instance: string;
  correlationId: string;
  errors?: Record<string, string[]>;
  metadata: IErrorMetadata;
}

/**
 * Interface for structured error metadata
 */
export interface IErrorMetadata {
  errorCode: string;
  errorCategory: string;
  timestamp: string;
  context: Record<string, any>;
}

/**
 * Error categories for classification
 */
const ErrorCategories = {
  VALIDATION: 'VALIDATION_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL: 'EXTERNAL_SERVICE_ERROR',
  SECURITY: 'SECURITY_ERROR',
  SYSTEM: 'SYSTEM_ERROR'
} as const;

/**
 * Maps error types to appropriate error categories
 * @param error - Error object to categorize
 * @returns Error category string
 */
const categorizeError = (error: any): string => {
  if (error.name === 'ValidationError' || error.code === ErrorCodes.VALIDATION_ERROR) {
    return ErrorCategories.VALIDATION;
  }
  if (error.name === 'DatabaseError' || error.code === ErrorCodes.DATABASE_ERROR) {
    return ErrorCategories.DATABASE;
  }
  if (error.name === 'ExternalServiceError' || error.code === ErrorCodes.EXTERNAL_SERVICE_ERROR) {
    return ErrorCategories.EXTERNAL;
  }
  if (error.status === 401 || error.status === 403) {
    return ErrorCategories.SECURITY;
  }
  return ErrorCategories.SYSTEM;
};

/**
 * Formats error response according to RFC 7807 with enhanced metadata
 * @param error - Error object to format
 * @param req - Express request object
 * @param correlationId - Request correlation ID
 * @returns Formatted error response
 */
const formatErrorResponse = (error: any, req: Request, correlationId: string): IErrorResponse => {
  const status = error.status || error.statusCode || 500;
  const errorCode = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
  const category = categorizeError(error);
  
  const response: IErrorResponse = {
    status,
    type: `https://api.taskmanager.com/errors/${errorCode}`,
    title: error.title || error.message || 'Internal Server Error',
    detail: error.detail || error.message || 'An unexpected error occurred',
    instance: req.originalUrl,
    correlationId,
    metadata: {
      errorCode: errorCode.toString(),
      errorCategory: category,
      timestamp: new Date().toISOString(),
      context: {
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent: req.get('user-agent'),
        ip: req.ip
      }
    }
  };

  // Add validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  return response;
};

/**
 * Express middleware for centralized error handling
 * Implements RFC 7807 problem details specification
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Generate correlation ID if not present
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Set correlation ID in logger
  Logger.getInstance().setCorrelationId(correlationId);

  // Log error with context
  Logger.getInstance().error(
    'Request error occurred',
    error,
    {
      correlationId,
      path: req.path,
      method: req.method,
      errorCode: error.code,
      errorCategory: categorizeError(error)
    }
  );

  // Format error response
  const errorResponse = formatErrorResponse(error, req, correlationId);

  // Set response headers
  res.set({
    'Content-Type': 'application/problem+json',
    'X-Correlation-ID': correlationId
  });

  // Remove sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.metadata.context.query;
    if (error.stack) {
      delete error.stack;
    }
  }

  return res.status(errorResponse.status).json(errorResponse);
};
```

This implementation provides:

1. RFC 7807 compliant error responses with enhanced tracking capabilities
2. Correlation ID generation and tracking across requests
3. Structured error logging with context
4. Error categorization for better monitoring
5. Security-conscious information handling
6. Integration with the existing logging system
7. Comprehensive error metadata collection
8. Production-safe error responses

The middleware can be used in Express applications by adding it as the last middleware in the chain to catch all errors:

```typescript
app.use(errorHandler);