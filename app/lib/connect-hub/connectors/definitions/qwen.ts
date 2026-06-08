import { ConnectorDefinition } from '../types';

export const qwenConnector: ConnectorDefinition = {
  slug: 'qwen',
  name: 'Qwen (Tongyi Qianwen)',
  icon: 'Layers',
  category: 'ai',
  description: 'Mô hình AI đa ngôn ngữ mạnh mẽ của Alibaba Cloud (DashScope).',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'DashScope API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    {
      slug: 'chat_completion',
      name: 'Chat Completion',
      description: 'Trò chuyện với Qwen',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'POST',
      endpoint: '/compatible-mode/v1/chat/completions',
      status: 'ready',
      outputFields: ['choices[0].message.content'],
      aiInstruction: 'Gọi action chat_completion với model và prompt/messages để nhận phản hồi từ Qwen (Alibaba).',
      testStrategy: 'direct',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI',
          type: 'select',
          required: true,
          options: ['qwen-max', 'qwen-plus', 'qwen-turbo']
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
      description: 'Lấy danh sách các mô hình AI đang khả dụng trên DashScope.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'GET',
      endpoint: '/compatible-mode/v1/models',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noreferrer">DashScope Console</a> của Alibaba Cloud.</p><p><b>2.</b> Tạo một API-KEY để bắt đầu sử dụng.</p>'
};
