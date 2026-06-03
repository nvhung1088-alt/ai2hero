import { ConnectorDefinition } from '../types';

export const geminiConnector: ConnectorDefinition = {
  slug: 'gemini',
  name: 'Google Gemini',
  icon: 'Sparkles',
  category: 'ai',
  description: 'Tích hợp Gemini 1.5 Pro và Flash từ Google Cloud AI Studio.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'Gemini API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'generate_content', name: 'Generate Content', description: 'Tạo văn bản hoặc phân tích đa phương tiện', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Mở <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</p><p><b>2.</b> Nhấn <b>Create API Key</b>, chọn Google Cloud Project của bạn và copy key.</p>'
};
