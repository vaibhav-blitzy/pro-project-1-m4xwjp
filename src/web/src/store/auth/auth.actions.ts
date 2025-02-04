/**
 * @fileoverview Redux action creators for authentication operations
 * Implements secure token management, MFA support, SSO integration, and retry mechanisms
 * @version 1.0.0
 */

import { Dispatch } from 'redux'; // v4.2.1
import { ThunkAction } from 'redux-thunk'; // v2.4.2
import { AuthActionTypes } from './auth.types';
import { AuthService } from '../../services/auth.service';
import type { AuthCredentials, AuthState, AuthTokens } from '../../interfaces/auth.interface';
import type { RootState } from '../store.types';

// Initialize auth service
const authService = new AuthService();

// Action creator types
type AppThunk<ReturnType = void> = ThunkAction<
  Promise<ReturnType>,
  RootState,
  unknown,
  AuthAction
>;

type AuthAction = {
  type: AuthActionTypes;
  payload?: any;
};

// Maximum retry attempts for auth operations
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/**
 * Initiates login process with credentials or SSO
 * Implements comprehensive error handling and MFA support
 */
export const login = (credentials: AuthCredentials): AppThunk => async (dispatch) => {
  dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: true });
  dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: null });

  let retryCount = 0;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      const response = await authService.loginWithCredentials(credentials);

      if (response.mfaRequired) {
        dispatch({ type: AuthActionTypes.MFA_REQUIRED, payload: response.mfaType });
        dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: false });
        return;
      }

      if (response.success && response.data) {
        dispatch({ type: AuthActionTypes.LOGIN_SUCCESS, payload: response.data });
        scheduleTokenRefresh(dispatch, response.data);
        return;
      }

      throw new Error(response.error || 'Authentication failed');
    } catch (error) {
      retryCount++;
      if (retryCount === MAX_RETRY_ATTEMPTS) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: AuthActionTypes.LOGIN_FAILURE, payload: errorMessage });
        dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: errorMessage });
      } else {
        await delay(retryCount * RETRY_DELAY);
      }
    }
  }

  dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: false });
};

/**
 * Handles SSO authentication flow with specified provider
 */
export const loginWithSso = (
  provider: 'google' | 'microsoft',
  token: string
): AppThunk => async (dispatch) => {
  dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: true });
  dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: null });

  try {
    const response = await authService.loginWithSsoProvider(provider);
    
    if (response) {
      dispatch({ type: AuthActionTypes.LOGIN_SUCCESS, payload: response });
      scheduleTokenRefresh(dispatch, response);
    } else {
      throw new Error('SSO authentication failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'SSO authentication failed';
    dispatch({ type: AuthActionTypes.LOGIN_FAILURE, payload: errorMessage });
    dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: errorMessage });
  } finally {
    dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: false });
  }
};

/**
 * Validates MFA token and completes authentication
 */
export const validateMfa = (mfaToken: string): AppThunk => async (dispatch) => {
  dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: true });
  dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: null });

  try {
    const response = await authService.validateMfaToken(mfaToken);

    if (response.success && response.data) {
      dispatch({ type: AuthActionTypes.LOGIN_SUCCESS, payload: response.data });
      scheduleTokenRefresh(dispatch, response.data);
    } else {
      throw new Error(response.error || 'MFA validation failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'MFA validation failed';
    dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: errorMessage });
  } finally {
    dispatch({ type: AuthActionTypes.SET_AUTH_LOADING, payload: false });
  }
};

/**
 * Handles secure token refresh with retry mechanism
 */
export const refreshToken = (): AppThunk => async (dispatch) => {
  let retryCount = 0;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      const tokens = await authService.refreshTokenWithRetry();
      dispatch({ type: AuthActionTypes.REFRESH_TOKEN, payload: tokens });
      scheduleTokenRefresh(dispatch, tokens);
      return;
    } catch (error) {
      retryCount++;
      if (retryCount === MAX_RETRY_ATTEMPTS) {
        dispatch({ type: AuthActionTypes.LOGOUT });
        const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
        dispatch({ type: AuthActionTypes.SET_AUTH_ERROR, payload: errorMessage });
      } else {
        await delay(retryCount * RETRY_DELAY);
      }
    }
  }
};

/**
 * Handles user logout and cleanup
 */
export const logout = (): AppThunk => async (dispatch) => {
  try {
    await authService.logout();
  } finally {
    dispatch({ type: AuthActionTypes.LOGOUT });
  }
};

// Helper functions

/**
 * Schedules token refresh before expiration
 */
const scheduleTokenRefresh = (dispatch: Dispatch, tokens: AuthTokens): void => {
  const decoded = decodeToken(tokens.accessToken);
  if (decoded && decoded.exp) {
    const expiresIn = decoded.exp * 1000 - Date.now();
    const refreshTime = expiresIn - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      setTimeout(() => {
        dispatch(refreshToken());
      }, refreshTime);
    }
  }
};

/**
 * Decodes JWT token
 */
const decodeToken = (token: string): { exp?: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Delay helper for retry mechanism
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));