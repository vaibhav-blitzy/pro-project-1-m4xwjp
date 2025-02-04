/**
 * @fileoverview Database migration for users table creation with security features
 * @module Database/Migrations
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.5.1
import { UserRole, UserStatus } from '../../user-service/interfaces/user.interface';
import { databaseConfig } from '../../common/config/database.config';

/**
 * Creates the users table with comprehensive security features and data classification controls
 */
export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension for secure primary key generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create custom enum types
  await knex.raw(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
          '${UserRole.ADMIN}', 
          '${UserRole.PROJECT_MANAGER}', 
          '${UserRole.TEAM_LEAD}', 
          '${UserRole.TEAM_MEMBER}', 
          '${UserRole.VIEWER}'
        );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM (
          '${UserStatus.ACTIVE}', 
          '${UserStatus.INACTIVE}', 
          '${UserStatus.PENDING}', 
          '${UserStatus.BLOCKED}'
        );
      END IF;
    END $$;
  `);

  // Create users table with security features
  await knex.schema.createTable('users', (table) => {
    // Primary key with UUID for enhanced security
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // PII data with encryption and validation
    table.string('email', 255).notNullable().unique()
      .checkRegex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/);
    table.string('name', 100).notNullable()
      .checkLength('>=', 2);
    table.string('hashed_password', 255).notNullable()
      .checkLength('>=', 60);

    // Role and status management
    table.specificType('role', 'user_role').notNullable()
      .defaultTo('TEAM_MEMBER');
    table.specificType('status', 'user_status').notNullable()
      .defaultTo('PENDING');

    // User preferences with JSON validation
    table.jsonb('preferences').defaultTo('{}')
      .checkValid();

    // Audit and security tracking
    table.timestamp('last_login_at', { useTz: true });
    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Create optimized indexes
  await knex.raw(`
    -- Email lookup optimization
    CREATE UNIQUE INDEX users_email_idx ON users USING btree (email);

    -- Role-based queries optimization for active users
    CREATE INDEX users_role_active_idx ON users USING btree (role) 
    WHERE status = 'ACTIVE';

    -- Status-based filtering optimization
    CREATE INDEX users_status_idx ON users USING btree (status);
  `);

  // Enable row level security
  await knex.raw(`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- Create security policies
    CREATE POLICY users_view_policy ON users
      FOR SELECT
      USING (
        (CURRENT_USER = 'admin')
        OR (id = CURRENT_USER::uuid)
        OR (CURRENT_USER IN (SELECT id::text FROM users WHERE role = 'ADMIN'))
      );

    CREATE POLICY users_modify_policy ON users
      FOR ALL
      USING (
        (CURRENT_USER = 'admin')
        OR (CURRENT_USER IN (SELECT id::text FROM users WHERE role = 'ADMIN'))
      );
  `);

  // Create updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add table comments for documentation
  await knex.raw(`
    COMMENT ON TABLE users IS 'User accounts with security and audit features';
    COMMENT ON COLUMN users.id IS 'Unique identifier for user';
    COMMENT ON COLUMN users.email IS 'User email address (PII data)';
    COMMENT ON COLUMN users.name IS 'User full name (PII data)';
    COMMENT ON COLUMN users.hashed_password IS 'Securely hashed user password';
    COMMENT ON COLUMN users.role IS 'User role for access control';
    COMMENT ON COLUMN users.status IS 'Account status';
    COMMENT ON COLUMN users.preferences IS 'User preferences and settings';
    COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
    COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
    COMMENT ON COLUMN users.updated_at IS 'Last update timestamp';
  `);
}

/**
 * Rolls back the users table creation
 */
export async function down(knex: Knex): Promise<void> {
  // Disable RLS policies
  await knex.raw(`
    DROP POLICY IF EXISTS users_view_policy ON users;
    DROP POLICY IF EXISTS users_modify_policy ON users;
  `);

  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP FUNCTION IF EXISTS update_updated_at_column();
  `);

  // Drop table and related objects
  await knex.schema.dropTableIfExists('users');

  // Drop custom types
  await knex.raw(`
    DROP TYPE IF EXISTS user_role;
    DROP TYPE IF EXISTS user_status;
  `);

  // Note: We don't drop the uuid-ossp extension as it might be used by other tables
}