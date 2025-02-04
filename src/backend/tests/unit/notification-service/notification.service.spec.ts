import { jest } from '@jest/globals'; // v29.6.2
import { Channel } from 'amqplib'; // v0.10.3
import { NotificationService } from '../../../src/notification-service/services/notification.service';
import { NotificationRepository } from '../../../src/notification-service/repositories/notification.repository';
import { testUsers } from '../../fixtures/users.fixture';
import { 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority 
} from '../../../src/notification-service/interfaces/notification.interface';
import { EmailService } from '../../../src/notification-service/services/email.service';
import { RateLimiter } from 'rate-limiter-flexible';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let notificationRepositoryMock: jest.Mocked<NotificationRepository>;
  let emailServiceMock: jest.Mocked<EmailService>;
  let channelMock: jest.Mocked<Channel>;
  let rateLimiterMock: jest.Mocked<RateLimiter>;

  beforeEach(() => {
    // Setup repository mock
    notificationRepositoryMock = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      markAsRead: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      findFailedNotifications: jest.fn()
    } as any;

    // Setup email service mock
    emailServiceMock = {
      sendEmail: jest.fn(),
      processEmailQueue: jest.fn(),
      handleBounce: jest.fn()
    } as any;

    // Setup RabbitMQ channel mock
    channelMock = {
      assertQueue: jest.fn(),
      consume: jest.fn(),
      publish: jest.fn(),
      ack: jest.fn(),
      reject: jest.fn()
    } as any;

    // Setup rate limiter mock
    rateLimiterMock = {
      consume: jest.fn(),
      penalty: jest.fn(),
      reward: jest.fn()
    } as any;

    // Initialize service with mocks
    notificationService = new NotificationService(
      notificationRepositoryMock,
      emailServiceMock,
      channelMock,
      rateLimiterMock
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    const testNotification = {
      userId: testUsers.teamMember.id,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: 'You have been assigned a new task',
      priority: NotificationPriority.HIGH,
      channels: ['email']
    };

    it('should successfully create and queue a notification', async () => {
      // Setup mocks
      rateLimiterMock.consume.mockResolvedValue(undefined);
      notificationRepositoryMock.create.mockResolvedValue({
        ...testNotification,
        id: 'test-id',
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      channelMock.publish.mockResolvedValue(true);

      // Execute test
      const result = await notificationService.sendNotification(testNotification);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(notificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testNotification.userId,
          type: testNotification.type,
          status: NotificationStatus.PENDING
        })
      );
      expect(channelMock.publish).toHaveBeenCalled();
    });

    it('should handle rate limiting correctly', async () => {
      // Setup rate limiter to reject
      rateLimiterMock.consume.mockRejectedValue(new Error('Rate limit exceeded'));

      // Execute test
      const result = await notificationService.sendNotification(testNotification);

      // Verify results
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOTIFICATION_SEND_ERROR');
      expect(notificationRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('should handle scheduled notifications', async () => {
      // Setup mocks
      rateLimiterMock.consume.mockResolvedValue(undefined);
      const scheduledDate = new Date(Date.now() + 3600000); // 1 hour from now
      
      const notification = {
        ...testNotification,
        id: 'test-id',
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      notificationRepositoryMock.create.mockResolvedValue(notification as any);

      // Execute test
      const result = await notificationService.sendNotification(testNotification, {
        scheduledFor: scheduledDate
      });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(notificationRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            scheduledFor: scheduledDate
          })
        })
      );
    });
  });

  describe('markAsRead', () => {
    const notificationId = 'test-notification-id';
    const userId = testUsers.teamMember.id;

    it('should successfully mark a notification as read', async () => {
      // Setup mock
      notificationRepositoryMock.markAsRead.mockResolvedValue({
        id: notificationId,
        status: NotificationStatus.READ,
        readAt: new Date()
      } as any);

      // Execute test
      const result = await notificationService.markAsRead(notificationId, userId);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(NotificationStatus.READ);
      expect(notificationRepositoryMock.markAsRead).toHaveBeenCalledWith(notificationId);
    });

    it('should handle errors when marking as read', async () => {
      // Setup mock to fail
      notificationRepositoryMock.markAsRead.mockRejectedValue(new Error('Database error'));

      // Execute test
      const result = await notificationService.markAsRead(notificationId, userId);

      // Verify results
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOTIFICATION_UPDATE_ERROR');
    });
  });

  describe('getUserNotifications', () => {
    const userId = testUsers.teamMember.id;
    const filter = {
      type: [NotificationType.TASK_ASSIGNED],
      status: [NotificationStatus.PENDING]
    };
    const options = { page: 1, limit: 10 };

    it('should successfully retrieve user notifications', async () => {
      // Setup mock
      const mockNotifications = {
        items: [
          {
            id: 'test-id',
            userId,
            type: NotificationType.TASK_ASSIGNED,
            status: NotificationStatus.PENDING
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      notificationRepositoryMock.findByUserId.mockResolvedValue(mockNotifications as any);

      // Execute test
      const result = await notificationService.getUserNotifications(userId, filter, options);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(notificationRepositoryMock.findByUserId).toHaveBeenCalledWith(
        userId,
        filter,
        options
      );
    });

    it('should handle errors when retrieving notifications', async () => {
      // Setup mock to fail
      notificationRepositoryMock.findByUserId.mockRejectedValue(new Error('Database error'));

      // Execute test
      const result = await notificationService.getUserNotifications(userId, filter, options);

      // Verify results
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOTIFICATION_FETCH_ERROR');
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications with exponential backoff', async () => {
      // Setup mocks
      const failedNotification = {
        id: 'test-id',
        type: NotificationType.TASK_ASSIGNED,
        status: NotificationStatus.FAILED,
        deliveryAttempts: 2
      };

      notificationRepositoryMock.findFailedNotifications.mockResolvedValue([
        failedNotification
      ] as any);

      // Execute test
      await notificationService['processNotificationQueue']();

      // Verify channel setup
      expect(channelMock.assertQueue).toHaveBeenCalled();
      expect(channelMock.consume).toHaveBeenCalled();

      // Simulate message processing
      const consumeCallback = channelMock.consume.mock.calls[0][1];
      await consumeCallback({
        content: Buffer.from(JSON.stringify(failedNotification)),
        properties: { headers: { 'x-retry-count': 2 } }
      } as any);

      // Verify retry behavior
      expect(notificationRepositoryMock.updateDeliveryStatus).toHaveBeenCalled();
    });
  });
});