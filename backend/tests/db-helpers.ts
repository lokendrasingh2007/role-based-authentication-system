/**
 * Shared test database helpers.
 *
 * Each test suite calls startTestDb() / stopTestDb() in beforeAll/afterAll.
 * Manages an in-memory MongoDB replica set per test file for full isolation.
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { PrismaClient } from '@prisma/client';

let replSet: MongoMemoryReplSet;
let _prisma: PrismaClient;

export async function startTestDb(): Promise<PrismaClient> {
  // Start in-memory replica set — Prisma requires this for transactions
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  // Wait until primary is elected (up to 30s)
  await replSet.waitUntilRunning();

  // getUri() returns: mongodb://127.0.0.1:PORT/?replicaSet=name
  // We must inject the DB name BEFORE the query string
  const rawUri = replSet.getUri();
  const url = new URL(rawUri);
  url.pathname = '/auth_test';   // set the database name correctly
  const uri = url.toString();

  // Set env vars BEFORE importing any Prisma-dependent module
  process.env.DATABASE_URL = uri;
  process.env.TEST_DATABASE_URL = uri;
  process.env.NODE_ENV = 'test';

  // Create a fresh Prisma client pointing at the in-memory DB
  _prisma = new PrismaClient({
    datasources: { db: { url: uri } },
    log: ['error'],
  });

  await _prisma.$connect();

  // Inject into global.__prisma — src/db/prisma.ts uses this singleton
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).__prisma = _prisma;

  return _prisma;
}

export async function stopTestDb(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (global as any).__prisma;
}

export function getTestPrisma(): PrismaClient {
  return _prisma;
}

/**
 * Cleans all test data between test cases.
 * Uses Prisma's standard deleteMany — valid because we have a replica set.
 */
export async function cleanCollections(prismaClient: PrismaClient): Promise<void> {
  // Delete in dependency order (auditLog references user)
  await prismaClient.auditLog.deleteMany({});
  await prismaClient.user.deleteMany({});
}
