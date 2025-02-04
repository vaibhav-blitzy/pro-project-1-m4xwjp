/**
 * @fileoverview Global test setup configuration for Jest
 * @module Tests/Setup
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { jest } from '@jest/globals'; // v29.0.0
import { Logger } from '../src/common/utils/logger.util';
import { 
  createTestDatabase, 
  clearTestDatabase, 
  mockRedisClient, 
  mockRabbitMQChannel 
} from './helpers/test-utils';

// Initialize logger for test setup
const logger = Logger.getInstance();

/**
 * Load test environment variables
 */
config({ path: '.env.test' });

/**
 * Configure global test timeout
 */
jest.setTimeout(30000); // 30 seconds

/**
 * Global test setup that runs once before all test suites
 */
beforeAll(async () => {
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Initialize test database
    await createTestDatabase();
    logger.info('Test database initialized');

    // Configure global mocks
    globalThis.redisMock = mockRedisClient();
    globalThis.rabbitMQMock = mockRabbitMQChannel();
    logger.info('Global mocks configured');

    // Configure Jest environment
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console errors
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress console warnings
    
    // Set up global error handlers
    process.on('unhandledRejection', (error: Error) => {
      logger.error('Unhandled rejection in tests', error);
      process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception in tests', error);
      process.exit(1);
    });

    logger.info('Global test setup completed');
  } catch (error) {
    logger.error('Failed to setup test environment', error as Error);
    throw error;
  }
});

/**
 * Global cleanup that runs once after all test suites complete
 */
afterAll(async () => {
  try {
    // Clear test database
    await clearTestDatabase();
    
    // Clean up Redis mock
    await globalThis.redisMock.quit();
    
    // Clean up RabbitMQ mock
    await globalThis.rabbitMQMock.close();
    
    // Reset environment variables
    process.env.NODE_ENV = 'development';
    
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Remove error handlers
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');

    logger.info('Global test cleanup completed');
  } catch (error) {
    logger.error('Failed to cleanup test environment', error as Error);
    throw error;
  }
});

/**
 * Setup that runs before each test
 */
beforeEach(async () => {
  try {
    // Clear database tables while preserving schema
    await clearTestDatabase();
    
    // Reset Redis mock state
    await globalThis.redisMock.flushall();
    
    // Reset RabbitMQ mock queues
    await globalThis.rabbitMQMock.deleteQueue('*');
    
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset test-specific environment variables
    process.env.TEST_SUITE_ACTIVE = 'true';
    
    logger.info('Pre-test setup completed');
  } catch (error) {
    logger.error('Failed to setup test case', error as Error);
    throw error;
  }
});

/**
 * Cleanup that runs after each test
 */
afterEach(async () => {
  try {
    // Clear any remaining test data
    await clearTestDatabase();
    
    // Reset mock states
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Clear test-specific environment variables
    delete process.env.TEST_SUITE_ACTIVE;
    
    logger.info('Post-test cleanup completed');
  } catch (error) {
    logger.error('Failed to cleanup test case', error as Error);
    throw error;
  }
});

/**
 * Declare global types for TypeScript
 */
declare global {
  var redisMock: ReturnType<typeof mockRedisClient>;
  var rabbitMQMock: ReturnType<typeof mockRabbitMQChannel>;
  namespace NodeJS {
    interface Global {
      redisMock: ReturnType<typeof mockRedisClient>;
      rabbitMQMock: ReturnType<typeof mockRabbitMQChannel>;
    }
  }
}