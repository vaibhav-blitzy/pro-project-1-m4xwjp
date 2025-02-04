import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, Typography, Button, CircularProgress, Alert } from '@mui/material'; // v5.14.0
import { useDebounce } from 'use-debounce'; // v9.0.4

import { IUserProfile } from '../../interfaces/user.interface';
import { FileUpload } from '../../components/common/FileUpload';
import { useForm } from '../../hooks/useForm';
import { FormFieldType } from '../../types/form.types';

// Interface for profile form data with validation
interface ProfileFormData {
  name: string;
  email: string;
  preferences: {
    theme: string;
    language: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    darkMode: boolean;
  };
  avatarUrl: string;
}

/**
 * Profile settings component with enhanced security and accessibility
 * Implements WCAG 2.1 Level AA compliance for form interactions
 */
const Profile: React.FC = () => {
  // Component state
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize form with validation rules
  const { register, handleSubmit, errors, watch, accessibilityContext } = useForm([
    {
      name: 'name',
      type: FormFieldType.TEXT,
      label: 'Full Name',
      validation: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z\s-']+$/,
        ariaLabel: 'Full name',
        errorMessage: {
          key: 'Please enter a valid name',
          params: {}
        },
        accessibilityRules: {
          ariaRequired: true,
          ariaInvalid: false,
          ariaDescribedBy: 'name-error'
        }
      }
    },
    {
      name: 'email',
      type: FormFieldType.EMAIL,
      label: 'Email Address',
      validation: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        ariaLabel: 'Email address',
        errorMessage: {
          key: 'Please enter a valid email address',
          params: {}
        },
        accessibilityRules: {
          ariaRequired: true,
          ariaInvalid: false,
          ariaDescribedBy: 'email-error'
        }
      }
    }
  ]);

  // Watch form changes for auto-save
  const formData = watch();
  const [debouncedFormData] = useDebounce(formData, 1000);

  /**
   * Handles secure profile data update with validation
   */
  const handleProfileUpdate = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFormErrors({});

    try {
      // Sanitize and validate input data
      const sanitizedData = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim()
      };

      // Update profile with encrypted PII data
      await handleSubmit(sanitizedData);
      
      setSuccessMessage('Profile updated successfully');
      setIsDirty(false);
      
      // Announce success to screen readers
      const announcement = 'Your profile has been successfully updated';
      accessibilityContext.announcements.push(announcement);
      
    } catch (error) {
      setFormErrors({
        submit: 'Failed to update profile. Please try again.'
      });
      
      // Announce error to screen readers
      const errorMessage = 'An error occurred while updating your profile';
      accessibilityContext.announcements.push(errorMessage);
      
    } finally {
      setLoading(false);
    }
  }, [formData, handleSubmit, accessibilityContext]);

  /**
   * Handles secure avatar upload with validation
   */
  const handleAvatarUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;

    const file = files[0];
    setUploadProgress(0);

    try {
      // Update progress for screen readers
      const progressAnnouncement = `Uploading profile picture: ${uploadProgress}%`;
      accessibilityContext.announcements.push(progressAnnouncement);

      // Handle upload progress
      const onProgress = (progress: number) => {
        setUploadProgress(progress);
        if (progress === 100) {
          const completeAnnouncement = 'Profile picture upload complete';
          accessibilityContext.announcements.push(completeAnnouncement);
        }
      };

      await FileUpload.onFileSelect([file]);
      
    } catch (error) {
      setFormErrors({
        avatar: 'Failed to upload profile picture. Please try again.'
      });
      
      // Announce error to screen readers
      const errorMessage = 'An error occurred while uploading your profile picture';
      accessibilityContext.announcements.push(errorMessage);
    }
  }, [uploadProgress, accessibilityContext]);

  /**
   * Auto-saves form changes after debounce
   */
  useEffect(() => {
    if (isDirty && debouncedFormData) {
      handleProfileUpdate({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [debouncedFormData, isDirty, handleProfileUpdate]);

  return (
    <Card component="section" aria-labelledby="profile-title">
      <CardContent>
        <Typography variant="h5" component="h1" id="profile-title" gutterBottom>
          Profile Settings
        </Typography>

        <form onSubmit={handleProfileUpdate} noValidate>
          <div role="group" aria-labelledby="personal-info-title">
            <Typography variant="h6" id="personal-info-title" gutterBottom>
              Personal Information
            </Typography>

            {/* Name field */}
            <div className="form-field">
              <label htmlFor="name" className="form-label">
                Full Name
                <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                className="form-input"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby="name-error"
              />
              {errors.name && (
                <span id="name-error" className="error-message" role="alert">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Email field */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email Address
                <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                className="form-input"
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby="email-error"
              />
              {errors.email && (
                <span id="email-error" className="error-message" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Avatar upload */}
            <div className="form-field">
              <Typography variant="subtitle1" gutterBottom>
                Profile Picture
              </Typography>
              <FileUpload
                name="avatar"
                acceptedTypes={['image/jpeg', 'image/png']}
                maxSize={5 * 1024 * 1024} // 5MB
                onFileSelect={handleAvatarUpload}
                onUploadProgress={setUploadProgress}
                ariaLabel="Upload profile picture"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                  <CircularProgress variant="determinate" value={uploadProgress} />
                  <span className="sr-only">Upload progress: {uploadProgress}%</span>
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="form-actions">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Success message */}
            {successMessage && (
              <Alert 
                severity="success" 
                role="status"
                aria-live="polite"
                className="success-message"
              >
                {successMessage}
              </Alert>
            )}

            {/* Error message */}
            {formErrors.submit && (
              <Alert 
                severity="error" 
                role="alert"
                className="error-message"
              >
                {formErrors.submit}
              </Alert>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default Profile;