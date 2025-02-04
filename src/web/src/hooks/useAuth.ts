/**
 * @fileoverview Custom React hook for comprehensive authentication management
 * Implements secure token handling, SSO support, and automatic token refresh
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import {
  login,
  loginWithSso,
  logout,
  refreshToken
} from '../store/auth/auth.actions';
import {
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectAuthTokens,
  selectMfaRequired,
  selectMfaType,
  selectAuthStatus
} from '../store/auth/auth.selectors';
import type { AuthCredentials } from '../interfaces/auth.interface';

// Token refresh interval (4 minutes)
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

/**
 * Custom hook providing comprehensive authentication functionality
 * Implements secure token management and automatic refresh
 */
export const useAuth = () => {
  const dispatch = useDispatch();

  // Select auth state from Redux store
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const tokens = useSelector(selectAuthTokens);
  const mfaRequired = useSelector(selectMfaRequired);
  const mfaType = useSelector(selectMfaType);
  const authStatus = useSelector(selectAuthStatus);

  /**
   * Handles password-based authentication
   * @param credentials - User authentication credentials
   */
  const handleLogin = useCallback(async (credentials: AuthCredentials) => {
    try {
      await dispatch(login(credentials));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles SSO-based authentication
   * @param provider - SSO provider (google or microsoft)
   */
  const handleSsoLogin = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      await dispatch(loginWithSso(provider));
    } catch (error) {
      console.error('SSO login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Handles secure logout and cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logout());
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Initiates token refresh with retry mechanism
   */
  const handleTokenRefresh = useCallback(async () => {
    if (isAuthenticated && tokens?.accessToken) {
      try {
        await dispatch(refreshToken());
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Force logout on refresh failure
        await handleLogout();
      }
    }
  }, [dispatch, isAuthenticated, tokens, handleLogout]);

  // Set up automatic token refresh
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (isAuthenticated && tokens?.accessToken) {
      // Initial refresh scheduling
      refreshInterval = setInterval(handleTokenRefresh, TOKEN_REFRESH_INTERVAL);

      // Immediate refresh if token is close to expiration
      const decodedToken = tokens.accessToken.split('.')[1];
      if (decodedToken) {
        try {
          const { exp } = JSON.parse(atob(decodedToken));
          const expiresIn = exp * 1000 - Date.now();
          if (expiresIn < TOKEN_REFRESH_INTERVAL) {
            handleTokenRefresh();
          }
        } catch (error) {
          console.error('Token decode failed:', error);
        }
      }
    }

    // Cleanup on unmount or auth state change
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, tokens, handleTokenRefresh]);

  // Monitor authentication status changes
  useEffect(() => {
    if (authStatus === 'idle' && !isAuthenticated && tokens) {
      // Attempt to restore session
      handleTokenRefresh();
    }
  }, [authStatus, isAuthenticated, tokens, handleTokenRefresh]);

  return {
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    mfaType,
    authStatus,
    login: handleLogin,
    loginWithSso: handleSsoLogin,
    logout: handleLogout,
    refreshToken: handleTokenRefresh
  };
};