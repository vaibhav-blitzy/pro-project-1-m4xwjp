/**
 * @fileoverview Root application component that initializes the task management system
 * with routing, theme configuration, error boundaries, global providers, and monitoring
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { datadogRum } from '@datadog/browser-rum'; // v4.0.0
import * as Sentry from '@sentry/react'; // v7.0.0
import { store } from './store';
import AppRouter from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { THEME_CONSTANTS } from './constants/app.constants';

// Initialize performance monitoring
datadogRum.init({
  applicationId: process.env.REACT_APP_DATADOG_APP_ID || '',
  clientToken: process.env.REACT_APP_DATADOG_CLIENT_TOKEN || '',
  site: 'datadoghq.com',
  service: 'task-management-system',
  env: process.env.NODE_ENV,
  version: process.env.REACT_APP_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input'
});

// Initialize error tracking
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Sanitize sensitive data before sending
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  }
});

// Create Material Design 3 theme
const theme = createTheme({
  palette: {
    primary: {
      main: THEME_CONSTANTS.COLOR_TOKENS.primary,
      contrastText: THEME_CONSTANTS.COLOR_TOKENS.onPrimary,
    },
    background: {
      default: THEME_CONSTANTS.COLOR_TOKENS.background,
      paper: THEME_CONSTANTS.COLOR_TOKENS.surface,
    },
    error: {
      main: THEME_CONSTANTS.COLOR_TOKENS.error,
      contrastText: THEME_CONSTANTS.COLOR_TOKENS.onError,
    },
  },
  typography: THEME_CONSTANTS.TYPOGRAPHY,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: THEME_CONSTANTS.COLOR_TOKENS.surfaceVariant,
          },
          '&::-webkit-scrollbar-thumb': {
            background: THEME_CONSTANTS.COLOR_TOKENS.outline,
            borderRadius: '4px',
          },
        },
      },
    },
  },
});

/**
 * Root application component that sets up the complete application environment
 * with monitoring, theme, and security features
 */
const App: React.FC = React.memo(() => {
  // Monitor performance metrics
  useEffect(() => {
    const reportWebVitals = ({ name, delta, id }: any) => {
      datadogRum.addTiming(name, delta, { id });
    };

    // @ts-ignore - Web Vitals types
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
      getLCP(reportWebVitals);
      getTTFB(reportWebVitals);
    });
  }, []);

  return (
    <ErrorBoundary
      fallbackMessage="An unexpected error occurred in the application"
      onError={(error) => {
        Sentry.captureException(error);
        datadogRum.addError(error);
      }}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppRouter />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
});

// Set display name for debugging
App.displayName = 'App';

// Apply performance monitoring
const MonitoredApp = Sentry.withProfiler(App);

export default MonitoredApp;