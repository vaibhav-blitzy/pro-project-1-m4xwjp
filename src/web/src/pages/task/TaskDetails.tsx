/**
 * @fileoverview Task details page component with comprehensive task information display,
 * real-time updates, and accessibility features
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query'; // v4.29.0
import { useForm } from 'react-hook-form'; // v7.45.0
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  IconButton,
  Divider,
} from '@mui/material'; // v5.14.0
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
} from '@mui/icons-material'; // v5.14.0

import { ITask, TaskPriority, TaskStatus } from '../../interfaces/task.interface';
import { useWebSocket } from '../../hooks/useWebSocket';
import { THEME_CONSTANTS, GRID, ANIMATION_TIMINGS } from '../../constants/app.constants';

// Enhanced interface for task details component state
interface TaskDetailsState {
  task: ITask | null;
  loading: {
    initial: boolean;
    update: boolean;
    attachment: boolean;
  };
  error: {
    fetch: string | null;
    update: string | null;
    attachment: string | null;
  };
  isEditing: boolean;
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  };
}

// Custom hook for managing task details with real-time updates
const useTaskDetails = (taskId: string) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<TaskDetailsState>({
    task: null,
    loading: {
      initial: true,
      update: false,
      attachment: false,
    },
    error: {
      fetch: null,
      update: null,
      attachment: null,
    },
    isEditing: false,
    snackbar: {
      open: false,
      message: '',
      severity: 'info',
    },
  });

  const { subscribe, connectionState } = useWebSocket(
    `${process.env.REACT_APP_WS_URL}/tasks`
  );

  // Fetch task details
  const fetchTaskDetails = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, initial: true },
        error: { ...prev.error, fetch: null },
      }));

      const response = await fetch(`/api/v1/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task details');

      const task = await response.json();
      setState(prev => ({
        ...prev,
        task,
        loading: { ...prev.loading, initial: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: { ...prev.error, fetch: error instanceof Error ? error.message : 'Unknown error' },
        loading: { ...prev.loading, initial: false },
      }));
    }
  }, [taskId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (connectionState === 'CONNECTED') {
      subscribe<ITask>(`task:${taskId}`, (updatedTask) => {
        setState(prev => ({
          ...prev,
          task: updatedTask,
        }));
        queryClient.setQueryData(['task', taskId], updatedTask);
      });
    }
  }, [taskId, connectionState, subscribe, queryClient]);

  // Initial fetch
  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  return {
    state,
    setState,
    refetch: fetchTaskDetails,
  };
};

interface TaskDetailsProps {
  taskId: string;
  onClose?: () => void;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ taskId, onClose }) => {
  const { state, setState, refetch } = useTaskDetails(taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset } = useForm<ITask>();

  // Handle task update
  const handleTaskUpdate = async (data: Partial<ITask>) => {
    try {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, update: true },
        error: { ...prev.error, update: null },
      }));

      const response = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update task');

      setState(prev => ({
        ...prev,
        isEditing: false,
        snackbar: {
          open: true,
          message: 'Task updated successfully',
          severity: 'success',
        },
        loading: { ...prev.loading, update: false },
      }));

      refetch();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: { ...prev.error, update: error instanceof Error ? error.message : 'Update failed' },
        loading: { ...prev.loading, update: false },
      }));
    }
  };

  // Handle file attachment
  const handleFileAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    try {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, attachment: true },
        error: { ...prev.error, attachment: null },
      }));

      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await fetch(`/api/v1/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload attachment');

      setState(prev => ({
        ...prev,
        snackbar: {
          open: true,
          message: 'File attached successfully',
          severity: 'success',
        },
        loading: { ...prev.loading, attachment: false },
      }));

      refetch();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: { ...prev.error, attachment: error instanceof Error ? error.message : 'Upload failed' },
        loading: { ...prev.loading, attachment: false },
      }));
    }
  };

  if (state.loading.initial) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (state.error.fetch) {
    return (
      <Alert severity="error" sx={{ margin: GRID.BASE_SPACING * 2 }}>
        {state.error.fetch}
      </Alert>
    );
  }

  if (!state.task) {
    return (
      <Alert severity="info" sx={{ margin: GRID.BASE_SPACING * 2 }}>
        Task not found
      </Alert>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        padding: GRID.BASE_SPACING * 3,
        margin: GRID.BASE_SPACING * 2,
        borderRadius: THEME_CONSTANTS.BORDER_RADIUS.medium,
      }}
    >
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1">
              {state.task.title}
            </Typography>
            <Box>
              <IconButton
                onClick={() => setState(prev => ({ ...prev, isEditing: true }))}
                aria-label="Edit task"
              >
                <EditIcon />
              </IconButton>
              {onClose && (
                <IconButton onClick={onClose} aria-label="Close task details">
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Task Details */}
        <Grid item xs={12} md={8}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            {state.isEditing ? (
              <TextField
                {...register('description')}
                defaultValue={state.task.description}
                multiline
                rows={4}
                fullWidth
              />
            ) : (
              <Typography>{state.task.description}</Typography>
            )}
          </Box>
        </Grid>

        {/* Task Metadata */}
        <Grid item xs={12} md={4}>
          <Box>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={state.task.status}
                onChange={(e) => handleTaskUpdate({ status: e.target.value as TaskStatus })}
                disabled={!state.isEditing}
              >
                {Object.values(TaskStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={state.task.priority}
                onChange={(e) => handleTaskUpdate({ priority: e.target.value as TaskPriority })}
                disabled={!state.isEditing}
              >
                {Object.values(TaskPriority).map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Due Date
              </Typography>
              <Typography>
                {new Date(state.task.dueDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Attachments */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Attachments
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {state.task.attachments.map((attachment) => (
              <Chip
                key={attachment.id}
                label={attachment.fileName}
                onDelete={() => {/* Handle attachment deletion */}}
                onClick={() => window.open(attachment.downloadUrl)}
              />
            ))}
            <Button
              startIcon={<AttachFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={state.loading.attachment}
            >
              Add Attachment
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileAttachment}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      {state.isEditing && (
        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
          <Button
            onClick={() => {
              reset();
              setState(prev => ({ ...prev, isEditing: false }));
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(handleTaskUpdate)}
            disabled={state.loading.update}
            startIcon={state.loading.update ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Save Changes
          </Button>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={6000}
        onClose={() => setState(prev => ({ ...prev, snackbar: { ...prev.snackbar, open: false } }))}
      >
        <Alert severity={state.snackbar.severity}>
          {state.snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default TaskDetails;