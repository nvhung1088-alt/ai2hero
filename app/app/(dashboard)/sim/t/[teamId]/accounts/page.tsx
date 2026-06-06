import { 
  getSimAssets, 
  getSimEmployees, 
  getSimLinkedAccounts 
} from '@/lib/db/sim-queries';
import AccountsClient from '../../../accounts/accounts-client';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const revalidate = 0;

export default async function SimAccountsPage({ params }: { params: Promise<any> }) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  const accounts = await getSimLinkedAccounts(teamId);
  const assets = await getSimAssets(teamId);
  const employees = await getSimEmployees(teamId);

  // Lấy vai trò thực tế của user trong Workspace hiện tại
  const user = await getUser();
  let userRole = 'member';
  if (user) {
    const member = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
      .limit(1);
    if (member.length > 0) {
      userRole = member[0].role;
    }
  }

  return (
    <AccountsClient
      teamId={teamId}
      initialAccounts={accounts}
      assets={assets}
      employees={employees}
      userRole={userRole}
    />
  );
}
