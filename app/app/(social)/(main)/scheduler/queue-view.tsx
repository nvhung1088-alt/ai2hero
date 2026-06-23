'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Video,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { cancelScheduleAction, retryScheduleAction } from '@/lib/db/social-scheduler-actions';

interface QueueViewProps {
  schedules: any[];
  onRefresh: () => Promise<void>;
  activeTeamId: number;
}

export function QueueView({ schedules, onRefresh, activeTeamId }: QueueViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showToast('Đã làm mới danh sách hàng đợi.', 'success');
    } catch (e) {
      showToast('Lỗi làm mới danh sách.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn huỷ lịch đăng này?')) return;
    setActionLoadingId(id);
    try {
      await cancelScheduleAction(id);
      showToast('Đã huỷ lịch đăng bài.', 'success');
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Lỗi huỷ lịch đăng.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetry = async (id: number) => {
    setActionLoadingId(id);
    try {
      await retryScheduleAction(id);
      showToast('Đã lên lịch thử lại bài đăng.', 'success');
      await onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Lỗi thử lại.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Đã đăng
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <XCircle className="h-3 w-3" /> Thất bại
          </span>
        );
      case 'publishing':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Đang đăng
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Clock className="h-3 w-3" /> Chờ đăng
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
          <Clock className="h-4 w-4 text-pink-500" />
          Hàng đợi bài viết đã lên lịch
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {schedules.length > 0 ? (
          schedules.map(schedule => {
            const scheduledDate = new Date(schedule.scheduledAt);
            const mediaList = Array.isArray(schedule.mediaAttachments)
              ? schedule.mediaAttachments
              : [];
            const platforms = Array.isArray(schedule.targetPlatforms)
              ? schedule.targetPlatforms
              : [];
            
            const isActionLoading = actionLoadingId === schedule.id;

            return (
              <div
                key={schedule.id}
                className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col gap-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/40 font-semibold">
                      Dự kiến: {scheduledDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({scheduledDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                    </span>
                    {schedule.videoFormat === 'reel' && (
                      <span className="text-[9px] bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold px-1.5 py-0.5 rounded">
                        Reels
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(schedule.status)}
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex gap-3 items-start justify-between">
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{schedule.content}</p>
                    
                    {/* Platform channels */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/30 mr-1 uppercase">Kênh:</span>
                      {platforms.map((plat: string) => (
                        <span
                          key={plat}
                          className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 border border-white/10 uppercase tracking-wider text-white/60"
                        >
                          {plat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Attachment previews */}
                  {mediaList.length > 0 && (
                    <div className="flex gap-1.5 shrink-0">
                      {mediaList.slice(0, 3).map((media: any, idx: number) => (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-lg border border-white/5 overflow-hidden relative bg-black flex items-center justify-center"
                        >
                          {media.type.includes('video') ? (
                            <>
                              <video src={media.url} className="w-full h-full object-cover" preload="metadata" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Video className="h-3.5 w-3.5 text-white" />
                              </div>
                            </>
                          ) : (
                            <img src={media.url} alt="Media preview" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                      {mediaList.length > 3 && (
                        <div className="w-12 h-12 rounded-lg border border-white/5 bg-white/5 flex items-center justify-center text-[10px] text-white/50 shrink-0 font-bold">
                          +{mediaList.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Error handling message */}
                {schedule.status === 'failed' && schedule.errorMessage && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Lỗi: {schedule.errorMessage}</span>
                  </div>
                )}

                {/* Action buttons */}
                {(schedule.status === 'pending' || schedule.status === 'failed') && (
                  <div className="flex justify-end gap-2 border-t border-white/5 pt-2.5 mt-1">
                    {schedule.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(schedule.id)}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-white/50 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Huỷ lịch đăng
                      </button>
                    )}
                    {schedule.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(schedule.id)}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${isActionLoading ? 'animate-spin' : ''}`} /> Thử lại ngay
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-white/30 text-xs">
            Hiện không có lịch đăng bài nào trong hàng đợi.
          </div>
        )}
      </div>
    </div>
  );
}
