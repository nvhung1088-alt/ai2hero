'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { getGlobalPollingMode, PollingMode } from '@/lib/shared-polling-config';

interface PollingBannerProps {
  intervalMinutes?: number;
  onRefresh: () => void | Promise<void>;
  appName?: string;
}

export function PollingBanner({ intervalMinutes = 1, onRefresh, appName }: PollingBannerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mode, setMode] = useState<PollingMode>('normal');

  useEffect(() => {
    setMode(getGlobalPollingMode());
    const handleModeChange = () => {
      setMode(getGlobalPollingMode());
    };
    window.addEventListener('polling-mode-changed', handleModeChange);
    return () => window.removeEventListener('polling-mode-changed', handleModeChange);
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600); // Visual feedback delay
    }
  };

  const modeLabels: Record<PollingMode, { text: string; color: string }> = {
    normal: { text: 'Smart Polling Standard', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    eco: { text: 'Eco Saver Mode (Tiết kiệm 50%)', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    emergency: { text: 'Emergency Saver (Cắt 85% traffic)', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  };

  return (
    <div className="w-full bg-gray-900/60 border border-white/10 backdrop-blur-xl text-gray-200 px-4 py-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs mb-4 shadow-lg">
      <div className="flex items-center space-x-2.5">
        <div className="p-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {appName ? <strong>{appName}: </strong> : null}
            Dữ liệu tự động cập nhật ngầm. Tự động ngắt 100% khi bạn chuyển tab.
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${modeLabels[mode].color}`}>
            <ShieldCheck className="w-3 h-3 inline mr-1" />
            {modeLabels[mode].text}
          </span>
        </div>
      </div>
      
      <button 
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="mt-2 sm:mt-0 flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Cập nhật ngay (Quét tức thì)</span>
      </button>
    </div>
  );
}
