/**
 * @fileoverview Database migration for creating the projects table with enhanced status states,
 * improved indexing strategy, and robust constraints for the task management system.
 * @module Database/Migrations
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import { ProjectStatus } from '../../project-service/interfaces/project.interface';
import { databaseConfig } from '../../common/config/database.config';

/**
 * Creates the projects table with enhanced features and constraints
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
export async function up(knex: Knex): Promise<void> {
  const { pool } = databaseConfig;

  // Create UUID extension if not exists
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create project_status enum type
  await knex.raw(`
    CREATE TYPE project_status AS ENUM (
      '${ProjectStatus.PLANNING}',
      '${ProjectStatus.IN_PROGRESS}',
      '${ProjectStatus.ON_HOLD}',
      '${ProjectStatus.BLOCKED}',
      '${ProjectStatus.AT_RISK}',
      '${ProjectStatus.COMPLETED}',
      '${ProjectStatus.CANCELLED}'
    )
  `);

  // Create projects table
  await knex.schema.createTable('projects', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Required fields
    table.string('name', 100).notNullable()
      .checkLength('>=', 3, 'name_min_length');
    table.text('description').nullable();
    table.uuid('owner_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE')
      .index();

    // Status with enum constraint
    table.specificType('status', 'project_status')
      .notNullable()
      .defaultTo(ProjectStatus.PLANNING);

    // Date fields with validation
    table.timestamp('start_date', { useTz: true }).nullable();
    table.timestamp('end_date', { useTz: true }).nullable();
    table.check('?? >= ??', ['end_date', 'start_date'], 'valid_date_range');

    // Timestamps
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Create indexes
  await knex.schema.raw(`
    -- Composite index for owner and status queries
    CREATE INDEX projects_owner_status_idx ON projects (owner_id, status);

    -- Partial index for active projects
    CREATE INDEX projects_active_idx ON projects (status)
    WHERE status IN ('${ProjectStatus.PLANNING}', '${ProjectStatus.IN_PROGRESS}', 
                    '${ProjectStatus.BLOCKED}', '${ProjectStatus.AT_RISK}');

    -- GiST index for text search
    CREATE INDEX projects_search_idx ON projects 
    USING GiST (to_tsvector('english', name || ' ' || COALESCE(description, '')));

    -- Index for timeline queries
    CREATE INDEX projects_timeline_idx ON projects (start_date, end_date);
  `);

  // Create updated_at trigger
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION update_projects_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_projects_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_timestamp();
  `);

  // Create status transition validation trigger
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION validate_project_status_transition()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Prevent completed/cancelled projects from being reopened
      IF OLD.status IN ('${ProjectStatus.COMPLETED}', '${ProjectStatus.CANCELLED}')
         AND NEW.status NOT IN ('${ProjectStatus.COMPLETED}', '${ProjectStatus.CANCELLED}')
      THEN
        RAISE EXCEPTION 'Cannot reopen completed or cancelled projects';
      END IF;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER validate_project_status_transition
    BEFORE UPDATE OF status ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_status_transition();
  `);

  // Add row level security
  await knex.schema.raw(`
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

    CREATE POLICY projects_owner_access ON projects
    FOR ALL
    TO authenticated
    USING (owner_id = current_user_id());
  `);

  // Add table comments
  await knex.schema.raw(`
    COMMENT ON TABLE projects IS 'Projects table for task management system';
    COMMENT ON COLUMN projects.id IS 'Unique identifier for the project';
    COMMENT ON COLUMN projects.name IS 'Project name (3-100 characters)';
    COMMENT ON COLUMN projects.description IS 'Detailed project description';
    COMMENT ON COLUMN projects.owner_id IS 'Reference to the project owner';
    COMMENT ON COLUMN projects.status IS 'Current project status';
    COMMENT ON COLUMN projects.start_date IS 'Project start date';
    COMMENT ON COLUMN projects.end_date IS 'Project end date';
    COMMENT ON COLUMN projects.created_at IS 'Timestamp of project creation';
    COMMENT ON COLUMN projects.updated_at IS 'Timestamp of last update';
  `);
}

/**
 * Drops the projects table and related objects
 * @param {Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.schema.raw(`
    DROP TRIGGER IF EXISTS update_projects_timestamp ON projects;
    DROP TRIGGER IF EXISTS validate_project_status_transition ON projects;
    DROP FUNCTION IF EXISTS update_projects_timestamp();
    DROP FUNCTION IF EXISTS validate_project_status_transition();
  `);

  // Drop table and enum
  await knex.schema.dropTableIfExists('projects');
  await knex.raw('DROP TYPE IF EXISTS project_status');
}