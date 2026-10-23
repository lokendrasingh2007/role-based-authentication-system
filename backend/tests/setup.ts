/**
 * Per-file setup — runs before each test file in the worker.
 * Loads .env for JWT_SECRET, CORS_ORIGIN, etc.
 * DATABASE_URL is overridden per-suite in beforeAll via db-helpers.ts.
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_ENV = 'test';
