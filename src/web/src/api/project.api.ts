/**
 * @fileoverview Project API module for handling project-related HTTP requests
 * Implements comprehensive project management endpoints with HAL+JSON format
 * @version 1.0.0
 */

import { apiService } from '../services/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { IProject, IProjectTimeline } from '../interfaces/project.interface';
import type { ApiResponse, PaginatedResponse } from '../types/api.types';

/**
 * Retrieves all projects with optional filtering, pagination and HAL+JSON format
 * @param params Query parameters for filtering and pagination
 * @returns Promise resolving to paginated projects list
 */
export async function getAllProjects(
  params: Record<string, any> = {}
): Promise<PaginatedResponse<IProject>> {
  return apiService.get<IProject[]>(API_ENDPOINTS.PROJECTS.BASE, {
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
      sortBy: params.sortBy || 'createdAt',
      sortOrder: params.sortOrder || 'desc',
      status: params.status,
      priority: params.priority,
      search: params.search,
      ...params.filters
    }
  });
}

/**
 * Retrieves a specific project by ID with enhanced error handling
 * @param id Project unique identifier
 * @returns Promise resolving to project details
 */
export async function getProjectById(id: string): Promise<ApiResponse<IProject>> {
  return apiService.get<IProject>(
    API_ENDPOINTS.PROJECTS.DETAILS.replace(':id', id),
    {
      headers: {
        'Cache-Control': 'no-cache'
      }
    }
  );
}

/**
 * Creates a new project with comprehensive validation
 * @param projectData Project creation payload
 * @returns Promise resolving to created project
 */
export async function createProject(
  projectData: Partial<IProject>
): Promise<ApiResponse<IProject>> {
  return apiService.post<IProject>(
    API_ENDPOINTS.PROJECTS.BASE,
    projectData,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/hal+json'
      }
    }
  );
}

/**
 * Updates an existing project with partial updates support
 * @param id Project unique identifier
 * @param projectData Project update payload
 * @returns Promise resolving to updated project
 */
export async function updateProject(
  id: string,
  projectData: Partial<IProject>
): Promise<ApiResponse<IProject>> {
  return apiService.put<IProject>(
    API_ENDPOINTS.PROJECTS.DETAILS.replace(':id', id),
    projectData,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/hal+json',
        'If-Match': projectData.version?.toString() // Optimistic locking
      }
    }
  );
}

/**
 * Deletes a project with cascade options
 * @param id Project unique identifier
 * @returns Promise resolving to void on success
 */
export async function deleteProject(
  id: string
): Promise<ApiResponse<void>> {
  return apiService.delete<void>(
    API_ENDPOINTS.PROJECTS.DETAILS.replace(':id', id),
    {
      params: {
        cascade: true // Enable cascade deletion
      },
      headers: {
        'Accept': 'application/hal+json'
      }
    }
  );
}

/**
 * Retrieves project timeline data with milestone tracking
 * @param id Project unique identifier
 * @returns Promise resolving to project timeline
 */
export async function getProjectTimeline(
  id: string
): Promise<ApiResponse<IProjectTimeline>> {
  return apiService.get<IProjectTimeline>(
    API_ENDPOINTS.PROJECTS.TIMELINE.replace(':id', id),
    {
      headers: {
        'Accept': 'application/hal+json'
      }
    }
  );
}

/**
 * Updates project members with role assignments
 * @param id Project unique identifier
 * @param memberUpdates Member role updates
 * @returns Promise resolving to updated project
 */
export async function updateProjectMembers(
  id: string,
  memberUpdates: Array<{ userId: string; role: string }>
): Promise<ApiResponse<IProject>> {
  return apiService.put<IProject>(
    API_ENDPOINTS.PROJECTS.MEMBERS.replace(':id', id),
    memberUpdates,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/hal+json'
      }
    }
  );
}

/**
 * Retrieves project analytics and metrics
 * @param id Project unique identifier
 * @param timeRange Optional time range for metrics
 * @returns Promise resolving to project analytics
 */
export async function getProjectAnalytics(
  id: string,
  timeRange?: { start: Date; end: Date }
): Promise<ApiResponse<any>> {
  return apiService.get(
    API_ENDPOINTS.PROJECTS.ANALYTICS.replace(':id', id),
    {
      params: timeRange,
      headers: {
        'Accept': 'application/hal+json'
      }
    }
  );
}

/**
 * Updates project settings and configurations
 * @param id Project unique identifier
 * @param settings Project settings update
 * @returns Promise resolving to updated project
 */
export async function updateProjectSettings(
  id: string,
  settings: Record<string, any>
): Promise<ApiResponse<IProject>> {
  return apiService.put<IProject>(
    API_ENDPOINTS.PROJECTS.SETTINGS.replace(':id', id),
    settings,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/hal+json'
      }
    }
  );
}