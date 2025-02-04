/**
 * @packageDocumentation
 * @module Tests/Integration/ProjectService
 * @version 1.0.0
 * 
 * Integration tests for ProjectController verifying REST API endpoints,
 * project hierarchy management, resource allocation, and milestone tracking.
 */

import supertest from 'supertest'; // v6.3.3
import { Express } from 'express';
import { Server } from 'http';
import Ajv from 'ajv'; // v8.12.0
import { 
  ProjectController,
  ProjectService,
  IProject,
  ProjectStatus,
  IMilestone,
  IProjectResource,
  MilestoneStatus
} from '../../../src/project-service';
import { 
  mockProjects, 
  generateMockProject,
  generateMockProjects 
} from '../../fixtures/projects.fixture';
import { 
  createTestDatabase,
  clearTestDatabase,
  mockRedisClient,
  mockRabbitMQChannel,
  generateTestToken,
  cleanupTestEnvironment
} from '../../helpers/test-utils';
import { HttpStatus } from '../../../src/common/types';
import express from 'express';

describe('ProjectController Integration Tests', () => {
  let app: Express;
  let server: Server;
  let controller: ProjectController;
  let projectService: ProjectService;
  let request: supertest.SuperTest<supertest.Test>;
  let testToken: string;
  const ajv = new Ajv({ allErrors: true });

  beforeAll(async () => {
    // Set up test environment
    await createTestDatabase();
    const redisClient = mockRedisClient();
    const mqChannel = mockRabbitMQChannel();

    // Initialize service and controller
    projectService = new ProjectService(redisClient, mqChannel);
    controller = new ProjectController(projectService);

    // Set up Express app with middleware
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', controller.router);

    // Start server and create test client
    server = app.listen(0);
    request = supertest(app);

    // Generate test auth token
    testToken = generateTestToken({
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    });
  });

  afterAll(async () => {
    server.close();
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('GET /projects', () => {
    it('should return paginated list of projects', async () => {
      // Arrange
      const testProjects = generateMockProjects(5);
      await Promise.all(testProjects.map(p => projectService.create(p)));

      // Act
      const response = await request
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ page: 1, limit: 10 });

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(5);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.page).toBe(1);
    });

    it('should filter projects by status', async () => {
      // Arrange
      const testProjects = [
        generateMockProject({ status: ProjectStatus.IN_PROGRESS }),
        generateMockProject({ status: ProjectStatus.COMPLETED }),
        generateMockProject({ status: ProjectStatus.IN_PROGRESS })
      ];
      await Promise.all(testProjects.map(p => projectService.create(p)));

      // Act
      const response = await request
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ status: ProjectStatus.IN_PROGRESS });

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items.every(p => p.status === ProjectStatus.IN_PROGRESS)).toBe(true);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return project by ID with complete details', async () => {
      // Arrange
      const testProject = generateMockProject();
      const created = await projectService.create(testProject);

      // Act
      const response = await request
        .get(`/api/v1/projects/${created.data!.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(created.data!.id);
      expect(response.body.data.milestones).toBeDefined();
      expect(response.body.data.resourceAllocations).toBeDefined();
    });

    it('should return 404 for non-existent project', async () => {
      // Act
      const response = await request
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /projects', () => {
    it('should create new project with complete validation', async () => {
      // Arrange
      const newProject = generateMockProject();

      // Act
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newProject);

      // Assert
      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(newProject.name);
    });

    it('should validate required project fields', async () => {
      // Arrange
      const invalidProject = { name: '' };

      // Act
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidProject);

      // Assert
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /projects/:id', () => {
    it('should update existing project with validation', async () => {
      // Arrange
      const testProject = generateMockProject();
      const created = await projectService.create(testProject);
      const update = { name: 'Updated Project Name' };

      // Act
      const response = await request
        .put(`/api/v1/projects/${created.data!.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(update);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(update.name);
    });
  });

  describe('GET /projects/:id/hierarchy', () => {
    it('should return complete project hierarchy', async () => {
      // Arrange
      const parent = generateMockProject();
      const created = await projectService.create(parent);
      const children = await Promise.all([
        projectService.create(generateMockProject({ parentProjectId: created.data!.id })),
        projectService.create(generateMockProject({ parentProjectId: created.data!.id }))
      ]);

      // Act
      const response = await request
        .get(`/api/v1/projects/${created.data!.id}/hierarchy`)
        .set('Authorization', `Bearer ${testToken}`);

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('POST /projects/:id/resources', () => {
    it('should assign resources to project with validation', async () => {
      // Arrange
      const testProject = generateMockProject();
      const created = await projectService.create(testProject);
      const resources: IProjectResource[] = [{
        userId: 'test-user-id',
        role: 'Developer',
        allocationPercentage: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }];

      // Act
      const response = await request
        .post(`/api/v1/projects/${created.data!.id}/resources`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ resources });

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resourceAllocations).toHaveLength(1);
    });
  });

  describe('PUT /projects/:id/milestones', () => {
    it('should update project milestones with validation', async () => {
      // Arrange
      const testProject = generateMockProject();
      const created = await projectService.create(testProject);
      const milestones: IMilestone[] = [{
        id: 'test-milestone-id',
        name: 'Test Milestone',
        description: 'Test milestone description',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: MilestoneStatus.IN_PROGRESS,
        completionPercentage: 50
      }];

      // Act
      const response = await request
        .put(`/api/v1/projects/${created.data!.id}/milestones`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ milestones });

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.milestones).toHaveLength(1);
    });
  });
});