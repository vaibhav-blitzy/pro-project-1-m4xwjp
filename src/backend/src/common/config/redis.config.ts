import Redis, { RedisOptions, Cluster } from 'ioredis'; // v5.3.2
import { Logger } from '../utils/logger.util';

/**
 * Default Redis configuration with comprehensive settings
 */
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'tms:',
  enableCluster: process.env.REDIS_CLUSTER_ENABLED === 'true',
  clusterNodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
  connectionPool: {
    minConnections: parseInt(process.env.REDIS_MIN_CONNECTIONS || '5'),
    maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '20'),
    idleTimeout: parseInt(process.env.REDIS_IDLE_TIMEOUT || '10000')
  },
  retryStrategy: {
    maxAttempts: parseInt(process.env.REDIS_RETRY_MAX_ATTEMPTS || '5'),
    initialDelay: parseInt(process.env.REDIS_RETRY_INITIAL_DELAY || '1000'),
    maxDelay: parseInt(process.env.REDIS_RETRY_MAX_DELAY || '5000')
  },
  healthCheck: {
    enabled: process.env.REDIS_HEALTH_CHECK_ENABLED === 'true',
    interval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '30000'),
    memoryThreshold: parseInt(process.env.REDIS_MEMORY_THRESHOLD || '80')
  }
};

/**
 * Validates Redis configuration options with enhanced validation rules
 */
export function validateRedisConfig(config: RedisOptions): boolean {
  const logger = Logger.getInstance();

  try {
    if (!config.host || !config.port) {
      throw new Error('Redis host and port are required');
    }

    if (config.port < 1 || config.port > 65535) {
      throw new Error('Invalid Redis port number');
    }

    if (REDIS_CONFIG.enableCluster && (!REDIS_CONFIG.clusterNodes || REDIS_CONFIG.clusterNodes.length === 0)) {
      throw new Error('Cluster nodes must be specified when cluster mode is enabled');
    }

    if (REDIS_CONFIG.connectionPool.maxConnections < REDIS_CONFIG.connectionPool.minConnections) {
      throw new Error('Max connections must be greater than min connections');
    }

    return true;
  } catch (error) {
    logger.error('Redis configuration validation failed', error as Error);
    return false;
  }
}

/**
 * Creates and configures a Redis client instance with advanced options and monitoring
 */
export function createRedisClient(options: RedisOptions): Redis | Cluster {
  const logger = Logger.getInstance();

  if (!validateRedisConfig(options)) {
    throw new Error('Invalid Redis configuration');
  }

  const redisOptions: RedisOptions = {
    ...options,
    retryStrategy: (times: number) => {
      const delay = Math.min(
        REDIS_CONFIG.retryStrategy.initialDelay * Math.pow(2, times),
        REDIS_CONFIG.retryStrategy.maxDelay
      );
      
      if (times > REDIS_CONFIG.retryStrategy.maxAttempts) {
        logger.error('Max retry attempts reached', new Error('Redis connection failed'));
        return null;
      }
      
      return delay;
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: true
  };

  const client = REDIS_CONFIG.enableCluster
    ? new Redis.Cluster(REDIS_CONFIG.clusterNodes.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      }), {
        ...redisOptions,
        clusterRetryStrategy: redisOptions.retryStrategy
      })
    : new Redis(redisOptions);

  // Event handlers
  client.on('connect', () => {
    logger.info('Redis client connected', { host: options.host, port: options.port });
  });

  client.on('error', (error) => {
    logger.error('Redis client error', error as Error);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed', { host: options.host, port: options.port });
  });

  // Health monitoring
  if (REDIS_CONFIG.healthCheck.enabled) {
    setInterval(async () => {
      try {
        const info = await client.info('memory');
        const usedMemory = parseInt(info.match(/used_memory_rss:(\d+)/)?.[1] || '0');
        const totalMemory = parseInt(info.match(/total_system_memory:(\d+)/)?.[1] || '0');
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;

        if (memoryUsagePercent > REDIS_CONFIG.healthCheck.memoryThreshold) {
          logger.warn('Redis memory usage above threshold', {
            usedMemory,
            totalMemory,
            memoryUsagePercent
          });
        }
      } catch (error) {
        logger.error('Redis health check failed', error as Error);
      }
    }, REDIS_CONFIG.healthCheck.interval);
  }

  return client;
}

/**
 * Redis Manager class for handling Redis client lifecycle and monitoring
 */
export class RedisManager {
  private client: Redis | Cluster;
  private logger: Logger;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private config: RedisOptions) {
    this.logger = Logger.getInstance();
  }

  /**
   * Establishes Redis connection with enhanced retry mechanism
   */
  public async connect(): Promise<void> {
    try {
      this.client = createRedisClient(this.config);
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  /**
   * Gracefully closes Redis connections with cleanup
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      await this.client.quit();
      this.logger.info('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error as Error);
      throw error;
    }
  }

  /**
   * Performs comprehensive Redis health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const ping = await this.client.ping();
      if (ping !== 'PONG') {
        throw new Error('Redis health check failed');
      }
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', error as Error);
      return false;
    }
  }
}