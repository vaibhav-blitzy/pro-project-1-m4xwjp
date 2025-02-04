/**
 * @fileoverview Task List page component implementing Material Design 3 principles
 * with virtualized scrolling, real-time updates, and enhanced accessibility
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'; // v18.2.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { useErrorBoundary } from 'react-error-boundary'; // v4.0.11

import TaskList from '../../components/task/TaskList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { GRID, ANIMATION_TIMINGS } from '../../constants/app.constants';

// Interfaces
interface TaskListPageProps {
  projectId?: string;
  initialFilters?: TaskFilters;
  virtualizeOptions?: VirtualizeOptions;
  collaborationEnabled?: boolean;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assignee?: string;
  dateRange?: DateRange;
  tags: string[];
  sortBy: SortOption;
  sortDirection: SortDirection;
}

interface VirtualizeOptions {
  overscan: number;
  itemSize: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

type SortOption = 'dueDate' | 'priority' | 'status' | 'title';
type SortDirection = 'asc' | 'desc';

// Default values
const DEFAULT_VIRTUALIZE_OPTIONS: VirtualizeOptions = {
  overscan: 5,
  itemSize: 80
};

const DEFAULT_FILTERS: TaskFilters = {
  tags: [],
  sortBy: 'dueDate',
  sortDirection: 'asc'
};

/**
 * Task List page component with real-time updates and virtualization
 */
const TaskListPage: React.FC<TaskListPageProps> = ({
  projectId,
  initialFilters = DEFAULT_FILTERS,
  virtualizeOptions = DEFAULT_VIRTUALIZE_OPTIONS,
  collaborationEnabled = true
}) => {
  // State management
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [activeCollaborators, setActiveCollaborators] = useState<string[]>([]);

  // Error boundary integration
  const { showBoundary } = useErrorBoundary();

  // WebSocket connection for real-time updates
  const wsUrl = `${process.env.REACT_APP_WS_URL}/tasks`;
  const {
    connectionState,
    error: wsError,
    subscribe,
    send
  } = useWebSocket(wsUrl, {
    autoReconnect: true,
    reconnectInterval: 1000,
    maxRetries: 5
  });

  // Task selection handler
  const handleTaskSelect = useCallback((task: ITask) => {
    setSelectedTask(task);
    if (collaborationEnabled) {
      send('task_select', { taskId: task.id });
    }
  }, [collaborationEnabled, send]);

  // Task update handler with optimistic updates
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<ITask>) => {
    try {
      if (collaborationEnabled) {
        await send('task_update', { taskId, updates });
      }
    } catch (error) {
      showBoundary(error);
    }
  }, [collaborationEnabled, send, showBoundary]);

  // Filter update handler
  const handleFilterChange = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Set up real-time collaboration
  useEffect(() => {
    if (!collaborationEnabled) return;

    const handleTaskUpdates = (update: { task: ITask; userId: string }) => {
      // Handle real-time task updates
    };

    const handleCollaboratorUpdates = (update: { users: string[] }) => {
      setActiveCollaborators(update.users);
    };

    subscribe('task_updates', handleTaskUpdates);
    subscribe('collaborator_updates', handleCollaboratorUpdates);

    // Presence tracking
    const interval = setInterval(() => {
      send('heartbeat', { timestamp: Date.now() });
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [collaborationEnabled, subscribe, send]);

  // Monitor WebSocket connection status
  useEffect(() => {
    if (wsError) {
      console.error('WebSocket error:', wsError);
    }
  }, [wsError]);

  // Performance optimization with memoization
  const taskListProps = useMemo(() => ({
    projectId,
    onTaskSelect: handleTaskSelect,
    onTaskUpdate: handleTaskUpdate,
    virtualizeOptions,
    filters,
    collaborators: activeCollaborators
  }), [
    projectId,
    handleTaskSelect,
    handleTaskUpdate,
    virtualizeOptions,
    filters,
    activeCollaborators
  ]);

  return (
    <ErrorBoundary
      fallbackMessage="Failed to load task list"
      onError={(error) => {
        console.error('Task list error:', error);
      }}
    >
      <div
        style={{
          height: '100%',
          padding: GRID.CONTAINER_PADDING,
          transition: `all ${ANIMATION_TIMINGS.DURATION.medium}ms ${ANIMATION_TIMINGS.EASING.standard}`
        }}
      >
        <TaskList
          {...taskListProps}
          className="task-list-container"
          aria-label="Task list"
          role="region"
        />
      </div>
    </ErrorBoundary>
  );
};

// Type export for external usage
export type { TaskListPageProps, TaskFilters, VirtualizeOptions };

// Default export
export default TaskListPage;