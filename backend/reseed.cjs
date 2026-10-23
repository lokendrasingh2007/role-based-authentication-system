const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const hash = await bcrypt.hash('Admin@1234!', 12);
  const u = await p.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: hash, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: 'admin@example.com',
      passwordHash: hash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  console.log('Done. id=' + u.id + ' role=' + u.role);
  const verify = await bcrypt.compare('Admin@1234!', u.passwordHash);
  console.log('Password verify match:', verify);
  await p.$disconnect();
}

main().catch(function(e) { console.error(e.message); process.exit(1); });
