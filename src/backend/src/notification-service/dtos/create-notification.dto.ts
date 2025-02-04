/**
 * @packageDocumentation
 * @module NotificationService/DTOs
 * @version 1.0.0
 * 
 * Data Transfer Object for creating notifications with comprehensive validation
 * using class-validator decorators to ensure data integrity and type safety.
 */

import { IsString, IsEnum, IsNotEmpty, IsOptional, IsObject } from 'class-validator'; // v0.14.0
import { NotificationType } from '../interfaces/notification.interface';

/**
 * DTO class for validating notification creation requests.
 * Implements strict validation rules for all notification properties
 * to ensure data integrity and security in the notification service.
 */
export class CreateNotificationDto {
  /**
   * Unique identifier of the user who will receive the notification.
   * Must be a non-empty string value.
   */
  @IsNotEmpty()
  @IsString()
  userId: string;

  /**
   * Type of notification from predefined NotificationType enum.
   * Must match one of the supported notification types.
   */
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  /**
   * Title of the notification.
   * Must be a non-empty string value.
   */
  @IsNotEmpty()
  @IsString()
  title: string;

  /**
   * Detailed message content of the notification.
   * Must be a non-empty string value.
   */
  @IsNotEmpty()
  @IsString()
  message: string;

  /**
   * Optional metadata object for additional notification context.
   * Must be a valid object if provided.
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}