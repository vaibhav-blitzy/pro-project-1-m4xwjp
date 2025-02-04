/**
 * @packageDocumentation
 * @module UserService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for validating user update operations with comprehensive
 * validation rules and secure PII data handling.
 */

import { IsString, IsEmail, IsEnum, IsOptional, IsObject } from 'class-validator'; // ^0.14.0
import { UserRole, UserStatus } from '../interfaces/user.interface';

/**
 * Data Transfer Object for validating user update requests.
 * Implements comprehensive validation rules for secure user information updates
 * with support for partial updates and PII data handling.
 * 
 * @class UpdateUserDto
 */
export class UpdateUserDto {
  /**
   * User's full name with string validation
   * Optional for partial updates
   */
  @IsOptional()
  @IsString({ message: 'Name must be a valid string' })
  name?: string;

  /**
   * User's email address with strict email format validation
   * Optional for partial updates
   */
  @IsOptional()
  @IsEmail({}, { 
    message: 'Must provide a valid email address',
    allow_display_name: false,
    allow_utf8_local_part: true,
    require_tld: true
  })
  email?: string;

  /**
   * User's role with enumeration validation against UserRole
   * Optional for partial updates
   */
  @IsOptional()
  @IsEnum(UserRole, { 
    message: 'Invalid user role specified. Must be one of: ADMIN, PROJECT_MANAGER, TEAM_LEAD, TEAM_MEMBER, or VIEWER'
  })
  role?: UserRole;

  /**
   * User's account status with enumeration validation against UserStatus
   * Optional for partial updates
   */
  @IsOptional()
  @IsEnum(UserStatus, { 
    message: 'Invalid user status specified. Must be one of: ACTIVE, INACTIVE, or BLOCKED'
  })
  status?: UserStatus;

  /**
   * User's preferences object with structure validation
   * Optional for partial updates
   */
  @IsOptional()
  @IsObject({ message: 'Preferences must be a valid object' })
  preferences?: {
    emailNotifications?: boolean;
    timezone?: string;
    language?: string;
    themeSettings?: {
      mode?: 'light' | 'dark';
      primaryColor?: string;
      fontSize?: number;
    };
    dashboardLayout?: {
      widgets?: string[];
      layout?: Record<string, { x: number; y: number; w: number; h: number }>;
    };
  };
}