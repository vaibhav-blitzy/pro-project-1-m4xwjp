import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import Input from '../common/Input';
import Button from '../common/Button';
import { useForm } from '../../hooks/useForm';
import { AuthService } from '../../services/auth.service';
import { FormFieldType } from '../../types/form.types';
import { THEME_CONSTANTS, ANIMATION_TIMINGS } from '../../constants/app.constants';

/**
 * Props interface for ForgotPasswordForm component
 */
interface ForgotPasswordFormProps {
  /** Callback fired on successful password reset request */
  onSuccess?: (email: string) => void;
  /** Callback fired on password reset request error */
  onError?: (error: Error) => void;
  /** Callback fired when rate limit is exceeded */
  onRateLimit?: (waitTime: number) => void;
  /** CSRF token for form security */
  csrfToken: string;
}

/**
 * Interface for form data with validation
 */
interface ForgotPasswordFormData {
  email: string;
  csrfToken: string;
}

/**
 * A secure and accessible form component for handling password reset requests
 * Implements Material Design 3 guidelines and WCAG 2.1 Level AA compliance
 */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onError,
  onRateLimit,
  csrfToken
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form with validation rules
  const {
    register,
    handleSubmit,
    errors,
    setError,
    accessibilityContext,
    securityState
  } = useForm(
    [
      {
        name: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email Address',
        validation: {
          required: true,
          ariaLabel: 'Email address input',
          errorMessage: {
            key: 'Please enter a valid email address',
            params: {}
          },
          accessibilityRules: {
            ariaRequired: true,
            ariaInvalid: false,
            ariaDescribedBy: 'email-error'
          }
        }
      }
    ],
    handleFormSubmit,
    {
      mode: 'onBlur',
      criteriaMode: 'all'
    }
  );

  /**
   * Handles form submission with security checks and rate limiting
   */
  const handleFormSubmit = useCallback(async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Validate CSRF token
      if (data.csrfToken !== csrfToken) {
        throw new Error('Invalid security token');
      }

      // Initialize AuthService
      const authService = new AuthService();

      // Attempt password reset request
      await authService.requestPasswordReset(data.email);

      // Handle success
      onSuccess?.(data.email);
      navigate('/auth/check-email', { 
        state: { email: data.email },
        replace: true 
      });

    } catch (error) {
      const err = error as Error;
      
      // Handle rate limiting
      if (err.message.includes('rate limit')) {
        const waitTime = parseInt(err.message.match(/\d+/)?.[0] || '60', 10);
        onRateLimit?.(waitTime);
        setError('email', {
          type: 'rateLimit',
          message: `Too many attempts. Please try again in ${waitTime} seconds.`
        });
        return;
      }

      // Handle other errors
      setSubmitError(err.message);
      onError?.(err);

    } finally {
      setIsSubmitting(false);
    }
  }, [csrfToken, navigate, onSuccess, onError, onRateLimit, setError]);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Password reset request form"
      aria-describedby="form-error"
    >
      {/* Hidden CSRF token */}
      <input 
        type="hidden" 
        {...register('csrfToken')}
        value={csrfToken}
      />

      {/* Email input with accessibility support */}
      <Input
        type={FormFieldType.EMAIL}
        label="Email Address"
        placeholder="Enter your email address"
        error={errors.email?.message}
        required
        autoComplete="email"
        {...register('email')}
        aria-label="Email address input"
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />

      {/* Form-level error message */}
      {submitError && (
        <div
          id="form-error"
          role="alert"
          aria-live="assertive"
          style={{
            color: THEME_CONSTANTS.COLOR_TOKENS.error,
            marginBottom: THEME_CONSTANTS.GRID.BASE_SPACING,
            fontSize: THEME_CONSTANTS.TYPOGRAPHY.bodySmall.fontSize
          }}
        >
          {submitError}
        </div>
      )}

      {/* Submit button with loading state */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting || securityState.hasSecurityViolations}
        loading={isSubmitting}
        aria-label="Request password reset"
      >
        Reset Password
      </Button>

      {/* Accessibility announcements */}
      <div
        role="status"
        aria-live={accessibilityContext.ariaLive}
        className="visually-hidden"
      >
        {accessibilityContext.announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
    </form>
  );
};

export default ForgotPasswordForm;