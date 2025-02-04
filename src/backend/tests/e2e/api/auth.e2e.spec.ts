/**
 * @fileoverview End-to-end test suite for authentication API endpoints
 * @module Tests/E2E/Auth
 * @version 1.0.0
 */

import supertest from 'supertest'; // v6.3.3
import { jest } from '@jest/globals'; // v29.0.0
import { createTestDatabase, clearTestDatabase, mockRedisClient } from '../../helpers/test-utils';
import { IAuthCredentials } from '../../../src/auth-service/interfaces/auth.interface';
import { HttpStatus } from '../../../src/common/types';

// Constants for test configuration
const API_BASE_URL = '/api/v1/auth';
const TEST_USER_CREDENTIALS: IAuthCredentials = {
  email: 'test@example.com',
  password: 'Test123!@#'
};
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const TOKEN_EXPIRY_TIME = 3600;

describe('Authentication API E2E Tests', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;
  let redisClient: any;
  let testTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    // Initialize test environment
    await createTestDatabase();
    redisClient = mockRedisClient();
    app = await initializeTestServer();
    request = supertest(app);
  });

  afterAll(async () => {
    // Cleanup test environment
    await clearTestDatabase();
    await redisClient.quit();
    await app.close();
  });

  beforeEach(async () => {
    // Reset test state
    await clearTestDatabase();
    await redisClient.flushall();
    testTokens = { accessToken: '', refreshToken: '' };
  });

  describe('POST /login', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const response = await request
        .post(`${API_BASE_URL}/login`)
        .send(TEST_USER_CREDENTIALS)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: TOKEN_EXPIRY_TIME,
          tokenType: 'Bearer'
        }
      });

      // Verify security headers
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');

      testTokens = response.body.data;
    });

    it('should fail with invalid credentials', async () => {
      const response = await request
        .post(`${API_BASE_URL}/login`)
        .send({
          email: TEST_USER_CREDENTIALS.email,
          password: 'wrongpassword'
        })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid credentials'),
        error: expect.any(Object)
      });
    });

    it('should enforce rate limiting', async () => {
      // Attempt multiple rapid login requests
      for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
        await request
          .post(`${API_BASE_URL}/login`)
          .send({
            email: TEST_USER_CREDENTIALS.email,
            password: 'wrongpassword'
          });
      }

      // Next request should be rate limited
      const response = await request
        .post(`${API_BASE_URL}/login`)
        .send(TEST_USER_CREDENTIALS)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(response.headers['retry-after']).toBeDefined();
      expect(response.body.message).toContain('Too many login attempts');
    });
  });

  describe('POST /refresh', () => {
    beforeEach(async () => {
      // Login to get initial tokens
      const loginResponse = await request
        .post(`${API_BASE_URL}/login`)
        .send(TEST_USER_CREDENTIALS);
      testTokens = loginResponse.body.data;
    });

    it('should successfully refresh tokens', async () => {
      const response = await request
        .post(`${API_BASE_URL}/refresh`)
        .send({ refreshToken: testTokens.refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: TOKEN_EXPIRY_TIME,
          tokenType: 'Bearer'
        }
      });

      // Verify new tokens are different
      expect(response.body.data.accessToken).not.toBe(testTokens.accessToken);
      expect(response.body.data.refreshToken).not.toBe(testTokens.refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request
        .post(`${API_BASE_URL}/refresh`)
        .send({ refreshToken: 'invalid-token' })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid refresh token')
      });
    });
  });

  describe('POST /logout', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request
        .post(`${API_BASE_URL}/login`)
        .send(TEST_USER_CREDENTIALS);
      testTokens = loginResponse.body.data;
    });

    it('should successfully logout user', async () => {
      const response = await request
        .post(`${API_BASE_URL}/logout`)
        .set('Authorization', `Bearer ${testTokens.accessToken}`)
        .send({ refreshToken: testTokens.refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Logged out successfully')
      });

      // Verify tokens are invalidated
      const refreshAttempt = await request
        .post(`${API_BASE_URL}/refresh`)
        .send({ refreshToken: testTokens.refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(refreshAttempt.body.message).toContain('Invalid refresh token');
    });

    it('should fail with invalid access token', async () => {
      const response = await request
        .post(`${API_BASE_URL}/logout`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ refreshToken: testTokens.refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid access token')
      });
    });
  });

  describe('GET /validate', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request
        .post(`${API_BASE_URL}/login`)
        .send(TEST_USER_CREDENTIALS);
      testTokens = loginResponse.body.data;
    });

    it('should successfully validate valid token', async () => {
      const response = await request
        .get(`${API_BASE_URL}/validate`)
        .set('Authorization', `Bearer ${testTokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          userId: expect.any(String),
          email: TEST_USER_CREDENTIALS.email,
          role: expect.any(String)
        }
      });
    });

    it('should fail with expired token', async () => {
      // Wait for token to expire (mocked)
      jest.advanceTimersByTime(TOKEN_EXPIRY_TIME * 1000 + 1000);

      const response = await request
        .get(`${API_BASE_URL}/validate`)
        .set('Authorization', `Bearer ${testTokens.accessToken}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Token expired')
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in all responses', async () => {
      const response = await request
        .get(`${API_BASE_URL}/validate`)
        .set('Authorization', `Bearer ${testTokens.accessToken}`);

      const securityHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'content-security-policy'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers[header]).toBeDefined();
      });
    });
  });
});

/**
 * Initialize test server with required middleware and configurations
 */
async function initializeTestServer() {
  // Server initialization code would go here
  // This is a placeholder as the actual implementation depends on the server setup
  return null;
}