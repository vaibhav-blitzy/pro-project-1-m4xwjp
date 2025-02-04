/**
 * @fileoverview Enhanced project service implementing comprehensive project management
 * Provides caching, real-time updates, and timeline visualization capabilities
 * @version 1.0.0
 */

import { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectTimeline 
} from '../api/project.api';
import { IProject, IProjectTimeline, ProjectPriority } from '../interfaces/project.interface';
import { CircuitBreaker } from '@resilient/circuit-breaker'; // v1.0.0
import { ErrorHandler } from '@common/error-handler'; // v2.0.0
import { LoadingState, Status } from '../types/common.types';

/**
 * Configuration for the project cache
 */
const CACHE_CONFIG = {
  DEFAULT_EXPIRY: 5 * 60 * 1000, // 5 minutes
  TIMELINE_EXPIRY: 2 * 60 * 1000, // 2 minutes
  MAX_ITEMS: 100
};

/**
 * Circuit breaker configuration for API calls
 */
const CIRCUIT_BREAKER_CONFIG = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

/**
 * Enhanced service class for managing project-related operations
 * Implements caching, real-time updates, and timeline visualization
 */
export class ProjectService {
  private projectCache: Map<string, { data: IProject; timestamp: number }>;
  private timelineCache: Map<string, { data: IProjectTimeline; timestamp: number }>;
  private apiBreaker: CircuitBreaker;
  private readonly cacheExpiryMs: number;
  private errorHandler: ErrorHandler;

  /**
   * Initializes the project service with enhanced caching and circuit breaker
   * @param cacheExpiryMs Optional cache expiry time in milliseconds
   */
  constructor(cacheExpiryMs: number = CACHE_CONFIG.DEFAULT_EXPIRY) {
    this.projectCache = new Map();
    this.timelineCache = new Map();
    this.cacheExpiryMs = cacheExpiryMs;
    this.errorHandler = new ErrorHandler();
    
    // Initialize circuit breaker for API calls
    this.apiBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIG);
    
    // Set up cache cleanup interval
    setInterval(() => this.cleanCache(), this.cacheExpiryMs);
  }

  /**
   * Retrieves all projects with enhanced filtering and caching
   * @param filters Optional filters for project retrieval
   * @returns Promise resolving to filtered projects array
   */
  public async getProjects(filters?: {
    status?: Status;
    priority?: ProjectPriority;
    search?: string;
  }): Promise<IProject[]> {
    try {
      const response = await this.apiBreaker.fire(async () => {
        const projects = await getProjects();
        
        // Update cache with fresh data
        projects.data.forEach(project => {
          this.updateProjectCache(project.id, project);
        });

        return this.applyFilters(projects.data, filters);
      });

      return response;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Retrieves a specific project by ID with cache support
   * @param projectId Project unique identifier
   * @returns Promise resolving to project details
   */
  public async getProjectById(projectId: string): Promise<IProject> {
    try {
      const cachedProject = this.getFromProjectCache(projectId);
      if (cachedProject) return cachedProject;

      const response = await this.apiBreaker.fire(async () => {
        const project = await getProjectById(projectId);
        this.updateProjectCache(projectId, project.data);
        return project.data;
      });

      return response;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Creates a new project with validation
   * @param projectData Project creation payload
   * @returns Promise resolving to created project
   */
  public async createProject(projectData: Partial<IProject>): Promise<IProject> {
    try {
      const response = await this.apiBreaker.fire(async () => {
        const project = await createProject(projectData);
        this.updateProjectCache(project.data.id, project.data);
        return project.data;
      });

      return response;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Updates an existing project with cache invalidation
   * @param projectId Project unique identifier
   * @param projectData Project update payload
   * @returns Promise resolving to updated project
   */
  public async updateProject(
    projectId: string,
    projectData: Partial<IProject>
  ): Promise<IProject> {
    try {
      const response = await this.apiBreaker.fire(async () => {
        const project = await updateProject(projectId, projectData);
        this.updateProjectCache(projectId, project.data);
        return project.data;
      });

      return response;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Deletes a project and cleans up cache
   * @param projectId Project unique identifier
   * @returns Promise resolving to void on success
   */
  public async deleteProject(projectId: string): Promise<void> {
    try {
      await this.apiBreaker.fire(async () => {
        await deleteProject(projectId);
        this.projectCache.delete(projectId);
        this.timelineCache.delete(projectId);
      });
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Retrieves and formats project timeline data with caching
   * @param projectId Project unique identifier
   * @returns Promise resolving to formatted timeline data
   */
  public async getProjectTimeline(projectId: string): Promise<IProjectTimeline> {
    try {
      const cachedTimeline = this.getFromTimelineCache(projectId);
      if (cachedTimeline) return cachedTimeline;

      const response = await this.apiBreaker.fire(async () => {
        const timeline = await getProjectTimeline(projectId);
        this.updateTimelineCache(projectId, timeline.data);
        return timeline.data;
      });

      return response;
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * Updates project cache with new data
   * @param projectId Project unique identifier
   * @param projectData Project data to cache
   */
  private updateProjectCache(projectId: string, projectData: IProject): void {
    this.projectCache.set(projectId, {
      data: projectData,
      timestamp: Date.now()
    });
  }

  /**
   * Updates timeline cache with new data
   * @param projectId Project unique identifier
   * @param timelineData Timeline data to cache
   */
  private updateTimelineCache(projectId: string, timelineData: IProjectTimeline): void {
    this.timelineCache.set(projectId, {
      data: timelineData,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves project from cache if valid
   * @param projectId Project unique identifier
   * @returns Cached project or null if expired/missing
   */
  private getFromProjectCache(projectId: string): IProject | null {
    const cached = this.projectCache.get(projectId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheExpiryMs;
    return isExpired ? null : cached.data;
  }

  /**
   * Retrieves timeline from cache if valid
   * @param projectId Project unique identifier
   * @returns Cached timeline or null if expired/missing
   */
  private getFromTimelineCache(projectId: string): IProjectTimeline | null {
    const cached = this.timelineCache.get(projectId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > CACHE_CONFIG.TIMELINE_EXPIRY;
    return isExpired ? null : cached.data;
  }

  /**
   * Cleans expired items from caches
   */
  private cleanCache(): void {
    const now = Date.now();

    // Clean project cache
    for (const [key, value] of this.projectCache.entries()) {
      if (now - value.timestamp > this.cacheExpiryMs) {
        this.projectCache.delete(key);
      }
    }

    // Clean timeline cache
    for (const [key, value] of this.timelineCache.entries()) {
      if (now - value.timestamp > CACHE_CONFIG.TIMELINE_EXPIRY) {
        this.timelineCache.delete(key);
      }
    }
  }

  /**
   * Applies filters to project list
   * @param projects Projects to filter
   * @param filters Filter criteria
   * @returns Filtered projects array
   */
  private applyFilters(
    projects: IProject[],
    filters?: {
      status?: Status;
      priority?: ProjectPriority;
      search?: string;
    }
  ): IProject[] {
    if (!filters) return projects;

    return projects.filter(project => {
      const statusMatch = !filters.status || project.status === filters.status;
      const priorityMatch = !filters.priority || project.priority === filters.priority;
      const searchMatch = !filters.search || 
        project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.description.toLowerCase().includes(filters.search.toLowerCase());

      return statusMatch && priorityMatch && searchMatch;
    });
  }
}