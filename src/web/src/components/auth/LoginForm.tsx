import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // v7.45.0
import { object, string } from 'yup'; // v1.2.0
import { 
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  Divider,
  Typography,
  Alert,
  Box
} from '@mui/material'; // v5.14.0
import { 
  Visibility, 
  VisibilityOff,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon
} from '@mui/icons-material'; // v5.14.0
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import { GRID, THEME_CONSTANTS } from '../../constants/app.constants';

// Form validation schema following security best practices
const validationSchema = object().shape({
  email: string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim(),
  password: string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
      'Password must contain at least one letter and one number'
    ),
  mfaCode: string()
    .matches(/^\d{6}$/, 'MFA code must be 6 digits')
    .optional(),
  rememberMe: string().optional()
});

// Interface for form data
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
  mfaCode?: string;
}

// Interface for authentication errors
interface AuthError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

const LoginForm: React.FC = () => {
  // Form state management with validation
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
      mfaCode: ''
    }
  });

  // Local state management
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Authentication hook
  const { login, loginWithSso, verifyMfa, loading, error } = useAuth();

  // Reset form on unmount for security
  useEffect(() => {
    return () => {
      reset();
      setAttemptCount(0);
    };
  }, [reset]);

  // Handle form submission with security measures
  const onSubmit = async (data: LoginFormData) => {
    try {
      // Rate limiting check
      if (attemptCount >= 5) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      setAttemptCount(prev => prev + 1);

      // Handle MFA verification if required
      if (mfaRequired && data.mfaCode) {
        await verifyMfa(data.mfaCode);
        return;
      }

      // Regular login flow
      await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        rememberMe: data.rememberMe
      });

      // Clear sensitive data
      reset();
      setAttemptCount(0);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  // Handle SSO authentication
  const handleSsoLogin = async (provider: 'google' | 'microsoft') => {
    try {
      await loginWithSso(provider);
    } catch (err) {
      console.error('SSO login failed:', err);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: GRID.BASE_SPACING * 2,
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        padding: GRID.BASE_SPACING * 3
      }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Sign In
      </Typography>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {/* Email field */}
      <TextField
        {...register('email')}
        label="Email"
        type="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        fullWidth
        autoComplete="email"
        autoFocus
        disabled={loading}
        InputProps={{
          'aria-label': 'Email address'
        }}
      />

      {/* Password field */}
      <TextField
        {...register('password')}
        label="Password"
        type={showPassword ? 'text' : 'password'}
        error={!!errors.password}
        helperText={errors.password?.message}
        fullWidth
        autoComplete="current-password"
        disabled={loading}
        InputProps={{
          'aria-label': 'Password',
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      {/* MFA field when required */}
      {mfaRequired && (
        <TextField
          {...register('mfaCode')}
          label="MFA Code"
          type="text"
          error={!!errors.mfaCode}
          helperText={errors.mfaCode?.message}
          fullWidth
          autoComplete="one-time-code"
          disabled={loading}
          InputProps={{
            'aria-label': 'MFA verification code'
          }}
        />
      )}

      {/* Remember me checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            {...register('rememberMe')}
            color="primary"
            disabled={loading}
          />
        }
        label="Remember me"
      />

      {/* Submit button */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        loading={loading}
        disabled={loading || attemptCount >= 5}
      >
        {mfaRequired ? 'Verify MFA' : 'Sign In'}
      </Button>

      {/* SSO options */}
      <Divider sx={{ my: 2 }}>or</Divider>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={() => handleSsoLogin('google')}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<MicrosoftIcon />}
        onClick={() => handleSsoLogin('microsoft')}
        disabled={loading}
      >
        Continue with Microsoft
      </Button>

      {/* Forgot password link */}
      <Typography variant="body2" align="center">
        <a
          href="/forgot-password"
          style={{
            color: THEME_CONSTANTS.COLOR_TOKENS.primary,
            textDecoration: 'none'
          }}
        >
          Forgot your password?
        </a>
      </Typography>
    </Box>
  );
};

export default LoginForm;