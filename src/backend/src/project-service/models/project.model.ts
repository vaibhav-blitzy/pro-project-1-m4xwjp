/**
 * @packageDocumentation
 * @module ProjectService/Models
 * @version 1.0.0
 * 
 * Prisma model implementation for projects with enhanced support for 
 * milestones, resource allocation, and project hierarchy management.
 */

import { Prisma } from '@prisma/client'; // v5.0.0
import { 
  IProject, 
  ProjectStatus, 
  IMilestone, 
  IProjectResource,
  MilestoneStatus 
} from '../interfaces/project.interface';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

/**
 * Project model class implementing the IProject interface with enhanced
 * support for project hierarchy, milestones, and resource allocation.
 */
export class Project implements IProject {
  public id: string;
  public name: string;
  public description: string;
  public ownerId: string;
  public parentProjectId?: string;
  public startDate: Date;
  public endDate: Date;
  public status: ProjectStatus;
  public milestones: IMilestone[];
  public resourceAllocations: IProjectResource[];
  public metadata: Record<string, any>;
  public createdAt: Date;
  public updatedAt: Date;

  /**
   * Creates a new Project instance with comprehensive validation and defaults
   * 
   * @param data - Partial project data for initialization
   */
  constructor(data: Partial<IProject>) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.description = data.description || '';
    this.ownerId = data.ownerId || '';
    this.parentProjectId = data.parentProjectId;
    this.startDate = data.startDate || new Date();
    this.endDate = data.endDate || new Date();
    this.status = data.status || ProjectStatus.PLANNING;
    this.milestones = data.milestones || [];
    this.resourceAllocations = data.resourceAllocations || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Converts project instance to a plain JSON object with formatted dates
   * and nested object transformations
   * 
   * @returns Complete JSON representation of the project
   */
  public toJSON(): IProject {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      ownerId: this.ownerId,
      parentProjectId: this.parentProjectId,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      status: this.status,
      milestones: this.milestones.map(milestone => ({
        ...milestone,
        dueDate: milestone.dueDate.toISOString()
      })),
      resourceAllocations: this.resourceAllocations.map(resource => ({
        ...resource,
        startDate: resource.startDate.toISOString(),
        endDate: resource.endDate.toISOString()
      })),
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    } as unknown as IProject;
  }

  /**
   * Validates complete project data including relationships and constraints
   * 
   * @returns Boolean indicating validation result
   * @throws Error with validation details if validation fails
   */
  public validate(): boolean {
    // Required field validation
    if (!this.name || !this.ownerId || !this.startDate || !this.endDate) {
      throw new Error('Missing required project fields');
    }

    // Date range validation
    if (this.endDate <= this.startDate) {
      throw new Error('Project end date must be after start date');
    }

    // Status validation
    if (!Object.values(ProjectStatus).includes(this.status)) {
      throw new Error('Invalid project status');
    }

    // Validate project hierarchy
    if (this.parentProjectId === this.id) {
      throw new Error('Project cannot be its own parent');
    }

    // Validate milestones and resources
    return this.validateMilestones() && this.validateResourceAllocations();
  }

  /**
   * Validates milestone data including dates, dependencies, and completion status
   * 
   * @returns Boolean indicating milestone validation result
   * @throws Error with validation details if validation fails
   */
  public validateMilestones(): boolean {
    for (const milestone of this.milestones) {
      // Validate required fields
      if (!milestone.id || !milestone.name || !milestone.dueDate) {
        throw new Error('Missing required milestone fields');
      }

      // Validate milestone dates
      if (milestone.dueDate < this.startDate || milestone.dueDate > this.endDate) {
        throw new Error('Milestone due date must be within project timeline');
      }

      // Validate milestone status
      if (!Object.values(MilestoneStatus).includes(milestone.status)) {
        throw new Error('Invalid milestone status');
      }

      // Validate completion percentage
      if (milestone.completionPercentage < 0 || milestone.completionPercentage > 100) {
        throw new Error('Invalid milestone completion percentage');
      }
    }

    return true;
  }

  /**
   * Validates resource allocation data including availability and conflicts
   * 
   * @returns Boolean indicating resource validation result
   * @throws Error with validation details if validation fails
   */
  public validateResourceAllocations(): boolean {
    for (const resource of this.resourceAllocations) {
      // Validate required fields
      if (!resource.userId || !resource.role) {
        throw new Error('Missing required resource allocation fields');
      }

      // Validate allocation dates
      if (resource.startDate < this.startDate || resource.endDate > this.endDate) {
        throw new Error('Resource allocation must be within project timeline');
      }

      if (resource.endDate <= resource.startDate) {
        throw new Error('Resource allocation end date must be after start date');
      }

      // Validate allocation percentage
      if (resource.allocationPercentage <= 0 || resource.allocationPercentage > 100) {
        throw new Error('Invalid resource allocation percentage');
      }
    }

    // Check for allocation conflicts
    const userAllocations = new Map<string, number>();
    this.resourceAllocations.forEach(resource => {
      const currentAllocation = userAllocations.get(resource.userId) || 0;
      const newAllocation = currentAllocation + resource.allocationPercentage;
      if (newAllocation > 100) {
        throw new Error(`Resource ${resource.userId} is over-allocated`);
      }
      userAllocations.set(resource.userId, newAllocation);
    });

    return true;
  }
}

export default Project;