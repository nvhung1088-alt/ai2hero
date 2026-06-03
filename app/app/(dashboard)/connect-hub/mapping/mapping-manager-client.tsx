'use client';

import { useState, useEffect } from 'react';
import { getMappingConfigAction, saveMappingConfigAction } from '@/lib/db/connect-hub-mapping-actions';
import { runActionAction } from '@/lib/db/connect-hub-actions';
import { migrateLegacyConfig, MappingConfigField } from '@/lib/connect-hub/utils/mapper';
import { autoSuggestMapping } from '@/lib/connect-hub/utils/auto-suggest';
import { Loader2, Save, X, Plus, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Clock, Copy, Check, Activity, Sparkles } from 'lucide-react';

interface MappingManagerClientProps {
  connectedApps: { appSlug: string; appName: string; connectionId?: number }[];
  teamId: number;
}

interface ApiCapability {
  slug: string;
  name: string;
  group: string;
  description: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: 'ready' | 'planned';
  inputSchema: {
    key: string;
    type: string;
    required: boolean;
    description: string;
    format?: string;
  }[];
  outputFields: string[];
  aiInstruction: string;
}


const STANDARD_FIELDS_DEF = [
  { group: 'Khách hàng', key: 'customer.id', name: 'Mã khách hàng (ID)', desc: 'Chuỗi. Bắt buộc để định danh.' },
  { group: 'Khách hàng', key: 'customer.name', name: 'Tên khách hàng', desc: 'Chuỗi. Mặc định "Khách lẻ" nếu trống.' },
  { group: 'Khách hàng', key: 'customer.phone', name: 'Số điện thoại', desc: 'Chuỗi.' },
  { group: 'Khách hàng', key: 'customer.address', name: 'Địa chỉ', desc: 'Chuỗi.' },
  { group: 'Khách hàng', key: 'customer.email', name: 'Email', desc: 'Chuỗi.' },
  { group: 'Khách hàng', key: 'customer.createdAt', name: 'Ngày tạo tài khoản', desc: 'Chuỗi ISO. Mặc định là hiện tại.' },
  { group: 'Khách hàng', key: 'customer.group', name: 'Nhóm khách hàng', desc: 'Chuỗi. Nhóm phân loại như khách VIP, khách sỉ, khách lẻ.' },
  { group: 'Khách hàng', key: 'customer.gender', name: 'Giới tính', desc: 'Chuỗi. nam/nữ hoặc male/female.' },
  { group: 'Khách hàng', key: 'customer.birthday', name: 'Ngày sinh', desc: 'Chuỗi YYYY-MM-DD.' },
  { group: 'Khách hàng', key: 'customer.customerId', name: 'Mã phụ khách hàng', desc: 'Chuỗi. Mã định danh bổ sung từ POS.' },
  { group: 'Khách hàng', key: 'customer.notes', name: 'Ghi chú khách hàng', desc: 'Chuỗi. Các lưu ý về sở thích, thói quen của khách.' },
  { group: 'Khách hàng', key: 'customer.points', name: 'Điểm tích lũy', desc: 'Số nguyên. Điểm thưởng của khách hàng.' },
  { group: 'Khách hàng', key: 'customer.level', name: 'Hạng thành viên', desc: 'Chuỗi. Cấp bậc hội viên (Bạc, Vàng, Kim Cương...).' },
  { group: 'Khách hàng', key: 'customer.totalSpend', name: 'Tổng tiền đã mua', desc: 'Số nguyên. Tổng chi tiêu tích lũy của khách.' },

  { group: 'Sản phẩm', key: 'product.id', name: 'Mã hệ thống (ID)', desc: 'Chuỗi. Bắt buộc.' },
  { group: 'Sản phẩm', key: 'product.name', name: 'Tên sản phẩm', desc: 'Chuỗi. Bắt buộc.' },
  { group: 'Sản phẩm', key: 'product.sku', name: 'Mã SKU', desc: 'Chuỗi. Mã vạch, mã kho.' },
  { group: 'Sản phẩm', key: 'product.price', name: 'Giá bán lẻ', desc: 'Số nguyên. Mặc định 0.' },
  { group: 'Sản phẩm', key: 'product.quantity', name: 'Số lượng / Tồn kho', desc: 'Số nguyên. Mặc định 0.' },
  { group: 'Sản phẩm', key: 'product.imageUrl', name: 'Đường dẫn ảnh chính', desc: 'Chuỗi URL.' },
  { group: 'Sản phẩm', key: 'product.barcode', name: 'Mã vạch (Barcode)', desc: 'Chuỗi barcode.' },
  { group: 'Sản phẩm', key: 'product.costPrice', name: 'Giá vốn', desc: 'Số nguyên. Phục vụ tính biên lợi nhuận.' },
  { group: 'Sản phẩm', key: 'product.weight', name: 'Khối lượng (gram)', desc: 'Số nguyên. Phục vụ tính phí vận chuyển.' },
  { group: 'Sản phẩm', key: 'product.category', name: 'Danh mục', desc: 'Chuỗi. Phân loại sản phẩm.' },
  { group: 'Sản phẩm', key: 'product.description', name: 'Mô tả chi tiết', desc: 'Chuỗi HTML hoặc Markdown mô tả sản phẩm.' },
  { group: 'Sản phẩm', key: 'product.shortDescription', name: 'Mô tả ngắn', desc: 'Chuỗi mô tả tóm tắt sản phẩm.' },
  { group: 'Sản phẩm', key: 'product.wholesalePrice', name: 'Giá sỉ / bán buôn', desc: 'Số nguyên. Mặc định 0.' },
  { group: 'Sản phẩm', key: 'product.lastImportedPrice', name: 'Giá nhập gần nhất', desc: 'Số nguyên. Giá nhập kho của lần nhập mới nhất.' },
  { group: 'Sản phẩm', key: 'product.isComposite', name: 'Sản phẩm combo/set', desc: 'Boolean. Xác định là sản phẩm đóng gói từ nhiều thành phần.' },
  { group: 'Sản phẩm', key: 'product.compositeProducts', name: 'Mảng sản phẩm thành phần', desc: 'Mảng (Array). Danh sách ID + số lượng các thành phần cấu thành combo.' },
  { group: 'Sản phẩm', key: 'product.color', name: 'Màu sắc (Color)', desc: 'Chuỗi. Thuộc tính màu sắc của biến thể.' },
  { group: 'Sản phẩm', key: 'product.size', name: 'Kích thước (Size)', desc: 'Chuỗi. Thuộc tính kích thước của biến thể.' },
  { group: 'Sản phẩm', key: 'product.material', name: 'Chất liệu', desc: 'Chuỗi. Thuộc tính chất liệu cấu thành sản phẩm.' },
  { group: 'Sản phẩm', key: 'product.brand', name: 'Thương hiệu / Nhãn hiệu', desc: 'Chuỗi. Hãng sản xuất của sản phẩm.' },
  { group: 'Sản phẩm', key: 'product.unit', name: 'Đơn vị tính', desc: 'Chuỗi. Ví dụ: cái, chiếc, hộp, kg...' },
  { group: 'Sản phẩm', key: 'product.supplier', name: 'Nhà cung cấp', desc: 'Chuỗi. Tên đơn vị phân phối/cung cấp.' },
  { group: 'Sản phẩm', key: 'product.status', name: 'Trạng thái kinh doanh', desc: 'Chuỗi. Trạng thái bán (đang bán, ngừng bán).' },
  { group: 'Sản phẩm', key: 'product.isHidden', name: 'Ẩn sản phẩm', desc: 'Boolean. Trạng thái ẩn/hiện trên trang bán hàng.' },
  { group: 'Sản phẩm', key: 'product.isSellNegative', name: 'Cho phép bán âm kho', desc: 'Boolean. Vẫn cho tạo đơn khi tồn kho bằng 0.' },
  { group: 'Sản phẩm', key: 'product.variationId', name: 'ID phiên bản (Variation)', desc: 'Chuỗi. ID phân biệt các mẫu mã biến thể.' },
  { group: 'Sản phẩm', key: 'product.parentId', name: 'ID sản phẩm gốc', desc: 'Chuỗi. ID sản phẩm cha của biến thể.' },
  { group: 'Sản phẩm', key: 'product.images', name: 'Danh sách ảnh phụ', desc: 'Mảng chuỗi (Array) các URL ảnh liên quan.' },

  { group: 'Đơn hàng', key: 'order.id', name: 'Mã hệ thống (ID)', desc: 'Chuỗi. Khóa chính.' },
  { group: 'Đơn hàng', key: 'order.orderCode', name: 'Mã vận đơn (Hiển thị)', desc: 'Chuỗi mã code.' },
  { group: 'Đơn hàng', key: 'order.customer', name: 'Object Khách hàng', desc: 'Kế thừa logic map Khách hàng ở trên.' },
  { group: 'Đơn hàng', key: 'order.products', name: 'Mảng (Array) Sản phẩm', desc: 'Kế thừa logic map Sản phẩm ở trên.' },
  { group: 'Đơn hàng', key: 'order.totalAmount', name: 'Tổng giá trị', desc: 'Số nguyên. Mặc định 0.' },
  { group: 'Đơn hàng', key: 'order.discount', name: 'Giảm giá', desc: 'Số nguyên. Mặc định 0.' },
  { group: 'Đơn hàng', key: 'order.status', name: 'Trạng thái', desc: 'Chuỗi Enum. pending/completed/cancelled' },
  { group: 'Đơn hàng', key: 'order.createdAt', name: 'Ngày tạo đơn', desc: 'Chuỗi ISO. Mặc định là hiện tại.' },
  { group: 'Đơn hàng', key: 'order.notes', name: 'Ghi chú đơn', desc: 'Chuỗi.' },
  { group: 'Đơn hàng', key: 'order.paymentMethod', name: 'Phương thức thanh toán', desc: 'Chuỗi. Ví dụ: COD, Bank, Cash.' },
  { group: 'Đơn hàng', key: 'order.shippingFee', name: 'Phí vận chuyển thực tế', desc: 'Số nguyên. Phí thực tế thu của khách.' },
  { group: 'Đơn hàng', key: 'order.codAmount', name: 'Số tiền thu hộ (COD)', desc: 'Số nguyên. Số tiền shipper thu hộ.' },
  { group: 'Đơn hàng', key: 'order.partnerFee', name: 'Phí đối tác / sàn', desc: 'Số nguyên. Phí dịch vụ sàn hoặc đối tác.' },
  { group: 'Đơn hàng', key: 'order.tags', name: 'Nhãn đơn (Tags)', desc: 'Mảng chuỗi (Array). Các nhãn phân loại đơn.' },
  { group: 'Đơn hàng', key: 'order.salesChannel', name: 'Kênh bán hàng', desc: 'Chuỗi. Kênh phát sinh đơn hàng (Facebook, Shopee...).' },
  { group: 'Đơn hàng', key: 'order.warehouseId', name: 'Mã kho hàng (ID)', desc: 'Chuỗi. ID kho hàng thực hiện xuất đơn.' },
  { group: 'Đơn hàng', key: 'order.statusName', name: 'Tên trạng thái (Tiếng Việt)', desc: 'Chuỗi. Tên trạng thái đầy đủ (Ví dụ: Chờ xác nhận, Đã hủy...).' },
  { group: 'Đơn hàng', key: 'order.receivedAtShop', name: 'Ngày nhận tại shop', desc: 'Chuỗi ISO. Thời gian đơn được chuyển sang trạng thái đã nhận tại shop.' },
  { group: 'Đơn hàng', key: 'order.creator', name: 'Người tạo đơn', desc: 'Chuỗi. Tên hoặc ID nhân viên lên đơn.' },
  { group: 'Đơn hàng', key: 'order.conversationId', name: 'Mã hội thoại (Chat ID)', desc: 'Chuỗi. Link sang Pancake Chat.' },
  { group: 'Đơn hàng', key: 'order.pageId', name: 'Mã Fanpage (Page ID)', desc: 'Chuỗi. Trang Facebook/Instagram phát sinh đơn.' },
];


const DEFAULT_MAPPINGS: Record<string, Record<string, { selected: string; suggestions: string[] }>> = {
  'pancake-pos': {
    'customer.id': { selected: 'id', suggestions: ['id', 'customer_id'] },
    'customer.name': { selected: 'name', suggestions: ['name', 'customer_name'] },
    'customer.phone': { selected: 'phone', suggestions: ['phone', 'phone_number', 'customer_phone'] },
    'customer.address': { selected: 'address', suggestions: ['address', 'customer_address'] },
    'customer.email': { selected: 'email', suggestions: ['email', 'customer_email'] },
    'customer.createdAt': { selected: 'inserted_at', suggestions: ['createdAt', 'created_at', 'inserted_at'] },
    'customer.group': { selected: 'group', suggestions: ['group', 'customer_group', 'level'] },
    'customer.gender': { selected: 'gender', suggestions: ['gender', 'sex'] },
    'customer.birthday': { selected: 'birthday', suggestions: ['birthday', 'birth_day'] },
    'customer.customerId': { selected: 'display_id', suggestions: ['customer_id', 'display_id', 'code'] },
    'customer.notes': { selected: 'note', suggestions: ['notes', 'note', 'ghi_chu'] },
    'customer.points': { selected: 'points', suggestions: ['points', 'diem', 'diem_tich_luy'] },
    'customer.level': { selected: 'level', suggestions: ['level', 'level_name', 'hang_thanh_vien'] },
    'customer.totalSpend': { selected: 'total_spend', suggestions: ['total_spend', 'total_amount', 'tong_chi_tieu'] },

    'product.id': { selected: 'id', suggestions: ['id', 'product_id'] },
    'product.name': { selected: 'name', suggestions: ['name', 'title'] },
    'product.sku': { selected: 'sku', suggestions: ['sku', 'product_sku'] },
    'product.price': { selected: 'price', suggestions: ['price'] },
    'product.quantity': { selected: 'quantity', suggestions: ['quantity', 'inventory', 'stock'] },
    'product.imageUrl': { selected: 'image_url', suggestions: ['imageUrl', 'image_url', 'image'] },
    'product.barcode': { selected: 'barcode', suggestions: ['barcode', 'bar_code'] },
    'product.costPrice': { selected: 'cost_price', suggestions: ['costPrice', 'cost_price', 'importPrice', 'import_price'] },
    'product.weight': { selected: 'weight', suggestions: ['weight', 'product_weight'] },
    'product.category': { selected: 'category_name', suggestions: ['category', 'category_name', 'product_category'] },
    'product.description': { selected: 'description', suggestions: ['description', 'mo_ta'] },
    'product.shortDescription': { selected: 'short_description', suggestions: ['short_description', 'mo_ta_ngan'] },
    'product.wholesalePrice': { selected: 'wholesale_price', suggestions: ['wholesale_price', 'gia_si'] },
    'product.lastImportedPrice': { selected: 'last_imported_price', suggestions: ['last_imported_price', 'gia_nhap_cuoi'] },
    'product.isComposite': { selected: 'is_composite', suggestions: ['is_composite', 'composite'] },
    'product.compositeProducts': { selected: 'composite_products', suggestions: ['composite_products', 'compositeProducts'] },
    'product.color': { selected: 'color', suggestions: ['color', 'colour', 'mau', 'mau_sac'] },
    'product.size': { selected: 'size', suggestions: ['size', 'kich_thuoc', 'kich_co'] },
    'product.material': { selected: 'material', suggestions: ['material', 'chat_lieu'] },
    'product.brand': { selected: 'brand_name', suggestions: ['brand', 'brand_name', 'thuong_hieu'] },
    'product.unit': { selected: 'unit', suggestions: ['unit', 'don_vi', 'don_vi_tinh'] },
    'product.supplier': { selected: 'supplier', suggestions: ['supplier', 'nha_cung_cap'] },
    'product.status': { selected: 'status', suggestions: ['status', 'trang_thai'] },
    'product.isHidden': { selected: 'is_hidden', suggestions: ['is_hidden', 'hidden'] },
    'product.isSellNegative': { selected: 'is_sell_negative_variation', suggestions: ['is_sell_negative_variation', 'sell_negative'] },
    'product.variationId': { selected: 'id', suggestions: ['id', 'variation_id', 'product_id'] },
    'product.parentId': { selected: 'product_id', suggestions: ['product_id', 'parent_id'] },
    'product.images': { selected: 'images', suggestions: ['images', 'image_list', 'image_urls'] },

    'order.id': { selected: 'id', suggestions: ['id', 'order_id'] },
    'order.orderCode': { selected: 'order_code', suggestions: ['orderCode', 'order_code', 'code', 'order_id', 'id'] },
    'order.status': { selected: 'status', suggestions: ['status'] },
    'order.totalAmount': { selected: 'total_amount', suggestions: ['totalAmount', 'total_amount', 'total', 'price'] },
    'order.discount': { selected: 'discount', suggestions: ['discount'] },
    'order.createdAt': { selected: 'inserted_at', suggestions: ['createdAt', 'created_at', 'inserted_at'] },
    'order.notes': { selected: 'note', suggestions: ['notes', 'note', 'customer_note'] },
    'order.paymentMethod': { selected: 'payment_method', suggestions: ['paymentMethod', 'payment_method', 'payment_type'] },
    'order.shippingFee': { selected: 'shipping_fee', suggestions: ['shippingFee', 'shipping_fee', 'ship_fee'] },
    'order.codAmount': { selected: 'cod_amount', suggestions: ['codAmount', 'cod_amount', 'cod'] },
    'order.partnerFee': { selected: 'partner_fee', suggestions: ['partnerFee', 'partner_fee', 'fee'] },
    'order.tags': { selected: 'tag_names', suggestions: ['tags', 'tag_names', 'labels'] },
    'order.salesChannel': { selected: 'sales_channel', suggestions: ['salesChannel', 'sales_channel', 'channel', 'source'] },
    'order.warehouseId': { selected: 'warehouse_id', suggestions: ['warehouseId', 'warehouse_id', 'warehouse'] },
    'order.statusName': { selected: 'status_name', suggestions: ['status_name', 'statusName'] },
    'order.receivedAtShop': { selected: 'received_at_shop', suggestions: ['received_at_shop', 'received_at'] },
    'order.creator': { selected: 'creator', suggestions: ['creator', 'created_by'] },
    'order.conversationId': { selected: 'conversation_id', suggestions: ['conversation_id', 'chat_id'] },
    'order.pageId': { selected: 'page_id', suggestions: ['page_id', 'fanpage_id'] }
  },
  'kiotviet': {
    'customer.id': { selected: 'id', suggestions: ['id'] },
    'customer.name': { selected: 'name', suggestions: ['name'] },
    'customer.phone': { selected: 'contactNumber', suggestions: ['contactNumber'] },
    'customer.address': { selected: 'address', suggestions: ['address'] },
    'customer.email': { selected: 'email', suggestions: ['email'] },
    'customer.createdAt': { selected: 'createdDate', suggestions: ['createdDate'] },
    'customer.group': { selected: 'groupName', suggestions: ['groupName', 'customerGroupName'] },
    'customer.gender': { selected: 'gender', suggestions: ['gender'] },
    'customer.birthday': { selected: 'birthDate', suggestions: ['birthDate'] },
    'customer.customerId': { selected: 'code', suggestions: ['code'] },
    'customer.notes': { selected: 'comments', suggestions: ['comments', 'description'] },
    'customer.points': { selected: 'points', suggestions: ['points'] },
    'customer.level': { selected: 'level', suggestions: ['level'] },
    'customer.totalSpend': { selected: 'totalSpend', suggestions: ['totalSpend'] },

    'product.id': { selected: 'id', suggestions: ['id'] },
    'product.name': { selected: 'fullName', suggestions: ['fullName', 'name'] },
    'product.sku': { selected: 'code', suggestions: ['code'] },
    'product.price': { selected: 'basePrice', suggestions: ['basePrice'] },
    'product.quantity': { selected: 'onHand', suggestions: ['onHand'] },
    'product.imageUrl': { selected: 'images', suggestions: ['images'] },
    'product.barcode': { selected: 'barcode', suggestions: ['barcode'] },
    'product.costPrice': { selected: 'cost', suggestions: ['cost'] },
    'product.weight': { selected: 'weight', suggestions: ['weight'] },
    'product.category': { selected: 'categoryName', suggestions: ['categoryName'] },
    'product.description': { selected: 'description', suggestions: ['description'] },
    'product.shortDescription': { selected: 'shortDescription', suggestions: ['shortDescription'] },
    'product.wholesalePrice': { selected: 'wholesalePrice', suggestions: ['wholesalePrice'] },
    'product.lastImportedPrice': { selected: 'lastImportedPrice', suggestions: ['lastImportedPrice'] },
    'product.isComposite': { selected: 'isComposite', suggestions: ['isComposite'] },
    'product.compositeProducts': { selected: 'compositeProducts', suggestions: ['compositeProducts'] },
    'product.color': { selected: 'color', suggestions: ['color'] },
    'product.size': { selected: 'size', suggestions: ['size'] },
    'product.material': { selected: 'material', suggestions: ['material'] },
    'product.brand': { selected: 'brand', suggestions: ['brand'] },
    'product.unit': { selected: 'unit', suggestions: ['unit'] },
    'product.supplier': { selected: 'supplier', suggestions: ['supplier'] },
    'product.status': { selected: 'status', suggestions: ['status'] },
    'product.isHidden': { selected: 'isHidden', suggestions: ['isHidden'] },
    'product.isSellNegative': { selected: 'isSellNegative', suggestions: ['isSellNegative'] },
    'product.variationId': { selected: 'id', suggestions: ['id'] },
    'product.parentId': { selected: 'parentId', suggestions: ['parentId'] },
    'product.images': { selected: 'images', suggestions: ['images'] },

    'order.id': { selected: 'id', suggestions: ['id'] },
    'order.orderCode': { selected: 'code', suggestions: ['code'] },
    'order.status': { selected: 'status', suggestions: ['status'] },
    'order.totalAmount': { selected: 'totalPayment', suggestions: ['totalPayment'] },
    'order.discount': { selected: 'discount', suggestions: ['discount'] },
    'order.createdAt': { selected: 'createdDate', suggestions: ['createdDate'] },
    'order.notes': { selected: 'description', suggestions: ['description'] },
    'order.paymentMethod': { selected: 'paymentMethod', suggestions: ['paymentMethod'] },
    'order.shippingFee': { selected: 'shippingFee', suggestions: ['shippingFee'] },
    'order.codAmount': { selected: 'codAmount', suggestions: ['codAmount'] },
    'order.partnerFee': { selected: 'partnerFee', suggestions: ['partnerFee'] },
    'order.tags': { selected: 'tags', suggestions: ['tags'] },
    'order.salesChannel': { selected: 'saleChannelName', suggestions: ['saleChannelName', 'salesChannel'] },
    'order.warehouseId': { selected: 'branchId', suggestions: ['branchId', 'branch_id'] },
    'order.statusName': { selected: 'statusName', suggestions: ['statusName'] },
    'order.receivedAtShop': { selected: 'receivedDate', suggestions: ['receivedDate'] },
    'order.creator': { selected: 'creator', suggestions: ['creator'] },
    'order.conversationId': { selected: 'conversationId', suggestions: ['conversationId'] },
    'order.pageId': { selected: 'pageId', suggestions: ['pageId'] }
  },

  'pancake-chat': {
    'customer.id': { selected: 'id', suggestions: ['id', 'customer_id'] },
    'customer.name': { selected: 'customer_name', suggestions: ['customer_name', 'name', 'full_name'] },
    'customer.phone': { selected: 'customer_phone', suggestions: ['customer_phone', 'phone'] },
    'customer.createdAt': { selected: 'inserted_at', suggestions: ['inserted_at', 'created_at'] },
    'customer.notes': { selected: 'recent_note', suggestions: ['recent_note', 'note', 'ghi_chu'] },
    'order.id': { selected: 'order_id', suggestions: ['order_id', 'latest_order'] },
    'order.conversationId': { selected: 'id', suggestions: ['id', 'conversation_id'] },
    'order.pageId': { selected: 'page_id', suggestions: ['page_id'] },
    'order.creator': { selected: 'assignee_name', suggestions: ['assignee_name', 'staff_name', 'user_id'] },
    'order.tags': { selected: 'tags', suggestions: ['tags', 'labels'] },
    'order.status': { selected: 'status', suggestions: ['status', 'is_done'] },
    'order.notes': { selected: 'last_message', suggestions: ['last_message', 'snippet'] }
  }
};

const PANCAKE_CAPABILITIES: ApiCapability[] = [
  // Cửa hàng
  {
    slug: 'get_shop_info',
    name: 'Lấy thông tin cửa hàng',
    group: 'Cửa hàng',
    description: 'Truy vấn thông tin chi tiết và cấu hình của cửa hàng Pancake POS hiện tại.',
    httpMethod: 'GET',
    endpoint: '/shops',
    status: 'planned',
    inputSchema: [],
    outputFields: ['id', 'name', 'phone', 'address', 'inserted_at'],
    aiInstruction: `Bước 1: Không cần tham số đầu vào.
Bước 2: Gọi Engine Action \`get_shop_info\`.
Bước 3: Trả về thông tin cửa hàng bao gồm ID, Tên cửa hàng, Điện thoại và Địa chỉ cho người dùng.`
  },
  // Đơn hàng
  {
    slug: 'get_orders',
    name: 'Lấy danh sách đơn hàng',
    group: 'Đơn hàng',
    description: 'Lấy danh sách các đơn hàng từ Pancake POS kèm theo phân trang và bộ lọc.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'planned',
    inputSchema: [
      { key: 'page', type: 'number', required: false, description: 'Trang cần lấy (mặc định 1)' },
      { key: 'limit', type: 'number', required: false, description: 'Số đơn mỗi trang (mặc định 50)' },
      { key: 'startDateTime', type: 'number', required: false, description: 'Thời gian bắt đầu (Unix Timestamp giây)' },
      { key: 'endDateTime', type: 'number', required: false, description: 'Thời gian kết thúc (Unix Timestamp giây)' }
    ],
    outputFields: ['data', 'aggs', 'total_pages', 'total_orders'],
    aiInstruction: `Bước 1: Xác định các bộ lọc phân trang \`page\`, \`limit\` hoặc khoảng thời gian từ yêu cầu của người dùng.
Bước 2: Chuyển đổi khoảng thời gian sang Unix timestamp tính bằng giây nếu có lọc ngày.
Bước 3: Gọi Engine Action \`get_orders\` với các tham số tương ứng.
Bước 4: Duyệt qua mảng đơn hàng trả về trong thuộc tính \`data\`, hiển thị mã đơn, khách hàng, tổng tiền và trạng thái đơn hàng.`
  },
  {
    slug: 'get_sales_report',
    name: 'Báo cáo doanh số (Dashboard)',
    group: 'Đơn hàng',
    description: 'Tính toán và xuất báo cáo doanh số chi tiết (Doanh thu, COD, Phí ship, phân bố trạng thái đơn) từ dữ liệu thật.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu (định dạng YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc (định dạng YYYY-MM-DD)' }
    ],
    outputFields: ['totalRevenue', 'cod', 'prepaid', 'shippingFee', 'partnerFee', 'orderStatusBuckets'],
    aiInstruction: `Bước 1: Xác định khoảng thời gian người dùng yêu cầu (hôm nay, hôm qua, tuần này, hoặc khoảng ngày cụ thể).
Bước 2: Chuẩn hóa ngày về định dạng YYYY-MM-DD (múi giờ +07:00).
Bước 3: Gọi Engine Action \`get_sales_report\` với \`startDate\` và \`endDate\` tương ứng.
Bước 4: Nhận kết quả và trích xuất các chỉ số chính: tổng doanh thu (totalRevenue), tiền thu hộ (cod), chuyển khoản trước (prepaid), phí vận chuyển (shippingFee), phí sàn/đối tác (partnerFee) và phân bổ trạng thái đơn hàng (orderStatusBuckets).
Bước 5: Định dạng tiền tệ VNĐ và trình bày báo cáo trực quan dưới dạng bảng hoặc danh sách cho người dùng.`
  },
  {
    slug: 'create_order',
    name: 'Tạo đơn hàng mới',
    group: 'Đơn hàng',
    description: 'Tạo một đơn hàng mới trên hệ thống Pancake POS.',
    httpMethod: 'POST',
    endpoint: '/shops/{shopId}/orders',
    status: 'planned',
    inputSchema: [
      { key: 'customer_name', type: 'string', required: true, description: 'Tên khách hàng' },
      { key: 'customer_phone', type: 'string', required: true, description: 'Số điện thoại nhận hàng' },
      { key: 'customer_address', type: 'string', required: false, description: 'Địa chỉ giao hàng' },
      { key: 'products', type: 'array', required: true, description: 'Danh sách sản phẩm (mỗi SP gồm product_id hoặc product_variant_id, price, quantity)' }
    ],
    outputFields: ['id', 'code', 'total_price', 'inserted_at'],
    aiInstruction: `Bước 1: Thu thập đầy đủ thông tin người mua (tên, điện thoại, địa chỉ) và danh sách sản phẩm cần mua (mã biến thể/sản phẩm, giá bán, số lượng).
Bước 2: Xây dựng payload JSON khớp với cấu trúc API Pancake POS.
Bước 3: Gọi Engine Action \`create_order\` với payload đã dựng.
Bước 4: Kiểm tra trạng thái trả về. Nếu thành công, hiển thị thông báo tạo đơn thành công kèm Mã đơn hàng (code) và tổng tiền.`
  },
  {
    slug: 'update_order',
    name: 'Cập nhật đơn hàng',
    group: 'Đơn hàng',
    description: 'Cập nhật thông tin chi tiết hoặc trạng thái của một đơn hàng đã tồn tại.',
    httpMethod: 'PUT',
    endpoint: '/shops/{shopId}/orders/{orderId}',
    status: 'planned',
    inputSchema: [
      { key: 'orderId', type: 'string', required: true, description: 'Mã đơn hàng cần sửa' },
      { key: 'status', type: 'number', required: false, description: 'Mã trạng thái mới (0-20)' },
      { key: 'note', type: 'string', required: false, description: 'Ghi chú mới' }
    ],
    outputFields: ['id', 'code', 'status', 'updated_at'],
    aiInstruction: `Bước 1: Xác định mã đơn hàng (\`orderId\`) và các thông tin cần thay đổi (như trạng thái mới hoặc ghi chú).
Bước 2: Tra cứu danh sách mã trạng thái số tương ứng của Pancake POS (Ví dụ: 6 là Đã hủy, 1 là Đã xác nhận).
Bước 3: Gọi Engine Action \`update_order\`.
Bước 4: Xác nhận thay đổi thành công và hiển thị trạng thái mới cho người dùng.`
  },
  {
    slug: 'search_orders',
    name: 'Tìm đơn theo SĐT/tên/ghi chú',
    group: 'Đơn hàng',
    description: 'Tìm kiếm nhanh đơn hàng theo số điện thoại, tên khách hàng hoặc nội dung ghi chú.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders?search=',
    status: 'planned',
    inputSchema: [
      { key: 'search', type: 'string', required: true, description: 'Từ khóa tìm kiếm (SĐT, Tên, Mã đơn)' }
    ],
    outputFields: ['data'],
    aiInstruction: `Bước 1: Lấy từ khóa tìm kiếm (chuỗi số điện thoại hoặc tên khách hàng).
Bước 2: Gọi Engine Action \`search_orders\` truyền tham số \`search\`.
Bước 3: Kết xuất danh sách đơn hàng khớp từ khóa, sắp xếp theo thời gian tạo mới nhất.`
  },
  // Kho hàng
  {
    slug: 'get_warehouses',
    name: 'Danh sách kho hàng',
    group: 'Kho hàng',
    description: 'Lấy danh sách các kho hàng đang hoạt động của cửa hàng.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/warehouses',
    status: 'planned',
    inputSchema: [],
    outputFields: ['id', 'name', 'address', 'is_default'],
    aiInstruction: `Bước 1: Không cần tham số đầu vào.
Bước 2: Gọi Engine Action \`get_warehouses\`.
Bước 3: Trả về danh sách kho hàng kèm địa chỉ và đánh dấu kho mặc định.`
  },
  {
    slug: 'create_warehouse',
    name: 'Tạo kho hàng mới',
    group: 'Kho hàng',
    description: 'Khởi tạo một kho hàng mới trên hệ thống.',
    httpMethod: 'POST',
    endpoint: '/shops/{shopId}/warehouses',
    status: 'planned',
    inputSchema: [
      { key: 'name', type: 'string', required: true, description: 'Tên kho hàng' },
      { key: 'address', type: 'string', required: false, description: 'Địa chỉ kho hàng' }
    ],
    outputFields: ['id', 'name', 'address'],
    aiInstruction: `Bước 1: Nhận Tên kho và Địa chỉ từ yêu cầu.
Bước 2: Gọi Engine Action \`create_warehouse\` với tham số \`name\` và \`address\`.
Bước 3: Trả về thông tin kho mới tạo để xác nhận.`
  },
  {
    slug: 'update_warehouse',
    name: 'Cập nhật kho hàng',
    group: 'Kho hàng',
    description: 'Cập nhật thông tin chi tiết của một kho hàng cụ thể.',
    httpMethod: 'PUT',
    endpoint: '/shops/{shopId}/warehouses/{id}',
    status: 'planned',
    inputSchema: [
      { key: 'id', type: 'string', required: true, description: 'ID kho hàng cần cập nhật' },
      { key: 'name', type: 'string', required: false, description: 'Tên kho mới' },
      { key: 'address', type: 'string', required: false, description: 'Địa chỉ kho mới' }
    ],
    outputFields: ['id', 'name', 'address'],
    aiInstruction: `Bước 1: Lấy ID kho và các thông tin cần sửa.
Bước 2: Gọi Engine Action \`update_warehouse\`.
Bước 3: Báo cáo kết quả cập nhật thành công.`
  },
  {
    slug: 'get_inventory_history',
    name: 'Lịch sử xuất nhập kho',
    group: 'Kho hàng',
    description: 'Theo dõi và truy vấn lịch sử biến động số lượng xuất/nhập kho của sản phẩm.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/inventory_histories',
    status: 'planned',
    inputSchema: [
      { key: 'product_id', type: 'string', required: false, description: 'Lọc theo mã sản phẩm' },
      { key: 'page', type: 'number', required: false, description: 'Số trang (mặc định 1)' }
    ],
    outputFields: ['data', 'total_pages'],
    aiInstruction: `Bước 1: Xác định sản phẩm cần truy vết biến động kho (nếu có).
Bước 2: Gọi Engine Action \`get_inventory_history\` kèm \`product_id\`.
Bước 3: Liệt kê các mốc thời gian, loại giao dịch (nhập kho, xuất bán, điều chỉnh) và số lượng thay đổi.`
  },
  // Địa lý
  {
    slug: 'get_provinces',
    name: 'Danh sách tỉnh/thành',
    group: 'Địa lý',
    description: 'Lấy danh sách toàn bộ Tỉnh/Thành phố tại Việt Nam để chuẩn hóa địa chỉ.',
    httpMethod: 'GET',
    endpoint: '/geo/provinces',
    status: 'planned',
    inputSchema: [],
    outputFields: ['id', 'name'],
    aiInstruction: `Bước 1: Gọi Engine Action \`get_provinces\`.
Bước 2: Nhận về danh sách tỉnh/thành phố và lưu trữ hoặc trả lại danh mục cho người dùng lựa chọn.`
  },
  {
    slug: 'get_districts',
    name: 'Danh sách quận/huyện',
    group: 'Địa lý',
    description: 'Lấy danh sách Quận/Huyện dựa trên mã Tỉnh/Thành phố.',
    httpMethod: 'GET',
    endpoint: '/geo/districts',
    status: 'planned',
    inputSchema: [
      { key: 'province_id', type: 'string', required: true, description: 'ID Tỉnh/Thành phố' }
    ],
    outputFields: ['id', 'name', 'province_id'],
    aiInstruction: `Bước 1: Lấy \`province_id\` từ lựa chọn Tỉnh/Thành của người dùng.
Bước 2: Gọi Engine Action \`get_districts\` với \`province_id\` tương ứng.
Bước 3: Hiển thị danh mục Quận/Huyện tương ứng.`
  },
  {
    slug: 'get_communes',
    name: 'Danh sách phường/xã',
    group: 'Địa lý',
    description: 'Lấy danh sách Phường/Xã dựa trên mã Quận/Huyện.',
    httpMethod: 'GET',
    endpoint: '/geo/communes',
    status: 'planned',
    inputSchema: [
      { key: 'district_id', type: 'string', required: true, description: 'ID Quận/Huyện' }
    ],
    outputFields: ['id', 'name', 'district_id'],
    aiInstruction: `Bước 1: Lấy \`district_id\` từ lựa chọn Quận/Huyện của người dùng.
Bước 2: Gọi Engine Action \`get_communes\` với \`district_id\` tương ứng.
Bước 3: Trả về danh sách Phường/Xã cho người dùng hoàn thiện thông tin giao hàng.`
  },

  // ── KẾ TOÁN / THUẾ ─────────────────────────────────────
  {
    slug: 'accounting_revenue_report',
    name: 'Báo cáo doanh thu kế toán',
    group: 'Kế toán / Thuế',
    description: 'Tổng hợp doanh thu theo kỳ kế toán (ngày/tháng/quý/năm): doanh thu thuần, chiết khấu, phí vận chuyển, phí đối tác và lợi nhuận gộp.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu kỳ kế toán (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc kỳ kế toán (YYYY-MM-DD)' },
      { key: 'groupBy', type: 'string', required: false, description: 'Nhóm theo: day | month | quarter | year' }
    ],
    outputFields: ['grossRevenue', 'netRevenue', 'totalDiscount', 'totalShippingFee', 'totalPartnerFee', 'grossProfit', 'orderCount'],
    aiInstruction: `Bước 1: Xác định kỳ kế toán người dùng yêu cầu (tháng, quý, năm tài chính) và quy đổi về startDate/endDate định dạng YYYY-MM-DD, múi giờ +07:00.
Bước 2: Gọi Engine Action \`accounting_revenue_report\` với startDate và endDate. Nếu người dùng muốn phân kỳ (theo tháng, theo quý) truyền thêm tham số groupBy tương ứng.
Bước 3: Từ kết quả đơn hàng, tính toán:
  - Doanh thu gộp (grossRevenue) = Tổng totalAmount của tất cả đơn COMPLETED
  - Chiết khấu (totalDiscount) = Tổng discount
  - Phí vận chuyển (totalShippingFee) = Tổng shippingFee
  - Phí đối tác/sàn (totalPartnerFee) = Tổng partnerFee
  - Doanh thu thuần (netRevenue) = grossRevenue - totalDiscount
  - Số đơn (orderCount) = Đếm số đơn hàng completed
Bước 4: Trình bày bảng kế toán chuẩn với định dạng tiền tệ VNĐ, ghi rõ kỳ báo cáo và ghi chú: đây là doanh thu từ đơn hàng hoàn thành, chưa bao gồm hoàn trả.`
  },
  {
    slug: 'payment_reconciliation',
    name: 'Đối soát thanh toán (COD / Chuyển khoản / Tiền mặt)',
    group: 'Kế toán / Thuế',
    description: 'Phân tách và đối chiếu dòng tiền theo phương thức thanh toán COD, bank transfer, tiền mặt trong một khoảng thời gian.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }
    ],
    outputFields: ['codTotal', 'bankTotal', 'cashTotal', 'otherTotal', 'totalCollected', 'pendingCod'],
    aiInstruction: `Bước 1: Xác định khoảng ngày cần đối soát, quy đổi sang YYYY-MM-DD.
Bước 2: Gọi Engine Action \`payment_reconciliation\` để lấy toàn bộ đơn hàng completed trong kỳ.
Bước 3: Nhóm đơn theo trường paymentMethod:
  - COD: codAmount → cộng dồn → codTotal
  - Chuyển khoản / Bank: bank / transfer → bankTotal
  - Tiền mặt / Cash: cash / tien_mat → cashTotal
  - Khác: otherTotal
Bước 4: Tính tổng tiền đã thực thu (totalCollected) = codTotal + bankTotal + cashTotal + otherTotal.
Bước 5: Tính số tiền COD đang chờ thu (pendingCod) = Tổng codAmount của đơn PENDING.
Bước 6: Xuất bảng đối soát phân theo từng phương thức thanh toán, ghi rõ số đơn và tổng tiền tương ứng.`
  },
  {
    slug: 'vat_invoice_summary',
    name: 'Tổng hợp hóa đơn VAT',
    group: 'Kế toán / Thuế',
    description: 'Thống kê số đơn hàng cần xuất hóa đơn VAT, tính tổng doanh thu chịu thuế và ước tính thuế VAT phải nộp.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'planned',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu kỳ thuế (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc kỳ thuế (YYYY-MM-DD)' },
      { key: 'vatRate', type: 'number', required: false, description: 'Thuế suất VAT áp dụng (mặc định 10%)' }
    ],
    outputFields: ['taxableRevenue', 'vatAmount', 'invoiceCount'],
    aiInstruction: `Bước 1: Xác định kỳ khai thuế (tháng/quý) và thuế suất VAT (mặc định 10% nếu không được cung cấp).
Bước 2: Gọi Engine Action \`vat_invoice_summary\` để lấy danh sách đơn hàng completed trong kỳ.
Bước 3: Lọc các đơn có ghi chú yêu cầu hóa đơn VAT (thường ghi trong notes, hoặc tags chứa 'vat', 'hoa-don').
Bước 4: Tính:
  - Doanh thu chịu thuế (taxableRevenue) = Tổng totalAmount của đơn cần VAT
  - Thuế VAT phát sinh (vatAmount) = taxableRevenue × vatRate / 100
  - Số hóa đơn cần xuất (invoiceCount)
Bước 5: Xuất bảng tổng hợp kèm hướng dẫn kê khai thuế theo mẫu 01/GTGT.`
  },

  // ── BÁO CÁO & PHÂN TÍCH CHIẾN LƯỢC ─────────────────────
  {
    slug: 'top_products_report',
    name: 'Top sản phẩm bán chạy / bán chậm',
    group: 'Báo cáo & Chiến lược',
    description: 'Xếp hạng sản phẩm theo doanh số, số lượng bán, doanh thu trong kỳ. Xác định sản phẩm bán chạy và sản phẩm đang tồn chậm.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' },
      { key: 'topN', type: 'number', required: false, description: 'Số lượng sản phẩm top muốn hiển thị (mặc định 10)' }
    ],
    outputFields: ['topSellingProducts', 'slowMovingProducts', 'productRevenueSummary'],
    aiInstruction: `Bước 1: Xác định khoảng ngày phân tích và số lượng top N (mặc định 10).
Bước 2: Gọi Engine Action \`get_orders\` để lấy toàn bộ đơn hàng COMPLETED trong kỳ (phân trang nếu cần).
Bước 3: Duyệt qua mảng \`products\` (items) trong mỗi đơn hàng, tổng hợp theo product_id:
  - Đếm tổng số lượng bán (totalQuantitySold)
  - Tính tổng doanh thu (totalRevenue = quantity × price)
  - Ghi nhớ tên sản phẩm và SKU
Bước 4: Sắp xếp danh sách theo totalRevenue giảm dần → Top N bán chạy.
Bước 5: Đối chiếu với danh sách sản phẩm hiện có (\`get_products\`) → Sản phẩm có quantity > 0 nhưng không có trong danh sách bán → Hàng tồn chậm.
Bước 6: Xuất 2 bảng: Top bán chạy (kèm doanh thu, số lượng) và Top hàng chậm (kèm tồn kho hiện tại).`
  },
  {
    slug: 'sales_channel_report',
    name: 'Báo cáo theo kênh bán hàng',
    group: 'Báo cáo & Chiến lược',
    description: 'Phân tích hiệu suất từng kênh bán hàng (Facebook, Shopee, TikTok, Website, POS trực tiếp) về doanh thu, số đơn, tỷ lệ hoàn thành.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' }
    ],
    outputFields: ['channelBreakdown', 'bestChannel', 'worstChannel'],
    aiInstruction: `Bước 1: Xác định khoảng ngày phân tích.
Bước 2: Gọi Engine Action \`get_orders\` để lấy toàn bộ đơn hàng trong kỳ (kể cả cancelled để tính tỷ lệ hủy).
Bước 3: Nhóm đơn hàng theo trường \`salesChannel\` (hoặc \`source\`, \`channel\`):
  - Tổng số đơn mỗi kênh
  - Tổng doanh thu mỗi kênh (chỉ tính completed)
  - Số đơn hủy mỗi kênh → tỷ lệ hủy = cancelled / total
  - Giá trị đơn trung bình (AOV) = totalRevenue / completedOrders
Bước 4: Xếp hạng kênh theo doanh thu. Xác định kênh hiệu quả nhất và kênh cần cải thiện.
Bước 5: Xuất báo cáo bảng đa kênh kèm đề xuất phân bổ ngân sách marketing dựa trên hiệu suất.`
  },
  {
    slug: 'customer_cohort_report',
    name: 'Phân tích khách hàng theo nhóm (RFM)',
    group: 'Báo cáo & Chiến lược',
    description: 'Phân tích giá trị khách hàng theo mô hình RFM (Recency, Frequency, Monetary) để xác định khách VIP, khách tiềm năng và khách có nguy cơ rời bỏ.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu phân tích (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc phân tích (YYYY-MM-DD)' }
    ],
    outputFields: ['vipCustomers', 'atRiskCustomers', 'newCustomers', 'rfmSegments'],
    aiInstruction: `Bước 1: Lấy toàn bộ đơn hàng COMPLETED trong kỳ qua Engine Action \`get_orders\` (phân trang đầy đủ).
Bước 2: Nhóm đơn theo customer_phone (hoặc customer_id). Với mỗi khách tính:
  - R (Recency): Số ngày kể từ lần mua cuối cùng đến hôm nay
  - F (Frequency): Tổng số đơn hàng đã mua
  - M (Monetary): Tổng giá trị chi tiêu
Bước 3: Chấm điểm RFM từ 1-5 theo phân vị:
  - R: R thấp hơn (mua gần đây) → điểm cao hơn
  - F: F cao hơn → điểm cao hơn  
  - M: M cao hơn → điểm cao hơn
Bước 4: Phân loại nhóm:
  - Champions (RFM ≥ 4-4-4): Khách VIP mua nhiều, gần đây, chi nhiều
  - At Risk (R ≤ 2, F ≥ 3): Khách cũ không quay lại
  - New Customers (F = 1, R ≥ 4): Khách mới
  - Potential Loyalists (F = 2-3, M ≥ 3): Khách tiềm năng
Bước 5: Xuất danh sách từng nhóm kèm đề xuất hành động marketing phù hợp cho từng phân khúc.`
  },
  {
    slug: 'profit_margin_report',
    name: 'Báo cáo biên lợi nhuận sản phẩm',
    group: 'Báo cáo & Chiến lược',
    description: 'Tính toán biên lợi nhuận gộp từng sản phẩm bằng cách so sánh giá bán thực tế (từ đơn hàng) với giá vốn (costPrice trong catalog sản phẩm).',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders + /shops/{shopId}/products',
    status: 'ready',
    inputSchema: [
      { key: 'startDate', type: 'string', required: true, description: 'Ngày bắt đầu (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: true, description: 'Ngày kết thúc (YYYY-MM-DD)' },
      { key: 'minMargin', type: 'number', required: false, description: 'Lọc sản phẩm có biên lợi nhuận thấp hơn % này' }
    ],
    outputFields: ['productMargins', 'avgMargin', 'lowMarginProducts', 'highMarginProducts'],
    aiInstruction: `Bước 1: Gọi song song Engine Action \`get_orders\` (để lấy giá bán thực tế) và \`get_products\` (để lấy costPrice / giá vốn) trong kỳ phân tích.
Bước 2: Build map product_id → costPrice từ danh sách sản phẩm.
Bước 3: Với mỗi item trong đơn hàng completed:
  - Lấy salePrice = price trong order item
  - Lấy costPrice từ map (nếu có)
  - grossMargin = (salePrice - costPrice) / salePrice × 100
  - Tích lũy theo product_id
Bước 4: Sắp xếp theo grossMargin:
  - High margin (> 40%): Sản phẩm lợi nhuận tốt → ưu tiên bán
  - Low margin (< 15%): Sản phẩm cần xem xét lại giá vốn hoặc giá bán
Bước 5: Xuất bảng biên lợi nhuận từng sản phẩm. Nếu có minMargin → lọc và cảnh báo sản phẩm dưới ngưỡng.`
  },

  // ── MARKETING & BÁN HÀNG ────────────────────────────────
  {
    slug: 'slow_moving_products_promo',
    name: 'Phân tích hàng tồn — Lên kế hoạch xả kho',
    group: 'Marketing & Bán hàng',
    description: 'Xác định hàng tồn kho bán chậm (số ngày chưa có đơn > ngưỡng), tính giá trị vốn bị chôn và đề xuất chiến lược xả kho.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/products + /shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'slowDays', type: 'number', required: false, description: 'Số ngày không có đơn để coi là hàng chậm (mặc định 30)' },
      { key: 'minStock', type: 'number', required: false, description: 'Lọc sản phẩm có tồn kho ≥ con số này (mặc định 5)' }
    ],
    outputFields: ['slowProducts', 'totalStuckValue', 'promotionSuggestions'],
    aiInstruction: `Bước 1: Xác định ngưỡng hàng chậm: slowDays (mặc định 30 ngày), minStock (mặc định 5 đơn vị).
Bước 2: Gọi Engine Action \`get_products\` để lấy toàn bộ sản phẩm đang active, có quantity > minStock.
Bước 3: Gọi Engine Action \`get_orders\` cho 90 ngày gần nhất, build map: product_id → ngày bán gần nhất.
Bước 4: Xác định hàng chậm: Sản phẩm có tồn kho > minStock VÀ (ngày hôm nay - ngày bán gần nhất) > slowDays.
Bước 5: Với mỗi sản phẩm chậm:
  - Tính giá trị vốn bị chôn = quantity × costPrice
  - Tính giá khuyến nghị xả kho = price × 0.7 (70% giá gốc)
  - Gợi ý nhóm khách phù hợp (dựa theo lịch sử mua)
Bước 6: Xuất danh sách hàng chậm kèm:
  - Tổng giá trị vốn bị chôn
  - Đề xuất mức giảm giá
  - Gợi ý nội dung flash sale / combo / bundle để xả kho nhanh.`
  },
  {
    slug: 'marketing_content_generator',
    name: 'Tạo nội dung marketing từ dữ liệu bán hàng',
    group: 'Marketing & Bán hàng',
    description: 'Tự động sinh nội dung bài đăng bán hàng (Facebook, Zalo, TikTok) dựa trên dữ liệu sản phẩm thực tế, giá, tồn kho và lịch sử bán chạy.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/products',
    status: 'ready',
    inputSchema: [
      { key: 'productId', type: 'string', required: false, description: 'ID sản phẩm cụ thể (nếu trống → lấy top bán chạy)' },
      { key: 'contentType', type: 'string', required: false, description: 'Loại nội dung: flash_sale | new_arrival | bestseller | clearance' },
      { key: 'platform', type: 'string', required: false, description: 'Nền tảng đăng: facebook | zalo | tiktok | shopee' }
    ],
    outputFields: ['postContent', 'hashtags', 'callToAction', 'suggestedImage'],
    aiInstruction: `Bước 1: Xác định sản phẩm cần làm content. Nếu không có productId cụ thể → gọi Engine Action \`top_products_report\` cho 30 ngày gần nhất → lấy sản phẩm bán chạy #1.
Bước 2: Gọi Engine Action \`get_products\` để lấy thông tin chi tiết sản phẩm: tên, giá, ảnh, mô tả, tồn kho.
Bước 3: Xác định góc độ nội dung theo contentType:
  - bestseller: Nhấn mạnh số lượng đã bán, xã hội chứng thực
  - flash_sale: Giá ưu đãi có hạn, tạo urgency
  - new_arrival: Sản phẩm mới, điểm khác biệt
  - clearance: Hàng thanh lý, giá tốt dọn kho
Bước 4: Điều chỉnh văn phong theo platform:
  - Facebook: Nhiều emoji, thân thiện, CTA mạnh
  - Zalo: Ngắn gọn, trực tiếp, kèm số điện thoại
  - TikTok: Hook mạnh ở câu đầu, trending keywords
  - Shopee: Keyword SEO, bullet points, kèm voucher
Bước 5: Xuất bài đăng hoàn chỉnh kèm hashtags phù hợp và CTA (inbox, gọi ngay, đặt hàng tại link).`
  },
  {
    slug: 'customer_reorder_campaign',
    name: 'Danh sách khách cần remarketing / nhắc mua lại',
    group: 'Marketing & Bán hàng',
    description: 'Xác định khách hàng đã mua trước đây nhưng lâu không quay lại (win-back), phù hợp để gửi tin nhắn chăm sóc hoặc voucher giảm giá.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders',
    status: 'ready',
    inputSchema: [
      { key: 'daysSinceLastOrder', type: 'number', required: false, description: 'Số ngày kể từ đơn cuối để xác định khách cần remarketing (mặc định 45)' },
      { key: 'minOrderCount', type: 'number', required: false, description: 'Số đơn tối thiểu để coi là khách cũ (mặc định 2)' }
    ],
    outputFields: ['winbackList', 'customerCount', 'suggestedMessage'],
    aiInstruction: `Bước 1: Xác định tham số: daysSinceLastOrder (mặc định 45), minOrderCount (mặc định 2).
Bước 2: Gọi Engine Action \`get_orders\` cho 180 ngày gần nhất, nhóm theo customer_phone.
Bước 3: Lọc khách hàng thỏa mãn:
  - Có ≥ minOrderCount đơn hàng completed
  - Ngày đặt đơn gần nhất ≥ daysSinceLastOrder ngày trước
Bước 4: Sắp xếp danh sách theo tổng giá trị mua (giảm dần) → ưu tiên khách giá trị cao.
Bước 5: Sinh mẫu tin nhắn cá nhân hóa cho từng phân khúc:
  - Khách VIP (M cao): Ưu đãi VIP exclusive, cảm ơn trung thành
  - Khách thường: Voucher giảm giá, sản phẩm mới
Bước 6: Xuất danh sách kèm tên, SĐT, lần mua cuối, tổng chi tiêu và mẫu tin nhắn đề xuất.`
  },

  // ── QUẢN LÝ TỒN KHO & THẤT THOÁT ───────────────────────
  {
    slug: 'inventory_stock_status',
    name: 'Tổng quan tồn kho theo kho/vị trí',
    group: 'Quản lý tồn kho',
    description: 'Xem toàn bộ tồn kho hiện tại theo từng kho hàng, xác định sản phẩm sắp hết hàng và sản phẩm tồn quá nhiều.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/products',
    status: 'planned',
    inputSchema: [
      { key: 'warehouseId', type: 'string', required: false, description: 'Lọc theo ID kho cụ thể (bỏ trống = tất cả kho)' },
      { key: 'lowStockThreshold', type: 'number', required: false, description: 'Ngưỡng tồn kho thấp cần cảnh báo (mặc định 5)' }
    ],
    outputFields: ['stockSummary', 'lowStockAlerts', 'overstockAlerts', 'totalInventoryValue'],
    aiInstruction: `Bước 1: Gọi Engine Action \`get_warehouses\` để lấy danh sách kho. Nếu có warehouseId cụ thể → lọc theo kho đó.
Bước 2: Gọi Engine Action \`get_products\` để lấy danh sách sản phẩm kèm số lượng tồn kho (quantity).
Bước 3: Phân loại sản phẩm:
  - Sắp hết hàng (Low Stock): quantity ≤ lowStockThreshold
  - Tồn quá nhiều (Overstock): quantity > avgSoldPerMonth × 3 (3 tháng tồn)
  - Bình thường: còn lại
Bước 4: Tính tổng giá trị tồn kho (totalInventoryValue) = Σ(quantity × costPrice) theo từng kho.
Bước 5: Xuất bảng tổng quan tồn kho:
  - Cảnh báo đỏ: Sản phẩm sắp hết, cần nhập thêm
  - Cảnh báo vàng: Sản phẩm tồn nhiều, nên đẩy hàng
  - Tổng giá trị vốn đang nằm trong kho.`
  },
  {
    slug: 'inventory_discrepancy_check',
    name: 'Kiểm tra chênh lệch tồn kho (phát hiện thất thoát)',
    group: 'Quản lý tồn kho',
    description: 'Đối chiếu số lượng tồn kho sổ sách với lịch sử xuất nhập kho thực tế để phát hiện chênh lệch, nghi vấn thất thoát hoặc nhập liệu sai.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/inventory_histories',
    status: 'planned',
    inputSchema: [
      { key: 'productId', type: 'string', required: false, description: 'ID sản phẩm cần kiểm tra (bỏ trống = kiểm tra tất cả)' },
      { key: 'startDate', type: 'string', required: false, description: 'Ngày bắt đầu kiểm kê (YYYY-MM-DD)' },
      { key: 'endDate', type: 'string', required: false, description: 'Ngày kết thúc kiểm kê (YYYY-MM-DD)' }
    ],
    outputFields: ['discrepancies', 'totalLossValue', 'suspiciousTransactions'],
    aiInstruction: `Bước 1: Lấy danh sách sản phẩm cần kiểm tra qua Engine Action \`get_products\` (số lượng hiện tại trên sổ sách).
Bước 2: Gọi Engine Action \`get_inventory_history\` cho từng sản phẩm (hoặc tất cả) trong khoảng thời gian.
Bước 3: Tái tạo số lượng tồn kho lý thuyết từ lịch sử:
  - Bắt đầu từ tồn đầu kỳ
  - Cộng mọi lần nhập kho (+)
  - Trừ mọi lần xuất kho theo đơn hàng (-)
  - Trừ điều chỉnh kho hàng (-)
Bước 4: So sánh tồn kho lý thuyết với tồn kho thực tế (sổ sách):
  - Chênh lệch âm (thực tế < lý thuyết): Nghi vấn thất thoát, nhập liệu thiếu
  - Chênh lệch dương (thực tế > lý thuyết): Nhập dư, trả hàng chưa cập nhật
Bước 5: Tính tổng giá trị thất thoát ước tính = Σ(chênh lệch âm × costPrice).
Bước 6: Xuất báo cáo chênh lệch kèm các giao dịch đáng ngờ cần kiểm tra lại.`
  },
  {
    slug: 'reorder_point_alert',
    name: 'Cảnh báo điểm đặt hàng lại (Reorder Point)',
    group: 'Quản lý tồn kho',
    description: 'Tự động tính toán điểm đặt hàng lại tối ưu dựa trên tốc độ bán (velocity) và lead time nhập hàng, cảnh báo sản phẩm cần đặt hàng ngay.',
    httpMethod: 'GET',
    endpoint: '/shops/{shopId}/orders + /shops/{shopId}/products',
    status: 'ready',
    inputSchema: [
      { key: 'leadTimeDays', type: 'number', required: false, description: 'Thời gian nhà cung cấp giao hàng (ngày). Mặc định 7 ngày.' },
      { key: 'safetyStockDays', type: 'number', required: false, description: 'Số ngày dự trữ an toàn. Mặc định 3 ngày.' }
    ],
    outputFields: ['reorderAlerts', 'reorderQuantities', 'estimatedPurchaseValue'],
    aiInstruction: `Bước 1: Xác định leadTimeDays (mặc định 7) và safetyStockDays (mặc định 3).
Bước 2: Gọi Engine Action \`get_orders\` cho 30 ngày gần nhất → Tính velocity (tốc độ bán) cho từng sản phẩm:
  - dailyVelocity = totalQuantitySold / 30
Bước 3: Gọi Engine Action \`get_products\` để lấy tồn kho hiện tại.
Bước 4: Tính Reorder Point cho từng sản phẩm:
  - reorderPoint = (leadTimeDays + safetyStockDays) × dailyVelocity
Bước 5: Cảnh báo sản phẩm có currentStock ≤ reorderPoint:
  - Tính số lượng cần đặt = MAX(30 ngày nhu cầu - currentStock + reorderPoint, 0)
Bước 6: Xuất danh sách cần đặt hàng khẩn cấp kèm:
  - Tên sản phẩm, SKU, tồn hiện tại, điểm đặt hàng, số lượng cần đặt
  - Ước tính giá trị đơn đặt hàng cần chi (estimatedPurchaseValue)`
  }
];


const PANCAKE_CHAT_CAPABILITIES: ApiCapability[] = [
  {
    slug: 'analyze_chat_quality',
    name: 'Phân tích chất lượng & Thái độ',
    group: 'CSKH - Phân Tích',
    description: 'Đọc nội dung chat để đánh giá thái độ nhân viên và tốc độ phản hồi.',
    httpMethod: 'POST',
    endpoint: '/ai/analyze',
    status: 'planned',
    inputSchema: [
      { key: 'conversations', type: 'array', required: true, description: 'Danh sách các hội thoại cần đánh giá' }
    ],
    outputFields: ['staff_score', 'sentiment_score', 'issues_found'],
    aiInstruction: 'Bước 1: Quét nội dung văn bản của từng hội thoại.\nBước 2: Tìm các dấu hiệu thân thiện (vâng, dạ, cảm ơn) hoặc tiêu cực (chửi bới, cáu gắt) từ nhân viên.\nBước 3: Chấm điểm thái độ (1-10) và trả về danh sách các vấn đề.'
  },
  {
    slug: 'analyze_conversion_rate',
    name: 'Phân tích tỷ lệ chốt đơn',
    group: 'Báo cáo & Chiến lược',
    description: 'Tính tỷ lệ chốt đơn dựa trên dữ liệu đính kèm Đơn Hàng trong hội thoại, không cần phụ thuộc tag.',
    httpMethod: 'POST',
    endpoint: '/ai/conversion',
    status: 'planned',
    inputSchema: [
      { key: 'conversations', type: 'array', required: true, description: 'Danh sách các hội thoại thô' }
    ],
    outputFields: ['total_chats', 'total_orders', 'conversion_rate', 'staff_performance'],
    aiInstruction: 'Bước 1: Quét mảng conversations, với mỗi conversation, kiểm tra nếu obj metadata có chứa "has_order" == true hoặc order_id hợp lệ.\nBước 2: Tổng hợp số lượng order / số lượng chat.\nBước 3: Trả về conversion_rate và chi tiết theo nhân viên.'
  },
  {
    slug: 'generate_daily_cs_report',
    name: 'Báo cáo Chiến lược CSKH',
    group: 'Báo cáo & Chiến lược',
    description: 'Tổng hợp nhu cầu khách hàng, xu hướng sản phẩm để xây dựng chiến lược kinh doanh và kịch bản chat tối ưu.',
    httpMethod: 'POST',
    endpoint: '/ai/report',
    status: 'planned',
    inputSchema: [
      { key: 'date', type: 'string', required: true, description: 'Ngày cần báo cáo' },
      { key: 'chat_insights', type: 'array', required: true, description: 'Dữ liệu thô từ các cuộc chat' }
    ],
    outputFields: ['top_products_requested', 'common_complaints', 'strategy_recommendation'],
    aiInstruction: 'Bước 1: Phân loại các nhóm sản phẩm được hỏi nhiều nhất trong ngày.\nBước 2: Liệt kê các phàn nàn chung (giá cao, ship chậm).\nBước 3: Đưa ra đề xuất chiến lược: Nên sale sản phẩm nào, cần tạo sẵn kịch bản (quick reply) cho câu hỏi nào để tăng tỷ lệ chốt.\nBước 4: Trình bày thành Markdown report đẹp mắt.'
  },
  {
    slug: 'get_staff_statistics',
    name: 'Thống kê hiệu suất Nhân viên',
    group: 'Thống kê & Analytics',
    description: 'Thống kê hiệu suất tổng quan của từng nhân viên: số lượng tin nhắn, hội thoại, trả lời mới, thời gian trung bình.',
    httpMethod: 'GET',
    endpoint: '/pages/{pageId}/statistics/staffs',
    status: 'ready',
    inputSchema: [
      { key: 'pageId', type: 'string', required: true, description: 'ID của Page' },
      { key: 'since', type: 'string', required: false, description: 'Ngày bắt đầu (VD: 2023-10-01)' },
      { key: 'until', type: 'string', required: false, description: 'Ngày kết thúc (VD: 2023-10-31)' }
    ],
    outputFields: ['data', 'total_conversations', 'total_messages', 'average_response_time'],
    aiInstruction: 'Bước 1: Gọi Action get_staff_statistics với pageId và các khoảng thời gian.\nBước 2: Quét mảng data (chứa các phần tử như conversations, messages, new_conversations).\nBước 3: Trả về kết quả phân tích sự chênh lệch khối lượng công việc của từng nhân viên.'
  },
  {
    slug: 'get_page_statistics',
    name: 'Thống kê tổng quan Page',
    group: 'Thống kê & Analytics',
    description: 'Thống kê tổng quan hiệu suất của một Page cụ thể trên Pancake Chat.',
    httpMethod: 'GET',
    endpoint: '/pages/{pageId}/statistics',
    status: 'ready',
    inputSchema: [
      { key: 'pageId', type: 'string', required: true, description: 'ID của Page' },
      { key: 'since', type: 'string', required: false, description: 'Ngày bắt đầu (VD: 2023-10-01)' },
      { key: 'until', type: 'string', required: false, description: 'Ngày kết thúc (VD: 2023-10-31)' }
    ],
    outputFields: ['data', 'total_likes', 'total_comments', 'total_messages'],
    aiInstruction: 'Bước 1: Gọi Action get_page_statistics với pageId.\nBước 2: Trích xuất các dữ liệu tăng trưởng của trang từ thuộc tính data.\nBước 3: Lập bảng so sánh (nếu có multiple pages) hoặc phân tích sự tăng trưởng qua thời gian.'
  }
];

export default function MappingManagerClient({ connectedApps, teamId }: MappingManagerClientProps) {
  const [selectedApp, setSelectedApp] = useState<string>(connectedApps[0]?.appSlug || '');
  const [config, setConfig] = useState<Record<string, MappingConfigField>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // New States for API Capabilities
  const [activeTab, setActiveTab] = useState<'mapping' | 'capabilities'>('mapping');
  const [expandedCaps, setExpandedCaps] = useState<Record<string, boolean>>({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (selectedApp) {
      loadConfig(selectedApp);
    }
  }, [selectedApp]);

  const loadConfig = async (appSlug: string) => {
    setIsLoading(true);
    setMessage(null);
    const res = await getMappingConfigAction(appSlug);
    if (res.success && res.data && Object.keys(res.data).length > 0) {
      const migrated = migrateLegacyConfig(res.data);
      setConfig(migrated);
    } else {
      if (DEFAULT_MAPPINGS[appSlug]) {
        const migrated = migrateLegacyConfig(DEFAULT_MAPPINGS[appSlug]);
        setConfig(migrated);
        setMessage({ type: 'success', text: 'Đang tải cấu hình mẫu của hệ thống. Bạn có thể nhấn Lưu để xác nhận.' });
      } else {
        setConfig({});
      }
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedApp) return;
    setIsSaving(true);
    setMessage(null);
    const res = await saveMappingConfigAction(selectedApp, config);
    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'Lưu thành công!' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu.' });
    }
    setIsSaving(false);
  };

  const handleSelectKey = (fieldKey: string, rawKey: string) => {
    setConfig(prev => {
      const current = prev[fieldKey] || { selected: '', suggestions: [] };
      return {
        ...prev,
        [fieldKey]: {
          ...current,
          selected: rawKey
        }
      };
    });
  };

  const handleProbeAndSuggest = async () => {
    const currentApp = connectedApps.find(app => app.appSlug === selectedApp);
    if (!currentApp || !currentApp.connectionId) {
      setMessage({ type: 'error', text: 'Không tìm thấy ID kết nối của cửa hàng để tiến hành phân tích.' });
      return;
    }

    setIsProbing(true);
    setMessage(null);

    try {
      const res = await runActionAction(teamId, {
        connectionId: currentApp.connectionId,
        actionSlug: 'probe_sample_data',
        input: {},
        normalize: false
      });

      if (res.success && res.data) {
        const suggested = autoSuggestMapping(res.data, STANDARD_FIELDS_DEF);
        setConfig(suggested);
        setMessage({
          type: 'success',
          text: 'Đã tự động phân tích dữ liệu mẫu từ cửa hàng thật và cập nhật các trường mapping phù hợp!'
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Dò cấu trúc dữ liệu từ cửa hàng thật thất bại. Vui lòng kiểm tra lại cấu hình kết nối.'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi tiến hành dò cấu trúc dữ liệu mẫu.' });
    } finally {
      setIsProbing(false);
    }
  };

  const handleCopyInstruction = (slug: string, instruction: string) => {
    navigator.clipboard.writeText(instruction);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const toggleExpandCap = (slug: string) => {
    setExpandedCaps(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  if (connectedApps.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-orange-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Chưa có kết nối nào</h3>
        <p className="text-gray-400 mb-6 max-w-md">
          Bạn cần kết nối ít nhất 1 ứng dụng POS (như Pancake, KiotViet) trong kho ứng dụng để có thể cấu hình chuẩn hóa dữ liệu.
        </p>
      </div>
    );
  }

  // Groups for field mapping
  const groups = ['Khách hàng', 'Sản phẩm', 'Đơn hàng'];
  
  const currentCapabilities = selectedApp === 'pancake-pos' ? PANCAKE_CAPABILITIES : selectedApp === 'pancake-chat' ? PANCAKE_CHAT_CAPABILITIES : [];
  const capabilityGroups = Array.from(new Set(currentCapabilities.map((c: any) => c.group)));
  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-900 border border-gray-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-300">Nền tảng POS:</label>
          <select 
            className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
          >
            {connectedApps.map(app => (
              <option key={app.appSlug} value={app.appSlug}>{app.appName}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'mapping' && message && (
            <span className={`text-sm mr-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </span>
          )}
          {activeTab === 'mapping' && (
            <>
              <button
                onClick={handleProbeAndSuggest}
                disabled={isProbing || isLoading || isSaving}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shrink-0"
              >
                {isProbing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-orange-400" />}
                Phân tích dữ liệu mẫu
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isLoading || isProbing}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu thay đổi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'mapping'
              ? 'border-orange-500 text-orange-500 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Trường dữ liệu (Mapping)
        </button>
        <button
          onClick={() => setActiveTab('capabilities')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'capabilities'
              ? 'border-orange-500 text-orange-500 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Năng lực API (AI Capabilities)
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        </div>
      ) : activeTab === 'mapping' ? (
        /* Tab: Mapping Config */
        <div className="space-y-8">
          {groups.map(group => {
            const fieldsInGroup = STANDARD_FIELDS_DEF.filter(f => f.group === group);
            return (
              <div key={group} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">{group}</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {fieldsInGroup.map(field => {
                    const mappingField = config[field.key] || { selected: '', suggestions: [] };
                    const { selected, suggestions } = mappingField;
                    
                    return (
                      <div key={field.key} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 hover:bg-gray-800/20 transition-colors">
                        {/* Standard Field Info */}
                        <div className="lg:col-span-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-200">{field.name}</span>
                          </div>
                          <div className="text-xs font-mono text-orange-400 bg-orange-400/10 inline-block px-2 py-0.5 rounded">
                            {field.key}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">{field.desc}</p>
                        </div>
                        
                        {/* POS Source Fields Mapping */}
                        <div className="lg:col-span-2 space-y-4">
                          <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">
                            Trường dữ liệu từ POS (Chọn 1 từ danh sách gợi ý)
                          </label>
                          
                          {suggestions && suggestions.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {suggestions.map(sug => {
                                const isSelected = selected === sug;
                                return (
                                  <label 
                                    key={sug} 
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-orange-500/10 border-orange-500 text-white font-medium shadow-sm' 
                                        : 'bg-gray-950 border-gray-800 hover:border-gray-700/80 text-gray-300'
                                    }`}
                                  >
                                    <input 
                                      type="radio" 
                                      name={`radio-${field.key}`}
                                      checked={isSelected}
                                      onChange={() => handleSelectKey(field.key, sug)}
                                      className="sr-only" // hidden default radio
                                    />
                                    {/* custom checked dot */}
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-orange-500' : 'border-gray-600'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </div>
                                    <span className="font-mono text-sm break-all">{sug}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic py-2">
                              Chưa có trường thô gợi ý. Hãy bấm "Phân tích dữ liệu mẫu" để tự động tìm kiếm.
                            </div>
                          )}

                          {selected && (
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                              <span>Trường đang chọn: </span>
                              <span className="font-mono text-orange-400 bg-orange-500/5 border border-orange-500/20 px-2.5 py-0.5 rounded-lg">
                                {selected}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tab: API Capabilities */
        <div className="space-y-8">
          {!(selectedApp === 'pancake-pos' || selectedApp === 'pancake-chat') ? (
            /* Empty State for other systems */
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Chưa có năng lực nào được khai báo</h3>
              <p className="text-gray-400 max-w-md text-sm">
                Nền tảng này hiện chưa được khai báo danh sách năng lực AI. Chúng tôi sẽ sớm cập nhật cấu trúc API cho hệ thống trong các phiên bản tiếp theo.
              </p>
            </div>
          ) : (
            /* System Capabilities List */
            <div className="space-y-8">
              <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Hướng dẫn cho AI vận hành
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Các năng lực dưới đây mô tả chính xác tập lệnh API cho hệ thống {selectedApp === 'pancake-chat' ? 'Pancake Chat' : 'Pancake POS'}. Mỗi năng lực chứa một cấu trúc hướng dẫn (<code className="text-xs font-mono bg-gray-950 px-1 py-0.5 rounded text-orange-300">aiInstruction</code>) 
                  bằng ngôn ngữ tự nhiên được tối ưu hóa để AI đọc hiểu và tự động gọi endpoint, truyền đúng tham số, cũng như chuẩn hóa dữ liệu trả về cho người dùng mà không cần lập trình lại.
                </p>
              </div>

              {capabilityGroups.map(group => {
                const capsInGroup = currentCapabilities.filter((c: any) => c.group === group);
                if (capsInGroup.length === 0) return null;

                return (
                  <div key={group} className="space-y-4">
                    <h3 className="text-lg font-medium text-white px-2 border-l-2 border-orange-500">{group}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {capsInGroup.map((cap: any) => {
                        const isExpanded = expandedCaps[cap.slug] || false;
                        const isCopied = copiedSlug === cap.slug;
                        
                        return (
                          <div 
                            key={cap.slug} 
                            className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700/80 transition-all shadow-sm"
                          >
                            {/* Card Header */}
                            <div 
                              onClick={() => toggleExpandCap(cap.slug)}
                              className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-800/10 transition-colors select-none"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                                    cap.httpMethod === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    cap.httpMethod === 'POST' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  }`}>
                                    {cap.httpMethod}
                                  </span>
                                  <h4 className="text-base font-semibold text-gray-200">{cap.name}</h4>
                                  <span className="text-xs font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                                    {cap.endpoint}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400">{cap.description}</p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                                {/* Status Badge */}
                                {cap.status === 'ready' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Sẵn sàng ✅
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                    <Clock className="h-3 w-3" />
                                    Dự kiến 🔜
                                  </span>
                                )}

                                {/* Expand Icon */}
                                <div className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Body */}
                            {isExpanded && (
                              <div className="px-6 pb-6 border-t border-gray-800 bg-gray-950/30 space-y-4 pt-4">
                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500 block mb-1 uppercase font-semibold tracking-wider">Tham số đầu vào (inputSchema):</span>
                                    {cap.inputSchema.length === 0 ? (
                                      <span className="text-gray-400 italic">Không có tham số bắt buộc</span>
                                    ) : (
                                      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2 max-h-[160px] overflow-y-auto">
                                        {cap.inputSchema.map((param: any) => (
                                          <div key={param.key} className="flex flex-col gap-0.5 border-b border-gray-900 pb-1.5 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono text-orange-400 font-medium">
                                                {param.key}
                                                {param.required && <span className="text-red-500 ml-0.5">*</span>}
                                              </span>
                                              <span className="text-gray-500 font-mono scale-90">{param.type}</span>
                                            </div>
                                            <p className="text-gray-400 leading-normal">{param.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block mb-1 uppercase font-semibold tracking-wider">Trường đầu ra chính (outputFields):</span>
                                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto align-content-start">
                                      {cap.outputFields.map((field: any) => (
                                        <span key={field} className="font-mono bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-300">
                                          {field}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* AI Instruction Section */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Cấu trúc thực hiện cho AI (aiInstruction):</span>
                                    <button 
                                      onClick={() => handleCopyInstruction(cap.slug, cap.aiInstruction)}
                                      className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-xs text-gray-300 rounded-lg transition-all"
                                    >
                                      {isCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                                      {isCopied ? 'Đã sao chép' : 'Sao chép HD'}
                                    </button>
                                  </div>

                                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto border-dashed">
                                    {cap.aiInstruction}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

