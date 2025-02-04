/**
 * @packageDocumentation
 * @module Database/Migrations
 * @version 1.0.0
 * 
 * Migration file for creating the notifications table with comprehensive schema
 * for notification tracking, delivery status, and performance optimization.
 */

import { Knex } from 'knex'; // v2.5.1
import { NotificationType, NotificationStatus } from '../../notification-service/interfaces/notification.interface';

/**
 * Creates the notifications table with enhanced schema including delivery tracking,
 * channels, priorities, and optimized indexing for high-performance querying.
 */
export async function up(knex: Knex): Promise<void> {
  // Create enum types first
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE notification_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
      EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.schema.createTable('notifications', (table) => {
    // Primary key and relationships
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .index();

    // Core notification fields
    table.enum('type', Object.values(NotificationType))
      .notNullable()
      .index();
    table.specificType('priority', 'notification_priority')
      .notNullable()
      .defaultTo('MEDIUM')
      .index();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    
    // Status tracking
    table.enum('status', Object.values(NotificationStatus))
      .notNullable()
      .defaultTo(NotificationStatus.PENDING)
      .index();
    table.specificType('channels', 'text[]')
      .notNullable()
      .defaultTo('{}');
    
    // Metadata and delivery tracking
    table.jsonb('metadata')
      .defaultTo('{}')
      .notNullable();
    table.jsonb('delivery_attempts')
      .defaultTo('[]')
      .notNullable();
    
    // Timing fields
    table.timestamp('scheduled_for')
      .index();
    table.timestamp('read_at')
      .index();
    table.text('error_message');
    
    // Audit timestamps
    table.timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Composite indices for common queries
    table.index(['user_id', 'status']);
    table.index(['user_id', 'type']);
    table.index(['status', 'scheduled_for']);
    
    // GIN index for JSONB querying
    knex.raw(`
      CREATE INDEX notifications_metadata_gin_idx ON notifications 
      USING GIN (metadata jsonb_path_ops);
    `);

    // Check constraints
    table.check(
      '?? > created_at',
      ['scheduled_for'],
      'scheduled_for_after_creation'
    );
    table.check(
      '?? > created_at',
      ['read_at'],
      'read_at_after_creation'
    );
  });

  // Create trigger for updating updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_notification_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_notifications_timestamp
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_notification_timestamp();
  `);
}

/**
 * Drops the notifications table and all related objects including indices,
 * constraints, triggers, and custom types.
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers first
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_notifications_timestamp ON notifications;
    DROP FUNCTION IF EXISTS update_notification_timestamp();
  `);

  // Drop table with cascade to remove dependent objects
  await knex.schema.dropTableIfExists('notifications');

  // Drop custom enum types
  await knex.raw(`
    DROP TYPE IF EXISTS notification_priority;
  `);
}