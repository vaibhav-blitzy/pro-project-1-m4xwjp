/**
 * @file Data Transfer Object (DTO) for user creation requests
 * Implements comprehensive input validation, data sanitization, and RFC 7807 compliant error handling
 * @version 1.0.0
 */

import { IsEmail, IsString, IsEnum, MinLength, Matches } from 'class-validator'; // v0.14.0
import { UserRole } from '../interfaces/user.interface';
import { validateInput } from '../../common/utils/validation.util';

/**
 * DTO class for validating and sanitizing user creation requests
 * Implements security best practices for user data handling
 */
export class CreateUserDto {
  /**
   * User's email address
   * Must be a valid email format with proper domain structure
   */
  @IsEmail({}, {
    message: 'Invalid email format. Please provide a valid email address.'
  })
  email: string;

  /**
   * User's full name
   * Must be at least 2 characters long and contain only valid characters
   */
  @IsString({
    message: 'Name must be a valid string.'
  })
  @MinLength(2, {
    message: 'Name must be at least 2 characters long.'
  })
  @Matches(/^[a-zA-Z\s-']+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes.'
  })
  name: string;

  /**
   * User's password
   * Must meet security requirements:
   * - At least 8 characters long
   * - Contains at least one uppercase letter
   * - Contains at least one lowercase letter
   * - Contains at least one number
   * - Contains at least one special character
   */
  @IsString({
    message: 'Password must be a string.'
  })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long.'
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    }
  )
  password: string;

  /**
   * User's role in the system
   * Must be one of the predefined UserRole enum values
   */
  @IsEnum(UserRole, {
    message: 'Invalid user role. Role must be one of: ADMIN, PROJECT_MANAGER, TEAM_LEAD, TEAM_MEMBER, or VIEWER.'
  })
  role: UserRole;

  /**
   * Validates and sanitizes the DTO instance
   * Implements XSS prevention and RFC 7807 compliant error handling
   * 
   * @returns Promise resolving to boolean indicating validation success
   * @throws ValidationError with RFC 7807 compliant details if validation fails
   */
  async validate(): Promise<boolean> {
    const { isValid, errors } = await validateInput(
      {
        email: this.email?.trim().toLowerCase(),
        name: this.name?.trim(),
        password: this.password,
        role: this.role
      },
      {
        email: {
          type: 'string',
          format: 'email',
          maxLength: 255
        },
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 100,
          pattern: '^[a-zA-Z\\s-\']+$'
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 100,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
        },
        role: {
          type: 'string',
          enum: Object.values(UserRole)
        }
      }
    );

    if (!isValid && errors) {
      throw errors;
    }

    return true;
  }
}