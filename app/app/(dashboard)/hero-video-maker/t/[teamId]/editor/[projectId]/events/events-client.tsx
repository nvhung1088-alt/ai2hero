'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ListTodo, 
  Sparkles, 
  ArrowRight, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PollingBanner } from '@/components/polling-banner';
import { 
  extractNovelEventsAction, 
  extractAllNovelEventsAction,
  updateVideoNovel
} from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface EventsClientProps {
  project: any;
  initialNovels: any[];
  models: any[];
  teamId: number;
  projectId: number;
}

export default function EventsClient({ project, initialNovels, models, teamId, projectId }: EventsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [novels, setNovels] = useState<any[]>(initialNovels);
  const [textModels, setTextModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [runningAll, setRunningAll] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [editEventText, setEditEventText] = useState('');

  useEffect(() => {
    const textModelsList = models.filter(m => m.type === 'text');
    setTextModels(textModelsList);
    if (textModelsList.length > 0) {
      const defaultModel = textModelsList.find(m => m.modelName.includes('gpt-4o') || m.modelName.includes('claude')) || textModelsList[0];
      setSelectedModel(defaultModel.modelName);
    }
  }, [models]);

  useEffect(() => {
    const isAnyGenerating = novels.some(n => n.eventState === 1);
    if (!isAnyGenerating && !runningAll) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 600000);

    return () => clearInterval(interval);
  }, [novels, runningAll]);

  useEffect(() => {
    setNovels(initialNovels);
  }, [initialNovels]);

  const handleExtractSingle = async (novelId: number) => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Model trước.", "error");
      return;
    }

    setNovels(prev => prev.map(n => n.id === novelId ? { ...n, eventState: 1, errorReason: null } : n));

    try {
      const res = await extractNovelEventsAction(teamId, projectId, novelId, selectedModel);
      if (res.success) {
        showToast("Đã trích xuất sự kiện cho chương truyện thành công.", "success");
        router.refresh();
      } else {
        showToast(res.error || "Có lỗi xảy ra khi gọi AI.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    }
  };

  const handleExtractAll = async () => {
    if (!selectedModel) {
      showToast("Vui lòng chọn AI Model trước.", "error");
      return;
    }

    setRunningAll(true);
    setNovels(prev => prev.map(n => ({ ...n, eventState: 1, errorReason: null })));

    try {
      const res = await extractAllNovelEventsAction(teamId, projectId, selectedModel);
      if (res.success) {
        showToast("AI đang chạy phân tích song song toàn bộ chương truyện.", "success");
      } else {
        showToast(res.error || "Không thể khởi động batch pipeline.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi kết nối server.", "error");
    } finally {
      setRunningAll(false);
      router.refresh();
    }
  };

  const handleSaveEventText = async (novelId: number) => {
    try {
      await updateVideoNovel(teamId, projectId, novelId, {
        event: editEventText
      });
      showToast("Thông tin sự kiện đã được lưu.", "success");
      setExpandedChapter(null);
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể lưu chỉnh sửa.", "error");
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
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chọn AI Text Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#0c0c14] border border-white/[0.08] text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500/50"
          >
            {textModels.map((model) => (
              <option key={model.modelName} value={model.modelName}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExtractAll}
            disabled={runningAll || novels.length === 0}
            variant="outline"
            className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs gap-2"
          >
            {runningAll ? (
              <Loader2 className="animate-spin text-pink-400" size={14} />
            ) : (
              <Sparkles className="text-pink-400" size={14} />
            )}
            Trích Xuất Toàn Bộ Chương
          </Button>

          <Button
            onClick={() => router.push(`/hero-video-maker/t/${teamId}/editor/${projectId}/script`)}
            disabled={novels.length === 0 || novels.some(n => n.eventState !== 2)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
          >
            Bước 3: Viết Kịch Bản
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <ListTodo size={16} className="text-pink-400" />
              Sự kiện trích xuất từ tiểu thuyết
            </h2>
            <div className="text-xs text-slate-500 font-mono">
              Tổng số: {novels.length} chương | Đã hoàn thành: {novels.filter(n => n.eventState === 2).length}
            </div>
          </div>

          <div className="space-y-4">
            {novels.map((novel) => {
              const isExpanded = expandedChapter === novel.id;

              return (
                <Card 
                  key={novel.id} 
                  className="border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-xl overflow-hidden transition-all duration-300"
                >
                  {/* Header Card */}
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-slate-200 truncate">{novel.chapter}</h3>
                        
                        {/* Badges Trạng thái */}
                        {novel.eventState === 0 && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                            Chưa trích xuất
                          </span>
                        )}
                        {novel.eventState === 1 && (
                          <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            Đang xử lý...
                          </span>
                        )}
                        {novel.eventState === 2 && (
                          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                            <CheckCircle2 size={10} />
                            Đã trích xuất
                          </span>
                        )}
                        {novel.eventState === 3 && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5" title={novel.errorReason || 'Có lỗi xảy ra'}>
                            <AlertCircle size={10} />
                            Lỗi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1 leading-relaxed">
                        {novel.chapterData}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {novel.eventState === 2 && (
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedChapter(null);
                            } else {
                              setExpandedChapter(novel.id);
                              setEditEventText(novel.event || '');
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}

                      {(novel.eventState === 0 || novel.eventState === 3) && (
                        <Button
                          onClick={() => handleExtractSingle(novel.id)}
                          size="sm"
                          className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs gap-1.5"
                        >
                          <Play size={10} />
                          Trích Xuất
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Body Expanded - Show/Edit Event */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.03] space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Bảng sự kiện chính (7 trường):
                        </label>
                        <Textarea
                          value={editEventText}
                          onChange={(e) => setEditEventText(e.target.value)}
                          className="min-h-[200px] bg-black/40 border-white/[0.05] text-slate-300 font-mono text-xs leading-relaxed focus:border-pink-500/40"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setExpandedChapter(null)}
                          variant="ghost"
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Đóng
                        </Button>
                        <Button
                          onClick={() => handleSaveEventText(novel.id)}
                          className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs gap-2"
                        >
                          <Save size={12} />
                          Lưu chỉnh sửa
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {novel.eventState === 3 && novel.errorReason && (
                    <div className="mx-5 mb-5 p-3 rounded-lg bg-red-500/[0.02] border border-red-500/10 text-xs text-red-400 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Chi tiết lỗi: </span>
                        {novel.errorReason}
                        <button 
                          onClick={() => handleExtractSingle(novel.id)} 
                          className="text-pink-400 hover:underline ml-2 font-semibold"
                        >
                          Thử lại
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
