export interface StandardCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
  group?: string;
  gender?: string;
  birthday?: string;
  customerId?: string; // Mã khách hàng phụ từ POS
  notes?: string;      // Ghi chú khách hàng
  points?: number;     // Điểm tích lũy
  level?: string;      // Hạng thành viên (VIP, Gold, v.v.)
  totalSpend?: number; // Tổng chi tiêu tích lũy
}

export interface StandardProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl: string;
  barcode?: string;
  costPrice?: number;
  weight?: number;
  category?: string;
  
  // Các trường mới phục vụ quản lý kho & kinh doanh chi tiết
  description?: string;       // Mô tả chi tiết
  shortDescription?: string;  // Mô tả ngắn gọn
  wholesalePrice?: number;    // Giá bán sỉ/bán buôn
  lastImportedPrice?: number; // Giá nhập kho gần nhất
  isComposite?: boolean;      // Là sản phẩm combo/thành phần
  compositeProducts?: any[];  // Mảng các sản phẩm thành phần
  color?: string;             // Màu sắc thuộc tính
  size?: string;              // Kích thước thuộc tính
  material?: string;          // Chất liệu thuộc tính
  brand?: string;             // Thương hiệu sản phẩm
  unit?: string;              // Đơn vị tính (cái, hộp, chiếc,...)
  supplier?: string;          // Nhà cung cấp
  status?: string;            // Trạng thái kinh doanh (đang bán, ngừng bán...)
  isHidden?: boolean;         // Ẩn/hiển thị trên kênh bán lẻ
  isSellNegative?: boolean;   // Cho phép bán âm kho
  variationId?: string;       // ID phiên bản cụ thể
  parentId?: string;          // ID sản phẩm cha (nếu là biến thể)
  images?: string[];          // Danh sách mảng các ảnh phụ
}

export interface StandardOrder {
  id: string;
  orderCode: string;
  sourceOrderCode?: string;  // Mã đơn gốc từ platform nguồn (dùng cho chống trùng sync)
  sourcePlatform?: string;   // Platform nguồn: 'pancake-pos' | 'kiotviet'
  customer: StandardCustomer;
  products: StandardProduct[];
  totalAmount: number;
  discount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  notes?: string;
  paymentMethod?: string;
  shippingFee?: number;
  codAmount?: number;
  partnerFee?: number;
  tags?: string[];
  salesChannel?: string;
  warehouseId?: string;

  // Các trường mới hỗ trợ phân tích chuyên sâu
  statusName?: string;     // Tên trạng thái đơn hiển thị tiếng Việt
  receivedAtShop?: string; // Thời gian cửa hàng nhận đơn
  creator?: string;        // Người tạo đơn hàng
  conversationId?: string; // ID cuộc hội thoại chat của khách hàng
  pageId?: string;         // ID fanpage facebook nơi khách chốt đơn
}


