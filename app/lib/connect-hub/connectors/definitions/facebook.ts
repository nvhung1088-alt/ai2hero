import { ConnectorDefinition } from '../types';

export const facebookConnector: ConnectorDefinition = {
  slug: 'facebook',
  name: 'Facebook Graph API',
  icon: 'Share2',
  category: 'social',
  description: 'Đăng bài, lấy comment và quản lý tương tác trên Facebook Page.',
  authType: 'api_key',
  authFields: [
    { name: 'pageId', label: 'Page ID', type: 'text', required: true },
    { name: 'accessToken', label: 'Page Access Token', type: 'password', required: true, secret: true },
  ],
  actions: [
    { slug: 'post_feed', name: 'Đăng bài', description: 'Đăng bài viết mới lên tường', inputSchema: [] },
  ],
  popular: true,
};
