import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { addDays, endOfDay, money, round, startOfDay, toDateOnly } from '../../utils/format.js';
import { serializeCustomer, serializeOrder } from '../../utils/serialize.js';
import { getCommissionRate, getDefaultShop, resolveShop } from './shop-helpers.js';

const shopRoutes = new Hono();

/** Public storefront profile. */
shopRoutes.get('/public', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const [categories, products, mealBoxes, plans, coupons, ordersToday, orderCount] = await Promise.all([
    db.category.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    db.product.findMany({
      where: { shopId: shop.id, isAvailable: true },
      include: { category: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      take: 8,
    }),
    db.mealBox.count({ where: { shopId: shop.id, isAvailable: true } }),
    db.tiffinPlan.findMany({ where: { shopId: shop.id, isAvailable: true }, orderBy: { sortOrder: 'asc' } }),
    db.coupon.findMany({ where: { shopId: shop.id, isActive: true } }),
    db.order.count({ where: { shopId: shop.id, placedAt: { gte: startOfDay() } } }),
    db.order.count({ where: { shopId: shop.id } }),
  ]);

  return c.json({
    data: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      tagline: shop.tagline,
      description: shop.description,
      logoUrl: shop.logoUrl,
      bannerUrl: shop.bannerUrl,
      phone: shop.phone,
      email: shop.email,
      address: [shop.addressLine, shop.city, shop.pincode].filter(Boolean).join(', '),
      city: shop.city,
      rating: money(shop.rating),
      ratingCount: shop.ratingCount,
      status: shop.status,
      settings: shop.settings
        ? {
            deliveryFee: money(shop.settings.deliveryFee),
            freeDeliveryAbove: money(shop.settings.freeDeliveryAbove),
            minOrderValue: money(shop.settings.minOrderValue),
            openingTime: shop.settings.openingTime,
            closingTime: shop.settings.closingTime,
            isAcceptingOrders: shop.settings.isAcceptingOrders,
          }
        : null,
      isOpen: isOpenNow(shop.settings),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        productCount: category._count.products,
      })),
      featuredProducts: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageUrl,
        price: money(product.price),
        categoryName: product.category?.name ?? null,
        isVeg: product.isVeg,
        isAvailable: product.isAvailable,
      })),
      mealBoxCount: mealBoxes,
      tiffinPlans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        planType: plan.planType,
        durationDays: plan.durationDays,
        price: money(plan.price),
        mealType: plan.mealType,
        deliveryWindow: plan.deliveryWindow,
        savingsNote: plan.savingsNote,
      })),
      coupons: coupons.map((coupon) => ({
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: money(coupon.value),
        minOrderValue: money(coupon.minOrderValue),
        maxDiscount: coupon.maxDiscount ? money(coupon.maxDiscount) : null,
      })),
      stats: { ordersToday, orderCount },
      demoData: true,
    },
  });
});

function isOpenNow(settings) {
  if (!settings?.isAcceptingOrders) return false;
  const now = new Date();
  const [openHour, openMinute] = String(settings.openingTime ?? '10:00').split(':').map(Number);
  const [closeHour, closeMinute] = String(settings.closingTime ?? '22:00').split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= openHour * 60 + openMinute && minutes <= closeHour * 60 + closeMinute;
}

/** Shop dashboard overview with demo analytics. */
shopRoutes.get('/overview', requireRole('SHOP_OWNER', 'KITCHEN_STAFF', 'PLATFORM_ADMIN'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const last7 = startOfDay(addDays(new Date(), -6));

  const [
    todaysOrders,
    pendingOrders,
    preparingOrders,
    completedToday,
    totalCustomers,
    activeSubscriptions,
    upcomingDeliveries,
    pendingEnquiries,
    confirmedBulk,
    recentOrders,
    weekOrders,
    topItems,
    subscriptionPlans,
  ] = await Promise.all([
    db.order.count({ where: { shopId: shop.id, placedAt: { gte: todayStart, lte: todayEnd } } }),
    db.order.count({ where: { shopId: shop.id, status: 'NEW' } }),
    db.order.count({ where: { shopId: shop.id, status: { in: ['PREPARING', 'CONFIRMED'] } } }),
    db.order.count({ where: { shopId: shop.id, status: 'DELIVERED', deliveredAt: { gte: todayStart } } }),
    db.customer.count({ where: { shopId: shop.id } }),
    db.subscription.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
    db.subscriptionOrder.count({
      where: {
        deliveryDate: { gte: todayStart, lte: addDays(todayStart, 7) },
        subscription: { shopId: shop.id, status: 'ACTIVE' },
      },
    }),
    db.bulkOrderEnquiry.count({ where: { shopId: shop.id, status: { in: ['ENQUIRY_RECEIVED', 'QUOTATION_SENT'] } } }),
    db.bulkOrder.count({ where: { shopId: shop.id, status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED'] } } }),
    db.order.findMany({
      where: { shopId: shop.id },
      include: { customer: true, items: true, shop: true },
      orderBy: { placedAt: 'desc' },
      take: 8,
    }),
    db.order.findMany({
      where: { shopId: shop.id, placedAt: { gte: last7 }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { placedAt: true, total: true, source: true },
    }),
    db.orderItem.groupBy({
      by: ['name'],
      where: { order: { shopId: shop.id, placedAt: { gte: last7 } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    db.tiffinPlan.findMany({ where: { shopId: shop.id }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const todaySalesRows = await db.order.findMany({
    where: {
      shopId: shop.id,
      placedAt: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: { total: true },
  });

  const trendMap = new Map();
  for (let index = 6; index >= 0; index -= 1) {
    trendMap.set(toDateOnly(addDays(new Date(), -index)), { orders: 0, revenue: 0 });
  }
  for (const order of weekOrders) {
    const key = toDateOnly(order.placedAt);
    if (!trendMap.has(key)) continue;
    const entry = trendMap.get(key);
    entry.orders += 1;
    entry.revenue = round(entry.revenue + money(order.total));
  }

  const statusBreakdown = await db.order.groupBy({
    by: ['status'],
    where: { shopId: shop.id, placedAt: { gte: last7 } },
    _count: { _all: true },
  });

  return c.json({
    data: {
      demoData: true,
      shop: { id: shop.id, name: shop.name, slug: shop.slug },
      metrics: {
        todaysOrders,
        pendingOrders,
        preparingOrders,
        completedToday,
        todaysSales: round(todaySalesRows.reduce((sum, order) => sum + money(order.total), 0)),
        totalCustomers,
        activeSubscriptions,
        upcomingSubscriptionDeliveries: upcomingDeliveries,
        pendingBulkEnquiries: pendingEnquiries,
        confirmedBulkOrders: confirmedBulk,
      },
      salesTrend: [...trendMap.entries()].map(([date, value]) => ({ date, ...value })),
      statusBreakdown: statusBreakdown.map((entry) => ({ status: entry.status, count: entry._count._all })),
      topProducts: topItems.map((item) => ({ name: item.name, quantity: item._sum.quantity ?? 0 })),
      recentOrders: recentOrders.map((order) => serializeOrder(order)),
      plans: subscriptionPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        planType: plan.planType,
        price: money(plan.price),
        durationDays: plan.durationDays,
      })),
    },
  });
});

/** Illustrative financial summary (never actual settlement data). */
shopRoutes.get('/finance', requireRole('SHOP_OWNER', 'PLATFORM_ADMIN'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const platformCommission = await getCommissionRate(db);
  const commissionRate = shop.commissionRate ? money(shop.commissionRate) : platformCommission;

  const [delivered, pending, subscriptionSales, bulkSales, orderRows] = await Promise.all([
    db.order.aggregate({
      where: { shopId: shop.id, status: 'DELIVERED' },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.order.aggregate({
      where: { shopId: shop.id, status: { in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.subscription.aggregate({
      where: { shopId: shop.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    db.bulkOrder.aggregate({
      where: { shopId: shop.id, status: { not: 'CANCELLED' } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.order.findMany({
      where: { shopId: shop.id, placedAt: { gte: startOfDay(addDays(new Date(), -29)) } },
      select: { placedAt: true, total: true, status: true },
      orderBy: { placedAt: 'asc' },
    }),
  ]);

  const grossSales = round(money(delivered._sum.total) + money(subscriptionSales._sum.totalPrice) + money(bulkSales._sum.total));
  const commission = round((grossSales * commissionRate) / 100);
  const shopEarnings = round(grossSales - commission);
  const pendingSettlement = round((money(delivered._sum.total) * (100 - commissionRate)) / 100);

  const dailyMap = new Map();
  for (const order of orderRows) {
    if (['CANCELLED', 'REJECTED'].includes(order.status)) continue;
    const key = toDateOnly(order.placedAt);
    dailyMap.set(key, round((dailyMap.get(key) ?? 0) + money(order.total)));
  }

  return c.json({
    data: {
      demoData: true,
      illustrative: true,
      note: 'Illustrative demo estimates only — not actual settlements or payouts.',
      commissionRate,
      platformDefaultCommissionRate: platformCommission,
      grossSales,
      commission,
      shopEarnings,
      pendingSettlement,
      deliveredOrders: delivered._count._all,
      pendingOrders: pending._count._all,
      pendingOrderValue: money(pending._sum.total),
      subscriptionSales: money(subscriptionSales._sum.totalPrice),
      subscriptionCount: subscriptionSales._count._all,
      bulkSales: money(bulkSales._sum.total),
      bulkOrderCount: bulkSales._count._all,
      dailySales: [...dailyMap.entries()].map(([date, total]) => ({ date, total })),
    },
  });
});

shopRoutes.get('/customers', requireRole('SHOP_OWNER', 'KITCHEN_STAFF'), async (c) => {
  const db = c.get('db');
  const shop = await getDefaultShop(db);
  const query = parseQuery(
    z.object({ search: z.string().max(80).optional() }),
    c.req.query(),
  );
  const customers = await db.customer.findMany({
    where: {
      shopId: shop.id,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      addresses: true,
      _count: { select: { orders: true, subscriptions: true } },
      orders: { orderBy: { placedAt: 'desc' }, take: 1, select: { placedAt: true, orderNumber: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const spending = await db.order.groupBy({
    by: ['customerId'],
    where: { shopId: shop.id, status: 'DELIVERED' },
    _sum: { total: true },
  });
  const spendMap = new Map(spending.map((entry) => [entry.customerId, money(entry._sum.total)]));

  return c.json({
    data: customers.map((customer) => ({
      ...serializeCustomer(customer),
      totalOrders: customer._count.orders,
      activeSubscriptions: customer._count.subscriptions,
      totalSpending: spendMap.get(customer.id) ?? 0,
      lastOrder: customer.orders[0] ?? null,
    })),
  });
});

shopRoutes.get('/riders', async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const shopId = auth.role === 'PLATFORM_ADMIN' ? c.req.query('shopId') : auth.shopId;
  const riders = await db.rider.findMany({
    where: shopId ? { shopId } : {},
    include: {
      _count: { select: { orders: true } },
      assignments: { where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } },
    },
    orderBy: { name: 'asc' },
  });

  return c.json({
    data: riders.map((rider) => ({
      id: rider.id,
      name: rider.name,
      phone: rider.phone,
      vehicleType: rider.vehicleType,
      isAvailable: rider.isAvailable,
      totalOrders: rider._count.orders,
      activeDeliveries: rider.assignments.length,
    })),
  });
});

shopRoutes.patch('/settings', requireRole('SHOP_OWNER'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  const shop = await resolveShop(db, auth.shopId);
  const schema = z.object({
    deliveryFee: z.coerce.number().min(0).max(500).optional(),
    freeDeliveryAbove: z.coerce.number().min(0).max(10000).optional(),
    minOrderValue: z.coerce.number().min(0).max(10000).optional(),
    openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    isAcceptingOrders: z.boolean().optional(),
  });
  const body = parseBody(schema, await c.req.json().catch(() => null));

  const settings = await db.shopSetting.upsert({
    where: { shopId: shop.id },
    create: {
      shopId: shop.id,
      deliveryFee: body.deliveryFee ?? 30,
      freeDeliveryAbove: body.freeDeliveryAbove ?? 499,
      minOrderValue: body.minOrderValue ?? 99,
      openingTime: body.openingTime ?? '10:00',
      closingTime: body.closingTime ?? '22:00',
      isAcceptingOrders: body.isAcceptingOrders ?? true,
    },
    update: {
      ...(body.deliveryFee !== undefined ? { deliveryFee: body.deliveryFee } : {}),
      ...(body.freeDeliveryAbove !== undefined ? { freeDeliveryAbove: body.freeDeliveryAbove } : {}),
      ...(body.minOrderValue !== undefined ? { minOrderValue: body.minOrderValue } : {}),
      ...(body.openingTime !== undefined ? { openingTime: body.openingTime } : {}),
      ...(body.closingTime !== undefined ? { closingTime: body.closingTime } : {}),
      ...(body.isAcceptingOrders !== undefined ? { isAcceptingOrders: body.isAcceptingOrders } : {}),
    },
  });

  return c.json({
    data: {
      deliveryFee: money(settings.deliveryFee),
      freeDeliveryAbove: money(settings.freeDeliveryAbove),
      minOrderValue: money(settings.minOrderValue),
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      isAcceptingOrders: settings.isAcceptingOrders,
    },
  });
});

shopRoutes.get('/settings', requireRole('SHOP_OWNER', 'KITCHEN_STAFF'), async (c) => {
  const auth = requireAuth(c);
  const db = c.get('db');
  if (!auth.shopId) throw forbidden('No shop linked to this account');
  const settings = await db.shopSetting.findUnique({ where: { shopId: auth.shopId } });
  if (!settings) throw notFound('Shop settings not found');
  return c.json({
    data: {
      deliveryFee: money(settings.deliveryFee),
      freeDeliveryAbove: money(settings.freeDeliveryAbove),
      minOrderValue: money(settings.minOrderValue),
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      isAcceptingOrders: settings.isAcceptingOrders,
    },
  });
});

export default shopRoutes;
