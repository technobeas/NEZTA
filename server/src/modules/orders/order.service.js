import { ORDER_TRANSITIONS, TRANSITION_ROLES, CUSTOMER_CANCELLABLE } from '../../constants/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import { money, round } from '../../utils/format.js';
import { orderNumber } from '../../utils/ids.js';
import { deliveryOtp } from '../../utils/ids.js';

const ORDER_INCLUDE = {
  items: { include: { customizations: true }, orderBy: { id: 'asc' } },
  history: { orderBy: { createdAt: 'asc' } },
  customer: true,
  rider: true,
  shop: true,
  assignment: { include: { rider: true } },
  subscription: { include: { plan: true } },
  bulkOrder: true,
};

export function orderInclude() {
  return ORDER_INCLUDE;
}

export async function findOrderById(db, orderId) {
  return db.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
}

export async function findOrderForActor(db, orderId, auth) {
  const order = await findOrderById(db, orderId);
  if (!order) throw notFound('Order not found');
  assertOrderAccess(order, auth);
  return order;
}

export function assertOrderAccess(order, auth) {
  const role = auth.role;
  if (role === 'PLATFORM_ADMIN') return;
  if (role === 'CUSTOMER' && order.customerId === auth.customerId) return;
  if (['SHOP_OWNER', 'KITCHEN_STAFF'].includes(role) && order.shopId === auth.shopId) return;
  if (role === 'RIDER' && auth.riderId) {
    if (order.riderId === auth.riderId || order.assignment?.riderId === auth.riderId) return;
  }
  throw forbidden('This order belongs to another account');
}

/**
 * Prices a cart entirely from database values — client prices are never trusted.
 * Validates meal box option rules and returns a priced breakdown ready for display
 * or persistence.
 */
export async function priceCart({ db, shop, items, couponCode }) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('Your cart is empty');
  if (items.length > 40) throw badRequest('That is too many line items for one order');

  const productIds = items.filter((item) => item.type !== 'MEAL_BOX').map((item) => item.productId);
  const mealBoxIds = items.filter((item) => item.type === 'MEAL_BOX').map((item) => item.mealBoxId);

  const [products, mealBoxes, settings] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds.filter(Boolean) }, shopId: shop.id } }),
    db.mealBox.findMany({
      where: { id: { in: mealBoxIds.filter(Boolean) }, shopId: shop.id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        options: { orderBy: { sortOrder: 'asc' }, include: { values: { orderBy: { sortOrder: 'asc' } } } },
      },
    }),
    db.shopSetting.findUnique({ where: { shopId: shop.id } }),
  ]);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const mealBoxMap = new Map(mealBoxes.map((mealBox) => [mealBox.id, mealBox]));

  const lines = [];
  let subtotal = 0;

  for (const line of items) {
    const quantity = Math.min(50, Math.max(1, Number(line.quantity) || 1));

    if (line.type === 'MEAL_BOX') {
      const mealBox = mealBoxMap.get(line.mealBoxId);
      if (!mealBox) throw badRequest('One of the meal boxes is no longer available');
      if (!mealBox.isAvailable) throw conflict(`${mealBox.name} is temporarily unavailable`);

      const selections = Array.isArray(line.selections) ? line.selections : [];
      const customizations = [];
      let unitPrice = money(mealBox.basePrice);

      for (const option of mealBox.options) {
        const selection = selections.find((entry) => entry.optionId === option.id);
        const requestedIds = Array.isArray(selection?.valueIds) ? selection.valueIds : [];
        const chosenValues = requestedIds
          .map((valueId) => option.values.find((value) => value.id === valueId))
          .filter(Boolean);

        if (chosenValues.length !== requestedIds.length) {
          throw badRequest(`An invalid choice was sent for ${option.label}`);
        }
        const count = chosenValues.length;
        if (option.isRequired && count < Math.max(1, option.minSelect)) {
          throw badRequest(`Choose ${option.minSelect} option for ${option.label}`);
        }
        if (count > option.maxSelect) {
          throw badRequest(`Choose at most ${option.maxSelect} option(s) for ${option.label}`);
        }
        if (option.type !== 'ADDON' && count < option.minSelect) {
          throw badRequest(`Choose ${option.minSelect} option(s) for ${option.label}`);
        }

        for (const value of chosenValues) {
          const delta = money(value.priceDelta);
          unitPrice = round(unitPrice + delta);
          customizations.push({
            groupLabel: option.label,
            optionLabel: option.label,
            valueLabel: value.label,
            quantity: 1,
            priceDelta: delta,
          });
        }
      }

      const summary = customizations.length
        ? customizations.map((entry) => `${entry.groupLabel}: ${entry.valueLabel}`).join(' • ')
        : 'No customization';

      lines.push({
        itemType: 'MEAL_BOX',
        productId: null,
        mealBoxId: mealBox.id,
        name: mealBox.name,
        description: mealBox.description ?? undefined,
        unitPrice,
        quantity,
        lineTotal: round(unitPrice * quantity),
        customizationSummary: summary,
        notes: line.notes ?? null,
        customizations,
      });
      subtotal = round(subtotal + unitPrice * quantity);
      continue;
    }

    const product = productMap.get(line.productId);
    if (!product) throw badRequest('One of the items is no longer available');
    if (!product.isAvailable) throw conflict(`${product.name} is temporarily unavailable`);

    lines.push({
      itemType: 'PRODUCT',
      productId: product.id,
      mealBoxId: null,
      name: product.name,
      description: product.description ?? undefined,
      unitPrice: money(product.price),
      quantity,
      lineTotal: round(money(product.price) * quantity),
      customizationSummary: null,
      notes: line.notes ?? null,
      customizations: [],
    });
    subtotal = round(subtotal + money(product.price) * quantity);
  }

  const minOrder = money(settings?.minOrderValue ?? 99);
  if (subtotal < minOrder) {
    throw badRequest(`Minimum order value for ${shop.name} is ₹${minOrder}`);
  }

  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await db.coupon.findFirst({
      where: { shopId: shop.id, code: String(couponCode).toUpperCase(), isActive: true },
    });
    if (!coupon) throw badRequest('That coupon code is not valid');
    if (subtotal < money(coupon.minOrderValue)) {
      throw badRequest(`Coupon ${coupon.code} needs a minimum order of ₹${money(coupon.minOrderValue)}`);
    }
    discount =
      coupon.type === 'PERCENT'
        ? round((subtotal * money(coupon.value)) / 100)
        : Math.min(subtotal, money(coupon.value));
    if (coupon.maxDiscount) discount = Math.min(discount, money(coupon.maxDiscount));
    appliedCoupon = { code: coupon.code, description: coupon.description, discount };
  }

  const deliveryFeeBase = money(settings?.deliveryFee ?? 30);
  const freeAbove = money(settings?.freeDeliveryAbove ?? 499);
  const deliveryFee = subtotal >= freeAbove ? 0 : deliveryFeeBase;
  const total = round(subtotal - discount + deliveryFee);

  return {
    lines,
    subtotal,
    discount,
    deliveryFee,
    total,
    coupon: appliedCoupon,
    freeDeliveryAbove: freeAbove,
    minOrderValue: minOrder,
  };
}

export async function createOrderRecord({
  db,
  shop,
  customer,
  priced,
  paymentMethod = 'CASH_ON_DELIVERY',
  delivery,
  instructions,
  source = 'NORMAL',
  subscriptionId = null,
  bulkOrderId = null,
  scheduledFor = null,
  actor = null,
  paymentStatus = 'PENDING',
}) {
  if (!delivery?.name || !delivery?.phone || !delivery?.line1 || !delivery?.pincode) {
    throw badRequest('Delivery name, phone, address and pincode are required');
  }

  const attempt = async (number) =>
    db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: number,
          shopId: shop.id,
          customerId: customer.id,
          source,
          status: 'NEW',
          subtotal: priced.subtotal,
          discount: priced.discount,
          deliveryFee: priced.deliveryFee,
          total: priced.total,
          couponCode: priced.coupon?.code ?? null,
          paymentMethod,
          paymentStatus,
          deliveryName: delivery.name,
          deliveryPhone: delivery.phone,
          deliveryLine1: delivery.line1,
          deliveryLine2: delivery.line2 ?? null,
          deliveryCity: delivery.city ?? shop.city ?? 'Pune',
          deliveryPincode: delivery.pincode,
          deliveryInstructions: instructions ?? null,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          subscriptionId: subscriptionId ?? null,
          bulkOrderId: bulkOrderId ?? null,
          items: {
            create: priced.lines.map((line) => ({
              itemType: line.itemType,
              productId: line.productId,
              mealBoxId: line.mealBoxId,
              name: line.name,
              description: line.description ?? null,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
              customizationSummary: line.customizationSummary,
              notes: line.notes,
              customizations: line.customizations?.length
                ? {
                    create: line.customizations.map((customization) => ({
                      groupLabel: customization.groupLabel,
                      optionLabel: customization.optionLabel,
                      valueLabel: customization.valueLabel,
                      quantity: customization.quantity,
                      priceDelta: customization.priceDelta,
                    })),
                  }
                : undefined,
            })),
          },
          history: {
            create: {
              status: 'NEW',
              actorUserId: actor?.sub ?? null,
              actorRole: actor?.role ?? null,
              actorName: actor?.name ?? customer.name,
              note: source === 'SUBSCRIPTION' ? 'Generated from tiffin subscription' : 'Order placed by customer',
            },
          },
        },
        include: ORDER_INCLUDE,
      });
      return order;
    });

  let lastError;
  for (let index = 0; index < 4; index += 1) {
    try {
      return await attempt(orderNumber(source === 'SUBSCRIPTION' ? 'NZTS' : 'NZ'));
    } catch (error) {
      lastError = error;
      if (error?.code !== 'P2002') throw error;
    }
  }
  throw lastError;
}

export async function updateOrderStatus({ db, order, nextStatus, actor, note }) {
  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw badRequest(`Cannot move an order from ${order.status} to ${nextStatus}`);
  }
  const permittedRoles = TRANSITION_ROLES[nextStatus] ?? [];
  if (!permittedRoles.includes(actor.role)) {
    throw forbidden(`A ${actor.role.toLowerCase().replace(/_/g, ' ')} cannot set this order to ${nextStatus}`);
  }
  if (actor.role === 'CUSTOMER' && nextStatus === 'CANCELLED') {
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw badRequest('This order can no longer be cancelled — please call the shop');
    }
  }

  return db.$transaction(async (tx) => {
    const data = {
      status: nextStatus,
      ...(nextStatus === 'DELIVERED' ? { deliveredAt: new Date(), paymentStatus: 'SIMULATED_PAID' } : {}),
    };
    await tx.order.update({ where: { id: order.id }, data });

    if (order.assignment) {
      const now = new Date();
      const assignmentData =
        nextStatus === 'DELIVERED'
          ? { status: 'DELIVERED', deliveredAt: now, otpVerified: true }
          : nextStatus === 'PICKED_UP'
            ? { status: 'PICKED_UP', pickedUpAt: now, acceptedAt: order.assignment.acceptedAt ?? now }
            : nextStatus === 'OUT_FOR_DELIVERY'
              ? { status: 'OUT_FOR_DELIVERY', outForDeliveryAt: now }
              : nextStatus === 'DELIVERY_FAILED'
                ? { status: 'FAILED', failureReason: note ?? 'Delivery failed' }
                : {};
      if (Object.keys(assignmentData).length) {
        await tx.deliveryAssignment.update({ where: { id: order.assignment.id }, data: assignmentData });
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: nextStatus,
        actorUserId: actor.sub ?? null,
        actorRole: actor.role ?? null,
        actorName: actor.name ?? null,
        note: note ?? null,
      },
    });

    return tx.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
  });
}

/** Manual rider assignment from the shop dashboard (MVP scope). */
export async function assignRider({ db, order, riderId, actor }) {
  if (!['READY_FOR_PICKUP', 'CONFIRMED', 'PREPARING'].includes(order.status)) {
    throw badRequest('Assign a rider once the order is ready for pickup');
  }
  const rider = await db.rider.findFirst({ where: { id: riderId, shopId: order.shopId } });
  if (!rider) throw notFound('Rider not found for this shop');
  if (!rider.isAvailable) throw conflict(`${rider.name} is currently unavailable`);

  return db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { riderId: rider.id, status: 'RIDER_ASSIGNED' },
    });

    const existing = await tx.deliveryAssignment.findUnique({ where: { orderId: order.id } });
    if (existing) {
      await tx.deliveryAssignment.update({
        where: { id: existing.id },
        data: { riderId: rider.id, status: 'ASSIGNED', otpCode: deliveryOtp(), otpVerified: false },
      });
    } else {
      await tx.deliveryAssignment.create({
        data: {
          shopId: order.shopId,
          orderId: order.id,
          riderId: rider.id,
          status: 'ASSIGNED',
          otpCode: deliveryOtp(),
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'RIDER_ASSIGNED',
        actorUserId: actor.sub ?? null,
        actorRole: actor.role ?? null,
        actorName: actor.name ?? null,
        note: `Assigned to ${rider.name}`,
      },
    });

    return tx.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
  });
}
