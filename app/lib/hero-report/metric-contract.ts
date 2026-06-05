/**
 * Chuẩn hóa các Metrics và Status Code cho Hero Report
 * Đảm bảo các aggregator, logic engine sử dụng chung một nguồn sự thật.
 */

// Mapping trạng thái đơn hàng của Pancake POS
export const PANCAKE_ORDER_STATUS = {
  NEW: 0,
  CONFIRMED: 1,
  SHIPPING: 2,
  DELIVERED: 3,
  CANCELLED: 5,
  RETURNED: 10,
  PACKING: 8,
  WAITING_SHIP: 9,
  PAID: 16,
} as const;

// Nhóm trạng thái tính vào Đơn chốt (Đã xác nhận và không bị hủy/hoàn)
export const REPORT_INCLUDED_STATUSES = [
  PANCAKE_ORDER_STATUS.CONFIRMED,
  PANCAKE_ORDER_STATUS.SHIPPING,
  PANCAKE_ORDER_STATUS.DELIVERED,
  PANCAKE_ORDER_STATUS.PACKING,
  PANCAKE_ORDER_STATUS.WAITING_SHIP,
  PANCAKE_ORDER_STATUS.PAID,
];

// Nhóm trạng thái bị hủy/hoàn/hỏng
export const REPORT_EXCLUDED_STATUSES = [
  PANCAKE_ORDER_STATUS.CANCELLED,
  PANCAKE_ORDER_STATUS.RETURNED,
];

// Định nghĩa cơ bản về Metric
export const HERO_REPORT_METRICS = {
  grossSales: {
    label: 'Doanh số',
    description: 'Tổng giá trị hàng hóa.',
    source: 'order.total_price_after_sub_discount'
  },
  collectedRevenue: {
    label: 'Tiền thực thu',
    description: 'Tiền thực tế đã thu (Khách trả trước + COD).',
    source: 'order.cod + order.prepaid'
  },
  confirmedOrders: {
    label: 'Đơn chốt',
    description: 'Đơn hàng không nằm trong nhóm bị hủy/hoàn.',
    statusGroup: REPORT_INCLUDED_STATUSES
  }
};
