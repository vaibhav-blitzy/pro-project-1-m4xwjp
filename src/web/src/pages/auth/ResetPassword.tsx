import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FormFieldType } from '../../types/form.types';
import { THEME_CONSTANTS, GRID } from '../../constants/app.constants';

// Interface for form data
interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Validation schema following security requirements
const validationSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(12, 'Password must be at least 12 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{12,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match')
});

/**
 * Password reset component with comprehensive validation and accessibility
 * Implements Material Design 3 standards and secure password requirements
 */
const ResetPassword: React.FC = () => {
  const { resetPassword, loading, error, isTokenValid } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [tokenValidated, setTokenValidated] = useState<boolean>(false);

  // Form initialization with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>({
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  // Validate reset token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (token && isTokenValid) {
        const isValid = await isTokenValid(token);
        setTokenValidated(isValid);
        if (!isValid) {
          navigate('/auth/invalid-token');
        }
      }
    };

    validateToken();
  }, [token, isTokenValid, navigate]);

  // Handle form submission
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !tokenValidated) return;

    try {
      await resetPassword(data.password, token);
      navigate('/auth/login', { 
        state: { message: 'Password reset successful. Please login with your new password.' }
      });
    } catch (err) {
      console.error('Password reset failed:', err);
    }
  };

  // Calculate password strength for visual feedback
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 12.5;
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const passwordStrength = calculatePasswordStrength(watch('password'));

  return (
    <div
      style={{
        padding: GRID.CONTAINER_PADDING,
        maxWidth: '400px',
        margin: '0 auto',
        marginTop: GRID.LAYOUT_SPACING.section
      }}
    >
      <h1
        style={{
          ...THEME_CONSTANTS.TYPOGRAPHY.headlineLarge,
          marginBottom: GRID.LAYOUT_SPACING.section,
          color: THEME_CONSTANTS.COLOR_TOKENS.onBackground
        }}
      >
        Reset Password
      </h1>

      {tokenValidated && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: GRID.LAYOUT_SPACING.component }}>
            <Input
              type={FormFieldType.PASSWORD}
              name="password"
              label="New Password"
              register={register}
              error={errors.password?.message}
              required
              autoComplete="new-password"
              aria-label="New password input"
              aria-describedby="password-requirements"
            />
            <div
              id="password-requirements"
              style={{
                fontSize: THEME_CONSTANTS.TYPOGRAPHY.bodySmall.fontSize,
                color: THEME_CONSTANTS.COLOR_TOKENS.outline,
                marginTop: GRID.BASE_SPACING
              }}
            >
              Password must be at least 12 characters and contain uppercase, lowercase, number, and special character
            </div>
            
            {/* Password strength indicator */}
            <div
              role="progressbar"
              aria-valuenow={passwordStrength}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                height: '4px',
                background: THEME_CONSTANTS.COLOR_TOKENS.surfaceVariant,
                marginTop: GRID.BASE_SPACING,
                borderRadius: '2px'
              }}
            >
              <div
                style={{
                  width: `${passwordStrength}%`,
                  height: '100%',
                  background: passwordStrength > 75 
                    ? THEME_CONSTANTS.COLOR_TOKENS.primary 
                    : THEME_CONSTANTS.COLOR_TOKENS.error,
                  transition: 'width 0.3s ease-in-out',
                  borderRadius: '2px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: GRID.LAYOUT_SPACING.component }}>
            <Input
              type={FormFieldType.PASSWORD}
              name="confirmPassword"
              label="Confirm Password"
              register={register}
              error={errors.confirmPassword?.message}
              required
              autoComplete="new-password"
              aria-label="Confirm password input"
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                color: THEME_CONSTANTS.COLOR_TOKENS.error,
                marginBottom: GRID.LAYOUT_SPACING.component,
                fontSize: THEME_CONSTANTS.TYPOGRAPHY.bodySmall.fontSize
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            loading={loading}
            disabled={loading}
            fullWidth
            ariaLabel="Reset password"
          >
            Reset Password
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;