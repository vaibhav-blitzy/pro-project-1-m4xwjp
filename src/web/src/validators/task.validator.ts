import { object, string, date, array, number } from 'yup'; // v1.2.0
import { ITaskFormData, TaskPriority } from '../interfaces/task.interface';
import { createValidationSchema } from '../utils/validation.utils';

/**
 * Regular expressions for enhanced security validation
 */
const SECURITY_PATTERNS = {
  // Prevents XSS in title/description
  SAFE_TEXT: /^[^<>{}]*$/,
  // UUID v4 format for IDs
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  // Allows alphanumeric and common special chars for tags
  TAG: /^[\w\s-_.#@]{1,50}$/
};

/**
 * Constants for validation rules
 */
const VALIDATION_LIMITS = {
  TITLE: {
    MIN: 3,
    MAX: 100
  },
  DESCRIPTION: {
    MAX: 2000
  },
  TAGS: {
    MAX_COUNT: 10,
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  ATTACHMENTS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx']
  },
  ESTIMATED_HOURS: {
    MIN: 0.5,
    MAX: 168 // 1 week
  }
};

/**
 * Creates a comprehensive task validation schema with accessibility support
 * @returns Yup validation schema for task form data
 */
export const createTaskValidationSchema = () => {
  return object({
    title: string()
      .required('Task title is required')
      .min(VALIDATION_LIMITS.TITLE.MIN, `Title must be at least ${VALIDATION_LIMITS.TITLE.MIN} characters`)
      .max(VALIDATION_LIMITS.TITLE.MAX, `Title cannot exceed ${VALIDATION_LIMITS.TITLE.MAX} characters`)
      .matches(SECURITY_PATTERNS.SAFE_TEXT, 'Title contains invalid characters')
      .test('title-accessibility', 'Title must be descriptive', (value) => {
        return value ? value.trim().length >= VALIDATION_LIMITS.TITLE.MIN : false;
      })
      .label('Task Title'),

    description: string()
      .required('Task description is required')
      .max(VALIDATION_LIMITS.DESCRIPTION.MAX, `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION.MAX} characters`)
      .matches(SECURITY_PATTERNS.SAFE_TEXT, 'Description contains invalid characters')
      .label('Task Description'),

    projectId: string()
      .required('Project selection is required')
      .matches(SECURITY_PATTERNS.UUID, 'Invalid project ID format')
      .label('Project'),

    assigneeId: string()
      .required('Task assignee is required')
      .matches(SECURITY_PATTERNS.UUID, 'Invalid assignee ID format')
      .label('Assignee'),

    priority: string()
      .required('Task priority is required')
      .oneOf(
        Object.values(TaskPriority),
        `Priority must be one of: ${Object.values(TaskPriority).join(', ')}`
      )
      .label('Priority Level'),

    dueDate: date()
      .required('Due date is required')
      .min(new Date(), 'Due date cannot be in the past')
      .test('business-hours', 'Due date must be within business hours', (value) => {
        if (!value) return true;
        const hours = value.getHours();
        return hours >= 9 && hours <= 17;
      })
      .label('Due Date'),

    tags: array()
      .of(
        string()
          .matches(SECURITY_PATTERNS.TAG, 'Tag contains invalid characters')
          .min(VALIDATION_LIMITS.TAGS.MIN_LENGTH, 'Tag is too short')
          .max(VALIDATION_LIMITS.TAGS.MAX_LENGTH, 'Tag is too long')
      )
      .max(VALIDATION_LIMITS.TAGS.MAX_COUNT, `Cannot add more than ${VALIDATION_LIMITS.TAGS.MAX_COUNT} tags`)
      .label('Tags'),

    attachments: array()
      .of(
        object({
          size: number()
            .max(VALIDATION_LIMITS.ATTACHMENTS.MAX_SIZE, 'File size exceeds limit')
            .label('File Size'),
          type: string()
            .test('file-type', 'Invalid file type', (value) => {
              if (!value) return true;
              return VALIDATION_LIMITS.ATTACHMENTS.ALLOWED_TYPES.some(type => {
                if (type.endsWith('/*')) {
                  return value.startsWith(type.replace('/*', '/'));
                }
                return value === type;
              });
            })
            .label('File Type')
        })
      )
      .label('Attachments'),

    estimatedHours: number()
      .nullable()
      .min(VALIDATION_LIMITS.ESTIMATED_HOURS.MIN, 'Minimum estimation is 30 minutes')
      .max(VALIDATION_LIMITS.ESTIMATED_HOURS.MAX, 'Maximum estimation is one week')
      .label('Estimated Hours'),

    parentTaskId: string()
      .nullable()
      .matches(SECURITY_PATTERNS.UUID, 'Invalid parent task ID format')
      .label('Parent Task')
  }).required();
};

/**
 * Validates task title with enhanced security patterns and accessibility support
 * @param title - Task title to validate
 * @returns Validation result with accessibility-compliant error messages
 */
export const validateTaskTitle = async (title: string) => {
  try {
    const schema = createValidationSchema('text', {
      required: true,
      minLength: VALIDATION_LIMITS.TITLE.MIN,
      maxLength: VALIDATION_LIMITS.TITLE.MAX,
      pattern: SECURITY_PATTERNS.SAFE_TEXT,
      errorMessage: {
        key: 'task.title.invalid',
        params: { min: VALIDATION_LIMITS.TITLE.MIN, max: VALIDATION_LIMITS.TITLE.MAX }
      },
      ariaLabel: 'Task Title',
      accessibilityRules: {
        ariaRequired: true,
        ariaInvalid: false,
        ariaDescribedBy: 'title-error'
      }
    });

    await schema.validate({ title });
    return {
      isValid: true,
      message: 'Title is valid',
      ariaMessage: 'Task title is valid and meets all requirements',
      ariaLive: 'polite'
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
      ariaMessage: `Task title is invalid: ${error.message}`,
      ariaLive: 'assertive'
    };
  }
};

/**
 * Validates task due date with timezone awareness and business rules
 * @param dueDate - Task due date to validate
 * @returns Validation result with timezone-aware error messages
 */
export const validateTaskDueDate = async (dueDate: Date) => {
  try {
    const schema = date()
      .required('Due date is required')
      .min(new Date(), 'Due date cannot be in the past')
      .test('business-hours', 'Due date must be within business hours', (value) => {
        if (!value) return true;
        const hours = value.getHours();
        return hours >= 9 && hours <= 17;
      });

    await schema.validate(dueDate);
    return {
      isValid: true,
      message: 'Due date is valid',
      ariaMessage: 'Task due date is valid and within business hours',
      ariaLive: 'polite'
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
      ariaMessage: `Task due date is invalid: ${error.message}`,
      ariaLive: 'assertive'
    };
  }
};

export default createTaskValidationSchema;