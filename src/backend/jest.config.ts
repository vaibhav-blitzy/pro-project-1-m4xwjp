import type { Config } from 'jest'; // v29.0.0

const jestConfig: Config = {
  // Use TypeScript preset for Jest
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for tests and source code
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Test file patterns to match
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  // Files to collect coverage information from
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/**/index.ts'
  ],

  // Directory where coverage reports will be output
  coverageDirectory: 'coverage',

  // Coverage report formats
  coverageReporters: [
    'text',
    'lcov',
    'json-summary'
  ],

  // Minimum coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Module path aliases
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1'
  },

  // File extensions to consider for module resolution
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],

  // Transform files using ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Enable verbose test output
  verbose: true,

  // Test timeout in milliseconds
  testTimeout: 30000,

  // Reset mocks configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Patterns to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Patterns to ignore during watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ]
};

export default jestConfig;