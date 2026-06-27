'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  RefreshCw, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { getCoccocTasksAction } from '@/lib/db/hero-coccoc-actions';

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  projectId: number | null;
  videoUrl: string;
  videoTitle: string | null;
  platform: string | null;
  downloadedPath: string | null;
  fileSize: number | null;
  duration: number | null;
  quality: string | null;
  status: string;
  error: string | null;
  priority: number;
  logs: any;
  createdAt: Date;
  completedAt: Date | null;
}

interface HistoryClientProps {
  teamId: number;
  projects: Project[];
}

export default function HistoryClient({
  teamId,
  projects,
}: HistoryClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters State
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected task for log view
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks callback
  const fetchTasks = useCallback(async (showSilence = false) => {
    if (!showSilence) setLoading(true);
    try {
      const projId = selectedProject === 'all' ? undefined : parseInt(selectedProject, 10);
      const status = selectedStatus === 'all' ? undefined : selectedStatus;
      
      const result = await getCoccocTasksAction(teamId, {
        projectId: projId,
        status,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      if (result.error) {
        showToast(result.error, 'error');
      } else {
        setTasks((result.tasks || []) as unknown as Task[]);
        setTotalCount(result.totalCount || 0);
      }
    } catch (err: any) {
      showToast('Lỗi tải lịch sử: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedProject, selectedStatus, currentPage]);

  // Initial fetch and on filter changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Polling data auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getProjectName = (projId: number | null) => {
    if (!projId) return 'Tải nhanh';
    const p = projects.find(proj => proj.id === projId);
    return p ? p.name : 'Dự án đã xóa';
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-white animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            Lịch sử Hoạt động Tải về
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Theo dõi chi tiết tiến độ tải, log chẩn đoán và thông số của từng video.
          </p>
        </div>
        <button
          onClick={() => fetchTasks()}
          disabled={loading}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer disabled:opacity-50"
          title="Tải lại bảng"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="space-y-1 w-full md:w-56">
            <label className="text-[10px] font-bold text-gray-500 uppercase select-none">Lọc theo Dự án</label>
            <select
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setCurrentPage(1); }}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
            >
              <option value="all" className="bg-gray-900">Tất cả dự án / Tải nhanh</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-gray-900">
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 w-full md:w-44">
            <label className="text-[10px] font-bold text-gray-500 uppercase select-none">Lọc theo Trạng thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
            >
              <option value="all" className="bg-gray-900">Tất cả trạng thái</option>
              <option value="pending" className="bg-gray-900">Pending (Chờ xử lý)</option>
              <option value="scanning" className="bg-gray-900">Scanning (Đang quét)</option>
              <option value="downloading" className="bg-gray-900">Downloading (Đang tải)</option>
              <option value="completed" className="bg-gray-900">Completed (Hoàn thành)</option>
              <option value="failed" className="bg-gray-900">Failed (Thất bại)</option>
              <option value="skipped" className="bg-gray-900">Skipped (Bỏ qua)</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-gray-500 font-bold select-none self-end md:self-auto">
          Tìm thấy <span className="text-white">{totalCount}</span> kết quả
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {loading && tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-emerald-400 mb-3" />
            <p className="text-xs">Đang tải dữ liệu lịch sử...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-2">
            <Database className="h-10 w-10 mx-auto text-gray-600" />
            <p className="text-xs font-medium">Không tìm thấy tác vụ nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 bg-white/[0.01] select-none">
                  <th className="p-4 font-black">Video</th>
                  <th className="p-4 font-black">Dự án</th>
                  <th className="p-4 font-black">Thông số file</th>
                  <th className="p-4 font-black">Trạng thái</th>
                  <th className="p-4 font-black text-right">Nhật ký</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/[0.005] transition-colors">
                    <td className="p-4 max-w-xs md:max-w-md">
                      <p className="font-extrabold text-white truncate">
                        {task.videoTitle || 'Đang cào thông tin...'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5" title={task.videoUrl}>
                        {task.videoUrl}
                      </p>
                      {task.downloadedPath && (
                        <p className="text-[10px] text-emerald-400 truncate mt-1 bg-emerald-500/5 p-1 rounded border border-emerald-500/10 font-mono">
                          Saved: {task.downloadedPath}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="bg-white/5 px-2.5 py-1 rounded-lg text-gray-300 font-bold">
                        {getProjectName(task.projectId)}
                      </span>
                      {task.priority === 1 && (
                        <span className="ml-2 bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-rose-500/10 select-none">
                          ⚡ Tải nhanh
                        </span>
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      <p className="text-gray-400">Dung lượng: <span className="text-white font-mono">{formatSize(task.fileSize)}</span></p>
                      <p className="text-[10px] text-gray-500">
                        Thời lượng: {formatDuration(task.duration)} | Chất lượng: {task.quality || 'N/A'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black uppercase text-[9px] ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : task.status === 'failed'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : task.status === 'downloading'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center gap-1.5 ml-auto py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 hover:text-white transition-all cursor-pointer select-none"
                      >
                        <Eye className="h-3.5 w-3.5" /> Xem Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between select-none">
          <div className="text-[10px] text-gray-500 font-bold">
            Trang {currentPage} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Log Details Modal Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50 animate-fade-in">
          <div className="bg-gray-900 border-l border-white/10 w-full max-w-md h-full p-6 flex flex-col justify-between space-y-6">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  Nhật ký Tác vụ #{selectedTask.id}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[280px] truncate" title={selectedTask.videoUrl}>
                  URL: {selectedTask.videoUrl}
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline Logs */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1">
              {(!selectedTask.logs || !Array.isArray(selectedTask.logs) || selectedTask.logs.length === 0) ? (
                <div className="text-center py-20 text-gray-600 text-xs">
                  Không có dữ liệu log chẩn đoán.
                </div>
              ) : (
                <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5 py-2">
                  {(selectedTask.logs as any[]).map((log: any, idx: number) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-500 border border-emerald-400 shadow-md shadow-emerald-500/50" />
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-black text-white">{log.action}</span>
                        <span className="text-[8px] text-gray-500 font-mono">
                          {new Date(log.time).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Drawer Button */}
            <button
              onClick={() => setSelectedTask(null)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer text-center select-none"
            >
              Đóng lại
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
