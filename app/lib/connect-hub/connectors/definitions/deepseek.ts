import { ConnectorDefinition } from '../types';

export const deepseekConnector: ConnectorDefinition = {
  slug: 'deepseek',
  name: 'DeepSeek',
  icon: 'Network',
  category: 'ai',
  description: 'Mô hình AI đến từ Trung Quốc nổi tiếng về hiệu suất lập trình (DeepSeek Coder) và chat.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'DeepSeek API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'chat_completion', name: 'Chat Completion', description: 'Trò chuyện với DeepSeek Chat/Coder', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek Platform</a>.</p><p><b>2.</b> Tạo API Key trong phần cài đặt tài khoản.</p>'
};
