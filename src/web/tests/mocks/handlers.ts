import { rest } from 'msw'; // v1.3.0
import { API_ENDPOINTS, HTTP_STATUS } from '../../src/constants/api.constants';

const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Mock data generators
const generateAuthTokens = () => ({
  access_token: 'mock-jwt-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer'
});

const generatePaginatedResponse = (data: any[], page: number, limit: number) => ({
  _links: {
    self: { href: `${BASE_URL}${API_ENDPOINTS.PROJECTS.BASE}?page=${page}&limit=${limit}` },
    next: { href: `${BASE_URL}${API_ENDPOINTS.PROJECTS.BASE}?page=${page + 1}&limit=${limit}` },
    prev: page > 1 ? { href: `${BASE_URL}${API_ENDPOINTS.PROJECTS.BASE}?page=${page - 1}&limit=${limit}` } : undefined
  },
  _embedded: { data },
  page,
  limit,
  total: 100
});

// Auth Handlers
const authHandlers = [
  // Login handler
  rest.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, async (req, res, ctx) => {
    const { email, password } = await req.json();
    
    if (email === 'test@example.com' && password === 'valid-password') {
      return res(
        ctx.status(HTTP_STATUS.OK),
        ctx.set('X-RateLimit-Remaining', '999'),
        ctx.json({
          ...generateAuthTokens(),
          requires_mfa: false
        })
      );
    }

    return res(
      ctx.status(HTTP_STATUS.UNAUTHORIZED),
      ctx.json({
        type: 'https://taskmanager.com/errors/invalid-credentials',
        title: 'Invalid credentials',
        status: HTTP_STATUS.UNAUTHORIZED,
        detail: 'The provided credentials are incorrect'
      })
    );
  }),

  // MFA verification
  rest.post(`${BASE_URL}${API_ENDPOINTS.AUTH.MFA_VERIFY}`, async (req, res, ctx) => {
    const { code } = await req.json();
    
    if (code === '123456') {
      return res(
        ctx.status(HTTP_STATUS.OK),
        ctx.json(generateAuthTokens())
      );
    }

    return res(
      ctx.status(HTTP_STATUS.BAD_REQUEST),
      ctx.json({
        type: 'https://taskmanager.com/errors/invalid-mfa-code',
        title: 'Invalid MFA code',
        status: HTTP_STATUS.BAD_REQUEST
      })
    );
  }),

  // Token refresh
  rest.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, async (req, res, ctx) => {
    const { refresh_token } = await req.json();
    
    if (refresh_token === 'mock-refresh-token') {
      return res(
        ctx.status(HTTP_STATUS.OK),
        ctx.json(generateAuthTokens())
      );
    }

    return res(
      ctx.status(HTTP_STATUS.UNAUTHORIZED),
      ctx.json({
        type: 'https://taskmanager.com/errors/invalid-refresh-token',
        title: 'Invalid refresh token',
        status: HTTP_STATUS.UNAUTHORIZED
      })
    );
  })
];

// Project Handlers
const projectHandlers = [
  // List projects with pagination and filtering
  rest.get(`${BASE_URL}${API_ENDPOINTS.PROJECTS.BASE}`, async (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    
    const mockProjects = Array(limit).fill(null).map((_, index) => ({
      id: `proj-${index + 1}`,
      name: `Test Project ${index + 1}`,
      description: 'Project description',
      status: 'active',
      created_at: new Date().toISOString(),
      owner: { id: 'user-1', name: 'Test User' }
    }));

    return res(
      ctx.status(HTTP_STATUS.OK),
      ctx.json(generatePaginatedResponse(mockProjects, page, limit))
    );
  }),

  // Project details
  rest.get(`${BASE_URL}${API_ENDPOINTS.PROJECTS.DETAILS}`, async (req, res, ctx) => {
    return res(
      ctx.status(HTTP_STATUS.OK),
      ctx.json({
        id: req.params.id,
        name: 'Detailed Project',
        description: 'Comprehensive project details',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner: { id: 'user-1', name: 'Test User' },
        _links: {
          self: { href: `${BASE_URL}${API_ENDPOINTS.PROJECTS.DETAILS.replace(':id', req.params.id as string)}` },
          tasks: { href: `${BASE_URL}${API_ENDPOINTS.PROJECTS.TASKS.replace(':id', req.params.id as string)}` }
        }
      })
    );
  })
];

// Task Handlers
const taskHandlers = [
  // List tasks with filtering and pagination
  rest.get(`${BASE_URL}${API_ENDPOINTS.TASKS.BASE}`, async (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    
    const mockTasks = Array(limit).fill(null).map((_, index) => ({
      id: `task-${index + 1}`,
      title: `Test Task ${index + 1}`,
      description: 'Task description',
      status: 'in_progress',
      priority: 'medium',
      due_date: new Date().toISOString(),
      assignee: { id: 'user-1', name: 'Test User' }
    }));

    return res(
      ctx.status(HTTP_STATUS.OK),
      ctx.json(generatePaginatedResponse(mockTasks, page, limit))
    );
  }),

  // Task creation
  rest.post(`${BASE_URL}${API_ENDPOINTS.TASKS.BASE}`, async (req, res, ctx) => {
    const taskData = await req.json();
    
    return res(
      ctx.status(HTTP_STATUS.CREATED),
      ctx.json({
        id: 'new-task-1',
        ...taskData,
        created_at: new Date().toISOString(),
        _links: {
          self: { href: `${BASE_URL}${API_ENDPOINTS.TASKS.DETAILS.replace(':id', 'new-task-1')}` }
        }
      })
    );
  }),

  // Task comments
  rest.get(`${BASE_URL}${API_ENDPOINTS.TASKS.COMMENTS}`, async (req, res, ctx) => {
    const mockComments = Array(5).fill(null).map((_, index) => ({
      id: `comment-${index + 1}`,
      content: `Test comment ${index + 1}`,
      author: { id: 'user-1', name: 'Test User' },
      created_at: new Date().toISOString()
    }));

    return res(
      ctx.status(HTTP_STATUS.OK),
      ctx.json({
        _embedded: { comments: mockComments },
        _links: {
          self: { href: `${BASE_URL}${API_ENDPOINTS.TASKS.COMMENTS.replace(':id', req.params.id as string)}` }
        }
      })
    );
  })
];

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...projectHandlers,
  ...taskHandlers
];