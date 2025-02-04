/**
 * @fileoverview Authentication API module implementing secure authentication flows
 * Supports SSO, MFA, and traditional authentication with comprehensive security
 * @version 1.0.0
 */

import axios from 'axios'; // v1.4.0
import jwtDecode from 'jwt-decode'; // v3.1.2
import { apiService } from '../services/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { AuthCredentials, AuthResponse, AuthTokens } from '../interfaces/auth.interface';

/**
 * Maximum number of MFA validation attempts
 */
const MAX_MFA_ATTEMPTS = 3;

/**
 * Token refresh buffer time in seconds (5 minutes)
 */
const TOKEN_REFRESH_BUFFER = 300;

/**
 * Authenticates user with email/password credentials
 * Implements secure authentication with MFA support
 * @param credentials User authentication credentials
 * @returns Promise resolving to authentication response
 */
export async function login(credentials: AuthCredentials): Promise<AuthResponse> {
  try {
    // Set security headers for authentication request
    apiService.setSecurityHeaders({
      'X-Auth-Type': 'credentials',
      'X-Request-Origin': window.location.origin
    });

    // Make authentication request
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        email: credentials.email,
        password: credentials.password
      }
    );

    // Handle MFA requirement
    if (response.data.mfaRequired) {
      return {
        ...response.data,
        success: false,
        mfaRequired: true,
        mfaType: response.data.mfaType
      };
    }

    // Store tokens securely
    if (response.data.data) {
      storeAuthTokens(response.data.data);
    }

    return response.data;
  } catch (error) {
    throw transformAuthError(error);
  }
}

/**
 * Validates MFA token for enhanced security
 * @param validation MFA validation data
 * @returns Promise resolving to authentication response
 */
export async function validateMFA(validation: {
  email: string;
  mfaCode: string;
  mfaType: string;
}): Promise<AuthResponse> {
  try {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.MFA_VERIFY,
      validation
    );

    if (response.data.data) {
      storeAuthTokens(response.data.data);
    }

    return response.data;
  } catch (error) {
    // Track failed MFA attempts
    const currentAttempts = Number(sessionStorage.getItem('mfaAttempts') || '0');
    if (currentAttempts >= MAX_MFA_ATTEMPTS) {
      await logout(); // Force logout after max attempts
      throw new Error('Maximum MFA attempts exceeded');
    }
    sessionStorage.setItem('mfaAttempts', String(currentAttempts + 1));
    throw transformAuthError(error);
  }
}

/**
 * Authenticates user with SSO provider
 * @param provider SSO provider (google/microsoft)
 * @param token SSO authentication token
 * @returns Promise resolving to authentication response
 */
export async function loginWithSso(
  provider: 'google' | 'microsoft',
  token: string
): Promise<AuthResponse> {
  try {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        ssoProvider: provider,
        ssoToken: token
      }
    );

    if (response.data.data) {
      storeAuthTokens(response.data.data);
    }

    return response.data;
  } catch (error) {
    throw transformAuthError(error);
  }
}

/**
 * Refreshes authentication tokens
 * Implements token rotation for enhanced security
 * @param refreshToken Current refresh token
 * @returns Promise resolving to new authentication tokens
 */
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  try {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken }
    );

    if (response.data.data) {
      storeAuthTokens(response.data.data);
    }

    return response.data;
  } catch (error) {
    // Clear tokens on refresh failure
    clearAuthTokens();
    throw transformAuthError(error);
  }
}

/**
 * Performs secure logout with token invalidation
 * @returns Promise resolving to void
 */
export async function logout(): Promise<void> {
  try {
    await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
  } finally {
    clearAuthTokens();
    sessionStorage.removeItem('mfaAttempts');
  }
}

/**
 * Securely stores authentication tokens
 * @param tokens Authentication tokens to store
 */
function storeAuthTokens(tokens: AuthTokens): void {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem('tokenExpiry', String(Date.now() + tokens.expiresIn * 1000));
}

/**
 * Clears stored authentication tokens
 */
function clearAuthTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
}

/**
 * Transforms authentication errors into standardized format
 * @param error Error to transform
 * @returns Transformed error
 */
function transformAuthError(error: any): Error {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || 'Authentication failed';
    return new Error(message);
  }
  return error;
}

/**
 * Checks if current token needs refresh
 * @returns True if token refresh is needed
 */
export function needsTokenRefresh(): boolean {
  const expiry = Number(localStorage.getItem('tokenExpiry'));
  if (!expiry) return true;
  
  return Date.now() + TOKEN_REFRESH_BUFFER * 1000 >= expiry;
}

/**
 * Validates JWT token structure and expiration
 * @param token JWT token to validate
 * @returns True if token is valid
 */
export function isValidToken(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}