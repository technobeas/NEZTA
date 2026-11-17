import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { money, startOfDay, endOfDay } from '../../utils/format.js';
import { serializeAssignment, serializeOrder } from '../../utils/serialize.js';
import { findOrderById, orderInclude, updateOrderStatus } from '../orders/order.service.js';

const delivery = new Hono();

const ASSIGNMENT_INCLUDE = {
  rider: true,
  order: { include: orderInclude() },
  bulkOrder: { include: { items: true } },
};

async function loadAssignment(c) {
  const auth = requireAuth(c);
  const db = c.get('db');
  const assignment = await db.deliveryAssignment.findUnique({
    where: { id: c.req.param('id') },
    include: ASSIGNMENT_INCLUDE,
  });
  if (!assignment) throw notFound('Delivery assignment not found');
  if (auth.role === 'RIDER' && assignment.riderId !== auth.riderId) {
    throw forbidden('This delivery is assigned to another rider');
  }
  if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role) && assignment.shopId !== auth.shopId) {
    throw forbidden('This delivery belongs to another shop');
  }
  return assignment;
}

function serializeAssignmentCard(assignment) {
  const order = assignment.order;
  return {
    id: assignment.id,
    status: assignment.status,
    otpCode: assignment.status === 'DELIVERED' ? assignment.otpCode : assignment.otpCode,
    otpVerified: assignment.otpVerified,
    assignedAt: assignment.assignedAt,
    acceptedAt: assignment.acceptedAt,
    pickedUpAt: assignment.pickedUpAt,
    outForDeliveryAt: assignment.outForDeliveryAt,
    deliveredAt: assignment.deliveredAt,
    failureReason: assignment.failureReason,
    rider: { id: assignment.rider.id, name: assignment.rider.name, phone: assignment.rider.phone },
    kind: order ? 'ORDER' : 'BULK',
    order: order ? serializeOrder(order) : null,
    bulkOrder: assignment.bulkOrder
      ? {
          id: assignment.bulkOrder.id,
          bulkOrderNumber: assignment.bulkOrder.bulkOrderNumber,
          organizationName: assignment.bulkOrder.organizationName,
          contactPerson: assignment.bulkOrder.contactPerson,
          phone: assignment.bulkOrder.phone,
          deliveryAddress: assignment.bulkOrder.deliveryAddress,
          deliveryDate: assignment.bulkOrder.deliveryDate,
          deliveryTime: assignment.bulkOrder.deliveryTime,
          quantity: assignment.bulkOrder.quantity,
          packageName: assignment.bulkOrder.packageName,
          status: assignment.bulkOrder.status,
          total: money(assignment.bulkOrder.total),
          notes: assignment.bulkOrder.notes,
        }
      : null,
  };
}

delivery.get('/assignments', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const query = parseQuery(
    z.object({ status: z.string().optional(), date: z.string().optional() }),
    c.req.query(),
  );

  const where = {};
  if (auth.role === 'RIDER') where.riderId = auth.riderId;
  else if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(auth.role)) where.shopId = auth.shopId;
  else if (auth.role !== 'PLATFORM_ADMIN') throw forbidden();

  if (query.status && query.status !== 'ALL') where.status = { in: query.status.split(',') };
  if (query.date) {
    where.assignedAt = { gte: startOfDay(query.date), lte: endOfDay(query.date) };
  }

  const rows = await db.deliveryAssignment.findMany({
    where,
    include: ASSIGNMENT_INCLUDE,
    orderBy: { assignedAt: 'desc' },
  });

  return c.json({ data: rows.map(serializeAssignmentCard) });
});

delivery.get('/summary', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (auth.role !== 'RIDER' || !auth.riderId) throw forbidden('Rider access only');
  const today = startOfDay();

  const [assigned, active, completedToday, failedToday] = await Promise.all([
    db.deliveryAssignment.count({ where: { riderId: auth.riderId, status: 'ASSIGNED' } }),
    db.deliveryAssignment.count({
      where: { riderId: auth.riderId, status: { in: ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } },
    }),
    db.deliveryAssignment.count({
      where: { riderId: auth.riderId, status: 'DELIVERED', deliveredAt: { gte: today } },
    }),
    db.deliveryAssignment.count({
      where: { riderId: auth.riderId, status: 'FAILED', updatedAt: { gte: today } },
    }),
  ]);

  const rider = await db.rider.findUnique({ where: { id: auth.riderId } });
  return c.json({
    data: {
      rider: rider ? { id: rider.id, name: rider.name, vehicleType: rider.vehicleType } : null,
      assigned,
      active,
      completedToday,
      failedToday,
    },
  });
});

delivery.post('/assignments/:id/accept', requireRole('RIDER'), async (c) => {
  const db = c.get('db');
  const assignment = await loadAssignment(c);
  if (assignment.status !== 'ASSIGNED') throw badRequest('This delivery has already been accepted');
  const updated = await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
    include: ASSIGNMENT_INCLUDE,
  });
  return c.json({ data: serializeAssignmentCard(updated) });
});

delivery.post('/assignments/:id/pickup', requireRole('RIDER', 'SHOP_OWNER'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const assignment = await loadAssignment(c);
  if (!['ASSIGNED', 'ACCEPTED'].includes(assignment.status)) {
    throw badRequest('This delivery cannot be picked up in its current state');
  }

  if (assignment.order) {
    let order = await findOrderById(db, assignment.order.id);
    // Older assignments can exist while the order still sits at READY_FOR_PICKUP
    // (seeded data, or a rider picked up before the shop advanced the ticket).
    // Catch the order up to RIDER_ASSIGNED so the pickup itself stays a no-op retry.
    if (['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status)) {
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'RIDER_ASSIGNED' } });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'RIDER_ASSIGNED',
            actorUserId: auth.sub ?? null,
            actorRole: auth.role ?? null,
            actorName: auth.name ?? null,
            note: 'Rider assigned at pickup',
          },
        });
      });
      order = await findOrderById(db, order.id);
    }
    const updatedOrder = await updateOrderStatus({
      db,
      order,
      nextStatus: 'PICKED_UP',
      actor: auth,
      note: 'Rider picked up the order',
    });
    const refreshed = await db.deliveryAssignment.findUnique({
      where: { id: assignment.id },
      include: ASSIGNMENT_INCLUDE,
    });
    return c.json({ data: serializeAssignmentCard(refreshed), order: serializeOrder(updatedOrder) });
  }

  const updated = await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: { status: 'PICKED_UP', pickedUpAt: new Date(), acceptedAt: assignment.acceptedAt ?? new Date() },
    include: ASSIGNMENT_INCLUDE,
  });
  return c.json({ data: serializeAssignmentCard(updated) });
});

delivery.post('/assignments/:id/out-for-delivery', requireRole('RIDER', 'SHOP_OWNER'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const assignment = await loadAssignment(c);
  if (assignment.status !== 'PICKED_UP') throw badRequest('Mark the delivery picked up first');

  if (assignment.order) {
    const order = await findOrderById(db, assignment.order.id);
    const updatedOrder = await updateOrderStatus({
      db,
      order,
      nextStatus: 'OUT_FOR_DELIVERY',
      actor: auth,
      note: 'Rider is on the way',
    });
    const refreshed = await db.deliveryAssignment.findUnique({
      where: { id: assignment.id },
      include: ASSIGNMENT_INCLUDE,
    });
    return c.json({ data: serializeAssignmentCard(refreshed), order: serializeOrder(updatedOrder) });
  }

  const updated = await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: { status: 'OUT_FOR_DELIVERY', outForDeliveryAt: new Date() },
    include: ASSIGNMENT_INCLUDE,
  });
  return c.json({ data: serializeAssignmentCard(updated) });
});

/** Demo delivery completion using a 4 digit confirmation code (no real OTP service). */
delivery.post('/assignments/:id/deliver', requireRole('RIDER', 'SHOP_OWNER'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(
    z.object({ otp: z.string().min(4).max(6) }),
    await c.req.json().catch(() => null),
  );
  const assignment = await loadAssignment(c);
  if (!['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(assignment.status)) {
    throw badRequest('Start the delivery before confirming it');
  }
  if (String(assignment.otpCode) !== String(body.otp)) {
    throw badRequest('That confirmation code does not match');
  }

  if (assignment.order) {
    const order = await findOrderById(db, assignment.order.id);
    const updatedOrder = await updateOrderStatus({
      db,
      order,
      nextStatus: 'DELIVERED',
      actor: auth,
      note: 'Delivered and confirmed with demo code',
    });
    const refreshed = await db.deliveryAssignment.findUnique({
      where: { id: assignment.id },
      include: ASSIGNMENT_INCLUDE,
    });
    return c.json({ data: serializeAssignmentCard(refreshed), order: serializeOrder(updatedOrder) });
  }

  const updated = await db.$transaction(async (tx) => {
    const record = await tx.deliveryAssignment.update({
      where: { id: assignment.id },
      data: { status: 'DELIVERED', deliveredAt: new Date(), otpVerified: true },
      include: ASSIGNMENT_INCLUDE,
    });
    if (assignment.bulkOrderId) {
      await tx.bulkOrder.update({
        where: { id: assignment.bulkOrderId },
        data: { status: 'COMPLETED', completedAt: new Date(), dispatchedAt: new Date() },
      });
      await tx.bulkOrderStatusHistory.create({
        data: {
          bulkOrderId: assignment.bulkOrderId,
          status: 'COMPLETED',
          actorUserId: auth.sub ?? null,
          actorRole: auth.role,
          actorName: auth.name,
          note: 'Bulk delivery confirmed by rider',
        },
      });
    }
    return record;
  });
  return c.json({ data: serializeAssignmentCard(updated) });
});

delivery.post('/assignments/:id/fail', requireRole('RIDER', 'SHOP_OWNER'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const body = parseBody(
    z.object({ reason: z.string().min(3).max(240) }),
    await c.req.json().catch(() => null),
  );
  const assignment = await loadAssignment(c);
  if (['DELIVERED', 'FAILED'].includes(assignment.status)) {
    throw badRequest('This delivery is already closed');
  }

  if (assignment.order) {
    const order = await findOrderById(db, assignment.order.id);
    await updateOrderStatus({
      db,
      order,
      nextStatus: 'DELIVERY_FAILED',
      actor: auth,
      note: body.reason,
    });
    const refreshed = await db.deliveryAssignment.findUnique({
      where: { id: assignment.id },
      include: ASSIGNMENT_INCLUDE,
    });
    return c.json({ data: serializeAssignmentCard(refreshed) });
  }

  const updated = await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: { status: 'FAILED', failureReason: body.reason },
    include: ASSIGNMENT_INCLUDE,
  });
  return c.json({ data: serializeAssignmentCard(updated) });
});

export default delivery;
