import { ConnectorDefinition } from '../types';

export const googleDriveConnector: ConnectorDefinition = {
  slug: 'google-drive',
  name: 'Google Drive',
  icon: 'HardDrive',
  category: 'storage',
  description: 'Quản lý, upload và đồng bộ tài liệu với Google Drive.',
  authType: 'oauth2',
  authFields: [
    { name: 'clientId', label: 'Client ID', type: 'text', required: true, helpText: 'Lấy từ Google Cloud Console' },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true, helpText: 'Lấy từ Google Cloud Console' },
    { name: 'refreshToken', label: 'Refresh Token', type: 'password', required: true, helpText: 'Generate từ Google OAuth Playground (Scope: drive.file)' }
  ],
  actions: [
    { slug: 'upload_file', name: 'Upload File', description: 'Tải file lên Drive', inputSchema: [] },
  ],
  popular: true,
  setupGuide: '<p><b>1.</b> Truy cập <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>, tạo Project và bật <b>Google Drive API</b>.</p><p><b>2.</b> Tạo OAuth 2.0 Client ID (Web Application).</p><p><b>3.</b> Vào <a href="https://developers.google.com/oauthplayground/" target="_blank">OAuth Playground</a>, dùng Client ID/Secret vừa tạo để lấy <b>Refresh Token</b> với scope <code>https://www.googleapis.com/auth/drive.file</code> và điền vào form bên dưới.</p>',
  lifecycle: {
    updatePolicy: 'auto_sync',
    healthCheckEndpoint: 'https://www.google.com/appstatus', // Trạng thái hệ sinh thái Google Workspace
    documentationUrl: 'https://developers.google.com/drive/api/guides/about-sdk'
  }
};
