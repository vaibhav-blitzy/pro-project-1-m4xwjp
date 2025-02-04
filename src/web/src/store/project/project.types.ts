/**
 * @fileoverview TypeScript types and action types for project slice of Redux store
 * Implements comprehensive project state management, hierarchy tracking, and timeline visualization
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { IProject } from '../../interfaces/project.interface';
import { AsyncState } from '../../types/store.types';

/**
 * Interface for project timeline management with milestone tracking
 */
export interface ProjectTimeline {
  /** Timeline start date */
  startDate: Date;
  /** Timeline end date */
  endDate: Date;
  /** Array of project milestones */
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    status: string;
  }>;
}

/**
 * Interface for project filtering options
 */
export interface ProjectFilters {
  /** Filter by status */
  status: string[];
  /** Filter by priority */
  priority: string[];
  /** Filter by tags */
  tags: string[];
}

/**
 * Interface for project sorting configuration
 */
export interface ProjectSorting {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  order: 'asc' | 'desc';
}

/**
 * Interface for detailed project error handling
 */
export interface ProjectError {
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Field-specific error messages */
  fieldErrors: Record<string, string>;
}

/**
 * Comprehensive project slice state interface
 */
export interface ProjectState extends AsyncState {
  /** List of all projects */
  list: IProject[];
  /** Currently selected project */
  selectedProject: IProject | null;
  /** Project hierarchy mapping */
  projectHierarchy: Record<string, string[]>;
  /** Project timeline data */
  timeline: ProjectTimeline;
  /** Active filters */
  filters: ProjectFilters;
  /** Current sorting configuration */
  sorting: ProjectSorting;
  /** Error state */
  error: ProjectError | null;
}

/**
 * Enumeration of all project action types
 */
export enum ProjectActionTypes {
  FETCH_PROJECTS = 'project/fetchProjects',
  CREATE_PROJECT = 'project/createProject',
  UPDATE_PROJECT = 'project/updateProject',
  DELETE_PROJECT = 'project/deleteProject',
  SELECT_PROJECT = 'project/selectProject',
  UPDATE_HIERARCHY = 'project/updateHierarchy',
  UPDATE_TIMELINE = 'project/updateTimeline',
  UPDATE_FILTERS = 'project/updateFilters',
  UPDATE_SORTING = 'project/updateSorting'
}

/**
 * Union type of all project action interfaces
 */
export type ProjectActions =
  | PayloadAction<IProject[]> // Fetch projects
  | PayloadAction<IProject> // Create/Update project
  | PayloadAction<string> // Delete project
  | PayloadAction<IProject | null> // Select project
  | PayloadAction<Record<string, string[]>> // Update hierarchy
  | PayloadAction<ProjectTimeline> // Update timeline
  | PayloadAction<ProjectFilters> // Update filters
  | PayloadAction<ProjectSorting>; // Update sorting