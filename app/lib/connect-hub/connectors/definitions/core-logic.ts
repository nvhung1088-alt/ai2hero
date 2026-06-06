import { ConnectorDefinition } from '../types';

export const coreLogicConnector: ConnectorDefinition = {
  slug: 'core-logic',
  name: 'Logic & Điều khiển',
  icon: 'Cpu',
  category: 'management',
  description: 'Các khối logic nội tại: lọc điều kiện, tạm dừng, biến đổi văn bản, định dạng số.',
  authType: 'none',
  authFields: [],
  status: 'ready',
  badge: { text: 'Built-in', variant: 'free' },
  actions: [
    { 
      slug: 'filter_condition', 
      name: 'Lọc điều kiện', 
      description: 'Dừng flow nếu điều kiện không thỏa mãn', 
      inputSchema: [
        { name: 'field', label: 'Giá trị cần kiểm tra', type: 'text', required: true, placeholder: '{{payload.status}}' },
        { name: 'operator', label: 'Điều kiện', type: 'select', required: true, options: ['eq','ne','contains','not_contains','gt','lt','gte','lte'] },
        { name: 'value', label: 'Giá trị so sánh', type: 'text', required: true, placeholder: 'confirmed' },
      ]
    },
    { 
      slug: 'delay', 
      name: 'Tạm dừng (Delay)', 
      description: 'Chờ X giây trước bước tiếp theo (tối đa 25s)', 
      inputSchema: [
        { name: 'seconds', label: 'Số giây chờ', type: 'text', required: true, placeholder: '5' },
      ]
    },
    { 
      slug: 'transform_text', 
      name: 'Biến đổi văn bản', 
      description: 'Chuyển chữ hoa/thường, cắt khoảng trắng, thay thế chuỗi', 
      inputSchema: [
        { name: 'input', label: 'Văn bản đầu vào', type: 'text', required: true },
        { name: 'operation', label: 'Phép biến đổi', type: 'select', required: true, options: ['uppercase','lowercase','trim','title_case','replace'] },
        { name: 'search', label: 'Tìm chuỗi (chỉ dùng với replace)', type: 'text', required: false },
        { name: 'replacement', label: 'Thay thế bằng', type: 'text', required: false },
      ]
    },
    { 
      slug: 'format_number', 
      name: 'Định dạng số/tiền', 
      description: 'Format số thành tiền VNĐ, USD, phần trăm', 
      inputSchema: [
        { name: 'number', label: 'Số cần định dạng', type: 'text', required: true },
        { name: 'format', label: 'Định dạng', type: 'select', required: true, options: ['vnd','usd','percent','plain'] },
        { name: 'decimals', label: 'Số chữ số thập phân', type: 'text', required: false, placeholder: '0' },
      ]
    },
  ]
};
