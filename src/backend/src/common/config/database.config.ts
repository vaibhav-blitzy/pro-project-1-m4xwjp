/**
 * @fileoverview Database configuration and connection pool management for PostgreSQL
 * @module Common/Config/Database
 * @version 1.0.0
 */

import { Pool, PoolConfig } from 'pg'; // v8.11.0
import { config } from 'dotenv'; // v16.3.1
import { HttpStatus } from '../types';

// Load environment variables
config();

// Environment variables with defaults
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_SSL = process.env.DATABASE_SSL === 'true';
const POOL_MAX = parseInt(process.env.POOL_MAX ?? '20');
const POOL_MIN = parseInt(process.env.POOL_MIN ?? '4');
const IDLE_TIMEOUT = parseInt(process.env.IDLE_TIMEOUT ?? '30000');
const CONNECTION_TIMEOUT = parseInt(process.env.CONNECTION_TIMEOUT ?? '2000');

/**
 * SSL configuration for database connections
 */
const sslConfig = {
  rejectUnauthorized: false,
  require: true,
  checkServerIdentity: true,
  minVersion: 'TLSv1.2'
};

/**
 * Retry configuration for connection attempts
 */
const retryConfig = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000
};

/**
 * Creates and configures a PostgreSQL connection pool
 * @returns {Pool} Configured PostgreSQL connection pool
 * @throws {Error} If database URL is not configured
 */
const createDatabasePool = (): Pool => {
  if (!DATABASE_URL) {
    throw new Error('Database URL is not configured');
  }

  const poolConfig: PoolConfig = {
    connectionString: DATABASE_URL,
    max: POOL_MAX,
    min: POOL_MIN,
    idleTimeoutMillis: IDLE_TIMEOUT,
    connectionTimeoutMillis: CONNECTION_TIMEOUT,
    allowExitOnIdle: false,
    application_name: 'task_management_system',
    ssl: DATABASE_SSL ? sslConfig : false
  };

  const pool = new Pool(poolConfig);

  // Error handling for the pool
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  pool.on('connect', () => {
    console.log('New client connected to the pool');
  });

  pool.on('remove', () => {
    console.log('Client removed from the pool');
  });

  return pool;
};

/**
 * Validates database connectivity with retry mechanism
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<boolean>} True if connection successful
 * @throws {Error} If connection fails after retries
 */
const validateDatabaseConnection = async (pool: Pool): Promise<boolean> => {
  let retries = retryConfig.retries;
  let delay = retryConfig.minTimeout;

  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('Database connection validated successfully');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Database connection attempt failed. Retries left: ${retries}`);
      retries--;

      if (retries === 0) {
        const err = new Error('Failed to establish database connection');
        (err as any).status = HttpStatus.INTERNAL_SERVER_ERROR;
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * retryConfig.factor, retryConfig.maxTimeout);
    }
  }

  return false;
};

/**
 * Monitors connection pool health and metrics
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<void>}
 */
const monitorPoolHealth = async (pool: Pool): Promise<void> => {
  const metrics = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };

  console.log('Pool Health Metrics:', {
    ...metrics,
    timestamp: new Date().toISOString()
  });

  // Emit pool health metrics for monitoring systems
  process.emit('poolMetrics', metrics);
};

// Create the database pool instance
const pool = createDatabasePool();

/**
 * Exported database configuration and utilities
 */
export const databaseConfig = {
  /**
   * PostgreSQL connection pool instance
   */
  pool,

  /**
   * Validates database connectivity
   * @returns {Promise<boolean>}
   */
  validateConnection: () => validateDatabaseConnection(pool),

  /**
   * Monitors pool health
   * @returns {Promise<void>}
   */
  monitorHealth: () => monitorPoolHealth(pool)
};