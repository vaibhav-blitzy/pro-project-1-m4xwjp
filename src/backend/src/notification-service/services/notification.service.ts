import { injectable, inject } from 'inversify'; // v6.1.1
import * as amqp from 'amqplib'; // v0.10.3
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { Logger } from '../../common/utils/logger.util';
import { ServiceResponse } from '../../common/interfaces/base-service.interface';
import { 
  INotification, 
  NotificationType, 
  NotificationStatus,
  NotificationPriority,
  CreateNotificationDto,
  NotificationFilter,
  NotificationOptions
} from '../interfaces/notification.interface';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { RABBITMQ_CONFIG } from '../../common/config/rabbitmq.config';

// Retry policy configuration per notification type
interface RetryPolicy {
  maxAttempts: number;
  backoffInterval: number;
  priority: number;
}

@injectable()
export class NotificationService {
  private readonly logger: Logger;
  private readonly retryPolicies: Map<NotificationType, RetryPolicy>;
  private readonly rateLimiter: RateLimiter;

  constructor(
    @inject(NotificationRepository) private notificationRepository: NotificationRepository,
    @inject(EmailService) private emailService: EmailService,
    @inject('RabbitMQChannel') private channel: amqp.Channel,
    @inject('RateLimiter') rateLimiter: RateLimiter
  ) {
    this.logger = Logger.getInstance();
    this.rateLimiter = rateLimiter;
    this.retryPolicies = this.initializeRetryPolicies();
    this.setupQueueConsumer();
  }

  /**
   * Sends a notification with comprehensive delivery tracking and retry handling
   */
  public async sendNotification(
    notificationData: CreateNotificationDto,
    options: NotificationOptions = {}
  ): Promise<ServiceResponse<INotification>> {
    const correlationId = Date.now().toString();
    this.logger.setCorrelationId(correlationId);

    try {
      // Rate limiting check
      await this.rateLimiter.consume(notificationData.userId);

      // Create notification record
      const notification = await this.notificationRepository.create({
        ...notificationData,
        status: NotificationStatus.PENDING,
        priority: options.priority || NotificationPriority.NORMAL,
        channels: options.channels || ['email'],
        metadata: {
          ...options.metadata,
          correlationId,
          scheduledFor: options.scheduledFor
        }
      });

      // Queue for delivery if scheduled for later
      if (options.scheduledFor && options.scheduledFor > new Date()) {
        await this.scheduleNotification(notification, options);
      } else {
        await this.queueNotification(notification);
      }

      return {
        success: true,
        message: 'Notification queued successfully',
        data: notification,
        error: null,
        errorCode: null,
        metadata: { correlationId }
      };
    } catch (error) {
      this.logger.error('Failed to send notification', error as Error);
      return {
        success: false,
        message: 'Failed to send notification',
        data: null,
        error: error as Error,
        errorCode: 'NOTIFICATION_SEND_ERROR',
        metadata: { correlationId }
      };
    }
  }

  /**
   * Processes notifications from the queue with retry handling
   */
  private async processNotificationQueue(): Promise<void> {
    try {
      await this.channel.assertQueue(RABBITMQ_CONFIG.queues.notifications, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': RABBITMQ_CONFIG.deadLetterExchange,
          'x-message-ttl': 86400000 // 24 hours
        }
      });

      this.channel.consume(
        RABBITMQ_CONFIG.queues.notifications,
        async (msg) => {
          if (!msg) return;

          const notification = JSON.parse(msg.content.toString()) as INotification;
          const retryPolicy = this.retryPolicies.get(notification.type);

          try {
            const success = await this.deliverNotification(notification);
            
            if (success) {
              this.channel.ack(msg);
            } else {
              const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;
              
              if (retryCount <= (retryPolicy?.maxAttempts || 3)) {
                const delay = this.calculateBackoff(retryCount, retryPolicy);
                await this.scheduleRetry(notification, retryCount, delay);
                this.channel.ack(msg);
              } else {
                await this.handleDeliveryFailure(notification);
                this.channel.reject(msg, false);
              }
            }
          } catch (error) {
            this.logger.error('Error processing notification', error as Error);
            this.channel.reject(msg, false);
          }
        },
        { noAck: false }
      );
    } catch (error) {
      this.logger.error('Failed to process notification queue', error as Error);
      throw error;
    }
  }

  /**
   * Delivers notification through configured channels
   */
  private async deliverNotification(notification: INotification): Promise<boolean> {
    try {
      await this.notificationRepository.updateDeliveryStatus(notification.id, {
        status: NotificationStatus.DELIVERING,
        channel: 'email'
      });

      if (notification.channels.includes('email')) {
        await this.emailService.sendEmail(
          notification.userId,
          {
            subject: notification.title,
            templateId: this.getTemplateId(notification.type),
            data: notification.metadata,
            priority: notification.priority as 'high' | 'normal' | 'low'
          },
          notification.metadata.correlationId
        );
      }

      await this.notificationRepository.updateDeliveryStatus(notification.id, {
        status: NotificationStatus.DELIVERED,
        channel: 'email'
      });

      return true;
    } catch (error) {
      this.logger.error('Notification delivery failed', error as Error);
      return false;
    }
  }

  /**
   * Marks a notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<ServiceResponse<INotification>> {
    try {
      const notification = await this.notificationRepository.markAsRead(notificationId);
      
      return {
        success: true,
        message: 'Notification marked as read',
        data: notification,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark notification as read',
        data: null,
        error: error as Error,
        errorCode: 'NOTIFICATION_UPDATE_ERROR',
        metadata: null
      };
    }
  }

  /**
   * Retrieves user notifications with filtering and pagination
   */
  public async getUserNotifications(
    userId: string,
    filter: NotificationFilter,
    options: { page: number; limit: number }
  ): Promise<ServiceResponse<{ items: INotification[]; total: number; page: number; totalPages: number }>> {
    try {
      const notifications = await this.notificationRepository.findByUserIdWithCache(userId, {
        page: options.page,
        limit: options.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: filter
      });

      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
        error: null,
        errorCode: null,
        metadata: null
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve notifications',
        data: null,
        error: error as Error,
        errorCode: 'NOTIFICATION_FETCH_ERROR',
        metadata: null
      };
    }
  }

  // Private helper methods
  private initializeRetryPolicies(): Map<NotificationType, RetryPolicy> {
    const policies = new Map<NotificationType, RetryPolicy>();
    
    policies.set(NotificationType.TASK_ASSIGNED, {
      maxAttempts: 5,
      backoffInterval: 5000,
      priority: 2
    });
    
    policies.set(NotificationType.DUE_DATE_REMINDER, {
      maxAttempts: 3,
      backoffInterval: 10000,
      priority: 1
    });

    // Add policies for other notification types...
    
    return policies;
  }

  private async queueNotification(notification: INotification): Promise<void> {
    await this.channel.publish(
      RABBITMQ_CONFIG.exchange,
      RABBITMQ_CONFIG.queues.notifications,
      Buffer.from(JSON.stringify(notification)),
      {
        persistent: true,
        priority: this.retryPolicies.get(notification.type)?.priority || 1,
        headers: { 'x-retry-count': 0 }
      }
    );
  }

  private async scheduleNotification(
    notification: INotification,
    options: NotificationOptions
  ): Promise<void> {
    const delay = options.scheduledFor!.getTime() - Date.now();
    setTimeout(() => this.queueNotification(notification), delay);
  }

  private calculateBackoff(retryCount: number, policy?: RetryPolicy): number {
    const baseInterval = policy?.backoffInterval || 5000;
    return baseInterval * Math.pow(2, retryCount - 1);
  }

  private async scheduleRetry(
    notification: INotification,
    retryCount: number,
    delay: number
  ): Promise<void> {
    setTimeout(
      () => this.queueNotification(notification),
      delay
    );
  }

  private async handleDeliveryFailure(notification: INotification): Promise<void> {
    await this.notificationRepository.updateDeliveryStatus(notification.id, {
      status: NotificationStatus.FAILED,
      channel: 'email',
      errorMessage: 'Max retry attempts exceeded'
    });
  }

  private getTemplateId(type: NotificationType): string {
    // Map notification types to template IDs
    const templateMap: Record<NotificationType, string> = {
      [NotificationType.TASK_ASSIGNED]: 'template_task_assigned',
      [NotificationType.DUE_DATE_REMINDER]: 'template_due_date_reminder'
      // Add other template mappings...
    };
    
    return templateMap[type] || 'template_default';
  }

  private async setupQueueConsumer(): Promise<void> {
    await this.processNotificationQueue();
    this.logger.info('Notification queue consumer initialized');
  }
}