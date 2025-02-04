/**
 * @packageDocumentation
 * @module Tests/Integration/UserService
 * @version 1.0.0
 * 
 * Integration tests for User Controller validating complete request-response cycle
 * including security controls, data validation, and audit logging.
 */

import { Express } from 'express'; // v4.18.2
import request from 'supertest'; // v6.3.3
import { Container } from 'inversify'; // v6.0.1
import { createClient } from 'redis'; // v4.6.7
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import { UserController } from '../../../src/user-service/controllers/user.controller';
import { UserService } from '../../../src/user-service/services/user.service';
import { UserRepository } from '../../../src/user-service/repositories/user.repository';
import { IUser, UserRole, UserStatus } from '../../../src/user-service/interfaces/user.interface';
import { encrypt } from '../../../src/common/utils/encryption.util';
import { ErrorCodes, HttpStatusCodes } from '../../../src/common/constants/error-codes';
import Logger from '../../../src/common/utils/logger.util';

describe('UserController Integration Tests', () => {
  let app: Express;
  let container: Container;
  let userController: UserController;
  let userService: UserService;
  let redisClient: ReturnType<typeof createClient>;
  let testUser: IUser;
  let authToken: string;

  // Security test constants
  const RATE_LIMIT_WINDOW = 3600; // 1 hour
  const MAX_REQUESTS = 100;
  const SECURITY_HEADERS = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'content-security-policy'
  ];

  beforeAll(async () => {
    // Initialize dependencies
    container = new Container();
    container.bind<UserController>(UserController).toSelf();
    container.bind<UserService>(UserService).toSelf();
    container.bind<UserRepository>(UserRepository).toSelf();

    // Initialize Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();

    // Get controller instance
    userController = container.get<UserController>(UserController);

    // Create test user
    testUser = {
      id: uuidv4(),
      email: await encrypt('test@example.com'),
      name: await encrypt('Test User'),
      hashedPassword: 'hashedPassword123!',
      role: UserRole.TEAM_MEMBER,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date(),
      lastPasswordChangeAt: new Date(),
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        emailNotifications: true,
        timezone: 'UTC',
        language: 'en',
        themeSettings: {
          mode: 'light',
          primaryColor: '#1976d2',
          fontSize: 14
        },
        dashboardLayout: {
          widgets: [],
          layout: {}
        }
      }
    };

    // Set up auth token
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('GET /users', () => {
    it('should return paginated users list with security headers', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      // Verify response
      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);

      // Verify security headers
      SECURITY_HEADERS.forEach(header => {
        expect(response.headers[header]).toBeDefined();
      });

      // Verify rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBe(String(MAX_REQUESTS));
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should properly mask PII data in response', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      const user = response.body.data.items[0];
      expect(user.email).toMatch(/^[^@]+\*+@.+$/);
      expect(user.name).toMatch(/^.{1,4}\*+$/);
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(MAX_REQUESTS + 1).fill(null);
      
      for (const _ of requests) {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', authToken)
          .set('x-correlation-id', uuidv4());

        if (response.status === HttpStatusCodes.TOO_MANY_REQUESTS) {
          expect(response.body.error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
          break;
        }
      }
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID with security controls', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser.id}`)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);

      // Verify security headers
      SECURITY_HEADERS.forEach(header => {
        expect(response.headers[header]).toBeDefined();
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${uuidv4()}`)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    });
  });

  describe('POST /users', () => {
    it('should create new user with encrypted PII', async () => {
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        password: 'StrongP@ssw0rd123!',
        role: UserRole.TEAM_MEMBER
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(newUser)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).not.toBe(newUser.email);
      expect(response.body.data.name).not.toBe(newUser.name);
    });

    it('should validate password strength', async () => {
      const newUser = {
        email: 'weak@example.com',
        name: 'Weak Password',
        password: 'weak',
        role: UserRole.TEAM_MEMBER
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(newUser)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user with audit logging', async () => {
      const updates = {
        name: 'Updated Name',
        role: UserRole.TEAM_LEAD
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUser.id}`)
        .send(updates)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(updates.role);

      // Verify audit log
      const auditLog = await Logger.getInstance().getAuditLog();
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          action: 'user.update',
          userId: testUser.id
        })
      );
    });
  });

  describe('PUT /users/:id/password', () => {
    it('should update password with security checks', async () => {
      const passwordUpdate = {
        currentPassword: 'CurrentP@ssw0rd123!',
        newPassword: 'NewStrongP@ssw0rd123!'
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUser.id}/password`)
        .send(passwordUpdate)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);

      // Verify password change audit log
      const auditLog = await Logger.getInstance().getAuditLog();
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          action: 'user.password.change',
          userId: testUser.id
        })
      );
    });
  });

  describe('PUT /users/:id/status', () => {
    it('should update user status with audit trail', async () => {
      const statusUpdate = {
        status: UserStatus.INACTIVE,
        reason: 'Account deactivation requested'
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUser.id}/status`)
        .send(statusUpdate)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(statusUpdate.status);

      // Verify status change audit log
      const auditLog = await Logger.getInstance().getAuditLog();
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          action: 'user.status.change',
          userId: testUser.id,
          details: {
            newStatus: statusUpdate.status,
            reason: statusUpdate.reason
          }
        })
      );
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user with audit logging', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${testUser.id}`)
        .set('Authorization', authToken)
        .set('x-correlation-id', uuidv4());

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(response.body.success).toBe(true);

      // Verify deletion audit log
      const auditLog = await Logger.getInstance().getAuditLog();
      expect(auditLog).toContainEqual(
        expect.objectContaining({
          action: 'user.delete',
          userId: testUser.id
        })
      );
    });
  });
});