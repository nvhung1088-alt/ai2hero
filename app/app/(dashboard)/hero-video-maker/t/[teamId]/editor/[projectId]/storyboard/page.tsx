import { getVideoProjectById, getVideoStoryboards, getVideoScripts, getAvailableModels } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import StoryboardClient from './storyboard-client';

export default async function StoryboardPage(props: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);

  const project = await getVideoProjectById(tid, pid);
  if (!project) {
    redirect(`/hero-video-maker/t/${tid}/dashboard`);
  }

  const storyboards = await getVideoStoryboards(tid, pid);
  const scripts = await getVideoScripts(tid, pid);
  const models = await getAvailableModels(tid);

  return (
    <StoryboardClient 
      project={project} 
      initialStoryboards={storyboards} 
      scripts={scripts} 
      models={models} 
      teamId={tid} 
      projectId={pid} 
    />
  );
}
