'use client';

import { useState, useTransition } from 'react';
import {
  Database,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  Zap,
  Clock,
  ShieldAlert
} from 'lucide-react';
import {
  createSnapshotAction,
  updateSnapshotAction,
  deleteSnapshotAction,
  triggerSnapshotSyncAction
} from '@/lib/db/hero-care-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface Snapshot {
  id: number;
  inboxId: number;
  name: string;
  dataType: string;
  refreshIntervalMinutes: number;
  maxStaleMinutes: number;
  allowStaleFallback: number;
  status: string;
  config: unknown;
  lastRefreshedAt?: string | Date | null;
  createdAt: string | Date;
}

interface Inbox {
  id: number;
  name: string;
  channel: string;
}

interface SnapshotsClientProps {
  teamId: number;
  initialSnapshots: Snapshot[];
  inboxes: Inbox[];
}

export default function SnapshotsClient({ teamId, initialSnapshots, inboxes }: SnapshotsClientProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(initialSnapshots);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<Snapshot | null>(null);

  // Sync Trigger States
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Form State
  const [formInboxId, setFormInboxId] = useState<string>(inboxes.length > 0 ? inboxes[0].id.toString() : '');
  const [formName, setFormName] = useState('');
  const [formDataType, setFormDataType] = useState<'products' | 'orders' | 'customers' | 'faq'>('products');
  const [formInterval, setFormInterval] = useState(15);
  const [formMaxStale, setFormMaxStale] = useState(60);
  const [formStaleFallback, setFormStaleFallback] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'active' | 'paused'>('active');

  const openCreateModal = () => {
    if (inboxes.length === 0) {
      showToast('Vui lòng tạo Inbox trước trong Cấu hình Inbox', 'error');
      return;
    }
    setEditingSnapshot(null);
    setFormInboxId(inboxes[0].id.toString());
    setFormName('');
    setFormDataType('products');
    setFormInterval(15);
    setFormMaxStale(60);
    setFormStaleFallback(1);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (snapshot: Snapshot) => {
    setEditingSnapshot(snapshot);
    setFormInboxId(snapshot.inboxId.toString());
    setFormName(snapshot.name);
    setFormDataType(snapshot.dataType as any);
    setFormInterval(snapshot.refreshIntervalMinutes);
    setFormMaxStale(snapshot.maxStaleMinutes);
    setFormStaleFallback(snapshot.allowStaleFallback);
    setFormStatus(snapshot.status as 'active' | 'paused');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formInboxId) {
      showToast('Vui lòng điền đầy đủ tên Snapshot và chọn Inbox', 'error');
      return;
    }

    if (formInterval < 3) {
      showToast('⚠️ Chu kỳ đồng bộ < 3 phút có thể làm nặng server!', 'info');
    }

    const payload = {
      inboxId: parseInt(formInboxId, 10),
      name: formName,
      dataType: formDataType,
      refreshIntervalMinutes: formInterval,
      maxStaleMinutes: formMaxStale,
      allowStaleFallback: formStaleFallback,
      status: formStatus,
      config: {}
    };

    startTransition(async () => {
      if (editingSnapshot) {
        // Update Action
        const res = await updateSnapshotAction(teamId, editingSnapshot.id, payload);
        if (res.success && res.data) {
          setSnapshots(prev => prev.map(s => (s.id === editingSnapshot.id ? (res.data as Snapshot) : s)));
          showToast('Đã cập nhật Snapshot config thành công', 'success');
          setIsModalOpen(false);
        } else {
          showToast(res.error || 'Lỗi khi cập nhật cấu hình', 'error');
        }
      } else {
        // Create Action
        const res = await createSnapshotAction(teamId, payload);
        if (res.success && res.data) {
          setSnapshots(prev => [res.data as Snapshot, ...prev]);
          showToast('Đã tạo Snapshot config mới thành công', 'success');
          setIsModalOpen(false);
        } else {
          showToast(res.error || 'Lỗi khi tạo cấu hình', 'error');
        }
      }
    });
  };

  const handleDelete = async (snapshotId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình Snapshot này?')) return;
    startTransition(async () => {
      const res = await deleteSnapshotAction(teamId, snapshotId);
      if (res.success) {
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
        showToast('Đã xóa cấu hình Snapshot thành công', 'success');
      } else {
        showToast(res.error || 'Lỗi khi xóa cấu hình', 'error');
      }
    });
  };

  const handleToggleStatus = async (snapshot: Snapshot) => {
    const newStatus = snapshot.status === 'active' ? 'paused' : 'active';
    const res = await updateSnapshotAction(teamId, snapshot.id, { status: newStatus });
    if (res.success && res.data) {
      setSnapshots(prev => prev.map(s => (s.id === snapshot.id ? (res.data as Snapshot) : s)));
      showToast(
        newStatus === 'active' ? 'Đã kích hoạt đồng bộ' : 'Đã tạm dừng đồng bộ',
        'info'
      );
    } else {
      showToast(res.error || 'Lỗi khi thay đổi trạng thái', 'error');
    }
  };

  const handleTriggerSync = async (snapshotId: number) => {
    setSyncingId(snapshotId);
    showToast('Đang trigger đồng bộ dữ liệu snapshot từ API nguồn...', 'info');
    
    try {
      const res = await triggerSnapshotSyncAction(teamId, snapshotId);
      if (res.success) {
        setSnapshots(prev =>
          prev.map(s => {
            if (s.id === snapshotId) {
              return {
                ...s,
                lastRefreshedAt: new Date().toISOString()
              };
            }
            return s;
          })
        );
        showToast(`Đồng bộ thành công! Đã làm mới ${res.itemCount} items (cập nhật ${res.upsertedCount}).`, 'success');
      } else {
        showToast(res.error || 'Đồng bộ thất bại', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi kết nối khi đồng bộ', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.dataType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            <Database className="h-6 w-6 text-purple-400" />
            Đồng bộ Snapshots
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {filteredSnapshots.length} nguồn cache
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Đồng bộ dữ liệu bảng giá, tồn kho sản phẩm hoặc thông tin khách hàng từ KiotViet/Pancake POS làm Snapshot. AI sẽ dựa vào đây để tra cứu thông tin thực tế trả lời cho khách.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/15 cursor-pointer self-start sm:self-auto transition-all"
        >
          <Plus className="h-4 w-4" />
          Cấu hình Snapshot mới
        </button>
      </div>

      {/* Filter Search */}
      <div className="bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm animate-fade-up backdrop-blur-md">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Tìm theo tên snapshot, loại dữ liệu..."
            className="w-full pl-9 bg-gray-900/50 border border-white/5 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 text-xs py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Snapshots Table / List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cấu hình</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Loại dữ liệu</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Inbox liên kết</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Chu kỳ / Hết hạn</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Đồng bộ cuối</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/5">
              {filteredSnapshots.map(snap => {
                const matchedInbox = inboxes.find(ib => ib.id === snap.inboxId);
                const isActive = snap.status === 'active';
                const isSyncing = syncingId === snap.id;

                return (
                  <tr
                    key={snap.id}
                    className={`hover:bg-white/5 transition-colors ${
                      !isActive ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-white">{snap.name}</p>
                          <p className="text-[9px] text-gray-500 font-semibold mt-0.5">ID: #{snap.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Data Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                        {snap.dataType}
                      </span>
                    </td>

                    {/* Inbox Link */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-300 font-semibold">
                        {matchedInbox ? matchedInbox.name : 'Unknown Inbox'}
                      </span>
                    </td>

                    {/* Interval / Stale limits */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-300 font-medium flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 text-cyan-400" />
                          Mỗi {snap.refreshIntervalMinutes} phút
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Hết hạn: {snap.maxStaleMinutes} phút
                        </p>
                      </div>
                    </td>

                    {/* Last Sync */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-semibold">
                      {snap.lastRefreshedAt ? (
                        new Date(snap.lastRefreshedAt).toLocaleString([], {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-amber-500/80 font-bold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          Chờ đồng bộ
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex justify-end gap-2">
                        {/* Force Sync button */}
                        <button
                          onClick={() => handleTriggerSync(snap.id)}
                          disabled={isSyncing || !isActive}
                          className={`p-1.5 rounded-lg border font-bold transition-all ${
                            isSyncing
                              ? 'bg-purple-600/20 text-purple-400 border-purple-500/20 cursor-wait'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 disabled:opacity-30'
                          }`}
                          title="Đồng bộ ngay lập tức"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(snap)}
                          className={`p-1.5 rounded-lg border font-bold transition-all ${
                            isActive
                              ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                          }`}
                          title={isActive ? 'Tạm dừng đồng bộ' : 'Kích hoạt đồng bộ'}
                        >
                          {isActive ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                        
                        <button
                          onClick={() => openEditModal(snap)}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(snap.id)}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSnapshots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-purple-500 mb-3" />
                      <p className="text-sm font-bold text-gray-300">Không tìm thấy cấu hình snapshot nào</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng bấm nút "Cấu hình Snapshot mới" để cài đặt đồng bộ đầu tiên.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                {editingSnapshot ? 'Cập nhật cấu hình Snapshot' : 'Cấu hình Snapshot mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Inbox select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Liên kết với Inbox nguồn
                </label>
                <select
                  value={formInboxId}
                  onChange={(e) => setFormInboxId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {inboxes.map(ib => (
                    <option key={ib.id} value={ib.id} className="bg-gray-900 text-white">{ib.name} ({ib.channel})</option>
                  ))}
                </select>
              </div>

              {/* Snapshot Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Tên Snapshot nguồn
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tồn kho sản phẩm bán sỉ"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder:text-gray-600 font-semibold"
                />
              </div>

              {/* Data Type selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Loại dữ liệu đồng bộ
                </label>
                <select
                  value={formDataType}
                  onChange={(e) => setFormDataType(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="products" className="bg-gray-900 text-white">Sản phẩm (Mô tả, danh mục)</option>
                  <option value="orders" className="bg-gray-900 text-white">Đơn hàng (Trạng thái, chi tiết đơn)</option>
                  <option value="customers" className="bg-gray-900 text-white">Khách hàng (Tên, SĐT, tags)</option>
                  <option value="faq" className="bg-gray-900 text-white">Chính sách FAQ / Hướng dẫn</option>
                </select>
              </div>

              {/* Intervals limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Chu kỳ tự động refresh (phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formInterval}
                    onChange={(e) => setFormInterval(parseInt(e.target.value) || 15)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                  />
                  <span className="text-[10px] text-gray-500">Đặt chu kỳ quét API cập nhật dữ liệu.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Hết hạn tối đa (maxStaleMinutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={formMaxStale}
                    onChange={(e) => setFormMaxStale(parseInt(e.target.value) || 60)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                  />
                  <span className="text-[10px] text-gray-500">Data cũ quá số phút này sẽ bị coi là quá hạn.</span>
                </div>
              </div>

              {/* Allow stale fallback */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Cơ chế bảo vệ khi dữ liệu quá hạn (Stale Fallback)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="staleFallback"
                      checked={formStaleFallback === 1}
                      onChange={() => setFormStaleFallback(1)}
                      className="accent-purple-500"
                    />
                    Vẫn dùng + Kèm tag cảnh báo ⚠️
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="staleFallback"
                      checked={formStaleFallback === 0}
                      onChange={() => setFormStaleFallback(0)}
                      className="accent-purple-500"
                    />
                    Từ chối trả lời, handoff nhân viên 👤
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Trạng thái cấu hình
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="accent-purple-500"
                    />
                    Kích hoạt hoạt động
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'paused'}
                      onChange={() => setFormStatus('paused')}
                      className="accent-purple-500"
                    />
                    Tạm dừng hoạt động
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md shadow-purple-600/10 flex items-center gap-1.5"
              >
                {isPending ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
