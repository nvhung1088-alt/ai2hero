import { StandardOrder } from './types';

/**
 * Cấu hình đồng bộ do user thiết lập qua UI Mapping Manager
 */
export interface SyncConfig {
  // Pancake POS warehouse_id ↔ KiotViet branchId
  warehouseMapping: Record<string, number>;  // { "wh_pancake_123": 100001 }
  defaultBranchId: number;                   // fallback KiotViet branchId
  defaultWarehouseId: string;                // fallback Pancake warehouse_id
  
  // KiotViet surchargeId cho phí vận chuyển
  shippingSurchargeId?: number;
  
  // Bảng SKU → variation_id (cache để tránh gọi API liên tục)
  skuToVariationId?: Record<string, string>; // { "AO-THUN-M-DO": "var_999999" }
}

// ═══════════════════════════════════════════
// Standard → KiotViet Order Payload
// ═══════════════════════════════════════════

export interface KiotVietOrderPayload {
  branchId: number;
  status: number;
  description?: string;
  customer?: {
    name: string;
    contactNumber?: string;
    address?: string;
    email?: string;
  };
  orderDetails: Array<{
    productCode: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  total?: number;
  discount?: number;
  surcharges?: Array<{
    surchargeId: number;
    surchargeValue: number;
    surChargeName: string;
  }>;
}

export function translateToKiotViet(
  order: StandardOrder,
  config: SyncConfig
): KiotVietOrderPayload {
  // Map warehouse → branch
  const branchId = config.warehouseMapping[order.warehouseId || ''] || config.defaultBranchId;

  // Map status: Standard → KiotViet
  let kvStatus = 1; // Mới
  if (order.status === 'cancelled') kvStatus = 2;
  if (order.status === 'pending') kvStatus = 1;

  // Map products → orderDetails (dùng SKU làm productCode)
  const orderDetails = order.products.map(p => ({
    productCode: p.sku,
    quantity: p.quantity,
    price: p.price,
    discount: 0
  }));

  // Map shippingFee → surcharges (Tên phụ thu cố định là "Thu khác" theo yêu cầu của user)
  const surcharges: KiotVietOrderPayload['surcharges'] = [];
  if (order.shippingFee && order.shippingFee > 0) {
    surcharges.push({
      surchargeId: config.shippingSurchargeId || 0,
      surchargeValue: order.shippingFee,
      surChargeName: 'Thu khác'
    });
  }

  return {
    branchId,
    status: kvStatus,
    description: `Đồng bộ từ Pancake POS — Mã gốc: ${order.orderCode}. ${order.notes || ''}`.trim(),
    customer: {
      name: order.customer.name,
      contactNumber: order.customer.phone || undefined,
      address: order.customer.address || undefined,
      email: order.customer.email || undefined
    },
    orderDetails,
    total: order.totalAmount,
    discount: order.discount || 0,
    surcharges: surcharges.length > 0 ? surcharges : undefined
  };
}

// ═══════════════════════════════════════════
// Standard → Pancake POS Order Payload
// ═══════════════════════════════════════════

export interface PancakeOrderPayload {
  buyer_name: string;
  phone: string;
  address?: string;
  warehouse_id: string;
  status: number;
  note?: string;
  discount?: number;
  shipping_fee?: number;
  cod_amount?: number;
  products: Array<{
    variation_id: string;
    quantity: number;
    price: number;
  }>;
}

export function translateToPancake(
  order: StandardOrder,
  config: SyncConfig
): PancakeOrderPayload {
  // Map branch → warehouse (reverse lookup)
  const reverseMap = Object.entries(config.warehouseMapping);
  const warehouseEntry = reverseMap.find(([_, branchId]) => branchId === Number(order.warehouseId));
  const warehouseId = warehouseEntry ? warehouseEntry[0] : config.defaultWarehouseId;

  // Map products → SKU → variation_id (lookup bắt buộc)
  const products = order.products.map(p => {
    const variationId = config.skuToVariationId?.[p.sku];
    if (!variationId) {
      throw new Error(
        `Không tìm thấy variation_id cho SKU "${p.sku}" trên Pancake POS. ` +
        `Hãy đảm bảo SKU "${p.sku}" tồn tại trên cả hai hệ thống và đã được đồng bộ trong bảng SKU mapping.`
      );
    }
    return {
      variation_id: variationId,
      quantity: p.quantity,
      price: p.price
    };
  });

  return {
    buyer_name: order.customer.name || 'Khách lẻ',
    phone: order.customer.phone || '',
    address: order.customer.address || undefined,
    warehouse_id: warehouseId,
    status: 1,  // Đơn mới
    note: `Đồng bộ từ KiotViet — Mã gốc: ${order.orderCode}. ${order.notes || ''}`.trim(),
    discount: order.discount || 0,
    shipping_fee: order.shippingFee || 0,
    cod_amount: order.codAmount || 0,
    products
  };
}

// ═══════════════════════════════════════════
// Helper: Build SKU → variation_id cache
// ═══════════════════════════════════════════

/**
 * Hàm này sẽ được gọi khi khởi tạo sync session.
 * Nó query Pancake POS list_products để build bảng tra cứu SKU → variation_id.
 */
export function buildSkuVariationMap(pancakeProducts: Array<{ sku: string; variationId?: string; id?: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of pancakeProducts) {
    const sku = (p.sku || '').trim();
    const varId = p.variationId || p.id || '';
    if (sku && varId) {
      map[sku] = String(varId);
    }
  }
  return map;
}
