import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { db } from '@/lib/db/drizzle';
import { marketplaceProducts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Thiếu Bearer Token' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Token không hợp lệ' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { platform, products, shopId } = body;

    if (!platform || !['shopee', 'tiktok'].includes(platform)) {
      return NextResponse.json({ success: false, error: 'Nền tảng không hợp lệ' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!shopId) {
      return NextResponse.json({ success: false, error: 'Thiếu shopId' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!Array.isArray(products)) {
      return NextResponse.json({ success: false, error: 'Danh sách sản phẩm không hợp lệ' }, { status: 400, headers: CORS_HEADERS });
    }

    let syncedCount = 0;

    for (const item of products) {
      const sourceId = String(item.id || item.item_id || item.product_id || Math.random().toString());
      const name = item.name || item.title || 'Sản phẩm không tên';
      const price = Number(item.price || item.price_info?.price || 0);
      const stock = Number(item.stock || item.stock_info?.normal_stock || 0);
      
      let images: string[] = [];
      if (item.images && Array.isArray(item.images)) {
        images = item.images;
      } else if (item.image) {
        images = [item.image];
      }

      // Upsert logic
      const existing = await db.query.marketplaceProducts.findFirst({
        where: and(
          eq(marketplaceProducts.shopId, shopId),
          eq(marketplaceProducts.sourcePlatform, platform),
          eq(marketplaceProducts.sourceId, sourceId)
        )
      });

      if (existing) {
        // Update
        await db.update(marketplaceProducts)
          .set({
            name,
            price,
            stock,
            images,
            updatedAt: new Date()
          })
          .where(eq(marketplaceProducts.id, existing.id));
      } else {
        // Insert
        await db.insert(marketplaceProducts).values({
          teamId: auth.teamId,
          shopId: shopId,
          name,
          price,
          stock,
          images,
          sourcePlatform: platform,
          sourceId: sourceId,
          status: stock > 0 ? 'active' : 'out_of_stock'
        });
      }
      syncedCount++;
    }

    return NextResponse.json(
      { success: true, count: syncedCount, message: `Đã đồng bộ ${syncedCount} sản phẩm từ ${platform}` },
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (error: any) {
    console.error('Marketplace Extension Sync Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server nội bộ', details: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
