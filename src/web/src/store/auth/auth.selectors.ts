/**
 * @fileoverview Redux selectors for authentication state management
 * Implements memoized selectors for accessing authentication state with type safety
 * @version 1.0.0
 * @package @reduxjs/toolkit@1.9.0
 */

import { createSelector } from '@reduxjs/toolkit';
import { AuthState } from '../../interfaces/auth.interface';

/**
 * Base selector to access the authentication slice from root state
 * Provides type-safe access to the complete auth state
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * Memoized selector to determine if user is authenticated
 * Checks both authentication flag and presence of valid tokens
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (authState): boolean => {
    return authState.isAuthenticated && !!authState.tokens?.accessToken;
  }
);

/**
 * Memoized selector to access authentication tokens
 * Returns null if tokens are not present or invalid
 */
export const selectAuthTokens = createSelector(
  [selectAuthState],
  (authState) => {
    if (!authState.tokens?.accessToken || !authState.tokens?.refreshToken) {
      return null;
    }
    return authState.tokens;
  }
);

/**
 * Memoized selector to access authentication error state
 * Provides type-safe access to error messages
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (authState): string | null => authState.error
);

/**
 * Memoized selector to access authentication loading state
 * Indicates whether authentication operations are in progress
 */
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (authState): boolean => authState.loading
);

/**
 * Memoized selector to check if MFA verification is required
 * Used for multi-factor authentication flow
 */
export const selectMfaRequired = createSelector(
  [selectAuthState],
  (authState): boolean => authState.mfaRequired
);

/**
 * Memoized selector to get the required MFA type
 * Returns the type of MFA verification needed
 */
export const selectMfaType = createSelector(
  [selectAuthState],
  (authState): string => authState.mfaType
);

/**
 * Memoized selector to access SSO session data
 * Used during OAuth authentication flow
 */
export const selectSsoSession = createSelector(
  [selectAuthState],
  (authState): Record<string, any> => authState.ssoSession
);

/**
 * Memoized selector to get current authentication status
 * Provides detailed status of the authentication process
 */
export const selectAuthStatus = createSelector(
  [selectAuthState],
  (authState): 'idle' | 'authenticating' | 'mfa_pending' | 'sso_pending' => 
    authState.authStatus
);

// Type declaration for root state to ensure type safety
declare interface RootState {
  auth: AuthState;
}