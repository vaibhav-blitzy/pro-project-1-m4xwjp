/**
 * @fileoverview End-to-end test suite for project service API endpoints
 * @module Tests/E2E/ProjectAPI
 * @version 1.0.0
 */

import supertest from 'supertest'; // v6.3.3
import { 
  generateMockProject, 
  generateMockProjects 
} from '../../fixtures/projects.fixture';
import { 
  createTestDatabase, 
  clearTestDatabase, 
  generateTestToken 
} from '../../helpers/test-utils';
import { 
  IProject, 
  ProjectStatus 
} from '../../../src/project-service/interfaces/project.interface';

// Initialize test request client
let request: supertest.SuperTest<supertest.Test>;
let testUser: { id: string; email: string; role: string; permissions: string[] };
let authToken: string;

/**
 * Test environment setup with enhanced error handling
 */
beforeAll(async () => {
  try {
    await createTestDatabase();
    
    // Create test user with required permissions
    testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test.manager@company.com',
      role: 'project_manager',
      permissions: ['project.create', 'project.update', 'project.delete']
    };
    
    // Generate auth token
    authToken = generateTestToken(testUser);
    
    // Initialize supertest client
    request = supertest(process.env.API_URL || 'http://localhost:3000');
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

/**
 * Cleanup test environment after all tests
 */
afterAll(async () => {
  await clearTestDatabase();
});

/**
 * Reset test state before each test
 */
beforeEach(async () => {
  await clearTestDatabase();
});

describe('Project API E2E Tests', () => {
  describe('Project CRUD Operations', () => {
    it('should create a new project with valid data', async () => {
      const mockProject = generateMockProject();
      
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(mockProject.name);
    });

    it('should retrieve a project by ID', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      
      const response = await request
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(projectId);
    });

    it('should update project details', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const updates = { name: 'Updated Project Name' };
      
      const response = await request
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updates.name);
    });

    it('should delete a project', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      
      const response = await request
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(true);
    });
  });

  describe('Project Hierarchy Management', () => {
    it('should create parent-child project relationships', async () => {
      const parentProject = generateMockProject();
      const parentResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(parentProject);
      
      const childProject = generateMockProject({
        parentProjectId: parentResponse.body.data.id
      });
      
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(childProject);
      
      expect(response.status).toBe(201);
      expect(response.body.data.parentProjectId).toBe(parentResponse.body.data.id);
    });

    it('should retrieve project hierarchy', async () => {
      const projects = generateMockProjects(3, true);
      const rootProject = projects[0];
      
      // Create root project
      const rootResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rootProject);
      
      const response = await request
        .get(`/api/v1/projects/${rootResponse.body.data.id}/hierarchy`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Project Timeline Management', () => {
    it('should validate project timeline constraints', async () => {
      const invalidProject = generateMockProject({
        startDate: new Date('2023-12-31'),
        endDate: new Date('2023-01-01')
      });
      
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProject);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('should update project timeline', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      
      const response = await request
        .patch(`/api/v1/projects/${projectId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ endDate: newEndDate });
      
      expect(response.status).toBe(200);
      expect(new Date(response.body.data.endDate)).toEqual(newEndDate);
    });
  });

  describe('Resource Allocation', () => {
    it('should assign resources to project', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const resources = [{
        userId: testUser.id,
        role: 'Developer',
        allocationPercentage: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }];
      
      const response = await request
        .post(`/api/v1/projects/${projectId}/resources`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resources });
      
      expect(response.status).toBe(200);
      expect(response.body.data.resourceAllocations).toHaveLength(1);
    });

    it('should validate resource allocation constraints', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const invalidResources = [{
        userId: testUser.id,
        role: 'Developer',
        allocationPercentage: 150, // Invalid percentage
        startDate: new Date(),
        endDate: new Date()
      }];
      
      const response = await request
        .post(`/api/v1/projects/${projectId}/resources`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resources: invalidResources });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Milestone Tracking', () => {
    it('should create project milestones', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const milestones = [{
        name: 'Phase 1 Complete',
        description: 'Initial phase completion',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'NOT_STARTED',
        completionPercentage: 0
      }];
      
      const response = await request
        .post(`/api/v1/projects/${projectId}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ milestones });
      
      expect(response.status).toBe(200);
      expect(response.body.data.milestones).toHaveLength(1);
    });

    it('should update milestone progress', async () => {
      const mockProject = generateMockProject();
      const createResponse = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProject);
      
      const projectId = createResponse.body.data.id;
      const milestoneId = createResponse.body.data.milestones[0].id;
      
      const response = await request
        .patch(`/api/v1/projects/${projectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
          completionPercentage: 50
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.milestones[0].completionPercentage).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized access', async () => {
      const response = await request
        .get('/api/v1/projects')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(response.status).toBe(401);
    });

    it('should handle not found resources', async () => {
      const response = await request
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });

    it('should handle validation errors', async () => {
      const invalidProject = {
        name: '', // Invalid empty name
        description: 'Test project'
      };
      
      const response = await request
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProject);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});