const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const u = await p.user.findUnique({ where: { email: 'admin@example.com' }, select: { passwordHash: true, role: true, status: true } });
  if (!u) { console.log('NOT FOUND'); process.exit(1); }
  console.log('Role:', u.role, '| Status:', u.status);
  console.log('Hash prefix:', u.passwordHash.substring(0, 20));
  const match1 = await bcrypt.compare('Admin@1234!', u.passwordHash);
  console.log('Password "Admin@1234!" matches:', match1);
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
