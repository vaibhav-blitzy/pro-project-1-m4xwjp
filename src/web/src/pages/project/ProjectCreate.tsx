/**
 * @fileoverview Project creation page component implementing comprehensive form validation,
 * error handling, accessibility features, and Redux integration with optimistic updates
 * @version 1.0.0
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, CircularProgress, Alert } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';

import AppLayout from '../../components/layout/AppLayout';
import { ProjectForm } from '../../components/project/ProjectForm';
import { createProject } from '../../store/project/project.actions';
import { ROUTES } from '../../constants/route.constants';
import type { IProject } from '../../interfaces/project.interface';
import type { ApiError } from '../../types/api.types';

/**
 * Project creation page component with enhanced error handling and accessibility
 */
const ProjectCreate: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Local state for loading and error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Handles project form submission with optimistic updates
   * @param projectData Project creation payload
   */
  const handleProjectSubmit = useCallback(async (projectData: IProject) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Dispatch project creation with optimistic update
      const resultAction = await dispatch(createProject(projectData));
      
      if (createProject.fulfilled.match(resultAction)) {
        // Show success notification
        // Note: Actual toast implementation would be handled by a notification system
        console.log('Project created successfully');
        
        // Navigate to project list
        navigate(ROUTES.PROJECTS.LIST);
      } else if (createProject.rejected.match(resultAction)) {
        throw resultAction.payload;
      }
    } catch (err) {
      setError(err as ApiError);
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate]);

  return (
    <ErrorBoundary
      fallback={
        <Alert severity="error" sx={{ mt: 2 }}>
          Something went wrong while loading the project creation form.
          Please try refreshing the page.
        </Alert>
      }
    >
      <AppLayout>
        <Container
          maxWidth="lg"
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          {/* Page Header */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ mb: 3 }}
            aria-label="Create New Project"
          >
            Create New Project
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error"
              sx={{ mb: 3 }}
              role="alert"
              aria-live="polite"
            >
              {error.message || 'Failed to create project. Please try again.'}
            </Alert>
          )}

          {/* Loading Indicator */}
          {isSubmitting && (
            <CircularProgress
              size={24}
              sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px'
              }}
              aria-label="Creating project..."
            />
          )}

          {/* Project Creation Form */}
          <ProjectForm
            onSubmit={handleProjectSubmit}
            isEditing={false}
            initialData={{
              status: 'ACTIVE',
              priority: 'MEDIUM',
              progress: 0,
              tags: []
            }}
          />
        </Container>
      </AppLayout>
    </ErrorBoundary>
  );
};

// Add display name for debugging
ProjectCreate.displayName = 'ProjectCreate';

export default ProjectCreate;