import { ConnectorDefinition } from '../types';

export const browserAiBridgeConnector: ConnectorDefinition = {
  slug: 'browser-ai-bridge',
  name: 'Browser AI Bridge',
  icon: 'Globe',
  category: 'ai',
  description: 'Điều khiển Gemini / ChatGPT / Claude trực tiếp trên trình duyệt cá nhân qua Chrome Extension hoàn toàn miễn phí.',
  aiCapability: ['text', 'image'],
  aiModels: [
    { name: 'gemini', label: 'Gemini (Text)', type: 'text' },
    { name: 'gemini', label: 'Gemini (Vision & Image)', type: 'image' },
    { name: 'chatgpt', label: 'ChatGPT (Text)', type: 'text' },
    { name: 'chatgpt', label: 'ChatGPT (Vision & Image)', type: 'image' },
    { name: 'claude', label: 'Claude (Text)', type: 'text' }
  ],
  
  authType: 'bearer_token',
  authFields: [
    {
      name: 'bridgeToken',
      label: 'Bridge Token (Mã bảo mật Extension)',
      type: 'password',
      required: true,
      secret: true,
      placeholder: 'VD: brg_sec_xxxxxxxxxxxx',
      helpText: 'Nhập mã token bí mật bất kỳ do bạn đặt. Sau đó nhập đúng token này vào Popup của Extension trên Trình duyệt.',
    }
  ],

  actions: [
    {
      slug: 'chat_completion',
      name: 'Chat với AI qua Trình duyệt',
      description: 'Gửi prompt text, ảnh hoặc video sang Gemini/ChatGPT trên web và tự động lấy câu trả lời về.',
      group: 'AI Automation',
      httpMethod: 'POST',
      endpoint: '/bridge',
      status: 'ready',
      outputFields: ['content', 'targetAi', 'jobId'],
      aiInstruction: 'Gửi prompt và đính kèm (ảnh/video) sang AI Web trên trình duyệt qua Extension.',
      
      inputSchema: [
        { name: 'prompt', label: 'Nội dung Prompt', type: 'textarea', required: true, placeholder: 'Nhập yêu cầu cho AI...' },
        { name: 'targetAi', label: 'Nền tảng AI mục tiêu', type: 'select', required: true, options: ['gemini', 'chatgpt', 'claude'], default: 'gemini' },
        { name: 'attachments', label: 'File đính kèm (JSON Base64/URL)', type: 'textarea', required: false, placeholder: '[{"type":"image","base64":"data:image/png;base64,..."}]' },
        { name: 'jobId', label: 'Job ID (Dùng khi Thử lại / Retry)', type: 'text', required: false, placeholder: 'Nhập Job ID cũ nếu có' },
      ],

      testStrategy: 'direct',
    },
    {
      slug: 'vision',
      name: 'Phân tích / Chỉnh sửa ảnh',
      description: 'Gửi prompt và hình ảnh (attachments) sang AI để phân tích, trích xuất dữ liệu, hoặc yêu cầu chỉnh sửa.',
      group: 'AI Vision & Image',
      httpMethod: 'POST',
      endpoint: '/bridge',
      status: 'ready',
      outputFields: ['content', 'targetAi', 'jobId'],
      aiInstruction: 'Gửi ảnh đính kèm và prompt hướng dẫn sang AI (như ChatGPT/Gemini) để nó phân tích hoặc xử lý ảnh.',
      
      inputSchema: [
        { name: 'prompt', label: 'Yêu cầu xử lý ảnh', type: 'textarea', required: true, placeholder: 'Phân tích chi tiết hình ảnh này / Trích xuất văn bản / Chỉnh sửa ảnh theo ý tôi...' },
        { name: 'targetAi', label: 'Nền tảng AI mục tiêu', type: 'select', required: true, options: ['gemini', 'chatgpt', 'claude'], default: 'gemini' },
        { name: 'attachments', label: 'Ảnh đính kèm (JSON Base64/URL)', type: 'textarea', required: true, placeholder: '[{"type":"image","url":"https://.../img.png"}]' },
        { name: 'jobId', label: 'Job ID (Dùng khi Thử lại / Retry)', type: 'text', required: false, placeholder: 'Nhập Job ID cũ nếu có' },
      ],

      testStrategy: 'direct',
    }
  ],

  popular: true,
  setupGuide: `
    <h3>Hướng dẫn kết nối Browser AI Bridge:</h3>
    <ol>
      <li>Đặt một chuỗi <b>Bridge Token</b> bất kỳ ở ô trên (Ví dụ: <code>my_secret_token_123</code>).</li>
      <li>Bấm <b>Lưu & Kết nối</b>.</li>
      <li>Cài đặt <b>Ai2Hero Chrome Extension</b> vào trình duyệt của bạn.</li>
      <li>Mở Extension Popup, nhập Server URL và dán đúng <b>Bridge Token</b> ở bước 1 vào.</li>
      <li>Đảm bảo trình duyệt luôn mở tab <a href="https://gemini.google.com" target="_blank">gemini.google.com</a> hoặc <a href="https://chatgpt.com" target="_blank">chatgpt.com</a>.</li>
    </ol>
  `,
  lifecycle: {
    updatePolicy: 'manual',
  }
};
