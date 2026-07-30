'use client';

import React from 'react';
import {
  Video,
  Loader2,
  ExternalLink,
  RefreshCw,
  Folder,
  Edit,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { getStatusBadge, getPlatformLabel } from '../_shared/dub-ui-helpers';

interface DubTaskTableProps {
  tasks: any[];
  loading: boolean;
  taskPage: number;
  setTaskPage: (_page: number) => void;
  taskTotalCount: number;
  tasksPerPage: number;
  refreshData: (showLoading?: boolean, page?: number) => void;
  handleRetryTask: (_taskId: number) => void;
  handleDeleteTask: (_taskId: number) => void;
  handleEditTask: (_task: any) => void;
  handleOpenLocal: (_path: string, isFolder?: boolean) => void;
  setPreviewVideoUrl: (_url: string | null) => void;
  setPreviewSrtUrl: (_url: string | null) => void;
  teamId: number;
  scanConfigId?: number | null;
}

export default function DubTaskTable({
  tasks,
  loading,
  taskPage,
  setTaskPage,
  taskTotalCount,
  tasksPerPage,
  refreshData,
  handleRetryTask,
  handleDeleteTask,
  handleEditTask,
}: DubTaskTableProps) {
  return (
    <div className="lg:col-span-2 bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
      <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Video className="h-4 w-4 text-orange-400" />
        Hàng đợi tác vụ dịch thuật ({taskTotalCount})
      </h2>

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
            Hãy dán link video Douyin, Bilibili hoặc YouTube ở cột bên trái để bắt đầu tạo tác vụ dịch tự động.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
              {tasks.map((task) => (
                <tr key={task.id} className="text-xs group hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 pr-3 max-w-[240px]">
                    <div className="flex gap-3 items-center">
                      {task.sourceThumbnailUrl ? (
                        <img src={task.sourceThumbnailUrl} alt="" className="w-16 h-10 object-cover rounded-md border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-16 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Video className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-extrabold text-white truncate group-hover:text-amber-400 transition-colors" title={task.sourceTitle || task.taskTitle || task.sourceUrl}>
                          {task.sourceTitle || task.taskTitle || 'Chưa đặt tên tác vụ'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
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
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-1.5">
                      {getStatusBadge(task.status)}
                      {task.status === 'completed' && task.updatedAt && task.createdAt && (
                        <span className="text-[9px] text-gray-500 font-bold">
                          Đã dịch xong trong: {Math.max(1, Math.floor((new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) / 60000))} phút
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
                    <div className="flex items-center gap-2">
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
      {taskTotalCount > tasksPerPage && (
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] text-gray-500 font-bold">
            Trang {taskPage} / {Math.ceil(taskTotalCount / tasksPerPage)} &nbsp;·&nbsp; {taskTotalCount} tác vụ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const newPage = Math.max(1, taskPage - 1);
                setTaskPage(newPage);
                refreshData(true, newPage);
              }}
              disabled={taskPage === 1}
              className="px-3 py-1 rounded-lg text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Trước
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(taskTotalCount / tasksPerPage)) }, (_, i) => {
              const totalPages = Math.ceil(taskTotalCount / tasksPerPage);
              let startPage = Math.max(1, taskPage - 2);
              const endPage = Math.min(totalPages, startPage + 4);
              if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
              const page = startPage + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => {
                    setTaskPage(page);
                    refreshData(true, page);
                  }}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                    page === taskPage
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => {
                const newPage = Math.min(Math.ceil(taskTotalCount / tasksPerPage), taskPage + 1);
                setTaskPage(newPage);
                refreshData(true, newPage);
              }}
              disabled={taskPage === Math.ceil(taskTotalCount / tasksPerPage)}
              className="px-3 py-1 rounded-lg text-[10px] font-black bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
