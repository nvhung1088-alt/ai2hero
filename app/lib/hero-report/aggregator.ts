/**
 * Định nghĩa cấu trúc kết quả tổng hợp dữ liệu doanh số
 */
import { REPORT_EXCLUDED_STATUSES } from './metric-contract';

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByPaymentMethod: {
    cod: number;
    prepaid: number;
    other: number;
  };
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  orderStatusBuckets: Record<string, number>;
}

/**
 * Định nghĩa cấu trúc kết quả tổng hợp tồn kho
 */
export interface InventoryMetrics {
  lowStockProducts: Array<{ name: string; onHand: number }>;
  outOfStockCount: number;
  totalSkuCount: number;
}

/**
 * Định nghĩa cấu trúc kết quả tổng hợp đơn hàng lỗi/chờ xử lý
 */
export interface OrderIssueMetrics {
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  returnedOrdersCount: number;
  details: Array<{
    id: string;
    customerName: string;
    totalPrice: number;
    statusText: string;
    timeString: string;
  }>;
}

/**
 * Tổng hợp dữ liệu đơn hàng thô thành metrics doanh thu & sản phẩm bán chạy
 */
export function aggregateSalesMetrics(orders: any): SalesMetrics {
  let totalRevenue = 0;
  let totalOrders = 0;
  let cod = 0;
  let prepaid = 0;
  let other = 0;
  
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const statusMap: Record<string, number> = {};

  const orderList = Array.isArray(orders) ? orders : [];

  for (const order of orderList) {
    if (!order) continue;
    
    // 1. Gom nhóm trạng thái đơn hàng trước
    const statusVal = order.status;
    const statusText = order.statusText || 'Không rõ';
    const statusStr = String(statusVal ?? statusText);
    statusMap[statusStr] = (statusMap[statusStr] || 0) + 1;

    // Bỏ qua các đơn hàng đã bị hủy, hoàn trả không tính vào doanh thu/chỉ số
    const statusLower = statusStr.toLowerCase();
    const isCancelledOrReturned = 
      (typeof statusVal === 'number' && REPORT_EXCLUDED_STATUSES.includes(statusVal as any)) ||
      statusLower.includes('cancel') || 
      statusLower.includes('hủy') || 
      statusLower.includes('return') || 
      statusLower.includes('hoàn') || 
      statusLower.includes('trả') || 
      statusLower === '5' || 
      statusLower === '10';

    if (isCancelledOrReturned) {
      continue; // Bỏ qua đơn hủy không cộng dồn doanh thu
    }

    totalOrders++;
    
    // 2. Tính doanh thu (sử dụng giá sau chiết khấu để khớp Net Revenue POS)
    const price = Number(
      order.total_price_after_sub_discount ?? 
      order.totalPayment ?? 
      order.total_price ?? 
      order.totalPrice ?? 
      order.total ?? 
      0
    );
    totalRevenue += price;

    // 3. Phân loại phương thức thanh toán
    const method = (order.payment_method || order.paymentMethod || '').toLowerCase();
    
    // Hỗ trợ Pancake POS: có sẵn thuộc tính số 'cod' và 'prepaid'
    const directCod = Number(order.cod || order.cod_amount || 0);
    const directPrepaid = Number(order.prepaid || order.prepaid_amount || 0);

    if (directCod > 0 || directPrepaid > 0) {
      cod += directCod;
      prepaid += directPrepaid;
      // Tính phần tiền mặt / khác
      other += Math.max(0, price - directCod - directPrepaid);
    } else if (method.includes('cod') || method.includes('sau khi nhận')) {
      cod += price;
    } else if (
      method.includes('prepaid') || 
      method.includes('bank') || 
      method.includes('ck') || 
      method.includes('chuyển khoản') || 
      method.includes('momo') || 
      method.includes('vnpay') ||
      method.includes('thẻ')
    ) {
      prepaid += price;
    } else {
      other += price;
    }

    // 4. Gom nhóm số lượng sản phẩm bán chạy
    const items = order.order_items || order.items || order.orderDetails || [];
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item) continue;
        // Hỗ trợ cả Pancake POS (item.variation_info.name) và KiotViet (item.productName)
        const name = String(
          item.variation_info?.name || 
          item.variation_info?.display_name || 
          item.product_name || 
          item.productName || 
          item.itemName || 
          item.name || 
          'Sản phẩm không rõ tên'
        );
        const qty = Number(item.quantity || item.qty || 1);
        
        // Cải thiện tính giá sản phẩm: Pancake POS dùng variation_info.exact_price
        const rawPrice = item.variation_info?.exact_price ?? item.variation_info?.retail_price ?? item.price ?? 0;
        const itemRevenue = Number(item.subTotal ?? item.totalPrice ?? (rawPrice * qty) ?? 0);

        const existing = productMap.get(name) || { quantity: 0, revenue: 0 };
        productMap.set(name, {
          quantity: existing.quantity + qty,
          revenue: existing.revenue + itemRevenue
        });
      }
    }
  }

  const topProducts = Array.from(productMap.entries())
    .map(([name, val]) => ({ name, quantity: val.quantity, revenue: val.revenue }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    revenueByPaymentMethod: { cod, prepaid, other },
    topProducts,
    orderStatusBuckets: statusMap
  };
}

/**
 * Tổng hợp dữ liệu sản phẩm để lọc tồn kho thấp & hết hàng
 */
export function aggregateInventoryMetrics(products: any, threshold: number = 10): InventoryMetrics {
  let outOfStockCount = 0;
  const lowStockProducts: Array<{ name: string; onHand: number }> = [];
  
  const items = Array.isArray(products) ? products : (products?.data || []);
  const productList = Array.isArray(items) ? items : [];

  for (const p of productList) {
    if (!p) continue;
    const name = String(p.name || p.productName || p.fullName || 'Sản phẩm không tên');
    
    // Hỗ trợ trường tồn kho khác nhau của Pancake vs KiotViet
    const onHand = Number(
      p.onHand !== undefined ? p.onHand : 
      p.quantity !== undefined ? p.quantity : 
      p.on_hand !== undefined ? p.on_hand : 0
    );
    
    if (onHand <= 0) {
      outOfStockCount++;
    } else if (onHand < threshold) {
      lowStockProducts.push({ name, onHand });
    }
  }

  return {
    lowStockProducts: lowStockProducts.sort((a, b) => a.onHand - b.onHand).slice(0, 10),
    outOfStockCount,
    totalSkuCount: productList.length
  };
}

/**
 * Tổng hợp đơn hàng lỗi hoặc chờ xử lý lâu quá 24h
 */
export function aggregateOrderIssues(orders: any): OrderIssueMetrics {
  let pendingOrdersCount = 0;
  let cancelledOrdersCount = 0;
  let returnedOrdersCount = 0;
  const details: any[] = [];
  const nowTime = Date.now();

  const orderList = Array.isArray(orders) ? orders : [];

  for (const order of orderList) {
    if (!order) continue;
    
    const status = String(order.status || order.statusText || '').toLowerCase();
    
    // Kiểm tra trạng thái đơn hủy/hoàn trả
    if (status.includes('cancel') || status.includes('hủy') || status === '5') {
      cancelledOrdersCount++;
    } else if (status.includes('return') || status.includes('trả') || status.includes('hoàn')) {
      returnedOrdersCount++;
    } 
    
    // Kiểm tra đơn hàng đang ở trạng thái chờ xử lý
    if (
      status.includes('pending') || 
      status.includes('chờ') || 
      status === '1' || 
      status === 'new' || 
      status === 'mới' ||
      status === ''
    ) {
      pendingOrdersCount++;
      
      // Kiểm tra nếu tạo quá 24h mà chưa xử lý
      const dateStr = order.inserted_at || order.createdDate || order.createdAt;
      if (dateStr) {
        // Fix timezone: Pancake trả UTC nhưng thiếu Z, hệ thống phải ép Z vào cuối nếu cần
        const normalizedDateStr = (typeof dateStr === 'string' && !dateStr.endsWith('Z') && dateStr.length === 19) 
          ? `${dateStr}Z` 
          : dateStr;
        const createdTime = new Date(normalizedDateStr).getTime();
        if (!isNaN(createdTime) && (nowTime - createdTime > 24 * 60 * 60 * 1000)) {
          details.push({
            id: String(order.id || order.code || 'N/A'),
            customerName: String(order.customer_name || order.customerName || order.customer?.name || 'Khách lẻ'),
            totalPrice: Number(order.total_price || order.total || 0),
            statusText: order.status || order.statusText || 'Mới',
            timeString: new Date(createdTime).toLocaleString('vi-VN')
          });
        }
      }
    }
  }

  return {
    pendingOrdersCount,
    cancelledOrdersCount,
    returnedOrdersCount,
    details: details.slice(0, 10)
  };
}

/**
 * Tổng hợp dữ liệu thống kê nhân viên chat
 */
export function aggregateChatStaffMetrics(data: any) {
  const staffList = Array.isArray(data) ? data : (data?.data || []);
  let totalMessages = 0;
  let totalConversations = 0;
  const staffMap = new Map<string, any>();

  for (const s of staffList) {
    if (!s) continue;
    const name = s.name || s.full_name || 'Nhân viên Ẩn';
    const msgs = Number(s.messages || 0);
    const convs = Number(s.conversations || 0);

    totalMessages += msgs;
    totalConversations += convs;

    if (!staffMap.has(name)) {
      staffMap.set(name, { name, messages: 0, conversations: 0 });
    }
    const current = staffMap.get(name);
    current.messages += msgs;
    current.conversations += convs;
  }

  const sortedStaff = Array.from(staffMap.values())
    .sort((a, b) => b.messages - a.messages);

  return {
    totalMessages,
    totalConversations,
    topStaff: sortedStaff.slice(0, 5),
    allStaff: sortedStaff
  };
}

/**
 * Tổng hợp dữ liệu thống kê Fanpage
 */
export function aggregateChatPageMetrics(data: any) {
  const pageList = Array.isArray(data) ? data : (data?.data || []);
  let totalMessages = 0;
  let totalConversations = 0;
  let totalComments = 0;
  let totalNewCustomers = 0;
  const pageStats: any[] = [];
  const platformStats: Record<string, number> = {};

  for (const p of pageList) {
    if (!p) continue;
    const name = p._page_name || 'Page Không Rõ';
    const msgs = Number(p.messages || 0);
    const convs = Number(p.conversations || p.inbox || 0);
    const comments = Number(p.comments || 0);
    const newCust = Number(p.new_customers || 0);
    const platform = String(p.platform || 'khác').toLowerCase();

    totalMessages += msgs;
    totalConversations += convs;
    totalComments += comments;
    totalNewCustomers += newCust;
    
    if (!platformStats[platform]) platformStats[platform] = 0;
    platformStats[platform] += newCust;

    pageStats.push({ name, platform, messages: msgs, conversations: convs, comments, new_customers: newCust });
  }

  return {
    totalPages: pageList.length,
    totalMessages,
    totalConversations,
    totalComments,
    totalNewCustomers,
    platformStats,
    pageStats: pageStats.sort((a, b) => b.messages - a.messages)
  };
}

/**
 * Formatter chung cho mọi dữ liệu không xác định
 */
export function aggregateGenericData(data: any, title: string) {
  const arr = Array.isArray(data) ? data : (data?.data || []);
  return {
    title,
    totalItems: arr.length,
    sampleData: arr.slice(0, 5)
  };
}

/**
 * Định nghĩa cấu trúc kết quả phân tích khách hàng
 */
export interface CustomerAnalysisMetrics {
  totalOrders: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  guestCustomersCount: number;
  newCustomersRevenue: number;
  returningCustomersRevenue: number;
  guestCustomersRevenue: number;
}

/**
 * Phân tích khách mới vs khách quen dựa trên đơn hàng hôm nay so với 90 ngày trước
 */
export function aggregateCustomerAnalysis(todayOrders: any[], prev90Orders: any[]): CustomerAnalysisMetrics {
  const getCustomerId = (o: any) => {
    return o.customer_id || o.customer?.id || o.customer?.phone_number || o.customer_phone || o.customer?.phone || null;
  };

  const prevCustomerIds = new Set<string>();
  prev90Orders.forEach(o => {
    const cid = getCustomerId(o);
    if (cid) {
      prevCustomerIds.add(String(cid).trim());
    }
  });

  let newCustomersCount = 0;
  let returningCustomersCount = 0;
  let guestCustomersCount = 0;
  let newCustomersRevenue = 0;
  let returningCustomersRevenue = 0;
  let guestCustomersRevenue = 0;

  todayOrders.forEach(o => {
    if (!o) return;
    const cid = getCustomerId(o);
    const price = Number(o.total_price_after_sub_discount ?? o.total_price ?? o.totalPayment ?? 0);

    if (!cid) {
      guestCustomersCount++;
      guestCustomersRevenue += price;
    } else if (prevCustomerIds.has(String(cid).trim())) {
      returningCustomersCount++;
      returningCustomersRevenue += price;
    } else {
      newCustomersCount++;
      newCustomersRevenue += price;
    }
  });

  return {
    totalOrders: todayOrders.length,
    newCustomersCount,
    returningCustomersCount,
    guestCustomersCount,
    newCustomersRevenue,
    returningCustomersRevenue,
    guestCustomersRevenue
  };
}

