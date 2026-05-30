import { getAdminDashboardStats, getAdminGrowthData, getAdminLogs } from '@/lib/db/admin-queries';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Quản trị | Super Admin',
  description: 'Tổng quan hệ thống AI2Hero Platform — thống kê người dùng, tổ chức và nhật ký kiểm toán.',
};

export default async function AdminDashboardPage() {
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
}

