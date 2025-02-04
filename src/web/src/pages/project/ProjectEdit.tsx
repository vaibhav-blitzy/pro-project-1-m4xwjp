import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.11.2
import { toast } from 'react-toastify'; // v9.1.3
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import ProjectForm from '../../components/project/ProjectForm';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateProject } from '../../store/project/project.actions';
import { selectCurrentProject } from '../../store/project/project.selectors';
import { IProject } from '../../interfaces/project.interface';

/**
 * ProjectEdit component for modifying existing project details
 * Implements form-based project modification with validation and accessibility
 */
const ProjectEdit: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentProject = useAppSelector(selectCurrentProject);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if no project is selected
  useEffect(() => {
    if (!currentProject) {
      navigate('/projects');
      toast.error('No project selected for editing', {
        position: 'top-right',
        autoClose: 3000
      });
    }
  }, [currentProject, navigate]);

  /**
   * Handles project update submission with validation and error handling
   * @param projectData Updated project data
   */
  const handleProjectUpdate = async (projectData: IProject): Promise<void> => {
    if (!currentProject) return;

    try {
      setIsSubmitting(true);

      // Dispatch update action with optimistic update
      const result = await dispatch(updateProject({
        id: currentProject.id,
        projectData: {
          ...projectData,
          version: currentProject.version + 1
        }
      })).unwrap();

      toast.success('Project updated successfully', {
        position: 'top-right',
        autoClose: 3000
      });

      // Navigate back to project details
      navigate(`/projects/${result.id}`);
    } catch (error: any) {
      // Handle RFC 7807 error responses
      const errorMessage = error.details?.message || 'Failed to update project';
      toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000
      });

      // Log error for monitoring
      console.error('Project update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state if no current project
  if (!currentProject) {
    return (
      <div className="project-edit__loading" role="status" aria-live="polite">
        <span>Loading project details...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallbackMessage="Error occurred while editing project"
      onError={(error) => {
        console.error('Project edit error:', error);
        toast.error('An unexpected error occurred');
      }}
    >
      <div 
        className="project-edit"
        role="main"
        aria-label="Edit Project Form"
      >
        <header className="project-edit__header">
          <h1 className="project-edit__title">
            Edit Project: {currentProject.name}
          </h1>
        </header>

        <ProjectForm
          initialData={currentProject}
          onSubmit={handleProjectUpdate}
          isEditing={true}
          isSubmitting={isSubmitting}
        />
      </div>
    </ErrorBoundary>
  );
};

// Export enhanced component with error boundary
export default ProjectEdit;