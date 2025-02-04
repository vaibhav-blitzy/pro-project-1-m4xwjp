/**
 * @fileoverview Material Design 3 compliant Project List component
 * Implements virtualized grid/list view with comprehensive filtering, sorting, and accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import { 
  Grid, 
  Box, 
  Typography, 
  CircularProgress, 
  Button 
} from '@mui/material'; // v5.14.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { styled } from '@mui/material/styles';

import { ProjectCard } from './ProjectCard';
import ErrorBoundary from '../common/ErrorBoundary';
import { IProject, ProjectPriority } from '../../interfaces/project.interface';
import type { LoadingState } from '../../types/common.types';

/**
 * Interface for project filtering options
 */
interface ProjectFilters {
  search?: string;
  status?: string[];
  priority?: ProjectPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Interface for project sorting configuration
 */
interface ProjectSorting {
  field: 'name' | 'status' | 'priority' | 'startDate' | 'endDate' | 'progress';
  direction: 'asc' | 'desc';
}

/**
 * Props interface for the ProjectList component
 */
interface ProjectListProps {
  filters: ProjectFilters;
  sorting: ProjectSorting;
  onProjectClick: (project: IProject) => void;
  className?: string;
  viewType: 'grid' | 'list';
  pageSize: number;
}

/**
 * Styled Grid container with responsive layout
 */
const StyledGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2),
  minHeight: '200px',
  gap: theme.spacing(2),
  width: '100%',
  margin: 0,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  },
}));

/**
 * Styled container for loading and error states
 */
const CenteredContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  minHeight: '200px',
});

/**
 * ProjectList component implementing Material Design 3 specifications
 */
export const ProjectList: React.FC<ProjectListProps> = React.memo(({
  filters,
  sorting,
  onProjectClick,
  className,
  viewType,
  pageSize
}) => {
  // State management
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Virtualization configuration
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasMore ? projects.length + 1 : projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => (viewType === 'grid' ? 300 : 100), [viewType]),
    overscan: 5
  });

  // Memoized column count based on viewport width
  const columnCount = useMemo(() => {
    if (viewType === 'list') return 1;
    const width = parentRef.current?.offsetWidth || 0;
    if (width < 600) return 1;
    if (width < 960) return 2;
    if (width < 1280) return 3;
    return 4;
  }, [viewType, parentRef.current?.offsetWidth]);

  // Fetch projects with debouncing
  const fetchProjects = useCallback(async () => {
    if (loadingState === LoadingState.LOADING) return;

    try {
      setLoadingState(LoadingState.LOADING);
      // API call would go here
      // For now, simulating data fetch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulated data - replace with actual API call
      const newProjects: IProject[] = [];
      setProjects(prev => [...prev, ...newProjects]);
      setHasMore(newProjects.length === pageSize);
      setLoadingState(LoadingState.SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      setLoadingState(LoadingState.ERROR);
    }
  }, [filters, sorting, pageSize, loadingState]);

  // Initial load and infinite scroll
  useEffect(() => {
    setProjects([]);
    setHasMore(true);
    fetchProjects();
  }, [filters, sorting]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    setError(null);
    setLoadingState(LoadingState.IDLE);
    fetchProjects();
  }, [fetchProjects]);

  // Render loading state
  if (loadingState === LoadingState.LOADING && projects.length === 0) {
    return (
      <CenteredContainer>
        <CircularProgress 
          size={40}
          aria-label="Loading projects"
        />
      </CenteredContainer>
    );
  }

  // Render error state
  if (loadingState === LoadingState.ERROR && error) {
    return (
      <CenteredContainer>
        <Box textAlign="center">
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleRetry}
            aria-label="Retry loading projects"
          >
            Retry
          </Button>
        </Box>
      </CenteredContainer>
    );
  }

  // Render empty state
  if (projects.length === 0 && loadingState === LoadingState.SUCCESS) {
    return (
      <CenteredContainer>
        <Typography 
          variant="h6" 
          color="textSecondary"
          aria-label="No projects found"
        >
          No projects found
        </Typography>
      </CenteredContainer>
    );
  }

  return (
    <ErrorBoundary
      fallbackMessage="Failed to display projects"
      onError={(error) => console.error('Project list error:', error)}
    >
      <Box
        ref={parentRef}
        className={className}
        sx={{
          height: '100%',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        role="region"
        aria-label="Project list"
      >
        <StyledGrid 
          container 
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const project = projects[virtualRow.index];
            const isLoaderRow = !project && hasMore;

            return (
              <Grid
                item
                xs={12}
                sm={viewType === 'list' ? 12 : 6}
                md={viewType === 'list' ? 12 : 4}
                lg={viewType === 'list' ? 12 : 3}
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${100 / columnCount}%`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {isLoaderRow ? (
                  <ProjectCard isLoading />
                ) : (
                  <ProjectCard
                    project={project}
                    onClick={() => onProjectClick(project)}
                  />
                )}
              </Grid>
            );
          })}
        </StyledGrid>
      </Box>
    </ErrorBoundary>
  );
});

ProjectList.displayName = 'ProjectList';

export type { ProjectListProps, ProjectFilters, ProjectSorting };