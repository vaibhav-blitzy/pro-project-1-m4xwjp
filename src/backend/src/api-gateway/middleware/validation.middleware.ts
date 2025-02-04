/**
 * @file Express middleware for comprehensive request validation and sanitization
 * Implements RFC 7807 problem details for validation errors with security controls
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { Schema } from 'joi'; // v17.9.2
import { validateInput } from '../../common/utils/validation.util';
import { ErrorCodes } from '../../common/constants/error-codes';
import Logger from '../../common/utils/logger.util';

/**
 * Configuration options for validation middleware
 */
export interface ValidationMiddlewareOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  sanitize?: boolean;
  sanitizationRules?: Record<string, any>;
  maxRequestSize?: number;
  enableSchemaCache?: boolean;
}

/**
 * Default middleware options following security best practices
 */
const DEFAULT_OPTIONS: ValidationMiddlewareOptions = {
  abortEarly: false,
  stripUnknown: true,
  sanitize: true,
  maxRequestSize: 5 * 1024 * 1024, // 5MB
  enableSchemaCache: true,
  sanitizationRules: {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }
};

// Schema cache for performance optimization
const schemaCache = new Map<string, Schema>();

/**
 * Creates a validation middleware with enhanced security controls
 * @param schema - Joi validation schema
 * @param options - Validation middleware options
 * @returns Express middleware function
 */
export function createValidationMiddleware(
  schema: Schema,
  options: ValidationMiddlewareOptions = {}
) {
  const middlewareOptions = { ...DEFAULT_OPTIONS, ...options };
  const schemaId = schema['$id'] || Math.random().toString(36).substring(7);

  // Cache schema if enabled
  if (middlewareOptions.enableSchemaCache && !schemaCache.has(schemaId)) {
    schemaCache.set(schemaId, schema);
    Logger.debug('Schema cached', { schemaId });
  }

  return async function validateRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = process.hrtime();
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
      // Set correlation ID for request tracking
      Logger.setCorrelationId(correlationId);

      // Check request size
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > middlewareOptions.maxRequestSize!) {
        Logger.error('Request size exceeded limit', undefined, {
          size: contentLength,
          limit: middlewareOptions.maxRequestSize
        });
        
        res.status(413).json({
          type: 'https://api.taskmanager.com/errors/request-size',
          title: 'Request Entity Too Large',
          status: 413,
          detail: 'Request size exceeds the maximum allowed limit',
          errors: {
            size: [`Maximum allowed size is ${middlewareOptions.maxRequestSize} bytes`]
          }
        });
        return;
      }

      // Determine validation target
      const validationTarget = ['POST', 'PUT', 'PATCH'].includes(req.method)
        ? req.body
        : req.query;

      // Get cached schema or use provided schema
      const validationSchema = middlewareOptions.enableSchemaCache
        ? schemaCache.get(schemaId) || schema
        : schema;

      // Validate and sanitize input
      const { isValid, errors, data } = await validateInput(
        validationTarget,
        validationSchema,
        {
          abortEarly: middlewareOptions.abortEarly,
          stripUnknown: middlewareOptions.stripUnknown,
          sanitize: middlewareOptions.sanitize,
          sanitizeOptions: middlewareOptions.sanitizationRules
        }
      );

      if (!isValid) {
        Logger.error('Validation failed', undefined, {
          errors,
          input: validationTarget,
          correlationId
        });

        res.status(400).json({
          ...errors,
          correlationId,
          code: ErrorCodes.VALIDATION_ERROR
        });
        return;
      }

      // Attach validated data to request
      req.validatedData = data;

      // Log validation performance
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;
      
      Logger.debug('Validation successful', {
        duration,
        schemaId,
        correlationId
      });

      next();
    } catch (error) {
      Logger.error('Validation middleware error', error as Error, { correlationId });
      
      res.status(500).json({
        type: 'https://api.taskmanager.com/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An error occurred while processing the request',
        correlationId
      });
    }
  };
}

// Extend Express Request interface to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedData: any;
    }
  }
}

export default createValidationMiddleware;