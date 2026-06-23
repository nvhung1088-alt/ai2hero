import { getRevenueReportAction } from '@/lib/db/film-actions';
import { Coins, TrendingUp, ShieldAlert, Award, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RevenueReportPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  const report = await getRevenueReportAction(teamId);
  const { totals, seriesRevenue, recentTransactions } = report;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            Báo Cáo Doanh Thu
          </h1>
          <p className="text-xs text-gray-400">Thống kê Tokens thu phí mở khóa tập phim và tỉ lệ chia sẻ 70/30</p>
        </div>

        <Link
          href={`/hero-film/t/${teamId}/dashboard`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-xl text-xs font-black text-gray-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Tổng tokens */}
        <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Doanh Số Tokens Tích Lũy</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">{(totals?.totalToken || 0).toLocaleString()}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Tổng tokens người dùng đã chi trả</p>
          </div>
        </div>

        {/* Card 2: Creator Share 70% */}
        <div className="bg-white/[0.01] border border-rose-500/10 p-6 rounded-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-bl-full flex items-center justify-center">
            <Award className="h-4.5 w-4.5 text-rose-500/40 translate-x-2.5 -translate-y-2.5" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Creator Nhận Được (70%)</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-rose-400">{(totals?.creatorToken || 0).toLocaleString()}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Số tokens thực nhận của Creator</p>
          </div>
        </div>

        {/* Card 3: Platform Share 30% */}
        <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Hệ Thống Thu Phí (30%)</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-gray-300">{(totals?.platformToken || 0).toLocaleString()}</h3>
            <p className="text-[10px] text-gray-500 font-medium">Phí vận hành hệ thống AI2Hero</p>
          </div>
        </div>
      </div>

      {/* Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Doanh thu theo phim (2/3 width) */}
        <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-5">
          <h3 className="font-extrabold text-sm text-white">Doanh Thu Theo Từng Bộ Phim</h3>

          {seriesRevenue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-bold">
                    <th className="pb-3 w-[50%]">Tên Phim</th>
                    <th className="pb-3 text-center">Lượt Mua Tập</th>
                    <th className="pb-3 text-right">Tổng Tokens</th>
                    <th className="pb-3 text-right">Creator Nhận (70%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {seriesRevenue.map((series) => (
                    <tr key={series.seriesId} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 flex items-center gap-3">
                        <div
                          className="h-12 w-9 rounded-lg bg-cover bg-center border border-white/5 shrink-0"
                          style={{ backgroundImage: `url(${series.coverUrl})` }}
                        />
                        <span className="font-black text-gray-200 group-hover:text-white transition-colors truncate">
                          {series.title}
                        </span>
                      </td>
                      <td className="py-3 text-center font-extrabold text-gray-300">
                        {series.purchasesCount}
                      </td>
                      <td className="py-3 text-right font-extrabold text-white">
                        {(series.totalToken || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-black text-rose-400">
                        {(series.creatorToken || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 font-medium">
              Chưa có phim nào có lượt mua tập.
            </div>
          )}
        </div>

        {/* 10 Giao dịch gần nhất (1/3 width) */}
        <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl space-y-5">
          <h3 className="font-extrabold text-sm text-white">Giao Dịch Gần Nhất</h3>

          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="bg-white/[0.01] border border-white/5 p-3 rounded-xl space-y-2 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-gray-400">
                    <span className="text-rose-400">+{tx.creatorAmount} Tokens</span>
                    <span className="flex items-center gap-1 text-[9px] font-medium">
                      <Calendar className="h-3 w-3" />
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-gray-200 line-clamp-1">{tx.seriesTitle}</p>
                    <p className="text-gray-500 font-semibold">
                      Tập {tx.episodeNumber}: {tx.episodeTitle || `Tập ${tx.episodeNumber}`}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-500">
                    <span>Người mua: {tx.userEmail}</span>
                    <span>Tổng: {tx.tokenAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 font-medium">
              Chưa có giao dịch mua phim nào phát sinh.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
