'use client';

import React, { useState, useEffect } from 'react';
import { Download, Link2, RefreshCw, CheckCircle2, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { createQuickDownloadAction } from '@/lib/db/hero-coccoc-actions';
import { useRouter } from 'next/navigation';

interface Task {
  id: number;
  videoUrl: string;
  videoTitle: string | null;
  status: string;
  fileSize: number | null;
  error: string | null;
  createdAt: Date;
}

interface QuickDownloadClientProps {
  teamId: number;
  userId: number;
  recentTasks: Task[];
}

export default function QuickDownloadClient({
  teamId,
  userId,
  recentTasks,
}: QuickDownloadClientProps) {
  const router = useRouter();
  const [linksText, setLinksText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-refresh tasks state every 5 seconds to track progress
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linksText.trim()) {
      showToast('Vui lòng nhập ít nhất một link video', 'error');
      return;
    }

    const urls = linksText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '');

    if (urls.length === 0) {
      showToast('Không có link nào hợp lệ', 'error');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const url of urls) {
      try {
        const result = await createQuickDownloadAction({
          teamId,
          userId,
          videoUrl: url,
        });

        if (result.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (successCount > 0) {
      showToast(`Đã thêm thành công ${successCount} tác vụ tải nhanh!`, 'success');
      setLinksText('');
      router.refresh();
    }
    if (failCount > 0) {
      showToast(`Có ${failCount} link gặp lỗi khi thêm vào hàng đợi.`, 'error');
    }
    setSubmitting(false);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-white animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-400" />
            Tải nhanh Video
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Dán trực tiếp các link video để Worker Cốc Cốc tải xuống ngay lập tức (độ ưu tiên cao nhất).
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer"
          title="Tải lại bảng tiến độ"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Input */}
        <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4 h-fit">
          <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 select-none">
            <Link2 className="h-4 w-4" />
            Nhập danh sách Links
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Nhập các liên kết video (mỗi link 1 dòng) *</label>
              <textarea
                rows={8}
                required
                placeholder="Dán link TikTok, Douyin, YouTube tại đây..."
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 transition-all select-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Bắt đầu tải nhanh
                </>
              )}
            </button>
          </form>
        </div>

        {/* Progress Queue */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 select-none">
            <Activity className="h-4 w-4 animate-pulse" />
            Hàng đợi tải nhanh gần đây
          </h3>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            {recentTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-16 space-y-2">
                <Download className="h-10 w-10 mx-auto text-gray-600" />
                <p className="text-xs font-medium">Chưa có liên kết tải nhanh nào.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 bg-white/[0.01] select-none">
                      <th className="p-3.5 font-black">Video</th>
                      <th className="p-3.5 font-black">Dung lượng</th>
                      <th className="p-3.5 font-black">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/[0.005] transition-colors">
                        <td className="p-3.5 max-w-xs md:max-w-sm">
                          <p className="font-extrabold text-white truncate">
                            {task.videoTitle || 'Đang chờ Worker nhận...'}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5" title={task.videoUrl}>
                            {task.videoUrl}
                          </p>
                          {task.error && (
                            <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-1 font-medium">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Lỗi: {task.error}
                            </p>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-gray-300">
                          {formatSize(task.fileSize)}
                        </td>
                        <td className="p-3.5 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-black uppercase text-[9px] ${
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
