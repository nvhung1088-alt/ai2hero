'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Film, Clock, PlayCircle, X, Settings, CheckCircle2, ImageIcon, Trash2 } from 'lucide-react';
import { getVideoProjects, createVideoProject, deleteVideoProject } from '@/lib/db/video-maker-actions';
import { VideoProject } from '@/lib/db/schema';
import Link from 'next/link';
import presetsData from '@/lib/hero-video-maker/presets.json';
import Image from 'next/image';

export default function VideoProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = parseInt(params.teamId as string, 10);

  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Setup form states
  const [setupData, setSetupData] = useState({
    title: '',
    projectType: 'novel',
    intro: '',
    artStyle: '',
    imageModel: 'dall-e-3',
    videoModel: 'hunyuan-video'
  });

  // Preset selection mode: 'preset' | 'custom'
  const [artTab, setArtTab] = useState<'preset' | 'custom'>('preset');
  const [storyTab, setStoryTab] = useState<'preset' | 'custom'>('preset');
  const artSkills = presetsData?.artSkills || [];
  const storySkills = presetsData?.storySkills || [];
  const [selectedArtId, setSelectedArtId] = useState(artSkills[0]?.id || '');
  const [selectedStoryId, setSelectedStoryId] = useState(storySkills[0]?.id || '');

  useEffect(() => {
    loadProjects();
  }, [teamId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getVideoProjects(teamId);
      setProjects(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách dự án:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dự án này? Thao tác không thể hoàn tác.')) return;
    try {
      setDeletingId(id);
      await deleteVideoProject(teamId, id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa dự án:', err);
      alert('Không thể xóa dự án. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateNew = async () => {
    try {
      setCreating(true);

      // Resolve Art Style: nếu chọn preset → lấy prompt từ presetsData
      let finalArtStyle = setupData.artStyle;
      if (artTab === 'preset' && selectedArtId) {
        const found = artSkills.find(s => s.id === selectedArtId);
        if (found) finalArtStyle = found.prompt;
      }

      // Resolve Director Manual: nếu chọn preset → lấy prompt từ presetsData
      let finalIntro = setupData.intro;
      if (storyTab === 'preset' && selectedStoryId) {
        const found = storySkills.find(s => s.id === selectedStoryId);
        if (found) finalIntro = found.prompt;
      }

      const newProject = await createVideoProject(teamId, {
        title: setupData.title || 'Dự án Video ' + new Date().toLocaleDateString('vi-VN'),
        projectType: setupData.projectType,
        intro: finalIntro,
        artStyle: finalArtStyle,
        directorManual: finalIntro, // Ghi cả vào directorManual cho Super Agent đọc
        imageModel: setupData.imageModel,
        videoModel: setupData.videoModel,
        status: 'draft'
      });
      router.push(`/hero-video-maker/t/${teamId}/editor/${newProject.id}/${setupData.projectType}`);
    } catch (err) {
      console.error('Lỗi khi tạo dự án:', err);
      alert('Không thể tạo dự án mới. Vui lòng thử lại.');
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dự án Video</h1>
          <p className="text-gray-500 mt-1">Quản lý và tạo các video AI tự động bằng Storyboard</p>
        </div>
        <Button onClick={() => setShowSetup(true)} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Tạo dự án mới
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 border-dashed">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <Film className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Chưa có dự án nào</h3>
          <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6">
            Bắt đầu tạo video AI của bạn bằng cách thêm dự án mới. Bạn có thể sinh kịch bản và storyboard hoàn toàn tự động.
          </p>
          <Button onClick={() => setShowSetup(true)} disabled={creating} variant="outline" className="border-indigo-200 text-indigo-700">
            Tạo dự án đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="bg-[#0f0f13] border-white/10 hover:border-white/20 hover:shadow-xl transition-all flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-white line-clamp-1" title={project.title}>
                    {project.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border
                      ${project.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        project.status === 'draft' ? 'bg-white/5 text-slate-300 border-white/10' : 
                        project.status === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                      {project.status === 'draft' ? 'Bản nháp' :
                       project.status === 'generating' ? 'Đang tạo' :
                       project.status === 'ready_to_render' ? 'Chờ Render' :
                       project.status === 'rendering' ? 'Đang Render' :
                       project.status === 'done' ? 'Hoàn thành' : 'Lỗi'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      disabled={deletingId === project.id}
                      className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-md transition-colors"
                      title="Xóa dự án"
                    >
                      {deletingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 flex-grow">
                <div className="flex items-center text-sm text-slate-400 mb-2">
                  <Clock className="w-4 h-4 mr-2 text-slate-500" />
                  Cập nhật: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                </div>
                <div className="flex items-center text-sm text-slate-400">
                  <Film className="w-4 h-4 mr-2 text-slate-500" />
                  Scenes: {Array.isArray(project.scenes) ? project.scenes.length : 0}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 flex gap-2">
                <Link href={`/hero-video-maker/t/${teamId}/editor/${project.id}`} className="w-full">
                  <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium border-0">
                    Mở Editor
                  </Button>
                </Link>
                {project.outputUrl && (
                  <Button variant="outline" size="icon" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5" onClick={() => window.open(project.outputUrl!, '_blank')}>
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* PROJECT SETUP WIZARD MODAL */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#08080c] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col text-white">
            <button 
              onClick={() => setShowSetup(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-white z-10"
              type="button"
            >
              <X size={20} />
            </button>
            
            {/* Header cố định */}
            <div className="p-6 pb-4 border-b border-white/5 shrink-0">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> Cài đặt & Sổ tay Đạo diễn
              </h2>
              <p className="text-sm text-slate-400">Định hướng phong cách và kịch bản gốc để AI bám sát xuyên suốt dự án.</p>
            </div>

            {/* Body scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Tên dự án & Loại dự án */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Tên dự án</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ví dụ: Chiến binh Ngân hà"
                    value={setupData.title}
                    onChange={e => setSetupData({...setupData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Loại dự án</label>
                  <select 
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={setupData.projectType}
                    onChange={e => setSetupData({...setupData, projectType: e.target.value})}
                  >
                    <option value="novel">Sáng tác truyện (Novel to Video)</option>
                    <option value="script">Kịch bản có sẵn (Script to Video)</option>
                  </select>
                </div>
              </div>

              {/* Models Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Mô hình Sinh Ảnh</label>
                  <select 
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={setupData.imageModel}
                    onChange={e => setSetupData({...setupData, imageModel: e.target.value})}
                  >
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="midjourney">Midjourney</option>
                    <option value="stable-diffusion">Stable Diffusion 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Mô hình Sinh Video</label>
                  <select 
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={setupData.videoModel}
                    onChange={e => setSetupData({...setupData, videoModel: e.target.value})}
                  >
                    <option value="hunyuan-video">Hunyuan Video</option>
                    <option value="runway-gen3">Runway Gen-3</option>
                    <option value="luma-dream-machine">Luma Dream Machine</option>
                    <option value="kling-ai">Kling AI</option>
                  </select>
                </div>
              </div>

              {/* PHONG CÁCH NGHỆ THUẬT (Art Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Phong cách Nghệ thuật (Art Style)</label>
                  
                  {/* Tab switcher */}
                  <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setArtTab('preset')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        artTab === 'preset'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtTab('custom')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        artTab === 'custom'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {artTab === 'preset' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {presetsData.artSkills.map(style => (
                      <div 
                        key={style.id}
                        onClick={() => setSelectedArtId(style.id)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${
                          selectedArtId === style.id ? 'border-pink-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="aspect-video relative bg-slate-800">
                          {style.imageUrl ? (
                            <Image src={style.imageUrl} alt={style.name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="text-xs font-bold text-white leading-tight"># {style.name}</h4>
                        </div>
                        {selectedArtId === style.id && (
                          <div className="absolute top-2 right-2 text-pink-400 bg-black/50 rounded-full z-10">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input 
                      type="text" 
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Ví dụ: Cyberpunk, Cinematic, Ghibli studio, 8k resolution..."
                      value={setupData.artStyle}
                      onChange={e => setSetupData({...setupData, artStyle: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {/* SỔ TAY ĐẠO DIỄN (Story Skills / Intro) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sổ tay đạo diễn (Story Skills)</label>
                  
                  {/* Tab switcher */}
                  <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setStoryTab('preset')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        storyTab === 'preset'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryTab('custom')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        storyTab === 'custom'
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {storyTab === 'preset' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {presetsData.storySkills.map(skill => (
                      <div 
                        key={skill.id}
                        onClick={() => setSelectedStoryId(skill.id)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${
                          selectedStoryId === skill.id ? 'border-purple-500 scale-[0.98]' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="aspect-video relative bg-slate-800">
                          {skill.imageUrl ? (
                            <Image src={skill.imageUrl} alt={skill.name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h4 className="text-xs font-bold text-white leading-tight"># {skill.name}</h4>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wide">Gói thủ pháp đạo diễn</p>
                        </div>
                        {selectedStoryId === skill.id && (
                          <div className="absolute top-2 right-2 text-purple-400 bg-black/50 rounded-full z-10">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <textarea 
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-24 focus:outline-none focus:border-indigo-500"
                      placeholder="Nhập tóm tắt cốt truyện hoặc bối cảnh chung. AI sẽ dùng thông tin này để giữ tính nhất quán cho các phân cảnh và nhân vật."
                      value={setupData.intro}
                      onChange={e => setSetupData({...setupData, intro: e.target.value})}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Footer cố định */}
            <div className="p-4 border-t border-white/5 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setShowSetup(false)} className="text-slate-300 hover:text-white" type="button">
                Hủy
              </Button>
              <Button onClick={handleCreateNew} disabled={creating} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6" type="button">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Khởi tạo dự án
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
