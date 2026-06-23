'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Sparkles, 
  Trash2, 
  Save, 
  ArrowRight, 
  Edit3,
  FileText,
  HelpCircle
} from 'lucide-react';
import { bulkCreateVideoNovels } from '@/lib/db/video-maker-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';

interface NovelClientProps {
  project: any;
  initialNovels: any[];
  models: any[];
  teamId: number;
  projectId: number;
}

export default function NovelClient({ project, initialNovels, models, teamId, projectId }: NovelClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [rawText, setRawText] = useState('');
  const [chapters, setChapters] = useState<any[]>(initialNovels || []);
  const [editingChapter, setEditingChapter] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'chapters'>(initialNovels.length > 0 ? 'chapters' : 'import');

  // Hàm chia chương client-side thông minh
  const handleSplitChapters = () => {
    if (!rawText.trim()) {
      showToast("Vui lòng nhập nội dung tiểu thuyết trước.", "error");
      return;
    }

    const regex = /(?:^|\n)\s*(Chương\s+\d+|Chapter\s+\d+|第[一二三四五六七八九十百千万\d]+章)\s*(.*)/gi;
    const matches = [...rawText.matchAll(regex)];

    let result = [];
    if (matches.length === 0) {
      result = [{
        chapterIndex: 1,
        reel: 'Quyển 1',
        chapter: 'Chương 1: Khởi đầu',
        chapterData: rawText.trim(),
      }];
    } else {
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const chapterTitle = currentMatch[1] + (currentMatch[2] ? ': ' + currentMatch[2] : '');
        const startIndex = currentMatch.index! + currentMatch[0].length;
        const endIndex = i + 1 < matches.length ? matches[i + 1].index! : rawText.length;
        const chapterContent = rawText.substring(startIndex, endIndex).trim();

        result.push({
          chapterIndex: i + 1,
          reel: 'Quyển 1',
          chapter: chapterTitle,
          chapterData: chapterContent || 'Nội dung chương trống.',
        });
      }
    }

    setChapters(result);
    setActiveTab('chapters');
    showToast(`Đã chia thành công ${result.length} chương!`, "success");
  };

  const handleSaveChapters = async () => {
    if (chapters.length === 0) {
      showToast("Chưa có chương nào để lưu.", "error");
      return;
    }

    setLoading(true);
    try {
      await bulkCreateVideoNovels(teamId, projectId, chapters);
      showToast("Đã lưu toàn bộ chương truyện vào dự án.", "success");
      router.refresh();
    } catch (e: any) {
      showToast(e.message || "Không thể lưu chương truyện.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChapter = () => {
    if (!editingChapter) return;
    setChapters(prev => 
      prev.map(ch => ch.chapterIndex === editingChapter.chapterIndex ? editingChapter : ch)
    );
    setEditingChapter(null);
    showToast("Nội dung chương đã được lưu tạm thời.", "success");
  };

  const handleDeleteChapter = (index: number) => {
    const filtered = chapters.filter(ch => ch.chapterIndex !== index);
    const reindexed = filtered.map((ch, i) => ({
      ...ch,
      chapterIndex: i + 1
    }));
    setChapters(reindexed);
    showToast("Đã xóa chương và sắp xếp lại thứ tự chương.", "success");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top action bar */}
      <div className="h-16 border-b border-white/[0.05] flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'import' 
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nhập Truyện Thô
            </button>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all relative ${
                activeTab === 'chapters' 
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Danh Sách Chương ({chapters.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {chapters.length > 0 && (
            <Button
              onClick={handleSaveChapters}
              disabled={loading}
              variant="outline"
              className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 text-xs gap-2"
            >
              <Save size={14} />
              Lưu Chương Truyện
            </Button>
          )}

          <Button
            onClick={() => router.push(`/hero-video-maker/t/${teamId}/editor/${projectId}/events`)}
            disabled={chapters.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs gap-2 border-0 shadow-lg shadow-pink-500/10"
          >
            Bước 2: Sự Kiện AI
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'import' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.05]">
              <HelpCircle className="text-pink-400 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Hướng dẫn chia chương:</p>
                <p>Dán trực tiếp văn bản tiểu thuyết của bạn vào ô dưới. Hệ thống sẽ tự động tách chương dựa trên các dấu hiệu như: <b>Chương 1</b>, <b>Chapter X</b> hoặc <b>第Y章</b>.</p>
                <p>Nếu không tìm thấy dấu hiệu chia chương, toàn bộ văn bản sẽ được coi là một chương duy nhất.</p>
              </div>
            </div>

            <Card className="p-6 border-white/[0.05] bg-white/[0.02] backdrop-blur-xl space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-300 mb-2">
                <FileText size={16} className="text-pink-400" />
                Dán nội dung tiểu thuyết của bạn
              </div>
              <Textarea
                placeholder="Nhập nội dung truyện tại đây..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[400px] bg-black/30 border-white/[0.05] text-slate-300 focus:border-pink-500/50 focus:ring-pink-500/20 text-sm font-sans leading-relaxed"
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleSplitChapters}
                  className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs gap-2"
                >
                  <Sparkles size={14} />
                  Bắt Đầu Chia Chương
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                Danh sách chương đã chia
              </h2>
              <p className="text-xs text-slate-500">
                Hãy kiểm tra nội dung từng chương trước khi lưu và chuyển sang bước trích sự kiện.
              </p>
            </div>

            {chapters.length === 0 ? (
              <div className="text-center py-24 rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01]">
                <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400">Chưa có dữ liệu chương.</p>
                <Button 
                  onClick={() => setActiveTab('import')} 
                  variant="link" 
                  className="text-pink-400 text-xs mt-2"
                >
                  Nhập truyện thô ngay
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chapters.map((ch, idx) => (
                  <Card 
                    key={idx} 
                    className="p-5 border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] backdrop-blur-xl transition-all duration-300 relative group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          {ch.reel || 'Quyển 1'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {ch.chapterData ? ch.chapterData.length.toLocaleString() : 0} từ
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-300 truncate">
                        {ch.chapter}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {ch.chapterData}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 border-t border-white/[0.03] pt-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingChapter(ch)}
                        className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteChapter(ch.chapterIndex)}
                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/[0.05]"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Dialog chỉnh sửa chương (Kiến trúc phẳng) */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingChapter(null)} />
          <div className="relative w-full max-w-2xl bg-[#09090d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-slate-300 font-bold flex items-center gap-2">
                <Edit3 size={16} className="text-pink-400" />
                Chỉnh sửa thông tin chương
              </h3>
              <button onClick={() => setEditingChapter(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tên chương</label>
                <Input
                  value={editingChapter.chapter}
                  onChange={(e) => setEditingChapter({ ...editingChapter, chapter: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tập / Quyển</label>
                <Input
                  value={editingChapter.reel || ''}
                  onChange={(e) => setEditingChapter({ ...editingChapter, reel: e.target.value })}
                  className="bg-black/40 border-white/[0.05] text-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Nội dung chương</label>
                <Textarea
                  value={editingChapter.chapterData}
                  onChange={(e) => setEditingChapter({ ...editingChapter, chapterData: e.target.value })}
                  className="min-h-[250px] bg-black/40 border-white/[0.05] text-slate-200 font-sans leading-relaxed text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <Button
                variant="outline"
                onClick={() => setEditingChapter(null)}
                className="border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] text-slate-400"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateChapter}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
              >
                Cập Nhật
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
