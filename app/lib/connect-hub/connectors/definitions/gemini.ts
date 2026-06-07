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
    { 
      slug: 'chat_completion', 
      name: 'Chat Completion', 
      description: 'Tạo văn bản hoặc phân tích đa phương tiện', 
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI (Model)',
          type: 'select',
          required: true,
          options: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.0-pro']
        }
      ] 
    },
    {
      slug: 'list_models',
      name: 'Danh sách model AI',
      description: 'Cập nhật danh sách các mô hình trí tuệ nhân tạo khả dụng trên Google Gemini.',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Mở <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</p><p><b>2.</b> Nhấn <b>Create API Key</b>, chọn Google Cloud Project của bạn và copy key.</p>'
};
