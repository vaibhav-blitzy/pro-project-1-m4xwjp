/**
 * @packageDocumentation
 * @module Tests/Fixtures
 * @version 1.0.0
 * 
 * Mock task data and generator functions for testing task-related functionality.
 * Provides consistent and realistic test data generation following the ITask interface.
 */

import { faker } from '@faker-js/faker'; // v8.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { 
  ITask,
  TaskPriority,
  TaskStatus,
  TaskValidation,
  TaskId
} from '../../src/task-service/interfaces/task.interface';

// Constants for mock data generation
const DEFAULT_MOCK_TASKS_COUNT = 3;
const MAX_TITLE_LENGTH = TaskValidation.MAX_TITLE_LENGTH;
const MAX_DESCRIPTION_LENGTH = TaskValidation.MAX_DESCRIPTION_LENGTH;

/**
 * Generates a single mock task with random but realistic data.
 * Supports partial overrides for specific test scenarios.
 *
 * @param overrides - Optional partial task data to override generated values
 * @returns Complete mock task object
 */
export const generateMockTask = (overrides: Partial<ITask> = {}): ITask => {
  const now = new Date();
  const dueDate = faker.date.future({ years: 0.25 }); // Due date within next 3 months

  const mockTask: ITask = {
    id: uuidv4() as TaskId,
    title: faker.lorem.sentence({ max: 10 }).slice(0, MAX_TITLE_LENGTH),
    description: faker.lorem.paragraphs(2).slice(0, MAX_DESCRIPTION_LENGTH),
    projectId: uuidv4(),
    assigneeId: uuidv4(),
    priority: faker.helpers.arrayElement(Object.values(TaskPriority)),
    status: faker.helpers.arrayElement(Object.values(TaskStatus)),
    dueDate,
    attachments: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
      fileId: uuidv4(),
      fileName: `${faker.system.fileName()}.${faker.system.fileExt()}`,
      fileSize: faker.number.int({ min: 1000, max: 10000000 }),
      mimeType: faker.system.mimeType(),
      uploadedAt: faker.date.between({ from: now, to: now })
    })),
    tags: Array.from(
      { length: faker.number.int({ min: 0, max: TaskValidation.MAX_TAGS }) },
      () => faker.lorem.word({ length: { min: 3, max: TaskValidation.MAX_TAG_LENGTH } })
    ),
    createdBy: uuidv4(),
    lastModifiedBy: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...overrides
  };

  return mockTask;
};

/**
 * Generates an array of mock tasks with support for bulk generation.
 *
 * @param count - Number of mock tasks to generate (default: DEFAULT_MOCK_TASKS_COUNT)
 * @param overrides - Optional array of partial task data to override generated values
 * @returns Array of generated mock tasks
 */
export const generateMockTasks = (
  count: number = DEFAULT_MOCK_TASKS_COUNT,
  overrides: Partial<ITask>[] = []
): ITask[] => {
  return Array.from({ length: count }, (_, index) => 
    generateMockTask(overrides[index] || {})
  );
};

/**
 * Pre-generated mock tasks with diverse scenarios for common test cases
 */
export const mockTasks = {
  // Task with high priority and upcoming due date
  task1: generateMockTask({
    priority: TaskPriority.HIGH,
    status: TaskStatus.TODO,
    dueDate: faker.date.soon({ days: 3 }),
    tags: ['urgent', 'critical']
  }),

  // Task in progress with medium priority
  task2: generateMockTask({
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.IN_PROGRESS,
    dueDate: faker.date.soon({ days: 7 }),
    tags: ['in-progress', 'development']
  }),

  // Completed task with attachments
  task3: generateMockTask({
    priority: TaskPriority.LOW,
    status: TaskStatus.COMPLETED,
    dueDate: faker.date.recent({ days: 1 }),
    tags: ['completed', 'documentation'],
    attachments: [{
      fileId: uuidv4(),
      fileName: 'final-report.pdf',
      fileSize: 1024 * 1024 * 2, // 2MB
      mimeType: 'application/pdf',
      uploadedAt: new Date()
    }]
  })
};