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
  Zap,
  Edit3,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Filter,
} from 'lucide-react';
import {
  createDriveFolderMappingAction,
  updateDriveFolderMappingAction,
  deleteDriveFolderMappingAction,
  toggleDriveFolderMappingAction,
  triggerImmediateScanAction,
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

  const [rawFilesList, setRawFilesList] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [fileFilter, setFileFilter] = useState<string>('all'); // 'all' | 'completed' | 'uploading' | 'pending'

  // Modals
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [editingMapping, setEditingMapping] = useState<any | null>(null);

  const [mappingName, setMappingName] = useState<string>('');
  const [localPath, setLocalPath] = useState<string>('');
  const [connectionId, setConnectionId] = useState<string>(
    googleDriveConnections.length > 0 ? String(googleDriveConnections[0].id) : ''
  );
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [targetFolderName, setTargetFolderName] = useState<string>('');
  const [deleteAfterUpload, setDeleteAfterUpload] = useState<boolean>(false);
  const [scanInterval, setScanInterval] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Files for selectedMappingId
  const fetchMappingFiles = async (mappingId: number) => {
    setIsLoadingFiles(true);
    const res = await getFolderMappingHistoryAction(mappingId);
    if (res.success && res.data) {
      // Flatten all files from contents
      const allFiles: any[] = [];
      res.data.forEach((content: any) => {
        if (content.files && content.files.length > 0) {
          content.files.forEach((f: any) => {
            allFiles.push({
              ...f,
              baseName: content.baseName,
              contentStatus: content.status,
            });
          });
        }
      });
      setRawFilesList(allFiles);
    }
    setIsLoadingFiles(false);
  };

  useEffect(() => {
    if (selectedMappingId) {
      fetchMappingFiles(selectedMappingId);
    } else {
      setRawFilesList([]);
    }
  }, [selectedMappingId]);

  // Open Modal Create
  const handleOpenCreateModal = () => {
    setEditingMapping(null);
    setMappingName('');
    setLocalPath('');
    setTargetFolderId('');
    setTargetFolderName('');
    setDeleteAfterUpload(false);
    setScanInterval(10);
    setIsMappingModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (mapping: any) => {
    setEditingMapping(mapping);
    setMappingName(mapping.name);
    setLocalPath(mapping.localFolderPath);
    setConnectionId(mapping.connectionId ? String(mapping.connectionId) : '');
    setTargetFolderId(mapping.targetFolderId || '');
    setTargetFolderName(mapping.targetFolderName || '');
    setDeleteAfterUpload(mapping.deleteAfterUpload);
    setScanInterval(mapping.scanInterval || 10);
    setIsMappingModalOpen(true);
  };

  // Submit Modal (Create or Edit)
  const handleSubmitMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingName || !localPath) return;

    setIsSubmitting(true);
    if (editingMapping) {
      // Edit mode
      const res = await updateDriveFolderMappingAction(editingMapping.id, {
        name: mappingName,
        localFolderPath: localPath,
        connectionId: connectionId ? parseInt(connectionId) : null,
        targetFolderId: targetFolderId || null,
        targetFolderName: targetFolderName || null,
        deleteAfterUpload,
        scanInterval,
      });

      if (res.success && res.data) {
        setMappings(mappings.map((m) => (m.id === editingMapping.id ? res.data : m)));
        setIsMappingModalOpen(false);
      }
    } else {
      // Create mode
      const defaultProjectId = 1;
      const res = await createDriveFolderMappingAction({
        projectId: defaultProjectId,
        name: mappingName,
        localFolderPath: localPath,
        connectionId: connectionId ? parseInt(connectionId) : null,
        targetFolderId: targetFolderId || null,
        targetFolderName: targetFolderName || null,
        deleteAfterUpload,
        scanInterval,
      });

      if (res.success && res.data) {
        const nextMappings = [res.data, ...mappings];
        setMappings(nextMappings);
        setSelectedMappingId(res.data.id);
        setIsMappingModalOpen(false);
      }
    }
    setIsSubmitting(false);
  };

  // Trigger Immediate Scan
  const handleTriggerScanNow = async (mappingId: number) => {
    const res = await triggerImmediateScanAction(mappingId);
    if (res.success && res.data) {
      setMappings(mappings.map((m) => (m.id === mappingId ? res.data : m)));
      fetchMappingFiles(mappingId);
      alert('⚡ Đã kích hoạt lệnh Quét Ngay! Python Worker dưới máy tính sẽ tiếp nhận và tiến hành upload.');
    }
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

  const filteredFiles = rawFilesList.filter((f) => {
    if (fileFilter === 'all') return true;
    if (fileFilter === 'completed') return f.status === 'completed';
    if (fileFilter === 'uploading') return f.status === 'uploading';
    if (fileFilter === 'pending') return f.status === 'pending';
    return true;
  });

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

  const formatIntervalText = (sec: number) => {
    if (sec < 60) return `${sec} giây / lần`;
    if (sec < 3600) return `${Math.floor(sec / 60)} phút / lần`;
    return `${Math.floor(sec / 3600)} giờ / lần`;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Folder Mappings */}
      <MappingSidebar
        mappings={mappings}
        selectedMappingId={selectedMappingId}
        onSelectMapping={(id) => setSelectedMappingId(id)}
        onCreateMappingClick={handleOpenCreateModal}
        onDeleteMapping={handleDeleteMapping}
        onToggleMapping={handleToggleMapping}
        googleDriveConnections={googleDriveConnections}
      />

      {/* Main View: File Table & Detailed Folder Settings */}
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

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Nút Quét Ngay */}
                <button
                  onClick={() => handleTriggerScanNow(activeMapping.id)}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/5"
                  title="Kích hoạt quét upload ngay lập tức"
                >
                  <Zap className="w-4 h-4 fill-amber-400" /> Quét Ngay
                </button>

                {/* Nút Sửa */}
                <button
                  onClick={() => handleOpenEditModal(activeMapping)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>

                {/* Nút Play/Pause */}
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
                      <Pause className="w-3.5 h-3.5 fill-emerald-400" /> Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Tiếp tục
                    </>
                  )}
                </button>

                {/* Nút Làm mới */}
                <button
                  onClick={() => selectedMappingId && fetchMappingFiles(selectedMappingId)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Config Meta Bar */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Cập nhật lần cuối: <strong className="text-slate-200">{formatLastScanTime(activeMapping.lastScanAt)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Timer className="w-4 h-4" />
                  Chu kỳ quét: <strong className="text-amber-300">{formatIntervalText(activeMapping.scanInterval || 10)}</strong>
                </span>
              </div>

              {activeMapping.deleteAfterUpload && (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-medium text-[11px]">
                  ✓ Tự động xóa file máy tính sau khi up
                </span>
              )}
            </div>

            {/* File Table Header & Filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  Danh sách File trong Thư mục Quét ({filteredFiles.length})
                </h2>

                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <button
                    onClick={() => setFileFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border font-medium ${
                      fileFilter === 'all'
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Tất cả ({rawFilesList.length})
                  </button>
                  <button
                    onClick={() => setFileFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg border font-medium ${
                      fileFilter === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Đã upload ({rawFilesList.filter((f) => f.status === 'completed').length})
                  </button>
                  <button
                    onClick={() => setFileFilter('uploading')}
                    className={`px-2.5 py-1 rounded-lg border font-medium ${
                      fileFilter === 'uploading'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Đang upload ({rawFilesList.filter((f) => f.status === 'uploading').length})
                  </button>
                </div>
              </div>

              {isLoadingFiles ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Đang kiểm tra dữ liệu file...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-8 border border-slate-800/80 rounded-xl bg-slate-900/20 text-center text-xs space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-medium">Chưa phát hiện file nào trong thư mục máy tính này.</p>
                  <p className="text-slate-500 max-w-md mx-auto text-[11px]">
                    Hãy đảm bảo bạn đã mở Python Worker dưới máy tính (lệnh: <code>python scripts/herodrive_worker.py</code>) và đặt file vào đường dẫn <code>{activeMapping.localFolderPath}</code>.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold text-[11px]">
                          <th className="py-3 px-4">Tên File</th>
                          <th className="py-3 px-3">Bài đăng (BaseName)</th>
                          <th className="py-3 px-3">Kích thước</th>
                          <th className="py-3 px-3">Trạng thái Upload</th>
                          <th className="py-3 px-3">Trạng thái Đĩa C</th>
                          <th className="py-3 px-4 text-right">Thao tác Stream</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredFiles.map((file) => (
                          <tr key={file.id} className="hover:bg-slate-900/80 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-200">
                              <div className="flex items-center gap-2">
                                {getFileIcon(file.fileType)}
                                <span className="truncate max-w-xs">{file.fileName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                              {file.baseName}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 text-[10px] rounded border font-medium ${
                                  file.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : file.status === 'uploading'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {file.status === 'completed'
                                  ? 'Đã upload Drive'
                                  : file.status === 'uploading'
                                  ? 'Đang upload...'
                                  : 'Chưa upload'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {activeMapping.deleteAfterUpload && file.status === 'completed' ? (
                                <span className="text-amber-400 font-medium text-[11px]">
                                  ✓ Đã xóa file đĩa C
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Giữ trên đĩa C</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {file.streamLink ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => copyToClipboard(file.streamLink)}
                                    className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1"
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
                              ) : (
                                <span className="text-slate-600 text-[11px]">Chưa có link</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

      {/* Modal: Create or Edit Folder Mapping */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">
                {editingMapping ? 'Chỉnh Sửa Thư Mục Quét' : 'Thêm Thư Mục Quét (Mapping)'}
              </h3>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMapping} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tên nhãn thư mục quét:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thư mục Video Tập 1-50"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Đường dẫn thư mục máy tính:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: C:\HeroDrive\Phim1"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tài khoản Google Drive đảm nhận:</label>
                {googleDriveConnections.length > 0 ? (
                  <select
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
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
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Chu kỳ quét (Thời gian định kỳ):</label>
                <select
                  value={scanInterval}
                  onChange={(e) => setScanInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10 giây / lần (Quét siêu nhanh)</option>
                  <option value={30}>30 giây / lần</option>
                  <option value={60}>1 phút / lần</option>
                  <option value={300}>5 phút / lần</option>
                  <option value={3600}>1 giờ / lần (3600s)</option>
                  <option value={43200}>12 giờ / lần (43200s)</option>
                  <option value={86400}>24 giờ / lần (86400s - Hàng ngày)</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={deleteAfterUpload}
                    onChange={(e) => setDeleteAfterUpload(e.target.checked)}
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
                  {isSubmitting
                    ? 'Đang lưu...'
                    : editingMapping
                    ? 'Lưu Thay Đổi'
                    : 'Tạo Thư Mục Quét'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
