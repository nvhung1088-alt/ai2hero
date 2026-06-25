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
      description: 'Gửi prompt cho Gemini và nhận phản hồi văn bản.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'POST',
      endpoint: '/v1beta/models/{model}:generateContent',
      status: 'ready',
      outputFields: ['candidates[0].content.parts[0].text'],
      aiInstruction: 'Gọi action chat_completion với model và prompt để nhận câu trả lời từ Google Gemini.',
      testStrategy: 'direct',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI',
          type: 'select',
          required: true,
          options: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest']
        },
        {
          name: 'prompt',
          label: 'Nội dung / Câu hỏi',
          type: 'textarea',
          required: false,
          placeholder: 'Nhập câu hỏi hoặc nội dung cần xử lý...',
          helpText: 'Dùng khi gửi một tin nhắn đơn giản. Để hội thoại phức tạp, dùng trường "messages".'
        },
        {
          name: 'messages',
          label: 'Lịch sử hội thoại (JSON)',
          type: 'textarea',
          required: false,
          placeholder: '[{"role":"user","content":"Xin chào"}]',
          helpText: 'Mảng JSON. Nếu điền, ưu tiên dùng thay cho "prompt".'
        }
      ]
    },
    {
      slug: 'list_models',
      name: 'Danh sách Model',
      description: 'Lấy danh sách các mô hình AI đang khả dụng trên Google Gemini.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'GET',
      endpoint: '/v1beta/models',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Mở <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</p><p><b>2.</b> Nhấn <b>Create API Key</b>, chọn Google Cloud Project của bạn và copy key.</p>',
  aiCapability: ['text', 'code'],
  aiModels: [
    { name: 'gemini-2.5-flash', type: 'text' },
    { name: 'gemini-2.5-pro', type: 'text' },
    { name: 'gemini-2.0-flash', type: 'text' },
    { name: 'gemini-1.5-pro-latest', type: 'text' },
    { name: 'gemini-1.5-flash-latest', type: 'text' }
  ]
};
