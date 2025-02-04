import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Grid,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation.utils';
import { FormFieldType } from '../../types/form.types';

// Interface for form data with comprehensive account settings
interface AccountFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  timezone: string;
  language: string;
  currentPassword: string;
  newPassword: string;
  enableNotifications: boolean;
  enable2FA: boolean;
  themePreference: 'light' | 'dark' | 'system';
}

const Account: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, loading } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with react-hook-form
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors }
  } = useForm<AccountFormData>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: user?.language || navigator.language,
      currentPassword: '',
      newPassword: '',
      enableNotifications: user?.enableNotifications || false,
      enable2FA: user?.enable2FA || false,
      themePreference: user?.themePreference || 'system'
    }
  });

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        timezone: user.timezone,
        language: user.language,
        enableNotifications: user.enableNotifications,
        enable2FA: user.enable2FA,
        themePreference: user.themePreference
      });
    }
  }, [user, reset]);

  // Handle form submission
  const onSubmit = useCallback(async (data: AccountFormData) => {
    try {
      setSaveStatus('saving');
      setErrorMessage(null);

      // Validate email and password if changed
      if (data.email !== user?.email) {
        const emailValidation = await validateEmail(data.email);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.message);
        }
      }

      if (data.newPassword) {
        const passwordValidation = await validatePassword(data.newPassword);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.message);
        }
      }

      // TODO: Implement API call to update account settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call

      setSaveStatus('success');
      // Announce success to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = t('settings.account.saveSuccess');
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);

    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [user, t]);

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    if (isDirty) {
      // TODO: Show confirmation dialog
      if (window.confirm(t('settings.account.confirmCancel'))) {
        reset();
        setSaveStatus('idle');
        setErrorMessage(null);
      }
    } else {
      reset();
      setSaveStatus('idle');
      setErrorMessage(null);
    }
  }, [isDirty, reset, t]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Box component="main" role="main" aria-label={t('settings.account.title')}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('settings.account.title')}
        </Typography>

        {errorMessage && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            role="alert"
          >
            {errorMessage}
          </Alert>
        )}

        <Card sx={{ mb: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.account.personalInfo')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="firstName"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.TEXT}
                    label={t('settings.account.firstName')}
                    required
                    error={errors.firstName?.message}
                    aria-label={t('settings.account.firstName')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="lastName"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.TEXT}
                    label={t('settings.account.lastName')}
                    required
                    error={errors.lastName?.message}
                    aria-label={t('settings.account.lastName')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="email"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.EMAIL}
                    label={t('settings.account.email')}
                    required
                    error={errors.email?.message}
                    aria-label={t('settings.account.email')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.TEXT}
                    label={t('settings.account.phoneNumber')}
                    error={errors.phoneNumber?.message}
                    aria-label={t('settings.account.phoneNumber')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Card>

        <Card sx={{ mb: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.account.preferences')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    label={t('settings.account.language')}
                    aria-label={t('settings.account.language')}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    label={t('settings.account.timezone')}
                    aria-label={t('settings.account.timezone')}
                  >
                    {Intl.supportedValuesOf('timeZone').map(tz => (
                      <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="themePreference"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    label={t('settings.account.theme')}
                    aria-label={t('settings.account.theme')}
                  >
                    <MenuItem value="light">{t('settings.account.themeLight')}</MenuItem>
                    <MenuItem value="dark">{t('settings.account.themeDark')}</MenuItem>
                    <MenuItem value="system">{t('settings.account.themeSystem')}</MenuItem>
                  </Select>
                )}
              />
            </Grid>
          </Grid>
        </Card>

        <Card sx={{ mb: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('settings.account.security')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="currentPassword"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.PASSWORD}
                    label={t('settings.account.currentPassword')}
                    error={errors.currentPassword?.message}
                    aria-label={t('settings.account.currentPassword')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={FormFieldType.PASSWORD}
                    label={t('settings.account.newPassword')}
                    error={errors.newPassword?.message}
                    aria-label={t('settings.account.newPassword')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="enable2FA"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        aria-label={t('settings.account.enable2FA')}
                      />
                    }
                    label={t('settings.account.enable2FA')}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="enableNotifications"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        aria-label={t('settings.account.enableNotifications')}
                      />
                    }
                    label={t('settings.account.enableNotifications')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Card>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            flexDirection: isMobile ? 'column' : 'row'
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={loading || saveStatus === 'saving'}
            aria-label={t('common.cancel')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            type="submit"
            loading={saveStatus === 'saving'}
            disabled={!isDirty || loading}
            aria-label={t('common.save')}
          >
            {t('common.save')}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default Account;