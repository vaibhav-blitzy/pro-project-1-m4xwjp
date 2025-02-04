/**
 * @fileoverview TypeScript types and interfaces for task slice of Redux store
 * Implements comprehensive type definitions for task management with enhanced filtering
 * and real-time collaboration support
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { LoadingState } from '../../types/store.types';

/**
 * Interface defining the task slice state structure
 * Includes support for real-time collaboration and enhanced filtering
 */
export interface TaskState {
  /** Array of all tasks */
  tasks: ITask[];
  /** Currently selected task for viewing/editing */
  selectedTask: ITask | null;
  /** Current loading state of task operations */
  status: LoadingState;
  /** Error message if operation failed */
  error: string | null;
  /** Active task filters */
  filters: TaskFilters;
  /** Last update timestamp for optimistic updates */
  lastUpdated: Date | null;
  /** Array of active collaborator IDs */
  collaborators: string[];
}

/**
 * Interface for task filtering options with comprehensive search capabilities
 */
export interface TaskFilters {
  /** Text-based search term */
  searchTerm: string | null;
  /** Array of selected priority filters */
  priorities: TaskPriority[];
  /** Array of selected status filters */
  statuses: TaskStatus[];
  /** Array of selected assignee IDs */
  assigneeIds: string[];
  /** Array of selected project IDs */
  projectIds: string[];
  /** Start date for due date range filter */
  dueDateFrom: Date | null;
  /** End date for due date range filter */
  dueDateTo: Date | null;
  /** Whether to show archived tasks */
  showArchived: boolean;
}

/**
 * Interface for task creation payload with validation
 */
export interface CreateTaskPayload {
  /** Task title (required) */
  title: string;
  /** Task description */
  description: string;
  /** Task priority level */
  priority: TaskPriority;
  /** Assigned user ID */
  assigneeId: string;
  /** Associated project ID */
  projectId: string;
  /** Task due date */
  dueDate: Date;
  /** Array of attachment IDs */
  attachments: string[];
}

/**
 * Interface for task update payload with partial updates
 */
export interface UpdateTaskPayload {
  /** Task ID to update */
  id: string;
  /** Partial task changes */
  changes: Partial<ITask>;
  /** ID of user making the update */
  updatedBy: string;
  /** Timestamp of update */
  updatedAt: Date;
}

/**
 * Enumeration of all possible task action types
 */
export enum TaskActionTypes {
  FETCH_TASKS = 'task/fetchTasks',
  CREATE_TASK = 'task/createTask',
  UPDATE_TASK = 'task/updateTask',
  DELETE_TASK = 'task/deleteTask',
  SELECT_TASK = 'task/selectTask',
  SET_TASK_FILTERS = 'task/setTaskFilters',
  UPDATE_COLLABORATORS = 'task/updateCollaborators'
}

/**
 * Type for task-related Redux actions with proper payload typing
 */
export type TaskAction =
  | PayloadAction<ITask[]>
  | PayloadAction<CreateTaskPayload>
  | PayloadAction<UpdateTaskPayload>
  | PayloadAction<string>
  | PayloadAction<TaskFilters>
  | PayloadAction<string[]>;