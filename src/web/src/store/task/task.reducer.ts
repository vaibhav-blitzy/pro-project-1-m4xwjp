/**
 * @fileoverview Redux reducer for task management with normalized state structure
 * Implements optimized state updates, real-time collaboration, and comprehensive filtering
 * @version 1.0.0
 */

import { createSlice, createSelector } from '@reduxjs/toolkit'; // v1.9.0
import { TaskState, ITask } from './task.types';

/**
 * Initial state for task management with normalized structure
 */
const initialState: TaskState = {
  tasks: {},
  selectedTask: null,
  status: 'idle',
  error: null,
  taskRelationships: {},
  activeCollaborators: [],
  filters: {
    searchTerm: null,
    priority: null,
    status: null,
    assigneeId: null,
    projectId: null,
    dueDateFrom: null,
    dueDateTo: null
  },
  optimisticUpdates: []
};

/**
 * Task management slice with comprehensive state handling
 */
const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    /**
     * Set tasks with normalized state structure
     */
    setTasks: (state, action) => {
      const tasks = action.payload;
      state.tasks = tasks.reduce((acc: Record<string, ITask>, task: ITask) => {
        acc[task.id] = task;
        return acc;
      }, {});
      state.status = 'succeeded';
      state.error = null;
    },

    /**
     * Add or update a single task with optimistic updates
     */
    upsertTask: (state, action) => {
      const task = action.payload;
      state.tasks[task.id] = {
        ...state.tasks[task.id],
        ...task
      };
      
      // Update relationships if present
      if (task.parentTaskId) {
        state.taskRelationships[task.id] = state.taskRelationships[task.id] || [];
        if (!state.taskRelationships[task.id].includes(task.parentTaskId)) {
          state.taskRelationships[task.id].push(task.parentTaskId);
        }
      }
    },

    /**
     * Remove a task and its relationships
     */
    removeTask: (state, action) => {
      const taskId = action.payload;
      delete state.tasks[taskId];
      delete state.taskRelationships[taskId];
      
      // Clean up relationships referencing this task
      Object.keys(state.taskRelationships).forEach(key => {
        state.taskRelationships[key] = state.taskRelationships[key].filter(
          id => id !== taskId
        );
      });
    },

    /**
     * Set the currently selected task
     */
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },

    /**
     * Update task relationships
     */
    updateTaskRelationships: (state, action) => {
      const { taskId, relationships } = action.payload;
      state.taskRelationships[taskId] = relationships;
    },

    /**
     * Update active collaborators for real-time features
     */
    updateActiveCollaborators: (state, action) => {
      state.activeCollaborators = action.payload;
    },

    /**
     * Update task filters
     */
    setTaskFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },

    /**
     * Set loading state
     */
    setLoadingState: (state, action) => {
      state.status = action.payload;
    },

    /**
     * Set error state with details
     */
    setError: (state, action) => {
      state.error = action.payload;
      state.status = 'failed';
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    }
  }
});

/**
 * Memoized selector for filtered tasks
 */
export const selectFilteredTasks = createSelector(
  [(state: { task: TaskState }) => state.task.tasks,
   (state: { task: TaskState }) => state.task.filters],
  (tasks, filters) => {
    return Object.values(tasks).filter(task => {
      if (filters.searchTerm && !task.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
        return false;
      }
      if (filters.projectId && task.projectId !== filters.projectId) {
        return false;
      }
      if (filters.dueDateFrom && new Date(task.dueDate) < new Date(filters.dueDateFrom)) {
        return false;
      }
      if (filters.dueDateTo && new Date(task.dueDate) > new Date(filters.dueDateTo)) {
        return false;
      }
      return true;
    });
  }
);

/**
 * Selector for task relationships
 */
export const selectTaskRelationships = (state: { task: TaskState }) => 
  state.task.taskRelationships;

/**
 * Selector for active collaborators
 */
export const selectActiveCollaborators = (state: { task: TaskState }) => 
  state.task.activeCollaborators;

export const { 
  setTasks,
  upsertTask,
  removeTask,
  setSelectedTask,
  updateTaskRelationships,
  updateActiveCollaborators,
  setTaskFilters,
  setLoadingState,
  setError,
  clearError
} = taskSlice.actions;

export default taskSlice.reducer;