export interface InputField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'textarea' | 'date';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // Dành cho kiểu 'select'
}

export interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  secret?: boolean; // Nếu true sẽ được mã hóa AES-256-GCM khi lưu DB và che mờ trên UI
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export interface ActionDefinition {
  slug: string;
  name: string;
  description: string;
  inputSchema: InputField[];
}

export interface ConnectorDefinition {
  slug: string;
  name: string;
  icon: string; // Tên Lucide Icon tương ứng
  category: 'pos' | 'storage' | 'email' | 'chat' | 'crm' | 'developer' | 'management' | 'ai' | 'payment' | 'social';
  description: string;
  authType: 'oauth2' | 'api_key' | 'client_credentials' | 'bearer_token' | 'basic' | 'custom_http' | 'none';
  authFields: AuthField[];
  actions: ActionDefinition[];
  popular?: boolean;
  setupGuide?: string; // Hướng dẫn HTML/Text chi tiết cách lấy API/ID
  
  // Quản lý quy trình cải tiến, quét lỗi và vòng đời API (Lifecycle Management)
  lifecycle?: {
    updatePolicy: 'manual' | 'auto_sync' | 'cron'; // Chính sách cập nhật (Thủ công / Đồng bộ tự động / Chạy Cron ngầm)
    healthCheckEndpoint?: string; // Đường dẫn API để hệ thống tự động quét lỗi/kiểm tra trạng thái nhà cung cấp
    documentationUrl?: string; // Link changelog/developer docs để theo dõi phiên bản mới
  };
}
