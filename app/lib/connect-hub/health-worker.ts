import { db } from '../db/drizzle';
import { connectHubConnections } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getConnectorDefinition } from './connectors/registry';

/**
 * Health Worker: Tự động chạy quét các API Connection lỗi
 * Được thiết kế để gọi thông qua Cron Job (Vd: Vercel Cron, GitHub Actions)
 */
export async function runAutoHealingCheck(teamId?: number) {
  try {
    console.log('[AutoHealing] Bắt đầu chạy quét lỗi kết nối API...');
    
    // Lọc ra các kết nối đang bị lỗi
    let conditions = eq(connectHubConnections.status, 'error');
    if (teamId) {
      conditions = and(conditions, eq(connectHubConnections.teamId, teamId)) as any;
    }

    const errorConnections = await db.select().from(connectHubConnections).where(conditions);
    let healedCount = 0;

    for (const conn of errorConnections) {
      try {
        // Cập nhật trạng thái tạm thời sang "healing" để UI hiển thị "Đang phục hồi"
        await db.update(connectHubConnections)
          .set({ status: 'healing' })
          .where(eq(connectHubConnections.id, conn.id));

        const definition = getConnectorDefinition(conn.appSlug);
        if (!definition) {
           await db.update(connectHubConnections)
             .set({ status: 'error' })
             .where(eq(connectHubConnections.id, conn.id));
           continue;
        }

        // --- MÔ PHỎNG KIỂM TRA CREDENTIALS ---
        // Trong hệ thống thật, cần giải mã conn.encryptedCredentials trước khi validate
        // const credentials = decrypt(conn.encryptedCredentials);
        const dummyCredentials = {}; 
        
        // Gọi hàm validate của Connector (Ping/Test API)
        const result = await definition.validateCredentials(dummyCredentials);

        if (result.success) {
          // Phục hồi thành công (VD: Do user đã gia hạn Token ở hệ thống gốc)
          await db.update(connectHubConnections)
            .set({ 
              status: 'connected', 
              healthScore: 85, // Set 85 để UI hiện Badge "Đã Auto-Healed"
              lastTestedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(connectHubConnections.id, conn.id));
          healedCount++;
          console.log(`[AutoHealing] Đã phục hồi thành công API ${conn.connectionName}`);
        } else {
          // Vẫn lỗi -> giảm điểm Health Score
          const newScore = Math.max(0, (conn.healthScore || 100) - 10);
          await db.update(connectHubConnections)
            .set({ 
              status: 'error',
              healthScore: newScore,
              lastTestedAt: new Date()
            })
            .where(eq(connectHubConnections.id, conn.id));
        }
      } catch (err) {
        // Nếu có ngoại lệ nội bộ, revert về error
        await db.update(connectHubConnections)
          .set({ status: 'error' })
          .where(eq(connectHubConnections.id, conn.id));
      }
    }
    return { success: true, healedCount, totalChecked: errorConnections.length };
  } catch (error) {
    console.error('[AutoHealing] Lỗi nghiêm trọng:', error);
    return { success: false, error: 'Failed to run worker' };
  }
}
