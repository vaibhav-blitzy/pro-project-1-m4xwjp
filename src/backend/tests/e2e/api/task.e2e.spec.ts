/**
 * @fileoverview End-to-end tests for task management API endpoints
 * @module Tests/E2E/API/Task
 * @version 1.0.0
 */

import supertest from 'supertest'; // v6.3.3
import { 
  generateMockTask, 
  generateMockTasks 
} from '../../fixtures/tasks.fixture';
import { 
  createTestDatabase, 
  clearTestDatabase, 
  generateTestToken, 
  measureResponseTime 
} from '../../helpers/test-utils';
import { 
  ITask, 
  TaskPriority, 
  TaskStatus, 
  TaskValidationSchema 
} from '../../../src/task-service/interfaces/task.interface';
import { HttpStatus } from '../../../src/common/types';

// Constants
const API_BASE_URL = '/api/v1/tasks';
const RESPONSE_TIME_THRESHOLD = 500; // 500ms as per technical spec
const TEST_TIMEOUT = 10000;

describe('Task API E2E Tests', () => {
  let testToken: string;
  let mockTask: ITask;

  beforeAll(async () => {
    // Initialize test environment
    await createTestDatabase();
    
    // Generate test authentication token
    testToken = generateTestToken({
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    });
  });

  beforeEach(async () => {
    await clearTestDatabase();
    mockTask = generateMockTask();
  });

  afterAll(async () => {
    await clearTestDatabase();
  });

  describe('GET /tasks', () => {
    it('should retrieve paginated tasks within performance threshold', async () => {
      // Arrange
      const mockTasks = generateMockTasks(5);
      const page = 1;
      const limit = 10;

      // Create test tasks
      for (const task of mockTasks) {
        await supertest(global.app)
          .post(API_BASE_URL)
          .set('Authorization', `Bearer ${testToken}`)
          .send(task);
      }

      // Act
      const startTime = Date.now();
      const response = await supertest(global.app)
        .get(API_BASE_URL)
        .query({ page, limit })
        .set('Authorization', `Bearer ${testToken}`);
      const responseTime = Date.now() - startTime;

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          items: expect.any(Array),
          total: mockTasks.length,
          page,
          totalPages: Math.ceil(mockTasks.length / limit)
        }
      });
      expect(response.body.data.items).toHaveLength(mockTasks.length);
    }, TEST_TIMEOUT);

    it('should filter tasks by status and priority', async () => {
      // Arrange
      const mockTasks = [
        generateMockTask({ status: TaskStatus.TODO, priority: TaskPriority.HIGH }),
        generateMockTask({ status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM }),
        generateMockTask({ status: TaskStatus.COMPLETED, priority: TaskPriority.LOW })
      ];

      for (const task of mockTasks) {
        await supertest(global.app)
          .post(API_BASE_URL)
          .set('Authorization', `Bearer ${testToken}`)
          .send(task);
      }

      // Act
      const response = await supertest(global.app)
        .get(API_BASE_URL)
        .query({ 
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH
        })
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]).toMatchObject({
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH
      });
    });
  });

  describe('GET /tasks/:id', () => {
    it('should retrieve a specific task by ID', async () => {
      // Arrange
      const createResponse = await supertest(global.app)
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockTask);
      
      const taskId = createResponse.body.data.id;

      // Act
      const response = await supertest(global.app)
        .get(`${API_BASE_URL}/${taskId}`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toMatchObject({
        id: taskId,
        title: mockTask.title,
        description: mockTask.description,
        status: mockTask.status,
        priority: mockTask.priority
      });
    });

    it('should return 404 for non-existent task', async () => {
      // Act
      const response = await supertest(global.app)
        .get(`${API_BASE_URL}/non-existent-id`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task with valid data', async () => {
      // Act
      const response = await supertest(global.app)
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockTask);

      // Assert
      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body.data).toMatchObject({
        title: mockTask.title,
        description: mockTask.description,
        status: mockTask.status,
        priority: mockTask.priority
      });
    });

    it('should validate task data against schema', async () => {
      // Arrange
      const invalidTask = {
        ...mockTask,
        title: '', // Invalid: empty title
        priority: 'INVALID_PRIORITY' // Invalid: wrong enum value
      };

      // Act
      const response = await supertest(global.app)
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidTask);

      // Assert
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      // Arrange
      const createResponse = await supertest(global.app)
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockTask);
      
      const taskId = createResponse.body.data.id;
      const updateData = {
        title: 'Updated Task Title',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH
      };

      // Act
      const response = await supertest(global.app)
        .put(`${API_BASE_URL}/${taskId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toMatchObject(updateData);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task', async () => {
      // Arrange
      const createResponse = await supertest(global.app)
        .post(API_BASE_URL)
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockTask);
      
      const taskId = createResponse.body.data.id;

      // Act
      const deleteResponse = await supertest(global.app)
        .delete(`${API_BASE_URL}/${taskId}`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(deleteResponse.status).toBe(HttpStatus.OK);
      expect(deleteResponse.body.success).toBe(true);

      // Verify task is deleted
      const getResponse = await supertest(global.app)
        .get(`${API_BASE_URL}/${taskId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(getResponse.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle concurrent requests within performance threshold', async () => {
      // Arrange
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        supertest(global.app)
          .get(API_BASE_URL)
          .set('Authorization', `Bearer ${testToken}`)
      );

      // Act
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(HttpStatus.OK);
      });
      expect(totalTime / concurrentRequests).toBeLessThan(RESPONSE_TIME_THRESHOLD);
    });
  });
});