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
  
  // === MỚI: Metadata cho Capabilities UI & AI ===
  group?: string;               // Nhóm nghiệp vụ (Báo cáo, Đơn hàng, Kho, ...)
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint?: string;            // Endpoint tham chiếu (hiển thị trên UI)
  status?: 'ready' | 'planned'; // Trạng thái sẵn sàng
  outputFields?: string[];      // Các trường đầu ra chính
  aiInstruction?: string;       // Hướng dẫn cho AI thực thi
  
  // === MỚI: Metadata cho Test tự động ===
  testStrategy?: 'direct' | 'requires_sample'; // direct = test ngay, requires_sample = cần ID mẫu
  sampleFrom?: {                // Chỉ dùng khi testStrategy = 'requires_sample'
    actionSlug: string;         // Action lấy danh sách (vd: 'list_orders')
    path: string;               // JSONPath lấy ID (vd: 'data[0].id')
    inputKey: string;           // Key truyền vào action test (vd: 'orderId')
  };
}

export interface ConnectorDefinition {
  slug: string;
  name: string;
  icon: string; // Tên Lucide Icon tương ứng
  logoUrl?: string; // MỚI: URL ảnh gốc
  category: 'pos' | 'storage' | 'email' | 'chat' | 'crm' | 'developer' | 'management' | 'ai' | 'payment' | 'social';
  description: string;
  authType: 'oauth2' | 'api_key' | 'client_credentials' | 'bearer_token' | 'basic' | 'custom_http' | 'none';
  authFields: AuthField[];
  actions: ActionDefinition[];
  popular?: boolean;
  setupGuide?: string; // Hướng dẫn HTML/Text chi tiết cách lấy API/ID
  status?: 'ready' | 'updating'; // Trạng thái hoàn thiện của API
  
  // Hiển thị nhãn nổi bật (Ví dụ: Premium, Free) trên thẻ ứng dụng
  badge?: {
    text: string;
    variant: 'premium' | 'free' | 'default';
  };
  
  // Quản lý quy trình cải tiến, quét lỗi và vòng đời API (Lifecycle Management)
  lifecycle?: {
    updatePolicy: 'manual' | 'auto_sync' | 'cron'; // Chính sách cập nhật (Thủ công / Đồng bộ tự động / Chạy Cron ngầm)
    healthCheckEndpoint?: string; // Đường dẫn API để hệ thống tự động quét lỗi/kiểm tra trạng thái nhà cung cấp
    documentationUrl?: string; // Link changelog/developer docs để theo dõi phiên bản mới
  };

  // === MỚI: Tích hợp Catalog & Trình chạy động (Activepieces Metadata) ===
  runtimeType?: 'custom_runner' | 'generic_http' | 'catalog_only';
  runtimeConfidence?: 'high' | 'medium' | 'low';
  source?: 'manual' | 'activepieces';
  integrationPriority?: number;
  connectorStatus?: 'active' | 'deprecated' | 'planned';
  permissionScope?: string[];
  riskLevel?: 'safe' | 'medium' | 'high';
  aiCapability?: ('text' | 'image' | 'video' | 'audio' | 'tts' | 'code')[];
  aiModels?: {
    name: string;
    type: 'text' | 'image' | 'video' | 'tts' | 'code';
    modes?: string[];      // cho video: 'text', 'singleImage', etc.
    think?: boolean;        // cho text: reasoning model
  }[];
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}


