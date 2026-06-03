import { ConnectorDefinition } from '../types';

export const tiktokConnector: ConnectorDefinition = {
  slug: 'tiktok',
  name: 'TikTok Shop / API',
  icon: 'Video',
  category: 'social',
  description: 'Quản lý đơn hàng TikTok Shop và đăng video tự động.',
  authType: 'api_key',
  authFields: [
    { name: 'appKey', label: 'App Key', type: 'password', required: true, secret: true },
    { name: 'appSecret', label: 'App Secret', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'get_orders', name: 'Lấy đơn hàng', description: 'Lấy danh sách đơn TikTok Shop', inputSchema: [] },
  ],
  popular: true,
};
