import {
  MessageSquare,
  Brain,
  Plug,
  Smartphone,
  ShoppingCart,
  FileText,
  Zap,
  Crown,
  Building2,
  Video,
  Clapperboard,
  type LucideIcon
} from 'lucide-react';

// === Shared Sizing & Format Utilities ===
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

// === Shared Icon Maps ===
// APP_ICON_MAP gộp từ layout.tsx, home/page.tsx, store/page.tsx
export const APP_ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Brain,
  Plug,
  Smartphone,
  ShoppingCart,
  FileText,
  chat: MessageSquare,
  hub: Brain,
  api: Plug,
  sim: Smartphone,
  pos: ShoppingCart,
  content: FileText,
  Video,
  Clapperboard,
};

// PLAN_ICON gộp từ layout.tsx và dashboard/page.tsx
export const PLAN_ICON: Record<string, LucideIcon> = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
  Free: Zap,
  Pro: Crown,
  Enterprise: Building2,
};

// === Role and Member Types ===
export type RoleKey = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  color: string;        // Tailwind bg class cho badge
  textColor: string;    // Tailwind text class cho badge
  borderColor: string;  // Tailwind border class
  icon: string;         // Lucide icon name
  permissions: string[];
}

// === 5 VAI TRÒ ===
export const ROLES: RoleDefinition[] = [
  {
    key: 'owner',
    label: 'Owner',
    description: 'Toàn quyền — billing, xóa workspace, phân quyền tối cao',
    color: 'bg-gradient-to-r from-orange-500 to-pink-500',
    textColor: 'text-white',
    borderColor: 'border-orange-300',
    icon: 'Crown',
    permissions: [
      'team.member.invite', 'team.member.remove', 'team.role.assign',
      'billing.view', 'billing.manage',
      'app.all.use', 'app.all.config',
      'data.view', 'data.export', 'data.delete',
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Quản trị nhóm — mời/xóa thành viên, cấu hình app, không xóa workspace',
    color: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-300',
    icon: 'ShieldCheck',
    permissions: [
      'team.member.invite', 'team.member.remove', 'team.role.assign',
      'billing.view',
      'app.all.use', 'app.all.config',
      'data.view', 'data.export',
    ],
  },
  {
    key: 'manager',
    label: 'Manager',
    description: 'Quản lý dữ liệu — cấu hình AI/prompt, xem báo cáo team',
    color: 'bg-emerald-500',
    textColor: 'text-white',
    borderColor: 'border-emerald-300',
    icon: 'UserCog',
    permissions: [
      'app.assigned.use', 'app.assigned.config',
      'data.view', 'data.export',
    ],
  },
  {
    key: 'staff',
    label: 'Staff',
    description: 'Nhân viên — dùng app được cấp quyền, không cấu hình',
    color: 'bg-gray-500',
    textColor: 'text-white',
    borderColor: 'border-gray-300',
    icon: 'User',
    permissions: [
      'app.assigned.use',
      'data.view',
    ],
  },
  {
    key: 'viewer',
    label: 'Viewer',
    description: 'Chỉ xem — xem báo cáo và dữ liệu được chia sẻ',
    color: 'bg-white border border-gray-300',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    icon: 'Eye',
    permissions: [
      'data.view',
    ],
  },
];

// === PERMISSION CATEGORIES (cho ma trận quyền) ===
export const PERMISSION_CATEGORIES = [
  {
    name: 'Quản lý nhóm',
    permissions: [
      { key: 'team.member.invite', label: 'Mời thành viên' },
      { key: 'team.member.remove', label: 'Xóa thành viên' },
      { key: 'team.role.assign', label: 'Gán vai trò' },
    ],
  },
  {
    name: 'Ứng dụng',
    permissions: [
      { key: 'app.all.use', label: 'Dùng tất cả app' },
      { key: 'app.assigned.use', label: 'Dùng app được cấp' },
      { key: 'app.all.config', label: 'Cấu hình app' },
      { key: 'app.assigned.config', label: 'Cấu hình app được cấp' },
    ],
  },
  {
    name: 'Thanh toán',
    permissions: [
      { key: 'billing.view', label: 'Xem thanh toán' },
      { key: 'billing.manage', label: 'Quản lý thanh toán' },
    ],
  },
  {
    name: 'Dữ liệu',
    permissions: [
      { key: 'data.view', label: 'Xem báo cáo' },
      { key: 'data.export', label: 'Xuất dữ liệu' },
      { key: 'data.delete', label: 'Xóa dữ liệu' },
    ],
  },
];

export function getRoleByKey(key: RoleKey): RoleDefinition {
  return ROLES.find(r => r.key === key) ?? ROLES[4]; // fallback Viewer
}

// === PLAN HELPERS (an toàn với chữ hoa chữ thường từ DB) ===
export type PlanType = 'free' | 'pro' | 'enterprise' | 'Free' | 'Pro' | 'Enterprise';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
  Free: 'Free',
  Pro: 'Pro',
  Enterprise: 'Enterprise',
};

export function getPlanLabel(plan: PlanType | string): string {
  return PLAN_LABELS[plan] ?? plan;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-800/50 text-gray-400 border-gray-700/50',
  pro: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Free: 'bg-gray-800/50 text-gray-400 border-gray-700/50',
  Pro: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function getPlanBadgeClass(plan: PlanType | string): string {
  return PLAN_COLORS[plan] ?? 'bg-gray-800/50 text-gray-400 border-gray-700/50';
}

// === Admin & System Configs ===
export type AIModelConfig = {
  id: string; name: string; provider: string; status: 'active' | 'inactive';
  apiKeyMasked: string; monthlyUsage: number; monthlyLimit: number;
};
export const MOCK_AI_MODELS: AIModelConfig[] = [
  { id: 'gpt4', name: 'GPT-4o', provider: 'OpenAI', status: 'active', apiKeyMasked: 'sk-...7xK2', monthlyUsage: 28500, monthlyLimit: 100000 },
  { id: 'claude', name: 'Claude Sonnet 4', provider: 'Anthropic', status: 'active', apiKeyMasked: 'sk-ant-...mP9', monthlyUsage: 12300, monthlyLimit: 50000 },
  { id: 'gemini', name: 'Gemini 2.5 Flash', provider: 'Google', status: 'inactive', apiKeyMasked: 'AIza...未設定', monthlyUsage: 0, monthlyLimit: 50000 },
];

export type FreeTierLimit = { key: string; label: string; currentValue: number; unit: string; };
export const MOCK_FREE_TIER_LIMITS: FreeTierLimit[] = [
  { key: 'ai_messages', label: 'Tin nhắn AI / ngày', currentValue: 100, unit: 'tin nhắn' },
  { key: 'workspaces', label: 'Số workspace tối đa', currentValue: 1, unit: 'workspace' },
  { key: 'team_members', label: 'Thành viên / nhóm', currentValue: 5, unit: 'người' },
  { key: 'file_storage', label: 'Dung lượng lưu trữ', currentValue: 500, unit: 'MB' },
];

// === Feed Types ===
export type FeedPostType = 'system_activity' | 'mvp_result' | 'task_assignment' | 'news' | 'film_publish';
export type ReactionType = 'like' | 'love' | 'celebrate';
export interface FeedComment {
  id: number; userId: number; userName: string; userAvatar: string; content: string; timestamp: string; mentions?: string[];
  parentId?: number | null;
  likesCount?: number;
  likedByMe?: boolean;
  reactionType?: string | null;
  reactionsSummary?: Record<string, number>;
  replies?: any[];
}
export interface FeedAttachment {
  type: 'image' | 'video' | 'file'; url: string; thumbnailUrl?: string; fileName?: string; caption?: string;
}
export interface FeedPost {
  id: number; type: FeedPostType; teamId: string; userId: number; userName: string; userAvatar: string; userRole: string; timestamp: string; date: string;
  message: string; appId?: string; resultPreview?: string; resultMetrics?: { label: string; value: string }[];
  taskTitle?: string; taskStatus?: 'pending' | 'in_progress' | 'completed'; taskAssignee?: string; taskDueDate?: string;
  likes: number; likedByMe: boolean; comments: FeedComment[]; mentions?: string[]; pinned?: boolean; pinnedBy?: string; attachments?: FeedAttachment[];
  myReactionType?: string | null;
  reactionsSummary?: Record<string, number>;
  feeling?: string;
  location?: string;
  taggedUsers?: string[];
  page?: { id: number; name: string; avatar?: string | null };
  group?: { id: number; name: string; coverUrl?: string | null };
}
