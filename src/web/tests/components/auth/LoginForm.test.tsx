import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { toHaveNoViolations } from 'jest-axe';
import LoginForm from '../../src/components/auth/LoginForm';
import server from '../../mocks/server';
import { API_ENDPOINTS, HTTP_STATUS } from '../../../src/constants/api.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test data constants
const TEST_CREDENTIALS = {
  valid: {
    email: 'test@example.com',
    password: 'Test@123456',
    mfaCode: '123456'
  },
  invalid: {
    email: 'invalid-email',
    password: 'short',
    mfaCode: '000000'
  }
};

const MOCK_RESPONSES = {
  success: {
    accessToken: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  },
  mfaRequired: {
    mfaToken: 'mock-mfa-token',
    mfaType: 'totp'
  },
  errors: {
    invalidCredentials: {
      type: 'https://taskmanager.com/errors/invalid-credentials',
      title: 'Invalid credentials',
      status: HTTP_STATUS.UNAUTHORIZED,
      detail: 'The provided credentials are incorrect'
    },
    rateLimited: {
      type: 'https://taskmanager.com/errors/rate-limit',
      title: 'Too many attempts',
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      detail: 'Please try again later'
    }
  }
};

describe('LoginForm', () => {
  // Setup before all tests
  beforeAll(() => {
    server.listen();
  });

  // Clean up after each test
  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  // Clean up after all tests
  afterAll(() => {
    server.close();
  });

  describe('Form Rendering and Accessibility', () => {
    it('should render all form elements correctly', () => {
      render(<LoginForm />);

      // Check for essential form elements
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    });

    it('should meet accessibility standards', async () => {
      const { container } = render(<LoginForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle keyboard navigation correctly', () => {
      render(<LoginForm />);
      const emailInput = screen.getByLabelText(/email/i);
      
      // Check tab order
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      
      userEvent.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/password/i));
      
      userEvent.tab();
      expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: /remember me/i }));
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, TEST_CREDENTIALS.invalid.email);
      fireEvent.blur(emailInput);

      expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should validate password requirements', async () => {
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, TEST_CREDENTIALS.invalid.password);
      fireEvent.blur(passwordInput);

      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should validate MFA code format when required', async () => {
      server.use(
        rest.post(API_ENDPOINTS.AUTH.LOGIN, (req, res, ctx) => {
          return res(ctx.json(MOCK_RESPONSES.mfaRequired));
        })
      );

      render(<LoginForm />);
      
      // Submit valid credentials to trigger MFA
      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.valid.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Check MFA validation
      const mfaInput = await screen.findByLabelText(/mfa code/i);
      await userEvent.type(mfaInput, '12345'); // Invalid 5-digit code
      fireEvent.blur(mfaInput);

      expect(await screen.findByText(/mfa code must be 6 digits/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      const mockLogin = jest.fn();
      server.use(
        rest.post(API_ENDPOINTS.AUTH.LOGIN, (req, res, ctx) => {
          mockLogin(req.body);
          return res(ctx.json(MOCK_RESPONSES.success));
        })
      );

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.valid.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: TEST_CREDENTIALS.valid.email,
          password: TEST_CREDENTIALS.valid.password,
          rememberMe: false
        });
      });
    });

    it('should handle MFA flow correctly', async () => {
      const mockMfaVerify = jest.fn();
      server.use(
        rest.post(API_ENDPOINTS.AUTH.LOGIN, (req, res, ctx) => {
          return res(ctx.json(MOCK_RESPONSES.mfaRequired));
        }),
        rest.post(API_ENDPOINTS.AUTH.MFA_VERIFY, (req, res, ctx) => {
          mockMfaVerify(req.body);
          return res(ctx.json(MOCK_RESPONSES.success));
        })
      );

      render(<LoginForm />);

      // Initial login
      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.valid.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // MFA verification
      const mfaInput = await screen.findByLabelText(/mfa code/i);
      await userEvent.type(mfaInput, TEST_CREDENTIALS.valid.mfaCode);
      fireEvent.click(screen.getByRole('button', { name: /verify mfa/i }));

      await waitFor(() => {
        expect(mockMfaVerify).toHaveBeenCalledWith({
          code: TEST_CREDENTIALS.valid.mfaCode
        });
      });
    });

    it('should handle SSO authentication', async () => {
      const mockSsoLogin = jest.fn();
      server.use(
        rest.post(`${API_ENDPOINTS.AUTH.LOGIN}/google`, (req, res, ctx) => {
          mockSsoLogin('google');
          return res(ctx.json(MOCK_RESPONSES.success));
        })
      );

      render(<LoginForm />);

      fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

      await waitFor(() => {
        expect(mockSsoLogin).toHaveBeenCalledWith('google');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display invalid credentials error', async () => {
      server.use(
        rest.post(API_ENDPOINTS.AUTH.LOGIN, (req, res, ctx) => {
          return res(
            ctx.status(HTTP_STATUS.UNAUTHORIZED),
            ctx.json(MOCK_RESPONSES.errors.invalidCredentials)
          );
        })
      );

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.valid.email);
      await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.invalid.password);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText(/the provided credentials are incorrect/i)).toBeInTheDocument();
    });

    it('should handle rate limiting', async () => {
      server.use(
        rest.post(API_ENDPOINTS.AUTH.LOGIN, (req, res, ctx) => {
          return res(
            ctx.status(HTTP_STATUS.TOO_MANY_REQUESTS),
            ctx.json(MOCK_RESPONSES.errors.rateLimited)
          );
        })
      );

      render(<LoginForm />);

      // Attempt multiple logins
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      }

      expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });
});