/**
 * @fileoverview Project Timeline Component
 * Implements comprehensive timeline visualization with Material Design 3 integration
 * Supports real-time updates, milestone tracking, and responsive layouts
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles'; // v5.14.0
import { format } from 'date-fns'; // v2.30.0
import { IProject, IProjectTimeline } from '../../interfaces/project.interface';
import { projectService } from '../../services/project.service';
import { LoadingState } from '../../types/common.types';
import {
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon
} from '@mui/icons-material';

/**
 * Timeline view mode enumeration
 */
enum TimelineViewMode {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter'
}

/**
 * Timeline component props interface
 */
interface ProjectTimelineProps {
  projectId: string;
  className?: string;
  onMilestoneClick?: (milestoneId: string) => void;
  enableRealTimeUpdates?: boolean;
  viewMode?: TimelineViewMode;
}

/**
 * Styled timeline container with responsive layout
 */
const TimelineContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  overflowX: 'auto',
  minHeight: 400,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
    margin: theme.spacing(1)
  }
}));

/**
 * Styled timeline grid with Material Design tokens
 */
const TimelineGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: theme.spacing(1),
  position: 'relative',
  marginTop: theme.spacing(4)
}));

/**
 * Styled milestone marker with accessibility support
 */
const MilestoneMarker = styled('div', {
  shouldForwardProp: prop => prop !== 'completed'
})<{ completed: boolean }>(({ theme, completed }) => ({
  position: 'absolute',
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: completed ? theme.palette.success.main : theme.palette.primary.main,
  cursor: 'pointer',
  transition: theme.transitions.create(['transform', 'box-shadow']),
  '&:hover': {
    transform: 'scale(1.2)',
    boxShadow: theme.shadows[4]
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2
  }
}));

/**
 * Project Timeline Component
 * Implements timeline visualization with real-time updates and responsive design
 */
export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  projectId,
  className,
  onMilestoneClick,
  enableRealTimeUpdates = true,
  viewMode = TimelineViewMode.MONTH
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeline, setTimeline] = useState<IProjectTimeline | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<TimelineViewMode>(viewMode);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  /**
   * Calculates timeline scale based on view mode and zoom level
   */
  const timelineScale = useMemo(() => {
    if (!timeline) return null;

    const { startDate, endDate } = timeline;
    const duration = endDate.getTime() - startDate.getTime();
    const pixelsPerDay = 100 * zoomLevel;

    return {
      totalWidth: (duration / (1000 * 60 * 60 * 24)) * pixelsPerDay,
      pixelsPerDay
    };
  }, [timeline, zoomLevel]);

  /**
   * Fetches timeline data with error handling
   */
  const fetchTimeline = useCallback(async () => {
    try {
      setLoadingState(LoadingState.LOADING);
      const timelineData = await projectService.getProjectTimeline(projectId);
      setTimeline(timelineData);
      setLoadingState(LoadingState.SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
      setLoadingState(LoadingState.ERROR);
    }
  }, [projectId]);

  /**
   * Sets up real-time timeline updates
   */
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const subscription = projectService.subscribeToTimelineUpdates(projectId)
      .subscribe({
        next: (updatedTimeline) => {
          setTimeline(updatedTimeline);
        },
        error: (err) => {
          console.error('Timeline update error:', err);
        }
      });

    return () => subscription.unsubscribe();
  }, [projectId, enableRealTimeUpdates]);

  /**
   * Initializes timeline data
   */
  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  /**
   * Handles milestone click events
   */
  const handleMilestoneClick = useCallback((milestoneId: string) => {
    if (onMilestoneClick) {
      onMilestoneClick(milestoneId);
    }
  }, [onMilestoneClick]);

  /**
   * Handles zoom level changes
   */
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoomLevel(prevZoom => {
      const newZoom = direction === 'in' ? prevZoom * 1.2 : prevZoom / 1.2;
      return Math.max(0.5, Math.min(newZoom, 2)); // Limit zoom range
    });
  }, []);

  /**
   * Renders timeline loading skeleton
   */
  if (loadingState === LoadingState.LOADING) {
    return (
      <TimelineContainer className={className}>
        <Skeleton variant="rectangular" height={400} />
      </TimelineContainer>
    );
  }

  /**
   * Renders timeline error state
   */
  if (loadingState === LoadingState.ERROR) {
    return (
      <TimelineContainer className={className}>
        <Typography color="error" align="center">
          {error || 'Failed to load timeline'}
        </Typography>
      </TimelineContainer>
    );
  }

  /**
   * Renders timeline content
   */
  return (
    <TimelineContainer className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          Project Timeline
        </Typography>
        <div>
          <Tooltip title="Zoom Out">
            <IconButton onClick={() => handleZoom('out')} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom In">
            <IconButton onClick={() => handleZoom('in')} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Today">
            <IconButton onClick={() => setZoomLevel(1)} size="small">
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <TimelineGrid
        style={{
          width: timelineScale?.totalWidth,
          overflowX: 'auto'
        }}
        role="grid"
        aria-label="Project Timeline"
      >
        {timeline?.milestones.map((milestone) => (
          <MilestoneMarker
            key={milestone.id}
            completed={milestone.status === 'COMPLETED'}
            style={{
              left: `${((milestone.dueDate.getTime() - timeline.startDate.getTime()) /
                (1000 * 60 * 60 * 24)) * timelineScale!.pixelsPerDay}px`
            }}
            onClick={() => handleMilestoneClick(milestone.id)}
            role="button"
            aria-label={`Milestone: ${milestone.title}`}
            tabIndex={0}
          >
            <Tooltip title={`${milestone.title} - ${format(milestone.dueDate, 'MMM dd, yyyy')}`}>
              <span style={{ display: 'block', width: '100%', height: '100%' }} />
            </Tooltip>
          </MilestoneMarker>
        ))}
      </TimelineGrid>
    </TimelineContainer>
  );
};

export default ProjectTimeline;