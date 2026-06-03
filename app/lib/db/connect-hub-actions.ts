'use server';

import { and, eq } from 'drizzle-orm';
import { db } from './drizzle';
import {
  connectHubConnections,
  connectHubUsageLogs,
  teamMembers,
  teams,
  activityLogs
} from './schema';
import { getUser } from './queries';
import { encryptField, decryptField } from '../sim-crypto';
import { executeAction } from '../connect-hub/connectors/engine';
import { normalizeData } from '../connect-hub/utils/mapper';
import { getMappingConfigAction } from './connect-hub-mapping-actions';
import { revalidatePath } from 'next/cache';

// Helper kiểm tra quyền truy cập không gian làm việc và kích hoạt app Connect Hub
async function verifyConnectHubAccess(targetTeamId: number, requireRole?: string[]) {
  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }

  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, targetTeamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (member.length === 0) {
    throw new Error('Không có quyền truy cập Không gian làm việc này');
  }

  if (requireRole && !requireRole.includes(member[0].role)) {
    throw new Error('Bạn không có quyền thực hiện hành động này');
  }

  // App activation gating
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, targetTeamId))
    .limit(1);

  if (team.length === 0 || team[0].deletedAt) {
    throw new Error('Không gian làm việc không tồn tại hoặc đã bị xóa');
  }

  const activatedApps = (team[0].activatedApps as string[]) || [];
  if (!activatedApps.includes('connect-hub')) {
    throw new Error(`Ứng dụng Connect Hub chưa được kích hoạt trong Không gian này`);
  }

  return { user, role: member[0].role };
}

function sanitizeError(error: any): string {
  return error?.message || 'Đã xảy ra sự cố kỹ thuật';
}

/**
 * Tạo kết nối tích hợp API mới (Mã hóa credentials an toàn bằng AES-256-GCM)
 */
export async function createConnectionAction(
  teamId: number,
  data: {
    appSlug: string;
    appName: string;
    connectionName: string;
    authType: string;
    credentials: Record<string, string>;
  }
) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    // Mã hóa toàn bộ credentials object sang JSON String rồi mã hóa đối xứng
    const credentialsJson = JSON.stringify(data.credentials);
    const encryptedCredentials = encryptField(credentialsJson) as string;

    const [inserted] = await db
      .insert(connectHubConnections)
      .values({
        teamId,
        userId: user.id,
        appSlug: data.appSlug,
        appName: data.appName,
        connectionName: data.connectionName,
        authType: data.authType,
        encryptedCredentials,
        status: 'connected',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Ghi vào nhật ký hệ thống
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo kết nối API mới: ${data.appName} (${data.connectionName})`
    });


    revalidatePath('/connect-hub/dashboard');
    revalidatePath('/connect-hub/connections');

    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating API connection:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Xóa/Ngắt kết nối tích hợp API
 */
export async function deleteConnectionAction(teamId: number, connectionId: number) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager']);

    const [deleted] = await db
      .delete(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, connectionId)
        )
      )
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy kết nối hoặc không có quyền xóa.' };
    }

    // Ghi log hoạt động
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã ngắt kết nối tích hợp API: ${deleted.appName} (${deleted.connectionName})`
    });


    revalidatePath('/connect-hub/dashboard');
    revalidatePath('/connect-hub/connections');

    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting API connection:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy thông tin kết nối và giải mã credentials (chỉ cho phép owner, admin)
 */
export async function getConnectionForEditAction(teamId: number, connectionId: number) {
  try {
    // Chỉ cho phép owner hoặc admin
    await verifyConnectHubAccess(teamId, ['owner', 'admin']);

    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, connectionId)
        )
      )
      .limit(1);

    if (!connection) {
      return { success: false, error: 'Không tìm thấy kết nối.' };
    }

    // Giải mã credential
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    return { 
      success: true, 
      data: {
        ...connection,
        credentials
      }
    };
  } catch (error: any) {
    console.error('Error fetching API connection for edit:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Cập nhật tên kết nối và Credentials mới
 */
export async function updateConnectionAction(
  teamId: number,
  connectionId: number,
  data: {
    connectionName: string;
    credentials: Record<string, string>;
  }
) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin']);

    // Mã hóa lại credentials mới
    const credentialsJson = JSON.stringify(data.credentials);
    const encryptedCredentials = encryptField(credentialsJson) as string;

    const [updated] = await db
      .update(connectHubConnections)
      .set({
        connectionName: data.connectionName,
        encryptedCredentials,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, connectionId)
        )
      )
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy kết nối hoặc không có quyền.' };
    }

    // Ghi log hoạt động
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật cấu hình kết nối API: ${updated.appName} (${updated.connectionName})`
    });


    revalidatePath('/connect-hub/dashboard');
    revalidatePath('/connect-hub/connections');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating API connection:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Test kết nối API trực tiếp (Giải mã credential và gọi API ngoài kiểm thử)
 */
export async function testConnectionAction(teamId: number, connectionId: number) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, connectionId)
        )
      )
      .limit(1);

    if (!connection) {
      return { success: false, error: 'Không tìm thấy kết nối.' };
    }

    // Giải mã credential
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    let testSuccess = true;
    let errorMessage = '';

    try {
      if (connection.appSlug === 'custom-http') {
        const baseUrl = (credentials.baseUrl || '').trim();
        if (!baseUrl) throw new Error('Thiếu Base URL của API.');
        
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        
        if (credentials.authMethod === 'bearer_token' && credentials.token) {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        }

        const res = await fetch(`${cleanBaseUrl}/`, { 
          method: 'GET', 
          headers,
          signal: AbortSignal.timeout(6000) // Timeout sau 6s tránh treo Vercel Serverless
        }).catch(() => null);

        if (!res) {
          throw new Error('Không thể ping kết nối tới Base URL. Vui lòng kiểm tra lại URL hoặc trạng thái mạng.');
        }
      } else if (connection.appSlug === 'kiotviet') {
        // Thực hiện OAuth lấy access token thử nghiệm
        const retailer = (credentials.retailer || '').trim();
        const clientId = (credentials.clientId || '').trim();
        const clientSecret = (credentials.clientSecret || '').trim();

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('scopes', 'PublicApi.Access');

        const response = await fetch('https://id.kiotviet.vn/connect/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`KiotViet OAuth thất bại: ${errData.error_description || response.statusText}`);
        }
      } else {
        // Giả lập test kết nối cho các app khác (Sheets, Gmail, Telegram)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err: any) {
      testSuccess = false;
      errorMessage = err.message || 'Lỗi kiểm thử kết nối API.';
    }

    // Cập nhật trạng thái trong database
    await db
      .update(connectHubConnections)
      .set({
        status: testSuccess ? 'connected' : 'error',
        lastTestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(connectHubConnections.id, connectionId));



    if (!testSuccess) {
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error testing API connection:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Thực thi một Action của Connector on-demand (sử dụng được cho cả các MVP khác)
 */
export async function runActionAction(
  teamId: number,
  data: {
    connectionId: number;
    actionSlug: string;
    input: Record<string, any>;
    callerModule?: string;
    normalize?: boolean;
  }
) {
  const startTime = Date.now();
  let connection: any = null;
  
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const [fetchedConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, teamId),
          eq(connectHubConnections.id, data.connectionId)
        )
      )
      .limit(1);

    if (!fetchedConnection) {
      return { success: false, error: 'Không tìm thấy kết nối API thích hợp.' };
    }
    
    connection = fetchedConnection;

    // Giải mã credential
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // Thực thi action qua connector engine
    const executionResult = await executeAction(
      connection.appSlug,
      credentials,
      data.actionSlug,
      data.input
    );

    if (data.normalize && executionResult.success) {
      const configRes = await getMappingConfigAction(connection.appSlug);
      const mappingConfig: any = configRes.success ? configRes.data : {};

      executionResult.data = normalizeData(
        connection.appSlug,
        data.actionSlug,
        executionResult.data,
        mappingConfig
      );
    }

    const durationMs = Date.now() - startTime;

    // Ghi Usage Log
    await db.insert(connectHubUsageLogs).values({
      connectionId: connection.id,
      teamId,
      callerModule: data.callerModule || 'connect-hub-ui',
      appSlug: connection.appSlug,
      actionName: data.actionSlug,
      status: executionResult.success ? 'success' : 'error',
      durationMs,
      errorMessage: executionResult.error || null,
      createdAt: new Date()
    });

    // Cập nhật mốc sử dụng cho Connection
    await db
      .update(connectHubConnections)
      .set({
        lastUsedAt: new Date(),
        status: executionResult.success ? 'connected' : 'error',
        updatedAt: new Date()
      })
      .where(eq(connectHubConnections.id, connection.id));


    revalidatePath('/connect-hub/logs');
    revalidatePath('/connect-hub/dashboard');
    revalidatePath('/connect-hub/connections');

    return {
      success: executionResult.success,
      data: executionResult.data,
      error: executionResult.error
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('Error running API action:', error);
    
    // Ghi Usage Log lỗi vào DB khi xảy ra Exception ngoài luồng
    try {
      await db.insert(connectHubUsageLogs).values({
        connectionId: data.connectionId,
        teamId,
        callerModule: data.callerModule || 'connect-hub-ui',
        appSlug: connection?.appSlug || 'unknown',
        actionName: data.actionSlug,
        status: 'error',
        durationMs,
        errorMessage: sanitizeError(error),
        createdAt: new Date()
      });
    } catch (logDbError) {
      console.error('Lỗi khi ghi nhận log lỗi vào database:', logDbError);
    }
    
    return { success: false, error: sanitizeError(error) };
  }
}
