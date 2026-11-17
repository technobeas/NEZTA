import { Hono } from 'hono';
import { z } from 'zod';
import { ORDER_FLOW, ORDER_STATUS_LABELS, ROLES } from '../../constants/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { paged, paginationFrom } from '../../utils/format.js';
import { serializeOrder } from '../../utils/serialize.js';
import { resolveShop } from '../shops/shop-helpers.js';
import {
  assertOrderAccess,
  assignRider,
  createOrderRecord,
  findOrderById,
  orderInclude,
  priceCart,
  updateOrderStatus,
} from './order.service.js';

const orders = new Hono();

const cartItemSchema = z
  .object({
    type: z.enum(['PRODUCT', 'MEAL_BOX']).default('PRODUCT'),
    productId: z.string().uuid().optional().nullable(),
    mealBoxId: z.string().uuid().optional().nullable(),
    quantity: z.coerce.number().int().min(1).max(50).default(1),
    notes: z.string().max(200).optional().nullable(),
    selections: z
      .array(
        z.object({
          optionId: z.string().uuid(),
          valueIds: z.array(z.string().uuid()).max(20),
        }),
      )
      .optional(),
  })
  .refine((item) => (item.type === 'MEAL_BOX' ? Boolean(item.mealBoxId) : Boolean(item.productId)), {
    message: 'Each cart line needs a product or meal box',
  });

const cartSchema = z.object({
  shopId: z.string().uuid().optional(),
  items: z.array(cartItemSchema).min(1, 'Your cart is empty').max(40),
  couponCode: z.string().max(30).optional().nullable(),
});

const deliverySchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(15),
  line1: z.string().min(5).max(160),
  line2: z.string().max(160).optional().nullable(),
  city: z.string().min(2).max(60),
  pincode: z.string().min(4).max(10),
  instructions: z.string().max(300).optional().nullable(),
});

const createOrderSchema = cartSchema.extend({
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'UPI_ON_DELIVERY']).default('CASH_ON_DELIVERY'),
  delivery: deliverySchema,
  addressId: z.string().uuid().optional().nullable(),
  saveAddress: z.boolean().optional(),
  instructions: z.string().max(300).optional().nullable(),
});

/** Price a cart (used by cart + checkout pages so totals always match the server). */
orders.post('/quote', async (c) => {
  const db = c.get('db');
  const body = parseBody(cartSchema, await c.req.json().catch(() => null));
  const shop = await resolveShop(db, body.shopId);
  const priced = await priceCart({ db, shop, items: body.items, couponCode: body.couponCode });
  return c.json({
    data: {
      lines: priced.lines,
      subtotal: priced.subtotal,
      discount: priced.discount,
      deliveryFee: priced.deliveryFee,
      total: priced.total,
      coupon: priced.coupon,
      freeDeliveryAbove: priced.freeDeliveryAbove,
      minOrderValue: priced.minOrderValue,
      shop: { id: shop.id, name: shop.name, slug: shop.slug },
    },
  });
});

/** Place an order. Only customers can check out in this demo. */
orders.post('/', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (auth.role !== 'CUSTOMER' || !auth.customerId) {
    throw forbidden('Sign in with the demo customer account to place an order');
  }
  const body = parseBody(createOrderSchema, await c.req.json().catch(() => null));
  const shop = await resolveShop(db, body.shopId);
  const customer = await db.customer.findUnique({ where: { id: auth.customerId } });
  if (!customer) throw notFound('Customer profile is missing');

  const priced = await priceCart({ db, shop, items: body.items, couponCode: body.couponCode });

  let delivery = body.delivery;
  if (body.addressId) {
    const address = await db.customerAddress.findFirst({
      where: { id: body.addressId, customerId: customer.id },
    });
    if (!address) throw notFound('Saved address not found');
    delivery = {
      name: address.receiverName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      pincode: address.pincode,
      instructions: delivery?.instructions ?? null,
    };
  }

  const order = await createOrderRecord({
    db,
    shop,
    customer,
    priced,
    paymentMethod: body.paymentMethod,
    delivery,
    instructions: body.instructions ?? delivery.instructions ?? null,
    actor: auth,
  });

  if (body.saveAddress) {
    const existing = await db.customerAddress.findFirst({
      where: { customerId: customer.id, line1: delivery.line1, pincode: delivery.pincode },
    });
    if (!existing) {
      await db.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
          receiverName: delivery.name,
          phone: delivery.phone,
          line1: delivery.line1,
          line2: delivery.line2 ?? null,
          city: delivery.city,
          pincode: delivery.pincode,
          isDefault: false,
        },
      });
    }
  }

  return c.json({ data: serializeOrder(order) }, 201);
});

/** Order table for shop / kitchen / rider / platform / customer views. */
orders.get('/', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const query = parseQuery(
    z.object({
      status: z.string().optional(),
      source: z.enum(['NORMAL', 'SUBSCRIPTION', 'BULK']).optional(),
      search: z.string().max(80).optional(),
      date: z.string().optional(),
      page: z.string().optional(),
      pageSize: z.string().optional(),
      active: z.enum(['true', 'false']).optional(),
      shopId: z.string().uuid().optional(),
    }),
    c.req.query(),
  );

  const where = {};
  if (auth.role === 'CUSTOMER') {
    where.customerId = auth.customerId;
  } else if (auth.role === 'RIDER') {
    where.riderId = auth.riderId;
  } else if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role)) {
    where.shopId = auth.shopId;
  } else if (auth.role === 'PLATFORM_ADMIN') {
    if (query.shopId) where.shopId = query.shopId;
  }

  if (query.status && query.status !== 'ALL') {
    where.status = { in: query.status.split(',').filter(Boolean) };
  }
  if (query.source) where.source = query.source;
  if (query.active === 'true') {
    where.status = {
      in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
    };
  }
  if (query.date) {
    const start = new Date(`${query.date}T00:00:00`);
    const end = new Date(`${query.date}T23:59:59.999`);
    where.placedAt = { gte: start, lte: end };
  }
  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const pagination = paginationFrom(query);
  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: true,
        customer: true,
        rider: true,
        shop: true,
        assignment: true,
        subscription: { include: { plan: true } },
        bulkOrder: true,
      },
      orderBy: [{ placedAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    db.order.count({ where }),
  ]);

  return c.json(
    paged(
      rows.map((order) => serializeOrder(order, { includeDetails: true })),
      total,
      pagination,
    ),
  );
});

/** Statuses + labels used by every dashboard. */
orders.get('/meta', (c) =>
  c.json({
    data: {
      flow: ORDER_FLOW,
      labels: ORDER_STATUS_LABELS,
      statuses: Object.keys(ORDER_STATUS_LABELS),
    },
  }),
);

/** Public-by-number tracking used by the confirmation page. */
orders.get('/track/:orderNumber', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const order = await db.order.findUnique({
    where: { orderNumber: c.req.param('orderNumber') },
    include: orderInclude(),
  });
  if (!order) throw notFound('No order matches that number');
  assertOrderAccess(order, auth);
  return c.json({ data: serializeOrder(order) });
});

orders.get('/:id', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const order = await findOrderById(db, c.req.param('id'));
  if (!order) throw notFound('Order not found');
  assertOrderAccess(order, auth);
  return c.json({ data: serializeOrder(order) });
});

const statusSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'REJECTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'RIDER_ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'DELIVERY_FAILED',
  ]),
  note: z.string().max(240).optional().nullable(),
});

orders.post('/:id/status', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(statusSchema, await c.req.json().catch(() => null));
  const order = await findOrderById(db, c.req.param('id'));
  if (!order) throw notFound('Order not found');
  assertOrderAccess(order, auth);

  if (body.status === 'RIDER_ASSIGNED') {
    throw badRequest('Use the assign rider action to attach a rider');
  }
  const updated = await updateOrderStatus({
    db,
    order,
    nextStatus: body.status,
    actor: auth,
    note: body.note ?? null,
  });
  return c.json({ data: serializeOrder(updated) });
});

const assignSchema = z.object({ riderId: z.string().uuid() });

orders.post('/:id/assign-rider', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (![ROLES.SHOP_OWNER, ROLES.PLATFORM_ADMIN].includes(auth.role)) {
    throw forbidden('Only the shop owner can assign a rider');
  }
  const body = parseBody(assignSchema, await c.req.json().catch(() => null));
  const order = await findOrderById(db, c.req.param('id'));
  if (!order) throw notFound('Order not found');
  assertOrderAccess(order, auth);

  const updated = await assignRider({ db, order, riderId: body.riderId, actor: auth });
  return c.json({ data: serializeOrder(updated) });
});

export default orders;
