import { ConnectorDefinition } from '../types';

export const postizConnector: ConnectorDefinition = {
  slug: 'postiz',
  name: 'Postiz',
  icon: 'CalendarDays',
  category: 'social',
  description: 'Trình lập lịch và tự động hóa xuất bản bài viết lên đa kênh mạng xã hội (X, Facebook, LinkedIn...).',
  setupGuide: `
    <div class="space-y-4">
      <div class="rounded-md bg-blue-500/10 p-4 border border-blue-500/20">
        <h4 class="text-sm font-semibold text-blue-600 mb-2">🔌 Hướng dẫn kết nối Postiz Local</h4>
        <ol class="list-decimal list-inside text-sm text-muted-foreground space-y-2 mt-2">
          <li>Đảm bảo dịch vụ Postiz đang chạy local (cổng Backend mặc định là <code>http://localhost:5000</code>).</li>
          <li>Nhập <b>API URL</b> tương ứng ở ô bên dưới.</li>
          <li>Nhập <b>API Key</b> hoặc Token bảo mật (nếu có cấu hình bảo mật API Token, nếu chạy test local không bắt buộc có thể nhập chuỗi bất kỳ).</li>
        </ol>
      </div>
    </div>
  `,
  authType: 'api_key',
  authFields: [
    {
      name: 'apiUrl',
      label: 'Postiz API URL',
      type: 'text',
      required: true,
      secret: false,
      placeholder: 'vd: http://localhost:5000',
      helpText: 'Đường dẫn API của server Postiz Backend.'
    },
    {
      name: 'apiKey',
      label: 'API Key / Token',
      type: 'password',
      required: false,
      secret: true,
      placeholder: 'Nhập API Key hoặc Token xác thực...',
      helpText: 'Dùng để xác thực API từ AI2Hero tới Postiz.'
    }
  ],
  actions: [
    {
      slug: 'list_accounts',
      name: 'Danh sách kênh liên kết',
      description: 'Lấy toàn bộ tài khoản mạng xã hội (X, LinkedIn, Facebook...) đã kết nối.',
      group: 'Tài khoản & Kênh',
      httpMethod: 'GET',
      endpoint: '/public/v1/integrations',
      status: 'ready',
      inputSchema: [],
      outputFields: ['id', 'name', 'type', 'disabled', 'profile'],
      aiInstruction: 'Bước 1: Gọi Action list_accounts.\nBước 2: Trả về danh sách kênh xã hội cùng trạng thái kết nối.',
      testStrategy: 'direct'
    },
    {
      slug: 'create_post',
      name: 'Đăng bài / Lập lịch',
      description: 'Tạo bài đăng mới và đưa vào hàng đợi lập lịch xuất bản lên mạng xã hội.',
      group: 'Bài viết',
      httpMethod: 'POST',
      endpoint: '/public/v1/posts',
      status: 'ready',
      inputSchema: [
        {
          name: 'content',
          label: 'Nội dung bài viết',
          type: 'textarea',
          required: true,
          placeholder: 'Nhập nội dung bài viết đăng lên mạng xã hội...',
          helpText: 'Hỗ trợ định dạng văn bản cho từng nền tảng.'
        },
        {
          name: 'publishDate',
          label: 'Thời gian xuất bản',
          type: 'text',
          required: true,
          placeholder: 'vd: 2026-07-20T12:00:00.000Z',
          helpText: 'Định dạng ISO 8601 thời gian đăng bài.'
        },
        {
          name: 'integrationId',
          label: 'Integration ID',
          type: 'text',
          required: true,
          placeholder: 'Nhập ID của kênh liên kết...',
          helpText: 'ID của tài khoản mạng xã hội nhận được từ action list_accounts.'
        }
      ],
      outputFields: ['id', 'state', 'publishDate'],
      aiInstruction: 'Bước 1: Gọi Action create_post với content, publishDate, integrationId.\nBước 2: Trả về trạng thái queue và ID bài đăng.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_analytics',
      name: 'Thống kê tương tác',
      description: 'Lấy dữ liệu tương tác (clicks, views, shares...) cho từng kênh mạng xã hội.',
      group: 'Phân tích & Báo cáo',
      httpMethod: 'GET',
      endpoint: '/public/v1/analytics/:integration',
      status: 'ready',
      inputSchema: [
        {
          name: 'integration',
          label: 'Kênh mạng xã hội',
          type: 'text',
          required: true,
          placeholder: 'vd: twitter hoặc linkedin',
          helpText: 'Tên định danh kênh mạng xã hội cần lấy báo cáo.'
        }
      ],
      outputFields: ['views', 'clicks', 'comments', 'shares'],
      aiInstruction: 'Bước 1: Gọi Action get_analytics với tên integration.\nBước 2: Trả về các chỉ số đo lường tương tác.',
      testStrategy: 'direct'
    }
  ],
  popular: true
};
