/**
 * @fileoverview Test utilities and helpers for setting up isolated test environments
 * @module Tests/Helpers/TestUtils
 * @version 1.0.0
 */

import { Pool } from 'pg'; // v8.11.0
import Redis from 'ioredis-mock'; // v8.9.0
import * as amqp from 'amqplib-mock'; // v0.10.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import { pool } from '../../src/common/config/database.config';
import { RedisManager } from '../../src/common/config/redis.config';
import { RABBITMQ_CONFIG } from '../../src/common/config/rabbitmq.config';
import { Logger } from '../../src/common/utils/logger.util';

const logger = Logger.getInstance();

/**
 * Test database configuration
 */
const TEST_DB_CONFIG = {
  database: 'task_management_test',
  schema: 'public',
  tables: [
    'users',
    'projects',
    'tasks',
    'comments',
    'attachments',
    'task_history'
  ]
};

/**
 * Creates an isolated test database with required schema and tables
 */
export async function createTestDatabase(): Promise<void> {
  try {
    // Drop existing test database if it exists
    await pool.query(`
      DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database} WITH (FORCE)
    `);

    // Create fresh test database
    await pool.query(`
      CREATE DATABASE ${TEST_DB_CONFIG.database}
      WITH 
        ENCODING = 'UTF8'
        LC_COLLATE = 'en_US.UTF-8'
        LC_CTYPE = 'en_US.UTF-8'
        TEMPLATE = template0
    `);

    // Connect to test database
    const testPool = new Pool({
      ...pool.options,
      database: TEST_DB_CONFIG.database
    });

    // Apply migrations and create schema
    await testPool.query(`
      CREATE SCHEMA IF NOT EXISTS ${TEST_DB_CONFIG.schema}
    `);

    // Create required tables with proper constraints
    await testPool.query(`
      -- Users table
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Projects table
      CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Tasks table
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id UUID REFERENCES projects(id),
        assignee_id UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await testPool.end();
    logger.info('Test database created successfully');
  } catch (error) {
    logger.error('Failed to create test database', error as Error);
    throw error;
  }
}

/**
 * Clears all test database tables while maintaining schema
 */
export async function clearTestDatabase(): Promise<void> {
  try {
    const testPool = new Pool({
      ...pool.options,
      database: TEST_DB_CONFIG.database
    });

    // Disable foreign key constraints
    await testPool.query('SET session_replication_role = replica;');

    // Truncate all tables in reverse order
    for (const table of [...TEST_DB_CONFIG.tables].reverse()) {
      await testPool.query(`TRUNCATE TABLE ${table} CASCADE;`);
    }

    // Reset sequences
    for (const table of TEST_DB_CONFIG.tables) {
      await testPool.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false);
      `);
    }

    // Re-enable foreign key constraints
    await testPool.query('SET session_replication_role = DEFAULT;');

    await testPool.end();
    logger.info('Test database cleared successfully');
  } catch (error) {
    logger.error('Failed to clear test database', error as Error);
    throw error;
  }
}

/**
 * Creates a mock Redis client for testing
 */
export function mockRedisClient(): Redis {
  const redis = new Redis({
    data: {
      // Initial test data
      'test:key': 'test-value'
    }
  });

  // Mock core Redis methods
  redis.on('connect', () => {
    logger.info('Mock Redis client connected');
  });

  redis.on('error', (error: Error) => {
    logger.error('Mock Redis client error', error);
  });

  return redis;
}

/**
 * Creates a mock RabbitMQ channel for testing
 */
export function mockRabbitMQChannel(): amqp.Channel {
  const connection = amqp.connect(RABBITMQ_CONFIG.url);
  const channel = connection.createChannel();

  // Setup mock exchanges and queues
  Object.values(RABBITMQ_CONFIG.queues).forEach(queue => {
    channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RABBITMQ_CONFIG.deadLetterExchange
      }
    });
  });

  return channel;
}

/**
 * Interface for test user data
 */
interface TestUserData {
  id?: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Generates a JWT token for test authentication
 */
export function generateTestToken(userData: TestUserData): string {
  const testSecret = process.env.JWT_SECRET || 'test-secret';
  
  const payload = {
    id: userData.id || uuidv4(),
    email: userData.email,
    name: userData.name,
    role: userData.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
  };

  return jwt.sign(payload, testSecret);
}

/**
 * Cleanup function to be called after tests
 */
export async function cleanupTestEnvironment(): Promise<void> {
  try {
    // Clear Redis cache
    const redis = mockRedisClient();
    await redis.flushall();
    await redis.quit();

    // Clear test database
    await clearTestDatabase();

    logger.info('Test environment cleaned up successfully');
  } catch (error) {
    logger.error('Failed to cleanup test environment', error as Error);
    throw error;
  }
}