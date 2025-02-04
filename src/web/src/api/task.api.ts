/**
 * @fileoverview Task API client implementation with comprehensive security and performance features
 * Implements Task Management requirements from Technical Specifications section 1.3
 * @version 1.0.0
 */

import { apiService } from '../services/api.service';
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { API_ENDPOINTS } from '../constants/api.constants';
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import rateLimit from 'axios-rate-limit'; // v1.3.0

// Global constants
const TASKS_API_PATH = API_ENDPOINTS.TASKS.BASE;
const API_TIMEOUT = 5000;
const CACHE_TTL = 300000; // 5 minutes
const MAX_RETRIES = 3;

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Task status states
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done'
}

/**
 * Interface for task data structure
 */
export interface ITask {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for task creation/update form data
 */
export interface ITaskFormData {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  attachments?: File[];
}

/**
 * Interface for task filtering options
 */
export interface ITaskFilter {
  projectId?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

/**
 * Retrieves a paginated list of tasks with filtering options
 * @param filter Task filtering criteria
 * @param page Page number (1-based)
 * @param pageSize Number of items per page
 * @returns Promise resolving to paginated task list
 */
export async function getTasks(
  filter: ITaskFilter = {},
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<ITask>> {
  // Sanitize filter parameters
  const sanitizedFilter = {
    ...filter,
    searchTerm: filter.searchTerm ? sanitizeHtml(filter.searchTerm, { allowedTags: [] }) : undefined
  };

  // Construct query parameters
  const params = {
    ...sanitizedFilter,
    page,
    pageSize
  };

  return apiService.get<ITask[]>(TASKS_API_PATH, params, {
    timeout: API_TIMEOUT,
    useCache: true,
    cacheTTL: CACHE_TTL
  });
}

/**
 * Creates a new task with validation and security measures
 * @param taskData Task creation data
 * @returns Promise resolving to created task
 */
export async function createTask(taskData: ITaskFormData): Promise<ApiResponse<ITask>> {
  // Sanitize user input
  const sanitizedData = {
    ...taskData,
    title: sanitizeHtml(taskData.title, { allowedTags: [] }),
    description: sanitizeHtml(taskData.description, { allowedTags: ['b', 'i', 'em', 'strong', 'p'] })
  };

  return apiService.post<ITask>(TASKS_API_PATH, sanitizedData, {
    timeout: API_TIMEOUT,
    useCache: false
  });
}

/**
 * Updates an existing task
 * @param taskId Task identifier
 * @param taskData Updated task data
 * @returns Promise resolving to updated task
 */
export async function updateTask(
  taskId: string,
  taskData: Partial<ITaskFormData>
): Promise<ApiResponse<ITask>> {
  // Sanitize user input
  const sanitizedData = {
    ...taskData,
    title: taskData.title ? sanitizeHtml(taskData.title, { allowedTags: [] }) : undefined,
    description: taskData.description
      ? sanitizeHtml(taskData.description, { allowedTags: ['b', 'i', 'em', 'strong', 'p'] })
      : undefined
  };

  return apiService.put<ITask>(`${TASKS_API_PATH}/${taskId}`, sanitizedData, {
    timeout: API_TIMEOUT,
    useCache: false
  });
}

/**
 * Retrieves a specific task by ID
 * @param taskId Task identifier
 * @returns Promise resolving to task details
 */
export async function getTaskById(taskId: string): Promise<ApiResponse<ITask>> {
  return apiService.get<ITask>(`${TASKS_API_PATH}/${taskId}`, {}, {
    timeout: API_TIMEOUT,
    useCache: true,
    cacheTTL: CACHE_TTL
  });
}

/**
 * Deletes a task by ID
 * @param taskId Task identifier
 * @returns Promise resolving to deletion confirmation
 */
export async function deleteTask(taskId: string): Promise<ApiResponse<void>> {
  return apiService.delete<void>(`${TASKS_API_PATH}/${taskId}`, {
    timeout: API_TIMEOUT,
    useCache: false
  });
}

/**
 * Updates task status
 * @param taskId Task identifier
 * @param status New task status
 * @returns Promise resolving to updated task
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ApiResponse<ITask>> {
  return apiService.put<ITask>(`${TASKS_API_PATH}/${taskId}/status`, { status }, {
    timeout: API_TIMEOUT,
    useCache: false
  });
}

/**
 * Adds attachments to a task
 * @param taskId Task identifier
 * @param files Array of files to attach
 * @returns Promise resolving to updated task
 */
export async function addTaskAttachments(
  taskId: string,
  files: File[]
): Promise<ApiResponse<ITask>> {
  const formData = new FormData();
  files.forEach(file => formData.append('attachments', file));

  return apiService.post<ITask>(`${TASKS_API_PATH}/${taskId}/attachments`, formData, {
    timeout: API_TIMEOUT * 2, // Extended timeout for file uploads
    useCache: false,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * Removes an attachment from a task
 * @param taskId Task identifier
 * @param attachmentId Attachment identifier
 * @returns Promise resolving to updated task
 */
export async function removeTaskAttachment(
  taskId: string,
  attachmentId: string
): Promise<ApiResponse<ITask>> {
  return apiService.delete<ITask>(
    `${TASKS_API_PATH}/${taskId}/attachments/${attachmentId}`,
    {
      timeout: API_TIMEOUT,
      useCache: false
    }
  );
}