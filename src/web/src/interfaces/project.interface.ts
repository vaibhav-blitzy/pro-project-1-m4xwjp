/**
 * @fileoverview TypeScript interfaces and types for project-related data structures
 * Implements comprehensive project management, timeline visualization, and milestone tracking
 * @version 1.0.0
 */

import { BaseEntity } from './common.interface';
import { IUser } from './user.interface';
import { Status } from '../types/common.types';

/**
 * Enumeration of project priority levels
 * Used for project prioritization and resource allocation
 */
export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Comprehensive interface for project management
 * Extends BaseEntity for common fields and versioning support
 */
export interface IProject extends BaseEntity {
  /** Project name */
  name: string;
  /** Detailed project description */
  description: string;
  /** Current project status */
  status: Status;
  /** Project priority level */
  priority: ProjectPriority;
  /** Project start date */
  startDate: Date;
  /** Project end date */
  endDate: Date;
  /** Project owner/manager */
  owner: IUser;
  /** Array of project team members */
  members: IUser[];
  /** Project completion progress (0-100) */
  progress: number;
  /** Project categorization tags */
  tags: string[];
}

/**
 * Interface for project timeline visualization and management
 * Supports comprehensive timeline tracking with milestones
 */
export interface IProjectTimeline {
  /** Associated project identifier */
  projectId: string;
  /** Timeline start date */
  startDate: Date;
  /** Timeline end date */
  endDate: Date;
  /** Array of project milestones */
  milestones: IMilestone[];
}

/**
 * Interface for project milestone tracking
 * Used for marking and tracking key project events and progress
 */
export interface IMilestone {
  /** Unique milestone identifier */
  id: string;
  /** Milestone title */
  title: string;
  /** Detailed milestone description */
  description: string;
  /** Milestone due date */
  dueDate: Date;
  /** Current milestone status */
  status: Status;
}