'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getDubProjectsAction,
  createDubProjectAction,
  updateDubProjectAction,
  deleteDubProjectAction
} from '@/lib/db/hero-dub-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { FolderGit2, Plus, Loader2, Save, Trash2, Edit2, X, Upload, ArrowLeft, Image, Video, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { DubProjectSidebar } from './dub-project-sidebar';

interface ProjectsClientProps {
  teamId: number;
}

export default function ProjectsClient({ teamId }: ProjectsClientProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [outroVideoUrl, setOutroVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await getDubProjectsAction(teamId);
      if (res.success && res.projects) {
        setProjects(res.projects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (proj: any) => {
    setActiveProjectId(proj.id);
    setName(proj.name || '');
    setLogoUrl(proj.logoUrl || '');
    setLogoPosition(proj.logoPosition || 'top-left');
    setIntroVideoUrl(proj.introVideoUrl || '');
    setOutroVideoUrl(proj.outroVideoUrl || '');
    setIsEditing(true);
  };

  const handleStartCreate = () => {
    setActiveProjectId(null);
    setName('');
    setLogoUrl('');
    setLogoPosition('top-left');
    setIntroVideoUrl('');
    setOutroVideoUrl('');
    setIsEditing(true);
  };

  const resetForm = () => {
    setActiveProjectId(null);
    setName('');
    setLogoUrl('');
    setLogoPosition('top-left');
    setIntroVideoUrl('');
    setOutroVideoUrl('');
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      showToast('Đang tải lên...', 'success');
      const res = await fetch('/api/hero-dub/local-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setter(data.localPath);
        showToast('Đã chọn file thành công!', 'success');
      } else {
        throw new Error(data.error || 'Lỗi tải file');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Tên thương hiệu không được để trống!', 'error');
      return;
    }
    
    setSaving(true);
    try {
      if (activeProjectId) {
        const res = await updateDubProjectAction(activeProjectId, teamId, {
          name: name.trim(),
          logoUrl: logoUrl.trim() || undefined,
          logoPosition,
          introVideoUrl: introVideoUrl.trim() || undefined,
          outroVideoUrl: outroVideoUrl.trim() || undefined,
        });
        if (res.error) throw new Error(res.error);
        showToast('Cập nhật thương hiệu thành công!', 'success');
      } else {
        const res = await createDubProjectAction({
          teamId,
          name: name.trim(),
          logoUrl: logoUrl.trim() || undefined,
          logoPosition,
          introVideoUrl: introVideoUrl.trim() || undefined,
          outroVideoUrl: outroVideoUrl.trim() || undefined,
        });
        if (res.error) throw new Error(res.error);
        showToast('Tạo thương hiệu thành công!', 'success');
      }
      loadProjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa thương hiệu này? Các video đã lồng tiếng sẽ không bị ảnh hưởng.')) return;
    try {
      const res = await deleteDubProjectAction(id, teamId);
      if (res.error) throw new Error(res.error);
      showToast('Xóa thương hiệu thành công', 'success');
      if (activeProjectId === id) {
        resetForm();
      }
      loadProjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-gray-100 font-sans">
      {/* Cột Trái: Sidebar danh sách thương hiệu */}
      <DubProjectSidebar
        projects={projects}
        activeProjectId={activeProjectId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectProject={handleSelectProject}
        onCreateProject={handleStartCreate}
        onDeleteProject={handleDelete}
      />

      {/* Cột Phải: Nội dung chính / Form quản lý */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto custom-scrollbar">
        {/* Header trên cùng */}
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href={`/hero-dub/t/${teamId}/dashboard`}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Dashboard
            </Link>
            <span className="text-gray-600">|</span>
            <span className="text-xs text-gray-400 font-medium">Quản lý cấu hình Logo & Intro/Outro cho Video</span>
          </div>

          {!isEditing && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors"
            >
              <Plus className="h-4 w-4" /> Tạo thương hiệu mới
            </button>
          )}
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 p-6 max-w-4xl w-full mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : !isEditing ? (
            /* Empty State khi chưa chọn hoặc chưa bấm Tạo */
            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-12 text-center my-12 bg-gray-900/20">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <FolderGit2 className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Vui lòng chọn hoặc tạo Thương hiệu</h3>
              <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
                Thương hiệu giúp tự động gắn Logo Watermark, ghép Video Intro đầu nguồn và Outro kết thúc cho các bản ghi lồng tiếng AI.
              </p>
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/10 transition-all"
              >
                <Plus className="w-4 h-4" /> Tạo thương hiệu đầu tiên
              </button>
            </div>
          ) : (
            /* Form Chỉnh Sửa / Tạo Mới dạng Card lớn */
            <div className="bg-gray-900/40 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                    {activeProjectId ? `Cấu hình thương hiệu: ${name}` : 'Tạo thương hiệu mới'}
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Điền các thông số nhận diện thương hiệu để áp dụng tự động cho các video lồng tiếng</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeProjectId && (
                    <button
                      onClick={(e) => handleDelete(activeProjectId, e)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                      title="Xóa thương hiệu"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa
                    </button>
                  )}
                  <button 
                    onClick={resetForm} 
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    title="Đóng form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {/* 1. Tên Thương Hiệu */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    Tên thương hiệu <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Kênh TikTok Review Phim / Branding Mèo"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-colors placeholder:text-gray-600 font-medium"
                    required
                  />
                </div>

                {/* 2. Cấu hình Logo */}
                <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Image className="w-4 h-4" /> Watermark Logo
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-400">Đường dẫn file Logo (.png, .jpg)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="VD: C:\Logo\my-logo.png"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                        />
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300 shrink-0">
                          <Upload className="h-3.5 w-3.5 text-amber-500" />
                          Chọn file
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, setLogoUrl)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-400">Vị trí Logo hiển thị</label>
                      <select
                        value={logoPosition}
                        onChange={(e) => setLogoPosition(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="top-left">Góc trên bên trái</option>
                        <option value="top-right">Góc trên bên phải</option>
                        <option value="bottom-left">Góc dưới bên trái</option>
                        <option value="bottom-right">Góc dưới bên phải</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Intro & Outro Video */}
                <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <Video className="w-4 h-4" /> Video Intro & Outro
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Intro */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-400">Video Intro (Mở đầu)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={introVideoUrl}
                          onChange={(e) => setIntroVideoUrl(e.target.value)}
                          placeholder="VD: C:\Videos\intro.mp4"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                        />
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300 shrink-0">
                          <Upload className="h-3.5 w-3.5 text-amber-500" />
                          Chọn file
                          <input 
                            type="file" 
                            accept="video/mp4, video/quicktime" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, setIntroVideoUrl)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Outro */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-gray-400">Video Outro (Kết thúc)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={outroVideoUrl}
                          onChange={(e) => setOutroVideoUrl(e.target.value)}
                          placeholder="VD: C:\Videos\outro.mp4"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                        />
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300 shrink-0">
                          <Upload className="h-3.5 w-3.5 text-amber-500" />
                          Chọn file
                          <input 
                            type="file" 
                            accept="video/mp4, video/quicktime" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, setOutroVideoUrl)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs tracking-wide shadow-lg shadow-orange-500/10 transition-all"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu Thương Hiệu
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
