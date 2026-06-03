import { db } from './drizzle';
import { connectHubConnections, connectHubUsageLogs } from './schema';
import { eq, and, desc, count, sql, gte } from 'drizzle-orm';

/**
 * Lấy danh sách kết nối API của một Team
 */
export async function getConnectionsByTeam(teamId: number) {
  try {
    return await db
      .select()
      .from(connectHubConnections)
      .where(eq(connectHubConnections.teamId, teamId))
      .orderBy(desc(connectHubConnections.createdAt));
  } catch (error) {
    console.error('Lỗi khi lấy getConnectionsByTeam (Postgres Timeout/Sleep):', error);
    return [];
  }
}

/**
 * Lấy chi tiết một kết nối API (chỉ trả về trong phạm vi Team)
 */
export async function getConnectionById(teamId: number, id: number) {
  try {
    const results = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.id, id),
          eq(connectHubConnections.teamId, teamId)
        )
      )
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('Lỗi khi lấy getConnectionById:', error);
    return null;
  }
}

/**
 * Lấy nhật ký sử dụng API của một Team
 */
export async function getUsageLogs(teamId: number, limit: number = 50) {
  try {
    return await db
      .select()
      .from(connectHubUsageLogs)
      .where(eq(connectHubUsageLogs.teamId, teamId))
      .orderBy(desc(connectHubUsageLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Lỗi khi lấy getUsageLogs:', error);
    return [];
  }
}

/**
 * Thống kê tổng số lượng kết nối và lượt sử dụng của một Team
 */
export async function getConnectionStats(teamId: number, rawConnections?: any[]) {
  try {
    // 1. Đếm tổng kết nối và kết nối theo trạng thái (Tái sử dụng nếu có)
    const connections = rawConnections || await getConnectionsByTeam(teamId);
    const totalConnections = connections.length;
    const activeConnections = connections.filter((c) => c.status === 'connected').length;
    const errorConnections = connections.filter((c) => c.status === 'error').length;

    // 2. Tính số lượng logs thực thi trong tháng hiện tại
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyLogsResult = await db
      .select({ count: count() })
      .from(connectHubUsageLogs)
      .where(
        and(
          eq(connectHubUsageLogs.teamId, teamId),
          gte(connectHubUsageLogs.createdAt, startOfMonth)
        )
      );

    const monthlyUsage = monthlyLogsResult[0]?.count || 0;

    return {
      totalConnections,
      activeConnections,
      errorConnections,
      monthlyUsage
    };
  } catch (error) {
    console.error('Lỗi khi lấy getConnectionStats:', error);
    return {
      totalConnections: 0,
      activeConnections: 0,
      errorConnections: 0,
      monthlyUsage: 0
    };
  }
}
