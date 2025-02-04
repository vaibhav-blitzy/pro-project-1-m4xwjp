/**
 * @packageDocumentation
 * @module AuthService/Interfaces
 * @version 1.0.0
 * 
 * Core authentication interfaces and types for the Auth Service microservice.
 * Implements comprehensive authentication flow with enhanced security features.
 */

import { JwtPayload } from 'jsonwebtoken'; // v9.0.1
import { IUser } from '../../user-service/interfaces/user.interface';
import { ApiResponse } from '../../common/types';

/**
 * Interface for authentication credentials with strict type safety.
 * Supports both standard and MFA-enabled authentication flows.
 */
export interface IAuthCredentials {
  /** User's email address for authentication */
  email: string;
  /** User's password in plain text (will be hashed) */
  password: string;
  /** Optional MFA token for two-factor authentication */
  mfaToken?: string;
}

/**
 * Interface for authentication tokens with comprehensive token management.
 * Implements secure token handling with expiration and type information.
 */
export interface IAuthTokens {
  /** JWT access token for API authentication */
  accessToken: string;
  /** Secure refresh token for token renewal */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Token type identifier (e.g., 'Bearer') */
  tokenType: string;
}

/**
 * Interface defining comprehensive authentication service operations.
 * Implements secure authentication flows with enhanced token management.
 */
export interface IAuthService {
  /**
   * Authenticates user credentials and generates secure tokens.
   * Implements rate limiting and security logging.
   * 
   * @param credentials - User authentication credentials
   * @returns Promise resolving to authentication tokens
   * @throws UnauthorizedError for invalid credentials
   */
  login(credentials: IAuthCredentials): Promise<ApiResponse<IAuthTokens>>;

  /**
   * Securely generates new access token using refresh token.
   * Implements token rotation for enhanced security.
   * 
   * @param refreshToken - Valid refresh token
   * @returns Promise resolving to new authentication tokens
   * @throws UnauthorizedError for invalid refresh token
   */
  refreshToken(refreshToken: string): Promise<ApiResponse<IAuthTokens>>;

  /**
   * Comprehensively validates JWT token and returns decoded payload.
   * Implements token blacklist checking and signature verification.
   * 
   * @param token - JWT token to validate
   * @returns Promise resolving to decoded token payload
   * @throws UnauthorizedError for invalid token
   */
  validateToken(token: string): Promise<ApiResponse<JwtPayload>>;

  /**
   * Securely invalidates user's authentication tokens.
   * Implements token blacklisting and session cleanup.
   * 
   * @param userId - User's unique identifier
   * @param refreshToken - Current refresh token to invalidate
   * @returns Promise resolving to logout confirmation
   */
  logout(userId: string, refreshToken: string): Promise<ApiResponse<void>>;
}

/**
 * Extended JWT payload interface with additional user information.
 * Enhances token payload with user-specific data for authorization.
 */
export interface IEnhancedJwtPayload extends JwtPayload {
  /** User's unique identifier */
  userId: string;
  /** User's email address */
  email: string;
  /** User's role for authorization */
  role: string;
  /** Token version for invalidation */
  tokenVersion: number;
}

/**
 * Interface for token validation response with enhanced error handling.
 * Provides detailed validation status and error information.
 */
export interface ITokenValidationResult {
  /** Indicates if token is valid */
  isValid: boolean;
  /** Decoded token payload if valid */
  payload?: IEnhancedJwtPayload;
  /** Error message if validation fails */
  error?: string;
  /** Error code for specific validation failures */
  errorCode?: string;
}

/**
 * Interface for token blacklist entry with metadata.
 * Manages revoked tokens with additional security information.
 */
export interface ITokenBlacklistEntry {
  /** Token identifier or hash */
  tokenId: string;
  /** Timestamp when token was blacklisted */
  blacklistedAt: Date;
  /** Reason for blacklisting */
  reason: string;
  /** User ID associated with the token */
  userId: string;
}