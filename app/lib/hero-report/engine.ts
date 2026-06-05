import { db } from '../db/drizzle';
import { heroReportSchedules, heroReportRuns, connectHubConnections } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { runConnectorAction } from '../connect-hub/connector-service';
import { 
  aggregateSalesMetrics, 
  aggregateInventoryMetrics, 
  aggregateOrderIssues,
  aggregateChatPageMetrics,
  aggregateChatStaffMetrics
} from './aggregator';
import { getNextCronOccurrence } from '../db/hero-report-actions';

/**
 * Lấy nhãn thời gian và filter cho khoảng thời gian báo cáo
 */
function getReportDateStrings(dateRange: string) {
  const now = new Date();
  const offset = 7;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + offset * 3600000);
  
  let label = '';
  let start = new Date(vnTime);
  let end = new Date(vnTime);

  if (dateRange === 'today') {
    label = `Hôm nay (${vnTime.toISOString().split('T')[0]})`;
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else if (dateRange === 'yesterday') {
    vnTime.setDate(vnTime.getDate() - 1);
    label = `Hôm qua (${vnTime.toISOString().split('T')[0]})`;
    start.setDate(start.getDate() - 1);
    start.setHours(0,0,0,0);
    end.setDate(end.getDate() - 1);
    end.setHours(23,59,59,999);
  } else if (dateRange === 'this_week') {
    label = 'Tuần này';
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else if (dateRange === 'this_month') {
    label = `Tháng ${vnTime.getMonth() + 1}/${vnTime.getFullYear()}`;
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else if (dateRange === 'last_month') {
    vnTime.setMonth(vnTime.getMonth() - 1);
    label = `Tháng ${vnTime.getMonth() + 1}/${vnTime.getFullYear()}`;
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setDate(0);
    end.setHours(23,59,59,999);
  } else {
    label = `Hôm qua (${vnTime.toISOString().split('T')[0]})`;
    start.setDate(start.getDate() - 1);
    start.setHours(0,0,0,0);
    end.setDate(end.getDate() - 1);
    end.setHours(23,59,59,999);
  }

  return {
    label,
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
}

/**
 * Filter mảng đơn hàng theo khoảng thời gian báo cáo
 */
function filterOrdersByDateRange(orders: any[], dateRange: string) {
  const { startDate, endDate } = getReportDateStrings(dateRange);
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();

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

export function maskPII(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(maskPII);
  if (typeof data === 'object') {
    const masked: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().includes('phone') && typeof v === 'string') {
        masked[k] = v.length >= 7 ? v.substring(0, 3) + '***' + v.substring(v.length - 3) : '***';
      } else if (k.toLowerCase().includes('name') && typeof v === 'string') {
        const parts = v.split(' ');
        masked[k] = parts.length > 0 ? parts[0] + ' ***' : '***';
      } else {
        masked[k] = maskPII(v);
      }
    }
    return masked;
  }
  return data;
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

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

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

    for (const source of sources) {
      if (!source.connectionId) continue;
      
      const provider = source.provider;
      const capabilities = source.capabilities || [];
      const reportType = reportSpec.reportType || 'daily_sales';

      if (provider === 'pancake-pos' || provider === 'kiotviet') {
        if (reportType === 'low_stock' || capabilities.includes('low_stock_products')) {
          const actionResult = await runConnectorAction({
            teamId,
            connectionId: source.connectionId,
            actionSlug: 'list_products',
            input: {},
            callerModule: 'hero-report',
            isTest
          });
          if (actionResult.success) {
            const rawData = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);
            const threshold = reportSpec.filters?.lowStockLessThan || 10;
            const invMetrics = aggregateInventoryMetrics(rawData, threshold);
            metricsJson.inventory = invMetrics;

            codeReportText += `📦 <b>BÁO CÁO TỒN KHO THẤP</b>\n`;
            codeReportText += `📊 Tổng số mẫu mã (SKU): ${invMetrics.totalSkuCount}\n`;
            codeReportText += `❌ Số sản phẩm đã hết hàng: ${invMetrics.outOfStockCount}\n\n`;
            if (invMetrics.lowStockProducts.length > 0) {
              codeReportText += `⚠️ <b>Danh sách sản phẩm sắp hết (dưới ${threshold} chiếc):</b>\n`;
              invMetrics.lowStockProducts.forEach((p: any, idx: number) => {
                codeReportText += `${idx + 1}. ${p.name}: còn <b>${p.onHand}</b> chiếc\n`;
              });
            } else {
              codeReportText += `✅ Không có sản phẩm nào ở mức báo động tồn kho.\n`;
            }
            codeReportText += '\n';
          }
        }
        
        if (reportType !== 'low_stock' || capabilities.includes('total_revenue')) {
          let currentPage = 1;
          const maxPages = 20;
          let allOrders: any[] = [];
          
          while (currentPage <= maxPages) {
            const actionResult = await runConnectorAction({
              teamId,
              connectionId: source.connectionId,
              actionSlug: 'list_orders',
              input: { pageSize: 250, page_size: 250, page: currentPage, page_number: currentPage, startDate: dateInfo.startDate, endDate: dateInfo.endDate },
              callerModule: 'hero-report',
              isTest
            });
            
            if (actionResult.success) {
              const dataArr = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);
              if (dataArr.length === 0) break;
              allOrders = allOrders.concat(dataArr);
              if (dataArr.length < 250) break;
            } else {
              break;
            }
            currentPage++;
          }
          
          const filteredOrders = filterOrdersByDateRange(allOrders, dateRange);
          
          if (reportType === 'pending_orders') {
            const issueMetrics = aggregateOrderIssues(filteredOrders);
            metricsJson.orders = issueMetrics;
            codeReportText += `⚠️ <b>BÁO CÁO ĐƠN HÀNG CHỜ XỬ LÝ LÂU (>24H)</b>\n`;
            codeReportText += `⏳ Số đơn chưa xử lý: <b>${issueMetrics.pendingOrdersCount}</b> đơn\n`;
            codeReportText += `❌ Đơn đã hủy: ${issueMetrics.cancelledOrdersCount} đơn\n`;
            codeReportText += `🔄 Đơn hoàn trả: ${issueMetrics.returnedOrdersCount} đơn\n\n`;
            if (issueMetrics.details.length > 0) {
              codeReportText += `📋 <b>Danh sách đơn hàng tồn đọng tiêu biểu:</b>\n`;
              issueMetrics.details.forEach((d: any) => {
                codeReportText += `- Đơn #${d.id} (${maskPII(d.customerName)}): ${formatVnd(d.totalPrice)} | Tạo lúc: ${d.timeString}\n`;
              });
            }
            codeReportText += '\n';
          } else {
            const salesMetrics = aggregateSalesMetrics(filteredOrders);
            metricsJson.sales = salesMetrics;
            codeReportText += `💰 <b>BÁO CÁO DOANH THU KINH DOANH</b>\n`;
            codeReportText += `💵 Tổng doanh số: <b>${formatVnd(salesMetrics.totalRevenue)}</b>\n`;
            codeReportText += `📦 Tổng đơn phát sinh: <b>${salesMetrics.totalOrders}</b> đơn\n`;
            codeReportText += `🧾 Giá trị đơn TB: ${formatVnd(salesMetrics.averageOrderValue)}\n\n`;
            codeReportText += `💳 <b>Doanh thu theo thanh toán:</b>\n`;
            codeReportText += `- Thu hộ (COD): ${formatVnd(salesMetrics.revenueByPaymentMethod.cod)}\n`;
            codeReportText += `- Trả trước (Bank/Momo): ${formatVnd(salesMetrics.revenueByPaymentMethod.prepaid)}\n`;
            if (salesMetrics.topProducts.length > 0) {
              codeReportText += `\n🔥 <b>Top sản phẩm chạy nhất:</b>\n`;
              salesMetrics.topProducts.slice(0, 3).forEach((p: any, idx: number) => {
                codeReportText += `${idx + 1}. ${p.name} (SL: ${p.quantity})\n`;
              });
            }
            codeReportText += '\n';
          }
        }
      } else if (provider === 'pancake-chat') {
        const actionResult = await runConnectorAction({
          teamId,
          connectionId: source.connectionId,
          actionSlug: 'list_conversations',
          input: {},
          callerModule: 'hero-report',
          isTest
        });
        
        if (actionResult.success && actionResult.data && actionResult.data.data) {
          const chatMetrics = aggregateChatPageMetrics(actionResult.data.data);
          metricsJson.chat = chatMetrics;
          codeReportText += `💬 <b>BÁO CÁO PANCAKE CHAT</b>\n`;
          codeReportText += `📊 Tổng số Hội thoại mới: <b>${chatMetrics.totalConversations}</b>\n`;
          codeReportText += `💬 Tổng số Tin nhắn: <b>${chatMetrics.totalMessages}</b>\n`;
          codeReportText += `📝 Tổng số Bình luận: <b>${chatMetrics.totalComments}</b>\n\n`;
          if (chatMetrics.pageStats && chatMetrics.pageStats.length > 0) {
            codeReportText += `<b>Thống kê theo Page:</b>\n`;
            chatMetrics.pageStats.forEach((p: any, idx: number) => {
              codeReportText += `${idx + 1}. ${p.name}: ${p.conversations} hội thoại mới, ${p.messages} tin nhắn\n`;
            });
          }
          codeReportText += '\n';
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
          const aiInput = {
            model: selectedAiModel,
            messages: [
              { role: 'system', content: REPORT_SYSTEM_PROMPT },
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
