/**
 * @packageDocumentation
 * @module TaskService/Controllers
 * @version 1.0.0
 * 
 * Enhanced REST API controller implementing task management endpoints with
 * RFC 7807 error handling, rate limiting, and response time monitoring.
 */

import { injectable } from 'inversify'; // v6.0.1
import { 
  controller, 
  httpGet, 
  httpPost, 
  httpPut, 
  httpDelete,
  httpPatch 
} from 'inversify-express-utils'; // v6.4.3
import { Request, Response } from 'express'; // v4.18.2
import { rateLimit } from 'express-rate-limit'; // v6.7.0
import { ResponseTimeMonitor } from '@nestjs/common'; // v9.0.0

import { IBaseController } from '../../common/interfaces/base-controller.interface';
import { Task, TaskPriority, TaskStatus } from '../models/task.model';
import { TaskService } from '../services/task.service';
import { Logger } from '../../common/services/logger.service';
import { validate } from '../../common/middleware/validation.middleware';
import { ProblemDocument } from '../../common/interfaces/problem-document.interface';

/**
 * Rate limiter configuration for task endpoints
 */
const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: {
    type: 'about:blank',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Rate limit exceeded. Please try again later.',
    instance: '/api/v1/tasks'
  }
});

/**
 * Enhanced controller implementing task management endpoints with monitoring,
 * rate limiting, and RFC 7807 error handling.
 */
@injectable()
@controller('/api/v1/tasks')
export class TaskController implements IBaseController<Task> {
  constructor(
    private readonly taskService: TaskService,
    private readonly logger: Logger
  ) {}

  /**
   * GET /api/v1/tasks
   * Retrieves paginated list of tasks with filtering and sorting
   */
  @httpGet('/')
  @ResponseTimeMonitor()
  @validate()
  async getAll(
    req: Request<{}, {}, {}, QueryFilters>,
    res: Response
  ): Promise<Response> {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = req.query;

      const result = await this.taskService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder,
        filters
      });

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: 'Internal Server Error',
          status: 500,
          detail: result.message,
          instance: req.path
        };
        return res.status(500).json(problem);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      this.logger.error('Error in getAll tasks', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while retrieving tasks',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * GET /api/v1/tasks/:id
   * Retrieves a specific task by ID
   */
  @httpGet('/:id')
  @ResponseTimeMonitor()
  @validate()
  async getById(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.findById(req.params.id);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: result.data ? 'Not Found' : 'Internal Server Error',
          status: result.data ? 404 : 500,
          detail: result.message,
          instance: req.path
        };
        return res.status(problem.status).json(problem);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      this.logger.error('Error in getById task', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while retrieving the task',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * POST /api/v1/tasks
   * Creates a new task
   */
  @httpPost('/')
  @ResponseTimeMonitor()
  @validate()
  async create(
    req: Request<{}, {}, Task>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.create(req.body);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: result.message,
          instance: req.path
        };
        return res.status(400).json(problem);
      }

      return res.status(201).json(result.data);
    } catch (error) {
      this.logger.error('Error in create task', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while creating the task',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * PUT /api/v1/tasks/:id
   * Updates an existing task
   */
  @httpPut('/:id')
  @ResponseTimeMonitor()
  @validate()
  async update(
    req: Request<{ id: string }, {}, Partial<Task>>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.update(req.params.id, req.body);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: result.data ? 'Not Found' : 'Bad Request',
          status: result.data ? 404 : 400,
          detail: result.message,
          instance: req.path
        };
        return res.status(problem.status).json(problem);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      this.logger.error('Error in update task', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while updating the task',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id
   * Deletes an existing task
   */
  @httpDelete('/:id')
  @ResponseTimeMonitor()
  @validate()
  async delete(
    req: Request<{ id: string }, {}, {}>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.delete(req.params.id);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: result.data ? 'Not Found' : 'Bad Request',
          status: result.data ? 404 : 400,
          detail: result.message,
          instance: req.path
        };
        return res.status(problem.status).json(problem);
      }

      return res.status(204).send();
    } catch (error) {
      this.logger.error('Error in delete task', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while deleting the task',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/status
   * Updates task status
   */
  @httpPatch('/:id/status')
  @ResponseTimeMonitor()
  @validate()
  async updateStatus(
    req: Request<{ id: string }, {}, { status: TaskStatus }>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.updateStatus(req.params.id, req.body.status);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: result.data ? 'Not Found' : 'Bad Request',
          status: result.data ? 404 : 400,
          detail: result.message,
          instance: req.path
        };
        return res.status(problem.status).json(problem);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      this.logger.error('Error in update task status', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while updating the task status',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/priority
   * Updates task priority
   */
  @httpPatch('/:id/priority')
  @ResponseTimeMonitor()
  @validate()
  async updatePriority(
    req: Request<{ id: string }, {}, { priority: TaskPriority }>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.taskService.updatePriority(req.params.id, req.body.priority);

      if (!result.success) {
        const problem: ProblemDocument = {
          type: 'about:blank',
          title: result.data ? 'Not Found' : 'Bad Request',
          status: result.data ? 404 : 400,
          detail: result.message,
          instance: req.path
        };
        return res.status(problem.status).json(problem);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      this.logger.error('Error in update task priority', error);
      const problem: ProblemDocument = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred while updating the task priority',
        instance: req.path
      };
      return res.status(500).json(problem);
    }
  }
}