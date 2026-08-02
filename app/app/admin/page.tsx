import { getAdminDashboardStats, getAdminGrowthData, getAdminLogs } from '@/lib/db/admin-queries';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Quản trị | Super Admin',
  description: 'Tổng quan hệ thống AI2Hero Platform — thống kê người dùng, tổ chức và nhật ký kiểm toán.',
};

export default async function AdminDashboardPage() {
  try {
    const [stats, growthData, recentLogs] = await Promise.all([
      getAdminDashboardStats(),
      getAdminGrowthData(),
      getAdminLogs(5),
    ]);

    return (
      <DashboardClient
        stats={stats}
        growthData={growthData}
        recentLogs={recentLogs}
      />
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 m-6">
        <h2 className="text-xl font-bold mb-2">Lỗi tải dữ liệu Dashboard</h2>
        <pre className="text-sm overflow-auto">{error.message || String(error)}</pre>
        {error.stack && (
          <pre className="text-xs text-red-400/70 mt-4 overflow-auto max-h-48">{error.stack}</pre>
        )}
      </div>
    );
  }
}

