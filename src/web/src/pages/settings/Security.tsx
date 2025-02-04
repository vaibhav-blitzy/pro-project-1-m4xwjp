/**
 * @fileoverview Security settings page component implementing comprehensive security features
 * Supports password management, MFA setup, session management with accessibility compliance
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form'; // v7.45.0
import { 
  Container, 
  Paper, 
  Typography, 
  Grid, 
  Divider, 
  List, 
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Alert,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material'; // v5.14.0
import { 
  Visibility, 
  VisibilityOff, 
  PhoneEnabled, 
  Security as SecurityIcon,
  Logout as LogoutIcon,
  Warning as WarningIcon
} from '@mui/icons-material'; // v5.14.0
import { toast } from 'react-hot-toast'; // v2.4.1
import zxcvbn from 'zxcvbn'; // v4.4.2
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { GRID, THEME_CONSTANTS } from '../../constants/app.constants';

// Interfaces for form data
interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface MFASetupFormData {
  phoneNumber: string;
  verificationCode: string;
  backupCodesGenerated: boolean;
}

interface SessionData {
  sessionId: string;
  deviceType: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

/**
 * Security settings page component with comprehensive security features
 * Implements WCAG 2.1 Level AA compliance
 */
const Security: React.FC = () => {
  // Auth hook for security operations
  const { user, loading, updatePassword, setupMFA, terminateSession } = useAuth();

  // Form handling
  const passwordForm = useForm<ChangePasswordFormData>();
  const mfaForm = useForm<MFASetupFormData>();

  // Component state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(user?.mfaEnabled || false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  /**
   * Handles password change with validation and security checks
   */
  const handlePasswordChange = useCallback(async (data: ChangePasswordFormData) => {
    try {
      // Validate password strength
      const strength = zxcvbn(data.newPassword);
      if (strength.score < 3) {
        toast.error('Please choose a stronger password');
        return;
      }

      // Validate password confirmation
      if (data.newPassword !== data.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      await updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      toast.success('Password updated successfully');
      passwordForm.reset();
    } catch (error) {
      toast.error('Failed to update password');
      console.error('Password update failed:', error);
    }
  }, [updatePassword, passwordForm]);

  /**
   * Handles MFA setup process with phone verification
   */
  const handleMFASetup = useCallback(async (data: MFASetupFormData) => {
    try {
      await setupMFA({
        phoneNumber: data.phoneNumber,
        verificationCode: data.verificationCode
      });

      setMfaEnabled(true);
      toast.success('MFA setup completed successfully');
      mfaForm.reset();
    } catch (error) {
      toast.error('Failed to setup MFA');
      console.error('MFA setup failed:', error);
    }
  }, [setupMFA, mfaForm]);

  /**
   * Handles secure termination of active sessions
   */
  const handleSessionTermination = useCallback(async (sessionId: string) => {
    try {
      await terminateSession(sessionId);
      setSessions(prev => prev.filter(session => session.sessionId !== sessionId));
      toast.success('Session terminated successfully');
    } catch (error) {
      toast.error('Failed to terminate session');
      console.error('Session termination failed:', error);
    }
  }, [terminateSession]);

  /**
   * Updates password strength indicator
   */
  const handlePasswordStrength = useCallback((password: string) => {
    const result = zxcvbn(password);
    setPasswordStrength(result.score);
  }, []);

  return (
    <Container component="main" sx={{ py: GRID.LAYOUT_SPACING.section }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Security Settings
      </Typography>

      {/* Password Management Section */}
      <Paper sx={{ p: GRID.LAYOUT_SPACING.component, mb: GRID.LAYOUT_SPACING.section }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Password Management
        </Typography>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
          <Grid container spacing={GRID.LAYOUT_SPACING.element}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Current Password"
                {...passwordForm.register('currentPassword', { required: true })}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="New Password"
                {...passwordForm.register('newPassword', { required: true })}
                onChange={(e) => handlePasswordStrength(e.target.value)}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                Password strength: {['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][passwordStrength]}
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Confirm New Password"
                {...passwordForm.register('confirmPassword', { required: true })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                loading={loading}
                startIcon={<SecurityIcon />}
              >
                Update Password
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* MFA Setup Section */}
      <Paper sx={{ p: GRID.LAYOUT_SPACING.component, mb: GRID.LAYOUT_SPACING.section }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Multi-Factor Authentication
        </Typography>
        <Grid container spacing={GRID.LAYOUT_SPACING.element}>
          <Grid item xs={12}>
            <Switch
              checked={mfaEnabled}
              onChange={(e) => !mfaEnabled && mfaForm.reset()}
              aria-label="Enable MFA"
            />
            <Typography variant="body1" component="span" sx={{ ml: 2 }}>
              Enable Two-Factor Authentication
            </Typography>
          </Grid>
          {!mfaEnabled && (
            <Grid item xs={12}>
              <form onSubmit={mfaForm.handleSubmit(handleMFASetup)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      {...mfaForm.register('phoneNumber', { required: true })}
                      InputProps={{
                        startAdornment: <PhoneEnabled />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Verification Code"
                      {...mfaForm.register('verificationCode', { required: true })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      loading={loading}
                      startIcon={<SecurityIcon />}
                    >
                      Setup MFA
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Active Sessions Section */}
      <Paper sx={{ p: GRID.LAYOUT_SPACING.component }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Active Sessions
        </Typography>
        <List>
          {sessions.map((session) => (
            <ListItem key={session.sessionId}>
              <ListItemText
                primary={session.deviceType}
                secondary={`Last active: ${new Date(session.lastActive).toLocaleString()}`}
              />
              <ListItemSecondaryAction>
                {session.isCurrent ? (
                  <Tooltip title="Current Session">
                    <WarningIcon color="primary" />
                  </Tooltip>
                ) : (
                  <IconButton
                    edge="end"
                    aria-label="terminate session"
                    onClick={() => handleSessionTermination(session.sessionId)}
                  >
                    <LogoutIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default Security;