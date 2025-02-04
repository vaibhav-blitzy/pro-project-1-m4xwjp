/**
 * @fileoverview Central icon system index implementing Material Design 3
 * @version 1.0.0
 */

import { SvgIcon } from '@mui/material'; // v5.14.0
import {
  // Navigation Icons
  Dashboard as MuiDashboardIcon,
  FolderOutlined as MuiProjectsIcon,
  AssignmentOutlined as MuiTasksIcon,
  Settings as MuiSettingsIcon,
  
  // Action Icons
  Add as MuiAddIcon,
  Edit as MuiEditIcon,
  Delete as MuiDeleteIcon,
  Save as MuiSaveIcon,
  
  // Status Icons
  CheckCircleOutline as MuiSuccessIcon,
  ErrorOutline as MuiErrorIcon,
  WarningAmber as MuiWarningIcon,
  InfoOutlined as MuiInfoIcon,
  
  // Task Icons
  PriorityHigh as MuiPriorityHighIcon,
  DragHandle as MuiPriorityMediumIcon,
  ArrowDownward as MuiPriorityLowIcon,
  AttachFile as MuiAttachmentIcon,
  
  // User Icons
  PersonOutline as MuiUserIcon,
  NotificationsOutlined as MuiNotificationIcon,
  ExitToApp as MuiLogoutIcon,
} from '@mui/icons-material'; // v5.14.0

// Navigation Icons with semantic names and ARIA labels
export const NavigationIcons = {
  DashboardIcon: (props: typeof SvgIcon) => (
    <MuiDashboardIcon {...props} aria-label="Dashboard" />
  ),
  ProjectsIcon: (props: typeof SvgIcon) => (
    <MuiProjectsIcon {...props} aria-label="Projects" />
  ),
  TasksIcon: (props: typeof SvgIcon) => (
    <MuiTasksIcon {...props} aria-label="Tasks" />
  ),
  SettingsIcon: (props: typeof SvgIcon) => (
    <MuiSettingsIcon {...props} aria-label="Settings" />
  ),
} as const;

// Action Icons for common operations
export const ActionIcons = {
  AddIcon: (props: typeof SvgIcon) => (
    <MuiAddIcon {...props} aria-label="Add new" />
  ),
  EditIcon: (props: typeof SvgIcon) => (
    <MuiEditIcon {...props} aria-label="Edit" />
  ),
  DeleteIcon: (props: typeof SvgIcon) => (
    <MuiDeleteIcon {...props} aria-label="Delete" />
  ),
  SaveIcon: (props: typeof SvgIcon) => (
    <MuiSaveIcon {...props} aria-label="Save" />
  ),
} as const;

// Status Icons with semantic colors
export const StatusIcons = {
  SuccessIcon: (props: typeof SvgIcon) => (
    <MuiSuccessIcon {...props} aria-label="Success" color="success" />
  ),
  ErrorIcon: (props: typeof SvgIcon) => (
    <MuiErrorIcon {...props} aria-label="Error" color="error" />
  ),
  WarningIcon: (props: typeof SvgIcon) => (
    <MuiWarningIcon {...props} aria-label="Warning" color="warning" />
  ),
  InfoIcon: (props: typeof SvgIcon) => (
    <MuiInfoIcon {...props} aria-label="Information" color="info" />
  ),
} as const;

// Task-specific Icons with priority indicators
export const TaskIcons = {
  PriorityHighIcon: (props: typeof SvgIcon) => (
    <MuiPriorityHighIcon {...props} aria-label="High priority" color="error" />
  ),
  PriorityMediumIcon: (props: typeof SvgIcon) => (
    <MuiPriorityMediumIcon {...props} aria-label="Medium priority" color="warning" />
  ),
  PriorityLowIcon: (props: typeof SvgIcon) => (
    <MuiPriorityLowIcon {...props} aria-label="Low priority" color="success" />
  ),
  AttachmentIcon: (props: typeof SvgIcon) => (
    <MuiAttachmentIcon {...props} aria-label="Attachment" />
  ),
} as const;

// User-related Icons
export const UserIcons = {
  UserIcon: (props: typeof SvgIcon) => (
    <MuiUserIcon {...props} aria-label="User profile" />
  ),
  NotificationIcon: (props: typeof SvgIcon) => (
    <MuiNotificationIcon {...props} aria-label="Notifications" />
  ),
  LogoutIcon: (props: typeof SvgIcon) => (
    <MuiLogoutIcon {...props} aria-label="Log out" />
  ),
} as const;

// Type definitions for icon categories
export type NavigationIconType = keyof typeof NavigationIcons;
export type ActionIconType = keyof typeof ActionIcons;
export type StatusIconType = keyof typeof StatusIcons;
export type TaskIconType = keyof typeof TaskIcons;
export type UserIconType = keyof typeof UserIcons;