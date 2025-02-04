import express, { Router } from 'express'; // v4.18.2
import createHttpError from 'http-errors'; // v2.0.0

import { gatewayConfig } from '../config/gateway-config';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { createValidationMiddleware } from '../middleware/validation.middleware';
import { Logger } from '../../common/utils/logger.util';
import { UserRole } from '../../user-service/interfaces/user.interface';
import { ErrorCodes } from '../../common/constants/error-codes';

// Initialize router and logger
const router = Router();
const logger = Logger.getInstance();

/**
 * Configures authentication routes with enhanced security
 */
function configureAuthRoutes(): Router {
  const authRouter = Router();

  // Apply IP-based rate limiting for auth endpoints
  authRouter.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    keyPrefix: 'auth-rate-limit:',
  }));

  // Login route
  authRouter.post('/login', createValidationMiddleware(/* loginSchema */), async (req, res, next) => {
    try {
      const authService = req.app.get('authService');
      const result = await authService.login(req.validatedData);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Register route
  authRouter.post('/register', createValidationMiddleware(/* registerSchema */), async (req, res, next) => {
    try {
      const authService = req.app.get('authService');
      const result = await authService.register(req.validatedData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  // Token refresh route
  authRouter.post('/refresh-token', async (req, res, next) => {
    try {
      const authService = req.app.get('authService');
      const result = await authService.refreshToken(req.body.refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return authRouter;
}

/**
 * Configures user management routes with role-based access control
 */
function configureUserRoutes(): Router {
  const userRouter = Router();

  // Apply authentication and rate limiting
  userRouter.use(authenticate);
  userRouter.use(rateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    keyPrefix: 'user-rate-limit:',
  }));

  // Get users (admin only)
  userRouter.get('/', authorize({
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true
  }), async (req, res, next) => {
    try {
      const userService = req.app.get('userService');
      const users = await userService.findAll(req.query);
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Get user profile
  userRouter.get('/profile', async (req, res, next) => {
    try {
      const userService = req.app.get('userService');
      const user = await userService.findById(req.user!.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  return userRouter;
}

/**
 * Configures project management routes with granular permissions
 */
function configureProjectRoutes(): Router {
  const projectRouter = Router();

  // Apply authentication and rate limiting
  projectRouter.use(authenticate);
  projectRouter.use(rateLimitMiddleware({
    windowMs: 60 * 60 * 1000,
    maxRequests: 2000,
    keyPrefix: 'project-rate-limit:',
  }));

  // Create project
  projectRouter.post('/', authorize({
    allowedRoles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    requireAuth: true
  }), createValidationMiddleware(/* projectSchema */), async (req, res, next) => {
    try {
      const projectService = req.app.get('projectService');
      const project = await projectService.create(req.validatedData);
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  });

  // Get project list
  projectRouter.get('/', async (req, res, next) => {
    try {
      const projectService = req.app.get('projectService');
      const projects = await projectService.findAll(req.query);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  return projectRouter;
}

/**
 * Configures task management routes with advanced features
 */
function configureTaskRoutes(): Router {
  const taskRouter = Router();

  // Apply authentication and rate limiting
  taskRouter.use(authenticate);
  taskRouter.use(rateLimitMiddleware({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5000,
    keyPrefix: 'task-rate-limit:',
  }));

  // Create task
  taskRouter.post('/', createValidationMiddleware(/* taskSchema */), async (req, res, next) => {
    try {
      const taskService = req.app.get('taskService');
      const task = await taskService.create(req.validatedData);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  // Get task list
  taskRouter.get('/', async (req, res, next) => {
    try {
      const taskService = req.app.get('taskService');
      const tasks = await taskService.findAll(req.query);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  return taskRouter;
}

/**
 * Configures notification routes with real-time support
 */
function configureNotificationRoutes(): Router {
  const notificationRouter = Router();

  // Apply authentication and rate limiting
  notificationRouter.use(authenticate);
  notificationRouter.use(rateLimitMiddleware({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3000,
    keyPrefix: 'notification-rate-limit:',
  }));

  // Get user notifications
  notificationRouter.get('/', async (req, res, next) => {
    try {
      const notificationService = req.app.get('notificationService');
      const notifications = await notificationService.findByUserId(req.user!.id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  });

  return notificationRouter;
}

// Configure all routes
router.use(gatewayConfig.serviceRoutes.auth, configureAuthRoutes());
router.use(gatewayConfig.serviceRoutes.users, configureUserRoutes());
router.use(gatewayConfig.serviceRoutes.projects, configureProjectRoutes());
router.use(gatewayConfig.serviceRoutes.tasks, configureTaskRoutes());
router.use(gatewayConfig.serviceRoutes.notifications, configureNotificationRoutes());

// Error handling middleware
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Route error', err);
  
  if (createHttpError.isHttpError(err)) {
    res.status(err.status).json({
      type: `https://api.taskmanager.com/errors/${err.status}`,
      title: err.message,
      status: err.status,
      detail: err.message,
      errorCode: ErrorCodes.INTERNAL_SERVER_ERROR
    });
    return;
  }

  res.status(500).json({
    type: 'https://api.taskmanager.com/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message,
    errorCode: ErrorCodes.INTERNAL_SERVER_ERROR
  });
});

export default router;