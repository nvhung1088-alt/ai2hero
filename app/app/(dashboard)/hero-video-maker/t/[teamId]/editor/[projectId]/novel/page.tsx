import { getVideoProjectById, getVideoNovels, getAvailableModels } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import NovelClient from './novel-client';

export default async function NovelPage(props: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);

  const project = await getVideoProjectById(tid, pid);
  if (!project) {
    redirect(`/hero-video-maker/t/${tid}/dashboard`);
  }

  const novels = await getVideoNovels(tid, pid);
  const models = await getAvailableModels(tid);

  return (
    <NovelClient 
      project={project} 
      initialNovels={novels} 
      models={models} 
      teamId={tid} 
      projectId={pid} 
    />
  );
}
