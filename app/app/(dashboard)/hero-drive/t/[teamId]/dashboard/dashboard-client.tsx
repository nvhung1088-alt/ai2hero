'use client';

import { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderPlus,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileVideo,
  FileImage,
  FileText,
  File,
  FolderOpen,
  FolderSync,
  Plus,
  Play,
  Pause,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import {
  createDriveProjectAction,
  deleteDriveProjectAction,
  getDriveFolderMappings,
  createDriveFolderMappingAction,
  deleteDriveFolderMappingAction,
  getDriveContentsWithFilesByProject,
} from '@/lib/db/hero-drive-actions';
import DriveProjectSidebar from './drive-project-sidebar';
import Link from 'next/link';

interface DashboardProps {
  user: any;
  team: any;
  initialProjects: any[];
  googleDriveConnections: any[];
}

export default function DriveDashboardClient({
  user,
  team,
  initialProjects,
  googleDriveConnections,
}: DashboardProps) {
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    initialProjects.length > 0 ? initialProjects[0].id : null
  );

  const [mappings, setMappings] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [expandedContentIds, setExpandedContentIds] = useState<number[]>([]);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');

  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [newMappingName, setNewMappingName] = useState<string>('');
  const [newLocalPath, setNewLocalPath] = useState<string>('');
  const [newConnectionId, setNewConnectionId] = useState<string>(
    googleDriveConnections.length > 0 ? String(googleDriveConnections[0].id) : ''
  );
  const [newTargetFolderId, setNewTargetFolderId] = useState<string>('');
  const [newTargetFolderName, setNewTargetFolderName] = useState<string>('');
  const [newDeleteAfterUpload, setNewDeleteAfterUpload] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Mappings & Contents when selectedProjectId changes
  const fetchProjectDetails = async (projectId: number) => {
    setIsLoadingDetails(true);
    const [mapRes, contentRes] = await Promise.all([
      getDriveFolderMappings(projectId),
      getDriveContentsWithFilesByProject(projectId),
    ]);

    if (mapRes.success && mapRes.data) setMappings(mapRes.data);
    if (contentRes.success && contentRes.data) setContents(contentRes.data);

    setIsLoadingDetails(false);
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    } else {
      setMappings([]);
      setContents([]);
    }
  }, [selectedProjectId]);

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;

    setIsSubmitting(true);
    const res = await createDriveProjectAction({
      teamId: team.id,
      userId: user.id,
      name: newProjectName,
      description: newProjectDesc,
    });

    if (res.success && res.data) {
      setProjects([res.data, ...projects]);
      setSelectedProjectId(res.data.id);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
    }
    setIsSubmitting(false);
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này cùng toàn bộ cấu hình thư mục?')) return;
    const res = await deleteDriveProjectAction(id, team.id);
    if (res.success) {
      const nextProjects = projects.filter((p) => p.id !== id);
      setProjects(nextProjects);
      if (selectedProjectId === id) {
        setSelectedProjectId(nextProjects.length > 0 ? nextProjects[0].id : null);
      }
    }
  };

  // Handle Create Folder Mapping
  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMappingName || !newLocalPath) return;

    setIsSubmitting(true);
    const res = await createDriveFolderMappingAction({
      projectId: selectedProjectId,
      name: newMappingName,
      localFolderPath: newLocalPath,
      connectionId: newConnectionId ? parseInt(newConnectionId) : null,
      targetFolderId: newTargetFolderId || null,
      targetFolderName: newTargetFolderName || null,
      deleteAfterUpload: newDeleteAfterUpload,
    });

    if (res.success && res.data) {
      setMappings([res.data, ...mappings]);
      setIsMappingModalOpen(false);
      setNewMappingName('');
      setNewLocalPath('');
      setNewTargetFolderId('');
      setNewTargetFolderName('');
    }
    setIsSubmitting(false);
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Xóa thư mục quét này?')) return;
    if (!selectedProjectId) return;
    const res = await deleteDriveFolderMappingAction(id, selectedProjectId);
    if (res.success) {
      setMappings(mappings.filter((m) => m.id !== id));
    }
  };

  const toggleExpandContent = (id: number) => {
    setExpandedContentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy link trực tiếp!');
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

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
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Projects */}
      <DriveProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onCreateProjectClick={() => setIsProjectModalOpen(true)}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6">
        {activeProject ? (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <FolderSync className="w-5 h-5 text-blue-400" />
                  {activeProject.name}
                </h1>
                {activeProject.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeProject.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectedProjectId && fetchProjectDetails(selectedProjectId)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetails ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>

                <button
                  onClick={() => setIsMappingModalOpen(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <FolderPlus className="w-4 h-4" />+ Thêm Thư Mục Quét (Mapping)
                </button>
              </div>
            </div>

            {/* Block 1: Folder Mappings (N Cặp Thư Mục Quét/Lưu) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  Cấu hình Thư mục Quét máy tính & Google Drive ({mappings.length})
                </h2>
              </div>

              {mappings.length === 0 ? (
                <div className="p-6 border border-slate-800/80 rounded-xl bg-slate-900/30 text-center">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">
                    Chưa có cấu hình thư mục quét nào trong dự án này
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Thêm cặp thư mục (Đĩa C ➔ Thư mục Google Drive) để máy tính bắt đầu quét upload.
                  </p>
                  <button
                    onClick={() => setIsMappingModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors"
                  >
                    + Thêm Thư mục Quét
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mappings.map((mapping) => {
                    const conn = googleDriveConnections.find((c) => c.id === mapping.connectionId);
                    return (
                      <div
                        key={mapping.id}
                        className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2.5 relative group hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-sm text-slate-200">{mapping.name}</h3>
                          <div className="flex items-center gap-1.5">
                            {mapping.deleteAfterUpload && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-medium">
                                Tự xóa đĩa C
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Xóa mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <p className="text-slate-400 font-mono break-all line-clamp-1">
                            💻 Máy tính: <span className="text-slate-200">{mapping.localFolderPath}</span>
                          </p>
                          <p className="text-slate-400 font-mono break-all line-clamp-1">
                            ☁️ Google Drive Target:{' '}
                            <span className="text-blue-400 font-semibold">
                              {mapping.targetFolderName || mapping.targetFolderId || 'Mặc định (Root)'}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            🔑 Tài khoản Drive:{' '}
                            <span className="text-slate-200 font-medium">
                              {conn
                                ? (conn.credentials?.accountEmail || conn.credentials?.email || conn.name || `Tài khoản #${conn.id}`)
                                : 'Mặc định'}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Block 2: Contents Table (Gom nhóm theo baseName) */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Danh sách Bài Đăng (Contents) ({contents.length})
                </h2>
              </div>

              {isLoadingDetails ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Đang tải danh sách bài đăng...
                </div>
              ) : contents.length === 0 ? (
                <div className="p-6 text-center border border-slate-800/80 rounded-xl bg-slate-950/40 text-slate-400 text-xs">
                  Chưa có bài đăng nào được quét ở dự án này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contents.map((content) => {
                    const isExpanded = expandedContentIds.includes(content.id);
                    const isDone = content.status === 'completed';

                    return (
                      <div
                        key={content.id}
                        className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden"
                      >
                        <div
                          onClick={() => toggleExpandContent(content.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <div>
                              <h4 className="font-semibold text-xs text-slate-200">{content.baseName}</h4>
                              <p className="text-[11px] text-slate-500">
                                Đã tải: {content.uploadedFiles} / {content.totalFiles} tệp đính kèm
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 text-[10px] rounded border font-medium ${
                              isDone
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {isDone ? 'Đã hoàn tất' : 'Đang xử lý'}
                          </span>
                        </div>

                        {/* Collapsible Files List */}
                        {isExpanded && (
                          <div className="border-t border-slate-800/80 p-3 bg-slate-950/60 space-y-2">
                            {content.files && content.files.length > 0 ? (
                              content.files.map((file: any) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    {getFileIcon(file.fileType)}
                                    <div>
                                      <p className="font-medium text-slate-300">{file.fileName}</p>
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
                                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded text-[11px] font-medium transition-colors"
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
                                Không có tệp đính kèm.
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
          </div>
        ) : (
          <div className="p-12 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
            <HardDrive className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-400">Hãy chọn 1 Dự án bên trái</p>
            <p className="text-xs text-slate-500 mt-1">
              Hoặc bấm nút "+" ở Sidebar để tạo Dự án Quét mới.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Create Project */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">Tạo Dự Án Mới</h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Tên Dự án (Chiến dịch):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kênh Phim Ngắn Youtube 2026"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-300">Mô tả dự án (Tùy chọn):</label>
                <textarea
                  placeholder="Ghi chú thêm về dự án này..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Dự Án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  placeholder="VD: 1a2b3c4d5e..."
                  value={newTargetFolderId}
                  onChange={(e) => setNewTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
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
