/**
 * @packageDocumentation
 * @module Tests/Unit/ProjectService
 * @version 1.0.0
 * 
 * Comprehensive unit test suite for ProjectService class testing all project
 * management operations including hierarchy, resources, and milestones.
 */

import { jest } from '@jest/globals'; // v29.0.0
import { Logger } from 'winston'; // v3.10.0
import { ProjectService } from '../../../src/project-service/services/project.service';
import { ProjectRepository } from '../../../src/project-service/repositories/project.repository';
import { 
  IProject, 
  ProjectStatus, 
  IMilestone,
  IProjectResource,
  MilestoneStatus 
} from '../../../src/project-service/interfaces/project.interface';
import { 
  mockProjects, 
  generateMockProject,
  generateMockProjects 
} from '../../fixtures/projects.fixture';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create repository mock with comprehensive method coverage
    mockProjectRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByHierarchy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateResources: jest.fn(),
      updateMilestones: jest.fn(),
      delete: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<ProjectRepository>;

    // Create logger mock
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Initialize service with mocks
    projectService = new ProjectService(mockProjectRepository, mockLogger);
  });

  afterEach(async () => {
    await projectService.dispose();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const paginationParams = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      filters: {}
    };

    it('should return paginated list of projects', async () => {
      const mockResult = {
        items: mockProjects.slice(0, 2),
        total: mockProjects.length,
        page: 1,
        totalPages: 1
      };

      mockProjectRepository.findAll.mockResolvedValue(mockResult.items);
      mockProjectRepository.count = jest.fn().mockResolvedValue(mockResult.total);

      const result = await projectService.findAll(paginationParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(mockProjectRepository.findAll).toHaveBeenCalledWith(paginationParams);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockProjectRepository.findAll.mockRejectedValue(error);

      const result = await projectService.findAll(paginationParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorCode).toBe('PROJECTS_RETRIEVAL_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getProjectHierarchy', () => {
    const rootProjectId = mockProjects[0].id;
    const hierarchyProjects = generateMockProjects(5, true);

    it('should retrieve complete project hierarchy', async () => {
      mockProjectRepository.findByHierarchy.mockResolvedValue(hierarchyProjects);

      const result = await projectService.getProjectHierarchy(rootProjectId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(hierarchyProjects);
      expect(mockProjectRepository.findByHierarchy).toHaveBeenCalledWith(rootProjectId);
    });

    it('should handle hierarchy retrieval errors', async () => {
      const error = new Error('Hierarchy retrieval failed');
      mockProjectRepository.findByHierarchy.mockRejectedValue(error);

      const result = await projectService.getProjectHierarchy(rootProjectId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorCode).toBe('HIERARCHY_RETRIEVAL_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('assignResources', () => {
    const projectId = mockProjects[0].id;
    const mockResources: IProjectResource[] = [
      {
        userId: 'user1',
        role: 'Developer',
        allocationPercentage: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    ];

    it('should assign resources to project', async () => {
      const updatedProject = { ...mockProjects[0], resourceAllocations: mockResources };
      mockProjectRepository.updateResources.mockResolvedValue(updatedProject);

      const result = await projectService.assignResources(projectId, mockResources);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProject);
      expect(mockProjectRepository.updateResources).toHaveBeenCalledWith(
        projectId,
        mockResources
      );
    });

    it('should handle resource allocation errors', async () => {
      const error = new Error('Resource allocation failed');
      mockProjectRepository.updateResources.mockRejectedValue(error);

      const result = await projectService.assignResources(projectId, mockResources);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorCode).toBe('RESOURCE_ASSIGNMENT_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateMilestones', () => {
    const projectId = mockProjects[0].id;
    const mockMilestones: IMilestone[] = [
      {
        id: 'milestone1',
        name: 'Test Milestone',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: MilestoneStatus.IN_PROGRESS,
        completionPercentage: 50
      }
    ];

    it('should update project milestones', async () => {
      const updatedProject = { ...mockProjects[0], milestones: mockMilestones };
      mockProjectRepository.updateMilestones.mockResolvedValue(updatedProject);

      const result = await projectService.updateMilestones(projectId, mockMilestones);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProject);
      expect(mockProjectRepository.updateMilestones).toHaveBeenCalledWith(
        projectId,
        mockMilestones
      );
    });

    it('should handle milestone update errors', async () => {
      const error = new Error('Milestone update failed');
      mockProjectRepository.updateMilestones.mockRejectedValue(error);

      const result = await projectService.updateMilestones(projectId, mockMilestones);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorCode).toBe('MILESTONE_UPDATE_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const projectId = mockProjects[0].id;
    const newStatus = ProjectStatus.IN_PROGRESS;
    const statusNote = 'Project started';

    it('should update project status with note', async () => {
      const project = { ...mockProjects[0] };
      const updatedProject = { 
        ...project, 
        status: newStatus,
        metadata: {
          ...project.metadata,
          lastStatusUpdate: {
            status: newStatus,
            note: statusNote,
            timestamp: expect.any(String)
          }
        }
      };

      mockProjectRepository.findById.mockResolvedValue(project);
      mockProjectRepository.update.mockResolvedValue(updatedProject);

      const result = await projectService.updateStatus(projectId, newStatus, statusNote);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProject);
      expect(mockProjectRepository.update).toHaveBeenCalledWith(
        projectId,
        expect.objectContaining({
          status: newStatus,
          metadata: expect.any(Object)
        })
      );
    });

    it('should handle status update errors', async () => {
      mockProjectRepository.findById.mockResolvedValue(null);

      const result = await projectService.updateStatus(projectId, newStatus);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.errorCode).toBe('STATUS_UPDATE_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTimeline', () => {
    const projectId = mockProjects[0].id;

    it('should generate project timeline visualization', async () => {
      const project = generateMockProject({}, true);
      mockProjectRepository.findById.mockResolvedValue(project);

      const result = await projectService.getTimeline(projectId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
        milestones: expect.any(Array),
        progress: expect.any(Number)
      }));
    });

    it('should handle timeline generation errors', async () => {
      const error = new Error('Timeline generation failed');
      mockProjectRepository.findById.mockRejectedValue(error);

      const result = await projectService.getTimeline(projectId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorCode).toBe('TIMELINE_GENERATION_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});