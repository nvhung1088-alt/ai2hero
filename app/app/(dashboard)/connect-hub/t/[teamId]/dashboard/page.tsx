import {
  getConnectionStats,
  getConnectionsByTeam,
  getUsageLogs
} from '@/lib/db/connect-hub-queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';
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
  ArrowLeftRight
} from 'lucide-react';

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

  // 1. Lấy connections trước để tái sử dụng
  const rawConnections = await getConnectionsByTeam(teamId);
  const connections = rawConnections.slice(0, 5); // Lấy tối đa 5 dòng mới nhất

  // 2. Chạy song song các tiến trình độc lập bằng Promise.all
  const [stats, logs] = await Promise.all([
    getConnectionStats(teamId, rawConnections),
    getUsageLogs(teamId, 5)
  ]);

  return (
    <div className="space-y-8 text-white">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border border-white/5 rounded-3xl p-6 lg:p-8 backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
            Connect Hub Lite
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-white leading-none">
            Cổng kết nối API Trung tâm
          </h1>
          <p className="text-xs text-gray-400 font-medium max-w-xl">
            Tích hợp KiotViet, Google Sheets, Gmail, Telegram hoặc bất kỳ REST API nào trong không gian của bạn. Kết nối một lần — dùng chung cho mọi MVP của AI2Hero.
          </p>
        </div>
      </div>

      {/* Grid 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số kết nối */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng kết nối</p>
            <p className="text-2xl font-black text-white">{stats.totalConnections}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400">
            <Plug className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-2xl font-black text-green-400">{stats.activeConnections}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Kết nối bị lỗi */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cần kiểm tra</p>
            <p className="text-2xl font-black text-rose-400">{stats.errorConnections}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Lượt dùng tháng này */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thực thi tháng này</p>
            <p className="text-2xl font-black text-purple-400">{stats.monthlyUsage}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Grid Content: Connections (Left) and Logs & Shortcuts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Connections list */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-purple-500" />
                Kết nối tích hợp gần đây
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Danh sách các tài khoản API đã kết nối vào không gian</p>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl text-[10px] font-bold text-white shadow-md shadow-purple-500/15 cursor-pointer select-none transition-all"
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
                    <th className="pb-2.5">Tên kết nối</th>
                    <th className="pb-2.5">Trạng thái</th>
                    <th className="pb-2.5">Thực thi cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {connections.map((conn) => (
                    <tr key={conn.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${getConnectorColor(conn.appSlug)} shadow-sm text-white shrink-0`}>
                          {getConnectorIcon(conn.appSlug)}
                        </div>
                        <span className="font-bold text-gray-200">{conn.appName}</span>
                      </td>
                      <td className="py-3 font-semibold text-gray-400">{conn.connectionName}</td>
                      <td className="py-3">
                        <span
                           className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            conn.status === 'connected'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${conn.status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-rose-400'}`} />
                          {conn.status === 'connected' ? 'Hoạt động' : 'Gặp sự cố'}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-gray-500">
                        {conn.lastUsedAt
                          ? new Date(conn.lastUsedAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit'
                            })
                          : 'Chưa sử dụng'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Shortcuts and usage logs overview */}
        <div className="space-y-6">
          {/* Shortcuts panel */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              Lối tắt hành động
            </h3>
            
            <div className="grid grid-cols-1 gap-2">
              <Link
                href={`/connect-hub/t/${teamId}/apps`}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold text-gray-200 hover:text-white transition-all select-none cursor-pointer"
              >
                <span>➕ Kết nối ứng dụng mới</span>
                <ArrowRight className="h-3.5 w-3.5 text-purple-500" />
              </Link>
              <Link
                href={`/connect-hub/t/${teamId}/connections`}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold text-gray-200 hover:text-white transition-all select-none cursor-pointer"
              >
                <span>🔌 Quản lý danh sách kết nối</span>
                <ArrowRight className="h-3.5 w-3.5 text-purple-500" />
              </Link>
              <Link
                href={`/connect-hub/t/${teamId}/logs`}
                className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold text-gray-200 hover:text-white transition-all select-none cursor-pointer"
              >
                <span>📊 Xem lịch sử chạy API</span>
                <ArrowRight className="h-3.5 w-3.5 text-purple-500" />
              </Link>
            </div>
          </div>

          {/* Usage logs panel */}
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-purple-500" />
                Lịch sử hoạt động mới
              </h3>
              <Link href={`/connect-hub/t/${teamId}/logs`} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold select-none cursor-pointer">
                Xem hết
              </Link>
            </div>

            {logs.length === 0 ? (
              <p className="text-[10px] text-gray-500 font-semibold text-center py-4">Chưa có hoạt động thực thi nào phát sinh</p>
            ) : (
              <div className="space-y-3.5">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between text-[11px] group">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-1 rounded-md bg-gradient-to-tr ${getConnectorColor(log.appSlug || '')} text-white shrink-0 mt-0.5 shadow-sm`}>
                        {getConnectorIcon(log.appSlug || '', 'h-3 w-3')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-200 truncate leading-tight">
                          {log.actionName === 'get_request' ? 'GET Request' : log.actionName === 'post_request' ? 'POST Request' : log.actionName || 'Action'}
                        </p>
                        <p className="text-[9px] text-gray-500 font-medium">
                          Bởi module: <span className="text-purple-400">{log.callerModule}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center text-[9px] font-bold ${log.status === 'success' ? 'text-green-400' : 'text-rose-400'}`}>
                        {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                      </span>
                      <p className="text-[9px] text-gray-600 font-semibold mt-0.5">{log.durationMs || 0}ms</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
