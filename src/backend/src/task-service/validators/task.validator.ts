/**
 * @file Task validation schemas and functions using Joi
 * Implements comprehensive validation for task-related operations
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.2
import { validateInput } from '../../../common/utils/validation.util';
import { TaskPriority, TaskStatus, TaskValidation } from '../interfaces/task.interface';
import Logger from '../../../common/utils/logger.util';

// Base task schema with common validation rules
const taskSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(3)
    .max(TaskValidation.MAX_TITLE_LENGTH)
    .trim()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': `Title cannot exceed ${TaskValidation.MAX_TITLE_LENGTH} characters`,
      'string.empty': 'Title is required'
    }),

  description: Joi.string()
    .max(TaskValidation.MAX_DESCRIPTION_LENGTH)
    .trim()
    .allow('')
    .messages({
      'string.max': `Description cannot exceed ${TaskValidation.MAX_DESCRIPTION_LENGTH} characters`
    }),

  projectId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Project ID must be a valid UUID',
      'any.required': 'Project ID is required'
    }),

  assigneeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Assignee ID must be a valid UUID',
      'any.required': 'Assignee ID is required'
    }),

  priority: Joi.string()
    .valid(...Object.values(TaskPriority))
    .required()
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent',
      'any.required': 'Priority is required'
    }),

  status: Joi.string()
    .valid(...Object.values(TaskStatus))
    .default(TaskStatus.TODO)
    .messages({
      'any.only': 'Status must be one of: todo, in_progress, in_review, blocked, completed'
    }),

  dueDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Due date must be a valid date',
      'date.min': 'Due date must be in the future',
      'any.required': 'Due date is required'
    }),

  attachments: Joi.array()
    .items(
      Joi.string()
        .uri()
        .messages({
          'string.uri': 'Attachment must be a valid URL'
        })
    )
    .max(TaskValidation.MAX_ATTACHMENTS)
    .messages({
      'array.max': `Cannot exceed ${TaskValidation.MAX_ATTACHMENTS} attachments`
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .max(TaskValidation.MAX_TAG_LENGTH)
        .pattern(/^[a-zA-Z0-9-_]+$/)
        .messages({
          'string.max': `Tag cannot exceed ${TaskValidation.MAX_TAG_LENGTH} characters`,
          'string.pattern.base': 'Tags can only contain letters, numbers, hyphens and underscores'
        })
    )
    .max(TaskValidation.MAX_TAGS)
    .unique()
    .messages({
      'array.max': `Cannot exceed ${TaskValidation.MAX_TAGS} tags`,
      'array.unique': 'Duplicate tags are not allowed'
    })
});

/**
 * Validates task creation request data
 * @param data - Task creation request data
 * @returns Validation result with RFC 7807 formatted errors
 */
export async function validateCreateTask(data: unknown) {
  Logger.debug('Validating task creation data', { data });
  return validateInput(data, taskSchema);
}

/**
 * Validates task update request data with partial schema
 * @param data - Task update request data
 * @returns Validation result with RFC 7807 formatted errors
 */
export async function validateUpdateTask(data: unknown) {
  Logger.debug('Validating task update data', { data });
  const updateSchema = taskSchema.fork(
    Object.keys(taskSchema.describe().keys),
    (schema) => schema.optional()
  );
  return validateInput(data, updateSchema);
}

/**
 * Validates task status transitions
 * @param status - New status value
 * @param currentStatus - Current task status
 * @returns Validation result with transition validation
 */
export async function validateTaskStatus(status: string, currentStatus: TaskStatus) {
  Logger.debug('Validating task status transition', { status, currentStatus });
  
  const statusTransitions = {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED],
    [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED],
    [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
    [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS]
  };

  const schema = Joi.string()
    .valid(...Object.values(TaskStatus))
    .required()
    .custom((value, helpers) => {
      if (!statusTransitions[currentStatus].includes(value)) {
        return helpers.error('any.invalid', {
          message: `Invalid status transition from ${currentStatus} to ${value}`
        });
      }
      return value;
    })
    .messages({
      'any.only': 'Invalid task status',
      'any.invalid': 'Invalid status transition'
    });

  return validateInput({ status }, Joi.object({ status: schema }));
}

/**
 * Validates task priority updates
 * @param priority - New priority value
 * @returns Validation result with audit logging
 */
export async function validateTaskPriority(priority: string) {
  Logger.debug('Validating task priority', { priority });
  
  const schema = Joi.object({
    priority: Joi.string()
      .valid(...Object.values(TaskPriority))
      .required()
      .messages({
        'any.only': 'Priority must be one of: low, medium, high, urgent',
        'any.required': 'Priority is required'
      })
  });

  return validateInput({ priority }, schema);
}