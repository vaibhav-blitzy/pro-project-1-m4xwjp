import { setupServer, SetupServer } from 'msw'; // v1.3.0
import { authHandlers, projectHandlers, taskHandlers } from './handlers';

/**
 * Mock Service Worker (MSW) server instance for intercepting and mocking API requests during testing.
 * Provides comprehensive request mocking capabilities with type-safe handlers for:
 * - Authentication flows (login, MFA, token refresh)
 * - Project management operations
 * - Task management operations
 * 
 * Implements HAL+JSON format and RFC 7807 problem details for error responses
 * as specified in the technical requirements.
 */
const server: SetupServer = setupServer(
  // Spread all handlers to register them with the server
  ...authHandlers,
  ...projectHandlers,
  ...taskHandlers
);

/**
 * Export server instance with type-safe methods:
 * - listen(): Start request interception
 * - close(): Stop request interception
 * - resetHandlers(): Reset to initial handlers
 * - use(): Add runtime request handlers
 */
export default server;

/**
 * Re-export server methods for selective imports
 * Useful for specific test setup/teardown scenarios
 */
export const {
  listen,
  close,
  resetHandlers,
  use
} = server;