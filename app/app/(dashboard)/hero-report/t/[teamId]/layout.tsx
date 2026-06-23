import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateWorkspaceModal } from '../../../dashboard/create-workspace-modal';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { CookieSync } from '@/components/cookie-sync';
import { isPreviewMode } from '@/lib/preview-actions';
import { PreviewBanner } from '@/app/(dashboard)/preview-banner';

export const revalidate = 0;

export default async function HeroReportDynamicLayout({
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

  const isPreview = await isPreviewMode('hero-report', teamId);
  if (!activatedApps.includes('hero-report') && !isPreview) {
    redirect('/dashboard');
  }

  return (
    <>
      {isPreview && <PreviewBanner appId="hero-report" />}
    <div className="flex flex-col min-h-screen bg-gray-950 text-white w-full">
      <CookieSync teamId={teamId} />
      <CreateWorkspaceModal hideTrigger={true} />

      <div className="flex flex-col flex-1 min-h-0 w-full">
        {/* Sub Header / Navigation Breadcrumb */}
        <div className="bg-gray-900/40 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/t/${team.id}`}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">Hero Báo Cáo</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Beta</span>
              </div>
              <p className="text-xs text-gray-400">Báo cáo tự động bằng Code & AI gửi qua Telegram</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-500">Workspace:</span>
            <span className="font-extrabold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{team.name}</span>
          </div>
        </div>

        {/* Content Body */}
        <main className="flex-1 w-full overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  
    </>
  );
}
