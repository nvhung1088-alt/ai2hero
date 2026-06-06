/**
 * RENDER REGISTRY — Map capability slug → hàm format text báo cáo
 * 
 * TIÊU CHUẨN KHI THÊM RENDER MỚI:
 * 1. Mỗi render nhận đúng cấu trúc JSON mà Runner trả về (không xử lý thêm)
 * 2. Trả về string HTML (tương thích Telegram parse_mode=HTML)
 * 3. Tự xử lý trường hợp data rỗng (trả thông báo thân thiện)
 * 4. Đăng ký vào CAPABILITY_RENDERERS với key = action slug
 */

import { aggregateChatPageMetrics, aggregateChatStaffMetrics } from './aggregator';

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

// === RENDERER: Doanh thu kinh doanh (from get_statistics — có total_revenue, total_orders) ===
export function renderTotalRevenue(data: any): string {
  if (!data) return '📊 Không có dữ liệu doanh thu trong khoảng thời gian này.\n\n';
  
  // Unwrap: get_statistics trả về { status, data: { summary: {...}, fallback_used, warning } }
  const summary = data.summary || data;
  
  const totalRevenue = Number(summary.total_revenue ?? summary.totalRevenue ?? 0);
  const totalOrders = Number(summary.total_orders ?? summary.totalOrders ?? 0);
  const averageOrderValue = Number(summary.average_order_value ?? summary.averageOrderValue ?? 0);
  
  let cod = 0;
  let prepaid = 0;
  
  if (summary.revenueByPaymentMethod) {
    cod = Number(summary.revenueByPaymentMethod.cod || 0);
    prepaid = Number(summary.revenueByPaymentMethod.prepaid || 0);
  } else {
    cod = Number(summary.cod || summary.cod_amount || 0);
    prepaid = Number(summary.prepaid || summary.prepaid_amount || 0);
  }

  let text = `🌐 <b>[PANCAKE POS] DOANH SỐ ONLINE & VẬN ĐƠN</b>\n`;
  text += `💵 Tổng doanh số: <b>${formatVnd(totalRevenue)}</b>\n`;
  text += `📦 Tổng đơn phát sinh: <b>${totalOrders}</b> đơn\n`;
  text += `🧾 Giá trị đơn TB: ${formatVnd(averageOrderValue)}\n\n`;
  text += `💳 <b>Doanh thu theo thanh toán:</b>\n`;
  text += `- Thu hộ (COD): ${formatVnd(cod)}\n`;
  text += `- Trả trước (Bank/Momo): ${formatVnd(prepaid)}\n`;

  const statusBreakdown = data.statusBreakdown || summary.statusBreakdown;
  if (statusBreakdown && typeof statusBreakdown === 'object') {
    const newCount = Number(statusBreakdown[0] || 0);
    const confirmedCount = Number(statusBreakdown[1] || 0);
    const packingCount = Number(statusBreakdown[8] || 0);
    const waitingShipCount = Number(statusBreakdown[9] || 0);
    const shippingCount = Number(statusBreakdown[2] || 0);
    const deliveredCount = Number(statusBreakdown[3] || 0);
    const cancelledCount = Number(statusBreakdown[5] || 0);
    const returnedCount = Number(statusBreakdown[10] || 0);
    const paidCount = Number(statusBreakdown[16] || 0);

    const totalAll = Object.values(statusBreakdown).reduce((a, b) => Number(a) + Number(b), 0) as number;
    const cancelRate = totalAll > 0 ? ((cancelledCount / totalAll) * 100).toFixed(1) : '0';

    text += `\n📦 <b>TÌNH TRẠNG XỬ LÝ ĐƠN HÀNG (Tổng: ${totalAll} đơn)</b>\n`;
    text += `- Mới / Chưa xử lý: <b>${newCount}</b>\n`;
    if (packingCount > 0) text += `- Đang đóng gói: <b>${packingCount}</b>\n`;
    if (waitingShipCount > 0) text += `- Chờ CPN / Chờ giao: <b>${waitingShipCount}</b>\n`;
    if (shippingCount > 0) text += `- Đang giao hàng: <b>${shippingCount}</b>\n`;
    if (deliveredCount > 0) text += `- Đã giao hàng: <b>${deliveredCount}</b>\n`;
    text += `- Đã hủy: <b>${cancelledCount}</b> (Tỷ lệ hủy: <b>${cancelRate}%</b>)\n`;
    if (returnedCount > 0) text += `- Hoàn trả: <b>${returnedCount}</b>\n`;
  }
  
  const topProducts = summary.topProducts || data.topProducts || summary.top_products || data.top_products || [];
  if (Array.isArray(topProducts) && topProducts.length > 0) {
    text += `\n🔥 <b>Top sản phẩm chạy nhất:</b>\n`;
    topProducts.slice(0, 3).forEach((p: any, idx: number) => {
      text += `${idx + 1}. ${escapeHtml(p.name || 'Sản phẩm không tên')} (SL: ${p.quantity ?? p.qty ?? 0})\n`;
    });
  }
  
  if (data.warning) {
    text += `\n⚠️ <i>${escapeHtml(data.warning)}</i>\n`;
  }
  
  text += '\n';
  return text;
}

// === RENDERER: Tổng hợp thu hộ nhanh (from revenue_summary — chỉ có COD + Prepaid, KHÔNG có total_revenue) ===
// QUAN TRỌNG: Slug revenue_summary trả về cấu trúc KHÁC get_statistics.
// Nó trả về: { cod, prepaid, collected_revenue, shipping_fee, partner_fee, status_buckets, warning }
// KHÔNG có total_orders hay total_revenue → phải dùng collected_revenue làm số liệu chính.
export function renderRevenueSummary(data: any): string {
  if (!data) return '💳 Không có dữ liệu thu hộ trong khoảng thời gian này.\n\n';
  
  const cod = Number(data.cod ?? 0);
  const prepaid = Number(data.prepaid ?? 0);
  const collectedRevenue = Number(data.collected_revenue ?? (cod + prepaid));
  const shippingFee = Number(data.shipping_fee ?? 0);
  const partnerFee = Number(data.partner_fee ?? 0);
  
  let text = `💳 <b>[PANCAKE POS] TÌNH TRẠNG DÒNG TIỀN ONLINE</b>\n`;
  text += `💵 Tổng tiền thực thu: <b>${formatVnd(collectedRevenue)}</b>\n`;
  text += `- Thu hộ COD: ${formatVnd(cod)}\n`;
  text += `- Chuyển khoản/Bank: ${formatVnd(prepaid)}\n`;
  if (shippingFee > 0 || partnerFee > 0) {
    text += `- Phí ship KH trả: ${formatVnd(shippingFee)}\n`;
    text += `- Phí đối tác: ${formatVnd(partnerFee)}\n`;
  }
  
  if (data.warning) {
    text += `\n⚠️ <i>${escapeHtml(data.warning)}</i>\n`;
  }
  
  text += '\n';
  return text;
}

function extractStatsArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  // Tìm mảng trong các key bắt đầu bằng by_
  for (const key of Object.keys(data)) {
    if (key.startsWith('by_') && Array.isArray(data[key])) return data[key];
  }
  return [];
}

// === RENDERER: Doanh số theo Nguồn bán (Siêu tốc) ===
export function renderSalesByChannel(data: any): string {
  const items = extractStatsArray(data);
  if (items.length === 0) return '🌐 <b>[PANCAKE POS] DOANH SỐ THEO NGUỒN BÁN</b>\nKhông có dữ liệu.\n\n';

  let text = `🌐 <b>[PANCAKE POS] DOANH SỐ THEO NGUỒN BÁN</b>\n`;
  items.sort((a, b) => Number(b.revenue || b.total_price || 0) - Number(a.revenue || a.total_price || 0));
  items.forEach((item: any, idx: number) => {
    const name = item.name || item.source_name || item.source || 'Khác';
    const revenue = Number(item.revenue || item.total_price || 0);
    const count = item.count || item.orders || 0;
    text += `${idx + 1}. <b>${escapeHtml(name)}</b>: ${formatVnd(revenue)} (${count} đơn)\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Doanh số theo Nhân viên (Siêu tốc) ===
export function renderSalesByEmployee(data: any): string {
  const items = extractStatsArray(data);
  if (items.length === 0) return '👥 <b>[PANCAKE POS] DOANH SỐ THEO NHÂN VIÊN</b>\nKhông có dữ liệu.\n\n';
  
  let text = `👥 <b>[PANCAKE POS] DOANH SỐ THEO NHÂN VIÊN</b>\n`;
  items.sort((a, b) => Number(b.revenue || b.total_price || 0) - Number(a.revenue || a.total_price || 0));
  items.forEach((emp: any, idx: number) => {
    const name = emp.name || emp.seller_name || emp.assigning_seller || `ID: ${emp.id || 'Hệ thống'}`;
    const revenue = Number(emp.revenue || emp.total_price || 0);
    const count = emp.count || emp.orders || 0;
    text += `${idx + 1}. ${escapeHtml(maskPII(name))}: <b>${formatVnd(revenue)}</b> (${count} đơn)\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Tỷ trọng theo trạng thái ===
export function renderSalesByStatus(data: any): string {
  const items = extractStatsArray(data);
  if (items.length === 0) return '📈 <b>TỶ TRỌNG THEO TRẠNG THÁI</b>\nKhông có dữ liệu.\n\n';
  
  let text = `📈 <b>TỶ TRỌNG THEO TRẠNG THÁI</b>\n`;
  items.sort((a, b) => (b.count || 0) - (a.count || 0));
  items.forEach((item: any, idx: number) => {
    // Trạng thái thường trả về key 'status' hoặc 'name'
    const name = item.name || item.status_name || `Trạng thái ${item.status || 'Khác'}`;
    const count = item.count || 0;
    text += `- ${escapeHtml(name)}: <b>${count} đơn</b>\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Biểu đồ theo ngày ===
export function renderSalesByDate(data: any): string {
  const items = extractStatsArray(data);
  if (items.length === 0) return '📅 <b>DOANH THU THEO NGÀY</b>\nKhông có dữ liệu.\n\n';
  
  let text = `📅 <b>DOANH THU THEO NGÀY</b>\n`;
  // Sắp xếp ngày tăng dần
  items.sort((a, b) => String(a.date || a.name || '').localeCompare(String(b.date || b.name || '')));
  items.forEach((item: any) => {
    const dStr = item.date || item.name || 'N/A';
    const revenue = Number(item.revenue || item.total_price || 0);
    const count = item.count || item.orders || 0;
    text += `- Ngày ${escapeHtml(dStr)}: ${formatVnd(revenue)} (${count} đơn)\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Doanh số theo Đơn vị vận chuyển ===
export function renderSalesByPartner(data: any): string {
  const items = extractStatsArray(data);
  if (items.length === 0) return '🚚 <b>DOANH SỐ THEO ĐVVC</b>\nKhông có dữ liệu.\n\n';
  
  let text = `🚚 <b>DOANH SỐ THEO ĐVVC</b>\n`;
  items.sort((a, b) => (b.count || 0) - (a.count || 0));
  items.forEach((item: any, idx: number) => {
    const name = item.name || item.partner_name || item.partner || 'Khác';
    const count = item.count || item.orders || 0;
    text += `${idx + 1}. ${escapeHtml(name)}: <b>${count} đơn</b>\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Top Đơn Hàng Giá Trị Cao ===
export function renderTopOrders(data: any): string {
  const orders = Array.isArray(data) ? data : (data?.orders || []);
  if (orders.length === 0) {
    return '🏆 <b>TOP ĐƠN HÀNG GIÁ TRỊ CAO</b>\nKhông có dữ liệu đơn hàng trong khoảng thời gian này.\n\n';
  }
  
  let text = `🏆 <b>[PANCAKE POS] TOP ĐƠN HÀNG GIÁ TRỊ CAO</b>\n`;
  orders.slice(0, 10).forEach((o: any, idx: number) => {
    const id = o.id || o.code || 'N/A';
    const customerName = o.customer_name || o.customerName || o.customer?.name || 'Khách lẻ';
    const totalPrice = Number(o.total_price || o.total || o.totalPrice || 0);
    const dateStr = o.inserted_at || o.createdDate || o.createdAt;
    let timeString = 'N/A';
    if (dateStr) {
      const normalizedDateStr = (typeof dateStr === 'string' && !dateStr.endsWith('Z') && dateStr.length === 19) 
        ? `${dateStr}Z` 
        : dateStr;
      const createdTime = new Date(normalizedDateStr).getTime();
      if (!isNaN(createdTime)) {
        timeString = new Date(createdTime).toLocaleString('vi-VN');
      }
    }
    
    text += `${idx + 1}. Đơn #${escapeHtml(String(id))} (${escapeHtml(maskPII(customerName))}): <b>${formatVnd(totalPrice)}</b> | Tạo lúc: ${escapeHtml(timeString)}\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Tồn kho thấp ===
export function renderLowStock(data: any, threshold: number = 10): string {
  const invMetrics = data || {};
  const totalSku = invMetrics.totalSkuCount ?? 0;
  const outOfStock = invMetrics.outOfStockCount ?? 0;
  const inStock = totalSku - outOfStock;
  
  let text = `📦 <b>BÁO CÁO TỒN KHO THẤP</b>\n`;
  text += `<i>(Trạng thái hiện tại — không phụ thuộc vào ngày báo cáo)</i>\n`;
  text += `📊 Tổng số mẫu mã (SKU): ${totalSku}\n`;
  text += `✅ Còn hàng: ${inStock} SKU | ❌ Hết hàng: ${outOfStock} SKU\n\n`;
  const lowStockProducts = invMetrics.lowStockProducts || [];
  if (lowStockProducts.length > 0) {
    text += `⚠️ <b>Sắp hết hàng (dưới ${threshold} chiếc) — Cần nhập thêm:</b>\n`;
    lowStockProducts.forEach((p: any, idx: number) => {
      text += `${idx + 1}. ${escapeHtml(p.name)}: còn <b>${p.onHand}</b> chiếc\n`;
    });
  } else if (totalSku > 0) {
    text += `✅ Không có sản phẩm nào ở mức báo động tồn kho (< ${threshold} chiếc).\n`;
  } else {
    text += `⚠️ Không tải được dữ liệu tồn kho — API có thể cần quyền truy cập cao hơn.\n`;
  }
  text += '\n';
  return text;
}


// === RENDERER: Đơn hàng chờ xử lý ===
export function renderPendingOrders(data: any): string {
  const issueMetrics = data || {};
  let text = `⚠️ <b>BÁO CÁO ĐƠN HÀNG CHỜ XỬ LÝ LÂU (>24H)</b>\n`;
  text += `⏳ Số đơn chưa xử lý: <b>${issueMetrics.pendingOrdersCount ?? 0}</b> đơn\n`;
  text += `❌ Đơn đã hủy: ${issueMetrics.cancelledOrdersCount ?? 0} đơn\n`;
  text += `🔄 Đơn hoàn trả: ${issueMetrics.returnedOrdersCount ?? 0} đơn\n\n`;
  const details = issueMetrics.details || [];
  if (details.length > 0) {
    text += `📋 <b>Danh sách đơn hàng tồn đọng tiêu biểu:</b>\n`;
    details.forEach((d: any) => {
      text += `- Đơn #${escapeHtml(String(d.id))} (${escapeHtml(maskPII(d.customerName))}): ${formatVnd(d.totalPrice)} | Tạo lúc: ${escapeHtml(d.timeString)}\n`;
    });
  }
  text += '\n';
  return text;
}

// === RENDERER: Phân tích khách hàng (khách cũ vs khách mới) ===
export function renderCustomerAnalysis(data: any): string {
  if (!data) return '👥 Không có dữ liệu phân tích khách hàng.\n\n';
  
  const total = Number(data.totalOrders ?? 0);
  const newCount = Number(data.newCustomersCount ?? 0);
  const returningCount = Number(data.returningCustomersCount ?? 0);
  const guestCount = Number(data.guestCustomersCount ?? 0);
  
  const newRevenue = Number(data.newCustomersRevenue ?? 0);
  const returningRevenue = Number(data.returningCustomersRevenue ?? 0);
  const guestRevenue = Number(data.guestCustomersRevenue ?? 0);

  const getPercent = (count: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  };

  let text = `👥 <b>PHÂN TÍCH KHÁCH HÀNG MỚI & QUEN (Trong ngày)</b>\n`;
  text += `📊 Phân loại theo đơn hàng chốt:\n`;
  text += `- Khách mới: <b>${newCount} đơn</b> (${getPercent(newCount)}%) | Doanh thu: ${formatVnd(newRevenue)}\n`;
  text += `- Khách quen (mua trong 90 ngày): <b>${returningCount} đơn</b> (${getPercent(returningCount)}%) | Doanh thu: ${formatVnd(returningRevenue)}\n`;
  if (guestCount > 0) {
    text += `- Khách vãng lai (không SĐT/ID): <b>${guestCount} đơn</b> (${getPercent(guestCount)}%) | Doanh thu: ${formatVnd(guestRevenue)}\n`;
  }
  text += '\n';
  return text;
}

// === RENDERER: Thống kê Page Pancake Chat ===
export function renderChatPageStats(data: any): string {
  if (!data) return '💬 Không có dữ liệu thống kê page.\n\n';
  const metrics = aggregateChatPageMetrics(data);
  if (metrics.totalPages === 0) return '💬 Không có dữ liệu thống kê page.\n\n';

  let text = `💬 <b>BÁO CÁO PANCAKE CHAT</b>\n`;
  text += `👥 Khách hàng mới: <b>${metrics.totalNewCustomers}</b>\n`;
  if (metrics.platformStats && Object.keys(metrics.platformStats).length > 0) {
    const pStats = Object.entries(metrics.platformStats)
      .map(([k, v]) => `${escapeHtml(k.charAt(0).toUpperCase() + k.slice(1))}: ${v}`)
      .join(', ');
    text += `📱 <i>KH mới theo Kênh: ${pStats}</i>\n`;
  }
  text += `📊 Hội thoại tiếp nhận: <b>${metrics.totalConversations}</b>\n`;
  text += `💬 Tin nhắn: <b>${metrics.totalMessages}</b>\n`;
  text += `📝 Bình luận: <b>${metrics.totalComments}</b>\n\n`;
  if (metrics.pageStats && metrics.pageStats.length > 0) {
    text += `<b>Thống kê theo Page:</b>\n`;
    metrics.pageStats.slice(0, 5).forEach((p: any, idx: number) => {
      text += `${idx + 1}. [${escapeHtml(p.platform)}] ${escapeHtml(p.name)}: ${p.new_customers || 0} KH mới, ${p.conversations} hội thoại\n`;
    });
  }
  text += '\n';
  return text;
}

// === RENDERER: Thống kê Nhân viên Pancake Chat ===
export function renderChatStaffStats(data: any): string {
  if (!data) return '👥 Không có dữ liệu thống kê nhân viên.\n\n';
  const metrics = aggregateChatStaffMetrics(data);
  if (metrics.allStaff.length === 0) return '👥 Chưa có dữ liệu nhân viên trong khoảng thời gian này.\n\n';

  let text = `👥 <b>HIỆU SUẤT CSKH</b>\n`;
  text += `📊 Hội thoại tiếp nhận: <b>${metrics.totalConversations}</b>\n`;
  text += `💬 Tin nhắn CSKH: <b>${metrics.totalMessages}</b>\n\n`;
  if (metrics.topStaff && metrics.topStaff.length > 0) {
    text += `<b>Xếp hạng nhân viên (theo tin nhắn):</b>\n`;
    metrics.topStaff.forEach((s: any, idx: number) => {
      text += `${idx + 1}. ${escapeHtml(s.name)}: ${s.conversations} hội thoại, ${s.messages} tin nhắn\n`;
    });
  }
  text += '\n';
  return text;
}

// === RENDERER: Thống kê Tag Pancake Chat ===
export function renderChatTagStats(data: any): string {
  const tagList = Array.isArray(data) ? data : (data?.data || []);
  if (tagList.length === 0) return '🏷️ Không có dữ liệu thống kê tag.\n\n';

  // Gộp theo tên tag, tổng số hội thoại
  const tagMap = new Map<string, number>();
  for (const item of tagList) {
    if (!item) continue;
    const name = String(item.tag_name || item.name || item.label || 'Không rõ');
    const count = Number(item.count || item.conversation_count || item.total || 0);
    tagMap.set(name, (tagMap.get(name) || 0) + count);
  }

  const sorted = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let text = `🏷️ <b>THỐNG KÊ THEO TAG</b>\n`;
  sorted.forEach(([name, count], idx) => {
    text += `${idx + 1}. ${escapeHtml(name)}: <b>${count}</b> hội thoại\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: KiotViet Báo Cáo Doanh Thu ===
export function renderKiotVietRevenueSummary(data: any): string {
  if (!data || Object.keys(data).length === 0) return '🏪 <b>[THỎ HỒNG SHOP - KIOTVIET] DOANH THU TỔNG QUAN</b>\nKhông có dữ liệu doanh thu trong khoảng thời gian này.\n\n';
  
  let text = `🏪 <b>[THỎ HỒNG SHOP - KIOTVIET] DOANH THU TỔNG QUAN</b>\n`;
  
  text += `💵 Doanh thu tổng: <b>${formatVnd(data.totalRevenue || 0)}</b>\n`;
  text += `💰 Doanh thu thuần: <b>${formatVnd(data.netRevenue || 0)}</b>\n`;
  if ((data.totalDiscount || 0) > 0) text += `🎁 Giảm giá hóa đơn: ${formatVnd(data.totalDiscount)}\n`;
  if ((data.totalSurcharge || 0) > 0) text += `➕ Phụ thu thêm: ${formatVnd(data.totalSurcharge)}\n`;
  text += `✅ Thực thu (khách đã trả): <b>${formatVnd(data.totalPayment || 0)}</b>\n`;
  if ((data.debtGenerated || 0) > 0) {
    text += `💳 Phát sinh khách nợ: <b>${formatVnd(data.debtGenerated)}</b>\n`;
  }
  
  text += `\n📦 Tổng số đơn: <b>${data.totalOrders || 0}</b> đơn\n`;
  text += `🧾 Giá trị đơn TB: ${formatVnd(data.avgOrderValue || 0)}\n`;
  
  if (data.byStatus) {
    text += `\n📈 <b>Trạng thái hóa đơn:</b>\n`;
    text += `- Hoàn thành: <b>${data.byStatus['1'] || 0}</b> đơn\n`;
    if (data.byStatus['3']) text += `- Đang xử lý: ${data.byStatus['3']} đơn\n`;
    if (data.byStatus['2']) text += `- Đã hủy: ${data.byStatus['2']} đơn\n`;
  }
  
  if (data.note) text += `\n⚠️ <i>${escapeHtml(data.note)}</i>\n`;
  text += '\n';
  return text;
}

// === RENDERER: KiotViet Top Sản Phẩm ===
export function renderTopProducts(data: any): string {
  if (!data || !data.topProducts || data.topProducts.length === 0) return '🔥 Không có dữ liệu top sản phẩm trong khoảng thời gian này.\n\n';
  
  let text = `🔥 <b>[THỎ HỒNG SHOP - KIOTVIET] TOP SẢN PHẨM BÁN CHẠY</b>\n`;
  data.topProducts.forEach((p: any, idx: number) => {
    text += `${idx + 1}. <b>${escapeHtml(p.productName)}</b>: ${formatVnd(p.totalRevenue || 0)} (SL: ${p.totalQty || 0})\n`;
  });
  if (data.note) text += `\n⚠️ <i>${escapeHtml(data.note)}</i>\n`;
  text += '\n';
  return text;
}

// === RENDERER: KiotViet Doanh Số Theo Chi Nhánh ===
export function renderSalesByBranchKiotViet(data: any): string {
  if (!data || !data.branches || data.branches.length === 0) return '🏪 Không có dữ liệu chi nhánh.\n\n';
  
  let text = `🏬 <b>[THỎ HỒNG SHOP - KIOTVIET] DOANH SỐ CHI NHÁNH</b>\n`;
  data.branches.forEach((b: any, idx: number) => {
    text += `${idx + 1}. <b>${escapeHtml(b.branchName)}</b>: ${formatVnd(b.totalRevenue || 0)} (${b.totalOrders || 0} đơn)\n`;
  });
  if (data.note) text += `\n⚠️ <i>${escapeHtml(data.note)}</i>\n`;
  text += '\n';
  return text;
}

// === RENDERER: KiotViet Báo Cáo Công Nợ ===
export function renderCustomerDebt(data: any): string {
  if (!data || !data.customers || data.customers.length === 0) return '💳 Cửa hàng không có dữ liệu công nợ.\n\n';
  
  let text = `💳 <b>[THỎ HỒNG SHOP - KIOTVIET] KHÁCH HÀNG NỢ CẦN THU</b>\n`;
  text += `Tổng dư nợ hệ thống: <b>${formatVnd(data.totalDebt || 0)}</b> (${data.count || 0} khách nợ)\n\n`;
  
  data.customers.forEach((c: any, idx: number) => {
    text += `${idx + 1}. <b>${escapeHtml(maskPII(c.name))}</b>: Nợ <b>${formatVnd(c.debt || 0)}</b> (Đã mua: ${formatVnd(c.totalInvoiced || 0)})\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: KiotViet Báo Cáo Tồn Kho ===
export function renderKiotVietInventory(data: any): string {
  if (!data || !data.products || data.products.length === 0) return '📦 Không có dữ liệu tồn kho.\n\n';
  
  let text = `📦 <b>[THỎ HỒNG SHOP - KIOTVIET] BÁO CÁO TỒN KHO</b>\n`;
  text += `<i>Đang hiển thị ${data.products.length} sản phẩm mẫu (Hệ thống có tổng cộng ${data.totalProducts || 0} SP)</i>\n\n`;
  
  data.products.forEach((p: any, idx: number) => {
    text += `${idx + 1}. <b>${escapeHtml(p.name)}</b>: Tồn <b>${p.totalStock || 0}</b>\n`;
  });
  text += '\n';
  return text;
}

// === REGISTRY ===
export const CAPABILITY_RENDERERS: Record<string, (data: any, ...args: any[]) => string> = {
  // === Pancake POS / KiotViet ===
  'get_statistics':         renderTotalRevenue,
  'revenue_summary':        renderRevenueSummary,   // Renderer riêng — dùng collected_revenue
  'get_sales_by_channel':   renderSalesByChannel,
  'get_sales_by_source':    renderSalesByChannel,   // <--- Bổ sung dòng này!
  'get_sales_by_employee':  renderSalesByEmployee,
  'get_sales_by_status':    renderSalesByStatus,
  'get_sales_by_date':      renderSalesByDate,
  'get_sales_by_partner':   renderSalesByPartner,
  'get_top_orders':         renderTopOrders,
  'low_stock_products':     renderLowStock,          // Virtual slug
  'pending_orders':         renderPendingOrders,     // Virtual slug
  'customer_analysis':      renderCustomerAnalysis,  // Virtual slug

  // === KiotViet Advanced Reports ===
  'get_revenue_summary':         renderKiotVietRevenueSummary,
  'get_top_products':            renderTopProducts,
  'get_sales_by_branch':         renderSalesByBranchKiotViet,
  'get_customer_debt_report':    renderCustomerDebt,
  'get_inventory_report':        renderKiotVietInventory,

  // === Pancake Chat ===
  'get_page_statistics':    renderChatPageStats,
  'get_staff_statistics':   renderChatStaffStats,
  'get_tag_statistics':     renderChatTagStats,
};

// Fallback mặc định khi capabilities[] rỗng
export const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  'daily_sales':     ['get_statistics'],
  'low_stock':       ['low_stock_products'],
  'pending_orders':  ['pending_orders'],
  'daily_chat':      ['get_page_statistics', 'get_staff_statistics'],
};
