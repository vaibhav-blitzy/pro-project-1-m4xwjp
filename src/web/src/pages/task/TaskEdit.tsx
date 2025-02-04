import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container, Typography, Alert } from '@mui/material'; // v5.14.0

import TaskForm from '../../components/task/TaskForm';
import { ITask, ITaskFormData } from '../../interfaces/task.interface';
import { updateTask } from '../../store/task/task.actions';
import { RootState } from '../../types/store.types';

/**
 * TaskEdit component for editing existing tasks with comprehensive validation,
 * real-time updates, error handling, and accessibility features.
 */
const TaskEdit: React.FC = React.memo(() => {
  // Router hooks
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  // Redux hooks
  const dispatch = useDispatch();
  const task = useSelector((state: RootState) => 
    state.task.tasks.find(t => t.id === taskId)
  );
  const isLoading = useSelector((state: RootState) => state.task.status === 'loading');

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Handles form submission with validation and error handling
   * @param formData - Validated form data
   */
  const handleSubmit = useCallback(async (formData: ITaskFormData) => {
    try {
      setError(null);

      if (!taskId) {
        throw new Error('Task ID is required');
      }

      // Dispatch update action with optimistic updates
      await dispatch(updateTask({
        taskId,
        changes: formData,
        version: (task as ITask).version
      })).unwrap();

      // Navigate back to task details on success
      navigate(`/tasks/${taskId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
      // Announce error to screen readers
      const errorMessage = document.getElementById('error-message');
      if (errorMessage) {
        errorMessage.focus();
      }
    }
  }, [dispatch, navigate, taskId, task]);

  /**
   * Handles form cancellation with unsaved changes warning
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate(`/tasks/${taskId}`);
  }, [navigate, taskId, isDirty]);

  /**
   * Handles file upload with validation
   */
  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      if (!taskId) return;
      
      await dispatch(updateTask({
        taskId,
        changes: { attachments: files },
        version: (task as ITask).version
      })).unwrap();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    }
  }, [dispatch, taskId, task]);

  // Warn about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Redirect if task not found
  useEffect(() => {
    if (!task && !isLoading) {
      navigate('/tasks', { replace: true });
    }
  }, [task, isLoading, navigate]);

  if (!task) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ mb: 4 }}
        aria-label="Edit Task"
      >
        Edit Task: {task.title}
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          id="error-message"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </Alert>
      )}

      <TaskForm
        initialData={{
          title: task.title,
          description: task.description,
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          priority: task.priority,
          dueDate: new Date(task.dueDate),
          tags: task.tags,
          estimatedHours: task.estimatedHours
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        isDirty={isDirty}
      />
    </Container>
  );
});

TaskEdit.displayName = 'TaskEdit';

export default TaskEdit;