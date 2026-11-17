import { Hono } from 'hono';
import { z } from 'zod';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES } from '../../constants/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { parseBody, rateLimit } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { serializeCustomer } from '../../utils/serialize.js';
import { signToken } from '../../utils/token.js';
import { verifyPassword } from '../../utils/password.js';

const auth = new Hono();

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const switchSchema = z.object({
  role: z.enum(Object.values(ROLES)),
});

export async function buildSession(db, user) {
  const customer = await db.customer.findFirst({
    where: { userId: user.id },
    include: { addresses: true },
  });
  const rider = await db.rider.findFirst({ where: { userId: user.id } });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId,
      customerId: customer?.id ?? null,
      riderId: rider?.id ?? null,
      customer: customer ? serializeCustomer(customer) : null,
    },
  };
}

/** List of one-click demo accounts (visible on the demo login screen). */
auth.get('/demo-accounts', (c) =>
  c.json({
    demoMode: true,
    password: DEMO_PASSWORD,
    accounts: DEMO_ACCOUNTS,
  }),
);

auth.post('/login', rateLimit({ limit: 30, windowMs: 60_000, key: 'login' }), async (c) => {
  const db = c.get('db');
  const appEnv = c.get('appEnv');
  const { email, password } = parseBody(loginSchema, await c.req.json().catch(() => null));

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive) throw notFound('No demo account matches those details');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw badRequest('Incorrect password for this demo account');

  const session = await buildSession(db, user);
  const token = await signToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      shopId: user.shopId,
      customerId: session.user.customerId,
      riderId: session.user.riderId,
    },
    appEnv.authSecret,
  );

  return c.json({ token, demoMode: true, ...session });
});

/** Presentation helper: swap between demo roles without retyping credentials. */
auth.post('/switch-role', async (c) => {
  requireAuth(c);
  const db = c.get('db');
  const appEnv = c.get('appEnv');
  const { role } = parseBody(switchSchema, await c.req.json().catch(() => null));
  const account = DEMO_ACCOUNTS.find((entry) => entry.role === role);
  if (!account) throw badRequest('Unknown demo role');

  const user = await db.user.findUnique({ where: { email: account.email } });
  if (!user || !user.isActive) throw notFound('Demo account is not available');

  const session = await buildSession(db, user);
  const token = await signToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      shopId: user.shopId,
      customerId: session.user.customerId,
      riderId: session.user.riderId,
    },
    appEnv.authSecret,
  );

  return c.json({ token, demoMode: true, ...session });
});

auth.get('/me', async (c) => {
  const claims = requireAuth(c);
  const db = c.get('db');
  const user = await db.user.findUnique({
    where: { id: claims.sub },
    include: { shop: true },
  });
  if (!user) throw notFound('Demo account no longer exists');
  const session = await buildSession(db, user);
  return c.json({
    demoMode: true,
    shop: user.shop ? { id: user.shop.id, name: user.shop.name, slug: user.shop.slug } : null,
    ...session,
  });
});

export default auth;
