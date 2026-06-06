import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TopHeader from '@/components/top-header';
import { CreateWorkspaceModal } from '../../../dashboard/create-workspace-modal';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { CookieSync } from '@/components/cookie-sync';
import SimTabs from '../../sim-tabs';
import BridgeAPI from '../../bridge-api';
import { 
  getSimAssets, 
  getSimLinkedAccounts, 
  getSimEmployees, 
  getSimPlatforms, 
  getSimRiskEvents, 
  getSimCheckLogs 
} from '@/lib/db/sim-queries';

export const revalidate = 0;

export default async function SimDynamicLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // IDOR Protection: Verify user belongs to this team
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)),
  });
  
  if (!membership) {
    redirect('/dashboard');
  }

  // Load all vault data and team info concurrently on server
  const [
    assets,
    linkedAccounts,
    employees,
    platforms,
    riskEvents,
    checkLogs,
    teamList
  ] = await Promise.all([
    getSimAssets(teamId),
    getSimLinkedAccounts(teamId),
    getSimEmployees(teamId),
    getSimPlatforms(teamId),
    getSimRiskEvents(teamId),
    getSimCheckLogs(teamId),
    db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
  ]);

  const team = teamList[0];

  if (!team || team.deletedAt) {
    redirect('/dashboard');
  }

  // Phòng vệ tuyệt đối: Đảm bảo activatedApps là mảng string hợp lệ
  let activatedApps: string[] = [];
  if (team.activatedApps) {
    if (Array.isArray(team.activatedApps)) {
      activatedApps = team.activatedApps as string[];
    } else if (typeof team.activatedApps === 'string') {
      try {
        const parsed = JSON.parse(team.activatedApps);
        if (Array.isArray(parsed)) {
          activatedApps = parsed;
        }
      } catch (e) {
        activatedApps = [team.activatedApps];
      }
    }
  }

  if (!activatedApps.includes('sim')) {
    redirect('/dashboard');
  }

  const vaultData = {
    assets,
    linkedAccounts,
    employees,
    platforms,
    riskEvents,
    checkLogs
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
      <CookieSync teamId={teamId} />
      <CreateWorkspaceModal hideTrigger={true} />
      
      {/* Top Header toàn cục dùng chung */}
      <TopHeader />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Sidebar dọc riêng biệt của SIM */}
        <aside className="w-full lg:w-60 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            {/* Header Sidebar: Không gian làm việc hiện tại */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Không gian hiện tại</span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-500/10 shrink-0">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-white truncate leading-snug">{team.name}</p>
                  <p className="text-[9px] text-gray-400 capitalize">{team.planName || 'Free'} Plan</p>
                </div>
              </div>

              <Link
                href={`/dashboard/t/${team.id}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-lg text-[10px] font-black text-gray-300 hover:text-white transition-all text-center cursor-pointer select-none"
              >
                <ArrowLeft className="h-3 w-3" /> Quay về Workspace
              </Link>
            </div>

            {/* Menu điều hướng dọc chính của SIM */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">HeroSim</span>
              <SimTabs teamId={team.id} />
            </div>
          </div>

          {/* Footer Sidebar */}
          <div className="border-t border-white/5 pt-3 text-center text-[10px] text-gray-500 font-bold select-none">
            HeroSim v3.0
          </div>
        </aside>

        {/* Bridge API synchronization component */}
        <BridgeAPI teamId={teamId} vaultData={vaultData} />

        {/* Vùng hiển thị nội dung chính */}
        <main className="flex-1 p-6 w-full overflow-y-auto animate-fade-in bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
