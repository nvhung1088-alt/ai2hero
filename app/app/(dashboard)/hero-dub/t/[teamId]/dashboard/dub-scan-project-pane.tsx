'use client';

import React, { useState } from 'react';
import { 
  FolderOpen, 
  Play, 
  Pause,
  Edit, 
  Trash2, 
  RotateCcw, 
  Clock, 
  Sparkles, 
  Languages, 
  Mic, 
  Subtitles, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DubTaskTable from './dub-task-table';
import { retryTasksByScanConfigAction } from '@/lib/db/hero-dub-actions';

interface DubScanProjectPaneProps {
  config: any;
  teamId: number;
  tasks: any[];
  loading: boolean;
  taskPage: number;
  setTaskPage: (page: number) => void;
  taskTotalCount: number;
  tasksPerPage: number;
  refreshData: (showLoading?: boolean, page?: number) => void;
  handleRetryTask: (taskId: number) => void;
  handleDeleteTask: (taskId: number) => void;
  handleEditTask: (task: any) => void;
  handlePauseTask?: (taskId: number) => void;
  handleResumeTask?: (taskId: number) => void;
  handlePauseAll?: () => void;
  handleResumeAll?: () => void;
  handleOpenLocal: (path: string, isFolder?: boolean) => void;
  setPreviewVideoUrl: (url: string | null) => void;
  setPreviewSrtUrl: (url: string | null) => void;
  onEdit: (config: any) => void;
  onDelete: (id: number) => void;
  onTriggerScan: (id: number) => void;
  onToggleActive?: (config: any) => void;
  onRefreshTasks?: () => void;
}

export function DubScanProjectPane({
  config,
  teamId,
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
  handlePauseTask,
  handleResumeTask,
  handlePauseAll,
  handleResumeAll,
  handleOpenLocal,
  setPreviewVideoUrl,
  setPreviewSrtUrl,
  onEdit,
  onDelete,
  onTriggerScan,
  onToggleActive,
  onRefreshTasks,
}: DubScanProjectPaneProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetryAllFailed = async () => {
    if (!config?.id) return;
    setRetrying(true);
    try {
      const res = await retryTasksByScanConfigAction(config.id, teamId);
      if (res?.success) {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(`Đã khôi phục ${res.retriedCount} tác vụ lỗi về trạng thái chờ!`, 'success');
        }
        if (onRefreshTasks) onRefreshTasks();
      } else {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(res?.error || 'Lỗi thử lại tác vụ', 'error');
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi thử lại tác vụ:', err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Header Info & Configuration Card */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-md relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-orange-400 border border-orange-500/30 shadow-inner">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">{config.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  config.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {config.isActive ? 'Đang hoạt động' : 'Đang tạm dừng'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>Thư mục gốc: <strong className="text-amber-300">{config.folderPath}</strong></span>
              </p>
            </div>
          </div>

          {/* Top Control Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onTriggerScan(config.id)}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs h-8 px-3 rounded-lg shadow flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Quét ngay</span>
            </Button>

            {onToggleActive && (
              <Button
                onClick={() => onToggleActive(config)}
                variant="outline"
                size="sm"
                className={`font-medium text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 ${
                  config.isActive 
                    ? 'border-amber-500/30 hover:bg-amber-500/10 text-amber-300' 
                    : 'border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300'
                }`}
                title={config.isActive ? 'Tạm dừng quét tự động' : 'Bật lại quét tự động'}
              >
                {config.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{config.isActive ? 'Tạm dừng quét' : 'Kích hoạt quét'}</span>
              </Button>
            )}

            <Button
              onClick={handleRetryAllFailed}
              disabled={retrying}
              variant="outline"
              size="sm"
              className="border-amber-500/30 hover:bg-amber-500/10 text-amber-300 font-medium text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
            >
              {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Thử lại tất cả lỗi</span>
            </Button>
            <Button
              onClick={() => onEdit(config)}
              variant="outline"
              size="sm"
              className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs h-8 px-2.5 rounded-lg"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => onDelete(config.id)}
              variant="outline"
              size="sm"
              className="border-red-900/40 hover:bg-red-500/20 text-red-400 text-xs h-8 px-2.5 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Configurations detail grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-medium mb-1">
              <Languages className="w-3.5 h-3.5 text-orange-400" />
              <span>Ngôn ngữ</span>
            </div>
            <p className="text-xs font-bold text-zinc-200">
              {config.sourceLang?.toUpperCase()} &rarr; {config.targetLang?.toUpperCase()}
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-medium mb-1">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Độ máy ASR</span>
            </div>
            <p className="text-xs font-bold text-zinc-200 truncate">{config.asrEngine || 'faster-whisper'}</p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-medium mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Lồng tiếng (TTS)</span>
            </div>
            <p className="text-xs font-bold text-zinc-200 truncate">
              {config.ttsEnabled ? (config.ttsVoice || 'Bật') : 'Tắt'}
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Chu kỳ quét</span>
            </div>
            <p className="text-xs font-bold text-zinc-200">{config.intervalMinutes || 60} phút / lần</p>
          </div>
        </div>

        {config.outputFolder && (
          <div className="text-[11px] text-zinc-400 bg-zinc-900/40 border border-zinc-800/40 p-2 rounded-lg flex items-center justify-between font-mono mt-1">
            <span className="truncate">Thư mục xuất thành phẩm: <strong className="text-zinc-200">{config.outputFolder}</strong></span>
            <span className="text-[10px] text-zinc-500 font-sans font-medium shrink-0 ml-2">
              Đã dịch: <strong className="text-orange-400 font-bold">{config.scannedCount || 0}</strong> video
            </span>
          </div>
        )}
      </div>

      {/* Task Queue Table Filtered by this Scan Config */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/60">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Danh Sách Video Thuộc Dự Án</h3>
            <p className="text-xs text-zinc-400">Tất cả tác vụ dịch tự động phát hiện từ thư mục nguồn của dự án này</p>
          </div>
        </div>

        <DubTaskTable
          tasks={tasks}
          loading={loading}
          taskPage={taskPage}
          setTaskPage={setTaskPage}
          taskTotalCount={taskTotalCount}
          tasksPerPage={tasksPerPage}
          refreshData={refreshData}
          handleRetryTask={handleRetryTask}
          handleDeleteTask={handleDeleteTask}
          handleEditTask={handleEditTask}
          handlePauseTask={handlePauseTask}
          handleResumeTask={handleResumeTask}
          handlePauseAll={handlePauseAll}
          handleResumeAll={handleResumeAll}
          handleOpenLocal={handleOpenLocal}
          setPreviewVideoUrl={setPreviewVideoUrl}
          setPreviewSrtUrl={setPreviewSrtUrl}
          teamId={teamId}
          scanConfigId={config?.id}
        />
      </div>
    </div>
  );
}
