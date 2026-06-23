'use client';

import { useState } from 'react';
import { Flag, Shield, Trash2 } from 'lucide-react';
import { resolveAdminReportAction } from '@/lib/db/admin-social-actions';
import { useRouter } from 'next/navigation';

type Report = {
  id: number;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
  reporterName: string | null;
  reporterEmail: string | null;
  postId: number | null;
  commentId: number | null;
};

export function SocialReportsClient({
  pending,
  resolved,
  dismissed
}: {
  pending: Report[];
  resolved: Report[];
  dismissed: Report[];
}) {
  const [tab, setTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const router = useRouter();

  const handleAction = async (id: number, action: 'dismiss' | 'delete_post' | 'delete_comment') => {
    if (!confirm('Bạn có chắc chắn thực hiện hành động này?')) return;
    setIsProcessing(id);
    const res = await resolveAdminReportAction(id, action);
    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
    setIsProcessing(null);
  };

  const getReasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      spam: 'Spam',
      harassment: 'Quấy rối',
      hate_speech: 'Kích động thù địch',
      violence: 'Bạo lực',
      other: 'Khác'
    };
    return map[reason] || reason;
  };

  const renderTable = (reports: Report[]) => {
    if (reports.length === 0) {
      return (
        <div className="text-center py-10 border border-white/5 rounded-2xl bg-white/5 text-gray-400">
          Không có dữ liệu báo cáo nào.
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="p-4">Người báo cáo</th>
              <th className="p-4">Nội dung báo cáo</th>
              <th className="p-4">Lý do</th>
              <th className="p-4">Chi tiết</th>
              <th className="p-4">Thời gian</th>
              {tab === 'pending' && <th className="p-4 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-white/5">
                <td className="p-4">
                  <div className="font-semibold text-white/90">{report.reporterName || 'Ẩn danh'}</div>
                  <div className="text-xs text-gray-500">{report.reporterEmail}</div>
                </td>
                <td className="p-4 text-white/80">
                  {report.postId && (
                    <span className="text-xs px-2 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 mr-2">
                      Bài viết #{report.postId}
                    </span>
                  )}
                  {report.commentId && (
                    <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 mr-2">
                      Bình luận #{report.commentId}
                    </span>
                  )}
                </td>
                <td className="p-4 text-white/80 font-medium">
                  {getReasonLabel(report.reason)}
                </td>
                <td className="p-4 text-gray-400 max-w-xs truncate">
                  {report.description || 'Không có mô tả'}
                </td>
                <td className="p-4 text-gray-400">
                  {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                </td>
                {tab === 'pending' && (
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleAction(report.id, 'dismiss')}
                        disabled={isProcessing !== null}
                        className="p-2 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                        title="Bỏ qua báo cáo"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAction(report.id, report.postId ? 'delete_post' : 'delete_comment')}
                        disabled={isProcessing !== null}
                        className="p-2 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 transition-all cursor-pointer"
                        title="Xóa nội dung vi phạm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-pink-500" />
        <h1 className="text-2xl font-bold text-white">Quản lý Báo cáo vi phạm</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 max-w-md">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer text-center ${
            tab === 'pending' ? 'bg-pink-500 text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          Chờ duyệt ({pending.length})
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer text-center ${
            tab === 'resolved' ? 'bg-pink-500 text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          Đã giải quyết ({resolved.length})
        </button>
        <button
          onClick={() => setTab('dismissed')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer text-center ${
            tab === 'dismissed' ? 'bg-pink-500 text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          Đã bỏ qua ({dismissed.length})
        </button>
      </div>

      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
        {tab === 'pending' && renderTable(pending)}
        {tab === 'resolved' && renderTable(resolved)}
        {tab === 'dismissed' && renderTable(dismissed)}
      </div>
    </div>
  );
}