'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  getCreatorSeriesAction, 
  toggleSeriesStatusAction, 
  deleteSeriesAction 
} from '@/lib/db/film-actions';
import { Film, Plus, Edit, Play, Trash2, Eye, Heart, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Youtube, Clock } from 'lucide-react';
import { YoutubeSyncModal } from './youtube-sync-modal';
import { FilmFooter } from '@/components/film/film-footer';

export default function CreatorSeriesPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = parseInt(params.teamId as string, 10);

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSeries = async (currentPage = page) => {
    setLoading(true);
    try {
      const res = await getCreatorSeriesAction(teamId, currentPage, 12);
      setSeriesList(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchSeries(page);
    }
  }, [teamId, page]);

  const handleToggleStatus = async (seriesId: number, currentStatus: string) => {
    setActionId(seriesId);
    try {
      const res = await toggleSeriesStatusAction(seriesId, teamId, currentStatus);
      if (res.success) {
        setSeriesList(prev => 
          prev.map(s => s.id === seriesId ? { ...s, status: res.newStatus } : s)
        );
      }
    } catch (e) {
      console.error(e);
      alert('Không thể cập nhật trạng thái');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteSeries = async (seriesId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bộ phim này cùng toàn bộ các tập phim liên quan không? Thao tác này không thể hoàn tác.')) {
      return;
    }
    setActionId(seriesId);
    try {
      const res = await deleteSeriesAction(seriesId, teamId);
      if (res.success) {
        setSeriesList(prev => prev.filter(s => s.id !== seriesId));
      }
    } catch (e) {
      console.error(e);
      alert('Xóa phim thất bại');
    } finally {
      setActionId(null);
    }
  };

  const getGenreLabel = (genreKey: string | null) => {
    switch (genreKey) {
      case 'romance':
        return 'Ngôn Tình';
      case 'action':
        return 'Chiến Thần';
      case 'drama':
        return 'Kịch Tính';
      case 'comedy':
        return 'Hài Hước';
      case 'thriller':
        return 'Gây Cấn';
      default:
        return 'Khác';
    }
  };

  const formatDuration = (sec: any) => {
    const num = Number(sec);
    if (isNaN(num) || num <= 0) return '2:30';
    const m = Math.floor(num / 60);
    const s = Math.floor(num % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
      <YoutubeSyncModal 
        teamId={teamId}
        creatorId="1"
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => {
          setIsSyncModalOpen(false);
          fetchSeries();
        }}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Quản Lý Phim</h1>
            <p className="text-xs text-gray-400">Đăng phim mới, quản lý tập phim và cấu hình tokens</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSeries(page)}
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`h-4 w-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer active:scale-95 transition"
          >
            <Youtube className="h-4 w-4 text-red-500" /> Đồng Bộ Kênh
          </button>
          
          <Link
            href={`/hero-film/t/${teamId}/series/create`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 cursor-pointer active:scale-95 transition"
          >
            <Plus className="h-4 w-4" /> Đăng Phim Mới
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <LoaderCw className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-xs font-bold">Đang tải danh sách phim...</p>
        </div>
      ) : seriesList.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seriesList.map((series) => {
              const isPublishing = series.status === 'publishing' || series.status === 'completed';
              const isWorking = actionId === series.id;
  
              return (
                <div
                  key={series.id}
                  className="bg-white/[0.01] border border-white/5 hover:border-white/10 p-5 rounded-2xl flex gap-4 transition-all group relative overflow-hidden"
                >
                  {/* Cover art ratio 9:16 */}
                  <div
                    className="w-24 aspect-[9/16] rounded-xl bg-cover bg-center border border-white/5 shrink-0 relative overflow-hidden"
                    style={{ backgroundImage: `url(${series.coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'})` }}
                  >
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      <div className="px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white">
                        {series.totalEpisodes || 1} Tập
                      </div>
                      {series.duration !== undefined && (
                        <div className="px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(series.duration || 150)}
                        </div>
                      )}
                    </div>
                  </div>
  
                  {/* Details area */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-bold">
                          {getGenreLabel(series.genre)}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                          isPublishing ? 'text-emerald-400' : 'text-amber-500'
                        }`}>
                          {series.status}
                        </span>
                      </div>
  
                      <h3 className="font-extrabold text-sm text-gray-200 group-hover:text-white line-clamp-1 transition-colors">
                        {series.title}
                      </h3>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                        {series.description || 'Không có mô tả phim'}
                      </p>
  
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {series.viewCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {series.likeCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
  
                    {/* Actions buttons */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/hero-film/t/${teamId}/series/${series.id}`}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition cursor-pointer text-gray-300 hover:text-white"
                          title="Chỉnh sửa thông tin phim"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        
                        <Link
                          href={`/hero-film/t/${teamId}/series/${series.id}/episodes`}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition cursor-pointer text-gray-300 hover:text-white flex items-center gap-1 text-[10px] font-bold px-2.5"
                          title="Quản lý các tập phim"
                        >
                          <Play className="h-3.5 w-3.5" /> Tập phim
                        </Link>
                      </div>
  
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(series.id, series.status)}
                          disabled={isWorking}
                          className={`p-2 border rounded-xl transition cursor-pointer flex items-center justify-center ${
                            isPublishing 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                          }`}
                          title={isPublishing ? 'Hạ sóng (chuyển sang Nháp)' : 'Xuất bản (Phát sóng)'}
                        >
                          {isPublishing ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        </button>
  
                        <button
                          onClick={() => handleDeleteSeries(series.id)}
                          disabled={isWorking}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl transition cursor-pointer text-red-400 hover:text-red-300"
                          title="Xóa bộ phim"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-10 gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition cursor-pointer"
              >
                Trang trước
              </button>
              <div className="flex items-center px-4 font-bold text-gray-300">
                Trang {page} / {totalPages}
              </div>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
          <Film className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="font-bold text-base text-gray-300">Chưa có phim nào</h3>
          <p className="text-xs text-gray-500 mt-1">Bắt đầu tải lên bộ film đầu tiên của bạn ngay hôm nay!</p>
          <Link
            href={`/hero-film/t/${teamId}/series/create`}
            className="inline-flex items-center justify-center mt-6 px-5 py-2.5 bg-gradient-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 transition cursor-pointer"
          >
            Đăng Film Đầu Tiên
          </Link>
        </div>
      )}

      <FilmFooter />
    </div>
  );
}

// Icon loader helper vì Lucide-react không có LoaderCw trực tiếp đôi khi, ta dùng Loader2
function LoaderCw({ className }: { className?: string }) {
  return <RefreshCw className={className} />;
}
