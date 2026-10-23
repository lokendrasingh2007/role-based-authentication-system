import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * In test environments, vitest/globalSetup starts an in-memory MongoDB replica
 * set and vitest/setupFiles sets DATABASE_URL before this module is first
 * imported, so the client automatically connects to the test database.
 *
 * In development/production, DATABASE_URL comes from .env / the OS environment.
 */

const nodeEnv = process.env.NODE_ENV ?? 'development';

const databaseUrl =
  nodeEnv === 'test' && process.env.TEST_DATABASE_URL
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Reuse an existing global client during hot-reload in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (nodeEnv !== 'production') {
  global.__prisma = prisma;
}
