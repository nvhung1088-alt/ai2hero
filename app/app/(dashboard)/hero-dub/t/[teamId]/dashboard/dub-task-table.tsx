'use client';

import React, { useState } from 'react';
import {
  Video,
  Loader2,
  ExternalLink,
  RefreshCw,
  Folder,
  Edit,
  RotateCcw,
  Trash2,
  Pause,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Laptop,
  Copy
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { getStatusBadge, getPlatformLabel } from '../_shared/dub-ui-helpers';

interface DubTaskTableProps {
  tasks: any[];
  workers?: any[];
  loading: boolean;
  taskPage: number;
  setTaskPage: (_page: number) => void;
  taskTotalCount: number;
  taskStats?: { total: number; processing: number; pending: number; completed: number; failed: number };
  taskFilter?: string;
  setTaskFilter?: (_filter: string) => void;
  tasksPerPage: number;
  setTasksPerPage?: (_perPage: number) => void;
  refreshData: (showLoading?: boolean, page?: number, filter?: string, perPage?: number) => void;
  handleRetryTask: (_taskId: number) => void;
  handleDeleteTask: (_taskId: number) => void;
  handleEditTask: (_task: any) => void;
  handlePauseTask?: (_taskId: number) => void;
  handleResumeTask?: (_taskId: number) => void;
  handlePauseAll?: () => void;
  handleResumeAll?: () => void;
  handleClearUnassigned?: () => void;
  handleOpenLocal: (_path: string, isFolder?: boolean) => void;
  setPreviewVideoUrl: (_url: string | null) => void;
  setPreviewSrtUrl: (_url: string | null) => void;
  teamId: number;
  scanConfigId?: number | null;
}

export default function DubTaskTable({
  tasks,
  workers = [],
  loading,
  taskPage,
  setTaskPage,
  taskTotalCount,
  taskStats,
  taskFilter: propTaskFilter,
  setTaskFilter: propSetTaskFilter,
  tasksPerPage,
  setTasksPerPage,
  refreshData,
  handleRetryTask,
  handleDeleteTask,
  handleEditTask,
  handlePauseTask,
  handleResumeTask,
  handlePauseAll,
  handleResumeAll,
  handleClearUnassigned,
  handleOpenLocal,
  setPreviewVideoUrl,
  setPreviewSrtUrl,
  teamId,
  scanConfigId,
}: DubTaskTableProps) {
  const [localTaskFilter, setLocalTaskFilter] = useState<string>('all');
  const taskFilter = propTaskFilter !== undefined ? propTaskFilter : localTaskFilter;
  const setTaskFilter = propSetTaskFilter || setLocalTaskFilter;

  const isProcessingStatus = (status: string) => ['processing', 'downloading', 'dubbing', 'rendering', 'assigned', 'transcribing', 'translating', 'tts', 'burning', 'uploading', 'running', 'active'].includes(status);
  const isCompletedStatus = (status: string) => ['completed', 'done', 'finished', 'success'].includes(status);
  const isFailedStatus = (status: string) => ['failed', 'error', 'cancelled', 'paused'].includes(status);
  const isPendingStatus = (status: string) => ['pending', 'queued', 'created', 'ready'].includes(status) || (!isProcessingStatus(status) && !isCompletedStatus(status) && !isFailedStatus(status));

  const displayTotalCount = taskStats?.total ?? taskTotalCount ?? tasks.length;
  const processingCount = taskStats?.processing ?? tasks.filter((t) => isProcessingStatus(t.status)).length;
  const pendingCount = taskStats?.pending ?? tasks.filter((t) => isPendingStatus(t.status)).length;
  const completedCount = taskStats?.completed ?? tasks.filter((t) => isCompletedStatus(t.status)).length;
  const failedCount = taskStats?.failed ?? tasks.filter((t) => isFailedStatus(t.status)).length;

  const activeWorkerCount = workers.filter(
    (w) => w.status === 'online' && w.lastSeenAt && (Date.now() - new Date(w.lastSeenAt).getTime()) / 60000 <= 2
  ).length;

  const statusPriority = (status: string) => {
    if (isProcessingStatus(status)) return 1;
    if (isPendingStatus(status)) return 2;
    if (isCompletedStatus(status)) return 3;
    if (isFailedStatus(status)) return 4;
    return 5;
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'processing') return isProcessingStatus(t.status);
    if (taskFilter === 'pending') return isPendingStatus(t.status);
    if (taskFilter === 'completed') return isCompletedStatus(t.status);
    if (taskFilter === 'failed') return isFailedStatus(t.status);
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const pA = statusPriority(a.status);
    const pB = statusPriority(b.status);
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Video className="h-4 w-4 text-orange-400" />
          Hàng đợi tác vụ dịch thuật ({taskTotalCount})
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {handlePauseAll && tasks.length > 0 && (
            <button
              type="button"
              onClick={handlePauseAll}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Pause className="h-3 w-3" /> Ngừng dịch
            </button>
          )}
          {handleResumeAll && tasks.length > 0 && (
            <button
              type="button"
              onClick={handleResumeAll}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Play className="h-3 w-3" /> Dịch tiếp
            </button>
          )}
          {handleClearUnassigned && tasks.length > 0 && (
            <button
              type="button"
              onClick={handleClearUnassigned}
              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Trash2 className="h-3 w-3" /> Xóa tất cả tác vụ lẻ
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1 pb-2">
        <div className="p-3 bg-[#111622] border border-white/10 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-gray-400 font-medium">Tổng số tác vụ</span>
          <span className="text-lg font-bold text-gray-100 mt-1">{displayTotalCount}</span>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Đang lồng tiếng
          </span>
          <span className="text-lg font-bold text-amber-300 mt-1">{processingCount}</span>
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
          <span className="text-lg font-bold text-blue-300 mt-1">{pendingCount}</span>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
          </span>
          <span className="text-lg font-bold text-emerald-300 mt-1">{completedCount}</span>
        </div>
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Lỗi / Tạm dừng
          </span>
          <span className="text-lg font-bold text-rose-300 mt-1">{failedCount}</span>
        </div>
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
            <Laptop className="w-3 h-3 text-cyan-400" /> Máy xử lý
          </span>
          <span className="text-lg font-bold text-cyan-300 mt-1">
            {activeWorkerCount} <span className="text-[10px] text-gray-500 font-normal">/ {workers.length}</span>
          </span>
        </div>
      </div>

      {/* Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
          <button
            onClick={() => setTaskFilter('all')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              taskFilter === 'all'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 font-bold'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-gray-200'
            }`}
          >
            Tất cả ({taskStats?.total ?? displayTotalCount})
          </button>
          <button
            onClick={() => setTaskFilter('processing')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              taskFilter === 'processing'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-amber-300'
            }`}
          >
            ⏳ Đang lồng tiếng ({taskStats?.processing ?? processingCount})
          </button>
          <button
            onClick={() => setTaskFilter('pending')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              taskFilter === 'pending'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 font-bold'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-blue-300'
            }`}
          >
            ⚡ Chờ xử lý ({taskStats?.pending ?? pendingCount})
          </button>
          <button
            onClick={() => setTaskFilter('completed')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              taskFilter === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-emerald-300'
            }`}
          >
            ✅ Đã hoàn thành ({taskStats?.completed ?? completedCount})
          </button>
          <button
            onClick={() => setTaskFilter('failed')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
              taskFilter === 'failed'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-bold'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-rose-300'
            }`}
          >
            ❌ Lỗi / Tạm dừng ({taskStats?.failed ?? failedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="text-xs font-bold">Đang tải danh sách tác vụ...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 text-center px-4">
          <Video className="h-8 w-8 text-gray-600" />
          <span className="text-xs font-bold text-gray-400">Không có tác vụ dịch thuật nào trong hàng đợi</span>
          <p className="text-[10px] text-gray-500 leading-normal max-w-sm">
            Bấm nút "+ Tạo tác vụ dịch mới" ở góc trên để bắt đầu thêm video dịch tự động.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-wider pb-2">
                <th className="py-2.5">Nguồn & Tiêu đề</th>
                <th className="py-2.5">Bộ máy dịch</th>
                <th className="py-2.5">Trạng thái & Tiến độ</th>
                <th className="py-2.5">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTasks.map((task) => (
                <tr key={task.id} className="text-xs group hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 pr-3 max-w-[320px]">
                    <div className="flex gap-3 items-center">
                      {(() => {
                        let thumbPath = task.sourceThumbnailUrl;
                        const thumbUrl = thumbPath && (thumbPath.startsWith('http') || thumbPath.startsWith('data:')) ? thumbPath : null;
                        return thumbUrl ? (
                          <img 
                            src={thumbUrl} 
                            alt="" 
                            className="w-16 h-10 object-cover rounded-md border border-white/10 shrink-0 bg-black/40" 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4 text-purple-400" />
                          </div>
                        );
                      })()}
                      <div className="flex flex-col gap-1 min-w-0">
                        {(() => {
                          const rawTitle = task.sourceTitle || task.taskTitle || task.sourceUrl || '';
                          const cleanTitle = rawTitle ? rawTitle.split(/[/\\]/).pop() || rawTitle : 'Chưa đặt tên tác vụ';
                          const hasTranslatedTitle = Boolean(task.translatedTitle && task.translatedTitle.trim().length > 0);
                          
                          return (
                            <div className="flex flex-col gap-0.5">
                              {hasTranslatedTitle ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-amber-300 truncate group-hover:text-amber-200 transition-colors text-xs" title={task.translatedTitle}>
                                      ✨ {task.translatedTitle}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        navigator.clipboard.writeText(task.translatedTitle!);
                                        showToast('Đã sao chép Tiêu đề Tiếng Việt!', 'success');
                                      }}
                                      className="text-gray-400 hover:text-amber-300 p-0.5 rounded transition-colors shrink-0"
                                      title="Sao chép Tiêu đề Tiếng Việt"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-gray-500 truncate" title={`Tiêu đề gốc: ${cleanTitle}`}>
                                    Gốc: {cleanTitle}
                                  </span>
                                </>
                              ) : (
                                <span className="font-extrabold text-white truncate group-hover:text-amber-400 transition-colors" title={cleanTitle}>
                                  {cleanTitle}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.videoDescription ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                const packText = `📌 TIÊU ĐỀ:\n${task.translatedTitle || task.sourceTitle || ''}\n\n📝 MÔ TẢ:\n${task.videoDescription || ''}\n\n🏷️ HASHTAGS:\n${task.videoHashtags || ''}`;
                                navigator.clipboard.writeText(packText);
                                showToast('Đã sao chép Trọn bộ Tư liệu Đăng bài (Tiêu đề + Mô tả + Tags)!', 'success');
                              }}
                              className="text-[9px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-colors border border-amber-500/30"
                              title="Sao chép Trọn bộ Tư liệu Đăng bài (Tiêu đề, Mô tả, Hashtags)"
                            >
                              <Copy className="h-2.5 w-2.5" />
                              <span>Copy Bài Đăng</span>
                            </button>
                          ) : null}
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(String(task.id)); showToast('Đã copy ID tác vụ', 'success'); }}
                            className="text-[9px] bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors"
                            title="Copy Task ID"
                          >
                            #{task.id}
                          </button>
                          {getPlatformLabel(task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? 'local' : task.sourcePlatform)}
                          {task.durationSec ? (
                            <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-bold">
                              {Math.floor(task.durationSec / 60)}:{(task.durationSec % 60).toString().padStart(2, '0')}
                            </span>
                          ) : null}
                          {task.sourcePlatform === 'local' || task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault(); e.stopPropagation();
                                const cleanUrl = task.sourceUrl.replace(/^["']+|["']+$/g, '');
                                try {
                                  await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(cleanUrl)}`);
                                  navigator.clipboard.writeText(cleanUrl);
                                  showToast('Đang mở file & Đã copy đường dẫn', 'success');
                                } catch (err) {
                                  navigator.clipboard.writeText(cleanUrl);
                                  showToast('Đã copy đường dẫn (bật Worker để mở tự động)', 'success');
                                }
                              }}
                              className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-1.5 py-0.5 rounded-md truncate max-w-[200px]"
                              title={`Click để mở file: ${task.sourceUrl}`}
                            >
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{task.sourceUrl}</span>
                            </button>
                          ) : (
                            <a
                              href={task.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-gray-500 hover:text-gray-300 font-bold flex items-center gap-0.5"
                            >
                              Link gốc <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-[10px] font-bold text-gray-400">
                    <div className="flex flex-col">
                      <span>ASR: {task.asrEngine?.includes(':') ? task.asrEngine.split(':').map((s: string, i: number) => i === 0 ? s : `(${s})`).join(' ') : task.asrEngine}</span>
                      <span className="text-gray-500">Dịch: {task.translateEngine}</span>
                      {task.workerName && (
                        <span className="text-[9px] text-cyan-400/90 font-extrabold mt-0.5 flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.5 rounded w-fit" title={`Được xử lý bởi: ${task.workerName}`}>
                          🖥️ {task.workerName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1.5">
                      {getStatusBadge(task.status)}
                      {task.status === 'completed' && (
                        <span className="text-[9px] text-gray-500 font-bold">
                          Đã dịch xong trong: {(() => {
                            const start = task.startedAt ? new Date(task.startedAt).getTime() : new Date(task.createdAt).getTime();
                            const end = task.completedAt ? new Date(task.completedAt).getTime() : (task.updatedAt ? new Date(task.updatedAt).getTime() : Date.now());
                            return Math.max(1, Math.floor((end - start) / 60000));
                          })()} phút
                        </span>
                      )}
                      {task.status !== 'completed' && task.status !== 'failed' && (
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      )}
                      {task.status === 'failed' && task.error && (
                        <span className="text-[9px] text-red-400 font-medium max-w-[180px] line-clamp-1" title={task.error}>
                          Lỗi: {task.error}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Button Pause / Resume */}
                      {task.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => handleResumeTask && handleResumeTask(task.id)}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold shadow-sm"
                          title="Click để tiếp tục dịch video này"
                        >
                          <Play className="h-3 w-3 fill-emerald-400" />
                          <span>Tiếp tục</span>
                        </button>
                      ) : (task.status === 'pending' || task.status === 'running' || task.status?.startsWith('processing')) ? (
                        <button
                          type="button"
                          onClick={() => handlePauseTask && handlePauseTask(task.id)}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold shadow-sm"
                          title="Click để tạm dừng dịch video này"
                        >
                          <Pause className="h-3 w-3 fill-amber-400" />
                          <span>Tạm dừng</span>
                        </button>
                      ) : null}

                      {task.status === 'failed' && (
                        <button
                          onClick={() => handleRetryTask(task.id)}
                          className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 hover:text-orange-300 rounded-lg cursor-pointer transition-all"
                          title="Dịch lại"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {task.outputFolder || task.sourcePlatform === 'local' || task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? (
                        <button
                          onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const cleanUrl = task.sourceUrl.replace(/^["']+|["']+$/g, '');
                            let folderPath = task.outputFolder || cleanUrl.substring(0, Math.max(cleanUrl.lastIndexOf('\\'), cleanUrl.lastIndexOf('/')));
                            
                            if (task.resultVideoUrl) {
                              const cleanResultUrl = task.resultVideoUrl.replace(/^["']+|["']+$/g, '');
                              folderPath = cleanResultUrl.substring(0, Math.max(cleanResultUrl.lastIndexOf('\\'), cleanResultUrl.lastIndexOf('/')));
                            }
                            
                            try {
                              await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(folderPath)}`);
                              navigator.clipboard.writeText(folderPath);
                              showToast('Đang mở thư mục & Đã copy đường dẫn', 'success');
                            } catch (err) {
                              navigator.clipboard.writeText(folderPath);
                              showToast('Đã copy đường dẫn thư mục', 'success');
                            }
                          }}
                          className="p-1.5 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500/80 hover:text-amber-400 rounded-lg cursor-pointer transition-all"
                          title="Mở thư mục chứa file"
                        >
                          <Folder className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/25 text-amber-500/80 hover:text-amber-400 rounded-lg cursor-pointer transition-all"
                        title="Sửa cấu hình (Đổi giọng, Âm lượng...)"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRetryTask(task.id)}
                        className="p-1.5 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/25 text-blue-500/80 hover:text-blue-400 rounded-lg cursor-pointer transition-all"
                        title="Chạy lại tác vụ (Không sửa cấu hình)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/25 text-red-500/80 hover:text-red-400 rounded-lg cursor-pointer transition-all"
                        title="Xóa tác vụ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {taskTotalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5 text-xs text-gray-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Hiển thị <strong className="text-gray-200">{(taskPage - 1) * tasksPerPage + 1}</strong> - <strong className="text-gray-200">{Math.min(taskPage * tasksPerPage, taskTotalCount)}</strong> trong tổng số <strong className="text-orange-400 font-bold">{taskTotalCount}</strong> tác vụ
            </span>
            {setTasksPerPage && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-gray-500">Hiển thị:</span>
                <select
                  value={tasksPerPage}
                  onChange={(e) => {
                    const newPerPage = Number(e.target.value);
                    if (setTasksPerPage) setTasksPerPage(newPerPage);
                    setTaskPage(1);
                    refreshData(true, 1, taskFilter, newPerPage);
                  }}
                  className="bg-black/60 border border-white/10 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-500/50 cursor-pointer"
                >
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={100}>100 / trang</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Nút Đầu */}
            <button
              onClick={() => {
                setTaskPage(1);
                refreshData(true, 1, taskFilter, tasksPerPage);
              }}
              disabled={taskPage === 1}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              ⏮ Đầu
            </button>

            {/* Nút Trước */}
            <button
              onClick={() => {
                const newPage = Math.max(1, taskPage - 1);
                setTaskPage(newPage);
                refreshData(true, newPage, taskFilter, tasksPerPage);
              }}
              disabled={taskPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              ◀ Trước
            </button>

            {/* Trang X / Y Badge */}
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs">
              Trang {taskPage} / {Math.max(1, Math.ceil(taskTotalCount / tasksPerPage))}
            </span>

            {/* Nút Sau */}
            <button
              onClick={() => {
                const maxPage = Math.ceil(taskTotalCount / tasksPerPage);
                const newPage = Math.min(maxPage, taskPage + 1);
                setTaskPage(newPage);
                refreshData(true, newPage, taskFilter, tasksPerPage);
              }}
              disabled={taskPage >= Math.ceil(taskTotalCount / tasksPerPage)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              Sau ▶
            </button>

            {/* Nút Cuối */}
            <button
              onClick={() => {
                const maxPage = Math.ceil(taskTotalCount / tasksPerPage);
                setTaskPage(maxPage);
                refreshData(true, maxPage, taskFilter, tasksPerPage);
              }}
              disabled={taskPage >= Math.ceil(taskTotalCount / tasksPerPage)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              Cuối ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
