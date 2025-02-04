/**
 * @fileoverview TypeScript interfaces for authentication-related data structures
 * Supports SSO (Google, Microsoft), MFA (TOTP/SMS), and traditional authentication
 * @version 1.0.0
 */

import { ApiResponse } from '../types/api.types';

/**
 * Interface for user authentication credentials supporting multiple authentication methods
 * including traditional email/password, SSO providers, and MFA verification
 */
export interface AuthCredentials {
  /** User's email address */
  email: string;
  /** User's password (only for traditional auth) */
  password: string;
  /** SSO provider selection (Google or Microsoft) */
  ssoProvider: 'google' | 'microsoft' | null;
  /** MFA verification code */
  mfaCode: string;
  /** Type of MFA being used (TOTP or SMS) */
  mfaType: string;
}

/**
 * Interface for authentication tokens returned from the server
 * following OAuth 2.0 specifications with refresh token rotation
 */
export interface AuthTokens {
  /** JWT access token */
  accessToken: string;
  /** Refresh token for token rotation */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Token type (usually 'Bearer') */
  tokenType: string;
}

/**
 * Interface for authentication state in the application
 * Tracks authentication status, MFA requirements, and SSO flow
 */
export interface AuthState {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Current authentication tokens */
  tokens: AuthTokens | null;
  /** Authentication error message if any */
  error: string | null;
  /** Whether authentication is in progress */
  loading: boolean;
  /** Whether MFA verification is required */
  mfaRequired: boolean;
  /** Type of MFA required (TOTP or SMS) */
  mfaType: string;
  /** SSO session data for OAuth flow */
  ssoSession: Record<string, any>;
  /** Current status of the authentication process */
  authStatus: 'idle' | 'authenticating' | 'mfa_pending' | 'sso_pending';
}

/**
 * Interface for authentication API responses
 * Extends the generic ApiResponse with auth-specific fields
 */
export interface AuthResponse extends ApiResponse<AuthTokens> {
  /** Whether authentication was successful */
  success: boolean;
  /** Authentication error message if any */
  error: string | null;
  /** Whether MFA verification is required */
  mfaRequired: boolean;
  /** Type of MFA required (TOTP or SMS) */
  mfaType: string;
  /** URL for SSO provider redirect */
  ssoRedirectUrl: string;
  /** SSO state for CSRF protection */
  ssoState: Record<string, any>;
}