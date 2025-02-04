/**
 * @file RegisterDto - Data Transfer Object for user registration
 * @version 1.0.0
 * 
 * Implements comprehensive validation rules and security controls
 * for user registration data in the authentication service.
 */

import { IsEmail, IsString, MinLength, Matches } from 'class-validator'; // v0.14.0
import { UserRole } from '../../user-service/interfaces/user.interface';
import { validateInput } from '../../common/utils/validation.util';
import { ValidationError } from '../../common/types';

/**
 * DTO class implementing comprehensive validation rules for user registration
 * with enhanced security controls and error handling
 */
export class RegisterDto {
  @IsEmail({}, { 
    message: 'Please provide a valid email address format',
    context: {
      errorCode: 'INVALID_EMAIL_FORMAT'
    }
  })
  email: string;

  @IsString({ 
    message: 'Name must be a valid string value',
    context: {
      errorCode: 'INVALID_NAME_FORMAT'
    }
  })
  @MinLength(2, { 
    message: 'Name must be at least 2 characters long',
    context: {
      errorCode: 'NAME_TOO_SHORT'
    }
  })
  @Matches(/^[a-zA-Z0-9\s\-']+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens and apostrophes',
    context: {
      errorCode: 'INVALID_NAME_CHARACTERS'
    }
  })
  name: string;

  @IsString({
    message: 'Password must be a string value',
    context: {
      errorCode: 'INVALID_PASSWORD_FORMAT'
    }
  })
  @MinLength(8, { 
    message: 'Password must be at least 8 characters long for security',
    context: {
      errorCode: 'PASSWORD_TOO_SHORT'
    }
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      context: {
        errorCode: 'INVALID_PASSWORD_COMPLEXITY'
      }
    }
  )
  password: string;

  role: UserRole = UserRole.TEAM_MEMBER;

  /**
   * Validates registration data against defined security rules
   * with comprehensive error handling
   * 
   * @param data - Registration data to validate
   * @returns Validation result with structured errors and messages
   */
  async validate(): Promise<{
    isValid: boolean;
    errors?: ValidationError[];
    messages?: string[];
  }> {
    const schema = {
      email: this.email?.trim(),
      name: this.name?.trim(),
      password: this.password,
      role: this.role || UserRole.TEAM_MEMBER
    };

    const validationResult = await validateInput(schema, {
      email: {
        required: true,
        format: 'email',
        maxLength: 255
      },
      name: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-']+$/
      },
      password: {
        required: true,
        minLength: 8,
        maxLength: 100,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      },
      role: {
        required: false,
        enum: Object.values(UserRole)
      }
    });

    if (!validationResult.isValid && validationResult.errors) {
      return {
        isValid: false,
        errors: validationResult.errors,
        messages: validationResult.errors.map(error => error.message)
      };
    }

    return {
      isValid: true
    };
  }
}