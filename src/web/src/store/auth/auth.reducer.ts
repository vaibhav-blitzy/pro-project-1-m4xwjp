/**
 * @fileoverview Redux reducer for authentication state management
 * Implements secure authentication flow with JWT tokens, SSO, and MFA support
 * @version 1.0.0
 */

import { Reducer } from '@reduxjs/toolkit'; // v1.9.0
import { AuthState } from '../../interfaces/auth.interface';
import { AuthAction, AuthActionTypes } from './auth.types';

/**
 * Initial authentication state with secure defaults
 */
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

/**
 * Authentication reducer handling all auth-related state transitions
 * Implements secure token management and comprehensive error handling
 */
const authReducer: Reducer<AuthState, AuthAction> = (
  state = initialState,
  action
): AuthState => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        authStatus: 'authenticating'
      };

    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        tokens: action.payload,
        loading: false,
        error: null,
        mfaRequired: false,
        mfaType: '',
        authStatus: 'idle'
      };

    case AuthActionTypes.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        tokens: null,
        loading: false,
        error: action.payload,
        authStatus: 'idle'
      };

    case AuthActionTypes.LOGOUT:
      // Secure state cleanup on logout
      return {
        ...initialState,
        authStatus: 'idle'
      };

    case AuthActionTypes.REFRESH_TOKEN:
      return {
        ...state,
        tokens: action.payload,
        error: null
      };

    case AuthActionTypes.SET_AUTH_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AuthActionTypes.SET_AUTH_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case AuthActionTypes.MFA_REQUIRED:
      return {
        ...state,
        mfaRequired: true,
        mfaType: action.payload.mfaType,
        authStatus: 'mfa_pending'
      };

    case AuthActionTypes.MFA_VERIFY:
      return {
        ...state,
        mfaRequired: false,
        mfaType: '',
        isAuthenticated: action.payload.success,
        tokens: action.payload.tokens,
        error: action.payload.error,
        authStatus: action.payload.success ? 'idle' : 'mfa_pending'
      };

    case AuthActionTypes.SSO_REDIRECT:
      return {
        ...state,
        ssoSession: action.payload.ssoState,
        authStatus: 'sso_pending',
        loading: true,
        error: null
      };

    case AuthActionTypes.SSO_CALLBACK:
      return {
        ...state,
        isAuthenticated: action.payload.success,
        tokens: action.payload.tokens,
        ssoSession: {},
        loading: false,
        error: action.payload.error,
        authStatus: action.payload.success ? 'idle' : 'sso_pending'
      };

    default:
      return state;
  }
};

export default authReducer;