import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import { useDispatch } from 'react-redux'; // v8.1.0
import { 
  Container, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // v5.14.0

import TaskForm from '../../components/task/TaskForm';
import { createTask } from '../../store/task/task.actions';
import { ITaskFormData } from '../../interfaces/task.interface';

/**
 * TaskCreate page component for creating new tasks
 * Implements Task Management requirements from Technical Specifications section 1.3
 * Includes WCAG 2.1 Level AA compliance and Material Design 3
 */
const TaskCreate: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Handles form submission with validation and error handling
   * Implements RFC 7807 problem details for error responses
   */
  const handleSubmit = useCallback(async (formData: ITaskFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Dispatch task creation action
      const result = await dispatch(createTask(formData)).unwrap();
      
      // Handle successful creation
      if (result) {
        // Reset form state
        setIsDirty(false);
        
        // Navigate to task detail view
        navigate(`/tasks/${result.id}`);
      }
    } catch (error: any) {
      // Handle RFC 7807 error format
      setError(
        error.details?.message || 
        error.message || 
        'An error occurred while creating the task'
      );
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, navigate]);

  /**
   * Handles form cancellation with unsaved changes warning
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    navigate('/tasks');
  }, [isDirty, navigate]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper 
        elevation={2} 
        sx={{ p: 4 }}
        role="main"
        aria-label="Create new task"
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ mb: 4 }}
        >
          Create New Task
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            role="alert"
            aria-live="polite"
          >
            {error}
          </Alert>
        )}

        {isLoading && (
          <CircularProgress 
            size={24} 
            sx={{ 
              position: 'absolute', 
              top: '1rem', 
              right: '1rem' 
            }}
            aria-label="Creating task..."
          />
        )}

        <TaskForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          onDirtyChange={setIsDirty}
          aria-label="Task creation form"
        />
      </Paper>
    </Container>
  );
});

// Display name for debugging
TaskCreate.displayName = 'TaskCreate';

export default TaskCreate;