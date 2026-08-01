'use client';

import { useState } from 'react';
import { Search, Plus, FolderKanban, Trash2 } from 'lucide-react';

interface SidebarProps {
  projects: any[];
  selectedProjectId: number | null;
  onSelectProject: (id: number) => void;
  onCreateProjectClick: () => void;
  onDeleteProject: (id: number) => void;
}

export default function DriveProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProjectClick,
  onDeleteProject,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full lg:w-72 bg-slate-900/40 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-4 flex flex-col gap-4">
      {/* Header & Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            Dự án Quét Upload ({projects.length})
          </h2>
          <button
            onClick={onCreateProjectClick}
            className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            title="Thêm Dự án Mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm dự án..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredProjects.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/60">
            Chưa có dự án nào
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-md shadow-blue-500/5'
                    : 'bg-slate-950/50 border-slate-800/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-semibold text-xs truncate leading-snug">{project.name}</h3>
                    {project.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    title="Xóa dự án"
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
