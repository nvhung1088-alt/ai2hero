'use client';

import { useState, useEffect, useRef } from 'react';
import { useSmartPolling } from '@/hooks/use-smart-polling';
import { Plus, Play, Pause, FolderOpen, Settings, LayoutDashboard, Square, Trash2, RefreshCw, RotateCcw, Languages, Sparkles, X, Clock, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { CreateProjectModal } from './create-project-modal';
import { EditProjectModal } from './edit-project-modal';
import { PollingBanner } from '@/components/polling-banner';

import { getDownloaderVideosAction, updateDownloaderVideoStatusAction, updateDownloaderProjectAction, createDownloaderVideoAction, stopAllDownloaderVideosAction, clearDownloaderVideosAction, forceScanDownloaderProjectAction, retryAllFailedVideosAction } from '@/lib/db/hero-downloader-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

import { getStatusRank } from '../_shared/downloader-ui-helpers';
import { DownloaderProjectSidebar } from './downloader-project-sidebar';
import { DownloaderWorkerGuide } from './downloader-worker-guide';
import { DownloaderVideoTable } from './downloader-video-table';
import { DownloaderThumbnailModal } from './downloader-thumbnail-modal';

const LANGUAGES = ['Tiếng Việt', 'English', '한국어', '日本語', 'ภาษาไทย', 'Bahasa Indonesia'];

export default function DownloaderDashboardClient({ 
  teamId,
  initialProjects = [],
  initialVideos = [],
  initialCookies = [],
  aiConnections = []
}: { 
  teamId: number;
  initialProjects?: any[];
  initialVideos?: any[];
  initialCookies?: any[];
  aiConnections?: any[];
}) {
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [videos, setVideos] = useState<any[]>(initialVideos);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(projects.length > 0 ? projects[0].id : null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Add URL Inline Form State
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [addUrlValue, setAddUrlValue] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [previewVideo, setPreviewVideo] = useState<any>(null);

  const [videoFilter, setVideoFilter] = useState<string>('all'); // 'all' | 'downloading' | 'pending' | 'completed' | 'failed'

  const activeProject = projects.find(p => p.id === activeProjectId);

  const statusPriority: Record<string, number> = {
    downloading: 1,
    pending: 2,
    completed: 3,
    failed: 4,
    error: 4,
    cancelled: 5,
  };

  const filteredVideos = videos.filter((v) => {
    if (videoFilter === 'all') return true;
    if (videoFilter === 'downloading') return v.status === 'downloading';
    if (videoFilter === 'pending') return v.status === 'pending';
    if (videoFilter === 'completed') return v.status === 'completed';
    if (videoFilter === 'failed') return v.status === 'failed' || v.status === 'error' || v.status === 'cancelled';
    return true;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const hasDownloading = videos.some(v => v.status === 'downloading' || v.status === 'pending');

  // Auto-refresh using Smart Polling connected to Super Admin Traffic Control
  useSmartPolling({
    appId: 'hero-downloader',
    enabled: Boolean(hasDownloading && activeProjectId),
    fetchFn: async () => {
      if (!activeProjectId) return false;
      const res = await getDownloaderVideosAction(teamId, activeProjectId);
      if (res.success && res.videos) setVideos(res.videos);
      return false;
    },
  });

  // Reset trang về 1 khi đổi project hoặc filter
  useEffect(() => {
    setCurrentPage(1);
  }, [activeProjectId, videoFilter]);


  const isFirstRender = useRef(true);

  // Fetch videos when active project changes
  useEffect(() => {
    if (!activeProjectId) return;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const fetchVideos = async () => {
      setIsLoadingVideos(true);
      const res = await getDownloaderVideosAction(teamId, activeProjectId);
      if (res.success && res.videos) {
        setVideos(res.videos);
      } else {
        showToast('Lỗi khi tải danh sách video: ' + res.error, 'error');
        setVideos([]);
      }
      setIsLoadingVideos(false);
    };

    fetchVideos();
  }, [activeProjectId, teamId]);

  const fetchVideosRef = async () => {
    const res = await getDownloaderVideosAction(teamId, activeProjectId!);
    if (res.success && res.videos) {
      setVideos(res.videos);
    }
  };

  const handleUpdateVideoStatus = async (videoId: number, newStatus: string) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: newStatus as any } : v));
    
    const res = await updateDownloaderVideoStatusAction(videoId, teamId, newStatus);
    if (!res.success) {
      showToast('Lỗi: ' + res.error, 'error');
      if (activeProjectId) fetchVideosRef();
    }
  };

  const handleOpenLocal = async (localPath: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:19998/open?path=${encodeURIComponent(localPath)}`);
      if (!res.ok) throw new Error('Worker not responding');
    } catch (e) {
      showToast('Không thể kết nối Worker. Đảm bảo Local Worker đang chạy!', 'error');
    }
  };

  const handleAddUrl = async () => {
    if (!activeProjectId || !addUrlValue.trim()) return;
    setIsAddingUrl(true);
    
    const res = await createDownloaderVideoAction({ projectId: activeProjectId, videoUrl: addUrlValue.trim(), title: addUrlValue.trim() });
    if (res.success) {
      showToast('Đã thêm URL thành công!', 'success');
      setAddUrlValue('');
      setIsAddUrlOpen(false);
      fetchVideosRef();
    } else {
      showToast('Lỗi: ' + res.error, 'error');
    }
    setIsAddingUrl(false);
  };

  const handleStopAll = () => {
    if (!activeProjectId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Dừng tất cả tác vụ',
      message: 'Bạn có chắc muốn dừng tất cả video đang tải và chờ tải của dự án này không?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVideos(prev => prev.map(v => 
          (v.status === 'pending' || v.status === 'downloading') 
            ? { ...v, status: 'cancelled' } 
            : v
        ));
        const res = await stopAllDownloaderVideosAction(teamId, activeProjectId);
        if (res.success) {
          showToast('Đã dừng tất cả tác vụ đang tải và chờ tải!', 'success');
        } else {
          showToast('Lỗi: ' + res.error, 'error');
          if (activeProjectId) fetchVideosRef();
        }
      }
    });
  };

  const handleToggleProjectStatus = async () => {
    if (!activeProject) return;
    const isRunning = activeProject.status === 'active';
    const newStatus = isRunning ? 'paused' : 'active';
    
    // Update local state temporarily
    setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, status: newStatus as any } : p));
    
    // Send to DB, if setting to active, we set lastScanAt = null to force rescan
    const res = await updateDownloaderProjectAction(activeProject.id, teamId, { 
      status: newStatus,
      ...(newStatus === 'active' ? { lastScanAt: null } : {})
    });
    
    if (res.success) {
      showToast(isRunning ? 'Đã tạm dừng tiến trình quét' : 'Đã bật tiến trình quét. Worker sẽ bắt đầu ngay!', 'success');
    } else {
      showToast('Lỗi: ' + res.error, 'error');
      // Revert status on error
      setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, status: activeProject.status } : p));
    }
  };
  const handleForceScan = async () => {
    if (!activeProjectId || !activeProject) return;
    
    showToast('Đang yêu cầu quét ngay lập tức...', 'success');
    const res = await forceScanDownloaderProjectAction(activeProjectId, teamId);
    if (res.success && res.project) {
      showToast('Đã kích hoạt quét ngay! Trình duyệt extension hoặc worker sẽ chạy trong giây lát.', 'success');
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: 'active', lastScanAt: null } : p));
    } else {
      showToast('Lỗi khi kích hoạt quét ngay: ' + res.error, 'error');
    }
  };

  const handleRetryAllFailed = async () => {
    if (!activeProject) return;
    const failedCount = videos.filter(v => v.status === 'failed').length;
    if (failedCount === 0) {
      showToast('Không có video nào bị lỗi để thử lại', 'success');
      return;
    }
    
    showToast(`Đang yêu cầu thử lại ${failedCount} video bị lỗi...`, 'success');
    const res = await retryAllFailedVideosAction(teamId, activeProject.id);
    if (res.success) {
      showToast(`Đã kích hoạt thử lại thành công ${res.count ?? failedCount} video!`, 'success');
      const fetchRes = await getDownloaderVideosAction(teamId, activeProject.id);
      if (fetchRes.success && fetchRes.videos) setVideos(fetchRes.videos);
    } else {
      showToast('Lỗi khi thử lại tất cả: ' + res.error, 'error');
    }
  };

  const handleClearVideos = () => {
    if (!activeProject) return;
    setConfirmModal({
      isOpen: true,
      title: 'Xóa toàn bộ video',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ video trong dự án này? Thao tác này không thể hoàn tác!',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await clearDownloaderVideosAction(activeProject.id, teamId);
        if (res.success) {
          showToast('Đã xóa toàn bộ video', 'success');
          const fetchRes = await getDownloaderVideosAction(teamId, activeProject.id);
          if (fetchRes.success && fetchRes.videos) setVideos(fetchRes.videos);
          else setVideos([]);
          setCurrentPage(1);
        } else {
          showToast('Lỗi khi xóa video: ' + res.error, 'error');
        }
      }
    });
  };

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden text-sm flex-col">
      <div className="px-4 pt-4 shrink-0">
        <PollingBanner intervalMinutes={10} onRefresh={async () => {
          if (!activeProjectId) return;
          const res = await getDownloaderVideosAction(teamId, activeProjectId);
          if (res.success && res.videos) setVideos(res.videos);
        }} />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <DownloaderProjectSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onEditProject={(project) => {
            setProjectToEdit(project);
            setIsEditModalOpen(true);
          }}
          onCreateProject={() => setIsCreateModalOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-black/20 overflow-y-auto">
          <DownloaderWorkerGuide teamId={teamId} />

          {activeProject ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header Right */}
              <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-gray-900/10 backdrop-blur-md">
                <div>
                  <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                    {activeProject.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${activeProject.status === 'active' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : activeProject.status === 'paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                      {activeProject.status === 'active' ? 'Đang chạy' : activeProject.status === 'paused' ? 'Tạm dừng' : 'Chưa chạy'}
                    </span>
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsAddUrlOpen(!isAddUrlOpen)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium">Thêm URL</span>
                  </button>
                  <a href={`/hero-downloader/t/${teamId}/settings`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-medium">Cấu hình</span>
                  </a>
                  <button onClick={() => handleOpenLocal('downloads')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-xs font-medium">Mở thư mục</span>
                  </button>
                  <button onClick={handleRetryAllFailed} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 transition-colors font-medium" title="Thử lại tất cả video bị lỗi">
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-xs">Thử lại tất cả</span>
                  </button>
                  <button onClick={handleStopAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors font-medium">
                    <Square className="w-4 h-4 fill-current" />
                    <span className="text-xs">Dừng tải tất cả</span>
                  </button>
                  <button onClick={handleClearVideos} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors font-medium">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs">Xóa tất cả video</span>
                  </button>
                  <button onClick={handleForceScan} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg text-teal-400 transition-colors font-medium">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-xs">Quét ngay</span>
                  </button>
                  <button onClick={handleToggleProjectStatus} className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all font-medium">
                    {activeProject.status === 'active' ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span className="text-xs">{activeProject.status === 'active' ? 'Tạm dừng' : 'Chạy tự động'}</span>
                  </button>
                </div>
              </div>

              {/* Stats Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pt-4 pb-2">
                <div className="p-3 bg-[#111622] border border-white/10 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">Tổng số video</span>
                  <span className="text-lg font-bold text-gray-100 mt-1">{videos.length}</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải
                  </span>
                  <span className="text-lg font-bold text-amber-300 mt-1">
                    {videos.filter((v) => v.status === 'downloading').length}
                  </span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Chờ tải
                  </span>
                  <span className="text-lg font-bold text-blue-300 mt-1">
                    {videos.filter((v) => v.status === 'pending').length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã tải xong
                  </span>
                  <span className="text-lg font-bold text-emerald-300 mt-1">
                    {videos.filter((v) => v.status === 'completed').length}
                  </span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Video lỗi / Hủy
                  </span>
                  <span className="text-lg font-bold text-rose-300 mt-1">
                    {videos.filter((v) => v.status === 'failed' || v.status === 'error' || v.status === 'cancelled').length}
                  </span>
                </div>
              </div>

              {/* Video List */}
              <div className="flex-1 overflow-auto p-6 pt-2">
                {/* Form Inline Thêm URL */}
                {isAddUrlOpen && (
                  <div className="flex items-center gap-2 mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <input
                      type="text"
                      value={addUrlValue}
                      onChange={e => setAddUrlValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                      placeholder="Dán URL Video (Youtube/Tiktok/Douyin)..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 text-xs focus:outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                      autoFocus
                    />
                    <button
                      onClick={handleAddUrl}
                      disabled={!addUrlValue.trim() || isAddingUrl}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isAddingUrl ? 'Đang thêm...' : 'Thêm'}
                    </button>
                    <button
                      onClick={() => { setIsAddUrlOpen(false); setAddUrlValue(''); }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Status Filter & Config Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
                    <button
                      onClick={() => setVideoFilter('all')}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        videoFilter === 'all'
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-gray-200'
                      }`}
                    >
                      Tất cả ({videos.length})
                    </button>
                    <button
                      onClick={() => setVideoFilter('downloading')}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        videoFilter === 'downloading'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-amber-300'
                      }`}
                    >
                      ⏳ Đang tải ({videos.filter((v) => v.status === 'downloading').length})
                    </button>
                    <button
                      onClick={() => setVideoFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        videoFilter === 'pending'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-blue-300'
                      }`}
                    >
                      ⚡ Chờ tải ({videos.filter((v) => v.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setVideoFilter('completed')}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        videoFilter === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-emerald-300'
                      }`}
                    >
                      ✅ Đã tải xong ({videos.filter((v) => v.status === 'completed').length})
                    </button>
                    <button
                      onClick={() => setVideoFilter('failed')}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        videoFilter === 'failed'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-rose-300'
                      }`}
                    >
                      ❌ Video lỗi ({videos.filter((v) => v.status === 'failed' || v.status === 'error' || v.status === 'cancelled').length})
                    </button>
                  </div>
                </div>

                <DownloaderVideoTable
                  videos={sortedVideos}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  isLoading={isLoadingVideos}
                  onUpdateStatus={handleUpdateVideoStatus}
                  onOpenLocal={handleOpenLocal}
                  onPreviewThumbnail={setPreviewVideo}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 flex-col">
              <LayoutDashboard className="w-12 h-12 mb-4 opacity-20" />
              <p>Chọn một dự án để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        teamId={teamId}
        cookies={initialCookies}
        onProjectCreated={(project) => {
          setProjects(prev => [...prev, project]);
          setActiveProjectId(project.id);
          setVideos([]);
          setIsCreateModalOpen(false);
        }}
      />

      <EditProjectModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        teamId={teamId}
        project={projectToEdit}
        cookies={initialCookies}
        onProjectUpdated={(project) => {
          setProjects(prev => prev.map(p => p.id === project.id ? project : p));
          setIsEditModalOpen(false);
        }}
      />

      <DownloaderThumbnailModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
      />

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-base">{confirmModal.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
