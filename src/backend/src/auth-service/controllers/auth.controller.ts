/**
 * @packageDocumentation
 * @module AuthService/Controllers
 * @version 1.0.0
 * 
 * REST API controller for authentication endpoints with comprehensive security controls.
 * Implements secure authentication flows with JWT tokens, refresh token rotation,
 * rate limiting, input validation, and extensive monitoring.
 */

import { Request, Response } from 'express'; // v4.18.2
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  UseGuards,
  UseInterceptors,
  Injectable,
  Req
} from '@nestjs/common'; // v10.0.0

import { IAuthService } from '../interfaces/auth.interface';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';
import { Logger } from '../../common/utils/logger.util';
import { MetricsService } from '../../common/services/metrics.service';
import { 
  RateLimitGuard,
  ValidationInterceptor,
  SanitizationInterceptor,
  SecurityHeadersInterceptor,
  TimeoutInterceptor,
  CircuitBreakerInterceptor,
  TracingInterceptor,
  MetricsInterceptor,
  AuthGuard,
  ThrottleGuard
} from '../../common/guards';

// Security constants
const LOGIN_RATE_LIMIT = 5; // requests per minute
const TOKEN_REFRESH_RATE_LIMIT = 10; // requests per minute
const REQUEST_TIMEOUT = 10000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening

@Controller('auth')
@Injectable()
@UseGuards(RateLimitGuard)
@UseInterceptors(ValidationInterceptor)
@UseInterceptors(SanitizationInterceptor)
@UseInterceptors(SecurityHeadersInterceptor)
@UseInterceptors(TimeoutInterceptor)
@UseInterceptors(CircuitBreakerInterceptor)
@UseInterceptors(TracingInterceptor)
@UseInterceptors(MetricsInterceptor)
export class AuthController {
  private readonly logger: Logger;

  constructor(
    private readonly authService: IAuthService,
    private readonly metricsService: MetricsService
  ) {
    this.logger = Logger.getInstance();
    this.initializeController();
  }

  private async initializeController(): Promise<void> {
    try {
      // Validate service dependencies
      if (!this.authService) {
        throw new Error('Auth service dependency not provided');
      }

      // Configure rate limiting thresholds
      RateLimitGuard.setThreshold('login', LOGIN_RATE_LIMIT);
      RateLimitGuard.setThreshold('refreshToken', TOKEN_REFRESH_RATE_LIMIT);

      // Configure request timeout
      TimeoutInterceptor.setTimeout(REQUEST_TIMEOUT);

      // Configure circuit breaker
      CircuitBreakerInterceptor.setThreshold(CIRCUIT_BREAKER_THRESHOLD);

      this.logger.info('AuthController initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AuthController', error);
      throw error;
    }
  }

  /**
   * Handles user login requests with comprehensive validation and security controls
   * 
   * @param loginDto - Validated login credentials
   * @returns JWT access and refresh tokens with security headers
   */
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottleGuard)
  @UseInterceptors(SanitizationInterceptor)
  async login(@Body() loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const correlationId = crypto.randomUUID();
    this.logger.setCorrelationId(correlationId);

    try {
      this.logger.info('Login attempt', { email: loginDto.email });
      this.metricsService.incrementCounter('auth_login_attempts');

      // Validate and sanitize login credentials
      const sanitizedCredentials = await this.sanitizeCredentials(loginDto);

      // Attempt login with circuit breaker protection
      const result = await this.authService.login(sanitizedCredentials);

      if (!result.success) {
        throw new Error(result.message || 'Login failed');
      }

      // Record successful login metric
      this.metricsService.incrementCounter('auth_login_success');
      this.logger.info('Login successful', { email: loginDto.email });

      return result.data;
    } catch (error) {
      this.metricsService.incrementCounter('auth_login_failures');
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Handles token refresh requests with security validation
   * 
   * @param req - Request containing refresh token
   * @returns New JWT access and refresh tokens with security headers
   */
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(ThrottleGuard)
  @UseInterceptors(SecurityHeadersInterceptor)
  async refreshToken(@Req() req: Request): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const correlationId = crypto.randomUUID();
    this.logger.setCorrelationId(correlationId);

    try {
      const refreshToken = this.extractRefreshToken(req);
      this.logger.info('Token refresh attempt');
      this.metricsService.incrementCounter('auth_token_refresh_attempts');

      const result = await this.authService.refreshToken(refreshToken);

      if (!result.success) {
        throw new Error(result.message || 'Token refresh failed');
      }

      this.metricsService.incrementCounter('auth_token_refresh_success');
      this.logger.info('Token refresh successful');

      return result.data;
    } catch (error) {
      this.metricsService.incrementCounter('auth_token_refresh_failures');
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  /**
   * Handles user logout requests with session cleanup
   * 
   * @param req - Request containing user session
   */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request): Promise<void> {
    const correlationId = crypto.randomUUID();
    this.logger.setCorrelationId(correlationId);

    try {
      const { userId, refreshToken } = this.extractSessionData(req);
      this.logger.info('Logout attempt', { userId });
      this.metricsService.incrementCounter('auth_logout_attempts');

      await this.authService.logout(userId, refreshToken);

      this.metricsService.incrementCounter('auth_logout_success');
      this.logger.info('Logout successful', { userId });
    } catch (error) {
      this.metricsService.incrementCounter('auth_logout_failures');
      this.logger.error('Logout failed', error);
      throw error;
    }
  }

  /**
   * Health check endpoint for monitoring
   * 
   * @returns Health status with dependencies
   */
  @Get('health')
  @HttpCode(200)
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    dependencies: Record<string, boolean>;
  }> {
    try {
      const authServiceHealth = await this.authService.validateToken('health-check');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          authService: authServiceHealth.success
        }
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw error;
    }
  }

  /**
   * Sanitizes login credentials to prevent injection attacks
   */
  private async sanitizeCredentials(credentials: LoginDto): Promise<LoginDto> {
    return {
      email: credentials.email.toLowerCase().trim(),
      password: credentials.password
    };
  }

  /**
   * Extracts and validates refresh token from request
   */
  private extractRefreshToken(req: Request): string {
    const refreshToken = req.headers['x-refresh-token'] as string;
    if (!refreshToken) {
      throw new Error('Refresh token not provided');
    }
    return refreshToken;
  }

  /**
   * Extracts and validates session data from request
   */
  private extractSessionData(req: Request): { userId: string; refreshToken: string } {
    const userId = req.user?.id;
    const refreshToken = req.headers['x-refresh-token'] as string;

    if (!userId || !refreshToken) {
      throw new Error('Invalid session data');
    }

    return { userId, refreshToken };
  }
}