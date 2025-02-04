/**
 * @packageDocumentation
 * @module TaskService/Interfaces
 * @version 1.0.0
 * 
 * Core interfaces and types for the task management system.
 * Defines task structure, validation rules, and service operations.
 */

import { IBaseService, ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';

/**
 * Branded type for task identifiers to ensure type safety
 */
export type TaskId = string & { readonly _brand: unique symbol };

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Task progress states
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

/**
 * Metadata for task file attachments
 */
export interface AttachmentMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Task validation constants
 */
export const TaskValidation = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_ATTACHMENTS: 20,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 50
} as const;

/**
 * Paginated result interface for task queries
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Task audit trail entry interface
 */
export interface TaskAuditEntry {
  timestamp: Date;
  userId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * File upload metadata interface
 */
export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Core task entity interface with validation constraints
 */
export interface ITask {
  id: TaskId;
  title: string;                    // Max length: TaskValidation.MAX_TITLE_LENGTH
  description?: string;             // Max length: TaskValidation.MAX_DESCRIPTION_LENGTH
  projectId: string;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  attachments: AttachmentMetadata[]; // Max items: TaskValidation.MAX_ATTACHMENTS
  tags: string[];                    // Max items: TaskValidation.MAX_TAGS, each max length: TaskValidation.MAX_TAG_LENGTH
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended service interface for task-specific operations
 */
export interface ITaskService extends IBaseService<ITask> {
  /**
   * Retrieves all tasks belonging to a specific project with pagination
   * 
   * @param projectId - Unique identifier of the project
   * @param options - Pagination parameters
   * @returns Promise resolving to paginated list of tasks
   */
  findByProject(
    projectId: string,
    options: PaginationParams
  ): Promise<ServiceResponse<PaginatedResult<ITask>>>;

  /**
   * Retrieves all tasks assigned to a specific user with pagination
   * 
   * @param assigneeId - Unique identifier of the assignee
   * @param options - Pagination parameters
   * @returns Promise resolving to paginated list of tasks
   */
  findByAssignee(
    assigneeId: string,
    options: PaginationParams
  ): Promise<ServiceResponse<PaginatedResult<ITask>>>;

  /**
   * Searches tasks by tags with pagination
   * 
   * @param tags - Array of tags to search for
   * @param options - Pagination parameters
   * @returns Promise resolving to paginated list of tasks
   */
  findByTags(
    tags: string[],
    options: PaginationParams
  ): Promise<ServiceResponse<PaginatedResult<ITask>>>;

  /**
   * Updates the status of a task with audit trail
   * 
   * @param taskId - Unique identifier of the task
   * @param newStatus - New status to set
   * @param userId - Identifier of the user making the change
   * @returns Promise resolving to updated task
   */
  updateStatus(
    taskId: TaskId,
    newStatus: TaskStatus,
    userId: string
  ): Promise<ServiceResponse<ITask>>;

  /**
   * Updates the priority of a task with audit trail
   * 
   * @param taskId - Unique identifier of the task
   * @param newPriority - New priority to set
   * @param userId - Identifier of the user making the change
   * @returns Promise resolving to updated task
   */
  updatePriority(
    taskId: TaskId,
    newPriority: TaskPriority,
    userId: string
  ): Promise<ServiceResponse<ITask>>;

  /**
   * Adds a file attachment to a task
   * 
   * @param taskId - Unique identifier of the task
   * @param file - File upload metadata and buffer
   * @param userId - Identifier of the user adding the attachment
   * @returns Promise resolving to updated task
   */
  addAttachment(
    taskId: TaskId,
    file: FileUpload,
    userId: string
  ): Promise<ServiceResponse<ITask>>;

  /**
   * Removes a file attachment from a task
   * 
   * @param taskId - Unique identifier of the task
   * @param fileId - Unique identifier of the file to remove
   * @param userId - Identifier of the user removing the attachment
   * @returns Promise resolving to updated task
   */
  removeAttachment(
    taskId: TaskId,
    fileId: string,
    userId: string
  ): Promise<ServiceResponse<ITask>>;

  /**
   * Retrieves the audit trail for a task
   * 
   * @param taskId - Unique identifier of the task
   * @returns Promise resolving to list of audit entries
   */
  getTaskHistory(
    taskId: TaskId
  ): Promise<ServiceResponse<TaskAuditEntry[]>>;
}