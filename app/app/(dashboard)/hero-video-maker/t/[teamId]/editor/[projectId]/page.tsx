import { redirect } from 'next/navigation';
import { getVideoProjectById } from '@/lib/db/video-maker-actions';

export default async function EditorPage(props: { params: Promise<{ teamId: string, projectId: string }> }) {
  const { teamId, projectId } = await props.params;
  const tid = parseInt(teamId, 10);
  const pid = parseInt(projectId, 10);
  
  try {
    const project = await getVideoProjectById(tid, pid);
    if (!project) {
      redirect(`/hero-video-maker/t/${tid}/projects`);
    }
    redirect(`/hero-video-maker/t/${tid}/editor/${projectId}/${project.projectType || 'novel'}`);
  } catch (err) {
    redirect(`/hero-video-maker/t/${tid}/projects`);
  }
}
