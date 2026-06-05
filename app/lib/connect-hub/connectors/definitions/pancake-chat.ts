import { ConnectorDefinition } from '../types';

export const pancakeChatConnector: ConnectorDefinition = {
  slug: 'pancake-chat',
  name: 'Pancake Chat',
  icon: 'MessageCircle',
  category: 'chat',
  description: 'Quản lý hội thoại và tin nhắn khách hàng đa kênh qua Pancake (pages.fm). Hỗ trợ lấy dữ liệu đồng thời từ tất cả các Fanpage mà bạn sở hữu.',
  authType: 'api_key',
  authFields: [
    { name: 'userAccessToken', label: 'User Access Token (JWT)', type: 'password', required: true, secret: true, placeholder: 'eyJhbGciOiJI...' },
    { name: 'selectedPageIds', label: 'Danh sách ID Fanpage (phân tách bằng dấu phẩy)', type: 'text', required: false, placeholder: 'pzl_550583877530437024, page_id_2...' }
  ],
  actions: [
    { 
      slug: 'list_pages', 
      name: 'Lấy danh sách Pages', 
      group: 'Quản lý Trang',
      description: 'Truy xuất toàn bộ các Fanpage mà tài khoản này có quyền quản lý.', 
      httpMethod: 'GET',
      endpoint: '/api/v1/pages',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: [] 
    },
    { 
      slug: 'list_conversations', 
      name: 'Lấy hội thoại', 
      group: 'Hội thoại',
      description: 'Truy vấn danh sách hội thoại mới nhất từ một hoặc tất cả các Page.', 
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/conversations',
      status: 'ready',
      testStrategy: 'direct',
      inputSchema: [
        { name: 'pageId', type: 'text', required: false, label: 'ID Fanpage (để trống nếu muốn quét tất cả)', placeholder: 'ID Fanpage' }
      ]
    },
    { 
      slug: 'send_message', 
      name: 'Gửi tin nhắn', 
      group: 'Hội thoại',
      description: 'Gửi tin nhắn phản hồi tới khách hàng trên một Page cụ thể', 
      httpMethod: 'POST',
      endpoint: '/api/public_api/v1/pages/{pageId}/conversations/{convId}/messages',
      status: 'ready',
      inputSchema: [
        { name: 'page_id', type: 'text', required: true, label: 'ID của Fanpage (lấy từ list_pages)' },
        { name: 'conversation_id', type: 'text', required: true, label: 'ID của cuộc hội thoại' },
        { name: 'message', type: 'text', required: true, label: 'Nội dung tin nhắn cần gửi' }
      ] 
    },
    {
      slug: 'generate_page_token',
      name: 'Tạo Page Access Token',
      group: 'Quản lý Trang',
      description: 'Tạo Page Access Token cho một fanpage cụ thể từ User Access Token.',
      httpMethod: 'POST',
      endpoint: '/api/v1/pages/{pageId}/generate_page_access_token',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: true, label: 'ID của Fanpage', placeholder: 'ID Fanpage' }
      ]
    },
    {
      slug: 'list_messages',
      name: 'Lấy tin nhắn hội thoại',
      group: 'Hội thoại',
      description: 'Lấy danh sách tin nhắn chi tiết trong một cuộc hội thoại cụ thể.',
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/conversations/{conversationId}/messages',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: true, label: 'ID của Fanpage', placeholder: 'ID Fanpage' },
        { name: 'conversationId', type: 'text', required: true, label: 'ID của cuộc hội thoại', placeholder: 'ID cuộc hội thoại' }
      ]
    },
    {
      slug: 'list_customers',
      name: 'Lấy danh sách Khách hàng',
      group: 'CRM & Khách hàng',
      description: 'Lấy danh sách thông tin khách hàng tương tác qua chat của fanpage.',
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/customers',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: true, label: 'ID của Fanpage', placeholder: 'ID Fanpage' }
      ]
    },
    {
      slug: 'list_tags',
      name: 'Lấy danh sách Tags',
      group: 'Cấu hình & Tags',
      description: 'Lấy danh sách các nhãn phân loại hội thoại trên fanpage.',
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/tags',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: true, label: 'ID của Fanpage', placeholder: 'ID Fanpage' }
      ]
    },
    { 
      slug: 'get_staff_statistics', 
      name: 'Thống kê Nhân viên (Users)', 
      group: 'Báo cáo & Thống kê',
      description: 'Lấy báo cáo hiệu suất làm việc của nhân sự trực Chat.', 
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/statistics/users',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: false, label: 'ID của Page (để trống nếu muốn quét tất cả)', placeholder: 'ID của Page' },
        { name: 'since', type: 'text', required: true, label: 'Từ thời gian (Unix Timestamp)', placeholder: 'Từ thời gian (Unix Timestamp)' },
        { name: 'until', type: 'text', required: true, label: 'Đến thời gian (Unix Timestamp)', placeholder: 'Đến thời gian (Unix Timestamp)' }
      ],
      outputFields: ['data', 'total_conversations', 'total_messages', 'average_response_time'],
      aiInstruction: 'Bước 1: Gọi Action get_staff_statistics với pageId và các khoảng thời gian.\nBước 2: Quét mảng data (chứa các phần tử như conversations, messages, new_conversations).\nBước 3: Trả về kết quả phân tích sự chênh lệch khối lượng công việc của từng nhân viên.',
      testStrategy: 'direct'
    },
    { 
      slug: 'get_page_statistics', 
      name: 'Thống kê Tổng quan (Pages)', 
      group: 'Báo cáo & Thống kê',
      description: 'Lấy báo cáo số lượng tin nhắn, bình luận của Fanpage.', 
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/statistics/pages',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: false, label: 'ID của Page (để trống nếu muốn quét tất cả)', placeholder: 'ID của Page' },
        { name: 'since', type: 'text', required: true, label: 'Từ thời gian (Unix Timestamp)', placeholder: 'Từ thời gian (Unix Timestamp)' },
        { name: 'until', type: 'text', required: true, label: 'Đến thời gian (Unix Timestamp)', placeholder: 'Đến thời gian (Unix Timestamp)' }
      ],
      outputFields: ['data', 'total_likes', 'total_comments', 'total_messages'],
      aiInstruction: 'Bước 1: Gọi Action get_page_statistics với pageId.\nBước 2: Trích xuất các dữ liệu tăng trưởng của trang từ thuộc tính data.\nBước 3: Lập bảng so sánh (nếu có multiple pages) hoặc phân tích sự tăng trưởng qua thời gian.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_tag_statistics',
      name: 'Thống kê theo Tag',
      group: 'Báo cáo & Thống kê',
      description: 'Đo lường tỷ lệ hội thoại theo nhãn phân loại (VIP, Khiếu nại...).',
      httpMethod: 'GET',
      endpoint: '/api/public_api/v1/pages/{pageId}/tags/statistics',
      status: 'ready',
      inputSchema: [
        { name: 'pageId', type: 'text', required: false, label: 'ID của Page (để trống nếu muốn quét tất cả)', placeholder: 'ID của Page' },
        { name: 'since', type: 'text', required: true, label: 'Từ thời gian (Unix Timestamp)', placeholder: 'Từ thời gian (Unix Timestamp)' },
        { name: 'until', type: 'text', required: true, label: 'Đến thời gian (Unix Timestamp)', placeholder: 'Đến thời gian (Unix Timestamp)' }
      ]
    },
    {
      slug: 'analyze_chat_quality',
      name: 'Phân tích chất lượng & Thái độ',
      group: 'CSKH - Phân Tích',
      description: 'Đọc nội dung chat để đánh giá thái độ nhân viên và tốc độ phản hồi bằng AI.',
      status: 'ready',
      inputSchema: [
        { name: 'conversations', type: 'textarea', required: true, label: 'Danh sách các hội thoại cần đánh giá', placeholder: 'Danh sách các hội thoại cần đánh giá' }
      ],
      outputFields: ['staff_score', 'sentiment_score', 'issues_found'],
      aiInstruction: 'Bước 1: Quét nội dung văn bản của từng hội thoại.\nBước 2: Tìm các dấu hiệu thân thiện (vâng, dạ, cảm ơn) hoặc tiêu cực (chửi bới, cáu gắt) từ nhân viên.\nBước 3: Chấm điểm thái độ (1-10) và trả về danh sách các vấn đề.'
    },
    {
      slug: 'analyze_conversion_rate',
      name: 'Phân tích tỷ lệ chốt đơn',
      group: 'CSKH - Phân Tích',
      description: 'Tính tỷ lệ chốt đơn bằng AI dựa trên dữ liệu đính kèm Đơn Hàng trong hội thoại.',
      status: 'ready',
      inputSchema: [
        { name: 'conversations', type: 'textarea', required: true, label: 'Danh sách các hội thoại thô', placeholder: 'Danh sách các hội thoại thô' }
      ],
      outputFields: ['total_chats', 'total_orders', 'conversion_rate', 'staff_performance'],
      aiInstruction: 'Bước 1: Quét mảng conversations, với mỗi conversation, kiểm tra nếu obj metadata có chứa "has_order" == true hoặc order_id hợp lệ.\nBước 2: Tổng hợp số lượng order / số lượng chat.\nBước 3: Trả về conversion_rate và chi tiết theo nhân viên.'
    },
    {
      slug: 'generate_daily_cs_report',
      name: 'Báo cáo Chiến lược CSKH',
      group: 'CSKH - Phân Tích',
      description: 'Tổng hợp nhu cầu khách hàng, xu hướng sản phẩm bằng AI để xây dựng chiến lược kinh doanh.',
      status: 'ready',
      inputSchema: [
        { name: 'date', type: 'text', required: true, label: 'Ngày cần báo cáo', placeholder: 'Ngày cần báo cáo' },
        { name: 'chat_insights', type: 'textarea', required: true, label: 'Dữ liệu thô từ các cuộc chat', placeholder: 'Dữ liệu thô từ các cuộc chat' }
      ],
      outputFields: ['top_products_requested', 'common_complaints', 'strategy_recommendation'],
      aiInstruction: 'Bước 1: Phân loại các nhóm sản phẩm được hỏi nhiều nhất trong ngày.\nBước 2: Liệt kê các phàn nàn chung (giá cao, ship chậm).\nBước 3: Đưa ra đề xuất chiến lược: Nên sale sản phẩm nào, cần tạo sẵn kịch bản (quick reply) cho câu hỏi nào để tăng tỷ lệ chốt.\nBước 4: Trình bày thành Markdown report đẹp mắt.'
    }
  ],
  setupGuide: '<p><b>1.</b> Đăng nhập vào <a href="https://pages.fm" target="_blank" rel="noreferrer">Pancake Chat (pages.fm)</a>.</p><p><b>2.</b> Bạn có thể lấy <b>User Access Token</b> thông qua Network Tab (F12) trên trình duyệt, tìm header Authorization hoặc tìm chuỗi Token bắt đầu bằng <code>eyJhbG...</code> trong Request. Token này cho phép truy cập toàn bộ hệ thống các Page của bạn.</p>'
};
