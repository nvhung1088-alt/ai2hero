'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Info,
  XCircle,
  Search,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AdminLogRecord } from '@/lib/db/admin-queries';

type LogSortField = 'timestamp' | 'action' | 'severity';

interface LogsClientProps {
  initialLogs: AdminLogRecord[];
}

export default function LogsClient({ initialLogs }: LogsClientProps) {
  const [logs] = useState<AdminLogRecord[]>(initialLogs);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [sortField, setSortField] = useState<LogSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15; // Tăng lên 15 cho phù hợp với logs thật

  const handleSort = (field: LogSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Lọc logs
  const filteredLogs = logs.filter(log => {
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSeverity && matchesSearch;
  });

  // Sắp xếp
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'timestamp') return a.timestamp.localeCompare(b.timestamp) * dir;
    if (sortField === 'action') return a.action.localeCompare(b.action) * dir;
    if (sortField === 'severity') {
      const weight = { info: 0, warning: 1, error: 2 };
      return (weight[a.severity] - weight[b.severity]) * dir;
    }
    return 0;
  });

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5 animate-fade-up">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Nhật ký kiểm toán
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {sortedLogs.length} logs
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Lịch sử kiểm toán các sự kiện và thao tác vĩ mô trên toàn hệ thống AI2Hero</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center animate-fade-up animate-delay-1">
        {/* Severity Filters */}
        <div className="inline-flex rounded-xl border border-white/10 bg-gray-900 p-0.5 shadow-sm max-w-sm w-full sm:w-auto backdrop-blur-md">
          <button
            onClick={() => { setSeverityFilter('all'); setCurrentPage(1); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'all'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => { setSeverityFilter('info'); setCurrentPage(1); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'info'
                ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-blue-400'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => { setSeverityFilter('warning'); setCurrentPage(1); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'warning'
                ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                : 'text-gray-500 hover:text-amber-400'
            }`}
          >
            Warning
          </button>
          <button
            onClick={() => { setSeverityFilter('error'); setCurrentPage(1); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              severityFilter === 'error'
                ? 'bg-red-500/20 text-red-400 shadow-sm'
                : 'text-gray-500 hover:text-red-400'
            }`}
          >
            Error
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo hành động, tác nhân, chi tiết..."
            className="pl-9 rounded-xl border-white/10 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 text-xs py-1.5 backdrop-blur-md"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-sm overflow-hidden animate-fade-up animate-delay-2 backdrop-blur-md">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <span className="inline-flex items-center gap-1">
                    Thời gian
                    {sortField === 'timestamp' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('action')}
                >
                  <span className="inline-flex items-center gap-1">
                    Hành động
                    {sortField === 'action' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tác nhân</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Đối tượng</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Chi tiết</th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('severity')}
                >
                  <span className="inline-flex items-center gap-1">
                    Mức độ
                    {sortField === 'severity' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/5 text-xs font-medium">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  let badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  let BadgeIcon = Info;
                  
                  if (log.severity === 'warning') {
                    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    BadgeIcon = AlertTriangle;
                  } else if (log.severity === 'error') {
                    badgeStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                    BadgeIcon = XCircle;
                  }

                  const formattedTime = new Date(log.timestamp).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-semibold">{formattedTime}</td>
                      
                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white font-bold tracking-wider">{log.action}</span>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300 font-bold">{log.actorName}</div>
                        <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{log.actorEmail}</div>
                      </td>

                      {/* Target */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400 font-semibold">{log.targetTeam}</span>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4 text-gray-300 font-semibold break-words max-w-[280px]">{log.details}</td>

                      {/* Severity Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
                          <BadgeIcon className="h-3 w-3 shrink-0" />
                          {log.severity.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-orange-500 mb-3" />
                      <p className="text-sm font-bold text-gray-300">Không tìm thấy nhật ký kiểm toán phù hợp</p>
                      <p className="text-xs text-gray-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm khác</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {sortedLogs.length > 0 && (
          <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-400">
              Hiển thị <span className="font-bold text-gray-200">{startIndex + 1}–{Math.min(endIndex, sortedLogs.length)}</span> trên <span className="font-bold text-gray-200">{sortedLogs.length}</span> kết quả
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-all duration-150 ${
                    page === currentPage 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/10' 
                      : 'border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
