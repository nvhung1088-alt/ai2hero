import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import TopHeader from '@/components/top-header';
import { CreateWorkspaceModal } from '../../../dashboard/create-workspace-modal';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { CookieSync } from '@/components/cookie-sync';

export const revalidate = 0;

export default async function HeroVideoDynamicLayout({
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

  const teamList = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  const team = teamList[0];

  if (!team) {
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

  if (!activatedApps.includes('herovideo')) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
      <CookieSync teamId={teamId} />
      <CreateWorkspaceModal hideTrigger={true} />
      {/* Top Header Premium dùng chung */}
      <TopHeader />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Sidebar dọc riêng biệt của Video Download */}
        <aside className="w-full lg:w-60 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            {/* Header Sidebar: Thông tin Không gian làm việc hiện tại */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Không gian hiện tại</span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-500/10 shrink-0">
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

            {/* Menu Điều hướng dọc của HeroVideo */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider px-3 block mb-2">HeroVideo</span>
              <Link
                href={`/herovideodownload/t/${team.id}/dashboard`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 bg-gradient-to-r from-pink-500/10 to-transparent border border-pink-500/20`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-500 shadow-md`}>
                    <Video className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className={`text-xs font-bold text-white`}>
                    Kho Video Nguồn
                  </span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Footer Sidebar */}
          <div className="border-t border-white/5 pt-3 text-center text-[10px] text-gray-500 font-bold select-none">
            HeroVideo v1.0
          </div>
        </aside>

        {/* Main Content Area - Full Width Design */}
        <main className="flex-1 p-6 w-full overflow-y-auto animate-fade-in bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
