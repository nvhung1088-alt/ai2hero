'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  User, 
  Clock, 
  Smartphone, 
  ShieldAlert, 
  Cpu, 
  Chrome,
  Search,
  Filter
} from 'lucide-react';

interface CheckLogJoined {
  id: number;
  assetId: number;
  assetName: string | null;
  assetValue: string | null;
  checkedByName: string | null;
  checkedAt: Date | string;
  checkType: string | null;
  riskScoreBefore: number | null;
  riskScoreAfter: number | null;
  notes: string | null;
}

interface HistoryClientProps {
  initialLogs: CheckLogJoined[];
}

export default function HistoryClient({
  initialLogs,
}: HistoryClientProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Lọc logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const query = search.toLowerCase().trim();
      const matchSearch = !query || 
        (log.assetName && log.assetName.toLowerCase().includes(query)) ||
        (log.assetValue && log.assetValue.includes(query)) ||
        (log.checkedByName && log.checkedByName.toLowerCase().includes(query)) ||
        (log.notes && log.notes.toLowerCase().includes(query));

      const matchType = typeFilter === 'ALL' || log.checkType === typeFilter;

      return matchSearch && matchType;
    });
  }, [initialLogs, search, typeFilter]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const timeA = new Date(a.checkedAt).getTime();
      const timeB = new Date(b.checkedAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredLogs, sortOrder]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    return sortedLogs.slice(start, start + logsPerPage);
  }, [sortedLogs, currentPage]);

  const totalPages = Math.ceil(sortedLogs.length / logsPerPage) || 1;

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, sortOrder]);

  const getCheckTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'extension':
        return <Chrome className="h-4 w-4 text-sky-400" />;
      case 'api':
        return <Cpu className="h-4 w-4 text-purple-400" />;
      default:
        return <User className="h-4 w-4 text-orange-400" />;
    }
  };

  const getCheckTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'extension': return 'Chrome Extension';
      case 'api': return 'API Tự động';
      default: return 'Thủ công';
    }
  };

  // Icon xu hướng điểm rủi ro
  const getTrendIndicator = (before: number | null, after: number | null) => {
    if (before == null && after == null) {
      return (
        <span className="flex items-center gap-0.5 text-blue-400 font-extrabold text-[10px] bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-lg shrink-0">
          <Activity className="h-3 w-3" />
          Lần đầu kiểm tra
        </span>
      );
    }
    const b = before ?? 0;
    const a = after ?? 0;

    if (a > b) {
      return (
        <span className="flex items-center gap-0.5 text-red-500 font-extrabold text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-lg shrink-0">
          <ArrowUp className="h-3 w-3" />
          +{a - b}đ (Tăng rủi ro)
        </span>
      );
    }
    if (a < b) {
      return (
        <span className="flex items-center gap-0.5 text-emerald-500 font-extrabold text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-lg shrink-0">
          <ArrowDown className="h-3 w-3" />
          {a - b}đ (Giảm rủi ro)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-gray-400 font-extrabold text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-lg shrink-0">
        <ArrowRight className="h-3 w-3" />
        Không đổi ({a}đ)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tool Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo SIM, người kiểm tra, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 hover:text-white flex items-center gap-1 transition-all"
            title="Sắp xếp thời gian"
          >
            <Clock className="h-3.5 w-3.5" />
            {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
          </button>
          
          <Filter className="h-3.5 w-3.5 text-gray-500 hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none"
          >
            <option value="ALL">Mọi loại kiểm tra</option>
            <option value="manual">Thủ công</option>
            <option value="extension">Chrome Extension</option>
            <option value="api">API Tự động</option>
          </select>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
        {paginatedLogs.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs italic">
            Chưa ghi nhận lịch sử kiểm tra nào khớp bộ lọc.
          </div>
        ) : (
          <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
            {paginatedLogs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Bullet point on the timeline border */}
                <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-gray-950 border-2 border-orange-500 flex items-center justify-center group-hover:scale-125 transition-transform">
                  <span className="h-1 w-1 bg-white rounded-full" />
                </span>

                {/* Entry Card */}
                <div className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 p-4 rounded-2xl transition-all space-y-3">
                  {/* Row 1: SIM name & timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Smartphone className="h-4 w-4 text-orange-500" />
                      </span>
                      <div>
                        <strong className="text-white text-xs font-extrabold">{log.assetName || 'SIM đã xóa'}</strong>
                        <span className="text-[10px] text-gray-400 ml-1.5">({log.assetValue || '—'})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Trend badge */}
                      {getTrendIndicator(log.riskScoreBefore, log.riskScoreAfter)}

                      {/* Time */}
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(log.checkedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Note detail */}
                  {log.notes && (
                    <p className="text-xs text-gray-300 leading-normal bg-black/10 p-3 border border-white/5 rounded-xl">
                      {log.notes}
                    </p>
                  )}

                  {/* Row 3: Checker & Check type */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>Người kiểm tra: <strong className="text-gray-300 font-semibold">{log.checkedByName || 'Hệ thống'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded">
                      {getCheckTypeIcon(log.checkType || 'manual')}
                      <span className="text-gray-400 font-medium">{getCheckTypeLabel(log.checkType || 'manual')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination Footer */}
        {sortedLogs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 select-none">
            <span>Hiển thị {paginatedLogs.length} trên tổng số {sortedLogs.length} bản ghi</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1.5 bg-white/[0.02] border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
              >
                Trước
              </button>
              <span className="flex items-center px-1 font-bold text-white">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1.5 bg-white/[0.02] border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
