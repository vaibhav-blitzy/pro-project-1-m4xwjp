/**
 * @packageDocumentation
 * @module ProjectService/Repositories
 * @version 1.0.0
 * 
 * Enhanced repository implementation for project entities with support for
 * hierarchy management, resource allocation, and milestone tracking.
 */

import { PrismaClient, Prisma } from '@prisma/client'; // v5.0.0
import { IProject, ProjectStatus } from '../interfaces/project.interface';
import Project from '../models/project.model';

/**
 * Enhanced repository class for project entity operations with optimized
 * query performance and data partitioning support.
 */
export class ProjectRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pooling configuration
      connection: {
        pool: {
          min: 2,
          max: 10,
        },
      },
    });
  }

  /**
   * Retrieves all projects with enhanced filtering, pagination, and hierarchy support
   * 
   * @param options - Query options including pagination, filters, and sorting
   * @returns Promise resolving to list of projects with hierarchy information
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<IProject[]> {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const where: Prisma.ProjectWhereInput = {
      ...filters,
      deletedAt: null, // Soft delete filter
    };

    // Build optimized query with includes
    const projects = await this.prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        milestones: true,
        resourceAllocations: true,
        childProjects: {
          include: {
            milestones: true,
            resourceAllocations: true,
          },
        },
      },
    });

    // Transform to domain model with validation
    return projects.map(project => new Project(project).toJSON());
  }

  /**
   * Retrieves projects based on their position in the hierarchy
   * 
   * @param parentId - Optional parent project ID for hierarchy filtering
   * @returns Promise resolving to list of projects in hierarchy
   */
  async findByHierarchy(parentId?: string): Promise<IProject[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        parentProjectId: parentId,
        deletedAt: null,
      },
      include: {
        milestones: true,
        resourceAllocations: true,
        childProjects: {
          include: {
            milestones: true,
            resourceAllocations: true,
          },
        },
      },
    });

    return projects.map(project => new Project(project).toJSON());
  }

  /**
   * Updates resource allocation for a project with transaction support
   * 
   * @param id - Project ID
   * @param resources - Updated resource allocation data
   * @returns Promise resolving to updated project
   */
  async updateResources(
    id: string,
    resources: IProject['resourceAllocations']
  ): Promise<IProject> {
    const project = new Project(await this.prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        resourceAllocations: true,
      },
    }));

    // Validate resource allocations
    project.resourceAllocations = resources;
    project.validateResourceAllocations();

    // Execute update in transaction
    const updatedProject = await this.prisma.$transaction(async (prisma) => {
      // Delete existing allocations
      await prisma.resourceAllocation.deleteMany({
        where: { projectId: id },
      });

      // Create new allocations
      await prisma.resourceAllocation.createMany({
        data: resources.map(resource => ({
          ...resource,
          projectId: id,
        })),
      });

      // Update project status if needed
      const hasResources = resources.length > 0;
      if (hasResources && project.status === ProjectStatus.PLANNING) {
        await prisma.project.update({
          where: { id },
          data: { status: ProjectStatus.IN_PROGRESS },
        });
      }

      return prisma.project.findUnique({
        where: { id },
        include: {
          milestones: true,
          resourceAllocations: true,
        },
      });
    });

    return new Project(updatedProject).toJSON();
  }

  /**
   * Updates milestone tracking information with validation
   * 
   * @param id - Project ID
   * @param milestones - Updated milestone data
   * @returns Promise resolving to updated project
   */
  async updateMilestones(
    id: string,
    milestones: IProject['milestones']
  ): Promise<IProject> {
    const project = new Project(await this.prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        resourceAllocations: true,
      },
    }));

    // Validate milestones
    project.milestones = milestones;
    project.validateMilestones();

    // Execute update in transaction
    const updatedProject = await this.prisma.$transaction(async (prisma) => {
      // Delete existing milestones
      await prisma.milestone.deleteMany({
        where: { projectId: id },
      });

      // Create new milestones
      await prisma.milestone.createMany({
        data: milestones.map(milestone => ({
          ...milestone,
          projectId: id,
        })),
      });

      // Update project status based on milestone completion
      const allMilestonesComplete = milestones.every(
        m => m.completionPercentage === 100
      );
      if (allMilestonesComplete) {
        await prisma.project.update({
          where: { id },
          data: { status: ProjectStatus.COMPLETED },
        });
      }

      return prisma.project.findUnique({
        where: { id },
        include: {
          milestones: true,
          resourceAllocations: true,
        },
      });
    });

    return new Project(updatedProject).toJSON();
  }

  /**
   * Cleans up repository resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default ProjectRepository;