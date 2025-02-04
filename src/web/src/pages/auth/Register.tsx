import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import RegisterForm from '../../components/auth/RegisterForm';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import type { AuthTokens } from '../../interfaces/auth.interface';

/**
 * Registration page component that provides a secure and accessible user registration interface
 * Implements Material Design 3 specifications and comprehensive error handling
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const { showNotification } = useNotification();

  /**
   * Handles successful registration with proper token storage and navigation
   * @param tokens Authentication tokens from successful registration
   */
  const handleRegistrationSuccess = useCallback(async (tokens: AuthTokens) => {
    try {
      showNotification({
        type: 'success',
        message: 'Registration successful! Welcome to Task Management System.'
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Post-registration handling failed:', error);
      showNotification({
        type: 'error',
        message: 'Registration succeeded but encountered an error. Please try logging in.'
      });
      navigate('/login');
    }
  }, [navigate, showNotification]);

  /**
   * Handles registration errors with user-friendly feedback
   * @param error Error message or object
   */
  const handleRegistrationError = useCallback((error: string) => {
    showNotification({
      type: 'error',
      message: error || 'Registration failed. Please try again.'
    });
  }, [showNotification]);

  /**
   * Handles form submission with validation and error handling
   */
  const handleSubmit = useCallback(async (credentials: AuthCredentials) => {
    try {
      const response = await register(credentials);
      if (response?.tokens) {
        await handleRegistrationSuccess(response.tokens);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      handleRegistrationError(errorMessage);
    }
  }, [register, handleRegistrationSuccess, handleRegistrationError]);

  return (
    <AuthLayout 
      title="Create Account"
      maxWidth={440}
      elevation={3}
    >
      <RegisterForm
        onSubmit={handleSubmit}
        isLoading={loading}
        aria-label="Registration form"
      />
    </AuthLayout>
  );
};

export default Register;