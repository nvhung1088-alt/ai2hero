'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getDubProjectsAction,
  createDubProjectAction,
  updateDubProjectAction,
  deleteDubProjectAction
} from '@/lib/db/hero-dub-actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { FolderGit2, Plus, Loader2, Save, Trash2, Edit2, X, Upload } from 'lucide-react';
import Link from 'next/link';

interface ProjectsClientProps {
  teamId: number;
}

export default function ProjectsClient({ teamId }: ProjectsClientProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
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

  const handleOpenLocal = async (path: string, isFolder: boolean = false) => {
    try {
      await fetch('/api/hero-dub/open-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, isFolder }),
      });
    } catch (e) {
      console.error('Failed to open local path', e);
    }
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

  const handleEdit = (proj: any) => {
    setEditId(proj.id);
    setName(proj.name || '');
    setLogoUrl(proj.logoUrl || '');
    setLogoPosition(proj.logoPosition || 'top-left');
    setIntroVideoUrl(proj.introVideoUrl || '');
    setOutroVideoUrl(proj.outroVideoUrl || '');
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setLogoUrl('');
    setLogoPosition('top-left');
    setIntroVideoUrl('');
    setOutroVideoUrl('');
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Tên thương hiệu không được để trống!', 'error');
      return;
    }
    
    setSaving(true);
    try {
      if (editId) {
        const res = await updateDubProjectAction(editId, teamId, {
          name: name.trim(),
          logoUrl: logoUrl.trim() || undefined,
          logoPosition,
          introVideoUrl: introVideoUrl.trim() || undefined,
          outroVideoUrl: outroVideoUrl.trim() || undefined,
        });
        if (res.error) throw new Error(res.error);
        showToast('Cập nhật thành công!', 'success');
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
      resetForm();
      loadProjects();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thương hiệu này? Các video đã dịch sẽ không bị ảnh hưởng.')) return;
    try {
      const res = await deleteDubProjectAction(id, teamId);
      if (res.error) throw new Error(res.error);
      showToast('Xóa thương hiệu thành công', 'success');
      loadProjects();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black text-gray-100 min-h-screen custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link 
              href={`/hero-dub/t/${teamId}/dashboard`}
              className="text-gray-400 hover:text-white transition-colors text-sm font-medium mr-2"
            >
              &larr; Quay lại
            </Link>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <FolderGit2 className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h1 className="text-base font-black text-white uppercase tracking-wider">Quản lý Thương hiệu (Branding)</h1>
              <p className="text-[10px] text-gray-500 font-medium">Thiết lập cấu hình Logo, Intro, Outro mặc định để dùng chung cho nhiều video.</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors"
            >
              <Plus className="h-4 w-4" /> Tạo thương hiệu
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form */}
        {isEditing && (
          <div className="lg:col-span-1">
            <div className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl shadow-sm backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">{editId ? 'Sửa thương hiệu' : 'Tạo thương hiệu mới'}</h3>
                <button onClick={resetForm} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tên thương hiệu <span className="text-amber-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Kênh TikTok Mèo"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">File Logo (Watermark)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="VD: C:\Logo\my-logo.png"
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300">
                      <Upload className="h-3.5 w-3.5" />
                      Chọn file
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, setLogoUrl)}
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-gray-500">Đường dẫn file ảnh (.png, .jpg) trên máy tính.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Vị trí Logo</label>
                  <select
                    value={logoPosition}
                    onChange={(e) => setLogoPosition(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55"
                  >
                    <option value="top-left">Góc trên bên trái</option>
                    <option value="top-right">Góc trên bên phải</option>
                    <option value="bottom-left">Góc dưới bên trái</option>
                    <option value="bottom-right">Góc dưới bên phải</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Video Intro (Mở đầu)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={introVideoUrl}
                      onChange={(e) => setIntroVideoUrl(e.target.value)}
                      placeholder="VD: C:\Videos\intro.mp4"
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300">
                      <Upload className="h-3.5 w-3.5" />
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Video Outro (Kết thúc)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={outroVideoUrl}
                      onChange={(e) => setOutroVideoUrl(e.target.value)}
                      placeholder="VD: C:\Videos\outro.mp4"
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/55"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors text-xs font-bold text-gray-300">
                      <Upload className="h-3.5 w-3.5" />
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

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-orange-500/10 transition-all"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu Thương hiệu
                </button>
              </form>
            </div>
          </div>
        )}

        {/* List */}
        <div className={isEditing ? "lg:col-span-2" : "lg:col-span-3"}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-gray-900/40 border border-white/5 p-10 rounded-2xl text-center space-y-3 flex flex-col items-center">
              <FolderGit2 className="h-10 w-10 text-gray-600 mb-2" />
              <p className="text-gray-400 text-sm font-bold">Chưa có thương hiệu nào.</p>
              <p className="text-xs text-gray-500">Tạo thương hiệu để đính kèm Logo, Intro, Outro tự động cho video.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-gray-900/40 border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-sm font-black text-white line-clamp-1">{proj.name}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(proj)} className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-lg">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(proj.id)} className="p-1.5 text-red-500 hover:text-red-400 bg-red-500/10 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Logo:</span>
                      {proj.logoUrl ? (
                        <button onClick={() => handleOpenLocal(proj.logoUrl)} className="text-amber-500 hover:underline max-w-[150px] truncate" title={proj.logoUrl}>
                          {proj.logoUrl.split('\\').pop() || proj.logoUrl.split('/').pop()}
                        </button>
                      ) : <span className="text-gray-600">-</span>}
                    </div>
                    {proj.logoUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Vị trí:</span>
                        <span className="text-gray-300 bg-white/5 px-1.5 rounded">{proj.logoPosition}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-gray-500 font-medium">Intro:</span>
                      {proj.introVideoUrl ? (
                        <button onClick={() => handleOpenLocal(proj.introVideoUrl)} className="text-amber-500 hover:underline max-w-[150px] truncate" title={proj.introVideoUrl}>
                          {proj.introVideoUrl.split('\\').pop() || proj.introVideoUrl.split('/').pop()}
                        </button>
                      ) : <span className="text-gray-600">-</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Outro:</span>
                      {proj.outroVideoUrl ? (
                        <button onClick={() => handleOpenLocal(proj.outroVideoUrl)} className="text-amber-500 hover:underline max-w-[150px] truncate" title={proj.outroVideoUrl}>
                          {proj.outroVideoUrl.split('\\').pop() || proj.outroVideoUrl.split('/').pop()}
                        </button>
                      ) : <span className="text-gray-600">-</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
