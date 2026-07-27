'use client';

import { useState, useEffect, useRef } from 'react';
import { useSmartPolling } from '@/hooks/use-smart-polling';
import { Plus, Play, Pause, FolderOpen, Settings, Search, CheckCircle2, Loader2, Download, AlertCircle, LayoutDashboard, Copy, Terminal, ChevronDown, ChevronUp, Square, Trash2, RefreshCw, Image, Languages, Sparkles, Eye, X } from 'lucide-react';
import { CreateProjectModal } from './create-project-modal';
import { EditProjectModal } from './edit-project-modal';
import { PollingBanner } from '@/components/polling-banner';
import { Edit3 } from 'lucide-react';

import { getDownloaderVideosAction, updateDownloaderVideoStatusAction, generateDownloaderPairCodeAction, updateDownloaderProjectAction, createDownloaderVideoAction, stopAllDownloaderVideosAction, clearDownloaderVideosAction, forceScanDownloaderProjectAction } from '@/lib/db/hero-downloader-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

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
  const [isWorkerGuideOpen, setIsWorkerGuideOpen] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [activeTab, setActiveTab] = useState<'windows' | 'mac'>('windows');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Thumbnail Translation & AI Selection State
  const [selectedLang, setSelectedLang] = useState('Tiếng Việt');
  const [selectedAiConn, setSelectedAiConn] = useState(aiConnections.length > 0 ? `${aiConnections[0].id}:${aiConnections[0].defaultModel || 'gpt-4o-mini'}` : '');
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const [previewVideo, setPreviewVideo] = useState<any>(null);

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

  const handleTranslateThumbnail = async (videoId: number) => {
    if (!selectedAiConn) {
      showToast('Vui lòng chọn AI model từ danh sách Connect Hub', 'error');
      return;
    }
    const [connId, model] = selectedAiConn.split(':');
    setTranslatingIds(prev => new Set(prev).add(videoId));
    try {
      const res = await fetch('/api/hero-downloader/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          connectionId: parseInt(connId, 10),
          model,
          imageModel: 'dall-e-3',
          targetLang: selectedLang
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, translatedThumbnailUrl: data.translatedThumbnailUrl } : v
        ));
        showToast('Dịch & Redesign Thumbnail thành công!', 'success');
      } else {
        showToast('Lỗi dịch thumbnail: ' + (data.error || 'Không xác định'), 'error');
      }
    } catch (err: any) {
      showToast('Lỗi kết nối: ' + err.message, 'error');
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

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

  // Reset trang về 1 khi đổi project
  useEffect(() => {
    setCurrentPage(1);
  }, [activeProjectId]);


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
      {/* Cột trái: Danh sách dự án */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-gray-900/20">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-semibold text-white">Dự án Quét Tải</h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-3">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm dự án..." 
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-gray-300 focus:outline-none focus:border-teal-500/50 transition-colors placeholder:text-gray-600"
            />
          </div>
          
          <div className="space-y-2 overflow-y-auto h-[calc(100vh-180px)] pr-1 custom-scrollbar">
            {projects.length === 0 ? (
              <div className="text-center p-4 text-gray-500 text-xs">
                Chưa có dự án nào. Bấm dấu + để tạo.
              </div>
            ) : projects.map(project => (
              <div 
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                className={`p-3 rounded-xl cursor-pointer border transition-all ${
                  activeProjectId === project.id 
                    ? 'bg-teal-500/10 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-medium truncate pr-2 ${activeProjectId === project.id ? 'text-teal-400' : 'text-gray-300'}`}>
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToEdit(project);
                        setIsEditModalOpen(true);
                      }}
                      className="text-gray-500 hover:text-teal-400 transition-colors"
                      title="Sửa dự án"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {project.status === 'active' && <Loader2 className="w-4 h-4 animate-spin text-teal-500 shrink-0" />}
                    {project.status === 'paused' && <Pause className="w-4 h-4 text-amber-500 shrink-0" />}
                    {project.status === 'idle' && <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />}
                  </div>
                </div>
                
                <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                  <span>{project.platform}</span>
                  <span>Tổng: {project.totalVideos || 0} video</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                  <span>Quét: {project.lastScanAt ? new Date(project.lastScanAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Chưa quét'}</span>
                  <span className="text-teal-500/80">Đã tải: {project.downloadedVideos || 0}</span>
                </div>
                
                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${project.status === 'active' ? 'bg-teal-500' : project.status === 'paused' ? 'bg-amber-500' : 'bg-gray-600'}`}
                    style={{ width: `${project.totalVideos ? ((project.downloadedVideos || 0) / project.totalVideos) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cột phải: Chi tiết tác vụ */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/20 overflow-y-auto">
        {/* Worker Installation Guide */}
        <div className="p-6 pb-0 shrink-0 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-500/90 leading-relaxed">
              <span className="font-semibold text-amber-500">Lưu ý hệ thống:</span> Để tối ưu chi phí Máy chủ Đám mây (Vercel), hệ thống đã được thiết kế thuật toán ngủ đông thông minh. 
              Các lệnh như <strong className="text-amber-400">Tải ngay</strong>, <strong className="text-amber-400">Quét ngay</strong> hoặc cập nhật tiến độ % có thể <strong>chờ tối đa 30-60 giây</strong> mới phản hồi xuống Worker dưới máy bạn.
            </div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-sm">
            <div 
              className="px-5 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => setIsWorkerGuideOpen(!isWorkerGuideOpen)}
            >
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-500" />
                Cài đặt Worker Downloader trên máy tính (Bắt buộc)
              </h2>
              {isWorkerGuideOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>

            {isWorkerGuideOpen && (
              <div className="p-5 bg-[#0a0f16]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Bước 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                      <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs">1</span>
                      Cài đặt & Khởi chạy Worker
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed space-y-1.5">
                      <p>1. Copy toàn bộ câu lệnh bên dưới.</p>
                      <p>2. Mở thư mục <strong>hero-downloader-worker</strong>, click vào thanh địa chỉ (Address bar) phía trên cùng của thư mục, gõ <strong>cmd</strong> và nhấn Enter.</p>
                      <p>3. Dán câu lệnh dưới đây vào màn hình đen vừa hiện ra và nhấn Enter để khởi chạy!</p>
                    </div>
                    <div className="bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-xs text-gray-300 flex items-center justify-between gap-4 group">
                      <p className="break-all text-teal-400/90">cd hero-downloader-worker 2&gt;nul &amp; python -m pip install -U -r requirements.txt &amp;&amp; python worker.py</p>
                      <button 
                        onClick={() => { navigator.clipboard.writeText('cd hero-downloader-worker 2>nul & python -m pip install -U -r requirements.txt && python worker.py'); showToast('Đã copy câu lệnh', 'success'); }} 
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0" 
                        title="Copy lệnh"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-amber-400/90 leading-relaxed mt-4">
                      <p>💡 <strong>Muốn tải Douyin?</strong> Bạn không cần bẻ khóa nữa! Hãy cài đặt <strong>Extension AI2Hero</strong> vào trình duyệt Chrome để quét và lấy link MP4 gốc tự động 100%.</p>
                      <ol className="list-decimal pl-4 mt-2 space-y-1 text-gray-300">
                        <li>Mở tab mới, gõ <code className="bg-black/50 px-1 rounded text-teal-400">chrome://extensions/</code></li>
                        <li>Bật <strong>Developer mode</strong> (Góc trên bên phải)</li>
                        <li>Bấm <strong>Load unpacked</strong> (Góc trên bên trái)</li>
                        <li>Chọn thư mục tiện ích: <code className="bg-black/50 px-1 rounded text-teal-400">hero-downloader-extension</code> (hoặc <code className="bg-black/50 px-1 rounded text-teal-400">hero-video-assistant</code>) trên máy bạn</li>
                        <li>Ghim Extension lên góc phải Chrome. Mở kênh Douyin bất kỳ, lướt chuột và bấm nút đồng bộ!</li>
                      </ol>
                    </div>
                  </div>

                  {/* Bước 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                      <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs">2</span>
                      Sinh mã liên kết (Pair Code)
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Mỗi Worker cần được xác thực vào dự án của bạn bằng 1 mã gồm 6 ký tự. Hãy tạo mã và nhập vào màn hình Console của Worker.
                    </p>
                    <div className="flex flex-col gap-3">
                      {pairCode ? (
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4 flex items-center justify-between">
                          <span className="text-2xl font-bold tracking-[0.2em] text-teal-400">{pairCode}</span>
                          <button onClick={() => { navigator.clipboard.writeText(pairCode); showToast('Đã copy mã liên kết', 'success'); }} className="p-2 text-teal-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-md transition-colors" title="Copy">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={async () => {
                            const res = await generateDownloaderPairCodeAction(teamId);
                            if (res.success && 'code' in res && res.code) {
                              setPairCode(res.code as string);
                              showToast('Đã sinh mã liên kết mới', 'success');
                            } else {
                              showToast('Lỗi: ' + res.error, 'error');
                            }
                          }} 
                          className="w-full py-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-medium rounded-lg transition-colors border border-teal-500/30 text-sm"
                        >
                          Tạo mã liên kết mới
                        </button>
                      )}
                      {pairCode && <p className="text-[10px] text-teal-500/70 text-center">Mã này sẽ hết hạn trong vòng 1 giờ tới.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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

            {/* Video List */}
            <div className="flex-1 overflow-auto p-6">
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

              {/* Toolbar Chọn Ngôn Ngữ & Chọn AI */}
              <div className="flex items-center justify-between gap-4 mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400 font-medium">Ngôn ngữ đích:</span>
                    <select 
                      value={selectedLang} 
                      onChange={e => setSelectedLang(e.target.value)}
                      className="bg-black/40 border border-white/10 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500/50"
                    >
                      {LANGUAGES.map(l => <option key={l} value={l} className="bg-gray-900">{l}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-gray-400 font-medium">Cổng AI (Connect Hub):</span>
                    <select 
                      value={selectedAiConn} 
                      onChange={e => setSelectedAiConn(e.target.value)}
                      className="bg-black/40 border border-white/10 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50 min-w-[200px]"
                    >
                      {aiConnections.length === 0 ? (
                        <option value="" className="bg-gray-900">-- Chưa có kết nối AI (mặc định system) --</option>
                      ) : (
                        aiConnections.map((c: any) => (
                          <option key={c.id} value={`${c.id}:${c.defaultModel || 'gpt-4o-mini'}`} className="bg-gray-900">
                            {c.name || c.appSlug} ({c.defaultModel || 'default'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 hidden sm:block">
                  Tự động dịch text trên ảnh & Redesign Thumbnail
                </div>
              </div>

              <div className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 text-xs uppercase bg-black/20">
                      <th className="py-3 px-4 font-medium w-8">#</th>
                      <th className="py-3 px-4 font-medium w-[90px]">Ảnh bìa</th>
                      <th className="py-3 px-4 font-medium">Video ID / Tiêu đề</th>
                      <th className="py-3 px-4 font-medium">Dung lượng</th>
                      <th className="py-3 px-4 font-medium">Ngày tải</th>
                      <th className="py-3 px-4 font-medium">Trạng thái</th>
                      <th className="py-3 px-4 font-medium text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingVideos ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-teal-500">
                          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                          <p className="text-gray-400">Đang tải danh sách video...</p>
                        </td>
                      </tr>
                    ) : videos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <Download className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <p>Chưa có video nào được tải về</p>
                        </td>
                      </tr>
                    ) : (
                      videos.slice((currentPage - 1) * 10, currentPage * 10).map((video, idx) => (
                        <tr key={video.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="py-3 px-4 text-gray-500">{video.id}</td>
                          <td className="py-2 px-4">
                            {video.thumbnailUrl ? (
                              <div 
                                className="relative cursor-pointer group/thumb w-20 h-[45px] rounded-md overflow-hidden border border-white/10 bg-black/40 hover:border-purple-500/50 transition-colors"
                                onClick={() => setPreviewVideo(video)}
                                title="Click để xem fullsize & so sánh"
                              >
                                <img 
                                  src={video.translatedThumbnailUrl || video.thumbnailUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  loading="lazy" 
                                />
                                {video.translatedThumbnailUrl && (
                                  <span className="absolute top-0.5 right-0.5 bg-teal-500/90 text-white text-[7px] font-bold px-1 py-0.2 rounded">
                                    VI
                                  </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-[45px] bg-white/5 rounded-md flex items-center justify-center">
                                <Image className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-200 font-medium truncate max-w-[200px] lg:max-w-md" title={video.title}>{video.title}</p>
                            <a href={video.videoUrl} target="_blank" rel="noreferrer" title={video.videoUrl} className="text-[11px] text-blue-400 hover:underline block truncate max-w-[200px] lg:max-w-md">{video.videoUrl}</a>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs">
                            {video.actualSizeBytes ? (
                                <span className={video.sizeBytes && video.actualSizeBytes < video.sizeBytes * 0.9 ? "text-red-400" : "text-green-400"}>
                                  {(video.actualSizeBytes / 1024 / 1024).toFixed(1)} MB
                                </span>
                            ) : (
                                <span className="text-gray-500">...</span>
                            )}
                            {video.sizeBytes ? (
                              <span className="text-gray-500"> / {(video.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                            ) : ''}
                            {video.duration ? <span className="text-gray-600 block text-[10px]">{video.duration}</span> : null}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs">
                            {new Date(video.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-4">
                          {video.status === 'downloading' ? (
                              <div className="flex items-center gap-2 text-teal-400 text-xs">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <div>
                                  <div>Đang tải {video.progress}%</div>
                                  {video.downloadSpeed && <div className="text-teal-300/70 font-mono">{video.downloadSpeed}</div>}
                                </div>
                              </div>
                            ) : video.status === 'completed' ? (
                              <div className="flex items-center gap-2 text-emerald-500 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Hoàn tất</span>
                              </div>
                            ) : video.status === 'paused' ? (
                              <div className="flex items-center gap-2 text-amber-500 text-xs">
                                <Pause className="w-3.5 h-3.5" />
                                <span>Tạm dừng ({video.progress}%)</span>
                              </div>
                            ) : video.status === 'failed' ? (
                              <div className="flex items-center gap-2 text-red-400 text-xs">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span title={video.error || ''}>Thất bại</span>
                              </div>
                            ) : video.status === 'force_pending' ? (
                              <div className="flex items-center gap-2 text-teal-400 text-xs">
                                <div className="w-3.5 h-3.5 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                                <span>Đang khởi động tải...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Chờ tải (Pending)</span>
                              </div>
                            )}
                            {video.status === 'downloading' && (
                              <div className="h-1 w-24 bg-black/50 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${video.progress}%` }} />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Nút Dịch & Redesign Thumbnail */}
                              {video.thumbnailUrl && (
                                <button 
                                  onClick={() => handleTranslateThumbnail(video.id)} 
                                  disabled={translatingIds.has(video.id)}
                                  className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-colors disabled:opacity-40" 
                                  title={video.translatedThumbnailUrl ? 'Dịch lại Thumbnail (AI)' : 'Dịch & Redesign Thumbnail (AI)'}
                                >
                                  {translatingIds.has(video.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                  ) : (
                                    <Languages className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              {video.status === 'downloading' ? (
                                <>
                                  {video.downloadSpeed && <span className="text-teal-400 font-bold text-xs font-mono">{video.downloadSpeed}</span>}
                                  <button onClick={() => handleUpdateVideoStatus(video.id, 'paused')} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/20 transition-colors" title="Tạm dừng">
                                    <Pause className="w-4 h-4" />
                                  </button>
                                </>
                              ) : video.status === 'paused' ? (
                                <button onClick={() => handleUpdateVideoStatus(video.id, 'pending')} className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/20 transition-colors" title="Tiếp tục tải">
                                  <Play className="w-4 h-4 fill-current" />
                                </button>
                              ) : video.status === 'failed' ? (
                                <button onClick={() => handleUpdateVideoStatus(video.id, 'pending')} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors text-xs font-bold whitespace-nowrap" title="Thử lại">
                                  Thử lại
                                </button>
                              ) : video.status === 'pending' ? (
                                <>
                                  <button onClick={() => handleUpdateVideoStatus(video.id, 'force_pending')} className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg border border-teal-500/30 transition-colors text-xs font-bold whitespace-nowrap" title="Tải ngay lập tức">
                                    Tải ngay
                                  </button>
                                  <button onClick={() => handleUpdateVideoStatus(video.id, 'paused')} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/20 transition-colors" title="Tạm dừng">
                                    <Pause className="w-4 h-4" />
                                  </button>
                                </>
                                ) : video.status === 'completed' && video.localPath ? (
                                <button onClick={() => handleOpenLocal(video.localPath!)} className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg border border-teal-500/20 transition-colors" title="Mở video">
                                  <FolderOpen className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                {videos.length > 0 && (
                  <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
                    <div className="text-xs text-gray-500">
                      Hiển thị {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, videos.length)} trong tổng số {videos.length} video
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
                      >
                        Trước
                      </button>
                      <span className="text-xs text-gray-400 px-2">
                        Trang {currentPage} / {Math.ceil(videos.length / 10)}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(videos.length / 10)))}
                        disabled={currentPage === Math.ceil(videos.length / 10)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-md text-gray-300 text-xs transition-colors"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 flex-col">
            <LayoutDashboard className="w-12 h-12 mb-4 opacity-20" />
            <p>Chọn một dự án để xem chi tiết</p>
          </div>
        )}
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
      {/* Modal Preview & So sánh Thumbnail */}
      {previewVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewVideo(null)}
        >
          <div 
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-gray-100 font-bold text-base">
                <Eye className="w-5 h-5 text-purple-400" />
                <span>Xem & So sánh Ảnh bìa Thumbnail</span>
              </div>
              <button 
                onClick={() => setPreviewVideo(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400 truncate" title={previewVideo.title}>
              {previewVideo.title}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Ảnh bìa gốc */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase font-semibold">Ảnh bìa gốc (Trung Quốc)</span>
                </div>
                {previewVideo.thumbnailUrl ? (
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center">
                    <img 
                      src={previewVideo.thumbnailUrl} 
                      alt="Thumbnail Gốc" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center text-gray-600 text-xs">
                    Không có ảnh bìa gốc
                  </div>
                )}
              </div>

              {/* Ảnh bìa đã dịch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-teal-400 uppercase font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ảnh bìa đã dịch ({selectedLang})
                  </span>
                </div>
                {previewVideo.translatedThumbnailUrl ? (
                  <div className="rounded-xl overflow-hidden border border-teal-500/40 bg-black/50 aspect-video flex items-center justify-center">
                    <img 
                      src={previewVideo.translatedThumbnailUrl} 
                      alt="Thumbnail Đã Dịch" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs flex-col gap-2 border border-dashed border-white/10">
                    <Languages className="w-6 h-6 text-gray-600" />
                    <span>Chưa thực hiện Dịch Thumbnail</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              {previewVideo.thumbnailUrl && (
                <button
                  onClick={() => {
                    handleTranslateThumbnail(previewVideo.id);
                    setPreviewVideo(null);
                  }}
                  disabled={translatingIds.has(previewVideo.id) || !selectedAiConn}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{previewVideo.translatedThumbnailUrl ? 'Dịch & Redesign Lại' : 'Dịch & Redesign Ngay'}</span>
                </button>
              )}
              <button
                onClick={() => setPreviewVideo(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
