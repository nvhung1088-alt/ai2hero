import { ConnectorDefinition } from '../types';

export const payosConnector: ConnectorDefinition = {
  slug: 'payos',
  name: 'PayOS',
  icon: 'Wallet',
  category: 'payment',
  description: 'Tạo link thanh toán mã QR tự động xác nhận số dư với PayOS.',
  authType: 'api_key',
  authFields: [
    { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    { name: 'apiKey', label: 'API Key', type: 'password', required: true, secret: true },
    { name: 'checksumKey', label: 'Checksum Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'create_payment_link', name: 'Tạo Link Thanh toán', description: 'Sinh mã QR thanh toán PayOS', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p>Truy cập cổng <a href="https://my.payos.vn" target="_blank">my.payos.vn</a> để lấy Client ID, API Key và Checksum Key của bạn.</p>'
};
