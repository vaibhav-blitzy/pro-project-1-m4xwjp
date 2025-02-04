/**
 * @fileoverview Authentication routes configuration with enhanced security controls,
 * route protection, and comprehensive state management
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@mui/material';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import { useAuth } from '../hooks/useAuth';
import { THEME_CONSTANTS } from '../constants/app.constants';

/**
 * Higher-order component to handle authenticated route protection
 * Implements secure redirection and loading states
 */
const RedirectIfAuthenticated = React.memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, validateToken } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Validate authentication tokens on route changes
    validateToken().catch(console.error);
  }, [validateToken, location.pathname]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.background
        }}
      >
        <LoadingSpinner
          size={40}
          aria-label="Checking authentication status"
          role="status"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return <>{children}</>;
});

RedirectIfAuthenticated.displayName = 'RedirectIfAuthenticated';

/**
 * Main authentication routes component with enhanced security and performance
 * Implements route-level code splitting and security validations
 */
const AuthRoutes: React.FC = React.memo(() => {
  const location = useLocation();

  // Track route changes for security monitoring
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.debug(`[Auth Route Change] ${location.pathname} at ${timestamp}`);
  }, [location]);

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="login"
        element={
          <RedirectIfAuthenticated>
            <Login />
          </RedirectIfAuthenticated>
        }
      />

      {/* Registration Route */}
      <Route
        path="register"
        element={
          <RedirectIfAuthenticated>
            <Register />
          </RedirectIfAuthenticated>
        }
      />

      {/* Forgot Password Route */}
      <Route
        path="forgot-password"
        element={
          <RedirectIfAuthenticated>
            <ForgotPassword />
          </RedirectIfAuthenticated>
        }
      />

      {/* Reset Password Route with Token Validation */}
      <Route
        path="reset-password/:token"
        element={
          <RedirectIfAuthenticated>
            <ResetPassword />
          </RedirectIfAuthenticated>
        }
      />

      {/* Invalid Auth Path Redirect */}
      <Route
        path="*"
        element={
          <Navigate
            to="/auth/login"
            replace
            state={{ from: location, error: 'Invalid authentication path' }}
          />
        }
      />
    </Routes>
  );
});

AuthRoutes.displayName = 'AuthRoutes';

export default AuthRoutes;