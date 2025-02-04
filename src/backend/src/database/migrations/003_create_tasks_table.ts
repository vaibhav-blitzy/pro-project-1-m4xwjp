/**
 * @fileoverview Database migration for creating the tasks table with optimizations
 * @module Database/Migrations
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import { TaskPriority, TaskStatus } from '../../task-service/interfaces/task.interface';
import { databaseConfig } from '../../common/config/database.config';

/**
 * Creates the tasks table with enhanced indexing, partitioning, and constraints
 */
export async function up(knex: Knex): Promise<void> {
  // Enable required PostgreSQL extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "btree_gist"');

  // Create enum types for task priority and status
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE task_priority AS ENUM (
        '${TaskPriority.LOW}', '${TaskPriority.MEDIUM}',
        '${TaskPriority.HIGH}', '${TaskPriority.URGENT}'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE task_status AS ENUM (
        '${TaskStatus.TODO}', '${TaskStatus.IN_PROGRESS}',
        '${TaskStatus.IN_REVIEW}', '${TaskStatus.BLOCKED}',
        '${TaskStatus.COMPLETED}'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tasks table
  await knex.schema.createTable('tasks', (table) => {
    // Primary key and core fields
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title', 200).notNullable().index();
    table.text('description');

    // Relationship fields with foreign keys
    table.uuid('project_id').notNullable().references('id').inTable('projects')
      .onDelete('CASCADE').onUpdate('CASCADE').index();
    table.uuid('assignee_id').notNullable().references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE').index();

    // Status and priority fields
    table.specificType('status', 'task_status').notNullable()
      .defaultTo(TaskStatus.TODO);
    table.specificType('priority', 'task_priority').notNullable()
      .defaultTo(TaskPriority.MEDIUM);

    // Metadata fields
    table.timestamp('due_date').notNullable();
    table.jsonb('attachments').notNullable().defaultTo('[]');
    table.specificType('tags', 'varchar(50)[]').notNullable().defaultTo('{}');

    // Audit fields
    table.uuid('created_by').notNullable().references('id').inTable('users')
      .onDelete('RESTRICT').onUpdate('CASCADE');
    table.uuid('last_modified_by').references('id').inTable('users')
      .onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Partition by project_id
  await knex.raw(`
    ALTER TABLE tasks PARTITION BY HASH (project_id);
    
    DO $$ BEGIN
      FOR i IN 0..7 LOOP
        EXECUTE format(
          'CREATE TABLE tasks_partition_%s PARTITION OF tasks FOR VALUES WITH (modulus 8, remainder %s)',
          i, i
        );
      END LOOP;
    END $$;
  `);

  // Create indexes
  await knex.raw(`
    -- B-tree indexes for foreign keys and filters
    CREATE INDEX idx_tasks_assignee_status ON tasks (assignee_id, status);
    CREATE INDEX idx_tasks_due_date ON tasks (due_date);
    
    -- Composite index for status-based queries with due date
    CREATE INDEX idx_tasks_status_due_date ON tasks (status, due_date);
    
    -- Partial index for active tasks
    CREATE INDEX idx_tasks_active ON tasks (id)
    WHERE status NOT IN ('${TaskStatus.COMPLETED}');
    
    -- GiST index for text search
    CREATE INDEX idx_tasks_text_search ON tasks
    USING gist (to_tsvector('english', title || ' ' || COALESCE(description, '')));
  `);

  // Add CHECK constraints
  await knex.raw(`
    ALTER TABLE tasks
    ADD CONSTRAINT chk_tasks_title_length CHECK (char_length(title) <= 200),
    ADD CONSTRAINT chk_tasks_description_length CHECK (char_length(description) <= 5000),
    ADD CONSTRAINT chk_tasks_attachments_limit CHECK (jsonb_array_length(attachments) <= 20),
    ADD CONSTRAINT chk_tasks_tags_limit CHECK (array_length(tags, 1) <= 10),
    ADD CONSTRAINT chk_tasks_due_date CHECK (due_date > created_at);
  `);

  // Create updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_tasks_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();
  `);

  // Set table storage parameters
  await knex.raw(`
    ALTER TABLE tasks SET (
      fillfactor = 90,
      autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_scale_factor = 0.02
    );
  `);

  // Add row level security policies
  await knex.raw(`
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tasks_access_policy ON tasks
    USING (
      created_by = current_user_id() OR
      assignee_id = current_user_id() OR
      project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = current_user_id()
      )
    );
  `);

  // Create partition maintenance procedure
  await knex.raw(`
    CREATE OR REPLACE PROCEDURE maintain_tasks_partitions()
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- Add new partitions if needed
      -- Clean up old partitions
      -- Reindex partitions
      -- Analyze partition usage
    END;
    $$;
  `);
}

/**
 * Drops the tasks table and all related objects
 */
export async function down(knex: Knex): Promise<void> {
  // Drop partition maintenance procedure
  await knex.raw('DROP PROCEDURE IF EXISTS maintain_tasks_partitions');

  // Drop RLS policies
  await knex.raw('DROP POLICY IF EXISTS tasks_access_policy ON tasks');

  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks');
  await knex.raw('DROP FUNCTION IF EXISTS update_tasks_updated_at');

  // Drop table and partitions
  await knex.schema.dropTableIfExists('tasks');

  // Drop enum types
  await knex.raw('DROP TYPE IF EXISTS task_status');
  await knex.raw('DROP TYPE IF EXISTS task_priority');

  // Drop extensions if no longer needed
  await knex.raw('DROP EXTENSION IF EXISTS "btree_gist"');
}