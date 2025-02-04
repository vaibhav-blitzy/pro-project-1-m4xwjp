/**
 * @packageDocumentation
 * @module ProjectService/Interfaces
 * @version 1.0.0
 * 
 * Comprehensive interfaces and types for project entities in the task management system,
 * including project hierarchy, milestone tracking, and resource allocation.
 */

import { IBaseService } from '../../common/interfaces/base-service.interface';

/**
 * Enumeration of possible project lifecycle states with enhanced status tracking
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  BLOCKED = 'BLOCKED',
  AT_RISK = 'AT_RISK',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Enumeration of milestone completion states
 */
export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  BLOCKED = 'BLOCKED'
}

/**
 * Interface defining project milestone structure for tracking key project objectives
 */
export interface IMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  status: MilestoneStatus;
  completionPercentage: number;
}

/**
 * Interface defining resource allocation for projects including time-based assignments
 */
export interface IProjectResource {
  userId: string;
  role: string;
  allocationPercentage: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Enhanced interface defining the complete structure of a project entity
 * with support for hierarchy, resource management, and metadata
 */
export interface IProject {
  /** Unique identifier for the project */
  id: string;
  /** Project name */
  name: string;
  /** Detailed project description */
  description: string;
  /** ID of the project owner/manager */
  ownerId: string;
  /** Optional parent project ID for hierarchical structure */
  parentProjectId?: string;
  /** Project start date */
  startDate: Date;
  /** Project end date */
  endDate: Date;
  /** Current project status */
  status: ProjectStatus;
  /** Array of project milestones */
  milestones: IMilestone[];
  /** Array of resource allocations */
  resourceAllocations: IProjectResource[];
  /** Additional project metadata */
  metadata: Record<string, any>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Enhanced service interface for comprehensive project management operations
 * extending the base service interface with project-specific functionality
 */
export interface IProjectService extends IBaseService<IProject> {
  /**
   * Retrieves all projects owned by a specific user
   * 
   * @param ownerId - ID of the project owner
   * @returns Promise resolving to list of owned projects
   */
  findByOwnerId(ownerId: string): Promise<IProject[]>;

  /**
   * Retrieves complete project hierarchy tree starting from a root project
   * 
   * @param rootProjectId - ID of the root project
   * @returns Promise resolving to hierarchical list of projects
   */
  getProjectHierarchy(rootProjectId: string): Promise<IProject[]>;

  /**
   * Updates project status with optional status note
   * 
   * @param id - Project ID
   * @param status - New project status
   * @param statusNote - Optional note explaining status change
   * @returns Promise resolving to updated project
   */
  updateStatus(
    id: string,
    status: ProjectStatus,
    statusNote?: string
  ): Promise<IProject>;

  /**
   * Updates project milestones with validation
   * 
   * @param projectId - Project ID
   * @param milestones - Array of updated milestones
   * @returns Promise resolving to updated project
   */
  updateMilestones(
    projectId: string,
    milestones: IMilestone[]
  ): Promise<IProject>;

  /**
   * Assigns or updates resource allocations for a project
   * 
   * @param projectId - Project ID
   * @param resources - Array of resource allocations
   * @returns Promise resolving to updated project
   */
  assignResources(
    projectId: string,
    resources: IProjectResource[]
  ): Promise<IProject>;
}