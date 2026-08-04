'use client';

import React from 'react';
import {
  Laptop,
  AlertTriangle,
  X,
  RotateCcw,
  Activity
} from 'lucide-react';

interface DubWorkerPanelProps {
  workers: any[];
  tasks?: any[];
  isWorkerOnline: boolean;
  activeWorker: any;
  handleDeleteWorker: (_id: number) => void;
  handleResetWorker?: (_id: number) => void;
  section: 'status' | 'management';
}

export default function DubWorkerPanel({
  workers,
  tasks = [],
  isWorkerOnline,
  activeWorker,
  handleDeleteWorker,
  handleResetWorker,
  section,
}: DubWorkerPanelProps) {
  if (section === 'status') {
    return (
      <div
        className={`p-4 rounded-2xl border transition-all duration-300 ${
          isWorkerOnline
            ? 'bg-green-500/5 border-green-500/10'
            : 'bg-amber-500/5 border-amber-500/10'
        }`}
      >
        {isWorkerOnline && activeWorker ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping shrink-0" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0 -ml-5.5 relative z-10" />
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-green-400" />
                <span className="text-xs font-extrabold text-white">
                  Máy xử lý: <span className="text-green-400">{activeWorker.deviceName}</span>
                </span>
                <span className="text-[10px] text-gray-500 font-bold capitalize">
                  ({activeWorker.platform || 'windows'}, v{activeWorker.version || '1.0.0'})
                </span>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 font-bold">
              Hoạt động gần nhất: <span className="text-green-400">Vừa xong</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="text-xs font-extrabold text-gray-300">
                Chưa kết nối máy xử lý local (Worker)
              </div>
            </div>
            <p className="text-[10px] text-amber-500/80 font-bold leading-normal max-w-xl">
              Cần chạy script local worker trên máy tính của bạn để nhận và xử lý tác vụ dịch thuật. Lấy Mã liên kết (Worker) ở góc phải phía trên màn hình để kết nối và bắt đầu.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Section === 'management'
  return (
    <div className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Laptop className="h-4 w-4 text-emerald-400" />
          Quản lý máy xử lý kết nối ({workers.length})
        </h2>
      </div>

      {workers.length === 0 ? (
        <p className="text-[10px] text-gray-500 font-bold py-2">
          Chưa có máy xử lý nào được ghép nối với workspace này.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => {
            const diffMin = w.lastSeenAt ? (Date.now() - new Date(w.lastSeenAt).getTime()) / 1000 / 60 : 999;
            const isOnline = w.status === 'online' && diffMin <= 2;

            // Tìm task đang được gán xử lý bởi worker này
            const activeTask = tasks.find(
              (t) => t.workerId === w.id && ['assigned', 'downloading', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'processing'].includes(t.status)
            );

            return (
              <div key={w.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between gap-3 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-md shadow-green-500/30 animate-pulse' : 'bg-red-500'} shrink-0`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-white truncate" title={w.deviceName}>{w.deviceName}</span>
                      <span className="text-[9px] text-gray-500 capitalize">{w.platform || 'windows'} | Version {w.version || '1.0.0'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    {handleResetWorker && (
                      <button
                        onClick={() => handleResetWorker(w.id)}
                        className="p-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-md text-amber-400 cursor-pointer transition-all flex items-center gap-1 text-[9px] font-bold"
                        title="Gỡ lỗi: Thu hồi tất cả tác vụ bị kẹt của máy này về hàng đợi"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteWorker(w.id)}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md text-red-400 cursor-pointer transition-all"
                      title="Gỡ kết nối máy này"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-status: Task info or Idle state */}
                <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                  {activeTask ? (
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold truncate max-w-full">
                      <Activity className="h-3 w-3 text-amber-400 animate-spin shrink-0" />
                      <span className="truncate">Đang xử lý Task #{activeTask.id} ({activeTask.progress || 0}%)</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 font-medium">
                      {isOnline ? '⏳ Đang chờ nhận việc' : `Mất kết nối (${diffMin < 900 ? Math.round(diffMin) + ' phút trước' : 'Lâu rồi'})`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
