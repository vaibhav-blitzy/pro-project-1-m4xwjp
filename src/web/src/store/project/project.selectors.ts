/**
 * @fileoverview Redux selectors for project state management
 * Implements memoized selectors for accessing and deriving project state data
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.0
import { RootState } from '../../types/store.types';
import { ProjectState } from './project.types';

/**
 * Base selector to access the project state slice
 */
export const selectProjectState = (state: RootState): ProjectState => state.project;

/**
 * Memoized selector for accessing the list of projects
 */
export const selectProjects = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.list
);

/**
 * Memoized selector for accessing the currently selected project
 */
export const selectSelectedProject = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.selectedProject
);

/**
 * Memoized selector for accessing the project loading state
 */
export const selectProjectLoadingState = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.status
);

/**
 * Memoized selector for accessing project error state
 */
export const selectProjectError = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.error
);

/**
 * Memoized selector for accessing project hierarchy
 */
export const selectProjectHierarchy = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.projectHierarchy
);

/**
 * Memoized selector for accessing project timeline data
 */
export const selectProjectTimeline = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.timeline
);

/**
 * Memoized selector for accessing active project filters
 */
export const selectProjectFilters = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.filters
);

/**
 * Memoized selector for accessing project sorting configuration
 */
export const selectProjectSorting = createSelector(
  [selectProjectState],
  (projectState: ProjectState) => projectState.sorting
);

/**
 * Memoized selector for filtered and sorted projects
 */
export const selectFilteredProjects = createSelector(
  [selectProjects, selectProjectFilters, selectProjectSorting],
  (projects, filters, sorting) => {
    let filteredProjects = [...projects];

    // Apply filters
    if (filters.status.length > 0) {
      filteredProjects = filteredProjects.filter(project => 
        filters.status.includes(project.status)
      );
    }

    if (filters.priority.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        filters.priority.includes(project.priority)
      );
    }

    if (filters.tags.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        project.tags.some(tag => filters.tags.includes(tag))
      );
    }

    // Apply sorting
    return filteredProjects.sort((a, b) => {
      const aValue = a[sorting.field as keyof typeof a];
      const bValue = b[sorting.field as keyof typeof b];
      
      if (sorting.order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  }
);

/**
 * Memoized selector for project timeline with milestones
 */
export const selectProjectTimelineWithMilestones = createSelector(
  [selectProjectTimeline, selectProjects],
  (timeline, projects) => ({
    ...timeline,
    projects: projects.map(project => ({
      id: project.id,
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      progress: project.progress
    }))
  })
);

/**
 * Memoized selector for project hierarchy with details
 */
export const selectProjectHierarchyWithDetails = createSelector(
  [selectProjectHierarchy, selectProjects],
  (hierarchy, projects) => {
    const projectMap = new Map(projects.map(p => [p.id, p]));
    
    return Object.entries(hierarchy).reduce((acc, [parentId, childIds]) => {
      acc[parentId] = childIds.map(id => ({
        id,
        name: projectMap.get(id)?.name || '',
        status: projectMap.get(id)?.status || '',
        progress: projectMap.get(id)?.progress || 0
      }));
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; status: string; progress: number }>>);
  }
);