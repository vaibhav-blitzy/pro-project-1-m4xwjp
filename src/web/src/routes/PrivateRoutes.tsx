/**
 * @fileoverview Protected routes component implementing secure routing with JWT validation,
 * role-based access control, and comprehensive error handling
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/route.constants';
import AppLayout from '../components/layout/AppLayout';

// Lazy load route components for code splitting
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Projects = React.lazy(() => import('../pages/Projects'));
const Tasks = React.lazy(() => import('../pages/Tasks'));
const Settings = React.lazy(() => import('../pages/Settings'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

/**
 * Higher-order component that enforces authentication and role-based access
 */
const RequireAuth: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, validateToken } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Validate JWT token on route change
    if (isAuthenticated) {
      validateToken().catch(() => {
        console.error('Token validation failed');
      });
    }
  }, [isAuthenticated, validateToken, location.pathname]);

  if (!isAuthenticated) {
    // Redirect to login while preserving intended destination
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={ROUTES.ERROR.FORBIDDEN} replace />;
  }

  return <>{children}</>;
};

/**
 * Protected routes component that handles authentication-required routes
 * with role-based access control
 */
const PrivateRoutes: React.FC = React.memo(() => {
  const location = useLocation();

  // Fallback component for React.Suspense
  const LoadingFallback = () => (
    <div role="progressbar" aria-label="Loading page content">
      Loading...
    </div>
  );

  // Error fallback component for ErrorBoundary
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div role="alert">
      <h2>Error Loading Page</h2>
      <pre>{error.message}</pre>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RequireAuth>
        <AppLayout>
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes location={location}>
              {/* Dashboard Routes */}
              <Route
                path={ROUTES.DASHBOARD.OVERVIEW}
                element={<Dashboard />}
              />
              <Route
                path={ROUTES.DASHBOARD.ANALYTICS}
                element={
                  <RequireAuth allowedRoles={['ADMIN', 'PROJECT_MANAGER']}>
                    <Dashboard />
                  </RequireAuth>
                }
              />

              {/* Project Routes */}
              <Route
                path={ROUTES.PROJECTS.BASE}
                element={<Projects />}
              />
              <Route
                path={ROUTES.PROJECTS.CREATE}
                element={
                  <RequireAuth allowedRoles={['ADMIN', 'PROJECT_MANAGER']}>
                    <Projects />
                  </RequireAuth>
                }
              />
              <Route
                path={ROUTES.PROJECTS.DETAILS}
                element={<Projects />}
              />

              {/* Task Routes */}
              <Route
                path={ROUTES.TASKS.BASE}
                element={<Tasks />}
              />
              <Route
                path={ROUTES.TASKS.CREATE}
                element={<Tasks />}
              />
              <Route
                path={ROUTES.TASKS.DETAILS}
                element={<Tasks />}
              />
              <Route
                path={ROUTES.TASKS.BOARD}
                element={<Tasks />}
              />

              {/* Settings Routes */}
              <Route
                path={ROUTES.SETTINGS.BASE}
                element={<Settings />}
              />
              <Route
                path={ROUTES.SETTINGS.PROFILE}
                element={<Settings />}
              />
              <Route
                path={ROUTES.SETTINGS.SECURITY}
                element={
                  <RequireAuth allowedRoles={['ADMIN']}>
                    <Settings />
                  </RequireAuth>
                }
              />

              {/* Catch-all route for 404 */}
              <Route
                path="*"
                element={<NotFound />}
              />
            </Routes>
          </React.Suspense>
        </AppLayout>
      </RequireAuth>
    </ErrorBoundary>
  );
});

PrivateRoutes.displayName = 'PrivateRoutes';

export default PrivateRoutes;