/**
 * @fileoverview Enhanced service class for secure and performant task management operations
 * Implements Task Management requirements from Technical Specifications section 1.3
 * @version 1.0.0
 */

import { taskApi, TaskPriority, TaskStatus, ITask, ITaskFilter, ITaskFormData } from '../api/task.api';
import { ApiResponse } from '../types/api.types';
import { validateInput } from '../utils/validation.utils';
import { CacheManager } from '@task-manager/cache'; // v1.0.0
import { transformResponse } from '@task-manager/utils'; // v1.0.0
import { Logger } from '@task-manager/logger'; // v1.0.0

/**
 * Cache configuration for task operations
 */
const CACHE_CONFIG = {
  ttl: 300000, // 5 minutes
  maxSize: 1000,
  namespace: 'tasks'
};

/**
 * Enhanced service class for secure and performant task management operations
 */
export class TaskService {
  private readonly cache: CacheManager;
  private readonly logger: Logger;

  constructor() {
    this.cache = new CacheManager(CACHE_CONFIG);
    this.logger = new Logger('TaskService');
  }

  /**
   * Retrieves tasks with caching and security filtering
   * @param filters Task filtering criteria
   * @returns Promise resolving to filtered and cached task list
   */
  public async getTasks(filters: ITaskFilter = {}): Promise<ApiResponse<ITask[]>> {
    try {
      // Validate input filters
      const validatedFilters = await validateInput(filters);
      
      // Generate cache key based on filters
      const cacheKey = this.generateCacheKey('tasks', validatedFilters);
      
      // Check cache first
      const cachedData = await this.cache.get<ITask[]>(cacheKey);
      if (cachedData) {
        this.logger.debug('Cache hit for tasks', { filters });
        return transformResponse(cachedData);
      }

      // Fetch fresh data
      const response = await taskApi.getTasks(validatedFilters);
      
      // Cache the response
      await this.cache.set(cacheKey, response.data);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve tasks', { error, filters });
      throw error;
    }
  }

  /**
   * Creates a new task with validation and security measures
   * @param taskData Task creation data
   * @returns Promise resolving to created task
   */
  public async createTask(taskData: ITaskFormData): Promise<ApiResponse<ITask>> {
    try {
      // Validate task data
      const validatedData = await validateInput(taskData);
      
      // Create task
      const response = await taskApi.createTask(validatedData);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches();
      
      return response;
    } catch (error) {
      this.logger.error('Failed to create task', { error, taskData });
      throw error;
    }
  }

  /**
   * Updates an existing task with validation
   * @param taskId Task identifier
   * @param taskData Updated task data
   * @returns Promise resolving to updated task
   */
  public async updateTask(
    taskId: string,
    taskData: Partial<ITaskFormData>
  ): Promise<ApiResponse<ITask>> {
    try {
      // Validate task data
      const validatedData = await validateInput(taskData);
      
      // Update task
      const response = await taskApi.updateTask(taskId, validatedData);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches(taskId);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to update task', { error, taskId, taskData });
      throw error;
    }
  }

  /**
   * Retrieves a specific task by ID with caching
   * @param taskId Task identifier
   * @returns Promise resolving to task details
   */
  public async getTaskById(taskId: string): Promise<ApiResponse<ITask>> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey('task', { taskId });
      
      // Check cache first
      const cachedData = await this.cache.get<ITask>(cacheKey);
      if (cachedData) {
        this.logger.debug('Cache hit for task', { taskId });
        return transformResponse(cachedData);
      }

      // Fetch fresh data
      const response = await taskApi.getTaskById(taskId);
      
      // Cache the response
      await this.cache.set(cacheKey, response.data);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to retrieve task', { error, taskId });
      throw error;
    }
  }

  /**
   * Updates task status with validation
   * @param taskId Task identifier
   * @param status New task status
   * @returns Promise resolving to updated task
   */
  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<ApiResponse<ITask>> {
    try {
      // Validate status
      if (!Object.values(TaskStatus).includes(status)) {
        throw new Error('Invalid task status');
      }

      // Update status
      const response = await taskApi.updateTaskStatus(taskId, status);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches(taskId);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to update task status', { error, taskId, status });
      throw error;
    }
  }

  /**
   * Deletes a task by ID
   * @param taskId Task identifier
   * @returns Promise resolving to deletion confirmation
   */
  public async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    try {
      const response = await taskApi.deleteTask(taskId);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches(taskId);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to delete task', { error, taskId });
      throw error;
    }
  }

  /**
   * Adds attachments to a task
   * @param taskId Task identifier
   * @param files Array of files to attach
   * @returns Promise resolving to updated task
   */
  public async addTaskAttachment(
    taskId: string,
    files: File[]
  ): Promise<ApiResponse<ITask>> {
    try {
      // Validate files
      if (!files.length) {
        throw new Error('No files provided');
      }

      const response = await taskApi.addTaskAttachment(taskId, files);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches(taskId);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to add task attachment', { error, taskId });
      throw error;
    }
  }

  /**
   * Removes an attachment from a task
   * @param taskId Task identifier
   * @param attachmentId Attachment identifier
   * @returns Promise resolving to updated task
   */
  public async removeTaskAttachment(
    taskId: string,
    attachmentId: string
  ): Promise<ApiResponse<ITask>> {
    try {
      const response = await taskApi.removeTaskAttachment(taskId, attachmentId);
      
      // Invalidate relevant caches
      await this.invalidateTaskCaches(taskId);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to remove task attachment', { error, taskId, attachmentId });
      throw error;
    }
  }

  /**
   * Generates a cache key for task operations
   * @param prefix Cache key prefix
   * @param params Parameters to include in cache key
   * @returns Generated cache key
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  /**
   * Invalidates task-related caches
   * @param taskId Optional task ID to invalidate specific task cache
   */
  private async invalidateTaskCaches(taskId?: string): Promise<void> {
    try {
      if (taskId) {
        await this.cache.delete(this.generateCacheKey('task', { taskId }));
      }
      await this.cache.deleteByPattern(`tasks:*`);
    } catch (error) {
      this.logger.error('Failed to invalidate task caches', { error, taskId });
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();