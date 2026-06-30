'use client';

import React, { useState } from 'react';
import { RefreshCw, Info } from 'lucide-react';

interface PollingBannerProps {
  intervalMinutes: number;
  onRefresh: () => void | Promise<void>;
}

export function PollingBanner({ intervalMinutes, onRefresh }: PollingBannerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // small delay for visual feedback
    }
  };

  return (
    <div className="w-full bg-slate-500/10 border border-slate-500/20 text-slate-300 px-4 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-between text-sm mb-4 transition-colors">
      <div className="flex items-center space-x-2">
        <Info className="w-4 h-4 text-slate-400" />
        <span>
          Để bảo vệ server, dữ liệu tự động cập nhật mỗi <strong>{intervalMinutes} phút</strong> (ngủ đông khi ẩn tab).
        </span>
      </div>
      
      <button 
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="mt-2 sm:mt-0 flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md transition-all active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Cập nhật ngay</span>
      </button>
    </div>
  );
}
