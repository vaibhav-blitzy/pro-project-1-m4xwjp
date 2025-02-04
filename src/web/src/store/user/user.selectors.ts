/**
 * @fileoverview Redux selectors for user state management with memoization
 * Implements type-safe selectors for accessing and deriving user state data
 * with performance optimization through memoization
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.0
import type { RootState } from '../index';
import type { UserState } from './user.types';
import { UserRole } from '../../interfaces/user.interface';

/**
 * Base selector to get the user slice from root state
 * Provides type-safe access to user state
 */
export const selectUserState = (state: RootState): UserState => state.user;

/**
 * Memoized selector to get array of all users
 * Optimizes performance by preventing unnecessary re-renders
 */
export const selectUsers = createSelector(
  [selectUserState],
  (userState): UserState['users'] => userState.users
);

/**
 * Memoized selector to get currently selected user
 * Implements proper null safety
 */
export const selectSelectedUser = createSelector(
  [selectUserState],
  (userState): UserState['selectedUser'] => userState.selectedUser
);

/**
 * Memoized selector to get current loading status
 * Provides type-safe access to loading state
 */
export const selectUserStatus = createSelector(
  [selectUserState],
  (userState): UserState['status'] => userState.status
);

/**
 * Memoized selector to get current error state
 * Implements proper null handling for error messages
 */
export const selectUserError = createSelector(
  [selectUserState],
  (userState): UserState['error'] => userState.error
);

/**
 * Memoized selector to get current pagination state
 * Provides access to pagination information
 */
export const selectUserPagination = createSelector(
  [selectUserState],
  (userState): UserState['pagination'] => userState.pagination
);

/**
 * Memoized selector to get current filter state
 * Provides access to active filters
 */
export const selectUserFilters = createSelector(
  [selectUserState],
  (userState): UserState['filters'] => userState.filters
);

/**
 * Memoized selector to get current search query
 * Provides access to search state
 */
export const selectUserSearchQuery = createSelector(
  [selectUserState],
  (userState): UserState['searchQuery'] => userState.searchQuery
);

/**
 * Memoized selector to get current sort order
 * Provides access to sorting configuration
 */
export const selectUserSortOrder = createSelector(
  [selectUserState],
  (userState): UserState['sortOrder'] => userState.sortOrder
);

/**
 * Memoized selector to filter users by role
 * Optimizes performance for role-based filtering
 */
export const selectUsersByRole = createSelector(
  [selectUsers, (state: RootState, role: UserRole) => role],
  (users, role) => users.filter(user => user.role === role)
);

/**
 * Memoized selector to get active users
 * Filters users by active status
 */
export const selectActiveUsers = createSelector(
  [selectUsers],
  (users) => users.filter(user => user.status === 'ACTIVE')
);

/**
 * Memoized selector to get users by department
 * Filters users based on department assignment
 */
export const selectUsersByDepartment = createSelector(
  [selectUsers, (state: RootState, department: string) => department],
  (users, department) => users.filter(user => user.department === department)
);

/**
 * Memoized selector to get users by team
 * Filters users based on team membership
 */
export const selectUsersByTeam = createSelector(
  [selectUsers, (state: RootState, team: string) => team],
  (users, team) => users.filter(user => user.teams?.includes(team))
);

/**
 * Memoized selector to get filtered and sorted users
 * Combines multiple filter criteria with sorting
 */
export const selectFilteredAndSortedUsers = createSelector(
  [
    selectUsers,
    selectUserFilters,
    selectUserSearchQuery,
    selectUserSortOrder
  ],
  (users, filters, searchQuery, sortOrder) => {
    let filteredUsers = [...users];

    // Apply role filters
    if (filters.role?.length) {
      filteredUsers = filteredUsers.filter(user => 
        filters.role.includes(user.role)
      );
    }

    // Apply status filters
    if (filters.status?.length) {
      filteredUsers = filteredUsers.filter(user => 
        filters.status.includes(user.status)
      );
    }

    // Apply department filters
    if (filters.department?.length) {
      filteredUsers = filteredUsers.filter(user => 
        filters.department.includes(user.department)
      );
    }

    // Apply team filters
    if (filters.teams?.length) {
      filteredUsers = filteredUsers.filter(user => 
        user.teams?.some(team => filters.teams.includes(team))
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Apply date range filter if present
    if (filters.dateRange) {
      filteredUsers = filteredUsers.filter(user => {
        const joinDate = new Date(user.joinDate);
        return joinDate >= filters.dateRange.start && 
               joinDate <= filters.dateRange.end;
      });
    }

    // Apply sorting
    filteredUsers.sort((a, b) => {
      const compareResult = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? compareResult : -compareResult;
    });

    return filteredUsers;
  }
);