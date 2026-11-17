import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../src/database/seed.js';

const prisma = new PrismaClient();

try {
  const result = await seedDatabase(prisma);
  console.log('[nezta] demo data seeded');
  console.log(JSON.stringify(result.counts, null, 2));
  console.log(`Demo password for every account: demo1234`);
} catch (error) {
  console.error('[nezta] seed failed', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
