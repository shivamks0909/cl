// Jest setup file - runs before all tests
import { beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

// Ensure test data directory exists
const testDbPath = path.join(__dirname, '..', 'data', 'test_validation.db');
const dataDir = path.dirname(testDbPath);

beforeAll(() => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_INSFORGE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.NEXTAUTH_SECRET = 'test-secret-only';
});

afterAll(() => {
  // Cleanup test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
