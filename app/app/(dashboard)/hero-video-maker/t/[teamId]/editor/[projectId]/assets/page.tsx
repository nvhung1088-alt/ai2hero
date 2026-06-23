import { getVideoProjectById, getVideoAssets, getVideoImages, getAvailableModels } from '@/lib/db/video-maker-actions';
import { redirect } from 'next/navigation';
import AssetsClient from './assets-client';

export default async function AssetsPage(props: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);

  const project = await getVideoProjectById(tid, pid);
  if (!project) {
    redirect(`/hero-video-maker/t/${tid}/dashboard`);
  }

  const assets = await getVideoAssets(tid, pid);
  const images = await getVideoImages(tid, pid);
  const models = await getAvailableModels(tid);

  return (
    <AssetsClient 
      project={project} 
      initialAssets={assets} 
      initialImages={images}
      models={models} 
      teamId={tid} 
      projectId={pid} 
    />
  );
}
