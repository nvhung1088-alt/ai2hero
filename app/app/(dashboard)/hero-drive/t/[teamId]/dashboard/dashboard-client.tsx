'use client';

import { useState, useEffect } from 'react';
import {
  FolderOpen,
  FolderPlus,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  FileVideo,
  FileImage,
  FileText,
  File,
  Pause,
  Play,
  Clock,
  Timer,
  CheckCircle2,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import {
  createDriveFolderMappingAction,
  deleteDriveFolderMappingAction,
  toggleDriveFolderMappingAction,
  getFolderMappingHistoryAction,
} from '@/lib/db/hero-drive-actions';
import MappingSidebar from './mapping-sidebar';

interface DashboardProps {
  user: any;
  team: any;
  initialMappings: any[];
  googleDriveConnections: any[];
}

export default function DriveDashboardClient({
  user,
  team,
  initialMappings,
  googleDriveConnections,
}: DashboardProps) {
  const [mappings, setMappings] = useState<any[]>(initialMappings);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(
    initialMappings.length > 0 ? initialMappings[0].id : null
  );

  const [mappingContents, setMappingContents] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // Modals
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [newMappingName, setNewMappingName] = useState<string>('');
  const [newLocalPath, setNewLocalPath] = useState<string>('');
  const [newConnectionId, setNewConnectionId] = useState<string>(
    googleDriveConnections.length > 0 ? String(googleDriveConnections[0].id) : ''
  );
  const [newTargetFolderId, setNewTargetFolderId] = useState<string>('');
  const [newTargetFolderName, setNewTargetFolderName] = useState<string>('');
  const [newDeleteAfterUpload, setNewDeleteAfterUpload] = useState<boolean>(false);
  const [newScanInterval, setNewScanInterval] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Files for selectedMappingId
  const fetchMappingFiles = async (mappingId: number) => {
    setIsLoadingFiles(true);
    const res = await getFolderMappingHistoryAction(mappingId);
    if (res.success && res.data) {
      setMappingContents(res.data);
    }
    setIsLoadingFiles(false);
  };

  useEffect(() => {
    if (selectedMappingId) {
      fetchMappingFiles(selectedMappingId);
    } else {
      setMappingContents([]);
    }
  }, [selectedMappingId]);

  // Create Mapping
  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMappingName || !newLocalPath) return;

    // Default dummy projectId for compatibility
    const defaultProjectId = 1;

    setIsSubmitting(true);
    const res = await createDriveFolderMappingAction({
      projectId: defaultProjectId,
      name: newMappingName,
      localFolderPath: newLocalPath,
      connectionId: newConnectionId ? parseInt(newConnectionId) : null,
      targetFolderId: newTargetFolderId || null,
      targetFolderName: newTargetFolderName || null,
      deleteAfterUpload: newDeleteAfterUpload,
      scanInterval: newScanInterval,
    });

    if (res.success && res.data) {
      const nextMappings = [res.data, ...mappings];
      setMappings(nextMappings);
      setSelectedMappingId(res.data.id);
      setIsMappingModalOpen(false);
      setNewMappingName('');
      setNewLocalPath('');
      setNewTargetFolderId('');
      setNewTargetFolderName('');
    }
    setIsSubmitting(false);
  };

  const handleToggleMapping = async (id: number, currentActive: boolean) => {
    const defaultProjectId = 1;
    const res = await toggleDriveFolderMappingAction(id, defaultProjectId, !currentActive);
    if (res.success) {
      setMappings(
        mappings.map((m) =>
          m.id === id
            ? { ...m, isActive: !currentActive, status: !currentActive ? 'idle' : 'paused' }
            : m
        )
      );
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa thư mục quét này?')) return;
    const defaultProjectId = 1;
    const res = await deleteDriveFolderMappingAction(id, defaultProjectId);
    if (res.success) {
      const nextMappings = mappings.filter((m) => m.id !== id);
      setMappings(nextMappings);
      if (selectedMappingId === id) {
        setSelectedMappingId(nextMappings.length > 0 ? nextMappings[0].id : null);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy link trực tiếp thành công!');
  };

  const activeMapping = mappings.find((m) => m.id === selectedMappingId);
  const activeConn = googleDriveConnections.find((c) => c.id === activeMapping?.connectionId);
  const activeEmail = activeConn?.credentials?.accountEmail || activeConn?.credentials?.email || activeConn?.name;

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

  const formatLastScanTime = (dateStr?: string) => {
    if (!dateStr) return 'Chưa quét lần nào';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Folder Mappings */}
      <MappingSidebar
        mappings={mappings}
        selectedMappingId={selectedMappingId}
        onSelectMapping={(id) => setSelectedMappingId(id)}
        onCreateMappingClick={() => setIsMappingModalOpen(true)}
        onDeleteMapping={handleDeleteMapping}
        onToggleMapping={handleToggleMapping}
        googleDriveConnections={googleDriveConnections}
      />

      {/* Main View: Files & Details of Selected Folder Mapping */}
      <div className="flex-1 p-6 space-y-6">
        {activeMapping ? (
          <div className="space-y-6">
            {/* Header Selected Mapping */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-400" />
                    {activeMapping.name}
                  </h1>
                  <span
                    className={`px-2 py-0.5 text-xs rounded border font-medium ${
                      activeMapping.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {activeMapping.isActive ? 'Đang chạy quét' : 'Đã tạm dừng'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                  <span>💻 Máy tính: <strong className="text-slate-200">{activeMapping.localFolderPath}</strong></span>
                  <span>☁️ Drive Target: <strong className="text-blue-400">{activeMapping.targetFolderName || activeMapping.targetFolderId || 'Root'}</strong></span>
                  <span>🔑 Tài khoản: <strong className="text-slate-200">{activeEmail ? `✉️ ${activeEmail}` : 'Mặc định'}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleMapping(activeMapping.id, activeMapping.isActive)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                    activeMapping.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {activeMapping.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-emerald-400" /> Tạm dừng quét
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Tiếp tục quét
                    </>
                  )}
                </button>

                <button
                  onClick={() => selectedMappingId && fetchMappingFiles(selectedMappingId)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
              </div>
            </div>

            {/* Config Meta Bar */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Cập nhật gần nhất: <strong className="text-slate-200">{formatLastScanTime(activeMapping.lastScanAt)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Timer className="w-4 h-4" />
                  Chu kỳ quét: <strong className="text-amber-300">{activeMapping.scanInterval || 10} giây/lần</strong>
                </span>
              </div>

              {activeMapping.deleteAfterUpload && (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-medium text-[11px]">
                  ✓ Tự động xóa file máy tính sau khi up
                </span>
              )}
            </div>

            {/* List Files in selected Folder Mapping */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Danh sách File & Bài đăng trong Thư mục này
              </h2>

              {isLoadingFiles ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Đang tải danh sách file...
                </div>
              ) : mappingContents.length === 0 ? (
                <div className="p-8 border border-slate-800/80 rounded-xl bg-slate-900/20 text-center text-xs text-slate-500">
                  Chưa có file nào được quét trong thư mục này. Bật Python Worker để bắt đầu upload.
                </div>
              ) : (
                <div className="space-y-3">
                  {mappingContents.map((content) => (
                    <div
                      key={content.id}
                      className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-200">{content.baseName}</h4>
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({content.uploadedFiles}/{content.totalFiles} files)
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded border font-medium ${
                            content.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {content.status === 'completed' ? 'Hoàn tất' : 'Đang xử lý'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {content.files && content.files.length > 0 ? (
                          content.files.map((file: any) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                {getFileIcon(file.fileType)}
                                <div>
                                  <p className="font-medium text-slate-200">{file.fileName}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • Status:{' '}
                                    <span className="text-slate-400">{file.status}</span>
                                  </p>
                                </div>
                              </div>

                              {file.streamLink && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => copyToClipboard(file.streamLink)}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded text-[11px] font-medium transition-colors"
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
                          <p className="text-[11px] text-slate-500 text-center py-1">
                            Chưa có file chi tiết.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
            <FolderOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-400">Hãy chọn 1 Thư mục Quét bên trái</p>
            <p className="text-xs text-slate-500 mt-1">
              Hoặc bấm nút "+ Mới" ở Sidebar để thêm Thư mục Quét máy tính & Drive.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Create Folder Mapping */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">Thêm Thư Mục Quét (Mapping)</h3>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMapping} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tên nhãn thư mục quét:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thư mục Video Tập 1-50"
                  value={newMappingName}
                  onChange={(e) => setNewMappingName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Đường dẫn thư mục máy tính:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: C:\HeroDrive\Phim1"
                  value={newLocalPath}
                  onChange={(e) => setNewLocalPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tài khoản Google Drive đảm nhận:</label>
                {googleDriveConnections.length > 0 ? (
                  <select
                    value={newConnectionId}
                    onChange={(e) => setNewConnectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {googleDriveConnections.map((conn) => {
                      const creds = conn.credentials || {};
                      const email = creds.accountEmail || creds.email || creds.userEmail;
                      const label = email
                        ? `✉️ ${email} (${conn.name || `Drive #${conn.id}`})`
                        : (conn.name || conn.connectionName || `Tài khoản Drive #${conn.id}`);
                      return (
                        <option key={conn.id} value={conn.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                    Chưa có kết nối Drive. Vào Cài đặt ➔ Connect Hub để tạo tài khoản trước.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">
                  Target Folder ID trên Drive (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="VD: 1-xeC7Mqq_15_zE9o-BJ4hUW_WDMfpS6D..."
                  value={newTargetFolderId}
                  onChange={(e) => setNewTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Chu kỳ quét (Thời gian giãn cách):</label>
                <select
                  value={newScanInterval}
                  onChange={(e) => setNewScanInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10 giây / lần (Nhanh)</option>
                  <option value={30}>30 giây / lần</option>
                  <option value={60}>1 phút / lần</option>
                  <option value={300}>5 phút / lần</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={newDeleteAfterUpload}
                    onChange={(e) => setNewDeleteAfterUpload(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">
                      Tự động xóa file máy tính sau khi up xong
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || googleDriveConnections.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Thư Mục Quét'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
