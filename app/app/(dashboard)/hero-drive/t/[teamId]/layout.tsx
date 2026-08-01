import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HardDrive, LayoutDashboard, Settings, ArrowLeft } from 'lucide-react';
import TopHeader from '@/components/top-header';

export default async function HeroDriveLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr);

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const team = await getTeamForUser();
  if (!team || team.id !== teamId) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#0d0e12] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30">
      <TopHeader />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 relative">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-60 shrink-0 bg-gray-900/30 border-r border-white/5 p-4 flex flex-col justify-between lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            {/* Header Workspace Info */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                Không gian hiện tại
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/10 shrink-0">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-white truncate leading-snug">
                    {team.name}
                  </p>
                  <p className="text-[9px] text-gray-400 capitalize">
                    {team.planName || 'Free'} Plan
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/t/${team.id}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 rounded-lg text-[10px] font-black text-gray-300 hover:text-white transition-all text-center cursor-pointer select-none"
              >
                <ArrowLeft className="h-3 w-3" /> Quay về Workspace
              </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              <Link
                href={`/hero-drive/t/${team.id}/dashboard`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 font-medium transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-sm">Dự án Quét Upload</span>
              </Link>
              <Link
                href={`/hero-drive/t/${team.id}/settings`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 font-medium transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">Cài đặt & Tài khoản Drive</span>
              </Link>
            </nav>
          </div>

          <div className="pt-4 border-t border-white/5">
            <span className="text-[10px] text-gray-500 font-mono">HeroDrive v1.0 • AI2Hero</span>
          </div>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
