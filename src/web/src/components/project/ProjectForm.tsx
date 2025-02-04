import React, { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorBoundary } from 'react-error-boundary';
import { IProject, ProjectPriority } from '../../interfaces/project.interface';
import { projectValidationSchema } from '../../validators/project.validator';
import { useForm } from '../../hooks/useForm';

/**
 * Props interface for ProjectForm component
 */
interface ProjectFormProps {
  initialData?: Partial<IProject>;
  onSubmit: (data: IProject) => Promise<void>;
  isEditing?: boolean;
}

/**
 * Enhanced ProjectForm component with security validation and accessibility
 * @version 1.0.0
 */
export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  isEditing = false
}) => {
  // Form state management with enhanced security and accessibility
  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    accessibilityContext,
    securityState,
    watch,
    reset
  } = useForm(
    [
      {
        name: 'name',
        type: 'text',
        label: 'Project Name',
        validation: {
          required: true,
          minLength: 3,
          maxLength: 100,
          errorMessage: { key: 'project.name.error', params: {} },
          ariaLabel: 'Project name input',
          accessibilityRules: {
            ariaRequired: true,
            ariaInvalid: false,
            ariaDescribedBy: 'project-name-error'
          }
        }
      },
      // Additional field configurations...
    ],
    onSubmit,
    {
      mode: 'onBlur',
      defaultValues: initialData
    }
  );

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const formValues = watch();

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formValues]);

  /**
   * Handles form submission with enhanced error handling
   */
  const handleFormSubmit = async (data: IProject) => {
    try {
      await onSubmit(data);
      setHasUnsavedChanges(false);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
      // Handle error appropriately
    }
  };

  /**
   * Renders form fields with accessibility support
   */
  const renderFormFields = () => (
    <div className="project-form__fields" role="group" aria-label="Project details">
      {/* Project Name */}
      <div className="form-field">
        <label htmlFor="name" className="form-label">
          Project Name
          <span className="required-indicator" aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`form-input ${errors.name ? 'form-input--error' : ''}`}
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby="name-error"
        />
        {errors.name && (
          <span id="name-error" className="error-message" role="alert">
            {errors.name.message}
          </span>
        )}
      </div>

      {/* Project Description */}
      <div className="form-field">
        <label htmlFor="description" className="form-label">
          Description
          <span className="required-indicator" aria-hidden="true">*</span>
        </label>
        <textarea
          id="description"
          className={`form-textarea ${errors.description ? 'form-textarea--error' : ''}`}
          {...register('description')}
          aria-invalid={!!errors.description}
          aria-describedby="description-error"
        />
        {errors.description && (
          <span id="description-error" className="error-message" role="alert">
            {errors.description.message}
          </span>
        )}
      </div>

      {/* Project Priority */}
      <div className="form-field">
        <label htmlFor="priority" className="form-label">
          Priority
          <span className="required-indicator" aria-hidden="true">*</span>
        </label>
        <select
          id="priority"
          className={`form-select ${errors.priority ? 'form-select--error' : ''}`}
          {...register('priority')}
          aria-invalid={!!errors.priority}
          aria-describedby="priority-error"
        >
          <option value="">Select Priority</option>
          {Object.values(ProjectPriority).map((priority) => (
            <option key={priority} value={priority}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </option>
          ))}
        </select>
        {errors.priority && (
          <span id="priority-error" className="error-message" role="alert">
            {errors.priority.message}
          </span>
        )}
      </div>

      {/* Project Dates */}
      <div className="form-field-group" role="group" aria-label="Project timeline">
        <div className="form-field">
          <label htmlFor="startDate" className="form-label">
            Start Date
            <span className="required-indicator" aria-hidden="true">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            className={`form-input ${errors.startDate ? 'form-input--error' : ''}`}
            {...register('startDate')}
            aria-invalid={!!errors.startDate}
            aria-describedby="startDate-error"
          />
          {errors.startDate && (
            <span id="startDate-error" className="error-message" role="alert">
              {errors.startDate.message}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="endDate" className="form-label">
            End Date
            <span className="required-indicator" aria-hidden="true">*</span>
          </label>
          <input
            id="endDate"
            type="date"
            className={`form-input ${errors.endDate ? 'form-input--error' : ''}`}
            {...register('endDate')}
            aria-invalid={!!errors.endDate}
            aria-describedby="endDate-error"
          />
          {errors.endDate && (
            <span id="endDate-error" className="error-message" role="alert">
              {errors.endDate.message}
            </span>
          )}
        </div>
      </div>

      {/* Project Tags */}
      <div className="form-field">
        <label htmlFor="tags" className="form-label">
          Tags
        </label>
        <input
          id="tags"
          type="text"
          className={`form-input ${errors.tags ? 'form-input--error' : ''}`}
          placeholder="Enter tags separated by commas"
          {...register('tags')}
          aria-invalid={!!errors.tags}
          aria-describedby="tags-error tags-hint"
        />
        <span id="tags-hint" className="input-hint">
          Enter tags separated by commas (e.g., frontend, urgent, feature)
        </span>
        {errors.tags && (
          <span id="tags-error" className="error-message" role="alert">
            {errors.tags.message}
          </span>
        )}
      </div>
    </div>
  );

  /**
   * Renders form actions with loading states
   */
  const renderActions = () => (
    <div className="form-actions">
      <button
        type="submit"
        className="button button--primary"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
      </button>
      {hasUnsavedChanges && (
        <p className="unsaved-changes" role="status">
          You have unsaved changes
        </p>
      )}
    </div>
  );

  return (
    <ErrorBoundary
      fallback={<div className="error-boundary">Something went wrong</div>}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="project-form"
        noValidate
        aria-label={isEditing ? 'Edit Project Form' : 'Create Project Form'}
      >
        {/* Accessibility announcements */}
        <div className="sr-only" aria-live={accessibilityContext.ariaLive}>
          {accessibilityContext.announcements.map((announcement, index) => (
            <div key={index}>{announcement}</div>
          ))}
        </div>

        {/* Security violations */}
        {securityState.hasSecurityViolations && (
          <div className="security-alert" role="alert">
            <h3>Security Violations Detected</h3>
            <ul>
              {securityState.securityMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {renderFormFields()}
        {renderActions()}
      </form>
    </ErrorBoundary>
  );
};

export default ProjectForm;