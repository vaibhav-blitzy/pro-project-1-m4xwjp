import { UserService } from '../../../src/user-service/services/user.service';
import { UserRepository } from '../../../src/user-service/repositories/user.repository';
import { testUsers, createTestUser } from '../../fixtures/users.fixture';
import { UserRole, UserStatus } from '../../../src/user-service/interfaces/user.interface';
import { ErrorCodes } from '../../../src/common/constants/error-codes';
import * as argon2 from 'argon2'; // v0.31.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

// Mock dependencies
jest.mock('../../../src/user-service/repositories/user.repository');
jest.mock('argon2');

describe('UserService', () => {
  let userService: UserService;
  let userRepositoryMock: jest.Mocked<UserRepository>;
  let redisClientMock: any;
  let rateLimiterMock: any;
  let loggerMock: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks
    userRepositoryMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    redisClientMock = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    };

    rateLimiterMock = {
      consume: jest.fn().mockResolvedValue(true)
    };

    loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Initialize service with mocks
    userService = new UserService(
      userRepositoryMock,
      loggerMock,
      rateLimiterMock,
      redisClientMock
    );
  });

  describe('findAll', () => {
    const pagination = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const };

    it('should return cached users when available', async () => {
      const cachedUsers = { items: [testUsers.admin], total: 1 };
      redisClientMock.get.mockResolvedValueOnce(JSON.stringify(cachedUsers));

      const result = await userService.findAll({}, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedUsers);
      expect(result.metadata?.source).toBe('cache');
      expect(userRepositoryMock.findAll).not.toHaveBeenCalled();
    });

    it('should fetch and cache users when cache is empty', async () => {
      const users = { items: [testUsers.admin], total: 1 };
      redisClientMock.get.mockResolvedValueOnce(null);
      userRepositoryMock.findAll.mockResolvedValueOnce({
        success: true,
        data: users,
        message: 'Users retrieved'
      });

      const result = await userService.findAll({}, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(users);
      expect(redisClientMock.setEx).toHaveBeenCalled();
      expect(userRepositoryMock.findAll).toHaveBeenCalledWith({}, pagination);
    });

    it('should handle rate limiting', async () => {
      rateLimiterMock.consume.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const result = await userService.findAll({}, pagination);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED.toString());
      expect(userRepositoryMock.findAll).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const newUser = {
      email: 'test@example.com',
      name: 'Test User',
      hashedPassword: 'StrongPass123!',
      role: UserRole.TEAM_MEMBER
    };

    it('should create user with secure password hashing', async () => {
      const hashedPassword = 'hashed_password';
      (argon2.hash as jest.Mock).mockResolvedValueOnce(hashedPassword);
      userRepositoryMock.create.mockResolvedValueOnce({
        success: true,
        data: { ...newUser, id: uuidv4(), hashedPassword },
        message: 'User created'
      });

      const result = await userService.create(newUser);

      expect(result.success).toBe(true);
      expect(argon2.hash).toHaveBeenCalledWith(
        newUser.hashedPassword,
        expect.objectContaining({
          type: argon2.argon2id,
          memoryCost: 65536
        })
      );
      expect(userRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword
        })
      );
    });

    it('should validate password strength', async () => {
      const weakUser = { ...newUser, hashedPassword: 'weak' };

      const result = await userService.create(weakUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR.toString());
      expect(userRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('should handle duplicate email', async () => {
      userRepositoryMock.create.mockResolvedValueOnce({
        success: false,
        error: new Error('Duplicate email'),
        errorCode: ErrorCodes.DUPLICATE_ENTRY.toString()
      });

      const result = await userService.create(newUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.DUPLICATE_ENTRY.toString());
    });
  });

  describe('updatePassword', () => {
    const userId = uuidv4();
    const currentPassword = 'CurrentPass123!';
    const newPassword = 'NewStrongPass123!';

    it('should update password with proper validation', async () => {
      const user = {
        ...testUsers.teamMember,
        id: userId,
        hashedPassword: 'current_hashed_password'
      };
      userRepositoryMock.findById.mockResolvedValueOnce({
        success: true,
        data: user
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);
      (argon2.hash as jest.Mock).mockResolvedValueOnce('new_hashed_password');
      userRepositoryMock.update.mockResolvedValueOnce({
        success: true,
        data: user
      });

      const result = await userService.updatePassword(userId, currentPassword, newPassword);

      expect(result.success).toBe(true);
      expect(argon2.verify).toHaveBeenCalledWith(user.hashedPassword, currentPassword);
      expect(argon2.hash).toHaveBeenCalledWith(newPassword, expect.any(Object));
    });

    it('should reject invalid current password', async () => {
      userRepositoryMock.findById.mockResolvedValueOnce({
        success: true,
        data: testUsers.teamMember
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);

      const result = await userService.updatePassword(userId, currentPassword, newPassword);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR.toString());
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should validate new password strength', async () => {
      userRepositoryMock.findById.mockResolvedValueOnce({
        success: true,
        data: testUsers.teamMember
      });
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);

      const result = await userService.updatePassword(userId, currentPassword, 'weak');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR.toString());
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const userId = uuidv4();
    const newStatus = UserStatus.BLOCKED;
    const reason = 'Security violation';

    it('should update user status with audit logging', async () => {
      userRepositoryMock.update.mockResolvedValueOnce({
        success: true,
        data: { ...testUsers.teamMember, status: newStatus }
      });

      const result = await userService.updateStatus(userId, newStatus, reason);

      expect(result.success).toBe(true);
      expect(loggerMock.info).toHaveBeenCalledWith(
        'User status updated',
        expect.objectContaining({
          userId,
          newStatus,
          reason
        })
      );
      expect(redisClientMock.keys).toHaveBeenCalled();
    });

    it('should handle non-existent user', async () => {
      userRepositoryMock.update.mockResolvedValueOnce({
        success: false,
        error: new Error('User not found'),
        errorCode: ErrorCodes.NOT_FOUND.toString()
      });

      const result = await userService.updateStatus(userId, newStatus, reason);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.NOT_FOUND.toString());
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      userRepositoryMock.findAll.mockRejectedValueOnce(new Error('Database error'));

      const result = await userService.findAll({}, { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.INTERNAL_SERVER_ERROR.toString());
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      redisClientMock.get.mockRejectedValueOnce(new Error('Cache error'));

      const result = await userService.findAll({}, { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.success).toBe(false);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});