import { ConnectorDefinition } from '../types';

export const googleTtsConnector: ConnectorDefinition = {
  slug: 'google-tts',
  name: 'Google Cloud (TTS)',
  icon: 'Mic',
  category: 'ai',
  description: 'Tích hợp Google Cloud Text-to-Speech với chất lượng giọng nói cao cấp và tự nhiên.',
  setupGuide: `
    <div class="space-y-2 text-sm text-gray-300">
      <p>Để sử dụng Google Cloud TTS, bạn cần bật API và tạo API Key:</p>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Truy cập <a href="https://console.cloud.google.com" target="_blank" class="text-blue-400 hover:underline">Google Cloud Console</a>.</li>
        <li>Tạo một Project mới (hoặc dùng Project có sẵn). Bật thanh toán (Billing) nếu có yêu cầu.</li>
        <li>Vào mục <strong>APIs & Services > Library</strong>, tìm kiếm <strong>Cloud Text-to-Speech API</strong> và nhấn Enable (Bật).</li>
        <li>Vào <strong>APIs & Services > Credentials</strong>, nhấn Create Credentials > <strong>API Key</strong>.</li>
        <li>Sao chép API Key vừa tạo và dán vào ô bên dưới.</li>
      </ol>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'Google Cloud API Key', type: 'password', required: true, secret: true, helpText: 'Lấy tại <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:blue; text-decoration:underline;">Google Cloud Console</a> (Nhớ bật Text-to-Speech API).' }
  ],
  actions: [
    {
      slug: 'text_to_speech',
      name: 'Text to Speech (Google)',
      description: 'Chuyển văn bản thành giọng nói bằng Google Cloud TTS',
      group: 'tts',
      inputSchema: [
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
          options: ['vi-VN-Wavenet-A', 'vi-VN-Wavenet-B', 'vi-VN-Wavenet-C', 'vi-VN-Wavenet-D', 'en-US-Journey-F', 'en-US-Journey-D'],
          helpText: 'Bạn có thể tham khảo <a href="https://cloud.google.com/text-to-speech/docs/voices" target="_blank" style="color:blue; text-decoration:underline;">Mẫu giọng đọc Google tại đây</a>.'
        }
      ]
    }
  ],
  aiCapability: ['tts'],
  aiModels: [
    { name: 'google-wavenet', type: 'tts' }
  ]
};
