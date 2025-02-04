import { Request, Response } from 'express'; // v4.18.2
import { injectable } from 'inversify'; // v6.0.1
import { controller, httpPost, httpGet, httpPut, authorize, validate } from 'inversify-express-utils'; // v6.4.3
import rateLimit from 'express-rate-limit'; // v6.9.0
import { MonitoringService } from '@company/monitoring'; // v1.0.0
import { IBaseController } from '../../common/interfaces/base-controller.interface';
import { NotificationService } from '../services/notification.service';
import { Logger } from '../../common/utils/logger.util';
import { 
  INotification, 
  CreateNotificationDto, 
  NotificationFilter 
} from '../interfaces/notification.interface';
import { ApiResponse, HttpStatus } from '../../common/types';

/**
 * Enhanced notification controller with comprehensive security,
 * monitoring, and validation features.
 */
@injectable()
@controller('/api/v1/notifications')
@rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later'
})
export class NotificationController implements IBaseController<INotification> {
  private readonly logger: Logger;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly monitoringService: MonitoringService
  ) {
    this.logger = Logger.getInstance();
  }

  /**
   * Creates a new notification with enhanced validation and monitoring
   * 
   * @param req - Request containing notification data
   * @param res - Response object
   * @returns Promise resolving to created notification
   */
  @httpPost('/')
  @authorize(['admin', 'manager'])
  @validate(CreateNotificationDto)
  public async create(
    req: Request<{}, {}, CreateNotificationDto>,
    res: Response
  ): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || Date.now().toString();
    this.logger.setCorrelationId(correlationId);

    try {
      const startTime = Date.now();
      this.monitoringService.incrementCounter('notification.create.attempts');

      const result = await this.notificationService.sendNotification(
        req.body,
        {
          priority: req.body.priority,
          channels: req.body.channels,
          scheduledFor: req.body.scheduledFor,
          metadata: {
            ...req.body.metadata,
            correlationId,
            requestIp: req.ip
          }
        }
      );

      this.monitoringService.recordLatency(
        'notification.create.duration',
        Date.now() - startTime
      );

      if (result.success) {
        this.monitoringService.incrementCounter('notification.create.success');
        return res.status(HttpStatus.CREATED).json({
          success: true,
          message: 'Notification created successfully',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(result.error?.message || 'Failed to create notification');
      }
    } catch (error) {
      this.monitoringService.incrementCounter('notification.create.error');
      this.logger.error('Failed to create notification', error as Error);
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create notification',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Retrieves user notifications with pagination and filtering
   * 
   * @param req - Request with query parameters
   * @param res - Response object
   * @returns Promise resolving to paginated notifications
   */
  @httpGet('/')
  @authorize(['user', 'admin', 'manager'])
  public async getAll(
    req: Request<{}, {}, {}, NotificationFilter & { page: number; limit: number }>,
    res: Response
  ): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || Date.now().toString();
    this.logger.setCorrelationId(correlationId);

    try {
      const startTime = Date.now();
      this.monitoringService.incrementCounter('notification.getAll.attempts');

      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User ID not found in request');
      }

      const result = await this.notificationService.getUserNotifications(
        userId,
        req.query,
        {
          page: parseInt(req.query.page as unknown as string) || 1,
          limit: parseInt(req.query.limit as unknown as string) || 10
        }
      );

      this.monitoringService.recordLatency(
        'notification.getAll.duration',
        Date.now() - startTime
      );

      if (result.success) {
        this.monitoringService.incrementCounter('notification.getAll.success');
        return res.status(HttpStatus.OK).json({
          success: true,
          message: 'Notifications retrieved successfully',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(result.error?.message || 'Failed to retrieve notifications');
      }
    } catch (error) {
      this.monitoringService.incrementCounter('notification.getAll.error');
      this.logger.error('Failed to retrieve notifications', error as Error);
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to retrieve notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Marks a notification as read
   * 
   * @param req - Request with notification ID
   * @param res - Response object
   * @returns Promise resolving to updated notification
   */
  @httpPut('/:id/read')
  @authorize(['user', 'admin', 'manager'])
  public async markAsRead(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || Date.now().toString();
    this.logger.setCorrelationId(correlationId);

    try {
      const startTime = Date.now();
      this.monitoringService.incrementCounter('notification.markAsRead.attempts');

      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User ID not found in request');
      }

      const result = await this.notificationService.markAsRead(
        req.params.id,
        userId
      );

      this.monitoringService.recordLatency(
        'notification.markAsRead.duration',
        Date.now() - startTime
      );

      if (result.success) {
        this.monitoringService.incrementCounter('notification.markAsRead.success');
        return res.status(HttpStatus.OK).json({
          success: true,
          message: 'Notification marked as read',
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(result.error?.message || 'Failed to mark notification as read');
      }
    } catch (error) {
      this.monitoringService.incrementCounter('notification.markAsRead.error');
      this.logger.error('Failed to mark notification as read', error as Error);
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}