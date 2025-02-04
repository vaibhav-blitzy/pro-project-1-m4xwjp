/**
 * @fileoverview Dashboard Overview component implementing Material Design 3
 * Displays key metrics, recent tasks, and active projects with real-time updates
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Grid, Typography, Box, Skeleton, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FolderIcon from '@mui/icons-material/Folder';

import { Card } from '../../components/common/Card';
import { TaskList } from '../../components/task/TaskList';
import { ProjectList } from '../../components/project/ProjectList';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { selectTaskMetrics } from '../../store/task/task.selectors';
import type { MetricCardProps, DashboardMetrics } from './Overview.types';

// Refresh interval for real-time updates (30 seconds)
const REFRESH_INTERVAL = 30000;

/**
 * Custom hook for managing metrics data with real-time updates
 */
const useMetricsData = () => {
  const dispatch = useDispatch();
  const taskMetrics = useSelector(selectTaskMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      // Dispatch actions to fetch updated metrics
      dispatch({ type: 'task/fetchMetrics' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics: taskMetrics, isLoading, error, refresh: fetchMetrics };
};

/**
 * MetricCard component for displaying individual metrics
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  isLoading,
  error
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card size="MEDIUM">
        <Box sx={{ p: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="MEDIUM">
        <Alert severity="error" sx={{ m: 2 }}>
          {error.message}
        </Alert>
      </Card>
    );
  }

  return (
    <Card size="MEDIUM">
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: theme.palette.primary.light,
              borderRadius: '50%',
              p: 1,
              mr: 2
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="p" sx={{ mb: 1 }}>
          {typeof value === 'number' ? `${value}%` : value}
        </Typography>
        {change && (
          <Typography
            variant="body2"
            color={change >= 0 ? 'success.main' : 'error.main'}
          >
            {change >= 0 ? '+' : ''}{change}% from last period
          </Typography>
        )}
      </Box>
    </Card>
  );
};

/**
 * Dashboard Overview component with real-time metrics and task management
 */
const Overview: React.FC = () => {
  const { metrics, isLoading, error, refresh } = useMetricsData();
  const theme = useTheme();

  const handleTaskSelect = useCallback((task) => {
    // Handle task selection
    dispatch({ type: 'task/selectTask', payload: task });
  }, []);

  const handleProjectSelect = useCallback((project) => {
    // Handle project selection
    dispatch({ type: 'project/selectProject', payload: project });
  }, []);

  return (
    <ErrorBoundary fallbackMessage="Failed to load dashboard">
      <Box sx={{ p: theme.spacing(3) }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard Overview
        </Typography>

        <Grid container spacing={3}>
          {/* Metrics Section */}
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Task Completion"
              value={metrics?.completionRate}
              change={metrics?.completionRateChange}
              icon={<AssignmentIcon />}
              isLoading={isLoading}
              error={error}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="User Adoption"
              value={metrics?.userAdoption}
              change={metrics?.userAdoptionChange}
              icon={<GroupIcon />}
              isLoading={isLoading}
              error={error}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Efficiency"
              value={metrics?.efficiency}
              change={metrics?.efficiencyChange}
              icon={<TrendingUpIcon />}
              isLoading={isLoading}
              error={error}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Active Projects"
              value={metrics?.activeProjects}
              change={metrics?.activeProjectsChange}
              icon={<FolderIcon />}
              isLoading={isLoading}
              error={error}
            />
          </Grid>

          {/* Recent Tasks Section */}
          <Grid item xs={12} md={6}>
            <Card size="LARGE">
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  Recent Tasks
                </Typography>
                <TaskList
                  onTaskSelect={handleTaskSelect}
                  onRefresh={refresh}
                  filterCriteria={{
                    status: ['todo', 'in_progress'],
                    limit: 5
                  }}
                />
              </Box>
            </Card>
          </Grid>

          {/* Active Projects Section */}
          <Grid item xs={12} md={6}>
            <Card size="LARGE">
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  Active Projects
                </Typography>
                <ProjectList
                  onProjectClick={handleProjectSelect}
                  filters={{
                    status: ['ACTIVE'],
                    priority: ['HIGH', 'MEDIUM']
                  }}
                  sorting={{
                    field: 'priority',
                    direction: 'desc'
                  }}
                  viewType="grid"
                  pageSize={6}
                />
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ErrorBoundary>
  );
};

export default Overview;