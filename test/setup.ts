import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  // Suppress logs during tests unless debugging
  if (!process.env.DEBUG) {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
  }
});

afterAll(() => {
  // Global cleanup if needed
});
