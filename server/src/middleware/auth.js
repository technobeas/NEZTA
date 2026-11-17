import { getEnv } from '../config/env.js';
import { getPrisma } from '../database/client.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { verifyToken } from '../utils/token.js';

/** Browsing the marketplace and sending a bulk enquiry do not require a login. */
const PUBLIC_GET_PATHS = [
  /^\/api\/health$/,
  /^\/api\/auth\/demo-accounts$/,
  /^\/api\/shop\/(public|public\/)/,
  /^\/api\/categories/,
  /^\/api\/products/,
  /^\/api\/meal-boxes/,
  /^\/api\/tiffin-plans/,
  /^\/api\/bulk-packages/,
];

const PUBLIC_POST_PATHS = [/^\/api\/auth\/login$/, /^\/api\/bulk-enquiries$/];

function isPublicRequest(c) {
  const path = c.req.path;
  if (c.req.method === 'OPTIONS') return true;
  if (c.req.method === 'GET' && PUBLIC_GET_PATHS.some((pattern) => pattern.test(path))) return true;
  if (c.req.method === 'POST' && PUBLIC_POST_PATHS.some((pattern) => pattern.test(path))) return true;
  return false;
}

/** Attaches the Prisma client to the Hono context. */
export async function contextMiddleware(c, next) {
  c.set('db', getPrisma(c.env));
  c.set('appEnv', getEnv(c.env));
  await next();
}

/** Verifies the demo bearer token and exposes `c.get('auth')`. */
export async function authMiddleware(c, next) {
  const header = c.req.header('Authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const appEnv = c.get('appEnv') ?? getEnv(c.env);
  const auth = await verifyToken(token, appEnv.authSecret);
  if (!auth) {
    if (isPublicRequest(c)) return next();
    throw unauthorized();
  }
  c.set('auth', auth);
  await next();
}

export function requireAuth(c) {
  const auth = c.get('auth');
  if (!auth) throw unauthorized();
  return auth;
}

export function requireRole(...roles) {
  return async (c, next) => {
    const auth = requireAuth(c);
    if (!roles.includes(auth.role)) throw forbidden();
    await next();
  };
}

/** Shop id for shop-scoped roles, never trusted from the request body. */
export function scopeShopId(c) {
  const auth = requireAuth(c);
  if (auth.role === 'PLATFORM_ADMIN') {
    return c.req.query('shopId') || auth.shopId || null;
  }
  if (!auth.shopId) throw forbidden('No shop is linked to this account');
  return auth.shopId;
}

export function isShopRole(role) {
  return role === 'SHOP_OWNER' || role === 'KITCHEN_STAFF';
}
