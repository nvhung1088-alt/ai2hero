import { ConnectorDefinition } from '../types';

export const viettelAiConnector: ConnectorDefinition = {
  slug: 'viettel-ai',
  name: 'Viettel AI (TTS)',
  icon: 'Mic',
  category: 'ai',
  description: 'Tích hợp công nghệ Text-to-Speech của Viettel AI (hỗ trợ giọng vùng miền đa dạng).',
  setupGuide: `
    <div class="space-y-2 text-sm text-gray-300">
      <p>Để lấy Token của Viettel AI, làm theo hướng dẫn sau:</p>
      <ol class="list-decimal pl-5 space-y-1">
        <li>Truy cập <a href="https://viettelai.vn" target="_blank" class="text-blue-400 hover:underline">Trang chủ Viettel AI</a> và đăng nhập/đăng ký.</li>
        <li>Chuyển đến mục <strong>Console / Ứng dụng của tôi</strong>.</li>
        <li>Nhấn <strong>Tạo ứng dụng mới</strong> và chọn dịch vụ <strong>Tổng hợp tiếng nói (TTS)</strong>.</li>
        <li>Vào chi tiết ứng dụng vừa tạo, sao chép mã <strong>Access Token</strong> (hoặc API Key) và dán vào đây.</li>
      </ol>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'Viettel AI Token', type: 'password', required: true, secret: true, helpText: 'Đăng nhập <a href="https://viettelai.vn" target="_blank" style="color:blue; text-decoration:underline;">Viettel AI</a>, tạo Ứng dụng để lấy Access Token.' }
  ],
  actions: [
    {
      slug: 'text_to_speech',
      name: 'Text to Speech (Viettel)',
      description: 'Chuyển đổi văn bản thành giọng nói Viettel AI',
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
          options: ['hcm-minhquan', 'hcm-diemmy', 'hn-quangminh', 'hn-quynhanh', 'hue-baoquoc', 'hue-maihuong'],
          helpText: 'Bạn có thể nghe thử <a href="https://viettelai.vn/tts" target="_blank" style="color:blue; text-decoration:underline;">Giọng đọc Viettel tại đây</a>.'
        },
        {
          name: 'speed',
          label: 'Tốc độ đọc (0.5 đến 2.0, mặc định 1.0)',
          type: 'text',
          required: false,
          placeholder: '1.0'
        }
      ]
    }
  ],
  aiCapability: ['tts'],
  aiModels: [
    { name: 'viettel-tts', type: 'tts' }
  ]
};
