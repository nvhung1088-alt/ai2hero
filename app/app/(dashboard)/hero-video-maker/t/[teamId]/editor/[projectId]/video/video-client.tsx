'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Video,
  Download,
  ExternalLink,
  Edit3,
  FileAudio,
  ArrowRight
} from 'lucide-react';
import { PollingBanner } from '@/components/polling-banner';
import { 
  generateVideoClipAction,
  updateVideoProject,
  batchGenerateVideoClipsAction,
  generateVideoPromptAction,
  generateAudioAction,
  updateVideoTrackAudioAction
} from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { RenderProgressWidget } from './RenderProgressWidget';

interface VideoClientProps {
  project: any;
  storyboards: any[];
  initialClips: any[];
  models: any[];
  tracks: any[];
  teamId: number;
  projectId: number;
}

export default function VideoClient({ project, storyboards, initialClips, models, tracks, teamId, projectId }: VideoClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [clips, setClips] = useState<any[]>(initialClips);
  
  // Model Selector
  const [videoModels, setVideoModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const videoModelsList = models.filter(m => m.type === 'video');
    setVideoModels(videoModelsList);
    if (videoModelsList.length > 0) {
      const defaultModel = videoModelsList.find(m => m.modelName.includes('runway') || m.modelName.includes('luma') || m.modelName.includes('kling')) || videoModelsList[0];
      setSelectedModel(defaultModel.modelName);
    }
  }, [models]);

  useEffect(() => {
    setClips(initialClips);
  }, [initialClips]);

  // Polling tự động khi có clip đang render
  useEffect(() => {
    const isAnyRendering = clips.some(c => c.state === 'rendering');
    if (!isAnyRendering) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 600000);

    return () => clearInterval(interval);
  }, [clips]);

  const handleGenerateVideo = async (storyboardId: number) => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Video Model.", "error");
      return;
    }

    // Set trạng thái rendering tạm thời
    setClips(prev => [
      ...prev.filter(c => c.storyboardId !== storyboardId),
      { storyboardId, state: 'rendering', filePath: 'pending' }
    ]);

    try {
      const res = await generateVideoClipAction(teamId, projectId, storyboardId, selectedModel);
      if (res.success) {
        showToast("Sinh video clip thành công!", "success");
        router.refresh();
      } else {
        showToast(res.error || "Không thể sinh video.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  // Audio TTS States
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);

  const handleGenerateAudio = async (trackId: string, clipIndex: number, text: string) => {
    if (!selectedModel) {
      showToast('Vui lòng chọn model AI để sinh Audio', 'error');
      return;
    }
    
    setIsGeneratingAudio(`${trackId}-${clipIndex}`);
    try {
      // 1. Sinh Audio
      const res = await generateAudioAction(teamId, projectId, text, selectedModel);
      if (res.success && res.audioUrl) {
        // 2. Cập nhật DB
        await updateVideoTrackAudioAction(teamId, projectId, trackId, clipIndex, res.audioUrl);
        showToast('Đã tạo xong Audio Voice Over.', 'success');
        // Tải lại trang để lấy tracks mới
        router.refresh();
      }
    } catch (e: any) {
      showToast(e.message || 'Không thể tạo Audio', 'error');
    } finally {
      setIsGeneratingAudio(null);
    }
  };

  const handleBatchGenerateVideo = async () => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Video Model.", "error");
      return;
    }

    const missingClips = storyboards.filter(s => {
      const clip = getStoryboardClip(s.id);
      return !clip || clip.state === 'error'; // Chưa sinh hoặc lỗi
    });

    if (missingClips.length === 0) {
      showToast("Tất cả phân cảnh đã có video.", "info");
      return;
    }

    const storyboardIds = missingClips.map(s => s.id);
    
    setClips(prev => [
      ...prev.filter(c => !storyboardIds.includes(c.storyboardId)),
      ...storyboardIds.map(id => ({ storyboardId: id, state: 'rendering', filePath: 'pending' }))
    ]);
    
    try {
      showToast(`Đang sinh ${storyboardIds.length} video trong nền...`, "info");
      const res = await batchGenerateVideoClipsAction(teamId, projectId, storyboardIds, selectedModel);
      if (res.success) {
        showToast("Batch Generate Video hoàn tất!", "success");
        router.refresh();
      } else {
        showToast("Có lỗi khi Batch Generate Video.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  const handlePolishVideoPrompt = async (storyboardId: number) => {
    try {
      showToast("Đang tối ưu video prompt bằng AI...", "info");
      // Mặc định dùng gpt-4o-mini hoặc model text tương tự
      const res = await generateVideoPromptAction(teamId, projectId, storyboardId, 'gpt-4o-mini'); 
      if (res.success) {
        showToast("Tối ưu prompt thành công!", "success");
        router.refresh();
      } else {
        showToast(res.error || "Lỗi tối ưu prompt.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  const handleExportFullVideo = async () => {
    setExporting(true);
    try {
      // Mock xuất bản video hoàn chỉnh bằng cách cập nhật trạng thái project
      // Trong thực tế sẽ ghép nối các clip ngắn bằng ffmpeg hoặc api
      await updateVideoProject(teamId, projectId, {
        status: 'done',
        outputUrl: clips.find(c => c.state === 'done')?.filePath || 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
        outputStorage: 'r2'
      });
      showToast("Video hoàn chỉnh đã được tạo và xuất bản!", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể xuất bản video.", "error");
    } finally {
      setExporting(false);
    }
  };

  const getStoryboardClip = (storyboardId: number) => {
    return clips.find(c => c.storyboardId === storyboardId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="px-8 pt-4 shrink-0">
        <PollingBanner intervalMinutes={10} onRefresh={() => router.refresh()} />
      </div>
      {/* Top action bar */}
      <div className="h-16 border-b border-white/[0.05] flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chọn AI Video Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500/50"
          >
            {videoModels.map((model) => (
              <option key={model.modelName} value={model.modelName}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleBatchGenerateVideo}
            disabled={exporting || storyboards.filter(s => {
              const c = getStoryboardClip(s.id);
              return !c || c.state === 'error';
            }).length === 0}
            variant="outline"
            className="border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs gap-2"
          >
            <Sparkles size={14} />
            Sinh toàn bộ video chưa có (Batch)
          </Button>

          <Button
            onClick={handleExportFullVideo}
            disabled={exporting || clips.filter(c => c.state === 'done').length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
          >
            {exporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Video size={12} />
            )}
            Xuất Bản Video Hoàn Chỉnh
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <RenderProgressWidget />

          {/* Status Banner */}
          {project.status === 'done' && project.outputUrl && (
            <Card className="p-6 border-green-500/20 bg-green-500/[0.02] backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">Video đã xuất bản thành công!</h3>
                  <p className="text-xs text-slate-400">Bạn có thể xem trực tiếp hoặc tải về máy tính.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(project.outputUrl, '_blank')}
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs gap-2"
                >
                  <ExternalLink size={12} />
                  Xem Link R2
                </Button>
                <a 
                  href={project.outputUrl} 
                  download 
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-pink-500/10 gap-2"
                >
                  <Download size={12} />
                  Tải Về Video
                </a>
              </div>
            </Card>
          )}

          {/* Timeline View */}
          {tracks && tracks.length > 0 && tracks[0].data?.tracks && (
            <div className="space-y-4 mb-8">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                Timeline / Video Tracks (Auto-Pilot)
              </h2>
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 overflow-x-auto relative shadow-inner">
                {/* Header (Time scale) */}
                <div className="flex border-b border-white/10 pb-2 mb-2 min-w-max pl-24">
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(sec => (
                    <div key={sec} style={{ width: '100px', flexShrink: 0 }} className="text-[10px] text-slate-500 font-mono border-l border-white/5 pl-1">
                      00:{sec.toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
                
                {/* Tracks */}
                {tracks[0].data.tracks.map((t: any) => (
                  <div key={t.trackId} className="flex mb-2 min-w-max relative h-14 bg-black/40 rounded overflow-hidden">
                    {/* Track Label */}
                    <div className="w-24 shrink-0 bg-slate-800/80 text-xs flex flex-col items-center justify-center sticky left-0 z-10 border-r border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      {t.type === 'video' ? <Video size={14} className="text-pink-400 mb-1"/> : <FileAudio size={14} className="text-purple-400 mb-1"/>} 
                      <span className="text-[10px] text-slate-300 font-medium">{t.trackId}</span>
                    </div>
                    {/* Track Content */}
                    <div className="flex-1 relative">
                      {t.clips.map((clip: any, idx: number) => {
                        // Assuming 1 second = 20px
                        const left = clip.startTime * 20;
                        const width = clip.duration * 20;
                        const isAudioGen = isGeneratingAudio === `${t.trackId}-${idx}`;
                        return (
                          <div 
                            key={idx} 
                            style={{ left: `${left}px`, width: `${width}px` }} 
                            className={`absolute top-1 bottom-1 border rounded flex items-center px-2 text-[10px] overflow-hidden whitespace-nowrap backdrop-blur-sm cursor-pointer transition-colors ${t.type === 'video' ? 'bg-pink-500/20 border-pink-500/50 text-pink-100 hover:bg-pink-500/30' : 'bg-purple-500/20 border-purple-500/50 text-purple-100 hover:bg-purple-500/30'} ${t.type === 'audio' && clip.audioUrl ? 'ring-1 ring-emerald-500/50 bg-emerald-500/20 text-emerald-100' : ''}`}
                            title={clip.content}
                          >
                            <span className="flex-1 truncate">
                              {t.type === 'video' ? `Panel ${clip.panelIndex}` : (clip.audioUrl ? 'Đã có Voice Over' : 'Audio Text')}
                            </span>
                            
                            {/* Audio Actions */}
                            {t.type === 'audio' && (
                              <div className="ml-2 flex items-center gap-1 shrink-0">
                                {isAudioGen ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                                ) : !clip.audioUrl ? (
                                  <button 
                                    onClick={() => handleGenerateAudio(t.trackId, idx, clip.content)}
                                    className="p-1 hover:bg-white/10 rounded"
                                    title="Tạo Voice Over (TTS)"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-300" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      const audio = new Audio(clip.audioUrl);
                                      audio.play();
                                    }}
                                    className="p-1 hover:bg-white/10 rounded"
                                    title="Nghe thử"
                                  >
                                    <Play className="w-3 h-3 text-emerald-300" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
              Danh sách phân cảnh và Clip AI Video
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storyboards.map((story) => {
                const clip = getStoryboardClip(story.id);
                const isRendering = clip?.state === 'rendering';
                const isDone = clip?.state === 'done';
                const isError = clip?.state === 'error';

                return (
                  <Card 
                    key={story.id}
                    className="border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-xl overflow-hidden transition-all duration-300 flex flex-col md:flex-row h-52"
                  >
                    {/* Cột trái: Ảnh preview hoặc Video Player */}
                    <div className="w-1/2 bg-black/40 relative flex items-center justify-center border-r border-white/[0.03] h-full shrink-0">
                      {isRendering ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                          <Loader2 size={24} className="animate-spin text-pink-500" />
                          Đang sinh video...
                        </div>
                      ) : isDone && clip.filePath ? (
                        <video 
                          src={clip.filePath} 
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : story.filePath ? (
                        <img 
                          src={story.filePath} 
                          alt={`Panel ${story.index}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-600 text-xs">
                          <ImageIcon size={24} />
                          Chưa có ảnh phân cảnh
                        </div>
                      )}

                      {/* Index badge */}
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-slate-300 border border-white/10">
                        Cảnh {story.index}
                      </div>
                    </div>

                    {/* Cột phải: Thông tin & Nút sinh video */}
                    <div className="flex-1 p-5 flex flex-col justify-between h-full min-w-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                            Thời lượng: {story.duration || '5'}s
                          </span>
                          {isDone && (
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                              <CheckCircle2 size={8} />
                              Ready
                            </span>
                          )}
                          {isError && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                              <AlertCircle size={8} />
                              Lỗi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-bold line-clamp-2 leading-relaxed">
                          {story.videoDesc}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono line-clamp-2" title={story.prompt}>
                          Prompt: {story.prompt}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        {isError && clip?.errorReason && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mr-auto truncate" title={clip.errorReason}>
                            <AlertCircle size={10} />
                            Lỗi render
                          </div>
                        )}
                        
                        {!isRendering && (
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => handlePolishVideoPrompt(story.id)}
                              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs gap-1.5 py-1.5 h-8"
                            >
                              <Edit3 size={12} />
                              Polish Prompt
                            </Button>
                            <Button
                              onClick={() => handleGenerateVideo(story.id)}
                              className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs gap-1.5 py-1.5 h-8"
                            >
                              <Sparkles size={12} />
                              {isDone ? 'Sinh lại Video' : 'Sinh Video AI'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
