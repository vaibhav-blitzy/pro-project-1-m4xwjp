import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals'; // v29.6.2
import supertest from 'supertest'; // v6.3.3
import { Container } from 'inversify'; // v6.0.1
import { Express } from 'express'; // v4.18.2
import { DatabaseService } from '@types/mongoose'; // v5.11.97

import { NotificationController } from '../../../src/notification-service/controllers/notification.controller';
import { NotificationService } from '../../../src/notification-service/services/notification.service';
import { testUsers } from '../../fixtures/users.fixture';
import { 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority 
} from '../../../src/notification-service/interfaces/notification.interface';
import { HttpStatus } from '../../../src/common/types';

describe('NotificationController Integration Tests', () => {
  let app: Express;
  let container: Container;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let request: supertest.SuperTest<supertest.Test>;
  let dbService: DatabaseService;

  const mockNotification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: testUsers.teamMember.id,
    type: NotificationType.TASK_ASSIGNED,
    title: 'New Task Assignment',
    message: 'You have been assigned a new task',
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.HIGH,
    channels: ['email'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(async () => {
    // Set up dependency injection container
    container = new Container();
    
    // Mock notification service
    notificationServiceMock = {
      sendNotification: jest.fn(),
      getUserNotifications: jest.fn(),
      markAsRead: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    // Configure container bindings
    container.bind(NotificationService).toConstantValue(notificationServiceMock);
    container.bind(NotificationController).toSelf();

    // Initialize test database connection
    dbService = new DatabaseService({
      url: process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/test_db'
    });
    await dbService.connect();

    // Create Express app instance with middleware
    const expressApp = require('express')();
    expressApp.use(require('express').json());
    expressApp.use(require('cors')());
    expressApp.use(require('helmet')());

    // Set up authentication middleware mock
    expressApp.use((req: any, res: any, next: any) => {
      req.user = testUsers.teamMember;
      next();
    });

    // Initialize controller routes
    const controller = container.get(NotificationController);
    expressApp.use('/api/v1/notifications', controller.router);

    app = expressApp;
    request = supertest(app);
  });

  afterAll(async () => {
    await dbService.disconnect();
    jest.clearAllMocks();
  });

  describe('POST /notifications', () => {
    it('should create a notification successfully', async () => {
      // Arrange
      const notificationData = {
        userId: testUsers.teamMember.id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assignment',
        message: 'You have been assigned a new task',
        priority: NotificationPriority.HIGH,
        channels: ['email']
      };

      notificationServiceMock.sendNotification.mockResolvedValueOnce({
        success: true,
        message: 'Notification created successfully',
        data: mockNotification,
        error: null,
        errorCode: null,
        metadata: { correlationId: '123' }
      });

      // Act
      const response = await request
        .post('/api/v1/notifications')
        .send(notificationData)
        .set('Accept', 'application/json')
        .set('x-correlation-id', '123');

      // Assert
      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        success: true,
        message: 'Notification created successfully',
        data: mockNotification,
        timestamp: expect.any(String)
      });
      expect(notificationServiceMock.sendNotification).toHaveBeenCalledWith(
        notificationData,
        expect.any(Object)
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        userId: testUsers.teamMember.id,
        type: 'INVALID_TYPE',
        title: '',
        message: null
      };

      // Act
      const response = await request
        .post('/api/v1/notifications')
        .send(invalidData)
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        message: 'Validation error',
        error: expect.any(Object),
        timestamp: expect.any(String)
      });
    });

    it('should handle rate limiting', async () => {
      // Arrange
      const notificationData = {
        userId: testUsers.teamMember.id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Test',
        message: 'Test'
      };

      // Act
      const promises = Array(101).fill(null).map(() => 
        request
          .post('/api/v1/notifications')
          .send(notificationData)
          .set('Accept', 'application/json')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses[responses.length - 1];

      // Assert
      expect(rateLimitedResponse.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(rateLimitedResponse.body).toEqual({
        success: false,
        message: 'Too many requests from this IP, please try again later',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /notifications', () => {
    it('should retrieve user notifications with pagination', async () => {
      // Arrange
      const mockPaginatedResponse = {
        items: [mockNotification],
        total: 1,
        page: 1,
        totalPages: 1
      };

      notificationServiceMock.getUserNotifications.mockResolvedValueOnce({
        success: true,
        message: 'Notifications retrieved successfully',
        data: mockPaginatedResponse,
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      const response = await request
        .get('/api/v1/notifications')
        .query({ page: 1, limit: 10 })
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: 'Notifications retrieved successfully',
        data: mockPaginatedResponse,
        timestamp: expect.any(String)
      });
      expect(notificationServiceMock.getUserNotifications).toHaveBeenCalledWith(
        testUsers.teamMember.id,
        expect.any(Object),
        { page: 1, limit: 10 }
      );
    });

    it('should handle filtering parameters', async () => {
      // Arrange
      const filters = {
        type: [NotificationType.TASK_ASSIGNED],
        status: [NotificationStatus.PENDING],
        priority: [NotificationPriority.HIGH],
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      // Act
      const response = await request
        .get('/api/v1/notifications')
        .query({ ...filters, page: 1, limit: 10 })
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(notificationServiceMock.getUserNotifications).toHaveBeenCalledWith(
        testUsers.teamMember.id,
        expect.objectContaining(filters),
        { page: 1, limit: 10 }
      );
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark notification as read successfully', async () => {
      // Arrange
      const notificationId = mockNotification.id;
      notificationServiceMock.markAsRead.mockResolvedValueOnce({
        success: true,
        message: 'Notification marked as read',
        data: { ...mockNotification, status: NotificationStatus.READ },
        error: null,
        errorCode: null,
        metadata: null
      });

      // Act
      const response = await request
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: 'Notification marked as read',
        data: expect.objectContaining({
          id: notificationId,
          status: NotificationStatus.READ
        }),
        timestamp: expect.any(String)
      });
      expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith(
        notificationId,
        testUsers.teamMember.id
      );
    });

    it('should handle non-existent notification', async () => {
      // Arrange
      const nonExistentId = '123e4567-e89b-12d3-a456-999999999999';
      notificationServiceMock.markAsRead.mockResolvedValueOnce({
        success: false,
        message: 'Notification not found',
        data: null,
        error: new Error('Notification not found'),
        errorCode: 'NOTIFICATION_NOT_FOUND',
        metadata: null
      });

      // Act
      const response = await request
        .put(`/api/v1/notifications/${nonExistentId}/read`)
        .set('Accept', 'application/json');

      // Assert
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({
        success: false,
        message: 'Notification not found',
        error: 'Notification not found',
        timestamp: expect.any(String)
      });
    });
  });
});