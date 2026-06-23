'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Save, Sparkles, BookOpen, Film } from 'lucide-react';
import { getVideoProjectById, updateVideoProject } from '@/lib/db/video-maker-actions';
import { VideoProject } from '@/lib/db/schema';
import { useToast } from '@/components/ui/toast';

export default function ProjectSettingsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const teamId = parseInt(params.teamId as string, 10);
  const projectId = parseInt(params.projectId as string, 10);

  const [project, setProject] = useState<VideoProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState('');
  const [intro, setIntro] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [videoModel, setVideoModel] = useState('');
  const [directorManual, setDirectorManual] = useState('');

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await getVideoProjectById(teamId, projectId);
      if (data) {
        setProject(data);
        setTitle(data.title || '');
        setProjectType(data.projectType || 'novel');
        setIntro(data.intro || '');
        setArtStyle(data.artStyle || '');
        setImageModel(data.imageModel || '');
        setVideoModel(data.videoModel || '');
        setDirectorManual(data.directorManual || '');
      }
    } catch (err) {
      console.error('Lỗi khi tải project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateVideoProject(teamId, projectId, {
        title,
        projectType,
        intro,
        artStyle,
        imageModel,
        videoModel,
        directorManual
      });
      showToast('Đã lưu Cài đặt Dự án thành công!', 'success');
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      showToast('Lỗi khi lưu cấu hình.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.05] bg-white/[0.01] sticky top-0 z-10 backdrop-blur-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" /> 
            Cài Đặt Dự Án & Sổ Tay Đạo Diễn
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Thiết lập phong cách, cốt truyện và định hướng chung cho toàn bộ Multi-Agent System.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu Cài Đặt
        </Button>
      </div>

      <div className="p-8 max-w-4xl space-y-8">
        
        {/* SECTION 1: THÔNG TIN CƠ BẢN */}
        <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-pink-400" /> Thông tin cơ bản
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Tên dự án</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Loại dự án</label>
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
              >
                <option value="novel">Sáng tác truyện (Novel to Video)</option>
                <option value="script">Kịch bản có sẵn (Script to Video)</option>
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 2: SỔ TAY ĐẠO DIỄN */}
        <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" /> Sổ Tay Đạo Diễn (Director Manual)
          </h2>
          <p className="text-xs text-slate-400 mb-4">Các Agent sẽ đọc sổ tay này trước khi viết kịch bản hay sinh ảnh, giúp giữ tính thống nhất (Consistency) cho toàn bộ dự án.</p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Ý tưởng / Cốt truyện gốc (Intro)</label>
              <textarea 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white h-24 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                placeholder="Tóm tắt ngắn gọn nội dung câu chuyện..."
                value={intro}
                onChange={e => setIntro(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Phong cách Nghệ thuật (Art Style)</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Ví dụ: Cyberpunk, Cinematic lighting, Ghibli style, Photorealistic..."
                value={artStyle}
                onChange={e => setArtStyle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Hướng dẫn Đạo diễn mở rộng (Tuỳ chọn)</label>
              <textarea 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white h-32 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                placeholder="Ghi chú thêm về tone màu chủ đạo (VD: U ám tăm tối, màu sắc rực rỡ), nhịp độ cắt cảnh (Chậm rãi, dồn dập)..."
                value={directorManual}
                onChange={e => setDirectorManual(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: AI MODELS */}
        <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Lựa chọn AI Model (Mặc định)
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Image Model</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ví dụ: midjourney, flux, stable-diffusion-3"
                value={imageModel}
                onChange={e => setImageModel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Video Model</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ví dụ: runway-gen3, luma-dream-machine, kling"
                value={videoModel}
                onChange={e => setVideoModel(e.target.value)}
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
