/**
 * Centralised runtime configuration.
 * Hono gives us `c.env`, which is `process.env` on Node and the Worker bindings
 * object on Cloudflare. Never read secrets from the client bundle.
 */
export function getEnv(env = {}) {
  const merged = { ...env };
  return {
    databaseUrl: merged.DATABASE_URL ?? '',
    authSecret: merged.DEMO_AUTH_SECRET ?? 'nezta-demo-secret-change-me',
    corsOrigins: (merged.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    commissionRate: Number(merged.DEFAULT_COMMISSION_RATE ?? 10),
    demoMode: true,
  };
}
