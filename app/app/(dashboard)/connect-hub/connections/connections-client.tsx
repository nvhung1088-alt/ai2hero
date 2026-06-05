'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConnectHubConnection } from '@/lib/db/schema';
import {
  Plug, Search, Plus, Trash2, Edit, AlertCircle, CheckCircle2, X, RefreshCw, Activity, Calendar
} from 'lucide-react';
import {
  getConnectionForEditAction,
  updateConnectionAction,
  testConnectionAction,
  deleteConnectionAction
} from '@/lib/db/connect-hub-actions';
import { toggleReportSourceAction } from '@/lib/db/hero-report-actions';
import { useRouter } from 'next/navigation';

interface ConnectionsClientProps {
  initialConnections: ConnectHubConnection[];
  teamId: number;
}

export default function ConnectionsClient({ initialConnections, teamId }: ConnectionsClientProps) {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectHubConnection[]>(initialConnections);
  const [search, setSearch] = useState('');
  const [togglingSourceId, setTogglingSourceId] = useState<number | null>(null);

  const handleToggleReportSource = async (id: number) => {
    setTogglingSourceId(id);
    setMessage(null);
    try {
      const res = await toggleReportSourceAction(teamId, id);
      if (res.success && res.data) {
        setConnections(connections.map(c => c.id === id ? res.data as any : c));
        setMessage({ type: 'success', text: `Đã cập nhật vai trò nguồn báo cáo thành công.` });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Không thể thay đổi vai trò nguồn báo cáo.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống.' });
    } finally {
      setTogglingSourceId(null);
    }
  };

  // States for Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ConnectHubConnection | null>(null);
  const [isFetchingEdit, setIsFetchingEdit] = useState(false);
  
  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editCredentialsObj, setEditCredentialsObj] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States cho xóa kết nối và thêm trường cấu hình
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const filteredConnections = connections.filter((c) =>
    c.appName.toLowerCase().includes(search.toLowerCase()) ||
    c.connectionName.toLowerCase().includes(search.toLowerCase())
  );

  const getConnectorColor = (slug: string) => {
    switch (slug) {
      case 'custom-http': return 'from-blue-500 to-cyan-500';
      case 'kiotviet': return 'from-green-500 to-emerald-500';
      case 'google-sheets': return 'from-green-600 to-teal-500';
      case 'gmail': return 'from-red-500 to-rose-400';
      case 'telegram': return 'from-sky-400 to-blue-500';
      default: return 'from-purple-500 to-indigo-500';
    }
  };

  const handleOpenEdit = async (conn: ConnectHubConnection) => {
    setMessage(null);
    setSelectedConnection(conn);
    setEditName(conn.connectionName);
    setIsDrawerOpen(true);
    setIsFetchingEdit(true);

    const res = await getConnectionForEditAction(teamId, conn.id);
    setIsFetchingEdit(false);

    if (res.success && res.data) {
      setEditCredentialsObj(res.data.credentials || {});
    } else {
      setMessage({ type: 'error', text: res.error || 'Không thể tải chi tiết kết nối.' });
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedConnection(null);
    setMessage(null);
    setShowAddKeyForm(false);
    setNewKeyName('');
  };

  const handleSaveEdit = async () => {
    if (!selectedConnection) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await updateConnectionAction(teamId, selectedConnection.id, {
        connectionName: editName,
        credentials: editCredentialsObj,
      });

      if (res.success && res.data) {
        setMessage({ type: 'success', text: 'Cập nhật kết nối thành công!' });
        setConnections(connections.map(c => c.id === res.data.id ? res.data : c));
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Cập nhật thất bại.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedConnection) return;
    setIsTesting(true);
    setMessage(null);
    try {
      const res = await testConnectionAction(teamId, selectedConnection.id);
      if (res.success) {
        setMessage({ type: 'success', text: 'Kiểm tra kết nối thành công!' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Kiểm tra kết nối thất bại.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi kiểm tra kết nối.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await deleteConnectionAction(teamId, id);
      if (res.success) {
        setConnections(connections.filter(c => c.id !== id));
        if (selectedConnection?.id === id) {
          handleCloseDrawer();
        }
        setDeleteConfirmId(null);
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error || 'Lỗi khi xóa kết nối.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi hệ thống khi xóa kết nối.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-white relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white flex items-center gap-2">
            <Plug className="h-6 w-6 text-purple-500" /> Quản lý kết nối
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Theo dõi, cập nhật và quản lý các tài khoản API đã liên kết
          </p>
        </div>
        <Link
          href="/connect-hub/apps"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition-all"
        >
          <Plus className="h-4 w-4" /> Kết nối mới
        </Link>
      </div>

      {message && !isDrawerOpen && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border bg-rose-500/10 text-rose-400 border-rose-500/20 animate-fade-in mb-5`}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-rose-400/60 hover:text-rose-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
        <div className="relative mb-5 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            placeholder="Tìm theo tên ứng dụng hoặc kết nối..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredConnections.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-sm font-bold text-gray-400">Không tìm thấy kết nối nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 font-bold border-b border-white/5">
                  <th className="pb-3 px-3">Ứng dụng</th>
                  <th className="pb-3 px-3">Tên kết nối</th>
                  <th className="pb-3 px-3">Trạng thái</th>
                  <th className="pb-3 px-3">Nguồn báo cáo</th>
                  <th className="pb-3 px-3">Thực thi cuối</th>
                  <th className="pb-3 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-3 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${getConnectorColor(conn.appSlug)} shadow-sm text-white shrink-0`}>
                        <Plug className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-gray-200">{conn.appName}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-300">{conn.connectionName}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          conn.status === 'connected'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${conn.status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-rose-400'}`} />
                        {conn.status === 'connected' ? 'Hoạt động' : 'Lỗi'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleReportSource(conn.id)}
                        disabled={togglingSourceId === conn.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                          Array.isArray(conn.usedByModules) && conn.usedByModules.includes('hero-report')
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
                            : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-400'
                        }`}
                      >
                        📊 {Array.isArray(conn.usedByModules) && conn.usedByModules.includes('hero-report') ? 'Đã bật' : 'Bật nguồn'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-medium">
                      {conn.lastUsedAt
                        ? new Date(conn.lastUsedAt).toLocaleString('vi-VN')
                        : 'Chưa sử dụng'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {deleteConfirmId === conn.id ? (
                        <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                          <span className="text-rose-400 text-[10px]">Xóa?</span>
                          <button
                            onClick={() => handleDelete(conn.id)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-[10px] transition-colors font-bold disabled:opacity-50"
                          >
                            {isDeleting ? '...' : 'Có'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] border border-white/10 transition-colors"
                          >
                            Không
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(conn)}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(conn.id);
                              setMessage(null);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Details Drawer */}
      {isDrawerOpen && selectedConnection && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseDrawer} />
          
          <div className="relative w-full max-w-md bg-gray-900 border-l border-white/10 h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gray-900/95 sticky top-0 z-10 backdrop-blur-md">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                Chỉnh sửa kết nối
              </h2>
              <button onClick={handleCloseDrawer} className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex-1 space-y-6">
              {/* Info Blocks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1"><Activity className="h-3 w-3" /> Trạng thái</span>
                  <div className="font-bold text-xs text-white">
                    {selectedConnection.status === 'connected' ? (
                      <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Hoạt động</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Báo lỗi</span>
                    )}
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Khởi tạo</span>
                  <div className="font-bold text-xs text-gray-300">
                    {new Date(selectedConnection.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Tên kết nối</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex justify-between items-center">
                    <span>Thông tin xác thực (Credentials)</span>
                    {isFetchingEdit && <RefreshCw className="h-3 w-3 animate-spin text-purple-500" />}
                  </label>
                  
                  {isFetchingEdit ? (
                    <div className="text-[10px] text-gray-500 italic">Đang tải cấu hình...</div>
                  ) : (
                    <div className="space-y-3 mt-1">
                      {Object.keys(editCredentialsObj).length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic">Chưa có dữ liệu xác thực.</p>
                      ) : (
                        Object.entries(editCredentialsObj).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-gray-400 capitalize">{key}</label>
                              <button 
                                onClick={() => {
                                  const newObj = {...editCredentialsObj};
                                  delete newObj[key];
                                  setEditCredentialsObj(newObj);
                                }}
                                className="text-rose-400/50 hover:text-rose-300 text-[10px]"
                                title="Xóa trường này"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <input
                              type={key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password') ? 'password' : 'text'}
                              value={value}
                              onChange={(e) => setEditCredentialsObj({...editCredentialsObj, [key]: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                            />
                          </div>
                        ))
                      )}
                      {showAddKeyForm ? (
                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-2 mt-1.5 animate-fade-in">
                          <div className="text-[10px] font-bold text-gray-400">Tên trường cấu hình mới (Ví dụ: shopId, apiKey)</div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              placeholder="Nhập tên trường..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg py-1 px-2.5 text-[11px] text-white focus:outline-none focus:border-purple-500/50"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                const trimmed = newKeyName.trim();
                                if (!trimmed) {
                                  setMessage({ type: 'error', text: 'Tên trường không được để trống.' });
                                  return;
                                }
                                const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
                                if (!regex.test(trimmed)) {
                                  setMessage({ type: 'error', text: 'Tên trường không hợp lệ. Chỉ chấp nhận chữ cái, chữ số và dấu gạch dưới, bắt đầu bằng chữ cái hoặc dấu gạch dưới.' });
                                  return;
                                }
                                if (editCredentialsObj[trimmed] !== undefined) {
                                  setMessage({ type: 'error', text: 'Trường này đã tồn tại trong cấu hình.' });
                                  return;
                                }
                                setEditCredentialsObj({ ...editCredentialsObj, [trimmed]: '' });
                                setNewKeyName('');
                                setShowAddKeyForm(false);
                                setMessage(null);
                              }}
                              className="px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded-lg text-[10px] font-bold text-white transition-colors"
                            >
                              Thêm
                            </button>
                            <button
                              onClick={() => {
                                setShowAddKeyForm(false);
                                setNewKeyName('');
                              }}
                              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 border border-white/10 transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setShowAddKeyForm(true);
                            setMessage(null);
                          }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 mt-1 cursor-pointer select-none"
                        >
                          <Plus className="h-3 w-3" /> Thêm trường cấu hình
                        </button>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 leading-relaxed pt-2">
                    Dữ liệu được mã hóa an toàn bằng AES-256-GCM.
                  </p>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {message.text}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/5 bg-gray-900/95 sticky bottom-0 z-10 flex items-center justify-between gap-3">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || isFetchingEdit}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Đang test...' : 'Kiểm tra API'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || isFetchingEdit}
                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md shadow-purple-500/20"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
