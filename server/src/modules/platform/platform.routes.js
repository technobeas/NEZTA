import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { buildSession } from '../auth/auth.routes.js';
import { signToken } from '../../utils/token.js';
import { parseBody } from '../../middleware/validate.js';
import { notFound } from '../../utils/errors.js';
import { addDays, endOfDay, money, round, startOfDay, toDateOnly } from '../../utils/format.js';
import { serializeOrder } from '../../utils/serialize.js';
import { seedDatabase } from '../../database/seed.js';

const platform = new Hono();

platform.use('*', requireRole('PLATFORM_ADMIN'));

async function commissionRateOf(db) {
  const setting = await db.platformSetting.findUnique({ where: { key: 'commission_rate' } });
  const parsed = Number(setting?.value ?? 10);
  return Number.isFinite(parsed) ? parsed : 10;
}

platform.get('/overview', async (c) => {
  const db = c.get('db');
  const commissionRate = await commissionRateOf(db);
  const last7 = startOfDay(addDays(new Date(), -6));

  const [
    shops,
    activeShops,
    totalCustomers,
    totalOrders,
    gmvAgg,
    activeSubscriptions,
    pausedSubscriptions,
    cancelledSubscriptions,
    subscriptionValue,
    enquiryCount,
    enquiriesPending,
    confirmedBulk,
    bulkValue,
    recentOrders,
    weekOrders,
    sourceBreakdown,
    shopPerformance,
  ] = await Promise.all([
    db.shop.count(),
    db.shop.count({ where: { status: 'ACTIVE' } }),
    db.customer.count(),
    db.order.count(),
    db.order.aggregate({
      where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
      _sum: { total: true },
    }),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
    db.subscription.count({ where: { status: 'PAUSED' } }),
    db.subscription.count({ where: { status: 'CANCELLED' } }),
    db.subscription.aggregate({
      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      _sum: { totalPrice: true },
    }),
    db.bulkOrderEnquiry.count(),
    db.bulkOrderEnquiry.count({ where: { status: { in: ['ENQUIRY_RECEIVED', 'QUOTATION_SENT'] } } }),
    db.bulkOrder.count({ where: { status: { notIn: ['CANCELLED'] } } }),
    db.bulkOrder.aggregate({
      where: { status: { notIn: ['CANCELLED'] } },
      _sum: { total: true },
    }),
    db.order.findMany({
      include: { customer: true, shop: true, items: true, rider: true },
      orderBy: { placedAt: 'desc' },
      take: 8,
    }),
    db.order.findMany({
      where: { placedAt: { gte: last7 }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { placedAt: true, total: true },
    }),
    db.order.groupBy({
      by: ['source'],
      where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.shop.findMany({
      include: {
        _count: { select: { orders: true, customers: true, subscriptions: true } },
      },
    }),
  ]);

  const gmv = money(gmvAgg._sum.total);
  const trend = new Map();
  for (let index = 6; index >= 0; index -= 1) {
    trend.set(toDateOnly(addDays(new Date(), -index)), { revenue: 0, orders: 0 });
  }
  for (const order of weekOrders) {
    const key = toDateOnly(order.placedAt);
    if (!trend.has(key)) continue;
    const entry = trend.get(key);
    entry.revenue = round(entry.revenue + money(order.total));
    entry.orders += 1;
  }

  const shopStats = await Promise.all(
    shopPerformance.map(async (shop) => {
      const aggregate = await db.order.aggregate({
        where: { shopId: shop.id, status: { notIn: ['CANCELLED', 'REJECTED'] } },
        _sum: { total: true },
      });
      const revenue = money(aggregate._sum.total);
      const rate = shop.commissionRate ? money(shop.commissionRate) : commissionRate;
      return {
        id: shop.id,
        name: shop.name,
        status: shop.status,
        city: shop.city,
        orders: shop._count.orders,
        customers: shop._count.customers,
        subscriptions: shop._count.subscriptions,
        revenue,
        commissionRate: rate,
        estimatedCommission: round((revenue * rate) / 100),
      };
    }),
  );

  return c.json({
    data: {
      demoData: true,
      metrics: {
        totalShops: shops,
        activeShops,
        totalCustomers,
        totalOrders,
        gmv,
        commissionRate,
        estimatedCommission: round((gmv * commissionRate) / 100),
        activeSubscriptions,
        pausedSubscriptions,
        cancelledSubscriptions,
        subscriptionValue: money(subscriptionValue._sum.totalPrice),
        bulkEnquiries: enquiryCount,
        pendingBulkEnquiries: enquiriesPending,
        confirmedBulkOrders: confirmedBulk,
        bulkOrderValue: money(bulkValue._sum.total),
      },
      salesTrend: [...trend.entries()].map(([date, value]) => ({ date, ...value })),
      sourceBreakdown: sourceBreakdown.map((entry) => ({
        source: entry.source,
        orders: entry._count._all,
        value: money(entry._sum.total),
      })),
      shops: shopStats,
      recentOrders: recentOrders.map((order) => serializeOrder(order)),
      note: 'All figures are demonstration data. Commission values are illustrative estimates, not payouts.',
    },
  });
});

platform.get('/shops', async (c) => {
  const db = c.get('db');
  const commissionRate = await commissionRateOf(db);
  const shops = await db.shop.findMany({
    include: {
      settings: true,
      _count: { select: { orders: true, customers: true, subscriptions: true, products: true } },
      users: { where: { role: 'SHOP_OWNER' }, select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = await Promise.all(
    shops.map(async (shop) => {
      const aggregate = await db.order.aggregate({
        where: { shopId: shop.id, status: { notIn: ['CANCELLED', 'REJECTED'] } },
        _sum: { total: true },
      });
      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        owner: shop.users[0] ?? null,
        phone: shop.phone,
        email: shop.email,
        city: shop.city,
        status: shop.status,
        createdAt: shop.createdAt,
        rating: money(shop.rating),
        commissionRate: shop.commissionRate ? money(shop.commissionRate) : commissionRate,
        orders: shop._count.orders,
        customers: shop._count.customers,
        subscriptions: shop._count.subscriptions,
        products: shop._count.products,
        revenue: money(aggregate._sum.total),
        deliveryFee: shop.settings ? money(shop.settings.deliveryFee) : null,
      };
    }),
  );

  return c.json({ data: rows });
});

platform.get('/shops/:id', async (c) => {
  const db = c.get('db');
  const shop = await db.shop.findUnique({
    where: { id: c.req.param('id') },
    include: {
      settings: true,
      _count: { select: { orders: true, customers: true, subscriptions: true, products: true, mealBoxes: true } },
      users: { select: { id: true, name: true, email: true, phone: true, role: true } },
    },
  });
  if (!shop) throw notFound('Shop not found');
  const aggregate = await db.order.aggregate({
    where: { shopId: shop.id, status: { notIn: ['CANCELLED', 'REJECTED'] } },
    _sum: { total: true },
  });
  const commissionRate = shop.commissionRate ? money(shop.commissionRate) : await commissionRateOf(db);
  return c.json({
    data: {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      status: shop.status,
      city: shop.city,
      address: [shop.addressLine, shop.city, shop.pincode].filter(Boolean).join(', '),
      phone: shop.phone,
      email: shop.email,
      rating: money(shop.rating),
      commissionRate,
      revenue: money(aggregate._sum.total),
      counts: shop._count,
      team: shop.users,
      settings: shop.settings
        ? {
            deliveryFee: money(shop.settings.deliveryFee),
            minOrderValue: money(shop.settings.minOrderValue),
            freeDeliveryAbove: money(shop.settings.freeDeliveryAbove),
            isAcceptingOrders: shop.settings.isAcceptingOrders,
          }
        : null,
    },
  });
});

platform.patch('/shops/:id', async (c) => {
  const db = c.get('db');
  const body = parseBody(
    z.object({
      status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
      commissionRate: z.coerce.number().min(0).max(50).optional().nullable(),
    }),
    await c.req.json().catch(() => null),
  );
  const shop = await db.shop.findUnique({ where: { id: c.req.param('id') } });
  if (!shop) throw notFound('Shop not found');

  const updated = await db.shop.update({
    where: { id: shop.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.commissionRate !== undefined ? { commissionRate: body.commissionRate } : {}),
    },
  });
  return c.json({
    data: {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      commissionRate: updated.commissionRate ? money(updated.commissionRate) : null,
    },
  });
});

/**
 * Commission-focused order rollup. The platform console only needs totals, so
 * this returns aggregates instead of customer, payment or line-item detail.
 */
platform.get('/orders', async (c) => {
  const db = c.get('db');
  const query = c.req.query();
  const where = {};

  if (query.dateFrom || query.dateTo) {
    where.placedAt = {};
    if (query.dateFrom) where.placedAt.gte = startOfDay(new Date(query.dateFrom));
    if (query.dateTo) where.placedAt.lte = endOfDay(new Date(query.dateTo));
  }

  const [orders, shops, commissionRate] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        placedAt: true,
        total: true,
        status: true,
        source: true,
        shopId: true,
        shop: { select: { id: true, name: true, commissionRate: true } },
      },
      orderBy: { placedAt: 'desc' },
    }),
    db.shop.findMany({ select: { id: true, name: true, commissionRate: true }, orderBy: { createdAt: 'asc' } }),
    commissionRateOf(db),
  ]);

  const commissionable = orders.filter((order) => !['CANCELLED', 'REJECTED'].includes(order.status));
  const rateFor = (shop) => (shop?.commissionRate ? money(shop.commissionRate) : commissionRate);
  const commissionFor = (order) => round((money(order.total) * rateFor(order.shop)) / 100);

  const bySource = new Map();
  const byShop = new Map(
    shops.map((shop) => [shop.id, { id: shop.id, name: shop.name, rate: rateFor(shop), orders: 0, value: 0, commission: 0 }]),
  );

  for (const order of commissionable) {
    const value = money(order.total);
    const commission = commissionFor(order);

    const source = bySource.get(order.source) ?? { source: order.source, orders: 0, value: 0, commission: 0 };
    source.orders += 1;
    source.value = round(source.value + value);
    source.commission = round(source.commission + commission);
    bySource.set(order.source, source);

    const shop = byShop.get(order.shopId) ?? {
      id: order.shopId,
      name: order.shop?.name ?? 'Shop',
      rate: rateFor(order.shop),
      orders: 0,
      value: 0,
      commission: 0,
    };
    shop.orders += 1;
    shop.value = round(shop.value + value);
    shop.commission = round(shop.commission + commission);
    byShop.set(order.shopId, shop);
  }

  const gmv = round(commissionable.reduce((sum, order) => sum + money(order.total), 0));
  const commission = round(commissionable.reduce((sum, order) => sum + commissionFor(order), 0));

  return c.json({
    data: {
      totals: {
        orders: orders.length,
        commissionableOrders: commissionable.length,
        gmv,
        delivered: orders.filter((order) => order.status === 'DELIVERED').length,
        cancelled: orders.filter((order) => ['CANCELLED', 'REJECTED'].includes(order.status)).length,
        commission,
        commissionRate,
      },
      bySource: [...bySource.values()].sort((a, b) => b.value - a.value),
      byShop: [...byShop.values()].sort((a, b) => b.value - a.value),
      recent: orders.slice(0, 6).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        source: order.source,
        status: order.status,
        total: money(order.total),
        commission: commissionFor(order),
      })),
    },
    meta: { demoData: true, note: 'Commission values are illustrative demo estimates, not payouts.' },
  });
});

platform.get('/subscriptions', async (c) => {
  const db = c.get('db');
  const [rows, commissionRate] = await Promise.all([
    db.subscription.findMany({
      select: {
        id: true,
        status: true,
        totalPrice: true,
        _count: { select: { orders: true, skips: true } },
        plan: { select: { planType: true, durationDays: true, mealsPerDay: true } },
      },
    }),
    commissionRateOf(db),
  ]);

  const live = rows.filter((row) => row.status !== 'CANCELLED');
  const value = round(live.reduce((sum, row) => sum + money(row.totalPrice), 0));
  const deliveredMeals = rows.reduce((sum, row) => sum + row._count.orders, 0);
  const skippedMeals = rows.reduce((sum, row) => sum + row._count.skips, 0);

  const byPlan = new Map();
  for (const row of rows) {
    const entry = byPlan.get(row.plan.planType) ?? {
      planType: row.plan.planType,
      plans: 0,
      active: 0,
      deliveredMeals: 0,
      value: 0,
    };
    entry.plans += 1;
    if (row.status === 'ACTIVE') entry.active += 1;
    entry.deliveredMeals += row._count.orders;
    if (row.status !== 'CANCELLED') entry.value = round(entry.value + money(row.totalPrice));
    byPlan.set(row.plan.planType, entry);
  }

  return c.json({
    data: {
      totals: {
        plans: rows.length,
        active: rows.filter((row) => row.status === 'ACTIVE').length,
        paused: rows.filter((row) => row.status === 'PAUSED').length,
        cancelled: rows.filter((row) => row.status === 'CANCELLED').length,
        value,
        commissionRate,
        estimatedCommission: round((value * commissionRate) / 100),
        deliveredMeals,
        skippedMeals,
      },
      byPlan: [...byPlan.values()].sort((a, b) => b.value - a.value),
    },
    meta: { demoData: true, note: 'Plan value is the total agreed at purchase. No recurring payment is collected.' },
  });
});

async function settingsPayload(db) {
  const settings = await db.platformSetting.findMany({ orderBy: { key: 'asc' } });
  const commission = settings.find((setting) => setting.key === 'commission_rate');
  const updatedAt = settings.reduce(
    (latest, setting) => (!latest || setting.updatedAt > latest ? setting.updatedAt : latest),
    null,
  );
  return {
    commissionRate: commission ? Number(commission.value) : 10,
    updatedAt,
    items: settings.map((setting) => ({ key: setting.key, value: setting.value, label: setting.label })),
  };
}

platform.get('/settings', async (c) => {
  const db = c.get('db');
  return c.json({ data: await settingsPayload(db) });
});

platform.patch('/settings', async (c) => {
  const db = c.get('db');
  const body = parseBody(
    z.object({
      commissionRate: z.coerce.number().min(0).max(50).optional(),
    }),
    await c.req.json().catch(() => null),
  );

  if (body.commissionRate !== undefined) {
    await db.platformSetting.upsert({
      where: { key: 'commission_rate' },
      create: {
        key: 'commission_rate',
        value: String(body.commissionRate),
        label: 'Default platform commission rate (%)',
      },
      update: { value: String(body.commissionRate) },
    });
  }

  return c.json({
    data: await settingsPayload(db),
    meta: {
      note: 'New estimates use the updated rate. Orders already priced keep their recorded values.',
    },
  });
});

/** Restores the entire demonstration dataset to a clean starting state. */
platform.post('/reset-demo', async (c) => {
  const db = c.get('db');
  const claims = requireAuth(c);
  const result = await seedDatabase(db);

  // The seed recreates every row, so the caller's demo account is re-issued a
  // fresh token that points at the newly seeded user instead of stale ids.
  const user = await db.user.findUnique({ where: { email: claims.email } });
  let session = null;
  let token = null;
  if (user) {
    session = await buildSession(db, user);
    token = await signToken(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        shopId: user.shopId,
        customerId: session.user.customerId,
        riderId: session.user.riderId,
      },
      c.get('appEnv').authSecret,
    );
  }

  return c.json({
    data: {
      reset: true,
      counts: result.counts,
      token,
      user: session?.user ?? null,
      note: 'Demo data has been restored. Existing demo orders, subscriptions and enquiries were replaced.',
    },
  });
});

export default platform;
