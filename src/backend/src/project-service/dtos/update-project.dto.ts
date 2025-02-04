/**
 * @packageDocumentation
 * @module ProjectService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for validating project update requests with comprehensive
 * validation rules while maintaining optional fields for partial updates.
 */

import { IsString, IsOptional, IsDate, IsEnum, Length } from 'class-validator'; // v0.14.0
import { ProjectStatus } from '../interfaces/project.interface';

/**
 * DTO class for validating project update requests.
 * All fields are optional to support partial updates while ensuring
 * data integrity through strict validation when fields are provided.
 * 
 * @implements Partial<Pick<IProject, 'name' | 'description' | 'startDate' | 'endDate' | 'status'>>
 */
export class UpdateProjectDto {
  /**
   * Optional project name with length validation.
   * Must be between 3 and 100 characters when provided.
   * 
   * @example "Enterprise Task Management System"
   */
  @IsOptional()
  @IsString()
  @Length(3, 100, {
    message: 'Project name must be between 3 and 100 characters'
  })
  name?: string;

  /**
   * Optional project description with maximum length validation.
   * Limited to 500 characters to ensure manageable content length.
   * 
   * @example "A comprehensive system for managing enterprise-wide tasks and projects"
   */
  @IsOptional()
  @IsString()
  @Length(0, 500, {
    message: 'Project description cannot exceed 500 characters'
  })
  description?: string;

  /**
   * Optional project start date.
   * Must be a valid Date object when provided.
   * 
   * @example new Date('2023-10-01')
   */
  @IsOptional()
  @IsDate({
    message: 'Start date must be a valid date'
  })
  startDate?: Date;

  /**
   * Optional project end date.
   * Must be a valid Date object when provided.
   * 
   * @example new Date('2024-01-31')
   */
  @IsOptional()
  @IsDate({
    message: 'End date must be a valid date'
  })
  endDate?: Date;

  /**
   * Optional project status.
   * Must be a valid value from the ProjectStatus enum when provided.
   * 
   * @example ProjectStatus.IN_PROGRESS
   */
  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: 'Status must be a valid project status'
  })
  status?: ProjectStatus;
}