/**
 * @packageDocumentation
 * @module Tests/Fixtures
 * @version 1.0.0
 * 
 * Test fixtures for project entities providing comprehensive mock data
 * for testing project-related functionality including hierarchies,
 * milestones, and resource allocations.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { 
  IProject, 
  ProjectStatus, 
  IMilestone, 
  IProjectResource,
  MilestoneStatus 
} from '../../src/project-service/interfaces/project.interface';

/**
 * Default number of projects to generate in mock data sets
 */
export const defaultProjectCount = 5;

/**
 * Generates a mock milestone with realistic test data
 */
const generateMockMilestone = (index: number): IMilestone => ({
  id: uuidv4(),
  name: `Milestone ${index + 1}`,
  description: `Test milestone ${index + 1} description`,
  dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000), // Each milestone 1 week apart
  status: Object.values(MilestoneStatus)[index % Object.values(MilestoneStatus).length],
  completionPercentage: Math.min(100, index * 25)
});

/**
 * Generates a mock resource allocation with realistic test data
 */
const generateMockResource = (index: number): IProjectResource => ({
  userId: uuidv4(),
  role: ['Developer', 'Designer', 'Analyst', 'Manager'][index % 4],
  allocationPercentage: Math.min(100, (index + 1) * 25),
  startDate: new Date(),
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days duration
});

/**
 * Generates a single mock project with comprehensive test data
 * 
 * @param overrides - Optional property overrides for the generated project
 * @param includeRelations - Whether to include milestones and resource allocations
 * @returns A complete mock project with all required properties
 */
export const generateMockProject = (
  overrides: Partial<IProject> = {},
  includeRelations: boolean = true
): IProject => {
  const now = new Date();
  const projectId = uuidv4();
  
  const baseProject: IProject = {
    id: projectId,
    name: `Test Project ${projectId.slice(0, 8)}`,
    description: 'A test project for unit testing purposes',
    ownerId: uuidv4(),
    parentProjectId: undefined,
    startDate: now,
    endDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 180 days duration
    status: ProjectStatus.IN_PROGRESS,
    milestones: includeRelations ? Array(3).fill(null).map((_, i) => generateMockMilestone(i)) : [],
    resourceAllocations: includeRelations ? Array(4).fill(null).map((_, i) => generateMockResource(i)) : [],
    metadata: {
      priority: 'Medium',
      category: 'Development',
      tags: ['test', 'fixture']
    },
    createdAt: now,
    updatedAt: now,
    ...overrides
  };

  return baseProject;
};

/**
 * Generates an array of mock projects with various configurations
 * 
 * @param count - Number of projects to generate
 * @param includeHierarchy - Whether to generate parent-child relationships
 * @returns Array of mock projects with relationships
 */
export const generateMockProjects = (
  count: number = defaultProjectCount,
  includeHierarchy: boolean = true
): IProject[] => {
  const projects: IProject[] = [];
  
  // Generate parent projects
  const parentCount = Math.ceil(count / 3);
  for (let i = 0; i < parentCount; i++) {
    projects.push(generateMockProject({
      name: `Parent Project ${i + 1}`,
      status: Object.values(ProjectStatus)[i % Object.values(ProjectStatus).length]
    }));
  }

  // Generate child projects if hierarchy is requested
  if (includeHierarchy && count > parentCount) {
    for (let i = parentCount; i < count; i++) {
      const parentIndex = i % parentCount;
      projects.push(generateMockProject({
        name: `Child Project ${i - parentCount + 1}`,
        parentProjectId: projects[parentIndex].id,
        status: Object.values(ProjectStatus)[(i + 2) % Object.values(ProjectStatus).length]
      }));
    }
  }

  return projects;
};

/**
 * Pre-generated set of mock projects for common test scenarios
 */
export const mockProjects: IProject[] = [
  // Complete project with all fields
  generateMockProject({
    status: ProjectStatus.IN_PROGRESS
  }),
  
  // Completed project
  generateMockProject({
    status: ProjectStatus.COMPLETED,
    endDate: new Date()
  }),
  
  // Project at risk
  generateMockProject({
    status: ProjectStatus.AT_RISK,
    metadata: {
      priority: 'High',
      riskFactors: ['schedule delay', 'resource constraint']
    }
  }),
  
  // Parent project with children
  ...(() => {
    const parent = generateMockProject({
      name: 'Parent Project',
      status: ProjectStatus.IN_PROGRESS
    });
    
    const children = [
      generateMockProject({
        name: 'Child Project 1',
        parentProjectId: parent.id,
        status: ProjectStatus.IN_PROGRESS
      }),
      generateMockProject({
        name: 'Child Project 2',
        parentProjectId: parent.id,
        status: ProjectStatus.PLANNING
      })
    ];
    
    return [parent, ...children];
  })()
];