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
    {
      slug: 'chat_completion',
      name: 'Chat Completion',
      description: 'Trò chuyện với DeepSeek Chat/Coder',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'POST',
      endpoint: '/chat/completions',
      status: 'ready',
      outputFields: ['choices[0].message.content'],
      aiInstruction: 'Gọi action chat_completion với model và prompt/messages để nhận phản hồi từ DeepSeek.',
      testStrategy: 'direct',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI',
          type: 'select',
          required: true,
          options: ['deepseek-chat', 'deepseek-reasoner']
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
      description: 'Lấy danh sách các mô hình AI đang khả dụng trên DeepSeek.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'GET',
      endpoint: '/models',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek Platform</a>.</p><p><b>2.</b> Tạo API Key trong phần cài đặt tài khoản.</p>'
};
