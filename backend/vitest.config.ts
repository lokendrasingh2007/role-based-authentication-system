import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run test files sequentially — each file manages its own MongoDB instance
    singleThread: true,
    // setupFiles load .env before test files are imported
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 60_000, // Allow time for MongoDB binary download on first run
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/seed.ts'],
    },
  },
});
