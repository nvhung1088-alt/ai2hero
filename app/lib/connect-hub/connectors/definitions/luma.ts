import { ConnectorDefinition } from '../types';

export const lumaConnector: ConnectorDefinition = {
  slug: 'luma',
  name: 'Luma Dream Machine',
  icon: 'Film',
  category: 'ai',
  description: 'Tạo video chất lượng cao từ text và ảnh với mô hình Dream Machine.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'Luma AI API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'generate_video', name: 'Tạo Video AI', description: 'Render video bằng Luma', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://lumalabs.ai/dream-machine" target="_blank" rel="noreferrer">Luma AI</a>.</p><p><b>2.</b> Chuyển sang tài khoản Developer và lấy API Key.</p>'
};
