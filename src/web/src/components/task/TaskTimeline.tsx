/**
 * @fileoverview Enhanced timeline component for task visualization with accessibility support
 * Implements Material Design 3 specifications and performance optimizations
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, 
         TimelineContent, TimelineDot } from '@mui/lab';
import { Box, Typography, useTheme, Skeleton, IconButton, 
         Tooltip, Paper } from '@mui/material';
import { DatePicker } from '../common/DatePicker';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ITask, TaskStatus } from '../../interfaces/task.interface';
import { formatDate, getDateRange, isValidDate } from '../../utils/date.utils';

/**
 * Props interface for TaskTimeline component
 */
interface ITaskTimelineProps {
  projectId: string;
  startDate: Date;
  endDate: Date;
  onTaskUpdate?: (taskId: string, updates: Partial<ITask>) => Promise<void>;
  zoomLevel?: number;
  groupBy?: 'status' | 'assignee' | 'priority';
  enableDragDrop?: boolean;
  accessibilityLabels?: {
    timelineLabel?: string;
    taskLabel?: string;
    datePickerLabel?: string;
  };
}

/**
 * Enhanced timeline component for visualizing tasks with accessibility support
 */
const TaskTimeline: React.FC<ITaskTimelineProps> = ({
  projectId,
  startDate,
  endDate,
  onTaskUpdate,
  zoomLevel = 1,
  groupBy = 'status',
  enableDragDrop = true,
  accessibilityLabels = {
    timelineLabel: 'Project Timeline',
    taskLabel: 'Task',
    datePickerLabel: 'Select Date Range'
  }
}) => {
  // Theme and styles
  const theme = useTheme();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches tasks with retry mechanism and error handling
   */
  const fetchTasksWithRetry = useCallback(async (
    retryCount = 3,
    delay = 1000
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // API call would go here
      // Simulated for this example
      const response = await fetch(`/api/projects/${projectId}/tasks?start=${startDate}&end=${endDate}`);
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      if (retryCount > 0) {
        setTimeout(() => {
          fetchTasksWithRetry(retryCount - 1, delay * 2);
        }, delay);
      } else {
        setError('Failed to load tasks. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, startDate, endDate]);

  /**
   * Handles task drag and drop with optimistic updates
   */
  const handleDragDrop = useCallback(async (
    taskId: string,
    newDate: Date
  ): Promise<void> => {
    if (!enableDragDrop || !onTaskUpdate) return;

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      // Optimistic update
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        dueDate: newDate
      };
      setTasks(updatedTasks);

      // Persist changes
      await onTaskUpdate(taskId, { dueDate: newDate });

      // Announce change to screen readers
      const announcer = document.getElementById('timeline-live-region');
      if (announcer) {
        announcer.textContent = `Task ${tasks[taskIndex].title} moved to ${formatDate(newDate)}`;
      }
    } catch (err) {
      // Rollback on failure
      setTasks(tasks);
      setError('Failed to update task. Please try again.');
    }
  }, [tasks, enableDragDrop, onTaskUpdate]);

  /**
   * Memoized timeline groups based on groupBy parameter
   */
  const taskGroups = useMemo(() => {
    if (!tasks.length) return [];

    return tasks.reduce((groups: { [key: string]: ITask[] }, task) => {
      const key = groupBy === 'status' ? task.status :
                 groupBy === 'assignee' ? task.assigneeId :
                 task.priority;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
      return groups;
    }, {});
  }, [tasks, groupBy]);

  // Initial data fetch
  useEffect(() => {
    if (isValidDate(startDate) && isValidDate(endDate)) {
      fetchTasksWithRetry();
    }
  }, [fetchTasksWithRetry, startDate, endDate]);

  /**
   * Renders timeline skeleton during loading
   */
  const renderSkeleton = () => (
    <Box sx={{ width: '100%', padding: 2 }}>
      {[...Array(5)].map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          height={60}
          sx={{ my: 1, borderRadius: 1 }}
        />
      ))}
    </Box>
  );

  /**
   * Renders individual task item with accessibility support
   */
  const renderTaskItem = (task: ITask) => (
    <TimelineItem
      key={task.id}
      sx={{ minHeight: 100 * zoomLevel }}
      data-testid={`task-item-${task.id}`}
    >
      <TimelineSeparator>
        <TimelineDot
          color={task.status === TaskStatus.COMPLETED ? 'success' : 'primary'}
          sx={{ cursor: enableDragDrop ? 'grab' : 'default' }}
        />
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            '&:hover': {
              backgroundColor: theme.palette.action.hover
            }
          }}
          role="article"
          aria-label={`${accessibilityLabels.taskLabel}: ${task.title}`}
        >
          <Typography variant="h6" component="h3">
            {task.title}
          </Typography>
          <Typography color="textSecondary">
            Due: {formatDate(task.dueDate)}
          </Typography>
          <Typography variant="body2">
            Status: {task.status}
          </Typography>
        </Paper>
      </TimelineContent>
    </TimelineItem>
  );

  return (
    <ErrorBoundary>
      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          padding: theme.spacing(2)
        }}
        role="region"
        aria-label={accessibilityLabels.timelineLabel}
      >
        {/* Date Range Selector */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <DatePicker
            name="startDate"
            label="Start Date"
            validation={{
              required: true,
              errorMessage: { key: 'validation.required', params: {} }
            }}
            ariaLabel={`${accessibilityLabels.datePickerLabel} start date`}
            ariaDescription="Select start date for timeline view"
          />
          <DatePicker
            name="endDate"
            label="End Date"
            validation={{
              required: true,
              errorMessage: { key: 'validation.required', params: {} }
            }}
            ariaLabel={`${accessibilityLabels.datePickerLabel} end date`}
            ariaDescription="Select end date for timeline view"
          />
        </Box>

        {/* Error Display */}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Loading State */}
        {loading ? renderSkeleton() : (
          <Timeline
            sx={{
              [`& .MuiTimelineItem-root`]: {
                minHeight: 100 * zoomLevel
              }
            }}
          >
            {Object.entries(taskGroups).map(([group, groupTasks]) => (
              <Box key={group}>
                <Typography
                  variant="h6"
                  sx={{ my: 2 }}
                  role="heading"
                  aria-level={2}
                >
                  {group}
                </Typography>
                {groupTasks.map(renderTaskItem)}
              </Box>
            ))}
          </Timeline>
        )}

        {/* Live Region for Accessibility Announcements */}
        <div
          id="timeline-live-region"
          aria-live="polite"
          className="visually-hidden"
          role="status"
        />
      </Box>
    </ErrorBoundary>
  );
};

export default TaskTimeline;