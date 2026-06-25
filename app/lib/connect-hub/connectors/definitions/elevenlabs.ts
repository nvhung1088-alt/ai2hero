import { ConnectorDefinition } from '../types';

export const elevenlabsConnector: ConnectorDefinition = {
  slug: 'elevenlabs',
  name: 'ElevenLabs (TTS)',
  icon: 'Mic',
  category: 'ai',
  description: 'Tích hợp công nghệ Text-to-Speech tự nhiên nhất thế giới và khả năng Voice Clone từ ElevenLabs.',
  setupGuide: `
    <div class="space-y-2 text-sm text-gray-300">
      <p>Để lấy API Key của ElevenLabs:</p>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Đăng nhập vào tài khoản trên <a href="https://elevenlabs.io" target="_blank" class="text-blue-400 hover:underline">ElevenLabs</a>.</li>
        <li>Nhấn vào biểu tượng <strong>Profile (Hồ sơ)</strong> của bạn ở góc dưới cùng bên trái màn hình.</li>
        <li>Chọn <strong>Profile + API key</strong>.</li>
        <li>Nhấn vào biểu tượng con mắt để xem API Key, sao chép nó và dán vào ô bên dưới.</li>
      </ol>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'ElevenLabs API Key (xi-api-key)', type: 'password', required: true, secret: true, helpText: 'Lấy API Key tại mục Profile > Settings trên <a href="https://elevenlabs.io" target="_blank" style="color:blue; text-decoration:underline;">ElevenLabs</a>.' }
  ],
  actions: [
    {
      slug: 'text_to_speech',
      name: 'Text to Speech (ElevenLabs)',
      description: 'Chuyển văn bản thành giọng nói bằng ElevenLabs',
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
          label: 'Giọng đọc (Tên hoặc Voice ID)',
          type: 'select',
          required: true,
          options: ['Rachel', 'Clyde', 'Domi', 'Bella', 'Antoni', 'Elli', 'Josh', 'Arnold'],
          helpText: 'Bạn có thể nghe <a href="https://elevenlabs.io/voice-library" target="_blank" style="color:blue; text-decoration:underline;">Mẫu giọng đọc ElevenLabs tại đây</a>.'
        }
      ]
    }
  ],
  aiCapability: ['tts'],
  aiModels: [
    { name: 'eleven_multilingual_v2', type: 'tts' }
  ]
};
