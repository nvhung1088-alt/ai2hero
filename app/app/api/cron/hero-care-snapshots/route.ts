import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import {
  heroCareSnapshots,
  heroCareInboxes,
  heroCareConversations,
  heroCareSnapshotItems,
  heroCareEvents
} from '@/lib/db/schema';
import { and, eq, or, isNull, sql, lt } from 'drizzle-orm';
import * as connectorService from '@/lib/connect-hub/connector-service';
import crypto from 'crypto';

export const revalidate = 0;

// Helper: Trích xuất mảng items từ response POS
function extractItems(resData: any): any[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.items)) return resData.items;
  
  if (resData.data && typeof resData.data === 'object') {
    for (const val of Object.values(resData.data)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

// Helper: Bóc tách meta info của item từ POS
function parseItemMeta(item: any, dataType: string): { entityKey: string; entityName: string } {
  let entityKey = '';
  let entityName = '';

  // 1. Lấy key duy nhất (sku, code, id...)
  if (item.code) entityKey = String(item.code);
  else if (item.sku) entityKey = String(item.sku);
  else if (item.id) entityKey = String(item.id);
  else if (item.key) entityKey = String(item.key);
  else entityKey = Math.random().toString(36).substring(7);

  // 2. Lấy tên hiển thị
  if (item.fullName) entityName = String(item.fullName);
  else if (item.name) entityName = String(item.name);
  else if (item.title) entityName = String(item.title);
  else if (item.customerName) entityName = String(item.customerName);
  else if (dataType === 'orders') entityName = `Đơn hàng ${entityKey}`;
  else entityName = `Sản phẩm ${entityKey}`;

  return { entityKey, entityName };
}

// Helper: Tính toán SHA-256 hash của item data
function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function GET(request: Request) {
  // 1. Xác thực CRON_SECRET bảo mật cao
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Snapshot Cron] Lỗi: Chưa cấu hình CRON_SECRET.');
    return new NextResponse('Internal Server Error: Cron secret configuration missing', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const expectedAuth = `Bearer ${cronSecret}`;

  try {
    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedAuth);
    
    if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  } catch (e) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. Lấy danh sách tối đa 5 snapshots active cần refresh
    // Điều kiện: Snapshot active, Inbox active, đến hạn refresh, và Inbox có chat trong 24h qua
    const snapshotsToRefresh = await db
      .select({
        snapshot: heroCareSnapshots,
        inbox: heroCareInboxes
      })
      .from(heroCareSnapshots)
      .innerJoin(heroCareInboxes, eq(heroCareSnapshots.inboxId, heroCareInboxes.id))
      .where(
        and(
          eq(heroCareSnapshots.status, 'active'),
          eq(heroCareInboxes.status, 'active'),
          or(
            isNull(heroCareSnapshots.nextRefreshAt),
            sql`${heroCareSnapshots.nextRefreshAt} <= NOW()`
          ),
          sql`EXISTS (
            SELECT 1 FROM hero_care_conversations c
            WHERE c.inbox_id = ${heroCareInboxes.id}
              AND c.last_message_at > NOW() - INTERVAL '24 hours'
          )`
        )
      )
      .orderBy(heroCareSnapshots.nextRefreshAt)
      .limit(5);

    if (snapshotsToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có snapshot nào cần làm mới tại thời điểm này.'
      });
    }

    const results = [];
    let refreshedCount = 0;

    // 3. Thực thi đồng bộ từng snapshot
    for (const item of snapshotsToRefresh) {
      const snap = item.snapshot;
      const inbox = item.inbox;
      const syncStartTime = new Date();
      const startTime = Date.now();

      console.log(`[Snapshot Cron] Đang refresh snapshot #${snap.id} (${snap.name}) của Team #${snap.teamId}...`);

      if (!inbox.connectionId) {
        console.warn(`[Snapshot Cron] Snapshot #${snap.id} bỏ qua: Inbox không có connectionId.`);
        results.push({
          snapshotId: snap.id,
          status: 'skipped',
          reason: 'Inbox has no connectionId'
        });
        
        // Hoãn refresh lại 30 phút để tránh bị kẹt quét liên tục
        await db
          .update(heroCareSnapshots)
          .set({
            nextRefreshAt: new Date(Date.now() + 30 * 60 * 1000),
            updatedAt: new Date()
          })
          .where(eq(heroCareSnapshots.id, snap.id));
        continue;
      }

      // Xác định action slug thích hợp theo dataType
      let actionSlug = 'list_products';
      if (snap.dataType === 'orders') {
        actionSlug = 'list_orders';
      } else if (snap.dataType === 'customers') {
        actionSlug = 'list_customers';
      } else if (snap.dataType === 'inventory') {
        // Pancake POS hỗ trợ get_inventory, KiotViet thì dùng list_products
        actionSlug = inbox.channel === 'pancake' ? 'get_inventory' : 'list_products';
      }

      try {
        // Gọi API POS qua Connect Hub
        const apiRes = await connectorService.runConnectorAction({
          teamId: snap.teamId,
          connectionId: inbox.connectionId,
          actionSlug,
          input: {}, // Không truyền bộ lọc để quét toàn bộ catalog/inbound items
          callerModule: 'hero-care'
        });

        if (!apiRes.success) {
          throw new Error(apiRes.error || 'API Connection Call Failed');
        }

        const rawItems = extractItems(apiRes.data);
        console.log(`[Snapshot Cron] Trích xuất được ${rawItems.length} items từ POS API.`);

        let insertedOrUpdated = 0;

        // Upsert từng item vào Cache DB
        for (const rawItem of rawItems) {
          const { entityKey, entityName } = parseItemMeta(rawItem, snap.dataType);
          const dataHash = computeHash(rawItem);

          // Tìm xem item đã tồn tại trong snapshot chưa
          const [existingItem] = await db
            .select()
            .from(heroCareSnapshotItems)
            .where(
              and(
                eq(heroCareSnapshotItems.snapshotId, snap.id),
                eq(heroCareSnapshotItems.entityKey, entityKey)
              )
            )
            .limit(1);

          if (!existingItem) {
            // Chưa có -> Insert mới
            await db.insert(heroCareSnapshotItems).values({
              teamId: snap.teamId,
              snapshotId: snap.id,
              dataType: snap.dataType,
              entityKey,
              entityName,
              data: rawItem,
              dataHash,
              createdAt: new Date(),
              refreshedAt: new Date()
            });
            insertedOrUpdated++;
          } else if (existingItem.dataHash !== dataHash) {
            // Có rồi nhưng hash khác -> Update data mới
            await db
              .update(heroCareSnapshotItems)
              .set({
                entityName,
                data: rawItem,
                dataHash,
                refreshedAt: new Date()
              })
              .where(eq(heroCareSnapshotItems.id, existingItem.id));
            insertedOrUpdated++;
          } else {
            // Có rồi và hash giống hệt -> Chỉ update thời gian updatedAt để đánh dấu active
            await db
              .update(heroCareSnapshotItems)
              .set({
                refreshedAt: new Date()
              })
              .where(eq(heroCareSnapshotItems.id, existingItem.id));
          }
        }

        // 4. Garbage Collection: Xóa các items đã bị xóa ở POS gốc
        // (Xóa các item thuộc snapshot này có updatedAt trước thời gian bắt đầu sync)
        const deleteRes = await db
          .delete(heroCareSnapshotItems)
          .where(
            and(
              eq(heroCareSnapshotItems.snapshotId, snap.id),
              lt(heroCareSnapshotItems.refreshedAt, syncStartTime)
            )
          );

        // Cập nhật thông tin snapshot thành công
        const nextRefreshAt = new Date(Date.now() + snap.refreshIntervalMinutes * 60 * 1000);
        await db
          .update(heroCareSnapshots)
          .set({
            lastRefreshedAt: new Date(),
            nextRefreshAt,
            updatedAt: new Date()
          })
          .where(eq(heroCareSnapshots.id, snap.id));

        // Log Event thành công
        await db.insert(heroCareEvents).values({
          teamId: snap.teamId,
          inboxId: inbox.id,
          eventType: 'snapshot_refreshed',
          payload: {
            snapshotId: snap.id,
            itemsFetched: rawItems.length,
            itemsUpserted: insertedOrUpdated,
            durationMs: Date.now() - startTime
          },
          processedAt: new Date()
        });

        refreshedCount++;
        results.push({
          snapshotId: snap.id,
          status: 'success',
          itemsFetched: rawItems.length,
          itemsUpserted: insertedOrUpdated,
          durationMs: Date.now() - startTime
        });

      } catch (err: any) {
        console.error(`[Snapshot Cron] Exception khi refresh snapshot #${snap.id}:`, err);
        
        // Nếu lỗi, hoãn lại 10 phút để quét lại sau
        const nextRefreshAt = new Date(Date.now() + 10 * 60 * 1000);
        await db
          .update(heroCareSnapshots)
          .set({
            nextRefreshAt,
            updatedAt: new Date()
          })
          .where(eq(heroCareSnapshots.id, snap.id));

        // Log Event lỗi
        await db.insert(heroCareEvents).values({
          teamId: snap.teamId,
          inboxId: inbox.id,
          eventType: 'snapshot_refreshed',
          payload: {
            snapshotId: snap.id,
            error: err.message || 'Lỗi kết nối hoặc xử lý dữ liệu POS'
          },
          processedAt: new Date()
        });

        results.push({
          snapshotId: snap.id,
          status: 'failed',
          error: err.message,
          durationMs: Date.now() - startTime
        });
      }
    }

    return NextResponse.json({
      success: true,
      refreshed: refreshedCount,
      totalScanned: snapshotsToRefresh.length,
      details: results
    });

  } catch (error: any) {
    console.error('[Snapshot Cron] Lỗi runtime:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi hệ thống cron job snapshots' },
      { status: 500 }
    );
  }
}
