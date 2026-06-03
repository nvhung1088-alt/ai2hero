// Từ khóa đồng nghĩa tiếng Anh & tiếng Việt để so khớp trường tự động
const SYNONYMS: Record<string, string[]> = {
  id: ['id', 'uuid', 'key', 'code', 'display_id', 'ma', 'ma_he_thong'],
  name: ['name', 'title', 'full_name', 'display_name', 'ten', 'ten_sp', 'tieu_de'],
  sku: ['sku', 'code', 'product_sku', 'model', 'ma_vach', 'ma_hang'],
  price: ['price', 'retail_price', 'sell_price', 'base_price', 'gia', 'gia_ban', 'gia_ban_le'],
  quantity: ['quantity', 'qty', 'inventory', 'stock', 'on_hand', 'onhand', 'amount', 'so_luong', 'ton', 'ton_kho'],
  imageUrl: ['image', 'images', 'image_url', 'imageUrl', 'avatar', 'thumbnail', 'anh', 'hinh_anh'],
  barcode: ['barcode', 'bar_code', 'upc', 'ean', 'ma_vach'],
  costPrice: ['cost', 'cost_price', 'costPrice', 'import_price', 'importPrice', 'purchase_price', 'gia_von', 'gia_nhap'],
  weight: ['weight', 'product_weight', 'mass', 'khoi_luong', 'trong_luong', 'gram'],
  category: ['category', 'category_name', 'group', 'product_category', 'danhmuc', 'danh_muc', 'nhom_hang'],
  
  description: ['description', 'desc', 'content', 'body', 'mo_ta', 'noi_dung'],
  shortDescription: ['short_description', 'short_desc', 'mo_ta_ngan', 'tom_tat'],
  wholesalePrice: ['wholesale_price', 'wholesalePrice', 'wholesale', 'dealer_price', 'gia_si', 'gia_ban_buon'],
  lastImportedPrice: ['last_imported_price', 'lastImportedPrice', 'import_price_latest', 'gia_nhap_cuoi', 'nhap_cuoi'],
  isComposite: ['is_composite', 'composite', 'combo', 'set', 'is_combo', 'is_set'],
  compositeProducts: ['composite_products', 'compositeProducts', 'parts', 'items', 'combo_items', 'sp_thanh_phan'],
  color: ['color', 'colour', 'color_value', 'mau', 'mau_sac'],
  size: ['size', 'size_value', 'kich_co', 'kich_thuoc', 'co'],
  material: ['material', 'chat_lieu', 'vai'],
  brand: ['brand', 'brand_name', 'manufacturer', 'thuong_hieu', 'nhan_hieu', 'hang_sx'],
  unit: ['unit', 'unit_name', 'don_vi', 'don_vi_tinh', 'dvt'],
  supplier: ['supplier', 'vendor', 'nha_cung_cap', 'ncc'],
  status: ['status', 'state', 'trang_thai'],
  isHidden: ['is_hidden', 'hidden', 'an', 'an_sp'],
  isSellNegative: ['is_sell_negative', 'sell_negative', 'allow_negative', 'cho_ban_am', 'ban_am'],
  variationId: ['variation_id', 'variationId', 'var_id', 'id'],
  parentId: ['parent_id', 'parentId', 'product_id', 'id_goc'],
  images: ['images', 'image_list', 'image_urls', 'anh_phu', 'danh_sach_anh'],

  phone: ['phone', 'phone_number', 'contact', 'sdt', 'so_dien_thoai', 'dien_thoai'],
  address: ['address', 'delivery_address', 'dia_chi'],
  email: ['email', 'mail', 'thu_dien_tu'],
  createdAt: ['createdAt', 'created_at', 'inserted_at', 'created_date', 'ngay_tao'],
  group: ['group', 'customer_group', 'group_name', 'nhom', 'nhom_khach_hang'],
  gender: ['gender', 'sex', 'gioi_tinh'],
  birthday: ['birthday', 'birth_day', 'birth_date', 'ngay_sinh'],
  customerId: ['customer_id', 'display_id', 'code', 'customer_code', 'ma_kh', 'ma_khach_hang'],
  notes: ['notes', 'note', 'comment', 'description', 'ghi_chu', 'chu_y'],
  points: ['points', 'point', 'reward_points', 'diem', 'diem_tich_luy', 'diem_thuong'],
  level: ['level', 'level_name', 'rank', 'hang', 'hang_thanh_vien', 'cap_bac'],
  totalSpend: ['total_spend', 'total_spend_amount', 'total_amount', 'tong_chi_tieu', 'tong_tien_mua'],

  orderCode: ['order_code', 'orderCode', 'code', 'bill_code', 'ma_don', 'ma_don_hang', 'so_hoa_don'],
  totalAmount: ['total_amount', 'totalAmount', 'total', 'final_amount', 'tong_tien', 'thanh_toan'],
  discount: ['discount', 'discount_amount', 'giam_gia', 'khuyen_mai', 'chiet_khau'],
  paymentMethod: ['payment_method', 'paymentMethod', 'payment_type', 'phuong_thuc_thanh_toan', 'pttt'],
  shippingFee: ['shipping_fee', 'shippingFee', 'ship_fee', 'phi_ship', 'phi_van_chuyen'],
  codAmount: ['cod_amount', 'codAmount', 'cod', 'tien_thu_ho', 'thu_ho'],
  partnerFee: ['partner_fee', 'partnerFee', 'fee', 'phi_doi_tac', 'phi_san'],
  tags: ['tags', 'labels', 'tag_names', 'nhan', 'nhan_don'],
  salesChannel: ['sales_channel', 'salesChannel', 'channel', 'source', 'kenh_ban', 'kenh_ban_hang'],
  warehouseId: ['warehouse_id', 'warehouseId', 'branch_id', 'ma_kho', 'kho_hang'],
  statusName: ['status_name', 'statusName', 'status_display', 'ten_trang_thai'],
  receivedAtShop: ['received_at_shop', 'receivedAtShop', 'received_at', 'ngay_nhan'],
  creator: ['creator', 'created_by', 'employee_name', 'nguoi_tao'],
  conversationId: ['conversation_id', 'conversationId', 'chat_id', 'fb_chat_id', 'ma_hoi_thoai'],
  pageId: ['page_id', 'pageId', 'fb_page_id', 'ma_page']
};

// Hàm trích xuất keys phẳng của một object
function extractKeys(obj: any, prefix = '', depth = 0): string[] {
  if (!obj || typeof obj !== 'object' || depth > 3) return [];
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== undefined && value !== null) {
      keys.push(fullKey);
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        keys = keys.concat(extractKeys(value, fullKey, depth + 1));
      }
    }
  }
  return keys;
}

// Tính toán điểm số khớp giữa một key chuẩn (standardKey) và một key thô (rawKey)
function calculateMatchScore(standardKey: string, rawKey: string): number {
  const stdClean = standardKey.split('.').pop() || ''; // ví dụ 'quantity'
  const rawClean = rawKey.split('.').pop() || '';      // ví dụ 'inventory_quantity'
  
  const stdLower = stdClean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawLower = rawClean.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Trùng khớp hoàn toàn
  if (stdLower === rawLower) return 100;

  // 2. Khớp theo danh sách từ đồng nghĩa
  const synonyms = SYNONYMS[stdClean] || [];
  if (synonyms.includes(rawClean.toLowerCase())) {
    return 95;
  }
  
  // Kiểm tra nếu rawLower chứa bất kỳ từ đồng nghĩa nào
  for (const syn of synonyms) {
    const synClean = syn.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (rawLower === synClean) return 90;
    if (rawLower.includes(synClean) || synClean.includes(rawLower)) return 75;
  }

  // 3. Khớp một phần
  if (rawLower.includes(stdLower) || stdLower.includes(rawLower)) {
    return 80;
  }

  return 0;
}

/**
 * Tự động phân tích cấu trúc sample data và gợi ý mapping cấu hình
 * @param sampleData Đối tượng chứa dữ liệu mẫu { product: any, order: any, customer: any }
 * @param standardFields Định nghĩa các trường chuẩn (STANDARD_FIELDS_DEF)
 */
export function autoSuggestMapping(
  sampleData: { product?: any; order?: any; customer?: any },
  standardFields: { group: string; key: string; name: string; desc: string }[]
): Record<string, { selected: string; suggestions: string[] }> {
  const result: Record<string, { selected: string; suggestions: string[] }> = {};

  // Trích xuất keys của từng nhóm dữ liệu mẫu
  // 1. Customer keys
  let rawCustomer = sampleData.customer || {};
  if (!sampleData.customer && sampleData.order) {
    rawCustomer = sampleData.order.customer || sampleData.order.buyer || {};
  }
  const customerKeys = extractKeys(rawCustomer);

  // 2. Product keys
  let rawProduct = sampleData.product || {};
  if (!sampleData.product && sampleData.order) {
    const productsArr = sampleData.order.products || sampleData.order.items || sampleData.order.order_items || [];
    if (Array.isArray(productsArr) && productsArr.length > 0) {
      rawProduct = productsArr[0];
    }
  }
  const productKeys = extractKeys(rawProduct);

  // 3. Order keys
  const orderKeys = extractKeys(sampleData.order || {}).filter(k => {
    // Loại bỏ các key lồng sâu vào customer hoặc items/products để giảm nhiễu
    return !k.startsWith('customer.') && !k.startsWith('buyer.') && !k.startsWith('products.') && !k.startsWith('items.');
  });

  for (const field of standardFields) {
    const [groupName, fieldName] = field.key.split('.');
    
    // Chọn tập keys tương ứng dựa trên nhóm trường
    let targetKeys: string[] = [];
    if (groupName === 'customer') {
      targetKeys = customerKeys;
    } else if (groupName === 'product') {
      targetKeys = productKeys;
    } else if (groupName === 'order') {
      targetKeys = orderKeys;
    }

    // Đánh giá điểm khớp của từng raw key với standard field
    const scoredKeys = targetKeys
      .map(rawKey => ({
        key: rawKey,
        score: calculateMatchScore(field.key, rawKey)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const suggestions = scoredKeys.map(item => item.key);
    const selected = suggestions[0] || '';

    result[field.key] = {
      selected,
      suggestions: suggestions.slice(0, 5) // Chỉ giữ tối đa 5 gợi ý tốt nhất
    };
  }

  return result;
}
