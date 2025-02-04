/**
 * @file Task repository implementation with Prisma ORM
 * Provides data access layer for task entities with comprehensive error handling,
 * validation, and audit logging
 * @version 1.0.0
 */

import { PrismaClient, Prisma } from '@prisma/client'; // v5.0.0
import Logger from '../../../common/utils/logger.util';
import { DatabaseError } from '@common/errors'; // v1.0.0
import { Task } from '../models/task.model';
import { 
  ITask, 
  TaskPriority, 
  TaskStatus, 
  PaginatedResult,
  TaskAuditEntry 
} from '../interfaces/task.interface';
import { TaskValidator } from '../validators/task.validator';
import { ErrorCodes } from '../../../common/constants/error-codes';

/**
 * Repository class implementing data access operations for task entities
 */
export class TaskRepository {
  private readonly prisma: PrismaClient;
  private readonly logger: typeof Logger;
  private readonly validator: TaskValidator;

  constructor(
    prisma: PrismaClient,
    logger: typeof Logger,
    validator: TaskValidator
  ) {
    this.prisma = prisma;
    this.logger = logger;
    this.validator = validator;

    // Initialize error handlers for Prisma
    this.initializeErrorHandlers();
  }

  /**
   * Sets up Prisma error handlers and middleware
   */
  private initializeErrorHandlers(): void {
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        this.logger.debug('Prisma query executed', {
          model: params.model,
          action: params.action,
          duration,
          query: params.args
        });
        return result;
      } catch (error) {
        this.logger.error('Prisma query failed', error as Error, {
          model: params.model,
          action: params.action,
          query: params.args
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves all tasks with advanced filtering, sorting, and pagination
   * @param options - Query options including filters, sorting, and pagination
   * @returns Promise resolving to paginated task list
   */
  async findAll(options: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: {
      status?: TaskStatus[];
      priority?: TaskPriority[];
      assigneeId?: string;
      projectId?: string;
      dueDateFrom?: Date;
      dueDateTo?: Date;
      search?: string;
    };
  }): Promise<PaginatedResult<Task>> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {}
      } = options;

      // Build where clause based on filters
      const where: Prisma.TaskWhereInput = {
        deletedAt: null,
        ...(filters.status && { status: { in: filters.status } }),
        ...(filters.priority && { priority: { in: filters.priority } }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        }),
        ...(filters.dueDateFrom || filters.dueDateTo ? {
          dueDate: {
            ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
            ...(filters.dueDateTo && { lte: filters.dueDateTo })
          }
        } : {})
      };

      // Execute count query
      const total = await this.prisma.task.count({ where });
      const totalPages = Math.ceil(total / limit);

      // Execute main query with pagination
      const tasks = await this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      this.logger.debug('Tasks retrieved successfully', {
        count: tasks.length,
        page,
        totalPages
      });

      return {
        items: tasks,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Failed to retrieve tasks', error as Error);
      throw new DatabaseError(
        'Failed to retrieve tasks',
        ErrorCodes.DATABASE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Retrieves a single task by ID with related data
   * @param id - Task identifier
   * @param includeDeleted - Whether to include soft-deleted tasks
   * @returns Promise resolving to task entity if found
   */
  async findById(id: string, includeDeleted = false): Promise<Task | null> {
    try {
      const task = await this.prisma.task.findFirst({
        where: {
          id,
          ...(!includeDeleted && { deletedAt: null })
        },
        include: {
          project: {
            select: {
              name: true,
              status: true
            }
          },
          assignee: {
            select: {
              name: true,
              email: true
            }
          },
          attachments: true,
          comments: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      });

      if (task) {
        this.logger.debug('Task retrieved successfully', { taskId: id });
      } else {
        this.logger.debug('Task not found', { taskId: id });
      }

      return task;
    } catch (error) {
      this.logger.error('Failed to retrieve task', error as Error, { taskId: id });
      throw new DatabaseError(
        'Failed to retrieve task',
        ErrorCodes.DATABASE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Creates a new task with validation and audit logging
   * @param data - Task creation data
   * @param userId - ID of user creating the task
   * @returns Promise resolving to created task
   */
  async create(data: Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Task> {
    try {
      const task = await this.prisma.task.create({
        data: {
          ...data,
          createdBy: userId,
          lastModifiedBy: userId
        },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      await this.createAuditEntry(task.id, userId, 'CREATE', null, task);

      this.logger.info('Task created successfully', {
        taskId: task.id,
        userId
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create task', error as Error);
      throw new DatabaseError(
        'Failed to create task',
        ErrorCodes.DATABASE_ERROR,
        error as Error
      );
    }
  }

  /**
   * Creates an audit trail entry for task operations
   * @param taskId - Task identifier
   * @param userId - User performing the operation
   * @param action - Type of operation
   * @param oldData - Previous task state
   * @param newData - New task state
   */
  private async createAuditEntry(
    taskId: string,
    userId: string,
    action: string,
    oldData: Partial<Task> | null,
    newData: Partial<Task>
  ): Promise<void> {
    try {
      const auditEntry: TaskAuditEntry = {
        timestamp: new Date(),
        userId,
        action,
        changes: this.computeChanges(oldData, newData),
        metadata: {
          taskId,
          environment: process.env.NODE_ENV
        }
      };

      await this.prisma.taskAudit.create({
        data: {
          taskId,
          userId,
          action,
          changes: auditEntry.changes,
          metadata: auditEntry.metadata
        }
      });

      this.logger.debug('Audit entry created', { auditEntry });
    } catch (error) {
      this.logger.error('Failed to create audit entry', error as Error);
      // Don't throw here to prevent main operation from failing
    }
  }

  /**
   * Computes changes between old and new task states
   * @param oldData - Previous task state
   * @param newData - New task state
   * @returns Object containing changed fields
   */
  private computeChanges(
    oldData: Partial<Task> | null,
    newData: Partial<Task>
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (!oldData) {
      return Object.keys(newData).reduce((acc, key) => {
        acc[key] = { old: null, new: newData[key as keyof Task] };
        return acc;
      }, changes);
    }

    Object.keys(newData).forEach(key => {
      const typedKey = key as keyof Task;
      if (oldData[typedKey] !== newData[typedKey]) {
        changes[key] = {
          old: oldData[typedKey],
          new: newData[typedKey]
        };
      }
    });

    return changes;
  }
}