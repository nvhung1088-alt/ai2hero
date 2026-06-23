'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getViewerSeriesDetailAction, 
  getSeriesEpisodesAction, 
  createEpisodeAction, 
  updateEpisodeAction, 
  deleteEpisodeAction 
} from '@/lib/db/film-actions';
import { 
  Film, ArrowLeft, Loader2, Plus, Edit, Trash2, Coins, Play, 
  ExternalLink, Video, Check, Save, X, AlertTriangle 
} from 'lucide-react';
import { FilmEpisode } from '@/lib/db/schema';

export default function EpisodeManagementPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = parseInt(params.teamId as string, 10);
  const seriesId = parseInt(params.seriesId as string, 10);

  const [series, setSeries] = useState<any>(null);
  const [episodes, setEpisodes] = useState<FilmEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State cho Tạo mới / Sửa tập
  const [editingEpisode, setEditingEpisode] = useState<FilmEpisode | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSource, setVideoSource] = useState<'direct' | 'youtube' | 'facebook'>('direct');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState(15);
  const [isFree, setIsFree] = useState(true);
  const [tokenPrice, setTokenPrice] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetailsAndEpisodes = async () => {
    setLoading(true);
    try {
      const seriesData = await getViewerSeriesDetailAction(seriesId);
      if (seriesData) {
        setSeries(seriesData.series);
      }
      const epData = await getSeriesEpisodesAction(seriesId, teamId);
      setEpisodes(epData);
      
      // Auto increment episode number for new episode
      const maxEpNum = epData.reduce((max, ep) => ep.episodeNumber > max ? ep.episodeNumber : max, 0);
      setEpisodeNumber(maxEpNum + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seriesId && teamId) {
      fetchDetailsAndEpisodes();
    }
  }, [seriesId, teamId]);

  const resetForm = () => {
    setEditingEpisode(null);
    const maxEpNum = episodes.reduce((max, ep) => ep.episodeNumber > max ? ep.episodeNumber : max, 0);
    setEpisodeNumber(maxEpNum + 1);
    setTitle('');
    setVideoUrl('');
    setVideoSource('direct');
    setThumbnailUrl('');
    setDuration(15);
    setIsFree(true);
    setTokenPrice(5);
  };

  const handleStartEdit = (ep: FilmEpisode) => {
    setEditingEpisode(ep);
    setEpisodeNumber(ep.episodeNumber);
    setTitle(ep.title || '');
    setVideoUrl(ep.videoUrl);
    setVideoSource(ep.videoSource as any);
    setThumbnailUrl(ep.thumbnailUrl || '');
    setDuration(ep.duration || 0);
    setIsFree(ep.isFree);
    setTokenPrice(ep.tokenPrice || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      alert('Vui lòng nhập URL Video');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEpisode) {
        // Edit Mode
        const res = await updateEpisodeAction(editingEpisode.id, teamId, {
          episodeNumber: Number(episodeNumber),
          title,
          videoUrl,
          videoSource,
          thumbnailUrl,
          duration: Number(duration),
          isFree,
          tokenPrice: isFree ? 0 : Number(tokenPrice),
        });

        if (res.success && res.episode) {
          setEpisodes(prev => 
            prev.map(ep => ep.id === editingEpisode.id ? res.episode! : ep)
              .sort((a, b) => a.episodeNumber - b.episodeNumber)
          );
          resetForm();
        }
      } else {
        // Create Mode
        const res = await createEpisodeAction(seriesId, teamId, {
          episodeNumber: Number(episodeNumber),
          title,
          videoUrl,
          videoSource,
          thumbnailUrl,
          duration: Number(duration),
          isFree,
          tokenPrice: isFree ? 0 : Number(tokenPrice),
        });

        if (res.success && res.episode) {
          const updatedList = [...episodes, res.episode].sort((a, b) => a.episodeNumber - b.episodeNumber);
          setEpisodes(updatedList);
          
          // Tự động cập nhật tổng số tập của phim cục bộ
          if (series) {
            setSeries({ ...series, totalEpisodes: updatedList.length });
          }
          resetForm();
        }
      }
    } catch (e) {
      console.error(e);
      alert('Thao tác tập phim thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEp = async (epId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tập phim này không?')) return;
    try {
      const res = await deleteEpisodeAction(epId, teamId);
      if (res.success) {
        const updatedList = episodes.filter(ep => ep.id !== epId);
        setEpisodes(updatedList);
        if (series) {
          setSeries({ ...series, totalEpisodes: updatedList.length });
        }
        resetForm();
      }
    } catch (e) {
      console.error(e);
      alert('Xóa tập phim thất bại');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
        <Link
          href={`/hero-film/t/${teamId}/series`}
          className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-gray-300" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Quản Lý Tập Phim
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            {series ? `${series.title} — ${series.totalEpisodes} tập` : 'Đang tải thông tin phim...'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs font-bold">Đang tải danh sách tập phim...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột 1: Form Thêm/Sửa Tập Phim (1/3 width) */}
          <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Video className="h-4.5 w-4.5 text-rose-500" />
              {editingEpisode ? `Sửa Tập ${editingEpisode.episodeNumber}` : 'Thêm Tập Phim'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Episode Number */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">Số tập *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">Tiêu đề tập</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Dòng code định mệnh"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              {/* Video Source */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">Nguồn Video</label>
                <select
                  value={videoSource}
                  onChange={(e) => setVideoSource(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                >
                  <option value="direct" className="bg-gray-950 text-white">Direct MP4 URL</option>
                  <option value="youtube" className="bg-gray-950 text-white">YouTube Video/Shorts</option>
                  <option value="facebook" className="bg-gray-950 text-white">Facebook Video</option>
                </select>
              </div>

              {/* Video URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">URL Video *</label>
                <input
                  type="text"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={
                    videoSource === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : videoSource === 'facebook'
                        ? 'https://facebook.com/.../videos/...'
                        : 'https://cdn.example.com/video.mp4'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">Ảnh thu nhỏ (Thumbnail URL)</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://unsplash.com/... (tùy chọn)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 block">Thời lượng (giây)</label>
                <input
                  type="number"
                  min={0}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              {/* Free vs Premium Toggle */}
              <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300">Xem miễn phí</span>
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="h-4 w-4 rounded bg-white/5 border-white/10 text-rose-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                {!isFree && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                      <Coins className="h-3 w-3" /> Giá xem (Tokens) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={tokenPrice}
                      onChange={(e) => setTokenPrice(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {editingEpisode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-black text-gray-300 transition cursor-pointer text-center"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 bg-gradient-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 cursor-pointer select-none transition"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : editingEpisode ? (
                    <>
                      <Save className="h-3.5 w-3.5" /> Lưu
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Thêm tập
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Cột 2: Danh sách các tập phim (2/3 width) */}
          <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-6">
            <h3 className="font-extrabold text-sm text-white">Danh Sách Các Tập Phim</h3>

            {episodes.length > 0 ? (
              <div className="space-y-3">
                {episodes.map((ep) => {
                  const isEpEditing = editingEpisode?.id === ep.id;

                  return (
                    <div
                      key={ep.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                        isEpEditing
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Play Icon / Thumbnail placeholder */}
                        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-rose-500">
                          <Play className="h-4 w-4 fill-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs text-gray-200 flex items-center gap-2">
                            <span>Tập {ep.episodeNumber}: {ep.title}</span>
                            <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.2 rounded font-bold text-gray-500 uppercase">
                              {ep.videoSource}
                            </span>
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold mt-1">
                            <span>Thời lượng: {ep.duration}s</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-gray-400">
                              Loại: {ep.isFree ? (
                                <span className="text-emerald-400">Miễn phí</span>
                              ) : (
                                <span className="text-amber-400 flex items-center gap-0.5 font-black">
                                  <Coins className="h-3 w-3" /> {ep.tokenPrice} Tokens
                                </span>
                              )}
                            </span>
                            {ep.reportCount && ep.reportCount > 0 ? (
                              <>
                                <span>•</span>
                                <Link 
                                  href={`/hero-film/t/${teamId}/reports?status=pending`}
                                  className="flex items-center gap-0.5 text-red-500 font-extrabold hover:underline animate-pulse cursor-pointer"
                                >
                                  <AlertTriangle className="h-3 w-3" /> {ep.reportCount} Báo Lỗi
                                </Link>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right action control */}
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 justify-end">
                        <a
                          href={ep.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition"
                          title="Xem thử video gốc"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleStartEdit(ep)}
                          className="p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
                          title="Chỉnh sửa tập"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEp(ep.id)}
                          className="p-1.5 bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition cursor-pointer"
                          title="Xóa tập"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 font-bold border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                Chưa có tập phim nào được tạo. Hãy dùng form bên trái để bắt đầu thêm tập phim đầu tiên!
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
