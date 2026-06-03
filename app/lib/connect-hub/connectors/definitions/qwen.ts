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
    { slug: 'chat_completion', name: 'Chat Completion', description: 'Trò chuyện với Qwen', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noreferrer">DashScope Console</a> của Alibaba Cloud.</p><p><b>2.</b> Tạo một API-KEY để bắt đầu sử dụng.</p>'
};
