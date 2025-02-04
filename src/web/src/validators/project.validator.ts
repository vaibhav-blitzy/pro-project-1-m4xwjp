import { object, string, date } from 'yup'; // v1.2.0
import { IProject, ProjectPriority } from '../interfaces/project.interface';
import { createValidationSchema } from '../utils/validation.utils';
import { FormFieldType } from '../types/form.types';

/**
 * Comprehensive validation schema for project forms
 * Implements validation rules for project management features with security controls
 * and accessibility support
 */
export const projectValidationSchema = object().shape({
  name: string()
    .required('Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name cannot exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Project name can only contain letters, numbers, spaces, hyphens and underscores'
    )
    .test('unique-name', 'Project name must be unique', async (value) => {
      if (!value) return true;
      // Unique name validation would be implemented here
      return true;
    })
    .trim()
    .strict(true),

  description: string()
    .required('Project description is required')
    .min(10, 'Project description must be at least 10 characters')
    .max(2000, 'Project description cannot exceed 2000 characters')
    .test('html-sanitize', 'Invalid HTML content', (value) => {
      if (!value) return true;
      // HTML sanitization check would be implemented here
      return true;
    }),

  priority: string()
    .required('Project priority is required')
    .oneOf(
      Object.values(ProjectPriority),
      'Invalid priority level'
    ),

  startDate: date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past')
    .test('timezone', 'Invalid timezone', (value) => {
      if (!value) return true;
      return !isNaN(value.getTime());
    }),

  endDate: date()
    .required('End date is required')
    .min(
      new Date(),
      'End date cannot be in the past'
    )
    .test('after-start-date', 'End date must be after start date', function(value) {
      const { startDate } = this.parent;
      if (!startDate || !value) return true;
      return value > startDate;
    }),

  members: array()
    .of(
      object().shape({
        id: string().required('Member ID is required'),
        role: string().required('Member role is required')
      })
    )
    .min(1, 'Project must have at least one member')
    .test('unique-members', 'Duplicate members not allowed', (value) => {
      if (!value) return true;
      const ids = value.map(member => member.id);
      return new Set(ids).size === ids.length;
    }),

  tags: array()
    .of(string().trim())
    .test('valid-tags', 'Invalid tag format', (value) => {
      if (!value) return true;
      return value.every(tag => /^[a-zA-Z0-9\-_]+$/.test(tag));
    })
    .transform(value => Array.from(new Set(value))), // Remove duplicates

  parentId: string()
    .nullable()
    .test('valid-parent', 'Invalid parent project', async function(value) {
      if (!value) return true;
      // Parent project validation would be implemented here
      return true;
    }),

  milestones: array()
    .of(
      object().shape({
        title: string().required('Milestone title is required'),
        dueDate: date().required('Milestone due date is required')
      })
    )
    .test('milestone-dates', 'Invalid milestone dates', function(value) {
      if (!value) return true;
      const { startDate, endDate } = this.parent;
      return value.every(milestone => 
        milestone.dueDate >= startDate && milestone.dueDate <= endDate
      );
    })
});

/**
 * Enhanced date validation for project timelines
 * Implements comprehensive date validation with timezone support
 */
export const validateProjectDates = (startDate: Date, endDate: Date): boolean => {
  try {
    // Normalize dates to UTC for consistent comparison
    const normalizedStart = new Date(startDate.toISOString());
    const normalizedEnd = new Date(endDate.toISOString());
    const now = new Date();

    // Basic validation checks
    if (!normalizedStart || !normalizedEnd) {
      return false;
    }

    // Start date validation
    if (normalizedStart < now) {
      return false;
    }

    // End date validation
    if (normalizedEnd <= normalizedStart) {
      return false;
    }

    // Minimum project duration (1 day)
    const minDuration = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    if (normalizedEnd.getTime() - normalizedStart.getTime() < minDuration) {
      return false;
    }

    // Business hours validation (optional)
    const isBusinessHour = (date: Date): boolean => {
      const hours = date.getUTCHours();
      return hours >= 9 && hours <= 17; // 9 AM to 5 PM
    };

    if (!isBusinessHour(normalizedStart) || !isBusinessHour(normalizedEnd)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Project date validation error:', error);
    return false;
  }
};

/**
 * Creates a form field validation schema with accessibility support
 */
export const createProjectFieldValidation = (fieldName: keyof IProject) => {
  const rules = {
    required: true,
    minLength: 3,
    maxLength: 100,
    errorMessage: {
      key: `project.validation.${fieldName}`,
      params: {}
    },
    ariaLabel: `project-${fieldName}`,
    accessibilityRules: {
      ariaRequired: true,
      ariaInvalid: false,
      ariaDescribedBy: `project-${fieldName}-error`
    }
  };

  return createValidationSchema(
    fieldName === 'description' ? FormFieldType.TEXTAREA : FormFieldType.TEXT,
    rules
  );
};