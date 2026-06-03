import { ConnectorDefinition } from '../types';

export const momoConnector: ConnectorDefinition = {
  slug: 'momo',
  name: 'Ví MoMo',
  icon: 'SmartphoneNfc',
  category: 'payment',
  description: 'Kết nối cổng thanh toán MoMo Business.',
  authType: 'api_key',
  authFields: [
    { name: 'partnerCode', label: 'Partner Code', type: 'text', required: true },
    { name: 'accessKey', label: 'Access Key', type: 'password', required: true, secret: true },
    { name: 'secretKey', label: 'Secret Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'create_payment', name: 'Tạo thanh toán', description: 'Tạo QR MoMo hoặc link thanh toán', inputSchema: [] },
  ],
  popular: true,
};
