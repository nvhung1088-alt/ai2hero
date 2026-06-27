import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TopHeader from '@/components/top-header';
import { CreateWorkspaceModal } from '../../../dashboard/create-workspace-modal';
import { redirect } from 'next/navigation';
import HeroCoccocSidebarMenu from '../../hero-coccoc-sidebar-menu';
import { getUser } from '@/lib/db/queries';
import { CookieSync } from '@/components/cookie-sync';
import { isPreviewMode } from '@/lib/preview-actions';
import { PreviewBanner } from '@/app/(dashboard)/preview-banner';

export const revalidate = 0;

export default async function HeroCoccocDynamicLayout({
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

  // Check activated apps
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

  const isPreview = await isPreviewMode('hero-coccoc', teamId);
  if (!activatedApps.includes('hero-coccoc') && !isPreview) {
    redirect('/dashboard');
  }

  return (
    <>
      {isPreview && <PreviewBanner appId="hero-coccoc" />}
      <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
        <CookieSync teamId={teamId} />
        <CreateWorkspaceModal hideTrigger={true} />
        
        {/* Top Header */}
        <TopHeader />

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
          {/* Sidebar */}
          <aside className="w-full lg:w-60 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
            <div className="space-y-6">
              {/* Header Workspace */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Không gian hiện tại</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-teal-500/10 shrink-0">
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

              {/* Sidebar Menu */}
              <HeroCoccocSidebarMenu teamId={team.id} />
            </div>

            {/* Footer Sidebar */}
            <div className="border-t border-white/5 pt-3 text-center text-[10px] text-gray-500 font-bold select-none">
              Hero Cốc Cốc v1.0
            </div>
          </aside>

          {/* Nội dung */}
          <main className="flex-1 w-full overflow-y-auto bg-gray-950">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
