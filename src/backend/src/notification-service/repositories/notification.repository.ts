/**
 * @packageDocumentation
 * @module NotificationService/Repositories
 * @version 1.0.0
 * 
 * Enhanced repository layer for notification data access with comprehensive
 * error handling, connection pooling, and audit logging capabilities.
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import { Logger } from 'winston'; // v3.8.0
import { DatabaseError } from '@common/errors'; // v1.0.0
import { INotification } from '../interfaces/notification.interface';
import { NotificationModel } from '../models/notification.model';
import { PaginationParams } from '../../common/interfaces/base-service.interface';

/**
 * Configuration for database connection retry attempts
 */
const DB_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  CONNECTION_TIMEOUT: 5000,
  POOL_SIZE: 10
};

/**
 * Enhanced repository class for notification data access operations with
 * comprehensive error handling, connection pooling, and audit logging.
 */
export class NotificationRepository {
  private prisma: PrismaClient;
  private model: NotificationModel;
  private connectionRetries: number;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.connectionRetries = 0;
    
    // Initialize Prisma with connection pooling
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['error', 'warn'],
      connectionTimeout: DB_CONFIG.CONNECTION_TIMEOUT,
      pool: {
        max: DB_CONFIG.POOL_SIZE
      }
    });

    this.model = new NotificationModel(this.prisma);
    this.initializeDatabase();
  }

  /**
   * Initializes database connection with retry mechanism
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.logger.info('Database connection established successfully');
      this.connectionRetries = 0;
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      if (this.connectionRetries < DB_CONFIG.MAX_RETRIES) {
        this.connectionRetries++;
        this.logger.info(`Retrying connection attempt ${this.connectionRetries}/${DB_CONFIG.MAX_RETRIES}`);
        setTimeout(() => this.initializeDatabase(), DB_CONFIG.RETRY_DELAY);
      } else {
        throw new DatabaseError('Failed to establish database connection after maximum retries');
      }
    }
  }

  /**
   * Creates a new notification with transaction support and audit logging
   * 
   * @param notificationData - Partial notification data
   * @returns Promise resolving to created notification
   * @throws DatabaseError if creation fails
   */
  async create(notificationData: Partial<INotification>): Promise<INotification> {
    const traceId = Date.now().toString();
    this.logger.debug('Starting notification creation', { traceId, data: notificationData });

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create notification
        const notification = await this.model.create(notificationData as any);

        // Create audit log entry
        await prisma.auditLog.create({
          data: {
            entityType: 'notification',
            entityId: notification.id,
            action: 'CREATE',
            userId: notificationData.userId,
            metadata: {
              type: notification.type,
              channels: notification.channels
            }
          }
        });

        return notification;
      });

      this.logger.info('Notification created successfully', { traceId, notificationId: result.id });
      return result;
    } catch (error) {
      this.logger.error('Failed to create notification', { traceId, error });
      throw new DatabaseError('Failed to create notification', { cause: error });
    }
  }

  /**
   * Creates multiple notifications in a single transaction
   * 
   * @param notificationsData - Array of notification data
   * @returns Promise resolving to created notifications
   * @throws DatabaseError if batch creation fails
   */
  async batchCreate(notificationsData: Partial<INotification>[]): Promise<INotification[]> {
    const traceId = Date.now().toString();
    this.logger.debug('Starting batch notification creation', { 
      traceId, 
      count: notificationsData.length 
    });

    try {
      const results = await this.prisma.$transaction(async (prisma) => {
        const notifications = await Promise.all(
          notificationsData.map(data => this.model.create(data as any))
        );

        // Create audit log entries
        await prisma.auditLog.createMany({
          data: notifications.map(notification => ({
            entityType: 'notification',
            entityId: notification.id,
            action: 'BATCH_CREATE',
            userId: notification.userId,
            metadata: {
              type: notification.type,
              channels: notification.channels
            }
          }))
        });

        return notifications;
      });

      this.logger.info('Batch notification creation successful', { 
        traceId, 
        count: results.length 
      });
      return results;
    } catch (error) {
      this.logger.error('Failed to create notifications in batch', { traceId, error });
      throw new DatabaseError('Failed to create notifications in batch', { cause: error });
    }
  }

  /**
   * Retrieves user notifications with caching support
   * 
   * @param userId - User ID to fetch notifications for
   * @param options - Pagination parameters
   * @returns Promise resolving to notifications array
   * @throws DatabaseError if retrieval fails
   */
  async findByUserIdWithCache(
    userId: string,
    options: PaginationParams
  ): Promise<INotification[]> {
    const cacheKey = `notifications:${userId}:${JSON.stringify(options)}`;
    const traceId = Date.now().toString();

    try {
      // Check cache first
      const cachedData = await this.prisma.$queryRaw`
        SELECT * FROM notification_cache WHERE key = ${cacheKey}
      `;

      if (cachedData) {
        this.logger.debug('Returning cached notifications', { traceId, userId });
        return JSON.parse(cachedData as string);
      }

      // Cache miss - fetch from database
      const notifications = await this.model.findByUserId(
        userId,
        {},
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder as 'asc' | 'desc'
        }
      );

      // Update cache
      await this.prisma.$executeRaw`
        INSERT INTO notification_cache (key, value, created_at)
        VALUES (${cacheKey}, ${JSON.stringify(notifications)}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, created_at = NOW()
      `;

      this.logger.info('Successfully retrieved notifications', { 
        traceId, 
        userId, 
        count: notifications.items.length 
      });
      return notifications.items;
    } catch (error) {
      this.logger.error('Failed to retrieve notifications', { traceId, userId, error });
      throw new DatabaseError('Failed to retrieve notifications', { cause: error });
    }
  }

  /**
   * Cleanup method to be called during application shutdown
   */
  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.info('Database connection closed successfully');
    } catch (error) {
      this.logger.error('Error during database cleanup:', error);
    }
  }
}