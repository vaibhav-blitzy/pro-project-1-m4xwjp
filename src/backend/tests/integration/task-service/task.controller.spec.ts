import supertest from 'supertest'; // v6.3.3
import { StatusCodes } from 'http-status-codes'; // v2.2.0
import { TaskController } from '../../../src/task-service/controllers/task.controller';
import { TaskService } from '../../../src/task-service/services/task.service';
import { mockTasks, generateMockTask } from '../../fixtures/tasks.fixture';
import { createTestDatabase, clearTestDatabase, generateTestToken } from '../../helpers/test-utils';
import { TaskStatus, TaskPriority } from '../../../src/task-service/interfaces/task.interface';

describe('TaskController Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let testToken: string;
  const API_BASE = '/api/v1/tasks';
  const PERFORMANCE_THRESHOLD = 500; // 500ms as per requirements

  beforeAll(async () => {
    await createTestDatabase();
    testToken = generateTestToken({
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    });
    request = supertest(app); // app is expected to be globally available
  });

  afterAll(async () => {
    await clearTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase(); // Clear data before each test
  });

  describe('GET /api/v1/tasks', () => {
    it('should retrieve paginated tasks within performance threshold', async () => {
      // Arrange
      const taskCount = 10;
      const tasks = Array.from({ length: taskCount }, () => generateMockTask());
      await TaskService.prototype.create(tasks);

      // Act
      const startTime = Date.now();
      const response = await request
        .get(API_BASE)
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${testToken}`);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.data.items).toHaveLength(5);
      expect(response.body.data.total).toBe(taskCount);
      expect(response.headers['x-total-count']).toBe(String(taskCount));
    });

    it('should filter tasks by status and priority', async () => {
      // Arrange
      await TaskService.prototype.create([
        generateMockTask({ status: TaskStatus.TODO, priority: TaskPriority.HIGH }),
        generateMockTask({ status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM })
      ]);

      // Act
      const response = await request
        .get(API_BASE)
        .query({ 
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH
        })
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].status).toBe(TaskStatus.TODO);
      expect(response.body.data.items[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should return RFC 7807 error for invalid query parameters', async () => {
      // Act
      const response = await request
        .get(API_BASE)
        .query({ page: 'invalid', limit: -1 })
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.type).toBe('about:blank');
      expect(response.body.title).toBe('Bad Request');
      expect(response.body.status).toBe(400);
      expect(response.body.detail).toBeTruthy();
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should retrieve a specific task by ID within performance threshold', async () => {
      // Arrange
      const task = await TaskService.prototype.create(generateMockTask());

      // Act
      const startTime = Date.now();
      const response = await request
        .get(`${API_BASE}/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.data.id).toBe(task.id);
    });

    it('should return RFC 7807 error for non-existent task', async () => {
      // Act
      const response = await request
        .get(`${API_BASE}/non-existent-id`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.type).toBe('about:blank');
      expect(response.body.title).toBe('Not Found');
      expect(response.body.status).toBe(404);
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task within performance threshold', async () => {
      // Arrange
      const newTask = generateMockTask();

      // Act
      const startTime = Date.now();
      const response = await request
        .post(API_BASE)
        .set('Authorization', `Bearer ${testToken}`)
        .send(newTask);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(StatusCodes.CREATED);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.data.title).toBe(newTask.title);
    });

    it('should validate task data and return RFC 7807 error for invalid input', async () => {
      // Arrange
      const invalidTask = {
        title: '', // Empty title should fail validation
        priority: 'INVALID_PRIORITY'
      };

      // Act
      const response = await request
        .post(API_BASE)
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidTask);

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.type).toBe('about:blank');
      expect(response.body.title).toBe('Bad Request');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should update an existing task within performance threshold', async () => {
      // Arrange
      const task = await TaskService.prototype.create(generateMockTask());
      const updates = {
        title: 'Updated Task Title',
        priority: TaskPriority.HIGH
      };

      // Act
      const startTime = Date.now();
      const response = await request
        .put(`${API_BASE}/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updates);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.priority).toBe(updates.priority);
    });

    it('should handle concurrent updates correctly', async () => {
      // Arrange
      const task = await TaskService.prototype.create(generateMockTask());
      const update1 = { title: 'Update 1' };
      const update2 = { title: 'Update 2' };

      // Act
      const [response1, response2] = await Promise.all([
        request
          .put(`${API_BASE}/${task.id}`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(update1),
        request
          .put(`${API_BASE}/${task.id}`)
          .set('Authorization', `Bearer ${testToken}`)
          .send(update2)
      ]);

      // Assert
      expect(response1.status).toBe(StatusCodes.OK);
      expect(response2.status).toBe(StatusCodes.OK);
      const finalTask = await TaskService.prototype.findById(task.id);
      expect(finalTask.data?.title).toBe(update2.title);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task within performance threshold', async () => {
      // Arrange
      const task = await TaskService.prototype.create(generateMockTask());

      // Act
      const startTime = Date.now();
      const response = await request
        .delete(`${API_BASE}/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`);
      const endTime = Date.now();

      // Assert
      expect(response.status).toBe(StatusCodes.NO_CONTENT);
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      
      // Verify task is deleted
      const getResponse = await request
        .get(`${API_BASE}/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`);
      expect(getResponse.status).toBe(StatusCodes.NOT_FOUND);
    });

    it('should handle cascade deletion of related data', async () => {
      // Arrange
      const task = await TaskService.prototype.create(generateMockTask());
      // Add related data (comments, attachments) here

      // Act
      const response = await request
        .delete(`${API_BASE}/${task.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(StatusCodes.NO_CONTENT);
      // Verify related data is also deleted
      // Implementation depends on specific cascade requirements
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting correctly', async () => {
      // Arrange
      const requests = Array.from({ length: 1001 }, () => 
        request
          .get(API_BASE)
          .set('Authorization', `Bearer ${testToken}`)
      );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      const rateLimitedResponse = responses[1000];
      expect(rateLimitedResponse.status).toBe(StatusCodes.TOO_MANY_REQUESTS);
      expect(rateLimitedResponse.body.type).toBe('about:blank');
      expect(rateLimitedResponse.body.title).toBe('Too Many Requests');
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      // Simulate database connection error
      jest.spyOn(TaskService.prototype, 'findAll').mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request
        .get(API_BASE)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body.type).toBe('about:blank');
      expect(response.body.title).toBe('Internal Server Error');
    });
  });
});