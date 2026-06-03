import { ConnectorDefinition } from '../types';

export const zaloConnector: ConnectorDefinition = {
  slug: 'zalo',
  name: 'Zalo ZCA / OA',
  icon: 'MessageSquare',
  category: 'social',
  description: 'Gửi tin nhắn ZNS, quản lý hội thoại Zalo Official Account.',
  authType: 'oauth2',
  authFields: [
    { name: 'appId', label: 'App ID', type: 'text', required: true },
    { name: 'secretKey', label: 'Secret Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'send_zns', name: 'Gửi tin ZNS', description: 'Gửi tin nhắn chăm sóc khách hàng', inputSchema: [] },
  ],
  popular: true,
};
