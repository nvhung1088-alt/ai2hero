'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Film, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Edit3, 
  Trash2, 
  Loader2, 
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Save,
  Clock
} from 'lucide-react';
import { PollingBanner } from '@/components/polling-banner';
import { 
  createVideoStoryboard, 
  updateVideoStoryboard, 
  deleteVideoStoryboard, 
  generateStoryboardImageAction,
  bulkCreateVideoStoryboards,
  batchGenerateStoryboardImagesAction
} from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';

interface StoryboardClientProps {
  project: any;
  initialStoryboards: any[];
  scripts: any[];
  models: any[];
  teamId: number;
  projectId: number;
}

export default function StoryboardClient({ project, initialStoryboards, scripts, models, teamId, projectId }: StoryboardClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [storyboards, setStoryboards] = useState<any[]>(initialStoryboards);
  
  // Model Selector
  const [imageModels, setImageModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Dialog States
  const [editingStoryboard, setEditingStoryboard] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form Create States
  const [newPrompt, setNewPrompt] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState('5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const imageModelsList = models.filter(m => m.type === 'image');
    setImageModels(imageModelsList);
    if (imageModelsList.length > 0) {
      const defaultModel = imageModelsList.find(m => m.modelName.includes('midjourney') || m.modelName.includes('flux') || m.modelName.includes('sdxl')) || imageModelsList[0];
      setSelectedModel(defaultModel.modelName);
    }
  }, [models]);

  useEffect(() => {
    // Sắp xếp theo index tăng dần
    const sorted = [...initialStoryboards].sort((a, b) => a.index - b.index);
    setStoryboards(sorted);
  }, [initialStoryboards]);

  // Polling tự động khi có storyboard đang sinh ảnh
  useEffect(() => {
    const isAnyGenerating = storyboards.some(s => s.state === 'generating');
    if (!isAnyGenerating) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 600000);

    return () => clearInterval(interval);
  }, [storyboards]);

  const handleCreateStoryboard = async () => {
    if (!newPrompt.trim()) {
      showToast("Vui lòng điền Prompt sinh ảnh phân cảnh.", "error");
      return;
    }

    setLoading(true);
    try {
      await createVideoStoryboard(teamId, projectId, {
        prompt: newPrompt,
        videoDesc: newDesc,
        duration: newDuration,
        index: storyboards.length + 1,
        state: 'done',
        shouldGenerateImage: 1
      });
      showToast("Đã tạo thêm phân cảnh mới.", "success");
      setIsCreating(false);
      setNewPrompt('');
      setNewDesc('');
      setNewDuration('5');
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể tạo phân cảnh.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStoryboard = async () => {
    if (!editingStoryboard || !editingStoryboard.prompt.trim()) return;

    setLoading(true);
    try {
      await updateVideoStoryboard(teamId, projectId, editingStoryboard.id, {
        prompt: editingStoryboard.prompt,
        videoDesc: editingStoryboard.videoDesc,
        duration: editingStoryboard.duration
      });
      showToast("Đã cập nhật thông tin phân cảnh.", "success");
      setEditingStoryboard(null);
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể cập nhật phân cảnh.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStoryboard = async (storyboardId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phân cảnh này?')) return;

    try {
      await deleteVideoStoryboard(teamId, projectId, storyboardId);
      showToast("Đã xóa phân cảnh.", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể xóa phân cảnh.", "error");
    }
  };

  const handleGenerateImage = async (storyboardId: number) => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Image Model.", "error");
      return;
    }

    setStoryboards(prev => prev.map(s => s.id === storyboardId ? { ...s, state: 'generating', reason: null } : s));

    try {
      const res = await generateStoryboardImageAction(teamId, projectId, storyboardId, selectedModel);
      if (res.success) {
        showToast("Sinh ảnh phân cảnh thành công!", "success");
        router.refresh();
      } else {
        showToast(res.error || "Không thể sinh ảnh phân cảnh.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Image Model.", "error");
      return;
    }

    const missingStoryboards = storyboards.filter(s => !s.filePath);
    if (missingStoryboards.length === 0) {
      showToast("Tất cả phân cảnh đã có ảnh.", "info");
      return;
    }

    const storyboardIds = missingStoryboards.map(s => s.id);
    
    setStoryboards(prev => prev.map(s => storyboardIds.includes(s.id) ? { ...s, state: 'generating', reason: null } : s));
    
    try {
      showToast(`Đang sinh ${storyboardIds.length} ảnh trong nền...`, "info");
      const res = await batchGenerateStoryboardImagesAction(teamId, projectId, storyboardIds, selectedModel);
      if (res.success) {
        showToast("Batch Generate hoàn tất!", "success");
        router.refresh();
      } else {
        showToast("Có lỗi khi Batch Generate.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  // Hàm thay đổi thứ tự phân cảnh (Lên / Xuống)
  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 1 || targetIndex > storyboards.length) return;

    const currentItem = storyboards.find(s => s.index === currentIndex);
    const targetItem = storyboards.find(s => s.index === targetIndex);

    if (!currentItem || !targetItem) return;

    try {
      // Đổi index của hai phần tử
      await updateVideoStoryboard(teamId, projectId, currentItem.id, { index: targetIndex });
      await updateVideoStoryboard(teamId, projectId, targetItem.id, { index: currentIndex });
      
      showToast("Thứ tự phân cảnh đã thay đổi.", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể thay đổi thứ tự.", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="px-8 pt-4 shrink-0">
        <PollingBanner intervalMinutes={10} onRefresh={() => router.refresh()} />
      </div>
      {/* Top action bar */}
      <div className="h-16 border-b border-white/[0.05] flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chọn AI Image Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500/50"
          >
            {imageModels.map((model) => (
              <option key={model.modelName} value={model.modelName}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleBatchGenerate}
            disabled={storyboards.filter(s => !s.filePath).length === 0}
            variant="outline"
            className="border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs gap-2"
          >
            <Sparkles size={14} />
            Sinh toàn bộ ảnh chưa có (Batch)
          </Button>

          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs gap-2"
          >
            <Plus size={14} />
            Thêm Phân Cảnh
          </Button>

          <Button
            onClick={() => router.push(`/hero-video-maker/t/${teamId}/editor/${projectId}/video`)}
            disabled={storyboards.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
          >
            Bước 6: Sinh Video
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Grid Storyboards timeline */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Film size={16} className="text-pink-400" />
              Bảng Phân Cảnh Chi Tiết (Storyboard)
            </h2>
            <div className="text-xs text-slate-500">
              Tổng số phân cảnh: {storyboards.length} panels | Tổng thời gian: {
                storyboards.reduce((acc, curr) => acc + parseInt(curr.duration || '0', 10), 0)
              } giây
            </div>
          </div>

          {storyboards.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01]">
              <Film size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-400">Chưa có phân cảnh nào trong Storyboard.</p>
              <Button 
                onClick={() => setIsCreating(true)} 
                variant="link" 
                className="text-pink-400 text-xs mt-2"
              >
                Tạo phân cảnh đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {storyboards.map((story) => {
                const isGenerating = story.state === 'generating';

                return (
                  <Card 
                    key={story.id} 
                    className="border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-xl transition-all duration-300 relative group overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Image Preview */}
                      <div className="aspect-video w-full rounded-t-xl overflow-hidden bg-black/40 relative border-b border-white/[0.03] flex items-center justify-center">
                        {isGenerating ? (
                          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                            <Loader2 size={24} className="animate-spin text-pink-500" />
                            Đang sinh ảnh...
                          </div>
                        ) : story.filePath ? (
                          <img 
                            src={story.filePath} 
                            alt={`Panel ${story.index}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-600 text-xs">
                            <ImageIcon size={32} />
                            Chưa có ảnh AI
                          </div>
                        )}

                        {/* Top panel badge index */}
                        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-slate-300 border border-white/10 flex items-center gap-1.5">
                          <span className="text-pink-400">#{story.index}</span>
                          <span className="text-slate-500">|</span>
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Clock size={10} />
                            {story.duration || '5'}s
                          </span>
                        </div>

                        {/* Hover Overlay Buttons */}
                        {!isGenerating && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                            <Button
                              onClick={() => handleGenerateImage(story.id)}
                              size="sm"
                              className="bg-pink-500 hover:bg-pink-600 text-white text-xs gap-1.5 border-0 shadow-lg"
                            >
                              <Sparkles size={12} />
                              Sinh ảnh AI
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Info Metadata */}
                      <div className="px-5 space-y-2">
                        <div className="text-xs font-bold text-slate-300 line-clamp-2" title={story.videoDesc}>
                          {story.videoDesc || 'Không có mô tả phân cảnh.'}
                        </div>
                        {story.prompt && (
                          <div className="text-[10px] text-slate-500 font-mono line-clamp-2 border-t border-white/[0.02] pt-2" title={story.prompt}>
                            Prompt: {story.prompt}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="px-5 pb-5 pt-4 flex justify-between items-center border-t border-white/[0.02] mt-4">
                      {/* Lên/Xuống Sort buttons */}
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={story.index === 1}
                          onClick={() => handleMove(story.index, 'up')}
                          className="h-7 w-7 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp size={12} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={story.index === storyboards.length}
                          onClick={() => handleMove(story.index, 'down')}
                          className="h-7 w-7 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown size={12} />
                        </Button>
                      </div>

                      {/* Edit/Delete */}
                      <div className="flex gap-1">
                        {story.state === 'error' && story.reason && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mr-2" title={story.reason}>
                            <AlertCircle size={12} />
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingStoryboard(story)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                        >
                          <Edit3 size={12} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteStoryboard(story.id)}
                          className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/[0.05]"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog thêm phân cảnh */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#09090d] border border-white/[0.05] rounded-xl text-slate-200 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-300 border-b border-white/[0.05] pb-2">Thêm phân cảnh mới</h3>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Mô tả phân cảnh (videoDesc)</label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Cảnh nhân vật chính đi qua cánh rừng hoang vu..."
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Prompt sinh ảnh AI</label>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="A cinematic shot of a young warrior walking through a dark forest..."
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Thời lượng (giây)</label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateStoryboard}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs"
              >
                Tạo mới
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog sửa phân cảnh */}
      {editingStoryboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#09090d] border border-white/[0.05] rounded-xl text-slate-200 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-300 border-b border-white/[0.05] pb-2">Chỉnh sửa phân cảnh</h3>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Mô tả phân cảnh</label>
                <Textarea
                  value={editingStoryboard.videoDesc || ''}
                  onChange={(e) => setEditingStoryboard({ ...editingStoryboard, videoDesc: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Prompt sinh ảnh AI</label>
                <Textarea
                  value={editingStoryboard.prompt || ''}
                  onChange={(e) => setEditingStoryboard({ ...editingStoryboard, prompt: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Thời lượng (giây)</label>
                <Input
                  type="number"
                  value={editingStoryboard.duration || '5'}
                  onChange={(e) => setEditingStoryboard({ ...editingStoryboard, duration: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
              <Button
                variant="outline"
                onClick={() => setEditingStoryboard(null)}
                className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateStoryboard}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
