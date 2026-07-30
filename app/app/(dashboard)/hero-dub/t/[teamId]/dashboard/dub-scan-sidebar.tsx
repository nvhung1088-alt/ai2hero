'use client';

import React from 'react';
import { 
  FolderKanban, 
  FolderSearch, 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  Clock, 
  Layers,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DubScanSidebarProps {
  scanConfigs: any[];
  selectedConfigId: number | null;
  onSelectConfig: (id: number | null) => void;
  onCreateNew: () => void;
  onEditConfig: (config: any) => void;
  onDeleteConfig: (id: number) => void;
  onTriggerScan: (id: number) => void;
}

export function DubScanSidebar({
  scanConfigs,
  selectedConfigId,
  onSelectConfig,
  onCreateNew,
  onEditConfig,
  onDeleteConfig,
  onTriggerScan,
}: DubScanSidebarProps) {
  return (
    <div className="w-full lg:w-80 flex flex-col gap-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md">
      {/* Header Sidebar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Dự Án Quét Thư Mục</h3>
            <p className="text-[11px] text-zinc-400">{scanConfigs.length} dự án tự động</p>
          </div>
        </div>

        <Button
          onClick={onCreateNew}
          size="sm"
          className="h-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-xs px-2.5 rounded-lg shadow-sm flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo mới</span>
        </Button>
      </div>

      {/* Group 1: Tác vụ tự do (Mặc định) */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onSelectConfig(null)}
          className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
            selectedConfigId === null
              ? 'bg-orange-500/10 border-orange-500/40 text-orange-300 shadow-inner'
              : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`p-1.5 rounded-md ${selectedConfigId === null ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold truncate">Tác vụ lẻ (Tự do)</div>
              <div className="text-[10px] text-zinc-500 truncate">Nhập URL / Upload file thủ công</div>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${selectedConfigId === null ? 'text-orange-400 translate-x-0.5' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 my-1">
        <div className="h-[1px] flex-1 bg-zinc-800/80" />
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Danh sách dự án</span>
        <div className="h-[1px] flex-1 bg-zinc-800/80" />
      </div>

      {/* Group 2: Danh sách các dự án quét */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
        {scanConfigs.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-900/20">
            <FolderSearch className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-zinc-400 font-medium">Chưa có dự án quét nào</p>
            <p className="text-[10px] text-zinc-500 mt-1">Tạo dự án để tự động phát hiện và dịch video từ thư mục máy tính</p>
            <Button
              onClick={onCreateNew}
              variant="outline"
              size="sm"
              className="mt-3 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              + Thêm dự án
            </Button>
          </div>
        ) : (
          scanConfigs.map((config) => {
            const isSelected = selectedConfigId === config.id;
            return (
              <div
                key={config.id}
                onClick={() => onSelectConfig(config.id)}
                className={`relative p-3 rounded-lg border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-200 shadow-sm'
                    : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700/80 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-400' : 'text-zinc-500'}`} />
                    <span className="text-xs font-semibold text-zinc-200 truncate">{config.name}</span>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerScan(config.id);
                      }}
                      title="Quét ngay"
                      className="p-1 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditConfig(config);
                      }}
                      title="Chỉnh sửa"
                      className="p-1 hover:bg-zinc-800 text-zinc-400 rounded transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConfig(config.id);
                      }}
                      title="Xóa dự án"
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-zinc-500 font-mono truncate flex items-center gap-1 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/40">
                  <span className="text-zinc-400 font-semibold shrink-0">Nguồn:</span>
                  <span className="truncate text-amber-300/80">{config.folderPath}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>Quét mỗi {config.intervalMinutes} phút</span>
                  </div>
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-medium">
                    {config.scannedCount || 0} video
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
