import { getVideoProjectById, getVideoStoryboards, getVideoClips, getAvailableModels, getVideoTracks } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import VideoClient from './video-client';

export default async function VideoPage(props: {
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
  const clips = await getVideoClips(tid, pid);
  const models = await getAvailableModels(tid);
  const tracks = await getVideoTracks(tid, pid);

  return (
    <VideoClient 
      project={project} 
      storyboards={storyboards} 
      initialClips={clips} 
      models={models} 
      tracks={tracks}
      teamId={tid} 
      projectId={pid} 
    />
  );
}
