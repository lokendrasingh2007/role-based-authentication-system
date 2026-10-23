import { env } from './config/env';
import app from './app';
import { prisma } from './db/prisma';

async function main(): Promise<void> {
  // Verify DB connection before accepting traffic
  await prisma.$connect();
  console.log('✅  Database connected');

  const server = app.listen(env.PORT, () => {
    console.log(`🚀  Server running on http://localhost:${env.PORT}`);
    console.log(`🌍  Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️   ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('💤  Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
