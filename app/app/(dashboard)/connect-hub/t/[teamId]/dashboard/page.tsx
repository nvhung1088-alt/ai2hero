import {
  getConnectionStats,
  getConnectionsByTeam,
  getUsageChartData
} from '@/lib/db/connect-hub-queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import {
  Plug,
  AlertCircle,
  CheckCircle2,
  Activity,
  Plus,
  ArrowRight,
  Globe,
  ShoppingCart,
  FileSpreadsheet,
  Mail,
  Send,
  Zap,
  Clock,
  ArrowLeftRight,
  Coins,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import DashboardChart from './dashboard-chart';

export const revalidate = 0;

// Helper map icon tĩnh dựa trên app slug
function getConnectorIcon(slug: string, className: string = 'h-4 w-4') {
  switch (slug) {
    case 'custom-http':
      return <Globe className={className} />;
    case 'kiotviet':
      return <ShoppingCart className={className} />;
    case 'google-sheets':
      return <FileSpreadsheet className={className} />;
    case 'gmail':
      return <Mail className={className} />;
    case 'telegram':
      return <Send className={className} />;
    default:
      return <Plug className={className} />;
  }
}

// Helper map màu gradient cho icon background
function getConnectorColor(slug: string) {
  switch (slug) {
    case 'custom-http':
      return 'from-blue-500 to-cyan-500';
    case 'kiotviet':
      return 'from-green-500 to-emerald-500';
    case 'google-sheets':
      return 'from-green-600 to-teal-500';
    case 'gmail':
      return 'from-red-500 to-rose-400';
    case 'telegram':
      return 'from-sky-400 to-blue-500';
    default:
      return 'from-purple-500 to-indigo-500';
  }
}

export default async function ConnectHubDynamicDashboardPage({
  params
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // Lấy dữ liệu
  const rawConnections = await getConnectionsByTeam(teamId);
  const connections = rawConnections.slice(0, 5); // Tối đa 5 dòng mới nhất

  const [stats, chartData, user] = await Promise.all([
    getConnectionStats(teamId, rawConnections),
    getUsageChartData(teamId, 90),
    getUser()
  ]);

  return (
    <div className="space-y-6 text-white pb-10">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border border-white/5 rounded-3xl p-6 lg:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            Connect Hub Analytics
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-white leading-none">
            Trung tâm Điều hành API
          </h1>
          <p className="text-xs text-gray-400 font-medium max-w-xl">
            Giám sát thời gian thực mọi kết nối, lưu lượng token, chi phí sử dụng và trạng thái sức khỏe (Health Check) của các API trong hệ sinh thái AI2Hero.
          </p>
        </div>
      </div>

      {/* KPI Cards (5 thẻ) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng APIs</p>
            <div className="p-1.5 rounded-lg bg-white/5 text-gray-400"><Plug className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-white">{stats.totalConnections}</p>
        </div>
        {/* Card 2 */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Liên kết MVP</p>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><Cpu className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-indigo-400">{stats.totalMvpLinked || 0}</p>
        </div>
        {/* Card 3 */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lượng Token</p>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400"><Activity className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-cyan-400">{stats.monthlyTokens?.toLocaleString() || 0}</p>
        </div>
        {/* Card 4 */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chi phí USD</p>
            <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400"><Coins className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-green-400">${stats.monthlyCost?.toFixed(4) || '0.0000'}</p>
        </div>
        {/* Card 5 */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tỷ lệ Lỗi</p>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"><AlertCircle className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-black text-rose-400">{stats.errorRate?.toFixed(2) || '0.00'}%</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl w-full flex flex-col min-h-[400px]">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-purple-500" /> Biểu đồ Thực thi & Chi phí API
        </h2>
        <p className="text-[10px] text-gray-400 font-medium mb-6">Lưu lượng Request và ước tính chi phí USD dựa trên API sử dụng.</p>
        <div className="flex-1 w-full min-h-[300px]">
          <DashboardChart data={chartData} />
        </div>
      </div>

      {/* Table API Connections */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-purple-500" />
              Sức khỏe Kết nối API (Health Check)
            </h2>
            <p className="text-[10px] text-gray-400 font-medium">Trạng thái tin cậy của các API được tích hợp</p>
          </div>
          <Link
            href={`/connect-hub/t/${teamId}/connections`}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors select-none"
          >
            Xem tất cả <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <span className="text-3xl">🔌</span>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-300">Chưa có kết nối API nào</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Bắt đầu kết nối ứng dụng đầu tiên để liên kết dữ liệu</p>
            </div>
            <Link
              href={`/connect-hub/t/${teamId}/apps`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-[10px] font-bold text-white shadow-md cursor-pointer select-none"
            >
              <Plus className="h-3 w-3" /> Kết nối ngay
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-500 font-bold border-b border-white/5">
                  <th className="pb-2.5">Ứng dụng</th>
                  <th className="pb-2.5">Health Score</th>
                  <th className="pb-2.5">Trạng thái</th>
                  <th className="pb-2.5">Hệ thống Auto-Heal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {connections.map((c) => {
                  const isError = c.status === 'error';
                  const isHealing = c.status === 'healing';
                  const healthScore = c.healthScore || 100;
                  
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${getConnectorColor(c.appSlug)} text-white`}>
                            {getConnectorIcon(c.appSlug)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-200">{c.connectionName}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{c.appName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${healthScore > 80 ? 'bg-green-500' : healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                              style={{ width: `${healthScore}%` }}
                            />
                          </div>
                          <span className="font-medium text-gray-400">{healthScore}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {isError ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold text-[10px] border border-rose-500/20">
                            <AlertCircle className="h-3 w-3" /> Mất kết nối
                          </span>
                        ) : isHealing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold text-[10px] border border-yellow-500/20">
                            <Activity className="h-3 w-3" /> Đang phục hồi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-bold text-[10px] border border-green-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Sẵn sàng
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500">
                        {healthScore === 100 ? (
                           <span className="flex items-center gap-1 text-[10px] text-gray-500"><ShieldCheck className="h-3 w-3 text-gray-600"/> Ổn định</span>
                        ) : healthScore > 50 && healthScore < 100 && !isError ? (
                           <span className="flex items-center gap-1 text-[10px] text-cyan-400"><Zap className="h-3 w-3"/> Đã Auto-Healed</span>
                        ) : isError ? (
                           <span className="flex items-center gap-1 text-[10px] text-yellow-500"><Clock className="h-3 w-3"/> Chờ Auto-Heal (Cron)</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
