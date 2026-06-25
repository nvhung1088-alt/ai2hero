'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDubTasksAction, retryDubTaskAction, deleteDubTaskAction } from '@/lib/db/hero-dub-actions';
import { History, Search, Loader2, Video, CheckCircle2, XCircle, Clock, PlayCircle, Trash2, RotateCcw, ExternalLink, Filter } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface HistoryClientProps {
  teamId: number;
}

const getTaskLogs = (task: any) => {
  if (task.logs && Array.isArray(task.logs) && task.logs.length > 0) {
    return task.logs;
  }
  
  const fallback = [];
  if (task.createdAt) {
    fallback.push({
      time: task.createdAt,
      action: 'create',
      message: '➕ Khởi tạo tác vụ: Khởi tạo thành công.'
    });
  }
  
  if (task.startedAt) {
    fallback.push({
      time: task.startedAt,
      action: 'assigned',
      message: task.workerId 
        ? `💻 Worker nhận việc: Worker #${task.workerId} đã nhận tác vụ xử lý.`
        : '💻 Worker nhận việc: Worker đã nhận tác vụ xử lý.'
    });
  } else if (task.status !== 'pending' && task.createdAt) {
    const startEstimate = new Date(new Date(task.createdAt).getTime() + 5000).toISOString();
    fallback.push({
      time: startEstimate,
      action: 'assigned',
      message: '💻 Worker nhận việc: Worker đã nhận tác vụ xử lý.'
    });
  }
  
  if (task.status === 'completed' && task.createdAt && task.completedAt) {
    const startT = new Date(task.startedAt || task.createdAt).getTime();
    const endT = new Date(task.completedAt).getTime();
    const diff = endT - startT;
    
    if (diff > 15000) {
      fallback.push({
        time: new Date(startT + diff * 0.25).toISOString(),
        action: 'downloading',
        message: '📥 Đang tải video: Worker tải thành công video nguồn.'
      });
      fallback.push({
        time: new Date(startT + diff * 0.5).toISOString(),
        action: 'transcribing',
        message: '🎙️ Nhận dạng Whisper: Nhận dạng giọng nói gốc hoàn tất.'
      });
      fallback.push({
        time: new Date(startT + diff * 0.75).toISOString(),
        action: 'translating',
        message: '🤖 Dịch thuật AI: Dịch phụ đề thành công.'
      });
    }
  }

  if (task.status === 'completed' && task.completedAt) {
    fallback.push({
      time: task.completedAt,
      action: 'completed',
      message: '✅ Hoàn thành: Video đã sẵn sàng phát hoặc tải về.'
    });
  } else if (task.status === 'failed') {
    fallback.push({
      time: task.completedAt || task.updatedAt || task.createdAt,
      action: 'failed',
      message: `❌ Tác vụ thất bại: ${task.error || 'Gặp lỗi trong quá trình xử lý.'}`
    });
  }
  
  return fallback;
};

export default function HistoryClient({ teamId }: HistoryClientProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const fetchTasks = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    try {
      const currentOffset = isLoadMore ? offset + LIMIT : 0;
      const res = await getDubTasksAction(teamId, { limit: LIMIT, offset: currentOffset });
      
      if (res.success && res.tasks) {
        if (isLoadMore) {
          setTasks(prev => {
            const newTasks = res.tasks || [];
            const existingIds = new Set(prev.map(t => t.id));
            const filteredNew = newTasks.filter(t => !existingIds.has(t.id));
            return [...prev, ...filteredNew];
          });
        } else {
          setTasks(res.tasks);
        }
        if (!isLoadMore) {
          setOffset(0);
        } else {
          setOffset(currentOffset);
        }
        setHasMore(res.tasks.length === LIMIT);
      } else {
        showToast(res.error || 'Lỗi tải danh sách tác vụ', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, offset]);

  useEffect(() => {
    fetchTasks();
    
    // Auto refresh every 10 seconds for the first page
    if (offset === 0) {
      const interval = setInterval(() => {
        fetchTasks(false);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [fetchTasks, offset]);

  const handleRetryTask = async (taskId: number) => {
    try {
      const res = await retryDubTaskAction(taskId, teamId);
      if (res.success) {
        showToast('Đã xếp hàng chạy lại tác vụ.', 'success');
        fetchTasks(false);
      } else {
        showToast(res.error || 'Lỗi chạy lại tác vụ.', 'error');
      }
    } catch (err) {
      showToast('Lỗi hệ thống.', 'error');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tác vụ này khỏi lịch sử?')) return;
    try {
      const res = await deleteDubTaskAction(taskId, teamId);
      if (res.success) {
        showToast('Đã xóa tác vụ thành công.', 'success');
        fetchTasks(false);
      } else {
        showToast(res.error || 'Lỗi xóa tác vụ.', 'error');
      }
    } catch (err) {
      showToast('Lỗi hệ thống.', 'error');
    }
  };

  const getStatusBadge = (status: string, progress: number) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><CheckCircle2 className="h-3 w-3" /> Hoàn thành</span>;
      case 'failed': return <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><XCircle className="h-3 w-3" /> Lỗi</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><Clock className="h-3 w-3" /> Đang chờ</span>;
      default: return <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold"><Loader2 className="h-3 w-3 animate-spin" /> Đang xử lý ({progress}%)</span>;
    }
  };

  const getPlatformLabel = (platform: string) => {
    if (!platform) return null;
    if (platform === 'local') return <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-500/20">Local File</span>;
    if (platform === 'youtube') return <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/20">YouTube</span>;
    if (platform === 'douyin') return <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold border border-purple-500/20">Douyin</span>;
    return <span className="text-[9px] bg-gray-500/10 text-gray-400 px-1.5 py-0.5 rounded font-bold border border-gray-500/20 capitalize">{platform}</span>;
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      if (filterStatus === 'processing' && ['completed', 'failed', 'pending'].includes(task.status)) return false;
      if (filterStatus !== 'processing' && task.status !== filterStatus) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = (task.taskTitle || task.sourceTitle || '').toLowerCase();
      const url = (task.sourceUrl || '').toLowerCase();
      if (!title.includes(q) && !url.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <History className="h-6 w-6 text-amber-500" />
            Lịch sử hoạt động
          </h1>
          <p className="text-xs text-gray-400 mt-1">Quản lý và xem lại toàn bộ các video đã được xử lý bởi HeroDub</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm tên video, link..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-gray-900/50 border border-white/10 rounded-xl py-2 pl-8 pr-8 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="processing">Đang xử lý</option>
              <option value="pending">Đang chờ</option>
              <option value="failed">Bị lỗi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/40 border border-white/5 rounded-2xl shadow-sm backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tác vụ</th>
                <th className="py-3 px-4">Cấu hình</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto mb-2" />
                    <span className="text-xs">Đang tải lịch sử...</span>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <History className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <span className="text-xs">Không tìm thấy tác vụ nào</span>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="text-xs group hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-3 items-center max-w-[320px]">
                          {task.sourceThumbnailUrl ? (
                            <img src={task.sourceThumbnailUrl} alt="" className="w-16 h-10 object-cover rounded-md border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-16 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Video className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-white truncate group-hover:text-amber-400 transition-colors" title={task.taskTitle || task.sourceUrl}>
                              {task.taskTitle || task.sourceTitle || 'Tác vụ #' + task.id}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getPlatformLabel(task.sourceUrl.includes(':\\') || task.sourceUrl.startsWith('/') ? 'local' : task.sourcePlatform)}
                              {task.durationSec ? (
                                <span className="text-[9px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-bold">
                                  {Math.floor(task.durationSec / 60)}:{(task.durationSec % 60).toString().padStart(2, '0')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Timeline Logs Inline */}
                        {(() => {
                          const taskLogs = getTaskLogs(task);
                          if (taskLogs.length === 0) return null;
                          return (
                            <div className="pl-3 ml-2 border-l border-white/10 space-y-1.5 max-w-[320px] my-1">
                              {taskLogs.map((log: any, idx: number) => {
                                const isLast = idx === taskLogs.length - 1;
                                const timeStr = log.time 
                                  ? new Date(log.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                  : '--:--:--';
                                return (
                                  <div key={idx} className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${isLast ? 'text-amber-400 font-medium' : 'text-gray-500 opacity-80'}`}>
                                    <span className="font-mono shrink-0">{timeStr}</span>
                                    <span className="text-white/20 shrink-0">|</span>
                                    <span className="break-words">{log.message}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-400">
                          <span className="font-bold text-gray-300 uppercase">{task.sourceLang || 'auto'}</span> → <span className="font-bold text-amber-400 uppercase">{task.targetLang || 'vi'}</span>
                        </span>
                        <span className="text-[9px] text-gray-500 truncate max-w-[150px]">
                          {task.translateEngine === 'connect-hub' && task.llmModel ? task.llmModel.split('|')[1] || task.llmModel : 'Google Translate'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1.5">
                        {getStatusBadge(task.status, task.progress || 0)}
                        {['pending', 'downloading', 'transcribing', 'translating', 'rendering'].includes(task.status) && (
                          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300" style={{ width: `${task.progress || 0}%` }}></div>
                          </div>
                        )}
                        {task.status === 'failed' && task.error && (
                          <span className="text-[9px] text-red-400 truncate max-w-[180px]" title={task.error}>
                            {task.error}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                        <div>
                          <span className="text-gray-500">Tạo lúc:</span> {new Date(task.createdAt).toLocaleString('vi-VN')}
                        </div>
                        {task.completedAt && (
                          <div>
                            <span className="text-gray-500">Hoàn thành:</span> {new Date(task.completedAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.status === 'completed' && task.outputUrl && (
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const cleanUrl = task.outputUrl.replace(/^["']+|["']+$/g, '');
                              try {
                                await fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(cleanUrl)}`);
                                showToast('Đang mở file kết quả...', 'success');
                              } catch (err) {
                                navigator.clipboard.writeText(cleanUrl);
                                showToast('Đã copy đường dẫn (Worker chưa mở API local)', 'info');
                              }
                            }}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Mở thư mục/file kết quả"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </button>
                        )}
                        {task.status === 'failed' && (
                          <button
                            onClick={() => handleRetryTask(task.id)}
                            className="p-1.5 text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Thử lại tác vụ"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tác vụ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Chân trang / Phân trang */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.01]">
          <span className="text-xs text-gray-500">
            Hiển thị <strong className="text-white">{filteredTasks.length}</strong> tác vụ
          </span>
          
          <button 
            onClick={() => fetchTasks(true)}
            disabled={!hasMore || loading}
            className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${
              !hasMore 
                ? 'opacity-50 cursor-not-allowed bg-white/5 text-gray-500' 
                : 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
            }`}
          >
            {loading && offset > 0 ? (
              <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Đang tải...</span>
            ) : hasMore ? (
              'Tải thêm tác vụ cũ'
            ) : (
              'Đã hết dữ liệu'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
