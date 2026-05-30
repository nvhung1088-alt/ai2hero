'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ShieldAlert, 
  UserX, 
  Calendar, 
  RotateCcw, 
  MessageSquare,
  Clock,
  Check,
  User,
  Info,
  Search,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  resolveSimRiskEvent, 
  dismissSimRiskEvent, 
  restoreSimRiskEvent 
} from '@/lib/db/sim-actions';
import { showToast } from '../sim-ui-helpers';

interface RiskEventJoined {
  id: number;
  assetId: number | null;
  assetName: string | null;
  assetValue: string | null;
  riskType: string;
  riskLevel: string;
  message: string | null;
  resolved: number | null;
  resolvedBy: number | null;
  resolvedByName: string | null;
  resolvedAt: Date | string | null;
  resolveNote: string | null;
  dismissed: number | null;
  dismissedAt: Date | string | null;
  createdAt: Date | string;
}

interface AlertsClientProps {
  teamId: number;
  initialEvents: RiskEventJoined[];
}

export default function AlertsClient({
  teamId,
  initialEvents,
}: AlertsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab State
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'dismissed'>('active');

  // Modal State cho việc Giải Quyết rủi ro
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  // States tìm kiếm, lọc, sắp xếp và phân trang cho Alerts
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'createdAt' | 'riskLevel' | 'assetName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Lọc Loại rủi ro từ tất cả events
  const dynamicRiskTypes = useMemo(() => {
    const set = new Set<string>();
    initialEvents.forEach(e => {
      if (e.riskType) set.add(e.riskType);
    });
    return Array.from(set);
  }, [initialEvents]);

  const resolveModalRef = useRef<HTMLDivElement>(null);

  // Trap Focus, Escape & Click Outside cho Modal Giải quyết rủi ro
  useEffect(() => {
    if (!isResolveModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsResolveModalOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (resolveModalRef.current && !resolveModalRef.current.contains(e.target as Node)) {
        setIsResolveModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResolveModalOpen]);

  // Tự động reset page về 1 khi thay đổi tab hoặc filters/sort
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, severityFilter, typeFilter, sortField, sortOrder]);

  // Phân loại events gốc
  const categorizedEvents = useMemo(() => {
    const active: RiskEventJoined[] = [];
    const resolved: RiskEventJoined[] = [];
    const dismissed: RiskEventJoined[] = [];

    initialEvents.forEach(event => {
      if (event.resolved === 1) {
        resolved.push(event);
      } else if (event.dismissed === 1) {
        dismissed.push(event);
      } else {
        active.push(event);
      }
    });

    return { active, resolved, dismissed };
  }, [initialEvents]);

  const currentEvents = categorizedEvents[activeTab];

  // Pipeline xử lý dữ liệu: Filter -> Sort -> Paginate
  const filteredEvents = useMemo(() => {
    return currentEvents.filter(event => {
      // 1. Search
      const query = search.toLowerCase();
      const matchSearch = 
        (event.riskType && event.riskType.toLowerCase().includes(query)) ||
        (event.assetName && event.assetName.toLowerCase().includes(query)) ||
        (event.assetValue && event.assetValue.includes(query)) ||
        (event.message && event.message.toLowerCase().includes(query));

      // 2. Severity Filter
      const matchSeverity = severityFilter === 'ALL' || event.riskLevel === severityFilter;

      // 3. Type Filter
      const matchType = typeFilter === 'ALL' || event.riskType === typeFilter;

      return matchSearch && matchSeverity && matchType;
    });
  }, [currentEvents, search, severityFilter, typeFilter]);

  const sortedEvents = useMemo(() => {
    const getRiskWeight = (level: string) => {
      switch (level.toLowerCase()) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'watch': return 2;
        default: return 1;
      }
    };

    return [...filteredEvents].sort((a, b) => {
      if (sortField === 'riskLevel') {
        const weightA = getRiskWeight(a.riskLevel);
        const weightB = getRiskWeight(b.riskLevel);
        return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
      }

      if (sortField === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortField === 'assetName') {
        const nameA = (a.assetName || '').toLowerCase();
        const nameB = (b.assetName || '').toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }

      return 0;
    });
  }, [filteredEvents, sortField, sortOrder]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedEvents, currentPage]);

  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage) || 1;

  const [dismissConfirmId, setDismissConfirmId] = useState<number | null>(null);

  // Icon rủi ro tương ứng với loại rủi ro
  const getRiskIcon = (riskType: string) => {
    const type = riskType.toLowerCase();
    if (type.includes('nghỉ việc') || type.includes('nhân sự')) return <UserX className="h-5 w-5 text-red-500" />;
    if (type.includes('chưa kiểm tra') || type.includes('quá hạn')) return <Calendar className="h-5 w-5 text-yellow-500" />;
    if (type.includes('không hợp lệ') || type.includes('sđt')) return <ShieldAlert className="h-5 w-5 text-orange-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  // Màu sắc cấp độ rủi ro
  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'watch':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const getSeverityLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Nguy cấp';
      case 'high': return 'Cao';
      case 'watch': return 'Theo dõi';
      default: return 'Trung bình';
    }
  };

  // Mở modal giải quyết
  const openResolveModal = (id: number) => {
    setSelectedEventId(id);
    setResolveNote('');
    setIsResolveModalOpen(true);
  };

  // Submit giải quyết
  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    startTransition(async () => {
      const res = await resolveSimRiskEvent(teamId, selectedEventId, resolveNote);
      if (res.success) {
        showToast('Đã ghi nhận giải quyết rủi ro thành công', 'success');
        setIsResolveModalOpen(false);
        router.refresh();
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    });
  };

  // Bỏ qua rủi ro
  const handleDismiss = (id: number) => {
    if (dismissConfirmId !== id) {
      setDismissConfirmId(id);
      setTimeout(() => setDismissConfirmId(null), 3000);
      return;
    }
    setDismissConfirmId(null);

    startTransition(async () => {
      const res = await dismissSimRiskEvent(teamId, id);
      if (res.success) {
        showToast('Đã bỏ qua cảnh báo rủi ro', 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    });
  };

  // Khôi phục rủi ro về Active
  const handleRestore = (id: number) => {
    startTransition(async () => {
      const res = await restoreSimRiskEvent(teamId, id);
      if (res.success) {
        showToast('Đã mở lại cảnh báo rủi ro (Chuyển về Cần xử lý)', 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Có lỗi xảy ra', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-white/10 select-none">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 -mb-[2px] transition-all ${
            activeTab === 'active'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Cần xử lý ({categorizedEvents.active.length})
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`px-5 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 -mb-[2px] transition-all ${
            activeTab === 'resolved'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          Đã giải quyết ({categorizedEvents.resolved.length})
        </button>

        <button
          onClick={() => setActiveTab('dismissed')}
          className={`px-5 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 -mb-[2px] transition-all ${
            activeTab === 'dismissed'
              ? 'border-gray-500 text-gray-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <X className="h-4 w-4" />
          Đã bỏ qua ({categorizedEvents.dismissed.length})
        </button>
      </div>

      {/* Search & Filter Tool Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-gray-900/20 p-4 border border-white/5 rounded-2xl">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo loại, thiết bị, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Lọc Cấp độ rủi ro */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Tất cả cấp độ</option>
            <option value="critical">Nguy cấp</option>
            <option value="high">Rủi ro cao</option>
            <option value="watch">Theo dõi</option>
          </select>

          {/* Lọc loại rủi ro (động) */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500 max-w-[150px] truncate"
          >
            <option value="ALL">Tất cả loại lỗi</option>
            {dynamicRiskTypes.map(t => (
              <option key={t} value={t} title={t}>{t}</option>
            ))}
          </select>

          {/* Sắp xếp field */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as 'createdAt' | 'riskLevel' | 'assetName')}
            className="px-3 py-2 text-xs bg-gray-950 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="createdAt">Thời gian phát hiện</option>
            <option value="riskLevel">Mức độ nghiêm trọng</option>
            <option value="assetName">Tên thiết bị SIM</option>
          </select>

          {/* Toggle thứ tự */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-gray-950 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center"
            title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
          >
            {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {currentEvents.length === 0 ? (
          <div className="bg-gray-900/30 border border-white/10 rounded-2xl p-12 text-center text-gray-500 text-xs italic">
            {activeTab === 'active' && '🎉 Tuyệt vời! Không phát hiện cảnh báo rủi ro nào cần xử lý.'}
            {activeTab === 'resolved' && 'Chưa có cảnh báo rủi ro nào được đánh dấu giải quyết.'}
            {activeTab === 'dismissed' && 'Chưa có cảnh báo rủi ro nào được đánh dấu bỏ qua.'}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="bg-gray-900/30 border border-white/10 rounded-2xl p-12 text-center text-gray-500 text-xs italic">
            Không tìm thấy cảnh báo rủi ro nào khớp bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedEvents.map(event => (
                <div 
                  key={event.id}
                  className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/15 transition-all space-y-4 animate-fade-in"
                >
                  {/* Header: Title & Severity */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                        {getRiskIcon(event.riskType)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-white truncate" title={event.riskType}>
                          {event.riskType}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Ảnh hưởng: <strong className="text-gray-300 font-semibold">{event.assetName || 'SIM đã xóa'}</strong> ({event.assetValue || '—'})
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${getSeverityBadge(event.riskLevel)}`}>
                      {getSeverityLabel(event.riskLevel)}
                    </span>
                  </div>

                  {/* Message detail */}
                  <p className="text-xs text-gray-300 leading-relaxed bg-black/10 p-3 rounded-xl border border-white/5">
                    {event.message}
                  </p>

                  {/* Info about timestamp & solver */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-500 pt-1.5 border-t border-white/5 gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Phát hiện: {new Date(event.createdAt).toLocaleString('vi-VN')}
                    </span>

                    {/* Resolved Info */}
                    {event.resolved === 1 && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-emerald-400">
                        <User className="h-3 w-3" />
                        <span>Giải quyết bởi <strong className="font-bold text-white">{event.resolvedByName || 'Hệ thống'}</strong></span>
                      </div>
                    )}

                    {/* Dismissed Info */}
                    {event.dismissed === 1 && (
                      <span className="bg-gray-800 border border-white/5 px-2 py-1 rounded text-gray-400">
                        Đã bỏ qua
                      </span>
                    )}
                  </div>

                  {/* Action details (if active) */}
                  {activeTab === 'active' && (
                    <div className="flex gap-2 pt-2 border-t border-white/5 justify-end">
                      <button
                        disabled={isPending}
                        onClick={() => handleDismiss(event.id)}
                        className={`px-3 py-1.5 text-[11px] font-bold border rounded-xl transition-all disabled:opacity-40 ${
                          dismissConfirmId === event.id 
                            ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' 
                            : 'bg-white/[0.02] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {dismissConfirmId === event.id ? 'Xác nhận bỏ qua?' : 'Bỏ qua'}
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => openResolveModal(event.id)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white hover:opacity-90 flex items-center gap-1 transition-all disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Giải quyết
                      </button>
                    </div>
                  )}

                  {/* Resolved Note (if resolved) */}
                  {event.resolved === 1 && event.resolveNote && (
                    <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-xl text-[11px] text-emerald-400 flex items-start gap-1.5">
                      <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-[10px]">Ghi chú xử lý:</p>
                        <p className="italic leading-normal mt-0.5">{event.resolveNote}</p>
                      </div>
                    </div>
                  )}

                  {/* Action details (if resolved/dismissed) - Restore button */}
                  {activeTab !== 'active' && (
                    <div className="flex pt-2 border-t border-white/5 justify-end">
                      <button
                        disabled={isPending}
                        onClick={() => handleRestore(event.id)}
                        className="px-3 py-1.5 text-[10px] font-bold bg-white/[0.02] border border-white/10 hover:border-white/15 rounded-xl text-gray-300 hover:text-white flex items-center gap-1 transition-all disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Mở lại rủi ro
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-gray-900/50 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-gray-400 select-none">
              <span>Hiển thị {paginatedEvents.length} trên tổng số {sortedEvents.length} cảnh báo</span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1 || isPending}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
                >
                  Trước
                </button>
                <span className="flex items-center px-1 font-bold text-white">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages || isPending}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all font-semibold"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Giải quyết rủi ro */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            ref={resolveModalRef}
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 animate-fade-in space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Giải Quyết Cảnh Báo
              </h3>
              <button 
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-gray-400 flex gap-2">
                  <Info className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p>Mô tả lại phương pháp giải quyết bảo mật (ví dụ: đã đổi mật khẩu, cập nhật lại số backup hoặc bàn giao SIM cho người khác).</p>
                </div>

                <label className="text-gray-400 font-semibold block mt-3">Ghi chú giải quyết *</label>
                <textarea
                  required
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Ví dụ: Đã cập nhật email khôi phục backup cho tài khoản Shopee và chuyển SIM OTP sang bàn giao cho nhân viên kế toán mới."
                  className="w-full px-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 placeholder-gray-600"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending || !resolveNote.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Đang cập nhật...' : 'Xác nhận xử lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
