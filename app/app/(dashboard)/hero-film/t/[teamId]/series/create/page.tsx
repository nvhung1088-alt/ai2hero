'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSeriesAction } from '@/lib/db/film-actions';
import { Film, ArrowLeft, Plus, Loader2 } from 'lucide-react';

export default function CreateSeriesPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = parseInt(params.teamId as string, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [genre, setGenre] = useState('romance');
  const [tagsInput, setTagsInput] = useState('');
  const [totalFreeEpisodes, setTotalFreeEpisodes] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên phim');
      return;
    }

    setSubmitting(true);
    try {
      // Parse tags
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await createSeriesAction(teamId, {
        title,
        description,
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
        genre,
        tags,
        totalFreeEpisodes: Number(totalFreeEpisodes),
      });

      if (res.success) {
        router.push(`/hero-film/t/${teamId}/series`);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi khi tạo phim mới');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20 space-y-8">
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
            Đăng Phim Mới
          </h1>
          <p className="text-xs text-gray-400 font-medium">Thêm thông tin cơ bản cho bộ film của bạn</p>
        </div>
      </div>

      {/* Form */}
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

        {/* Premium Lock Configuration */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-xl space-y-4">
          <h3 className="font-extrabold text-xs text-amber-400 flex items-center gap-1.5">
            Cấu hình Tokens & Xem miễn phí
          </h3>
          <div className="space-y-2 max-w-xs">
            <label className="text-[11px] font-bold text-gray-400 block">Số tập mở xem miễn phí ban đầu</label>
            <input
              type="number"
              min={0}
              value={totalFreeEpisodes}
              onChange={(e) => setTotalFreeEpisodes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
            <span className="text-[9px] text-gray-500 block leading-normal">
              Các tập phim vượt quá số tập này sẽ tự động bị khóa và yêu cầu Tokens để mở khóa nếu được cấu hình thu phí.
            </span>
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
              'Tạo Bộ Phim'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
