import { Request, Response, NextFunction } from 'express'; // v4.18.2
import winston from 'winston'; // v3.8.2
import { TokenService } from '../services/token.service';
import { ErrorCodes } from '../../common/constants/error-codes';
import { IEnhancedJwtPayload } from '../interfaces/auth.interface';

// Initialize dependencies
const tokenService = new TokenService();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * Interface for RFC 7807 error response
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errorCode: number;
}

/**
 * Enterprise-grade JWT middleware for validating access tokens
 * Implements comprehensive security controls and RFC 7807 error responses
 */
export default async function jwtMiddleware(
  req: Request & { user?: IEnhancedJwtPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  const correlationId = req.headers['x-correlation-id'] as string;
  logger.defaultMeta = { correlationId };

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const problem: ProblemDetails = {
        type: 'https://taskmanager.com/errors/unauthorized',
        title: 'Authentication Required',
        status: 401,
        detail: 'No valid authentication token provided',
        instance: req.url,
        errorCode: ErrorCodes.UNAUTHORIZED
      };
      res.status(401).json(problem);
      return;
    }

    // Extract and sanitize token
    const token = authHeader.split(' ')[1].trim();
    if (!token) {
      const problem: ProblemDetails = {
        type: 'https://taskmanager.com/errors/invalid-token',
        title: 'Invalid Token',
        status: 401,
        detail: 'Authentication token is empty or malformed',
        instance: req.url,
        errorCode: ErrorCodes.TOKEN_INVALID
      };
      res.status(401).json(problem);
      return;
    }

    // Validate token format
    const isValidFormat = await tokenService.validateTokenFormat(token);
    if (!isValidFormat) {
      const problem: ProblemDetails = {
        type: 'https://taskmanager.com/errors/invalid-token-format',
        title: 'Invalid Token Format',
        status: 401,
        detail: 'Authentication token format is invalid',
        instance: req.url,
        errorCode: ErrorCodes.TOKEN_INVALID
      };
      res.status(401).json(problem);
      return;
    }

    // Check token blacklist
    const isBlacklisted = await tokenService.checkTokenBlacklist(token);
    if (isBlacklisted) {
      const problem: ProblemDetails = {
        type: 'https://taskmanager.com/errors/token-blacklisted',
        title: 'Token Blacklisted',
        status: 401,
        detail: 'Authentication token has been revoked',
        instance: req.url,
        errorCode: ErrorCodes.TOKEN_BLACKLISTED
      };
      res.status(401).json(problem);
      return;
    }

    // Verify token and decode payload
    const decodedToken = await tokenService.verifyAccessToken(token);
    if (!decodedToken) {
      const problem: ProblemDetails = {
        type: 'https://taskmanager.com/errors/token-expired',
        title: 'Token Expired',
        status: 401,
        detail: 'Authentication token has expired',
        instance: req.url,
        errorCode: ErrorCodes.TOKEN_EXPIRED
      };
      res.status(401).json(problem);
      return;
    }

    // Type assertion for decoded token
    const userPayload = decodedToken as IEnhancedJwtPayload;

    // Attach user data to request
    req.user = userPayload;

    logger.info('Token validation successful', {
      userId: userPayload.userId,
      tokenId: userPayload.jti,
      url: req.url
    });

    next();
  } catch (error) {
    logger.error('Token validation failed', {
      error: error.message,
      stack: error.stack,
      url: req.url
    });

    const problem: ProblemDetails = {
      type: 'https://taskmanager.com/errors/authentication-failed',
      title: 'Authentication Failed',
      status: 401,
      detail: 'An error occurred during token validation',
      instance: req.url,
      errorCode: ErrorCodes.UNAUTHORIZED
    };
    res.status(401).json(problem);
  }
}