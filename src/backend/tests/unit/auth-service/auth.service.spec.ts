import { jest } from '@jest/globals'; // v29.0.0
import { AuthService } from '../../../src/auth-service/services/auth.service';
import { TokenService } from '../../../src/auth-service/services/token.service';
import { testUsers } from '../../fixtures/users.fixture';
import { mockRedisClient } from '../../helpers/test-utils';
import { HttpStatus } from '../../../src/common/types';
import { Logger } from '../../../src/common/utils/logger.util';

describe('AuthService', () => {
  let authService: AuthService;
  let tokenService: jest.Mocked<TokenService>;
  let redisClient: ReturnType<typeof mockRedisClient>;
  let logger: jest.Mocked<Logger>;

  const mockTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  };

  beforeEach(() => {
    // Mock Redis client
    redisClient = mockRedisClient();

    // Mock TokenService
    tokenService = {
      generateTokens: jest.fn().mockResolvedValue(mockTokens),
      validateAccessToken: jest.fn().mockResolvedValue({ sub: testUsers.admin.id }),
      validateRefreshToken: jest.fn().mockResolvedValue({ sub: testUsers.admin.id }),
      revokeToken: jest.fn().mockResolvedValue(undefined),
      rotateRefreshToken: jest.fn().mockResolvedValue(mockTokens)
    } as unknown as jest.Mocked<TokenService>;

    // Mock Logger
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Initialize AuthService
    authService = new AuthService(tokenService, redisClient);
  });

  afterEach(async () => {
    // Clear Redis mock data
    await redisClient.flushall();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      const credentials = {
        email: testUsers.teamMember.email,
        password: 'Test123!@#'
      };

      const result = await authService.login(credentials);

      expect(result).toEqual({
        ...mockTokens,
        expiresIn: expect.any(Number)
      });
      expect(tokenService.generateTokens).toHaveBeenCalledTimes(1);
      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should handle MFA authentication flow correctly', async () => {
      const credentials = {
        email: testUsers.mfaUser.email,
        password: 'Test123!@#',
        mfaToken: '123456'
      };

      const result = await authService.login(credentials);

      expect(result).toEqual({
        ...mockTokens,
        expiresIn: expect.any(Number)
      });
      expect(redisClient.get).toHaveBeenCalledWith(expect.stringContaining('mfa:'));
    });

    it('should enforce rate limiting after multiple failed attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login(credentials);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      // Verify account is locked
      await expect(authService.login(credentials))
        .rejects
        .toThrow('Account temporarily locked');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const result = await authService.refreshToken(mockTokens.refreshToken);

      expect(result).toEqual({
        ...mockTokens,
        expiresIn: expect.any(Number)
      });
      expect(tokenService.validateRefreshToken).toHaveBeenCalledWith(mockTokens.refreshToken);
      expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith(mockTokens.refreshToken);
    });

    it('should reject invalid refresh tokens', async () => {
      tokenService.validateRefreshToken.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(authService.refreshToken('invalid.token'))
        .rejects
        .toThrow('Invalid token');
    });
  });

  describe('logout', () => {
    it('should successfully logout user and clear session', async () => {
      await authService.logout(testUsers.admin.id, mockTokens.refreshToken);

      expect(tokenService.revokeToken).toHaveBeenCalledWith(mockTokens.refreshToken);
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      tokenService.revokeToken.mockRejectedValueOnce(new Error('Revocation failed'));

      await expect(authService.logout(testUsers.admin.id, mockTokens.refreshToken))
        .rejects
        .toThrow('Revocation failed');
    });
  });

  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
      const sessionId = 'test-session-id';
      const accessToken = mockTokens.accessToken;

      // Set up mock session data
      await redisClient.setex(`session:${sessionId}`, 3600, JSON.stringify({
        userId: testUsers.admin.id,
        refreshToken: mockTokens.refreshToken
      }));

      const result = await authService.validateSession(sessionId, accessToken);

      expect(result).toBe(true);
      expect(tokenService.validateAccessToken).toHaveBeenCalledWith(accessToken);
    });

    it('should reject invalid sessions', async () => {
      const result = await authService.validateSession('invalid-session', mockTokens.accessToken);

      expect(result).toBe(false);
    });

    it('should handle expired sessions correctly', async () => {
      const sessionId = 'expired-session';
      
      // Set up expired session
      await redisClient.setex(`session:${sessionId}`, 1, JSON.stringify({
        userId: testUsers.admin.id,
        refreshToken: mockTokens.refreshToken
      }));

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await authService.validateSession(sessionId, mockTokens.accessToken);

      expect(result).toBe(false);
    });
  });

  describe('security controls', () => {
    it('should blacklist tokens on security events', async () => {
      const sessionId = 'compromised-session';
      const accessToken = mockTokens.accessToken;

      await authService.blacklistToken(accessToken, 'security_event');

      const result = await authService.validateSession(sessionId, accessToken);
      expect(result).toBe(false);
    });

    it('should handle concurrent login attempts', async () => {
      const credentials = {
        email: testUsers.teamMember.email,
        password: 'Test123!@#'
      };

      // Simulate concurrent logins
      const loginAttempts = Array(3).fill(null).map(() => authService.login(credentials));

      const results = await Promise.allSettled(loginAttempts);
      const successfulLogins = results.filter(r => r.status === 'fulfilled');

      expect(successfulLogins.length).toBe(1);
    });

    it('should prevent session fixation', async () => {
      const sessionId = 'fixed-session';
      const accessToken = mockTokens.accessToken;

      // Attempt session fixation
      await redisClient.set(`session:${sessionId}`, JSON.stringify({
        userId: testUsers.admin.id,
        refreshToken: mockTokens.refreshToken
      }));

      const result = await authService.validateSession(sessionId, accessToken);
      expect(result).toBe(false);
    });
  });
});