import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy-loaded error pages with enhanced features
const NotFoundPage = lazy(() => import('../pages/error/404'));
const ServerError500 = lazy(() => import('../pages/error/500'));

/**
 * Enhanced public routes configuration component with comprehensive error handling
 * and analytics integration
 */
const PublicRoutes: React.FC = React.memo(() => {
  /**
   * Handles route-level errors with analytics tracking
   */
  const handleRouteError = (error: Error) => {
    console.error('Route error:', error);
    // Track error in analytics
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      // Log error details for monitoring
      console.error('Route error details:', errorData);
    } catch (trackingError) {
      console.error('Error tracking failed:', trackingError);
    }
  };

  /**
   * Renders fallback UI during lazy loading
   */
  const renderLoadingFallback = () => (
    <div
      role="progressbar"
      aria-label="Loading page content"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}
    >
      Loading...
    </div>
  );

  return (
    <ErrorBoundary
      onError={handleRouteError}
      fallback={<ServerError500 />}
    >
      <Routes>
        {/* Enhanced 404 error page with analytics */}
        <Route
          path="/404"
          element={
            <Suspense fallback={renderLoadingFallback()}>
              <NotFoundPage />
            </Suspense>
          }
        />

        {/* Enhanced 500 error page with recovery options */}
        <Route
          path="/500"
          element={
            <Suspense fallback={renderLoadingFallback()}>
              <ServerError500 />
            </Suspense>
          }
        />

        {/* Catch-all route for undefined paths */}
        <Route
          path="*"
          element={
            <Suspense fallback={renderLoadingFallback()}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
});

// Display name for debugging
PublicRoutes.displayName = 'PublicRoutes';

export default PublicRoutes;