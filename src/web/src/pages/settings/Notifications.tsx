import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  Divider,
  Button,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  NotificationsOutlined,
  EmailOutlined,
  PhoneAndroidOutlined,
  InfoOutlined
} from '@mui/icons-material';
import { useNotification } from '../../hooks/useNotification';
import { NotificationType } from '../../store/notification/notification.types';
import { THEME_CONSTANTS, ANIMATION_TIMINGS } from '../../constants/app.constants';

interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  push: boolean;
  taskAssigned: boolean;
  taskUpdated: boolean;
  projectCreated: boolean;
  frequency: 'immediate' | 'digest' | 'off';
}

/**
 * Notification Settings component implementing Material Design 3 principles
 * Provides real-time notification preference management with comprehensive error handling
 */
export const NotificationsSettings: React.FC = () => {
  // State management
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    inApp: true,
    push: false,
    taskAssigned: true,
    taskUpdated: true,
    projectCreated: true,
    frequency: 'immediate'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Hooks
  const { updatePreferences, getPreferences, subscribeToUpdates } = useNotification();

  // Load initial preferences
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      try {
        const savedPreferences = await getPreferences();
        if (savedPreferences) {
          setPreferences(savedPreferences);
        }
      } catch (err) {
        setError('Failed to load notification preferences');
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();

    // Subscribe to real-time preference updates
    const unsubscribe = subscribeToUpdates((updatedPreferences) => {
      setPreferences(prev => ({ ...prev, ...updatedPreferences }));
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [getPreferences, subscribeToUpdates]);

  // Handle channel preference changes
  const handleChannelChange = useCallback(async (channel: keyof NotificationPreferences) => {
    setIsDirty(true);
    setPreferences(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  }, []);

  // Handle notification type changes
  const handleTypeChange = useCallback(async (type: NotificationType) => {
    setIsDirty(true);
    setPreferences(prev => ({
      ...prev,
      [type.toLowerCase()]: !prev[type.toLowerCase() as keyof NotificationPreferences]
    }));
  }, []);

  // Save preferences with debouncing
  const savePreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await updatePreferences(preferences);
      setSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save notification preferences');
      console.error('Error saving preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [preferences, updatePreferences]);

  // Render loading state
  if (loading && !isDirty) {
    return (
      <Card sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  return (
    <Card sx={{ 
      maxWidth: 800, 
      margin: 'auto',
      boxShadow: THEME_CONSTANTS.ELEVATION.level2 
    }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ 
          ...THEME_CONSTANTS.TYPOGRAPHY.headlineLarge,
          color: THEME_CONSTANTS.COLOR_TOKENS.onBackground,
          mb: 3
        }}>
          <NotificationsOutlined sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Notification Settings
        </Typography>

        <Divider sx={{ mb: 4 }} />

        {/* Notification Channels */}
        <Typography variant="h6" gutterBottom sx={THEME_CONSTANTS.TYPOGRAPHY.bodyLarge}>
          Notification Channels
        </Typography>
        <FormGroup sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.email}
                onChange={() => handleChannelChange('email')}
                color="primary"
              />
            }
            label={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <EmailOutlined sx={{ mr: 1 }} />
                Email Notifications
                <Tooltip title="Receive notifications via email">
                  <InfoOutlined sx={{ ml: 1, fontSize: 16, color: THEME_CONSTANTS.COLOR_TOKENS.outline }} />
                </Tooltip>
              </div>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.inApp}
                onChange={() => handleChannelChange('inApp')}
                color="primary"
              />
            }
            label={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsOutlined sx={{ mr: 1 }} />
                In-App Notifications
                <Tooltip title="Receive notifications within the application">
                  <InfoOutlined sx={{ ml: 1, fontSize: 16, color: THEME_CONSTANTS.COLOR_TOKENS.outline }} />
                </Tooltip>
              </div>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.push}
                onChange={() => handleChannelChange('push')}
                color="primary"
              />
            }
            label={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PhoneAndroidOutlined sx={{ mr: 1 }} />
                Push Notifications
                <Tooltip title="Receive push notifications on your device">
                  <InfoOutlined sx={{ ml: 1, fontSize: 16, color: THEME_CONSTANTS.COLOR_TOKENS.outline }} />
                </Tooltip>
              </div>
            }
          />
        </FormGroup>

        <Divider sx={{ mb: 4 }} />

        {/* Notification Types */}
        <Typography variant="h6" gutterBottom sx={THEME_CONSTANTS.TYPOGRAPHY.bodyLarge}>
          Notification Types
        </Typography>
        <FormGroup sx={{ mb: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.taskAssigned}
                onChange={() => handleTypeChange(NotificationType.TASK_ASSIGNED)}
                color="primary"
              />
            }
            label="Task Assignments"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.taskUpdated}
                onChange={() => handleTypeChange(NotificationType.TASK_UPDATED)}
                color="primary"
              />
            }
            label="Task Updates"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.projectCreated}
                onChange={() => handleTypeChange(NotificationType.PROJECT_CREATED)}
                color="primary"
              />
            }
            label="Project Updates"
          />
        </FormGroup>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: '16px' 
        }}>
          <Button
            variant="contained"
            color="primary"
            disabled={!isDirty || loading}
            onClick={savePreferences}
            sx={{
              transition: `all ${ANIMATION_TIMINGS.DURATION.medium}ms ${ANIMATION_TIMINGS.EASING.standard}`,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: THEME_CONSTANTS.ELEVATION.level2
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </div>

        {/* Error/Success Messages */}
        <Snackbar
          open={!!error || success}
          autoHideDuration={6000}
          onClose={() => {
            setError(null);
            setSuccess(false);
          }}
        >
          <Alert
            severity={error ? 'error' : 'success'}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {error || 'Preferences saved successfully'}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default NotificationsSettings;