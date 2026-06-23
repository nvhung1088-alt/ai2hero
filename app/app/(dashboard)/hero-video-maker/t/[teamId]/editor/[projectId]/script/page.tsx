import { getVideoProjectById, getVideoScripts, getVideoNovels, getAvailableModels } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import ScriptClient from './script-client';

export default async function ScriptPage(props: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);

  const project = await getVideoProjectById(tid, pid);
  if (!project) {
    redirect(`/hero-video-maker/t/${tid}/dashboard`);
  }

  const scripts = await getVideoScripts(tid, pid);
  const novels = await getVideoNovels(tid, pid);
  const models = await getAvailableModels(tid);

  return (
    <ScriptClient 
      project={project} 
      initialScripts={scripts} 
      novels={novels} 
      models={models} 
      teamId={tid} 
      projectId={pid} 
    />
  );
}
