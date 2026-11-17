import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getEnv } from './config/env.js';
import { authMiddleware, contextMiddleware } from './middleware/auth.js';
import { errorHandler } from './utils/errors.js';

import authRoutes from './modules/auth/auth.routes.js';
import catalogRoutes from './modules/catalog/catalog.routes.js';
import shopRoutes from './modules/shops/shops.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes.js';
import bulkOrderRoutes from './modules/bulk-orders/bulk-orders.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
import deliveryRoutes from './modules/delivery/delivery.routes.js';
import platformRoutes from './modules/platform/platform.routes.js';

export function createApp() {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const appEnv = getEnv(c.env);
    return cors({
      origin: (requestOrigin) =>
        appEnv.corsOrigins.includes(requestOrigin) ? requestOrigin : appEnv.corsOrigins[0],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    })(c, next);
  });

  app.use('/api/*', contextMiddleware);
  app.use('/api/*', authMiddleware);

  app.get('/api/health', (c) =>
    c.json({
      status: 'ok',
      service: 'nezta-api',
      demoMode: true,
      timestamp: new Date().toISOString(),
    }),
  );

  app.route('/api/auth', authRoutes);
  app.route('/api', catalogRoutes);
  app.route('/api/shop', shopRoutes);
  app.route('/api/orders', orderRoutes);
  app.route('/api/subscriptions', subscriptionRoutes);
  app.route('/api', bulkOrderRoutes);
  app.route('/api/kitchen', kitchenRoutes);
  app.route('/api/delivery', deliveryRoutes);
  app.route('/api/platform', platformRoutes);

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'This API route does not exist' } }, 404));
  app.onError(errorHandler);

  return app;
}
