'use client';

import {
  Users,
  Building,
  Activity,
  DollarSign,
  Server,
  AlertTriangle,
  Info,
  XCircle,
  ArrowUpRight,
  Crown
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber, formatVND } from '@/lib/shared-constants';
import { AdminDashboardStats, AdminGrowthRecord, AdminLogRecord } from '@/lib/db/admin-queries';

// Component Bar Chart thuần CSS
type BarChartProps = {
  data: { label: string; value: number }[];
  maxValue: number;
  colorClass: string;
  formatValue: (val: number) => string;
};

function PureCSSBarChart({ data, maxValue, colorClass, formatValue }: BarChartProps) {
  return (
    <div className="flex items-end gap-3 h-48 pt-6 pb-2 px-2 border-b border-white/5 w-full justify-between">
      {data.map((item, index) => {
        const percentage = Math.max(5, Math.min(100, (item.value / maxValue) * 100));
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
            {/* Tooltip giá trị */}
            <div className="absolute -top-7 scale-0 group-hover:scale-100 transition-all duration-150 bg-gray-900 border border-white/10 text-white text-[10px] py-1 px-2 rounded font-medium shadow-md whitespace-nowrap z-10">
              {formatValue(item.value)}
            </div>
            
            {/* Cột Bar */}
            <div className="w-full flex items-end justify-center h-32">
              <div
                className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ease-out origin-bottom ${colorClass}`}
                style={{ height: `${percentage}%` }}
              />
            </div>
            
            {/* Nhãn */}
            <span className="text-[11px] text-gray-500 font-bold">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface DashboardClientProps {
  stats: AdminDashboardStats;
  growthData: AdminGrowthRecord[];
  recentLogs: AdminLogRecord[];
}

export default function DashboardClient({ stats, growthData, recentLogs }: DashboardClientProps) {
  // Chuẩn bị dữ liệu cho charts
  const userGrowthData = growthData.map(d => ({ label: d.month, value: d.users }));
  const maxUsers = Math.max(...userGrowthData.map(d => d.value)) || 1;

  const teamGrowthData = growthData.map(d => ({ label: d.month, value: d.teams }));
  const maxTeams = Math.max(...teamGrowthData.map(d => d.value)) || 1;

  const statsItems = [
    {
      label: 'Tổng người dùng',
      value: formatNumber(stats.totalUsers),
      sub: `+${stats.newUsersThisWeek} tuần này`,
      icon: Users,
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      delay: '0.0s'
    },
    {
      label: 'Tổng tổ chức',
      value: formatNumber(stats.totalTeams),
      sub: 'Đang hoạt động',
      icon: Building,
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      delay: '0.05s'
    },
    {
      label: 'Tổng hoạt động',
      value: formatNumber(stats.totalActivities),
      sub: 'Nhật ký kiểm toán',
      icon: Activity,
      iconBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      delay: '0.1s'
    },
    {
      label: 'Doanh thu tháng',
      value: '—',
      sub: 'Chưa kết nối Stripe',
      icon: DollarSign,
      iconBg: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      delay: '0.15s'
    },
    {
      label: 'Tổ chức tích cực',
      value: `${stats.activeTeamsCount} nhóm`,
      sub: 'Hoạt động trong 24h',
      icon: Server,
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      delay: '0.2s'
    },
    {
      label: 'Hệ thống Uptime',
      value: '—',
      sub: 'Chưa kết nối monitoring',
      icon: Server,
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      delay: '0.25s'
    }
  ];

  return (
    <div className="space-y-8 text-white">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-gray-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-gray-950/10 border border-white/5 animate-fade-up">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-orange-300 border border-white/10">
            <Crown className="h-3.5 w-3.5" />
            Super Admin Console
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Dashboard Quản trị
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            Hệ thống phân tích và điều phối vĩ mô của nền tảng AI2Hero Super App. Theo dõi sự tăng trưởng của người dùng, tài chính và trạng thái hạ tầng hệ thống trong thời gian thực.
          </p>
        </div>
        {/* Blob trang trí */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl -translate-y-12 translate-x-12 shrink-0 pointer-events-none" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {statsItems.map((s, idx) => (
          <div
            key={idx}
            className="bg-gray-900/40 border border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-white/10 transition-all duration-200 flex items-center justify-between animate-fade-up backdrop-blur-xl"
            style={{ animationDelay: s.delay }}
          >
            <div className="space-y-1.5 min-w-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">{s.label}</span>
              <h2 className="text-xl lg:text-2xl font-bold text-white truncate">{s.value}</h2>
              <span className="text-[11px] text-gray-400 font-medium block">{s.sub}</span>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
              <s.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        {/* User growth chart */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold text-white">Tăng trưởng người dùng</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Số lượng người dùng hoạt động qua các tháng (tích lũy)</p>
            </div>
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              Users
            </span>
          </div>
          <PureCSSBarChart
            data={userGrowthData}
            maxValue={maxUsers}
            colorClass="bg-gradient-to-t from-blue-500 to-indigo-400 shadow-md shadow-blue-500/10"
            formatValue={formatNumber}
          />
        </div>

        {/* Team growth chart */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col justify-between backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold text-white">Tăng trưởng tổ chức</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Số lượng tổ chức được đăng ký qua các tháng (tích lũy)</p>
            </div>
            <span className="text-xs font-semibold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
              Teams
            </span>
          </div>
          <PureCSSBarChart
            data={teamGrowthData}
            maxValue={maxTeams}
            colorClass="bg-gradient-to-t from-orange-500 to-pink-500 shadow-md shadow-orange-500/10"
            formatValue={formatNumber}
          />
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl shadow-sm overflow-hidden animate-fade-up backdrop-blur-xl" style={{ animationDelay: '0.35s' }}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Hoạt động hệ thống gần đây</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Nhật ký kiểm toán toàn cục trên nền tảng</p>
          </div>
          <Link
            href="/admin/logs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            aria-label="Xem toàn bộ nhật ký hệ thống"
          >
            Xem toàn bộ
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {recentLogs.map((log) => {
            let SeverityIcon = Info;
            let severityStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            
            if (log.severity === 'warning') {
              SeverityIcon = AlertTriangle;
              severityStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            } else if (log.severity === 'error') {
              SeverityIcon = XCircle;
              severityStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
            }

            const formattedTime = new Date(log.timestamp).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            return (
              <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${severityStyle}`}>
                  <SeverityIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-600 font-medium">•</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{formattedTime}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-200 break-words">
                    {log.details}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    Tác nhân: <span className="font-semibold text-gray-400">{log.actorName}</span> ({log.actorEmail}) | Đối tượng: <span className="font-semibold text-gray-400">{log.targetTeam}</span>
                  </p>
                </div>
              </div>
            );
          })}
          {recentLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-semibold">
              Chưa có nhật ký hoạt động nào được ghi nhận.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
