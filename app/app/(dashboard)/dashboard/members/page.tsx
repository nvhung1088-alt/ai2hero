import { redirect } from 'next/navigation';
import { getTeamForUser } from '@/lib/db/queries';

export default async function MembersRedirectPage() {
  const team = await getTeamForUser(); // Đọc cookie → lấy team
  if (!team) redirect('/dashboard');
  redirect(`/dashboard/t/${team.id}/members`);
}
