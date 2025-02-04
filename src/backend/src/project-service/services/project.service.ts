/**
 * @packageDocumentation
 * @module ProjectService/Services
 * @version 1.0.0
 * 
 * Enhanced service implementation for project management operations with support for
 * hierarchy management, resource allocation, and milestone tracking.
 */

import { Logger } from 'winston'; // v3.10.0
import { 
  IProject, 
  IProjectService, 
  ProjectStatus, 
  IMilestone, 
  IProjectResource 
} from '../interfaces/project.interface';
import { ProjectRepository } from '../repositories/project.repository';
import { ServiceResponse, PaginationParams } from '../../common/interfaces/base-service.interface';
import Redis from 'ioredis'; // v5.3.0

/**
 * Enhanced service class implementing comprehensive project management business logic
 * including hierarchy management, resource allocation, and milestone tracking.
 */
export class ProjectService implements IProjectService {
  private readonly cacheKeyPrefix = 'project:hierarchy:';
  private readonly cacheTTL = 3600; // 1 hour
  private readonly cache: Redis;

  constructor(
    private readonly repository: ProjectRepository,
    private readonly logger: Logger
  ) {
    this.cache = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: this.cacheKeyPrefix
    });
  }

  /**
   * Retrieves paginated list of projects with enhanced filtering and sorting
   */
  async findAll(options: PaginationParams): Promise<ServiceResponse<{
    items: IProject[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    try {
      const projects = await this.repository.findAll(options);
      const total = await this.repository.count(options.filters);
      const totalPages = Math.ceil(total / options.limit);

      return {
        success: true,
        message: 'Projects retrieved successfully',
        data: {
          items: projects,
          total,
          page: options.page,
          totalPages
        },
        error: null,
        errorCode: null,
        metadata: { timestamp: new Date().toISOString() }
      };
    } catch (error) {
      this.logger.error('Error retrieving projects', { error });
      return {
        success: false,
        message: 'Failed to retrieve projects',
        data: null,
        error: error as Error,
        errorCode: 'PROJECTS_RETRIEVAL_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Retrieves complete project hierarchy tree with caching support
   */
  async getProjectHierarchy(rootProjectId: string): Promise<ServiceResponse<IProject[]>> {
    try {
      // Check cache first
      const cachedHierarchy = await this.cache.get(rootProjectId);
      if (cachedHierarchy) {
        return {
          success: true,
          message: 'Project hierarchy retrieved from cache',
          data: JSON.parse(cachedHierarchy),
          error: null,
          errorCode: null,
          metadata: { source: 'cache' }
        };
      }

      // Build hierarchy from repository
      const hierarchy = await this.repository.findByHierarchy(rootProjectId);
      
      // Cache the result
      await this.cache.setex(
        rootProjectId,
        this.cacheTTL,
        JSON.stringify(hierarchy)
      );

      return {
        success: true,
        message: 'Project hierarchy retrieved successfully',
        data: hierarchy,
        error: null,
        errorCode: null,
        metadata: { source: 'database' }
      };
    } catch (error) {
      this.logger.error('Error retrieving project hierarchy', { 
        rootProjectId, 
        error 
      });
      return {
        success: false,
        message: 'Failed to retrieve project hierarchy',
        data: null,
        error: error as Error,
        errorCode: 'HIERARCHY_RETRIEVAL_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Manages resource allocation for projects with validation
   */
  async assignResources(
    projectId: string,
    resources: IProjectResource[]
  ): Promise<ServiceResponse<IProject>> {
    try {
      // Validate and update resources
      const updatedProject = await this.repository.updateResources(
        projectId,
        resources
      );

      // Invalidate hierarchy cache if needed
      await this.invalidateHierarchyCache(projectId);

      return {
        success: true,
        message: 'Resources assigned successfully',
        data: updatedProject,
        error: null,
        errorCode: null,
        metadata: { resourceCount: resources.length }
      };
    } catch (error) {
      this.logger.error('Error assigning resources', { 
        projectId, 
        resources, 
        error 
      });
      return {
        success: false,
        message: 'Failed to assign resources',
        data: null,
        error: error as Error,
        errorCode: 'RESOURCE_ASSIGNMENT_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Updates project milestones with validation and status updates
   */
  async updateMilestones(
    projectId: string,
    milestones: IMilestone[]
  ): Promise<ServiceResponse<IProject>> {
    try {
      // Validate and update milestones
      const updatedProject = await this.repository.updateMilestones(
        projectId,
        milestones
      );

      // Invalidate hierarchy cache if needed
      await this.invalidateHierarchyCache(projectId);

      return {
        success: true,
        message: 'Milestones updated successfully',
        data: updatedProject,
        error: null,
        errorCode: null,
        metadata: { milestoneCount: milestones.length }
      };
    } catch (error) {
      this.logger.error('Error updating milestones', { 
        projectId, 
        milestones, 
        error 
      });
      return {
        success: false,
        message: 'Failed to update milestones',
        data: null,
        error: error as Error,
        errorCode: 'MILESTONE_UPDATE_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Updates project status with validation and cascade effects
   */
  async updateStatus(
    id: string,
    status: ProjectStatus,
    statusNote?: string
  ): Promise<ServiceResponse<IProject>> {
    try {
      const project = await this.repository.findById(id);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedProject = await this.repository.update(id, {
        status,
        metadata: {
          ...project.metadata,
          lastStatusUpdate: {
            status,
            note: statusNote,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Invalidate hierarchy cache
      await this.invalidateHierarchyCache(id);

      return {
        success: true,
        message: 'Project status updated successfully',
        data: updatedProject,
        error: null,
        errorCode: null,
        metadata: { previousStatus: project.status }
      };
    } catch (error) {
      this.logger.error('Error updating project status', { 
        id, 
        status, 
        statusNote, 
        error 
      });
      return {
        success: false,
        message: 'Failed to update project status',
        data: null,
        error: error as Error,
        errorCode: 'STATUS_UPDATE_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Invalidates hierarchy cache for a project and its ancestors
   */
  private async invalidateHierarchyCache(projectId: string): Promise<void> {
    try {
      const project = await this.repository.findById(projectId);
      if (project) {
        await this.cache.del(projectId);
        if (project.parentProjectId) {
          await this.invalidateHierarchyCache(project.parentProjectId);
        }
      }
    } catch (error) {
      this.logger.error('Error invalidating hierarchy cache', { 
        projectId, 
        error 
      });
    }
  }

  /**
   * Cleans up service resources
   */
  async dispose(): Promise<void> {
    await this.cache.quit();
    await this.repository.disconnect();
  }
}

export default ProjectService;