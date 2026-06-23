import { db } from '@/lib/db/drizzle';
import { filmSeries, filmEpisodes, filmTransactions } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import { BarChart2, Film, Eye, Coins, Play, Plus, ArrowRight, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HeroFilmDashboardPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  // 1. Lấy tổng số phim của team
  const seriesCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(filmSeries)
    .where(eq(filmSeries.teamId, teamId));
  const totalSeries = seriesCountRes[0]?.count || 0;

  // 2. Lấy tổng số tập phim
  const episodesCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(filmEpisodes)
    .where(eq(filmEpisodes.teamId, teamId));
  const totalEpisodes = episodesCountRes[0]?.count || 0;

  // 3. Tổng lượt xem tích lũy
  const viewsSumRes = await db
    .select({ sum: sql<number>`COALESCE(SUM(${filmSeries.viewCount}), 0)` })
    .from(filmSeries)
    .where(eq(filmSeries.teamId, teamId));
  const totalViews = viewsSumRes[0]?.sum || 0;

  // 4. Tổng doanh thu token tích lũy
  const revenueSumRes = await db
    .select({ sum: sql<number>`COALESCE(SUM(${filmTransactions.tokenAmount}), 0)` })
    .from(filmTransactions)
    .where(eq(filmTransactions.creatorTeamId, teamId));
  const totalRevenue = revenueSumRes[0]?.sum || 0;

  // 5. Danh sách phim có lượt xem cao nhất của team
  const topSeries = await db
    .select()
    .from(filmSeries)
    .where(eq(filmSeries.teamId, teamId))
    .orderBy(desc(filmSeries.viewCount))
    .limit(5);

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

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-rose-500" />
            Tổng Quan Film
          </h1>
          <p className="text-xs text-gray-400">Xem phân tích dữ liệu hiệu quả phát sóng và doanh thu của bạn</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/hero-film/t/${teamId}/series/create`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 cursor-pointer active:scale-95 transition"
          >
            <Plus className="h-4 w-4" /> Đăng Phim Mới
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Tổng số phim */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Tổng Số Phim</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Film className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">{totalSeries}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Bộ film đã tạo</p>
          </div>
        </div>

        {/* Card 2: Tổng số tập */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Tổng Số Tập Phim</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Play className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">{totalEpisodes}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Tập film đã đăng tải</p>
          </div>
        </div>

        {/* Card 3: Lượt xem tích lũy */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Tổng Lượt Xem</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">{totalViews.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Lượt xem tích lũy trên hệ thống</p>
          </div>
        </div>

        {/* Card 4: Tổng doanh thu */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Doanh Thu Tích Lũy</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-amber-400">{totalRevenue.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Tổng số tokens kiếm được</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Films (Table) - Left Column (2/3 width) */}
        <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white">Hiệu Suất Phát Sóng Phim</h3>
            <Link
              href={`/hero-film/t/${teamId}/series`}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
            >
              Xem tất cả phim <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {topSeries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-bold">
                    <th className="pb-3 w-[50%]">Tên Phim</th>
                    <th className="pb-3 text-center">Thể Loại</th>
                    <th className="pb-3 text-center">Số Tập</th>
                    <th className="pb-3 text-right">Lượt Xem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topSeries.map((series) => (
                    <tr key={series.id} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 flex items-center gap-3">
                        <div
                          className="h-12 w-9 rounded-lg bg-cover bg-center border border-white/5 shrink-0"
                          style={{ backgroundImage: `url(${series.coverUrl})` }}
                        />
                        <div className="min-w-0">
                          <p className="font-black text-gray-200 group-hover:text-white truncate transition-colors">{series.title}</p>
                          <p className="text-[10px] text-gray-500 font-semibold capitalize">Status: {series.status}</p>
                        </div>
                      </td>
                      <td className="py-3 text-center font-bold text-gray-400">
                        {getGenreLabel(series.genre)}
                      </td>
                      <td className="py-3 text-center font-extrabold text-gray-300">
                        {series.totalEpisodes}
                      </td>
                      <td className="py-3 text-right font-extrabold text-white">
                        {series.viewCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 font-medium">
              Chưa có dữ liệu hiệu suất phim.
            </div>
          )}
        </div>

        {/* Quick actions & Revenue Summary - Right Column (1/3 width) */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-extrabold text-sm text-white">Chi Sẻ Doanh Thu</h3>
            
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Creator Nhận Được</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">70%</span>
                  <span className="text-xs text-gray-400">doanh số Token</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                Toàn bộ tiền mở khóa phim bằng Token của người xem sẽ được chia sẻ trực tiếp: 70% dành cho người đăng phim và 30% cho vận hành hệ thống.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/5">
            <Link
              href={`/hero-film/t/${teamId}/revenue`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-gray-200 hover:text-white transition cursor-pointer active:scale-95"
            >
              <Coins className="h-4 w-4 text-amber-400" /> Báo Cáo Doanh Thu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
