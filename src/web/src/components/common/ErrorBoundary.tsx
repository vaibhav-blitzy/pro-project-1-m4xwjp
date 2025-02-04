/**
 * @fileoverview React Error Boundary component with RFC 7807 error handling and Material Design 3 presentation
 * Catches JavaScript errors in child components and displays a fallback UI
 * @version 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'; // v18.2.0
import { Card, Typography, Button, Box, Alert } from '@mui/material'; // v5.14.0
import { showToast } from './Toast';
import type { ApiError } from '../../types/api.types';
import type { BaseProps } from '../../interfaces/common.interface';

// Constants for error handling
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';
const RETRY_DELAY = 1000;

/**
 * Props interface for ErrorBoundary component
 */
interface ErrorBoundaryProps extends BaseProps {
  /** Custom fallback message to display */
  fallbackMessage?: string;
  /** Optional callback for error handling */
  onError?: (error: RFC7807Error, errorInfo: ErrorInfo) => void;
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: RFC7807Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
}

/**
 * RFC 7807 compliant error structure
 */
interface RFC7807Error {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: number;
  traceId: string;
}

/**
 * Error Boundary component that catches JavaScript errors and provides fallback UI
 * Implements RFC 7807 problem details format and Material Design 3 presentation
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false
    };

    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Static method to derive error state from caught errors
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Format error into RFC 7807 structure
    const rfc7807Error: RFC7807Error = {
      type: 'about:blank',
      title: error.name,
      status: 500,
      detail: error.message || DEFAULT_ERROR_MESSAGE,
      instance: window.location.pathname,
      timestamp: Date.now(),
      traceId: Math.random().toString(36).substring(7)
    };

    return {
      hasError: true,
      error: rfc7807Error
    };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;
    const rfc7807Error = this.state.error as RFC7807Error;

    // Log error details
    console.error('Error Boundary caught an error:', {
      ...rfc7807Error,
      componentStack: errorInfo.componentStack
    });

    // Show error notification
    showToast({
      message: rfc7807Error.detail,
      severity: 'error',
      duration: 6000,
      position: { vertical: 'top', horizontal: 'center' }
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call error callback if provided
    if (onError) {
      onError(rfc7807Error, errorInfo);
    }
  }

  /**
   * Handles retry attempts for recoverable errors
   */
  async handleRetry(): Promise<void> {
    this.setState({ isRetrying: true });

    try {
      // Delay retry to prevent rapid retries
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });

      // Show success notification
      showToast({
        message: 'Successfully recovered from error',
        severity: 'success',
        duration: 3000
      });
    } catch (retryError) {
      console.error('Error retry failed:', retryError);
    } finally {
      this.setState({ isRetrying: false });
    }
  }

  render(): ReactNode {
    const { children, fallbackMessage } = this.props;
    const { hasError, error, isRetrying } = this.state;

    if (hasError && error) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            p: 3
          }}
        >
          <Card
            elevation={3}
            sx={{
              maxWidth: '600px',
              width: '100%',
              p: 3
            }}
          >
            <Alert
              severity="error"
              variant="filled"
              sx={{ mb: 2 }}
            >
              {error.title}
            </Alert>

            <Typography variant="h6" gutterBottom>
              {fallbackMessage || DEFAULT_ERROR_MESSAGE}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {error.detail}
            </Typography>

            <Typography variant="caption" display="block" sx={{ mb: 2 }}>
              Error ID: {error.traceId}
            </Typography>

            <Button
              variant="contained"
              onClick={this.handleRetry}
              disabled={isRetrying}
              sx={{ mr: 1 }}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>

            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              disabled={isRetrying}
            >
              Reload Page
            </Button>
          </Card>
        </Box>
      );
    }

    return children;
  }
}

export default ErrorBoundary;