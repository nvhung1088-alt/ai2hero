'use client';

import React from 'react';
import {
  CheckCircle,
  Clock,
  Loader2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function getStatusBadge(status: string): React.JSX.Element {
  switch (status) {
    case 'pending':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Đang chờ
        </span>
      );
    case 'assigned':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 animate-pulse">
          <Clock className="h-3 w-3" /> Đã nhận
        </span>
      );
    case 'downloading':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang tải video
        </span>
      );
    case 'transcribing':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Nhận dạng ASR
        </span>
      );
    case 'translating':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang dịch phụ đề
        </span>
      );
    case 'burning':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Burn phụ đề
        </span>
      );
    case 'uploading':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 animate-bounce">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang xuất video
        </span>
      );
    case 'completed':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Hoàn thành
        </span>
      );
    case 'failed':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Lỗi
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
          {status}
        </span>
      );
  }
}

export function getPlatformLabel(platform: string, sourceUrl: string = ''): React.JSX.Element {
  if (platform === 'youtube') {
    return (
      <span className="text-[10px] font-semibold bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-md text-red-400">
        YouTube
      </span>
    );
  }
  if (platform === 'bilibili') {
    return (
      <span className="text-[10px] font-semibold bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-md text-pink-400">
        Bilibili
      </span>
    );
  }
  if (platform === 'douyin') {
    return (
      <span className="text-[10px] font-semibold bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md text-purple-400">
        Douyin
      </span>
    );
  }
  if (platform === 'local' || sourceUrl.includes('C:\\') || sourceUrl.includes(':\\')) {
    return (
      <span className="text-[10px] font-semibold bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-md text-green-400 flex items-center gap-1">
        <FolderOpen className="h-3 w-3" /> Local
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold bg-gray-500/20 border border-gray-500/30 px-2 py-0.5 rounded-md text-gray-400">
      Web URL
    </span>
  );
}
