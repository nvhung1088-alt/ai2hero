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
  ],
  actions: [
    { slug: 'list_pages', name: 'Lấy danh sách Pages', description: 'Truy xuất toàn bộ các Fanpage mà tài khoản này có quyền quản lý.', inputSchema: [] },
    { slug: 'list_conversations', name: 'Lấy hội thoại (Tất cả Page)', description: 'Truy vấn danh sách hội thoại mới nhất từ tất cả các Page.', inputSchema: [] },
    { 
      slug: 'send_message', 
      name: 'Gửi tin nhắn', 
      description: 'Gửi tin nhắn phản hồi tới khách hàng trên một Page cụ thể', 
      inputSchema: [
        { name: 'page_id', type: 'text', required: true, label: 'ID của Fanpage (lấy từ list_pages)' },
        { name: 'conversation_id', type: 'text', required: true, label: 'ID của cuộc hội thoại' },
        { name: 'message', type: 'text', required: true, label: 'Nội dung tin nhắn cần gửi' }
      ] 
    },
    { 
      slug: 'get_staff_statistics', 
      name: 'Thống kê Nhân viên (Users)', 
      description: 'Lấy báo cáo hiệu suất làm việc của nhân sự trực Chat (tổng hợp từ tất cả các page).', 
      inputSchema: [
        { name: 'since', type: 'text', required: true, label: 'Từ thời gian (Unix Timestamp)' },
        { name: 'until', type: 'text', required: true, label: 'Đến thời gian (Unix Timestamp)' }
      ] 
    },
    { 
      slug: 'get_page_statistics', 
      name: 'Thống kê Tổng quan (Pages)', 
      description: 'Lấy báo cáo số lượng tin nhắn, bình luận của toàn bộ Fanpage.', 
      inputSchema: [
        { name: 'since', type: 'text', required: true, label: 'Từ thời gian (Unix Timestamp)' },
        { name: 'until', type: 'text', required: true, label: 'Đến thời gian (Unix Timestamp)' }
      ] 
    },
  ],
  setupGuide: '<p><b>1.</b> Đăng nhập vào <a href="https://pages.fm" target="_blank" rel="noreferrer">Pancake Chat (pages.fm)</a>.</p><p><b>2.</b> Bạn có thể lấy <b>User Access Token</b> thông qua Network Tab (F12) trên trình duyệt, tìm header Authorization hoặc tìm chuỗi Token bắt đầu bằng <code>eyJhbG...</code> trong Request. Token này cho phép truy cập toàn bộ hệ thống các Page của bạn.</p>'
};
