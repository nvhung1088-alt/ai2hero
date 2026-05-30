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
