'use client';

import { useState } from 'react';
import { ConnectHubUsageLog } from '@/lib/db/schema';
import {
  Search,
  Plug,
  Globe,
  ShoppingCart,
  FileSpreadsheet,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
  Clock,
  HelpCircle
} from 'lucide-react';

interface LogsClientProps {
  teamId: number;
  logs: ConnectHubUsageLog[];
}

function getConnectorIcon(slug: string, className: string = 'h-4 w-4') {
  switch (slug) {
    case 'custom-http':
      return <Globe className={className} />;
    case 'kiotviet':
      return <ShoppingCart className={className} />;
    case 'google-sheets':
      return <FileSpreadsheet className={className} />;
    case 'gmail':
      return <Mail className={className} />;
    case 'telegram':
      return <Send className={className} />;
    default:
      return <Plug className={className} />;
  }
}

function getConnectorColor(slug: string) {
  switch (slug) {
    case 'custom-http':
      return 'from-blue-500 to-cyan-500';
    case 'kiotviet':
      return 'from-green-500 to-emerald-500';
    case 'google-sheets':
      return 'from-green-600 to-teal-500';
    case 'gmail':
      return 'from-red-500 to-rose-400';
    case 'telegram':
      return 'from-sky-400 to-blue-500';
    default:
      return 'from-purple-500 to-indigo-500';
  }
}

export default function ConnectHubLogsClient({
  teamId,
  logs
}: LogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Lọc logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.actionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.appSlug || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.callerModule || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Tính toán phân trang
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-8 animate-fade-up text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Nhật ký sử dụng (Usage Logs)
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Theo dõi chi tiết các lượt gọi API tự động, thời gian xử lý và lịch sử sự cố
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm log..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset trang về 1 khi search
              }}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-gray-900/40 border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1); // Reset trang về 1 khi lọc
            }}
            className="w-full sm:w-40 rounded-xl border border-white/5 bg-gray-900/40 text-white font-semibold text-xs px-3.5 py-2 focus:border-purple-500 focus:outline-none"
          >
            <option value="all" className="bg-gray-900">Tất cả trạng thái</option>
            <option value="success" className="bg-gray-900">Thành công</option>
            <option value="error" className="bg-gray-900">Gặp sự cố / Lỗi</option>
          </select>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl flex flex-col justify-between min-h-[400px]">
        <div>
          {currentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <span className="text-4xl">📊</span>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-300">Không có nhật ký nào được ghi nhận</p>
                <p className="text-[10px] text-gray-500 font-medium mt-1">Các lượt thực thi API sẽ hiển thị chi tiết tại đây</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 font-bold border-b border-white/5 bg-white/[0.01]">
                    <th className="p-4">Thời gian</th>
                    <th className="p-4">Ứng dụng</th>
                    <th className="p-4">Hành động (Action)</th>
                    <th className="p-4">Module gọi</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Thời gian chạy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="p-4 font-semibold text-gray-400">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${getConnectorColor(log.appSlug || '')} text-white shadow-sm shrink-0`}>
                          {getConnectorIcon(log.appSlug || '')}
                        </div>
                        <span className="font-extrabold text-gray-200 capitalize">
                          {log.appSlug?.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-300">
                        {log.actionName === 'get_request' ? 'GET Request' : log.actionName === 'post_request' ? 'POST Request' : log.actionName || 'Action'}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm capitalize">
                          {log.callerModule}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {log.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm">
                              <CheckCircle2 className="h-3 w-3" /> Thành công
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm relative group/tooltip"
                              title={log.errorMessage || 'Lỗi gọi API không xác định.'}
                            >
                              <AlertCircle className="h-3 w-3 animate-pulse" /> Thất bại
                              {log.errorMessage && (
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 hidden group-hover/tooltip:block bg-gray-950 border border-white/10 rounded-xl p-2.5 text-[9px] text-gray-300 font-medium shadow-2xl leading-relaxed z-50 animate-fade-in text-center break-words">
                                  {log.errorMessage}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-gray-400 inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          {log.durationMs || 0} ms
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Premium Pagination Footer */}
        {totalItems > 0 && (
          <div className="border-t border-white/5 p-4 flex items-center justify-between bg-white/[0.005] select-none text-[11px] font-semibold text-gray-400">
            <p>
              Hiển thị <span className="text-gray-200 font-extrabold">{startIndex + 1} - {endIndex}</span> trên tổng số{' '}
              <span className="text-purple-400 font-extrabold">{totalItems}</span> logs hoạt động
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Chỉ hiển thị trang hiện tại, trang đầu, trang cuối, và cận 1
                  if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? 'bg-purple-500 text-white shadow-md shadow-purple-500/10'
                            : 'border border-white/5 bg-white/[0.01] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === 2 || page === totalPages - 1) {
                    return <span key={page} className="text-gray-600 px-0.5">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
