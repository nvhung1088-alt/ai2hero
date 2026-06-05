import { db } from '../db/drizzle';
import { heroReportSchedules, heroReportRuns, connectHubConnections } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { runConnectorAction } from '../connect-hub/connector-service';
import { 
  aggregateInventoryMetrics, 
  aggregateCustomerAnalysis
} from './aggregator';
import { getNextCronOccurrence } from '../db/hero-report-actions';
import { getCapabilities } from '../connect-hub/capabilities';
import { 
  CAPABILITY_RENDERERS, 
  DEFAULT_CAPABILITIES, 
  maskPII 
} from './report-renderers';
export { maskPII };

/**
 * Lấy nhãn thời gian và filter cho khoảng thời gian báo cáo
 */
function getReportDateStrings(dateRange: string) {
  // Helper lấy string YYYY-MM-DD theo giờ VN
  const getVNString = (d: Date) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  };
  
  const now = new Date();
  let label = '';
  let start = new Date(now);
  let end = new Date(now);

  if (dateRange === 'today') {
    label = `Hôm nay (${getVNString(now)})`;
  } else if (dateRange === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    label = `Hôm qua (${getVNString(start)})`;
  } else if (dateRange === 'this_week') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    label = `Tuần này (${getVNString(start)} — ${getVNString(end)})`;
  } else if (dateRange === 'last_7_days') {
    start.setDate(start.getDate() - 6);
    label = `7 ngày gần đây (${getVNString(start)} — ${getVNString(end)})`;
  } else if (dateRange === 'last_30_days') {
    start.setDate(start.getDate() - 29);
    label = `30 ngày gần đây (${getVNString(start)} — ${getVNString(end)})`;
  } else if (dateRange === 'this_month') {
    start.setDate(1);
    label = `Tháng này (${getVNString(start)} — ${getVNString(end)})`;
  } else if (dateRange === 'last_month') {
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    end.setDate(0);
    label = `Tháng trước (${getVNString(start)} — ${getVNString(end)})`;
  } else if (dateRange === 'last_quarter') {
    const currentMonth = now.getMonth(); // 0-11
    const currentQuarter = Math.floor(currentMonth / 3);
    let targetQuarter = currentQuarter - 1;
    let targetYear = now.getFullYear();
    if (targetQuarter < 0) {
      targetQuarter = 3; // Quý 4 năm trước
      targetYear -= 1;
    }
    const quarterStartMonth = targetQuarter * 3;
    start = new Date(targetYear, quarterStartMonth, 1, 0, 0, 0, 0);
    end = new Date(targetYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
    label = `Quý ${targetQuarter + 1}/${targetYear} (${getVNString(start)} — ${getVNString(end)})`;
  } else {
    // Default: yesterday
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    label = `Hôm qua (${getVNString(start)})`;
  }

  // Guard kiểm tra khoảng cách tối đa (93 ngày)
  const diffMs = end.getTime() - start.getTime();
  const maxMs = 93 * 24 * 60 * 60 * 1000;
  if (diffMs > maxMs) {
    throw new Error(`Khoảng thời gian báo cáo vượt quá 93 ngày. Vui lòng chọn khoảng ngắn hơn.`);
  }

  return {
    label,
    startDate: getVNString(start),
    endDate: getVNString(end)
  };
}

/**
 * Filter mảng đơn hàng theo khoảng thời gian báo cáo
 */
function filterOrdersByDateRange(orders: any[], dateRange: string) {
  const { startDate, endDate } = getReportDateStrings(dateRange);
  // startDate và endDate dạng YYYY-MM-DD
  const startTs = new Date(`${startDate}T00:00:00+07:00`).getTime();
  const endTs = new Date(`${endDate}T23:59:59+07:00`).getTime();

  return orders.filter(o => {
    const dStr = o.inserted_at || o.created_at || o.createdDate;
    if (!dStr) return true;
    let isoStr = String(dStr);
    if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
      isoStr += 'Z';
    }
    const orderTime = new Date(isoStr).getTime();
    if (isNaN(orderTime)) return true;
    return orderTime >= startTs && orderTime <= endTs;
  });
}

export const REPORT_SYSTEM_PROMPT = `Bạn là trợ lý phân tích dữ liệu kinh doanh chuyên nghiệp của nền tảng AI2Hero. 
Nhiệm vụ của bạn là đọc các số liệu kinh doanh (đã được code tính toán tổng hợp sẵn dưới dạng JSON) và viết một nhận xét ngắn gọn bằng tiếng Việt.

Yêu cầu phân tích:
- Viết 1-2 đoạn văn (tối đa 150 chữ). KHÔNG quá dài.
- Chỉ ra điểm sáng (nếu có) và 1 rủi ro/gợi ý hành động.
- Dùng ngôn ngữ tự nhiên, mạch lạc, KHÔNG liệt kê lại những con số đã có trên báo cáo.
- Giữ phong cách chuyên nghiệp nhưng động viên.

Nguyên tắc bắt buộc:
- KHÔNG tự bịa ra các số liệu không có trong JSON.
- Viết ngắn gọn (dưới 150 từ).
- Formatting bằng HTML cơ bản (<b>, <i>) thay vì Markdown (*, _). KHÔNG dùng ký tự đặc biệt gây lỗi Telegram parse_mode HTML.`;



export async function buildReportContent(
  teamId: number,
  schedule: any,
  isTest: boolean
): Promise<{ success: boolean; metricsJson: any; reportText: string; finalReportText: string; aiModel: string; aiInputTokens: number; aiOutputTokens: number; error?: string }> {
  try {
    const reportSpec = schedule.reportSpec || {};
    const dateRange = reportSpec.dateRange || 'yesterday';
    const dateInfo = getReportDateStrings(dateRange);

    let metricsJson: Record<string, any> = {};
    let codeReportText = '';
    
    const sources = schedule.inputSources && schedule.inputSources.length > 0 
      ? schedule.inputSources 
      : [{ connectionId: schedule.inputConnectionId, provider: schedule.inputProvider, capabilities: [] }];

    const collectedInstructions: string[] = [];

    for (const source of sources) {
      if (!source.connectionId) continue;
      
      const provider = source.provider;
      const capabilities = source.capabilities || [];
      const reportType = reportSpec.reportType || 'daily_sales';

      if (provider === 'pancake-pos' || provider === 'kiotviet') {
        const capabilitiesList = getCapabilities(provider);
        
        // 1. Xác định danh sách capabilities cần chạy
        // QUAN TRỌNG: Phân biệt 2 trường hợp:
        // - capabilities == null/undefined → lịch cũ chưa có tính năng này → fallback DEFAULT
        // - capabilities = [] → user CỐ Ý bỏ chọn hết → tôn trọng, KHÔNG fallback
        const effectiveCaps = (capabilities == null)
          ? (DEFAULT_CAPABILITIES[reportType] || ['get_statistics'])
          : capabilities;

        if (effectiveCaps.length === 0) {
          console.warn(`[HeroReport] Source ${source.connectionId}: Không có capability nào được chọn — bỏ qua nguồn này.`);
          continue;
        }

        // 2. Duyệt qua từng capability -> Gọi đúng slug -> Render
        for (const capSlug of effectiveCaps) {
          const capDef = capabilitiesList.find(c => c.slug === capSlug);
          
          // Trích xuất hướng dẫn AI từ định nghĩa capability thực tế (hoặc fallback mapping)
          let instructionSlug = capSlug;
          
          const matchingDef = capabilitiesList.find(c => c.slug === instructionSlug) || capDef;
          if (matchingDef?.aiInstruction) {
            collectedInstructions.push(matchingDef.aiInstruction);
          }

          const renderer = CAPABILITY_RENDERERS[capSlug];
          if (!renderer) {
            console.warn(`[HeroReport] Không tìm thấy renderer cho capability: ${capSlug}`);
            continue;
          }

          let resultData: any = null;

          // === ĐƯỜNG CHÍNH: Gọi đúng slug qua cổng ===
          const actionResult = await runConnectorAction({
            teamId,
            connectionId: source.connectionId,
            actionSlug: capSlug,
            input: { startDate: dateInfo.startDate, endDate: dateInfo.endDate, isTest },
            callerModule: 'hero-report',
            isTest
          });
          if (actionResult.success) {
            resultData = actionResult.data?.data || actionResult.data;
          }

          if (resultData) {
            metricsJson[capSlug] = resultData;
            
            // Render text
            codeReportText += renderer(resultData);
          }
        }
      } else if (provider === 'pancake-chat') {
        const capabilitiesList = getCapabilities(provider);

        // Phân biệt: null = lịch cũ chưa có capabilities → dùng default; [] = user bỏ chọn hết → bỏ qua
        const effectiveCaps = (capabilities == null)
          ? ['get_page_statistics', 'get_staff_statistics']
          : capabilities;

        if (effectiveCaps.length === 0) {
          console.warn(`[HeroReport] Source ${source.connectionId}: Không có capability nào được chọn — bỏ qua.`);
          continue;
        }

        // Pancake Chat API dùng Unix Timestamp (seconds) cho since/until
        const since = Math.floor(new Date(`${dateInfo.startDate}T00:00:00+07:00`).getTime() / 1000);
        const until = Math.floor(new Date(`${dateInfo.endDate}T23:59:59+07:00`).getTime() / 1000);

        for (const capSlug of effectiveCaps) {
          const capDef = capabilitiesList.find(c => c.slug === capSlug);
          if (capDef?.aiInstruction) collectedInstructions.push(capDef.aiInstruction);

          const renderer = CAPABILITY_RENDERERS[capSlug];
          if (!renderer) {
            console.warn(`[HeroReport] Không tìm thấy renderer cho capability: ${capSlug}`);
            continue;
          }

          let resultData: any = null;

          const actionResult = await runConnectorAction({
            teamId,
            connectionId: source.connectionId,
            actionSlug: capSlug,
            input: { since, until },
            callerModule: 'hero-report',
            isTest
          });
          if (actionResult.success) {
            resultData = actionResult.data?.data || actionResult.data;
          }

          if (resultData) {
            metricsJson[capSlug] = resultData;
            codeReportText += renderer(resultData);
          }
        }
      }
    }

    if (!codeReportText) {
      codeReportText = 'Không lấy được số liệu nào từ các nguồn dữ liệu.';
    }

    let aiCommentary = 'Không thể kết nối AI để viết nhận xét.';
    const skipAi = reportSpec.skipAi;
    const selectedAiModel = reportSpec.aiModel || 'krr/claude-sonnet-4-6';
    let aiModel = selectedAiModel;
    let aiInputTokens = 0;
    let aiOutputTokens = 0;

    if (skipAi) {
      aiCommentary = '<i>(Chế độ Tùy chọn: Đã cấu hình bỏ qua bước gọi AI để tiết kiệm chi phí)</i>';
    } else {
      try {
        const [aiConnection] = await db
          .select()
          .from(connectHubConnections)
          .where(and(
            eq(connectHubConnections.teamId, teamId),
            eq(connectHubConnections.status, 'connected'),
            inArray(connectHubConnections.appSlug, ['chiasegpu', 'openai'])
          ))
          .limit(1);

        if (!aiConnection) {
          aiCommentary = '⚠️ (Chưa cấu hình kết nối AI trong Connect Hub)';
        } else {
          const safeMetricsJson = maskPII(metricsJson);
          
          let systemPrompt = REPORT_SYSTEM_PROMPT;
          if (collectedInstructions.length > 0) {
            systemPrompt += `\n\nHướng dẫn bổ sung cho các nguồn dữ liệu:\n` + collectedInstructions.join('\n\n');
          }

          const aiInput = {
            model: selectedAiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: `Metrics JSON:\n${JSON.stringify(safeMetricsJson, null, 2)}\nYêu cầu thêm của chủ shop: ${reportSpec.customPrompt || 'Không có'}` 
              }
            ],
            temperature: 0.7
          };

          const aiRes = await runConnectorAction({
            teamId,
            connectionId: aiConnection.id,
            actionSlug: 'chat_completion',
            input: aiInput,
            callerModule: 'hero-report',
            isTest
          });
          
          if (aiRes && aiRes.success && aiRes.data && aiRes.data.choices && aiRes.data.choices[0]?.message?.content) {
            aiCommentary = aiRes.data.choices[0].message.content.trim();
            aiModel = aiRes.data.model || selectedAiModel;
            aiInputTokens = aiRes.data.usage?.prompt_tokens || 0;
            aiOutputTokens = aiRes.data.usage?.completion_tokens || 0;
          } else {
             aiCommentary = `⚠️ (Không thể tạo nhận xét tự động: ${aiRes.error || 'Lỗi AI'})`;
          }
        }
      } catch (aiErr: any) {
        console.error('AI summary generation failed:', aiErr);
        aiCommentary = `⚠️ (Không thể tạo nhận xét tự động: ${aiErr.message || 'Lỗi kết nối AI'})`;
      }
    }

    const rangeLabel = dateInfo.label;
    let finalReportText = `📊 <b>${(schedule.name || 'BÁO CÁO').toUpperCase()}</b>\n`;
    finalReportText += `📅 Thời kỳ dữ liệu: <b>${rangeLabel}</b>\n`;
    finalReportText += `-------------------------------------\n\n`;
    finalReportText += codeReportText;
    finalReportText += `-------------------------------------\n`;
    finalReportText += `🤖 <b>NHẬN XÉT & GỢI Ý CỦA AI:</b>\n`;
    finalReportText += `${aiCommentary}\n\n`;
    finalReportText += `✨ <i>Báo cáo được tạo tự động bởi AI2Hero</i>`;

    return {
      success: true,
      metricsJson,
      reportText: finalReportText,
      finalReportText,
      aiModel,
      aiInputTokens,
      aiOutputTokens
    };
  } catch (error: any) {
    return { success: false, error: error.message, metricsJson: {}, reportText: '', finalReportText: '', aiModel: '', aiInputTokens: 0, aiOutputTokens: 0 };
  }
}

export async function executeReportTask(
  scheduleId: number
): Promise<{ success: boolean; runId?: number; error?: string }> {
  let runId: number | undefined;
  
  try {
    const [schedule] = await db
      .select()
      .from(heroReportSchedules)
      .where(eq(heroReportSchedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      throw new Error(`Không tìm thấy lịch báo cáo ID #${scheduleId}`);
    }

    const [runLog] = await db
      .insert(heroReportRuns)
      .values({
        teamId: schedule.teamId,
        scheduleId: schedule.id,
        status: 'running',
        startedAt: new Date()
      })
      .returning();
    
    runId = runLog.id;

    const reportRes = await buildReportContent(schedule.teamId, schedule, false);
    
    if (!reportRes.success) {
      throw new Error(reportRes.error || 'Lỗi tạo nội dung báo cáo');
    }

    const [outputConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.id, schedule.outputConnectionId), eq(connectHubConnections.teamId, schedule.teamId)))
      .limit(1);

    if (!outputConnection) {
      throw new Error(`Không tìm thấy kết nối đầu ra ID #${schedule.outputConnectionId}`);
    }

    const outputConfig = (schedule.outputConfig as Record<string, any>) || {};
    const chatId = outputConfig.chatId;

    if (!chatId) {
      throw new Error('Thiếu thông tin Chat ID nhận tin');
    }

    const telegramRes = await runConnectorAction({
      teamId: schedule.teamId,
      connectionId: outputConnection.id,
      actionSlug: 'send_message',
      input: { chatId, text: reportRes.finalReportText, parse_mode: 'HTML' },
      callerModule: 'hero-report',
      isTest: false
    });

    if (!telegramRes.success) {
      throw new Error(`Gửi tin nhắn Telegram thất bại: ${telegramRes.error}`);
    }

    await db
      .update(heroReportRuns)
      .set({
        status: 'success',
        finishedAt: new Date(),
        metricsJson: reportRes.metricsJson,
        reportText: reportRes.finalReportText,
        aiModel: reportRes.aiModel,
        aiInputTokens: reportRes.aiInputTokens,
        aiOutputTokens: reportRes.aiOutputTokens
      })
      .where(eq(heroReportRuns.id, runId));

    let nextRunAt: Date | null = null;
    if (schedule.scheduleType !== 'manual' && schedule.cronExpression) {
      nextRunAt = await getNextCronOccurrence(schedule.cronExpression);
    }

    await db
      .update(heroReportSchedules)
      .set({
        lastRunAt: new Date(),
        lastSuccessAt: new Date(),
        nextRunAt,
        updatedAt: new Date()
      })
      .where(eq(heroReportSchedules.id, schedule.id));

    return { success: true, runId };

  } catch (error: any) {
    console.error(`Error executing report schedule #${scheduleId}:`, error);
    
    if (runId) {
      await db
        .update(heroReportRuns)
        .set({
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: error.message || String(error)
        })
        .where(eq(heroReportRuns.id, runId));
        
      const [schedule] = await db
        .select()
        .from(heroReportSchedules)
        .where(eq(heroReportSchedules.id, scheduleId))
        .limit(1);

      if (schedule && schedule.scheduleType !== 'manual' && schedule.cronExpression) {
        await db
          .update(heroReportSchedules)
          .set({
            lastRunAt: new Date(),
            nextRunAt: await getNextCronOccurrence(schedule.cronExpression),
            updatedAt: new Date()
          })
          .where(eq(heroReportSchedules.id, schedule.id));
      }
    }
    
    return { success: false, error: error.message };
  }
}

export async function testExecuteReport(
  teamId: number,
  data: any
): Promise<{ success: boolean; reportText?: string; error?: string }> {
  try {
    if (data.prebuiltText) {
      const [outputConnection] = await db
        .select()
        .from(connectHubConnections)
        .where(and(eq(connectHubConnections.id, data.outputConnectionId), eq(connectHubConnections.teamId, teamId)))
        .limit(1);

      if (!outputConnection) {
        throw new Error(`Không tìm thấy kết nối Telegram ID #${data.outputConnectionId}`);
      }
      
      const chatId = data.outputConfig?.chatId;
      if (!chatId) throw new Error('Thiếu Chat ID nhận tin');

      const telegramRes = await runConnectorAction({
        teamId,
        connectionId: outputConnection.id,
        actionSlug: 'send_message',
        input: { chatId, text: data.prebuiltText, parse_mode: 'HTML' },
        callerModule: 'hero-report',
        isTest: true
      });

      if (!telegramRes.success) throw new Error(`Gửi Telegram thất bại: ${telegramRes.error}`);
      return { success: true, reportText: data.prebuiltText };
    }
    
    const reportRes = await buildReportContent(teamId, data, true);
    if (!reportRes.success) {
      throw new Error(reportRes.error || 'Lỗi khi test tạo nội dung báo cáo');
    }

    const [outputConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.id, data.outputConnectionId), eq(connectHubConnections.teamId, teamId)))
      .limit(1);

    if (!outputConnection) {
      throw new Error(`Không tìm thấy kết nối Telegram ID #${data.outputConnectionId}`);
    }

    const chatId = data.outputConfig?.chatId;
    if (!chatId) {
      throw new Error('Thiếu Chat ID nhận tin');
    }

    const telegramRes = await runConnectorAction({
      teamId,
      connectionId: outputConnection.id,
      actionSlug: 'send_message',
      input: { chatId, text: reportRes.finalReportText, parse_mode: 'HTML' },
      callerModule: 'hero-report',
      isTest: true
    });
    
    if (!telegramRes.success) {
      throw new Error(`Gửi Telegram thất bại: ${telegramRes.error}`);
    }

    return { success: true, reportText: reportRes.finalReportText };

  } catch (error: any) {
    console.error('Error in testExecuteReport:', error);
    return { success: false, error: error.message };
  }
}
