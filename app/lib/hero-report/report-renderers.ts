/**
 * RENDER REGISTRY — Map capability slug → hàm format text báo cáo
 * 
 * TIÊU CHUẨN KHI THÊM RENDER MỚI:
 * 1. Mỗi render nhận đúng cấu trúc JSON mà Runner trả về (không xử lý thêm)
 * 2. Trả về string HTML (tương thích Telegram parse_mode=HTML)
 * 3. Tự xử lý trường hợp data rỗng (trả thông báo thân thiện)
 * 4. Đăng ký vào CAPABILITY_RENDERERS với key = action slug
 */

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

  let text = `💰 <b>BÁO CÁO DOANH THU KINH DOANH</b>\n`;
  text += `💵 Tổng doanh số: <b>${formatVnd(totalRevenue)}</b>\n`;
  text += `📦 Tổng đơn phát sinh: <b>${totalOrders}</b> đơn\n`;
  text += `🧾 Giá trị đơn TB: ${formatVnd(averageOrderValue)}\n\n`;
  text += `💳 <b>Doanh thu theo thanh toán:</b>\n`;
  text += `- Thu hộ (COD): ${formatVnd(cod)}\n`;
  text += `- Trả trước (Bank/Momo): ${formatVnd(prepaid)}\n`;
  
  const topProducts = summary.topProducts || data.topProducts || summary.top_products || data.top_products || [];
  if (Array.isArray(topProducts) && topProducts.length > 0) {
    text += `\n🔥 <b>Top sản phẩm chạy nhất:</b>\n`;
    topProducts.slice(0, 3).forEach((p: any, idx: number) => {
      text += `${idx + 1}. ${p.name || 'Sản phẩm không tên'} (SL: ${p.quantity ?? p.qty ?? 0})\n`;
    });
  }
  
  if (data.warning) {
    text += `\n⚠️ <i>${data.warning}</i>\n`;
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
  
  let text = `💳 <b>THU HỘ NHANH (COD + CHUYỂN KHOẢN)</b>\n`;
  text += `💵 Tổng tiền thực thu: <b>${formatVnd(collectedRevenue)}</b>\n`;
  text += `- Thu hộ COD: ${formatVnd(cod)}\n`;
  text += `- Chuyển khoản/Bank: ${formatVnd(prepaid)}\n`;
  if (shippingFee > 0 || partnerFee > 0) {
    text += `- Phí ship KH trả: ${formatVnd(shippingFee)}\n`;
    text += `- Phí đối tác: ${formatVnd(partnerFee)}\n`;
  }
  
  if (data.warning) {
    text += `\n⚠️ <i>${data.warning}</i>\n`;
  }
  
  text += '\n';
  return text;
}

// === RENDERER: Doanh số theo Nguồn bán ===
export function renderSalesByChannel(data: any): string {
  const channels = data?.channels || data || [];
  if (!Array.isArray(channels) || channels.length === 0) {
    return '🏪 <b>DOANH SỐ THEO NGUỒN BÁN</b>\nKhông có dữ liệu nguồn bán trong khoảng thời gian này.\n\n';
  }

  let text = `🏪 <b>DOANH SỐ THEO NGUỒN BÁN</b>\n`;
  channels.forEach((ch: any, idx: number) => {
    // Cấp 1: Platform (Shopee / Zalo / Facebook...)
    text += `${idx + 1}. <b>${ch.name || 'Chưa phân loại'}</b>: ${formatVnd(ch.revenue || 0)} (${ch.orders || 0} đơn)\n`;

    // Cấp 2: Sub-channel (Gian hàng cụ thể) — chỉ hiển thị nếu > 1 gian hàng
    const subs: any[] = ch.sub_channels || [];
    if (subs.length > 1) {
      subs.forEach((sub: any) => {
        text += `   ↳ ${sub.name}: ${formatVnd(sub.revenue || 0)} (${sub.orders || 0} đơn)\n`;
      });
    }
  });
  text += '\n';
  return text;
}

// === RENDERER: Doanh số theo Nhân viên ===
export function renderSalesByEmployee(data: any): string {
  const employees = data?.employees || data || [];
  if (!Array.isArray(employees) || employees.length === 0) {
    return '👥 <b>DOANH SỐ THEO NHÂN VIÊN</b>\nKhông có dữ liệu nhân viên trong khoảng thời gian này.\n\n';
  }
  
  let text = `👥 <b>DOANH SỐ THEO NHÂN VIÊN</b>\n`;
  employees.forEach((emp: any, idx: number) => {
    text += `${idx + 1}. ${maskPII(emp.name || 'Hệ thống')}: <b>${formatVnd(emp.revenue || 0)}</b> (${emp.orders || 0} đơn)\n`;
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
  
  let text = `🏆 <b>TOP ĐƠN HÀNG GIÁ TRỊ CAO</b>\n`;
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
    
    text += `${idx + 1}. Đơn #${id} (${maskPII(customerName)}): <b>${formatVnd(totalPrice)}</b> | Tạo lúc: ${timeString}\n`;
  });
  text += '\n';
  return text;
}

// === RENDERER: Tồn kho thấp ===
export function renderLowStock(data: any, threshold: number = 10): string {
  const invMetrics = data || {};
  let text = `📦 <b>BÁO CÁO TỒN KHO THẤP</b>\n`;
  text += `📊 Tổng số mẫu mã (SKU): ${invMetrics.totalSkuCount ?? 0}\n`;
  text += `❌ Số sản phẩm đã hết hàng: ${invMetrics.outOfStockCount ?? 0}\n\n`;
  const lowStockProducts = invMetrics.lowStockProducts || [];
  if (lowStockProducts.length > 0) {
    text += `⚠️ <b>Danh sách sản phẩm sắp hết (dưới ${threshold} chiếc):</b>\n`;
    lowStockProducts.forEach((p: any, idx: number) => {
      text += `${idx + 1}. ${p.name}: còn <b>${p.onHand}</b> chiếc\n`;
    });
  } else {
    text += `✅ Không có sản phẩm nào ở mức báo động tồn kho.\n`;
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
      text += `- Đơn #${d.id} (${maskPII(d.customerName)}): ${formatVnd(d.totalPrice)} | Tạo lúc: ${d.timeString}\n`;
    });
  }
  text += '\n';
  return text;
}

// === REGISTRY ===
export const CAPABILITY_RENDERERS: Record<string, (data: any, ...args: any[]) => string> = {
  'get_statistics':         renderTotalRevenue,
  'revenue_summary':        renderRevenueSummary,   // Renderer riêng — dùng collected_revenue
  'get_sales_by_channel':   renderSalesByChannel,
  'get_sales_by_employee':  renderSalesByEmployee,
  'get_top_orders':         renderTopOrders,
  'low_stock_products':     renderLowStock,          // Virtual slug
  'pending_orders':         renderPendingOrders,     // Virtual slug
};

// Fallback mặc định khi capabilities[] rỗng
export const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  'daily_sales':     ['get_statistics'],
  'low_stock':       ['low_stock_products'],
  'pending_orders':  ['pending_orders'],
};
