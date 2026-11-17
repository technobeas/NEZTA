import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { endOfDay, money, startOfDay } from '../../utils/format.js';
import { serializeOrder } from '../../utils/serialize.js';
import { findOrderById, orderInclude, updateOrderStatus } from '../orders/order.service.js';
import { getDefaultShop } from '../shops/shop-helpers.js';

const kitchen = new Hono();

const KITCHEN_NEW = ['NEW', 'CONFIRMED'];
const KITCHEN_PREPARING = ['PREPARING'];
const KITCHEN_READY = ['READY_FOR_PICKUP', 'RIDER_ASSIGNED'];

/** Visual kitchen board: new, preparing and ready columns for a service date. */
kitchen.get('/board', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const query = parseQuery(z.object({ date: z.string().optional() }), c.req.query());
  const serviceDate = query.date ? startOfDay(query.date) : startOfDay();

  const rows = await db.order.findMany({
    where: {
      shopId: shop.id,
      status: { in: [...KITCHEN_NEW, ...KITCHEN_PREPARING, ...KITCHEN_READY] },
      OR: [
        { source: 'SUBSCRIPTION', scheduledFor: { gte: serviceDate, lte: endOfDay(serviceDate) } },
        { source: { not: 'SUBSCRIPTION' }, placedAt: { gte: serviceDate, lte: endOfDay(serviceDate) } },
      ],
    },
    include: orderInclude(),
    orderBy: [{ placedAt: 'asc' }],
  });

  const serialize = (order) => serializeOrder(order);
  const board = {
    date: serviceDate.toISOString().slice(0, 10),
    new: rows.filter((order) => KITCHEN_NEW.includes(order.status)).map(serialize),
    preparing: rows.filter((order) => KITCHEN_PREPARING.includes(order.status)).map(serialize),
    ready: rows.filter((order) => KITCHEN_READY.includes(order.status)).map(serialize),
    totals: {
      orders: rows.length,
      items: rows.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      ),
    },
  };

  return c.json({ data: board });
});

/** Bulk production planning: confirmed bulk orders and aggregate quantities. */
kitchen.get('/bulk', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const query = parseQuery(z.object({ date: z.string().optional() }), c.req.query());

  const orders = await db.bulkOrder.findMany({
    where: {
      shopId: shop.id,
      status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED'] },
      ...(query.date ? { deliveryDate: { gte: startOfDay(query.date), lte: endOfDay(query.date) } } : {}),
    },
    include: {
      items: true,
      history: { orderBy: { createdAt: 'asc' } },
      quotation: true,
    },
    orderBy: { deliveryDate: 'asc' },
  });

  const aggregate = new Map();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = aggregate.get(item.label) ?? { label: item.label, quantity: 0 };
      entry.quantity += item.quantity;
      aggregate.set(item.label, entry);
    }
  }

  return c.json({
    data: {
      orders: orders.map((order) => ({
        id: order.id,
        bulkOrderNumber: order.bulkOrderNumber,
        organizationName: order.organizationName,
        contactPerson: order.contactPerson,
        phone: order.phone,
        deliveryAddress: order.deliveryAddress,
        deliveryDate: order.deliveryDate,
        deliveryTime: order.deliveryTime,
        quantity: order.quantity,
        packageName: order.packageName,
        status: order.status,
        total: money(order.total),
        dietaryRequirements: order.dietaryRequirements,
        notes: order.notes,
        items: order.items.map((item) => ({
          id: item.id,
          label: item.label,
          quantity: item.quantity,
          notes: item.notes,
        })),
      })),
      aggregate: [...aggregate.values()].sort((a, b) => b.quantity - a.quantity),
      totals: {
        orders: orders.length,
        meals: orders.reduce((sum, order) => sum + order.quantity, 0),
      },
    },
  });
});

kitchen.get('/stats', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const today = startOfDay();
  const [newOrders, preparing, ready, subscriptionToday, bulkActive] = await Promise.all([
    db.order.count({ where: { shopId: shop.id, status: { in: KITCHEN_NEW } } }),
    db.order.count({ where: { shopId: shop.id, status: { in: KITCHEN_PREPARING } } }),
    db.order.count({ where: { shopId: shop.id, status: { in: KITCHEN_READY } } }),
    db.order.count({
      where: {
        shopId: shop.id,
        source: 'SUBSCRIPTION',
        scheduledFor: { gte: today, lte: endOfDay() },
      },
    }),
    db.bulkOrder.count({
      where: { shopId: shop.id, status: { in: ['CONFIRMED', 'PREPARING', 'READY'] } },
    }),
  ]);
  return c.json({ data: { newOrders, preparing, ready, subscriptionToday, bulkActive } });
});

async function transition(c, nextStatus, allowedFrom) {
  const auth = c.get('auth');
  const db = c.get('db');
  const order = await findOrderById(db, c.req.param('id'));
  if (!order) throw notFound('Order not found');
  if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) && order.shopId !== auth.shopId) {
    throw badRequest('This order belongs to another shop');
  }
  if (!allowedFrom.includes(order.status)) {
    throw badRequest(`Order ${order.orderNumber} is ${order.status.toLowerCase().replace(/_/g, ' ')}`);
  }
  const updated = await updateOrderStatus({
    db,
    order,
    nextStatus,
    actor: auth,
    note: nextStatus === 'PREPARING' ? 'Kitchen started preparation' : 'Kitchen marked the order ready',
  });
  return c.json({ data: serializeOrder(updated) });
}

kitchen.post('/orders/:id/prepare', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) =>
  transition(c, 'PREPARING', ['CONFIRMED']),
);

kitchen.post('/orders/:id/ready', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) =>
  transition(c, 'READY_FOR_PICKUP', ['PREPARING']),
);

kitchen.post('/orders/:id/prepared', requireRole('KITCHEN_STAFF', 'SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const body = parseBody(
    z.object({ note: z.string().max(200).optional() }),
    await c.req.json().catch(() => ({})),
  );
  const order = await findOrderById(db, c.req.param('id'));
  if (!order) throw notFound('Order not found');
  await db.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: order.status,
      actorUserId: auth.sub ?? null,
      actorRole: auth.role,
      actorName: auth.name,
      note: body.note ?? 'Items prepared — waiting on the rest of the order',
    },
  });
  return c.json({ data: { id: order.id } }, 201);
});

export default kitchen;
