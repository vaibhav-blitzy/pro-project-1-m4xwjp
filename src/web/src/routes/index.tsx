/**
 * @fileoverview Main routing configuration implementing secure routing with JWT validation,
 * role-based access control, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // v6.14.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { Analytics } from '@analytics/react'; // v1.0.0

// Route components with code splitting
import AuthRoutes from './AuthRoutes';
import PrivateRoutes from './PrivateRoutes';
import PublicRoutes from './PublicRoutes';

// Hooks and utilities
import { useAuth } from '../hooks/useAuth';

// Constants
import { ROUTES } from '../constants/route.constants';
import { THEME_CONSTANTS } from '../constants/app.constants';

/**
 * Loading fallback component for route suspense
 */
const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.background
    }}
    role="progressbar"
    aria-label="Loading route content"
  >
    Loading...
  </div>
);

/**
 * Error fallback component for route errors
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div
    role="alert"
    style={{
      padding: '20px',
      backgroundColor: THEME_CONSTANTS.COLOR_TOKENS.error,
      color: THEME_CONSTANTS.COLOR_TOKENS.onError
    }}
  >
    <h2>Navigation Error</h2>
    <pre>{error.message}</pre>
  </div>
);

/**
 * Main router component implementing secure routing with enhanced features
 */
const AppRouter: React.FC = React.memo(() => {
  const { isAuthenticated, validateSession, checkPermissions } = useAuth();

  // Validate session on route changes
  useEffect(() => {
    if (isAuthenticated) {
      validateSession().catch(error => {
        console.error('Session validation failed:', error);
      });
    }
  }, [isAuthenticated, validateSession]);

  // Handle route change analytics
  const handleRouteChange = (location: Location) => {
    Analytics.page({
      url: location.pathname,
      title: document.title,
      referrer: document.referrer
    });
  };

  // Track route changes
  useEffect(() => {
    window.addEventListener('popstate', () => handleRouteChange(window.location));
    return () => {
      window.removeEventListener('popstate', () => handleRouteChange(window.location));
    };
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Authentication Routes */}
            <Route
              path={`${ROUTES.AUTH.BASE}/*`}
              element={
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <AuthRoutes />
                </ErrorBoundary>
              }
            />

            {/* Protected Application Routes */}
            <Route
              path="/app/*"
              element={
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <PrivateRoutes />
                </ErrorBoundary>
              }
            />

            {/* Public Routes */}
            <Route
              path="/*"
              element={
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <PublicRoutes />
                </ErrorBoundary>
              }
            />

            {/* Default Redirect */}
            <Route
              path="/"
              element={
                <Navigate
                  to={isAuthenticated ? ROUTES.DASHBOARD.BASE : ROUTES.AUTH.LOGIN}
                  replace
                />
              }
            />

            {/* Catch-all for 404 */}
            <Route
              path="*"
              element={
                <Navigate
                  to={ROUTES.ERROR.NOT_FOUND}
                  replace
                  state={{ from: window.location.pathname }}
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
});

// Display name for debugging
AppRouter.displayName = 'AppRouter';

export default AppRouter;