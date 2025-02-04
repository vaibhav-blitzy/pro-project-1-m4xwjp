/**
 * @fileoverview Project List Page Component
 * Implements Material Design 3 compliant project list with filtering, sorting, and search capabilities
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Skeleton,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Sort as SortIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { debounce } from 'lodash';

import { ProjectList as ProjectListComponent } from '../../components/project/ProjectList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { IProject, ProjectPriority } from '../../interfaces/project.interface';
import { projectActions } from '../../store/project/project.actions';
import { Status } from '../../types/common.types';

/**
 * Interface for project list page state
 */
interface ProjectListPageState {
  searchQuery: string;
  viewType: 'grid' | 'list';
  filters: {
    status: Status[];
    priority: ProjectPriority[];
    search: string;
  };
  isLoading: boolean;
  error: string | null;
  sortConfig: {
    field: 'name' | 'status' | 'priority' | 'startDate' | 'endDate' | 'progress';
    direction: 'asc' | 'desc';
  };
}

/**
 * Project List Page component implementing Material Design 3 specifications
 */
const ProjectListPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();

  // Local state management
  const [state, setState] = useState<ProjectListPageState>({
    searchQuery: '',
    viewType: isMobile ? 'list' : 'grid',
    filters: {
      status: [],
      priority: [],
      search: ''
    },
    isLoading: true,
    error: null,
    sortConfig: {
      field: 'startDate',
      direction: 'desc'
    }
  });

  // Redux selectors
  const projects = useSelector((state: any) => state.project.list);
  const loading = useSelector((state: any) => state.project.status === 'loading');

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, search: query }
      }));
    }, 300),
    []
  );

  // Effect for initial data fetch
  useEffect(() => {
    dispatch(projectActions.fetchProjects({ filters: state.filters }));
  }, [dispatch, state.filters]);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setState(prev => ({ ...prev, searchQuery: query }));
    debouncedSearch(query);
  };

  // Handle view type toggle
  const handleViewTypeToggle = () => {
    setState(prev => ({
      ...prev,
      viewType: prev.viewType === 'grid' ? 'list' : 'grid'
    }));
  };

  // Handle filter changes
  const handleFilterChange = (type: 'status' | 'priority', value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [type]: value }
    }));
  };

  // Handle sort changes
  const handleSortChange = (field: ProjectListPageState['sortConfig']['field']) => {
    setState(prev => ({
      ...prev,
      sortConfig: {
        field,
        direction: prev.sortConfig.field === field && prev.sortConfig.direction === 'asc' ? 'desc' : 'asc'
      }
    }));
  };

  // Handle project click
  const handleProjectClick = useCallback((project: IProject) => {
    dispatch(projectActions.selectProject(project));
  }, [dispatch]);

  // Memoized filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project: IProject) => {
        const matchesStatus = state.filters.status.length === 0 || 
          state.filters.status.includes(project.status);
        const matchesPriority = state.filters.priority.length === 0 || 
          state.filters.priority.includes(project.priority);
        const matchesSearch = !state.filters.search || 
          project.name.toLowerCase().includes(state.filters.search.toLowerCase());
        
        return matchesStatus && matchesPriority && matchesSearch;
      })
      .sort((a: IProject, b: IProject) => {
        const { field, direction } = state.sortConfig;
        const modifier = direction === 'asc' ? 1 : -1;
        return a[field] > b[field] ? modifier : -modifier;
      });
  }, [projects, state.filters, state.sortConfig]);

  return (
    <ErrorBoundary>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Projects
          </Typography>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
            sx={{ mb: 3 }}
          >
            {/* Search Field */}
            <TextField
              fullWidth
              placeholder="Search projects..."
              value={state.searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon color="action" />,
              }}
              sx={{ maxWidth: { sm: '300px' } }}
            />
            
            {/* View Toggle */}
            <IconButton 
              onClick={handleViewTypeToggle}
              aria-label={`Switch to ${state.viewType === 'grid' ? 'list' : 'grid'} view`}
            >
              {state.viewType === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>

            {/* Filters */}
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={state.filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(Status).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                multiple
                value={state.filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(ProjectPriority).map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Project List */}
        <ProjectListComponent
          projects={filteredProjects}
          viewType={state.viewType}
          onProjectClick={handleProjectClick}
          loading={loading}
          filters={state.filters}
          sorting={state.sortConfig}
          pageSize={isMobile ? 10 : isTablet ? 15 : 20}
        />
      </Container>
    </ErrorBoundary>
  );
};

export default ProjectListPage;