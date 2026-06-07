'use server';

import { and, eq, desc } from 'drizzle-orm';
import { db } from './drizzle';
import {
  connectHubConnections,
  connectHubUsageLogs,
  teamMembers,
  teams,
  activityLogs,
  connectHubWebhooks,
  connectHubWebhookLogs,
  connectHubFlows,
  connectHubFlowSteps,
  connectHubFlowRuns
} from './schema';
import * as crypto from 'crypto';
import { getUser } from './queries';
import { encryptField, decryptField } from '../sim-crypto';
import { getMappingConfigAction } from './connect-hub-mapping-actions';
import { revalidatePath } from 'next/cache';
import { runConnectorAction } from '../connect-hub/connector-service';
import { isInternalUrl } from '../connect-hub/connectors/runners/custom-http';
import { getConnectorBySlug } from '../connect-hub/connectors/registry';
import { verifyGenericHttpConnection } from '../connect-hub/connectors/runners/generic-http';

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
    revalidatePath(`/connect-hub/t/${teamId}/dashboard`);
    revalidatePath(`/connect-hub/t/${teamId}/connections`);

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
    revalidatePath(`/connect-hub/t/${teamId}/dashboard`);
    revalidatePath(`/connect-hub/t/${teamId}/connections`);

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
    revalidatePath(`/connect-hub/t/${teamId}/dashboard`);
    revalidatePath(`/connect-hub/t/${teamId}/connections`);

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
        } else if (connection.appSlug === 'facebook' || connection.appSlug === 'meta') {
          if (!credentials.accessToken) throw new Error('Vui lòng nhập Access Token');
          const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id`, {
             headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
          });
          if (!res.ok) {
             const errData = await res.json().catch(() => ({}));
             throw new Error(errData.error?.message || 'Token Meta không hợp lệ hoặc đã hết hạn.');
          }
        } else {
          const connector = getConnectorBySlug(connection.appSlug);
          if (connector?.runtimeType === 'generic_http') {
            const verifyResult = await verifyGenericHttpConnection(connection.appSlug, credentials);
            if (!verifyResult.success) {
              throw new Error(verifyResult.error || 'Kiểm thử kết nối thất bại.');
            }
          } else {
            // Giả lập test kết nối cho các app khác (Sheets, Gmail, Telegram)
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
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
 * Ping kiểm thử kết nối API từ giao diện form (trước khi lưu chính thức)
 */
export async function pingConnectionPreviewAction(
  teamId: number,
  appSlug: string,
  credentials: Record<string, any>
) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    if (appSlug === 'custom-http') {
      const baseUrl = (credentials.baseUrl || '').trim();
      if (!baseUrl) throw new Error('Vui lòng nhập Base URL.');

      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const fullUrl = `${cleanBaseUrl}/`;

      if (isInternalUrl(fullUrl)) {
        throw new Error('Bảo mật: Từ chối truy cập vào địa chỉ IP nội bộ.');
      }

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (credentials.authMethod === 'bearer_token' && credentials.token) {
        headers['Authorization'] = `Bearer ${credentials.token}`;
      }

      const res = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000)
      }).catch((err) => {
        console.error('Fetch error in pingConnectionPreview:', err);
        return null;
      });

      if (!res) {
        throw new Error('Không thể ping kết nối tới Base URL. Vui lòng kiểm tra lại URL hoặc trạng thái mạng.');
      }
    } else if (appSlug === 'kiotviet') {
      const retailer = (credentials.retailer || '').trim();
      const clientId = (credentials.clientId || '').trim();
      const clientSecret = (credentials.clientSecret || '').trim();

      if (!retailer || !clientId || !clientSecret) {
        throw new Error('Vui lòng điền đầy đủ Tên gian hàng, Client ID và Client Secret.');
      }

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
    } else if (appSlug === 'facebook' || appSlug === 'meta') {
      const token = credentials.accessToken;
      if (!token) throw new Error('Vui lòng nhập Access Token');
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.error?.message || 'Token Meta không hợp lệ hoặc đã hết hạn.');
      }
    } else {
      const connector = getConnectorBySlug(appSlug);
      if (connector?.runtimeType === 'generic_http') {
        const verifyResult = await verifyGenericHttpConnection(appSlug, credentials);
        if (!verifyResult.success) {
          throw new Error(verifyResult.error || 'Kiểm thử kết nối thất bại.');
        }
      } else {
        // Giả lập delay test cho các app khác (Sheets, Gmail, Telegram)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in pingConnectionPreviewAction:', error);
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
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const result = await runConnectorAction({
      teamId,
      connectionId: data.connectionId,
      actionSlug: data.actionSlug,
      input: data.input,
      callerModule: data.callerModule || 'connect-hub-ui',
      normalize: data.normalize,
    });

    // Revalidate UI paths
    revalidatePath('/connect-hub/logs');
    revalidatePath('/connect-hub/dashboard');
    revalidatePath('/connect-hub/connections');
    revalidatePath(`/connect-hub/t/${teamId}/logs`);
    revalidatePath(`/connect-hub/t/${teamId}/dashboard`);
    revalidatePath(`/connect-hub/t/${teamId}/connections`);

    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error: any) {
    console.error('Error running API action in server action:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống khi thực thi Action.' };
  }
}

/**
 * Lấy thống kê Tỷ lệ kết nối thành công (API Health Monitor)
 */
export async function getConnectorHealthStats(teamId: number, appSlug: string) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const logs = await db
      .select({ 
        status: connectHubUsageLogs.status, 
        durationMs: connectHubUsageLogs.durationMs 
      })
      .from(connectHubUsageLogs)
      .where(
        and(
          eq(connectHubUsageLogs.teamId, teamId),
          eq(connectHubUsageLogs.appSlug, appSlug)
        )
      );

    const totalRequests = logs.length;
    if (totalRequests === 0) {
      return { success: true, data: { totalRequests: 0, successRate: 0, avgDuration: 0 } };
    }

    const successfulRequests = logs.filter(l => l.status === 'success').length;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    const successfulLogs = logs.filter(l => l.status === 'success' && l.durationMs);
    const avgDuration = successfulLogs.length > 0 
      ? successfulLogs.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / successfulLogs.length
      : 0;

    return { 
      success: true, 
      data: { 
        totalRequests, 
        successRate: Number(successRate.toFixed(1)), 
        avgDuration: Math.round(avgDuration) 
      } 
    };
  } catch (error: any) {
    console.error('Error fetching connector health stats:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Gọi trực tiếp API lấy danh sách Pages của Pancake bằng Token truyền vào (chưa cần lưu DB)
 */
export async function fetchPancakePagesDirectlyAction(token: string) {
  try {
    if (!token) throw new Error('Token không được để trống.');
    
    // Gọi API V1 của Pancake
    const res = await fetch(`https://pages.fm/api/v1/pages?access_token=${token.trim()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn.');
      }
      throw new Error(`Lỗi kết nối Pancake (${res.status})`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error('Không thể đọc dữ liệu Pages từ Pancake API.');
    }

    // Pancake V1 API có thể trả về pages trong json.categorized.activated
    let rawPages = [];
    if (json.categorized && Array.isArray(json.categorized.activated)) {
      rawPages = json.categorized.activated;
      // Cộng thêm các page chưa kích hoạt nếu cần: if (Array.isArray(json.categorized.unactivated)) rawPages = rawPages.concat(json.categorized.unactivated);
    } else if (Array.isArray(json.pages)) {
      rawPages = json.pages;
    } else if (Array.isArray(json.data)) {
      rawPages = json.data;
    } else {
      throw new Error('Định dạng API trả về không hợp lệ (thiếu categorized.activated).');
    }

    // Mapping sang format đơn giản để UI dễ đọc
    const pages = rawPages.map((p: any) => ({
      id: p.id,
      name: p.name || 'Fanpage không tên',
      category: p.category || ''
    }));

    return { success: true, data: pages };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi lấy danh sách Pages.' };
  }
}

import * as fs from 'fs';
import * as path from 'path';

/**
 * Lấy chi tiết thông tin API schema của một Connector từ Catalog (đọc catalog-detail.json)
 */
export async function getConnectorDetailAction(teamId: number, slug: string) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);
    
    const detailPath = path.join(process.cwd(), 'lib', 'connect-hub', 'connectors', 'generated', 'catalog-detail.json');
    if (!fs.existsSync(detailPath)) {
      return { success: false, error: 'Dữ liệu catalog chi tiết chưa được khởi tạo.' };
    }
    
    const fileContent = fs.readFileSync(detailPath, 'utf-8');
    const detailData = JSON.parse(fileContent);
    const connector = detailData[slug];
    
    if (!connector) {
      return { success: false, error: 'Không tìm thấy thông tin chi tiết cho ứng dụng này.' };
    }
    
    return { success: true, data: connector };
  } catch (error: any) {
    console.error('Error fetching connector detail:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Tạo Webhook mới nhận dữ liệu Incoming cho team
 */
export async function createWebhookAction(
  teamId: number,
  data: {
    appSlug: string;
    label: string;
  }
) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager']);

    // Sinh secret token ngẫu nhiên
    const plainSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = encryptField(plainSecret) as string;

    const [inserted] = await db
      .insert(connectHubWebhooks)
      .values({
        teamId,
        appSlug: data.appSlug,
        label: data.label,
        secretHash,
        status: 'active',
      })
      .returning();

    // Ghi log hoạt động
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã tạo Webhook mới cho: ${data.appSlug} (${data.label})`,
    });

    revalidatePath(`/connect-hub/t/${teamId}/webhooks`);

    return { success: true, data: { webhook: inserted, plainSecret } };
  } catch (error: any) {
    console.error('Error creating Webhook:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy danh sách Webhooks của một team
 */
export async function listWebhooksAction(teamId: number) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const webhooks = await db
      .select()
      .from(connectHubWebhooks)
      .where(eq(connectHubWebhooks.teamId, teamId))
      .orderBy(desc(connectHubWebhooks.createdAt));

    return { success: true, data: webhooks };
  } catch (error: any) {
    console.error('Error listing Webhooks:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Bật/Tắt Webhook
 */
export async function toggleWebhookAction(teamId: number, webhookId: string, status: 'active' | 'paused') {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager']);

    const [updated] = await db
      .update(connectHubWebhooks)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(connectHubWebhooks.teamId, teamId), eq(connectHubWebhooks.id, webhookId)))
      .returning();

    if (!updated) {
      return { success: false, error: 'Không tìm thấy Webhook hoặc không có quyền.' };
    }

    // Ghi log
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã ${status === 'active' ? 'kích hoạt lại' : 'tạm dừng'} Webhook: ${updated.label}`,
    });

    revalidatePath(`/connect-hub/t/${teamId}/webhooks`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error toggling Webhook:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Xóa Webhook
 */
export async function deleteWebhookAction(teamId: number, webhookId: string) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager']);

    const [deleted] = await db
      .delete(connectHubWebhooks)
      .where(and(eq(connectHubWebhooks.teamId, teamId), eq(connectHubWebhooks.id, webhookId)))
      .returning();

    if (!deleted) {
      return { success: false, error: 'Không tìm thấy Webhook hoặc không có quyền.' };
    }

    // Ghi log
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã xóa Webhook: ${deleted.label} (${deleted.appSlug})`,
    });

    revalidatePath(`/connect-hub/t/${teamId}/webhooks`);

    return { success: true, data: deleted };
  } catch (error: any) {
    console.error('Error deleting Webhook:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy lịch sử Logs của 1 webhook
 */
export async function getWebhookLogsAction(teamId: number, webhookId: string, limit: number = 20) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const logs = await db
      .select()
      .from(connectHubWebhookLogs)
      .where(and(eq(connectHubWebhookLogs.teamId, teamId), eq(connectHubWebhookLogs.webhookId, webhookId)))
      .orderBy(desc(connectHubWebhookLogs.processedAt))
      .limit(limit);

    return { success: true, data: logs };
  } catch (error: any) {
    console.error('Error fetching Webhook logs:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy cấu hình Flow của Webhook (Auto-create nếu chưa tồn tại)
 */
export async function getWebhookFlowAction(teamId: number, webhookId: string) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    // 1. Kiểm tra xem flow đã tồn tại chưa
    let [flow] = await db
      .select()
      .from(connectHubFlows)
      .where(
        and(
          eq(connectHubFlows.webhookId, webhookId),
          eq(connectHubFlows.teamId, teamId)
        )
      )
      .limit(1);

    // 2. Nếu chưa có, tiến hành auto-create flow
    if (!flow) {
      const [newFlow] = await db
        .insert(connectHubFlows)
        .values({
          teamId,
          webhookId,
          name: 'Flow tự động',
          status: 'active'
        })
        .returning();
      
      flow = newFlow;
    }

    // 3. Lấy tất cả các steps của flow
    const steps = await db
      .select()
      .from(connectHubFlowSteps)
      .where(eq(connectHubFlowSteps.flowId, flow.id))
      .orderBy(connectHubFlowSteps.step);

    return { success: true, data: { flow, steps } };
  } catch (error: any) {
    console.error('Error fetching Webhook flow:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lưu các steps của một Flow
 */
export async function saveFlowStepsAction(
  teamId: number,
  flowId: number,
  steps: { connectionId: number; appSlug: string; actionSlug: string; inputMapping: any }[]
) {
  try {
    const { user } = await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager']);

    // 1. Kiểm tra tính sở hữu của flow
    const [flow] = await db
      .select()
      .from(connectHubFlows)
      .where(and(eq(connectHubFlows.id, flowId), eq(connectHubFlows.teamId, teamId)))
      .limit(1);

    if (!flow) {
      return { success: false, error: 'Không tìm thấy Flow cấu hình hoặc bạn không có quyền.' };
    }

    // 2. Cập nhật steps bằng transaction
    await db.transaction(async (tx) => {
      // Xóa tất cả các steps cũ
      await tx.delete(connectHubFlowSteps).where(eq(connectHubFlowSteps.flowId, flowId));

      // Thêm các steps mới
      if (steps.length > 0) {
        const valuesToInsert = steps.map((s, idx) => ({
          flowId,
          step: idx + 1,
          connectionId: s.connectionId || 0, // 0 = built-in, không cần connection
          appSlug: s.appSlug,
          actionSlug: s.actionSlug,
          inputMapping: s.inputMapping || {}
        }));
        await tx.insert(connectHubFlowSteps).values(valuesToInsert);
      }
    });

    // 3. Ghi activity log
    await db.insert(activityLogs).values({
      teamId,
      userId: user.id,
      action: `đã cập nhật cấu hình Flow (${steps.length} bước) cho Webhook ID: ${flow.webhookId}`,
    });

    revalidatePath(`/connect-hub/t/${teamId}/webhooks`);

    return { success: true };
  } catch (error: any) {
    console.error('Error saving Flow steps:', error);
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Lấy lịch sử thực thi Flow runs
 */
export async function getFlowRunsAction(teamId: number, flowId: number, limit: number = 15) {
  try {
    await verifyConnectHubAccess(teamId, ['owner', 'admin', 'manager', 'member']);

    const runs = await db
      .select()
      .from(connectHubFlowRuns)
      .where(and(eq(connectHubFlowRuns.flowId, flowId), eq(connectHubFlowRuns.teamId, teamId)))
      .orderBy(desc(connectHubFlowRuns.createdAt))
      .limit(limit);

    return { success: true, data: runs };
  } catch (error: any) {
    console.error('Error fetching Flow runs:', error);
    return { success: false, error: sanitizeError(error) };
  }
}


