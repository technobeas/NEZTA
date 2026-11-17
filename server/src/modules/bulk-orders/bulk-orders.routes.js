import { Hono } from 'hono';
import { z } from 'zod';
import { BULK_TRANSITIONS } from '../../constants/index.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import { endOfDay, money, round, startOfDay } from '../../utils/format.js';
import {
  bulkOrderNumber,
  enquiryNumber,
  quotationNumber,
  deliveryOtp,
} from '../../utils/ids.js';
import { serializeBulkOrder, serializeEnquiry } from '../../utils/serialize.js';
import { resolveShop } from '../shops/shop-helpers.js';

const bulk = new Hono();

const ENQUIRY_INCLUDE = {
  quotations: { orderBy: { createdAt: 'desc' } },
  bulkOrder: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  package: true,
};

const BULK_ORDER_INCLUDE = {
  items: true,
  quotation: true,
  history: { orderBy: { createdAt: 'asc' } },
  assignments: { include: { rider: true } },
};

const enquirySchema = z.object({
  shopId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional().nullable(),
  packageName: z.string().max(80).optional().nullable(),
  organizationName: z.string().min(2).max(120),
  contactPerson: z.string().min(2).max(80),
  phone: z.string().min(8).max(15),
  email: z.string().email(),
  organizationType: z.enum([
    'Office',
    'Corporate',
    'School',
    'College',
    'Hospital',
    'Event',
    'Family function',
    'Meeting',
    'Other',
  ]),
  deliveryAddress: z.string().min(8).max(300),
  requiredDate: z.string().min(8),
  preferredTime: z.string().min(3).max(60),
  estimatedQuantity: z.coerce.number().int().min(10).max(5000),
  dietaryRequirements: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

function assertEnquiryAccess(enquiry, auth) {
  if (!enquiry) throw notFound('Bulk enquiry not found');
  if (auth.role === 'PLATFORM_ADMIN') return;
  if (auth.role === 'CUSTOMER' && enquiry.customerId === auth.customerId) return;
  if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) && enquiry.shopId === auth.shopId) return;
  throw forbidden('This enquiry belongs to another account');
}

/* ---------------------------------------------------------------- enquiries */

/** Public lead capture from the bulk orders landing page. */
bulk.post('/bulk-enquiries', async (c) => {
  const db = c.get('db');
  const auth = c.get('auth');
  const body = parseBody(enquirySchema, await c.req.json().catch(() => null));
  const shop = await resolveShop(db, body.shopId);
  const requiredDate = new Date(body.requiredDate);

  const pkg = body.packageId
    ? await db.bulkOrderPackage.findFirst({ where: { id: body.packageId, shopId: shop.id } })
    : null;
  if (body.packageId && !pkg) throw notFound('Meal package not found');

  let customerId = auth?.role === 'CUSTOMER' ? auth.customerId : null;
  if (!customerId) {
    const existing = await db.customer.findFirst({
      where: { shopId: shop.id, phone: body.phone },
    });
    customerId = existing?.id ?? null;
  }
  if (!customerId) {
    const created = await db.customer.create({
      data: {
        shopId: shop.id,
        name: body.contactPerson,
        phone: body.phone,
        email: body.email,
        addresses: {
          create: {
            label: 'Organization',
            receiverName: body.contactPerson,
            phone: body.phone,
            line1: body.deliveryAddress.slice(0, 160),
            city: shop.city ?? 'Pune',
            pincode: '411001',
            isDefault: false,
          },
        },
      },
    });
    customerId = created.id;
  }

  const enquiry = await db.bulkOrderEnquiry.create({
    data: {
      enquiryNumber: enquiryNumber(),
      shopId: shop.id,
      customerId,
      packageId: pkg?.id ?? null,
      packageName: pkg?.name ?? body.packageName ?? null,
      organizationName: body.organizationName,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      organizationType: body.organizationType,
      deliveryAddress: body.deliveryAddress,
      requiredDate,
      preferredTime: body.preferredTime,
      estimatedQuantity: body.estimatedQuantity,
      dietaryRequirements: body.dietaryRequirements ?? null,
      notes: body.notes ?? null,
      status: 'ENQUIRY_RECEIVED',
      statusHistory: {
        create: {
          status: 'ENQUIRY_RECEIVED',
          actorUserId: auth?.sub ?? null,
          actorRole: auth?.role ?? null,
          actorName: body.contactPerson,
          note: 'Enquiry submitted from the bulk orders page',
        },
      },
    },
    include: ENQUIRY_INCLUDE,
  });

  return c.json({ data: serializeEnquiry(enquiry) }, 201);
});

bulk.get('/bulk-enquiries/mine', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (!auth.customerId) return c.json({ data: [] });
  const rows = await db.bulkOrderEnquiry.findMany({
    where: { customerId: auth.customerId },
    include: ENQUIRY_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return c.json({ data: rows.map(serializeEnquiry) });
});

bulk.get('/bulk-enquiries', requireRole('SHOP_OWNER', 'KITCHEN_STAFF', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const query = parseQuery(
    z.object({ status: z.string().optional(), search: z.string().max(80).optional() }),
    c.req.query(),
  );
  const shop = await resolveShop(db, auth.role === 'PLATFORM_ADMIN' ? c.req.query('shopId') : auth.shopId);

  const rows = await db.bulkOrderEnquiry.findMany({
    where: {
      shopId: shop.id,
      ...(query.status && query.status !== 'ALL' ? { status: { in: query.status.split(',') } } : {}),
      ...(query.search
        ? {
            OR: [
              { organizationName: { contains: query.search, mode: 'insensitive' } },
              { contactPerson: { contains: query.search, mode: 'insensitive' } },
              { enquiryNumber: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    },
    include: ENQUIRY_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ data: rows.map(serializeEnquiry) });
});

bulk.get('/bulk-enquiries/:id', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const enquiry = await db.bulkOrderEnquiry.findUnique({
    where: { id: c.req.param('id') },
    include: ENQUIRY_INCLUDE,
  });
  assertEnquiryAccess(enquiry, auth);
  return c.json({ data: serializeEnquiry(enquiry) });
});

const quotationSchema = z.object({
  packageName: z.string().min(2).max(120),
  quantity: z.coerce.number().int().min(10).max(5000),
  perPersonPrice: z.coerce.number().positive().max(100000),
  additionalCharges: z.coerce.number().min(0).max(1000000).default(0),
  discount: z.coerce.number().min(0).max(1000000).default(0),
  terms: z.string().max(600).optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

bulk.post(
  '/bulk-enquiries/:id/quotations',
  requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'),
  async (c) => {
    const auth = requireAuth(c);
    const db = c.get('db');
    const body = parseBody(quotationSchema, await c.req.json().catch(() => null));
    const enquiry = await db.bulkOrderEnquiry.findUnique({ where: { id: c.req.param('id') } });
    assertEnquiryAccess(enquiry, auth);
    if (!['ENQUIRY_RECEIVED', 'QUOTATION_SENT'].includes(enquiry.status)) {
      throw badRequest('A quotation cannot be sent for this enquiry in its current state');
    }

    const total = round(body.quantity * body.perPersonPrice + body.additionalCharges - body.discount);
    if (total <= 0) throw badRequest('The quotation total must be greater than zero');

    const created = await db.$transaction(async (tx) => {
      const quotation = await tx.bulkOrderQuotation.create({
        data: {
          enquiryId: enquiry.id,
          quotationNumber: quotationNumber(),
          packageName: body.packageName,
          quantity: body.quantity,
          perPersonPrice: body.perPersonPrice,
          additionalCharges: body.additionalCharges,
          discount: body.discount,
          total,
          terms: body.terms ?? 'Demo quotation — 50% advance and final headcount 24 hours before delivery.',
          validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 7 * 86400000),
          status: 'SENT',
          createdByUserId: auth.sub ?? null,
        },
      });

      await tx.bulkOrderEnquiry.update({ where: { id: enquiry.id }, data: { status: 'QUOTATION_SENT' } });
      await tx.bulkOrderStatusHistory.create({
        data: {
          enquiryId: enquiry.id,
          status: 'QUOTATION_SENT',
          actorUserId: auth.sub ?? null,
          actorRole: auth.role,
          actorName: auth.name,
          note: `Quotation ${quotation.quotationNumber} sent for ₹${total}`,
        },
      });

      return quotation;
    });

    return c.json(
      {
        data: {
          id: created.id,
          quotationNumber: created.quotationNumber,
          packageName: created.packageName,
          quantity: created.quantity,
          perPersonPrice: money(created.perPersonPrice),
          additionalCharges: money(created.additionalCharges),
          discount: money(created.discount),
          total: money(created.total),
          terms: created.terms,
          validUntil: created.validUntil,
          status: created.status,
        },
      },
      201,
    );
  },
);

bulk.post('/bulk-enquiries/:id/reject', requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const enquiry = await db.bulkOrderEnquiry.findUnique({ where: { id: c.req.param('id') } });
  assertEnquiryAccess(enquiry, auth);
  if (enquiry.status === 'ACCEPTED') throw badRequest('This enquiry is already confirmed');
  const updated = await db.$transaction(async (tx) => {
    await tx.bulkOrderStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status: 'REJECTED',
        actorUserId: auth.sub ?? null,
        actorRole: auth.role,
        actorName: auth.name,
        note: 'Enquiry rejected by the shop',
      },
    });
    return tx.bulkOrderEnquiry.update({
      where: { id: enquiry.id },
      data: { status: 'REJECTED' },
      include: ENQUIRY_INCLUDE,
    });
  });
  return c.json({ data: serializeEnquiry(updated) });
});

/** The demo customer accepting a quotation (or the shop doing it on their behalf). */
bulk.post('/bulk-quotations/:id/accept', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const quotation = await db.bulkOrderQuotation.findUnique({
    where: { id: c.req.param('id') },
    include: { enquiry: true },
  });
  if (!quotation) throw notFound('Quotation not found');
  assertEnquiryAccess(quotation.enquiry, auth);
  if (quotation.status === 'ACCEPTED') throw conflict('This quotation is already accepted');
  if (!['SHOP_OWNER', 'CUSTOMER', 'PLATFORM_ADMIN'].includes(auth.role)) {
    throw forbidden('Only the customer or the shop can accept a quotation');
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.bulkOrderQuotation.update({ where: { id: quotation.id }, data: { status: 'ACCEPTED' } });
    await tx.bulkOrderEnquiry.update({ where: { id: quotation.enquiryId }, data: { status: 'ACCEPTED' } });
    await tx.bulkOrderStatusHistory.create({
      data: {
        enquiryId: quotation.enquiryId,
        status: 'ACCEPTED',
        actorUserId: auth.sub ?? null,
        actorRole: auth.role,
        actorName: auth.name,
        note: `Quotation ${quotation.quotationNumber} accepted`,
      },
    });
    return tx.bulkOrderEnquiry.findUnique({ where: { id: quotation.enquiryId }, include: ENQUIRY_INCLUDE });
  });

  return c.json({ data: serializeEnquiry(updated) });
});

/** Converts an accepted quotation into a confirmed bulk production order. */
bulk.post('/bulk-quotations/:id/convert', requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const quotation = await db.bulkOrderQuotation.findUnique({
    where: { id: c.req.param('id') },
    include: { enquiry: true, bulkOrder: true },
  });
  if (!quotation) throw notFound('Quotation not found');
  assertEnquiryAccess(quotation.enquiry, auth);
  if (quotation.status !== 'ACCEPTED') throw badRequest('Accept the quotation before confirming the order');
  if (quotation.bulkOrder) throw conflict('This quotation is already a confirmed bulk order');

  const enquiry = quotation.enquiry;

  const created = await db.$transaction(async (tx) => {
    const order = await tx.bulkOrder.create({
      data: {
        bulkOrderNumber: bulkOrderNumber(),
        shopId: enquiry.shopId,
        enquiryId: enquiry.id,
        quotationId: quotation.id,
        organizationName: enquiry.organizationName,
        contactPerson: enquiry.contactPerson,
        phone: enquiry.phone,
        email: enquiry.email,
        deliveryAddress: enquiry.deliveryAddress,
        deliveryDate: enquiry.requiredDate,
        deliveryTime: enquiry.preferredTime,
        quantity: quotation.quantity,
        packageName: quotation.packageName,
        perPersonPrice: quotation.perPersonPrice,
        additionalCharges: quotation.additionalCharges,
        discount: quotation.discount,
        total: quotation.total,
        terms: quotation.terms,
        dietaryRequirements: enquiry.dietaryRequirements,
        notes: enquiry.notes,
        status: 'CONFIRMED',
        items: {
          create: [
            {
              label: quotation.packageName,
              quantity: quotation.quantity,
              unitPrice: quotation.perPersonPrice,
              notes: enquiry.dietaryRequirements ?? null,
            },
          ],
        },
        history: {
          create: {
            status: 'CONFIRMED',
            actorUserId: auth.sub ?? null,
            actorRole: auth.role,
            actorName: auth.name,
            note: `Converted from quotation ${quotation.quotationNumber} — prices preserved`,
          },
        },
      },
      include: BULK_ORDER_INCLUDE,
    });

    await tx.bulkOrderStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        status: 'CONFIRMED',
        actorUserId: auth.sub ?? null,
        actorRole: auth.role,
        actorName: auth.name,
        note: `Bulk order ${order.bulkOrderNumber} created from an accepted quotation`,
      },
    });

    return order;
  });

  return c.json({ data: serializeBulkOrder(created) }, 201);
});

/* -------------------------------------------------------------- bulk orders */

bulk.get('/bulk-orders', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const query = parseQuery(
    z.object({ status: z.string().optional(), date: z.string().optional(), shopId: z.string().uuid().optional() }),
    c.req.query(),
  );

  const where = {};
  if (auth.role === 'PLATFORM_ADMIN') {
    if (query.shopId) where.shopId = query.shopId;
  } else if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role)) {
    where.shopId = auth.shopId;
  } else if (auth.role === 'RIDER') {
    where.assignments = { some: { riderId: auth.riderId } };
  } else {
    throw forbidden('Bulk orders are visible to shop, kitchen, rider and platform accounts');
  }

  if (query.status && query.status !== 'ALL') where.status = { in: query.status.split(',') };
  if (query.date) {
    where.deliveryDate = { gte: startOfDay(query.date), lte: endOfDay(query.date) };
  }

  const rows = await db.bulkOrder.findMany({
    where,
    include: BULK_ORDER_INCLUDE,
    orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'desc' }],
  });
  return c.json({ data: rows.map(serializeBulkOrder) });
});

bulk.get('/bulk-orders/:id', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const order = await db.bulkOrder.findUnique({
    where: { id: c.req.param('id') },
    include: BULK_ORDER_INCLUDE,
  });
  if (!order) throw notFound('Bulk order not found');
  if (
    auth.role !== 'PLATFORM_ADMIN' &&
    !(['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) && order.shopId === auth.shopId) &&
    !(auth.role === 'RIDER' && order.assignments.some((assignment) => assignment.riderId === auth.riderId))
  ) {
    throw forbidden('This bulk order is not available to your account');
  }
  return c.json({ data: serializeBulkOrder(order) });
});

bulk.patch('/bulk-orders/:id/status', requireRole('SHOP_OWNER', 'KITCHEN_STAFF', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(
    z.object({
      status: z.enum(['PREPARING', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED']),
      note: z.string().max(240).optional().nullable(),
    }),
    await c.req.json().catch(() => null),
  );
  const order = await db.bulkOrder.findUnique({ where: { id: c.req.param('id') } });
  if (!order) throw notFound('Bulk order not found');
  if (!['PLATFORM_ADMIN', 'SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) || order.shopId !== auth.shopId) {
    if (auth.role !== 'PLATFORM_ADMIN') throw forbidden('This bulk order belongs to another shop');
  }

  const allowed = BULK_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(body.status)) {
    throw badRequest(`Cannot move a bulk order from ${order.status} to ${body.status}`);
  }

  const updated = await db.$transaction(async (tx) => {
    const updatedOrder = await tx.bulkOrder.update({
      where: { id: order.id },
      data: {
        status: body.status,
        ...(body.status === 'DISPATCHED' ? { dispatchedAt: new Date() } : {}),
        ...(body.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: BULK_ORDER_INCLUDE,
    });
    await tx.bulkOrderStatusHistory.create({
      data: {
        bulkOrderId: order.id,
        status: body.status,
        actorUserId: auth.sub ?? null,
        actorRole: auth.role,
        actorName: auth.name,
        note: body.note ?? null,
      },
    });
    if (body.status === 'DISPATCHED') {
      await tx.deliveryAssignment.updateMany({
        where: { bulkOrderId: order.id },
        data: { status: 'OUT_FOR_DELIVERY', outForDeliveryAt: new Date() },
      });
    }
    if (body.status === 'COMPLETED') {
      await tx.deliveryAssignment.updateMany({
        where: { bulkOrderId: order.id },
        data: { status: 'DELIVERED', deliveredAt: new Date(), otpVerified: true },
      });
    }
    return updatedOrder;
  });

  return c.json({ data: serializeBulkOrder(updated) });
});

bulk.post('/bulk-orders/:id/assign-rider', requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(
    z.object({ riderId: z.string().uuid() }),
    await c.req.json().catch(() => null),
  );
  const order = await db.bulkOrder.findUnique({ where: { id: c.req.param('id') } });
  if (!order) throw notFound('Bulk order not found');
  if (auth.role !== 'PLATFORM_ADMIN' && order.shopId !== auth.shopId) throw forbidden();
  if (!['CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
    throw badRequest('Assign a rider before the bulk order is dispatched');
  }
  const rider = await db.rider.findFirst({ where: { id: body.riderId, shopId: order.shopId } });
  if (!rider) throw notFound('Rider not found for this shop');

  const assignment = await db.deliveryAssignment.create({
    data: {
      shopId: order.shopId,
      bulkOrderId: order.id,
      riderId: rider.id,
      status: 'ASSIGNED',
      otpCode: deliveryOtp(),
    },
    include: { rider: true },
  });

  return c.json(
    {
      data: {
        id: assignment.id,
        status: assignment.status,
        otpCode: assignment.otpCode,
        rider: { id: rider.id, name: rider.name, phone: rider.phone },
      },
    },
    201,
  );
});

export default bulk;
