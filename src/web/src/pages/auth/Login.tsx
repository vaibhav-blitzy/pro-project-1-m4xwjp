/**
 * @fileoverview Login page component implementing secure authentication with Material Design 3
 * Supports email/password and SSO authentication with comprehensive security features
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom'; // v6.14.0
import { Helmet } from 'react-helmet-async'; // v1.3.0
import AuthLayout from '../../components/layout/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../constants/app.constants';

/**
 * Login page component providing secure authentication interface
 * Implements comprehensive security measures and error handling
 */
const Login: React.FC = () => {
  // Authentication state management
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Security monitoring
  useEffect(() => {
    // Monitor suspicious behavior
    const securityTimeout = setTimeout(() => {
      const loginAttempts = parseInt(
        sessionStorage.getItem('login_attempts') || '0',
        10
      );
      if (loginAttempts > 5) {
        console.warn('Multiple failed login attempts detected');
      }
    }, 1000);

    return () => {
      clearTimeout(securityTimeout);
    };
  }, []);

  // Handle form submission with security measures
  const handleLogin = async (credentials: any) => {
    try {
      setLoading(true);

      // Increment login attempts counter
      const attempts = parseInt(
        sessionStorage.getItem('login_attempts') || '0',
        10
      );
      sessionStorage.setItem('login_attempts', (attempts + 1).toString());

      // Rate limiting check
      if (attempts >= 5) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      await login(credentials);

      // Reset attempts on successful login
      sessionStorage.removeItem('login_attempts');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary
      fallbackMessage="An error occurred during authentication"
      onError={(error) => {
        console.error('Authentication error:', error);
      }}
    >
      <Helmet>
        <title>Login | {APP_CONFIG.APP_NAME}</title>
        <meta name="description" content="Secure login to Task Management System" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <AuthLayout
        title="Welcome Back"
        maxWidth={440}
        elevation={3}
        loading={loading}
      >
        <LoginForm
          onSubmit={handleLogin}
          loading={loading}
        />
      </AuthLayout>
    </ErrorBoundary>
  );
};

// Apply error boundary decorator
const LoginWithErrorBoundary = ErrorBoundary.wrap(Login);

export default LoginWithErrorBoundary;