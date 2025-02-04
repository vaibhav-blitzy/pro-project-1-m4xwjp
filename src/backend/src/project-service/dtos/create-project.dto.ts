/**
 * @packageDocumentation
 * @module ProjectService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for project creation requests with comprehensive validation
 * rules and business logic enforcement for the Task Management System.
 */

import { IsString, IsOptional, IsDate, IsEnum, Length } from 'class-validator'; // v0.14.0
import { ProjectStatus } from '../interfaces/project.interface';

/**
 * DTO class for validating and transferring project creation data with strict
 * business rules enforcement and comprehensive input validation.
 * 
 * @implements Project creation data structure with validation decorators
 */
export class CreateProjectDto {
  /**
   * Project name with enforced length constraints for readability and database optimization.
   * Must be between 3 and 100 characters.
   */
  @IsString()
  @Length(3, 100, {
    message: 'Project name must be between 3 and 100 characters'
  })
  name: string;

  /**
   * Optional project description with maximum length constraint.
   * Limited to 500 characters to ensure concise documentation.
   */
  @IsString()
  @IsOptional()
  @Length(0, 500, {
    message: 'Project description cannot exceed 500 characters'
  })
  description: string;

  /**
   * UUID of the project owner for hierarchy management and access control.
   * Required for project creation and authorization purposes.
   */
  @IsString()
  ownerId: string;

  /**
   * Mandatory project start date for timeline management and scheduling.
   * Must be a valid Date object.
   */
  @IsDate()
  startDate: Date;

  /**
   * Optional project end date for flexible project planning.
   * Must be a valid Date object when provided.
   */
  @IsDate()
  @IsOptional()
  endDate: Date;

  /**
   * Project status from predefined enum values.
   * Defaults to PLANNING for new projects if not specified.
   */
  @IsEnum(ProjectStatus, {
    message: 'Invalid project status'
  })
  @IsOptional()
  status: ProjectStatus = ProjectStatus.PLANNING;
}