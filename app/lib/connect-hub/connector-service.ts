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
import { redactResponsePreview } from './utils/log-redactor';

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

  if ((global as any).mockRunConnectorAction) {
    return (global as any).mockRunConnectorAction(params);
  }

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
        errorMessage: executionResult.error ? redactResponsePreview(executionResult.error) : null,
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
        errorMessage: redactResponsePreview(errMessage),
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

/**
 * STREAM CONNECTOR ACTION
 * Dùng cho các Request yêu cầu luồng dữ liệu liên tục (Server-Sent Events)
 * Ví dụ: AI Chat Streaming, Video Render Progress Tracking
 * Hỗ trợ Proxy trực tiếp tới các LLMs như OpenAI, Deepseek, Gemini
 */
export async function streamConnectorAction(params: {
  teamId: number;
  connectionId: number;
  actionSlug: string;
  input: Record<string, any>;
  callerModule: string;
  isTest?: boolean;
}): Promise<{
  success: boolean;
  streamResponse?: Response; // Đối tượng HTTP Response dùng để trả thẳng về Client
  data?: any; // Kết quả trả về nếu không dùng stream hoặc là fallback JSON
  error?: string;
}> {
  const startTime = Date.now();
  const { teamId, connectionId, actionSlug, input, callerModule, isTest = false } = params;

  try {
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

    if (!connection || connection.status !== 'connected') {
      return { success: false, error: 'Kết nối API không tồn tại hoặc gặp sự cố.' };
    }

    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    let apiUrl = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // -------------------------------------------------------------
    // CHAT COMPLETION ACTION (AI STREAM)
    // -------------------------------------------------------------
    if (actionSlug === 'chat_completion') {
      const payloadModel = input.model || 'gpt-3.5-turbo';
      const messages = input.messages || [];
      const temperature = input.temperature ?? 0.7;
      const stream = input.stream ?? true;

      if (connection.appSlug === 'openai') {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        if (credentials.organizationId) {
          headers['OpenAI-Organization'] = credentials.organizationId;
        }
      } else if (connection.appSlug === 'deepseek') {
        apiUrl = 'https://api.deepseek.com/chat/completions';
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      } else if (connection.appSlug === 'chiasegpu') {
        apiUrl = 'https://api.vilao.ai/v1/chat/completions';
        const apiKey = process.env.CHIASEGPU_API_KEY || 'sk-85ab4cf3cf86c3ed380f5b9f3f27d24647e2fd3330a3b0b50ec85afd522b12e4';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (connection.appSlug === 'gemini') {
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      } else if (connection.appSlug === 'anthropic') {
        if (stream) {
          return { success: false, error: 'Claude (Anthropic) trực tiếp qua API chuẩn chưa hỗ trợ proxy streaming. Vui lòng thử model khác.' };
        }
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = credentials.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: payloadModel,
            messages: messages.filter((m: any) => m.role !== 'system'),
            system: messages.find((m: any) => m.role === 'system')?.content,
            max_tokens: 4096,
            temperature
          })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { success: false, error: err.error?.message || response.statusText };
        }
        const anthropicData = await response.json();
        return {
          success: true,
          data: {
            id: anthropicData.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: payloadModel,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: anthropicData.content[0]?.text || '' },
              finish_reason: 'stop'
            }]
          }
        };
      } else {
        return { success: false, error: `Provider ${connection.appSlug} chưa được hỗ trợ stream proxy.` };
      }

      // Fetch request chung
      const providerResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: payloadModel,
          messages,
          temperature,
          stream
        })
      });

      if (!providerResponse.ok) {
        const err = await providerResponse.json().catch(() => ({}));
        return { success: false, error: err.error?.message || providerResponse.statusText };
      }

      // Ghi log chung (vì stream response không dễ parse body json)
      db.insert(connectHubUsageLogs).values({
        connectionId: connection.id,
        teamId,
        callerModule,
        appSlug: connection.appSlug,
        actionName: actionSlug,
        status: 'success',
        durationMs: Date.now() - startTime,
        createdAt: new Date(),
        isTest: isTest ? 1 : 0
      }).catch(console.error);

      if (stream) {
        const streamResponse = new Response(providerResponse.body, {
          status: providerResponse.status,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
        return { success: true, streamResponse };
      } else {
        const data = await providerResponse.json();
        return { success: true, data };
      }
    }

    return { success: false, error: `Action ${actionSlug} không hỗ trợ stream trong Connect Hub.` };

  } catch (error: any) {
    console.error('Connector Service Stream Error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống khi khởi tạo stream.' };
  }
}
