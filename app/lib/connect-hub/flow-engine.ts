import { eq, and } from 'drizzle-orm';
import { db } from '../db/drizzle';
import {
  connectHubFlows,
  connectHubFlowSteps,
  connectHubFlowRuns
} from '../db/schema';
import { runConnectorAction } from './connector-service';
import { runCoreLogic } from './connectors/runners/core-logic';

/**
 * Trích xuất giá trị từ path dạng lồng nhau (e.g. "order.items[0].name")
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  // Tách path bằng dấu chấm (.) hoặc ngoặc vuông ([ và ])
  const segments = path.split(/[.[\]]/).filter(Boolean);
  let current = obj;
  
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    
    // Nếu segment là số nguyên thì truy cập mảng
    if (/^\d+$/.test(segment)) {
      current = current[parseInt(segment, 10)];
    } else {
      current = current[segment];
    }
  }
  return current;
}

/**
 * Nội suy giá trị của 1 chuỗi template chứa placeholder {{...}}
 */
function interpolateValue(value: string, context: { payload: any; headers: any }): any {
  if (typeof value !== 'string') return value;

  // Regex phát hiện các placeholder dạng {{payload.xxx}} hoặc {{headers.yyy}}
  const regex = /\{\{([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_-]+(?:\[\d+\])?)*)\}\}/g;

  // UX tinh tế: Nếu toàn bộ chuỗi chỉ là 1 placeholder duy nhất, ví dụ: "{{payload.order}}"
  // Chúng ta trả về trực tiếp giá trị gốc (object, number, array...) thay vì ép kiểu về string
  const trimmed = value.trim();
  const isSinglePlaceholder = trimmed.startsWith('{{') && trimmed.endsWith('}}') && (trimmed.match(/\{\{/g) || []).length === 1;
  
  if (isSinglePlaceholder) {
    const matched = trimmed.match(/^\{\{([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_-]+(?:\[\d+\])?)*)\}\}$/);
    if (matched) {
      const path = matched[1];
      return getNestedValue(context, path);
    }
  }

  // Trường hợp chuỗi văn bản hỗn hợp (e.g. "Đơn hàng {{payload.code}} đã tạo")
  return value.replace(regex, (match, path) => {
    const val = getNestedValue(context, path);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '[Object]';
      }
    }
    return String(val);
  });
}

/**
 * Đệ quy nội suy cho toàn bộ object hoặc array của input mapping
 */
function interpolateTemplate(template: any, context: { payload: any; headers: any }, depth: number = 0): any {
  if (depth > 50) {
    throw new Error('Độ sâu của cấu hình dữ liệu vượt quá giới hạn an toàn (max 50)');
  }

  if (template === null || template === undefined) return template;

  if (typeof template === 'string') {
    return interpolateValue(template, context);
  }

  if (Array.isArray(template)) {
    return template.map(item => interpolateTemplate(item, context, depth + 1));
  }

  if (typeof template === 'object') {
    const result: any = {};
    for (const key in template) {
      if (Object.prototype.hasOwnProperty.call(template, key)) {
        result[key] = interpolateTemplate(template[key], context, depth + 1);
      }
    }
    return result;
  }

  return template; // number, boolean...
}

/**
 * Cắt ngắn chuỗi nếu dài quá độ dài cho trước
 */
function truncate(str: string, max: number = 500): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

/**
 * Thực thi các flow tự động khi webhook nhận được payload
 * Luồng chạy ở chế độ background (non-blocking) đối với Webhook Gateway
 */
export async function executeWebhookFlows(
  teamId: number,
  webhookId: string,
  webhookLogId: number,
  payload: any,
  headers: any
): Promise<void> {
  try {
    // 1. Tìm các flow đang active liên kết với webhook này
    const activeFlows = await db
      .select()
      .from(connectHubFlows)
      .where(
        and(
          eq(connectHubFlows.webhookId, webhookId),
          eq(connectHubFlows.teamId, teamId),
          eq(connectHubFlows.status, 'active')
        )
      );

    if (activeFlows.length === 0) {
      return;
    }

    const context = { payload, headers };

    // Chạy song song các flow cùng thuộc về webhook này
    await Promise.all(activeFlows.map(async (flow) => {
      // 2. Tạo bản ghi Flow Run ở trạng thái 'running'
      const [run] = await db
        .insert(connectHubFlowRuns)
        .values({
          flowId: flow.id,
          webhookLogId: webhookLogId,
          teamId: teamId,
          status: 'running',
          stepResults: []
        })
        .returning();

      // 3. Lấy danh sách các step cấu hình của flow, sắp xếp tuần tự
      const steps = await db
        .select()
        .from(connectHubFlowSteps)
        .where(eq(connectHubFlowSteps.flowId, flow.id))
        .orderBy(connectHubFlowSteps.step);

      const stepResults: any[] = [];
      let flowStatus = 'success';
      let flowError: string | null = null;

      for (const step of steps) {
        const stepStart = Date.now();
        try {
          // 4. Giải mã / Nội suy input mapping bằng payload
          const resolvedInput = interpolateTemplate(step.inputMapping || {}, context);

          // 5. Gọi hàm thực thi Connector Action (hoặc chạy Core Logic nội tại)
          const isCoreLogic = step.appSlug === 'core-logic';
          let result;
          if (isCoreLogic) {
            result = await runCoreLogic(step.actionSlug, resolvedInput);
          } else {
            result = await runConnectorAction({
              teamId,
              connectionId: step.connectionId,
              actionSlug: step.actionSlug,
              input: resolvedInput,
              callerModule: 'webhook-flow',
              isTest: false
            });
          }

          const durationMs = Date.now() - stepStart;
          const success = result.success;
          const error = result.error || null;
          
          let dataPreview = '';
          if (result.data) {
            try {
              dataPreview = truncate(JSON.stringify(result.data), 500);
            } catch {
              dataPreview = '[Data could not be serialized]';
            }
          }

          stepResults.push({
            step: step.step,
            appSlug: step.appSlug,
            actionSlug: step.actionSlug,
            success,
            durationMs,
            error,
            dataPreview
          });

          // Nếu bước này thất bại, dừng ngay lập tức (fail-fast)
          if (!success) {
            flowStatus = 'failed';
            flowError = `Bước ${step.step} (${step.actionSlug}) thất bại: ${error}`;
            break;
          }
        } catch (err: any) {
          const durationMs = Date.now() - stepStart;
          stepResults.push({
            step: step.step,
            appSlug: step.appSlug,
            actionSlug: step.actionSlug,
            success: false,
            durationMs,
            error: err.message,
            dataPreview: null
          });
          flowStatus = 'failed';
          flowError = `Bước ${step.step} exception: ${err.message}`;
          break;
        }
      }

      // 6. Lưu log kết quả chạy flow
      await db
        .update(connectHubFlowRuns)
        .set({
          status: flowStatus,
          finishedAt: new Date(),
          stepResults: stepResults,
          errorMessage: flowError
        })
        .where(eq(connectHubFlowRuns.id, run.id));
    }));
  } catch (err) {
    console.error(`[flow-engine] Lỗi nghiêm trọng khi điều phối chạy webhook flows:`, err);
  }
}
