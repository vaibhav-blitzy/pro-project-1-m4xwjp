/**
 * @packageDocumentation
 * @module NotificationService/Models
 * @version 1.0.0
 * 
 * Enhanced Prisma model for notifications with comprehensive tracking and delivery management.
 */

import { Prisma } from '@prisma/client'; // v5.0.0
import { 
  INotification, 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority,
  NotificationFilter
} from '../interfaces/notification.interface';

/**
 * Type definition for paginated notification results
 */
interface PaginatedNotifications {
  items: INotification[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Enhanced Prisma model for notification management with comprehensive tracking
 * and delivery status management capabilities.
 */
export class NotificationModel {
  private prisma: Prisma.NotificationDelegate;

  constructor(prismaClient: Prisma.PrismaClient) {
    this.prisma = prismaClient.notification;
  }

  /**
   * Retrieves notifications for a user with advanced filtering and pagination support.
   * 
   * @param userId - ID of the user to fetch notifications for
   * @param filters - Optional filtering criteria
   * @param pagination - Pagination parameters
   * @returns Promise resolving to paginated notifications
   */
  async findByUserId(
    userId: string,
    filters: NotificationFilter = {},
    pagination: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<PaginatedNotifications> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters.type && { type: { in: filters.type } }),
      ...(filters.status && { status: { in: filters.status } }),
      ...(filters.priority && { priority: { in: filters.priority } }),
      ...(filters.isRead !== undefined && { readAt: filters.isRead ? { not: null } : null }),
      ...(filters.startDate && filters.endDate && {
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }),
      ...(filters.channels && { channels: { hasAny: filters.channels } })
    };

    // Execute count and find queries
    const [total, items] = await Promise.all([
      this.prisma.count({ where }),
      this.prisma.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      })
    ]);

    return {
      items: items as unknown as INotification[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Marks a notification as read and updates the read timestamp.
   * 
   * @param notificationId - ID of the notification to mark as read
   * @returns Promise resolving to updated notification
   */
  async markAsRead(notificationId: string): Promise<INotification> {
    const updatedNotification = await this.prisma.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
        updatedAt: new Date()
      }
    });

    return updatedNotification as unknown as INotification;
  }

  /**
   * Updates notification delivery status and tracks delivery attempts.
   * 
   * @param notificationId - ID of the notification to update
   * @param result - Delivery attempt result
   * @returns Promise resolving to updated notification
   */
  async updateDeliveryStatus(
    notificationId: string,
    result: {
      status: NotificationStatus;
      channel: string;
      errorMessage?: string;
    }
  ): Promise<INotification> {
    const notification = await this.prisma.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Update delivery attempts and status
    const updatedNotification = await this.prisma.update({
      where: { id: notificationId },
      data: {
        status: result.status,
        deliveryAttempts: {
          increment: 1
        },
        metadata: {
          ...notification.metadata,
          lastDeliveryAttempt: {
            timestamp: new Date(),
            channel: result.channel,
            status: result.status,
            errorMessage: result.errorMessage
          }
        },
        updatedAt: new Date()
      }
    });

    return updatedNotification as unknown as INotification;
  }

  /**
   * Creates a new notification with specified delivery channels and tracking.
   * 
   * @param data - Notification creation data
   * @returns Promise resolving to created notification
   */
  async create(data: Omit<INotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<INotification> {
    const notification = await this.prisma.create({
      data: {
        ...data,
        deliveryAttempts: 0,
        status: NotificationStatus.PENDING,
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return notification as unknown as INotification;
  }

  /**
   * Updates an existing notification with partial data.
   * 
   * @param notificationId - ID of the notification to update
   * @param data - Partial update data
   * @returns Promise resolving to updated notification
   */
  async update(
    notificationId: string,
    data: Partial<Omit<INotification, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<INotification> {
    const notification = await this.prisma.update({
      where: { id: notificationId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return notification as unknown as INotification;
  }

  /**
   * Deletes a notification by ID.
   * 
   * @param notificationId - ID of the notification to delete
   * @returns Promise resolving to deleted notification
   */
  async delete(notificationId: string): Promise<INotification> {
    const notification = await this.prisma.delete({
      where: { id: notificationId }
    });

    return notification as unknown as INotification;
  }
}