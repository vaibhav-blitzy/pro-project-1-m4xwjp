/**
 * @fileoverview Forgot Password page component implementing secure password reset
 * functionality with enhanced accessibility and comprehensive error handling
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, CircularProgress } from '@mui/material';
import AuthLayout from '../../components/layout/AuthLayout';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import useNotification from '../../hooks/useNotification';
import { useCsrfToken } from '@security/csrf';
import { THEME_CONSTANTS } from '../../constants/app.constants';

/**
 * ForgotPassword page component with enhanced security and accessibility features
 * Implements WCAG 2.1 Level AA compliance and Material Design 3 guidelines
 */
const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { csrfToken } = useCsrfToken();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles successful password reset request with proper feedback
   * @param email - User's email address
   */
  const handleSuccess = useCallback((email: string) => {
    setIsSubmitting(false);
    showNotification({
      message: 'Password reset instructions have been sent to your email',
      type: 'success',
      ariaLive: 'polite',
      autoHideDuration: 6000
    });
    navigate('/auth/check-email', { 
      state: { email },
      replace: true 
    });
  }, [navigate, showNotification]);

  /**
   * Handles password reset request errors with enhanced feedback
   * @param error - Error object from the request
   */
  const handleError = useCallback((error: Error) => {
    setIsSubmitting(false);
    showNotification({
      message: error.message || 'Failed to process password reset request',
      type: 'error',
      ariaLive: 'assertive',
      autoHideDuration: 8000
    });
  }, [showNotification]);

  /**
   * Handles rate limiting with user feedback
   * @param waitTime - Time to wait before retrying in seconds
   */
  const handleRateLimit = useCallback((waitTime: number) => {
    showNotification({
      message: `Too many attempts. Please try again in ${waitTime} seconds.`,
      type: 'warning',
      ariaLive: 'polite',
      autoHideDuration: waitTime * 1000
    });
  }, [showNotification]);

  return (
    <AuthLayout>
      <div role="main" aria-labelledby="forgot-password-title">
        <Typography
          id="forgot-password-title"
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{
            color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
            marginBottom: 3,
            ...THEME_CONSTANTS.TYPOGRAPHY.headlineLarge
          }}
        >
          Reset Password
        </Typography>

        <Typography
          variant="body1"
          align="center"
          gutterBottom
          sx={{
            color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
            marginBottom: 4,
            ...THEME_CONSTANTS.TYPOGRAPHY.bodyLarge
          }}
        >
          Enter your email address and we'll send you instructions to reset your password.
        </Typography>

        {isSubmitting && (
          <div
            role="status"
            aria-label="Submitting request"
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: THEME_CONSTANTS.GRID.BASE_SPACING * 2
            }}
          >
            <CircularProgress size={24} />
          </div>
        )}

        <ForgotPasswordForm
          onSuccess={handleSuccess}
          onError={handleError}
          onRateLimit={handleRateLimit}
          csrfToken={csrfToken}
        />

        <Typography
          variant="body2"
          align="center"
          sx={{
            marginTop: 3,
            color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
            ...THEME_CONSTANTS.TYPOGRAPHY.bodySmall
          }}
        >
          Remember your password?{' '}
          <a
            href="/auth/login"
            style={{
              color: THEME_CONSTANTS.COLOR_TOKENS.primary,
              textDecoration: 'none'
            }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/auth/login');
            }}
          >
            Back to login
          </a>
        </Typography>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;