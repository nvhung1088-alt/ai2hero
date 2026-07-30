'use client';

import { Search, Plus, Edit3, Loader2, Pause, AlertCircle } from 'lucide-react';

interface ProjectSidebarProps {
  projects: any[];
  activeProjectId: number | null;
  onSelectProject: (id: number) => void;
  onEditProject: (project: any) => void;
  onCreateProject: () => void;
}

export function DownloaderProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onEditProject,
  onCreateProject
}: ProjectSidebarProps) {
  return (
    <div className="w-80 border-r border-white/5 flex flex-col bg-gray-900/20">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h2 className="font-semibold text-white">Dự án Quét Tải</h2>
        <button 
          onClick={onCreateProject}
          className="p-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3">
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Tìm dự án..." 
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-gray-300 focus:outline-none focus:border-teal-500/50 transition-colors placeholder:text-gray-600"
          />
        </div>
        
        <div className="space-y-2 overflow-y-auto h-[calc(100vh-180px)] pr-1 custom-scrollbar">
          {projects.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-xs">
              Chưa có dự án nào. Bấm dấu + để tạo.
            </div>
          ) : projects.map(project => (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                activeProjectId === project.id 
                  ? 'bg-teal-500/10 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-medium truncate pr-2 ${activeProjectId === project.id ? 'text-teal-400' : 'text-gray-300'}`}>
                  {project.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(project);
                    }}
                    className="text-gray-500 hover:text-teal-400 transition-colors"
                    title="Sửa dự án"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {project.status === 'active' && <Loader2 className="w-4 h-4 animate-spin text-teal-500 shrink-0" />}
                  {project.status === 'paused' && <Pause className="w-4 h-4 text-amber-500 shrink-0" />}
                  {project.status === 'idle' && <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />}
                </div>
              </div>
              
              <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                <span>{project.platform}</span>
                <span>Tổng: {project.totalVideos || 0} video</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                <span>Quét: {project.lastScanAt ? new Date(project.lastScanAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa quét'}</span>
                <span className="text-teal-500/80">Đã tải: {project.downloadedVideos || 0}</span>
              </div>
              
              <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${project.status === 'active' ? 'bg-teal-500' : project.status === 'paused' ? 'bg-amber-500' : 'bg-gray-600'}`}
                  style={{ width: `${project.totalVideos ? ((project.downloadedVideos || 0) / project.totalVideos) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
