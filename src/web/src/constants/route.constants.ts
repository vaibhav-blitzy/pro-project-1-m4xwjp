/**
 * Application route constants and types for client-side routing
 * @version 1.0.0
 */

/**
 * Type definitions for authentication related routes
 */
export interface AuthRoutes {
  BASE: string;
  LOGIN: string;
  REGISTER: string;
  FORGOT_PASSWORD: string;
  RESET_PASSWORD: string;
  SSO: string;
  CALLBACK: string;
}

/**
 * Type definitions for dashboard related routes
 */
export interface DashboardRoutes {
  BASE: string;
  OVERVIEW: string;
  ANALYTICS: string;
  REPORTS: string;
}

/**
 * Type definitions for project related routes
 */
export interface ProjectRoutes {
  BASE: string;
  LIST: string;
  CREATE: string;
  DETAILS: string;
  EDIT: string;
  TIMELINE: string;
  MEMBERS: string;
  SETTINGS: string;
}

/**
 * Type definitions for task related routes
 */
export interface TaskRoutes {
  BASE: string;
  LIST: string;
  CREATE: string;
  DETAILS: string;
  EDIT: string;
  BOARD: string;
  TIMELINE: string;
  CALENDAR: string;
  SEARCH: string;
}

/**
 * Type definitions for settings related routes
 */
export interface SettingRoutes {
  BASE: string;
  PROFILE: string;
  ACCOUNT: string;
  NOTIFICATIONS: string;
  SECURITY: string;
  PREFERENCES: string;
  INTEGRATIONS: string;
}

/**
 * Type definitions for error related routes
 */
export interface ErrorRoutes {
  NOT_FOUND: string;
  SERVER_ERROR: string;
  FORBIDDEN: string;
  UNAUTHORIZED: string;
}

/**
 * Type definition for the complete route constants object
 */
export interface RouteConstants {
  BASE: string;
  AUTH: AuthRoutes;
  DASHBOARD: DashboardRoutes;
  PROJECTS: ProjectRoutes;
  TASKS: TaskRoutes;
  SETTINGS: SettingRoutes;
  ERROR: ErrorRoutes;
}

/**
 * Application-wide route constants
 */
export const ROUTES: RouteConstants = {
  BASE: '/',
  AUTH: {
    BASE: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password/:token',
    SSO: '/auth/sso/:provider',
    CALLBACK: '/auth/callback/:provider'
  },
  DASHBOARD: {
    BASE: '/dashboard',
    OVERVIEW: '/dashboard/overview',
    ANALYTICS: '/dashboard/analytics',
    REPORTS: '/dashboard/reports'
  },
  PROJECTS: {
    BASE: '/projects',
    LIST: '/projects',
    CREATE: '/projects/create',
    DETAILS: '/projects/:id',
    EDIT: '/projects/:id/edit',
    TIMELINE: '/projects/:id/timeline',
    MEMBERS: '/projects/:id/members',
    SETTINGS: '/projects/:id/settings'
  },
  TASKS: {
    BASE: '/tasks',
    LIST: '/tasks',
    CREATE: '/tasks/create',
    DETAILS: '/tasks/:id',
    EDIT: '/tasks/:id/edit',
    BOARD: '/tasks/board',
    TIMELINE: '/tasks/timeline',
    CALENDAR: '/tasks/calendar',
    SEARCH: '/tasks/search'
  },
  SETTINGS: {
    BASE: '/settings',
    PROFILE: '/settings/profile',
    ACCOUNT: '/settings/account',
    NOTIFICATIONS: '/settings/notifications',
    SECURITY: '/settings/security',
    PREFERENCES: '/settings/preferences',
    INTEGRATIONS: '/settings/integrations'
  },
  ERROR: {
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
    FORBIDDEN: '/403',
    UNAUTHORIZED: '/401'
  }
} as const;

/**
 * Type definitions for route title constants
 */
export interface AuthTitles {
  LOGIN: string;
  REGISTER: string;
  FORGOT_PASSWORD: string;
  RESET_PASSWORD: string;
  SSO: string;
  CALLBACK: string;
}

export interface DashboardTitles {
  OVERVIEW: string;
  ANALYTICS: string;
  REPORTS: string;
}

export interface ProjectTitles {
  LIST: string;
  CREATE: string;
  DETAILS: string;
  EDIT: string;
  TIMELINE: string;
  MEMBERS: string;
  SETTINGS: string;
}

export interface TaskTitles {
  LIST: string;
  CREATE: string;
  DETAILS: string;
  EDIT: string;
  BOARD: string;
  TIMELINE: string;
  CALENDAR: string;
  SEARCH: string;
}

export interface SettingTitles {
  PROFILE: string;
  ACCOUNT: string;
  NOTIFICATIONS: string;
  SECURITY: string;
  PREFERENCES: string;
  INTEGRATIONS: string;
}

export interface ErrorTitles {
  NOT_FOUND: string;
  SERVER_ERROR: string;
  FORBIDDEN: string;
  UNAUTHORIZED: string;
}

export interface RouteTitleConstants {
  AUTH: AuthTitles;
  DASHBOARD: DashboardTitles;
  PROJECTS: ProjectTitles;
  TASKS: TaskTitles;
  SETTINGS: SettingTitles;
  ERROR: ErrorTitles;
}

/**
 * Application-wide route title constants
 */
export const ROUTE_TITLES: RouteTitleConstants = {
  AUTH: {
    LOGIN: 'Sign In',
    REGISTER: 'Create Account',
    FORGOT_PASSWORD: 'Reset Password',
    RESET_PASSWORD: 'Set New Password',
    SSO: 'Single Sign-On',
    CALLBACK: 'Completing Authentication'
  },
  DASHBOARD: {
    OVERVIEW: 'Dashboard',
    ANALYTICS: 'Performance Analytics',
    REPORTS: 'Custom Reports'
  },
  PROJECTS: {
    LIST: 'All Projects',
    CREATE: 'Create New Project',
    DETAILS: 'Project Overview',
    EDIT: 'Edit Project Details',
    TIMELINE: 'Project Timeline',
    MEMBERS: 'Project Team',
    SETTINGS: 'Project Settings'
  },
  TASKS: {
    LIST: 'All Tasks',
    CREATE: 'Create New Task',
    DETAILS: 'Task Details',
    EDIT: 'Edit Task',
    BOARD: 'Task Board',
    TIMELINE: 'Task Timeline',
    CALENDAR: 'Task Calendar',
    SEARCH: 'Search Tasks'
  },
  SETTINGS: {
    PROFILE: 'User Profile',
    ACCOUNT: 'Account Settings',
    NOTIFICATIONS: 'Notification Preferences',
    SECURITY: 'Security Settings',
    PREFERENCES: 'User Preferences',
    INTEGRATIONS: 'App Integrations'
  },
  ERROR: {
    NOT_FOUND: 'Page Not Found',
    SERVER_ERROR: 'Server Error',
    FORBIDDEN: 'Access Denied',
    UNAUTHORIZED: 'Authentication Required'
  }
} as const;