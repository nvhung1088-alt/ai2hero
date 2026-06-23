'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Trash2, Loader2, MessageSquare, Calendar, User } from 'lucide-react';
import { useParams as useNextParams } from 'next/navigation';
import { getFilmReportsAction, resolveFilmReportAction } from '@/lib/db/film-actions';

export default function CreatorFilmReportsPage() {
  const params = useNextParams();
  const teamId = params?.teamId ? parseInt(params.teamId as string, 10) : 0;
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // State modal xử lý
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionStatus, setActionStatus] = useState('resolved'); // resolved | dismissed
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await getFilmReportsAction(teamId, filterStatus);
      if (res.success && res.reports) {
        setReports(res.reports);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [teamId, filterStatus]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !teamId) return;

    setSubmitting(true);
    try {
      const res = await resolveFilmReportAction(
        selectedReport.id,
        teamId,
        adminNote.trim(),
        actionStatus
      );

      if (res.success) {
        // Cập nhật local state
        setReports(prev => 
          prev.map(r => r.id === selectedReport.id ? { ...r, status: actionStatus, adminNote, resolvedAt: new Date() } : r)
        );
        setSelectedReport(null);
        setAdminNote('');
      } else {
        alert(res.error || 'Lỗi xử lý báo cáo');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'broken_video':
        return 'Hỏng Video';
      case 'wrong_content':
        return 'Sai tập/phim';
      case 'copyright':
        return 'Bản quyền';
      default:
        return 'Lỗi khác';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Báo Cáo Lỗi Phim
          </h2>
          <p className="text-xs text-gray-400 mt-1">Quản lý phản hồi và sự cố từ khán giả xem film</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tổng báo cáo</p>
            <p className="text-xl font-black text-white">{stats.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Đang chờ xử lý</p>
            <p className="text-xl font-black text-amber-400">{stats.pending}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Đã khắc phục</p>
            <p className="text-xl font-black text-emerald-400">{stats.resolved}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Đã bỏ qua</p>
            <p className="text-xl font-black text-white">{stats.dismissed}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        {['all', 'pending', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition cursor-pointer ${
              filterStatus === status
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ xử lý' : status === 'resolved' ? 'Đã sửa' : 'Bỏ qua'}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          <span className="text-xs">Đang tải danh sách lỗi...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-2xl">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Tuyệt vời! Không có báo cáo lỗi nào</p>
          <p className="text-xs text-gray-400 mt-1">Film của bạn hiện đang chạy ổn định</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-gray-900/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-bold uppercase tracking-wider">
                <th className="p-4">Ngày báo</th>
                <th className="p-4">Phim / Tập</th>
                <th className="p-4">Loại lỗi</th>
                <th className="p-4">Mô tả sự cố</th>
                <th className="p-4">Người báo</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.01] transition-all">
                  <td className="p-4 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-600" />
                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-extrabold text-white">{report.seriesTitle}</p>
                    <p className="text-[10px] text-pink-400 font-bold">Tập số {report.episodeNumber || 'N/A'}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                      report.reason === 'broken_video'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {getReasonLabel(report.reason)}
                    </span>
                  </td>
                  <td className="p-4 max-w-xs truncate text-gray-300" title={report.description}>
                    {report.description || <span className="text-gray-500 italic">Không có mô tả</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-600" />
                      <div>
                        <p className="font-bold text-white">{report.reporterName}</p>
                        <p className="text-[10px] text-gray-500">{report.reporterEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                      report.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        : report.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-white/5 text-gray-400 border-white/10'
                    }`}>
                      {report.status === 'pending' ? 'Chờ sửa' : report.status === 'resolved' ? 'Đã sửa' : 'Đã bỏ qua'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setAdminNote(report.adminNote || '');
                        setActionStatus(report.status === 'pending' ? 'resolved' : report.status);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition cursor-pointer active:scale-95 select-none"
                    >
                      Xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 border border-white/10 p-1.5 rounded-full transition active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <AlertTriangle className="h-5 w-5 text-pink-400" />
              <h3 className="font-extrabold text-sm text-white">Xử lý báo cáo lỗi</h3>
            </div>

            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-xs space-y-2 mb-4">
              <p className="text-gray-400"><strong className="text-white">Phim:</strong> {selectedReport.seriesTitle}</p>
              <p className="text-gray-400"><strong className="text-white">Tập:</strong> {selectedReport.episodeNumber}</p>
              <p className="text-gray-400"><strong className="text-white">Loại lỗi:</strong> {getReasonLabel(selectedReport.reason)}</p>
              <p className="text-gray-300 bg-black/30 p-2.5 rounded-lg border border-white/5 max-h-24 overflow-y-auto italic">
                "{selectedReport.description || 'Không có mô tả chi tiết.'}"
              </p>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Quyết định xử lý</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActionStatus('resolved')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                      actionStatus === 'resolved'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Đã khắc phục
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionStatus('dismissed')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                      actionStatus === 'dismissed'
                        ? 'bg-white/10 border-white/10 text-white'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Bỏ qua báo lỗi
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Ghi chú phản hồi / Hành động đã làm</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú lại hành động xử lý lỗi (Ví dụ: Đã update lại file MP4 mới...)"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-xs font-bold bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:text-white transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-black bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-xl shadow-lg active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      Đang lưu...
                    </>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon X fallback
function X({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
