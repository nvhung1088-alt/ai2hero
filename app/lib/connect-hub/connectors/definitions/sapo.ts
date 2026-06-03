import { ConnectorDefinition } from '../types';

export const sapoConnector: ConnectorDefinition = {
  slug: 'sapo',
  name: 'Sapo POS',
  icon: 'Store',
  category: 'pos',
  description: 'Kết nối nền tảng quản lý bán hàng đa kênh Sapo. Đồng bộ đơn hàng, kho và khách hàng.',
  authType: 'api_key',
  authFields: [
    { name: 'storeName', label: 'Tên gian hàng (VD: my-shop.mysapo.net)', type: 'text', required: true },
    { name: 'accessToken', label: 'Access Token', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'get_orders', name: 'Lấy đơn hàng', description: 'Đồng bộ đơn hàng từ Sapo', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p>Truy cập Sapo, vào mục <b>Ứng dụng &gt; Quản lý ứng dụng &gt; Ứng dụng riêng</b> để tạo Access Token.</p>'
};
