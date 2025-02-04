/**
 * @fileoverview Analytics dashboard component that displays comprehensive performance metrics,
 * interactive charts, and real-time statistics for tasks and projects
 * @version 1.0.0
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Grid, Typography, useTheme } from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { ErrorBoundary } from 'react-error-boundary';

import { Card } from '../../components/common/Card';
import { selectAllTasks } from '../../store/task/task.selectors';
import { selectProjects } from '../../store/project/project.selectors';
import { useWebSocket } from '../../hooks/useWebSocket';
import { TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { ProjectPriority } from '../../interfaces/project.interface';
import { THEME_CONSTANTS, GRID } from '../../constants/app.constants';

// Types for metrics
interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  tasksByPriority: Record<TaskPriority, number>;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  velocity: number;
  trendData: Array<{ date: string; completed: number }>;
}

interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completionRate: number;
  projectsByPriority: Record<ProjectPriority, number>;
  healthScore: number;
  timelineAdherence: number;
}

const Analytics: React.FC = () => {
  const theme = useTheme();
  const tasks = useSelector(selectAllTasks);
  const projects = useSelector(selectProjects);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket setup for real-time updates
  const { subscribe, connectionState } = useWebSocket(
    process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080'
  );

  // Calculate task metrics with memoization
  const taskMetrics = useMemo((): TaskMetrics => {
    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const overdueTasks = tasks.filter(t => 
      new Date(t.dueDate) < now && t.status !== TaskStatus.COMPLETED
    ).length;

    // Calculate tasks by priority
    const tasksByPriority = tasks.reduce((acc, task) => ({
      ...acc,
      [task.priority]: (acc[task.priority] || 0) + 1
    }), {} as Record<TaskPriority, number>);

    // Calculate tasks by status
    const tasksByStatus = tasks.reduce((acc, task) => ({
      ...acc,
      [task.status]: (acc[task.status] || 0) + 1
    }), {} as Record<TaskStatus, number>);

    // Calculate velocity (tasks completed in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyCompleted = tasks.filter(t => 
      t.status === TaskStatus.COMPLETED && 
      new Date(t.updatedAt) > sevenDaysAgo
    ).length;

    // Generate trend data
    const trendData = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const completed = tasks.filter(t => 
        t.status === TaskStatus.COMPLETED &&
        new Date(t.updatedAt).toDateString() === date.toDateString()
      ).length;
      return {
        date: date.toLocaleDateString(),
        completed
      };
    });

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
      tasksByPriority,
      tasksByStatus,
      overdueTasks,
      velocity: recentlyCompleted / 7,
      trendData
    };
  }, [tasks]);

  // Calculate project metrics with memoization
  const projectMetrics = useMemo((): ProjectMetrics => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;

    // Calculate projects by priority
    const projectsByPriority = projects.reduce((acc, project) => ({
      ...acc,
      [project.priority]: (acc[project.priority] || 0) + 1
    }), {} as Record<ProjectPriority, number>);

    // Calculate health score based on progress vs timeline
    const healthScore = projects.reduce((acc, project) => {
      const progress = project.progress || 0;
      const expectedProgress = ((new Date().getTime() - new Date(project.startDate).getTime()) /
        (new Date(project.endDate).getTime() - new Date(project.startDate).getTime())) * 100;
      return acc + (progress >= expectedProgress ? 1 : 0);
    }, 0) / totalProjects * 100;

    return {
      totalProjects,
      activeProjects,
      completionRate: totalProjects ? (completedProjects / totalProjects) * 100 : 0,
      projectsByPriority,
      healthScore,
      timelineAdherence: healthScore
    };
  }, [projects]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscribeToUpdates = async () => {
      await subscribe('task-updates', (data: any) => {
        // Handle real-time task updates
        console.log('Task update received:', data);
      });
      await subscribe('project-updates', (data: any) => {
        // Handle real-time project updates
        console.log('Project update received:', data);
      });
      setIsLoading(false);
    };

    if (connectionState === 'CONNECTED') {
      subscribeToUpdates();
    }
  }, [subscribe, connectionState]);

  // Render metric cards with memoization
  const renderMetricCards = useCallback(() => (
    <Grid container spacing={GRID.COLUMN_GAP / 8}>
      <Grid item xs={12} md={6} lg={3}>
        <Card size="MEDIUM">
          <Typography variant="h6">Task Overview</Typography>
          <Typography variant="h3">{taskMetrics.totalTasks}</Typography>
          <Typography variant="body2" color="textSecondary">
            {taskMetrics.completionRate.toFixed(1)}% Complete
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card size="MEDIUM">
          <Typography variant="h6">Project Health</Typography>
          <Typography variant="h3">{projectMetrics.healthScore.toFixed(1)}%</Typography>
          <Typography variant="body2" color="textSecondary">
            {projectMetrics.activeProjects} Active Projects
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card size="MEDIUM">
          <Typography variant="h6">Task Velocity</Typography>
          <Typography variant="h3">{taskMetrics.velocity.toFixed(1)}</Typography>
          <Typography variant="body2" color="textSecondary">
            Tasks/Day
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={6} lg={3}>
        <Card size="MEDIUM">
          <Typography variant="h6">At Risk</Typography>
          <Typography variant="h3">{taskMetrics.overdueTasks}</Typography>
          <Typography variant="body2" color="textSecondary">
            Overdue Tasks
          </Typography>
        </Card>
      </Grid>
    </Grid>
  ), [taskMetrics, projectMetrics]);

  // Render charts with memoization
  const renderCharts = useCallback(() => (
    <Grid container spacing={GRID.COLUMN_GAP / 8} sx={{ mt: 2 }}>
      {/* Task Completion Trend */}
      <Grid item xs={12} lg={8}>
        <Card size="LARGE">
          <Typography variant="h6">Task Completion Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={taskMetrics.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={theme.palette.primary.main}
                fill={theme.palette.primary.light}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      {/* Task Distribution */}
      <Grid item xs={12} lg={4}>
        <Card size="LARGE">
          <Typography variant="h6">Task Distribution</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(taskMetrics.tasksByStatus).map(([status, count]) => ({
                  name: status,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill={theme.palette.primary.main}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      {/* Project Priority Distribution */}
      <Grid item xs={12}>
        <Card size="LARGE">
          <Typography variant="h6">Project Priority Distribution</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(projectMetrics.projectsByPriority).map(([priority, count]) => ({
                priority,
                count
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={theme.palette.secondary.main} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
    </Grid>
  ), [taskMetrics, projectMetrics, theme]);

  if (isLoading) {
    return (
      <Typography variant="h6" align="center">
        Loading analytics...
      </Typography>
    );
  }

  return (
    <ErrorBoundary fallback={<div>Error loading analytics dashboard</div>}>
      <div>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Analytics Dashboard
        </Typography>
        {renderMetricCards()}
        {renderCharts()}
      </div>
    </ErrorBoundary>
  );
};

export default Analytics;