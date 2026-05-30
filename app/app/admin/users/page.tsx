import { getAdminUsers } from '@/lib/db/admin-queries';
import UsersClient from './users-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Quản lý người dùng | Super Admin',
  description: 'Quản trị danh sách người dùng và phân quyền hệ thống AI2Hero.',
};

export default async function AdminUsersPage() {
  const result = await getAdminUsers();

  return <UsersClient initialUsers={result.data} />;
}
