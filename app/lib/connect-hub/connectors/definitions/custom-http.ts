import { ConnectorDefinition } from '../types';

export const customHttpConnector: ConnectorDefinition = {
  slug: 'custom-http',
  name: 'Custom HTTP API',
  icon: 'Globe',
  category: 'developer',
  description: 'Kết nối và gọi bất kỳ REST API nào bằng cấu hình Header / Token tùy chỉnh.',
  authType: 'custom_http',
  authFields: [
    {
      name: 'baseUrl',
      label: 'Base URL',
      type: 'url',
      required: true,
      placeholder: 'https://api.example.com',
      helpText: 'Đường dẫn gốc của API (không bao gồm path action).'
    },
    {
      name: 'authMethod',
      label: 'Kiểu xác thực',
      type: 'select',
      required: true,
      options: ['none', 'bearer_token', 'api_key_header', 'basic_auth'],
      placeholder: 'Chọn kiểu xác thực'
    },
    {
      name: 'token',
      label: 'Token / API Key',
      type: 'password',
      required: false,
      secret: true,
      placeholder: 'Nhập Token hoặc API Key nếu cần',
      helpText: 'Dùng cho Bearer Token hoặc API Key Header.'
    },
    {
      name: 'headerName',
      label: 'Tên Header API Key',
      type: 'text',
      required: false,
      placeholder: 'vd: X-API-Key',
      helpText: 'Bắt buộc nếu chọn kiểu xác thực api_key_header.'
    },
    {
      name: 'username',
      label: 'Username (Basic Auth)',
      type: 'text',
      required: false,
      placeholder: 'Tên đăng nhập'
    },
    {
      name: 'password',
      label: 'Password (Basic Auth)',
      type: 'password',
      required: false,
      secret: true,
      placeholder: 'Mật khẩu'
    }
  ],
  actions: [
    {
      slug: 'get_request',
      name: 'GET Request',
      description: 'Gửi request GET đến API để lấy dữ liệu.',
      inputSchema: [
        {
          name: 'path',
          label: 'Đường dẫn API (Path)',
          type: 'text',
          required: true,
          placeholder: '/api/v1/users?limit=10',
          helpText: 'Đường dẫn tương đối nối tiếp sau Base URL.'
        }
      ]
    },
    {
      slug: 'post_request',
      name: 'POST Request',
      description: 'Gửi request POST kèm theo body dữ liệu dạng JSON.',
      inputSchema: [
        {
          name: 'path',
          label: 'Đường dẫn API (Path)',
          type: 'text',
          required: true,
          placeholder: '/api/v1/users'
        },
        {
          name: 'body',
          label: 'Dữ liệu gửi lên (JSON)',
          type: 'textarea',
          required: false,
          placeholder: '{\n  "name": "Nguyen Van A",\n  "role": "admin"\n}',
          helpText: 'Định dạng JSON Object hợp lệ.'
        }
      ]
    }
  ],
  popular: true
};
