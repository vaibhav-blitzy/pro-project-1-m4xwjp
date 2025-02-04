/**
 * @packageDocumentation
 * @module ProjectService/Controllers
 * @version 1.0.0
 * 
 * Enhanced REST API controller implementing comprehensive project management endpoints
 * with support for project hierarchies, resource allocation, and milestone tracking.
 */

import { Request, Response } from 'express'; // v4.18.2
import { Logger } from 'winston'; // v3.10.0
import { IBaseController } from '../../common/interfaces/base-controller.interface';
import { 
  IProject, 
  IProjectService, 
  ProjectStatus, 
  IMilestone, 
  IProjectResource 
} from '../interfaces/project.interface';
import { ProjectService } from '../services/project.service';

/**
 * Enhanced controller implementing comprehensive project management endpoints
 * with support for project hierarchies, resource allocation, and milestone tracking.
 */
export class ProjectController implements IBaseController<IProject> {
  private readonly logger: Logger;

  constructor(
    private readonly projectService: ProjectService
  ) {
    this.logger = new Logger({
      level: 'info',
      format: Logger.format.combine(
        Logger.format.timestamp(),
        Logger.format.json()
      )
    });
  }

  /**
   * GET /projects
   * Retrieves paginated list of projects with filtering and sorting
   */
  async getAll(
    req: Request<{}, {}, {}, { 
      page?: number; 
      limit?: number; 
      sortBy?: string; 
      sortOrder?: 'asc' | 'desc';
      status?: ProjectStatus;
      ownerId?: string;
    }>,
    res: Response
  ): Promise<Response> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        status,
        ownerId 
      } = req.query;

      const result = await this.projectService.findAll({
        page,
        limit,
        sortBy,
        sortOrder,
        filters: { status, ownerId }
      });

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving projects', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * GET /projects/:id
   * Retrieves a single project by ID with complete details
   */
  async getById(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.projectService.findById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving project', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * POST /projects
   * Creates a new project with complete validation
   */
  async create(
    req: Request<{}, {}, IProject>,
    res: Response
  ): Promise<Response> {
    try {
      const result = await this.projectService.create(req.body);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      this.logger.error('Error creating project', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * PUT /projects/:id
   * Updates an existing project with validation
   */
  async update(
    req: Request<{ id: string }, {}, Partial<IProject>>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.projectService.update(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating project', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * DELETE /projects/:id
   * Removes a project with hierarchy validation
   */
  async delete(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.projectService.delete(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error deleting project', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * GET /projects/:id/hierarchy
   * Retrieves complete project hierarchy tree
   */
  async getProjectHierarchy(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.projectService.getProjectHierarchy(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving project hierarchy', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * POST /projects/:id/resources
   * Assigns resources to project with validation
   */
  async assignResources(
    req: Request<{ id: string }, {}, { resources: IProjectResource[] }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { resources } = req.body;

      const result = await this.projectService.assignResources(id, resources);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error assigning resources', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * PUT /projects/:id/milestones
   * Updates project milestones with validation
   */
  async updateMilestones(
    req: Request<{ id: string }, {}, { milestones: IMilestone[] }>,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const { milestones } = req.body;

      const result = await this.projectService.updateMilestones(id, milestones);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating milestones', { error });
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export default ProjectController;