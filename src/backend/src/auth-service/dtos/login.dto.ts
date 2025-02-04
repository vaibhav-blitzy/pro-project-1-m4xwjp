/**
 * @packageDocumentation
 * @module AuthService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object (DTO) for user login requests with comprehensive security validations.
 * Implements strict validation rules for authentication credentials to prevent security vulnerabilities.
 */

import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'; // v0.14.0
import { IAuthCredentials } from '../interfaces/auth.interface';

/**
 * DTO class for validating login request payload with comprehensive security checks.
 * Implements IAuthCredentials interface and adds validation decorators for secure input handling.
 * 
 * @implements {IAuthCredentials}
 */
export class LoginDto implements IAuthCredentials {
  /**
   * User's email address for authentication.
   * Validates email format and length to prevent injection attacks.
   * 
   * @maxLength 255 - Prevents buffer overflow attacks
   */
  @IsEmail({}, { 
    message: 'Invalid email format'
  })
  @IsString({ 
    message: 'Email must be a string'
  })
  @MaxLength(255, { 
    message: 'Email cannot exceed 255 characters'
  })
  email: string;

  /**
   * User's password for authentication.
   * Enforces minimum length and complexity requirements for security.
   * 
   * @minLength 8 - Ensures minimum password strength
   * @maxLength 100 - Prevents buffer overflow attacks
   */
  @IsString({ 
    message: 'Password must be a string'
  })
  @MinLength(8, { 
    message: 'Password must be at least 8 characters long'
  })
  @MaxLength(100, { 
    message: 'Password cannot exceed 100 characters'
  })
  password: string;
}