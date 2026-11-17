import { badRequest } from '../utils/errors.js';

/** Validates and coerces a JSON body against a Zod schema. */
export function parseBody(schema, body) {
  if (body === undefined || body === null) throw badRequest('Request body is required');
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest(
      'Some fields need attention',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

export function parseQuery(schema, query) {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw badRequest(
      'Invalid query parameters',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

/**
 * Best-effort in-memory limiter. Per-isolate only (documented demo limitation),
 * it exists to stop accidental flooding during a presentation.
 */
const buckets = new Map();

export function rateLimit({ limit = 120, windowMs = 60 * 1000, key = 'global' } = {}) {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'local';
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(bucketKey) ?? { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    if (bucket.count > limit) {
      c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down a little.' } }, 429);
    }
    await next();
  };
}
