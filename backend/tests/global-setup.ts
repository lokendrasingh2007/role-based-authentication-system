/**
 * Vitest globalSetup — runs in the main process ONCE before any workers start.
 * Starts the in-memory MongoDB replica set and exports the URI via a shared file.
 *
 * Uses provide/inject pattern: globalSetup can return values that are available
 * in setupFiles via Vitest's `inject()` API.
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet: MongoMemoryReplSet;

export async function setup(): Promise<{ mongoUri: string }> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  const baseUri = replSet.getUri();
  // Append a database name so Prisma commands target the correct namespace
  const mongoUri = baseUri.includes('?')
    ? baseUri.replace('?', 'auth_test?')
    : baseUri.endsWith('/')
    ? `${baseUri}auth_test`
    : `${baseUri}/auth_test`;

  console.log(`\n🧪  Test MongoDB started`);

  // Return value is available via inject() in setupFiles
  return { mongoUri };
}

export async function teardown(): Promise<void> {
  if (replSet) {
    await replSet.stop();
    console.log('\n🧹  Test MongoDB stopped');
  }
}
