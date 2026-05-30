import Link from 'next/link';
import { 
  Smartphone, 
  Link2, 
  Users, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { getCurrentTeamId } from '@/lib/sim-helpers';
import { getSimDashboardStats, getSimAssets, getSimRiskEvents } from '@/lib/db/sim-queries';
import SimGuideBox from './guide-box';

export const revalidate = 0; // Tắt cache để load real-time data

export default async function SimDashboardPage() {
  const teamId = await getCurrentTeamId();
  const stats = await getSimDashboardStats(teamId);
  const assets = await getSimAssets(teamId);
  const activeAlerts = await getSimRiskEvents(teamId, 'active');

  // Tính toán phân phối rủi ro cho biểu đồ donut
  const totalSims = assets.length;
  const safeSims = assets.filter(s => (s.riskScore || 0) < 30).length;
  const watchSims = assets.filter(s => (s.riskScore || 0) >= 30 && (s.riskScore || 0) < 60).length;
  const highSims = assets.filter(s => (s.riskScore || 0) >= 60 && (s.riskScore || 0) < 80).length;
  const critSims = assets.filter(s => (s.riskScore || 0) >= 80).length;

  const safePct = totalSims > 0 ? (safeSims / totalSims) * 100 : 0;
  const watchPct = totalSims > 0 ? (watchSims / totalSims) * 100 : 0;
  const highPct = totalSims > 0 ? (highSims / totalSims) * 100 : 0;
  const critPct = totalSims > 0 ? (critSims / totalSims) * 100 : 0;

  // Lấy top 5 SIM rủi ro nhất
  const topRiskySims = [...assets]
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5);

  // Helper hiển thị màu rủi ro
  const getRiskColorClass = (score: number) => {
    if (score >= 80) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 60) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (score >= 30) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'Nguy cấp';
    if (score >= 60) return 'Rủi ro cao';
    if (score >= 30) return 'Cần theo dõi';
    return 'Lành mạnh';
  };

  return (
    <div className="space-y-6">
      {/* Box Hướng dẫn Premium */}
      <SimGuideBox />

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total SIMs */}
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Tổng số SIM</p>
            <p className="text-3xl font-black text-white">{stats.totalSIMs}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        {/* Card 2: Linked Accounts */}
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Tài khoản liên kết</p>
            <p className="text-3xl font-black text-white">{stats.totalAccounts}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <Link2 className="h-6 w-6 text-pink-500" />
          </div>
        </div>

        {/* Card 3: Employees */}
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Nhân sự phụ trách</p>
            <p className="text-3xl font-black text-white">{stats.totalEmployees}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        {/* Card 4: Active Risks */}
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Rủi ro chưa xử lý</p>
            <p className="text-3xl font-black text-white">{stats.activeRisks}</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
            stats.activeRisks > 0 
              ? 'bg-red-500/10 border-red-500/20 animate-pulse' 
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <AlertTriangle className={`h-6 w-6 ${stats.activeRisks > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
        </div>
      </div>

      {/* Grid Content: Chart + Top Risk Sims */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Donut Chart */}
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
              Báo cáo an toàn SIM
            </h2>
            <p className="text-xs text-gray-400 mt-1">Phân bố cấp độ rủi ro hệ thống SIM</p>
          </div>

          {/* Donut Visual */}
          <div className="my-8 flex justify-center">
            <div className="relative h-44 w-44 rounded-full flex items-center justify-center transition-transform hover:scale-105 duration-300"
              style={{
                background: totalSims > 0 
                  ? `conic-gradient(#ef4444 0% ${critPct}%, #f97316 ${critPct}% ${critPct + highPct}%, #f59e0b ${critPct + highPct}% ${critPct + highPct + watchPct}%, #10b981 ${critPct + highPct + watchPct}% 100%)`
                  : '#1f2937'
              }}
            >
              {/* Inner Circle for Donut Effect */}
              <div className="absolute inset-4 rounded-full bg-gray-900 flex flex-col items-center justify-center border border-white/5">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Điểm TB</span>
                <span className="text-3xl font-black text-white">{stats.avgRiskScore}</span>
                <span className="text-gray-500 text-[9px] mt-0.5">/ 100</span>
              </div>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Lành mạnh</p>
                <p className="font-extrabold text-white text-xs">{safeSims} SIM ({Math.round(safePct)}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-yellow-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Theo dõi</p>
                <p className="font-extrabold text-white text-xs">{watchSims} SIM ({Math.round(watchPct)}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Rủi ro cao</p>
                <p className="font-extrabold text-white text-xs">{highSims} SIM ({Math.round(highPct)}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
              <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Nguy cấp</p>
                <p className="font-extrabold text-white text-xs">{critSims} SIM ({Math.round(critPct)}%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Risky SIMs */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-500" />
                  Top SIM có rủi ro cao nhất
                </h2>
                <p className="text-xs text-gray-400 mt-1">Cần kiểm tra định kỳ và kiểm duyệt bảo mật ngay</p>
              </div>
              <Link 
                href="/sim/assets" 
                className="text-xs text-orange-400 font-extrabold flex items-center gap-1 hover:underline"
              >
                Tất cả SIM <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-white/5">
              {topRiskySims.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 italic">
                  Chưa có dữ liệu SIM nào trong nhóm
                </div>
              ) : (
                topRiskySims.map((sim) => (
                  <div key={sim.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white group-hover:text-orange-400 transition-colors">
                          {sim.name}
                        </span>
                        <span className="text-xs text-gray-400">({sim.value})</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-400">
                        <span>Nhà mạng: <strong className="text-gray-300">{sim.carrier}</strong></span>
                        <span>Nhân sự: <strong className="text-gray-300">{sim.ownerName || 'Chưa bàn giao'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 text-[10px] font-black border rounded-lg ${getRiskColorClass(sim.riskScore || 0)}`}>
                        {sim.riskScore} điểm - {getRiskLabel(sim.riskScore || 0)}
                      </div>
                      <Link
                        href={`/sim/assets?search=${encodeURIComponent(sim.value)}`}
                        className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-400 hover:text-white transition-all"
                        aria-label={`Xem chi tiết SIM ${sim.name}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="border-t border-white/5 pt-4 mt-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lối tắt nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link href="/sim/assets" className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl text-center transition-all group">
                <Smartphone className="h-5 w-5 mx-auto text-orange-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-extrabold text-gray-300 group-hover:text-white">Xem Kho SIM</span>
              </Link>
              <Link href="/sim/accounts" className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl text-center transition-all group">
                <Link2 className="h-5 w-5 mx-auto text-pink-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-extrabold text-gray-300 group-hover:text-white">Tài Khoản</span>
              </Link>
              <Link href="/sim/alerts" className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl text-center transition-all group">
                <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-extrabold text-gray-300 group-hover:text-white">Cảnh Báo ({stats.activeRisks})</span>
              </Link>
              <Link href="/sim/history" className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] rounded-xl text-center transition-all group">
                <Activity className="h-5 w-5 mx-auto text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-extrabold text-gray-300 group-hover:text-white">Lịch Sử Check</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts List Component (Compact) */}
      <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cảnh báo rủi ro hoạt động
            </h2>
            <p className="text-xs text-gray-400 mt-1">Các rủi ro bảo mật vừa được ghi nhận</p>
          </div>
          <Link 
            href="/sim/alerts" 
            className="text-xs text-orange-400 font-extrabold flex items-center gap-1 hover:underline"
          >
            Chi tiết cảnh báo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 font-bold">
                <th className="py-2.5">Thiết bị SIM</th>
                <th className="py-2.5">SĐT</th>
                <th className="py-2.5">Loại Rủi Ro</th>
                <th className="py-2.5">Chi Tiết Cảnh Báo</th>
                <th className="py-2.5">Mức Độ</th>
                <th className="py-2.5 text-right">Phát Hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                    🎉 Tuyệt vời! Không có cảnh báo bảo mật nào cần xử lý.
                  </td>
                </tr>
              ) : (
                activeAlerts.slice(0, 5).map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 font-extrabold text-white">{alert.assetName}</td>
                    <td className="py-3 text-gray-300">{alert.assetValue}</td>
                    <td className="py-3 font-semibold text-orange-400">{alert.riskType}</td>
                    <td className="py-3 text-gray-400 max-w-xs truncate" title={alert.message || ''}>
                      {alert.message}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        alert.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {alert.riskLevel === 'critical' ? 'Nguy cấp' :
                         alert.riskLevel === 'high' ? 'Cao' : 'Trung bình'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
