import DownloaderDashboardClient from './downloader-dashboard-client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getDownloaderProjectsAction, getDownloaderVideosAction, getDownloaderCookiesAction } from '@/lib/db/hero-downloader-actions';
import { getConnectionsByTeam } from '@/lib/db/connect-hub-queries';

export const revalidate = 0;

export default async function DownloaderDashboardPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  const [projectsRes, cookiesRes, rawConnections] = await Promise.all([
    getDownloaderProjectsAction(teamId),
    getDownloaderCookiesAction(teamId),
    getConnectionsByTeam(teamId)
  ]);
  const initialProjects = projectsRes.success ? projectsRes.projects : [];
  const initialCookies = cookiesRes.success ? cookiesRes.cookies : [];
  const aiConnections = (rawConnections || []).filter((c: any) => c.status === 'connected');
  
  let initialVideos: any[] = [];
  if (initialProjects && initialProjects.length > 0) {
    const videosRes = await getDownloaderVideosAction(teamId, initialProjects[0].id);
    initialVideos = videosRes.success ? videosRes.videos : [];
  }

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>}>
      <DownloaderDashboardClient 
        teamId={teamId} 
        initialProjects={initialProjects || []} 
        initialVideos={initialVideos || []} 
        initialCookies={initialCookies || []}
        aiConnections={aiConnections || []}
      />
    </Suspense>
  );
}
