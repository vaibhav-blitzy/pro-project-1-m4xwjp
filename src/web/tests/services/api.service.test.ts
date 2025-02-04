/**
 * @fileoverview Comprehensive test suite for ApiService
 * Tests API communication, security features, and error handling
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.5.0
import { rest } from 'msw'; // v1.3.0
import { ApiService } from '../../src/services/api.service';
import server from '../mocks/server';
import { apiConfig } from '../../src/config/api.config';
import { HTTP_STATUS } from '../../src/constants/api.constants';

// Mock response templates
const mockSuccessResponse = {
  data: { id: 1, name: 'Test' },
  _links: {
    self: { href: '/api/v1/test' },
    next: { href: '/api/v1/test?page=2' }
  },
  page: { size: 10, totalElements: 100, totalPages: 10, number: 1 }
};

const mockErrorResponse = {
  type: 'https://api.taskmanager.com/errors/validation',
  title: 'Validation Error',
  status: HTTP_STATUS.BAD_REQUEST,
  detail: 'Invalid input provided',
  instance: '/api/v1/test'
};

// Test setup helper
const setupTestEnvironment = () => {
  const service = new ApiService(apiConfig);
  // Mock CSRF token
  document.head.innerHTML = '<meta name="csrf-token" content="test-csrf-token" />';
  return service;
};

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    server.listen();
    apiService = setupTestEnvironment();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct base URL and timeout', () => {
      expect(apiService['baseURL']).toBe(apiConfig.baseURL);
      expect(apiService['httpClient'].defaults.timeout).toBe(apiConfig.timeout);
    });

    it('should set default security headers', () => {
      const headers = apiService['httpClient'].defaults.headers;
      expect(headers['X-Content-Security-Policy']).toBe("default-src 'self'");
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('should initialize cache and circuit breaker', () => {
      expect(apiService['requestCache']).toBeDefined();
      expect(apiService['circuitBreaker']).toBeDefined();
    });
  });

  describe('HTTP Methods', () => {
    describe('GET', () => {
      it('should handle successful GET requests with HAL+JSON response', async () => {
        server.use(
          rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
            return res(ctx.status(200), ctx.json(mockSuccessResponse));
          })
        );

        const response = await apiService.get('/test');
        expect(response.data).toEqual(mockSuccessResponse.data);
        expect(response._links).toBeDefined();
      });

      it('should handle query parameters correctly', async () => {
        server.use(
          rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
            const page = req.url.searchParams.get('page');
            expect(page).toBe('1');
            return res(ctx.status(200), ctx.json(mockSuccessResponse));
          })
        );

        await apiService.get('/test', { page: 1 });
      });

      it('should use cache when available and requested', async () => {
        const endpoint = '/test';
        const cacheKey = apiService['generateCacheKey'](endpoint, {});
        apiService['requestCache'].set(cacheKey, mockSuccessResponse);

        const response = await apiService.get(endpoint, {}, { useCache: true });
        expect(response).toEqual(mockSuccessResponse);
      });
    });

    describe('POST', () => {
      it('should send POST requests with CSRF token', async () => {
        server.use(
          rest.post(`${apiConfig.baseURL}/test`, async (req, res, ctx) => {
            const token = req.headers.get('X-CSRF-Token');
            expect(token).toBe('test-csrf-token');
            return res(ctx.status(201), ctx.json(mockSuccessResponse));
          })
        );

        await apiService.post('/test', { data: 'test' });
      });

      it('should handle file uploads with proper headers', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test']), 'test.txt');

        server.use(
          rest.post(`${apiConfig.baseURL}/upload`, async (req, res, ctx) => {
            expect(req.headers.get('Content-Type')).toContain('multipart/form-data');
            return res(ctx.status(201), ctx.json(mockSuccessResponse));
          })
        );

        await apiService.post('/upload', formData);
      });
    });

    describe('PUT', () => {
      it('should handle successful PUT requests', async () => {
        server.use(
          rest.put(`${apiConfig.baseURL}/test/1`, async (req, res, ctx) => {
            const body = await req.json();
            expect(body).toEqual({ data: 'update' });
            return res(ctx.status(200), ctx.json(mockSuccessResponse));
          })
        );

        const response = await apiService.put('/test/1', { data: 'update' });
        expect(response.data).toEqual(mockSuccessResponse.data);
      });
    });

    describe('DELETE', () => {
      it('should handle successful DELETE requests', async () => {
        server.use(
          rest.delete(`${apiConfig.baseURL}/test/1`, (req, res, ctx) => {
            return res(ctx.status(204));
          })
        );

        await apiService.delete('/test/1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors appropriately', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res) => {
          return res.networkError('Failed to connect');
        })
      );

      await expect(apiService.get('/test')).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, async (req, res, ctx) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return res(ctx.status(200));
        })
      );

      const serviceWithTimeout = new ApiService({ ...apiConfig, timeout: 10 });
      await expect(serviceWithTimeout.get('/test')).rejects.toThrow('timeout');
    });

    it('should handle RFC 7807 error responses', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json(mockErrorResponse)
          );
        })
      );

      try {
        await apiService.get('/test');
      } catch (error: any) {
        expect(error.type).toBe(mockErrorResponse.type);
        expect(error.title).toBe(mockErrorResponse.title);
        expect(error.status).toBe(mockErrorResponse.status);
      }
    });

    it('should handle rate limiting errors', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '60'),
            ctx.json({
              type: 'https://api.taskmanager.com/errors/rate-limit',
              title: 'Too Many Requests',
              status: 429,
              detail: 'Rate limit exceeded'
            })
          );
        })
      );

      await expect(apiService.get('/test')).rejects.toThrow('Too Many Requests');
    });
  });

  describe('Security Features', () => {
    it('should validate URLs for security', async () => {
      await expect(apiService.get('https://malicious.com')).rejects.toThrow('Invalid URL');
    });

    it('should detect and prevent script injection', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json({
            data: '<script>alert("xss")</script>'
          }));
        })
      );

      await expect(apiService.get('/test')).rejects.toThrow('Invalid response');
    });

    it('should handle CSRF token validation', async () => {
      document.head.innerHTML = ''; // Remove CSRF token
      await expect(apiService.post('/test', {})).rejects.toThrow('CSRF token missing');
    });
  });

  describe('Response Transformation', () => {
    it('should transform responses to HAL+JSON format', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ data: 'test' }));
        })
      );

      const response = await apiService.get('/test');
      expect(response._links).toBeDefined();
      expect(response.data).toBeDefined();
    });

    it('should handle ETag caching headers', async () => {
      server.use(
        rest.get(`${apiConfig.baseURL}/test`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.set('ETag', '"123"'),
            ctx.json(mockSuccessResponse)
          );
        })
      );

      await apiService.get('/test');
      const secondRequest = await apiService.get('/test');
      expect(secondRequest.etag).toBe('"123"');
    });
  });
});