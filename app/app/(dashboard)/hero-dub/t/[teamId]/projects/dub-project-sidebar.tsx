'use client';

import React from 'react';
import { Search, Plus, FolderGit2, Trash2 } from 'lucide-react';

interface DubProjectSidebarProps {
  projects: any[];
  activeProjectId: number | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectProject: (proj: any) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: number, e: React.MouseEvent) => void;
}

export function DubProjectSidebar({
  projects,
  activeProjectId,
  searchQuery,
  onSearchChange,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: DubProjectSidebarProps) {
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-white/5 flex flex-col bg-gray-900/20 shrink-0 h-screen sticky top-0">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <FolderGit2 className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <h2 className="font-bold text-sm text-white">Thương hiệu ({projects.length})</h2>
        </div>
        <button
          onClick={onCreateProject}
          className="p-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg border border-amber-500/30 transition-colors flex items-center gap-1 text-xs font-bold"
          title="Tạo thương hiệu mới"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Mới</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm thương hiệu..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* List Projects */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 custom-scrollbar">
        {filteredProjects.length === 0 ? (
          <div className="text-center p-6 text-gray-500 text-xs">
            {searchQuery ? 'Không tìm thấy thương hiệu phù hợp.' : 'Chưa có thương hiệu nào. Bấm (+) để tạo.'}
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const isActive = activeProjectId === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className={`p-3 rounded-xl cursor-pointer border transition-all group relative ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3
                    className={`font-bold text-xs truncate pr-2 ${
                      isActive ? 'text-amber-400' : 'text-gray-200 group-hover:text-white'
                    }`}
                  >
                    {proj.name}
                  </h3>
                  <button
                    onClick={(e) => onDeleteProject(proj.id, e)}
                    className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Xóa thương hiệu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>Logo: <strong className="text-gray-400 font-normal">{proj.logoUrl ? 'Có' : 'Không'}</strong></span>
                  <span>•</span>
                  <span>Position: <strong className="text-gray-400 font-normal">{proj.logoPosition || 'top-left'}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
