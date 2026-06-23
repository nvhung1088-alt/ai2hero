import { db } from './drizzle';
import { marketplaceProducts, marketplaceShops, marketplaceCategories, marketplaceOrders } from './schema';
import { eq, and, desc, ilike, sql } from 'drizzle-orm';

export async function getMarketplaceProducts(
  teamId: number,
  options?: {
    limit?: number;
    offset?: number;
    categoryId?: number;
    shopId?: number;
    search?: string;
  }
) {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const conditions = [
    eq(marketplaceProducts.teamId, teamId),
    eq(marketplaceProducts.status, 'active'),
  ];

  if (options?.categoryId) {
    conditions.push(eq(marketplaceProducts.categoryId, options.categoryId));
  }

  if (options?.shopId) {
    conditions.push(eq(marketplaceProducts.shopId, options.shopId));
  }

  if (options?.search) {
    conditions.push(ilike(marketplaceProducts.name, `%${options.search}%`));
  }

  return await db.query.marketplaceProducts.findMany({
    where: and(...conditions),
    with: {
      shop: true,
      category: true,
    },
    limit,
    offset,
    orderBy: [desc(marketplaceProducts.createdAt)],
  });
}

export async function getProductById(teamId: number, id: number) {
  return await db.query.marketplaceProducts.findFirst({
    where: and(
      eq(marketplaceProducts.id, id),
      eq(marketplaceProducts.teamId, teamId)
    ),
    with: {
      shop: true,
      category: true,
    },
  });
}

export async function getShopById(teamId: number, id: number) {
  return await db.query.marketplaceShops.findFirst({
    where: and(
      eq(marketplaceShops.id, id),
      eq(marketplaceShops.teamId, teamId)
    ),
  });
}

export async function getShopByUserId(teamId: number, userId: number) {
  return await db.query.marketplaceShops.findFirst({
    where: and(
      eq(marketplaceShops.teamId, teamId),
      eq(marketplaceShops.userId, userId),
      eq(marketplaceShops.status, 'active')
    ),
  });
}

export async function getOrderById(id: number, buyerUserId: number) {
  return await db.query.marketplaceOrders.findFirst({
    where: and(
      eq(marketplaceOrders.id, id),
      eq(marketplaceOrders.buyerUserId, buyerUserId)
    ),
  });
}
