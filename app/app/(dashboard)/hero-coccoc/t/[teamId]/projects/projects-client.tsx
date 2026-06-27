'use client';

import React, { useState } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Folder, 
  Settings, 
  ListPlus, 
  Layers, 
  Clock, 
  Filter, 
  AlertCircle,
  X
} from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  createCoccocProjectAction, 
  deleteCoccocProjectAction, 
  toggleCoccocProjectAction, 
  getCoccocProjectDetailAction, 
  updateCoccocProjectAction 
} from '@/lib/db/hero-coccoc-actions';
import { useRouter } from 'next/navigation';
import ProjectTasksManager from './project-tasks-manager';

interface Project {
  id: number;
  name: string;
  profileId: number;
  profileName: string;
  downloadFolder: string;
  schedule: string;
  quality: string;
  isActive: boolean;
  totalDownloaded: number;
  maxTotalVideos: number;
  lastScanAt: Date | null;
  sourcesCount: number;
  tasksCount: number;
}

interface Profile {
  id: number;
  name: string;
}

interface SourceInput {
  id?: number;
  sourceType: 'channel_link' | 'search_keyword' | 'direct_link';
  sourceValue: string;
  label: string;
}

interface ProjectsClientProps {
  teamId: number;
  userId: number;
  projects: Project[];
  profiles: Profile[];
}

export default function ProjectsClient({
  teamId,
  userId,
  projects,
  profiles,
}: ProjectsClientProps) {
  const router = useRouter();

  // Dialog State
  const [showForm, setShowForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection State
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projects.length > 0 ? projects[0].id : null);
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // Form Fields State
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState<string>('');
  const [downloadFolder, setDownloadFolder] = useState('C:\\Users\\ADMIN\\Downloads\\CocCoc-Downloads');
  const [schedule, setSchedule] = useState<'manual' | '60m' | '12h' | '24h'>('manual');
  const [quality, setQuality] = useState<'highest' | '720p' | '480p'>('highest');
  const [minDuration, setMinDuration] = useState<number | ''>('');
  const [maxDuration, setMaxDuration] = useState<number | ''>('');
  const [priority, setPriority] = useState<'newest' | 'most_viewed'>('newest');
  const [maxVideosPerRun, setMaxVideosPerRun] = useState(10);
  const [maxTotalVideos, setMaxTotalVideos] = useState(100);
  
  // Sources Dynamic List
  const [sources, setSources] = useState<SourceInput[]>([
    { sourceType: 'channel_link', sourceValue: '', label: '' }
  ]);

  // Open creation form
  const handleOpenCreate = () => {
    if (profiles.length === 0) {
      showToast('Vui lòng tạo ít nhất một Profile Cốc Cốc trước khi tạo dự án!', 'error');
      return;
    }
    setEditingProjectId(null);
    setName('');
    setProfileId(profiles[0].id.toString());
    setDownloadFolder('C:\\Users\\ADMIN\\Downloads\\CocCoc-Downloads');
    setSchedule('manual');
    setQuality('highest');
    setMinDuration('');
    setMaxDuration('');
    setPriority('newest');
    setMaxVideosPerRun(10);
    setMaxTotalVideos(100);
    setSources([{ sourceType: 'channel_link', sourceValue: '', label: '' }]);
    setShowForm(true);
  };

  // Open edit form
  const handleOpenEdit = async (project: Project) => {
    setEditingProjectId(project.id);
    setName(project.name);
    setProfileId(project.profileId.toString());
    setDownloadFolder(project.downloadFolder);
    setSchedule(project.schedule as any);
    setQuality(project.quality as any);
    
    // Load detail with sources
    try {
      const result = await getCoccocProjectDetailAction(project.id, teamId);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      
      const projDetail = result.project;
      if (!projDetail) {
        showToast('Không tìm thấy thông tin dự án', 'error');
        return;
      }
      const projSources = result.sources || [];
      
      setMinDuration(projDetail.minDuration !== null ? projDetail.minDuration : '');
      setMaxDuration(projDetail.maxDuration !== null ? projDetail.maxDuration : '');
      setPriority(projDetail.priority as any);
      setMaxVideosPerRun(projDetail.maxVideosPerRun);
      setMaxTotalVideos(projDetail.maxTotalVideos);
      
      if (projSources.length > 0) {
        setSources(projSources.map(s => ({
          id: s.id,
          sourceType: s.sourceType as any,
          sourceValue: s.sourceValue,
          label: s.label || '',
        })));
      } else {
        setSources([{ sourceType: 'channel_link', sourceValue: '', label: '' }]);
      }
      
      setShowForm(true);
    } catch (err: any) {
      showToast('Lỗi tải chi tiết dự án: ' + err.message, 'error');
    }
  };

  // Handle source field change
  const handleSourceChange = (idx: number, field: keyof SourceInput, val: string) => {
    const updated = [...sources];
    updated[idx] = { ...updated[idx], [field]: val };
    setSources(updated);
  };

  // Add source row
  const addSourceRow = () => {
    setSources([...sources, { sourceType: 'channel_link', sourceValue: '', label: '' }]);
  };

  // Remove source row
  const removeSourceRow = (idx: number) => {
    if (sources.length === 1) {
      showToast('Dự án phải có ít nhất một nguồn quét!', 'error');
      return;
    }
    setSources(sources.filter((_, i) => i !== idx));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !downloadFolder || !profileId) {
      showToast('Vui lòng điền các thông tin bắt buộc', 'error');
      return;
    }

    const filteredSources = sources.filter(s => s.sourceValue.trim() !== '');
    if (filteredSources.length === 0) {
      showToast('Vui lòng nhập ít nhất một nguồn quét hợp lệ (link hoặc từ khóa)', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      teamId,
      userId,
      profileId: parseInt(profileId, 10),
      name,
      downloadFolder,
      schedule,
      quality,
      minDuration: minDuration === '' ? undefined : Number(minDuration),
      maxDuration: maxDuration === '' ? undefined : Number(maxDuration),
      priority,
      maxVideosPerRun,
      maxTotalVideos,
      sources: filteredSources,
    };

    try {
      let result;
      if (editingProjectId) {
        result = await updateCoccocProjectAction(editingProjectId, teamId, payload);
      } else {
        result = await createCoccocProjectAction(payload);
      }

      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(
          editingProjectId 
            ? 'Cập nhật cấu hình dự án thành công!' 
            : 'Tạo dự án quét video tự động thành công!', 
          'success'
        );
        setShowForm(false);
        router.refresh();
      }
    } catch (err: any) {
      showToast('Có lỗi xảy ra: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Project Active State
  const handleToggle = async (id: number) => {
    try {
      const result = await toggleCoccocProjectAction(id, teamId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(
          result.isActive 
            ? 'Dự án đã được kích hoạt chạy tự động!' 
            : 'Đã tạm dừng dự án.', 
          'success'
        );
        router.refresh();
      }
    } catch (err: any) {
      showToast('Không thể đổi trạng thái dự án: ' + err.message, 'error');
    }
  };

  // Delete Project
  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Toàn bộ nguồn và tác vụ liên quan sẽ bị xóa.')) return;

    try {
      const result = await deleteCoccocProjectAction(id, teamId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Đã xóa dự án thành công!', 'success');
        router.refresh();
      }
    } catch (err: any) {
      showToast('Không thể xóa dự án: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-white animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-emerald-400" />
            Quản lý Dự án Quét Tải
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Thiết lập lịch trình quét kênh video, từ khóa tìm kiếm để tự động tải về thư mục.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          Tạo dự án mới
        </button>
      </div>

      {/* Split Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        
        {/* Cột 1: Danh sách Project (Rút gọn) */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-4">
          {projects.length === 0 ? (
            <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl p-8 text-center text-gray-500 space-y-4 h-full flex flex-col items-center justify-center">
              <FolderOpen className="h-10 w-10 mx-auto text-gray-600 animate-pulse" />
              <p className="text-sm font-bold text-gray-400">Chưa có dự án quét video nào</p>
              <button
                onClick={handleOpenCreate}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-extrabold text-gray-300 hover:text-white transition-all cursor-pointer inline-block"
              >
                Tạo dự án ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin h-full pb-10">
              {projects.map((proj) => (
                <div 
                  key={proj.id} 
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedProjectId === proj.id 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{proj.name}</h3>
                      <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[200px]" title={proj.downloadFolder}>
                        {proj.downloadFolder}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(proj.id); }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all border ${
                        proj.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {proj.isActive ? <Play className="h-2.5 w-2.5 fill-current" /> : <Pause className="h-2.5 w-2.5 fill-current" />}
                      {proj.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span className="bg-white/5 px-2 py-1 rounded-md text-gray-300">{proj.profileName}</span>
                    <span className={proj.schedule === 'manual' ? 'text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-1 rounded-md'}>
                      {proj.schedule === 'manual' ? 'Thủ công' : `Mỗi ${proj.schedule}`}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-4 w-full space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Đã tải: {proj.totalDownloaded}</span>
                      <span>Giới hạn: {proj.maxTotalVideos}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (proj.totalDownloaded / proj.maxTotalVideos) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cột 2: Chi tiết dự án và Tasks */}
        <div className="w-full lg:w-2/3 h-full">
          <div className="bg-gray-950/50 border border-white/5 rounded-2xl h-full overflow-hidden text-gray-100">
            <ProjectTasksManager 
              teamId={teamId} 
              project={selectedProject} 
              onEdit={() => selectedProject && handleOpenEdit(selectedProject)} 
            />
          </div>
        </div>
      </div>

      {/* Dynamic Creation / Edit Modal Drawer */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 scrollbar-thin">
            
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-black">
                  {editingProjectId ? 'Chỉnh sửa Cấu hình Dự án' : 'Tạo Dự án Quét Tải Mới'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Thiết lập các tham số cào, bộ lọc chất lượng và nguồn link video.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: Cấu hình cơ bản */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 select-none">
                  <Settings className="h-3.5 w-3.5" />
                  1. Thông tin cơ bản & Lưu trữ
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Tên dự án *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Tải phim ngắn TikTok, Cào kênh YouTube,..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Profile Cốc Cốc sử dụng *</label>
                    <select
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 outline-none"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Đường dẫn thư mục lưu video tải về (Local Folder Path) *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: C:\Users\Admin\Downloads"
                    value={downloadFolder}
                    onChange={(e) => setDownloadFolder(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-mono"
                  />
                  <p className="text-[10px] text-gray-500">
                    * Worker cục bộ trên máy tính sẽ tự tải video qua Savior vào thư mục cấu hình này.
                  </p>
                </div>
              </div>

              {/* Section 2: Lịch trình & Bộ lọc */}
              <div className="space-y-4 border-t border-white/5 pt-4">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 select-none">
                  <Clock className="h-3.5 w-3.5" />
                  2. Lịch quét & Bộ lọc giới hạn
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Chu kỳ quét (Schedule)</label>
                    <select
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 outline-none"
                    >
                      <option value="manual" className="bg-gray-900">Chỉ chạy thủ công</option>
                      <option value="60m" className="bg-gray-900">Mỗi 60 phút</option>
                      <option value="12h" className="bg-gray-900">Mỗi 12 giờ</option>
                      <option value="24h" className="bg-gray-900">Mỗi 24 giờ</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Chất lượng Savior</label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 outline-none"
                    >
                      <option value="highest" className="bg-gray-900">Ưu tiên Cao nhất</option>
                      <option value="720p" className="bg-gray-900">Ưu tiên 720p (HD)</option>
                      <option value="480p" className="bg-gray-900">Ưu tiên 480p (SD)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Sắp xếp ưu tiên</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 outline-none"
                    >
                      <option value="newest" className="bg-gray-900">Video mới đăng nhất</option>
                      <option value="most_viewed" className="bg-gray-900">Video nhiều lượt xem nhất</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Độ dài Min (giây)</label>
                    <input
                      type="number"
                      placeholder="Không giới hạn"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Độ dài Max (giây)</label>
                    <input
                      type="number"
                      placeholder="Không giới hạn"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value !== '' ? Number(e.target.value) : '')}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Giới hạn video/lần quét</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={maxVideosPerRun}
                      onChange={(e) => setMaxVideosPerRun(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">Giới hạn video/dự án</label>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={maxTotalVideos}
                      onChange={(e) => setMaxTotalVideos(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Danh sách nguồn cào quét */}
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center select-none">
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <ListPlus className="h-3.5 w-3.5" />
                    3. Danh sách Nguồn quét cào (Kênh / Từ khóa)
                  </h4>
                  <button
                    type="button"
                    onClick={addSourceRow}
                    className="flex items-center gap-1 py-1 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Thêm nguồn
                  </button>
                </div>

                <div className="space-y-3">
                  {sources.map((src, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white/[0.01] border border-white/5 p-3.5 rounded-xl items-end md:items-center">
                      <div className="w-full md:w-44 shrink-0 space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Loại nguồn</label>
                        <select
                          value={src.sourceType}
                          onChange={(e) => handleSourceChange(idx, 'sourceType', e.target.value as any)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
                        >
                          <option value="channel_link" className="bg-gray-900">Link kênh</option>
                          <option value="search_keyword" className="bg-gray-900">Từ khóa trong Kênh</option>
                          <option value="direct_link" className="bg-gray-900">Link video trực tiếp</option>
                        </select>
                      </div>

                      {src.sourceType === 'search_keyword' ? (
                        <>
                          <div className="w-full flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Kênh quét mục tiêu *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: https://youtube.com/@channelname"
                              value={src.sourceValue.split(' || ')[0] || ''}
                              onChange={(e) => {
                                const keywordPart = src.sourceValue.split(' || ')[1] || '';
                                handleSourceChange(idx, 'sourceValue', `${e.target.value.trim()} || ${keywordPart}`);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
                            />
                          </div>
                          <div className="w-full flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Từ khóa tìm kiếm *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: review phim nhanh, vlog..."
                              value={src.sourceValue.split(' || ')[1] || ''}
                              onChange={(e) => {
                                const channelPart = src.sourceValue.split(' || ')[0] || '';
                                handleSourceChange(idx, 'sourceValue', `${channelPart} || ${e.target.value.trim()}`);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="w-full flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Giá trị (URL) *</label>
                          <input
                            type="text"
                            required
                            placeholder={
                              src.sourceType === 'channel_link' 
                                ? 'https://youtube.com/@channelname' 
                                : 'URL video cụ thể cần tải'
                            }
                            value={src.sourceValue}
                            onChange={(e) => handleSourceChange(idx, 'sourceValue', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
                          />
                        </div>
                      )}

                      <div className="w-full md:w-36 shrink-0 space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Tên gợi nhớ</label>
                        <input
                          type="text"
                          placeholder="Nhãn (tùy chọn)"
                          value={src.label}
                          onChange={(e) => handleSourceChange(idx, 'label', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500/50 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSourceRow(idx)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                        title="Xóa nguồn quét này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end border-t border-white/5 pt-4 mt-6 select-none">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
