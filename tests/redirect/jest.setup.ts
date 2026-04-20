// Jest setup for redirect test suite
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

// Ensure required env vars are set
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`[Redirect Tests Setup] Missing environment variables: ${missing.join(', ')}`);
  console.error('Please configure .env.test file with test Supabase credentials.');
  process.exit(1);
}

// Global test timeout
jest.setTimeout(60000);

// Suppress console noise during tests (optional)
const originalError = console.error;
console.error = (...args) => {
  if (process.env.DEBUG_TESTS) {
    originalError.call(console, ...args);
  }
};

console.log('[Redirect Tests] Jest environment configured');