import { ConnectorDefinition } from '../types';

export const runwayConnector: ConnectorDefinition = {
  slug: 'runway',
  name: 'Runway Gen-3',
  icon: 'Video',
  category: 'ai',
  description: 'Trí tuệ nhân tạo tạo video (Text-to-Video, Image-to-Video) dẫn đầu thị trường.',
  authType: 'api_key',
  authFields: [
    { name: 'apiKey', label: 'RunwayML API Key', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'generate_video', name: 'Tạo Video AI', description: 'Tạo video từ prompt văn bản', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Đăng nhập <a href="https://app.runwayml.com/" target="_blank" rel="noreferrer">RunwayML</a>.</p><p><b>2.</b> Lấy Developer API Key từ phần cài đặt tài khoản (nếu được hỗ trợ/thử nghiệm).</p>'
};
