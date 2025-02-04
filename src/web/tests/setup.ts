import '@testing-library/jest-dom'; // v5.16.5
import { cleanup } from '@testing-library/react'; // v13.4.0
import userEvent from '@testing-library/user-event'; // v14.4.3
import server from './mocks/server';

/**
 * Global test environment configuration
 * Sets up DOM testing environment, API mocking, browser compatibility mocks,
 * and performance measurement utilities
 */

// Configure global test environment
beforeAll(() => {
  // Start MSW server with strict error handling for unhandled requests
  server.listen({
    onUnhandledRequest: 'error'
  });

  // Configure userEvent for consistent behavior
  userEvent.setup({
    advanceTimers: jest.advanceTimersByTime
  });
});

// Reset handlers and cleanup after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
  
  // Clear all performance marks and measures
  performance.clearMarks();
  performance.clearMeasures();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

/**
 * Mock browser APIs not available in JSDOM
 * Required for testing components that use modern browser features
 */

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

// Mock matchMedia for responsive design testing
global.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn()
}));

// Mock Performance API for measuring test execution
const originalPerformance = window.performance;
global.performance = {
  ...originalPerformance,
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

/**
 * Error boundary for tests
 * Prevents unhandled errors from failing tests silently
 */
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' && 
    args[0].includes('Error: Uncaught [')
  ) {
    throw new Error(args[0]);
  }
  originalConsoleError.apply(console, args);
};

/**
 * Configure Jest environment
 */
Object.defineProperty(window, 'env', {
  value: {
    NODE_ENV: 'test',
    API_BASE_URL: 'http://localhost:3000/api/v1'
  }
});

// Extend Jest matchers
expect.extend({
  toHaveBeenCalledOnceWith(received: jest.Mock, ...expected: any[]) {
    const pass = received.mock.calls.length === 1 &&
      JSON.stringify(received.mock.calls[0]) === JSON.stringify(expected);
    
    return {
      pass,
      message: () => pass
        ? `Expected mock not to have been called once with ${expected}`
        : `Expected mock to have been called once with ${expected}`
    };
  }
});