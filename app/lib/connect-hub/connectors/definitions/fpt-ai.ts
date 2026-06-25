import { ConnectorDefinition } from '../types';

export const fptAiConnector: ConnectorDefinition = {
  slug: 'fpt-ai',
  name: 'FPT.AI (TTS)',
  icon: 'Mic',
  category: 'ai',
  description: 'Tích hợp công nghệ Text-to-Speech bằng Tiếng Việt của FPT.AI.',
  setupGuide: `
    <div class="space-y-2 text-sm text-gray-300">
      <p>Để lấy API Key của FPT.AI, hãy làm theo các bước sau:</p>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Truy cập <a href="https://console.fpt.ai" target="_blank" class="text-blue-400 hover:underline">Console FPT.AI</a> và đăng nhập.</li>
        <li>Tạo một <strong>Dự án (Project)</strong> mới hoặc chọn dự án hiện có.</li>
        <li>Tìm đến phần <strong>Text to Speech (TTS)</strong> trong menu dịch vụ.</li>
        <li>Nhấn nút <strong>Tạo API Key</strong>, sao chép khóa (Key) đó và dán vào ô bên dưới.</li>
      </ol>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'FPT AI API Key', type: 'password', required: true, secret: true, helpText: 'Đăng nhập vào <a href="https://console.fpt.ai" target="_blank" style="color:blue; text-decoration:underline;">Console FPT.AI</a>, tạo Project và copy API Key.' }
  ],
  actions: [
    {
      slug: 'text_to_speech',
      name: 'Text to Speech (Tiếng Việt)',
      description: 'Chuyển đổi văn bản thành giọng nói FPT AI',
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
          options: ['banmai', 'lannhi', 'leminh', 'myan', 'thuminh', 'giahuy', 'ngoclam', 'haithan'],
          helpText: 'Bạn có thể nghe thử <a href="https://fpt.ai/tts" target="_blank" style="color:blue; text-decoration:underline;">Giọng đọc FPT tại đây</a>.'
        },
        {
          name: 'speed',
          label: 'Tốc độ đọc (Từ -3 đến 3, mặc định 0)',
          type: 'text',
          required: false,
          placeholder: '0'
        }
      ]
    }
  ],
  aiCapability: ['tts'],
  aiModels: [
    { name: 'fpt-tts-v5', type: 'tts' }
  ]
};
