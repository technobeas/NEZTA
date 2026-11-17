import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { parseBody, parseQuery } from '../../middleware/validate.js';
import { conflict, forbidden, notFound } from '../../utils/errors.js';
import { money, paged, paginationFrom } from '../../utils/format.js';
import {
  serializeCategory,
  serializeMealBox,
  serializePlan,
  serializeProduct,
} from '../../utils/serialize.js';
import { slugify, uniqueSlug } from '../../utils/slug.js';
import { resolveShop } from '../shops/shop-helpers.js';

const catalog = new Hono();

const MEAL_BOX_INCLUDE = {
  items: { orderBy: { sortOrder: 'asc' } },
  options: { orderBy: { sortOrder: 'asc' }, include: { values: { orderBy: { sortOrder: 'asc' } } } },
};

const PLAN_INCLUDE = { items: true };

function requireManager(c) {
  const auth = requireAuth(c);
  if (!['SHOP_OWNER', 'PLATFORM_ADMIN'].includes(auth.role)) {
    throw forbidden('Only the shop owner can manage the catalogue');
  }
  return auth;
}

function managerShopId(c) {
  const auth = requireManager(c);
  if (auth.role === 'PLATFORM_ADMIN') return c.req.query('shopId') ?? auth.shopId ?? null;
  if (!auth.shopId) throw forbidden('No shop is linked to this account');
  return auth.shopId;
}

/* ------------------------------------------------------------------ categories */

const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

catalog.get('/categories', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const categories = await db.category.findMany({
    where: { shopId: shop.id, ...(c.req.query('all') === 'true' ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return c.json({ data: categories.map(serializeCategory) });
});

catalog.post('/categories', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(categorySchema, await c.req.json().catch(() => null));
  const slug =
    body.slug ??
    (await uniqueSlug(body.name, async (candidate) =>
      Boolean(await db.category.findFirst({ where: { shopId, slug: candidate } })),
    ));
  const created = await db.category.create({
    data: { shopId, name: body.name, slug, imageUrl: body.imageUrl ?? null, sortOrder: body.sortOrder ?? 0 },
  });
  return c.json({ data: serializeCategory(created) }, 201);
});

catalog.patch('/categories/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(categorySchema.partial(), await c.req.json().catch(() => null));
  const existing = await db.category.findFirst({ where: { id: c.req.param('id'), shopId } });
  if (!existing) throw notFound('Category not found');
  const updated = await db.category.update({
    where: { id: existing.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return c.json({ data: serializeCategory(updated) });
});

catalog.delete('/categories/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const category = await db.category.findFirst({
    where: { id: c.req.param('id'), shopId },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw notFound('Category not found');
  if (category._count.products > 0) {
    throw conflict('Move or remove the products in this category first');
  }
  await db.category.delete({ where: { id: category.id } });
  return c.json({ data: { id: category.id } });
});

/* -------------------------------------------------------------------- products */

const productSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional().nullable(),
  price: z.coerce.number().positive().max(100000),
  categoryId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  unitLabel: z.string().max(40).optional().nullable(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  preparationMinutes: z.coerce.number().int().min(0).max(240).optional(),
  sortOrder: z.coerce.number().int().optional(),
  slug: z.string().optional(),
});

catalog.get('/products', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const query = parseQuery(
    z.object({
      category: z.string().optional(),
      search: z.string().max(80).optional(),
      available: z.enum(['true', 'false', 'all']).optional(),
      featured: z.enum(['true', 'false']).optional(),
      page: z.string().optional(),
      pageSize: z.string().optional(),
      all: z.string().optional(),
    }),
    c.req.query(),
  );

  const where = {
    shopId: shop.id,
    ...(query.available === 'all' ? {} : { isAvailable: query.available === 'false' ? false : true }),
    ...(query.featured === 'true' ? { isFeatured: true } : {}),
    ...(query.category && query.category !== 'all'
      ? { category: { slug: query.category } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  if (query.all === 'true') {
    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return c.json({ data: products.map(serializeProduct) });
  }

  const pagination = paginationFrom(query);
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    db.product.count({ where }),
  ]);
  return c.json(paged(products.map(serializeProduct), total, pagination));
});

catalog.get('/products/:id', async (c) => {
  const db = c.get('db');
  const product = await db.product.findFirst({
    where: { OR: [{ id: safeUuid(c.req.param('id')) }, { slug: c.req.param('id') }] },
    include: { category: true },
  });
  if (!product) throw notFound('Product not found');
  return c.json({ data: serializeProduct(product) });
});

catalog.post('/products', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(productSchema, await c.req.json().catch(() => null));
  const slug =
    body.slug ??
    (await uniqueSlug(body.name, async (candidate) =>
      Boolean(await db.product.findFirst({ where: { shopId, slug: candidate } })),
    ));
  const created = await db.product.create({
    data: {
      shopId,
      name: body.name,
      slug,
      description: body.description ?? null,
      price: body.price,
      categoryId: body.categoryId ?? null,
      imageUrl: body.imageUrl ?? null,
      unitLabel: body.unitLabel ?? 'per serving',
      isVeg: body.isVeg ?? true,
      isAvailable: body.isAvailable ?? true,
      isFeatured: body.isFeatured ?? false,
      preparationMinutes: body.preparationMinutes ?? 15,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { category: true },
  });
  return c.json({ data: serializeProduct(created) }, 201);
});

catalog.patch('/products/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(productSchema.partial(), await c.req.json().catch(() => null));
  const product = await db.product.findFirst({ where: { id: c.req.param('id'), shopId } });
  if (!product) throw notFound('Product not found');
  const updated = await db.product.update({
    where: { id: product.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.unitLabel !== undefined ? { unitLabel: body.unitLabel } : {}),
      ...(body.isVeg !== undefined ? { isVeg: body.isVeg } : {}),
      ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
      ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
      ...(body.preparationMinutes !== undefined ? { preparationMinutes: body.preparationMinutes } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    include: { category: true },
  });
  return c.json({ data: serializeProduct(updated) });
});

catalog.delete('/products/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const product = await db.product.findFirst({
    where: { id: c.req.param('id'), shopId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) throw notFound('Product not found');
  if (product._count.orderItems > 0) {
    const updated = await db.product.update({ where: { id: product.id }, data: { isAvailable: false } });
    return c.json({
      data: serializeProduct(updated),
      meta: { archived: true, message: 'Product is used in past orders, so it was marked unavailable instead.' },
    });
  }
  await db.product.delete({ where: { id: product.id } });
  return c.json({ data: { id: product.id } });
});

/* ------------------------------------------------------------------- meal boxes */

const mealBoxValueSchema = z.object({
  label: z.string().min(1).max(80),
  priceDelta: z.coerce.number().min(0).max(10000).default(0),
  isDefault: z.boolean().optional(),
  productId: z.string().uuid().optional().nullable(),
});

const mealBoxOptionSchema = z.object({
  label: z.string().min(1).max(80),
  type: z.enum(['SINGLE', 'MULTI', 'ADDON']).default('SINGLE'),
  minSelect: z.coerce.number().int().min(0).max(20).default(1),
  maxSelect: z.coerce.number().int().min(1).max(20).default(1),
  isRequired: z.boolean().default(true),
  helpText: z.string().max(160).optional().nullable(),
  values: z.array(mealBoxValueSchema).min(1, 'Add at least one choice'),
});

const mealBoxSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(600).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  basePrice: z.coerce.number().positive().max(100000),
  servings: z.string().max(40).optional(),
  prepMinutes: z.coerce.number().int().min(0).max(240).optional(),
  badge: z.string().max(30).optional().nullable(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  items: z.array(z.object({ label: z.string().min(1).max(80), quantity: z.coerce.number().int().min(1).max(50) })).default([]),
  options: z.array(mealBoxOptionSchema).default([]),
});

function childrenCreate(input) {
  return {
    items: {
      create: input.items.map((item, index) => ({
        label: item.label,
        quantity: item.quantity,
        sortOrder: index,
      })),
    },
    options: {
      create: input.options.map((option, index) => ({
        label: option.label,
        type: option.type,
        minSelect: option.minSelect,
        maxSelect: option.maxSelect,
        isRequired: option.isRequired,
        helpText: option.helpText ?? null,
        sortOrder: index,
        values: {
          create: option.values.map((value, valueIndex) => ({
            label: value.label,
            priceDelta: value.priceDelta ?? 0,
            isDefault: value.isDefault ?? false,
            productId: value.productId ?? null,
            sortOrder: valueIndex,
          })),
        },
      })),
    },
  };
}

catalog.get('/meal-boxes', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const includeUnavailable = c.req.query('all') === 'true';
  const mealBoxes = await db.mealBox.findMany({
    where: { shopId: shop.id, ...(includeUnavailable ? {} : { isAvailable: true }) },
    include: MEAL_BOX_INCLUDE,
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
  });
  return c.json({ data: mealBoxes.map(serializeMealBox) });
});

catalog.get('/meal-boxes/:id', async (c) => {
  const db = c.get('db');
  const mealBox = await db.mealBox.findFirst({
    where: { OR: [{ id: safeUuid(c.req.param('id')) }, { slug: c.req.param('id') }] },
    include: MEAL_BOX_INCLUDE,
  });
  if (!mealBox) throw notFound('Meal box not found');
  return c.json({ data: serializeMealBox(mealBox) });
});

catalog.post('/meal-boxes', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(mealBoxSchema, await c.req.json().catch(() => null));
  const slug = await uniqueSlug(body.name, async (candidate) =>
    Boolean(await db.mealBox.findFirst({ where: { shopId, slug: candidate } })),
  );
  const created = await db.mealBox.create({
    data: {
      shopId,
      name: body.name,
      slug,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      basePrice: body.basePrice,
      servings: body.servings ?? 'Serves 1',
      prepMinutes: body.prepMinutes ?? 25,
      badge: body.badge ?? null,
      isAvailable: body.isAvailable ?? true,
      isFeatured: body.isFeatured ?? false,
      sortOrder: body.sortOrder ?? 0,
      ...childrenCreate(body),
    },
    include: MEAL_BOX_INCLUDE,
  });
  return c.json({ data: serializeMealBox(created) }, 201);
});

catalog.patch('/meal-boxes/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(mealBoxSchema.partial(), await c.req.json().catch(() => null));
  const existing = await db.mealBox.findFirst({ where: { id: c.req.param('id'), shopId } });
  if (!existing) throw notFound('Meal box not found');

  const updated = await db.$transaction(async (tx) => {
    if (body.items || body.options) {
      await tx.mealBoxItem.deleteMany({ where: { mealBoxId: existing.id } });
      await tx.mealBoxOption.deleteMany({ where: { mealBoxId: existing.id } });
    }
    await tx.mealBox.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.basePrice !== undefined ? { basePrice: body.basePrice } : {}),
        ...(body.servings !== undefined ? { servings: body.servings } : {}),
        ...(body.prepMinutes !== undefined ? { prepMinutes: body.prepMinutes } : {}),
        ...(body.badge !== undefined ? { badge: body.badge } : {}),
        ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    if (body.items || body.options) {
      await tx.mealBox.update({
        where: { id: existing.id },
        data: childrenCreate({
          items: body.items ?? [],
          options: body.options ?? [],
        }),
      });
    }
    return tx.mealBox.findUnique({ where: { id: existing.id }, include: MEAL_BOX_INCLUDE });
  });

  return c.json({ data: serializeMealBox(updated) });
});

catalog.delete('/meal-boxes/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const mealBox = await db.mealBox.findFirst({
    where: { id: c.req.param('id'), shopId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!mealBox) throw notFound('Meal box not found');
  if (mealBox._count.orderItems > 0) {
    const updated = await db.mealBox.update({ where: { id: mealBox.id }, data: { isAvailable: false } });
    return c.json({
      data: serializeMealBox(updated),
      meta: { archived: true, message: 'Meal box appears in past orders, so it was hidden instead of deleted.' },
    });
  }
  await db.mealBox.delete({ where: { id: mealBox.id } });
  return c.json({ data: { id: mealBox.id } });
});

/* ---------------------------------------------------------------- tiffin plans */

const planSchema = z.object({
  name: z.string().min(2).max(80),
  planType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  durationDays: z.coerce.number().int().min(1).max(365),
  price: z.coerce.number().positive().max(1000000),
  description: z.string().max(600).optional().nullable(),
  mealType: z.string().max(60).optional(),
  deliveryWindow: z.string().max(60).optional(),
  mealsPerDay: z.coerce.number().int().min(1).max(5).optional(),
  savingsNote: z.string().max(80).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  items: z.array(z.object({ label: z.string().min(1).max(80), quantity: z.coerce.number().int().min(1).max(50) })).optional(),
});

catalog.get('/tiffin-plans', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const all = c.req.query('all') === 'true';
  const plans = await db.tiffinPlan.findMany({
    where: { shopId: shop.id, ...(all ? {} : { isAvailable: true }) },
    include: { items: true, _count: { select: { subscriptions: true } } },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });
  return c.json({ data: plans.map(serializePlan) });
});

catalog.post('/tiffin-plans', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(planSchema, await c.req.json().catch(() => null));
  const slug = await uniqueSlug(body.name, async (candidate) =>
    Boolean(await db.tiffinPlan.findFirst({ where: { shopId, slug: candidate } })),
  );
  const created = await db.tiffinPlan.create({
    data: {
      shopId,
      name: body.name,
      slug,
      planType: body.planType,
      durationDays: body.durationDays,
      price: body.price,
      description: body.description ?? null,
      mealType: body.mealType ?? 'Veg lunch',
      deliveryWindow: body.deliveryWindow ?? '12:00 PM - 1:30 PM',
      mealsPerDay: body.mealsPerDay ?? 1,
      savingsNote: body.savingsNote ?? null,
      imageUrl: body.imageUrl ?? null,
      isAvailable: body.isAvailable ?? true,
      isFeatured: body.isFeatured ?? false,
      sortOrder: body.sortOrder ?? 0,
      items: { create: (body.items ?? []).map((item) => ({ label: item.label, quantity: item.quantity })) },
    },
    include: PLAN_INCLUDE,
  });
  return c.json({ data: serializePlan(created) }, 201);
});

catalog.patch('/tiffin-plans/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(planSchema.partial(), await c.req.json().catch(() => null));
  const existing = await db.tiffinPlan.findFirst({ where: { id: c.req.param('id'), shopId } });
  if (!existing) throw notFound('Tiffin plan not found');

  const updated = await db.$transaction(async (tx) => {
    if (body.items) await tx.tiffinPlanItem.deleteMany({ where: { planId: existing.id } });
    await tx.tiffinPlan.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.planType ? { planType: body.planType } : {}),
        ...(body.durationDays !== undefined ? { durationDays: body.durationDays } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.mealType !== undefined ? { mealType: body.mealType } : {}),
        ...(body.deliveryWindow !== undefined ? { deliveryWindow: body.deliveryWindow } : {}),
        ...(body.mealsPerDay !== undefined ? { mealsPerDay: body.mealsPerDay } : {}),
        ...(body.savingsNote !== undefined ? { savingsNote: body.savingsNote } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.items
          ? { items: { create: body.items.map((item) => ({ label: item.label, quantity: item.quantity })) } }
          : {}),
      },
    });
    return tx.tiffinPlan.findUnique({ where: { id: existing.id }, include: PLAN_INCLUDE });
  });
  return c.json({ data: serializePlan(updated) });
});

catalog.delete('/tiffin-plans/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const plan = await db.tiffinPlan.findFirst({
    where: { id: c.req.param('id'), shopId },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!plan) throw notFound('Tiffin plan not found');
  if (plan._count.subscriptions > 0) {
    const updated = await db.tiffinPlan.update({ where: { id: plan.id }, data: { isAvailable: false } });
    return c.json({
      data: serializePlan(updated),
      meta: { archived: true, message: 'Plan has subscribers, so it was disabled instead of deleted.' },
    });
  }
  await db.tiffinPlan.delete({ where: { id: plan.id } });
  return c.json({ data: { id: plan.id } });
});

/* -------------------------------------------------------------- bulk packages */

const bulkPackageSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(600).optional().nullable(),
  targetSegments: z.string().max(160).optional().nullable(),
  includes: z.string().max(600).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  minQuantity: z.coerce.number().int().min(1).max(5000).optional(),
  perPersonPrice: z.coerce.number().positive().max(100000),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

catalog.get('/bulk-packages', async (c) => {
  const db = c.get('db');
  const shop = await resolveShop(db, c.req.query('shopId'));
  const all = c.req.query('all') === 'true';
  const packages = await db.bulkOrderPackage.findMany({
    where: { shopId: shop.id, ...(all ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return c.json({
    data: packages.map((entry) => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      description: entry.description,
      targetSegments: entry.targetSegments,
      includes: entry.includes,
      imageUrl: entry.imageUrl,
      minQuantity: entry.minQuantity,
      perPersonPrice: money(entry.perPersonPrice),
      isActive: entry.isActive,
    })),
  });
});

catalog.post('/bulk-packages', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(bulkPackageSchema, await c.req.json().catch(() => null));
  const slug = await uniqueSlug(body.name, async (candidate) =>
    Boolean(await db.bulkOrderPackage.findFirst({ where: { shopId, slug: candidate } })),
  );
  const created = await db.bulkOrderPackage.create({
    data: {
      shopId,
      name: body.name,
      slug,
      description: body.description ?? null,
      targetSegments: body.targetSegments ?? null,
      includes: body.includes ?? null,
      imageUrl: body.imageUrl ?? null,
      minQuantity: body.minQuantity ?? 20,
      perPersonPrice: body.perPersonPrice,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return c.json({ data: { ...created, perPersonPrice: money(created.perPersonPrice) } }, 201);
});

catalog.patch('/bulk-packages/:id', async (c) => {
  const db = c.get('db');
  const shopId = managerShopId(c);
  const body = parseBody(bulkPackageSchema.partial(), await c.req.json().catch(() => null));
  const existing = await db.bulkOrderPackage.findFirst({ where: { id: c.req.param('id'), shopId } });
  if (!existing) throw notFound('Bulk package not found');
  const updated = await db.bulkOrderPackage.update({
    where: { id: existing.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.targetSegments !== undefined ? { targetSegments: body.targetSegments } : {}),
      ...(body.includes !== undefined ? { includes: body.includes } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.minQuantity !== undefined ? { minQuantity: body.minQuantity } : {}),
      ...(body.perPersonPrice !== undefined ? { perPersonPrice: body.perPersonPrice } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });
  return c.json({ data: { ...updated, perPersonPrice: money(updated.perPersonPrice) } });
});

function safeUuid(value) {
  return /^[0-9a-fA-F-]{36}$/.test(value ?? '') ? value : '00000000-0000-0000-0000-000000000000';
}

export default catalog;
