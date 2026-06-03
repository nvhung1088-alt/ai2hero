import { ConnectorDefinition } from '../types';

export const pancakePosConnector: ConnectorDefinition = {
  slug: 'pancake-pos',
  name: 'Pancake POS',
  icon: 'Store',
  category: 'pos',
  description: 'Quản lý kho, khách hàng và đơn hàng qua nền tảng Pancake POS (pos.pancake.vn).',
  authType: 'api_key',
  authFields: [
    { name: 'shopId', label: 'Shop ID', type: 'text', required: true, placeholder: 'vd: 987654321' },
    { name: 'apiKey', label: 'API Key (Shop Token)', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'list_orders', name: 'Lấy đơn hàng', description: 'Truy vấn danh sách đơn hàng', inputSchema: [] },
    { slug: 'list_customers', name: 'Lấy khách hàng', description: 'Truy vấn danh sách khách hàng CRM', inputSchema: [] },
    { slug: 'list_products', name: 'Lấy sản phẩm', description: 'Truy vấn danh sách sản phẩm', inputSchema: [] },
    { slug: 'create_order', name: 'Tạo đơn hàng', description: 'Đẩy đơn hàng mới vào Pancake POS', inputSchema: [] },
    { slug: 'probe_sample_data', name: 'Dò cấu trúc dữ liệu', description: 'Dò cấu trúc dữ liệu mẫu của Shop để gợi ý mapping', inputSchema: [] },
  ],
  setupGuide: '<p><b>1.</b> Đăng nhập vào <a href="https://pos.pancake.vn" target="_blank" rel="noreferrer">Pancake POS</a>.</p><p><b>2.</b> Chọn Cửa hàng. Sao chép <b>Shop ID</b> từ URL (ví dụ: <code>shops/987654321</code>).</p><p><b>3.</b> Truy cập <b>Cài đặt &gt; Tích hợp API</b> và tạo một <b>API Key</b> (Shop Token) mới.</p>'
};
