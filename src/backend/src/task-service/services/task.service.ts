/**
 * @file Task service implementation with comprehensive business logic, caching,
 * real-time updates, and performance optimization.
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.10.0
import Redis from 'ioredis'; // v5.3.2
import { ValidationError } from '@common/errors'; // v1.0.0
import { ITaskService } from '../interfaces/task.interface';
import { TaskRepository } from '../repositories/task.repository';
import { NotificationService } from '../../notification-service/services/notification.service';
import { TaskValidator } from '../validators/task.validator';
import {
  ITask,
  TaskId,
  TaskPriority,
  TaskStatus,
  PaginatedResult,
  TaskAuditEntry,
  FileUpload,
  TaskValidation
} from '../interfaces/task.interface';
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import { ErrorCodes } from '../../common/constants/error-codes';

// Cache configuration
const CACHE_CONFIG = {
  keyPrefix: 'task:',
  ttl: 3600, // 1 hour
  taskListTTL: 300 // 5 minutes
};

@injectable()
export class TaskService implements ITaskService {
  private readonly logger: Logger;
  private readonly cacheKeyPatterns = {
    task: (id: string) => `${CACHE_CONFIG.keyPrefix}${id}`,
    taskList: (filter: string) => `${CACHE_CONFIG.keyPrefix}list:${filter}`
  };

  constructor(
    @inject(TaskRepository) private taskRepository: TaskRepository,
    @inject(NotificationService) private notificationService: NotificationService,
    @inject('RedisClient') private cacheClient: Redis,
    @inject(TaskValidator) private validator: TaskValidator,
    @inject('Logger') logger: Logger
  ) {
    this.logger = logger;
  }

  /**
   * Retrieves all tasks with caching and filtering support
   */
  public async findAll(options: PaginationParams): Promise<ServiceResponse<PaginatedResult<ITask>>> {
    try {
      const cacheKey = this.cacheKeyPatterns.taskList(JSON.stringify(options));
      
      // Try cache first
      const cachedResult = await this.cacheClient.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          message: 'Tasks retrieved from cache',
          data: JSON.parse(cachedResult),
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      // Get from database
      const result = await this.taskRepository.findAll(options);
      
      // Cache the result
      await this.cacheClient.setex(
        cacheKey,
        CACHE_CONFIG.taskListTTL,
        JSON.stringify(result)
      );

      return {
        success: true,
        message: 'Tasks retrieved successfully',
        data: result,
        error: null,
        errorCode: null,
        metadata: { source: 'database' }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve tasks', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve tasks',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.DATABASE_ERROR,
        metadata: null
      };
    }
  }

  /**
   * Retrieves tasks by project with pagination
   */
  public async findByProject(
    projectId: string,
    options: PaginationParams
  ): Promise<ServiceResponse<PaginatedResult<ITask>>> {
    try {
      const cacheKey = this.cacheKeyPatterns.taskList(`project:${projectId}:${JSON.stringify(options)}`);
      
      const cachedResult = await this.cacheClient.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          message: 'Project tasks retrieved from cache',
          data: JSON.parse(cachedResult),
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      const result = await this.taskRepository.findByProject(projectId, options);
      
      await this.cacheClient.setex(
        cacheKey,
        CACHE_CONFIG.taskListTTL,
        JSON.stringify(result)
      );

      return {
        success: true,
        message: 'Project tasks retrieved successfully',
        data: result,
        error: null,
        errorCode: null,
        metadata: { source: 'database' }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve project tasks', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve project tasks',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.DATABASE_ERROR,
        metadata: null
      };
    }
  }

  /**
   * Updates task status with validation and notification
   */
  public async updateStatus(
    taskId: TaskId,
    newStatus: TaskStatus,
    userId: string
  ): Promise<ServiceResponse<ITask>> {
    try {
      // Validate status transition
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }

      const statusValidation = await this.validator.validateTaskStatus(newStatus, task.status);
      if (!statusValidation.isValid) {
        throw new ValidationError('Invalid status transition', statusValidation.errors);
      }

      // Update task
      const updatedTask = await this.taskRepository.update(taskId, {
        status: newStatus,
        lastModifiedBy: userId
      });

      // Invalidate cache
      await this.cacheClient.del(this.cacheKeyPatterns.task(taskId));

      // Send notification
      await this.notificationService.sendNotification({
        userId: task.assigneeId,
        type: 'TASK_UPDATED',
        title: 'Task Status Updated',
        message: `Task "${task.title}" status changed to ${newStatus}`,
        metadata: {
          taskId,
          oldStatus: task.status,
          newStatus,
          updatedBy: userId
        }
      });

      return {
        success: true,
        message: 'Task status updated successfully',
        data: updatedTask,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      this.logger.error('Failed to update task status', error as Error);
      return {
        success: false,
        message: 'Failed to update task status',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.VALIDATION_ERROR,
        metadata: null
      };
    }
  }

  /**
   * Updates task priority with validation and notification
   */
  public async updatePriority(
    taskId: TaskId,
    newPriority: TaskPriority,
    userId: string
  ): Promise<ServiceResponse<ITask>> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }

      const priorityValidation = await this.validator.validateTaskPriority(newPriority);
      if (!priorityValidation.isValid) {
        throw new ValidationError('Invalid priority value', priorityValidation.errors);
      }

      const updatedTask = await this.taskRepository.update(taskId, {
        priority: newPriority,
        lastModifiedBy: userId
      });

      await this.cacheClient.del(this.cacheKeyPatterns.task(taskId));

      await this.notificationService.sendNotification({
        userId: task.assigneeId,
        type: 'TASK_UPDATED',
        title: 'Task Priority Updated',
        message: `Task "${task.title}" priority changed to ${newPriority}`,
        metadata: {
          taskId,
          oldPriority: task.priority,
          newPriority,
          updatedBy: userId
        }
      });

      return {
        success: true,
        message: 'Task priority updated successfully',
        data: updatedTask,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      this.logger.error('Failed to update task priority', error as Error);
      return {
        success: false,
        message: 'Failed to update task priority',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.VALIDATION_ERROR,
        metadata: null
      };
    }
  }

  /**
   * Adds file attachment to task with validation
   */
  public async addAttachment(
    taskId: TaskId,
    file: FileUpload,
    userId: string
  ): Promise<ServiceResponse<ITask>> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new ValidationError('Task not found');
      }

      if (task.attachments.length >= TaskValidation.MAX_ATTACHMENTS) {
        throw new ValidationError(
          `Maximum number of attachments (${TaskValidation.MAX_ATTACHMENTS}) exceeded`
        );
      }

      const updatedTask = await this.taskRepository.update(taskId, {
        attachments: [
          ...task.attachments,
          {
            fileId: file.originalname,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date()
          }
        ],
        lastModifiedBy: userId
      });

      await this.cacheClient.del(this.cacheKeyPatterns.task(taskId));

      return {
        success: true,
        message: 'File attachment added successfully',
        data: updatedTask,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      this.logger.error('Failed to add file attachment', error as Error);
      return {
        success: false,
        message: 'Failed to add file attachment',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.VALIDATION_ERROR,
        metadata: null
      };
    }
  }

  /**
   * Retrieves task audit history
   */
  public async getTaskHistory(taskId: TaskId): Promise<ServiceResponse<TaskAuditEntry[]>> {
    try {
      const history = await this.taskRepository.getTaskHistory(taskId);
      
      return {
        success: true,
        message: 'Task history retrieved successfully',
        data: history,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      this.logger.error('Failed to retrieve task history', error as Error);
      return {
        success: false,
        message: 'Failed to retrieve task history',
        data: null,
        error: error as Error,
        errorCode: ErrorCodes.DATABASE_ERROR,
        metadata: null
      };
    }
  }
}