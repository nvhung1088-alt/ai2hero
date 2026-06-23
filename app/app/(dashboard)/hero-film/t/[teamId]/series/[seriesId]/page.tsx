'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getViewerSeriesDetailAction, updateSeriesAction, getSeriesEpisodesAction } from '@/lib/db/film-actions';
import { Film, ArrowLeft, Loader2, Save, ListVideo, ExternalLink } from 'lucide-react';
import { generateFilmUrl } from '@/lib/utils/film-url';

export default function EditSeriesPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = parseInt(params.teamId as string, 10);
  const seriesId = parseInt(params.seriesId as string, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [genre, setGenre] = useState('romance');
  const [tagsInput, setTagsInput] = useState('');
  const [totalFreeEpisodes, setTotalFreeEpisodes] = useState(0);
  const [status, setStatus] = useState<'draft' | 'publishing' | 'completed' | 'archived'>('draft');
  const [episodes, setEpisodes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await getViewerSeriesDetailAction(seriesId);
        const epRes = await getSeriesEpisodesAction(seriesId, teamId);
        if (res && res.series) {
          const s = res.series;
          setTitle(s.title);
          setDescription(s.description || '');
          setCoverUrl(s.coverUrl || '');
          setBannerUrl(s.bannerUrl || '');
          setGenre(s.genre || 'romance');
          setTotalFreeEpisodes(s.totalFreeEpisodes || 0);
          setStatus(s.status as any || 'draft');
          
          if (Array.isArray(s.tags)) {
            setTagsInput((s.tags as string[]).join(', '));
          } else {
            setTagsInput('');
          }

          if (Array.isArray(epRes)) {
            setEpisodes(epRes);
          }
        } else {
          alert('Không tìm thấy phim');
          router.push(`/hero-film/t/${teamId}/series`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (seriesId) {
      fetchDetail();
    }
  }, [seriesId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên phim');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await updateSeriesAction(seriesId, teamId, {
        title,
        description,
        coverUrl,
        bannerUrl,
        genre,
        tags,
        totalFreeEpisodes: Number(totalFreeEpisodes),
        status,
      });

      if (res.success) {
        router.push(`/hero-film/t/${teamId}/series`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Cập nhật phim thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/hero-film/t/${teamId}/series`}
            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              Chỉnh Sửa Phim
            </h1>
            <p className="text-xs text-gray-400 font-medium">Thay đổi thông tin bộ film của bạn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/hero-film/t/${teamId}/series/${seriesId}/episodes`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
          >
            <ListVideo className="h-4 w-4" />
            Quản lý tập phim
          </Link>
          <a
            href={generateFilmUrl(seriesId.toString(), 1)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            Xem thử ngoài site
          </a>
        </div>
      </div>

      {/* Mini Stats Block */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-gray-400 text-[10px] font-bold uppercase">Tổng tập phim</span>
            <span className="text-white font-black text-2xl">{episodes.length}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-emerald-400 text-[10px] font-bold uppercase">Đã publish</span>
            <span className="text-emerald-400 font-black text-2xl">{episodes.filter(e => e.status === 'published').length}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-amber-400 text-[10px] font-bold uppercase">Đang draft</span>
            <span className="text-amber-400 font-black text-2xl">{episodes.filter(e => e.status === 'draft').length}</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-blue-400 text-[10px] font-bold uppercase">Tập mới nhất</span>
            <span className="text-blue-400 font-black text-2xl">
              Tập {episodes.length > 0 ? Math.max(...episodes.map(e => e.episodeNumber)) : 0}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs font-bold">Đang tải thông tin phim...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 block">Tên phim *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Long Vương Trở Lại"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 block">Mô tả phim</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tóm tắt cốt truyện kịch tính của bộ film..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors resize-none"
            />
          </div>

          {/* 2-Column layout for cover and banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cover URL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">URL Ảnh bìa dọc (9:16)</label>
              <input
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://unsplash.com/... (ảnh bìa đứng)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>

            {/* Banner URL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">URL Banner ngang (21:9)</label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://unsplash.com/... (ảnh banner rộng)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Genre and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Genre */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">Thể loại</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors"
              >
                <option value="romance" className="bg-gray-950 text-white">Ngôn Tình</option>
                <option value="action" className="bg-gray-950 text-white">Chiến Thần / Hành Động</option>
                <option value="drama" className="bg-gray-950 text-white">Kịch Tính</option>
                <option value="comedy" className="bg-gray-950 text-white">Hài Hước</option>
                <option value="thriller" className="bg-gray-950 text-white">Gây Cấn</option>
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">Nhãn (Tags, ngăn cách bởi dấu phẩy)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ví dụ: Rể hiền, Chiến thần, Vả mặt"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Status and Free Episodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">Trạng thái phát sóng</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors"
              >
                <option value="draft" className="bg-gray-950 text-white">Bản nháp (Draft)</option>
                <option value="publishing" className="bg-gray-950 text-white">Phát sóng (Publishing)</option>
                <option value="completed" className="bg-gray-950 text-white">Hoàn thành (Completed)</option>
                <option value="archived" className="bg-gray-950 text-white">Lưu trữ (Archived)</option>
              </select>
            </div>

            {/* Free episodes config */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">Số tập xem miễn phí</label>
              <input
                type="number"
                min={0}
                value={totalFreeEpisodes}
                onChange={(e) => setTotalFreeEpisodes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-5">
            <Link
              href={`/hero-film/t/${teamId}/series`}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-gray-300 hover:text-white transition duration-300 cursor-pointer"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 transition duration-300 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu Thay Đổi
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
