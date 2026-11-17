import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import {
  addDays,
  money,
  parseDateOnly,
  round,
  startOfDay,
  toDateOnly,
  toUtcDateString,
  utcDateFromToday,
} from '../../utils/format.js';
import { orderNumber as makeOrderNumber, subscriptionNumber } from '../../utils/ids.js';
import { serializeSubscription } from '../../utils/serialize.js';
import { resolveShop } from '../shops/shop-helpers.js';
import { createOrderRecord, orderInclude } from '../orders/order.service.js';

const subscriptions = new Hono();

const SUBSCRIPTION_INCLUDE = {
  plan: true,
  customer: true,
  schedules: true,
  skips: true,
  orders: {
    orderBy: { placedAt: 'desc' },
    include: { subscriptionOrder: true },
  },
};

const deliverySchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(15),
  line1: z.string().min(5).max(160),
  line2: z.string().max(160).optional().nullable(),
  city: z.string().min(2).max(60),
  pincode: z.string().min(4).max(10),
});

const purchaseSchema = z.object({
  planId: z.string().uuid(),
  startDate: z.string().min(8),
  deliverySlot: z.string().max(60).optional(),
  mealPreference: z.string().max(120).optional().nullable(),
  addressId: z.string().uuid().optional().nullable(),
  delivery: deliverySchema.optional(),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7).optional(),
  saveAddress: z.boolean().optional(),
});

function assertSubscriptionAccess(subscription, auth) {
  if (!subscription) throw notFound('Subscription not found');
  if (auth.role === 'PLATFORM_ADMIN') return;
  if (auth.role === 'CUSTOMER' && subscription.customerId === auth.customerId) return;
  if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) && subscription.shopId === auth.shopId) return;
  throw forbidden('This subscription belongs to another account');
}

/** Upcoming delivery dates for a subscription (respects pause, skips and period). */
function upcomingDates(subscription, { count = 6, from = new Date() } = {}) {
  if (subscription.status === 'CANCELLED') return [];
  const start = new Date(subscription.startDate);
  const end = new Date(subscription.endDate);
  const weekdays = new Set((subscription.schedules ?? []).map((slot) => slot.weekday));
  const skips = new Set((subscription.skips ?? []).map((skip) => toUtcDateString(skip.skipDate)));
  const fromUtc = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const cursor = new Date(Math.max(fromUtc.getTime(), start.getTime()));
  const dates = [];
  let guard = 0;
  while (cursor <= end && dates.length < count && guard < 400) {
    guard += 1;
    const isoWeekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    const key = toUtcDateString(cursor);
    if (weekdays.size === 0 || weekdays.has(isoWeekday)) {
      if (!skips.has(key)) dates.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/* ------------------------------------------------------------------ purchase */

subscriptions.post('/', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (auth.role !== 'CUSTOMER' || !auth.customerId) {
    throw forbidden('Sign in with the demo customer account to start a tiffin plan');
  }

  const body = parseBody(purchaseSchema, await c.req.json().catch(() => null));
  const plan = await db.tiffinPlan.findUnique({ where: { id: body.planId }, include: { items: true } });
  if (!plan) throw notFound('Tiffin plan not found');
  if (!plan.isAvailable) throw conflict('This tiffin plan is not accepting new subscribers right now');

  const customer = await db.customer.findUnique({
    where: { id: auth.customerId },
    include: { addresses: true },
  });
  if (!customer) throw notFound('Customer profile is missing');

  const startDate = parseDateOnly(body.startDate);
  if (!startDate) throw badRequest('Choose a valid start date');
  const today = utcDateFromToday();
  if (startDate.getTime() < today.getTime()) throw badRequest('The start date cannot be in the past');

  const endDate = addDays(startDate, plan.durationDays - 1);

  let delivery = body.delivery;
  if (body.addressId) {
    const address = customer.addresses.find((entry) => entry.id === body.addressId);
    if (!address) throw notFound('Saved address not found');
    delivery = {
      name: address.receiverName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      pincode: address.pincode,
    };
  }
  if (!delivery) {
    const fallback = customer.addresses.find((address) => address.isDefault) ?? customer.addresses[0];
    if (!fallback) throw badRequest('Add a delivery address to start this subscription');
    delivery = {
      name: fallback.receiverName,
      phone: fallback.phone,
      line1: fallback.line1,
      line2: fallback.line2,
      city: fallback.city,
      pincode: fallback.pincode,
    };
  }

  const weekdays = body.weekdays?.length ? body.weekdays : [1, 2, 3, 4, 5, 6];

  const created = await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        subscriptionNumber: subscriptionNumber(),
        shopId: plan.shopId,
        customerId: customer.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        deliverySlot: body.deliverySlot ?? plan.deliveryWindow,
        mealPreference: body.mealPreference ?? null,
        deliveryName: delivery.name,
        deliveryPhone: delivery.phone,
        deliveryLine1: delivery.line1,
        deliveryLine2: delivery.line2 ?? null,
        deliveryCity: delivery.city,
        deliveryPincode: delivery.pincode,
        totalPrice: money(plan.price),
        paymentStatus: 'PENDING',
        schedules: {
          create: weekdays.map((weekday) => ({
            weekday,
            deliveryTime: body.deliverySlot ?? plan.deliveryWindow,
          })),
        },
      },
      include: SUBSCRIPTION_INCLUDE,
    });

    if (body.saveAddress && body.delivery) {
      await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Delivery',
          receiverName: delivery.name,
          phone: delivery.phone,
          line1: delivery.line1,
          line2: delivery.line2 ?? null,
          city: delivery.city,
          pincode: delivery.pincode,
        },
      });
    }

    return subscription;
  });

  return c.json(
    {
      data: {
        ...serializeSubscription(created),
        upcomingDeliveries: upcomingDates(created),
        demoNote: 'Demo subscription — no recurring payment has been collected.',
      },
    },
    201,
  );
});

/* --------------------------------------------------------------- list & detail */

subscriptions.get('/', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const query = parseQuery(
    z.object({ status: z.string().optional(), shopId: z.string().uuid().optional() }),
    c.req.query(),
  );

  const where = {};
  if (auth.role === 'CUSTOMER') where.customerId = auth.customerId;
  else if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role)) where.shopId = auth.shopId;
  else if (auth.role === 'PLATFORM_ADMIN' && query.shopId) where.shopId = query.shopId;

  if (query.status && query.status !== 'ALL') where.status = { in: query.status.split(',') };

  const rows = await db.subscription.findMany({
    where,
    include: SUBSCRIPTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    data: rows.map((row) => ({
      ...serializeSubscription(row),
      upcomingDeliveries: upcomingDates(row),
    })),
  });
});

subscriptions.get('/:id', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({
    where: { id: c.req.param('id') },
    include: SUBSCRIPTION_INCLUDE,
  });
  assertSubscriptionAccess(subscription, auth);
  return c.json({
    data: { ...serializeSubscription(subscription), upcomingDeliveries: upcomingDates(subscription) },
  });
});

subscriptions.get('/:id/orders', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({
    where: { id: c.req.param('id') },
    include: SUBSCRIPTION_INCLUDE,
  });
  assertSubscriptionAccess(subscription, auth);
  return c.json({
    data: subscription.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      scheduledFor: order.scheduledFor,
      deliveryDate: order.subscriptionOrder?.deliveryDate ?? order.scheduledFor,
      total: money(order.total),
    })),
  });
});

/* ------------------------------------------------------------ state management */

subscriptions.post('/:id/pause', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({ where: { id: c.req.param('id') } });
  assertSubscriptionAccess(subscription, auth);
  if (subscription.status !== 'ACTIVE') throw badRequest('Only an active subscription can be paused');
  if (!['CUSTOMER', 'SHOP_OWNER', 'PLATFORM_ADMIN'].includes(auth.role)) throw forbidden();

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAUSED', pausedAt: new Date() },
    include: SUBSCRIPTION_INCLUDE,
  });
  return c.json({ data: serializeSubscription(updated) });
});

subscriptions.post('/:id/resume', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({ where: { id: c.req.param('id') } });
  assertSubscriptionAccess(subscription, auth);
  if (subscription.status !== 'PAUSED') throw badRequest('Only a paused subscription can be resumed');
  if (!['CUSTOMER', 'SHOP_OWNER', 'PLATFORM_ADMIN'].includes(auth.role)) throw forbidden();
  if (new Date(subscription.endDate).getTime() < utcDateFromToday().getTime()) {
    throw badRequest('This subscription period has ended');
  }

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'ACTIVE', pausedAt: null },
    include: SUBSCRIPTION_INCLUDE,
  });
  return c.json({ data: serializeSubscription(updated) });
});

const skipSchema = z.object({
  date: z.string().min(8),
  reason: z.string().max(160).optional().nullable(),
});

subscriptions.post('/:id/skip', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(skipSchema, await c.req.json().catch(() => null));
  const subscription = await db.subscription.findUnique({
    where: { id: c.req.param('id') },
    include: { skips: true },
  });
  assertSubscriptionAccess(subscription, auth);
  if (!['CUSTOMER', 'SHOP_OWNER', 'PLATFORM_ADMIN'].includes(auth.role)) throw forbidden();
  if (!['ACTIVE', 'PAUSED'].includes(subscription.status)) {
    throw badRequest('Only active or paused subscriptions can skip a delivery');
  }

  const date = parseDateOnly(body.date);
  if (!date) throw badRequest('Choose a valid delivery date');
  if (date.getTime() < new Date(subscription.startDate).getTime() || date.getTime() > new Date(subscription.endDate).getTime()) {
    throw badRequest('That date is outside this subscription period');
  }
  if (date.getTime() < utcDateFromToday().getTime()) {
    throw badRequest('You can only skip upcoming deliveries');
  }

  const existing = await db.subscriptionSkip.findFirst({
    where: { subscriptionId: subscription.id, skipDate: date },
  });
  if (existing) throw conflict('That delivery is already skipped');

  const generated = await db.subscriptionOrder.findFirst({
    where: { subscriptionId: subscription.id, deliveryDate: date },
  });
  if (generated) throw conflict('That delivery has already been prepared and cannot be skipped');

  await db.subscriptionSkip.create({
    data: { subscriptionId: subscription.id, skipDate: date, reason: body.reason ?? null },
  });

  const updated = await db.subscription.findUnique({
    where: { id: subscription.id },
    include: SUBSCRIPTION_INCLUDE,
  });
  return c.json({ data: { ...serializeSubscription(updated), upcomingDeliveries: upcomingDates(updated) } });
});

subscriptions.delete('/:id/skip/:skipId', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({ where: { id: c.req.param('id') } });
  assertSubscriptionAccess(subscription, auth);
  const skip = await db.subscriptionSkip.findFirst({
    where: { id: c.req.param('skipId'), subscriptionId: subscription.id },
  });
  if (!skip) throw notFound('Skipped delivery not found');
  await db.subscriptionSkip.delete({ where: { id: skip.id } });
  const updated = await db.subscription.findUnique({
    where: { id: subscription.id },
    include: SUBSCRIPTION_INCLUDE,
  });
  return c.json({ data: { ...serializeSubscription(updated), upcomingDeliveries: upcomingDates(updated) } });
});

subscriptions.post('/:id/cancel', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const subscription = await db.subscription.findUnique({ where: { id: c.req.param('id') } });
  assertSubscriptionAccess(subscription, auth);
  if (!['CUSTOMER', 'SHOP_OWNER', 'PLATFORM_ADMIN'].includes(auth.role)) throw forbidden();
  if (subscription.status === 'CANCELLED') throw badRequest('This subscription is already cancelled');

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
    include: SUBSCRIPTION_INCLUDE,
  });
  return c.json({ data: serializeSubscription(updated) });
});

/* ------------------------------------------------------ recurring generation */

const generateSchema = z.object({ date: z.string().min(8).optional() });

/**
 * Generates one kitchen order per active subscription for a delivery date.
 * Idempotent: the (subscriptionId, deliveryDate) unique index plus a transaction
 * guarantee that re-running the action never duplicates orders.
 */
subscriptions.post('/generate-orders', requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(generateSchema, await c.req.json().catch(() => ({})));
  const date = body.date ? parseDateOnly(body.date) : utcDateFromToday();
  if (!date) throw badRequest('Choose a valid delivery date');

  const shop = await resolveShop(db, auth.role === 'PLATFORM_ADMIN' ? c.req.query('shopId') : auth.shopId);

  const candidates = await db.subscription.findMany({
    where: {
      shopId: shop.id,
      status: 'ACTIVE',
      startDate: { lte: date },
      endDate: { gte: date },
    },
    include: {
      plan: { include: { items: true } },
      customer: true,
      schedules: true,
      skips: true,
    },
  });

  const isoWeekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const generated = [];
  const skipped = [];

  for (const subscription of candidates) {
    const weekdays = subscription.schedules.map((slot) => slot.weekday);
    if (weekdays.length && !weekdays.includes(isoWeekday)) {
      skipped.push({ subscriptionId: subscription.id, reason: 'not-scheduled-today' });
      continue;
    }
    if (subscription.skips.some((skip) => toUtcDateString(skip.skipDate) === toUtcDateString(date))) {
      skipped.push({ subscriptionId: subscription.id, reason: 'customer-skipped' });
      continue;
    }
    const existing = await db.subscriptionOrder.findFirst({
      where: { subscriptionId: subscription.id, deliveryDate: date },
    });
    if (existing) {
      skipped.push({ subscriptionId: subscription.id, reason: 'already-generated' });
      continue;
    }

    const perDelivery = round(money(subscription.plan.price) / subscription.plan.durationDays);
    const items = subscription.plan.items.length
      ? subscription.plan.items
      : [{ label: subscription.plan.name, quantity: 1 }];
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const lines = items.map((item) => {
      const unitPrice = round(perDelivery / totalUnits);
      return {
        itemType: 'PRODUCT',
        productId: item.productId ?? null,
        mealBoxId: null,
        name: item.label,
        description: subscription.plan.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal: round(unitPrice * item.quantity),
        customizationSummary: subscription.mealPreference
          ? `Meal preference: ${subscription.mealPreference}`
          : null,
        notes: null,
        customizations: [],
      };
    });
    const subtotal = round(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    const deliveryTime = subscription.schedules[0]?.deliveryTime ?? subscription.deliverySlot;
    const scheduledFor = buildSlotDate(date, deliveryTime);

    try {
      const order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber: makeOrderNumber('NZT'),
            shopId: subscription.shopId,
            customerId: subscription.customerId,
            source: 'SUBSCRIPTION',
            status: 'CONFIRMED',
            subtotal,
            discount: 0,
            deliveryFee: 0,
            total: subtotal,
            paymentStatus: 'SIMULATED_PAID',
            deliveryName: subscription.deliveryName,
            deliveryPhone: subscription.deliveryPhone,
            deliveryLine1: subscription.deliveryLine1,
            deliveryLine2: subscription.deliveryLine2,
            deliveryCity: subscription.deliveryCity,
            deliveryPincode: subscription.deliveryPincode,
            scheduledFor,
            subscriptionId: subscription.id,
            items: {
              create: lines.map((line) => ({
                itemType: 'PRODUCT',
                productId: line.productId,
                name: line.name,
                description: line.description,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
                customizationSummary: line.customizationSummary,
              })),
            },
            history: {
              create: {
                status: 'NEW',
                actorRole: 'SHOP_OWNER',
                actorName: 'Tiffin scheduler',
                note: `Auto-generated for ${toUtcDateString(date)} (${subscription.subscriptionNumber})`,
              },
            },
          },
          include: orderInclude(),
        });

        await tx.subscriptionOrder.create({
          data: { subscriptionId: subscription.id, orderId: created.id, deliveryDate: date },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: created.id,
            status: 'CONFIRMED',
            actorRole: 'SHOP_OWNER',
            actorName: 'Tiffin scheduler',
            note: 'Subscription deliveries are confirmed automatically',
          },
        });

        return created;
      });
      generated.push({ subscriptionId: subscription.id, orderId: order.id, orderNumber: order.orderNumber });
    } catch (error) {
      if (error?.code === 'P2002' && String(error?.meta?.target ?? '').toLowerCase().includes('order_number')) {
        skipped.push({ subscriptionId: subscription.id, reason: 'reference-collision-retry' });
        continue;
      }
      if (error?.code === 'P2002') {
        skipped.push({ subscriptionId: subscription.id, reason: 'already-generated' });
      } else {
        throw error;
      }
    }
  }

  return c.json({
    data: {
      date: toUtcDateString(date),
      generated,
      skipped,
      summary: { generated: generated.length, skipped: skipped.length, activeSubscriptions: candidates.length },
      note: 'Generation is idempotent — running it again the same day creates no duplicates.',
    },
  });
});

/** Combines a calendar date (UTC midnight) with a delivery slot in server-local time. */
function buildSlotDate(date, slot) {
  const match = String(slot ?? '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  const result = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    result.setHours(hour, Number(match[2]), 0, 0);
  } else {
    result.setHours(12, 30, 0, 0);
  }
  return result;
}

export default subscriptions;
