import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { rest } from 'msw';
import server from '../mocks/server';
import { useAuth } from '../../src/hooks/useAuth';
import 'jest-localstorage-mock';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../src/store/auth/auth.reducer';
import { API_ENDPOINTS, HTTP_STATUS } from '../../src/constants/api.constants';

// Mock store setup
const mockStore = configureStore({
  reducer: {
    auth: authReducer
  }
});

// Mock API responses
const mockLoginResponse = {
  data: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  },
  success: true,
  error: null
};

const mockSsoResponse = {
  data: {
    accessToken: 'mock-sso-token',
    refreshToken: 'mock-sso-refresh',
    expiresIn: 3600,
    tokenType: 'Bearer'
  },
  success: true,
  error: null
};

const mockRefreshResponse = {
  data: {
    accessToken: 'mock-new-token',
    refreshToken: 'mock-new-refresh',
    expiresIn: 3600,
    tokenType: 'Bearer'
  },
  success: true,
  error: null
};

// Test wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    localStorage.clear();
    jest.clearAllMocks();
    server.resetHandlers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle successful login with credentials', async () => {
    // Mock successful login API response
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.LOGIN}`, (req, res, ctx) => {
        return res(
          ctx.status(HTTP_STATUS.OK),
          ctx.json(mockLoginResponse)
        );
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'valid-password',
        ssoProvider: null,
        mfaCode: '',
        mfaType: ''
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('auth_token'),
      expect.any(String)
    );
  });

  it('should handle SSO login flow', async () => {
    // Mock SSO authentication endpoints
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.LOGIN}`, (req, res, ctx) => {
        return res(
          ctx.status(HTTP_STATUS.OK),
          ctx.json(mockSsoResponse)
        );
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginWithSso('google');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('auth_token'),
      expect.any(String)
    );
  });

  it('should handle token refresh', async () => {
    // Set initial authenticated state
    localStorage.setItem('auth_token', JSON.stringify({
      value: mockLoginResponse.data.accessToken,
      timestamp: Date.now(),
      type: 'string'
    }));

    // Mock refresh token endpoint
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, (req, res, ctx) => {
        return res(
          ctx.status(HTTP_STATUS.OK),
          ctx.json(mockRefreshResponse)
        );
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Advance timers to trigger refresh
    await act(async () => {
      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('auth_token'),
      expect.any(String)
    );
  });

  it('should handle authentication errors', async () => {
    // Mock failed login attempt
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.LOGIN}`, (req, res, ctx) => {
        return res(
          ctx.status(HTTP_STATUS.UNAUTHORIZED),
          ctx.json({
            success: false,
            error: 'Invalid credentials',
            data: null
          })
        );
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'invalid-password',
          ssoProvider: null,
          mfaCode: '',
          mfaType: ''
        });
      } catch (error) {
        // Error expected
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle logout', async () => {
    // Set initial authenticated state
    localStorage.setItem('auth_token', JSON.stringify({
      value: mockLoginResponse.data.accessToken,
      timestamp: Date.now(),
      type: 'string'
    }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      expect.stringContaining('auth_token')
    );
  });

  it('should handle MFA requirements', async () => {
    // Mock MFA required response
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.LOGIN}`, (req, res, ctx) => {
        return res(
          ctx.status(HTTP_STATUS.OK),
          ctx.json({
            success: true,
            mfaRequired: true,
            mfaType: 'TOTP',
            error: null
          })
        );
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'valid-password',
        ssoProvider: null,
        mfaCode: '',
        mfaType: ''
      });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.mfaRequired).toBe(true);
    expect(result.current.mfaType).toBe('TOTP');
  });

  it('should handle network errors', async () => {
    // Mock network failure
    server.use(
      rest.post(`/api/v1${API_ENDPOINTS.AUTH.LOGIN}`, (req, res, ctx) => {
        return res.networkError('Failed to connect');
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login({
          email: 'test@example.com',
          password: 'valid-password',
          ssoProvider: null,
          mfaCode: '',
          mfaType: ''
        });
      } catch (error) {
        // Network error expected
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });
});