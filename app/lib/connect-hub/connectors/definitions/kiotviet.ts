import { ConnectorDefinition } from '../types';

export const kiotvietConnector: ConnectorDefinition = {
  slug: 'kiotviet',
  name: 'KiotViet',
  icon: 'ShoppingCart',
  category: 'pos',
  description: 'Đồng bộ sản phẩm, tồn kho, đơn hàng, khách hàng từ tài khoản KiotViet Việt Nam.',
  authType: 'client_credentials',
  authFields: [
    {
      name: 'retailer',
      label: 'Tên gian hàng (Retailer)',
      type: 'text',
      required: true,
      placeholder: 'vd: mycosmeticshop',
      helpText: 'Tên viết liền không dấu, là tên miền phụ truy cập KiotViet của bạn.'
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'Nhập Client ID do KiotViet cung cấp'
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      secret: true,
      placeholder: 'Nhập Client Secret'
    }
  ],
  actions: [
    {
      slug: 'list_products',
      name: 'Lấy danh sách sản phẩm',
      description: 'Truy cập và tải danh sách toàn bộ sản phẩm từ KiotViet.',
      inputSchema: []
    },
    {
      slug: 'list_orders',
      name: 'Lấy danh sách đơn hàng',
      description: 'Lấy danh sách các đơn hàng phát sinh trong hệ thống.',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa',
          type: 'text',
          required: false,
          placeholder: '20',
          helpText: 'Mặc định lấy 20 đơn hàng gần nhất.'
        }
      ]
    },
    {
      slug: 'list_customers',
      name: 'Lấy danh sách khách hàng',
      description: 'Đồng bộ dữ liệu khách hàng từ hệ thống bán lẻ.',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Đăng nhập KiotViet, góc trên bên phải chọn <b>Thiết lập &gt; Thiết lập cửa hàng</b>.</p><p><b>2.</b> Chuyển sang thẻ <b>Quản lý API</b>, nhấn <b>Thêm mới</b> để sinh ra <b>Client ID</b> và <b>Client Secret</b>.</p><p><b>3.</b> <b>Tên gian hàng</b> chính là tên trên link web của bạn (ví dụ: <code>my-shop.kiotviet.vn</code> thì Tên gian hàng là <code>my-shop</code>).</p>'
};
