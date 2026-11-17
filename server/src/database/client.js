import { PrismaClient } from '@prisma/client';

/**
 * A single Prisma client is reused per runtime instance. Prisma opens a small
 * connection pool; recreating the client per request would exhaust Postgres.
 */
let client;
let clientUrl;

export function getPrisma(env = {}) {
  const url = env.DATABASE_URL;
  if (!client || (url && url !== clientUrl)) {
    client = new PrismaClient(
      url
        ? {
            datasources: { db: { url } },
            log: ['warn', 'error'],
          }
        : { log: ['warn', 'error'] },
    );
    clientUrl = url;
  }
  return client;
}

export async function disconnectPrisma() {
  if (client) {
    await client.$disconnect();
    client = undefined;
    clientUrl = undefined;
  }
}
