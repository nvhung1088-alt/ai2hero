import { ConnectorDefinition } from '../types';

export const zaloZnsConnector: ConnectorDefinition = {
  slug: 'zalo-zns',
  name: 'Zalo ZNS & OA',
  icon: 'MessageCircle', // Lucide icon
  category: 'chat',
  description: 'Gửi tin nhắn chăm sóc khách hàng (ZNS) và tin nhắn Zalo Official Account tự động.',
  authType: 'custom_http',
  authFields: [
    { name: 'app_id', label: 'App ID', type: 'text', required: true, helpText: 'Lấy tại trang quản lý ứng dụng Zalo Developer' },
    { name: 'secret_key', label: 'Secret Key', type: 'password', required: true, secret: true },
    { name: 'oa_id', label: 'Official Account ID', type: 'text', required: true },
    { name: 'access_token', label: 'Access Token', type: 'password', required: true, secret: true, helpText: 'Token Zalo OA hiện tại của bạn.' },
    { name: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, secret: true, helpText: 'Token dùng để tự động gia hạn kết nối.' },
  ],
  status: 'ready',
  badge: { text: 'Local', variant: 'default' },
  actions: [
    { 
      slug: 'send_zns_template', 
      name: 'Gửi ZNS Template', 
      description: 'Gửi tin nhắn ZNS theo template ID đã duyệt', 
      inputSchema: [
        { name: 'phone', label: 'Số điện thoại', type: 'text', required: true, placeholder: '{{payload.phone}}' },
        { name: 'template_id', label: 'Template ID', type: 'text', required: true },
        { name: 'template_data', label: 'Dữ liệu Template (JSON)', type: 'textarea', required: true, placeholder: '{"name": "...", "order_code": "..."}' },
      ]
    },
    { 
      slug: 'send_oa_broadcast', 
      name: 'Gửi tin nhắn OA', 
      description: 'Gửi tin nhắn text cho người dùng Zalo đã quan tâm OA (theo User ID)', 
      inputSchema: [
        { name: 'user_id', label: 'Zalo User ID', type: 'text', required: true },
        { name: 'message', label: 'Nội dung tin nhắn', type: 'textarea', required: true },
      ]
    },
    { 
      slug: 'get_oa_info', 
      name: 'Lấy thông tin OA', 
      description: 'Truy vấn thông tin Zalo OA và số lượng tin nhắn còn lại.', 
      inputSchema: []
    },
  ]
};
