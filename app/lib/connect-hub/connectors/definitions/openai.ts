import { ConnectorDefinition } from '../types';

export const openaiConnector: ConnectorDefinition = {
  slug: 'openai',
  name: 'OpenAI (ChatGPT)',
  icon: 'Bot',
  category: 'ai',
  description: 'Tích hợp mô hình GPT-4o, GPT-3.5 và DALL-E của OpenAI vào ứng dụng của bạn.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'OpenAI API Key', type: 'password', required: true, secret: true },
    { name: 'organizationId', label: 'Organization ID (Tùy chọn)', type: 'text', required: false },
  ],
  actions: [
    { 
      slug: 'chat_completion', 
      name: 'Chat Completion', 
      description: 'Gửi hội thoại và nhận câu trả lời từ GPT', 
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình AI (Model)',
          type: 'select',
          required: true,
          options: ['gpt-5.5', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
        }
      ] 
    },
    { 
      slug: 'generate_image', 
      name: 'Tạo ảnh (DALL-E)', 
      description: 'Tạo ảnh AI từ văn bản mô tả', 
      inputSchema: [] 
    },
    {
      slug: 'list_models',
      name: 'Danh sách model AI',
      description: 'Cập nhật danh sách các mô hình trí tuệ nhân tạo khả dụng trên OpenAI.',
      inputSchema: []
    },
    {
      slug: 'text_to_speech',
      name: 'Text to Speech (TTS)',
      description: 'Chuyển văn bản thành giọng nói AI',
      group: 'tts',
      inputSchema: [
        {
          name: 'model',
          label: 'Mô hình TTS',
          type: 'select',
          required: true,
          options: ['tts-1', 'tts-1-hd']
        },
        {
          name: 'text',
          label: 'Văn bản cần đọc',
          type: 'textarea',
          required: true
        },
        {
          name: 'voice',
          label: 'Giọng đọc',
          type: 'select',
          required: true,
          options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
          helpText: 'Bạn có thể nghe <a href="https://platform.openai.com/docs/guides/text-to-speech/voice-options" target="_blank" style="color:blue; text-decoration:underline;">Mẫu giọng đọc tại đây</a>.'
        }
      ]
    }
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Đăng nhập vào <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI Developer Platform</a>.</p><p><b>2.</b> Chọn <b>Create new secret key</b>, sao chép API Key và dán vào ô bên dưới.</p><p><b>3.</b> Lấy Organization ID tại mục <b>Settings &gt; Organization</b> (Không bắt buộc).</p>',
  lifecycle: {
    updatePolicy: 'cron',
    healthCheckEndpoint: 'https://status.openai.com/api/v2/status.json',
    documentationUrl: 'https://platform.openai.com/docs/models'
  },
  aiCapability: ['text', 'image', 'tts', 'code'],
  aiModels: [
    { name: 'gpt-4o', type: 'text' },
    { name: 'gpt-4o-mini', type: 'text' },
    { name: 'gpt-4-turbo', type: 'text' },
    { name: 'gpt-3.5-turbo', type: 'text' },
    { name: 'dall-e-3', type: 'image' },
    { name: 'dall-e-2', type: 'image' },
    { name: 'tts-1', type: 'tts' },
    { name: 'tts-1-hd', type: 'tts' }
  ]
};
