import { and, eq } from 'drizzle-orm';
import { db } from '../db/drizzle';
import {
  connectHubConnections,
  connectHubUsageLogs,
  connectHubMappingConfigs,
  teams
} from '../db/schema';
import { decryptField } from '../sim-crypto';
import { executeAction } from './connectors/engine';
import { normalizeData, migrateLegacyConfig } from './utils/mapper';

/**
 * CONNECTOR SERVICE — Lõi trung tâm cho mọi cuộc gọi API qua Connect Hub.
 *
 * File này KHÔNG phải server action ('use server').
 * Nó là hàm thuần server — dùng được cho:
 * - Server Actions (UI) → qua runActionAction()
 * - Cron jobs → import trực tiếp
 * - MVP engines (Hero Report, AI Chat) → import trực tiếp
 *
 * Mọi cuộc gọi đều được:
 * ✅ Validate (teamId + connectionId khớp nhau)
 * ✅ Decrypt credentials
 * ✅ Execute qua engine
 * ✅ Normalize (tùy chọn)
 * ✅ Ghi usage log (phân biệt test/thật)
 */

export async function runConnectorAction(params: {
  teamId: number;
  connectionId: number;
  actionSlug: string;
  input: Record<string, any>;
  callerModule: string;       // BẮT BUỘC: 'hero-report' | 'connect-hub-ui' | 'api-gateway' | 'capability-test'
  normalize?: boolean;
  isTest?: boolean;           // true = capability test, không tính vào usage thật
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  meta?: {
    durationMs: number;
    appSlug: string;
    actionSlug: string;
    callerModule: string;
  };
}> {
  const startTime = Date.now();
  const { teamId, connectionId, actionSlug, input, callerModule, normalize = false, isTest = false } = params;
  let connection: any = null;

  try {
    // 1. Kiểm tra kết nối tồn tại và thuộc về Team
    const [fetchedConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, connectionId)
        )
      )
      .limit(1);

    if (!fetchedConnection) {
      return { success: false, error: 'Không tìm thấy kết nối API thích hợp.' };
    }
    connection = fetchedConnection;

    // 2. Kiểm tra Connect Hub đã được kích hoạt cho Team chưa
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      return { success: false, error: 'Không tìm thấy không gian làm việc.' };
    }

    let activatedApps: string[] = [];
    if (team.activatedApps) {
      if (Array.isArray(team.activatedApps)) {
        activatedApps = team.activatedApps as string[];
      } else if (typeof team.activatedApps === 'string') {
        try {
          const parsed = JSON.parse(team.activatedApps);
          if (Array.isArray(parsed)) {
            activatedApps = parsed;
          }
        } catch {
          activatedApps = [team.activatedApps];
        }
      }
    }

    if (!activatedApps.includes('connect-hub')) {
      return { success: false, error: 'Connect Hub chưa được kích hoạt cho không gian làm việc này.' };
    }

    // 3. Giải mã thông số kết nối (credentials)
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // 4. Gọi connector engine chạy API thật
    const executionResult = await executeAction(
      connection.appSlug,
      credentials,
      actionSlug,
      input
    );

    let finalData = executionResult.data;

    // 5. Chuẩn hóa dữ liệu (Normalization) theo Mapping Config nếu được yêu cầu
    if (normalize && executionResult.success) {
      const configRecord = await db.query.connectHubMappingConfigs.findFirst({
        where: and(
          eq(connectHubMappingConfigs.appSlug, connection.appSlug),
          eq(connectHubMappingConfigs.teamId, teamId)
        ),
      });
      const rawConfig = configRecord?.config || {};
      const mappingConfig = migrateLegacyConfig(rawConfig);

      // Đối với Pancake POS, bóc tách trường 'data' ra để chuẩn hóa
      const rawDataToNormalize = 
        connection.appSlug === 'pancake-pos' && finalData && typeof finalData === 'object' && 'data' in finalData
          ? finalData.data
          : finalData;

      finalData = normalizeData(
        connection.appSlug,
        actionSlug,
        rawDataToNormalize,
        mappingConfig
      );
    }

    const durationMs = Date.now() - startTime;

    // 6. Ghi Usage Log
    try {
      await db.insert(connectHubUsageLogs).values({
        connectionId: connection.id,
        teamId,
        callerModule,
        appSlug: connection.appSlug,
        actionName: actionSlug,
        status: executionResult.success ? 'success' : 'error',
        durationMs,
        errorMessage: executionResult.error || null,
        createdAt: new Date(),
        isTest: isTest ? 1 : 0
      });
    } catch (logDbError) {
      console.error('Lỗi khi ghi nhận usage log vào database:', logDbError);
    }

    // 7. Cập nhật trạng thái sử dụng của Connection
    try {
      await db
        .update(connectHubConnections)
        .set({
          lastUsedAt: new Date(),
          status: executionResult.success ? 'connected' : 'error',
          updatedAt: new Date()
        })
        .where(eq(connectHubConnections.id, connection.id));
    } catch (updateConnError) {
      console.error('Lỗi khi cập nhật trạng thái connection:', updateConnError);
    }

    return {
      success: executionResult.success,
      data: finalData,
      error: executionResult.error,
      meta: {
        durationMs,
        appSlug: connection.appSlug,
        actionSlug,
        callerModule
      }
    };

  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('Connector Service Error:', error);
    const errMessage = error.message || 'Lỗi hệ thống khi thực thi API action.';

    // Ghi nhận log lỗi runtime exception ngoài luồng
    try {
      await db.insert(connectHubUsageLogs).values({
        connectionId: connectionId,
        teamId,
        callerModule,
        appSlug: connection?.appSlug || 'unknown',
        actionName: actionSlug,
        status: 'error',
        durationMs,
        errorMessage: errMessage,
        createdAt: new Date(),
        isTest: isTest ? 1 : 0
      });
    } catch (logDbError) {
      console.error('Lỗi khi ghi nhận log exception vào database:', logDbError);
    }

    return {
      success: false,
      error: errMessage,
      meta: {
        durationMs,
        appSlug: connection?.appSlug || 'unknown',
        actionSlug,
        callerModule
      }
    };
  }
}
