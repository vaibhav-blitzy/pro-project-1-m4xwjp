import * as amqp from 'amqplib'; // v0.10.3
import { Logger } from '../utils/logger.util';

/**
 * RabbitMQ Configuration
 * Provides comprehensive settings for message broker configuration including
 * connection parameters, exchanges, queues, and reliability options.
 */
export const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  exchange: process.env.RABBITMQ_EXCHANGE || 'task_management',
  deadLetterExchange: process.env.RABBITMQ_DLX || 'task_management_dlx',
  queues: {
    notifications: 'notifications_queue',
    tasks: 'tasks_queue',
    projects: 'projects_queue',
    deadLetter: 'dead_letter_queue'
  },
  retryOptions: {
    attempts: 5,
    interval: 5000,
    backoff: 'exponential' as const
  },
  queueOptions: {
    messageTtl: 86400000, // 24 hours
    maxLength: 10000,
    durable: true,
    prefetchCount: 10
  },
  ssl: {
    enabled: process.env.RABBITMQ_SSL_ENABLED === 'true',
    cert: process.env.RABBITMQ_SSL_CERT,
    key: process.env.RABBITMQ_SSL_KEY,
    ca: process.env.RABBITMQ_SSL_CA
  }
} as const;

/**
 * Creates a connection to RabbitMQ with enhanced reliability features
 * including automatic reconnection and SSL support.
 */
export async function createConnection(): Promise<amqp.Connection> {
  const logger = Logger.getInstance();
  let retryCount = 0;
  
  const connect = async (): Promise<amqp.Connection> => {
    try {
      const options: amqp.Options.Connect = {
        heartbeat: 60,
        timeout: 30000,
      };

      // Configure SSL if enabled
      if (RABBITMQ_CONFIG.ssl.enabled) {
        options.cert = RABBITMQ_CONFIG.ssl.cert;
        options.key = RABBITMQ_CONFIG.ssl.key;
        options.ca = RABBITMQ_CONFIG.ssl.ca;
      }

      const connection = await amqp.connect(RABBITMQ_CONFIG.url, options);

      connection.on('error', (error) => {
        logger.error('RabbitMQ connection error', error);
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        retryConnection();
      });

      connection.on('blocked', (reason) => {
        logger.warn('RabbitMQ connection blocked', { reason });
      });

      connection.on('unblocked', () => {
        logger.info('RabbitMQ connection unblocked');
      });

      logger.info('RabbitMQ connection established');
      return connection;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error as Error);
      throw error;
    }
  };

  const retryConnection = async (): Promise<void> => {
    if (retryCount < RABBITMQ_CONFIG.retryOptions.attempts) {
      retryCount++;
      const delay = RABBITMQ_CONFIG.retryOptions.backoff === 'exponential'
        ? RABBITMQ_CONFIG.retryOptions.interval * Math.pow(2, retryCount - 1)
        : RABBITMQ_CONFIG.retryOptions.interval;

      logger.info('Retrying RabbitMQ connection', { attempt: retryCount, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
      return connect();
    }
    throw new Error('Max retry attempts reached');
  };

  return connect();
}

/**
 * Creates a channel on an existing RabbitMQ connection with advanced error handling
 * and flow control monitoring.
 */
export async function createChannel(connection: amqp.Connection): Promise<amqp.Channel> {
  const logger = Logger.getInstance();

  try {
    const channel = await connection.createConfirmChannel();
    
    // Configure channel settings
    await channel.prefetch(RABBITMQ_CONFIG.queueOptions.prefetchCount);

    // Assert exchanges
    await channel.assertExchange(RABBITMQ_CONFIG.exchange, 'topic', {
      durable: true,
      autoDelete: false
    });

    await channel.assertExchange(RABBITMQ_CONFIG.deadLetterExchange, 'topic', {
      durable: true,
      autoDelete: false
    });

    channel.on('error', (error) => {
      logger.error('Channel error', error as Error);
    });

    channel.on('return', (msg) => {
      logger.warn('Message returned', { 
        message: msg.content.toString(),
        routingKey: msg.fields.routingKey 
      });
    });

    channel.on('drain', () => {
      logger.info('Channel drain event - write buffer empty');
    });

    logger.info('RabbitMQ channel created');
    return channel;
  } catch (error) {
    logger.error('Failed to create channel', error as Error);
    throw error;
  }
}

/**
 * Sets up queues with comprehensive configuration including dead letter exchanges,
 * TTL, and monitoring.
 */
export async function setupQueues(channel: amqp.Channel): Promise<void> {
  const logger = Logger.getInstance();

  try {
    // Setup dead letter queue
    await channel.assertQueue(RABBITMQ_CONFIG.queues.deadLetter, {
      durable: true,
      arguments: {
        'x-max-length': RABBITMQ_CONFIG.queueOptions.maxLength,
        'x-overflow': 'reject-publish'
      }
    });

    await channel.bindQueue(
      RABBITMQ_CONFIG.queues.deadLetter,
      RABBITMQ_CONFIG.deadLetterExchange,
      '#'
    );

    // Common queue options
    const queueOptions: amqp.Options.AssertQueue = {
      durable: RABBITMQ_CONFIG.queueOptions.durable,
      arguments: {
        'x-dead-letter-exchange': RABBITMQ_CONFIG.deadLetterExchange,
        'x-message-ttl': RABBITMQ_CONFIG.queueOptions.messageTtl,
        'x-max-length': RABBITMQ_CONFIG.queueOptions.maxLength,
        'x-overflow': 'reject-publish'
      }
    };

    // Setup main queues
    const queues = Object.values(RABBITMQ_CONFIG.queues).filter(q => q !== RABBITMQ_CONFIG.queues.deadLetter);
    
    for (const queue of queues) {
      await channel.assertQueue(queue, queueOptions);
      await channel.bindQueue(queue, RABBITMQ_CONFIG.exchange, `${queue}.*`);
      logger.info('Queue configured', { queue });
    }

    logger.info('All queues configured successfully');
  } catch (error) {
    logger.error('Failed to setup queues', error as Error);
    throw error;
  }
}