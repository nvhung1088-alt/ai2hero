import { ConnectorDefinition } from '../types';

export const anthropicConnector: ConnectorDefinition = {
  slug: 'anthropic',
  name: 'Anthropic (Claude)',
  icon: 'Brain',
  category: 'ai',
  description: 'Sử dụng sức mạnh của Claude 3.5 Sonnet, Opus siêu việt với cửa sổ ngữ cảnh lớn.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'Anthropic API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    {
      slug: 'chat_completion',
      name: 'Chat Completion',
      description: 'Gửi prompt cho Claude và nhận phản hồi.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'POST',
      endpoint: '/v1/messages',
      status: 'ready',
      outputFields: ['content[0].text'],
      aiInstruction: 'Gọi action chat_completion với model và prompt để nhận câu trả lời từ Claude.',
      testStrategy: 'direct',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI',
          type: 'select',
          required: true,
          options: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
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
          helpText: 'Mảng JSON. Nếu điền, ưu tiên dùng thay cho "prompt". KHÔNG bao gồm system message ở đây.'
        },
        {
          name: 'system',
          label: 'System Prompt (tuỳ chọn)',
          type: 'textarea',
          required: false,
          placeholder: 'Bạn là trợ lý AI chuyên nghiệp...',
          helpText: 'System prompt được gửi riêng, không lẫn vào mảng messages (đặc điểm của Anthropic API).'
        }
      ]
    },
    {
      slug: 'list_models',
      name: 'Danh sách Model',
      description: 'Lấy danh sách các mô hình Claude đang khả dụng.',
      group: 'Trí Tuệ Nhân Tạo',
      httpMethod: 'GET',
      endpoint: '/v1/models',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic Console</a>.</p><p><b>2.</b> Nhấn <b>Create Key</b>, đặt tên và sao chép mã khóa bảo mật.</p>',
  aiCapability: ['text'],
  aiModels: [
    { name: 'claude-3-5-sonnet-20241022', type: 'text' },
    { name: 'claude-3-opus-20240229', type: 'text' },
    { name: 'claude-3-haiku-20240307', type: 'text' }
  ]
};
