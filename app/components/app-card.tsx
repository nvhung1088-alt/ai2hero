'use client';

import Link from 'next/link';
import type { AppDefinition } from '@/lib/apps-registry';
import {
  MessageSquare,
  Brain,
  Plug,
  Smartphone,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Map tên icon string → component (chỉ import những icon thật sự dùng)
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Brain,
  Plug,
  Smartphone,
  ShoppingCart,
  FileText,
};

interface AppCardProps {
  app: AppDefinition;
  index?: number;
}

const statusConfig = {
  live: {
    label: 'Live',
    dotClass: 'bg-green-500',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
  },
  beta: {
    label: 'Beta',
    dotClass: 'bg-yellow-500',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  coming_soon: {
    label: 'Sắp ra mắt',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

export function AppCard({ app, index }: AppCardProps) {
  const status = statusConfig[app.status];
  const Icon = ICON_MAP[app.icon] ?? MessageSquare;
  const isClickable = app.status !== 'coming_soon';
  const delay = index !== undefined ? `${index * 0.05}s` : '0s';

  const cardContent = (
    <div
      style={{ animationDelay: delay }}
      className={`
        group relative overflow-hidden rounded-2xl border border-gray-200
        bg-white p-6 transition-all duration-300 animate-fade-up
        ${isClickable
          ? 'hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
          : 'opacity-75 cursor-default'
        }
      `}
    >
      {/* Gradient accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${app.color} transition-all duration-300 ${
          isClickable ? 'group-hover:h-1.5' : ''
        }`}
      />

      {/* Header: Icon + Status */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${app.color} text-white shadow-md transition-transform duration-300 ${
            isClickable ? 'group-hover:scale-110' : ''
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.badgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
          {status.label}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1.5">
        {app.name}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {app.description}
      </p>

      {/* Footer: Tier badge */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {app.tier === 'free' ? '✨ Miễn phí' : '⭐ Pro'}
        </span>
        {isClickable && (
          <span className="text-sm font-medium text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Mở →
          </span>
        )}
      </div>
    </div>
  );

  if (isClickable) {
    return <Link href={app.path}>{cardContent}</Link>;
  }

  return cardContent;
}
