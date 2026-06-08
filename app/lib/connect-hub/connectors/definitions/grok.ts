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
    {
      slug: 'chat_completion',
      name: 'Chat Completion',
      description: 'Giao tiếp với Grok AI',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'POST',
      endpoint: '/v1/chat/completions',
      status: 'ready',
      outputFields: ['choices[0].message.content'],
      aiInstruction: 'Gọi action chat_completion với model và prompt/messages để nhận phản hồi từ Grok (xAI).',
      testStrategy: 'direct',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI',
          type: 'select',
          required: true,
          options: ['grok-2-latest', 'grok-beta']
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
      name: 'Danh sách model AI',
      description: 'Cập nhật danh sách các mô hình trí tuệ nhân tạo khả dụng trên xAI Grok.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'GET',
      endpoint: '/v1/models',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://console.x.ai/" target="_blank" rel="noreferrer">xAI Console</a>.</p><p><b>2.</b> Tạo tài khoản và vào mục API Keys để tạo mã bảo mật.</p>',
  lifecycle: {
    updatePolicy: 'cron',
    healthCheckEndpoint: 'https://api.x.ai/status',
    documentationUrl: 'https://docs.x.ai/docs'
  }
};
