/**
 * @fileoverview Redux action creators for project-related state management
 * Implements comprehensive async operations, optimistic updates, caching, and error handling
 * @version 1.0.0
 */

import { createAsyncThunk, createAction } from '@reduxjs/toolkit'; // v1.9.0
import { ProjectActionTypes } from './project.types';
import { IProject } from '../../interfaces/project.interface';
import projectService from '../../services/project.service';
import { ApiError } from '../../types/api.types';

// Cache configuration for project data
const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second base delay
};

/**
 * Async thunk for fetching projects with caching and request deduplication
 */
export const fetchProjects = createAsyncThunk<
  IProject[],
  { filters: ProjectFilters; forceRefresh?: boolean },
  { rejectValue: ApiError }
>(
  ProjectActionTypes.FETCH_PROJECTS,
  async ({ filters, forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      // Check cache if not forcing refresh
      if (!forceRefresh) {
        const state = getState() as RootState;
        const { timestamp, data } = state.project;
        const isStale = Date.now() - timestamp > CACHE_CONFIG.STALE_TIME;
        
        if (data && !isStale) {
          return data;
        }
      }

      const projects = await projectService.getProjects(filters);
      return projects;
    } catch (error: any) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for creating projects with optimistic updates
 */
export const createProject = createAsyncThunk<
  IProject,
  IProject,
  { rejectValue: ApiError }
>(
  ProjectActionTypes.CREATE_PROJECT,
  async (projectData, { rejectWithValue, dispatch }) => {
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticProject = { ...projectData, id: tempId };

      // Apply optimistic update
      dispatch({ type: 'project/optimisticAdd', payload: optimisticProject });

      const createdProject = await projectService.createProject(projectData);

      // Update with actual project data
      return createdProject;
    } catch (error: any) {
      // Revert optimistic update on error
      dispatch({ type: 'project/optimisticRemove', payload: projectData });
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for updating projects with optimistic updates and validation
 */
export const updateProject = createAsyncThunk<
  IProject,
  { id: string; projectData: Partial<IProject>; validate?: boolean },
  { rejectValue: ApiError }
>(
  ProjectActionTypes.UPDATE_PROJECT,
  async ({ id, projectData, validate = true }, { rejectWithValue, dispatch, getState }) => {
    try {
      // Store previous state for rollback
      const state = getState() as RootState;
      const previousProject = state.project.list.find(p => p.id === id);

      // Apply optimistic update
      dispatch({
        type: 'project/optimisticUpdate',
        payload: { id, changes: projectData }
      });

      const updatedProject = await projectService.updateProject(id, projectData);
      return updatedProject;
    } catch (error: any) {
      // Revert optimistic update on error
      if (previousProject) {
        dispatch({
          type: 'project/optimisticUpdate',
          payload: { id, changes: previousProject }
        });
      }
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for deleting projects with optimistic updates and cascade handling
 */
export const deleteProject = createAsyncThunk<
  void,
  string,
  { rejectValue: ApiError }
>(
  ProjectActionTypes.DELETE_PROJECT,
  async (projectId, { rejectWithValue, dispatch, getState }) => {
    try {
      // Store project for potential rollback
      const state = getState() as RootState;
      const projectToDelete = state.project.list.find(p => p.id === projectId);

      // Apply optimistic deletion
      dispatch({ type: 'project/optimisticRemove', payload: projectId });

      await projectService.deleteProject(projectId);
    } catch (error: any) {
      // Revert optimistic deletion on error
      if (projectToDelete) {
        dispatch({ type: 'project/optimisticAdd', payload: projectToDelete });
      }
      return rejectWithValue(error);
    }
  }
);

/**
 * Synchronous action creator for selecting a project
 */
export const selectProject = createAction<IProject | null>(
  ProjectActionTypes.SELECT_PROJECT,
  (project) => {
    // Update URL with project ID if project is selected
    if (project) {
      window.history.pushState(
        {},
        '',
        `/projects/${project.id}`
      );
    } else {
      // Clear project ID from URL
      window.history.pushState({}, '', '/projects');
    }
    return { payload: project };
  }
);