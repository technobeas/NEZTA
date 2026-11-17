import { notFound } from '../../utils/errors.js';

export const DEFAULT_SHOP_SLUG = 'nezta';

export async function getDefaultShop(db) {
  const shop = await db.shop.findFirst({
    where: { slug: DEFAULT_SHOP_SLUG },
    include: { settings: true },
  });
  if (!shop) throw notFound('Demo shop is not seeded yet. Run: npm run db:seed');
  return shop;
}

export async function resolveShop(db, requestedShopId) {
  if (requestedShopId) {
    const shop = await db.shop.findUnique({ where: { id: requestedShopId }, include: { settings: true } });
    if (!shop) throw notFound('Shop not found');
    return shop;
  }
  return getDefaultShop(db);
}

export async function getCommissionRate(db) {
  const setting = await db.platformSetting.findUnique({ where: { key: 'commission_rate' } });
  const value = Number(setting?.value ?? 10);
  return Number.isFinite(value) ? value : 10;
}
