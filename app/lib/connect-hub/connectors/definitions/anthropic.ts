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
      description: 'Trò chuyện và giao việc cho Claude AI', 
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI (Model)',
          type: 'select',
          required: true,
          options: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
        }
      ] 
    },
    {
      slug: 'list_models',
      name: 'Danh sách model AI',
      description: 'Cập nhật danh sách các mô hình trí tuệ nhân tạo khả dụng trên Anthropic.',
      inputSchema: []
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic Console</a>.</p><p><b>2.</b> Nhấn <b>Create Key</b>, đặt tên và sao chép mã khóa bảo mật.</p>'
};
