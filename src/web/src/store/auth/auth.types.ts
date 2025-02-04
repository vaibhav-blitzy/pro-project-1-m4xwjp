/**
 * @fileoverview TypeScript types and constants for authentication-related Redux actions
 * Implements secure authentication flow with JWT tokens, refresh token rotation,
 * and comprehensive auth state management
 * @version 1.0.0
 */

import { AuthState, AuthTokens } from '../../interfaces/auth.interface';

/**
 * Enum defining all possible authentication action types
 * Ensures type safety across the authentication flow
 */
export enum AuthActionTypes {
  LOGIN_REQUEST = '@auth/LOGIN_REQUEST',
  LOGIN_SUCCESS = '@auth/LOGIN_SUCCESS',
  LOGIN_FAILURE = '@auth/LOGIN_FAILURE',
  LOGOUT = '@auth/LOGOUT',
  REFRESH_TOKEN = '@auth/REFRESH_TOKEN',
  SET_AUTH_LOADING = '@auth/SET_AUTH_LOADING',
  SET_AUTH_ERROR = '@auth/SET_AUTH_ERROR'
}

/**
 * Interface for initiating login request action
 * Triggers the authentication flow
 */
export interface LoginRequestAction {
  type: AuthActionTypes.LOGIN_REQUEST;
}

/**
 * Interface for successful login action
 * Contains JWT access and refresh tokens
 */
export interface LoginSuccessAction {
  type: AuthActionTypes.LOGIN_SUCCESS;
  payload: AuthTokens;
}

/**
 * Interface for failed login action
 * Contains error message from authentication attempt
 */
export interface LoginFailureAction {
  type: AuthActionTypes.LOGIN_FAILURE;
  payload: string;
}

/**
 * Interface for user logout action
 * Clears authentication state
 */
export interface LogoutAction {
  type: AuthActionTypes.LOGOUT;
}

/**
 * Interface for token refresh action
 * Contains new JWT tokens after refresh
 */
export interface RefreshTokenAction {
  type: AuthActionTypes.REFRESH_TOKEN;
  payload: AuthTokens;
}

/**
 * Interface for setting authentication loading state
 * Used to track async authentication operations
 */
export interface SetAuthLoadingAction {
  type: AuthActionTypes.SET_AUTH_LOADING;
  payload: boolean;
}

/**
 * Interface for setting authentication error state
 * Contains optional error message
 */
export interface SetAuthErrorAction {
  type: AuthActionTypes.SET_AUTH_ERROR;
  payload: string | null;
}

/**
 * Union type combining all possible authentication actions
 * Ensures type safety in Redux reducers and middleware
 */
export type AuthAction =
  | LoginRequestAction
  | LoginSuccessAction
  | LoginFailureAction
  | LogoutAction
  | RefreshTokenAction
  | SetAuthLoadingAction
  | SetAuthErrorAction;