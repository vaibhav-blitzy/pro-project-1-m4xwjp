/**
 * @fileoverview Entry point for the React application implementing Material Design 3
 * Initializes root component with providers, development tools, and performance monitoring
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import ReactDOM from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.1.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { PerformanceMonitor } from '@performance-monitor/react'; // v1.0.0
import App from './App';
import { store } from './store';
import { APP_CONFIG } from './constants/app.constants';

// Get root element and validate its existence
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Please check your HTML file.');
}

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Validates root element existence and type
 * @returns boolean indicating if root element is valid
 */
const validateRootElement = (): boolean => {
  return rootElement instanceof HTMLElement;
};

/**
 * Initializes performance monitoring for production
 */
const initializePerformanceMonitoring = (): void => {
  if (!isDevelopment) {
    PerformanceMonitor.init({
      appId: APP_CONFIG.APP_NAME,
      version: APP_CONFIG.APP_VERSION,
      enableNavigationTracking: true,
      enableErrorTracking: true,
      sampleRate: 100,
      maxEntries: 100
    });
  }
};

/**
 * Renders the root application component with all required providers
 */
const renderApp = (): void => {
  // Validate root element
  if (!validateRootElement()) {
    throw new Error('Invalid root element type');
  }

  // Initialize performance monitoring in production
  initializePerformanceMonitoring();

  // Create root with React 18 concurrent features
  const root = ReactDOM.createRoot(rootElement);

  // Render app with providers and error boundaries
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        fallback={
          <div role="alert">
            <h1>Application Error</h1>
            <p>An unexpected error occurred. Please refresh the page.</p>
          </div>
        }
        onError={(error) => {
          console.error('Application error:', error);
          // Report error to monitoring service
          if (!isDevelopment) {
            PerformanceMonitor.trackError(error);
          }
        }}
      >
        <Provider store={store}>
          {!isDevelopment && (
            <PerformanceMonitor>
              <App />
            </PerformanceMonitor>
          )}
          {isDevelopment && <App />}
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Cleanup on unmount
  return () => {
    root.unmount();
    if (!isDevelopment) {
      PerformanceMonitor.cleanup();
    }
  };
};

// Initialize the application
try {
  renderApp();
} catch (error) {
  console.error('Failed to initialize application:', error);
  // Show user-friendly error message
  if (rootElement) {
    rootElement.innerHTML = `
      <div role="alert" style="padding: 20px; text-align: center;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please try refreshing the page.</p>
      </div>
    `;
  }
  // Report initialization error
  if (!isDevelopment) {
    PerformanceMonitor.trackError(error as Error);
  }
}