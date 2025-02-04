/**
 * @fileoverview Project Details Page Component
 * Implements comprehensive project management interface with Material Design 3
 * Supports real-time updates, timeline visualization, and team collaboration
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; // v6.14.0
import { styled, useTheme } from '@mui/material/styles'; // v5.14.0
import {
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Skeleton,
  Alert
} from '@mui/material'; // v5.14.0

import { ProjectCard } from '../../components/project/ProjectCard';
import { TaskList } from '../../components/task/TaskList';
import { ProjectTimeline } from '../../components/project/ProjectTimeline';
import { projectService } from '../../services/project.service';
import { IProject } from '../../interfaces/project.interface';
import { LoadingState } from '../../types/common.types';

// Styled components with Material Design 3 specifications
const ProjectDetailsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    margin: theme.spacing(1)
  }
}));

const TabPanel = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2)
  }
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Custom hook for managing project details state
const useProjectDetails = (projectId: string) => {
  const [state, setState] = useState<{
    project: IProject | null;
    loading: LoadingState;
    error: string | null;
  }>({
    project: null,
    loading: LoadingState.IDLE,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setState(prev => ({ ...prev, loading: LoadingState.LOADING }));
        const response = await projectService.getProjectById(projectId);
        setState(prev => ({
          ...prev,
          project: response,
          loading: LoadingState.SUCCESS
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load project',
          loading: LoadingState.ERROR
        }));
      }
    };

    fetchProject();

    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/projects/${projectId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        project: { ...prev.project!, ...update }
      }));
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [projectId]);

  return state;
};

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState(() => 
    parseInt(searchParams.get('tab') || '0', 10)
  );

  const { project, loading, error } = useProjectDetails(projectId!);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() });
  }, [setSearchParams]);

  const handleTaskSelect = useCallback((taskId: string) => {
    navigate(`/tasks/${taskId}`);
  }, [navigate]);

  if (loading === LoadingState.LOADING) {
    return (
      <ProjectDetailsContainer>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </ProjectDetailsContainer>
    );
  }

  if (error || !project) {
    return (
      <ProjectDetailsContainer>
        <Alert severity="error">
          {error || 'Project not found'}
        </Alert>
      </ProjectDetailsContainer>
    );
  }

  return (
    <ProjectDetailsContainer>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ProjectCard
            project={project}
            className="project-details-card"
          />
        </Grid>

        <Grid item xs={12}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Project details tabs"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label="Tasks" id="project-tab-0" aria-controls="project-tabpanel-0" />
            <Tab label="Timeline" id="project-tab-1" aria-controls="project-tabpanel-1" />
            <Tab label="Team" id="project-tab-2" aria-controls="project-tabpanel-2" />
            <Tab label="Analytics" id="project-tab-3" aria-controls="project-tabpanel-3" />
          </Tabs>

          <TabPanel role="tabpanel" hidden={activeTab !== 0} index={0} value={activeTab}>
            <TaskList
              projectId={project.id}
              onTaskSelect={handleTaskSelect}
              virtualScroll
            />
          </TabPanel>

          <TabPanel role="tabpanel" hidden={activeTab !== 1} index={1} value={activeTab}>
            <ProjectTimeline
              projectId={project.id}
              enableRealTimeUpdates
            />
          </TabPanel>

          <TabPanel role="tabpanel" hidden={activeTab !== 2} index={2} value={activeTab}>
            <Typography variant="h6" component="h2">
              Team Members
            </Typography>
            {/* Team member list component would go here */}
          </TabPanel>

          <TabPanel role="tabpanel" hidden={activeTab !== 3} index={3} value={activeTab}>
            <Typography variant="h6" component="h2">
              Project Analytics
            </Typography>
            {/* Analytics component would go here */}
          </TabPanel>
        </Grid>
      </Grid>
    </ProjectDetailsContainer>
  );
};

export default ProjectDetails;