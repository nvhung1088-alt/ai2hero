'use client';

import { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderPlus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileVideo,
  FileImage,
  FileText,
  File,
  Terminal,
  Settings2,
  Plug,
} from 'lucide-react';
import {
  createDriveScanConfigAction,
  toggleDriveScanConfigAction,
  deleteDriveScanConfigAction,
  getDriveContentsWithFiles,
} from '@/lib/db/hero-drive-actions';
import Link from 'next/link';

interface DashboardProps {
  user: any;
  team: any;
  initialConfigs: any[];
  googleDriveConnections: any[];
}

export default function DriveDashboardClient({
  user,
  team,
  initialConfigs,
  googleDriveConnections,
}: DashboardProps) {
  const [configs, setConfigs] = useState<any[]>(initialConfigs);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(
    initialConfigs.length > 0 ? initialConfigs[0].id : null
  );

  const [contents, setContents] = useState<any[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState<boolean>(false);
  const [expandedContentIds, setExpandedContentIds] = useState<number[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newConfigName, setNewConfigName] = useState<string>('');
  const [newLocalPath, setNewLocalPath] = useState<string>('');
  const [newConnectionId, setNewConnectionId] = useState<string>(
    googleDriveConnections.length > 0 ? String(googleDriveConnections[0].id) : ''
  );
  const [newTargetFolderId, setNewTargetFolderId] = useState<string>('');
  const [newDeleteAfterUpload, setNewDeleteAfterUpload] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tab
  const [activeTab, setActiveTab] = useState<'contents' | 'worker'>('contents');

  // Load contents when selectedConfigId changes
  const fetchContents = async (configId: number) => {
    setIsLoadingContents(true);
    const res = await getDriveContentsWithFiles(configId);
    if (res.success && res.data) {
      setContents(res.data);
    }
    setIsLoadingContents(false);
  };

  useEffect(() => {
    if (selectedConfigId) {
      fetchContents(selectedConfigId);
    } else {
      setContents([]);
    }
  }, [selectedConfigId]);

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfigName || !newLocalPath) return;

    setIsSubmitting(true);
    const res = await createDriveScanConfigAction({
      teamId: team.id,
      userId: user.id,
      name: newConfigName,
      localFolderPath: newLocalPath,
      connectionId: newConnectionId ? parseInt(newConnectionId) : null,
      targetFolderId: newTargetFolderId || null,
      deleteAfterUpload: newDeleteAfterUpload,
    });

    if (res.success && res.data) {
      setConfigs([res.data, ...configs]);
      setSelectedConfigId(res.data.id);
      setIsModalOpen(false);
      setNewConfigName('');
      setNewLocalPath('');
    }
    setIsSubmitting(false);
  };

  const handleToggleConfig = async (id: number, currentActive: boolean) => {
    const res = await toggleDriveScanConfigAction(id, team.id, !currentActive);
    if (res.success) {
      setConfigs(configs.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c)));
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình quét này?')) return;
    const res = await deleteDriveScanConfigAction(id, team.id);
    if (res.success) {
      const nextConfigs = configs.filter((c) => c.id !== id);
      setConfigs(nextConfigs);
      if (selectedConfigId === id) {
        setSelectedConfigId(nextConfigs.length > 0 ? nextConfigs[0].id : null);
      }
    }
  };

  const toggleExpandContent = (id: number) => {
    setExpandedContentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy link trực tiếp thành công!');
  };

  const activeConfig = configs.find((c) => c.id === selectedConfigId);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <FileVideo className="w-4 h-4 text-blue-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-emerald-400" />;
      case 'text':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <HardDrive className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                HeroDrive Manager
              </h1>
              <p className="text-sm text-slate-400">
                Tự động quét thư mục máy tính, tải lên Google Drive & dọn dẹp dung lượng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <FolderPlus className="w-4 h-4" />
            Thêm thư mục quét mới
          </button>
        </div>
      </div>

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Sidebar: Scan Configs */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Thư mục quét ({configs.length})
            </h2>
          </div>

          {configs.length === 0 ? (
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
              <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Chưa có thư mục quét nào</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Tạo cấu hình mới để bắt đầu đồng bộ file tự động
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors"
              >
                + Thêm cấu hình
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {configs.map((config) => {
                const isSelected = config.id === selectedConfigId;
                return (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfigId(config.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-500/5'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-slate-200">{config.name}</h3>
                          {config.deleteAfterUpload && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                              Tự xóa file
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono break-all line-clamp-1">
                          {config.localFolderPath}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleConfig(config.id, config.isActive);
                          }}
                          title={config.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            config.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {config.isActive ? (
                            <Play className="w-3.5 h-3.5 fill-emerald-400" />
                          ) : (
                            <Pause className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConfig(config.id);
                          }}
                          title="Xóa cấu hình"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Contents & Worker Guide */}
        <div className="lg:col-span-8 space-y-4">
          {activeConfig ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-100">{activeConfig.name}</h2>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                        activeConfig.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {activeConfig.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Đường dẫn: {activeConfig.localFolderPath}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setActiveTab('contents')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'contents'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Danh sách Bài đăng ({contents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('worker')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      activeTab === 'worker'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Chạy Python Worker
                  </button>
                </div>
              </div>

              {/* Tab Contents: Content Group List */}
              {activeTab === 'contents' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Các file cùng tên (Video, Ảnh, Txt) sẽ tự động được gom thành 1 bộ Content
                      dưới đây.
                    </p>
                    <button
                      onClick={() => fetchContents(activeConfig.id)}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingContents ? 'animate-spin' : ''}`} />
                      Làm mới
                    </button>
                  </div>

                  {isLoadingContents ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Đang tải danh sách bài đăng...
                    </div>
                  ) : contents.length === 0 ? (
                    <div className="p-8 text-center border border-slate-800/80 rounded-xl bg-slate-950/30">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-400">Chưa có bài đăng nào</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hãy bật Python Worker ở máy tính của bạn để quét file từ thư mục này.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contents.map((content) => {
                        const isExpanded = expandedContentIds.includes(content.id);
                        const isDone = content.status === 'completed';

                        return (
                          <div
                            key={content.id}
                            className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden"
                          >
                            <div
                              onClick={() => toggleExpandContent(content.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <div>
                                  <h4 className="font-semibold text-sm text-slate-200">
                                    {content.baseName}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Đã tải: {content.uploadedFiles} / {content.totalFiles} tệp đính
                                    kèm
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded border font-medium ${
                                    isDone
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {isDone ? 'Đã hoàn tất' : 'Đang xử lý'}
                                </span>
                              </div>
                            </div>

                            {/* Collapsible Files List */}
                            {isExpanded && (
                              <div className="border-t border-slate-800/80 p-4 bg-slate-900/30 space-y-2">
                                {content.files && content.files.length > 0 ? (
                                  content.files.map((file: any) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        {getFileIcon(file.fileType)}
                                        <div>
                                          <p className="font-medium text-slate-300">
                                            {file.fileName}
                                          </p>
                                          <p className="text-[11px] text-slate-500">
                                            {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • Status:{' '}
                                            <span className="text-slate-400">{file.status}</span>
                                          </p>
                                        </div>
                                      </div>

                                      {file.streamLink && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => copyToClipboard(file.streamLink)}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded transition-colors"
                                          >
                                            <Copy className="w-3 h-3" />
                                            Copy Link Stream
                                          </button>
                                          <a
                                            href={file.streamLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1 text-slate-400 hover:text-slate-200"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-500 text-center py-2">
                                    Không có thông tin tệp con.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Worker: Instruction */}
              {activeTab === 'worker' && (
                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      Hướng dẫn khởi động Python Worker trên máy tính
                    </h3>
                    <p>
                      Để hệ thống tự động quét file từ đường dẫn{' '}
                      <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">
                        {activeConfig.localFolderPath}
                      </code>{' '}
                      tải lên Google Drive và xóa file local, bạn làm như sau:
                    </p>

                    <div className="space-y-2 font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-slate-300">
                      <p className="text-slate-500"># 1. Mở PowerShell hoặc Terminal tại máy tính</p>
                      <p className="text-blue-400">
                        python scripts/herodrive_worker.py --config {activeConfig.id}
                      </p>
                    </div>

                    <p className="text-slate-400">
                      *(Script Python sẽ tự động đăng nhập API, quét file, tải trực tiếp lên Google
                      Drive qua OAuth Token và xóa file gốc ở ổ cứng nếu cài đặt).*
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
              <HardDrive className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-400">Hãy chọn 1 thư mục quét bên trái</p>
              <p className="text-xs text-slate-500 mt-1">
                Hoặc bấm nút "Thêm thư mục quét mới" để tạo cấu hình quét máy tính.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Scan Config */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-100">Tạo Cấu Hình Quét Mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConfig} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tên gợi nhớ (Chiến dịch):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quét Phim Bộ Trung Quốc"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">
                  Đường dẫn thư mục trên máy tính:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: C:\Users\ADMIN\Videos\HeroDrive"
                  value={newLocalPath}
                  onChange={(e) => setNewLocalPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tài khoản Google Drive đích:</label>
                {googleDriveConnections.length > 0 ? (
                  <select
                    value={newConnectionId}
                    onChange={(e) => setNewConnectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {googleDriveConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.connectorSlug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                    Chưa có kết nối Google Drive. Hãy vào{' '}
                    <Link href="/connect-hub/dashboard" className="underline font-bold">
                      Connect Hub
                    </Link>{' '}
                    để thêm tài khoản Google Drive trước.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">
                  Target Folder ID trên Drive (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="VD: 1a2b3c4d5e... (để trống nếu muốn dùng mặc định)"
                  value={newTargetFolderId}
                  onChange={(e) => setNewTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Checkbox Tự động xóa file */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={newDeleteAfterUpload}
                    onChange={(e) => setNewDeleteAfterUpload(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">
                      Tự động xóa file trên máy tính sau khi tải lên
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Sau khi file được up 100% thành công lên Google Drive, Python Worker sẽ thực
                      hiện lệnh xóa file gốc trên ổ cứng để dọn dẹp dung lượng.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || googleDriveConnections.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Cấu Hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
