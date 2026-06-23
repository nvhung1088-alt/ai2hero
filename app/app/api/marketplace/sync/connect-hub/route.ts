import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';
import { db } from '@/lib/db/drizzle';
import { marketplaceProducts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId, shopId, connectorSlug } = body;

    if (!connectionId || !shopId || !connectorSlug) {
      return NextResponse.json({ error: 'Thiếu tham số bắt buộc' }, { status: 400 });
    }

    // Lấy danh sách sản phẩm từ POS qua Connect Hub
    const actionSlug = 'list_products';
    const result = await runConnectorAction({
      teamId: team.id,
      connectionId: Number(connectionId),
      actionSlug: actionSlug,
      input: { page: 1, limit: 100 },
      callerModule: 'hero-marketplace',
      normalize: true // Connect Hub sẽ tự động chuẩn hóa dữ liệu sang format chung
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'Lỗi khi lấy dữ liệu từ Connect Hub' }, { status: 500 });
    }

    const items = Array.isArray(result.data) ? result.data : (result.data.items || result.data.data || []);
    let syncedCount = 0;

    for (const item of items) {
      // item đã được chuẩn hóa (normalize=true) nên có the có các trường chung:
      // name, price, stock, images (hoặc phải dùng fallback)
      const sourceId = String(item.id || item.code || Math.random().toString());
      const name = item.name || item.title || 'Sản phẩm không tên';
      const price = Number(item.price || item.basePrice || 0);
      const stock = Number(item.stock || item.onHand || item.quantity || 0);
      let images: string[] = [];
      if (item.images && Array.isArray(item.images)) {
        images = item.images;
      } else if (item.image) {
        images = [item.image];
      }

      // Upsert logic (Tìm xem sản phẩm này đã tồn tại chưa)
      const existing = await db.query.marketplaceProducts.findFirst({
        where: and(
          eq(marketplaceProducts.shopId, shopId),
          eq(marketplaceProducts.sourcePlatform, connectorSlug),
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
          teamId: team.id,
          shopId: shopId,
          name,
          price,
          stock,
          images,
          sourcePlatform: connectorSlug,
          sourceId: sourceId,
          status: stock > 0 ? 'active' : 'out_of_stock'
        });
      }
      syncedCount++;
    }

    return NextResponse.json({ success: true, count: syncedCount });

  } catch (error: any) {
    console.error('Marketplace Sync Error:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ', details: error.message }, { status: 500 });
  }
}
