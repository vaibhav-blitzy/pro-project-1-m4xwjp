/**
 * @fileoverview Core TypeScript types and interfaces for Redux store state management
 * Implements comprehensive type definitions for store slices and async operations
 * @version 1.0.0
 */

import { ThunkAction, Action } from '@reduxjs/toolkit'; // v1.9.0
import { AuthState } from '../interfaces/auth.interface';
import { IProject } from '../interfaces/project.interface';
import { ITask } from '../interfaces/task.interface';

/**
 * Type representing possible loading states for store operations
 */
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Common interface for handling async operation states
 */
export interface AsyncState {
  /** Current loading state */
  status: LoadingState;
  /** Error message if operation failed */
  error: string | null;
}

/**
 * Interface for project slice state with enhanced features
 */
export interface ProjectState {
  /** Array of all projects */
  projects: IProject[];
  /** Currently selected project */
  selectedProject: IProject | null;
  /** Project hierarchy mapping parent to child projects */
  projectHierarchy: Record<string, string[]>;
  /** Project timeline data */
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: IMilestone[];
  };
  /** Current loading state */
  status: LoadingState;
  /** Error state with detailed information */
  error: {
    code: string;
    message: string;
  } | null;
}

/**
 * Interface for task slice state with collaboration support
 */
export interface TaskState {
  /** Array of all tasks */
  tasks: ITask[];
  /** Currently selected task */
  selectedTask: ITask | null;
  /** Task dependency relationships */
  taskRelationships: Record<string, {
    dependsOn: string[];
    blockedBy: string[];
  }>;
  /** Real-time collaborator information */
  collaborators: {
    userId: string;
    status: 'active' | 'idle';
  }[];
  /** Active task filters */
  filters: {
    status: string[];
    priority: string[];
    assignee: string[];
  };
  /** Task sort configuration */
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** Current loading state */
  status: LoadingState;
  /** Error state with field-level details */
  error: {
    code: string;
    message: string;
    field?: string;
  } | null;
}

/**
 * Root state interface combining all slice states
 */
export interface RootState {
  /** Authentication state */
  auth: AuthState;
  /** Project management state */
  project: ProjectState;
  /** Task management state */
  task: TaskState;
}

/**
 * Type for Redux Thunk actions with proper typing
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

/**
 * Interface for project milestone tracking
 */
interface IMilestone {
  /** Unique milestone identifier */
  id: string;
  /** Milestone title */
  title: string;
  /** Milestone description */
  description: string;
  /** Due date for the milestone */
  dueDate: Date;
  /** Current milestone status */
  status: string;
}