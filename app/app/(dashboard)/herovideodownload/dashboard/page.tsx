import { redirect } from 'next/navigation';
import { getActiveTeamCookie } from '@/lib/team-cookie';
import { getTeamWithMembers } from '@/lib/db/queries';
import { VideoListClient } from './video-list-client';
import { ExtensionStatusBadge } from './extension-status';
import { FileVideo } from 'lucide-react';

export default async function HeroVideoDashboard() {
  const teamId = await getActiveTeamCookie();
  if (!teamId) {
    redirect('/dashboard');
  }

  const teamData = await getTeamWithMembers(teamId);
  if (!teamData) {
    redirect('/dashboard');
  }

  // Tiêu chuẩn hóa Tên Workspace: Xoá dấu, thay khoảng trắng bằng gạch ngang
  const slugify = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };
  const workspaceSlug = slugify(teamData.name || `team-${teamId}`);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-3">
          <FileVideo className="w-8 h-8 text-pink-500" />
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            Kho Media: {teamData.name}
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <ExtensionStatusBadge teamId={teamId} workspaceSlug={workspaceSlug} />
        </div>
      </div>

      <div className="mt-6">
        <VideoListClient workspaceSlug={workspaceSlug} />
      </div>
    </div>
  );
}
