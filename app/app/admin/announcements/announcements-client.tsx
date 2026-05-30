'use client';

import React, { useState, useTransition } from 'react';
import { Megaphone, Trash2, AlertCircle, Plus, Info, ShieldAlert } from 'lucide-react';
import { createAnnouncementAction, deleteAnnouncementAction } from '../actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  version: string;
  severity: string;
  createdAt: Date;
  creatorName: string | null;
  creatorEmail: string | null;
}

interface AnnouncementsClientProps {
  initialAnnouncements: AnnouncementItem[];
}

export default function AnnouncementsClient({ initialAnnouncements }: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Hỗ trợ phím Escape để đóng modal xóa
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteTarget(null);
      }
    };
    if (deleteTarget !== null) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteTarget]);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [severity, setSeverity] = useState('info');
  const [isTesting, setIsTesting] = useState(false);

  const handleTriggerTestNotifications = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/test-notifications');
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        }
      } else {
        showToast(data.error || 'Lỗi khi chạy thử thông báo.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối khi chạy thử thông báo.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !version.trim()) {
      showToast('Vui lòng điền đầy đủ tất cả các trường dữ liệu!', 'warning');
      return;
    }

    startTransition(async () => {
      const res = await createAnnouncementAction(title, content, version, severity);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(res.message || 'Đã phát hành thông cáo thành công!', 'success');
        
        // Reset form
        setTitle('');
        setContent('');
        setVersion('v1.0.0');
        setSeverity('info');
        
        // Reload dữ liệu cục bộ bằng cách tạo bản ghi ảo tạm thời (hoặc trigger SWR/route refresh)
        // Để UI mượt mà, ta thêm trực tiếp vào state
        const newItem: AnnouncementItem = {
          id: Date.now(), // ID tạm
          title,
          content,
          version,
          severity,
          createdAt: new Date(),
          creatorName: 'Bạn (Admin)',
          creatorEmail: '',
        };
        setAnnouncements([newItem, ...announcements]);
      }
    });
  };

  const executeDelete = async (id: number) => {
    startTransition(async () => {
      const res = await deleteAnnouncementAction(id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(res.message || 'Đã xóa thành công!', 'success');
        setAnnouncements(announcements.filter(a => a.id !== id));
      }
    });
    setDeleteTarget(null);
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm shadow-red-500/5 uppercase tracking-wider shrink-0">
            <ShieldAlert className="h-3 w-3" />
            <span>Nguy cấp</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm shadow-orange-500/5 uppercase tracking-wider shrink-0">
            <AlertCircle className="h-3 w-3" />
            <span>Cảnh báo</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5 uppercase tracking-wider shrink-0">
            <Info className="h-3 w-3" />
            <span>Tính năng</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/10 shrink-0">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              Quản Lý Loa Phát Thanh
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Đăng tải các thông báo cập nhật, cảnh báo bảo trì hoặc tính năng mới toàn hệ thống.
            </p>
          </div>
        </div>

        {/* Developer Action: Trigger Test Bell Notifications */}
        <button
          onClick={handleTriggerTestNotifications}
          disabled={isTesting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shrink-0 border border-purple-500/30"
          title="Chạy thử các Server Actions Notifications Bell tự động phát ra khi có Like/Comment/Giao task"
        >
          <span className="animate-bounce">🔔</span>
          <span>{isTesting ? 'Đang chạy thử...' : '⚡ Chạy thử chuông thông báo'}</span>
        </button>
      </div>

      {/* Main Grid: Form Left, List Right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Biểu mẫu tạo thông báo */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Plus className="h-4 w-4 text-orange-400" />
              <span className="font-extrabold text-sm uppercase tracking-wider">Phát hành Tin Mới</span>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tiêu đề bản cập nhật</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cập nhật hệ thống bảo mật SIM 2.0"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:bg-white/8 focus:border-white/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Phiên bản (Version)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: v2.1.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled={isPending}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:bg-white/8 focus:border-white/20 focus:outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Mức độ nghiêm trọng</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    disabled={isPending}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white focus:border-white/20 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="info">Tính năng mới (Info)</option>
                    <option value="warning">Cảnh báo bảo trì (Warning)</option>
                    <option value="critical">Nguy cấp/Sự cố (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Nội dung chi tiết (Markdown)</label>
                <textarea
                  rows={6}
                  placeholder="Nhập nội dung thay đổi hoặc hướng dẫn. Bạn có thể sử dụng định dạng Markdown cơ bản (dấu gạch đầu dòng, chữ in đậm...)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isPending}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:bg-white/8 focus:border-white/20 focus:outline-none transition-all resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Đang phát hành...' : 'Phát hành ngay'}
              </button>
            </form>
          </div>
        </div>

        {/* Danh sách các thông báo đã đăng */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="font-extrabold text-sm uppercase tracking-wider">Lịch sử thông cáo ({announcements.length})</span>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    <th className="pb-3 pl-2">Phiên bản</th>
                    <th className="pb-3">Cập nhật</th>
                    <th className="pb-3">Mức độ</th>
                    <th className="pb-3">Ngày đăng</th>
                    <th className="pb-3">Người đăng</th>
                    <th className="pb-3 text-right pr-2">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {announcements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                        Chưa có thông báo nào được phát hành trên Loa phát thanh.
                      </td>
                    </tr>
                  ) : (
                    announcements.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 pl-2 font-mono font-bold text-orange-400">
                          {a.version}
                        </td>
                        <td className="py-4 max-w-xs truncate">
                          <p className="font-bold text-white group-hover:text-orange-400 transition-colors">{a.title}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{a.content}</p>
                        </td>
                        <td className="py-4">
                          {getSeverityBadge(a.severity)}
                        </td>
                        <td className="py-4 text-gray-400">
                          {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 text-gray-400">
                          {a.creatorName || 'Admin'}
                        </td>
                        <td className="py-4 text-right pr-2">
                          <button
                            onClick={() => setDeleteTarget(a.id)}
                            disabled={isPending}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50"
                            title="Xóa thông báo"
                            aria-label="Xóa thông báo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Premium Delete Announcement Confirm Modal */}
      {deleteTarget !== null && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onMouseDown={() => setDeleteTarget(null)}
        >
          <div 
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="text-xl">🗑️</span>
              <h3 className="text-base font-extrabold text-white">Xóa bản cập nhật</h3>
            </div>
            
            <p className="text-sm font-semibold text-gray-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa bản cập nhật hệ thống này không? Hành động này sẽ gỡ bỏ thông cáo khỏi Loa phát thanh và không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => executeDelete(deleteTarget)}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
