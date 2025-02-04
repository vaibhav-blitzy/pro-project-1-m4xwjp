/**
 * @fileoverview Test suite for authentication reducer
 * Validates state management for all authentication flows including SSO, MFA,
 * token management, and RFC 7807 compliant error handling
 * @version 1.0.0
 */

import authReducer from '../../../src/store/auth/auth.reducer';
import { AuthActionTypes } from '../../../src/store/auth/auth.types';
import { AuthState } from '../../../src/interfaces/auth.interface';
import { ApiError } from '@types/http-errors'; // v2.0.1

describe('authReducer', () => {
  // Initial state setup for all tests
  const initialState: AuthState = {
    isAuthenticated: false,
    tokens: null,
    error: null,
    loading: false,
    mfaRequired: false,
    mfaType: '',
    ssoSession: {},
    authStatus: 'idle'
  };

  // Mock data for testing
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  };

  const mockApiError: ApiError = {
    type: 'https://api.taskmanager.com/errors/auth',
    title: 'Authentication Error',
    status: 401,
    code: 'AUTH_001',
    message: 'Invalid credentials provided',
    details: null,
    instance: '/auth/login/2023-10-01/12345'
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(authReducer(undefined, { type: '@@INIT' } as any)).toEqual(initialState);
    });
  });

  describe('Password Authentication', () => {
    it('should handle LOGIN_REQUEST', () => {
      const action = { type: AuthActionTypes.LOGIN_REQUEST };
      const nextState = authReducer(initialState, action);
      
      expect(nextState).toEqual({
        ...initialState,
        loading: true,
        error: null,
        authStatus: 'authenticating'
      });
    });

    it('should handle LOGIN_SUCCESS', () => {
      const action = {
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: mockTokens
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: true,
        tokens: mockTokens,
        loading: false,
        error: null,
        mfaRequired: false,
        mfaType: '',
        authStatus: 'idle'
      });
    });

    it('should handle LOGIN_FAILURE', () => {
      const action = {
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: mockApiError
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: false,
        tokens: null,
        loading: false,
        error: mockApiError,
        authStatus: 'idle'
      });
    });

    it('should handle LOGOUT', () => {
      const authenticatedState: AuthState = {
        ...initialState,
        isAuthenticated: true,
        tokens: mockTokens
      };
      const action = { type: AuthActionTypes.LOGOUT };
      const nextState = authReducer(authenticatedState, action);

      expect(nextState).toEqual({
        ...initialState,
        authStatus: 'idle'
      });
    });
  });

  describe('MFA Flow', () => {
    it('should handle MFA_REQUIRED', () => {
      const action = {
        type: AuthActionTypes.MFA_REQUIRED,
        payload: { mfaType: 'TOTP' }
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP',
        authStatus: 'mfa_pending'
      });
    });

    it('should handle successful MFA verification', () => {
      const mfaState: AuthState = {
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP',
        authStatus: 'mfa_pending'
      };
      const action = {
        type: AuthActionTypes.MFA_VERIFY,
        payload: {
          success: true,
          tokens: mockTokens,
          error: null
        }
      };
      const nextState = authReducer(mfaState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: true,
        tokens: mockTokens,
        mfaRequired: false,
        mfaType: '',
        error: null,
        authStatus: 'idle'
      });
    });

    it('should handle failed MFA verification', () => {
      const mfaState: AuthState = {
        ...initialState,
        mfaRequired: true,
        mfaType: 'TOTP',
        authStatus: 'mfa_pending'
      };
      const action = {
        type: AuthActionTypes.MFA_VERIFY,
        payload: {
          success: false,
          tokens: null,
          error: mockApiError
        }
      };
      const nextState = authReducer(mfaState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: false,
        tokens: null,
        mfaRequired: false,
        mfaType: '',
        error: mockApiError,
        authStatus: 'mfa_pending'
      });
    });
  });

  describe('SSO Authentication', () => {
    it('should handle SSO_REDIRECT', () => {
      const ssoState = { state: 'random-state-string', provider: 'google' };
      const action = {
        type: AuthActionTypes.SSO_REDIRECT,
        payload: { ssoState }
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        ssoSession: ssoState,
        authStatus: 'sso_pending',
        loading: true,
        error: null
      });
    });

    it('should handle successful SSO callback', () => {
      const ssoInProgressState: AuthState = {
        ...initialState,
        ssoSession: { state: 'random-state-string', provider: 'google' },
        authStatus: 'sso_pending',
        loading: true
      };
      const action = {
        type: AuthActionTypes.SSO_CALLBACK,
        payload: {
          success: true,
          tokens: mockTokens,
          error: null
        }
      };
      const nextState = authReducer(ssoInProgressState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: true,
        tokens: mockTokens,
        ssoSession: {},
        loading: false,
        error: null,
        authStatus: 'idle'
      });
    });

    it('should handle failed SSO callback', () => {
      const ssoInProgressState: AuthState = {
        ...initialState,
        ssoSession: { state: 'random-state-string', provider: 'google' },
        authStatus: 'sso_pending',
        loading: true
      };
      const action = {
        type: AuthActionTypes.SSO_CALLBACK,
        payload: {
          success: false,
          tokens: null,
          error: mockApiError
        }
      };
      const nextState = authReducer(ssoInProgressState, action);

      expect(nextState).toEqual({
        ...initialState,
        isAuthenticated: false,
        tokens: null,
        ssoSession: {},
        loading: false,
        error: mockApiError,
        authStatus: 'sso_pending'
      });
    });
  });

  describe('Token Management', () => {
    it('should handle successful token refresh', () => {
      const authenticatedState: AuthState = {
        ...initialState,
        isAuthenticated: true,
        tokens: mockTokens
      };
      const newTokens = {
        ...mockTokens,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };
      const action = {
        type: AuthActionTypes.REFRESH_TOKEN,
        payload: newTokens
      };
      const nextState = authReducer(authenticatedState, action);

      expect(nextState).toEqual({
        ...authenticatedState,
        tokens: newTokens,
        error: null
      });
    });

    it('should handle SET_AUTH_LOADING', () => {
      const action = {
        type: AuthActionTypes.SET_AUTH_LOADING,
        payload: true
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        loading: true
      });
    });

    it('should handle SET_AUTH_ERROR', () => {
      const action = {
        type: AuthActionTypes.SET_AUTH_ERROR,
        payload: mockApiError
      };
      const nextState = authReducer(initialState, action);

      expect(nextState).toEqual({
        ...initialState,
        error: mockApiError,
        loading: false
      });
    });
  });
});