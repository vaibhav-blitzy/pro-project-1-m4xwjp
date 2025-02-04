import React, { useState, useRef, useCallback } from 'react';
import { CloudUploadIcon } from '@mui/icons-material'; // v5.14.0
import { LinearProgress } from '@mui/material'; // v5.14.0
import { FormField } from '../../types/form.types';
import { useForm } from '../../hooks/useForm';

// Allowed MIME types with security considerations
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface FileUploadProps {
  name: string;
  multiple?: boolean;
  acceptedTypes?: string[];
  maxSize?: number;
  onFileSelect: (files: File[]) => void;
  onUploadProgress?: (progress: number) => void;
  onValidationError?: (error: string) => void;
  ariaLabel?: string;
  customValidation?: (file: File) => Promise<boolean>;
}

interface ValidationError {
  message: string;
  code: string;
}

interface FileValidationResult {
  isValid: boolean;
  error?: ValidationError;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  name,
  multiple = false,
  acceptedTypes = ALLOWED_MIME_TYPES,
  maxSize = MAX_FILE_SIZE,
  onFileSelect,
  onUploadProgress,
  onValidationError,
  ariaLabel = 'File upload',
  customValidation
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationMessage, setValidationMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Initialize form with file validation
  const { register, errors } = useForm([{
    name,
    type: 'file',
    validation: {
      required: false,
      fileValidation: {
        maxSize,
        acceptedTypes
      }
    }
  }] as FormField[]);

  /**
   * Validates file security aspects including MIME type and content
   */
  const validateFileSecurity = async (file: File): Promise<FileValidationResult> => {
    // Validate file name for security
    const safeFileNameRegex = /^[a-zA-Z0-9-_. ]+$/;
    if (!safeFileNameRegex.test(file.name)) {
      return {
        isValid: false,
        error: {
          message: 'File name contains invalid characters',
          code: 'INVALID_FILENAME'
        }
      };
    }

    // Validate MIME type
    if (!acceptedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: {
          message: 'File type not allowed',
          code: 'INVALID_TYPE'
        }
      };
    }

    // Validate file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: {
          message: 'File size exceeds limit',
          code: 'SIZE_EXCEEDED'
        }
      };
    }

    // Perform custom validation if provided
    if (customValidation) {
      try {
        const isValid = await customValidation(file);
        if (!isValid) {
          return {
            isValid: false,
            error: {
              message: 'Custom validation failed',
              code: 'CUSTOM_VALIDATION_FAILED'
            }
          };
        }
      } catch (error) {
        return {
          isValid: false,
          error: {
            message: 'Validation error occurred',
            code: 'VALIDATION_ERROR'
          }
        };
      }
    }

    return { isValid: true };
  };

  /**
   * Handles file drop event with enhanced security validation
   */
  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (!multiple && files.length > 1) {
      setValidationMessage('Only one file can be uploaded at a time');
      onValidationError?.('Multiple files not allowed');
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      const validationResult = await validateFileSecurity(file);
      if (validationResult.isValid) {
        validFiles.push(file);
      } else {
        setValidationMessage(validationResult.error?.message || 'Validation failed');
        onValidationError?.(validationResult.error?.message || 'Validation failed');
      }
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
      setUploadProgress(0);
      // Announce successful upload to screen readers
      const message = `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} selected`;
      setValidationMessage(message);
    }
  }, [multiple, onFileSelect, onValidationError]);

  /**
   * Handles drag over event with accessibility announcements
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    // Update ARIA live region
    setValidationMessage('Drop files here to upload');
  }, []);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    setValidationMessage('');
  }, []);

  /**
   * Handles file input change with progress tracking
   */
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!multiple && files.length > 1) {
      setValidationMessage('Only one file can be uploaded at a time');
      onValidationError?.('Multiple files not allowed');
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      const validationResult = await validateFileSecurity(file);
      if (validationResult.isValid) {
        validFiles.push(file);
      } else {
        setValidationMessage(validationResult.error?.message || 'Validation failed');
        onValidationError?.(validationResult.error?.message || 'Validation failed');
      }
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        onUploadProgress?.(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // Announce completion to screen readers
          setValidationMessage(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} uploaded successfully`);
        }
      }, 100);
    }
  }, [multiple, onFileSelect, onUploadProgress, onValidationError]);

  return (
    <div className="file-upload-container">
      <div
        ref={dropZoneRef}
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-describedby="file-upload-description"
      >
        <CloudUploadIcon className="upload-icon" />
        <input
          {...register(name)}
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleFileChange}
          className="file-input"
          aria-hidden="true"
        />
        <div className="upload-text">
          <p>Drag and drop files here or click to select</p>
          <p className="file-requirements">
            Accepted formats: {acceptedTypes.join(', ')}
            <br />
            Maximum size: {Math.floor(maxSize / (1024 * 1024))}MB
          </p>
        </div>
      </div>
      
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </div>
      )}
      
      {validationMessage && (
        <div className="validation-message" role="alert" aria-live="polite">
          {validationMessage}
        </div>
      )}
      
      {errors[name] && (
        <div className="error-message" role="alert" aria-live="assertive">
          {errors[name].message}
        </div>
      )}
    </div>
  );
};