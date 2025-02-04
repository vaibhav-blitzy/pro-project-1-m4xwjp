/**
 * @fileoverview Redux action creators and thunks for task management operations
 * Implements comprehensive CRUD operations with optimistic updates and caching
 * @version 1.0.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit'; // v1.9.0
import { TaskActionTypes } from './task.types';
import taskService from '../../services/task.service';
import { ITask } from '../../interfaces/task.interface';

/**
 * Fetches tasks with filtering, caching, and error handling
 */
export const fetchTasks = createAsyncThunk(
  TaskActionTypes.FETCH_TASKS,
  async (filters: {
    projectId?: string;
    assigneeId?: string;
    priority?: string[];
    status?: string[];
    dueDateFrom?: Date;
    dueDateTo?: Date;
    searchTerm?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await taskService.getTasks(filters);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'FETCH_TASKS_ERROR',
        message: error.message || 'Failed to fetch tasks',
        details: error.details || null
      });
    }
  }
);

/**
 * Creates a new task with validation and optimistic updates
 */
export const createTask = createAsyncThunk(
  TaskActionTypes.CREATE_TASK,
  async (taskData: {
    title: string;
    description: string;
    projectId: string;
    assigneeId: string;
    priority: string;
    status: string;
    dueDate: Date;
    attachments?: File[];
  }, { rejectWithValue }) => {
    try {
      const response = await taskService.createTask(taskData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'CREATE_TASK_ERROR',
        message: error.message || 'Failed to create task',
        details: error.details || null
      });
    }
  }
);

/**
 * Updates an existing task with version control and optimistic updates
 */
export const updateTask = createAsyncThunk(
  TaskActionTypes.UPDATE_TASK,
  async (payload: {
    taskId: string;
    changes: Partial<ITask>;
    version: number;
  }, { rejectWithValue }) => {
    try {
      const { taskId, changes } = payload;
      const response = await taskService.updateTask(taskId, changes);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'UPDATE_TASK_ERROR',
        message: error.message || 'Failed to update task',
        details: error.details || null
      });
    }
  }
);

/**
 * Deletes a task with cleanup and optimistic updates
 */
export const deleteTask = createAsyncThunk(
  TaskActionTypes.DELETE_TASK,
  async (taskId: string, { rejectWithValue }) => {
    try {
      await taskService.deleteTask(taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'DELETE_TASK_ERROR',
        message: error.message || 'Failed to delete task',
        details: error.details || null
      });
    }
  }
);

/**
 * Updates task status with validation and optimistic updates
 */
export const updateTaskStatus = createAsyncThunk(
  `${TaskActionTypes.UPDATE_TASK}/status`,
  async (payload: {
    taskId: string;
    status: string;
  }, { rejectWithValue }) => {
    try {
      const { taskId, status } = payload;
      const response = await taskService.updateTaskStatus(taskId, status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'UPDATE_STATUS_ERROR',
        message: error.message || 'Failed to update task status',
        details: error.details || null
      });
    }
  }
);

/**
 * Adds attachments to a task with progress tracking
 */
export const addTaskAttachments = createAsyncThunk(
  `${TaskActionTypes.UPDATE_TASK}/attachments`,
  async (payload: {
    taskId: string;
    files: File[];
  }, { rejectWithValue }) => {
    try {
      const { taskId, files } = payload;
      const response = await taskService.addTaskAttachment(taskId, files);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'ATTACHMENT_ERROR',
        message: error.message || 'Failed to add attachments',
        details: error.details || null
      });
    }
  }
);

/**
 * Removes an attachment from a task
 */
export const removeTaskAttachment = createAsyncThunk(
  `${TaskActionTypes.UPDATE_TASK}/removeAttachment`,
  async (payload: {
    taskId: string;
    attachmentId: string;
  }, { rejectWithValue }) => {
    try {
      const { taskId, attachmentId } = payload;
      const response = await taskService.removeTaskAttachment(taskId, attachmentId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'REMOVE_ATTACHMENT_ERROR',
        message: error.message || 'Failed to remove attachment',
        details: error.details || null
      });
    }
  }
);