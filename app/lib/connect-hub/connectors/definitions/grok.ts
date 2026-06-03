import { ConnectorDefinition } from '../types';

export const grokConnector: ConnectorDefinition = {
  slug: 'grok',
  name: 'Grok (xAI)',
  icon: 'Cpu',
  category: 'ai',
  description: 'Mô hình ngôn ngữ lớn đến từ xAI, được huấn luyện với nguồn dữ liệu real-time từ X.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'xAI API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'chat_completion', name: 'Chat Completion', description: 'Giao tiếp với Grok AI', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://console.x.ai/" target="_blank" rel="noreferrer">xAI Console</a>.</p><p><b>2.</b> Tạo tài khoản và vào mục API Keys để tạo mã bảo mật.</p>',
  lifecycle: {
    updatePolicy: 'cron',
    healthCheckEndpoint: 'https://api.x.ai/status',
    documentationUrl: 'https://docs.x.ai/docs'
  }
};
