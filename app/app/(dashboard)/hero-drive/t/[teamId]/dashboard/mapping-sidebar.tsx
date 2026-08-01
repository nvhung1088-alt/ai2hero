'use client';

import { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Search,
  Pause,
  Play,
  Clock,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

interface MappingSidebarProps {
  mappings: any[];
  selectedMappingId: number | null;
  onSelectMapping: (id: number) => void;
  onCreateMappingClick: () => void;
  onDeleteMapping: (id: number) => void;
  onToggleMapping: (id: number, currentActive: boolean) => void;
  googleDriveConnections: any[];
}

export default function MappingSidebar({
  mappings,
  selectedMappingId,
  onSelectMapping,
  onCreateMappingClick,
  onDeleteMapping,
  onToggleMapping,
  googleDriveConnections,
}: MappingSidebarProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredMappings = mappings.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.localFolderPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full lg:w-80 shrink-0 bg-slate-900/40 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          Thư Mục Quét ({mappings.length})
        </h2>
        <button
          onClick={onCreateMappingClick}
          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-md shadow-blue-500/20"
          title="Thêm thư mục quét mới"
        >
          <Plus className="w-3.5 h-3.5" />
          Mới
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Tìm thư mục..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* List Folder Mappings */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredMappings.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            {searchQuery ? 'Không tìm thấy thư mục' : 'Chưa có thư mục quét nào.'}
          </div>
        ) : (
          filteredMappings.map((mapping) => {
            const isSelected = mapping.id === selectedMappingId;
            const conn = googleDriveConnections.find((c) => c.id === mapping.connectionId);
            const connEmail = conn?.credentials?.accountEmail || conn?.credentials?.email || conn?.name;

            return (
              <div
                key={mapping.id}
                onClick={() => onSelectMapping(mapping.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/40 text-slate-100 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate flex items-center gap-1.5">
                    <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    {mapping.name}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMapping(mapping.id, mapping.isActive);
                      }}
                      className={`p-1 rounded transition-colors ${
                        mapping.isActive
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-slate-500 hover:bg-slate-800'
                      }`}
                      title={mapping.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    >
                      {mapping.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMapping(mapping.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Xóa mapping"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                  <p className="truncate">💻 {mapping.localFolderPath}</p>
                  {mapping.targetFolderId ? (
                    <a
                      href={`https://drive.google.com/drive/u/0/folders/${mapping.targetFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-blue-400 hover:underline flex items-center gap-1"
                      title="Mở thư mục Google Drive"
                    >
                      ☁️ {mapping.targetFolderName || mapping.targetFolderId}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ) : (
                    <p className="truncate text-blue-400/90">
                      ☁️ {connEmail ? `✉️ ${connEmail}` : 'Mặc định'}
                    </p>
                  )}
                  <p className="text-[10px] text-emerald-400/80 truncate pt-0.5 font-sans">
                    ⏱️ Quét gần nhất: {mapping.lastScanAt ? new Date(mapping.lastScanAt).toLocaleTimeString('vi-VN') + ' ' + new Date(mapping.lastScanAt).toLocaleDateString('vi-VN') : 'Chưa quét'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                  <span
                    className={`px-1.5 py-0.2 rounded ${
                      mapping.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {mapping.isActive ? 'Đang chạy' : 'Đã dừng'}
                  </span>
                  <span className="text-slate-500">{mapping.scanInterval || 10}s/lần</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
