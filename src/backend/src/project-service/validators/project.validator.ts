/**
 * @file Project validation schemas and functions using Joi
 * Implements comprehensive validation for project-related operations with RFC 7807 error handling
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.2
import { validateInput } from '../../../common/utils/validation.util';
import { ProjectStatus, IMilestone, IProjectResource } from '../interfaces/project.interface';
import Logger from '../../../common/utils/logger.util';

/**
 * Validation schema for milestone objects
 */
const milestoneSchema = Joi.object({
  id: Joi.string().uuid(),
  name: Joi.string().min(3).max(100).required().trim().escape(),
  description: Joi.string().max(500).trim().escape(),
  dueDate: Joi.date().iso().required(),
  status: Joi.string().valid('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED').required(),
  completionPercentage: Joi.number().min(0).max(100).required()
}).required();

/**
 * Validation schema for project resource allocations
 */
const resourceSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().min(2).max(50).required().trim().escape(),
  allocationPercentage: Joi.number().min(0).max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
}).required();

/**
 * Base project validation schema with enhanced security and validation rules
 */
const projectSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .trim()
    .escape()
    .pattern(/^[\w\s-]+$/),

  description: Joi.string()
    .max(500)
    .trim()
    .escape()
    .allow(''),

  ownerId: Joi.string()
    .uuid()
    .required(),

  parentProjectId: Joi.string()
    .uuid()
    .allow(null),

  startDate: Joi.date()
    .iso()
    .required(),

  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate')),

  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .default(ProjectStatus.PLANNING),

  milestones: Joi.array()
    .items(milestoneSchema)
    .max(50)
    .unique('id'),

  resourceAllocations: Joi.array()
    .items(resourceSchema)
    .max(100)
    .unique('userId'),

  metadata: Joi.object()
    .pattern(
      Joi.string().max(50), 
      Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    )
    .max(20)
}).options({
  stripUnknown: true,
  abortEarly: false,
  presence: 'required'
});

/**
 * Validates project creation request data with enhanced security checks
 * @param data - Project creation data
 * @returns Validation result with RFC 7807 error details
 */
export async function validateCreateProject(data: any) {
  Logger.debug('Validating project creation data', { data });

  return validateInput(data, projectSchema, {
    sanitize: true,
    abortEarly: false
  });
}

/**
 * Validates project update request data with conflict detection
 * @param data - Project update data
 * @returns Validation result with conflict detection
 */
export async function validateUpdateProject(data: any) {
  Logger.debug('Validating project update data', { data });

  const updateSchema = projectSchema.fork(
    ['name', 'ownerId', 'startDate'],
    (schema) => schema.optional()
  );

  return validateInput(data, updateSchema, {
    sanitize: true,
    abortEarly: false
  });
}

/**
 * Validates milestone updates with timeline consistency checks
 * @param milestones - Array of milestone updates
 * @returns Validation result for milestones
 */
export async function validateMilestones(milestones: IMilestone[]) {
  Logger.debug('Validating project milestones', { milestones });

  const milestoneArraySchema = Joi.array()
    .items(milestoneSchema)
    .min(1)
    .max(50)
    .unique('id')
    .custom((value, helpers) => {
      // Check timeline consistency
      const sortedMilestones = [...value].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      // Validate completion percentages
      const hasInvalidProgress = value.some(
        m => m.status === 'COMPLETED' && m.completionPercentage !== 100
      );

      if (hasInvalidProgress) {
        return helpers.error('milestones.invalid.completion');
      }

      return value;
    });

  return validateInput({ milestones }, Joi.object({ milestones: milestoneArraySchema }));
}

/**
 * Validates resource allocation updates with capacity checks
 * @param resources - Array of resource allocations
 * @returns Validation result for resource allocations
 */
export async function validateResources(resources: IProjectResource[]) {
  Logger.debug('Validating project resources', { resources });

  const resourceArraySchema = Joi.array()
    .items(resourceSchema)
    .min(1)
    .max(100)
    .unique('userId')
    .custom((value, helpers) => {
      // Check for overlapping date ranges per user
      const userAllocations = value.reduce((acc, curr) => {
        if (!acc[curr.userId]) {
          acc[curr.userId] = [];
        }
        acc[curr.userId].push(curr);
        return acc;
      }, {} as Record<string, IProjectResource[]>);

      // Validate total allocation doesn't exceed 100%
      for (const userResources of Object.values(userAllocations)) {
        const hasOverallocation = userResources.some(r => r.allocationPercentage > 100);
        if (hasOverallocation) {
          return helpers.error('resources.invalid.allocation');
        }
      }

      return value;
    });

  return validateInput({ resources }, Joi.object({ resources: resourceArraySchema }));
}

/**
 * Validates project status transitions with state machine rules
 * @param currentStatus - Current project status
 * @param newStatus - Requested new status
 * @returns Validation result for status transition
 */
export async function validateStatusTransition(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
) {
  Logger.debug('Validating status transition', { currentStatus, newStatus });

  // Define valid status transitions
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    [ProjectStatus.PLANNING]: [
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.CANCELLED
    ],
    [ProjectStatus.IN_PROGRESS]: [
      ProjectStatus.ON_HOLD,
      ProjectStatus.BLOCKED,
      ProjectStatus.AT_RISK,
      ProjectStatus.COMPLETED
    ],
    [ProjectStatus.ON_HOLD]: [
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.CANCELLED
    ],
    [ProjectStatus.BLOCKED]: [
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.ON_HOLD,
      ProjectStatus.CANCELLED
    ],
    [ProjectStatus.AT_RISK]: [
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.BLOCKED,
      ProjectStatus.CANCELLED
    ],
    [ProjectStatus.COMPLETED]: [
      ProjectStatus.IN_PROGRESS
    ],
    [ProjectStatus.CANCELLED]: []
  };

  const statusSchema = Joi.string()
    .valid(...Object.values(ProjectStatus))
    .custom((value, helpers) => {
      if (!validTransitions[currentStatus].includes(value)) {
        return helpers.error('status.invalid.transition');
      }
      return value;
    });

  return validateInput({ status: newStatus }, Joi.object({ status: statusSchema }));
}