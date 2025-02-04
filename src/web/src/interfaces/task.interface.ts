/**
 * @fileoverview Task-related TypeScript interfaces and types for the Task Management System
 * Provides comprehensive type definitions for task entities, form data, and filtering
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';

/**
 * Enumeration of task priority levels with strict validation
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Enumeration of task progress states with complete lifecycle tracking
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

/**
 * Interface for task attachment metadata with strict typing
 */
export interface ITaskAttachment {
  /** Unique identifier for the attachment */
  id: string;
  /** Original filename of the attachment */
  fileName: string;
  /** MIME type of the attachment */
  fileType: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** ID of the user who uploaded the file */
  uploadedBy: string;
  /** Timestamp of the upload */
  uploadedAt: Date;
  /** Secure URL for downloading the attachment */
  downloadUrl: string;
}

/**
 * Comprehensive interface defining the structure of a task entity with strict typing
 * Extends BaseEntity for common fields and version tracking
 */
export interface ITask extends BaseEntity {
  /** Task title with required validation */
  title: string;
  /** Detailed task description */
  description: string;
  /** Reference to the parent project */
  projectId: string;
  /** User ID of the task assignee */
  assigneeId: string;
  /** Task priority level */
  priority: TaskPriority;
  /** Current task status */
  status: TaskStatus;
  /** Task due date */
  dueDate: Date;
  /** Array of task attachments */
  attachments: ITaskAttachment[];
  /** Array of task labels/tags */
  tags: string[];
  /** Optional reference to parent task for subtasks */
  parentTaskId?: string;
  /** Optional estimated hours for completion */
  estimatedHours?: number;
  /** Task completion percentage (0-100) */
  completionPercentage: number;
}

/**
 * Interface for task creation/update form data with validation
 * Omits system-managed fields from ITask
 */
export interface ITaskFormData {
  /** Task title (required) */
  title: string;
  /** Task description (required) */
  description: string;
  /** Project ID (required) */
  projectId: string;
  /** Assignee ID (required) */
  assigneeId: string;
  /** Task priority (required) */
  priority: TaskPriority;
  /** Due date (required) */
  dueDate: Date;
  /** Optional task tags */
  tags: string[];
  /** Optional parent task reference */
  parentTaskId?: string;
  /** Optional time estimate */
  estimatedHours?: number;
}

/**
 * Enhanced interface for task filtering options with date ranges
 * All fields are optional to support flexible filtering
 */
export interface ITaskFilter {
  /** Filter by project */
  projectId?: string;
  /** Filter by assignee */
  assigneeId?: string;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by due date range start */
  dueDateFrom?: Date;
  /** Filter by due date range end */
  dueDateTo?: Date;
  /** Filter by tags */
  tags?: string[];
  /** Include completed tasks */
  includeCompleted?: boolean;
  /** Include subtasks in results */
  includeSubtasks?: boolean;
}