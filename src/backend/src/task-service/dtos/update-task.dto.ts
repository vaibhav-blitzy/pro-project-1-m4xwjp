/**
 * @packageDocumentation
 * @module TaskService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for validating task update requests.
 * Implements comprehensive validation rules for partial task updates.
 */

import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMaxSize,
} from 'class-validator'; // v0.14.0

import {
  ITask,
  TaskPriority,
  TaskStatus,
  TaskValidation,
} from '../interfaces/task.interface';

/**
 * DTO for validating task update requests.
 * All fields are optional to support partial updates (PATCH operations).
 * Implements strict validation rules for data integrity and security.
 */
export class UpdateTaskDto implements Partial<ITask> {
  @IsOptional()
  @IsString()
  @MaxLength(TaskValidation.MAX_TITLE_LENGTH, {
    message: `Title must not exceed ${TaskValidation.MAX_TITLE_LENGTH} characters`
  })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TaskValidation.MAX_DESCRIPTION_LENGTH, {
    message: `Description must not exceed ${TaskValidation.MAX_DESCRIPTION_LENGTH} characters`
  })
  description?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'Project ID must be a valid UUID v4'
  })
  projectId?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'Assignee ID must be a valid UUID v4'
  })
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskPriority, {
    message: `Priority must be one of: ${Object.values(TaskPriority).join(', ')}`
  })
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus, {
    message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}`
  })
  status?: TaskStatus;

  @IsOptional()
  @IsDateString({}, {
    message: 'Due date must be a valid ISO 8601 date string'
  })
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TaskValidation.MAX_ATTACHMENTS, {
    message: `Maximum ${TaskValidation.MAX_ATTACHMENTS} attachments allowed`
  })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(TaskValidation.MAX_TAG_LENGTH, {
    each: true,
    message: `Each tag must not exceed ${TaskValidation.MAX_TAG_LENGTH} characters`
  })
  @ArrayMaxSize(TaskValidation.MAX_TAGS, {
    message: `Maximum ${TaskValidation.MAX_TAGS} tags allowed`
  })
  tags?: string[];
}