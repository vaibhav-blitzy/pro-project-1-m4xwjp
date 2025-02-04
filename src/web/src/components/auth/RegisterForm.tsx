import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // v7.45.0
import { useNavigate } from 'react-router-dom'; // v6.14.0
import { CircularProgress } from '@mui/material'; // v5.14.0
import { AuthCredentials } from '../../interfaces/auth.interface';
import { validateRegistrationForm } from '../../validators/auth.validator';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import Button from '../common/Button';
import { THEME_CONSTANTS, GRID } from '../../constants/app.constants';
import { ErrorCodes, ErrorMessages } from '../../constants/error.constants';

interface RegisterFormProps {
  onSuccess: (tokens: AuthTokens) => void;
  onError: (error: string) => void;
  className?: string;
}

interface RegisterFormData extends AuthCredentials {
  confirmPassword: string;
  acceptTerms: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onError = (error: string) => console.error(error),
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  const authService = new AuthService();
  const storageService = new StorageService();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<RegisterFormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    }
  });

  const password = watch('password');

  useEffect(() => {
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    }
  }, [password]);

  const calculatePasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    return score;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);

      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (passwordStrength < 60) {
        throw new Error('Password is not strong enough');
      }

      const { email, password } = data;
      const response = await authService.register({ email, password });

      if (response.success && response.data) {
        await storageService.setSecureItem('auth_tokens', response.data);
        onSuccess(response.data);
        navigate('/dashboard');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form 
      className={`register-form ${className}`}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Registration form"
    >
      <div className="form-field">
        <label htmlFor="email" className="form-label">
          Email address
        </label>
        <input
          id="email"
          type="email"
          className="form-input"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          aria-invalid={!!errors.email}
          aria-describedby="email-error"
        />
        {errors.email && (
          <span id="email-error" className="error-message" role="alert">
            {errors.email.message}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="form-input"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters'
            }
          })}
          aria-invalid={!!errors.password}
          aria-describedby="password-error password-strength"
        />
        <div 
          id="password-strength" 
          className="password-strength"
          role="progressbar"
          aria-valuenow={passwordStrength}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div 
            className="strength-bar"
            style={{ 
              width: `${passwordStrength}%`,
              backgroundColor: passwordStrength > 60 ? THEME_CONSTANTS.COLOR_TOKENS.primary : THEME_CONSTANTS.COLOR_TOKENS.error
            }}
          />
        </div>
        {errors.password && (
          <span id="password-error" className="error-message" role="alert">
            {errors.password.message}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="confirmPassword" className="form-label">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="form-input"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby="confirm-password-error"
        />
        {errors.confirmPassword && (
          <span id="confirm-password-error" className="error-message" role="alert">
            {errors.confirmPassword.message}
          </span>
        )}
      </div>

      <div className="form-field">
        <label className="form-checkbox">
          <input
            type="checkbox"
            {...register('acceptTerms', {
              required: 'You must accept the terms and conditions'
            })}
            aria-invalid={!!errors.acceptTerms}
            aria-describedby="terms-error"
          />
          <span className="checkbox-label">
            I accept the terms and conditions
          </span>
        </label>
        {errors.acceptTerms && (
          <span id="terms-error" className="error-message" role="alert">
            {errors.acceptTerms.message}
          </span>
        )}
      </div>

      <Button
        type="submit"
        disabled={!isValid || loading}
        loading={loading}
        fullWidth
        variant="contained"
        size="LARGE"
        ariaLabel="Register account"
      >
        {loading ? 'Creating Account...' : 'Register'}
      </Button>
    </form>
  );
};

export default RegisterForm;