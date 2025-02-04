/**
 * @packageDocumentation
 * @module TaskService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for task creation requests with comprehensive validation rules
 */

import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator'; // v0.14.0

import { ITask } from '../interfaces/task.interface';

/**
 * Enumeration of task priority levels
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Enumeration of task progress states
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

/**
 * DTO for validating task creation requests
 * Implements comprehensive validation rules for task data
 */
export class CreateTaskDto implements Pick<ITask, 'title' | 'description' | 'projectId' | 'assigneeId'> {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description?: string;

  @IsNotEmpty({ message: 'Project ID is required' })
  @IsUUID(4, { message: 'Project ID must be a valid UUID v4' })
  projectId: string;

  @IsNotEmpty({ message: 'Assignee ID is required' })
  @IsUUID(4, { message: 'Assignee ID must be a valid UUID v4' })
  assigneeId: string;

  @IsNotEmpty({ message: 'Priority is required' })
  @IsEnum(TaskPriority, { message: 'Priority must be one of: low, medium, high, urgent' })
  priority: TaskPriority;

  @IsNotEmpty({ message: 'Due date is required' })
  @IsDateString({ strict: true }, { message: 'Due date must be a valid ISO date string' })
  dueDate: Date;

  @IsOptional()
  @IsArray({ message: 'Attachments must be an array' })
  @IsString({ each: true, message: 'Each attachment must be a string' })
  attachments?: string[];

  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(50, { each: true, message: 'Each tag cannot exceed 50 characters' })
  tags?: string[];
}