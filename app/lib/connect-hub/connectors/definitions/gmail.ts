import { ConnectorDefinition } from '../types';

export const gmailConnector: ConnectorDefinition = {
  slug: 'gmail',
  name: 'Gmail',
  icon: 'Mail',
  category: 'email',
  description: 'Tự động gửi email thông qua tài khoản Gmail cá nhân hoặc doanh nghiệp.',
  authType: 'bearer_token',
  authFields: [
    {
      name: 'accessToken',
      label: 'Gmail Access Token',
      type: 'password',
      required: true,
      secret: true,
      placeholder: 'Nhập Google OAuth Access Token',
      helpText: 'Token được cấp từ Google OAuth với quyền https://www.googleapis.com/auth/gmail.send'
    }
  ],
  actions: [
    {
      slug: 'send_email',
      name: 'Gửi Email',
      description: 'Soạn và gửi một email mới đến địa chỉ người nhận mong muốn.',
      inputSchema: [
        {
          name: 'to',
          label: 'Người nhận (To)',
          type: 'text',
          required: true,
          placeholder: 'customer@example.com',
          helpText: 'Địa chỉ email của người nhận thư.'
        },
        {
          name: 'subject',
          label: 'Tiêu đề thư (Subject)',
          type: 'text',
          required: true,
          placeholder: 'Thông báo đơn hàng thành công'
        },
        {
          name: 'body',
          label: 'Nội dung thư',
          type: 'textarea',
          required: true,
          placeholder: 'Chào bạn, chúng tôi đã nhận được đơn hàng...'
        }
      ]
    }
  ],
  popular: true
};
