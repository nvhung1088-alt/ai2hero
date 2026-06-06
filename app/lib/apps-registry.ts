export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Tên icon lucide-react (string để serialize qua Server→Client)
  path: string;
  status: 'live' | 'beta' | 'coming_soon';
  tier: 'free' | 'pro';
  category: 'ai' | 'management' | 'communication' | 'analytics';
  color: string; // Tailwind gradient class for card accent
  slogan?: string;        // Tagline ngắn gọn, thu hút
  longDesc?: string;      // Mô tả chi tiết 2-3 câu
  features?: string[];    // Danh sách tính năng nổi bật (3-5 mục)
  benefits?: string[];    // Lợi ích cho doanh nghiệp (2-3 mục)
  targetUsers?: string;   // Đối tượng sử dụng phù hợp
}

export const APPS: AppDefinition[] = [
  {
    id: 'sim',
    name: 'HeroSim',
    description: 'Quản lý SIM doanh nghiệp — bảo vệ tài khoản liên kết, cảnh báo rủi ro, kiểm tra tự động.',
    icon: 'Smartphone',
    path: '/sim/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-orange-500 to-amber-400',
    slogan: 'Lá chắn bảo mật tối cao cho hệ thống SIM & OTP',
    longDesc: 'Quản lý SIM doanh nghiệp an toàn tuyệt đối với công nghệ mã hóa AES-256-CBC và nguyên lý Zero-Knowledge. Tự động đồng bộ hóa tài khoản liên kết, cảnh báo rủi ro bảo mật tức thì, và kiểm tra trạng thái hoạt động thiết bị thông minh.',
    features: [
      'Giám sát trạng thái SIM thời gian thực',
      'Mã hóa bảo mật thông tin cá nhân PII & Mật khẩu',
      'Đồng bộ hóa tài khoản liên kết cực nhanh qua Extension',
      'Hệ thống Telegram Alerts cảnh báo rủi ro tức thời',
      'Phân tích & tự động chấm điểm an toàn thiết bị'
    ],
    benefits: [
      'Tiết kiệm 95% thời gian quản trị và kiểm tra SIM thủ công',
      'Ngăn chặn 100% rủi ro chiếm đoạt tài khoản do mất SIM/OTP',
      'Tập trung dữ liệu an toàn tuyệt đối theo nguyên lý Zero-Knowledge'
    ],
    targetUsers: 'Doanh nghiệp Retail, MMO, Ads Teams, Fintech, và các đội nhóm quản lý số lượng lớn tài khoản liên kết SIM.'
  },
  {
    id: 'herovideo',
    name: 'HeroVideoDownload',
    description: 'Quản lý tài nguyên video, tự động đồng bộ từ Extension. Thu thập hàng ngàn video sạch không logo.',
    icon: 'Video',
    path: '/herovideodownload/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-pink-500 to-rose-400',
    slogan: 'Ngân hàng nguyên liệu Video Tiktok/Douyin không giới hạn',
    longDesc: 'Quản lý và tổ chức hàng ngàn video nguyên liệu chất lượng cao tải về từ TikTok, Douyin. Tự động đồng bộ với HeroVideo Extension, không còn rác, không còn watermark.',
    features: [
      'Đồng bộ hóa trực tiếp video từ Extension',
      'Lọc video rác, video âm thanh ngay trên trình duyệt',
      'Quản lý danh sách video nguyên liệu trực quan'
    ],
    benefits: [
      'Tiết kiệm 80% thời gian tìm kiếm và tải nguyên liệu',
      'Kho video sạch sẽ, quản lý tập trung, dễ dàng tái sử dụng'
    ],
    targetUsers: 'Content Creators, TikTokers, Affiliate Marketers, Video Editors.'
  },
  {
    id: 'connect-hub',
    name: 'Connect Hub',
    description: 'Cổng kết nối ứng dụng — Google Drive, Sheets, KiotViet, Pancake và hàng trăm ứng dụng khác.',
    icon: 'Plug',
    path: '/connect-hub/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-purple-500 to-indigo-500',
    slogan: 'Kết nối mọi ứng dụng chỉ trong 1 click',
    longDesc: 'Kết nối tài khoản Google Drive, KiotViet, Pancake, Gmail, Telegram và bất kỳ API nào. Các MVP của AI2Hero sẽ tự động sử dụng kết nối để đồng bộ dữ liệu theo yêu cầu.',
    features: [
      'Kết nối 1 lần — tất cả MVP đều dùng được',
      'Test connection tức thì trước khi lưu',
      'Custom HTTP API — tự thêm bất kỳ API nào',
      'Mã hóa credential AES-256 an toàn tuyệt đối',
      'Connector Việt Nam: KiotViet, Pancake, Nhanh.vn'
    ],
    benefits: [
      'Không cần kỹ thuật — chỉ nhập API key hoặc đăng nhập',
      '0đ chi phí — chạy hoàn toàn trên cloud miễn phí'
    ],
    targetUsers: 'Mọi doanh nghiệp cần kết nối dữ liệu từ nhiều ứng dụng và tự động hóa báo cáo AI.'
  },
  {
    id: 'hero-report',
    name: 'Hero Report',
    description: 'Báo cáo tự động — kéo dữ liệu từ POS, AI viết nhận xét, gửi Telegram theo giờ.',
    icon: 'BarChart3',
    path: '/hero-report/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'analytics',
    color: 'from-emerald-500 to-teal-500',
    slogan: 'Báo cáo kinh doanh tự động, gửi thẳng vào nhóm',
    longDesc: 'Kết nối với nguồn dữ liệu POS (Pancake, KiotViet), hệ thống tự tính toán số liệu chuẩn xác rồi dùng AI viết nhận xét thông minh. Tự động gửi báo cáo vào nhóm Telegram theo lịch bạn đặt.',
    features: [
      'Tự tính doanh thu, top sản phẩm, tồn kho thấp',
      'AI viết nhận xét & gợi ý hành động',
      'Gửi Telegram tự động theo giờ đặt lịch',
      'Gửi thử ngay 1 click trước khi lưu lịch',
      'Lịch sử chạy báo cáo chi tiết'
    ],
    benefits: [
      'Không cần mở dashboard — báo cáo tự đến nhóm chat',
      'Số liệu chính xác 100% do code tính (không AI đoán)'
    ],
    targetUsers: 'Chủ shop, Quản lý kinh doanh, Kế toán cần báo cáo tự động hàng ngày.'
  }
];

// === Helper Functions ===

export function getAppsByStatus(status: AppDefinition['status']): AppDefinition[] {
  return APPS.filter((app) => app.status === status);
}

export function getAppsByTier(tier: AppDefinition['tier']): AppDefinition[] {
  return APPS.filter((app) => app.tier === tier);
}

export function getAppsByCategory(category: AppDefinition['category']): AppDefinition[] {
  return APPS.filter((app) => app.category === category);
}

export function getAppById(id: string): AppDefinition | undefined {
  return APPS.find((app) => app.id === id);
}

export function getLiveApps(): AppDefinition[] {
  return APPS.filter((app) => app.status === 'live');
}

export function getAllAppsCount(): number {
  return APPS.length;
}

export function getAppDynamicPath(appId: string, teamId: number): string {
  const app = getAppById(appId);
  if (!app) return '/dashboard';
  const parts = app.path.split('/').filter(Boolean);
  if (parts.length < 2) return app.path;
  return `/${parts[0]}/t/${teamId}/${parts.slice(1).join('/')}`;
}

