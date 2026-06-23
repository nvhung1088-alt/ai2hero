'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Edit3, 
  Trash2, 
  Loader2, 
  Image as ImageIcon,
  User,
  Map,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { 
  createVideoAsset, 
  updateVideoAsset, 
  deleteVideoAsset, 
  generateAssetImageAction,
  batchGenerateAssetImagesAction,
  polishAssetPromptAction
} from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';

interface AssetsClientProps {
  project: any;
  initialAssets: any[];
  initialImages: any[];
  models: any[];
  teamId: number;
  projectId: number;
}

export default function AssetsClient({ project, initialAssets, initialImages, models, teamId, projectId }: AssetsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [assets, setAssets] = useState<any[]>(initialAssets);
  const [images, setImages] = useState<any[]>(initialImages);
  
  // Model Selector
  const [imageModels, setImageModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Active Tab: 'role' | 'scene' | 'tool'
  const [activeTab, setActiveTab] = useState<'role' | 'scene' | 'tool'>('role');

  // Modal Dialog States
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form Create States
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newType, setNewType] = useState<'role' | 'scene' | 'tool'>('role');
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
    setAssets(initialAssets);
    setImages(initialImages);
  }, [initialAssets, initialImages]);

  // Polling tự động khi có asset đang sinh ảnh
  useEffect(() => {
    const isAnyGenerating = assets.some(a => a.promptState === 'generating');
    if (!isAnyGenerating) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => clearInterval(interval);
  }, [assets]);

  const handleCreateAsset = async () => {
    if (!newName.trim()) {
      showToast("Vui lòng điền tên tài sản.", "error");
      return;
    }

    setLoading(true);
    try {
      await createVideoAsset(teamId, projectId, {
        name: newName,
        type: newType,
        describe: newDesc,
        prompt: newPrompt || newDesc,
        promptState: 'done'
      });
      showToast("Đã tạo thêm tài sản mới.", "success");
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
      setNewPrompt('');
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể tạo tài sản.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset || !editingAsset.name.trim()) return;

    setLoading(true);
    try {
      await updateVideoAsset(teamId, projectId, editingAsset.id, {
        name: editingAsset.name,
        describe: editingAsset.describe,
        prompt: editingAsset.prompt
      });
      showToast("Đã cập nhật thông tin tài sản.", "success");
      setEditingAsset(null);
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể cập nhật tài sản.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài sản này?')) return;

    try {
      await deleteVideoAsset(teamId, projectId, assetId);
      showToast("Tài sản đã được loại bỏ khỏi dự án.", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể xóa tài sản.", "error");
    }
  };

  const handleGenerateImage = async (assetId: number) => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Image Model.", "error");
      return;
    }

    // Set trạng thái client tạm thời
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, promptState: 'generating', promptErrorReason: null } : a));

    try {
      const res = await generateAssetImageAction(teamId, projectId, assetId, selectedModel);
      if (res.success) {
        showToast("Sinh ảnh tài sản thành công!", "success");
        router.refresh();
      } else {
        showToast(res.error || "Không thể sinh ảnh tài sản.", "error");
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

    const missingAssets = assets.filter(a => a.type === activeTab && !a.imageId);
    if (missingAssets.length === 0) {
      showToast("Tất cả tài sản trong tab này đã có ảnh.", "info");
      return;
    }

    const assetIds = missingAssets.map(a => a.id);
    
    setAssets(prev => prev.map(a => assetIds.includes(a.id) ? { ...a, promptState: 'generating', promptErrorReason: null } : a));
    
    try {
      showToast(`Đang sinh ${assetIds.length} ảnh trong nền...`, "info");
      const res = await batchGenerateAssetImagesAction(teamId, projectId, assetIds, selectedModel);
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

  const handlePolishPrompt = async (assetId: number) => {
    try {
      showToast("Đang tối ưu prompt bằng AI...", "info");
      const res = await polishAssetPromptAction(teamId, projectId, assetId, 'gpt-4o-mini'); // Có thể lấy model từ config
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

  // Lọc tài sản theo tab hiện tại
  const filteredAssets = assets.filter(a => a.type === activeTab);

  // Tìm kiếm ảnh preview tương ứng
  const getAssetImage = (imageId: number | null) => {
    if (!imageId) return null;
    return images.find(img => img.id === imageId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
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
            disabled={assets.filter(a => a.type === activeTab && !a.imageId).length === 0}
            variant="outline"
            className="border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs gap-2"
          >
            <Sparkles size={14} />
            Batch Generate Tab
          </Button>

          <Button
            onClick={() => setIsCreating(true)}
            variant="outline"
            className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs gap-2"
          >
            <Plus size={14} />
            Tạo Tài Sản Thủ Công
          </Button>

          <Button
            onClick={() => router.push(`/hero-video-maker/t/${teamId}/editor/${projectId}/storyboard`)}
            disabled={assets.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
          >
            Bước 5: Tạo Phân Cảnh
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="px-8 py-4 bg-white/[0.01] border-b border-white/[0.05] flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          {[
            { id: 'role', name: 'Nhân Vật', icon: User },
            { id: 'scene', name: 'Bối Cảnh', icon: Map },
            { id: 'tool', name: 'Đạo Cụ / Chi Tiết', icon: Wrench }
          ].map((tab) => {
            const Icon = tab.icon;
            const count = assets.filter(a => a.type === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                  activeTab === tab.id
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.01]'
                }`}
              >
                <Icon size={14} />
                {tab.name} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          * AI tự động trích xuất từ kịch bản hoặc bạn tự thêm để làm nhân vật/bối cảnh xuyên suốt.
        </p>
      </div>

      {/* Grid Assets */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01] max-w-4xl mx-auto">
            <ImageIcon size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">Không tìm thấy tài sản nào thuộc nhóm này.</p>
            <Button 
              onClick={() => setIsCreating(true)} 
              variant="link" 
              className="text-pink-400 text-xs mt-2"
            >
              Thêm tài sản thủ công ngay
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => {
              const image = getAssetImage(asset.imageId);
              const isGenerating = asset.promptState === 'generating';

              return (
                <Card 
                  key={asset.id} 
                  className="border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-xl transition-all duration-300 relative group overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Visual Preview / Placeholder */}
                    <div className="aspect-square w-full rounded-t-xl overflow-hidden bg-black/40 relative border-b border-white/[0.03] flex items-center justify-center">
                      {isGenerating ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                          <Loader2 size={24} className="animate-spin text-pink-500" />
                          Đang sinh ảnh...
                        </div>
                      ) : image ? (
                        <img 
                          src={image.filePath} 
                          alt={asset.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-600 text-xs">
                          <ImageIcon size={32} />
                          Chưa có ảnh AI
                        </div>
                      )}

                      {/* Hover Overlay Buttons */}
                      {!isGenerating && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                          <Button
                            onClick={() => handleGenerateImage(asset.id)}
                            size="sm"
                            className="bg-pink-500 hover:bg-pink-600 text-white text-xs gap-1.5 border-0 shadow-lg w-32"
                          >
                            <Sparkles size={12} />
                            Sinh ảnh AI
                          </Button>
                          <Button
                            onClick={() => handlePolishPrompt(asset.id)}
                            size="sm"
                            className="bg-purple-500 hover:bg-purple-600 text-white text-xs gap-1.5 border-0 shadow-lg w-32"
                          >
                            <Edit3 size={12} />
                            Polish Prompt
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="px-5 space-y-2">
                      <h3 className="text-sm font-bold text-slate-200 truncate">{asset.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed h-8">
                        {asset.describe || 'Không có mô tả.'}
                      </p>
                      {asset.prompt && (
                        <div className="text-[10px] text-slate-500 font-mono line-clamp-1 border-t border-white/[0.02] pt-2" title={asset.prompt}>
                          Prompt: {asset.prompt}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-5 pb-5 pt-4 flex justify-end gap-2 border-t border-white/[0.02] mt-4">
                    {asset.promptState === 'error' && asset.promptErrorReason && (
                      <div className="text-[10px] text-red-400 flex items-center gap-1 mr-auto" title={asset.promptErrorReason}>
                        <AlertCircle size={12} />
                        Lỗi sinh ảnh
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingAsset(asset)}
                      className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                    >
                      <Edit3 size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/[0.05]"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog tạo tài sản */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#09090d] border border-white/[0.05] rounded-xl text-slate-200 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-300 border-b border-white/[0.05] pb-2">Thêm tài sản thủ công</h3>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Loại tài sản</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-500/50"
                >
                  <option value="role">Nhân Vật (Role)</option>
                  <option value="scene">Bối Cảnh (Scene)</option>
                  <option value="tool">Đạo Cụ / Chi Tiết (Tool)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Tên tài sản</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên nhân vật/bối cảnh..."
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Mô tả trực quan</label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Tóc trắng, mắt xanh, áo choàng dài..."
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Prompt sinh ảnh AI (Optional)</label>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Nếu để trống, sẽ dùng mô tả làm prompt..."
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
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
                onClick={handleCreateAsset}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs"
              >
                Tạo mới
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog sửa tài sản */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#09090d] border border-white/[0.05] rounded-xl text-slate-200 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-300 border-b border-white/[0.05] pb-2">Chỉnh sửa tài sản</h3>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Tên tài sản</label>
                <Input
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Mô tả trực quan</label>
                <Textarea
                  value={editingAsset.describe || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, describe: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">Prompt sinh ảnh AI</label>
                <Textarea
                  value={editingAsset.prompt || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, prompt: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200 text-xs min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
              <Button
                variant="outline"
                onClick={() => setEditingAsset(null)}
                className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400 text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateAsset}
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
