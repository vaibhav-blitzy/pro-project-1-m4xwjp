import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { axe } from '@axe-core/react';
import { rest } from 'msw';
import Overview from '../../src/pages/dashboard/Overview';
import server, { use, resetHandlers } from '../../mocks/server';

// Mock data for tests
const mockMetricsData = {
  completionRate: 75,
  completionRateChange: 5,
  userAdoption: 85,
  userAdoptionChange: 10,
  efficiency: 90,
  efficiencyChange: 15,
  activeProjects: 12,
  activeProjectsChange: 2
};

const mockTasksData = [
  {
    id: 'task-1',
    title: 'Implement authentication',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2023-10-25T00:00:00Z',
    assignee: { id: 'user-1', name: 'John Doe' }
  },
  {
    id: 'task-2',
    title: 'Design dashboard layout',
    status: 'todo',
    priority: 'medium',
    dueDate: '2023-10-26T00:00:00Z',
    assignee: { id: 'user-2', name: 'Jane Smith' }
  }
];

const mockProjectsData = [
  {
    id: 'proj-1',
    name: 'Task Management System',
    description: 'Core system implementation',
    status: 'active',
    priority: 'high',
    progress: 65,
    owner: { id: 'user-1', name: 'John Doe' },
    members: [{ id: 'user-2', name: 'Jane Smith' }]
  }
];

// Helper function to render component with Redux Provider
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        task: (state = { tasks: [], metrics: null, status: 'idle' }) => state
      },
      preloadedState
    }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Helper function to setup metrics API mock
const setupMetricsMock = (mockData = mockMetricsData, statusCode = 200) => {
  use(
    rest.get('/api/v1/metrics', (req, res, ctx) => {
      return res(ctx.status(statusCode), ctx.json(mockData));
    })
  );
};

describe('Dashboard Overview Component', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    resetHandlers();
    jest.clearAllMocks();
  });
  afterAll(() => server.close());

  describe('Rendering and Layout', () => {
    it('renders metrics cards with correct data', async () => {
      setupMetricsMock();
      renderWithProviders(<Overview />);

      await waitFor(() => {
        expect(screen.getByText('Task Completion')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('+5% from last period')).toBeInTheDocument();
      });

      expect(screen.getByText('User Adoption')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('renders task and project sections', async () => {
      setupMetricsMock();
      renderWithProviders(<Overview />);

      expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    const resizeWindow = (width: number) => {
      global.innerWidth = width;
      global.dispatchEvent(new Event('resize'));
    };

    it('adjusts layout for mobile viewport', async () => {
      resizeWindow(320);
      renderWithProviders(<Overview />);

      const metricsGrid = screen.getByRole('region', { name: /dashboard/i });
      expect(metricsGrid).toHaveStyle({ flexDirection: 'column' });
    });

    it('adjusts layout for tablet viewport', async () => {
      resizeWindow(768);
      renderWithProviders(<Overview />);

      const metricsGrid = screen.getByRole('region', { name: /dashboard/i });
      expect(metricsGrid).toHaveStyle({ flexDirection: 'row' });
    });
  });

  describe('Error Handling', () => {
    it('displays error state for failed metrics fetch', async () => {
      setupMetricsMock({}, 500);
      renderWithProviders(<Overview />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch metrics/i)).toBeInTheDocument();
      });
    });

    it('provides retry functionality for failed data loads', async () => {
      setupMetricsMock({}, 500);
      renderWithProviders(<Overview />);

      const retryButton = await screen.findByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      setupMetricsMock(); // Setup successful response for retry
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates metrics periodically', async () => {
      jest.useFakeTimers();
      setupMetricsMock();
      renderWithProviders(<Overview />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      setupMetricsMock({ ...mockMetricsData, completionRate: 80 });
      jest.advanceTimersByTime(30000); // Advance past refresh interval

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA standards', async () => {
      setupMetricsMock();
      const { container } = renderWithProviders(<Overview />);
      
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      setupMetricsMock();
      renderWithProviders(<Overview />);

      const taskSection = screen.getByRole('region', { name: /recent tasks/i });
      taskSection.focus();
      expect(document.activeElement).toBe(taskSection);

      fireEvent.keyDown(taskSection, { key: 'Tab' });
      const firstTask = within(taskSection).getByRole('button');
      expect(document.activeElement).toBe(firstTask);
    });
  });

  describe('Performance', () => {
    it('lazy loads project grid content', async () => {
      setupMetricsMock();
      renderWithProviders(<Overview />);

      const projectGrid = screen.getByRole('region', { name: /active projects/i });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Verify projects are loaded when grid becomes visible
            expect(within(projectGrid).getAllByRole('article')).toHaveLength(
              mockProjectsData.length
            );
          }
        });
      });

      observer.observe(projectGrid);
    });
  });
});