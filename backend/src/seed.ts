/**
 * Admin seeder — run with: npm run seed
 *
 * Reads credentials exclusively from environment variables.
 * Never commit real credentials. Use .env for local dev.
 *
 * Safe to run multiple times — skips creation if admin already exists.
 */
import { env } from './config/env';
import { prisma } from './db/prisma';
import { hashPassword } from './utils/password';

async function seed(): Promise<void> {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_FIRST_NAME, SEED_ADMIN_LAST_NAME } = env;

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_FIRST_NAME || !SEED_ADMIN_LAST_NAME) {
    console.error('❌  Missing seed environment variables. Check SEED_ADMIN_* in .env');
    process.exit(1);
  }

  await prisma.$connect();

  const existing = await prisma.user.findUnique({
    where: { email: SEED_ADMIN_EMAIL },
  });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email: SEED_ADMIN_EMAIL },
        data: { role: 'ADMIN' },
      });
      console.log(`✅  Promoted existing user ${SEED_ADMIN_EMAIL} to ADMIN`);
    } else {
      console.log(`ℹ️   Admin user ${SEED_ADMIN_EMAIL} already exists — skipping`);
    }
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);

  await prisma.user.create({
    data: {
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      firstName: SEED_ADMIN_FIRST_NAME,
      lastName: SEED_ADMIN_LAST_NAME,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`✅  Admin user created: ${SEED_ADMIN_EMAIL}`);
  await prisma.$disconnect();
}

seed().catch((err: unknown) => {
  console.error('❌  Seeder failed:', err);
  process.exit(1);
});
