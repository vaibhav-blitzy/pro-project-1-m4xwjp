import { TaskService } from '../../../src/task-service/services/task.service';
import { TaskRepository } from '../../../src/task-service/repositories/task.repository';
import { NotificationService } from '../../../src/notification-service/services/notification.service';
import { mockTasks, generateMockTask, generateMockTasks } from '../../fixtures/tasks.fixture';
import { mockRedisClient, mockRabbitMQChannel } from '../../helpers/test-utils';
import { TaskStatus, TaskPriority } from '../../../src/task-service/interfaces/task.interface';
import { ErrorCodes } from '../../../src/common/constants/error-codes';
import { Logger } from '../../../src/common/utils/logger.util';

// Mock external dependencies
jest.mock('../../../src/task-service/repositories/task.repository');
jest.mock('../../../src/notification-service/services/notification.service');

describe('TaskService', () => {
  let taskService: TaskService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let redisClient: ReturnType<typeof mockRedisClient>;
  const logger = Logger.getInstance();

  beforeAll(() => {
    // Configure test timeouts and performance thresholds
    jest.setTimeout(10000);
    process.env.API_RESPONSE_TIMEOUT = '500';
  });

  beforeEach(() => {
    // Reset mocks and create fresh instances
    jest.clearAllMocks();
    redisClient = mockRedisClient();
    taskRepository = new TaskRepository(jest.fn(), jest.fn(), jest.fn()) as jest.Mocked<TaskRepository>;
    notificationService = new NotificationService(jest.fn(), jest.fn(), jest.fn(), jest.fn()) as jest.Mocked<NotificationService>;
    taskService = new TaskService(taskRepository, notificationService, redisClient, jest.fn(), logger);
  });

  describe('findAll', () => {
    const defaultOptions = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: {}
    };

    it('should retrieve tasks with pagination within performance threshold', async () => {
      const mockTaskList = generateMockTasks(5);
      taskRepository.findAll.mockResolvedValue({
        items: mockTaskList,
        total: 5,
        page: 1,
        totalPages: 1
      });

      const startTime = Date.now();
      const result = await taskService.findAll(defaultOptions);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(500); // Performance check
      expect(taskRepository.findAll).toHaveBeenCalledWith(defaultOptions);
    });

    it('should return cached results when available', async () => {
      const cacheKey = `task:list:${JSON.stringify(defaultOptions)}`;
      const cachedTasks = generateMockTasks(3);
      await redisClient.setex(cacheKey, 300, JSON.stringify(cachedTasks));

      const result = await taskService.findAll(defaultOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedTasks);
      expect(result.metadata?.source).toBe('cache');
      expect(taskRepository.findAll).not.toHaveBeenCalled();
    });

    it('should handle filtering by status correctly', async () => {
      const filterOptions = {
        ...defaultOptions,
        filters: { status: [TaskStatus.IN_PROGRESS] }
      };

      const filteredTasks = generateMockTasks(2, [{ status: TaskStatus.IN_PROGRESS }]);
      taskRepository.findAll.mockResolvedValue({
        items: filteredTasks,
        total: 2,
        page: 1,
        totalPages: 1
      });

      const result = await taskService.findAll(filterOptions);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.items.every(task => task.status === TaskStatus.IN_PROGRESS)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      taskRepository.findAll.mockRejectedValue(dbError);

      const result = await taskService.findAll(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBe(ErrorCodes.DATABASE_ERROR);
    });
  });

  describe('findById', () => {
    const taskId = mockTasks.task1.id;

    it('should retrieve a single task by ID within performance threshold', async () => {
      taskRepository.findById.mockResolvedValue(mockTasks.task1);

      const startTime = Date.now();
      const result = await taskService.findById(taskId);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTasks.task1);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should return cached task when available', async () => {
      const cacheKey = `task:${taskId}`;
      await redisClient.setex(cacheKey, 3600, JSON.stringify(mockTasks.task1));

      const result = await taskService.findById(taskId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTasks.task1);
      expect(result.metadata?.source).toBe('cache');
      expect(taskRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle non-existent task gracefully', async () => {
      taskRepository.findById.mockResolvedValue(null);

      const result = await taskService.findById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    });
  });

  describe('create', () => {
    const newTaskData = {
      title: 'New Test Task',
      description: 'Test description',
      projectId: 'project-123',
      assigneeId: 'user-123',
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      dueDate: new Date(),
      tags: ['test', 'important']
    };

    it('should create a new task and send notification within performance threshold', async () => {
      const createdTask = generateMockTask(newTaskData);
      taskRepository.create.mockResolvedValue(createdTask);
      notificationService.sendNotification.mockResolvedValue({ success: true, data: null, message: '', error: null, errorCode: null, metadata: null });

      const startTime = Date.now();
      const result = await taskService.create(newTaskData);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdTask);
      expect(endTime - startTime).toBeLessThan(500);
      expect(notificationService.sendNotification).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = { ...newTaskData, title: '' };

      const result = await taskService.create(invalidData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(taskRepository.create).not.toHaveBeenCalled();
    });

    it('should handle duplicate task creation', async () => {
      taskRepository.create.mockRejectedValue(new Error('Duplicate entry'));

      const result = await taskService.create(newTaskData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.DUPLICATE_ENTRY);
    });
  });

  describe('update', () => {
    const taskId = mockTasks.task1.id;
    const updateData = {
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH
    };

    it('should update task and invalidate cache within performance threshold', async () => {
      const updatedTask = { ...mockTasks.task1, ...updateData };
      taskRepository.findById.mockResolvedValue(mockTasks.task1);
      taskRepository.update.mockResolvedValue(updatedTask);

      const startTime = Date.now();
      const result = await taskService.update(taskId, updateData);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedTask);
      expect(endTime - startTime).toBeLessThan(500);
      expect(redisClient.del).toHaveBeenCalledWith(`task:${taskId}`);
    });

    it('should validate status transitions', async () => {
      const invalidTransition = {
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.LOW
      };
      taskRepository.findById.mockResolvedValue(mockTasks.task1);

      const result = await taskService.update(taskId, invalidTransition);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should handle concurrent updates', async () => {
      taskRepository.findById.mockResolvedValue(mockTasks.task1);
      taskRepository.update.mockRejectedValue(new Error('Concurrent modification'));

      const result = await taskService.update(taskId, updateData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('delete', () => {
    const taskId = mockTasks.task1.id;

    it('should delete task and clean up cache within performance threshold', async () => {
      taskRepository.findById.mockResolvedValue(mockTasks.task1);
      taskRepository.delete.mockResolvedValue({ deleted: true });

      const startTime = Date.now();
      const result = await taskService.delete(taskId);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(endTime - startTime).toBeLessThan(500);
      expect(redisClient.del).toHaveBeenCalledWith(`task:${taskId}`);
    });

    it('should handle non-existent task deletion', async () => {
      taskRepository.findById.mockResolvedValue(null);

      const result = await taskService.delete('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    });

    it('should validate cascade deletion constraints', async () => {
      taskRepository.findById.mockResolvedValue(mockTasks.task1);
      taskRepository.delete.mockRejectedValue(new Error('Foreign key constraint'));

      const result = await taskService.delete(taskId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  afterEach(async () => {
    await redisClient.flushall();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await redisClient.quit();
  });
});