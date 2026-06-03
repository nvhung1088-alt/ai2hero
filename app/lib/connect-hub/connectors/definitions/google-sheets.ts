import { ConnectorDefinition } from '../types';

export const googleSheetsConnector: ConnectorDefinition = {
  slug: 'google-sheets',
  name: 'Google Sheets',
  icon: 'FileSpreadsheet',
  category: 'storage',
  description: 'Đọc và ghi dữ liệu trực tiếp lên các trang tính Google Sheets.',
  authType: 'bearer_token',
  authFields: [
    {
      name: 'accessToken',
      label: 'Google Access Token / API Key',
      type: 'password',
      required: true,
      secret: true,
      placeholder: 'Nhập Google Access Token hoặc API Key',
      helpText: 'Sử dụng Google OAuth Access Token hoặc API Key để truy cập.'
    }
  ],
  actions: [
    {
      slug: 'get_spreadsheet_values',
      name: 'Đọc dữ liệu trang tính',
      description: 'Lấy toàn bộ dữ liệu từ một dải ô cụ thể trong Google Sheets.',
      inputSchema: [
        {
          name: 'spreadsheetId',
          label: 'Spreadsheet ID',
          type: 'text',
          required: true,
          placeholder: 'vd: 1BxiMVs0XRA5nFMdKv1a3962_IA_Iih07Wn',
          helpText: 'Lấy từ URL của bảng tính: d/[Spreadsheet-ID]/edit'
        },
        {
          name: 'range',
          label: 'Dải ô truy vấn (Range)',
          type: 'text',
          required: true,
          placeholder: 'Sheet1!A1:D20',
          helpText: 'Tên Sheet và phạm vi cột/dòng cần đọc dữ liệu.'
        }
      ]
    },
    {
      slug: 'append_spreadsheet_row',
      name: 'Thêm dòng mới',
      description: 'Ghi thêm một dòng dữ liệu mới vào cuối bảng tính.',
      inputSchema: [
        {
          name: 'spreadsheetId',
          label: 'Spreadsheet ID',
          type: 'text',
          required: true,
          placeholder: 'vd: 1BxiMVs0XRA5nFMdKv1a3962_IA_Iih07Wn'
        },
        {
          name: 'range',
          label: 'Tên Sheet / Dải ô',
          type: 'text',
          required: true,
          placeholder: 'Sheet1!A:A',
          helpText: 'Google sẽ tự tìm dòng trống tiếp theo để chèn dữ liệu.'
        },
        {
          name: 'values',
          label: 'Mảng giá trị chèn (phân tách bằng dấu phẩy)',
          type: 'text',
          required: true,
          placeholder: 'Nguyen Van A, 0987654321, Khách hàng mới',
          helpText: 'Nhập các giá trị cột tương ứng, cách nhau bởi dấu phẩy.'
        }
      ]
    }
  ],
  popular: true
};
