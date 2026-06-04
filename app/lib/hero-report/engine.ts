import { db } from '../db/drizzle';
import { heroReportSchedules, heroReportRuns, connectHubConnections } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptField } from '../sim-crypto';
import { runConnectorAction } from '../connect-hub/connector-service';
import { runChiaSeGPU } from '../connect-hub/connectors/runners/chiasegpu';
import { 
  aggregateSalesMetrics, 
  aggregateInventoryMetrics, 
  aggregateOrderIssues 
} from './aggregator';
import { sendTelegramMessage } from './telegram-sender';

/**
 * Tính toán thời điểm chạy tiếp theo dựa trên cron expression
 */
function getNextCronOccurrenceLocal(cronExpr: string): Date {
  const now = new Date();
  const offset = 7; // GMT+7 Việt Nam
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + (offset * 3600000));
  
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return new Date(now.getTime() + 3600000);
  }
  
  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;
  let nextLocal = new Date(local);
  nextLocal.setSeconds(0, 0);
  
  if (hourPart === '*' && minPart !== '*') {
    const targetMin = parseInt(minPart, 10) || 0;
    nextLocal.setMinutes(targetMin);
    if (nextLocal <= local) {
      nextLocal.setHours(nextLocal.getHours() + 1);
    }
  } else if (hourPart !== '*' && minPart !== '*' && domPart === '*' && monthPart === '*' && dowPart === '*') {
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);
    nextLocal.setHours(targetHour, targetMin, 0, 0);
    if (nextLocal <= local) {
      nextLocal.setDate(nextLocal.getDate() + 1);
    }
  } else if (dowPart !== '*' && hourPart !== '*' && minPart !== '*') {
    const targetHour = parseInt(hourPart, 10);
    const targetMin = parseInt(minPart, 10);
    let targetDow = parseInt(dowPart, 10);
    if (targetDow === 7) targetDow = 0;
    
    nextLocal.setHours(targetHour, targetMin, 0, 0);
    
    const currentDow = nextLocal.getDay();
    let daysToAdd = (targetDow - currentDow + 7) % 7;
    
    if (daysToAdd === 0 && nextLocal <= local) {
      daysToAdd = 7;
    }
    nextLocal.setDate(nextLocal.getDate() + daysToAdd);
  } else {
    nextLocal.setDate(nextLocal.getDate() + 1);
  }
  
  const nextUtcTime = nextLocal.getTime() - (offset * 3600000);
  return new Date(nextUtcTime);
}

/**
 * Lọc đơn hàng theo khoảng thời gian báo cáo (GMT+7)
 */
/**
 * Lấy startDate, endDate và nhãn hiển thị theo dateRange (múi giờ GMT+7)
 */
export function getReportDateStrings(range: string): { startDate: string; endDate: string; label: string } {
  const utcNow = Date.now();
  const vnTime = new Date(utcNow + (7 * 3600000));
  const vnTodayStr = vnTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
  
  let startDateStr = vnTodayStr;
  let endDateStr = vnTodayStr;
  let label = `Hôm nay (${vnTodayStr})`;
  
  if (range === 'yesterday') {
    const yesterday = new Date(vnTime.getTime() - 24 * 3600 * 1000);
    startDateStr = yesterday.toISOString().split('T')[0];
    endDateStr = startDateStr;
    label = `Hôm qua (${startDateStr})`;
  } else if (range === 'last_7_days') {
    const sevenDaysAgo = new Date(vnTime.getTime() - 7 * 24 * 3600 * 1000);
    startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    endDateStr = vnTodayStr;
    label = `7 ngày qua (${startDateStr} - ${endDateStr})`;
  } else if (range === 'today') {
    label = `Hôm nay (${vnTodayStr})`;
  } else {
    label = `${range} (${startDateStr} - ${endDateStr})`;
  }
  
  return { startDate: startDateStr, endDate: endDateStr, label };
}

/**
 * Lọc đơn hàng theo khoảng thời gian báo cáo (GMT+7)
 * 
 * ⚠️ GHI CHÚ QUAN TRỌNG VỀ CÁCH LẤY NGÀY CỦA PANCAKE POS:
 * 1. Pancake POS trả về ngày tạo đơn qua trường 'inserted_at' dưới dạng chuỗi UTC không có đuôi 'Z' (Ví dụ: "2026-06-04 12:30:00").
 * 2. JS engine trên một số môi trường (như localhost Windows) sẽ tự hiểu chuỗi không timezone này theo múi giờ Local, trong khi trên server Vercel/Docker sẽ hiểu là UTC.
 * 3. Để đồng nhất trên mọi môi trường và khớp chính xác múi giờ Việt Nam (+07:00), ta bắt buộc phải thêm ký tự 'Z' vào cuối chuỗi thô của Pancake POS để chỉ định rõ đây là giờ UTC.
 * 4. Tiếp theo, khoảng thời gian lọc (today, yesterday, v.v.) sẽ được quy đổi từ ngày Việt Nam sang timestamp UTC tương ứng (bằng cách parse chuỗi "YYYY-MM-DDT00:00:00+07:00" thành Epoch time thật).
 */
function filterOrdersByDateRange(orders: any[], range: string): any[] {
  if (!Array.isArray(orders)) return [];
  
  // 1. Xác định ngày hiện tại theo múi giờ Việt Nam (+07:00) độc lập với múi giờ hệ thống
  const utcNow = Date.now();
  const vnTime = new Date(utcNow + (7 * 3600000));
  const vnTodayStr = vnTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
  
  let startDateStr = vnTodayStr;
  let endDateStr = vnTodayStr;
  
  if (range === 'yesterday') {
    const yesterday = new Date(vnTime.getTime() - 24 * 3600 * 1000);
    startDateStr = yesterday.toISOString().split('T')[0];
    endDateStr = startDateStr;
  } else if (range === 'last_7_days') {
    const sevenDaysAgo = new Date(vnTime.getTime() - 7 * 24 * 3600 * 1000);
    startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    endDateStr = vnTodayStr;
  }
  
  // 2. Chuyển đổi mốc bắt đầu/kết thúc GMT+7 sang timestamp UTC chuẩn (ms)
  const startTs = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
  const endTs = new Date(`${endDateStr}T23:59:59.999+07:00`).getTime();
  
  return orders.filter(order => {
    if (!order) return false;
    const dateStr = order.inserted_at || order.createdDate || order.createdAt;
    if (!dateStr) return true;
    
    // Nếu là chuỗi ngày giờ thô của Pancake POS (không chứa múi giờ), ép thêm 'Z' để JS parse đúng múi giờ UTC
    let orderDate: Date;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
      orderDate = new Date(dateStr + 'Z');
    } else {
      orderDate = new Date(dateStr);
    }
    
    const orderTime = orderDate.getTime();
    if (isNaN(orderTime)) return true;
    return orderTime >= startTs && orderTime <= endTs;
  });
}

const REPORT_SYSTEM_PROMPT = `Bạn là trợ lý phân tích dữ liệu kinh doanh chuyên nghiệp của nền tảng AI2Hero. 
Nhiệm vụ của bạn là đọc các số liệu kinh doanh (đã được code tính toán tổng hợp sẵn dưới dạng JSON) và viết một nhận xét ngắn gọn bằng tiếng Việt.

Yêu cầu phân tích:
1. Đánh giá nhanh tình hình kinh doanh (doanh thu tăng/giảm thế nào, mặt hàng nào đang nổi bật).
2. Ghi nhận xét ngắn gọn, súc tích mang tính định hướng.
3. Đề xuất tối đa 1-2 hành động cụ thể, thực tế cho chủ shop.

Nguyên tắc bắt buộc:
- KHÔNG tự bịa ra các số liệu không có trong JSON.
- Viết ngắn gọn (dưới 150 từ).
- Tránh dùng các ký tự định dạng Markdown phức tạp như *, _, [ ], ( ) lồng nhau quá nhiều để hạn chế lỗi hiển thị của Telegram Bot.`;

/**
 * Định dạng số tiền sang chuẩn VND
 */
function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Thực thi một tác vụ báo cáo tự động (chạy định kỳ từ cron hoặc chạy thủ công)
 */
export async function executeReportTask(
  scheduleId: number
): Promise<{ success: boolean; runId?: number; error?: string }> {
  let runId: number | undefined;
  
  try {
    // 1. Load cấu hình lịch báo cáo
    const [schedule] = await db
      .select()
      .from(heroReportSchedules)
      .where(eq(heroReportSchedules.id, scheduleId))
      .limit(1);

    if (!schedule) {
      throw new Error(`Không tìm thấy lịch báo cáo ID #${scheduleId}`);
    }

    // 2. Ghi nhận log run trạng thái 'running'
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

    // 3. Core Service thay thế cơ chế giải mã cục bộ
    // (runConnectorAction sẽ tự validate teamId, connectionId, và xử lý giải mã)
    
    // 4. Gọi API POS lấy dữ liệu thô thông qua Core Service
    const reportSpec = (schedule.reportSpec as Record<string, any>) || {};
    const reportType = reportSpec.reportType || 'daily_sales';
    const dateRange = reportSpec.dateRange || 'yesterday';
    const dateInfo = getReportDateStrings(dateRange);

    let rawData: any;
    let metricsJson: Record<string, any> = {};
    let codeReportText = '';

    if (reportType === 'low_stock') {
      // Báo cáo tồn kho
      const actionResult = await runConnectorAction({
        teamId: schedule.teamId,
        connectionId: schedule.inputConnectionId,
        actionSlug: 'list_products',
        input: {},
        callerModule: 'hero-report'
      });
      if (!actionResult.success) {
        throw new Error(`POS API error: ${actionResult.error}`);
      }
      rawData = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);

      const threshold = reportSpec.filters?.lowStockLessThan || 10;
      const invMetrics = aggregateInventoryMetrics(rawData, threshold);
      metricsJson = invMetrics;

      codeReportText = `📦 *BÁO CÁO TỒN KHO THẤP*\n`;
      codeReportText += `📊 Tổng số mẫu mã (SKU): ${invMetrics.totalSkuCount}\n`;
      codeReportText += `❌ Số sản phẩm đã hết hàng: ${invMetrics.outOfStockCount}\n\n`;
      if (invMetrics.lowStockProducts.length > 0) {
        codeReportText += `⚠️ *Danh sách sản phẩm sắp hết (dưới ${threshold} chiếc):*\n`;
        invMetrics.lowStockProducts.forEach((p, idx) => {
          codeReportText += `${idx + 1}. ${p.name}: còn *${p.onHand}* chiếc\n`;
        });
      } else {
        codeReportText += `✅ Không có sản phẩm nào ở mức báo động tồn kho.\n`;
      }
    } else {
      // Các báo cáo dựa trên đơn hàng (doanh thu, top sp, đơn lỗi)
      const actionResult = await runConnectorAction({
        teamId: schedule.teamId,
        connectionId: schedule.inputConnectionId,
        actionSlug: 'list_orders',
        input: { 
          pageSize: 250, 
          page_size: 250,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate
        }, // Lấy đơn hàng theo khoảng thời gian báo cáo
        callerModule: 'hero-report'
      });
      if (!actionResult.success) {
        throw new Error(`POS API error: ${actionResult.error}`);
      }
      rawData = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);

      // Lọc theo khoảng thời gian
      const filteredOrders = filterOrdersByDateRange(rawData, dateRange);

      if (reportType === 'pending_orders') {
        const issueMetrics = aggregateOrderIssues(filteredOrders);
        metricsJson = issueMetrics;

        codeReportText = `⚠️ *BÁO CÁO ĐƠN HÀNG CHỜ XỬ LÝ LÂU (>24H)*\n`;
        codeReportText += `⏳ Số đơn chưa xử lý: *${issueMetrics.pendingOrdersCount}* đơn\n`;
        codeReportText += `❌ Đơn đã hủy: ${issueMetrics.cancelledOrdersCount} đơn\n`;
        codeReportText += `🔄 Đơn hoàn trả: ${issueMetrics.returnedOrdersCount} đơn\n\n`;
        
        if (issueMetrics.details.length > 0) {
          codeReportText += `📋 *Danh sách đơn hàng tồn đọng tiêu biểu:*\n`;
          issueMetrics.details.forEach((d) => {
            codeReportText += `- Đơn #${d.id} (${d.customerName}): ${formatVnd(d.totalPrice)} | Tạo lúc: ${d.timeString}\n`;
          });
        }
      } else if (reportType === 'top_products') {
        const salesMetrics = aggregateSalesMetrics(filteredOrders);
        metricsJson = { topProducts: salesMetrics.topProducts };

        codeReportText = `🔥 *TOP SẢN PHẨM BÁN CHẠY*\n`;
        if (salesMetrics.topProducts.length > 0) {
          salesMetrics.topProducts.forEach((p, idx) => {
            codeReportText += `${idx + 1}. ${p.name}: bán được *${p.quantity}* sản phẩm | Doanh thu: ${formatVnd(p.revenue)}\n`;
          });
        } else {
          codeReportText += `Chưa ghi nhận số liệu bán hàng nào trong kỳ.\n`;
        }
      } else {
        // Mặc định: Doanh thu bán hàng (daily_sales)
        const salesMetrics = aggregateSalesMetrics(filteredOrders);
        metricsJson = salesMetrics;

        codeReportText = `💰 *BÁO CÁO DOANH THU KINH DOANH*\n`;
        codeReportText += `💵 Tổng doanh số: *${formatVnd(salesMetrics.totalRevenue)}*\n`;
        codeReportText += `📦 Tổng đơn phát sinh: *${salesMetrics.totalOrders}* đơn\n`;
        codeReportText += `🧾 Giá trị đơn TB: ${formatVnd(salesMetrics.averageOrderValue)}\n\n`;
        
        codeReportText += `💳 *Doanh thu theo thanh toán:*\n`;
        codeReportText += `- Thu hộ (COD): ${formatVnd(salesMetrics.revenueByPaymentMethod.cod)}\n`;
        codeReportText += `- Trả trước (Bank/Momo): ${formatVnd(salesMetrics.revenueByPaymentMethod.prepaid)}\n`;
        
        if (salesMetrics.topProducts.length > 0) {
          codeReportText += `\n🔥 *Top sản phẩm chạy nhất:*\n`;
          salesMetrics.topProducts.slice(0, 3).forEach((p, idx) => {
            codeReportText += `${idx + 1}. ${p.name} (SL: ${p.quantity})\n`;
          });
        }
      }
    }

    // 5. Gọi API Cổng 1 (ChiaSeGPU) để nhận xét
    let aiCommentary = 'Không thể kết nối AI để viết nhận xét.';
    const selectedAiModel = reportSpec.aiModel || 'krr/claude-sonnet-4-6';
    let aiModel = selectedAiModel;
    let aiInputTokens = 0;
    let aiOutputTokens = 0;

    try {
      const aiInput = {
        model: selectedAiModel,
        messages: [
          { role: 'system', content: REPORT_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Metrics JSON:\n${JSON.stringify(metricsJson, null, 2)}\nYêu cầu thêm của chủ shop: ${reportSpec.customPrompt || 'Không có'}` 
          }
        ],
        temperature: 0.7
      };

      const aiRes = await runChiaSeGPU({}, 'chat_completion', aiInput);
      if (aiRes && aiRes.choices && aiRes.choices[0]?.message?.content) {
        aiCommentary = aiRes.choices[0].message.content.trim();
        aiModel = aiRes.model || selectedAiModel;
        aiInputTokens = aiRes.usage?.prompt_tokens || 0;
        aiOutputTokens = aiRes.usage?.completion_tokens || 0;
      }
    } catch (aiErr: any) {
      console.error('AI summary generation failed:', aiErr);
      aiCommentary = `⚠️ (Không thể tạo nhận xét tự động: ${aiErr.message || 'Lỗi kết nối AI'})`;
    }

    // 6. Định dạng toàn văn báo cáo Markdown gửi Telegram
    const providerLabel = schedule.inputProvider === 'pancake-pos' ? 'Pancake POS' : 'KiotViet';
    const rangeLabel = dateInfo.label;
    
    let finalReportText = `📊 *${schedule.name.toUpperCase()}*\n`;
    finalReportText += `📅 Thời kỳ dữ liệu: *${rangeLabel}*\n`;
    finalReportText += `🔌 Nguồn: _${providerLabel}_\n`;
    finalReportText += `-------------------------------------\n\n`;
    finalReportText += codeReportText;
    finalReportText += `\n-------------------------------------\n`;
    finalReportText += `🤖 *NHẬN XÉT & GỢI Ý CỦA AI:*\n`;
    finalReportText += `${aiCommentary}\n\n`;
    finalReportText += `✨ _Báo cáo được tạo tự động bởi AI2Hero_`;

    // 7. Giải mã kết nối đầu ra (Telegram Output)
    const [outputConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(eq(connectHubConnections.id, schedule.outputConnectionId))
      .limit(1);

    if (!outputConnection) {
      throw new Error(`Không tìm thấy kết nối đầu ra ID #${schedule.outputConnectionId}`);
    }

    const outputDecrypted = decryptField(outputConnection.encryptedCredentials) || '{}';
    const outputCredentials = JSON.parse(outputDecrypted);
    const botToken = outputCredentials.token || outputCredentials.botToken;
    const outputConfig = (schedule.outputConfig as Record<string, any>) || {};
    const chatId = outputConfig.chatId;

    if (!botToken || !chatId) {
      throw new Error('Thiếu thông tin cấu hình Token Bot Telegram hoặc Chat ID nhận tin');
    }

    // 8. Thực hiện gửi tin nhắn tới Telegram
    const telegramRes = await sendTelegramMessage(botToken, chatId, finalReportText);
    if (!telegramRes.ok) {
      throw new Error(`Gửi tin nhắn Telegram thất bại: ${telegramRes.error}`);
    }

    // 9. Cập nhật log chạy thành công
    await db
      .update(heroReportRuns)
      .set({
        status: 'success',
        finishedAt: new Date(),
        metricsJson,
        reportText: finalReportText,
        aiModel,
        aiInputTokens,
        aiOutputTokens
      })
      .where(eq(heroReportRuns.id, runId));

    // 10. Cập nhật lịch chạy tiếp theo cho Schedule
    let nextRunAt: Date | null = null;
    if (schedule.scheduleType !== 'manual' && schedule.cronExpression) {
      nextRunAt = getNextCronOccurrenceLocal(schedule.cronExpression);
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
    
    // Cập nhật trạng thái thất bại vào log runs nếu đã được tạo dòng log
    if (runId) {
      try {
        await db
          .update(heroReportRuns)
          .set({
            status: 'failed',
            finishedAt: new Date(),
            errorMessage: error.message || 'Lỗi thực thi không xác định'
          })
          .where(eq(heroReportRuns.id, runId));
      } catch (logErr) {
        console.error('Failed to log error to DB:', logErr);
      }
    }

    // Vẫn cập nhật thời điểm chạy tiếp theo để lịch không bị kẹt vĩnh viễn
    try {
      const [schedule] = await db
        .select()
        .from(heroReportSchedules)
        .where(eq(heroReportSchedules.id, scheduleId))
        .limit(1);

      if (schedule && schedule.scheduleType !== 'manual' && schedule.cronExpression) {
        const nextRunAt = getNextCronOccurrenceLocal(schedule.cronExpression);
        await db
          .update(heroReportSchedules)
          .set({
            lastRunAt: new Date(),
            nextRunAt,
            updatedAt: new Date()
          })
          .where(eq(heroReportSchedules.id, schedule.id));
      }
    } catch (schErr) {
      console.error('Failed to update nextRunAt after execution failure:', schErr);
    }

    return { success: false, error: error.message || 'Lỗi thực thi không rõ nguyên nhân' };
  }
}

/**
 * Thực thi chạy thử báo cáo trực tiếp với cấu hình chưa lưu (gửi thử tới Telegram)
 */
export async function testExecuteReport(
  teamId: number,
  data: any
): Promise<{ success: boolean; reportText?: string; error?: string }> {
  try {
    // 1. Lấy thông số báo cáo
    const reportSpec = data.reportSpec || {};
    const reportType = reportSpec.reportType || 'daily_sales';
    const dateRange = reportSpec.dateRange || 'yesterday';
    const dateInfo = getReportDateStrings(dateRange);

    let rawData: any;
    let metricsJson: Record<string, any> = {};
    let codeReportText = '';

    // 2. Gọi API POS lấy dữ liệu thô
    if (reportType === 'low_stock') {
      const actionResult = await runConnectorAction({
        teamId: teamId,
        connectionId: data.inputConnectionId,
        actionSlug: 'list_products',
        input: {},
        callerModule: 'hero-report',
        isTest: true
      });
      if (!actionResult.success) {
        throw new Error(`POS API error: ${actionResult.error}`);
      }
      rawData = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);

      const threshold = reportSpec.filters?.lowStockLessThan || 10;
      const invMetrics = aggregateInventoryMetrics(rawData, threshold);
      metricsJson = invMetrics;

      codeReportText = `📦 *BÁO CÁO TỒN KHO THẤP (TEST)*\n`;
      codeReportText += `📊 Tổng số mẫu mã (SKU): ${invMetrics.totalSkuCount}\n`;
      codeReportText += `❌ Số sản phẩm đã hết hàng: ${invMetrics.outOfStockCount}\n\n`;
      if (invMetrics.lowStockProducts.length > 0) {
        codeReportText += `⚠️ *Danh sách sản phẩm sắp hết (dưới ${threshold} chiếc):*\n`;
        invMetrics.lowStockProducts.forEach((p, idx) => {
          codeReportText += `${idx + 1}. ${p.name}: còn *${p.onHand}* chiếc\n`;
        });
      } else {
        codeReportText += `✅ Không có sản phẩm nào ở mức báo động tồn kho.\n`;
      }
    } else {
      const actionResult = await runConnectorAction({
        teamId: teamId,
        connectionId: data.inputConnectionId,
        actionSlug: 'list_orders',
        input: { 
          pageSize: 250, 
          page_size: 250,
          startDate: dateInfo.startDate,
          endDate: dateInfo.endDate
        },
        callerModule: 'hero-report',
        isTest: true
      });
      if (!actionResult.success) {
        throw new Error(`POS API error: ${actionResult.error}`);
      }
      rawData = Array.isArray(actionResult.data) ? actionResult.data : (actionResult.data?.data || []);

      // Lọc theo khoảng thời gian
      const filteredOrders = filterOrdersByDateRange(rawData, dateRange);

      if (reportType === 'pending_orders') {
        const issueMetrics = aggregateOrderIssues(filteredOrders);
        metricsJson = issueMetrics;

        codeReportText = `⚠️ *BÁO CÁO ĐƠN HÀNG CHỜ XỬ LÝ LÂU (>24H) (TEST)*\n`;
        codeReportText += `⏳ Số đơn chưa xử lý: *${issueMetrics.pendingOrdersCount}* đơn\n`;
        codeReportText += `❌ Đơn đã hủy: ${issueMetrics.cancelledOrdersCount} đơn\n`;
        codeReportText += `🔄 Đơn hoàn trả: ${issueMetrics.returnedOrdersCount} đơn\n\n`;
        
        if (issueMetrics.details.length > 0) {
          codeReportText += `📋 *Danh sách đơn hàng tồn đọng tiêu biểu:*\n`;
          issueMetrics.details.forEach((d) => {
            codeReportText += `- Đơn #${d.id} (${d.customerName}): ${formatVnd(d.totalPrice)} | Tạo lúc: ${d.timeString}\n`;
          });
        }
      } else if (reportType === 'top_products') {
        const salesMetrics = aggregateSalesMetrics(filteredOrders);
        metricsJson = { topProducts: salesMetrics.topProducts };

        codeReportText = `🔥 *TOP SẢN PHẨM BÁN CHẠY (TEST)*\n`;
        if (salesMetrics.topProducts.length > 0) {
          salesMetrics.topProducts.forEach((p, idx) => {
            codeReportText += `${idx + 1}. ${p.name}: bán được *${p.quantity}* sản phẩm | Doanh thu: ${formatVnd(p.revenue)}\n`;
          });
        } else {
          codeReportText += `Chưa ghi nhận số liệu bán hàng nào trong kỳ.\n`;
        }
      } else {
        const salesMetrics = aggregateSalesMetrics(filteredOrders);
        metricsJson = salesMetrics;

        codeReportText = `💰 *BÁO CÁO DOANH THU KINH DOANH (TEST)*\n`;
        codeReportText += `💵 Tổng doanh số: *${formatVnd(salesMetrics.totalRevenue)}*\n`;
        codeReportText += `📦 Tổng đơn phát sinh: *${salesMetrics.totalOrders}* đơn\n`;
        codeReportText += `🧾 Giá trị đơn TB: ${formatVnd(salesMetrics.averageOrderValue)}\n\n`;
        
        codeReportText += `💳 *Doanh thu theo thanh toán:*\n`;
        codeReportText += `- Thu hộ (COD): ${formatVnd(salesMetrics.revenueByPaymentMethod.cod)}\n`;
        codeReportText += `- Trả trước (Bank/Momo): ${formatVnd(salesMetrics.revenueByPaymentMethod.prepaid)}\n`;
      }
    }

    // 3. Gọi AI viết tóm tắt
    let aiCommentary = 'Không thể kết nối AI để viết nhận xét.';
    try {
       const selectedAiModel = reportSpec.aiModel || 'krr/claude-sonnet-4-6';
       const aiInput = {
        model: selectedAiModel,
        messages: [
          { role: 'system', content: REPORT_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Metrics JSON:\n${JSON.stringify(metricsJson, null, 2)}\nYêu cầu thêm của chủ shop: ${reportSpec.customPrompt || 'Không có'}` 
          }
        ],
        temperature: 0.7
      };

      const aiRes = await runChiaSeGPU({}, 'chat_completion', aiInput);
      if (aiRes && aiRes.choices && aiRes.choices[0]?.message?.content) {
        aiCommentary = aiRes.choices[0].message.content.trim();
      }
    } catch (aiErr: any) {
      console.error('AI summary test run failed:', aiErr);
      aiCommentary = `⚠️ (Không thể tạo nhận xét AI: ${aiErr.message || 'Lỗi kết nối AI'})`;
    }

    // 4. Định dạng báo cáo
    const providerLabel = data.inputProvider === 'pancake-pos' ? 'Pancake POS' : 'KiotViet';
    const rangeLabel = dateInfo.label;
    
    let finalReportText = `📊 *${data.name.toUpperCase()} (BẢN GỬI THỬ)*\n`;
    finalReportText += `📅 Thời kỳ dữ liệu: *${rangeLabel}*\n`;
    finalReportText += `🔌 Nguồn: _${providerLabel}_\n`;
    finalReportText += `-------------------------------------\n\n`;
    finalReportText += codeReportText;
    finalReportText += `\n-------------------------------------\n`;
    finalReportText += `🤖 *NHẬN XÉT & GỢI Ý CỦA AI:*\n`;
    finalReportText += `${aiCommentary}\n\n`;
    finalReportText += `✨ _Báo cáo gửi thử nghiệm bởi AI2Hero_`;

    // 5. Giải mã và gửi Telegram
    const [outputConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.id, data.outputConnectionId), eq(connectHubConnections.teamId, teamId)))
      .limit(1);

    if (!outputConnection) {
      throw new Error(`Không tìm thấy kết nối Telegram ID #${data.outputConnectionId}`);
    }

    const outputDecrypted = decryptField(outputConnection.encryptedCredentials) || '{}';
    const outputCredentials = JSON.parse(outputDecrypted);
    const botToken = outputCredentials.token || outputCredentials.botToken;
    const chatId = data.outputConfig?.chatId;

    if (!botToken || !chatId) {
      throw new Error('Thiếu cấu hình Token Bot Telegram hoặc Chat ID nhận tin');
    }

    const telegramRes = await sendTelegramMessage(botToken, chatId, finalReportText);
    if (!telegramRes.ok) {
      throw new Error(`Gửi Telegram thất bại: ${telegramRes.error}`);
    }

    return { success: true, reportText: finalReportText };

  } catch (error: any) {
    console.error('Error in testExecuteReport:', error);
    return { success: false, error: error.message || 'Lỗi thực thi chạy thử không rõ nguyên nhân' };
  }
}
