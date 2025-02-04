/**
 * @fileoverview Redux selectors for task management with memoized performance optimization
 * Implements type-safe selectors for task filtering, status tracking, and analytics
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.0
import { RootState } from '../index';
import { TaskState } from './task.types';

/**
 * Base selector to get the task slice from root state
 */
export const selectTaskState = (state: RootState): TaskState => state.task;

/**
 * Memoized selector for retrieving all tasks with type safety
 */
export const selectAllTasks = createSelector(
  [selectTaskState],
  (taskState) => taskState.tasks
);

/**
 * Memoized selector for retrieving the currently selected task
 */
export const selectSelectedTask = createSelector(
  [selectTaskState],
  (taskState) => taskState.selectedTask
);

/**
 * Memoized selector for retrieving task loading status
 */
export const selectTaskLoadingStatus = createSelector(
  [selectTaskState],
  (taskState) => taskState.status
);

/**
 * Memoized selector for retrieving task error state
 */
export const selectTaskError = createSelector(
  [selectTaskState],
  (taskState) => taskState.error
);

/**
 * Advanced memoized selector for filtering tasks based on multiple criteria
 */
export const selectFilteredTasks = createSelector(
  [selectAllTasks, (state: RootState) => state.task.filters],
  (tasks, filters) => {
    return tasks.filter(task => {
      // Apply search term filter
      if (filters.searchTerm && !task.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      // Apply priority filters
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }

      // Apply status filters
      if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
        return false;
      }

      // Apply assignee filters
      if (filters.assigneeIds.length > 0 && !filters.assigneeIds.includes(task.assigneeId)) {
        return false;
      }

      // Apply project filters
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(task.projectId)) {
        return false;
      }

      // Apply date range filters
      if (filters.dueDateFrom && new Date(task.dueDate) < new Date(filters.dueDateFrom)) {
        return false;
      }
      if (filters.dueDateTo && new Date(task.dueDate) > new Date(filters.dueDateTo)) {
        return false;
      }

      // Include task if it passes all filters
      return true;
    });
  }
);

/**
 * Memoized selector for retrieving task relationships and dependencies
 */
export const selectTaskRelationships = createSelector(
  [selectTaskState],
  (taskState) => taskState.taskRelationships
);

/**
 * Memoized selector for retrieving active collaborators on tasks
 */
export const selectActiveCollaborators = createSelector(
  [selectTaskState],
  (taskState) => taskState.activeCollaborators
);

/**
 * Memoized selector for computing task metrics and analytics
 */
export const selectTaskMetrics = createSelector(
  [selectAllTasks],
  (tasks) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const overdueTasks = tasks.filter(task => 
      new Date(task.dueDate) < new Date() && task.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      overdueRate: totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0
    };
  }
);

/**
 * Memoized selector for retrieving tasks by priority
 */
export const selectTasksByPriority = createSelector(
  [selectAllTasks],
  (tasks) => {
    return {
      high: tasks.filter(task => task.priority === 'high'),
      medium: tasks.filter(task => task.priority === 'medium'),
      low: tasks.filter(task => task.priority === 'low')
    };
  }
);

/**
 * Memoized selector for retrieving tasks by status
 */
export const selectTasksByStatus = createSelector(
  [selectAllTasks],
  (tasks) => {
    return {
      todo: tasks.filter(task => task.status === 'todo'),
      inProgress: tasks.filter(task => task.status === 'in_progress'),
      inReview: tasks.filter(task => task.status === 'in_review'),
      blocked: tasks.filter(task => task.status === 'blocked'),
      completed: tasks.filter(task => task.status === 'completed')
    };
  }
);