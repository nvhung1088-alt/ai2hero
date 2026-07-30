'use client';

import React from 'react';
import {
  Laptop,
  AlertTriangle,
  X
} from 'lucide-react';

interface DubWorkerPanelProps {
  workers: any[];
  isWorkerOnline: boolean;
  activeWorker: any;
  handleDeleteWorker: (_id: number) => void;
  section: 'status' | 'management';
}

export default function DubWorkerPanel({
  workers,
  isWorkerOnline,
  activeWorker,
  handleDeleteWorker,
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
              Cần chạy script local worker trên máy tính của bạn để nhận và xử lý tác vụ dịch thuật. Nhấp nút &quot;Kết nối máy local&quot; để lấy mã liên kết và bắt đầu.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Section === 'management'
  return (
    <div className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
      <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Laptop className="h-4 w-4 text-emerald-400" />
        Quản lý máy xử lý kết nối ({workers.length})
      </h2>

      {workers.length === 0 ? (
        <p className="text-[10px] text-gray-500 font-bold py-2">
          Chưa có máy xử lý nào được ghép nối với workspace này.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => {
            const diffMin = w.lastSeenAt ? (Date.now() - new Date(w.lastSeenAt).getTime()) / 1000 / 60 : 999;
            const isOnline = w.status === 'online' && diffMin <= 2;

            return (
              <div key={w.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-md shadow-green-500/30' : 'bg-red-500'} shrink-0`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-white truncate">{w.deviceName}</span>
                    <span className="text-[9px] text-gray-500 capitalize">{w.platform} | Version {w.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={() => handleDeleteWorker(w.id)}
                    className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-500 cursor-pointer transition-all"
                    title="Gỡ kết nối"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
