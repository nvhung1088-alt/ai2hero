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
}

export const APPS: AppDefinition[] = [
  {
    id: 'sim',
    name: 'SIM Manager',
    description: 'Quản lý SIM doanh nghiệp — bảo vệ tài khoản liên kết, cảnh báo rủi ro, kiểm tra tự động.',
    icon: 'Smartphone',
    path: '/sim/dashboard',
    status: 'beta',
    tier: 'free',
    category: 'management',
    color: 'from-orange-500 to-amber-400',
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
