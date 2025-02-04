import React, { useCallback, useEffect, useMemo } from 'react';
import { Grid, Button, FormControlLabel, Checkbox } from '@mui/material'; // v5.14.0
import { useForm } from 'react-hook-form'; // v7.45.0
import { DatePicker } from '@mui/x-date-pickers'; // v6.10.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import * as yup from 'yup'; // v1.2.0

import { Input } from '../common/Input';
import { FileUpload } from '../common/FileUpload';
import { ITaskFormData, TaskPriority } from '../../interfaces/task.interface';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface TaskFormProps {
  initialData?: Partial<ITaskFormData>;
  onSubmit: (data: ITaskFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onFileUpload?: (files: File[]) => Promise<void>;
  isDirty?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = React.memo(({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  onFileUpload,
  isDirty = false
}) => {
  const { t } = useTranslation();

  // Validation schema with comprehensive rules
  const validationSchema = useMemo(() => yup.object().shape({
    title: yup.string()
      .required(t('task.validation.titleRequired'))
      .min(3, t('task.validation.titleMinLength'))
      .max(100, t('task.validation.titleMaxLength')),
    description: yup.string()
      .required(t('task.validation.descriptionRequired'))
      .max(2000, t('task.validation.descriptionMaxLength')),
    projectId: yup.string()
      .required(t('task.validation.projectRequired'))
      .uuid(t('task.validation.invalidProjectId')),
    assigneeId: yup.string()
      .required(t('task.validation.assigneeRequired'))
      .uuid(t('task.validation.invalidAssigneeId')),
    priority: yup.string()
      .required(t('task.validation.priorityRequired'))
      .oneOf(Object.values(TaskPriority), t('task.validation.invalidPriority')),
    dueDate: yup.date()
      .required(t('task.validation.dueDateRequired'))
      .min(new Date(), t('task.validation.dueDateFuture')),
    tags: yup.array().of(yup.string()),
    estimatedHours: yup.number()
      .positive(t('task.validation.positiveHours'))
      .max(1000, t('task.validation.maxHours'))
      .nullable(),
    parentTaskId: yup.string()
      .uuid(t('task.validation.invalidParentId'))
      .nullable()
  }), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<ITaskFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: initialData || {},
    mode: 'onBlur'
  });

  // Handle form submission with loading state
  const handleFormSubmit = useCallback(async (data: ITaskFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  }, [onSubmit, reset]);

  // Handle file upload with validation
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!onFileUpload) return;

    const validFiles = files.filter(file => 
      file.size <= MAX_FILE_SIZE && 
      /^[a-zA-Z0-9-_. ]+$/.test(file.name)
    );

    if (validFiles.length > 0) {
      await onFileUpload(validFiles);
    }
  }, [onFileUpload]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = t('task.unsavedChanges');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, t]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Input
            name="title"
            type="text"
            label={t('task.fields.title')}
            required
            error={errors.title?.message}
            register={register}
            autoFocus
          />
        </Grid>

        <Grid item xs={12}>
          <Input
            name="description"
            type="textarea"
            label={t('task.fields.description')}
            required
            error={errors.description?.message}
            register={register}
            maxLength={2000}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Input
            name="projectId"
            type="select"
            label={t('task.fields.project')}
            required
            error={errors.projectId?.message}
            register={register}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Input
            name="assigneeId"
            type="select"
            label={t('task.fields.assignee')}
            required
            error={errors.assigneeId?.message}
            register={register}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Input
            name="priority"
            type="select"
            label={t('task.fields.priority')}
            required
            error={errors.priority?.message}
            register={register}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label={t('task.fields.dueDate')}
            value={watch('dueDate')}
            onChange={(date) => setValue('dueDate', date as Date)}
            renderInput={(params) => (
              <Input
                {...params}
                name="dueDate"
                type="text"
                error={errors.dueDate?.message}
                required
              />
            )}
            minDate={new Date()}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Input
            name="estimatedHours"
            type="number"
            label={t('task.fields.estimatedHours')}
            error={errors.estimatedHours?.message}
            register={register}
          />
        </Grid>

        <Grid item xs={12}>
          <FileUpload
            name="attachments"
            multiple
            onFileSelect={handleFileUpload}
            maxSize={MAX_FILE_SIZE}
            ariaLabel={t('task.fields.attachments')}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                {...register('includeSubtasks')}
                color="primary"
              />
            }
            label={t('task.fields.createSubtask')}
          />
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="flex-end">
            <Grid item>
              <Button
                type="button"
                onClick={onCancel}
                disabled={isLoading || isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isLoading || isSubmitting}
              >
                {t('common.save')}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </form>
  );
});

TaskForm.displayName = 'TaskForm';

export default TaskForm;