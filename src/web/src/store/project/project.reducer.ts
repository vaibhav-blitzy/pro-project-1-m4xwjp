/**
 * @fileoverview Redux reducer for managing project state with enhanced error handling and optimistic updates
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { ProjectState, LoadingState } from '../../types/store.types';
import { IProject } from '../../interfaces/project.interface';
import { ProjectTimeline, ProjectFilters, ProjectSorting, ProjectError } from './project.types';

/**
 * Initial state for the project slice with comprehensive state management
 */
const initialState: ProjectState = {
  projects: [],
  selectedProject: null,
  projectHierarchy: {},
  timeline: {
    startDate: new Date(),
    endDate: new Date(),
    milestones: []
  },
  filters: {
    status: [],
    priority: [],
    tags: []
  },
  sort: {
    field: 'createdAt',
    direction: 'desc'
  },
  status: 'idle',
  error: null,
  optimisticUpdates: [],
  version: 0
};

/**
 * Project slice with comprehensive state management and error handling
 */
const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Fetch projects actions
    fetchProjectsRequest: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    fetchProjectsSuccess: (state, action: PayloadAction<IProject[]>) => {
      state.status = 'succeeded';
      state.projects = action.payload;
      state.error = null;
      state.version++;
    },
    fetchProjectsFailure: (state, action: PayloadAction<ProjectError>) => {
      state.status = 'failed';
      state.error = action.payload;
    },

    // Create project actions with optimistic updates
    createProjectOptimistic: (state, action: PayloadAction<IProject>) => {
      const optimisticProject = {
        ...action.payload,
        id: `temp_${Date.now()}`,
        version: state.version + 1
      };
      state.projects.unshift(optimisticProject);
      state.optimisticUpdates.push({
        type: 'create',
        id: optimisticProject.id,
        data: optimisticProject
      });
      state.version++;
    },
    createProjectSuccess: (state, action: PayloadAction<IProject>) => {
      const tempId = state.optimisticUpdates.find(u => u.type === 'create')?.id;
      if (tempId) {
        state.projects = state.projects.map(project => 
          project.id === tempId ? action.payload : project
        );
        state.optimisticUpdates = state.optimisticUpdates.filter(u => u.id !== tempId);
      }
      state.error = null;
      state.version++;
    },
    createProjectFailure: (state, action: PayloadAction<ProjectError>) => {
      const failedUpdate = state.optimisticUpdates.find(u => u.type === 'create');
      if (failedUpdate) {
        state.projects = state.projects.filter(p => p.id !== failedUpdate.id);
        state.optimisticUpdates = state.optimisticUpdates.filter(u => u.id !== failedUpdate.id);
      }
      state.error = action.payload;
    },

    // Update project actions with version control
    updateProjectOptimistic: (state, action: PayloadAction<IProject>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        const originalProject = state.projects[index];
        state.optimisticUpdates.push({
          type: 'update',
          id: action.payload.id,
          data: originalProject
        });
        state.projects[index] = {
          ...action.payload,
          version: state.version + 1
        };
        state.version++;
      }
    },
    updateProjectSuccess: (state, action: PayloadAction<IProject>) => {
      const update = state.optimisticUpdates.find(u => 
        u.type === 'update' && u.id === action.payload.id
      );
      if (update) {
        state.optimisticUpdates = state.optimisticUpdates.filter(u => 
          !(u.type === 'update' && u.id === action.payload.id)
        );
      }
      state.error = null;
      state.version++;
    },
    updateProjectFailure: (state, action: PayloadAction<ProjectError>) => {
      const failedUpdate = state.optimisticUpdates.find(u => 
        u.type === 'update' && u.id === action.payload.id
      );
      if (failedUpdate) {
        const index = state.projects.findIndex(p => p.id === failedUpdate.id);
        if (index !== -1) {
          state.projects[index] = failedUpdate.data as IProject;
        }
        state.optimisticUpdates = state.optimisticUpdates.filter(u => 
          !(u.type === 'update' && u.id === failedUpdate.id)
        );
      }
      state.error = action.payload;
    },

    // Project selection
    selectProject: (state, action: PayloadAction<string | null>) => {
      state.selectedProject = action.payload ? 
        state.projects.find(p => p.id === action.payload) || null : 
        null;
    },

    // Project hierarchy management
    updateProjectHierarchy: (state, action: PayloadAction<Record<string, string[]>>) => {
      state.projectHierarchy = action.payload;
      state.version++;
    },

    // Timeline management
    updateTimeline: (state, action: PayloadAction<ProjectTimeline>) => {
      state.timeline = action.payload;
      state.version++;
    },

    // Filter management
    updateFilters: (state, action: PayloadAction<ProjectFilters>) => {
      state.filters = action.payload;
    },

    // Sort management
    updateSorting: (state, action: PayloadAction<ProjectSorting>) => {
      state.sort = action.payload;
    },

    // Error handling
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetState: () => initialState
  }
});

export const {
  fetchProjectsRequest,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  createProjectOptimistic,
  createProjectSuccess,
  createProjectFailure,
  updateProjectOptimistic,
  updateProjectSuccess,
  updateProjectFailure,
  selectProject,
  updateProjectHierarchy,
  updateTimeline,
  updateFilters,
  updateSorting,
  clearError,
  resetState
} = projectSlice.actions;

export default projectSlice.reducer;