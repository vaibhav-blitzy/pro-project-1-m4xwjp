/**
 * @packageDocumentation
 * @module TaskService/Models
 * @version 1.0.0
 * 
 * Enhanced Prisma model for task entities with improved attachment handling,
 * performance optimizations, and type safety.
 */

import { Prisma, PrismaModel, Table, Index } from '@prisma/client'; // v5.0.0
import {
  ITask,
  TaskId,
  TaskPriority,
  TaskStatus,
  AttachmentMetadata,
  TaskValidation
} from '../interfaces/task.interface';

/**
 * Enhanced Prisma model class representing a task entity with improved
 * attachment handling and performance optimizations.
 */
@PrismaModel
@Table({ name: 'tasks' })
@Index(['projectId', 'status']) // Optimize queries by project and status
@Index(['assigneeId']) // Optimize queries by assignee
@Index(['dueDate']) // Optimize due date based queries
export class Task implements ITask {
  @Prisma.id
  id!: TaskId;

  @Prisma.string({ length: TaskValidation.MAX_TITLE_LENGTH })
  title!: string;

  @Prisma.string({ length: TaskValidation.MAX_DESCRIPTION_LENGTH, optional: true })
  description?: string;

  @Prisma.string
  projectId!: string;

  @Prisma.string
  assigneeId!: string;

  @Prisma.enum(TaskPriority)
  priority!: TaskPriority;

  @Prisma.enum(TaskStatus)
  status!: TaskStatus;

  @Prisma.dateTime
  dueDate!: Date;

  @Prisma.json
  attachments!: AttachmentMetadata[];

  @Prisma.array({ type: 'string', maxLength: TaskValidation.MAX_TAGS })
  tags!: string[];

  @Prisma.string
  createdBy!: string;

  @Prisma.string({ optional: true })
  lastModifiedBy?: string;

  @Prisma.dateTime({ default: 'now()' })
  createdAt!: Date;

  @Prisma.dateTime({ default: 'now()', onUpdate: 'now()' })
  updatedAt!: Date;

  /**
   * Enhanced conversion of task model to plain JSON object with proper
   * date formatting and type casting.
   * 
   * @returns JSON representation of the task with formatted dates and validated attachments
   */
  toJSON(): ITask {
    const {
      id,
      title,
      description,
      projectId,
      assigneeId,
      priority,
      status,
      dueDate,
      attachments,
      tags,
      createdBy,
      lastModifiedBy,
      createdAt,
      updatedAt
    } = this;

    // Validate attachments array length
    if (attachments.length > TaskValidation.MAX_ATTACHMENTS) {
      throw new Error(`Maximum number of attachments (${TaskValidation.MAX_ATTACHMENTS}) exceeded`);
    }

    // Validate tags
    if (tags.some(tag => tag.length > TaskValidation.MAX_TAG_LENGTH)) {
      throw new Error(`Tag length exceeds maximum allowed (${TaskValidation.MAX_TAG_LENGTH})`);
    }

    return {
      id,
      title,
      description,
      projectId,
      assigneeId,
      priority,
      status,
      dueDate: new Date(dueDate),
      attachments: attachments.map(attachment => ({
        ...attachment,
        uploadedAt: new Date(attachment.uploadedAt)
      })),
      tags: [...tags], // Create new array to prevent mutations
      createdBy,
      lastModifiedBy,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    };
  }

  /**
   * Validates attachment metadata before saving
   * @param attachment The attachment metadata to validate
   * @throws Error if attachment metadata is invalid
   */
  private validateAttachment(attachment: AttachmentMetadata): void {
    if (!attachment.fileId || !attachment.fileName || !attachment.mimeType) {
      throw new Error('Invalid attachment metadata: missing required fields');
    }
    if (attachment.fileSize <= 0) {
      throw new Error('Invalid attachment metadata: file size must be positive');
    }
  }
}