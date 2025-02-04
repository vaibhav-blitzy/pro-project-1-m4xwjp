import { Test, TestingModule } from '@nestjs/testing'; // v10.0.0
import { ValidationPipe } from '@nestjs/common'; // v10.0.0
import { ThrottlerGuard } from '@nestjs/throttler'; // v4.0.0
import { AuthController } from '../../src/auth-service/controllers/auth.controller';
import { AuthService } from '../../src/auth-service/services/auth.service';
import { TokenService } from '../../src/auth-service/services/token.service';
import { RedisManager } from '../../src/common/config/redis.config';
import { Logger } from '../../src/common/utils/logger.util';
import { encrypt } from '../../src/common/utils/encryption.util';

describe('AuthController (integration)', () => {
  let module: TestingModule;
  let authController: AuthController;
  let authService: AuthService;
  let tokenService: TokenService;
  let redisManager: RedisManager;
  let logger: Logger;

  // Test data
  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'Password123!',
    role: 'USER'
  };

  const mockTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  };

  beforeAll(async () => {
    // Initialize Redis mock
    redisManager = new RedisManager({
      host: 'localhost',
      port: 6379
    });

    // Create test module
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            validateSession: jest.fn()
          }
        },
        {
          provide: TokenService,
          useValue: {
            generateTokens: jest.fn(),
            validateAccessToken: jest.fn(),
            validateRefreshToken: jest.fn(),
            revokeToken: jest.fn()
          }
        },
        {
          provide: RedisManager,
          useValue: redisManager
        },
        Logger
      ]
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    logger = module.get<Logger>(Logger);

    // Apply global validation pipe
    module.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));
  });

  afterAll(async () => {
    await module.close();
    await redisManager.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: testUser.password
      };

      jest.spyOn(authService, 'login').mockResolvedValue({
        success: true,
        message: 'Login successful',
        data: mockTokens,
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      const result = await authController.login(loginDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(authService.login).toHaveBeenCalledWith(expect.objectContaining({
        email: loginDto.email.toLowerCase(),
        password: loginDto.password
      }));
    });

    it('should fail with invalid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      jest.spyOn(authService, 'login').mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
        data: null,
        error: new Error('Invalid credentials'),
        errorCode: 'AUTH_001',
        metadata: null
      });

      // Act & Assert
      await expect(authController.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should validate email format', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid-email',
        password: testUser.password
      };

      // Act & Assert
      await expect(authController.login(loginDto)).rejects.toThrow('Invalid email format');
    });

    it('should enforce password length requirements', async () => {
      // Arrange
      const loginDto = {
        email: testUser.email,
        password: 'short'
      };

      // Act & Assert
      await expect(authController.login(loginDto)).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const refreshToken = mockTokens.refreshToken;
      const req = {
        headers: {
          'x-refresh-token': refreshToken
        }
      };

      jest.spyOn(authService, 'refreshToken').mockResolvedValue({
        success: true,
        message: 'Token refreshed',
        data: mockTokens,
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      const result = await authController.refreshToken(req as any);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      // Arrange
      const req = {
        headers: {
          'x-refresh-token': 'invalid.refresh.token'
        }
      };

      jest.spyOn(authService, 'refreshToken').mockResolvedValue({
        success: false,
        message: 'Invalid refresh token',
        data: null,
        error: new Error('Invalid refresh token'),
        errorCode: 'AUTH_002',
        metadata: null
      });

      // Act & Assert
      await expect(authController.refreshToken(req as any)).rejects.toThrow('Invalid refresh token');
    });

    it('should fail when refresh token is missing', async () => {
      // Arrange
      const req = { headers: {} };

      // Act & Assert
      await expect(authController.refreshToken(req as any)).rejects.toThrow('Refresh token not provided');
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const req = {
        user: { id: testUser.id },
        headers: {
          'x-refresh-token': mockTokens.refreshToken
        }
      };

      jest.spyOn(authService, 'logout').mockResolvedValue({
        success: true,
        message: 'Logout successful',
        data: null,
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      await authController.logout(req as any);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(
        testUser.id,
        mockTokens.refreshToken
      );
    });

    it('should fail when session data is invalid', async () => {
      // Arrange
      const req = {
        user: {},
        headers: {}
      };

      // Act & Assert
      await expect(authController.logout(req as any)).rejects.toThrow('Invalid session data');
    });

    it('should handle logout service errors', async () => {
      // Arrange
      const req = {
        user: { id: testUser.id },
        headers: {
          'x-refresh-token': mockTokens.refreshToken
        }
      };

      jest.spyOn(authService, 'logout').mockRejectedValue(new Error('Logout failed'));

      // Act & Assert
      await expect(authController.logout(req as any)).rejects.toThrow('Logout failed');
    });
  });

  describe('GET /auth/health', () => {
    it('should return healthy status when services are operational', async () => {
      // Arrange
      jest.spyOn(authService, 'validateToken').mockResolvedValue({
        success: true,
        message: 'Service healthy',
        data: null,
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      const result = await authController.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        dependencies: {
          authService: true
        }
      });
    });

    it('should handle health check failures', async () => {
      // Arrange
      jest.spyOn(authService, 'validateToken').mockRejectedValue(new Error('Service unhealthy'));

      // Act & Assert
      await expect(authController.healthCheck()).rejects.toThrow('Service unhealthy');
    });
  });
});