import { getAdminTeams } from '@/lib/db/admin-queries';
import TeamsClient from './teams-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Quản lý tổ chức | Super Admin',
  description: 'Quản trị danh sách tổ chức, cấu hình gói dịch vụ và mức độ sử dụng tài nguyên hệ thống AI2Hero.',
};

export default async function AdminTeamsPage() {
  const result = await getAdminTeams();

  return <TeamsClient initialTeams={result.data} />;
}
