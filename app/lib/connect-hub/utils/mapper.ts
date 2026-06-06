import { StandardCustomer, StandardProduct, StandardOrder } from './types';

export interface MappingConfigField {
  selected: string;
  suggestions: string[];
}

export type MappingConfig = Record<string, MappingConfigField | string[]>;

// Helper migrate cấu hình cũ (mảng các tag) sang cấu hình mới (chọn duy nhất kèm gợi ý)
export function migrateLegacyConfig(config?: Record<string, any>): Record<string, MappingConfigField> {
  if (!config) return {};
  const migrated: Record<string, MappingConfigField> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        migrated[key] = {
          selected: value[0] || '',
          suggestions: value
        };
      } else if (value.selected !== undefined) {
        migrated[key] = {
          selected: value.selected,
          suggestions: value.suggestions || [value.selected]
        };
      }
    }
  }
  return migrated;
}

// Helper tìm giá trị động từ cấu hình mapping mới hoặc cũ
export function getMappedValue(
  raw: any,
  mappedField: MappingConfigField | string[] | undefined,
  fallbackKeys: string[],
  defaultValue: any = ''
) {
  if (!raw) return defaultValue;

  if (mappedField) {
    if (Array.isArray(mappedField)) {
      // Kiểu cũ (Legacy): Thử lần lượt các key trong mảng
      const keysToTry = mappedField.length > 0 ? mappedField : fallbackKeys;
      for (const key of keysToTry) {
        if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
          return raw[key];
        }
      }
    } else if (typeof mappedField === 'object' && mappedField.selected) {
      // Kiểu mới: Thử key được chọn trước
      const key = mappedField.selected;
      if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
        return raw[key];
      }
      // Nếu key được chọn rỗng/null, fallback qua suggestions
      const suggestions = mappedField.suggestions || [];
      const keysToTry = suggestions.length > 0 ? suggestions : fallbackKeys;
      for (const k of keysToTry) {
        if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') {
          return raw[k];
        }
      }
    }
  }

  // Fallback mặc định: Thử danh sách keys dự phòng chuẩn
  for (const key of fallbackKeys) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
      return raw[key];
    }
  }

  return defaultValue;
}

export function mapPancakeCustomer(raw: any, config?: MappingConfig): StandardCustomer {
  if (!raw) {
    return {
      id: '',
      name: 'Khách lẻ',
      phone: '',
      address: '',
      email: '',
      createdAt: new Date().toISOString(),
      group: '',
      gender: '',
      birthday: '',
      customerId: '',
      notes: '',
      points: 0,
      level: '',
      totalSpend: 0
    };
  }
  const conf = config || {};

  return {
    id: String(getMappedValue(raw, conf['customer.id'], ['id', 'customer_id'])),
    name: String(getMappedValue(raw, conf['customer.name'], ['name', 'customer_name'], 'Khách lẻ')),
    phone: String(getMappedValue(raw, conf['customer.phone'], ['phone', 'phone_number', 'customer_phone'])),
    address: String(getMappedValue(raw, conf['customer.address'], ['address', 'customer_address'])),
    email: String(getMappedValue(raw, conf['customer.email'], ['email', 'customer_email'])),
    createdAt: String(getMappedValue(raw, conf['customer.createdAt'], ['createdAt', 'created_at', 'inserted_at'], new Date().toISOString())),
    group: String(getMappedValue(raw, conf['customer.group'], ['group', 'customer_group', 'level'])),
    gender: String(getMappedValue(raw, conf['customer.gender'], ['gender', 'sex'])),
    birthday: String(getMappedValue(raw, conf['customer.birthday'], ['birthday', 'birth_day'])),
    
    // Các trường mới
    customerId: String(getMappedValue(raw, conf['customer.customerId'], ['customer_id', 'display_id', 'code'])),
    notes: String(getMappedValue(raw, conf['customer.notes'], ['notes', 'note', 'ghi_chu'])),
    points: Number(getMappedValue(raw, conf['customer.points'], ['points', 'diem', 'diem_tich_luy'], 0)),
    level: String(getMappedValue(raw, conf['customer.level'], ['level', 'level_name', 'hang_thanh_vien'])),
    totalSpend: Number(getMappedValue(raw, conf['customer.totalSpend'], ['total_spend', 'total_amount', 'tong_chi_tieu'], 0))
  };
}

export function mapPancakeProduct(raw: any, config?: MappingConfig): StandardProduct {
  if (!raw) {
    return {
      id: '',
      name: '',
      sku: '',
      price: 0,
      quantity: 0,
      imageUrl: '',
      barcode: '',
      costPrice: 0,
      weight: 0,
      category: '',
      description: '',
      shortDescription: '',
      wholesalePrice: 0,
      lastImportedPrice: 0,
      isComposite: false,
      compositeProducts: [],
      color: '',
      size: '',
      material: '',
      brand: '',
      unit: '',
      supplier: '',
      status: '',
      isHidden: false,
      isSellNegative: false,
      variationId: '',
      parentId: '',
      images: []
    };
  }
  const conf = config || {};

  // Trích xuất thông minh color/size/material từ mảng fields của Pancake
  let colorVal = getMappedValue(raw, conf['product.color'], ['color', 'colour', 'mau', 'mau_sac']);
  let sizeVal = getMappedValue(raw, conf['product.size'], ['size', 'kich_thuoc', 'kich_co']);
  let materialVal = getMappedValue(raw, conf['product.material'], ['material', 'chat_lieu']);

  if (Array.isArray(raw.fields)) {
    if (!colorVal) {
      const cField = raw.fields.find((f: any) => {
        const n = String(f.name || '').toLowerCase();
        return n.includes('màu') || n.includes('color') || n.includes('colour');
      });
      if (cField) colorVal = cField.value || cField.keyValue;
    }
    if (!sizeVal) {
      const sField = raw.fields.find((f: any) => {
        const n = String(f.name || '').toLowerCase();
        return n.includes('size') || n.includes('kích thước') || n.includes('kích cỡ');
      });
      if (sField) sizeVal = sField.value || sField.keyValue;
    }
    if (!materialVal) {
      const mField = raw.fields.find((f: any) => {
        const n = String(f.name || '').toLowerCase();
        return n.includes('chất liệu') || n.includes('vải') || n.includes('material');
      });
      if (mField) materialVal = mField.value || mField.keyValue;
    }
  }

  // Xử lý danh sách ảnh phụ
  let imagesVal: string[] = [];
  const rawImages = raw.images;
  if (Array.isArray(rawImages)) {
    imagesVal = rawImages.map(img => typeof img === 'string' ? img : img.url || img.image_url || '').filter(Boolean);
  } else {
    const singleImg = getMappedValue(raw, conf['product.imageUrl'], ['imageUrl', 'image_url', 'image']);
    if (singleImg) imagesVal = [String(singleImg)];
  }

  return {
    id: String(getMappedValue(raw, conf['product.id'], ['id', 'product_id'])),
    name: String(getMappedValue(raw, conf['product.name'], ['name', 'title'])),
    sku: String(getMappedValue(raw, conf['product.sku'], ['sku', 'product_sku'])),
    price: Number(getMappedValue(raw, conf['product.price'], ['price'], 0)),
    quantity: Number(getMappedValue(raw, conf['product.quantity'], ['quantity', 'inventory', 'stock'], 0)),
    imageUrl: String(getMappedValue(raw, conf['product.imageUrl'], ['imageUrl', 'image_url', 'image'])),
    barcode: String(getMappedValue(raw, conf['product.barcode'], ['barcode', 'bar_code'])),
    costPrice: Number(getMappedValue(raw, conf['product.costPrice'], ['costPrice', 'cost_price', 'importPrice', 'import_price'], 0)),
    weight: Number(getMappedValue(raw, conf['product.weight'], ['weight', 'product_weight'], 0)),
    category: String(getMappedValue(raw, conf['product.category'], ['category', 'category_name', 'product_category'])),

    // Các trường mới phục vụ quản lý kho & kinh doanh chi tiết
    description: String(getMappedValue(raw, conf['product.description'], ['description', 'mo_ta'])),
    shortDescription: String(getMappedValue(raw, conf['product.shortDescription'], ['short_description', 'mo_ta_ngan'])),
    wholesalePrice: Number(getMappedValue(raw, conf['product.wholesalePrice'], ['wholesale_price', 'gia_si'], 0)),
    lastImportedPrice: Number(getMappedValue(raw, conf['product.lastImportedPrice'], ['last_imported_price', 'gia_nhap_cuoi'], 0)),
    isComposite: Boolean(getMappedValue(raw, conf['product.isComposite'], ['is_composite', 'composite'], false)),
    compositeProducts: Array.isArray(raw.composite_products) ? raw.composite_products : [],
    color: String(colorVal || ''),
    size: String(sizeVal || ''),
    material: String(materialVal || ''),
    brand: String(getMappedValue(raw, conf['product.brand'], ['brand', 'brand_name', 'thuong_hieu'])),
    unit: String(getMappedValue(raw, conf['product.unit'], ['unit', 'don_vi', 'don_vi_tinh'])),
    supplier: String(getMappedValue(raw, conf['product.supplier'], ['supplier', 'nha_cung_cap'])),
    status: String(getMappedValue(raw, conf['product.status'], ['status', 'trang_thai'])),
    isHidden: Boolean(getMappedValue(raw, conf['product.isHidden'], ['is_hidden', 'hidden'], false)),
    isSellNegative: Boolean(getMappedValue(raw, conf['product.isSellNegative'], ['is_sell_negative_variation', 'sell_negative'], false)),
    variationId: String(getMappedValue(raw, conf['product.variationId'], ['id', 'variation_id', 'product_id'])),
    parentId: String(getMappedValue(raw, conf['product.parentId'], ['product_id', 'parent_id'])),
    images: imagesVal
  };
}

export function mapPancakeOrder(raw: any, config?: MappingConfig): StandardOrder {
  if (!raw) {
    return {
      id: '',
      orderCode: '',
      customer: mapPancakeCustomer(null, config),
      products: [],
      totalAmount: 0,
      discount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notes: '',
      paymentMethod: '',
      shippingFee: 0,
      codAmount: 0,
      partnerFee: 0,
      tags: [],
      salesChannel: '',
      warehouseId: '',
      statusName: '',
      receivedAtShop: '',
      creator: '',
      conversationId: '',
      pageId: ''
    };
  }
  const conf = config || {};

  // Trích xuất nested customer
  const rawCustomer = raw.customer ?? {
    customer_id: raw.customer_id,
    customer_name: raw.customer_name ?? raw.buyer_name ?? raw.bill_full_name,
    customer_phone: raw.customer_phone ?? raw.buyer_phone ?? raw.phone ?? raw.bill_phone_number,
    customer_address: raw.customer_address ?? raw.buyer_address ?? raw.address,
    customer_email: raw.customer_email ?? raw.buyer_email ?? raw.email ?? raw.bill_email,
    created_at: raw.created_at ?? raw.createdAt ?? raw.inserted_at,
    group: raw.group ?? raw.customer_group ?? raw.level,
    gender: raw.gender ?? raw.sex,
    birthday: raw.birthday ?? raw.birth_day
  };

  const rawProducts = Array.isArray(raw.products)
    ? raw.products
    : Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.order_items)
    ? raw.order_items
    : [];

  const products = rawProducts.map((p: any) => mapPancakeProduct(p, config));

  let status: 'pending' | 'completed' | 'cancelled' = 'pending';
  const rawStatus = String(getMappedValue(raw, conf['order.status'], ['status'])).toLowerCase().trim();
  
  if (['completed', 'success', 'done', 'delivered', 'paid', 'đã hoàn thành', 'thành công', '20'].includes(rawStatus)) {
    status = 'completed';
  } else if (['cancelled', 'canceled', 'refunded', 'voided', 'đã hủy', 'huỷ', '6'].includes(rawStatus)) {
    status = 'cancelled';
  }

  const rawTagsValue = getMappedValue(raw, conf['order.tags'], ['tags', 'tag_names', 'labels'], []);
  const tags = Array.isArray(rawTagsValue)
    ? rawTagsValue.map(String)
    : typeof rawTagsValue === 'string'
    ? rawTagsValue.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    id: String(getMappedValue(raw, conf['order.id'], ['id', 'order_id'])),
    orderCode: String(getMappedValue(raw, conf['order.orderCode'], ['orderCode', 'order_code', 'code', 'order_id', 'id'])),
    customer: mapPancakeCustomer(rawCustomer, config),
    products,
    totalAmount: Number(getMappedValue(raw, conf['order.totalAmount'], ['totalAmount', 'total_amount', 'total', 'price'], 0)),
    discount: Number(getMappedValue(raw, conf['order.discount'], ['discount'], 0)),
    status,
    createdAt: String(getMappedValue(raw, conf['order.createdAt'], ['createdAt', 'created_at', 'inserted_at'], new Date().toISOString())),
    notes: String(getMappedValue(raw, conf['order.notes'], ['notes', 'note', 'customer_note'])),
    paymentMethod: String(getMappedValue(raw, conf['order.paymentMethod'], ['paymentMethod', 'payment_method', 'payment_type'])),
    shippingFee: Number(getMappedValue(raw, conf['order.shippingFee'], ['shippingFee', 'shipping_fee', 'ship_fee'], 0)),
    codAmount: Number(getMappedValue(raw, conf['order.codAmount'], ['codAmount', 'cod_amount', 'cod'], 0)),
    partnerFee: Number(getMappedValue(raw, conf['order.partnerFee'], ['partnerFee', 'partner_fee', 'fee'], 0)),
    tags,
    salesChannel: String(getMappedValue(raw, conf['order.salesChannel'], ['salesChannel', 'sales_channel', 'channel', 'source'])),
    warehouseId: String(getMappedValue(raw, conf['order.warehouseId'], ['warehouseId', 'warehouse_id', 'warehouse'])),

    // Các trường mới hỗ trợ phân tích chuyên sâu
    statusName: String(getMappedValue(raw, conf['order.statusName'], ['status_name', 'statusName'])),
    receivedAtShop: String(getMappedValue(raw, conf['order.receivedAtShop'], ['received_at_shop', 'received_at'])),
    creator: String(getMappedValue(raw, conf['order.creator'], ['creator', 'created_by'])),
    conversationId: String(getMappedValue(raw, conf['order.conversationId'], ['conversation_id', 'chat_id'])),
    pageId: String(getMappedValue(raw, conf['order.pageId'], ['page_id', 'fanpage_id']))
  };
}

// ═══════════════════════════════════════════
// KIOTVIET MAPPER — Raw → Standard Interfaces
// ═══════════════════════════════════════════

export function mapKiotVietCustomer(raw: any, config?: MappingConfig): StandardCustomer {
  if (!raw) {
    return {
      id: '', name: 'Khách lẻ', phone: '', address: '', email: '',
      createdAt: new Date().toISOString(), group: '', gender: '', birthday: '',
      customerId: '', notes: '', points: 0, level: '', totalSpend: 0
    };
  }
  const conf = config || {};
  return {
    id: String(getMappedValue(raw, conf['customer.id'], ['id', 'customerId'])),
    name: String(getMappedValue(raw, conf['customer.name'], ['name', 'customerName'], 'Khách lẻ')),
    phone: String(getMappedValue(raw, conf['customer.phone'], ['contactNumber', 'phone'])),
    address: String(getMappedValue(raw, conf['customer.address'], ['address'])),
    email: String(getMappedValue(raw, conf['customer.email'], ['email'])),
    createdAt: String(getMappedValue(raw, conf['customer.createdAt'], ['createdDate', 'created_at'], new Date().toISOString())),
    group: String(getMappedValue(raw, conf['customer.group'], ['groupName', 'customerType'])),
    gender: String(getMappedValue(raw, conf['customer.gender'], ['gender'])),
    birthday: '',
    customerId: String(getMappedValue(raw, conf['customer.customerId'], ['code'])),
    notes: String(getMappedValue(raw, conf['customer.notes'], ['comments', 'description'])),
    points: 0,
    level: String(getMappedValue(raw, conf['customer.level'], ['groupName'])),
    totalSpend: Number(getMappedValue(raw, conf['customer.totalSpend'], ['totalInvoiced'], 0))
  };
}

export function mapKiotVietProduct(raw: any, config?: MappingConfig): StandardProduct {
  if (!raw) {
    return {
      id: '', name: '', sku: '', price: 0, quantity: 0, imageUrl: '',
      barcode: '', costPrice: 0, weight: 0, category: ''
    };
  }
  const conf = config || {};
  
  // KiotViet inventories: Lấy tổng onHand từ tất cả chi nhánh
  let totalOnHand = 0;
  if (Array.isArray(raw.inventories)) {
    totalOnHand = raw.inventories.reduce((sum: number, inv: any) => sum + (inv.onHand || 0), 0);
  }
  
  // Images: KiotViet trả mảng
  const imageArr = Array.isArray(raw.images) ? raw.images : [];
  const firstImage = imageArr.length > 0 ? String(imageArr[0]) : '';

  return {
    id: String(getMappedValue(raw, conf['product.id'], ['id', 'productId'])),
    name: String(getMappedValue(raw, conf['product.name'], ['fullName', 'name'])),
    sku: String(getMappedValue(raw, conf['product.sku'], ['code', 'productCode'])),
    price: Number(getMappedValue(raw, conf['product.price'], ['basePrice', 'price'], 0)),
    quantity: totalOnHand,
    imageUrl: firstImage,
    barcode: String(getMappedValue(raw, conf['product.barcode'], ['barcode'])),
    costPrice: Number(getMappedValue(raw, conf['product.costPrice'], ['cost'], 0)),
    weight: Number(getMappedValue(raw, conf['product.weight'], ['weight'], 0)),
    category: String(getMappedValue(raw, conf['product.category'], ['categoryName'])),
    unit: String(getMappedValue(raw, conf['product.unit'], ['unit'])),
    brand: '',
    images: imageArr.map(String)
  };
}

export function mapKiotVietOrder(raw: any, config?: MappingConfig): StandardOrder {
  if (!raw) {
    return {
      id: '', orderCode: '', customer: mapKiotVietCustomer(null, config),
      products: [], totalAmount: 0, discount: 0, status: 'pending',
      createdAt: new Date().toISOString(), notes: '', paymentMethod: '',
      shippingFee: 0, codAmount: 0, partnerFee: 0, tags: [],
      salesChannel: '', warehouseId: ''
    };
  }
  const conf = config || {};

  // Customer: KiotViet có thể embed hoặc chỉ có customerName/contactNumber
  const rawCustomer = raw.customer ?? {
    name: raw.customerName,
    contactNumber: raw.contactNumber,
    address: raw.address,
    email: raw.email
  };

  // Products: KiotViet dùng orderDetails
  const rawDetails = Array.isArray(raw.orderDetails) ? raw.orderDetails : [];
  const products = rawDetails.map((d: any) => mapKiotVietProduct(d, config));

  // Status mapping: KiotViet Order → Standard
  let status: 'pending' | 'completed' | 'cancelled' = 'pending';
  const kvStatus = Number(raw.status);
  if (kvStatus === 2) status = 'cancelled';
  // KiotViet Order status 1=Mới, 3=Đang xử lý → both are 'pending'
  // Completed chỉ khi đã thành Invoice (status=1 ở Invoice)

  // Surcharges → shippingFee
  let shippingFee = 0;
  if (Array.isArray(raw.surcharges)) {
    shippingFee = raw.surcharges.reduce((sum: number, s: any) => sum + (s.surchargeValue || 0), 0);
  }

  return {
    id: String(getMappedValue(raw, conf['order.id'], ['id'])),
    orderCode: String(getMappedValue(raw, conf['order.orderCode'], ['code'])),
    customer: mapKiotVietCustomer(rawCustomer, config),
    products,
    totalAmount: Number(getMappedValue(raw, conf['order.totalAmount'], ['total', 'totalPayment'], 0)),
    discount: Number(getMappedValue(raw, conf['order.discount'], ['discount'], 0)),
    status,
    createdAt: String(getMappedValue(raw, conf['order.createdAt'], ['purchaseDate', 'createdDate'], new Date().toISOString())),
    notes: String(getMappedValue(raw, conf['order.notes'], ['description', 'comments'])),
    paymentMethod: '',
    shippingFee,
    codAmount: 0,
    partnerFee: 0,
    tags: [],
    salesChannel: '',
    warehouseId: String(getMappedValue(raw, conf['order.warehouseId'], ['branchId']))
  };
}

export function normalizeData(appSlug: string, actionSlug: string, rawData: any, mappingConfig?: MappingConfig): any {
  if (!rawData) return rawData;

  if (appSlug === 'pancake-pos') {
    switch (actionSlug) {
      case 'list_orders': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapPancakeOrder(item, mappingConfig));
      }
      case 'list_products': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapPancakeProduct(item, mappingConfig));
      }
      case 'list_customers': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapPancakeCustomer(item, mappingConfig));
      }
      default:
        return rawData;
    }
  }

  if (appSlug === 'kiotviet') {
    switch (actionSlug) {
      case 'list_orders': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapKiotVietOrder(item, mappingConfig));
      }
      case 'list_products': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapKiotVietProduct(item, mappingConfig));
      }
      case 'list_customers': {
        const list = Array.isArray(rawData) ? rawData : [rawData];
        return list.map(item => mapKiotVietCustomer(item, mappingConfig));
      }
      default:
        return rawData;
    }
  }

  return rawData;
}

