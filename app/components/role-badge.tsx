'use client';

import { type RoleKey, getRoleByKey } from '@/lib/shared-constants';
import {
  Crown, ShieldCheck, UserCog, User, Eye,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  Crown, ShieldCheck, UserCog, User, Eye,
};

interface RoleBadgeProps {
  role: RoleKey;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const def = getRoleByKey(role);
  const Icon = ROLE_ICON_MAP[def.icon] ?? User;
  const sizeClass = size === 'sm'
    ? 'px-2.5 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${def.color} ${def.textColor} ${sizeClass}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {def.label}
    </span>
  );
}
